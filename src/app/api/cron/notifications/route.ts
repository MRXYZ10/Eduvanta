import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db/client";
import { createNotificationIfNotDuplicate } from "@/services/notifications/createNotificationIfNotDuplicate";

/** Daily server-side notification job. Protect with CRON_SECRET on Vercel. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || supplied !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  let created = 0;

  const dueAssignments = await prisma.assignment.findMany({
    where: { dueDate: { gt: now, lte: tomorrow } },
    select: { id: true, title: true, dueDate: true, course: { select: { title: true, enrollments: { select: { userId: true } } } } },
  });

  for (const assignment of dueAssignments) {
    for (const enrollment of assignment.course.enrollments) {
      await createNotificationIfNotDuplicate({
        userId: enrollment.userId,
        type: "assignment_due",
        title: "Assignment due soon",
        body: `${assignment.title} for ${assignment.course.title} is due within 24 hours.`,
      });
      created++;
    }
  }

  const sessions = await prisma.studySession.findMany({
    where: { scheduledFor: { gt: now, lte: tomorrow }, status: "pending" },
    select: { id: true, userId: true, topicLabel: true, scheduledFor: true },
  });

  for (const session of sessions) {
    await createNotificationIfNotDuplicate({
      userId: session.userId,
      type: "study_reminder",
      title: "Study session coming up",
      body: `${session.topicLabel} is scheduled for your next study session.`,
    });
    created++;
  }

  return NextResponse.json({ ok: true, created });
}
