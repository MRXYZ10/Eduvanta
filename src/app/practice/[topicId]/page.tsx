import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/db/client";
import { AppShell } from "@/components/AppShell";
import { PracticeSession } from "@/components/practice/PracticeSession";

export default async function PracticePage({ params }: { params: { topicId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const topic = await prisma.topic.findUnique({ where: { id: params.topicId } });
  if (!topic) redirect("/practice");

  // One Attempt row per session, created server-side so the client never
  // controls which user/topic an attempt is attributed to.
  const attempt = await prisma.attempt.create({
    data: { userId: user.id, mode: "practice", topicId: topic.id },
  });

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
