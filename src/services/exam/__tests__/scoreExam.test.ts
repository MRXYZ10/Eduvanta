import { describe, it, expect } from "vitest";
import { scoreExam, type ScoredAnswer } from "../scoreExam";

function mk(overrides: Partial<ScoredAnswer> = {}): ScoredAnswer {
  return {
    questionId: "q1",
    prompt: "Some question",
    topicName: "Functions",
    difficulty: "MEDIUM",
    isCorrect: true,
    timeTakenMs: 30_000,
    expectedTimeMs: 60_000,
    markedForReview: false,
    ...overrides,
  };
}

describe("scoreExam", () => {
  it("computes score as percent correct", () => {
    const report = scoreExam([mk({ isCorrect: true }), mk({ isCorrect: true }), mk({ isCorrect: false }), mk({ isCorrect: false })]);
    expect(report.score).toBe(50);
    expect(report.correctCount).toBe(2);
    expect(report.totalQuestions).toBe(4);
  });

  it("breaks down performance by topic", () => {
    const report = scoreExam([
      mk({ topicName: "Functions", isCorrect: true }),
      mk({ topicName: "Functions", isCorrect: false }),
      mk({ topicName: "Sets", isCorrect: true }),
    ]);
    const functions = report.topicPerformance.find((t) => t.topicName === "Functions")!;
    const sets = report.topicPerformance.find((t) => t.topicName === "Sets")!;
    expect(functions.total).toBe(2);
    expect(functions.accuracy).toBe(50);
    expect(sets.accuracy).toBe(100);
  });

  it("breaks down performance by difficulty", () => {
    const report = scoreExam([
      mk({ difficulty: "EASY", isCorrect: true }),
      mk({ difficulty: "HARD", isCorrect: false }),
    ]);
    expect(report.difficultyPerformance.find((d) => d.difficulty === "EASY")?.accuracy).toBe(100);
    expect(report.difficultyPerformance.find((d) => d.difficulty === "HARD")?.accuracy).toBe(0);
  });

  it("flags a wrong, very-fast answer as a likely guess", () => {
    const report = scoreExam([mk({ isCorrect: false, timeTakenMs: 5_000, expectedTimeMs: 60_000 })]);
    expect(report.costlyQuestions[0].reason).toBe("wrong_and_fast_guess");
  });

  it("flags a wrong answer that was marked for review as the highest-signal miss", () => {
    const report = scoreExam([mk({ isCorrect: false, markedForReview: true, timeTakenMs: 40_000 })]);
    expect(report.costlyQuestions[0].reason).toBe("wrong_marked_for_review");
  });

  it("flags a correct-but-very-slow answer as a time cost even though it wasn't wrong", () => {
    const report = scoreExam([mk({ isCorrect: true, timeTakenMs: 200_000, expectedTimeMs: 60_000 })]);
    expect(report.costlyQuestions[0].reason).toBe("correct_but_very_slow");
  });

  it("handles zero answers without dividing by zero", () => {
    const report = scoreExam([]);
    expect(report.score).toBe(0);
    expect(report.avgTimePerQuestionMs).toBe(0);
  });
});
