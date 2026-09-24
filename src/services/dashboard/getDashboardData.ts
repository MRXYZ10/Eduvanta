import { prisma } from "@/db/client";
import { calculateExamReadiness } from "./calculateExamReadiness";

/**
 * Single query surface for the dashboard. Kept separate from the page
 * component so the exam-readiness calc, recommendation ranking, etc. stay
 * unit-testable without rendering React.
 */
export async function getDashboardData(userId: string) {
  const [profile, masteries, recommendations, todaySessions, mistakeCount, upcomingAssignments] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.mastery.findMany({
      where: { userId },
      include: { topic: true, subtopic: true, concept: true },
      orderBy: { lastUpdated: "desc" },
    }),
    prisma.recommendation.findMany({
      where: { userId, dismissed: false },
      orderBy: { priority: "desc" },
      take: 3,
    }),
    prisma.studySession.findMany({
      where: { userId, status: "pending" },
      orderBy: { scheduledFor: "asc" },
      take: 4,
    }),
    prisma.mistake.count({ where: { userId, resolved: false } }),
    prisma.assignment.findMany({
      where: {
        course: { enrollments: { some: { userId } } },
        OR: [{ dueDate: null }, { dueDate: { gte: new Date() } }],
      },
      include: { course: { select: { title: true } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 5,
    }),
  ]);

  const overallMastery = masteries.length
    ? Math.round(masteries.reduce((sum, m) => sum + m.score, 0) / masteries.length)
    : 0;

  const weeklyImprovement = masteries.length
    ? Math.round((masteries.reduce((sum, m) => sum + m.trend, 0) / masteries.length) * 10) / 10
    : 0;

  // Exam readiness buckets are computed at topic granularity specifically
  // (the spec's mock shows topic names — "Strong: Sets, Logic" — not
  // concepts or subtopics), so only topic-scoped Mastery rows feed this,
  // even though overallMastery above intentionally uses every scope.
  const topicLevelMasteries = masteries.filter((m) => m.topicId && !m.subtopicId && !m.conceptId && m.topic);
  const examReadiness = calculateExamReadiness(
    topicLevelMasteries.map((m) => ({ topicName: m.topic!.name, masteryScore: m.score, band: m.band })),
    mistakeCount,
  );

  return {
    firstName: profile?.fullName?.split(" ").pop() ?? "there",
    overallMastery,
    examReadiness: examReadiness.score,
    examReadinessBreakdown: {
      strong: examReadiness.strongTopics,
      developing: examReadiness.developingTopics,
      weak: examReadiness.weakTopics,
    },
    weeklyImprovement,
    todaySessions,
    upcomingAssignments: upcomingAssignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      courseTitle: assignment.course.title,
      dueDate: assignment.dueDate,
    })),
    recommendations,
    masteries: masteries.map((m) => ({
      id: m.id,
      label: m.concept?.name ?? m.subtopic?.name ?? m.topic?.name ?? "Unknown",
      score: m.score,
      band: m.band,
      trend: m.trend,
    })),
  };
}
