import { prisma } from "@/db/client";
import { groupAnswersByDay } from "./groupAnswersByDay";

const TREND_DAYS = 14;
const MASTERY_HISTORY_DAYS = 30;

export async function getAnalyticsOverview(userId: string) {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - (TREND_DAYS - 1));
  windowStart.setHours(0, 0, 0, 0);

  const masteryHistoryStart = new Date();
  masteryHistoryStart.setDate(masteryHistoryStart.getDate() - (MASTERY_HISTORY_DAYS - 1));
  masteryHistoryStart.setHours(0, 0, 0, 0);

  const [recentAnswers, masteries, streak, allTimeAnswerCount, allTimeCorrectCount, masterySnapshots] = await Promise.all([
    prisma.answer.findMany({
      where: { attempt: { userId }, createdAt: { gte: windowStart } },
      select: { createdAt: true, isCorrect: true, timeTakenMs: true },
    }),
    prisma.mastery.findMany({
      where: { userId, topicId: { not: null } },
      include: { topic: true },
      orderBy: { score: "asc" },
    }),
    prisma.streak.findUnique({ where: { userId } }),
    prisma.answer.count({ where: { attempt: { userId } } }),
    prisma.answer.count({ where: { attempt: { userId }, isCorrect: true } }),
    prisma.masterySnapshot.findMany({
      where: { userId, recordedAt: { gte: masteryHistoryStart }, topicId: { not: null } },
      include: { topic: { select: { name: true } } },
      orderBy: { recordedAt: "asc" },
    }),
  ]);

  const dailyTrend = groupAnswersByDay(recentAnswers, TREND_DAYS);

  const masteryByTopic = masteries
    .filter((m) => m.topic)
    .map((m) => ({ topicName: m.topic!.name, score: m.score, band: m.band }));

  const weakAreas = masteryByTopic.filter((m) => m.band === "NEEDS_ATTENTION" || m.band === "DEVELOPING");

  const masteryHistory = masterySnapshots.map((snapshot) => ({
    date: snapshot.recordedAt.toISOString(),
    topicName: snapshot.topic?.name ?? "Topic",
    score: snapshot.score,
  }));

  return {
    dailyTrend,
    masteryByTopic,
    masteryHistory,
    weakAreas,
    streak: { current: streak?.currentStreak ?? 0, longest: streak?.longestStreak ?? 0 },
    overallAccuracy: allTimeAnswerCount ? Math.round((allTimeCorrectCount / allTimeAnswerCount) * 100) : 0,
    totalQuestionsAnswered: allTimeAnswerCount,
  };
}
