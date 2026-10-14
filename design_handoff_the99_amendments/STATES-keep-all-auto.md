# States — Keep all auto

Amendment 6 · R1 · one control, two widths. Fixture: a filled deck at **68 / 99** — 40 untouched
`auto` rows, 28 already the player's (kept by hand or added by hand). `n` in a label is always the
untouched-auto count; `keptNote`'s `n` is always the non-auto count. Both are already computed off
the optimistic list (`builder-shell.tsx:298-299`).

## The seven states

| # | State | Keyed on | Desktop toolbar | 390px | Announced |
|---|---|---|---|---|---|
| 1 | Filled, untouched | `auto 40 · kept 0` | `Keep all 40` + `Clear all auto · 40`, no note | second row: `Keep 40` + `Clear auto · 40` | — |
| 2 | Some kept by hand | `auto 37 · kept 31` | note + both buttons, both counts recomputed | note hidden; both buttons | — |
| 3 | Keep all in flight | `keepAllPending` | keep disabled at 50%, **sweep also disabled**, tags already gone optimistically | same | on settle only |
| 4 | Keep all settled | `auto 0 · kept 68` | both buttons absent, note reads `68 cards are yours now` | note hidden, both buttons absent | `40 cards kept. 68 cards are yours now.` |
| 5 | Keep all refused | `keepAllFailed` | tags back, both buttons back, refusal inline under the cluster | same, under the second row | the refusal, via the existing mutation path |
| 6 | Sweep in flight | `sweepPending` | **keep disabled too** — the rows it would claim are being deleted | same | the sweep's own messages |
| 7 | Hand-built, never filled | `auto 0 · kept 0` | neither button, no note, **wrapper leaves entirely** rather than sitting in the flex row as an empty child | same | — |

### Notes per state

**1.** The only state where the fill's provenance paragraph, the group clauses' `· N auto` tails
and both bulk controls are all on screen at once. It is also the state the amendment exists for:
today it offers one exit and it is a deletion.

**2.** Reachable from 1 by any number of `keep ✓` clicks, and from an applied re-import, which
already clears `auto` on every card the incoming list names (`update-actions.ts:307`). A player can
sit here indefinitely; nothing pushes them out of it.

**3.** Both controls disable together. The shipped `ClearAutoButton` takes `pending` from
`sweepPending` alone, so this is the first state that needs the two flights to see each other —
the same wiring `gap-report-synergy-discovery.md` logs as missing between the last-slots strip and
the sweep. Optimistically the tags are already gone, so the list under the toolbar is state 4's
list with state 3's toolbar.

**4.** Terminal, and not reversible: there is no write that re-marks a card `auto`, deliberately.
The three receipts are the vanished tags, the vanished controls and the one announcement; the note
is the only persistent one, and it is desktop-only.

**5.** React drops the optimistic edit with no explicit revert, so the forty tags return on their
own. The refusal reads *"We couldn't keep those. They are still marked auto."* — never
*"the deck is unchanged"*, which is true here and useless.

**6.** Unchanged from what ships, plus the new control's disable. If the sweep succeeds the flow
lands in state 7 (or in `sweptEmpty` if the deck is now bare); if it is undone, back to 1.

**7.** Two ways in: a deck that was never filled, and a deck whose fill was entirely swept. Both
render an empty auto cluster, so the wrapper returns `null` rather than contributing a gap.

## What is not a state

- **A confirm step.** The label carries the count; there is nothing to confirm.
- **A receipt strip.** No rows moved. `SweepReceipt` is not extended, mirrored or restyled.
- **A partial keep.** The button is deck-wide and the count in its label is the whole set; there is
  no selection model in this toolbar and this amendment does not introduce one.
- **A per-group keep.** `Keep all in Ramp` would need a second count per group header and a second
  answer to "what does the sweep do here" — a different feature.
- **An `auto`-only filter.** Reviewing the fill's picks as a list is `Consider`'s job and the group
  clauses' `· N auto` tails.
- **A celebration.** Deck size does not change, so the 99/99 reveal cannot fire and needs no new
  suppression.
- **A degraded read.** The flag is a column on the row; there is no availability query behind it
  and therefore no outage state.
