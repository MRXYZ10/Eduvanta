"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function RemedialPracticeButton({ topicId }: { topicId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/teacher/remedial-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, difficulty: "EASY" }),
      });
      const body = await res.json();
      setMessage(res.ok ? body.message : (body.error ?? "Something went wrong."));
    } catch {
      setMessage("Couldn't reach the generator right now — try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="nova" onClick={generate} disabled={loading}>
        {loading ? "Generating…" : "Generate Remedial Practice"}
      </Button>
      {message && <p className="max-w-xs text-right text-xs text-ink/60">{message}</p>}
    </div>
  );
}
