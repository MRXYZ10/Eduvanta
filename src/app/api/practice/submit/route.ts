import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { completeWithRetry } from "@/services/ai/factory";
import { parsePracticeFeedback } from "@/services/ai/validate";
import { decideNextDifficulty, type AdaptiveState, type Difficulty } from "@/services/practice/adaptiveDifficulty";
import { calculateMastery } from "@/services/mastery/calculateMastery";
import { enforceRateLimit } from "@/services/security/enforceRateLimit";
import { recordStreakActivity } from "@/services/gamification/recordStreakActivity";
import { createNotificationIfNotDuplicate } from "@/services/notifications/createNotificationIfNotDuplicate";
import { checkStreakRecordAchievement, checkMasteryMilestoneAchievement } from "@/services/gamification/checkAchievements";
import { awardAchievement } from "@/services/gamification/awardAchievement";

const SubmitSchema = z.object({
  attemptId: z.string(),
  questionId: z.string(),
  studentAnswer: z.unknown(),
  timeTakenMs: z.number().int().positive(),
  confidence: z.number().int().min(1).max(5).optional(),
  adaptiveState: z.object({
    currentDifficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    consecutiveCorrect: z.number().int(),
    consecutiveWrong: z.number().int(),
    sameConceptMisses: z.number().int(),
  }),
});

const EXPECTED_TIME_MS: Record<Difficulty, number> = {
  EASY: 30_000,
  MEDIUM: 60_000,
  HARD: 120_000,
};

/** Server-side correctness check — never trusts the client's claim. */
function checkCorrectness(correctAnswer: unknown, studentAnswer: unknown): boolean {
  return JSON.stringify(correctAnswer) === JSON.stringify(studentAnswer);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = enforceRateLimit(user.id, "aiLightweight");
  if (limited) return limited;

  const parsed = SubmitSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { attemptId, questionId, studentAnswer, timeTakenMs, confidence, adaptiveState } = parsed.data;

  // Authorization: the attempt must belong to this user.
  const attempt = await prisma.attempt.findFirst({ where: { id: attemptId, userId: user.id } });
  if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  if (attempt.mode !== "practice" && attempt.mode !== "focus") {
    return NextResponse.json({ error: "This endpoint only accepts practice attempts" }, { status: 400 });
  }
  if (attempt.finishedAt) {
    return NextResponse.json({ error: "This practice session has already ended" }, { status: 409 });
  }

  // A question may only be answered once per attempt. Treat retries caused by
  // double taps/network replays as conflicts rather than re-running AI
  // feedback, mastery, streaks, notifications, and achievements.
  const existingAnswer = await prisma.answer.findUnique({
    where: { attemptId_questionId: { attemptId, questionId } },
    select: { id: true },
  });
  if (existingAnswer) {
    return NextResponse.json({ error: "This question has already been answered" }, { status: 409 });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { concept: true, topic: true, subtopic: true },
  });
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  if (attempt.topicId && question.topicId !== attempt.topicId) {
    return NextResponse.json({ error: "Question does not belong to this practice topic" }, { status: 403 });
  }

  const isCorrect = checkCorrectness(question.correctAnswer, studentAnswer);

  let answer;
  try {
    answer = await prisma.answer.create({
      data: { attemptId, questionId, studentAnswer: studentAnswer as object, isCorrect, timeTakenMs, confidence },
    });
  } catch {
    // A concurrent retry can still win the unique constraint between the
    // read above and this create. Surface it as a safe conflict.
    return NextResponse.json({ error: "This question has already been answered" }, { status: 409 });
  }

  // Check whether the *last* answer in this attempt hit the same concept,
  // to distinguish "repeated misconception" from "a new different mistake."
  const priorAnswers = await prisma.answer.findMany({
    where: { attemptId, id: { not: answer.id } },
    include: { question: { select: { conceptId: true } } },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  const sameConceptAsLast = priorAnswers[0]?.question.conceptId === question.conceptId;

  const decision = decideNextDifficulty(adaptiveState as AdaptiveState, {
    isCorrect,
    timeTakenMs,
    expectedTimeMs: EXPECTED_TIME_MS[question.difficulty],
    sameConceptAsLast,
  });

  // Get AI feedback + mistake analysis — validated server-side before trust.
  let feedback;
  try {
    const aiResponse = await completeWithRetry({
      tier: "fast",
      jsonMode: true,
      messages: [
        {
          role: "system",
          content:
            "You analyze a student's practice answer and return ONLY a JSON object matching this shape: " +
            `{"type":"practice_feedback","correct":boolean,"concept":string,"mistake_type":"conceptual"|"careless"|"procedural"|"misread"|"none","explanation":string,"mastery_delta":number (-10 to 10),"next_action":"review_concept"|"next_question"|"teach_concept"|"revise_mistakes","next_question_difficulty":"easy"|"medium"|"hard"}. No prose outside the JSON. Do not attempt to reconstruct or reveal the answer key.`,
        },
        {
          role: "user",
          content: `Question: ${question.prompt}\nStudent answer: ${JSON.stringify(studentAnswer)}\nServer-verified correctness: ${isCorrect}\nConcept: ${question.concept?.name ?? question.topic?.name ?? "unknown"}\nReference explanation: ${question.explanation ?? "Not provided."}`,
        },
      ],
    });
    const result = parsePracticeFeedback(aiResponse.content);
    feedback = "error" in result ? null : result;
  } catch {
    feedback = null; // AI failure handling: fall back below, never crash the flow
  }

  // Fallback feedback if AI failed or returned invalid JSON — flow keeps working.
  if (!feedback) {
    feedback = {
      type: "practice_feedback" as const,
      correct: isCorrect,
      concept: question.concept?.name ?? question.topic?.name ?? "this topic",
      mistake_type: isCorrect ? ("none" as const) : ("conceptual" as const),
      explanation: question.explanation ?? (isCorrect ? "Correct." : "That's not right — review the concept and try again."),
      mastery_delta: isCorrect ? 2 : -2,
      next_action: decision.action === "teach_concept" ? ("teach_concept" as const) : ("next_question" as const),
      next_question_difficulty: decision.nextDifficulty.toLowerCase() as "easy" | "medium" | "hard",
    };
  }

  // Mistake Vault: record/update on wrong answers.
  if (!isCorrect) {
    const existing = await prisma.mistake.findFirst({
      where: { userId: user.id, questionId, resolved: false },
    });
    if (existing) {
      await prisma.mistake.update({
        where: { id: existing.id },
        data: { occurrences: { increment: 1 }, updatedAt: new Date() },
      });
    } else {
      await prisma.mistake.create({
        data: {
          userId: user.id,
          questionId,
          conceptId: question.conceptId,
          studentAnswer: studentAnswer as object,
          correctAnswer: question.correctAnswer as object,
          mistakeType: feedback.mistake_type,
          explanation: feedback.explanation,
        },
      });
    }
  }

  // Recompute mastery for this concept/topic scope from recent answers.
  const scopeWhere = question.conceptId
    ? { conceptId: question.conceptId }
    : question.subtopicId
      ? { subtopicId: question.subtopicId }
      : { topicId: question.topicId };

  const recentAnswers = await prisma.answer.findMany({
    where: { question: scopeWhere, attempt: { userId: user.id } },
    include: { question: { select: { difficulty: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const repeatedMistakeCount = await prisma.mistake.count({
    where: {
      userId: user.id,
      resolved: false,
      occurrences: { gt: 1 },
      ...(question.conceptId
        ? { conceptId: question.conceptId }
        : question.subtopicId
          ? { question: { subtopicId: question.subtopicId } }
          : { question: { topicId: question.topicId } }),
    },
  });

  const { score, band } = calculateMastery({
    attempts: recentAnswers.map((a) => ({
      isCorrect: a.isCorrect,
      difficulty: a.question.difficulty,
      timestamp: a.createdAt,
      timeTakenMs: a.timeTakenMs,
      expectedTimeMs: EXPECTED_TIME_MS[a.question.difficulty],
      confidence: a.confidence,
    })),
    repeatedMistakeCount,
  });

  // Read the previous score first so trend is a real delta, not a placeholder.
  // (Nullable compound keys behave inconsistently as Prisma @@unique targets
  // across DB engines, so we do explicit find-then-write rather than upsert.)
  const existingMastery = await prisma.mastery.findFirst({ where: { userId: user.id, ...scopeWhere } });
  const trend = existingMastery ? Math.round((score - existingMastery.score) * 10) / 10 : 0;

  const mastery = existingMastery
    ? await prisma.mastery.update({
        where: { id: existingMastery.id },
        data: { score, band, trend },
      })
    : await prisma.mastery.create({
        data: { userId: user.id, ...scopeWhere, score, band, trend },
      });

  // Persist a lightweight topic-level history point so analytics can show
  // real mastery progression rather than only the current score.
  if (question.topicId) {
    await prisma.masterySnapshot.create({
      data: {
        userId: user.id,
        topicId: question.topicId,
        score,
        band,
      },
    });
  }

  // Achievement: fires only the moment this scope first reaches MASTERED —
  // see checkMasteryMilestoneAchievement's doc comment for why repeats and
  // lesser bands don't count.
  const scopeName = question.concept?.name ?? question.topic?.name ?? "this topic";
  const masteryAward = checkMasteryMilestoneAchievement(existingMastery?.band ?? null, band, scopeName);
  if (masteryAward) await awardAchievement(user.id, masteryAward);

  // Streak + notification: practice activity counts toward the daily
  // streak regardless of correctness — showing up is the behavior being
  // reinforced, not getting every answer right (see product spec's
  // "reward actual learning activity" gamification principle).
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

  return NextResponse.json({
    isCorrect,
    feedback,
    adaptive: decision,
    mastery: { score: mastery.score, band: mastery.band, trend: mastery.trend },
  });
}
