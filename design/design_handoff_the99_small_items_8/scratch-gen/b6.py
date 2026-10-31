"""Item 6 · Report a problem on the crash screen and at /report: carried from Small items 7 (addendum 8), plus the
states that board left out (send failed, sent at 1300, no error code)."""
import lib8 as L
s = L.load('design_handoff_the99_small_items_7/Report-Crash.dc.html')
def fb(lab):
    f = L.frame_by_label(s, lab)
    return f[f.find('</div>', f.find('<div class="lab">')) + 6:f.rfind('<p class="cap">')]
C1, C2 = fb('<b>C1</b>'), fb('<b>C2</b>')
R1, R2, R3 = fb('<b>R1</b> · /report · 390'), fb('<b>R2</b> · sent'), fb('<b>R3</b> · /report · 1300')

TYPED = [('<span class="rbx">What went wrong, in a sentence or two</span>', '<span class="rbx on">The deck page went blank when I pressed Apply 4 changes.</span>'),
         ('<span class="rbx sm">Which deck or page, and what you pressed</span>', '<span class="rbx sm on">Trying Suggested changes on Thopter Works.</span>'),
         ('<span class="bp dis">Send</span>', '<span class="bp">Send</span>')]
CSS = """<style>
.tst8{position:absolute;left:16px;right:16px;bottom:24px;z-index:60;display:flex;align-items:center;gap:14px;border-radius:10px;border:1px solid var(--border-strong);background:var(--elevated);padding:4px 6px 4px 16px;box-shadow:0 12px 40px rgba(0,0,0,.5)}
.tst8 span{flex:1;padding:8px 0;font-size:13.5px;color:var(--fg)}
.tst8 b{min-height:44px;display:flex;align-items:center;padding:0 12px;font:600 13.5px 'IBM Plex Sans';color:var(--accent-text);text-decoration:underline;text-underline-offset:2px}
.dk .tst8{left:50%;right:auto;width:420px;transform:translateX(-50%)}
</style>"""


def typed(f):
    for a, b in TYPED:
        f = L.sub1(f, a, b)
    return f


R4 = typed(R1)[:-6] + '<div class="tst8"><span>We couldn’t send that. Try again.</span><b>Try again</b></div></div>'
SENT = R2[R2.find('<div class="sent">'):]
SENT = L.block(SENT, 0)
a = R3.find('<div class="rf">')
R5 = R3[:a] + SENT + R3[a + len(L.block(R3, a)):]
R5 = R5.replace('<p class="code7">Sent with error 7f3a91c2</p>', '')
R6 = R1.replace('<p class="code7">Sent with error 7f3a91c2</p>', '')


def build():
    body = L.head('6 · Flyer · Report a problem when the app has crashed',
                  'Confirmed: drawn in Small items 7, with the three states it left out',
                  'Both undrawn versions were drawn in Small items 7, addendum 8 (<code>Report-Crash</code>, merged in #2499 but not built yet): '
                  'the root error page (<code>global-error.tsx</code>, no shell) with <b>Report a problem</b>, and <code>/report</code>, the shipped form on a page of its own. '
                  'They are carried here unchanged (C1, C2, R1–R3). New: the send failing, sent at 1300, and <code>/report</code> with no error code.')
    body += '<div class="frames" style="gap:44px;flex-wrap:wrap;row-gap:60px">'
    body += L.fr('<b>C1</b> · crash · 390 · carried', C1, 'The shipped <code>ErrorNotice</code> under the wordmark; its link reads Report a problem and goes to <code>/report?ref=&lt;digest&gt;</code>.')
    body += L.fr('<b>C2</b> · crash · 1300 · carried', C2, '')
    body += '</div><div class="frames" style="gap:44px;flex-wrap:wrap;row-gap:60px">'
    body += L.fr('<b>R1</b> · /report · 390 · carried', R1, 'The shipped form in the newcomer frame. Works signed out. The error code rides along.')
    body += L.fr('<b>R2</b> · sent · 390 · carried', R2, 'Close goes home.')
    body += L.fr('<b>R4</b> · send failed · 390 · new', R4, 'The shared toast with Try again, as the in-app sheet’s R6; the text stays. With no shell it sits 24px above the page’s bottom.')
    body += L.fr('<b>R6</b> · no error code · 390 · new', R6, '<code>/report</code> typed in or opened without <code>ref</code>: the code line is not drawn. Nothing else changes.')
    body += '</div><div class="frames" style="gap:44px;flex-wrap:wrap;row-gap:60px">'
    body += L.fr('<b>R3</b> · /report · 1300 · carried', R3, '')
    body += L.fr('<b>R5</b> · sent · 1300 · new', R5, 'The sent state in the same column. Close goes home.')
    body += '</div>'
    body += L.rule('The call', [
        '<b>Confirmed as Small items 7 drew it.</b> The crash screen draws the wordmark over the shipped <code>ErrorNotice</code>, no shell; <b>Report a problem</b> goes to <code>/report?ref=&lt;digest&gt;</code>. <code>/report</code> is the shipped form, whole, under <i>‹ Back home</i>, signed in or out, the error code sent with the report.',
        '<b>Send failed</b> is the shipped shared toast (<code>reportCopy.failed</code> with Try again), bottom centre, the typed text kept.',
        '<b>No <code>ref</code></b>: no code line, the report sent without one.',
        'The in-shell link and sheet (flyer trial <code>Report-Phone</code>, <code>Report-Desktop</code>) are unchanged. No new string.'])
    return L.doc('Small items 8 · Report a problem', L.helmet(s) + CSS, body, 2000)
