"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PracticeSession } from "@/components/practice/PracticeSession";
import { Sparkles } from "lucide-react";

interface TopicOption {
  id: string;
  name: string;
}

const DURATIONS = [25, 45, 60] as const;

type Phase = "setup" | "active" | "summary";

interface Summary {
  questionCount: number;
  correctCount: number;
  accuracy: number;
  totalTimeMs: number;
  conceptImprovement: { topicName: string; score: number; trend: number } | null;
  nextRecommendation: { title: string; actionLabel: string; actionHref: string } | null;
}

export function FocusSession({ topics }: { topics: TopicOption[] }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [topicId, setTopicId] = useState(topics[0]?.id ?? "");
  const [duration, setDuration] = useState<number>(25);
  const [customDuration, setCustomDuration] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [remainingSec, setRemainingSec] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endingRef = useRef(false);

  const activeDuration = customDuration ? Number(customDuration) : duration;

  async function start() {
    if (!topicId) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/practice/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't start a focus session.");
      setAttemptId(body.attemptId);
      setRemainingSec(activeDuration * 60);
      setAnsweredCount(0);
      setCorrectCount(0);
      setPhase("active");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setStarting(false);
    }
  }

  const end = useCallback(async () => {
    if (!attemptId || endingRef.current) return;
    endingRef.current = true;
    try {
      const res = await fetch("/api/practice/end-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const body = await res.json();
      if (res.ok) setSummary(body.summary);
      setPhase("summary");
    } finally {
      endingRef.current = false;
    }
  }, [attemptId]);

  useEffect(() => {
    if (phase !== "active") return;
    const interval = setInterval(() => {
      setRemainingSec((s) => {
        if (s <= 1) {
          clearInterval(interval);
          end();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, end]);

  function restart() {
    setPhase("setup");
    setAttemptId(null);
    setSummary(null);
  }

  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-md py-10">
        <h1 className="mb-1 text-2xl">Focus Mode</h1>
        <p className="mb-6 text-sm text-ink/60">A distraction-free block of adaptive practice.</p>

        <div className="mb-5">
          <p className="mb-2 text-sm font-medium">Topic</p>
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <button
                key={t.id}
                onClick={() => setTopicId(t.id)}
                className={`rounded-full border px-3 py-1.5 text-xs ${topicId === t.id ? "border-cobalt bg-cobalt-soft" : "border-line text-ink/70"}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-sm font-medium">Duration</p>
          <div className="flex flex-wrap items-center gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => { setDuration(d); setCustomDuration(""); }}
                className={`rounded-full border px-3 py-1.5 text-xs ${duration === d && !customDuration ? "border-cobalt bg-cobalt-soft" : "border-line text-ink/70"}`}
              >
                {d} min
              </button>
            ))}
            <input
              type="number"
              min={5}
              max={180}
              placeholder="Custom"
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              className="w-20 rounded-full border border-line px-3 py-1.5 text-xs"
            />
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-mastery-attention">{error}</p>}
        <Button onClick={start} disabled={starting || !topicId}>
          {starting ? "Starting…" : "Start focus session"}
        </Button>
      </div>
    );
  }

  if (phase === "active" && attemptId) {
    const minutes = Math.floor(remainingSec / 60);
    const seconds = remainingSec % 60;
    return (
      <div className="mx-auto max-w-2xl py-6">
        <div className="mb-4 flex items-center justify-between rounded-lg border border-line px-4 py-3">
          <span className="text-sm text-ink/60">{answeredCount} answered · {correctCount} correct</span>
          <span className="font-mono text-lg">{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
          <div className="flex gap-2">
            <Link href="/tutor">
              <Button variant="quiet">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                AI help
              </Button>
            </Link>
            <Button variant="quiet" onClick={end}>End session</Button>
          </div>
        </div>
        <PracticeSession
          topicId={topicId}
          attemptId={attemptId}
          onAnswered={(correct) => {
            setAnsweredCount((c) => c + 1);
            if (correct) setCorrectCount((c) => c + 1);
          }}
        />
      </div>
    );
  }

  // summary
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <h1 className="mb-6 text-2xl">Session complete</h1>
      {summary ? (
        <>
          <div className="mb-6 grid grid-cols-3 gap-4 rounded-lg border border-line px-4 py-4 text-left">
            <div>
              <div className="text-2xl font-serif">{Math.round(summary.totalTimeMs / 60000)}m</div>
              <div className="text-xs text-ink/60">Time</div>
            </div>
            <div>
              <div className="text-2xl font-serif">{summary.questionCount}</div>
              <div className="text-xs text-ink/60">Questions</div>
            </div>
            <div>
              <div className="text-2xl font-serif">{summary.accuracy}%</div>
              <div className="text-xs text-ink/60">Accuracy</div>
            </div>
          </div>

          {summary.conceptImprovement && (
            <p className="mb-4 text-sm text-ink/70">
              {summary.conceptImprovement.topicName}: {summary.conceptImprovement.score}%
              {summary.conceptImprovement.trend !== 0 && (
                <span className={summary.conceptImprovement.trend > 0 ? "text-mastery-mastered" : "text-mastery-attention"}>
                  {" "}({summary.conceptImprovement.trend > 0 ? "+" : ""}{summary.conceptImprovement.trend})
                </span>
              )}
            </p>
          )}

          {summary.nextRecommendation && (
            <div className="mb-6 rounded-lg border border-signal/30 bg-signal-soft px-4 py-3 text-left">
              <p className="text-sm font-medium">{summary.nextRecommendation.title}</p>
              <Link href={summary.nextRecommendation.actionHref} className="mt-2 inline-block">
                <Button variant="nova">{summary.nextRecommendation.actionLabel}</Button>
              </Link>
            </div>
          )}
        </>
      ) : (
        <p className="mb-6 text-sm text-ink/50">Session ended.</p>
      )}
      <Button variant="quiet" onClick={restart}>Start another session</Button>
    </div>
  );
}
