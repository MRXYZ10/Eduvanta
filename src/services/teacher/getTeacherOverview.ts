import { prisma } from "@/db/client";
import { aggregateClassMastery, identifyWeakTopics, type StudentMasteryRow } from "./getClassAnalytics";

export async function getTeacherOverview(teacherId: string) {
  const courses = await prisma.course.findMany({
    where: { teacherId },
    include: {
      subjects: { include: { topics: true } },
      enrollments: { where: { user: { role: "STUDENT" } } },
    },
  });

  const topicIds = courses.flatMap((c) => c.subjects.flatMap((s) => s.topics.map((t) => t.id)));
  const enrolledStudentCount = new Set(courses.flatMap((c) => c.enrollments.map((e) => e.userId))).size;

  const masteries = topicIds.length
    ? await prisma.mastery.findMany({
        where: { topicId: { in: topicIds }, user: { role: "STUDENT" } },
        include: { topic: true },
      })
    : [];

  const rows: StudentMasteryRow[] = masteries
    .filter((m) => m.topic)
    .map((m) => ({ studentId: m.userId, topicName: m.topic!.name, score: m.score }));

  const classStats = aggregateClassMastery(rows);
  const weakTopics = identifyWeakTopics(classStats);

  const assignments = await prisma.assignment.findMany({
    where: { teacherId },
    orderBy: { dueDate: "asc" },
    take: 5,
  });

  // Map weak topic names back to topic IDs so the UI can link "Generate
  // Remedial Practice" straight to the right topic without another lookup.
  const allTopics = courses.flatMap((c) => c.subjects.flatMap((s) => s.topics));
  const topicIdByName = new Map(allTopics.map((t) => [t.name, t.id]));

  return {
    courses: courses.map((c) => ({ id: c.id, title: c.title, studentTopicCount: c.subjects.reduce((s, sub) => s + sub.topics.length, 0) })),
    // Real roster size (Enrollment rows) shown alongside the mastery-based
    // analytics below — the two can legitimately diverge (an enrolled
    // student who hasn't practiced yet has no Mastery row), and showing
    // both is more honest than presenting the mastery-derived count as if
    // it were the class roster.
    enrolledStudentCount,
    classStats,
    weakTopics: weakTopics.map((w) => ({ ...w, topicId: topicIdByName.get(w.topicName) ?? null })),
    assignments,
  };
}
