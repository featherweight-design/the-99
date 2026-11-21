# Life tracker addendum: tablet 2 and 3, tablet upright (portrait), the strip's Menu (2026-11-21).
# Built on the live approved boards: the F18 panel anatomy and strip (CSS copied from F18), F03 for the phone Menu.
# usage: python3 -I gen_tablet_menu.py <dir holding the live project/*.dc.html> <out project dir>
import os, re, sys, json
SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
def rd(n): return open(os.path.join(SRC, n), encoding='utf-8').read()
def sub(s, a, b, n=1):
    assert a in s, a[:80]
    return s.replace(a, b, n)

F18 = rd('F18-Tablet4.dc.html')
BASE_CSS = re.search(r'<style>\n(.*?)\n</style>', F18, re.S).group(1)
BASE_CSS = BASE_CSS.replace('\n.scr{grid-template-columns:repeat(6,minmax(0,1fr))!important}', '')

ART = dict(Colin='3a9cc48d946086f7a01702d812ad49a7', Peter='de887acf2dd3696e7f72d8630ef63661', You='019b993ea74dc7eef2d2e5a820befefa',
           Max='747b6b5b0a287c64fc2a76924491c25e', Chris='4a0fd5eea277545f56c74cbec6b0a96e', Sam=None)
DECK = dict(Colin='Ghalta Stompy', Peter='Giada Angels', You='Sai Thopters', Max='Gisa Zombies', Chris='Killian', Sam='guest · no deck picked')
LIFE = dict(Colin=27, Peter=34, You=31, Max=38, Chris=40, Sam=40)

SVG = '<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{p}</svg>'
P = dict(
    up='<path d="M6 15l6-6 6 6"/>', turn='<path d="M5 12h12M13 6l6 6-6 6"/>',
    crown='<path d="M3 18l2-10 4.5 4L12 5l2.5 7L19 8l2 10z"/>', shield='<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
    sun='<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    dice='<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
    undo='<path d="M9 7L4 12l5 5"/><path d="M4 12h10a5 5 0 010 10h-2"/>',
    more='<circle cx="5.5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
    door='<path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>',
    poison='<circle cx="12" cy="12" r="7"/><path d="M12 3v18"/>')
def ic(n, s=24, w=1.8): return SVG.format(s=s, w=w, p=P[n])

EXTRA = '''.scr{display:block!important;padding:0!important}
.cell{position:absolute}
.rot{inset:auto}
.plain{background:radial-gradient(var(--elevated),var(--surface))}
.spine{position:absolute}
.spine.v{flex-direction:column;gap:14px}
.v .rule{width:26px;height:1px}
.sb.open{background:var(--accent);color:var(--bg);box-shadow:none}
.pop{position:absolute;z-index:5;box-sizing:border-box;width:300px;padding:8px;border-radius:16px;background:var(--elevated);box-shadow:0 12px 32px rgba(0,0,0,.45)}
.mi{display:flex;align-items:center;gap:12px;width:100%;min-height:64px;box-sizing:border-box;padding:8px 14px 8px 8px;border:0;border-radius:10px;background:var(--surface);color:var(--fg);font-family:"IBM Plex Sans",sans-serif;text-align:left}
.mi .ic{flex:none;width:44px;height:44px;border-radius:50%;background:var(--elevated);box-shadow:inset 0 0 0 1px var(--border-strong);color:var(--fg-body);display:flex;align-items:center;justify-content:center}
.mi b{display:block;font-size:15px;font-weight:600}
.mi small{display:block;margin-top:2px;font-size:12.5px;line-height:1.4;color:var(--fg-muted)}'''

ROT_NORM = {0: 0, 90: 90, 180: 180, 270: -90, -90: -90, -180: 180}

def badge(name):
    if name == 'Peter': return f'<span class="bd"><img src="/_blob/{ART["Colin"]}" alt="">Ghalta 6</span>'
    if name == 'You': return f'<span class="bd">{ic("poison", 13, 2)}Poison 2</span>'
    if name == 'Max': return f'<span class="bd acc">{ic("crown", 14, 2)}Monarch</span>'
    return ''

def panel(c, name, active=False, monarch_ok=True):
    x, y, w, h, rot = c
    side = rot in (90, -90)
    rw, rh = (h, w) if side else (w, h)
    left, top = (w - rw) / 2, (h - rh) / 2
    fs = int(min(150, (rh - 108) * 0.95))
    poss = 'Your' if name == 'You' else name + "'s"
    lose, gain = ('lose', 'gain') if name == 'You' else ('loses', 'gains')
    b = badge(name) if (name != 'Max' or monarch_ok) else ''
    if name == 'Peter' and 'Colin' not in seated: b = ''
    endt = f'<button class="endt">End turn{ic("turn", 18, 2.2)}</button>' if active else ''
    art = f'<img class="art" src="/_blob/{ART[name]}" alt=""><div class="wash"></div>' if ART[name] else ''
    cls = 'cell' + (' turn' if active else '') + ('' if ART[name] else ' plain')
    tr = f';transform:rotate({rot}deg)' if rot else ''
    return (f'  <div class="{cls}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px"><div class="rot" style="width:{rw}px;height:{rh}px;left:{left:g}px;top:{top:g}px{tr}">{art}<div class="pane">\n'
            f'    <div class="who"><b>{name}</b><i>{DECK[name]}</i></div>\n'
            f'    <div class="life"><button class="half minus" aria-label="{name} {lose} 1 life">−</button><span class="num" style="font-size:{fs}px">{LIFE[name]}</span><button class="half plus" aria-label="{name} {gain} 1 life">+</button></div>\n'
            f'    <div class="foot">{endt}{b}<button class="mk" aria-label="{poss} sheet">{ic("up", 22, 2)}</button></div>\n'
            '  </div></div></div>\n')

def strip(r, monarch='Max', menu_open=False):
    x, y, w, h = r
    v = ' v' if h > w else ''
    s = f'  <div class="spine{v}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px">\n'
    s += '    <div class="sb t" aria-label="Round 2, Colin\'s turn">2</div>\n    <div class="rule"></div>\n'
    if monarch:
        s += f'    <button class="sb on" aria-label="Monarch: {monarch}. Tap to pass it">{ic("crown")}<img src="/_blob/{ART[monarch]}" alt=""></button>\n'
    else:
        s += f'    <button class="sb off" aria-label="Monarch: nobody. Tap to pass it">{ic("crown")}</button>\n'
    s += f'    <button class="sb off" aria-label="Initiative: nobody. Tap to pass it">{ic("shield")}</button>\n'
    s += f'    <button class="sb on" aria-label="It is day. Tap to make it night">{ic("sun")}</button>\n'
    s += f'    <button class="sb" aria-label="Roll dice or flip a coin">{ic("dice")}</button>\n    <div class="rule"></div>\n'
    s += f'    <button class="sb" aria-label="Undo the last change">{ic("undo")}</button>\n'
    s += f'    <button class="sb{" open" if menu_open else ""}" aria-label="Menu" aria-expanded="{"true" if menu_open else "false"}">{ic("more")}</button>\n  </div>\n'
    return s

def page(title, W, H, body, css=''):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
{BASE_CSS}
{EXTRA}{css}
</style>
</helmet>
<div class="scr" style="width:{W}px;height:{H}px">
{body}</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{W},"height":{H}}}}}'>
class Component extends DCLogic {{
  renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''

# ---- layouts (cells in turn order, clockwise from the seat nearest the bottom; same grammar as layouts.ts) ----
TS = (10, 378, 1160, 64)
LAND = {
    'tablet-2': ([(10, 452, 1160, 358, 0), (10, 10, 1160, 358, 180)], TS, ['You', 'Colin']),
    'tablet-3-end': ([(10, 452, 900, 358, 0), (10, 10, 900, 358, 180), (920, 10, 250, 800, -90)], (10, 378, 900, 64), ['You', 'Colin', 'Peter']),
    'tablet-3-side': ([(790, 84, 380, 726, 0), (400, 84, 380, 726, 0), (10, 84, 380, 726, 0)], (10, 10, 1160, 64), ['Peter', 'You', 'Colin']),
    'tablet-4': ([(10, 452, 570, 358, 0), (10, 10, 570, 358, 180), (600, 10, 570, 358, 180), (600, 452, 570, 358, 0)], TS, ['You', 'Colin', 'Peter', 'Max']),
    'tablet-5': ([(10, 452, 380, 358, 0), (10, 10, 575, 358, 180), (595, 10, 575, 358, 180), (790, 452, 380, 358, 0), (400, 452, 380, 358, 0)], TS, ['You', 'Colin', 'Peter', 'Chris', 'Max']),
    'tablet-6': ([(10, 452, 380, 358, 0), (10, 10, 380, 358, 180), (400, 10, 380, 358, 180), (790, 10, 380, 358, 180), (790, 452, 380, 358, 0), (400, 452, 380, 358, 0)], TS, ['You', 'Colin', 'Peter', 'Chris', 'Sam', 'Max']),
}
# Upright: the same seats on the same edges of the glass, turned a quarter. The landscape bottom edge becomes the left long edge.
def quarter(c):
    x, y, w, h, rot = c
    return (820 - (y + h), x, h, w, ROT_NORM[rot + 90])
def quarter_r(r):
    x, y, w, h = r
    return (820 - (y + h), x, h, w)

files = {}
def board(key, title, W, H, cells, spine_r, names, monarch='Max', extra='', css=''):
    global seated
    seated = names
    body = ''
    for c, n in zip(cells, names):
        body += panel(c, n, active=(n == 'Colin'), monarch_ok=(monarch == 'Max'))
    body += strip(spine_r, monarch=monarch, menu_open=bool(extra))
    body += extra
    files[key] = (title, W, H, page(title, W, H, body, css))

seated = []
c, s, n = LAND['tablet-2']; board('T1-Tablet2', 'T1 · Tablet, 2 players: face to face', 1180, 820, c, s, n, monarch=None)
c, s, n = LAND['tablet-3-end']; board('T2-Tablet3End', 'T2 · Tablet, 3 players: one at the end', 1180, 820, c, s, n, monarch=None)
c, s, n = LAND['tablet-3-side']; board('T3-Tablet3Side', 'T3 · Tablet, 3 players: along one side', 1180, 820, c, s, n, monarch=None)

for key, lid, title in (('V2-Upright2', 'tablet-2', 'V2 · Upright, 2 players: face to face'),
                        ('V3-Upright3', 'tablet-3-end', 'V3 · Upright, 3 players: one at the end'),
                        ('V4-Upright4', 'tablet-4', 'V4 · Upright, 4 players: two and two'),
                        ('V5-Upright5', 'tablet-5', 'V5 · Upright, 5 players: three and two'),
                        ('V6-Upright6', 'tablet-6', 'V6 · Upright, 6 players: three and three')):
    c, s, n = LAND[lid]
    board(key, title, 820, 1180, [quarter(x) for x in c], quarter_r(s), n, monarch=('Max' if 'Max' in n else None))

# ---- Menu ----
def pop(left, top, dev):
    return (f'  <div class="pop" role="menu" aria-label="Menu" style="left:{left}px;top:{top}px">'
            f'<button class="mi" role="menuitem"><span class="ic">{ic("door", 22)}</span><span><b>Back to the table</b>'
            f'<small>The game stays on this {dev}. Back to the game picks it up.</small></span></button></div>\n')

# Tablet: F18 (4 players) with the Menu open above its button, centred on it.
c, s, n = LAND['tablet-4']
# strip buttons: round 52, 6x48 + menu 48, 2 rules, 16px gaps -> centre of the Menu button
items = [52, 1, 48, 48, 48, 48, 1, 48, 48]
tot = sum(items) + 16 * (len(items) - 1)
mx = 10 + (1160 - tot) / 2 + tot - 24
board('M1-Menu-Tablet', 'M1 · The strip\'s Menu, tablet', 1180, 820, c, s, n, extra=pop(int(mx - 150), 290, 'tablet'))  # measured: Menu button at y 386, popover 86 tall, 10 above

# Phone: F03 (4 players, two long sides) with the Menu button added after Undo, open above it.
F03 = rd('F03-First.dc.html')
undo_btn = re.search(r'    <button class="sb" aria-label="Undo the last change">.*?</button>\n', F03).group(0)
ph = F03.replace(undo_btn, undo_btn + f'    <button class="sb open" aria-label="Menu" aria-expanded="true">{ic("more")}</button>\n', 1)
# F03 strip column: 12px gaps; count its items to place the popover over the Menu button
spine_html = re.search(r'<div class="spine">(.*?)\n  </div>', ph, re.S).group(1)
n_btn = spine_html.count('class="sb')
n_rule = spine_html.count('class="rule"')
col = n_btn * 48 + 2 + n_rule * 1 + 12 * (n_btn + n_rule - 1)  # the round is .sb t (52): adjust
col += 4 if 'class="sb t"' in spine_html else 0
top_of_col = 6 + (832 - col) / 2
menu_top = top_of_col + col - 48
EXTRA_PH = EXTRA.split('\n.pop')[0].replace('.scr{display:block!important;padding:0!important}\n.cell{position:absolute}\n.rot{inset:auto}\n.plain{background:radial-gradient(var(--elevated),var(--surface))}\n.spine{position:absolute}\n.spine.v{flex-direction:column;gap:14px}\n.v .rule{width:26px;height:1px}\n', '')
POP_CSS = '\n.pop' + EXTRA.split('\n.pop', 1)[1]
ph = ph.replace('</style>', EXTRA_PH + POP_CSS + '\n</style>', 1)
ph = sub(ph, '\n</div>\n</x-dc>', '\n' + pop(45, 496, 'phone') + '</div>\n</x-dc>')
ph = re.sub(r'<title>.*?</title>', '<title>M1 · The strip\'s Menu, phone</title>', ph, count=1)
files['M1-Menu-Phone'] = ('M1 · The strip\'s Menu: one way out, and the game stays', 390, 844, ph)

meta = {}
for k, (title, w, h, html) in files.items():
    open(os.path.join(OUT, k + '.dc.html'), 'w', encoding='utf-8').write(html)
    meta[k + '.dc.html'] = dict(title=title, w=w, h=h)
json.dump(meta, open(os.path.join(OUT, '_meta.json'), 'w'), indent=1)
print('\n'.join(meta))
