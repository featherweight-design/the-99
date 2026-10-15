# Social R1 — friends and pods

**Round 1 of 3** of the social line, behind `SOCIAL_FRIENDS_ENABLED`. Phone and desktop.
**Brief:** `docs/superpowers/design-briefs/2026-10-15-social-screens.md`, branch `brief/social-screens` (not on `main`).
**Read for this round:** `src/lib/social/` (`friends.ts`, `access.ts`, `pods.ts`, `spares.ts`, `rules.ts`),
`src/components/shell/nav.tsx`, `account-menu.tsx`, `src/components/ui/delete-confirm.tsx`,
`src/components/decks/shelf-menu.tsx`, `src/lib/copy/folders.ts`, `src/components/collection/edit-toast.tsx`
(`ToastFrame`), `src/app/page.tsx` (signed-out landing), `src/proxy.ts`, `design/design_handoff_the99_deck_folders/`.

**The answer in one line.** Friends live in the account menu, not the nav: one new route, `/friends`, holds the name
friends see, your friends, your pods and your open invite links; a friend is added only by a single-use link or its QR
code, and the link's own page, `/invite/[token]`, answers every invite state in one card.

| File | What it is |
|---|---|
| `The 99 - Social R1 (R1).dc.html` | The calls, the locks and where each is honoured, the gaps. Start here. |
| `R1 - Placement.dc.html` | The account menu with its new row (popover, sheet), the rejected sixth tab, switch off. |
| `R1 - Friends-Desktop.dc.html` / `R1 - Friends-Phone.dc.html` | `/friends`: empty first, one friend, many, the name, remove, after remove, 10 open. |
| `R1 - Invite-Desktop.dc.html` / `R1 - Invite-Phone.dc.html` | The invite dialog / sheet: QR, link, copy, share, expiry, the name, pending, failure. |
| `R1 - Landing-Desktop.dc.html` / `R1 - Landing-Phone.dc.html` | `/invite/[token]`: signed out, open, expired, ended, your own, already friends, declined, failure. |
| `R1 - Pods-Desktop.dc.html` / `R1 - Pods-Phone.dc.html` | Pods: none, create, only you, owned, member, not-a-friend, add, menu, leave, last leave, delete, rename, hand-on. |
| `STATES-social-r1.md` | Every brief state for R1, both widths, and where it is drawn. |
| `READINESS.md` | Verdict, engineering needs, what to audit first. |
| `social-r1 · copy strings.ts` | Every new string, for `/copy-review`. |
| `brand/`, `support.js` | Carried so the folder opens standalone. Unmodified. |

Every board is drawn in the shipped shell (rail, mobile header, tab bar, account menu, dialog and sheet chrome, the
delete pane, `ToastFrame`) in the Kamigawa theme. Both routes are new, so only the menu row carries the dashed outline.
No About entry this round: the line batches them at launch.

## R2 (2026-10-15), after Hugh's audit

R2 overrides R1 where they differ. Boards: `The 99 - Social R1 (R2).dc.html` and `R2 - *.dc.html`.

**19. Friend links, not invites.** A link only adds an existing player as a friend, so the words never say invite: the
button and dialog say `Add a friend`, the list is `Open friend links` with `Friend link` rows, the landing's kicker is
`Friend request`, and the route is `/friend/[token]` (G14). The code's `invite` names can stay.

**20. Your name and commander are set in one place only**, the head of `/friends`. The name line is gone from the dialog,
the sheet and the landing card (Hugh: no alias system).

**21. A signature commander is each player's face.** Optional, chosen and never inferred. Press the face in the head
(or `Choose your commander` while it is unset). The picker is a dialog at desktop and a tall sheet at phone. It offers
your own decks' commanders first (newest deck first, up to eight), and typing searches every commander the catalog
knows, with colour pips. One press picks, saves and closes; `Use initials instead` clears it. While unset, a face is
initials, and nothing asks again.

**22. The face is drawn everywhere a person is**: head 64px, friend rows 40px with the commander's name under the
person's, chips 26px, the Add friends list, and the friend request card.

**23. The friend request is a card.** Face up only where R1 allowed the sender's name (open, already friends). It shows
the name bar with colour pips, the commander's art, a frame in its colour identity, the type line (`Friend request`,
or `Friend · since Oct 2`), the rule of friendship in the text box and an art credit. Face down (the 99's back)
everywhere else: signed out, expired (faded), used, revoked, not found, and after Decline, which flips it (180ms, none
under reduced motion). Your own link shows your own card. A sender with no commander gets initials in the art box and
a grey frame. The card is one image to assistive tech, labelled with name, commander and type line. The heading carries
the question.

**24. Pods: A or B, for Hugh.** A puts the face in front of each chip. B seats each member as an art tile with the
name under it, over a 30% blur of the same art; the owner's ✕ is a 28px disc on the seat; + Add friends is an empty
seat. A is the default if Hugh does not choose.

**25. Rulings.** The app stays invite-only (G3). Opening a friend link from someone already your friend spends it (G4):
the page calls `redeemInvite`, which already answers `alreadyFriends` and writes no new friendship.

---

## Decisions (R1)

**1. Friends sit in the account menu, as a link row second from the top. No sixth nav item.** Three reasons, any one
enough. The tab bar is five wide, and the nav's own comment records that a fifth item already takes Commanders to 9px;
six slots give 62.3px at 390, about 1px of air a side, and below 360 it does not fit (truncation is ruled out there,
`Commanders`/`Collection`). Friends are set up a few times and then left; the daily surfaces stay the five. And the
later rounds put social data where it is used (spare lines on deck rows in R2, seats in the log form in R3), so the
page is a place to manage, not to visit. The row is a real `<Link>` like About and Admin (new-tab on a modified press,
in the roving focus), with no badge: nothing in this round arrives unasked. On `/friends` no slot is current, as on
`/about`. Drawn and rejected: the sixth tab (Placement C).

**2. Pods are a section of `/friends`, not a page.** A pod is a name, a short list of chips and one checkbox. A page of
its own would hold one card. The section appears with the first friend or the first pod: a section for nothing is
furniture (deck folders decision 12).

**3. One press makes one link.** `Invite a friend` calls `createInvite` and opens the dialog on the new token. The link
is single-use, so a second press makes a second link; nothing is reused. While the call is out the button reads
`Making a link…`, holds its width and ignores a press, and the dialog opens only when the token is back, so a QR code is
never drawn for a link that does not exist.

**4. The dialog leads with the QR code.** The commonest case is a friend across the table pointing a phone at the screen.
Under it: the link in a read-only input and `Copy link` (`✓ Copied` for two seconds, read out by the status line). On a
phone `Share link` leads, through `navigator.share` with the link and one line of text; where there is no share sheet
the button is absent and Copy link takes the fill. The meta line states the two rules: `Works once · expires Thu,
Oct 22`. The QR plate is light in every theme (a camera wants dark on light), 29 modules, 6px desktop / 7px phone, 16px
quiet zone. Focus opens on ✕. Desktop is a modal on the shipped dialog shell; phone is the shipped bottom sheet.

**5. Open links are listed, and only open ones.** Under Pods: `Invite link`, `made today, 9:41 PM`, the time left
(`7 days left` down to `1 day left`, then `Under a day left` in `--warning`), `Show` (the same dialog on that link) and
`Revoke` (at once, no confirm: making another is one press; the row leaves). Used, declined, revoked and expired links
leave the list. A decline is never told to the inviter, so the list cannot draw it either, and that is why the four
ended states share one fate here.

**6. At 10 open the button is held**, `aria-disabled`, in place, with one line under it joined by `aria-describedby`:
`10 links open, the most at once. Revoke one, or wait for one to be used.` A second tab winning the race gets `tooMany`
from the server and the shared toast says so, with no retry.

**7. The landing is one card in every state, and only an open invite (and already friends) names the inviter.**
`readInvite` returns a state, the inviter's display name, `self` and `alreadyFriends`. An ended link names nobody, so a
forwarded or guessed link learns nothing; a bad token (`null`) reads exactly as a used one, as `friends.ts` intends.
Expired keeps its own line because "ask for a new one" is the plain remedy. Redeemed, declined, revoked and not found
are one card: `This invite link no longer works`. Your own link offers `Copy link` (the likeliest reason to open it is to
check it) and no Accept or Decline. Already friends offers no Accept, and opening it spends the link (Hugh, G4). Every ended card has one way on.

**8. Signed out, the landing reads nothing and offers Sign in only.** The route must be public in `src/proxy.ts` (G2) to
draw it; otherwise `auth.protect()` sends the reader straight to Clerk with no idea why. It uses the signed-out
landing's ground and mark, says `Someone sent you a friend invite`, and hands off to Clerk's sign-in with this URL as its
redirect. No `Create an account`: the app is invite-only (`Invite-only · access by request` on `/`), and a friend
invite is not an app invite (G3).

**9. Accept lands on `/friends`, Decline stays on the card.** After Accept: a one-line receipt (`You and Dave are
friends.`, `role="status"`, bare ✕) and the friend's row reading `since today` in `--success`. The inviter gets no
receipt: the friendship is news to the one who accepted. After Decline: `Invite declined` / `Dave isn't told. The link no
longer works.` and `Go to Home`. A redeem that answers `ended` (spent between read and press) is not an error: the card
redraws as ended. A thrown redeem is the shared toast with `Try again`.

**10. The display name is never asked for.** `ensureProfile` starts it as the Clerk first name. It is changed inline
wherever someone is about to see it: the page head (`Friends see you as Hugh · Change`), the invite dialog (`They'll see
you as Hugh`), and the landing's open card (`Dave will see you as Hugh`). Same field and rules as the deck rename:
blur commits, never an invalid value; empty or unchanged reverts; `maxLength` 30, so the length refusal is unreachable.

**11. Remove, leave and delete confirm in the shared delete pane, inside the row's … menu**, exactly as folders do
(`DeleteConfirm`, `Keep it` first and focused, the confirm in `--danger`). Each second sentence says what happens and
that nobody is told:
- Remove friend: `Dave leaves the pods you own, and you leave Dave's. Dave isn't told.` (what `unfriend` does; pods a
  third friend owns are untouched).
- Leave, as owner: `It passes to Dave, its longest-standing member. Nobody is told.` This is the hand-on hint, placed
  where it matters, naming `nextPodOwner`'s answer.
- Leave, as member: `Only Marcus can add you back. Nobody is told.`
- Leave, as last member: `You're its last member, so leaving deletes it.`, confirm `Leave and delete`.
- Delete pod: `No friendship changes, and nobody is told.` (Not "its members stay your friends": after a hand-on
  some never were.)

**12. Removing a member from your pod is a bare ✕ on their chip, with no confirm.** They are your friend, so adding them
back is one press; the chip leaving is the receipt. A member removed is not told.

**13. A member who is not your friend is a name and a faint `not a friend`, with nothing to press** (unless you own the
pod, where ✕ still removes them). A pod grants no visibility by itself, and the chip says exactly that much.

**14. Sharing spares is one checkbox on each pod card**, `Share my spares with this pod`, unticked by default
(`shareSparesWith`). Never a global toggle (Q3) and never a settings block: the choice sits on the thing it is about. It
is each reader's own grant, so owner and members each have one and none sees another's. A new pod, and a pod you are
added to, start unticked.

**15. Add friends lists only your friends who are not already in the pod**, nothing ticked, the button held at zero and
naming the count (`Add 2 friends`). Dialog at desktop, sheet with a pinned foot at phone. Its two empties:
`Every friend is already in this pod.` and `No friends to add yet. Invite one first.` with Invite a friend.

**16. Create and rename are inline.** New pod opens a field at the top of the section; Create is disabled while empty
and needs no sentence; `maxLength` 40. Pod names carry no unique index, so there is no duplicate refusal to draw. Create
lands the new card with one chip (You), + Add friends, and `Just you so far. Add friends to play with.` Rename turns the
card head into the field.

**17. Lists sort by name.** Friends, pods and pod members (owner first, then You, then by name). A creation order would
move a list under the reader each time one is added, the folders reasoning.

**18. Failures are the shared `ToastFrame`, `role="alert"`.** Making a link, accepting, declining, saving the name,
removing, every pod write. `false` from a write that is already done (a double submit) is done, never an error.

---

## Gaps

| # | Gap | Who |
|---|---|---|
| G1 | No read lists your open invites. `/friends` needs `listOpenInvites(viewer)`: token, `createdAt`, `expiresAt`, open only. | Eng |
| G2 | `/invite/[token]` must join `isPublic` in `src/proxy.ts` to draw the signed-out card; it must read nothing without a session. | Eng |
| G3 | Ruled (Hugh, 2026-10-15): the app stays invite-only. A friend invite cannot create an account, and the signed-out card says so. An invite for trusted new players is out of scope. | Closed |
| G4 | Ruled (Hugh, 2026-10-15): an already-friends open spends the link. When `readInvite` says `alreadyFriends`, the page calls `redeemInvite`, which already returns `alreadyFriends: true` and writes no new friendship; the link leaves the inviter's list. | Eng |
| G5 | A brand-new account (no cards) has the first-run lock. `/friends` and `/invite` are not nav items, so the lock does not touch them; drawn as such. | Note |
| G6 | All names, pods and dates are placeholders. Staging holds zero social rows (2026-10-15). | Note |
| G7 | The link's host (`the-99.dev`) is read from docs, not config. | Eng |
| G8 | QR generation needs a library or a small encoder; the boards draw a stand-in matrix. No network call: the code is drawn on the client from the token. | Eng |
| G9 | The member order (owner, You, then by name) needs `listPods` to return members in that order or the client to sort. | Eng |
| G11 | `social_profiles` needs a nullable `commander_oracle_id`, a writer (`setCommander`), and every friend and pod read in `src/lib/social/` to return it. The purge already deletes the profile. | Eng |
| G12 | Face art is the catalog's representative printing's art crop for that oracle id. No printing choice this round. | Eng |
| G13 | The picker searches the commander set `/commanders` lists; its deck row reads the viewer's own decks' commanders, newest first, up to eight, a partner pair as two tiles. | Eng |
| G14 | The route moves from `/invite/[token]` to `/friend/[token]`; G2 applies to the new path. | Eng |
| G15 | Option B's blur is a CSS filter over the seats' own images (no extra request), dropped under reduced transparency. | Eng |
| G10 | No caption under the spares checkbox, by Hugh's minimal-controls preference. The empty Pods sentence and the R2 About entry carry what "spares" means. | Hugh |

## Out of scope, unchanged from the brief

Wishlists and every spare line (R2). Opponent seats and matchups (R3), including how a removed friend reads in an old
game row. Q6 full deck lists, an "ask" for a spare, game sharing (Q16), deck swaps. About entries (batched at launch).
