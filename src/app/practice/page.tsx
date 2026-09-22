import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/db/client";
import { AppShell } from "@/components/AppShell";
import { MasteryBadge } from "@/components/ui/MasteryBadge";

export default async function PracticeIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [topics, exams] = await Promise.all([
    prisma.topic.findMany({
      include: { masteries: { where: { userId: user.id } } },
      orderBy: { order: "asc" },
    }),
    prisma.exam.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl">Practice</h1>

      <div className="mb-8">
        <Link href="/focus" className="flex items-center justify-between rounded-lg border border-line px-4 py-3 hover:bg-ink/5">
          <span className="text-sm font-medium">Start a Focus Mode session</span>
          <span className="text-xs text-ink/50">Distraction-free, timed</span>
        </Link>
      </div>

      {exams.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-2 text-base font-medium text-ink/80">Mock exams</h2>
          <div className="divide-y divide-line rounded-lg border border-line">
            {exams.map((e) => (
              <Link key={e.id} href={`/exam/${e.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-ink/5">
                <span className="text-sm font-medium">{e.title}</span>
                <span className="text-xs text-ink/50">{e.durationMin} min</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-2 text-base font-medium text-ink/80">Adaptive practice</h2>
      <div className="divide-y divide-line rounded-lg border border-line">
        {topics.map((t) => {
          const mastery = t.masteries[0];
          return (
            <Link key={t.id} href={`/practice/${t.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-ink/5">
              <span className="text-sm font-medium">{t.name}</span>
              {mastery ? <MasteryBadge band={mastery.band} /> : <span className="text-xs text-ink/40">Not started</span>}
            </Link>
          );
        })}
        {topics.length === 0 && <p className="px-4 py-6 text-sm text-ink/50">No topics yet.</p>}
      </div>
    </AppShell>
  );
}
