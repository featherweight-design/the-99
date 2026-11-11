import json, sys, os
S = "/tmp/claude-0/-home-user/a91a75a1-977b-571b-9041-d74aabcfeee6/scratchpad"
B = {"a-1024":"cbca8ad4abfc6d982476538c4850f4a2","a-768":"3ad6d1297001ef53a526da8ef961f90d","b-1024":"aa46fc888864010013896136d09bc793","b-768":"dd168260042f3007c8ece7d4f2e87c73",
"r-1180":"6dfb7638b07187d439d44619fbacbf0e","r-1279":"aebbae2c6d667a06f5df1322d5d9831b","r-1300":"ee2d38321048344159d33c13a83d4b51","r-390":"47c76eb3297a26083430ebf7b2e1eb21","r-900":"40a4752386d4ee4961cbf4d1dd0e7f5e",
"t-1024":"7d82160886f46f365ef73efd1ef5ec3d","t-768":"87e5b8ec1340a77d69f6362cdd89d42b",
"th-amonkhet-1024":"d587f5233c634d7cad616139baf07ca6","th-amonkhet-768":"cfd5239df4e32074919eea1d7d7b361f","th-eldraine-1024":"c0696b322cc0031e17d04c4cb1f19a76","th-eldraine-768":"f1b1448378641386ea963727764719ff",
"th-ixalan-1024":"38e68d88acd356267c0c314fc32eb9d8","th-ixalan-768":"7e16364191eb121e7d88d60e64809e66","th-kaldheim-1024":"e3aec2e4703adcbe9fab44ac79e2e0bd","th-kaldheim-768":"4d48b01e989cddc943b3c578f7a3a34c",
"th-kamigawa-1024":"9eb71257d11d1c4be7868c064059b1c7","th-kamigawa-768":"540fcd859b2828b79a5cbec2f9413e27","th-phyrexia-1024":"9e7bdfdf10f12bee23b8a8654563c0af","th-phyrexia-768":"7b3a680165b94c0e2f3d81740331b64d"}
LOCAL = len(sys.argv) > 1
def src(k): return f"{S}/app/hero/jpg/a3-{k}.jpg" if LOCAL else f"/_blob/{B[k]}"
H = {"t-768":793,"a-768":1397,"b-768":793,"t-1024":793,"a-1024":1397,"b-1024":793,"r-390":1390,"r-900":1397,"r-1180":793,"r-1279":793,"r-1300":793}
for t in ["amonkhet","kamigawa","ixalan","phyrexia","eldraine","kaldheim"]: H[f"th-{t}-768"]=1397; H[f"th-{t}-1024"]=793
CSS = """body{margin:0}
.board{box-sizing:border-box;padding:48px 56px 64px;background:#0D0B09;font-family:'IBM Plex Sans',sans-serif;color:#EDE6D8;display:flex;flex-direction:column;gap:30px}
.bh{display:flex;flex-direction:column;gap:9px;max-width:1500px}
.kick{display:flex;align-items:center;gap:10px;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#8F8676}
.kick .tag{background:#CF8745;color:#14110E;border-radius:5px;padding:4px 8px;font-weight:600}
.bh h2{margin:0;font:700 30px 'Cinzel',serif}
.bh p,.note{font-size:14px;line-height:1.6;color:#C0B8A6;margin:0;text-wrap:pretty}
.bh p b,.note b{color:#EDE6D8}
.frames{display:flex;gap:44px;align-items:flex-start}
.fr{display:flex;flex-direction:column;gap:12px;flex:none}
.lab{font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#8F8676}
.lab b{color:#CF8745;font-weight:600}
.cap{font-size:13px;line-height:1.55;color:#A59C89;text-wrap:pretty}
.cap b{color:#EDE6D8;font-weight:600}
.shot{display:block;border:1px solid #3A3229;border-radius:6px}
.rec{outline:2px solid #CF8745;outline-offset:6px;border-radius:6px}
.notes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.note{border:1px solid #3A3229;border-radius:12px;background:#15120F;padding:16px 18px}
.note h4{margin:0 0 6px;font:600 13px 'IBM Plex Sans',sans-serif;color:#EDE6D8}
.note ul{margin:6px 0 0;padding-left:18px}.note li{margin:4px 0}
code{font:12px 'IBM Plex Mono',monospace;color:#EDE6D8;background:#211D18;border-radius:4px;padding:1px 4px}
.tbl{border-collapse:collapse;font-size:13px;color:#C0B8A6;width:100%}
.tbl th{text-align:left;font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#8F8676;padding:8px 10px;border-bottom:1px solid #3A3229}
.tbl td{padding:9px 10px;border-bottom:1px solid #2B241B;vertical-align:top;line-height:1.5}
.tbl td b{color:#EDE6D8}"""
FONTS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;family=Cinzel:wght@600;700;800&amp;display=swap"
def doc(title, w, h, inner):
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
<link rel="stylesheet" href="{FONTS}">
<style>
{CSS}
</style>
</helmet>
<div class="board" style="width: {w}px; min-height: {h}px">
{inner}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""
def head(kick, title, body):
    return f'<div class="bh"><div class="kick"><span class="tag">A3</span>{kick}</div><h2>{title}</h2><p>{body}</p></div>'
def frame(k, w, lab, cap, rec=False, scale=1):
    dw = int(w*scale); dh = int(H[k]*scale)
    return (f'<div class="fr" style="width: {dw}px"><div class="lab">{lab}</div>'
            f'<img class="shot{" rec" if rec else ""}" src="{src(k)}" alt="{lab}" width="{dw}" height="{dh}" style="width: {dw}px; height: {dh}px">'
            f'<div class="cap">{cap}</div></div>')
def notes(*ns): return '<div class="notes">' + "".join(f'<div class="note"><h4>{t}</h4>{b}</div>' for t, b in ns) + '</div>'

REND = "Every frame is the shipped <code>Hero</code> and <code>TopBar</code> (src/components/landing) rendered at that width with the shipped CSS and fonts; only the hero's grid and the shot box's classes change. Commander reads are stand-ins (the catalog holds the real ones)."
out = {}
# 768
inner = head("Hero at 768", "768: the phone stacks under the words", "At 768 the hero's second column is 32px wide, so the phone frame sits entirely outside it and the section's clip hides it; only bits of the three cards show, and they slide over the launch panel. <b>Recommended: stack.</b> " + REND)
inner += '<div class="frames">' + frame("t-768", 768, "Today <b>· shipped</b>", "The phone frame is fully clipped (0% shows in this render); Jace, Y’shtola and Tam overlap <b>Tell me at launch</b>.") \
  + frame("a-768", 768, "A · Stack <b>· recommended</b>", "One column. Words, launch panel and theme switch exactly as today; the whole 560 × 560 shot (phone and three cards, desktop size and angles) sits centred 44px under the theme switch.", rec=True) \
  + frame("b-768", 768, "B · Scale", "Scaling cannot work here: even with the gap and right padding cut to 40px the column is 98px, so a phone that fits would be about 50px wide. Shown at 0.62 for comparison: still clipped.") + '</div>'
inner += notes(("What changes at 768 to 1023", "<ul><li>The hero grid is one column; the words and theme switch keep their 500px cap.</li><li>The shot moves to row 3, centred, <b>44px</b> under the theme switch.</li><li>The shot is the desktop box unchanged: 560 × 560, phone 300 × 560 at −2°, Jace 9°, Y’shtola −11°, Tam 4°, the same drift.</li></ul>"),
  ("What stays", "<ul><li>Copy, order and every component.</li><li>The phone hero (below 768) and desktop (1280 and up).</li><li>The section’s horizontal clip from #2849 stays as a guard; nothing spills now.</li></ul>"),
  ("Height", "The hero grows from 793px to 1,397px at 768, so the shot sits below the fold on a 768 × 1024 tablet and scrolls in with <code>.anim-gentle-in</code> like today. The words and the launch panel stay above the fold."))
out["A3-Hero-768.dc.html"] = ("A3 Hero 768", 56*2 + 768*3 + 44*2, inner, 1397 + 520)
# 1024
inner = head("Hero at 1024", "1024: the whole shot, scaled into the column", "At 1024 about three quarters of the phone shows and its right edge is cut. <b>Recommended: scale.</b> " + REND)
inner += '<div class="frames">' + frame("t-1024", 1024, "Today <b>· shipped</b>", "The phone’s right edge and the Jace card are cut by the section’s clip (78% of the phone frame shows).") \
  + frame("b-1024", 1024, "B · Scale <b>· recommended</b>", "Two columns, as desktop. The gap and right padding drop to 40px and the whole shot is scaled to <b>0.62</b> (phone 198px wide), centred in its column. All three cards and the whole phone show.", rec=True) \
  + frame("a-1024", 1024, "A · Stack", "Stacking works but leaves the right half empty beside the words and pushes the shot below the fold on a 1024 × 768 tablet.") + '</div>'
inner += notes(("What changes at 1024 to 1279", "<ul><li>Hero gap 56 → <b>40px</b>, right padding 90 → <b>40px</b> (left stays 90, so the words line up with the strip below).</li><li>The shot box is centred in column 2 and scaled with <code>zoom</code>: <b>0.62</b> from 1024 to 1199, <b>0.8</b> from 1200 to 1279.</li><li>Scaling the whole box keeps every card’s place and angle relative to the phone, as desktop.</li></ul>"),
  ("Why zoom", "The phone’s screen is already drawn at a page scale with <code>zoom</code> (0.86 on desktop), so the same property on the box reads consistently and keeps layout size and painted size equal (a <code>transform</code> would leave a 560px box behind it)."),
  ("What stays", "<ul><li>The words column (500px), launch panel and theme switch, untouched.</li><li>The drift, tilt and shadows.</li><li>Copy unchanged.</li></ul>"))
out["A3-Hero-1024.dc.html"] = ("A3 Hero 1024", 56*2 + 1024*3 + 44*2, inner, 1397 + 480)
# themes
T = [("amonkhet","Low Sun"),("kamigawa","Neon Rain"),("ixalan","Canopy"),("phyrexia","Oil Haze"),("eldraine","Witching Hour"),("kaldheim","First Frost")]
sc = 0.5
inner = head("Six themes", "The recommended hero in all six themes", "Top row 768 (stacked), bottom row 1024 (scaled), each drawn at half size. Only tokens change between themes; the display face follows each theme’s <code>--font-display-face</code>.")
inner += '<div class="frames">' + "".join(frame(f"th-{t}-768", 768, f"768 · <b>{n}</b>", "", scale=sc) for t, n in T) + '</div>'
inner += '<div class="frames">' + "".join(frame(f"th-{t}-1024", 1024, f"1024 · <b>{n}</b>", "", scale=sc) for t, n in T) + '</div>'
out["A3-Themes.dc.html"] = ("A3 Themes", 56*2 + int(1024*sc)*6 + 44*5, inner, 0)
# calls + range
inner = head("The call", "Tablet hero: stack below 1024, scale from 1024 to 1279", "The hero only breaks between 768 and 1279: the desktop shot needs a 560px column, which the grid has only from about 1296. Engineering’s #2849 clips it there today. A3 draws the real layout for that range; phone and desktop stay as shipped.")
tbl = ('<table class="tbl"><tr><th>Width</th><th>Layout</th><th>Shot</th><th>Classes (on the shipped elements)</th></tr>'
 '<tr><td><b>below 768</b></td><td>Phone, as shipped</td><td>Phone hero, side cards</td><td>none</td></tr>'
 '<tr><td><b>768 to 1023</b></td><td>One column</td><td>Desktop box, 560 × 560, centred under the theme switch</td><td>section <code>md:max-lg:grid-cols-[minmax(0,1fr)]</code>; words <code>md:max-lg:max-w-[500px]</code>; shot wrapper <code>md:max-lg:col-start-1 md:max-lg:row-start-3 md:max-lg:row-span-1 md:max-lg:mt-[44px]</code>; box <code>md:max-xl:mx-auto</code></td></tr>'
 '<tr><td><b>1024 to 1199</b></td><td>Two columns</td><td>Whole box at zoom 0.62</td><td>section <code>lg:max-xl:gap-x-[40px] lg:max-xl:pr-[40px]</code>; box <code>lg:max-[1200px]:[zoom:0.62]</code></td></tr>'
 '<tr><td><b>1200 to 1279</b></td><td>Two columns</td><td>Whole box at zoom 0.8</td><td>box <code>min-[1200px]:max-xl:[zoom:0.8]</code></td></tr>'
 '<tr><td><b>1280 and up</b></td><td>Desktop, as shipped</td><td>Box at full size</td><td>none</td></tr></table>')
inner += f'<div style="max-width: 1500px">{tbl}</div>'
inner += '<div class="frames">' + frame("r-390", 390, "390 <b>· unchanged</b>", "The phone hero as shipped.", scale=0.6) + frame("r-900", 900, "900 · stack", "The middle of the stacked range.", scale=0.6) \
  + frame("r-1180", 1180, "1180 · scale 0.62", "Just under the 1200 step.", scale=0.6) + frame("r-1279", 1279, "1279 · scale 0.8", "The widest scaled width.", scale=0.6) + frame("r-1300", 1300, "1300 <b>· unchanged</b>", "Desktop as shipped.", scale=0.6) + '</div>'
inner += notes(("Settled", "<ul><li>Copy unchanged; no new component, string or token.</li><li>The floating cards keep the desktop places, sizes and angles at every width (stack draws the box as is; scale shrinks the whole box).</li><li>The section’s <code>md:max-xl:overflow-x-clip</code> stays as a guard.</li></ul>"),
  ("For engineering", "<ul><li>Classes only, in <code>landing.tsx</code> (Hero) and <code>hero-phone.tsx</code> (HeroShot’s box takes a class).</li><li>The 0.62 and 0.8 steps fit the box inside its column at the narrowest width of each step (354px and 530px).</li><li>Proof: document overflow 0 and the whole phone frame inside the section at 768, 900, 1023, 1024, 1199, 1200 and 1279.</li></ul>"),
  ("Readiness", "<b>Green.</b> One small PR, no data, flag or copy change. See <code>READINESS-a3.md</code>."))
out["A3-Calls.dc.html"] = ("A3 Calls", 56*2 + 3210, inner, 0)
dst = sys.argv[1] if LOCAL else f"{S}/canvas/project"
os.makedirs(dst, exist_ok=True)
for n, (t, w, inner, h) in out.items():
    open(f"{dst}/{n}", "w").write(doc(t, w, h or 400, inner))
print(json.dumps({n: v[1] for n, v in out.items()}))
