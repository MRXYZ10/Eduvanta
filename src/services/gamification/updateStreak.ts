/**
 * Pure streak logic — given the last active date and today's date, decides
 * how the streak changes. Kept separate from the Prisma read/write (see
 * updateStreak.ts) so the day-boundary math is testable without a database
 * or without mocking Date globally.
 */

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
}

export interface StreakUpdateResult {
  nextState: StreakState;
  extended: boolean; // true only when currentStreak just increased — the notification trigger
  isNewRecord: boolean;
}

function toDayKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD, UTC — good enough for a daily streak, not timezone-perfect
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

export function updateStreak(current: StreakState, activityDate: Date = new Date()): StreakUpdateResult {
  const today = toDayKey(activityDate);
  const lastActive = current.lastActiveDate ? toDayKey(current.lastActiveDate) : null;

  // Already recorded activity today — no change, not a new "extension" to notify about.
  if (lastActive === today) {
    return { nextState: current, extended: false, isNewRecord: false };
  }

  const gap = lastActive ? daysBetween(lastActive, today) : null;
  const continuesStreak = gap === 1;

  const currentStreak = continuesStreak ? current.currentStreak + 1 : 1; // gap of 0 already handled above; any gap > 1 (or first-ever activity) restarts at 1
  const longestStreak = Math.max(current.longestStreak, currentStreak);
  const isNewRecord = currentStreak > current.longestStreak && current.longestStreak > 0;

  return {
    nextState: { currentStreak, longestStreak, lastActiveDate: activityDate },
    extended: true,
    isNewRecord,
  };
}
