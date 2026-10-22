# Strategy focus

A deck's top strategies, and the FOCUS a player picks among them for Suggested changes to aim at. Brief:
`docs/superpowers/design-briefs/2026-10-22-strategy-focus.md`, reshaped by the handoff
`design/design_handoff_the99_strategy_focus/` (one swap engine: no lean-in tool and no paid read). Research:
`boards/strategy-focus-research-2026-10-18.md` (lane 9b), re-test section. Behind `STRATEGY_FOCUS_ENABLED` (needs `ANALYSIS_TAB_ENABLED`), unset in production and held out of All features.

## The score

- **Axes.** The 30 label themes on `card_labels`, plus the type-line axes in `src/lib/strategy/axes.ts`: artifacts,
  enchantments, voltron (Equipment and Auras), vehicles, big creatures (a creature of mana value 6 or more, a named proxy:
  `cards` holds no power) and up to three creature types (`typal:Elf`). Changelings join each type a deck picks.
- **Per axis:** `copies × ln(lift)`, lift being the deck's nonland share over the CATALOG's (every commander-legal nonland
  game card, one copy each). Under 5 copies (`AXIS_FLOOR`) an axis scores 0, and so does one the deck holds no more of than
  the catalog. Lands and the commanders are never counted.
- **`deckStrategy`** (`score.ts`, pure) returns the top 5 (`TOP_AXES`), never padded; `none` when nothing clears the floor;
  `tooSmall` under `MIN_NONLAND` (30) nonland copies. The `tribal` theme is dropped whenever a creature type scores. Any
  strategy can be the focus, broad ones included: the lean-in tool that withheld them was dropped with the handoff.
- **Never a verdict.** Validated on staging, the score does not tell precons from tuned decks and has no tested
  focused-vs-spread threshold. Nothing returns a grade, a target or a comparison; a figure means something only against
  the same deck's other axes.
- **The commander-average baseline is not used.** It reads near 0 whenever a deck follows its commander's usual plan.
  `measure:strategy` still prints it, apart.

## The reads

- `loadStrategyBaseline` (`load.ts`) reads the catalog with its themes once per catalog generation and keeps only the
  counts, memoised the way `precons/link-read.ts` memoises the precon catalog.
- `loadDeckStrategy(userId, deckId, env)` returns null with the switch off or for a deck that is not the reader's, and reads
  nothing with the switch off. Otherwise a `StrategyRead`: the strategy, the focus (its axis on the working list, scored
  or not, and whether the top five hold it: one that does not is drawn as a sixth row) and `pending`, each drawn
  strategy's `+added` / `−removed` copies since the newest committed version (`pendingChanges`: a card's quantity change,
  toward every strategy it is on). `pending` is null for a deck with no version yet; a precon start's v0 is a version. `toStrategyCard` is the one land and game-card filter, shared by the deck read, the
  catalog baseline and the measure's lists (the commander-average SQL applies the same front-face land test).

## The floor, measured

`pnpm measure:strategy` (read-only, staging) cuts each list of 60+ nonland copies to a random 20, 30 or 40, 40 times per
size, and compares the cut's top axis and top 5 with the whole list's. The rows are read in a fixed order and each
list's cuts are seeded, so a re-run on unchanged data prints the same figures. 2026-10-22, 39 lists: at 20, the median
list kept its top axis 80% of the time (p25 list 55%), top-5 overlap 39%, and 62 of 1,560 cuts read none; at 30, 98%
(73%), 60%, 1 cut none; at 40, 100% (90%), 73%, none. `MIN_NONLAND` is 30: the smallest size at which the median list
reads its own plan.

The commander-average baseline drops lands by the FRONT face, as `isLandFace` does, so a spell-front MDFC counts the
same in the average as in the deck it is compared with.

## The focus

- Stored on `decks.strategy_focus` (null is no focus, "Keep it balanced") and copied to `deck_versions.strategy_focus` at
  commit, as the bracket declaration is. Values are a label theme, a fixed axis or `typal:<Type>`; `parseStrategyKey`
  (`focus.ts`) is the one check, and a stored key it no longer names reads as no focus.
- `setStrategyFocus` (`src/app/decks/strategy-actions.ts`) is the one writer: free, switch-checked, any named strategy
  (not only the top five), and it writes ONLY ON A CHANGE, because the update moves the reader's data stamp.
- Names: `strategyName` (`src/lib/copy/strategy-focus.ts`), a creature type in the plural (`creatureTypePlural`).
- Icons: `StrategyIcon` (`src/components/decks/strategy-icon.tsx`), one line glyph per theme and type-line axis plus
  the spears every creature type shares (`tribal` too) and a dashed fallback for a theme added later. Five are the
  handoff's drawings; the rest are drawn to match (24 grid, 1.6 stroke, round caps). A new theme owes a glyph:
  `strategy-icon.test.tsx` fails until it has one.

## The block on Analysis

`StrategyBlock` (`src/components/decks/strategy-block.tsx`) draws last in the reading, above Tuning, and only over a
reading (`AnalysisPanel`'s `strategy` slot); the page reads `loadDeckStrategy` per request, uncached. The ring's geometry
is pure in `strategy-ring.ts` (arcs from 12 o'clock by live count, the focus pulled out, its pending growth split off;
other strategies' changes are said by the legend alone). The shell holds the focus (`useStrategyFocus`, over
`useHeldPick`, the declaration's ordering rules), so Suggested changes reads the same pick. Rank colours derive per
theme from `--fg-muted` over `--surface-rail`. Proof: `pnpm probe:strategy-focus`; inventory `strategy-focus.json`.
