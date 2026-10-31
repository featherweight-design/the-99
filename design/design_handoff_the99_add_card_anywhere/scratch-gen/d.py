"""Direction D · the card is the entry: card details' Add to collection on every surface, not only /collection."""
from lib import *

GH = 'Ghalta, Primal Hunger'
ORACLE = ('This spell costs {X} less to cast, where X is the total power of creatures you control.<br>Trample')

def receipt_box(link=True, n=0, new=True):
    a = f'<a class="{"new" if new else ""}">{"Edit copies" if n else "Add to collection"}</a>' if link else ''
    v = f'<span class="v o">×{n}</span>' if n else '<span class="v">none</span>'
    return (f'<div class="rcpt"><div class="hd"><span>In your collection</span>{a}</div>{v}'
            '<div class="hd" style="margin-top:6px"><span>In your decks</span></div><div class="dk2">Gishath<span>wants 1</span></div></div>')

def cd_phone(link=True, n=0):
    art = cut('../art/c-ghalta.jpg'.replace('../art/', ''), 0, 0, 390, 118, 0, 0) if False else ''
    top = (f'<div class="cut" style="left:95px;top:16px;width:200px;height:280px;border-radius:12px"><img src="art/c-ghalta.jpg" alt="" style="left:0;top:0;width:200px"></div>')
    sheet = (f'<div class="cd-sheet"><span class="grab"></span><div class="cd-n">{GH}</div><div class="cd-t">Legendary Creature — Elder Dinosaur</div>'
             f'<p class="cd-o">{ORACLE}</p>{receipt_box(link, n)}<span class="wbtn">{BOOK} Add to wishlist</span>'
             '<span class="lnk">Buy any printing at Mana Pool ↗</span></div>')
    return '<div class="scrim" style="z-index:10"></div>' + f'<div style="position:absolute;inset:0;z-index:11">{top}</div>' + sheet

def p_deck():
    return ph(deck_page(rows_over=ghalta_row()) + tabbar('decks'))

def p_card(link=True, n=0):
    return ph(deck_page(rows_over=ghalta_row(owned=n > 0)) + tabbar('decks') + cd_phone(link, n))

def ac_sheet(phone=True):
    body = (line('c-ghalta.jpg', 'New printing', need=True, picker=picker(6, GHALTA_TILES, phone)))
    return add_sheet(body, side=not phone, title='Add to collection', sub=f'{GH} · you own none', scan=False, save='Save',
                     foot_sum='Choose the new printing first', search=False)

def p_sheet():
    return ph(deck_page(rows_over=ghalta_row()) + tabbar('decks') + ac_sheet())

def p_saved():
    return ph(deck_page(rows_over=ghalta_row(owned=True)) + tabbar('decks') + cd_phone(True, 1) +
              toast(f'Saved. {GH} ×1.', 12, 86, 366))

def p_back():
    return ph(deck_page(rows_over=ghalta_row(owned=True, lit=True)) + tabbar('decks'))

def p_off():
    return ph(deck_page(rows_over=ghalta_row()) + tabbar('decks') + cd_phone(False, 0))

# desktop
def cd_modal(link=True, n=0):
    return (f'<div class="scrim" style="z-index:10"></div><div class="cdm"><span class="cx">✕</span><div class="art"><img src="art/c-ghalta.jpg" alt="">'
            f'<span style="font:11px IBM Plex Mono;color:var(--fg-faint)">Click to zoom</span></div>'
            f'<div class="col"><div class="cd-n" style="font-size:28px">{GH}</div><div class="cd-t">Legendary Creature — Elder Dinosaur</div>'
            f'<p class="cd-o">{ORACLE}</p>{receipt_box(link, n)}<span class="wbtn">{BOOK} Add to wishlist</span>'
            '<span class="lnk">Buy any printing at Mana Pool ↗</span><span class="lnk" style="color:var(--fg-muted);margin-top:auto">‹ Prev · 4 of 37 · Next ›</span></div></div>')

def d_row(owned=False, lit=False):
    # the capture's Ghalta, Primal Hunger row: right column, y 254–290
    dot = '<span class="dot"></span>' if owned else '<span class="dot d"></span>'
    buy = '' if owned else '<span class="buy" style="margin-right:22px">$</span>'
    return (f'<div class="drow{" lit" if lit else ""}" style="left:692px;right:26px;top:254px;height:36px;font-size:13px">{dot}'
            f'<span class="n" style="font-size:13px">{GH}</span>{buy}<span class="pips"><span class="pip c">10</span><span class="pip g"></span><span class="pip g"></span></span>'
            '<span class="x">✕</span></div>')

def d_card():
    return dk(dcut('d-deck-list.webp', 0, 0, 1300, 900, 0, 0) + cd_modal())

def d_sheet():
    return dk(dcut('d-deck-list.webp', 0, 0, 1300, 900, 0, 0) + ac_sheet(False))

def d_saved():
    return dk(dcut('d-deck-list.webp', 0, 0, 1300, 900, 0, 0) + d_row(True, True) + toast(f'Saved. {GH} ×1.', 900, 24, 376))

def build():
    b = head('Direction D · the card is the entry', 'Add to collection on every card, wherever it opens',
             'The brief’s gap, closed and nothing else: card details already draws <i>Add to collection</i> (or <i>Edit copies</i>) on its receipt heading, '
             'but only when it was opened from /collection. D draws it wherever card details opens: a deck page, a friend’s deck, a search result, Shopping, the cart. '
             'It opens the shipped Edit copies sheet, titled <i>Add to collection</i> for a card the reader owns none of (<code>edit-copies-sheet.tsx</code>). No new chrome anywhere.')
    b += '<h3 class="sec">Phone · 390</h3>'
    b += frames(
        fr('<b>D1</b> · 390 · a deck page, the card not owned', p_deck(),
           'Ghalta, Primal Hunger on the deck page, not owned (the dashed dot, $ to buy). Drawn in the list where the capture’s Gigantic Big Bear sits, alphabetically right.'),
        fr('<b>D2</b> · 390 · card details from the row', p_card(),
           'The shipped card details sheet. The receipt’s heading carries <b>Add to collection</b> here too, the same link and place as on /collection. '
             'The receipt draws even with nothing to report, as it does on /collection, so the link always has a line.'),
        fr('<b>D3</b> · 390 · Add to collection pressed', p_sheet(),
           'The shipped sheet for a card owned in no copy: the sub line says <i>you own none</i>, the new printing’s picker is open, no default, and Save waits for it.'),
        fr('<b>D4</b> · 390 · saved', p_saved(),
           'Back on card details: the receipt reads ×1 and its link becomes <i>Edit copies</i>. The shipped toast (<code>copies.saved</code>) offers Undo.'),
        fr('<b>D5</b> · 390 · card closed', p_back(),
           'The deck page as it was, scroll included. Ghalta’s row now has the filled ownership dot and no $, ringed briefly so the eye finds what changed (the ring is new).'),
    )
    b += frames(
        fr('<b>D6</b> · 390 · collection edit switch off', p_off(),
           'The shipped receipt with no link, as every surface but /collection draws it today. No gap: the heading line is the shipped one.'),
        side('<h4>Offline</h4>Card details opens from what the page already holds; the link stays. The sheet then fails to read the printings as shipped '
             '(<code>copies.loadFailed</code>). No header or bar change, so no crowding.',
             '<h4>What D costs</h4>Only cards already on screen can be added. A card you just pulled that is in none of your decks needs search first, then its details, then the link: '
             'three steps per card. A pack of five is five sheets and five saves, five History entries.',
             '<h4>What D gets</h4>The smallest change: one gate lifted on a shipped link. It is the per-card route the other three directions want anyway, '
             'so D is drawn as its own option and as the floor under A, B and C.'),
    )
    b += '<h3 class="sec">Desktop · 1300</h3>'
    b += frames(
        fr('<b>D-D1</b> · 1300 · card details over the deck page', d_card(),
           'The shipped card modal over the Naya list. The receipt’s heading carries Add to collection.'),
        fr('<b>D-D2</b> · 1300 · Add to collection pressed', d_sheet(),
           'Edit copies leaves the card modal (collection edit R2 C): the modal closes and the 480px sheet opens over the page, printing picker open.'),
    )
    b += frames(fr('<b>D-D3</b> · 1300 · saved', d_saved(),
                   'The sheet closes, the toast says so, and Ghalta’s row on the deck page now shows owned. Undo in the toast puts it back.'))
    return doc('Add card anywhere · D card is the entry', b, 2240)
