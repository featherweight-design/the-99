"""Desktop app loader addendum (R1) generator. Reuses the D3 generator's helpers (loader.py) and draws the same
D3 timeline (D x 1.6 = 1.66 s, no sparkles) in a desktop window, landing on the rail's rail-62 lockup.

Writes project/*.dc.html + canvas.json under $OUT (default ./canvas/project)."""
import json, os, sys, datetime
sys.path.insert(0, os.path.dirname(__file__))
import loader_lib as L
from loader_lib import kf, anim, crown_svg, numeral_div, BG, FG, ACC, ACC_S, ACC_SH, RAISED, ELEV, FOIL, EXPO, INOUT, LOOP, page_doc

OUT = os.environ.get("OUT", os.path.join(os.path.dirname(__file__), "canvas", "project"))
os.makedirs(OUT, exist_ok=True)
LOCAL = os.environ.get("LOCAL")  # local render: blob urls -> local files

BLOB = {
    ("amonkhet", 1280): "/_blob/21ac8e7638b974ee999bd131f293be4e",
    ("amonkhet", 1920): "/_blob/13e99a0d8b82e27163a041f7815475f1",
    ("eldraine", 1280): "/_blob/a96bb932ebbab677b53b94b5b01afa8f",
    ("kamigawa", 1280): "/_blob/6fca46cbc128c7e249a11a2bf336122b",
    ("amonkhet", "tab"): "/_blob/fb2378a86f3a5d0f1c56e6244404e03d",
}
LOCALNAME = {("amonkhet", 1280): "home-amonkhet-1280", ("amonkhet", 1920): "home-amonkhet-1920", ("eldraine", 1280): "home-eldraine-1280",
             ("kamigawa", 1280): "home-kamigawa-1280", ("amonkhet", "tab"): "home-amonkhet-tab"}

# The window sizes, their rail, and the rail lockup's crown centre (measured on the rendered shell: NavRail, Crowned99 rail-62).
WIN = {
    "d": dict(w=1280, h=800, rail=62, land=(30.5, 20.0), img=("amonkhet", 1280)),
    "l": dict(w=1920, h=1080, rail=62, land=(30.5, 20.0), img=("amonkhet", 1920)),
    "t": dict(w=1180, h=820, rail=88, land=(43.5, 20.0), img=("amonkhet", "tab")),
}
# rail-62 draws the crown at 0.813 px per icon unit (its 6 px small diamond / icon.svg's 7.381): the launch mark is drawn
# at 4.285 px per unit at scale 1, so the landing scale is 0.813 / 4.285. icon.svg IS the rail-62 lockup, so the numeral
# lands on the rail's numeral with no settle (the phone needed 76.3 px down and 1.2x for the mobile header).
LAND_S = (6 / 7.381) / 4.285


def scaled(frames, f=1.6):
    return [(min(round(t * f), LOOP), c, e) for t, c, e in frames]


def anims(*names):
    return ("animation:" + ",".join(f"{n} var(--dur) linear var(--del) infinite both" for n in names) + ";"
            "animation-play-state:" + ",".join("var(--ps)" for _ in names) + ";")


def loader(W, H, land, k=1.0):
    """D3 (option_d without sparkles, x1.6) centred in a W x H window; the mark lands at `land` at LAND_S. k scales the
    card and the mark at peak (the large-window alternative); the 128 px icon start never scales."""
    cx, cy = W / 2, H / 2
    lx, ly = land
    css = []
    def cw(tx, ty, s, rz, ry):
        return f"transform:translate({tx:.1f}px,{ty:.1f}px) perspective(1100px) rotateZ({rz}deg) rotateY({ry}deg) scale({s:.4f});"
    A = (cx, cy - 4.7)
    B = (cx, cy - 31 * k)
    css.append(kf("card", scaled([(0, cw(*A, .467, 0, 0), None), (110, cw(*A, .467, 0, 0), EXPO),
                                  (330, cw(*B, k, -6, 0), None), (350, cw(*B, k, -6, 0), INOUT),
                                  (570, cw(*B, k, 0, 180), None), (770, cw(*B, k, 0, 180), "ease-in"),
                                  (850, cw(*B, .94 * k, 0, 180), None)])))
    css.append(kf("cardo", scaled([(0, "opacity:1;", None), (770, "opacity:1;", "ease-in"), (850, "opacity:0;", None)])))
    css.append(kf("backbg", scaled([(0, "opacity:0;", None), (110, "opacity:0;", "ease-out"), (280, "opacity:1;", None)])))
    css.append(kf("bside", scaled([(0, "opacity:1;", "steps(1,end)"), (460, "opacity:0;", None)])))
    css.append(kf("fside", scaled([(0, "opacity:0;", "steps(1,end)"), (460, "opacity:1;", None)])))
    css.append(kf("fglow", scaled([(0, "box-shadow:0 0 0 0 rgba(246,207,153,0);", None), (700, "box-shadow:0 0 0 0 rgba(246,207,153,0);", "ease-out"),
                                   (770, "box-shadow:0 0 46px 6px rgba(246,207,153,.38);", "ease-in-out"), (870, "box-shadow:0 0 30px 0 rgba(246,207,153,0);", None)])))
    css.append(kf("glint", scaled([(0, "transform:translateX(-120%);", None), (540, "transform:translateX(-120%);", INOUT),
                                   (800, "transform:translateX(120%);", None)])))
    peak = f"transform:translate({cx:.1f}px,{cy - 92 * k:.1f}px) scale({k:.4f});"
    rail = f"transform:translate({lx}px,{ly}px) scale({LAND_S:.4f});"
    css.append(kf("lkt", scaled([(0, peak, None), (760, peak, INOUT), (920, rail, None)])))
    css.append(kf("lko", scaled([(0, "opacity:0;", "steps(1,end)"), (570, "opacity:1;", None), (940, "opacity:1;", "ease-out"), (1010, "opacity:0;", None)])))
    def light(name, t0, hold=0):
        return kf(name, scaled([(0, f"fill:{ACC};transform:scale(1);", None), (t0, f"fill:{ACC};transform:scale(1);", "ease-out"),
                                (t0 + 60, "fill:#F6CF99;transform:scale(1.3);", None),
                                (t0 + 60 + hold, "fill:#F6CF99;transform:scale(1.3);", "ease-in-out"),
                                (t0 + 200 + hold, f"fill:{ACC};transform:scale(1);", None)]))
    css += [light("dl", 590), light("dr", 650), light("dc", 710, hold=50)]
    css.append(kf("halo", scaled([(0, "opacity:0;transform:scale(.8);", None), (715, "opacity:0;transform:scale(.8);", "ease-out"),
                                  (790, "opacity:1;transform:scale(1.25);", "ease-in-out"), (900, "opacity:0;transform:scale(1);", None)])))
    CW, CH = L.CARD_W, L.CARD_H
    ccy = CH / 2 - 61
    lattice = (f"background-color:{RAISED};background-image:repeating-linear-gradient(45deg,rgba(171,110,55,.16) 0 1px,transparent 1px 18px),"
               f"repeating-linear-gradient(-45deg,rgba(171,110,55,.16) 0 1px,transparent 1px 18px);")
    fc = f"position:absolute;left:0;top:0;width:{CW}px;height:{CH}px;border-radius:14px;"
    back = (f'<div style="{fc}{anim("bside")}">'
            f'<div style="position:absolute;inset:0;border-radius:14px;border:2px solid {ACC_S};{lattice}{anim("backbg")}">'
            f'<div style="position:absolute;inset:10px;border-radius:8px;border:1px solid {ACC_SH}"></div></div>'
            f'<div style="position:absolute;left:{CW / 2}px;top:{ccy}px;width:0;height:0">{crown_svg()}{numeral_div()}</div></div>')
    glint = ("linear-gradient(105deg,transparent 30%," + ",".join(f"{c}55" for c in FOIL) + ",transparent 70%)")
    face = (f'<div style="{fc}{anims("fside", "fglow")}transform:rotateY(180deg);border:2px solid {ACC};'
            f'background:radial-gradient(240px 200px at 50% 38%,rgba(207,135,69,.16),transparent 70%),{ELEV};">'
            f'<div style="position:absolute;inset:0;border-radius:12px;overflow:hidden">'
            f'<div style="position:absolute;inset:8px;border-radius:8px;border:1px solid {ACC_SH}"></div>'
            f'<div style="position:absolute;left:{CW / 2 - 2}px;top:{ccy - 2}px;width:0;height:0">{crown_svg()}{numeral_div()}</div>'
            f'<div style="position:absolute;left:0;right:0;bottom:28px;text-align:center;font-family:\'IBM Plex Mono\',monospace;'
            f'font-size:11px;letter-spacing:0.4em;color:{ACC}">THE NINETY-NINE</div>'
            f'<div style="position:absolute;inset:0;background:{glint};mix-blend-mode:screen;{anim("glint")}"></div></div></div>')
    card = (f'<div style="position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;transform-style:preserve-3d;{anim("card")}">'
            f'<div style="position:absolute;left:{-CW / 2}px;top:{-CH / 2}px;width:{CW}px;height:{CH}px;'
            f'transform-style:preserve-3d;{anim("cardo")}">{back}{face}</div></div>')
    halo = (f'<div style="position:absolute;left:-130px;top:-130px;width:260px;height:260px;border-radius:50%;'
            f'background:radial-gradient(circle,rgba(246,207,153,.55) 0%,rgba(207,135,69,.22) 38%,rgba(207,135,69,0) 70%);{anim("halo")}"></div>')
    lock = (f'<div style="position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;{anim("lkt")}">'
            f'<div style="position:absolute;left:0;top:0;{anim("lko")}">{halo}{crown_svg(anims=(anim("dl"), anim("dc"), anim("dr")))}'
            f'{numeral_div()}</div></div>')
    return "".join(css), card + lock


# Home under the overlay. The ground (#14110E) clears 1408 to 1664 ms; <main> rises 10 px as it does, the rail does not
# (the shipped `ll-page` animates <main> only).
GROUND = scaled([(0, "opacity:1;", None), (880, "opacity:1;", "ease-out"), (1040, "opacity:0;", None)])
PAGE = scaled([(0, "transform:translateY(10px);", None), (880, "transform:translateY(10px);", "cubic-bezier(.2,.7,.2,1)"),
               (1040, "transform:translateY(0);", None)])


def src(key):
    if LOCAL:
        return os.path.join(LOCAL, LOCALNAME[key] + ".webp")
    return BLOB[key]


def window(win, mode, theme="amonkhet", k=1.0, speed=1, loader_on=True):
    W, H, R = win["w"], win["h"], win["rail"]
    key = (theme, win["img"][1])
    if mode == "play":
        v = f"--dur:{LOOP * speed}ms;--del:0ms;--ps:running;"
    else:
        v = f"--dur:{LOOP}ms;--del:-{mode}ms;--ps:paused;"
    s = src(key)
    home_rail = (f'<div style="position:absolute;left:0;top:0;width:{R}px;height:{H}px;overflow:hidden">'
                 f'<img src="{s}" alt="" width="{W}" height="{H}" style="position:absolute;left:0;top:0;width:{W}px;height:{H}px;display:block"></div>')
    main_anim = anim("page") if loader_on else ""
    home_main = (f'<div style="position:absolute;left:{R}px;top:0;width:{W - R}px;height:{H}px;overflow:hidden">'
                 f'<div style="position:absolute;left:0;top:0;width:{W - R}px;height:{H}px;{main_anim}">'
                 f'<img src="{s}" alt="Home, as the app opens" width="{W}" height="{H}" style="position:absolute;left:-{R}px;top:0;width:{W}px;height:{H}px;display:block"></div></div>')
    if not loader_on:
        return (f'<div style="position:relative;width:{W}px;height:{H}px;overflow:hidden;background:{BG};'
                f'font-family:\'IBM Plex Sans\',system-ui,sans-serif;color:{FG}">{home_rail}{home_main}</div>')
    css, inner = loader(W, H, win["land"], k)
    css += kf("page", PAGE) + kf("ground", GROUND)
    ground = f'<div style="position:absolute;inset:0;background:{BG};{anim("ground")}"></div>'
    return (f'<div style="position:relative;width:{W}px;height:{H}px;overflow:hidden;background:{BG};'
            f'font-family:\'IBM Plex Sans\',system-ui,sans-serif;color:{FG};{v}">'
            f'<style>{css}</style>{home_rail}{home_main}{ground}{inner}</div>')


def blank(win):
    W, H = win["w"], win["h"]
    return f'<div style="position:relative;width:{W}px;height:{H}px;background:{BG}"></div>'


def zoom(win, t, z=4, cw=96, ch=72):
    """A window's paused frame, its top-left cw x ch px blown up z times: the landing on the rail's lockup."""
    inner = window(win, t)
    return (f'<div style="position:relative;width:{cw * z}px;height:{ch * z}px;overflow:hidden;background:{BG}">'
            f'<div style="position:absolute;left:0;top:0;transform:scale({z});transform-origin:0 0">{inner}</div></div>')


boards, order, notes = {}, [], {}


def add(fname, title, body, x, y, w, h):
    with open(os.path.join(OUT, fname), "w") as f:
        f.write(page_doc(title, body, w, h))
    boards[fname] = {"x": x, "y": y, "w": w, "h": h, "title": title}
    order.append(fname)


D, Lg, T = WIN["d"], WIN["l"], WIN["t"]
GAP, ROWGAP = 80, 420
y = 0
# Row 0: 1280 x 800, playable
notes["r0"] = {"x": 0, "y": y - 260, "text": "Desktop, 1280 × 800: the installed app opens", "kind": "title1", "maxW": 4000}
add("Main.dc.html", "1280 ▶ Real speed (loops)", window(D, "play"), 0, y, 1280, 800)
add("d-slow.dc.html", "1280 ▶ Same, 4× slower", window(D, "play", speed=4), 1280 + GAP, y, 1280, 800)
add("d-window.dc.html", "Before first paint · the window opens on #14110E", blank(D), 2 * (1280 + GAP), y, 1280, 800)
add("d-reduced.dc.html", "Reduced motion · no loader, first paint is Home", window(D, 0, loader_on=False), 3 * (1280 + GAP), y, 1280, 800)
y += 800 + ROWGAP
# Row 1: 1280 keyframes
notes["r1"] = {"x": 0, "y": y - 260, "text": "Desktop, 1280 × 800: keyframes", "kind": "title1", "maxW": 4000}
FR = [(0, "0 ms · first paint: the 128 px icon, centred"), (380, "380 ms · a card grows under the mark, tilted"), (670, "670 ms · it flips"),
      (990, "990 ms · face up, the crown starts to light"), (1200, "1.2 s · the centre lights, the card glows"),
      (1360, "1.36 s · the mark lifts toward the rail"), (1472, "1.47 s · it lands on the rail's lockup"), (1660, "1.66 s · Home")]
for i, (t, title) in enumerate(FR):
    add(f"d-f{t}.dc.html", title, window(D, t), (i % 4) * (1280 + GAP), y + (i // 4) * (800 + 200), 1280, 800)
y += 2 * 800 + 200 + ROWGAP
# Row 2: the landing, close up; themes
notes["r2"] = {"x": 0, "y": y - 260, "text": "The landing, 4× (rail head, top-left 96 × 72) and Home in the saved theme", "kind": "title1", "maxW": 4000}
zx = 0
for t, title in [(1360, "4× · 1.36 s · lifting"), (1440, "4× · 1.44 s · nearly down"), (1520, "4× · 1.52 s · down: flyer over the lockup, fading"), (1660, "4× · 1.66 s · the rail's own lockup")]:
    add(f"d-z{t}.dc.html", title, zoom(D, t), zx, y, 384, 288)
    zx += 384 + GAP
add("d-theme-eldraine.dc.html", "1.66 s · Home in Eldraine", window(D, 1660, theme="eldraine"), zx, y, 1280, 800)
add("d-theme-kamigawa.dc.html", "1.66 s · Home in Neon Rain", window(D, 1660, theme="kamigawa"), zx + 1280 + GAP, y, 1280, 800)
y += 800 + ROWGAP
# Row 3: large window
notes["r3"] = {"x": 0, "y": y - 260, "text": "Large window, 1920 × 1080: the card stays 260 × 363", "kind": "title1", "maxW": 6000}
lx = 0
add("l-play.dc.html", "1920 ▶ Real speed (loops)", window(Lg, "play"), lx, y, 1920, 1080); lx += 1920 + GAP
for t, title in [(990, "1920 · 990 ms · face up"), (1360, "1920 · 1.36 s · the longer flight to the rail"), (1660, "1920 · 1.66 s · Home")]:
    add(f"l-f{t}.dc.html", title, window(Lg, t), lx, y, 1920, 1080); lx += 1920 + GAP
y += 1080 + ROWGAP
notes["r3b"] = {"x": 0, "y": y - 260, "text": "Not recommended: the card scales with the window (1.35× at 1080 tall)", "kind": "title1", "maxW": 6000}
add("l-alt-f990.dc.html", "Alternative · card scaled to the window · 990 ms", window(Lg, 990, k=1.35), 0, y, 1920, 1080)
add("l-alt-play.dc.html", "Alternative ▶ card scaled to the window", window(Lg, "play", k=1.35), 1920 + GAP, y, 1920, 1080)
y += 1080 + ROWGAP
# Row 4: tablet
notes["r4"] = {"x": 0, "y": y - 260, "text": "Tablet, 1180 × 820 (touch, 88 px labelled rail): follows desktop", "kind": "title1", "maxW": 5000}
tx = 0
add("t-play.dc.html", "Tablet ▶ Real speed (loops)", window(T, "play"), tx, y, 1180, 820); tx += 1180 + GAP
for t, title in [(990, "Tablet · 990 ms · face up"), (1360, "Tablet · 1.36 s · to the rail"), (1660, "Tablet · 1.66 s · Home")]:
    add(f"t-f{t}.dc.html", title, window(T, t), tx, y, 1180, 820); tx += 1180 + GAP

canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
          "title": "The 99 · App loader on desktop (R1)", "launch": {"view": "canvas"}, "pages": [], "boards": boards,
          "order": order, "notes": notes, "designSystems": []}
with open(os.path.join(OUT, "canvas.json"), "w") as f:
    json.dump(canvas, f, indent=1, ensure_ascii=False)
print(len(boards), "boards")
