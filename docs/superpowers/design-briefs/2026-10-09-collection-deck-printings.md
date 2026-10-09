# Deck-specific printings, sub-project 3

Design brief, 2026-10-09, for the collection home epic
(`docs/superpowers/plans/2026-10-06-collection-home-roadmap.md`, §3 and ruling 7). Engineering
and Design.

This is its own Design round (roadmap ruling 12), drawn after the sub-project 1+2 handoff
(`design/design_handoff_the99_collection_edit/`, merged in #1308) and separate from "I got it"
(`docs/superpowers/design-briefs/2026-10-09-collection-i-got-it.md`). It must stay consistent
with that handoff: its history entries, its short-deck warning (§E) and its rule that owning a
printing and showing its art are never confused.

## What this is

A deck chooses which printing of a card it uses. The choice flows into the deck's art, the price
shown for the card, import, export and Shopping. A deck that has made no choice reads as it does
today.

## Rulings carried, not reopened

- **Ruling 7.** A deck remembers which printing it means for a card, flowing into art, prices,
  import, export and Shopping.
- **Ruling 11 (Hugh, 2026-10-08).** "I got it" does not wait for this. Once this lands, a deck's
  chosen printing becomes the better default for "I got it". That is an improvement to it.
- **Ruling 12.** Own Design round. Switch: `DECK_PRINTINGS_ENABLED`. Ruling 9: no paid model
  calls, and About entries are batched at the end of the launch, so this brief asks for none.

## What exists today

- **No deck stores a printing.** Decks hold cards by card identity alone, and so do their
  committed versions. A deck's art and printed names are read from the copies the player owns
  (`src/lib/collection/owned-printings.ts`), and a card they own none of shows whatever the
  catalog resolves for it.
- **The printing picker.** `PrintingRegion` (`src/components/cards/printing-region.tsx`) lives
  in the card modal (`src/components/cards/card-modal.tsx`, opened through
  `src/components/cards/card-detail-provider.tsx`). It sets which printing's art the card shows
  everywhere, per player. It lists the printings the player owns or could own, with search and
  finish chips past a dozen entries and a dormant state for a pick no longer owned. The 1+2
  handoff gives it a "choose" role that writes no art preference, and a catalog source beside the
  owned one.
- **The price.** A deck row's price is one printing per card: in stock, real non-foil stock
  first, then cheapest (`src/lib/decks/price-query.ts`).
- **Export.** The export names the printing the player owns, when they own one
  (`src/lib/decks/export-helpers.ts`).
- **Import.** Import reads a set code off a line only to find the card's name
  (`src/lib/decks/import.ts`). The printing a list named is not kept.
- **The shop link.** The Mana Pool link carries names and quantities only
  (`src/lib/manapool/links.ts`), so a printing never reaches the shop however it is chosen.
- **A commander** is not a row in the deck's card list. Both commanders are fields on the deck.

## Relation to the printing picker

Three different things now involve a printing, and a player must never do one when they meant
another:

| Meaning | Where it lives | Writes |
|---|---|---|
| **Own it** | Your copies, in card details (1+2) | the collection |
| **Show it everywhere** | the art picker, in card details | the player's art preference |
| **This deck uses it** | new, this brief | this deck only |

- The deck choice reuses `PrintingRegion`, in its choose role, rather than building a second
  picker.
- **It writes only this deck's choice.** It never changes a quantity, the collection, or the
  player's art preference. The opposite holds as well: picking art or editing copies never
  changes a deck's choice.
- Where in card details it lives, and how the three stay unmistakable, is Design's call. The 1+2
  handoff solved the first two with two places and a mode between them. That is the precedent.

## What changes on the deck

- **Art.** A card in a deck shows the deck's chosen printing, on rows, tiles, the card view and
  the details opened from them. A card with no choice shows what it shows today.
- **Price.** The price on a card is that of the chosen printing, not the cheapest. A chosen
  printing can be sold out, or never stocked, and the row says so in the buy tag's existing
  vocabulary (`sold out`, a bare `buy`). Deck stats' money card (PR 6 of
  `docs/superpowers/plans/2026-10-08-deck-stats.md`) is written against today's cheapest-printing
  price. Pricing chosen printings there is a follow-up, not part of PR 6.
- **Export.** The export names the deck's chosen printing, falling back to what it names today.
- **Import.** A list that names a printing keeps it as the deck's choice. Which printings an
  import took, and which it could not match, is told to the player in the existing import
  summary.
- **Shopping.** The price on a Shopping row is the chosen printing's.

### What it does not change

- **Ownership.** Whether a deck is covered, short or on Shopping is still decided by card, as
  today (the write-path plan keeps the claim model and seniority untouched). A deck that chooses
  a printing the player does not own, while they own another printing of the same card, is still
  covered. Nothing goes on Shopping because of a choice. Design decides whether the deck says
  "you own a different printing".
- **The shop.** The Mana Pool link still carries names and quantities. Copy must not promise the
  shop will send the chosen printing.
- **Quantities and the collection.** A deck's choice never edits either.

### "I got it"

Once a deck has chosen a printing for a card, that choice is the preset printing for "I got it"
on that card's Shopping row, replacing the printing behind the price. The row's price is then that
printing's price too, so the two agree. A card with no choice keeps the sub-project 4 default.
"I got it" never writes a deck's choice, and the deck's choice never changes by buying.

## What changes for existing decks (user-facing effects of the migration)

- **Nothing looks different on the day it ships.** Every card in every deck starts from the
  printing it shows today, so a deck reads the same and nobody has to visit each card. No card
  starts out as "chosen" unless the player did it.
- **No deck reads as edited.** Shipping must not make any deck look changed, add any history
  line, or put a deck into a "differs from its last version" state. Older committed versions
  show the same art they show today.
- **Versions, before and after the line.** A version committed after this ships remembers the
  printing each card showed at that moment, whether the player chose it or it was the default, so
  a later purchase, art pick or deck choice never rewrites it. A version committed before this
  ships has no recorded printing and is never given a guessed one: it keeps resolving as it does
  today, and nothing is backfilled. Whether the player can tell the two kinds of version apart
  is Design's call (Open item 9). How a choice made after a commit relates to "the draft differs
  from the last version" is a ruling Hugh owes, listed below.
- **Timing.** The change lands only after Deck stats' money PR (PR 6 of
  `docs/superpowers/plans/2026-10-08-deck-stats.md`), so the money card is built against the deck
  tables as they are today. Nothing in this round draws against it.
- **Switch.** With `DECK_PRINTINGS_ENABLED` off, no choice renders or can be made, every deck
  reads as it does today, and any choice already made is kept and returns when the switch is
  turned on.

## The surfaces

Each ships at phone and desktop width in the same PR.

### A. Choosing a deck's printing

**Where:** card details opened from a deck, plus any deck surface Design decides needs a second
door (see Open).

**States to draw:** no choice (the default, saying where it comes from); a choice that is owned;
a choice the player does not own; a choice the player owns another printing of; a choice that is
sold out or never stocked; a card with a single printing (nothing to choose); a card with many
printings (the picker's overflow state); choosing; resetting to default; a failed save (nothing
changes).

### B. The deck's views

**States to draw:** rows, tiles, the card view and the Shopping row, each with a card that has a
choice and one that does not, at both widths, so a choice is visible without being noisy.

### C. Import and export

**States to draw:** an import that took printings, one that took some and could not match others,
one that carried none; the export with chosen printings and with defaults.

### D. Switch off

With `DECK_PRINTINGS_ENABLED` off, nothing renders and decks read as `main`'s. Reserve no slot.

## Locked

- A deck's choice is per card per deck, written to the deck only, never to the collection or the
  art preference.
- Reuse `PrintingRegion` in its choose role. No second picker.
- Three meanings (own it, show it everywhere, this deck uses it) stay unmistakable.
- Ownership, claims and seniority stay by card. A choice never creates a buy.
- A deck with no choice reads exactly as today. Shipping changes no deck's look and writes no
  history.
- The deck's choice becomes "I got it"'s preset printing, and "I got it" never writes it.
- Art, price, export, import and Shopping follow the choice. The shop link does not and must not
  claim to.
- The migration waits for Deck stats' money PR (PR 6).
- Phone and desktop in the same PR. No new tokens, no new dependencies.
- Copy in this brief describes intent only. Strings go through `/copy-review`.

## Needs Hugh's ruling (not Design's call)

1. **Is a printing-only change a deck edit?** If it counts, choosing a printing makes the draft
   differ from its last version and can stale the deck's standing analysis. If it does not,
   it is cosmetic, like a proxy mark, and is carried into the next commit. Design draws
   whichever is ruled. Recommended: cosmetic.
2. **Is the commander in scope?** Commanders are fields on the deck, not card rows, and the
   commander's art is prominent. Ruling 7 says "a card". Recommended: in scope.
3. **One printing per card per deck.** That means a deck cannot show three different Forests.
   Confirm it is acceptable, or ask for per-copy choice.
4. **Confirm ownership stays by card.** Read from the write-path plan, not ruled for this
   feature: a choice never creates a buy.

## Open for Design to call

1. Where choosing lives in card details, and how it keeps from the other two printing meanings.
2. Whether the deck's own views offer a second door (a row or tile action, the Add panel at add
   time), or card details only.
3. Whether the picker offers every printing or only owned ones first, and how a chosen but
   unowned printing is shown.
4. How a deck shows that a card has a choice versus the default, and whether it notes "you own
   a different printing".
5. How a sold-out or never-stocked chosen printing reads on the row and on Shopping.
6. How reset to default is offered.
7. How import reports the printings it took and the ones it could not match, and how export
   shows what it will name.
8. How the commander's choice appears, if ruled in scope.
9. Whether an older version, which records no printing, reads differently from a newer one.
