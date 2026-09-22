import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTeacherOverview } from "@/services/teacher/getTeacherOverview";
import { AppShell } from "@/components/AppShell";
import { RemedialPracticeButton } from "@/components/teacher/RemedialPracticeButton";
import { AssignmentForm } from "@/components/teacher/AssignmentForm";
import { format } from "date-fns";

export default async function TeacherDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER" && user.role !== "ADMIN") redirect("/dashboard");

  const overview = await getTeacherOverview(user.id);

  return (
    <AppShell>
      <h1 className="mb-1 text-2xl">Teacher dashboard</h1>
      <p className="mb-8 text-sm text-ink/60">
        {overview.courses.length} course{overview.courses.length === 1 ? "" : "s"} · {overview.enrolledStudentCount} enrolled student{overview.enrolledStudentCount === 1 ? "" : "s"}
      </p>

      {overview.weakTopics.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-medium text-ink/80">Nova's class insights</h2>
          <div className="space-y-3">
            {overview.weakTopics.map((w) => (
              <div key={w.topicName} className="flex items-center justify-between rounded-lg border border-signal/30 bg-signal-soft px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {Math.round((w.strugglingStudentCount / w.studentCount) * 100)}% of students are struggling with{" "}
                    {w.topicName}.
                  </p>
                  <p className="mt-0.5 text-xs text-ink/60">
                    {w.strugglingStudentCount} of {w.studentCount} students below 40% mastery · class average {w.averageMastery}%
                  </p>
                </div>
                {w.topicId && <RemedialPracticeButton topicId={w.topicId} />}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-base font-medium text-ink/80">Class mastery by topic</h2>
        <div className="divide-y divide-line rounded-lg border border-line">
          {overview.classStats.length === 0 && (
            <p className="px-4 py-6 text-sm text-ink/50">No student mastery data yet.</p>
          )}
          {overview.classStats.map((t) => (
            <div key={t.topicName} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{t.topicName}</span>
              <span className="text-ink/60">
                {t.averageMastery}% avg · {t.studentCount} student{t.studentCount === 1 ? "" : "s"}
                {t.strugglingStudentCount > 0 && ` · ${t.strugglingStudentCount} struggling`}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-medium text-ink/80">Assignments</h2>
        <div className="mb-3 divide-y divide-line rounded-lg border border-line">
          {overview.assignments.length === 0 && <p className="px-4 py-6 text-sm text-ink/50">No assignments yet.</p>}
          {overview.assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{a.title}</span>
              <span className="text-xs text-ink/50">{a.dueDate ? format(a.dueDate, "MMM d, yyyy") : "No due date"}</span>
            </div>
          ))}
        </div>
        <AssignmentForm courses={overview.courses.map((c) => ({ id: c.id, title: c.title }))} />
      </section>
    </AppShell>
  );
}
