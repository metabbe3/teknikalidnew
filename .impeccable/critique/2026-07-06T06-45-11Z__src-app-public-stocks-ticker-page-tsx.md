---
target: stock detail page (/stocks/[ticker])
total_score: 34
p0_count: 0
p1_count: 1
timestamp: 2026-07-06T06-45-11Z
slug: src-app-public-stocks-ticker-page-tsx
---
# Design Re-Critique — Stock Detail Page (`/stocks/[ticker]`)

**Method: dual-agent (A: design re-review · B: detector re-scan)**
**Target:** `/stocks/BBCA.JK` · Prior 28/40 → **34/40**

## Resolution of the 9 fixes
7 RESOLVED, 2 PARTIAL, 0 regressed. PARTIAL: #2 DailyAnalysis still has a `border-l-[3px]` bear-red side-stripe (narrative paragraph, missed); #3 DailyAnalysis footer DYOR still `text-[11px]` (others bumped to text-xs).

## Design Health Score (34/40, +6)
H1=4, H2=4, H3=4, H4=3, H5=3, H6=4, H7=3, H8=3, H9=3, H10=3. Ceiling held by DailyAnalysis register drift (#4/#8) + overlay gate (#7).

## Anti-Patterns Verdict
7 PASS / 1 FAIL. Only remaining side-stripe: daily-analysis-section `border-l-[3px]` red. Detector confirms trading-plan-card, bottom-fishing-radar, SMA200 red all gone. 22 detector findings = sanctioned Indicator-Overlay chart palette (false positives; documented in DESIGN.md Chart-Palette Rule).

## What's Working
1. SignalVerdict leads with Bahasa verdict before data.
2. "Bahasa Sederhana" indicator toggle serves learners without penalizing power users.
3. Heading hierarchy (1 h1 / 6 h2) + score reconciliation (Lemah, not Kurang Baik).

## Priority Issues (next pass)
- [P1] DailyAnalysis visual-register drift: border-l-[3px] red stripe + mood gradient + teal/blue tinted Investor/Trader cards + 🏦⚡ emoji. → quieter
- [P2] Overlays gated behind login — Alex can't add SMA200 cold. Product call. → clarify
- [P2] DailyAnalysis footer DYOR text-[11px] (others text-xs). → polish
- [P3] Hero sector label sans-uppercase tracked survivor. → quieter
- [P3] Triple "Daftar gratis" gate repetition in sidebar. → onboard

## Persona Red Flags
- Alex: overlay dropdown behind sign-in wall = cold-visit blocker.
- Sam: dropdown has no Esc-close handler (backdrop is tabindex -1); tooltips may be hover-only.
- Siti: DailyAnalysis dense/bold wall on mobile; "Data tertunda ~5mnt" caveat is the smallest text.

## Minor Observations
- DailyAnalysis mood gradient = only gradient surface, shifts register.
- Free DailyAnalysis may cannibalize gated TradingPlanCard.
- Health Score appears 3× (verdict/hero/sidebar).

## Questions
1. Free teaching layer out-shouts gated value layer — invert visual weight?
2. Overlay gate: protecting revenue or protecting the hook?
3. Verdict → 12-card jump: add a 3-bullet "why this verdict" bridge for Siti?
