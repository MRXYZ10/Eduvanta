import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMistakeVault } from "@/services/mistakes/getMistakeVault";
import { AppShell } from "@/components/AppShell";
import { FixMistakeCard } from "@/components/mistakes/FixMistakeCard";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AlertTriangle,
  BrainCircuit,
  Repeat2,
} from "lucide-react";

const MISTAKE_TYPE_LABEL: Record<string, string> = {
  conceptual: "Conceptual",
  careless: "Careless slip",
  procedural: "Procedural",
  misread: "Misread the question",
};

export default async function MistakeVaultPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const mistakes = await getMistakeVault(user.id);

  return (
    <AppShell>
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-mastery-attention/20 bg-mastery-attention/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-mastery-attention">
          <BrainCircuit className="h-3 w-3" strokeWidth={2} />
          Error intelligence
        </div>

        <h1 className="text-3xl sm:text-4xl">Mistake Vault</h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
          Nova tracks patterns in what you get wrong, not just whether an
          answer was incorrect.
        </p>
      </header>

      {mistakes.length === 0 ? (
        <EmptyState
          title="No open mistakes right now"
          description="Nice work — keep practicing to keep it that way."
        />
      ) : (
        <div className="space-y-4">
          {mistakes.map((m) => (
            <article
              key={m.id}
              className="rounded-3xl border border-line/70 bg-paper/60 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mastery-attention/10 text-mastery-attention">
                    <AlertTriangle className="h-5 w-5" strokeWidth={1.8} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {m.conceptName ?? "General"}
                    </p>

                    <p className="mt-1.5 text-sm leading-6 text-ink/70">
                      {m.questionPrompt}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-line/60 bg-ink/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink/45">
                  <Repeat2 className="h-3 w-3" strokeWidth={1.9} />
                  {MISTAKE_TYPE_LABEL[m.mistakeType] ?? m.mistakeType}
                  · ×{m.occurrences}
                </div>
              </div>

              {m.explanation && (
                <div className="mt-4 rounded-2xl border border-line/50 bg-ink/5 p-4">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink/40">
                    What happened
                  </div>
                  <p className="text-sm leading-6 text-ink/60">
                    {m.explanation}
                  </p>
                </div>
              )}

              <div className="mt-4">
                {m.fixEligible ? (
                  <FixMistakeCard mistakeId={m.id} />
                ) : (
                  <p className="rounded-xl border border-line/50 bg-paper px-4 py-3 text-xs leading-5 text-ink/40">
                    Nova will offer a targeted fix once this pattern repeats a
                    little more.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}