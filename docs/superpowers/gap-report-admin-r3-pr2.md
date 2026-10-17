# Gap report — Admin R3 masking, PR 2 surfaces

Table: `docs/superpowers/design-tables/admin-r3-pr2.md`. Board checked where the table was ambiguous: `design/design_handoff_the99_admin/R3/AdminR3.dc.html`. Branch `admin-pii-surfaces`, worktree `.worktrees/admin-pii-masking`. Out of scope: Show/Hide, revealed states, search/lookup, toasts, reveal history, Costs, copy wording.

## PASS 1 — properties

### Accounts list (`src/components/admin/accounts-list.tsx`)
- Card border/radius/bg/overflow — ✅ MATCH (`overflow-clip` ≈ hidden, kept for the sticky head)
- Colhead rendered desktop only, grid, columns template, gap 14 — ✅ MATCH (`GRID`, `hidden … md:grid`)
- Colhead padding 9/16, bg rail, mono 9.5, 0.12em, uppercase, faint — ✅ MATCH
- Colhead border-bottom — ✅ MATCH (equivalent: `ul md:[border-top-width:1px]`, first row border 0)
- Colhead 6 columns, 6th right-aligned — ✅ MATCH
- Row border-top / first 0 — ✅ MATCH (li `first:[border-top-width:0]`)
- Row position relative — ❌ MISMATCH — design: relative / impl: static (neither li nor Link is `relative`)
- Row display flex col / md grid, grid template — ✅ MATCH
- Row gap phone — ❌ MISMATCH — design: 5px / impl: `gap-[4px]`
- Row gap desktop 14 — ✅ MATCH
- Row align-items (stretch / center) — ✅ MATCH
- Row padding phone — ❌ MISMATCH — design: 11px 8px 11px 14px / impl: 11px 14px (right 14px)
- Row padding desktop 10/16 — ✅ MATCH
- Row min-height 64 — ✅ MATCH
- Row children (acell + pmeta / acell + 5 cells) — ✅ MATCH
- `.acell` flex/center/gap 11/min-w 0, order — ✅ MATCH
- Avatar display/centering/flex none/34×34/radius 10/border accent/bg/color/mono/11.5 — ✅ MATCH
- Avatar initials from masked name — ✅ MATCH (`maskInitials` on masked `name`)
- Avatar `.nm` diamond 8×8 rotate-45 accent, no letters — ✅ MATCH
- Avatar which rows (owner + no-name → diamond) — ✅ MATCH (`accountRows` initials null for owner; `maskInitials` null when `!named`)
- `a.stack` element — ❌ MISMATCH — design: the stack is the `<a>` / impl: stack is a `<div>`, the whole row is a `Link`
- stack flex col / gap 2 / min-w 0 / flex 1 — ✅ MATCH
- stack children, no third line — ✅ MATCH
- `.nm1` 14 / 500 / fg / anywhere — ✅ MATCH
- owner tag inline inside name line, owner only — ✅ MATCH
- `.tag` inline-flex/center/18/999/border-strong/0 7px/mono 10/0.08em/muted/ml 6/va 1px — ✅ MATCH
- email mono 10.5 — ✅ MATCH
- email line-height — ❌ MISMATCH — design: 1.5 / impl: inherited (`MONO_META` sets none)
- email faint, hidden/ellipsis/nowrap — ✅ MATCH
- Clerk id absent — ✅ MATCH
- cells rendered desktop, mono 12, fg-body — ✅ MATCH
- cells overflow-wrap — ❌ MISMATCH — design: anywhere on every `.cell` / impl: only the invited-by cell
- Group cell (incl. `No group`) — ✅ MATCH
- Credits cell `N of M` — ✅ MATCH (`creditsRow`)
- Invites cell color — ❌ MISMATCH — design: `.fgc` var(--fg) for all, `0` and `2 · 1 waiting` included / impl: `--fg-faint` when left 0 and none waiting; the waiting segment `--fg-muted`
- Invited-by cell (founder faint, else fg) — ✅ MATCH
- Spend cell right / 13 / fg — ✅ MATCH
- pmeta phone only, pl 45, mono 10.5 — ✅ MATCH
- pmeta color — ❌ MISMATCH — design: whole line var(--fg-body) / impl: invites figure in `<i>` `--accent`
- pmeta order group · credits · invites · by · spend — ✅ MATCH

### Account head (`src/components/admin/account-page.tsx`)
- Head display flex, gap 14, nowrap — ✅ MATCH
- Head align-items — ❌ MISMATCH — design: flex-start / impl: `items-center` (l.343)
- Head children — ✅ MATCH
- `.av.lg` base, 48/14/15 phone, 44/12/14 desktop — ✅ MATCH (`Avatar size="lg"`)
- `.av.lg` content initials (owner → diamond) — ✅ MATCH (`account-page.ts:196`)
- stack flex col, gap 3, min-w 0 — ✅ MATCH
- stack flex 1 — ❌ MISMATCH — design: flex 1 / impl: none (l.345)
- stack children (h1, email, role; no id) — ✅ MATCH
- h1 margin 0 / display font / 400 / 23→28 / 1.2 / fg / anywhere — ✅ MATCH
- email mono 11.5 muted — ✅ MATCH
- Clerk id absent — ✅ MATCH
- role 12.5 fg-body — ✅ MATCH

### Invites section lines (`src/components/admin/invites-section.tsx`)
- `.who` flex / center / gap 10 — ✅ MATCH
- `.who` min-height — ❌ MISMATCH — design: 46px / impl: 44px phone, 40px desktop
- `.who` border-top, `.first` → 0 — ❌ MISMATCH — design: lines in their own `.card`, first line 0 / impl: lines share the card with the number field; every line has `border-t`, including the first
- `.who` padding — ❌ MISMATCH — design: 6px 14px / impl: 6px 0 (inset only by the card's 14px phone, 20px desktop)
- `.who` font-size — ❌ MISMATCH — design: 13.5 both / impl: 13 phone, 13.5 desktop
- `.who` color fg-body — ✅ MATCH
- `b` 500 fg — ✅ MATCH
- `.txt` — ❌ MISMATCH — design: flex column, gap 1px (text over small) / impl: flex row wrap, baseline, gap-x 10
- `small` — ❌ MISMATCH — design: mono 10.5 faint, phone and desktop / impl: hidden on phone, 11px desktop (`META`)
- Face size — ❌ MISMATCH — design: 26×26 both / impl: 26 phone, 28 desktop (`FACE`)
- Face radius 7 / flex none / border strong / bg sunken / flex center / mono / muted — ✅ MATCH
- Face font-size — ❌ MISMATCH — design: 10.5px / impl: 11px (l.116)
- `.f.nm` 6×6 rotate-45 muted — ✅ MATCH
- `.f.w` 1.5 dashed, transparent, empty — ✅ MATCH
- Line 1 inviter owner → diamond — ✅ MATCH
- Line 2 invitee letters — ✅ MATCH
- Line 3 waiting desktop: `.f.w`, masked email in `b` — ✅ MATCH
- Line 3 waiting phone: masked email in `b` — ❌ MISMATCH — design: `<b>` / impl: plain text (l.235)

### Invite tree (`src/components/admin/invite-tree.tsx`)
- Row relative / flex / center — ✅ MATCH
- Row gap 8 / 10 — ✅ MATCH
- Row height auto + min 52 / 46 — ✅ MATCH
- Row border-bottom, 13.5, fg-body — ✅ MATCH
- Row padding-right — ❌ MISMATCH — design: 8px phone / 12px desktop / impl: none (`ROW`)
- Row padding-left depth 0 — ❌ MISMATCH — design: 12px / impl: 0
- Row indent depth d>0 — ✅ MATCH (d rail cells of 18/26 = (d−1)×step + elbow)
- Elbow width 18 / 26 — ✅ MATCH
- Face 26 / 28, radius 7, border, bg, center, mono 11, muted — ✅ MATCH
- `.f.nm`, `.f.w` — ✅ MATCH
- Name stack desktop row / center / gap 10 — ✅ MATCH
- Name stack flex-wrap — ❌ MISMATCH — design: wrap / impl: nowrap on desktop
- Name stack phone — ❌ MISMATCH — design: row wrap, gap 10 (meta wraps to its own line at 10px) / impl: `flex-col`, gap 0
- `b` 500 fg masked — ✅ MATCH
- Owner tag phone hidden — ✅ MATCH
- Owner tag desktop — ❌ MISMATCH — design: `.tag` inline-flex, 18px high, centered, ml 0 / impl: `inline` with `py-[2px]` (no fixed height or centering)
- joined small desktop only, owner empty — ✅ MATCH
- phone meta (`owner · …`) — ✅ MATCH
- small 10.5/11 faint — ✅ MATCH
- trailing chev / desktop meta + Open — ✅ MATCH
- Diamond rows (owner, no-name), letters, waiting dashed — ✅ MATCH (`invite-tree-rule.ts:77`)

### Group members (`src/components/admin/group-editor.tsx`)
- Row flex / center / gap 12 / min-h 60·52 / padding 8 14·8 16 — ✅ MATCH
- Row border-top, first 0 — ✅ MATCH (wrapper `i > 0`, l.285)
- `.sel` bg raised — ✅ MATCH
- Children box, stack, mstate dk — ✅ MATCH
- Name line flex wrap baseline gap 0 8 — ✅ MATCH
- Name 14/500/fg/anywhere — ✅ MATCH
- Email mono 10.5 faint — ✅ MATCH
- Email lh / nowrap + ellipsis — ❌ MISMATCH — design: lh 1.5, nowrap, ellipsis / impl: no line-height, `[overflow-wrap:anywhere]` (wraps) (l.107)
- Sub 12 muted — ✅ MATCH
- Sub content `owner`, `no group` — ❌ MISMATCH — design: drawn / impl: no sub line for a no-group account, never `owner` (`memberState`)
- Stack, no Clerk id, mstate — ✅ MATCH

### Override picker (`src/components/admin/override-picker.tsx`) and override row (`switch-page.tsx`)
- `.res` border/radius 10/overflow — ✅ MATCH
- Choice flex / center / gap 10 / min-h 44 — ✅ MATCH
- Choice padding — ❌ MISMATCH — design: 7px 12px / impl: 8px 12px (l.128)
- Choice border-top, first 0 — ✅ MATCH
- Choice children — ✅ MATCH
- Name 13.5 fg, taken disabled — ✅ MATCH
- Email mono 10.5 faint, masked — ✅ MATCH (`switch-page.tsx:120`)
- Email lh / nowrap + ellipsis — ❌ MISMATCH — design: lh 1.5, nowrap, ellipsis / impl: none, wraps (l.132)
- `already set` flex none mono faint, taken only — ✅ MATCH
- Clerk id absent — ✅ MATCH
- Override row name 14/500/fg — ✅ MATCH
- Override row email masked faint — ✅ MATCH (`switch-page-rule.ts:209`)
- Override row email lh / nowrap + ellipsis — ❌ MISMATCH — design: `.mm` / impl: wraps, no lh (`switch-page.tsx:92`)
- Override row note — ❌ MISMATCH — design: 12px muted / impl: 12.5px (`switch-page.tsx:103`)

## PASS 2 — state coverage

- Owner row, list — ✅ REACHABLE (`owner`, initials null, tag, `founder` faint, pmeta `founder`)
- Owner row, account invites inviter line — ✅ REACHABLE (`face(owner)` → null → diamond)
- Owner row, tree — ✅ REACHABLE
- Owner row, group member sub `owner` — ❌ NOT REACHABLE (`MemberRow` has no owner flag; `memberState` never returns `owner`)
- Owner row, picker — ✅ REACHABLE (plain)
- No-name, list / tree / group / picker — ✅ REACHABLE (`maskInitials` null when `!named`)
- Named, list / head / invitee face / tree / picker taken — ✅ REACHABLE
- Named, group member — ⚠️ PARTIAL (a no-group account draws no sub line; `no group` not produced)
- Username-only `CH` — ✅ REACHABLE (single word → first two letters)
- Waiting, account invites — ⚠️ PARTIAL (reachable; phone email not bold, logged as a visual gap)
- Waiting, tree — ✅ REACHABLE
- Deleted invitee — n/a (not drawn in R3)

## Visual gaps
1. accounts-list.tsx:45-46 — row — position — design: relative → implementation: static
2. accounts-list.tsx:46 — row (phone) — gap — design: 5px → implementation: 4px
3. accounts-list.tsx:46 — row (phone) — padding-right — design: 8px → implementation: 14px
4. accounts-list.tsx:49 — name/email stack — element — design: `<a>` → implementation: `<div>` inside a whole-row Link
5. accounts-list.tsx:22,58 — masked email — line-height — design: 1.5 → implementation: none
6. accounts-list.tsx:69,73,77,89 — group/credits/invites/spend cells — overflow-wrap — design: anywhere → implementation: none
7. accounts-list.tsx:77-80 — invites cell — color — design: var(--fg) always → implementation: --fg-faint at 0, waiting in --fg-muted
8. accounts-list.tsx:62 — phone meta — color — design: --fg-body throughout → implementation: invites figure --accent
9. account-page.tsx:343 — head row — align-items — design: flex-start → implementation: center
10. account-page.tsx:345 — head stack — flex — design: 1 → implementation: none
11. invites-section.tsx:24 — `.who` — min-height — design: 46px → implementation: 44px / 40px
12. invites-section.tsx:24 — `.who` — padding — design: 6px 14px → implementation: 6px 0 (card's 14/20px inset)
13. invites-section.tsx:24 — `.who` (phone) — font-size — design: 13.5px → implementation: 13px
14. invites-section.tsx:24,171 — first `.who` — border-top — design: 0 (own card) → implementation: 1px (lines share the field's card)
15. invites-section.tsx:120 — `.txt` — layout — design: column, gap 1px → implementation: row wrap baseline, gap-x 10px
16. invites-section.tsx:26 — `small` — display/size — design: shown both, 10.5px → implementation: hidden on phone, 11px desktop
17. invites-section.tsx:27 — face (desktop) — size — design: 26×26 → implementation: 28×28
18. invites-section.tsx:116 — face letters — font-size — design: 10.5px → implementation: 11px
19. invites-section.tsx:235 — waiting line (phone) — masked email weight — design: `<b>` 500 --fg → implementation: plain
20. invite-tree.tsx:29 — tree row — padding-right — design: 8px / 12px → implementation: 0
21. invite-tree.tsx:29 — tree row depth 0 — padding-left — design: 12px → implementation: 0
22. invite-tree.tsx:60 — name stack (phone) — layout — design: row wrap, gap 10px → implementation: column, gap 0
23. invite-tree.tsx:60 — name stack (desktop) — flex-wrap — design: wrap → implementation: nowrap
24. invite-tree.tsx:63 — owner tag (desktop) — box — design: inline-flex, height 18px, centered → implementation: inline, py 2px
25. group-editor.tsx:107 — member email — lh/wrapping — design: lh 1.5, nowrap, ellipsis → implementation: wraps anywhere, no lh
26. override-picker.tsx:128 — choice row — padding — design: 7px 12px → implementation: 8px 12px
27. override-picker.tsx:132 — choice email — lh/wrapping — design: lh 1.5, nowrap, ellipsis → implementation: wraps anywhere, no lh
28. switch-page.tsx:92 — override row email — lh/wrapping — design: lh 1.5, nowrap, ellipsis → implementation: wraps anywhere, no lh
29. switch-page.tsx:103 — override row note — font-size — design: 12px → implementation: 12.5px

## State reachability gaps
1. Group member, owner row — sub `owner` NOT REACHABLE: `MemberRow` (groups-rule.ts:214) carries no owner flag and `memberState` (l.256) has no owner branch.
2. Group member, account in no group — sub `no group` NOT REACHABLE: `memberState` returns `sub: null` when `row.saved` is null, and `group-editor.tsx:110` draws nothing.

VERDICT: 29 visual gaps, 2 state gaps

## Disposition (author)

README-R3 (head): "R2's design table stands for every property not listed." The R3 board redraws whole screens, so
Agent 2 compared every drawn property, including ones R3 does not change. Gaps are split on that line.

**Fixed in this PR (R3 changes these surfaces):**
- 2: phone row gap 5px (`accounts-list.tsx`).
- 5: masked email line-height 1.5 (`MONO_META`).
- 9, 10: account head aligns to the top and its stack takes the row (`account-page.tsx`).
- 19: the waiting email is bold on the phone too (`invites-section.tsx`).
- 25, 27, 28: the masked email sub (group member, picker choice, override row) is one line, ellipsised, line-height 1.5.
- State gap 2: an account in no group reads `no group` (`groups-rule.ts` `memberState`, copy `groups.inNoGroup`).

**Deferred to PR 3 (Show):** 1, 3, 4. The row's position, its 8px phone right padding and the stack-as-link
structure exist for the Show button beside the link, which PR 3 adds.

**R2 stands (unchanged surfaces R3 does not list):** 6, 7, 8 (M1 cell wrapping and invite colors), 11 to 18 (M2
Invites lines), 20 to 24 (M4 tree rows and owner tag box), 26, 29 (F7/F8 rows).

**Not built, fixture:** state gap 1, the owner member's `owner` sub. It belongs to the board's `You` owner row, which
README-R3 line 11 calls a fixture choice, not a proposal.
