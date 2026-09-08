# Design Property Table — Art Wash Readability

Source: `design/design_handoff_the99_art_wash/` — `README.md`, `READINESS.md`,
`The 99 - Art Wash Readability v2.dc.html` (**the deliverable**),
`The 99 - Art Wash Readability.dc.html` (R1, superseded).
`support.js` is the canvas runtime (generated `dc-runtime` bundle) and carries no design values.

**Breakpoint note.** The canvas is desktop-only (frames 900 / 1140 / 1300px, no phone frame, no
breakpoint markers). READINESS §🎭 records this as a gap and eng clarification 3 settles it: **one
band height at both breakpoints**, because decision 8 makes the `left-portrait` geometry
width-independent by construction. Mobile and Desktop columns therefore carry the same value on
almost every row; where they differ (deck grid column width driving the `cover` band height) it is
called out explicitly.

**Hex vs token.** The canvas states literal Palette A hexes. README "Notes for engineering" and
READINESS eng clarification 2 rule that every literal mixes off a theme token
(`color-mix(in oklab, var(--bg) N%, transparent)`, L1 → `var(--bg)`, ink → the theme text ramp).
The tables below record the **design value** (the hex/rgba as drawn) and name the token it maps to
where the handoff states one. Implementation may substitute the token; the mix percentage must
equal the alpha recorded here.

---

## Component: ArtWash (shared primitive)

One component, four call sites. Props that vary: `strategy`, `band`, `imageUri`, `colorIdentity`
(READINESS eng clarification 8). Everything below is **internal and constant** — a call site cannot
override it.

### Constants (all strategies, all surfaces)

| Property | Mobile | Desktop |
|----------|--------|---------|
| Image source | `image_uris.art_crop` (626×457) — never `normal` / `large` / `png` | same |
| Modal DFC face | front face | same |
| Lookup key | Scryfall card `id` (not `named?exact=`) | same |
| `background-position` (focal) | `center top` | same |
| Layer order | L1 base plate → L2 art → L3 gradient scrim | same |
| L1 `background-color` | `#0E0C09` → `var(--bg)` | same |
| Divider `border-top` | `1px solid #2A241D` | same |
| Ground `background` (below divider) | `#1A160F` | same |
| Chip-on-art `background` | `#14110E` (opaque, no alpha) | same |
| Chip-on-art `border` | `1px solid #3A3229` | same |
| Title `color` | `#F4EFE3` at 100% opacity | same |
| Subtitle `color` | `#C6B79A` at 100% opacity | same |
| Title/subtitle `text-shadow` (cover surfaces) | `0 1px 3px rgba(0,0,0,0.65)` | same |
| Contrast floor — titles | 7:1 | same |
| Contrast floor — meta | 4.5:1 | same |
| `backdrop-filter` | — (explicitly rejected) | — |
| `background-repeat` (every art layer) | `no-repeat` | same |
| `url()` quoting | double quotes inside `url()`, plus `.replace(/'/g,'%27')` | same |

### Strategy `cover` — layer stack

| Property | Mobile | Desktop |
|----------|--------|---------|
| Wrapper `position` | `relative` | same |
| Wrapper `aspect-ratio` | `2.2/1` | same |
| Wrapper `overflow` | `hidden` | same |
| Wrapper `background` (L1) | `#0E0C09` | same |
| L2 `position` / `inset` | `absolute` / `0` | same |
| L2 `background-size` | `cover` | same |
| L2 `background-repeat` | `no-repeat` | same |
| L2 `background-position` | `center top` | same |
| L2 `opacity` | `0.58` | same |
| L3 `position` / `inset` | `absolute` / `0` | same |
| L3 `background` | `linear-gradient(180deg, …)` — stops below | same |
| L3 stop 1 | `rgba(14,12,9,0.90) 0%` | same |
| L3 stop 2 | `rgba(14,12,9,0.30) 40%` | same |
| L3 stop 3 | `rgba(14,12,9,0.52) 74%` | same |
| L3 stop 4 | `rgba(14,12,9,0.86) 100%` | same |
| Ambient layer | — | — |
| `mask-image` | — | — |

### Strategy `left-portrait` — layer stack

Four layers: ambient `cover` copy, sharp height-sized portrait with its own mask, horizontal scrim
in **px**, then (commander row only) a vertical scrim.

| Property | Mobile | Desktop |
|----------|--------|---------|
| Wrapper `position` | `relative` | same |
| Wrapper `height` | fixed px per surface (148 / 72) | same |
| Wrapper `overflow` | `hidden` | same |
| Wrapper `background` (L1) | `#0E0C09` | same |
| Ambient `position` / `inset` | `absolute` / `0` | same |
| Ambient `background-size` | `cover` | same |
| Ambient `background-position` | `center top` | same |
| Ambient `background-repeat` | `no-repeat` | same |
| Ambient `opacity` | per surface (`0.20` / `0.14`) | same |
| Sharp `position` | `absolute` | same |
| Sharp `inset` | `left:0; top:0; bottom:0` | same |
| Sharp `width` | `band × 1.37` (px) | same |
| Sharp `background-size` | `auto 100%` | same |
| Sharp `background-position` | `left center` | same |
| Sharp `background-repeat` | `no-repeat` | same |
| Sharp `opacity` | per surface (`0.80` / `0.85`) | same |
| Sharp `-webkit-mask-image` | `linear-gradient(90deg,#000 0 <F>%,transparent 100%)` | same |
| Sharp `mask-image` | `linear-gradient(90deg,#000 0 <F>%,transparent 100%)` | same |
| Horizontal scrim `position` / `inset` | `absolute` / `0` | same |
| Horizontal scrim stop unit | **px**, never % — keyed to portrait width | same |
| Portrait multiplier | `1.37` (crop's native 626×457) | same |

---

## Component: Deck tile (`/decks`)

### Card shell

| Property | Mobile | Desktop |
|----------|--------|---------|
| `border-radius` | `14px` | `14px` |
| `background` | `#1A160F` | same |
| `border` | `1px solid #2A241D` | same |
| `overflow` | `hidden` | same |
| `min-width` | `0` | same |
| Grid `gap` (canvas) | `20px` | `20px` |
| Grid columns (canvas) | `repeat(auto-fit,minmax(300px,1fr))` | same |

### Art band (strategy `cover`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` | `relative` | same |
| `aspect-ratio` | `2.2/1` | same |
| `min-height` | `104px` (READINESS eng clarification 6) | `104px` |
| `max-height` | — (no ceiling, by ruling) | — |
| `background` (L1) | `#0E0C09` | same |
| `overflow` | `hidden` | same |
| Resulting band height | 640px viewport → **86px**, clamped to the `104px` floor | 768 → 96px · 1024 → 135px · 1280 → 174px · 1440 → 198px (each clamped at 104px floor) |
| L2 `background-size` | `cover` | same |
| L2 `background-position` | `center top` | same |
| L2 `background-repeat` | `no-repeat` | same |
| L2 `opacity` | `0.58` | same |
| L3 `background` | `linear-gradient(180deg,rgba(14,12,9,0.90) 0%,rgba(14,12,9,0.30) 40%,rgba(14,12,9,0.52) 74%,rgba(14,12,9,0.86) 100%)` | same |

### Label block (top-left of band)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` | `absolute` | same |
| `left` | `16px` | `16px` |
| `top` | `15px` | `15px` |
| `right` | `16px` | `16px` |
| `display` | `flex` | same |
| `align-items` | `flex-start` | same |
| `justify-content` | `space-between` | same |
| `gap` | `12px` | `12px` |
| Inner text column `min-width` | `0` | same |

### Deck name (title)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `font-family` | `'Cinzel', serif` (`var(--font-display)`) | same |
| `font-weight` | `700` | `700` |
| `font-size` | `20px` | `20px` |
| `line-height` | `1.15` | `1.15` |
| `letter-spacing` | — | — |
| `text-transform` | — | — |
| `color` | `#F4EFE3` | same |
| `text-shadow` | `0 1px 3px rgba(0,0,0,0.65)` | same |
| `white-space` | `nowrap` | same |
| `overflow` | `hidden` | same |
| `text-overflow` | `ellipsis` | same |

### Deck subtitle (commander name)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `font-family` | `'IBM Plex Sans'` (body) | same |
| `font-weight` | `400` | `400` |
| `font-size` | `12px` | `12px` |
| `color` | `#C6B79A` | same |
| `margin-top` | `4px` | `4px` |
| `text-shadow` | `0 1px 3px rgba(0,0,0,0.65)` | same |
| `white-space` | `nowrap` | same |
| `overflow` | `hidden` | same |
| `text-overflow` | `ellipsis` | same |

### Overflow (`···`) button, on art

| Property | Mobile | Desktop |
|----------|--------|---------|
| `width` | `30px` | `30px` |
| `height` | `26px` | `26px` |
| `flex` | `none` | same |
| `border-radius` | `6px` | `6px` |
| `background` | `#14110E` (opaque) | same |
| `border` | `1px solid #3A3229` | same |
| `display` | `flex` | same |
| `align-items` | `center` | same |
| `justify-content` | `center` | same |
| `color` | `#C6B79A` | same |
| `font-size` | `15px` | `15px` |
| `letter-spacing` | `1px` | `1px` |

### Status chip, on art (bottom-left)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` | `absolute` | same |
| `left` | `16px` | `16px` |
| `bottom` | `13px` | `13px` |
| `font-family` | `'IBM Plex Mono', monospace` (`var(--font-mono)`) | same |
| `font-size` | `11px` | `11px` |
| `letter-spacing` | `0.06em` | `0.06em` |
| `color` | `#8FC08A` (status-keyed; from `status-style.ts`) | same |
| `background` | `#14110E` (opaque — was an 18% `color-mix`) | same |
| `border` | `1px solid #33402F` (status-keyed) | same |
| `border-radius` | `6px` | `6px` |
| `padding` | `5px 9px` | `5px 9px` |
| No own scrim plate | true — L3's 4th stop replaces it | same |

### Footer (below divider, flat ground)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `border-top` | `1px solid #2A241D` | same |
| `padding` | `14px 16px 16px` | same |
| `display` | `flex` | same |
| `flex-direction` | `column` | same |
| `gap` | `11px` | `11px` |
| `background` | `#1A160F` (inherited card ground) | same |

### Footer row 1 — pips / identity / count

| Property | Mobile | Desktop |
|----------|--------|---------|
| Row `display` | `flex` | same |
| Row `align-items` | `center` | same |
| Row `justify-content` | `space-between` | same |
| Row `gap` | `12px` | `12px` |
| Pip strip `display` | `flex` | same |
| Pip strip `gap` | `5px` | `5px` |
| Pip `width` / `height` | `13px` / `13px` | same |
| Pip `border-radius` | `3px` | `3px` |
| Pip `background` | identity colour (`W #E8E4D6`, `U #4A7FB5`, `B #5B5566`, `R #C05A48`, `G #6B9E63`) | same |
| Pip `box-shadow` | — (no ring below the divider) | — |
| Identity label `font-family` | `'IBM Plex Mono', monospace` | same |
| Identity label `font-size` | `12.5px` | `12.5px` |
| Identity label `color` | `#A89B84` | same |
| Count `font-family` | `'IBM Plex Mono', monospace` | same |
| Count `font-size` | `14px` | `14px` |
| Count `color` | `#EDE6D8` | same |

### Footer completion bar

| Property | Mobile | Desktop |
|----------|--------|---------|
| `height` | `3px` | `3px` |
| `border-radius` | `999px` | `999px` |
| `background` (fill) | `#6B9E63` | same |

### Footer row 3 — meta

| Property | Mobile | Desktop |
|----------|--------|---------|
| `display` | `flex` | same |
| `align-items` | `center` | same |
| `justify-content` | `space-between` | same |
| `gap` | `12px` | `12px` |
| `font-family` | `'IBM Plex Mono', monospace` | same |
| `font-size` | `12px` | `12px` |
| `color` | `#A89B84` | same |

---

## Component: Home · Ready to build

Inherits the deck-card band **exactly** (2.2:1, `cover`, focal `center top`, art `0.58`, identical
L3). Only the label sizes, the in-band fit chip/pips and the footer differ.

### Card shell

| Property | Mobile | Desktop |
|----------|--------|---------|
| `border-radius` | `14px` | `14px` |
| `background` | `#1A160F` | same |
| `border` | `1px solid #2A241D` | same |
| `overflow` | `hidden` | same |
| `min-width` | `0` | same |
| Grid columns (canvas) | `repeat(auto-fit,minmax(230px,1fr))` | same |
| Grid `gap` | `14px` | `14px` |

### Art band

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` | `relative` | same |
| `aspect-ratio` | `2.2/1` | same |
| `background` (L1) | `#0E0C09` | same |
| `overflow` | `hidden` | same |
| L2 `background-size` | `cover` | same |
| L2 `background-position` | `center top` | same |
| L2 `background-repeat` | `no-repeat` | same |
| L2 `opacity` | `0.58` | same |
| L3 `background` | `linear-gradient(180deg,rgba(14,12,9,0.90) 0%,rgba(14,12,9,0.30) 40%,rgba(14,12,9,0.52) 74%,rgba(14,12,9,0.86) 100%)` | same |

### Label block

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` | `absolute` | same |
| `left` | `14px` | `14px` |
| `top` | `13px` | `13px` |
| `right` | `14px` | `14px` |
| `min-width` | `0` | same |

### Commander name (title)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `font-family` | `'Cinzel', serif` | same |
| `font-weight` | `700` | `700` |
| `font-size` | `17px` | `17px` |
| `line-height` | `1.15` | `1.15` |
| `color` | `#F4EFE3` | same |
| `text-shadow` | `0 1px 3px rgba(0,0,0,0.65)` | same |
| `white-space` / `overflow` / `text-overflow` | `nowrap` / `hidden` / `ellipsis` | same |

### Type-line subtitle

| Property | Mobile | Desktop |
|----------|--------|---------|
| `font-family` | `'IBM Plex Sans'` | same |
| `font-size` | `11.5px` | `11.5px` |
| `color` | `#C6B79A` | same |
| `margin-top` | `3px` | `3px` |
| `text-shadow` | `0 1px 3px rgba(0,0,0,0.65)` | same |
| `white-space` / `overflow` / `text-overflow` | `nowrap` / `hidden` / `ellipsis` | same |

### Colour pips, on art (bottom-left)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` | `absolute` | same |
| `left` | `14px` | `14px` |
| `bottom` | `12px` | `12px` |
| `display` | `flex` | same |
| `gap` | `4px` | `4px` |
| Pip `width` / `height` | `12px` / `12px` | same |
| Pip `border-radius` | `3px` | `3px` |
| Pip `box-shadow` | `0 0 0 1px rgba(14,12,9,0.85)` | same |

### Fit chip, on art (bottom-right)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` | `absolute` | same |
| `right` | `14px` | `14px` |
| `bottom` | `12px` | `12px` |
| `display` | `flex` | same |
| `align-items` | `baseline` | same |
| `gap` | `5px` | `5px` |
| `background` | `#14110E` (opaque) | same |
| `border` | `1px solid #3A3229` | same |
| `border-radius` | `7px` | `7px` |
| `padding` | `5px 9px` | `5px 9px` |
| Value `font-family` | `'Cinzel', serif` | same |
| Value `font-weight` | `800` | `800` |
| Value `font-size` | `16px` | `16px` |
| Value `line-height` | `1` | `1` |
| Value `color` | `#EDE6D8` | same |
| Unit `font-family` | `'IBM Plex Mono', monospace` | same |
| Unit `font-size` | `9.5px` | `9.5px` |
| Unit `letter-spacing` | `0.1em` | `0.1em` |
| Unit `color` | `#8E8269` | same |

### Footer (below divider)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `border-top` | `1px solid #2A241D` | same |
| `padding` | `12px 14px 13px` | same |
| `display` | `flex` | same |
| `align-items` | `center` | same |
| `justify-content` | `space-between` | same |
| `gap` | `10px` | `10px` |
| Pool label `font-family` | `'IBM Plex Mono', monospace` | same |
| Pool label `font-size` | `11.5px` | `11.5px` |
| Pool label `color` | `#A89B84` | same |
| Build button `font-family` | `'IBM Plex Sans'` | same |
| Build button `font-weight` | `600` | `600` |
| Build button `font-size` | `12px` | `12px` |
| Build button `color` | `#14110E` | same |
| Build button `background` | `#C9A24B` (`var(--accent)`) | same |
| Build button `border-radius` | `6px` | `6px` |
| Build button `padding` | `6px 12px` | `6px 12px` |

---

## Component: Commander row (`/commanders`, both lanes — recommendations + discovery)

Strategy `left-portrait`. Band `148px` (was `78px`; READINESS notes the shipped row has no fixed
height at all, so this is a new constraint). Eng clarification 3: applied as `min-height:148px` with
the art still `inset-y-0`, one value at **both** breakpoints — the shipped phone/desktop split
darkening ramps collapse into this one stack.

### Row shell

| Property | Mobile | Desktop |
|----------|--------|---------|
| `border-radius` | `12px` | `12px` |
| `border` | `1px solid #2A241D` | same |
| `background` | `#1A160F` | same |
| `overflow` | `hidden` | same |
| List `gap` between rows | `12px` | `12px` |

### Art band

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` | `relative` | same |
| `height` | `148px` (as drawn) | `148px` |
| `min-height` | `148px` (eng clarification 3) | `148px` |
| `background` (L1) | `#0E0C09` | same |
| `overflow` | `hidden` | same |

### Layer A — ambient (`cover` copy)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` / `inset` | `absolute` / `0` | same |
| `background-size` | `cover` | same |
| `background-position` | `center top` | same |
| `background-repeat` | `no-repeat` | same |
| `opacity` | `0.2` | `0.2` |

### Layer B — sharp portrait

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` | `absolute` | same |
| `left` | `0` | `0` |
| `top` | `0` | `0` |
| `bottom` | `0` | `0` |
| `width` | `203px` (= 148 × 1.37) | `203px` |
| `background-size` | `auto 100%` | same |
| `background-position` | `left center` | same |
| `background-repeat` | `no-repeat` | same |
| `opacity` | `0.8` | `0.8` |
| `-webkit-mask-image` | `linear-gradient(90deg,#000 0 58%,transparent 100%)` | same |
| `mask-image` | `linear-gradient(90deg,#000 0 58%,transparent 100%)` | same |

### Layer C — horizontal scrim (px stops)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` / `inset` | `absolute` / `0` | same |
| `background` | `linear-gradient(90deg, …)` | same |
| Stop 1 | `rgba(14,12,9,0.30) 0px` | same |
| Stop 2 | `rgba(14,12,9,0.26) 118px` | same |
| Stop 3 | `rgba(26,22,15,0.78) 203px` | same |
| Stop 4 | `#1A160F 264px` | same |

### Layer D — vertical scrim

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` / `inset` | `absolute` / `0` | same |
| `background` | `linear-gradient(180deg, …)` | same |
| Stop 1 | `rgba(14,12,9,0.62) 0%` | same |
| Stop 2 | `rgba(14,12,9,0.16) 42%` | same |
| Stop 3 | `rgba(14,12,9,0.74) 100%` | same |

### Band content row

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` | `relative` | same |
| `height` | `100%` | same |
| `display` | `flex` | same |
| `align-items` | `center` | same |
| `gap` | `16px` | `16px` |
| `padding` | `0 22px` | `0 22px` |

### Rank numeral

| Property | Mobile | Desktop |
|----------|--------|---------|
| `font-family` | `'Cinzel', serif` | same |
| `font-weight` | `800` | `800` |
| `font-size` | `26px` | `26px` |
| `color` | `#EDE6D8` | same |
| `flex` | `none` | same |
| `min-width` | `26px` | `26px` |
| `text-shadow` | `0 1px 4px rgba(0,0,0,0.85)` | same |

### Name + pips block

| Property | Mobile | Desktop |
|----------|--------|---------|
| `flex` | `1` | same |
| `min-width` | `0` | same |
| `align-self` | `flex-end` (labels at band baseline) | same |
| `padding-bottom` | `16px` | `16px` |
| Inner row `display` | `flex` | same |
| Inner row `align-items` | `center` | same |
| Inner row `gap` | `10px` | `10px` |
| Inner row `flex-wrap` | `wrap` | same |

### Commander name

| Property | Mobile | Desktop |
|----------|--------|---------|
| `font-family` | `'Cinzel', serif` | same |
| `font-weight` | `700` | `700` |
| `font-size` | `23px` | `23px` |
| `color` | `#F4EFE3` | same |
| `text-shadow` | `0 1px 4px rgba(0,0,0,0.85)` | same |

### Colour pips, on art

| Property | Mobile | Desktop |
|----------|--------|---------|
| Strip `display` | `flex` | same |
| Strip `gap` | `4px` | `4px` |
| Pip `width` / `height` | `12px` / `12px` | same |
| Pip `border-radius` | `3px` | `3px` |
| Pip `box-shadow` | `0 0 0 1px rgba(14,12,9,0.85)` | same |

### Type-line subtitle

| Property | Mobile | Desktop |
|----------|--------|---------|
| `font-size` | `12.5px` | `12.5px` |
| `color` | `#C6B79A` | same |
| `margin-top` | `4px` | `4px` |
| `text-shadow` | `0 1px 4px rgba(0,0,0,0.85)` | same |

### Fit chip, on art

| Property | Mobile | Desktop |
|----------|--------|---------|
| `flex` | `none` | same |
| `align-self` | `flex-start` | same |
| `margin-top` | `16px` | `16px` |
| `display` | `flex` | same |
| `align-items` | `baseline` | same |
| `gap` | `7px` | `7px` |
| `background` | `#14110E` (opaque) | same |
| `border` | `1px solid #3A3229` | same |
| `border-radius` | `9px` | `9px` |
| `padding` | `8px 13px` | `8px 13px` |
| Value `font-family` | `'Cinzel', serif` | same |
| Value `font-weight` | `800` | `800` |
| Value `font-size` | `26px` | `26px` |
| Value `line-height` | `1` | `1` |
| Value `color` | `#EDE6D8` | same |
| Unit `font-family` | `'IBM Plex Mono', monospace` | same |
| Unit `font-size` | `10.5px` | `10.5px` |
| Unit `letter-spacing` | `0.1em` | `0.1em` |
| Unit `color` | `#8E8269` | same |

### Data zone (below divider, flat ground)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `border-top` | `1px solid #2A241D` | same |
| `padding` | `14px 22px 16px` | same |
| `display` | `flex` | same |
| `flex-direction` | `column` | same |
| `gap` | `12px` | `12px` |

### Stat pills

| Property | Mobile | Desktop |
|----------|--------|---------|
| Wrap `display` | `flex` | same |
| Wrap `gap` | `8px` | `8px` |
| Wrap `flex-wrap` | `wrap` | same |
| Pill `font-family` | `'IBM Plex Mono', monospace` | same |
| Pill `font-size` | `11.5px` | `11.5px` |
| Pill `color` | `#C6B79A` | same |
| Pill `background` | `#221D14` | same |
| Pill `border` | `1px solid #2A241D` | same |
| Pill `border-radius` | `999px` | `999px` |
| Pill `padding` | `6px 12px` | `6px 12px` |

### Synergy row

| Property | Mobile | Desktop |
|----------|--------|---------|
| Row `display` | `flex` | same |
| Row `align-items` | `center` | same |
| Row `gap` | `14px` | `14px` |
| Row `flex-wrap` | `wrap` | same |
| Label `font-family` | `'IBM Plex Mono', monospace` | same |
| Label `font-size` | `10.5px` | `10.5px` |
| Label `letter-spacing` | `0.14em` | `0.14em` |
| Label `text-transform` | uppercase (as authored) | same |
| Label `color` | `#8E8269` | same |
| Label `flex` | `none` | same |
| Track `flex` | `1` | same |
| Track `min-width` | `110px` | `110px` |
| Track `height` | `4px` | `4px` |
| Track `border-radius` | `999px` | `999px` |
| Track `background` | `#2A241D` | same |
| Track `overflow` | `hidden` | same |
| Fill `height` | `100%` | same |
| Fill `background` | `#4A7FB5` | same |
| Own count `font-family` | `'IBM Plex Mono', monospace` | same |
| Own count `font-size` | `12.5px` | `12.5px` |
| Own count `color` | `#A89B84` | same |
| Own count `flex` | `none` | same |

### Receipts line

| Property | Mobile | Desktop |
|----------|--------|---------|
| `font-family` | `'IBM Plex Mono', monospace` | same |
| `font-size` | `12px` | `12px` |
| `color` | `#8E8269` | same |
| `line-height` | `1.5` | `1.5` |

---

## Component: Home · Resume row (recommended variant)

Strategy `left-portrait`, band `72px`. **Build the recommended variant** (READINESS eng
clarification 5a). The "reference parity" variant in the canvas is drawn for comparison only — its
values are recorded under Conflicts/Variants below and must NOT be built.

### Row shell

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` | `relative` | same |
| `height` | `72px` | `72px` |
| `border-radius` | `11px` | `11px` |
| `border` | `1px solid #2A241D` | same |
| `background` (L1) | `#181410` | same |
| `overflow` | `hidden` | same |
| List `gap` between rows | `9px` | `9px` |

### Layer A — ambient (`cover` copy)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` / `inset` | `absolute` / `0` | same |
| `background-size` | `cover` | same |
| `background-position` | `center top` | same |
| `background-repeat` | `no-repeat` | same |
| `opacity` | `0.14` | `0.14` |

### Layer B — sharp portrait

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` | `absolute` | same |
| `left` / `top` / `bottom` | `0` / `0` / `0` | same |
| `width` | `99px` (= 72 × 1.37) | `99px` |
| `background-size` | `auto 100%` | same |
| `background-position` | `left center` | same |
| `background-repeat` | `no-repeat` | same |
| `opacity` | `0.85` | `0.85` |
| `-webkit-mask-image` | `linear-gradient(90deg,#000 0 62%,transparent 100%)` | same |
| `mask-image` | `linear-gradient(90deg,#000 0 62%,transparent 100%)` | same |

### Layer C — horizontal scrim (px stops)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` / `inset` | `absolute` / `0` | same |
| Stop 1 | `rgba(24,20,16,0.22) 0px` | same |
| Stop 2 | `rgba(24,20,16,0.18) 58px` | same |
| Stop 3 | `rgba(24,20,16,0.80) 99px` | same |
| Stop 4 | `#181410 138px` | same |
| Vertical scrim | — (none on this surface) | — |

### Content row

| Property | Mobile | Desktop |
|----------|--------|---------|
| `position` | `relative` | same |
| `height` | `100%` | same |
| `display` | `flex` | same |
| `align-items` | `center` | same |
| `gap` | `14px` | `14px` |
| `padding` | `0 18px 0 116px` (type inset 116px) | same |

### Deck name (title)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `font-family` | `'Cinzel', serif` | same |
| `font-weight` | `700` | `700` |
| `font-size` | `16px` | `16px` |
| `line-height` | `1.2` | `1.2` |
| `color` | `#F4EFE3` | same |
| `text-shadow` | — (**none** — the tell that type is placed correctly) | — |
| `white-space` / `overflow` / `text-overflow` | `nowrap` / `hidden` / `ellipsis` | same |

### Sub-row (pips + subtitle)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `display` | `flex` | same |
| `align-items` | `center` | same |
| `gap` | `8px` | `8px` |
| `margin-top` | `4px` | `4px` |
| `min-width` | `0` | same |
| Pip strip `display` | `flex` | same |
| Pip strip `gap` | `3px` | `3px` |
| Pip strip `flex` | `none` | same |
| Pip `width` / `height` | `11px` / `11px` | same |
| Pip `border-radius` | `3px` | `3px` |
| Pip `box-shadow` | `0 0 0 1px rgba(14,12,9,0.9)` | same |
| Subtitle `font-size` | `12px` | `12px` |
| Subtitle `color` | `#C6B79A` | same |
| Subtitle `text-shadow` | — (**none**) | — |
| Subtitle `white-space` / `overflow` / `text-overflow` | `nowrap` / `hidden` / `ellipsis` | same |

### Right-hand meta column

| Property | Mobile | Desktop |
|----------|--------|---------|
| `flex` | `none` | same |
| `text-align` | `right` | same |
| Tag `font-family` | `'IBM Plex Mono', monospace` | same |
| Tag `font-size` | `10px` | `10px` |
| Tag `letter-spacing` | `0.16em` | `0.16em` |
| Tag `color` | `#8E8269` | same |
| Timestamp `font-family` | `'IBM Plex Mono', monospace` | same |
| Timestamp `font-size` | `11.5px` | `11.5px` |
| Timestamp `color` | `#A89B84` | same |
| Timestamp `margin-top` | `4px` | `4px` |

---

## Accessibility media queries

Handoff rule (README "Notes for engineering") conflates two mechanisms; READINESS eng clarification
7 splits them into two rules. Build the split.

### `@media (prefers-reduced-transparency: reduce)`

| Property | Mobile | Desktop |
|----------|--------|---------|
| L2 / sharp art `opacity` | `0.3` | `0.3` |
| L3 vertical scrim stop 1 alpha | `0.95` (was `0.90`) | same |
| L3 vertical scrim stop 2 alpha | `0.6` (was `0.30`) | same |
| L3 vertical scrim stop 3 alpha | `0.85` (was `0.52`) | same |
| L3 stop 4 | not restated by the handoff — retain `rgba(14,12,9,0.86) 100%` | same |
| Stop positions | unchanged (`0% / 40% / 74% / 100%`) | same |
| Layout / band height | unchanged, no shift | same |

### `@media (forced-colors: active)`

| Property | Mobile | Desktop |
|----------|--------|---------|
| Art layers (L2 / ambient / sharp) | dropped entirely | same |
| Result | flat ground only | same |
| Band geometry | unchanged, no layout shift | same |
| Status of this rule | extends the handoff's intent; **for Design to ratify** | same |

### Not used anywhere

| Property | Mobile | Desktop |
|----------|--------|---------|
| `backdrop-filter` | — (rejected: a compositing layer per card in a 40-deck grid, and it does not fix hotspot luminance) | — |

---

## State Coverage

The README has no formal state table; these are the states its prose and READINESS name, with the
condition that triggers each.

| State | Triggering condition | Rendering |
|---|---|---|
| Has art crop | `cards.art_crop_uri` present for the commander | Full three-layer stack: L1 `#0E0C09`, art layer(s) at the surface's opacity, L3 scrim(s). |
| No art crop | `art_crop_uri` null/empty (or the commander has no art on record) | Colour-identity gradient replaces the art layer **at the same opacity, under the same scrim**, on all four surfaces (READINESS eng clarification 4). Band is **not** collapsed; no layout shift. `ART_STRIPES` is not the fallback here. |
| Art still loading / fails to load | Network in flight or 404 | L1 base plate `#0E0C09` shows through — never a light ground flash. This is the stated purpose of L1. |
| Modal DFC | Card has two faces | Crop the **front** face only. |
| Apostrophe in commander name | Name contains `'` | `url()` uses double quotes plus `.replace(/'/g,'%27')`; art must still render. (READINESS: the repo's `cssUrl` already satisfies this via double quotes + `encodeURI`.) |
| Reduced transparency | `prefers-reduced-transparency: reduce` | Art opacity `0.3`; L3 stops `.95 / .6 / .85`. |
| Forced colours | `forced-colors: active` | Art layers dropped; flat ground under system-forced text. |
| Narrow deck grid column | `cover` band computed height would fall under `104px` (≈640px viewport) | `min-height: 104px` floor applies; no max-height ceiling. |

---

## Conflicts between v1 and v2

v2 is the deliverable in every case below; v1 values are recorded only because v2's captions cite
them.

| Property | v1 (superseded) | v2 (**build this**) |
|---|---|---|
| Deck band geometry | `height: 158px` / `150px` fixed, effectively 2.8:1 | `aspect-ratio: 2.2/1` |
| Focal | `center` (50%) on decks, `center 28%` on commander rows | `center top` on both — one shared focal |
| Art opacity (cover) | `0.55` | `0.58` |
| Vertical scrim | `linear-gradient(180deg, rgba(14,12,9,.90) 0%, rgba(14,12,9,.34) 38%, rgba(14,12,9,.66) 78%, #14110E 100%)` — 4 stops ending in an **opaque** hex | `rgba(14,12,9,.90) 0% / .30 40% / .52 74% / .86 100%` — final stop is alpha, not opaque |
| Title `text-shadow` (cover) | `0 1px 3px rgba(0,0,0,0.6)` | `0 1px 3px rgba(0,0,0,0.65)` |
| Commander row band | `min-height: 78px`, art `cover` at `opacity .5`, focal `center 28%` | `height: 148px`, `left-portrait`, sharp `.80` + ambient `.20` |
| Commander row scrims | vertical `.72/.5/.86 @ 0/45/100%` **plus** horizontal `.55/.1/.8 @ 0/40/100%` (all %) | horizontal in **px** `.30@0 / .26@118 / .78@203 / #1A160F@264`, vertical `.62/.16/.74 @ 0/42/100%` |
| Commander row rank colour | `#C6B79A`, `text-shadow 0 1px 3px rgba(0,0,0,0.7)` | `#EDE6D8`, `text-shadow 0 1px 4px rgba(0,0,0,0.85)` |
| Commander name size | `22px` | `23px` |
| Commander labels | vertically centred, `padding:16px 22px` | baseline-anchored (`align-self:flex-end`, `padding-bottom:16px`), row `padding:0 22px` |
| Deck card status chip `bottom` | `14px` | `13px` |
| Deck card status chip position | v1 "shipping today" showed it **top-left**; v1 corrected moved it bottom-left | bottom-left, `left:16px; bottom:13px` |
| Deck subtitle size (hero comparison card) | `12.5px` on the before/after card, `12px` in the grid | `12px` |
| Colour pips | v1 rule 4 put pips **below** the divider | v2 places pips **in the wash** on commander rows and the Home ready-to-build card; README decision 4 restates pips as in-wash |
| Strategies | implied one (`cover`), plus an `edge-signature` third strategy elsewhere in the system | two only — `cover`, `left-portrait`; `edge-signature` dropped |
| Home surfaces | not drawn | both drawn |
| `url()` escaping | `url('…')` single-quoted, `encodeURIComponent` only (the bug) | `url("…")` double-quoted plus `.replace(/'/g,'%27')` |

### Variants within v2 (not conflicts)

The resume section draws two variants side by side. Only the second ships.

| Property | "Reference parity" (do NOT build) | "Recommended" (**build this**) |
|---|---|---|
| Art layer | single layer, `width: 46%`, `background-size: cover`, `background-position: left 30%`, `opacity 0.62` | ambient `cover` `.14` + sharp `99px` `auto 100%` `.85` with mask |
| `mask-image` | — | `linear-gradient(90deg,#000 0 62%,transparent 100%)` |
| Scrim | `linear-gradient(90deg, rgba(24,20,16,0.30) 0%, rgba(24,20,16,0.62) 18%, rgba(24,20,16,0.94) 32%, #181410 44%)` — **% stops** | `rgba(24,20,16,0.22) 0px / 0.18 58px / 0.80 99px / #181410 138px` — **px stops** |
| Content `padding` | `0 18px` | `0 18px 0 116px` |
| Title `text-shadow` | `0 1px 4px rgba(0,0,0,0.9)` | — (none) |
| Subtitle `text-shadow` | `0 1px 4px rgba(0,0,0,0.9)` | — (none) |

---

## Open items carried from the handoff

1. Resume-row subtitle truncation from the 116px inset — **closed as moot** (READINESS 5b): the
   shipped row prints the deck name, not the commander name, so the trade as framed does not exist.
2. Focal calibrated on five arts (Zhulodok, Aang, Tovolar, Brago, Kotis) — structurally safe;
   revisit only if a real class of arts reads badly.
3. Full-art DFCs and borderless/extended-art printings not drawn; `art_crop` is still 626×457 so the
   geometry holds. Spot-check once built.
4. The 2.2:1 band was not tested at every breakpoint — READINESS 6 answers it with the computed
   column widths and the `104px` floor.
5. Contrast floors were measured on Palette A only; verify 7:1 / 4.5:1 on `phyrexia` (`#0D0B0E`) and
   `amonkhet` (`#14110E`) after the token translation.
