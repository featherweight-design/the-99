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
- Fonts. Revolvapp has no font-family or letter-spacing attribute, and Clerk's preview dropped a `<re-style>` block, so the
  Georgia heading and flavor line and the code's monospace and spacing ride on inline `<span style>`s. If Clerk's preview still
  shows them in the sans face, those spans are being stripped and there is no other route in the documented attributes.
- The brass rule is a 3px divider across the card's full width; the card's rounded top corners do not follow it (the mock's is
  a CSS `border-top`).
- The code box is a fixed-width column (262px, six digits), not sized by its content.
- No MSO (Outlook) wrapper or dark-mode metas: Revolvapp writes its own document.

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

## The sign-in template, as generated

This is `production/sign-in-code.html` (the reset one differs only in its words). Paste the file, not this copy: it is what
`pnpm gen:clerk-templates` writes and a test keeps it equal to the builder, while this block is only for reading.

```html
<re-html>
<re-head>
    <re-title>
        Your sign-in code for The 99: {{otp_code}}
    </re-title>
</re-head>
<re-body background-color="#14110E" padding="36px 24px 44px 24px">
    <re-preheader>
        Enter it on the sign-in page. It expires in 10 minutes.
    </re-preheader>
    <re-header padding="0px 0px 24px 0px" background-color="#14110E">
        <re-block align="center" padding="0px 0px 0px 0px" background-color="#14110E">
            <re-image src="https://the-99.dev/email/mark-112@2x.png" width="56px" alt="The 99" href="https://the-99.dev" border-radius="13px"></re-image>
        </re-block>
    </re-header>
    <re-main background-color="#1E1A15" border="1px solid #3A3229" border-radius="12px" padding="0px 0px 32px 0px">
        <re-divider background-color="#C9A24B" height="3px"></re-divider>
        <re-block align="center" padding="36px 40px 0px 40px" background-color="#1E1A15">
            <re-text align="center" margin="0px 0px 14px 0px" font-size="12px" font-weight="600" line-height="17px" color="#C9A24B">
                <span style="letter-spacing:0.22em;text-transform:uppercase;">&#9670;&nbsp;&nbsp;Sign-in code&nbsp;&nbsp;&#9670;</span>
            </re-text>
            <re-heading level="h1" align="center" margin="0px 0px 14px 0px" color="#EDE6D8" font-size="30px" line-height="36px">
                <span style="font-family:Georgia,'Times New Roman',Times,serif;">Welcome back</span>
            </re-heading>
            <re-text align="center" margin="0px 0px 22px 0px" font-size="16px" font-weight="normal" line-height="26px" color="#C6B79A">
                Enter this code on the sign-in page.
            </re-text>
        </re-block>
        <re-block align="center" padding="0px 40px 0px 40px" background-color="#1E1A15">
            <re-grid>
                <re-column width="262px" align="center" padding="18px 30px 18px 30px" background-color="#2A241D" border="1px solid #C9A24B" border-radius="10px">
                    <re-text align="center" margin="0px 0px 0px 0px" font-size="38px" font-weight="600" line-height="44px" color="#EDE6D8">
                        <span style="font-family:'SFMono-Regular',Menlo,Consolas,'Liberation Mono','Courier New',monospace;letter-spacing:0.28em;padding-left:0.28em;">{{otp_code}}</span>
                    </re-text>
                </re-column>
            </re-grid>
        </re-block>
        <re-block align="center" padding="24px 40px 0px 40px" background-color="#1E1A15">
            <re-divider background-color="#3A3229" height="1px"></re-divider>
            <re-text align="center" margin="20px 0px 0px 0px" font-size="14px" font-weight="normal" line-height="22px" color="#A89B84">
                It expires in 10 minutes. If you didn’t try to sign in, you can ignore this email. No one can get in without this code.
            </re-text>
        </re-block>
    </re-main>
    <re-footer padding="28px 40px 0px 40px" background-color="#14110E">
        <re-block align="center" padding="0px 0px 0px 0px" background-color="#14110E">
            <re-text align="center" margin="0px 0px 10px 0px" font-size="10px" font-weight="normal" line-height="10px" color="#C9A24B">
                <span style="letter-spacing:8px;">&#9670;&#9670;&#9670;</span>
            </re-text>
            <re-text align="center" margin="0px 0px 14px 0px" font-size="15px" font-style="italic" font-weight="normal" line-height="22px" color="#C6B79A">
                <span style="font-family:Georgia,'Times New Roman',Times,serif;">99 problems, but your commander ain’t one.</span>
            </re-text>
            <re-text align="center" margin="0px 0px 0px 0px" font-size="13px" font-weight="normal" line-height="21px" color="#A89B84">
                You’re getting this because someone tried to sign in to The 99 with this address.<br>Replies to this email aren’t read.<br><a href="https://the-99.dev" style="color:#A89B84;text-decoration:underline;">the-99.dev</a>
            </re-text>
        </re-block>
    </re-footer>
</re-body>
</re-html>
```
