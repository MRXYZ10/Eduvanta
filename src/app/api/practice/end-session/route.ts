import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { getSessionSummary } from "@/services/practice/getSessionSummary";

const RequestSchema = z.object({ attemptId: z.string() });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const attempt = await prisma.attempt.findFirst({ where: { id: parsed.data.attemptId, userId: user.id } });
  if (!attempt) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Idempotent: ending an already-ended session just returns its summary
  // again rather than erroring — a duplicate "end session" call (e.g. from
  // a timer race with a manual end-session click) shouldn't be a hard failure.
  if (!attempt.finishedAt) {
    await prisma.attempt.update({ where: { id: attempt.id }, data: { finishedAt: new Date() } });
  }

  const summary = await getSessionSummary(attempt.id, user.id);
  return NextResponse.json({ summary });
}
