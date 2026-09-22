import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { generateValidatedQuestion } from "@/services/ai/generateQuestion";
import { enforceRateLimit } from "@/services/security/enforceRateLimit";

const RequestSchema = z.object({ topicId: z.string(), difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("EASY") });
const QUESTION_COUNT = 5; // "Generate a targeted mini lesson + 5 practice questions" — mini lesson is Nova's job in-app; this covers the 5 questions

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  try {
    requireRole(user, ["TEACHER", "ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Only teachers or admins can generate remedial practice" }, { status: 403 });
  }

  // aiGeneration bucket: this route fires up to 5 AI calls per request
  // (one per question), so it uses the stricter hourly bucket rather than
  // the per-message chat bucket.
  const limited = enforceRateLimit(user.id, "aiGeneration");
  if (limited) return limited;

  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { topicId, difficulty } = parsed.data;

  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  const results = await Promise.all(
    Array.from({ length: QUESTION_COUNT }, () => generateValidatedQuestion({ topicName: topic.name, difficulty })),
  );

  const created = [];
  const failed = [];
  for (const result of results) {
    if (!result.validated || !result.question) {
      failed.push(result.issues.join("; ") || "Unknown validation failure");
      continue;
    }
    const q = result.question;
    const row = await prisma.question.create({
      data: {
        topicId,
        type: q.type,
        difficulty: q.difficulty,
        prompt: q.prompt,
        explanation: q.explanation,
        source: "AI_GENERATED",
        validated: true, // only ever true here — unvalidated ones never reach `created`
        correctAnswer: q.correctAnswer as object,
        metadata: q.learningObjective ? { learningObjective: q.learningObjective } : undefined,
        options: q.options
          ? { create: q.options.map((o, i) => ({ label: o.label, isCorrect: o.isCorrect, order: i })) }
          : undefined,
      },
    });
    created.push(row);
  }

  return NextResponse.json({
    createdCount: created.length,
    failedCount: failed.length,
    message:
      failed.length > 0
        ? `${created.length} question(s) generated and validated. ${failed.length} failed validation and were discarded rather than shown to students.`
        : `${created.length} question(s) generated and validated for ${topic.name}.`,
  });
}
