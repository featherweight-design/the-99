# The 99 — Commander art wash · readability amendment (design handoff)

An amendment to the **shipped** commander-wash redesign. The wash itself is kept; what changes is
the image source, the scrim, the ink, and the band geometry. Nothing else on Decks, Commanders or
Home is redesigned.

Files:
- `The 99 - Scrim Recovery.dc.html` — **the current deliverable.** Canvas (pan/zoom), with a
  theme prop. All nine washed screens, each drawn as ships-today vs proposed, every figure measured
  off the band rather than estimated.
- `The 99 - Art Wash Readability v2.dc.html` — the R6 amendment this builds on. Still current for
  geometry (`art_crop`, `center top`, portrait `= band × 1.37`, decision 8's px-keyed stops);
  superseded on opacity and ramp values by the canvas above.
- `The 99 - Art Wash Readability.dc.html` — R1, superseded. Kept only because R2's captions cite its
  values. Do not build from it.

Read `design_handoff_the99_decks/README.md` and `design_handoff_the99_commanders/README.md` first —
this document records only what **changes**.

## Scrim recovery — the current revision

The amendment below fixed legibility and overcorrected: at art `.58` under the shipped ramps, only
33–45% of the picture survived mid-band, which reads as a dimmed screen rather than a design. The
recovery lifts art to `.80` (`.92/.28` on rows, `.95/.22` on the 72px resume row) and pays for it
by **holding each ramp's dark value across its whole label block instead of ramping through it** —
which also fixes a live defect: top-labelled subtitles ship at **3.16:1**, under the floor, on deck
cards and Home ready-to-build.

**Two findings ship on their own, ahead of any lift** — both are existing accessibility failures:
the 3.16:1 top-labelled subtitle, and the 148 row at phone width, whose upper two lines read
**3.12:1 and 3.92:1** today.

**Three corrections to earlier drafts of that canvas, recorded so they are not reintroduced:**

1. **There is no cover variant of a row.** `art-wash.tsx` takes `band: 168 | 148 | 72`, and
   Commanders and Discover render the 148 `left-portrait` band at *every* width — only the text
   layout changes. An earlier survey drew both as `cover 2.2/1` below 768px. That treatment does
   not exist and should not be built.
2. **Rows are three cases, not one.** 168 and 148 each ship a vertical ramp
   (`.30 .10 .46 .42` and `.62 .16 .42 .74`); only 72 has none. The claim that
   `left-portrait` carries no vertical ramp was true of exactly one of the three.
3. **The 72px resume row ships `.85 / .14`**, not `.80 / .20`.

### The one surface the lift cannot pay for

At phone width the 148 row prints its type 13px from the edge, on the sharp portrait, spanning the
band — so there is no dark end to derive a stop from, only the whole block. Holding the ramp flat at
`.78` clears all three lines (measured **5.04–5.35:1** across themes) and leaves the art at **22%
mid-band** — darker than what this document exists to fix. That hold ships anyway, because two of
those lines are already failing. **The recommendation is to stop paying with the scrim and move the
type off the portrait at that width**, which is what desktop already does. That is a layout change,
so it is a separate proposal rather than a value in this one.

### Checked, unchanged

Home's hero pips keep their bare edge. The lift does brighten the ground under them, so it was
measured: the lightest pip (`--w`) at art `.80` under a `.50` bottom stop reads **4.01–4.09:1**,
and a pip's floor is 3:1 as a non-text component. The deliberate omission of a hairline stands.

---

## The bug, in one line

The wash was rendering the **full card image**, so Magic's own printed name and type line landed in
the same band as our labels, and the art was let through at full luminance with alpha-coloured ink
over it.

## Surfaces covered

| Surface | Strategy | Band | Notes |
|---|---|---|---|
| Deck card | `cover` | aspect `2.2/1` | labels top, status chip bottom-left |
| Commander row | `left-portrait` | `148px` | was `78px`; portrait `203px` |
| Home · ready to build | `cover` | aspect `2.2/1` | inherits the deck card exactly |
| Home · resume | `left-portrait` | `72px` | portrait `99px`, type inset `116px` |

**Four surfaces, two strategies, one component.** The only props that vary are `height`, `strategy`
and `band`. Focal (`center top`) and the L1/L2/L3 layer stack are **constants** — please do not
expose them per call site.

---

## Decisions log

### 1. Image source → **`image_uris.art_crop`, never the full card**
`normal` / `large` / `png` all carry the gold frame, the printed card name and the type line. At
card width that printed type line sits within a few pixels of our deck name — the collision in the
bug report is not a contrast failure, it is two type systems in one band. `art_crop` is 626×457 and
frame-free. On a modal DFC, crop the **front face**. Production should key off the card's Scryfall
`id`; the `named?exact=` endpoint in the mock is a convenience for the spec only.

### 2. Scrim → **three layers, in this order, always**
Dimming alone loses the drama; covering alone leaves hotspots. Both, every time.

| Layer | Value | Why |
|---|---|---|
| **L1** base plate | `#0E0C09` | under the art, so a slow or missing image never flashes light ground |
| **L2** art | `opacity .58` | keeps hue, drops luminance globally |
| **L3** gradient scrim | see below | heavy at the label bands, thin in the middle third |

```css
linear-gradient(180deg,
  rgba(14,12,9,.90) 0%,
  rgba(14,12,9,.30) 40%,
  rgba(14,12,9,.52) 74%,
  rgba(14,12,9,.86) 100%)
```

The fourth stop is new in R2: it means the status chip no longer needs its own plate to survive a
bright foreground.

### 3. Ink → **full opacity, no exceptions**
Nothing over art gets an alpha colour. Title `#F4EFE3`, subtitle `#C6B79A`, both at 100%, with
`text-shadow: 0 1px 3px rgba(0,0,0,.6)`. Chips on art take an **opaque** `#14110E` fill plus a `1px
#3A3229` border — the shipped translucent "Complete" chip was the single worst-reading element in
the report. Contrast floor over scrimmed art: **7:1** titles, **4.5:1** meta, measured against the
art's brightest pixel, which the scrim caps at L*34.

**Status pill borders — ratified 2026-09-08.** Implementing the opaque-fill-plus-hairline rule
uniformly retired the colour-faded edges on Over, Unresolved, To buy and Complete. That is correct
and stands: a 50% fade of the status colour sitting on art is the original bug report, and colour
in the fill and the label carries the status adequately. **One exception:** `Building` keeps
`1px dashed var(--border-strong)`. Its dashed edge was never an alpha fade — it is a line *style*
at full opacity, so the readability rule does not reach it. Same colour, same weight, same opacity
as the other five; it costs nothing on art and buys back the only status signal that survives
greyscale and colour-blindness now that colour lives in fill and label alone, on the one status
that differs in kind (incomplete, not a data condition) rather than in degree. So: five statuses
`1px solid var(--border-strong)`, `Building` `1px dashed var(--border-strong)`.

### 4. Data lives on flat ground
The wash owns exactly one band. Below a `1px #2A241D` divider, everything sits on `#1A160F`.

- **In the wash:** deck name, subtitle, status chip, overflow, rank, colour pips, fit score.
- **Below the divider:** card count, completion bar, price, last-played, stat pills, synergy bar,
  receipts.

### 5. Band aspect → **2.2:1** (was 2.8:1)
This is the change that did the heavy lifting, and R1 under-credited it. `art_crop` is 1.37:1, so
any band wider than that discards height — 51% of it at 2.8:1, 38% at 2.2:1 — and `cover` discards
from both ends at once. At 2.8:1 the arts read as **texture**; at 2.2:1 they read as portraits.
Focal position is a fine-tune on top of this, not a fix for it.

### 6. Focal → **`center top`**
Settled by the focal sweep (five arts × eight positions, in the canvas), and revised from R1's
`center 34%` on the user's read of that grid. Three reasons, in order of weight:

1. **Our labels are top-anchored.** The sample's recognisable features span 27–44% of the crop. At
   `center` they ride up to 13–40% of the band — directly under the title. At `top` they sit at
   43–71%: below the title, and in the thinnest part of the vertical scrim, so the art is most
   visible exactly where the face is.
2. **The foreground rubble is never sampled.** The window is 62.3% of the crop's height, so
   anchoring at `top` stops it at 62% and excludes the bottom fifth entirely. `center` drags it in.
3. **The crop's top edge cannot clip a head.** It is the one boundary with zero clipping risk.

Worth knowing for anyone re-deriving this: `background-position` percentages are a fraction of the
**overflow**, not of the image. At 2.2:1 there is only 37.7% of travel, so 0 / 5 / 10 / 15% land
within the top 6% of the crop — ~9px apart on a 457px crop — and buy nothing over each other. Ship
one value; per-card focal data is not in the API and hand-tuning 30k commanders is not a plan.

### 7. Past 4:1, stop cropping → **`left-portrait`**
A commander row is ~6:1 and a resume row ~12:1. No focal position rescues a letterbox that thin,
which is why R1's rows read as texture. Those surfaces switch strategy:

- **Sharp layer** — sized by height (`background-size: auto 100%`), anchored left, at its true
  1.37:1. Width is therefore `band × 1.37`: **203px** at a 148px band, **99px** at 72px.
- **Ambient layer** — a full-bleed `cover` copy at low opacity carrying the colour behind it
  (`.20` commander row, `.14` resume row). This is what preserves the "large wash" feel.
- **Fade** — `mask-image` on the sharp layer, not a scrim over it. See decision 8.

### 8. The fade belongs to the art, not the row
**This is the one that will regress if it is not stated plainly.** The portrait's extent derives
from band *height* in px; a percentage-of-*width* fade can never stay aligned with it — at a wider
row you get a bare strip with a hard luminance seam, at a narrower one the scrim clips the portrait
early. So:

- Fade the sharp layer with its own `mask-image: linear-gradient(90deg, #000 0 58%, transparent)`
  (`62%` on the resume row) — a fraction of the **art**.
- Keep the horizontal scrim's stops in **px**, keyed to the same portrait width:
  `linear-gradient(90deg, rgba(14,12,9,.30) 0px, rgba(14,12,9,.26) 118px, rgba(26,22,15,.78) 203px, #1A160F 264px)`.

Both then travel with band height at any row width.

### 9. Resume row → **type never overlaps the art**
The reference (deckcheck.co) puts its title at ~18px, where its own horizontal scrim is still ~.30
alpha — on the art's brightest region. That is why the names read soft there, and in R1's copy of
it. Scrim tuning is a losing trade at that point: darker scrim, deader art.

R2 gives the art its own **99px column** and starts type at **116px**. The tell is that those rows
carry **no `text-shadow` at all** — if type needs a shadow to survive, it is in the wrong place.
Both variants are drawn in the canvas, parity above and recommended below, so the difference is
checkable rather than asserted.

This also removed a third strategy (`edge-signature`) from the system.

### 10. Escape the apostrophe
`encodeURIComponent` leaves `'` intact, which closes a single-quoted CSS string early and **silently
drops the art**. Commander names are full of them — Yuriko, the Tiger's Shadow; K'rrik, Son of
Yawgmoth; Azog, Moria's Ruin. Use double quotes inside `url()` **and** append `.replace(/'/g,
'%27')`. Caught in review on the Yuriko row; it is the single most likely bug to be reintroduced.

---

## Token reference

| Surface | Band | Strategy | Geometry | Art opacity |
|---|---|---|---|---|
| Deck card | aspect `2.2/1` | `cover` | focal `center top`, labels top | `.58` |
| Commander row | `148px` | `left-portrait` | portrait `203px`, mask `0 58%`, scrim `118/203/264px`, ambient `cover top .20`, labels at band baseline | `.80` sharp |
| Home · ready to build | aspect `2.2/1` | `cover` | focal `center top`, labels top | `.58` |
| Home · resume | `72px` | `left-portrait` | portrait `99px`, mask `0 62%`, scrim `0/58/99/138px`, ambient `cover top .14`, type inset `116px`, **no text-shadow** | `.85` sharp |

Constants across all four: L1 `#0E0C09`, focal `center top`, divider `1px #2A241D`, ground
`#1A160F`, chip-on-art `#14110E` + `1px #3A3229`, title `#F4EFE3`, subtitle `#C6B79A`.

## Notes for engineering

- **One shared `<ArtWash>`.** All four surfaces render it. Divergent per-surface scrims are exactly
  how this drifts back to the reported bug.
- **No art is a valid state.** A missing `art_crop` falls back to the existing colour-identity
  gradient — **same layer, same scrim, no layout shift**. Do not conditionally collapse the band.
  **Corrected 2026-09-08:** this originally read "at the same opacity" as the art, which was loose
  wording on my part and shipped as `1` instead. `1` is right and is hereby ratified — a gradient
  is *ground*, not photography, so the art layer's opacity has no meaning for it, and at `.14` a
  `left-portrait` row with no crop would carry no identity signal at all.
- **Respect reduced-transparency.** Under `prefers-reduced-transparency` or forced high contrast,
  drop L2 to `opacity .3` and push L3's stops to `.95 / .6 / .85 / .86` across the base
  gradient's own four positions (`0 / 40 / 74 / 100%`) — the ramp keeps its fourth stop.
  Reduced-opacity values are a **ceiling, never a floor**: `min(layer, .3)`, so a `left-portrait`
  ambient copy already at `.14` or `.20` is left alone rather than raised. The preference applies
  to **art layers only** — the no-crop identity gradient publishes its own opacity and is not
  capped, and the 180deg override is scoped to the `cover` strategy so it cannot delete the
  90deg px-keyed fade that `left-portrait` exists for.
- **Do not scrim with blur.** `backdrop-filter` on the label band was the other candidate. It costs
  a compositing layer per card in a 40-deck grid and still does not fix hotspot luminance.
- **Theme-aware values** (`surface`, `line`, text ramp, `accent`) come from `src/app/globals.css`
  `var(--*)` tokens; the hexes here are the standalone Palette A values for theme-independent
  reference. **No new token is introduced** — `band`, `strategy` and the portrait multiplier are
  component props, not design tokens.
- **Mock data:** commander names and art are real Oracle cards via Scryfall; deck names, fit scores,
  prices and timestamps are fabricated, several lifted from the bug report so the before/after pairs
  are directly comparable.

## Ratifications

Recorded here so the implementation's deliberate deviations are settled in the design source of
truth rather than living only in the gap report
(`docs/superpowers/gap-report-art-wash.md`, "Deliberate deviations from the handoff").

| Item | Verdict | Where |
|---|---|---|
| Uniform `1px solid var(--border-strong)` on the status pill; colour-faded edges retired | **Ratified** | §3 |
| `Building`'s dashed border | **Restored** — style, not alpha; one line change | §3 |
| No-crop identity gradient at opacity `1` under `prefers-reduced-transparency` | **Ratified**; README wording corrected | Notes for engineering |
| `!important` in both media queries | **Ratified** — inline opacity/gradients are band-derived; nothing else can win | — |
| `forced-colors: active` drops the art | **Ratified** — correct extension of decision 3 | — |
| Status chip fill mixes into `var(--bg)`, not `transparent` | **Ratified** — that is what "opaque fill" meant | §3 |

The canvas is **not** redrawn for these: no new signal values were introduced, so there is nothing
to draw against art. The four retired status-border colours are not coming back.

## Open items

1. **Subtitle truncation on the resume row.** The 116px type inset costs ~27px of subtitle, so
   "Avatar Aang // Aang, Master of Elements" truncates earlier than in the parity variant. If that
   matters more than a recognisable portrait, narrowing the portrait to ~72px (a squarer crop rather
   than the full 1.37:1) buys the width back. **Needs a product call, not a design one.**
2. **Focal is calibrated on five arts.** Zhulodok, Aang, Tovolar, Brago, Kotis — chosen because four
   came from the bug report. `center top` is structurally safe (it cannot clip the top of a crop),
   but the 27–44% focal span is a sample, not a census. Revisit only if a real class of arts reads
   badly.
3. **Full-art DFCs and borderless/extended-art printings** are not drawn. Their `art_crop` is still
   626×457, so the geometry holds, but their compositions sit lower in frame. Worth a spot-check
   once the component is real.
4. **The 2.2:1 band was chosen against the reference's proportions**, not tested at every breakpoint.
   Confirm the deck grid's narrowest column still yields a band tall enough to read.

## Files

- `The 99 - Art Wash Readability v2.dc.html` — the canvas (this amendment's deliverable).
- `The 99 - Art Wash Readability.dc.html` — R1, superseded; cited by R2's captions.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML references; not production code.
