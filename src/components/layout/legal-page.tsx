import type { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-text-secondary text-sm">Last updated: May 2026</p>
      <div className="space-y-4 text-text-secondary leading-relaxed">{children}</div>
    </div>
  );
}
