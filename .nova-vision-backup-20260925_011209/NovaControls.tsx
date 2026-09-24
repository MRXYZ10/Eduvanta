"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  GraduationCap,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import type { NovaMode } from "@/services/nova/modes";

interface EntitlementResponse {
  plan: {
    name: string;
    paid: boolean;
  };
  nova: {
    planName: string;
    paid: boolean;
    quota: number;
    usedTokens: number;
    remainingTokens: number;
    resetAt: string;
    modes: NovaMode[];
  };
}

const ICONS = {
  TUTOR: Sparkles,
  STUDY: BookOpen,
  PRACTICE: Target,
  EXAM: GraduationCap,
  REVISION: RefreshCw,
  DOUBT_SOLVER: Lightbulb,
  MATERIAL: FileText,
} as const;

const MODE_LABELS: Record<NovaMode, string> = {
  TUTOR: "Tutor",
  STUDY: "Study",
  PRACTICE: "Practice",
  EXAM: "Exam",
  REVISION: "Revision",
  DOUBT_SOLVER: "Doubt Solver",
  MATERIAL: "Material Chat",
};

const MODE_DESCRIPTIONS: Record<NovaMode, string> = {
  TUTOR: "General doubts",
  STUDY: "Step-by-step learning",
  PRACTICE: "Hints and practice",
  EXAM: "Exam focused",
  REVISION: "Rapid revision",
  DOUBT_SOLVER: "Deep problem solving",
  MATERIAL: "Uploaded material",
};

const ALL_MODES = Object.keys(MODE_LABELS) as NovaMode[];

export function NovaControls() {
  const [data, setData] = useState<EntitlementResponse | null>(null);
  const [mode, setMode] = useState<NovaMode>("TUTOR");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const response = await fetch("/api/billing/entitlements", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const body = (await response.json()) as EntitlementResponse;
      setData(body);

      const stored = window.localStorage.getItem("eduvanta_nova_mode");

      if (
        stored &&
        ALL_MODES.includes(stored as NovaMode) &&
        body.nova.modes.includes(stored as NovaMode)
      ) {
        setMode(stored as NovaMode);
        return;
      }

      const firstAllowed = body.nova.modes[0] ?? "TUTOR";
      setMode(firstAllowed);
      window.localStorage.setItem("eduvanta_nova_mode", firstAllowed);
      document.cookie = `eduvanta_nova_mode=${firstAllowed}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // UI remains usable even if billing fetch is temporarily unavailable.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  function changeMode(nextMode: NovaMode) {
    setMode(nextMode);
    window.localStorage.setItem("eduvanta_nova_mode", nextMode);
    document.cookie = `eduvanta_nova_mode=${nextMode}; path=/; max-age=31536000; samesite=lax`;

    window.dispatchEvent(
      new CustomEvent("eduvanta:nova-mode-change", {
        detail: nextMode,
      }),
    );
  }

  const quota = data?.nova.quota ?? 0;
  const used = data?.nova.usedTokens ?? 0;
  const remaining = data?.nova.remainingTokens ?? 0;

  const percent = quota > 0
    ? Math.min(100, Math.round((used / quota) * 100))
    : 0;

  const resetDate = data?.nova.resetAt
    ? new Date(data.nova.resetAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "next cycle";

  const ActiveIcon = ICONS[mode];

  return (
    <section className="mb-6 overflow-hidden rounded-[2rem] border border-line/70 bg-paper/70 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cobalt-soft text-cobalt">
              <ActiveIcon className="h-4 w-4" />
            </span>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/40">
                Nova mode
              </p>
              <p className="text-sm font-semibold text-ink">
                {loading ? "Loading..." : MODE_LABELS[mode]}
              </p>
            </div>
          </div>

          <p className="mt-2 text-xs text-ink/50">
            {MODE_DESCRIPTIONS[mode]}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:max-w-xl">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ALL_MODES.map((item) => {
              const allowed = data?.nova.modes.includes(item) ?? true;
              const Icon = ICONS[item];

              return (
                <button
                  key={item}
                  type="button"
                  disabled={!allowed}
                  onClick={() => changeMode(item)}
                  className={`flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left transition ${
                    mode === item
                      ? "border-cobalt bg-cobalt-soft text-cobalt"
                      : allowed
                        ? "border-line/70 bg-paper/40 text-ink/65 hover:border-cobalt/30 hover:bg-cobalt-soft/30"
                        : "cursor-not-allowed border-line/40 bg-ink/[0.02] text-ink/25"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate text-[11px] font-medium">
                    {MODE_LABELS[item]}
                  </span>
                </button>
              );
            })}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="font-medium text-ink/55">
                {data?.nova.planName ?? "Free"} · Nova usage
              </span>
              <span className="font-semibold text-ink/65">
                {remaining.toLocaleString("en-IN")} left
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-ink/5">
              <div
                className={`h-full rounded-full transition-all ${
                  percent >= 90
                    ? "bg-mastery-attention"
                    : "bg-cobalt"
                }`}
                style={{ width: `${Math.max(2, percent)}%` }}
              />
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[10px] text-ink/35">
              <span>
                {used.toLocaleString("en-IN")} / {quota.toLocaleString("en-IN")} tokens
              </span>
              <span>resets {resetDate}</span>
            </div>
          </div>
        </div>

        {!data?.nova.paid && (
          <Link
            href="/packages"
            className="shrink-0 rounded-full bg-ink px-4 py-2 text-center text-xs font-semibold text-white transition hover:opacity-90"
          >
            Upgrade
          </Link>
        )}
      </div>
    </section>
  );
}