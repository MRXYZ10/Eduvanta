import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/db/client";
import { FocusSession } from "@/components/focus/FocusSession";

// Deliberately no AppShell here, same reasoning as the exam page: Focus
// Mode is meant to read as a dedicated distraction-free space, not another
// dashboard tab with a sidebar competing for attention.
export default async function FocusPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const topics = await prisma.topic.findMany({ orderBy: { order: "asc" } });

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4">
      <FocusSession topics={topics.map((t) => ({ id: t.id, name: t.name }))} />
    </main>
  );
}
