import Link from "next/link";
import { prisma } from "@/lib/prisma";

/**
 * First-Session Welcome Loop (PRD idea-2026-10-02-2 / prd-2026-10-02-02).
 *
 * Checklist "Mulai 3 langkah" for users within their first 7 days. Progress is
 * DERIVED from existing behavioral tables (PageView / Watchlist) — zero new
 * tables, zero migrations, survives device switches.
 *
 * Derive cost (AC5): ≤3 bounded queries —
 *   - PageView ×2: createdAt >= user.createdAt rides PageView_createdAt_idx
 *     (~14k rows, ≤7-day window; live DB has no userId index — see queue note)
 *   - Watchlist: userId (Watchlist_userId_idx)
 * Brief link comes from the page (already fetched) — no extra query for it.
 */

export type WelcomeSteps = {
  doneStockPage: boolean;
  doneWatchlist: boolean;
  doneBrief: boolean;
};

async function deriveSteps(
  userId: string,
  since: Date
): Promise<WelcomeSteps> {
  const [viewedStockPage, watchlistRows, viewedBrief] = await Promise.all([
    prisma.pageView
      .findFirst({
        where: {
          userId,
          path: { startsWith: "/stocks/" },
          createdAt: { gte: since },
        },
        select: { id: true },
      })
      .catch(() => null),
    prisma.watchlist
      .findMany({
        where: { userId },
        select: { stockTicker: true },
        take: 1,
      })
      .catch(() => []),
    prisma.pageView
      .findFirst({
        where: {
          userId,
          path: { startsWith: "/berita/brief" },
          createdAt: { gte: since },
        },
        select: { id: true },
      })
      .catch(() => null),
  ]);

  return {
    doneStockPage: Boolean(viewedStockPage),
    doneWatchlist: watchlistRows.length > 0,
    doneBrief: Boolean(viewedBrief),
  };
}

export async function WelcomeCard({
  userId,
  userCreatedAt,
  latestBriefSlug,
}: {
  userId: string;
  userCreatedAt: Date;
  latestBriefSlug: string | null;
}) {
  // Derive inside try/catch (data only, no JSX); render below is pure.
  let steps: WelcomeSteps | null = null;
  try {
    steps = await deriveSteps(userId, userCreatedAt);
  } catch {
    steps = null;
  }

  // Empty-state guarantee: any derive failure hides the card, never errors the home page.
  if (!steps) return null;

  const list = [
    {
      done: steps.doneStockPage,
      label: "Buka 1 halaman saham",
      href: "/stocks",
    },
    {
      done: steps.doneWatchlist,
      label: "Tambahkan saham ke watchlist",
      href: "/watchlist",
    },
    {
      done: steps.doneBrief,
      label: "Baca brief pasar terbaru",
      href: latestBriefSlug ? `/berita/${latestBriefSlug}` : "/berita",
    },
  ];

  const doneCount = list.filter((s) => s.done).length;

  return (
    <section
      aria-label="Mulai 3 langkah"
      className="rounded-xl border border-border bg-bg-card p-5"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Mulai 3 langkah
        </h3>
        <span className="text-xs font-mono tabular-nums text-text-tertiary">
          {doneCount}/3
        </span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-bg-hover mb-4" aria-hidden="true">
        <div
          className="h-1.5 rounded-full bg-accent transition-all"
          style={{ width: `${(doneCount / 3) * 100}%` }}
        />
      </div>

      <ul className="space-y-2">
        {list.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 bg-bg-hover/60 hover:bg-bg-hover transition-all"
              >
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                  s.done
                    ? "border-bullish/40 bg-bullish-bg text-bullish"
                    : "border-border text-text-tertiary"
                }`}
              >
                {s.done ? "✓" : ""}
              </span>
              <span
                className={`text-sm ${
                  s.done
                    ? "text-text-tertiary line-through"
                    : "text-text-primary group-hover:text-accent"
                } transition-colors`}
              >
                {s.label}
                </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
