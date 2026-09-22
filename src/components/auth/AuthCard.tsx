export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl">{title}</h1>
        {subtitle && <p className="mb-6 text-center text-sm text-ink/60">{subtitle}</p>}
        <div className="rounded-lg border border-line px-6 py-6">{children}</div>
      </div>
    </main>
  );
}
