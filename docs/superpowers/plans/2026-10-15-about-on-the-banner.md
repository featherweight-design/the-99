# About on the banner: implementation plan (upcoming precons, phase 2)

Phase 2 of `2026-10-14-upcoming-precons.md`. The handoff is `design/design_handoff_the99_upcoming_precons/`:
`R2 - Home-About.dc.html` (A1–A3), STATES §"About in the banner", and the R2 note 3. Readiness was Yellow on Q1–Q4;
Hugh answered all four on 2026-10-14 (recorded in the phase 1 plan), which makes it buildable. The banner component
shipped in #1767.

## Hugh's answers (not re-litigated)

- **Q1, reach:** Home only, with no deep-link fallback. This overturns the About rethink's H1 for this notice.
- **Q2, ✕:** ✕ counts as seen. It writes About's `seen`, which clears `/about`'s new marks and its what's-new index.
- **Q3:** the How it works appendix line is dropped. The entry stays on `/about`; only its mention in the notice goes.
- **Q4:** the sheet's live announcement is dropped. The banner keeps its pattern: a labelled `<section>`, drawn by
  the server and met in reading order, with no live region.

## What exists today (main at 6d0c654)

- **The sheet path.** With `ABOUT_SHEET_ENABLED` on:
  - The proxy decides, on a document load of any page except `/about`, whether to draw the sheet (`sheetDecision`).
  - It writes the `about_sheet` cookie keyed to the reader's visible entries, so the sheet shows once per browser.
  - It sends `x-about-sheet` to `Shell`, which mounts `AboutSheet`.
  - Later writes nothing. Only a visit to `/about` writes `seen` (`markAboutVisited`).
  - Off, the legacy redirect gate runs (`gateDecision`, `about_v` cookie).
- **What the sheet's presence affects:**
  - the `--about-sheet-h` reserve, read by `Shell`'s `<main>` padding and by `pending-overlay`;
  - `about-sheet-presence.ts`, through which a tab-bar note waits for the sheet.
- **Seen state** is in `user_prefs` (`about_version_seen`, `about_seen_ids`), stamped since 0123. Home's cached
  payload can therefore carry it, and an About write retires it.
- **Measured, read-only:**
  - Staging: 2 accounts have a `user_prefs` row, both at version 14, and neither has seen `upcoming-precons`, which
    the switch flip announced.
  - Production: 5 accounts have a row, and 4 of them are at version 14.

## What every account sees on release day

Release day is the deploy of PR A (below), with `ABOUT_SHEET_ENABLED` on as it is today. **d9 to confirm its value on
production.** If it is off there, production keeps the legacy redirect, and none of this applies until it is turned on.

- **An account with nothing new in About** (4 of 5 on production) sees no change that day.
  - The sheet never draws again.
  - The next entry, from a bump or a switch flip, arrives as a line on Home instead of a card over whatever page they
    opened.
- **An account with an unseen entry, in a browser that already showed its sheet** (the `about_sheet` cookie is current
  for that browser): no About line, in that browser.
  - That browser was already told, and pressing Later there meant "not now". Re-announcing the same entries on Home
    the day the notice moves would read as a bug.
  - The cookie is honored, read only, and never written again.
- **The same account in a browser that never showed the sheet,** or once its entries change: Home leads with
  `N new in About: {titles}. Show me`, capped by `sheetTitles`.
  - The line stays on every Home load, on every device, until ✕, Show me, or a visit to `/about`.
  - ✕ writes `seen`, as Q2 rules.
- **On staging**, both accounts get the `Commander sets on the way` line on Home, unless their browser's sheet cookie
  already covers it.
- **Every page but Home** shows nothing. The tab bar's locked-slot note opens at once, with no waiting.
- **A first-run account** (About's own rule: version 0, no ids) gets the line `What The 99 does: … on one page. Show me`
  (A3), in place of the sheet's first-run card. About's first run and Home's checklist are separate states
  (`isFirstRun` reads About's seen state, Home's checklist reads no cards and no decks), so an account that imported
  before ever opening `/about` gets A3 on the Dashboard. The line is drawn on whichever Home surface renders. No
  arrival lines draw on the checklist, as in phase 1.

## PR boundaries

### PR A: the About line on the banner, with the sheet switched off in place

One PR of about 500 runtime lines. It adds the line, and stops the sheet drawing without deleting it, so that
reverting PR A is the rollback.

- **The read, `src/lib/about/notice.ts`:**
  - `aboutNotice(seen, visible, sheetCookieCurrent)` returns `{ kind: "behind", entries }`, `{ kind: "firstRun" }` or
    `null`.
  - It is the same rule `sheetDecision` applies (`isFirstRun`, `unseenEntries`), with the appendix id left out (Q3),
    and pure.
  - `aboutNotice` is unit tested on the same fixtures as `sheetDecision`, including a switch-tied entry that a flip
    makes new.
- **The cookie check** is read per request, OUTSIDE Home's cached payload, because a cookie is per browser and the
  cache entry is per reader. The seen state rides inside the payload (stamped). The page combines the two. The cookie
  comparison reuses `sheetCookieIsCurrent`.
- **`ArrivalsBanner`:**
  - It takes an optional `about` line, drawn first: A1 alone, or A2 under the `New in the app` heading with About's
    line first.
  - Show me goes to `/about` (which already records the visit).
  - One ✕ dismisses both.
  - `Dashboard` passes it.
  - The banner draws when either half has content.
- **The ✕ action** (`dismissArrivals`, extended):
  - It re-reads the reader's notice on the server and writes `markAboutVisited(ABOUT_VERSION, ids)` for only the ids
    the page drew that are still unseen and visible. The rule is the same as the arrival keys': a client can drop an
    id but never add one.
  - It writes the arrival keys as before.
  - The client acknowledgement set from #1767 extends to About ids, so Back after ✕ or after a `/about` visit doesn't
    bring the line back.
- **Both Home surfaces draw About's notice, in whichever form it takes.** The two first-run states are independent
  (`isFirstRun` in `src/lib/about/visible.ts` against `stats.uniqueCards === 0 && decks.length === 0` in
  `src/app/page.tsx`), so each of the four combinations has a home:
  - Dashboard, About behind: A1, or A2 with arrivals.
  - Dashboard, About first run (imported before ever opening `/about`): the A3 line in the banner, with ✕. Its ✕
    writes `markAboutVisited(ABOUT_VERSION, visible ids)`, which is what a visit to `/about` writes.
  - Checklist, About first run: the A3 line, with no ✕, since the checklist is itself the first-run surface.
  - Checklist, About behind (an account that read `/about` and then cleared its collection): the A1 line, with no ✕.
  The checklist's payload carries the same About seen state as the Dashboard's.
- **The proxy:**
  - With the switch on, `sheet()` no longer sets `x-about-sheet` and no longer writes the cookie.
  - The legacy branch (switch off) is untouched.
  - `AboutSheet` then never mounts, so `--about-sheet-h` stays 0 and the tab-bar note never waits. The code stays,
    for PR B.
- **Copy** goes in `src/lib/copy/arrivals.ts`. It reuses the sheet's heading and title strings from
  `src/lib/copy/about.ts` where the words are the same, and goes through `/copy-review`.
- **No About entry and no `ABOUT_VERSION` bump.** This is a restyle of a notice, per the handoff. The existing entry
  that describes how About announces itself gets an ordinary edit if it names the sheet (grep `about.ts`).
- **Docs:** the AGENTS.md lines saying a bump shows a sheet "over whatever page they opened" are updated.
- **Proof:**
  - Unit tests for the read, the action's re-validation, the banner's three forms and the cookie suppression.
  - A browser probe, `probe:about-banner` (local-dev, loopback only, prefs restored), at 390 and 1300 covering:
    - A1, A2 and A3;
    - ✕ writes seen, and `/about`'s index is then empty;
    - Show me lands on `/about`;
    - a non-Home page shows nothing;
    - the sheet never draws;
    - the cookie suppression;
    - Back after ✕.

### PR B: retire the sheet's code (a week after PR A is live in production, not a week after it merges)

- **Moves first:** `sheetTitles` and its tests, from `about-sheet.tsx` to `src/lib/about/` (`ArrivalsBanner` imports it
  today and PR A's About line reuses it). The banner's import moves with it, so the deletion breaks nothing.
- **Deletes:**
  - `AboutSheet` and its other tests;
  - `about-sheet-presence.ts` and the tab-bar note's waiting rule (`nav.tsx`);
  - the `--about-sheet-h` reserve in `Shell` and `pending-overlay`;
  - the proxy's `sheet()` path;
  - `SHEET_HEADER` and `SHEET_ON_HEADER`, and the `about_sheet` cookie's writer.
- **Keeps:** the cookie READ for suppression, until its one-year max-age lapses or Hugh calls it.
- **Probes:** every probe that calls `clearAboutSheet` is updated (`scripts/lib/about-clear.test.mts` lists them).
- **Size:** mostly deletion, under 20 files.

## Route and viewport inventory

| Route | State | 390 | 1300 |
|---|---|---|---|
| `/` | A1, About line only | ✓ | ✓ |
| `/` | A2, About and an arrival | ✓ | ✓ |
| `/` | after ✕, no banner, and `/about` shows no new marks | ✓ | ✓ |
| `/` | sheet cookie current, no About line | ✓ | ✓ |
| `/` first run | A3 on the checklist | ✓ | ✓ |
| `/` | A3 on the Dashboard (imported, `/about` never opened), ✕ writes seen | ✓ | ✓ |
| `/` first run | A1 on the checklist (About behind, no cards) | ✓ | ✓ |
| `/decks`, any non-Home route | no notice, no sheet | ✓ | ✓ |

## Risks and decisions I took

- **Honoring the sheet cookie on release day** was my call, approved by the orchestrator as Hugh's proxy on
  2026-10-15. Without it, every browser that already showed and dismissed the current entries is told again on Home.
- **`ABOUT_SHEET_ENABLED` is `'true'` on both projects** (orchestrator, 2026-10-15). PR A also reads `/admin` for an
  app-wide override, read only, before it ships.
- **Reach drops** for a reader who never lands on Home. Hugh accepted that (Q1).
- **Rollback** is a revert of PR A while PR B is unmerged, which is why the deletion waits a week of PR A live in
  production.
- **`ABOUT_SHEET_ENABLED` keeps its name.** On, it now means "About's notice is a banner line on Home". Renaming a
  switch moves `flag_overrides` rows and the admin list for no reader-visible gain.
