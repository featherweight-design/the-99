# Let players choose their card store · R1

Account 1, 2026-11-22. Status: **R1, for Hugh's review.** Hugh's brief asked for this round to be opened as a PR. Q1 to Q3 settled
2026-11-22 (below). Canvas (Design type): https://claude.ai/artifact/TnVy9hkHQpVt3AZ3nduNjn (Main, Onboarding, Setting,
Shopping, Card, Elsewhere, Empty).

The 99 quotes Mana Pool alone today. Players at card shops buy from different stores, so each player picks **one** store and
its prices and buy links replace Mana Pool's everywhere a price appears. The app never shows two stores' prices at once.

**Decided by Hugh (brief, 2026-11-22):** stores are Mana Pool (the default), TCGplayer and Card Kingdom; the chosen store's
price and link replace Mana Pool's everywhere; the whole-list cart link exists only where the store supports one (Mana Pool
today); TCGplayer's prices are market averages and get a small accuracy note; the app says once that Mana Pool is the default.

**How it is drawn.** Every frame is a shipped page rendered server side from a scratch copy of main (4a61f27) with the shipped
CSS and fonts: Settings (`SettingsView` with Notifications and Spares, the shell's `NavRail`, `MobileHeader`, `TabBar`), a
deck's Shopping list (`GroupToggle` with `PriceStrip`, `MarkKey`, `DecklistRow` from the landing demo's fixture, deck
"Lanternlight Tinkers"), the all-decks cart's `CartCheckout`, card details (`DemoCardModal`, the shipped modal's parity copy,
on the demo fixture's Giada), the Wishlist tab (`CollectionPlaceHead`, `WishlistView`), Home's `FeedItemRow` and Decks Stats'
`WorthBody`. The new parts are code over them (`scratch-gen/`). Store figures are placeholders (TCGplayer ~9% under Mana Pool,
Card Kingdom ~18% over); card art comes from other handoffs' `art/`.

## Calls

1. **The setting: Settings, first section** (Setting S1 to S6). `/settings` gains **Store** above Notifications, in the
   shipped section pattern (`SECTION_HEAD`, the explain line, rows, a mono foot). First, because it changes what every price
   in the app says and the Change store link lands on it. No user-menu row, no account page: settings stay in one place.
   - **Control: one radio row per store**, Your decks' row layout (name in sans 14 medium, a 12.5 muted line, 44px min,
     hairlines between) with the upload choice's 18px ring (`--accent` when chosen, `--border-dashed` at rest; the native
     radio kept `sr-only` in a `radiogroup`). The rows come from `STORES`, so a fourth store is one more row and one more
     line of copy. A `SegmentedSwitch` was ruled out: three store names barely fit at 390 and a fourth would not, and the
     rows need room to say what each store's prices are.
   - **Saved as it changes** (the page sub already says so), one write at a time like the other sections. A failed write
     puts the last saved store back and raises `SocialToast` with `We couldn’t save that. Try again.`
   - `#settings-store` is the section's id; arriving on that hash washes the section for 2s (`--elevated` fill, a
     `--border-strong` inset ring, fading; none under reduced motion), as `#settings-decks-see` washes its row.
2. **Two doors: a first-run row and a Change store link** (Onboarding O1 to O4; Shopping P1 to P3, K1 to K3; Setting S4).
   - **First run (Hugh, 2026-11-22).** The first-run checklist (`FirstRunChecklist`) gains an unnumbered row after the
     locked steps and the signature row, before Add your friends: `Where do you buy cards?`, the line `Prices and buy links
     come from this store. Change it any time in Settings.`, and the stores as the shipped `SegmentedSwitch` (`kind="radio"`,
     `size="compact"`, `fill`), Mana Pool chosen. The box is the Friends row's live box (`--surface-inset`,
     `--border-strong`, radius 14) with the News row's accent diamond. Not a step: the kicker stays Step 1 of 3 and nothing
     waits on it. A press saves with the Settings write (same failure toast). A fourth store adds a segment; past what 390
     holds, the switch takes its shipped `scroll` option. Once cards are in, the checklist goes and the other doors remain.
   - **Change store (Q2, kept).** No banner or toast. The provenance line on the deck Shopping strip and the all-decks cart's checkout box ends with
   `· Change store`, inline in the line's own mono 9.5 and `--fg-locked`, the link in `--fg-muted` with an underline, the
   inline 44px coarse hit (`TOUCH_HIT_INLINE`), to `/settings#settings-store`. That line names the store on every visit, so
   a player who buys elsewhere reads it where they buy and has the change one press away. Kept beside first run because
   players who joined before this ship never see first run, and a new player who skipped the row meets it where it matters. Its accessible name says the
   current store (`Change store, now Mana Pool`).
3. **Price, link and the label naming the store** (Main's table; Shopping, Card, Elsewhere).
   - Figures stay bare where they repeat: buy tags, Wishlist tile lines, the feed's drop figures, the cart's lines. One store
     at a time, so no tag repeats its name.
   - The store is named once per surface, exactly where the shipped copy names Mana Pool today: the strip and checkout
     provenance, every buy link (`Buy these at {store}`, `Buy any printing at {store}`, `Buy FDC 4 at {store}`,
     `Buy at {store}` on Home), and deck cost (`{store} prices, 2h ago`). `copy strings.ts` lists every shipped string that
     says Mana Pool with its store form.
   - Price-drop alerts watch the chosen store's figure. **Changing store re-baselines** every wishlist line's
     `price_at_add_cents` to the new store's figure at that moment (and clears `price_noticed_at`), so a switch never reads as
     a drop.
4. **The TCGplayer accuracy note.** One fact, three sizes, never on rows or tiles:
   - Strip and checkout: the provenance reads `TCGplayer market prices`, then `averages of recent sales, so a listing can
     differ`, then `last checked …`. Deck cost: `TCGplayer market prices, 2h ago`.
   - Card details: `market price` after the tag (after `from $1.27` when that line shows), mono 10 `--fg-muted`; the tag's
     spoken sentence becomes `$1.29, TCGplayer market price, last checked Sunday`.
   - Settings' TCGplayer row: `Market prices, an average of recent sales, so a listing can cost more or less.`
   - Mana Pool's own cart note (`a cart with shipping or fewer packages can cost more`) stays Mana Pool's, since it is about
     its cart.
5. **Mana Pool is the default, said once**: the foot of the Store section, `Mana Pool is the default. Changing store changes
   every price, buy link and price-drop alert.` Nowhere else.
6. **No whole-list link: copy and paste** (Shopping P2, P2b, P3, D2, D3, K2, K3; Empty E1, E2). Where the store has no cart
   link but has a page that takes a pasted list (`paste` in `STORES`: TCGplayer's Mass Entry, Card Kingdom's Deck Builder),
   the strip and checkout keep the figure and the provenance, then `{store} has no link for a whole list. Copy it, then paste
   it into {store}’s {paste}.` (sans 12.5 `--fg-muted`), then in the link's 44px row two presses, 18px apart:
   `Copy the list` (a button in `ExternalLink`'s face; the export dialog's clipboard logic and 1.5s swap to `✓ Copied`,
   `--success` tick, announced in a `role=status`) and `Open {paste}` (an `ExternalLink`). The text is the shown selection
   as `1 Name` lines. Q3, decided: two presses put the whole list in the store's cart, where buying card by card from each
   card's details is fourteen trips. A store with no paste page keeps the plain line `Buy each card from its details.` The sends line and the back-from band go with the link.
   The same rule removes every other whole-list link for that store: the set page's `Send N to Mana Pool` and a version's
   `Open in Mana Pool`. It is the store's `cart` flag, so a store that gains a link shows it with no redesign.
7. **No price from the chosen store** (Empty E1 to E5; Elsewhere W1). The shipped silence rules, store-named:
   - Rows: the bare `buy` tag; the strip counts it out (`11 of 14 priced`); none priced: `no prices from {store} for these`
     and no figure. Price sort puts them last, as today.
   - Card details: the shipped dashed `no stock` tag (its aria `No price from {store}`), and the link reads
     `Look for it at {store}`: a search, not a claim the store sells it.
   - Wishlist tile: no price line (as for a card never stocked). Home: no drop is raised while there is no figure.

## Settled with Hugh (2026-11-22)

- **Q1 · Where Store sits:** first on Settings, and also in onboarding (call 2, Onboarding board).
- **Q2 · The nudge:** "best user experience" was asked; kept the Change store link (call 2).
- **Q3 · No whole-list link:** "best user experience" was asked; the line plus Copy the list and the store's paste page
  (call 6). The plan measures each paste page's URL and whether it takes a prefilled list (READINESS G3).

## Phone and desktop

One design at both widths. The Store section sits in the shared 720 column; the strip and checkout keep their one layout;
card details put the link in the desktop foot row and at the foot of the phone's full sheet, both as shipped.

## Files

| File | What |
|---|---|
| `Main.dc.html` | The calls, the surface-by-store table, Q1 to Q3 as settled |
| `Onboarding.dc.html` | 1, 2 · the first-run store row at 390 and 1300 |
| `Setting.dc.html` | 1, 5 · the Store section at 390 and 1300, each store, the wash |
| `Shopping.dc.html` | 2, 3, 4, 6 · a deck’s Shopping list per store at both widths, Copy the list, the all-decks checkout box |
| `Card.dc.html` | 3, 4 · card details per store |
| `Elsewhere.dc.html` | 3 · the Wishlist tab, Home's price drop, What each deck is worth |
| `Empty.dc.html` | 6, 7 · no whole-list link, some and no prices from the store |
| `STATES.md` | Every state |
| `copy strings.ts` | New strings, the store list, and every shipped Mana Pool string with its store form |
| `READINESS.md` | Readiness and the engineering gaps |
| `art/sc-*.webp` | The frames (2x) |
| `scratch-gen/` | The renderer and the proposal code. Reference only; never import. |

Open the `.dc.html` files next to `support.js` and `art/`.
