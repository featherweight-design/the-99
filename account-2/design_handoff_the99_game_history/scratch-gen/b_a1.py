"""Addendum A1 · the engineering audit's frames: filters with no matches, the Games segment pending, next fifty failed at 1300."""
import ghlib as G, lib8 as L, b_edge

ZCSS = """<style>
.zr{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:26px 0 8px}
.zr h3{margin:0;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.dk .zr .bg{height:36px;font-size:13px}
.seg span.pd{background:var(--elevated);color:var(--fg);font-weight:500}
.seg span.pd i{display:inline-block;width:4px;height:4px;background:var(--fg-muted);transform:rotate(45deg);margin-left:7px}
.seg span.tl{background:transparent;color:var(--fg-muted);font-weight:400}
</style>"""
Z = '<div class="zr"><h3>No games match</h3><span class="bg">Clear filters</span></div>'


def zero(desk):
    if desk:
        b = G.head(True) + G.filt_desk('HD - Sai', 'Won', 'Colin', ('HD - Sai', 'Colin', 'Won'), '0 games') + Z
        return G.desk(b, 560)
    b = G.head(False) + G.filt_phone('HD - Sai', 5, ('Colin', 'Won'), '0 games', badge=2) + Z
    return G.phone(b, 844)


def zero_sheet():
    import b_pop
    sh = b_pop.sheet_phone()
    sh = sh.replace('<span class="q-tg">Won<small>9</small></span>', '<span class="q-tg on">Won<small>2</small></span>', 1)
    sh = sh.replace('<span class="bp">Show 9 games</span>', '<span class="bp">Show 0 games</span>').replace('9 games logged.', '5 games logged. 2–3.').replace('<div class="cnt">9 games</div>', '<div class="cnt">5 games</div>')
    sh = sh.replace('<span class="q-tg">Lost<small>12</small></span><span class="q-tg">Drawn<small>2</small></span>', '<span class="q-tg">Lost<small>3</small></span><span class="q-tg">Drawn<small>0</small></span>')
    return sh


def pend_switch():
    return '<span class="seg"><span class="tl">Decks</span><span class="pd">Games<i></i></span><span>Stats</span></span>'


def pend_phone():
    b = G.head(False) + '<div class="vrw">' + pend_switch() + '<span class="q-shp">All decks<small>24</small><i>&#9662;</i></span></div>'
    b += '<div class="cnt" style="margin-top:12px">24 decks</div>'
    b += '<div class="capx" style="margin:0 -16px;height:300px"><img src="art/p-decks.webp" alt="" style="width:390px;left:0;top:-459px"></div>'
    return G.phone(b, 844)


def pend_desk():
    b = G.head(True) + '<div class="vrw">' + pend_switch() + '<span class="vsep"></span><span class="seg" style="height:34px"><span class="on">All decks</span><span>Custom Builds</span><span>Precon Tune</span></span></div>'
    b += '<div class="cnt" style="margin-top:14px">24 decks</div><div class="capx" style="margin:0 -22px;height:420px"><img src="art/d-decks2.webp" alt="" style="width:1300px;left:-62px;top:-354px"></div>'
    return G.desk(b, 640)


def build():
    body = L.head('Addendum A1 · engineering audit (lane c4), 2026-11-01', 'Filters with no matches, and two states the audit asked for',
                  'The audit on #2551 was ORANGE on one missing frame: Deck, Played against and Result combine, so they can match nothing. Drawn here at 390 and 1300, with the two optional frames: the Games segment while its first read runs, and the next fifty failing at 1300. Copy follows the shipped Decks filter empty (<code>refresh.ts</code> <i>No decks match</i> / <i>Clear filters</i>).', 'A1')
    body += '<div class="frames" style="gap:56px">'
    body += L.fr('<b>Z1</b> · 390 · Sai, Colin, Won: no games', zero(False),
                 'The chips and Clear all filters stay; the count reads <i>0 games</i>. The headline, its lines and most played go, and so do the month heads. One line, <b>No games match</b>, and one way out, <b>Clear filters</b>, as the shipped Decks grid does.')
    body += L.fr('<b>Z2</b> · 1300 · the same', zero(True), 'Each chip’s ✕ takes off one filter; Clear filters takes off all three. The dropdowns keep their values.')
    body += '</div><div class="frames" style="gap:56px">'
    body += L.fr('<b>Z3</b> · 390 · the sheet before it closes', zero_sheet(),
                 'Counts in the sheet are within the other filters, so Won reads 2 and Drawn 0. A zero option stays pressable (no disabled state); the button reads <i>Show 0 games</i> and closing on it lands on Z1.')
    body += L.fr('<b>P1</b> · 390 · Games pressed, first read running', pend_phone(),
                 'As Stats does today (<code>stats-view-switch.tsx</code> <code>busy</code>): the Games segment takes the chosen fill under the finger with the shell’s 4px pending diamond beside its label; the deck tiles stay drawn and live until the read lands, then flip in place. A second press is ignored. A failure falls back to the Decks segment with the toast (X1).')
    body += '</div><div class="frames" style="gap:56px">'
    body += L.fr('<b>P2</b> · 1300 · the same', pend_desk(), '')
    body += '</div><div class="frames" style="gap:56px">'
    body += L.fr('<b>L4</b> · 1300 · the next fifty failed', b_edge.long_desk('more', True), 'The shared toast bottom right (the desktop ToastFrame slot), Try again; the foot returns to <i>Show 50 more</i> and nothing shown moves.')
    body += '</div>'
    body += L.rule('Errata from the audit (no frame change)', [
        '<b>One game:</b> F1 and F4 read <i>One game logged.</i>, reusing the shipped <code>gameLogCopy</code> <code>oneGame</code>, not “1 game logged.”.',
        '<b>Switches:</b> <code>SOCIAL_GAMES_ENABLED</code> and <code>LINEUP_ENABLED</code> are retired. Rows R3–R4 (“social games off”) read as <b>friends off</b> (<code>SOCIAL_FRIENDS_ENABLED</code>); the Games segment draws when the page passes <code>lineup</code>. The Rule 0 line in E1 needs the friends switch and a pod.',
        '<b>Friend names</b> in the Played against list, chips and summary lines (<i>with Colin at the table</i>, <i>Colin won 2 of the 3 you lost</i>) are drawn through <code>PersonName</code>/<code>PersonText</code>. A friend whose account is gone reads as logged in rows but is not offered as a filter.',
        '<b>DRAFT lines</b> for <code>/copy-review</code>: the empty body, the 1–2 game line, and the Rule 0 line.',
    ])
    return G.build_doc('Game history · Addendum A1', body, extra_css=ZCSS)
