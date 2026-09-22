function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-2xl font-serif">{value}</div>
      <div className="text-xs text-ink/60">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-ink/40">{hint}</div>}
    </div>
  );
}

interface ReadinessBreakdown {
  strong: string[];
  developing: string[];
  weak: string[];
}

function ReadinessBreakdownRow({ breakdown }: { breakdown: ReadinessBreakdown }) {
  const hasAny = breakdown.strong.length || breakdown.developing.length || breakdown.weak.length;
  if (!hasAny) return null;

  return (
    <div className="grid grid-cols-3 gap-4 border-t border-line px-4 py-3 text-xs">
      <div>
        <span className="font-medium text-mastery-strong">Strong</span>
        <p className="mt-1 text-ink/60">{breakdown.strong.join(", ") || "—"}</p>
      </div>
      <div>
        <span className="font-medium text-mastery-developing">Developing</span>
        <p className="mt-1 text-ink/60">{breakdown.developing.join(", ") || "—"}</p>
      </div>
      <div>
        <span className="font-medium text-mastery-attention">Weak</span>
        <p className="mt-1 text-ink/60">{breakdown.weak.join(", ") || "—"}</p>
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
    <div>
      <h2 className="mb-3 text-base font-medium text-ink/80">Learning intelligence</h2>
      <div className="rounded-lg border border-line">
        <div className="grid grid-cols-3 gap-4 px-4 py-4">
          <Stat label="Overall mastery" value={`${overallMastery}%`} />
          <Stat
            label="Exam readiness"
            value={`${examReadiness}%`}
            hint="Internal indicator, not a guarantee"
          />
          <Stat
            label="This week"
            value={`${weeklyImprovement >= 0 ? "+" : ""}${weeklyImprovement}%`}
          />
        </div>
        {examReadinessBreakdown && <ReadinessBreakdownRow breakdown={examReadinessBreakdown} />}
      </div>
    </div>
  );
}
