# Handoff: The 99 — Brand System

## Overview
"The 99" is a web companion app for Magic: The Gathering's Commander format. This package
defines the **brand foundation** — color, typography, logomark, and core UI token usage — to
be implemented before feature work begins. It is the reference every screen should be built
against.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing the
intended look and system, not production code to copy line-for-line. The task is to **translate
this brand system into the target codebase's environment** (e.g. React + CSS variables /
Tailwind theme / a tokens file) using its established patterns. If no environment exists yet,
stand the tokens up in whatever framework the app will use (a `tokens.css`/`theme.ts` layer is
the natural home). Do not ship the HTML directly.

## Fidelity
**High-fidelity.** Colors, hex values, type sizes/weights, and the logomark construction are
final and should be reproduced exactly. Spacing in the reference sheet is illustrative; adopt
the codebase's spacing scale, but keep the type scale and color tokens verbatim.

## Design decisions (locked)
- **Palette:** A · Table Candlelight (dark, warm near-black ground, brass accent).
- **WUBRG:** the five Magic colors are adopted as a *tag/identity* system only (pips, chips,
  deck-color bars) — never as surfaces or large fills. The brass accent always leads.
- **Type:** Cinzel (display/headings/wordmark) · IBM Plex Sans (UI + reading copy) ·
  IBM Plex Mono (all numbers, labels, tabular columns). All free on Google Fonts.
- **Logomark:** crowned numeral (three diamonds centered over "99"). XCIX seal and card-fan
  are secondary marks.
- **Tone:** flavor in headings/wordmark/empty states; the data UI stays quiet and legible.

## Design Tokens

### Neutrals — ground & surface
| Token    | Hex       | Usage                    |
|----------|-----------|--------------------------|
| base     | `#14110E` | app background           |
| surface  | `#1E1A15` | cards, panels            |
| elevated | `#2A241D` | rows, inputs, chips      |
| line     | `#3A3229` | borders, dividers        |

### Text
| Token     | Hex       | Usage                     |
|-----------|-----------|---------------------------|
| primary   | `#EDE6D8` | headings, values          |
| secondary | `#C6B79A` | body copy                 |
| muted     | `#A89B84` | secondary data            |
| faint     | `#8E8269` | labels, hints, hex captions |

**Ramp reconciled with the sheet.** The draft table omitted two colors the sheet actually
used; both are now resolved into the four-step ramp above:
- `#B9AB92` (5 uses) consolidated into **secondary `#C6B79A`** — the sheet is updated.
- `#8E8269` (the sheet's most-used caption/label color, 36 uses) is now the named **faint**
  token, replacing the draft's `#7C7059`.

**Faint contrast fixed.** The draft faint `#7C7059` measured ~3.8:1 on base `#14110E` — below
WCAG AA (4.5:1) for small text. The new faint `#8E8269` measures ~4.97:1 on base, passing AA
for the 11px uppercase Plex Mono labels it's specced for. The sheet is updated; there is no
remaining `#7C7059` in the system.

### Accent — brass
| Token        | Hex       | Usage                        |
|--------------|-----------|------------------------------|
| accent       | `#C9A24B` | primary actions, mark, focus |
| accent-hover | `#D8B25E` | hover/active on accent       |

Accent buttons use `#14110E` text on `#C9A24B` fill.

### State
| Token   | Hex       | Usage                    |
|---------|-----------|--------------------------|
| success | `#6FA368` | complete, owned          |
| warning | `#E0913C` | missing, attention       |
| danger  | `#C6533F` | over budget, destructive |

**Warning shifted from the draft `#D2A24A` to `#E0913C` (amber-orange).** The draft value was a
yellow-gold nearly identical to the brass accent `#C9A24B`, so warning-tinted rows (e.g. missing
cards) would have read as the brand accent sitting beside brass primary actions. `#E0913C` is a
distinct hue that separates cleanly from brass. The sheet is updated to match.

### WUBRG identity tags (small markers only)
| Color      | Hex       |
|------------|-----------|
| W (white)  | `#E8E4D6` |
| U (blue)   | `#4A7FB5` |
| B (black)  | `#5B5566` |
| R (red)    | `#C05A48` |
| G (green)  | `#6B9E63` |

### Radius
- Chips / pills: `999px`
- Buttons, inputs, rows: `8px`
- Cards / panels: `10–12px`

## Typography scale
Font families: `'Cinzel', serif` · `'IBM Plex Sans', sans-serif` · `'IBM Plex Mono', monospace`.
Google Fonts:
`Cinzel:wght@400;500;600;700;800;900`,
`IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500`,
`IBM+Plex+Mono:wght@400;500;600`.

| Style    | Font          | Size | Weight | Notes                                  |
|----------|---------------|------|--------|----------------------------------------|
| Display  | Cinzel        | 48   | 800    | page/hero titles                       |
| Section  | Cinzel        | 30   | 700    | section headings                       |
| Subhead  | Cinzel        | 22   | 600    | card/group titles                      |
| Lead     | Plex Sans     | 19   | 400    | intro copy; often italic for flavor    |
| Body     | Plex Sans     | 16   | 400    | line-height 1.65                       |
| Small    | Plex Sans     | 14   | 500    | card meta, type lines                  |
| Data     | Plex Mono     | 14   | 400    | tabular figures — align columns        |
| Label    | Plex Mono     | 11   | 500    | uppercase, letter-spacing 0.16em       |

Rule of thumb: **every number, code, and column label is Plex Mono** so figures align; anything
with personality is Cinzel; everything else is Plex Sans.

## Logomark
- **Primary — crowned numeral:** "99" in Cinzel weight 800–900 with three brass diamonds
  (`transform: rotate(45deg)`) centered above the digits — a small–large–small crown. The digit
  block has **no letter-spacing** so the crown centers on the glyphs; the crown row carries a
  ~-3px optical `translateX`. Ratio guide (at 104px "99"): diamonds 15/20/15px, gap 9px,
  crown-to-numeral gap ~12px.
- **Wordmark:** small tracked mono `THE` (letter-spacing ~0.42em) set close to the left of the
  crowned "99".
- **Favicon:** 64 and 32px keep the crown; **at/below 24px drop the crown** and use the brass
  numerals alone (`#C9A24B` on `#14110E`).
- **Secondary marks:** XCIX in a rounded brass-outlined badge (splash/loading/stamps); "99"
  emerging from a fan of three cards (marketing, empty states).
- Reproduce these as inline SVG in production for crispness; the HTML uses CSS boxes as a
  reference only.

## Components in context (reference)
- **Primary button:** `#C9A24B` fill, `#14110E` text, Plex Sans 600 / 14px, radius 8px,
  padding 10×18. Hover → `#D8B25E`.
- **Secondary button:** transparent fill, `1px #3A3229` border, `#EDE6D8` text.
- **Danger button:** transparent, `1px #4A2F28` border, `#C6533F` text.
- **Color chip:** `#2A241D` pill, Plex Mono 12px, a 10px WUBRG square swatch, label text.
- **Status row:** `#2A241D` row, radius 8px, `3px` left border in the state color, label in
  Plex Sans + value in Plex Mono tinted to the state color.

## Assets
No raster assets. Fonts load from Google Fonts. The logomark and all swatches are pure
CSS/markup and should be rebuilt as SVG/components in the target codebase.

## Files
- `The 99 — Brand Sheet.dc.html` — the locked reference sheet (this handoff's source of truth).
- `The 99 Brand Discovery.dc.html` — the fuller discovery board (tone, palette options, type
  specimens, logomark concepts) for additional context on how decisions were reached.

Both are single self-contained HTML files; open directly in a browser. They are authored as
Design Components but render standalone.
