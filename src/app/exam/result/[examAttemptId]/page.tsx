import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/db/client";
import { AppShell } from "@/components/AppShell";
import type { ExamReport } from "@/services/exam/scoreExam";

const REASON_LABEL: Record<string, string> = {
  wrong_and_slow: "Wrong, and took longer than expected",
  wrong_and_fast_guess: "Wrong, answered very quickly — likely a guess",
  wrong_marked_for_review: "Wrong, and you'd flagged it as unsure",
  correct_but_very_slow: "Correct, but took much longer than it should have",
};

export default async function ExamResultPage({ params }: { params: { examAttemptId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const examAttempt = await prisma.examAttempt.findFirst({
    where: { id: params.examAttemptId, userId: user.id },
    include: { exam: true },
  });
  if (!examAttempt || !examAttempt.report) redirect("/dashboard");

  const report = examAttempt.report as unknown as ExamReport & { narrative: string };

  return (
    <AppShell>
      <h1 className="mb-1 text-2xl">{examAttempt.exam.title}</h1>
      <p className="mb-6 text-sm text-ink/60">Results</p>

      <div className="mb-6 grid grid-cols-3 gap-4 rounded-lg border border-line px-4 py-4">
        <div>
          <div className="text-2xl font-serif">{report.score}%</div>
          <div className="text-xs text-ink/60">Score</div>
        </div>
        <div>
          <div className="text-2xl font-serif">
            {report.correctCount}/{report.totalQuestions}
          </div>
          <div className="text-xs text-ink/60">Correct</div>
        </div>
        <div>
          <div className="text-2xl font-serif">{Math.round(report.avgTimePerQuestionMs / 1000)}s</div>
          <div className="text-xs text-ink/60">Avg. time/question</div>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-signal/30 bg-signal-soft px-4 py-4">
        <p className="mb-1 text-sm font-medium">What actually cost you marks</p>
        <p className="text-sm text-ink/80">{report.narrative}</p>
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-base font-medium text-ink/80">By topic</h2>
        <div className="divide-y divide-line rounded-lg border border-line">
          {report.topicPerformance.map((t) => (
            <div key={t.topicName} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{t.topicName}</span>
              <span className="text-ink/60">
                {t.correct}/{t.total} · {t.accuracy}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-base font-medium text-ink/80">By difficulty</h2>
        <div className="divide-y divide-line rounded-lg border border-line">
          {report.difficultyPerformance.map((d) => (
            <div key={d.difficulty} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{d.difficulty}</span>
              <span className="text-ink/60">
                {d.correct}/{d.total} · {d.accuracy}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {report.costlyQuestions.length > 0 && (
        <div>
          <h2 className="mb-2 text-base font-medium text-ink/80">Questions worth reviewing</h2>
          <div className="divide-y divide-line rounded-lg border border-line">
            {report.costlyQuestions.map((c) => (
              <div key={c.questionId} className="px-4 py-2.5">
                <p className="text-sm">{c.prompt}</p>
                <p className="mt-0.5 text-xs text-ink/50">{REASON_LABEL[c.reason]}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
