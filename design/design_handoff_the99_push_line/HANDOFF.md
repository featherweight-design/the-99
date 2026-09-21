# Handoff — the push line and the upgrade path (Round 4 of 5)

Settled decisions and build guardrails. The argument is in `README.md`; the strings are in
`push-line · copy strings.ts`; the matrices are in `STATES-push-line.md`.

## Locked

1. **The push line belongs to the candidate**, so it renders on quick-add rows, Consider tiles and
   top-off candidate rows — one slot, one label (`IF YOU ADD THIS`), two densities.
2. **It is never on the analysis tab, never on the top-off commit bar, and never on
   `/commanders/[slug]`.**
3. **It does not survive the add.** No toast, no persistence, no badge; the verdict is the record.
4. **A bracket mark means movement.** Facts carry no mark and are inked `--fact`.
5. **Range-to-range grammar**, correct with one or two brackets on either side. `Violation.bracket`
   is never printed as a numeral.
6. **`counts` is two clauses and the count leads**; the combo evidence is a third line in `--fact`,
   present only when `combos` is non-empty.
7. **`unquantified` is never a move**, states the figure, and may not imply a ceiling.
8. **`ruleless` may not say tutors don't matter** — it says no bracket *limits* them, and that they
   reach a bracket only by covering every piece of a combo the deck already holds.
9. **A completed combo that moves nothing speaks**, as `inert`: the event, then why the verdict is
   unmoved. Genuine `none` renders nothing at all.
10. **The upgrade path is read-only** — no ticks, no removes, no persisted state. Card names open
    cards.
11. **The app never picks.** *Any 2 of these 5*, every candidate named; the *any* is dropped only
    when `candidates === removeCount`.
12. **`blocked` reads plainly**, lists what *can* come out, shows the commander on a dashed edge,
    and names the nearest reachable target. No `--danger`.
13. **Every card carries its fact marks** — Round 2's five, bare and in `--fact` at 16×16. On rows and tiles they take the line above the name, led by the ownership dot; in prose they follow the name. A card with no fact carries no mark.
14. **Mobile and desktop ship together.** Marks never below 20px; controls 44px at 390.

## Geometry

| Part | Spec |
|---|---|
| **Atom, desktop** | Above a `1px --border` rule inside the row's own box, `margin-top:9px; padding-top:9px`. Label mono 9px `--fg-disabled` uppercase `.14em`. Sentence 12.5px `--fg-body`, line-height 1.6. Marks 20px, `gap 1px` within a side, `gap 4px` around the mono 11px `→`. |
| **Atom, 390** | Identical type and marks; the host row becomes the shipped 52px meta-line variant. Clauses stack as separate lines — never one wrapping sentence. |
| **Atom, top-off row** | Same, indented `padding-left:28px` so the sentence starts at the name column and the tick keeps its own. |
| **Tile clause** | Above a `1px --border` rule at the tile foot. Mark 18px + mono 9.5px, two lines max, ≤3 words. Bracket ink for a move, `--fact` for a fact. |
| **Fact marks** | Round 2's five marks — bolt (game changer), stripped peak (mass land denial), turn again (extra turns), **the lemniscate** (two-card infinite), drawn up (tutor) — **16×16, bare, `--fact`, with the shipped glow**. **On a card row or tile they sit on their own line ABOVE the name, with the ownership dot leading**, which is the shipped card-row convention. In prose (the atom's sentence, the path's candidate lists) they follow the name inline. A card wears **every mark true of it**; a card that fires no rule wears none, and the dot's line stays. `aria-hidden`; the facts are in the row's accessible name. |
| **Consider tile** | Art plate (no overlay dot, **no mana pips** — pips are a row affordance), then the mark line, then the name, type, evidence bar, the push clause, the Add. |
| **Second-side range** | The lower bracket at full opacity, the upper at `0.5` — Round 3's split-pill convention, unchanged. |
| **Path item** | `--surface-sunken` on `1px --border`, radius 9px, padding `12px 13px`; grid `150px / 1fr`, label mono 9.5px `--fg-faint`, requirement 13px `--fg-body`, candidates 12.5px `--fg` on `1px dotted --accent`. |
| **Path candidates at 390** | One per line, never a wrapped run. |
| **Target chips** | 30px desktop / **44px at 390**, mark 18–20px, active `1px --accent` on `--surface-raised`, others `1px --border-strong`. At most three. |
| **Path foot** | Above a `1px --border` rule: the overlap sentence 12px `--fg-faint` + `open your decklist →` mono 11px `--accent` dotted. |

## No new anything

No new token, no new hex, no new mark (the bracket marks and the `--fact` ink already exist), no
modal, no tray, no toast, no confirm step, no motion class. The one addition in the whole round is a
union member in a pure function.

## What a reviewer should push on first

- **The tile density.** A three-word clause and the sentence one door away is the call most likely
  to be challenged; the alternative is a tile that grows to hold a sentence, and 1a says why not.
- **`inert`'s precedence.** Drawn as after `ruleless`, so a tutor that also completes a combo keeps
  its tutor sentence. If eng or review prefers the combo to win there, it is one branch and the copy
  file already holds both strings.
- **The path as a disclosure rather than a block.** It makes the path invisible until a rung is
  tapped. Deliberate — see READINESS gap 1.
