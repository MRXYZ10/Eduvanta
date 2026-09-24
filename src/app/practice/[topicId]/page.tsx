import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/db/client";
import { AppShell } from "@/components/AppShell";
import { PracticeSession } from "@/components/practice/PracticeSession";
import { ensureQuestionBank } from "@/services/practice/ensureQuestionBank";
import { canAccessTopic } from "@/lib/topic-access";

export default async function PracticePage({ params }: { params: { topicId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const topic = await prisma.topic.findUnique({ where: { id: params.topicId } });
  if (!topic) redirect("/practice");
  if (!(await canAccessTopic(user.id, user.role, topic.id))) redirect("/practice");

  // Ship with a curated question set for the built-in curriculum so a fresh
  // course never dead-ends on the first practice visit.
  await ensureQuestionBank(topic.id);

  // Reuse a recent unfinished session on refresh/back navigation instead of
  // creating abandoned Attempt rows every time the page renders.
  const recentCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const attempt =
    (await prisma.attempt.findFirst({
      where: {
        userId: user.id,
        mode: "practice",
        topicId: topic.id,
        finishedAt: null,
        startedAt: { gte: recentCutoff },
      },
      orderBy: { startedAt: "desc" },
    })) ??
    (await prisma.attempt.create({
      data: { userId: user.id, mode: "practice", topicId: topic.id },
    }));

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-2xl">{topic.name}</h1>
        <p className="mt-1 text-sm text-ink/60">Adaptive practice — difficulty adjusts to how you're doing.</p>
      </header>
      <PracticeSession topicId={topic.id} attemptId={attempt.id} />
    </AppShell>
  );
}
