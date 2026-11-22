# Readiness Review — Wishlist remembers the printing you want, R1

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-22 (against origin/main 016e0ba, which carries alternate printings R2 in code and R3 as a handoff, #3173)
**Related:** alternate printings R1–R3 (#3002); Social R2 (wishlist, call 10); menu and Home G2 (price drops)
**Plan PR target:** TBD (docs/superpowers/plans/)

## Summary

Buildable as drawn once alternate printings R3 ships (the phone panel and its foot depend on it) and "browse printings from the
Wishlist's card window" lands (Hugh: ships ahead of this handoff; the boards assume `browsePrintings` on the Wishlist's
provider). It needs one column, per-printing price reads on the Wishlist tab, and a printing-aware link-out. No Design
round-trip is needed. Copy is DRAFT and goes to copy-review.

## What this reverses

- Alternate printings R1 Q7 ("the wishlist stays per card"): a line may now name one printing.
- Kept: Social R2 call 10 (Want it never touches Shopping; Hugh, 2026-11-22). Deck slots owned-only. R3's browse and preview.

## Per-dimension findings

### 🔌 Data contract
- 🟡 `wishlist_items` gains a nullable printing: `scryfall_id` (preferred, what `previewId` already selects by) or
  `set_code` + `collector_number`. Null = any printing. Migration, no backfill.
- 🟡 `loadWishlistTiles` reads `prices.get(oracleId)` (cheapest). A line with a printing reads that printing's fact through the
  same `loadPrices` result (`byScryfallId` / `byPrintingKey`); `priceState` against the read's `newestAsOf` gives `sold out`.
  The tile also needs the printing's `imageUri`, `setCode`, `collectorNumber`.
- 🟡 Price drop (`src/lib/feed/price-drop.ts`): the job's `nowCents` becomes the chosen printing's live figure when set.
  Choosing, changing or clearing the printing rewrites `price_at_add_cents` (and clears `price_noticed_at`) in the same write.
  The feed line takes `at {set} {number}.`; the item needs the printing on its payload.
- 🟡 Link-out: `manapoolCardUrl(name)` is name-only by design (all-printings grid). A wanted printing needs a printing target.
  `manapoolAddDeckUrl` already takes `[SET] number` lines (measured 2026-10-11 for tokens); use a one-line add-deck link or a
  measured card-page URL. Decide in the plan, measured in a browser.
- ✅ A friend's wishlist read (`src/lib/social/wishlist.ts`) is unchanged: friends see `wants N`, never the printing.

### 🎭 State coverage
- ✅ Tile: any, chosen, chosen sold out, at phone and desktop. Card window: choose and chosen at both widths, sold out at both,
  opened from a chosen tile, the desktop panel.
- 🟡 Not drawn: a chosen printing never stocked (no price: the tile line is the printing alone, the box line drops its figure),
  a wanted printing with no art (strip's `identityGradient`), the failed write (the shipped `SocialToast`, `failedSet`).

### 🧱 Codebase fit
- ✅ Parts reuse: `CardWishlist` (box), R3's `PrintingsPanel`, `printing-strip.tsx` labels, `WishlistTileFace`, the shipped
  bookmark glyph, `RECEIPT_LINK_CLASS`-style link press, 44px coarse hits.
- 🟡 Writes go through a new action beside `setWishlistWantAction` (one write at a time, as the box does today).
- 🟡 `scratch-gen/` is reference only; it patches with `globalThis` hooks. Never import.

### ♿ Cross-cutting
- 🟡 The want press announces `Wanted {set} {number}.` through the modal's live region; the tile press's label appends the
  wanted printing (`wishlistCaptionText`).
- ✅ Phone hits 44px; the foot sits inside the panel's dialog.

## Non-blocking questions (default in brackets)

- Collected sweep: the want counts copies in all, so owning ANY printing still collects the line [unchanged: any printing
  collects it]. A "only this printing counts" rule would change `sweepCollectedIn` and `wantFloor`; ask Hugh before doing it.
- Trade matches and spare markers stay per card [unchanged].

## Decisions inherited

- Calls 1–5 and Q1–Q3 as drawn (Hugh, 2026-11-22). Strings DRAFT. No new switch: ships with its build PR.
