# Design property table: Invites PR 6b (/admin M4, the Invites tab tree)

Source: `design/design_handoff_the99_invites/` (`README.md` decision 10 and G3/G6, `STATES-invites-r1.md`
§/admin row "The tree", `R1 - Admin-Desktop.dc.html` frame M4, `R1 - Admin-Phone.dc.html` frame M4,
`invites · copy strings.ts` `admin.title`/`sub`/`treeRoot`/`nodeMeta`/`waiting`/`revoke`/`open`). M1 to M3 are
PR 6a's (`invites-pr6a.md`). Board hex values are mapped to the kamigawa theme tokens in `src/app/globals.css`
(the board is drawn in kamigawa): `#0E0F14` `--bg`, `#12141B` `--surface-rail`, `#101219` `--surface-sunken`,
`#181C26` `--border`, `#262A35` `--border-strong`, `#343843` `--border-dashed`, `#E6E8F0` `--fg`, `#B1B6C7`
`--fg-body`, `#959AAD` `--fg-muted`, `#6F7486` `--fg-faint`, `#7D8294` `--fg-placeholder`, `#FF4D9A` `--accent`,
`#E0913C` `--warning`, `#C6533F` `--danger`. Fonts: IBM Plex Mono `--font-mono`, IBM Plex Sans `--font-sans`,
Chakra Petch `--font-display`.

Ignored per brief (as in 6a): the board's "new" highlights (the Invites tab's `new` badge, mono 10px `--accent`,
`margin-left:6px`). Copy strings are not enumerated beyond naming the copy element; strings live in
`invites · copy strings.ts` and go to /copy-review.

**Borrowed, not specified by this board** (the board says "the shipped head, tables and fields"): the admin head
(eyebrow, env pill, title, sub, tab strip: `AdminHead`, `admin-head.tsx`, whose `ADMIN_TABS` today hold Costs,
Switches, Groups, Accounts, Models; Invites is the sixth, appended last), the search field drawing (`.srch`, the
same class the Accounts list's search uses), the `.tl` text press (6a's Open/Revoke press), the face tile (6a's
`.who .f`), and the phone shell (wordmark header, bottom tab bar `.tb` 74px). Where the board's CSS for a
borrowed piece is given below, it is the board's drawing of the shipped piece; the shipped component is the
reference if they differ.

## Components

1. Admin head with the Invites tab (borrowed, the tab is new)
2. Tree toolbar: search field and summary chips (desktop only)
3. Root label (Founders)
4. Tree container
5. Node row (account)
6. Indent cells and rail lines
7. Face tile (account and waiting)
8. Owner tag
9. Node meta (joined date, stock, invited count)
10. Open press / row chevron
11. Waiting leaf (dashed face, address, how sent, return date, Revoke)
12. Ordering and nesting rules
13. Deleted-account node, empty state (not drawn)

---

### 1. Admin head with the Invites tab

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Source | shipped `AdminHead` | shipped `AdminHead` |
| Eyebrow + env pill | `Admin` + `production` pill, as shipped; no back link | same; no back link |
| Title | `Invites` (`admin.title`), display 400 23px `--fg` | `Invites`, display 400 28px `--fg` |
| Title subtitle (`.ttl span`) | — | — (empty `tsub`) |
| Sub paragraph | — (phone head draws no sub) | `admin.sub` ("Who invited whom. Founders are…revoked here."), sans 13.5px/1.6 `--fg-body`, max-width 720px, margin 0 |
| Tab set | Costs, Switches, Groups, Accounts, Models, Invites (six; Invites last) | same six, same order |
| Tab label | `Invites` (`admin.tab`) | same |
| Active tab | Invites: `--fg` text + 2px `--accent` bottom border | same |
| Inactive tabs | `--fg-muted`, 2px transparent bottom border | same |
| Tab typography | sans 13px | sans 13.5px |
| Tab padding | 10px 0 11px | 10px 0 11px |
| Tab gap | 15px | 24px |
| Strip margin-top | — (head gap 7px) | 4px (head gap 9px) |
| Strip overflow at six tabs | `display:flex; overflow:hidden; white-space:nowrap`; each tab `flex:none` (does not shrink). Board caption calls it "the shipped head, its tab strip scrolling". Six tabs at 13px + 5×15px gaps sit at or past the 358px content width; whether the strip scrolls the active tab into view is not drawn (shipped behaviour is the reference) | single row, no overflow at 1300 |
| Head padding | 14px 16px 0; border-bottom 1px `--border` | 26px 28px 0; border-bottom 1px `--border` |
| `new` badge on Invites | ignored per brief | ignored per brief (mono 10px `--accent`, ml 6px on board) |
| Body padding | 16px | 22px 28px |
| Body overflow | `overflow:hidden` on the frame; caption: "A deep tree scrolls" (the page scrolls) | `overflow:hidden` on the frame |

### 2. Tree toolbar (search + summary chips)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Rendered | — (no search, no chips on phone M4) | yes, above the root label |
| Layout | — | flex, align-items center, gap 12px, margin-bottom 14px |
| Search field | — | borrowed `.srch`: height 36px, width 360px, radius 7px, border 1px `--border-strong`, bg `--surface-sunken`, padding 0 12px, sans 13px `--fg-placeholder`, margin 0 (overrides the 16px bottom margin) |
| Search placeholder | — | `Find an account` (not in the copy file; to /copy-review) |
| Search behaviour | — | not specified (filter vs jump not drawn) |
| Chips container | — | flex, gap 8px, `margin-left:auto` (right-aligned) |
| Chip | — | height 28px, padding 0 10px, radius 999px, border 1px `--border-strong`, flex align center, mono 11px `--fg-body`, no fill |
| Chip contents (drawn) | — | `5 accounts`, `3 invited`, `2 waiting` (accounts in the tree; accounts that joined on an invite; waiting invites) |
| Chip interactivity | — | static `span`s; no press drawn |

### 3. Root label

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Text | `Founders` | `Founders · accounts from before launch` (`admin.treeRoot`) |
| Font | mono 10px, weight not set (400) | mono 10.5px, weight not set (400) |
| Letter-spacing | .14em | .14em |
| Case | uppercase | uppercase |
| Color | `--fg-faint` | `--fg-faint` |
| Padding | 2px 0 8px | 4px 0 8px |
| Border | bottom 1px `--border-strong` | bottom 1px `--border-strong` |
| Count | one label, above the first founder; no further label between founders | same |

### 4. Tree container

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Role | `role="tree"`, `aria-label="Who invited whom"` | same |
| Layout | block (no `.tree` class) | `.tree`: flex column |
| Items | every row, waiting leaves included, is `role="treeitem"`; rows are flat siblings (nesting shown by indent cells, not DOM nesting) | same |
| `aria-level` / `aria-expanded` | — | — |
| Collapse / expand | — (no toggles drawn) | — |

### 5. Node row (account)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Layout | flex, align-items center, gap 8px | flex, align-items center, gap 10px |
| Height | min-height 52px | height 46px (fixed) |
| Border | bottom 1px `--border` | bottom 1px `--border` |
| Base text | sans 13.5px `--fg-body` | sans 13.5px `--fg-body` |
| Child order | indent cells, face, text column (`.tx`), chevron | indent cells, face, name, [owner tag], [joined meta], right cluster |
| Text column | `.tx`: flex column, min-width 0; name over meta | — (name and meta inline in the row) |
| Name | `<b>` `--fg` weight 500, 13.5px | `<b>` `--fg` weight 500, 13.5px |
| Name truncation | none: caption "nothing truncates a name" | not drawn |
| Right cluster | — (chevron only, see 10) | `.r`: `margin-left:auto`, flex, align center, gap 16px: stock meta then `Open ›` |
| Row press | the whole row opens the account (caption "a row opens the account") | only `Open ›` is a link; the row itself is not drawn as a press |
| Hover / focus | not specified | not specified |

### 6. Indent cells and rail lines

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Wrapper `.ind` | flex, `align-self:stretch` (full row height), flex none | same |
| Founder (depth 0) | no `.ind` at all | no `.ind` at all |
| Cells per row | one per depth level (depth 1 = 1 cell, depth 2 = 2 cells) | same |
| Cell width | 18px ("18px a level") | 26px |
| Cell position | relative | relative |
| Line stroke | 1px solid `--border-dashed` (`#343843`), solid not dashed | same |
| Line x offset | left 8px within the cell | left 12px within the cell |
| `v` (ancestor continues) | vertical line top 0 to bottom 0 | same |
| blank cell | no line (the ancestor at that level was its parent's last child) | same |
| `tv` (tee: this node has a later sibling) | vertical top 0 to bottom 0, plus horizontal `border-top` at top 50%, width 9px | vertical full height, plus horizontal at 50%, width 12px |
| `t` (elbow: last child) | `border-left` + `border-bottom`, top 0, height 50%, width 9px, `border-bottom-left-radius:5px` | same, width 12px, radius 6px |
| Horizontal reach | 8px + 9px = ends at 17px of an 18px cell; then the row gap (8px) to the face | 12px + 12px = ends at 24px of a 26px cell; then the row gap (10px) |
| Lines across row borders | lines run top 0 / bottom 0 inside each 52px row, so they meet across the 1px row border | same, 46px rows |
| Rendering | CSS pseudo-elements, not SVG | same |

### 7. Face tile

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Account face size | 26 × 26px | 28 × 28px |
| Radius | 7px | 7px |
| Border | 1px `--border-strong` | 1px `--border-strong` |
| Overflow | hidden; flex none | same |
| Image | `img` block, 100% × 100%, `object-fit:cover`, `alt=""` (the commander art face, as 6a) | same |
| Waiting face | same box, border 1.5px dashed `--border-dashed`, no image, `aria-hidden="true"` | same (no explicit background; empty) |

### 8. Owner tag

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Rendered | — as a pill: on phone `owner` is the first item of the meta line (`owner · 5 left · invited 2`) | pill after the name on the owner's row only |
| Text | `owner` | `owner` |
| Font | (meta line font, see 9) | mono 10px, letter-spacing .08em |
| Color | (meta) | `--fg-muted` |
| Border / radius | — | 1px `--border-strong`, radius 999px |
| Padding | — | 2px 7px |
| Other group names | — (only `owner` drawn) | — |

### 9. Node meta

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Joined date placement | first item of the meta line under the name, no word: `Oct 18 · …` | `<small>` right after the name: `joined Oct 18` |
| Joined date on founders | — (founders show no date) | — |
| Stock + invited placement | same meta line: `… · 2 left · invited 1` | inside the right cluster, before `Open ›`: `2 left · invited 1` |
| Copy | `admin.nodeMeta(left, invited)` = `N left · invited K`, separators ` · ` | same |
| Font | mono 10.5px | mono 11px |
| Color | `--fg-faint` | `--fg-faint` |
| Drawn values | Hugh `owner · 5 left · invited 2`; Colin `Oct 18 · 2 left · invited 1`; Peter `Oct 19 · 0 left`; Max `Oct 20 · 0 left`; Chris `3 left · invited 0` | Hugh `5 left · invited 2`; Colin `joined Oct 18` / `2 left · invited 1`; Peter `joined Oct 19` / `0 left`; Max `joined Oct 20` / `0 left · invited 0`; Chris `3 left · invited 0` |
| Drawing inconsistency | `invited 0` omitted for Peter and Max but shown for Chris | omitted for Peter only; shown for Max and Chris. `nodeMeta` always includes `invited K`: the copy function is the rule |
| Waiting count in meta | — (waiting invites appear as leaves, not a count) | — |

### 10. Open press / row chevron

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Element | `.r` span `›`: `margin-left:auto`, `--fg-muted`, 18px, padding-right 2px | `<a class="tl">` `Open ›` (`admin.open`) |
| Press typography | — | sans 500 13px `--accent` |
| Press box | — (row is the target, min-height 52px) | min-height 32px, padding 0 4px, no border, transparent |
| Target | the account's page (M2) | same |
| Rendered on | every account row | every account row |
| Hover / focus | not specified | not specified |

### 11. Waiting leaf

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Position | a child of the inviting account, after that account's account children, same indent rules (6) | same |
| Row class | `.nd` (no `.wait` class on phone: base text `--fg-body`) | `.nd.wait`: row text `--fg-muted` |
| Height | min-height 52px | height 46px |
| Face | dashed (7) | dashed (7) |
| Text layout | `.tx` column: line 1 `Waiting · by email` (span, not bold), line 2 `<small>` address · return date | one inline span: `Waiting · by email · m.chen@example.com` (`admin.waiting(how, email)`), not bold |
| How sent | `by email` / `in person` | same |
| Address | line 2, drawn shortened (`m.chen@…`); truncation rule not specified | full address in line, `--fg-muted` 13.5px sans |
| Return date | `<small>` mono 10.5px `--fg-faint`: `m.chen@… · returns Oct 27` | `<small>` mono 11px `--fg-faint` in the right cluster: `returns Oct 27` |
| Sent date | — | — (M2's `sent … · returns …` is not used in the tree) |
| Revoke | `<button class="tl">` `Revoke` (`admin.revoke`), `margin-left:auto`, min-height 44px, padding 0 4px, sans 500 13px `--accent`, no border, transparent | `<button class="tl">` `Revoke` in the right cluster (gap 16px after the return date), min-height 32px, same type |
| Chevron | — (no `›`; the leaf does not open anything) | — (no `Open ›`) |
| Revoke effect | returns the invite at once (G3); the leaf leaves the tree | same |
| Revoke confirm / pending / failure | not drawn | not drawn |
| Address visibility | admin only ("Admin sees addresses; no player ever does") | same |

### 12. Ordering and nesting (as drawn)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Roots | founders (accounts with no inviter), each at depth 0 with no indent: Hugh, then Chris | same |
| Root order | Hugh (owner) first, Chris last; rule not stated | same |
| Children | each account directly under its inviter, depth = inviter's depth + 1 | same |
| Child order | by join date as drawn (Colin Oct 18 before Max Oct 20); rule not stated | same |
| Account children vs waiting leaves | account children first, then the inviter's waiting leaves (Colin: Peter `tv`, waiting `t`) | same |
| Drawn tree | Hugh › [Colin › [Peter, waiting m.chen], Max › [waiting j.ruiz]], Chris | same |
| Depth limit | none; caption "A deep tree scrolls" | none drawn |

### 13. Not drawn

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Deleted-account node | not drawn; README G6 leaves "the tree's rule when one side is deleted" to engineering | not drawn |
| Empty state (no accounts / no invites) | not drawn | not drawn |
| Search with no match | — | not drawn |
| Loading state | not drawn (shipped admin loading is the reference) | not drawn |

## State Coverage

| State | Trigger | Rendered | Data needed |
|---|---|---|---|
| Invites tab active | route is the Invites tab | head title `Invites`, desktop sub, Invites tab underlined in `--accent` | — |
| Tab strip at phone | 390 width, six tabs | one nowrap strip, `overflow:hidden`, tabs do not shrink; board calls it scrolling | — |
| Summary chips | desktop page loads | `N accounts`, `N invited`, `N waiting` | account count, invited-account count, waiting count |
| Search | desktop | `Find an account` field; behaviour not drawn | — |
| Founder row | account with no inviter | depth 0, no indent; desktop no joined date; phone meta without date | face, name, stock, invited count, group (owner tag) |
| Owner founder | the owner account | desktop `owner` pill; phone `owner ·` meta prefix | group = owner |
| Invited account, has later sibling | not its inviter's last child | `tv` tee cell at its own level | inviter, sibling order |
| Invited account, last child | its inviter's last child (waiting leaves count as children) | `t` elbow cell | same |
| Ancestor continues | an ancestor at that level has later siblings | `v` cell | ancestry |
| Ancestor ended | an ancestor at that level was a last child | blank cell | ancestry |
| Account meta | every account row | desktop `joined <date>` + `N left · invited K`; phone `<date> · N left · invited K` | join date, stock, invited count |
| Open account | desktop `Open ›` / phone row press | navigates to the account page | account id |
| Waiting leaf, by email | waiting invite sent by email | dashed face, `Waiting · by email`, address, `returns <date>`, Revoke | method, address, return date, invite id |
| Waiting leaf, in person | waiting invite from a QR claim | same with `in person` | same |
| Revoke | press Revoke | invite returns to the sender at once; leaf leaves; counts update | invite id |
| Deep tree | many levels | indents add per level; page scrolls; names not truncated | — |
| Deleted account (either side) | inviter or invitee purged | not drawn (G6) | — |
| Empty | no accounts / no invites | not drawn | — |
| Hover / focus | pointer or keyboard | not specified | — |

States not drawn (so no visual spec): deleted-account node, empty tree, search no-match, Revoke pending or
failure, loading, collapse/expand.
