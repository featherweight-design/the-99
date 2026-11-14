# Readiness Review: Branded Emails (R2)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-14
**Related ticket(s):** PR #2932 (handoff); brief `docs/superpowers/design-briefs/2026-11-14-branded-emails.md` (branch `brief/branded-emails`)
**Plan PR target:** TBD (`docs/superpowers/plans/`)

## Summary

The handoff can be built on this codebase as drawn. It covers every email the brief lists, drawn at 600 and 375, with
images on and off, a simulated Gmail iOS inversion and a plain-text twin for each. Its `templates/` folder gives
email-safe HTML with placeholders. Every color comes from `design_handoff_the99_brand`, and the copy has no em dashes.
The hand-of-cards image (G1) can reuse the shipped `next/og` pipeline (`src/lib/og/serve.ts`) and the shipped sender
read (`readInviteSender`). Nothing needs a Design round. The plan PR has to settle seven eng-side items, listed below.
Two items go to Hugh: Clerk probably cannot send from the `mail.` subdomain, and the copy review is still owed. The
anonymous invite's lead and preheader currently read "Join as A friend's friend", which is a copy defect for
`/copy-review`, not a Design gap. UI work may start once the plan records the items below.

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ All five emails are in scope: the invite, the newcomer code, the flyer code, and Clerk's sign-in and reset codes.
  Clerk's other account emails follow the code shell's pattern (G4). Stripe receipts, marketing mail and any change to
  invite rules are out of scope, as the brief says.
- ✅ The product calls are closed in the README's table: Clerk keeps sending its own mail, our mail goes through Resend,
  the invite shows commander art with a plain fallback, there is no reply-to, and the header is the logo only.
- 🟡 Q1 ("every email, Clerk's too, from `invites@mail.the-99.dev`") rests on a Clerk capability that G3 flags as
  unconfirmed. See the Hugh items below.

### 🎭 State coverage

- ✅ Invite variants are all drawn: with art (I1 to I3), no art (P1, P2) and no name (P3). A long name and an address
  that already has an account have written rules. Code emails cover QR, flyer and resend. Clerk has template and
  as-received frames (K1 to K4).
- ✅ Client states are covered: a light client, a dark client without inversion, a partial inversion, Gmail iOS full
  inversion (simulated, D2 and D3), images off (D4) and plain text (T1 to T4).
- 🟡 P3 is drawn at phone width only; the desktop layout follows P1 (STATES says so). The same template serves both, so
  this is acceptable.
- 🟡 "The card can't be drawn at send time" is drawn as P1, but the hand is drawn when the image is fetched, not when the
  mail is sent. See clarification 2.
- 🟡 Nothing covers what the hand URL serves after the invite ends. Mail clients refetch images (the Gmail proxy, Apple
  Mail Privacy Protection prefetch), so an old email would show a broken image. See clarification 3.

### 🔌 Data contract

- ✅ Today's builders match the brief's description: `inviteMail` (`src/lib/invites/send.ts:39-51`), `codeMail`
  (`src/lib/invites/claim.ts:101-107`) and `flyerCodeMail` (`src/lib/flyer/claim.ts:113-119`). Each is three bare `<p>`
  lines plus a text twin. The subjects the handoff keeps ("{Name} invited you to The 99", "Your code for The 99:
  {code}") are the ones shipped.
- ✅ The 7-day window is `INVITATION_DAYS = round(HOLD_MS / 1 day)`, which is 7 (`src/lib/invites/clerk.ts:23`;
  `HOLD_MS` is at `src/lib/invites/rules.ts:14`). The 10-minute window is `CODE_TTL_MS` (`rules.ts:17`), used by both
  claims.
- ✅ The invite link is Clerk's `invitation.url` (`made.url`, `send.ts:186-187`). There is no reply-to:
  `sendMail` sends only `from`, `to`, `subject`, `text` and `html` (`src/lib/invites/mail.ts:74`).
- ✅ The sender's art is already readable. `readInviteSender(senderId)` (`src/lib/social/friends.ts:340-343`) returns a
  `ThirdPartyName` and a `ProfileCommander` (Scryfall `artCropUri`). It is the read `/join` already uses
  (`src/lib/invites/join-read.ts:9`).
- 🟡 `inviteMail` takes only `(to, senderName, url)`. It has no commander, no reservation id and no origin, and the send
  reads `ownDisplayName` (`send.ts:127`), not the face. See clarification 1.
- 🟡 Clerk: `{{otp_code}}` is missing from Clerk's documented variable table
  ([email and SMS templates](https://clerk.com/docs/guides/customizing-clerk/email-sms-templates), which lists
  `action_url`, `app.*`, `invitation.*` and `inviter.name`). Its only public trace this audit found is as the code
  field of the `emails.created` webhook payload, and this audit did not open the editor. G3 rightly has eng confirm it
  with the editor's Variable insert before pasting. Clerk documents email codes as valid for 10 minutes
  ([email/SMS OTP custom flow](https://clerk.com/docs/guides/development/custom-flows/authentication/email-sms-otp)), so
  the "10 minutes" lines hold.
- 🟡 Clerk's From address is `<local part>@<your domain>`, with only the local part configurable. If Reply-To is unset
  it is omitted, which matches the handoff (same Clerk doc). Nothing in the doc lets Clerk send from a different
  subdomain such as `mail.the-99.dev`. See Hugh item 1.

### 🧱 Codebase fit

- ✅ Palette: all eight hexes in the templates (`#14110E #1E1A15 #2A241D #3A3229 #C9A24B #EDE6D8 #C6B79A #A89B84`)
  appear in `design_handoff_the99_brand`. Email is outside the app's theme system, so `no-hex` only applies if the
  email module sits under a guarded path. The plan names the module's location.
- ✅ The three points reuse shipped copy: `src/lib/copy/join.ts:69-71`, not `flyerCopy.points` as the README says. The
  plan imports them from there.
- ✅ The hand reuses the `next/og` path: `servePreview` (`src/lib/og/serve.ts:46-60`) already fetches Scryfall art on
  the server (`inlineImage`), caches the result and falls back to an artless drawing that it does not store. G1
  matches that.
- 🟡 The templates hard-code `https://the-99.dev` for the mark, the plain hand and the footer
  (`templates/invite-art.html:29,32,41`). Staging is its own origin (`APP_ORIGIN` in `.env.example:47-49`). See
  clarification 4.
- ✅ `design/` assets are not copied: G2 says the build makes `/email/mark-112@2x.png` and
  `/email/invite-hero-plain@2x.png` itself and keeps `art/` as references only. This matches the design-pipeline rule.
  See clarification 5 for how.
- 🟡 Names: the hand route draws the sender's name as pixels. A `ThirdPartyName` can only become a string through
  `reveal()`, which is limited to `REVEAL_ALLOW` (`scripts/lib/third-party-names-rules.mjs:17`). `toPushItem` is the
  precedent for a non-page reveal ("a notification is not a page"). The mail body's name is today's plain
  `ownDisplayName` string. See clarification 6.

### ♿ Cross-cutting

- ✅ Accessibility: every table is `role="presentation"`, the images carry alt text (the mark's alt is styled to read
  inside its box), the code is live text with no spaces, and the contrast table lists every pair, with the worst case
  4.7:1 under simulated inversion.
- ✅ Dark mode: the shell is dark and declares it (`color-scheme` meta and `:root`). Apple Mail leaves it alone, and the
  Gmail iOS inversion is simulated and legible. The real check is G5's client pass, which the plan must include before
  the switch reaches players.
- 🟡 Security and privacy: the hand URL must not be the raw reservation uuid. The id is also stored in Clerk's
  invitation `publicMetadata.inviteReservation` (`clerk.ts:128`) and is the row's primary key. See clarification 3.
  The route serves only what the email already shows (name, commander art), never a public id or Clerk id. It has a
  `.png` path, so it bypasses the proxy (`src/proxy.ts:112` skips any path with a dot) and must refuse on its own.
- 🟡 Honest "not sent" states (lane 9b's email-limits work, `origin/flyer-limits`): the new shell must not change
  `sendMail`'s outcomes. Those are `unconfigured`, `failed` (Resend refused, which includes a 429 quota refusal) and
  `indeterminate` (`mail.ts:29`), and each caller maps them to its toast. Drawing the hand must never happen inside the
  send. The send only writes a URL, so a slow Scryfall cannot turn a delivered invite into `indeterminate`. The plan
  states this and keeps `inviteMail`, `codeMail` and `flyerCodeMail` pure.
- ✅ Analytics: none expected; transactional mail carries no tracking pixel.

### ⏰ Drift from reality

- ✅ Every file the handoff names exists as named: `send.ts`, `mail.ts`, `claim.ts`, `flyer/claim.ts`, `FriendCard`
  (`src/components/social/friend-card.tsx`), `public/icons/icon-512.png`, `src/lib/copy/invites.ts`. G6's
  `src/lib/copy/emails.ts` is new.
- ✅ The rebase onto origin/main (2026-11-14) was clean, and the flyer one-inbox change (`foldEmail`) already in
  `flyer/claim.ts` does not touch the mail builders.
- 🟡 Small drift: the README credits the points to `flyerCopy.points`, but they live at `src/lib/copy/join.ts:69-71`.
  The compact `FriendCard` tilts −3° in the app (`friend-card.tsx:10`) and −5° on the hand. That is a deliberate image
  composition, not a contradiction.

### 📝 Decision log

- ✅ Six numbered Design calls, each with its reason. The product calls are marked closed with their owner (Hugh, Q1
  and the R1 review). Gaps G1 to G6 are handed to eng by name. The placeholders are tabled.
- 🟡 The README says "every email comes from `invites@mail.the-99.dev`", but the brief recommended `hello@` for
  Clerk's mail on the app domain. Hugh's Q1 answer overrides the brief, and is recorded. Whether Clerk can meet it is
  open (G3).

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

1. **The send's inputs.** `inviteMail` gains the sender's face (`readInviteSender`, already used by `/join`) and a
   hand URL, alongside the escaped name. The send decides art or plain from `commander?.artCropUri` at send time
   (P1/P2 when null). The P3 strings apply when the name is empty. The builders stay pure.
2. **"Can't be drawn" happens at fetch time.** The hand route uses `servePreview`. Its `draw(false)` fallback (Scryfall
   down) draws the **plain hand**, not the sender's face without art. It is served `no-store` so the next fetch tries
   the art again, which matches the shipped OG behavior.
3. **The hand's URL and lifetime.** The key is an HMAC of the reservation id under `inviteSecret`
   (`src/lib/invites/tokens.ts`), with its own label (for example `"invite-hero"`), not the raw uuid. The route looks
   up the row by that key, reads only `readInviteSender(row.userId)`, and serves `image/png` with a long
   `cache-control`. While the invite is live it draws the hand. Once the invite is gone (accepted, expired, revoked,
   returned, or an unknown key) it serves the **plain hand**, never a 404, so an old email still shows an image and an
   unknown key reveals nothing. The route sits outside the proxy (its path has a dot), and its read lives in or goes
   through `src/lib/social/` so `check:social-reads` and `check:third-party-names` cover it.
4. **Origins.** Every absolute URL in a mail (mark, plain hand, hand route, footer site link) is built from `APP_ORIGIN`
   (the variable `.env.example:47` documents), not from the hard-coded `the-99.dev`. If `APP_ORIGIN` is unset the mail
   is refused as `unconfigured`, like a missing Resend key, and never sent with relative image paths. Clerk's templates
   are pasted per instance (staging dev instance and production), with the origin each one uses.
5. **The two static PNGs.** `public/email/mark-112@2x.png` (224×224, `icon-512.png` with brass diamonds) and
   `public/email/invite-hero-plain@2x.png` (560×540, transparent) are made by a committed script under `scripts/`.
   The mark is drawn from `public/icons/icon-512.png`; the plain hand comes from the same `next/og` component as the
   route, with no face. Neither is copied from `design/.../art/`; those files are references, and the PR's contact
   sheet compares against them.
6. **Names.** The hand component that draws the name is the one new `REVEAL_ALLOW` entry, with the reason "an email
   image is not a page; no PostHog". The body's name stays today's plain own-profile string, still escaped through
   `escapeHtml` (`send.ts:34`).
7. **The anonymous strings.** The lead "Join as A friend's friend" (drawn on `art/invite-anon-375.png`) and the
   preheader "Join as A friend's friend" need anon forms. They go to `/copy-review` with the rest of
   `emails · copy strings.ts`, which the README already says is owed before the build. The plain-text footer order
   (reason before flavor) differs from the HTML (flavor before reason). The plan picks the README's described order
   (the text's) for the text part and keeps the HTML as drawn.

## For Hugh (not Design)

1. **Clerk's sender address.** Clerk sends as `<local part>@<the instance's domain>`, and the docs offer no subdomain
   choice, so Clerk's mail would likely come from `invites@the-99.dev`, not `invites@mail.the-99.dev`. Before the
   build, eng checks Clerk dashboard → Emails → a template → From. If the subdomain isn't possible, Hugh rules between
   `invites@the-99.dev` (the same local part, as close to Q1 as Clerk allows) and leaving it as is.
2. **Clerk dashboard steps** (Hugh or eng with dashboard access; production, plus the staging instance if it should
   match):
   1. Open Emails, then "Verification code" (sign-in) and "Reset password code".
   2. Switch to HTML mode, with no block selected.
   3. Paste `templates/clerk-*.html` with the origin filled in.
   4. Set the subject from `clerkEmailCopy`.
   5. Paste the `.txt` body if the editor offers a plain-text field. If not, record that Clerk generates it.
   6. Set the From local part to `invites` and leave Reply-To empty.
   7. Turn off "Secured by Clerk" branding.
   8. Leave "Delivered by Clerk" ON.
   9. Confirm `{{otp_code}}` through the Variable insert.
   10. List which account emails are on (G4).
3. **Copy review** of every string before the build. This is already noted in the README.

## Plan or vendor gates

- **Clerk:** custom email templates need the Pro plan, which Hugh has (brief, Locked facts). Nothing else is gated.
- **Resend:** no paid feature is used. There are no attachments; images are hosted on our origin. `Idempotency-Key` and
  the REST send are on every plan. Volume is lane 9b's concern: on a free plan, a daily-quota refusal comes back as
  `failed` and shows as the honest "not sent" state. This handoff adds no sends.

## Decisions inherited

- Clerk's sign-in and reset codes are branded in Clerk's editor and still delivered by Clerk (no webhook on the
  sign-in path).
- Our three emails go through Resend's REST API from `INVITE_EMAIL_FROM` (`invites@`), with no SDK and fail-closed
  config (`mail.ts:43-52`).
- The invite shows the sender's commander art, falling back to the plain hand when they have none. It never says
  whether the address has an account.
- There is no reply-to, and every footer says "Replies to this email aren't read."
- One fixed palette (Table Candlelight); system fonts only, with no web fonts.
- Email-safe tables with inline styles, an MSO wrapper and a VML button; each email has a plain-text twin.
- The logo only on top (Hugh, R1 review). The code is live text with no spaces, and the subject keeps the code.
- `design/` is never copied into `public/`; the email PNGs are built.
