# Readiness audit: navigation pending

**Verdict: 🟡 Yellow.** It can be built once the seven corrections below are applied. Engineering
has ruled on each one, and d9 accepted all seven on 2026-09-28. Four product questions are open
for Hugh, and nothing is built until he has approved.

This audit was run against `origin/main` at `911e97aa6` (#1086), using Next 16.3.4's own docs in
`node_modules/next/dist/docs`.

## What checks out

- **Files.** There are 17 `loading.tsx` files under `src/app`. That is exactly the README's 13 to
  delete plus its 4 to keep, and none goes unmentioned. The `ChooseLoading` branch the README
  names is real (`decks/new/loading.tsx:13`).
- **Nested boundaries.** "Keyed per child segment" is correct. `loading.js` wraps `page.js` and
  every child below it (`03-file-conventions/loading.md`), and the router keys that boundary per
  child segment (`layout-router.js:415`). So `/decks/[id]/changes` and `/decks/[id]/import` would
  meet `[id]`'s screen even without their own files.
- **Tests and copy.**
  - `route-loading.test.ts:37-44` asserts one boundary per page, and the discover-words test is at
    `:46-49`.
  - `shellCopy.loading` holds exactly the 11 keys the README names. Nothing outside the loading
    files reads the 8 it retires.
  - `LoadingScreen`'s docstring says "the eight segments". That was already wrong, since it has
    16 users.
- **`useLinkStatus`** exists (`04-functions/use-link-status.md`; the export is in
  `client/app-dir/link.d.ts`). It has to be read inside a descendant of the `<Link>`. It reports
  pending until history updates.
  - A route that is already prefetched skips pending entirely.
  - When several links are pressed quickly, only the last one reports pending.
  - The docs themselves recommend a ~100ms CSS delay, which the README's 120ms matches.
- **Tokens and marks.** The `dots` keyframes (0.25 ↔ 1) and `.anim-dots` (1.2s) exist. `--fg`,
  `--fg-muted` and `--elevated-hover` are declared in every theme. So are `ui/crown.tsx` and
  `marks.tsx`.
- **About.** The change is cosmetic, so it adds no capability and owes no entry. The handoff draws
  none.

## Corrections, ruled by engineering

1. **The pending style overrides hover rather than inheriting it.** The README's "the button keeps
   its hover fill (`--elevated-hover`)" is false for `GhostButton`. Its hover is an `--accent` border
   and an `--accent-hover` label, with no fill (`ui/button.tsx:40-43`). So a pressed button would
   show accent while pending, which is the colour the README rules out. The canvas draws the
   pending button at `--elevated-hover` with `--border-strong` and `--fg`, so the build follows
   the canvas: pending overrides hover. `PrimaryButton` links (an `--fg` fill) are not drawn. They
   get the same 1px track in `--fg-muted` over their own fill.
2. **The whole-row examples are the commander row and the set row.** The README's two examples,
   the resume row (`resume-decks.tsx:118`) and the deck tile (`deck-card.tsx:618`), both link to
   `/decks/[id]`. That is a kept route, so by the README's own rule neither ever shows the track.
   The whole-row links that do go pending are `commander-row.tsx`'s row link and
   `set-index-view.tsx`'s set row.
3. **The sweep runs with `animation-fill-mode: both`.** Without it, the segment paints at
   `translateX(0)` during the 120ms delay, which is a visible bar from the first frame.
4. **The nav slot's pending fill comes from a descendant.** The `<Link>`'s own className cannot
   read `pending`, so the slot's `--elevated-hover` and `--fg` come from `PendingPip` through
   `:has()`. The slot needs `position: relative` for the pip. The rail's `transition-colors` must
   not fade the fill out on landing, because the README says "no exit".
5. **Reduced motion.** There is no global reduced-motion rule, only the per-class list at
   `globals.css:745`. `pipIn` and the sweep join that list. Under reduced motion the pip is drawn
   still, at full opacity as the canvas's T1 draws it, and it keeps the 120ms delay so a ~95ms
   navigation never flashes it. "Still regions" have no mechanism in the code today. The build
   treats reduced motion as the only still case, and adds nothing further.
6. **Stale docs are swept by hand.** `docs/superpowers/design-tables/appshell.md:1952-1985`
   describes `app/loading.tsx` and quotes its copy. `check:copy-drift` cannot see a string that was
   deleted outright. The two `ChooseLoading` comments (`choose-loading.tsx:2-5`,
   `choose/loading.tsx:1`) go stale too.
7. **What is delayed.** The README says 120ms, and the canvas's T1 says "0ms: press takes its
   pending colour at once". Both hold, for different parts. The slot's fill and ink change at once,
   and the pip and the track appear after 120ms.

Also recorded: **the walk runs on `next start`**. `next dev` turns Link prefetch off, and a
prefetched kept route skips pending, so the README's "links into a kept-screen route show neither
signal" is true only in a production build. Inline text links (the card modal's name links, the
fits-picker link) and same-route query links (filters, views) are out of scope and show no signal,
unless Hugh rules otherwise under D below.

## The rule, measured

These figures come from `next start` of main with **every** `loading.tsx` removed, so each one is
the real wait with no screen. The database was a scratch Neon branch holding a `pull:staging` copy
of the reference account (20 decks, 3,250 collection rows), with `LIST_CACHE_ENABLED` off, as
production runs.

Each figure is a client navigation timed in the page from `router.push`, from Home (Home itself is
timed from `/decks`). A navigation has landed when the new page's content paints. Each cell is the
median of 3, first navigation / second navigation after a reload, in ms.

| Route | 1300 | 390 | Rule |
|---|---|---|---|
| Home | 641 / 628 | 677 / 652 | delete (see A) |
| `/decks/[id]` | 692 / 586 | 668 / 571 | keep, as drawn (see B) |
| `/commanders/[slug]` | 538 / 581 | 612 / 573 | delete |
| `/decks` | 479 / 488 | 465 / 430 | delete |
| `/collection` | 366 / 348 | 361 / 338 | delete (Hugh's call) |
| `/decks/new` | 361 / 326 | 367 / 336 | delete |
| `/collection/replace/summary/[id]` | 253 / 252 | 218 / 195 | delete |
| `/about` | 151 / 99 | 155 / 90 | delete |
| `/discover` | 124 / 117 | 111 / 109 | delete |
| `/commanders` | 103 / 100 | 112 / 111 | delete |
| `/collection/proxies` | 99 / 92 | 97 / 95 | delete |
| `/collection/sets` | 90 / 74 | 88 / 70 | delete |
| `/collection/sets/[code]` | 70 / 55 | 59 / 60 | delete |
| `/collection/replace` | 52 / 44 | 56 / 60 | delete |
| `/decks/new/choose` (no query) | 31 / 23 | 34 / 36 | keep, as drawn (see C) |

Every deletion the README left unmeasured lands under ~700ms. This machine reaches the database in
about 33ms.

## Open for Hugh

- **A. Home, uncached.** Home measures 628–677ms here, which clears the line by 25–70ms.
  Production and staging now both run in pdx1, the same region as Neon, so production's round
  trips are close to this machine's. Uncached Home in production is therefore probably also just
  under 700ms. That is still the longest the old page would sit with only a pip. It is measured on
  staging with `LIST_CACHE_ENABLED` briefly off, and the figure goes here before the build. With
  the cache on, Home is ~62ms, and the question goes away.
- **B. The deck page.** Since PR 8 it measures 571–692ms with no screen, which is under the
  rule's line. The handoff keeps its screen anyway. Engineering agrees: it is still the slowest
  route. The rule alone no longer draws that line.
- **C. `/decks/new/choose`.** With no query it lands in 23–36ms, so the rule would delete it. Its
  screen is there for the results navigation, which is a query change and was not timed. It is
  kept as drawn.
- **D. Inline and same-route links** show no signal, as recorded above.
- Already open: `/collection` keep or drop, and the 1px track checked at 1× on a device.
