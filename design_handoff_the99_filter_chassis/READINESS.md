# READINESS — the filter chassis (R2)

**Self-assessed: 🟡 amber, with one decision blocking and one dependency sequenced ahead of it.**
Everything §3 asks Design to call is called, drawn and measured. What keeps this off green is not a
drawing gap — it is that §2.1's locked decision, read literally, retires a component that shipped
three weeks ago, and I would rather have that confirmed than discover it in a build review.

## What is green

- **The chassis.** Three rows, the fixed-height rule, the 34px control rhythm, the panel shape, the
  chip line, the trailing sort slot. Drawn at `/decks`' five dimensions in five desktop states and
  four phone frames, which is the density §3.2 asks the frame to survive.
- **The pip, and the measurement §5 says nobody has made.** Six themes, two decimals. The floor is
  **9.51:1** and the treatment's own state carrier (`--accent` ring) floors at **4.42:1**. Both
  clear their floors everywhere.
- **The dimming defect it uncovers.** The shipped unlit pip measures **1.38:1** against
  `--surface-sunken`. That is three live surfaces under the 3:1 non-text floor today, and it is not
  a consequence of this round — it ships already. Filed as a finding regardless of what happens to
  the chassis.
- **§3.3, §3.4, §3.5 and §6**, each ruled with its consequence named rather than left implied —
  including the three retirements (§3.4's deck-sheet sort group, §3.3's two footer Clears and the
  column's `someOn` line).
- **Copy.** Every string, with the reuse from `lanes.ts` / `refresh.ts` / `collection.ts` marked as
  reuse rather than re-authored. The new dimension's wording is the answer to §6's second half.
- **The four routes' dimension lists**, and the ruling that differing lists are correct (§2.2) while
  differing *frames* are not.

## Blocking — one decision

**Does "a new chassis, not an adoption" include a new panel?**

§2.1 rejects "the collection bar" — which is five mounts of `ui/filter-panel.tsx`: 42.5KB with
34.6KB of tests, ratified in `collection-filter-panel.md`, named "the reference implementation" in
`rack/filter-sheet.tsx`'s header comment, and listed in set collections' readiness as
**"mounted, not forked"**.

Decision 4 therefore specifies the panel as *what `FilterPanel` already does*. Two readings, and
they cost very differently:

- **A new chassis around the existing panel.** The panel is kept and parameterised, the bar and the
  chip line and the result line are new, `DeckFilterColumn` is deleted. Moderate.
- **A new panel as well.** A tested component is discarded, and set collections' Task 9 extracts a
  colour control onto a surface that is about to be replaced. Large, and it makes the sequencing in
  brief §5 self-defeating.

I have drawn the first and can redraw nothing to switch — the panel's *appearance* is identical
either way. The decision is engineering scope, not visual, which is exactly why it should be made
before the build rather than during it.

## The dependency, sequenced ahead of this

**Set collections' Task 9 must land first and must land with its test rewritten.** The brief
already flags this and it is worth restating because the chassis lands on its output: the task
expects `getByRole("button")` with `aria-pressed`, and `color-pip.tsx` emits `role="switch"` with
`aria-checked` and the accessible name `Filter by R`. A verbatim extraction — which the same task
requires — fails all three assertions.

Worth noting while that test is being rewritten: `Filter by R` is a poor accessible name
independently of this round, and `chassisCopy.colour.pipAria` replaces it.

## Closed at R2

- **The wrapping control row.** R1 let row 1 wrap and listed the 768–868px two-line band as
  "not blocking, want eyes on it". Review called it what it was — the sort landing on its own line
  reads as a bug — so it is now a rule: two forms, no wrapping at any width, search the only
  shrinking child, switch at 900px set by `/collection`'s seven controls. That open item is closed
  by removal rather than by measurement.
- **Every shipped filter is inventoried** (§1b): twelve live controls across four routes, each
  mapped to one of four control types, with what changes for it. The chassis has slots, and a route
  fills them.
- **`Score against` corrected** from a trigger to its shipped inline segmented shape — and the
  correction produced the segmented type and the no-off-state rule that decides last-played too.
- **`/collection` compact drawn in full**, as the route that conforms least today, plus the
  commander sheet. The view toggle moves to the result line's trailing edge.
- **Sheet order fixed across routes, pips first.** R1's deck sheet put the pip block between two
  chip groups; its weight unbalanced the sheet.

## Still open, not blocking

### Asset delivery is unspecified and one option is bad
Five theme-independent SVGs, cacheable forever, appearing in the filter chrome of four routes plus
the set pages. Static assets, a sprite or a hotlink are all viable; **hotlinking a third party into
the chrome of four routes is the one choice Design would push back on**, because a slow or failed
fetch takes out the only carrier of a filter's identity. The frames in the canvas hotlink for
convenience and each pip sits on its own correctly-coloured ground, which is also the fallback I
would ship.

### Three pip hexes are assumed
`W` = `#F8F6D8` and `WU`'s blue half = `#C1D7E9` are quoted in the brief. `B`, `R` and `G` are the
canonical values and are not quoted anywhere I could read; the table assumes `#CBC2BF`, `#F9AA8F`,
`#9BD3AE`. Confirm on first fetch. The floor has 6.5 points of headroom over 3:1, so this is a
provenance note rather than a risk.

### Hybrid pips are specified but not exercised
§4's reasoning turns on two-tone hybrids, and the colour *filter* only ever draws the five
mono symbols — so nothing in this handoff actually renders one. The rule (never mask, never tint)
is what protects them, and `cost-pips.tsx` is where they will land. That file is out of scope by
the brief's own ruling, and the pips here are drawn so the two can converge without a redraw.

## Not blocking, but I want eyes on it

**The 900px switch is a judgement, not a measurement.** The arithmetic says `/collection` cannot be
honest in the wide form below 887px, and 900 is that plus a margin. But it means a small laptop in a
half-width window gets the phone treatment on a pointer device, where a 44px target row and a bottom
sheet are both slightly wrong. The alternative — a per-route switch — makes the breakpoint a
per-route fact and the chassis stops being one thing. I would ship 900 and watch it.

**Chip-line length at `/collection`.** Five dimensions of chips plus `Clear all filters` on one
line is drawn at two active. At five it wraps, and the result line follows it down. Acceptable, and
the only place the chassis legitimately changes height — but a reader with everything on sees a
three-row chip block, and the collection bar is also sticky.

**`Printed in` on `/discover` is honest but may be surprising.** Under option (1) the control
matches printings the player does not own — which on the lane of commanders they do not own is
exactly right, and the panel's `hint` says so. But a set filter that does not narrow to your
collection is the opposite of what `/collection`'s `Set ▾` does one route away, and the two
controls are adjacent in the nav. The naming carries it; I would watch it in the first build.

**The empty state's promise needs a query that can make it.** `bodyOneFix` promises the row count
that dropping one control returns, which means computing the result set with each active filter
individually removed. The commander lanes already do this. On `/collection` at 2,472 cards × five
dimensions it is five extra passes over an in-memory list — cheap, but it is not free and it is not
currently written.

## Dependencies

- **Set collections Task 9** — the extracted colour control this treatment lands on.
- **`printings.setCode` reachable from the commander lane** — the `Printed in` dimension, option
  (1). No printing-aware row rendering needed, which is the point of choosing (1).
- **`ui/filter-panel.tsx`** — mounted and parameterised, not forked, pending the decision above.
- **`result-line.tsx`** — moved up, not rewritten.
- **`lib/decks/filter.ts`, `lib/collection/browse.ts`** — the filter state the chassis reads. No
  new shapes except `printedIn: string[]` on the lane params.

## What I would cut to ship sooner

**`Printed in`.** It is the only dimension this round adds, the only one with an open data question
behind it, and the only one that can ship in a second pass without the frame changing — the chassis
holds four dimensions or five identically, which §2 draws deliberately. Cutting it leaves the
consistency win (one frame, one pip, one result line, one clear vocabulary, 262px back to deck art)
entirely intact, and it is the single largest de-risking available.

I would **not** cut the pip. It is the most visible half of the round, it fixes a measured
accessibility failure, and set collections' Task 9 is extracting the control it lands on this week
either way.
