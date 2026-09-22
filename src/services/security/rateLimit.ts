/**
 * Per-user sliding-window rate limiter for AI-calling routes — per the
 * product spec's "AI COST CONTROL" ("use... token limits... caching") and
 * "SECURITY" sections, uncapped AI calls per user is both a cost risk and
 * an abuse vector.
 *
 * IMPORTANT — this is in-memory and per-server-instance. It's correct and
 * sufficient for a single-instance deployment or local dev, but a
 * multi-instance production deployment needs a shared store (Redis /
 * Upstash) instead, or one user could get `limit` requests per instance
 * rather than per limit overall. Swapping the storage is a small change:
 * `SlidingWindowRateLimiter` only needs its `hits` Map replaced with a
 * Redis-backed equivalent — the windowing logic itself doesn't change.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms when the oldest hit in the window falls off
}

export class SlidingWindowRateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string, now: number = Date.now()): RateLimitResult {
    const windowStart = now - this.windowMs;
    const existing = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (existing.length >= this.limit) {
      return { allowed: false, remaining: 0, resetAt: existing[0] + this.windowMs };
    }

    existing.push(now);
    this.hits.set(key, existing);
    return { allowed: true, remaining: this.limit - existing.length, resetAt: now + this.windowMs };
  }

  /** Prevents unbounded memory growth from one-off keys (e.g. deleted users) that never get checked again. */
  prune(now: number = Date.now()) {
    for (const [key, timestamps] of this.hits.entries()) {
      const recent = timestamps.filter((t) => t > now - this.windowMs);
      if (recent.length === 0) this.hits.delete(key);
      else this.hits.set(key, recent);
    }
  }
}

// Separate buckets per route category, since a chat message and a 5-question
// AI generation job cost very different amounts — see enforceRateLimit.ts
// for which bucket each route uses.
export const RATE_LIMIT_BUCKETS = {
  aiChat: new SlidingWindowRateLimiter(20, 5 * 60_000), // 20 messages / 5 min
  aiGeneration: new SlidingWindowRateLimiter(10, 60 * 60_000), // 10 generation jobs / hour (each job = up to 5 AI calls)
  aiLightweight: new SlidingWindowRateLimiter(30, 60_000), // practice/exam feedback calls — cheap, frequent, still capped
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMIT_BUCKETS;
