"""Shared pieces for the public pages canvas (account-1, 2026-10-17).

Everything is drawn in the default theme (amonkhet) with the shipped token NAMES declared on :root,
so every colour in a board reads as the token it is in src/app/globals.css.
"""
import html, re

BLOB = {
    "card-rootha": "/_blob/75068cfe405b6e3666abc3631177213e",
    "card-ghalta": "/_blob/b95b3d535ebf1ffe129e4a8832fc6d03",
    "card-zimone": "/_blob/30c16e721b8afd7d0967248c7a2a8626",
    "card-sai": "/_blob/7bb44f1a31aec9e89904d3748231e050",
    "card-ashling": "/_blob/3e521acea822e18e33506598ade090c5",
    "card-dina": "/_blob/7f6dd2ae67cf8de362df23093fd652a0",
    "art-zimone": "/_blob/9b0ceafebd262cb7541d35840f9dc0e1",
    "art-rootha": "/_blob/1aa1be3042b3c104de4cc56eabff82a2",
    "art-sai": "/_blob/bd03aac6cc20dbcd405dfbbfa8ba1617",
    "art-dina": "/_blob/ad15a8d803ec524f66bc90d35aebb2fd",
    "art-ashling": "/_blob/cda594fd5692a759782ee9edf747ba52",
    "art-ghalta": "/_blob/b457e4b0c6ed060d98c3f06280e70050",
}

TOKENS = """
:root{
--bg:#14110E;--surface:#1E1A15;--surface-raised:#211D18;--surface-rail:#1A1611;--surface-sunken:#18140F;
--elevated:#29241F;--elevated-hover:#201C17;--border:#2B241B;--border-strong:#3A3229;--border-dashed:#494037;
--fg:#EDE6D8;--fg-body:#C0B8A6;--fg-muted:#A59C89;--fg-faint:#8B8270;--fg-locked:#6E6654;
--accent:#CF8745;--accent-hover:#DE9757;--accent-strong:#AB6E37;--accent-shadow:#6B482A;--accent-dim:#6B482A;--accent-mid:#AB6E37;
--success:#6FA368;--warning:#DEAA29;--fact:#8FA6BE;
--bracket-1:#8A857C;--bracket-2:#A89A74;--bracket-3:#C9AC62;--bracket-4:#E6D08A;--bracket-5:#FBEFC6;
--w:#F4E9C4;--u:#3A6AA5;--b:#98748F;--r:#C05A3E;--g:#4B7A46;
--display:'Cinzel',serif;--sans:'IBM Plex Sans',sans-serif;--mono:'IBM Plex Mono',monospace;
}
"""

FONTS = '<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&amp;family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;display=swap" rel="stylesheet">'

def esc(s):
    return html.escape(s, quote=True)

def page(title, w, h, body):
    """One artboard. Root is fixed at the frame width, min-height the frame height; the footer
    stub sits at the bottom because the root is a flex column whose main region grows."""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{esc(title)}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONTS}
<style>
body{{margin:0;background:#14110E}}
{TOKENS}
a{{color:#DE9757}}a:hover{{color:#EDE6D8}}
</style>
</helmet>
<div style="width: {w}px; min-height: {h}px; box-sizing: border-box; display: flex; flex-direction: column; background: var(--bg); color: var(--fg); font-family: var(--sans); -webkit-font-smoothing: antialiased">
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
"""

# ---------------------------------------------------------------- marks

def crowned(size=32):
    # src/app/icon.svg geometry without its ground: the Crowned99 lockup.
    d = "M116 -38 112 -31Q219 2 279.5 43.0Q340 84 368.0 136.0Q396 188 403.0 253.5Q410 319 410 402Q410 485 406.0 540.5Q402 596 386.5 623.5Q371 651 334 651Q297 651 278.0 626.5Q259 602 252.0 563.0Q245 524 245 478Q245 421 251.5 389.0Q258 357 269.5 341.5Q281 326 295 320Q318 311 337.5 317.0Q357 323 370 331L377 323Q363 292 333.0 272.0Q303 252 264.0 246.0Q225 240 185.0 249.5Q145 259 111.5 285.5Q78 312 58.0 357.0Q38 402 40 467Q42 534 73.0 589.0Q104 644 168.0 677.0Q232 710 331 711Q478 713 556.5 633.0Q635 553 635 381Q635 274 603.0 189.5Q571 105 506.0 49.0Q441 -7 344.0 -30.5Q247 -54 116 -38Z"
    return f"""<svg width="{size}" height="{size}" viewBox="8 6 48 48" aria-hidden="true" style="display: block; flex: none"><rect x="12.007" y="11.703" width="7.381" height="7.381" transform="rotate(45 15.697 15.393)" fill="#CF8745"></rect><rect x="26.772" y="10.165" width="10.456" height="10.456" transform="rotate(45 32.000 15.393)" fill="#CF8745"></rect><rect x="44.612" y="11.703" width="7.381" height="7.381" transform="rotate(45 48.303 15.393)" fill="#CF8745"></rect><path transform="translate(12.903 49.849) scale(0.028293 -0.028293)" fill="#EDE6D8" d="{d}"></path><path transform="translate(32.000 49.849) scale(0.028293 -0.028293)" fill="#EDE6D8" d="{d}"></path></svg>"""

BRACKET_SVG = {
    1: '<path d="M20 8.5 L31.5 20 L20 31.5 L8.5 20 Z" fill="none" stroke="currentColor" stroke-width="1.8"></path>',
    2: '<path d="M20 3.5 L36.5 20 L20 36.5 L3.5 20 Z" fill="none" stroke="currentColor" stroke-width="1.8"></path>',
    3: '<path d="M20 8.5 L31.5 20 L20 31.5 L8.5 20 Z" fill="none" stroke="currentColor" stroke-width="1.8"></path><path d="M20 8.5 L20 3.2 M31.5 20 L36.8 20 M20 31.5 L20 36.8 M8.5 20 L3.2 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>',
    4: '<path d="M20 8.5 L31.5 20 L20 31.5 L8.5 20 Z" fill="none" stroke="currentColor" stroke-width="1.8"></path><path d="M20 1.2 L21.6 2.8 L20 4.4 L18.4 2.8 Z M37.2 18.4 L38.8 20 L37.2 21.6 L35.6 20 Z M20 35.6 L21.6 37.2 L20 38.8 L18.4 37.2 Z M2.8 18.4 L4.4 20 L2.8 21.6 L1.2 20 Z" fill="none" stroke="currentColor" stroke-width="1.4"></path>',
    5: '<path d="M20 8.5 L31.5 20 L20 31.5 L8.5 20 Z" fill="none" stroke="currentColor" stroke-width="1.8"></path><path d="M20 1.2 L38.8 20 L20 38.8 L1.2 20 Z" fill="none" stroke="currentColor" stroke-width="1.4"></path>',
}
BRACKET_NAME = {1: "Exhibition", 2: "Core", 3: "Upgraded", 4: "Optimized", 5: "cEDH"}

def bracket_mark(n, size=26):
    return f"""<span style="position: relative; display: inline-flex; width: {size}px; height: {size}px; flex: none; color: var(--bracket-{n})"><svg width="{size}" height="{size}" viewBox="0 0 40 40" aria-hidden="true" style="display: block">{BRACKET_SVG[n]}</svg><span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 700; font-size: {round(size*0.4)}px; line-height: 1">{n}</span></span>"""

GC_PATH = "M9.4 1.5 L4.1 8.8 H7.3 L6.6 14.5 L11.9 7.0 H8.7 Z"

def gc_glyph():
    return f'<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style="display: block; flex: none; filter: drop-shadow(0 0 3px rgba(143,166,190,.45))"><path d="{GC_PATH}" fill="#8FA6BE"></path></svg>'

def turn_icon(px):
    s = round(px * 0.5)
    return f'<svg width="{s}" height="{s}" viewBox="0 0 20 20" aria-hidden="true" style="display: block"><path d="M6.5 5.1A6 6 0 1 0 13.5 5.1" fill="none" stroke="#EDE6D8" stroke-width="1.7" stroke-linecap="round"></path><path d="m13.5 5.1 .31 2.6M13.5 5.1l2.55 .6" fill="none" stroke="#EDE6D8" stroke-width="1.7" stroke-linecap="round"></path></svg>'

# ---------------------------------------------------------------- mana

PIP_FILL = {"W": "var(--w)", "U": "var(--u)", "B": "var(--b)", "R": "var(--r)", "G": "var(--g)"}

def pip(sym, size):
    fill = PIP_FILL.get(sym)
    if fill:
        bg, fg = fill, "var(--bg)"
    else:
        bg, fg = "var(--border-dashed)", "var(--fg)"
    fs = max(9, round(size * 0.5))
    return f'<span style="display: inline-flex; width: {size}px; height: {size}px; border-radius: 50%; background: {bg}; color: {fg}; font-family: var(--mono); font-weight: 600; font-size: {fs}px; align-items: center; justify-content: center; box-shadow: inset 0 0 0 1px rgba(0,0,0,.35); flex: none; vertical-align: -0.2em">{esc(sym)}</span>'

def mana_cost(cost, size):
    """`{1}{G}{U}` → pips; `A // B` costs separated by a mono //."""
    halves = [h.strip() for h in cost.split("//")]
    out = []
    for i, h in enumerate(halves):
        if i:
            out.append('<span style="font-family: var(--mono); font-size: 13px; color: var(--fg-muted); padding: 0 4px">//</span>')
        out.extend(pip(s, size) for s in re.findall(r"\{([^}]+)\}", h))
    gap = 5 if size >= 26 else 4
    return f'<span style="display: inline-flex; align-items: center; gap: {gap}px; flex: none">{"".join(out)}</span>'

def oracle_html(text, keywords=(), pip_size=16):
    paras = []
    for line in text.split("\n"):
        s = esc(line)
        s = re.sub(r"\(([^)]*)\)", r'<em style="font-style: italic">(\1)</em>', s)
        for k in keywords:
            s = re.sub(r"(?<![\w(])(" + re.escape(k) + r")(?![\w])", r'<strong style="font-weight: 600; color: var(--fg)">\1</strong>', s, count=1)
        s = re.sub(r"\{([^}]+)\}", lambda m: pip(m.group(1), pip_size), s)
        paras.append(s)
    return "".join(
        f'<p style="margin: {0 if i == 0 else "0.5em"} 0 0 0">{p}</p>' for i, p in enumerate(paras)
    )

# ---------------------------------------------------------------- chrome

def ext(label, size=14, weight=500):
    """ExternalLink, as shipped (src/components/ui/external-link.tsx)."""
    return f'<a href="https://scryfall.com" target="_blank" rel="noopener" style="font-size: {size}px; font-weight: {weight}; line-height: 1.45; color: var(--accent-hover); text-decoration: underline; text-decoration-color: rgba(222,151,87,.45); text-underline-offset: 3px">{esc(label)}<span style="font-size: 0.85em; color: var(--fg-muted); text-decoration: none; display: inline-block; margin-left: 4px">&#8599;</span></a>'

def topbar(phone):
    if phone:
        return f"""<header style="height: 56px; flex: none; display: flex; align-items: center; justify-content: space-between; padding: 0 8px 0 16px; border-bottom: 1px solid var(--border); background: var(--bg)">
<a href="/" aria-label="The 99, home" style="display: flex; align-items: center; gap: 10px; text-decoration: none; min-height: 44px">{crowned(30)}<span style="font-family: var(--mono); font-size: 11px; letter-spacing: .32em; text-transform: uppercase; color: var(--accent)">The 99</span></a>
<span style="display: flex; align-items: center; min-height: 44px; padding: 0 8px">{ext("Search Scryfall", 13.5)}</span>
</header>"""
    return f"""<header style="height: 64px; flex: none; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; border-bottom: 1px solid var(--border); background: var(--bg)">
<a href="/" aria-label="The 99, home" style="display: flex; align-items: center; gap: 12px; text-decoration: none">{crowned(34)}<span style="font-family: var(--mono); font-size: 11px; letter-spacing: .4em; text-transform: uppercase; color: var(--accent)">The Ninety-Nine</span></a>
<span style="display: flex; align-items: center; gap: 10px">{ext("Find another card on Scryfall")}</span>
</header>"""

def footer_stub(phone):
    pad = "20px 16px 28px" if phone else "26px 40px 32px"
    h = 168 if phone else 120
    return f"""<footer style="flex: none; padding: {pad}; border-top: 1px solid var(--border); background: var(--bg)">
<div style="height: {h - 52}px; border: 1px dashed var(--border-dashed); border-radius: 10px; display: flex; align-items: center; justify-content: center; padding: 0 16px; text-align: center">
<span style="font-family: var(--mono); font-size: 11px; line-height: 1.6; letter-spacing: .04em; color: var(--fg-locked)">A0 &middot; Fan Content footer &middot; mounted by the root layout &middot; not redrawn here</span>
</div>
</footer>"""

def label(text, size=10.5):
    return f'<div style="font-family: var(--mono); font-size: {size}px; letter-spacing: .14em; text-transform: uppercase; color: var(--fg-faint)">{esc(text)}</div>'

def signed_out(phone):
    """The one quiet block (§Open 4). It asks for nothing: no field, no form."""
    pad = "18px 16px" if phone else "20px 22px"
    return f"""<section aria-label="About The 99" style="border-radius: 12px; border: 1px solid var(--border); background: var(--surface-rail); padding: {pad}; display: flex; flex-direction: column; gap: 14px">
<div style="display: flex; gap: 14px; align-items: flex-start">
{crowned(30)}
<div style="display: flex; flex-direction: column; gap: 6px; min-width: 0">
<div style="font-family: var(--display); font-weight: 600; font-size: 16px; line-height: 1.25; color: var(--fg)">This is The 99</div>
<p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--fg-body)">A Commander companion: it reads the cards you own and builds decks from them. It&rsquo;s invite-only, so the way in is a friend who already plays.</p>
</div>
</div>
<div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding-left: 44px">
<a href="/sign-in" style="display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 20px; border-radius: 8px; border: 1px solid var(--border-strong); background: var(--surface-raised); color: var(--fg); font-size: 14px; font-weight: 600; text-decoration: none">Sign in</a>
<span style="font-family: var(--mono); font-size: 11px; line-height: 1.5; color: var(--fg-faint)">Have an invitation? Open its link.</span>
</div>
</section>"""

# ---------------------------------------------------------------- cards

COLORLESS = "linear-gradient(150deg,#b3a488,#726755 58%,#453e31)"

def tilt_card(src, w, radius=14, alt="", tilt=True):
    h = round(w * 88 / 63)
    tf = "transform: perspective(1000px) rotateX(2.5deg) rotateY(-4deg);" if tilt else ""
    return f"""<div style="width: {w}px; height: {h}px; border-radius: {radius}px; overflow: hidden; flex: none; {tf} box-shadow: 0 0 0 1px rgba(0,0,0,.3) inset, 0 24px 50px rgba(0,0,0,.55); background: var(--elevated)"><img src="{src}" alt="{esc(alt)}" style="display: block; width: 100%; height: 100%; object-fit: cover"></div>"""

def gradient_card(w, grad, radius=14, tilt=True):
    h = round(w * 88 / 63)
    tf = "transform: perspective(1000px) rotateX(2.5deg) rotateY(-4deg);" if tilt else ""
    return f'<div role="img" aria-label="No image for this card" style="width: {w}px; height: {h}px; border-radius: {radius}px; flex: none; {tf} background: {grad}; box-shadow: 0 0 0 1px rgba(0,0,0,.3) inset, 0 24px 50px rgba(0,0,0,.55)"></div>'

def missing_scan(w, face, radius=14):
    """A canvas-only placeholder: the design folder holds no double-faced scan."""
    h = round(w * 88 / 63)
    return f"""<div style="width: {w}px; height: {h}px; border-radius: {radius}px; flex: none; border: 1.5px dashed var(--border-dashed); background: repeating-linear-gradient(135deg, var(--surface-rail) 0 10px, var(--surface-sunken) 10px 20px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 18px; box-sizing: border-box; text-align: center">
<span style="font-family: var(--mono); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--fg-faint)">canvas placeholder</span>
<span style="font-family: var(--display); font-size: 17px; font-weight: 600; color: var(--fg-body)">{esc(face)}</span>
<span style="font-family: var(--mono); font-size: 10.5px; line-height: 1.5; color: var(--fg-locked)">no scan of this face in the design folder &middot; the build draws the Scryfall image here</span>
</div>"""

def flip_button(px=44, label="Turn over"):
    return f'<button type="button" aria-label="{esc(label)}" style="width: {px}px; height: {px}px; border-radius: 7px; border: 1px solid var(--border-strong); background: rgba(20,17,14,.86); display: inline-flex; align-items: center; justify-content: center; padding: 0; cursor: pointer">{turn_icon(px)}</button>'

def dot(colors):
    if not colors:
        return ""
    fill = PIP_FILL[colors[0]] if len(colors) == 1 else "var(--fg-faint)"
    return f'<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: {fill}; box-shadow: inset 0 0 0 1px rgba(0,0,0,.4); flex: none"></span>'

COLOR_NAME = {"W": "White", "U": "Blue", "B": "Black", "R": "Red", "G": "Green"}

def identity_text(colors):
    if not colors:
        return "Colorless"
    if len(colors) == 1:
        return COLOR_NAME[colors[0]]
    return "/".join(colors)
