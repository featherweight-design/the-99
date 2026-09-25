# Gap report — Help me choose PR 6b (doors, hand-off, credit strings)

Table: `docs/superpowers/design-tables/help-me-choose-doors.md`. Verified against HEAD `3b520e00`.

Note: during this pass the working tree carried an uncommitted edit to `src/app/decks/new/page.tsx:34`
(the `helpMeChoose ?` gate removed from `handOffFrom`, consistent with a mutation run in progress). The
committed file has the gate; this report verifies HEAD.

## PASS 1 — visual properties

### CreatePicker door — placement (`create-picker.tsx:127,389`)
- parent = list column: ✅ MATCH (inside the left `flex-1 min-w-0` column)
- order = first child, above search; phone above the in-flow Deck name field: ✅ MATCH (`:389`, before SearchField `:408` and the `md:hidden` name field `:443`)
- never in dock / sidebar: ✅ MATCH
- gap below 14 / 16: ✅ MATCH (`mb-[14px] md:mb-[16px]`, `help-me-choose-door.tsx:16`)
- create mode only, never import: ✅ MATCH (`helpDoor = props.mode !== "import" && props.helpDoor === true`, `:127`)
- flag: ✅ MATCH (`page.tsx:68` passes `helpDoor={helpMeChooseEnabled()}`)

### Door box (`help-me-choose-door.tsx:16`)
- display flex: ✅ · direction column / row: ✅ · align stretch / center: ✅ · gap 10 / 18: ✅
- padding 13px 14px / 15px 18px: ✅ · radius 10 / 11: ✅ · bg `--surface-sunken`: ✅ · border 1px `--border-strong`: ✅

### Text column (`:18`)
- flex column, gap 4, flex 1, min-width 0: ✅ MATCH

### Head (`:19`)
- `font-display`, 600, 14.5 / 16, `--fg`, key `door.head`: ✅ MATCH

### Body (`:20`)
- 12.5 / 13, lh 1.55, `--fg-body`, key `door.body`, no clamp: ✅ MATCH

### Button (`:22-27`)
- element: Link to `/decks/new/choose` (`CHOOSE_PATH`): ✅
- flex none: ✅ · width full on phone (stretched by column) / content on desktop: ✅
- height 44 / 38: ✅ · flex center center: ✅ · padding 0 16: ✅ · radius 8: ✅
- border 1px `--accent`, transparent bg, `--accent` text: ✅ · 13.5px 600: ✅
- hover / focus not drawn (none added): ✅ · key `door.cta`: ✅

### Page sub (`create-picker.tsx:365-368`)
- phone unchanged "From your collection.": ✅
- desktop `createPicker.sub` when the door draws, `subAlone` otherwise (ruling 8); styling unchanged: ✅

### Discover link — placement (`filter-rack.tsx:108-110,195,257`)
- mount: `resultTrailing` on the wide rack, `after` on the compact one; Discover lane only (`lane === "discover"`): ✅
- not on `/commanders` (commanders-view passes no `chooseLink`): ✅
- position: right end on wide (`ml-auto`, and the chassis wrapper `ml-auto`, `filter-chassis.tsx:335-337`); own line under the count on compact (`after` renders below the result row, `filter-chassis.tsx:340`): ✅
- rack height grows one row on compact only: ✅
- flag: `discover/page.tsx:82` → `discovery-view.tsx:576` → rack: ✅

### Link wrapper (`help-me-choose-door.tsx:43-46`)
- flex, items-center, gap 5: ✅ · margin-left 0 / auto: ✅ · min-height 44 / auto: ✅
- 12.5px, `--fg-muted` lead, sans, key `door.discoverLead`: ✅

### Link text (`:48-56`)
- `--accent`: ✅ · 1px bottom border at `color-mix(in oklab, var(--accent) 50%, transparent)`: ✅
- text-decoration none: ✅ · weight inherits: ✅ · hover/focus not drawn: ✅
- tap target: 44px `::after` over the line: ✅
- href `/decks/new/choose` with `c` and `m=exact` only when Exactly and colors lit; search/order/scope not carried: ✅ MATCH.
  Note (not a gap): `c` is written `r,g` (lowercased, comma-joined) rather than lane-params' `R,G`; `parseColors` uppercases and splits per character, so both parse identically.
- key `door.cta`: ✅

### CreatePreFilled hand-off (`create-pre-filled.tsx`)
- mode switch on `handOff` presence; absent = today's component: ✅ (`page.tsx:34-47`, flag-gated at HEAD)
- desktop back link: `handOff.back`, href results, mono 11 `--fg-faint` block mb 6 unchanged: ✅ (`:116-126`)
- phone chevron: bare "‹", href results, aria `handOff.backAria` (ruling 5): ✅ (`:105-112`)
- phone sub `handOff.subPhone`, mono 10 `--fg-faint` mt 1: ✅ (`:137-139`)
- desktop sub `handOff.sub`, 14 sans `--fg-muted` mb 26: ✅ (`:140-142`)
- ghost `handOff.backToResults`, href results, GhostButton styling unchanged: ✅ (`:328-333`)
- primary "Creating…" at opacity 0.4 while pending; block unchanged: ✅ (`:317-323`)
- `createDeck` receives budget, bracket, card (and theme labels): ✅ (`:86`, `page.tsx:38-43`)

### Answers block — position (`create-pre-filled.tsx:275`)
- phone after the Legal strip (mb 24), desktop after Color identity (mb 24), before Deck name label: ✅
- margin-bottom 24: ✅ (`hand-off-answers.tsx:31`)
- hidden when no row (ruling 7): ✅ (`drawBlock = hasAnswerRows(...)`)

### Container (`hand-off-answers.tsx:31`)
- flex column, gap 12, padding 14 / 16px 18px, radius 11, `--surface-rail`, 1px `--border`: ✅

### Heading row (`:33-49`)
- flex baseline gap 10: ✅
- heading: mono 10, 0.14em, uppercase, `--fg-faint`, `handOff.block`: ✅
- Change: ml-auto, mono 11, `--accent`, no underline, `handOff.change` + `changeAria`, target the form with answers kept (ruling 6, `page.tsx:45`), 44px `::after`: ✅

### Row (`:77-86`)
- flex, column / row, baseline, gap 4 / 12: ✅
- key: width auto / 104, flex none, mono 10, 0.1em, uppercase, `--fg-locked`: ✅
- value column: flex 1, min-w 0, flex column, gap 2: ✅
- value: 13.5, 600, `--fg`: ✅
- card value: `CardValue size="row"` (ruling 9), dotted accent underline, left-aligned: ✅
- buy tag: `BuyTag variant="row"` after the name with an 8px gap; owned draws no tag; unpriced draws `buy · no price`: ✅ (`read-as-bar.tsx:116-130`)
- consequence: 12, lh 1.5, `--fg-muted`: ✅

### Rows in order (`:50-71`)
- THEME, one per theme, `themeFig(pct, label)`, no line without a figure (ruling 2): ✅
- BUILT AROUND, `placed` + `cardFig(pct)` when a figure exists (ruling 3): ✅
- BUDGET, `budgetFirst` / `budgetUnknown` / `budgetAlone` (ruling 1, `budgetLine` `:18-22`): ✅
- BRACKET, `bracketValue(n)` and `bracket(n)`: ✅

### Credit strings (`credits.ts`)
- `spent` and `PAUSED_REASON` widened (`:33,53`); `createPicker.sub` present (`decks-builder.ts:380`): ✅

## PASS 2 — state reachability

| State | Result |
|---|---|
| 1a door, create | ✅ REACHABLE — `page.tsx:68` passes the flag; `create-picker.tsx:389` |
| 1a door, import | ✅ REACHABLE — `helpDoor` false for `mode="import"` (`:127`) |
| door, flag off | ✅ REACHABLE — no door; desktop sub `subAlone` (`:367`) |
| 1a phone | ✅ REACHABLE — column layout, 44px stretched button, above the name field, not in the dock |
| 1b Discover link | ✅ REACHABLE — `discover/page.tsx:82` → `discovery-view.tsx:576` → `filter-rack.tsx:108` |
| 1b colors lit | ✅ REACHABLE — `c` from `params.colors`, `m=exact` only when `match === "exactly"` |
| Discover link elsewhere | ✅ REACHABLE (absent) — `lane === "discover"` gate; commanders-view passes no flag |
| 6a hand-off form | ✅ REACHABLE — `handOffHref` (`choose-row.tsx:37,72`) sets `v=results`; `handOffFrom` + `loadHandOffAnswers` (`page.tsx:34-47`) |
| 6a no card | ✅ REACHABLE — no BUILT AROUND row; BUDGET `budgetAlone` |
| 6a card owned | ✅ REACHABLE — `OwnershipDot`, no buy tag; BUDGET `budgetAlone` |
| 6a card unpriced | ✅ REACHABLE — `card-chip-no-price` tag; BUDGET `budgetUnknown` |
| 6a no answers | ✅ REACHABLE — `drawBlock` false hides the block |
| 6b creating | ✅ REACHABLE — `isPending` → "Creating…", `disabled:opacity-40`; block unchanged |
| 6c / 6d | out of scope |

## Visual gaps
None.

## State reachability gaps
None.

VERDICT: 0 visual gaps, 0 state gaps
