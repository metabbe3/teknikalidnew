export default function CommunityLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Heading skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-40 bg-bg-card rounded-xl animate-pulse" />
        <div className="h-4 w-64 bg-bg-card rounded animate-pulse" />
      </div>

      {/* Composer skeleton */}
      <div className="bg-bg-card depth-shadow rounded-xl p-4 space-y-3">
        <div className="h-20 w-full bg-bg-hover rounded-lg animate-pulse" />
        <div className="flex justify-end">
          <div className="h-8 w-24 bg-bg-hover rounded-full animate-pulse" />
        </div>
      </div>

      {/* Post card skeletons */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-bg-card depth-shadow rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-bg-hover animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-24 bg-bg-hover rounded animate-pulse" />
                <div className="h-2.5 w-16 bg-bg-hover rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-3.5 w-full bg-bg-hover rounded animate-pulse" />
              <div className="h-3.5 w-3/4 bg-bg-hover rounded animate-pulse" />
            </div>
            <div className="flex gap-4 pt-1">
              <div className="h-4 w-12 bg-bg-hover rounded animate-pulse" />
              <div className="h-4 w-12 bg-bg-hover rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
