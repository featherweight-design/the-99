# Plan: Help me choose, three answers (everything except D1)

Handoff: `design/design_handoff_the99_help_me_choose/addendum-three-answers/`, audited Yellow in #1060
(Hugh approved). **D1, the row state for a type-line match with no share, is out.** Rows keep #1059's
at-least-1% rule until Design draws it. Everything ships behind `HELP_ME_CHOOSE_ENABLED`.

## PR boundaries

Each PR carries one answer end to end: engine, form, chip, row, narrow note, hand-off and intent line.
Each PR ships working on its own and stays under ~800 lines.

**PR 1: Themes as any of.**
- Engine:
  - A `themeJoin: "all" | "any"` answer, stored in the URL as `tj=any`, with All as an absence.
  - The free match keeps "or" as a join between theme matches before stop words are dropped (audit 7).
    It uses one join for all themes, and the control wins at two or more.
  - Rank takes the max within the group and the min across answers.
  - `passes`, `backing`, `removals` and `widenCount` learn the join.
- Narrow:
  - The any-of widen joins `narrowOptions` as a third kind, counted by `passes` (audit 3), so it never reads 0.
  - The removal search stops early when the widen reaches the floor.
  - `widenWhy` is computed from the most themes any candidate backs, and the line is dropped at 1 (audit 1).
- UI:
  - The All / Any segment, greyed below two themes, with its captions.
  - The `any of` chip.
  - The row's SETS RANK on the limiting figure, other fits dimmed.
  - The order line and `subAny`.
- Hand-off: the hand-off row and the seeded intent line.
- Also in this PR:
  - The **catalog memo race fix** in `search.ts`, which 0f and d9 passed on: a ticket taken before the
    await, same pattern and test shape as `printed-in-read`.
  - The `narrow.fewLead` divergence (audit 9).

**PR 3: Cards for the 99 (own-only).** Built last (2026-09-26): its migration waits on two others, and it carries the About caption edit.
- Engine:
  - A `pool: "any" | "own"` answer (`pool=own`).
  - Migration `decks.answer_owned_only boolean not null default false`, so `fillDeck`'s retry fills the
    same way the create did.
  - The create and retry fill use `buildFillPlan`'s existing `pool: "sleeveable"`, and the missing slots
    are basics.
- Budget gate: under own-only it caps the commander plus any unowned build-around card (audit 8), never
  the 99.
- Row:
  - The row splits into a COMMANDER mark (existing `OwnershipDot` / `AvailabilityGlyph` / `BuyTag`) and
    `99 from your cards · N of its usual 99 are yours`.
  - N is `trialFill`'s `owned` on the ordinary pool (audit 4). No new query.
- Free match: a fixed phrase list sets own-only. "The commander can be one I have to buy" is absorbed,
  not listed under Not used.
- UI:
  - The segment and both captions, plus the budget caption.
  - The `the 99` chip. It is never offered as a loosening.
- Hand-off: the hand-off row and intent.

**PR 2: Sets.** Built second, once #1064 merged, since it needs no migration.
- Engine:
  - A `sets: string[]` answer (`p=hob,hoc`, the same key as the lanes' Printed in), OR within the answer.
  - Filtered by **0f's `printedIn(setCodes)`** from `src/lib/sets/printed-in.ts` (#1064), imported and
    never copied. The row's code tag reads the lanes' `loadCommanderPrintings` index, the same rule over the same table.
- Free match: a set name anywhere, and a code only in capitals or beside "set(s)" (audit 6).
- UI:
  - The Sets field on the #1050 count trigger, with a `FilterPanel` over the whole catalog.
  - The `printed in` chip in codes, with an aria label giving full names.
  - The row's mono code tag.
  - The narrow note's `Drop HOB or HOC · N commanders`.
- Hand-off: the hand-off row and intent.
- About (moved to PR 3, the last): the **caption edit on `help-me-choose`**, listing the three answers. This is an ordinary edit
  with no new entry and no bump, routed through /copy-review.

## Fence

**Edits:**
- `src/lib/intake/*`
- `src/lib/copy/help-me-choose.ts`
- `src/components/intake/*`, plus new `sets-field.tsx` and `theme-join.tsx`
- `src/components/decks/create-pre-filled.tsx`
- `src/app/decks/new/choose/page.tsx`
- `src/app/decks/actions.ts`, only the `createDeck` / `fillDeck` answer plumbing
- `src/lib/tuning/limits.ts` (`seededAnswersIntent`)
- `src/db/schema.ts` and migration 0072 (PR 3; 0070 and 0071 belong to other lanes, and are on main before generating)
- `src/lib/copy/about.ts`, the caption only (PR 3)
- `scripts/probe-help-me-choose-*`
- `scripts/measure-intake-tribes.mts`
- `docs/superpowers/{plans,design-tables,inventories/help-me-choose.json}`

**Imports only, never edits:** `src/lib/sets/printed-in.ts` (0f), `FilterPanel`, the #1050 set trigger,
`OwnershipDot`, `AvailabilityGlyph` and `BuyTag`.

## Route × viewport inventory (feature-acceptance)

| Route / state | 390 | 1300 |
|---|---|---|
| `/decks/new/choose` form, three new fields | ☐ | ☐ |
| results: any-of rows (SETS RANK, dimmed fits) | ☐ | ☐ |
| results: own-only rows (commander mark + line) | ☐ | ☐ |
| results: set tag on rows | ☐ | ☐ |
| narrow note: any-of widen / set drop | ☐ | ☐ |
| `/decks/new` pre-filled hand-off rows | ☐ | ☐ |
| `/about` Help me choose caption | ☐ | ☐ |

**Proof:**
- Staging, read-only: Hugh's query, before and after each PR. `measure:intake-tribes` grows to cover
  the join, own-only and sets.
- Probes: `probe:help-me-choose-search`, `-screens` and `-layout` extended, on local-dev.
- Copy: every new string goes to /copy-review, applied in the same PR.
