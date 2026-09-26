# Printed in ▾ on the commander lanes: plan

**Source.** Filter-chassis decision 9 (`design/design_handoff_the99_filter_chassis/README.md:121`):
`Printed in ▾`, matching ANY printing (brief §6 option 1), on BOTH `/commanders` and `/discover`.
Readiness audit: `docs/superpowers/readiness-filter-chassis.md` (Green). Cut from
`docs/superpowers/plans/2026-09-11-filter-chassis.md` at its top; reopened by Hugh 2026-09-27 for
HOB/HOC. No Design round: everything below stays inside decision 9, decision 10 (`/collection`'s
`Set ▾` is untouched) and decision 23 (the one nested compact control).

## Measured on staging (read-only, 2026-09-26)

- 3,789 legendary creatures carry a printing; **431 sets** printed at least one.
- A commander is printed in **1.98 sets on average**, 17 at most.
- HOB + HOC together printed **79** of them.

So the vocabulary is long enough to need the panel's search (the handoff's `searchable`), and
per-commander membership is small.

## Shape

**One module owns the rule: `src/lib/sets/printed-in.ts`.**

- `printedIn(oracleId, setCodes)`: a Drizzle SQL predicate for a query whose row carries an
  oracle id, `exists (select 1 from printings p where p.oracle_id = <outer>.oracle_id and p.set_code = any(<lower-cased codes>))`.
  Aliased and qualified on both sides (the AGENTS.md correlated-subquery rule), pinned by a
  rendered-SQL test asserting the inner `pi.oracle_id` against the outer `"cards"."oracle_id"`. This is the
  predicate Help me choose's Sets answer shares (see Coordination).
- `loadCommanderPrintings()` (`printed-in-read.ts`, server only): every legendary card's sets,
  newest set first, memoised per catalog generation (#705) so a Monday refresh retires it.
- `lanePrintedIn(oracleIds, index)`: what a page ships beside its rows, `{ sets, rows }`, where
  `rows[i]` is the set indices of the i-th row it ships. Aligned by construction, because the page
  builds it from the very list it sends.
- `filePrintedIn` / `isPrintedIn`: the client files each shipped index into one map from oracle id
  to set codes, then tests rows. Filed rather than replaced, because a card's printings do not
  depend on which ranking shipped it.

**What ships, and why not lazily.** The first draft of this plan loaded an oracle-keyed index on
the panel's first open. Measured while building: 4,565 legendary cards keyed by uuid is ~360KB,
more than the feature is worth on any visit. Keyed by row position instead, a lane's index is
about 2 small integers per row plus the names of the sets its rows were printed in, ~24KB raw on
`/discover`'s ~3,000 rows, and it ships with every render. That buys synchronous filtering: the
result line, the chips, `nearestFix` and discover's excluded report all read it with no pending
state, and a URL arriving with `?p=` is filtered on first paint.

**Which sets the panel lists** (d9's condition at approval). Only the sets this lane's rows were
printed in, so no set can return nothing on its own. Each row carries the count of rows it would
leave given the OTHER active filters, the `FilterPanelOption.count` convention `/collection`'s
`Set ▾` already follows, and a set at 0 under the other filters is drawn dimmed and disabled, which
is `FilterPanel`'s shipped zero-count treatment.

**Lane params.** `printedIn: string[]` (the handoff's one new shape). URL key `p`, comma form,
lower-cased, deduped, sorted, unknown codes kept rather than validated (a set that stops existing
matches nothing, which the empty state then names). `p` joins `LANE_KEYS`; `activeControlCount`
counts it as one control on both lanes.

**The control.** Wide form: a `Printed in ▾` trigger in the rack's filter slot, opening the
shipped `ui/filter-panel.tsx` with `searchable`, rows = set name with the code as gloss, the
hint once in the panel head. Compact form: a 44px row in the filter sheet opening that same
panel as a second layer (decision 23). Chips: `Printed in HOB`, or `Printed in HOB, HOC`,
collapsing to `N sets` where the chip line uses its short form. Copy comes from the handoff's
`printedIn` block, run through `/copy-review` apply mode before it lands in `src/lib/copy/lanes.ts`.

**The empty state (`bodyOneFix`).** `nearestFix` gains `Printed in` as one candidate beside
each lit pip, with `rows` = the lane filtered by everything except the set selection. Mode stays
excluded, as today. `bodyOneFix` currently ends "Drop the color and you get N rows back", which
is false once a set can be the named control, so it becomes "Drop it and…" (or a per-kind
sentence, `/copy-review` decides the wording). `changedAt` stays 0 for every candidate, as the
existing comment explains, so a tie breaks by candidate order: pips first, then Printed in.

On `/discover` the filtered-zero state names colors today (`filteredBody(colorWords(colors), …)`)
and the built clause filters deck identities by color. Both gain the set dimension: the body
names the sets when the sets alone emptied the list, and the built clause stays colors-only
(built decks carry no printing, and claiming one would be false). The excluded-name report gains
a `printedIn` cause whose correction clears `p`.

**Owned lane under `Build from: free`.** No interaction: free mode chooses the pool the scores
are counted against; the set filter narrows rows. They compose like the colors do.

## PR boundaries

1. **Predicate, index and params (no UI).** `printed-in.ts` (`printedIn`, `lanePrintedIn`,
   `filePrintedIn`, `isPrintedIn`) with its `.toSQL()` test, `printed-in-read.ts`, and
   `LaneParams.printedIn` through parse, serialize and `laneQuery`
   (`activeControlCount` counts it in PR 2, beside the chip, so no badge lights over an
   unfiltered list). Plus
   `probe:printed-in`, read-only against the real catalog: the predicate and the index agree set by
   set, a card printed in two sets matches either, two sets are the union, case, an unknown code.
   `nearestFix` moves to PR 2, where its candidates are built.
2. **The control on both lanes.** Rack slot, sheet row plus second layer, chips, the owned and
   discover empty states, the excluded report cause, the About edit, the probe below and the
   contact-sheet inventory. ~600 lines. If it runs past ~800 it splits owned lane / discover
   lane, named before it is split.

## About

An ordinary edit, no `ABOUT_VERSION` bump (a filter on an existing surface, like Card captions).
One sentence appended to the `commander-lane` caption and one to `discover`'s, saying `Printed in`
matches any printing of the commander, including ones you do not own. Hash re-pinned. No key
lines, so no numerals owed.

## Proof

- **Probe `probe:printed-in-lanes`** at 390x844 and 1300x900, on both lanes: presses the control
  (never a URL), searches the panel for a set, picks it, and asserts every row left is printed in
  it (checked against the DB, not the index), the chip and the badge, then removes the chip.
  Drives the lane to zero with a pip plus a set and asserts the one-fix sentence names the
  control whose removal returns the most rows, and that pressing it returns that many. At 390 it
  goes through the sheet's second layer. Writes nothing except the About row via
  `clearAboutSheet`, captured and restored.
- **Mutations:** matching "all selected sets" instead of any (fails the two-set case), dropping
  `p` from `LANE_KEYS` (a clear leaves it in the URL), leaving Printed in out of `nearestFix`
  (fails the set-only zero state).
- **design-review** against decision 9 and the `printedIn` copy block, per PR 2.
- **feature-acceptance**, inventory `docs/superpowers/inventories/printed-in.json`:

| Route | 390 | 1300 | Shares with |
|---|---|---|---|
| `/commanders` | ☐ | ☐ | `/discover` (same `PrintedInControl`) |
| `/discover` | ☐ | ☐ | `/commanders` |

  `check:shared` with a `shares` block naming `PrintedInControl`.

## Coordination

Help me choose's Sets answer (1f) is to use `printedIn(setCodes)` from this module. PR 1 is the
first thing this lane builds and has no UI dependency, so this lane can land the predicate
first; if 1f already has one in flight, this lane imports theirs instead and PR 1 shrinks to
the index and the params.

## Out of scope

Printing-aware rows (option 2), `/collection`'s `Set ▾`, and any new dimension beyond this one.
