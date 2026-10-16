from kit import *
from b_sheet import sheet, sheet_head, under, RESULTS_IN
from b_rail import coll_page, fly, fld, dres

OCSS = """<style>
.g{position:relative;flex:none;display:flex;align-items:center;justify-content:center}
.bc{position:absolute;border-radius:8px;box-sizing:border-box;box-shadow:0 10px 24px rgba(0,0,0,.5)}
.bc.back{background:#20222A;border:1.5px solid #262A35}
.bc.mid{background:#1B1D25;border:1.5px solid #343843}
.bc.front{background:color-mix(in srgb,#FF4D9A 14%,#16181F);border:1.5px solid #FF4D9A;display:flex;align-items:center;justify-content:center;font:700 26px 'Chakra Petch',sans-serif;color:#FF4D9A}
.lens{position:absolute;border-radius:50%;border:3px solid #FF4D9A;background:rgba(14,15,20,.35);box-shadow:0 0 0 1px rgba(0,0,0,.4),0 10px 24px rgba(0,0,0,.45)}
.handle{position:absolute;height:5px;border-radius:3px;background:#FF4D9A;transform-origin:left center}
.nbar{position:absolute;border-radius:4px;background:color-mix(in srgb,#FF4D9A 22%,#16181F);display:flex;align-items:center;padding:0 6px;font:600 10px 'IBM Plex Sans',sans-serif;color:#E6E8F0;white-space:nowrap;overflow:hidden}
.nbar i{display:inline-block;width:1.5px;height:11px;background:#FF4D9A;margin-left:1px}
.line{position:absolute;height:5px;border-radius:3px;background:#262A35}
.osum{display:flex;flex-direction:column;gap:6px}
.osum b{font:700 15px 'Chakra Petch',sans-serif}
</style>"""


def fan(scale=1.0):
    s = scale
    return (f'<div class="g" style="width:{200*s}px;height:{150*s}px">'
            f'<span class="bc back" style="left:{31*s}px;top:{14*s}px;width:{70*s}px;height:{100*s}px;transform:rotate(-18deg)"></span>'
            f'<span class="bc mid" style="left:{65*s}px;top:{14*s}px;width:{70*s}px;height:{100*s}px"></span>'
            f'<span class="bc front" style="left:{99*s}px;top:{14*s}px;width:{70*s}px;height:{100*s}px;transform:rotate(18deg);font-size:{26*s}px">99</span>')


def g_lens(s=1.0):
    # A: the brand fan, a lens over the front card
    return (fan(s) +
            f'<span class="lens" style="left:{116*s}px;top:{66*s}px;width:{56*s}px;height:{56*s}px;border-width:{3*s}px"></span>'
            f'<span class="handle" style="left:{164*s}px;top:{115*s}px;width:{30*s}px;height:{5*s}px;transform:rotate(45deg)"></span></div>')


def g_name(s=1.0):
    # B: one blank card, its name bar being typed
    return (f'<div class="g" style="width:{200*s}px;height:{150*s}px">'
            f'<span class="bc mid" style="left:{56*s}px;top:{6*s}px;width:{88*s}px;height:{124*s}px;transform:rotate(-4deg)"></span>'
            f'<span class="bc front" style="left:{60*s}px;top:{4*s}px;width:{88*s}px;height:{124*s}px;font-size:{30*s}px;padding-top:{18*s}px">99</span>'
            f'<span class="nbar" style="left:{67*s}px;top:{12*s}px;width:{74*s}px;height:{16*s}px;font-size:{10*s}px">Trost<i></i></span>'
            f'<span class="line" style="left:{72*s}px;top:{100*s}px;width:{50*s}px;height:{4*s}px"></span>'
            f'<span class="line" style="left:{72*s}px;top:{110*s}px;width:{36*s}px;height:{4*s}px"></span></div>')


def g_pull(s=1.0):
    # C: a stack, one card lifted out of it
    st = "".join(f'<span class="bc {"back" if i % 2 else "mid"}" style="left:{(52 + i*3)*s}px;top:{(40 - i*2)*s}px;width:{66*s}px;height:{94*s}px"></span>' for i in range(4))
    return (f'<div class="g" style="width:{200*s}px;height:{150*s}px">{st}'
            f'<span class="bc front" style="left:{104*s}px;top:{2*s}px;width:{70*s}px;height:{100*s}px;transform:rotate(12deg);font-size:{26*s}px">99</span>'
            f'<span style="position:absolute;left:{92*s}px;top:{98*s}px;width:{14*s}px;height:{2*s}px;background:#FF4D9A;opacity:.6;transform:rotate(-40deg)"></span>'
            f'<span style="position:absolute;left:{84*s}px;top:{84*s}px;width:{10*s}px;height:{2*s}px;background:#FF4D9A;opacity:.35;transform:rotate(-40deg)"></span></div>')


def g_inlens(s=1.0):
    # D: a big lens with a blank 99 card inside it
    return (f'<div class="g" style="width:{200*s}px;height:{150*s}px">'
            f'<span class="lens" style="left:{46*s}px;top:{4*s}px;width:{118*s}px;height:{118*s}px;border-width:{4*s}px;overflow:hidden;background:#12141B">'
            f'<span class="bc front" style="left:{31*s}px;top:{14*s}px;width:{56*s}px;height:{80*s}px;transform:rotate(-8deg);font-size:{22*s}px">99</span></span>'
            f'<span class="handle" style="left:{150*s}px;top:{108*s}px;width:{38*s}px;height:{7*s}px;transform:rotate(45deg)"></span></div>')


OPTS = [
    ("A", "The fan, under a lens", g_lens, "The brand fan from the Games tab and the scan screens, with a pink lens over the 99 card. Closest to the family: it reads as “cards” first, “look up” second."),
    ("B", "A name being typed", g_name, "One blank card whose name bar is being typed into, with the field’s pink caret. It says the one thing the search does: names only (lock 2)."),
    ("C", "One card lifted out", g_pull, "A stack with one 99 card pulled up out of it. The idea is the catalog and the one you want, with a little motion and tilt."),
    ("D", "A card inside the lens", g_inlens, "A big lens holding one tilted blank card. The plainest “search” of the four, and the furthest from the fan."),
]


def empty_phone(g):
    return phone(under() + sheet(sheet_head(), f'<div class="sempty">{g}<b>Look up any card</b><p>Type part of a card’s name to see what it does, whether you own it, and which of your decks hold it.</p></div>'))


def rail_v(kind):
    slots = "".join(f'<span class="rsl{" on" if n == "Collection" else ""}">{nav_icon(n)}</span>' for n in ["Home", "Collection", "Commanders", "Discover", "Decks"])
    if kind == "A":
        top = (f'<span class="rsl new" style="color:var(--fg-muted)" aria-label="Search all cards">{ico_search(19, 1.5)}</span>'
               '<span style="width:24px;height:1px;background:var(--border-strong);margin:6px 0 10px"></span>')
    elif kind == "B":
        top = f'<span class="rsrch new" style="height:40px">{ico_search(17)}</span>'
    else:
        top = f'<span class="rsrch">{ico_search(17)}<small>⌘K</small></span>'
    return (f'<div class="rail"><span class="mk">{crown(6, 8.5, 3)}<span class="nn">99</span></span>{top}{slots}'
            '<span class="rfoot"><span class="rav">HH</span></span></div>')


def tag(y=74):
    return (f'<span style="position:absolute;left:72px;top:{y}px;z-index:9;height:28px;padding:0 10px;border-radius:7px;background:var(--surface-raised);'
            'border:1px solid var(--border-strong);display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--fg);box-shadow:0 10px 24px rgba(0,0,0,.45)">'
            'Search all cards<span style="font:10.5px IBM Plex Mono,monospace;color:var(--fg-faint)">⌘K</span></span>')


def railcrop(kind, overlay=""):
    return (f'<div style="width:420px;height:420px;position:relative;overflow:hidden;border:1px solid var(--border-strong);border-radius:12px;background:var(--bg);display:flex">'
            f'{rail_v(kind)}<div style="flex:1;padding:28px 0 0 30px"><div style="font:700 30px Chakra Petch,sans-serif">Collection</div>'
            f'<div style="font:13px IBM Plex Mono,monospace;color:var(--fg-faint);margin-top:6px">1,284 cards</div></div>{overlay}</div>')


def desk_open():
    field = ('<div class="dfld ph0">' + ico_search(18) + '<span class="caret" style="margin-left:-2px"></span><span>Search all cards</span>'
             '<span class="esc" style="margin-left:auto">⌘K</span></div>')
    rail = rail_v("A")
    page = coll_page()
    panel = dres('<div class="hd">10 cards</div>' + "".join(row(k, "in", first=(i == 0), cls=("act" if i == 0 else "")) for i, k in enumerate(RESULTS_IN[:4]))
                 + '<div class="ft"><span>↑ ↓ to move · ↵ to open · esc to close</span><span>⌘K opens this from anywhere</span></div>')
    f2 = field.replace('<span>Search all cards</span>', '<span style="color:var(--fg)">in</span><span class="caret"></span>').replace('<span class="esc" style="margin-left:auto">⌘K</span>', '<span class="clr">✕</span>')
    return f'<div class="dk" data-check="desktop">{rail}{page}<div class="fly new" style="outline-offset:6px;top:62px">{f2}{panel}</div></div>'


def board():
    ph = "".join(frame(f"{k} · {t}", empty_phone(fn(1.0)), c) for k, t, fn, c in OPTS)
    small = "".join(
        f'<div class="fr" style="width:540px"><span class="k">{k} · desktop, in the field’s panel</span>'
        f'<div class="dres" style="width:540px"><div style="display:flex;gap:18px;align-items:center;padding:14px 18px">{fn(0.62)}'
        '<div class="msg" style="padding:0"><b>Look up any card</b><p>Type part of a card’s name to see what it does, whether you own it, and which of your decks hold it.</p></div></div></div></div>'
        for k, t, fn, c in OPTS)
    rails = (
        frame("R-A · recommended · a plain rail slot", railcrop("A", tag(66)),
              "Search becomes a slot like the five below it: the 19px glyph in a 38px square, above Home, with a short rule between. No well, no hint. Hover shows the rail’s own name tag, which carries <b>⌘K</b>, the way every slot names itself.", 420)
        + frame("R-B · the well, without the hint", railcrop("B"),
                "Keeps the sunken field shape from R1, glyph only. It still reads as “a field”, but it’s a second shape in a rail of squares.", 420)
        + frame("R-C · R1 as drawn, for comparison", railcrop("C"),
                "The well with ⌘K under the glyph. The hint is the disruption: the only text in the rail besides the mark.", 420)
    )
    body = (OCSS +
        '<div class="bh"><span class="k">Card search · R2 options · for Hugh · 2026-10-16</span><h2>Empty-state graphic and the rail’s search slot</h2>'
        '<p class="cap" style="max-width:1700px">Two notes from R1. The empty state drops real card art for a graphic in the same family as the Games tab’s fan and the scanner’s mark: blank cards, the pink 99, no art. '
        'And the rail’s ⌘K hint comes off. Nothing here is picked until you say.</p></div>'
        '<div class="sec"><h3>1 · The empty-state graphic (phone, S1)</h3><div class="frames">' + ph + '</div></div>'
        '<div class="sec"><h3>… and each at desktop size, in the field’s panel (D2n)</h3><div class="frames">' + small + '</div></div>'
        '<div class="sec"><h3>2 · The rail: is ⌘K worth showing? No.</h3>'
        '<p class="cap" style="max-width:1500px">The shortcut is for people who already know it, and they learn it once. It doesn’t need a permanent place in a 62px rail. It still lives in three places a keyboard reader looks: the slot’s name tag on hover, the open field (where <b>⌘K</b> sits at its right edge until you type), and the About entry’s key line.</p>'
        '<div class="frames">' + rails + '</div>'
        + frame("R-A · opened with ⌘K, the hint inside the field", desk_open(),
                "Opened, the field carries <b>⌘K</b> at its right edge until typing starts, and the panel’s foot line says <b>⌘K opens this from anywhere</b>. That’s where a reader who used the mouse first finds the shortcut.", 1300)
        + '</div>'
    )
    return doc("Card search R2 options", body, 2520, 3200)
