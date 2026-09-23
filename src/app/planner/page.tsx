import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/db/client";
import { AppShell } from "@/components/AppShell";
import { PlanForm } from "@/components/planner/PlanForm";
import { ActivePlanView } from "@/components/planner/ActivePlanView";
import { CalendarDays, Sparkles } from "lucide-react";

export default async function PlannerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [topics, activePlan] = await Promise.all([
    prisma.topic.findMany({ orderBy: { order: "asc" } }),
    prisma.studyPlan.findFirst({
      where: { userId: user.id, active: true },
      include: { sessions: { orderBy: { scheduledFor: "asc" } } },
    }),
  ]);

  return (
    <AppShell>
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal/25 bg-signal-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-signal">
          <Sparkles className="h-3 w-3" strokeWidth={2} />
          Adaptive planning
        </div>

        <h1 className="text-3xl sm:text-4xl">Study plan</h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
          Nova builds your plan around what you need to work on and rebalances
          it when you fall behind.
        </p>
      </header>

      <section className="rounded-3xl border border-line/70 bg-paper/60 p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3 border-b border-line/50 pb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cobalt-soft text-cobalt">
            <CalendarDays className="h-5 w-5" strokeWidth={1.8} />
          </div>

          <div>
            <h2 className="text-lg font-medium">
              {activePlan ? "Your active plan" : "Create your plan"}
            </h2>
            <p className="mt-1 text-xs text-ink/45">
              {activePlan
                ? "Your scheduled sessions are ready to work through."
                : "Choose your topics and let Nova build the schedule."}
            </p>
          </div>
        </div>

        {activePlan ? (
          <ActivePlanView
            sessions={activePlan.sessions.map((s) => ({
              id: s.id,
              scheduledFor: s.scheduledFor.toISOString(),
              durationMin: s.durationMin,
              topicLabel: s.topicLabel,
              status: s.status,
            }))}
            targetDate={activePlan.targetDate?.toISOString() ?? null}
          />
        ) : (
          <PlanForm
            topics={topics.map((t) => ({ id: t.id, name: t.name }))}
          />
        )}
      </section>
    </AppShell>
  );
}