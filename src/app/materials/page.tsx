import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/db/client";
import { AppShell } from "@/components/AppShell";
import { MaterialUploader } from "@/components/materials/MaterialUploader";

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
      <h1 className="mb-1 text-2xl">Course material</h1>
      <p className="mb-6 text-sm text-ink/60">
        Upload notes or PDFs — Nova will reference them when they're relevant to a question.
      </p>

      <div className="mb-8">
        <MaterialUploader topics={topics.map((t) => ({ id: t.id, name: t.name }))} />
      </div>

      <h2 className="mb-2 text-base font-medium text-ink/80">Uploaded material</h2>
      <div className="divide-y divide-line rounded-lg border border-line">
        {materials.length === 0 && <p className="px-4 py-6 text-sm text-ink/50">Nothing uploaded yet.</p>}
        {materials.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{m.fileName}</p>
              <p className="text-xs text-ink/50">{m.topic?.name ?? "No topic"} · {m.chunks.length} chunk(s)</p>
            </div>
            <span
              className={`text-xs ${m.status === "ready" ? "text-mastery-mastered" : m.status === "failed" ? "text-mastery-attention" : "text-ink/50"}`}
            >
              {m.status}
            </span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
