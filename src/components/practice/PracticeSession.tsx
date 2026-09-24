"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import type { AdaptiveState } from "@/services/practice/adaptiveDifficulty";

interface Option { id: string; label: string }
interface Question { id: string; prompt: string; type: string; difficulty: "EASY" | "MEDIUM" | "HARD"; options: Option[] }
interface SubmitResult {
  isCorrect: boolean;
  feedback: { explanation: string; mistake_type: string; next_action: string };
  adaptive: { nextDifficulty: string; action: string; reason: string; nextState?: AdaptiveState };
  mastery: { score: number; band: string; trend: number };
}

const DIFFICULTY_LABEL: Record<string, string> = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" };

export function PracticeSession({ topicId, attemptId, onAnswered }: { topicId: string; attemptId: string; onAnswered?: (correct: boolean) => void }) {
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [adaptiveState, setAdaptiveState] = useState<AdaptiveState>({ currentDifficulty: "MEDIUM", consecutiveCorrect: 0, consecutiveWrong: 0, sameConceptMisses: 0 });

  const fetchNext = useCallback(async (difficulty: string, excludeIds: string[]) => {
    setLoading(true); setError(null); setResult(null); setSelectedOptionId(null); setFallbackNotice(null);
    try {
      const res = await fetch("/api/practice/next", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId, difficulty, excludeIds }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't load the next question.");
      setQuestion(body.question);
      if (body.servedDifficulty) setAdaptiveState((prev) => ({ ...prev, currentDifficulty: body.servedDifficulty }));
      if (body.fallbackUsed) setFallbackNotice(`We adjusted to ${DIFFICULTY_LABEL[body.servedDifficulty]} so your session keeps moving.`);
      setStartedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong loading your next question.");
    } finally { setLoading(false); }
  }, [topicId]);

  useEffect(() => {
    fetchNext(adaptiveState.currentDifficulty, []);
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!question || loading) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;

      const key = event.key.toLowerCase();
      if (!result && /^[1-4]$/.test(key)) {
        const index = Number(key) - 1;
        if (question.options[index]) {
          setSelectedOptionId(question.options[index].id);
          event.preventDefault();
        }
      }
      if (key === "enter") {
        event.preventDefault();
        if (result) void next();
        else if (selectedOptionId) void submit();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [question, result, selectedOptionId, loading]);

  async function submit() {
    if (!question || selectedOptionId == null || loading) return;
    const selected = question.options.find((o) => o.id === selectedOptionId);
    if (!selected) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/practice/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId, questionId: question.id, studentAnswer: { optionLabel: selected.label }, timeTakenMs: Math.max(1, Date.now() - startedAt), adaptiveState }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't grade that answer just now.");
      setResult(body); onAnswered?.(body.isCorrect);
      setAdaptiveState(body.adaptive.nextState ?? ((prev: AdaptiveState) => ({ ...prev, currentDifficulty: body.adaptive.nextDifficulty })));
      setRecentIds((prev) => [...prev.slice(-249), question.id]);
      setAnsweredCount((count) => count + 1);
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't connect right now."); }
    finally { setLoading(false); }
  }

  async function next() {
    // Keep the session going instead of stopping at an arbitrary 10-question cap.
    // Once the current exclusion window grows large, recycle the pool so requests
    // stay small while still giving the learner a long, repeat-light session.
    await fetchNext(adaptiveState.currentDifficulty, recentIds);
  }

  async function endSession() {
    try {
      await fetch("/api/practice/end-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId }) });
    } catch {}
    router.push("/practice");
  }

  if (error && !question) {
    const noQuestions = error.toLowerCase().includes("does not have any validated practice questions");
    if (noQuestions) return <div className="rounded-3xl border border-line/70 bg-paper/65 px-6 py-10 text-center shadow-sm"><h2 className="text-lg">Question bank unavailable</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink/55">This topic does not have a validated question set yet. Choose another topic or ask an admin to publish questions.</p><div className="mt-5 flex justify-center gap-3"><Button onClick={() => fetchNext(adaptiveState.currentDifficulty, [])}>Try again</Button><a href="/practice" className="inline-flex items-center rounded-2xl border border-line px-4 py-2.5 text-sm font-medium">Choose topic</a></div></div>;
    return <ErrorState message={error} onRetry={() => fetchNext(adaptiveState.currentDifficulty, recentIds)} />;
  }

  if (!question) return <div className="rounded-3xl border border-line/70 bg-paper/70 px-6 py-12 text-center shadow-sm"><div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-cobalt-soft" /><p className="mt-4 text-sm text-ink/45">Building your next question…</p></div>;

  const progress = Math.min(100, ((answeredCount % 20) / 20) * 100);
  return <div className="space-y-5">
    <div className="rounded-3xl border border-line/70 bg-paper/65 p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between gap-4 text-xs"><div className="flex items-center gap-2"><span className="rounded-full bg-cobalt-soft px-2.5 py-1 font-semibold text-cobalt">{DIFFICULTY_LABEL[question.difficulty]}</span><span className="hidden text-ink/45 sm:inline">Unlimited adaptive practice · 1–4 to choose · Enter to continue</span></div><div className="flex items-center gap-3"><span className="font-medium text-ink/55">Question {answeredCount + 1} · {adaptiveState.currentDifficulty === "HARD" ? "Challenge mode" : adaptiveState.currentDifficulty === "EASY" ? "Foundation mode" : "Core mode"}</span><button onClick={endSession} className="rounded-full border border-line/70 bg-paper px-2.5 py-1 text-[10px] font-semibold text-ink/55 transition hover:border-cobalt/30 hover:text-cobalt">End session</button></div></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/5"><div className="h-full rounded-full bg-cobalt transition-all duration-500" style={{ width: `${Math.max(4, progress)}%` }} /></div></div>
    {fallbackNotice && <div className="rounded-2xl border border-cobalt/15 bg-cobalt-soft/45 px-4 py-3 text-sm leading-6 text-ink/65">{fallbackNotice}</div>}
    <div className="rounded-[2rem] border border-line/70 bg-paper/70 p-5 shadow-sm sm:p-7"><div className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/35"><span>Question</span><span>•</span><span>{question.type}</span></div><p className="text-xl leading-relaxed tracking-tight sm:text-2xl">{question.prompt}</p><div className="mt-7 grid gap-3">{question.options.map((opt, index) => { const selected = selectedOptionId === opt.id; const letter = String.fromCharCode(65 + index); return <button key={opt.id} onClick={() => !result && setSelectedOptionId(opt.id)} disabled={!!result} className={`group flex min-h-14 w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left text-sm transition-all duration-200 ${selected ? "border-cobalt bg-cobalt-soft shadow-sm" : "border-line/70 bg-paper/40 hover:-translate-y-0.5 hover:border-cobalt/35 hover:bg-cobalt-soft/35 hover:shadow-sm"} disabled:cursor-default`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${selected ? "bg-cobalt text-white" : "bg-ink/5 text-ink/45"}`}>{letter}</span><span className="leading-6">{opt.label}</span></button>; })}</div></div>
    {error && <div className="rounded-2xl border border-mastery-attention/20 bg-mastery-attention/5 px-4 py-3 text-sm text-mastery-attention">{error}</div>}
    {!result ? <Button className="w-full py-3.5 sm:w-auto" onClick={submit} disabled={selectedOptionId == null || loading}>{loading ? "Checking your answer…" : "Submit answer"}</Button> : <div className="rounded-[2rem] border border-signal/20 bg-signal-soft/45 p-5 sm:p-6"><div className="flex items-start gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-paper/70 text-signal">{result.isCorrect ? "✓" : "!"}</div><div><p className="font-semibold">{result.isCorrect ? "Nice work — that's correct." : "Not quite — here's the useful part."}</p><p className="mt-1 text-sm leading-6 text-ink/65">{result.feedback.explanation}</p><p className="mt-2 text-xs font-medium text-ink/45">{result.adaptive.reason}</p></div></div><Button className="mt-5 w-full sm:w-auto" onClick={next} disabled={loading}>Next question →</Button></div>}
  </div>;
}
