import { describe, it, expect } from "vitest";
import {
  checkStreakRecordAchievement,
  checkMasteryMilestoneAchievement,
  checkExamPersonalBestAchievement,
} from "../checkAchievements";

describe("checkStreakRecordAchievement", () => {
  it("returns null when it's not a new record", () => {
    expect(checkStreakRecordAchievement(false, 5)).toBeNull();
  });

  it("awards when it is a new record", () => {
    const result = checkStreakRecordAchievement(true, 7);
    expect(result?.type).toBe("streak_record");
    expect(result?.label).toContain("7");
  });
});

describe("checkMasteryMilestoneAchievement", () => {
  it("awards the first time a topic reaches MASTERED", () => {
    const result = checkMasteryMilestoneAchievement("STRONG", "MASTERED", "Functions");
    expect(result?.type).toBe("mastery_milestone");
    expect(result?.label).toContain("Functions");
  });

  it("does not re-award if already at MASTERED", () => {
    expect(checkMasteryMilestoneAchievement("MASTERED", "MASTERED", "Functions")).toBeNull();
  });

  it("does not award for reaching STRONG or DEVELOPING", () => {
    expect(checkMasteryMilestoneAchievement("DEVELOPING", "STRONG", "Functions")).toBeNull();
    expect(checkMasteryMilestoneAchievement(null, "DEVELOPING", "Functions")).toBeNull();
  });

  it("awards even from a null previous band, as long as the new band is MASTERED", () => {
    expect(checkMasteryMilestoneAchievement(null, "MASTERED", "Sets")).not.toBeNull();
  });
});

describe("checkExamPersonalBestAchievement", () => {
  it("does not award on a student's very first exam attempt (no prior score to beat)", () => {
    expect(checkExamPersonalBestAchievement(85, null, "Functions Mock Test")).toBeNull();
  });

  it("awards when the new score beats the previous best", () => {
    const result = checkExamPersonalBestAchievement(90, 80, "Functions Mock Test");
    expect(result?.type).toBe("exam_personal_best");
  });

  it("does not award when the new score ties or falls short of the previous best", () => {
    expect(checkExamPersonalBestAchievement(80, 80, "Functions Mock Test")).toBeNull();
    expect(checkExamPersonalBestAchievement(70, 80, "Functions Mock Test")).toBeNull();
  });
});
