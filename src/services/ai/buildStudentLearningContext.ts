import { prisma } from "@/db/client";

/**
 * The single place that decides what student data Nova is allowed to see.
 *
 * Deliberately narrow: current topic, mastery snapshot, recent mistakes,
 * active study plan, exam goal/date. It never pulls email, auth data,
 * full attempt history, or other students' data. Every AI-facing feature
 * (tutor, practice feedback, study planner) must go through this rather
 * than querying Prisma directly for "context."
 */
export interface StudentLearningContext {
  examGoal: string | null;
  targetExamDate: string | null;
  dailyStudyMinutes: number | null;
  currentTopic: { id: string; name: string } | null;
  masterySnapshot: Array<{ scope: string; band: string; score: number; trend: number }>;
  recentMistakes: Array<{ concept: string | null; mistakeType: string; occurrences: number }>;
  activeStudyPlan: { examGoal: string | null; nextSessions: string[] } | null;
}

export async function buildStudentLearningContext(
  userId: string,
  opts: { currentTopicId?: string } = {},
): Promise<StudentLearningContext> {
  const [profile, masteries, mistakes, plan, currentTopic] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.mastery.findMany({
      where: { userId },
      include: { topic: true, subtopic: true, concept: true },
      orderBy: { lastUpdated: "desc" },
      take: 10,
    }),
    prisma.mistake.findMany({
      where: { userId, resolved: false },
      include: { concept: true },
      orderBy: { occurrences: "desc" },
      take: 5,
    }),
    prisma.studyPlan.findFirst({
      where: { userId, active: true },
      include: { sessions: { where: { status: "pending" }, orderBy: { scheduledFor: "asc" }, take: 3 } },
    }),
    opts.currentTopicId
      ? prisma.topic.findUnique({ where: { id: opts.currentTopicId } })
      : Promise.resolve(null),
  ]);

  return {
    examGoal: profile?.examGoal ?? null,
    targetExamDate: profile?.targetExamDate?.toISOString() ?? null,
    dailyStudyMinutes: profile?.dailyStudyMinutes ?? null,
    currentTopic: currentTopic ? { id: currentTopic.id, name: currentTopic.name } : null,
    masterySnapshot: masteries.map((m) => ({
      scope: m.concept?.name ?? m.subtopic?.name ?? m.topic?.name ?? "unknown",
      band: m.band,
      score: m.score,
      trend: m.trend,
    })),
    recentMistakes: mistakes.map((m) => ({
      concept: m.concept?.name ?? null,
      mistakeType: m.mistakeType,
      occurrences: m.occurrences,
    })),
    activeStudyPlan: plan
      ? {
          examGoal: plan.examGoal,
          nextSessions: plan.sessions.map((s) => `${s.topicLabel} (${s.durationMin}min)`),
        }
      : null,
  };
}

/** Renders the context into the compact system-prompt block Nova receives. */
export function formatContextForPrompt(ctx: StudentLearningContext): string {
  const lines: string[] = [];
  if (ctx.examGoal) lines.push(`Exam goal: ${ctx.examGoal}${ctx.targetExamDate ? ` (target: ${ctx.targetExamDate.slice(0, 10)})` : ""}`);
  if (ctx.currentTopic) lines.push(`Currently studying: ${ctx.currentTopic.name}`);
  if (ctx.masterySnapshot.length) {
    lines.push("Mastery snapshot:");
    for (const m of ctx.masterySnapshot.slice(0, 6)) {
      lines.push(`  - ${m.scope}: ${m.band} (${Math.round(m.score)}%, trend ${m.trend >= 0 ? "+" : ""}${m.trend.toFixed(1)})`);
    }
  }
  if (ctx.recentMistakes.length) {
    lines.push("Recurring mistakes:");
    for (const m of ctx.recentMistakes) {
      lines.push(`  - ${m.concept ?? "general"}: ${m.mistakeType} mistake x${m.occurrences}`);
    }
  }
  if (ctx.activeStudyPlan?.nextSessions.length) {
    lines.push(`Upcoming plan: ${ctx.activeStudyPlan.nextSessions.join(", ")}`);
  }
  return lines.join("\n");
}
