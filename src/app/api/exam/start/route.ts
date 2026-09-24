import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";

const RequestSchema = z.object({ examId: z.string() });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const exam = await prisma.exam.findUnique({
    where: { id: parsed.data.examId },
    include: { examQuestions: { include: { question: { include: { options: true } } }, orderBy: { order: "asc" } } },
  });
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  // Course-linked exams are available only to enrolled students. Staff can
  // still preview/run them for administration and testing.
  if (exam.courseId && user.role === "STUDENT") {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: exam.courseId } },
      select: { id: true },
    });
    if (!enrollment) return NextResponse.json({ error: "Enroll in this course before starting its exam" }, { status: 403 });
  }

  if (exam.examQuestions.length === 0) {
    return NextResponse.json({ error: "This exam has no questions configured yet" }, { status: 422 });
  }

  // Resume an in-progress attempt rather than starting a duplicate one —
  // a page refresh or accidental back-navigation shouldn't reset the timer.
  const existing = await prisma.examAttempt.findFirst({
    where: { examId: exam.id, userId: user.id, finishedAt: null },
  });

  const examAttempt =
    existing ??
    (await prisma.$transaction(async (tx) => {
      const created = await tx.examAttempt.create({ data: { examId: exam.id, userId: user.id } });
      await tx.attempt.create({
        data: { userId: user.id, mode: "exam", examAttemptId: created.id },
      });
      return created;
    }));

  const deadline = new Date(examAttempt.startedAt.getTime() + exam.durationMin * 60_000);

  const questions = exam.examQuestions.map((eq) => ({
    id: eq.question.id,
    prompt: eq.question.prompt,
    type: eq.question.type,
    difficulty: eq.question.difficulty,
    options: eq.question.options.map((o) => ({ id: o.id, label: o.label })), // isCorrect withheld
    order: eq.order,
  }));

  return NextResponse.json({
    examAttemptId: examAttempt.id,
    title: exam.title,
    durationMin: exam.durationMin,
    startedAt: examAttempt.startedAt,
    deadline,
    questions,
  });
}
