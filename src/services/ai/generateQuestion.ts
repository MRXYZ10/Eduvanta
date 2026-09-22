import { completeWithRetry } from "@/services/ai/factory";
import { GeneratedQuestionSchema, validateGeneratedQuestion, type GeneratedQuestion } from "@/services/ai/validate";

/**
 * Question generation pipeline per product spec: Question -> Validation ->
 * Correction if invalid -> Store. This module only produces a validated
 * (or explicitly rejected) GeneratedQuestion — persistence is the caller's
 * job (see /api/teacher/remedial-practice), keeping this testable without
 * a database.
 */

interface GenerateOptions {
  topicName: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  learningObjective?: string;
}

const GENERATION_SYSTEM_PROMPT = `You generate a single multiple-choice practice question as JSON matching exactly this shape:
{"type":"MCQ","difficulty":"EASY"|"MEDIUM"|"HARD","prompt":string,"options":[{"label":string,"isCorrect":boolean}],"correctAnswer":{"optionLabel":string},"explanation":string,"learningObjective"?:string}
Rules: exactly one option must have isCorrect true, correctAnswer.optionLabel must exactly match that option's label, provide 3-4 options, and explanation must be at least one full sentence. Return ONLY the JSON, no prose.`;

async function requestQuestion(prompt: string): Promise<GeneratedQuestion | null> {
  const response = await completeWithRetry({
    tier: "standard",
    jsonMode: true,
    maxTokens: 500,
    messages: [
      { role: "system", content: GENERATION_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  try {
    const parsed = JSON.parse(response.content);
    const result = GeneratedQuestionSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export interface GenerationResult {
  question: GeneratedQuestion | null;
  validated: boolean;
  issues: string[];
}

export async function generateValidatedQuestion(opts: GenerateOptions): Promise<GenerationResult> {
  const basePrompt = `Topic: ${opts.topicName}. Difficulty: ${opts.difficulty}.${opts.learningObjective ? ` Learning objective: ${opts.learningObjective}.` : ""}`;

  let candidate = await requestQuestion(basePrompt);
  if (!candidate) {
    return { question: null, validated: false, issues: ["AI did not return valid JSON matching the question shape"] };
  }

  let check = validateGeneratedQuestion(candidate);
  if (check.valid) {
    return { question: candidate, validated: true, issues: [] };
  }

  // One correction attempt — tell the model exactly what was wrong rather
  // than silently discarding a question that was 90% right.
  const correctionPrompt = `${basePrompt}\nYour previous attempt had these problems: ${check.issues.join("; ")}. Generate a corrected question fixing all of them.`;
  candidate = await requestQuestion(correctionPrompt);
  if (!candidate) {
    return { question: null, validated: false, issues: ["Correction attempt did not return valid JSON"] };
  }

  check = validateGeneratedQuestion(candidate);
  return { question: check.valid ? candidate : null, validated: check.valid, issues: check.issues };
}
