import type { MasteryBand } from "@prisma/client";

/**
 * Each check is a pure function over plain values — no Prisma, no I/O —
 * so the "does this count as an achievement" logic is testable in
 * isolation from where it gets called (practice/submit, exam/submit).
 * Per the product spec's explicit "avoid childish coin systems... reward
 * actual learning activity" instruction, every achievement here ties to a
 * real signal already computed elsewhere (streak records, mastery bands,
 * exam personal bests) rather than an arbitrary points system.
 */

export interface AchievementAward {
  type: "streak_record" | "mastery_milestone" | "exam_personal_best";
  label: string;
}

export function checkStreakRecordAchievement(isNewRecord: boolean, currentStreak: number): AchievementAward | null {
  if (!isNewRecord) return null;
  return { type: "streak_record", label: `New personal best: ${currentStreak}-day streak` };
}

/**
 * Only fires the moment a topic/concept *first* reaches MASTERED — not
 * every time mastery is recomputed while already at that band, and not
 * for reaching STRONG or DEVELOPING (those are progress, not a milestone
 * worth a badge for).
 */
export function checkMasteryMilestoneAchievement(
  previousBand: MasteryBand | null,
  newBand: MasteryBand,
  scopeName: string,
): AchievementAward | null {
  if (newBand !== "MASTERED" || previousBand === "MASTERED") return null;
  return { type: "mastery_milestone", label: `Mastered ${scopeName}` };
}

/**
 * Deliberately requires an actual previous score to beat — a student's
 * very first exam attempt trivially "beats" a non-existent prior score,
 * which would make every first exam an empty-feeling achievement rather
 * than a real personal best.
 */
export function checkExamPersonalBestAchievement(
  newScore: number,
  previousBestScore: number | null,
  examTitle: string,
): AchievementAward | null {
  if (previousBestScore === null || newScore <= previousBestScore) return null;
  return { type: "exam_personal_best", label: `New personal best on ${examTitle}: ${newScore}%` };
}
