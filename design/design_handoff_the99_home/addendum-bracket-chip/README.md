# Home addendum — the bracket chip on the resume row

**Canvas:** `The 99 - Home · Bracket Chip Addendum.dc.html` · amends `design_handoff_the99_home/` and
`src/components/home/resume-decks.tsx`. Cosmetic on a known surface: no About entry.

## Placement

Line two of `ResumeRow`, **immediately after `StatusPillBadge`**, in a `flex flex-none items-center gap-[8px]`
group with it (the tile's pill-to-chip gap); the line's existing 14px gaps to the commander and count stand.
Absent when `deck.bracket` is null: no reserved space.

## The one departure: marks only

The shipped chip does not fit this line (canvas §A). Line two is 240px at 390 and 316 at 1300; pill, chip and
count are all unshrinkable, so a whole chip pushes the commander to zero and then the row's `overflow-hidden`
clips the count, which decision 23 forbids. A range needs 168 / 178 on its own.

So the row draws **`BracketChip` without its face**: the same plate (`color-mix(ink 12%, --bg)`), the same 55%
hairline, radius 6, 22px chip-form marks, a range's upper mark at 0.65, 22 / 24 tall. Padding `0 2px`
(the shipped `pr-8` exists for the name). Widths: 52 (range), 26 (single).

- **One rule at both widths.** A single chip would fit whole at 1300; drawing it there would make one row change
  shape by bracket count and viewport.
- **The words go to the row's accessible name** via the shipped `refreshCopy.decks.statusWithBracket(status,
  verdictHead(...).face)`, as the tile does. No new string.
- **Build:** a `face?: boolean` (default true) on `BracketChip`, `false` here only. No new mark, token or copy.

If Hugh rules the chip must stay whole, the fallback is: whole at 1300 for a single bracket only, and no chip
at 390 at all. Both are worse than marks.

## Checked

- Long deck name + longest stamp (*committed 10mo ago*) + longest pill (*Unresolved*) + a range at 390: the
  name truncates on line one as shipped, line two holds (commander keeps ~32px), the row stays 72, nothing wraps.
- No analysis: the shipped row, unchanged.
