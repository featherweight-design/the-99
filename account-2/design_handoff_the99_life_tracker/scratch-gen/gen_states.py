# Life tracker addendum: the undrawn states (READINESS 🟡 rows). Writes project/S*.dc.html.
# Table-page boards are drawn over the shipped Rule 0 table (table-body.tsx, table-seat.tsx, table-closed.tsx) with the
# shipped shell (phone tab bar and desktop rail cut from the About captures). Tracker boards reuse the approved F boards.
import os, re, sys
SRC = '/mnt/project-files/designs/life-tracker/project'
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

ART = dict(ghalta='3a9cc48d946086f7a01702d812ad49a7', giada='de887acf2dd3696e7f72d8630ef63661', sai='019b993ea74dc7eef2d2e5a820befefa',
           gisa='747b6b5b0a287c64fc2a76924491c25e', killian='4a0fd5eea277545f56c74cbec6b0a96e', jace='f6a88812ca37544203f26249c2bff155',
           ishai='bb888cc90f29787c182064325351ec87', bruse='19bb8d7da561dd80c3ebe0a4888cb8c8')
RAIL = '/_blob/b5ee18c086ab4dcfee419798be689715'
TABS = '/_blob/7152036e8133e7e1984d9ff561ae5645'
def B(k): return '/_blob/' + ART[k]

FONTS = '''@font-face{font-family:"Cinzel";src:url(/_blob/92b49ae8bf36fee523d2c940101a47cd) format("woff2");font-weight:400 900}
@font-face{font-family:"IBM Plex Sans";src:url(/_blob/28a118a4f1d2d89f048ed8dda083f273) format("woff2");font-weight:100 700}
@font-face{font-family:"IBM Plex Mono";src:url(/_blob/ab35e14cb6458bb7fa4f3f54f8f02a5f) format("woff2");font-weight:500}
body{margin:0}'''
TOK = ('--bg:#14110E;--surface:#1E1A15;--surface-raised:#211D18;--surface-rail:#1A1611;--surface-sunken:#18140F;--elevated:#29241F;'
       '--border:#2B241B;--border-strong:#3A3229;--border-dashed:#494037;--fg:#EDE6D8;--fg-body:#C0B8A6;--fg-muted:#A59C89;'
       '--fg-faint:#948B78;--fg-locked:#6E6654;--fg-disabled:#4A4033;--accent:#CF8745;--success:#6FA368;--warning:#DEAA29;'
       '--fact:#8FA6BE;--danger:#C6533F;--bracket-3:#C9AC62;')

def page(title, w, h, css, body):
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
{FONTS}
{css}
</style>
</helmet>
{body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
  renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''

# ---------- shared table-page parts ----------
ICON = {
 'search': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
 'play': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>',
 'seats': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.4.2 4 1.8 4.5 4.8"/></svg>',
 'back': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
 'lock': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/></svg>',
}
# the five seat counts (game changers, combos, tutors, extra turns, land denial): simple stand-in marks for the shipped FindingMark
MARKS = ['<path d="M12 3l7 9-7 9-7-9z"/>', '<circle cx="8.5" cy="12" r="4"/><circle cx="15.5" cy="12" r="4"/>',
         '<circle cx="10.5" cy="10.5" r="5"/><path d="M14.5 14.5L20 20"/>', '<path d="M19 12a7 7 0 11-2-4.9"/><path d="M19 4v4h-4"/>',
         '<path d="M3 19l6-10 4 6 3-4 5 8z"/>']
def counts(ns):
    out = []
    for m, n in zip(MARKS, ns):
        cls = 'ct z' if n == 0 else 'ct'
        out.append(f'<span class="{cls}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">{m}</svg>{n}</span>')
    return '<span class="cts">' + ''.join(out) + '</span>'

def initials(n): return ''.join(w[0] for w in n.split())[:2].upper()

SEAT_CSS = '''
.st{position:relative;overflow:hidden;border-radius:12px;background:var(--surface-rail);box-shadow:inset 0 0 0 1px var(--border-strong)}
.st.you{box-shadow:inset 0 0 0 1px var(--accent),0 0 0 1px var(--accent)}
.st .wsh{position:absolute;inset:-30px;width:calc(100% + 60px);height:calc(100% + 60px);object-fit:cover;opacity:.22;filter:blur(30px) saturate(1.2)}
.st .g{position:relative;display:grid;grid-template-columns:84px minmax(0,1fr);column-gap:12px;padding:12px}
.st .a{width:84px;height:60px;border-radius:9px;overflow:hidden;background:var(--surface-sunken);box-shadow:0 8px 18px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center}
.st .a img{width:100%;height:100%;object-fit:cover;display:block}
.st .a.ini{background:radial-gradient(120px 80px at 50% 40%,var(--elevated),var(--surface));font-family:"Cinzel",serif;font-weight:700;font-size:22px;color:var(--fg-muted)}
.st .t{display:flex;flex-direction:column;gap:3px;min-width:0}
.st .nm{display:flex;align-items:baseline;gap:7px;font-size:15px;font-weight:600}
.st .nm small{font-family:"IBM Plex Mono",monospace;font-size:9.5px;font-weight:500;letter-spacing:.12em;color:var(--accent)}
.st .nm em{font-style:normal;font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:400;color:var(--fg-muted)}
.st .dk{font-size:13.5px;color:var(--fg-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st .dk.w{color:var(--fg-muted)}
.st .cm{font-family:"IBM Plex Mono",monospace;font-size:10.5px;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st .cl{grid-column:1 / -1;margin-top:10px;display:flex;align-items:center;gap:8px}
.chip{display:inline-flex;align-items:center;height:24px;padding:0 9px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--border-strong);font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--bracket-3);background:rgba(20,17,14,.4)}
.cts{display:flex;gap:4px}
.ct{display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 7px;border-radius:7px;box-shadow:inset 0 0 0 1px var(--border);background:var(--surface-sunken);font-family:"IBM Plex Mono",monospace;font-size:12px;font-weight:600;color:var(--fact)}
.ct.z{background:transparent;color:var(--fg-locked);font-weight:400}.ct.z svg{opacity:.5}
.st .ctw{grid-column:1 / -1;margin-top:12px}
.wait{position:relative;margin:0 12px 12px;border-radius:9px;border:1.5px dashed var(--border-dashed);padding:10px 12px;font-size:13px;line-height:1.55;color:var(--fg-muted)}
.ctl{position:relative;margin-top:-6px;display:flex;justify-content:flex-end;padding:0 12px 12px}
.chg{height:36px;padding:0 14px;border-radius:9px;border:0;background:none;box-shadow:inset 0 0 0 1px var(--border-strong);color:var(--fg);font-family:"IBM Plex Sans",sans-serif;font-size:13.5px;font-weight:600}
/* desktop rows */
.D .st .g{grid-template-columns:132px minmax(0,1fr) auto;column-gap:18px;row-gap:4px;align-items:center;padding:12px 16px 12px 12px}
.D .st .a{width:132px;height:92px;border-radius:10px;grid-row:1 / 3}
.D .st .a.ini{font-size:26px}
.D .st .nm{font-size:16px;gap:8px}
.D .st .dk{font-size:14px}
.D .st .t{align-self:end;gap:4px}
.D .st .t.mid{grid-row:1 / 3;align-self:center}
.D .st .cl{grid-column:2;grid-row:2;margin-top:4px;align-self:start}
.D .st .ctw{grid-column:3;grid-row:1 / 3;margin-top:0;align-self:center}
.D .wait{margin:0 16px 14px 162px}
.D .ctl{margin-top:-8px;padding:0 16px 8px 162px}
'''

def seat(s, desk=False):
    name, art, deck, cmd = s['name'], s.get('art'), s.get('deck'), s.get('cmd')
    you = s.get('you')
    wash = f'<img class="wsh" src="{B(art)}" alt="">' if art else ''
    a = f'<span class="a" aria-hidden="true"><img src="{B(art)}" alt=""></span>' if art else f'<span class="a ini" aria-hidden="true">{initials(name)}</span>'
    tag = '<small>YOU</small>' if you else (f'<em>{s["tag"]}</em>' if s.get('tag') else '')
    if deck:
        t = f'<span class="t"><span class="nm"><span>{name}</span>{tag}</span><span class="dk">{deck}</span><span class="cm">{cmd}</span></span>'
        cl = f'<span class="cl"><span class="chip">{s.get("chip","Upgraded")}</span></span>'
        ct = f'<span class="ctw">{counts(s.get("counts",[0,1,2,0,0]))}</span>'
        inner = t + cl + ct
    else:
        sub = 'your seat joins the read when you do' if you else 'their seat joins the read when they do'
        t = f'<span class="t mid"><span class="nm"><span>{name}</span>{tag}</span><span class="dk w">{"Picking your deck" if you else "Picking their deck"}</span><span class="cm">{sub}</span></span>'
        inner = t
    more = ''
    if not deck and not you:
        more = f'<div class="wait">{name} picks their own deck on their phone. Until then this seat is left out of the read.</div>'
    ctl = '<div class="ctl"><button class="chg">Change deck</button></div>' if you else ''
    lab = 'Your seat' if you else f"{name}’s seat"
    return f'<article class="st{" you" if you else ""}" aria-label="{lab}">{wash}<div class="g">{a}{inner}</div>{more}{ctl}</article>'

PAGE_CSS = '''
.P{''' + TOK + '''width:390px;box-sizing:border-box;background:var(--bg);font-family:"IBM Plex Sans",system-ui,sans-serif;color:var(--fg);display:flex;flex-direction:column;position:relative}
.top{height:56px;display:flex;align-items:center;padding:0 8px 0 18px;border-bottom:1px solid var(--border);gap:4px}
.wm{display:flex;align-items:baseline;gap:8px;margin-right:auto}
.wm span{font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.3em;color:var(--accent)}
.wm b{font-family:"Cinzel",serif;font-weight:700;font-size:28px;line-height:1}
.ib{width:44px;height:44px;border:0;background:none;color:var(--fg-body);display:flex;align-items:center;justify-content:center;font-size:20px;font-family:"IBM Plex Sans",sans-serif}
.av{width:36px;height:30px;border-radius:9px;box-shadow:inset 0 0 0 1.5px var(--accent);color:var(--accent);font-family:"IBM Plex Mono",monospace;font-size:12px;display:flex;align-items:center;justify-content:center;margin:0 4px}
.back{height:44px;display:flex;align-items:center;gap:4px;padding:0 8px;font-size:14px;color:var(--fg-body)}
.col{padding:0 16px 22px;display:flex;flex-direction:column;gap:14px}
.hdr{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:10px}
h1{margin:0;font-family:"Cinzel",serif;font-weight:700;font-size:24px;line-height:1.2}
.meta{grid-column:1;margin:6px 0 0;font-family:"IBM Plex Mono",monospace;font-size:11.5px;line-height:1.55;color:var(--fg-faint)}
.meta b{font-weight:500;color:var(--fg-body)}
.seatsb{grid-column:2;grid-row:1;align-self:start;height:36px;padding:0 12px;border-radius:9px;border:0;background:none;box-shadow:inset 0 0 0 1px var(--border-strong);color:var(--fg);font-family:"IBM Plex Sans",sans-serif;font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:6px}
.read{border-radius:12px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--border);padding:14px 16px}
.read .k{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--accent)}
.read p{margin:6px 0 0;font-size:15px;font-weight:600;line-height:1.35}
.read small{display:block;margin-top:6px;font-size:13px;line-height:1.5;color:var(--fg-muted)}
.seats{display:flex;flex-direction:column;gap:10px}
.foot{display:flex;flex-direction:column;gap:10px}
.go{height:52px;border-radius:10px;border:0;background:var(--accent);color:#14110E;font-family:"IBM Plex Sans",sans-serif;font-weight:600;font-size:16px;display:flex;align-items:center;justify-content:center;gap:8px;width:100%}
.go[aria-disabled="true"]{background:var(--elevated);color:var(--fg-disabled);box-shadow:inset 0 0 0 1px var(--border-strong)}
.sub{margin:0;text-align:center;font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
.why{margin:0;display:flex;gap:8px;align-items:flex-start;justify-content:center;text-align:left;font-size:13px;line-height:1.5;color:var(--fg-body)}
.why svg{flex:none;margin-top:2px;color:var(--fg-muted)}
.why b{font-weight:600;color:var(--fg)}
.ghost{height:44px;border-radius:10px;border:0;background:none;box-shadow:inset 0 0 0 1px var(--border-strong);color:var(--fg);font-family:"IBM Plex Sans",sans-serif;font-size:14.5px;width:100%}
.close{height:44px;border:0;background:none;color:var(--danger);font-family:"IBM Plex Sans",sans-serif;font-size:14px;font-weight:600;width:100%}
.tabbar{position:sticky;bottom:0;display:block;width:390px;height:74px;margin-top:auto}
/* the game on this device */
.gip{border-radius:14px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--accent);padding:14px 14px 10px;display:flex;flex-direction:column;gap:12px}
.gip .gh{display:flex;align-items:baseline;gap:10px}
.gip .gh .k{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--accent)}
.gip .gh span:last-child{margin-left:auto;font-family:"IBM Plex Mono",monospace;font-size:11.5px;color:var(--fg-faint)}
.gip .fx{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.gip .f{position:relative;height:64px;border-radius:9px;overflow:hidden;background:var(--surface-sunken)}
.gip .f img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}
.gip .f b{position:absolute;left:8px;bottom:5px;font-size:12px;font-weight:600;text-shadow:0 1px 4px rgba(0,0,0,.8)}
.gip .f strong{position:absolute;right:8px;top:4px;font-family:"Cinzel",serif;font-weight:700;font-size:22px;text-shadow:0 2px 8px rgba(0,0,0,.7)}
.gip .f.out img{filter:grayscale(1);opacity:.3}.gip .f.out strong{font-family:"IBM Plex Mono",monospace;font-size:10.5px;font-weight:500;color:var(--fg-muted);top:8px}
.gip .f.turn{box-shadow:inset 0 0 0 2px var(--accent)}
.gip p{margin:0;font-size:13px;line-height:1.5;color:var(--fg-muted)}
.gip .dis{height:44px;border:0;background:none;color:var(--fg-muted);font-family:"IBM Plex Sans",sans-serif;font-size:14px;font-weight:600}
/* desktop */
.D{''' + TOK + '''width:1300px;box-sizing:border-box;background:var(--bg);font-family:"IBM Plex Sans",system-ui,sans-serif;color:var(--fg);display:grid;grid-template-columns:62px minmax(0,1fr);position:relative}
.rail{background:#191610 url() no-repeat;box-shadow:inset -1px 0 0 #25211C;position:relative}
.rail img{display:block;width:62px;height:900px}
.D .main{min-width:0}
.D .hdr{padding:22px 34px 16px;border-bottom:1px solid var(--border);column-gap:20px}
.D .bl{grid-column:1;display:flex;align-items:center;gap:6px;font-size:13px;color:var(--fg-body);margin-bottom:6px}
.D h1{font-size:30px}
.D .meta{font-size:12px}
.D .seatsb{grid-row:1 / 4;align-self:end}
.D .grid{display:grid;grid-template-columns:minmax(0,1fr) 392px;grid-template-rows:auto 1fr;column-gap:28px;row-gap:14px;align-items:start;padding:22px 34px 28px}
.D .seats{grid-column:1;grid-row:1 / 3}
.D .rc{grid-column:2;grid-row:1;display:flex;flex-direction:column;gap:14px}
.D .foot{grid-column:2;grid-row:2;gap:12px}
'''

def phone_page(seats, foot, top_card='', meta_n=None, read=None):
    n = meta_n or len(seats)
    read = read or ('A balanced table.', 'Every deck reads Upgraded.')
    return f'''<div class="P">
  <div class="top"><div class="wm"><span>THE</span><b>99</b></div><button class="ib" aria-label="Search">{ICON['search']}</button><button class="ib" aria-label="Help">?</button><span class="av" aria-label="Your account">WC</span></div>
  <div class="back">{ICON['back']} Friends</div>
  <div class="col">
    <div class="hdr"><h1>Rule 0 check</h1><button class="seatsb">{ICON['seats']}Seats</button><p class="meta"><b>Thursday night</b> · set by you · {n} seated<br>open until 6:00 am tomorrow</p></div>
    {top_card}
    <div class="read"><span class="k">The read</span><p>{read[0]}</p><small>{read[1]}</small></div>
    <div class="seats">{''.join(seat(s) for s in seats)}</div>
    <div class="foot">{foot}</div>
  </div>
  <img class="tabbar" src="{TABS}" alt="">
</div>'''

def desk_page(seats, foot, top_card='', read=None):
    read = read or ('A balanced table.', 'Every deck reads Upgraded.')
    return f'''<div class="D">
  <div class="rail"><img src="{RAIL}" alt=""></div>
  <div class="main">
    <div class="hdr"><span class="bl">{ICON['back']} Friends</span><h1>Rule 0 check</h1><p class="meta"><b>Thursday night</b> · set by you · {len(seats)} seated · open until 6:00 am tomorrow</p><button class="seatsb">{ICON['seats']}Seats</button></div>
    <div class="grid">
      <div class="seats">{''.join(seat(s, True) for s in seats)}</div>
      <div class="rc">{top_card}<div class="read"><span class="k">The read</span><p>{read[0]}</p><small>{read[1]}</small></div></div>
      <div class="foot">{foot}</div>
    </div>
  </div>
</div>'''

YOU = dict(name='You', you=True, art='sai', deck='Sai Thopters', cmd='Sai, Master Thopterist', counts=[0, 1, 2, 0, 0])
COLIN = dict(name='Colin', art='ghalta', deck='Ghalta Stompy', cmd='Ghalta, Primal Hunger', counts=[1, 0, 1, 0, 0], tag='owner')
PETER = dict(name='Peter', art='giada', deck='Giada Angels', cmd='Giada, Font of Hope', counts=[0, 0, 2, 0, 0])
MAX = dict(name='Max', art='gisa', deck='Gisa Zombies', cmd='Gisa, the Hellraiser', counts=[1, 1, 1, 0, 0])
CHRIS = dict(name='Chris', art='killian', deck='Killian Pacifist', cmd='Killian, Ink Duelist', counts=[0, 0, 1, 0, 0])
RILEY = dict(name='Riley', art='jace', deck='Jace Control', cmd='Jace, Vryn’s Prodigy', counts=[1, 1, 3, 0, 0], tag='not a friend')
SAM = dict(name='Sam', art='ishai', deck='Ishai + Bruse', cmd='Ishai, Ojutai Dragonspeaker + Bruse Tarl, Boorish Herder', counts=[0, 0, 1, 0, 0])
MAXW = dict(name='Max')

START = f'<button class="go">{ICON["play"]}Start the game</button>'
SUB = '<p class="sub">Tracks life and counters on this phone. Lay it in the middle of the table.</p>'
SUBD = '<p class="sub">Tracks life and counters on this device. Lay it in the middle of the table.</p>'
LOG = '<button class="ghost">Log this game</button>'
CLOSE = '<button class="close">Close the table</button>'

files = {}

# ---- S1 · 7 seated: Start is off, with why ----
seven = [YOU, COLIN, PETER, MAX, CHRIS, RILEY, SAM]
off = (f'<button class="go" aria-disabled="true" aria-describedby="why7">{ICON["play"]}Start the game</button>'
       f'<p class="why" id="why7">{ICON["lock"]}<span><b>The tracker fits up to 6 players, and 7 are seated.</b> Clear a seat in Seats to start it.</span></p>')
files['S1-Seven-Phone'] = ('S1 · 7 seated: Start is off, and says why', 390, None, PAGE_CSS + SEAT_CSS, phone_page(seven, off + LOG + CLOSE))
files['S1-Seven-Desktop'] = ('S1 · 7 seated, desktop', 1300, None, PAGE_CSS + SEAT_CSS, desk_page(seven, off + LOG + CLOSE))

# ---- S2 · a seat still waiting for its deck ----
four_w = [YOU, COLIN, PETER, MAXW]
waitsub = '<p class="sub">Max hasn’t picked a deck yet. Start now and Max plays on a plain panel, or wait and their art comes with them.</p>'
files['S2-Waiting-Phone'] = ('S2 · A seat still picking its deck: Start stays on', 390, None, PAGE_CSS + SEAT_CSS,
                             phone_page(four_w, START + waitsub + LOG + CLOSE, read=('Three seats in the read.', 'One seat isn’t in the read yet.')))
files['S2-Waiting-Desktop'] = ('S2 · A seat still picking its deck, desktop', 1300, None, PAGE_CSS + SEAT_CSS,
                               desk_page(four_w, START + waitsub.replace('phone', 'device') + LOG + CLOSE, read=('Three seats in the read.', 'One seat isn’t in the read yet.')))

# ---- S3 · a saved game on this device ----
def gip(dev='phone', life=(22, 31, 0, 19)):
    fx = ''
    names = [('Colin', 'ghalta'), ('Peter', 'giada'), ('You', 'sai'), ('Max', 'gisa')]
    vals = ['22', 'Out', '19', '33']
    for (nm, a), v in zip(names, vals):
        cls = 'f out' if v == 'Out' else ('f turn' if nm == 'Colin' else 'f')
        fx += f'<div class="{cls}"><img src="{B(a)}" alt=""><b>{nm}</b><strong>{v}</strong></div>'
    return (f'<section class="gip" aria-label="A game in progress"><div class="gh"><span class="k">Game in progress</span><span>Round 3 · 52 min</span></div>'
            f'<div class="fx">{fx}</div><p>Saved on this {dev}, right where you left it: Colin’s turn.</p>'
            f'<button class="go">{ICON["play"]}Back to the game</button><button class="dis">Discard this game</button></section>')
four = [YOU, COLIN, PETER, MAX]
files['S3-Resume-Phone'] = ('S3 · Back on the table page with a game saved', 390, None, PAGE_CSS + SEAT_CSS, phone_page(four, LOG + CLOSE, top_card=gip()))
files['S3-Resume-Desktop'] = ('S3 · A game saved, desktop', 1300, None, PAGE_CSS + SEAT_CSS, desk_page(four, LOG + CLOSE, top_card=gip('device')))

# ---- S4a · the table closed mid-game: the closed page keeps the game ----
CLOSED_CSS = '''
.cz{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;max-width:440px;margin:0 auto;padding:30px 20px}
.oval{position:relative;width:200px;height:120px;margin-bottom:8px}
.oval>span{position:absolute;left:30px;top:30px;width:140px;height:62px;border-radius:31px;border:1.5px dashed var(--border-dashed);box-sizing:border-box}
.oval img{position:absolute;width:34px;height:34px;border-radius:50%;object-fit:cover;opacity:.55;filter:grayscale(.6);border:1.5px solid var(--bg);box-shadow:0 0 0 1px rgba(255,255,255,.12)}
.cz h1{font-size:22px}
.cz .bd{margin:0;font-size:14.5px;line-height:1.6;color:var(--fg-muted)}
.cz .gip{width:100%;text-align:left;margin:6px 0 4px}
.cz .btns{width:100%;max-width:300px;display:flex;flex-direction:column;gap:8px}
.cz .plain{box-shadow:none}
.D .cz{padding-top:70px}
'''
def oval():
    faces = ['ghalta', 'giada', 'sai', 'gisa']
    import math
    out = '<span></span>'
    for i, a in enumerate(faces):
        t = 2 * math.pi * i / len(faces)
        x = round(83 + 83 * math.sin(t)); y = round(44 - 44 * math.cos(t))
        out += f'<img src="{B(a)}" alt="" style="left:{x}px;top:{y}px">'
    return f'<div class="oval" aria-hidden="true">{out}</div>'
def closed_body(dev):
    return (f'{oval()}<h1>This table has closed</h1><p class="bd">You closed Thursday night’s table at 10:12 pm. Games logged from it stay on each deck’s Games tab.</p>'
            f'{gip(dev)}<div class="btns"><button class="ghost">Log this game</button><button class="ghost plain">Back to Friends</button></div>')
files['S4-Closed-Phone'] = ('S4 · The table closed mid-game: the game carries on', 390, None, PAGE_CSS + CLOSED_CSS,
    f'''<div class="P" style="min-height:844px">
  <div class="top"><div class="wm"><span>THE</span><b>99</b></div><button class="ib" aria-label="Search">{ICON['search']}</button><button class="ib" aria-label="Help">?</button><span class="av" aria-label="Your account">WC</span></div>
  <div class="back">{ICON['back']} Friends</div>
  <div class="cz">{closed_body('phone')}</div>
  <img class="tabbar" src="{TABS}" alt="">
</div>''')
files['S4-Closed-Desktop'] = ('S4 · The table closed mid-game, desktop', 1300, 900, PAGE_CSS + CLOSED_CSS,
    f'''<div class="D" style="height:900px">
  <div class="rail"><img src="{RAIL}" alt=""></div>
  <div class="main"><div class="cz">{closed_body('device')}</div></div>
</div>''')

# ---- tracker boards built from the approved files ----
def rd(n): return open(os.path.join(SRC, n), encoding='utf-8').read()
def retitle(s, t): return re.sub(r'<title>.*?</title>', f'<title>{t}</title>', s, count=1)

# S2b · the waiting seat's panel in play (phone): F03 with Max's art gone
NOART = '.noart{position:absolute;inset:0;background:radial-gradient(260px 180px at 50% 45%,#29241F,#1E1A15)}\n.who i.nd{font-style:normal;font-family:"IBM Plex Mono",monospace;font-size:11px;color:#A59C89;margin-right:4px}'
s = rd('F03-First.dc.html')
s = s.replace('<img class="art" src="/_blob/747b6b5b0a287c64fc2a76924491c25e" alt="">\n      <div class="wash"></div>', '<div class="noart"></div>')
s = s.replace('<div class="who"><b>Max</b>', '<div class="who"><b>Max</b><i class="nd">no deck</i>')
s = s.replace('</style>', NOART + '\n</style>', 1)
assert 'class="noart"' in s
files['S2-WaitingPlay-Phone'] = ('S2b · In play: a seat with no deck gets a plain panel', 390, 844, None, retitle(s, 'S2b · A seat with no deck, in play'))
s = rd('F18-Tablet4.dc.html')
s = s.replace('<img class="art" src="/_blob/747b6b5b0a287c64fc2a76924491c25e" alt=""><div class="wash"></div>', '<div class="noart"></div>')
s = s.replace('<b>Max</b><i>Gisa Zombies</i>', '<b>Max</b><i>no deck picked</i>')
s = s.replace('</style>', NOART + '\n</style>', 1)
assert 'class="noart"' in s
files['S2-WaitingPlay-Tablet'] = ('S2b · A seat with no deck, tablet', 1180, 820, None, retitle(s, 'S2b · A seat with no deck, tablet'))

# Result variants from F11
F11 = rd('F11-Result.dc.html')
RES_CSS = '''.note{display:flex;gap:10px;align-items:flex-start;border-radius:10px;background:var(--surface-sunken);box-shadow:inset 0 0 0 1px var(--border);padding:10px 12px;font-size:13px;line-height:1.5;color:var(--fg-body)}
.note svg{flex:none;margin-top:2px;color:var(--fg-muted)}
.win.two{display:grid;grid-template-columns:1fr 1fr}
.win.two img{width:100%;height:100%;object-fit:cover}
.win.two img+img{box-shadow:-1px 0 0 var(--bg)}
.eq{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);width:44px;height:44px;border-radius:50%;background:rgba(20,17,14,.85);box-shadow:inset 0 0 0 2px var(--accent);display:flex;align-items:center;justify-content:center;color:var(--accent)}
.pg.T{width:1180px;height:820px;padding:0;align-items:center;justify-content:center;background:var(--bg)}
.T .colw{width:440px;height:820px;box-sizing:border-box;padding:8px 0 22px;display:flex;flex-direction:column;gap:14px}
.T .win{height:180px}'''
TABLE_IC = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><ellipse cx="12" cy="12" rx="9" ry="5"/><path d="M8 20l1-3M16 20l-1-3"/></svg>'

def tabletize(s):
    # the result at tablet/desktop width: the F11 phone column, centred (READINESS)
    s = s.replace('<div class="pg">', '<div class="pg T"><div class="colw">', 1)
    s = s.replace('\n</div>\n</x-dc>', '\n</div></div>\n</x-dc>', 1)
    s = s.replace('"$preview":{"width":390,"height":844}', '"$preview":{"width":1180,"height":820}')
    return s

closed_note = (f'<div class="note">{TABLE_IC}<span>You closed the table at 10:12 pm. This game still logs from it until 6 am.</span></div>')
s = F11.replace('</style>', RES_CSS + '\n</style>', 1)
s = s.replace('<div class="foot">', '<div class="foot">' + closed_note, 1)
s = s.replace('<button class="ghost">Back to the table</button>', '<button class="ghost">Back to Friends</button>')
assert closed_note in s
files['S4-ClosedResult-Phone'] = ('S4b · The result after the table closed', 390, 844, None, retitle(s, 'S4b · Result after the table closed'))
files['S4-ClosedResult-Tablet'] = ('S4b · The result after the table closed, tablet', 1180, 820, None, retitle(tabletize(s), 'S4b · Result after the table closed, tablet'))

# S5b · a draw
s = F11.replace('</style>', RES_CSS + '\n</style>', 1)
s = s.replace('<span>Thursday night · 4 rounds · 1 h 14 min</span>', '<span>Thursday night · 6 rounds · 1 h 38 min</span>')
s = s.replace('<div class="win"><img src="/_blob/3a9cc48d946086f7a01702d812ad49a7" alt=""><div><strong>Colin wins</strong><small>Ghalta Stompy · 22 life left</small></div></div>',
              '<div class="win two"><img src="/_blob/3a9cc48d946086f7a01702d812ad49a7" alt=""><img src="/_blob/019b993ea74dc7eef2d2e5a820befefa" alt=""><span class="eq" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 9h14M5 15h14"/></svg></span><div><strong>A draw</strong><small>Colin and you went out together · round 6</small></div></div>')
s = s.replace('''    <div class="o"><img src="/_blob/019b993ea74dc7eef2d2e5a820befefa" alt=""><div><b>You</b><small>Round 4 · life</small></div><em>2nd</em></div>
    <div class="o"><img src="/_blob/747b6b5b0a287c64fc2a76924491c25e" alt=""><div><b>Max</b><small>Round 4 · life</small></div><em>3rd</em></div>''',
              '''    <div class="o"><img src="/_blob/747b6b5b0a287c64fc2a76924491c25e" alt=""><div><b>Max</b><small>Round 5 · 10 poison</small></div><em>3rd</em></div>''')
s = s.replace('<p class="sub">Everyone seated finds Colin\'s win filled in when they log.</p>', '<p class="sub">Logs as a draw for Colin and you, and a loss for Max and Peter.</p>')
assert 'A draw' in s and 'Logs as a draw' in s and 'Round 5' in s
files['S5-Draw-Phone'] = ('S5b · A draw: the finish screen', 390, 844, None, retitle(s, 'S5b · A draw'))
files['S5-Draw-Tablet'] = ('S5b · A draw, tablet', 1180, 820, None, retitle(tabletize(s), 'S5b · A draw, tablet'))

# S5a · End game asks how it ended (phone sheet, from F09's Table tab)
s = rd('F09-Table.dc.html')
PICK_CSS = '''.endq{display:flex;align-items:baseline;gap:12px}
.endq b{font-size:15px;font-weight:600}.endq small{font-size:12px;color:var(--fg-muted)}
.endq .bk{margin-left:auto;height:36px;padding:0 12px;border-radius:9px;border:0;background:none;color:var(--fg-body);font-family:"IBM Plex Sans",sans-serif;font-size:13.5px;font-weight:600}
.pick{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;flex:1;min-height:0}
.pk{position:relative;overflow:hidden;border-radius:12px;border:0;padding:0;background:var(--surface);box-shadow:inset 0 0 0 1px var(--border-strong);color:var(--fg);font-family:"IBM Plex Sans",sans-serif;text-align:left}
.pk img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}
.pk span{position:absolute;left:0;right:0;bottom:0;padding:26px 12px 10px;background:linear-gradient(transparent,rgba(20,17,14,.9))}
.pk b{display:block;font-family:"Cinzel",serif;font-weight:700;font-size:19px}
.pk small{display:block;font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--fg-body)}
.pk.dr{background:var(--elevated);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;color:var(--accent);box-shadow:inset 0 0 0 1.5px var(--accent)}
.pk.dr b{font-size:19px;color:var(--fg)}.pk.dr small{color:var(--fg-muted);font-family:"IBM Plex Sans",sans-serif;font-size:12px;padding:0 10px}'''
EQ = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 9h14M5 15h14"/></svg>'
pick_body = ('<div class="endq"><b>How did it end?</b><small>3 players still in</small><button class="bk">Back</button></div>'
             '<div class="pick" role="group" aria-label="How the game ended">'
             f'<button class="pk"><img src="{B("ghalta")}" alt=""><span><b>Colin won</b><small>22 life</small></span></button>'
             f'<button class="pk"><img src="{B("sai")}" alt=""><span><b>You won</b><small>4 life</small></span></button>'
             f'<button class="pk"><img src="{B("gisa")}" alt=""><span><b>Max won</b><small>9 life</small></span></button>'
             f'<button class="pk dr">{EQ}<b>A draw</b><small>Everyone still in shares it</small></button></div>')
s = re.sub(r'<div class="body">.*?\n    </div>\n  </div>\n</div>', '<div class="body">' + pick_body + '</div>\n  </div>\n</div>', s, count=1, flags=re.S)
s = s.replace('</style>', PICK_CSS + '\n</style>', 1)
s = s.replace('<i>Sai Thopters · 31 life</i>', '<i>Sai Thopters · 4 life</i>')
assert 'How did it end?' in s
files['S5-EndGame-Phone'] = ('S5a · End game asks how it ended', 390, 844, None, retitle(s, 'S5a · End game: how did it end?'))

# S5a tablet: F18's table dimmed, the sheet over the bottom half facing You
s = rd('F18-Tablet4.dc.html')
TSHEET = '''.dim{position:absolute;inset:0;background:rgba(10,8,6,.62);z-index:5}
.tsheet{position:absolute;left:0;right:0;bottom:0;height:420px;z-index:6;box-sizing:border-box;padding:14px 24px 20px;background:#211D18;border-radius:20px 20px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.5);display:flex;flex-direction:column;gap:12px}
.tsheet .hd{display:flex;align-items:center;gap:12px;height:44px}
.tsheet .hd img{width:40px;height:40px;border-radius:50%;object-fit:cover}
.tsheet .hd b{font-family:"Cinzel",serif;font-weight:700;font-size:22px}
.tsheet .hd i{font-style:normal;font-family:"IBM Plex Mono",monospace;font-size:12.5px;color:#A59C89}
.tsheet .x{margin-left:auto;width:44px;height:44px;background:none;border:0;color:#EDE6D8;font-size:22px;font-family:"IBM Plex Sans",sans-serif}
.tsheet .tabs{display:flex;gap:2px;border-bottom:1px solid #2B241B}
.tsheet .tabs button{height:44px;padding:0 16px;background:none;border:0;border-bottom:2px solid transparent;color:#A59C89;font-family:"IBM Plex Sans",sans-serif;font-weight:600;font-size:14px;margin-bottom:-1px}
.tsheet .tabs .on{color:#EDE6D8;border-bottom-color:#CF8745;margin-left:auto}
.tsheet .tabs em{font-style:normal;font-family:"IBM Plex Mono",monospace;font-size:11.5px;color:#CF8745;margin-left:5px}
.tsheet .body{flex:1;display:flex;flex-direction:column;gap:10px;min-height:0;--surface:#1E1A15;--elevated:#29241F;--border:#2B241B;--border-strong:#3A3229;--fg:#EDE6D8;--fg-body:#C0B8A6;--fg-muted:#A59C89;--accent:#CF8745}
''' + PICK_CSS
tpick = ('<div class="endq"><b>How did it end?</b><small>4 players still in</small><button class="bk">Back</button></div>'
         '<div class="pick" role="group" aria-label="How the game ended" style="grid-template-columns:repeat(5,minmax(0,1fr))">'
         + ''.join(f'<button class="pk"><img src="{B(a)}" alt=""><span><b>{n} won</b><small>{l} life</small></span></button>' for n, a, l in [('Colin','ghalta',27),('Peter','giada',34),('You','sai',31),('Max','gisa',38)])
         + f'<button class="pk dr">{EQ}<b>A draw</b><small>Everyone still in shares it</small></button></div>')
tsheet = (f'<div class="dim"></div><div class="tsheet" role="dialog" aria-label="Your sheet"><div class="hd"><img src="{B("sai")}" alt=""><b>You</b><i>Sai Thopters · 31 life</i><button class="x" aria-label="Close">✕</button></div>'
          '<div class="tabs"><button>Commander damage<em>6</em></button><button>Counters<em>1</em></button><button>Tax<em>+4</em></button><button>Mana</button><button class="on">Table</button></div>'
          f'<div class="body">{tpick}</div></div>')
s = s.replace('\n</div>\n</x-dc>', '\n' + tsheet + '\n</div>\n</x-dc>', 1)
s = s.replace('</style>', TSHEET + '\n</style>', 1)
assert 'tsheet' in s and 'How did it end?' in s
files['S5-EndGame-Tablet'] = ('S5a · End game asks how it ended, tablet', 1180, 820, None, retitle(s, 'S5a · End game, tablet'))

import json
meta = {}
for k, (title, w, h, css, body) in files.items():
    if css is None:
        html = body
    else:
        html = page(title, w, h or 844, css, body)
    open(os.path.join(OUT, k + '.dc.html'), 'w', encoding='utf-8').write(html)
    meta[k + '.dc.html'] = dict(title=title, w=w, h=h)
json.dump(meta, open(os.path.join(OUT, '_meta.json'), 'w'), indent=1)
print('\n'.join(meta))
