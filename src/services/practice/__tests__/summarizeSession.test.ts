import { describe, it, expect } from "vitest";
import { summarizeSession } from "../summarizeSession";

describe("summarizeSession", () => {
  it("handles an empty session without dividing by zero", () => {
    const result = summarizeSession([]);
    expect(result).toEqual({ questionCount: 0, correctCount: 0, accuracy: 0, totalTimeMs: 0 });
  });

  it("computes accuracy and totals correctly", () => {
    const result = summarizeSession([
      { isCorrect: true, timeTakenMs: 10_000 },
      { isCorrect: true, timeTakenMs: 15_000 },
      { isCorrect: false, timeTakenMs: 20_000 },
    ]);
    expect(result.questionCount).toBe(3);
    expect(result.correctCount).toBe(2);
    expect(result.accuracy).toBeCloseTo(66.7, 1);
    expect(result.totalTimeMs).toBe(45_000);
  });
});
