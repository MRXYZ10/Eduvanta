import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface Recommendation {
  id: string;
  title: string;
  reason: string;
  actionLabel: string;
  actionHref: string;
}

export function AiRecommendations({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  if (recommendations.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-ink/85">
            Nova&apos;s recommendations
          </h2>
          <p className="mt-1 text-xs text-ink/45">
            Personalized next steps based on your learning activity.
          </p>
        </div>

        <span className="hidden rounded-full border border-signal/30 bg-signal-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-signal sm:block">
          AI insight
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {recommendations.map((r) => (
          <article
            key={r.id}
            className="group rounded-2xl border border-signal/25 bg-signal-soft/70 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal text-sm font-semibold text-white shadow-sm">
                N
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink">
                  {r.title}
                </div>

                <p className="mt-1.5 text-sm leading-6 text-ink/65">
                  {r.reason}
                </p>

                <Link href={r.actionHref} className="mt-4 inline-block">
                  <Button variant="nova">{r.actionLabel}</Button>
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}