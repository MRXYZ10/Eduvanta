/**
 * Exam Readiness — explicitly an internal learning indicator, not a
 * certified predictor of exam performance (see product spec: "Don't
 * pretend this score is scientifically exact. Clearly label it as an
 * internal learning indicator."). This file computes the number and the
 * per-topic Strong/Developing/Weak buckets the spec's dashboard mock
 * shows; the UI is responsible for the disclaimer label.
 */

import type { MasteryBand } from "@prisma/client";

export interface TopicReadinessInput {
  topicName: string;
  masteryScore: number;
  band: MasteryBand;
}

export interface ExamReadinessResult {
  score: number; // 0-100
  strongTopics: string[];
  developingTopics: string[];
  weakTopics: string[];
}

const MISTAKE_PENALTY_CAP = 20; // unresolved mistakes drag the score down, but never past this much

/**
 * Reuses the same MASTERED/STRONG/DEVELOPING/NEEDS_ATTENTION bands the
 * mastery engine already computes, rather than inventing a second
 * taxonomy — MASTERED and STRONG both read as "Strong" for exam-readiness
 * purposes since the distinction between them doesn't change what a
 * student should do about it.
 */
function bandToReadinessBucket(band: MasteryBand): "strong" | "developing" | "weak" {
  if (band === "MASTERED" || band === "STRONG") return "strong";
  if (band === "DEVELOPING") return "developing";
  return "weak";
}

export function calculateExamReadiness(
  topics: TopicReadinessInput[],
  unresolvedMistakeCount: number,
): ExamReadinessResult {
  if (topics.length === 0) {
    return { score: 0, strongTopics: [], developingTopics: [], weakTopics: [] };
  }

  const averageMastery = topics.reduce((sum, t) => sum + t.masteryScore, 0) / topics.length;
  const mistakePenalty = Math.min(unresolvedMistakeCount * 1.5, MISTAKE_PENALTY_CAP);
  const score = Math.max(0, Math.min(100, Math.round(averageMastery - mistakePenalty)));

  const strongTopics: string[] = [];
  const developingTopics: string[] = [];
  const weakTopics: string[] = [];

  for (const t of topics) {
    const bucket = bandToReadinessBucket(t.band);
    if (bucket === "strong") strongTopics.push(t.topicName);
    else if (bucket === "developing") developingTopics.push(t.topicName);
    else weakTopics.push(t.topicName);
  }

  return { score, strongTopics, developingTopics, weakTopics };
}
