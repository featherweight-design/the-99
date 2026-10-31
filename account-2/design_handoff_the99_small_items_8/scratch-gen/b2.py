"""Item 2 · Sign-up with a ticket (invite QR, invitation email, flyer): the name step in the ticket's own frame."""
import lib8 as L
s = L.load('design_handoff_the99_flyer_trial/Join-Phone.dc.html')
d = L.load('design_handoff_the99_flyer_trial/Join-Desktop.dc.html')
V3 = L.frame_by_label(s, '<b>V3</b>')
V3 = V3[V3.find('<div class="ph"'):V3.rfind('<p class="cap">')]
DV1 = L.frame_by_label(d, '<b>V1</b>')
DV1 = DV1[DV1.find('<div class="dk"'):DV1.rfind('</div>')]

FLY_CARD = V3[V3.find('<div class="cc tilt">'):V3.find('<div class="jcol">')]
INV_CARD = ('<div class="cc tilt"><div class="fc"><div class="ii"><div class="nb">Colin</div>'
            '<div class="ar art8"><img class="a8" src="art/crop-ghalta.jpg" alt=""></div>'
            '<div class="tl"><span>Invitation</span><i>◆</i></div>'
            '<div class="rx">Join The 99 as Colin’s friend. Your decks and your collection stay yours.</div>'
            '<div class="ftl"><span>The Ninety-Nine</span><span>XCIX</span></div></div></div>{badge}</div>')
BADGE = '<span class="bdg2">✓</span>'
D8 = '<span class="draft8">DRAFT</span>'

CSS = """<style>
.cc .ar.art8{position:relative;overflow:hidden;padding:0}
.cc .ar.art8 img.a8{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 30%;display:block}
.s8hint{margin-top:6px;font-size:12.5px;line-height:1.45;color:var(--fg-muted)}
.s8legal{display:flex;justify-content:center;gap:16px;margin-top:16px;font:11.5px 'IBM Plex Mono';color:var(--fg-muted)}
.s8legal a{color:var(--fg-muted);text-decoration:underline;text-underline-offset:3px}
.jform .lk8{font:13px 'IBM Plex Sans';color:var(--fg-locked)}
.jfld.lock{color:var(--fg-muted);justify-content:space-between;font-family:'IBM Plex Sans',sans-serif}
.jfld.lock small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.jform label+label,.jform .gap8{margin-top:16px}
</style>"""


def col(h1, bd, email=None):
    em = ''
    if email:
        em = (f'<label>Your email</label><span class="jfld lock">{email}<small>from the invitation</small></span>'
              '<label class="gap8">Your first name</label>')
    else:
        em = '<label>Your first name</label>'
    return (f'<div class="jcol"><h1>{h1}</h1><p class="bd">{bd}</p><div class="jform">{em}<span class="jfld on">Sam</span>'
            '<p class="s8hint">Friends see it on your signature card. Change it any time in Settings.</p>'
            '<span class="jbtn">Make my account</span></div><div class="s8legal"><a>Terms</a><a>Privacy</a></div></div>')


def phone(card, column):
    return V3.replace(V3[V3.find('<div class="cc tilt">'):V3.find('</div></div></div>', V3.find('<div class="jcol">')) + 6], card + column, 1) if False else \
        V3[:V3.find('<div class="cc tilt">')] + card + column + '</div></div></div>'


def desk(card, column):
    a = DV1.find('<div class="cc tilt">')
    return DV1[:a] + card + column + '</div></div></div>'


QR_BD = 'Now the name your friends will know you by. You’ll join as Colin’s friend.'
FLY_BD = 'Now the name your friends will know you by. You start with 15 welcome credits and 3 invites.'
MAIL_BD = 'The invitation proved your email. Now the name your friends will know you by.'

T1 = phone(INV_CARD.format(badge=BADGE), col('That’s your email', QR_BD))
T2 = phone(FLY_CARD, col('That’s your email', FLY_BD))
T3 = phone(INV_CARD.format(badge=''), col('Colin invited you to The&nbsp;99', MAIL_BD, 'sam@example.com'))
DT1 = desk(INV_CARD.format(badge=BADGE), col('That’s your email', QR_BD))
DT3 = desk(INV_CARD.format(badge=''), col('Colin invited you to The&nbsp;99', MAIL_BD, 'sam@example.com'))


def build():
    body = L.head('2 · Sign-up · arriving with a ticket',
                  'A ticket brings its own card to the name step',
                  'At launch an account is made only with a ticket: an invite QR or a flyer (both <code>/join</code>, email and code first), '
                  'or an invitation email’s link (its ticket proves the address). Today each ends by handing over to Clerk’s hosted sign-up. '
                  'With the custom pages (Small items 7, item 5) the hand-over is gone: the name step is drawn on the page the reader is already on, '
                  'under the ticket’s card, in place of <b>Continue to sign-up</b>. Drawn over the shipped newcomer frame (flyer trial <code>Join-Phone</code> V3, <code>Join-Desktop</code>).')
    body += '<div class="frames" style="gap:44px;flex-wrap:wrap;row-gap:60px">'
    body += L.fr('<b>T1</b> · invite QR · 390', T1,
                 f'After the code on <code>/join/&lt;token&gt;</code>. The sender’s card stays, with its ✓. {D8} body names who they join beside.')
    body += L.fr('<b>T2</b> · flyer · 390', T2,
                 f'After the code on <code>/join/&lt;CODE&gt;</code>. The flyer’s own card; the body keeps what they start with. {D8}')
    body += L.fr('<b>T3</b> · invitation email · 390', T3,
                 f'The email’s link opens <code>/sign-up?__clerk_ticket=…</code>. The ticket proves the address, so there is no code step: '
                 f'the email shows locked and the name is the one field. Title is the shipped <code>joinCopy.title</code>. {D8}')
    body += '</div><div class="frames" style="gap:44px;flex-wrap:wrap;row-gap:60px">'
    body += L.fr('<b>T1</b> · invite QR · 1300', DT1, 'The flyer (T2) is the same at 1300, with its own card.')
    body += L.fr('<b>T3</b> · invitation email · 1300', DT3, '')
    body += '</div>'
    body += L.rule('The call', [
        '<b>One name step, three tickets.</b> The field, hint, press and legal links are the Small items 7 U3 step (<i>Your first name</i>, <i>Make my account</i>, <code>LegalLinks</code>). What changes is the frame: the ticket’s card and title stay on screen, so the reader never leaves the page they arrived on.',
        '<b>Invite QR and flyer</b> keep <i>That’s your email</i> (shipped <code>okTitle</code>). The body becomes the name ask plus the one fact the ticket gives: Colin’s friend, or 15 welcome credits and 3 invites. <code>toSignUp</code> and the hand-over retire.',
        '<b>Invitation email.</b> No code: Clerk’s ticket proves the address. The email shows locked with <i>from the invitation</i>; the press makes the account and lands on Home with the welcome strip, already Colin’s friend.',
        '<b>Errors stay shipped:</b> a used or ended ticket draws the card face down (invites N12, flyer E1–E3); an address that already has an account gets <i>You already have an account</i> (U4).',
        '<b>Drafts</b> for <code>/copy-review</code>: the three body lines and <i>from the invitation</i>.'])
    helm = L.helmet(s) + CSS
    return L.doc('Small items 8 · Ticket sign-up', helm, body, 2000)
