import { Button } from "./Button";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/**
 * The "Nova couldn't connect right now. [Try Again]" pattern from the
 * product spec's error-handling section, made reusable instead of each
 * component writing its own inline version — see TutorChat.tsx and
 * ExamRunner.tsx for two existing inline versions this can replace as
 * they're touched next.
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-line px-4 py-6 text-center">
      <p className="text-sm text-ink/70">{message}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
