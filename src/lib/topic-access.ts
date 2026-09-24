import { prisma } from "@/db/client";

/**
 * Returns whether a student can access a topic through an enrolled course.
 * Staff accounts are allowed to preview all topics.
 */
export async function canAccessTopic(userId: string, role: string, topicId: string) {
  if (role === "ADMIN" || role === "TEACHER") return true;

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { subject: { select: { courseId: true } } },
  });

  if (!topic) return false;

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: topic.subject.courseId,
      },
    },
    select: { id: true },
  });

  return Boolean(enrollment);
}
