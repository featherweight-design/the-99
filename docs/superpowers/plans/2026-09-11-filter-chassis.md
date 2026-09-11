# Plan — One filter chassis

**Handoff:** `design/design_handoff_the99_filter_chassis/` (R2) · **Verdict:** 🟢 Green,
`docs/superpowers/readiness-filter-chassis.md` · **Brief:**
`docs/superpowers/design-briefs/2026-09-11-one-filter-chassis.md`

Written against `origin/main` at `519486d`.

---

## Scope decision taken before planning: `Printed in` is cut from this round

Decision 9 draws `Printed in ▾` on both commander lanes, matching any printing, per brief §6
option (1). **It is not built here.** Hugh's call, on Design's own recommendation.

The reasoning, recorded so nobody re-opens it mid-build: it is the only dimension this round adds
rather than rearranges, the only one with an open data question behind it, and the only one that
needs behaviour `/commanders` has never had — the lane selects `cards.imageUri` and
`cards.artCropUri` (`src/lib/recs/recommend.ts:153,175`), which are oracle-level, so no query on
that surface is printing-aware today. Decision 19 makes the chassis a set of slots rather than a
dimension list, and decision 2's row 2 prints the same at four dimensions as at five, so the
dimension lands later without the frame changing.

**Decision 10 still applies**: `/collection`'s `Set ▾` keeps its name, because it answers a
different question. Nothing about it changes in this round.

What this cut does **not** touch: the pip, the frame, the panel, the result line, the clear
vocabulary, the sheet, or the 262px `/decks` regains. The whole consistency win ships.

---

## Global constraints

1. **`ui/filter-panel.tsx` is mounted and parameterised, never forked and never rewritten.** This
   is the readiness verdict's §2 ruling. The panel is ratified in
   `docs/superpowers/design-tables/collection-filter-panel.md` and called "the reference
   implementation" in `rack/filter-sheet.tsx:4`.

   **Parameterised is not "mounted unchanged", and the gap contains a live bug.** The panel picks
   popover versus sheet from `useIsDesktop()` — `(min-width: 768px)`,
   `src/components/ui/use-is-desktop.ts:8` — while the chassis switches form at 900px. Between those
   widths the compact chassis would open a desktop popover inside the phone frame. **The panel takes
   its form from the caller**, as a prop, defaulting to today's behaviour so the collection panel and
   every other existing mount are unaffected. Desktop option rows are `min-h-[40px]` (`:465`) against
   the handoff's 34px rhythm — also a prop. Width is already `widthPx` (`:99`), so decision 4's 280px
   is a call-site argument and needs no change at all.
2. **Pip colours come from the fetched values, not the handoff's table.** `W` `#F8F6D8`,
   `U` `#C1D7E9`, `B` `#CAC5C0`, `R` `#E49977`, `G` `#A3C095`. The handoff assumed the last three and
   all three were wrong; the real floor is 7.77:1, still clearing 3:1 by 4.77.
3. **Five static SVGs in the repository.** Not a hotlink, not a sprite — readiness finding 3.
4. **No opacity, tint or token colour on a pip, ever** (decision 7). Lit is a 2px `--accent` ring.
   This is what fixes the shipped defect: the rack fails the 3:1 non-text floor in 30 of 30
   theme×pip combinations today, collection in 24 of 30.
5. **Every control is 34px on desktop** (decision 3) and a real 44px on the phone (decision 8).
6. **The control row never wraps** (decision 18). Two forms, switching at **1000px**, search the
   only shrinking child. Not 900: decision 18's stated 887px total is 987px, so the wide form does
   not fit at 900 and row 1 wraps — the defect the decision exists to prevent. 1000 is Design's own
   rule ("the minimums, plus a margin") applied to the correct sum. Decided eng-side; it changes no
   drawing and the consequence is the one Design already accepted at 900.
7. **Copy externalises**, and the handoff's `filter-chassis · copy strings.ts` marks which strings
   are reuse from `lanes.ts` / `refresh.ts` / `collection.ts` rather than re-authored. Reuse them.
8. **Mobile and desktop ship in the same PR**, per `AGENTS.md`.
9. **`design/` is reference material** — never import from it. Copy the pip SVGs into `public/`.

---

## Sequencing, and why `/collection` is last

Set collections is being built right now by another agent. Its plan touches
`collection/filter-bar.tsx`, creates `collection/color-filter-row.tsx`, and touches
`collection/rows-view.tsx`. It touches **none** of `deck-filter-column.tsx`,
`deck-filter-sheet.tsx`, `decks-view.tsx` or `rack/*`.

So PR 1 and PR 2 have no file overlap with that build and start immediately. PR 3 waits for its
Task 9, which also needs its test rewritten before it can pass — handed off separately, and not
this run's work.

| PR | Scope | Blocked by |
|---|---|---|
| 1a | Pip assets, `ColourPips`, `FilterChassis`, `ResultLine`'s move | nothing |
| 1b | `/decks` mounts the chassis; `DeckFilterColumn` is deleted | 1a |
| 2 | `/commanders` and `/discover` | 1b |
| 3 | `/collection` | 2, and set collections' Task 9 |

**1a and 1b were one PR in the first draft of this plan.** They are split because the primitives
are self-contained and fully tested while the `/decks` mount is a real refactor of `decks-view.tsx`
plus a component deletion — reviewing them together buries the second in the first. 1a adds no
behaviour: nothing mounts the new components until 1b.

---

## PR 1a — the frame, the pip, and the result line

Primitives only. Nothing mounts them, so this PR changes no behaviour — `/decks` follows in 1b.

### Task 1a.1 — the pip assets

Fetch the five symbols from `svgs.scryfall.io/card-symbols/{W,U,B,R,G}.svg` and commit them under
`public/mana/`. They are finished multi-colour illustrations: a filled `<circle>` ground with the
symbol pathed over it. **Do not strip, recolour, mask or tint them.**

Verify on arrival that each file's first `fill` matches constraint 2 above. If a value differs,
stop and re-measure the floor before continuing rather than assuming the headroom absorbs it.

### Task 1a.2 — `ColourPips`, the one colour control

New `src/components/ui/colour-pips.tsx`. Parameterised — never takes a route flag (the same rule
set collections' Task 9 carries for its own extraction).

- Circles, 22px desktop, 44px phone (decision 8).
- Lit: 2px `--accent` ring. Unlit: the pip at full strength, no opacity (decision 7).
- Inline on desktop, a panel on the phone (decision 5) — a per-width rule, not per-surface.
- `aria-label` from `chassisCopy.colour.pipAria`, replacing `Filter by R`.
- `role="switch"` with `aria-checked`, matching what `color-pip.tsx` already emits, so the
  accessibility contract does not change shape underneath anyone.

**Test:** the lit ring renders at 2px `--accent`; no `opacity` appears in the unlit class list; the
accessible name is the colour's name rather than its code.

### Task 1a.3 — the chassis frame

New `src/components/ui/filter-chassis.tsx`. Three rows, always all three (decision 1):

1. Controls — full width, never wraps, two forms switching at 900px (decision 18).
2. The chip line — prints `no filters on` at rest rather than collapsing (decision 2). This is the
   line that makes the frame a fixed height, so it must not be conditionally rendered.
3. The result line — `rack/result-line.tsx` **moved, not rewritten** (decision 13).

Slots, not a dimension list (decision 19): four control types — field, trigger+panel, segmented,
pips — and a route fills the slots it has. Sort occupies a separated trailing slot past a hairline
(decision 11), on every route and at both widths.

Panels anchor and never sit in flow (decision 4), 280px, `--surface-rail` — mounting `FilterPanel`
with `widthPx={280}` and the caller-supplied form.

**Do not mount `FilterPanel`'s compact branch inside the chassis sheet.** That branch is itself a
fixed `aria-modal` sheet with its own scrim (`filter-panel.tsx:879-894`), so nesting it puts two
dialogs and two scrims on screen. It does not arise here — `/decks` has no searchable dimension and
`Printed in` is cut — and it is `/collection`'s problem in PR 3, to be solved as a nested list rather
than a second dialog.

**Test:** at four dimensions and at five the frame's height is identical; the control row does not
wrap at 900px or at 1440px; `no filters on` is present in the DOM at rest.

---

## PR 1b — `/decks` mounts the chassis, and the sidebar goes

`/decks` is the route Design drew first and the densest at five dimensions, which is the point: if
the frame survives there it survives everywhere. It is also the route that gets the visible win —
deleting the sidebar returns 262px to deck art.

### Task 1b.1 — `/decks` mounts it, and the sidebar goes

- Delete `DeckFilterColumn` (`decks-view.tsx:224`). Its `someOn` line is retired (§3.3) and its two
  footer `Clear`s collapse into the three-scope vocabulary of decision 12.
- Bring `DeckSortMenu` (`decks-view.tsx:173`) into the chassis's trailing sort slot. This is
  decision 11 and it closes the brief's §3.4 — the route currently answers that question two ways,
  toolbar on desktop and sheet on mobile.
- `deck-filter-sheet.tsx` adopts the fixed sheet order, pips first (decision 22).
- Colour moves from `ColourSwatch` to `ColourPips`.
- The deck grid takes the returned width.

**Test:** no sidebar element remains in the desktop tree; the deck grid's container width increases
by the sidebar's former width; sort is reachable at both widths from the same slot.

**Probe:** extend `scripts/probe-*.mjs` with a chassis probe — the frame's height at four and five
dimensions, the absence of the sidebar, and the pip's lit ring. A browser probe is the only proof a
visual ruling shipped; anchor it to structure rather than to pixel positions, and expect the check
to be wrong before the build is.

---

## PR 2 — `/commanders` and `/discover`

The two lanes converge and keep exactly two differences, both data rather than layout
(decision 15): availability is owned-lane only (`filter-rack.tsx:109`), and the order control offers
different options per lane. The match modifier survives untouched (decision 16).

`Score against` keeps its inline segmented shape and mono caption (decision 20) — R1 drew it as a
dropdown and that was corrected; it is the reason the segmented control type exists.

`FilterRack`, `colour-control.tsx` and `filter-sheet.tsx` retire into the chassis. `result-line.tsx`
has already moved in PR 1 and is imported from its new home.

**Test:** availability renders on `/commanders` and is absent from `/discover`; the order control's
option set differs by lane; both lanes render one chassis.

---

## PR 3 — `/collection`

Blocked on set collections' Task 9, which must land with its test rewritten.

- `filter-bar.tsx`'s five `FilterPanel` mounts move into chassis slots.
- The `COLOR` caption goes (decision 17) — it existed to explain five abstract squares, and the pips
  explain themselves.
- The view toggle moves to the result line's trailing edge (decision 21).
- The compact form is the route that conforms least today and is drawn in full at §3b.
- The extracted `color-filter-row.tsx` is replaced by `ColourPips`. **Coordinate before starting** —
  that file is the other agent's output and the set pages mount it too, so this is the one place the
  two rounds meet.

**The set pages inherit the new pip.** Brief §5 and readiness §2: there is one colour control and
the set pages mount it. The new pip sits on `--surface-sunken` there, which no audit has measured —
readiness finding 1 requires a fresh six-theme contrast check on that ground as part of this PR, not
an assumption that the four routes' figures carry over.

---

## Open, and deliberately not closed here

- **The 1000px switch is a judgement, not a measurement** (readiness finding 5). Ship it and watch
  it. A small laptop in a half-width window gets the phone treatment on a pointer device; the
  alternative makes the breakpoint a per-route fact and the chassis stops being one thing.
- **`bodyOneFix` needs a query nobody has written** (readiness finding 4). The empty state promises
  the row count that dropping one control returns — one extra pass per active filter. The commander
  lanes compute this; `/collection` does not. It belongs to PR 3.
- **Chip-line length at `/collection`.** Five dimensions of chips plus `Clear all filters` wraps at
  five active, and the result line follows it down. Design accepts this as the one place the chassis
  legitimately changes height.
- **The shared a11y behaviour has to be written, not inherited.** `STATES` §181 justifies the
  keyboard model as "no new pattern" on the grounds that the shipped panels share `useDialogA11y`,
  roving radiogroups and selection-follows-focus. They do not: `filter-panel.tsx` has its own panel
  and listbox key handling and `rack/select.tsx` has its own focus and menu logic. Budget for the
  shared behaviour as new work in whichever PR first needs it.
