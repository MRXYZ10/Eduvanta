import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "quiet" | "nova";
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" && "bg-cobalt text-white hover:bg-cobalt/90",
        variant === "quiet" && "bg-transparent text-ink hover:bg-ink/5 border border-line",
        variant === "nova" && "bg-signal text-white hover:bg-signal/90",
        className,
      )}
      {...props}
    />
  );
}
