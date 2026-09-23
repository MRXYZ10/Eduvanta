function Stat({
  label,
  value,
  hint,
  accent = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "default" | "cobalt" | "signal" | "green";
}) {
  const accentClass = {
    default: "bg-ink/5 text-ink",
    cobalt: "bg-cobalt-soft text-cobalt",
    signal: "bg-signal-soft text-signal",
    green: "bg-mastery-mastered/10 text-mastery-mastered",
  }[accent];

  return (
    <div className="rounded-2xl border border-line/60 bg-paper/50 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-[0.08em] text-ink/50">
          {label}
        </div>
        <div className={`h-2.5 w-2.5 rounded-full ${accentClass}`} />
      </div>

      <div className="text-3xl font-serif tracking-tight text-ink">
        {value}
      </div>

      {hint && (
        <div className="mt-1.5 text-xs leading-relaxed text-ink/45">
          {hint}
        </div>
      )}
    </div>
  );
}

interface ReadinessBreakdown {
  strong: string[];
  developing: string[];
  weak: string[];
}

function ReadinessBreakdownRow({
  breakdown,
}: {
  breakdown: ReadinessBreakdown;
}) {
  const hasAny =
    breakdown.strong.length ||
    breakdown.developing.length ||
    breakdown.weak.length;

  if (!hasAny) return null;

  return (
    <div className="border-t border-line/60 px-5 py-5">
      <div className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-ink/45">
        Readiness breakdown
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-mastery-strong/5 p-3">
          <span className="text-xs font-semibold text-mastery-strong">
            Strong
          </span>
          <p className="mt-1.5 text-xs leading-relaxed text-ink/60">
            {breakdown.strong.join(", ") || "—"}
          </p>
        </div>

        <div className="rounded-xl bg-mastery-developing/5 p-3">
          <span className="text-xs font-semibold text-mastery-developing">
            Developing
          </span>
          <p className="mt-1.5 text-xs leading-relaxed text-ink/60">
            {breakdown.developing.join(", ") || "—"}
          </p>
        </div>

        <div className="rounded-xl bg-mastery-attention/5 p-3">
          <span className="text-xs font-semibold text-mastery-attention">
            Needs attention
          </span>
          <p className="mt-1.5 text-xs leading-relaxed text-ink/60">
            {breakdown.weak.join(", ") || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LearningIntelligence({
  overallMastery,
  examReadiness,
  examReadinessBreakdown,
  weeklyImprovement,
}: {
  overallMastery: number;
  examReadiness: number;
  examReadinessBreakdown?: ReadinessBreakdown;
  weeklyImprovement: number;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-ink/85">
            Learning intelligence
          </h2>
          <p className="mt-1 text-xs text-ink/45">
            A quick snapshot of your current progress.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-line/70 bg-paper/60 p-2 shadow-sm">
        <div className="grid gap-2 md:grid-cols-3">
          <Stat
            label="Overall mastery"
            value={`${overallMastery}%`}
            accent="cobalt"
          />

          <Stat
            label="Exam readiness"
            value={`${examReadiness}%`}
            hint="Internal indicator, not a guarantee"
            accent="signal"
          />

          <Stat
            label="This week"
            value={`${weeklyImprovement >= 0 ? "+" : ""}${weeklyImprovement}%`}
            accent="green"
          />
        </div>

        {examReadinessBreakdown && (
          <ReadinessBreakdownRow breakdown={examReadinessBreakdown} />
        )}
      </div>
    </section>
  );
}