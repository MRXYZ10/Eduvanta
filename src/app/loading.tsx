export default function Loading() {
  return (
    <main className="min-h-dvh bg-paper px-4 py-8">
      <div className="mx-auto w-full max-w-4xl space-y-5 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-ink/10" />
        <div className="h-4 w-72 rounded-lg bg-ink/5" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-line/60 bg-paper/70" />
          ))}
        </div>
      </div>
    </main>
  );
}
