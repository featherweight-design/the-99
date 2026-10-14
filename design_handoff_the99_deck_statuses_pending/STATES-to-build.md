> **SUPERSEDED 2026-09-19 by R6** — `README-r6.md` in this folder. `To build` sat below `To buy`
> in the cascade, so it could only ever fire on a deck where every card was already owned — it
> could never reach a deck with cards left to buy, which is the deck it was written for. The phase
> now tests FIRST, as **`Draft`** (any cards, never committed), with **`New`** for the 0-card
> state. Kept as the record.

# `To build` — states, per surface

`design/design_handoff_the99_deck_statuses_pending/` · R5

*The seventh value. A deck at its body size, every line resolved, every card funded, and **no
committed version**. Drawn as `--fg` at 18% into `--bg`, label `--fg`, one opaque
`1px solid var(--border-strong)` hairline — the flat rule, not a text-colour exception.*

**This file supersedes `STATES-pending-mark.md` in full.** Both marks it describes are retired:
there is no hollow plate, no 2px edge, no 50% bar opacity, and no `DeckStateMarks`.

The condition, once: `built === bodySize && unresolvedCount === 0 && covered === built &&
unfunded === 0 && lastCommittedAt === null`. Equivalently: **everything `Complete` requires, plus
no v1.**

---

## A · The deck tile (`/decks`)

| # | State | Pill | Bar | Detail row |
|---|---|---|---|---|
| 1 | **To build** | `To build` | `--fg`, full, **no opacity change** | `all owned` — the figure that explains why this is not `To buy` |
| 2 | **To build, with proxies** | `To build` | full | `all owned` — a printed card is covered and funded, so it reaches this value exactly as it reaches `Complete` |
| 3 | **To build, pair deck** | `To build` | full at 98 | unchanged; `deckBodySize()` decides the ceiling as it already does |
| 4 | First commit lands | → `Complete` | unchanged | → last played, or nothing |
| 5 | A card is cut from a `To build` deck | → `Building` | proportional | its own figure |
| 6 | A card is swapped for one not owned | → `To buy` | full | `1 to buy · $4.20` |
| 7 | An unresolved line is added | → `Unresolved` | full | `1 line unresolved` |
| 8 | Committed deck, all owned | `Complete` | full | unchanged — **`To build` is unreachable once v1 exists** |
| 9 | Committed deck, edited since v1 | its count-based value | unchanged | `1 change since v1` — ruling 4, **no mark** |
| 10 | Never-committed deck below the body size | `Building` or `Draft` | as shipped | as shipped — the phase shows only at a full, owned list |
| 11 | Phone, 189px cell | `To build` at 73.5px — 13.8px narrower than `Unresolved`, which this footer already carries | unchanged | unchanged |

**Measured in the rendered page** at 10.5px mono with IBM Plex Mono loaded: `To build` is a
**73.5px** box (50.4px text advance + 16px padding + 2px border + 0.63px letter-spacing) against
`Unresolved`'s **87.3px**. The wider of the two is already carried in this footer at this width, so
nothing collapses and there is no collapsed form to define.

## B · Home · the resume row

| # | State | What the row shows |
|---|---|---|
| 12 | **To build** | the 19px pill, the commander's name, `99 / 99`. Identical in structure to any other value. |
| 13 | **To build, pair deck** | both names, then `98 / 98`; the names give as they already do |
| 14 | Committed deck, edited since v1 | unchanged from shipped — the stamp reads `edited 2h ago`, which is the fact |

No width question arises: the pill is one pill, at one height, as it has always been.

## C · The deck page spines

| # | State | Desktop head | Mobile meta row |
|---|---|---|---|
| 15 | **To build** | `To build` beside the pips, with the existing `Commit as v1` offer at the end of the row | `To build` beside the pips; `flex-nowrap`, `labelAtPx = 115` untouched |
| 16 | **To build, on the wash** | — | the plate is `color-mix(… var(--fg) 18%, var(--bg))` — **opaque**, per the art-wash amendment, like every other status |
| 17 | After `Commit as v1` | → `Complete`, offer replaced by the version line | same |

The mobile spine is the one surface R4 had to argue about. This round does not have to: the plate
obeys the same rule as the other six because it *is* the same rule.

## D · The filter column (`/decks`)

| # | State | What the column shows |
|---|---|---|
| 18 | At rest | **seven** Status rows, `To build` between `To buy` and `Complete`; header reads `7 of 7` |
| 19 | `To build` ticked | the grid filters to full, owned, uncommitted decks; `?status=to-build` |
| 20 | `Deck state` at rest | two rows — `No version yet`, `Edited since last version` |
| 21 | `No version yet` ticked | every never-committed deck at **any** count — broader than the status, which is why the label changed |
| 22 | Both `To build` and `No version yet` ticked | ANDed across headings, as every facet already is; returns the `To build` set |
| 23 | Phone sheet | seven rows in the sheet's 44px geometry; the trigger badge counts values, unchanged |
| 24 | A saved `?state=uncommitted,pending` link | **works unchanged** — the params did not move, only the labels |

`STATUS_ORDER` gains one member; `activeFilterCount` and the serialisation are untouched in shape.

---

## The rules this matrix is generated from

1. **One pill, one question: what stands between this deck and a table.** Seven answers now, and
   `To build` is the last one before nothing does.
2. **It is unreachable once v1 exists.** The phase is not a sub-state of `Complete` and cannot
   return; a committed deck that is cut and refilled is `Complete` again, not `To build`.
3. **No mark, anywhere, for anything.** Every fact this vocabulary carries is a word in a pill or a
   figure in a detail row. Nothing in the deck list signals without a label.
4. **The treatment is the flat rule.** One token, 18%, the token as label, one opaque hairline —
   the same sentence as `Over`, `Unresolved`, `To buy` and `Complete`.
5. **The detail row explains the status, as it always has.** `all owned` is what a reader needs
   beside this word, because the question it answers is *why is this not `To buy`*.
