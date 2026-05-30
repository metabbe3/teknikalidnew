# TeknikalID Frontend Audit

> Audited: 2026-05-29
> Scope: All pages, components, layouts, CSS
> Aesthetic target: Modern minimalist (white + pastel), institutional-grade financial platform

---

## Critical (Fix Immediately)

### C1. `themeColor` mismatch — indigo instead of brand blue

**File:** `src/app/layout.tsx:25`

```ts
themeColor: "#6366f1", // indigo-500
```

**Why it fails:** The entire design system uses `--color-accent: #2563eb` (blue-600) as the primary brand color. The browser chrome (status bar on mobile, PWA title bar) renders as indigo, clashing with the blue UI. Jarring on Android and iOS.

**Fix:**
```ts
themeColor: "#2563eb",
```

---

### C2. `lang="en"` on `<html>` but content is Indonesian

**File:** `src/app/layout.tsx:71`

```tsx
<html lang="en" ...>
```

**Why it fails:** Screen readers will mispronounce Indonesian words ("saham", "naik", "turun", "Masuk", "Keluar", "Daftar Pantauan"). The entire community section and stocks page uses Indonesian. This is an accessibility violation and confuses assistive technology.

**Fix:**
```tsx
<html lang="id" ...>
```

---

### C3. Dynamic Tailwind classes won't compile — SMA/EMA overlay toggles

**File:** `src/components/chart/chart-section.tsx:99,101,119,121`

```tsx
`bg-${color}-500/10 text-${color}-600 ring-1 ring-${color}-500/20`
```

**Why it fails:** Tailwind v4 scans source files for class names at build time. Dynamic string interpolation (`bg-${color}-500/10`) is invisible to the scanner — these classes never appear in the output CSS. The buttons render with NO background/text/ring when toggled on. This is a **visual bug in production**.

**Fix — use explicit classes instead of interpolation:**

```tsx
// Replace the dynamic SMA group with explicit classes:
{[
  { key: "sma20", label: "20", state: showSma20, setter: setShowSma20, activeClass: "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20" },
  { key: "sma50", label: "50", state: showSma50, setter: setShowSma50, activeClass: "bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20" },
  { key: "sma200", label: "200", state: showSma200, setter: setShowSma200, activeClass: "bg-red-500/10 text-red-600 ring-1 ring-red-500/20" },
].map(({ key, label, state, setter, activeClass }) => (
  <button
    key={key}
    onClick={() => setter(!state)}
    aria-pressed={state}
    aria-label={`Toggle SMA ${label}`}
    className={`px-2 py-1 text-[11px] font-mono font-medium rounded transition-all duration-150 ${
      state
        ? activeClass
        : "bg-bg-card text-text-tertiary hover:text-text-secondary"
    }`}
  >
    SMA {label}
  </button>
))}

// Same pattern for EMA group:
{[
  { key: "ema12", label: "12", state: showEma12, setter: setShowEma12, activeClass: "bg-cyan-500/10 text-cyan-600 ring-1 ring-cyan-500/20" },
  { key: "ema26", label: "26", state: showEma26, setter: setShowEma26, activeClass: "bg-pink-500/10 text-pink-600 ring-1 ring-pink-500/20" },
].map(({ key, label, state, setter, activeClass }) => (
  // ...same button template
))}
```

---

### C4. Chart hardcoded white background won't match if theme evolves

**File:** `src/components/chart/candlestick-chart.tsx:75`

```ts
background: { type: ColorType.Solid, color: "#ffffff" },
```

**Why it fails:** The chart container card already has `bg-bg-card` from Tailwind. If the card background ever changes, the chart inner area stays white, creating a visible border. More importantly, hardcoded `#ffffff` bypasses the design token system.

**Fix:**
```ts
// In the useEffect that creates the chart, resolve the token:
const cardBg = getComputedStyle(containerRef.current).getPropertyValue("--color-bg-card").trim() || "#ffffff";

const chart = createChart(containerRef.current, {
  layout: {
    background: { type: ColorType.Solid, color: cardBg },
    textColor: "#a8a29e",
    fontSize: 11,
  },
  // ...
});
```

---

## High Impact

### H1. Typography scale is scattered — 14 unique text sizes

**Files:** Across all components

The codebase uses these font sizes with no system:
- `text-[7px]`, `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[13px]`, `text-[15px]` (arbitrary)
- `text-xs` (12px), `text-sm` (14px), `text-base` (16px), `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px), `text-3xl` (30px), `text-4xl` (36px), `text-5xl` (48px), `text-6xl` (60px)

**Why it fails:** A first-time user sees inconsistent sizing — card titles are `text-[11px]`, table headers are `text-xs`, screener preset labels are `text-sm`. No visual rhythm. This is the #1 marker of "AI-generated" UI.

**Fix — adopt a strict 6-step type scale:**

| Token | Size | Usage | Current mess |
|-------|------|-------|--------------|
| `text-2xs` | 10px | Tertiary labels, badges | text-[9px], text-[10px] |
| `text-xs` | 11px | Table headers, indicator labels | text-[11px] |
| `text-sm` | 13px | Body text, card values | text-[12px], text-[13px] |
| `text-base` | 15px | Card titles, primary data | text-[15px] |
| `text-lg` | 18px | Page section headers | text-lg |
| `text-xl`+ | 20px+ | Page titles, hero | text-xl through text-6xl |

In `globals.css`, add to `@theme inline`:
```css
--font-size-2xs: 10px;
--font-size-xs: 11px;
--font-size-sm: 13px;
--font-size-base: 15px;
```

Then refactor all arbitrary sizes to use these tokens.

---

### H2. Inconsistent card padding — 4 different patterns

**Files:** All card components

| Component | Padding | Rounded |
|-----------|---------|---------|
| StockCard | `p-4` | `rounded-xl` |
| IndicatorCard | `p-4` | `rounded-xl` |
| KeyStatistics | `p-4` | `rounded-xl` |
| FundamentalData | `p-4` | `rounded-xl` |
| Screener preset | `p-4` | `rounded-xl` |
| Screener results table | `px-4 py-3` (cells) | `rounded-xl` |
| Stock table cells | `px-3 py-3` | `rounded-xl` |

The inconsistency is in **cell padding**: screener results use `px-4`, stock table uses `px-3`. Both are data tables showing the same data (ticker, price, change, volume). The 4px difference creates subtle misalignment when navigating between `/stocks` and `/screener`.

**Fix — standardize table cell padding to `px-4 py-3`:**

In `src/components/stock/stock-table.tsx`, replace all `px-3 py-3` with `px-4 py-3`.

---

### H3. Missing `tracking-tight` consistency on page titles

**Files:** Multiple pages

| Page | Title Class |
|------|-------------|
| Home hero | `text-4xl font-bold tracking-tight` |
| Stocks page | `text-3xl font-bold tracking-tight` |
| Stock detail | `text-2xl font-bold tracking-tight` |
| Screener | `text-xl font-semibold tracking-tight` |
| Community | `text-2xl font-bold` (NO tracking-tight) |

**Why it fails:** Community page title visually sits wider than stock detail title despite being the same size. Inconsistent letter-spacing breaks typographic rhythm.

**Fix:**
```tsx
// src/app/community/page.tsx:45
<h1 className="text-2xl font-bold tracking-tight">Komunitas</h1>
```

---

### H4. Screener page header lacks the same treatment as other pages

**File:** `src/app/screener/page.tsx`

The stocks page (`/stocks`) has a full-width hero section with `section-tint-warm`, `hero-pattern`, stat badges, and gradient background. The screener page has a plain `max-w-5xl` container with no background treatment — it feels like a different app.

**Fix — give screener the same hero treatment as stocks page:**
```tsx
<div className="fade-in">
  <section className="relative overflow-hidden border-b border-border section-tint-warm">
    <div className="absolute inset-0 hero-pattern" aria-hidden="true" />
    <div className="relative max-w-5xl mx-auto px-4 py-8 space-y-1">
      <h1 className="text-xl font-semibold tracking-tight">Technical Screener</h1>
      <p className="text-text-secondary text-sm">Filter IDX40 stocks by technical conditions</p>
    </div>
  </section>

  <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
    {/* preset grid */}
    <Suspense fallback={null}>
      <ScreenerResults />
    </Suspense>
  </div>
</div>
```

---

### H5. Screener results table and stock table are duplicated layouts

**Files:** `src/components/screener/screener-results.tsx` and `src/components/stock/stock-table.tsx`

Both render nearly identical table markup (ticker link, name, sector, price, change, volume, RSI). The screener results are simpler (no sort/search), but the visual styling differs:
- Stock table cells: `px-3 py-3`, hover `bg-accent/[0.04]`
- Screener cells: `px-4 py-3`, hover `bg-bg-hover/50`

**Why it fails:** Two tables showing the same data look different. Users navigating between `/stocks` and `/screener?preset=golden_cross` see subtle style shifts.

**Fix:** Extract a shared `StockTableRow` component or at minimum align the padding/hover classes.

---

### H6. Stock table RSI bar is too small at 3px width

**File:** `src/components/stock/stock-table.tsx:215`

```tsx
style={{ width: "3px", left: `${stock.rsi14}%` }}
```

**Why it fails:** A 3px indicator dot in a 64px bar is nearly invisible on non-retina displays. The RSI mini-bar is a nice touch but the current implementation looks like a rendering glitch.

**Fix:**
```tsx
// Use an 8px wide pill instead of 3px dot:
style={{ width: "8px", left: `calc(${Math.min(Math.max(stock.rsi14, 4), 92)}% - 4px)` }}
className={`absolute top-0 h-full rounded-full ${rsiBarColor(stock.rsi14)} transition-all duration-300`}
```

---

### H7. Mobile nav menu has no animation — just appears/disappears

**File:** `src/components/layout/header.tsx:157-208`

```tsx
{menuOpen && (
  <nav className="sm:hidden border-t border-border bg-bg-surface px-3 pb-3 pt-1 space-y-0.5">
```

**Why it fails:** The mobile dropdown snaps open instantly. On a financial platform where confidence matters, the jarring appearance feels broken. Compare to Linear or Vercel where mobile menus slide down smoothly.

**Fix:**
```tsx
// Wrap in a transition container:
<nav
  className={`sm:hidden border-t border-border bg-bg-surface overflow-hidden transition-all duration-200 ease-out ${
    menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 border-t-0"
  }`}
  aria-label="Main navigation"
>
  <div className="px-3 pb-3 pt-1 space-y-0.5">
    {/* nav items */}
  </div>
</nav>
```

Remove the conditional `{menuOpen && ...}` wrapper — always render the nav, control visibility with max-height + opacity.

---

### H8. User dropdown menu has no close-on-escape

**File:** `src/components/layout/header.tsx:82-126`

**Why it fails:** The user menu opens on click, closes on backdrop click, but pressing Escape does nothing. Standard dropdown behavior (Linear, Vercel, every OS menu) closes on Escape.

**Fix — add an onKeyDown handler:**
```tsx
// On the outermost div wrapping the user menu:
<div className="relative hidden sm:block" onKeyDown={(e) => { if (e.key === "Escape") setUserMenuOpen(false); }}>
```

Also add an `useEffect` for Escape:
```tsx
useEffect(() => {
  if (!userMenuOpen) return;
  const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setUserMenuOpen(false); };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}, [userMenuOpen]);
```

---

## Nice-to-Have

### N1. Footer is too minimal for an institutional platform

**File:** `src/components/layout/footer.tsx`

The footer is a single-line affair — logo, description, links, and copyright. For a financial platform that wants to build trust, the footer should convey legitimacy.

**Suggestions:**
- Add "Data provided by Yahoo Finance" with attribution
- Add a subtle separator line between links and copyright
- Consider a two-row layout: top row with logo + description left, links right; bottom row with copyright + legal links

---

### N2. 404 page "Stock not found" is inaccurate for non-stock routes

**File:** `src/app/not-found.tsx:9`

```tsx
<h2 className="text-xl font-semibold">Stock not found</h2>
```

This 404 page serves for ALL non-matching routes (e.g., `/about`, `/foo`), not just stock pages.

**Fix:**
```tsx
<h2 className="text-xl font-semibold">Page not found</h2>
```

---

### N3. Indicator panel `text-2xl` value size is disproportionately large

**File:** `src/components/stock/indicator-panel.tsx:68,169,186,202`

RSI shows `text-2xl` (24px) for the main value. ADX/VWAP/ATR show `text-lg` (18px). The RSI card visually dominates the row because of this size difference, even though all indicators are equally important.

**Fix — standardize to `text-lg`:**
```tsx
// RSI card, line 68:
<p className="text-lg font-bold tabular-nums">{rsi14 !== null ? rsi14.toFixed(1) : "—"}</p>
```

---

### N4. Community page title inconsistency — "Komunitas" vs other English page titles

**File:** `src/app/community/page.tsx:45`

All other pages use English titles (Stocks, Screener, Home). Community uses "Komunitas" (Indonesian). The navigation labels are also Indonesian ("Saham", "Komunitas", "Beranda"). Pick one language and be consistent.

**Note:** This may be intentional (bilingual app). If so, keep it but add a comment.

---

### N5. Sector pills in stock table have no scroll indicator

**File:** `src/components/stock/stock-table.tsx:128-155`

On mobile, the sector pills scroll horizontally but there's no visual cue that more pills exist off-screen. Users may not discover the filter options.

**Fix — add a fade gradient on the right edge (already exists for the table, missing for pills):**
```tsx
<div className="relative">
  <div ref={pillsRef} className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1" style={{ scrollbarWidth: "none" }}>
    {/* pills */}
  </div>
  <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-6 bg-gradient-to-l from-bg-primary to-transparent sm:hidden" />
</div>
```

---

### N6. Watchlist page header icon has no filled variant for active state

**File:** `src/components/layout/header.tsx:60-63`

The bookmark icon in the header always renders as outline (`stroke` only). When on the `/watchlist` page, it should render as filled to match the active state convention used in the nav pills.

---

### N7. Stock card dot indicator is nearly invisible

**File:** `src/components/stock/stock-card.tsx:45`

```tsx
<span className={`w-1.5 h-1.5 rounded-full ${isPositive ? "bg-bullish" : "bg-bearish"}`} />
```

A 6px dot at the bottom-right of a card provides almost no visual signal. Consider replacing with a thin colored bar at the top or bottom edge, or making the dot larger (w-2.5 h-2.5).

---

### N8. `depth-shadow-inner` class defined but unused

**File:** `src/app/globals.css`

The CSS defines `depth-shadow-inner` (inset shadow) but no component uses it. Either use it (e.g., on the chart container inner area, or search input focus state) or remove it.

---

### N9. `content-auto` (content-visibility) could benefit stock table rows

**File:** `src/components/stock/stock-table.tsx`

The table renders all 40+ rows eagerly. For the stock table with complex RSI mini-bars, adding `content-visibility: auto` to table rows would improve initial render performance. The utility class `content-auto` already exists in CSS.

---

### N10. No empty state for indicators on stock detail page

**File:** `src/app/stocks/[ticker]/page.tsx:184-188`

When indicators are null, the page shows a flat "No indicator data available" message with no visual treatment. This should match the design system — a card with an icon and a more helpful message (e.g., "Indicators are calculated daily. Check back soon.").

---

## Summary

| Category | Count | Examples |
|----------|-------|----------|
| **Critical** | 4 | Broken dynamic classes (C3), wrong theme color (C1), wrong language (C2) |
| **High Impact** | 8 | Typography chaos (H1), inconsistent tables (H5), missing page treatment (H4) |
| **Nice-to-Have** | 10 | Footer depth (N1), scroll indicators (N5), empty states (N10) |

**Priority order:** C3 (broken buttons) > C1 (brand mismatch) > C2 (accessibility) > C4 (chart bg) > H1 (type scale) > H5 (table consistency) > H4 (screener header) > H3 (tracking) > H7 (mobile nav) > rest
