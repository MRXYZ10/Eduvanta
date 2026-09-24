import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Clock3,
  Flame,
  Target,
  Trophy,
  Sparkles,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/db/client";
import { AppShell } from "@/components/AppShell";
import { MasteryBadge } from "@/components/ui/MasteryBadge";

export default async function PracticeIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const enrolledCourses =
    user.role === "ADMIN" || user.role === "TEACHER"
      ? []
      : await prisma.enrollment.findMany({
          where: { userId: user.id },
          select: { courseId: true },
        });

  const enrolledCourseIds = enrolledCourses.map((enrollment) => enrollment.courseId);

  const [topics, exams] = await Promise.all([
    prisma.topic.findMany({
      where:
        user.role === "ADMIN" || user.role === "TEACHER"
          ? undefined
          : { subject: { courseId: { in: enrolledCourseIds } } },
      include: {
        masteries: { where: { userId: user.id } },
        subject: { select: { name: true, course: { select: { title: true } } } },
      },
      orderBy: { order: "asc" },
    }),
    prisma.exam.findMany({
      where:
        user.role === "ADMIN" || user.role === "TEACHER"
          ? undefined
          : { OR: [{ courseId: null }, { courseId: { in: enrolledCourseIds } }] },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <AppShell>
      <header className="studio-hero relative mb-8 p-6 sm:p-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cobalt/20 bg-cobalt-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-cobalt">
          <Target className="h-3 w-3" strokeWidth={2} />
          Practice hub
        </div>

        <h1 className="text-3xl sm:text-4xl">Practice</h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
          Build confidence with adaptive quizzes that respond to your answers, surface weak concepts, and keep every session moving.
        </p>
        <div className="mt-6 grid max-w-xl grid-cols-3 gap-2">
          <div className="rounded-2xl border border-line/60 bg-paper/60 p-3"><div className="text-lg font-semibold text-ink">{topics.length}</div><div className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">Topics</div></div>
          <div className="rounded-2xl border border-line/60 bg-paper/60 p-3"><div className="text-lg font-semibold text-ink">∞</div><div className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">1,000+ / topic</div></div>
          <div className="rounded-2xl border border-line/60 bg-paper/60 p-3"><div className="text-lg font-semibold text-ink">{exams.length}</div><div className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">Mocks</div></div>
        </div>
      </header>

      <div className="mb-8">
        <Link
          href="/focus"
          className="group relative block overflow-hidden rounded-3xl border border-cobalt/20 bg-cobalt-soft/55 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6"
        >
          <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-cobalt/10 blur-2xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cobalt text-white shadow-sm">
                <Flame className="h-5 w-5" strokeWidth={1.9} />
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cobalt/70">
                  Recommended
                </div>
                <h2 className="mt-1 text-lg font-semibold text-ink">
                  Start a Focus Mode session
                </h2>
                <p className="mt-1 text-sm text-ink/60">
                  Distraction-free, timed practice for a focused study block.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-cobalt">
              Start session
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                strokeWidth={1.9}
              />
            </div>
          </div>
        </Link>
      </div>

      {exams.length > 0 && (
        <section className="mb-8">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-signal" strokeWidth={1.9} />
              <h2 className="text-lg font-medium text-ink">
                Mock exams
              </h2>
            </div>
            <p className="mt-1 text-xs text-ink/45">
              Test yourself under exam-style conditions.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line/70 bg-paper/60 shadow-sm">
            {exams.map((e) => (
              <Link
                key={e.id}
                href={`/exam/${e.id}`}
                className="group flex items-center gap-4 border-b border-line/50 px-5 py-4 transition-all duration-200 last:border-b-0 hover:bg-signal-soft/35"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-signal-soft text-signal">
                  <Clock3 className="h-4 w-4" strokeWidth={1.8} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">
                    {e.title}
                  </div>
                  <div className="mt-1 text-xs text-ink/45">
                    Timed mock examination
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden rounded-full border border-line/60 bg-paper px-2.5 py-1 text-[10px] font-medium text-ink/45 sm:inline-flex">
                    {e.durationMin} min
                  </span>
                  <ArrowRight
                    className="h-4 w-4 text-ink/25 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-signal"
                    strokeWidth={1.8}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-cobalt" strokeWidth={1.9} />
            <h2 className="text-lg font-medium text-ink">
              Adaptive practice
            </h2>
          </div>
          <p className="mt-1 text-xs text-ink/45">
            Practice topics based on your current mastery.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {topics.map((t) => {
            const mastery = t.masteries[0];

            return (
              <Link
                key={t.id}
                href={`/practice/${t.id}`}
                className="group flex min-h-36 flex-col justify-between rounded-3xl border border-line/70 bg-paper/65 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-cobalt/25 hover:bg-cobalt-soft/30 hover:shadow-lg hover:shadow-cobalt/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt"><Sparkles className="h-4 w-4" /></div>
                  {mastery ? <MasteryBadge band={mastery.band} /> : <span className="rounded-full border border-line/60 bg-paper px-2.5 py-1 text-[10px] font-medium text-ink/40">New</span>}
                </div>
                <div className="mt-5 min-w-0">
                  <div className="truncate text-base font-semibold tracking-tight text-ink">{t.name}</div>
                  <div className="mt-1 truncate text-xs text-ink/40">{t.subject.course.title} · {mastery ? `Mastery ${Math.round(mastery.score)}%` : "Ready to learn"}</div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs font-medium text-cobalt"><span>{mastery ? "Continue quiz" : "Start quiz"}</span><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
              </Link>
            );
          })}

          {topics.length === 0 && (
            <p className="px-5 py-7 text-sm text-ink/50">
              No topics yet.
            </p>
          )}
        </div>
      </section>
    </AppShell>
  );
}