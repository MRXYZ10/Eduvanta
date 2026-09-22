interface Session {
  id: string;
  topicLabel: string;
  durationMin: number;
}

export function TodaysPlan({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-line px-4 py-6 text-sm text-ink/60">
        Nothing scheduled yet. Set up a study plan to see today's steps here.
      </div>
    );
  }

  return (
    <ol className="divide-y divide-line rounded-lg border border-line">
      {sessions.map((s, i) => (
        <li key={s.id} className="flex items-center gap-4 px-4 py-3">
          <span className="font-serif text-lg text-ink/40">{i + 1}</span>
          <div className="flex-1">
            <div className="text-sm font-medium">{s.topicLabel}</div>
            <div className="text-xs text-ink/50">{s.durationMin} min</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
