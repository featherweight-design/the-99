"""About launch entries halos R1 (account 2, 2026-10-21). Boards drawn over the shipped Reference tab, each opened
entry's picture being its screen's REAL 390x844 capture (public/about/shots/<theme>/<screen>.webp, main 308382b),
windowed and haloed exactly as EntryFrame/frameWindow do. Words are /copy-review's drafts, quoted unchanged."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import ICONS, TABS, wordmark, board_head, frame

S = "/tmp/claude-0/-home-claude/9f5093d7-041d-5ac3-9947-de834d595fe1/scratchpad"
THEMES = [("amonkhet", "Low Sun", "#CF8745", "#14110E"), ("kamigawa", "Neon Rain", "#FF4D9A", "#0E0F14"),
          ("ixalan", "Canopy", "#A3C445", "#0E1310"), ("phyrexia", "Oil Haze", "#52827A", "#0D0B0E"),
          ("eldraine", "Witching Hour", "#AE88E6", "#120E17"), ("kaldheim", "First Frost", "#6C97DB", "#121217")]
BLOB = json.load(open(f"{S}/gen/blobs.json"))
MODE = {"blob": False}
RATIO = 1688 / 780


def shot(theme, screen):
    return BLOB[f"{theme}-{screen}"] if MODE["blob"] else f"art/{theme}-{screen}.webp"


def hexa(h, a):
    h = h.lstrip("#")
    return f"rgba({int(h[0:2],16)},{int(h[2:4],16)},{int(h[4:6],16)},{a})"


# ---- the boxes, as fractions of the 390x844 frame (x, y, w, h) ------------------------------------------------------
BOX = {
    "getting-help": ("home", (0.7064, 0.0237, 0.1128, 0.0521)),      # header ?, 44 square (help-root PLACE.header)
    "about-rebuilt": ("account", (0.0513, 0.6534, 0.8974, 0.0622)),  # About The 99 row (candidate, measured)
    "rule-zero": ("friends", (0.0795, 0.7841, 0.8410, 0.0625)),      # pod's Rule 0 check row (candidate, measured)
    "invites": ("friends", (0.0410, 0.2231, 0.9179, 0.0569)),        # Add a friend press (shipped `friends` box)
    "card-search": ("collection", (0.5897, 0.0237, 0.1128, 0.0521)), # header search icon, 44 square (CardSearchIcon)
    "card-scan": ("collection", (0.8769, 0.0954, 0.1128, 0.0521)),   # the + (collection-add-phone), reaches
    "cand-tour": ("account", (0.0513, 0.7156, 0.8974, 0.0634)),      # brief's first-listed candidate for 1
}


def window(theme, key, w, accent=None, bg=None, label=None):
    """EntryFrame: the screen's frame in a 3:2 window, moved so the box is in view, the box haloed, the rest dimmed."""
    screen, (x, y, bw, bh) = BOX[key]
    win = 2 / 3
    centre = (y + bh / 2) * RATIO
    off = min(max(centre - win / 2, 0), RATIO - win)
    t = next(t for t in THEMES if t[0] == theme)
    acc, bgc = accent or t[2], bg or t[3]
    halo = (f'<span class="halo" style="left:{x*w:.1f}px;top:{(y*RATIO-off)*w:.1f}px;width:{bw*w:.1f}px;height:{bh*RATIO*w:.1f}px;'
            f'box-shadow:0 0 0 2px {hexa(acc,.75)},0 0 0 6px {hexa(acc,.2)},0 0 0 2000px {hexa(bgc,.28)}"></span>')
    lab = f'<span class="wlab">{label}</span>' if label else ""
    return (f'<div class="frm" style="width:{w}px;height:{w*win:.1f}px"><img src="{shot(theme, screen)}" alt="" '
            f'style="top:{-off*w:.1f}px;height:{RATIO*w:.1f}px">{halo}{lab}</div>')


def six(key, w=250):
    cells = "".join(f'<div class="six-c">{window(t, key, w)}<span class="m six-l">{n} · {t}</span></div>' for t, n, *_ in THEMES)
    return f'<div class="six">{cells}</div>'


# ---- the shell, as shipped with HELP_PANEL_ENABLED and CARD_SEARCH_ENABLED on, identity Sam ---------------------------
def header():
    return (f'<div class="mhd">{wordmark()}<div class="clu"><span class="ic">{ICONS["search"]}</span>'
            f'<span class="ic">{ICONS["help"]}</span><span class="av">S</span></div></div>')


def tabbar():
    return '<div class="tbar">' + "".join(f'<span>{ICONS[k]}{l}</span>' for k, l in TABS) + "</div>"


def phone(inner, check):
    return f'<div class="ph" data-check="{check}">{header()}<div class="pb">{inner}</div>{tabbar()}</div>'


def rail():
    slots = "".join(f'<span class="sl">{ICONS[k]}</span>' for k, _ in TABS)
    return (f'<div class="rail"><div class="lg"><span class="dia"><i></i><i></i><i></i></span>99</div>'
            f'<span class="sl">{ICONS["search"]}</span>{slots}'
            f'<span class="sl" style="margin-top:auto;color:var(--fg-faint)">{ICONS["help"]}</span><span class="ra" style="margin-top:6px">S</span></div>')


def desk(inner, check):
    return f'<div class="dk" data-check="{check}">{rail()}<div class="main">{inner}</div></div>'


# ---- the Reference ------------------------------------------------------------------------------------------------------
SCREENS = [("home", "Home", "/", 3), ("collection", "Collection · Cards", "/collection", 8), ("card-details", "Card details", "any card", 3),
           ("sets", "Collection · Sets", "/collection/sets", 1), ("proxies", "Collection · Proxies", "/collection/proxies", 1),
           ("history", "Collection · History", "/collection/history", 1), ("wishlist", "Collection · Wishlist", "/collection/wishlist", 1),
           ("upload", "Upload a file", "/collection/replace", 4), ("commanders", "Commanders", "/commanders", 4), ("discover", "Discover", "/discover", 1),
           ("new-deck", "New deck and precons", "/decks/new", 6), ("decks", "Decks", "/decks", 4), ("deck-your-deck", "A deck · Your deck", "a deck", 13),
           ("deck-shopping", "A deck · Shopping", "a deck", 5), ("deck-stats", "A deck · Stats", "a deck", 1), ("deck-notes", "A deck · Notes", "a deck", 1),
           ("deck-analysis", "A deck · Analysis", "a deck", 5), ("deck-games", "A deck · Games", "a deck", 3), ("deck-versions", "A deck · Versions", "a deck", 2),
           ("friends", "Friends", "/friends", 1), ("account", "Account menu", "everywhere", 1)]
ADDED = {"home": 1, "collection": 2, "friends": 2, "account": 1}
TOTAL = 69 + 6


def count(n):
    return "1 entry" if n == 1 else f"{n} entries"


def idx(on):
    rows = "".join(f'<a href="#" class="{"on" if k == on else ""}"><span>{n}</span><small>{c + ADDED.get(k, 0)}</small></a>' for k, n, _, c in SCREENS)
    return (f'<nav class="idx"><span class="h">Screens</span>{rows}<a href="#" style="margin-top:8px;border-top:1px solid var(--border);'
            f'border-radius:0;padding-top:8px"><span>How it works</span><small>9</small></a></nav>')


def search_field(phone_=False):
    return (f'<div class="sfld{" ph-s" if phone_ else ""}">{ICONS["search"].replace("20", "16")}<span>Find an entry</span></div>')


def head_desk():
    return ('<div class="ab-head"><h1 class="dsp" style="font-size:34px;font-weight:600">About The 99</h1>'
            '<p style="color:var(--fg-body);font-size:15px">Every entry, by the screen it lives on. '
            '<a style="font-weight:600;font-size:14.5px">Take the tour →</a></p>'
            f'<div class="abtabs"><span>Tools<small>14</small></span><span class="on">Reference<small>{TOTAL}</small></span>'
            '<span class="hint">Every screen has a <b>?</b> for its own entries</span></div></div>')


def caption_html(cap):
    out = []
    for block in cap.split("\n\n"):
        lines = [l.strip() for l in block.strip().split("\n")]
        if all(l.startswith("- ") for l in lines):
            out.append("<ul>" + "".join(f"<li>{l[2:]}</li>" for l in lines) + "</ul>")
        else:
            out.append(f"<p>{' '.join(lines)}</p>")
    return '<div class="cp">' + "".join(out) + "</div>"


def keys_html(keys):
    return '<ol class="keys">' + "".join(f"<li><i>{i+1}</i><span>{k}</span></li>" for i, k in enumerate(keys)) + "</ol>"


def open_body(e, w, theme="kamigawa"):
    return (f'<div class="eob{" eob-ph" if w > 340 else ""}">{window(theme, e["id"], w)}'
            f'<div class="etx">{caption_html(e["caption"])}{keys_html(e["keys"])}</div></div>')


def ref_desk(e):
    screen = e["screen"]
    sname, where = next((n, wh) for k, n, wh, _ in SCREENS if k == screen)
    n = next(c for k, _, _, c in SCREENS if k == screen) + ADDED[screen]
    rows = ""
    for r in e["rows"]:
        if r == "OPEN":
            rows += (f'<div class="eo new-row"><div class="er"><span class="t">{e["title"]}</span><span class="f"></span><span class="mk"></span>'
                     f'<span class="cv">⌃</span></div>{open_body(e, 330)}</div>')
        else:
            t, f, isnew = r
            rows += (f'<div class="er{" new-row" if isnew else ""}"><span class="t">{t}</span><span class="f">{f}</span>'
                     f'<span class="mk"></span><span class="cv">⌄</span></div>')
    content = (search_field() + f'<div class="scr"><h2>{sname}</h2><span>{where} · {count(n)}</span></div>' + rows)
    body = head_desk() + f'<div class="ref"><div class="refl">{content}</div>{idx(screen)}</div>'
    return desk(body, f'{e["id"]}-desk')


def ref_phone(e):
    screen = e["screen"]
    sname = next(n for k, n, _, _ in SCREENS if k == screen)
    n = next(c for k, _, _, c in SCREENS if k == screen) + ADDED[screen]
    rows = ""
    for r in e["rows"]:
        if r == "OPEN":
            rows += (f'<div class="pe new-row" style="gap:12px"><span class="t">{e["title"]}</span>{open_body(e, 358)}</div>')
        else:
            t, f, isnew = r
            rows += f'<div class="pe{" new-row" if isnew else ""}"><span class="t">{t}</span><span class="f">{f}</span></div>'
    inner = ('<div style="padding:24px 16px 0"><h1 class="dsp" style="margin:0;font-size:27px;font-weight:600">About The 99</h1>'
             '<p style="margin:6px 0 0;font-size:14.5px;line-height:1.5;color:var(--fg-body)">Every entry, by the screen it lives on. '
             '<a style="font-weight:600">Take the tour →</a></p>'
             f'<div class="abtabs" style="margin-top:16px"><span>Tools<small>14</small></span><span class="on">Reference<small>{TOTAL}</small></span></div></div>'
             f'<div style="padding:16px 16px 22px">{search_field(True)}<div class="pr" style="margin-top:12px"><b>{sname}</b><span>{n} ⌃</span></div>{rows}</div>')
    return phone(inner, f'{e["id"]}-phone')


EXTRA_CSS = r"""
.frm{position:relative;flex:none;overflow:hidden;border-radius:10px;border:1px solid var(--border);background:var(--bg);align-self:flex-start}
.frm img{position:absolute;left:0;width:100%;display:block;max-width:none}
.halo{position:absolute;border-radius:8px;pointer-events:none}
.wlab{position:absolute;left:8px;bottom:8px;font:600 9.5px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:#0E0F14;background:#E0913C;border-radius:4px;padding:2px 6px}
.six{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:18px}
.six-c{display:flex;flex-direction:column;gap:8px}
.six-l{font-size:10.5px;color:var(--fg-faint);letter-spacing:.04em}
.sfld{display:flex;align-items:center;gap:10px;height:46px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface-sunken);padding:0 14px;color:var(--fg-faint);font-size:15px}
.ph .main{display:none}
.abtabs .hint{margin-left:auto;padding:0 0 10px;font-size:13px;color:var(--fg-muted);border:0}
.abtabs .hint b{display:inline-flex;width:20px;height:20px;align-items:center;justify-content:center;border-radius:6px;border:1px solid var(--border-strong);font:500 11px 'IBM Plex Mono',monospace;color:var(--fg)}
.ab-head{padding:40px 56px 0}
.ref{padding:28px 56px 64px}
.refl{gap:14px}
.eob{display:flex;gap:18px;padding:4px 0 18px}
.eob-ph{flex-direction:column}
.new-row{background:rgba(255,77,154,.06);box-shadow:inset 3px 0 0 rgba(255,77,154,.0);outline:1.5px dashed rgba(255,77,154,.55);outline-offset:-1px;border-radius:6px}
.er.new-row{padding-left:8px;padding-right:8px}
.eo.new-row{padding:0 8px}
.pe.new-row{padding-left:8px;padding-right:8px}
.call{display:grid;grid-template-columns:330px minmax(0,1fr);gap:22px;padding:18px;border:1px solid var(--border-strong);border-radius:12px;background:#111319}
.call h4{margin:0 0 4px;font:700 17px 'Chakra Petch',sans-serif}
.call .id{font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint);margin-bottom:8px;display:block}
.call p{margin:0 0 6px;font-size:13px;line-height:1.6;color:var(--fg-body);text-wrap:pretty}
.call p b{color:var(--fg)}
.pill{display:inline-block;font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.06em;border-radius:4px;padding:2px 6px;margin-right:6px}
.pill.pick{background:var(--accent);color:#0E0F14}
.pill.eng{background:#2a2d38;color:var(--fg-body)}
.tbl{width:100%;border-collapse:collapse;font-size:12.5px;color:var(--fg-body)}
.tbl th{text-align:left;font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint);padding:6px 10px;border-bottom:1px solid var(--border-strong)}
.tbl td{padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:top;line-height:1.5}
.tbl td code{font-size:11px}
.cmp{display:flex;gap:26px;flex-wrap:wrap;align-items:flex-start}
.cmp>div{display:flex;flex-direction:column;gap:8px;width:330px}
.cmp p{margin:0;font-size:12.5px;line-height:1.55;color:var(--fg-muted)}
.cmp p b{color:var(--fg)}
"""


def doc(title, body, width):
    d = kit.doc(title, body, width)
    return d.replace("</style>", EXTRA_CSS + "</style>", 1)
