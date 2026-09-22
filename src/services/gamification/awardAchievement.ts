import { prisma } from "@/db/client";
import type { AchievementAward } from "./checkAchievements";

/**
 * Persists an achievement unless one with the same (userId, type, label)
 * already exists — a mastery milestone or exam personal best should only
 * ever be recorded once, unlike notifications which can legitimately
 * repeat with a time-based dedupe window (see
 * createNotificationIfNotDuplicate). Achievements are permanent, so the
 * dedupe here is unconditional rather than windowed.
 */
export async function awardAchievement(userId: string, award: AchievementAward): Promise<boolean> {
  const existing = await prisma.achievement.findFirst({
    where: { userId, type: award.type, label: award.label },
  });
  if (existing) return false;

  await prisma.achievement.create({ data: { userId, type: award.type, label: award.label } });
  return true;
}
