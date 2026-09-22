import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/db/client";
import { AppShell } from "@/components/AppShell";
import { PlanForm } from "@/components/planner/PlanForm";
import { ActivePlanView } from "@/components/planner/ActivePlanView";

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
      <h1 className="mb-1 text-2xl">Study plan</h1>
      <p className="mb-6 text-sm text-ink/60">
        Nova builds this around what you're actually weak at, and rebalances it if you fall behind.
      </p>

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
        <PlanForm topics={topics.map((t) => ({ id: t.id, name: t.name }))} />
      )}
    </AppShell>
  );
}
