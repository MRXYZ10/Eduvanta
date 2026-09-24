"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep production error details out of the UI; Next.js can associate the
    // digest with server logs when available.
    console.error("EduVanta route error", error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-5">
      <section className="w-full max-w-md rounded-3xl border border-line/70 bg-paper/80 p-7 text-center shadow-sm">
        <h1 className="text-2xl font-medium text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm leading-6 text-ink/55">
          The page hit an unexpected error. Your saved learning data is unchanged.
        </p>
        <button
          onClick={() => reset()}
          className="mt-6 rounded-xl bg-cobalt px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
