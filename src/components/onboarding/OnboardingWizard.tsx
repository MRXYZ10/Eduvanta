"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Sparkles } from "lucide-react";

interface SubjectOption {
  id: string;
  name: string;
  examGoal: string | null;
}

const EXAM_GOALS = ["College", "JEE", "NEET", "School", "Competitive Exam", "Self Learning", "Other"] as const;
const LEVELS = [
  { value: "beginner", label: "Just starting out" },
  { value: "intermediate", label: "Comfortable with the basics" },
  { value: "advanced", label: "Sharpening for the exam" },
] as const;
const DIFFICULTIES = [
  { value: "adaptive", label: "Adaptive — let Nova decide" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

interface FormState {
  examGoal: (typeof EXAM_GOALS)[number] | null;
  subjectIds: string[];
  currentLevel: (typeof LEVELS)[number]["value"] | null;
  targetExamDate: string;
  dailyStudyMinutes: number;
  learningGoal: string;
  preferredDifficulty: (typeof DIFFICULTIES)[number]["value"] | null;
}

const TOTAL_STEPS = 7;

export function OnboardingWizard({ subjects }: { subjects: SubjectOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sessionCount: number; rationale: string } | "done" | null>(null);
  const [form, setForm] = useState<FormState>({
    examGoal: null,
    subjectIds: [],
    currentLevel: null,
    targetExamDate: "",
    dailyStudyMinutes: 60,
    learningGoal: "",
    preferredDifficulty: "adaptive",
  });

  function toggleSubject(id: string) {
    setForm((f) => ({
      ...f,
      subjectIds: f.subjectIds.includes(id) ? f.subjectIds.filter((x) => x !== id) : [...f.subjectIds, id],
    }));
  }

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return form.examGoal != null;
      case 1:
        return form.subjectIds.length > 0;
      case 2:
        return form.currentLevel != null;
      case 3:
        return form.examGoal === "Self Learning" || form.targetExamDate !== "";
      case 4:
        return form.dailyStudyMinutes >= 10;
      case 5:
        return true; // learning goal is optional
      case 6:
        return form.preferredDifficulty != null;
      default:
        return false;
    }
  }

  async function finish() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examGoal: form.examGoal,
          subjectIds: form.subjectIds,
          currentLevel: form.currentLevel,
          targetExamDate: form.targetExamDate || undefined,
          dailyStudyMinutes: form.dailyStudyMinutes,
          learningGoal: form.learningGoal || undefined,
          preferredDifficulty: form.preferredDifficulty,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong finishing setup.");
      // planSummary can legitimately be null (e.g. no plannable topics),
      // in which case we still confirm success rather than leaving the
      // wizard looking stuck on its last step.
      setResult(body.planSummary ?? "done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const hasPlan = result !== "done";
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center">
        <Sparkles className="h-8 w-8 text-signal" strokeWidth={1.5} />
        <h1 className="text-2xl">{hasPlan ? "Your plan is ready" : "You're all set"}</h1>
        {hasPlan && (
          <>
            <p className="rounded-lg bg-signal-soft px-4 py-3 text-sm text-ink/80">{result.rationale}</p>
            <p className="text-sm text-ink/50">{result.sessionCount} sessions scheduled to start.</p>
          </>
        )}
        <Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-cobalt" : "bg-line"}`} />
        ))}
      </div>

      {step === 0 && (
        <Step title="What are you preparing for?">
          <div className="grid grid-cols-2 gap-2">
            {EXAM_GOALS.map((g) => (
              <ChoiceButton key={g} selected={form.examGoal === g} onClick={() => setForm((f) => ({ ...f, examGoal: g }))}>
                {g}
              </ChoiceButton>
            ))}
          </div>
        </Step>
      )}

      {step === 1 && (
        <Step title="Which subjects?" subtitle="Pick as many as you're working on right now.">
          <div className="flex flex-wrap gap-2">
            {subjects.filter((s) => s.examGoal === form.examGoal || form.examGoal === "Other" || form.examGoal === "Self Learning").map((s) => (
              <ChoiceButton key={s.id} selected={form.subjectIds.includes(s.id)} onClick={() => toggleSubject(s.id)} pill>
                {s.name}
              </ChoiceButton>
            ))}
          </div>
        </Step>
      )}

      {step === 2 && (
        <Step title="Where are you starting from?">
          <div className="flex flex-col gap-2">
            {LEVELS.map((l) => (
              <ChoiceButton
                key={l.value}
                selected={form.currentLevel === l.value}
                onClick={() => setForm((f) => ({ ...f, currentLevel: l.value }))}
                full
              >
                {l.label}
              </ChoiceButton>
            ))}
          </div>
        </Step>
      )}

      {step === 3 && (
        <Step
          title={form.examGoal === "Self Learning" ? "Any target date in mind?" : "When's your exam?"}
          subtitle={form.examGoal === "Self Learning" ? "Optional — you can skip this." : undefined}
        >
          <input
            type="date"
            value={form.targetExamDate}
            onChange={(e) => setForm((f) => ({ ...f, targetExamDate: e.target.value }))}
            className="w-full rounded-md border border-line px-3 py-2.5 text-sm"
          />
        </Step>
      )}

      {step === 4 && (
        <Step title="How much time can you study daily?">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={15}
              max={240}
              step={15}
              value={form.dailyStudyMinutes}
              onChange={(e) => setForm((f) => ({ ...f, dailyStudyMinutes: Number(e.target.value) }))}
              className="flex-1"
            />
            <span className="w-16 text-right text-sm font-medium">{form.dailyStudyMinutes} min</span>
          </div>
        </Step>
      )}

      {step === 5 && (
        <Step title="What's your learning goal?" subtitle="Optional — a sentence is enough.">
          <textarea
            value={form.learningGoal}
            onChange={(e) => setForm((f) => ({ ...f, learningGoal: e.target.value }))}
            rows={3}
            placeholder="e.g. Build strong fundamentals before mock tests start"
            className="w-full resize-none rounded-md border border-line px-3 py-2.5 text-sm"
          />
        </Step>
      )}

      {step === 6 && (
        <Step title="Preferred difficulty?" subtitle="You can change this anytime.">
          <div className="flex flex-col gap-2">
            {DIFFICULTIES.map((d) => (
              <ChoiceButton
                key={d.value}
                selected={form.preferredDifficulty === d.value}
                onClick={() => setForm((f) => ({ ...f, preferredDifficulty: d.value }))}
                full
              >
                {d.label}
              </ChoiceButton>
            ))}
          </div>
        </Step>
      )}

      {error && <p className="mt-4 text-sm text-mastery-attention">{error}</p>}

      <div className="mt-8 flex justify-between">
        <Button variant="quiet" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        {step < TOTAL_STEPS - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
            Next
          </Button>
        ) : (
          <Button onClick={finish} disabled={!canAdvance() || submitting}>
            {submitting ? "Building your plan…" : "Finish"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="mb-1 text-xl">{title}</h1>
      {subtitle && <p className="mb-5 text-sm text-ink/50">{subtitle}</p>}
      {!subtitle && <div className="mb-5" />}
      {children}
    </div>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
  full,
  pill,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  full?: boolean;
  pill?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`${full ? "w-full text-left" : ""} ${pill ? "rounded-full" : "rounded-md"} border px-4 py-2.5 text-sm transition-colors ${
        selected ? "border-cobalt bg-cobalt-soft text-ink" : "border-line text-ink/75 hover:bg-ink/5"
      }`}
    >
      {children}
    </button>
  );
}



