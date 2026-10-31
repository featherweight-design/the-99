"""Board 4 · A few games: 1, 2, then 3 (PATTERN_MIN)."""
import ghlib as G, lib8 as L, fx

G1 = [G.game('goblins', 'loss', 4, 'Oct 30', 2, (), ('mana',), (fx.COLIN(True), fx.PETER(), fx.MAX()))]
G2 = [G.game('gishath', 'win', 4, 'Oct 30', 3, ('speed',), (), (fx.COLIN(), fx.PETER(), fx.MAX()))] + G1
G3 = G2 + [G.game('gishath', 'loss', 4, 'Oct 24', 3, (), ('closing',), (fx.COLIN(True), fx.CHRIS(), fx.MAX()))]
LOW = 'Games from every deck land here, newest first.' + G.DRAFT


def ph(n):
    gs = {1: G1, 2: G2, 3: G3}[n]
    if n == 1:
        top = G.filt_phone(show=False, cnt='1 game') + G.summary('1 game logged.', ['<b>HD - Goblins</b> · pod of 4 · Oct 2026'], LOW)
    elif n == 2:
        top = G.filt_phone(show=False, cnt='2 games') + G.summary('2 games logged. 1–1.', ['<b>2 decks</b> · pod of 4 · Oct 2026'], LOW)
    else:
        top = G.filt_phone('All decks', 2, cnt='3 games') + G.summary('3 games logged. 1–2.', ['<b>2 decks</b> · pod of 4 · Oct 2026', 'most played <b>HD - Gishath</b>, 2 of 3'])
    b = G.head(False) + top + G.month('October 2026', f'{n} game{"s" if n > 1 else ""}') + G.glist(gs)
    return G.phone(b, {1: 1000, 2: 1140, 3: 1420}[n])


def dk(n):
    gs = {1: G1, 2: G2, 3: G3}[n]
    if n == 1:
        top = G.filt_desk(show=False, cnt='1 game') + G.summary('1 game logged.', ['<b>HD - Goblins</b> · pod of 4 · Oct 2026'], LOW)
    elif n == 2:
        top = G.filt_desk(show=False, cnt='2 games') + G.summary('2 games logged. 1–1.', ['<b>2 decks</b> · pod of 4 · Oct 2026'], LOW)
    else:
        top = G.filt_desk(cnt='3 games') + G.summary('3 games logged. 1–2.', ['<b>2 decks</b> · pod of 4 · Oct 2026', 'most played <b>HD - Gishath</b>, 2 of 3'])
    b = G.head(True) + top + G.month('October 2026', f'{n} game{"s" if n > 1 else ""}') + G.glist(gs, True)
    return G.desk(b, {1: 600, 2: 680, 3: 800}[n])


def build():
    body = L.head('4 · A few games', 'One game reads as a game, not as an empty page',
                  'The deck’s Games tab rule carries over: the denominator is the design, nothing is a rate, and the figures arrive at three games (<code>PATTERN_MIN = 3</code>). '
                  'Below three, the headline is a count and the filters stay away (there is nothing to narrow). From three, the filter row and <i>most played</i> appear; <i>most played</i> only when one deck leads outright.')
    body += '<div class="frames" style="gap:44px">'
    for n in (1, 2, 3):
        cap = {1: 'One game: the count, its deck, and one line saying where games come from.',
               2: 'Two games: the record joins the headline, as the Games tab draws it (<i>3–2.</i>).',
               3: 'Three: the filter row, with <i>All decks 2</i> (decks with a game), and most played.'}[n]
        body += L.fr(f'<b>F{n}</b> · 390 · {n} game{"s" if n > 1 else ""}', ph(n), cap)
    body += '</div><div class="frames" style="flex-direction:column;gap:44px">'
    for n in (1, 2, 3):
        body += L.fr(f'<b>F{n+3}</b> · 1300 · {n} game{"s" if n > 1 else ""}', dk(n), '')
    body += '</div>'
    return G.build_doc('Game history · A few games', body)
