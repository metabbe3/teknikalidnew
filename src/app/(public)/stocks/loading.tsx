export default function StocksLoading() {
  return (
    <div className="fade-in">
      {/* Editorial header — mirrors the real page so there is no layout shift */}
      <section className="border-b border-border bg-bg-card">
        <div className="max-w-7xl mx-auto px-4 py-10 sm:py-12 space-y-5">
          <div className="h-7 w-40 rounded-full bg-bg-hover animate-pulse" />
          <div className="h-11 w-64 rounded-lg bg-bg-hover animate-pulse" />
          <div className="h-4 w-full max-w-xl rounded bg-bg-hover animate-pulse" />
          <div className="h-9 w-full max-w-md rounded-lg bg-bg-hover animate-pulse" />
          <div className="flex flex-wrap gap-2 pt-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-28 rounded-full bg-bg-hover animate-pulse" />
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-bg-hover animate-pulse" />
          <div className="h-8 w-48 rounded-lg bg-bg-hover animate-pulse" />
        </div>

        {/* Browse | Screener tabs */}
        <div className="flex items-center gap-1.5">
          <div className="h-9 w-32 rounded-md bg-bg-hover animate-pulse" />
          <div className="h-9 w-24 rounded-md bg-bg-hover animate-pulse" />
        </div>

        {/* Table */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-56 rounded-lg bg-bg-hover animate-pulse" />
          <div className="h-9 w-20 rounded-lg bg-bg-hover animate-pulse" />
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="bg-bg-card px-4 py-3 flex gap-8 border-b border-border">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-3 w-16 bg-bg-hover rounded animate-pulse" />
            ))}
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="border-t border-border/60 px-4 py-3 flex gap-8">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className="h-4 w-16 bg-bg-hover/70 rounded animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
