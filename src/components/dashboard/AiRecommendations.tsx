import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface Recommendation {
  id: string;
  title: string;
  reason: string;
  actionLabel: string;
  actionHref: string;
}

export function AiRecommendations({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-base font-medium text-ink/80">Nova's recommendations</h2>
      <div className="space-y-3">
        {recommendations.map((r) => (
          <div key={r.id} className="rounded-lg border border-signal/30 bg-signal-soft px-4 py-3">
            <p className="text-sm font-medium text-ink">{r.title}</p>
            <p className="mt-1 text-sm text-ink/70">{r.reason}</p>
            <Link href={r.actionHref} className="mt-3 inline-block">
              <Button variant="nova">{r.actionLabel}</Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
