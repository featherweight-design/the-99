# Close-out: About launch-end batch

**Walked:** 2026-10-21, on the head of #2167 (PR 2), which then merged as 758e61ff8 with that content. PR 1 is #2163.

**Where.** A scratch branch, `br-lucky-scene-a6edxq75`, cut from local-dev and migrated to `main`'s schema, holding
`pnpm fixtures:about` (the fixture account: Sam, Alex and `About pod`). `next start` ran with the capture switch set
(`docs/probes.md`, capture:about): every reader-facing switch on, including `PAYMENTS_ENABLED` and `SOCIAL_INVITES_ENABLED`,
with `MOMENTS_ENABLED`, `ABOUT_SHEET_ENABLED` and `WELCOME_CREDITS_ENABLED` off. Chromium ran at 390 (phone) and
1300 (desktop).

Plan: `docs/superpowers/plans/2026-10-21-about-launch-end-batch.md`. Handoffs:
`design/design_handoff_the99_about/addendum-launch-end-batch/` (#2156) and `addendum-credits-entry/` (#2144).
Readiness: `docs/superpowers/readiness/about-launch-end-r1.md` (Green, with its build errata).

## Route inventory

| Plan row | 390 | 1300 | Seen |
|---|---|---|---|
| `/about` Reference, `#getting-help` | ✓ | ✓ | Under Home; the header ? haloed on Home's frame |
| `/about` Reference, `#about-rebuilt` | ✓ | ✓ | Under Account menu; the About The 99 row haloed |
| `/about` Reference, `#rule-zero` | ✓ | ✓ | Under Friends; the pod's Rule 0 check row haloed |
| `/about` Reference, `#invites` | ✓ | ✓ | Under Friends; one box over Add a friend and "3 invites left" |
| `/about` Reference, `#card-search` | ✓ | ✓ | Under Collection · Cards; the header search icon haloed |
| `/about` Reference, `#card-scan` | ✓ | ✓ | Under Collection · Cards; the + haloed as a 36 square (G7) |
| `/about` Reference, `#credits` with payments on | ✓ | ✓ | Opens `buying-credits` under the new Credits screen; the balance strip haloed; the welcome line is gone with its switch off |
| What's new | ✓ | ✓ | In the `#getting-help` cells: the Reference's head lists the batch's titles for the fixture reader, who is behind 16 |
| `/` Home | ✓ | ✓ | Drawn. Home's banner line is NOT walked: with `ABOUT_SHEET_ENABLED` off it never draws (`src/app/page.tsx` passes no About notice), so this walk's switch set cannot show it. Its titles and order are `arrivals-banner.test.tsx`'s |
| The ? panel | n/a | n/a | Not walked: it is shell, outside the `<main>` the sheet's steps are scoped to. It reads the same `visibleEntries`, and `screenForPath` is unit-tested for `/credits` |

The 8 rows' 16 cells were photographed by `scripts/contact-sheet.mjs` over `docs/superpowers/inventories/about-launch-end.json`.
Desktop shows the phone picture at both widths, as Hugh ruled (G8).

## Against the brief

- **Halos.** All six halo calls in the handoff hold on the recaptured frames. The + box, `collection-add`'s and
  `added-copy`'s included, measured 36×36 at x 346 to 382, inside the frame's right edge.
- **Version.** `ABOUT_VERSION` is 16, and 15 was skipped. `about-rebuilt` is the only unswitched entry at 16. Each of
  the other six is announced by its switch.
- **Credits.**
  - With payments on, `buying-credits` replaces `credits`, and every reader of the credits text follows it
    (`drawnEntry`): Written for you, the Where credits work sheet, the welcome cell, and the five `What uses credits?`
    links to `#credits`.
  - With payments off, the shipped `credits` entry is unchanged and is still seen by version.
- **Words.** The entries carry the handoffs' drafts after prose-pass, with the readiness errata applied, plus round 1's
  correction: Auto keeps the printing the scan matched. Titles and `opens` strings are as the handoff quotes them.

## Not built, reported

- **The old sheet's first-run line.** `aboutSheetCopy.firstRunLine` still says About is "on one page". The sheet
  is deleted by About-on-banner PR B, so the line is left as is (orchestrator, 2026-10-21).
- **The scan sheet's Auto line.** `collection-edit.ts` `scan.mode.fastLine` says "at its first printing", while Auto
  keeps the matched printing (`matchedPrinting`). This is for the copy lane.
- **The one-time redirect.** With `ABOUT_SHEET_ENABLED` off, the bump sends every reader below 16 to `/about` once,
  for `about-rebuilt`. With the switch on, the same notice is Home's banner line. This is what a bump does
  (orchestrator, 2026-10-21).
