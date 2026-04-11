interface LoadingGuardProps {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  skeletonRows?: number;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export function LoadingGuard({
  loading,
  error,
  onRetry,
  children,
  skeletonRows = 3,
  emptyMessage,
  isEmpty = false,
}: LoadingGuardProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div
            key={i}
            className="h-16 bg-gray-100 rounded-xl animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
        <div className="text-3xl">😕</div>
        <p className="text-red-500 text-sm font-medium">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-1 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (isEmpty && emptyMessage) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
        <div className="text-3xl">📭</div>
        <p className="text-gray-400 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}
