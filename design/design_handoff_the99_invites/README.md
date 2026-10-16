# The 99 — Invites (invite-only launch) · R1 · approved by Hugh, 2026-10-16

Account 1, 2026-10-16. Brief: `docs/superpowers/design-briefs/2026-10-16-invite-only-launch.md` (main).
A stateful addendum to Social R1: Add a friend gains a second path, accounts hold an invite count, uninvited
visitors meet an invite-only page, /admin sets counts and shows the tree. Phone 390 and desktop 1300.

**Status: R1, approved by Hugh, 2026-10-16** (“This all LGTM”), with the design's recommendations taken on all
four For Hugh questions, and card 2's graphic settled as the card fan (option A on `R1 - Glyph-Options.dc.html`).
The canvas lives in account 1 (“The 99 · Invites R1”); the boards here are its export.

## The answer in one line

Add a friend opens on two cards the sender picks between, **They’re on The 99** (today’s friend link, free) and
**Invite someone new** (a QR for the table and an email field on one screen, the count shown as a hand of card
backs); every ending the sender can see reads **“Invitation sent”**; the newcomer proves their own email with a
code before anything differs; uninvited visitors meet a face-down card, no waitlist.

## Locked (the brief's eight, plus the QR hold) and where each holds

| Lock | Where |
|---|---|
| 1 Invite-only (Clerk restricted) | Invite-Only I1 to I3: the sign-up route lands there. |
| 2 A stock Hugh sets; only a new account spends one | Admin M2 (set), M3 (top up); every count line. |
| 3 The tree is recorded | Admin M4 (desktop), phone M4. |
| 4 Two paths, the sender chooses, no lookup | Add A1, D1; path 1 byte-for-byte as shipped (A4, D3). |
| 5 Always “Invitation sent” | Email E4, QR Q3. Same words, same wait, same count movement. |
| 6 The count shows in Add a friend and on /friends | Chooser card 2, path 2's sub, Friends-Count C1 to C6. |
| 7 A small invite-only page | Invite-Only I1, I2. |
| 8 Friends on sign-up | Newcomer N8 (lands on /friends with the shipped receipt band). |
| QR holds one invite while live, released at expiry | QR Q1 (“1 held by this QR”), Q4 (back), Friends C4. |

## Decisions (Design's calls, brief §Open)

1. **The chooser is two cards, not tabs or a toggle.** Card 2's graphic is the card fan (Hugh, 2026-10-16: option A
   of six on `R1 - Glyph-Options.dc.html`, chosen because cards visibly leave the hand as invites are spent). One press each; card 2 carries the count twice (a fan of
   up to three card backs, and its mono line). At 0 card 2 is dashed, greyed, `aria-disabled`, and reads
   Out of invites. “Add a friend” on /friends now opens the chooser instead of making a link; card 1 makes the
   link, with the same action, hold and toast. Each path's screen replaces the chooser in the same dialog or
   sheet, with a 44px ‹ back left of the title. *Why:* cards hold a sentence each, which the choice needs, and
   the hand gives the count personality without a stamp.
2. **Both ways of path 2 on one screen.** “At the table” (Show an invite QR, the filled press) then “or” then
   “By email” (field + Send invitation, outlined until the field holds an email). *Why:* Hugh prefers an inline
   option to another step; a third chooser would be one.
3. **The QR is the friend link's plate with a countdown ring.** An accent ring around the light plate drains
   clockwise over 15 minutes, with `mm:ss left` under it; under a minute both turn `--warning`. Expired: the plate
   greys under an EXPIRED chip, the invite returns, and **Make a new QR** is the one press. Claimed: the sheet turns
   to “Invitation sent” with a small card back. **One live QR per account**: Show an invite QR re-shows the live
   one; closing the sheet does not release it (it holds until expiry, shown on /friends as “1 held by an open QR”).
4. **The newcomer's page is the landing's ground with the sender's card face up.** Small (150×210) and tilted
   −3°: the sender's commander art, name, type line “Invitation”. One field, Your email; **Send code** claims the
   QR and mails a 6-digit code to every address alike. Right code → “That's your email” → one press to Clerk's
   sign-up on the invitation ticket, email locked. Wrong / expired code, a used QR and a run-out QR each have one
   screen. *The sender never sees the email*: it is typed only on the newcomer's phone.
5. **The email form's answer replaces the field.** ✓ Invitation sent, the 7-day line, Invite someone else. The
   address is never repeated. Only a transport failure toasts; an existing account is never a failure.
6. **/friends gets one mono line under Add a friend**, where the 10-link hold line already sits: `N invites left`,
   `· 1 waiting`, `· 1 held by an open QR`, or `Out of invites` in `--fg-faint`. No list of waiting invitations on
   /friends: no address a sender typed is ever listed back to them, and revoking lives in /admin.
7. **Ten friend links open now holds path 1 only.** Add a friend stays live so invites can still go out; the hold
   line stays under the press, and card 1 greys with the same sentence. (A change to shipped behaviour; Friends C6.)
8. **The invite-only page is a fanned hand of three card backs**, the front one marked BY INVITATION, beside
   LandingColumn: “The 99 is invite-only”, how to get in, **Sign in**, and a line for invitation-email holders.
   **No waitlist** (recommended); Option W is drawn (W1 to W3) only to make the choice concrete.
9. **The friend link's signed-out line asks for an invite**: “…Ask whoever sent this to invite you.” Nothing else
   on that page changes.
10. **/admin**: a sixth tab, **Invites**, holds the tree (founders at the root; rail lines; each node's stock and
    how many it invited; waiting invites as dashed leaves with address, how sent, return date and Revoke). Accounts
    gains Invites and Invited by columns. An account gains an Invites tile and an Invites section whose field
    **sets** the stock, with the borrowed pending sentence, Save/Undo and history. A group gains **Top up invites
    to N**: an action that raises members below N and lowers nobody; the group stores no count.
11. **About**: “Inviting someone new”, chapter 04 after Friends and pods, specimen = the chooser; one sentence of
    Friends and pods edited (`about · invites.ts`).

## Hugh's rulings, 2026-10-16 (the recommendations, approved)

- **A · After the right code, an email that already has an account. Ruled: Option A.** Every screen up to the code is identical for
  every address, and the sender's sheet already said “Invitation sent” when the code was sent. Recommend **Option A**
  (N9): tell the proven owner they have an account, offer Sign in. Option B (N10) keeps “Invitation sent” even there,
  sending them to an inbox that will receive nothing. Either way the sender's invite is held 7 days and returned.
- **B · The newcomer's card names the sender** (N1). **Ruled: face up.** The token is read anyway and the sender is standing there;
  a forwarded photo names them for at most 15 minutes. Ended QRs (N11, N12) name nobody. Recommend face up.
- **C · Waitlist. Ruled: none at launch** (Invite-Only W1 to W3 show the cost).
- **D · Where a new account lands. Ruled: /friends** with the shipped receipt band (N8). Also: a new account's
  starting count (drawn as 0, Out of invites) is Hugh's to set.

## Gaps for engineering (not Design's to settle)

- **G1 Equal time.** “Sending…” holds for the same time on every send (a server floor); the QR claim turns the
  sender's sheet at Send code, before anything is known about the address.
- **G2 The code.** 6 digits, ~10 minutes, resend cooldown, a cap on wrong tries per claim (then N12). Whether it is
  Clerk's own sign-up verification or ours, the screens fit either; the claim binds to the newcomer's session, so
  Use a different email re-sends on the same claim.
- **G3 One live QR per account**, re-shown while live; tokens single-use; Revoke in /admin returns a waiting invite at once.
- **G4 A switch** for the chooser (the About entry follows it), and whether accounts with `SOCIAL_FRIENDS_ENABLED`
  off can invite at all (they have no /friends).
- **G5 The routes.** The QR's public page is drawn as `/join/[token]`; the invite-only page's route and whether
  Clerk's in-widget “Sign up” link can point at it.
- **G6 Purge and tree.** Reservations in the purge; the tree's rule when one side is deleted (the brief's note).
- **G7 Rate buckets.** Email sends per sender; QR redemption and code sends keyed by token (and the sender).

## About entry

`The 99 - About · Invites Entry.dc.html` (§G template at 760 and 390) and `about · invites.ts`. New entry `invites`,
chapter 04 after `friends`; edit to `friends` caption sentence 2. Version per G4.

## Copy

`invites · copy strings.ts`. Locked: “Invitation sent”, “N invites left”, “Out of invites”. Everything else to
/copy-review, including the changed `socialCopy.landing.signedOutFine`.
