import { prisma } from "@/db/client";

export type NotificationType = "study_reminder" | "assignment_due" | "exam_reminder" | "recommendation" | "streak";

/**
 * Creates a notification unless a matching one was already sent recently —
 * per the product spec's explicit "do not spam users." "Matching" means
 * same user + type + title within the dedupeWindowHours window, so e.g.
 * a streak notification won't fire twice for the same streak length, and
 * a study reminder for the same session won't repeat every time a page
 * that happens to check for it gets loaded.
 */
export async function createNotificationIfNotDuplicate(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  dedupeWindowHours?: number;
}): Promise<boolean> {
  const dedupeWindowHours = params.dedupeWindowHours ?? 20; // just under a day, so a daily reminder can re-fire the next day
  const since = new Date(Date.now() - dedupeWindowHours * 60 * 60_000);

  const existing = await prisma.notification.findFirst({
    where: { userId: params.userId, type: params.type, title: params.title, createdAt: { gte: since } },
  });
  if (existing) return false;

  await prisma.notification.create({
    data: { userId: params.userId, type: params.type, title: params.title, body: params.body },
  });
  return true;
}
