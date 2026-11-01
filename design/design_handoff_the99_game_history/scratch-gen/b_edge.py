"""Board 5 · No games, a long history, failure, and a deleted deck."""
import ghlib as G, lib8 as L, fx, b_pop


def empty(desk):
    r0 = ('<div class="r0"><span>Playing with a pod? Its <b>Rule 0 check</b> seats the table, and <i>Log this game</i> fills in every seat for you.</span><u>Your pods ›</u></div>')
    sel = f'<span class="dsl">{G.idm("U")}<span>HD - Sai</span><i>&#9662;</i></span>'
    e = (f'<div class="emp"><h3>No games logged yet.</h3><p>Every game you log, on any deck, lands here: who won, the pod, the date, who sat across the table.{G.DRAFT}</p>'
         f'<div class="pk"><small>Log one on</small><div class="q-pr">{sel}<span class="bp">Log a game</span></div></div>{r0}</div>')
    if desk:
        return G.desk(G.head(True) + G.filt_desk(show=False, cnt='0 games') + e, 720)
    return G.phone(G.head(False) + G.filt_phone(show=False, cnt='0 games') + e, 1000)


MONTHS = [('October 2026', 6), ('September 2026', 9), ('August 2026', 11), ('July 2026', 8), ('June 2026', 7), ('May 2026', 9)]


def long_list(desk, foot):
    import itertools
    gs = itertools.cycle(fx.OCT + fx.SEP)
    out = ''
    for m, k in MONTHS[-2:]:
        out += G.month(m, f'{k} games') + G.glist([next(gs) for _ in range(2 if not desk else 3)], desk)
    return out + foot


def foot(state):
    if state == 'more':
        return '<div class="q-lft"><small>Showing 50 of 212 games</small><span class="bg">Show 50 more</span></div>'
    if state == 'busy':
        return '<div class="q-lft"><small>Showing 50 of 212 games</small><span class="bg" style="color:var(--fg-muted)"><span class="spin"></span>Loading…</span></div>'
    return '<div class="q-lft"><small>All 212 games</small></div>'


def long_phone(state, toast=False):
    b = G.head(False)[:0] + G.filt_phone(cnt='212 games') + G.summary('212 games logged. 81–118–13.', ['<b>14 decks</b> · pods of 2–6 · Jan 2024 to Oct 2026', 'most played <b>HD - Dina</b>, 41 of 212'])
    b += '<div class="fold" style="position:relative;margin:34px -16px 10px"><span>… 46 games scrolled past …</span></div>'
    b += long_list(False, foot(state))
    ex = G.toast('We couldn’t load more games.', bottom=90) if toast else ''
    return G.phone(b, 1180, extra=ex)


def long_desk(state, toast=False):
    b = G.filt_desk(cnt='212 games') + G.summary('212 games logged. 81–118–13.', ['<b>14 decks</b> · pods of 2–6 · Jan 2024 to Oct 2026', 'most played <b>HD - Dina</b>, 41 of 212'])
    b += '<div class="fold" style="position:relative;margin:34px -22px 10px"><span>… 44 games scrolled past …</span></div>'
    b += long_list(True, foot(state))
    ex = G.toast('We couldn’t load more games.', bottom=22) if toast else ''
    return G.desk(b, 960, extra=ex)


def fail_phone():
    b = G.head(False) + '<div class="vrw">' + G.switch('tiles') + '<span class="q-shp">All decks<small>24</small><i>&#9662;</i></span></div>'
    b += '<div class="cnt" style="margin-top:12px">24 decks</div>'
    b += '<div class="capx" style="margin:0 -16px;height:520px"><img src="art/p-decks.webp" alt="" style="width:390px;left:0;top:-459px"></div>'
    return G.phone(b, 844, extra=G.toast('We couldn’t load your games.', bottom=90))


def fail_desk():
    b = G.head(True) + '<div class="vrw">' + G.switch('tiles') + '<span class="vsep"></span><span class="seg" style="height:34px"><span class="on">All decks</span><span>Custom Builds</span><span>Precon Tune</span></span></div>'
    b += '<div class="cnt" style="margin-top:14px">24 decks</div><div class="capx" style="margin:0 -22px;height:420px"><img src="art/d-decks2.webp" alt="" style="width:1300px;left:-62px;top:-354px"></div>'
    return G.desk(b, 640, extra=G.toast('We couldn’t load your games.', bottom=22))


def deleted(desk):
    gs = [g for g in fx.OCT if g['deck'] != 'goblins']
    lines = ['<b>5 decks</b> · pods of 3–5 · Jul to Oct 2026', 'most played <b>HD - Dina</b>, 8 of 22']
    if desk:
        b = G.head(True) + G.filt_desk(cnt='22 games') + G.summary('22 games logged. 9–11–2.', lines) + G.month('October 2026', '5 games') + G.glist(gs, True)
        return G.desk(b, 900, fade=True)
    b = G.head(False) + G.filt_phone(cnt='22 games') + G.summary('22 games logged. 9–11–2.', lines) + G.month('October 2026', '5 games') + G.glist(gs[:3])
    return G.phone(b, 1300, fade=True)


def build():
    body = L.head('5 · No games, a long history, failure, a deleted deck', 'The edges',
                  'Empty points at the one place a game is logged, the deck’s Games tab, with a deck already chosen, and at Rule 0 for a pod night. A long history pages in fifty at a time under its month heads. A failed read leaves the reader where they were, with the shared toast.')
    body += '<div class="frames" style="gap:56px">'
    body += L.fr('<b>E1</b> · 390 · no games yet', empty(False),
                 'The deck select is the shipped one (Stats’ <i>This deck among yours</i>), set to the deck opened last. <i>Log a game</i> opens that deck’s Games tab with the form open, as Rule 0’s Log this game does. The Rule 0 line shows only with the social switches on and a pod; <i>Your pods ›</i> opens /friends.')
    body += L.fr('<b>E2</b> · 1300 · the same', empty(True), 'No summary, no filters, no month heads. With no decks at all the Decks page is the shipped zero state (<code>decks-zero.tsx</code>) and draws no view row.')
    body += '</div><div class="frames" style="gap:56px">'
    body += L.fr('<b>L1</b> · 390 · 212 games, the window', long_phone('more'), 'Fifty games a read, newest first (the brief’s windowed read). The foot counts what is shown and offers fifty more. Month heads count the month’s games across the whole history, not the window. Filters run on the server, so a filtered count is exact.')
    body += L.fr('<b>L2</b> · 1300 · loading the next fifty', long_desk('busy'), 'The button holds its place and says <i>Loading…</i> with the app’s spinner; the rows above stay.')
    body += '</div><div class="frames" style="gap:56px">'
    body += L.fr('<b>L3</b> · 390 · the next fifty failed', long_phone('more', True), 'The shared toast (ToastFrame) with Try again. The button comes back as it was; nothing already shown moves.')
    body += L.fr('<b>X1</b> · 390 · Games pressed, the read failed', fail_phone(), 'As Stats does today, a failed first read leaves the deck tiles drawn and the switch on Decks. Games adds the toast so the press is not silent. Try again asks again. Opening <code>?view=games</code> directly and failing lands here too.')
    body += '</div><div class="frames" style="gap:56px">'
    body += L.fr('<b>X2</b> · 1300 · the same', fail_desk(), '')
    body += '</div><div class="frames" style="gap:56px">'
    body += L.fr('<b>D1</b> · 390 · after HD - Lathliss was deleted', deleted(False),
                 'Games cascade with their deck today, and the shipped delete confirm already says so (<i>Its list, its versions and its game log go with it.</i>). The view assumes that: Lathliss’ game is gone, and every count drops by it. No tombstone row.')
    body += L.fr('<b>D2</b> · 1300 · the same', deleted(True), 'A friend’s deck deleted on their side is a different case: it lives on in the reader’s rows as its snapshot (row E).')
    body += '</div>'
    return G.build_doc('Game history · The edges', body)
