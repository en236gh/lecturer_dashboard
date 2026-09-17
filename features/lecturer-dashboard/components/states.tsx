export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="rounded-[10px] bg-white p-10 text-center text-sm text-muted shadow-panel">
      {label}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[10px] bg-white p-10 text-center shadow-panel">
      <p className="text-sm text-unza-red">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-[10px] bg-ink px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-10 text-center text-sm text-muted">{message}</p>;
}
