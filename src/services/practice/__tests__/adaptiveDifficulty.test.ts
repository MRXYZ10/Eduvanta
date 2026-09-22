import { describe, it, expect } from "vitest";
import { decideNextDifficulty, type AdaptiveState } from "../adaptiveDifficulty";

const baseState: AdaptiveState = {
  currentDifficulty: "MEDIUM",
  consecutiveCorrect: 0,
  consecutiveWrong: 0,
  sameConceptMisses: 0,
};

describe("decideNextDifficulty", () => {
  it("increases difficulty on correct + fast answer", () => {
    const decision = decideNextDifficulty(baseState, {
      isCorrect: true,
      timeTakenMs: 20_000,
      expectedTimeMs: 60_000,
      sameConceptAsLast: false,
    });
    expect(decision.action).toBe("increase_difficulty");
    expect(decision.nextDifficulty).toBe("HARD");
  });

  it("holds on correct but slow answer", () => {
    const decision = decideNextDifficulty(baseState, {
      isCorrect: true,
      timeTakenMs: 59_000,
      expectedTimeMs: 60_000,
      sameConceptAsLast: false,
    });
    expect(decision.action).toBe("hold");
    expect(decision.nextDifficulty).toBe("MEDIUM");
  });

  it("increases difficulty after 3 consecutive correct even if slow", () => {
    let state = baseState;
    let decision;
    for (let i = 0; i < 3; i++) {
      decision = decideNextDifficulty(state, {
        isCorrect: true,
        timeTakenMs: 59_000,
        expectedTimeMs: 60_000,
        sameConceptAsLast: false,
      });
      state = decision.nextState;
    }
    expect(decision!.action).toBe("increase_difficulty");
  });

  it("holds (analyzes misconception) on a single wrong answer", () => {
    const decision = decideNextDifficulty(baseState, {
      isCorrect: false,
      timeTakenMs: 30_000,
      expectedTimeMs: 60_000,
      sameConceptAsLast: false,
    });
    expect(decision.action).toBe("hold");
  });

  it("decreases difficulty and flags teach_concept on repeated same-concept miss", () => {
    const firstMiss = decideNextDifficulty(baseState, {
      isCorrect: false,
      timeTakenMs: 30_000,
      expectedTimeMs: 60_000,
      sameConceptAsLast: false,
    });
    const secondMiss = decideNextDifficulty(firstMiss.nextState, {
      isCorrect: false,
      timeTakenMs: 30_000,
      expectedTimeMs: 60_000,
      sameConceptAsLast: true,
    });
    expect(secondMiss.action).toBe("teach_concept");
    expect(secondMiss.nextDifficulty).toBe("EASY");
  });

  it("does not go below EASY or above HARD", () => {
    const atFloor = decideNextDifficulty(
      { ...baseState, currentDifficulty: "EASY" },
      { isCorrect: false, timeTakenMs: 30_000, expectedTimeMs: 60_000, sameConceptAsLast: true },
    );
    const atFloor2 = decideNextDifficulty(
      { ...atFloor.nextState, currentDifficulty: "EASY" },
      { isCorrect: false, timeTakenMs: 30_000, expectedTimeMs: 60_000, sameConceptAsLast: true },
    );
    expect(atFloor2.nextDifficulty).toBe("EASY");
  });
});
