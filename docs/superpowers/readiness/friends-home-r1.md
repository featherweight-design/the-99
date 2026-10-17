# Readiness audit · Friends on Home R1 (Social R3 addendum)

2026-10-16 · PR #1952 · handoff `design/design_handoff_the99_social_r3/addendum-friends-home/` (`README.md`,
`READINESS.md`, `STATES-friends-home.md`, `friends-home · copy strings.ts`, the `Home-*`, `Checklist-*` and `Themes-*`
boards) · source rulings `design/design_handoff_the99_discovery_onboarding/README-r3.md` (the permanent section, G25).

Audited independently of Design's `READINESS.md`, against the tree at `origin/main` ba4e13b8f, which is the handoff
branch's merge base, so nothing has landed since.

## Verdict: 🟡 Yellow

Every lock holds and every state the brief asks for is drawn at 390 and 1280, in all six themes. The first-run
checklist's Friends row is drawn: its position (last, unnumbered, under step 3) and its done state (C3, CP3). Five gaps
remain, all engineering's, and none needs another Design round. One of them corrects the handoff: its cache key
(G3) would serve a stale Friends section, and the resolution below replaces it. Nothing is open for Hugh. Build once
`/copy-review` has set the strings.

## Coverage against the locks

| Lock | Drawn | Note |
|---|---|---|
| A permanent section, no ✕ | H1–H4, P1–P4 | No ✕ at either width, no dismissal recorded. A section, not a card |
| No friends: invites you to add one | H1, P1 | Your seat, four dashed seats (`aria-hidden`), one line, Add a friend, no /friends link |
| Friends: faces, Add a friend, a /friends link | H2, H3, P2, P3 | Five slots across the width; `All friends ›` on the label's line |
| The checklist's Friends row (Discovery R3 G25): position | C1–C3, CP1–CP3 | Last, under step 3, unnumbered; the kicker stays `Step 1 of 3`; a wider gap above it |
| The checklist's Friends row: done | C3, CP3 | ✓ in `--success`, `Friends`, `You and Colin are friends.` or `You have 4 friends.`, up to three 26px faces; opens /friends; it stays done. A spent link returns it to C1 |
| Phone and desktop | Every state at both | 390 after Ready to build (R2b); 1280 under Commitments in the right column |
| All six themes | `Themes-*` boards | Low Sun, Neon Rain, Canopy, Oil Haze, Witching Hour, First Frost, at both widths, for the section and the row |
| State: none | H1, P1, C1, CP1 | |
| State: one | H2, P2, C3, CP3 | H2 and P2 also carry the arrivals banner above both columns |
| State: many (overflow) | H3, P3 | Seven friends: four faces and `+3`, a count, not a press |
| State: pending invite | H4, P4, C2, CP2 | `Friend link open · 6 days left · Show`; the next empty seat carries the diamond. Two or more links, and friends with a link, are described rules |
| Kept quiet: no stacked inline cards | All | No surface, border or shadow; Commitments stays the column's one card; no moment or bubble |
| Copy: US English, no em dashes | Copy file | No em dash and no British spelling in any string. All are placeholders for `/copy-review` |
| About entries paused | Stated deferral | No artboard and no `ABOUT_VERSION` bump; Friends already has its social-line entry |

The tour is unchanged (G1, closed by Design under Hugh's delegation): step 6 keeps its one light on the banner and
names no Friends row. That answers Discovery R3's G25 "second light" option with no.

## Code claims I checked

- **The surfaces.** `src/components/home/dashboard.tsx`, `first-run.tsx`, and `src/components/social/face.tsx`,
  `add-friend-dialog.tsx`, `open-links.tsx`, `friends-head.tsx` exist on main. `Face` and `AddFriendDialog` are
  exported. The dialog is the sheet on a phone, as the presses table says.
- **The right column.** `dashboard.tsx` renders the 316px column only when `props.commitments !== null` (line 221), so
  G7 is real: the column must render when either block does.
- **One block order.** The dashboard keeps one DOM order at every width and splits at 1180, so G8 is real: Friends
  sits in a different place at 390 than at 1280.
- **The checklist.** `FirstRunChecklist` draws step 1 live and steps 2 and 3 as `LockedStep`. The row's box is that
  box, live.
- **Reads.** `listFriends` (`src/lib/social/access.ts`) returns name, public id, `since` and the signature commander,
  sorted by name (`sortFriends`). `listOpenInvites` (`friends.ts`) returns the viewer's own open links, soonest to
  expire first. `loadFriendsAndLinks` reads both in one repeatable-read snapshot, which is what /friends uses so a
  redemption between the two reads cannot drop a link before its friend arrives.
- **The watch.** `useInviteWatch` (`use-invite-watch.ts`) exists.
- **Shipped copy reused.** `page.invitePending` (`Making a link…`), `page.accepted(name)`, `friends.openAria(name)`,
  `invites.left(ms)` (which returns `Under a day left` under 24 hours), `invites.show` and `invites.tooMany` are all
  in `src/lib/copy/social.ts`.
- **The cache.** Home's whole payload, first run included, is cached by `cachePageForUser(userId, "home", [date])`.
  The key carries no friend part today.
- **`friendGeneration` covers spare grantors only.** It hashes `spareGrantorsQuery`, which joins `pod_spare_shares`.
  It counts only friends who share spares through a pod the viewer is in. `social_profiles` carries no stamp
  trigger, and `friend_invites` has none either. `friend_links` does.

## Gaps, and engineering's resolution

1. **G3 is wrong as written: `friendGeneration` cannot key the Friends section.** Most of the section's drawn facts do
   not move it:
   - a friend who shares no spares renaming or changing their signature commander (the face and name under it);
   - a link made or revoked, since `friend_invites` has no stamp trigger;
   - a link expiring, since expiry is a time with no write.

   Only a friendship added or removed moves the viewer's own stamp, through `friend_links`.
   - **Resolution:** Friends and the checklist row are read outside `cachePageForUser`, through `loadFriendsAndLinks`
     (one snapshot, two indexed reads), beside the cached payload. This is the shape Rule 0's Home card takes (its
     readiness gap 1). `Dashboard` and `FirstRunChecklist` take `friends` and `openLinks` as props from the page, not
     from the payload. Time left is computed at render from `expiresAt` and the render's one `now`.
   - If `check:list-cache` flags the page for reaching `src/lib/social` without `friendGeneration`, the key also gains
     it. That costs one indexed read and keeps the guard's rule; it is not what keeps the section fresh.
   - With the switch off, neither read runs.
2. **G7, the right column.** It renders when Commitments or Friends does. When Commitments is absent, Friends sits at
   the top of the column.
3. **G8, one block in two orders.** Friends is drawn ONCE and placed by CSS `order` below 1180, after Ready to build
   and before the resume block, with its DOM position in the right column. Drawing it twice would mount two invite
   watches and two dialogs. Reading order for a screen reader follows the DOM at every width, which the dashboard's
   own comment already accepts for Commitments.
4. **G4, the invite-only round.** Add a friend opens whatever `AddFriendDialog` is when the build starts. Nothing here
   changes.
5. **Two handoff lines were stale, and are fixed on this branch.** README decision 4 said "three dashed seats" (R2.2
   made it four, beside your seat), and the copy file's section comment said "last at 390" (R2b moved it after Ready to
   build). STATES and the boards were already right.

## Decisions

- **The faces row's caps** follow R2.2: up to five faces, else four and `+N`. Decision 2's "four slots" is superseded,
  as the README marks.
- **The `+N` slot is not a press.** `All friends ›` is the one way to the rest.
- **Ten links open** keeps the press live and answers with the shipped `invites.tooMany` toast.

## Copy (to /copy-review, not to Hugh)

- Every string in `friends-home · copy strings.ts` is a placeholder.
- G5: the no-friends line's second sentence (`Seat them when you log a game, and see their spares when you shop.`)
  follows `SOCIAL_GAMES_ENABLED` and the spares switch. With either off, the clause that names it goes.
- The checklist body, `Any time, cards or not. A friend joins from a link you send.`, is checked against the
  invite-only round's wording.

## Agreement with the locks

- Permanent, no ✕, no dismissal stored; not a moment, no bubble, no motion.
- No new card on Home: Friends is a label, a row, a line and a press.
- The checklist row is drawn in position and in each state, and its done state persists until the checklist leaves.
- About: no entry and no `ABOUT_VERSION` bump, a stated deferral (entries paused for the Discovery line).
- Assets: nothing from `design/` is copied into `public/`. The fixture faces in `art/` are reference only.

## Before build

- `/copy-review` of `friends-home · copy strings.ts`, with G5.
- The plan names the uncached Friends read (gap 1), the column rule (gap 2) and the CSS-order placement (gap 3) as
  tasks.
