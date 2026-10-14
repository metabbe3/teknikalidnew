---
target: homepage (logged-in + logged-out)
total_score: 32
p0_count: 1
p1_count: 2
timestamp: 2026-07-06T09-21-40Z
slug: homepage-logged-in-logged-out
---
# Design Critique — Homepage (LO+LI) + Auth + About

**Method: dual-agent (A: design review · B: detector), parent-owned browser.**
**Trend: first homepage run. Score: 32/40 (mid-Good).**

## Design Health Score (32/40)
LO/LI: H1=4/4, H2=4/4, H3=3/3, H4=2/2, H5=3/3, H6=3/3, H7=3/2, H8=4/2, H9=3/3, H10=3/3. Logged-out carries; logged-in drags (identity fragmentation).

## Anti-Patterns Verdict
LO `/` FAIL: side-stripe (.featured-stock-card::before), identical icon-card grid (PlatformFeatures). LI `/` FAIL: hero-metric (PersonalizedGreeting bento), mono-kicker proliferation (13 card titles). about FAIL: VALUES 2×2 grid. Detector: 2 hex + ~14 Tailwind-utility off-palette (violet/blue-500/bg-*-50, 8-hue BADGE_STYLES, 5-step SIGNAL_STYLES).

## What's Working
Brand: serif hero "tanpa nebak-nebak"; AuthBrandPanel; live ticker/market-status restraint.
Product: Numbers-Are-Mono flawless; portfolio card P&L+signal+disclaimer; empty states with CTAs.

## Priority Issues
- [P0] Light→dark identity flip unearned on `/` (two card systems, two signal palettes). → shape+quieter
- [P1] Off-palette drift ~14 usages (violet radar identity, blue-500 primary, bg-*-50 RSI pills, 8/5-hue badge/signal styles). → quieter
- [P1] Mono-kicker as card titles (13 in personalized-beranda). → quieter+typeset
- [P2] .featured-stock-card::before 3px left stripe. → quieter
- [P2] text-gray-500 on #0f172a ≈ 4.0:1 (below AA). → polish
- [P2] Identical icon-card grids (PlatformFeatures + about VALUES). → distill
- [P3] reduced-motion gap (.animate-pulse/.glow/ticker); cta teal-500 + auth text-bullish Direction-Is-Meaning slips. → harden+quieter

## Persona Red Flags
- Jordan: side-striped cards + PlatformFeatures read "retail broker portal."
- Alex: overnight-movers buried 3rd; 15+ unprioritized entry points.
- Sam (new): empty state = 5 "you have nothing" cards = wall.
- Siti: Bahasa excellent; dark-surface mono-label contrast risk.

## Minor
- $ticker prefix (Nasdaq convention) personalized-beranda:405.
- Inconsistent section-title type (font-black vs font-serif).
- about border-border/60 fuzzy edges.

## Questions
1. Should the dashboard be dark at all (strongest brand surfaces are light)?
2. Is PlatformFeatures converting anyone (cargo-cult)?
3. Why 8 generic quick-nav vs a "recently viewed" rail?
