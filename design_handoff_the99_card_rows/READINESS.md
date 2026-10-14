# READINESS — Card line item parity (R1)

**Self-assessed: 🟢 Green, with one dependency and one thing for eng to confirm.** All four
questions are called, nothing is blocked on a design decision, and no redraw is pending. The
handoff is mostly deletion: one atom retires, one hand-rolled pair retires, three radii become one.

## Read from source, not inferred

Unlike the deck-tuning handoff, **the spec was readable**: the brief, all six row components,
`ui/ownership-dot.tsx`, `ui/availability-marker.tsx` and `commanders/availability-dot.tsx` were read
from the repo at `main`. Every geometry figure in these documents is quoted from the component that
ships it. Local `src/` in this project holds only `components/shell/nav.tsx`, so nothing is traced
from a project file. **Where a component and this handoff disagree, the component wins** and the
tables in `README.md` are what to correct.

## The four calls, all called

| # | Question | Called |
|---|---|---|
| 1 | Is there a floor, and how far does it reach? | **Name + one availability slot, both widths, every row with an oracle id.** `unresolved-row` exempt by data. |
| 2 | Do mana pips generalise? | **No — and there are two affordances, not one.** Identity stays on `/collection`, cost stays on the search row. |
| 3 | Which dot is correct? | **The shared one, dashed for unowned.** Committed joins it as an opt-in third state; the private module retires. |
| 4 | Canonical metrics? | **44/34, radius 7 both widths, gap 9/10, pad 8–4 / 9.** 52px phone with a meta line is the one named exception. |

## The one dependency

**`synergy-row`'s availability slot is slice B, and it is blocked on a data path that does not
exist.** The commander detail route reads no decks —
`design_handoff_the99_commander_explained` established this at R1 (`page.tsx:36-40` is the role-list
exclusion pass, not a commitment read) and raised the aggregate as slice B there. This handoff does
not re-raise it; it splits the row the same way:

- **Slice A, shippable now:** the dot merge (dashed unowned, three states, `availability-dot.tsx`
  deletes, `LegendPip` moves) and the shell (radius 8 → 7).
- **Slice B, with the aggregate:** the availability slot, joining the phone meta line as a third
  run and sitting between the inclusion figure and the toggle on desktop.

**Do not ship a guessed over state from `committedTo`.** That field is a single deck name;
over-committed is arithmetic across every finished list. The committed dot is true and incomplete,
which is the right thing to draw in the meantime.

## The one thing for eng to confirm

**The shape of the dot's third state is eng's call, not Design's.** Design specifies *three states,
dashed unowned, committed filled at `--avail-hard-fg`, and no existing caller needing an edit*.
Whether that is `state?: "owned" | "committed" | "unowned"` beside the existing `owned: boolean`, or
a `committed?: boolean` flag, is an API question. Either satisfies the ruling. The constraint that
matters: **a caller without the aggregate keeps passing `owned` alone and gets two states.**

## Called, not asked — flagged for the record

1. **The floor is a slot contract, not a component.** One slot holding exactly one of `BuyTag` or
   `AvailabilityMarker`. Never zero on a row with an oracle id; never two, except the Shopping
   second-copy case where both facts are true and different. A `CardRow` component taking a
   six-value `variant` prop is refused — that is a switch statement in a costume.
2. **`unresolved-row` is exempt by data, not by density.** No oracle id, no card, nothing whose
   availability could be stated. The brief's browsing/utility split is a good question about the
   floor and a bad basis for metrics. `DiffRowUnnamed` is exempt with it, for the same reason.
3. **Two rows get no dot, deliberately.** `rows-view` says `×1` in `--accent` (a count beats a
   gesture); `card-search-row` says `×1 owned` / `not owned` in words (never colour alone). A dot
   beside a word saying the same thing is a second voice for one fact.
4. **The over-committed tint is an inset ring on every row, never a border.** `decklist-row`'s
   reason generalises: a border adds 2px to one row and shunts every row below it. `rows-view`
   changes.
5. **Radius 7 at both widths.** 6 vs 7 is invisible at 375px and a responsive radius is a token
   nobody can hold. The three rows at radius 8 are the three tallest — drift, not intent.
6. **Mana pips: two affordances, neither generalising.** Correcting the brief's table —
   `card-search-row.tsx:5` already draws `CostPips` in a fixed 34px slot. Identity pips on a
   decklist would be 54px spent to restate a constraint the format makes unbreakable.
7. **The count-only marker stands.** #354 is not reopened; claiming decks are named in the card
   modal's allocation receipt.
8. **Every phone addition names what it displaced.** The count-only marker is ≈50px, which is the
   whole budget at 375px. The ledger is in `FLOOR-what-every-card-row-carries.md` and on the canvas
   under the two rows that change.
9. **Two of twenty-four state cells are impossible by construction** and are drawn as such, not
   left blank. `/collection` lists what you own: no unowned row, no `BuyTag`, ever.
10. **No new token, no new hex, no new component, no new motion.** The one net-new export is a third
    state on a dot that already has two.

## The engineering list, in dependency order

| # | Change | Kind | Blocked |
|---|---|---|---|
| 1 | `ui/ownership-dot.tsx` gains a third state; `LegendPip` moves in | additive | no |
| 2 | `commanders/availability-dot.tsx` deletes; callers repoint | deletion | after 1 |
| 3 | `synergy-row.tsx` slice A — dot swap, radius 8 → 7 | swap | after 1 |
| 4 | `update-diff-row.tsx` — `OwnedDot` and the `buy` pill delete; shared dot + `BuyTag` + marker | swap + **one data change** | after 1 |
| 5 | `DiffRowCard` gains `availability`; the diff query joins the rollup | data | ships with 4 |
| 6 | `rows-view.tsx` — radius 8 → 7, over `border` → inset ring | swap | no |
| 7 | `unresolved-row.tsx` — radius 6/7 → 7 | swap | no |
| 8 | Shell metrics exported once (flex + grid) rather than six hand-typed copies | refactor | after 3–7 |
| 9 | `synergy-row.tsx` slice B — the availability slot | additive | **the commander-route aggregate** |

**Item 5 is the only data change in the handoff.** Everything else is a component swap, a deletion,
or a number.

## Not blocking

- **Contrast.** Every label on every row is full-opacity ink. `--avail-hard-fg` (#D9975C) and
  `--avail-over-fg` (#C46857) are the lifted foregrounds the availability work already ratified for
  row density; the dot's fill colours are decorative and carry an accessible name in words.
  `--fg-locked` appears only on figures that are repeated in an accessible name.
- **Legibility floors held.** 12.5px body ink, 9.5px mono, 8.5px only where it already ships (the
  collection row's marker). Nothing shrank to make room for the diff row's marker — the name yields
  width instead.
- **Tap targets held.** 44px phone on every control; 34px desktop on the toggle and `✕`; the
  marker is not and never becomes a target.
- **Zero net motion.** No transition on any shell, dot or marker. Nothing added needs one.
- **Copy.** Three new strings, all accessible names for the dot's third state, all in
  `card-rows · copy strings.ts`. **No new visible text on any row.** Everything else is a reuse
  manifest citing the module that owns it.
- **Six themes.** The handoff introduces no colour. The dot's three fills and the marker's three
  glyph colours are existing tokens, and the legend renders the dot rather than naming its hue —
  which is exactly why it survives the merge unchanged.
