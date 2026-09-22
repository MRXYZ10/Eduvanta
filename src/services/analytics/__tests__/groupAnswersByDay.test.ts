import { describe, it, expect } from "vitest";
import { groupAnswersByDay, type AnswerRecord } from "../groupAnswersByDay";

const now = new Date("2026-09-20T12:00:00Z");

describe("groupAnswersByDay", () => {
  it("returns exactly `days` buckets even with no answers", () => {
    const result = groupAnswersByDay([], 7, now);
    expect(result).toHaveLength(7);
    expect(result.every((b) => b.questionCount === 0 && b.accuracy === 0)).toBe(true);
  });

  it("returns buckets in chronological order ending today", () => {
    const result = groupAnswersByDay([], 3, now);
    expect(result.map((b) => b.date)).toEqual(["2026-09-18", "2026-09-19", "2026-09-20"]);
  });

  it("aggregates multiple answers on the same day correctly", () => {
    const answers: AnswerRecord[] = [
      { createdAt: new Date("2026-09-20T08:00:00Z"), isCorrect: true, timeTakenMs: 30_000 },
      { createdAt: new Date("2026-09-20T09:00:00Z"), isCorrect: false, timeTakenMs: 60_000 },
      { createdAt: new Date("2026-09-20T10:00:00Z"), isCorrect: true, timeTakenMs: 30_000 },
    ];
    const result = groupAnswersByDay(answers, 1, now);
    expect(result[0].questionCount).toBe(3);
    expect(result[0].correctCount).toBe(2);
    expect(result[0].accuracy).toBe(67);
    expect(result[0].studyMinutes).toBe(2); // 120,000ms = 2 minutes
  });

  it("ignores answers outside the requested window", () => {
    const answers: AnswerRecord[] = [
      { createdAt: new Date("2026-08-01T08:00:00Z"), isCorrect: true, timeTakenMs: 30_000 }, // way outside
    ];
    const result = groupAnswersByDay(answers, 7, now);
    expect(result.every((b) => b.questionCount === 0)).toBe(true);
  });

  it("keeps separate days separate", () => {
    const answers: AnswerRecord[] = [
      { createdAt: new Date("2026-09-19T08:00:00Z"), isCorrect: true, timeTakenMs: 10_000 },
      { createdAt: new Date("2026-09-20T08:00:00Z"), isCorrect: false, timeTakenMs: 10_000 },
    ];
    const result = groupAnswersByDay(answers, 2, now);
    expect(result[0].questionCount).toBe(1);
    expect(result[0].correctCount).toBe(1);
    expect(result[1].questionCount).toBe(1);
    expect(result[1].correctCount).toBe(0);
  });
});
