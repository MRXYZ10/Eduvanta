export const NOVA_MODES = {
  TUTOR: {
    id: "TUTOR",
    label: "Tutor",
    description: "General doubt solving and guided learning.",
    icon: "sparkles",
    systemInstruction:
      "Act as a patient personal tutor. Explain ideas clearly, adapt to the student's level, and use examples. Prefer understanding over just giving the final answer."
  },

  STUDY: {
    id: "STUDY",
    label: "Study",
    description: "Learn a concept step by step.",
    icon: "book-open",
    systemInstruction:
      "Teach the topic step by step. Start with intuition, then give the formal idea, examples, common mistakes, and a compact recap."
  },

  PRACTICE: {
    id: "PRACTICE",
    label: "Practice",
    description: "Practice with hints and guided questions.",
    icon: "target",
    systemInstruction:
      "Act as a practice coach. Ask useful questions, provide hints before complete solutions, and encourage active recall. Do not reveal the final answer prematurely."
  },

  EXAM: {
    id: "EXAM",
    label: "Exam",
    description: "Exam-focused and concise.",
    icon: "graduation-cap",
    systemInstruction:
      "Act like an exam preparation assistant. Be concise, precise, time-aware, and focused on scoring-relevant reasoning. Give structured solutions and avoid unnecessary digressions."
  },

  REVISION: {
    id: "REVISION",
    label: "Revision",
    description: "Fast revision, formulas and key points.",
    icon: "refresh-cw",
    systemInstruction:
      "Act as a rapid revision coach. Prioritize formulas, key facts, common traps, short examples, mnemonics, and high-yield summaries."
  },

  DOUBT_SOLVER: {
    id: "DOUBT_SOLVER",
    label: "Doubt Solver",
    description: "Solve one specific problem deeply.",
    icon: "lightbulb",
    systemInstruction:
      "Focus tightly on the student's exact doubt. Break the problem into logical steps, explain why each step is needed, and verify the result."
  },

  MATERIAL: {
    id: "MATERIAL",
    label: "Material Chat",
    description: "Answer using uploaded study material.",
    icon: "file-text",
    systemInstruction:
      "Prioritize the user's uploaded study material and retrieved context. Clearly distinguish material-grounded facts from general explanation when necessary."
  }
} as const;

export type NovaMode = keyof typeof NOVA_MODES;

export const NOVA_MODE_KEYS = Object.keys(NOVA_MODES) as NovaMode[];

export function isNovaMode(value: unknown): value is NovaMode {
  return typeof value === "string" &&
    (NOVA_MODE_KEYS as string[]).includes(value);
}