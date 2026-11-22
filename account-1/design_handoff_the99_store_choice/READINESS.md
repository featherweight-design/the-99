# Readiness Review · Let players choose their card store, R1

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-22, self-assessed by account 1 against origin/main 4a61f27
**Related:** price on the buy tag (#288, `src/lib/copy/price.ts`), card detail R2 (the tag), all-decks cart v2, wishlist
printing (#3179), menu and Home (Settings, price drops), set collections (Send to Mana Pool)
**Plan PR target:** TBD (docs/superpowers/plans/)

## Summary

The UI is small and reuses shipped parts: one Settings section, one inline link, and copy that takes a store. The weight is
data: today every figure is Mana Pool's (`printing_prices`, `token_printing_prices`) and every link is built by
`src/lib/manapool/links.ts`. Two new price sources and a per-store link builder are needed before the UI can ship. No Design
round-trip is needed for that; Q1 to Q3 are Hugh's. Copy is DRAFT for `/copy-review`.

## Per-dimension findings

### 🔌 Data contract
- 🟡 **G1 · The reader's store.** `user_prefs.store` (text, null = Mana Pool, checked against `STORES`), one migration, no
  backfill. Read once per request beside `requestFlags` and passed down as a `Store`, never read in a client component.
  `user_prefs` carries the `user_data_touch` trigger, so the write runs only when the value changes (as
  `markUpcomingSeen` does).
- 🟡 **G2 · Prices per store.** `printing_prices` gains a `store` column in its key (or a sibling table per store); every
  reader (`loadPrices`, `priceState`'s newest `as_of`, cart, stats, wishlist, set cost, collection value) filters by the
  reader's store. Liveness stays the table's own rule, measured per store: each store's newest `as_of`, never across stores.
  - TCGplayer: Scryfall's `default_cards` bulk (already fetched daily by `catalog:fetch`) carries `prices.usd`,
    `usd_foil` and `usd_etched`, TCGplayer's market price per printing. No new upstream; a new seed step.
  - Card Kingdom: not in Scryfall's prices. Card Kingdom publishes a price list; the plan measures its URL, terms, shape and
    refresh in a spike before committing (`check:*` contract like `check:mtgjson`).
  - A printing a store does not price has no row, so silence works unchanged.
- 🟡 **G3 · Links per store.** `src/lib/manapool/links.ts` becomes one builder per store behind `storeLinks(store)`:
  `cardUrl(name)`, `printingUrl(printing)`, and `cartUrls(lines)` only where `cart`. Scryfall's `purchase_uris`
  (`tcgplayer`, `cardkingdom`) give per-printing pages, so a chosen wishlist printing can land on that exact printing at
  those stores (better than Mana Pool's, which the 2026-11-22 measure found has no page per printing). The name search URLs
  and any affiliate terms are measured in a browser in the plan; Scryfall's purchase links are its partner links.
  - Paste pages (Q3): `pasteUrl()` per store with `paste`. The plan confirms each page in a browser (TCGplayer Mass Entry,
    Card Kingdom's Deck Builder: name and URL are drafts) and the line format each reads (`1 Name` assumed). If a page
    takes a prefilled list in its URL, that is a whole-list link: set `cart: true` for that store and the paste row gives way
    to `Buy these at {store}` with no redesign. Ask Hugh before that, since his brief said Mana Pool alone has one today.
- 🟡 **G4 · Price drops follow the store.** `src/lib/feed/price-drop.ts` reads the reader's store's figure. The Settings
  write re-baselines that reader's `wishlist_items.price_at_add_cents` to the new store's figure and clears
  `price_noticed_at`, in the same transaction, so a switch never fires a drop. Push copy names no store and is unchanged.
- 🟡 **G5 · Tokens.** Token prices and lines are Mana Pool products (`token_printing_prices`, Mana Pool's own set and
  number). For TCGplayer, Scryfall prices token printings too; for Card Kingdom the spike decides. Until then a token with no
  figure from the store follows call 7 (no tag, a search link). Ask Hugh before dropping tokens from a store's figure.
- ✅ Nothing friend-facing changes: a friend never sees another reader's store.

### 🎭 State coverage
- ✅ First run: the store row untouched and picked, at both widths. Copy the list and its Copied swap.
- ✅ Settings: default, each store, the wash. Strip and checkout: each store at both widths, some and none priced.
  Card details: each store, no price. Wishlist, Home and deck cost per store.
- 🟡 Not drawn: the first-run row's save failed and a copy that failed (both shipped patterns), saving and save failed in Settings (shipped patterns: disabled rows, `SocialToast`), the strip's `behind`
  per store (shipped words), the set page's Send link hidden for a non-cart store (same rule as the strip), a token's card
  details per store. All in `STATES.md`.

### 🧱 Codebase fit
- ✅ Parts reuse: `FirstRunChecklist` (a `store` prop, null on a failed read), `SegmentedSwitch`, the export dialog's
  clipboard logic (`ExportCopyButton`'s, lifted into a hook or shared), `SettingsView`, `SECTION_HEAD`, Your decks' row layout and wash, the upload choice's radio ring,
  `PriceStrip`, `CartCheckout`, `ExternalLink`, `TOUCH_HIT_INLINE`, `PriceTag`, `BuyTag`, `SocialToast`. No new tokens,
  motion or dependencies.
- 🟡 Copy: every shipped string that names Mana Pool for a price becomes a function of the store (`copy strings.ts` lists
  each). A `check:` guard should fail a new literal "Mana Pool" in price copy outside the store's own entry.
- 🟡 About: the prices lines and screens that say Mana Pool. A label is at Hugh's discretion; the text changes regardless.
- 🟡 `scratch-gen/` patches with a `globalThis.__STORE` hook and the landing demo's modal copy. Reference only; never import.

### ♿ Cross-cutting
- ✅ The Store rows are a `radiogroup` of native radios (arrow keys move the choice, as the upload choice), 44px rows.
- ✅ Change store's name says the current store; its coarse hit is 44px inline.
- ✅ The first-run switch is a `radiogroup` named `Store for prices and buy links`, inside a section labelled by its title.
- ✅ Copy the list's name gives the count (`Copy the list, 14 cards`); the result is announced, focus stays put.
- 🟡 The tag's spoken sentence carries the market note for TCGplayer (`priceCopy.aria` takes the store).

### ⚖️ Legal and credits (G7)
- 🟡 The Fan Content notice says "prices from Mana Pool" and "Not affiliated with … Mana Pool"; the landing and About say
  "Prices from Mana Pool"; the privacy policy may name where outbound links go. These name every store the app quotes.
  Hugh decides whether any store needs to be told or asked before launch (terms of Card Kingdom's list, Scryfall's partner
  links).

## Non-blocking questions (default in brackets)

- Q1 to Q3: settled 2026-11-22 (README).
- Does the collection value (Collection's price) follow the store too? [yes: it is a price the app quotes]
- Should a signed-out landing or demo name the stores? [no: Mana Pool, as today]

## Decisions inherited

- Hugh's brief, 2026-11-22: stores, replace everywhere, cart only where supported, TCGplayer note, default said once.
- Hugh, 2026-11-22: the store is also in onboarding; Q2 and Q3 to the best experience (kept Change store; copy and paste).
- Silence is a state (`price.ts`); one layout for the strip at both widths; the cart's parts (K3); Shopping stays deck-only.
