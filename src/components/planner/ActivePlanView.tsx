"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { format, isSameDay } from "date-fns";

interface Session {
  id: string;
  scheduledFor: string;
  durationMin: number;
  topicLabel: string;
  status: string;
}

export function ActivePlanView({ sessions, targetDate }: { sessions: Session[]; targetDate: string | null }) {
  const router = useRouter();
  const [rebalancing, setRebalancing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const hasMissed = sessions.some((s) => s.status === "missed");

  const grouped = sessions.reduce<Record<string, Session[]>>((acc, s) => {
    const key = format(new Date(s.scheduledFor), "yyyy-MM-dd");
    acc[key] = acc[key] ?? [];
    acc[key].push(s);
    return acc;
  }, {});

  async function rebalance() {
    setRebalancing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/planner/reschedule", { method: "POST" });
      const body = await res.json();
      setMessage(body.message ?? "Rebalanced.");
      router.refresh();
    } catch {
      setMessage("Couldn't rebalance right now — try again shortly.");
    } finally {
      setRebalancing(false);
    }
  }

  return (
    <div className="space-y-4">
      {targetDate && (
        <p className="text-sm text-ink/60">Target date: {format(new Date(targetDate), "MMM d, yyyy")}</p>
      )}

      {hasMissed && (
        <div className="flex items-center justify-between rounded-md border border-mastery-developing/30 bg-mastery-developing/5 px-4 py-3">
          <p className="text-sm text-ink/80">Some sessions were missed.</p>
          <Button variant="quiet" onClick={rebalance} disabled={rebalancing}>
            {rebalancing ? "Rebalancing…" : "Rebalance plan"}
          </Button>
        </div>
      )}
      {message && <p className="text-sm text-ink/60">{message}</p>}

      <div className="space-y-4">
        {Object.entries(grouped).map(([day, daySessions]) => (
          <div key={day}>
            <p className="mb-2 text-xs font-medium text-ink/50">
              {isSameDay(new Date(day), new Date()) ? "Today" : format(new Date(day), "EEEE, MMM d")}
            </p>
            <div className="divide-y divide-line rounded-lg border border-line">
              {daySessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className={s.status === "missed" ? "text-ink/40 line-through" : ""}>{s.topicLabel}</span>
                  <span className="text-xs text-ink/50">{s.durationMin} min</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
