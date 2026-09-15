# TASK: council-2026-09-13-02 — Blok "Sinyal Terkait" di halaman artikel

## GOAL
Naikkan discovery signal pages + session depth. Artikel tidak menautkan signal pages; 16/20 artikel = 0 views.

## DELIVERABLES (EXACTLY 2 FILES)

### 1. NEW FILE: `src/components/berita/related-signals.tsx`
Async **server** component (NO "use client", NO useSession/useEffect/state — must be curl-visible in SSR HTML). Export `RelatedSignals({ ticker }: { ticker: string | null })`.

Logic (all wrapped in try/catch → on any error return null; ticker null → return null):
- Query `@/lib/prisma` (same import pattern as `src/app/(public)/berita/[slug]/page.tsx`): latest `StockIndicator` row (interval '1d', orderBy date desc) for the Stock with this ticker, JOIN-equivalent via relations or two queries: find Stock by ticker, then indicator + latest StockPrice same date.
- Determine contextual signals (predicates MUST match `src/domains/stock/screener-analysis.service.ts` / `indicator.service.ts`):
  - golden_cross: `smaCrossSignal === 'golden_cross'` → href `/saham-golden-cross`, label "Saham Golden Cross Hari Ini", desc "MA50 baru memotong ke atas MA200 — momentum bullish jangka menengah."
  - oversold: `rsi14 < 30` → href `/saham-oversold`, label "Saham Oversold Hari Ini", desc "RSI di bawah 30 — kandidat rebound teknikal."
  - volume_spike: latest volume > 3× AVG(volume) of the 20 StockPrice rows before it (use prisma aggregate; if avg=0 skip) → href `/saham-volume-spike`, label "Saham Volume Spike Hari Ini", desc "Volume meledak >3× rata-rata 20 hari."
  - pullback_sma20: `|close - sma20| / sma20 * 100 <= 3` (needs both non-null) → href `/saham-pullback-sma20`, label "Saham Pullback MA20", desc "Harga bergerak dekat MA20 — area menarik swing trader."
- Order: [golden_cross, oversold, volume_spike, pullback_sma20], take contextual ones first (max 3). If fewer than 2 contextual, append fallback from the SAME fixed list (skipping ones already added) until 2 links minimum. Links are always valid pages — staleness OK by design.
- ALWAYS append one extra separate link to `/stocks` labeled "Screener Saham — semua sinyal real-time" (outside the 2-3 signal links, its own row).
- Render section (copy class pattern of the existing "Artikel Terkait" block in `src/app/(public)/berita/[slug]/page.tsx`):
  - wrapper `mt-8 space-y-3` + heading `<p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Sinyal Terkait</p>`
  - each signal link: `<Link>` card styled like the related-articles card (`bg-bg-card rounded-xl depth-shadow p-4 hover:depth-shadow-hover transition-all block`), with label (font-semibold) + desc (text-sm text-text-secondary). Use `import Link from "next/link"`.
  - the `/stocks` link: same card style, slightly emphasized (e.g. border-border border).

### 2. EDIT FILE: `src/app/(public)/berita/[slug]/page.tsx`
- Add import of `RelatedSignals`.
- Compute `const relatedSignalTicker = article.tickerTag ?? mentionedTickers[0] ?? null;` (mentionedTickers already exists in the file — verify variable name).
- Render `<RelatedSignals ticker={relatedSignalTicker} />` immediately AFTER `<ArticleContent content={article.content} />` and BEFORE the "Stock cards for mentioned tickers" block.

## HARD CONSTRAINTS
- DO NOT touch: article-template.ts, any generator/agent, other ArticleContent callers, styles/global css.
- No schema/migration. Read-only DB queries only.
- Single-purpose commit, 2 files max. No drive-by edits. If you see pre-existing dirty hunks, leave them.

## DONE WHEN
`npx tsc --noEmit` clean; `git diff --stat` shows exactly 2 files (1 new, 1 edited).
