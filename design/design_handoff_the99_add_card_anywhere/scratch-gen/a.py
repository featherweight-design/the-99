"""Direction A · a nav slot: Add as a sixth tab on the phone, a slot under Friends in the rail."""
from lib import *

EXTRA = (2, 'add', 'Add')

def phone_rest():
    return ph(deck_page() + tabbar('decks', EXTRA))

def phone_open():
    return ph(deck_page() + tabbar('decks', EXTRA, pressed='add') + add_sheet(EMPTY_BODY_PHONE))

def phone_offline():
    body = ('<div class="sbox" style="margin:6px 0 0"><p style="color:var(--fg-body)">We couldn’t search just now. Check your connection and try again.</p>'
            '<span class="ghost" style="align-self:flex-start">Try again</span></div>')
    hdr = header(('off', 'search', 'help', 'av'), shown=True)
    return ph(deck_page(hdr) + tabbar('decks', EXTRA) +
              add_sheet(body, search_on=True, query='ghal'))

def phone_off():
    return ph(deck_page() + tabbar('decks'))

def phone_360():
    return ph(deck_page(w=360) + tabbar('decks', EXTRA), 'w360')

def desk_base(pressed=False, tag=True):
    s = dcut('d-deck-list.webp', 0, 0, 1300, 900, 0, 0)
    s += '<span class="rrule new" style="top:344px"></span>'
    s += rail_slot(351, nav('add'), 'on' if pressed else '', new=True)
    if tag and not pressed:
        s += '<span class="rtag" style="top:355px">Add cards</span>'
    return s

def desk_rest():
    return dk(desk_base())

def desk_open():
    return dk(desk_base(pressed=True) + add_sheet(EMPTY_BODY_DESK, side=True, search_on=True))

def rail_strip(kind):
    """The rail's top 420px at 1:1 (and its foot for offline)."""
    s = dcut('d-deck-list.webp', 0, 0, 62, 420, 0, 0)
    if kind != 'off':
        s += '<span class="rrule new" style="top:344px"></span>' + rail_slot(351, nav('add'))
    return f'<div style="position:relative;width:62px;height:420px;border:1px solid var(--border-strong);border-radius:8px;overflow:hidden">{s}</div>'

def rail_foot_offline():
    s = dcut('d-deck-list.webp', 0, 700, 62, 200, 0, 0)
    s += '<span class="rcover" style="top:95px;height:58px"></span><span class="roff" style="top:97px"><i></i>Offline</span>'
    return f'<div style="position:relative;width:62px;height:200px;border:1px solid var(--border-strong);border-radius:8px;overflow:hidden">{s}</div>'

def strips():
    def st(lab, inner): return f'<div class="strip"><div class="lab">{lab}</div>{inner}</div>'
    return ('<div class="strips">' + st('<b>Rest</b> · online', rail_strip('on')) + st('<b>Offline</b> · slot stays; pill at the foot',
            '<div style="display:flex;flex-direction:column;gap:12px">' + rail_strip('on') + rail_foot_offline() + '</div>')
            + st('<b>Switch off</b> · as shipped', rail_strip('off')) + '</div>')

def build():
    b = head('Direction A · a nav slot', 'Add, as a place in the nav',
             'The ManaBox way: adding a card gets its own slot in the bar the reader already uses to move around. '
             'Drawn over the shipped deck page (<code>p-deck-your-deck</code>, <code>d-deck-list</code>) with the tab bar and rail redrawn from '
             '<code>nav.tsx</code>. The slot opens the shipped Add cards sheet, unchanged: the full-height sheet on the phone, the 480px side sheet on desktop. '
             'New parts carry a dashed outline.')
    b += '<h3 class="sec">Phone · 390 and 360</h3>'
    b += frames(
        fr('<b>A1</b> · 390 · at rest, deck page', phone_rest(),
           'A sixth slot, <b>Add</b>, after Collection, with a 19px plus in the NavIcon stroke. At 390 six slots are 62px each: '
           '<code>Commanders</code> (59.4px at 9px mono) keeps 1.5px a side. It is the only slot that is not a place: it never takes the active fill.'),
        fr('<b>A2</b> · 390 · Add pressed', phone_open(),
           'The shipped Add cards sheet, full height, over the deck page. Closing it (✕, Done or a save) returns to the deck page exactly as it was, scroll included.'),
        fr('<b>A3</b> · 390 · offline', phone_offline(),
           'The bar has room, so the slot stays. The sheet opens and its search fails as shipped (<code>add.searchFailed</code>). Nothing new in the header.'),
        fr('<b>A4</b> · 390 · collection edit switch off', phone_off(),
           'The bar is the shipped five slots, 74.8px each. No gap: the slot is not drawn at all.'),
        fr('<b>A5</b> · the bar at 1:1', col(
              bar_strip(390, tabbar('decks', EXTRA), '390 · six slots, 62.3px'),
              bar_strip(360, tabbar('decks', EXTRA), '360 · six slots, 57.3px, labels 8.5px'),
              bar_strip(390, tabbar('decks'), 'Shipped · five slots, 74.8px')),
           'At 360 labels drop to 8.5px with no tracking (the shipped rule below 360pt), so <code>Commanders</code> is 51px in a 57px slot. Tight but whole; no truncation.'),
    )
    b += '<h3 class="sec">Desktop · 1300</h3>'
    b += frames(
        fr('<b>A-D1</b> · 1300 · at rest, the rail tag on hover', desk_rest(),
           'A 38px slot under Friends, after a 24px rule (the rule the search slot already uses), so the five places stay one group and Add reads as an action. The rail tag names it <i>Add cards</i>.'),
        side('<h4>Rail at 1:1</h4>' + strips(),
             '<h4>What A costs</h4>A place in the nav that is not a place. Every other slot takes you somewhere and shows where you are; this one opens a sheet. '
             'On the phone the bar goes from 74.8px slots to 62.3px, and every label gets tighter for one action most readers use in bursts (a pack, a trade).',
             '<h4>What A gets</h4>The most findable answer: one press from every screen, phone and desktop, never hidden by scroll (the bar is fixed, the header is not). '
             'It is how ManaBox does it.'),
    )
    b += frames(
        fr('<b>A-D2</b> · 1300 · Add pressed', desk_open(),
           'The shipped 480px side sheet with no scrim, so the deck list stays readable beside it (collection edit B1). The slot holds its pressed fill while the sheet is open.'),
    )
    return doc('Add card anywhere · A nav slot', b, 2240)
