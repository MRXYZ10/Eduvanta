import { describe, it, expect } from "vitest";
import { SlidingWindowRateLimiter } from "../rateLimit";

describe("SlidingWindowRateLimiter", () => {
  it("allows requests up to the limit", () => {
    const limiter = new SlidingWindowRateLimiter(3, 1000);
    expect(limiter.check("user1", 0).allowed).toBe(true);
    expect(limiter.check("user1", 10).allowed).toBe(true);
    expect(limiter.check("user1", 20).allowed).toBe(true);
  });

  it("blocks the request that exceeds the limit within the window", () => {
    const limiter = new SlidingWindowRateLimiter(2, 1000);
    limiter.check("user1", 0);
    limiter.check("user1", 10);
    const third = limiter.check("user1", 20);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("allows a request again once the window has fully passed", () => {
    const limiter = new SlidingWindowRateLimiter(1, 1000);
    limiter.check("user1", 0);
    expect(limiter.check("user1", 500).allowed).toBe(false);
    expect(limiter.check("user1", 1500).allowed).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const limiter = new SlidingWindowRateLimiter(1, 1000);
    expect(limiter.check("user1", 0).allowed).toBe(true);
    expect(limiter.check("user2", 0).allowed).toBe(true);
    expect(limiter.check("user1", 10).allowed).toBe(false);
    expect(limiter.check("user2", 10).allowed).toBe(false);
  });

  it("prune removes stale keys but keeps active ones", () => {
    const limiter = new SlidingWindowRateLimiter(5, 1000);
    limiter.check("stale", 0);
    limiter.check("active", 900);
    limiter.prune(1200); // stale's hit at t=0 is now outside the 1000ms window; active's at t=900 is not
    expect(limiter.check("stale", 1200).remaining).toBe(4); // treated as fresh, since its old hit was pruned
    expect(limiter.check("active", 1200).remaining).toBe(3); // its t=900 hit still counts, plus this new one
  });
});
