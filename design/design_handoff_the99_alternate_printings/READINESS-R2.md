# Readiness Review — Alternate printings from search, R2 (printings strip in place)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-21 (against origin/main 94138419f; the branch is one commit behind, no overlap)
**Related ticket(s):** #3002 (R1 shipped as #3054 and #3058; R2 handoff PR #3167, approved by Hugh)
**Plan PR target:** TBD (docs/superpowers/plans/)

## Summary

R2 reuses the shipped card details and tile style, adds no token and no switch, and needs no new read: `card.printings` (unowned) and `card.otherPrintings` (owned) already reach `CardModal` from search. It is drawn on phone and desktop for the unowned, owned, viewing-another, full-sheet and one-printing cases. No Design round-trip is needed. Six eng-side clarifications go in the plan PR as decisions, each settled by the nearest drawn pattern. Copy is DRAFT and goes to copy-review.

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ Scope (card details from search, 2+ printings), unchanged surfaces (search row, wishlist, deck picks, Collection and deck details, Mana Pool link) and the retirement of R1's Set-field browse are stated.
- 🟡 No explicit non-goals list or open-questions log; the "Unchanged" line on R2-Main stands in for it.

### 🎭 State coverage
- ✅ P1-P6 and D1-D3 cover unowned, tapped, owned, owned-viewing-unowned, full sheet owned/unowned, phone and desktop. One printing is specified in words (README call 7).
- 🟡 Not drawn: an owned card whose catalog holds no other printing (owns all of 2+), two-faced and no-art thumbs, a long strip (a card with 100+ printings), the desktop strip scrolled to its far end (back paddle), first paint with the shown thumb off-screen. Eng follows the shipped fallbacks and the stand-ins door strip.
- ✅ No loading or error state: the data is in the card payload, nothing is fetched.

### 🔌 Data contract
- ✅ `BrowseCard.printings` and `otherPrintings` (`src/lib/collection/browse.ts`, `card-detail.ts`) carry `scryfallId`, `imageUri`, set code, collector number, quantity. Preview price follows through the shipped `preview` path.
- 🟡 Strip order is not stated. Unowned: the catalog main printing is ringed; whether it comes first is not stated. Owned: mine first (pick first), hairline, then `otherPrintings` (stated).
- 🟡 Selecting an owned printing "views it, does not change the pick": the plan must route it through `previewId`, not `onPick` (the R2 proposal does; `picked` and `setCardArtPreference` stay untouched).

### 🧱 Codebase fit
- ✅ Named files exist: `card-modal.tsx`, `card-modal-sheet.tsx`, `printing-region.tsx`, `useOwnHeight`, `useSheetSnap`'s `doorHeight`. No new tokens (`--accent`, `--bg`, mono caps head).
- 🟡 Strings must live in `src/lib/copy/` (extend `printingBrowseCopy` in `collection.ts`, or a new key), not inline; copy-review first.
- ✅ No feature switch: R1 shipped with none on main, and R2 rides it.
- 🟡 Retiring R1's in-field browse removes `printingBrowseCopy` entries (`regionIntro`, `triggerCount*`, `regionIntroOwned`), the `scope="browse"` use in `printing-region.tsx`, and the `browse`/`printingTotal` props of `CardModalSheet`. Tests move with them.

### ♿ Cross-cutting
- ✅ Thumb label, roving tabindex with arrow keys, and `More printings` are specified. The ring is 2px accent over 2px bg.
- 🟡 No live announcement for a selection is specified; reuse the modal's `onAnnounce` with a shipped-style string.
- 🟡 A horizontal swipe on the strip must not page cards or drag the sheet; the handoff states it, and the plan needs a probe (fwd:ui-probe) at phone width.
- ✅ No payload growth; the teaser grows 98px, and the card band shrinks.

### ⏰ Drift from reality
- ✅ R1 is merged (#3054, #3058) and the handoff is drawn on it; names resolve.
- 🟡 The sheet's teaser has moved since R1 (stand-ins door strip). A search card is probably never opened with both strips; if it can be, the plan sums the heights and applies the `fitsDoor` drop rule.

### 📝 Decision log
- ✅ Calls 1-7 are numbered and Hugh approved R2 ("LGTM", 2026-11-22). Strings are marked DRAFT.

## Scratch files in the PR

`scratch-gen-r2/` (`gen2.py`, `patch2.py`, `render.tsx`, `shoot.mjs`, `proposal-r2.diff`) does not belong in `design/`. It is generator tooling, not reference. It hard-codes sandbox paths (`/home/user/sx/...`), `render.tsx` imports `../src/components/cards/card-modal` (resolves to nothing here), and the diff carries `globalThis.__PREVIEW` style hooks and `false ?` stubs that would mislead a builder. Nothing imports them: `design/**` is excluded from `tsconfig.json` and ESLint, and a `design/` diff is skipped by Vercel. They cause no build harm, so this does not block. Recommendation: drop `scratch-gen-r2/` (and R1's `scratch-gen/`, same shape) in a follow-up; if one thing is kept, keep `proposal-r2.diff` only, labelled "scratch, do not apply". The build copies none of it.

## Gaps requiring a Design round-trip

None.

## Eng-side clarifications (Yellow only)

- Item 1: Strip order. Unowned follows `card.printings` order, with the catalog main printing ringed on open; the plan confirms the order and states it. Owned: pick, other owned, hairline, `otherPrintings`.
- Item 2: Strip shows when catalog total (owned plus others, or unowned `printings.length`) is 2 or more. An owned card holding every printing shows a strip of owned only, no hairline; one total printing shows none (call 7).
- Item 3: Desktop gets a back paddle mirroring the drawn `▸` once scrolled; the shown thumb scrolls into view on open and on keyboard focus.
- Item 4: The long strip scrolls without a cap, as drawn for 22; the plan measures a 100-printing card.
- Item 5: Teaser height `+98` follows the door-strip pattern (`useOwnHeight` into `doorHeight`); when the card band would fall under `MIN_TEASER_CARD_WIDTH`, the strip is dropped as the door is.
- Item 6: Two-faced and no-art thumbs use the shipped tile fallbacks (`printing-region.tsx` tile). A selection is announced through `onAnnounce`.

## Decisions inherited

- R1 preview rules: nothing stored, forgotten on close or paging; Add to collection and Edit copies open at the printing on screen.
- Viewing an owned printing never changes the pick.
- The Set field is plain when unowned, and the shipped owned-only picker when owned. R1's in-field browse is retired.
- The strip is in the phone teaser only (`md:hidden`, not the full sheet), and under the title on desktop. Search row (R-A), wishlist, deck picks, Collection and deck details, and the Mana Pool link are unchanged.
- Strings are DRAFT and go to copy-review; no new switch.
