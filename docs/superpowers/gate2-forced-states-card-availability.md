# Gate 2 — forced-state runtime exercise, card availability (#43, Task 4)

Driven with `scripts/probe-availability-ui.mjs` against local dev, signed in as the
audit user, at **390×844** and **1300×900**. Every figure below was read off the
running app: drawn text, the colour it resolved to after the cascade, and the
sentence assistive tech would get.

## How the states were forced

Real figures on a dev account cannot reach `hard` or `over`: both need a second
*finished* deck (≥ `MATURE_DECK_SIZE` cards) competing for a copy the player owns
once, and the accounts on `local-dev` hold only 2–3 card decks. Seeding a rival
finished deck would mutate a shared branch to prove a rendering claim, so the
states were forced at the seam instead — `loadAvailability` was temporarily made
to bucket every oracle id by hash across the four states plus silence. **That stub
is not in the diff**; the query file is byte-identical to `main`.

The probe deck (`Avail gate 2`, 14 cards + 2 unresolved lines) was seeded additively
for the audit account and touches nothing pre-existing.

## What was forced, and what was seen

| Surface | State forced | Drawn | Colour | Spoken |
|---|---|---|---|---|
| Decklist row | soft | `2 in a brew` | `rgb(198,183,154)` brass | `2 copies are on unfinished decks` |
| Decklist row | over | `short 1 — 2 decks want it` | `rgb(233,145,122)` over-fg | (over prose) |
| Decklist row | hard | *nothing* | — | — |
| Decklist row | free | *nothing* | — | — |
| Search row (quick-add + expander, shared component) | hard | `0 free — in use, …` | `rgb(232,206,147)` hard-fg | via `role="option"` label |
| Search row | soft | `2 in a brew` | brass | via option label |
| Search row | over | `short 1 — 2 decks want it` | over-fg | via option label |
| Search row | free | *nothing* | — | — |
| Consider tile | hard | chip `0 free` + caption `in use — Atraxa` | caption `rgb(232,206,147)` | `no free copies` |
| Consider tile | over | chip `short 1` + caption `2 decks want it` | caption `rgb(233,145,122)` | `you own 1 too few` |
| Consider tile | soft | chip `2 in a brew`, no caption | brass | `2 copies are on unfinished decks` |
| Consider tile | free | *nothing* | — | — |

Identical at both viewports apart from the decklist marker's size step, which is
the intended `text-[11px] md:text-[11.5px]`.

## The three things this gate was run to check

1. **Hard is silent on the decklist, and only there.** `selfExcluded` is set
   unconditionally on that surface, so `free === 0` means "enough for everyone"
   rather than "spoken for". The probe confirms hard draws nothing on a decklist
   row while drawing on all three other surfaces. This is design 5.6, not a miss.
2. **The over caption is not the hard caption.** The chip is count-only at tile
   density, so the caption is the only thing separating "in use somewhere else"
   from "two lists want your one copy". Forced side by side, they resolve to two
   different colours: `rgb(233,145,122)` vs `rgb(232,206,147)`.
3. **The drawn label is hidden where the sentence is spoken.** Every marker on a
   `spoken` surface reported `aria-hidden`, with the prose alongside as `sr-only`,
   so `0 free` is never read literally and never read twice.

## Observed under real option labels

The expander's `role="option"` names carry the self-exclusion split correctly:

- not this deck's card → `…no free copies; this one is on your Atraxa list`
- this deck's own claim dropped by the query → `…2 of your finished lists include
  this card and you own 1 too few`

## What the probe missed

The probe collected marker *text*, so it read the search row's free state as
"nothing" when the row was in fact drawing a bare ` · ` separator with no marker
after it. Copilot caught it by reading the code. The lesson is that a text-matching
probe cannot see punctuation the marker leaves behind: the free state's assertion
has to be about the whole cell, not about the absence of a match.

## Not exercised locally

Nothing. All four states plus silence were reached on all four mount sites.
