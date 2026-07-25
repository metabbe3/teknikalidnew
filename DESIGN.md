---
name: TeknikalID
description: IDX technical-analysis platform — terminal precision meets broadsheet readability for the Indonesia Stock Exchange.
colors:
  signal-blue: "#0369a1"
  signal-blue-bright: "#0ea5e9"
  bull-teal: "#0d9488"
  bear-red: "#dc2626"
  ink: "#1c1917"
  ink-muted: "#78716c"
  paper: "#f8fafc"
  card: "#ffffff"
  rule: "#e7e5e4"
  terminal-slate: "#0f172a"
  terminal-slate-deep: "#1e293b"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.5rem, 3vw, 1.875rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.2em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  card: "12px"
  pill: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-primary-hover:
    backgroundColor: "#2a2723"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  button-ghost-hover:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  pill-filter:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  pill-filter-active:
    backgroundColor: "{colors.signal-blue}"
    textColor: "#ffffff"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "16px"
---

# Design System: TeknikalID

## 1. Overview

**Creative North Star: "The Trading Desk"**

TeknikalID is a calm, professional workspace where dense terminal data meets broadsheet readability. The analyst sits at a desk, not in a casino: numbers are exact and tabular, direction is encoded in color, and every pixel of decoration has to justify itself against the data it surrounds. Authority comes from clarity, never from loudness.

The system runs in two registers that share one desk. **Terminal mode** — dark slate canvases (`#0f172a → #1e293b`), a live mono ticker tape, crosshatch grids, radial glows, Geist Mono numerics — carries the markets when they are open and the data is live. **Broadsheet mode** — Newsreader serif headlines on a cool near-white (`#f8fafc`), generous measure, leading accent rules — carries the editorial publication (berita, akademi) and the human-language verdicts that lead every stock page. The two meet in flagship components like `SignalVerdict`, where a serif verdict sits over mono micro-labels and tabular figures.

Density is earned, not assumed. Charts, screener tables, and the ticker pack tight because a trader needs them to; marketing and prose stay breathable. Whitespace is a tool for focus, not waste. The interface is Indonesian-first (`lang="id"`) and IDX-native — conventions and language are tuned to the BEI, never transplanted from NYSE/Nasdaq templates.

**Key Characteristics:**
- Cool near-white paper (`#f8fafc`) with warm-stone ink (`#1c1917`); one sky-blue brand accent (`#0ea5e9`) used sparingly.
- Direction-as-meaning: teal (`#0d9488`) bullish / red (`#dc2626`) bearish, always paired with a non-color signal (icon, arrow, or label).
- Three typefaces with strict jobs: Plus Jakarta Sans (UI), Geist Mono (all financial values), Newsreader (editorial headlines only).
- Flat-at-rest surfaces that lift on state via soft, layered shadows; reduced-motion always respected.
- Compact, dense controls (`h-8` = 32px default) — a tool, not a brochure.

## 2. Colors

A restrained palette: cool stone neutrals carry 90%+ of the surface; one sky-blue accent carries interaction; teal/red are reserved as **data**, never decoration.

### Primary
- **Signal Blue** (`#0369a1`, sky-700): the readable brand accent — links, active filter pills, CTAs, focus rings, the leading accent rule on section headings. Pinned to WCAG AA on the paper surface (5.7:1 as text, 5.9:1 white-on-fill). One token fixes every accent that carries text or sits behind text.
- **Signal Blue Bright** (`#0ea5e9`, sky-500): the vibrant identity shade, reserved for **decoration only** — the pulse-line logo mark, hero accents, fills with no text on them. Readability isn't a constraint here, so the brighter blue carries the brand energy. The split (readable vs. vibrant) is how the identity stays lively without sacrificing AA.

### Secondary
- **Bull Teal** (`#0d9488`): bullish direction. Price-up values, positive deltas, "buy" signals, healthy states. Always paired with an up-arrow or `▲`.
- **Bear Red** (`#dc2626`): bearish direction and destructive actions. Price-down values, "sell" signals, deletions, errors. Always paired with a down-arrow or `▼`.
- **Warning Amber** (`#b45309`, amber-700; bg `--color-warning-bg`): caution semantics — gorengan/volatility flags, volume-spike badges. A named *caution* token, distinct from the SMA20 chart-amber (which is data-viz only). Text pinned to amber-700 for WCAG AA on paper.

### Neutral
- **Ink** (`#1c1917`): primary text, the default primary-button fill. Warm near-black (stone-900).
- **Ink Muted** (`#78716c`): secondary text — captions, descriptions, unselected nav. Verify contrast at every use; bump toward Ink where it drops below 4.5:1 on tinted backgrounds.
- **Paper** (`#f8fafc`): the body canvas. Cool slate-50, not warm cream — this is not the 2026 AI-paper default.
- **Card** (`#ffffff`): elevated surfaces, cards, inputs at rest.
- **Rule** (`#e7e5e4`): hairline borders and dividers (stone-200).
- **Terminal Slate** (`#0f172a`) / **Terminal Slate Deep** (`#1e293b`): the dark hero gradient endpoints and ticker-tape ground.

### Indicator Overlays (Chart Data-Viz)
Technical-indicator line series use a dedicated data-viz palette, separate from the semantic directional colors. They appear only on charts/panels, never as UI accents.
- **SMA 20** (`#d97706` amber), **SMA 50** (`#8b5cf6` violet), **SMA 200** (`#0ea5e9` sky) — moving averages. SMA 200 is sky (not red) to avoid collision with bear-red.
- **EMA 12** (`#06b6d4` cyan), **EMA 26** (`#ec4899` pink), **Bollinger Bands** (`#2563eb` blue), **ZigZag** (`#f59e0b` amber).
- **RSI** (`#8b5cf6` violet), **MACD** line (`#2563eb`) / signal (`#f97316` orange), **Compare** overlay (`#6366f1` indigo).

**The Chart-Palette Rule.** Indicator-overlay colors are data-viz only. Never reuse bear-red (`#dc2626`) or bull-teal (`#0d9488`) for an indicator line — a moving average is not a directional signal. SMA 200 stays sky (`#0ea5e9`), not red.

**The Direction-Is-Meaning Rule.** Teal and red encode data direction only. Never use them as a generic accent, a decorative gradient stop, or a "nice color" for a non-financial element. If a value isn't a delta or a signal, it isn't teal or red.

**The One-Accent Rule.** Signal Blue is the only brand accent. It appears sparingly — focus, active state, the single leading rule, links. If a second hue feels needed, the answer is almost always ink, a neutral tint, or a directional color — not a new accent.

## 3. Typography

**Display Font:** Newsreader (with Georgia, serif fallback) — editorial headlines only.
**Body/UI Font:** Plus Jakarta Sans (with system-ui, sans-serif fallback).
**Mono Font:** Geist Mono (with ui-monospace fallback) — every financial value.

**Character:** A humanist sans for the desk work, a broadsheet serif for the headlines, and a mono that treats numbers as specimens. The pairing contrasts on a serif/sans/mono axis — never two geometric sans fighting each other. Trust is built in the digits, so anything that is a number, a ticker, a percentage, or a timestamp is set in Geist Mono with tabular figures.

### Hierarchy
- **Display** (Newsreader, 600, `clamp(1.5rem, 3vw, 1.875rem)`, 1.15): editorial headlines — section headings, stock-page verdicts, berita masthead. Never on a tool surface.
- **Headline** (Jakarta, 700, `clamp(1.875rem, 4vw, 3rem)`, 1.1): terminal/product hero titles on dark canvases, page titles.
- **Title** (Jakarta, 600, 1.125–1.25rem, 1.3): card and section titles on light surfaces.
- **Body** (Jakarta, 400/500, 1rem, 1.6): prose and UI text. Cap line length at 65–75ch for editorial; UI frequently drops to 0.875rem.
- **Label** (Geist Mono, 500, 0.625rem, `0.2em` tracking, UPPERCASE): the mono micro-kicker — "VERDIK SINYAL", section eyebrows. A deliberate, named system reserved for data-label contexts, not a reflexive eyebrow above every section.
- **Mono** (Geist Mono, 500, 0.8125rem, tabular): prices, percentages, tickers, timestamps. Always `font-variant-numeric: tabular-nums`.

**The Numbers-Are-Mono Rule.** Every financial value is Geist Mono with tabular figures. A price set in the proportional sans is a bug, not a style choice.

## 4. Elevation

Flat at rest; shadow is a response to state, never ambient decoration. Resting surfaces rely on a 1px hairline rule (`#e7e5e4`) and the paper/card tonal step for separation. Depth appears only when the user acts — hover, focus, drag, or a genuinely elevated surface (sticky header, modals, popovers).

### Shadow Vocabulary
- **Resting hairline** (`box-shadow: 0 0 0 1px rgba(0,0,0,0.03)`): the base edge that replaces a hard border on light cards.
- **Hover lift** (`0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.04)`): cards and list items on hover — they rise 2–3px, the rule dissolves into shadow.
- **Strong lift** (`.depth-shadow-strong`): popovers, sticky panels, modals — the widest, softest falloff.
- **Directional glow** (`0 0 12px rgba(13,148,136,0.15)` / red equivalent): reserved for active bullish/bearish values that demand the eye; never decorative.

### Named Rules
**The Flat-By-Default Rule.** A card at rest has no drop shadow — only a hairline or a tonal step. If a resting surface casts a visible shadow, the shadow is too heavy or the element isn't actually elevated. Audit test: "if it looks like a 2014 app, the shadow is too dark and the blur too small."

**The No-Border-Stripe Rule.** Directional color is conveyed by a background tint (`rgba(13,148,136,0.06)`), a leading accent rule/mark, an icon, or a full border — never by a `border-left`/`border-right` stripe thicker than 1px. Existing legacy stripes (`.trade-card-bullish`, `.holding-card-bullish`, `.comparison-positive`, `.tip-box`, etc.) are deprecated debt to retire.

## 5. Components

Components are dense, calm, and instrumental. Default control height is 32px (`h-8`) — this is a tool used all day, not a marketing site. Rounded corners are gentle (10–12px); pills are fully round only for filters and live-status badges.

### Buttons
- **Shape:** rounded-lg (10px); default height 32px; xs=24, sm=28, lg=36.
- **Primary:** Ink fill (`#1c1917`), white text, 500 weight; on hover lightens to ~`#2a2723`; press translates 1px. The default action color is ink, not Signal Blue — blue is reserved for links and focus.
- **Outline / Ghost:** transparent at rest, Ink-Muted text, lifts to Card background + Ink text on hover. Used for secondary actions and nav.
- **Destructive:** Bear-Red at 10% tint with red text (not a solid red button) — serious but not alarming unless confirmed.
- **Focus:** `outline: 2px solid var(--color-accent); outline-offset: 2px` — always visible, never removed.

### Chips / Filter Pills
- **Style:** fully round (9999px), Card fill, Rule border, Ink-Muted text at 11px.
- **State:** active inverts to Signal-Blue fill / white text; hover takes the blue border + blue text without filling. Used for screener presets, akademi filters, screener tabs on dark heroes.

### Cards / Containers
- **Corner:** 12px.
- **Background:** Card white on Paper; tonal step does the separation.
- **Border:** 1px Rule, or the resting hairline shadow.
- **Shadow strategy:** Flat-By-Default; Hover lift on interactive cards.
- **Padding:** 16px standard; 12–14px in dense data contexts.
- **Directional variant:** bullish/bearish via a faint background gradient tint (`.card-bullish`) + an icon/label — never a side-stripe.

### Inputs / Fields
- **Style:** transparent ground, 1px Rule border, rounded-lg, 32px tall, Geist Mono for numeric inputs.
- **Focus:** border shifts to ring + `ring-ring/50` 3px halo.
- **Error:** Bear-Red border + red ring at 20%. Disabled drops to 50% opacity.

### Navigation
- **Header:** sticky glass bar (`rgba(255,255,255,0.92)` + 12px blur), 56px tall, max-w-7xl. Inline **IHSG live ticker** (mono, tabular, teal/red delta) sits beside the pulse-line logo. Desktop nav = pill links, active state = Ink text on Card-hover fill. Mobile = hamburger → max-height dropdown.

### Signature: SignalVerdict
The flagship. Leads every stock page with a plain-language verdict before the data dump — "practice what you preach" made literal. A leading accent rule (teal/red/stone by outlook) + mono micro-kicker "VERDIK SINYAL" + a **Newsreader serif** verdict colored by outlook, over a one-sentence Bahasa summary, mono RSI/gorengan/hype pills, and a numeric score gauge. It answers the beginner's question first; the indicators justify it below.

### Signature: Ticker Tape
A scrolling mono marquee on Terminal Slate ground (`#0f172a`), 11px tabular figures, ticker symbols + price + teal/red delta, paused on hover. The terminal's heartbeat on the homepage — present only where live-market context belongs.

### Signature: SectionHeading
The broadsheet rhythm component: a 4px-wide Signal-Blue leading rule + optional mono micro-kicker + Newsreader serif title + an optional action on the right. One named system; do not duplicate its kicker reflexively above every section.

## 6. Do's and Don'ts

### Do:
- **Do** set every financial value — price, %, ticker, timestamp — in Geist Mono with `tabular-nums`.
- **Do** pair every bullish/bearish color with a non-color signal (▲/▼, icon, or word) so direction reads without color.
- **Do** lead stock pages with a plain-language `SignalVerdict` in Bahasa Indonesia before the indicator data.
- **Do** keep surfaces flat at rest (hairline or tonal step) and reserve shadow for hover, focus, and genuine elevation.
- **Do** use the Newsreader serif only for editorial headlines and verdicts; switch to Jakarta for tool/UI surfaces.
- **Do** verify `Ink-Muted` (`#78716c`) contrast at every use and bump toward Ink where it falls below 4.5:1.
- **Do** honor `prefers-reduced-motion`: pause the ticker, drop the stagger, and kill the pulses.

### Don't:
- **Don't** use `border-left`/`border-right` thicker than 1px as a colored stripe (the legacy `.trade-card-bullish`, `.holding-card-*`, `.comparison-*`, `.tip-box`, `.warning-box`, `.akademi-featured` stripes are debt to retire). Use a background tint, a leading rule, or a full border.
- **Don't** apply gradient text (`background-clip: text`) anywhere — the admin `.admin-gradient-text` is debt. Emphasis comes from weight or size, in one solid color.
- **Don't** build "crypto / gambling-bro hype": no neon gradients, moon/rocket iconography, or get-rich-quick energy. (PRODUCT.md anti-reference.)
- **Don't** default to the "generic SaaS-fintech" look: no cream/beige 2026-AI paper, identical icon-card grids, or the big-number + supporting-stats hero-metric template. (PRODUCT.md anti-reference.)
- **Don't** ship cluttered legacy-broker density — low-contrast tables crammed together. Density must be earned and legible. (PRODUCT.md anti-reference.)
- **Don't** copy NYSE/Nasdaq visual conventions wholesale — this is an IDX product for an Indonesian audience. Localize, don't transplant. (PRODUCT.md anti-reference.)
- **Don't** add a tiny uppercase tracked eyebrow above every section — the mono micro-kicker is a reserved system for data-label contexts (verdicts, section headings), not reflexive scaffolding.
- **Don't** put a resting drop shadow on a card that isn't elevated, and never animate layout properties when transform/opacity will do.
