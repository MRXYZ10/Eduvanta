import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getEnrolledCourses } from "@/services/courses/getEnrolledCourses";
import { AppShell } from "@/components/AppShell";
import { MasteryBadge } from "@/components/ui/MasteryBadge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function LearnPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const courses = await getEnrolledCourses(user.id);

  return (
    <AppShell>
      <header className="studio-hero relative mb-8 p-6 sm:p-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cobalt/20 bg-cobalt-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-cobalt">
          <BookOpen className="h-3 w-3" strokeWidth={2} />
          Learning hub
        </div>

        <h1 className="text-3xl sm:text-4xl">Learn</h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
          Your enrolled courses and topics, now organized into short lessons, examples and adaptive quizzes.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-line/60 bg-paper/65 px-3 py-1.5 text-[11px] font-semibold text-ink/55">{courses.length} enrolled course{courses.length === 1 ? "" : "s"}</span>
          <span className="rounded-full border border-line/60 bg-paper/65 px-3 py-1.5 text-[11px] font-semibold text-ink/55">Short lessons</span>
          <span className="rounded-full border border-line/60 bg-paper/65 px-3 py-1.5 text-[11px] font-semibold text-ink/55">Adaptive quizzes</span>
        </div>
      </header>

      {courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Complete onboarding to get enrolled based on your subjects."
        />
      ) : (
        <div className="space-y-8">
          {courses.map((course) => (
            <section
              key={course.id}
              className="studio-card overflow-hidden"
            >
              <div className="border-b border-line/60 bg-cobalt-soft/25 px-5 py-5 sm:px-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cobalt/70">
                  Course
                </div>
                <h2 className="mt-1 text-xl font-serif tracking-tight">
                  {course.title}
                </h2>
              </div>

              <div className="p-4 sm:p-5">
                {course.subjects.map((subject) => (
                  <div key={subject.id} className="mb-6 last:mb-0">
                    <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/45">
                        {subject.name}
                      </p>

                      <span className="text-[10px] text-ink/35">
                        {subject.topics.length}{" "}
                        {subject.topics.length === 1 ? "topic" : "topics"}
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-line/60 bg-paper/45">
                      {subject.topics.map((topic) => (
                        <Link
                          key={topic.id}
                          href={`/learn/${topic.id}`}
                          className="group flex items-center gap-4 border-b border-line/50 px-4 py-4 transition-all duration-200 last:border-b-0 hover:bg-cobalt-soft/35 sm:px-5"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-xs font-semibold text-ink/45 transition-colors duration-200 group-hover:bg-cobalt-soft group-hover:text-cobalt">
                            →
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-ink">
                              {topic.name}
                            </div>

                            <div className="mt-1 text-xs text-ink/40">
                              {topic.mastery
                                ? "Continue learning"
                                : "Start this topic"}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {topic.mastery ? (
                              <MasteryBadge band={topic.mastery.band} />
                            ) : (
                              <span className="hidden rounded-full border border-line/60 bg-paper px-2.5 py-1 text-[10px] font-medium text-ink/40 sm:inline-flex">
                                Not started
                              </span>
                            )}

                            <ArrowRight
                              className="h-4 w-4 text-ink/25 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-cobalt"
                              strokeWidth={1.8}
                            />
                          </div>
                        </Link>
                      ))}

                      {subject.topics.length === 0 && (
                        <p className="px-5 py-5 text-sm text-ink/40">
                          No topics yet.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Link
        href="/learn/catalog"
        className="group mr-2 mt-7 inline-flex items-center gap-1.5 rounded-full border border-cobalt/20 bg-cobalt-soft px-3.5 py-2 text-xs font-medium text-cobalt transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
      >
        Explore course catalog
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.8} />
      </Link>

      <Link
        href="/materials"
        className="group mt-7 inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-paper/60 px-3.5 py-2 text-xs font-medium text-cobalt transition-all duration-200 hover:-translate-y-0.5 hover:bg-cobalt-soft hover:shadow-sm"
      >
        Manage course material
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          strokeWidth={1.8}
        />
      </Link>
    </AppShell>
  );
}