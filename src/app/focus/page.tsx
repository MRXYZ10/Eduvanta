import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/db/client";
import { FocusSession } from "@/components/focus/FocusSession";
import { ArrowLeft, Flame } from "lucide-react";

export default async function FocusPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const topics = await prisma.topic.findMany({
    orderBy: { order: "asc" },
  });

  return (
    <main className="min-h-dvh bg-paper px-4 py-5 text-ink sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Link
            href="/practice"
            className="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-paper/70 px-3 py-1.5 text-xs font-medium text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
            Practice
          </Link>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-cobalt/20 bg-cobalt-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-cobalt">
            <Flame className="h-3 w-3" strokeWidth={2} />
            Focus mode
          </div>
        </div>

        <FocusSession
          topics={topics.map((t) => ({ id: t.id, name: t.name }))}
        />
      </div>
    </main>
  );
}