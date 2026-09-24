import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { scoreExam, type ScoredAnswer } from "@/services/exam/scoreExam";
import { buildExamNarrative, templateFallbackNarrative } from "@/services/exam/buildExamNarrative";
import { enforceRateLimit } from "@/services/security/enforceRateLimit";
import { recordStreakActivity } from "@/services/gamification/recordStreakActivity";
import { createNotificationIfNotDuplicate } from "@/services/notifications/createNotificationIfNotDuplicate";
import { checkStreakRecordAchievement, checkExamPersonalBestAchievement } from "@/services/gamification/checkAchievements";
import { awardAchievement } from "@/services/gamification/awardAchievement";

const RequestSchema = z.object({ examAttemptId: z.string() });

const EXPECTED_TIME_MS: Record<string, number> = { EASY: 30_000, MEDIUM: 60_000, HARD: 120_000 };

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = enforceRateLimit(user.id, "aiLightweight");
  if (limited) return limited;

  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const examAttempt = await prisma.examAttempt.findFirst({
    where: { id: parsed.data.examAttemptId, userId: user.id },
    include: {
      exam: true,
      attempt: {
        include: {
          answers: { include: { question: { include: { topic: true } } } },
        },
      },
    },
  });
  if (!examAttempt || !examAttempt.attempt) {
    return NextResponse.json({ error: "Exam attempt not found" }, { status: 404 });
  }
  if (examAttempt.finishedAt) {
    // Idempotent: submitting twice (e.g. a retried request after a flaky
    // network response) just returns the already-computed report.
    return NextResponse.json({ score: examAttempt.score, report: examAttempt.report });
  }

  // Captured before this attempt's score is saved below, so the personal-
  // best comparison is against attempts that finished strictly earlier.
  const previousBest = await prisma.examAttempt.aggregate({
    where: { examId: examAttempt.examId, userId: user.id, finishedAt: { not: null } },
    _max: { score: true },
  });
  const previousBestScore = previousBest._max.score;

  const scoredAnswers: ScoredAnswer[] = examAttempt.attempt.answers.map((a) => ({
    questionId: a.questionId,
    prompt: a.question.prompt,
    topicName: a.question.topic?.name ?? null,
    difficulty: a.question.difficulty,
    isCorrect: a.isCorrect,
    timeTakenMs: a.timeTakenMs,
    expectedTimeMs: EXPECTED_TIME_MS[a.question.difficulty] ?? 60_000,
    markedForReview: a.markedForReview,
  }));

  const report = scoreExam(scoredAnswers);

  let narrative: string;
  try {
    narrative = await buildExamNarrative(report);
  } catch {
    narrative = templateFallbackNarrative(report);
  }

  const now = new Date();
  // Claim the submission atomically so a double-tap/retried request cannot
  // award streaks/achievements twice.
  const claimed = await prisma.examAttempt.updateMany({
    where: { id: examAttempt.id, userId: user.id, finishedAt: null },
    data: { finishedAt: now, score: report.score, report: { ...report, narrative } as object },
  });

  if (claimed.count === 0) {
    const existing = await prisma.examAttempt.findUnique({
      where: { id: examAttempt.id },
      select: { score: true, report: true },
    });
    return NextResponse.json({ score: existing?.score ?? report.score, report: existing?.report ?? { ...report, narrative } });
  }

  await prisma.attempt.updateMany({
    where: { id: examAttempt.attempt.id, userId: user.id, finishedAt: null },
    data: { finishedAt: now },
  });

  const streakOutcome = await recordStreakActivity(user.id);
  if (streakOutcome.extended && streakOutcome.currentStreak > 1) {
    await createNotificationIfNotDuplicate({
      userId: user.id,
      type: "streak",
      title: streakOutcome.isNewRecord
        ? `New personal best: ${streakOutcome.currentStreak}-day streak!`
        : `${streakOutcome.currentStreak}-day streak`,
      body: streakOutcome.isNewRecord
        ? "You've never studied this many days in a row — keep it going."
        : "Nice consistency — come back tomorrow to keep it up.",
    });
  }
  const streakAward = checkStreakRecordAchievement(streakOutcome.isNewRecord, streakOutcome.currentStreak);
  if (streakAward) await awardAchievement(user.id, streakAward);

  const examAward = checkExamPersonalBestAchievement(report.score, previousBestScore, examAttempt.exam.title);
  if (examAward) await awardAchievement(user.id, examAward);

  return NextResponse.json({ score: report.score, report: { ...report, narrative } });
}
