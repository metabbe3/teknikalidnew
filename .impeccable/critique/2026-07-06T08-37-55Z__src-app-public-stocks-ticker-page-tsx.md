---
target: stock detail page (/stocks/[ticker])
total_score: 35
p0_count: 0
p1_count: 1
timestamp: 2026-07-06T08-37-55Z
slug: src-app-public-stocks-ticker-page-tsx
---
# Design Re-Critique 3 — Stock Detail Page

**Method: dual-agent (A: design re-review · B: detector re-scan)**
**Target:** `/stocks/BBCA.JK` · Trend: 28 → 34 → **35/40** (top of Good, one from Excellent)

## Resolution of the 4 fixes
All 4 RESOLVED, no regressions: DailyAnalysis calmed (side-stripe + mood gradient + tinted emoji cards removed), disclaimer aligned, hero sector label de-uppercased, triple sidebar gate → 1 consolidated.

## Design Health Score (35/40, +1)
H1=4, H2=3 (−1: English sector label), H3=4, H4=4 (+1: DailyAnalysis consistency), H5=3, H6=4, H7=3, H8=4 (+1: minimalism), H9=3, H10=3.

## Anti-Patterns Verdict
8/8 PASS. Detector: 23 findings, all sanctioned Indicator-Overlay chart palette (false positives). Zero border-accent / side-stripes — structural cleanup stable.

## What's Working
1. DailyAnalysis prose flow reads authored.
2. Consolidated sidebar gate (one CTA).
3. Mobile integrity (zero overflow 390px).

## Priority Issues (next pass — polish-tier, no slop)
- [P1] "Saham Hari Ini" green mono-uppercase badge — loudest element now, breaks calm register. → quieter
- [P2] Duplicate disclaimers (DailyAnalysis footer + IndicatorPanel caption ~400px apart). → distill
- [P2] English GICS sector label "Financials" on Indonesian page. → clarify (localize)
- [P3] Dual mood-driven 3px top bars (DailyAnalysis + hero). → quieter

## Persona Red Flags (residual)
- Alex: narrative restates indicator strip (skims).
- Sam: verify gated overlay focus-suppression.
- Siti: English "Financials" = the one non-Bahasa word in the hero.

## Minor Observations
- Anonymous 401 logs as error every load (Sentry noise).
- "Data tertunda ~5mnt" appears twice — consolidate.

## Questions
1. Is "Saham Hari Ini" earning its mid-page slot or SEO scaffolding?
2. Hero carries ~16 elements — graduate some to a secondary strip?
3. Is the DailyAnalysis mood bar under-signaling risk vs the hero bar?
