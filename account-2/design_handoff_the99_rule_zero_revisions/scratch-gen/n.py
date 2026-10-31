"""6 · The notice: the in-app toast on any other screen, and the push."""
import lib as L, re
S = L.load('design_handoff_the99_push/Notifications.dc.html')
LKS = L.first(L.frame(S, '<b>iPhone</b> · lock screen'), '<div class="lks"')
MAC = L.first(L.frame(S, '<b>A computer</b> · macOS banner'), '<div class="mac"')
ICON = 'art/app-icon.png'

CSS = """<style>
.zshot{position:relative;flex:none;overflow:hidden;border:1px solid var(--border-strong);background:var(--bg)}
.zshot>img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.zshot.p{width:390px;height:844px;border-radius:34px}
.zshot.d{width:1300px;height:900px;border-radius:12px}
.znt{position:absolute;z-index:12;display:flex;align-items:center;gap:10px;min-height:56px;padding:8px 4px 8px 10px;border-radius:12px;background:var(--elevated);border:1px solid var(--border-strong);box-shadow:0 16px 40px rgba(0,0,0,.6);font:13.5px/1.4 'IBM Plex Sans';color:var(--fg-body)}
.znt b{color:var(--fg);font-weight:600}
.znt .g{flex:none;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);border:1px solid color-mix(in srgb,var(--accent) 40%,transparent)}
.znt .w{flex:1;min-width:0}
.znt .o{flex:none;font-weight:600;color:var(--accent-text);padding:0 8px;min-height:40px;display:flex;align-items:center;text-decoration:underline;text-underline-offset:4px;text-decoration-color:color-mix(in oklab,var(--accent) 50%,transparent)}
.znt .x{flex:none;width:36px;height:40px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:13px}
.zns{position:absolute;z-index:12;display:flex;flex-direction:column;gap:8px}
.zns .znt{position:relative}
</style>"""
GLYPH = ('<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">'
         '<ellipse cx="10" cy="10.5" rx="5.2" ry="3.4"/><circle cx="10" cy="3.4" r="1.6"/><circle cx="10" cy="17.6" r="1.6"/>'
         '<circle cx="2.6" cy="10.5" r="1.6"/><circle cx="17.4" cy="10.5" r="1.6"/></svg>')


def notice(host='Colin', pod='Thursday night', cls='znt znew', style=''):
    return (f'<div class="{cls}" role="status" style="{style}"><span class="g">{GLYPH}</span>'
            f'<span class="w"><b>{host}</b> seated you at <b>{pod}</b>’s table.</span><span class="o">Open</span><span class="x">✕</span></div>')


def cap(img, kind, over):
    return f'<div class="zshot {kind}"><img src="art/{img}" alt="">{over}</div>'


P_SLOT = 'left:12px;right:12px;bottom:86px'
D_SLOT = 'right:22px;bottom:22px;width:380px'


def lock():
    x = re.sub(r'<div class="stk">.*?</div></div></div></div>', '', LKS, count=1, flags=re.S)
    ntf = (f'<div class="stk"><div class="ntf znew"><img class="ai" src="{ICON}" alt=""><div class="tx"><div class="tp"><span>The 99</span><small>now</small></div>'
           '<div class="bd"><b>Colin seated you at Thursday night’s table</b><br>You’re seated with Ghalta Stompy.</div></div></div></div>')
    x = x.replace('<div class="hint">', ntf + '<div class="hint">', 1)
    x = re.sub(r'<small>[^<]*</small><b>9:02</b>', '<small>Thursday 30 October</small><b>21:14</b>', x)
    return x.replace('Tap one to open it in The 99', 'Tap it to open the table')


def mac():
    x = re.sub(r'<div class="mstk">.*</div></div></div>(?=<span class="slab")', '', MAC, count=1, flags=re.S)
    b = (f'<div class="mstk"><div class="mban znew"><img class="ai" src="{ICON}" alt=""><div class="tx"><div class="tp"><span>The 99</span><small>now</small></div>'
         '<div class="sub2">the-99.dev</div><div class="bd"><b>Colin seated you at Thursday night’s table</b><br>You’re seated with Ghalta Stompy.</div></div></div></div>')
    x = x.replace('<span class="slab"', b + '<span class="slab"', 1)
    return re.sub(r'Thu 23 Oct 14:10', 'Thu 30 Oct 21:14', x)


def build():
    body = L.head('6 · The notice and the push',
                  '“Colin seated you at Thursday night’s table”',
                  'Ruling 6: a seated player gets a push and an in-app notice, and only seated players see the table. '
                  'In the app the notice is the shared toast, drawn here over the shipped Collection and Decks pages (captures); on Home the table card itself is the notice (Home board, H9 and H10). '
                  'The push uses the shipped push drawing (the push handoff’s lock screen and banner).')
    two = (f'<div class="zns" style="{P_SLOT}">' + notice('Peter', 'Tuesday crew') + notice() + '</div>')
    body += L.row(
        L.fr('<b>Proposed</b> · 390 · on another screen', cap('p-collection.webp', 'p', notice(style=P_SLOT)),
             '<b>The shared toast, with no clock.</b> In the toast slot above the tab bar: the table glyph on the Mark plate tint, the sentence, <i>Open</i>, and a bare ✕. It stays until you open it, ✕ it, or open the table another way, because a seat is an invitation, not a receipt.', 390),
        L.fr('<b>Proposed</b> · 390 · two at once', cap('p-decks.webp', 'p', two),
             '<b>One per table, stacked.</b> Seated at two pods’ tables, each table has its own toast, newest nearest the edge, 8px apart (the shipped stack). Each opens its own table.', 390),
        L.fr('<b>Proposed</b> · 390 · the push, lock screen', lock(),
             'The lock-screen line is the notice’s words as its title and your deck (or <i>Pick your deck at the table.</i>) under it. No card image, no actions. A tap opens <code>/friends/table/&lt;id&gt;</code> (Table board, T1).', 390))
    body += L.row(L.fr('<b>Proposed</b> · 1300 · on another screen', cap('d-collection2.webp', 'd', notice(style=D_SLOT)),
                       'Bottom right at 380, the shared toast’s desktop slot. <i>Open</i> lands on the table; ✕ dismisses it for good.', 1300))
    body += L.row(L.fr('<b>Proposed</b> · 1300 · the push, a computer', mac(),
                       'The same push as a browser banner, through the shipped push path.', 640))
    body += L.rule('The calls', [
        '<b>Form:</b> the shared toast on every screen but Home and the table itself. On Home the table card arriving at the top is the notice (no toast on top of it); on the table you are already there. Words (DRAFT, <code>/copy-review</code>): <i>{host} seated you at {pod}’s table.</i>, action <i>Open</i>.',
        '<b>No double:</b> one event shows once. With the app in front, the service worker hands the push to the page and shows no system notification; the page shows the toast. With the app closed, the system notification shows, and opening it lands on the table and marks the notice seen, so no toast follows.',
        '<b>Arrival in the app:</b> on the next navigation or focus, or at once when a push lands while the app is open (lane a6). It is not polled.',
        '<b>Dismissed:</b> ✕, <i>Open</i>, or opening the table any other way (the Home card, the pod row) clears it. It never comes back once seen.',
        '<b>The push and quiet hours:</b> the seat push is sent at once, through the 21:00–09:00 hold, because a table is for tonight; held until 9 am it would arrive after the table closed. It needs push on for the device. It is not one of the feed’s six kinds and adds no Settings tick: it only reaches someone a pod mate seated, once per seat. <b>Hugh to confirm.</b>',
        '<b>A seat changed or removed (brief state 12): no notice.</b> A seat moved to another deck shows on the table as shipped (the changed dot, Since you looked). A seat removed just loses the table: its Home card goes and the link answers not found. Only being seated notifies.'])
    return L.doc('Rule 0 revisions · The notice', L.helmet(S) + CSS, body, 2000)
