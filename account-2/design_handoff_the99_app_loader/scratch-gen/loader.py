"""Generator for The 99 app loader canvas. Writes project/*.dc.html + canvas.json under ./out."""
import json, os, sys, datetime

OUT = os.path.join(os.path.dirname(__file__), "out", "project")
os.makedirs(OUT, exist_ok=True)

BLOB = {
    "amonkhet": "/_blob/83c7ec505435ed06e0d2baca6525ff6c",
    "kamigawa": "/_blob/ea6b6878e302d39ef2d65cfed0ded295",
    "eldraine": "/_blob/5308c3244bd6ab64e8943a281bab7ca7",
}
LOCAL = os.environ.get("LOCAL")  # for local render: replace blob urls with file paths

# Low Sun (amonkhet) tokens
BG = "#14110E"; SURF = "#1E1A15"; RAISED = "#211D18"; ELEV = "#29241F"
BORDER = "#2B241B"; BSTRONG = "#3A3229"; FG = "#EDE6D8"; FAINT = "#948B78"
ACC = "#CF8745"; ACC_H = "#DE9757"; ACC_S = "#AB6E37"; ACC_SH = "#6B482A"
LIT = "#F6CF99"  # the lit diamond (A)
FOIL = ["#FF8CC6", "#FFD66E", "#8FEBD2", "#8CB4FF", "#C79BFF"]

LOOP = 3000
K = 4.285  # px per icon unit at lockup scale 1
EXPO = "cubic-bezier(.16,1,.3,1)"
INOUT = "cubic-bezier(.65,0,.35,1)"
BACK = "cubic-bezier(.34,1.56,.64,1)"

NINE = ("M116 -38 112 -31Q219 2 279.5 43.0Q340 84 368.0 136.0Q396 188 403.0 253.5Q410 319 410 402Q410 485 406.0 540.5"
        "Q402 596 386.5 623.5Q371 651 334 651Q297 651 278.0 626.5Q259 602 252.0 563.0Q245 524 245 478Q245 421 251.5 389.0"
        "Q258 357 269.5 341.5Q281 326 295 320Q318 311 337.5 317.0Q357 323 370 331L377 323Q363 292 333.0 272.0Q303 252 264.0 246.0"
        "Q225 240 185.0 249.5Q145 259 111.5 285.5Q78 312 58.0 357.0Q38 402 40 467Q42 534 73.0 589.0Q104 644 168.0 677.0"
        "Q232 710 331 711Q478 713 556.5 633.0Q635 553 635 381Q635 274 603.0 189.5Q571 105 506.0 49.0Q441 -7 344.0 -30.5Q247 -54 116 -38Z")

# icon geometry (icon.svg units)
DIAMONDS = [(15.697, 15.393, 7.381), (32.0, 15.393, 10.456), (48.303, 15.393, 7.381)]  # cx, cy, side


def kf(name, frames, loop=LOOP):
    """frames: list of (ms, css, ease_to_next or None)."""
    parts = []
    if frames[0][0] != 0:
        frames = [(0, frames[0][1], None)] + frames
    if frames[-1][0] != loop:
        frames = frames + [(loop, frames[-1][1], None)]
    for t, css, ease in frames:
        e = f"animation-timing-function:{ease};" if ease else ""
        parts.append(f"{t / loop * 100:.3f}%{{{css}{e}}}")
    return f"@keyframes {name}{{{''.join(parts)}}}"


def anim(name):
    return f"animation:{name} var(--dur) linear var(--del) infinite both;animation-play-state:var(--ps);"


def poly(cx, cy, side, fill, extra=""):
    h = side / 2 ** 0.5
    pts = f"{cx:.3f},{cy - h:.3f} {cx + h:.3f},{cy:.3f} {cx:.3f},{cy + h:.3f} {cx - h:.3f},{cy:.3f}"
    return f'<polygon points="{pts}" fill="{fill}" style="transform-box:fill-box;transform-origin:center;{extra}"></polygon>'


def crown_svg(anims=("", "", ""), fills=(ACC, ACC, ACC)):
    """Crown in lockup coordinates (origin = crown centre), at scale 1."""
    w, h = 48 * K, 17 * K
    left, top = -24 * K, (7 - 15.393) * K
    # order: left small, right small, centre large (anims tuple order: left, centre, right)
    ps = "".join(poly(cx, cy, s, fills[i], anims[i]) for i, (cx, cy, s) in enumerate(DIAMONDS))
    return (f'<svg aria-hidden="true" viewBox="8 7 48 17" width="{w:.1f}" height="{h:.1f}" '
            f'style="position:absolute;left:{left:.2f}px;top:{top:.2f}px;overflow:visible">{ps}</svg>')


NUM_W, NUM_H = 40 * K, 23.5 * K
NUM_LEFT, NUM_TOP = -20 * K, (34.456 - 21.849) * K
NUM_ORIGIN = f"{20 * K:.2f}px {21.849 * K:.2f}px"


def numeral_svg(extra_svg="", path_style=""):
    return (f'<svg aria-hidden="true" viewBox="12 28 40 23.5" width="{NUM_W:.1f}" height="{NUM_H:.1f}" style="display:block;overflow:visible">'
            f'<g style="{path_style}"><path transform="translate(12.903 49.849) scale(0.028293 -0.028293)" fill="{FG}" d="{NINE}"></path>'
            f'<path transform="translate(32.000 49.849) scale(0.028293 -0.028293)" fill="{FG}" d="{NINE}"></path></g>{extra_svg}</svg>')


def numeral_div(style_extra="", extra_svg="", path_style=""):
    return (f'<div style="position:absolute;left:{NUM_LEFT:.2f}px;top:{NUM_TOP:.2f}px;width:{NUM_W:.1f}px;height:{NUM_H:.1f}px;'
            f'transform-origin:{NUM_ORIGIN};{style_extra}">{numeral_svg(extra_svg, path_style)}</div>')


# shared lockup motion: icon (0) -> grows (110-360) -> holds -> flies to header (700-880)
ICON = "translate(195px,388.8px) scale(.467)"
PEAK = "translate(195px,330px) scale(1)"
HEAD = "translate(66.75px,24.75px) scale(.156)"
LK_T = [(0, ICON, None), (110, ICON, EXPO), (360, PEAK, None), (680, PEAK, INOUT), (850, HEAD, None)]
LK_O = [(0, "opacity:1;", None), (900, "opacity:1;", "ease-out"), (980, "opacity:0;", None)]
NUM_LAND = [(0, "transform:none;", None), (680, "transform:none;", INOUT), (850, "transform:translateY(76.3px) scale(1.2);", None)]
PAGE = [(0, "opacity:0;transform:translateY(10px);", None), (770, "opacity:0;transform:translateY(10px);", EXPO),
        (950, "opacity:1;transform:translateY(0);", None)]


def tf(frames):
    return [(t, f"transform:{v};" if not v.startswith(("transform", "opacity")) else v, e) for t, v, e in frames]


FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?'
         'family=Cinzel:wght@700;800;900&amp;family=IBM+Plex+Mono:wght@400;500&amp;family=IBM+Plex+Sans:wght@400;500;600&amp;display=swap" rel="stylesheet">')


def page_doc(title, body, w=390, h=844):
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
{FONTS}
<style>
body{{margin:0;background:{BG}}}
*{{box-sizing:border-box}}
</style>
</helmet>
{body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
"""


def img(theme):
    src = BLOB[theme]
    if LOCAL:
        src = os.path.join(LOCAL, f"home-{theme}.webp")
    return src


def phone(css, inner, mode, theme="amonkhet", speed=1):
    if mode == "play":
        v = f"--dur:{LOOP * speed}ms;--del:0ms;--ps:running;"
    else:
        v = f"--dur:{LOOP}ms;--del:-{mode}ms;--ps:paused;"
    return (f'<div style="position:relative;width:390px;height:844px;overflow:hidden;background:{BG};'
            f'font-family:\'IBM Plex Sans\',system-ui,sans-serif;color:{FG};{v}">'
            f'<style>{css}</style>'
            f'<img src="{img(theme)}" alt="Home, as the app opens" width="390" height="844" '
            f'style="position:absolute;inset:0;width:390px;height:844px;display:block;{anim("page")}">'
            f'{inner}</div>')


# ---------------------------------------------------------------- Option A: Crown lights
def option_a():
    css = [kf("page", PAGE), kf("lkt", tf(LK_T)), kf("lko", LK_O), kf("numl", NUM_LAND)]
    # diamonds light: left 330, right 400, centre 470
    def light(name, t0, hold=0):
        return kf(name, [(0, f"fill:{ACC};transform:scale(1);", None), (t0, f"fill:{ACC};transform:scale(1);", "ease-out"),
                         (t0 + 70, f"fill:{LIT};transform:scale(1.3);", None),
                         (t0 + 70 + hold, f"fill:{LIT};transform:scale(1.3);", "ease-in-out"),
                         (t0 + 220 + hold, f"fill:{ACC};transform:scale(1);", None)])
    css += [light("dl", 330), light("dr", 400), light("dc", 470, hold=80)]
    css.append(kf("halo", [(0, "opacity:0;transform:scale(.8);", None), (480, "opacity:0;transform:scale(.8);", "ease-out"),
                           (560, "opacity:1;transform:scale(1.2);", "ease-in-out"), (720, "opacity:0;transform:scale(1);", None)]))
    css.append(kf("word", [(0, "opacity:0;transform:translateY(14px);", None), (400, "opacity:0;transform:translateY(14px);", EXPO),
                           (580, "opacity:1;transform:translateY(0);", None), (660, "opacity:1;transform:translateY(0);", "ease-in"),
                           (720, "opacity:0;transform:translateY(-6px);", None)]))
    halo = (f'<div style="position:absolute;left:-130px;top:-130px;width:260px;height:260px;border-radius:50%;'
            f'background:radial-gradient(circle,rgba(246,207,153,.55) 0%,rgba(207,135,69,.22) 38%,rgba(207,135,69,0) 70%);{anim("halo")}"></div>')
    crown = crown_svg(anims=(anim("dl"), anim("dc"), anim("dr")))
    lock = (f'<div style="position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;{anim("lkt")}">'
            f'<div style="position:absolute;left:0;top:0;{anim("lko")}">{halo}{crown}{numeral_div(anim("numl"))}</div></div>')
    word = (f'<div style="position:absolute;left:0;right:0;top:506px;text-align:center;font-family:\'IBM Plex Mono\',monospace;'
            f'font-size:11px;letter-spacing:0.4em;color:{ACC};{anim("word")}">THE NINETY-NINE</div>')
    return "".join(css), lock + word


# ---------------------------------------------------------------- Option B: The flip
CARD_W, CARD_H = 260, 363


def option_b():
    css = [kf("page", PAGE), kf("numl", NUM_LAND)]
    # card wrapper carries the lockup copies until 700; the flyer takes over at 700
    def cw(tx, ty, s, rz, ry):
        return f"transform:translate({tx}px,{ty}px) perspective(1100px) rotateZ({rz}deg) rotateY({ry}deg) scale({s});"
    css.append(kf("card", [(0, cw(195, 417.3, .467, 0, 0), None), (110, cw(195, 417.3, .467, 0, 0), EXPO),
                           (360, cw(195, 391, 1, -5, 0), None), (390, cw(195, 391, 1, -5, 0), INOUT),
                           (650, cw(195, 391, 1, 0, 180), None), (690, cw(195, 391, 1, 0, 180), "ease-in"),
                           (810, cw(195, 391, .94, 0, 180), None)]))
    css.append(kf("cardo", [(0, "opacity:1;", None), (690, "opacity:1;", "ease-in"), (790, "opacity:0;", None)]))
    css.append(kf("backbg", [(0, "opacity:0;", None), (110, "opacity:0;", "ease-out"), (300, "opacity:1;", None)]))
    css.append(kf("glint", [(0, "transform:translateX(-120%);", None), (600, "transform:translateX(-120%);", INOUT),
                            (860, "transform:translateX(120%);", None)]))
    css.append(kf("lkt", tf([(0, PEAK, None), (690, PEAK, INOUT), (860, HEAD, None)])))
    css.append(kf("lko", [(0, "opacity:0;", "steps(1,end)"), (690, "opacity:1;", None), (900, "opacity:1;", "ease-out"), (980, "opacity:0;", None)]))
    css.append(kf("bside", [(0, "opacity:1;", "steps(1,end)"), (520, "opacity:0;", None)]))
    css.append(kf("fside", [(0, "opacity:0;", "steps(1,end)"), (520, "opacity:1;", None)]))
    cy = CARD_H / 2 - 61  # crown centre in card coords
    def lock_copy():
        return (f'<div style="position:absolute;left:{CARD_W / 2}px;top:{cy}px;width:0;height:0">'
                f'{crown_svg()}{numeral_div()}</div>')
    lattice = (f"background-color:{RAISED};background-image:repeating-linear-gradient(45deg,rgba(171,110,55,.16) 0 1px,transparent 1px 18px),"
               f"repeating-linear-gradient(-45deg,rgba(171,110,55,.16) 0 1px,transparent 1px 18px);")
    face_common = (f"position:absolute;left:0;top:0;width:{CARD_W}px;height:{CARD_H}px;border-radius:14px;"
                   "")
    back = (f'<div style="{face_common}{anim("bside")}">'
            f'<div style="position:absolute;inset:0;border-radius:14px;border:2px solid {ACC_S};{lattice}{anim("backbg")}">'
            f'<div style="position:absolute;inset:10px;border-radius:8px;border:1px solid {ACC_SH}"></div></div>'
            f'{lock_copy()}</div>')
    glint = ("linear-gradient(105deg,transparent 30%," + ",".join(f"{c}55" for c in FOIL) + ",transparent 70%)")
    face = (f'<div style="{face_common}{anim("fside")}transform:rotateY(180deg);overflow:hidden;border:2px solid {ACC};'
            f'background:radial-gradient(240px 200px at 50% 38%,rgba(207,135,69,.16),transparent 70%),{ELEV};">'
            f'<div style="position:absolute;inset:10px;border-radius:8px;border:1px solid {ACC_SH}"></div>'
            f'<div style="position:absolute;left:{CARD_W / 2 - 2}px;top:{cy - 2}px;width:0;height:0">{crown_svg()}{numeral_div()}</div>'
            f'<div style="position:absolute;left:0;right:0;bottom:30px;text-align:center;font-family:\'IBM Plex Mono\',monospace;'
            f'font-size:11px;letter-spacing:0.4em;color:{ACC}">THE NINETY-NINE</div>'
            f'<div style="position:absolute;inset:0;background:{glint};mix-blend-mode:screen;{anim("glint")}"></div></div>')
    card = (f'<div style="position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;transform-style:preserve-3d;{anim("card")}">'
            f'<div style="position:absolute;left:{-CARD_W / 2}px;top:{-CARD_H / 2}px;width:{CARD_W}px;height:{CARD_H}px;'
            f'transform-style:preserve-3d;{anim("cardo")}">{back}{face}</div></div>')
    lock = (f'<div style="position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;{anim("lkt")}">'
            f'<div style="position:absolute;left:0;top:0;{anim("lko")}">{crown_svg()}{numeral_div(anim("numl"))}</div></div>')
    return "".join(css), card + lock


# ---------------------------------------------------------------- Option C: Count to 99
COUNTS = ["01", "08", "17", "26", "33", "41", "50", "58", "66", "74", "82", "89", "95", "98", "99"]


def option_c():
    css = [kf("page", PAGE), kf("lkt", tf(LK_T)), kf("lko", LK_O), kf("numl", NUM_LAND)]
    n = len(COUNTS)
    t0, t1 = 300, 620
    slot = (t1 - t0) / (n - 1)
    times = [round(t0 + i * slot) for i in range(n)]
    t33, t66 = times[4], times[8]
    def drop(name, land):
        return kf(name, [(0, "opacity:1;transform:translateY(0);", None), (140, "opacity:1;transform:translateY(0);", "ease-in"),
                         (300, "opacity:0;transform:translateY(-7px);", None),
                         (land - 70, "opacity:0;transform:translateY(-7px);", BACK),
                         (land, "opacity:1;transform:translateY(0);", None)])
    css += [drop("dl", t33), drop("dr", t66), drop("dc", t1)]
    css.append(kf("halo", [(0, "opacity:0;transform:scale(.8);", None), (t1, "opacity:0;transform:scale(.8);", "ease-out"),
                           (t1 + 70, "opacity:1;transform:scale(1.2);", "ease-in-out"), (t1 + 200, "opacity:0;transform:scale(1);", None)]))
    # the real numeral hides while the count runs
    css.append(kf("real", [(0, "opacity:1;", "steps(1,end)"), (t0, "opacity:0;", "steps(1,end)"), (t1, "opacity:1;", None)]))
    texts = []
    for i, c in enumerate(COUNTS[:-1]):
        a, b = times[i], times[i + 1]
        css.append(kf(f"c{i}", [(0, "opacity:0;", "steps(1,end)"), (a, "opacity:1;", "steps(1,end)"), (b, "opacity:0;", None)]))
        texts.append(f'<text x="32" y="49.849" text-anchor="middle" font-family="Cinzel, serif" font-weight="900" font-size="28.293" '
                     f'fill="{FG}" style="{anim(f"c{i}")}">{c}</text>')
    halo = (f'<div style="position:absolute;left:-130px;top:-130px;width:260px;height:260px;border-radius:50%;'
            f'background:radial-gradient(circle,rgba(246,207,153,.5) 0%,rgba(207,135,69,.2) 38%,rgba(207,135,69,0) 70%);{anim("halo")}"></div>')
    crown = crown_svg(anims=(anim("dl"), anim("dc"), anim("dr")))
    num = numeral_div(anim("numl"), extra_svg="".join(texts), path_style=anim("real"))
    lock = (f'<div style="position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;{anim("lkt")}">'
            f'<div style="position:absolute;left:0;top:0;{anim("lko")}">{halo}{crown}{num}</div></div>')
    return "".join(css), lock


OPTIONS = {"a": option_a, "b": option_b, "c": option_c}
FRAMES = {
    "a": [(0, "0 ms · first paint matches the splash"), (240, "240 ms · the mark grows"), (410, "410 ms · the crown lights, left then right"),
          (540, "540 ms · the centre lights and glows"), (770, "770 ms · it flies to the header"), (1000, "1 s · Home")],
    "b": [(0, "0 ms · first paint matches the splash"), (260, "260 ms · a card grows under the mark, tilted"),
          (500, "500 ms · it flips"), (700, "700 ms · face up, foil glint crosses"), (770, "770 ms · the mark lifts off into the header"), (1000, "1 s · Home")],
    "c": [(0, "0 ms · first paint matches the splash"), (250, "250 ms · the crown lifts off"), (395, "395 ms · counting, 33: first diamond back"),
          (490, "490 ms · 66: second diamond back"), (640, "640 ms · 99: the crown is whole"), (770, "770 ms · it flies to the header"), (1000, "1 s · Home")],
}
NAMES = {"a": "Crown lights", "b": "The flip", "c": "Count to 99"}


# ---------------------------------------------------------------- In-app loop (LoadingScreen)
def crown_small(anims, fills=(ACC_S, ACC_S, ACC_S)):
    # Crown tone page: 8/11 gap 5 (diagonals) -> width 48.2, height 15.56
    s, l, g = 8 * 2 ** .5, 11 * 2 ** .5, 5
    cxs = [s / 2, s + g + l / 2, s + g + l + g + s / 2]
    W = s + g + l + g + s
    sides = [8, 11, 8]
    ps = "".join(poly(cxs[i], l / 2, sides[i], fills[i], anims[i]) for i in range(3))
    return f'<svg aria-hidden="true" viewBox="0 0 {W:.2f} {l:.2f}" width="{W:.2f}" height="{l:.2f}" style="display:block;overflow:visible">{ps}</svg>'


def inapp(opt, still=False):
    dur = {"a": 1200, "b": 1600, "c": 1400}[opt]
    v = f"--dur:{dur}ms;--del:0ms;--ps:{'paused' if still else 'running'};"
    css = []
    if opt == "a":
        def light(name, t0):
            return kf(name, [(0, f"fill:{ACC_S};transform:scale(1);", None), (t0, f"fill:{ACC_S};transform:scale(1);", "ease-out"),
                             (t0 + 180, f"fill:{ACC_H};transform:scale(1.25);", "ease-in-out"), (t0 + 480, f"fill:{ACC_S};transform:scale(1);", None)], dur)
        css += [light("dl", 0), light("dr", 200), light("dc", 400)]
        mark = crown_small((anim("dl"), anim("dc"), anim("dr")))
    elif opt == "b":
        css.append(kf("flip", [(0, "transform:perspective(500px) rotateZ(-4deg) rotateY(0deg);", None),
                               (500, "transform:perspective(500px) rotateZ(-4deg) rotateY(0deg);", INOUT),
                               (800, "transform:perspective(500px) rotateZ(4deg) rotateY(180deg);", None),
                               (1300, "transform:perspective(500px) rotateZ(4deg) rotateY(180deg);", INOUT),
                               (1600, "transform:perspective(500px) rotateZ(-4deg) rotateY(360deg);", None)], dur))
        side = ("position:absolute;inset:0;border-radius:5px;display:flex;align-items:center;justify-content:center;"
                "")
        lattice = (f"background-color:{RAISED};background-image:repeating-linear-gradient(45deg,rgba(171,110,55,.22) 0 1px,transparent 1px 7px),"
                   f"repeating-linear-gradient(-45deg,rgba(171,110,55,.22) 0 1px,transparent 1px 7px);")
        small = f'<div style="transform:scale(.62)">{crown_small(("", "", ""))}</div>'
        small_acc = f'<div style="transform:scale(.62)">{crown_small(("", "", ""), (ACC, ACC, ACC))}</div>'
        mark = (f'<div style="position:relative;width:46px;height:64px;transform-style:preserve-3d;{anim("flip")}">'
                f'<div style="{side}border:1.5px solid {ACC_S};{lattice}">{small}</div>'
                f'<div style="{side}transform:rotateY(180deg);border:1.5px solid {ACC};background:{ELEV}">{small_acc}</div></div>')
    else:
        def drop(name, t0):
            return kf(name, [(0, "opacity:0;transform:translateY(-6px);", None), (t0, "opacity:0;transform:translateY(-6px);", BACK),
                             (t0 + 220, "opacity:1;transform:translateY(0);", None), (1000, "opacity:1;transform:translateY(0);", "ease-in"),
                             (1250, "opacity:0;transform:translateY(-6px);", None)], dur)
        css += [drop("dl", 0), drop("dr", 160), drop("dc", 320)]
        mark = crown_small((anim("dl"), anim("dc"), anim("dr")))
    hdr = (f'<div style="position:absolute;left:0;top:0;width:390px;height:79px;overflow:hidden">'
           f'<img src="{img("amonkhet")}" alt="" width="390" height="844" style="display:block;width:390px;height:844px"></div>')
    nav = (f'<div style="position:absolute;left:0;bottom:0;width:390px;height:74px;overflow:hidden">'
           f'<img src="{img("amonkhet")}" alt="" width="390" height="844" style="position:absolute;left:0;bottom:0;display:block;width:390px;height:844px"></div>')
    body = (f'<div role="status" style="position:absolute;left:0;top:79px;width:390px;bottom:74px;display:flex;flex-direction:column;'
            f'align-items:center;justify-content:center;text-align:center;padding:40px;'
            f'background:radial-gradient(560px 320px at 50% 68%,rgba(207,135,69,.08),transparent 70%),{BG}">'
            f'{mark}'
            f'<h1 style="font-family:Cinzel,serif;font-weight:700;font-size:19px;margin:24px 0 0;color:{FG}">Setting the table</h1>'
            f'<p style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;margin:8px 0 0;color:{FAINT}">counting what you’ve got…</p></div>')
    return (f'<div style="position:relative;width:390px;height:844px;overflow:hidden;background:{BG};{v}">'
            f'<style>{"".join(css)}</style>{hdr}{body}{nav}</div>')


# ---------------------------------------------------------------- System splash
def splash(label):
    icon = (f'<svg role="img" aria-label="The 99" viewBox="0 0 64 64" width="128" height="128" style="position:absolute;left:131px;top:358px">'
            + "".join(poly(cx, cy, s, ACC) for cx, cy, s in DIAMONDS)
            + f'<path transform="translate(12.903 49.849) scale(0.028293 -0.028293)" fill="{FG}" d="{NINE}"></path>'
            f'<path transform="translate(32.000 49.849) scale(0.028293 -0.028293)" fill="{FG}" d="{NINE}"></path></svg>')
    return f'<div style="position:relative;width:390px;height:844px;overflow:hidden;background:{BG}">{icon}</div>'


# ---------------------------------------------------------------- write everything
boards, order, notes = {}, [], {}
COLW = 470


def add(fname, title, body, x, y, w=390, h=844):
    with open(os.path.join(OUT, fname), "w") as f:
        f.write(page_doc(title, body, w, h))
    boards[fname] = {"x": x, "y": y, "w": w, "h": h, "title": title}
    order.append(fname)


ROW_H = 844 + 420
# Row 0: before it plays
y0 = 0
notes["t_splash"] = {"x": 0, "y": y0 - 300, "text": "Before it plays: the system splash", "kind": "title1", "maxW": 1800}
add("Main.dc.html", "Android system splash", splash("android"), 0, y0)
add("splash-iphone.dc.html", "iPhone startup image (owed)", splash("iphone"), COLW, y0)
notes["n_splash"] = {"x": 2 * COLW, "y": y0, "w": 460, "fill": "blue", "text":
    "Both system splashes are one static picture for everyone: the plain icon on Low Sun’s ground (#14110E), the manifest’s "
    "background_color. Neither can move or read the saved theme. Android draws it from the manifest already. iPhone needs "
    "apple-touch-startup-image files (one per screen size); The 99 ships none today, so this one is owed. The app’s first "
    "paint is that same icon in the same spot, so the loader picks up with no jump."}
notes["n_where"] = {"x": 2 * COLW + 520, "y": y0, "w": 460, "fill": "gray", "text":
    "Where it plays (all three options): the installed app’s cold start only (display-mode standalone), never in a browser tab "
    "or on later navigations. It never holds the app: Home loads underneath the whole time, and the hand-off starts as soon "
    "as the mark lands. Every option runs in Low Sun so it continues the splash, then blends into the saved theme as Home "
    "fades up (the theme row of each option shows it). Reduced motion: a straight cut from the splash to Home. "
    "The boards marked ▶ play the real animation (looping, with a 2-second rest on Home); the frames after them are that same animation paused."}

y = ROW_H
for key in ["a", "b", "c"]:
    css, inner = OPTIONS[key]()
    nm = NAMES[key]
    letter = key.upper()
    notes[f"t_{key}"] = {"x": 0, "y": y - 300, "text": f"{letter} · {nm}", "kind": "title1", "maxW": 5600}
    x = 0
    add(f"{key}-play.dc.html", f"{letter} ▶ Real speed (loops)", phone(css, inner, "play"), x, y); x += COLW
    add(f"{key}-slow.dc.html", f"{letter} ▶ Same, 4× slower", phone(css, inner, "play", speed=4), x, y); x += COLW
    for t, lab in FRAMES[key]:
        add(f"{key}-f{t}.dc.html", f"{letter} · {lab}", phone(css, inner, t), x, y); x += COLW
    for th, thn in [("kamigawa", "Neon Rain"), ("eldraine", "Eldraine")]:
        add(f"{key}-theme-{th}.dc.html", f"{letter} ▶ Hands off to {thn}", phone(css, inner, "play", theme=th), x, y); x += COLW
    add(f"{key}-inapp.dc.html", f"{letter} ▶ In-app loading screen", inapp(key), x, y); x += COLW
    y += ROW_H

TH = {"a": "Timeline: 0 to 110 ms the mark holds at icon size. 110 to 360 ms it grows (expo out). Then the crown lights one "
           "diamond at a time, left (330), right (400), centre (470): each eases to a pale gold with a 1.3× pulse and back. The "
           "centre lights last, holds, and blooms a soft glow behind it (the one glow on screen, gone by 720). THE NINETY-NINE "
           "rises under the mark at 400 to 580 (the signed-out hero’s label). 680 to 850 ms the mark shrinks into the header "
           "logo’s exact spot while Home fades up. In app: the loading screen’s crown keeps its stagger but lights instead of "
           "blinking (same 1.2 s loop). Closest sibling to Concert Crawl’s.",
      "b": "Timeline: 0 to 110 ms the mark holds at icon size. 110 to 360 ms it grows and a card back fills in under it (The 99’s "
           "own back: a diamond lattice in the accent, not Wizards’ back), with a −5° tilt. 390 to 650 ms the card flips face up "
           "and straightens. 600 to 860 ms a foil glint crosses the face (the shipped foil colours). 690 to 860 ms the mark lifts "
           "off the card into the header while the card fades. In app: the loading screen’s crown sits on a small card that "
           "flips every 1.6 s with a slight rock. The most personality; also the busiest in one second.",
      "c": "Timeline: 0 to 110 ms the mark holds at icon size. 110 to 360 ms it grows and the crown lifts off. 300 to 620 ms the "
           "numeral counts up to 99 (like the app’s CountUp). A diamond drops back at 33, another at 66, and the large one at 99, "
           "each with a small overshoot, then a soft glow. 680 to 850 ms the mark shrinks into the header while Home fades up. "
           "In app: the loading screen’s crown builds one diamond at a time and lifts away (1.4 s loop). The one that says “99”."}
for i, key in enumerate(["a", "b", "c"]):
    yy = ROW_H * (i + 1)
    notes[f"n_{key}"] = {"x": 12 * COLW, "y": yy, "w": 460, "fill": "blue", "text": TH[key]}

canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
          "title": "The 99 · App loader", "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order,
          "notes": notes, "designSystems": []}
with open(os.path.join(OUT, "canvas.json"), "w") as f:
    json.dump(canvas, f, ensure_ascii=False, indent=1)
print(len(boards), "boards")
