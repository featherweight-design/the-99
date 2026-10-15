# Design property table — Social R1 PR E: pods on `/friends` (option B, "the table")

Source: `design/design_handoff_the99_social_r1/` (R2 overrides R1).

- **Primary board:** `R2 - Pods.dc.html`, option B frames: `B · the pod as a table`, `B · + Add friends, with faces`,
  `B · phone · the table`, `B · phone · add sheet`.
- **Borrowed panes (E17):** `R1 - Pods-Desktop.dc.html`, `R1 - Pods-Phone.dc.html`. These are the menu, rename,
  leave, last leave and delete panes. P1/P1b (create), P2 (solo) and P11 (hand-on) also come from R1, because R2 redraws none of them.
- **Placement:** `R2 - Friends-Desktop.dc.html` and `R2 - Friends-Phone.dc.html` (Pods section; those boards draw option A chips).
- **Toast frame:** `R2 - Invite-Desktop.dc.html` / `R2 - Invite-Phone.dc.html` (the shared `ToastFrame` as drawn).
- **Rules:** README decisions 2, 11 to 18, 24, gaps G9, G10, G15. STATES Pods and R2 rows. READINESS-r1-audit D2, D3, E4,
  E5, E11, E12, E14, E15, E17, C1. Copy structure from `social-r1 · copy strings.ts` → `socialCopy.pods.*`,
  `socialCopy.invites.tooMany`, `folderCopy.del.cancel`.

The boards write raw hex literals and never CSS variables. Each one is recorded as written. The README names
`--danger`, `--success`, `--warning` and the accent, and their likely mappings are listed once in §0. Copy is
recorded as KEY + ARGS; the text is /copy-review's.

---

## 0. Literal palette used by the pod boards

| Literal | Where | README name (where it gives one) |
|---|---|---|
| `#FF4D9A` | accent: "You" outline, New pod text, checkbox on, Add button fill, field border | the accent |
| `#C6533F` | menu Delete row text, confirm button fill | `--danger` (README 11, R1 P6 note) |
| `#6FA368` | (friends `since today`; not used by pods) | `--success` |
| `#E6E8F0` | primary text (pod name, seat name, menu rows, ✕ glyph on disc) | — |
| `#B1B6C7` | spares label, Add seat text, Cancel/Keep text, confirm body | — |
| `#959AAD` | `…` glyph, initials on seat, dialog sub, ✕ (dialog), commander line in Add rows | — |
| `#6F7486` | meta line, section kicker, checkbox off border | — |
| `#0E0F14` | page ground; tick glyph; text on accent/danger fills | — |
| `#12141B` | pod card surface | — |
| `#16181F` | dialog/sheet/menu surface; seat gradient outer stop | — |
| `#20222A` | open `…` button bg (`.more.on`), menu row dividers, Add-row divider, face fallback bg | — |
| `#262A35` | card border, dialog border, grab handle, Cancel/Keep border | — |
| `#343843` | dashed: Add seat, empty-state box | — |
| `#181C26` | section-head underline | — |
| `#101219` | text field fill | — |
| `#2A2C36` | seat initials gradient inner stop | — |

---

## 1. Placement on `/friends`

| Property | Phone (390) | Desktop (1300) |
|---|---|---|
| Section order | Head → Friends → **Pods** → Open friend links (R2 Friends-Phone) | Head → Friends → **Pods** → Open friend links (R2 Friends-Desktop) |
| Section element | `<section aria-label="Pods">` | same |
| Section top margin (`.sec`) | 24px | 34px |
| Page column | `.pg` padding 18px 16px 30px (Friends-Phone); Pods board `.scroll` padding 6px 16px 20px | `.pg` width 720px, centered (`margin:0 auto`); Pods board padding 30px 0 40px |
| Section present when | ≥1 friend OR ≥1 pod (README 2). With 0 friends and 0 pods the section is absent. | same |

## 2. Section head

| Property | Phone | Desktop |
|---|---|---|
| Layout | flex, `align-items:center`, `justify-content:space-between` | same |
| Min-height | 44px | R2 Pods board: 44px, no padding-bottom. R2 Friends-Desktop and R1: 32px + `padding-bottom:8px` (**C-2**) |
| Underline | `border-bottom:1px solid #181C26` | same |
| Kicker | `.k`: IBM Plex Mono 500 10.5px, `letter-spacing:.14em`, uppercase, `#6F7486`. Copy `pods.head(n)` with n = number of pods | same |
| New pod button | `.tl`: text button, `min-height:44px`, padding 0 4px, no border/bg, `#FF4D9A`, IBM Plex Sans 500 13.5px. Copy `pods.newPod` | same, but `min-height:32px` |
| New pod while the create field is open | not drawn (R1 P1/P1b still show the button) | same |

## 3. Pod card (B)

| Property | Phone | Desktop |
|---|---|---|
| Element | `div.pod`, `position:relative`, **`overflow:hidden`** (clips the wash) | same |
| Spacing between cards | `margin-top:12px` | same |
| Border / radius | 1px solid `#262A35`, radius 12px | same |
| Background | `#12141B` | same |
| Padding | 4px 4px 6px 14px | 6px 6px 8px 18px |
| Order | name, then by name (README 17: "pods… sort by name") | same |

### 3a. The wash (the blurred backdrop)

| Property | Phone | Desktop |
|---|---|---|
| Element | `div.wash`, `aria-hidden="true"`, first child of `.pod` | same |
| Position | `position:absolute; inset:-40px` (bleeds 40px past every edge, clipped by the card) | same |
| Content | one `<img alt="">` per member **who has commander art** (initials-only members contribute nothing), in seat order; `display:flex`; each img `flex:1; min-width:0; height:100%; object-fit:cover` | same |
| Effect | `filter: blur(34px) saturate(1.25); opacity: .30`. **The README's "30% blur" is 30% opacity over a 34px blur.** | same |
| Pointer | `pointer-events:none` | same |
| Stacking | header, seats and spares row are each `position:relative` so they sit above the wash | same |
| Source | the seats' own images, so there is no extra request (G15) | same |
| Reduced transparency | dropped (G15); the pattern is `globals.css` `prefers-reduced-transparency` | same |
| Pod with no member art | not drawn. By the board's logic the wash is an empty flex row and the card is the plain `#12141B` | same |

### 3b. Pod header

| Property | Phone | Desktop |
|---|---|---|
| Layout | `div.podh` flex, `align-items:center`, **`flex-wrap:wrap; gap:0 10px`** (name and meta inline, meta wraps under) | flex, `align-items:center`, `gap:10px`, no wrap, no min-height (R1 had `min-height:44px`) |
| Name | `<b>`: IBM Plex Sans 600 15px `#E6E8F0` | same |
| Meta | `.pm`: IBM Plex Mono 400 11px `#6F7486`. Copy is `pods.metaOwn(n)` when `isOwner`, else `pods.metaOther(n, ownerDisplayName)`. n = member count, and n = 1 renders `Just you` through the `members()` helper | same |
| `…` trigger | `button.more`: 44×44px, radius 8px, transparent bg, no border, `#959AAD`, `margin-left:auto`, `flex:none` (phone). `aria-label` = `pods.menuAria(pod.name)`, `aria-haspopup="menu"` | same, no `flex:none` |
| `…` icon | SVG 18×18, `viewBox 0 0 24 24`, `fill=currentColor`, three circles r 1.7 at (5,12) (12,12) (19,12), `aria-hidden` | same |
| `…` open state | `.more.on`: bg `#20222A`, color `#E6E8F0` (R1) | same |
| Who sees `…` | everyone. Owner menu = 3 rows, member menu = 1 row (§6) | same |

### 3c. Seat grid

| Property | Phone | Desktop |
|---|---|---|
| Element | `div.seats role="list"`, `position:relative` | same |
| Columns | `repeat(3, 1fr)` | `repeat(5, 116px)` |
| Gap (row / column) | 12px / 10px | 14px / 12px |
| Margin | 8px 10px 0 0 | 8px 12px 0 0 |
| Computed tile width | ≈102.7px (358 card − 2 border − 18 padding − 10 margin − 2×10 gaps, / 3) | 116px fixed |
| Order | owner first, then You, then the rest by name (README 17, G9, E4). Board: `You, Dave, Priya, Sam` (you own it); `Marcus (owner), You, Alex, Jo, Rin` | same |
| Add seat | the last grid cell, after every member, only when `isOwner` | same |

### 3d. Seat tile (member)

| Property | Phone | Desktop |
|---|---|---|
| Wrapper | `div.seat role="listitem"`, `position:relative`, flex column, `gap:6px`, `min-width:0` | same |
| Art box `.sa` | `aria-hidden="true"`, height **74px**, width = column, radius 10px, `overflow:hidden` | height **84px** (116×84) |
| Art box border | 1px solid `rgba(255,255,255,.08)` | same |
| Art box shadow | `0 10px 24px rgba(0,0,0,.45)` | same |
| Art | `<img alt="">` `display:block; width:100%; height:100%; object-fit:cover`. Source: the catalog's representative art crop for the member's commander (G12, G16) | same |
| Initials fallback (no commander, or not your friend) | bg `radial-gradient(120px 80px at 50% 40%, #2A2C36, #16181F)`, centered, Chakra Petch 700 26px `#959AAD`. Text = the first two characters of the display name, uppercased (`name.slice(0,2).toUpperCase()`: `JO`, `RI`) | same |
| Name row `.sn` | flex, `align-items:baseline`, `gap:6px`, IBM Plex Sans 500 13px `#E6E8F0`, `white-space:nowrap; overflow:hidden` (no `text-overflow` written) | same |
| Name text | the viewer's own seat reads `pods.you`. Every other seat reads the display name | same |
| Tag `<small>` | IBM Plex Mono 400 10px `#959AAD` (chips used `#6F7486`). `pods.ownerTag` on the owner when the owner is not you; `pods.notFriendTag` when `isFriend` is false and the member is not you | same |
| "You" outline (`.seat.me`) | `.sa` border-color `#FF4D9A` + `box-shadow: 0 0 0 1px #FF4D9A, 0 10px 24px rgba(0,0,0,.45)`, i.e. a 2px accent ring in total | same |
| Commander shown only for | you and your friends (D2). A non-friend member is always initials, even if they chose one | same |
| Accessible name of a seat | not specified. The art is `aria-hidden` and the name text is the content | same |

### 3e. Owner's ✕ disc (remove member)

| Property | Phone | Desktop |
|---|---|---|
| Rendered when | viewer `isOwner` AND member is not you. A not-a-friend member gets it too (R1 P11 Sam) | same |
| Element | `button.sx type="button"`, `aria-label` = `pods.removeMemberAria(member.name, pod.name)` | same |
| Position | `position:absolute; top:4px; right:4px` of the seat, i.e. over the art's top-right corner | same |
| Size | 28×28px, `border-radius:50%` (**C-3**: under the 44px phone target) | 28×28px |
| Colors | bg `rgba(14,15,20,.78)`, glyph `#E6E8F0`, no border | same |
| Glyph | text `✕`, 11px, centered (flex) | same |
| Behavior | one press removes at once, no confirm (README 12). The seat leaving is the receipt, and the member is not told. A not-a-friend member is removed for good, since the owner cannot re-add them (D3: build as drawn, note in Settled) | same |

### 3f. `+ Add friends` empty seat

| Property | Phone | Desktop |
|---|---|---|
| Rendered when | `isOwner` | same |
| Element | `button.seat.add type="button"`, inline `border:0; background:transparent; padding:0; text-align:left`. It sits directly in `role="list"` and is not a `listitem` (**C-9**) | same |
| Box | inner `span.sa`: height 74px, radius 10px, bg `transparent`, `border:1.5px dashed #343843`, `box-shadow:none`, centered | height 84px, 116 wide |
| Label | IBM Plex Sans 500 13px `#B1B6C7`. The board text is **`+ Add`** (**C-1**) | `+ Add friends` (`pods.addFriends`) |
| Name row under it | none | none |
| Opens | Add friends sheet (§9) | Add friends dialog (§9) |
| No friends at all | still drawn (R1 P4 note); the picker shows its empty | same |

### 3g. Spares checkbox

| Property | Phone | Desktop |
|---|---|---|
| Element | `label.own` wrapping `span.box role="checkbox" aria-checked` + `<span>` label. `position:relative` | same |
| Layout | flex, `align-items:center`, `gap:10px`, `margin-top:10px`, `min-height:40px` (**C-4**: R1 phone was 44px) | same |
| Label text | IBM Plex Sans 13px `#B1B6C7` (R1 phone 13.5px). Copy `pods.share` | same |
| Box off | 18×18 (R1 phone 20×20), radius 4px, `border:1.5px solid #6F7486`, transparent | same |
| Box on (`.box.on`) | bg + border `#FF4D9A`; glyph `✓` 12px 700 `#0E0F14` | same |
| State source | `listSharedPodIds(viewer)` membership (E5); write `shareSparesWith(viewer, pod, on)` (E12 mapping) | same |
| Default | unticked, for a new pod and for a pod you are added to (README 14) | same |
| Caption | none (G10) | none |
| Per reader | the owner and each member have their own; nobody sees another's | same |

### 3h. Solo line (only you)

| Property | Phone | Desktop |
|---|---|---|
| Rendered when | `members.length === 1` (just you, the owner). R1 P2; not redrawn on B | same |
| Style | `p.solo`: 12.5px `#959AAD`, margin 8px 10px 0 0 | margin 8px 0 0 |
| Copy | `pods.solo` | same |
| Placement on B | not drawn; R1 puts it after the chips and before the checkbox (**C-6**) | same |

---

## 4. Empty state (no pods)

| Property | Phone | Desktop |
|---|---|---|
| Rendered when | Pods section present AND 0 pods (that is, ≥1 friend) | same |
| Box | `div.empty`: `margin-top:12px`, `1px dashed #343843`, radius 12px, padding 20px 18px, flex column gap 6px | `margin-top:14px`, padding 26px 28px (R2 Friends-Desktop; R1 24px 28px) |
| Title | `<b>` Chakra Petch 700 16px `#E6E8F0`, `pods.emptyTitle` | 17px |
| Body | 13px, line-height 1.55, `#959AAD`, `pods.emptyBody` | 13.5px, `max-width:560px` |
| Replaced by | the create field while it is open (R1 P1 note "over the empty state it replaces") | same |

## 5. Create pod (inline)

| Property | Phone (R1 P1b) | Desktop (R1 P1) |
|---|---|---|
| Trigger | New pod | same |
| Position | top of the section, under the head, before any pod card | same |
| Box `.cr` | `margin-top:12px`, 1px `#262A35`, radius 12px, bg `#12141B`, padding 14px, flex column gap 8px | `margin-top:14px`, padding 16px 18px |
| Label | 13px 600 `#E6E8F0`, `pods.nameLabel` | same |
| Field `.tf` | 46px tall, radius 8px, padding 0 12px, bg `#101219`, `1px solid #FF4D9A` (focused), **16px** text `#E6E8F0` | 40px, radius 6px, 14px text, `flex:1` in a row |
| Hint | `.pm` Mono 10.5px `#6F7486`, `pods.nameHint`, under the field | Mono 11px, under the row |
| Buttons | stacked under the hint in `.btns` (flex gap 8px): Cancel `.bo` and Create `.bf`, each `flex:1`, 44px, radius 8px. Cancel: 1px `#262A35`, transparent, `#B1B6C7` 14px. Create: `#FF4D9A` fill, `#0E0F14` 600 14px | inline after the field (row gap 8px): Cancel 40px, padding 0 14px, radius 6px, 13px; Create 40px, padding 0 16px, radius 6px, 600 13px |
| Copy | `pods.cancel`, `pods.create` | same |
| Focus | the field, on open | same |
| Create disabled | while the field is empty (trimmed); no sentence. Disabled styling is not drawn | same |
| Cap | 40 code points, enforced as `cleanName` does, not by `maxLength` (E14) | same |
| Duplicate names | allowed, no refusal (README 16) | same |
| Cancel / Escape | puts the empty state (or the list) back | same |
| Result | the new card with one seat (You), the Add seat and the solo line; spares unticked; meta `pods.metaOwn(1)` | same |

## 6. Owner / member `…` menu (R1 pane on B's header, E17)

| Property | Phone | Desktop |
|---|---|---|
| Element | `div.mp role="menu"`, `aria-label` = `pods.menuAria(pod.name)`; items `button.mr role="menuitem"` | same |
| Anchor | `position:absolute; right:4px; top:50px` inside `.pod`, z-index 5 | `right:6px; top:52px` |
| Panel | width 248px, radius 10px, 1px `#262A35`, bg `#16181F`, shadow `0 22px 50px rgba(0,0,0,.6)`, overflow hidden | same |
| Row | 44px tall, padding 0 13px, IBM Plex Sans 14px `#E6E8F0`, left-aligned, `border-top:1px solid #20222A` (none on the first) | 38px tall, 13px |
| Danger row `.mr.d` | `#C6533F` | same |
| Owner rows, in order | `pods.rename`, `pods.leave`, `pods.del` (danger) | same |
| Member rows | `pods.leave` only | same |
| Trigger while open | `.more.on` | same |
| Keyboard | roving focus across rows (READINESS hit-targets line; shelf menu pattern) | same |
| Clipping on B | `.pod` is `overflow:hidden` on B, so a panel absolutely placed inside it is clipped (**C-7**) | same |

## 7. Rename (inline, R1 P10 on B's header)

| Property | Phone | Desktop |
|---|---|---|
| Trigger | menu → `pods.rename` | same |
| Replaces | the header row (`.podh`); the seats, the Add seat and the spares row stay | same |
| Container `.rn` | flex column, gap 8px, padding 10px 10px 0 0 | flex row, gap 8px, `align-items:center`, padding 4px 6px 0 0 |
| Field | as create (§5): 46px / 16px / radius 8 | 40px / 14px / radius 6, `flex:1` |
| Buttons | `.btns` row under the field: Cancel + `pods.save`, each `flex:1`, 44px | inline: Cancel 40px, Save 40px |
| Field label | `aria-label` "Pod name" on the board (that is, `pods.nameLabel`). No visible label in rename | same |
| Rules | blur commits a valid value; empty or unchanged reverts; never an invalid value; 40 code points (E14). Members see the new name on their next read, untold | same |

## 8. Confirms: leave, last leave, delete (shared `DeleteConfirm` pane, R1 P7 to P9)

| Property | Phone | Desktop |
|---|---|---|
| Element | the menu's place is taken by `div.mp role="dialog"`, `aria-label` = the heading text. Same anchor and panel as §6 | same |
| Inner `.cf` | flex column, gap 10px, padding 12px | same |
| Heading `.cfh` | Chakra Petch 600 14px `#E6E8F0` | same |
| Body `.cfb` | 12.5px, line-height 1.5, `#B1B6C7` | same |
| Buttons `.cfr` | flex, gap 8px, both `flex:1`, **44px**, radius 6px | **32px** |
| Keep | 1px `#262A35`, transparent, `#B1B6C7` 13px; copy `folderCopy.del.cancel`; first, and focused on open | 12.5px |
| Confirm | bg `#C6533F`, no border, `#0E0F14` 600 13px | 600 12.5px |
| Leave, owner, others remain | heading `pods.leaveHeading(pod)`, body `pods.leaveOwnerBody(nextOwner.displayName)`, confirm `pods.leaveConfirm` | same |
| Leave, member | `pods.leaveHeading(pod)`, `pods.leaveMemberBody(ownerDisplayName)`, `pods.leaveConfirm` (C1: wording disputed) | same |
| Leave, last member | `pods.leaveHeading(pod)`, `pods.leaveLastBody`, confirm `pods.leaveLastConfirm` | same |
| Delete (owner) | `pods.delHeading(pod)`, `pods.delBody`, `pods.delConfirm` | same |
| After | the card leaves; no toast, no receipt; nobody is told | same |

## 9. Add friends picker (R2 B with faces)

| Property | Phone (sheet) | Desktop (dialog) |
|---|---|---|
| Backdrop | `div.bdp aria-hidden`, `inset:0`, `rgba(10,11,15,.72)` (R1: `rgba(14,15,20,.72)`), z 3 | same |
| Container | `div.sht role="dialog" aria-modal="true" aria-labelledby=<h2>`: bottom-anchored, full width, bg `#16181F`, `border-top:1px solid #262A35`, radius 20px 20px 0 0, padding 20px 20px 26px, z 4 | `div.dlg` same roles: `left:50%; top:90px; translateX(-50%)`, width 420px, bg `#16181F`, 1px `#262A35`, radius 14px, shadow `0 30px 70px rgba(0,0,0,.6)`, padding 8px 20px 18px, z 4 |
| Grab handle | 40×4px, radius 2px, `#262A35`, `margin:0 auto 6px`, `aria-hidden` | none |
| Header `.dh` | flex space-between, `margin-right:-12px`; `<h2>` Chakra Petch 700 18px `#E6E8F0` = `pods.addTitle(pod.name)` | same |
| Close | `button.x` 44×44px, transparent, `#959AAD` 15px `✕`, `aria-label="Close"` (`socialCopy.page.close`) | same |
| Sub `.dsub` | 13px, line-height 1.5, `#959AAD`, margin 0 0 8px, `pods.addSub` | same |
| Row `.pk` | `<label>`, flex, `align-items:center`, gap 12px, **56px** tall, `border-bottom:1px solid #20222A`, 14.5px `#E6E8F0` | same |
| Row order | checkbox `.box` (18px, as §3g), face, name block | same |
| Face | 40×40px, radius 10px, overflow hidden, bg `#20222A`; art img cover; initials fallback Mono 500 12px `#959AAD` | same |
| Name block `.nm` | column, gap 1px; name 14.5px; commander name 12px `#959AAD`, shown only when set (straight quotes are drawn curly) | same |
| List contents | the viewer's friends minus the pod's members, by name (README 15, 17) | same |
| Initial state | nothing ticked (README 15). The board shows two ticked as the mid-state | same |
| Group | R1 wraps the rows in `role="group" aria-labelledby=<h2>`; R2 B does not (**C-10**) | same |
| Foot | `.foot` flex end, `margin-top:14px`; button `.bf` **100% wide, 48px**, radius 8px, `#FF4D9A`, `#0E0F14` 600 14px. "Pinned foot" (README 15) | button 40px, padding 0 18px, right-aligned |
| Button copy | `pods.addConfirm(n)`, n = ticked count; held at 0 (aria-disabled per the page's held pattern; held styling not drawn) | same |
| Action | one batch `addMembers(viewer, podId, publicIds[])`, or a stated partial-failure rule (E11) | same |
| Empty: all friends already in | the list is one line `pods.addAllIn` (R1 P4 note, not drawn: E15) | same |
| Empty: no friends | `pods.addNoFriends` + the Add a friend button (`page.invite`; README says "Invite a friend": R2 wording, **C-11**) | same |
| Focus | not specified for this dialog; the shipped dialog/sheet shell applies (Invite's focus opens on ✕) | same |

## 10. Toasts (shared `ToastFrame`, `role="alert"`)

| Property | Phone (R2 Invite P5) | Desktop (R2 Invite I5) |
|---|---|---|
| Position | `absolute; left:16px; right:16px; bottom:90px` (16px above the 74px tab bar), z 6 | `left:50%; bottom:24px; translateX(-50%)`, width 420px, z 6 |
| Frame | flex, center, gap 12px, radius 10px, 1px `#262A35`, bg `#20222A`, padding 4px 6px 4px 16px, shadow `0 12px 40px rgba(0,0,0,.5)` | gap 14px |
| Text | `flex:1`, padding 8px 0, 13.5px `#E6E8F0` | same |
| Retry button | 44px tall, padding 0 12px, transparent, `#FF4D9A` 600 13px, `invites.retry` | 36px tall, radius 6px |
| Pod write failed | text `pods.failed` (create, rename, delete, add, remove, leave, spares). Whether a retry button shows is not stated (**C-12**) | same |
| `tooMany` | text `invites.tooMany`, same frame, **no retry**. The phone frame is not drawn (E15) | drawn as a rule in I5's note |
| `false` results | a `false` from an already-done write is done, not a failure, but only for `removeMember` and `deletePod` here. `addMember`, `shareSparesWith` on and `leavePod` `notMember` need their own mapping (E12) | same |

## 11. P11: the new owner's view after a hand-on

| Property | Phone (not drawn, E15) | Desktop (R1 P11, chip layout) |
|---|---|---|
| Who | Dave, after Hugh left Thursday night | same |
| Meta | `pods.metaOwn(3)` | same |
| Seats | You (Dave, accent outline, Dave's commander art), Priya ✕ (friend, art), Sam ✕ + `pods.notFriendTag` (Hugh's friend, not Dave's: initials, D2) | chips: You, Priya ✕, Sam `not a friend` ✕ |
| Add seat | present (Dave owns it) | present |
| Spares | Dave's own state, as he left it; Hugh's grant went with Hugh | same |
| Menu | owner rows (Rename, Leave pod, Delete pod) | same |
| Notification | none; the card simply reads yours | same |
| Build | B's layout with these rules at three a row | B's layout, five a row |

## 12. Hover, focus, transitions

| Property | Phone | Desktop |
|---|---|---|
| Hover on seat, ✕, Add seat, menu rows, New pod | **not drawn** on any pod board | not drawn |
| Focus rings | not drawn; the app's shipped focus treatment applies | same |
| `…` open | `.more.on` (§3b) | same |
| Menu/pane open-close, sheet slide | not drawn; the shipped sheet animation applies to the sheet | not drawn |
| Seat add/remove animation | none; the seat simply leaves | same |
| Reduced transparency | wash dropped (G15) | same |

---

## State coverage

| State | Data trigger | Renders | Copy keys / args | A11y specified |
|---|---|---|---|---|
| Section absent | friends count 0 AND pods count 0 | no Pods section | — | — |
| No pods | friends ≥1, pods 0 | head + empty box | `pods.head(0)`, `newPod`, `emptyTitle`, `emptyBody` | section `aria-label="Pods"` |
| Create open | New pod pressed | inline field above the list, replacing the empty box | `nameLabel`, `nameHint`, `cancel`, `create` | field focused; Create disabled while empty; Escape cancels |
| Create failed | `createPod` throws | toast | `pods.failed` | `role="alert"` |
| Only you (just created) | `isOwner`, `members.length===1` | one seat (You, outlined), Add seat, solo line, unticked box | `metaOwn(1)`, `you`, `addFriends`, `solo`, `share` | seats `role="list"` |
| Pod you own | `isOwner`, members >1 | seats with ✕ on every non-you member, Add seat | `metaOwn(n)`, `removeMemberAria(name,pod)` | ✕ `aria-label` |
| Pod you're in | `!isOwner` | seats, no ✕, no Add seat; owner seat tagged | `metaOther(n, owner)`, `ownerTag` | — |
| Member is a friend with commander | `isFriend`, `commander` set | art tile | — | art `aria-hidden` |
| Friend without commander | `isFriend`, `commander` null | initials tile | — | — |
| Not a friend | `!isFriend && !isYou` | initials tile always (D2), tag; ✕ only if you own the pod | `notFriendTag` | nothing pressable unless owner |
| Remove member | owner presses ✕ | seat leaves at once; no confirm; non-friend removed for good (D3) | — | — |
| Remove failed | `removeMember` throws (a `false` reads as done) | seat returns; toast | `pods.failed` | `role="alert"` |
| Spares on/off | `listSharedPodIds` contains pod id | box on/off | `share` | `role="checkbox"`, `aria-checked` |
| Spares write failed | `shareSparesWith` throws or returns `false` on a turn-on (E12) | box reverts; toast | `pods.failed` | `role="alert"` |
| Owner menu | `isOwner`, `…` pressed | 3 rows | `menuAria(pod)`, `rename`, `leave`, `del` | `role="menu"`, `menuitem`, roving focus |
| Member menu | `!isOwner`, `…` pressed | 1 row | `leave` | same |
| Rename | menu → Rename | header becomes the field + Cancel/Save | `nameLabel` (aria), `cancel`, `save` | field focused; blur commits |
| Leave, handed on | `isOwner`, members >1, `nextOwner` set | confirm pane | `leaveHeading(pod)`, `leaveOwnerBody(nextOwner.displayName)`, `leaveConfirm`, `folderCopy.del.cancel` | pane `role="dialog"`, Keep focused first |
| Leave as member | `!isOwner` | confirm pane | `leaveHeading`, `leaveMemberBody(owner)`, `leaveConfirm` | same |
| Last leave | members ===1 (you) | confirm pane; `leavePod` answers deleted | `leaveHeading`, `leaveLastBody`, `leaveLastConfirm` | same |
| Delete | `isOwner`, menu → Delete | confirm pane | `delHeading(pod)`, `delBody`, `delConfirm` | same |
| Add friends open | owner presses Add seat; candidates = friends − members ≥1 | dialog / sheet with faces, nothing ticked, button held | `addTitle(pod)`, `addSub`, `addConfirm(n)`, Close | `role="dialog"`, `aria-modal`, `aria-labelledby`; `role="checkbox"` rows; held `aria-disabled` |
| Add: all already in | friends ≥1, friends − members = 0 | one line | `addAllIn` | — |
| Add: no friends | friends 0 (pods exist) | line + Add a friend | `addNoFriends`, `page.invite` | — |
| Add failed / partial | batch throws (E11) | toast | `pods.failed` | `role="alert"` |
| Hand-on, new owner (P11) | `isOwner` now true after a leave; members include `!isFriend` | owner card; non-friend has ✕ + tag | as "pod you own" + `notFriendTag` | — |
| Pod write failed (generic) | any pod action throws | toast | `pods.failed` | `role="alert"` |
| tooMany (phone) | `createInvite` → `tooMany` | toast without retry, 16px above the tab bar | `invites.tooMany` | `role="alert"` |
| Reduced transparency | media query | no wash | — | — |

---

## Contradictions and ambiguities

- **C-1** The phone Add seat reads `+ Add` on R2 B. The plan, the README (24) and `pods.addFriends` say `+ Add friends`. Desktop matches the copy key.
- **C-2** The section head's min-height is 44px both widths on R2 Pods. R2 Friends-Desktop and R1 Desktop draw 32px + 8px
  padding-bottom with a 32px New pod. Placement and the Friends board disagree at desktop.
- **C-3** The ✕ disc is 28px at phone. READINESS needs "44px presses on phone", and R1 phone used a 36px ✕. B draws no larger phone hit area.
- **C-4** The spares row on R2 B has no phone override: 40px min-height, 18px box, 13px text. R1 phone had 44px / 20px / 13.5px. 40px is under the
  44px rule.
- **C-5** The phone pod header on R2 B is inline name + meta with wrap. R1 phone and R2 Friends-Phone stack name over meta in a
  column wrapper.
- **C-6** R2 B redraws neither the solo line, the create field, the empty state nor P11. All come from R1's chip layout.
- **C-7** B's `.pod` is `overflow:hidden` for the wash, while R1's menu and confirm panels are absolutely placed inside `.pod`
  (top 50/52px). On B they would be clipped. E17 says to build them on B's header without addressing this. The wash
  needs its own clipping layer, or the panel needs a portal.
- **C-8** The README says "30% blur". The board is `blur(34px) saturate(1.25)` at `opacity:.30`, bleeding `inset:-40px`. A pod whose
  members have no art gets an empty wash, which is not drawn.
- **C-9** The Add seat is a `<button>` inside `role="list"` and not a `listitem`. The board's markup is invalid ARIA, so the build must wrap it
  or drop the list role.
- **C-10** The R2 Add dialog drops R1's `role="group" aria-labelledby` around the rows. The R2 phone sheet uses the desktop row (56px)
  where R1 phone used 52px. "Pinned foot" (README 15) is not drawn on R2: no separate bordered foot, and no scroll for a long
  list.
- **C-11** The no-friends empty: README says `…Invite one first.` with `Invite a friend`. The copy has `pods.addNoFriends` =
  `…Add one first.`, and R2 renamed the button `Add a friend`. Follow the copy keys.
- **C-12** Whether the pod failure toast carries `Try again` is unstated. STATES gives only the text, and `pods.failed` already ends
  in "Try again." Invite's create toast has a retry button; tooMany has none.
- **C-13** The seat tag colour is `#959AAD` on B, `#6F7486` on chips. If the owner is also not your friend (possible after a hand-on), which
  tag shows, or both, is undrawn.
- **C-14** The initials formula is `name.slice(0,2)` and ignores code points (an emoji name splits). Your own seat's initials, when you have no
  commander, are undrawn. The formula would give `YO` from "You" and not your own initials.
- **C-15** The seat name has `overflow:hidden; white-space:nowrap` with no `text-overflow:ellipsis`, so a 40-wide-character name
  clips hard. The Friends-Phone note asks for ellipsis on rows.
- **C-16** D3 against README 12: "adding back is one press" is false for a non-friend. Build with no confirm and note it in Settled.
- **C-17** C1: `pods.leaveMemberBody(owner)` "Only {owner} can add you back" is wrong after a hand-on if you are not the owner's
  friend. It goes to /copy-review and does not block.
- **C-18** The backdrop is `rgba(10,11,15,.72)` (R2) vs `rgba(14,15,20,.72)` (R1). Use the shipped dialog/sheet shell.
- **C-19** The board shows the Add dialog with two pre-ticked. README 15 says nothing is ticked on open; the board is a mid-state.
- **C-20** Held Create/Add button styling (disabled vs `aria-disabled`) is not drawn for either.
- **C-21** Hover and focus states for seat ✕, Add seat, menu rows and New pod are drawn on no board.
- **C-22** E14: caps are code points. The boards' notes say `maxLength 40`, and must not be read as HTML `maxLength`.
