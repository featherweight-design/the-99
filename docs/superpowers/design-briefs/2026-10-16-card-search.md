# Brief: Card search

2026-10-16. Settled by Hugh and the orchestrator (d9) in conversation on 2026-10-16. This brief is the record: every
item under "Locked" is theirs and is not reopened by Design.

**What this brief asks.** A way to look up any card in the catalog by name, from anywhere in the app, on phone and
desktop. Search is a doorway into card details, which already answers the player's questions about a card. It proposes
one Design round.

## The problem

A player can find a card only from a surface that already lists it: their Collection, a deck, a recommendation. There is
no way to ask about a card they saw at the table, in a stream, or in a friend's deck. They cannot ask what it does, or
whether they own it and where.

## The job

**Look up ANY card in the catalog by name.** The answer is card details, as it ships today:
- **What's this card?** Its art, text, printings and price.
- **Do I have it, and where?** Ownership, and the decks that hold it.
- **Its Wishlist section**, on every card with `SOCIAL_WISHLIST_ENABLED` on: Add to wishlist, or the want stepper
  with `you have N`, owned or not.
- **Find a deck** (`SWAP_TOOLS_ENABLED`) on a Commander-legal card, for a reader with at least one deck that has a
  commander (`fitsDoor`: `commanderLegal && hasDecks`). Ownership and the card's own decks are not checked.

Search adds no answer of its own. Both questions come free through card details.

## What exists today

- **A whole-catalog name search** in `src/lib/collection/catalog-read.ts` (`searchCollectionCatalog`, through
  `nameSearch`). It matches every game card by name, Secret Lair flavor names included (`flavorName`). It applies no
  legality, identity or ownership filter, and returns `{ oracleId, name, typeLine, imageUri, manaCost, flavorName,
  owned }`, where `owned` is the reader's own count across printings. The Add cards sheet and the Wishlist tab's search
  already read it.
- **The deck builder's search** (`src/app/decks/[id]/search-action.ts`, `searchCards`) is a different question: cards
  for THIS deck, filtered by the commander's identity. It stays the deck page's own.
- **Card details** (`CardDetailProvider`, opened by `CardDetailTrigger`) is mounted per surface today: Collection,
  Commanders, About's figures and others, not once in the shell. A search reachable from every screen needs card details
  reachable from every screen too. That is engineering's half, and card details itself is reused as it is.
- **The shell** (`src/components/shell/nav.tsx`): `NavRail` on desktop, `MobileHeader` and `TabBar` on the phone.
  Desktop has no header: `MobileHeader` is `md:hidden`. The phone header is NOT sticky today; it scrolls away with the
  page. It is about 73px tall (20px top, the 38px avatar, 14px bottom and a 1px rule). Its right-hand cluster is up to
  THREE controls, not one: the offline pill (`OfflinePill`), the install slot (`InstallSlot`, phone only) and the
  account button (`AccountMenu`).
- **Stacked sheets** (`design/design_handoff_the99_stacked_sheets/`): a card opened from a sheet STACKS on it; on a
  phone the card covers the sheet at full height, and the sheet stays mounted and hidden under it with its scroll kept.
  **A stacked card opens no further layer**, so it draws no Find a deck (`onFindDeck` is null while a sheet is below).
  If the search sheet stacked under card details like any other sheet, every card opened from search would lose Find a
  deck, which lock 1 forbids. How the search sheet and card details hand over is open question 8.

## Locked (do not reopen)

1. **The job:** any catalog card by name, and search opens card details. Nothing in card details changes.
2. **Name search only.** No color, type or set filters for now, so search never becomes a deckbuilding engine.
3. **A result shows** the card's art, its name, and the player's own ownership state: owned N, in deck X, on your
   wishlist. A tap opens card details.
4. **Placement, option A.**
   - **Desktop:** a search field at the top of the side rail, opened from anywhere with Cmd+K (Ctrl+K off a Mac).
   - **Phone:** a search icon in the top header beside the account button, which opens a full-screen search sheet.
5. **The phone header returns on scroll up ("quick return"), on every phone screen.** It slides away on scroll down, as
   it does now, and slides back as soon as the player scrolls up a little.
   - **Rejected:** an always-sticky header, which costs about 73px on every screen.
   - **Rejected:** a header reachable only at the top of the page, which leaves search out of reach mid-page.
6. **Two searches on the deck page, labelled apart.** The deck's own bottom field adds a card to THIS deck, and the
   global search looks up any card. Their labels differ: **"Search all cards"** for the global search (the phone header's
   sheet and the desktop rail field) and **"Add a card"** for the deck's own field. Those words are d9's call, and /copy-review may refine them.
7. **The deck page's bottom controls and the returning header never collide.**
8. **Results never show another player's data.** Ownership, decks and wishlist are the reader's own.

## Constraints

- Reuse card details as it is.
- The catalog read is existing data (cards, plus printings for art). No new upstream.
- Mobile and desktop ship together.
- **Hugh's noise concern:** the header icon must not crowd the phone header.

## Open for Design to call

1. **The search sheet's states:** empty, with recent searches or none, typing, results, no results, a failed search,
   and offline.
2. **The result row:** its anatomy at both widths, and how the three ownership signals read (owned N, in deck X, on
   your wishlist) when a card has none, one or all of them.
3. **Quick return:** how it behaves at the top of a page, under a sheet or a modal, with the keyboard open, and beside
   the deck page's bottom controls (lock 7).
4. **The desktop rail field:** its rest, focus and typing states, where results open (a dropdown under the field or a
   panel), and how the Cmd+K hint reads.
5. **Recent cards:** whether search remembers the cards a player opened, and how many. A recent list is the reader's
   own, never another player's.
6. **The phone header icon:** where it sits in a right-hand cluster that already holds up to three controls (offline,
   install, account) without crowding it.
7. **Accessibility:** focus on open, Escape and the back gesture, results announced as they arrive, and the Cmd+K
   shortcut not taking a key a text field needs.
8. **The handover to card details:** whether a result closes the search sheet and opens card details on its own (so
   Find a deck stays), or the sheet stays under it and Back returns to the results. If it stays under, engineering must
   keep Find a deck on a card opened from search, since lock 1 says card details does not change.

## Every state to draw

- **Phone:** the header with its icon at rest, with the offline pill and the install slot showing; the header returning mid-page; the search sheet empty (with and without
  recent cards), typing, with results, with no results, failed, and offline; card details opened from a result, and back
  to the sheet.
- **Desktop:** the rail field at rest, focused and typing; Cmd+K from a page with no field focused; results; no results;
  failed; card details opened from a result.
- **The deck page:** "Search all cards" and the deck's own "Add a card" on one screen; on the phone, the header returned
  over the deck's bottom controls; on desktop, the rail field beside the page's own add field.
- **Result rows:** owned N; in a deck; on the wishlist; none of them; all of them; a long name; a Secret Lair flavor
  name match.

## About entry

Card search is a feature a reader can discover, so it owes an About entry, drawn on the per-entry template
(`design/design_handoff_the99_about/`). Whether it ships with the feature or joins the discovery line's showcase
(`2026-10-16-discovery-and-onboarding.md`) is Hugh's call.

## Out of scope

- Filters of any kind, and search by rules text.
- Changing card details.
- The deck builder's own search and its results.
