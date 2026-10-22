# Strategy focus

A deck's top strategies, and (PR B) leaning into one. Brief: `docs/superpowers/design-briefs/2026-10-22-strategy-focus.md`.
Research: `boards/strategy-focus-research-2026-10-18.md` (lane 9b), re-test section. Backend only until Design's handoff
lands. Behind `STRATEGY_FOCUS_ENABLED` (needs `ANALYSIS_TAB_ENABLED`), unset in production and held out of All features.

## The score

- **Axes.** The 30 label themes on `card_labels`, plus the type-line axes in `src/lib/strategy/axes.ts`: artifacts,
  enchantments, voltron (Equipment and Auras), vehicles, big creatures (a creature of mana value 6 or more, a named proxy:
  `cards` holds no power) and up to three creature types (`typal:Elf`). Changelings join each type a deck picks.
- **Per axis:** `copies × ln(lift)`, lift being the deck's nonland share over the CATALOG's (every commander-legal nonland
  game card, one copy each). Under 5 copies (`AXIS_FLOOR`) an axis scores 0, and so does one the deck holds no more of than
  the catalog. Lands and the commanders are never counted.
- **`deckStrategy`** (`score.ts`, pure) returns the top 5 (`TOP_AXES`), never padded; `none` when nothing clears the floor;
  `tooSmall` under `MIN_NONLAND` (30) nonland copies. The `tribal` theme is dropped whenever a creature type scores. A broad
  theme (`BROAD_THEMES`: evasion, protection, pump, haste, draw, etbDraw) is drawn but `leanable: false`.
- **Never a verdict.** Validated on staging, the score does not tell precons from tuned decks and has no tested
  focused-vs-spread threshold. Nothing returns a grade, a target or a comparison; a figure means something only against
  the same deck's other axes.
- **The commander-average baseline is not used.** It reads near 0 whenever a deck follows its commander's usual plan.
  `measure:strategy` still prints it, apart.

## The reads

- `loadStrategyBaseline` (`load.ts`) reads the catalog with its themes once per catalog generation and keeps only the
  counts, memoised the way `precons/link-read.ts` memoises the precon catalog.
- `loadDeckStrategy(userId, deckId, env)` returns null with the switch off or for a deck that is not the reader's, and reads
  nothing in either switch-off case. `toStrategyCard` is the one land and game-card filter, shared by the deck read, the
  baseline and the measure.

## The floor, measured

`pnpm measure:strategy` (read-only, staging) cuts each list of 60+ nonland copies to a random 20, 30 or 40, 40 times per
size, and compares the cut's top axis and top 5 with the whole list's. 2026-10-22, 39 lists: at 20, the median list kept
its top axis 80% of the time (p25 list 53%), top-5 overlap 38%, and 66 of 1,560 cuts read none; at 30, 98% (65%), 60%,
4 cuts none; at 40, 100% (73%), 74%, none. `MIN_NONLAND` is 30: the smallest size at which the median list reads its
own plan.
