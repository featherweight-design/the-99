"""Item 4 · custom sign-in and sign-up on Clerk. Helmet: small_items_7/Sign-In (the newcomer frame as drawn)."""
import lib11 as L

SRC = "design_handoff_the99_small_items_7/Sign-In.dc.html"
HELM = L.src_helmet(SRC)
CSS = """<style>
.board .jbtn.busy{opacity:.6}
.board .s7err{margin-top:10px}
.board .flow9{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font:11px 'IBM Plex Mono';color:var(--fg-muted);max-width:1500px}
.board .flow9 span{border:1px solid var(--border-strong);border-radius:6px;padding:5px 9px;color:var(--fg-body)}
.board .flow9 span.n{border-style:dashed;border-color:var(--accent);color:var(--fg)}
.board .flow9 i{font-style:normal;color:var(--fg-faint)}
</style>"""

BACK = ('<div class="cc"><div class="bk"><div><span class="cw">◆ ◆ ◆</span><b>99</b><small>Welcome back</small></div></div></div>')
INVITE = ('<div class="cc tilt" style="position:relative"><div class="fc"><div class="ii"><div class="nb">The 99</div><div class="ar"><span class="cw">◆ ◆ ◆</span>'
          '<b>99</b></div><div class="tl"><span>Invitation</span><i>◆</i></div><div class="rx">Build Commander decks from the cards you already own.</div>'
          '<div class="ftl"><span>The 99</span><span>XCIX</span></div></div></div></div>')
LEGAL = '<div class="s7legal"><a>Terms</a><a>Privacy</a></div>'


def col(h1, body, form, after=''):
    return f'<div class="jcol"><h1>{h1}</h1><p class="bd">{body}</p><div class="jform">{form}</div></div>{after}'


def ph(card, column):
    return f'<div class="ph" style="height:844px"><div class="pb"><div class="jn">{card}{column}</div></div></div>'


def dk(card, column):
    return f'<div class="dk" style="width:1300px;height:780px"><div class="main"><div class="jn">{card}{column}</div></div></div>'


EM = '<em>sam@example.com</em>'
S4 = col('No account for that email', f'{EM} isn’t on The 99 yet. The code proved it’s yours, so you can make one now.',
         '<span class="jbtn">Use this email</span><div class="jlinks"><span>Use a different email</span></div>')
CLOSED = col('The 99 is invite-only',
             f'{EM} isn’t on The 99 yet. You join when someone already playing invites you. Ask a friend who plays: they’ll find <em>Invite someone new</em> under Add a friend.',
             '<span class="jbtn" style="background:transparent;border:1px solid var(--border-strong);color:var(--fg)">Use a different email</span>',
             '<p class="jquiet">Have an invitation email? Open its link to make your account.</p>')
TICKET = col('That’s your email', f'{EM} has an invitation. Now the name your friends will know you by. {L.DRAFT}',
             '<label>Your first name</label><span class="jfld on">Sam</span><p class="s7hint">Friends see it on your signature card. Change it any time in Settings.</p>'
             '<span class="jbtn">Make my account</span>', LEGAL)
U3_BUSY = col('That’s your email', 'Now the name your friends will know you by.',
              '<label>Your first name</label><span class="jfld">Sam</span><p class="s7hint">Friends see it on your signature card. Change it any time in Settings.</p>'
              '<span class="jbtn busy">Making your account…</span>', LEGAL)
U4_BUSY = col('You already have an account', f'{EM} is already on The 99. The code proved it’s yours, so Sign in goes straight in.',
              '<span class="jbtn busy">Signing in…</span><div class="jlinks"><span>Use a different email</span></div>')
U3_FAIL = col('That’s your email', 'Now the name your friends will know you by.',
              '<label>Your first name</label><span class="jfld on">Sam</span><p class="s7hint">Friends see it on your signature card. Change it any time in Settings.</p>'
              '<span class="jbtn">Make my account</span><p class="s7err" role="alert">We couldn’t do that. Try again.</p>', LEGAL)
U4_EXP = col('You already have an account', f'{EM} is already on The 99. The code proved it’s yours, so Sign in goes straight in.',
             '<span class="jbtn">Send a new code</span><p class="s7err" role="alert">That code has expired. Send a new one.</p>'
             '<div class="jlinks"><span>Use a different email</span></div>')


def build():
    S = [L.head('Small items 11 · R1 · account 2 · 2026-11-08 · item 4 · sign-in on Clerk',
                'Sign in and sign up on Clerk, invitation-only for now',
                'Small items 7’s pages stand: S1 to S5 and U1 to U5, the newcomer frame, the email code, no password. Engineering’s finding moves S4 and U4 onto '
                'Clerk’s own transfer (<code>signUpIfMissing</code> + <code>transfer: true</code>), proven on the dev instance before any screen is built. This board draws only '
                'what the transfer and invitation-only sign-up add: the uninvited email, the invitation-ticket arrival, the in-flight press and a transfer that fails. '
                'Shipped strings wherever one exists (<code>joinCopy</code>, <code>inviteOnlyCopy</code>); the rest is DRAFT.')]
    S.append(L.sec('H · Where each email goes after its code'))
    S.append('<div class="flow9"><span>S1 email</span><i>→</i><span>S2 code</span><i>→</i><span>has an account: in</span><i>|</i>'
             '<span class="n">no account, invited: S4 → U3</span><i>|</i><span class="n">no account, not invited: H2</span>'
             '<i>·</i><span>U1 sign-up email</span><i>→</i><span>code</span><i>→</i><span>has an account: U4</span>'
             '<i>·</i><span class="n">invitation link: H3 (no code)</span></div>')
    S.append(L.frames(
        L.fr('<b>H1</b> · 390 · S4, an invited email', ph(BACK, S4),
             '<b>S4 stands</b>, for an email Clerk holds an invitation for (and for every email once Hugh opens sign-up). The press reads <b>Use this email</b>, '
             'engineering’s cap fix. It leads to U3 (<i>Your first name</i>), then the transfer makes the account with no second code.', w=390),
        L.fr('<b>H2</b> · 390 · S4, sign-up closed, not invited', ph(BACK, CLOSED),
             'Replaces S4 while sign-up is invitation-only: the shipped <code>inviteOnlyCopy</code> title, line and fine print, after the email the code just proved. '
             'One press, <b>Use a different email</b>, back to S1. No sign-up offered, no dead button.', w=390),
        L.fr('<b>H3</b> · 390 · arriving on an invitation link', ph(INVITE, TICKET),
             'The invitation email’s link (a Clerk ticket) proves the email, so it skips the code and lands on <b>U3</b> with the invited email named in the body. '
             '<b>Make my account</b> signs up with the ticket and lands on Home with the welcome strip. A <code>/join</code> invite that reaches sign-up lands here too.', w=390),
        L.fr('<b>H4</b> · 1300 · H2 at desktop', dk(BACK, CLOSED), 'The S5 frame: the card left, one column.', w=1300),
    ))
    S.append(L.sec('J · Between the code and the account'))
    S.append(L.frames(
        L.fr('<b>J1</b> · 390 · U4, Sign in pressed', ph(BACK, U4_BUSY),
             '<b>No new screen.</b> The transfer runs behind the press, which dims and reads <b>Signing in…</b> until the page lands, as Confirm reads <i>Confirming…</i>. '
             'A brief “Signing you in” page would flash for well under a second.', w=390),
        L.fr('<b>J2</b> · 390 · U3, Make my account pressed', ph(INVITE, U3_BUSY),
             'The same for a sign-up by transfer or by ticket: <b>Making your account…</b>, the name field locked while it runs.', w=390),
        L.fr('<b>J3</b> · 390 · Clerk refused, or the line dropped', ph(INVITE, U3_FAIL),
             'The shipped <code>joinCopy.failed</code> under the press, in the <code>codeWrong</code> slot; the press stays <b>Make my account</b> and runs the transfer again. '
             'The name keeps its text.', w=390),
        L.fr('<b>J4</b> · 390 · the code expired mid-transfer', ph(BACK, U4_EXP),
             'The verified sign-in is gone, so trying again cannot work. The shipped <code>codeExpired</code> line, and the press becomes <b>Send a new code</b>: '
             'it resends to the same email and returns to S2. Use a different email stays.', w=390),
    ))
    S.append(L.rule('Rulings for item 4', [
        '<b>S4 and U4 stand as drawn</b> in Small items 7, on Clerk’s transfer. If the dev-instance spike fails either transfer, this item comes back to Design.',
        '<b>Invitation-only:</b> after a proven code with no account, an invited email gets S4, any other gets H2. Sign-up (U1) is reached only by an invitation; '
        'the S1 foot <i>New to The 99? Make an account</i> stays hidden until sign-up opens (Hugh’s launch call).',
        '<b>The ticket path reuses U3</b> (H3), with no code step.',
        '<b>No interstitial.</b> The press carries the wait (J1, J2); a failure stays on the page under the press (J3, J4).',
        '<b>Methods:</b> <s>email code only</s>. Withdrawn by Hugh 2026-11-08: sign-in keeps Google, email and password, and the emailed code. See addendum A1 (<code>Sign-In-Methods</code>).',
    ]))
    return L.doc('Small items 11 · 4 · Sign-in on Clerk', HELM + CSS, ''.join(S), 1900)
