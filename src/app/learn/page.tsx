import { redirect } from "next/navigation";
import Link from "next/link";
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
      <h1 className="mb-1 text-2xl">Learn</h1>
      <p className="mb-6 text-sm text-ink/60">
        Your enrolled courses — set during onboarding based on the subjects you picked.
      </p>

      {courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Complete onboarding to get enrolled based on your subjects."
        />
      ) : (
        <div className="space-y-8">
          {courses.map((course) => (
            <div key={course.id}>
              <h2 className="mb-3 font-serif text-lg">{course.title}</h2>
              {course.subjects.map((subject) => (
                <div key={subject.id} className="mb-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/40">{subject.name}</p>
                  <div className="divide-y divide-line rounded-lg border border-line">
                    {subject.topics.map((topic) => (
                      <Link
                        key={topic.id}
                        href={`/practice/${topic.id}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-ink/5"
                      >
                        <span className="text-sm font-medium">{topic.name}</span>
                        {topic.mastery ? (
                          <MasteryBadge band={topic.mastery.band} />
                        ) : (
                          <span className="text-xs text-ink/40">Not started</span>
                        )}
                      </Link>
                    ))}
                    {subject.topics.length === 0 && (
                      <p className="px-4 py-3 text-sm text-ink/40">No topics yet.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <Link href="/materials" className="mt-6 inline-block text-sm text-cobalt underline underline-offset-2">
        Manage course material →
      </Link>
    </AppShell>
  );
}
