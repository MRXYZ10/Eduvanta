import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "quiet" | "nova";
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium",
        "shadow-sm transition-all duration-200 ease-out",
        "active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/30 focus-visible:ring-offset-2",
        variant === "primary" &&
          "bg-cobalt text-white shadow-cobalt/15 hover:-translate-y-0.5 hover:bg-cobalt/95 hover:shadow-md",
        variant === "quiet" &&
          "border border-line/80 bg-paper/60 text-ink shadow-none hover:-translate-y-0.5 hover:bg-ink/5 hover:shadow-sm",
        variant === "nova" &&
          "bg-signal text-white shadow-signal/20 hover:-translate-y-0.5 hover:bg-signal/95 hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}