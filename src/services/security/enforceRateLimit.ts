import { NextResponse } from "next/server";
import { RATE_LIMIT_BUCKETS, type RateLimitBucket } from "./rateLimit";

/**
 * Call at the top of any AI-calling route, right after resolving the
 * current user. Returns a ready-to-return 429 response if the user has
 * exceeded that bucket's limit, or null if the request should proceed.
 *
 * const limited = enforceRateLimit(user.id, "aiChat");
 * if (limited) return limited;
 */
export function enforceRateLimit(userId: string, bucket: RateLimitBucket): NextResponse | null {
  const result = RATE_LIMIT_BUCKETS[bucket].check(userId);
  if (result.allowed) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: "You're sending requests a bit too fast — try again in a moment." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
