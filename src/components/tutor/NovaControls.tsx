"use client";

import { useEffect, useMemo, useState } from "react";
import { NOVA_MODES, type NovaMode } from "@/services/nova/modes";

type EntitlementState = {
  plan: string;
  used: number | null;
  limit: number | null;
  remaining: number | null;
};

const MODE_EMOJI: Record<NovaMode, string> = {
  TUTOR: "✨",
  STUDY: "📚",
  PRACTICE: "🎯",
  EXAM: "🎓",
  REVISION: "🔄",
  DOUBT_SOLVER: "💡",
  MATERIAL: "📄",
};

function readNumber(
  value: unknown,
  keys: string[],
): number | null {
  if (!value || typeof value !== "object") return null;

  const obj = value as Record<string, unknown>;

  for (const key of keys) {
    const candidate = obj[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }

  return null;
}

function readText(
  value: unknown,
  keys: string[],
): string | null {
  if (!value || typeof value !== "object") return null;

  const obj = value as Record<string, unknown>;

  for (const key of keys) {
    if (typeof obj[key] === "string" && obj[key]) {
      return obj[key] as string;
    }
  }

  return null;
}

function formatTokens(value: number | null) {
  if (value == null) return "—";
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return String(value);
}

export function NovaControls() {
  const [mode, setMode] = useState<NovaMode>("TUTOR");
  const [entitlement, setEntitlement] = useState<EntitlementState>({
    plan: "Free",
    used: null,
    limit: null,
    remaining: null,
  });

  useEffect(() => {
    const saved = window.localStorage.getItem("eduvanta_nova_mode");

    if (saved && saved in NOVA_MODES) {
      setMode(saved as NovaMode);
      return;
    }

    document.cookie =
      "eduvanta_nova_mode=TUTOR; path=/; max-age=2592000; SameSite=Lax";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadEntitlement() {
      try {
        const res = await fetch("/api/billing/entitlements", {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();

        if (cancelled) return;

        const used =
          readNumber(data, [
            "usedTokens",
            "novaUsedTokens",
            "used",
            "usedThisMonth",
          ]) ??
          readNumber(data?.nova, [
            "usedTokens",
            "used",
            "usedThisMonth",
          ]);

        const limit =
          readNumber(data, [
            "limitTokens",
            "monthlyLimit",
            "novaTokens",
            "quota",
            "limit",
          ]) ??
          readNumber(data?.nova, [
            "limitTokens",
            "monthlyLimit",
            "quota",
            "limit",
          ]);

        const remaining =
          readNumber(data, [
            "remainingTokens",
            "remaining",
          ]) ??
          readNumber(data?.nova, [
            "remainingTokens",
            "remaining",
          ]);

        const plan =
          readText(data, [
            "plan",
            "planName",
            "packageName",
            "tier",
          ]) ??
          readText(data?.package, [
            "name",
          ]) ??
          "Free";

        setEntitlement({
          plan,
          used,
          limit,
          remaining,
        });
      } catch {
        // Keep UI usable even if entitlement refresh fails.
      }
    }

    loadEntitlement();

    const timer = window.setInterval(loadEntitlement, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const progress = useMemo(() => {
    if (
      entitlement.used == null ||
      entitlement.limit == null ||
      entitlement.limit <= 0
    ) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(0, (entitlement.used / entitlement.limit) * 100),
    );
  }, [entitlement]);

  function selectMode(nextMode: NovaMode) {
    setMode(nextMode);

    window.localStorage.setItem(
      "eduvanta_nova_mode",
      nextMode,
    );

    document.cookie =
      `eduvanta_nova_mode=${nextMode}; path=/; max-age=2592000; SameSite=Lax`;
  }

  const activeMode = NOVA_MODES[mode];

  return (
    <section className="mx-auto mb-4 w-full max-w-5xl px-3 sm:px-5">
      <div className="overflow-hidden rounded-3xl border border-line/70 bg-paper/80 shadow-sm backdrop-blur-xl">
        <div className="border-b border-line/60 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">✦</span>
                <h2 className="text-sm font-semibold text-ink">
                  Nova modes
                </h2>
                <span className="rounded-full bg-signal/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-signal">
                  {entitlement.plan}
                </span>
              </div>

              <p className="mt-1 text-[11px] text-ink/45">
                Switch Nova's behavior without leaving the chat.
              </p>
            </div>

            <div className="min-w-[190px]">
              <div className="mb-1.5 flex items-center justify-between text-[10px]">
                <span className="font-medium text-ink/45">
                  Monthly Nova usage
                </span>
                <span className="text-ink/55">
                  {formatTokens(entitlement.used)}
                  {entitlement.limit != null
                    ? ` / ${formatTokens(entitlement.limit)}`
                    : ""}
                </span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full rounded-full bg-cobalt transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {entitlement.remaining != null && (
                <p className="mt-1 text-right text-[9px] text-ink/35">
                  {formatTokens(entitlement.remaining)} remaining
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 lg:grid-cols-7">
          {(Object.keys(NOVA_MODES) as NovaMode[]).map((item) => {
            const selected = item === mode;
            const config = NOVA_MODES[item];

            return (
              <button
                key={item}
                type="button"
                onClick={() => selectMode(item)}
                className={[
                  "group rounded-2xl border px-3 py-3 text-left transition-all",
                  selected
                    ? "border-cobalt/30 bg-cobalt/10 shadow-sm"
                    : "border-line/70 bg-paper hover:-translate-y-0.5 hover:border-cobalt/20 hover:bg-ink/[0.025]",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">
                    {MODE_EMOJI[item]}
                  </span>

                  <span
                    className={[
                      "truncate text-[11px] font-semibold",
                      selected
                        ? "text-cobalt"
                        : "text-ink/70",
                    ].join(" ")}
                  >
                    {config.label}
                  </span>
                </div>

                <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-ink/35">
                  {config.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="border-t border-line/60 bg-ink/[0.015] px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-2 text-[10px]">
            <span>{MODE_EMOJI[mode]}</span>
            <span className="font-semibold text-ink/60">
              {activeMode.label}
            </span>
            <span className="text-ink/35">
              —
            </span>
            <span className="text-ink/40">
              {activeMode.description}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}