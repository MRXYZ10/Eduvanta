import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAnalyticsOverview } from "@/services/analytics/getAnalyticsOverview";
import { AppShell } from "@/components/AppShell";
import { MasteryBadge } from "@/components/ui/MasteryBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AccuracyTrendChart,
  StudyTimeTrendChart,
  MasteryByTopicChart,
  MasteryHistoryChart,
} from "@/components/analytics/AnalyticsCharts";
import {
  BarChart3,
  BrainCircuit,
  Clock3,
  Flame,
  Target,
} from "lucide-react";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = await getAnalyticsOverview(user.id);

  return (
    <AppShell>
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cobalt/20 bg-cobalt-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-cobalt">
          <BarChart3 className="h-3 w-3" strokeWidth={2} />
          Learning analytics
        </div>

        <h1 className="text-3xl sm:text-4xl">Analytics</h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
          See how you are actually doing, not just how much you have clicked
          through.
        </p>
      </header>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-line/70 bg-paper/60 p-5 shadow-sm">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-cobalt-soft text-cobalt">
            <Target className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div className="text-3xl font-serif">{data.overallAccuracy}%</div>
          <div className="mt-1 text-xs text-ink/50">Overall accuracy</div>
        </div>

        <div className="rounded-2xl border border-line/70 bg-paper/60 p-5 shadow-sm">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-signal-soft text-signal">
            <BrainCircuit className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div className="text-3xl font-serif">
            {data.totalQuestionsAnswered}
          </div>
          <div className="mt-1 text-xs text-ink/50">
            Questions answered
          </div>
        </div>

        <div className="rounded-2xl border border-line/70 bg-paper/60 p-5 shadow-sm">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-mastery-mastered/10 text-mastery-mastered">
            <Flame className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div className="text-3xl font-serif">{data.streak.current}</div>
          <div className="mt-1 text-xs text-ink/50">Current streak</div>
        </div>

        <div className="rounded-2xl border border-line/70 bg-paper/60 p-5 shadow-sm">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-ink/5 text-ink/50">
            <Clock3 className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div className="text-3xl font-serif">{data.streak.longest}</div>
          <div className="mt-1 text-xs text-ink/50">Longest streak</div>
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-3xl border border-line/70 bg-paper/60 p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="text-lg font-medium">Accuracy</h2>
            <p className="mt-1 text-xs text-ink/45">
              Last 14 days
            </p>
          </div>
          <AccuracyTrendChart data={data.dailyTrend} />
        </section>

        <section className="rounded-3xl border border-line/70 bg-paper/60 p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="text-lg font-medium">Study time</h2>
            <p className="mt-1 text-xs text-ink/45">
              Last 14 days
            </p>
          </div>
          <StudyTimeTrendChart data={data.dailyTrend} />
        </section>

        <section className="rounded-3xl border border-line/70 bg-paper/60 p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="text-lg font-medium">Mastery by topic</h2>
            <p className="mt-1 text-xs text-ink/45">
              Current topic-level performance
            </p>
          </div>
          <MasteryByTopicChart data={data.masteryByTopic} />
        </section>

        <section className="rounded-3xl border border-line/70 bg-paper/60 p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="text-lg font-medium">Mastery over time</h2>
            <p className="mt-1 text-xs text-ink/45">
              Real topic-level progress from your practice history
            </p>
          </div>
          <MasteryHistoryChart data={data.masteryHistory} />
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-medium">Weak areas</h2>
            <p className="mt-1 text-xs text-ink/45">
              Topics that need additional attention.
            </p>
          </div>

          {data.weakAreas.length === 0 ? (
            <EmptyState
              title="No weak areas flagged right now"
              description="Keep practicing to keep it that way."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line/70 bg-paper/60 shadow-sm">
              {data.weakAreas.map((w) => (
                <div
                  key={w.topicName}
                  className="flex items-center justify-between gap-4 border-b border-line/50 px-5 py-4 last:border-b-0"
                >
                  <span className="min-w-0 truncate text-sm font-medium">
                    {w.topicName}
                  </span>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-ink/45">
                      {w.score}%
                    </span>
                    <MasteryBadge band={w.band} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}