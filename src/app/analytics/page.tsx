import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAnalyticsOverview } from "@/services/analytics/getAnalyticsOverview";
import { AppShell } from "@/components/AppShell";
import { MasteryBadge } from "@/components/ui/MasteryBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AccuracyTrendChart, StudyTimeTrendChart, MasteryByTopicChart } from "@/components/analytics/AnalyticsCharts";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = await getAnalyticsOverview(user.id);

  return (
    <AppShell>
      <h1 className="mb-1 text-2xl">Analytics</h1>
      <p className="mb-8 text-sm text-ink/60">How you're actually doing, not just how much you've clicked through.</p>

      <div className="mb-8 grid grid-cols-2 gap-4 rounded-lg border border-line px-4 py-4 md:grid-cols-4">
        <div>
          <div className="text-2xl font-serif">{data.overallAccuracy}%</div>
          <div className="text-xs text-ink/60">Overall accuracy</div>
        </div>
        <div>
          <div className="text-2xl font-serif">{data.totalQuestionsAnswered}</div>
          <div className="text-xs text-ink/60">Questions answered</div>
        </div>
        <div>
          <div className="text-2xl font-serif">{data.streak.current}</div>
          <div className="text-xs text-ink/60">Current streak</div>
        </div>
        <div>
          <div className="text-2xl font-serif">{data.streak.longest}</div>
          <div className="text-xs text-ink/60">Longest streak</div>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-medium text-ink/80">Accuracy — last 14 days</h2>
        <div className="rounded-lg border border-line px-4 py-4">
          <AccuracyTrendChart data={data.dailyTrend} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-medium text-ink/80">Study time — last 14 days</h2>
        <div className="rounded-lg border border-line px-4 py-4">
          <StudyTimeTrendChart data={data.dailyTrend} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-medium text-ink/80">Mastery by topic</h2>
        <div className="rounded-lg border border-line px-4 py-4">
          <MasteryByTopicChart data={data.masteryByTopic} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-medium text-ink/80">Weak areas</h2>
        {data.weakAreas.length === 0 ? (
          <EmptyState title="No weak areas flagged right now" description="Keep practicing to keep it that way." />
        ) : (
          <div className="divide-y divide-line rounded-lg border border-line">
            {data.weakAreas.map((w) => (
              <div key={w.topicName} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span>{w.topicName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink/50">{w.score}%</span>
                  <MasteryBadge band={w.band} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
