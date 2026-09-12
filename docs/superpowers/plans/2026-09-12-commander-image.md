# Plan — One commander image

**Handoff:** `design/design_handoff_the99_commander_image/` (R6) · **Verdict:**
`docs/superpowers/readiness-commander-image.md` (🟢 Green, 2026-09-12) · **Brief:**
`docs/superpowers/design-briefs/2026-09-11-one-commander-image.md`

The verdict is the build contract. Where the handoff and the verdict disagree, the verdict wins; its
§6 errata table lists all eleven places that happens.

## What ships

Four band heights — **288** page headers, **248** the deck cell, **208** result rows, **168** the
resume cell — plus thumbs at **44×62** and **64×89**. The two card faces keep their **geometry**;
their ring alpha and drop shadow converge with everything else in PR 3. Text at the bottom edge on
**every band** — the eight washed renders; the five thumbs and two faces carry no label at all, which
is why they have nothing to move. No top scrim anywhere, `labelAt` in **pixels from the foot**, one
opaque plate for every control that sits over art, one thumb plate for the five renders that each
invented one, and an empty top edge on **thirteen of the fifteen** — renders 08 and 09 keep a
plated control, which decision 6 rules for both (see the verdict).

## Slicing

Six PRs, by surface, so no single one rewrites nine files. The primitive goes first and stays
**backward compatible** through the middle four, and the compatibility is structural rather than a
promise: the props union keeps its `band`, `labelEdge` and percentage-`labelAt` arms, each marked
`@deprecated` with the file that retires it, and the percentage ramp survives as a separate named
export — `legacyBottomScrimStops(pct)` — rather than as a second meaning for one argument. **The new
prop is `labelAtPx`, not a repurposed `labelAt`**, so no call site can express a unit it does not
mean and the highest-severity risk in the handoff's register cannot be reintroduced by an edit that
forgets which shape it is in. Each surface then migrates on its own PR and the last one deletes the
old path. That ordering is what lets the deck tile's phone overflow gain its
plate in the same PR that removes the scrim carrying it today — the handoff's highest-severity risk,
and non-negotiable.

### PR 1 — the record (this PR)

The patched brief, the handoff committed into the tree, the verdict, the plan, and the tracker row
moved from 📐 to 🟢. No code.

### PR 2 — the primitive and THE PLATE

`src/components/ui/art-wash.tsx`, `full-card-trigger.tsx`, and both test files.

1. `height: 168 | 208 | 248 | 288` is added beside `band: 168 | 148 | 72` rather than replacing it.
   The `band` arm keeps every shipped geometry and retires with its last consumer in PRs 4 and 6, so
   a surface changes height when its own PR says so and not before.
2. The new prop is **`labelAtPx`**, pixels from the foot, and `bottomScrimStops` takes
   `(labelAtPx, band, hold = 73)` in the same commit — emitting
   `[[0,0], [0,(band−1.48·at)/band×100], [hold,(band−at)/band×100], [hold,100]]`. **The hold is a
   parameter and `left-portrait` passes 78**: 73 was measured against the cover band's 0.8 art, and a
   portrait's sharp layer draws at 0.92, where the same hold leaves `--fg-body` at 4.33:1 over a
   white pixel in all six themes — which is why the hand-written column being deleted held at 78.
   One function, one shape, and the one number that has to answer to the art beneath it stays
   answerable. The contrast suite carries the same constant. **No one-argument
   function named `bottomScrimStops` survives**, which is the point: the percentage ramp continues
   under its own name, `legacyBottomScrimStops(pct)`, so the two units can never be passed through one
   signature. Leaving them sharing a name is how the round ships inverted.
3. `PORTRAIT_BANDS` becomes `PORTRAITS`, **keyed by portrait width** — 230 / 285 / 340 / 560 — per
   verdict §2. Every column in it is a function of width, and one 288px band needs two portraits.
   **The width is an explicit prop** (`portrait`), not derived from the band: `height × 1.37` gives
   three of the four, and the desktop deck header inverts the rule by choosing 560 first. Render 10
   selects between its two geometries the way `SpineMobile` and `SpineDesktop` already select between
   themselves — **both wash layers mounted, one shown by a `min-[1200px]` class** — because the stops
   are inline gradients no media query can rewrite. That mount is PR 5's work; PR 2 only has to make
   both geometries expressible. `clearTo` becomes derived (`maskEnd% × width`) rather than a column,
   with an override kept only on the one legacy row whose shipped value disagrees with its own rule;
   `vertical` becomes an override too, kept only on width 203, since one ramp function now serves both
   strategies. New rows: 285 → `flatStop 300`, 340 → `356`, 560 → `584`; 230 keeps its shipped 240;
   every row a stated band can draw is `maskEnd 58`, `sharpAlpha 78`, `sharpOpacity .92`, ground `--bg`.
   **The two legacy widths keep every value they ship with** — 203 its `clearTo`-by-derivation and its
   vertical ramp, 99 its `maskEnd 62`, `sharpAlpha 80`, `sharpOpacity .95`, `--surface-inset` ground
   and `clearTo 58` — until their consumers retire, because a transitional table that "tidies" a
   number changes a band nobody asked it to.
   **The transitional table is six rows, not four.** `203` and `99` are the two aspect-ratio bands'
   own derived widths — `round(148 × 1.37)` and `round(72 × 1.37)`, which is what the primitive
   already computes for them — so the legacy `band` prop resolves through the same table rather than
   through a fallback path, carrying its shipped `clearTo`, `flatStop`, ground and vertical ramp
   verbatim. 203 retires with the two commander rows in PR 4 and 99 with the resume row in PR 6, each
   taking its overrides with it.
4. **Deleted here, and only these:** `OVER_ART_PLATE` and the assertion holding it in step with a
   hard-coded Tailwind class. `COVER_SCRIM_STOPS.top`, the `labelEdge` prop, its class hook, the
   stylesheet override and the two `min-h-[104px]` floors all survive to PR 6, because their
   consumers do.
5. **THE PLATE**: `background: var(--bg)`, `1px solid var(--border-strong)`, radius 7, no
   `backdrop-filter`, icon only, a 26px box centred in a 44px target, `aria-label` required.
   `full-card-trigger.tsx` loses its words and its `72%` class, and its `hero` placement moves to the
   bottom corner the block does not reach. `OVER_ART_PLATE` and its assertion are deleted, which
   **migrates `full-card-trigger.test.tsx` in the same PR** — that file asserts the old top-right
   placement, the visible words and the 72% class, so those three assertions change. Nothing in it is
   deleted: opening the modal, `aria-busy`, the band tap target and all four placements are
   load-bearing and stay, with the plate and the icon-only name asserted alongside them. `z-[2]` (PR #534) is kept — it is
   what makes the control clickable rather than merely visible — and the 44px target is pulled 9px
   inward rather than overhung, because every band it sits on is `overflow-hidden` and an overhanging
   target loses that 9px out of its own hit area.
6. `wash-contrast.test.ts` moves with it, as the handoff requires: it gains a `(labelAtPx, band)`
   table covering every stated band, and the plate test becomes the opaque assertion (`--fg` on
   `--bg`, 12.06–15.65:1 measured). **The two top-ramp tests stay until PR 6**, along with the
   percentage ramp they measure — retiring them here would leave a path this PR still supports
   untested, which is the same mistake as asserting the top scrim's absence before deleting it.
   `THEMES.size === 6` is untouched.
7. `scripts/probe-art-wash.mjs` is **extended, never duplicated**: each stated band's declared height
   against its laid-out height, the ramp's hold position (below half the band is the signature of a px
   value read as a percentage), a **census** of bands that have not migrated, and per card-details
   control its target size, its drawn size, whether the fill resolves opaque and whether
   `elementFromPoint` returns it at the centre and both far corners. The census is a count in PR 2 —
   the top-labelled path is still supported, so asserting its absence here would fail against the
   build's own contract — and becomes the assertion that it stayed at zero in PR 6. Anchored to
   structure and computed styles, never to pixel positions.

### PR 3 — the thumb plate, five renders, no data

`deck-rail.tsx`, `create-picker.tsx` (×2), `create-pre-filled.tsx`, `partner-slot.tsx`, plus the two
card faces' convergence in `detail.tsx` and `create-pre-filled.tsx`.

`63/88 · radius 6 · center top/cover`, `var(--elevated)` under the art, ring
`inset 0 0 0 1px rgba(0,0,0,.4)` — one alpha replacing `.35`, `.35` and `.3`. Renders 03, 11 and 15 go
to **44×62**; 12 and 13 to **64×89**. The partner slot's dashed border stays on the **empty** state
only (verdict §6). The card faces converge on `0 20px 50px rgba(0,0,0,.5)` and the `.4` ring. Fully
independent of PR 2.

**Verification, named because this slice changes only styling and styling is what
a green gate is worst at catching:** a unit test on the primitive for both boxes,
the one ring alpha, the top crop and the identity-then-stripes fallback chain; a
new `partner-slot.test.tsx` pinning both states of the dashed border, which had
no coverage at all; and a browser census in `probe:art-wash` that measures every
marked thumb's box, radius, ring alpha and crop, reports any card-shaped box
**without** the marker as a missed migration, and presses a candidate row so the
picker's selected summary and partner slot are measured rather than assumed.

### PR 4 — the commander surfaces

`detail.tsx` (render 04 → 288, `IdentityPips` retired from the band into the block, `Card details` to
the bottom corner, and `labelAtPx` **109** — measured, not the handoff's 57, which cannot hold a block
whose 25px name alone is 29px; its own open item 2 asked for this figure to be measured at 288 rather
than trusted), `rec-card.tsx` and `discovery-row.tsx` (148 → **208** with a 285 portrait, and the literal `148`
retires). **Their `labelAtPx` figures differ — 46 discovery, 63 the owned lane** — because one wash
sits under two breakpoint subtrees on each row and the desktop block is the taller: the owned lane's
carries a type line under its name and discovery's does not. The handoff gives both 46, which is the
phone's figure, and 46 on the owned row leaves its desktop name on a ramp still climbing. Render 06's "inset frame" is a no-op: there is no frame (verdict finding 5).

**Tests migrate with their surface, in the same PR**, because each asserts the number being changed:
`detail.test.tsx`, `rec-card.test.tsx` and `discovery-row.test.tsx` here. The primitive's legacy arm
is what keeps the other surfaces' tests green in the meantime; a surface PR that leaves its own test
asserting the old band is not a slice, it is a red gate.

### PR 5 — the deck surfaces (two PRs)

The tile and the spines share no file, so this slice ships as two: the tile with its
overflow control, then both spines together.

`deck-card.tsx` (render 08 → 248, pips off the footer, the status chip onto the progress-bar row,
`all owned` and `never played` cut, `labelAt 46`) **with** `deck-card-overflow.tsx` gaining the 26px
plate inside its phone 44px target — same PR, non-negotiable, because the top scrim is the only thing
carrying that glyph today. Then `spine-mobile.tsx` and `spine-desktop.tsx` in one PR, since they are
separated by CSS and not by a branch: both to **288**, mobile at `labelAtPx` **90** — measured against the two-line ceiling its own clamp
imposes, where the handoff's 83 was measured against a third line — and keeping its top-right
`Card details` control measured off the
three-line wrap, desktop to the 560 portrait at a 592 inset above ~1200px of row and the 340 portrait
at a 364 inset below it, and the rename pencil to the inline unplated glyph on both frames — `--fg-muted`
as drawn, asserted at 3:1 with the reason in the test (verdict finding 9). The desktop header mounts
both wash geometries and lets a `min-[1200px]` class choose, since the stops are inline gradients no
media query can reach; the title column's inset switches on the same breakpoint.

Tests in the same PR: `deck-card.test.tsx`, `deck-card-overflow.test.tsx` where it asserts the bare
phone control, `spine-mobile.test.tsx` and `spine-desktop.test.tsx`.

### PR 6 — home, and the old path deleted

`hero-commander.tsx` (render 01 → 288, `labelAtPx` **46** — the verdict's corrected measurement, since
the block is a padded ROW and 38 counted one of its two insets — three pinned elements condensed to one row,
`Start this deck` cut and `See the pool` promoted to the filled treatment) and `resume-decks.tsx`
(render 02 → a **168 cover** band at `labelAtPx` **53** — the round's one strategy flip and its largest reversal, A4). The
resume row's commander name is cut **on single-commander rows only**; a pair's band shows one of two
commanders, so the shortened pair line stays (verdict finding 6). The to-buy clause is cut outright.

Tests in the same PR: `hero-commander.test.tsx` and `resume-decks.test.tsx`, both of which assert the
`aspect-[2.2/1] min-h-[104px]` shape the round retires.

With the last consumer migrated, this PR deletes `COVER_SCRIM_STOPS.top`, the `labelEdge` prop and its
class hook, `legacyBottomScrimStops`, the `203` and `99` portrait rows with their `clearTo` and
`vertical` overrides, `.art-wash-scrim-cover-top` and its reduced-transparency override in `globals.css`, the
`148`, `168` and `72` height arms — `168`'s last consumer is `spine-desktop.tsx`, which migrates one
slice earlier, so the whole `Band` type goes here and not in pieces — and the `min-h-[104px]` floors in `hero-commander.tsx` and `deck-card.tsx`
(verdict finding 4). `.art-wash-art { opacity: … !important }` **stays**, and
`--art-wash-reduced-opacity` stays a ceiling published per layer through `Math.min` — never applied
flat. Resume last means a revert touches one file.

## Out of scope, with reasons

- **The deck grid's one-up breakpoint.** `decks-view.tsx:386` is out of scope on the handoff's own
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
