---
target: screener (/screener)
total_score: 23
p0_count: 2
p1_count: 2
timestamp: 2026-07-06T14-03-09Z
slug: screener-screener
---
# Design Critique — Screener (`/screener`)

**Method: dual-agent (A: design review · B: detector), parent-owned browser. Trend: first run. Score: 23/40 (Acceptable, low).**

## Design Health Score (23/40)
H1=3, H2=3, H3=3, H4=2, H5=3, H6=2, H7=1, H8=3, H9=2, H10=1. Right architecture, wrong finish on tool-critical dims (keyboard #7, consistency #4, help #10).

## Anti-Patterns Verdict
5/8 bans PASS. FAIL: identical card grids (preset + 8-card custom builder), resting drop-shadows on non-elevated cards (Flat-By-Default), side-stripes border-l-[3px] on active preset/filter cards (banned even for active states). Detector exit 0 (clean on CSS text) but blind to TS literals + Tailwind utilities: recovered 5 accentHex literals, 5-hue trading-style palette, 5-step signal rainbow, RSI blue/amber card literals, lone emerald-500. Bug: Bottom Fishing accentHex #0ea5e9 (sky) ≠ accentRgb blue — visible card inconsistency.

## What's Working
1. Virtualization + URL-synced filter state (shareable, bookmarkable, back-safe).
2. Server-rendered crawler table (clean SEO/UX separation).
3. Table data-viz hygiene (mono/zebra/directional color via changeColor/rsiColor, sticky glass header).

## Priority Issues
- [P0] Results rows are <div onClick={window.location.href}> — not keyboard-focusable, no role/Enter/arrow nav, headers not sortable. Fails Sam, kneecaps Alex, WCAG AA violation. → harden+optimize
- [P0] Active-pill white on per-style accent fails AA (#f59e0b 1.83:1, #10b981 2.04:1, #0ea5e9 2.77:1). 5-hue palette violates One-Accent. → polish+quieter (one Signal Blue #0369a1 fill)
- [P1] Two signal-color systems: table correct tokens, cards bg-blue-50/bg-amber-50/text-emerald-500 + 5-step rainbow. Collapse to bull-teal/neutral/bear-red + ▲/●/▼. → quieter
- [P1] Side-stripes border-l-[3px] + resting depth-shadow on preset/filter cards. Remove border-l; signal active via ::before top-rule + tint. Fix accentHex/accentRgb mismatch. → quieter
- [P2] Custom builder: 8 flat ungrouped filters (wall of options). Group into 3-4 clusters + named combinations. → distill+onboard
- [P3] Fetch failures silently return [] (no error vs zero-match distinction). → harden

## Persona Red Flags
- Alex: no keyboard nav, no sortable headers, row action = full page nav. Back to TradingView.
- Sam: rows are divs (no keyboard/semantics), no aria-sort, sliders lack aria-valuetext, active-pill contrast fails 3/5 styles, color-only intensity signal.
- Siti: jargon wall (Golden Cross/Supertrend/OBV untranslated, no akademi links); 10-col table defaults to table view on 390px (card view not auto-selected).

## Minor
- side-effect-in-memo (useState+useMemo onFilterChange) — React 19 double-fire risk.
- saved-screener delete 3s auto-cancel with no label change; bell active = text-amber-500 (3rd accent).
- text-text-tertiary/40 icons likely below 3:1.
- window.location.href kills SPA nav.

## Questions
1. Is "Custom" a peer of the 4 styles or a mode? (presets: [] — type system says it doesn't fit). Split "By strategy / By indicator"?
2. Trust inversion: 8-filter builder (power) but inert table headers (everyone). Why?
3. Signals lead to a dead-end jump — inline preview drawer (triage queue) vs launchpad?
