import { prisma } from "@/db/client";
import { groupAnswersByDay } from "./groupAnswersByDay";

const TREND_DAYS = 14;

export async function getAnalyticsOverview(userId: string) {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - (TREND_DAYS - 1));
  windowStart.setHours(0, 0, 0, 0);

  const [recentAnswers, masteries, streak, allTimeAnswerCount, allTimeCorrectCount] = await Promise.all([
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
  ]);

  const dailyTrend = groupAnswersByDay(recentAnswers, TREND_DAYS);

  const masteryByTopic = masteries
    .filter((m) => m.topic)
    .map((m) => ({ topicName: m.topic!.name, score: m.score, band: m.band }));

  const weakAreas = masteryByTopic.filter((m) => m.band === "NEEDS_ATTENTION" || m.band === "DEVELOPING");

  return {
    dailyTrend, // real, per-day, last 14 days
    masteryByTopic, // current snapshot only — no history stored, see groupAnswersByDay.ts doc comment
    weakAreas,
    streak: { current: streak?.currentStreak ?? 0, longest: streak?.longestStreak ?? 0 },
    overallAccuracy: allTimeAnswerCount ? Math.round((allTimeCorrectCount / allTimeAnswerCount) * 100) : 0,
    totalQuestionsAnswered: allTimeAnswerCount,
  };
}
