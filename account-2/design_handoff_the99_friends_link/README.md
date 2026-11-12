# The 99 — Friend links · R1 · for Hugh's audit

Account 2, 2026-11-12. Brief: Hugh's prompt of 2026-11-12 (a stateful round on adding friends). Sources of truth:
`design/design_handoff_the99_invites/` and `design/design_handoff_the99_social_r1/`. Phone 390 and desktop 1300.

**Status: R1, approved by Hugh, 2026-11-12** (“this all LGTM”), with the design's recommendations on Q1 to Q3 standing.

> **Before implementing: this handoff gets a copy review / prose pass** (`/copy-review`) on every string in
> `friends-link · copy strings.ts` and on the boards. The words drawn here are Design's drafts, not final copy (Hugh, 2026-11-12).

 Canvas: “The 99 · Friend Links R1” (account 2,
https://claude.ai/artifact/3ypm1Cmsu1QGVPdKHS8GXy). The boards here are its export with `art/` paths.

Every frame is a PNG of the **shipped** shell (`NavRail`, `MobileHeader`, `TabBar`) and the **shipped** `/friends`
(`FriendsView`, `WaitingOnYou`, `SocialModal`, `FriendCard`, `LandingColumn`) server-rendered with the shipped CSS
(Low Sun), with this round's proposal applied as code (`scratch-gen/friend-links.diff`). Fixtures: you are Wren
Calloway; Colin, Peter, Max and Chris are friends and requesters (Chris has no signature card).

## The answer in one line

Add a friend opens on one screen holding your own reusable link, its QR and a short code, with a box to type a
friend's code; opening a link or typing a code sends a request that waits in **Waiting on you** with Accept and
Decline; reset confirms in place; the invite count moves into the sheet as what the link does for someone new.

## Hugh's rulings (locked) and where each holds

| Ruling | Where |
|---|---|
| 1 A personal link, QR and short code, all reusable, replacing the single-use link | Add A1, D-A1: one screen; chooser, invite QR, Open friend links and the 10-link hold retire. |
| 2 Opening the link or entering the code sends a request; owner accepts or declines; nothing shared before | Landing L1 (sent on open), Add A5 (sent by code), Friends F1 to F4 (answered). |
| 3 Reset retires the old link and code | Reset R1 to R3; the old link lands on L7. |
| 4 Existing players free; a newcomer through the link uses one of the sender's invites; out of invites the link says so | Add A1/A2 (the invites line), Signed-out S1/S2, S3. |
| 5 Handles after launch: room, nothing drawn | The `Have a friend’s code?` section is where handle search joins. |

## Decisions (Design's calls, the brief's Open list)

1. **Where requests live.** In the shipped **Waiting on you**, the first section under the head. A request row is the
   spare request's row: the requester's face (46px, art or initials), kicker `FRIEND REQUEST` with the unseen diamond
   and age, title `Colin wants to be friends`, detail `Opened your friend link.` / `Entered your code.` + `Nothing is
   shared until you accept.`, then **Accept** and **Decline** (the spare row's `row` presses). No ✕: Decline is the
   way to clear one. Requests first (newest first), then spare requests, then trade matches; Show all past five, as shipped.
2. **The count on Friends** is the shipped bar badge (tab bar and rail): requests count in its waiting half
   (`friendsWaiting`), so the badge stays until each is answered, like a spare request. The head reads `Waiting on you · N`.
3. **Accept or decline** turns the row into the visit's receipt in place (F4): `FRIENDS` on the success wash, `You and
   Colin are friends.`; or `DECLINED`, `Chris isn’t told.` Accept adds the friend to the list at once.
4. **How the code is entered.** In Add a friend, under your own link: `Have a friend’s code?`, the join flow's boxes
   at six (letters and digits, a gap after three), **Send request** on at six. The answer replaces the boxes (A5 sent,
   A8 already friends, A9 both asked → friends, A6 not a code, A7 your own code). Enter another code brings them back.
5. **The reset confirmation** is in place, in the sheet: `Reset link and code` (quiet, underlined) turns into a box
   under the dimmed link: `Reset your link and code?` + what stops and what stays, **Reset link and code** (danger) and
   **Keep them**. Done: new plate, link and code, `✓ New link and code. The old ones no longer work.`
6. **Out of invites, without the contradiction.** The count line leaves the head: Add a friend is always live and free
   between players. The count sits in the sheet under the link, as what the link does for someone new:
   `Someone new to The 99 joins with one of your invites · 3 invites left`; at 0 `Out of invites: players on The 99 can
   still add you, but someone new can’t join through it yet.` The email row reads Out of invites.
7. **The friend's landing, signed in.** Opening sends the request; the owner's card turns face up with type line
   `Friend request · sent`, column `Request sent to Wren Calloway`, Go to Friends, quiet Withdraw request (L1).
   Opened again: same screen with the sent date (L2). Withdrawn: card turns down, Send it again (L3). The owner had
   asked you: opening answers it, friends (L4). Already friends (L5), your own link (L6), reset or unknown → the
   shipped ended card naming nobody (L7).
8. **Signed out.** The card is face up on the owner (Q2). **Join The 99** runs the shipped newcomer flow on the
   owner's invite; **Sign in** returns signed in, which sends the request. Out of invites: Sign in alone, and the fine
   line says why (S2). The newcomer lands on Friends with `Your friend request went to Wren Calloway.` (S3, Q1).
9. **Which name the header avatar shows.** One source: the face Home and the Friends head draw. The header button
   (and the rail's) holds the signature card's art in its accent frame, else the display name's initials; the menu's
   head names the display name. Clerk's name and email stop feeding it, so `A`, `PL` and `Player` can't disagree.
10. **Copy.** Every user-facing instruction says Select, never Press. The Friends empty body's first sentence changes
    to name the link and code.

## For Hugh (recommendations approved 2026-11-12)

- **Q1 · A newcomer through the link: request, or friends at once?** Invites R1 lock 8 made them friends on sign-up;
  ruling 2 says nothing is shared before an accept. **Drawn and recommended: a request** (S3); their invite is still used.
- **Q2 · Does the signed-out page name the owner?** Shipped single-use links name nobody signed out. A newcomer needs
  to know whose invite it is; a link that travelled too far is reset. **Drawn and recommended: named.**
- **Q3 · Keep Invite someone new by email?** **Drawn and recommended: keep it**, one row at the sheet's foot that opens
  the shipped email path.

## Gaps for engineering

- **G1 The code is static and unique (Hugh, 2026-11-12).** Minted once per player, unique across every player, and it
  never changes on its own: not per open, not per session, not on a schedule. Only the player's own Reset (ruling 3)
  replaces it, and the old code is then never reissued. Six characters without 0, O, 1, I, L; read without case; the
  link's token follows the same rule. A cap on wrong codes per account per hour.
- **G2 What counts as opening.** Only a signed-in page view sends. Link previews, prefetches and unfurl bots must not.
  One waiting request per pair; opening again sends no new notice.
- **G3 Decline is silent.** A declined player reopening sees Request sent; suggest no new notice to the owner for 30 days.
- **G4 Withdraw** deletes the waiting request; the owner is never told.
- **G5 Reset** rotates token and code together; waiting requests stay; the old token reads as ended.
- **G6 Invites at Join.** Hold one of the owner's invites from Join's Send code (as the invite QR held one); spent
  when the account is made.
- **G7 Retiring single-use links.** Links already open keep working, single-use, until they expire; then Open friend
  links, the chooser, the invite QR and `MAX_OPEN_INVITES` go.
- **G8 The badge.** Waiting friend requests join `waitingAsksCount`.
- **G9 The avatar.** The shell reads the display name and signature card for the header.
- **G10 A switch.** A regression is plausible (every add-a-friend path changes): one switch.

## Files

`INDEX.md` lists every board. `STATES-friends-link-r1.md` is the matrix. `friends-link · copy strings.ts` holds
every new string for /copy-review. `scratch-gen/` rebuilds every frame (see its README).
