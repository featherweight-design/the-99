"""States every direction shares: the pack (a list of several, with scan), saved, and the return."""
from lib import *
from c import receipt

PACK = [
    line('c-giada.jpg', 'Giada, Font of Hope', need=True, picker=picker(4, [('c-giada.jpg', 'FDC · #4'), ('c-giada.jpg', 'SNC · #14'), ('c-giada.jpg', 'PIP · #9')])),
    line('c-sai.jpg', 'Sai, Master Thopterist', 'FDC · #5', foil=True, own='you own ×2 → ×3'),
    line('c-zimone.jpg', 'Zimone, Infinite Analyst', 'FDC · #10'),
    line('c-lathliss.jpg', 'Lathliss, Dragon Queen', 'FDC · #7', own='you own ×1 → ×2'),
    line('c-ghalta.jpg', 'Ghalta, Primal Hunger', 'FDC · #6'),
]
FOLD = [PACK[0]] + [line(i, n, c, collapsed=True) for i, n, c in [('c-sai.jpg', 'Sai, Master Thopterist', 'FDC · #5'), ('c-zimone.jpg', 'Zimone, Infinite Analyst', 'FDC · #10'), ('c-lathliss.jpg', 'Lathliss, Dragon Queen', 'FDC · #7'), ('c-ghalta.jpg', 'Ghalta, Primal Hunger', 'FDC · #6')]]
PACK_DONE = [
    line('c-giada.jpg', 'Giada, Font of Hope', 'FDC · #4'),
    PACK[1], PACK[2], PACK[3], PACK[4]]

WENT = [('c-giada.jpg', 'Giada, Font of Hope', 'new'), ('c-sai.jpg', 'Sai, Master Thopterist', '×2 → ×3 · foil'),
        ('c-zimone.jpg', 'Zimone, Infinite Analyst', 'new'), ('c-lathliss.jpg', 'Lathliss, Dragon Queen', '×1 → ×2'),
        ('c-ghalta.jpg', 'Ghalta, Primal Hunger', 'new')]

def p_list():
    body = list_head(5) + ''.join(FOLD)
    return ph(deck_page() + tabbar('decks') + add_sheet(body, foot_sum='Choose Giada, Font of Hope’s printing first', save='Save 4 copies'))

def p_ready():
    body = list_head(5) + ''.join(PACK_DONE)
    return ph(deck_page() + tabbar('decks') + add_sheet(body, foot_sum='5 lines · 5 copies', save='Save 5 copies', save_off=False))

def p_saved():
    return ph(deck_page() + tabbar('decks') + add_sheet(receipt(5, 5, WENT), save=None))

def p_back():
    return ph(deck_page(rows_over=ghalta_row(owned=True, lit=True)) + tabbar('decks'))

def d_list():
    body = list_head(5, True) + ''.join(FOLD)
    return dk(dcut('d-deck-list.webp', 0, 0, 1300, 900, 0, 0) + add_sheet(body, side=True, foot_sum='Choose Giada, Font of Hope’s printing first', save='Save 4 copies'))

def d_saved():
    from d import d_row
    return dk(dcut('d-deck-list.webp', 0, 0, 1300, 900, 0, 0) + d_row(True, True) + add_sheet(receipt(5, 5, WENT, True), side=True, save=None))

def build():
    b = head('States every direction shares', 'The pack, the save and the way back',
             'Whatever opens it (a nav slot, a header +, a search row or Add several), the list is the shipped Add cards sheet with its steps, copy and save rule unchanged. '
             'These states are drawn once because they are the same under A, B and C (D opens one card at a time; its own board has its states). '
             'The pack is the brief’s friend: five cards from one booster, entered while the Naya deck page sits behind the sheet.')
    b += '<h3 class="sec">Phone · 390 · a pack of five</h3>'
    b += frames(
        fr('<b>S1</b> · 390 · five on the list, one printing left', p_list(),
           'Newest first. Giada’s printing step is open and every other line folds to one row, as shipped. Save counts what is ready and waits on the rest.'),
        fr('<b>S2</b> · 390 · ready to save', p_ready(),
           'Each line says what the save does to the reader’s holding (<i>new to you</i>, <i>you own ×2 → ×3</i>). '
           '<b>Scan</b> beside the search is the scan route: it opens the shipped scanner (card scan handoff) and every card it reads lands on this same list.'),
        fr('<b>S3</b> · 390 · saved', p_saved(),
           'One save, one History entry, the shipped receipt. Add more starts a new list in the same sheet.'),
        fr('<b>S4</b> · 390 · Done: back where they were', p_back(),
           '<b>Open call 5.</b> The page the reader came from updates in place: Ghalta’s row on the deck page takes the filled ownership dot and loses the $, ringed briefly. '
           'A search row reads ×1 owned (C6). No toast after a receipt: the receipt already said it.'),
    )
    b += '<h3 class="sec">Desktop · 1300</h3>'
    b += frames(
        fr('<b>S-D1</b> · 1300 · five on the list', d_list(),
           'The 480px side sheet, no scrim: the deck list stays readable beside it, so the reader can check what the deck wants while typing.'),
        fr('<b>S-D2</b> · 1300 · saved, the list behind already updated', d_saved(),
           'The receipt in the sheet; behind it, Ghalta’s row already shows owned. Done closes the sheet and nothing else moves.'),
    )
    b += rule('Calls that hold for every direction', [
        '<b>What opens (open call 3).</b> A shell entry (A, B, Add several) opens the shipped Add cards sheet empty. A per-card press opens it with that card on the list and its printing step open: '
        'search’s + (C) uses Add cards so the reader can keep going; card details’ link (D) keeps the shipped Edit copies sheet, which is what it opens on /collection today. '
        'No new lighter step: the printing step and the finish chips are already the light part.',
        '<b>Per card and per list (open call 4).</b> Both. The per-card route is card details’ link everywhere (D), under whichever shell entry is chosen. The list route is the direction’s own entry.',
        '<b>After saving (open call 5).</b> Yes: the surface updates in place, because the search row and the deck row already read ownership live. The only new piece is a brief ring on the row that changed.',
        '<b>Reach (open call 6).</b> Every signed-in surface with the shell: your decks, a friend’s deck (a card you see in their deck is often one you have), search, Shopping, the cart. '
        '<b>Not</b> the public card page: it has no shell and its reader may be signed out.',
        '<b>Switch off.</b> Every entry here sits behind the collection edit switch, as the sheet does. Off, each surface is exactly as shipped, with no gap.',
        '<b>Return.</b> Closing the sheet (✕, Done, Escape or a save) puts the reader back on the same surface, at the same scroll, with search or card details reopened as they were when the press came from inside them.',
    ])
    return doc('Add card anywhere · shared states', b, 2240)
