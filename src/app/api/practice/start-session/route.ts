import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTopic } from "@/lib/topic-access";

const RequestSchema = z.object({ topicId: z.string() });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const topic = await prisma.topic.findUnique({ where: { id: parsed.data.topicId } });
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  if (!(await canAccessTopic(user.id, user.role, topic.id))) {
    return NextResponse.json({ error: "Enroll in this course before starting practice" }, { status: 403 });
  }

  const attempt = await prisma.attempt.create({
    data: { userId: user.id, mode: "focus", topicId: topic.id },
  });

  return NextResponse.json({ attemptId: attempt.id, topicId: topic.id, topicName: topic.name });
}
