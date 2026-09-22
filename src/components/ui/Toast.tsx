"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { cn } from "@/lib/cn";

interface ToastItem {
  id: string;
  message: string;
  variant: "default" | "success" | "error";
}

interface ToastContextValue {
  show: (message: string, variant?: ToastItem["variant"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, variant: ToastItem["variant"] = "default") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="fixed inset-x-0 bottom-20 z-40 flex flex-col items-center gap-2 px-4 md:bottom-6"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "max-w-sm rounded-md px-4 py-2.5 text-sm shadow-lg",
              t.variant === "success" && "bg-mastery-mastered text-white",
              t.variant === "error" && "bg-mastery-attention text-white",
              t.variant === "default" && "bg-ink text-paper",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
