import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { generateStudyPlan, type TopicInput } from "@/services/planner/generateStudyPlan";
import { buildPlanRationale, templateFallbackRationale } from "@/services/planner/buildPlanRationale";
import { enforceRateLimit } from "@/services/security/enforceRateLimit";

const RequestSchema = z.object({
  examGoal: z.enum(["College", "JEE", "NEET", "School", "Competitive Exam", "Self Learning", "Other"]),
  subjectIds: z.array(z.string()).min(1),
  currentLevel: z.enum(["beginner", "intermediate", "advanced"]),
  targetExamDate: z.string().optional(), // ISO date; optional for "Self Learning"
  dailyStudyMinutes: z.number().int().min(10).max(600),
  learningGoal: z.string().max(500).optional(),
  preferredDifficulty: z.enum(["easy", "medium", "hard", "adaptive"]),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = enforceRateLimit(user.id, "aiLightweight");
  if (limited) return limited;

  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  const { examGoal, subjectIds, currentLevel, targetExamDate, dailyStudyMinutes, learningGoal, preferredDifficulty } =
    parsed.data;

  const subjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    include: { topics: true },
  });
  if (subjects.length === 0) {
    return NextResponse.json({ error: "None of the given subjects were found" }, { status: 404 });
  }

  // Auto-enrollment: a student choosing subjects during onboarding is
  // choosing to take the course(s) those subjects belong to. Dedup via
  // the (userId, courseId) unique constraint rather than checking first —
  // skipDuplicates makes this safe to call even if onboarding is re-run.
  const courseIds = [...new Set(subjects.map((s) => s.courseId))];
  if (courseIds.length > 0) {
    await prisma.enrollment.createMany({
      data: courseIds.map((courseId) => ({ userId: user.id, courseId })),
      skipDuplicates: true,
    });
  }

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      examGoal,
      currentLevel,
      targetExamDate: targetExamDate ? new Date(targetExamDate) : null,
      dailyStudyMinutes,
      learningGoal,
      preferredDifficulty,
      onboardedAt: new Date(),
    },
    update: {
      examGoal,
      currentLevel,
      targetExamDate: targetExamDate ? new Date(targetExamDate) : null,
      dailyStudyMinutes,
      learningGoal,
      preferredDifficulty,
      onboardedAt: new Date(),
    },
  });

  // A brand-new student has no mastery/mistake history yet — every topic
  // starts as "unattempted" (masteryScore: null), which generateStudyPlan
  // already treats as needing attention rather than being neglected.
  const topics: TopicInput[] = subjects.flatMap((s) =>
    s.topics.map((t) => ({ id: t.id, name: t.name, masteryScore: null, unresolvedMistakes: 0 })),
  );

  let planSummary: { sessionCount: number; rationale: string } | null = null;

  if (topics.length > 0) {
    const startDate = new Date();
    // Self-learners with no fixed exam get a rolling 30-day starter plan
    // rather than being unable to generate one at all.
    const targetDate = targetExamDate
      ? new Date(targetExamDate)
      : new Date(startDate.getTime() + 30 * 86_400_000);

    if (targetDate > startDate) {
      const plannedSessions = generateStudyPlan({ topics, dailyStudyMinutes, startDate, targetDate });

      if (plannedSessions.length > 0) {
        await prisma.studyPlan.updateMany({ where: { userId: user.id, active: true }, data: { active: false } });

        await prisma.studyPlan.create({
          data: {
            userId: user.id,
            examGoal,
            targetDate,
            sessions: {
              create: plannedSessions.map((s) => ({
                userId: user.id,
                scheduledFor: new Date(startDate.getTime() + s.dayOffset * 86_400_000),
                durationMin: s.durationMin,
                topicLabel: `${s.kind === "learn" ? "Learn" : s.kind === "revision" ? "Revise" : "Practice"}: ${s.topicName}`,
              })),
            },
          },
        });

        let rationale: string;
        try {
          rationale = await buildPlanRationale(topics, plannedSessions);
        } catch {
          rationale = templateFallbackRationale(topics, plannedSessions);
        }
        planSummary = { sessionCount: plannedSessions.length, rationale };
      }
    }
  }

  return NextResponse.json({ onboarded: true, planSummary });
}
