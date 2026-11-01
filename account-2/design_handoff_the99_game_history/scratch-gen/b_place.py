"""Board 1 · Where it lives: a third segment on /decks, a door from Stats, and the landing on a deck's Games tab."""
import ghlib as G, lib8 as L

LANES = [('HD - Sai', 'U', '1 day ago', 'won 3 of 7 · pod of 4', [(.08, 'L'), (.31, 'W'), (.55, 'L'), (.9, 'L'), (.995, 'W')]),
         ('HD - Lathliss', 'R', '1 day ago', 'won 1 of 3 · pod of 4', [(.4, 'W'), (.7, 'L'), (.995, 'L')]),
         ('HD - Dina', 'BG', '7 days ago', 'won 2 of 8 · pods of 3–4', [(.12, 'L'), (.2, 'L'), (.45, 'W'), (.63, 'L'), (.82, 'L'), (.9, 'W'), (.93, 'L')]),
         ('HD - Ashling', 'R', '22 days ago', 'won 0 of 2 · pod of 5', [(.5, 'L'), (.8, 'D')])]


def recency(desk, door=True):
    ln = ''
    for n, c, ago, res, beads in LANES:
        bd = ''.join(f'<s class="{"q-w" if r == "W" else ""}" style="left:calc({p*100:.1f}% - 7px)">{r}</s>' for p, r in beads)
        nm = f'<span class="q-nm">{G.idm(c)}<u>{n}</u></span>'
        ft = f'<span class="q-ft"><b>{ago}</b><small>{res}</small></span>'
        ln += f'<div class="rln">{nm}<div class="ln2">{bd}</div>{ft}</div>' if desk else f'<div class="rln">{nm}{ft}<div class="ln2">{bd}</div></div>'
    dr = f'<span class="lnk newx">See every game ›</span>' if door else ''
    return (f'<div class="rcy"><header><h4>When each deck last played</h4><small>6 of 21 played</small><i>▴</i></header>'
            f'<div class="wn"><b>won 9 of 23</b><small>23 games · pods of 3–5 · Jul to Oct 2026</small></div><div>{ln}</div>'
            f'<div class="cpt"><span>Right edge is today.</span>{dr}</div></div>')


def stats_phone():
    b = G.head(False) + f'<div class="vrw">{G.switch("stats")}<span class="shp" style="font-weight:400;font-size:13px;color:var(--accent-text)">Expand all</span></div>'
    b += '<div class="cnt" style="border:0;padding-bottom:6px">21 decks · 3 brews included</div>' + recency(False)
    return G.phone(b, 1040, fade=True)


def stats_desk():
    b = G.head(True) + f'<div class="vrw">{G.switch("stats")}<span class="vsep"></span><span class="seg" style="height:34px"><span class="on">All decks</span><span>Finished only</span></span><span class="q-ft" style="font:11px IBM Plex Mono;color:var(--fg-faint)">21 decks · 3 brews included</span><span class="lnk" style="margin-left:auto;font-size:13px">Expand all</span></div>'
    b += '<div style="height:18px"></div>' + recency(True)
    return G.desk(b, 720, fade=True)


def landing(src, w, ring, pin, h=None):
    x, y, rw, rh = ring
    px, py = pin
    hh = f'height:{h}px;' if h else ''
    return (f'<div class="cap2" style="width:{w}px;{hh}border-radius:{34 if w < 500 else 12}px"><img src="art/{src}" alt="">'
            f'<span class="ring" style="left:{x}px;top:{y}px;width:{rw}px;height:{rh}px"></span>'
            f'<span class="q-pin" style="left:{px}px;top:{py}px">opened from Games · fades after 2s</span></div>')


def build():
    body = L.head('1 · Where it lives', 'A third view on Decks: Tiles · Stats · Games',
                  'The view row on <code>/decks</code> already switches Tiles and Stats (<code>stats-view-switch.tsx</code>, <code>?view=stats</code>). Games joins it as a third segment (<code>?view=games</code>). '
                  'Nothing is displaced: no new rail item, no user-menu row, no Home section. Stats’ <i>When each deck last played</i> card gains one door to it, and every row in it opens its deck’s Games tab, which stays the only place a game is logged.')
    body += '<div class="frames" style="gap:56px">'
    body += L.fr('<b>W1</b> · 390 · Stats, the door', stats_phone(), 'The recency card is the one place Stats already counts games across decks. Its caption line gains <i>See every game ›</i> (dashed: new), which opens Games with no filter on.')
    body += L.fr('<b>W2</b> · 1300 · the same', stats_desk(), 'Games sits third, after Stats: Tiles stays the default and Stats keeps its place and its moment. The segment is drawn when Stats is (<code>LINEUP_ENABLED</code>, one deck or more).')
    body += '</div><div class="frames" style="gap:56px">'
    body += L.fr('<b>W3</b> · 390 · a row pressed: the deck’s Games tab', landing('p-deck-games.webp', 390, (14, 466, 362, 128), (150, 456)),
                 'Over the shipped Games tab (About capture). The row opens <code>/decks/[id]?tab=games&amp;game=&lt;id&gt;</code>: the tab scrolls that game into view and rings it in accent for two seconds, then the ring fades. Back returns to the Games view where it was.')
    body += L.fr('<b>W4</b> · 1300 · the same', landing('d-games.webp', 1300, (90, 762, 1182, 80), (1040, 750)),
                 'Correcting a game stays where it is today: delete and relog on the deck’s tab. The Games view has no ✕ and no form.')
    body += '</div>'
    return G.build_doc('Game history · Where it lives', body)
