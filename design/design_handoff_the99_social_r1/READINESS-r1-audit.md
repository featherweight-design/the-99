# Readiness audit: Social R1 (friends and pods), design R2

Audited 2026-10-15 against `origin/main` (worktree rebased, head `654f71e18`), the brief on
`origin/brief/social-screens` (`docs/superpowers/design-briefs/2026-10-15-social-screens.md`), and the
shipped data layer in `src/lib/social/`. The handoff's own `READINESS.md` was read but not trusted: every
claim below was checked against the code or the boards.

## Verdict: 🟡 YELLOW, buildable after engineering-resolvable gaps

The handoff answers all six R1 open questions, and every ruling Q1 to Q16 holds where it applies to R1.
The one place it goes past the brief's privacy minimum is the signature commander. Hugh approved that,
but the approval is worded for "a friend read", and the boards also show the commander in two places
that are not friend reads: the open friend request card and pod seats. Engineering can settle both from
the boards and the brief without asking Design (see D1 and D2). Every gap is engineering's to resolve.
They fall into five groups: new reads and fields (open links, commanders, the next owner, member order,
friends since), a migration and a writer for the commander, the public route and the switch behavior for
signed-out readers, a QR encoder and the link's origin, and a few states drawn at one width only, mostly
desktop, where STATES says the desktop frame's rules apply. No Design call is open. Wording items are
listed separately for `/copy-review` and do not affect the verdict. As AGENTS.md allows for a multi-round
line, the About entry is batched at launch, but no R1 build plan exists yet to name that task (§6).

Where the boards disagree, R2 overrides R1 (README §R2). This audit holds R2 to the locks and uses R1 only
for frames R2 did not redraw.

---

## 1. Rulings Q1 to Q16 and the scope locks

| Ruling / lock | Holds? | Evidence |
|---|---|---|
| Q1 Link or QR only, no search, no short code | ✅ | No person search on any board. The empty state says `Nobody can find you by name.` (copy `friends.emptyBody`; R2 Friends F1, both widths). The only search field is the commander picker, which searches the card catalog, not players (R2 Friends F3). The schema matches: `friend_invites` is the only way to reach another account (`src/db/schema.ts:3290-3295`). |
| Q2 Single-use, 7 days | ✅ | `Works once · expires …` appears on every link (R2 Invite I1 to I3, P1 to P4). In code, `INVITE_TTL_MS` is 7 days (`rules.ts:9`), and `createInvite` makes a new token on every press (`friends.ts:54-70`). |
| Mutual friendship (two directed rows) | ✅ | One Accept, with no pending or one-way state drawn (R1 summary, "Friendship is mutual"). `befriendIn` writes both rows (`friends.ts:117-119`, `rules.ts:82`). |
| Q3 Spares shared per pod, no all-friends toggle | ✅ | There is one unticked checkbox per pod card, `Share my spares with this pod` (R2 Pods B, both widths), and no global control. `createPod` writes no share row (`pods.ts:23-31`), so a new pod starts unticked, as decision 14 says. |
| Spares view-only | ✅ | Only the grant is drawn. No spare line, ask, borrow or cart change appears (those are R2/out of scope). |
| Q4 Pods friends-only, no join code | ✅ | Add friends lists your friends only, with the sub-line `Only your friends can be added.` (R2 Pods `B · + Add friends`). `addMember` resolves the friend on the owner's own links and holds that friendship row (`pods.ts:60-80`). |
| Q5 Hand-on to the longest-standing member, last leave deletes | ✅ in design, ⚠️ in data | The leave confirm names the next owner, and the last leave reads `Leave and delete` (R1 Pods P7, P8, both widths). The code matches (`pods.ts:124-146`, `rules.ts:66-77`). But no read tells the client who the next owner is (gap E4). |
| Non-friend member after a hand-on shows by display name only | ✅ on the boards | `Rin` carries `not a friend` and initials, no art (`R2 - Pods.dc.html:230`, R1 Pods P5 at both widths). The data rule needs one fix (D2). |
| Client payloads carry `public_id` and display name only, never a Clerk id | ✅, widened | No board shows an email, an uploaded avatar or a Clerk id. Hugh approved the R2 widening (R2 summary, "One lock widens"): a friend read also returns the friend's chosen commander. The boards then use it in two places that are not friend reads (D1, D2). |
| Ended links name nobody | ✅ on the boards, ⚠️ in data | L1, L3 and L4 are face down with no name (R2 Landing, both widths). `readInvite` returns `inviterName` in every state (`friends.ts:107-113`), so the page must remove it before anything reaches the client (E6). |
| Silent removal; nothing notifies | ✅ | Every remove, leave, delete and decline confirm says nobody is told (copy `removeBody`, `leave*Body`, `delBody`, `declinedBody`). No badge on the menu row (Placement A, B). |
| No model calls | ✅ | The display name, pod name and commander are typed or picked and then drawn. The picker is a catalog read. None reaches a prompt. |
| Limits 30 / 40 / 10 / 7 | ✅ (one engineering note) | The fields are capped at 30 and 40, the 11th link is held (R1 Friends F8, both widths), and expiry shows on every link. These match `DISPLAY_NAME_MAX`, `POD_NAME_MAX` and `MAX_OPEN_INVITES` (`rules.ts:9-13`). One mismatch: an HTML `maxLength` counts UTF-16 units, while `cleanName` counts code points (`rules.ts:44-50`), so a field capped with `maxLength` refuses some valid names that contain emoji (E14). |
| Q6 Full deck lists | ✅ out of scope | Not drawn. |
| Q7, Q9 Wishlist | n/a | R2 of the line. |
| Q8 Purge everything | ✅ | The new `commander_oracle_id` sits on `social_profiles`, which `purgeSocialIn` already deletes (AGENTS.md, "Deleting an account"). |
| Q10 Saved commanders later | ✅ | The signature commander is a single face, not a shortlist, so it does not open Q10. |
| Q11, Q13, Q14 No borrowing, messages or trades | ✅ | None drawn. |
| Q12, Q15, Q16, deck swaps | n/a | Later rounds. |

**Contradictions found.** No screen breaks a ruling. These are the edges engineering must settle:

- **D1. The commander on the open friend request card.** The brief says the landing read returns the
  state, the inviter's name, `self` and `alreadyFriends`, and "nothing else is said about the inviter".
  R2 L2 draws the sender's commander art face up to someone who is not yet their friend. The widening's
  text names "a friend read" only, but Hugh approved the R2 boards, L2 included, and the card's own rules
  text (`openRules`) says both sides will see each other's commander. **Eng-resolvable:** build as drawn.
  Record in the plan's Settled section that the widening covers an OPEN link (and `self` and
  already-friends) and never an ended one.
- **D2. Commanders on pod seats.** G11 says "every friend and pod read in `src/lib/social/` returns" the
  commander. A pod member who is not your friend (after a hand-on) must stay name-only (brief, scope
  facts), and the board draws Rin with initials. **Eng-resolvable:** `listPods` returns a member's
  commander only when that member is the viewer or one of the viewer's friends, joined in the same
  statement.
- **D3. ✕ on a not-a-friend member removes with no confirm.** Decision 12 justifies the missing confirm by
  "adding them back is one press". That is false for a non-friend: the owner cannot re-add them (Q4).
  Nothing of theirs is lost, though: they lose a quick-pick seat and that pod's spares grant. **Eng-resolvable:**
  build as drawn and note it in Settled. It needs no Design round.

---

## 2. The brief's R1 open questions

| # | Question (brief §Open for Design) | Answer in the handoff | Status |
|---|---|---|---|
| 1 | "A sixth nav item (`Friends`)…? Or a section reached from the account menu? Or both? … Pods: their own page, or a block on the friends page?" | An account menu row placed second, under About; with Admin the order is About, Friends, Admin (Placement A, B). The sixth tab is drawn and rejected (Placement C). Pods are a section of `/friends` (decision 2). | Answered |
| 2 | "How the link and the QR are shown together. Copy and share … The list of your open invites, with revoke and the time left. What the 10-open limit looks like" | One press makes one link; the QR comes first, then the link with Copy, with Share leading on phone (decisions 3, 4; R2 Invite I1 to I5, P1 to P5). The open links list has Show and Revoke and the time left in days, then `Under a day left` (decision 5). At 10 the button is held with a reason line, and a race shows the `tooMany` toast (decision 6; R1 Friends F8). | Answered |
| 3 | "A signed-out arrival and its sign-in hand-off. Accept or decline, naming the inviter. Each ended state, plus your own link and already-friends." | One card per state, every state at both widths (R2 Landing L1 to L8, L2b). Signed out reads nothing and offers Sign in only (G3, ruled). Already friends spends the link (G4, ruled). | Answered |
| 4 | "Where it is set, and whether it is asked for at the first invite or join" | It is never asked for; it starts as the Clerk first name through `ensureProfile`. In R2 it is set only in the `/friends` head (decision 20; R2 Friends F6). | Answered (R2 supersedes R1's answer: `READINESS.md` "Open questions" item 4 still states R1's inline-everywhere answer) |
| 5 | "The confirm, and that it is silent." | The shared delete pane in the row's `…` menu, with a second sentence ending `isn't told` (decision 11; R1 Friends F6, both widths). | Answered |
| 6 | "Create and rename, adding members …, removing a member (owner), leaving, deleting (owner), and a hint about the hand-on. Also the per-pod 'share my spares' control: on the pod, in a settings block, or both." | Create and rename are inline; Add friends is a dialog or sheet; the owner's ✕ removes; leave and delete confirm, and the hand-on is named in the leave confirm. The spares control is on the pod card only (decisions 11 to 16; R1 Pods P1 to P11; R2 Pods B). | Answered |

The brief's open questions 7 to 10 belong to R2, R3 or neither, and are correctly out of scope.

---

## 3. States, phone and desktop

STATES-social-r1.md says: "where the phone board omits a frame, the desktop frame's rules hold unchanged."
That is a workable rule, so frames drawn at one width only are listed below as engineering gaps rather
than Design calls. Frame labels were read from each board's data (`label:` entries).

### Empty states (checked first)

| State | Desktop | Phone | Note |
|---|---|---|---|
| No friends yet | R2 F1 | R2 F1 | ✅ |
| No pods | R1 P1 | R1 P1, P1b | ✅ |
| No open links (section absent) | R1 F1 | R1 F1 | ✅ |
| No commander chosen (initials, dashed tile) | R2 F1 | R2 F1 | ✅ |
| A pod with only you | R1 P2 | R1 P2 | ✅ |
| Add friends: `Every friend is already in this pod.` / `No friends to add yet.` | R1 Pods P4 (in its note, not drawn as frames) | **not drawn** | E15 |
| Picker with no decks of your own (empty "From your decks" row) | **not drawn** | **not drawn** | E15: hide the row and open on search |
| Picker search with no results (`noResults` copy exists) | **not drawn** | **not drawn** | E15 |

### Loading and error states

| State | Desktop | Phone | Note |
|---|---|---|---|
| Making a link (`Making a link…`, held) | R2 I4 (R1 I5) | **not drawn** | E15 (desktop rule holds) |
| Link create failed (toast, Try again) | R2 I5 | R2 P5 | ✅ |
| Accept failed | R2 L8 | R2 L8 | ✅ |
| Decline failed (`declineFailed` copy) | not drawn | not drawn | Shared `ToastFrame`, same as L8. E15 |
| Name save, commander save, remove friend, pod write failed | not drawn | not drawn | Copy exists and the rule is the shared `ToastFrame` (decision 18). E15 |
| `tooMany` race toast | R2 Invite (desktop) | not drawn | Shared toast. E15 |
| `/friends` route loading | **not drawn** | **not drawn** | E16: the shipped `LoadingScreen` (`src/components/shell/loading-screen.tsx:20`) |
| `/friend/[token]` loading | **not drawn** | **not drawn** | E16: the same; the card arrives face down anyway |
| A page read fails (`listFriends`, `listPods` or `readInvite` throws) | **not drawn** | **not drawn** | E16: the app's error boundary |
| Picker search in flight | **not drawn** | **not drawn** | E16 |

### Everything else

| State | Desktop | Phone | Note |
|---|---|---|---|
| Placement row (switch on) | Placement A | Placement B | ✅ |
| Switch off | Placement D (one frame) | same | ✅ (a rule, not a layout). See E8 for signed-out readers. |
| One friend, arriving from Accept | R2 F4 | R1 F3 | ✅ |
| Many friends | R2 F5 | R2 F4 | ✅ |
| Changing your name | R2 F6 | R1 F5 (R1 layout) | ✅ with R2's words |
| Remove friend confirm | R1 F6 | R1 F6 | ✅ |
| After removing | R1 F7 | R1 F7 | ✅ |
| Ten links open | R1 F8 | R1 F8 | ✅ |
| Picker opened / searching | R2 F2, F3 | R2 F2, F3 | ✅ |
| New link / copied / show / share | R2 I1 to I3 | R2 P1 to P4 | ✅ (Share is phone only, by design) |
| Landing L1 to L8, L2b | R2 | R2 | ✅ every one at both widths |
| The flip and its reduced-motion cross-fade | R2 Landing foot | R2 Landing foot | ✅ |
| Pod you own / you're in / not a friend | R1 P3, P5; R2 Pods B | R1 P3, P5; R2 Pods B phone | ✅ |
| Owner's menu, rename, leave (hand-on), last leave, delete | R1 P6 to P10 (chip layout) | R1 P6 to P10 (chip layout) | ⚠️ Drawn only in R1's chip layout. R2's table (B) redraws none of them, and the menu and rename head sit on B's card header as they do on A's. E17 |
| New owner's view after a hand-on | R1 P11 | **not drawn** | E15 |

---

## 4. Components and tokens

| Named in the handoff | Exists? | Where |
|---|---|---|
| `DeleteConfirm` (shared delete pane) | ✅ | `src/components/ui/delete-confirm.tsx:16` |
| `folderCopy.del.cancel` (`Keep it`) | ✅ | `src/lib/copy/folders.ts:138` |
| `ToastFrame` | ✅ | `src/components/collection/edit-toast.tsx:95` |
| Account menu `MenuItems`, its `links` array and `refs` | ✅ | `src/components/shell/account-menu.tsx:68-92`. `refs` is hand-listed per Admin case (`:85-87`), so a third link means sizing it from `links`, as the handoff says. |
| Shelf `…` menu pattern | ✅ | `src/components/decks/shelf-menu.tsx` |
| Dialog shell (`useDialogA11y`) | ✅ | `src/lib/a11y/dialog.ts:518` |
| Bottom sheet (grabber, `anim-sheet-in`) | ✅ | `src/components/ui/sheet.tsx` |
| Signed-out landing ground and mark | ✅ | `src/app/page.tsx` |
| Catalog art crop for a commander (G12) | ✅ | `cards.art_crop_uri` (`src/db/schema.ts:62`) |
| `HydratedImg`, `LoadingScreen` (for E16) | ✅ | `src/components/ui/hydrated-art.tsx:135`, `src/components/shell/loading-screen.tsx:20` |
| Tokens `--success`, `--warning`, `--danger`, `--accent` | ✅ | `src/app/globals.css:71-94` and every theme block after it |
| `prefers-reduced-transparency` handling (G15) | ✅ pattern | `globals.css:1108`, `:1265` |
| **New (clearly marked):** the commander face (64, 40 and 26px, plus 116×84 seats), the commander picker, the friend request card with both faces and the flip, the pod table (B), the QR plate, the open links list, the receipt strip | New | Each is described in README decisions 21 to 24 and 3 to 5. |

The canvases use raw hex, not `var(--…)`. The only tokens named in prose are the four above, and all four
exist. No missing component or token.

---

## 5. Data contract

### Per screen

| Screen | Needs | Today | Gap |
|---|---|---|---|
| Menu row | Switch state | `socialFriendsEnabled(env)` (`src/lib/social/flag.ts:6`) | Add the row (E9) |
| `/friends` head | Your name, public id, your commander (oracle id, name, art crop) | `ensureProfile` returns `{ publicId, displayName }` (`friends.ts:25`) | Commander fields (E1) |
| Name edit | Write | `setDisplayName` → boolean (`friends.ts:35`) | Action wrapper; `false` means invalid, not done (E12) |
| Commander picker, deck row | Your decks' commanders, newest deck first, up to 8, a partner pair as two tiles | None | New read (E2). It reads `decks`, not social tables, so it may live outside `src/lib/social/` |
| Commander picker, search | The commander set `/commanders` lists, by name, with art | `nameSearch` (`src/lib/cards/name-search.ts:14`) is a building block | New search action (E2) |
| Commander write | Set or clear | None; no column | Migration and `setCommander` (E1) |
| Friends list | `publicId`, display name, `since`, commander name and art | `listFriends` → `{ publicId, displayName, since }` (`access.ts:34`) | Commander fields (E1) |
| Remove friend | Write | `unfriend(viewer, publicId)` → boolean (`friends.ts:175`) | Action wrapper |
| Receipt after Accept | The new friend's name on `/friends` | `redeemInvite` returns `friend: { publicId, displayName }` (`friends.ts:122`) | Carry `publicId` (never a name or Clerk id) to `/friends` and resolve it there (E10) |
| Open friend links | Token, `createdAt`, `expiresAt`, open only; the count for the hold at 10 | None | **`listOpenInvites`** (G1, E3) |
| Make, show, revoke a link | `createInvite` → `{ token, expiresAt }` or `tooMany`; `revokeInvite` | ✅ (`friends.ts:54`, `:73`) | Link origin (E7), QR encoder (E13) |
| Pods | Pods, members, owner, `isYou` | `listPods` → `Pod { id, name, isOwner, members[{ publicId, displayName, joinedAt, isOwner, isYou }] }` (`access.ts:54-104`), ordered by `joined_at` | Member order (G9, E4); commander for you and friends only (D2, E1); a not-a-friend flag (E4); next owner (E4) |
| Spares checkbox | Pods you share with | `sharedPodsQuery` (`spares.ts:157`) is a query builder only; `shareSparesWith` (`spares.ts:123`) | A small list wrapper (E5); `shareSparesWith(…, on)` returns `false` both for "not a member" and, when turning it off, for "already off" (E12) |
| Pod writes | Create, rename, delete, add, remove, leave | ✅ `pods.ts` | "Add 2 friends" is N `addMember` calls; needs a batch action or a stated partial-failure rule (E11). `leavePod` returns `LeaveOutcome` |
| Add friends list | Your friends not in the pod, with faces | `listFriends` minus the pod's members, on the client | Faces (E1) |
| Leave confirm | The next owner's name | `nextPodOwner` breaks ties by **user id** (`rules.ts:66-77`), which a client never holds | **`nextOwner { publicId, displayName }` per owned pod** (E4) |
| Landing | State, inviter name, `self`, `alreadyFriends`; for open, self and already-friends: inviter commander (D1); for already friends: `since` | `readInvite` → `{ state, inviterName, self, alreadyFriends }` or null (`friends.ts:82-114`), with `inviterName` in every state | Commander and `friendsSince` (E6); strip the name for ended states before the client (E6); public route (E8) |
| Accept / Decline | `redeemInvite` → ok with friend, or `notFound`, `ended`, `self`; `declineInvite` → boolean | ✅ (`friends.ts:130`, `:157`) | `declineInvite` `false` covers both "already ended" and "your own", so it must redraw from a fresh read, not report done (E12) |
| Already friends spends the link (G4) | Call `redeemInvite` | ✅ returns `alreadyFriends: true` | It is a write caused by a page view: do it once, from an action after mount or in a guarded server step, never in an RSC render that can run twice; and only when `state === "open"` (E6) |

### Fields no read returns today

- The viewer's, a friend's, a pod member's and an inviter's **commander** (oracle id, name, art crop). The
  schema has no column for it (G11).
- **Open invites** for the inviter (G1).
- **Next owner** of a pod the viewer owns. This cannot be computed safely on the client, because the
  tie-break uses Clerk ids.
- **Is this member my friend** on a pod member. Derivable by intersecting with `listFriends`, but a
  server flag is cleaner and keeps D2's rule in one statement.
- **Friends since** on the landing for already friends (`friend_links.created_at`).

Nothing a screen shows needs a Clerk id or another player's private data, given the fixes in D2 and E6.

---

## 6. The About entry

The handoff draws none and says the line batches it at launch (README "Out of scope"; R1 and R2
summaries). That is allowed for a multi-round line. Note, though, that the brief also says each entry
"is drawn on the per-entry artboard … in the round that designs its surface", which would put entry 1
(Friends and pods) in R1. README G10 also relies on "the R2 About entry" to explain what "spares" means.
No R1 build plan exists yet (`docs/superpowers/plans/` has no social plan), so nothing names the batched
task. **What is owed:** the R1 build plan must name About entry 1 as a batched task. That task is Design's
drawing on the `design_handoff_the99_about` artboard by the line's close (R3 at the latest), plus a
`SOCIAL_FRIENDS_ENABLED` entry in `AboutSwitch` / `SWITCHES` (`src/lib/about/visible.ts:35`, absent today).
This is tracking only and does not affect the verdict.

---

## Gap list

| # | Gap | Class |
|---|---|---|
| D1 | The open friend request shows the inviter's commander to someone not yet a friend. Hugh approved it on the boards; record that the widening covers open, self and already-friends links only | eng-resolvable |
| D2 | G11's "every pod read" must exclude a non-friend member's commander (name only, per the brief) | eng-resolvable |
| D3 | ✕ on a not-a-friend member cannot be undone by the owner, yet has no confirm; build as drawn and note it | eng-resolvable |
| E1 | Migration for a nullable `social_profiles.commander_oracle_id`; `setCommander`; the commander (oracle id, name, `art_crop_uri`) on the own-profile read, `listFriends`, `listPods` (self and friends), `readInvite` (G11, G12) | eng-resolvable |
| E2 | Picker reads: your decks' commanders (newest first, at most 8, partner pairs as two tiles) and a commander name search over `/commanders`' set with art (G13) | eng-resolvable |
| E3 | `listOpenInvites(viewer)`: token, `createdAt`, `expiresAt`, open only (G1) | eng-resolvable |
| E4 | `listPods`: member order owner, You, then by name (G9); an `isFriend` flag per member; `nextOwner` per owned pod (the tie-break uses Clerk ids) | eng-resolvable |
| E5 | A list wrapper over `sharedPodsQuery` for the per-pod checkbox state | eng-resolvable |
| E6 | Landing: remove `inviterName` (and the commander) server-side for every state but open, self and already-friends; check `state` before `alreadyFriends`; add `friendsSince`; G4's `redeemInvite` runs once and only on an open link, never in a render that can repeat | eng-resolvable |
| E7 | The link's origin comes from the request or config, not a hard-coded `the-99.dev` (G7) | eng-resolvable |
| E8 | `/friend/[token]` public in `src/proxy.ts`'s `isPublic` (`proxy.ts:41`), reading nothing signed out (G2, G14). Decide the signed-out card under per-reader switches: with production unset and a group override, a signed-out reader resolves to the environment and would see not found. Draw the signed-out card regardless of the switch (it reads nothing), and gate everything signed in by the reader's own switch | eng-resolvable |
| E9 | The account menu row: About, Friends, Admin; size `refs` from `links` (`account-menu.tsx:81-87`) | eng-resolvable |
| E10 | The Accept → `/friends` receipt carries the friend's `publicId` and is resolved through `listFriends` | eng-resolvable |
| E11 | "Add N friends" needs a batch action, or N `addMember` calls with a stated partial-failure rule | eng-resolvable |
| E12 | READINESS's "`false` treated as done" is too broad: `setDisplayName` (invalid), `addMember` (not owner, not friend), `shareSparesWith` on (not a member), `declineInvite` (ended or own) and `leavePod` (`notMember`) each need their own mapping. Only `revokeInvite`, `removeMember` and `deletePod` returning `false` can safely read as done | eng-resolvable |
| E13 | A client QR encoder (a new dependency, which runs the full CI suite), drawing from the token with no network call (G8) | eng-resolvable |
| E14 | Enforce the 30 and 40 caps by code points, as `cleanName` does, not by HTML `maxLength` (UTF-16 units) | eng-resolvable |
| E15 | Frames drawn at one width or not at all: phone `Making a link…`; phone P11 (new owner's view); the Add friends empties; picker with no decks; picker no results; decline, name, commander, remove and pod failure toasts; phone `tooMany`. Build each from the desktop frame's rules or the shared `ToastFrame` | eng-resolvable |
| E16 | Loading and error states not drawn: `/friends` and `/friend/[token]` loading, a failed page read, picker search in flight. Use `LoadingScreen` and the app's error boundary | eng-resolvable |
| E17 | Pods B (the table) redraws none of the owner's menu, rename, leave or delete states; build them on B's card header with R1's panes | eng-resolvable |
| E18 | Every action checks `SOCIAL_FRIENDS_ENABLED` via `requestSwitchEnv`; `/friends` and `/friend/[token]` call `notFound()` when it is off. The `src/lib/social` functions do not check the switch themselves | eng-resolvable |
| E19 | During a group-override rollout, a friend outside the group cannot accept a link (not found). This is a rollout note for the switch flip | eng-resolvable |
| A1 | About entry 1 must be named as a batched task in the R1 build plan (§6) | tracking (not a gap in the handoff) |
| G10 | No caption under the spares checkbox, "Hugh to confirm". Build as drawn | copy-review |
| C1 | `pods.leaveMemberBody` `Only {owner} can add you back.` is factually wrong after a hand-on: the owner can re-add you only if you are their friend | copy-review |
| C2 | `dialog.sub` `Whoever opens it first can accept` and `landing.selfBody` `for the first person who opens it`: opening does not spend a link; accepting or declining does (and so does a friend opening it, G4) | copy-review |
| C3 | Placement B's note still says `Invite a friend`, and README decisions 7 to 10 and READINESS's open-question list still use R1's `invite` wording and name-line placement; R2 (decisions 19, 20) supersedes them | copy-review |
| C4 | R1 call 10 says the new friend lands "at the top of the list", while decision 17 sorts by name. Sort by name | copy-review |

## New reads and actions the build needs

**Reads (all cross-user reads in `src/lib/social/`):**
- `listOpenInvites(viewer)` → `{ token, createdAt, expiresAt }[]`
- Own profile with commander (extend `ensureProfile` or a new `loadOwnProfile`) → `{ publicId, displayName, commander }`
- `listFriends` + `commander`
- `listPods` + member order, `isFriend`, `commander` (self and friends only), and `nextOwner` per owned pod
- `readInvite` + inviter `commander` and `friendsSince`, with the name stripped for ended states
- `listSharedPodIds(viewer)` over `sharedPodsQuery`
- Picker: `listOwnDeckCommanders(viewer)` (decks, at most 8) and `searchCommanders(q)` over the `/commanders` set (not social tables)

**Writes and actions (server actions, switch-checked):**
- New: a migration adding `social_profiles.commander_oracle_id`, and `setCommander(viewer, oracleId | null)`
- New: a batch `addMembers(viewer, podId, publicIds[])` (or a stated loop rule)
- Wrappers over the existing writes: `setDisplayName`, `createInvite`, `revokeInvite`, `redeemInvite` (including G4's spend on view), `declineInvite`, `unfriend`, `createPod`, `renamePod`, `deletePod`, `addMember`, `removeMember`, `leavePod`, `shareSparesWith`

**Plumbing:** `/friend/[token]` in `isPublic`; the account menu row; a QR encoder; the link origin.
