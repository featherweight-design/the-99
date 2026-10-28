# Design table: Cart v2 PR 6, By friend's panels and rows

Sources (design files only): `design/design_handoff_the99_all_decks_cart_v2/` README.md (calls 1, 3, 5, 7, 8), design-tables/all-decks-cart-v2.md (Row desktop, Row phone, Friend panel), By-Friend.dc.html (A By friend 1300, A′ Chris folded 1300, B By friend 390), Empty-One.dc.html (A one spare 1300, A′ 390), Loading.dc.html (A By card 1300, its key row), Row.dc.html (the action stack's Ask states), and addendum R2 (#2331) `addendum-r2/README.md` ruling 2 and `R2-Sticky.dc.html` (A stuck, B pushed out, C phone, the spec). Where the addendum and v2 disagree, the addendum wins.
Values are read from the canvases' inline CSS classes (`.colh .fpn .fh2 .chev .nrw .prw .f .fv .act .ask .fst .bt2 .key`) and from the frames' markup. Copy: each element names its copy key, never its text (wording is /copy-review's). "—" = not drawn. Mobile = 390, desktop = 1300; the boards draw only those two. As in PR 4 the columns start at `xl` (1280); below it a row draws the phone's labelled lines and the phone's action stack. Everything PR 4's table (`all-decks-cart-v2-pr4.md`) verified for the name cell, the fact line, the pill, the fit rule and the opened list holds unchanged: By friend draws the same `CartFact` through the same row (`CartFactsRow`).

## 1. Column header (`.colh`), By friend

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Rendered | — (no header; facts carry labels) | once, above the list box; never scrolls (R2 §2) |
| display | — | grid |
| grid-template-columns | — | `minmax(0,1.15fr) minmax(0,1.7fr) 64px minmax(0,1.25fr) 100px` |
| column-gap | — | 18 |
| padding | — | 0 15px 7px (the rows sit inside the panel's 1px border) |
| border-bottom | — | 1px solid `--border-strong` |
| font | — | IBM Plex Mono 9.5, .12em, uppercase, `--fg-faint`, nowrap |
| Cells | — | `columns.card`, `columns.need`, `columns.spare`, `columns.own`, empty (actions) |
| Last cell | — | text-align right |
| Then | — | 10 to the first panel |

## 2. Panel (`.fpn`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| border | 1px solid `--border-strong` | same |
| radius | 12 | 12 |
| background | `--bg` | same |
| overflow | clip (R2: never `hidden`, which stops sticky) | same |
| Between panels | 12 | 12 |
| Order | most spares first, then by name (shipped) | same |
| Starts | open | open |

## 3. Panel header (`.fh2`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Is | the fold press (call 7) | same |
| layout | flex, align-items center, gap 11 | same |
| padding | 9px 8px 9px 14px | same |
| min-height | 52 | 52 |
| background | `--elevated` | same |
| border-bottom | 1px solid `--border-strong` open; none folded (`.fpn.shut`) | same |
| Face | 30, radius 8 | same |
| Name | IBM Plex Sans 600 15, `--fg` | same |
| Pods | `byFriend.via`, mono 11, `--fg-faint`, one line, ellipsis | same |
| Name block | flex column, gap 1, flex 1, min-width 0 | same |
| Figure | `byFriend.figure(cards, spares)`, mono 11, `--fg-muted`, nowrap | same |
| Chevron box | 36×36, `--fg-muted` | same |
| Chevron | down open, right folded | same |
| Accessible name | `byFriend.foldAria(friend, open)`, `aria-expanded`, the figure as its description | same |

## 4. Sticky header (R2 ruling 2, `R2-Sticky`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| position | static: scrolls away under the pinned controls (C) | sticky, top 0, inside the list box (A) |
| Stuck fill | — | `--elevated`, opaque, as at rest |
| Stuck bottom | — | its own 1px `--border-strong`, as at rest |
| Shadow / edge | — | none added |
| Corners | — | the panel's rounded top scrolls away; the stuck header is square |
| z | — | above its own rows |
| Hand-off | — | scoped to its panel: the next header pushes it up and out (B) |
| Column header | — | above the box, never scrolls |

## 5. Row (`.fpn .nrw` desktop, `.fpn .prw` phone)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| display | flex, align-items flex-start, gap 12 | grid, the header's columns, gap 18, align-items center |
| padding | 12px 14px | 12px 14px |
| min-height | — | 64 |
| Rule | 1px `--border` between rows | same |
| Facts column | `.l`: flex column, gap 4 | each fact its own grid cell |
| Lines / cells | name, `NEED`, `SPARE` (always), `OWN` (only when owned) | name, need, spare, own (empty cell when none owned), actions |
| Need | `facts.need`: the copies, then the decks with the pill (PR 4) | same |
| Spare `.fv` | `facts.spare`: this friend's spare copies, the count alone, no names, no glyph | same, in the 64px column |
| Own | `facts.own`, `in` + names, or G1's fallback (PR 4) | same |
| Order in a panel | the By card order (call 5) | same |

## 6. Action stack (`.act`), By friend (call 3, plan A16)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| layout | column, align-items flex-end | same |
| gap | 10 | 7 |
| Top | Ask (`spareCopy.request.ask` / `askInstead` / `askAgain`) or its status, `RowEnd` over `rowAsk` | same |
| Ask height | 36 | 28 |
| Ask min-width | 72 | 64 |
| Ask radius | 9 | 7 |
| Ask padding | 0 14px | 0 12px |
| Ask font | IBM Plex Sans 600 13 | 600 12.5 |
| Ask ink | 1px `--accent`, `--accent-text`; Ask instead 1px `--border-strong`, `--fg-body`, 500 | same |
| Status `.fst` | in a 36px row, 13, weight 500, gap 6, 7px dot (Requested `--accent`, Declined `--fg-faint`), ✓ for Accepted | in a 28px row, 12.5 |
| Bottom | the shipped `BuyTag` row | same |
| Tag height | 22 | 20 |
| Hit areas | meet at the gap's midline (5px) | meet at the gap's midline (3.5px) |

## 7. Key row

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| By friend | the buy item alone (no spare glyph on a By friend row) | same |
| By card while reading | the spare item and the buy item (Loading A) | same |

## State coverage, By friend

| State | Triggering condition | Rendered | Key inputs |
|---|---|---|---|
| Panels, rest | a selected line has a friend's spare | header, column header (desktop), rows | `usePageSpares().byCard`, `SpareRequestsContext` |
| One spare (Empty-One A) | one friend, one card, one copy | `1 card · 1 spare` | `byFriend.figure` |
| Folded | the header pressed | header alone, no rule, chevron right, figure kept | `CartView`'s `friendShut` |
| Fold kept | a view switch and back | the same panels folded | `CartView` state, the visit |
| Stuck (desktop) | the list box scrolled into a panel's rows | that panel's header at the box top | CSS sticky |
| Pushed out (desktop) | the panel's last row passed | the next header replaces it | CSS sticky, scoped per panel |
| Ask | `rowAsk` kind `ask` / `askInstead` / `askAgain` | the press | `requests.asksFor` |
| Status | `requested` / `accepted` / `declined` | the word in the Ask's place, the tag unmoved | same |
| Nothing owned | `owned` 0 | no own line (phone), empty cell (desktop) | — |
| Held slot (S3) | bought this visit, gone from the read | the shipped slot in each panel it sat in | unchanged |
| Spare key, reading | a drawn line's spares not yet landed, By card drawn | the plain spare item | `spares.loaded` |

## Verification (design-review, 2026-10-28)

Verify pass (row by row against `FriendPanel` / `ByFriendList` in `cart-by-friend.tsx`, `CartFriendLine` / `CartFactsRow` in `cart-line.tsx`, `CartColumns` in `cart-columns.tsx`, `RowEnd`'s `cart` size in `friend-spares.tsx`, `CartKeyRow` in `cart-view.tsx`): every row MATCH once the gaps below were fixed, and every state REACHABLE. The check was code against the specimens' classes and markup; the build was not rendered in a browser for this table.

| # | Gap | Result |
|---|---|---|
| 1 | Panel `overflow: hidden` (stops sticky) | Fixed: `overflow-clip` |
| 2 | Between panels 14 | Fixed: 12 |
| 3 | Header padding 10px 14px, no min-height, no fold | Fixed: 9px 8px 9px 14px, min-height 52, the header is the fold press with a 36px chevron box |
| 4 | Header figure `N spares` alone | Fixed: `byFriend.figure`, `N cards · N spares`, inflected (R2) |
| 5 | The row: v1's two wrapping grey lines, the Ask beside the tag | Fixed: the fact row in By friend's grid, the Ask above the tag |
| 6 | Ask at `line` size (32 / 28 from md, min-width 56) | Fixed: the `cart` size, 36 / 28 from `xl`, min-width 72 / 64, radius 9 / 7, 13 / 12.5; `line` had no other caller and is retired |
| 7 | Status 13 at every width | Fixed: 12.5 on desktop (`.act .fst`) |
| 8 | No column header over By friend | Fixed: `CartColumns view="friend"` with `columns.spare` |
| 9 | Spare key hidden until a spare lands | Fixed: drawn while the read is out (By card) |

Decided where the boards are silent or disagree (not gaps):
- The chevron is the app's one chevron (`Chevron kind="disclosure"`, ▸ turned to ▾), in the board's 36×36 box, rather than the board's 18px SVG path: the deck group the board says this matches draws it, and it is the shipped part.
- The first row in a panel has no rule above it, under the header's own `--border-strong`. The board's `.nrw:first-child{border-top:0}` misses there only because the header is the first child; the v2 table says "rule `--border` between rows", and two rules 1px apart would be the second edge R2 ruling 2 rules out.
- Sticky starts at `md`, where the list scrolls in its own box (the board's "desktop"); below `md` the page scrolls under the pinned controls and nothing sticks. The column header still starts at `xl`, as in PR 4.
- The hit areas meet at the midline on a coarse pointer: the Ask's hit reaches down to it (and up to about 44px), and the tag's shipped 44px hit is cut there with a `clip-path` on its row. A fine pointer's hits are the drawn boxes, as everywhere else in the app.
- Folds live in `CartView` for the visit, so switching to another view and back keeps them, as By deck's open groups are kept; nothing is persisted.
