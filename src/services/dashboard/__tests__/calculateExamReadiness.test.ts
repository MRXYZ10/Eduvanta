import { describe, it, expect } from "vitest";
import { calculateExamReadiness } from "../calculateExamReadiness";

describe("calculateExamReadiness", () => {
  it("returns zero with no topics", () => {
    const result = calculateExamReadiness([], 0);
    expect(result.score).toBe(0);
  });

  it("buckets MASTERED and STRONG together as strong", () => {
    const result = calculateExamReadiness(
      [
        { topicName: "Sets", masteryScore: 90, band: "MASTERED" },
        { topicName: "Logic", masteryScore: 70, band: "STRONG" },
      ],
      0,
    );
    expect(result.strongTopics).toEqual(["Sets", "Logic"]);
  });

  it("buckets DEVELOPING and NEEDS_ATTENTION separately", () => {
    const result = calculateExamReadiness(
      [
        { topicName: "Relations", masteryScore: 55, band: "DEVELOPING" },
        { topicName: "Functions", masteryScore: 20, band: "NEEDS_ATTENTION" },
      ],
      0,
    );
    expect(result.developingTopics).toEqual(["Relations"]);
    expect(result.weakTopics).toEqual(["Functions"]);
  });

  it("penalizes score for unresolved mistakes, capped", () => {
    const topics = [{ topicName: "Functions", masteryScore: 80, band: "STRONG" as const }];
    const noMistakes = calculateExamReadiness(topics, 0);
    const someMistakes = calculateExamReadiness(topics, 5);
    const manyMistakes = calculateExamReadiness(topics, 50);
    expect(someMistakes.score).toBeLessThan(noMistakes.score);
    // Cap means 50 mistakes doesn't crush the score to zero from 80 base.
    expect(manyMistakes.score).toBe(60); // 80 - 20 (capped penalty)
  });

  it("never returns a negative score or one above 100", () => {
    const topics = [{ topicName: "Weak", masteryScore: 5, band: "NEEDS_ATTENTION" as const }];
    const result = calculateExamReadiness(topics, 100);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
