import { prisma } from "@/db/client";
import { createNotificationIfNotDuplicate } from "./createNotificationIfNotDuplicate";

/**
 * REACTIVE, not proactive: this fires when the student loads the dashboard
 * and finds pending sessions for today — it cannot notify someone who
 * never opens the app that day, since there's no background job runner or
 * push-notification infra in this stack. A real production deployment
 * would run this from a scheduled job (Vercel Cron / Supabase scheduled
 * functions) instead, likely combined with actual push notifications.
 * That's called out as follow-up work in ARCHITECTURE.md — this function
 * itself doesn't need to change when that's added, since the dedupe logic
 * already makes it safe to call from either place.
 */
export async function checkStudyReminder(userId: string): Promise<void> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const pendingToday = await prisma.studySession.count({
    where: { userId, status: "pending", scheduledFor: { gte: todayStart, lte: todayEnd } },
  });

  if (pendingToday === 0) return;

  // Title includes the date (implicitly, via the dedupe window below) —
  // using a fixed title text and a ~20h dedupe window means this fires at
  // most once per calendar day per student, not once per dashboard load.
  await createNotificationIfNotDuplicate({
    userId,
    type: "study_reminder",
    title: "You have study sessions scheduled today",
    body:
      pendingToday === 1
        ? "One session is waiting on your plan for today."
        : `${pendingToday} sessions are waiting on your plan for today.`,
  });
}
