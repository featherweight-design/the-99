# The 99 — Art wash on detail surfaces (design handoff · R5)

Extends the shipped art-wash amendment (`design_handoff_the99_art_wash/`) to:

- **Deck details header** — desktop and mobile.
- **Commander details hero** — **mobile only**. Desktop is correct and untouched.
- **Renaming a deck** — decision 15.

Files:
- `The 99 - Deck Details Art Wash.dc.html` — the deliverable. Canvas (pan/zoom), with a
  **theme prop**: switch it to check every surface under all six themes.
- `brand/` — the locked brand sheet. **Not a colour source** — see below.

Read `design_handoff_the99_art_wash/README.md` first. Decisions are numbered continuing from it.

---

## R5 — why this revision exists

R1 and R2 were built from screenshots and sibling handoff documents. The wash *geometry* survived
review (`168 × 1.37 = 230px`, the px-keyed scrim, the zero-reflow rename ring) but the **colour
layer did not**, because it was specced as hex literals against a system that is six per-theme
token sets in `src/app/globals.css`. R3 moved the whole document onto tokens, R4 closed the remaining undrawn
states, and R5 drew the desktop editing band and corrected two specs against the components that
already implement them.

**The canvas is now the single source of truth, and it uses `var(--*)` throughout.** No literal
**brand** colour appears inside a drawn product frame in either file, except in the retired-value
column below. The rule governs the drawings, not the canvas' `[data-theme]` blocks, which define
the six token sets and are necessarily hex — they mirror `globals.css` and are the only place a
literal is correct. Two non-brand literals remain by design inside the frames and are not theme
tokens: the `rgba(0,0,0,0.4)` inset ring (`IdentityPips`' own value, reused on the bar track) and
the mobile text shadows below.

One correction worth stating plainly: `brand/The 99 - Brand Sheet.dc.html` is **not** the colour
source for WUBRG. R2 "fixed" the pips to the brand sheet and was still wrong — none of its five
hexes match the shipped tokens. `--w…--g` in `globals.css` is the only source.

### Every colour retired

| | Was | Now | Why |
|---|---|---|---|
| Rename field border | `#C9A24B` | `var(--accent)` | retired pre-rebrand brass; cannot come back |
| Rename field fill | `#181410` / `#0E0C09` | `var(--surface-sunken)` | `#0E0C09` is derived as `color-mix(--bg 86%, black)`; never mint it |
| Export / Save | `#CF8745` | `var(--accent)` | the literal *was* Low Sun's accent — pink, lime, teal, violet or blue in the other five |
| Bar track / fill | `#29241F` / `#DEAA29` | `var(--elevated)` / `statusBarStyle` | real tokens, but the mid state only; the fill keys off **status**, not percentage — conflict 3 |
| Ground / divider / chip | `#1A160F` `#2A241D` `#14110E` | `var(--surface)` `var(--border)` / `statusPillStyle` | the canvas disagreed with itself surface to surface; the chip's fill is **status-tinted**, not a flat ground — blocker 5 |
| Rank eyebrow | `#8FB8E6` | `var(--fg-body)` | see conflict 2 |
| Pips | round, off-palette | `rounded-[2px]`, `var(--w…--g)` | see conflict 1 |

---

## Answers — the nine blockers

**1 · Null `art_crop`. Confirmed, no new work.** The shipped fallback carries here unchanged: the
art layer draws the colour-identity gradient and **publishes opacity 1**, per the ratified
reduced-transparency reading (a gradient is ground, not photography). Same layer, same scrim, no
layout shift. Drawn as state 01. On `left-portrait` the gradient fills the portrait slot too — so
the 254px inset is never dead space **when the deck has a commander**. See the exception below.

**2 · Rename entry.** A 28px ghost pencil button immediately after the title. Three states drawn:
`opacity:0` at rest, `var(--elevated-hover)` on row hover, and the base
`2px solid var(--accent)` ring on `:focus-visible`. Below 768px it is **44px and always visible**,
since there is no hover on a phone. The title itself is not the trigger — a deck name is selectable
text.

**3 · Saving, error, disabled-Save.** All drawn. Saving: the field goes **read-only, not disabled**,
so the name stays selectable and the box does not resize; **only Save dims** (60%), and the field's
border drops from `var(--accent)` to `var(--border-strong)` because the accent border *is* the
focus indicator and focus has left the field — the ink stays at full strength. Error: border swaps
to `var(--danger)` and the message **replaces the hint line in the row that is already there** —
the hint row is rendered in all four editing states precisely so no row is added; empty, duplicate
and server-failure all render here. Disabled: Save drops to `var(--elevated)` +
`var(--fg-disabled)` with `aria-disabled`, Enter inert, and **Cancel never disables — ratified,
including while saving.** If a save hangs, a disabled Cancel removes the reader's only exit at
exactly the moment they need it; the canvas drew it disabled and the canvas was wrong. The field
**holds its full box while empty** — it is the title's space, not the text's — so all four editing
states measure 352×29. Strings are Product's.

**4 · Bar below 100%.** Drawn at 40/99. The fill is `var(--fg-body)`, because that deck is
`Building` and the bar keys off status rather than the count — see conflict 3, which corrects the
percentage reading this line first carried.

**5 · Status chips — render as shipped. `statusPillStyle` wins; do not fork it.**

An earlier draft of this section respecced the chip while citing the ratification that shipped it:
it put the fill on `var(--surface-sunken)` and gave `Building` a `var(--border-dashed)` border.
Both are wrong. `src/lib/decks/status-style.ts` puts **the status colour in the fill**, mixed into
`--bg` so the plate is opaque at every alpha, and uses **one `var(--border-strong)` hairline for
every status** — `Building` differing only in `border-style`. Adopted verbatim:

| Chip | Fill token | Fill | Border | Ink |
|---|---|---|---|---|
| `Complete` | `--success` | `color-mix(in srgb, var(--success) 18%, var(--bg))` | `1px solid var(--border-strong)` | `var(--success)` |
| `Building` | `--fg-body` | `color-mix(in srgb, var(--fg-body) 14%, var(--bg))` | `1px dashed var(--border-strong)` | `var(--fg-body)` |
| `Draft` | `--fg-faint` | `color-mix(in srgb, var(--fg-faint) 16%, var(--bg))` | `1px solid var(--border-strong)` | `var(--fg-muted)` |

`Draft` and `Building` take the lighter 16% / 14% fills and a quieter label because their own token
*is* a text colour — that component's stated exception, not something this handoff introduces. The
other three statuses (`Over`, `Unresolved`, `To buy`) follow the flat 18% rule and need nothing
from this document.

**6 · Long deck name.** A **two-line clamp** at both widths, so the band never grows. Implement it
as `display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden`,
which gives you the ellipsis for free. The canvas clamps by `max-height: 54px` (two 27px line
boxes) and shows the already-truncated string instead — the mock's style compiler drops
`-webkit-box`, and a silent mid-word cut in a spec reads as a data error.

**Do not pair it with `min-height`.** An earlier draft said to, citing `suggestion-tile.tsx` — but
that file's `min-h-[2.5em]` exists to align one-line titles with wrapped ones **across a grid of
sibling tiles**. A deck header is a single element with no sibling to align to, so the reserved
second line is a full line box — 25px desktop, 25px mobile — of dead space under every one-line
deck name, which is the common case. `max-height` alone is the clamp. **The height and the
result are the same either way**; only the mock's mechanism differs.

In the field: `nowrap` with `overflow:hidden` — a real input scrolls horizontally at the caret,
which is correct and needs no ellipsis.

**7 · Deck with no commander — and the exception to decision 11.** Drawn as state 03: subtitle
becomes "No commander yet" in `var(--fg-faint)`, pips are absent (`IdentityPips` already returns
`null` on an empty identity), and the `Card details` pill is absent.

The part worth reading: **no commander means no colour identity, so there is no gradient to fall
back to either** — the one case blocker 1's fallback cannot cover. `left-portrait` exists solely to
give a too-thin band a portrait slot, so with neither art nor identity the strategy has no purpose.
**The header does not use it.** The 254px inset collapses to the row's normal `24px` padding, both
scrims are dropped with it, and the result is a flat full-width header. Without that, the left 254px
of a 168px band is blank and reads as a broken image slot.

The general rule, which covers both strategies rather than being `left-portrait`-specific:
**no art and no identity means there is nothing to wash, so there is no wash.**

| | Consequence |
|---|---|
| ≥768px (`left-portrait`) | no portrait slot: inset collapses `254px → 24px`, both scrims dropped, band keeps its 168px |
| <768px (`cover`) | **the band is removed entirely.** A `2.2/1` band with nothing in it is 177px of empty; the header becomes a flat `var(--surface)` block at content height |

Both are drawn, and **`Export` is absent in this state at both widths** — there is nothing to
export. Ratified; the canvas now draws it absent too (it previously contradicted this line).

Add to decision 11's rule: **no art and no identity → no wash.**

**8 · Hover, active, focus-visible.** **The ring already exists**: `globals.css` sets
`outline:2px solid var(--accent); outline-offset:2px` on every `:focus-visible` in `@layer base`.
No on-art value is needed — the 2px offset lands on the control's own opaque fill, which is a
second reason for decision 13. **One override:** the editing field takes
`focus-visible:outline-none`, because its 1px `var(--accent)` border *is* its indicator and the
base ring doubles it — exactly the opt-out that rule's comment anticipates. Hover uses the existing
`--accent-hover` / `--elevated-hover` pairs.

**9 · Breakpoint.** **768px (`md`)**, matching the shipped header and `.guided-banner`, not the
640px the siblings use. R2's open item 1 (tablet) is **closed by deletion**: `left-portrait` needs
~700px of row to leave a usable label column, so there is no tablet-specific header — below 768px
the `cover` treatment applies at whatever width it gets, being aspect-driven.

---

## Answers — the conflicts

**1 · Pips. Ruling upheld; my drawing was wrong.** Adopting `IdentityPips` verbatim —
`rounded-[2px]`, `inset 0 0 0 1px rgba(0,0,0,0.4)`, `var(--w…--g)`, `null` on empty identity.
The recorded ruling ("squared off, which is what separates an identity read from the round mana
pips a cost is drawn with") is not merely upheld — **this handoff is evidence for it.** R2 drew
round pips on the commander hero *while the printed card's round mana symbols were in the same
frame*, which is precisely the collision the shape prevents.

**2 · `#8FB8E6` withdrawn entirely.** The premise was wrong twice over: the screenshot was a
non-default theme, so "the shipped `--accent` blue" was never the default's orange, and the
contrast finding does not generalise. A single on-art accent literal would be one theme's hue in
six. The rank eyebrow takes **`var(--fg-body)`** — but an earlier draft justified that by citing
`wash-contrast.test.ts`'s `.86` stop, **which is not where the eyebrow renders.** That stop is the
bottom of the band (it covers the subtitle, at 87%); the eyebrow's block starts at **54%**, and on
the inverted ramp as first drawn that was α 0.487 — **3.59:1, under the floor.**

Fixed at the ramp rather than the ink, per decision 12: the third stop moves from
`.62 @ 68%` to **`.62 @ 50%`**, so the whole label block sits in the dark end. Measured at α
0.643, `var(--fg-body)` gives **5.06:1** at the eyebrow's top edge and 5.23:1 at its midline; the
name is 6.7:1 and the subtitle 6.8:1. The ramp change applies to **every bottom-labelled `cover`
surface**, so the mobile deck header gets it too — one ramp, derived from the label edge.

Accent stays where it is large enough to hold its own: the FIT figure and buttons.

**3 · Bar keys off status, not percentage — corrected.** Both the audit's framing and my answer to
it were wrong, and reading `status-style.ts` for the chip caught it: `statusBarStyle` sets the fill
to **`var(STATUS_TOKEN[status])`** — one token per status, with no thresholds on the count.
Percentage thresholds would render a **40/99 `Building` deck red**, which is exactly the frame this
document drew.

| Status | Fill |
|---|---|
| `Complete` | `var(--success)` |
| `Building` | `var(--fg-body)` |
| `Draft` | `var(--fg-faint)` |
| `Over` | `var(--danger)` |
| `Unresolved` | `var(--warning)` |
| `To buy` | `var(--accent)` |

Width is `min(100, built/99)` — an `Over` deck is full, not 105%. Track `var(--elevated)`.
Decision 14's hairline stands: **`inset 0 0 0 1px rgba(0,0,0,0.4)` — inset, on the track, not the
fill**, so one value serves every status and reuses `IdentityPips`' own ring.

**4 · Mobile type: the canvas wins — 20px title, 10px subtitle.** The README's 16px/11px was the
spine's *at-rest* figure, carried over after the card object was dropped. With the thumbnail gone
the title is the surface's only identity, so it takes the larger size.

**5 · Decision 13 reduces to mobile plus the hero. Confirmed, and the "opaque fill" is withdrawn.**
The audit is right that the rule is vacuous on desktop: the scrim is flat before the content row, so
nothing there is on art. Desktop `Update from a list` keeps its ghost outline, as the canvas draws
it.

**6 · Divider, ground, ring alphas.** All were literal-vs-literal drift. Divider `var(--border)`,
card ground `var(--surface)`, band `var(--bg)`; both the pip ring and the bar track ring are
`inset 0 0 0 1px rgba(0,0,0,0.4)`. **The chip is not on this list** — its fill is the status colour
mixed into `var(--bg)`, per blocker 5, and no ground of its own.

**7 · Which ground is the constant.** `var(--bg)` for a wash band (it is the plate the scrim mixes
toward, which is what makes `color-mix(in oklab, var(--bg) …)` correct), `var(--surface)` for a
card, `var(--border)` for every divider.

**8 · The mobile band does not grow.** Correct — it is a fixed `2.2/1` aspect and cannot. The
rename row lands *inside* it and the pips/subtitle/chip row does move, below the divider.
**Zero reflow is a desktop-only claim**, and is stated as such now.

**9 · `1.6:1` loses 14.4%, not 27%.** My arithmetic error, and it strengthens the case:
`1 − (1.37/1.6) = 14.4%` against `37.7%` at 2.2:1. The hero keeps more than twice as much crop as
a deck card.

**10 · 243px was the same pixel, not ahead of it.** Fair, and zero tolerance is right for a spec.
The scrim's flat stop **moves to 240px**, so it now precedes the field ring at 243px and the type
inset at 254px with nothing coincident left to explain.

---

## Wash geometry — unchanged from R2

| Surface | Band | Strategy | Art | Scrim | Labels |
|---|---|---|---|---|---|
| Deck details · ≥768px | `168px` | `left-portrait` | `.80` sharp / `.20` ambient | h: `.30 / .26 @134px / .78 @230px / flat @240px`; v: `.30 / .10 / .42` | past the 254px inset, on flat ground |
| Deck details · <768px | aspect `2.2/1` | `cover` | `.58` | `.66 / .22 @26% / .62 @50% / .90` | bottom, centred |
| Commander hero · <768px | aspect `1.6/1` | `cover` | `.58` | `.66 / .22 @26% / .62 @50% / .90` | bottom |

Constants: `art_crop` only, focal `center top`, portrait `= band × 1.37`, fade via `mask-image`
on the art, scrim stops in **px** keyed to the portrait, **last stop at or before the type inset**.

**Type on a wash carries a shadow; type on flat ground does not.** The desktop band's labels sit
past the flat `240px` stop, so they have none — that absence is the tell. On a `cover` band, where
every string is on the wash: **`0 1px 4px rgba(0,0,0,0.85)` on every string, `0 1px 3px
rgba(0,0,0,0.8)` on the eyebrow** (it is the only 11px string there, and a lighter shadow keeps
letterforms that small from thickening).

**Clamp:** `max-height` only — **`51px`** desktop (two 25.2px line boxes: 21px at `line-height:1.2`)
and `50px` mobile (two 25px line boxes: 20px at 1.25). No `min-height`; see blocker 6. An earlier
draft derived the desktop figure as "two 27px line boxes", which is the inline span's font box, not
the line box the block lays out on.

**Commander hero placements:** identity pips `top:14px right:16px` at 12px; `Card details` at the
canonical `top:56px right:16px`, which stacks it *below* the pips rather than beside them. On the
deck header the same pill sits at the portrait's bottom-left (desktop) and `top:13px right:16px`
(mobile) — three placements, one component.

**Six surfaces, two strategies, one `<ArtWash>`.** `ambient-only` is retired (decision 11) and was
never built.

---

## Decisions 11–15 — summary

- **11 · RETIRED.** The card thumbnail goes; `ambient-only` dissolves with it. Desktop becomes
  `left-portrait` with a 230px portrait (3× the thumbnail, frame-free); mobile becomes a deck card.
  **Ship the `Card details` pill with it** — `art_crop` is frame-free, so set symbol, mana cost,
  type line and P/T otherwise leave the deck page.
- **12 · The label edge decides the scrim ramp**, not the surface. Pass the label edge as `band`
  and derive the stops. **Derive them from where the label block *starts*, not where the band ends**
  — the eyebrow miss above was the ramp reaching its dark end at 68% while the first line of type
  starts at 54%, **14 points higher**.
- **13 · A tappable target on art needs an opaque fill** — or it moves below the divider. Applies
  to mobile and the hero only (conflict 5).
- **14 · The bar needs a hairline, not a new track** — `inset 0 0 0 1px rgba(0,0,0,0.4)` on a
  `var(--elevated)` track, one value against three fills.
- **15 · Rename is a field, not a mode.** Zero reflow on desktop, because Save/Cancel replace
  Update/Export in the actions slot rather than adding a row. `Enter` commits, `Esc` reverts, blur
  commits. Five states drawn.

---

## Open items

1. **Rename undo.** Blur commits, which needs an undo affordance to be safe — a toast, or making
   the rest state re-editable on one tap. A product call on how loud that confirmation should be.
2. **`Card details` on the deck header is a new placement**, though not a new control. Desktop
   takes the portrait's bottom-left, mobile `top:13px right:16px`. Its full-band tap overlay needs
   scoping to the pill on the engineering side.
3. **Focal is calibrated on five arts**, not a census. `center top` is structurally safe (it cannot
   clip the top of a crop), but revisit if a real class of arts reads badly.
4. **Full-art, borderless and extended-art printings** are undrawn. Their `art_crop` is still
   626×457 so the geometry holds, but their compositions sit lower in frame.
5. **App-shell chrome drift.** The shipped mobile top bar does not match
   `design_handoff_the99_appshell/`: the shipped bar uses a blue literal and text-glyph diamonds,
   the handoff specs a gold one at `9px/0.42em` with a diamond triad. **Both are literals, and the
   gold is the retired pre-rebrand brass** — so that handoff needs its own rebase onto
   `var(--accent)` before either can be called correct. Separate work, and the reason this handoff
   draws no chrome at all now.
6. **Shipped deck header diverges from the spine spec** independently of this amendment — larger
   card and title at both widths. Moot for the header itself now the thumbnail is gone, but
   `design_handoff_the99_deck_reimport/` still specs the type sizes.
