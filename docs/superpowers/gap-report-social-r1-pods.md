# Gap report: Social R1 PR E1, pods on /friends (design-review Agent 2)

Table: `docs/superpowers/design-tables/social-r1-pods.md`. Scope: E1 only (§0–§5, §9, §10, §11 render rules, §12, and the
in-scope State Coverage rows). Out of scope: §6, §7, §8, the `…` trigger rows of §3b, the E2 state rows, `tooMany (phone)`,
and the no-friends empty's Add a friend button. Ruled decisions C-1, C-2, C-3, C-4, C-5, C-7, C-9, C-10, C-12, C-13, C-14,
C-15, C-18, C-20 and the h2-labelled section are not reported as gaps. Copy wording is /copy-review's.

Files: `src/components/social/pods-pane.tsx` (PP), `pod-card.tsx` (PC), `pod-add-friends.tsx` (PA), `social-modal.tsx` (SM),
`face.tsx` (F), `social-toast.tsx`, `src/components/collection/edit-toast.tsx` (ET), `friends-view.tsx` (FV),
`src/app/friends/page.tsx`, `src/app/globals.css`, `src/lib/social/access.ts`.

## Pass 1: properties

### §1 Placement
- ✅ MATCH Section order: head, then Pods (FV:86-87). The Friends list and Open friend links are not in this tree yet (C2); Pods follows the head.
- ✅ MATCH (ruled) Section element: `<section aria-labelledby="pods-head">` (PP:129).
- ✅ MATCH Top margin 24 / md 34 (PP:129).
- ✅ MATCH-NEAR Page column: width 720 centered at md, px 16 at phone (FV:85). Phone padding is 22px top / 60px bottom against `.pg` 18px / 30px; that frame is the shipped /friends page (PR C), not this PR's.
- ✅ MATCH Present when ≥1 friend or ≥1 pod (PP:53).

### §2 Section head
- ✅ MATCH Layout flex, center, space-between (PP:130).
- ✅ MATCH (ruled C-2) Min-height 44 / md 32 + pb 8 (PP:130).
- ✅ MATCH Underline 1px `--border` #181C26 (PP:130).
- ✅ MATCH Kicker mono 500 10.5, .14em, uppercase, `--fg-faint`, `pods.head(pods.length)` (PP:131).
- ✅ MATCH New pod: text button, min-h 44 / md 32, px 4, no border/bg, `--accent`, sans 500 13.5, `pods.newPod` (PP:132-138).
- ✅ MATCH New pod while create is open: still drawn, as R1 P1/P1b (the create pane's source) draw it (PP:132).

### §3 Pod card
- ✅ MATCH (ruled C-7) Card `relative`, the clip moved to the wash layer (PC:98, PC:23).
- ✅ MATCH margin-top 12 (PC:98).
- ✅ MATCH Border 1px `--border-strong` #262A35, radius 12 (PC:98).
- ✅ MATCH Background `--surface-rail` #12141B (PC:98).
- ✅ MATCH Padding 4 4 6 14 / md 6 6 8 18 (PC:98).
- ✅ MATCH Pods sorted by name (PP:55).

### §3a Wash
- ✅ MATCH aria-hidden, first child of the card (PC:23, PC:99).
- ✅ MATCH inset -40px, inside its own `inset-0 overflow-hidden rounded-[inherit]` clip (PC:23-24).
- ✅ MATCH One img per member with art, seat order, flex, img flex-1 min-w-0 h-full cover (PC:19, PC:24-28).
- ✅ MATCH blur(34px) saturate(1.25), opacity .30 (PC:24).
- ✅ MATCH pointer-events none (PC:23).
- ✅ MATCH Header, seat list, solo line and spares row each `relative` (PC:100, 107, 127, 128).
- ✅ MATCH Same src as the seats (PC:19, PC:36).
- ✅ MATCH Reduced transparency drops `.pod-wash` (globals.css end).
- ✅ MATCH No member art: wash not drawn (PC:20).

### §3b Header (trigger rows out of scope)
- ✅ MATCH Phone flex, center, wrap, gap 0 10 (PC:100).
- ✅ MATCH-NEAR Desktop flex, center, gap 10, nowrap (PC:100). The row carries `min-h-[44px]` at both widths where the table says no min-height; it reserves the 44px the E2 `…` trigger will give the row, so the drawn height is unchanged once E2 lands.
- ✅ MATCH Name `<b>` sans 600 15 `--fg` (PC:101).
- ✅ MATCH Meta mono 11 `--fg-faint`, `metaOwn(n)` when `isOwner`, else `metaOther(n, owner.displayName)`; n = 1 renders through `members()` (PC:102-104, social.ts:6).

### §3c Seat grid
- ❌ MISMATCH Element: design `role="list"` / implementation `<ul class="list-none">` with no explicit role (PC:106-108). `list-style:none` drops the list role in Safari/VoiceOver, so the seats are not announced as a list there. Needs `role="list"`.
- ✅ MATCH Columns 3 / md repeat(5,116px) (PC:107).
- ✅ MATCH Gaps 12/10, md 14/12 (PC:107).
- ✅ MATCH Margin 8 10 0 0 / md 8 12 0 0 (PC:107).
- ✅ MATCH-NEAR Order owner, You, rest by name (access.ts:130-137). The name compare is by code unit, so `alex` sorts after `Zed`; the pod list and the Add picker sort with `localeCompare(..., {sensitivity:"base"})` (PP:22, PP:125).
- ✅ MATCH Add seat last, only when `isOwner` (PC:113).

### §3d Seat tile
- ✅ MATCH `li` relative, flex column, gap 6, min-w-0 (PC:40).
- ✅ MATCH Art box aria-hidden, h 74 / md 84, radius 10, overflow hidden (PC:41-43).
- ✅ MATCH Border 1px rgba(255,255,255,.08) (PC:46).
- ✅ MATCH Shadow 0 10px 24px rgba(0,0,0,.45) (PC:46).
- ✅ MATCH Art img block, full, cover (PC:50).
- ❌ MISMATCH Initials gradient inner stop: design `#2A2C36` / implementation `var(--elevated)` = #20222A (PC:54). Outer stop `--surface` #16181F, Chakra Petch (`font-display`) 700 26 `--fg-muted` match; initials via `faceInitials` (ruled C-14).
- ✅ MATCH Name row flex, baseline, gap 6, sans 500 13 `--fg`, nowrap + ellipsis (ruled C-15) (PC:60-61).
- ✅ MATCH Name text `pods.you` for the viewer, else display name (PC:61).
- ✅ MATCH (ruled C-13) Tag mono 10 `--fg-muted`; owner tag wins over not-a-friend; none on your own seat (PC:38, PC:62).
- ✅ MATCH You outline: 1px accent border + `0 0 0 1px accent, 0 10px 24px rgba(0,0,0,.45)` (PC:45).
- ✅ MATCH Commander only for you and friends: the read joins the commander only through the friendship (access.ts:105-124).

### §3e ✕ disc
- ✅ MATCH Rendered when `pod.isOwner && !m.isYou`, non-friends included (PC:111).
- ✅ MATCH `button type="button"`, `aria-label` = `removeMemberAria(member.displayName, podName)` (PC:65-67).
- ✅ MATCH absolute top 4 right 4 of the seat (PC:70).
- ✅ MATCH (ruled C-3) 28×28 round, 44px press via `after:-inset-[8px]` (PC:70).
- ✅ MATCH bg rgba(14,15,20,.78), glyph `--fg`, no border (PC:70).
- ✅ MATCH `✕` 11px, flex centered (PC:70-72).
- ✅ MATCH One press removes, no confirm (PP:77-92).

### §3f Add seat
- ✅ MATCH Rendered when `isOwner` (PC:113).
- ✅ MATCH (ruled C-9) `button type="button"` wrapped in its own `li` (PC:115-124).
- ✅ MATCH Box h 74 / md 84, radius 10, transparent, 1.5px dashed `--border-dashed` #343843, centered; 116 wide by the grid (PC:120).
- ✅ MATCH (ruled C-1) Label sans 500 13 `--fg-body`, `pods.addFriends` at both widths (PC:120-122).
- ✅ MATCH No name row (PC:115-124).
- ✅ MATCH Opens the Add friends sheet/dialog (PP:201-204).
- ✅ MATCH Drawn with no friends at all (PC:113).

### §3g Spares checkbox
- ✅ MATCH (ruled) `label` with a visually hidden `input type=checkbox` + aria-hidden box + text, relative (PC:128-142).
- ✅ MATCH (ruled C-4) flex, center, gap 10, mt 10, min-h 44 / md 40 (PC:128).
- ✅ MATCH Text sans 13 `--fg-body`, `pods.share` (PC:128, PC:141).
- ✅ MATCH Box off 18×18, radius 4, 1.5px solid `--fg-faint` #6F7486, transparent (PC:137).
- ✅ MATCH Box on accent bg + border, `✓` 12 700 `--bg` (PC:137-139).
- ✅ MATCH State from `listSharedPods`, write `shareSparesWithAction` (page.tsx:23-29, PP:94-108).
- ✅ MATCH No caption; per reader (PC:128-142).

### §3h Solo line
- ✅ MATCH Rendered when `members.length === 1` (PC:127).
- ✅ MATCH 12.5 `--fg-muted`, margin 8 10 0 0 / md 8 0 0 (PC:127).
- ✅ MATCH `pods.solo`, after the seats and before the checkbox (PC:127).

### §4 Empty state
- ✅ MATCH Rendered when section present and 0 pods, not while creating (PP:188).
- ✅ MATCH mt 12 / md 14, 1px dashed `--border-dashed`, radius 12, padding 20 18 / md 26 28, column gap 6 (PP:189).
- ✅ MATCH Title Chakra 700 16 / md 17 `--fg`, `emptyTitle` (PP:190).
- ✅ MATCH Body 13 lh 1.55 `--fg-muted`, md 13.5 max-w 560, `emptyBody` (PP:191).
- ✅ MATCH Replaced by the create field while open (PP:188).

### §5 Create pod
- ✅ MATCH Trigger New pod; placed under the head, before the cards (PP:134, PP:140).
- ✅ MATCH Box mt 12 / 14, 1px `--border-strong`, radius 12, `--surface-rail`, p 14 / md 16 18, column gap 8 (PP:142).
- ✅ MATCH Label 13 600 `--fg`, `nameLabel` (PP:154).
- ✅ MATCH Field 46 / r 8 / px 12 / `--surface-sunken` / 1px accent / 16px `--fg`; md 40 / r 6 / 14px / flex-1 (PP:162).
- ✅ MATCH Hint mono 10.5 under the field at phone, mono 11 under the row at md, `--fg-faint`, `nameHint` (PP:183, PP:185; buttons `max-md:order-last`).
- ✅ MATCH Buttons phone: stacked under the hint, gap 8, each flex-1, 44, r 8; Cancel 1px `--border-strong` transparent `--fg-body` 14; Create accent fill `--bg` 600 14 (PP:164-181).
- ✅ MATCH Buttons md: inline after the field, gap 8; Cancel 40 px 14 r 6 13; Create 40 px 16 r 6 600 13 (PP:171, PP:178).
- ✅ MATCH Copy `cancel`, `create` (PP:173, PP:180).
- ✅ MATCH Focus the field on open (`autoFocus`, PP:158).
- ✅ MATCH (ruled C-20) Create held while trimmed empty: `aria-disabled`, opacity .5, press ignored (PP:61, PP:177-178).
- ✅ MATCH Cap 40 code points via `capName`, no `maxLength` (PP:160).
- ✅ MATCH Escape and Cancel close and clear (PP:147-152, PP:167-170).
- ✅ MATCH Result comes from the server redraw (PP:64-67).

### §9 Add friends picker
- ✅ MATCH (ruled C-18) Backdrop and container are the shipped SocialModal (SM:73-114); desktop width 420 (PA:48, SM:90).
- ✅ MATCH Grab handle 40×4 radius full `--border-strong`, phone only, aria-hidden (SM:92-94).
- ✅ MATCH Header h2 Chakra 700 18 `--fg`, `addTitle(podName)` (SM:96, PA:48). (md 19px is the shell's.)
- ✅ MATCH Close 44×44 transparent `--fg-muted` 15 `✕`, `aria-label` `page.close` (SM:99-107, PA:48).
- ❌ MISMATCH Sub margin: design `margin:0 0 8px` / implementation `mb-[14px]` (SM:110). 13 / lh 1.5 / `--fg-muted` / `addSub` match. Shell-owned; may be read as covered by C-18.
- ✅ MATCH Row `label`, flex, center, gap 12, h 56, border-bottom `--elevated` #20222A, 14.5 `--fg` (PA:58-60).
- ✅ MATCH Row order checkbox, face, name block (PA:62-73).
- ❌ MISMATCH Face 40 (F:25, F:46): design bg `#20222A`, no border, initials `#959AAD` / implementation bg `--surface-raised` #191B22, 1px `--border-strong` border, initials `--fg-body` #B1B6C7. Size 40, radius 10, overflow hidden, art cover, mono 500 12 match. (The 40 face is shared with the friend row, PR C.)
- ✅ MATCH Name block column gap 1; name 14.5; commander 12 `--fg-muted`, only when set (PA:70-73).
- ✅ MATCH List = friends minus members, by name (PP:124-126).
- ✅ MATCH Nothing ticked on open (PA:36).
- ✅ MATCH (ruled C-10) rows in `role="group"` labelled by a hidden copy of the title (PA:55-56).
- ✅ MATCH Foot mt 14, flex end; button phone 100% / 48 / r 8 / accent / `--bg` 600 14; md 40 / px 18 / right (PA:77-85).
- ✅ MATCH (ruled C-20) `addConfirm(n)`, held at 0 with `aria-disabled` + opacity .5 (PA:80-87).
- ✅ MATCH One batch `addMembersAction(podId, ids)` (PP:110-122).
- ✅ MATCH Empty all-in `addAllIn`; no friends `addNoFriends` (button out of scope) (PA:49-52).
- ✅ MATCH Focus on ✕ (shell default, SM:70).

### §10 Toasts
- ✅ MATCH Phone 16px above the tab bar, 16px sides (ET center slot: `bottom-[calc(var(--tabbar-h)+16px)]`, `w-[calc(100%-32px)]`).
- ✅ MATCH Desktop centered, bottom 24, width 420 (ET `md:bottom-[24px] max-w-[420px] -translate-x-1/2`).
- ❌ MISMATCH Phone frame gap: design 12px / implementation 14px at both widths (ET center frame `gap-[14px]`). Radius 10, 1px `--border-strong`, `--elevated` bg, padding 4 6 4 16, shadow 0 12px 40px .5 match. Shared ToastFrame.
- ✅ MATCH Text flex-1, py 8, 13.5 `--fg` (ET).
- ✅ MATCH (ruled C-12) `pods.failed`, no retry button, `role="alert"` (PP:49, social-toast.tsx:40).
- ✅ MATCH `false` mapping: remove's `changed:false` is done (PP:86-87); spares on with no write is a failure and reverts (actions.ts:260, PP:100-103); add's refusals toast (PP:116).

### §11 P11 render rules
- ✅ MATCH Meta `metaOwn(n)` for the new owner; seats owner(You) first; non-friend initials + `notFriendTag` + ✕; Add seat present; own spares state (PC:38, PC:103, PC:111-113; access.ts:147-161).

### §12 Hover, focus, transitions
- ✅ MATCH No hover drawn; none added beyond the cursor.
- ✅ MATCH Focus: accent focus-visible outline on ✕, Add seat and the spares box (PC:70, PC:120, PC:137).
- ✅ MATCH No seat add/remove animation (PP:79).
- ✅ MATCH Reduced transparency drops the wash.

## Pass 2: state reachability

- ✅ REACHABLE Section absent: PP:53 returns null.
- ✅ REACHABLE No pods: friends ≥1, pods 0 → head + empty box (PP:188-193).
- ✅ REACHABLE Create open: New pod → field focused, empty box replaced, held Create, Escape cancels (PP:140-187).
- ✅ REACHABLE Create failed: `createPodAction` non-ok/throw → `fail()` toast (PP:68-71).
- ✅ REACHABLE Only you: n === 1 → You (outlined), Add seat, solo line, unticked box (PC:110-142).
- ✅ REACHABLE Pod you own: ✕ on every non-you member, Add seat (PC:111-125).
- ✅ REACHABLE Pod you're in: no ✕, no Add seat, owner tagged, `metaOther` (PC:38, PC:103, PC:111-113).
- ✅ REACHABLE Friend with commander: art tile (PC:49-50).
- ✅ REACHABLE Friend without commander: initials tile (PC:52-57).
- ✅ REACHABLE Not a friend: initials (commander withheld by the read), tag, ✕ only when you own (access.ts:120-124, PC:38, PC:111).
- ✅ REACHABLE Remove member: seat leaves at once (PP:79).
- ✅ REACHABLE Remove failed: a throw puts the seat back and toasts (PP:88-91).
- ⚠️ PARTIAL Spares on/off: box tracks `listSharedPods` (PP:56). A11y is a native checkbox (ruled), so `role="checkbox"` + `aria-checked` come from the input; reachable, noted only because the row names the ARIA form.
- ✅ REACHABLE Spares write failed: non-ok or throw reverts the box and toasts (PP:100-107).
- ✅ REACHABLE Add friends open: Add seat → SocialModal with faces, nothing ticked, button held (PP:201-221, PA).
- ✅ REACHABLE Add: all already in → `addAllIn` (PA:49-51).
- ⚠️ PARTIAL Add: no friends → `addNoFriends` line drawn (PA:51); the Add a friend button is out of scope (C2).
- ✅ REACHABLE Add failed / partial: refusal or throw → toast, dialog stays (PP:113-121).
- ✅ REACHABLE Hand-on, new owner: owner card, non-friend ✕ + tag (PC:38, PC:111).
- ✅ REACHABLE Pod write failed (generic): every E1 write routes to `fail()` (PP:49).
- ✅ REACHABLE Reduced transparency: `.pod-wash` hidden (globals.css).

## Gaps

1. Seat list role: `<ul class="list-none">` with no `role="list"` (PC:106-108); Safari/VoiceOver drops the list semantics the table specifies (`role="list"`).
2. Seat initials gradient inner stop: `var(--elevated)` #20222A vs `#2A2C36` (PC:54). No token holds #2A2C36.
3. Add picker face (40): bg `--surface-raised` #191B22 vs `#20222A`; adds a 1px `--border-strong` border the board does not draw; initials `--fg-body` #B1B6C7 vs `#959AAD` (F:25, F:46). Shared with the PR C friend row.
4. Add picker sub margin-bottom 14px vs 8px (SM:110). Shell-owned; possibly covered by C-18.
5. Toast frame gap 14px at phone vs 12px (ET center frame). Shared ToastFrame.
6. Minor: seat order sorts names by code unit (access.ts:135) while the pod list and the picker sort case-insensitively (PP:22, PP:125); a lowercase name lands after every capitalised one.

## Resolution (author, after Agent 2)

1. **Seat list role: FIXED.** The seats' `ul` carries `role="list"`.
2. **Initials gradient inner stop: FIXED.** `color-mix(in oklab, var(--elevated) 70%, var(--border-dashed))`, which is
   #2A2C36 in Kamigawa and follows every other theme, where a literal would not.
3. **The 40px face in the Add picker: kept.** It is the shared `Face` (PR C's friend rows draw the same size); one face
   component everywhere is README 22's rule, so a pod-only variant would fork it.
4. **The picker's sub margin: kept.** It is the shared `SocialModal` shell's spacing (C-18).
5. **The phone toast's gap: kept.** It is the shared `ToastFrame` (E15), whose spacing every toast in the app draws.
6. **Seat order by code unit: kept.** The order is `listPods`' (PR A, server-side, owner then you then by name), the one
   the hand-on and every reader share; a client re-sort would make the pane disagree with it. A follow-up if case
   ever matters in real names.

Agent 3 (confirm) is the author's re-check of items 1 and 2: FIXED. 0 gaps remain in scope.
