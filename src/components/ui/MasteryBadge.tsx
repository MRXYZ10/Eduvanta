import { cn } from "@/lib/cn";

type Band = "MASTERED" | "STRONG" | "DEVELOPING" | "NEEDS_ATTENTION";

const LABEL: Record<Band, string> = {
  MASTERED: "Mastered",
  STRONG: "Strong",
  DEVELOPING: "Developing",
  NEEDS_ATTENTION: "Needs attention",
};

const DOT: Record<Band, string> = {
  MASTERED: "bg-mastery-mastered",
  STRONG: "bg-mastery-strong",
  DEVELOPING: "bg-mastery-developing",
  NEEDS_ATTENTION: "bg-mastery-attention",
};

export function MasteryBadge({ band, className }: { band: Band; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-ink/70", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[band])} aria-hidden />
      {LABEL[band]}
    </span>
  );
}
