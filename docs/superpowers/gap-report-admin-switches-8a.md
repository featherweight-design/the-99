# Gap report: Admin Switches, PR 8a (the list)

2026-10-13. A design-review pass on PR 8a's surfaces: `/admin/switches` and the admin head's tab strip.

- **Property table:** `design/design_handoff_the99_admin/design-tables/admin.md`. The sections read
  were R2 deltas (`page`, `pinned bar`, `list pages body`, `sticky column head`), Page head (the tab
  strip) and Switches list.
- **States:** `STATES-admin.md`, L1 to L6, with their R2 rows.
- **Canvas reference:** `Admin R2.dc.html`, at `flagRow`, `fHead`, `fGroup`, `fRow`, `searchWrap`,
  `dot`, `pill`, `tag` and `B("Search")`.
- **Plan:** `docs/superpowers/plans/2026-10-13-admin-switches-ui.md`.

## Verdict: no open gaps

The verification pass went row by row at both breakpoints. Below `md` the page uses the phone
layout; from `md` up it uses the desktop one.

### Found and fixed before verification

| # | Gap | Fix |
|---|---|---|
| 1 | The search input drew its own focus treatment inside a bordered field. `wrapped-input-focus.test.ts`, a tree-reading guard, caught it. | The field takes `AFFIX_FOCUS_INPUT` and the input takes `AFFIX_INPUT` (`ui/text-field.tsx`), so the ring is drawn on the field, as on every other wrapped input. |
| 2 | Sticky offsets were first written as interpolated class names, such as ``top-[var(${VAR},0px)]``. Tailwind cannot see an interpolated class, so no rule would have been emitted, and both the pinned bar and the column head would have scrolled away. | Both are written as literal classes: `top-[var(--admin-head-h,0px)]` and `top-[calc(var(--admin-head-h,0px)+var(--admin-pin-h,0px))]`. |

### Found by the contact sheet and fixed (2026-10-13)

The sheet ran 15 rows at 390 and 1300. It turned up two gaps, three questions and two notes.

| # | Finding | Resolution |
|---|---|---|
| 3 | **At 390, a row with two tags wrapped its resolved pill onto its own line, at the left.** Find a deck read (MODEL and NEEDS SWAP TOOLS) showed it, and Proposed cuts and Suggested changes have the same shape. The name, the tags, a `flex-1` spacer and the pill all sat in one `flex-wrap` row, so the spacer could not hold the pill right once the tags wrapped. | Fixed. The header is now a non-wrapping row of two parts: a `flex-1 min-w-0 flex-wrap` group holding the name and the tags, then the pill as a `flex-none` sibling. The tags wrap inside their own group, and the pill stays right-aligned. `switches-list.test.tsx` checks this on all three rows: the pill sits outside the wrapping group, as its next sibling, in a parent that does not wrap. A mutation putting the pill back inside the group is caught, and so is one making the parent wrap. |
| 4 | **The phone's meta line dropped the overrides part when there were none,** for example `env unset · app-wide not set · 0 of 5 on`. That follows the canvas's `flagRow`, but the design table spells the line `env · app-wide · overrides · N of 7 on`. | Fixed, following the table. The overrides slot is always drawn, and reads `no overrides` when the switch has none. `metaNoOverrides` is a new string for `/copy-review`. A mutation that drops the slot again is caught. |
| 5 | **The killed reason reads `env var is off`, while STATES L4 writes `killed by the environment`.** | **Kept as `env var is off`, unchanged.** The handoff's R2 copy file locks `switches.killed: "env var is off"`, and R2 delta 2 says "env var" throughout. STATES L4 still carries R1's wording. The copy pass (9d212e57c) did not touch this string. |
| 6 | **The Plumbing head shows a note and no count,** while STATES L1 writes `Plumbing (3)`, which would be 5 today. | **The note is kept, unchanged.** The design table's group-head row specifies `mono 10 upper --fg-muted + note --fg-faint`: a note, not a count. The R2 canvas fills the Features note with its count and the Plumbing note with `plumbingNote` ("app-wide only, not features a friend tries"), which is a string in the handoff's copy file. The table wins over STATES L1. |
| 7 | **Two inventory notes were wrong.** The compound row also needs `SHOPPING_MARK_BOUGHT_ENABLED=true`: with the child off too, the row reads off by its own env var, not by its parent. And `ADMIN_ENV_LABEL` must be `staging` or `production`, since any other value means there is no admin. | Fixed in `docs/superpowers/inventories/admin.json`: the note, and the compound row's label. |

### Verified, row by row

All of the following matched.

**R2 deltas**

- The page is a `flex:1; min-height:0` column. The head and the pinned bar are `flex:none`.
- The pinned bar pads 14 16 12 on the phone and 18 28 14 on desktop, on `--bg`, with gap 10.
- The list body pads 0 16 12 on the phone and 0 28 18 on desktop, with gap 12.
- The column head is sticky, at `z:1`, on `--surface-rail`.

**Tab strip**

- Gap 15 on the phone and 24 on desktop.
- Tabs are 42 tall at 13.5 on the phone, and 40 tall at 14 on desktop.
- The selected tab is 500 weight in `--fg`, with a 2px `--fg` underline. The other tabs are
  `--fg-muted`.
- Costs comes first and Switches second, by Hugh's ruling.

**Search and chips**

- The search field is 44 tall on the phone and 38 on desktop, capped at 420 wide on desktop. It has
  radius 9, a 1px `--border-strong` border and a `--surface-sunken` ground.
- Chips are 36 tall on the phone and 30 on desktop, as pills at 12.5. A selected chip is
  `--elevated`, with a 1px `--border-dashed` border and `--fg` text.
- The chip counts are mono 11 in `--fg-faint`.

**List box, column head and group heads**

- The list box has radius 12, a 1px `--border-strong` border and a `--surface` ground.
- The column head is desktop-only. Its grid is `minmax(0,1fr) 92 76 112 116` with gap 14 and padding
  9 14, in mono 9.5 uppercase at .12em tracking, in `--fg-faint`.
- Each group head pads 8 14 on `--surface-sunken`, with a top hairline, in mono 10 uppercase. Its
  note is `--fg-faint` in normal case.

**Rows**

- Name: 14, 500 weight, `--fg`.
- Tags: mono 9.5 uppercase, padding 2 6, radius 4. The model tag is `--accent`; a needs tag is
  `--border-strong` and `--fg-muted`.
- Variable: mono 10.5 in `--fg-faint`.
- Description: 12.5 at 1.45 line height, in `--fg-muted`.
- Env var: mono 12.5. A value of `true` is `--fg-body`, and `off` is 600 weight in `--danger`.
- Resolved dot: 8px. On is filled `--success`. Mixed is a half fill with a `--success` ring. Off is a
  `--fg-faint` ring.
- Resolved label: 13 at 500 weight.
- The phone's meta line is mono 10.5 in `--fg-body`, with margin-top 2.

**States**

- **L1:** Features A to Z, then Plumbing, with chip counts read from the rows.
- **L2:** the heads keep their counts. `None match.` appears with `Show all`.
- **L3:** search matches the name or the variable, and a head hides when its group has no rows.
- **L4:** the kill row.
- **L5:** the parent-off row.
- **L6:** the mixed row.

### Deliberate deviations (confirmed, not gaps)

1. **The pinned bar and the column head are sticky over a page that scrolls the document,** not a
   `flex:1; overflow-y:auto` table box. This is the layout Costs shipped (`src/app/admin/layout.tsx`).
   The behavior is the delta's: the head and the filters stay put, and on desktop the column head
   stays at the top of the list. The list box uses `overflow: clip`, which still lets the sticky
   column head stick.
2. **32 switches,** not the canvas's 21: 27 features and 5 plumbing. `ABOUT_SHEET` and
   `HOW_IT_WORKS` are plumbing by Design's answer to the brief's open question 2, as ruled
   2026-10-13. The chip reads `Model features 7`: audit finding 2 adds `ANALYSIS_TAB`, and this build
   adds `SWAP_TOOLS` by the same rule, since it is the parent of `FIND_A_DECK_READ`.
3. **The search text is 16px on the phone and 14px from `md` up.** The table gives no size for the
   input. 16px is the standard guard against iOS zooming into a focused field.

### Additions beyond the drawings (states the design does not draw)

- **An env var that is not set** reads `unset` in `--fg-muted`. The canvas only has `true`, `false`
  and `off`.
- **A warning line when the overrides cannot be read.** Every row then resolves from the env var
  alone, which is what readers are served in that state.
- **`ignored`** in the Overrides cell, for a group or account row on a plumbing switch. The resolver
  never applies such a row, and since the retag one could exist on production.

### Copy

Copy wording is not reviewed here. The new strings are listed for `/copy-review` in the PR body, and
the plan's Copy section covers them too.

### Not reviewed here

The switch page (8b) and the writes (8c) are reviewed in their own PRs. The contact sheet ran on 2026-10-13, after this pass: 15 rows at both widths. Its findings are rows 3 to 7 above.
