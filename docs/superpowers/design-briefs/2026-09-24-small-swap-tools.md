# Design Brief: The small swap tools (sub-project 4)

**Date:** 2026-09-24 · **Branch:** `docs/scoping-briefs` (held for Hugh's approval; not yet a PR)
**Rulings:** Hugh, 2026-09-24, in the scoping conversation for this brief (§2).
**Spec:** `docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md:24-26` lists #218
("deck facts × one card"), #217 ("deck facts + support index") and cheaper swaps ("deck facts +
`printing_prices`") among the features that need no model, and §14 row 4 (`:2269`) names this
sub-project without specifying it.
**Frame:** the deck page's Shopping view (`src/components/decks/decklist.tsx:344-345`, its Shopping branch from `:418`; the pill at
`group-toggle.tsx:146-149`, the strip at `price-strip.tsx:15`) and the card modal
(`src/components/cards/card-modal.tsx:407`). Shopping's handoffs are
`design/design_handoff_the99_decks/ADDENDUM-README.md` (price on the buy tag),
`design/design_handoff_the99_amendments/STATES-shopping-availability.md` and
`design/design_handoff_the99_linkout/` (the strip's link-out).

**Verified against `origin/main` at `5673dd0a`.** Every file:line below was read on that commit.

This round asks two questions. **In the list a player is pricing, how do they see and take a
cheaper card that does the same job?** And **when they hold a card, how do they see which of
their decks it belongs in?**

---

## §1 What this is

Two small tools. Neither uses a model, and both answer from facts the app already stores.

**Cheaper swaps.** Suggested changes on the Analysis tab does NOT cover this, although the intake
assumed it would. Suggested changes is model-driven, and its own rules forbid price and ownership
from shaping what it suggests (`src/lib/copy/deck-tuning.ts:243`). It also never checks that a cut
and its add do the same job. Cheaper swaps is a separate, deterministic tool. It lives where the
money already is: the Shopping view, whose rows are exactly the cards the player would have to buy
(`isShoppingCard`, `src/lib/decks/shopping.ts:31`).

**Find a deck for this card (#218).** The card modal already names the decks that HOLD a card
(`AvailabilityDetail`, `card-modal.tsx:263`, rendered at `:1727`). It says nothing about which of
the player's decks the card would FIT. The data for that has been in place since #244: the
card-to-commanders index was added for this feature (`src/db/schema.ts:994-996`).

**Prior art, and where it falls short.**
- **EDHREC's budget filter** works per deck ("the cheapest 10% of decks") and never says which card
  replaces yours.
- **deckcheck's PowerTune and ManaTap's swaps** use a model and don't say how "same job" was
  decided. That is the failure the constraint ruling exists for.
- **Brewlist** is closest to this brief. It uses Scryfall's function tags and flags alternatives
  the player owns.
- **Card to deck:** Archidekt's "In Decks" tab answers only "which decks contain this", and it
  dropped its collection-wide version for cost. EDHREC's "Top Commanders" is global popularity
  and knows nothing about the player.
- **Nothing found matches a card against the player's own decks.**

## §2 Rulings, locked (Hugh, 2026-09-24)

1. **Cheaper swaps start from the deck, with a per-card limit.** "Flag anything over $10." A single
   card's stand-ins are the same answer filtered to one row, and that is a second door (ruling 3).
2. **Only cards the player would have to buy count.** Membership is exactly the Shopping list
   (`isShoppingCard`, `shopping.ts:31-45`). A card the player owns with a free copy costs nothing and
   is never flagged. An owned card is on Shopping only when its availability reads `over`
   (`shopping.ts:41-44`, `isSpokenFor` at `:47`): committed decks ask for more copies than the
   player owns. A copy held softly by a brew does not put it there.
3. **The sweep lives in the Shopping view itself.** Shopping gains the limit, rows over it are
   marked, and each row opens its stand-ins. A player can also open any single Shopping row's
   stand-ins, whatever the limit. That covers Hugh's case of Plateau ($293.84) in HD Gishath.
4. **The limit is a per-card dollar figure, remembered per deck.** It is not a total budget: a
   total has many answers and would make the tool choose, which is the ranking the suite rules
   out. The default is $10.
5. **A land's job is the colors it makes.** Stand-ins make every color the original makes. They
   are ordered cheapest first, with copies the player already has free at the top. Each names what
   it gives up: enters tapped, deals damage, costs life, and so on.
5a. **A fetch land's job is the land types it finds.** Wooded Foothills (Mountain or Forest) gets
   cheaper lands that find those types: Terramorphic Expanse, Evolving Wilds, Fabled Passage. Each
   names what it gives up (enters tapped, finds only a basic). Ruled after the cold review, which
   found that the color reading gives a fetch no colors at all.
6. **A spell's job is its role.** Stand-ins share the original's role (ramp, draw, removal, wipes),
   cost the same mana value or less, and are ranked by how often this commander's decks run them.
   A card with no role says so plainly and offers nothing. The tool never guesses. The same goes for
   a land that neither makes a color nor fetches (Strip Mine, Cabal Coffers): its job is its text,
   so it gets no stand-in.
7. **Taking a stand-in swaps it into the draft, with a Put it back undo.** This is the same act as
   Suggested changes' Apply. A player learns one swap mechanism, not two.
8. **#218 answers "which of MY decks does this fit".** It does not answer "which commanders", which
   overlaps sub-project 7 and /commanders.
9. **#218 lives in the card modal, everywhere it opens.** That includes the collection, set pages,
   search and decks, beside the list of decks that hold the card. This moves #222's planned
   placement, which was an addendum to the collection handoff
   (`docs/superpowers/design-pipeline-status.md:316`).
10. **A fitting deck shows two facts side by side, never a score.** How often that commander's
    decks run the card, and whether this deck is short on the card's role.

## §3 What Design is asked to draw

Both widths, 390 and 1300, for everything below.

### 3.0 Readings settled in scoping

These follow from the rulings. Hugh has not ruled on them one by one, and he may overrule any of
them.
- **"Cheaper" compares cheapest printings.** Each card's price is its cheapest current printing
  (`loadPrices`, `price-query.ts:67`, the same figure the buy tag draws). Non-foil is preferred,
  with foil or etched used only when that is all the feed carries (`:95-97`). The original is
  compared at its own figure, owned or not.
- **A stand-in is "free" exactly when taking it would not put it on Shopping.** An owned copy that
  committed decks already claim is priced like any buy. A card with no price has never been stocked
  (AGENTS.md, price refresh), so it appears only as a free copy.
- **A Shopping row with no price** can never be over the limit. It can still open its stand-ins,
  and they are the free copies only.
- **Free copies come first for spells too,** then the commander ranking. Cards the commander index
  does not list come last, by price, and show no commander figure.
- **A card with several roles** takes stand-ins that share at least one of them, and each stand-in
  names the roles it shares.
- **A card whose front face is a land is a land;** anything else is a spell (Agadeem's Awakening is
  a spell). Mana value is the card's own mana value.
- **An "any color" land** (City of Brass, Mana Confluence, and Command Tower inside the deck)
  counts as making every color the grant covers. A grant that depends on other permanents
  (Exotic Orchard, Reflecting Pool) does not count.
- **"Already in the deck"** means in the draft, which is the deck the player is editing.

### 3.1 The limit in the Shopping view

A per-card limit control in the Shopping view. It belongs with the price strip (`PriceStrip`,
mounted only under Shopping at `group-toggle.tsx:356-357`) or near it. A deck that has never set a
limit shows the $10 default. Draw how the player changes it, and what the view says when no row is
over the limit.

### 3.2 A row over the limit

The existing row (`DecklistRow`, `decklist-row.tsx:109`; the buy tag at `:550-555`, the ✕ just
below `:612`) marked as over the limit, with a way to open its stand-ins. A row under the limit also
needs a way to open them (ruling 3), and it must not read as a warning. Draw both, and include a
Plateau-length name at a $293.84 price.

### 3.3 The stand-ins

What opening a row shows. For each stand-in: its name (which opens the card, as names do
everywhere), its price or the fact that it is free, its availability mark, what it gives up (lands)
or its mana value (spells), and a Take control. At the head sits the card being replaced and its
price.

Four states:
- **Lands:** a list headed by owned free copies, then priced cards cheapest first. Plateau into
  Sacred Foundry, Battlefield Forge, Rugged Prairie, Sunbaked Canyon.
- **Spells:** a list ranked by how often this commander's decks run each card, each showing that
  figure.
- **No role:** a sentence and no list. The card does a job the tool can't name, so it offers no
  guess.
- **Nothing cheaper:** the card has a role, but nothing cheaper does it.
- **Fetch lands:** cheaper lands that find the same types (ruling 5a).

Also draw: the list loading and failing to load; a drawback the classifier could not name (it says
so rather than leaving the slot blank); a Take refused because the deck changed underneath it,
which mirrors Suggested changes' `applyRefused`; and a partner deck, where the commander figure is
the pair's.

### 3.4 After a take

The swap lands in the draft (ruling 7). The original leaves the list. The stand-in joins the list
if it has to be bought, and does not if it was a free copy. Draw where Put it back lives once the
row it came from has changed or gone. Draw what the price strip's total shows: the new total alone,
or the new total with what the swap saved.

### 3.5 Fits your decks (card modal)

A section in the card modal listing the player's decks the card could join. A deck qualifies when
its commander's color identity allows the card and the deck does not already hold it. The decks
that already hold it are listed by `AvailabilityDetail` already.

Each deck row shows:
- the deck's name, which opens the deck;
- **the commander fact:** how often this commander's decks run the card, or that the index does
  not list it for this commander;
- **the need fact:** this deck's count of the card's role against its target ("removal 5 of 8"), or
  nothing if the card has no role.

States: several decks; every deck that could play it already holds it; no deck can play it (the
colors rule them all out); the card is not legal in Commander; and no decks at all.

## §4 Open for Design to call

1. **Where the stand-ins open:** inline under the row, a sheet, or a `ModalChrome` body
   (`src/components/decks/receipt-modal.tsx`). The phone matters most, since Shopping rows are two
   columns on desktop and one on the phone.
2. **How an untouched default reads** beside a limit the player set. The limit is never off: an
   unset deck marks rows over $10 (ruling 4).
3. **How a drawback reads on a land:** words, a mark with a key, or both.
4. **Put it back after a take** (3.4), and whether the strip shows savings.
5. **Order of the Fits your decks rows.** Any order is a presentation choice, not a ranking of fit.
   Name, last edited, or either fact are all allowed. Nothing may combine the two facts.
6. **Whether a deck row in Fits your decks carries an Add** that stages the card into that deck's
   draft. The action exists (`addCardToDeck`, `src/app/decks/actions.ts:484`). Hugh has not ruled
   on it; Design proposes and Hugh decides.
7. **The section's place in the modal** relative to `AvailabilityDetail`, and whether it is open by
   default.

## §5 Locked, and not open

- **No model, anywhere.** Every stand-in and every fitting deck comes from a query. Which copies the
  player owns is read from the collection, never asked of anything. This covers the spec's
  "from-my-collection" tool (`2026-09-19-deck-analysis-foundation-design.md:2269`): owned free
  copies lead every list of stand-ins.
- **No single score.** A stand-in shows its facts: price, mana value, its commander figure, what it
  gives up. A fitting deck shows two facts. None of these is combined into a number.
- **A stand-in never breaks the deck.** It is legal in Commander, inside the commander's color
  identity, and not already in the deck. For a land, it makes every color the original makes.
- **A stand-in is cheaper, or it is free.** A card with no price has never been stocked (AGENTS.md,
  price refresh) and cannot be called cheaper, so it appears only if the player owns a free copy.
- **Only Shopping rows are swept.** Owned free cards are never flagged, whatever they are worth.
- **Basic lands are never on the list** (`shopping.ts:32`), so they never get stand-ins.
- **A role-less card gets no guess.** Neither tool falls back to card type or to "cards this
  commander runs".
- **#217 is not in this brief.** Swap recommendations are Suggested changes, which is shipped. This
  departs from the spec, which lists #217 as a no-model feature built from the support index
  (`:25`, and §14 row 4 at `:2269`). The lane brief scopes it that way, and Suggested changes, which
  uses a model, is the answer players have.

## §6 What engineering owns (not for Design)

Recorded so the round is not asked about them. All deterministic.

- **Land colors need a reader that has never run in production.** `producibleColors`
  (`src/lib/recs/mana.ts:30`) reads basic land types and the "add" clauses on both faces, and its
  "any color" pattern is at `:12`. Nothing but its test calls it. The profile instead takes a
  land's color identity (`src/lib/profile/build.ts:259-264`), which reads City of Brass as making
  nothing. The stand-in query uses a text reader, needs no new ingest, and must add the conditional
  exclusion in §3.0.
- **Fetch lands need a second reader:** the land types a "search your library for a … card" land
  finds, and whether it finds only basics.
- **The drawback classifier is new.** It parses oracle text for enters tapped, damage and life
  payment, and names what it could not classify rather than leaving the slot blank. Nothing like it
  exists today.
- **Roles:** `classifyRoles` (`src/lib/recs/roles.ts:25`, roles at `:3`).
  - The commander figure is `commander_support_cards.inclusion` (`schema.ts:990`). A partner pair
    reads `commander_pair_support_cards` (`:1064`, inclusion at `:1068`).
  - A card the index does not list for this commander ranks after those it does, by price.
- **Need per deck:** `computeRoleCounts` (`src/lib/decks/mix.ts:32`) against `recommendedMix`
  (`:107`), loaded per deck by `loadDeckMix` (`src/lib/decks/deck-mix.ts:27`).
- **Prices:** the cheapest printing per card is `loadPrices` (`src/lib/decks/price-query.ts:67`).
  The total is the existing `summarisePrices` (`src/lib/decks/price.ts:186`).
- **The limit is a column on `decks`**, beside `declaredBracket` and `intent` (`schema.ts:305`,
  `:311`). Null reads as the $10 default.
- **The swap:** tuning's `applySuggestion`/`undoSuggestion` (`src/app/decks/tuning-actions.ts:200`,
  `:204`) take a tuning item id, so they can't be called directly. The swap body in
  `src/lib/tuning/verdicts.ts:84` (validate, cut one copy, add one copy with `auto: false`, prune
  proxies, `touchDeck`) is extracted and shared, so the two tools stay one act. **Undo needs its
  own storage.** `undoItem` (`verdicts.ts:154`) restores from a snapshot on the suggestion row, and
  a Shopping take has no such row. The plan names where that snapshot lives. The button's label is
  the same "Put it back" (`deck-tuning.ts:206`), one word from the #593 removal undo's "Put back"; Design and `/copy-review` keep the two distinct or make them one.
- **Fits your decks' payload:** the modal fetches per card through `getCardDetail`
  (`src/app/card-detail-action.ts:18`) and today receives only the decks that hold the card. It
  needs the reader's decks, their commanders' identities (`fitsIdentity`,
  `src/lib/recs/score.ts:237`), one inclusion lookup on the oracle index (`schema.ts:996`) and each
  deck's role counts. Engineering decides whether this loads with the detail or when the section
  opens.

## §7 Sequence

This brief waits for Hugh's approval before it goes to Design. The pure parts can build before the
handoff (Tier A): the drawback classifier, the stand-in query and the fit reader. The surfaces wait
for READINESS. The About entry is batched with the rest of the analysis line's entries at launch, so
it is not drawn in this round.

The pipeline tracker's #222 row (`design-pipeline-status.md:316`) still describes the old
collection-addendum placement. Updating it is outside this lane's fence, so it is passed to the
orchestrator.
