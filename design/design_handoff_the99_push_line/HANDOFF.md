# Handoff — the push line and the upgrade path (Round 4 of 5, R2)

Revised against the R1 audit. Settled decisions and build guardrails. The argument is in
`README.md`; the strings are in `push-line - copy strings.ts`; the matrices are in
`STATES-push-line.md`; the audit responses are in `READINESS.md`.

## Locked

1. **The push line belongs to the candidate** — quick-add result row and top-off candidate row at
   **sentence** density, Consider tile at **clause** density. One slot, one label (`IF YOU ADD
   THIS`).
2. **Never on the analysis tab, never on the top-off commit bar, never on `/commanders/[slug]`**,
   and it carries no link to the analysis tab.
3. **It does not survive the add.** No toast, no persistence, no badge.
4. **A bracket mark means movement.** Facts carry none and are inked `--fact`.
5. **Range-to-range grammar**, correct with one or two brackets on either side. `Violation.bracket`
   is never printed as a numeral.
6. **`counts` is two clauses, count first, and names the BINDING bracket and its figure** — *allows
   none* when that figure is nought. The combo evidence is a third `--fact` line under **Combo
   changes**, only when `combos` is non-empty.
7. **`unquantified` has two forms**: the chaining-rule form at binding bracket 2 or 3, and the
   no-such-rule form at 4 or 5. Never a move, never a ceiling.
8. **`ruleless` has two forms**: coverage-absent keeps *and yours can't, yet*; coverage-present says
   what the tutors already find is counted. Neither may say tutors don't matter.
9. **`inert` speaks, with three second-clauses** — `to` is `[4,5]`, `[3]`, or `[4]`. Genuine
   `none` renders nothing.
10. **Precedence: `moves`, `counts`, `inert`, `ruleless`, `unquantified`, `none`.** The rule
    underneath: **an event outranks a standing count.**
11. **The upgrade path is read-only** — no ticks, no removes, no persisted state.
12. **The app never picks.** *Any 2 of these 5*, every candidate named; the *any* drops only when
    `candidates === removeCount`.
13. **`blocked` reads plainly**, lists what can come out, shows the commander on a dashed edge,
    names the nearest reachable target. No `--danger`.
14. **Five fact marks at 16×16**, Round 1's placement on rows and in prose; the tile puts the dot and marks on the line above the name — see below.
15. **Mobile and desktop ship together.** Bracket marks never below 20px; controls 44px at 390.

## The fact marks — five glyphs, 16×16

**Five marks, all 16×16, all bare in `--fact` with the shipped `filter: drop-shadow` glow:**
**bolt** (game changer), **stripped peak** (mass land denial), **turn again** (extra turns),
**lemniscate** (two-card infinite), **drawn up** (tutor).

- **Placement follows Round 1's rule** — *copies first, mark last, on every surface* — so on a row
  they sit **inline after the name** (after the count on a decklist row), and in prose they follow
  the name.
- **On the Consider tile, the ownership dot and the marks share one line above the name**, and the
  art carries neither mana pips nor an overlay dot. **This is an amendment to the shipped tile**,
  made deliberately and on the user's call; it should be reviewed as an Add-panel change, not
  absorbed as a detail of this round.
- **Sequencing, for eng:** the lemniscate and drawn-up are Round 2 design. Either this build lands
  after them, or it ships Round 1's three and picks the other two up at call sites that already
  exist. **No string, size, ink or placement changes either way.**
- A card wears every mark true of it; a card that fires no rule wears none.
- Marks are `aria-hidden`; the facts are in the row's accessible name.

## Geometry

| Part | Spec |
|---|---|
| **Atom, desktop** | Above a `1px --border` rule inside the row's own box, `margin-top:9px; padding-top:9px`. Label mono 9px **`--fg-muted`** uppercase `.14em` (6.6:1; `--fg-disabled` fails the text floor at this size and must not be used for it). Sentence 12.5px `--fg-body`, line-height 1.6. Bracket marks 20px, `gap 1px` within a side, `gap 4px` around the mono 11px `→`. |
| **Atom, 390** | Identical type and marks; the host row becomes the shipped 52px meta-line variant. Clauses stack as separate lines, never one wrapping sentence. |
| **Atom, top-off row** | Same, indented `padding-left:28px` so the sentence starts at the name column. |
| **Fact marks** | Five glyphs, **16×16**, bare, `--fact`, `filter: drop-shadow`. Row: inline after the name, `gap:7px`. Prose: after the name, `gap:4px`, `margin-left:5px`. Tile: on the line above the name, ownership dot leading, `gap:7px`. Fact-shape labels carry their own glyph at `gap:6px`. |
| **Consider tile** | Art plate (no pips, no overlay dot), mark line (dot + marks), name, type, evidence bar, the push clause, the Add. |
| **Tile clause** | Above a `1px --border` rule at the tile foot. Bracket mark 18px + mono 9.5px, two lines max, ≤3 words. |
| **Second-side range** | Lower bracket full opacity, upper at `0.5` — Round 3's split-pill convention. |
| **Path item** | `--surface-sunken` on `1px --border`, radius 9px, padding `12px 13px`; grid `150px / 1fr`, label mono 9.5px `--fg-faint`, requirement 13px `--fg-body`, candidates 12.5px `--fg` on `1px dotted --accent`. |
| **Path candidates at 390** | One per line, never a wrapped run. |
| **Target chips** | Preceding mono 9.5px label `--fg-muted` (never `--fg-disabled`). 30px desktop / **44px at 390**, bracket mark 18–20px. At most three. |

## No new anything

No new token, no new hex, no new glyph, no modal, no tray, no toast, no confirm step, no motion
class. Two things in the round are more than copy: **the `inert` union member** in a pure function,
and **the Consider tile's mark-line amendment**, which is named as an amendment above.

## What a reviewer should push on first

- **The tile density.** A three-word clause with the sentence one door away; the alternative is a
  tile that grows to hold a sentence.
- **`unquantified` form B's wording.** *Neither Optimized nor cEDH has a rule about extra turns* is
  the plainest true statement; if the rules text ever gains one, this string is the first casualty.
- **The path as a disclosure rather than a block.** Deliberate — see READINESS gap 1.
