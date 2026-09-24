import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { generateStudyPlan, type TopicInput } from "@/services/planner/generateStudyPlan";
import { buildPlanRationale, templateFallbackRationale } from "@/services/planner/buildPlanRationale";
import { enforceRateLimit } from "@/services/security/enforceRateLimit";

const RequestSchema = z.object({
  topicIds: z.array(z.string()).min(1),
  targetDate: z.string(), // ISO date
  dailyStudyMinutes: z.number().int().min(10).max(600),
  examGoal: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = enforceRateLimit(user.id, "aiLightweight");
  if (limited) return limited;

  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  const { topicIds, targetDate, dailyStudyMinutes, examGoal } = parsed.data;

  // Authorization: only include topics that actually exist; no ownership
  // check needed since Topic isn't user-scoped, but we still validate IDs
  // are real rather than trusting the client's list blindly.
  const [topics, masteries, mistakeCounts] = await Promise.all([
    prisma.topic.findMany({ where: { id: { in: topicIds } } }),
    prisma.mastery.findMany({ where: { userId: user.id, topicId: { in: topicIds } } }),
    prisma.mistake.findMany({
      where: { userId: user.id, resolved: false, conceptId: { not: null } },
      select: { conceptId: true, concept: { select: { topicId: true } } },
    }),
  ]);

  if (topics.length === 0) {
    return NextResponse.json({ error: "None of the given topics were found" }, { status: 404 });
  }

  const masteryByTopic = new Map(masteries.map((m) => [m.topicId, m]));
  const mistakesByTopic = new Map<string, number>();
  for (const mistake of mistakeCounts) {
    const topicId = mistake.concept?.topicId;
    if (topicId) mistakesByTopic.set(topicId, (mistakesByTopic.get(topicId) ?? 0) + 1);
  }

  const topicInputs: TopicInput[] = topics.map((t) => ({
    id: t.id,
    name: t.name,
    masteryScore: masteryByTopic.get(t.id)?.score ?? null,
    unresolvedMistakes: mistakesByTopic.get(t.id) ?? 0,
  }));

  const startDate = new Date();
  const target = new Date(targetDate);
  if (target <= startDate) {
    return NextResponse.json({ error: "targetDate must be in the future" }, { status: 400 });
  }

  const plannedSessions = generateStudyPlan({
    topics: topicInputs,
    dailyStudyMinutes,
    startDate,
    targetDate: target,
  });

  if (plannedSessions.length === 0) {
    return NextResponse.json({ error: "Couldn't generate a plan from the given inputs" }, { status: 422 });
  }

  // Deactivate any existing active plan before creating the new one.
  await prisma.studyPlan.updateMany({ where: { userId: user.id, active: true }, data: { active: false } });

  const plan = await prisma.studyPlan.create({
    data: {
      userId: user.id,
      examGoal,
      targetDate: target,
      sessions: {
        create: plannedSessions.map((s) => ({
          userId: user.id,
          scheduledFor: new Date(startDate.getTime() + s.dayOffset * 86_400_000),
          durationMin: s.durationMin,
          topicLabel: `${s.kind === "learn" ? "Learn" : s.kind === "revision" ? "Revise" : "Practice"}: ${s.topicName}`,
        })),
      },
    },
    include: { sessions: { orderBy: { scheduledFor: "asc" } } },
  });

  let rationale: string;
  try {
    rationale = await buildPlanRationale(topicInputs, plannedSessions);
  } catch {
    rationale = templateFallbackRationale(topicInputs, plannedSessions);
  }

  return NextResponse.json({ plan, rationale });
}
