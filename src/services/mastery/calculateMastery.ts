import type { MasteryBand } from "@prisma/client";

/**
 * Mastery scoring — see docs/MASTERY_ALGORITHM.md for the full rationale.
 *
 * Deliberately NOT correct/total. Combines:
 *  - accuracy: weighted correctness
 *  - recency: recent attempts count more (exponential decay)
 *  - difficulty: correct-on-hard counts more than correct-on-easy
 *  - consistency: penalizes erratic performance (high variance)
 *  - repeatedMistakes: same misconception recurring drags the score down
 *    even if overall accuracy looks fine
 *  - confidence: optional self-reported confidence nudges the score,
 *    capped so it can't dominate objective performance
 */

export interface MasteryInput {
  attempts: Array<{
    isCorrect: boolean;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    timestamp: Date;
    timeTakenMs: number;
    expectedTimeMs: number;
    confidence?: number | null; // 1-5
  }>;
  repeatedMistakeCount: number; // distinct mistakes with occurrences > 1 in this scope
}

const DIFFICULTY_WEIGHT: Record<MasteryInput["attempts"][number]["difficulty"], number> = {
  EASY: 0.8,
  MEDIUM: 1.0,
  HARD: 1.3,
};

const HALF_LIFE_DAYS = 14; // recency decay: an attempt 14 days old counts half as much

function recencyWeight(timestamp: Date, now: Date): number {
  const ageDays = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

export function calculateMastery(input: MasteryInput, now: Date = new Date()): { score: number; band: MasteryBand } {
  const { attempts, repeatedMistakeCount } = input;
  if (attempts.length === 0) return { score: 0, band: "NEEDS_ATTENTION" };

  let weightedCorrect = 0;
  let totalWeight = 0;
  const perAttemptScore: number[] = [];

  for (const a of attempts) {
    const rWeight = recencyWeight(a.timestamp, now);
    const dWeight = DIFFICULTY_WEIGHT[a.difficulty];
    // Time factor: answering well within expected time is neutral; answering
    // very slowly caps the credit slightly (guessing-fast is not penalized
    // beyond difficulty already capturing question hardness).
    const timeFactor = a.timeTakenMs > a.expectedTimeMs * 2.5 ? 0.85 : 1.0;

    const weight = rWeight * dWeight;
    const value = a.isCorrect ? timeFactor : 0;

    weightedCorrect += weight * value;
    totalWeight += weight;
    perAttemptScore.push(value);
  }

  const baseAccuracy = totalWeight > 0 ? weightedCorrect / totalWeight : 0;

  // Consistency: standard deviation of per-attempt scores. High variance
  // (sometimes nails it, sometimes totally misses) reduces confidence in
  // the mastery estimate, so we shave points off.
  const mean = perAttemptScore.reduce((a, b) => a + b, 0) / perAttemptScore.length;
  const variance = perAttemptScore.reduce((s, v) => s + (v - mean) ** 2, 0) / perAttemptScore.length;
  const consistencyPenalty = Math.min(variance * 15, 15); // cap at 15 points

  // Repeated mistakes: each distinct recurring misconception drags mastery
  // down even if raw accuracy is decent — mastery means the concept is
  // actually fixed, not that the student got lucky elsewhere.
  const mistakePenalty = Math.min(repeatedMistakeCount * 6, 25); // cap at 25 points

  // Optional confidence nudge — capped small so self-report can't inflate
  // an objectively weak score.
  const confidences = attempts.map((a) => a.confidence).filter((c): c is number => c != null);
  const avgConfidence = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : null;
  const confidenceNudge = avgConfidence != null ? (avgConfidence - 3) * 1.5 : 0; // +/- up to 3 points

  let score = baseAccuracy * 100 - consistencyPenalty - mistakePenalty + confidenceNudge;
  score = Math.max(0, Math.min(100, score));

  const band: MasteryBand =
    score >= 85 ? "MASTERED" : score >= 65 ? "STRONG" : score >= 40 ? "DEVELOPING" : "NEEDS_ATTENTION";

  return { score: Math.round(score * 10) / 10, band };
}
