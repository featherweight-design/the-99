"""Item 3 · Flyer launch list, Download CSV fails: drawn over Small items 7's CSV board (C3 desktop, C4 phone)."""
import lib9 as L
c = L.load('small_items_7_CSV.dc.html')
SC = 'cv9'
C3 = L.screen(L.frame_by_label(c, '<b>C3</b>')).replace('height:420px', 'min-height:420px')
C4 = L.screen(L.frame_by_label(c, '<b>C4</b>'))
TOP_D = '<span class="acts"><span class="tb">Download CSV</span></span></div>'

ST = {
    'refused': ('The server refused the download. Reload the page and try again.', False),
    'off': ('The flyer trial is off now, so there’s nothing to download. Reload to see the page as it is.', False),
    'lost': ('Lost touch with the server, so nothing downloaded.', True),
}
CSS = """<style>
.cv9 .al9{margin:0;padding:0 14px 12px;display:flex;flex-wrap:wrap;align-items:baseline;column-gap:10px;row-gap:2px;font:12.5px/1.5 'IBM Plex Sans';color:var(--danger)}
.cv9 .ph .al9{padding:0 12px 12px}
.cv9 .al9 b{font-weight:400;color:var(--accent-text);min-height:32px;display:inline-flex;align-items:center}
.cv9 .ph .al9 b{min-height:44px}
.cv9 .busy9{opacity:.5}
.cv9 .ph .s7top{flex-wrap:wrap}
</style>"""


def state(scr, key):
    if key == 'busy':
        return L.sub1(scr, '<span class="tb">Download CSV</span>', '<span class="tb busy9">Download CSV</span>')
    txt, again = ST[key]
    al = f'<p class="al9 new9" role="alert"><span>{txt}</span>{"<b>Try again</b>" if again else ""}</p>'
    i = scr.find('<div class="s7top">')
    top = L.block(scr, i)
    return scr[:i] + top + al + scr[i + len(top):]


def build():
    b = L.head('3 · Admin · Invites · the launch list’s Download CSV',
               'When Download CSV fails, the card says so',
               'Today a refused, switched-off or lost download saves nothing and the button comes back, silently (<code>flyer-launch-csv.tsx</code>). '
               'Drawn over Small items 7’s CSV board (C3, C4): the admin’s own failure line, as the switch page’s writes and the launch date draw it, '
               '<code>role="alert"</code> in <code>--danger</code> 12.5/1.5 under the card’s top row. New lines are DRAFT.')
    b += L.sec('1300')
    b += L.frames(
        L.fr('<b>F1</b> · 1300 · pressed, the file being built', state(C3, 'busy'),
             'As shipped: the button holds (disabled) until the reply lands; a second press does nothing. Drawn at 50% so the hold reads.', SC, 760),
        L.fr('<b>F2</b> · 1300 · the server refused', state(C3, 'refused'),
             '<code>{ ok: false, error: "failed" }</code> from the export, or an admin check that refused. No Try again: the same press would be refused again.', SC, 760),
    )
    b += L.frames(
        L.fr('<b>F3</b> · 1300 · the trial switched off', state(C3, 'off'),
             '<code>error: "off"</code>: the flyer trial went off for this admin since the page loaded. On reload the section is gone, as shipped.', SC, 760),
        L.fr('<b>F4</b> · 1300 · the reply was lost', state(C3, 'lost'),
             'The action threw (network, deploy). Nothing saved, so <b>Try again</b> asks again. The line goes on the next press.', SC, 760),
    )
    b += L.sec('390')
    b += L.frames(
        L.fr('<b>F5</b> · 390 · refused', state(C4, 'refused'), 'The line wraps under the card’s top row; Download CSV stays where it is.', SC),
        L.fr('<b>F6</b> · 390 · switched off', state(C4, 'off'), '', SC),
        L.fr('<b>F7</b> · 390 · lost', state(C4, 'lost'), '<b>Try again</b> is 44 tall on the phone, as the card’s other text buttons.', SC),
    )
    b += L.rule('The call', [
        '<b>One line, under the launch card’s top row,</b> the admin’s inline failure (as <code>override-controls.tsx</code> and the launch date’s <code>saveFailed</code>): '
        '<code>role="alert"</code>, <code>--danger</code>, 12.5/1.5, card padding. Not the player toast: the admin never uses it.',
        '<b>Refused</b> (<code>failed</code>): <i>The server refused the download. Reload the page and try again.</i>' + L.DRAFT + ' No Try again.',
        '<b>Switched off</b> (<code>off</code>): <i>The flyer trial is off now, so there’s nothing to download. Reload to see the page as it is.</i>' + L.DRAFT,
        '<b>Lost</b> (thrown): <i>Lost touch with the server, so nothing downloaded.</i>' + L.DRAFT + ' + <b>Try again</b> (shipped <code>adminCopy.switch.tryAgain</code>).',
        'The line clears on the next press of Download CSV or Try again. Pending stays as shipped (the button held, no new label).'])
    return L.doc('Small items 9 · Launch list CSV', L.scope(L.helmet(c), SC) + CSS, b, 1440)
