# Life tracker addendum: the ±N over any art (account 1, 2026-11-22).
# Writes the boards twice: for the canvas (/_blob urls from blobs.json) and for the repo (art/).
import json, sys, os
mode, out = sys.argv[1], sys.argv[2]
BLOB = json.load(open(os.path.join(os.path.dirname(__file__), "blobs.json"))) if mode == "canvas" else {}
def src(k): return BLOB[k] if mode == "canvas" else f"art/lf-{k}.webp"
SUPPORT = "./support.js" if mode == "canvas" else "../support.js"
FONT = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&amp;family=IBM+Plex+Mono:wght@400;500&amp;family=Chakra+Petch:wght@600;700&amp;display=swap" rel="stylesheet">'
def page(title, w, h, body):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="{SUPPORT}"></script>
</head>
<body>
<x-dc>
<helmet>
{FONT}
<style>
body{{margin:0}}
</style>
</helmet>
<div style="width:{w}px;min-height:{h}px;box-sizing:border-box;padding:48px 56px 64px;background:#0A0B0F;font-family:'IBM Plex Sans',sans-serif;color:#E6E8F0;display:flex;flex-direction:column;gap:28px">
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''
A = "#E8A25C"
def head(t, p): return f'<div style="display:flex;flex-direction:column;gap:10px"><h2 style="margin:0;font:700 30px \'Chakra Petch\',sans-serif;color:#E6E8F0">{t}</h2><p style="margin:0;font-size:15px;line-height:1.6;color:#B1B6C7;max-width:1240px">{p}</p></div>'
def label(t): return f'<span style="font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.12em;text-transform:uppercase;color:{A}">{t}</span>'
def fig(k, w, h, cap, note, radius=14):
    return f'''<figure style="margin:0;display:flex;flex-direction:column;gap:12px;width:{w}px;flex:none">
<img src="{src(k)}" alt="{cap}" style="width:{w}px;height:{h}px;display:block;border-radius:{radius}px;border:1px solid #262A35">
<figcaption style="display:flex;flex-direction:column;gap:6px">
<p style="margin:0;font:600 15px 'IBM Plex Sans',sans-serif;color:#E6E8F0">{cap}</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#959AAD">{note}</p>
</figcaption>
</figure>'''
def row(lbl, figs, gap=36): return f'<div style="display:flex;flex-direction:column;gap:14px">{label(lbl)}<div style="display:flex;gap:{gap}px;align-items:flex-start;flex-wrap:wrap">{"".join(figs)}</div></div>'
def land(k, cap, note, w=700): return fig(k, w, round(w * 820 / 1180), cap, note)
def port(k, cap, note, w=420): return fig(k, w, round(w * 1180 / 820), cap, note)
def desk(k, cap, note, w=700): return fig(k, w, round(w * 900 / 1440), cap, note)
def phone(k, cap, note, w=300): return fig(k, w, round(w * 844 / 390), cap, note, 26)
def call(n, t, body): return f'<div style="display:flex;flex-direction:column;gap:8px;padding:20px 24px;border:1px solid #262A35;border-radius:14px;background:#11131A"><p style="margin:0;font:600 17px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:{A}">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{body}</div></div>'
def ul(items): return '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">' + "".join(f"<li>{i}</li>" for i in items) + '</ul>'
def frame(k, t, note, w=150):
    return f'<figure style="margin:0;display:flex;flex-direction:column;gap:6px;width:{w}px;flex:none"><img src="{src(k)}" alt="{t}" style="width:{w}px;height:{w}px;display:block;border-radius:10px;border:1px solid #262A35"><figcaption style="font:500 12px \'IBM Plex Mono\',monospace;color:#E6E8F0">{t}</figcaption><p style="margin:0;font-size:12px;line-height:1.45;color:#959AAD">{note}</p></figure>'
def wide(k, t, note, w=236):
    return f'<figure style="margin:0;display:flex;flex-direction:column;gap:6px;width:{w}px;flex:none"><img src="{src(k)}" alt="{t}" style="width:{w}px;height:{round(w*820/1180)}px;display:block;border-radius:10px;border:1px solid #262A35"><figcaption style="font:500 12px \'IBM Plex Mono\',monospace;color:#E6E8F0">{t}</figcaption><p style="margin:0;font-size:12px;line-height:1.45;color:#959AAD">{note}</p></figure>'
def table(rows, head_):
    th = "".join(f'<th style="text-align:left;padding:8px 12px;font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.08em;text-transform:uppercase;color:#959AAD;border-bottom:1px solid #262A35">{h}</th>' for h in head_)
    tr = "".join("<tr>" + "".join(f'<td style="padding:8px 12px;font-size:13.5px;line-height:1.5;color:#B1B6C7;border-bottom:1px solid #1B1E27;vertical-align:top">{c}</td>' for c in r) + "</tr>" for r in rows)
    return f'<table style="border-collapse:collapse;width:100%">{"<tr>" + th + "</tr>"}{tr}</table>'
M = "font-family:'IBM Plex Mono',monospace;color:#E6E8F0"
def m(t): return f'<span style="{M}">{t}</span>'
D = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")))
def r(tree, spec, seat, what="±N"):
    src_ = D[tree] if tree in ("base", "prop") else D["var"]
    return next(x for x in src_[spec] if x["seat"] == seat and x["what"] == what)
def ok(v): return f'<span style="{M};color:{"#7FC48A" if v >= 3 else "#E07A65"}">{v:.2f}</span>'
def stat(x): return f'worst {ok(x["min"])} · p5 {x["p5"]:.2f} · median {x["med"]:.2f}'
def zoom(k, cap, note, w=260):
    return f'<figure style="margin:0;display:flex;flex-direction:column;gap:8px;width:{w}px;flex:none"><img src="{src(k)}" alt="{cap}" style="width:{w}px;height:{round(w*180/260)}px;display:block;border-radius:10px;border:1px solid #262A35"><figcaption style="font:600 13px \'IBM Plex Sans\',sans-serif;color:#E6E8F0">{cap}</figcaption><p style="margin:0;font-size:12.5px;line-height:1.5;color:#959AAD">{note}</p></figure>'
def mframe(k, t, note, w=200):
    return f'<figure style="margin:0;display:flex;flex-direction:column;gap:6px;width:{w}px;flex:none"><img src="{src(k)}" alt="{t}" style="width:{w}px;height:{round(w*90/150)}px;display:block;border-radius:10px;border:1px solid #262A35"><figcaption style="font:500 12px \'IBM Plex Mono\',monospace;color:#E6E8F0">{t}</figcaption><p style="margin:0;font-size:12px;line-height:1.45;color:#959AAD">{note}</p></figure>'

HALO_CSS = "before: absolute, 1px in from the figure's top and bottom, 3px past its sides, fully rounded, behind the glyphs; fill <code>color-mix(in srgb, var(--bg) 60%, transparent)</code>; <code>box-shadow: 0 0 10px 7px</code> in the same mix"
boards = {}

# ---------- Main
b0, p0 = r("base", "TLu", 0), r("prop", "TLu", 0)
b3, p3 = r("base", "TL", 3), r("prop", "TL", 3)
va0, vc0, va3, vc3 = r("var", "TLu-A", 0), r("var", "TLu-C", 0), r("var", "TL-A", 3), r("var", "TL-C", 3)
wb = min(x["min"] for v in D["themes-base"].values() for x in v if x["what"] == "±N")
wp = min(x["min"] for v in D["themes-prop"].values() for x in v if x["what"] == "±N")
wl = min(x["min"] for v in D["themes-prop"].values() for x in v if x["what"] == "life")
boards["Main.dc.html"] = (1600, 2210, "Main · the ±N over any art", page("Readable ±N: main", 1600, 2210,
 head("The ±N over any art · addendum",
  "When a player taps or holds their life, a green +N or red −N fades in beside the total for about two seconds (the Nudge press). Over light art the loss figure, even in #3191's lighter red (<code>--critical-fg</code>), fell under 3:1. This round puts a soft halo of the theme's own ground under the figure. Every frame is the shipped tracker (main 14f9519 with #3191's ink) rendered in a browser at the real viewport, and every number is measured on the pixels behind the figure.")
 + row("The worst seat · Clavileño (showcase printing), iPad 1180×820, at your near edge (upright)", [
   zoom("Z-base-TLu-0", "Now (#3191 ink)", stat(b0), 360), zoom("Z-prop-TLu-0", "Drawn: halo", stat(p0), 360)])
 + row("Sideways · Clavileño (extended-art printing) at Dee's end", [
   zoom("Z-base-TL-3", "Now (#3191 ink)", stat(b3), 360), zoom("Z-prop-TL-3", "Drawn: halo", stat(p3), 360)])
 + row("Three treatments on the same pixels · the upright seat", [
   zoom("V-TLu-A-0", "A · Text shadow", stat(va0) + "<br>Darkens only the strokes' edges; between strokes the art shows through, so it can't promise every pixel. It also smears the 18px mono."),
   zoom("Z-prop-TLu-0", "B · Halo (drawn)", stat(p0) + "<br>A soft pool of <code>--bg</code>, flat under the glyphs and feathered out past them. Over dark art it disappears into the art."),
   zoom("V-TLu-C-0", "C · Chip", stat(vc0) + "<br>A hard-edged 78% pill. Reads, but as a badge: a new object in the panel, against the press's light feel."),
   ], 24)
 + row("The three on the sideways seat", [zoom("V-TL-A-3", "A · sideways", stat(va3)), zoom("Z-prop-TL-3", "B · sideways", stat(p3)), zoom("V-TL-C-3", "C · sideways", stat(vc3))], 24)
 + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'
 + call("1", "A halo under the figure, gains and losses alike", ul([
   f"The pending ±N and its fading copy draw a {HALO_CSS}.",
   "Existing tokens only: <code>--bg</code> through <code>color-mix</code>, the inks stay <code>--success</code> (gain) and <code>--critical-fg</code> (loss, from #3191). No new token, no hex.",
   "Same halo on +N and −N, so a gain and a loss look like the same object in two colours."]))
 + call("2", "It holds 3:1 over any art", ul([
   f"Over a <b>pure white</b> commander art, on the brightest panel state (your active seat, art at 72%), in all six themes, gain and loss, phone and tablet: worst pixel {ok(wp)} (now {ok(wb)}).",
   "White is the brightest pixel any art can put behind the figure, so no real art can do worse. Every seat we measured with real art clears it with room to spare (Contrast board).",
   "60% is the lightest mix that keeps a margin over 3:1 on white (56% gave 3.50, 62% gave 3.76 at the active seat)."]))
 + call("3", "It fades with the figure", ul([
   "The halo is the figure's own <code>::before</code>, so it rises in with the 150 ms fade-in, rides the 400 ms drift-and-fade at the save, and is gone when the figure is. Nothing new animates and nothing is held after the save.",
   "Reduced motion: the figure and halo show at once and clear at once at the save, as the figure does today.",
   "The press wash (10% accent while the finger is down) is unchanged: the halo is the figure's, not the press's."]))
 + call("4", "The life total needs nothing new", ul([
   f"The total is <code>--fg</code> at 60 px and up with its shipped dark text shadow. Over the same pure white plate at your active seat its worst pixel is {ok(wl)} (Kaldheim; 4.3 to 4.6 in the other themes), above 3:1 for large text.",
   "Over every real art we measured its worst pixel is 4.58:1 or better. No change; the Contrast board lists it beside the ±N."]))
 + '</div>'
 + call("5", "Phone, tablet and desktop", ul([
   "One component and one class string draw every seat on every device and in every turn of the seat (upright, sideways, upside down), so parity is automatic. The Seats board shows phone 390, iPad landscape and portrait, and a 1440×900 desktop window."]))))

# ---------- Seats
def pair(spec, kind, cap, note):
    f = {"land": land, "port": port, "desk": desk, "phone": phone}[kind]
    return [f(f"F-base-{spec}", cap + " · now", note[0]), f(f"F-prop-{spec}", cap + " · drawn", note[1])]
def zr(spec, seat, name):
    bb, pp = r("base", spec, seat), r("prop", spec, seat)
    return [zoom(f"Z-base-{spec}-{seat}", f"{name} · now", stat(bb), 220), zoom(f"Z-prop-{spec}-{seat}", f"{name} · drawn", stat(pp), 220)]
boards["Seats.dc.html"] = (1600, 5700, "Seats · every device, upright and sideways", page("Readable ±N: seats", 1600, 5700,
 head("Every device, upright and sideways",
  "Four seats: you, Colin on Ghalta, Peter on Ghoulcaller Gisa, Dee. Clavileño is the light art: the showcase printing when it sits at your edge (upright), the extended-art printing at Dee's end (sideways). Sai and Gisa are the dark seats; note that even Sai dips under 3:1 on its bright thopters at phone width. Every seat has just pressed: three taps down, except one seat pressed up so a gain shows beside the losses. The zooms are the same frames at 2×, centred on the figure, with the measured contrast of its ink over the pixels behind it.")
 + row("iPad landscape 1180×820 · Clavileño upright (your seat)", pair("TLu", "land", "Tablet", ["Clavileño's −3 is pale on the wings.", "Halo under every figure; on Colin's and Dee's dark art it all but vanishes."]))
 + row("Zooms", zr("TLu", 0, "Clavileño (showcase), upright") + zr("TLu", 3, "Sai, sideways (dark)") + zr("TLu", 1, "Ghalta +3, sideways"), 20)
 + row("iPad landscape 1180×820 · Clavileño sideways (Dee, right end)", pair("TL", "land", "Tablet", ["", ""]))
 + row("Zooms", zr("TL", 3, "Clavileño (extended), sideways") + zr("TL", 0, "Sai, upright (dark)") + zr("TL", 2, "Gisa +3, upside down"), 20)
 + row("iPad portrait 820×1180", pair("TP", "port", "Portrait", ["", ""]))
 + row("Zooms", zr("TP", 3, "Clavileño") + zr("TP", 0, "Sai (dark)"), 20)
 + row("Phone 390×844 · Clavileño upright, then sideways", pair("PHu", "phone", "Phone, upright", ["", ""]) + pair("PH", "phone", "Phone, sideways", ["", ""]))
 + row("Zooms", zr("PHu", 0, "Clavileño (showcase), upright") + zr("PH", 3, "Clavileño (extended), sideways") + zr("PH", 0, "Sai (dark)"), 20)
 + row("Desktop window 1440×900 (classed as a tablet)", pair("DK", "desk", "Desktop", ["", ""]))
 + row("Gains on every seat · iPad, both Clavileño printings", [land("F-prop-TLg", "Four gains", "Every seat pressed up. The +N wears the same halo as the −N.")] + [zoom(f"Z-prop-TLg-{s}", n, stat(r('prop', 'TLg', s)), 220) for s, n in ((0, "Clavileño showcase +3"), (3, "Clavileño extended +3, sideways"), (2, "Gisa +3"))], 20)
 + row("The any-art bound · pure white plate on your active seat and Dee's", pair("WP", "land", "White plate", ["The figure over white: under 2:1.", "With the halo, 3.5:1 or better."]))))

# ---------- Motion
boards["Motion.dc.html"] = (1600, 1230, "Motion · fades with the figure", page("Readable ±N: motion", 1600, 1230,
 head("The halo fades with the figure",
  "The halo is the figure's <code>::before</code>, so it has no motion of its own: it takes the figure's opacity and drift. Frames are the shipped animations paused at each time, on the white plate at your seat (iPad, upright, 2×) so the halo is easy to see; over real art it is fainter.")
 + row("Fade in · the first step of a run (life-pending-in, 150 ms, rising 4 px)", [mframe(f"M-in-{t:03d}", f"{t} ms", n) for t, n in ((0, "Tap: the number ticks; figure and halo at 0"), (50, ""), (100, ""), (150, "Settled; later steps change the text in place"))])
 + row("Fade out · at the save, 2 s after the last step (life-pending-out, 400 ms ease-out, drifting 6 px up)", [mframe(f"M-out-{t:03d}", f"{t} ms", n) for t, n in ((0, "The held copy (aria-hidden) takes over"), (100, ""), (200, ""), (300, ""), (400, "Gone, halo with it"))])
 + row("Reduced motion · no fades, no drift", [mframe("M-rm-tap", "Tap", "Figure and halo show at once"), mframe("M-rm-pending", "Pending", "Same as with motion, settled"), mframe("M-rm-saved", "Saved", "Both clear at once")])
 + '<div style="display:flex;flex-direction:column;gap:14px">' + label("Timing") + table([
   ["Figure + halo in", "first step", "opacity 0 → 1, translateY 4px → 0, 150 ms ease-out", "shipped <code>life-pending-in</code>"],
   ["Pending", "until 2 s idle", "held; a new step changes the text in place, the halo resizes with it", "shipped"],
   ["Figure + halo out", "the save", "opacity 1 → 0, translateY 0 → −6px, 400 ms ease-out", "shipped <code>life-pending-out</code>"],
   ["Tap during the fade", "", "the fading copy is replaced at once by the new figure, with its own halo", "shipped"],
   ["Press wash", "while pressed", "10% <code>--accent</code> over the half, 80 ms in, 200 ms out", "unchanged"],
   ["Reduced motion", "", "figure and halo show and clear at once; the wash stays (it is state)", "<code>motion-safe:</code> gating"],
 ], ["Part", "When", "What", "Source"]) + '</div>'))

# ---------- Contrast
def seatrows(spec, names):
    out = []
    for s, n in names:
        bb, pp, ll = r("base", spec, s), r("prop", spec, s), r("prop", spec, s, "life")
        out.append([n, f'{ok(bb["min"])} / {bb["p5"]:.2f} / {bb["med"]:.2f}', f'{ok(pp["min"])} / {pp["p5"]:.2f} / {pp["med"]:.2f}', f'{int(bb["under3"]*100)}% → {int(pp["under3"]*100)}%', ok(ll["min"])])
    return out
H = ["Seat", "±N now: worst / p5 / median", "±N drawn: worst / p5 / median", "Pixels under 3:1", "Life total, worst"]
SN = {"TL": [(0, "Sai, upright, −3"), (1, "Ghalta, sideways, −3"), (2, "Gisa, upside down, +3"), (3, "Clavileño extended, sideways, −3")],
      "TLu": [(0, "Clavileño showcase, upright, −3"), (1, "Ghalta, sideways, +3"), (2, "Gisa, upside down, −3"), (3, "Sai, sideways, −3")]}
SN["TP"] = SN["TL"]; SN["PH"] = SN["TL"]; SN["DK"] = SN["TL"]; SN["PHu"] = SN["TLu"]
th_rows = []
for t in ("amonkhet", "kamigawa", "ixalan", "phyrexia", "eldraine", "kaldheim"):
    cells = [t]
    for w in (1180, 390):
        for sg in ("loss", "gain"):
            k = f"WW-{t}-{sg}-{w}"
            bb = min(x["min"] for x in D["themes-base"][k] if x["what"] == "±N"); pp = min(x["min"] for x in D["themes-prop"][k] if x["what"] == "±N")
            cells.append(f"{ok(bb)} → {ok(pp)}")
    cells.append(ok(min(x["min"] for w in (1180, 390) for x in D["themes-prop"][f"WW-{t}-loss-{w}"] if x["what"] == "life")))
    th_rows.append(cells)
sec = lambda l, spec: f'<div style="display:flex;flex-direction:column;gap:14px">{label(l)}{table(seatrows(spec, SN[spec]), H)}</div>'
boards["Contrast.dc.html"] = (1600, 1970, "Contrast · measured per pixel", page("Readable ±N: contrast", 1600, 1970,
 head("Measured on the pixels behind the figure",
  "For each seat: press, hide the figure's glyphs only (the halo and the total's shadow stay), screenshot its box, and score its ink against every pixel there (WCAG 2 relative luminance). Worst is the single darkest-contrast pixel; the bar is 3:1 (the figure is large text in the brief's terms). Now = main 14f9519 with #3191's <code>--critical-fg</code> loss ink; drawn = with the halo. Amonkhet theme unless noted.")
 + sec("iPad landscape 1180×820 · Clavileño upright", "TLu") + sec("iPad landscape 1180×820 · Clavileño sideways", "TL")
 + sec("iPad portrait 820×1180", "TP") + sec("Phone 390×844 · Clavileño upright", "PHu") + sec("Phone 390×844 · Clavileño sideways", "PH")
 + sec("Desktop 1440×900", "DK")
 + '<div style="display:flex;flex-direction:column;gap:14px">' + label("Any art · pure white plate on your active seat (art at 72%), worst ±N pixel, now → drawn") + table(th_rows, ["Theme", "iPad −N", "iPad +N", "Phone −N", "Phone +N", "Life total, worst (drawn = now)"]) + '</div>'))

os.makedirs(out, exist_ok=True)
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-22T20:45:00Z"}, "title": "Life tracker · the ±N over any art", "launch": {"view": "canvas"}, "pages": [], "boards": {}, "order": [], "notes": {}, "designSystems": []}
x = 0
for name, (w, h, title, html) in boards.items():
    open(os.path.join(out, name), "w").write(html)
    canvas["boards"][name] = {"x": x, "y": 0, "w": w, "h": h, "title": title}; canvas["order"].append(name); x += w + 120
json.dump(canvas, open(os.path.join(out, "canvas.json"), "w"), indent=1)
print("ok", list(boards))
