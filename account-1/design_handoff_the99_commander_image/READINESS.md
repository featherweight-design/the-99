# Readiness — One commander image (R6, packaged)

**Self-assessment: 🟢 green.** Six rounds, all five of the brief's open calls made, decision 6's
enumeration complete across all fifteen renders, every amendment to the two ratified tables stated
individually with a verdict, and every band drawn at the width it ships at. Two items wait on people
rather than on design: three copy strings (Product) and one deck-grid column change.

Deliverables: `The 99 - One Commander Image.dc.html` (canvas, six-theme `theme` prop),
`README.md` (decisions log, newest round first), `STATES-commander-image.md` (the settled geometry for
all fifteen, the ramp table, the chrome spec, the six statuses),
`commander-image · copy strings.ts` (the three cuts, the accessible names, and two strings I proposed
cutting and did not), `brand/` (the locked brand sheet — reference, not a colour source).

---

## What an implementer can start on today, in order

**1 · The primitive (`ui/art-wash.tsx`). Self-contained and testable before any call site moves.**

- `band: 168 | 148 | 72` → `height: 168 | 208 | 248 | 288`.
- **`labelAt` changes unit: percentage → pixels from the foot.** This is the round's load-bearing
  change — a percentage is what made a taller band scale its own darkness.
- **`bottomScrimStops` takes a second argument** in the same commit: `(labelAtPx, band)`. Its stops are
  gradient position percentages, and a px value through the old one-arg signature holds the scrim at
  46% of the band instead of 81% — worse than not doing it at all.
- Add the three new `PORTRAIT_BANDS` rows (285/165/300, 340/197/356, 560/325/584); keep 168's shipped
  240. Delete `clearTo` and `vertical` as columns.
- Delete `COVER_SCRIM_STOPS.top`, the `labelEdge` prop, `art-wash-scrim-cover-top` and its
  reduced-transparency override, `OVER_ART_PLATE`, the 104px floor.
- `wash-contrast.test.ts` moves with it: it derives its floors from these alphas, and the two drifting
  apart is the failure it exists to catch. `THEMES.size === 6` is untouched; the `OVER_ART_PLATE`
  assertion is deleted.

**2 · THE PLATE, three call sites.** `full-card-trigger.tsx` (opaque fill, hairline, drop
`backdrop-filter`, **icon-only with `aria-label`**, one bottom-corner placement instead of three),
`deck-card-overflow.tsx` (**the 26px plate inside the phone's 44px target — the one accessibility fix
in the round**), and the rename trigger becoming an inline unplated glyph on both frames.

**3 · The thumb plate, five call sites.** `deck-rail.tsx`, `create-picker.tsx` (×2),
`create-pre-filled.tsx`, `partner-slot.tsx`. Pure geometry and one ring alpha; no data, no copy, no new
props. Independent of 1–2 and safely parallel.

**4 · The bands, six call sites.** `detail.tsx` (pips move into the block), `deck-card.tsx` (pips off,
**status chip to the bar row**), `hero-commander.tsx` (three pinned elements condense to one row, CTA
cut), `rec-card.tsx` + `discovery-row.tsx` (148 → 208, and the frame comes off discovery), and
`spine-mobile.tsx` + `spine-desktop.tsx` in one PR — they are separated by CSS, not by a branch.

**5 · The resume row last.** The only render changing *strategy*, and A4 deletes four ratified values
at once. Doing it after everything else means a revert touches one file.

**Measure `labelAt` at the reference width as you go, never from the intended block.** R5 costed the
mobile deck header at 57px; the title wraps to three lines at 390px and the real block is 83. Derived
from 57, the hold lands where the block *ends* and the first line sits on unscrimmed art — the round's
own failure, reintroduced by an optimistic number.

---

## Dependencies

| | |
|---|---|
| **Grid · the deck tile's column floor** | 248 is 1.79:1 at a 445px three-up column and 1.44:1 one-up on a phone, but **0.76:1 in the 189px two-up column at 640**, losing ~44% of the crop's width. Recommended fix is one-up below ~700px — a deck-grid column change, outside this round, and yours to accept. |
| **Product · three strings** | `Start this deck`, the resume row's to-buy clause, and desktop's `99 owned · 0 to buy`, plus `all owned` and `never played` on the tile. Each survives elsewhere except `never played`, which has no replacement. |
| **Sequencing · the home redesign** | §3.3's "desktop gains nothing" rests on the Your Decks rail being removed. If it survives on either frame, render 03's thumb ships and desktop's art-and-count gap needs its own call. Does not block steps 1–5. |
| **Decision · B9, reduced transparency** | Once every band is bottom-labelled, no scrim is stylesheet-reachable and the preference rides on `.art-wash-art` opacity alone. If it should reach the scrim too, the ramp must be emitted as a CSS variable rather than an inline gradient — a change to the primitive this round has **not** specced. |

**No data dependency.** Every field these fifteen renders read — `artCropUri`, `imageUri`,
`commanderImageUri`, `colorIdentity`, `statusPill` — already exists at every call site. Nothing here
adds a column, a query or an API shape.

---

## What this round deliberately does not do

- **It draws no chrome.** `design_handoff_the99_appshell/` still specs the retired `#C9A24B` brass and
  needs its own rebase; unchanged by this handoff.
- **It does not touch the seven excluded renders** — `grid-view.tsx`, `hover-preview.tsx`,
  `deck-card-tile.tsx`, `suggestion-tile.tsx`, `card-search-row.tsx`, `card-modal.tsx`,
  `printing-region.tsx`. Those draw *a card*, not *a commander*. The thumb plate is a plausible future
  home for several and is deliberately not extended there.
- **It does not respec `statusPillStyle`, `statusBarStyle`, `IdentityPips` or `StatusPillBadge`.** All
  four render as shipped; the pill moves row on one tile and the pips move or come off on two.
- **It does not add a deck-settings sheet.** Raised while answering "do we even need the pencil?" — a
  chevron on the identity row opening rename / commander / delete is real IA work, and it would give
  the tile's overflow menu somewhere to point. Worth having, bigger than this round.

---

## Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| Unit change without the signature change | **high** | Same commit, stated in step 1 — either alone is worse than neither |
| A4 deletes four ratified values in one change | **high** | Audited first, shipped last, one file |
| Phone overflow unprotected between deleting the scrim and plating the control | **high** | Same PR, non-negotiable — the scrim is the only thing carrying that glyph today |
| `labelAt` derived from an intended rather than measured block | **medium** | Caught once already in R5; measure at the reference width per surface |
| Deck tile trims ~44% of crop width at 189px | **medium** | `center top` keeps the face; real fix is a one-up grid below ~700px (out of scope) |
| 560px portrait crowds the desktop title column | **medium** | Hard floor at ~1200px of row; below it, fall back to 340 at a 364 inset — **that fallback is still undrawn** |
| Reduced transparency no longer reaches any scrim | **medium** | B9 — flagged as a decision, not silently accepted |
| `labelAt` too low on a 320px phone | low | Fails safe: ink lands on the hold, never above it |

---

## Open

1. **The 189px deck tile at 248** — one capture at 640 before merge. Arithmetic is stated; the fix is
   the grid's, not the band's.
2. **Render 04's `labelAt` at 288 is inherited, not measured.** It was measured at 248 (57px). At 390px
   its two-line name carries the same wrap risk that made render 09's block 83 — measure it at 288
   before shipping rather than trusting 57.
3. **The desktop deck header's narrow fallback is undrawn.** Below ~1200px the header falls back to the
   340px portrait at a 364 inset — the one surface in the round with two geometries, and only the wide
   one is drawn.
4. **Whether the deck rail is really being removed.** §3.3's answer depends on it.
5. **`aria-label` on `deck-card-overflow.tsx`** — I specced "Deck options" without reading the shipped
   label. Confirm rather than take it.
6. **Borderless and extended-art printings, still undrawn.** Carried forward; their `art_crop` is still
   626×457 so the geometry holds, but their compositions sit lower in frame — which matters more now
   that the top scrim is gone.
