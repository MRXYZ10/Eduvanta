import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAdminOverview } from "@/services/admin/getAdminOverview";
import { AppShell } from "@/components/AppShell";
import { format } from "date-fns";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const overview = await getAdminOverview();

  return (
    <AppShell>
      <h1 className="mb-1 text-2xl">Admin</h1>
      <p className="mb-8 text-sm text-ink/60">
        System-wide view — users, content, and AI usage. <a href="/teacher" className="text-cobalt underline underline-offset-2">View teacher dashboard →</a>
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-medium text-ink/80">Users</h2>
        <div className="mb-3 grid grid-cols-3 gap-4 rounded-lg border border-line px-4 py-4">
          <div>
            <div className="text-2xl font-serif">{overview.users.byRole.STUDENT}</div>
            <div className="text-xs text-ink/60">Students</div>
          </div>
          <div>
            <div className="text-2xl font-serif">{overview.users.byRole.TEACHER}</div>
            <div className="text-xs text-ink/60">Teachers</div>
          </div>
          <div>
            <div className="text-2xl font-serif">{overview.users.byRole.ADMIN}</div>
            <div className="text-xs text-ink/60">Admins</div>
          </div>
        </div>
        <div className="divide-y divide-line rounded-lg border border-line">
          {overview.users.recent.map((u) => (
            <div key={u.email} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{u.email}</span>
              <span className="text-xs text-ink/50">
                {u.role} · joined {format(u.createdAt, "MMM d, yyyy")}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-medium text-ink/80">Content</h2>
        <div className="grid grid-cols-4 gap-4 rounded-lg border border-line px-4 py-4">
          <div>
            <div className="text-2xl font-serif">{overview.content.courseCount}</div>
            <div className="text-xs text-ink/60">Courses</div>
          </div>
          <div>
            <div className="text-2xl font-serif">{overview.content.totalQuestions}</div>
            <div className="text-xs text-ink/60">Questions</div>
          </div>
          <div>
            <div className="text-2xl font-serif">{overview.content.aiGeneratedQuestions}</div>
            <div className="text-xs text-ink/60">AI-generated</div>
          </div>
          <div>
            <div className="text-2xl font-serif">{overview.content.examCount}</div>
            <div className="text-xs text-ink/60">Exams</div>
          </div>
        </div>
        {overview.content.unvalidatedQuestions > 0 && (
          <p className="mt-2 text-xs text-mastery-attention">
            {overview.content.unvalidatedQuestions} question(s) exist without passing validation — this shouldn't
            happen under normal operation and is worth investigating.
          </p>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-medium text-ink/80">AI usage</h2>
        <p className="mb-2 text-xs text-ink/40">
          Derived from stored records, not live call tracking — per-request latency/error logging isn't wired up yet.
        </p>
        <div className="grid grid-cols-3 gap-4 rounded-lg border border-line px-4 py-4">
          <div>
            <div className="text-2xl font-serif">{overview.aiUsage.conversationCount}</div>
            <div className="text-xs text-ink/60">Tutor conversations</div>
          </div>
          <div>
            <div className="text-2xl font-serif">{overview.aiUsage.aiMessageCount}</div>
            <div className="text-xs text-ink/60">Nova replies sent</div>
          </div>
          <div>
            <div className="text-2xl font-serif">{overview.aiUsage.aiGeneratedQuestions}</div>
            <div className="text-xs text-ink/60">Questions generated</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-medium text-ink/80">System health</h2>
        <div className="grid grid-cols-3 gap-4 rounded-lg border border-line px-4 py-4">
          <div>
            <div className="text-2xl font-serif text-mastery-mastered">{overview.systemHealth.materialsReady}</div>
            <div className="text-xs text-ink/60">Materials ready</div>
          </div>
          <div>
            <div className="text-2xl font-serif">{overview.systemHealth.materialsProcessing}</div>
            <div className="text-xs text-ink/60">Processing</div>
          </div>
          <div>
            <div className="text-2xl font-serif text-mastery-attention">{overview.systemHealth.materialsFailed}</div>
            <div className="text-xs text-ink/60">Failed</div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
