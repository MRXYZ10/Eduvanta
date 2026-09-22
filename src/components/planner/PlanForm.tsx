"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface TopicOption {
  id: string;
  name: string;
}

export function PlanForm({ topics }: { topics: TopicOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [targetDate, setTargetDate] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    if (selected.length === 0 || !targetDate) {
      setError("Pick at least one topic and a target date.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/planner/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicIds: selected, targetDate, dailyStudyMinutes: dailyMinutes }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't generate a plan.");
      setRationale(body.rationale);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 rounded-lg border border-line px-5 py-5">
      <div>
        <p className="mb-2 text-sm font-medium">Topics</p>
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                selected.includes(t.id) ? "border-cobalt bg-cobalt-soft" : "border-line text-ink/70 hover:bg-ink/5"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Target date
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="rounded-md border border-line px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Daily study time (min)
          <input
            type="number"
            min={10}
            max={480}
            value={dailyMinutes}
            onChange={(e) => setDailyMinutes(Number(e.target.value))}
            className="w-32 rounded-md border border-line px-3 py-2 text-sm"
          />
        </label>
      </div>

      {error && <p className="text-sm text-mastery-attention">{error}</p>}
      {rationale && <p className="rounded-md bg-signal-soft px-3 py-2 text-sm text-ink/80">{rationale}</p>}

      <Button onClick={submit} disabled={loading}>
        {loading ? "Building your plan…" : "Generate plan"}
      </Button>
    </div>
  );
}
