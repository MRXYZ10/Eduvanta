import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { rebalanceMissedWork, type TopicInput } from "@/services/planner/generateStudyPlan";

const MAX_EXTRA_MINUTES_PER_DAY_RATIO = 0.2; // cap make-up work at +20% of normal daily budget

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await prisma.studyPlan.findFirst({
    where: { userId: user.id, active: true },
    include: { sessions: true },
  });
  if (!plan) return NextResponse.json({ error: "No active study plan" }, { status: 404 });

  const now = new Date();

  // Auto-mark overdue pending sessions as missed before rebalancing.
  const overdue = plan.sessions.filter((s) => s.status === "pending" && s.scheduledFor < now);
  if (overdue.length > 0) {
    await prisma.studySession.updateMany({
      where: { id: { in: overdue.map((s) => s.id) } },
      data: { status: "missed" },
    });
  }

  const missed = plan.sessions.filter((s) => s.status === "missed" || overdue.some((o) => o.id === s.id));
  if (missed.length === 0) {
    return NextResponse.json({ message: "Nothing to rebalance — no missed sessions.", createdSessions: [] });
  }

  // Group missed minutes by a synthetic "topic" derived from the stored
  // label (sessions denormalize topic name into topicLabel — see schema
  // comment). Real topic IDs aren't stored on StudySession by design (it's
  // a lightweight schedule row), so we key rebalancing on label text.
  const missedMinutesByTopic: Record<string, number> = {};
  const topicInputs: TopicInput[] = [];
  const seenLabels = new Set<string>();
  for (const s of missed) {
    const key = s.topicLabel;
    missedMinutesByTopic[key] = (missedMinutesByTopic[key] ?? 0) + s.durationMin;
    if (!seenLabels.has(key)) {
      seenLabels.add(key);
      topicInputs.push({ id: key, name: key, masteryScore: null, unresolvedMistakes: 0 });
    }
  }

  const remainingDays = plan.targetDate
    ? Math.max(1, Math.round((plan.targetDate.getTime() - now.getTime()) / 86_400_000))
    : 7;

  const dailyBudget = missed.reduce((sum, s) => sum + s.durationMin, 0) / Math.max(1, missed.length);

  const makeUpSessions = rebalanceMissedWork({
    missedTopics: topicInputs,
    missedMinutesByTopic,
    remainingDays,
    dailyStudyMinutes: dailyBudget,
    maxExtraMinutesPerDay: Math.max(10, Math.round(dailyBudget * MAX_EXTRA_MINUTES_PER_DAY_RATIO)),
  });

  // Mark the original missed sessions resolved-into-rebalance so they don't
  // get double-counted on a future rebalance call.
  await prisma.studySession.updateMany({
    where: { id: { in: missed.map((s) => s.id) } },
    data: { status: "rescheduled" },
  });

  const created = await prisma.$transaction(
    makeUpSessions.map((s) =>
      prisma.studySession.create({
        data: {
          studyPlanId: plan.id,
          userId: user.id,
          scheduledFor: new Date(now.getTime() + s.dayOffset * 86_400_000),
          durationMin: s.durationMin,
          topicLabel: `Catch-up: ${s.topicName}`,
        },
      }),
    ),
  );

  const droppedMinutes =
    Object.values(missedMinutesByTopic).reduce((a, b) => a + b, 0) -
    created.reduce((a, c) => a + c.durationMin, 0);

  return NextResponse.json({
    message:
      droppedMinutes > 0
        ? `Rebalanced ${missed.length} missed session(s). ${Math.round(droppedMinutes)} minutes of lower-priority work were dropped to keep the plan realistic.`
        : `Rebalanced ${missed.length} missed session(s) across the remaining ${remainingDays} days.`,
    createdSessions: created,
  });
}
