import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import type { Difficulty } from "@/services/practice/adaptiveDifficulty";
import { canAccessTopic } from "@/lib/topic-access";
import { generateValidatedQuestion } from "@/services/ai/generateQuestion";

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

  if (!(await canAccessTopic(user.id, user.role, topicId))) {
    return NextResponse.json({ error: "Enroll in this course before practicing this topic" }, { status: 403 });
  }

  // Only ever serve validated questions â€” AI-generated ones that haven't
  // passed the validation pipeline never reach students.
  //
  // Important UX rule: do not dead-end a practice session merely because the
  // exact adaptive difficulty has no inventory. Real question banks are often
  // uneven. We first try the requested difficulty, then the nearest available
  // difficulty, and finally any validated question for this topic.
  const baseWhere = {
    topicId,
    validated: true,
    id: excludeIds?.length ? { notIn: excludeIds } : undefined,
  };

  const ladder: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
  const requestedIndex = ladder.indexOf(difficulty as Difficulty);
  const orderedDifficulties = ladder
    .map((value, index) => ({ value, distance: Math.abs(index - requestedIndex) }))
    .sort((a, b) => a.distance - b.distance)
    .map(({ value }) => value);

  let question = null;
  let servedDifficulty: Difficulty | null = null;

  for (const candidateDifficulty of orderedDifficulties) {
    question = await prisma.question.findFirst({
      where: { ...baseWhere, difficulty: candidateDifficulty },
      include: { options: { select: { id: true, label: true, order: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (question) {
      servedDifficulty = candidateDifficulty;
      break;
    }
  }

  // If the stored pool is exhausted (or a topic has never had a curated
  // bank), generate and validate a fresh MCQ on demand. This makes practice
  // effectively open-ended for any enrolled topic when a real AI provider is
  // configured, while still keeping every persisted question validated.
  if (!question || !servedDifficulty) {
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: { concepts: { select: { id: true, name: true } } },
    });

    if (topic) {
      const conceptHint = topic.concepts[0]?.name;
      let generated;
      try {
        generated = await generateValidatedQuestion({
          topicName: topic.name,
          difficulty,
          forceMcq: true,
          learningObjective: `${conceptHint ? `Focus on the concept ${conceptHint}. ` : ""}Generate a fresh question for practice sequence ${Math.max(1, excludeIds?.length ?? 0) + 1}; do not copy a standard textbook example.`,
        });
      } catch (error) {
        console.error("[practice/next] AI generation failed:", error);
        return NextResponse.json(
          { error: "AI question generation failed. Please try again.", code: "AI_GENERATION_FAILED" },
          { status: 502 },
        );
      }

      if (generated.validated && generated.question && generated.question.type === "MCQ" && generated.question.options?.length) {
        const correctLabel = generated.question.correctAnswer && typeof generated.question.correctAnswer === "object" && "optionLabel" in generated.question.correctAnswer
          ? String((generated.question.correctAnswer as { optionLabel: unknown }).optionLabel)
          : generated.question.options.find((option) => option.isCorrect)?.label;

        if (correctLabel) {
          const saved = await prisma.question.create({
            data: {
              topicId,
              conceptId: topic.concepts[0]?.id,
              type: "MCQ",
              difficulty: generated.question.difficulty,
              prompt: generated.question.prompt,
              explanation: generated.question.explanation,
              source: "AI_GENERATED",
              validated: true,
              correctAnswer: { optionLabel: correctLabel },
              options: {
                create: generated.question.options.map((option, index) => ({
                  label: option.label,
                  isCorrect: option.label === correctLabel,
                  order: index + 1,
                })),
              },
            },
            include: { options: { select: { id: true, label: true, order: true } } },
          });

          const { correctAnswer, ...safeGenerated } = saved;
          void correctAnswer;
          return NextResponse.json({
            question: safeGenerated,
            requestedDifficulty: difficulty,
            servedDifficulty: saved.difficulty as Difficulty,
            fallbackUsed: saved.difficulty !== difficulty,
            generated: true,
          });
        }
      }
    }

    // No live AI? Keep the practice session usable by recycling the validated pool
    // only after the learner has genuinely exhausted it. With a configured AI
    // provider the branch above keeps producing fresh questions instead.
    if (excludeIds?.length) {
      const recycled = await prisma.question.findFirst({
        where: { topicId, validated: true },
        include: { options: { select: { id: true, label: true, order: true } } },
        orderBy: { createdAt: "asc" },
      });
      if (recycled) {
        const { correctAnswer, ...safeRecycled } = recycled;
        void correctAnswer;
        return NextResponse.json({
          question: safeRecycled,
          requestedDifficulty: difficulty,
          servedDifficulty: recycled.difficulty as Difficulty,
          fallbackUsed: recycled.difficulty !== difficulty,
          generated: false,
          recycled: true,
        });
      }
    }

    return NextResponse.json(
      {
        error: "This topic does not have any validated practice questions yet. Configure a real AI provider to generate more questions automatically.",
        code: "NO_QUESTIONS",
      },
      { status: 404 },
    );
  }

  // Never expose the answer before submission.
  const { correctAnswer, ...safeQuestion } = question;
  void correctAnswer;

  return NextResponse.json({
    question: safeQuestion,
    requestedDifficulty: difficulty,
    servedDifficulty,
    fallbackUsed: servedDifficulty !== difficulty,
  });
}
