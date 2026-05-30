export default function ScreenerLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-bg-card rounded animate-pulse" />
        <div className="h-4 w-72 bg-bg-card rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-bg-card depth-shadow rounded-xl p-4 animate-pulse">
            <div className="h-4 w-32 bg-bg-hover rounded" />
            <div className="h-3 w-48 bg-bg-hover rounded mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
