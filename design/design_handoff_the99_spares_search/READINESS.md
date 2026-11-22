# Readiness Review · Find a friend's spares, R1

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-22, against origin/main 14f9519
**Related:** Social R2 (R3 `Spares` S1–S4), spare requests (calls 1–6), collection filter + filter chassis, wishlist printing (#3179), store choice (#3200, in flight)
**Plan PR target:** TBD (docs/superpowers/plans/)

## Summary

Buildable from shipped parts once Hugh answers Q1–Q3 (defaults drawn). The Spares tab needs three more facts per line and a
client-side filter; the Wishlist needs the deck page's spares provider mounted over its tiles. No new table, no migration, no
switch beyond the shipped `SOCIAL_FRIENDS_ENABLED`. Copy is DRAFT for `/copy-review`. It depends on Collection's type-word
search for the shared matcher; if this builds first, it adds that matcher and Collection adopts it.

## What this reverses

- Social R2 R3: "spare marker ... off wishlist tiles". The press returns to the tile at Hugh's ask (2026-11-22).
- Kept: Shopping stays deck-only (Social R2 call 10, wishlist printing ruling); All draws no request marks; the modal and its Ask are unchanged.

## Per-dimension findings

### 🔌 Data contract
- 🟡 `FriendSpareLine` (`src/lib/social/spares.ts`) gains `typeLine` (front face's for two-faced cards), `colorIdentity` and
  `deckNeed` (how many of the reader's decks have the card on their buy list). `friendSpareList` already joins the catalog for
  name and image; `deckNeed` comes from the reader's own buy rows (`loadDeckBuyRows`, as `loadShoppingRollup` reads them), the
  reader's data only, so no new cross-user read and `check:social-reads` is unaffected.
- 🟡 The filter runs on the client over the tab's lines (a friend's spares are hundreds at most). Type options and counts come
  from `buildTypeOptions`' rule over the lines; colour from the shipped colour filter's rule.
- 🟡 Search: one matcher for Collection and Spares, word-prefix over name and type line. If Collection's type-word change lands
  first, import it; else this adds it in `src/lib/collection/` and Collection adopts it.
- 🟡 Wishlist: mount `FriendSparesProvider` over the tiles' oracle ids (`requests` on, `deckId` null). An ask from the Wishlist
  needs `copies` = want minus have, and must read as `unneeded` once the line leaves the wishlist: pass the wishlist's oracle ids
  into `stillNeeded` beside the decks' (do not mark it `standalone`, which never reads unneeded).
- ✅ The modal, the ask actions, the request marks and Your requests are shipped and reused as they are.

### 🎭 State coverage
- ✅ Spares: rest, type search, filter on (sheet and panel), Type panel counts, no results, empty, at both widths.
- ✅ Wishlist: loading, one friend, several, none, requested, opened, sorted, at both widths.
- 🟡 Not drawn (shipped behaviour applies): accepted mark on a tile (deck row's tick), the failed-ask toast (`SocialToast`),
  `?spare=` landing with filters on (the modal opens over its tile only when the filters show it; otherwise clear them first).

### 🧱 Codebase fit
- ✅ Parts: `FilterChassis`, `SearchField`, `ColourControl`, `FilterPanel`, `FiltersBoxTrigger`, `ResultLine`, `FilterChipPill`,
  the Collection sheet's `SheetChip` groups (a Spares variant of `CollectionFilterSheet` without Set and Availability),
  `ZeroState`, `MarkedSpareGlyph`, `SparesSheet`, `TOUCH_HIT`.
- 🟡 `WishlistTile` becomes `relative` with the press as the trigger's sibling; the caption takes its right padding only while
  the press is drawn.
- 🟡 Names: friend names stay `ThirdPartyName` through `personText` (the search aria and the no-results body).
- 🟡 `scratch-gen/` patches with `globalThis` hooks for static renders. Reference only; never import.

### ♿ Cross-cutting
- ✅ The press is a real button with `aria-haspopup="dialog"`, `aria-expanded`, a 44px coarse hit; its name says how many friends.
- 🟡 The presses arriving after the page are not announced (decoration of a list already read); the key gives the meaning.
- ✅ The Spares filters reuse the chassis's live region and the sheet's own status, as Collection does.

## Decisions inherited

Calls 1–4 as drawn, pending Q1–Q3. Strings DRAFT. Ships behind the existing switches.
