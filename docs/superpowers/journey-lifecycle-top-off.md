# Journey lifecycle — top off the last 31 (#360, #361, #359)

epic-run Gate 5. The gate's four passes — forward, reverse, repeat, resume — run against
the briefing's eighteen-step walk script, driven end to end in a real browser at 1280 and
again at 390, with the mutation-feedback sub-check riding along on the commit and on each
undo.

The walk is a committed script, not a transcript of a session: `scripts/probe-top-off-journey.mjs`.
Re-run it with

```
PROBE_BASE=http://localhost:3023 PROBE_DECK=<deck-id> node scripts/probe-top-off-journey.mjs
```

77 checks, 0 findings, both widths.

## Run against a production build, deliberately

The recorded run is against `next start`, not `next dev`. `next dev` turns React Strict Mode
on, and Strict Mode's double-invoke burns the mount guard in `top-off-list.tsx` that keeps the
selection's settle announcement from speaking on the first render. Under `next dev` the
opening announcement is replaced ~600ms later by `31 of 31 slots ticked.`; under `next start`
it survives for the life of the open list. `next.config.ts` sets no `reactStrictMode`, so it
defaults on in dev and off in a build.

This was the walk's one candidate finding and it is a dev-only artifact. Evidence, same
fixture, same 390px viewport, reading every `aria-live` region on the page:

| t | `next dev` (3022) | `next start` (3023) |
|---|---|---|
| 200ms | `167 candidates for 31 slots. 31 already ticked. Quick-add hidden…` | same |
| 700ms | `31 of 31 slots ticked.` | `167 candidates for 31 slots. 31 already ticked. Quick-add hidden…` |
| 1500ms | `31 of 31 slots ticked.` | unchanged |
| 3000ms | `31 of 31 slots ticked.` | unchanged |

No code change. A guard that a production build honours is not a defect, and rewriting it to
also survive Strict Mode's double-invoke would be writing for the dev server rather than for
the reader.

## Pass 1 — forward (steps 1–5)

| Step | Claim | Desktop | Phone |
|---|---|---|---|
| 1 | The strip offers one door and no fill CTA | 1 door | 1 door |
| 1 | Both shipped CTAs are gone (#361) | 0 found | 0 found |
| 2 | The list opens in place with owned rows ticked | 31 of 167 | 31 of 167 |
| 2 | Opening announces both counts | ✓ | ✓ |
| 3 | Two unticks take the commit's count down by two | `Add 31 … 99 of 99` → `Add 29 … 97 of 99` | same |
| 3 | Ticking back takes it up again, capped at the open slots | → `Add 31 … 99 of 99` | same |
| 4 | The cap goes the remaining boxes inert | 136 inert | 136 inert |
| 4 | The cap hides no row | 167 of 167 | 167 of 167 |
| 4 | The cap line states the figure | ✓ | ✓ |
| 5 | One POST for the whole commit | 1 | 1 |
| 5 | The deck grows by the ticked count | 68 → 99 | 68 → 99 |
| 5 | The list closes only on a settled commit | ✓ | ✓ |

The count is read in two halves on purpose. Ticking back to the cap lands on the figure it
started from, so a single before/after read would call a working control inert.

## Pass 2 — reverse (steps 6–8)

Every commit the journey makes is undone through the ledger, and the deck returns to a
genuinely pre-action state rather than a hollow one: 99 → 68, the pass's line goes with it,
and the undo announces the settled size (`31 cards put back. 68 of 99.`) rather than the count
it removed.

The mark is a mark, not a filter: it lands on the pass's 31 rows, hides nothing (0 rows
filtered), scrolls nothing, is announced, and is cleared by the same control that set it.

## Pass 3 — repeat (steps 9–13)

The keyed-state pass, and the one the gate exists for.

- A second pass gets its own line rather than amending the first.
- **Top-off ordinals are per kind and stable.** A deck's first top-off is `top-off 1` beneath
  `the seed`, and undoing `top-off 1` does not renumber `top-off 2`. The walk asserts this
  directly, because an ordinal derived from position in the list would renumber and the undo
  button's accessible name would then point at a different pass than the one it undoes.
- A card kept out of a pass survives that pass's undo, and the line re-reads with what became
  of it.
- A third pass placing a card an earlier pass placed gets a fresh line: provenance is recorded
  per pass, never per card.
- `Keep all` empties the ledger and takes the sweep with it, in one act.

## Pass 4 — resume (steps 14–16)

- A reload closes the list and drops the scratch ticks, and the deck is unchanged by the
  abandoned selection. Scratch state is scratch state.
- The ledger is server state and survives a reload byte-identical.
- A commit made in a second session is there on the first session's reload. Two tabs agree.

## Mutation-feedback sub-check

Run with the mutation's POST held open for 3.5s, because a fast local machine hides this bug
completely. The builder is server-rendered, so a mutation with no optimistic path reads as a
dead button.

| Mutation | Desktop | Phone |
|---|---|---|
| Commit | 36ms to visible feedback | 39ms |
| Pass undo | 27ms | 29ms |

Both are in-flight labels on the control itself (`Sleeving 31 cards…`, `Putting 31 back…`),
which is a state the server's answer replaces rather than an optimistic value the client has
to walk back.

## Phone layout (steps 17–18)

- The quick-add dock collapses to its one-line notice while the list is open rather than
  vanishing, and `Close the list` restores it.
- One scroll surface: 0 inner scrollers at 390px.

## What this walk does not cover

- `slotsStayOpen` is `hidden md:block`, so the assurance that stopping short is safe never
  reaches a 390px player. Design records the phone placement as unplaced, not resolved, and it
  is carried to close-out rather than eng-picked here.
- `ledger.passRecountedAllKept` has no reachable render site: a pass whose every card was kept
  has no live cards and is dropped from the ledger before the line is drawn. Design's table
  calls it "the sentence just before the line goes", which the drop rule never gives it a frame
  for. Reported, not deleted — it is Design's string.
