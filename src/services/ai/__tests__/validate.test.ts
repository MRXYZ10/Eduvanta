import { describe, it, expect } from "vitest";
import { parsePracticeFeedback, validateGeneratedQuestion } from "../validate";

describe("parsePracticeFeedback", () => {
  it("accepts a well-formed practice_feedback payload", () => {
    const raw = JSON.stringify({
      type: "practice_feedback",
      correct: false,
      concept: "function composition",
      mistake_type: "conceptual",
      explanation: "Applied f before g.",
      mastery_delta: -3,
      next_action: "review_concept",
      next_question_difficulty: "easy",
    });
    const result = parsePracticeFeedback(raw);
    expect("error" in result).toBe(false);
  });

  it("rejects malformed JSON without throwing", () => {
    const result = parsePracticeFeedback("not json{{{");
    expect("error" in result).toBe(true);
  });

  it("clamps out-of-range mastery_delta by rejecting it (never trust model numbers)", () => {
    const raw = JSON.stringify({
      type: "practice_feedback",
      correct: true,
      concept: "sets",
      mistake_type: "none",
      explanation: "Correct.",
      mastery_delta: 999, // way outside -10..10
      next_action: "next_question",
      next_question_difficulty: "medium",
    });
    const result = parsePracticeFeedback(raw);
    expect("error" in result).toBe(true);
  });
});

describe("validateGeneratedQuestion", () => {
  it("flags an MCQ with no correct option marked", () => {
    const q = {
      type: "MCQ" as const,
      difficulty: "EASY" as const,
      prompt: "What is 2 + 2?",
      options: [
        { label: "3", isCorrect: false },
        { label: "4", isCorrect: false },
      ],
      correctAnswer: { optionLabel: "4" },
      explanation: "Basic addition.",
    };
    const result = validateGeneratedQuestion(q);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("No option marked correct");
  });

  it("flags an MCQ with two correct options", () => {
    const q = {
      type: "MCQ" as const,
      difficulty: "EASY" as const,
      prompt: "What is 2 + 2?",
      options: [
        { label: "4", isCorrect: true },
        { label: "four", isCorrect: true },
      ],
      correctAnswer: { optionLabel: "4" },
      explanation: "Basic addition.",
    };
    const result = validateGeneratedQuestion(q);
    expect(result.valid).toBe(false);
  });

  it("passes a well-formed MCQ", () => {
    const q = {
      type: "MCQ" as const,
      difficulty: "EASY" as const,
      prompt: "What is 2 + 2?",
      options: [
        { label: "3", isCorrect: false },
        { label: "4", isCorrect: true },
      ],
      correctAnswer: { optionLabel: "4" },
      explanation: "Basic addition combines two quantities.",
    };
    const result = validateGeneratedQuestion(q);
    expect(result.valid).toBe(true);
  });
});
