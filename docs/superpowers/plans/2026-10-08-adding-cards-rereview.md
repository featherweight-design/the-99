# Collection home roadmap — re-review note

For Hugh, 2026-10-08. Summarizes `docs/superpowers/plans/2026-10-06-collection-home-roadmap.md`
and its brief, doc 2 (`docs/superpowers/design-briefs/2026-10-06-collection-foundation.md`),
both in PR #1277 (`docs/collection-epic`, open, not yet merged) — read from that branch.

## The five sub-projects and their order

1. **Collection foundation** — row-level edits to `collection_items`, a history ledger, the two
   upload modes (Replace / Add) with preview, revert. Ships first; everything else writes
   through its path. Switch: `COLLECTION_EDIT_ENABLED`.
2. **Edit your collection in the app** — the UI on 1: add sheet, card-details edit,
   remove-with-warning, history/revert. Depends on 1. Same switch.
3. **Deck-specific printings** — decks remember a chosen printing per card. Depends on nothing
   from 1/2; runs in parallel with 2. Switch: `DECK_PRINTINGS_ENABLED`.
4. **"I got it" on Shopping** — mark bought, printing/foil/quantity preset from the shown price.
   Depends on 2 (write path) and 3 (default printing). Switch: `SHOPPING_MARK_BOUGHT_ENABLED`.
5. **Scanning** — 5a measurement spike (no UI/switch), 5b single scan + the existing picker, 5c
   optional OCR, 5d batch/live. Switch: `CARD_SCAN_ENABLED` for 5b onward.

## Scanning (5a-5d) is last and optional — confirmed

The roadmap says 5a "can run anytime, independent of everything else," gated by its own ≥95%
go/no-go bar before 5b is authorized. 5b depends on 2 and on 5a clearing that bar; 5c/5d depend
on 5b. Nothing in 1-4 depends on scanning either way. **Everything ships without it**: 1-4 are
each independently useful and none takes a scanned card as an input.

What can ship before 5: **all of 1, 2, 3, 4**, in order 1 → {2, 3} parallel → 4. 5a can start in
parallel with any of them (read-only, no shared files); 5b-5d wait on 2 and on 5a's bar.

## This week's other items — parallel safety

- **Two-faced card type fix.** No filed plan or issue under this name — flagging rather than
  guessing scope I can't verify. The nearest documented candidate is the `isLandFace`-vs-
  substring mismatch in `src/lib/recs/roles.ts`'s own comments (82 of 31,830 commander-legal
  cards disagree, every one an MDFC with a land back face); if that's the fix meant, its surface
  is `src/lib/cards/facet.ts` and `isLandFace`/`classifyRoles` callers, not any file the roadmap
  touches. Low conflict risk either way, but confirm scope before assuming.
- **Tuning cost labeling and roles-strip move.** Also no filed plan or issue (checked
  `docs/superpowers/plans/*tuning*`, `*design-briefs/*tuning*`, and a repo search for
  `roles-strip`/`RolesStrip` — all empty). Can't verify its surface. If it's Tuning-surface
  work, it most likely touches `src/components/decks/decklist.tsx`'s non-Shopping branches —
  worth confirming against sub-project 4, which touches that same file's Shopping branch
  (`commanderShoppingRows`, `isShoppingCard`, ~lines 218-487). Not a confirmed conflict, just the
  one file both plausibly land in.
- **Deck stats (round 1).** Plan at `docs/superpowers/plans/2026-10-08-deck-stats.md`. Files:
  `src/lib/decks/{stats,stats-query,games}.ts`, new `src/lib/mana/supply.ts`,
  `src/lib/profile/{build,load}.ts` and `src/lib/labels/read.ts` (read-only calls), new deck-page
  card components, `src/lib/copy/about.ts`. No overlap with the roadmap's files — it reads
  `loadShoppingRollup()`/`loadPrices()`/`priceOf()` but never edits them or `decklist.tsx`, and
  never touches `collection_items` or `deck_cards`/`deck_version_cards` schema. Safe in parallel
  with every sub-project, with one caveat: if sub-project 3 migrates `deck_cards`/
  `deck_version_cards` while Deck Stats' money card (PR 6) is mid-flight, re-check that PR's
  price join against whatever shape 3 leaves — a schema-drift risk, not a file conflict.

## Decisions still open

The roadmap itself: "Open questions for Hugh: None open." From this re-review:

1. The two unverified week items above have no plan or issue filed — confirm actual scope
   before assigning them alongside the collection epic.
2. Sub-project 3's migration timing against Deck Stats PR 6 — sequence consciously if both are
   in flight at once.
3. Deck Stats PR 4b (the richer mana-cost-vs-production computation, shared with Mana Balance)
   is blocked on a Design addendum — unrelated to this roadmap, noted only as the other open
   Design dependency in flight this week.
