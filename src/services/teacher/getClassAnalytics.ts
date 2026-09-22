/**
 * Aggregates per-student Mastery rows into class-wide topic performance.
 * Kept as a pure function over plain data (not a Prisma query itself) so
 * the aggregation math is testable without a database — the API route
 * does the Prisma fetch and hands the raw rows in here.
 */

export interface StudentMasteryRow {
  studentId: string;
  topicName: string;
  score: number;
}

export interface TopicClassStats {
  topicName: string;
  studentCount: number;
  averageMastery: number;
  strugglingStudentCount: number; // students below the "needs attention" threshold
}

const STRUGGLING_THRESHOLD = 40; // matches the mastery engine's NEEDS_ATTENTION band cutoff

export function aggregateClassMastery(rows: StudentMasteryRow[]): TopicClassStats[] {
  const byTopic = new Map<string, StudentMasteryRow[]>();
  for (const row of rows) {
    const list = byTopic.get(row.topicName) ?? [];
    list.push(row);
    byTopic.set(row.topicName, list);
  }

  return Array.from(byTopic.entries())
    .map(([topicName, studentRows]) => ({
      topicName,
      studentCount: studentRows.length,
      averageMastery: Math.round((studentRows.reduce((s, r) => s + r.score, 0) / studentRows.length) * 10) / 10,
      strugglingStudentCount: studentRows.filter((r) => r.score < STRUGGLING_THRESHOLD).length,
    }))
    .sort((a, b) => a.averageMastery - b.averageMastery); // weakest topics first — what a teacher needs to see immediately
}

/** A topic is "class-wide weak" when a majority of attempted students are struggling, not just a couple. */
export function identifyWeakTopics(stats: TopicClassStats[], minStudents = 3): TopicClassStats[] {
  return stats.filter(
    (t) => t.studentCount >= minStudents && t.strugglingStudentCount / t.studentCount >= 0.5,
  );
}
