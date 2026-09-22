import { Sparkles } from "lucide-react";

/**
 * These reuse the exact same classNames/tokens as the real pages they
 * represent (compare to components/dashboard/*, components/practice/*,
 * components/tutor/*) — small, non-interactive, but visually identical to
 * the actual product, per the spec's "show actual product UI rather than
 * generic marketing illustrations" instruction. Not screenshots (no
 * running server to capture from), but not invented illustration style
 * either — the same cards, badges, and colors a signed-in user sees.
 */

export function TutorMockup() {
  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <div className="mb-2 flex justify-end">
        <div className="max-w-[75%] rounded-lg bg-cobalt px-3 py-2 text-xs text-white">
          Why was I wrong on this one?
        </div>
      </div>
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-lg bg-signal-soft px-3 py-2 text-xs text-ink">
          You applied f before g — composition means g first, then f. Since you're strong on Sets already, this is
          just an order-of-operations slip, not a concept gap.
        </div>
      </div>
    </div>
  );
}

export function PracticeMockup() {
  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <div className="mb-2 flex items-center justify-between text-[10px] text-ink/50">
        <span>Medium</span>
        <span>Question 3</span>
      </div>
      <p className="mb-3 text-xs leading-relaxed">If f(x) = 2x − 1 and g(x) = f(f(x)), what is g(3)?</p>
      <div className="space-y-1.5">
        <div className="rounded-md border border-cobalt bg-cobalt-soft px-2.5 py-1.5 text-xs">9</div>
        <div className="rounded-md border border-line px-2.5 py-1.5 text-xs text-ink/60">5</div>
      </div>
    </div>
  );
}

export function LearningIntelligenceMockup() {
  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="font-serif text-lg">64%</div>
          <div className="text-[10px] text-ink/50">Mastery</div>
        </div>
        <div>
          <div className="font-serif text-lg">58%</div>
          <div className="text-[10px] text-ink/50">Readiness</div>
        </div>
        <div>
          <div className="font-serif text-lg">+4.2%</div>
          <div className="text-[10px] text-ink/50">This week</div>
        </div>
      </div>
    </div>
  );
}

export function MistakeVaultMockup() {
  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium">Function composition</p>
          <p className="text-[10px] text-ink/50">Conceptual · ×3</p>
        </div>
      </div>
      <div className="inline-flex items-center gap-1.5 rounded-md bg-signal px-2.5 py-1 text-[10px] text-white">
        <Sparkles className="h-2.5 w-2.5" strokeWidth={2} />
        Let's fix it
      </div>
    </div>
  );
}

export function ExamReadinessMockup() {
  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <span className="font-medium text-mastery-strong">Strong</span>
          <p className="mt-1 text-ink/50">Sets, Logic</p>
        </div>
        <div>
          <span className="font-medium text-mastery-developing">Developing</span>
          <p className="mt-1 text-ink/50">Relations</p>
        </div>
        <div>
          <span className="font-medium text-mastery-attention">Weak</span>
          <p className="mt-1 text-ink/50">Functions</p>
        </div>
      </div>
    </div>
  );
}

export function StudyPlannerMockup() {
  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <div className="divide-y divide-line">
        <div className="flex items-center gap-3 py-1.5">
          <span className="font-serif text-sm text-ink/40">1</span>
          <div className="flex-1">
            <div className="text-xs font-medium">Review Functions</div>
            <div className="text-[10px] text-ink/50">15 min</div>
          </div>
        </div>
        <div className="flex items-center gap-3 py-1.5">
          <span className="font-serif text-sm text-ink/40">2</span>
          <div className="flex-1">
            <div className="text-xs font-medium">Adaptive Practice</div>
            <div className="text-[10px] text-ink/50">20 min</div>
          </div>
        </div>
      </div>
    </div>
  );
}
