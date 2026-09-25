# Design property table: Locked, the climb's *What would have to go* (PR 6, climb half)

Sources: `design/design_handoff_the99_never_cut/README.md` (R2 §The lock glyph; R1 table row
*Climb candidate*, corrected by READINESS-audit F6 to R2's glyph and word), `STATES-never-cut.md`
§Climb sheet 3b, `never-cut · copy strings.ts` `climb.*`, R1 canvas 1d (`The 99 - Never Cut.dc.html`),
and the orchestrator's rulings of 2026-09-25 (copy F11(a); `unreachable` takes `listedLast`'s slot on a
count rule; a combo pair keeps its order).

## LockMark (closed, at rest)

| Property | Mobile | Desktop | Code |
|---|---|---|---|
| box | 11×13 | 11×13 | `h-[13px] w-[11px]` ✅ |
| drawn in | CSS, not an icon font | same | three spans ✅ |
| arch | 7 wide at left 2, 7.5 tall, 1.6px stroke, no bottom, radius 3.5 3.5 0 0 | same | ✅ |
| body | 11×6.5 at top 6.5, radius 2, filled | same | ✅ |
| keyhole | 2px circle at (4.5, 8.75), `--bg` | same | ✅ |
| ink | `--fg-body` | `--fg-body` | ✅ |
| a11y | `aria-hidden` | same | ✅ |
| title | `mark.title` "Locked" | same | ✅ |

## Climb candidate (the shipped row)

| Property | Mobile | Desktop | Code |
|---|---|---|---|
| order | locked candidates last | same | `lockedLast` ✅ |
| count | unchanged (locked still count) | same | `anyOf(removeCount, candidates.length)` untouched ✅ |
| mark | after the card's fact marks | same | ✅ |
| word | absent | mono 10.5px `locked`, `--fg-faint` | `hidden md:inline` ✅ |
| a combo pair | order kept, locked piece marked | same | ✅ (ruling) |

## The note under the rule

| Property | Mobile | Desktop | Code |
|---|---|---|---|
| placement | under the item's candidates, in the reading's column | same, second grid column | `LockNote` with the label-column spacer ✅ |
| type | the sheet's sentence, 12.5px `--fg-body` | 13px `--fg-body` (1d) | `sentence` ✅ |
| some locked, reachable | `climb.listedLast(names)` | same | ✅ |
| unlocked < removeCount | `climb.unreachable(n, total, bracket)`, in listedLast's slot | same | ✅ |
| combo, every cuttable piece locked | `climb.unreachable(n, n, bracket)` | same | ✅ |
| no locks | nothing drawn | same | ✅ |
| control | none: it states a fact | same | ✅ |

## States (3b)

| State | Trigger | Reachable |
|---|---|---|
| Listed last | a locked candidate, unlocked ≥ removeCount | ✅ `probe:climb-locks` |
| Unreachable | unlocked < removeCount (Forced: one lock) | ✅ `probe:climb-locks`, unit |
| Combo unreachable | every cuttable piece locked | ✅ unit (no local-dev deck lists a combo at its lower rung) |
| Blocked (commanders) | candidates < removeCount | unchanged; `unreachable` returns null ✅ |

Gaps: none.
