export default function ProfileLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Profile header skeleton */}
      <div className="bg-bg-card depth-shadow rounded-xl p-6 space-y-4 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-bg-hover" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-36 bg-bg-hover rounded animate-pulse" />
            <div className="h-3.5 w-24 bg-bg-hover rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-3.5 w-full bg-bg-hover rounded animate-pulse" />
          <div className="h-3.5 w-2/3 bg-bg-hover rounded animate-pulse" />
        </div>
        <div className="flex gap-4">
          <div className="h-3 w-28 bg-bg-hover rounded animate-pulse" />
          <div className="h-3 w-16 bg-bg-hover rounded animate-pulse" />
          <div className="h-3 w-20 bg-bg-hover rounded animate-pulse" />
        </div>
      </div>

      {/* Posts skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-28 bg-bg-card rounded animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-bg-card depth-shadow rounded-xl p-4 space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-bg-hover" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-24 bg-bg-hover rounded animate-pulse" />
                <div className="h-2.5 w-16 bg-bg-hover rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-3.5 w-full bg-bg-hover rounded animate-pulse" />
              <div className="h-3.5 w-3/4 bg-bg-hover rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
