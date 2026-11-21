# Log-your-game reminder R1 (2026-11-21). Writes project/*.dc.html + canvas.json for the Design canvas.
# Home boards are drawn over the shipped Home captures (public/about/pages/amonkhet, Low Sun): the real head, lead story,
# resume rows, Commitments and tab bar/rail are cut from them; the new card and Tonight's table are drawn from
# home-table-card.tsx. Table boards reuse the life tracker's table-page parts (S4/S6/U5 boards, same tokens).
# Asset urls are @@name@@ placeholders: subst.py swaps them for /_blob ids (canvas) or file paths (local render).
import os, sys, json
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

def A(k): return f'@@{k}@@'

FONTS = f'''@font-face{{font-family:"Cinzel";src:url({A('cinzel-variable.woff2')}) format("woff2");font-weight:400 900}}
@font-face{{font-family:"IBM Plex Sans";src:url({A('ibm-plex-sans-variable.woff2')}) format("woff2");font-weight:100 700}}
@font-face{{font-family:"IBM Plex Mono";src:url({A('ibm-plex-mono-500.woff2')}) format("woff2");font-weight:500}}
body{{margin:0}}'''
TOK = ('--bg:#14110E;--surface:#1E1A15;--surface-raised:#211D18;--surface-rail:#1A1611;--surface-sunken:#18140F;--elevated:#29241F;'
       '--border:#2B241B;--border-strong:#3A3229;--border-dashed:#494037;--fg:#EDE6D8;--fg-body:#C0B8A6;--fg-muted:#A59C89;'
       '--fg-faint:#948B78;--fg-locked:#6E6654;--fg-disabled:#4A4033;--accent:#CF8745;--success:#6FA368;--warning:#DEAA29;'
       '--fact:#8FA6BE;--danger:#C6533F;--bracket-3:#C9AC62;')

CSS = '''
.P,.D{%s box-sizing:border-box;background:var(--bg);font-family:"IBM Plex Sans",system-ui,sans-serif;color:var(--fg);position:relative}
.P{width:390px;display:flex;flex-direction:column}
.D{width:1300px;display:grid;grid-template-columns:62px minmax(0,1fr)}
.cut{display:block}
.tabbar{position:sticky;bottom:0;display:block;width:390px;height:74px;margin-top:auto;z-index:5}
.rail img{display:block;width:62px;height:900px}
.top{height:56px;display:flex;align-items:center;padding:0 8px 0 18px;border-bottom:1px solid var(--border);gap:4px}
.wm{display:flex;align-items:baseline;gap:8px;margin-right:auto}
.wm span{font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.3em;color:var(--accent)}
.wm b{font-family:"Cinzel",serif;font-weight:700;font-size:28px;line-height:1}
.ib{width:44px;height:44px;border:0;background:none;color:var(--fg-body);display:flex;align-items:center;justify-content:center;font-size:20px;font-family:"IBM Plex Sans",sans-serif}
.av{width:36px;height:30px;border-radius:9px;box-shadow:inset 0 0 0 1.5px var(--accent);color:var(--accent);font-family:"IBM Plex Mono",monospace;font-size:12px;display:flex;align-items:center;justify-content:center;margin:0 4px}
.back{height:44px;display:flex;align-items:center;gap:4px;padding:0 8px;font-size:14px;color:var(--fg-body)}
h1,h2,h3{margin:0;font-family:"Cinzel",serif;font-weight:700}
/* Home body */
.hb{display:flex;flex-direction:column;gap:10px;padding:2px 16px 12px}
.D .hmain{min-width:0;display:flex;flex-direction:column}
.D .hcols{display:grid;grid-template-columns:849px 316px;column-gap:20px;padding:20px 26px 26px;align-items:start}
.D .hcl{display:flex;flex-direction:column;gap:10px}
.D .hcl .cut{margin-top:2px}
/* the Home card shell (home-table-card.tsx) */
.hc{position:relative;display:flex;flex-direction:column;gap:10px;overflow:hidden;border-radius:14px;background:var(--surface-rail);padding:14px;border:1px solid var(--accent)}
.hc .wash{pointer-events:none;position:absolute;inset:-40px;display:flex;opacity:.28;filter:blur(34px) saturate(1.25)}
.hc .wash img{height:100%%;min-width:0;flex:1;object-fit:cover}
.hc .z{position:relative}
.kk{font-family:"IBM Plex Mono",monospace;font-size:10.5px;line-height:14px;font-weight:500;text-transform:uppercase;letter-spacing:.14em;color:var(--accent)}
.hc h3{font-size:18px;line-height:25px;color:var(--fg)}
.faces{display:flex;flex-wrap:wrap;gap:6px}
.fc{width:30px;height:30px;border-radius:8px;overflow:hidden;border:1.5px solid var(--bg);box-shadow:0 0 0 1px rgba(237,230,216,.12);flex:none;box-sizing:content-box}
.fc img{width:100%%;height:100%%;object-fit:cover;display:block}
.hc p{position:relative;margin:0;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.hc p b{color:var(--fg);font-weight:600}
.acc{text-decoration:none;display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:8px;white-space:nowrap;border-radius:10px;border:0;background:var(--accent);padding:0 18px;font-family:"IBM Plex Sans",sans-serif;font-size:14.5px;font-weight:600;color:var(--bg);width:100%%;position:relative;box-sizing:border-box}
.D .hc.row{flex-direction:row;align-items:center;gap:22px;padding:16px 18px}
.D .hc.row .lc{width:230px;flex:none;display:flex;flex-direction:column;gap:8px}
.D .hc.row p{flex:1;min-width:0}
.D .hc.row .acc{width:auto;min-height:0;height:40px;padding:0 20px;font-size:13.5px;flex:none}
/* the new card: game to log */
.x{position:absolute;top:4px;right:4px;width:44px;height:44px;border:0;background:none;color:var(--fg-muted);display:flex;align-items:center;justify-content:center;border-radius:10px;z-index:2}
.lg .hd{display:flex;align-items:baseline;gap:10px;padding-right:34px}
.lg .hd .mt{font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--fg-faint);white-space:nowrap}
.tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;position:relative}
.tl{position:relative;height:56px;border-radius:9px;overflow:hidden;background:var(--surface-sunken)}
.tl img{position:absolute;inset:0;width:100%%;height:100%%;object-fit:cover;opacity:.4;filter:grayscale(.6)}
.tl.w{box-shadow:inset 0 0 0 2px var(--accent)}.tl.w img{opacity:.6;filter:none}
.tl b{position:absolute;left:8px;bottom:5px;font-size:12px;font-weight:600;text-shadow:0 1px 4px rgba(0,0,0,.8)}
.tl em{position:absolute;right:7px;top:4px;font-style:normal;font-family:"Cinzel",serif;font-weight:700;font-size:13px;color:var(--fg-body);text-shadow:0 1px 4px rgba(0,0,0,.8)}
.tl.w em{color:var(--accent)}
.D .lg.row{flex-direction:row;align-items:center;gap:22px;padding:16px 18px}
.D .lg.row .lc{width:230px;flex:none;display:flex;flex-direction:column;gap:8px}
.D .lg.row .mid{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px}
.D .lg.row .acc{width:auto;min-height:0;height:40px;padding:0 20px;font-size:13.5px;flex:none}
.D .lg.row .x{position:relative;top:auto;right:auto;margin:-4px -8px -4px -10px;flex:none}
.D .lg.row .tiles{grid-template-columns:repeat(4,minmax(0,124px))}
/* several games */
.rows{position:relative;display:flex;flex-direction:column;margin:0 -14px -14px}
.gr{display:flex;align-items:center;border-top:1px solid var(--border)}
.gl{flex:1;min-width:0;display:flex;align-items:center;gap:12px;min-height:68px;padding:10px 4px 10px 14px;color:var(--fg);text-decoration:none;box-sizing:border-box}
.gl .wf{width:40px;height:40px;border-radius:10px;overflow:hidden;flex:none;box-shadow:0 0 0 2px var(--accent)}
.gl .wf img{width:100%%;height:100%%;object-fit:cover;display:block}
.gl .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.gl .t b{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gl .t small{font-family:"IBM Plex Mono",monospace;font-size:11px;line-height:1.45;color:var(--fg-faint)}
.gl .t span{font-size:13px;color:var(--fg-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gl .t i.ld{font-style:normal;margin-left:8px;font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--warning)}
.gl .go{flex:none;height:36px;padding:0 12px;border-radius:9px;box-shadow:inset 0 0 0 1px var(--accent);color:var(--fg);font-size:13.5px;font-weight:600;display:flex;align-items:center}
.gr .x{position:static;flex:none;margin-right:4px}
.mf{position:relative;margin:0;font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
.D .gl .t{flex-direction:row;align-items:baseline;gap:14px}
.D .gl .t b{width:150px;flex:none}
.D .gl .t small{width:210px;flex:none}
.D .gl .t span{flex:1}
/* toast (shared toast: words, Undo, bare close) */
.toast{position:absolute;left:50%%;transform:translateX(-50%%);display:flex;align-items:center;gap:12px;min-height:52px;box-sizing:border-box;padding:8px 6px 8px 16px;border-radius:12px;background:var(--elevated);box-shadow:inset 0 0 0 1px var(--border-strong),0 12px 32px rgba(0,0,0,.55);font-size:14px;line-height:1.45;color:var(--fg);z-index:9}
.toast .u{flex:none;height:40px;padding:0 12px;border:0;background:none;color:var(--accent);font-family:"IBM Plex Sans",sans-serif;font-size:14px;font-weight:600}
.toast .tx2{min-width:0}
.P .toast{bottom:86px;width:358px}
.D .toast{bottom:28px;width:520px;left:calc(50%% + 31px)}
/* table pages (life tracker S4/S6/U5 boards) */
.col{padding:0 16px 22px;display:flex;flex-direction:column;gap:14px}
.ghost{text-decoration:none;height:44px;border-radius:10px;border:0;background:none;box-shadow:inset 0 0 0 1px var(--border-strong);color:var(--fg);font-family:"IBM Plex Sans",sans-serif;font-size:14.5px;width:100%%;display:flex;align-items:center;justify-content:center}
.cz{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;max-width:440px;margin:0 auto;padding:30px 20px;box-sizing:border-box}
.oval{position:relative;width:200px;height:120px;margin-bottom:8px}
.oval>span{position:absolute;left:30px;top:30px;width:140px;height:62px;border-radius:31px;border:1.5px dashed var(--border-dashed);box-sizing:border-box}
.oval img{position:absolute;width:34px;height:34px;border-radius:50%%;object-fit:cover;opacity:.55;filter:grayscale(.6);border:1.5px solid var(--bg);box-shadow:0 0 0 1px rgba(255,255,255,.12)}
.cz h1{font-size:22px}
.cz .bd{margin:0;font-size:14.5px;line-height:1.6;color:var(--fg-muted)}
.cz .btns{width:100%%;max-width:300px;display:flex;flex-direction:column;gap:8px}
.cz .plain{box-shadow:none}
.D .cz{padding-top:70px}
.last{width:100%%;box-sizing:border-box;text-align:left;border-radius:14px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--border-strong);padding:14px;display:flex;flex-direction:column;gap:12px}
.last .gh{display:flex;align-items:baseline;gap:10px}
.last .gh .k{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-muted)}
.last .gh span:last-child{margin-left:auto;font-family:"IBM Plex Mono",monospace;font-size:11.5px;color:var(--fg-faint)}
.last h2{font-size:20px}
.last p{margin:0;font-size:13px;line-height:1.5;color:var(--fg-muted)}
.last p b{color:var(--fg-body);font-weight:600}
.note{display:flex;gap:10px;align-items:flex-start;border-radius:10px;background:var(--surface-sunken);box-shadow:inset 0 0 0 1px var(--border);padding:10px 12px;font-size:13px;line-height:1.5;color:var(--fg-body);text-align:left}
.note svg{flex:none;margin-top:2px;color:var(--fg-muted)}
.note.ok svg{color:var(--success)}
/* push */
.lks{position:relative;width:390px;height:844px;overflow:hidden;background:radial-gradient(420px 380px at 30%% 20%%,#5a4636,transparent 70%%),radial-gradient(380px 420px at 80%% 80%%,#3b2a22,transparent 70%%),linear-gradient(170deg,#2b2320,#120f0d);color:#fff;font-family:-apple-system,"SF Pro Text","IBM Plex Sans",sans-serif}
.lks .clk{text-align:center;padding-top:70px}
.lks .clk small{display:block;font-size:17px;font-weight:500;opacity:.85}
.lks .clk b{display:block;font-size:84px;font-weight:600;line-height:1;letter-spacing:-1px;margin-top:4px}
.lks .stk{position:absolute;left:10px;right:10px;bottom:120px;display:flex;flex-direction:column;gap:8px}
.ntf{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:20px;background:rgba(60,48,40,.72);position:relative}
.ntf img.ai,.mban img.ai{width:38px;height:38px;border-radius:9px;flex:none;display:block}
.ntf .tx,.mban .tx{flex:1;min-width:0}
.ntf .tp,.mban .tp{display:flex;justify-content:space-between;gap:8px;font-size:14px;font-weight:600}
.ntf .tp small,.mban .tp small{font-weight:400;font-size:13px;opacity:.7;white-space:nowrap}
.ntf .bd,.mban .bd{font-size:14px;line-height:1.3;opacity:.92;margin-top:1px}
.lks .hint{position:absolute;bottom:34px;left:0;right:0;text-align:center;font-size:12px;opacity:.6}
.slab{position:absolute;z-index:60;font:600 9px "IBM Plex Mono",monospace;letter-spacing:.06em;color:#0D0B09;background:#B9B2A4;border-radius:3px;padding:1px 5px;white-space:nowrap}
.mstk{position:absolute;top:16px;right:16px;width:360px;display:flex;flex-direction:column;gap:10px;z-index:8}
.mban{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:16px;background:#302E34;box-shadow:0 10px 30px rgba(0,0,0,.5),inset 0 0 0 1px rgba(255,255,255,.08);color:#f2f2f2;font-family:-apple-system,"SF Pro Text","IBM Plex Sans",sans-serif}
.mban .sub2{font-size:12px;opacity:.6}
.dim{position:absolute;inset:0;background:rgba(0,0,0,.35);z-index:7}
''' % TOK

def page(title, w, h, body):
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
{CSS}
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

X_IC = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
BACK_IC = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'
SEARCH_IC = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>'
CHECK_IC = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16 9.5"/></svg>'
CLOCK_IC = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'

SEATS = [('Colin', 'ghalta'), ('Peter', 'giada'), ('You', 'sai'), ('Max', 'gisa')]
def img(k, cls='', alt=''):
    c = f' class="{cls}"' if cls else ''
    return f'<img{c} src="{A(k + ".jpg")}" alt="{alt}">'

def tiles(order):
    # order: list of (name, art, place); first place ringed
    out = []
    for n, a, p in order:
        w = ' w' if p == '1st' else ''
        out.append(f'<div class="tl{w}">{img(a)}<b>{n}</b><em>{p}</em></div>')
    return '<div class="tiles">' + ''.join(out) + '</div>'

COLIN_WON = [('Colin', 'ghalta', '1st'), ('You', 'sai', '2nd'), ('Max', 'gisa', '3rd'), ('Peter', 'giada', '4th')]

def wash(arts): return '<div class="wash" aria-hidden="true">' + ''.join(img(a) for a in arts) + '</div>'

# ---------- Tonight's table (shipped, home-table-card.tsx) ----------
def tonight(desk):
    faces = '<div class="faces">' + ''.join(f'<span class="fc">{img(a)}</span>' for _, a in SEATS) + '</div>'
    sent = '<p>You’re seated with <b>Sai Thopters</b>. 4 seated, open until 6:00 am.</p>'
    btn = '<a class="acc" href="#">Open the table</a>'
    if desk:
        return (f'<section class="hc row" aria-label="Tonight’s table">{wash([a for _, a in SEATS])}'
                f'<div class="z lc"><span class="kk">Tonight’s table</span><h3>Thursday night</h3>{faces}</div>{sent}{btn}</section>')
    return (f'<section class="hc" aria-label="Tonight’s table">{wash([a for _, a in SEATS])}'
            f'<div class="z" style="display:flex;flex-direction:column;gap:10px"><span class="kk">Tonight’s table</span><h3>Thursday night</h3>{faces}</div>{sent}{btn}</section>')

# ---------- the new card: one game to log ----------
LOG_SENT = '<p>Seats and result are filled in for <b>Sai Thopters</b> until Fri, Nov 27.</p>'
def log_one(desk):
    x = f'<button class="x" aria-label="Dismiss: Thursday night’s game">{X_IC}</button>'
    btn = '<a class="acc" href="#">Log this game</a>'
    if desk:
        return (f'<section class="hc lg row" aria-label="Game to log">{wash(["ghalta", "sai", "gisa", "giada"])}'
                f'<div class="z lc"><span class="kk">Game to log</span><h3>Colin won</h3><span class="kk" style="color:var(--fg-faint);letter-spacing:.04em;text-transform:none;font-size:11px">Thursday night · Thu, Nov 19</span></div>'
                f'<div class="z mid">{tiles(COLIN_WON)}{LOG_SENT}</div>{btn}{x}</section>')
    return (f'<section class="hc lg" aria-label="Game to log">{wash(["ghalta", "sai", "gisa", "giada"])}{x}'
            f'<div class="z hd"><span class="kk">Game to log</span><span class="mt">Thursday night · Thu, Nov 19</span></div>'
            f'<h3 class="z">Colin won</h3>{tiles(COLIN_WON)}{LOG_SENT}{btn}</section>')

# ---------- several games ----------
GAMES = [
    ('sai', 'You won', 'Thursday night · Nov 19', 'Sai Thopters, 1st', False, 'Thursday night’s second game'),
    ('ghalta', 'Colin won', 'Thursday night · Nov 19', 'Sai Thopters, 2nd', False, 'Thursday night’s first game'),
    ('giada', 'Peter won', 'Commander Club · Nov 14', 'Hollow Oak Hours, 3rd', True, 'Commander Club’s game'),
]
def log_many(desk):
    rows = []
    for art, title, meta, mine, last, aria in GAMES:
        lastt = '<i class="ld">Last day</i>' if last else ''
        rows.append(f'<div class="gr"><a class="gl" href="#" aria-label="Log {aria}"><span class="wf">{img(art)}</span>'
                    f'<span class="t"><b>{title}{lastt}</b><small>{meta}</small><span>{mine}</span></span><span class="go">Log</span></a>'
                    f'<button class="x" aria-label="Dismiss {aria}">{X_IC}</button></div>')
    return (f'<section class="hc lg" aria-label="Games to log">{wash(["sai", "ghalta", "giada"])}'
            f'<div class="z hd" style="padding-right:0"><span class="kk">Games to log · 3</span></div>'
            f'<div class="rows">{"".join(rows)}</div></section>')

# ---------- Home pages ----------
def home_phone(cards, h, toast=''):
    return (f'<div class="P" style="min-height:{h}px">'
            f'<img class="cut" src="{A("p-head.png")}" alt="" width="390" height="206">'
            f'<div class="hb">{cards}</div>'
            f'<img class="cut" src="{A("p-rest.png")}" alt="" width="390" height="265">'
            f'{toast}<img class="tabbar" src="{A("p-tabbar-home.png")}" alt=""></div>')

def home_desk(cards, toast='', over=''):
    return (f'<div class="D" style="height:900px;overflow:hidden">{over}'
            f'<div class="rail"><img src="{A("d-rail-home.png")}" alt=""></div>'
            f'<div class="hmain"><img class="cut" src="{A("d-head.png")}" alt="" width="1238" height="85">'
            f'<div class="hcols"><div class="hcl">{cards}<img class="cut" src="{A("d-main.png")}" alt="" width="849" height="463"></div>'
            f'<img class="cut" src="{A("d-right.png")}" alt="" width="316" height="343"></div></div>{toast}</div>')

TOAST_TXT = 'Reminder hidden. Log this game stays on the table until Fri, Nov 27.'
def toast(): return (f'<div class="toast" role="status"><span class="tx2">{TOAST_TXT}</span>'
                     f'<button class="u">Undo</button><button class="x" style="position:static" aria-label="Close">{X_IC}</button></div>')

# ---------- table pages ----------
def oval():
    pos = [(83, 0), (166, 44), (83, 88), (0, 44)]
    return '<div class="oval" aria-hidden="true"><span></span>' + ''.join(
        f'<img src="{A(a + ".jpg")}" alt="" style="left:{x}px;top:{y}px">' for (_, a), (x, y) in zip(SEATS, pos)) + '</div>'

CLOSED_BODY = 'Thursday night’s table closed at 6 am, at least 4 hours after you set it. Games logged from it stay on each deck’s Games tab.'

def last_card(kicker, extra, meta=''):
    m = f'<span>{meta}</span>' if meta else ''
    return (f'<section class="last" aria-label="{kicker}"><div class="gh"><span class="k">{kicker}</span>{m}</div>'
            f'<h2>Colin won</h2>{tiles(COLIN_WON)}{extra}</section>')

def closed(desk, inner):
    cz = f'<div class="cz">{oval()}<h1>This table has closed</h1><p class="bd">{CLOSED_BODY}</p>{inner}</div>'
    if desk:
        return (f'<div class="D" style="height:900px"><div class="rail"><img src="{A("rail.png")}" alt=""></div>'
                f'<div class="hmain">{cz}</div></div>')
    return (f'<div class="P" style="min-height:844px"><div class="top"><div class="wm"><span>THE</span><b>99</b></div>'
            f'<button class="ib" aria-label="Search">{SEARCH_IC}</button><button class="ib" aria-label="Help">?</button>'
            f'<span class="av" aria-label="Your account">WC</span></div><div class="back">{BACK_IC} Friends</div>{cz}'
            f'<img class="tabbar" src="{A("tabbar.png")}" alt=""></div>')

def btns(*labels):
    out = []
    for i, l in enumerate(labels):
        out.append(f'<a class="ghost{" plain" if i == len(labels) - 1 and len(labels) > 1 else ""}" href="#">{l}</a>')
    return '<div class="btns">' + ''.join(out) + '</div>'

def note(ic, text, ok=False): return f'<div class="note{" ok" if ok else ""}">{ic}<span>{text}</span></div>'

C1_IN = last_card('Your game', meta='Thu, Nov 19', extra='<p>You haven’t logged it yet. Seats and result are filled in for <b>Sai Thopters</b> until Fri, Nov 27.</p>') + btns('Log this game', 'Back to Friends')
C2_OUT = note(CLOCK_IC, 'Logging from this table ended Fri, Nov 27 at 6 am, so nothing is filled in now. Your game with <b>Sai Thopters</b> can still be logged by hand.') + btns('Log it by hand', 'Back to Friends')
L1_DONE = last_card('Your game', meta='Thu, Nov 19', extra=note(CHECK_IC, 'You logged this game on Fri, Nov 20 at 9:14 am. It’s on Sai Thopters’ Games tab.', ok=True)) + btns('Back to Friends')

files = {}
H = {}
files['H1-OneGame-Phone'] = ('H1 · One game to log, table still open', 390, None, home_phone(tonight(False) + log_one(False), 0))
files['H1-OneGame-Desktop'] = ('H1 · One game to log, desktop', 1300, 900, home_desk(tonight(True) + log_one(True)))
files['H2-Several-Phone'] = ('H2 · Several games to log', 390, None, home_phone(log_many(False), 844))
files['H2-Several-Desktop'] = ('H2 · Several games to log, desktop', 1300, 900, home_desk(log_many(True)))
files['H3-Dismissed-Phone'] = ('H3 · Dismissed: the card leaves, Undo', 390, None, home_phone(tonight(False), 844, toast()))
files['H3-Dismissed-Desktop'] = ('H3 · Dismissed, desktop', 1300, 900, home_desk(tonight(True), toast()))

# push
def ntf(title, body, when):
    return (f'<div class="ntf"><img class="ai" src="{A("app-icon.png")}" alt=""><div class="tx"><div class="tp"><span>The 99</span><small>{when}</small></div>'
            f'<div class="bd"><b>{title}</b><br>{body}</div></div></div>')
def mban(title, body):
    return (f'<div class="mban"><img class="ai" src="{A("app-icon.png")}" alt=""><div class="tx"><div class="tp"><span>The 99</span><small>now</small></div>'
            f'<div class="sub2">the-99.dev</div><div class="bd"><b>{title}</b><br>{body}</div></div></div>')
P_ONE = ('Colin won at Thursday night’s table', 'Log your game: Sai Thopters and every seat are filled in.')
P_TWO = ('2 games at Thursday night’s table', 'Colin won, then you did. Log both: every seat is filled in.')
files['N1-Push-Phone'] = ('N1 · The push: one per table, morning release', 390, 844,
    '<div class="lks"><div class="clk"><small>Friday 20 November</small><b>9:02</b></div><div class="stk">'
    + ntf(*P_ONE, '9:00') + '</div><div class="hint">Tap to open your Log this game form</div>'
    '<span class="slab" style="left:16px;top:16px">iPHONE LOCK SCREEN · APPROX.</span></div>')
files['N1-Push-Desktop'] = ('N1 · The push, two games from one table, desktop', 1300, 900,
    home_desk(log_many(True).replace('Games to log · 3', 'Games to log · 3'), '',
              '<div class="mstk">' + mban(*P_TWO) + '</div><span class="slab" style="right:392px;top:20px">macOS BANNER (CHROME) · APPROX.</span>'))
files['C1-InWindow-Phone'] = ('C1 · Closed table, inside the week: Log this game', 390, None, closed(False, C1_IN))
files['C1-InWindow-Desktop'] = ('C1 · Closed table, inside the week, desktop', 1300, 900, closed(True, C1_IN))
files['C2-Ended-Phone'] = ('C2 · Closed table, after the week: log by hand', 390, None, closed(False, C2_OUT))
files['C2-Ended-Desktop'] = ('C2 · Closed table, after the week, desktop', 1300, 900, closed(True, C2_OUT))
files['L1-Logged-Phone'] = ('L1 · Logged: the closed table says so', 390, None, closed(False, L1_DONE))
files['L1-Logged-Desktop'] = ('L1 · Logged, desktop', 1300, 900, closed(True, L1_DONE))


MAIN_CSS = '.M{width:880px;box-sizing:border-box;padding:44px 48px 48px;background:#14110E;color:#EDE6D8;font-family:"IBM Plex Sans",sans-serif}.M .k{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#CF8745}.M h1{font-size:34px;margin:8px 0 6px}.M .lede{margin:0 0 26px;font-size:15px;line-height:1.6;color:#C0B8A6}.M ol{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:14px}.M li{display:grid;grid-template-columns:44px 1fr;gap:4px 14px;padding:16px 18px;border-radius:12px;background:#1E1A15;box-shadow:inset 0 0 0 1px #2B241B}.M li>b{grid-row:1 / 3;font-family:"IBM Plex Mono",monospace;font-size:12px;color:#CF8745;padding-top:3px}.M li h3{font-family:"IBM Plex Sans",sans-serif;font-size:16px;font-weight:600;margin:0}.M li p{margin:0;font-size:14px;line-height:1.6;color:#C0B8A6}.M li p q{color:#EDE6D8;quotes:"“" "”"}.M .dep{margin-top:22px;padding:16px 18px;border-radius:12px;box-shadow:inset 0 0 0 1px #494037;font-size:13.5px;line-height:1.6;color:#A59C89}.M .dep b{color:#EDE6D8}'
CALLS = [
 ('H1–H3', 'Home: one card per player, under Tonight’s table', 'The card reuses Tonight’s table’s shell. While the table is open it sits right under it, and once the table closes it leads Home. It shows the winner, every seat’s place on the seats’ own art, and your deck. Log this game opens your own form, filled in. The bare ✕ hides it, with Undo on the shared toast; hiding also cancels a push still waiting. With two or more games it becomes one <q>Games to log · N</q> card, one row per game, newest first, each row with its own Log and ✕.'),
 ('Window', 'A week, then log by hand', 'Seats and result stay filled in until 6 am seven days after the table’s night: Thursday’s game fills in until Fri, Nov 27. The last day tags the row. Tonight’s table still leaves at 6 am, and Undo still ends at 6 am or at the first log, as approved. After the week, the closed table tells a player who never logged why nothing is filled in and offers <q>Log it by hand</q>.'),
 ('N1', 'Push: the seat push’s pattern, one per table, after the night hold', 'A new outbox kind beside <q>rule_zero_seat</q>, under the master push switch only, with no feed row. It keeps the 21:00 to 09:00 hold: a game saved at 10:41 pm goes out at 9:00, and only to players who still haven’t logged or hidden it, so nobody at the table who logged it there gets pinged. One game: <q>Colin won at Thursday night’s table</q> / <q>Log your game: Sai Thopters and every seat are filled in.</q> Two from one table: <q>2 games at Thursday night’s table</q> / <q>Colin won, then you did. Log both: every seat is filled in.</q> A tap opens the form, or Home for two.'),
 ('C1, C2, L1', 'The closed table page', 'Inside the week, a seated player with a game to log sees a Your game card (the Last game card, drawn from the saved result) over Log this game. After the week, a note and Log it by hand. Once logged, a check note says when, and Log goes. Everyone else sees the shipped page.'),
 ('L2', 'The device that ran the game', '<q>Not logged yet</q> read wrong beside <q>Colin logged this game</q>. It becomes <q>You haven’t logged it yet: Log this game fills it in.</q> and goes by the same rule as the Home card: your own log since the result was saved. Log it anywhere and both go together.'),
]
CSS += MAIN_CSS
def main_board():
    items = ''.join(f'<li><b>{a}</b><h3>{t}</h3><p>{d}</p></li>' for a, t, d in CALLS)
    dep = ('<div class="dep"><b>Needs from engineering.</b> Keep every game’s result: today a rematch’s save replaces the last game, so a second '
           'game would lose the first one’s fill. Let the log prefill read a result for seven days after the table closes (today it ends at 6 am). '
           'Rounds and length live only on the device that ran the game, so cards drawn from the saved result show the date instead.</div>')
    return (f'<div class="M"><span class="k">The 99 · Design round · R1</span><h1>Remind players to log their game</h1>'
            f'<p class="lede">When a game result is saved, every other seated player with a deck gets one push, and anyone with an unlogged game gets a Home card until they log it or hide it. Both open that player’s own Log this game, filled in. Nothing is logged for anyone.</p>'
            f'<ol>{items}</ol>{dep}</div>')
files['Main'] = ('Log-your-game reminder · R1', 880, None, main_board())

json.dump({k: [v[0], v[1], v[2]] for k, v in files.items()}, open(os.path.join(OUT, 'meta.json'), 'w'), indent=1)
for k, (title, w, h, body) in files.items():
    open(os.path.join(OUT, k + '.dc.html'), 'w').write(page(title, w, h or 844, body))
print(len(files), 'boards')
