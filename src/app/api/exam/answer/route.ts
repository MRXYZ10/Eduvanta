import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";

const RequestSchema = z.object({
  examAttemptId: z.string(),
  questionId: z.string(),
  studentAnswer: z.unknown(),
  timeTakenMs: z.number().int().min(0),
  markedForReview: z.boolean().optional(),
});

function checkCorrectness(correctAnswer: unknown, studentAnswer: unknown): boolean {
  return JSON.stringify(correctAnswer) === JSON.stringify(studentAnswer);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { examAttemptId, questionId, studentAnswer, timeTakenMs, markedForReview } = parsed.data;

  const examAttempt = await prisma.examAttempt.findFirst({
    where: { id: examAttemptId, userId: user.id },
    include: { attempt: true, exam: true },
  });
  if (!examAttempt || !examAttempt.attempt) {
    return NextResponse.json({ error: "Exam attempt not found" }, { status: 404 });
  }
  if (examAttempt.finishedAt) {
    return NextResponse.json({ error: "This exam has already been submitted" }, { status: 409 });
  }

  const deadline = new Date(examAttempt.startedAt.getTime() + examAttempt.exam.durationMin * 60_000);
  if (new Date() > deadline) {
    return NextResponse.json({ error: "Time's up — this exam can no longer accept answers." }, { status: 409 });
  }

  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      examQuestions: { some: { examId: examAttempt.examId } },
    },
  });
  if (!question) return NextResponse.json({ error: "Question is not part of this exam" }, { status: 404 });

  const isCorrect = checkCorrectness(question.correctAnswer, studentAnswer);

  // Auto-save: upsert so navigating back and re-answering the same question
  // updates in place rather than creating duplicate rows.
  await prisma.answer.upsert({
    where: { attemptId_questionId: { attemptId: examAttempt.attempt.id, questionId } },
    create: {
      attemptId: examAttempt.attempt.id,
      questionId,
      studentAnswer: studentAnswer as object,
      isCorrect,
      timeTakenMs,
      markedForReview: markedForReview ?? false,
    },
    update: {
      studentAnswer: studentAnswer as object,
      isCorrect,
      timeTakenMs,
      ...(markedForReview !== undefined ? { markedForReview } : {}),
    },
  });

  return NextResponse.json({ saved: true });
}
