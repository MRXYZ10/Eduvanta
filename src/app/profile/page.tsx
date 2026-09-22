import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/db/client";
import { AppShell } from "@/components/AppShell";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { format } from "date-fns";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [streak, achievements] = await Promise.all([
    prisma.streak.findUnique({ where: { userId: user.id } }),
    prisma.achievement.findMany({ where: { userId: user.id }, orderBy: { earnedAt: "desc" } }),
  ]);

  return (
    <AppShell>
      <h1 className="mb-2 text-2xl">{user.profile?.fullName ?? "Your profile"}</h1>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between border-b border-line py-2">
          <dt className="text-ink/60">Exam goal</dt>
          <dd>{user.profile?.examGoal ?? "Not set"}</dd>
        </div>
        <div className="flex justify-between border-b border-line py-2">
          <dt className="text-ink/60">Daily study time</dt>
          <dd>{user.profile?.dailyStudyMinutes ? `${user.profile.dailyStudyMinutes} min` : "Not set"}</dd>
        </div>
        <div className="flex justify-between border-b border-line py-2">
          <dt className="text-ink/60">Current streak</dt>
          <dd>{streak?.currentStreak ?? 0} day{streak?.currentStreak === 1 ? "" : "s"}</dd>
        </div>
        <div className="flex justify-between border-b border-line py-2">
          <dt className="text-ink/60">Longest streak</dt>
          <dd>{streak?.longestStreak ?? 0} day{streak?.longestStreak === 1 ? "" : "s"}</dd>
        </div>
      </dl>

      <a href="/analytics" className="mt-4 inline-block text-sm text-cobalt underline underline-offset-2">
        View full analytics →
      </a>

      <h2 className="mb-2 mt-8 text-base font-medium text-ink/80">Achievements</h2>
      {achievements.length === 0 ? (
        <p className="text-sm text-ink/50">Keep learning — real milestones show up here, not points for clicking.</p>
      ) : (
        <div className="divide-y divide-line rounded-lg border border-line">
          {achievements.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{a.label}</span>
              <span className="text-xs text-ink/50">{format(a.earnedAt, "MMM d, yyyy")}</span>
            </div>
          ))}
        </div>
      )}

      {/* Desktop already has logout in the sidebar footer — this is the
          mobile-only path since the bottom nav has no room to spare. */}
      <LogoutButton className="mt-6 flex items-center gap-2 text-sm text-ink/60 md:hidden" />
    </AppShell>
  );
}
