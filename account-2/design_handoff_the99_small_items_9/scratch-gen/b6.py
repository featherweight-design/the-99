"""Item 6 · Add a card: (a) the ring on a deck row after a dock add, (b) Remove in Edit copies for an unowned card,
(c) desktop card details after a save, (d) the save toast in the deck page's toast stack. Lifted from Add a card from
anywhere's Dock and D-Card boards (about_visual captures, copper)."""
import re
import lib9 as L
d = L.load('add_card_anywhere_D-Card.dc.html')
k = L.load('add_card_anywhere_Dock.dc.html')
SC = 'ac9'
D3 = L.screen(L.frame_by_label(d, '<b>D3</b>'))
DD1 = L.screen(L.frame_by_label(d, '<b>D-D1</b>'))
DD2 = L.screen(L.frame_by_label(d, '<b>D-D2</b>'))
DD3 = L.screen(L.frame_by_label(d, '<b>D-D3</b>'))
K7 = L.screen(L.frame_by_label(k, '<b>K7</b>'))
KD2 = L.screen(L.frame_by_label(k, '<b>K-D2</b>'))
DOCK_D = L.block(KD2, KD2.find('<div class="dock"'))
DOCK_D = re.sub(r'<span style="flex:none;width:520px;margin-left:14px" class="f on">.*?<span class="caret"></span></span>',
                '<span style="flex:none;width:520px;margin-left:14px" class="f"><svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8.6" cy="8.6" r="5.6"/><path d="M12.8 12.8 17 17"/></svg><span>Add a card by name · Naya only</span></span>', DOCK_D)

SAVED = 'Saved. Ghalta, Primal Hunger ×1.'
REMOVE = '<span class="rm9">Remove from collection</span>'

CSS = """<style>
.ac9 .drow.lit.f9{box-shadow:inset 0 0 0 1.5px color-mix(in oklab,var(--success) 45%,transparent)}
.ac9 .rm9{order:0;min-height:44px;display:inline-flex;align-items:center;padding:0 14px;border:1px solid var(--border-strong);border-radius:8px;font-size:14px;color:var(--fg);opacity:.4;white-space:nowrap}
.ac9 .dk .rm9{min-height:38px}
.ac9 .sh-f{flex-wrap:wrap;gap:8px}
.ac9 .bad9{outline:1.5px dashed var(--danger);outline-offset:3px}
.ac9 .tst9{position:absolute;z-index:40;display:flex;flex-direction:row;align-items:center;gap:12px;background:var(--surface-raised);border:1px solid var(--border-strong);border-radius:10px;padding:0 6px 0 14px;min-height:54px;box-shadow:0 14px 34px rgba(0,0,0,.5);font-size:13.5px;color:var(--fg)}
.ac9 .tst9 .ok{color:var(--success)}
.ac9 .tst9 a{margin-left:auto;font:600 13.5px 'IBM Plex Sans';color:var(--accent);padding:0 10px;min-height:44px;display:flex;align-items:center;text-decoration:underline;text-underline-offset:2px}
.ac9 .tst9.al{color:var(--fg)}
.ac9 .tst9.al i{width:7px;height:7px;transform:rotate(45deg);background:var(--danger);flex:none}
.ac9 .tl9{display:flex;gap:6px;align-items:center;font:11px 'IBM Plex Mono';color:var(--fg-muted);margin-top:8px}
.ac9 .tl9 b{color:var(--accent-text);font-weight:600}
</style>"""


def ring_phone(state):
    x = K7
    if state == 'fade':
        x = x.replace('class="drow lit"', 'class="drow lit f9"', 1)
    elif state == 'gone':
        x = x.replace('class="drow lit"', 'class="drow"', 1)
    return x


def ring_desk(state):
    x = DD3
    t = x.find('<div class="toast"')
    x = x[:t] + DOCK_D + x[t + len(L.block(x, t)):]
    if state == 'fade':
        x = x.replace('class="drow lit"', 'class="drow lit f9"', 1)
    elif state == 'gone':
        x = x.replace('class="drow lit"', 'class="drow"', 1)
    return x


def remove_shown(x, now):
    if now:
        return L.sub1(x, '<div class="sh-f"><span class="sum">', f'<div class="sh-f">{REMOVE.replace("rm9", "rm9 bad9")}<span class="sum" style="order:-1;width:100%;text-align:left">')
    return x


def reopened_desk():
    x = DD1
    x = L.sub1(x, '<a class="new">Add to collection</a></div><span class="v">none</span>', '<a class="new">Edit copies</a></div><span class="v o">×1</span>')
    x = L.sub1(x, '<span class="dot d"></span>', '<span class="dot"></span>') if '<span class="dot d"></span>' in x else x
    x = x[:-6] + f'<div class="tst9" style="left:calc(62px + (1238px - 420px)/2);width:420px;bottom:24px;z-index:60"><span class="ok">✓</span><span>{SAVED}</span><a>Undo</a></div></div>'
    return x


def stack_phone(two):
    x = K7.replace('class="drow lit"', 'class="drow lit"')
    # the dock's top is 704; the stack floor is 10px above it
    t = f'<div class="tst9 new9" style="left:16px;right:16px;bottom:calc(844px - 704px + 10px)"><span class="ok">✓</span><span>{SAVED}</span><a>Undo</a></div>'
    if two:
        t += ('<div class="tst9 al" style="left:16px;right:16px;bottom:calc(844px - 704px + 10px + 54px + 10px)">'
              '<span>We couldn’t search just now.</span><a>Try again</a></div>')
    return x[:-6] + t + '</div>'


def stack_desk():
    x = DD3
    t = x.find('<div class="toast"')
    x = x[:t] + DOCK_D + x[t + len(L.block(x, t)):]
    return x[:-6] + (f'<div class="tst9 new9" style="left:78px;width:440px;bottom:calc(900px - 838px + 10px)"><span class="ok">✓</span><span>{SAVED}</span><a>Undo</a></div></div>')


def build():
    b = L.head('6 · Add a card from anywhere · four leftovers',
               'The ring fades, Remove waits for a copy, the modal comes back, and one toast stack',
               'Drawn over Add a card from anywhere’s Dock and D-Card boards (about_visual captures). The toasts are drawn as built and confirmed in the Errata (shared toast, Undo underlined).')
    b += L.sec('6a · the ring on a deck row after a dock add')
    tl = lambda s: f'<div class="tl9">{s}</div>'
    b += L.frames(
        L.fr('<b>R1</b> · 390 · 0 to 2 s', ring_phone('lit'), 'Added from the dock: the row lands in its sort place, ringed in <code>--success</code> (1.5px inset), as shipped.' + tl('<b>0.0 s</b> ring on'), SC),
        L.fr('<b>R2</b> · 390 · 2.0 to 2.4 s', ring_phone('fade'), '<b>The ring fades out over 400ms</b> (ease-out) after its 2s hold, so the eye catches it leaving. Drawn mid-fade.' + tl('<b>2.0 s</b> fade starts · 2.4 s gone'), SC),
        L.fr('<b>R3</b> · 390 · after', ring_phone('gone'), 'The row as any other. Reduced motion: no fade; the ring goes at 2s, as shipped today.' + tl('<b>2.4 s</b> off'), SC),
    )
    b += L.frames(
        L.fr('<b>R4</b> · 1300 · 0 to 2 s', ring_desk('lit'), 'The same ring on the desktop row, the dock below it ready for the next name.', SC, 760),
    )
    b += L.frames(
        L.fr('<b>R5</b> · 1300 · 2.0 to 2.4 s', ring_desk('fade'), 'Mid-fade. Same 2s hold and 400ms fade as the phone; one ring timing app-wide (game history’s landing ring takes it too).', SC, 760),
    )
    b += L.sec('6b · Edit copies for a card you don’t own')
    b += L.frames(
        L.fr('<span class="now">as shipped</span><b>E1</b> · 390 · Remove, disabled', remove_shown(D3, True),
             'Today the foot draws <i>Remove from collection</i> at 40% for a card with no copies: a control that can never act here.', SC),
        L.fr('<span class="rec">call</span><b>E2</b> · 390 · no Remove', D3,
             '<b>Not drawn while nothing is owned</b> (the board as drawn). It appears once a copy exists, opened from <i>Edit copies</i>.', SC),
        L.fr('<span class="rec">call</span><b>E3</b> · 1300 · no Remove', DD2, 'The 480 side sheet, the same foot: the hint and Save.', SC, 760),
    )
    b += L.sec('6c · desktop: card details again after a save')
    b += L.frames(
        L.fr('<b>M1</b> · 1300 · saved, the modal back', reopened_desk(),
             '<b>As the phone (D4):</b> Save closes the side sheet and the card modal returns where it was, same card, same Prev/Next place. '
             'The receipt reads <b>×1</b> and its link becomes <i>Edit copies</i>; the deck row behind takes the owned dot. The shared toast, bottom centre of the page (Errata B2).', SC, 760),
    )
    b += L.sec('6d · the save toast on a deck page')
    b += L.frames(
        L.fr('<b>T1</b> · 390 · back in the dock, saved', stack_phone(False),
             '<b>One stack.</b> On a deck page the collection’s save toast portals into the deck’s toast stack (<code>DeckToastStackHost</code>): 16px gutters, 10px above the dock. It holds Undo, so it takes the floor.', SC),
        L.fr('<b>T2</b> · 390 · with a deck alert', stack_phone(True),
             'A deck alert (the dock’s failed search) sits 10px above it; when the save toast goes, the alert drops to the floor with no motion, as the stack does today.', SC),
        L.fr('<b>T3</b> · 1300 · the same', stack_desk(),
             'From <code>md</code>: rail + 16, 440 wide, 10px above the dock. Not the shell’s bottom-centre slot while a deck page is open.', SC, 760),
    )
    b += L.rule('The calls', [
        '<b>(a) Ring:</b> 2s hold, then a 400ms ease-out fade (<code>box-shadow</code> to transparent); reduced motion skips the fade. One timing for every “this changed” ring (dock add, search row, game landing).',
        '<b>(b) Remove:</b> Edit copies draws <i>Remove from collection</i> only when a copy is owned. No disabled Remove.',
        '<b>(c) Desktop after save:</b> the card modal reopens on the same card and place, receipt ×1 with <i>Edit copies</i>, toast as shipped.',
        '<b>(d) Toasts on a deck page:</b> the save toast joins the deck stack (floor: 10px above the dock), Undo toasts on the floor, alerts above, 10px apart.'])
    return L.doc('Small items 9 · Add a card', L.scope(L.helmet(d), SC) + CSS, b, 2000)
