export default function StockDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="h-4 w-32 bg-bg-card rounded animate-pulse" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-bg-card rounded-xl animate-pulse" />
          <div className="h-4 w-48 bg-bg-card rounded animate-pulse" />
        </div>
        <div className="text-right space-y-2">
          <div className="h-9 w-28 bg-bg-card rounded-xl animate-pulse" />
          <div className="h-4 w-24 bg-bg-card rounded animate-pulse" />
        </div>
      </div>
      <div className="w-full h-[450px] bg-bg-card rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-bg-card rounded-xl p-4 h-40 animate-pulse" />
        ))}
      </div>
      <div className="bg-bg-card rounded-xl p-4 h-64 animate-pulse" />
    </div>
  );
}
