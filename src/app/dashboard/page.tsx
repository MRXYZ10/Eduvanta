import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/services/dashboard/getDashboardData";
import { checkStudyReminder } from "@/services/notifications/checkStudyReminder";
import { AppShell } from "@/components/AppShell";
import { TodaysPlan } from "@/components/dashboard/TodaysPlan";
import { LearningIntelligence } from "@/components/dashboard/LearningIntelligence";
import { AiRecommendations } from "@/components/dashboard/AiRecommendations";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "TEACHER") redirect("/teacher");
  if (!user.profile?.onboardedAt) redirect("/onboarding");

  const data = await getDashboardData(user.id);
  await checkStudyReminder(user.id); // reactive, deduped

  return (
    <AppShell>
      <header className="relative mb-8 overflow-hidden rounded-3xl border border-line/70 bg-paper/70 p-6 shadow-sm sm:p-7">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cobalt/10 blur-2xl" />
        <div className="absolute -bottom-16 right-20 h-24 w-24 rounded-full bg-signal/10 blur-2xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center rounded-full border border-cobalt/20 bg-cobalt-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-cobalt">
              Your learning space
            </div>

            <h1 className="text-3xl leading-tight sm:text-4xl">
              {greeting()}, {data.firstName}
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-ink/60">
              Here's what will move you forward today. Keep the momentum going.
            </p>
          </div>

          <div className="hidden shrink-0 sm:block">
            <div className="rounded-2xl border border-line/60 bg-paper/80 px-4 py-3 text-right shadow-sm">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/40">
                Today
              </div>
              <div className="mt-1 text-sm font-medium text-ink">
                Focus on progress
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-10">
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium tracking-tight text-ink">
                Today&apos;s plan
              </h2>
              <p className="mt-1 text-xs text-ink/45">
                Your focused study sessions for today.
              </p>
            </div>

            <a
              href="/planner"
              className="shrink-0 rounded-full border border-line/70 bg-paper/60 px-3 py-1.5 text-xs font-medium text-cobalt transition-all duration-200 hover:-translate-y-0.5 hover:bg-cobalt-soft hover:shadow-sm"
            >
              View study plan -&gt;
            </a>
          </div>

          <TodaysPlan sessions={data.todaySessions} />
        </section>

        <LearningIntelligence
          overallMastery={data.overallMastery}
          examReadiness={data.examReadiness}
          examReadinessBreakdown={data.examReadinessBreakdown}
          weeklyImprovement={data.weeklyImprovement}
        />

        <AiRecommendations recommendations={data.recommendations} />

        <section>
          <a href="/mistakes" className="text-sm text-cobalt underline underline-offset-2">
            Review your Mistake Vault -&gt;
          </a>
        </section>
      </div>
    </AppShell>
  );
}
