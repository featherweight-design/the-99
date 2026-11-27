# Readiness Review — Cart on your wishlist

**Verdict:** 🟡 Yellow (Design-side note; a cold audit may replace it)
**Reviewed:** 2026-11-27
**Related ticket(s):** none (Hugh's ask; canvas approved 2026-11-27 after R1c)
**Plan PR target:** TBD

## Summary
An opt-in switch in Settings › Wishlist, "Keep my shopping on my wishlist", puts the cards Shopping lists for your decks onto
your wishlist and keeps them in step. A From row holds the shipped searchable FilterPanel to choose decks (every deck starts in,
new decks join), mirrored by "Keep off my wishlist" in each deck's ⋯ menu. The owner's Wishlist tab splits into "Added by you"
and one DeckBox per deck; friends see one list, unchanged. Trade matches roll up per friend per day, with one push a day at most.
Every frame is the shipped components with `scratch-gen/proposal.diff` applied (a reference, not code to apply blindly).

## Notes for the plan
- 🟡 **New data.** `wishlist_items` needs a source (hand vs synced) and the synced decks per line, or a separate synced set read
  into the tab (G1). A user pref for the switch and the offer dismissal, and a per-deck "keep off" column beside
  `hidden_from_friends` (G3). Migration required.
- 🟡 **Sync job** (G2): recompute from `loadDeckBuyRows` over all decks (never the cart's selection, which is a view) on deck
  commit/draft write, collection write and setting change. Deck lines want owned + still needed, so the shipped collected sweep
  removes them; cut/untick removes them without a collected receipt.
- 🟡 **Trade-match roll-up** (G4): one feed item per friend per day (keep card+friend dedupe for "told once"), at most one
  trade-match push a day in the shipped words and overnight hold. Applies to hand-picked lines too (decision A).
- 🟡 **Price drop** (G5): synced lines get no price baseline.
- ✅ **Friend side unchanged**: You have it, Offer, Friends chip, friend Wishlist tab.
- ✅ **No new components**: DeckBox/DeckBoxBand, Wishlist tiles, Checkbox, FilterPanel, the deck ⋯ menu's checkbox row,
  the collected strip shell, FeedItemRow.
- 🟡 **Copy.** New strings (Settings section, DECKS_PANEL_COPY, offer strip, group bands, rolled feed row) are DRAFT for `/copy-review` (G6).
