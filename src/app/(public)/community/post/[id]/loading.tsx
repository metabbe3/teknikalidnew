export default function PostDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Back link skeleton */}
      <div className="h-4 w-36 bg-bg-card rounded animate-pulse" />

      {/* Main post skeleton */}
      <div className="bg-bg-card depth-shadow rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-bg-hover animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 bg-bg-hover rounded animate-pulse" />
            <div className="h-2.5 w-20 bg-bg-hover rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3.5 w-full bg-bg-hover rounded animate-pulse" />
          <div className="h-3.5 w-5/6 bg-bg-hover rounded animate-pulse" />
          <div className="h-3.5 w-2/3 bg-bg-hover rounded animate-pulse" />
        </div>
        <div className="flex gap-4 pt-1">
          <div className="h-4 w-14 bg-bg-hover rounded animate-pulse" />
          <div className="h-4 w-14 bg-bg-hover rounded animate-pulse" />
        </div>
      </div>

      {/* Comments skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-32 bg-bg-card rounded animate-pulse" />
        <div className="bg-bg-card depth-shadow rounded-xl p-4 space-y-2">
          <div className="h-16 w-full bg-bg-hover rounded-lg animate-pulse" />
          <div className="flex justify-end">
            <div className="h-8 w-24 bg-bg-hover rounded-full animate-pulse" />
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-bg-card depth-shadow rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-bg-hover animate-pulse" />
              <div className="h-3 w-20 bg-bg-hover rounded animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-bg-hover rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-bg-hover rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
