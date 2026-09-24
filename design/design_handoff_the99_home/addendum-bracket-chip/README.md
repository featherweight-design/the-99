# Handoff: Home addendum, the bracket chip on the resume row (pass 2)

## Overview
This addendum puts the Analysis tab's `BracketChip` on Home's `ResumeRow` (`src/components/home/resume-decks.tsx`). It
amends `design_handoff_the99_home/`. It is cosmetic on a known surface, so it has no About entry. Pass 2 answers
`READINESS-audit.md` (PR #903): F1, F2, F3 and F6. F4 and F5 are eng. **R1 was ruled by Hugh on 2026-09-23: marks only on
Home.**

## About the design files
`The 99 - Home · Bracket Chip Addendum.dc.html` is a **design reference drawn in HTML**, not production code. Rebuild it in
the app's existing components, `ResumeRow`, `StatusPillBadge`, `BracketChip` and `statusBarStyle`, with Tailwind as the file
already uses it. The `assets/*-chip-ink.svg` files are canvas-only stand-ins. The app draws the marks through `BracketMark`.
Don't copy or import anything from `design/`.

## Fidelity
High fidelity. Widths are measured with mono at 0.6em advance. Pills include their 1px border.

## Canvas sections
- **C: the proposal.** The count gets its own line with the progress bar, on every row. Drawn at 360, 390 and 1300.
- **A: the measurement.** The corrected width table (F1), and a ✕ record of the one-line row failing.
- **B: the alternative.** Only rows with a chip split. This is superseded by C and kept for comparison.

**C changes the no-chip row as well, so it goes past the original ask. Hugh has to sign off on C before build.** If he
turns it down, B is the fallback; its spec is at the end of this file.

## The row (C)
`Link`: `h-[72px]` (unchanged), `py-[4px]` (was 10), `pr-[10px]` / `min-[1180px]:pr-[18px]`, border, radius 12, `overflow-hidden`,
`--surface-inset`. The `ArtWash` is unchanged: 72 tall, 99px portrait, `labelAtPx="flat"`.

The text column keeps `pl-[108px]` / `min-[1000px]:pl-[116px]`, `flex-col`, and changes to **`gap-[4px]`**. It has three lines:

1. **Name and stamp.** Unchanged. The name is Cinzel 14.5 / 600 / 1.2 in `--fg` and truncates. The stamp is mono 10.5 in `--fg-locked`, `ml-auto flex-none`.
2. **Plates and commander.** `flex items-center gap-[14px] min-w-0`, 22 tall (24 from `md`).
   - A `flex flex-none items-center gap-[8px]` group holds `StatusPillBadge` (19px, as shipped) and, when `deck.bracket` is
     set, `BracketChip face={false}`.
   - The commander (or the pair spans, as shipped) is `min-w-0 flex-1 truncate`, mono 10.5 in `--fg-body`. It is the only child that shrinks.
3. **Bar and count.** `flex items-center gap-[10px] min-w-0`, line-height 1.2.
   - The bar is `flex-1 min-w-0 h-[3px] rounded-[2px]` on `--border-strong`, with the fill from `statusBarStyle(status, built, bodySize)`.
   - The count group is `flex-none flex gap-[4px] whitespace-nowrap`, mono 10.5 in `--fg-faint`: `{built} / {bodySize}` then
     `· {detailCopies(copies)}` when the clause draws (`:110`, unchanged: a roll-up entry and not a pair). **Nothing here shrinks or truncates.**

Height: 17.4 + 4 + 22 / 24 + 4 + 12.6 = 60 / 62, inside a 62px content box. The 4px gap is the most that fits in 72.

## The chip, marks only (R1)
Add `face?: boolean` (default true) to `BracketChip`. When it is false, drop the face span and use `pl-[2px] pr-[2px]`.
Everything else is shipped: the plate is `color-mix(in srgb, ink 12%, var(--bg))`, the hairline is ink at 55% (oklab), radius 6,
gap 5, 22px marks, a range's upper mark at 0.65, and 22 / 24 tall. `verdictHead` picks one mark or two. **Widths with the hairline: 28 single, 55 range.**

## Measurements (F1)
Line widths: 208 at 360, 238 at 390, 223 at 1180 (the narrowest desktop pair) and 283 at 1300. At 1300 the column is
1300 − 62 rail − 26 − 26 − 20 − 316 = 850, the rows are 419, and the line is 419 − 2 − 18 − 116. Pills: `Complete` 64,
`To buy` 52, `Unresolved` 76. Count `99 / 99` 44, clause `· 12 cards` 63. The widest whole chip is 174 / 185.

What the commander keeps on line two in C:

| Case | 360 | 390 | 1300 |
|---|---|---|---|
| Unresolved + 4–5 range | 55 | 85 | 130 |
| To buy + single | 110 | 140 | 185 |
| To buy, no chip | 142 | 172 | 217 |

The bar keeps line − 10 − the count group: 85 or more at 360.

## Cases drawn (F6)
- **No chip:** `To buy`, `87 / 99 · 12 cards`.
- **A single mark:** Upgraded, `To buy`, `95 / 99 · 4 cards`.
- **The 4–5 range:** Optimized or cEDH, unanswered, `Unresolved`, `99 / 99 · 12 cards`, with the longest name and stamp.

`3–4` is gone. The app only produces the ranges 1–2 and 4–5, and the marks-only width is the same for either.

## F3
360 is the narrowest width drawn, and nothing clips at it.

## Data and engineering
- Add `includeBracket: analysisTabEnabled()` to `listDecksWithStats` at `src/app/page.tsx:112-116`. It costs 0.83ms on staging.
- F4: mark the pill `aria-hidden`, and render `refreshCopy.decks.statusWithBracket(status, verdictHead(...).face)` in an `sr-only` span.
- F5: add `"/"` to the `after()` revalidate in `src/app/decks/profile-actions.ts:82`.
- No new mark, token or copy.

## Tokens used (all existing)
`--bg` #14110E · `--surface-inset` #1B1712 · `--border` #2B241B · `--border-strong` #3A3229 · `--fg` #EDE6D8 ·
`--fg-body` #C0B8A6 · `--fg-faint` #8B8270 · `--fg-locked` #6E6654 · `--accent` #CF8745 (To buy) · `--warning` #DEAA29
(Unresolved) · `--success` #6FA368 (Complete) · `--bracket-3/4/5`. The hex values are the canvas theme; ship the tokens.

## Fallback B (only if C is declined)
Only rows with a chip change: line two holds pill + chip, and line three holds commander + count group. Those rows get `py-[6px]` and `gap-[2px]`.
The no-chip row is the shipped row. The cost is that deck names sit about 9px apart in a mixed 2×2 pair.

## Files
- `The 99 - Home · Bracket Chip Addendum.dc.html`: the canvas (sections C, A, B).
- `assets/bracket-{3-upgraded,4-optimized,5-cedh}-chip{,-ink}.svg`: canvas stand-ins.
- `support.js`: the canvas runtime.
