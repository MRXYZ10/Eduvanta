import { describe, it, expect } from "vitest";
import { generateStudyPlan, rebalanceMissedWork, type TopicInput } from "../generateStudyPlan";

const start = new Date("2026-09-13");
const target = new Date("2026-09-23"); // 10 days out

const topics: TopicInput[] = [
  { id: "t1", name: "Functions", masteryScore: 30, unresolvedMistakes: 2 },
  { id: "t2", name: "Relations", masteryScore: 80, unresolvedMistakes: 0 },
  { id: "t3", name: "Sets", masteryScore: null, unresolvedMistakes: 0 },
];

describe("generateStudyPlan", () => {
  it("returns no sessions with no topics or non-positive daily minutes", () => {
    expect(generateStudyPlan({ topics: [], dailyStudyMinutes: 60, startDate: start, targetDate: target })).toEqual([]);
    expect(generateStudyPlan({ topics, dailyStudyMinutes: 0, startDate: start, targetDate: target })).toEqual([]);
  });

  it("gives the weakest topic more total minutes than the strongest topic", () => {
    const sessions = generateStudyPlan({ topics, dailyStudyMinutes: 60, startDate: start, targetDate: target });
    const minutesByTopic: Record<string, number> = {};
    for (const s of sessions) minutesByTopic[s.topicId] = (minutesByTopic[s.topicId] ?? 0) + s.durationMin;

    expect(minutesByTopic["t1"]).toBeGreaterThan(minutesByTopic["t2"]);
  });

  it("never schedules a day beyond the target date", () => {
    const sessions = generateStudyPlan({ topics, dailyStudyMinutes: 60, startDate: start, targetDate: target });
    const totalDays = Math.round((target.getTime() - start.getTime()) / 86_400_000);
    for (const s of sessions) expect(s.dayOffset).toBeLessThan(totalDays);
  });

  it("includes periodic revision sessions", () => {
    const sessions = generateStudyPlan({ topics, dailyStudyMinutes: 60, startDate: start, targetDate: target });
    expect(sessions.some((s) => s.kind === "revision")).toBe(true);
  });

  it("treats an unattempted topic as needing attention, not neglecting it", () => {
    const sessions = generateStudyPlan({ topics, dailyStudyMinutes: 90, startDate: start, targetDate: target });
    expect(sessions.some((s) => s.topicId === "t3")).toBe(true);
  });
});

describe("rebalanceMissedWork", () => {
  it("returns nothing with zero remaining days", () => {
    const result = rebalanceMissedWork({
      missedTopics: [{ id: "t1", name: "Functions", masteryScore: 30, unresolvedMistakes: 1 }],
      missedMinutesByTopic: { t1: 60 },
      remainingDays: 0,
      dailyStudyMinutes: 60,
      maxExtraMinutesPerDay: 15,
    });
    expect(result).toEqual([]);
  });

  it("does not dump all missed work onto a single day", () => {
    const result = rebalanceMissedWork({
      missedTopics: [{ id: "t1", name: "Functions", masteryScore: 30, unresolvedMistakes: 1 }],
      missedMinutesByTopic: { t1: 120 },
      remainingDays: 10,
      dailyStudyMinutes: 60,
      maxExtraMinutesPerDay: 15,
    });
    const dayZeroMinutes = result.filter((s) => s.dayOffset === 0).reduce((a, s) => a + s.durationMin, 0);
    expect(dayZeroMinutes).toBeLessThanOrEqual(15);
  });

  it("protects the highest-priority missed topic when capacity is insufficient, dropping the weaker-priority one first", () => {
    const result = rebalanceMissedWork({
      missedTopics: [
        { id: "weak", name: "Weak Topic", masteryScore: 10, unresolvedMistakes: 5 },
        { id: "strong", name: "Strong Topic", masteryScore: 90, unresolvedMistakes: 0 },
      ],
      missedMinutesByTopic: { weak: 200, strong: 200 },
      remainingDays: 2,
      dailyStudyMinutes: 60,
      maxExtraMinutesPerDay: 15, // total capacity = 30 minutes, way less than 400 owed
    });
    const totalScheduled = result.reduce((a, s) => a + s.durationMin, 0);
    expect(totalScheduled).toBeLessThan(400);

    const weakMinutes = result.filter((s) => s.topicId === "weak").reduce((a, s) => a + s.durationMin, 0);
    const strongMinutes = result.filter((s) => s.topicId === "strong").reduce((a, s) => a + s.durationMin, 0);
    expect(weakMinutes).toBeGreaterThan(strongMinutes);
  });
});
