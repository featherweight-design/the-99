# The 99 — Card rows on the Versions tab (design handoff, R1, H31)

**Source of truth:** `docs/superpowers/design-briefs/2026-10-02-versions-card-rows.md` (main, #1192).
Read with it: `src/components/decks/version-diff.tsx` (`DiffCardRow`, `Column`, `diffNote`),
`update-diff-row.tsx` (`AvailabilitySlot`, `shortfall`, `useRowOpen`), `decklist-row.tsx`, `buy-tag.tsx`,
`ownership-dot.tsx`, `hover-preview.tsx`, `src/lib/copy/deck-versioning.ts` (`history.*`).

Files: `The 99 - Version Card Rows.dc.html` (canvas: 1a calls, 1b–1d at 390, 1e–1f at 1300, 1g states),
`STATES-version-rows.md`, `version-rows · copy strings.ts`, `READINESS.md`, `brand/`.

**Status:** reviewed with Hugh, 2026-10-03 (LGTM).

Drawn on Kaldheim (First Frost) against Hugh's 390 and 1300 screenshots of the shipped tab. Everything outside
the row and the line above the columns matches what ships.

**One line:** *the rows say what you own today. The version stays a record.*

## What this reverses

Deck versioning decision 7 said the diff would carry "no ownership dot, no prices and no pull offers". This
round reverses the first two for **In rows only**. Pull offers stay out. `history.diffNote`
(`this is what the deck was, not what it needs`) is retired. The file comment at the top of `version-diff.tsx`
should be rewritten to match.

## The calls

| # | Open item | Called |
|---|---|---|
| 1 | Which figures | **Ownership dot (two states) and buy tag.** No `AvailabilityMarker` and no `committed` dot. Both describe a deck's claim, and a version claims nothing. |
| 2 | Price | **Today's price.** From lg (1024px), `BuyTag variant="row" density="full"` (`buy · $2.40`). Below lg, `density="collapsed"`, which draws the live figure (`$2.40`) and a bare `$` only with no live price. (Corrected in the build: readiness findings 1 and 2.) The tag prices the copy you would buy today, not the version's decision, and the today line says so. |
| 3 | Partly owned | **Compared against the version's count (`to`).** Mono 10.5px `--fg-faint` `has 1 of 4` after the name, then the tag. **Corrected 2026-10-03:** the shortfall is Shopping's claim model (`to` less the copies this deck can call on), not `to − ownedNow`, and the dot is ownership alone (`ownedNow > 0`), independent of it; see STATES. |
| 4 | Out rows | **No dot, no tag, no spacer.** Name, cost track, modal and preview. |
| 5 | Which versions | **Every version, with one row anatomy.** |
| 6 | Diff note | **`todayNote(n)`** replaces it, above the columns at both widths: mono 10.5px `--fg-faint`, drawn only when In has rows. On the phone it sits under the segmented pair. |
| 7 | Modal Prev/Next | **Across both columns, In then Out**, in display order (type group, then name). This is the review row's rule. The phone passes both lists, including the column that is not pressed. |
| 8 | Phone at 390 | **44px, one line**, as today. Dot 7, name, `own N of M` when partial, the collapsed tag (`$2.40`), then the 72px track. The name keeps about 125px. There is no meta line and no preview on touch. |
| 9 | About entry | **No edit needed** (Hugh's call). `versions` says committing "cuts a version you can read back", and that is still true. An optional bullet is in the copy file. |

## Row spec (In)

Order: dot · name (pair inline, as `printsPair` prints today) · `own N of M` · buy tag · `CostTrack`.

This is the review row's order: the parts that can be absent sit on the name's side of the fixed track.

- Box: unchanged. `min-h 44 / md 38`, `px 8 / md 9`, radius 7, `--surface` on `1px --border`.
- Hover (md+): `--elevated-hover` fill and pointer, from `ROW_PLATE_HOVER`.
- Dot: `OwnershipDot owned={ownedNow > 0} size={7}`. No `committed`.
- Name: `CardDetailTrigger` with `siblings` = In ids then Out ids. The whole row opens the card via `useRowOpen`.
- Accessible description: `Owned` / `Not owned` (the decklist's words). On a partial row, use `partialA11y`.

## Notes for engineering

1. `VersionDiffCard` gains `imageUri`, `ownedNow` (copies in `collection_items`, all printings) and `price`
   (newest `printing_prices` read). It also needs `newestAsOf` once per payload. Read these in `getVersionDiff`'s
   own query, on open and never with the rail, so no pending state is added. Out cards need `imageUri` only.
2. `HoverPreviewProvider` wraps the two columns, beside `VersionOverviewLink`'s own provider rather than
   around it.
3. Basic lands read as covered (owned), as the fill rules them. They never draw a tag.
4. A proxied slot in today's deck is not this row's concern: draw ownership only. No `P`.
5. `todayNote` takes the version number. It is not drawn on v1, `noChange` or `diffUnavailable`.

## Ledger

1. `todayNote`, `partialOwned` and `partialA11y` go to /copy-review in the build lane.
2. The desktop group-header rule is drawn as it appears in the 1300 screenshot (a muted mauve). The code says
   `--border`, so check what ships. This round does not change it.
