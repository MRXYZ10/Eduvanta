/**
 * Pure aggregation over a session's answers — kept separate from the
 * Prisma query (see getSessionSummary.ts) so the math is testable without
 * a database, same pattern as scoreExam.ts.
 */

export interface SessionAnswer {
  isCorrect: boolean;
  timeTakenMs: number;
}

export interface SessionSummary {
  questionCount: number;
  correctCount: number;
  accuracy: number; // 0-100
  totalTimeMs: number;
}

export function summarizeSession(answers: SessionAnswer[]): SessionSummary {
  const questionCount = answers.length;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const accuracy = questionCount ? Math.round((correctCount / questionCount) * 1000) / 10 : 0;
  const totalTimeMs = answers.reduce((sum, a) => sum + a.timeTakenMs, 0);

  return { questionCount, correctCount, accuracy, totalTimeMs };
}
