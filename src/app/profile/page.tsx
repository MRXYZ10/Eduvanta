import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/db/client";
import { AppShell } from "@/components/AppShell";
import { LogoutButton } from "@/components/auth/LogoutButton";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Flame,
  Trophy,
} from "lucide-react";
import { format } from "date-fns";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [streak, achievements] = await Promise.all([
    prisma.streak.findUnique({ where: { userId: user.id } }),
    prisma.achievement.findMany({
      where: { userId: user.id },
      orderBy: { earnedAt: "desc" },
    }),
  ]);

  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;

  return (
    <AppShell>
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cobalt/20 bg-cobalt-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-cobalt">
          Your profile
        </div>

        <h1 className="text-3xl sm:text-4xl">
          {user.profile?.fullName ?? "Your profile"}
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
          Your learning preferences, streaks, and milestones in one place.
        </p>
      </header>

      <div className="space-y-6">
        <section className="rounded-3xl border border-line/70 bg-paper/60 p-5 shadow-sm sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-line/60 bg-paper/50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-cobalt" strokeWidth={1.9} />
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/45">
                  Study setup
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 border-b border-line/50 pb-3">
                  <span className="text-sm text-ink/55">Exam goal</span>
                  <span className="text-sm font-medium text-right">
                    {user.profile?.examGoal ?? "Not set"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-ink/55">Daily study time</span>
                  <span className="text-sm font-medium">
                    {user.profile?.dailyStudyMinutes
                      ? `${user.profile.dailyStudyMinutes} min`
                      : "Not set"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-line/60 bg-cobalt-soft/40 p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-cobalt text-white">
                  <Flame className="h-4 w-4" strokeWidth={1.9} />
                </div>
                <div className="text-3xl font-serif tracking-tight">
                  {currentStreak}
                </div>
                <div className="mt-1 text-xs text-ink/50">
                  Current streak
                </div>
              </div>

              <div className="rounded-2xl border border-line/60 bg-signal-soft/40 p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-signal text-white">
                  <Trophy className="h-4 w-4" strokeWidth={1.9} />
                </div>
                <div className="text-3xl font-serif tracking-tight">
                  {longestStreak}
                </div>
                <div className="mt-1 text-xs text-ink/50">
                  Longest streak
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/analytics"
            className="group mt-4 inline-flex items-center gap-2 rounded-full border border-line/70 bg-paper/70 px-3.5 py-2 text-xs font-medium text-cobalt transition-all duration-200 hover:-translate-y-0.5 hover:bg-cobalt-soft hover:shadow-sm"
          >
            <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.8} />
            View full analytics
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={1.8}
            />
          </Link>
        </section>

        <section>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-signal" strokeWidth={1.9} />
              <h2 className="text-lg font-medium text-ink">
                Achievements
              </h2>
            </div>

            <p className="mt-1 text-xs text-ink/45">
              Milestones earned through genuine learning activity.
            </p>
          </div>

          {achievements.length === 0 ? (
            <div className="rounded-2xl border border-line/70 bg-paper/60 px-5 py-8 text-sm leading-6 text-ink/50 shadow-sm">
              Keep learning — real milestones will show up here.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line/70 bg-paper/60 shadow-sm">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-4 border-b border-line/50 px-5 py-4 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-signal-soft text-signal">
                      <Trophy className="h-4 w-4" strokeWidth={1.8} />
                    </div>

                    <span className="truncate text-sm font-medium">
                      {a.label}
                    </span>
                  </div>

                  <span className="shrink-0 text-xs text-ink/40">
                    {format(a.earnedAt, "MMM d, yyyy")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="md:hidden">
          <LogoutButton className="flex items-center gap-2 rounded-xl border border-line/70 px-4 py-2.5 text-sm text-ink/60 transition-colors hover:bg-ink/5" />
        </div>
      </div>
    </AppShell>
  );
}