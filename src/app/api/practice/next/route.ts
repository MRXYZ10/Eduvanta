import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import type { Difficulty } from "@/services/practice/adaptiveDifficulty";

const QuerySchema = z.object({
  topicId: z.string(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  excludeIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = QuerySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { topicId, difficulty, excludeIds } = parsed.data;

  // Only ever serve validated questions — AI-generated ones that haven't
  // passed the validation pipeline never reach students.
  const question = await prisma.question.findFirst({
    where: {
      topicId,
      difficulty: difficulty as Difficulty,
      validated: true,
      id: excludeIds?.length ? { notIn: excludeIds } : undefined,
    },
    include: { options: { select: { id: true, label: true, order: true } } }, // isCorrect withheld
    orderBy: { createdAt: "asc" },
  });

  if (!question) {
    return NextResponse.json(
      { error: "No more questions available at this difficulty for this topic yet." },
      { status: 404 },
    );
  }

  // Never expose the answer before submission.
  const { correctAnswer, ...safeQuestion } = question;
  void correctAnswer;

  return NextResponse.json({ question: safeQuestion });
}
