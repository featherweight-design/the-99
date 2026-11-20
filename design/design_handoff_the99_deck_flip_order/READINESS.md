# READINESS · Flip between decks + custom deck order (#2989, #2990)

**Verdict: Yellow.** Buildable as drawn on today's tree; every surface is drawn at phone and desktop, and the open points are engineering calls the README and the drawn patterns already settle.
**Audited:** 2026-11-20 (cold audit, lane a6, rebased on origin/main e47c3e709)

## Dimensions

1. **Surfaces and widths.** Deck strip: phone (`RE-phone`) and desktop (`RE-desk`). Sort menu with Custom + `Arrange decks…`: phone (`O1-phone`) and desktop (`O1-desk`). Arrange: phone (`O2-phone`) and desktop centred 720px (`RO-desk`). Arrange in a folder: desktop menu (`RO-folder-list-desk`), desktop (`RO-desk-folder`), phone (`RO-phone-folder`). Complete.
2. **Names exist as named.** `DeckSort`, `DECK_SORT_LABELS`, `DECK_SORT_ORDER`, `sortDecks` (`src/lib/decks/sort.ts`); `DeckSortMenu` (`src/components/decks/deck-sort-menu.tsx`, `role="menu"` with `menuitemradio` rows); `DecksView` shelves (`src/lib/decks/folder-view.ts`: All decks / folder / Unfiled); `data-spine-under-band` (`spine-mobile.tsx:524`); `SpineDesktop`; `/decks/[id]` route with `?tab=`; friend decks at `/friends/[publicId]/decks/[deckId]` and precons at `/decks/precons/[fileName]` are separate routes, so "hidden on friend decks and precons" is free. `decks.sort_position` and `reorderDecks` are stated as new. Tokens in the scratch diff (`--accent`, `--fg-faint`, `--border-strong`, `--fg`) all exist in `globals.css`.
3. **States reachable from real fields.** `k of N` from the stored id list; wrap, one-deck hide, folder caption from `deck_folders.name`; Custom ✓ from the sort state; folder count from `shelfCounts`; lifted row + drop slot drawn at both widths.
4. **Data.** Needs a migration (`decks.sort_position`, nullable). Null-sorts-as-newest (Design's G3) makes "new decks go to the top" need no write at create. The /decks and Home cache retire on reorder **by construction**: `decks` already carries the `user_data_touch` trigger (`drizzle/0073_user_data_stamps.sql`), so G4 is no extra work, only a check that `reorderDecks` writes `decks`.
5. **Interaction contract.** Keys, skip list, wrap, drag/keyboard lift, live region, Cancel/Done/leave guard all specified in README §1–2.
6. **Copy.** DRAFT list in README plus two drawn lines not on it (`ALL DECKS · 5` / `FOLDER · SIMIC · 2` eyebrows; "Drag a deck by its handle. Filters and search come back when you're done."). Wording, not a gap: run /copy-review over README + drawn strings.
7. **Build split.** Two PRs, custom order first, each with phone + desktop. Fine.

## Clarifications (eng-side, settled by the handoff's own patterns)

- **C1 Neighbour names.** The tooltip/aria-label names the neighbour, but the sessionStorage payload is `{ids, caption}` only. Either store `{id, name}` pairs or read the neighbours' names server-side; a missing name falls back to `Previous deck` / `Next deck`.
- **C2 Direct-open fallback needs a sibling read.** "All decks in the saved sort" means the deck page needs the reader's deck ids + sort fields (name, createdAt, lastPlayedAt, sort_position), ordered client-side by the localStorage sort (`DECK_SORT_KEY`). Keep it outside the deck page's cached payloads or key it on the list stamp. Stale stored list without the current deck: fall back as for a direct open (Design's G1).
- **C3 Custom needs both twins.** `listDecksWithStats`' ORDER BY and `sortDecks` (its client twin) both gain `custom`: `sort_position` asc nulls first, nulls by `created_at` desc, id tiebreak. The scratch diff's `return [...decks]` is a render stub, not the rule.
- **C4 Unfiled shelf.** The strip caption and `Arrange <shelf>…` use the shelf's shipped label for Unfiled, same rule as a folder.
- **C5 Arrange row meta follows the drawings** (always match the mocks): phone shows `status · n / 99`, not colour pips as README says; desktop adds the commander line and row numbers 1–N.
- **C6 Arrange menu row** is an optional slot on the shared `DeckSortMenu` (the precon list uses it too), as `role="menuitem"` after a hairline, inside the menu's roving focus.
- **C7 Leave guard** reuses the app's shipped discard-confirm pattern (`discard-draft`) with `Keep arranging` / `Discard`.
- **C8 Folder arrange writes the whole order**: the folder's decks permute their own current slots; materialize positions for every deck in one `reorderDecks` transaction, scoped to the caller's `user_id`.

## Flags (product calls, not gaps)

- **Migration:** `decks.sort_position`.
- **New feature switch:** Design's G5 puts the global ←/→ handler behind a switch; a new switch needs Hugh first. Otherwise it rides an existing line or none.
- No model call, no spend, no email.

## Design's own read (kept)

# READINESS · Flip between decks + custom deck order (R3, #2989 #2990)

**Verdict: Green.** R3 approved by Hugh 2026-11-18: "A2 is the best option, agreed with arranging." Build from README.md; ship as two PRs, custom order first (the strip reads its order).

## Rulings
- Q1 Placement: **A2**, the strip under the art (phone: first row of the under-band; desktop: row under the band). Same strip at both widths. Ruled as drawn.
- Q2 Arrange in folders: **allowed**, one saved order; folder decks move among their own slots. Ruled as drawn.
- Arrange on desktop is a centred 720px column. Ruled as drawn.
- Phone sort is the shipped ⇅ dropdown, not a sheet.

## Gaps for the build
- G1 Order handoff: sessionStorage `{ids, caption}` written on navigation from /decks; direct opens fall back to All decks in the saved sort. Not drawn: decide what happens if the stored list no longer contains the current deck (rec: fall back as for a direct open).
- G2 No swipe between decks (would fight horizontal carousels on the deck page).
- G3 Migration `decks.sort_position` (nullable; null sorts as newest; new decks above the current top). `reorderDecks(ids[])` touches only the caller's own decks.
- G4 Retire the /decks and Home list cache on reorder (`docs/agents/list-cache.md`, `list-stamp:triggers`).
- G5 The global ←/→ handler is the one plausible regression: put it behind a feature switch, skip list in README §1.
- G6 Copy is DRAFT: run /copy-review on the README copy list before build.
