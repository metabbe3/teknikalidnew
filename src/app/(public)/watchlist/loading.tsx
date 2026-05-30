export default function WatchlistLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-44 bg-bg-card rounded-xl animate-pulse" />
        <div className="h-4 w-32 bg-bg-card rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-bg-card depth-shadow rounded-xl p-4 space-y-3 animate-pulse">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5">
                <div className="h-4 w-16 bg-bg-hover rounded animate-pulse" />
                <div className="h-3 w-24 bg-bg-hover rounded animate-pulse" />
              </div>
              <div className="space-y-1.5 text-right">
                <div className="h-4 w-16 bg-bg-hover rounded animate-pulse" />
                <div className="h-3 w-12 bg-bg-hover rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="h-4 w-14 bg-bg-hover rounded-full animate-pulse" />
              <div className="h-4 w-10 bg-bg-hover rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
