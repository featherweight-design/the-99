# Gap report — Deck notices: the tile (PR 5)

## Agent 2 (verify)

Table: `docs/superpowers/design-tables/deck-notices-tile.md`. Implementation read: `src/components/decks/deck-card.tsx` (footer 501–589, yield constants 259–260, aria 297–329), `notice-tag.tsx`, `bracket-chip.tsx`, `status-pill.tsx`, `src/lib/decks/status-style.ts`, `src/lib/copy/notices.ts`, `src/lib/notices/summary-sql.ts`, `src/lib/decks/read.ts` (667–668, 899, 995, 1176), `src/app/decks/page.tsx` (36–57).

### Pass 1: visual properties

**1 · Tile box**

| # | Result |
|---|---|
| 1 | ✅ MATCH — `flex flex-col` on the article (deck-card.tsx:343) |
| 2 | ✅ MATCH — `overflow-hidden` |
| 3 | ✅ MATCH — `rounded-[14px]` |
| 4 | ✅ MATCH — `background: var(--surface-inset)` |
| 5 | ✅ MATCH — `1px solid var(--border)` |
| 6 | ✅ MATCH — `@min-[330px]:h-[248px]`, `shrink-0` (deck-card.tsx:373); 168px below the 330 floor is the shipped band, unchanged by this PR |
| 7 | ❌ MISMATCH (design: 340 / 342 / implementation: 341 / 343) — follows from row 12 |
| 8 | ✅ MATCH — `sm:h-full` on the article plus `flex-1` on the footer; detail row always drawn |

**2 · Footer**

| # | Result |
|---|---|
| 9 | ✅ MATCH — `flex` |
| 10 | ✅ MATCH — `flex-col` |
| 11 | ✅ MATCH — `gap-[9px]` |
| 12 | ❌ MISMATCH (design: 92 / 94px / implementation: no stated height; natural box is 11 + 22 + 9 + 14 + 9 + 14 + 13 = 92 **plus the 1px border-top** = 93 / 95 under preflight's border-box). The canvas's `height:92px` counts no border |
| 13 | ❌ MISMATCH (design: flex none / implementation: `flex-1`, deck-card.tsx:511). Deliberate, for row 8's end-level rule; the table should record it or the two rows conflict |
| 14 | ✅ MATCH — `pt-[11px] pr-[13px] pb-[13px] pl-[13px]` |
| 15 | ✅ MATCH — `borderTop: 1px solid var(--border)` |
| 16 | ✅ MATCH — chips, bar, detail; detail span always rendered |

**3 · Chips row** (`data-deck-chips`; the table's `data-chip-row` name is not used, attribute naming only)

| # | Result |
|---|---|
| 17 | ✅ MATCH — `flex` |
| 18 | ✅ MATCH — `flex-nowrap`, `@max-[330px]:flex-wrap` |
| 19 | ✅ MATCH — `items-center` |
| 20 | ✅ MATCH — `gap-[8px]` (row-gap 6 in the wrap band only) |
| 21 | ✅ MATCH — `h-[22px] md:h-[24px]`, `@max-[330px]:h-auto` |
| 22 | ✅ MATCH — `flex-none` |
| 23 | ❌ MISMATCH (design: min-width 0 / implementation: none), deck-card.tsx:518 |
| 24 | ❌ MISMATCH (design: overflow hidden / implementation: none), deck-card.tsx:518 |
| 25 | ✅ MATCH — pill, chip, notice; with no chip the tag follows the pill |
| 26 | ✅ MATCH — `@container` on the article; yield window `@min-[330px]:@max-[408px]`, 408 from measurement per F6 (table records F6) |

**3a · Status pill**

| # | Result |
|---|---|
| 27 | ✅ MATCH — `flex items-center` |
| 28 | ❌ MISMATCH (design: 22 / 24px / implementation: `h-[22px]` at both widths, no `md:h-[24px]`), deck-card.tsx:522 |
| 29 | ✅ MATCH — `flex-none` |
| 30 | ✅ MATCH — `rounded-[6px]` |
| 31 | ✅ MATCH — `px-[8px]` |
| 32 | ✅ MATCH — `font-mono text-[10.5px]` |
| 33 | ✅ MATCH — `tracking-[0.06em]` |
| 34 | ❌ MISMATCH (design: building (<99) `--fg-muted` / implementation: `Building` label `--fg`, `Draft` `--fg-body`, `New` `--fg-muted`; status-style.ts:24–29, 57–64). `Complete` `--success` matches. Shipped palette, not this PR's |
| 35 | ✅ MATCH — `color-mix(in srgb, var(tok) 18%, var(--bg))`; shipped exceptions New 16%, Draft 14% |
| 36 | ✅ MATCH — `1px solid var(--border-strong)`; shipped exceptions (Draft dashed, Over `--danger`) |
| 37 | ⚠ not stated in the class list (no `whitespace-nowrap`); single-word labels in a `flex-none` box do not wrap in practice. Counted as a match |
| 38 | ✅ MATCH — the 408 yield is sized from `Unresolved` (comment deck-card.tsx:251–258) |

**3b · Bracket chip**

| # | Result |
|---|---|
| 39 | ✅ MATCH — `inline-flex items-center` |
| 40 | ✅ MATCH — `gap-[5px]` |
| 41 | ✅ MATCH — `flex-none` |
| 42 | ✅ MATCH — `h-[22px] md:h-[24px]` |
| 43 | ✅ MATCH — `font-mono text-[10px] md:text-[11px]` |
| 44 | ✅ MATCH — `pl-[2px] pr-[8px]` |
| 45 | ✅ MATCH — `face={false}` gives `pr-[2px]`, `pl-[2px]` |
| 46 | ✅ MATCH — `rounded-[6px]` |
| 47 | ✅ MATCH — `color-mix(in srgb, ink 12%, var(--bg))` |
| 48 | ✅ MATCH — `color-mix(in oklab, ink 55%, transparent)` |
| 49 | ✅ MATCH — name ink = bracket ink |
| 50 | ✅ MATCH — `whitespace-nowrap` |
| 51 | ✅ MATCH — `CHIP_MARK_PX = 22` |
| 52 | ✅ MATCH — `DIM_OPACITY = 0.65` (bracket-mark.tsx:51) |
| 53 | ✅ MATCH — `face` prop exists; the yield mounts `face={false}` (deck-card.tsx:536) |
| 54 | ✅ MATCH — yield sized from `Exhibition or Core` |
| 55 | ✅ MATCH — no dot on the chip |

**3c · Data tag**

| # | Result |
|---|---|
| 56 | ✅ MATCH — plain `span` in the `aria-hidden` footer |
| 57 | ✅ MATCH — `inline-flex items-center` |
| 58 | ✅ MATCH — `gap-[5px]` |
| 59 | ✅ MATCH — `flex-none` |
| 60 | ✅ MATCH — `h-[22px] md:h-[24px]` |
| 61 | ✅ MATCH — `px-[7px]` |
| 62 | ✅ MATCH — `rounded-[6px]` |
| 63 | ✅ MATCH — no background |
| 64 | ❌ MISMATCH (design: `color-mix(in oklab, var(--fact) 55%, transparent)` / implementation: `in srgb`), notice-tag.tsx:29 |
| 65 | ✅ MATCH — `text-[10px] md:text-[11px]` |
| 66 | ✅ MATCH — `var(--fact)` |
| 67 | ✅ MATCH — `whitespace-nowrap` |
| 68 | ✅ MATCH — renders `notice.count` |
| 69 | ✅ MATCH — `size-[6px]` |
| 70 | ✅ MATCH — `rounded-full` |
| 71 | ✅ MATCH — `var(--fact)` |
| 72 | ✅ MATCH — `flex-none` |
| 73 | ✅ MATCH — read data summarises to null; nothing drawn |

**3d · Legality tag**

| # | Result |
|---|---|
| 74 | ✅ MATCH |
| 75 | ✅ MATCH |
| 76 | ✅ MATCH — `gap-[6px]` (with dot) |
| 77 | ✅ MATCH |
| 78 | ✅ MATCH — `h-[22px] md:h-[24px]` |
| 79 | ✅ MATCH — `pr-[8px] pl-[7px] md:pr-[9px] md:pl-[8px]` |
| 80 | ✅ MATCH |
| 81 | ❌ MISMATCH (design: `color-mix(in oklab, var(--danger) 70%, transparent)` / implementation: `in srgb`), notice-tag.tsx:29 |
| 82 | ❌ MISMATCH (design: red tint, the `Over` pill's treatment / implementation: no background at all; the component's doc comment still says "NO PLATE"), notice-tag.tsx:28–31 |
| 83 | ✅ MATCH — `var(--fg)` |
| 84 | ✅ MATCH — `text-[10px] md:text-[11px]` |
| 85 | ✅ MATCH |
| 86 | ✅ MATCH — `deckNoticesCopy.tag.notLegal` |
| 87 | ✅ MATCH |
| 88 | ✅ MATCH — `var(--danger)` dot |
| 89 | ✅ MATCH — `notLegalRead` drops the dot, same ink and border (padding closes to `px-[8px] md:px-[9px]`, derived) |
| 90 | ✅ MATCH — one `NoticeTag`; the summary SQL picks legality first |
| 91 | ⚠ PARTIAL — `status-style.test.ts:147` pins `--fg` on `--surface-inset` ≥ 4.5 for `Not legal`; no pair pins the data tag's `--fact` ink on `--surface-inset`. Counted as a gap |

**4 · Bar row**

| # | Result |
|---|---|
| 92 | ✅ MATCH |
| 93 | ❌ MISMATCH (design: gap 10px / implementation: `gap-[8px]`), deck-card.tsx:552 |
| 94 | ✅ MATCH — `h-[14px]` |
| 95 | ✅ MATCH — `flex-none` |
| 96 | ✅ MATCH — `relative` |
| 97 | ✅ MATCH — `min-w-0 flex-1` |
| 98 | ✅ MATCH — `h-[3px]` |
| 99 | ✅ MATCH — `rounded-full` |
| 100 | ✅ MATCH — `var(--border)` |
| 101 | ✅ MATCH — `absolute top-0 bottom-0 left-0` |
| 102 | ✅ MATCH — `built / bodySize`, clamped (unrounded; a pair's body is 98) |
| 103 | ✅ MATCH |
| 104 | ❌ MISMATCH (design: `--fg-muted` below 99, `--success` at 99 / implementation: the status token, so `Building` fills `--fg`, `Draft` `--fg-body`, `Over` `--danger`, etc.), status-style.ts:107–114. Shipped palette |
| 105 | ✅ MATCH |
| 106 | ✅ MATCH — `w-[60px]` |
| 107 | ✅ MATCH — `text-right` |
| 108 | ❌ MISMATCH (design: mono 12px at both / implementation: 12.5px below `sm`, 12px from `sm`), deck-card.tsx:567. A 390 phone draws 12.5 |
| 109 | ✅ MATCH — `tabular-nums` |
| 110 | ❌ MISMATCH (design: `var(--fg)` / implementation: `--fg-muted` when `built === 0`), deck-card.tsx:568. Minor, pre-existing |
| 111 | ✅ MATCH — `${built} / ${bodySize}` (98 for a pair) |

**5 · Detail row**

| # | Result |
|---|---|
| 112 | ✅ MATCH |
| 113 | ❌ MISMATCH (design: gap 10px / implementation: `gap-[8px]`), deck-card.tsx:576 |
| 114 | ✅ MATCH — `h-[14px]` |
| 115 | ❌ MISMATCH (design: min-width 0 / implementation: `flex-none` only, no `min-w-0`), deck-card.tsx:576 |
| 116 | ✅ MATCH — always rendered |
| 117 | ✅ MATCH |
| 118 | ✅ MATCH — `min-w-0`, `truncate` |
| 119 | ✅ MATCH — `truncate` |
| 120 | ❌ MISMATCH (design: 10.5px at both / implementation: 11px below `sm`, 10.5 from `sm`), deck-card.tsx:578 |
| 121 | ❌ MISMATCH (design: `var(--fg-faint)` / implementation: `detail.color`, which is `--accent` for in-use-elsewhere and `DETAIL_COLOR[status]` otherwise; deck-card.tsx:111, 137, 579). Shipped semantic colours |
| 122 | ✅ MATCH — equivalent: the figure takes `flex-1`, pushing last played right |
| 123 | ✅ MATCH — `flex-none`; nowrap not stated but a date line in a `flex-none` box |
| 124 | ✅ MATCH — mono (row) `text-[10.5px]` |
| 125 | ✅ MATCH — `var(--fg-faint)` |
| 126 | ✅ MATCH — drawn at both widths |

**6 · Yield and narrow widths**

| # | Result |
|---|---|
| 127 | ✅ MATCH — range + `Not legal` yields in the 330–408 container window (F6 measured) |
| 128 | ❌ MISMATCH (design: range + DATA notice never yields / implementation: `yieldsFace` is true for a range beside ANY notice, `deck.notice` unfiltered by kind), deck-card.tsx:312 |
| 129 | ✅ MATCH — only `split` yields |
| 130 | ❌ MISMATCH (design: below a 330 container every range draws marks only / implementation: below 330 `YIELD_FACED` is visible, so ranges draw their name and the row wraps instead; the comment at deck-card.tsx:527–530 says so), deck-card.tsx:259–260, 528–541 |
| 131 | ✅ MATCH — `@max-[330px]:flex-wrap` |
| 132 | ✅ MATCH (canvas cell width; nothing to set) |

**7 · Accessibility**

| # | Result |
|---|---|
| 133 | ✅ MATCH — `tag.spoken.unread(n)` via `noticeSpoken`, joined after the bracket in `spokenStatus`; the table's `Open notices` suffix flag is resolved by the `spoken` split (notices.ts header) |
| 134 | ✅ MATCH — `tag.spoken.notLegal(n)` |
| 135 | ✅ MATCH — `notLegalRead` speaks `notLegal(n)` |
| 136 | ✅ MATCH — null summary, no words |
| 137 | ✅ MATCH — no button; footer `aria-hidden` |
| 138 | ✅ MATCH — dot decorative |

### Pass 2: state reachability

Plumbing common to every notice state: `NoticeSummary` (summary-sql.ts:10–13) is `unread | notLegalUnread | notLegalRead | null`; `DeckListItem.notice` (read.ts:668); `listDecksWithStats` projects `noticeSummarySql()` under `includeNotice` (read.ts:995) and maps it (read.ts:1176); `/decks` passes `includeNotice: includeBracket` (page.tsx:57), so **every notice state is reachable only while `ANALYSIS_TAB_ENABLED` is on**. That gating is stated in the page, and is the plan's; noted, not counted.

| State | Result |
|---|---|
| No notice | ✅ REACHABLE — summary `null`; no tag |
| No analysis, no legality | ✅ REACHABLE — `bracket` null and `notice` null: pill alone |
| Data unread | ✅ REACHABLE — `pending` counts only through `deck_profiles`, so it needs an analysis; `NoticeTag` data branch, correct props (row 64's srgb aside) |
| Data read | ✅ REACHABLE — pending excludes `seq <= notices_read_seq`; null; nothing drawn |
| Legality unread | ⚠️ PARTIALLY REACHABLE — branch, dot, `--fg` text and `--danger` 70% border present; the H5 red TINT is absent (row 82) |
| Legality read | ⚠️ PARTIALLY REACHABLE — `notLegalRead` when the off-set equals `notices_legal_seen`; no dot. Same missing tint |
| Legality + data | ✅ REACHABLE — `off` tested first in the `case` |
| No bracket chip + legality | ✅ REACHABLE — `off` does not read `deck_profiles`; tag sits after the pill |
| Range chip + data notice | ❌ NOT REACHABLE as designed — at a 330–408 container the range yields its name beside a data tag (`yieldsFace` ignores `notice.kind`) |
| Range chip + Not legal, row fits | ✅ REACHABLE — container ≥ 408: `YIELD_FACED` shown |
| Range chip + Not legal, row full | ✅ REACHABLE — 330 ≤ container ≤ 408: `BracketChip face={false}` |
| Below the 330 band floor | ⚠️ PARTIALLY REACHABLE — the row wraps and tiles end level, but ranges keep their name rather than drawing marks only (row 130) |
| `Over` deck count | ✅ REACHABLE — `w-[60px]` count slot |

### Gap list

Visual:

1. Row 7 / 12: footer is 93 / 95px, not 92 / 94; the 1px border-top is uncounted. `src/components/decks/deck-card.tsx:511`
2. Row 13: footer is `flex-1`, not flex none (deliberate for row 8; record it in the table or reconcile). `deck-card.tsx:511`
3. Row 23: chips row has no `min-w-0`. `deck-card.tsx:518`
4. Row 24: chips row has no `overflow-hidden`. `deck-card.tsx:518`
5. Row 28: pill is 22px at every width; no `md:h-[24px]`. `deck-card.tsx:522`
6. Row 34: pill label for `Building` is `--fg` (and `Draft` `--fg-body`), not `--fg-muted`. `src/lib/decks/status-style.ts:24–29, 57–64` (shipped palette)
7. Row 64: data tag border mixes `in srgb`, not `in oklab`. `src/components/decks/notice-tag.tsx:29`
8. Row 81: legality tag border mixes `in srgb`, not `in oklab`. `notice-tag.tsx:29`
9. Row 82: legality tag has no red tint (H5, the `Over` treatment); doc comment still says "NO PLATE". `notice-tag.tsx:5–13, 28–31`
10. Row 91: no contrast pair pins the data tag's `--fact` ink on `--surface-inset`. `src/lib/decks/status-style.test.ts:147`
11. Row 93: bar row gap 8px, not 10px. `deck-card.tsx:552`
12. Row 104: fill takes the status token, not `--fg-muted` / `--success`. `status-style.ts:107–114` (shipped palette)
13. Row 108: count is 12.5px below `sm`, not 12px. `deck-card.tsx:567`
14. Row 110: count is `--fg-muted` at 0 built, not `--fg`. `deck-card.tsx:568`
15. Row 113: detail row gap 8px, not 10px. `deck-card.tsx:576`
16. Row 115: detail row has no `min-w-0`. `deck-card.tsx:576`
17. Row 120: detail figure is 11px below `sm`, not 10.5px. `deck-card.tsx:578`
18. Row 121: detail figure colour is status-driven, not `--fg-faint`. `deck-card.tsx:111, 137, 579` (shipped semantic colours)
19. Row 128: a range beside a DATA notice yields its name in the 330–408 window; design says it never yields. `deck-card.tsx:312`
20. Row 130: below a 330 container ranges keep their name (row wraps); design says marks only. `deck-card.tsx:259–260, 527–541`

State:

1. Legality unread: partially reachable. The H5 tint is missing (visual gap 9).
2. Legality read: partially reachable. Same missing tint.
3. Range chip + data notice: not reachable as designed. The yield fires for any notice kind (visual gap 19).
4. Below the 330 band floor: partially reachable. Ranges keep their name (visual gap 20).

VERDICT: 20 visual gaps, 4 state gaps.

## Agent 3 (confirm)

Items the engineer fixed, each checked against the table row:

- Gap 5 (row 28): FIXED. The tile's `StatusPillBadge` className now carries `h-[22px] … md:h-[24px]` (deck-card.tsx:528).
- Gap 7 (row 64): FIXED. The data tag's hairline is `color-mix(in oklab, var(--fact) 55%, transparent)` (notice-tag.tsx, `border` style).
- Gap 8 (row 81): FIXED. The legality tag's hairline is `color-mix(in oklab, var(--danger) 70%, transparent)`, from the same expression.
- Gap 9 (row 82): FIXED. The legality tag draws a background of `color-mix(in oklab, var(--danger) 14%, transparent)`, and the doc comment now describes "the red on its hairline, its dot and a 14% tint (H5, the `Over` pill's treatment)". The "no plate" wording is gone. Note, not counted as a gap: row 82 says to match the shipped `Over` pill, which is `color-mix(in srgb, var(--danger) 18%, var(--bg))` (status-style.ts:34, 59, 84). The tag uses 14% in oklab over transparent, so the treatment matches but the value differs. The contrast test at status-style.test.ts:156 measures the 14% figure.
- Gap 10 (row 91): FIXED. status-style.test.ts:160–163 asserts `--fact` against `--surface-inset` (and `--bg`) at ≥ 4.5:1 across every theme. :149 and :156 cover the legality tag's `--fg` on the ground and on its tint.
- Gap 11 (row 93): FIXED. The bar row's gap is `gap-[10px]` (deck-card.tsx:554).
- Gap 15 (row 113): FIXED. The detail row's gap is `gap-[10px]` (deck-card.tsx:581).
- Gap 19 (row 128, read against readiness F6): FIXED. `YIELD` has two windows by kind: `notLegal` at `@min-[330px]:@max-[408px]` and `data` at `@min-[330px]:@max-[358px]` (deck-card.tsx:259–264). The tile picks the window from `deck.notice.kind` (`unread` → `data`, else `notLegal`, deck-card.tsx:317). `scripts/probe-notices-tile.mjs` defines `YIELD_TO = 408` and `YIELD_DATA_TO = 358` and asserts both measured widths: the widest row beside `Not legal` fits within 408, and beside `● 99` fits within 358 (lines 335–336). The marks-only row must fit at the 330 floor.

Items the engineer ruled NOT gaps, with the engineer's reasons, recorded verbatim and not checked:

- 1: the handoff's 92/94 excludes the tile's existing 1px rule above the footer. The probe asserts `clientHeight` 92/94.
- 2: `flex-1` is deliberate, so tiles in a grid row end level (row 8 wins over row 13).
- 3, 4, 16: `min-w-0` / `overflow-hidden` are not needed. The rows are block children of a column, and `probe:notices-tile` asserts no overflow by `scrollWidth` at four widths.
- 6, 12, 18: the canvas approximates the shipped status palette. The palette is not this round's to change.
- 13, 14, 17: the pre-existing tile type and ink (the count's 12.5/12, its muted zero, the detail's 11/10.5) are kept from the shipped tile. The handoff does not rule them.
- 20: readiness F5 ("keep today's wrap below the 330px container floor") governs below the floor.

VERDICT: 0 gaps remain
