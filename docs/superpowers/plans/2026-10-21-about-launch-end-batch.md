# About launch-end batch: six entries, the credits redraw, one bump

2026-10-21 · launch path L2 · handoffs `design/design_handoff_the99_about/addendum-launch-end-batch/` (#2156, readiness
`docs/superpowers/readiness/about-launch-end-r1.md`, Green) and `design/design_handoff_the99_about/addendum-credits-entry/`
(#2144) · brief `docs/superpowers/design-briefs/2026-10-18-about-launch-entries.md` (#2072).

## Scope (approved by the orchestrator, 2026-10-21)

Six new entries, with every id `since: 16`:

| Id | Screen | Switch |
|---|---|---|
| `getting-help` | home | `HELP_PANEL_ENABLED` |
| `about-rebuilt` | account | none |
| `rule-zero` | friends | `RULE_ZERO_ENABLED` |
| `invites` | friends | `SOCIAL_INVITES_ENABLED` |
| `card-search` | collection | `CARD_SEARCH_ENABLED` |
| `card-scan` | collection | `CARD_SCAN_ENABLED` |

Alongside them:

- **`credits`, rewritten as #2144 draws it.** It moves to a new `credits` screen (`/credits`), and its frame is the
  balance strip. It is marked new (`since: 16`) because buying credits is new. Its two `OVERVIEW_V2_ENABLED` keys are
  dropped (Hugh, 2026-10-21: option b).
- **The `friends` caption edit.** The clause ` pick “They’re on The 99”,` is gated on the reader's `SOCIAL_INVITES_ENABLED`.
- **The Home first-run line.** `aboutFirstRunRest` in `arrivals.ts` says About is "on one page". The fix goes through
  `/copy-review`.
- **`ABOUT_VERSION` moves from 14 to 16**, once. 15 is spent (`about.ts`).

Out of scope:

- dropping `width` from the existing entries (it becomes optional; that removal is a cleanup of its own);
- a desktop capture set (G8);
- any new Overview entry.

## Engineering resolutions (readiness doc)

- **G1.** A locator that begins `header` is resolved from the page, like a dialog's.
- **G2.** Invites gets one box: a `data-about-invite` wrapper around Add a friend and its lines.
- **G7.** The + halo is a 36 square: a `data-about-press` span centred in the 44 button. The locators of
  `collection-add`, `start-without-a-collection` and `added-copy` move onto it with `card-scan`.
- **Call 8.** `width` is optional on `AboutEntry`.
- **Draft vs code 8.** `AboutSwitch` gains the six switches.

## PRs

1. **Mechanism, no copy and no pictures** (6 files):
   - `AboutSwitch` and optional `width` (`about.ts`);
   - the header scope (`capture-about.mjs`, `about-locators.mjs`);
   - `data-about-invite` (`friends-head.tsx`);
   - `data-about-press` (`collection-place-head.tsx`);
   - this plan.

   Nothing renders differently, and no locator moves yet, so the shipped boxes stay true to the shipped frames.
2. **Entries and recapture** (about 6 code files and about 400 lines, plus the capture output):
   - the seven entries in `about-entries.ts`, with their words through `prose-pass` and `/copy-review`, including Draft
     vs code 2, 3, 11, 12 and 13 (card-scan's stale facts);
   - the `friends` edit;
   - `ABOUT_VERSION` 16;
   - `credits` in `ABOUT_SCREENS` and in `screenForPath`, plus a capture step for it;
   - the locators: six new ones, three moved by G7, and credits moved to its new screen;
   - `aboutFirstRunRest`;
   - `docs/probes.md` (the capture's switch set gains `SOCIAL_INVITES_ENABLED` and the payments line, so `/credits` draws).

   It also carries the full recapture in all six themes, on a scratch branch cut from local-dev:
   `public/about/shots/<theme>/*.webp` and `shots.generated.ts`. That is the same shape as #2083. It is ONE PR because
   two tests force it. `about-locators.test.mts` requires a locator for every entry, and `shots.test.ts` requires every
   entry to be boxed on its frame in every theme, so the entries, the locators and the capture must land together.
3. **Close-out**: `docs/superpowers/close-out-about-launch-end.md`, after the walk.

## Risk to watch in PR 2

Until now the payments line was off in the capture. Turning it on can change frames other than `/credits`, for example
a credit line or the welcome strip on Home. Compare the recaptured frames against the shipped set. Any payments surface
on a frame that is not `credits` is reported before merge, not shipped silently.

## Close-out walk (390x844 and 1300x900)

| Route or surface | What to see |
|---|---|
| `/about` Reference | the seven entries in place, each opened with its halo on its frame, and `credits` under its new screen |
| `/about` Reference, new since 14 | the batch marked new |
| Home banner (a reader behind 16) | the line names the unseen entries in About's order |
| the ? on Home, Friends, Collection and `/credits` | each offers its new entries |
| `/friends` with invites off | the `friends` caption reads as shipped |
