# Plan — One commander image

**Handoff:** `design/design_handoff_the99_commander_image/` (R6) · **Verdict:**
`docs/superpowers/readiness-commander-image.md` (🟢 Green, 2026-09-12) · **Brief:**
`docs/superpowers/design-briefs/2026-09-11-one-commander-image.md`

The verdict is the build contract. Where the handoff and the verdict disagree, the verdict wins; its
§6 errata table lists all eleven places that happens.

## What ships

Four band heights — **288** page headers, **248** the deck cell, **208** result rows, **168** the
resume cell — plus thumbs at **44×62** and **64×89** and the two card faces unchanged. Text at the
bottom edge on all fifteen renders, no top scrim anywhere, `labelAt` in **pixels from the foot**, one
opaque plate for every control that sits over art, one thumb plate for the five renders that each
invented one, and an empty top edge everywhere.

## Slicing

Six PRs, by surface, so no single one rewrites nine files. The primitive goes first and stays
**backward compatible** through the middle four: it gains `height`, a pixel `labelAt` and a
band-aware ramp while `labelEdge: "top"` keeps working, so each surface migrates on its own PR and
the last one deletes the old path. That ordering is what lets the deck tile's phone overflow gain its
plate in the same PR that removes the scrim carrying it today — the handoff's highest-severity risk,
and non-negotiable.

### PR 1 — the record (this PR)

The patched brief, the handoff committed into the tree, the verdict, the plan, and the tracker row
moved from 📐 to 🟢. No code.

### PR 2 — the primitive and THE PLATE

`src/components/ui/art-wash.tsx`, `full-card-trigger.tsx`, and both test files.

1. `height: 168 | 208 | 248 | 288` replaces `band: 168 | 148 | 72`. The 148 and 72 arms retire with
   their last consumers in PRs 4 and 6, so this PR accepts all six values and the three retiring ones
   keep their shipped geometry until then.
2. `labelAt` becomes **pixels from the foot** and `bottomScrimStops` gains its second argument in the
   same commit — `(labelAtPx, band)`, emitting
   `[[0,0], [0,(band−1.48·at)/band×100], [73,(band−at)/band×100], [73,100]]`. The one-argument
   percentage signature does not survive this PR in any form; leaving it callable is how the round
   ships inverted.
3. `PORTRAIT_BANDS` is **re-keyed by portrait width** — 230 / 285 / 340 / 560 — per verdict §2. Every
   column in it is a function of width, and one 288px band needs two portraits. `clearTo` becomes
   derived (`maskEnd% × width`) rather than a column; `vertical` goes, since one ramp function now
   serves both strategies. New rows: 285 → `flatStop 300`, 340 → `356`, 560 → `584`; 230 keeps its
   shipped 240; every row is `maskEnd 58`, `sharpAlpha 78`, `sharpOpacity .92`, ground `--bg`.
4. **THE PLATE**: `background: var(--bg)`, `1px solid var(--border-strong)`, radius 7, no
   `backdrop-filter`, icon only, a 26–32px box centred in a 44px target, `aria-label` required.
   `full-card-trigger.tsx` loses its words and its `72%` class, and its `hero` placement moves to the
   bottom corner the block does not reach. `OVER_ART_PLATE` and its assertion are deleted.
5. `wash-contrast.test.ts` moves with it, as the handoff requires: the two top-ramp tests retire with
   the top scrim, `BOTTOM_SURFACES` becomes `(labelAtPx, band)` pairs for all six values, the plate
   test becomes the opaque assertion (`--fg` on `--bg`, 12.06–15.65:1 measured), and the vertical-ramp
   helper goes. `THEMES.size === 6` is untouched.
6. `scripts/probe-art-wash.mjs` is **extended, never duplicated**: a check per band that the wash root
   states its height, and a check that no `.art-wash-scrim-cover-top` element exists on any route once
   PR 6 lands. Anchored to structure — `data-` hooks and computed styles — never to pixel positions.

### PR 3 — the thumb plate, five renders, no data

`deck-rail.tsx`, `create-picker.tsx` (×2), `create-pre-filled.tsx`, `partner-slot.tsx`, plus the two
card faces' convergence in `detail.tsx` and `create-pre-filled.tsx`.

`63/88 · radius 6 · center top/cover`, `var(--elevated)` under the art, ring
`inset 0 0 0 1px rgba(0,0,0,.4)` — one alpha replacing `.35`, `.35` and `.3`. Renders 03, 11 and 15 go
to **44×62**; 12 and 13 to **64×89**. The partner slot's dashed border stays on the **empty** state
only (verdict §6). The card faces converge on `0 20px 50px rgba(0,0,0,.5)` and the `.4` ring. Fully
independent of PR 2.

### PR 4 — the commander surfaces

`detail.tsx` (render 04 → 288, `IdentityPips` retired from the band into the block, `Card details` to
the bottom corner, `labelAt` **measured at 288** rather than inherited from 248 — the handoff's own
open item 2), `rec-card.tsx` and `discovery-row.tsx` (148 → **208**, `labelAt 46`, the literal `148`
retires). Render 06's "inset frame" is a no-op: there is no frame (verdict finding 5).

### PR 5 — the deck surfaces

`deck-card.tsx` (render 08 → 248, pips off the footer, the status chip onto the progress-bar row,
`all owned` and `never played` cut, `labelAt 46`) **with** `deck-card-overflow.tsx` gaining the 26px
plate inside its phone 44px target — same PR, non-negotiable, because the top scrim is the only thing
carrying that glyph today. Then `spine-mobile.tsx` and `spine-desktop.tsx` in one PR, since they are
separated by CSS and not by a branch: both to **288**, mobile at `labelAt 83` measured off the
three-line wrap, desktop to the 560 portrait at a 592 inset above ~1200px of row and the 340 portrait
at a 364 inset below it, and the rename pencil to the inline unplated glyph on both frames — `--fg-muted`
as drawn, asserted at 3:1 with the reason in the test (verdict finding 9).

### PR 6 — home, and the old path deleted

`hero-commander.tsx` (render 01 → 288, `labelAt` **38**, three pinned elements condensed to one row,
`Start this deck` cut and `See the pool` promoted to the filled treatment) and `resume-decks.tsx`
(render 02 → a **168 cover** band — the round's one strategy flip and its largest reversal, A4). The
resume row's commander name is cut **on single-commander rows only**; a pair's band shows one of two
commanders, so the shortened pair line stays (verdict finding 6). The to-buy clause is cut outright.

With the last consumer migrated, this PR deletes `COVER_SCRIM_STOPS.top`, the `labelEdge` prop and its
class hook, `.art-wash-scrim-cover-top` and its reduced-transparency override in `globals.css`, the
`148` and `72` height arms, and the `min-h-[104px]` floors in `hero-commander.tsx` and `deck-card.tsx`
(verdict finding 4). `.art-wash-art { opacity: … !important }` **stays**, and
`--art-wash-reduced-opacity` stays a ceiling published per layer through `Math.min` — never applied
flat. Resume last means a revert touches one file.

## Out of scope, with reasons

- **The deck grid's one-up breakpoint.** `decks-view.tsx:251` is out of scope on the handoff's own
  account and owned by a live filter round besides. The tile keeps its ~44% crop loss between 640 and
  699px; one capture at 640 before PR 5 merges.
- **B9** — whether `prefers-reduced-transparency` should reach the scrim now that no band is
  stylesheet-reachable. Open with Design. It would require the ramp as a CSS variable, which this
  round did not spec.
- **The seven excluded renders.** They draw *a card*, not *a commander*.
- **A deck-settings sheet**, raised by Design while answering "do we even need the pencil?" Real IA
  work, bigger than this round.

## Files a live filter round owns — do not touch

`ui/filter-chassis.tsx`, `ui/colour-pips.tsx`, `ui/result-line.tsx`, `decks/deck-filter-*`,
`decks/decks-view.tsx`, `commanders/rack/`, `collection/filter-bar.tsx`, `lib/collection/chips.ts`.
