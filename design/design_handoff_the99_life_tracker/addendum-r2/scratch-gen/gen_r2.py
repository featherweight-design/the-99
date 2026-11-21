# Life tracker addendum R2 (2026-11-21): parity of table arrangements, the lighter gain/loss cue, the spine press and
# the day/night spin. Built on the live approved boards: L1's row panel and strip (phone, tablet ends), F18's foot panel
# and strip (tablet grid layouts), F04's pressed half and pending delta.
# usage: python3 -I gen_r2.py <dir holding the live project/*.dc.html> <out project dir>
import os, re, sys, json
SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
def rd(n): return open(os.path.join(SRC, n), encoding='utf-8').read()
def css_of(html): return re.search(r'<style>\n(.*?)\n</style>', html, re.S).group(1)

ROW_CSS = css_of(rd('L1-Phone4Around.dc.html'))
FOOT_CSS = css_of(rd('F18-Tablet4.dc.html')).replace('\n.scr{grid-template-columns:repeat(6,minmax(0,1fr))!important}', '')
FONTS = '\n'.join(l for l in ROW_CSS.split('\n') if l.startswith('@font-face') or l == 'body{margin:0}')
TOK = '--bg:#14110E;--surface:#1E1A15;--elevated:#29241F;--border:#2B241B;--border-strong:#3A3229;--fg:#EDE6D8;--fg-body:#C0B8A6;--fg-muted:#A59C89;--fg-faint:#948B78;--accent:#CF8745;--accent-dim:#6B482A;--success:#6FA368;--danger:#C6533F'

ART = dict(Colin='3a9cc48d946086f7a01702d812ad49a7', Peter='de887acf2dd3696e7f72d8630ef63661', You='019b993ea74dc7eef2d2e5a820befefa',
           Max='747b6b5b0a287c64fc2a76924491c25e', Chris='4a0fd5eea277545f56c74cbec6b0a96e', Sam=None)
DECK = dict(Colin='Ghalta Stompy', Peter='Giada Angels', You='Sai Thopters', Max='Gisa Zombies', Chris='Killian', Sam='guest · no deck')
LIFE = dict(Colin=27, Peter=34, You=31, Max=38, Chris=40, Sam=40)

SVG = '<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{p}</svg>'
P = dict(
    up='<path d="M6 15l6-6 6 6"/>', turn='<path d="M5 12h12M13 6l6 6-6 6"/>',
    crown='<path d="M3 18l2-10 4.5 4L12 5l2.5 7L19 8l2 10z"/>', shield='<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
    sun='<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    moon='<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
    dice='<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
    undo='<path d="M9 7L4 12l5 5"/><path d="M4 12h10a5 5 0 010 10h-2"/>',
    more='<circle cx="5.5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
    poison='<circle cx="12" cy="12" r="7"/><path d="M12 3v18"/>')
def ic(n, s=24, w=1.8): return SVG.format(s=s, w=w, p=P[n])
ROT_NORM = {0: 0, 90: 90, 180: 180, 270: -90, -90: -90, -180: 180}

EXTRA = '''.scr{display:block!important;padding:0!important}
.cell{position:absolute}
.rot{position:absolute;inset:auto}
.plain{background:radial-gradient(var(--elevated),var(--surface))}
.spine{position:absolute}
.who i{min-width:0;overflow:hidden;text-overflow:ellipsis}
.who b{flex:none}
.num{position:relative}
.delta{position:absolute;left:100%;top:8px;margin-left:6px;font-family:"IBM Plex Mono",monospace;font-size:18px;font-weight:500;color:var(--accent);text-shadow:none}
.press{background:rgba(207,135,69,.18)!important;color:var(--accent)!important}
.press.loss{background:rgba(198,83,63,.16)!important;color:#E07A66!important}
.press.gain{background:rgba(111,163,104,.16)!important;color:#8CC284!important}
.delta.loss{color:#E07A66}.delta.gain{color:#8CC284}
.sb.open{background:var(--accent);color:var(--bg);box-shadow:none}
.endt.sq{flex:none;width:44px;height:44px;padding:0;justify-content:center}'''
ROW_EXTRA = '''.spine.v{flex-direction:column}
.spine.h{flex-direction:row;gap:16px}
.v .rule{width:26px;height:1px}.h .rule{width:1px;height:26px}'''

# ---- layouts: cells clockwise from the seat nearest the bottom (layouts.ts grammar); rot 0 bottom, 90 left, 180 top, -90 right ----
PH, TB = (390, 844), (1180, 820)
PHS, TBS = (167, 202, 56, 440), (10, 378, 1160, 64)
L = {
  # phone, as layouts.ts today
  'phone-2': ('phone', 'Face to face', [(6, 648, 378, 190, 0), (6, 6, 378, 190, 180)], PHS),
  'phone-3-end': ('phone', 'One at the end', [(6, 648, 378, 190, 0), (6, 6, 155, 636, 90), (229, 6, 155, 636, -90)], (167, 6, 56, 636)),
  'phone-3-side': ('phone', 'Along one side', [(6, 565, 316, 273, 90), (6, 285, 316, 274, 90), (6, 6, 316, 273, 90)], (328, 6, 56, 832)),
  'phone-4-sides': ('phone', 'Two and two', [(6, 425, 155, 413, 90), (6, 6, 155, 413, 90), (229, 6, 155, 413, -90), (229, 425, 155, 413, -90)], (167, 6, 56, 832)),
  'phone-4-around': ('phone', 'One on each side', [(6, 648, 378, 190, 0), (6, 202, 155, 440, 90), (6, 6, 378, 190, 180), (229, 202, 155, 440, -90)], PHS),
  # phone, R2: the tablet's set at 5 and 6
  'phone-5': ('phone', 'Three and two', [(6, 425, 155, 413, 90), (6, 6, 155, 413, 90), (229, 6, 155, 273, -90), (229, 285, 155, 274, -90), (229, 565, 155, 273, -90)], (167, 6, 56, 832)),
  'phone-5-end': ('phone', 'One at the end', [(6, 648, 378, 190, 0), (6, 327, 155, 315, 90), (6, 6, 155, 315, 90), (229, 6, 155, 315, -90), (229, 327, 155, 315, -90)], (167, 6, 56, 636)),
  'phone-6': ('phone', 'Three and three', [(6, 565, 155, 273, 90), (6, 285, 155, 274, 90), (6, 6, 155, 273, 90), (229, 6, 155, 273, -90), (229, 285, 155, 274, -90), (229, 565, 155, 273, -90)], (167, 6, 56, 832)),
  'phone-6-ends': ('phone', 'Ends', [(6, 648, 378, 190, 0), (6, 425, 155, 217, 90), (6, 202, 155, 217, 90), (6, 6, 378, 190, 180), (229, 202, 155, 217, -90), (229, 425, 155, 217, -90)], PHS),
  # tablet, as layouts.ts and the #3115 addendum
  'tablet-2': ('tablet', 'Face to face', [(10, 452, 1160, 358, 0), (10, 10, 1160, 358, 180)], TBS),
  'tablet-3-end': ('tablet', 'One at the end', [(10, 452, 900, 358, 0), (10, 10, 900, 358, 180), (920, 10, 250, 800, -90)], (10, 378, 900, 64)),
  'tablet-3-side': ('tablet', 'Along one side', [(790, 84, 380, 726, 0), (400, 84, 380, 726, 0), (10, 84, 380, 726, 0)], (10, 10, 1160, 64)),
  'tablet-4': ('tablet', 'Two and two', [(10, 452, 575, 358, 0), (10, 10, 575, 358, 180), (595, 10, 575, 358, 180), (595, 452, 575, 358, 0)], TBS),
  # tablet, R2: one on each side, drawn (not the phone's cells scaled)
  'tablet-4-around': ('tablet', 'One on each side', [(270, 452, 640, 358, 0), (10, 10, 250, 800, 90), (270, 10, 640, 358, 180), (920, 10, 250, 800, -90)], (270, 378, 640, 64)),
  'tablet-5': ('tablet', 'Three and two', [(10, 452, 575, 358, 0), (10, 10, 380, 358, 180), (400, 10, 380, 358, 180), (790, 10, 380, 358, 180), (595, 452, 575, 358, 0)], TBS),
  'tablet-5-end': ('tablet', 'One at the end', [(10, 452, 445, 358, 0), (10, 10, 445, 358, 180), (465, 10, 445, 358, 180), (920, 10, 250, 800, -90), (465, 452, 445, 358, 0)], (10, 378, 900, 64)),
  'tablet-6': ('tablet', 'Three and three', [(10, 452, 380, 358, 0), (10, 10, 380, 358, 180), (400, 10, 380, 358, 180), (790, 10, 380, 358, 180), (790, 452, 380, 358, 0), (400, 452, 380, 358, 0)], TBS),
  'tablet-6-ends': ('tablet', 'Ends', [(270, 452, 315, 358, 0), (10, 10, 250, 800, 90), (270, 10, 315, 358, 180), (595, 10, 315, 358, 180), (920, 10, 250, 800, -90), (595, 452, 315, 358, 0)], (270, 378, 640, 64)),
}
FOOT = {'tablet-4', 'tablet-5', 'tablet-6'}
NEW = {'phone-5', 'phone-5-end', 'phone-6', 'tablet-4-around'}
SEATS = {2: ['You', 'Colin'], 3: ['You', 'Colin', 'Peter'], 4: ['You', 'Colin', 'Peter', 'Max'],
         5: ['You', 'Colin', 'Peter', 'Chris', 'Max'], 6: ['You', 'Colin', 'Peter', 'Chris', 'Sam', 'Max']}

def quarter(c):  # turned(): the landscape bottom edge becomes the upright left edge
    x, y, w, h, rot = c
    return (820 - (y + h), x, h, w, ROT_NORM[rot + 90])
def quarter_r(r):
    x, y, w, h = r
    return (820 - (y + h), x, h, w)

def life_size(dev, w, h):  # lifeSize() in layouts.ts
    s, l = min(w, h), max(w, h)
    if dev == 'tablet': return 150 if s >= 300 else 140
    if s >= 270: return 110
    if s >= 180: return 106
    return 88 if l == 413 else 86

def life_html(name, fs, cue):
    poss_l, poss_g = (('You lose', 'You gain') if name == 'You' else (name + ' loses', name + ' gains'))
    d = cue.get(name)  # (delta, style) style '' = accent (A), 'tint' = option B
    mc = pc = ''
    num, dl = LIFE[name], ''
    if d:
        delta, style = d
        k = ' loss' if delta < 0 else ' gain'
        k2 = k if style == 'tint' else ''
        if delta < 0: mc = ' press' + k2
        else: pc = ' press' + k2
        num = LIFE[name] + delta
        dl = f'<span class="delta{k2}">{"−" if delta < 0 else "+"}{abs(delta)}</span>'
    return (f'<div class="life"><button class="half minus{mc}" aria-label="{poss_l} 1 life">−</button>'
            f'<span class="num" style="font-size:{fs}px">{num}{dl}</span>'
            f'<button class="half plus{pc}" aria-label="{poss_g} 1 life">+</button></div>')

def badge(name, seated):
    if name == 'Peter' and 'Colin' in seated: return f'<span class="bd"><img src="/_blob/{ART["Colin"]}" alt="">Ghalta 6</span>'
    if name == 'You': return f'<span class="bd">{ic("poison", 13, 2)}Poison 2</span>'
    if name == 'Max': return f'<span class="bd acc">{ic("crown", 14, 2)}Monarch</span>'
    return ''

def panel(dev, foot, c, name, seated, cue, active):
    x, y, w, h, rot = c
    side = rot in (90, -90)
    rw, rh = (h, w) if side else (w, h)
    left, top = (w - rw) / 2, (h - rh) / 2
    poss = 'Your' if name == 'You' else name + "'s"
    art = f'<img class="art" src="/_blob/{ART[name]}" alt=""><div class="wash"></div>' if ART[name] else ''
    cls = 'cell' + (' turn' if active else '') + ('' if ART[name] else ' plain')
    tr = f';transform:rotate({rot}deg)' if rot else ''
    deck = f'<i>{DECK[name]}</i>'
    mk = f'<button class="mk" aria-label="{poss} sheet">{ic("up", 22 if foot else 20, 2)}</button>'
    if foot:
        fs = int(min(150, (rh - 108) * 0.95))
        endt = f'<button class="endt">End turn{ic("turn", 18, 2.2)}</button>' if active else ''
        inner = (f'<div class="pane"><div class="who"><b>{name}</b>{deck}</div>{life_html(name, fs, cue)}'
                 f'<div class="foot">{endt}{badge(name, seated)}{mk}</div></div>')
    else:
        fs = life_size(dev, w, h)
        # A row under 240 px (phone 6 with ends: 217) can't hold the name, End turn's label and the sheet button, so
        # End turn keeps only its arrow: a 44 px accent circle named "End turn".
        if active and rw < 240: endt = f'<button class="endt sq" aria-label="End turn">{ic("turn", 18, 2.2)}</button>'
        else: endt = f'<button class="endt">End turn{ic("turn", 16, 2.2)}</button>' if active else ''
        inner = f'<div class="pane"><div class="who"><b>{name}</b>{deck}{endt}{mk}</div>{life_html(name, fs, cue)}</div>'
    return (f'  <div class="{cls}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px"><div class="rot" style="width:{rw}px;height:{rh}px;left:{left:g}px;top:{top:g}px{tr}">'
            f'{art}{inner}</div></div>\n')

def strip(foot, r, seated):
    x, y, w, h = r
    col = h > w
    mon = 'Max' if 'Max' in seated else None
    if foot:
        cls, rnd = 'spine', '<div class="sb t" aria-label="Round 2, Colin\'s turn">2</div>'
        gap = 'gap:16px;' + ('flex-direction:column;' if col else '')
    else:
        cls, rnd = 'spine ' + ('v' if col else 'h'), '<div class="tn" aria-label="Round 2, Colin\'s turn">2</div>'
        gap = ('gap:10px;' if col and h < 470 else '')
    s = f'  <div class="{cls}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;{gap}">{rnd}<div class="rule"></div>'
    if mon: s += f'<button class="sb on" aria-label="Monarch: Max. Tap to pass it">{ic("crown")}<img src="/_blob/{ART["Max"]}" alt=""></button>'
    else: s += f'<button class="sb off" aria-label="Monarch: nobody. Tap to pass it">{ic("crown")}</button>'
    s += f'<button class="sb off" aria-label="Initiative: nobody. Tap to pass it">{ic("shield")}</button>'
    s += f'<button class="sb on" aria-label="It is day. Tap to make it night">{ic("sun")}</button>'
    s += f'<button class="sb" aria-label="Roll dice or flip a coin">{ic("dice")}</button><div class="rule"></div>'
    s += f'<button class="sb" aria-label="Undo the last change">{ic("undo")}</button>'
    s += f'<button class="sb" aria-label="Menu" aria-haspopup="menu" aria-expanded="false">{ic("more")}</button></div>\n'
    return s

def page(title, W, H, body, css, script=None, props=None):
    pr = json.dumps(dict({"$preview": {"width": W, "height": H}}, **(props or {})))
    script = script or 'class Component extends DCLogic {\n  renderVals() { return {}; }\n}'
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
{css}
</style>
</helmet>
{body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{pr}'>
{script}
</script>
</body>
</html>
'''

files = {}
def table(key, title, lid, upright=False, scale=None, cue=None):
    dev, label, cells, sp = L[lid]
    foot = lid in FOOT
    seated = SEATS[len(cells)]
    if upright:
        cells = [quarter(c) for c in cells]; sp = quarter_r(sp)
    cw, ch = (PH if dev == 'phone' else (TB[1], TB[0]) if upright else TB)
    body = ''
    for c, n in zip(cells, seated):
        body += panel(dev, foot, c, n, seated, cue or {}, active=(n == 'Colin'))
    body += strip(foot, sp, seated)
    base = FOOT_CSS if foot else ROW_CSS + '\n' + ROW_EXTRA
    css = base + '\n' + EXTRA
    if scale:
        W, H = scale, round(ch * scale / cw)
        k = scale / cw
        css += f'\n.frame{{width:{W}px;height:{H}px;overflow:hidden;position:relative;background:#14110E}}\n.frame>.scr{{transform:scale({k:.5f});transform-origin:0 0}}'
        html = f'<div class="frame">\n<div class="scr" style="width:{cw}px;height:{ch}px">\n{body}</div>\n</div>'
    else:
        W, H = cw, ch
        html = f'<div class="scr" style="width:{cw}px;height:{ch}px">\n{body}</div>'
    files[key] = (title, W, H, page(title, W, H, html, css))

# ---- 1. Phone 5 and 6: the tablet's second arrangement ----
table('R1-Phone5-ThreeTwo', 'R1 · Phone, 5 players: three and two', 'phone-5')
table('R1-Phone5-End', 'R1 · Phone, 5 players: one at the end', 'phone-5-end')
table('R1-Phone6-ThreeThree', 'R1 · Phone, 6 players: three and three', 'phone-6')
table('R1-Phone6-Ends', 'R1 · Phone, 6 players: ends', 'phone-6-ends')
# ---- 2. Tablet 4, one on each side ----
table('R2-Tablet4Around', 'R2 · Tablet 1024, 4 players: one on each side', 'tablet-4-around', scale=1024)
table('R2-Tablet4Around-Upright', 'R2 · Tablet 820 upright, 4 players: one on each side', 'tablet-4-around', upright=True)
# ---- 3. The gain/loss cue: inside the 2 s window (A, recommended), settled, and option B ----
A = {'You': (-3, ''), 'Max': (2, '')}
B = {'You': (-3, 'tint'), 'Max': (2, 'tint')}
table('G1-Cue-Phone', 'G1 · Phone: the 2 s window (A, recommended)', 'phone-4-sides', cue=A)
table('G1-Cue-Tablet', 'G1 · Tablet 1024: the 2 s window (A)', 'tablet-4', scale=1024, cue=A)
table('G1-Cue-Upright', 'G1 · Tablet 820 upright: the 2 s window (A)', 'tablet-4', upright=True, cue=A)
LIFE2 = dict(LIFE)
LIFE.update(You=28, Max=40)
table('G2-Settled-Phone', 'G2 · Phone: committed, nothing flashes', 'phone-4-sides')
table('G2-Settled-Tablet', 'G2 · Tablet 1024: committed', 'tablet-4', scale=1024)
table('G2-Settled-Upright', 'G2 · Tablet 820 upright: committed', 'tablet-4', upright=True)
LIFE.clear(); LIFE.update(LIFE2)
table('G3-Tinted-Phone', 'G3 · Phone: option B, the half tinted by direction', 'phone-4-sides', cue=B)
table('G3-Tinted-Tablet', 'G3 · Tablet 1024: option B', 'tablet-4', scale=1024, cue=B)

# ---- P0. Parity sheet: every arrangement at every count, phone and tablet ----
def mini(lid, sc, upright=False):
    dev, label, cells, sp = L[lid]
    if upright: cells = [quarter(c) for c in cells]; sp = quarter_r(sp)
    cw, ch = PH if dev == 'phone' else ((820, 1180) if upright else TB)
    s = f'<div class="mini" style="width:{cw*sc:.0f}px;height:{ch*sc:.0f}px">'
    for i, (x, y, w, h, rot) in enumerate(cells):
        edge = {0: 'b', 180: 't', 90: 'l', -90: 'r'}[rot]
        s += f'<span class="mc {edge}" style="left:{x*sc:.1f}px;top:{y*sc:.1f}px;width:{w*sc:.1f}px;height:{h*sc:.1f}px"></span>'
    x, y, w, h = sp
    s += f'<span class="ms" style="left:{x*sc:.1f}px;top:{y*sc:.1f}px;width:{w*sc:.1f}px;height:{h*sc:.1f}px"></span></div>'
    return s
ORDER = {2: [('phone-2',), ('tablet-2',)], 3: [('phone-3-end', 'phone-3-side'), ('tablet-3-end', 'tablet-3-side')],
         4: [('phone-4-sides', 'phone-4-around'), ('tablet-4', 'tablet-4-around')],
         5: [('phone-5', 'phone-5-end'), ('tablet-5', 'tablet-5-end')],
         6: [('phone-6', 'phone-6-ends'), ('tablet-6', 'tablet-6-ends')]}
pbody = '<div class="sheet"><div class="hd"><h1>Every arrangement, on every device</h1><p>Setup\'s Table row offers the same set at every count. The first is the default. Marked <b class="new">New</b> where this round draws it.</p></div>'
pbody += '<div class="grid"><div class="ch"></div><div class="ch">Phone</div><div class="ch">Tablet</div><div class="ch">Tablet upright</div>'
for n in range(2, 7):
    pbody += f'<div class="rh">{n}<small>players</small></div>'
    for col, ids in enumerate((ORDER[n][0], ORDER[n][1], ORDER[n][1])):
        pbody += '<div class="opts">'
        for lid in ids:
            sc = .19 if col == 0 else .118
            tag = '<b class="new">New</b>' if lid in NEW else ''
            pbody += f'<figure>{mini(lid, sc, upright=(col == 2))}<figcaption>{L[lid][1]}{tag}</figcaption></figure>'
        pbody += '</div>'
pbody += '</div></div>'
PCSS = FONTS + f'''
.sheet{{{TOK};width:1500px;box-sizing:border-box;padding:48px 56px 56px;background:var(--bg);color:var(--fg);font-family:"IBM Plex Sans",system-ui,sans-serif}}
.hd h1{{margin:0;font-family:"Cinzel",serif;font-size:34px;font-weight:700}}
.hd p{{margin:10px 0 0;font-size:16px;color:var(--fg-body);max-width:900px;line-height:1.5}}
.grid{{display:grid;grid-template-columns:110px 1fr 1fr 1fr;gap:16px 28px;margin-top:36px;align-items:center}}
.ch{{font-family:"IBM Plex Mono",monospace;font-size:13px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:.08em}}
.rh{{font-family:"Cinzel",serif;font-size:40px;font-weight:700;color:var(--fg)}}
.rh small{{display:block;font-family:"IBM Plex Sans",sans-serif;font-size:13px;font-weight:400;color:var(--fg-muted)}}
.opts{{display:flex;gap:22px;align-items:flex-end;padding:16px;border-radius:16px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--border)}}
figure{{margin:0;display:flex;flex-direction:column;gap:10px}}
figcaption{{font-size:14px;color:var(--fg-body);display:flex;gap:8px;align-items:center}}
.mini{{position:relative;border-radius:8px;background:#0E0C0A;box-shadow:inset 0 0 0 1px var(--border-strong)}}
.mc{{position:absolute;box-sizing:border-box;border-radius:4px;background:var(--elevated);box-shadow:inset 0 0 0 1px var(--border-strong)}}
.mc::after{{content:"";position:absolute;background:var(--accent);border-radius:2px}}
.mc.b::after{{left:30%;right:30%;bottom:3px;height:3px}}.mc.t::after{{left:30%;right:30%;top:3px;height:3px}}
.mc.l::after{{top:30%;bottom:30%;left:3px;width:3px}}.mc.r::after{{top:30%;bottom:30%;right:3px;width:3px}}
.ms{{position:absolute;border-radius:3px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--fg-faint)}}
.new{{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:500;color:var(--bg);background:var(--accent);border-radius:999px;padding:2px 8px}}
.hd .new{{font-size:12px}}'''
files['P0-Parity'] = ('P0 · Every arrangement on every device', 1500, 1420, page('P0 · Every arrangement on every device', 1500, 1420, pbody, PCSS))

# ---- K1. Motion sheet (static) and K2 (try it) ----
def sbtn(icon, cls='', extra=''):
    return f'<span class="sbx {cls}"{extra}>{ic(icon)}</span>'
K = f'''<div class="sheet">
<div class="hd"><h1>Motion: the strip press, day and night</h1><p>Both answer a tap, so neither waits a beat and neither delays the change: the state lands on the press, the motion only dresses it. Under reduced motion nothing moves; the state still changes.</p></div>
<section><h2>1 · A strip button, pressed</h2>
<div class="film">
<figure><div class="pad">{sbtn("crown", "off")}</div><figcaption><b>Rest</b>elevated ground, its usual ink</figcaption></figure>
<span class="arr">→</span>
<figure><div class="pad">{sbtn("crown", "dn")}</div><figcaption><b>Pressed</b>accent ground, bg ink, scale .92</figcaption></figure>
<span class="arr">→</span>
<figure><div class="pad">{sbtn("crown", "on")}</div><figcaption><b>Released</b>back to its state (here: held, lit ring)</figcaption></figure>
<div class="spec"><table>
<tr><th>Trigger</th><td><code>:active</code> (pointer down, Space or Enter held). Every strip button: monarch, initiative, day/night, dice, undo, Menu. Not the round (a display) or a disabled Undo.</td></tr>
<tr><th>Colour</th><td>ground <code>var(--accent)</code>, icon <code>var(--bg)</code>, ring off. The same fill as Dice open and a monarch pick, so "lit" means one thing on the strip.</td></tr>
<tr><th>Push</th><td><code>scale(.92)</code>, as the panel's round sheet button (End turn's pill is .94).</td></tr>
<tr><th>Timing</th><td><code>transition: transform, background-color, color</code> over <code>--motion-quick</code> (200 ms) on <code>--motion-ease</code>, no beat, both ways: the app's press feedback.</td></tr>
<tr><th>Holder art</th><td>The holder's face in the corner scales with the button, so it never detaches.</td></tr>
<tr><th>Reduced motion</th><td>No scale and no transition. The accent ground still shows while pressed.</td></tr>
</table></div></div></section>
<section><h2>2 · Day and night, spinning</h2>
<div class="film">
<figure><div class="pad"><span class="sbx on"><span class="ico" style="transform:rotate(0deg)">{ic("sun")}</span></span></div><figcaption><b>0 ms</b>Day. Tap.</figcaption></figure>
<figure><div class="pad"><span class="sbx on"><span class="ico" style="transform:rotate(35deg) scale(.83);opacity:.6">{ic("sun")}</span><span class="ico" style="transform:rotate(-55deg) scale(.77);opacity:.4">{ic("moon")}</span></span></div><figcaption><b>80 ms</b>sun turns out</figcaption></figure>
<figure><div class="pad"><span class="sbx on"><span class="ico" style="transform:rotate(68deg) scale(.69);opacity:.2">{ic("sun")}</span><span class="ico" style="transform:rotate(-22deg) scale(.91);opacity:.8">{ic("moon")}</span></span></div><figcaption><b>160 ms</b>moon turns in</figcaption></figure>
<figure><div class="pad"><span class="sbx on"><span class="ico">{ic("moon")}</span></span></div><figcaption><b>320 ms</b>Night.</figcaption></figure>
<div class="spec"><table>
<tr><th>Direction</th><td>Always clockwise, like a dial: the old icon turns out to <code>+90°</code>, the new one turns in from <code>−90°</code>. Night to day keeps turning the same way.</td></tr>
<tr><th>Shape</th><td>Both at once, stacked: out <code>rotate(0→90°) scale(1→.6) opacity(1→0)</code>; in <code>rotate(−90°→0) scale(.6→1) opacity(0→1)</code>.</td></tr>
<tr><th>Duration, easing</th><td>320 ms (<code>--motion-duration</code>) on <code>--motion-ease-out</code> <code>cubic-bezier(.2,.7,.2,1)</code>, no beat. No overshoot (the prototype's bounce read as a wobble on a 24 px icon).</td></tr>
<tr><th>First tap</th><td>Off to day: the faint sun turns out, the lit sun turns in, and the ring lights at once.</td></tr>
<tr><th>Fast taps</th><td>A tap mid-spin finishes the running one instantly and starts the next, so the icon always matches the state.</td></tr>
<tr><th>Reduced motion</th><td>The icon swaps on the tap; no turn, no fade.</td></tr>
</table></div></div></section>
<section><h2>3 · The gain/loss pulse is gone</h2><p class="lead">The <code>life-pulse</code> keyframes and the panel's pulse span go. What a tap shows is the 2 s window: the half lit 18% accent and the pending ±N beside the number (G1). On commit the half fades back over its shipped 120 ms and the number ticks (opacity .7→1, 120 ms). Nothing else moves.</p></section>
</div>'''
KCSS = FONTS + f'''
.sheet{{{TOK};width:1500px;box-sizing:border-box;padding:48px 56px 56px;background:var(--bg);color:var(--fg);font-family:"IBM Plex Sans",system-ui,sans-serif}}
.hd h1{{margin:0;font-family:"Cinzel",serif;font-size:34px;font-weight:700}}
.hd p,.lead{{margin:10px 0 0;font-size:16px;color:var(--fg-body);max-width:1000px;line-height:1.55}}
section{{margin-top:40px;padding:28px 32px;border-radius:18px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--border)}}
h2{{margin:0 0 20px;font-size:20px;font-weight:600}}
.film{{display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap}}
figure{{margin:0;width:150px;display:flex;flex-direction:column;gap:12px}}
.pad{{height:120px;border-radius:14px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--border);display:flex;align-items:center;justify-content:center}}
figcaption{{font-size:13px;line-height:1.45;color:var(--fg-muted)}}
figcaption b{{display:block;font-size:14px;color:var(--fg)}}
.arr{{align-self:center;margin-top:-40px;color:var(--fg-faint);font-size:22px}}
.sbx{{position:relative;width:48px;height:48px;border-radius:50%;background:var(--elevated);box-shadow:inset 0 0 0 1px var(--border-strong);color:var(--fg-body);display:flex;align-items:center;justify-content:center}}
.sbx.off{{color:var(--fg-faint)}}
.sbx.on{{color:var(--accent);box-shadow:inset 0 0 0 1.5px var(--accent)}}
.sbx.dn{{background:var(--accent);color:var(--bg);box-shadow:none;transform:scale(.92)}}
.ico{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}}
.spec{{flex:1;min-width:520px}}
table{{border-collapse:collapse;width:100%;font-size:14px;line-height:1.5}}
th{{text-align:left;vertical-align:top;width:130px;padding:7px 14px 7px 0;color:var(--fg-muted);font-weight:500}}
td{{padding:7px 0;color:var(--fg-body);border-top:1px solid var(--border)}}
th{{border-top:1px solid var(--border)}}
code{{font-family:"IBM Plex Mono",monospace;font-size:12.5px;color:var(--fg)}}'''
files['K1-Motion'] = ('K1 · Motion: the strip press, day and night', 1500, 1340, page('K1 · Motion', 1500, 1340, K, KCSS))

# K2: a working strip. Press any button; tap day/night to spin it; the switch plays it as reduced motion.
K2 = f'''<div class="try {{{{rmCls}}}}">
<div class="hd"><h1>Try it</h1><p>Press any strip button. Tap the sun to turn the day.</p></div>
<div class="spine h">
<div class="tn" aria-label="Round 2, Colin's turn">2</div><div class="rule"></div>
<button class="sb on" aria-label="Monarch: Max. Tap to pass it">{ic("crown")}<img src="/_blob/{ART["Max"]}" alt=""></button>
<button class="sb off" aria-label="Initiative: nobody. Tap to pass it">{ic("shield")}</button>
<button class="{{{{dnCls}}}}" aria-label="{{{{dnLabel}}}}" onClick="{{{{toggle}}}}"><span class="ico {{{{outCls}}}}"><sc-if value="{{{{outMoon}}}}" hint-placeholder-val="{{{{ false }}}}">{ic("moon")}</sc-if><sc-if value="{{{{outSun}}}}" hint-placeholder-val="{{{{ true }}}}">{ic("sun")}</sc-if></span><span class="ico {{{{inCls}}}}"><sc-if value="{{{{inMoon}}}}" hint-placeholder-val="{{{{ false }}}}">{ic("moon")}</sc-if><sc-if value="{{{{inSun}}}}" hint-placeholder-val="{{{{ true }}}}">{ic("sun")}</sc-if></span></button>
<button class="sb" aria-label="Roll dice or flip a coin">{ic("dice")}</button><div class="rule"></div>
<button class="sb" aria-label="Undo the last change">{ic("undo")}</button>
<button class="sb" aria-label="Menu" aria-haspopup="menu" aria-expanded="false">{ic("more")}</button>
</div>
<label class="rm"><input type="checkbox" onChange="{{{{toggleRm}}}}"> Play it as reduced motion</label>
</div>'''
SUN_SVG = ic('sun').replace('"', '\\"')
MOON_SVG = ic('moon').replace('"', '\\"')
K2CSS = FONTS + f'''
.try{{{TOK};width:820px;height:420px;box-sizing:border-box;padding:40px 48px;background:var(--bg);color:var(--fg);font-family:"IBM Plex Sans",system-ui,sans-serif;display:flex;flex-direction:column;gap:28px}}
.hd h1{{margin:0;font-family:"Cinzel",serif;font-size:30px;font-weight:700}}
.hd p{{margin:8px 0 0;font-size:15px;color:var(--fg-body)}}
.spine{{height:64px;border-radius:16px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--border);display:flex;align-items:center;justify-content:center;gap:16px}}
.rule{{width:1px;height:26px;background:var(--border-strong)}}
.tn{{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--accent);box-shadow:inset 0 0 0 2px var(--accent);font-family:"Cinzel",serif;font-weight:700;font-size:22px}}
.sb{{position:relative;width:48px;height:48px;border-radius:50%;border:0;padding:0;background:var(--elevated);box-shadow:inset 0 0 0 1px var(--border-strong);color:var(--fg-body);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 200ms cubic-bezier(.45,0,.55,1),background-color 200ms cubic-bezier(.45,0,.55,1),color 200ms cubic-bezier(.45,0,.55,1)}}
.sb.on{{color:var(--accent);box-shadow:inset 0 0 0 1.5px var(--accent)}}
.sb.off{{color:var(--fg-faint)}}
.sb:active{{background:var(--accent);color:var(--bg);box-shadow:none;transform:scale(.92)}}
.sb img{{position:absolute;right:-5px;bottom:-5px;width:22px;height:22px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px var(--surface)}}
.ico{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}}
.gone{{opacity:0}}
.outA{{animation:outA 320ms cubic-bezier(.2,.7,.2,1) both}}.outB{{animation:outB 320ms cubic-bezier(.2,.7,.2,1) both}}
.inA{{animation:inA 320ms cubic-bezier(.2,.7,.2,1) both}}.inB{{animation:inB 320ms cubic-bezier(.2,.7,.2,1) both}}
@keyframes outA{{from{{transform:none;opacity:1}}to{{transform:rotate(90deg) scale(.6);opacity:0}}}}
@keyframes outB{{from{{transform:none;opacity:1}}to{{transform:rotate(90deg) scale(.6);opacity:0}}}}
@keyframes inA{{from{{transform:rotate(-90deg) scale(.6);opacity:0}}to{{transform:none;opacity:1}}}}
@keyframes inB{{from{{transform:rotate(-90deg) scale(.6);opacity:0}}to{{transform:none;opacity:1}}}}
.rmon .sb{{transition:none}}.rmon .sb:active{{transform:none}}
.rmon .outA,.rmon .outB{{animation:none;opacity:0}}.rmon .inA,.rmon .inB{{animation:none}}
.rm{{display:flex;align-items:center;gap:10px;min-height:44px;font-size:15px;color:var(--fg-body)}}
.rm input{{width:20px;height:20px;accent-color:#CF8745}}'''
K2JS = f'''class Component extends DCLogic {{
  constructor(props) {{ super(props); this.state = {{ dn: 'off', prev: 'off', k: 0, rm: false }}; }}
  toggle() {{ const s = this.state; this.setState({{ prev: s.dn, dn: s.dn === 'day' ? 'night' : 'day', k: s.k + 1 }}); }}
  toggleRm() {{ this.setState({{ rm: !this.state.rm }}); }}
  renderVals() {{
    const s = this.state;
    const ab = s.k % 2 ? 'A' : 'B';
    return {{
      toggle: () => this.toggle(), toggleRm: () => this.toggleRm(),
      rmCls: s.rm ? 'rmon' : '',
      dnCls: 'sb ' + (s.dn === 'off' ? 'off' : 'on'),
      dnLabel: s.dn === 'off' ? 'Day and night: not started. Tap to make it day' : s.dn === 'day' ? 'It is day. Tap to make it night' : 'It is night. Tap to make it day',
      outMoon: s.prev === 'night', outSun: s.prev !== 'night', inMoon: s.dn === 'night', inSun: s.dn !== 'night',
      outCls: s.k ? 'out' + ab : 'gone', inCls: s.k ? 'in' + ab : ''
    }};
  }}
}}'''
files['K2-Motion-Try'] = ('K2 · Try it: press the strip, turn the day', 820, 420, page('K2 · Try it', 820, 420, K2, K2CSS, K2JS))

meta = {}
for k, (title, w, h, html) in files.items():
    open(os.path.join(OUT, k + '.dc.html'), 'w', encoding='utf-8').write(html)
    meta[k + '.dc.html'] = dict(title=title, w=w, h=h)
json.dump(meta, open(os.path.join(OUT, '_meta.json'), 'w'), indent=1)
print('\n'.join(f'{k} {v["w"]}x{v["h"]}' for k, v in meta.items()))
