import { prisma } from "@/db/client";

const FIX_ELIGIBLE_THRESHOLD = 3; // "You have made this conceptual mistake 4 times" — spec's example; we gate at 3+ so the offer appears a beat earlier

export interface MistakeVaultEntry {
  id: string;
  questionPrompt: string;
  conceptName: string | null;
  mistakeType: string;
  explanation: string | null;
  occurrences: number;
  createdAt: Date;
  fixEligible: boolean;
}

export async function getMistakeVault(userId: string): Promise<MistakeVaultEntry[]> {
  const mistakes = await prisma.mistake.findMany({
    where: { userId, resolved: false },
    include: { question: { select: { prompt: true } }, concept: { select: { name: true } } },
    orderBy: [{ occurrences: "desc" }, { updatedAt: "desc" }],
  });

  return mistakes.map((m) => ({
    id: m.id,
    questionPrompt: m.question.prompt,
    conceptName: m.concept?.name ?? null,
    mistakeType: m.mistakeType,
    explanation: m.explanation,
    occurrences: m.occurrences,
    createdAt: m.createdAt,
    fixEligible: m.occurrences >= FIX_ELIGIBLE_THRESHOLD,
  }));
}
