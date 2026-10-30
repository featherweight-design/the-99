> **SUPERSEDED 2026-09-19 by R5** — `README-r5.md` and `STATES-to-build.md` in this folder.
> Both deck-state marks described below (the hollow plate, the 2px `--fg` edge) shipped on
> 2026-09-18 and were retired the next day: they were the only wordless signals in the deck list,
> and the plate measured ~39 near-neutral units against `Building`. The state they signalled is now
> a seventh status value, **`To build`**. Kept as the record of what was decided and why.

# The deck-state marks — states, per surface

*R4. TWO marks, two axes, one box. The **plate** says whether the deck has a v1 at all (tinted = a
deck, `--bg` = a plan); the **2px `--fg` left rule** says a deck with a v1 differs from it. They are
mutually exclusive by definition — a plan has no version to differ from.*

## 0 · The phase (no v1) — the primary mark

| # | State | Pill | Bar | Detail row |
|---|---|---|---|---|
| A | **A plan, any of the six values** | the word and ink unchanged; plate takes `--bg`, no status tint | status colour at 50% opacity | its ordinary count figure — `31 to buy · $284.10` is the reason you opened it |
| B | A plan, Building, dashed | dash kept, plate `--bg` | as above | as shipped |
| C | **First commit lands** | plate gains its tint | full opacity | unchanged |
| D | A plan on the deck page | as above, plus the phase **in words** beside `Commit as v1` — the one surface with no grid to teach the plate by contrast | — | — |
| E | A plan on the mobile spine (on the wash) | plate is `--bg`, **fully opaque** — hollow is not transparent, per the art-wash amendment | — | — |



Labels are Title case, per `refreshCopy.status`. `--accent` was R2's colour for the rule and is
withdrawn: `To buy`'s own token is `--accent`, so the mark collided with that pill by construction
in all six themes.

## Sections A–D below are the SECONDARY mark (pending changes) — every state in them presumes a
## committed v1, because the mark requires one.

State numbers are **section-scoped**. The deck throughout is HD Tune — Mutant Menace, `v2`
committed, thirty-six changes in the draft.

**The condition, once:** a committed version exists **and** the draft differs from it. Both halves
are required — decision 3.

---

## A · The deck card (`/decks`)

The mark is a **2px `--fg` left rule on the pill** — one chip, 2px, nothing displaced. The
detail row carries the words.

| # | State | Pill | Detail row |
|---|---|---|---|
| 1 | Complete, clean | `complete` | last played only |
| 2 | **Complete, pending** | `Complete` + rule | `36 changes since v2`, `--accent` |
| 3 | **Over, pending** | `over` + rule | `36 changes since v2` — the change figure outranks `2 over`, which is mid-swap transience |
| 4 | **Unresolved, pending** | `unresolved` + rule | `2 lines unresolved` — **the one exception**; an unnamed line is not a consequence of editing |
| 5 | **To buy, pending** | `to buy` + rule | the change figure; the roll-up figure yields |
| 6 | **Building, pending** | `building` (dashed) + rule | the change figure. The commonest draft there is: cut three before adding three |
| 7 | **Draft, pending** | `draft` + rule | the change figure. Reachable only by cutting a committed deck to nothing, and the state where the pill lies loudest |
| 8 | Building or Draft, no version | as shipped, no rule | as shipped |
| 9 | Pending with a proxy count | as above | the change figure — it outranks the proxy fallback |
| 10 | Any width, any cell | **unchanged** — 2px is affordable at 189px as at 456px | unchanged |

Building's dashed hairline and the `--fg` rule meet on one box and read as two facts: a line *style*
against a line *weight*. No value loses its own edge.

## B · Home · the resume row

| # | State | What the row shows |
|---|---|---|
| 11 | **Pending** | the 19px pill with the rule, then the commander's name, then `99 / 99`. **Nothing shrinks** — the mark costs 2px. |
| 12 | **Pending, with a to-buy clause** | the clause stays. R1's drop is withdrawn with the second box that caused it. |
| 13 | **Pending, pair deck** | unchanged from shipped in every respect but the 2px edge. |
| 14 | No version | no rule. Byte-identical to today. |

**No figure on this row, and it needs none**: the stamp on its first line already reads
`edited 2h ago` — `touchedBy` returns the edit as the winning act for exactly the decks this mark
is about. The edge says *not committed*; the stamp says *when*.

## C · The deck page spine

| # | State | Desktop head | Mobile meta row |
|---|---|---|---|
| 15 | **Pending** | the rule on the chip | the rule on the chip — 2px of a `flex-nowrap` row, so nothing wraps and `labelAtPx=115` is untouched |
| 16 | Pending, five-colour pair | unchanged; no name loses a character | same |
| 17 | Clean, committed | no mark; `v2 · committed 10 Sep` alone | no mark |
| 18 | Brew | no mark, no version line, `Commit as v1` where offered | same |

On this page the **banner below states the changes in full**, so the mark here is a reminder in the
identity band rather than the message. It is not a second announcement: the band is not a live
region and the banner is already there on load.

## D · The filter facet (`/decks`)

The heading is **`Deck state`** with two rows — `Not committed yet` (the phase) and
`Has pending changes` (the diff). Mutually exclusive, so ticking both returns every unsettled deck.
`?state=uncommitted,pending`.

| # | State | What the column shows |
|---|---|---|
| 19 | At rest | `Deck state` heading in `--fg-faint`, two unticked rows |
| 20 | **Ticked** | heading in `--accent`, box filled; grid re-filters immediately — no Apply |
| 21 | Ticked with statuses | ANDed across headings: `Complete` + pending returns finished decks mid-edit |
| 22 | Ticked, no deck matches | the shipped filtered empty, with `Clear filters` only |
| 23 | Phone sheet | the same heading and the same row, in the sheet's 44px geometry; the trigger badge counts it as one value |
| 24 | Hand-typed `?pending=x` | ignored, as `readList` ignores an unknown status. `pending=1` is the only truthy form written |

Status keeps `6 of 6`. The new heading carries **no count**, as no filter row in this column does.

---

## The rules this matrix is generated from

1. **One pill, one axis.** The pill answers the count question and nothing else. The mark answers
   whether the list is the version. Neither is ever suppressed for the other.
2. **The edge requires a version; the hollow plate requires the absence of one.** No deck shows
   both, and the exclusion is definitional rather than a rule anybody has to remember. All six
   values can carry either.
3. **The change figure owns the detail row while a draft is open** — the count figures beside it are
   mid-swap transience. `Unresolved` is the sole exception: an unnamed line is not a consequence of
   editing.
4. **The mark takes no width at all.** It is 2px on a box that is already drawn, at every value and
   every width, so no name, figure or bar gives anything up and there is no collapsed form.
5. **Colour is a fill-and-label pair; this is an edge** — and it is `--fg`, the one ink that is not
   a status token, so it cannot collide with a value in any theme. The vocabulary survives greyscale
   on three distinguishable edges.
6. **Nothing announces the mark.** It is present when the page loads, like the banner it echoes.
