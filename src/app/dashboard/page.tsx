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
  await checkStudyReminder(user.id); // reactive, dedup'd — see checkStudyReminder.ts

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="text-2xl">
          {greeting()}, {data.firstName}
        </h1>
        <p className="mt-1 text-sm text-ink/60">Here's what will move you forward today.</p>
      </header>

      <div className="space-y-10">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-medium text-ink/80">Today's plan</h2>
            <a href="/planner" className="text-xs text-cobalt underline underline-offset-2">
              View study plan
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
            Review your Mistake Vault →
          </a>
        </section>
      </div>
    </AppShell>
  );
}
