"""Direction B · a header press: + beside search on the phone header, under search in the rail's top."""
from lib import *

ON = ('search', 'add', 'help', 'av')

def phone_rest():
    return ph(deck_page(header(ON, shown=True)) + tabbar('decks'))

def phone_open():
    return ph(deck_page(header(('search', 'add-on', 'help', 'av'), shown=True)) + tabbar('decks') + add_sheet(EMPTY_BODY_PHONE))

def phone_offline():
    return ph(deck_page(header(('off', 'search', 'help', 'av'), shown=True)) + tabbar('decks'))

def phone_off():
    return ph(deck_page(header(('search', 'help', 'av'), shown=True)) + tabbar('decks'))

def strips():
    return col(
        hdr_strip(390, header(('inst',) + ON, air=(84, 12, '12')), '390 · online, install slot showing · 12px of air'),
        hdr_strip(375, header(ON, air=(84, 85, '85')), '375 and 360 · the install slot steps aside below 379px'),
        hdr_strip(360, header(('off', 'search', 'help', 'av'), air=(84, 0, '')), '360 · offline · + steps aside, as the install slot does'),
        hdr_strip(390, header(('search', 'help', 'av')), 'Shipped · switch off, nothing moves'),
        gap=18)

def rail_b(pressed=False, tag=True, h=900, src_h=900):
    s = dcut('d-deck-list.webp', 0, 0, 1300, src_h, 0, 0)
    s += '<span class="rcover" style="top:112px;height:240px"></span>'
    s += dcut('d-deck-list.webp', 0, 112, 61, 233, 0, 154, z=4)
    s += rail_slot(115, nav('add'), 'on' if pressed else 'mut')
    if tag and not pressed:
        s += '<span class="rtag" style="top:119px">Add cards</span>'
    return s

def desk_rest():
    return dk(rail_b())

def desk_open():
    return dk(rail_b(pressed=True) + add_sheet(EMPTY_BODY_DESK, side=True, search_on=True))

def rail_strip(kind):
    if kind == 'off':
        s = dcut('d-deck-list.webp', 0, 0, 62, 420, 0, 0)
    else:
        s = dcut('d-deck-list.webp', 0, 0, 62, 420, 0, 0) + '<span class="rcover" style="top:112px;height:240px"></span>'
        s += dcut('d-deck-list.webp', 0, 112, 61, 233, 0, 154, z=4) + rail_slot(115, nav('add'), 'mut')
    return f'<div style="position:relative;width:62px;height:420px;border:1px solid var(--border-strong);border-radius:8px;overflow:hidden">{s}</div>'

def build():
    b = head('Direction B · a header press', 'A plus beside search, in the header and the rail’s top',
             'The press sits with the other “do something” control the shell already has: search. On the phone it is a 44px <b>+</b> between the search glyph and the ?; '
             'in the desktop rail it is a 38px slot under search, above the rule, so the places below keep their group. '
             'Drawn over the shipped deck page with the header in its quick-return “shown” state (it hides on scroll and returns on scroll up). '
             'The press opens the shipped Add cards sheet, unchanged.')
    b += '<h3 class="sec">Phone · 390, with the header measured at 390, 375 and 360</h3>'
    b += frames(
        fr('<b>B1</b> · 390 · at rest, header returned', phone_rest(),
           'The + is the shipped header glyph size (44px press, 18px plus, <code>--fg-muted</code>), 2px before the ?, as search is. Online with no install slot the wordmark keeps 100px of air.'),
        fr('<b>B2</b> · 390 · + pressed', phone_open(),
           'The full-height sheet over the page. Its ✕, Done or a save returns the deck page as it was; the header stays where the scroll left it.'),
        fr('<b>B3</b> · 390 · offline', phone_offline(),
           '<b>+ steps aside while the offline pill shows.</b> Nothing it opens works without a connection (search, printings and Save are all server reads), and with the pill the header has 3.6px left at 390 and none at 375.'),
        fr('<b>B4</b> · 390 · collection edit switch off', phone_off(),
           'The shipped header. The + is not drawn, so nothing shifts and there is no gap.'),
        fr('<b>B5</b> · the header at 1:1', strips(),
           'The worst online case is the install slot: wordmark 64 + slot 88 + search 46 + <b>+ 46</b> + ? 50 + avatar 44 + padding 40 = 378px. '
           'So the install slot’s own crowd rule gains one width: <b>below 379px it steps aside while the + shows</b> (it already does this offline). The + never yields online.'),
    )
    b += '<h3 class="sec">Desktop · 1300</h3>'
    b += frames(
        fr('<b>B-D1</b> · 1300 · at rest, the rail tag on hover', desk_rest(),
           'Search and Add are the rail’s two actions, together above the rule; the places move down one slot (42px). The rail tag names it <i>Add cards</i>.'),
        side('<h4>Rail at 1:1</h4><div class="strips">' +
             f'<div class="strip"><div class="lab"><b>Rest</b> · online and offline</div>{rail_strip("on")}</div>' +
             f'<div class="strip"><div class="lab"><b>Switch off</b> · as shipped</div>{rail_strip("off")}</div></div>',
             '<h4>Offline on desktop</h4>The rail has room, so the slot stays offline (the pill is at the rail’s foot). The sheet opens and its search fails as shipped. Only the phone header steps the + aside.',
             '<h4>What B costs</h4>The phone header is the shell’s most crowded strip. It holds at 390 only because the install slot gives way, and it hides on scroll, so on a long deck the + is one scroll-up away. Two rules (offline, install) the reader never sees but engineering keeps.',
             '<h4>What B gets</h4>No change to the nav. Search and Add sit together on both widths, which reads well: find a card, or add one.'),
    )
    b += frames(fr('<b>B-D2</b> · 1300 · + pressed', desk_open(),
                   'The shipped 480px side sheet. The slot holds its pressed fill while the sheet is open.'))
    return doc('Add card anywhere · B header press', b, 2240)
