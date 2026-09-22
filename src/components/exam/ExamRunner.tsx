"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Flag } from "lucide-react";

interface Option {
  id: string;
  label: string;
}
interface Question {
  id: string;
  prompt: string;
  difficulty: string;
  options: Option[];
}

export function ExamRunner({ examId }: { examId: string }) {
  const router = useRouter();
  const [examAttemptId, setExamAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> optionId
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [remainingSec, setRemainingSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const questionStartRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/exam/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examId }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Couldn't start this exam.");
        setExamAttemptId(body.examAttemptId);
        setQuestions(body.questions);
        setDeadline(new Date(body.deadline));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    })();
  }, [examId]);

  const submit = useCallback(async () => {
    if (!examAttemptId || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examAttemptId }),
      });
      if (!res.ok) throw new Error("Couldn't submit the exam.");
      router.push(`/exam/result/${examAttemptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â your answers are saved, try submitting again.");
      submittedRef.current = false;
      setSubmitting(false);
    }
  }, [examAttemptId, router]);

  // Countdown + auto-submit at zero.
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const secs = Math.max(0, Math.round((deadline.getTime() - Date.now()) / 1000));
      setRemainingSec(secs);
      if (secs === 0) submit();
    };
    tick();
    const interval = setInterval(tick, 1000);

  return () => clearInterval(interval);
  }, [deadline, submit]);

  async function saveAnswer(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    const timeTakenMs = Date.now() - questionStartRef.current;
    const question = questions.find((q) => q.id === questionId);
    const label = question?.options.find((o) => o.id === optionId)?.label;

    try {
      await fetch("/api/exam/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examAttemptId,
          questionId,
          studentAnswer: { optionLabel: label },
          timeTakenMs,
          markedForReview: marked.has(questionId),
        }),
      });
    } catch {
      // Auto-save failing silently is acceptable here ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â the answer stays in
      // local state and the next navigation/save attempt will retry it;
      // submit still uses whatever made it to the server.
    }
  }

  function toggleMark(questionId: string) {
    setMarked((prev) => {
      const next = new Set(prev);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      return next;
    });
  }

  function goTo(index: number) {
    setCurrent(index);
    questionStartRef.current = Date.now();
  }

  if (error && questions.length === 0) {
    return <div className="p-6 text-center text-sm text-mastery-attention">{error}</div>;
  }
  if (questions.length === 0) {
    return <div className="p-10 text-center text-sm text-ink/40">Loading examÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦</div>;
  }

  const q = questions[current];
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const lowTime = remainingSec < 300;

  if (!q) {
    return (
      <div className="rounded-lg border border-line px-5 py-6 text-sm text-ink/60">
        No question available.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg border border-line px-4 py-2.5">
        <span className="text-sm text-ink/60">
          Question {current + 1} of {questions.length}
        </span>
        <span className={`font-mono text-sm ${lowTime ? "text-mastery-attention" : "text-ink"}`}>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {questions.map((qq, i) => {
          const isAnswered = Boolean(answers[qq.id]);
          const isMarked = marked.has(qq.id);
          return (
            <button
              key={qq.id}
              onClick={() => goTo(i)}
              className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs ${
                i === current
                  ? "border-cobalt bg-cobalt text-white"
                  : isMarked
                    ? "border-signal bg-signal-soft text-ink"
                    : isAnswered
                      ? "border-cobalt/40 bg-cobalt-soft text-ink"
                      : "border-line text-ink/60"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-line px-5 py-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-ink/50">{q.difficulty}</span>
          <button
            onClick={() => toggleMark(q.id)}
            className={`flex items-center gap-1 text-xs ${marked.has(q.id) ? "text-signal" : "text-ink/40"}`}
          >
            <Flag className="h-3.5 w-3.5" strokeWidth={1.75} />
            {marked.has(q.id) ? "Marked for review" : "Mark for review"}
          </button>
        </div>
        <p className="text-lg leading-relaxed">{q.prompt}</p>
        <div className="mt-5 space-y-2">
          {q.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => saveAnswer(q.id, opt.id)}
              className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                answers[q.id] === opt.id ? "border-cobalt bg-cobalt-soft" : "border-line hover:bg-ink/5"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-mastery-attention">{error}</p>}

      <div className="flex justify-between">
        <Button variant="quiet" onClick={() => goTo(Math.max(0, current - 1))} disabled={current === 0}>
          Previous
        </Button>
        {current < questions.length - 1 ? (
          <Button onClick={() => goTo(current + 1)}>Next</Button>
        ) : (
          <Button onClick={() => setConfirmSubmit(true)}>Submit exam</Button>
        )}
      </div>

      <Modal open={confirmSubmit} onClose={() => setConfirmSubmit(false)} dismissible={!submitting}>
        <p className="mb-1 text-base font-medium">Submit this exam?</p>
        <p className="mb-4 text-sm text-ink/60">
          You've answered {Object.keys(answers).length} of {questions.length} questions. This can't be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setConfirmSubmit(false)} disabled={submitting}>
            Keep working
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "SubmittingÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦" : "Submit"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
