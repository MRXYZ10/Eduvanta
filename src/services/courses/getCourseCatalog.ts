import { prisma } from "@/db/client";

export async function getCourseCatalog(userId: string) {
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      teacher: { select: { profile: { select: { fullName: true } } } },
      subjects: {
        orderBy: { order: "asc" },
        select: { id: true, name: true, _count: { select: { topics: true } } },
      },
      enrollments: { where: { userId }, select: { id: true } },
      _count: { select: { enrollments: true } },
    },
  });

  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    examGoal: course.examGoal,
    teacherName: course.teacher?.profile?.fullName ?? null,
    studentCount: course._count.enrollments,
    subjectCount: course.subjects.length,
    topicCount: course.subjects.reduce((sum, subject) => sum + subject._count.topics, 0),
    subjects: course.subjects.map((subject) => ({ id: subject.id, name: subject.name, topicCount: subject._count.topics })),
    enrolled: course.enrollments.length > 0,
  }));
}
