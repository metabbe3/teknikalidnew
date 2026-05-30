export default function RootLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="h-8 w-48 bg-bg-card rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 bg-bg-card rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-6 w-32 bg-bg-card rounded animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 bg-bg-card rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
