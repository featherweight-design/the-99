"""Board 2 · The populated view: games from several decks, newest first, by month; a filtered read; the filters."""
import ghlib as G, lib8 as L
from fx import OCT, SEP

SUM_LINES = ['<b>6 decks</b> · pods of 3–5 · Jul to Oct 2026', 'most played <b>HD - Dina</b>, 8 of 23']


def pop_phone():
    b = G.head(False) + G.filt_phone() + G.summary('23 games logged. 9–12–2.', SUM_LINES)
    b += G.month('October 2026', '6 games') + G.glist(OCT) + G.month('September 2026', '5 games') + G.glist(SEP[:2])
    return G.phone(b, 2300, fade=True)


def pop_desk():
    b = G.head(True) + G.filt_desk() + G.summary('23 games logged. 9–12–2.', SUM_LINES)
    b += G.month('October 2026', '6 games') + G.glist(OCT, True) + G.month('September 2026', '5 games') + G.glist(SEP, True)
    return G.desk(b, 1500, fade=True)


GISH = [g for g in OCT if g['deck'] == 'gishath']
import fx
GISH_ALL = GISH + [
    G.game('gishath', 'loss', 4, 'Sep 5', 2, (), ('card_flow',), (fx.COLIN(), fx.PETER(True), fx.MAX())),
    G.game('gishath', 'win', 4, 'Aug 22', 1, ('mana', 'board'), (), (fx.COLIN(), fx.CHRIS(), fx.MAX())),
    G.game('gishath', 'loss', 4, 'Aug 8', 1, (), ('interaction',), (fx.COLIN(True), fx.PETER(), fx.MAX())),
]
F_LINES = ['<b>HD - Sai</b> with <b>Colin</b> at the table · pods of 4 · Aug to Oct 2026',
           f'<span class="q-tr">{G.TROPHY}</span> Colin won 2 of the 3 you lost']


def filt_phone():
    b = G.head(False) + G.filt_phone('HD - Sai', 5, ('Colin',), '5 games', badge=1)
    b += G.summary('5 games logged. 2–3.', F_LINES)
    b += G.month('October 2026', '2 games') + G.glist(GISH_ALL[:2]) + G.month('September 2026', '1 game') + G.glist(GISH_ALL[2:3])
    return G.phone(b, 1700, fade=True)


def filt_desk():
    b = G.head(True) + G.filt_desk('HD - Sai', None, 'Colin', ('HD - Sai', 'Colin'), '5 games')
    b += G.summary('5 games logged. 2–3.', F_LINES)
    b += G.month('October 2026', '2 games') + G.glist(GISH_ALL[:2], True) + G.month('September 2026', '1 game') + G.glist(GISH_ALL[2:3], True)
    b += G.month('August 2026', '2 games') + G.glist(GISH_ALL[3:], True)
    return G.desk(b, 1180)


def opr(face, name, n, on=False, ini=None):
    fc = f'<span class="q-fc"><img src="art/{face}.jpg" alt=""></span>' if face else f'<span class="q-fc">{ini}</span>'
    return f'<div class="opr">{fc}<span>{name}</span><small>{n}</small><span class="q-bx{" on" if on else ""}"></span></div>'


def sheet_phone():
    rows = ('<div class="opr q-sub">Friends</div>' + opr('ghalta', 'Colin', '17 games', True) + opr('rootha', 'Peter', '15 games')
            + opr('zimone', 'Max', '14 games') + opr('jace', 'Chris', '8 games')
            + '<div class="opr q-sub">Commanders</div>' + opr('ghalta', 'Ghalta, Primal Hunger', '12 games') + opr('rootha', 'Rootha, Mercurial Artist', '9 games'))
    sh = ('<div class="q-scrim"></div><div class="sht2"><div class="grb"></div><div class="shh"><b>Filter games</b><i>✕</i></div><div class="q-sb">'
          '<div class="sgr"><small>Result</small><div class="tgs"><span class="q-tg">Won<small>9</small></span><span class="q-tg">Lost<small>12</small></span><span class="q-tg">Drawn<small>2</small></span></div></div>'
          f'<div class="sgr"><small>Played against</small><div class="fld2">{G.SEARCH}Friend or commander</div><div class="opl">{rows}</div></div>'
          '</div><div class="sft"><span class="bg">Clear all</span><span class="bp">Show 9 games</span></div></div>')
    b = G.head(False) + G.filt_phone('HD - Sai', 5, (), '9 games') + G.summary('9 games logged.', [])
    return G.phone(b, 1080, extra=sh)


def panel_desk():
    pn = (f'<div class="apn" style="left:{62+22+86+12+150+8+132+8}px;top:236px"><div class="fld2">{G.SEARCH}Friend or commander</div><div class="opl">'
          '<div class="opr q-sub">Friends</div>' + opr('ghalta', 'Colin', '17 games', True) + opr('rootha', 'Peter', '15 games') + opr('zimone', 'Max', '14 games') + opr('jace', 'Chris', '8 games')
          + '<div class="opr q-sub">Commanders</div>' + opr('ghalta', 'Ghalta, Primal Hunger', '12') + opr('rootha', 'Rootha, Mercurial Artist', '9') + opr('giada', 'Atraxa, Praetors’ Voice', '3') + '</div></div>')
    b = G.head(True) + G.filt_desk('HD - Sai', None, 'Colin', ('HD - Sai', 'Colin'), '5 games') + G.summary('5 games logged. 2–3.', F_LINES)
    b += G.month('October 2026', '2 games') + G.glist(GISH_ALL[:2], True)
    return G.desk(b, 700, extra=pn, fade=True)


def build():
    body = L.head('2 · Decks › Games · the populated view', 'Every game, every deck, newest first',
                  'The Games view lists every logged game across the reader’s decks, grouped by month. Each row is the shipped history row (<code>game-history-row.tsx</code>) with its deck added and the ✕ gone: '
                  'the view is read-only, and the whole row opens that deck’s Games tab at that game. Filters scope the summary as well as the list, which is how it answers “how has this deck done against Colin?”')
    body += '<div class="frames" style="gap:56px">'
    body += L.fr('<b>P1</b> · 390 · 23 games, 6 decks', G.phone and pop_phone(), 'Scrolled: two months shown. The phone’s deck picker takes the shelf picker’s place at the right of the view row; Result and Played against sit in <i>Filter games</i>.')
    body += L.fr('<b>P2</b> · 1300 · the same', pop_desk(), 'Desktop keeps the deck in a 230px column, the width of the Stats lanes’ name column, so a month reads down by deck. Every other slot is the shipped row’s.')
    body += '</div><div class="frames" style="gap:56px">'
    body += L.fr('<b>P3</b> · 390 · one deck against one friend', filt_phone(), 'HD - Sai, Colin at the table: the summary answers the question in counts. The trophy line counts the losses Colin won, as Matchups does.')
    body += L.fr('<b>P4</b> · 1300 · the same', filt_desk(), 'Active filters are chips on the shipped “No filters on” line, each with its ✕, and Clear all filters.')
    body += '</div><div class="frames" style="gap:56px">'
    body += L.fr('<b>P5</b> · 390 · Filter games (the shipped sheet)', sheet_phone(), 'Result and Played against. Played against lists friends first, then commanders, each with the reader’s count of games against them; it searches both. The button counts what will show.')
    body += L.fr('<b>P6</b> · 1300 · Played against, open', panel_desk(), 'Desktop opens the same list as the app’s anchored panel under its dropdown.')
    body += '</div>'
    return G.build_doc('Game history · Populated', body)
