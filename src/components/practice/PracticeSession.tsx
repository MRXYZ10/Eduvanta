"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import type { AdaptiveState } from "@/services/practice/adaptiveDifficulty";

interface Option {
  id: string;
  label: string;
}

interface Question {
  id: string;
  prompt: string;
  type: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  options: Option[];
}

interface SubmitResult {
  isCorrect: boolean;
  feedback: {
    explanation: string;
    mistake_type: string;
    next_action: string;
  };
  adaptive: { nextDifficulty: string; action: string; reason: string };
  mastery: { score: number; band: string; trend: number };
}

const DIFFICULTY_LABEL: Record<string, string> = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" };

export function PracticeSession({
  topicId,
  attemptId,
  onAnswered,
}: {
  topicId: string;
  attemptId: string;
  /** Optional — lets an embedding parent (e.g. Focus Mode) observe each
   *  answered question without PracticeSession needing to know anything
   *  about who's listening or why. */
  onAnswered?: (correct: boolean) => void;
}) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [adaptiveState, setAdaptiveState] = useState<AdaptiveState>({
    currentDifficulty: "MEDIUM",
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    sameConceptMisses: 0,
  });

  const fetchNext = useCallback(
    async (difficulty: string, excludeIds: string[]) => {
      setLoading(true);
      setError(null);
      setResult(null);
      setSelectedOptionId(null);
      try {
        const res = await fetch("/api/practice/next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId, difficulty, excludeIds }),
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error ?? "Couldn't load the next question.");
        }
        const body = await res.json();
        setQuestion(body.question);
        setStartedAt(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong loading your next question.");
      } finally {
        setLoading(false);
      }
    },
    [topicId],
  );

  useEffect(() => {
    fetchNext(adaptiveState.currentDifficulty, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (!question || selectedOptionId == null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/practice/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId: question.id,
          studentAnswer: { optionLabel: question.options.find((o) => o.id === selectedOptionId)?.label },
          timeTakenMs: Date.now() - startedAt,
          adaptiveState,
        }),
      });
      if (!res.ok) throw new Error("Nova couldn't grade that just now.");
      const body: SubmitResult = await res.json();
      setResult(body);
      onAnswered?.(body.isCorrect);
      setAdaptiveState((prev) => ({
        ...prev,
        currentDifficulty: body.adaptive.nextDifficulty as AdaptiveState["currentDifficulty"],
      }));
      setSeenIds((prev) => [...prev, question.id]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nova couldn't connect right now.");
    } finally {
      setLoading(false);
    }
  }

  function next() {
    fetchNext(adaptiveState.currentDifficulty, [...seenIds]);
  }

  if (error && !question) {
    return <ErrorState message={error} onRetry={() => fetchNext(adaptiveState.currentDifficulty, seenIds)} />;
  }

  if (!question) {
    return <div className="animate-pulse rounded-lg border border-line px-4 py-10 text-center text-sm text-ink/40">Loading question…</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs text-ink/50">
        <span>{DIFFICULTY_LABEL[question.difficulty]}</span>
        <span>Question {seenIds.length + 1}</span>
      </div>

      <div className="rounded-lg border border-line px-5 py-6">
        <p className="text-lg leading-relaxed">{question.prompt}</p>

        <div className="mt-5 space-y-2">
          {question.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => !result && setSelectedOptionId(opt.id)}
                disabled={!!result}
                className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                  isSelected ? "border-cobalt bg-cobalt-soft" : "border-line hover:bg-ink/5"
                } disabled:cursor-default`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-mastery-attention">{error}</p>}

      {!result ? (
        <Button onClick={submit} disabled={selectedOptionId == null || loading}>
          {loading ? "Checking…" : "Submit answer"}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-signal/30 bg-signal-soft px-4 py-4">
            <p className="text-sm font-medium">
              {result.isCorrect ? "Correct." : "Not quite."}
            </p>
            <p className="mt-1 text-sm text-ink/70">{result.feedback.explanation}</p>
            <p className="mt-2 text-xs text-ink/50">{result.adaptive.reason}</p>
          </div>
          <Button onClick={next} disabled={loading}>
            Next question
          </Button>
        </div>
      )}
    </div>
  );
}
