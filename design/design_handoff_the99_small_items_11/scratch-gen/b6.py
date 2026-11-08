"""Item 4 addendum A1 · sign-in methods (Hugh 2026-11-08): Google, email and password, and the emailed code. Helmet: small_items_7/Sign-In."""
import lib11 as L
from b4 import HELM, BACK, INVITE, LEGAL, col, ph, dk, EM

CSS = """<style>
.board .gbtn{margin-top:22px;height:48px;border-radius:8px;background:transparent;border:1px solid var(--border-strong);color:var(--fg);font:500 15px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;gap:10px;width:100%}
.board .gbtn.busy{opacity:.6}
.board .or9{display:flex;align-items:center;gap:12px;margin:18px 0 0;font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint);width:100%}
.board .or9::before,.board .or9::after{content:"";flex:1;height:1px;background:var(--border)}
.board .jcol>.gbtn,.board .jcol>.or9,.board .jcol>.s7hint{width:100%}
.board .ghint{margin-top:6px;font-size:12.5px;line-height:1.45;color:var(--fg-muted);text-align:left;width:100%}
.board .jform .jform{margin-top:0}
.board .new9{outline:1.5px dashed var(--accent);outline-offset:4px;border-radius:8px}
.board .flow9{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font:11px 'IBM Plex Mono';color:var(--fg-muted);max-width:2400px}
.board .flow9 span{border:1px solid var(--border-strong);border-radius:6px;padding:5px 9px;color:var(--fg-body)}
.board .flow9 span.n{border-style:dashed;border-color:var(--accent);color:var(--fg)}
.board .flow9 i{font-style:normal;color:var(--fg-faint)}
</style>"""

G = ('<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>'
     '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>'
     '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>'
     '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>')
GOOGLE = f'<span class="gbtn new9">{G}Continue with Google</span>'
GOOGLE_BUSY = f'<span class="gbtn busy">{G}Signing in…</span>'
OR = '<div class="or9">or</div>'
GM = '<em>sam.plays@gmail.com</em>'
DOTS = '••••••••••'

S1 = col('Sign in to The 99', f'Use Google, or type your email. {L.DRAFT}',
         f'{GOOGLE}{OR}<label style="margin-top:16px">Your email</label><span class="jfld on">sam@example.com</span><span class="jbtn">Continue</span>')
PW = col('Enter your password', f'For {EM}. {L.DRAFT}',
         f'<label>Password</label><span class="jfld on new9">{DOTS}</span><span class="jbtn">Sign in</span>'
         '<div class="jlinks"><span>Forgot password?</span><span>Email me a code instead</span></div>')
PW_BAD = col('Enter your password', f'For {EM}.',
             f'<label>Password</label><span class="jfld s7bad">{DOTS}</span>'
             f'<p class="s7err" role="alert">That password isn’t right. Try again, or email yourself a code. {L.DRAFT}</p><span class="jbtn">Sign in</span>'
             '<div class="jlinks"><span>Forgot password?</span><span>Email me a code instead</span></div>')
RESET = col('Reset your password', f'We sent a 6-digit code to {EM}. Enter it, then choose a new password. {L.DRAFT}',
            '<div class="jcode"><span>4</span><span>8</span><span>0</span><span>2</span><span class="e">·</span><span class="e">·</span></div>'
            '<span class="jbtn" style="opacity:.6">Confirm</span><div class="jlinks"><span class="cool">Send a new code in 0:41</span><span>Back to sign in</span></div>')
NEWPW = col('Choose a new password', f'For {EM}. {L.DRAFT}',
            f'<label>New password</label><span class="jfld on">{DOTS}</span><p class="s7hint">At least 8 characters.</p>'
            '<span class="jbtn">Save and sign in</span>')
TICKET_G = col('That’s your email', f'{EM} has an invitation. Now the name your friends will know you by.',
               '<label>Your first name</label><span class="jfld on">Sam</span><p class="s7hint">Friends see it on your signature card. Change it any time in Settings.</p>'
               f'<span class="jbtn">Make my account</span>{OR}{GOOGLE}<p class="ghint">Use the Google account for sam@example.com. {L.DRAFT}</p>', LEGAL)
TICKET_PW = col('That’s your email', f'{EM} has an invitation. Now the name your friends will know you by.',
                '<label>Your first name</label><span class="jfld on">Sam</span><p class="s7hint">Friends see it on your signature card. Change it any time in Settings.</p>'
                f'<label style="margin-top:14px">Password (optional)</label><span class="jfld new9">&nbsp;</span><p class="s7hint">Skip it and sign in with a code by email.</p>'
                '<span class="jbtn">Make my account</span>', LEGAL)
G_CLOSED = col('The 99 is invite-only',
               f'{GM} isn’t on The 99 yet. You join when someone already playing invites you. Ask a friend who plays: they’ll find <em>Invite someone new</em> under Add a friend.',
               '<span class="jbtn q">Use a different email</span>',
               '<p class="jquiet">Have an invitation email? Open its link to make your account.</p>')
G_MATCH = col('Sign in to The 99', 'Use Google, or type your email.',
              f'{GOOGLE_BUSY}{OR}<label style="margin-top:16px">Your email</label><span class="jfld">Your email</span><span class="jbtn" style="opacity:.6">Continue</span>')

PW_REFUSED = col('Enter your password', f'For {EM}.',
                 f'<label>Password</label><span class="jfld s7bad">{DOTS}</span>'
                 f'<p class="s7err new9" role="alert">This password can’t be used anymore. Reset it to sign in. {L.DRAFT}</p><span class="jbtn">Reset password</span>'
                 '<div class="jlinks"><span>Email me a code instead</span></div>')
TRUST = col('Check your email', f'We sent a 6-digit code to {EM}. It works for 10 minutes.',
            '<div class="jcode"><span>4</span><span>8</span><span>0</span><span>2</span><span class="e">·</span><span class="e">·</span></div>'
            '<span class="jbtn" style="opacity:.6">Confirm</span><div class="jlinks"><span class="cool">Send a new code in 0:41</span><span>Use a different email</span></div>')
G_CLOSED_NOEMAIL = col('The 99 is invite-only',
                       'You join when someone already playing invites you. Ask a friend who plays: they’ll find <em>Invite someone new</em> under Add a friend.',
                       '<span class="jbtn q">Use a different email</span>',
                       '<p class="jquiet">Have an invitation email? Open its link to make your account.</p>')
G_NONAME = col('That’s your email', f'{GM} has an invitation. Now the name your friends will know you by.',
               '<label>Your first name</label><span class="jfld on">&nbsp;</span><p class="s7hint">Friends see it on your signature card. Change it any time in Settings.</p>'
               '<span class="jbtn" style="opacity:.6">Make my account</span>', LEGAL)


def build():
    S = [L.head('Small items 11 · A1 · account 2 · 2026-11-08 · item 4 addendum · sign-in methods',
                'Sign in with Google, a password, or the emailed code',
                'Hugh’s ruling: sign-in keeps every method players have on Clerk’s hosted page today, Continue with Google, email and password, and the emailed code. '
                'Item 4’s <i>email code only</i> is withdrawn. Sign-up stays invitation-only until launch. Everything else in Small items 7 and item 4 stands as drawn; '
                'dashed copper marks what this addendum adds. New wording is DRAFT for <code>/copy-review</code>.', tag='A1')]
    S.append(L.sec('K · Sign in'))
    S.append('<div class="flow9"><span>K1 Google</span><i>→</i><span>Google</span><i>→</i><span>in (or M1, M2)</span><i>·</i>'
             '<span>K1 email · Continue</span><i>→</i><span class="n">has a password: K2</span><i>|</i><span>no password, or unknown: S2 code (as shipped)</span>'
             '<i>·</i><span class="n">K2 Forgot password? → K4 → K5 → in</span><i>·</i><span class="n">K2 Email me a code instead → S2</span></div>')
    S.append(L.frames(
        L.fr('<b>K1</b> · 390 · sign in, every method', ph(BACK, S1),
             '<b>Continue with Google</b> first, the outlined secondary press (the <code>.jbtn.q</code> look) with Google’s mark, then <i>or</i>, then S1’s email. '
             'The email press becomes <b>Continue</b>: an account with a password goes to K2; one without, or an email Clerk doesn’t know, gets a code (S2) as today. '
             'The foot <i>New to The 99? Make an account</i> stays hidden while sign-up is invitation-only.', w=390),
        L.fr('<b>K2</b> · 390 · the account has a password', ph(BACK, PW),
             'One field, <b>Sign in</b>. Two quiet links in S2’s <code>jlinks</code> row: <b>Forgot password?</b> (K4) and <b>Email me a code instead</b>, '
             'which sends the code and goes to S2. No back press: the browser’s back returns to K1 with the email kept.', w=390),
        L.fr('<b>K3</b> · 390 · a wrong password', ph(BACK, PW_BAD),
             'The field takes S3’s danger edge and the line sits in the <code>codeWrong</code> slot. The press and both links stay, so the code is one press away.', w=390),
        L.fr('<b>K4</b> · 390 · forgot password: the code', ph(BACK, RESET),
             'Clerk’s reset by email code, in S2’s shape: the six boxes, Confirm wakes at six digits, the resend cools for a minute. A wrong or expired code reads as S3. '
             '<b>Back to sign in</b> returns to K2.', w=390),
        L.fr('<b>K5</b> · 390 · forgot password: the new one', ph(BACK, NEWPW),
             'One field with the length rule under it. <b>Save and sign in</b> sets it and signs in, landing where sign-in would. Clerk’s own rule refuses a weak or breached '
             'password: its message shows in the <code>s7err</code> slot.', w=390),
    ))
    S.append(L.frames(
        L.fr('<b>K6</b> · 1300 · K1 at desktop', dk(BACK, S1), 'The S5 frame: the card left, one column.', w=1300),
        L.fr('<b>K7</b> · 1300 · K2 at desktop', dk(BACK, PW), 'Same column; K3 to K5 follow it.', w=1300),
    ))
    S.append(L.sec('L · Sign up, invitation-only'))
    S.append(L.frames(
        L.fr('<b>L1</b> · 390 · arriving on an invitation, with Google', ph(INVITE, TICKET_G),
             'H3 as drawn, with <i>or</i> and <b>Continue with Google</b> under Make my account, and one line naming the invited email. Google signs up with the ticket and '
             'takes the first name from Google; the reader lands on Home with the welcome strip. S4 → U3 (invited, by code) takes the same two lines.', w=390),
        L.fr('<b>L2</b> · 390 · not recommended: a password at sign-up', ph(INVITE, TICKET_PW),
             '<b>Recommended: sign-up does not offer a password.</b> The account starts on the emailed code (and Google, if used). A player who wants a password sets it '
             'in Manage account, Clerk’s page from the account menu, and K2 offers it from then on. Drawn for comparison: an optional field on U3, a second decision on the one '
             'screen built to have one.', w=390),
        L.fr('<b>L3</b> · 1300 · L1 at desktop', dk(INVITE, TICKET_G), 'The U5 frame.', w=1300),
    ))
    S.append(L.sec('M · Google errors'))
    S.append(L.frames(
        L.fr('<b>M1</b> · 390 · a Google account with no invitation', ph(BACK, G_CLOSED),
             'Back from Google with an email Clerk holds no account or invitation for: H2, naming the Google email. <b>Use a different email</b> returns to K1. '
             'No account is made. The same page follows L1 when the Google account’s email isn’t the invited one.', w=390),
        L.fr('<b>M2</b> · 390 · a Google email that matches an account', ph(BACK, G_MATCH),
             '<b>It signs in to that account.</b> Clerk links the verified Google email to the code or password account with that email; on the way back the Google press reads '
             '<b>Signing in…</b> and the page lands where sign-in would. No message: the reader asked to sign in and did.', w=390),
        L.fr('<b>M3</b> · 1300 · M1 at desktop', dk(BACK, G_CLOSED), 'The S5 frame.', w=1300),
    ))
    S.append(L.sec('N · A1b, from engineering’s audit (each takes the audit’s fallback)'))
    S.append(L.frames(
        L.fr('<b>N1</b> · 390 · a password Clerk refuses', ph(BACK, PW_REFUSED),
             'A breached, compromised or untrusted password (or <code>needs_new_password</code>): not K3, whose line would be false. The danger edge stays; the line says why, '
             'and the press becomes <b>Reset password</b>, which sends the code and lands on K4. <i>Email me a code instead</i> stays. No new layout.', w=390),
        L.fr('<b>N2</b> · 390 · a new device after a correct password', ph(BACK, TRUST),
             'If Client Trust stays on (Hugh’s dashboard call), a correct password from a new device asks for an email code: <b>S2 exactly</b>, its title, body, six boxes and resend. '
             'Confirm signs in. The same screen serves an MFA email code. No new line.', w=390),
        L.fr('<b>N3</b> · 390 · H2 when the Google email is unknown', ph(BACK, G_CLOSED_NOEMAIL),
             'Only if the spike shows the app can’t read the address Google gave: M1 drops its first sentence and reads the shipped <code>inviteOnlyCopy.body</code> alone. '
             'Everything else as M1.', w=390),
        L.fr('<b>N4</b> · 390 · a Google account with no first name', ph(INVITE, G_NONAME),
             '<b>Confirmed: the shipped U3 field is the answer.</b> When Google sends no first name (<code>first_name</code> in <code>missingFields</code>), the Google return lands on U3 '
             'with the field empty; Make my account wakes once it has text. When Google sends one, there is no stop at U3.', w=390),
    ))
    S.append(L.rule('Rulings for addendum A1', [
        '<b>Methods: Google, email and password, and the emailed code</b> (Hugh, 2026-11-08). The Clerk dashboard keeps all three on; the pages carry all three. '
        'Item 4 rule 5 and READINESS 4.5 are withdrawn.',
        '<b>Order on S1:</b> Google first, then the email. The email’s press is <b>Continue</b>, and the account decides the next step: password (K2) or code (S2).',
        '<b>Password links:</b> <b>Forgot password?</b> and <b>Email me a code instead</b>, as Hugh named them, in S2’s link row.',
        '<b>Sign-up offers no password</b> (L2 not taken). Google sits beside the code on the invitation landing (L1).',
        '<b>Google errors:</b> no invitation → H2 with the Google email (M1); a matching account → signed in to it (M2).',
        '<b>A1b (engineering audit):</b> a refused password → N1 → K4; a new-device code → S2 unchanged (N2); H2 without the address if unreadable (N3); no Google first name → U3’s field (N4).',
    ]))
    return L.doc('Small items 11 · A1 · Sign-in methods', HELM + CSS, ''.join(S), 2700)
