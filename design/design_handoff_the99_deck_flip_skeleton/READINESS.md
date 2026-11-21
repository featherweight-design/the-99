# Readiness Review: Deck page loading skeleton (flip and open)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-21 (cold read against origin/main 62e922c86; supersedes the Design-side Green note)
**Related ticket(s):** builds on the flip order handoff (#3047)
**Plan PR target:** TBD

## Summary
The handoff is buildable as drawn. Its core facts hold: `src/app/decks/[id]/loading.tsx` is the crown `LoadingScreen`, the sub-routes `changes` and `import` and `precons/(list)` have their own `loading.tsx`, every header fact is already in `DeckListItem`, and `BAR`, `anim-skeleton`, `StallWatch` and `data-loading-screen` exist. Eight eng-side clarifications below; none needs Design. The plan PR records them as decisions.

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ Boundary, A/B split and the screens that keep their own loading are stated and match the tree (`[id]/changes`, `[id]/import`, precons all carry their own `loading.tsx`).
- ✅ B is the stated fallback if the facts cannot reach the loading screen.

### 🎭 State coverage
- ✅ Phone and desktop drawn for A, B and Open; null art crop covered.
- 🟡 Cold or reload loads render `loading.tsx` on the server, where sessionStorage is unreadable: A must draw only after mount (B first, then A on the client pass), or hydration mismatches. Plan: read the entry with `useSyncExternalStore`, as `deck-flip-strip.tsx` does for the trail. Entry-less navigations (Back/Forward, a stale entry) draw B.
- 🟡 The tab row draws all five tabs, but `Versions` is drawn only for a deck with history (or a precon link), by `builder-tabs.tsx`. Plan: draw the always-present tabs from the drawn pattern and hold `Versions` as the shipped tab row does, or accept a tab that vanishes on landing; decide and record.

### 🔌 Data contract
- ✅ E1 holds: `DeckListItem` carries `commanderName`, `commanderColorIdentity`, `commanderArtCropUri`, `partnerName`, `partnerColorIdentity`, `built`, `statusPill`. No new query.
- 🟡 The header also needs `commanderPrintedName` (the band's name line uses `commanderDisplayName`) and the deck's `intent` line, which the shipped header draws second; the handoff lists neither. Plan: add printed name to the facts; draw no intent row in A (arrives with the page, like the bracket chip), and say so.
- 🟡 Count is `built / 99` in the README; a partner deck's denominator is 98 (`deckBodySize`). Plan: use `deckBodySize(partner !== null)`.
- 🟡 Widening `FlipDeck` adds art URIs and names for every deck to the page's RSC payload and to `resolveFlip`/sort inputs. Plan: a separate `header` map keyed by id, not extra fields on the sort type, so the sort tests and payload stay lean.
- ✅ Hand-off by one-shot sessionStorage is workable: `loading.tsx` takes no props, and `writeFlipTrail` already writes on the Decks tile press (`decks-view.tsx` `onClickCapture`). Home `ResumeDecks` and the in-page flip press have no trail write today; E2 must add their writes.

### 🧱 Codebase fit
- ✅ Reuses `tile-skeleton.tsx` `BAR`, `anim-skeleton` (1.4s, kept under reduced motion), and the precons skeleton's `StallWatch` pattern. `SpineMobile`/`SpineDesktop` share `SpineBandProps`, so extracting a presentational band is feasible.
- 🟡 README says neighbour art is preloaded "with the strip's existing prefetch". That prefetch is `router.prefetch` of the route only (`deck-flip-strip.tsx`); nothing preloads images. Plan: add an image preload for the prev/next `commanderArtCropUri` in the same effect, or accept that the band art loads in on a flip.
- ✅ Copy is DRAFT and routed to copy-review; precons list and `loading.decks` copy stay.

### ♿ Cross-cutting
- ✅ `aria-hidden` shapes, sr-only `role=status` line, reduced-motion behavior stated.
- ✅ Nothing telemetry-bearing; `StallWatch` keeps stall reporting.

### ⏰ Drift from reality
- ✅ Files named exist as named; page cache (`cacheForUser`, `cachePageForUser`) is server-side and untouched, since the skeleton reads nothing from the server.
- ✅ Flip strip (#3047) is as the README describes (`useDeckFlip`, ←/→ at `md`).

### 📝 Decision log
- ✅ Hugh's approval, A as build and B as fallback, are recorded and marked.

## Gaps requiring a Design round-trip
None.

## Eng-side clarifications
1. Draw A only after mount (storage is a browser fact); server and Back/Forward draw B.
2. Tab row: decide how `Versions` is held, from the shipped `builder-tabs.tsx` rule.
3. Add `commanderPrintedName`; A draws no `intent` row.
4. Count denominator via `deckBodySize`.
5. Carry the header in its own id-keyed map rather than widening `FlipDeck`.
6. Add image preload for neighbour art; the "existing prefetch" does not cover it.
7. Add entry writes for Home `ResumeDecks` and the in-page flip press; clear the entry on landing and ignore one whose `to` mismatches.
8. Trail `ids` may hold deleted decks, so the drawn `k of n` can differ by one from the landed strip; accept or recount against known ids.

## Decisions inherited
- A is the build, B its fallback; shown on every open of the reader's own deck.
- Precons, friend decks, `changes` and `import` keep their loading screens.
- One PR, phone and desktop together; no migration, model call, or new switch; copy DRAFT goes through copy-review.
