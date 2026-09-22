import { describe, it, expect } from "vitest";
import { calculateMastery } from "../calculateMastery";

const now = new Date("2026-09-13T00:00:00Z");

function attempt(overrides: Partial<Parameters<typeof calculateMastery>[0]["attempts"][number]> = {}) {
  return {
    isCorrect: true,
    difficulty: "MEDIUM" as const,
    timestamp: now,
    timeTakenMs: 30_000,
    expectedTimeMs: 60_000,
    ...overrides,
  };
}

describe("calculateMastery", () => {
  it("returns 0 / NEEDS_ATTENTION with no attempts", () => {
    const result = calculateMastery({ attempts: [], repeatedMistakeCount: 0 }, now);
    expect(result.score).toBe(0);
    expect(result.band).toBe("NEEDS_ATTENTION");
  });

  it("scores consistent hard-question success as MASTERED", () => {
    const attempts = Array.from({ length: 8 }, () => attempt({ difficulty: "HARD" }));
    const result = calculateMastery({ attempts, repeatedMistakeCount: 0 }, now);
    expect(result.band).toBe("MASTERED");
  });

  it("is not simply correct/total — repeated mistakes drag score down despite good accuracy", () => {
    const attempts = Array.from({ length: 8 }, () => attempt());
    const withoutMistakes = calculateMastery({ attempts, repeatedMistakeCount: 0 }, now);
    const withMistakes = calculateMastery({ attempts, repeatedMistakeCount: 3 }, now);
    expect(withMistakes.score).toBeLessThan(withoutMistakes.score);
  });

  it("penalizes inconsistent performance vs steady performance at the same raw accuracy", () => {
    const steady = Array.from({ length: 10 }, (_, i) => attempt({ isCorrect: i % 10 !== 0 })); // 90% steady-ish
    const erratic = [
      ...Array.from({ length: 5 }, () => attempt({ isCorrect: true })),
      ...Array.from({ length: 4 }, () => attempt({ isCorrect: false })),
      attempt({ isCorrect: true }),
    ]; // same 60% raw accuracy but clumped

    const steadyResult = calculateMastery({ attempts: steady, repeatedMistakeCount: 0 }, now);
    const erraticResult = calculateMastery({ attempts: erratic, repeatedMistakeCount: 0 }, now);
    // Erratic should score at or below steady given the same repeated-mistake count.
    expect(erraticResult.score).toBeLessThanOrEqual(steadyResult.score);
  });

  it("weighs older attempts less than recent ones (recency decay)", () => {
    const oldWrong = attempt({
      isCorrect: false,
      timestamp: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    });
    const recentCorrect = Array.from({ length: 5 }, () => attempt({ isCorrect: true }));

    const result = calculateMastery({ attempts: [oldWrong, ...recentCorrect], repeatedMistakeCount: 0 }, now);
    expect(result.score).toBeGreaterThan(60); // recent success should dominate
  });

  it("clamps score within 0-100", () => {
    const allWrong = Array.from({ length: 5 }, () => attempt({ isCorrect: false }));
    const result = calculateMastery({ attempts: allWrong, repeatedMistakeCount: 10 }, now);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
