import { prisma } from "@/db/client";

/**
 * "AI usage" here is a DB-derived proxy (counts of AI-touched records),
 * not real per-call latency/error tracking — that needs the Observability
 * work (structured logging around completeWithRetry()) called out as
 * not-yet-built in ARCHITECTURE.md. This still satisfies the spec's
 * "keep it functional but simple" instruction for a first admin view.
 */
export async function getAdminOverview() {
  const [
    usersByRole,
    courseCount,
    questionStats,
    examCount,
    materialStats,
    recentUsers,
    conversationCount,
    messageCount,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: true }),
    prisma.course.count(),
    prisma.question.groupBy({ by: ["source", "validated"], _count: true }),
    prisma.exam.count(),
    prisma.learningMaterial.groupBy({ by: ["status"], _count: true }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { email: true, role: true, createdAt: true } }),
    prisma.conversation.count(),
    prisma.message.count({ where: { role: "assistant" } }),
  ]);

  const roleCounts = Object.fromEntries(usersByRole.map((r) => [r.role, r._count]));

  const aiGeneratedQuestions = questionStats
    .filter((q) => q.source === "AI_GENERATED")
    .reduce((sum, q) => sum + q._count, 0);
  const unvalidatedQuestions = questionStats.filter((q) => !q.validated).reduce((sum, q) => sum + q._count, 0);
  const totalQuestions = questionStats.reduce((sum, q) => sum + q._count, 0);

  const materialCounts = Object.fromEntries(materialStats.map((m) => [m.status, m._count]));

  return {
    users: {
      total: Object.values(roleCounts).reduce((a: number, b) => a + (b as number), 0),
      byRole: { STUDENT: roleCounts.STUDENT ?? 0, TEACHER: roleCounts.TEACHER ?? 0, ADMIN: roleCounts.ADMIN ?? 0 },
      recent: recentUsers,
    },
    content: {
      courseCount,
      examCount,
      totalQuestions,
      aiGeneratedQuestions,
      unvalidatedQuestions, // a system-health signal: these were never persisted as validated:true, so they're inert — should be ~0 in steady state
    },
    aiUsage: {
      conversationCount,
      aiMessageCount: messageCount,
      aiGeneratedQuestions,
    },
    systemHealth: {
      materialsReady: materialCounts.ready ?? 0,
      materialsProcessing: materialCounts.processing ?? 0,
      materialsFailed: materialCounts.failed ?? 0,
    },
  };
}
