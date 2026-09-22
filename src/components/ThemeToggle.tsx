"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

const COOKIE_NAME = "theme";
const COOKIE_MAX_AGE_DAYS = 365;

export function ThemeToggle() {
  // Read the actual DOM state on mount rather than assuming light —
  // layout.tsx already applied the right class server-side from the
  // cookie, so this just mirrors that into component state for the icon.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.cookie = `${COOKIE_NAME}=${next ? "dark" : "light"}; path=/; max-age=${COOKIE_MAX_AGE_DAYS * 86400}; SameSite=Lax`;
  }

  return (
    <button
      onClick={toggle}
      className="flex h-8 w-8 items-center justify-center rounded-md text-ink/70 hover:bg-ink/5"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
    </button>
  );
}
