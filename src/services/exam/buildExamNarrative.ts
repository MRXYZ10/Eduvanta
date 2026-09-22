import { completeWithRetry } from "@/services/ai/factory";
import type { ExamReport } from "./scoreExam";

/**
 * "What actually cost you marks" — the AI's role is limited to explaining
 * the already-computed ExamReport in plain language. It's given the exact
 * numbers and costly-question categories and told to reference them, not
 * to recompute or invent anything.
 */
export async function buildExamNarrative(report: ExamReport): Promise<string> {
  const weakestTopic = [...report.topicPerformance].sort((a, b) => a.accuracy - b.accuracy)[0];
  const guessCount = report.costlyQuestions.filter((q) => q.reason === "wrong_and_fast_guess").length;
  const reviewMisses = report.costlyQuestions.filter((q) => q.reason === "wrong_marked_for_review").length;
  const slowCorrect = report.costlyQuestions.filter((q) => q.reason === "correct_but_very_slow").length;

  const response = await completeWithRetry({
    tier: "fast",
    maxTokens: 220,
    messages: [
      {
        role: "system",
        content:
          "You explain an already-graded exam report to a student in 3-4 direct, encouraging sentences. " +
          "Only reference the numbers and categories given to you — never invent a score, topic, or question detail.",
      },
      {
        role: "user",
        content: `Score: ${report.score}% (${report.correctCount}/${report.totalQuestions}). Weakest topic: ${weakestTopic?.topicName ?? "none"} at ${weakestTopic?.accuracy ?? 0}%. Likely guesses (wrong + answered very fast): ${guessCount}. Wrong answers the student had flagged as unsure (marked for review): ${reviewMisses}. Correct answers that took much longer than expected: ${slowCorrect}.`,
      },
    ],
  });

  return response.content;
}

export function templateFallbackNarrative(report: ExamReport): string {
  const weakestTopic = [...report.topicPerformance].sort((a, b) => a.accuracy - b.accuracy)[0];
  const guessCount = report.costlyQuestions.filter((q) => q.reason === "wrong_and_fast_guess").length;

  const parts = [`You scored ${report.score}% (${report.correctCount}/${report.totalQuestions}).`];
  if (weakestTopic) parts.push(`${weakestTopic.topicName} was your weakest area at ${weakestTopic.accuracy}% accuracy.`);
  if (guessCount > 0) parts.push(`${guessCount} wrong answer${guessCount > 1 ? "s were" : " was"} answered unusually fast — worth double-checking rather than guessing next time.`);
  return parts.join(" ");
}
