# Design table: Cart v2 PR 7, reading, empty and failed states

Sources (design files only): `design/design_handoff_the99_all_decks_cart_v2/` README.md (calls 9 and 10, G2, G5), STATES-all-decks-cart-v2.md, `all-decks-cart-v2 · copy strings.ts` (key names only), Loading.dc.html (A By card 1300, B By card 390, C By friend 1300, D By friend 390), Empty-One.dc.html (B 1300, B 390, C 390), and addendum R2 (#2331) `addendum-r2/README.md` §1 and `R2-Failed-Read.dc.html` (A By card 1300, B By card 390, C By friend 1300, D By friend 390). Where the addendum and v2 disagree, the addendum wins.
Values are read from the canvases' inline CSS classes (`.sk .spc .prw .f .nrw .colh .fpn .fh2 .act .rln .rd .emp .glyph .bg .tst`) and from the frames' markup. Copy: each element names its copy key, never its text (wording is /copy-review's; its PR 7 rulings are applied). "—" = not drawn. Mobile = 390, desktop = 1300. As in PR 4 the columns start at `xl` (1280); below it a row draws the phone's labelled lines. Everything PR 4, 5 and 6's tables verified for the rows, the panels and the chassis holds unchanged.

## 1. A spare cell while its read is out (Loading A `.spc .sk`, B `.prw .f`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Rendered | on every By card and By deck row whose card's read has not landed | same |
| Form | a `SPARE` line: `facts.spare` label in the 44px gutter, then the bar | the spare column's cell, the bar alone |
| Bar | the shipped skeleton bar (`BAR` from `ui/tile-skeleton`): `--elevated`, radius 3 | same |
| Bar size | 74 × 10 | 58 × 10 |
| Bar motion | `anim-skeleton` (the shipped breathe) | same |
| Column | — | keeps its width (`FACTS_GRID` unchanged) |
| Screen reader | hidden (the result line says it is reading) | same |
| After the read | the spare fact, or no line (a row with no spare) | the spare fact, or an empty cell |

## 2. Result line while reading (Loading A, B; `.rln .rd`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| By card / By deck sentence | `result.byCard` / `result.byCardNoSpare` / `result.byDeck`, as at rest | same |
| Reading clause | `result.reading`, at the line's right | same |
| Clause font | IBM Plex Mono 11, `--fg-faint` | same |
| Clause gap | 7 | 7 |
| Dot | 6 × 6, round, `--fact`, opacity .8, before the words | same |
| By friend | `result.readingByFriend` alone, no clause (Loading C, D) | same |

## 3. Key row while reading

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| By card | the spare item (`spareCopy.key`) and the buy item | same |
| By friend | the buy item alone | same |
| View switch | By card, By deck, By friend (the segment from first paint, G2) | same |

## 4. By friend while reading: skeleton panels (Loading C, D)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Column header | — | By friend's (`columns.spare`), above the box |
| Above the first panel | 2 (as the panels) | 10 |
| Panels | two: three rows, then two | same |
| Between panels | 12 | 12 |
| Panel `.fpn` | 1px `--border-strong`, radius 12, `--bg`, clipped | same |
| Header `.fh2` | flex, center, gap 11, padding 9px 8px 9px 14px, min-height 52, `--elevated`, bottom 1px `--border-strong` | same |
| Header bars | face 30 × 30 radius 8; name 90 × 12; pods 140 × 8; all `--border-strong` (`.fh2 .sk`) | same |
| Name block | column, gap 6 | same |
| Row | flex, flex-start, gap 12, padding 12px 14px, 1px `--border` between rows | grid (`FRIEND_GRID`), gap 18, center, padding 12px 14px, min-height 64, 1px `--border` between rows |
| Row bars | `.l` column gap 4: name 150 / 120 / 170 × 12, need 190 / 150 / 170 × 10, spare 60 × 10 | name 150 / 120 / 170 × 12, need 210 / 170 / 190, spare 24, own 110 (× 10) |
| Action stack | column, flex-end, gap 10: 72 × 36 radius 9, then 88 × 22 | gap 7: 64 × 28 radius 7, then 88 × 20 |
| Motion | `anim-skeleton` on the whole list | same |
| Screen reader | hidden; the result line speaks | same |
| Search, Sort, buy, checkout | live from first paint | same |

## 5. By friend's dashed block (`.emp`): Empty-One B and C, R2 C and D

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Part | the shared `EmptyState` (`ui/empty-state`) | same |
| Place | the list's place, no column header | same |
| layout | flex column, align-items flex-start, gap 8, left-aligned | same |
| padding | 26px 22px | same |
| border | 1px dashed `--border-dashed`, radius 12 | same |
| Glyph | the spare glyph, 22, `--fact`, margin-bottom 2 (none and no friends only) | same |
| Title | IBM Plex Sans 600 15, `--fg` | same |
| Body | 13 / 1.55, `--fg-body`, max-width 440 | same |
| Press `.bg` | 44 tall, margin-top 4, radius 10, 1px `--border-strong`, Sans 14, `--fg`, padding 0 14px | same |
| None (Empty-One B) | `byFriend.noneTitle`, `byFriend.noneBody(lines)`, no press | same |
| No friends (Empty-One C) | `socialCopy.friends.emptyTitle`, `byFriend.noFriendsBody`, press `byFriend.toFriends` to `/friends` | same |
| Failed (R2 C, D) | `failedRead.title`, `failedRead.body`, press `failedRead.retry`; no glyph | same |
| Result line | none and no friends: `result.byFriend(0, 0)`; failed: `result.failedByFriend` | same |
| Key row | the buy item alone | same |

## 6. A failed read in By card and By deck (R2 A, B)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Toast | the shared `SocialToast` over `ToastFrame`, `failedRead.toast`, action `failedRead.retry` | same |
| Toast place | the shipped one: above the tab bar plus 16 | the shipped one: bottom 24, centred, max 420 |
| Spare column | — (no `SPARE` line, as a row with no spare) | closed: `minmax(0,1.3fr) minmax(0,1.75fr) 0px minmax(0,1.3fr) 100px`, gap 18, header cell empty |
| Spare key item | hidden | hidden |
| Result line | the spare clause dropped (`result.byCardNoSpare`), no reading clause | same |
| By deck | the same toast; each open group's header and rows close the column | same |
| Try again | re-reads; the failed cards return to the bars (Loading A), the column returns once it lands | same |

## State coverage

| State | Triggering condition | Rendered | Key inputs |
|---|---|---|---|
| By card, reading | a selected card's read has not landed | bars in its spare cell, the reading clause, the spare key item | `usePageSpares().loaded` |
| By deck, reading | same | bars in the open groups' rows, the reading clause | same |
| By friend, reading | no panel yet and a drawn card unread | skeleton panels, `readingByFriend` | `useByFriend` status `reading` |
| By friend, none | every read landed, none failed, no spare | Empty-One B | status `none`, `hasFriends` |
| By friend, no friends | the reader has no friend | Empty-One C (over reading and none) | `hasFriend` read on the server |
| By card / By deck, failed | every selected card's read landed, one failed | toast once, column closed, no key item, no clause | `spareReadStatus` → `failed`, `SpareColumnContext` |
| By friend, failed | status `failed` | the block with Try again, no toast | `useByFriend` |
| Said once | a failure, then a view switch | no second toast; By friend's block never raises one | `SpareReadState` |
| Try again | the toast's or the block's press | the read again, back to reading | `usePageSpares().retry` |
| No match | a search leaves no line, any view | the chassis's no-match block (PR 8), before any By friend state | — |

## Verification (design-review, 2026-10-28)

Verify pass (row by row against `SpareReading` / `CartFactsRow` in `cart-line.tsx`, `CartColumns` and `FACTS_GRID_CLOSED` in `cart-columns.tsx`, `ByFriendReading` / `ByFriendEmpty` / `spareReadStatus` in `cart-by-friend.tsx`, `CartChassis`'s reading clause in `cart-chassis.tsx`, `CartKeyRow` / `CartChassisRow` / `CardOrFriendList` / `SpareReadState` in `cart-view.tsx`, and `FriendSparesProvider.retry` in `spare-markers.tsx`): every row MATCH once the gaps below were fixed, and every state REACHABLE. The check was code against the specimens' classes and markup; the build was not rendered in a browser for this table.

| # | Gap | Result |
|---|---|---|
| 1 | `?view=friend` drew By card until a spare landed, and the segment showed only once one had (G2) | Fixed: the segment shows from first paint with spare requests on; By friend draws its own states |
| 2 | No skeleton in a spare cell while reading | Fixed: the shipped `BAR`, 58 / 74, `anim-skeleton` |
| 3 | No skeleton panels | Fixed: two panels in the panel's shape (section 4) |
| 4 | A failed read drew nothing and said nothing | Fixed: the toast with Try again, the closed column, the block in By friend |
| 5 | Reading clause: gap 6, mono 10.5, the dot at full opacity | Fixed: gap 7, mono 11, opacity .8 |
| 6 | No friend count, so Empty-One C could not be told from B | Fixed: `hasFriend` in `lib/social/has-friend.ts`, read per request beside the cached cart (`PER_REQUEST_READS`) |

Decided where the boards are silent or disagree (not gaps):
- The block's title is an `h2` where the board writes `h3`: it is the list's heading under the page's `h1`, as the shipped no-match block (the same `.emp` shape) is.
- `byFriend.noneBody` ends at "right now": /copy-review cut the board's last sentence.
- No friends overrides reading as well as none: with no friend there is nothing to wait for, and the friend count is known at first paint. A failed read still draws the failed block.
- A failure is the selected cards' read as a whole (`spareReadStatus`): once every card has landed and one failed, By card and By deck close the column for every row, so no row claims a spare the others cannot. By friend keeps PR 2's rule: panels draw whenever a friend's spare landed.
- The Friend trigger's dashed `reading…` and its hiding on failure are PR 9's, with the trigger itself.
