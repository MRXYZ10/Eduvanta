import { describe, it, expect, vi, afterEach } from "vitest";
import { log, logAiCall, logApiError } from "../logger";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("log", () => {
  it("emits valid JSON to console.log for info level", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log({ event: "test_event", level: "info", userId: "u1" });
    expect(spy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.event).toBe("test_event");
    expect(parsed.level).toBe("info");
    expect(parsed.userId).toBe("u1");
    expect(typeof parsed.timestamp).toBe("string");
  });

  it("routes error level to console.error, not console.log", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    log({ event: "test_event", level: "error", errorMessage: "boom" });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("never includes undefined-valued fields in the emitted JSON", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log({ event: "test_event", level: "info" }); // userId, route, etc. all omitted
    const raw = spy.mock.calls[0][0] as string;
    expect(raw).not.toContain("undefined");
    const parsed = JSON.parse(raw);
    expect("userId" in parsed).toBe(false);
  });

  it("defaults to info level when none is given", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log({ event: "test_event" });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("info");
  });
});

describe("logAiCall", () => {
  it("logs a successful call at info level with provider/model/duration", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logAiCall({ provider: "anthropic", model: "claude-sonnet-5", durationMs: 500, success: true });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("info");
    expect(parsed.event).toBe("ai_call");
    expect(parsed.provider).toBe("anthropic");
  });

  it("logs a failed call at error level with the error message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logAiCall({ provider: "openai", durationMs: 1200, success: false, errorMessage: "rate limited", retryable: true });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("error");
    expect(parsed.errorMessage).toBe("rate limited");
    expect(parsed.retryable).toBe(true);
  });
});

describe("logApiError", () => {
  it("always logs at error level", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logApiError({ route: "/api/test", errorMessage: "failure" });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("error");
    expect(parsed.event).toBe("api_error");
    expect(parsed.route).toBe("/api/test");
  });
});
