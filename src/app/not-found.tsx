import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <div className="bg-bg-card depth-shadow rounded-xl p-8 max-w-md mx-auto space-y-4">
        <p className="text-6xl font-bold text-accent">404</p>
        <h2 className="text-xl font-semibold">Page not found</h2>
        <p className="text-text-secondary text-sm">
          The stock you&apos;re looking for doesn&apos;t exist or is not tracked on TeknikalID.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="bg-text-primary text-white px-5 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity press-scale"
          >
            Home
          </Link>
          <Link
            href="/stocks"
            className="bg-bg-card text-text-primary px-5 py-2 rounded-full text-sm font-medium hover:bg-bg-hover transition-colors press-scale border border-border"
          >
            View All Stocks
          </Link>
        </div>
      </div>
    </div>
  );
}
