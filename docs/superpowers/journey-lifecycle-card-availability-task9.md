# Gate 5 — journey lifecycle, #43 Task 9 (`/collection`)

## The journey

`/collection` has no mutation of its own. The marker is a read of what the decks
claim, so the journey has to be driven from the deck side and observed here:

> Add a card to a deck. The card's collection row grows a marker. Take it back
> out. The row is bare again.

Driven by `scripts/probe-collection-lifecycle.mjs` against deck
`edc02a5d-…` with `Arcane Signet` (owned ×14, already claimed twice, so the
count is the thing that moves). Every mutation is undone by the pass that
follows it; the deck ends exactly where it was found.

## The four passes

| Pass | What was done | Marker | Accessible name | Row height |
|---|---|---|---|---|
| 0 · baseline | nothing | `2 in a brew` | `…, 14 copies, CLB, uncommon, 2 copies are on unfinished decks` | 49 |
| 1 · **forward** | added to the deck | `3 in a brew` | `…, 3 copies are on unfinished decks` | 49 |
| 2 · **reverse** | removed again | `2 in a brew` | back to the baseline string, byte for byte | 49 |
| 3 · **repeat** | added a second time | `3 in a brew` | `…, 3 copies…` | 49 |
| 4a · **resume** | reloaded the same tab | `3 in a brew` | unchanged | 49 |
| 4b · **resume** | a second, independent browser session | `3 in a brew` | unchanged | 49 |
| 5 · restore | removed, leaving the deck as found | `2 in a brew` | baseline | 49 |

Reverse returns the row to a genuinely pre-action state rather than a hollow
one: the marker, the count, the accessible name and the row height are all
identical to pass 0.

## The keyed-state question

Gate 5's repeat pass exists to find state stored under a key that outlives the
thing it describes. There is none to find here, and that is worth stating
rather than assuming:

- The marker holds **no** component state, no `localStorage`, no dismissal, no
  "seen" flag and no one-time banner. `AvailabilityMarker` is a pure function of
  the `Availability` it is handed.
- `/collection` is a server component. `loadAvailability` runs in the page's
  `Promise.all` on every request and is flattened onto the cards there, so there
  is no client cache to go stale and nothing keyed by anything.

That is why 4a and 4b agree with 3 without any invalidation step: both are a
fresh server render.

## Mutation feedback

The sub-check does not apply on this surface. `/collection` exposes no mutation
in Task 9 — no button on the page changes availability — so there is no
click-to-visible-change gap to time here. The deck-side mutations that *do*
drive this journey are the Add panel's and the decklist row's, both of which
carry their own optimistic paths and were gated in Tasks 4 and 7.

## Walked on staging?

Not needed: every pass above was fully exercisable locally against the real
database, including the second-session resume.
