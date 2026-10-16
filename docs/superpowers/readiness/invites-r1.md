# READINESS audit: Invites, the invite-only launch (R1)

Audited 2026-10-16 against `docs/superpowers/design-briefs/2026-10-16-invite-only-launch.md` (#1918), the code at
`origin/main` (8cd316847), and Clerk's own documentation for restricted mode and invitations.
Build from `design/design_handoff_the99_invites/` (`The 99 - Invites R1 (R1).dc.html` first).

## Verdict: YELLOW

Every one of the brief's eight locks, both open questions for Hugh (ruled 2026-10-16) and every state the brief lists
is drawn, at 390 and at desktop wherever the surface has both (the newcomer's page is a phone surface by its nature).
Nothing forces an engineering impossibility with Clerk's restricted mode. The gaps below are engineering's to close in
the plan, with one exception that needs Hugh: the newcomer's email code needs a way to send it (G-1).

**The About entry stays parked.** `The 99 - About · Invites Entry.dc.html` and `about · invites.ts` are reference only:
About entries are paused until the About redesign is done, so the plan ships no entry, no `friends` caption edit and no
`ABOUT_VERSION` bump for this line. Not a finding.

## What was checked

| Brief | Drawn | Holds |
|---|---|---|
| Lock 1, Clerk restricted | Invite-Only I1 to I3 | Yes (route: G-6) |
| Lock 2, a stock Hugh sets, spent only by a new account | Admin M2, M3; every count line | Yes |
| Lock 3, the tree | Admin M4 (desktop and phone) | Yes |
| Lock 4, two paths, sender chooses, no lookup | Add A1 to A5, D1 to D4 | Yes; path 1 is the shipped sheet |
| Lock 5, always "Invitation sent" | Email E4, E5; QR Q3; Newcomer N9 (ruled A) | Yes (G-3, G-13) |
| Lock 6, the count in Add a friend and on /friends | Chooser card 2, path 2 sub, Friends C1 to C6 | Yes (G-2) |
| Lock 7, a small invite-only page | Invite-Only I1, I2 | Yes, no waitlist (ruled C) |
| Lock 8, friends on sign-up | Newcomer N8 | Yes (G-4) |
| Open for Hugh: does an open QR hold an invite | Q1, Q4, C4 | Ruled: holds, released at expiry |
| Open for Hugh: a QR scanned by an existing account | N9 | Ruled: Option A, after the proven code only |

States: loading (A3, E3, N2), error (E1, E6; the QR's create failure reuses the shipped ToastFrame), expired QR (Q4,
N11), used, revoked or not found (N12), out of invites (A2, D2, C2, C5), existing email (E4 uniform, N9), and every
code state (N3 sent, N4 wrong, N5 expired, too many tries to N12). Missing only the newcomer's transport failures
(G-7).

**Code claims, each checked against the tree and correct:** `INVITE_TTL_MS` 7 days and `MAX_OPEN_INVITES` 10
(`src/lib/social/client-rules.ts:49`); `socialCopy.landing.signedOutFine`, `page.invitePending`, `page.accepted` and
`landing.brand` as quoted (`src/lib/copy/social.ts`); `LandingColumn` and `PRIMARY_BUTTON` in
`src/components/social/friend-landing.tsx`; /admin has five tabs today, so Invites is the sixth
(`src/components/admin/admin-head.tsx:17`); the Clerk webhook answers only `user.deleted`
(`src/app/api/clerk-webhook/route.ts:31`); `ALLOWANCE_MAX` is 1000; `/friend/(.*)` is public in `src/proxy.ts:45`.

**Copy:** every string in `invites · copy strings.ts` is the one drawn (only the aria label, the plural "1 invite
left", the uninterpolated waiting example and the undrawn toast are absent from the boards, as expected). No "tick";
the copy is US English (the README's "grey" and "behaviour" are handoff prose, never shipped). The new strings and the
changed `signedOutFine` go to /copy-review in the build, as the handoff says.

## What Clerk does, verified

- **Restricted mode** (Dashboard: Invite-only) lets an account in only by invitation, enterprise connection or manual
  creation. The allowlist does not apply in it. Clerk's hosted sign-in hides its sign-up prompt, and its hosted
  sign-up shows Clerk's own "you need an invitation" message to a visitor with no ticket.
- **`createInvitation`** takes `notify` (default true), `expiresInDays` (default 30), `redirectUrl`, `publicMetadata`
  and `ignoreExisting`. The returned Invitation carries `url`, the link that accepts it, so the QR path can hand the
  newcomer straight to sign-up with no Clerk email. Without `ignoreExisting`, an address that already has an account
  OR a pending invitation is refused with an error.
- **Accepting an invitation verifies the email automatically.** That is why Clerk's own code cannot be the newcomer's
  proof (G-1), and why the drawn "email locked" sign-up holds.
- `publicMetadata` carries over to the new user's public metadata, which `user.created` delivers (G-4).

## Gaps, and how engineering closes them

**G-1. The newcomer's 6-digit code needs a sender (Hugh).** The app sends no email of its own (no provider in
`package.json`), Clerk has no API that mails a code to an arbitrary address, and Clerk's ticket sign-up skips its own
code. Resolution: add a transactional email provider (Resend or similar, free tier) for this one message; the code is
ours, as README G2 allows. Needs Hugh to approve the vendor and set up its sending domain. The only alternative that
needs nothing new is to have Clerk email the invitation at Send code and let the newcomer open it from their inbox,
which replaces N3 to N6 and would go back to Design.

**G-2. Out of invites while a QR is live.** With one invite held by a live QR the sender holds 0, so card 2 greys
(A2), and they can no longer re-show their own QR (C4's route). Resolution: card 2 is out only at 0 with no live QR.
With a live QR it opens path 2 with the email half held as in E5, Show an invite QR re-shows the live one, and the
line reads `Out of invites · 1 held by this QR`.

**G-3. An address Clerk refuses.** The email path creates the invitation without `ignoreExisting`; any refusal (an
account, or someone else's pending invitation) is caught, recorded as a reservation and answered exactly as a success,
behind the same server floor (G-13). The QR path, after the proven code, looks the address up server-side: an account
goes to N9; otherwise it creates with `notify: false` and `ignoreExisting: true`, so another sender's pending
invitation never blocks the person standing at the table. Whichever ticket is used spends its own reservation and
makes that friendship; any other reservation for the address returns at its 7 days.

**G-4. Tying a sign-up to its invite.** Every invitation carries `publicMetadata.inviteReservation` (our id). The
webhook's `user.created` reads it and, in one transaction, spends that reservation, records the tree edge and forms
the friendship; an unknown or missing id spends nothing and forms nothing. Ops: subscribe `user.created` on both Clerk
instances' webhook endpoints.

**G-5. Where the ticket lands.** Keep Clerk's hosted sign-up for invitations (the app loads none of Clerk's UI,
`src/app/clerk-hosted.test.ts`, so a ticket sent to an in-app page would need a custom sign-up flow). Set the
after-sign-up redirect to `/friends` (ruling D). Clerk's own sign-up path is never repointed.

**G-6. The invite-only page's route.** The app has no sign-up route today. Resolution: the page ships at a public
`/sign-up` (added to `isPublic`), signed in redirects Home. The I3 trigger "Sign up inside Clerk's sign-in" does not
arise: restricted mode hides that prompt. Clerk's hosted sign-up keeps its own message for a ticketless visitor.

**G-7. The newcomer's transport failures are not drawn** (Send code, Confirm, Continue to sign-up). Resolution: the
shipped ToastFrame with Try again, as E6, the field keeping its text; one new string to /copy-review.

**G-8. A claim that is never finished.** The reservation's 7-day clock starts at Send code, whatever follows, so the
sender's count moves identically for every address. Use a different email stays on the same claim. A claim whose code
was proven is bound to the newcomer's browser, and reopening `/join/[token]` there within the 7 days re-shows N6, so a
closed tab does not strand them.

**G-9. Purge and tree** (README G6). Reservations are purged with the sender, and the purge revokes their pending
Clerk invitations. A typed address is erased when its reservation resolves (spent, returned or revoked), so /admin
lists only waiting ones. A tree edge is kept with the deleted side's id nulled and drawn as a deleted account, with
its reason in `purge.test.ts`.

**G-10. The switch** (README G4). `SOCIAL_INVITES_ENABLED`, needing `SOCIAL_FRIENDS_ENABLED`; off, Add a friend is as
shipped. An account with friends off cannot invite (it has no /friends). Hugh flips Clerk's production instance to
restricted mode once the switch is on in production.

**G-11. Starting counts.** A new account starts at 0, as drawn (Out of invites). Accounts from before launch are the
tree's founders and also start at 0; Hugh sets them with M2 or a group's Top up.

**G-12. The code's rules** (README G2): 6 digits, stored hashed, 10 minutes, a 60-second resend cooldown, 5 wrong tries
per claim then N12.

**G-13. Equal time** (README G1). A server floor on every send, the same whatever Clerk answered. The sender's QR sheet
turns at Send code through the shipped invite watch (`src/components/social/use-invite-watch.ts`).

**G-14. Rate buckets** (README G7), observe-only: `invite-email` per sender; `invite-claim` and `invite-code` keyed by
the token's sender.

**G-15. Google on a ticket.** Clerk's hosted sign-up offers Google (N7's note). Verify on staging that a ticket
sign-up through Google ends on the invited address; either way the webhook spends the reservation the ticket names.

**G-16. Revoke in /admin** calls Clerk's `revokeInvitation`, returns the invite at once and writes a history line.

**G-17. Ten friend links open no longer greys Add a friend** (C6). A deliberate change to shipped behavior, drawn and
approved; build it.

## Needs Hugh

- **G-1:** approve an email sender for the newcomer's code, and set up its domain. Everything else above is decided.
