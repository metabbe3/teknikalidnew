export default function ProfileEditLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-bg-card rounded-xl animate-pulse" />
        <div className="h-4 w-56 bg-bg-card rounded animate-pulse" />
      </div>

      <div className="bg-bg-card depth-shadow rounded-xl p-6 space-y-5 animate-pulse">
        <div className="space-y-1.5">
          <div className="h-4 w-12 bg-bg-hover rounded animate-pulse" />
          <div className="h-10 w-full bg-bg-hover rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <div className="h-4 w-8 bg-bg-hover rounded animate-pulse" />
            <div className="h-3 w-28 bg-bg-hover rounded animate-pulse" />
          </div>
          <div className="h-24 w-full bg-bg-hover rounded-xl" />
        </div>
        <div className="flex gap-3 pt-1">
          <div className="h-10 w-36 bg-bg-hover rounded-full animate-pulse" />
          <div className="h-5 w-10 bg-bg-hover rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
