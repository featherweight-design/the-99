# Tokens for my deck

Design brief, 2026-10-11. Asks for a Design round on `Tokens for my deck`: a deck shows each token its cards make,
which cards make it, and whether the player's collection holds one; an unowned token can join Shopping. Hugh scoped
it on 2026-10-11 and ranked it second of four new features. Unlike the all-decks cart, almost nothing exists:
the catalog drops tokens, the upload discards them, and no card knows what token it makes. This brief says what
Hugh closed, what the code does today, what was measured on his decks, what engineering has locked, and what
Design owns.

## Rulings 2026-10-11 (Hugh, closed)

Source: the priorities board, "New features scoped with Hugh 2026-10-11", item 2. Not reopened here.

1. **Keep Scryfall's card-to-token links** (`all_parts`) **from the bulk file the catalog already fetches. Cost: $0.**
2. **A deck shows each token it makes, the cards that make it, and whether the collection holds one.**
3. **An unowned token can join Shopping.**
4. **No emblems, no markers.**

What the rulings leave open is under Open questions. Ruling 3 says a token *can* join Shopping; engineering reads
that as the player's choice on a token, not as every unowned token landing on the list (lock 7).

## What exists today

All paths are on `main`; line numbers were read on 2026-10-11 and move.

**The catalog drops tokens, and no link is stored**
- `all_parts` is read nowhere in `src/` or `scripts/`. The only mention is a comment, `src/lib/recs/score.ts:263`
  ("the `meld_result` component in `all_parts`, which the ingest does not store", #712).
- `src/lib/scryfall/transform.ts:21`: `toCardRow` returns null for a non-game card, so a token never gets a row in
  `cards`. `src/lib/cards/game-card.ts:24` `TOKEN_LAYOUTS` is `token`, `double_faced_token`, `emblem`,
  `art_series`; `:35` `NON_GAME_LAYOUTS` adds `front_card`, `planar`, `scheme`, `vanguard`, `host`, `augment`.
- Tokens do not live in `printings` either: `printings.oracle_id` is a foreign key to `cards`. A skipped printing is
  recorded in `skipped_printings` (`src/db/schema.ts:166`: `scryfall_id` primary key, `layout`, `name`) by
  `src/lib/scryfall/transform-printings.ts:97-108` and upserted by `flushSkipped` (`seed-printings.ts:248-252`). **That table keeps a
  token printing's id, layout and name, and not its oracle id, colors, power, toughness or type line.**
- The ingest reads two bulk files: `oracle_cards` (`seed.ts:71`, one object per oracle id) and `default_cards`
  (`seed-printings.ts:206`, one per printing); `BulkType` is those two (`bulk.ts:9`). `streamBulkEntries`
  (`bulk.ts:62`) yields every JSONL line whole, so `all_parts` is in memory and dropped. Entries are untyped
  (`ScryfallCard = Record<string, any>`, `transform.ts:17`).
- `fingerprint.ts:17` `FINGERPRINT_COLUMNS` hashes eleven `cards` columns (`oracle_id` ... `game_changer`) and
  nothing else. The catalog is fetched once (`scripts/catalog-fetch.ts:55-56` fetches both bulk files into the
  manifest directory; `src/lib/catalog/fetch-dir.ts`) and ingested into both databases from the same bytes.

**Collection upload throws token rows away**
- `src/lib/collection/match.ts` (the loop at about `:111-126`): a row matches by Scryfall id; else, if the id is in
  `skippedIds`, it goes to `skipped`; else by name; else `unmatched`. `import.ts:95-111` builds `skippedIds` from
  `skipped_printings` filtered to `TOKEN_LAYOUTS`.
- A skipped row is **counted and discarded**: `csv_uploads.preview_payload.skippedByDesignCount`
  (`schema.ts:1093-1100`). `collection_items.oracle_id` is a not-null foreign key to `cards`, so a token cannot be
  stored there. **Ownership of a token is not recorded anywhere today.**

**Shopping has no place for a thing that is not a deck card**
- `src/lib/decks/shopping.ts:32` `isShoppingCard(c)` works on a `DeckDetailCard`, which needs an `oracleId` that
  is a `cards` row. `deck_cards` (`schema.ts:493`) is a foreign key to `cards` as well. A token is neither.
- The nearest precedent for a Shopping row that is not a deck card is the commander: `commanderAsRow` and
  `commanderShoppingRows` (`shopping.ts:~95`), used in `decklist.tsx` and `builder-shell.tsx`. Its comments say
  `isShoppingCard` is the client twin of the server's `loadDeckBuyRows` and the two must agree
  (`src/lib/decks/availability-query.ts:703`; `list_claims` at `:741` unions `deck_cards` and the commanders).

**Mana Pool and tokens**
- `printing_prices.scryfall_id` references `printings`, and `src/lib/manapool/seed-prices.ts` drops any feed row
  whose id is not a known printing (`:21-34` the pure orphan rule, `:52-65` the lookup). **Token prices are in
  the feed and are dropped on the way in** (see Fixtures).
- `src/lib/manapool/parse.ts:40-52` knows the feed lists a card-plus-token bundle under the same id as the single
  (`Adorned Pouncer // Horse`) and prefers the single. `src/lib/manapool/links.ts:25` `manapoolAddDeckUrl` sends
  names and quantities only, so a token named like a real card is ambiguous (Fixtures).

**Surfaces that could host the answer**
- Card details (`src/components/cards/card-modal.tsx`, `card-detail-provider.tsx`) with
  `combo-partners-detail.tsx` as the nearest related-cards block; per-card extras on the deck page
  (`card-fact-mark.tsx`); the deck page's tabs and stats cards (`deck-stats-view.tsx`, `decklist.tsx`).
- Prior docs: `docs/superpowers/plans/2026-07-27-printings-sets-and-catalog-ingest.md` §9.1 (`:519-525`) says
  tokens and emblems are deliberately absent from the catalog and reported as skipped. No plan or brief for this
  feature exists.

## What engineering has locked

These are engineering's reading of the rulings and of what the data allows. Hugh can override any of them.

1. **Source: `all_parts` entries with `component: "token"`, and nothing else.** Scryfall also puts `meld_part`,
   `meld_result` and `combo_piece` there, and a card that has related parts lists itself among them as a `combo_piece`. Emblems, dungeons and
   art-series cards are layouts of their own and stay out (ruling 4).
2. **A token's identity is its own `oracle_id`, never its name.** Scryfall gives distinct tokens of one name their
   own oracle ids: the Goblin tokens in `oracle_cards` are six different cards, differing in color, power,
   toughness and text. Hugh's decks make 80 distinct tokens under 61 names. A `part.id` is one printing of the
   token, so it resolves to an oracle id through `default_cards`, which the printings pass already streams.
3. **No new fetch and no new cost.** `oracle_cards` carries token objects (926 `token`, 80 `double_faced_token`, 89
   `emblem`) and `all_parts` on 4,783 cards; `default_cards` carries the printing ids the parts point to.
   Reading them is a parse change in the two seed passes, not a new download. `pnpm check:scryfall` cannot just
   add `all_parts` to its required keys: it tests the first entry only (`scripts/check-scryfall-contract.ts:14`,
   `:61-62`), and only 4,783 of 38,721 oracle cards carry the key. It needs a scan for any entry with token parts
   (and a token part that resolves), so an upstream rename is known before the ingest that depends on it.
4. **Two new catalog tables, built by the existing ingest in each database from the same bytes.** A token record
   (oracle id, name, type line, colors, power, toughness, layout, art) and a link from a card's oracle id to a
   token oracle id. Neither is a `cards` column, so **the catalog fingerprint does not move and the copy harness is
   not involved**: the fingerprint exists for products built once and copied, and these come from the fetched
   bytes on both sides like `cards` does.
5. **Ownership needs a new record, and it starts empty.** Upload must stop discarding token rows and keep them
   (only the `token` and `double_faced_token` layouts: `TOKEN_LAYOUTS` also holds `emblem` and `art_series`, which
   ruling 4 and the catalog leave out), keyed by the token's oracle id (any printing counts as holding it). Until the next upload after this ships, the
   collection holds no token on record. Hugh's last upload skipped 155 rows by design (rows whose id is a known
   `token`, `double_faced_token`, `emblem` or `art_series` printing; the split among them was not kept), and the file is not stored, so **the app cannot say today how
   many tokens he owns, and the first screen must say it does not know, not that he owns none** (Open question 1).
6. **A token's price is the cheapest priced printing**, from the Mana Pool feed rows the price ingest now drops.
   It needs token printings in `printings` or a table of its own; engineering's plan decides which.
7. **A token joins Shopping by the player's choice, one row at a time,** stored per deck and per token. It is a
   Shopping row for that deck, not a `deck_cards` row, so it never changes the deck's card counts, its status pill,
   its complete or to-buy state, or the roll-up on `/decks` (decision: a deck is not unfinished because of a
   token). It does not enter the seniority model: no deck "holds" a token, and a token owned once is owned for
   every deck.
8. **Owned means the collection holds at least one,** not one per deck that makes it. Thirteen of Hugh's decks make
   a Treasure; one Treasure on the shelf makes it owned in all thirteen.
9. **`Copy` is a placeholder, and engineering proposes leaving it out** as a marker (ruling 4). Scryfall's `Copy`
   token (type line `Token`, no power or toughness) is made by ten of Hugh's 21 decks. Hugh decides (Open
   question 2); the data model carries it either way.
10. **The link-out is named in Open question 6 before it is built:** token names collide with real card names, and
    `manapoolAddDeckUrl` sends names only.

## What Design owns

- **Where tokens live:** a section or view of the deck page, a line on the card's details, a sheet, or more than
  one. The deck page already carries `Your deck`, Stats, Shopping and tabs; this is a new block, at 900 and 390.
- **The token tile or row:** art, name, type line, power and toughness, color; how a double-faced token reads
  (143 of the 6,039 token feed rows are); what shows when two tokens share a name (Goblin, Soldier, Spirit).
- **The makers:** how "the cards that make it" reads for a token with one maker and for a token with ten (Thorin's
  tokens come from 19 cards, Prismari's from 22), and whether tapping a maker opens that card's details.
- **Owned, not owned, and not known yet** (Open question 1), with no verdict word and no warning color.
- **Joining Shopping:** the control on an unowned token, what a joined token looks like in the deck's Shopping list
  beside real cards, and how it is taken off.
- **Empty and thin states:** a deck that makes no token (none of Hugh's; Wizards makes only `Copy`), one token,
  fourteen tokens (Omnath), tokens not yet read from the catalog, a failed read.
- **Copy.** Every string goes through `/copy-review`. **The About entry** (below).

## Open questions

1. **What does a token read before the collection has been read for tokens?** The first upload after this ships is
   the first time ownership can exist. Until then every token is "not known", not "not owned". Does the section
   say so once at its head, per token, or hide ownership and show only the join control?
2. **The `Copy` token.** Ten of 21 decks list it. It is a placeholder for clone effects, not something a player
   sleeves. Engineering proposes excluding it as a marker; Hugh's call. If it stays, how does a placeholder read
   beside a Treasure?
3. **Which printing is "the" token?** A Treasure has 99 printings, a Food 63. The player holds "a Treasure", any
   art. Does the tile show a representative printing, and does the join control let the player choose the one to
   buy (the Mana Pool link can carry a set and number, see 6)?
4. **Is a token one tile per deck, or one tile with the decks that make it?** Thirteen decks make a Treasure.
   The deck page shows its own deck's tokens; does the card details also show "this card makes: ..."?
5. **How does a joined token sit in Shopping?** It is not a deck card (lock 7). Does it have its own group at the
   foot of the list, a mark, a price like a card? Does it count in the Shopping pill, which counts copies of cards
   the deck needs? (Engineering's lean: its own group, in the pill's total only if Design draws it there.)
6. **The link-out.** `manapoolAddDeckUrl` sends names only. Of Hugh's 61 token names, four are also real card
   names (`Ninja`, `Spirit`, `Timeless Witness`, `Treasure`, whose real card has the type `Card`), so a name-only
   line can buy the wrong thing. Mana Pool's documented line format carries a set and number
   (`4 Plains [M20] 261`). Does the player see which printing a token line will buy, and is a joined token sent
   with a set and number?
7. **With the all-decks cart:** a token joined in three decks. One copy per deck (the cart's rule) or one in all?
   Tokens are not consumed and not held (lock 8), which argues for one; the cart brief's ruling 2 argues for three.
8. **How many tokens is too many to draw as tiles?** Omnath makes 14, Eldrazi 10; the decks are not large, but a
   deck with a token-heavy commander could make 25. A list, a grid, a count and a sheet?

## Prior art

Verified by fetch unless marked snippet. **No product found ties tokens to the collection or to the buy list**; the
nearest feature is a token list on the deck page.

- **Archidekt** (fetched, archidekt.com/news/3834269): a `Deck Tokens & Extras` section under Deck Stats, a Tokens
  view and an Extras tab for emblems and dungeons; plus and minus buttons put items in an out-of-deck "Tokens &
  Extras" category that works like a maybeboard; a `?` on each token lists the deck cards that make it; edition and
  foil are editable. Nothing there about the collection or buying. This matches our maker list and our exclusion
  of emblems and dungeons (ruling 4).
- **Archidekt, how the list is built** (fetched, archidekt.com/forum/thread/9887366): tokens come from Scryfall
  related-card data, and a token named like its maker is skipped (some Warhammer squads); tokens made by lands and
  tokens whose maker was reprinted were missed. A caution for our link source (lock 1, and Open question on the
  same-name case: engineering must test the same-name maker).
- **Moxfield** (snippet, moxfield.com deck page): a collapsible `Tokens (N)` section with an `Add Tokens to Wish
  List` option. A feedback post asks for tokens in the deck export (snippet, moxfield.nolt.io/1021; the page
  returned 403). Whether tokens reach its Buy links is not confirmed. **Add-to-wish-list is the nearest precedent
  for "an unowned token can join Shopping."**
- **TappedOut** (fetched, tappedout.net/mtg-forum/tappedout/ability-to-add-creature-tokens-to-horde-magic-
  decklists): an automatic token list at the foot of the deck page when token generators are present; manually
  added tokens could not find a printing (2016).
- **EDHREC** has a `Tokens` archetype tag and no tokens-needed feature (fetched, edhrec.com/commanders/six/tokens).
- **Scryfall data facts** (fetched by curl, scryfall.com/docs/api/cards, /layouts): `all_parts` is an array of
  related-card objects with `id`, `component` (`token`, `meld_part`, `meld_result`, `combo_piece`), `name`,
  `type_line`, `uri`; a card with related parts lists itself as a `combo_piece`; token layouts are `token`, `double_faced_token`
  (both faces in the type line) and `emblem`. `oracle_id` is unique among cards with the same name, tokens included.
- **Where tokens are sold:** a Mana Pool support article says tokens can be listed but not all of them, especially
  double-sided ones, and that they are listed by hand (snippet, support.manapool.com/hc/en-us/articles/
  35075119414807; 403 on fetch). The measurement below shows the price feed carries them. Card Kingdom sells a
  `Card Kingdom Tokens` category (snippet). TCGplayer could not be verified.
- **Player asks** (Archidekt forum, fetched, archidekt.com/forum/thread/2341826/1): list the cards that produce a
  token, a placeholder for a token with no official card, alternate printings and foil, export tokens with the list,
  **track owned tokens in the collection**, and emblems, dungeons and the monarch marker (which Hugh's ruling 4
  leaves out).
- **Not found or not verifiable:** ManaBox, Deckstats, MTGGoldfish and Deckbox token handling; Reddit threads
  (blocked to the search tool); whether any tool marks tokens owned from a collection; whether Mana Pool sells
  tokens in practice.

## Fixtures (staging, read-only, measured 2026-10-11)

Account `user_3GkZrrTwOJBdqUpq6GambP0BC8w`: 21 decks, each deck's cards plus its commander, read from staging and
joined to the `oracle_cards` bulk fetched the same day (`pnpm catalog:fetch`). Part ids resolved through
`default_cards`: **128 of 128 resolved**. Nothing was written.

**Every one of the 21 decks makes tokens: 121 deck-and-token pairs, 80 distinct tokens (61 distinct names).** Without
`Copy`, 79 and 20 decks. The cheapest priced Mana Pool printing exists for **all 80** (median 15 cents, the 80
together $27.17); the feed has 6,039 rows on token printings and the price ingest drops all of them.

| Deck | Id | Committed | Tokens | Without `Copy` | Cards that make them |
|---|---|---|---|---|---|
| HD - Omnath | `dcf9a86d-f6ef-4c7c-a20c-a9807c7cdfbd` | yes | 14 | 13 | 16 |
| HD - Eldrazi | `0b49cb44-8ae2-4c19-b558-633344a2f4ed` | yes | 10 | 9 | 10 |
| HD Tune - Prismari Artistry | `1a352a97-00fc-4309-a60e-5d518d56d34f` | yes | 8 | 7 | 22 |
| HD - Kratos | `2bd462de-5f94-47e5-bd29-eabea5921c75` | brew | 8 | 7 | 10 |
| HD - Gishath | `904fdc61-e190-4ba5-8e34-2b18fa0584f2` | brew | 8 | 7 | 7 |
| HD -Thorin | `40bb31db-dfc9-465b-af94-44e2ab83ed5d` | brew | 8 | 7 | 19 |
| HD - Soldiers | `122c9884-fd27-4a80-bd2c-6166d9e7e6ac` | yes | 7 | 7 | 10 |
| HD Tune - Scrappy Survivors | `c8b95d73-f5c7-4049-99a6-b7063bfb8522` | yes | 7 | 6 | 10 |
| HD Tune - Sultai Arisen | `659c1ad2-acef-4fb0-9554-ade8fab72c30` | yes | 6 | 6 | 6 |
| HD Tune - Blood Rites | `783df427-d0c5-456a-805e-cdc94ecb0952` | yes | 6 | 6 | 10 |
| HD - Brago | `f7380a97-3f58-41a1-8d4e-7342ec01b054` | yes | 6 | 6 | 6 |
| HD Tune - Mutant Menace | `8da5f286-9c80-4330-a6f9-06f5fd6756f8` | yes | 5 | 4 | 5 |
| HD - Yuriko | `fc97e49c-a2f3-4944-8436-3df8db102bd5` | yes | 5 | 4 | 6 |
| HD Tune - Counter Intelligence | `2829cf41-1e07-4ec7-8353-8b0d9dfd678b` | yes | 4 | 4 | 5 |
| HD - Zombies | `cbfb48c5-b085-4e60-889a-a861e9b39bd6` | yes | 4 | 4 | 9 |
| HD - Gods | `13a6dc28-958c-4591-a2bb-c0297bbe5d92` | yes | 4 | 4 | 4 |
| HD - Avatar Aang | `0f585441-203e-475b-be7c-f11e67e20d79` | yes | 4 | 4 | 6 |
| HD - Elves | `86ce528f-836d-476f-9ee8-88470bb2b0e3` | yes | 2 | 2 | 2 |
| HD - Goblins | `7284ff0a-6e76-4dc0-8af5-fc630a403b2b` | yes | 2 | 2 | 6 |
| HD - Tovolar | `cc306935-26c9-4e30-8f0c-e0cec410cf8b` | yes | 2 | 2 | 7 |
| HD - Wizards | `7653dec3-bcf4-4045-8242-9000765c7601` | yes | 1 | 0 | 1 |

**Aang, the case to draw first** (`0f585441-203e-475b-be7c-f11e67e20d79`): four tokens from six cards.

| Token | Type, power and toughness, color | Made by | Printings | Cheapest Mana Pool |
|---|---|---|---|---|
| Ally | Token Creature, 1/1, white | Appa, Steadfast Guardian; Katara, Water Tribe's Hope; The Cave of Two Lovers | 5 | 15c |
| Monk | Token Creature, 1/1, red | Crescent Island Temple | 2 | 15c |
| Soldier | Token Creature, 2/2, red | Firebender Ascension | 1 | 15c |
| Food | Token Artifact | Momo, Playful Pet | 63 | 15c |

**Across the decks:** Treasure is made by 13 of 21 (99 printings, one oracle id); `Copy` by 10; the Bird (2/2, blue)
by 5; Thopter, white Human Soldier 1/1 and white Soldier 1/1 by 3 each. Kratos, Gishath and Thorin, the brews, make
8, 8 and 8.

**Name collisions with real cards** (for Open question 6): `Ninja`, `Spirit`, `Timeless Witness` and `Treasure` are
each both a token name and a real card's name.

**Ownership:** unknown. Hugh's last upload (`The Vault (11).csv`, 2026-10-02, 3,550 rows) skipped 155 rows by
design (tokens, double-faced tokens, emblems or art cards); no row was kept. Reproduce the rest with a read-only script that joins `deck_cards` and the commanders to
the `oracle_cards` bulk and the `default_cards` printing ids (`pnpm catalog:fetch` makes the files;
`connectStaging` in `scripts/eval/lib/staging.mts` refuses a writable connection).

## The About entry owed

A feature a reader would not find unaided owes an entry in the round that ships it (`AGENTS.md`, "No FEATURE
launches without an About entry"). Design draws it on the per-entry artboard in
`design/design_handoff_the99_about/` (title, route, `opens`, caption, specimen and fixture props, up to four key
lines, the phone reduction); the plan names the entry and the `ABOUT_VERSION` bump as a task beside the PR
boundaries. The catalog, upload and surface work may ship as more than one PR; the bump and the entry ride the
last, with the switch.

## Paths

- Catalog: `src/lib/scryfall/transform.ts`, `transform-printings.ts`, `seed.ts`, `seed-printings.ts`, `bulk.ts`;
  `src/lib/cards/game-card.ts`; `src/lib/catalog/fingerprint.ts`, `fetch-dir.ts`; `scripts/catalog-fetch.ts`,
  `scripts/check-scryfall-contract.ts`.
- Upload: `src/lib/collection/match.ts`, `import.ts`, `src/lib/manabox/parse.ts`; `csvUploads` and
  `skippedPrintings` in `src/db/schema.ts`.
- Shopping: `src/lib/decks/shopping.ts`, `availability-query.ts`, `src/components/decks/decklist.tsx`,
  `price-strip.tsx`; the neighbouring brief `docs/superpowers/design-briefs/2026-10-11-all-decks-shopping-cart.md`.
- Prices: `src/lib/manapool/seed-prices.ts`, `parse.ts`, `links.ts`.
- Surfaces to reuse: `combo-partners-detail.tsx`, `card-modal.tsx`, `card-fact-mark.tsx`, `deck-stats-view.tsx`,
  `BuyTag` (`buy-tag.tsx`).

## Deliverable

A handoff in `design/design_handoff_the99_tokens/`: the tokens block on Aang, Omnath (14) and Wizards (only
`Copy`) at 900 and 390; a token tile in each state (owned, not owned, not known yet, joined to Shopping); the
makers list for one maker and for nineteen; the card-details line; the Shopping row for a joined token; the
`STATES` rows and design-table sections they add; and the About entry on the per-entry artboard.
