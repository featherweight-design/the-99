# Readiness audit: Home addendum, the bracket chip on the resume row

> **Revision 2 (2026-09-24), at the end of this file, supersedes the verdict below.** F1, F2, F3 and F6 are fixed. The verdict stays Orange on one new ruling (R2).

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

## Revision 2 (2026-09-24)

**Verdict: Orange.** All four Design findings are fixed: F1, F2, F3 and F6. The width table is right. Every
drawn row carries its clause. 360 is drawn and nothing clips. The worst case is the reachable `4–5`.
One new ruling holds it back from Green. Pass 2 does not fix the one-line row. It **redraws every Home row
as three lines and adds the deck tile's progress bar to the row** (section C). That goes past the ask,
and the README says so itself. Hugh has to choose between C and the fallback B (R2). Both are buildable
as specified. Nothing goes back to Design.

Re-audited against `origin/main` at `f93eea71`. None of the files the first pass cited has changed since
`dac4fd5c`, so every line reference above still holds. The revision changes `README.md` and the canvas.
The six chip assets and `support.js` are byte-identical to pass 1.

### What pass 2 proposes

- **C, the proposal.** Every row, chip or not, has three lines. (1) The name and stamp, unchanged. (2) The pill,
  then the chip in a `flex-none gap-[8px]` group, then the commander, `min-w-0 flex-1 truncate`, which is the
  only thing on the line that shrinks. (3) A 3px bar (`flex-1 min-w-0`, `statusBarStyle`), then the whole
  count group `{built} / {bodySize} · N cards`, `flex-none whitespace-nowrap`, which never shrinks. The row
  changes from `py-[10px]` to `py-[4px]`; the text column's `gap-[4px]` is unchanged.
- **B, the fallback.** Only a row with a chip splits: the pill and chip on line two, and the commander and
  count on line three. Those rows get `py-[6px] gap-[2px]`. A row with no chip is the shipped row.

### F1, F2, F3 and F6

| # | Status | Evidence |
|---|---|---|
| F1 | **Fixed** | The canvas §A header and the README both give 208 / 238 / 223 / 283 at 360 / 390 / 1180 / 1300. That matches the tree: the rail is `w-[62px]` from `md` (`src/components/shell/nav.tsx:148`), and `<main>` has no horizontal padding (`shell.tsx:43`). The dashboard is `px-[16px]` below 1180 and `p-[20px_26px_26px]` with `gap-[20px]` and a `w-[316px]` rail from 1180 (`dashboard.tsx:116`, `:137`). The rows are `basis-[calc(50%-6px)]` in a `gap-[12px]` wrap (`resume-decks.tsx:334`, `:341`), so (850 − 12) / 2 = 419. Pills are 64 / 52 / 76, since `statusPillStyle` draws a 1px border (`status-style.ts:80`) around `px-[7px]` of 6px glyphs. The chip is 28 / 55: `pl-[2px]`, a 1px border, 22px marks (`CHIP_MARK_PX`, `bracket-chip.tsx:93`) and a 5px gap (`:36`), with `pr-[2px]` once the face is gone. The count is 44 and `· 12 cards` is 63, since mono at 10.5 advances 6.3. One slip, in the README only: its "To buy + single" row reads 110 / 140 / 185, and the true figure is **106 / 136 / 181** (208 − 52 − 8 − 28 − 14). The canvas computes it correctly in the frame labels, so the build is unaffected. |
| F2 | **Fixed** | All three cases in both C and B carry the clause (`· 12 cards`, `· 12 cards`, `· 4 cards`). In C the count group has a line to itself and nothing in it can shrink. The narrowest line is 208 at 360, and the group needs 111 plus a 10px gap. At 390 the commander keeps 85px in the worst row (13 characters, `Yuriko, the T…`) and 136 or more on every other drawn row. Decision 23's hazard, a partly printed figure, can no longer occur at any width. A **pair row** is not drawn. In C its names take the commander's slot, so they get the same 55 / 85 / 130 as the worst single row. At 390 that is `Ishai + Bru…`. At 360 the partner span gets about 19px, which still fits the `+ …` that decision 19 needs. The pair row keeps dropping the clause (`:110`). C no longer needs that rule for width, but the README keeps it unchanged, which is right: that is a separate change. |
| F3 | **Fixed** | 360 is drawn in both C and B, and nothing clips at it. In C, line two's worst case is `Unresolved` + the range + 14 = 153 of 208, and line three is 121 of 208. C holds down to about a 305px viewport before the commander reaches 0. It also fixes a clip that ships today with no chip involved. At 360 the shipped `Unresolved` row with a clause has 56px left for the 63px clause, so it prints `· 12 ca…` with the commander at 0. Under B that no-chip row stays as it ships. |
| F6 | **Fixed** | The worst case is now `Unresolved` with an unanswered `4–5`: the rank-4 plate, the rank-5 mark at 0.65, `99 / 99 · 12 cards`, the longest name, and `committed 10mo ago`. `[4,5]` is in `REACHABLE` (`src/lib/bracket/verdict-head.ts:42`). The single case is Upgraded (`[3]`). A range chip is 55 whatever its ranks, so `[1,2]` would measure the same. |

### Width budget in C

Line = row − 2 (border) − right padding (10, or 18 from 1180) − inset (108, or 116 from 1000). Line two's
commander = line − pill − (8 + chip, when drawn) − 14. Line three's bar = line − 10 − 111.

| | 360 | 390 | 393 | 1180 (2×2) | 1300 (2×2) |
|---|---|---|---|---|---|
| Row / line | 328 / 208 | 358 / 238 | 361 / 241 | 359 / 223 | 419 / 283 |
| Commander · `Unresolved` + range | 55 | 85 | 88 | 70 | 130 |
| Commander · `Complete` + range | 67 | 97 | 100 | 82 | 142 |
| Commander · `To buy` + single | 106 | 136 | 139 | 121 | 181 |
| Commander · `Unresolved`, no chip | 118 | 148 | 151 | 133 | 193 |
| Commander · `To buy`, no chip | 142 | 172 | 175 | 157 | 217 |
| Bar (count group whole, 111) | 87 | 117 | 120 | 102 | 162 |

Nothing on line two or three is ever asked for more than the line has, at any of these widths. 1180 is
still the narrowest desktop, and it sits between the two phones.

### New in pass 2

| # | Severity | Finding | Resolution | Owner |
|---|---|---|---|---|
| N1 | Medium | **C adds a bar to every Home row and reshapes the no-chip row.** The resume row has never drawn a progress bar (`statusBarStyle` has no caller under `src/components/home`). The Home handoff ruled that "the status pill is the row's status signal" (`design_handoff_the99_home/README.md`, E3). C adds a second status-inked signal beside the count, on rows with no chip too. The README flags this and asks for sign-off. | Hugh's ruling (R2). | Hugh |
| N2 | Medium | **The canvas headline describes B, not C.** The H1 ("A row with a chip splits line two in two"), the intro paragraph ("A row with no chip is the shipped row, unchanged"), the last three rows of the §A table (`line − 125`, `in 58`) and the three cards under B all describe the fallback. Only section C and the README describe the proposal, so a builder who reads the canvas from the top builds B. | Build from the README and the section C frames. If R2 picks B, the headline is correct as it stands. No Design round is needed: nothing is missing, it only points at the other option. | eng |
| N3 | Low | **C fills the content box with no slack.** 17.4 + 4 + 24 + 4 + 12.6 = 62 in a 62px box from `md` (60 on the phone). B does the same, at 58 in 58. Line one is a baseline-aligned line that mixes Cinzel at 1.2 with the stamp at the inherited 1.5, so its laid-out height is not guaranteed to be 17.4. Any excess is split top and bottom and cut by the row's `overflow-hidden` (`:124`). | Measure line one's laid-out height in the build's probe at 1300 and 390. If it is over, `py-[3px]` recovers 2px. | eng |
| N4 | Low | **Line two's height is stated in the canvas and not in the README.** The canvas sets `height: 22 / 24` on line two in every C row. Without it, a no-chip row's line two is the pill's 19px, so in a mixed 2×2 pair the two rows' text blocks differ by 5px and the deck names sit about 2.5px apart. C's "no offset in a mixed pair" depends on that height. | Put `h-[22px] md:h-[24px]` on line two. | eng |
| N5 | Low | **"The tile's 3px progress bar" is not quite the tile's.** The tile's track is `h-[3px] rounded-full` on `--border`, and it omits the fill at `built === 0` (`deck-card.tsx:557-571`). C specifies `rounded-[2px]` on `--border-strong` with the fill always drawn. | Follow the README's `--border-strong`, because it stands on `--surface-inset`, not the tile's ground. Keep the tile's `built > 0` fill rule so an empty deck draws an empty track. | eng |

### Carried over

- **F4 and F5 stand as written above**, and the README's "Data and engineering" section now restates both.
  The anchors are unchanged on `f93eea71`: the row has no composed accessible name (`resume-decks.tsx:112-125`),
  and the analysis action still defers only `revalidatePath("/decks")` (`src/app/decks/profile-actions.ts:82`).
- `includeBracket: analysisTabEnabled()` is still the whole data change (`src/app/page.tsx:112-116`).
- `face?: boolean` on `BracketChip`, with `pr-[2px]` when it is false, is unchanged from pass 1.
- **Checked and clean, again.** No new token: all 14 tokens the README lists are declared in all six themes in `globals.css`. No new
  string. No new mark: the `*-chip-ink.svg` stand-ins are the same files as pass 1, and nothing in `design/`
  is imported. No About entry, per the cosmetic rule.

### Ruling needed from Hugh

**R2 · C or B.** Recommend **C**. It gives every row the same three lines, so a mixed pair never offsets and
a row keeps its shape when a deck gets its first analysis. It fixes the 360 clause clip that ships today. It
gives the count a line of its own at every width, which retires decision 23's hazard rather than managing
it. The cost is N1, a bar on a row the Home handoff kept to a single status signal, and a change to rows
that have no chip. B keeps the shipped row wherever there is no chip. It costs a 9px name offset in a
mixed pair, and the row changes shape on a deck's first analysis.
