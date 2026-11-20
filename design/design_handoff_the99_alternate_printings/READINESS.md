# Readiness Review — Alternate printings from search (R1)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-20 (against main rebased at origin/main)
**Related ticket(s):** #3002
**Plan PR target:** TBD (docs/superpowers/plans/)

## Summary

The handoff reuses `PrintingRegion` and the shipped card details, adds no token and no surface, and draws unowned, owned, pick+preview and single-printing states on phone and desktop. Nothing blocks UI work. Four eng-side clarifications go in the plan PR as decisions. No Design round-trip is needed.

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ Scope (card details opened from search only), non-goals (R-B not built, wishlist per card, deck printings owned-only, Mana Pool stays a name search) and gaps G1-G6 are stated.

### 🎭 State coverage
- ✅ U1-U3, O1-O3, X1, close/page and Add-while-previewing are drawn, phone and desktop (art `*-phone` / `*-desk`).
- 🟡 Loading and error of the catalog-printings read (G1) are not drawn; use the printing picker's existing pending/failed treatment.
- 🟡 Two-faced and no-art printings are not drawn; the shipped tile fallbacks apply.

### 🔌 Data contract
- 🟡 G1 (catalog printings for an owned card, and for an unowned card from search) needs a read. The plan must decide fetch-on-open vs. in the search payload; the Set row needs the count before open.
- 🟡 G2/G3: `CardModal` has `openAtPrinting` (card-modal.tsx); the preview state and Edit copies preset by scryfall id (`src/app/collection/edit-actions.ts`) are new work, named by the handoff.

### 🧱 Codebase fit
- ✅ `src/components/cards/printing-region.tsx` and `src/components/public/printings.tsx` exist as named; no new tokens.
- 🟡 The handoff cites `addPanelCopy.quickAdd.rowNotOwned` as the shipped "not owned" word; no such key exists. Shipped equivalents: `tileNotOwned` in `src/lib/copy/precons.ts`, and `src/lib/copy/card-search.ts`. The plan picks one.
- 🟡 G5 `SEARCH_PRINTINGS_ENABLED` is a new switch; per project rule it needs Hugh's yes before registry entry (`src/lib/flags/registry.ts`).

### ♿ Cross-cutting
- ✅ Live announcement string drawn; the modal owns the single live region as in the picker. Perf: no list-payload growth if fetched on open.

### ⏰ Drift from reality
- ✅ Named components and the `openAtPrinting` path exist on current main. Handoff dates 2026-11-20.

### 📝 Decision log
- ✅ Calls 1-5 are marked and R1 is approved by Hugh (R-A locked; R-B record only). Strings are DRAFT and go to /copy-review (G6).

## Eng-side clarifications (Yellow only)
- Item 1: Printings read for G1, fetched on open or carried in the search payload; the plan decides and measures.
- Item 2: Loading/error states follow the printing picker R3 pending/failed pattern.
- Item 3: "not owned" reuses an existing shipped string (`tileNotOwned`), correcting the handoff's key name.
- Item 4: `SEARCH_PRINTINGS_ENABLED` needs Hugh's approval before it is added.

## Decisions inherited
- R-A search row unchanged; R-B not built.
- Unowned selection is preview only, stores nothing, forgotten on close or paging.
- Owned: one region, yours first; picking an owned tile ends a preview; finish chips step aside.
- Wishlist per card; deck printings owned-only; Mana Pool link stays a name search.
- Add to collection while previewing opens Edit copies with that printing preset.
