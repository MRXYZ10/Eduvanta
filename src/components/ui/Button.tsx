import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "quiet" | "nova";
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-[transform,background-color,border-color,box-shadow,opacity] duration-150 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-45",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        variant === "primary" && "bg-cobalt text-white shadow-[0_8px_20px_rgb(var(--cobalt)/0.18)] hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgb(var(--cobalt)/0.24)]",
        variant === "quiet" && "border border-line/80 bg-paper/70 text-ink hover:-translate-y-0.5 hover:border-cobalt/25 hover:bg-cobalt-soft/40",
        variant === "nova" && "bg-signal text-white shadow-[0_8px_20px_rgb(var(--signal)/0.18)] hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgb(var(--signal)/0.22)]",
        className,
      )}
      {...props}
    />
  );
}
