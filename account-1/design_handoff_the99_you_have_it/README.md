# You have a card a friend wants · R3

Account 1, 2026-11-22. Status: **R3, the call-out's press replaced (toggle or filter, Q1 open). No PR until Hugh approves.**
Canvas (Design type): https://claude.ai/artifact/3px7adGsuhz7LDqFqHCMtS (Main, Wishlist, Filter, Sheet, Friends).

The mirror of Find a friend's spares (#3202). There, your Wishlist tile shows a friend's spare and opens Ask. Here, a
**friend's Wishlist tab** marks the cards on it that you have, and the press opens your copies with **Offer**, an ask
turned around. Hugh's brief: on another player's wishlist page; nothing on your own collection.

Read with: `design_handoff_the99_spares_search` (#3202, the tile press), `design_handoff_the99_spare_requests` (Ask, Yes/No,
Waiting on you), `design_handoff_the99_social_r2` (a friend's wishlist), `design_handoff_the99_wishlist_printing` (#3179).
Unchanged: Wishlist stays separate from Shopping; your own Collection and Wishlist draw not## Calls

1. **A friend's wishlist marks the cards you can spare.** The #3202 press on the friend's tile (outlined 26px box over the
   caption's lower right, `TOUCH_HIT` to 44px, the tile press's sibling). **Spares only**, by YOUR rule (`owned − hard −
   soft`, Settings › Spares' threshold and Keep), whether or not your spares are shared with that friend's pods; a copy
   your decks all use draws nothing. Marks on the glyph: accent dot while an ask or offer between you is open (`asked you`
   / `offered`), green tick once agreed (`accepted`). A key line names only what is drawn.
   **No overlap (R2):** once any tile draws a press, every tile's wants line takes the press's 26px height
   (`min-height:26px; line-height:26px`), so the press sits beside it, never under the name, and the grid stays even.
   Loading: the tab as shipped; call-out, key and presses fade in when the read lands (160ms, none under reduced motion).
2. **A page call-out and a filter (R3).** The call-out is a statement: the deck page's to-do card row (`TodoRow`'s mark
   tile, title, body) with no press: eyebrow `Your spares`, `You have 4 to spare` / `Lathliss, Giada, Jace and Tam. Offer
   one from its tile.` (first three and `and N more` past four). The grid narrows by **B (recommended)**: the shipped
   `SegmentedSwitch` (`kind="radio"`, neutral, compact, as History's) under the call-out, left edge, `All · 9` /
   `You can spare · 4`; or **A**: the shipped `Checkbox` labelled `Only these` right after the names (under them on the
   phone, same line from md). Not mirrored to the URL. No spares: neither. The head's count stays the list's.
3. **The press opens your spare, with Offer.** `You have this` in the spares modal's shell (`ModalChrome`, 640 / sheet):
   card box `on Colin’s wishlist · wants 2`, `Your spares · N`, one row with **Offer**; then `Offered` (days left),
   `Accepted` (success), `Declined`. If the friend already asked you, the row is their ask with `AnswerPresses`.
   Offer is Ask in reverse: one press, copies = min(spare, still wanted), the ask's rules (one open per card, 14 days,
   ✕ withdraws). The friend's Waiting on you row: `Spare offer` · `Max is offering you Lathliss` · `Max has 1 spare.
   You want 2.` with Yes and No; Home's lead story and push as an ask's. Their Yes is an accepted request on both sides.
4. **/friends rows count what you can spare (R2, idea B).** The shipped spare chip (glyph + count) before › on a
   friend's row when you can spare any of their wanted cards; it links to their Wishlist tab (its own link, above the
   row's). Zero: nothing.
5. **Phone and desktop:** one design.

## For Hugh

- **Q1 · Toggle in the call-out (A) or a filter under it (B)?** Filter board. Recommended: B, so the call-out stays a
  statement and the control is the list's own.

## R3 · Hugh's note (2026-11-22)

- The `Show ›` button read wrong, and on desktop sat far from the text: replaced by A (toggle beside the text) or B (filter).

## R2 · Hugh's notes (2026-11-22)

- The press overlapped a card's name on mobile → the wants line takes the press's height on every tile.
- `Sparing` read off → the shipped `accepted` / `Accepted`.
- The in-your-decks dot added noise against "spares" → gone; only spares are marked, in the tile and the sheet.
- `{friend} can spare you…` → `{friend} is offering you…`.
- `you have N` in the key misused it → a page call-out built from the deck page's to-do card row.
- B kept (call 4); C (a "You can help" notice) cut as too noisy.

, hold C.

## Files

| File | What |
|---|---|
| `Main.dc.html` | The calls, the questions |
| `Wishlist.dc.html` | F0–F2 phone, D0–D2 desktop: loading, loaded, filtered (with B), close up |
| `Filter.dc.html` | Q1: A (toggle) and B (filter), off and on, phone and desktop |
| `Sheet.dc.html` | F3–F6 phone, D3–D6 desktop: Offer, Offered, asked, accepted |
| `Friends.dc.html` | B1–B2 your /friends count; C1–C2 the offer in the friend's Waiting on you |
| `STATES.md` · `copy strings.ts` · `READINESS.md` | Every state, every new string, the verdict |
| `art/yh3-*.webp` | The frames (2x), rendered from main f17ab2a |
| `scratch-gen/` | How the frames were made (`HOW.md`). Reference only; never import. |
