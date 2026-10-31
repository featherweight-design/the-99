"""R2 · the deck page's dock: it stays the deck's search, says so, and sends a reader to the collection where it fails."""
from lib import *
from c import receipt

CSS_K = """<style>
.dock{position:absolute;left:0;right:0;height:66px;background:var(--bg);border-top:1px solid var(--border);display:flex;align-items:center;gap:12px;padding:0 16px;z-index:22}
.dock .f{flex:1;min-width:0;height:44px;border:1px solid var(--border-strong);border-radius:10px;display:flex;align-items:center;gap:10px;padding:0 12px;color:var(--fg-placeholder);font-size:15px;white-space:nowrap;overflow:hidden;background:var(--bg)}
.dock .f.on{border-color:var(--accent);color:var(--fg)}
.dock .f .caret{width:1.5px;height:19px;background:var(--accent);flex:none;margin-left:-8px}
.tog{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--fg-muted);white-space:nowrap}
.tog i{width:30px;height:17px;border-radius:999px;background:var(--elevated);position:relative;display:block}
.tog i::after{content:'';position:absolute;left:2px;top:2px;width:13px;height:13px;border-radius:50%;background:var(--fg-faint)}
.tog.on i{background:var(--accent)}.tog.on i::after{left:15px;background:var(--bg)}
.qp{position:absolute;left:0;right:0;background:var(--bg);border-top:1px solid var(--border);z-index:21;padding:12px 16px;display:flex;flex-direction:column;gap:6px;box-shadow:0 -14px 30px rgba(0,0,0,.4)}
.qe{display:flex;flex-direction:column;align-items:center;text-align:center;padding:18px 18px 10px;gap:8px}
.qe b{font:700 17px 'Cinzel',serif}
.qe p{font-size:13.5px;line-height:1.55;color:var(--fg-muted);max-width:420px}
.qe .ga{margin-top:6px;min-height:44px;border-radius:10px;border:1px solid var(--border-strong);padding:0 16px;display:inline-flex;align-items:center;gap:8px;font:500 14px 'IBM Plex Sans';color:var(--fg)}
.qe .ga span{color:var(--accent);display:flex}
.qe .lk{font:600 12.5px 'IBM Plex Sans';color:var(--accent);text-decoration:underline;text-underline-offset:3px;min-height:36px;display:flex;align-items:center}
.qrow{display:flex;align-items:center;gap:10px;min-height:56px;border-radius:9px;padding:8px 10px;background:var(--surface-inset)}
.qrow.lit{box-shadow:inset 0 0 0 1.5px var(--success)}
.qrow .th{width:32px;height:45px;border-radius:5px;overflow:hidden;flex:none}
.qrow .th img{width:100%;height:100%;object-fit:cover;display:block}
.qrow .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.qrow .tx b{font:600 14px 'IBM Plex Sans';white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qrow .tx span{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.qrow .tx span.up{color:var(--success)}
.qrow .ad{width:56px;height:44px;display:flex;align-items:center;justify-content:center;font:600 13px 'IBM Plex Sans';color:var(--accent)}
.qh{font:10px 'IBM Plex Mono';color:var(--fg-faint);padding:2px 2px 4px}
</style>"""

PH_NEW = 'Add a card by name · Naya only'
PH_OLD = 'Add a card by name · Naya only'

def dock(top, q='', owned=True, new_ph=False, w=None, left=0):
    if q:
        f = f'<span class="f on">{SEARCH}<span>{q}</span><span class="caret"></span></span>'
    else:
        f = f'<span class="f{" new" if new_ph else ""}">{SEARCH}<span>{PH_NEW if new_ph else PH_OLD}</span></span>'
    t = f'<span class="tog{" on" if owned else ""}"><i></i>Owned only</span>'
    if w:
        f = f.replace('<span class="f', '<span style="flex:none;width:520px;margin-left:14px" class="f', 1)
    st = f'top:{top}px' + (f';left:{left}px;right:auto;width:{w}px' if w else '')
    return f'<div class="dock" style="{st}">{f}{t}</div>'

def empty_state(q, desk=False):
    return (f'<div class="qe"><b>Nothing in the pile by that name</b><p>No card you own matches “{q}” in Gishath’s colors.</p>'
            f'<span class="ga new"><span>{svg(NAV["add"], 16, 1.6)}</span>Add a card to your collection</span>'
            '<span class="lk">Search all cards instead</span></div>')

def qrow(n, up=False, lit=False, add='Add'):
    meta = f'<span class="up">×{n} owned</span>' if n else '<span>not owned</span>'
    return (f'<div class="qrow{" lit" if lit else ""}"><span class="th"><img src="art/c-ghalta.jpg" alt=""></span>'
            f'<span class="tx"><b>Ghalta, Primal Hunger</b>{meta}</span><span class="ad">{add}</span></div>')

KTOP = 844 - 291 - 66  # the dock sits on the keyboard

def page():
    return cut('p-deck-your-deck.webp', 0, 0, 390, 770, 0, 0)

def k_rest():
    return ph(page() + dock(704) + tabbar('decks'))

def k_empty():
    panel = f'<div class="qp" style="top:{KTOP - 262}px;height:262px">{empty_state("ghalta")}</div>'
    return ph(page() + '<div class="scrim" style="z-index:20;background:rgba(20,17,14,.5)"></div>' + panel + dock(KTOP, 'ghalta') + kbd())

def k_sheet():
    body = ('<p class="smeta" style="padding:4px 0 0">1 card</p>' +
            '<div class="al"><div class="r1"><span class="th"><img src="art/c-ghalta.jpg" alt=""></span><span class="nm"><b><span style="color:var(--accent)">Ghalta</span>, Primal Hunger</b>'
            '<span style="font:10.5px IBM Plex Mono;color:var(--fg-faint)">Creature · not owned</span></span><span style="font-size:11px;color:var(--fg-muted)">↵ add</span></div></div>')
    return ph(page() + add_sheet(body, search_on=True, query='ghalta'))

def k_pick():
    body = list_head(1) + line('c-ghalta.jpg', 'Ghalta, Primal Hunger', need=True, picker=picker(6, GHALTA_TILES))
    return ph(page() + add_sheet(body, foot_sum='Choose Ghalta, Primal Hunger’s printing first', save='Save 0 copies'))

def k_saved():
    return ph(page() + add_sheet(receipt(1, 1, [('c-ghalta.jpg', 'Ghalta, Primal Hunger', 'FDC · #6 · ×1')]), save=None))

def k_back():
    panel = (f'<div class="qp" style="top:{KTOP - 98}px;height:98px"><p class="qh">1 match · Naya only</p>{qrow(1, lit=True)}</div>')
    return ph(page() + '<div class="scrim" style="z-index:20;background:rgba(20,17,14,.5)"></div>' + panel + dock(KTOP, 'ghalta') + kbd())

def k_in_deck():
    return ph(page() + ghalta_row(owned=True, lit=True).replace('{Y}', '0') + dock(704) + tabbar('decks'))

def k_all():
    panel = (f'<div class="qp" style="top:{KTOP - 98}px;height:98px"><p class="qh">1 match · Naya only</p>{qrow(0)}</div>')
    return ph(page() + '<div class="scrim" style="z-index:20;background:rgba(20,17,14,.5)"></div>' + panel + dock(KTOP, 'ghalta', owned=False) + kbd())

def k_off():
    panel = f'<div class="qp" style="top:{KTOP - 230}px;height:230px"><div class="qe"><b>Nothing in the pile by that name</b><p>No card you own matches “ghalta” in Gishath’s colors.</p><span class="lk">Search all cards instead</span></div></div>'
    return ph(page() + '<div class="scrim" style="z-index:20;background:rgba(20,17,14,.5)"></div>' + panel + dock(KTOP, 'ghalta', new_ph=False) + kbd())

# desktop: the dock in d-deck-list sits at y 840–900 over x 62–1300
def d_dock(q='', owned=True, new_ph=True):
    return dock(838, q, owned, new_ph, w=1237, left=62).replace('class="dock"', 'class="dock" ').replace('padding:0 16px', 'padding:0 30px')

def kd_empty():
    panel = f'<div class="qp" style="left:62px;right:0;top:620px;height:218px;padding:12px 30px">{empty_state("ghalta", True)}</div>'
    return dk(dcut('d-deck-list.webp', 0, 0, 1300, 900, 0, 0) + panel + dock(838, 'ghalta', w=1238, left=62))

def kd_back():
    from d import d_row
    panel = (f'<div class="qp" style="left:62px;right:0;top:732px;height:106px;padding:12px 30px"><p class="qh">1 match · Naya only</p>'
             f'<div style="width:560px">{qrow(1, lit=True, add="↵ add")}</div></div>')
    return dk(dcut('d-deck-list.webp', 0, 0, 1300, 900, 0, 0) + d_row(True) + panel + dock(838, 'ghalta', w=1238, left=62))

def build():
    b = head('R2 · Search adds, card details underneath, and the deck’s own search',
             'Two searches on a deck page, one job each',
             'Hugh picked <b>C with D under it</b> (2026-10-31) and asked how this reads beside the deck page’s own search, the dock at the foot of Your deck, which adds to the <i>deck</i>. '
             'Call: each search keeps one job, and the dock sends the reader to the collection at the one moment it fails them: '
             'a card they hold but haven’t logged, hidden by <i>Owned only</i>. No collection + on a dock row: two pluses on one row that add to different places is worse than two searches. '
             'Drawn over the shipped dock (<code>quick-add-bar.tsx</code>, <code>quickAddEmpty</code>).', tag='R2')
    b += '<h3 class="sec">Phone · 390 · the friend who just pulled Ghalta</h3>'
    b += frames(
        fr('<b>K1</b> · 390 · the dock, as shipped', k_rest(),
           'The placeholder stays as shipped (Hugh, R2 review): <i>Add a card by name · {identity} only</i> already names the deck’s colors, and the field’s name says “to this deck”. '
           'The search glyph in the header stays the collection’s way in.'),
        fr('<b>K2</b> · 390 · typed, Owned only on, nothing found', k_empty(),
           'He owns Ghalta in his hand, not in the app, so the shipped empty state shows. It gains one press, <b>Add a card to your collection</b> <span class="draft">DRAFT</span>, above the shipped <i>Search all cards instead</i>. Only with Owned only on: that is when the filter, not the catalog, is in the way.'),
        fr('<b>K3</b> · 390 · Add cards, the query carried', k_sheet(),
           'The shipped Add cards sheet opens with the dock’s query already in its search, so the result is waiting. Nothing is guessed: he picks the card.'),
        fr('<b>K4</b> · 390 · picked: printing step', k_pick(),
           'As shipped: the line opens its printing picker, no default, Save waits.'),
        fr('<b>K5</b> · 390 · saved', k_saved(),
           'The shipped receipt. Add more stays in the sheet for the rest of the pack; Done goes back.'),
    )
    b += frames(
        fr('<b>K6</b> · 390 · Done: back in the dock', k_back(),
           'The dock as he left it, query and Owned only kept, keyboard up. The search runs again and Ghalta is there, <b>×1 owned</b>, ringed, with the deck’s own <b>Add</b>. One more press and it is in the deck.'),
        fr('<b>K7</b> · 390 · added to the deck', k_in_deck(),
           'The shipped quick add: Ghalta lands in the list, owned (filled dot, no $). Two jobs, two presses, never a wrong guess about which search does what.'),
        fr('<b>K8</b> · 390 · Owned only off', k_all(),
           'Unowned cards show, as shipped, with the deck’s Add (it goes on the deck as to buy). No collection press on the row. Its name still opens card details (small items 2, 6b), where D’s <i>Add to collection</i> is.'),
        fr('<b>K9</b> · 390 · collection edit switch off', k_off(),
           'The shipped dock: the empty state with only <i>Search all cards instead</i>. Nothing moves.'),
    )
    b += '<h3 class="sec">Desktop · 1300</h3>'
    b += frames(
        fr('<b>K-D1</b> · 1300 · typed, nothing owned matches', kd_empty(),
           'The same empty state over the desktop dock, the same new press above the shipped link. It opens the 480px side sheet with the query carried.'),
        fr('<b>K-D2</b> · 1300 · back from the sheet', kd_back(),
           'Ghalta ×1 owned in the dock’s results, ↵ adds it to the deck. Behind, its row in the list already shows owned.'),
    )
    b += rule('R2 calls', [
        '<b>C, as drawn in R1:</b> a + on every search row, <i>Add several cards</i> above Recent cards, Done returns to the search as it was with the row reading ×1 owned.',
        '<b>D under it:</b> card details’ <i>Add to collection</i> on every surface with the shell, a friend’s deck included; not the public card page.',
        '<b>The dock is the deck’s.</b> Placeholder as shipped (Hugh, R2 review); no collection control on its rows; one bridge press in its Owned-only empty state that opens Add cards with the query carried and returns to the dock as it was.',
        '<b>Changed from my reply in the thread:</b> I said the bridge line would sit under not-owned rows when Owned only is off. Drawn, that put a collection press under every unowned row, a second control on a dense list. Off, the row’s name opens card details and D covers it (K8).',
        '<b>Still open:</b> C’s ⌘↵ shortcut in search (keep or drop).',
    ])
    return doc('Add card anywhere · R2 dock', CSS_K + b, 2240)
