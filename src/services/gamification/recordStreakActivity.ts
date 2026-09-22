import { prisma } from "@/db/client";
import { updateStreak } from "./updateStreak";

export interface StreakUpdateOutcome {
  currentStreak: number;
  extended: boolean;
  isNewRecord: boolean;
}

/**
 * Call this once per "counts as activity today" event — currently wired
 * into /api/practice/submit and /api/exam/submit (see those routes). Idempotent
 * within a day: calling it twice in the same day is a no-op the second time,
 * so it's safe to call after every answer rather than needing to track
 * "have I already updated the streak today" separately.
 */
export async function recordStreakActivity(userId: string, now: Date = new Date()): Promise<StreakUpdateOutcome> {
  const existing = await prisma.streak.findUnique({ where: { userId } });

  const current = {
    currentStreak: existing?.currentStreak ?? 0,
    longestStreak: existing?.longestStreak ?? 0,
    lastActiveDate: existing?.lastActiveDate ?? null,
  };

  const { nextState, extended, isNewRecord } = updateStreak(current, now);

  if (extended) {
    await prisma.streak.upsert({
      where: { userId },
      create: { userId, ...nextState },
      update: nextState,
    });
  }

  return { currentStreak: nextState.currentStreak, extended, isNewRecord };
}
