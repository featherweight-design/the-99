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
`hard` — `availabilityState` in `src/lib/decks/availability.ts:114`. Building around either means
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
| `marker.hardIn(deck)` | `none free — in HD Tune - Sultai Arisen` | `src/lib/copy/availability.ts:60` |
| `marker.tileInUse(deck)` | `in use — HD Tune - Sultai Arisen` | `src/lib/copy/availability.ts:97` |
| `marker.hard` / `marker.soft` | count-only forms, no proper noun | the `/collection` ruling above |

(Two modules share the name — `src/lib/copy/availability.ts` holds the strings,
`src/lib/decks/availability.ts` the states. Every citation in this brief is full-path for that
reason. The `none free` / `also in` wording is **ratified and locked** by #43's R5 readiness, so
choosing different words for these surfaces is a decision to take deliberately, not a blank page.)

**The hero has room and the row may not.** A split answer is legitimate: name the deck on the
commander page, mark the row without naming. Design should say which, rather than eng picking by
what fits.

---

## §4 Four states, not one

The row and the hero each need to say one of:

- **Sleeved** — committed claims match the owned copies EXACTLY, so `free === 0` and the state is
  `hard` (`availabilityState` tests `over` first, so anything past exact lands there instead). Meren
  and Kotis today, where that is one copy in one deck, but the condition is no free supply rather
  than one copy: three copies across three committed decks read the same, and a brew may want one
  too. Strongest form: building means taking the card out of a finished deck.
- **Wanted by a brew** — a copy is free to build with, and an uncommitted list also names one
  (`soft`). Weaker than sleeved, because a brew is a list rather than a stack of sleeves and the
  player can build today. Note this does NOT mean no copy is sleeved: with two copies, one sleeved
  and one wanted by a brew, the state is still `soft` — see the worked example below.
- **Over-committed** — committed decks have claimed more COPIES than the player owns (`free < 0`,
  `over`, and only where `owned > 0` — the `owned <= 0` guard runs first and returns `free`, which
  keeps every marker off cards nobody owns). A quantity against a quantity, not a count of decks: one
  deck asking for four Nazgûl against three owned reaches it alone, and so do two decks each sleeving
  the only copy.
  `/collection` already draws this state. Whether it deserves its own weight on these two surfaces or simply reads as
  sleeved is question 7 below — the player's answer to both is the same act, taking the card out of a
  deck, but the over-committed case means a deck is already going short.
- **Free** — nothing to say, and the surface should say nothing. Most commanders are here, and a
  marker that renders on every row is a marker nobody reads.

**Buildability and marker state are two different questions, and this brief means the first.** Worked
through, because it is easy to misread: a player owns 2 copies, one is sleeved in a committed deck
and a brew lists the other. Off a decklist `free = owned − hard`
(`src/lib/decks/availability.ts:63`), so `free` is 1 — a brew's claim never subtracts — and
`availabilityState` (`:114`) passes the `over` and `hard` guards and returns **`soft`**. The player
can build; the card still reads as wanted by a brew, because that is worth saying on a card row. Whether the commander surfaces inherit
that partition or draw only on `free === 0` is Design's call, and it is question 6 below. The figure
that decides *can I build this* is `Availability.free`, never a deck count.

---

## §5 What the data costs, so the drawing is not free-floating

`/commanders` already loads the availability rollup — `loadCommanderRankings`
(`src/lib/commanders/rankings.ts:74`) reads it for the receipt line, scoped to the collection. The
commander's own row is in that map already. So the server work is a projection, not a query.

**The payload ceiling is worth knowing about and is NOT an argument for either treatment.** That
response is cached through `cacheForUser` under a 2 MB per-entry limit, and the module header records
that all three cached payloads were cut down to fit it. An earlier draft of this brief leaned on that
to prefer the count-only form; the arithmetic does not support it. A deck name is tens of bytes per row,
over a list whose size is the player's own commander-legal collection — nothing caps it, and the
largest in the database today is roughly 200. That is single-digit KB against a 2 MB ceiling, which
is noise at any collection this app will see. **Draw whichever
treatment is right and let eng carry the bytes.** If a future drawing wants something genuinely
large per row, measure the serialised payload first rather than reasoning from this paragraph.

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
6. Do these surfaces inherit `availabilityState`'s partition, where a card with a free copy AND a
   brew claim reads `soft`? Card rows do. On a commander row the question the reader is asking is
   narrower — *can I build this one* — and the answer to that is `free > 0` whatever a brew wants, so
   the two may legitimately diverge.
7. Does `over` get its own treatment here, or fold into the sleeved one? See §4.
