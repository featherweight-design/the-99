"""Item 4 addendum A2 · invite-only on Clerk (Hugh's rulings 2026-11-11): a password at sign-up, no email's account status ever shown,
and the uninvited Google refusal. Helmet: small_items_7/Sign-In, plus A1's Google press (b6)."""
import lib11 as L
from b4 import HELM, BACK, INVITE, LEGAL, col, EM
from b6 import CSS as CSS6, GOOGLE, G, OR, DOTS

CSS = CSS6 + """<style>
.board .jform .jfld+label,.board .jform .s7hint+label,.board .jform .s7err+label{margin-top:14px}
.board .jquiet.n9{margin-top:18px}
.board .gerr{margin-top:8px}
.board .th9 .jcol h1{font-family:var(--face),serif}
.board .zm{zoom:.55}
.board .ret{text-decoration:line-through;color:var(--fg-faint)}
</style>"""
FONTS_TH = ('<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@700&amp;family=Syncopate:wght@700&amp;family=Metamorphous'
            '&amp;family=Trirong:wght@700&amp;family=Cormorant+Garamond:wght@700&amp;display=swap" rel="stylesheet">')

D = L.DRAFT


def ph(card, column):
    # min-height, not height: the sign-up page with a password runs past 844 and the phone scrolls; the frame shows all of it.
    return f'<div class="ph" style="min-height:844px"><div class="pb"><div class="jn">{card}{column}</div></div></div>'


def dk(card, column):
    return f'<div class="dk" style="width:1300px;min-height:780px"><div class="main"><div class="jn">{card}{column}</div></div></div>'

BYINV = '<div class="cc"><div class="bk"><div><span class="cw">◆ ◆ ◆</span><b>99</b><small>By invitation</small></div></div></div>'
GM = '<em>sam.plays@gmail.com</em>'
HOWTO = f'<p class="jquiet n9 new9">New to The 99? It’s invite-only for now. <a>How to join</a> {D}</p>'
NAME = ('<label>Your first name</label><span class="jfld on">Sam</span>'
        '<p class="s7hint">Friends see it on your signature card. Change it any time in Settings.</p>')
PWHINT = f'<p class="s7hint">At least 8 characters. {D}</p>'

# ---- P · sign in, the same screens for every email ---------------------------------------------------------------
P1 = col('Sign in to The 99', 'Use Google, or type your email.',
         f'{GOOGLE}{OR}<label style="margin-top:16px">Your email</label><span class="jfld on">sam@example.com</span><span class="jbtn">Continue</span>', HOWTO)
P2 = col('Enter your password', f'For {EM}.',
         f'<label>Password</label><span class="jfld on">{DOTS}</span><span class="jbtn">Sign in</span>'
         '<div class="jlinks"><span>Forgot password?</span><span>Email me a code instead</span></div>')
P3 = col('Enter your password', f'For {EM}.',
         f'<label>Password</label><span class="jfld s7bad">{DOTS}</span>'
         f'<p class="s7err new9" role="alert">That email or password isn’t right. Try again, or email yourself a code. {D}</p><span class="jbtn">Sign in</span>'
         '<div class="jlinks"><span>Forgot password?</span><span>Email me a code instead</span></div>')
CODE6 = '<div class="jcode"><span>4</span><span>8</span><span>0</span><span>2</span><span class="e">·</span><span class="e">·</span></div>'
P4 = col('Check your email', f'<span class="new9">If {EM} has an account, we sent it a 6-digit code. It works for 10 minutes.</span> {D}',
         f'{CODE6}<span class="jbtn" style="opacity:.6">Confirm</span><div class="jlinks"><span class="cool">Send a new code in 0:41</span><span>Use a different email</span></div>',
         HOWTO)
P5 = col('Check your email', f'If {EM} has an account, we sent it a 6-digit code. It works for 10 minutes.',
         '<div class="jcode s7bad"><span>4</span><span>8</span><span>0</span><span>2</span><span>1</span><span>7</span></div>'
         '<p class="s7err" role="alert">That code isn’t right. Check the email and try again.</p>'
         '<span class="jbtn">Confirm</span><div class="jlinks"><span>Send a new code</span><span>Use a different email</span></div>', HOWTO)
P6 = col('Reset your password', f'<span class="new9">If {EM} has an account, we sent it a 6-digit code. Enter it, then choose a new password.</span> {D}',
         f'{CODE6}<span class="jbtn" style="opacity:.6">Confirm</span><div class="jlinks"><span class="cool">Send a new code in 0:41</span><span>Back to sign in</span></div>')
G1 = col('Sign in to The 99', 'Use Google, or type your email.',
         f'{GOOGLE}<p class="s7err gerr new9" role="alert">That Google account can’t sign in here. Use your email, or open your invitation link if you’re new. {D}</p>'
         f'{OR}<label style="margin-top:16px">Your email</label><span class="jfld">Your email</span><span class="jbtn" style="opacity:.6">Continue</span>', HOWTO)

# ---- Q · sign up by invitation, with the password ----------------------------------------------------------------
QBODY = f'<span class="new9">{EM} has an invitation, and its link proved the email is yours. Add your first name and a password.</span> {D}'
GLINE = f'<p class="ghint">Use the Google account for sam@example.com.</p>'


def q(pw_cls='on', err=None, hint=True, btn='Make my account', busy=False, google=True, name=NAME, body=QBODY, title='Make your account'):
    e = f'<p class="s7err new9" role="alert">{err} {D}</p>' if err else ''
    h = PWHINT if hint and not err else ''
    b = f'<span class="jbtn{" busy" if busy else ""}">{btn}</span>'
    g = f'{OR}{GOOGLE}{GLINE}' if google else ''
    return col(f'{title} {D}' if title == 'Make your account' and not busy and not err else title, body,
               f'{name}<label class="new9" style="margin-top:14px">Password</label><span class="jfld {pw_cls}">{"••••" if pw_cls == "s7bad" and "8" in (err or "") else DOTS}</span>{h}{e}{b}{g}', LEGAL)


Q1 = q()
Q2 = q('s7bad', 'Use at least 8 characters.')
Q3 = q('s7bad', 'That password is too easy to guess. Try a longer one, or a few words together.')
Q4 = q('s7bad', 'That password has appeared in a data breach, so it can’t be used. Choose a different one.')
Q5 = q('', None, hint=False, btn='Making your account…', busy=True, google=False,
       name='<label>Your first name</label><span class="jfld">Sam</span><p class="s7hint">Friends see it on your signature card. Change it any time in Settings.</p>')
Q6 = col('Make your account', f'Google confirmed {GM}. <span class="new9">Add what Google didn’t send.</span> {D}',
         '<label>Your first name</label><span class="jfld on">&nbsp;</span><p class="s7hint">Friends see it on your signature card. Change it any time in Settings.</p>'
         f'<label class="new9" style="margin-top:14px">Password</label><span class="jfld">&nbsp;</span>{PWHINT}'
         '<span class="jbtn" style="opacity:.6">Make my account</span>', LEGAL)

# ---- R · sign-up without an invitation, and a link that no longer works -------------------------------------------
R1 = col('The 99 is invite-only',
         'You join when someone already playing invites you. Ask a friend who plays: they’ll find <em>Invite someone new</em> under Add a friend.',
         '<span class="jbtn q">Sign in</span>', '<p class="jquiet">Have an invitation email? Open its link to make your account.</p>')
R3 = col(f'This invitation link doesn’t work {D}',
         f'<span class="new9">It may have been used already, or it may have run out. If you made your account with it, sign in. '
         f'If not, ask the friend who invited you to send a new one.</span>',
         '<span class="jbtn q">Sign in</span>')
R2 = col('Make your account', QBODY,
         f'{NAME}<label style="margin-top:14px">Password</label><span class="jfld on">{DOTS}</span>{PWHINT}'
         f'<span class="jbtn" style="opacity:.6">Make my account</span>{OR}<span class="gbtn busy">{G}Checking your invitation… {D}</span>', LEGAL)

THEMES = [
    ('Amonkhet', 'Cinzel', '--bg:#14110E;--surface:#1E1A15;--surface-inset:#1B1712;--surface-raised:#211D18;--surface-sunken:#18140F;--border:#2B241B;--border-strong:#3A3229;--fg:#EDE6D8;--fg-body:#C0B8A6;--fg-muted:#A59C89;--fg-faint:#948B78;--fg-locked:#6E6654;--accent:#CF8745;--accent-text:#CF8745;--success:#6FA368'),
    ('Kamigawa', 'Chakra Petch', '--bg:#0E0F14;--surface:#16181F;--surface-inset:#13151C;--surface-raised:#191B22;--surface-sunken:#101219;--border:#181C26;--border-strong:#262A35;--fg:#E6E8F0;--fg-body:#B1B6C7;--fg-muted:#959AAD;--fg-faint:#84899B;--fg-locked:#606476;--accent:#FF4D9A;--accent-text:#FF4D9A;--success:#6FA368'),
    ('Ixalan', 'Trirong', '--bg:#0E1310;--surface:#171E19;--surface-inset:#141B16;--surface-raised:#1A221C;--surface-sunken:#101512;--border:#1D2620;--border-strong:#2C3830;--fg:#E0E7DE;--fg-body:#B6C2B3;--fg-muted:#98A695;--fg-faint:#879383;--fg-locked:#626E5E;--accent:#A3C445;--accent-text:#A3C445;--success:#5EA990'),
    ('Phyrexia', 'Syncopate', '--bg:#0D0B0E;--surface:#151317;--surface-inset:#131115;--surface-raised:#18161A;--surface-sunken:#100E12;--border:#19161C;--border-strong:#262329;--fg:#E4E2E6;--fg-body:#B5B2BB;--fg-muted:#9A96A0;--fg-faint:#87838D;--fg-locked:#64616A;--accent:#52827A;--accent-text:#5D8E85;--success:#6FA368'),
    ('Eldraine', 'Cormorant Garamond', '--bg:#120E17;--surface:#1B1821;--surface-inset:#17141D;--surface-raised:#1F1C25;--surface-sunken:#131018;--border:#241D30;--border-strong:#342C41;--fg:#E4DEEE;--fg-body:#B9B2C5;--fg-muted:#9C95A8;--fg-faint:#8F899B;--fg-locked:#6A6475;--accent:#AE88E6;--accent-text:#AE88E6;--success:#6FA368'),
    ('Kaldheim', 'Metamorphous', '--bg:#121217;--surface:#1E1F26;--surface-inset:#1A1B22;--surface-raised:#22232B;--surface-sunken:#16171D;--border:#1A1F2B;--border-strong:#2E3340;--fg:#C6D2D3;--fg-body:#B3C0C2;--fg-muted:#95A4A6;--fg-faint:#8A999B;--fg-locked:#5F6D6E;--accent:#6C97DB;--accent-text:#6C97DB;--success:#6FA368'),
]


def th(name, face, v, inner):
    return f'<div class="th9" style="{v};--danger:#C6533F;--face:\'{face}\';color:var(--fg)">{inner}</div>'


def build():
    S = [L.head('Small items 11 · A2 · account 2 · 2026-11-11 · item 4 addendum · invite-only on Clerk',
                'Invite-only sign-in and sign-up, with nothing said about any email',
                'Three rulings from Hugh (2026-11-11) after the Clerk dev-instance test: <b>sign-up keeps a password</b>; <b>no page ever says whether an email has an account</b> '
                '(Clerk’s account-guessing protection is on); and <b>an uninvited Google sign-up is refused</b> before Google’s consent screen. This board redraws the moments those '
                'rulings change. Everything else in Small items 7, item 4 and A1 stands as drawn. Dashed copper marks what A2 changes; new wording is DRAFT for '
                '<code>/copy-review</code>: explicit, not cute.', tag='A2')]

    S.append(L.sec('P · Sign in: every email gets the same screens'))
    S.append('<div class="flow9"><span>P1 Google</span><i>→</i><span>in (M2) or G1</span><i>·</i>'
             '<span>P1 email · Continue</span><i>→</i><span class="n">P2 password, for every email</span><i>→</i><span>in, or P3</span>'
             '<i>·</i><span class="n">P2 Email me a code instead → P4 “If … has an account”</span><i>·</i><span class="n">P2 Forgot password? → P6 → K5 → in</span>'
             '<i>·</i><span class="ret">K1 split · K2 only for password accounts · S4 · H1 · H2 after a code</span></div>')
    S.append(L.frames(
        L.fr('<b>P1</b> · 390 · sign in (K1 redrawn)', ph(BACK, P1),
             'As K1, with one change: <b>Continue goes to P2 for every email</b>, whatever Clerk holds for it, so the next screen never sorts emails. '
             'The foot gains the calm pointer to the other page: <i>New to The 99? It’s invite-only for now.</i> <b>How to join</b> opens <code>/sign-up</code> (R1).', w=390),
        L.fr('<b>P2</b> · 390 · the password, for every email (K2 redrawn)', ph(BACK, P2),
             'The K2 screen as drawn, shown to every email: an email with no account, or one that has only ever used the code, sees it too. '
             '<b>Email me a code instead</b> is the way in for a player with no password.', w=390),
        L.fr('<b>P3</b> · 390 · it didn’t work (K3 redrawn)', ph(BACK, P3),
             'One neutral line for a wrong password, an email with no account, and an account with no password: <i>That email or password isn’t right.</i> '
             'It is Clerk’s one answer with protection on (<code>form_password_or_identifier_incorrect</code>). The press and both links stay.', w=390),
        L.fr('<b>P4</b> · 390 · Email me a code instead (S2 redrawn)', ph(BACK, P4),
             'S2’s screen for every email, with the body worded to hold either way: <i>If {email} has an account, we sent it a 6-digit code.</i> '
             'An email with no account gets no email and the same screen. The foot pointer repeats, since this is where a newcomer waits for a code that won’t come.', w=390),
        L.fr('<b>P5</b> · 390 · a wrong code', ph(BACK, P5),
             'The shipped S3 line, <code>codeWrong</code>, already says nothing about the account. It is what any code typed for an email with no account gets.', w=390),
        L.fr('<b>P6</b> · 390 · forgot password (K4 redrawn)', ph(BACK, P6),
             'K4 for every email, with the same <i>If … has an account</i> body. K5 (the new password) follows unchanged and takes Q2 to Q4’s three lines.', w=390),
    ))
    S.append(L.frames(
        L.fr('<b>P7</b> · 1300 · P1 at desktop', dk(BACK, P1), 'The S5 frame: the card left, one column.', w=1300),
        L.fr('<b>P8</b> · 1300 · P4 at desktop', dk(BACK, P4), 'Same column; P2, P3, P5 and P6 follow it.', w=1300),
    ))

    S.append(L.sec('Q · Sign up by invitation: name, then a password'))  # Q row uses gap 30 so six frames sit in one row
    S.append('<div class="flow9"><span>invitation email link (ticket)</span><i>→</i><span class="n">Q1 the email is proven by the link, no code</span><i>→</i>'
             '<span>Make my account</span><i>→</i><span>Home with the welcome strip</span><i>|</i><span class="n">Q2 · Q3 · Q4 the password is refused</span>'
             '<i>·</i><span>Q1 Continue with Google</span><i>→</i><span>Google</span><i>→</i><span>in, or Q6</span>'
             '<i>·</i><span>/join invite</span><i>→</i><span>its code</span><i>→</i><span>Continue to sign-up</span><i>→</i><span>Q1</span></div>')
    S.append(L.frames(
        L.fr('<b>Q1</b> · 390 · arriving on an invitation (H3 and L1 redrawn)', ph(INVITE, Q1),
             'The ticket proves the email, so there is no code step. One screen, two fields: <b>Your first name</b> (the shipped U3 field and hint) and, new, '
             '<b>Password</b> with <i>At least 8 characters.</i> under it. Make my account wakes when both have text. The title drops <i>That’s your email</i> (S4’s line, retired) '
             'for <b>Make your account</b>. Google stays under <i>or</i>, as L1.', w=390),
        L.fr('<b>Q2</b> · 390 · too short', ph(INVITE, Q2),
             'Checked on the press, before Clerk is asked: under 8 characters. The field takes S3’s danger edge and the line replaces the hint in the <code>s7err</code> slot. '
             'The name keeps its text; the field keeps what was typed.', w=390),
        L.fr('<b>Q3</b> · 390 · too weak', ph(INVITE, Q3),
             'Clerk’s strength check refuses it (<code>form_password_not_strong_enough</code>). The line says what to do, not a score.', w=390),
        L.fr('<b>Q4</b> · 390 · found in a breach', ph(INVITE, Q4),
             'Clerk’s breach check refuses it (<code>form_password_pwned</code>). The line says why, so the reader doesn’t retry the same one. It names no account.', w=390),
        L.fr('<b>Q5</b> · 390 · Make my account pressed', ph(INVITE, Q5),
             'J2 with both fields locked: <b>Making your account…</b>. A failure is J3’s shipped <code>joinCopy.failed</code>, as drawn.', w=390),
        L.fr('<b>Q6</b> · 390 · back from Google, something missing (N4 redrawn)', ph(INVITE, Q6),
             'Only if Clerk still asks for a name or a password after Google: the fields it asks for, nothing else. If Clerk waives the password once Google has verified the email, '
             'and Google sent a name, there is no stop here. The spike decides which.', w=390),
        gap=30))
    S.append(L.frames(
        L.fr('<b>Q7</b> · 1300 · Q1 at desktop', dk(INVITE, Q1), 'The U5 frame.', w=1300),
        L.fr('<b>Q8</b> · 1300 · Q4 at desktop', dk(INVITE, Q4), 'Q2, Q3, Q5 and Q6 follow it.', w=1300),
    ))

    S.append(L.sec('R · Sign-up without an invitation, and Google refused'))
    S.append(L.frames(
        L.fr('<b>R1</b> · 390 · /sign-up without an invitation (U1 to U4 while invite-only)', ph(BYINV, R1),
             '<b>The shipped invite-only page</b> (<code>inviteOnlyCopy</code>, every string shipped) and nothing to type. With no form there is no email to judge, so the page explains '
             'the invite-only rule and never an email’s status. <b>Sign in</b> is the calm pointer back. U1, U2 and U4 (<i>You already have an account</i>) are not reached while invite-only.', w=390),
        L.fr('<b>R2</b> · 390 · Google pressed, checking the invitation', ph(INVITE, R2),
             'The Google press first asks Clerk to start the sign-up with the ticket. It dims and reads <i>Checking your invitation…</i> for the moment that takes. '
             'If the ticket is good, Google opens. If not, Clerk refuses before Google’s consent screen and the page becomes R3.', w=390),
        L.fr('<b>R3</b> · 390 · the invitation link doesn’t work', ph(BYINV, R3),
             'For a used, revoked or expired ticket, from Make my account or from Google (R2), and for an invited email that turns out to have an account already. '
             'One page for all of them, so it reveals nothing about the email: it says what may have happened and the two ways on. <b>Sign in</b> goes to P1.', w=390),
        L.fr('<b>G1</b> · 390 · Google on sign-in, no account to sign in to', ph(BACK, G1),
             'Back from Google with an account The 99 can’t sign in (none, or sign-up closed). Clerk refuses the sign-up it would start, so no account is made. P1 comes back with one line '
             'under the Google press, saying what to do. It never says the account doesn’t exist. Replaces M1 and N3 (the H2 page after Google).', w=390),
    ))
    S.append(L.frames(
        L.fr('<b>R4</b> · 1300 · R1 at desktop', dk(BYINV, R1), 'The S5 frame.', w=1300),
        L.fr('<b>R5</b> · 1300 · R3 at desktop', dk(BYINV, R3), 'G1 at desktop is P7 with G1’s line.', w=1300),
    ))

    S.append(L.sec('T · Six themes: P3 and Q4 at 390, Q1 at desktop'))
    S.append(L.frames(*[L.fr(f'<b>{n}</b> · 390 · P3', th(n, f, v, ph(BACK, P3))) for n, f, v in THEMES], gap=36))
    S.append(L.frames(*[L.fr(f'<b>{n}</b> · 390 · Q4', th(n, f, v, ph(INVITE, Q4))) for n, f, v in THEMES], gap=36))
    S.append(L.frames(*[L.fr(f'<b>{n}</b> · 1300 at 55%', th(n, f, v, f'<div class="zm">{dk(INVITE, Q1)}</div>')) for n, f, v in THEMES[:3]], gap=36))
    S.append(L.frames(*[L.fr(f'<b>{n}</b> · 1300 at 55%', th(n, f, v, f'<div class="zm">{dk(INVITE, Q1)}</div>')) for n, f, v in THEMES[3:]], gap=36))

    S.append(L.rule('Rulings for addendum A2 (Hugh, 2026-11-11)', [
        '<b>Sign-up keeps a password.</b> Q1 adds it under the name; 8 or more characters, and Clerk’s strength and breach checks (Q2 to Q4). K5’s new password takes the same three lines.',
        '<b>No page says whether an email has an account.</b> Sign-in shows P1 → P2 to every email; P3, P4 and P6 are worded to hold either way. '
        '<s>S4</s>, <s>H1</s>, <s>H2 after a code</s>, <s>U4</s> and J1 and J4 (which hung off U4) are retired. The calm pointer: <i>How to join</i> on sign-in, <i>Sign in</i> on sign-up.',
        '<b>Sign-up without an invitation explains the rule, not the email:</b> R1, the shipped invite-only page, with no form.',
        '<b>Google:</b> an uninvited sign-up is refused before Google opens (R2 → R3); on sign-in, a Google account with nothing to sign in to gets G1’s line. M2 (a matching account signs in) stands.',
        '<b>/join:</b> the shipped <i>You already have an account</i> after a /join code (<code>joinCopy.haveAccountTitle</code>) goes too; /join always continues to sign-up (Q1), and a taken email gets R3.',
        '<b>A1b’s N1</b> (a password Clerk refuses at sign-in) stands, with the audit’s tightening: <i>This password can’t be used. Reset it to sign in.</i>',
    ]))
    return L.doc('Small items 11 · A2 · Invite-only on Clerk', HELM + FONTS_TH + CSS, ''.join(S), 2760)
