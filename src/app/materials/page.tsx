import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/db/client";
import { AppShell } from "@/components/AppShell";
import { MaterialUploader } from "@/components/materials/MaterialUploader";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Upload,
} from "lucide-react";

export default async function MaterialsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [topics, materials] = await Promise.all([
    prisma.topic.findMany({ orderBy: { order: "asc" } }),
    prisma.learningMaterial.findMany({
      include: { topic: true, chunks: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <AppShell>
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cobalt/20 bg-cobalt-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-cobalt">
          <FileText className="h-3 w-3" strokeWidth={2} />
          Knowledge base
        </div>

        <h1 className="text-3xl sm:text-4xl">Course material</h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
          Upload notes or PDFs. Nova can reference them when they are relevant
          to your questions.
        </p>
      </header>

      <section className="mb-8 rounded-3xl border border-line/70 bg-paper/60 p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cobalt-soft text-cobalt">
            <Upload className="h-5 w-5" strokeWidth={1.8} />
          </div>

          <div>
            <h2 className="text-lg font-medium">Add study material</h2>
            <p className="mt-1 text-xs text-ink/45">
              PDF, notes, and text material can become part of Nova&apos;s
              context.
            </p>
          </div>
        </div>

        <MaterialUploader
          topics={topics.map((t) => ({ id: t.id, name: t.name }))}
        />
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-medium">Uploaded material</h2>
          <p className="mt-1 text-xs text-ink/45">
            Processing status and indexed chunks for each file.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line/70 bg-paper/60 shadow-sm">
          {materials.length === 0 && (
            <div className="px-5 py-8 text-center">
              <FileText className="mx-auto h-7 w-7 text-ink/20" strokeWidth={1.6} />
              <p className="mt-3 text-sm text-ink/50">
                Nothing uploaded yet.
              </p>
            </div>
          )}

          {materials.map((m) => {
            const ready = m.status === "ready";
            const failed = m.status === "failed";

            return (
              <div
                key={m.id}
                className="flex flex-col gap-3 border-b border-line/50 px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-ink/45">
                    <FileText className="h-4 w-4" strokeWidth={1.8} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {m.fileName}
                    </p>

                    <p className="mt-1 text-xs text-ink/45">
                      {m.topic?.name ?? "No topic"} · {m.chunks.length}{" "}
                      {m.chunks.length === 1 ? "chunk" : "chunks"}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] ${
                    ready
                      ? "border-mastery-mastered/20 bg-mastery-mastered/10 text-mastery-mastered"
                      : failed
                        ? "border-mastery-attention/20 bg-mastery-attention/10 text-mastery-attention"
                        : "border-line/60 bg-ink/5 text-ink/45"
                  }`}
                >
                  {ready ? (
                    <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                  ) : failed ? (
                    <AlertCircle className="h-3 w-3" strokeWidth={2} />
                  ) : (
                    <LoaderCircle className="h-3 w-3" strokeWidth={2} />
                  )}
                  {m.status}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}