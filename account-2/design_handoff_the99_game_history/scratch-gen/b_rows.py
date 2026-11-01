"""Board 3 · The row: every shape a game takes, and the social games switch off."""
import ghlib as G, lib8 as L, fx

R = [
    ('A', 'opponents logged, one won', G.game('goblins', 'loss', 4, 'Oct 30', 2, (), ('mana',), (fx.COLIN(True), fx.PETER(), fx.MAX()))),
    ('B', 'no opponents, no marks (an old game)', G.game('aang', 'loss', 4, 'Mar 14, 2025', None)),
    ('C', 'a note', G.game('gishath', 'win', 4, 'Oct 30', 3, ('speed', 'board'), (), (fx.COLIN(), fx.PETER()), 'Turn-5 Sai, a sky full of thopters. Colin had no answer.')),
    ('D', 'its version since deleted', G.game('elves', 'draw', 5, 'Oct 9', None, ('board',), ('interaction',), (fx.COLIN(), fx.MAX()))),
    ('E', 'a friend’s deck since deleted, a friend removed', G.game('gishath', 'loss', 4, 'Sep 5', 2, (), ('card_flow',), (G.seat('Peter', 'Gisa’s Graveyard', 'gisa', True), G.seat('Sam', 'Miku', 'miku'), fx.MAX()))),
    ('F', 'an anyone seat with a label, a pair', G.game('kratos', 'loss', 3, 'Sep 12', 2, (), (), (G.seat('Dana', 'Atraxa', 'giada', True), G.seat('Lee', 'Miku + Jace', 'miku')))),
]

CAPS = {
    'A': 'The shipped <code>vs</code> line, from the snapshot, trophy before the winner.',
    'B': 'Nothing reserved: no vs line, the marks dash (<code>noMarks</code>), the version dash. Reads as complete. The year shows because it isn’t this year.',
    'C': 'The shipped note line, quoted, no clamp (140 max).',
    'D': 'The version stamp reads <code>—</code> in <code>--fg-locked</code>, as the deck’s own row does.',
    'E': 'Snapshots: <i>Gisa’s Graveyard</i> reads as logged after Peter deleted it; Sam, since removed as a friend, keeps the name logged (Social R3 G5).',
    'F': 'Anyone seats read label · commander; a pair keeps both short names.',
}


def col(desk, social=True):
    out = ''
    for k, lab, g in R:
        cap = f'<p class="legend" style="margin:0 0 6px">{k} · {lab}</p>'
        out += f'<div style="display:flex;flex-direction:column">{cap}<ul class="q-gl">{G.row(g, desk, social)}</ul></div>'
    inner = f'<div style="display:flex;flex-direction:column;gap:18px;width:{358 if not desk else 1190}px">{out}</div>'
    return f'<div class="dk" style="width:1240px;display:block;padding:24px">{inner}</div>' if desk else inner


def off_phone():
    import b_pop
    b = G.head(False)
    b += G.filt_phone()
    b += G.summary('23 games logged. 9–12–2.', b_pop.SUM_LINES) + G.month('October 2026', '6 games') + G.glist(fx.OCT[:4], social=False)
    return G.phone(b, 1180, fade=True)


def off_desk():
    import b_pop
    b = G.head(True) + G.filt_desk(social=False) + G.summary('23 games logged. 9–12–2.', b_pop.SUM_LINES)
    b += G.month('October 2026', '6 games') + G.glist(fx.OCT, True, social=False)
    return G.desk(b, 1000, fade=True)


def build():
    body = L.head('3 · The row', 'The shipped history row, with its deck, read-only',
                  'Drawn from <code>game-history-row.tsx</code> and <code>game-vs-line.tsx</code> as shipped. Added: the deck (identity mark and name) as the row’s first line on the phone and a 230px first column on desktop, and a chevron. Removed: the ✕. '
                  'Kept, every slot: result square (W in <code>--success</code>, L and D neutral, never <code>--danger</code>), <i>N-player · date</i>, version stamp, the worked and hurt marks, the vs line, the note. Every name in a row is the owner’s snapshot.')
    body += '<div class="frames" style="gap:56px">'
    body += L.fr('<b>R1</b> · 390 · six rows', col(False), ' '.join(f'<b>{k}</b> {v}' for k, v in CAPS.items()))
    body += L.fr('<b>R2</b> · 1300 · the same', col(True), 'The marks stay: they are the row as shipped, and they are what a player scans for (“when did mana let me down?”). The vs line indents to the marks column, as on the deck’s tab.')
    body += '</div><div class="frames" style="gap:56px">'
    body += L.fr('<b>R3</b> · 390 · social games switch off', off_phone(), 'No vs lines, and no Played against in the sheet. The rest is whole: deck, result, pod, date, version, marks, note.')
    body += L.fr('<b>R4</b> · 1300 · the same', off_desk(), 'Played against leaves the filter row. Opponents already logged stay stored and come back with the switch.')
    body += '</div>'
    return G.build_doc('Game history · The row', body)
