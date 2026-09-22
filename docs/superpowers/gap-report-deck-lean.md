# Gap report — the lean and its reasoning (PR 6)

**Sources.** `design_handoff_the99_declaration/` — `STATES-declaration.md` §C (the lean) and §D
(the reasoning modal), the canvas's §1d drawing, and its copy file's `lean` and `reasoning` keys;
the verdict addendum for the stacked sheet. Every property below was read off the canvas's inline
styles and checked against the build.

**Verdict: 0 open gaps.** One defect found on the contact sheet and fixed before opening; four
deliberate departures recorded below.

## Fixed before opening

1. **The phone header truncated both halves** — `HOW WE DETERMI…` beside `Optimized · both h…`.
   The heading and the qualifier cannot share the one 43px line the stacked card sheet leaves
   visible. On the phone the qualifier now opens the body, whole; desktop keeps it in the header.
   `probe:verdict-lean` asserts the heading unclipped and the qualifier drawn exactly once at each
   width, and reverting the move fails four of its checks.

## Checked and matching

- **The lean** (§C): a hairline above, 13px margin, 11px padding, gap 5. The label is mono 9px,
  0.14em, uppercase, `--fg-disabled`, with no glyph. The sentence is 12.5px `--fg-muted` at 1.6;
  the two card names are `--fg` on a dotted `--accent` underline and open their cards. The control
  `see the reasoning` is mono 10px `--accent`, dotted, `align-self: flex-start`, margin-top 2.
- **The reasoning** (§1d): 700px on `--elevated`. Glyph, heading, qualifier (mono 11px
  `--fg-faint`) and close. Body pads 16/18/18 at gap 15; the threshold is 12.5px `--fg-muted` at
  1.65. Two halves side by side at a 14px gap, each on `--surface` with a `--border`, radius 10,
  padding 13, gap 13. The plate is **100×140**, radius 6, `--border-strong`. The name is 13px 600
  `--fg` at 1.3; the half label is mono 10px `--fg-faint`; a hairline at 8px, then `found by` in
  mono 9px, 0.12em, uppercase, `--fg-disabled`. Tutors are 11.5px `--fg-body` on a dotted
  `--accent` underline, gap 4, and open their cards. The foot sits over a hairline at 12px: the
  not-a-limit line is 12px `--fg-faint` at 1.6, then `assembled in this list` and
  `Commander Spellbook ↗` at mono 10.5px, gap 14.
- **Stacked** (addendum ruling 1): a tutor or a half opened from the reasoning stacks on it, and
  the reasoning's header stays whole above the card sheet at 390. Escape lands on the reasoning.

## Departures, each deliberate

1. **The heading is the display face, not the canvas's 14px sans.** The reasoning renders in the
   receipt's own chrome, whose heading is display 700 at 15/16px; one chrome carrying two heading
   faces would make the third body read as a different component.
2. **At 390 the qualifier opens the body** rather than sitting in the header (above).
3. **The threshold's second sentence is not drawn.** The canvas adds "This combo has two pieces,
   and both are covered"; the copy file does not carry it, and a sentence counting covered pieces
   is the `n of n` the handoff forbids in the header by another route.
4. **A commander half reads `half one · your commander` and is found by `the command zone, every
   game`.** The plan names this reading (row 6) and the handoff does not draw it. A commander is
   in the zone every game, which is exactly why `comboLandsEarly` counts it covered with no tutor,
   and a half reading `nothing in this deck searches for it` there would say the opposite of the
   verdict above it.

## New copy, for `/copy-review`

`lean.*` and `reasoning.*` in `src/lib/copy/deck-analysis.ts` are the copy file's, with two
em dashes replaced (the repo's rule) and the sentences split into parts so the names can be
pressed; a test pins the parts joined to the sentence. Written here:
`reasoning.pieceCommander`, `reasoning.foundByCommandZone`, and a THIRD reading the handoff
does not draw — `lean.oneHalf` and `reasoning.qualifierOneHalf`. `leanFor` reads `drawOnly`
whenever coverage falls short of every piece, so a pair with one half tutored (or in the command
zone) got "nothing in it searches for either half" over a modal listing the tutor that finds one.
The pre-open pass found it. Round 1 found its mirror on the reachable side: "your tutors can
find both halves" is false of a commander half, so `lean.reachableCommander` (one half in the
zone) and `lean.reachableZone` (both, a partner pair) carry it, and the threshold gains
`reasoning.thresholdCommander`. On a draw-only deck the pair named is now the best covered, not the
join's first, because draw-only combos are not alike.
