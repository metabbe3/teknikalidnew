export default function CompareLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="h-7 w-12 bg-bg-card rounded-full animate-pulse" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-24 bg-bg-card rounded-full animate-pulse" />
          ))}
        </div>
        <div className="h-10 w-full bg-bg-card rounded-lg animate-pulse" />
      </div>
      <div className="h-[320px] sm:h-[420px] bg-bg-card rounded-xl animate-pulse" />
      <div className="space-y-2">
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 flex-1 bg-bg-card rounded-md animate-pulse" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 bg-bg-card rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
