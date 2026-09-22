import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { generateValidatedQuestion } from "@/services/ai/generateQuestion";
import { buildMiniLesson, templateFallbackLesson } from "@/services/mistakes/buildMiniLesson";
import { enforceRateLimit } from "@/services/security/enforceRateLimit";

const RequestSchema = z.object({ mistakeId: z.string() });
const QUESTION_COUNT = 5; // "a targeted mini lesson + 5 practice questions" — spec's exact number

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // aiGeneration bucket: up to 6 AI calls per request (1 lesson + 5 questions).
  const limited = enforceRateLimit(user.id, "aiGeneration");
  if (limited) return limited;

  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const mistake = await prisma.mistake.findFirst({
    where: { id: parsed.data.mistakeId, userId: user.id },
    include: { concept: true, question: { include: { topic: true } } },
  });
  if (!mistake) return NextResponse.json({ error: "Mistake not found" }, { status: 404 });

  const conceptName = mistake.concept?.name ?? mistake.question.topic?.name ?? "this topic";
  const topicId = mistake.concept?.topicId ?? mistake.question.topicId;

  let lesson: string;
  try {
    lesson = await buildMiniLesson({
      conceptName,
      mistakeType: mistake.mistakeType,
      studentAnswer: mistake.studentAnswer,
      correctAnswer: mistake.correctAnswer,
      occurrences: mistake.occurrences,
    });
  } catch {
    lesson = templateFallbackLesson({ conceptName, occurrences: mistake.occurrences });
  }

  // Reuses the exact same generate -> validate -> one-correction-attempt ->
  // discard-if-invalid pipeline the teacher dashboard's "Generate Remedial
  // Practice" uses — one question-generation pipeline in the codebase, two
  // triggers (a teacher noticing a class pattern, or a student's own
  // recurring mistake).
  const results = await Promise.all(
    Array.from({ length: QUESTION_COUNT }, () =>
      generateValidatedQuestion({ topicName: conceptName, difficulty: "EASY" }),
    ),
  );

  const created = [];
  for (const result of results) {
    if (!result.validated || !result.question) continue;
    const q = result.question;
    const row = await prisma.question.create({
      data: {
        topicId,
        conceptId: mistake.conceptId,
        type: q.type,
        difficulty: q.difficulty,
        prompt: q.prompt,
        explanation: q.explanation,
        source: "AI_GENERATED",
        validated: true,
        correctAnswer: q.correctAnswer as object,
        options: q.options
          ? { create: q.options.map((o, i) => ({ label: o.label, isCorrect: o.isCorrect, order: i })) }
          : undefined,
      },
    });
    created.push({ id: row.id });
  }

  return NextResponse.json({
    lesson,
    questionCount: created.length,
    // Not auto-navigable to a fixed practice set (adaptive practice picks
    // questions dynamically) — instead point back at the topic's normal
    // practice flow, which will now include these newly-created questions.
    practiceHref: topicId ? `/practice/${topicId}` : null,
  });
}
