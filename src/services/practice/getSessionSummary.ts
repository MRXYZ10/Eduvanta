import { prisma } from "@/db/client";
import { summarizeSession } from "./summarizeSession";

export interface FocusSessionResult {
  questionCount: number;
  correctCount: number;
  accuracy: number;
  totalTimeMs: number;
  conceptImprovement: { topicName: string; score: number; trend: number } | null;
  nextRecommendation: { title: string; actionLabel: string; actionHref: string } | null;
}

export async function getSessionSummary(attemptId: string, userId: string): Promise<FocusSessionResult | null> {
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId },
    include: { answers: true },
  });
  if (!attempt) return null;

  const { questionCount, correctCount, accuracy, totalTimeMs } = summarizeSession(
    attempt.answers.map((a) => ({ isCorrect: a.isCorrect, timeTakenMs: a.timeTakenMs })),
  );

  // "Concept improvement" per spec's focus-mode summary — the topic's
  // current Mastery row already reflects every answer from this session,
  // since /api/practice/submit recomputes it after each one; no separate
  // before/after snapshot needed.
  let conceptImprovement: FocusSessionResult["conceptImprovement"] = null;
  if (attempt.topicId) {
    const mastery = await prisma.mastery.findFirst({
      where: { userId, topicId: attempt.topicId },
      include: { topic: true },
    });
    if (mastery?.topic) {
      conceptImprovement = { topicName: mastery.topic.name, score: mastery.score, trend: mastery.trend };
    }
  }

  const recommendation = await prisma.recommendation.findFirst({
    where: { userId, dismissed: false },
    orderBy: { priority: "desc" },
  });

  return {
    questionCount,
    correctCount,
    accuracy,
    totalTimeMs,
    conceptImprovement,
    nextRecommendation: recommendation
      ? { title: recommendation.title, actionLabel: recommendation.actionLabel, actionHref: recommendation.actionHref }
      : null,
  };
}
