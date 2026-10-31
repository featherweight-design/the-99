"""States 4–6 · the Hidden list: several, empty, unhiding and the row's return."""
import lib as L

def hidden_page(rows, w='p', n=3):
    if w == 'p':
        h = ('<div class="pgh"><p class="t">Hidden</p><p class="s">commanders you hid</p></div>'
             f'<p class="cnt" style="margin-top:12px">{n} hidden · newest first</p>')
    else:
        h = ('<div class="pgh"><p class="t">Hidden</p><p class="s">commanders you hid</p></div>'
             f'<p class="cnt">{n} hidden · newest first</p>')
    return h + f'<div class="hlist">{rows}</div>'

def empty(w='p'):
    hd = '<div class="pgh"><p class="t">Hidden</p><p class="s">commanders you hid</p></div>'
    if w == 'p':
        hd += '<div style="height:12px;border-bottom:1px solid var(--border)"></div>'
    z = ('<div class="zs"><div class="dr"><i></i><i></i><i></i></div><h3>Nothing hidden</h3>'
         f'<p>Press <span class="inl" style="color:var(--fg-faint)"><span style="display:inline-block;width:15px;height:15px">{L.EYE_OFF}</span></span> on a commander in For you or Discover, or on its page, and it waits here until you bring it back.<span class="draft">DRAFT</span></p></div>')
    return hd + z

THREE = (L.hrow('ghalta', 'Hidden Oct 31') + L.hrow('ashling', 'Hidden Oct 29') + L.hrow('zada', 'Hidden Oct 29'))

def build():
    body = L.head('Hide a commander · R1 · account 2 · 2026-10-31', 'States 4–6 · The Hidden list',
        '<b>Where it lives:</b> a fourth tab on the Commanders strip, <b>Hidden</b> (<code>/commanders/hidden</code>), beside the three lists it takes from. '
        'The tab is always there, so a reader finds it before hiding anything, and it carries the strip’s shipped count once something is hidden. '
        '<b>The row</b> is Help me choose’s result row (<code>choose-row.tsx</code>: 40px card face, name and pips, <code>--surface-rail</code>), with one line under the name and <b>Unhide</b> where the figures were. '
        'Newest first. The row opens the commander’s page; Unhide is the only other control.')
    body += '<div class="frames">'
    body += L.fr('<b>4 · Hidden</b> · 390 · three hidden', L.phone(hidden_page(THREE), strip_on='hidden', head=None, count=3),
                 'No rack: the list is short and the reader is looking for one name. <b>Unhide</b> is the builder’s text button in the accent, 44px tall.')
    body += L.fr('<b>5 · Hidden</b> · 390 · empty', L.phone(empty(), strip_on='hidden', head=None, count=None),
                 'The shared zero state (<code>zero-state.tsx</code>): diamond rule, heading, one sentence that draws the plate it names. No button: the tabs beside it are the way out. The tab has no count.')
    six = (L.hrow('ghalta', 'back in For you', state='gone', name='Ghalta, Primal Hunger') + L.hrow('ashling', 'Hidden Oct 29') + L.hrow('zada', 'Hidden Oct 29'))
    body += L.fr('<b>6 · Hidden</b> · 390 · just unhidden', L.phone(hidden_page(six, n=2), strip_on='hidden', head=None, count=2),
                 'Unhide turns the row into the same Undo row, saying where it went: <i>back in For you</i> (or <i>back in Discover</i> for one the reader doesn’t own). Undo hides it again. Gone when the reader leaves the tab.')
    back = '<div class="list">' + L.crow('zimone', 1, 'rest') + L.crow('ghalta', 2, 'rest') + '</div>'
    body += L.fr('<b>6 · For you</b> · 390 · its return', L.phone(back, count=2),
                 'Back in the list at whatever rank it scores now, here 2 (it was 1 before it was hidden: a deck built since moved Zimone up). No mark, no “new”: it is just a row again.')
    t = L.toast('We couldn’t unhide Ghalta, Primal Hunger. Try again.<span class="draft">DRAFT</span>')
    body += L.fr('<b>12 · Unhide failed</b> · 390', L.phone(hidden_page(THREE), strip_on='hidden', head=None, count=3, toast=t),
                 'The row stays in Hidden as it was, with the shared toast and Try again.')
    body += '</div><div class="frames">'
    body += L.fr('<b>4 · Hidden</b> · desktop 1300 · three hidden', L.desk(hidden_page(THREE, 'd'), strip_on='hidden', head=None, count=3),
                 'Desktop: the place head and strip as shipped, then the page header in its desktop row. Rows in Help me choose’s 720 column, so Unhide stays near the name.')
    six_d = (L.hrow('ghalta', 'back in For you', state='gone', name='Ghalta, Primal Hunger') + L.hrow('ashling', 'Hidden Oct 29') + L.hrow('zada', 'Hidden Oct 29'))
    body += L.fr('<b>6 · Hidden</b> · desktop 1300 · just unhidden', L.desk(hidden_page(six_d, 'd', n=2), strip_on='hidden', head=None, count=2),
                 'The Undo row in the same column.')
    body += '</div><div class="frames">'
    body += L.fr('<b>5 · Hidden</b> · desktop 1300 · empty', L.desk(empty('d'), strip_on='hidden', head=None, count=None),
                 'The zero state centred under the header.')
    body += '</div>'
    return L.doc('Hide · Hidden list', body, 2900)
