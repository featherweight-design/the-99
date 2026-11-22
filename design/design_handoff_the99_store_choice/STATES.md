# States · Let players choose their card store R1

Frames named as on the canvas. "Store" is the reader's chosen store; a reader who never chose has Mana Pool.

## Settings · Store section

| State | Trigger | Draws | Must not |
|---|---|---|---|
| Default (S1, S5) | Never chosen | Mana Pool's ring filled; three rows; the default foot | Name a store "recommended" |
| Chosen (S2, S3) | A row pressed | That ring filled at once; written in the background | Ask to confirm, or show a Save press |
| Saving | Write in flight | Rows disabled until it lands (one write at a time, as Your decks) | Draw a spinner |
| Save failed | Write refused or threw | Ring back to the last saved store; `SocialToast` "We couldn’t save that. Try again." (role alert) | Leave the new ring filled |
| Arrived from Change store (S4, S6) | `/settings#settings-store` | Section scrolled into view and washed for 2s, then fades; no fade under reduced motion | Wash on a plain `/settings` visit |

## Shopping strip and the all-decks checkout

| State | Trigger | Draws | Must not |
|---|---|---|---|
| Mana Pool (P1, D1, K1) | Store has `cart` | As shipped + `· Change store`; Buy these at Mana Pool; parts as shipped | Change the cart's parts or sends |
| Market store priced (P2, D2, K2) | TCGplayer | `TCGplayer market prices · averages of recent sales, so a listing can differ · last checked … · Change store`; the no-link line | Draw the cart note or a buy link |
| Listing store, no cart (P3, D3, K3) | Card Kingdom | `single-copy prices on Card Kingdom · last checked … · Change store`; the no-link line | Draw a disabled link |
| Some unpriced (E1, E3) | Store has no figure for some rows | Figure of the priced; `11 of 14 priced`; bare `buy` rows last under Price sort | Count them as $0 |
| None priced (E2) | Store has no figure for any row | `no prices from {store} for these · …`; no figure | Draw `$0.00` |
| Behind | Store's newest `as_of` past 10 days | `these are behind` as shipped, per store | Mix two stores' dates |
| Price read failed | As shipped | Strip absent as shipped (checkout: `copy.checkout.unread`) | |
| Nothing selected (cart A4) | As shipped | Provenance line + Change store; no figure, no link, no no-link line | |

## Card details

| State | Trigger | Draws | Must not |
|---|---|---|---|
| Listing store (C1, C3, C4, C6) | Mana Pool, Card Kingdom | Tag; `Buy any printing at {store}` | Name the store on the tag |
| Market store (C2, C5) | TCGplayer | Tag, `from $x` when shown, `· market price`; spoken `$x, TCGplayer market price, last checked …` | Put the long note here |
| No price (E4, E5) | No figure from the store for this printing | Dashed `no stock` (aria `No price from {store}`); `Look for it at {store}` | Draw a figure or `$0.00` |
| Token | As shipped | `Buy this token at {store}` where the store prices tokens (READINESS G5); else no tag, the search link | |

## Wishlist, Home, deck cost

| State | Trigger | Draws | Must not |
|---|---|---|---|
| Tile priced (W1, W2) | Store figure | The shipped line in the store's figure | Name the store |
| Tile, no price (W1 Mothman) | No figure from the store | No line (or the printing alone when one is chosen) | Draw `no stock` on a tile |
| Wishlist box link | Chosen printing / any | `Buy {set} {n} at {store}` / `Buy any printing at {store}` | |
| Store changed | Settings write lands | Every wishlist line re-baselined to the new store's figure, `price_noticed_at` cleared | Raise a drop from the switch |
| Price drop (H1 to H3) | The store's figure falls | Shipped item; press `Buy at {store}` | |
| Deck cost (V1 to V3) | Stats tab | `{store} prices, 2h ago`; TCGplayer `TCGplayer market prices, 2h ago` | |

## Not drawn (no trigger)

- Two stores' prices side by side: ruled out by the brief.
- A first-run prompt or banner: call 2 rules it out.
- A store that is down or unread: the shipped "price read failed" path covers it, per store.
