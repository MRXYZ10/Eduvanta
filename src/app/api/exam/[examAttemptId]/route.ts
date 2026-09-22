import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { examAttemptId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const examAttempt = await prisma.examAttempt.findFirst({
    where: { id: params.examAttemptId, userId: user.id },
    include: {
      exam: { include: { examQuestions: { include: { question: { include: { options: true } } }, orderBy: { order: "asc" } } } },
      attempt: { include: { answers: true } },
    },
  });
  if (!examAttempt) return NextResponse.json({ error: "Exam attempt not found" }, { status: 404 });

  const deadline = new Date(examAttempt.startedAt.getTime() + examAttempt.exam.durationMin * 60_000);

  const questions = examAttempt.exam.examQuestions.map((eq) => ({
    id: eq.question.id,
    prompt: eq.question.prompt,
    type: eq.question.type,
    difficulty: eq.question.difficulty,
    options: eq.question.options.map((o) => ({ id: o.id, label: o.label })),
  }));

  const savedAnswers = (examAttempt.attempt?.answers ?? []).map((a) => ({
    questionId: a.questionId,
    studentAnswer: a.studentAnswer,
    markedForReview: a.markedForReview,
  }));

  return NextResponse.json({
    examAttemptId: examAttempt.id,
    title: examAttempt.exam.title,
    finishedAt: examAttempt.finishedAt,
    deadline,
    questions,
    savedAnswers,
  });
}
