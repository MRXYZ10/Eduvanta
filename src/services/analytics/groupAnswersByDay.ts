/**
 * Real historical trends, not fabricated ones: the Mastery table only
 * stores a *current* score+trend (see DATABASE.md), so there's no stored
 * history to chart mastery-over-time from. What IS real history is every
 * individual Answer's `createdAt` + `isCorrect` + `timeTakenMs` — this
 * groups those into daily buckets so accuracy and study-time trends on
 * the analytics page are genuine, even though a mastery-over-time chart
 * isn't possible without adding historical snapshots (a real, separate
 * schema change, not something to fake here).
 */

export interface AnswerRecord {
  createdAt: Date;
  isCorrect: boolean;
  timeTakenMs: number;
}

export interface DailyBucket {
  date: string; // YYYY-MM-DD
  questionCount: number;
  correctCount: number;
  accuracy: number; // 0-100, null-safe: 0 when questionCount is 0
  studyMinutes: number;
}

function toDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Always returns exactly `days` buckets in order, even for days with zero activity — a chart needs continuous dates, not just the ones with data. */
export function groupAnswersByDay(answers: AnswerRecord[], days: number, now: Date = new Date()): DailyBucket[] {
  const buckets = new Map<string, { questionCount: number; correctCount: number; totalTimeMs: number }>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.set(toDayKey(d), { questionCount: 0, correctCount: 0, totalTimeMs: 0 });
  }

  for (const a of answers) {
    const key = toDayKey(a.createdAt);
    const bucket = buckets.get(key);
    if (!bucket) continue; // outside the requested window
    bucket.questionCount++;
    if (a.isCorrect) bucket.correctCount++;
    bucket.totalTimeMs += a.timeTakenMs;
  }

  return Array.from(buckets.entries()).map(([date, b]) => ({
    date,
    questionCount: b.questionCount,
    correctCount: b.correctCount,
    accuracy: b.questionCount ? Math.round((b.correctCount / b.questionCount) * 100) : 0,
    studyMinutes: Math.round(b.totalTimeMs / 60_000),
  }));
}
