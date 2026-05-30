"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center p-8 text-center font-sans">
        <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-text-secondary mb-6">An unexpected error occurred. Please try again.</p>
        <button
          onClick={reset}
          className="bg-accent text-white px-6 py-2 rounded-full font-medium hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
