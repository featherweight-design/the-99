# Clerk email templates (sign-in code, password reset code)

Clerk sends these two emails itself, so they are pasted into Clerk's dashboard, not sent by our code. The files here are
generated from the same shell and words as our own emails (`src/lib/email/clerk-mail.ts`, `clerkEmailCopy` in
`src/lib/copy/emails.ts`) by `pnpm gen:clerk-templates [origin] [folder]`; edit the copy or the shell, regenerate, paste again.

- `production/` is built for `https://the-99.dev` (the tile and the footer link). For the staging Clerk instance run
  `pnpm gen:clerk-templates https://<the staging app origin> staging` and paste from `staging/`.
- Each template has `<name>.html`, `<name>.txt` (the plain-text body) and `<name>.subject.txt` (the subject line).
- `{{otp_code}}` is Clerk's variable for the code. It is **not** in Clerk's documented variable table, so confirm it first
  (step 4 below).

## Hugh's steps in the Clerk dashboard (production, then the staging instance if it should match)

1. Open **Customization, then Emails**. Open **Verification code** (this is the sign-in code) and then **Reset password code**.
2. In each template switch the editor to **HTML mode** with no block selected, and paste the matching `.html` file
   (`sign-in-code.html` into Verification code, `reset-password-code.html` into Reset password code).
3. Set the **Subject** from the matching `.subject.txt` file. If the editor has a plain-text field, paste the `.txt` file;
   if it does not, note that Clerk generates the plain text itself.
4. Confirm `{{otp_code}}` is Clerk's code variable: put the cursor where it sits and use the editor's **Variable** insert; the
   list should offer the one-time code. If the variable has a different name, tell me and I will regenerate. Send yourself a test.
5. **From address**: Clerk sends as `<local part>@the-99.dev`. Set the **local part to `invites`**, so Clerk's mail comes from
   `invites@the-99.dev` (Hugh's ruling 2026-11-14). Our own mail (the invite and the two code emails) stays on
   `invites@mail.the-99.dev`. Leave **Reply-To** empty (every footer says replies aren't read).
6. Turn **off** "Secured by Clerk" branding. Leave "Delivered by Clerk" **on**.
7. List which other account emails are turned on (verify an added address, password changed, a new sign-in) and tell me: they
   take the same shell and go through the same copy review. They are not changed by this.
8. The "10 minutes" in both emails must match Clerk's code lifetime (Clerk documents 10 minutes for email codes).
9. A client pass before this goes to players: send a test of each to Gmail on iOS, Android and web, Apple Mail on macOS and
   iOS, Outlook 365 and Outlook for Windows, and Yahoo, with images on and off.
