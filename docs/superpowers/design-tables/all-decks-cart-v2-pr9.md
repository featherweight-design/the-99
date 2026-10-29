# Design table: Cart v2 PR 9, the Friend and Owned filters

Sources (design files only): `design/design_handoff_the99_all_decks_cart_v2/` README.md (calls 4 to 6, D3, D4, R1b, G3), STATES-all-decks-cart-v2.md (the chassis rows), `all-decks-cart-v2 · copy strings.ts` (`filters` key names only), Controls.dc.html (A1 Friend 1300, B1 Filters sheet 390, C1 1300 and C2 390 carried, D no match 390), Loading.dc.html (A, C the dashed Friend trigger 1300; B, D 390), and addendum R2 (#2331) `addendum-r2/README.md` §1 and §4 with `R2-Chassis.dc.html` (A2, B2, C2 shipped; D1 1300, D2 390). Where the addendum and v2 disagree, the addendum wins: §4 voids the v2 mock's chassis values, so the triggers, the desktop panels, the sort and the Filters pill are the shipped parts as they are.
Values are read from the canvases' inline CSS classes (`.chs .r1 .trg .trg.wait .chip .rln .pop .it .sht2 .grab .hd .gh .pills .pill .segx .bts .bp .lnk .emp`, and R2's `.sc .ft .ft .bd .sch .ca`). Copy: each element names its copy key, never its text (wording is /copy-review's; its PR 9 verdict is applied: every `filters` string verbatim, `sheetMatch` inflected). "—" = not drawn. Mobile = 390, desktop = 1300; the chassis is wide from 1000px. Everything PR 4 to 8's tables verified for the rows, the panels and the chassis frame holds unchanged.

## 1. Row 1 (`.r1`, R2 `.sc .r1`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Children, in order | search (`DeckSearchField` sheet), the Filters pill; hairline; ⇅ | search (`DeckSearchField` column), Friend trigger, Owned trigger; hairline; `Sort · <current>` |
| Hairline | 20px, `--border` (the chassis's own) | same |
| Sort | `OrderMenu`: the 44px ⇅ opens its 186px dropdown (R2 D2) | `OrderMenu`'s 32px labelled trigger and dropdown |
| Phone sort sheet | — (retired, R2 §4) | — |

## 2. The Filters pill (R2 `.ft`, compact; Controls C2 `.bd`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Component | `/collection`'s `FiltersTrigger`, as it is | — |
| Size | 36 tall, round, 44px hit by `after:` | — |
| Words | `collectionChassisCopy.sheet.trigger`; accessible name `sheet.triggerAria(n)` | — |
| Badge | dimensions on (Friend, Owned), never the search; none at 0; accent fill, mono 10 | — |
| Edge | `--accent` with a dimension on, `--border-strong` without | — |

## 3. The Friend trigger and panel (Controls A1, Loading A, R2 A2, §4)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Trigger | — (the sheet's group, §5) | `FilterPanel`'s desktop trigger: sans 13 medium, `--elevated`, radius 8, chevron |
| One pick | — | `panels.friend.triggerOne`: `<friend>: <name>` (R2 A2), accent edge |
| Two or more | — | the label and the shipped count pill |
| Absent | — | no friend has a spare of a selected line, or friends' spares are off |
| Reading | the sheet's group, §5 | inert: dashed `--border-strong` edge, `--fg-locked` words `filters.friend`, then `filters.friendReading` mono 10 `--fg-faint` in the chevron's place (`.trg.wait`) |
| Failed read | the sheet's group hidden | hidden (R2 B2) |
| Panel | — | `FilterPanel` popover, 280 wide, 44px rows (the chassis contract) |
| First row | — | `filters.anyFriend`, its count the lines some friend has a spare of ("spare available") |
| Then | — | a row per friend with a spare of a selected line: `Face` 22 (radius 6), name, count |
| Row order | — | most cards first, then by name |
| Count | — | lines the search and Owned leave that the friend holds a spare of |
| Zero count | — | the shipped disabled row (.42), unless it is picked |
| Footer | — | the shipped Clear (`footerStatus` off) |

## 4. The Owned trigger and panel (call 6)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Trigger | — (the sheet's segments, §5) | `FilterPanel`'s desktop trigger; `filters.owned` at Any, `panels.owned.triggerOne` (`<owned>: <value>`) on a pick, accent edge then |
| Panel | — | `FilterPanel` single-select, 280 wide, 44px rows: `ownedAny`, `ownedSome`, `ownedNone` with counts; a pick closes it |
| Count | — | lines the search and the Friend filter leave, per value |

## 5. The Filters sheet (Controls B1, R1b)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Frame | portalled `Sheet`, z-50, compact only (`min-[1000px]:hidden`), absent while closed | — |
| Scrim | `rgba(8,6,4,.62)` | — |
| Panel | radius 18 top, 1px `--border-strong` top, `--surface-raised`, max 86dvh | — |
| Grab | 38 × 4, radius 2, `--border-dashed`, 10 from the top | — |
| Body | padding 14 18 26, column, gap 14 | — |
| Head | baseline, space-between: `sheet.trigger` Cinzel 700 18 `--fg`; `filters.sheetMatch(shown, of)` mono 11 `--fg-muted` | — |
| Group heading `.gh` | `filters.friendHead`, `filters.owned`: mono 10, .12em, uppercase, `--fg-faint`, 8 above its group (14 less 6) | — |
| Friend group | absent when no friend has a spare or the read failed | — |
| Friend group, reading | one inert pill across the row: 44, round, dashed `--border-strong`, `filters.friendReading` in `--fg-locked` | — |
| Pills grid | `repeat(2, minmax(0,1fr))`, gap 8 | — |
| Any friend | spans both columns, words centred, padding 0 14, no face, no count | — |
| Friend pill | 44 tall, round, 1px `--border-strong`, sans 14 `--fg-body`, padding 0 14 0 6, gap 8; `Face` 32 disc; count mono 11 `--fg-faint` at the end | — |
| Pill on | `--accent` edge, `--fg`, accent at 12% | — |
| Owned | segments: 1px `--border-strong`, radius 10, padding 3, gap 2; each flex 1, 38 tall, radius 7, sans 500 13.5 `--fg-muted`; on `--elevated`, `--fg` | — |
| Presses row | flex, gap 14, 4 above | — |
| Primary | `filters.show(shown)`: flex 1, 44 tall, radius 10, `--fg` on `--bg`, sans 500 14; closes the sheet (nothing pending) | — |
| Clear all | `chassisCopy.chips.clearAll`, sans 500 13.5 `--accent-text`, 44px tall | — |
| Live region | the sheet's own, `filters.sheetMatch` 300ms after a change; the chassis line is silent while open | — |
| Wide crossing | closes, and stays closed coming back | — |

## 6. Row 2, the chips (Controls C1, C2, D; R2 `.sch`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Friend chip | one for the filter: `filters.chipFriend` in `--fg-muted` (the board's `<em>`), then `filters.anyFriend` or the named friends' names; spoken whole | same |
| Its ✕ | turns the Friend filter off (decision 2) | same |
| Owned chip | `filters.chipOwned`, then the value | same |
| Order | Friend, Owned, then the search | same |
| Clear all | takes both filters and the search, never the sort | same |

## 7. Row 3 and the list

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| By card, By deck, filtered | `result.filtered(shown, of)` | same |
| By friend | its own sentence, counting the panels the filter leaves | same |
| Named friends in By friend | only their panels (Controls C2) | same |
| Carried across views | search, Friend and Owned (D4); the sort stays per view | same |
| No match, a filter on | the chassis's no-match block: `noMatch.title`, no body, `chassisCopy.chips.clearAll` | same |
| No match, the search alone | PR 8's block, unchanged | same |

## 8. The address (G3, decision 2)

| Parameter | Value |
|---|---|
| `?friend` | `any`, or comma-joined public ids; absent when off |
| `?owned` | `some` or `none`; absent at Any |
| Mirror | `mirrorUrl`, every parameter the page does not own kept |
| Arrival | a malformed `?friend` or an `?owned` it does not offer is stripped |
| Unknown id | dropped, and stripped, once every card's read has landed; a filter left naming nobody, or Any with no friend holding a spare, is off |
| Failed read | the Friend filter is inert (no chip, no badge, no narrowing) and kept in the address for a Try again |

## States

| State | Trigger | Draws | Decided by |
|---|---|---|---|
| Friend, reading | a selected card's read is out | dashed `reading…` trigger; the sheet's dashed pill | `spareReadStatus` → `reading` |
| Friend, offered | the read landed and a friend has a spare of a selected line | the panel, the sheet's pills | `offer.kind === "friends"` |
| Friend, absent | no friend has a spare, or spares are off | no trigger, no sheet group | `offer.kind === "none"` |
| Friend, failed | the selected cards' read failed | no trigger, no group, the filter inert | `spareReadStatus` → `failed` |
| Any friend | `?friend=any` | the lines some friend has a spare of, the chip | `friendKeeps` |
| Named | `?friend=<ids>` | those friends' lines, only their By friend panels | `friendKeeps`, `namedKeeps` |
| Owned | `?owned=some` / `none` | the lines owned or not, the chip | `ownedKeeps` |
| Filtered, no match | the filters and search leave nothing | the no-match block with Clear all | `NoMatch` |

## Verification (design-review, 2026-10-28)

Verify pass (row by row against `CartChassis` / `FriendTrigger` in `cart-chassis.tsx`, `CartFilterSheet` / `Pill` in `cart-filter-sheet.tsx`, `CartBody` / `CartChassisRow` / `CardOrFriendList` / `NoMatch` in `cart-view.tsx`, `FiltersTrigger` in `collection/filter-bar.tsx`, `FilterPanel` as shipped, and the filter rules in `lib/decks/cart-sort.ts`): every row MATCH once the gaps below were fixed, and every state REACHABLE. The check was code against the specimens' classes and markup; the build was not rendered in a browser for this table.

| # | Gap | Result |
|---|---|---|
| 1 | The sheet's group headings sat in a flex fieldset, where a rendered legend is not a flex item, so the 14 less 6 spacing never reached them | Fixed: block fieldsets, the heading's own 8px below |
| 2 | The Owned panel's rows carried a placeholder count of 0, so each was spoken as "0 cards" | Fixed: each value's real count, the search and the Friend filter applied |
| 3 | A named friend narrowed By card but By friend still drew every friend's panel over those lines (Controls C2 draws only the friend's) | Fixed: `namedKeeps` |
| 4 | A filter that left nothing drew PR 8's block, whose press dropped an empty search | Fixed: with a filter on, the block offers Clear all |
| 5 | `Face` had no 32 or 22 | Fixed: two sizes added (the sheet's disc, the panel row's tile) |

Decided where the boards are silent or the shipped chassis rules (not gaps):
- R2 §4: the desktop Friend panel is `FilterPanel` as it is, so Any friend draws the panel's square box rather than A1's ring radio, with no rule under it and no `filters.friendHead` head (a non-searchable panel draws no group label). Named and Any still exclude each other: a press on one replaces the other (`toggleFriend`).
- Friend and Owned panels are 280 wide, `/decks`' width, since R2 voids the mock's 248.
- C1's `· Chris has a spare` clause on the result line has no string, so the filtered line is `result.filtered` alone.
- The sheet's Friend group while reading is not drawn at 390; it takes the desktop trigger's dashed `reading…` as one pill across the row.
- A failed read leaves the Friend filter inert rather than applying it: the trigger is hidden (B2), and narrowing by spares that did not load would claim no card matches.
- The no-match block with a filter on has no body sentence: Controls D's sentence has no string (the plan's For /copy-review list), so it offers the chip row's own Clear all.
