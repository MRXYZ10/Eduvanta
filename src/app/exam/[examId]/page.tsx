import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ExamRunner } from "@/components/exam/ExamRunner";

// Deliberately no AppShell/sidebar/bottom-nav here — an exam simulator
// should read as "the real thing," not another dashboard tab, and the
// question navigator + timer need the full width on mobile.
export default async function ExamPage({ params }: { params: { examId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-6">
      <ExamRunner examId={params.examId} />
    </main>
  );
}
