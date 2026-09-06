# Gap report — Discovery controls (Phase 9)

Design table: `docs/superpowers/design-tables/discovery-controls.md`
Handoff: `design/design_handoff_the99_discovery` (`CONTROLS-four-above-one-list.md`, README component-notes rows for Scope control / Header subtitle / Sort trigger / Sort menu / disabled option)
Branch: `feat/discovery-controls`

The verify pass returned 29 visual gaps, 3 state gaps and 4 rule findings. Fifteen were accepted and fixed; the confirm pass returned **0 remaining**. The rest are recorded below with the reason they were not changed.

## Fixed

| # | File | Element | Design | Was |
|---|------|---------|--------|-----|
| 1 | page-header.tsx | Header row wrapper | desktop `gap: 24px` | `sm:gap-4` (16px) |
| 2 | page-header.tsx | Header row wrapper | `flex-wrap: wrap` desktop | unset |
| 3 | scope-control.tsx | `Show` label | drawn, desktop only, mono 10px / 0.12em / uppercase / `--fg-faint` | existed only as the radiogroup's `aria-label` |
| 4 | scope-control.tsx | Scope group wrapper | flex / center / `gap: 10px` | absent |
| 5 | sort-menu.tsx | `Sort` label | drawn, desktop only, same treatment; trigger text is the current value alone | `Sort: Best fit` folded inside the button at both widths |
| 6 | sort-menu.tsx | Trigger gap | 7px mobile / 8px desktop | 6px both |
| 7 | sort-menu.tsx | Trigger padding-l/r | 12px | 11px |
| 8 | sort-menu.tsx | Trigger font-size | 11.5px mobile / 12px desktop | 11.5px both |
| 9 | sort-menu.tsx | Trigger colour | `var(--fg)` | `var(--fg-body)` |
| 10 | sort-menu.tsx | Trigger height | 38px / 30px on one element | a `size` prop mounting two variants |
| 11 | sort-menu.tsx | Option row | flex row, items-center, `gap: 10px` | `flex-col items-start`, `gap: 8px` |
| 12 | sort-menu.tsx | Option text column | `flex: 1; min-width: 0` | absent — the sub-line started under the diamond |
| 13 | sort-menu.tsx | Option sub-line | `margin-top: 2px`, `line-height: 1.5` | `gap: 3px`, line-height unset while the disabled string wraps |
| 14 | filter-bar.tsx | Both count strings | locale-formatted (rule 32) | raw — printed `3334` at discovery's row count |
| 15 | discovery-view.tsx | Sort menu slots | one element in both slots | two divergent `SortMenu` subtrees, each with its own `open` state |

Both labels (3 and 5) are `aria-hidden` spans beside their control rather than `aria-labelledby` targets: Tailwind's `hidden` is `display: none`, which removes the node from the accessibility tree, so pointing a label reference at it would leave the control unnamed below 640px. Each control keeps its own `aria-label` at both widths instead.

## Not changed — shipped values the branch is required to preserve

Rules 1, 8 and 15 mandate the shipped `ScoreAgainst` geometry and forbid moving or restyling the shipped header, colours and `Score against`. Where the canvas redrew those, the shipped value stands and the table's figure is the conflict.

| Table value | Shipped value | Rule |
|---|---|---|
| Segment padding-l/r 0 / 14px | `px-[10px]` / `sm:px-[13px]` | 1, 8 — `ScoreAgainst`'s numbers |
| Segment font-size 13px desktop | `sm:text-[12.5px]` | 1, 8 |
| Unselected segment weight 400 mobile | `font-medium` unprefixed | 8 — `ScoreAgainst` ships 500 at both widths |
| Segment `justify-content` flex-start desktop | `justify-center` unprefixed | inert at `sm:flex-none` width |
| Header padding 14px / 22-34-18-34 | 20/18/12 and 28/34/0 | shipped header, byte-identical to pre-branch |
| Title `h2`, 19/26px, margin-bottom 4/6px | `h1`, 22/30px, 2/4px | shipped header |
| Subtitle 10.5px mobile, line-height 1.5 | 11px, unset | shipped header |
| Mobile count row `margin-top: 10px` | `mt-[9px]` | shipped bar |

## Deferred to a later phase, with the reason

- **The window count on discovery's mobile count row** (gap 23, rule 9). `wasWindowed={false}` is hardcoded in `discovery-view.tsx` because the reveal band mounts in Phase 10. The count and the band are one feature and land together.
- **The first-run `GuidedBanner`** carrying `empty.noDecksHeading` / `noDecksBody(cards)` (rule 31's second signal). The three empty states are Phase 11.

## Open for Design — one structural question, no round-trip needed to proceed

The canvas draws a **`Something new — unavailable`** note in mono 11px `--fg-locked`, 10px right of the trigger, in the no-decks state. `commander-discovery.ts` defines no key for it, and its header says the disabled short form is `sort.newDisabled` and the long form is `empty.noDecks` — rule 31 adds that "neither invents a third sentence". Writing the note would mean adding a third string the copy module deliberately withheld, so it is not implemented. Either the note is the trigger echoing `sort.new` with a status word (in which case a key is needed), or the canvas is drawing a state the copy module resolved differently. Design to confirm.

## Ratification requested, already implemented

Three decisions this phase made that the table does not cover, none of which changes a drawn pixel:

1. The availability clause stays appended to the header subtitle under both scopes — it is the only place `/commanders` says which pool it ranked against, and dropping it would regress a shipped surface.
2. `PageHeader` is one subtree with responsive classes rather than a mobile branch beside a desktop one, so the scope radiogroup appears once in the accessibility tree.
3. The filter bar was extracted from `commanders-view.tsx` into `filter-bar.tsx` and given an `order: { desktop, mobile }` node slot. The owned scope passes its shipped inert label; discovery passes the menu. Rule 4 asks the slot to hold a control under discovery and revert under the owned scope, which a shared bar is the only way to satisfy without a second bar (forbidden by rule 27).

**VERDICT: 0 gaps remaining.**
