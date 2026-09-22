interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-line px-4 py-10 text-center">
      <p className="text-sm font-medium text-ink/70">{title}</p>
      {description && <p className="mt-1 text-sm text-ink/50">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
