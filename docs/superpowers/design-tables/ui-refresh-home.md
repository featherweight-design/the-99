# Design Property Table — UI Refresh, Home

Source: `design/design_handoff_the99_refresh/` R2 (2026-09-07).

- `The 99 - Refresh · Home and Decks.dc.html` — lines 39–169 (Home desktop), 390–473 (Home phone),
  601–722 (Home first run, both viewports).
- `refresh · copy strings.ts` — copy keys.
- `tokens.r6.json` — R6 theme tokens.
- `STATES-deck-statuses.md` — the six status values and their tokens.
- `README.md` / `READINESS.md` — decisions and open items.

Scope: the Home surface only. The Decks index, the left icon rail and the phone tab bar are
covered by other tables (`ui-refresh-chrome.md` and the Decks table). Rail/tab-bar rows appear
here **only** where Home's first-run state changes them.

Breakpoint: 640px (`sm:`). "Mobile" = the 390px phone frames; "Desktop" = the 1180px / 768px frames.

---

## Token mapping — canvas hex → CSS variable

The `.dc.html` frames are rendered in a canvas palette that approximates the **Amonkhet / Low Sun**
theme rather than reading `tokens.r6.json` literally. Implement against the variable, not the hex.
Rows where the canvas hex has no clean token are flagged in §Ambiguities.

| Canvas hex | Variable | R6 (amonkhet) value | Note |
|---|---|---|---|
| `#14110E` | `var(--bg)` | `#14110E` | exact |
| `#1E1A15` | `var(--surface)` | `#1E1A15` | exact |
| `#1B1712` | `var(--surface-inset)` | `#1B1712` | exact — every Home panel/card surface |
| `#171310` | `var(--surface-rail)` | `#1A1611` | design note at line 720 names it `--surface-rail` |
| `#241F18` | `var(--elevated)` | `#29241F` | approximation |
| `#2A241D` | `var(--border)` | `#2B241B` | outer card/panel hairline |
| `#211C16` | `var(--border)` | `#2B241B` | inner divider — canvas uses a second, darker weight (see §Ambiguities) |
| `#3A3229` | `var(--border-strong)` | `#3A3229` | exact — every hairline button |
| `#4A4033` | `var(--border-dashed)` | `#494037` | also used as a *text* colour for locked items (see §Ambiguities) |
| `#EDE6D8` | `var(--fg)` | `#EDE6D8` | exact |
| `#C6B79A` | `var(--fg-body)` | `#C0B8A6` | approximation |
| `#A89B84` | `var(--fg-muted)` | `#A59C89` | approximation |
| `#8E8269` | `var(--fg-faint)` | `#8B8270` | approximation |
| `#6A6152` | `var(--fg-locked)` | `#6E6654` | approximation |
| `#C9A24B` | `var(--accent)` | `#CF8745` | approximation |
| `#6FA368` | `var(--success)` | `#6FA368` | exact |
| `#E0913C` | `var(--warning)` | `#DEAA29` (amonkhet) | canvas uses the value the other five themes carry |
| `#C6533F` | `var(--danger)` | `#C6533F` | exact |
| `#E8E4D6` | `var(--w)` | `#F4E9C4` | colour pip |
| `#4A7FB5` | `var(--u)` | `#3A6AA5` | colour pip |
| `#5B5566` | `var(--b)` | `#98748F` | colour pip |
| `#C05A48` | `var(--r)` | `#C05A3E` | colour pip |
| `#6B9E63` | `var(--g)` | `#4B7A46` | colour pip |
| `#100D0A` | — | — | canvas page ground; darker than `--bg`, no token. Not used inside Home content. |

Fonts:

| Canvas family | Variable |
|---|---|
| `'Cinzel', serif` | `var(--font-display)` — the per-theme display face (`tokens.r6.json.themes[*].face`) |
| `'IBM Plex Sans', sans-serif` | `var(--font-sans)` — body/label text |
| `'IBM Plex Mono', monospace` | `var(--font-mono)` — every figure, every kicker, every status word |

Status → token (from `STATES-deck-statuses.md`):

| Status | Token |
|---|---|
| Draft | `var(--fg-faint)` |
| Building | `var(--fg-body)` |
| Over | `var(--danger)` |
| Unresolved | `var(--warning)` |
| To buy | `var(--accent)` |
| Complete | `var(--success)` |

---

## Component: HomeFrame (page shell)

The 1180×624 / 768×520 / 390×800 / 390×700 outer boxes with `border-radius:16px|26px` are the
**mockup device frames**, not app CSS. Do not implement them. What is implementable:

### Content column

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | column |
| flex | auto | auto |
| min-width | 0 | 0 |
| min-height | 0 | — |
| background | `var(--bg)` | `var(--bg)` |

---

## Component: HomeHeader

### Desktop — header container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — (see mobile top bar + kicker block below) | flex |
| align-items | — | flex-end |
| gap | — | 16 |
| padding-top | — | 22 |
| padding-right | — | 26 |
| padding-bottom | — | 0 |
| padding-left | — | 26 |

### Mobile — top bar (mark + avatar)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — (rail carries the mark and avatar) |
| align-items | center | — |
| gap | 10 | — |
| padding-top | 16 | — |
| padding-right | 16 | — |
| padding-bottom | 0 | — |
| padding-left | 16 | — |

#### Mobile — diamond mark

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 22 | — |
| height | 22 | — |
| transform | rotate(45deg) | — |
| border-width | 1.5 | — |
| border-style | solid | — |
| border-color | `var(--accent)` | — |
| border-radius | 3 | — |

#### Mobile — spacer

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | auto | — |

#### Mobile — avatar

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 36 | — |
| height | 36 | — |
| border-radius | 50% | — |
| border-width | 1 | — |
| border-style | solid | — |
| border-color | `var(--border-strong)` | — |
| background | `var(--surface)` | — |

### Kicker + greeting block

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding-top | 14 | — (inside header container) |
| padding-right | 16 | — |
| padding-bottom | 0 | — |
| padding-left | 16 | — |
| flex | — | auto |
| min-width | — | 0 |

#### Kicker line

Copy: `home.kicker(cards, when)` — two arguments, both pre-formatted strings.

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | 10 | 10 |
| letter-spacing | 0.16em | 0.18em |
| text-transform | uppercase | uppercase |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| margin-bottom | 6 | 7 |

#### Greeting

Copy: `home.greeting` — no arguments.

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-display)` | `var(--font-display)` |
| font-weight | 700 | 700 |
| font-size | 23 | 28 |
| line-height | 1.15 | 1 |
| color | `var(--fg)` | `var(--fg)` |

### Update collection button

Copy: `home.updateCollection`. **Mobile: not rendered** (see §Ambiguities).

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| align-items | — | center |
| gap | — | 8 |
| height | — | 32 |
| padding-top / bottom | — | 0 |
| padding-left / right | — | 12 |
| border-width | — | 1 |
| border-style | — | solid |
| border-color | — | `var(--border-strong)` |
| border-radius | — | 8 |
| font-family | — | `var(--font-sans)` |
| font-size | — | 12.5 |
| color | — | `var(--fg-body)` |
| flex | — | none |

#### Update collection — refresh icon (SVG)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 14 |
| height | — | 14 |
| viewBox | — | `0 0 20 20` |
| fill | — | none |
| stroke | — | currentColor |
| stroke-width | — | 1.6 |
| stroke-linecap | — | round |
| stroke-linejoin | — | round |
| path d (1) | — | `M16.5 10a6.5 6.5 0 1 1-2.1-4.8` |
| path d (2) | — | `M16.8 3.4v3.2h-3.2` |

### New deck button (primary, bone fill)

Copy: `home.newDeck`. **Mobile: not rendered** (see §Ambiguities).

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| align-items | — | center |
| height | — | 32 |
| padding-top / bottom | — | 0 |
| padding-left / right | — | 14 |
| border-radius | — | 8 |
| border-width | — | 0 |
| background | — | `var(--fg)` |
| color | — | `var(--bg)` |
| font-family | — | `var(--font-sans)` |
| font-size | — | 12.5 |
| font-weight | — | 600 |
| flex | — | none |

---

## Component: HomeBody (two-column region)

**The split is at 1180px, not `sm`** — re-enumerated 2026-09-13. The resume block pairs its rows at
exactly that width (see §ResumeRows for the arithmetic), and the rail is what takes the width away
from them, so the two move together. Between 640 and 1179 a `sm:flex-row` body put Commitments in a
316px rail BESIDE the rows: the reader at 900px met a different block order from the reader at
either width the handoff draws. The PADDING moves with the split too — left at `sm` it gave that
band a third layout, one column wide with desktop padding.

| Property | Mobile (<1180) | Desktop (≥1180) |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | row |
| gap | 12 | 20 |
| flex | auto | auto |
| min-height | 0 | 0 |
| padding-top | 14 | 20 |
| padding-right | 16 | 26 |
| padding-bottom | 0 | 26 |
| padding-left | 16 | 26 |

### Desktop — left column

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — (single column) | flex |
| flex-direction | — | column |
| gap | — | 11 |
| flex | — | auto |
| min-width | — | 0 |

### Desktop — right column (Commitments alone, since the rail left)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — (not rendered as a column) | flex |
| flex-direction | — | column |
| gap | — | 11 |
| width | — | 316 |
| flex | — | none |

---

## Component: SectionLabel (shared)

Used by "Ready to build", "Pick up where you left off", "Commitments".

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | 10 | 10 |
| letter-spacing | 0.14em | 0.14em |
| text-transform | uppercase | uppercase |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| flex | none | — |

Per-instance margin overrides (desktop only):

| Instance | margin-top |
|---|---|
| Ready to build (`home.readyHeading`) | — |
| Pick up where you left off (`home.resumeHeading`) | 6 |
| Commitments (`home.commitmentsHeading`) | 4 |

---

## Component: ReadyToBuild

### Grid / stack container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — (cards are direct children of HomeBody's column) | grid |
| grid-template-columns | — | `1fr 1fr` |
| gap | 12 (inherited from HomeBody) | 14 |
| Cards rendered | 2, stacked, in the page's own vertical scroll | 2, side by side |

Carousel is explicitly **withdrawn** (README gap 4 / READINESS "Phone Ready-to-build · Closed (R2)").

### ReadyCard — root

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | relative | relative |
| height | 186 | 250 |
| border-radius | 14 | 14 |
| overflow | hidden | hidden |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | `var(--border)` | `var(--border)` |
| background | commander art, cropped to the illustration (mockup substitutes a `linear-gradient(150deg,…)` placeholder) | same |
| flex | none | — |

Art is **not** themed — it is photography (README decision 7).

### ReadyCard — scrim

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| inset | 0 | 0 |
| background | `linear-gradient(180deg, var(--bg)/12% 0%, var(--bg)/72% 52%, var(--bg)/96% 100%)` | `linear-gradient(180deg, var(--bg)/15% 0%, var(--bg)/72% 52%, var(--bg)/96% 100%)` |

### ReadyCard — fit badge

Copy: `home.fit(score)` → `"{score} /100 fit"`. Rendered as two spans: the numeral, then the
denominator clause in a dimmer colour.

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| top | 10 | 11 |
| left | 11 | 12 |
| display | flex | flex |
| align-items | center | center |
| height | 22 | 22 |
| padding-top / bottom | 0 | 0 |
| padding-left / right | 8 | 8 |
| border-radius | 6 | 6 |
| background | `var(--bg)` at 82% alpha | `var(--bg)` at 82% alpha |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | 10.5 | 10.5 |
| color (numeral) | `var(--fg)` | `var(--fg)` |
| color (`/100 fit` span) | `var(--fg-faint)` | `var(--fg-faint)` |

### ReadyCard — body block

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| left | 0 | 0 |
| right | 0 | 0 |
| bottom | 0 | 0 |
| padding (all sides) | 13 | 14 |

#### ReadyCard — commander name

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-display)` | `var(--font-display)` |
| font-weight | 600 | 600 |
| font-size | 17 | 18 |
| color | `var(--fg)` | `var(--fg)` |
| white-space | nowrap | nowrap |
| overflow | hidden | hidden |
| text-overflow | ellipsis | ellipsis |

#### ReadyCard — meta row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 7 | 8 |
| margin-top | 6 | 7 |

#### ReadyCard — colour pips group

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| gap | 3 | 3 |

#### ReadyCard — colour pip (each)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 8 | 9 |
| height | 8 | 9 |
| border-radius | 2 | 2 |
| border-width | 0 | 0 |
| background | `var(--w)` / `var(--u)` / `var(--b)` / `var(--r)` / `var(--g)` per colour identity, in WUBRG order | same |

Note: unlike deck-tile pips (`STATES-deck-statuses.md` §5) these carry **no** `--border-strong`
hairline, because they sit on art, not on a light ground.

#### ReadyCard — fit line

Copy: desktop `home.fitLine(n)` → `"{n} of your cards fit"`. Mobile renders a shortened
`"{n} fit"` form for which no copy key exists (see §Ambiguities).

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | 10.5 | 11 |
| color | `var(--fg-body)` | `var(--fg-body)` |

#### ReadyCard — in-use clause

Copy: `home.inUse(n)` → `"{n} in use"`. **Conditional: omitted entirely when `inUse === 0`.**
Desktop renders it as a sibling span in the meta row; mobile nests it inside the fit-line span
after a ` · ` separator.

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | 10.5 (inherited from fit line) | 11 |
| color | `var(--accent)` | `var(--accent)` |
| position in DOM | inside the fit-line span, after ` · ` | sibling span in the meta row |

#### ReadyCard — actions row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| gap | 8 | 8 |
| margin-top | 11 | 12 |

#### ReadyCard — "Start this deck" (primary, bone fill)

Copy: `home.startDeck`.

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| justify-content | center | — |
| flex | auto | none |
| height | 44 | 32 |
| padding-left / right | — | 14 |
| border-radius | 10 | 8 |
| border-width | 0 | 0 |
| background | `var(--fg)` | `var(--fg)` |
| color | `var(--bg)` | `var(--bg)` |
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-size | 14 | 12.5 |
| font-weight | 600 | 600 |

#### ReadyCard — "See the pool" (secondary)

Copy: `home.seePool` (desktop label). Mobile collapses it to an icon-only 44×44 chevron button
with **no** visible label.

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| justify-content | center | — |
| width | 44 | — |
| height | 44 | 32 |
| padding-left / right | — | 13 |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | `var(--border-dashed)` (`#4A4033`) | `var(--border-dashed)` (`#4A4033`) |
| border-radius | 10 | 8 |
| background | `var(--bg)` at 50% alpha | `var(--bg)` at 50% alpha |
| color | `var(--fg)` | `var(--fg)` |
| font-size | — | 12.5 |

#### ReadyCard — "See the pool" chevron icon (mobile only)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 17 | — |
| height | 17 | — |
| viewBox | `0 0 20 20` | — |
| fill | none | — |
| stroke | currentColor | — |
| stroke-width | 1.6 | — |
| stroke-linecap | round | — |
| stroke-linejoin | — (not set) | — |
| path d | `M7.5 4.5 13 10l-5.5 5.5` | — |

### ReadyToBuild — "more above" row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 10 | 12 |
| flex | none | — |

#### "more above" text

Copy: `home.moreAbove(n, floor)` → `"{n} more scored {floor} or better"`. The threshold that
produces `n` and `floor` is **unspecified** (READINESS blocker 3).

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | 10.5 | 11 |
| color | `var(--fg-faint)` | `var(--fg-faint)` |

#### "All commanders" button

Copy: `home.allCommanders`.

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| margin-left | auto | — (gap only) |
| height | 36 | 32 |
| padding-top / bottom | 0 | 0 |
| padding-left / right | 12 | 13 |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | `var(--border-strong)` | `var(--border-strong)` |
| border-radius | 10 | 8 |
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-size | 13 | 12.5 |
| color | `var(--fg)` | `var(--fg)` |

---

## Component: ResumeRows ("Pick up where you left off")

**Both widths, four rows.** Re-enumerated 2026-09-13 by the home-parity round
(`design/design_handoff_the99_home/`), which mounted the block on the phone and grew it from two
rows to four — it is the only route back into a deck from Home now that `Your decks` is deleted.

The row itself is the art-wash lift's, not this table's earlier 30×42 spine: one row drawn at two
widths, on a stated 72px band with a 99px portrait. **Handoff errata E1–E4** — its component table
asks for a 74px bleed, a 62px phone bleed, a 64px min-height and a 15.5px name, and those figures
are shipped at none of them; `art-wash.md` keys the portrait to band × 1.37, so 74 is legal at no
band at all and 62 implies a 45px band. The handoff's own stated intent is "shipped geometry,
unchanged", and these are the shipped figures.

No CTA on the row — the row itself opens the builder (README decision 4).

### Section

The 11px rhythm belongs to the two-column layout, so it switches at 1180 with everything else. Left
at `sm` it gave the 640–1179 band desktop spacing inside a mobile stack.

| Property | Mobile (<1180) | Desktop (≥1180) |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | column |
| gap | 12 | 11 |
| Rows rendered | 4 | 4 |

### Section head

The label and, beside it, the caption naming the order. The caption is **not a control**: the block
has one order and always has, and a `Sort · …` trigger here would imply a list — which is the thing
this round deleted.

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | baseline | baseline |
| gap | 8 | 8 |
| margin-top | 6 | 6 |
| label | §SectionLabel, `home.resumeHeading` | same |
| caption font-family | `var(--font-mono)` | same |
| caption font-size | 10 | 10 |
| caption letter-spacing | 0.14em | 0.14em |
| caption text-transform | lowercase | lowercase |
| caption color | `var(--fg-locked)` | `var(--fg-locked)` |
| caption copy | `home.resumeSortCaption` — `last touched` | same |

### Row container

2×2 above 1180px, stacked below. The threshold is arithmetic, not a Tailwind stop, and it is 180px
wider than the block carried before the stamp existed: the meta line's fixed content is a status
pill at ~62, two 14px gaps, a non-shrinking count at ~45 and a non-shrinking stamp at ~78 — 213px
before the commander's name gets a pixel, on top of the 116px inset and 18px of right padding. A row
needs ~347, a pair ~706, and with the page padding, the gap and the 316px rail that is 1106px of
viewport. At 1024 the stamp was clipped away entirely by the row's own overflow.

| Property | Mobile | Desktop (≥1180) |
|----------|--------|-----------------|
| display | flex | flex |
| flex-direction | column | row |
| flex-wrap | — | wrap |
| gap | 12 | 12 |

### ResumeRow — root

| Property | Mobile | Desktop (≥1180) |
|----------|--------|-----------------|
| flex | none | 1 |
| flex-basis | — | `calc(50% - 6px)` |
| height | 72 (stated, not a floor) | 72 (stated, not a floor) |
| min-width | 0 | 0 |
| display | flex | flex |
| align-items | center | center |
| background | `var(--surface-inset)` | `var(--surface-inset)` |
| border-width | 1 | 1 |
| border-color | `var(--border)` | `var(--border)` |
| border-radius | 12 | 12 |
| overflow | hidden | hidden |
| padding-top / bottom | 10 | 10 |
| padding-right | 10 | 18 |
| status rule | **none** — errata E3. The 3px keyline was the deck rail's, and the rail is deleted; the status pill is this row's status signal | same |

**`flex: none` below 1180px is load-bearing.** The container is a column there, so `flex: 1` applies
to HEIGHT: four rows in a short column each shrink below the stated 72 and show a strip of unwashed
band under the portrait. Two rows never overflowed, which is why the defect arrives with the fourth.

### ResumeRow — portrait

| Property | Mobile | Desktop |
|----------|--------|---------|
| strategy | `left-portrait` (`<ArtWash>`) | same |
| band height | 72 | 72 |
| portrait width | 99 (= band × 1.37, `art-wash.md`) | 99 |
| type inset | 108 below 1000px, 116 above — unchanged, and deliberately not moved to 1180: it is keyed to the row's own width, which a stacked row has all of | 116 |

### ResumeRow — first line: deck name and stamp

The name truncates; the stamp does not. They share the row's first line, which is why the stamp can
be non-shrinking without a tight row eating it: the only child that gives is the one that is
supposed to.

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | baseline | baseline |
| gap | 8 | 8 |
| stamp position | `margin-left: auto` — the line's right edge | same |

#### Deck name

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-display)` | `var(--font-display)` |
| font-weight | 600 | 600 |
| font-size | 14.5 | 14.5 |
| color | `var(--fg)` | `var(--fg)` |
| overflow | truncate | truncate |

### ResumeRow — meta line

Status pill, commander name, then the figure group: the built count and the to-buy clause. **The
figure never truncates and the clause is what gives** (decisions 19 and 23). The touched stamp is
NOT here — it is on the first line beside the deck name, because three non-shrinking children do not
fit this line at 390px; see §ResumeRow — touched stamp.

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 14 | 14 |
| count / clause / stamp font | mono 10.5 | mono 10.5 |
| count colour | `var(--fg-faint)` | `var(--fg-faint)` |

### ResumeRow — touched stamp

The one element this round adds to a shipped row, and it sits on the FIRST line, right-aligned, at
both widths.

**Errata E6:** the handoff draws it under the count on desktop, which cannot coexist with its own
two other rulings — the row is a stated 72px band, and no row may grow a line at either width. The
meta line cannot hold it either, which is a measurement rather than a judgement: with the longest
verb and figure, `committed 10mo ago`, the pill, the count and the stamp are three non-shrinking
children needing 243px of the 240 that line has at 390px, and the row's own overflow ate the stamp.
Beside the deck name it sits next to the one child that truncates by design.

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | 10.5 | 10.5 |
| color | `var(--fg-locked)` | `var(--fg-locked)` |
| flex | none | none |
| white-space | nowrap | nowrap |
| copy | `home.touched[verb](home.elapsed…)` — `edited 2h ago` / `committed 3d ago` / `played yesterday` | same |

The verb names the event that won the sort, so the server returns which column was most recent and
not only the date. No `imported` — **errata E5**: `decks.last_edited_at` is seeded from the deck's
creation, so nothing distinguishes an import from an edit once seeded.

### Footer

Absent when `{n} more` is nought: a block whose figure is nought is absent, not zeroed. Drawn from
§ReadyToBuild's own "more above" row rather than a second set of classes that merely looks like it —
the block ends the way its neighbour does (README decision 2).

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 10 | 12 |
| figure font | mono 10.5 | mono 11 |
| figure colour | `var(--fg-faint)` | `var(--fg-faint)` |
| figure copy | `home.moreDecks(total − shown)` | same |
| control | `GhostButton` → `/decks`, h 44 | h 32 |
| control copy | `home.allDecks(total)` — `All 34 decks` | same |


## Component: DeckRail ("Your decks · n") — **DELETED 2026-09-13**

Deleted at both widths by the home-parity round (`design/design_handoff_the99_home/`), with its
rows, its heading, its count and its `All decks` footer. It was a second, worse `/decks` one tap
from the real one, and the rail and the tab bar both carry Decks; what it was actually doing for
the player — getting them back into a deck they were working in — is the resume block's job, done
better, because `/decks`' order has no idea what you touched last.

The heading's count survives as the resume block's footer, `{n} more decks` / `All {total} decks`:
same number, same one tap, no second list. `home.decksHeading`, `home.decksMore` and the old
`home.allDecks` string are retired with it.

Its property tables are removed rather than left standing: a table that specifies a component
nothing renders is the defect the art-wash round recorded, and the next reader would build from it.
`git log` holds what it said.

## Component: CommitmentsCard

**Both widths, and mounted LAST on the phone** — re-enumerated 2026-09-13 by the home-parity round.
The same component, the same three figures and the same control at either width: it is the block you
read rather than the one you act on, and the two CTAs and the buildable commanders are above it on
desktop too, so the phone order matches rather than being invented. On desktop it is now the whole
right rail, the deck list that sat above it having left.

Its `Review commitments` control takes the 44px phone floor and the 32px desktop form. It was drawn
for a desktop-only card, so it carried 32 at every width until the phone mounted it.
Copy: heading `home.commitmentsHeading`.

### Card root

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `var(--surface-inset)` | `var(--surface-inset)` |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | `var(--border)` | `var(--border)` |
| border-radius | 14 | 14 |
| padding (all sides) | 14 | 14 |
| display | flex | flex |
| flex-direction | column | column |
| gap | 11 | 11 |

### Commitments row (each of 3)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | baseline | baseline |
| justify-content | space-between | space-between |

#### Row label

Copy: row 1 `home.inUseRow`, row 2 `home.overCommittedRow`, row 3 `home.toBuyRow`.

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-size | 13 | 13 |
| color | `var(--fg-body)` | `var(--fg-body)` |

#### Row value

Copy: row 1 `home.inUseValue(n, total)`, row 2 `home.overCommittedValue(n)` (singular/plural),
row 3 `home.toBuyValue(n, cost)`.

One set of values, at both widths — the phone mounts this same card, so the three rows are not
re-stated per width. (This table lost its shape for one round when the mirroring that re-enumerated
the rest of §CommitmentsCard treated its five columns as two.)

| Property | Row 1 (Cards in use) | Row 2 (Spoken for twice) | Row 3 (To buy, all decks) |
|----------|---|---|---|
| font-family | `var(--font-mono)` | `var(--font-mono)` | `var(--font-mono)` |
| font-size | 13 | 13 | 13 |
| font-variant-numeric | tabular-nums | tabular-nums | tabular-nums |
| color | `var(--accent)` | `var(--danger)` | `var(--fg)` |

### "Review commitments" button

Copy: `home.reviewCommitments`.

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| width | 100% (stretched by the column) | 100% (stretched by the column) |
| height | **44** — the phone floor. The card was desktop-only when this control was drawn, so it carried 32 at every width until the phone mounted it | 32 |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | `var(--border-strong)` | `var(--border-strong)` |
| border-radius | 8 | 8 |
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-size | 12.5 | 12.5 |
| color | `var(--fg)` | `var(--fg)` |
| margin-top | 2 | 2 |

---

## Component: HomeFirstRun (zero state — collection unread, no decks)

Desktop frame is 768px wide (not 1180). No `Update collection` / `New deck` header buttons;
no Ready-to-build, resume or Commitments.

### First-run content column

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | column |
| flex | auto | auto |
| min-width | — | 0 |
| background | `var(--bg)` | `radial-gradient(640px 340px at 40% -40px, var(--accent) 7%, transparent 70%)` over `var(--bg)` |

### First-run — top bar (mobile only)

Identical to the populated Home mobile top bar: `padding:16 16 0`, `display:flex`,
`align-items:center`, `gap:10`, 22×22 rotate-45 diamond with a 1.5px `var(--accent)` border and
`border-radius:3`, `flex:auto` spacer, 36×36 avatar (`border-radius:50%`, 1px `var(--border-strong)`,
`background:var(--surface)`).

### First-run — header block

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding-top | 16 | 26 |
| padding-right | 16 | 28 |
| padding-bottom | 0 | 0 |
| padding-left | 16 | 28 |

#### Step kicker

Copy: `firstRun.step(n, of)` → `"Step 1 of 3"`.

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | 10 | 10 |
| letter-spacing | 0.16em | 0.18em |
| text-transform | uppercase | uppercase |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| margin-bottom | 6 | 7 |

#### Heading

Copy: `firstRun.heading`.

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-display)` | `var(--font-display)` |
| font-weight | 700 | 700 |
| font-size | 23 | 27 |
| line-height | 1.15 | 1 |
| color | `var(--fg)` | `var(--fg)` |

### First-run — checklist body

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | column |
| gap | 11 | 12 |
| flex | auto | auto |
| min-height | 0 | 0 |
| padding-top | 16 | 20 |
| padding-right | 16 | 28 |
| padding-bottom | 0 | 26 |
| padding-left | 16 | 28 |

### Step 1 card (live)

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `var(--surface-inset)` | `var(--surface-inset)` |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | `var(--accent)` | `var(--accent)` |
| border-radius | 14 | 14 |
| padding-top / bottom | 18 | 18 |
| padding-left / right | 16 | 18 |
| display | flex | flex |
| flex-direction | column | row (default) |
| align-items | center | center |
| text-align | center | — |
| gap | 12 | 18 |
| flex | none | — |

#### Step 1 card — while its review is open (state A2, first-run redesign D11, 5a)

The embedded review draws no header of its own, so on the phone the card says what is under
review. Desktop keeps the rest-state card: 5a is drawn at 390 only, and the fan stays pinned
beside the growing review (Hugh, 2026-09-28). Design table: `first-run-calm-replace.md` §3a.

| Property | Mobile | Desktop |
|---|---|---|
| align-items / text-align | flex-start / left | unchanged |
| padding / overflow | 0 / hidden (the title block and the review carry a 14px inset, so the confirm bar is the card's flush foot) | unchanged |
| title size | 17 | 19, unchanged |
| card-fan mark | hidden | unchanged |
| body (`firstRun.step1BodyShort`) | hidden | `firstRun.step1Body`, unchanged |
| REVIEWING line (`firstRun.step1Reviewing(file, rows)`) | mono 10, letter-spacing 0.04em, uppercase, `var(--fg-faint)`, margin-top 4 | — |
| example | `Reviewing · pasted list · 1,313 rows` | — |

Cancel in the review's bar discards the preview, and the card returns to its rest state.

#### Step 1 — card-fan mark (container)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 88 | 74 |
| height | 92 | 82 |
| position | relative | relative |
| flex | — | none |

#### Step 1 — card-fan, back card (left, rotated CCW)

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| left | 8 | 6 |
| top | 14 | 12 |
| width | 50 | 44 |
| height | 68 | 60 |
| border-radius | 6 | 5 |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | `var(--border-strong)` | `var(--border-strong)` |
| background | `#211C16` (between `--surface-inset` and `--elevated`) | `#211C16` |
| transform | rotate(-14deg) | rotate(-14deg) |

#### Step 1 — card-fan, middle card (upright)

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| left | 18 | 14 |
| top | 10 | 9 |
| width | 50 | 44 |
| height | 68 | 60 |
| border-radius | 6 | 5 |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | `var(--border-strong)` | `var(--border-strong)` |
| background | `var(--elevated)` | `var(--elevated)` |
| transform | — | — |

#### Step 1 — card-fan, front card ("99", rotated CW)

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| left | 30 | 24 |
| top | 14 | 12 |
| width | 50 | 44 |
| height | 68 | 60 |
| border-radius | 6 | 5 |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | `var(--accent)` | `var(--accent)` |
| background | `var(--surface)` | `var(--surface)` |
| transform | rotate(13deg) | rotate(13deg) |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| font-family | `var(--font-display)` | `var(--font-display)` |
| font-weight | 700 | 700 |
| font-size | 17 | 15 |
| color | `var(--accent)` | `var(--accent)` |
| content | literal `99` | literal `99` |

#### Step 1 — text column

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — (children are direct card children) | flex |
| flex-direction | — | column |
| gap | 12 (card gap) | 7 |
| flex | — | auto |
| min-width | — | 0 |

#### Step 1 — title

Copy: `firstRun.step1Title`.

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-display)` | `var(--font-display)` |
| font-weight | 600 | 600 |
| font-size | 19 | 19 |
| color | `var(--fg)` | `var(--fg)` |

#### Step 1 — body

Copy: mobile `firstRun.step1BodyShort`, desktop `firstRun.step1Body`.

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-size | 13.5 | 13 |
| line-height | 1.6 | 1.6 |
| color | `var(--fg-muted)` | `var(--fg-muted)` |

#### Step 1 — button group

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | row (default) |
| gap | 8 | 8 |
| width | 100% | — |
| margin-top | 2 | 4 |

#### Step 1 — "Upload a CSV" (primary, bone fill)

Copy: `firstRun.uploadCsv`.

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| justify-content | center | — |
| height | 44 | 32 |
| padding-left / right | — | 14 |
| border-radius | 10 | 8 |
| border-width | 0 | 0 |
| background | `var(--fg)` | `var(--fg)` |
| color | `var(--bg)` | `var(--bg)` |
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-size | 14 | 12.5 |
| font-weight | 600 | 600 |

#### Step 1 — "Paste a list" (hairline)

Copy: `firstRun.pasteList`.

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| justify-content | center | — |
| height | 44 | 32 |
| padding-left / right | — | 13 |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | `var(--border-strong)` | `var(--border-strong)` |
| border-radius | 10 | 8 |
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-size | 14 | 12.5 |
| color | `var(--fg)` | `var(--fg)` |

### Step 2 / Step 3 cards (locked)

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `var(--surface-rail)` (`#171310`) | `var(--surface-rail)` (`#171310`) |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | `var(--border)` (`#211C16`) | `var(--border)` (`#211C16`) |
| border-radius | 14 | 14 |
| padding-top / bottom | 14 | 15 |
| padding-left / right | 15 | 18 |
| display | flex | flex |
| align-items | center | center |
| gap | 12 | 14 |
| min-height | 56 | — |
| flex | none | — |

#### Locked step — number badge

Content: literal step number (`2`, `3`).

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 22 | 22 |
| height | 22 | 22 |
| border-radius | 6 | 6 |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | `var(--border)` (`#2A241D`) | `var(--border)` (`#2A241D`) |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | 11 | 11 |
| color | `#4A4033` (locked dim — see §Ambiguities) | `#4A4033` |
| flex | none | none |

#### Locked step — text column

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | auto | auto |
| min-width | 0 | 0 |
| display | flex | flex |
| flex-direction | column | column |
| gap | 3 | 3 |

#### Locked step — title

Copy: `firstRun.step2Title` / `firstRun.step3Title`.

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-display)` | `var(--font-display)` |
| font-weight | 600 | 600 |
| font-size | 15 | 16 |
| color | `var(--fg-locked)` (`#6A6152`) | `var(--fg-locked)` (`#6A6152`) |

#### Locked step — reason line

Copy: `firstRun.step2Locked` / `firstRun.step3Locked`. Never blank, never "coming soon".

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-size | 12 | 12.5 |
| color | `#4A4033` (locked dim) | `#4A4033` |

#### Locked step — padlock glyph

Drawn in the frame as a bare rounded rect (the shackle is not drawn). Implementation should use a
real padlock icon at these dimensions.

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 12 | 12 |
| height | 14 | 14 |
| border-width | 1.5 | 1.5 |
| border-style | solid | solid |
| border-color | `var(--border-strong)` | `var(--border-strong)` |
| border-radius | 3 | 3 |
| flex | none | none |

Accessibility (READINESS "not blocking, eyes on it"): locked step cards and locked nav items
carry `firstRun.lockedItemAria(label)` as the accessible name, not just visual dimming.

### First-run — Import escape hatch (RETIRED)

Deleted by first-run ruling 1 (2026-09-28, `design_handoff_the99_first_run_onboarding` D4):
step 1 is the collection alone, the row and its `mt-auto` are gone, and `firstRun.importPrompt`
no longer exists. Import is named by the locked step 2 ("Pick a commander or import a deck")
and reached from Home once the collection is read.

### First-run — locked navigation (Home's effect on the chrome)

Enumerated here only because first run changes it; the base rail/tab-bar geometry lives in
`ui-refresh-chrome.md`.

| Property | Mobile (tab bar) | Desktop (rail) |
|----------|--------|---------|
| Home item colour | `var(--fg)` on `var(--surface-inset)` background | `var(--fg)` on `var(--elevated)` background |
| Collection / Commanders / Decks item colour | `#4A4033` | `#4A4033` |
| Locked items interactive | no — inert | no — inert |
| Accessible name of a locked item | `firstRun.lockedItemAria(label)` | `firstRun.lockedItemAria(label)` |
| Divider under the four items | — | 34 × 1, `background:var(--border)` (`#211C16`), `margin: 8 0` |
| Padlock glyph under the divider | — | 14 × 16, `border:1.5px solid #4A4033`, `border-radius:3` |

---

## State Coverage — Home

Derived from the frames plus the conditional notes in `refresh · copy strings.ts`,
`README.md` §Gaps and `READINESS.md`. Rows marked **not drawn** have no frame in this package.

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| First run | No collection read AND no decks | `HomeFirstRun` — three-step checklist, step 1 live, steps 2–3 locked (step 2 names both paths), nav dimmed; no import row (first-run ruling 1) | `step`(1,3), `heading`, `step1Title`, `step1Body`/`step1BodyShort`, `step2Title`+`step2Locked`, `step3Title`+`step3Locked` |
| Populated | Collection read AND ≥1 buildable commander AND ≥1 deck | `HomeHeader` + `ReadyToBuild` + `ResumeRows` + `CommitmentsCard`, all four at BOTH widths | `kicker(cards, when)`, ready candidates, resume decks, commitments aggregate |
| Ready card, commander has cards in use | `inUse > 0` | in-use clause rendered in the meta row, `var(--accent)` | `inUse(n)` |
| Ready card, nothing in use | `inUse === 0` | in-use clause **omitted entirely** — free says nothing (copy file comment; `availability.ts` rule) | — |
| More candidates above the floor | `moreCount > 0` | "more above" row: text + `All commanders` | `moreAbove(n, floor)`, `allCommanders` |
| No further candidates | `moreCount === 0` | **not drawn** — is the row hidden, or does `All commanders` stand alone? | — |
| No buildable commanders at all | Collection read, zero candidates above the threshold | **not drawn** | — |
| More decks than the resume block shows | `total > 4` | the block's footer: `{n} more decks` + `All {total} decks`, at BOTH widths | `moreDecks(n)`, `allDecks(total)` |
| Four decks or fewer | `total <= 4` | every deck is drawn and the footer is absent — a figure of nought is an absence, not a zero | — |
| Home with collection read but zero decks | `deckCount === 0` | the resume slot holds `HomeDecksZero` ("No decks yet": body + the shared `DecksZeroActions`, no buildable line), and the header's New deck is a ghost so Browse commanders is the fill (first-run R2; Hugh's O1 and O7 rulings, 2026-09-28). `ResumeDecks`' null return stays as a guard | `zero.decksHeading`, `zero.decksBody`/`decksBodyShort`, `browseCommanders`, `importDeck` |
| Deck row per status | one of the six shipped values | the status pill's fill. The 3px left keyline was the deck rail's and went with it | `status.draft` … `status.complete` |
| Over-committed cards present | `overCommitted > 0` | Commitments row 2, `var(--danger)` | `overCommittedValue(n)` — singular/plural |
| No over-committed cards | `overCommitted === 0` | **not drawn** — does the row show `0 cards`, or vanish? | — |
| Nothing to buy | `toBuyCount === 0` | **not drawn** — same question for Commitments row 3 | — |
| To-buy aggregate unavailable | No all-decks shopping roll-up exists | **not drawn.** READINESS blocker 5: either the aggregate gets built or the row goes; must not sum client-side over a paginated deck list | `toBuyValue(n, cost)` |
| Update collection running / partial | Collection read in flight or partially resolved | **not drawn.** READINESS blocker 4 — reuse the manifest-wait pattern | — |
| Never played | `lastPlayedAt === null` | `decks.lastPlayedNever` — used on deck **tiles** (Decks page). A resume row prints the act that touched it, which for a deck nobody has played is `edited`, never a "never" | `lastPlayedNever` |
| Loading | Data in flight | **not drawn.** README gap 5 / READINESS: layouts kept, never re-rendered against the new display faces and the 32px button | — |

---

## Interactive states

The frames contain no `:hover`, `:focus`, `:active`, `transition` or `transform` declarations for
any Home element other than the static `transform: rotate()` values on the card-fan mark and the
diamond mark, which are recorded above. **No hover, focus or transition values are specified
anywhere in this package** — see §Ambiguities.

Targets that must be interactive per the design text:

| Element | Behaviour |
|---|---|
| ReadyCard "Start this deck" | Opens the builder for that commander |
| ReadyCard "See the pool" | Opens the pool for that commander; mobile is icon-only and needs an `aria-label` |
| "All commanders" | Navigates to the commanders list |
| ResumeRow (whole row) | Opens the builder. No per-row button — README decision 4 |
| "All decks" | Navigates to the Decks index |
| "Review commitments" | Navigates to the commitments view |
| "Update collection" | Starts a collection read (state machine unspecified) |
| "New deck" | The screen's single bone-fill primary — one filled button per screen (README decision 2) |
| First run, locked steps 2 and 3 | Inert; not focusable as controls; reason carried in the accessible name |

---

## Ambiguities and underspecified items

1. ~~**Mobile Home drops four whole regions.**~~ **CLOSED 2026-09-13** by the home-parity round.
   The answer was that they were not deliberately dropped: the two widths had drifted into two
   pages. Both CTAs, the resume block and Commitments are drawn at 390 now, in the same order as
   desktop, and the deck rail that carried the phone is deleted at both widths.

2. **Mobile fit-line copy has no key.** Desktop renders `home.fitLine(n)` (`"92 of your cards fit"`);
   the phone frame renders `"92 fit · 12 in use"`. No short-form key exists in
   `refresh · copy strings.ts`, and the ` · ` joins two keys that are separate spans on desktop.

3. ~~**Art spine placement contradicts README decision 7.**~~ **CLOSED** — twice over. The art-wash
   lift replaced every spine with `<ArtWash>`, and the two rail rows that carried the other two
   answers are deleted. One row remains, drawn at two widths: a 72px band with a 99px portrait,
   keyed by `art-wash.md`'s band × 1.37.

4. ~~**Resume status pill contradicts `STATES-deck-statuses.md`.**~~ **CLOSED 2026-09-14**, and the
   contradiction was between two documents rather than between a document and the code. The `80`
   alpha border that doc specified was retired by the art-wash readability amendment and **ratified
   2026-09-08**; `STATES-deck-statuses.md` simply never caught up. It is corrected to the shipped
   component: one opaque `1px solid var(--border-strong)` for every status, dashed on Building
   alone, fills at 18% with Draft at 16% and Building at 14%. No pixel moved — the pill is
   `StatusPillBadge`, shared with every surface that draws a status, and `status-style.ts` has been
   the single writer of all of it since the refresh.

5. **Two border weights, one token.** Home uses `#2A241D` for outer card hairlines and `#211C16`
   for inner dividers and the rail's right edge. R6 offers only `--border` and `--border-strong`,
   and `--border-strong` is already spoken for by buttons. Either a third token is needed or the
   two collapse to `--border`.

6. **Locked dim `#4A4033` is not `--fg-locked`.** The design note explicitly names `#4A4033` for
   dimmed nav items and locked-step reason text, but `--fg-locked` is `#6E6654` and locked step
   *titles* use `#6A6152` (which is `--fg-locked`). So first run uses two distinct locked greys, the
   darker of which maps to `--border-dashed`, a border token. Contrast of `#4A4033` on
   `--surface-rail` is very low and should be checked against WCAG before build.

7. **No hover, focus, active or transition states exist anywhere in this package** for Home. Every
   button, row and card is drawn in one state only. Focus-visible rings in particular are
   unspecified for the icon-only mobile "See the pool" button and for the whole-row targets.

8. **Ready-to-build threshold is unset** (READINESS blocker 3). The frame prints "70 or better"
   because the two cards score 74 and 71; the real rule (top N / score ≥ X / both with a floor) is a
   product call, and `home.moreAbove` interpolates whatever it is.

9. **`Update collection` has no state machine** (READINESS blocker 4) — no running, no partial-read
   state is drawn.

10. **Commitments row 3 assumes an all-decks shopping aggregate** (READINESS blocker 5) that may not
    exist. Must not be summed client-side over a paginated deck list.

11. **The card-fan mark and the padlock are placeholder geometry.** Both are drawn as bare bordered
    rects. The padlock has no shackle; the fan's three cards have no art. Implementation needs real
    icons at the recorded dimensions.

12. **Canvas palette ≠ R6 tokens.** The frames render an approximation of Amonkhet/Low Sun — accent
    `#C9A24B` vs `--accent` `#CF8745`, warning `#E0913C` vs Amonkhet's `--warning` `#DEAA29`, and the
    five colour pips are all lighter than `--w/--u/--b/--r/--g`. Verify against the variable, never
    the hex.

13. **`Explorations (1a-1c).dc.html` contains no Home frames at all** — all three packages draw only
    the Decks screen with filters open. It therefore contradicts nothing in this table, and the
    README already labels it "not a spec".

---

# Errata — where the shipped build departs from this table

1. **The rail and resume clauses read `N cards`, not `N unowned`.** The figure comes from the
   shopping roll-up, which now answers the seniority question rather than the ownership one: a
   card held by an older committed deck is a copy to buy while being a card the player owns, so
   `unowned` had become false. Both surfaces print the status word on the same line, so the
   clause counts the copies and lets the `To buy` beside it say what they are —
   `decks.detailCopies` in place of `decks.detailUnowned`. Placement and colour are unchanged.
