# Brief: Invite-only launch

2026-10-16. Hugh's decisions of 2026-10-16, relayed by the orchestrator (d9). This brief is the record: every item
under "Locked" is his and is not reopened by Design. It is a separate initiative from payments.

**What this brief asks.** How a new person reaches the app once nobody can sign up without an invitation: the Add a
friend dialog's two paths, the invite QR and the newcomer's screen, the invite count, the page an uninvited visitor
sees, and /admin's counts and tree. It proposes one Design round.

## The problem

Clerk's sign-up is open today, so anyone who finds a sign-up screen can make an account. The friend link's own landing
already calls the app invite-only, and offers a signed-out visitor only Sign in, with the line "No account? The 99 is
invite-only. Ask whoever sent this." (`src/lib/copy/social.ts`, `signedOutFine`). But nothing behind that sentence
exists: asking the sender for another friend link gets a newcomer nowhere. Hugh wants the app to grow only through the
people already in it, each account holding a number of invites he sets.

## What exists today, and stays

- **The friend link** (`src/lib/social/friends.ts`; Social R1, `design/design_handoff_the99_social_r1/`): a single-use
  token at `/friend/<token>`, valid for 7 days (`INVITE_TTL_MS`), at most 10 open per account (`MAX_OPEN_INVITES`),
  shown as a link and a QR in the Add a friend dialog (`src/components/social/add-friend-dialog.tsx`). `/friend/(.*)` is
  public in `src/proxy.ts`, because the person opening it may not be signed in yet. **It is unchanged**, and it stays
  the way two people who both have accounts become friends.
- **Group allowances in /admin**: `flag_groups.daily_allowance` (null for the default, else 1 to 1000, `ALLOWANCE_MAX`
  in `groups-rule.ts`), set per group through `src/lib/admin/group-writes.ts`. The invite count borrows its /admin
  CONTROLS, not its meaning: an allowance is a daily rate that refills on its own, and an invite count is a stock that
  only a new account spends and only Hugh refills.
- **The Clerk webhook** (`POST /api/clerk-webhook`), which today answers `user.deleted` with the account purge
  (`purgeAccount`). Forming the friendship on sign-up needs it to answer `user.created` too.
- **Request counting** (`src/lib/rate/`, `observeHit` behind `RATE_LIMIT_ENABLED`), observe-only today.

## Locked (do not reopen)

1. **The app is invite-only.** Hugh switches Clerk to restricted (invitation-only) sign-up mode, a dashboard setting.
   Nobody creates an account without an invitation.
2. **Invite counts.** Each account has a count of invites, which Hugh sets and refills in /admin, with controls in the
   shape of group allowances. It is a stock, not a daily rate: nothing refills it but Hugh. **An invite is spent ONLY when a new account is created.** Befriending someone who already has an account
   never costs one.
3. **The tree is recorded:** who invited whom, visible in /admin.
4. **Add a friend opens with two paths, and the SENDER chooses.** No email lookup ever tells the sender whether someone
   has an account.
   1. **"They're on The 99":** today's friend link and QR, unchanged. No email, no invite spent.
   2. **"Invite someone new":** shows **"N invites left"** up front, and is greyed out at 0 ("Out of invites"). Two ways:
      - **In person:** an invite QR, single-use, expiring in about 15 minutes. The new person scans it and types THEIR
        OWN email on their phone. Only then does the server create their Clerk invitation, and it takes them straight
        into sign-up. They finish as the sender's friend.
      - **Remotely:** the sender types the email, and Clerk emails the invitation.
5. **Defensive on enumeration** (Hugh: "worth our defensive posturing"). The new path ALWAYS answers **"Invitation
   sent"**. If the email already has an account, nothing is sent to it, and the invite stays reserved until the
   invitation's expiry (about 7 days), then returns to the sender. A sender who picked "new" for someone who already has
   an account is not told (Hugh: "That's on the user").
6. **Awareness.** The invite count shows in the Add a friend dialog and on `/friends`, so nobody sends an invite that
   cannot work.
7. **Uninvited visitors** see a small "invite only" page.
8. **The friendship is formed on sign-up**, for both ways of inviting.

## The invite's life

| State | What it means | The sender's count |
|---|---|---|
| Reserved | sent by email, or a QR redeemed with an email; held for about 7 days on the reservation's OWN clock | held, not yet spent |
| Spent | the invitee created their account; the friendship is formed | down by one |
| Returned | the reservation's 7 days passed with no account made, or the invitation was revoked | back |
| QR open | an invite QR shown, not yet scanned | open question for Hugh, below |
| QR expired | 15 minutes passed with no email typed | not held |

The count a reader sees is what they hold minus what is reserved. **A reservation keeps its own clock**, never Clerk's:
for an email that already has an account Clerk may create no invitation at all, and lock 5 still holds the invite for
the 7 days.

## Engineering notes

- **Clerk's invitations API.** Verify that an invitation can be created with `notify: false` and that the response
  carries the invitation's URL or ticket, so the QR path can take the newcomer straight into sign-up without an email.
  Verify what the API answers for an email that already has an account. The response the sender sees must be the same
  either way, in wording AND in time, or the timing tells them which it was.
- **The QR path must prove the newcomer owns the email.** An invitation's ticket is the credential Clerk normally
  delivers TO the invited mailbox, so its holder is trusted with that address. Handed straight to whoever typed an
  address, it would let someone register with another person's unused email. So the QR path verifies the mailbox
  before an account exists: either the sign-up it hands over to still requires the email's own code, or the server
  sends a code to the typed address and creates the invitation only once it comes back. Which of the two Clerk
  supports is engineering's to verify; either way the newcomer meets one more step (open question 3).
- **The reservation ledger is in the account purge.** A new per-user table fails `src/lib/account/purge.test.ts` until
  the purge handles it. The tree (who invited whom) needs its own rule there: purged with either account, or kept with
  the deleted side's id removed. That is engineering's call, and the purge coverage test enforces that it is made.
- **The rate limiter covers invite creation**, observe-only like the others until the logs say what a real reader
  does. The email path counts per sender, as every bucket does today (`observeHit(userId, bucket)`). The QR redemption
  has no player to count, since the person redeeming has no account, so it needs a key of its own: the token, or the
  sender it belongs to.
- **The friendship is formed on sign-up**, from `user.created` and the invitation it names, in the same transaction
  that spends the invite. A sign-up whose invitation is unknown forms no friendship and spends nothing.
- **The invite QR's page is public**, as `/friend/<token>` is: the person scanning it has no account. It refuses a
  token used once, expired or revoked, and takes nothing but an email.
- Accounts that exist on launch day keep working. They need no invitation.

## Open for Design to call

1. **The two-path chooser** at the top of Add a friend, as a dialog on desktop and a sheet on the phone, with the count
   in path 2, its 0 state ("Out of invites") and how each path's own screen follows.
2. **The invite QR's live and expired states:** the countdown, what an expired QR shows, and making a new one.
3. **The newcomer's scan-then-email screen:** one field, what it says about where the invitation goes, the step that
   proves they own the email (a code sent to it), the moment it hands over to sign-up, and a used or expired QR.
4. **The remote email form**, and its one answer, "Invitation sent", whatever happened.
5. **The count display** in the Add a friend dialog and on `/friends`, including at 0.
6. **The invite-only page** for an uninvited visitor. Whether it carries a waitlist that /admin can approve is for
   Design and Hugh to settle; **the recommendation is no waitlist at launch**.
7. **/admin's invite counts and tree view:** setting and refilling a count per account and per group, and the tree of
   who invited whom.
8. **A friend link opened by someone with no account.** The landing already offers only Sign in, and its fine line says
   "Ask whoever sent this". Under the new rules that line should send them back for an INVITE, not another friend
   link. The signed-out state is built inline in `src/app/friend/[token]/page.tsx`, using `LandingColumn` and
   `PRIMARY_BUTTON` from `friend-landing.tsx`; `FriendLanding` itself draws the signed-in states.
9. **The About entry**, on the per-entry template (`design/design_handoff_the99_about/`).

## Open for Hugh

- **Does an open invite QR hold an invite** before anyone scans it? Holding it stops a sender showing ten QRs on one
  invite; not holding it keeps a QR shown and never scanned from costing anything for 15 minutes. If it holds none, a QR can
  be redeemed after the sender's count reached 0, and that redemption needs an answer of its own.
- **A QR scanned by someone who already has an account.** Lock 5 says the new path always answers "Invitation sent",
  but here the person typing the email is in front of the sender. The recommendation is the same uniform answer, since
  the scanner could type anyone's email.

## Every state to draw

- **Add a friend, at 390 (sheet) and desktop (dialog):** the chooser; path 1 as today; path 2 with N invites, and at 0.
- **The invite QR:** live with its countdown, expired, and a new one made.
- **The newcomer's phone:** the email screen, the email's code (sent, entered, wrong, expired), the handover to sign-up, a QR already used or expired, and (if an open
  QR holds no invite) a QR redeemed after the sender's count reached 0.
- **The remote form:** empty, sending, and "Invitation sent".
- **`/friends`:** the count beside its own controls, with invites left and with none.
- **The invite-only page:** at both widths.
- **A friend link opened with no account.**
- **/admin:** an account's count set and refilled, a group's count, and the tree.

## Out of scope

- Payments and credits (a separate initiative).
- Changing the friend link, pods or spares.
- A waitlist at launch, unless Hugh decides otherwise (open question 6).
