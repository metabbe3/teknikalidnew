export default function AdminReportsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 bg-bg-card rounded-xl animate-pulse" />
          <div className="h-4 w-48 bg-bg-card rounded animate-pulse" />
        </div>
        <div className="h-4 w-16 bg-bg-card rounded animate-pulse" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-bg-card depth-shadow rounded-xl p-5 space-y-3 animate-pulse">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2">
                <div className="h-5 w-14 bg-bg-hover rounded-full animate-pulse" />
                <div className="h-5 w-20 bg-bg-hover rounded-full animate-pulse" />
              </div>
              <div className="h-3.5 w-28 bg-bg-hover rounded animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3.5 w-full bg-bg-hover rounded animate-pulse" />
              <div className="h-3.5 w-5/6 bg-bg-hover rounded animate-pulse" />
            </div>
            <div className="h-3 w-36 bg-bg-hover rounded animate-pulse" />
            <div className="flex gap-2 pt-1 border-t border-border">
              <div className="h-7 w-24 bg-bg-hover rounded-full animate-pulse" />
              <div className="h-7 w-16 bg-bg-hover rounded-full animate-pulse" />
              <div className="h-7 w-20 bg-bg-hover rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
