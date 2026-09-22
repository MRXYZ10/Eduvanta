import { completeWithRetry } from "@/services/ai/factory";

/**
 * A short, targeted explanation of the concept a student keeps missing —
 * the "mini lesson" half of the spec's "targeted mini lesson + 5 practice
 * questions." Given the concept name, mistake type, and the student's own
 * wrong/correct answers so the lesson can speak to their actual error
 * rather than a generic definition.
 */
export async function buildMiniLesson(params: {
  conceptName: string;
  mistakeType: string;
  studentAnswer: unknown;
  correctAnswer: unknown;
  occurrences: number;
}): Promise<string> {
  const response = await completeWithRetry({
    tier: "fast",
    maxTokens: 250,
    messages: [
      {
        role: "system",
        content:
          "You write a short, encouraging mini-lesson (3-5 sentences) explaining a concept a student keeps " +
          "getting wrong, addressing their specific recurring error — not a generic textbook definition. " +
          "End with one concrete tip for what to check next time.",
      },
      {
        role: "user",
        content: `Concept: ${params.conceptName}. Mistake type: ${params.mistakeType}. The student has made this mistake ${params.occurrences} times. Their answer: ${JSON.stringify(params.studentAnswer)}. Correct answer: ${JSON.stringify(params.correctAnswer)}.`,
      },
    ],
  });

  return response.content;
}

export function templateFallbackLesson(params: { conceptName: string; occurrences: number }): string {
  return (
    `You've missed questions on ${params.conceptName} ${params.occurrences} times now, which usually means one ` +
    `specific step in the concept needs a closer look rather than the whole topic. Try re-reading the worked ` +
    `examples for ${params.conceptName} before the next set of practice questions below, and pay attention to ` +
    `wherever your last few answers went wrong.`
  );
}
