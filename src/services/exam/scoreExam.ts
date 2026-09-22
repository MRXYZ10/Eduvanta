/**
 * Deterministic exam analysis. Score, accuracy, topic/difficulty breakdowns,
 * and time analysis are all computed here — not by the AI — per the
 * product rule "never blindly trust model-generated numbers." The AI's
 * only job (see buildExamNarrative.ts) is to explain these already-computed
 * numbers in plain language.
 */

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface ScoredAnswer {
  questionId: string;
  prompt: string;
  topicName: string | null;
  difficulty: Difficulty;
  isCorrect: boolean;
  timeTakenMs: number;
  expectedTimeMs: number;
  markedForReview: boolean;
}

export interface TopicPerformance {
  topicName: string;
  correct: number;
  total: number;
  accuracy: number;
}

export interface DifficultyPerformance {
  difficulty: Difficulty;
  correct: number;
  total: number;
  accuracy: number;
}

export interface CostlyQuestion {
  questionId: string;
  prompt: string;
  reason: "wrong_and_slow" | "wrong_and_fast_guess" | "wrong_marked_for_review" | "correct_but_very_slow";
}

export interface ExamReport {
  totalQuestions: number;
  correctCount: number;
  score: number; // 0-100
  accuracy: number; // 0-100, same as score for single-mark questions but kept distinct for future partial-credit types
  totalTimeMs: number;
  avgTimePerQuestionMs: number;
  topicPerformance: TopicPerformance[];
  difficultyPerformance: DifficultyPerformance[];
  costlyQuestions: CostlyQuestion[]; // feeds "what actually cost you marks"
}

export function scoreExam(answers: ScoredAnswer[]): ExamReport {
  const totalQuestions = answers.length;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const score = totalQuestions ? Math.round((correctCount / totalQuestions) * 1000) / 10 : 0;
  const totalTimeMs = answers.reduce((sum, a) => sum + a.timeTakenMs, 0);
  const avgTimePerQuestionMs = totalQuestions ? Math.round(totalTimeMs / totalQuestions) : 0;

  const topicMap = new Map<string, { correct: number; total: number }>();
  const difficultyMap = new Map<Difficulty, { correct: number; total: number }>();

  for (const a of answers) {
    const topicKey = a.topicName ?? "General";
    const t = topicMap.get(topicKey) ?? { correct: 0, total: 0 };
    t.total++;
    if (a.isCorrect) t.correct++;
    topicMap.set(topicKey, t);

    const d = difficultyMap.get(a.difficulty) ?? { correct: 0, total: 0 };
    d.total++;
    if (a.isCorrect) d.correct++;
    difficultyMap.set(a.difficulty, d);
  }

  const topicPerformance: TopicPerformance[] = Array.from(topicMap.entries()).map(([topicName, v]) => ({
    topicName,
    correct: v.correct,
    total: v.total,
    accuracy: Math.round((v.correct / v.total) * 1000) / 10,
  }));

  const difficultyPerformance: DifficultyPerformance[] = Array.from(difficultyMap.entries()).map(
    ([difficulty, v]) => ({
      difficulty,
      correct: v.correct,
      total: v.total,
      accuracy: Math.round((v.correct / v.total) * 1000) / 10,
    }),
  );

  // "What actually cost you marks" — the categories a student can actually
  // act on, not just a list of wrong answers.
  const costlyQuestions: CostlyQuestion[] = [];
  for (const a of answers) {
    if (a.isCorrect && a.timeTakenMs > a.expectedTimeMs * 2.5) {
      costlyQuestions.push({ questionId: a.questionId, prompt: a.prompt, reason: "correct_but_very_slow" });
    } else if (!a.isCorrect && a.markedForReview) {
      costlyQuestions.push({ questionId: a.questionId, prompt: a.prompt, reason: "wrong_marked_for_review" });
    } else if (!a.isCorrect && a.timeTakenMs < a.expectedTimeMs * 0.3) {
      costlyQuestions.push({ questionId: a.questionId, prompt: a.prompt, reason: "wrong_and_fast_guess" });
    } else if (!a.isCorrect && a.timeTakenMs > a.expectedTimeMs * 1.5) {
      costlyQuestions.push({ questionId: a.questionId, prompt: a.prompt, reason: "wrong_and_slow" });
    }
  }

  return {
    totalQuestions,
    correctCount,
    score,
    accuracy: score,
    totalTimeMs,
    avgTimePerQuestionMs,
    topicPerformance,
    difficultyPerformance,
    costlyQuestions,
  };
}
