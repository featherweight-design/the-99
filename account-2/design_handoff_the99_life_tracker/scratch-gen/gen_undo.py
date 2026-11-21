# Life tracker addendum: Undo a mistaken ending (2026-11-21). Writes project/U*.dc.html.
# Built from the live approved boards (F10, F11, F18, S5-Draw, S6-Again): only the state's change is added.
# usage: python3 gen_undo.py <dir holding the live project/*.dc.html> <out project dir>
import os, re, sys, json
SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
def rd(n): return open(os.path.join(SRC, n), encoding='utf-8').read()
def retitle(s, t): return re.sub(r'<title>.*?</title>', f'<title>{t}</title>', s, count=1)
def css(s, add): return s.replace('</style>', add + '\n</style>', 1)
def sub(s, a, b, n=1):
    assert a in s, a[:80]
    return s.replace(a, b, n)

ART = dict(ghalta='3a9cc48d946086f7a01702d812ad49a7', giada='de887acf2dd3696e7f72d8630ef63661', sai='019b993ea74dc7eef2d2e5a820befefa',
           gisa='747b6b5b0a287c64fc2a76924491c25e', killian='4a0fd5eea277545f56c74cbec6b0a96e')
def B(k): return '/_blob/' + ART[k]

# the strip's Undo icon, unchanged (F03/F10/F18 "Undo the last change")
UNDO_IC = ('<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
           'stroke-linejoin="round" aria-hidden="true"><path d="M9 7L4 12l5 5"/><path d="M4 12h10a5 5 0 010 10h-2"/></svg>')
CHECK_IC = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" '
            'stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16 9.5"/></svg>')
TABLE_IC = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" '
            'aria-hidden="true"><ellipse cx="12" cy="12" rx="9" ry="5"/><path d="M8 20l1-3M16 20l-1-3"/></svg>')

UND_CSS = '''.und{display:flex;align-items:center;gap:12px;width:100%;min-height:60px;box-sizing:border-box;padding:8px 14px 8px 8px;border:0;border-radius:12px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--border-strong);color:var(--fg);font-family:"IBM Plex Sans",sans-serif;text-align:left;cursor:pointer}
.und .ic{flex:none;width:44px;height:44px;border-radius:50%;background:var(--elevated);box-shadow:inset 0 0 0 1px var(--border-strong);color:var(--fg-body);display:flex;align-items:center;justify-content:center}
.und .tx{min-width:0}
.und b{display:block;font-size:15px;font-weight:600}
.und small{display:block;margin-top:2px;font-family:"IBM Plex Mono",monospace;font-size:11.5px;color:var(--fg-muted)}
.note{display:flex;gap:10px;align-items:flex-start;border-radius:10px;background:var(--surface-sunken,#18140F);box-shadow:inset 0 0 0 1px var(--border);padding:10px 12px;font-size:13px;line-height:1.5;color:var(--fg-body)}
.note svg{flex:none;margin-top:2px;color:var(--fg-muted)}
.pg.T{width:1180px;height:820px;padding:0;align-items:center;justify-content:center;background:var(--bg)}
.T .colw{width:440px;height:820px;box-sizing:border-box;padding:8px 0 22px;display:flex;flex-direction:column;gap:14px}
.T .win{height:180px}'''

def und(detail, label='Undo the last change'):
    return (f'<button class="und" aria-label="{label}: {detail}"><span class="ic">{UNDO_IC}</span>'
            f'<span class="tx"><b>{label}</b><small>{detail}</small></span></button>')
def note(ic, text): return f'<div class="note">{ic}<span>{text}</span></div>'

def tabletize(s):
    s = sub(s, '<div class="pg">', '<div class="pg T"><div class="colw">')
    s = sub(s, '\n</div>\n</x-dc>', '\n</div></div>\n</x-dc>')
    return sub(s, '"$preview":{"width":390,"height":844}', '"$preview":{"width":1180,"height":820}')

files = {}
F11 = css(rd('F11-Result.dc.html'), UND_CSS)
HERO = '<div class="win"><img src="/_blob/3a9cc48d946086f7a01702d812ad49a7" alt=""><div><strong>Colin wins</strong><small>Ghalta Stompy · 22 life left</small></div></div>'
END = 'You −3 life, to 0 · round 4'

# U1 · the result with Undo, under the hero (it names the change that ended the game)
s = sub(F11, HERO, HERO + '\n  ' + und(END))
files['U1-Undo-Phone'] = ('U1 · The result: Undo the change that ended it', 390, 844, retitle(s, 'U1 · Result with Undo'))
files['U1-Undo-Tablet'] = ('U1 · The result with Undo, tablet', 1180, 820, retitle(tabletize(s), 'U1 · Result with Undo, tablet'))

# U1b · a draw from one change: Undo puts both players back
s = css(rd('S5-Draw-Phone.dc.html'), UND_CSS.split('\n.note')[0] + '\n.und .ic{flex:none}')
s = sub(s, 'went out together · round 6</small></div></div>', 'went out together · round 6</small></div></div>\n  ' + und('Colin and you −4 life · round 6'))
files['U1-Draw-Phone'] = ('U1b · A draw from one change: Undo puts both back', 390, 844, retitle(s, 'U1b · Draw with Undo'))

# U1c · 6 players on the tablet: everything still fits the column
s = tabletize(sub(F11, HERO, HERO + '\n  ' + und('You −3 life, to 0 · round 5')))
s = css(s, '.T .win{height:150px}\n.o{padding:8px 12px}\n.o img,.o i.na{width:52px;height:34px}\n.o i.na{flex:none;border-radius:7px;background:radial-gradient(60px 40px at 50% 45%,#29241F,#1E1A15)}')
s = sub(s, 'Thursday night · 4 rounds · 1 h 14 min', 'Thursday night · 5 rounds · 1 h 52 min')
rows = [('sai', 'You', 'Round 5 · life', '2nd'), ('gisa', 'Max', 'Round 5 · life', '3rd'), (None, 'Sam', 'Round 4 · 21 commander damage from Ghalta', '4th'),
        ('killian', 'Chris', 'Round 4 · life', '5th'), ('giada', 'Peter', 'Round 3 · 10 poison', '6th')]
lst = ''.join((f'\n    <div class="o"><img src="{B(a)}" alt="">' if a else '\n    <div class="o"><i class="na" aria-hidden="true"></i>') +
              f'<div><b>{n}</b><small>{d}</small></div><em>{p}</em></div>' for a, n, d, p in rows)
s = re.sub(r'<div class="list">.*?\n  </div>', '<div class="list">' + lst + '\n  </div>', s, count=1, flags=re.S)
files['U1-Six-Tablet'] = ('U1c · Six players on the tablet: the column still fits', 1180, 820, retitle(s, 'U1c · Result with Undo, 6 players'))

# U3 · logged: Undo is gone and the slot says why
LOGGED = note(CHECK_IC, 'Colin logged this game at 10:41 pm, so this ending stays.')
s = sub(F11, HERO, HERO + '\n  ' + LOGGED)
files['U3-Logged-Phone'] = ('U3 · Someone logged it: the ending stays, and says why', 390, 844, retitle(s, 'U3 · Logged: no Undo'))
files['U3-Logged-Tablet'] = ('U3 · Logged, tablet', 1180, 820, retitle(tabletize(s), 'U3 · Logged: no Undo, tablet'))

# U4 · past 6 am: the table stopped logging, so the ending stays; no Log, no Rematch
SIXAM = note(TABLE_IC, 'This table stopped logging at 6 am, so this ending stays. Log it from your deck\'s Games tab.')
s = sub(F11, HERO, HERO + '\n  ' + SIXAM)
s = sub(s, '''    <button class="go">Log this game</button>
    <p class="sub">Everyone seated finds Colin's win filled in when they log.</p>
    <button class="ghost">Rematch, same seats</button>
    <button class="ghost">Back to the table</button>''', '''    <button class="ghost">Back to Friends</button>''')
files['U4-SixAM-Phone'] = ('U4 · Past 6 am: the table stopped logging, the ending stays', 390, 844, retitle(s, 'U4 · Past 6 am: no Undo'))
files['U4-SixAM-Tablet'] = ('U4 · Past 6 am, tablet', 1180, 820, retitle(tabletize(s), 'U4 · Past 6 am, tablet'))

# U2 · back in the game: the board as it was before the change, and the shipped centre-slot toast
TOAST_CSS = '''.toast{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:9;width:calc(100% - 32px);max-width:420px;box-sizing:border-box;display:flex;align-items:center;gap:14px;border-radius:10px;background:var(--elevated);box-shadow:inset 0 0 0 1px var(--border-strong),0 12px 40px rgba(0,0,0,.5);padding:4px 6px 4px 16px;font-family:"IBM Plex Sans",sans-serif}
.toast span{display:flex;flex-direction:column;gap:3px;padding:8px 0}
.toast b{font-weight:400;font-size:13.5px;color:var(--fg)}
.toast small{font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--fg-muted)}
.back{box-shadow:inset 0 0 0 2px var(--fg-faint)}'''
TOAST = '<div class="toast" role="status"><span><b>Game back on</b><small>Undid You −3 life · round 4</small></span></div>'
s = css(rd('F10-Out.dc.html'), TOAST_CSS)
s = sub(s, '<div class="tn" aria-label="Round 3, Colin\'s turn">3</div>', '<div class="tn" aria-label="Round 4, Colin\'s turn">4</div>')
s = sub(s, '<button class="sb on" aria-label="Monarch: Max. Tap to pass it"><svg', '<button class="sb on" aria-label="Monarch: Colin. Tap to pass it"><svg')
s = sub(s, '</svg><img src="/_blob/747b6b5b0a287c64fc2a76924491c25e" alt=""></button>', '</svg><img src="/_blob/3a9cc48d946086f7a01702d812ad49a7" alt=""></button>')
s = sub(s, '<div class="cell " style="grid-column:1;grid-row:2">', '<div class="cell back" style="grid-column:1;grid-row:2">')
s = sub(s, '<span class="num">19</span>', '<span class="num">3</span>')
s = sub(s, '<div class="cell " style="grid-column:3;grid-row:2">', '<div class="cell out" style="grid-column:3;grid-row:2">')
s = sub(s, '<div class="life"><button class="half minus" aria-label="Max loses 1 life">−</button><span class="num">33</span><button class="half plus" aria-label="Max gains 1 life">+</button></div>',
        '<div class="gone"><strong>Out</strong><span>0 life · round 4</span><button class="undo">Undo</button></div>')
s = sub(s, '\n</div>\n</x-dc>', '\n  ' + TOAST + '\n</div>\n</x-dc>')
files['U2-Back-Phone'] = ('U2 · Undo: back in the game, as it was before the change', 390, 844, retitle(s, 'U2 · Back in the game'))

T_OUT = '''.out .art{opacity:.22;filter:grayscale(1)}
.out .wash{background:rgba(20,17,14,.78)}
.gone{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center}
.gone strong{font-family:"Cinzel",serif;font-weight:700;font-size:40px}
.gone span{font-size:14px;color:var(--fg-body)}
.undo{height:48px;padding:0 24px;border-radius:10px;border:0;background:rgba(20,17,14,.8);box-shadow:inset 0 0 0 1px var(--border-strong);color:var(--fg);font-family:"IBM Plex Sans",sans-serif;font-size:15px;margin-top:6px}'''
s = css(rd('F18-Tablet4.dc.html'), TOAST_CSS + '\n' + T_OUT)
s = sub(s, '<div class="sb t" aria-label="Round 2, Colin\'s turn">2</div>', '<div class="sb t" aria-label="Round 4, Colin\'s turn">4</div>')
s = sub(s, '<button class="sb on" aria-label="Monarch: Max. Tap to pass it">', '<button class="sb on" aria-label="Monarch: Colin. Tap to pass it">')
s = sub(s, '</svg><img src="/_blob/747b6b5b0a287c64fc2a76924491c25e" alt=""></button>', '</svg><img src="/_blob/3a9cc48d946086f7a01702d812ad49a7" alt=""></button>')
s = sub(s, '<span class="num">27</span>', '<span class="num">22</span>')
s = sub(s, '<div style="grid-column:span 3" class="cell"><div class="rot flip"><img class="art" src="/_blob/de887acf2dd3696e7f72d8630ef63661"',
        '<div style="grid-column:span 3" class="cell out"><div class="rot flip"><img class="art" src="/_blob/de887acf2dd3696e7f72d8630ef63661"')
s = sub(s, '<div class="life"><button class="half minus" aria-label="Peter loses 1 life">−</button><span class="num">34</span><button class="half plus" aria-label="Peter gains 1 life">+</button></div>',
        '<div class="gone"><strong>Out</strong><span>21 commander damage from Ghalta · round 3</span><button class="undo">Undo</button></div>')
s = sub(s, '<span class="bd"><img src="/_blob/3a9cc48d946086f7a01702d812ad49a7" alt="">Ghalta 6</span>', '')
s = sub(s, '<div style="grid-column:span 3" class="cell"><div class="rot"><img class="art" src="/_blob/019b993ea74dc7eef2d2e5a820befefa"',
        '<div style="grid-column:span 3" class="cell back"><div class="rot"><img class="art" src="/_blob/019b993ea74dc7eef2d2e5a820befefa"')
s = sub(s, '<span class="num">31</span>', '<span class="num">3</span>')
s = sub(s, '<div style="grid-column:span 3" class="cell"><div class="rot"><img class="art" src="/_blob/747b6b5b0a287c64fc2a76924491c25e"',
        '<div style="grid-column:span 3" class="cell out"><div class="rot"><img class="art" src="/_blob/747b6b5b0a287c64fc2a76924491c25e"')
s = sub(s, '<div class="life"><button class="half minus" aria-label="Max loses 1 life">−</button><span class="num">38</span><button class="half plus" aria-label="Max gains 1 life">+</button></div>',
        '<div class="gone"><strong>Out</strong><span>0 life · round 4</span><button class="undo">Undo</button></div>')
s = re.sub(r'<span class="bd acc">.*?Monarch</span>', '', s, count=1, flags=re.S)
s = sub(s, '\n</div>\n</x-dc>', '\n  ' + TOAST + '\n</div>\n</x-dc>')
files['U2-Back-Tablet'] = ('U2 · Back in the game, tablet', 1180, 820, retitle(s, 'U2 · Back in the game, tablet'))

# U5 · the result was closed: the Last game card on the table page carries the same Undo
CARD_CSS = UND_CSS.split('\n.note')[0] + '\n.last .und{background:var(--surface-sunken)}'
for dev, f in (('Phone', 'S6-Again-Phone.dc.html'), ('Desktop', 'S6-Again-Desktop.dc.html')):
    s = css(rd(f), CARD_CSS)
    s = sub(s, '<p>Not logged yet: Log this game fills it in.</p></section>', und(END) + '<p>Not logged yet: Log this game fills it in.</p></section>')
    files[f'U5-Card-{dev}'] = (f'U5 · Closed the result? The Last game card keeps Undo' + ('' if dev == 'Phone' else ', desktop'), 390 if dev == 'Phone' else 1300, None,
                               retitle(s, f'U5 · Last game card with Undo{"" if dev == "Phone" else ", desktop"}'))

meta = {}
for k, (title, w, h, html) in files.items():
    open(os.path.join(OUT, k + '.dc.html'), 'w', encoding='utf-8').write(html)
    meta[k + '.dc.html'] = dict(title=title, w=w, h=h)
json.dump(meta, open(os.path.join(OUT, '_meta.json'), 'w'), indent=1)
print('\n'.join(meta))
