"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <div className="bg-bg-card depth-shadow rounded-xl p-8 max-w-md mx-auto space-y-4">
        <svg className="w-12 h-12 mx-auto text-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-text-secondary text-sm">{error.message || "An unexpected error occurred."}</p>
        <button
          onClick={reset}
          className="bg-text-primary text-white px-6 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity press-scale"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
