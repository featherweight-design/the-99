# Readiness: add a card from anywhere

**Verdict: Green from Design.** Hugh approved R2 on 2026-10-31 ("this LGTM, please open a PR"): direction **C (search adds) with D (card details) under it**, plus the deck dock's bridge. Boards A and B are kept as the record of R1 and are **not** to be built. Checked against `origin/main` @7bf3c89. No migration, no backend change: the add path, the search layer and the Edit copies sheet all exist. The DRAFT strings go through `/copy-review`.

**The collection edit switch is retired** (`COLLECTION_EDIT_ENABLED`, see `lib/copy/i-got-it.ts:1`). The brief's "switch off" state has no trigger on main, so the switch-off frames (C8, D6, K9) only show what is shipped today. Whether this ships behind a new switch is engineering's call under the feature-switch rule (only where a regression is plausible).

## For engineering, by item

Sizes: S under 150 lines, M 150 to 500, L over 500, tests included.

1. **D · card details' Add to collection everywhere (S to M, lane cards/collection).**
   - `components/cards/card-detail-provider.tsx:1854` passes `onEditCopies` only when the provider was mounted with `collectionEdit` (only `app/collection/(list)/page.tsx:166`). Pass it on every shell surface: deck pages (own and a friend's), search, Shopping, the cart. Keep `sheetsBelow === 0 && partnerOf === null`.
   - `EditCopiesHost` (lazy, `:140`) must mount wherever the provider does, not only under /collection. Saving refreshes the surface underneath (deck row ownership dot, `$` marker) as `/collection` refreshes its grid.
   - The receipt draws even when it has nothing to report, as on /collection (`card-modal.tsx`, `AvailabilityDetail`), so the link always has a heading line.
   - Not on the public card page (no shell, reader may be signed out).
2. **C · a + on every search row (M, lane card search).**
   - `components/card-search/search-row.tsx`: a 44px press (34px from `md`, 8px radius, `--border-strong` edge, 18/16px plus) at the row's end, after the bookmark box. The row stays one option and one press for card details; the + is its own button and stops propagation. Its name: *Add {card} to your collection* (DRAFT).
   - The + opens the shipped Add cards sheet with that card on the list and its printing step open (the same state as picking it in the sheet's search: `pick(r)`), no default printing. The search layer closes under it; closing the sheet (✕, Done, Escape, save) reopens the layer as it was (query, scroll, the returned-row ring H3), as card details already does.
   - After a save the row reads `×1 owned` (rows read ownership live; refetch on the sheet's save).
   - Keyboard (proposal, Hugh did not rule): ⌘↵ / Ctrl ↵ adds the active row; the foot line reads *↵ to open · ⌘↵ to add* (DRAFT). Drop it if engineering or `/copy-review` prefers.
   - Offline: the layer's shipped offline box; no rows, so no +.
3. **C · Add several cards (S, lane card search).** `search-layer.tsx`: one row above Recent cards (and above the empty state when there are none), the Add cards way-row shape (52px phone, 44px desktop dropdown): plus glyph, *Add several cards* · *search or scan* (DRAFT), chevron. Opens the shipped Add cards sheet empty. Not drawn offline.
4. **Mount the Add cards sheet from the shell (S to M).** Today it is mounted by the Collection head, the empty doors, first run and `EditCopiesHost`. Items 2 and 3 need a shell-level host (beside the search layer) so it opens on any page. Its steps, copy, scan and save rule are unchanged.
5. **The dock's bridge (S, lane decks).** `components/decks/quick-add-bar.tsx:444`: in the `noResults` empty state, only while `ownedOnly`, add a ghost press *Add a card to your collection* (DRAFT) above the shipped *Search all cards instead*. It opens Add cards (item 4) with the dock's query carried into the sheet's search. Closing the sheet returns focus to the dock with its query and Owned only kept, and the search runs again, so the card now shows owned with the deck's Add. **The placeholder stays as shipped** (Hugh, R2 review). No collection control on dock rows; with Owned only off, the row's name opens card details, where item 1's link is.

## Not built

- Directions A (nav slot) and B (header +): not picked.
- The ring on a deck row after a save (S4, D5, K7) is drawn as a brief highlight; it is optional and can ship later.
- About entry: Hugh decides at launch.
