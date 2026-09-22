export type Difficulty = "EASY" | "MEDIUM" | "HARD";

const LADDER: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export interface AdaptiveState {
  currentDifficulty: Difficulty;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  /** How many times the *same concept* has been missed recently — drives
   *  "repeated wrong -> reduce difficulty + teach concept" specifically,
   *  separate from a normal cold streak. */
  sameConceptMisses: number;
}

export interface AdaptiveEvent {
  isCorrect: boolean;
  timeTakenMs: number;
  expectedTimeMs: number;
  sameConceptAsLast: boolean;
}

export interface AdaptiveDecision {
  nextDifficulty: Difficulty;
  nextState: AdaptiveState;
  action: "increase_difficulty" | "hold" | "decrease_difficulty" | "teach_concept";
  reason: string;
}

function step(current: Difficulty, delta: number): Difficulty {
  const idx = LADDER.indexOf(current);
  const next = Math.max(0, Math.min(LADDER.length - 1, idx + delta));
  return LADDER[next];
}

/**
 * Pure function — no I/O — so it's directly unit-testable and reusable from
 * both the practice API route and any future batch re-scoring job.
 *
 * Rules (per product spec):
 *  - correct + fast          -> increase difficulty
 *  - correct + slow          -> hold
 *  - wrong                   -> analyze misconception (caller does this via
 *                               mistake service); difficulty holds for one miss
 *  - repeated wrong (same concept, 2+ in a row) -> decrease difficulty + teach
 *  - consistent success (3+ correct in a row)   -> increase difficulty
 */
export function decideNextDifficulty(state: AdaptiveState, event: AdaptiveEvent): AdaptiveDecision {
  const isFast = event.timeTakenMs <= event.expectedTimeMs * 0.9;

  if (event.isCorrect) {
    const consecutiveCorrect = state.consecutiveCorrect + 1;
    const nextState: AdaptiveState = {
      currentDifficulty: state.currentDifficulty,
      consecutiveCorrect,
      consecutiveWrong: 0,
      sameConceptMisses: 0,
    };

    if (isFast || consecutiveCorrect >= 3) {
      const nextDifficulty = step(state.currentDifficulty, 1);
      nextState.currentDifficulty = nextDifficulty;
      return {
        nextDifficulty,
        nextState,
        action: "increase_difficulty",
        reason: isFast ? "Correct and fast" : "Consistent success (3+ in a row)",
      };
    }

    return {
      nextDifficulty: state.currentDifficulty,
      nextState,
      action: "hold",
      reason: "Correct but not fast — holding steady",
    };
  }

  // Wrong answer
  const sameConceptMisses = event.sameConceptAsLast ? state.sameConceptMisses + 1 : 1;
  const nextState: AdaptiveState = {
    currentDifficulty: state.currentDifficulty,
    consecutiveCorrect: 0,
    consecutiveWrong: state.consecutiveWrong + 1,
    sameConceptMisses,
  };

  if (sameConceptMisses >= 2) {
    const nextDifficulty = step(state.currentDifficulty, -1);
    nextState.currentDifficulty = nextDifficulty;
    return {
      nextDifficulty,
      nextState,
      action: "teach_concept",
      reason: "Repeated mistake on the same concept — reducing difficulty and teaching",
    };
  }

  return {
    nextDifficulty: state.currentDifficulty,
    nextState,
    action: "hold",
    reason: "Wrong answer — analyzing misconception before adjusting difficulty",
  };
}
