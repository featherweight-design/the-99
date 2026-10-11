# All-decks shopping cart

Design brief, 2026-10-11. Asks for a Design round on `Shopping for all decks`: one cart on `/decks` that gathers
what every unfinished deck is missing, shows which decks need each card, and ends in one Mana Pool link-out. Hugh
scoped it on 2026-10-11 and ranked it first of four new features. The engine pieces it needs mostly exist; the
surface does not. This brief says what Hugh closed, what the code does today, what engineering has locked, and
what Design owns.

## Rulings 2026-10-11 (Hugh, closed)

Source: the priorities board, "New features scoped with Hugh 2026-10-11", item 1. They are not reopened here.

1. **A cart on `/decks`, labeled `Shopping for all decks`.** Every deck that is still missing cards starts
   ticked. **Brews are included.** Complete decks are absent. The player unticks a deck to leave it out.
2. **One copy per deck.** Two decks that both need Sol Ring means buying 2. A card needed by more than one deck is
   shown with its decks, in the form `2 · Gishath, Aang`.
3. **One checkout.** The cart ends in a single Mana Pool link-out for the whole cart. It reuses the per-deck
   checkout and the prices already shown.
4. **Bought cards come back through I got it.** The player marks what they bought and the cards return to the
   collection the way the per-deck Bought flow does today.

What the rulings do not say, and engineering has not decided for Hugh, is listed under Open questions.

## What exists today

All paths are on `main`; line numbers were read on 2026-10-11 and move.

**The per-deck Shopping filter and its count**
- `src/lib/decks/shopping.ts:32` `isShoppingCard(c)`: false for a basic land, false for a proxied card (checked
  before ownership), true when the card is not owned, and for an owned card true only when it is spoken for
  (`availabilityState(..., { selfExcluded: true }) === "over"`). `isSpokenFor(c)` is "owned and on the Shopping
  list". `commanderShoppingRows` (`:95`) adds an unowned commander as a row of its own, only when the deck has a
  body.
- `src/components/decks/decklist.tsx:606-618`: `listShoppingCards`, `shoppingCards` (commanders first) and
  `shoppingCount`, which counts copies, not rows. Every Shopping figure on a deck page reads this one basket.
- `src/components/decks/group-toggle.tsx:219`: the `Shopping` segment and its count. `price-strip.tsx` shows the
  basket's total and the Mana Pool link (`:56` builds it).

**The cross-deck roll-up on `/decks`**
- `src/lib/decks/shopping-rollup.ts:71` `loadShoppingRollup(userId, deckIds?)` returns
  `{ byDeck: Map<deckId, { copies, cents, pricedCopies }>, total }`. It adds copies across decks without merging
  them, so a card two decks need counts twice. A deck with nothing to buy is not in `byDeck`. Each deck's rows are
  priced through that deck's own printing picks.
- `src/app/decks/page.tsx:52-79` loads it beside `listDecksWithStats` and `listFolders`, inside
  `cachePageForUser`. `src/components/decks/decks-view.tsx:1167` reads only `shopping.byDeck.get(deck.id)`, and
  `src/components/decks/deck-card.tsx:166-182` draws `N to buy · $X` (`detailToBuy`, `src/lib/copy/refresh.ts`)
  on each tile.
- **`shopping.total` is not drawn on `/decks`.** Its only reader is Home's Commitments card
  (`src/components/home/commitments-card.tsx:93`; loaded at `src/app/page.tsx:152`). There is no all-decks figure
  on the page today.
- The tile's figure comes from the roll-up, never from `deck.toBuyCount` (`src/lib/decks/read.ts:1411`, which does
  not exclude basics and knows nothing of seniority). `deck-card.tsx:166` says why.

**Mana Pool link-out (#330, #377, #394)**
- `src/lib/manapool/links.ts:25` `manapoolAddDeckUrl(cards: { name, quantity }[])` returns `null` for an empty
  list, else `https://manapool.com/add-deck?deck=` plus the percent-encoded base64 of `"<qty> <name>"` lines
  joined by newlines (`:4`, `:15-17`). **Card names and quantities only: no printing, set or finish.** The player
  picks printings on Mana Pool.
- **Payload limits: none are enforced.** There is no chunking, cap or overflow path. The only length check is a
  test that a 99-card list stays under 4096 characters (`src/lib/manapool/links.test.ts`). A whole cart is much
  longer (see Fixtures and Open question 6). Mana Pool documents the line format (`quantity name set number`;
  `4` and `4x`; the set in brackets or parentheses) but no list-size limit and no URL prefill.
- Callers: `price-strip.tsx:56`, `export-dialog.tsx:236`, `commit-sheet.tsx:164`,
  `src/components/sets/set-grid-view.tsx:434`. The shared label is `exportLinkOutCopy.shopping`, `Buy these at Mana
  Pool` (`src/lib/copy/decks-builder.ts:520`).
- **Prices shown** come from `src/lib/decks/price-query.ts` (`loadPrices` returns `{ prices, newestAsOf }`) and
  `src/lib/decks/price.ts`: a printing is `priced`, `foilOnly`, `soldOut` (its `as_of` is older than the newest in
  the feed) or `absent`; neither of the last two adds to a total, and a missing price is never a price of zero.
  There is no per-printing "stale" state: `PRICE_STALE_AFTER_DAYS = 10` (`price.ts:53`) marks the whole feed as
  behind (provenance), not a line. Strings: `priceCopy.strip.*`
  (`src/lib/copy/price.ts:46-86`).

**Card assignments and seniority: which deck holds an owned copy**
- Tables (`src/db/schema.ts`): `cardAssignments` (`:1017`, primary key user, card, deck; `copies`), `pullReleases`
  (`:1067`), `deckProxies` (`:531`), `deckLocks` (`:584`).
- `src/lib/decks/availability-query.ts:58` `claimModel(userId)`: a deck claims off its newest committed version; a
  deck with no version is a brew and claims softly off its live list. Both commanders count, basics do not.
  Seniority is per card, ordered by when the deck first held it, then by deck id.
- `availability-query.ts:703` `loadDeckBuyRows(userId, deckIds?)` returns `{ deckId, oracleId, quantity }` rows:
  what each deck still has to buy after owned copies, copies other decks hold, and proxies. The roll-up sums
  these. **An owned card can be a to-buy row**: a senior deck holds every copy, so a junior deck must buy one
  (`availabilityState` says `over`). The pill, the strip and the tile all count that card as "to buy" on purpose.

**I got it's Bought flow**
- `src/app/decks/mark-bought-actions.ts` `markBought(deckId, oracleId, { scryfallId, finish, quantity, expected,
  id })`: gated by `SHOPPING_MARK_BOUGHT_ENABLED` and `COLLECTION_EDIT_ENABLED`; `quantity` is capped at
  `MARK_BOUGHT_MAX = 20` (`src/lib/decks/mark-bought.ts:8`); writes an absolute collection count
  (`expected + quantity`, source `shopping:<deckId>`, `requireMember: { deckId, oracleId }`); the press `id` makes
  a retry idempotent; returns `applied | stale | missingCard | refused`.
- It is **strictly one deck and one card per call.** The confirm is `src/components/decks/got-it-confirm.tsx`
  (printing, finish, how many). The held slot, undo and receipt live in `got-it.tsx` / `got-it-receipt.tsx`, one
  provider per deck page keyed by deck id. Copy: `gotItCopy` in `src/lib/copy/i-got-it.ts`.
- `applyCollectionChange` already takes a `rows` array, but `source`, `requireMember` and the receipt facts are
  single-deck. A cart press that serves several decks is new work.

**Brews and committed decks**
- A deck with no `deck_versions` row (`schema.ts:613`) is a brew; `hasVersion` is `lastCommittedAt !== null`
  (`read.ts:1385`). `src/lib/decks/status.ts` names the pills: `New`, `Draft`, `Over`, `Building`, `Unresolved`,
  `To buy`, `Complete`. A brew claims copies softly; only a committed deck holds a copy against every other deck.
- Nothing in the roll-up cares which a deck is: any deck with a row is "missing cards".

**Constraints a new page inherits**
- `/decks` and Home cache their payload per reader (`src/lib/cache/page-cache.ts:48`), keyed on the stamp the
  database moves. A cart that reads a per-user table the stamp does not cover fails `pnpm check:list-cache`.
- `/decks` has no tab structure. Its controls are shelves (folders: `shelf-line`, `shelf-menu`, `shelf-sheet`)
  and filter chips in `decks-view.tsx`. A cart route (say `src/app/decks/shopping/page.tsx`) would be new.

## What engineering has locked

These are engineering's reading of the rulings. Hugh can override any of them.

1. **One copy per deck, and a deck's quantity is the roll-up's.** The cart's line for a card is the sum, over
   ticked decks, of that deck's `loadDeckBuyRows` quantity. That already nets owned copies, copies a senior deck
   holds and proxies, so the cart bills exactly what the deck's own Shopping pill bills and cannot disagree with
   the tile. A card two ticked decks need is two copies; the line carries the per-deck breakdown it came from.
2. **Which decks are unfinished: any deck with a roll-up row.** Brew or committed, it appears if it is missing
   cards by the Shopping definition, and is absent when it is not. There is no separate "finished" flag to keep.
3. **Basics and proxied cards never appear**, because `isShoppingCard` excludes them, and an unowned commander
   appears as a row of its own, as it does in the deck's Shopping list.
4. **An owned card can be in the cart.** A card the player owns but a senior deck holds is a to-buy row for the
   junior deck, and so a cart line. The cart must not tell the player they own it and hide it (Open question 3).
5. **The single link-out is one `manapoolAddDeckUrl` call over merged lines.** Lines are merged by card name with
   quantities added, so Sol Ring needed by three decks is one line, `3 Sol Ring`. Names and quantities only, as
   the per-deck link does today; the printing choice stays on Mana Pool. **Engineering owes a measurement before
   the build**: the whole of Hugh's staging cart is 291 lines (roughly 8KB of URL by estimate), against a
   guard written for 99 lines. If Mana Pool refuses a URL that long, the cart cannot be one link and Hugh decides
   (Open question 6). Design draws one link.
6. **Prices are the roll-up's.** The cart total is the sum of the ticked decks' `cents`, each deck priced through
   its own printing picks. A price missing is not a price of zero: the total says how many copies it priced
   (`pricedCopies`), as the strip does.
7. **Bought comes back through the existing mutation, extended, and what a purchase clears is not promised.**
   `markBought` stays per card; the cart's press needs a variant that serves every deck that needed the card (Open
   question 4). The collection row is shared and the seniority model, not the cart, decides which deck a new copy
   serves: `loadDeckBuyRows` deliberately leaves an unsatisfied senior deck's own shortfall out of a junior deck's
   bill (`availability-query.ts:848-855`), so with a senior deck unticked, a copy bought for a junior can go to the
   senior and leave the junior short; and decks that draw on the same unreserved surplus can all clear on one added
   copy. So `n` bought copies do not necessarily clear `n` rows. The held slot per deck is I got it's; what the cart
   shows after a purchase is read from the roll-up again, never assumed.
8. **Unticking is a view, not a write.** It changes the cart and nothing in any deck.

## What Design owns

- **Where the cart lives on `/decks`** and how it opens: a block on the page, a sheet, a route. At 900 and 390.
- **The cart's structure:** by card (one line, its decks beside it) versus by deck (a group per deck, each with its
  own list), or both. How `2 · Gishath, Aang` reads when a card has five decks, and when a deck's name is long.
- **The deck ticks:** where they sit, what an unticked deck looks like, what a fully unticked cart looks like, a
  select-all and a way back.
- **Totals and honesty:** the running total, the copies count, a line for copies without a price, and a sold-out
  or stale price. How a total behaves as decks are ticked.
- **The owned-but-held card** (Open question 3).
- **The checkout:** the link-out's placement and label, what the player sees before they leave, and what they see
  when they come back.
- **The Bought flow from the cart,** from the press through the confirm to the receipt and undo.
- **Empty and thin states:** no deck is missing a card; every deck unticked; one deck only; a deck with only an
  unowned commander; a failed price read.
- **Copy.** Every string goes through `/copy-review`; `Shopping for all decks` is Hugh's working label.
- **The About entry** (below).

## Open questions

1. **Does the cart remember unticked decks?** Not at all (every visit starts all ticked), for this visit only, or
   across visits. Engineering prefers this visit only (the least state to keep right), but a
   player who is not buying for a deck this month would untick it every time.
2. **Cart by card or by deck?** Hugh's `2 · Gishath, Aang` is a by-card line. A by-deck view answers "what do I
   still need for Gishath" and a by-card view answers "what do I buy". Draw one, or both with a switch?
3. **How does a line say the player owns the card?** Hugh owns 17 Sol Rings; three decks are on the cart for one
   each because the other decks hold all 17. Moxfield users ask for availability across decks because the app
   says owned when the copies are in other decks (moxfield.nolt.io/2554, snippet). The cart must say why a card
   they own is on a buy list without a verdict word or a warning color.
4. **A Bought press on a multi-deck line.** Pressing Bought on `3 · Gishath, Kratos, Thorin`: one confirm for 3
   copies with the decks listed, or one confirm per deck? Does the held slot appear in all three decks' lists?
5. **What happens to a cart line when a deck's card is bought one deck at a time.** After a partial purchase the
   quantity falls; does a bought line vanish, collapse, or stay as a receipt until the visit ends?
6. **If the link will not carry the cart.** The measurement in lock 5 may show a limit. Does Hugh accept a cart
   that splits into several links, a cap with a "more" link, or a copy-to-clipboard fallback? Design should draw
   the over-the-limit state only if Hugh answers this; otherwise it is an engineering refusal.
7. **A deck with only an unowned commander** (a deck complete except its commander) is in the cart under the
   existing rule. Is a one-card deck worth a tick and a group?
8. **The roll-up figure on the tile and the cart's figure for the same deck** must agree. Does the tile link into
   the cart with that deck focused?

## Prior art

Verified by fetch unless marked snippet. The finding that matters: **no product found builds a cross-deck cart.**
Every flow is one deck to one store at a time, so this is a gap, not an established pattern.

- **Moxfield** hands one deck to Mana Pool (a button that fills Mana Pool's mass entry, with Any or Exact
  printings): manapool.com/library/platform/2025/05/30/moxfield-manapool-integration.html. Requests on its
  feedback board (snippets) ask for owned-copies-in-other-decks awareness: moxfield.nolt.io/2554 and
  moxfield.nolt.io/1381 ("the collection tracker helps little when one card is used across several decks").
  Public issue "Export only missing cards from deck": github.com/moxfield/moxfield-public/issues/61 (snippet).
- **Archidekt** (fetched FAQ, archidekt.com/faq): a `Buy Cards` button opens a Shopping tab with a vendor and the
  parts of the deck to export, plus `Optimize printings`. One deck at a time. A forum thread (archidekt.com/forum/
  thread/74588/1) shows players tagging unowned cards and exporting the tag. Staff wrote that showing
  in-use cards would mean loading every deck the user owns (archidekt.com/forum/thread/15420664, snippet).
- **Dex** (dextcg.com/help/folders/missing-cards-for-decks, snippet): one combined missing list across decks, a
  market-value total and a count above it, and **a toggle for whether a copy is shared between decks**; by default
  each deck is separate, so one owned copy reads missing for both. That default is the same as our one copy per
  deck, and the toggle is where it is made legible.
- **ManaBox** (manabox.app/guides/decks/missing-cards): per-deck missing view in buckets (missing, partly missing,
  available in the exact version, available in another version); a setting decides whether other decks' copies
  count and proxies are a separate setting.
- **Deckbox** (forum posts 120217, 122471): an account setting for sharing cards between decks; only built decks
  count against inventory, and sideboards count while a scratchpad does not. A precedent for ticking only
  unfinished decks.
- **TCGplayer Mass Entry** (help.tcgplayer.com, getting started with Mass Entry): "Buy Deck" opens an editable list
  before the cart. Mana Pool (manapool.com/mass-entry-info) takes a pasted list and runs a cart optimizer (lowest
  price or fewest packages). **A last editable review before the link-out is the normal shape.**
- **EDHREC** exports plain text into Mana Pool mass entry (manapool.com/mass-entry-info). Nothing across decks.
- **Not found or not verifiable:** Deckcheck, MTGGoldfish, TappedOut, Deckstats, Cardsphere, Card Kingdom,
  MTGStocks (searched; nothing about buying across decks); a "needed by" chip, a grouped-by-deck cart or a
  per-group select-all in any product; a Mana Pool list-size limit, foil marker or URL prefill.
- **What this means for the drawing:** the deck-level untick is not documented anywhere; the by-card line with its
  decks is new; Dex's summary above a list (count, value) and an editable review before checkout are the nearest
  patterns.

## Fixtures (staging, read-only, figures as of 2026-10-11)

Account `user_3GkZrrTwOJBdqUpq6GambP0BC8w`. Figures from `loadShoppingRollup` and `loadDeckBuyRows`, and per-deck
`isShoppingCard` over `getDeckDetail`. Nothing was written.

**The cart as the roll-up would draw it:** 7 of 21 decks, **307 copies, $843.99, 307 of 307 priced.**

| Deck | Id | Committed? | Copies | Cost |
|---|---|---|---|---|
| HD - Gishath | `904fdc61-e190-4ba5-8e34-2b18fa0584f2` | brew (no version) | 75 | $118.59 |
| HD - Omnath | `dcf9a86d-f6ef-4c7c-a20c-a9807c7cdfbd` | committed (1) | 67 | $270.48 |
| HD - Kratos | `2bd462de-5f94-47e5-bd29-eabea5921c75` | brew | 59 | $223.32 |
| HD Tune - Mutant Menace | `8da5f286-9c80-4330-a6f9-06f5fd6756f8` | committed (1) | 43 | $106.99 |
| HD -Thorin | `40bb31db-dfc9-465b-af94-44e2ab83ed5d` | brew | 35 | $64.35 |
| HD Tune - Prismari Artistry | `1a352a97-00fc-4309-a60e-5d518d56d34f` | committed (2) | 15 | $31.55 |
| HD Tune - Counter Intelligence | `2829cf41-1e07-4ec7-8353-8b0d9dfd678b` | committed (2) | 13 | $28.71 |

Three of the seven are brews, so "brews included" changes the cart by 169 of 307 copies. Omnath reads 67 on the
roll-up and 66 from its cards: the roll-up includes its unowned commander as a row (H28); Gishath is 75 against
74 for the same reason.

**Absent (complete) decks, 14:** Goblins `7284ff0a-6e76-4dc0-8af5-fc630a403b2b`, Wizards
`7653dec3-bcf4-4045-8242-9000765c7601`, Yuriko `fc97e49c-a2f3-4944-8436-3df8db102bd5`, Zombies
`cbfb48c5-b085-4e60-889a-a861e9b39bd6`, Blood Rites `783df427-d0c5-456a-805e-cdc94ecb0952`, Sultai Arisen
`659c1ad2-acef-4fb0-9554-ade8fab72c30`, Scrappy Survivors `c8b95d73-f5c7-4049-99a6-b7063bfb8522`, Gods
`13a6dc28-958c-4591-a2bb-c0297bbe5d92`, Brago `f7380a97-3f58-41a1-8d4e-7342ec01b054`, Soldiers
`122c9884-fd27-4a80-bd2c-6166d9e7e6ac`, Elves `86ce528f-836d-476f-9ee8-88470bb2b0e3`, Tovolar
`cc306935-26c9-4e30-8f0c-e0cec410cf8b`, Avatar Aang `0f585441-203e-475b-be7c-f11e67e20d79`, Eldrazi
`0b49cb44-8ae2-4c19-b558-633344a2f4ed`. (Aang is the example in Hugh's ruling; on staging today it is complete.)

**Cards several decks need.** 12 of the 289 distinct non-commander cards on the cart are needed by two or more
decks, 16 extra copies in all. Adding the two unowned commanders (Omnath's and Gishath's), 307 copies make 291 lines:

| Card | Decks | Owned | Reading |
|---|---|---|---|
| Sol Ring | Gishath, Kratos, Thorin (3) | 17 | 17 committed decks play it and hold all 17; the three brews buy |
| Command Tower | Omnath, Gishath, Thorin (3) | 11 | owned, held elsewhere; buys 3 |
| Arcane Signet | Gishath, Kratos, Thorin (3) | 15 | owned, held elsewhere; buys 3 |
| Fabled Passage | Omnath, Gishath, Mutant Menace (3) | 3 | buys 3 |
| Cinder Glade, Evolving Wilds, Nature's Lore | Omnath, Gishath (2) | n/a | |
| Rogue's Passage | Kratos, Thorin (2) | n/a | |
| Shatterskull Smashing // Shatterskull, the Hammer Pass (one two-faced card) | Kratos, Gishath (2) | n/a | |
| Star of Extinction | Kratos, Gishath (2) | n/a | |
| Clifftop Retreat | Gishath, Thorin (2) | n/a | |
| An Offer You Can't Refuse | Counter Intelligence, Mutant Menace (2) | n/a | |

**The case to draw first: Sol Ring.** The player owns 17; 20 decks play it, 17 of them committed (they hold the
17 copies) and 3 brews (Gishath, Kratos, Thorin), so each brew needs one: `3 · Gishath, Kratos, Thorin`. It is the owned-but-held line (Open question 3) and a multi-deck Bought press (Open question 4)
in one card. No card assignments exist on staging for Sol Ring, Command Tower, Arcane Signet or Fabled Passage (the four in the table above), so the seniority is the decks' own, by when each first held the card.

**Link size.** About 291 `"<qty> <name>"` lines at about 20 characters is roughly 6KB of text, about 8KB after
base64 and encoding, against 4096 characters for the longest list the code is tested on.

Reproduce with a read-only script over `loadShoppingRollup`, `loadDeckBuyRows` and `getDeckDetail` against
staging (`connectStaging` in `scripts/eval/lib/staging.mts` refuses a writable connection).

## The About entry owed

The cart is a feature a reader would not find unaided, so it owes an entry in the same round that ships it
(`AGENTS.md`, "No FEATURE launches without an About entry"). Design draws it on the per-entry artboard in
`design/design_handoff_the99_about/` (title, route, `opens`, caption, specimen and its fixture props, up to four
key lines, the phone reduction). The plan names the entry and the `ABOUT_VERSION` bump as a task beside the PR
boundaries. The cart ships in one round, so the entry ships with it; if it later becomes one of several rounds
on a shopping line, the bump batches at the end of the line.

## Paths

- Per-deck Shopping: `src/lib/decks/shopping.ts`, `src/components/decks/decklist.tsx`, `group-toggle.tsx`,
  `price-strip.tsx`, `shopping-key.tsx`, `stand-in-limit.tsx`.
- Roll-up and buy rows: `src/lib/decks/shopping-rollup.ts`, `src/lib/decks/availability-query.ts`
  (`loadDeckBuyRows`, `claimModel`), `src/components/decks/deck-card.tsx`, `decks-view.tsx`.
- Link-out and prices: `src/lib/manapool/links.ts`, `src/lib/decks/price.ts`, `price-query.ts`,
  `src/lib/copy/price.ts`, `exportLinkOutCopy` in `src/lib/copy/decks-builder.ts`.
- I got it: `src/app/decks/mark-bought-actions.ts`, `src/lib/decks/mark-bought.ts`,
  `src/components/decks/got-it.tsx`, `got-it-confirm.tsx`, `got-it-receipt.tsx`, `src/lib/copy/i-got-it.ts`.
- Page cache and its check: `src/lib/cache/page-cache.ts`, `pnpm check:list-cache`.
- Shipped surfaces to reuse: the deck tile (`deck-card.tsx`), `PriceStrip`, `ShoppingKey`, the Shopping rows
  and `BuyTag` (`buy-tag.tsx`), `GotItConfirm`.

## Deliverable

A handoff in `design/design_handoff_the99_all_decks_cart/`: the cart at 900 and 390 on the seven-deck fixture,
the Sol Ring line in every state it can take (as listed, being bought, bought), the deck ticks (all ticked, some
unticked, none ticked), the empty and thin states, the checkout and return, the `STATES` rows and design-table
sections they add, and the About entry on the per-entry artboard.
