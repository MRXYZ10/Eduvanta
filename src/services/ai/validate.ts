import { z } from "zod";

/**
 * The model can propose feedback, but numeric fields that affect the
 * database (mastery_delta) are clamped here, never trusted verbatim.
 * See PRODUCT SPEC > "AI RESPONSE FORMAT" > "Never blindly trust
 * model-generated numbers."
 */
export const PracticeFeedbackSchema = z.object({
  type: z.literal("practice_feedback"),
  correct: z.boolean(),
  concept: z.string().min(1),
  mistake_type: z.enum(["conceptual", "careless", "procedural", "misread", "none"]),
  explanation: z.string().min(1),
  mastery_delta: z.number().min(-10).max(10), // clamp: model can't swing mastery wildly
  next_action: z.enum(["review_concept", "next_question", "teach_concept", "revise_mistakes"]),
  next_question_difficulty: z.enum(["easy", "medium", "hard"]),
});

export type PracticeFeedback = z.infer<typeof PracticeFeedbackSchema>;

export function parsePracticeFeedback(raw: string): PracticeFeedback | { error: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { error: "AI response was not valid JSON" };
  }

  const result = PracticeFeedbackSchema.safeParse(json);
  if (!result.success) {
    return { error: `AI response failed validation: ${result.error.message}` };
  }
  return result.data;
}

export const GeneratedQuestionSchema = z.object({
  type: z.enum(["MCQ", "MULTI_SELECT", "TRUE_FALSE", "NUMERICAL", "SHORT_ANSWER", "CODING", "CASE_BASED"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  prompt: z.string().min(5),
  options: z
    .array(z.object({ label: z.string().min(1), isCorrect: z.boolean() }))
    .optional(),
  correctAnswer: z.unknown(),
  explanation: z.string().min(1),
  learningObjective: z.string().optional(),
});

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

/** Question validation pipeline: structural checks beyond schema shape. */
export function validateGeneratedQuestion(q: GeneratedQuestion): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if ((q.type === "MCQ" || q.type === "MULTI_SELECT") && (!q.options || q.options.length < 2)) {
    issues.push("MCQ/multi-select questions need at least 2 options");
  }
  if (q.options && !q.options.some((o) => o.isCorrect)) {
    issues.push("No option marked correct");
  }
  if (q.options && q.type === "MCQ" && q.options.filter((o) => o.isCorrect).length !== 1) {
    issues.push("MCQ must have exactly one correct option");
  }
  if (q.correctAnswer == null) {
    issues.push("Missing correctAnswer");
  }
  if (q.explanation.trim().length < 10) {
    issues.push("Explanation too short to be useful");
  }

  return { valid: issues.length === 0, issues };
}
