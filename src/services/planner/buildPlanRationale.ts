import { completeWithRetry } from "@/services/ai/factory";
import type { PlannedSession, TopicInput } from "./generateStudyPlan";

/**
 * Nova explains the already-computed plan in plain language. It never
 * decides dates or durations — those come from generateStudyPlan()'s
 * deterministic algorithm. If the AI call fails, callers should fall back
 * to a template sentence (see route.ts) rather than blocking plan creation.
 */
export async function buildPlanRationale(topics: TopicInput[], sessions: PlannedSession[]): Promise<string> {
  const weakest = [...topics].sort((a, b) => (a.masteryScore ?? 0) - (b.masteryScore ?? 0))[0];
  const sessionCount = sessions.length;
  const days = new Set(sessions.map((s) => s.dayOffset)).size;

  const response = await completeWithRetry({
    tier: "fast",
    maxTokens: 200,
    messages: [
      {
        role: "system",
        content:
          "You explain an already-generated study plan to a student in 2-3 warm, concrete sentences. " +
          "Do not invent dates, durations, or topics beyond what's given — only describe the plan you're told about.",
      },
      {
        role: "user",
        content: `Plan covers ${days} days, ${sessionCount} sessions. Weakest topic: ${weakest?.name ?? "none"} (mastery ${weakest?.masteryScore ?? "unattempted"}). Topics included: ${topics.map((t) => t.name).join(", ")}.`,
      },
    ],
  });

  return response.content;
}

export function templateFallbackRationale(topics: TopicInput[], sessions: PlannedSession[]): string {
  const weakest = [...topics].sort((a, b) => (a.masteryScore ?? 0) - (b.masteryScore ?? 0))[0];
  const days = new Set(sessions.map((s) => s.dayOffset)).size;
  return `This plan spans ${days} days and gives extra time to ${weakest?.name ?? "your weaker topics"} since that's currently where you have the most room to improve.`;
}
