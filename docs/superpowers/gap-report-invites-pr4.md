# Gap report — Invites PR 4

Source of truth: `docs/superpowers/design-tables/invites-pr4.md`. Accepted decisions from the brief (error text
`--danger`, expired plate `--fg-muted`, card back `--surface-inset` and the claimed card back as a local copy of
FriendCard's back face, QR plate `#F4F5F8`, solid 1px glyph border, card 1's hold drawn as the off card with the held
sentence, path 2's count line as the body's first line) are not reported.

## Pass 1 — visual properties

### /friends head
- Add a friend press: 13/13 match (`friends-head.tsx:212-223`: 48px/15px phone full width via `items-stretch`, 44px/14px desktop, min-w 132, px 20, radius 8, accent/bg; never held or pending with invites on, `:119-120`).
- Head action column: 5/5 match (`:126`, `:211`).
- Count line `.cnt`: 9/9 match (`invite-count-line.tsx:36-45`; right-aligned at desktop via `md:items-end`; `Out of invites` faint; wait spans `--fg-body`).
- 10-link hold line: 7/8. ❌ spacing/order — design: press → 6px → held → 8px → count / implementation: press → 8px (outer gap) → held → 6px → count (`friends-head.tsx:211,225`).
- Section head below: ❌ `.sh` margin-top phone — design 26px / implementation 24px (`friends-list.tsx:61`, shipped); desktop 34 ✅.

### Dialog / sheet shell (`social-modal.tsx`)
- Scrim: ✅ (color-mix `--bg` 72%; fixed/z-50 is the app frame equivalent).
- Container: 10/11. Desktop top 10vh = 82px at 820 ✅; desktop padding 12/20/18 ✅. ❌ phone bottom padding — design 24px / implementation 22px (`:143`).
- Grab handle: 3/4. ❌ margin below — design 4px / implementation pb 2px + header pt 8px = 10px (`:112,115`).
- Header row: ❌ gap — design 4px / implementation 12px (`:115`; ‹ compensates with -mr-8, title→✕ is 12px). ❌ align-items — design center / implementation flex-start with h2 pt-10 (`:115,127`). h2 fonts ✅, margin-right -10 ✅ (on ✕).
- Back ‹: 8/8 match (`:117-125`).
- Close ✕: 6/6 match.
- Sub `.dsub`: 5/5 match (`:141`).

### Chooser (`invite-sheet.tsx`)
- Options stack: 3/3. Option card: 13/13 (`:121`). Text column: 9/9 (`:140-142,162`). Chevron: 4/4. Card 2 `.left`: 3/3.
- Glyph tile: 9/9 (`:159`).
- QR icon: ❌ desktop size — design 24×24 / implementation 26×26 at every width (`invite-sheet.tsx:160`). Stroke 1.6, viewBox, shapes ✅ (`invite-new.tsx:28-36`).
- Fan / minis / `.gone`: all match (`:194-216`; mini gradient is accent 35% color-mix).
- Card 1 pending: 3/3 (`--accent-dim` = `--accent-shadow`). Card 2 off: 10/10. Card 1 held: ✅ (accepted). Hover: ✅ (`CARD_LIVE`, live cards only).

### Path 1 (`add-friend-dialog.tsx`, shipped body)
- QR wrap: ❌ margin-top phone — design 4px / implementation 2px (`:96`; desktop 4 ✅). Plate, modules 7/6px (203/174), caption, meta, link row, link field, Copy link ✅.
- ❌ QR dark module — design `--bg` / implementation hard-coded `#0E0F14` (`:106`; also `invite-qr.tsx:108`).
- Share icon: ❌ design 18×18 share icon in Share link / implementation no icon (`:115`).

### Path 2 (`invite-new.tsx`)
- Count sub: 8/8 (`:95`). Section label: 5/5 (`KICKER`). Sentence: 4/4. Show an invite QR: 14/14 (`FILLED_PRESS`, icons 18/16, held). "or": 7/7. Field label: 4/4.
- Email field: 12/13. ❌ placeholder color — design `--fg-faint` / implementation `--fg-placeholder` (`text-field.tsx:42`, the primitive's contrast token; kamigawa #7D8294 vs #6F7486).
- Send invitation: ❌ phone filled margin-top — design 12px / implementation 8px always (`:172`). ❌ desktop outlined weight — design 600 13px / implementation 500 (`:176`). Others ✅.
- Hint: ✅. Error line: ❌ phone position — design under the field, above Send / implementation after the field+Send block, at both widths (`:182`). Other error props ✅.
- Answer card `.sent`: 11/11 (`:122-127`).
- Invite someone else: ❌ padding — design 0 2px / implementation 0 (`:134`). Others ✅.
- Last-invite line: ❌ desktop padding-bottom — design 10px / implementation 12px at every width (`:129`).

### Toast
- ✅ shared `ToastFrame`, role alert (`social-toast.tsx:37-40`); field keeps text.

### Invite QR (`invite-qr.tsx`)
- Count sub: ❌ margin-bottom — design 14px / implementation 16px (`:76,92`).
- QR wrap: ✅. Ring: 8/8 (`:94-99`). Plate: 8/9 (dark module hex above).
- EXPIRED chip: ❌ phone padding — design 0 16px / implementation 0 14px at every width (`:115`). Other chip props ✅.
- Caption: ✅. Timer: ❌ `small` font — design 12px `--font-mono` / implementation 12px, no mono (`:130`). Others ✅.
- Meta line: ❌ phone margin-top — design 2px (beyond the 10px gap) / implementation 0 (`:125-132`).
- Expired sentence: ❌ spacing — design wrap gap + 4px phone / 6px desktop (14px) / implementation mt 12px (`:135`).
- Presses: ✅ (Done live/claimed, Make a new QR, desktop foot).
- Claimed `.sent`: ❌ border, radius, background — design 1px `--border-strong`, 12px, `--surface` / implementation none of the three (`:77`). Padding, gap, align, title, check, body ✅.
- Card back: accepted (FriendCard copy). ❌ back→title spacing — design back margin-bottom 6px + gap 8 = 14px / implementation gap 8 + title mt 10 = 18px (`:79`).

## Pass 2 — state reachability

- A1 ✅ (`friends-view.tsx:350`, `invite-sheet.tsx:111-112`). A2 ✅ (`inviteCardOpen`, `rules.ts:72`; `invite-sheet.tsx:180-186`). A3 ✅ (`linkPending` = `making`, `:157,163`). A4 ✅ (`friends-view.tsx:294`, `invite-sheet.tsx:107-108`). A5 ✅ (`:112-114`).
- D1 ✅ (hover `md:` only). D2 ✅. D3 ✅ (`social-modal.tsx:122`). D4 ✅.
- E1 ✅ (`invite-new.tsx:74-77,165`). E2 ✅ (`focus:` accent, `shaped` fills Send, form submit). E3 ✅ (`:67-69,159,174`). E4 ✅ (`:81-85`, count via `revalidatePath`, `invite-actions.ts:48`). E5 ✅ (`last`, `:78,128`; QR press held `:69`). E6 ✅ (`:90`, email kept).
- Q1 ✅ (`invite-sheet.tsx:64-77`, `invite-actions.ts:70`). Q2 ✅ (`invite-qr.tsx:68`). Q3 ✅ (`send.ts:163`, watch `use-invite-qr-watch.ts:39-48`). Q4 ✅ (clock `invite-qr.tsx:63-65` or watch). Q5 ✅ (`showQr(true)`, `setEnded(null)`, clock reset on token `:61`).
- C1 ✅ C2 ✅ C3 ✅ C5 ✅ C6 ✅ (`friends-head.tsx:119-122,224-229`; card 1 `invite-sheet.tsx:155-167`).
- C4 ⚠️ PARTIALLY: the held span and the same-QR re-show work (server answers the same token), but "at expiry the line returns to 3" has no trigger once the sheet is closed. The page line is the server's `loadInviteCount` from the last render; with the sheet closed `InviteQr` and its watch are unmounted, and nothing in `friends-view.tsx` refreshes on the QR's `expiresAt` (the minute clock `:204` and `useInviteWatch` `:239-247` cover friend links only). The line reads `· 1 held by an open QR` until some other refresh.
- A5/C4 ⚠️ path 2's count line passes `thisQr` (`invite-new.tsx:95`), so with a live QR path 2 reads `held by this QR`; `InviteCountLine` documents `thisQr` as "the QR's own screens" (`invite-count-line.tsx:28`), and path 2 is not one.

## Visual gaps
1. friends-head.tsx:211,225 — Hold line / count line — spacing — design: press 6px held 8px count → implementation: press 8px held 6px count
2. friends-list.tsx:61 — Section head — margin-top phone — design: 26px → implementation: 24px (shipped)
3. social-modal.tsx:115 — Header row — gap — design: 4px → implementation: 12px
4. social-modal.tsx:115,127 — Header row — align-items — design: center → implementation: flex-start + h2 pt-10
5. social-modal.tsx:112,115 — Grab handle — margin below — design: 4px → implementation: 10px (pb 2 + pt 8)
6. social-modal.tsx:143 — Sheet — padding-bottom phone — design: 24px → implementation: 22px
7. add-friend-dialog.tsx:96 — QR wrap — margin-top phone — design: 4px → implementation: 2px
8. add-friend-dialog.tsx:115 — Share link — icon — design: 18×18 share icon → implementation: none
9. invite-qr.tsx:108, add-friend-dialog.tsx:106 — QR dark module — fill — design: `--bg` → implementation: `#0E0F14`
10. invite-sheet.tsx:160 — Card 1 QR icon — desktop size — design: 24×24 → implementation: 26×26
11. invite-new.tsx:172 — Send invitation (filled, phone) — margin-top — design: 12px → implementation: 8px
12. invite-new.tsx:176 — Send invitation (outlined, desktop) — font-weight — design: 600 → implementation: 500
13. invite-new.tsx:182 — Error line — phone position — design: under field, above Send → implementation: below Send
14. invite-new.tsx:134 — Invite someone else — padding — design: 0 2px → implementation: 0
15. invite-new.tsx:129 — Last-invite line — desktop padding-bottom — design: 10px → implementation: 12px
16. text-field.tsx:42 — Email field — placeholder color — design: `--fg-faint` → implementation: `--fg-placeholder`
17. invite-qr.tsx:76,92 — QR count sub — margin-bottom — design: 14px → implementation: 16px
18. invite-qr.tsx:115 — EXPIRED chip — phone padding — design: 0 16px → implementation: 0 14px
19. invite-qr.tsx:130 — Timer `small` — font-family — design: `--font-mono` → implementation: inherited sans
20. invite-qr.tsx:125-132 — Meta line — phone margin-top — design: 2px → implementation: 0
21. invite-qr.tsx:135 — Expired sentence — spacing above — design: 14px (gap + 4/6) → implementation: 12px
22. invite-qr.tsx:77 — Claimed `.sent` — border/radius/background — design: 1px `--border-strong`, 12px, `--surface` → implementation: none
23. invite-qr.tsx:79 — Claimed card back → title — spacing — design: 14px (mb 6 + gap 8) → implementation: 18px (gap 8 + mt 10)

## State reachability gaps
1. C4 — the page count line never returns to `N invites left` at the QR's expiry while the sheet is closed; no refresh is scheduled on `expiresAt` — friends-view.tsx:204,239-252
2. A5/C4 — path 2 passes `thisQr`, reading `held by this QR` off the QR's own screens, against the prop's documented use — invite-new.tsx:95

VERDICT: 23 visual gaps, 2 state gaps

## Resolution

Visual gaps:
1. FIXED — `friends-head.tsx`: with invites on and the hold line drawn, press → 6px → held → 8px → count (outer gap 6 only then; 8 otherwise).
2. FIXED (2026-10-17, reversing the earlier ruling: always match the mock) — `friends-list.tsx` section head margin-top phone 26. The invites handoff wins over `social-r1-pods.md`:258, and all four surfaces on the shell move together.
3. FIXED (2026-10-17, reversing the earlier ruling: always match the mock) — `social-modal.tsx` header gap 4. The invites handoff wins over `social-r1-pods.md`:258, and all four surfaces on the shell move together.
4. FIXED (2026-10-17, reversing the earlier ruling: always match the mock) — `social-modal.tsx` header `items-center`, the h2 `pt-10` dropped. The invites handoff wins over `social-r1-pods.md`:258, and all four surfaces on the shell move together.
5. FIXED (2026-10-17, reversing the earlier ruling: always match the mock) — `social-modal.tsx` handle `mb-4`, the header `pt-8` and the handle `pb-2` dropped (gap 4). The invites handoff wins over `social-r1-pods.md`:258, and all four surfaces on the shell move together.
6. FIXED (2026-10-17, reversing the earlier ruling: always match the mock) — `social-modal.tsx` phone body `pb-24`. The invites handoff wins over `social-r1-pods.md`:258, and all four surfaces on the shell move together.
7. FIXED (follow-up PR) — `add-friend-dialog.tsx`: QR wrap margin-top 4px at every width.
8. FIXED (follow-up PR) — Share link carries the 18×18 share icon, gap 8.
9. FIXED (follow-up PR) — both QRs fill the dark module with `--bg` (`fill-[color:var(--bg)]`); every theme's `--bg` is near-black, so the code stays scannable.
10. FIXED — card 1 QR icon 26×26 phone, 24×24 from `md`.
11. FIXED — Send invitation filled (and sending) margin-top 12px on phone; outlined and held stay 8px.
12. FIXED — Send invitation outlined `md:font-semibold`.
13. FIXED — error line sits inside the field row: phone order field, error, Send; desktop wraps it to its own line under the field+Send row (`md:basis-full`, row gap 0), above the hint.
14. FIXED — Invite someone else padding 0 2px.
15. FIXED — last-invite line `md:pb-[10px]`.
16. SETTLED — `text-field.tsx` keeps `--fg-placeholder` as shipped: its 4.5:1 contrast was ruled by Design in #1763.
17. FIXED — both QR count subs margin-bottom 14px.
18. FIXED — EXPIRED chip padding 0 16px phone, 0 14px desktop.
19. FIXED — timer `left` in `font-mono`.
20. FIXED — meta line `max-md:mt-[2px]`.
21. FIXED — expired sentence margin-top 14px at both widths (gap 10 + 4 phone, gap 8 + 6 desktop).
22. FIXED — claimed `.sent`: 1px solid `--border-strong`, radius 12px, `--surface`.
23. FIXED — card back margin-bottom 6px, title's mt-10 dropped (14px).

State gaps:
1. FIXED — `InviteCount.qrUntil` (latest `qrExpiresAt` among holding `qr_open` rows, null when none; `rules.ts`, tested in `rules.test.ts`); `friends-view.tsx` schedules `router.refresh()` at `qrUntil` + 500ms, read against `nowMs`, cleared on change and unmount (fake-timer test in `friends-view-invites.test.tsx`, confirmed failing with the refresh removed).
2. RULED (R4) — path 2 reads "held by this QR" by the plan's ruling; `InviteCountLine`'s `thisQr` doc now names the QR screen and path 2.
