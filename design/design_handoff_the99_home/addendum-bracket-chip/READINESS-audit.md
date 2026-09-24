# Readiness audit: Home addendum, the bracket chip on the resume row

**Verdict: Orange.** The placement, the states, the tokens and the copy are all buildable as drawn, and
the data is one opt-in flag that costs under a millisecond. Three things hold it back from Green: the
addendum's width table is measured against a line wider than the real one, none of its rows draws the
copies clause (the row state the chip squeezes hardest), and its worst-case row draws a range that cannot
occur. All three are Design corrections to the measurement, and none of them changes the placement. The marks-only departure also needs Hugh's ruling, because the ask said "unchanged".

Audited against `origin/main` at `dac4fd5c`. The addendum is `README.md` plus
`The 99 - Home · Bracket Chip Addendum.dc.html` in this folder.

## What was asked, and what came back

| Ask | Addendum | Holds? |
|---|---|---|
| Place the Analysis tab handoff's chip, unchanged, on Home's resume row | After `StatusPillBadge` on line two, 8px gap, in a `flex-none` group. **Marks only: the face is dropped** | Placement yes. "Unchanged" no. Design surfaced the departure and measured the reason. **Needs Hugh's ruling** (see R1) |
| 390 and 1300 | Both drawn (§B) | Yes, but the 1300 frame is 912px wide where the real column is 850 (F1) |
| No analysis: no chip | No chip, no reserved space | Yes |
| Single bracket | One mark, 26 wide | Yes (28 with the hairline, F1) |
| Range: two marks | Both marks, upper at 0.65, lower rank's plate | Yes, but the worst-case row draws `3–4`, a range that cannot occur (F6). Matches `DIM_OPACITY = 0.65` (`src/components/decks/bracket-mark.tsx:51`) and the chip's own `dim={i > 0}` (`src/components/decks/bracket-chip.tsx:45`) |
| Long deck name at 390 does not wrap | Checked, "commander keeps ~32px" | Nothing wraps. Without a copies clause the commander keeps 27px, not 32 (F1). With the clause it goes to 0px (F2) |
| No new mark, token or copy | None | Yes (see checks below) |
| No About entry | Cosmetic, none | Yes, as the AGENTS.md cosmetic rule allows |

## The surface today

- **The row** is `ResumeRow` in `src/components/home/resume-decks.tsx:89`. It is a `Link` 72px tall with
  `overflow-hidden`, `pr-[10px]` (`pr-[18px]` from 1180px) and a 1px border (`:124`). The text column is
  inset `pl-[108px]`, or `116px` from 1000px (`:160`). Line two is `flex min-w-0 items-center gap-[14px]`
  (`:195`) with, in order: the 19px `StatusPillBadge` (`:196-199`); the commander, `min-w-0 flex-1 truncate`
  (`:217`), which grows from a zero basis; and the count group. The count is `flex-none` (`:265`) and is
  followed by the copies clause `· N cards` (`:266-270`). The clause draws when the deck has a Shopping
  roll-up entry and is not a pair (`:110`).
- **Its data** comes from `listDecksWithStats(userId, "name", { includeProxyStats, includeDeckState,
  includeCommanderArt })` in `src/app/page.tsx:112-116`. The whole deck list is read, and `resumeDecks`
  sorts it and slices it to 4 (`resume-decks.tsx:44-46`). **`includeBracket` is not set**, so every Home row's
  `bracket` is null today (`src/lib/decks/read.ts:886-890`, `:982-984`).
- **The chip** is `BracketChip` (`src/components/decks/bracket-chip.tsx:20-52`). It has a radius of 6, a plate of
  the lower rank's ink at 12% over `--bg`, a 55% hairline, 22px marks, a mono face at 10 / 11, and a height of
  22 / 24 from `md` (`:36`). `verdictHead` decides between one mark and two (`:28-31`). The deck tile mounts it
  directly after the pill in a `flex-wrap … gap-x-[8px]` group (`src/components/decks/deck-card.tsx:526-534`),
  and the header uses `SpineBracketChip` (`bracket-chip.tsx:59-85`). Design's plate, hairline, radius, gap, mark
  size and dim all match the shipped component.

## Engineering cost of the permits on Home

**One flag, no new query, under a millisecond.** `storedPermitsSql()` (`src/lib/profile/stored-sql.ts:16-21`) is a
correlated subquery on `deck_profiles`'s primary key, and `listDecksWithStats` already selects
`declaredBracket` and builds the tile's `{ permits, answered }` through `tileBracket` (`read.ts:670-677`,
`:1165`). So Home needs `includeBracket: analysisTabEnabled()` added to the call at `page.tsx:112-116`.
That mirrors `/decks` (`src/app/decks/page.tsx:37`, `:55`), and the flag keeps Home dark while the tab is.

Measured on **staging** (read-only, `EXPLAIN ANALYZE` of the same subquery over the reference account's 19
decks): an index scan on `deck_profiles_pkey`, 19 loops at 0.041ms, **0.83ms** total for the statement. It
adds no round trip and no join, and there is nothing to resolve per reader. Staging has 2 of those 19 decks
analyzed and no ranges yet.

**Against "resolve at the draw":** that rule targets a per-reader enrichment placed inside a shared loader
that every caller then pays for. This is the opt-in form the rule names as correct (`includeCommanderArt`
is its precedent), so `/decks/[id]`'s deck-name call is untouched. The one inefficiency is that Home reads
permits for every deck and draws 4. Resolving them after the slice instead would be a second round trip to
a serverless Postgres to save about 15 index probes, so it is the worse trade. Do not move it.

## Findings

| # | Severity | Where | Finding | Correction | Owner |
|---|---|---|---|---|---|
| F1 | Medium | canvas §A table; README "Line two is 240px at 390 and 316 at 1300" | **The 1300 line is 283px, not 316.** The derivation `1300: the 2×2 grid's 450 row` leaves out the 62px `NavRail` (`src/components/shell/nav.tsx:148`, `w-[62px]` from `md`; `<main>` has no horizontal padding, `src/components/shell/shell.tsx:43`). The real left column is 1300 − 62 − 26 − 26 − 20 − 316 = **850** (`dashboard.tsx:116`, `:137`), rows are **419**, and line two is 419 − 2 (border) − 18 − 116 = **283**. The **narrowest pair is at 1180**, where line two is **223**, which is narrower than the phone's. At 390 it is 238 once the row's border is counted. The marks-only chip is **55 / 28** wide with its 1px hairline, not 52 / 26. The pill widths mix two conventions: `Unresolved`'s 76 includes the pill's 1px border (`src/lib/decks/status-style.ts:80`) and `Complete`'s 62 leaves it out, so `Complete` is **64**. The whole-chip widths are sized from `Optimized or cEDH`, but the widest reachable face is `Exhibition or Core` (`[1,2]`, `src/lib/bracket/verdict-head.ts:42`), at about **174 / 185**. | Redo the table at 390 (238), 1180 (223) and 1300 (283), with the chip at 55 / 28, `Complete` at 64, and the whole range chip at 174 / 185. The conclusion stands and gets stronger: a whole range chip overflows the 1300 line by about 46px even with the commander at zero. | Design |
| F2 | Medium | canvas §B, every row reads `99 / 99` | **No drawn row carries the copies clause**, but the chip squeezes that row hardest. The clause draws on any non-pair deck with a roll-up entry (`resume-decks.tsx:110`), which in practice means `To buy` and `Unresolved`, and both of those rows are drawn without it. The commander grows from a zero basis (`:217`), so when space runs short it goes to **0px first**, and then the clause truncates (it is `min-w-0 truncate`, `:267`). At 390, `To buy` + range + `· 12 cards` leaves 238 − 52 − 55 − 44 − 36 − 4 = 47px for the commander and the clause together: the **commander reads 0px** and the clause reads `· 12 c…`. With `Unresolved` + range the clause gets 23px (`· …`). **The wrong-number case is real at 393px**, the iPhone 15 and 16 width. Line two is 241 there, so `Unresolved` + range + `· 12 cards` leaves the clause about 26px, which renders **`· 1…`**. That reads as a different number, which is exactly the hazard decision 23 pins the count against. The same row does it again at 1215 to 1227 in the 2×2. A **pair** row at 390 with `Unresolved` + range leaves the names 27px, so `+ Br…` disappears and decision 19's "still says *pair*" is lost. | Draw a `To buy` row with its clause and a pair row, at 390 and at 1180. Then rule on what yields when a chip is drawn: the commander at 0 with the portrait carrying it, or the clause dropped as the pair row already drops it (`:104-110`, "one boolean, no measurement"), or something else. The claim "commander keeps ~32px" should be scoped to rows without a clause. | Design |
| F3 | Low | README "Checked" | **At a 360px phone the worst row clips the count.** Line two is 208px there. `Unresolved` (76) + 8 + range (55) + 14 + 14 + count (44) = 211, which is 3px over. With a copies clause the count group's `gap-[4px]` (`resume-decks.tsx:264`) stays even when the clause shrinks to nothing, so that row needs 215 and is 7px over. The row's `overflow-hidden` (`:124`) then cuts the figure, which decision 23 forbids. The ask named 390 only and every Home probe measures 390, so this is outside the letter of the ask. | State the narrowest width the row is drawn for, or accept 360 as out of scope. | Design |
| F4 | Low | README "The words go to the row's accessible name via … `statusWithBracket`" | **The row has no composed accessible name.** The `Link` reads its own text content (`resume-decks.tsx:112-125`; no `aria-label` anywhere in the file), unlike the tile, whose `aria-label` replaces the status with `statusWithBracket` (`deck-card.tsx:290-295`). If the phrase is appended as is, the status is read twice (`Complete … Complete, bracket Optimized`). | Mark the pill `aria-hidden` on this row and render `refreshCopy.decks.statusWithBracket(status, verdictHead(...).face)` (`src/lib/copy/refresh.ts:207`) in an `sr-only` span in its place. No new string, as the addendum says. | eng |
| F5 | Low | `src/app/decks/profile-actions.ts:82` | **An analysis retires `/decks` and not Home.** The deferred `revalidatePath("/decks")` exists because the tile draws the chip. Home will draw it too. | Add `"/"` to the same `after()`. It is deferred, so it adds nothing to the action's reply. | eng |
| F6 | Medium | canvas §B, the fourth row (`low: 3, high: 4`) | **The worst-case row draws a range that cannot occur.** `permitsFor` returns only `[1,2]`, `[2]`, `[3]`, `[4]` and `[4,5]` (`REACHABLE`, `src/lib/bracket/verdict-head.ts:42`). `tileBracket` returns null for anything else (`src/lib/decks/read.ts:675`), so a `3–4` reading would draw no chip at all. The marks-only width is the same for any range, so the measurement survives. What is wrong is the canvas specifying an unbuildable state as the worst case. | Draw the worst case as `[1,2]` (`Exhibition or Core`, also the widest face) or `[4,5]`. | Design |

## Checked and clean

- **Tokens.** `--bracket-1` through `--bracket-5` are declared in every theme (`src/app/globals.css:70-74`, `:131` onward). The
  plate and hairline are the component's own `color-mix` expressions. `--border-strong`, `--bg` and `--surface-inset`
  already exist.
- **Copy.** No new string. `statusWithBracket` and `verdictHead(...).face` both ship. The canvas's `-chip-ink.svg`
  files are canvas-only stand-ins for the page's mask, the same way the Analysis tab handoff drew them. The
  component draws through `BracketMark` (`bracket-mark.tsx`), the shipped chip art is in `public/brackets/*-chip.svg`,
  and nothing in `design/` is copied or imported.
- **Build shape.** `face?: boolean` (default true) on `BracketChip`, with `pr-[2px]` when it is false, keeps
  "one chip, one component" (`bracket-chip.tsx:6-12`). The row mounts `BracketChip` directly, not
  `SpineBracketChip`, because it is presentation inside the row's link, as the tile's is (`bracket-chip.tsx:55-57`).
- **Height.** The row's content box is 72 − 20 (padding) − 2 (border) = 50px (`resume-decks.tsx:124`). Line two is
  19px today, set by the pill. The chip makes it 22px at 390 and 24px from `md`, so line one (14.5 × 1.2) + 4 + 22
  = 43.4 on the phone and 45.4 on desktop both fit, and the row stays 72.
- **The About specimen** mounts `ResumeDecks` with fixtures whose `bracket` is `null`
  (`src/lib/about/fixtures.ts:1292`, `:1323`, `:1352`, `:1379`), so it draws exactly what it draws today.
- **Long name at 390.** Line one truncates the name beside `committed 10mo ago`, as shipped (`:179-193`).
  Line two is a single `nowrap` flex line whose unshrinkable parts fit at 390 (211 of 238 in the worst row), so
  nothing wraps. See F2 and F3 for what the chip squeezes.

## Ruling needed from Hugh

**R1 · Marks only on this row.** The ask said the chip goes on unchanged, and the addendum drops its face.
Measured against the corrected widths in F1, a whole range chip does not fit at 390, 1180 or 1300. A whole
single chip fits only at 1300. There the commander keeps about 40px beside `Complete`, about 22px beside `Unresolved`
with an answered `Exhibition`, and 0px once a copies clause is drawn. Design's fallback (whole at 1300
for a single bracket, nothing at 390) makes the row change shape with the viewport. **Recommend accepting
marks only**, with the face in the accessible name (F4).

## Note, not a finding

The 19px row pill (`resume-decks.tsx:198`) sits beside a 22 / 24 chip, so the chip stands 3 to 5px taller.
The tile pairs a 22px pill with the same chip. Design drew it this way on purpose, and it reads fine in the
canvas.
