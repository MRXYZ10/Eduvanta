/**
 * Structured logging for AI latency, AI errors, and API errors — per the
 * product spec's "OBSERVABILITY" section. Output is JSON to
 * console.log/console.error rather than a third-party service, because
 * no external logging provider is guaranteed to be configured — every
 * major host (Vercel included) captures stdout/stderr into its own log
 * viewer automatically, so this is a real, usable implementation, not a
 * stub. See DEPLOYMENT.md for what a fuller observability setup
 * (aggregation, dashboards, alerting) would add on top of this.
 *
 * Never logs message content, email addresses, or other PII — see the
 * field allowlist in LogFields below. A userId is logged for
 * correlation (grouping a user's events together), which is standard
 * practice and not itself sensitive in the way message content is.
 */

export type LogLevel = "info" | "warn" | "error";

interface LogFields {
  event: string;
  level?: LogLevel;
  userId?: string;
  route?: string;
  provider?: string;
  model?: string;
  durationMs?: number;
  statusCode?: number;
  errorMessage?: string;
  retryable?: boolean;
}

export function log(fields: LogFields): void {
  const level = fields.level ?? "info";
  const { level: _omit, ...rest } = fields; // level is added back explicitly below, in a fixed position
  void _omit;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    ...rest,
  };
  const output = JSON.stringify(entry); // JSON.stringify drops undefined-valued keys automatically

  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
}

/** Call around every AI provider call — see services/ai/factory.ts. */
export function logAiCall(fields: {
  provider: string;
  model?: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  retryable?: boolean;
}): void {
  log({
    event: "ai_call",
    level: fields.success ? "info" : "error",
    provider: fields.provider,
    model: fields.model,
    durationMs: fields.durationMs,
    errorMessage: fields.errorMessage,
    retryable: fields.retryable,
  });
}

/** Call from a route's catch block for an unexpected failure. */
export function logApiError(fields: { route: string; errorMessage: string; statusCode?: number; userId?: string }): void {
  log({
    event: "api_error",
    level: "error",
    route: fields.route,
    errorMessage: fields.errorMessage,
    statusCode: fields.statusCode,
    userId: fields.userId,
  });
}
