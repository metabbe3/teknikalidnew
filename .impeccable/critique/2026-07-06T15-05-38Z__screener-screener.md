---
target: screener (/screener)
total_score: 28
p0_count: 0
p1_count: 0
timestamp: 2026-07-06T15-05-38Z
slug: screener-screener
---
# Screener Re-Critique — `/screener`

**Method: dual-agent (A: design re-review · B: detector). Trend: 23 → 28 (+5).**

## Tab bug (user-reported) — FIXED
Inactive .screener-pill was rgba(255,255,255,0.6) (white-on-white on light card). Now text-secondary + border; hover accent. Active white-on-#0369a1.

## Score 28/40 (+5)
H4 2→3, H6 2→3, H7 1→3 (+2), H9 2→3. H10 help still 1 (jargon, no inline defs).

## Fixes verified
6/7 RESOLVED (keyboard-nav, active-pill+tab-contrast, signal unification, builder grouping, error state, polish). 1 regression (card-view bookmark /40) found + fixed. Detector exit 0 clean; all fixes held; destructive-red (4 sites) = system danger-token gap, not screener drift.

## Remaining (P3/polish)
- ARIA grid half-implemented (rows role=row, no parent table/grid, headers not columnheader) → complete or revert to role=link.
- Signal Score slider opaque (-1..+1, no caption) → biggest H10/Siti gap.
- Results section double-accented (leading bar + ResultsHeader title).
- .screener-preset-card::before top gradient bar — allowed top-edge accent (not a side-stripe); mild aesthetic on custom tab's 8 slate bars.

## Persona residual
- Siti: jargon wall (RSI/ADX/OBV/Supertrend/Signal Score, no inline help) — H10=1. Grouped labels help; ?/akademi links remain the gap.
- Alex: largely served; only Signal-Score opacity gives pause.
