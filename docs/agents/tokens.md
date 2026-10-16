# Tokens (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **The printings ingest also builds the token catalog** (`tokens`, `token_printings`, `card_tokens`;
  plan `2026-10-11-tokens-for-my-deck.md`), from the same `default_cards` pass: `src/lib/tokens/catalog.ts`
  holds the rules, `publish.ts` the transaction. A token is a `token` or `double_faced_token` printing
  (or a token filed as a `reversible_card`), never an emblem or art-series card; a card makes a token
  only through an `all_parts` entry with `component: "token"`, resolved through a token printing seen in
  the same stream. Tokens and their printings are UPSERTED and never deleted (ownership will reference
  them); `card_tokens` is an exact replace in the same transaction. Not a `cards` column, so the catalog
  fingerprint does not move and no copy is involved. The run REFUSES under a floor (`TOKEN_FLOORS`, about
  half of the 2026-10-11 measurement) and exits non-zero with the previous rows standing, and SKIPS
  cleanly when the tables do not exist yet, because production's migration applies in its next build and
  a refresh can reach it first. `pnpm check:scryfall` scans for a token printing and a card naming it,
  which the first-entry read cannot see.

- **`pnpm db:seed:prices` also prices tokens** (`token_printing_prices`, plan `2026-10-11-tokens-for-my-deck.md`):
  a feed row whose id is a `token_printings` id is written in the SAME transaction as the card rows, and the
  step skips cleanly when the token tables do not exist yet. **A token's link line names Mana Pool's own
  product, not Scryfall's printing**: the table stores the feed's `name`, `set_code` and `number`
  (`product_*`) because they differ from Scryfall's on 42% of priced token printings (a double-faced token
  card is `Soldier // Eldrazi`, `1-17`, under the single token's Scryfall id). `tokenManapoolLine`
  (`src/lib/tokens/price.ts`) builds the line and drops a number Mana Pool cannot place exactly (`1★`) to
  the name alone; `pnpm probe:manapool-token-link` is the proof, in a browser. A run that prices fewer than
  `TOKEN_PRICE_FLOOR` (1,400, half of the 2,919 measured) token printings against a POPULATED token catalog
  writes the card prices, writes NO token prices and exits non-zero: a collapsed id match would otherwise leave
  the table's newest `as_of` unchanged and every old token price reading as live. The same refusal applies when
  fewer than `TOKEN_IDENTITY_SHARE` (90%) of the matched rows carry Mana Pool's name, set and number (100% did on
  2026-10-11): a renamed feed field would otherwise erase every stored product identity.

- **Token ownership is recorded by the upload, in its own transaction** (`token_ownership`, `token_reads`; plan
  `2026-10-11-tokens-for-my-deck.md`, PR 3). `matchRows` names the token a row is from `token_printings` (never from
  a layout: emblems and art series are not tokens, and a token filed as a `reversible_card` is), the preview payload
  carries the per-token sums, and `writeUploadTokens` runs inside `replaceCollection` AND the ledger's
  `applyCollectionChange`, so a failing token write rolls the whole confirm back. **Three states, never two**:
  owned (a row), not owned (no row, and the account has a `token_reads` row), not known (neither). Only a confirmed
  upload writes the marker, including one that read an EMPTY list (a preview payload with no `tokens` at all, from before
  tokens were read, writes nothing: `recordUploadTokens`); a hand mark (`I have one`) never does, or one mark
  would turn every other token from unknown into not owned. Replace removes upload rows only (and, first, the player's joins for every token whose
  row it removes, since a held token's join is pre-rule); a hand mark an upload
  also reads becomes an upload row. The review screen's `skipped by design` count still includes tokens: they are
  not in `collection_items`.
  **Which PRINTINGS are held** is `token_printing_holdings` (token printings TP1, plan
  `boards/plan-token-printings-2026-10-14.md`): detail beside `token_ownership`, which stays the token-level truth
  every owned / not owned / not known reader asks. The upload's `TokenHolding` carries each token's `printings` (the
  row's own Scryfall id, which `matchRows` already resolves), and a precon add keeps the box's printings on its
  `collection_history.precon_tokens` entry. `writeUploadTokens` writes `upload` rows (Replace removes them all
  first, Add accumulates) and `syncPreconTokens` re-derives the `precon` rows whole from the standing adds, in the
  transactions they already run. A hand mark names no printing and writes none; a payload or an entry from before
  this names none either. `deck_token_printings` holds one chosen printing per token per deck, with no `card_tokens`
  maker join (a token only the commander makes is a deck's token too). That a pick's printing is OF its
  token is checked by the writer and the reader, never by a pair key: the token ingest upserts a printing's
  `token_oracle_id`, and such a key would roll back the whole catalog publish the day Scryfall re-filed a picked
  printing. `pnpm probe:token-printings` proves the writes on a scratch branch.
  **A deck's token printing** (TP2, behind `DECK_TOKENS_ENABLED`) follows a card's chain (`src/lib/tokens/deck-printings.ts`):
  the deck's pick while the player holds that printing, else the printing they hold most copies of that has art (as `primaryPrinting` skips an artless one), else the catalog's
  art; a pick no longer held is ignored, never deleted. `writeDeckTokenPrintingIn` is the ONE writer (the picker's
  `setDeckTokenPrinting`, and a precon start's `writePreconDeckIn`: with the box, after the add's `syncPreconTokens` wrote the holdings; a plain
  start, only what an earlier add or an upload already holds): it refuses a printing not of that token and one the player holds no
  copy of, and `loadDeckTokenPicks` joins on the token as well, so a row written past it reads as no pick. The picker
  is the card's own, opened from the token row's details: `loadTokenDetail` lists the held printings (with the switch
  on), the provider gives a deck token the deck's scope from the deck tokens context, and the modal draws a token's
  picker only where that scope can save, since a token has no Collection-wide preference.

- **A deck's tokens are read by `loadDeckTokens` and written by two actions** (`DECK_TOKENS_ENABLED`, staging on, production off;
  plan `2026-10-11-tokens-for-my-deck.md`, PR 4a). The makers are the deck's `deck_cards` UNION both commanders (a commander
  makes tokens too), joined through `card_tokens`; `assembleDeckTokens` is the pure half. **A held token is never drawn as joined**
  whatever its `deck_token_joins` row says, and every write that makes a token held also deletes ALL of the player's joins for it, in
  the same transaction: `I have one` and the Shopping row's buy tag (`setTokenHeld`), and an upload that reads it
  (`writeUploadTokens`). Owned means owned for every deck, and unmarking restores no join. Rules text
  is attached only to a token sharing name, colors and P/T with another in the same deck. The loader never throws (a failed read is
  `failed`, drawn as the group's own line), and the actions revalidate the deck page and the cart, never Home or `/decks`: a token
  moves none of their figures. `pnpm probe:deck-tokens` proves the queries on a scratch branch (docs/probes.md).
  **Shopping** (PR 5): a deck's joined tokens are the Tokens group LAST on its Shopping view (`TokensShoppingGroup`), and the buy
  box (`PriceStrip`) takes them in: its figure is what the link buys, a split line keeps the cards' cost apart from the tokens',
  and the link carries a line per token (`tokenShopping`, from the loader's own read). `summarisePrices`, `shoppingCount`, the
  status and the roll-up stay the cards' alone (pinned in `decklist.test.tsx`). The buy tag on a token row is the shipped tag as a
  button of its own: one press marks the token held, no confirm. A joined token whose maker has left the deck stays joined and
  says `from no card in this deck`, with only its remove press (a hand mark on it could be unmarked from nowhere, since the unmark holds the same maker rule).
  **Card details and About** (PR 6): from a deck, a card that makes one of the deck's tokens gets one line at the foot of the
  `In this deck` box (`TokenCardLine`, passed to `ProxyControl` as its `footer`): `Makes an Ally token · In Shopping`
  (or `· in your collection` when every token it makes is held) and a `Tokens ›` press that closes the sheet and scrolls to the
  group. It reads the deck's own tokens through the provider, so it is absent with the switch off, outside a deck and for a
  card no token comes from. The About entry `deck-tokens` follows `DECK_TOKENS_ENABLED` through `AboutSwitch` and is
  `since: 14`, the current version: a switched entry is announced when its switch flips, so the line **bumped nothing** and
  only re-pinned the content hash.
