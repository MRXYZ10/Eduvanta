import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMistakeVault } from "@/services/mistakes/getMistakeVault";
import { AppShell } from "@/components/AppShell";
import { FixMistakeCard } from "@/components/mistakes/FixMistakeCard";
import { EmptyState } from "@/components/ui/EmptyState";

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
      <h1 className="mb-1 text-2xl">Mistake Vault</h1>
      <p className="mb-6 text-sm text-ink/60">
        Nova tracks patterns in what you get wrong — not just that you got it wrong.
      </p>

      {mistakes.length === 0 ? (
        <EmptyState title="No open mistakes right now" description="Nice work — keep it up." />
      ) : (
        <div className="space-y-4">
          {mistakes.map((m) => (
            <div key={m.id} className="rounded-lg border border-line px-4 py-4">
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{m.conceptName ?? "General"}</p>
                  <p className="mt-0.5 text-sm text-ink/70">{m.questionPrompt}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-ink/50">
                  {MISTAKE_TYPE_LABEL[m.mistakeType] ?? m.mistakeType} · ×{m.occurrences}
                </span>
              </div>
              {m.explanation && <p className="mb-3 text-xs text-ink/50">{m.explanation}</p>}
              {m.fixEligible ? (
                <FixMistakeCard mistakeId={m.id} />
              ) : (
                <p className="text-xs text-ink/40">
                  Nova will offer a targeted fix once this pattern repeats a bit more.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
