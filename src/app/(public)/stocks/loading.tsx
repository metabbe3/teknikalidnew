export default function StocksLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="h-8 w-48 bg-bg-card rounded-xl animate-pulse" />
      <div className="flex items-center gap-3">
        <div className="h-9 w-36 bg-bg-card rounded-lg animate-pulse" />
        <div className="h-4 w-20 bg-bg-card rounded animate-pulse" />
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-bg-card px-3 py-3 flex gap-8">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-3 w-16 bg-bg-hover rounded animate-pulse" />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border-t border-border px-3 py-3 flex gap-8">
            {Array.from({ length: 7 }).map((_, j) => (
              <div key={j} className="h-4 w-16 bg-bg-card rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
