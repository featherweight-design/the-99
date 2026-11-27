# Cart on your wishlist · R1

Account 2, 2026-11-27. Status: **R1 for Hugh's review.** Canvas (Design type): https://claude.ai/artifact/VhLtmwDv6aMtudcYG7kXuN
(Main, Wishlist-Desktop, Wishlist-Phone, Offer, Settings, Friend, Notices).

Hugh's ask (2026-11-27): move the cart to the wishlist, or keep the two in sync (opt-in), so friends see what you're shopping
for and friends' spares get matched, without a flood of notifications. Direction agreed in the thread: **an opt-in sync**, with the
owner's Wishlist tab showing what they added apart from what each deck added; friends see one list.

Read with: `design_handoff_the99_social_r2` (wishlist tab, tiles, collected sweep), `design_handoff_the99_you_have_it(_r2)`
(friend side: You have it, Offer), `design_handoff_the99_spare_requests`, `design_handoff_the99_push` (delivery A, overnight
hold), `design_handoff_the99_all_decks_cart(_v2)` (the cart's rows: every deck, brews included).

Every frame is rendered from main with the shipped components and the shipped CSS, with `scratch-gen/proposal.diff` applied.

## Calls

1. **One switch, Settings › Wishlist** (board `Settings`). A new section after Spares, drawn as Your decks draws its rows
   (shipped `Checkbox`, name, line, indented sub rows): `Add the cards my decks need` / `They follow your decks: on when a deck
   needs a card you don’t own, off once you have it or cut it.` Under it every deck, ticked, with a mono `N cards`; unticking a
   deck takes its cards off. Foot: `A new deck is ticked. Cards you add yourself never change here.` Default off.
2. **Offered once on the Wishlist tab** (board `Offer`), while the switch is off and the reader's decks need a card they own none
   of: the collected strip's shell, bookmark glyph, `Your decks need 12 cards you don’t own.` + `Put them here so friends can see
   them. They follow your decks, and leave once you have them.`, ghost `Add them`, ✕ `Not now`. Add them = switch on, all decks
   ticked. ✕ hides the offer for good (stored), the switch stays in Settings.
3. **The owner's tab splits by source** (boards `Wishlist-*`). Switch on: `Added by you · N` first, then one box per deck,
   `For {deck} · N` with `Open deck ›`. Boxes are the deck tabs' shipped `DeckBox` + `DeckBoxBand`; tiles are the shipped
   Wishlist tiles inside. A card two decks need sits in both boxes. Meta line `16 wanted` counts each card once. Search, sort
   (within each box), key and friends line as shipped. Switch off: the shipped single grid.
4. **Deck lines follow their decks.** A deck line wants `owned + copies the decks still need`, so the shipped collected sweep
   removes it at the collection write that reaches it (I got it, Back from Mana Pool, an import). Cutting it from every deck that
   needed it, or unticking those decks, removes it too (no collected receipt: it was not collected). Hand-added lines never change.
   A card that is both: one line, wants the larger, drawn in Added by you.
5. **A deck line becomes yours when you change it**: its stepper in card details moves it to Added by you. Remove keeps that card
   off the synced set until the reader adds it again.
6. **Friends see one list** (board `Friend`): the shipped friend Wishlist tab, no boxes, no deck names, `wants N`. You have it,
   Offer and the Friends chip need no change.

## Quiet (board `Notices`)

- Q1. Trade matches roll up to **one What's new row per friend per day**: `Colin has spares of 4 cards you want` / `Sai, Ghalta and
  2 more. On your wishlist.` / `See Colin’s spares ›`. The picture fans up to three cards behind the first. One match is the shipped
  row.
- Q2. Turning the switch on (or a large import) sends **no push**; matches land as rolled rows only.
- Q3. **At most one trade-match push a day**, shipped words (`tradeMatchOne` / `tradeMatchMany`), shipped overnight hold.
- Q4. Deck lines never get a price baseline, so they never start a **price-drop** notice.
- Q5. Nothing is sent to friends when the wishlist grows.

## Open for Hugh

- A. Q1/Q3 also apply to hand-picked wishlist matches (recommended: yes, one feed rule).
- B. Deck tiles keep the shipped `have M of N` (wanted in all). Recommended: keep.
- C. Brews count, as the cart counts them; untick in Settings. Recommended: keep.

## Engineering gaps

- G1 `wishlist_items` needs a source (hand vs synced) and the synced decks per line, or a separate synced table read into the tab.
- G2 sync job: recompute on deck commit/draft write, collection write and setting change, from `loadDeckBuyRows` (all decks, not the
  cart's selection, which is a view).
- G3 offer dismissal + per-deck untick stored in `user_prefs`.
- G4 trade-match roll-up: a per friend per day item (dedupe key stays card+friend for "told once"), push cap per day.
- G5 price-drop job skips synced lines.
- G6 copy review.

## scratch-gen

SSR recipe (friends_link): copy main, drop `@fwd-stack/*`, `npm install --ignore-scripts`, `tsconfig.scratch.json` + `stubs/`,
`patch -p1 < proposal.diff`, `node css.mjs`, `DATABASE_URL=postgres://x:y@localhost/z npx tsx dz/render.tsx`, `FULL=1 node dz/shoot.cjs`.
The render also sets `HydratedImg` to draw `src` on the server (render only, not in the diff). Card art from account-1 card_search.
