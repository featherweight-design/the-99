# Brief: Branded emails (the invite first)

**For:** Claude Design. **Prompt:** to be written by the orchestrator from this brief.
**Source:** Hugh, 2026-11-14: "Custom branded emails. The invite email is very bare bones."
**Sibling handoff to mirror:** `design/design_handoff_the99_invites/` (the invite flow, its copy strings and the newcomer screens the email leads to). Brand tokens and the crowned 99 come from `design/design_handoff_the99_brand/`. No handoff covers email today.

## Problem

Every email The 99 sends is two or three bare `<p>` lines: no mark, no color, no layout. The friend invite is a newcomer's first sight of the app, and it reads like a system notice. Clerk's own emails (sign-in codes, reset codes) look like Clerk's, not The 99's.

## Email inventory

| Email | Sender | Trigger | Current state |
|---|---|---|---|
| Friend invite | Our code, Resend (`inviteMail`, `src/lib/invites/send.ts`) | A player sends an invite by email from Home | Subject "{Name} invited you to The 99". Three paragraphs: who invited you and what the app does, a "Join The 99" text link (Clerk's invitation URL), "The link works for 7 days. If you don't know {Name}, ignore this email." Plain-text twin. |
| Newcomer code (QR invite) | Our code, Resend (`src/lib/invites/claim.ts`) | Newcomer presses Send code after scanning a QR | Subject "Your code for The 99: {code}". One line with the code in bold, 10 minutes, ignore if not asked. |
| Flyer code | Our code, Resend (`flyerCodeMail`, `src/lib/flyer/claim.ts`) | Newcomer presses Send code from a flyer | Same words as the newcomer code. |
| Sign-in code | Clerk | Email me a code on `/sign-in` | Clerk's default template. |
| Password reset code | Clerk | Forgot password on `/sign-in` | Clerk's default template. |
| Account emails (verify an added address, password changed, new sign-in if enabled) | Clerk | Clerk's hosted account page, or Clerk's security notices | Clerk's default templates. Which are on is a dashboard setting; eng confirms the list before the build. |
| Clerk invitation | Clerk | Never: invitations are made with `notify: false` because Clerk's generic template landed in spam (Hugh, 2026-11-08) | Not sent. |
| Payment receipt | Stripe | A plan or pack purchase | Stripe's receipt, branded in Stripe settings (account shared with Concert Crawl). |

Nothing else mails: push never emails, and the flyer launch list is a CSV export.

## Locked facts

- Our own sends go through Resend, one `fetch` to its REST API with no SDK, from `INVITE_EMAIL_FROM` on the-99's verified Resend domain (example in `.env.example`: `The 99 <invites@mail.the-99.dev>`). Each mail is a hand-written `html` string plus a `text` twin. SPF, DKIM and DMARC live in Resend and DNS, not the repo; eng verifies them before the build.
- The invite link is Clerk's `invitation.url`; the sender's display name is player text and is HTML-escaped. The email must never reveal whether the address already has an account.
- Clerk Pro (Hugh's plan) includes custom email templates ([clerk.com/pricing](https://clerk.com/pricing)). Templates are edited in the dashboard; the From local part is ours, the domain is the app's ([email and SMS templates](https://clerk.com/docs/guides/customizing-clerk/email-sms-templates)). Each template can turn "Delivered by Clerk" off, after which we send it ourselves from the `emails.created` webhook ([webhooks](https://clerk.com/docs/guides/development/webhooks/overview)).
- Email clients ignore the app's six themes. An email uses one fixed palette, the brand sheet's Table Candlelight (base `#14110E`, brass `#C9A24B`).
- Images are hosted on the app's origin, never attached. Fonts fall back to system faces (Cinzel and Plex will not load in most clients).
- All of these are transactional: no unsubscribe link is required, and none of them markets anything.
- Copy: US English, no em dashes, `/copy-review` before handoff.

## Open for Design to call

1. **A shared email shell.** Header, body column (width, padding), one button style, footer. Table-based and inline-styled for Gmail, Apple Mail and Outlook.
2. **Header and brand mark.** The crowned 99 as a hosted PNG with alt text "The 99", or the wordmark as live text. Size, and what shows with images off.
3. **The invite email first, in detail.** Subject and preheader; who invited you, with or without the sender's commander art (as the newcomer screen draws it); one line on what the app is; a single "Join The 99" button with the raw link beneath it; the 7-day line; the "don't know them, ignore this" line. Mobile and desktop widths.
4. **Which other emails get the shell.** The two code emails (recommended: yes, with the code large and copyable), and Clerk's sign-in and reset codes through Clerk's template editor.
5. **Dark-mode behavior.** A dark email can be inverted by Gmail and Outlook. Design calls a dark shell that survives inversion, or a light shell with brass accents, and names the colors for each case.
6. **The plain-text version.** Its layout for every email: subject-free first line, the link on its own line, the same footer words.

## Open product questions for Hugh

1. **Do Clerk's emails move to our own sending?** Recommendation: no. Brand them with Clerk's template editor on Pro and keep Clerk delivering. Sending them ourselves puts a webhook on the sign-in path, where a dropped send locks a player out.
2. **One From address for everything?** Recommendation: keep `invites@` for invites and codes, and set Clerk's local part to `hello` on the app domain so a player sees The 99 on every sender line.
3. **Does the invite show the sender's commander art?** Recommendation: yes, matching the newcomer screen, with a plain fallback when they have none.
4. **A reply-to?** Recommendation: none; the footer says replies are not read.

## Out of scope

Stripe receipts (shared account, branded in Stripe). Marketing, digest or launch-list mail. Push copy. Any change to invite rules, expiry or rate limits.
