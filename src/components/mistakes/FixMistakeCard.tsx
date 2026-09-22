"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function FixMistakeCard({ mistakeId }: { mistakeId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ lesson: string; questionCount: number; practiceHref: string | null } | null>(
    null,
  );
  const [resolving, setResolving] = useState(false);

  async function fixIt() {
    setLoading(true);
    try {
      const res = await fetch("/api/mistakes/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mistakeId }),
      });
      const body = await res.json();
      if (res.ok) setResult(body);
    } finally {
      setLoading(false);
    }
  }

  async function resolve() {
    setResolving(true);
    await fetch("/api/mistakes/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mistakeId }),
    });
    router.refresh();
  }

  if (result) {
    return (
      <div className="rounded-lg border border-signal/30 bg-signal-soft px-4 py-4">
        <p className="text-sm leading-relaxed text-ink/80">{result.lesson}</p>
        <div className="mt-3 flex items-center gap-3">
          {result.practiceHref && result.questionCount > 0 && (
            <Link href={result.practiceHref}>
              <Button variant="nova">Practice now ({result.questionCount} new questions)</Button>
            </Link>
          )}
          <button onClick={resolve} disabled={resolving} className="text-sm text-ink/50 underline underline-offset-2">
            Mark as fixed
          </button>
        </div>
      </div>
    );
  }

  return (
    <Button variant="nova" onClick={fixIt} disabled={loading}>
      {loading ? "Building your lesson…" : "Let's fix it"}
    </Button>
  );
}
