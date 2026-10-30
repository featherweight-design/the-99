"""Menu and Home redesign R1 (account 2, 2026-10-22): drawing kit.

Static HTML in the .dc.html wrapper, drawn over the shipped pages in Low Sun (amonkhet) tokens, the theme of the
app's own About screenshots (public/about/shots/amonkhet). Shell pieces are redrawn from
src/components/shell/nav.tsx, nav-icons.tsx and account-menu.tsx; Home from src/components/home/*; Friends from
src/components/social/*; the place strip from src/components/collection/collection-place-head.tsx.
Every string is shipped copy or a placeholder for /copy-review.
"""

FONTS = ("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&amp;"
         "family=IBM+Plex+Mono:wght@400;500;600&amp;family=Cinzel:wght@600;700;800&amp;display=swap")

MODE = {"blob": False}
BLOB = {}


def img(key):
    """Art by key: a local art/ file for the render, its /_blob/ url on the canvas."""
    return BLOB[key] if MODE["blob"] else f"art/{key}"


CSS = r"""
body{margin:0;background:#0D0B09}
*{box-sizing:border-box}
p{margin:0}
.board{--bg:#14110E;--surface:#1E1A15;--surface-raised:#211D18;--surface-rail:#1A1611;--surface-sunken:#18140F;--surface-inset:#1B1712;--elevated:#29241F;--elevated-hover:#201C17;--border:#2B241B;--border-strong:#3A3229;--border-dashed:#494037;--fg:#EDE6D8;--fg-body:#C0B8A6;--fg-muted:#A59C89;--fg-faint:#948B78;--fg-locked:#6E6654;--accent:#CF8745;--accent-text:#CF8745;--accent-shadow:#6B482A;--success:#6FA368;--warning:#DEAA29;--fact:#8FA6BE;--danger:#C6533F;--w:#F4E9C4;--u:#3A6AA5;--b:#98748F;--r:#C05A3E;--g:#4B7A46;
 padding:48px 56px 64px;background:#0D0B09;font-family:'IBM Plex Sans',sans-serif;color:var(--fg);display:flex;flex-direction:column;gap:34px}
.m{font-family:'IBM Plex Mono',monospace}
.bh{display:flex;flex-direction:column;gap:9px;max-width:1500px}
.kick{display:flex;align-items:center;gap:10px;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.kick .tag{background:var(--accent);color:#14110E;border-radius:5px;padding:4px 8px;font-weight:600}
.bh h2{margin:0;font:700 30px 'Cinzel',serif}
.bh p{font-size:14px;line-height:1.6;color:var(--fg-body);max-width:1240px;text-wrap:pretty}
.bh p b{color:var(--fg)}
code{font:12px 'IBM Plex Mono',monospace;color:var(--fg-body)}
.frames{display:flex;flex-wrap:nowrap;gap:44px;align-items:flex-start}
.fr{display:flex;flex-direction:column;gap:12px;flex:none}
.fr>.lab{width:0;min-width:100%;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.fr>.lab b{color:var(--accent);font-weight:600}
.fr>.cap{width:0;min-width:100%;font-size:13px;line-height:1.55;color:var(--fg-muted);text-wrap:pretty}
.fr>.cap b{color:var(--fg);font-weight:600}
.note{border:1px solid var(--border-strong);border-radius:12px;background:#15120F;padding:16px 18px;font-size:13px;line-height:1.6;color:var(--fg-body)}
.note b{color:var(--fg)}
.note h4{margin:0 0 4px;font:600 13px 'IBM Plex Sans';color:var(--fg)}
.note ul,.note ol{margin:6px 0 0;padding-left:18px}
.note li{margin:4px 0}
.notes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;max-width:1500px}
.new{outline:1.5px dashed rgba(207,135,69,.8);outline-offset:3px;border-radius:8px}
.later{outline:1.5px dashed rgba(143,166,190,.85);outline-offset:3px;border-radius:8px;position:relative}
.later::after{content:'later round';position:absolute;right:-2px;top:-17px;font:600 9px 'IBM Plex Mono';letter-spacing:.06em;color:#0D0B09;background:#8FA6BE;border-radius:3px;padding:1px 5px;white-space:nowrap}
.fold{position:absolute;left:0;right:0;height:0;border-top:1.5px dashed rgba(143,166,190,.85);z-index:30;pointer-events:none}
.fold span{position:absolute;left:10px;top:-19px;font:600 9.5px 'IBM Plex Mono',monospace;color:#0D0B09;background:#8FA6BE;border-radius:4px;padding:2px 6px}
.tbl{border-collapse:collapse;font-size:12.5px;color:var(--fg-body);width:100%}
.tbl th{text-align:left;font:500 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);padding:8px 10px;border-bottom:1px solid var(--border-strong)}
.tbl td{padding:9px 10px;border-bottom:1px solid var(--border);vertical-align:top;line-height:1.5}
.tbl td b{color:var(--fg)}

/* ---------------- shell: phone ---------------- */
.ph{width:390px;flex:none;border-radius:34px;border:1px solid var(--border-strong);background:var(--bg);overflow:hidden;position:relative;display:flex;flex-direction:column;color:var(--fg)}
.ph .pb{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.mhd{height:79px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:20px 20px 14px;border-bottom:1px solid var(--border);background:var(--bg)}
.wm{display:flex;align-items:flex-end;gap:4px}
.wm .the{font:9px 'IBM Plex Mono',monospace;letter-spacing:.4em;color:var(--accent);padding-bottom:4px}
.wm .mk{display:flex;flex-direction:column;align-items:center;gap:2px}
.wm .nn{font:800 24px/22px 'Cinzel',serif;color:var(--fg)}
.dia{display:flex;gap:3px;align-items:center}.dia i{width:5px;height:5px;background:var(--accent);transform:rotate(45deg);display:block}.dia i:nth-child(2){width:7px;height:7px}
.clu{display:flex;align-items:center;gap:6px;color:var(--fg-body)}
.clu .ib{width:38px;height:38px;display:flex;align-items:center;justify-content:center}
.clu .q{font:500 16px 'IBM Plex Sans';color:var(--fg-body)}
.av{width:38px;height:38px;border-radius:12px;border:1px solid var(--accent);color:var(--accent);font:500 13px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center}
.av.on{box-shadow:0 0 0 3px rgba(207,135,69,.25)}
.tbar{height:74px;flex:none;display:flex;align-items:center;padding:8px 8px 14px;background:var(--surface-rail);border-top:1px solid var(--border)}
.tbar .t{flex:1;height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:12px;color:var(--fg-faint);font:9px 'IBM Plex Mono';letter-spacing:.06em;position:relative}
.tbar .t.on{background:var(--surface-inset);color:var(--fg)}
.tbar .t.lk{color:var(--fg-locked)}
.tbar.lock{flex-direction:column;align-items:stretch;padding:7px 8px 14px;height:88px}
.tbar.lock .row{display:flex;align-items:center}
.brk{position:relative;height:14px;flex:none}
.brk i{position:absolute;top:7px;left:8px;right:8px;height:6px;border:1px solid var(--border-strong);border-bottom:0;border-radius:3px 3px 0 0}
.brk em{position:absolute;top:0;left:50%;transform:translateX(-50%);display:inline-flex;align-items:center;gap:5px;white-space:nowrap;background:var(--surface-rail);padding:0 7px;font:normal 9px/14px 'IBM Plex Mono';letter-spacing:.08em;text-transform:uppercase;color:var(--fg-locked)}
.bdg{position:absolute;top:3px;left:calc(50% + 4px);min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:var(--accent);color:#14110E;font:600 9.5px/16px 'IBM Plex Mono';text-align:center;letter-spacing:0;box-shadow:0 0 0 2px var(--surface-rail)}
.bdg.dot{min-width:8px;width:8px;height:8px;padding:0;top:6px;left:calc(50% + 6px)}

/* ---------------- shell: desktop ---------------- */
.dk{width:1300px;flex:none;display:flex;background:var(--bg);border:1px solid var(--border-strong);border-radius:12px;overflow:hidden;position:relative}
.rail{width:62px;flex:none;background:var(--surface-rail);border-right:1px solid var(--border);display:flex;flex-direction:column;align-items:center;padding:14px 0;gap:4px}
.rail.touch{width:88px}
.rail .mk{display:flex;flex-direction:column;align-items:center;gap:3px;margin-bottom:20px}
.rail .mk .nn{font:800 19px/18px 'Cinzel',serif}
.rail .sl{width:38px;height:38px;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--fg-faint);position:relative;flex:none}
.rail.touch .sl{width:72px;height:52px;border-radius:12px;gap:3px}
.rail .sl em{display:none;font:normal 9px/12px 'IBM Plex Mono';letter-spacing:.06em}
.rail.touch .sl em{display:block}
.rail .sl.on{background:var(--elevated);color:var(--fg)}
.rail .sl.lk{color:var(--fg-locked)}
.rail .sep{width:24px;height:1px;background:var(--border-strong);margin:6px 0;flex:none}
.rail .well{width:48px;border-radius:12px;border:1px solid var(--border);background:var(--surface-sunken);display:flex;flex-direction:column;align-items:center;gap:4px;padding:4px 0 9px}
.rail.touch .well{width:80px;border-radius:14px}
.rail .well small{font:normal 8px 'IBM Plex Mono';letter-spacing:.08em;color:var(--fg-locked);display:flex;flex-direction:column;align-items:center;gap:3px}
.rail .foot{margin-top:auto;display:flex;flex-direction:column;align-items:center;gap:10px}
.rail .rav{width:30px;height:30px;border-radius:50%;border:1px solid var(--accent);color:var(--accent);font:500 11px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center}
.rail .rav.on{box-shadow:0 0 0 3px rgba(207,135,69,.25)}
.rail .hq{width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font:500 14px 'IBM Plex Sans'}
.rail .bdg{top:2px;left:calc(50% + 3px);box-shadow:0 0 0 2px var(--surface-rail)}
.rail.touch .bdg{top:4px;left:calc(50% + 5px)}
.rtag{position:absolute;z-index:20;height:28px;display:flex;align-items:center;padding:0 10px;border-radius:7px;background:var(--surface-raised);border:1px solid var(--border-strong);font:500 12.5px 'IBM Plex Sans';color:var(--fg);white-space:nowrap;box-shadow:0 8px 20px rgba(0,0,0,.4)}
.main{flex:1;min-width:0;display:flex;flex-direction:column}

/* buttons */
.bp{display:flex;align-items:center;justify-content:center;border-radius:10px;background:var(--fg);color:var(--bg);font:500 14px 'IBM Plex Sans';height:44px;padding:0 16px;white-space:nowrap}
.bg{display:flex;align-items:center;justify-content:center;gap:8px;border-radius:10px;border:1px solid var(--border-strong);color:var(--fg);font:400 14px 'IBM Plex Sans';height:44px;padding:0 14px;white-space:nowrap}
.ba{display:inline-flex;align-items:center;justify-content:center;border-radius:8px;background:var(--accent);color:var(--bg);font:600 14px 'IBM Plex Sans';height:44px;padding:0 20px;white-space:nowrap}
.dk .bp,.dk .bg{height:32px;border-radius:8px;font-size:12.5px;padding:0 14px}
.lnk{color:var(--accent-text);font:500 13.5px 'IBM Plex Sans';white-space:nowrap}
.sh{margin:0;font:400 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);display:flex;align-items:baseline;gap:8px}
.sh em{font-style:normal;color:var(--fg-locked);letter-spacing:.14em;text-transform:lowercase}
.sh .r{margin-left:auto;text-transform:none;letter-spacing:0;font:400 12.5px 'IBM Plex Sans';color:var(--fg-muted);display:flex;align-items:center;gap:4px}
.sh .r i{font-style:normal;color:var(--fg-faint);font-size:15px;line-height:1}
.sh .r.acc{color:var(--accent-text)}
"""


def ico(paths, size=19, sw=1.5):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths}</svg>')


NAV = {
    "Home": '<path d="M3 9.2 10 3.6l7 5.6V16a1 1 0 0 1-1 1h-3.5v-4.2h-5V17H4a1 1 0 0 1-1-1z"/>',
    "Collection": '<rect x="3.2" y="3.2" width="5.8" height="5.8" rx="1.2"/><rect x="11" y="3.2" width="5.8" height="5.8" rx="1.2"/><rect x="3.2" y="11" width="5.8" height="5.8" rx="1.2"/><rect x="11" y="11" width="5.8" height="5.8" rx="1.2"/>',
    "Commanders": '<path d="M3 14.5 4.4 6l3.2 3.6L10 4l2.4 5.6L15.6 6 17 14.5z"/><path d="M3 16.6h14"/>',
    "Discover": '<circle cx="10" cy="10" r="6.8"/><path d="M10 6.4 12.8 10 10 13.6 7.2 10z"/>',
    "Decks": '<rect x="6.6" y="3.2" width="10" height="13" rx="1.6"/><path d="M4.2 5.4A1.6 1.6 0 0 0 3.4 6.8v8.6a1.6 1.6 0 0 0 1.6 1.6h8.2"/>',
    # NEW: Friends. Two seats, the near one whole, the far one behind it; same 20-unit box and 1.5 stroke.
    "Friends": '<circle cx="7.6" cy="7.4" r="2.7"/><path d="M2.8 16.4c.5-2.9 2.4-4.5 4.8-4.5s4.3 1.6 4.8 4.5"/><path d="M12.4 4.9a2.4 2.4 0 1 1 1.3 4.5"/><path d="M14.6 11.6c1.5.5 2.4 1.9 2.7 4"/>',
}
SEARCH = '<circle cx="8.6" cy="8.6" r="5.6"/><path d="M12.8 12.8 17 17"/>'
LOCK = ('<svg width="9" height="12" viewBox="0 0 11 14" aria-hidden="true"><path d="M2.5 6V4a3 3 0 0 1 6 0v2" fill="none" '
        'stroke="currentColor" stroke-width="1.4"/><rect x=".5" y="6" width="10" height="7.5" rx="1.5" fill="currentColor"/></svg>')
OLD = ["Home", "Collection", "Commanders", "Discover", "Decks"]
NEW = ["Home", "Collection", "Commanders", "Decks", "Friends"]


def nav_icon(n, size=19):
    return ico(NAV[n], size)


def dia():
    return '<span class="dia"><i></i><i></i><i></i></span>'


def header(menu=False):
    return (f'<div class="mhd"><div class="wm"><span class="the">THE</span><span class="mk">{dia()}<span class="nn">99</span></span></div>'
            f'<div class="clu"><span class="ib">{ico(SEARCH, 20, 1.6)}</span><span class="ib q">?</span>'
            f'<span class="av{" on" if menu else ""}">S</span></div></div>')


def badge(v):
    if v is None:
        return ""
    return '<span class="bdg dot"></span>' if v == "dot" else f'<span class="bdg">{v}</span>'


def tabbar(active="Home", items=NEW, badges=None, locked=None):
    """The phone tab bar. `locked` = the slots the first-run lock holds (they sit under the bracket)."""
    badges = badges or {}
    def slot(n):
        cls = "t on" if n == active else ("t lk" if locked and n in locked else "t")
        return f'<span class="{cls}">{nav_icon(n)}{n}{badge(badges.get(n))}</span>'
    if not locked:
        return '<div class="tbar">' + "".join(slot(n) for n in items) + "</div>"
    i0 = items.index(locked[0]); i1 = items.index(locked[-1])
    left = f"{i0 * 20}%"; right = f"{(len(items) - 1 - i1) * 20}%"
    brk = (f'<div class="brk" style="margin-left:{left};margin-right:{right}"><i></i>'
           f'<em>{LOCK}Open once your cards are in</em></div>')
    return f'<div class="tbar lock">{brk}<div class="row">' + "".join(slot(n) for n in items) + "</div></div>"


def phone(inner, active="Home", h=None, items=NEW, badges=None, locked=None, over="", menu=False, tabs=True, hdr=True):
    style = f"height:{h}px" if h else ""
    pb = "" if h else ' style="flex:none"'
    return (f'<div class="ph" style="{style}">{header(menu) if hdr else ""}<div class="pb"{pb}>{inner}</div>'
            f'{tabbar(active, items, badges, locked) if tabs else ""}{over}</div>')


def rail(active="Home", items=NEW, badges=None, touch=False, menu=False, locked=None, tag=None):
    badges = badges or {}
    def slot(n, lk=False):
        cls = "sl" + (" on" if n == active else "") + (" lk" if lk else "")
        return f'<span class="{cls}">{nav_icon(n)}<em>{n}</em>{"" if lk else badge(badges.get(n))}</span>'
    out = [f'<div class="rail{" touch" if touch else ""}"><span class="mk">{dia()}<span class="nn">99</span></span>',
           f'<span class="sl">{ico(SEARCH, 19)}<em>Search</em></span><span class="sep"></span>']
    if locked:
        out += [slot(n) for n in items if n not in locked]
        out.append('<div class="well">' + "".join(slot(n, True) for n in locked) + f'<small>{LOCK}LOCKED</small></div>')
    else:
        out += [slot(n) for n in items]
    out.append(f'<div class="foot"><span class="hq">?</span><span class="rav{" on" if menu else ""}">S</span></div></div>')
    return "".join(out)


def desk(inner, active="Home", items=NEW, badges=None, touch=False, menu=False, locked=None, over="", h=None, w=1300):
    style = f"width:{w}px" + (f";height:{h}px" if h else "")
    return (f'<div class="dk" style="{style}">{rail(active, items, badges, touch, menu, locked)}'
            f'<div class="main">{inner}</div>{over}</div>')


def doc(title, body, width):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link href="{FONTS}" rel="stylesheet">
<style>{CSS}</style>
</helmet>
<div class="board" style="width:{width}px">{body}</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{width},"height":1200}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""


def board_head(kicker, title, cap, tag="R2"):
    return (f'<div class="bh"><div class="kick"><span class="tag">{tag}</span>{kicker}</div>'
            f'<h2>{title}</h2><p>{cap}</p></div>')


def frame(label, body, cap=""):
    return (f'<div class="fr"><div class="lab">{label}</div>{body}'
            + (f'<p class="cap">{cap}</p>' if cap else "") + "</div>")


def frames(*fs, gap=44):
    return f'<div class="frames" style="gap:{gap}px">' + "".join(fs) + "</div>"
