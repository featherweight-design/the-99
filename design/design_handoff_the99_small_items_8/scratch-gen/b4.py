"""Item 4 · Deck stats Results with 1 to 4 games: the ends line is wider than the beads."""
import lib8 as L
s = L.load('design_handoff_the99_small_items_7/Dates.dc.html')
CSS = """<style>
.rc8{box-sizing:border-box;display:flex;flex-direction:column;gap:16px;border-radius:12px;border:1px solid var(--border);background:var(--surface-sunken);padding:16px 14px}
.rc8.dkw{padding:20px 22px}
.rc8 header{display:flex;align-items:baseline;gap:10px;border-bottom:1px solid var(--border);padding-bottom:10px}
.rc8 header h3{margin:0;font:400 17px 'Cinzel',serif;color:var(--fg)}
.rc8.dkw header h3{font-size:19px}
.rc8 header span{flex:1}
.rc8 header small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.rc8 .rec{display:flex;flex-wrap:wrap;align-items:flex-end;gap:6px 16px}
.rc8 .rec b{font:600 34px/1 'IBM Plex Mono';color:var(--fg)}
.rc8 .rec .k{display:flex;flex-direction:column;gap:2px;padding-bottom:2px}
.rc8 .rec .k small{font:10px 'IBM Plex Mono';color:var(--fg-faint)}
.rc8 .rec .k span{font-size:12.5px;color:var(--fg-body)}
.rc8 .ev{display:flex;flex-direction:column;gap:8px}
.rc8 .ev>small{font:9.5px 'IBM Plex Mono';letter-spacing:.12em;color:var(--fg-faint)}
.rc8 .fit{display:flex;flex-direction:column;gap:8px;width:fit-content;max-width:100%;position:relative}
.rc8 ol{margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px}
.rc8 li{display:flex;flex-direction:column;align-items:center;gap:4px}
.rc8 li i{box-sizing:border-box;width:30px;height:30px;border-radius:5px;border:1px solid var(--fg-muted);display:flex;align-items:center;justify-content:center;font:600 11.5px 'IBM Plex Mono';font-style:normal;color:var(--fg-body)}
.rc8.dkw li i{width:28px;height:28px}
.rc8 li i.w{background:#C9A54E;border-color:#C9A54E;color:#14110E}
.rc8 li u{display:block;height:2px;width:100%;background:transparent}
.rc8 li u.on{background:var(--fg-muted)}
.rc8 .ends8{display:flex;justify-content:space-between;gap:8px;white-space:nowrap;font:10.5px 'IBM Plex Mono';color:var(--fg-muted)}
.rc8 .ends8.x8{outline:1.5px dashed rgba(198,83,63,.85);outline-offset:3px;border-radius:4px}
.rc8 .tr8{font-size:12.5px;color:var(--fg-body)}
.rc8 .tip8{position:absolute;left:70px;top:1px;font:11px 'IBM Plex Mono';color:var(--fg);background:var(--elevated);border:1px solid var(--border-strong);border-radius:6px;padding:4px 8px;white-space:nowrap;box-shadow:0 8px 20px rgba(0,0,0,.4)}
.pair8{display:flex;flex-direction:column;gap:18px}
</style>"""

DATES = ['Oct 2, 2025', 'Oct 9, 2025', 'Nov 14, 2025', 'Dec 3, 2025', 'Dec 31, 2025']
RES = ['w', 'l', 'w', 'w', 'l']


def card(n, ends, desk=False, tip=False):
    res = RES[:n]; dates = DATES[:1] if n == 1 else DATES[:n - 1] + ['Dec 31, 2025']
    w, l = res.count('w'), res.count('l')
    span = f'1 game, {dates[-1]}' if n == 1 else f'{n} games, {dates[0]} to {dates[-1]}'
    beads = ''.join(f'<li><i class="{r}">{r.upper()}</i><u></u></li>' for r in res)
    e = ''
    if ends == 'now':
        e = f'<div class="ends8 x8"><span>{dates[0]}</span>' + (f'<span>{dates[-1]}</span>' if n > 1 else '') + '</div>'
    elif ends == 'on':
        e = f'<div class="ends8"><span>{dates[0]}</span><span>{dates[-1]}</span></div>'
    t = '<span class="tip8">W · Oct 2, 2025</span>' if tip else ''
    games = '1 game' if n == 1 else f'{n} games'
    return (f'<section class="rc8{" dkw" if desk else ""}" style="width:{560 if desk else 358}px"><header><h3>Results</h3><span></span><small>{games}</small></header>'
            f'<div class="rec"><b>{w}–{l}–0</b><div class="k"><small>wins · losses · draws</small><span>{span}</span></div></div>'
            f'<div class="ev"><small>EVERY GAME, OLDEST FIRST</small><div class="fit">{t}<ol>{beads}</ol>{e}</div>'
            f'<span class="tr8">The last-five line starts at the sixth game.</span></div></section>')


def col(desk, ends):
    return '<div class="pair8">' + ''.join(card(n, ends(n), desk, tip=(desk and n == 2 and ends(n) != 'now')) for n in (1, 2, 4)) + '</div>'


def build():
    body = L.head('4 · Deck stats · Results with 1 to 4 games',
                  'Under five games, the row isn’t dated: the line beside the record already is',
                  'Small items 7 dated the row once, under its first and last beads, on a line as wide as the beads (<code>w-fit</code>). '
                  'Two dates at 10.5px mono need about 160px; five beads are 174 (164 at desktop). With 1 to 4 games the dates are wider than the beads, '
                  'so the line sets the width and the last date runs past the last bead. Drawn from <code>deck-stats-results.tsx</code> as shipped.')
    body += '<div class="frames" style="gap:44px;flex-wrap:wrap;row-gap:60px">'
    body += L.fr('<b>Now</b> · 390 · 1, 2 and 4 games', col(False, lambda n: 'now'),
                 'The ends (dashed) outrun the beads. One game draws its date alone, also wider than its bead.')
    body += L.fr('<b>Call</b> · 390 · 1, 2 and 4 games', col(False, lambda n: 'off'),
                 'No ends line under five games. The span line beside the record already says <i>2 games, Oct 2, 2025 to Dec 31, 2025</i>.')
    body += L.fr('<b>Call</b> · 390 · 5 games', '<div class="pair8">' + card(5, 'on') + '</div>',
                 'From five games the ends fit under the beads and are drawn as Small items 7 has them.')
    body += '</div><div class="frames" style="gap:44px;flex-wrap:wrap;row-gap:60px">'
    body += L.fr('<b>Now</b> · 1300 · 1, 2 and 4 games', col(True, lambda n: 'now'), 'The same at 28px beads.')
    body += L.fr('<b>Call</b> · 1300 · 1, 2 and 4 games', col(True, lambda n: 'off'),
                 'The hover and focus date per bead is unchanged (drawn on the 2-game card).')
    body += '</div>'
    body += L.rule('The call', [
        '<b>Draw the ends line from five beads.</b> Under five (<code>beads.length &lt; 5</code>), <code>data-results-ends</code> is not drawn. The span line beside the record (<code>copy.span</code>) already names the first and last game, so nothing is lost.',
        '<b>Why five, not a measurement:</b> the longest pair, <i>Dec 31, 2025</i> twice, is about 160px; five beads are 174 on the phone and 164 at desktop. A fixed count keeps the line from flickering on a resize.',
        '<b>Unchanged:</b> the per-bead tooltip on a fine pointer, the spoken label on each bead, and the last-five underline.',
        'No new string.'])
    return L.doc('Small items 8 · Results beads', L.helmet(s) + CSS, body, 2000)
