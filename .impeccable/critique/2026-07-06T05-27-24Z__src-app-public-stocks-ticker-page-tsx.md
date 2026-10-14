---
target: stock detail page (/stocks/[ticker])
total_score: 28
p0_count: 2
p1_count: 3
timestamp: 2026-07-06T05-27-24Z
slug: src-app-public-stocks-ticker-page-tsx
---
# Design Critique — Stock Detail Page (`/stocks/[ticker]`)

**Method: dual-agent (A: design-review · B: detector)**
**Target:** `src/app/(public)/stocks/[ticker]/page.tsx` · live at `/stocks/BBCA.JK`

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | "Data tertunda ~5mnt" honesty is great; no "last updated" timestamp or refresh on the price |
| 2 | Match System / Real World | 4 | Bahasa-first, Rupiah, "gorengan", pivot/ATR plan, sector peers — genuinely IDX-native |
| 3 | User Control & Freedom | 3 | Chart toggles are good; no breadcrumb-up/undo beyond the one-line crumb |
| 4 | Consistency & Standards | 3 | Three different "active/selected" treatments on one page |
| 5 | Error Prevention | 2 | Compare input has no max/empty guard; blur-CTA fires with no preview |
| 6 | Recognition over Recall | 3 | IndicatorTooltip + "Bahasa Sederhana/Lihat Angka" toggle are strong; score/100 lacks a legend |
| 7 | Flexibility & Efficiency | 2 | Zero keyboard shortcuts on a "tool used all day" |
| 8 | Aesthetic & Minimalist | 3 | Above the fold is calm; below drifts into 9 stacked content types with no quiet |
| 9 | Error Recovery | 2 | indicators===null → flat "belum tersedia" no retry; CSP-blocked logos + 401s fail silently |
| 10 | Help & Docs | 3 | Tooltips + plain-language mode are embedded help; no inline "how is the score computed" |
| **Total** | | **28/40** | **Good — solid foundation, weak spots (#7, #9, #4)** |

## Anti-Patterns Verdict
Does it look AI-made? No — but the reserved mono micro-kicker is overused into reflexive scaffolding. Border stripes flagged by both review and detector (detector caught an extra side-stripe on bottom-fishing-radar.tsx:44 `border-l-[4px] border-l-blue-500`). Chart palette drift: 7 undocumented hex families; SMA200 #ef4444 collides with bear-red #dc2626.

## What's Working
1. SignalVerdict leads with a Bahasa verdict before data (signal-verdict.tsx:40).
2. "Bahasa Siderhana / Lihat Angka" toggle serves power-users and learners on one surface (indicator-panel.tsx:160).
3. DeltaArrow + "Above/Below" badges make direction legible without color.

## Priority Issues
- [P0] Reserved mono-kicker became reflexive scaffolding (~12 headers). → quieter/typeset
- [P0] Six GatedContent blur-walls on one anonymous page; teaching layer gated, action layer free — inverted funnel. → clarify/onboard
- [P1] Score "26/100 Kurang Baik" disagrees with verdict "Netral" in emotional register. → clarify
- [P1] Flat heading hierarchy (1 h1, 2 h2, 18 h3). → shape/layout
- [P1] Border stripes: trading-plan-card.tsx:21 border-t-2; bottom-fishing-radar.tsx:44 border-l-[4px] blue-500; inline borderTop:3px page.tsx:762 + health-score-detail.tsx:63. → quieter
- [P2] Chart toolbar 21-option decision point (wraps 4-5 rows mobile). → distill
- [P2] IDX logo CSP-blocked → broken image, silent failure. → harden
- [P2] Chart-series palette drift (7 hex families; SMA200 ≈ bear-red). → document/colorize
- [P3] Three different "active/selected" visual systems. → polish

## Persona Red Flags
- Alex (power trader): zero keyboard shortcuts; no batch/presets/multi-compare; 12-card grid wants a compact table instead.
- Sam (a11y): focus ring real (3px); but flat 18×h3 hierarchy; IndicatorTooltip likely hover-only; compare dropdown mouse-driven; sm HealthScoreBadge is color-only; 9px text too small for low-vision.
- Siti (ID retail, learner, mobile): verdict reassures then "26/100" wobbles it; toolbar of unknown acronyms; discovers Bahasa mode mid-scroll; hits blur-wall on the teaching layer → bounces; bold Trading Plan + invisible disclaimer nudges FOMO.

## Minor Observations
- HealthScoreBadge lg gauge track bg-white/[0.08] near-invisible on white.
- KeyStatistics gradient track flirts with no-gradient rule.
- "Data tertunda ~5mnt" buried in a flex row.
- SentimentBadge + SignalBadge near-duplicate components.
- Three <nav> elements; only one is breadcrumb.

## Questions to Consider
1. Lead with Trading Plan for logged-in traders, verdict for anonymous?
2. Is the 12-card indicator grid a security blanket? Default 3 + Advanced expander?
3. Why is teaching gated while action (Entry/TP/SL) is free?
