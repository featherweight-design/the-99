# Clerk email templates (sign-in code, password reset code)

Clerk sends these two emails itself, so they are pasted into Clerk's dashboard, not sent by our code. The files here are
generated from the same palette and words as our own emails (`src/lib/email/clerk-mail.ts`, `clerkEmailCopy` in
`src/lib/copy/emails.ts`) by `pnpm gen:clerk-templates [origin] [folder]`; edit the copy or the palette, regenerate, paste again.

**The `.html` files are not HTML.** Clerk's email editor takes only its own Revolvapp markup (`<re-html>`, `<re-body>`,
`<re-block>`, `<re-text>`, `<re-heading>`, `<re-image>`...), so each file draws the code email of the branded-emails handoff
(`design/design_handoff_the99_emails`, board K) in the elements and attributes Revolvapp documents
([tags](https://imperavi.com/legacy/revolvapp/docs/syntax/tags)). The mark is our hosted tile (`/email/mark-112@2x.png`), not
Clerk's `{{> app_logo}}` partial, which Clerk's preview leaves literal.

**Known gaps against the mock** (Revolvapp has no attribute for them; Clerk's preview is the test):
- The 3px brass rule is a divider inside the card's 40px side padding, not full-width on the card's top edge with its rounded corners.
- The code box fills the card's content width instead of shrinking to the code.
- Georgia (heading, flavor line) and the code's monospace and letter-spacing ride on classes in a `<re-style>` block; if Clerk drops
  that block, they fall back to the editor's default font.
- No MSO (Outlook) wrapper or dark-mode metas: Revolvapp writes its own document.

- `production/` is built for `https://the-99.dev` (the plain-text footer link). For the staging Clerk instance run
  `pnpm gen:clerk-templates https://<the staging app origin> staging` and paste from `staging/`.
- Each template has `<name>.html`, `<name>.txt` (the plain-text body) and `<name>.subject.txt` (the subject line).
- `{{otp_code}}` is Clerk's variable for the code (Clerk's own default Verification code template uses it).

## Hugh's steps in the Clerk dashboard (production, then the staging instance if it should match)

1. Open **Customization, then Emails**. Open **Verification code** (this is the sign-in code) and then **Reset password code**.
2. In each template open the **Body**'s code view (the `<>` button), select all, and paste the matching `.html` file over it
   (`sign-in-code.html` into Verification code, `reset-password-code.html` into Reset password code).    save and refuses a body without `{{otp_code}}` (seen 2026-11-15 when pasting plain HTML); the files carry it inside a `<re-text>`, as
   Clerk's default does.
3. Set the **Subject** from the matching `.subject.txt` file. If the editor has a plain-text field, paste the `.txt` file;
   if it does not, note that Clerk generates the plain text itself.
4. Check the mark: the header image loads `https://the-99.dev/email/mark-112@2x.png` (staging: its own origin). Send yourself a
   test and compare it with board K of the handoff.
5. **From address**: Clerk sends as `<local part>@the-99.dev`. Set the **local part to `invites`**, so Clerk's mail comes from
   `invites@the-99.dev` (Hugh's ruling 2026-11-14). Our own mail (the friend invite and the newcomer and flyer code emails, sent through Resend
   from `INVITE_EMAIL_FROM`) stays on `invites@mail.the-99.dev`: check that variable's production value matches. Leave **Reply-To** empty (every footer says replies aren't read).
6. Turn **off** "Secured by Clerk" branding. Leave "Delivered by Clerk" **on**.
7. List which other account emails are turned on (verify an added address, password changed, a new sign-in) and tell me: they
   take the same shell and go through the same copy review. They are not changed by this.
8. The "10 minutes" in both emails must match Clerk's code lifetime (Clerk documents 10 minutes for email codes).
9. A client pass before this goes to players: send a test of each to Gmail on iOS, Android and web, Apple Mail on macOS and
   iOS, Outlook 365 and Outlook for Windows, and Yahoo, with images on and off.
