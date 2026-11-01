"""5 · The table: landing, the host's Close, the confirm, and the closed table for host, guests and the morning."""
import lib as L, re
P = L.rz('R1 - Swap-Phone.dc.html'); DS = L.rz('R2 - Swap-Desktop.dc.html')
RP = L.rz('R1 - Read-Phone.dc.html'); RD = L.rz('R2 - Read-Desktop.dc.html')
LP = L.rz('R1 - Log-Phone.dc.html'); LD = L.rz('R2 - Log-Desktop.dc.html')

CSS = """<style>
.zclose{display:flex;align-items:center;justify-content:center;width:100%;min-height:44px;margin-top:2px;border:0;background:none;font:600 14px 'IBM Plex Sans';color:var(--danger)}
.zscrim{position:absolute;inset:0;z-index:20;background:color-mix(in oklab,var(--bg) 72%,transparent)}
.zsheet{position:absolute;left:0;right:0;bottom:0;z-index:21;background:var(--surface-raised);border-top:1px solid var(--border-strong);border-radius:18px 18px 0 0;padding:0 0 26px;box-shadow:0 -20px 50px rgba(0,0,0,.5)}
.zsheet .grip{width:36px;height:4px;border-radius:2px;background:var(--border-dashed);margin:9px auto 4px}
.zmh{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:8px 8px 0 20px}
.zmh b{font:600 16px/1.35 'IBM Plex Sans';color:var(--fg);padding-top:8px}
.zx{width:36px;height:36px;flex:none;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:14px}
.zcb{padding:6px 20px 0;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.zca{display:flex;flex-direction:column;gap:8px;padding:16px 20px 0}
.zca .btn.dan{background:var(--danger);color:#fff}
.zmod{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:21;width:480px;border-radius:14px;border:1px solid var(--border-strong);background:var(--surface-raised);box-shadow:0 40px 100px rgba(0,0,0,.7);padding-bottom:20px}
.zmod .zca{flex-direction:row;justify-content:flex-end}
.zgo{position:absolute;left:12px;right:12px;bottom:86px;z-index:12;display:flex;align-items:center;min-height:52px;padding:6px 16px;border-radius:12px;background:#29241F;border:1px solid var(--border-strong);box-shadow:0 16px 40px rgba(0,0,0,.6);font-size:13.5px;color:var(--fg)}
.closed .btn.full{width:100%}
.closed .zbtns{display:flex;flex-direction:column;gap:8px;align-items:center;width:100%;max-width:300px}
</style>"""


def fr_(s, lab):
    return L.frame(s, f'<span class="k">{lab}')


def ph(s, lab):
    return L.first(fr_(s, lab), '<div class="ph"')


def dk(s, lab):
    return L.first(fr_(s, lab), '<div class="dk"')


def grow(x, px):
    return re.sub(r'(<div class="(?:ph|dk)" style="[^"]*?height:)(\d+)px', lambda m: f'{m.group(1)}{int(m.group(2)) + px}px', x, count=1)


def morning(x):
    return x.replace('open until 9:40 pm tomorrow', 'open until 6:00 am tomorrow')


def notoast(x):
    return re.sub(r'<div class="toast".*?</div>', '', x, flags=re.S)


CLOSE_BTN = '<button class="zclose znew" type="button">Close the table</button>'


def host(x):
    x = notoast(morning(x))
    return L.sub1(x, '<button class="btn gho full" type="button">Log this game</button>',
                  '<button class="btn gho full" type="button">Log this game</button>' + CLOSE_BTN)


CONFIRM_T = 'Close Thursday night’s table?'
CONFIRM_B = 'Everyone seated loses the table now, and it can’t be opened again. Games already logged stay on each deck’s Games tab.'


def sheet():
    return ('<div class="zscrim"></div><div class="zsheet znew" role="dialog"><div class="grip"></div>'
            f'<div class="zmh"><b>{CONFIRM_T}</b><span class="zx">✕</span></div><p class="zcb">{CONFIRM_B}</p>'
            '<div class="zca"><button class="btn dan full">Close the table</button><button class="btn gho full">Keep it open</button></div></div>')


def modal():
    return ('<div class="zscrim"></div><div class="zmod znew" role="dialog">'
            f'<div class="zmh"><b>{CONFIRM_T}</b><span class="zx">✕</span></div><p class="zcb">{CONFIRM_B}</p>'
            '<div class="zca"><button class="btn gho sm">Keep it open</button><button class="btn dan sm">Close the table</button></div></div>')


def over(x, extra):
    return x[:-6] + extra + '</div>'


BODY_OLD = re.compile(r'<p>Tables last the night: Thursday night’s closed 24 hours after Colin set it\. Games logged from it stay on each deck’s Games tab\.</p>')
WORDS = {
    'host': 'You closed Thursday night’s table at 11:52 pm. Games logged from it stay on each deck’s Games tab.',
    'guest': 'Colin closed Thursday night’s table at 11:52 pm. Games logged from it stay on each deck’s Games tab.',
    'morning': 'Thursday night’s table closed the morning after Colin set it. Games logged from it stay on each deck’s Games tab.',
}


def closed(x, kind, log=False):
    x = BODY_OLD.sub(f'<p class="znew">{WORDS[kind]}</p>', x, count=1)
    if log:
        x = L.sub1(x, '<button class="btn gho" type="button">Back to Friends</button>',
                   '<div class="zbtns"><button class="btn gho full znew" type="button">Log this game</button>'
                   '<button class="btn gho full" type="button" style="border-color:transparent">Back to Friends</button></div>')
    return x


def build():
    t1, d1 = morning(ph(RP, 'T1 ')), morning(dk(RD, 'D1 '))
    hp = grow(host(ph(P, 'S2 ')), 48)
    hd = host(dk(DS, 'W2 '))
    l4, h3 = ph(LP, 'L4 '), dk(LD, 'H3 ')
    body = L.head('5 · The table · landing, Close and the end of the night',
                  'The host closes the table from its foot; the morning closes it otherwise',
                  'Ruling 5: the host can Close the table, and a table also ends on its own at the first 6:00 am in the host’s zone at least 4 hours after setup. '
                  'Drawn over the shipped table (T1/D1, S2/W2) and closed page (L4/H3). Thursday night, set by Colin; “host” is the setter (<code>set_by</code>), the one who can reseat.')
    body += L.row(
        L.fr('<b>T1</b> · 390 · the landing · a guest', t1,
             '<b>Where the push and the notice land.</b> The shipped table, opened on your seat’s read; nothing new on the page. A guest has no Close: the foot ends at Log this game (brief state 16). The meta line now reads <i>open until 6:00 am tomorrow</i>.', 390),
        L.fr('<b>C1</b> · 390 · the host', hp,
             'Colin’s phone a minute after his swap (S2). <b>Close the table</b>, a text button in <code>--danger</code> under Log this game, setter only. At the foot because the night ends after the last game is logged; the head keeps Seats alone.', 390),
        L.fr('<b>C2</b> · 390 · the confirm', over(hp, sheet()),
             '<b>Confirmed, because it can’t be undone.</b> The shipped sheet, sized to its rows: the question, one sentence, <i>Close the table</i> (danger) over <i>Keep it open</i>. ✕, the scrim or Keep it open leave it open.', 390),
        L.fr('<b>C3</b> · 390 · the host, after', closed(l4, 'host', log=True).replace('<span class="av">HH</span>', '<span class="av">CO</span>'),
             'The page turns into the closed table at once and says who closed it and when. <b>Log this game stays (recommended, for Hugh):</b> a host-closed table keeps it for its seated players until the morning time it would have reached, pre-filled as shipped (L2), so closing on the way out the door strands no one who hadn’t logged. After the morning end it goes; logged games always stay.', 390))
    body += L.row(
        L.fr('<b>C4</b> · 390 · a guest on the page when it closes', closed(l4, 'guest', log=True),
             '<b>Found by the next check.</b> Peter’s page (20 second poll, focus or refresh) redraws as the closed table, naming Colin and the time. No toast: the page itself is the news. A guest opening the link later sees the same.', 390),
        L.fr('<b>C5</b> · 390 · nobody closed it · the morning', closed(l4, 'morning'),
             '<b>The errata words.</b> The closed table at 6:00 am. A host-closed table and a morning-closed table read differently: one names the closer and the time, the other says <i>the morning after</i>.', 390))
    body += L.row(L.fr('<b>D1</b> · 1300 · the landing · a guest', d1, 'The read’s column ends at Log this game for every seat but the host.', 1300))
    body += L.row(L.fr('<b>C1</b> · 1300 · the host', hd, '<b>Close the table</b> closes the read’s column, under Log this game, setter only.', 1300))
    body += L.row(L.fr('<b>C2</b> · 1300 · the confirm', over(hd, modal()),
                       '<code>ModalChrome</code> 480: the question in the head with a bare ✕, the sentence, then Keep it open and Close the table (danger) at the right.', 1300))
    body += L.row(L.fr('<b>C3–C4</b> · 1300 · closed by the host', closed(h3, 'guest', log=True),
                       'The closed table centered in the page as shipped, the closer named. The host’s reads <i>You closed…</i>.', 1300))
    body += L.row(L.fr('<b>C5</b> · 1300 · the morning', closed(h3, 'morning'), 'The same page with the errata words.', 1300))
    body += L.rule('The calls', [
        '<b>Close lives on the table only</b>, at the foot (phone: under Log this game; desktop: closing the read’s column), for the setter. Not on Home’s card (a door, not a control) and not on the pod row. A non-host never sees it.',
        '<b>Confirm:</b> yes, since a closed table cannot be reopened; to play on, the host sets up again. Phone: the shipped Sheet (fit); from <code>md</code> <code>ModalChrome</code> 480. If the close fails, the shared toast says <i>We couldn’t close the table. Try again.</i>' + L.DRAFT + ' and the table stays.',
        '<b>After:</b> the host’s page becomes the closed table at once; every other seat’s page on its next check; the pod row returns to Rule 0 check and Home’s card is gone on the next load.',
        '<b>Closed copy</b> (DRAFT for <code>/copy-review</code>, besides the errata line): <code>expired.bodyClosedByYou(pod, time)</code> <i>You closed {pod}’s table at {time}.</i> and <code>expired.bodyClosedBy(closer, pod, time)</code> <i>{closer} closed {pod}’s table at {time}.</i>, each followed by the logged-games sentence. The title stays <i>This table has closed</i>. Confirm: <i>Close {pod}’s table?</i>, the sentence above, <i>Close the table</i>, <i>Keep it open</i>.',
        '<b>For Hugh:</b> C3/C4, keeping Log this game on a host-closed table until the morning time (engineering: the seats’ snapshot is kept to that time; no one sees the table but the log form’s pre-fill).'])
    return L.doc('Rule 0 revisions · Close and the end', L.helmet(P) + CSS, body, 2000)
