import { prisma } from "@/db/client";

export async function getEnrolledCourses(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        include: {
          subjects: {
            include: { topics: { include: { masteries: { where: { userId } } } } },
            orderBy: { order: "asc" },
          },
        },
      },
    },
    orderBy: { enrolledAt: "asc" },
  });

  return enrollments.map((e) => ({
    id: e.course.id,
    title: e.course.title,
    subjects: e.course.subjects.map((s) => ({
      id: s.id,
      name: s.name,
      topics: s.topics.map((t) => ({
        id: t.id,
        name: t.name,
        mastery: t.masteries[0] ? { score: t.masteries[0].score, band: t.masteries[0].band } : null,
      })),
    })),
  }));
}
