import { describe, it, expect } from "vitest";
import { aggregateClassMastery, identifyWeakTopics } from "../getClassAnalytics";

describe("aggregateClassMastery", () => {
  it("computes average mastery per topic", () => {
    const stats = aggregateClassMastery([
      { studentId: "s1", topicName: "Functions", score: 40 },
      { studentId: "s2", topicName: "Functions", score: 60 },
    ]);
    expect(stats[0].averageMastery).toBe(50);
    expect(stats[0].studentCount).toBe(2);
  });

  it("sorts weakest topics first", () => {
    const stats = aggregateClassMastery([
      { studentId: "s1", topicName: "Strong Topic", score: 90 },
      { studentId: "s1", topicName: "Weak Topic", score: 20 },
    ]);
    expect(stats[0].topicName).toBe("Weak Topic");
  });

  it("counts struggling students below the threshold", () => {
    const stats = aggregateClassMastery([
      { studentId: "s1", topicName: "Functions", score: 20 },
      { studentId: "s2", topicName: "Functions", score: 90 },
      { studentId: "s3", topicName: "Functions", score: 30 },
    ]);
    expect(stats[0].strugglingStudentCount).toBe(2);
  });
});

describe("identifyWeakTopics", () => {
  it("flags a topic only when at least half of a sufficiently large group struggles", () => {
    const stats = aggregateClassMastery([
      { studentId: "s1", topicName: "Integration", score: 20 },
      { studentId: "s2", topicName: "Integration", score: 25 },
      { studentId: "s3", topicName: "Integration", score: 90 },
    ]);
    expect(identifyWeakTopics(stats, 3)).toHaveLength(1);
  });

  it("does not flag a topic with too few students to be meaningful", () => {
    const stats = aggregateClassMastery([
      { studentId: "s1", topicName: "Rare Topic", score: 10 },
      { studentId: "s2", topicName: "Rare Topic", score: 15 },
    ]);
    expect(identifyWeakTopics(stats, 3)).toHaveLength(0);
  });

  it("does not flag a topic where most students are doing fine", () => {
    const stats = aggregateClassMastery([
      { studentId: "s1", topicName: "Sets", score: 85 },
      { studentId: "s2", topicName: "Sets", score: 90 },
      { studentId: "s3", topicName: "Sets", score: 20 },
    ]);
    expect(identifyWeakTopics(stats, 3)).toHaveLength(0);
  });
});
