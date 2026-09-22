import { describe, it, expect } from "vitest";
import { updateStreak, type StreakState } from "../updateStreak";

const base: StreakState = { currentStreak: 0, longestStreak: 0, lastActiveDate: null };

describe("updateStreak", () => {
  it("starts a streak at 1 on first-ever activity", () => {
    const result = updateStreak(base, new Date("2026-09-15T10:00:00Z"));
    expect(result.nextState.currentStreak).toBe(1);
    expect(result.extended).toBe(true);
  });

  it("does not change anything for a second activity on the same day", () => {
    const afterDay1 = updateStreak(base, new Date("2026-09-15T10:00:00Z")).nextState;
    const result = updateStreak(afterDay1, new Date("2026-09-15T18:00:00Z"));
    expect(result.nextState.currentStreak).toBe(1);
    expect(result.extended).toBe(false);
  });

  it("extends the streak on the very next day", () => {
    const afterDay1 = updateStreak(base, new Date("2026-09-15T10:00:00Z")).nextState;
    const result = updateStreak(afterDay1, new Date("2026-09-16T09:00:00Z"));
    expect(result.nextState.currentStreak).toBe(2);
    expect(result.extended).toBe(true);
  });

  it("resets to 1 after a missed day", () => {
    const afterDay1 = updateStreak(base, new Date("2026-09-15T10:00:00Z")).nextState;
    const result = updateStreak(afterDay1, new Date("2026-09-18T10:00:00Z")); // 3-day gap
    expect(result.nextState.currentStreak).toBe(1);
  });

  it("tracks longest streak independently of the current one after a reset", () => {
    let state = base;
    for (const day of [15, 16, 17]) {
      state = updateStreak(state, new Date(`2026-09-${day}T10:00:00Z`)).nextState;
    }
    expect(state.longestStreak).toBe(3);
    // Miss a bunch of days, then resume.
    state = updateStreak(state, new Date("2026-09-25T10:00:00Z")).nextState;
    expect(state.currentStreak).toBe(1);
    expect(state.longestStreak).toBe(3); // longest is preserved even though current reset
  });

  it("flags a new record only once the current streak actually exceeds the prior longest", () => {
    let state = base;
    for (const day of [15, 16, 17]) {
      state = updateStreak(state, new Date(`2026-09-${day}T10:00:00Z`)).nextState;
    }
    // longest is now 3. Reset, then climb back up.
    state = updateStreak(state, new Date("2026-09-25T10:00:00Z")).nextState; // streak=1, longest still 3
    state = updateStreak(state, new Date("2026-09-26T10:00:00Z")).nextState; // streak=2
    const third = updateStreak(state, new Date("2026-09-27T10:00:00Z")); // streak=3 — ties, not a new record
    expect(third.isNewRecord).toBe(false);
    const fourth = updateStreak(third.nextState, new Date("2026-09-28T10:00:00Z")); // streak=4 — new record
    expect(fourth.isNewRecord).toBe(true);
  });
});
