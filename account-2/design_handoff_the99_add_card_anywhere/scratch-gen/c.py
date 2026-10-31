"""Direction C · search adds: the global search layer's rows carry an add press, and the layer opens the list."""
from lib import *

def several(desk=False):
    if desk:
        return (f'<div class="wayrow new"><span class="a">{svg(NAV["add"], 16, 1.6)}</span><span>Add several cards <span style="color:var(--fg-faint)">· search or scan, save once</span></span>'
                '<span class="chev">›</span></div>')
    return (f'<div class="wayrow new" style="margin:12px 16px 2px;min-height:52px;display:flex;align-items:center;gap:12px;border:1px solid var(--border);'
            f'border-radius:10px;background:var(--bg);padding:0 14px;font-size:14px"><span style="color:var(--accent);display:flex">{svg(NAV["add"], 16, 1.6)}</span>'
            '<span>Add several cards <span style="color:var(--fg-faint)">· search or scan</span></span><span style="margin-left:auto;color:var(--fg-faint)">›</span></div>')

RECENT = [('c-lathliss.jpg', 'Lathliss, Dragon Queen', owned(1, 'Dragons')),
          ('c-zimone.jpg', 'Zimone, Infinite Analyst', owned(0)),
          ('c-sai.jpg', 'Sai, Master Thopterist', owned(2, 'Thopters')),
          ('c-giada.jpg', 'Giada, Font of Hope', owned(0), True)]

def ssheet(field, body, keyboard=True):
    k = kbd() if keyboard else ''
    return f'<div class="sheet full" style="background:var(--bg)"><div class="ssh">{field}<span class="sx">✕</span></div><div style="flex:1;min-height:0;overflow:hidden">{body}</div></div>{k}'

def fld(q=''):
    if q:
        return f'<span class="fld on">{SEARCH}<span>{q}</span><span class="caret"></span></span>'
    return f'<span class="fld on">{SEARCH}<span class="caret" style="margin-left:0"></span><span style="color:var(--fg-placeholder)">Search all cards</span></span>'

def recents(add=True, way=True):
    rows = ''.join(srow(i, n, m, wish=(len(r) > 3), add=add, first=(k == 0)) for k, r in enumerate(RECENT) for i, n, m in [r[:3]])
    return (several() if way else '') + '<div class="slab"><h3>Recent cards</h3><a>Clear</a></div>' + rows

GH = 'Ghalta, Primal Hunger'
def gh_row(n=0, add=True, lit=False, up=False, desk=False):
    return srow('c-ghalta.jpg', '<em>Ghalta, P</em>rimal Hunger', owned(n, 'Gishath', up=up), add=add, first=True, lit=lit, desk=desk)

def p_rest():
    return ph(deck_page(header(('search-on', 'help', 'av'), shown=True)) + tabbar('decks'))

def p_open():
    return ph(deck_page() + tabbar('decks') + ssheet(fld(), recents()))

def p_typed():
    return ph(deck_page() + tabbar('decks') + ssheet(fld('ghalta, p'), '<p class="smeta">1 card</p>' + gh_row()))

def ghalta_choosing(phone=True):
    return line('c-ghalta.jpg', GH, need=True, picker=picker(6, GHALTA_TILES, phone))

def p_added():
    body = list_head(1) + ghalta_choosing()
    return ph(deck_page() + tabbar('decks') + add_sheet(body, foot_sum='Choose Ghalta, Primal Hunger’s printing first', save='Save 0 copies'))

def receipt(n, cards, went, desk=False):
    w = ''.join(f'<div><img src="art/{i}" alt="">{nm}<span>{s}</span></div>' for i, nm, s in went)
    btn = '<div class="btns"><span class="ghost">Add more</span><span class="prim">Done</span></div>'
    return (f'<div class="rc"><span class="ok">✓</span><b>{n} {"copy" if n == 1 else "copies"} added</b>'
            f'<p>{cards} {"card is" if cards == 1 else "cards are"} in your collection now.</p><span class="cnt">4,492 → {4492 + n:,} cards</span>'
            f'<div class="went">{w}</div><a class="h">See it in History</a>{btn}</div>')

def p_saved():
    body = receipt(1, 1, [('c-ghalta.jpg', GH, 'FDC · #6 · ×1')])
    return ph(deck_page() + tabbar('decks') + add_sheet(body, save=None))

def p_back():
    return ph(deck_page() + tabbar('decks') + ssheet(fld('ghalta, p'), '<p class="smeta">1 card</p>' + gh_row(1, lit=True, up=True), keyboard=False))

def p_offline():
    box = ('<div class="sbox"><b style="display:flex;align-items:center;gap:8px"><i style="width:8px;height:8px;border-radius:50%;background:var(--warning);display:inline-block"></i>You’re offline</b>'
           '<p>Search needs a connection. Keep typing if you like: results come in once you’re back online.</p></div>')
    return ph(deck_page() + tabbar('decks') + ssheet(fld('ghal'), box))

def p_off():
    return ph(deck_page() + tabbar('decks') + ssheet(fld(), recents(add=False, way=False)))

# ---- desktop
def dd(q, rows_html, foot=True, way=False, meta=None):
    k = '' if q else '<span class="k">⌘K</span>'
    txt = q if q else '<span style="color:var(--fg-placeholder)">Search all cards</span>'
    m = f'<p class="meta">{meta}</p>' if meta else ''
    f = '<div class="foot"><span>↑ ↓ to move · ↵ to open · esc to close</span><span>⌘K opens this from anywhere</span></div>' if foot else ''
    w = several(True) if way else ''
    return (f'<div class="dd"><div class="df">{SEARCH}<span>{txt}</span><span class="caret" style="width:1.5px;height:18px;background:var(--accent)"></span>{k}</div>'
            f'<div class="dp">{w}{m}{rows_html}{f}</div></div>')

def d_base():
    return (dcut('d-deck-list.webp', 0, 0, 1300, 900, 0, 0) + rail_slot(73, SEARCH.replace('width="20" height="20"', 'width="19" height="19"'), 'on', new=False))

def d_open():
    rows = ''.join(srow(i, n, m, wish=(len(r) > 3), first=(k == 0), desk=True) for k, r in enumerate(RECENT) for i, n, m in [r[:3]])
    return dk(d_base() + dd('', '<div class="slab"><h3>Recent cards</h3><a>Clear</a></div>' + rows, way=True))

def d_typed():
    return dk(d_base() + dd('ghalta, p', gh_row(desk=True), meta='1 card'))

def d_added():
    body = list_head(1, True) + ghalta_choosing(False)
    return dk(dcut('d-deck-list.webp', 0, 0, 1300, 900, 0, 0) +
              add_sheet(body, side=True, foot_sum='Choose Ghalta, Primal Hunger’s printing first', save='Save 0 copies'))

def d_back():
    return dk(d_base() + dd('ghalta, p', gh_row(1, lit=True, up=True, desk=True), meta='1 card'))

def build():
    b = head('Direction C · search adds', 'The search you already open from anywhere, now with an add on every row',
             'No new chrome at all. Card search is already one press from every screen (the header glyph, the rail slot, ⌘K) and is how a reader finds the card they just pulled. '
             'Each result row gains a 44px <b>+</b> (34px on desktop) that puts that card on the Add cards list with its printing step open. '
             'Above the recent cards, one row opens the same sheet empty, for a pack: search or scan, save once. '
             'Drawn over the shipped search layer (<code>search-layer.tsx</code>, <code>search-row.tsx</code>, card search R2), copper theme.')
    b += '<h3 class="sec">Phone · 390</h3>'
    b += frames(
        fr('<b>C1</b> · 390 · at rest', p_rest(),
           'The shell is exactly as shipped: the search glyph is the way in. Nothing is added to the header or the bar.'),
        fr('<b>C2</b> · 390 · search opened, recent cards', p_open(),
           '<b>Add several cards</b> sits above Recent cards in the shipped way-row shape (Add cards’ own “Have a file?” row), so a pack is one press from the open search. Each recent row carries its + after the bookmark.'),
        fr('<b>C3</b> · 390 · found by name, not owned', p_typed(),
           'The row still opens card details on a press anywhere but the +. The + is a separate 44px target at the row’s end, so the row stays one press for reading the card.'),
        fr('<b>C4</b> · 390 · + pressed: the card is known', p_added(),
           'The Add cards sheet opens over the search with Ghalta already on the list and its printing step open. <b>No default printing</b>: Save waits for a pick, as shipped. Foil and how many come after.'),
        fr('<b>C5</b> · 390 · saved', p_saved(),
           'The shipped receipt (<code>AddedReceipt</code>): Add more keeps the sheet, Done closes it.'),
    )
    b += frames(
        fr('<b>C6</b> · 390 · Done: back to the search as it was', p_back(),
           'The search comes back with the query and scroll it had, the row ringed (the shipped return ring, H3) and its line now <b>×1 owned</b>. The row reads ownership live, so this costs nothing new.'),
        fr('<b>C7</b> · 390 · offline', p_offline(),
           'The shipped offline box. No rows means no +, and Add several is not drawn: nothing it opens works offline. The header is untouched, so offline crowding is unchanged.'),
        fr('<b>C8</b> · 390 · collection edit switch off', p_off(),
           'The shipped layer: no Add several row and no + on any row. The bookmark keeps its place at the row’s end, so there is no gap.'),
    )
    b += '<h3 class="sec">Desktop · 1300</h3>'
    b += frames(
        fr('<b>C-D1</b> · 1300 · search open from the rail (or ⌘K)', d_open(),
           'The shipped dropdown, 540px beside the rail. Add several cards is its first row; each recent row has a 34px +.'),
        side('<h4>Keyboard</h4>↵ still opens card details. <b>⌘↵ adds</b> the active row (Ctrl ↵ off a Mac); the foot line names it once the switch is on '
             '(<i>↵ to open · ⌘↵ to add</i>, for /copy-review). Tab reaches each row’s + after its row.',
             '<h4>What C costs</h4>A second control on a search row, which the card search handoff kept to one press. The + is a separate target at the end, and the press on the rest of the row is unchanged. '
             'A reader has to open search to find it: it is not visible on the page they are on.',
             '<h4>What C gets</h4>Nothing added to a full header or a full bar. The add is where the reader already goes to find the card, on both widths, and the pack case is one row away. '
             'After a save the row they came from already says they own it.'),
    )
    b += frames(
        fr('<b>C-D2</b> · 1300 · + pressed', d_added(),
           'The dropdown closes and the 480px sheet opens with the card on the list, printing step open.'),
        fr('<b>C-D3</b> · 1300 · Done: the dropdown returns', d_back(),
           'Closing the sheet reopens the dropdown as it was, the row ringed and now ×1 owned.'),
    )
    return doc('Add card anywhere · C search adds', b, 2240)
