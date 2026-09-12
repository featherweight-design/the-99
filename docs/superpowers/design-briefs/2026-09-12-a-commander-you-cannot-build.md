# Design Brief — A commander you cannot build, said before you click

**Raised:** 2026-09-12 by Hugh, from the seven-bug batch (PRs #516/#517). No ticket yet. This brief
is the source of truth a Claude Design handoff prompt should point at.

**Verified against `origin/main` at `9c325d8` on 2026-09-12.** Every `file:line` and every figure
below was read on that commit or queried against the staging branch, not recalled.

Hugh's words: *"when I look at 'Free only' and see 'Meren of Clan Nel Toth' or 'Kotis, Sibsig
Champion' I know those are both already in a deck, but the list makes it seem like I can just build
around them. Nothing on the row or the Commander details says it's already in a deck. It isn't until
I open the new 'Card details' on the Commander details page do I see that the card is already in
'HD Tune - Sultai Arisen'. We need to surface this sooner, otherwise it's misleading."*

---

## §1 What is actually true of those two commanders

Queried against the staging branch (`br-polished-pond-a6e63y0b`), both rows identical:

| Card | Helms a deck? | In a deck's 99? | Committed? |
|---|---|---|---|
| Meren of Clan Nel Toth | no | HD Tune - Sultai Arisen | yes, version 1 |
| Kotis, Sibsig Champion | no | HD Tune - Sultai Arisen | yes, version 1 |

Three facts follow, and the design turns on all three.

**They belong in the list.** The "already built this one" exclusion removes commanders that HELM a
deck (`getRankedList` via `loadBuiltCommanderIds`, both columns since #516). Neither of these does.
A commander sitting in someone else's 99 is still a commander you have never built around.

**Their only copy is sleeved.** The deck holding them has a committed version, so the claim is
`hard` — `availabilityState` in `src/lib/decks/availability.ts:97`. Building around either means
physically pulling the card out of a finished deck. That is a different kind of "unavailable" from a
brew that merely lists it (`soft`), and the app already draws that distinction everywhere else.

**Nothing on the path says so.** `/commanders` draws a row (`rec-card.tsx`) with rank, fit segments,
identity and a receipts line; the commander page draws a hero with the score and a Build button
(`detail.tsx`). Neither reads the commander's own availability. The only surface that tells the
truth is the card modal, which is two clicks away and which #517 only just made reachable at desktop
width at all.

**It is not a `Free cards only` problem.** Both lanes show these commanders and both say nothing.
The free lane makes it *feel* like a contradiction — it promises a free pool and then lists a
commander that is not free — but `All my cards` is equally silent, so a fix scoped to one lane would
leave the same hole in the other.

---

## §2 What Design is being asked for

**Hugh's ruling, 2026-09-12: the marker goes on the commander ROW and on the commander DETAIL HERO,
in both lanes.** Not the row alone — the hero is where the Build button is, which is the moment the
claim matters most. Not the hero alone — the row is where the scanning happens, and "sooner" was the
whole request.

Two treatments to draw, then:

1. **The row** (`src/components/commanders/rec-card.tsx`), at both breakpoints. This is the hard
   one, and §3 is why.
2. **The commander detail hero** (`src/components/commanders/detail.tsx`), at both breakpoints —
   phone art header and desktop right column.

---

## §3 The constraint Design should rule on first: is there room for a deck's name?

There is a precedent, and it went the other way. `src/lib/copy/availability.ts:218-222` records the
`/collection` ruling in as many words:

> COUNT-ONLY on both views. Neither the fixed row grid nor the tile caption has room for a proper
> noun, so collection reuses `marker.soft` / `marker.hard` (never `marker.hardIn` or `hardMulti`) and
> the deck name appears in card detail only. Do not "restore" the deck name here without widening a
> shipped grid.

The commander row is a similar shape — a fixed band with rank, identity pips, fit bar and a receipts
line already competing for it — so the same answer may apply, and the brief does not assume it does
not. The vocabulary already exists at both weights:

| String | Reads | Source |
|---|---|---|
| `marker.hardIn(deck)` | `none free — in HD Tune - Sultai Arisen` | `availability.ts:60` |
| `marker.tileInUse(deck)` | `in use — HD Tune - Sultai Arisen` | `availability.ts:97` |
| `marker.hard` / `marker.soft` | count-only forms, no proper noun | the `/collection` ruling above |

**The hero has room and the row may not.** A split answer is legitimate: name the deck on the
commander page, mark the row without naming. Design should say which, rather than eng picking by
what fits.

---

## §4 Three states, not one

The row and the hero each need to say one of:

- **Sleeved** — a committed deck holds the only copy (`hard`). Meren and Kotis today. Strongest
  form: building means taking the card out of a finished deck.
- **Wanted by a brew** — an uncommitted list names it (`soft`). Weaker: nothing is physically in
  sleeves, and the app has always treated a brew as a list rather than a claim.
- **Free** — nothing to say, and the surface should say nothing. Most commanders are here, and a
  marker that renders on every row is a marker nobody reads.

A player owning two copies where one is sleeved is `free` for this purpose: they can build. The
figure that decides it is `Availability.free` from the rollup, not a deck count.

---

## §5 What the data costs, so the drawing is not free-floating

`/commanders` already loads the availability rollup — `loadCommanderRankings`
(`src/lib/commanders/rankings.ts:74`) reads it for the receipt line, scoped to the collection. The
commander's own row is in that map already. So the server work is a projection, not a query.

**The payload ceiling is the real cost.** That response is cached through `cacheForUser` under a
2 MB per-entry limit, and the module header spells out that the three cached payloads were each cut
down to fit. A deck name per row is tens of bytes × up to ~200 rows; a state enum is one byte. If
Design wants the proper noun on the row, eng can carry it, but it spends headroom measured in
hundreds of KB, and that is a reason to prefer the count-only form on the row if the drawing is
otherwise a coin-toss.

**The hero is unconstrained** — the detail page already scores one commander on demand and reads
what it likes.

---

## §6 Open questions for Design

1. Row treatment: proper noun, or count-only in the `/collection` tradition?
2. Where on the row? It has no spare column; something gives, or the band grows.
3. Does the hero's marker sit with the score, or beside the Build button where the consequence is?
4. Does `Build this deck` change at all when the commander is sleeved — a note, a different label,
   or untouched? (Eng view: untouched. The app never blocks a build, and the deck page's own
   shopping list already reckons with what is missing.)
5. Is the `soft` case worth drawing at all on these two surfaces, or is only `hard` loud enough to
   deserve a row's space?
