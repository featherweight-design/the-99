# Readiness Review — Launch email (addendum to branded emails R2)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-20 (cold audit, lane a6, rebased on origin/main e47c3e709)
**Related ticket(s):** PR #3000 (handoff `addendum-launch/`, R2c, 2026-11-18)
**Plan PR target:** TBD

## Summary

The addendum is buildable on today's tree. `launch_list` exists as named (`src/db/schema.ts`, migration 0199: `email` PK case-folded, `code_id` nullable, `created_at`), so the two drawn reasons (landing = `code_id` null via `saveLaunchEmailNoCode`, flyer = `code_id` set) are reachable from a real field. Its purge (`src/lib/flyer/launch-purge.ts`, launch date + 30 days, run from `src/app/api/cron/invite-sweep/route.ts`) is untouched by the drawn design and must stay so. The email reuses the shipped shell (`src/lib/email/shell.ts`) and the Resend path (`src/lib/invites/mail.ts`); the unsubscribe page has both states at 390 and 1300 and the text twin is drawn and templated (`templates/launch.txt`, `launch-flyer.txt`). What the build adds is backend: a sent-marking column (migration), an unsubscribe route, `List-Unsubscribe` headers that `sendMail` cannot send today, a bulk path around the 70-a-day mail cap, and a token secret. None of that needs Design. Q1 to Q3 are Hugh's product calls, not gaps. Next: plan PR, recording the clarifications below.

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ Boundary stated: one email, once, to `launch_list`, HTML + text twin, plus `/unsubscribe?t=`. G1 to G6 list the engineering work.
- ✅ Open questions logged (Q1 subject, Q2 skip addresses with an account, Q3 flyer headline). All three are for Hugh, none for Design.
- 🟡 The shell tagline change (G5, `emailShellCopy.flavor`, today "Search your library for a commander.") rides along and changes the invite, code and Clerk emails too; Clerk's templates must be re-pasted by Hugh. Plan should name it as its own step.

### 🎭 State coverage

- ✅ Email: landing source (L1 desktop, L2 phone), flyer source (L3 phone), Gmail iOS inverted (D1, D2), images off (D3, D4). The flyer source differs from landing only in the reason line, so L3 at phone covers desktop by the L1 pattern.
- ✅ Text twin drawn (T1, T2 flyer reason, T3 headers) and shipped as `templates/*.txt`.
- ✅ Unsubscribe page: U1 done and U2 broken link, each at 390 and 1300. U1 also covers an address already removed or purged; the one-click POST draws nothing. Signed out, no shell.
- 🟡 No pending state on the page: the drawn design deletes on the GET itself ("one press deletes"), so there is no button press to wait on. A link scanner that prefetches the GET will remove the address. Harmless here (this is the only mail the list sends and the list is purged at +30 days), so the plan records it and keeps GET-deletes as drawn.

### 🔌 Data contract

- 🟡 **Send once (G3) needs a migration.** `launch_list` has no sent marker. Add a nullable `sent_at` (or similar) to `launch_list` itself, not a side table, so the existing purge removes the marker with the address and nothing about the purge changes. The script claims rows with `sent_at is null`, marks per address, and pairs it with Resend's `Idempotency-Key` (already supported by `sendMail`) so a retried row never double-sends.
- 🟡 **Headers (G1).** `sendMail`'s body carries no `headers`; the build extends `Mail` with optional headers (`List-Unsubscribe`, `List-Unsubscribe-Post`) and adds a `MailTemplate` value (today `"code" | "flyer-code" | "invite"`) so `resend-webhook.ts` tags it.
- 🟡 **Mail limits.** Every `sendMail` passes `mailRefusal`, whose daily cap is `DEFAULT_DAILY_MAIL_CAP = 70` (`RESEND_DAILY_SEND_CAP` overrides). A list larger than that either runs over several days or the script takes its own batched budget with `limitsChecked`; batch under Resend's rate limit (G3).
- 🟡 **Token (G2).** HMAC of the case-folded address, no expiry. No secret exists for it; reuse `INVITE_CODE_SECRET` with a domain-separation prefix or add a new one (a new one is a Hugh-set Vercel secret).
- 🟡 **Q2 (skip existing accounts)** has no local join: app tables do not store the account's address, so honouring it needs a Clerk lookup per batch. Only if Hugh says yes.
- ✅ The one-click POST and the GET both delete by `email`; an already-gone row is U1, a bad token U2, both drawn.

### 🧱 Codebase fit

- ✅ Colours are the shell's constants (`INK`, `PANEL`, `BOX`, `LINE`, `BRASS`, `TEXT`, `MUTED`, `FINE` in `shell.ts`); serif is the shell's Georgia stack. The feature box is new markup on existing tokens.
- ✅ Copy file follows convention (`launch · copy strings.ts`, moving into `src/lib/copy/emails.ts`); all DRAFT for `/copy-review`.
- 🟡 Templates hard-code `https://the-99.dev/email/...` image and mark URLs; the shipped builders take `origin` (`mailConfig` refuses a send without `APP_ORIGIN`). Build from `origin`, as `inviteEmailParts` does.
- 🟡 `/unsubscribe` is a new route; add it to `isPublic` in `src/proxy.ts` (it is signed out, like `/offline`), and reuse the `/offline` page body as the handoff says.
- ✅ G4 images go in `public/email/` made by a generator (as `pnpm gen:email-images` made `invite-hero-plain@2x.png`), never copied from `design/`.

### ♿ Cross-cutting

- ✅ Alt text for the fan and every feature image is in the copy file; images-off frames (D3, D4) are drawn; the text twin stands alone.
- ✅ One-click unsubscribe headers meet the bulk-sender rules (G1).
- 🟡 Telemetry: none asked for. Plan adds a send report (sent, failed, skipped) from the script and keeps the Resend webhook's delivery tracking.
- ✅ G6 (client test pass incl. Outlook for Windows) is stated.

### ⏰ Drift from reality

- ✅ Every named file exists: `launch_list`, `emailShellCopy.flavor`, `inviteEmailCopy.rawLinkLabel`, `shell.ts`, `/offline`, `/sign-up`, `public/email/mark-112@2x.png`. `invites@mail.the-99.dev` is the configured `INVITE_EMAIL_FROM` shape.
- ✅ Handoff dated 2026-11-18, after branded emails 2/3 (#2945) and 3/3 (#2948); it builds on that shell verbatim.

### 📝 Decision log

- ✅ Design's six calls, R1/R2/R2b feedback and Hugh's 2026-11-15 decisions are recorded; status R2c approved by Hugh 2026-11-18.
- ✅ Open items are labelled Q1 to Q3 with recommendations.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

- Item 1: sent marker is a nullable column on `launch_list` (migration), so `purgeLaunchList` keeps working unchanged and takes the marker with the row.
- Item 2: `Mail` gains optional headers and a `launch` template tag; idempotency key per address.
- Item 3: the script runs with `--dry-run` (renders and counts, sends nothing) and a batched budget that respects `RESEND_DAILY_SEND_CAP` and Resend's rate limit.
- Item 4: token secret: reuse `INVITE_CODE_SECRET` with a prefix, or a new Hugh-set secret.
- Item 5: GET deletes as drawn (U1/U2); POST `List-Unsubscribe=One-Click` deletes and returns an empty 200.
- Item 6: image URLs built from `origin`, not hard-coded.
- Item 7: `/unsubscribe` added to `isPublic` in `src/proxy.ts`.
- Item 8: G5 tagline change listed as its own step, with Hugh's Clerk re-paste as a to-do.

## Decisions inherited

- One email, sent once, through Resend from `invites@mail.the-99.dev`, HTML plus text twin, with unsubscribe (Hugh, 2026-11-15).
- Tagline everywhere: "99 problems, but your commander ain't one." (Hugh, 2026-11-18).
- Two identical Sign up free buttons, one link; no codes line.
- Unsubscribe deletes the address; the page is signed out with no shell; Visit The 99 is the way back.
- `launch_list` purge at launch + 30 days stays as built.

## Flags (product calls, not gaps)

- **Migration:** sent marker on `launch_list`.
- **Real email:** a bulk send to every `launch_list` address; count measured on staging before sending.
- **Spend:** Resend volume beyond the 70-a-day cap; check the Resend plan's quota.
- **Secret:** possibly a new token secret for Hugh to set in Vercel.
- No new feature switch, no model call.
