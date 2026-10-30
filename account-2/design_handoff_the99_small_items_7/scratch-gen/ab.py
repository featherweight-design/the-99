#!/usr/bin/env python3
"""Small items 7 · item 6: what About's Shopping for all decks entry captures. Drawn over the About visual pages
(design_handoff_the99_about_visual: numbered pins, words in a list, phone shot under / desktop 700 beside) with the cart
from All decks cart v2's By friend boards. Usage: ab.py <By-Friend.dc.html> <out.dc.html> [blobs.json]"""
import re, sys, json

src, out = sys.argv[1], sys.argv[2]
blobs = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else None
s = open(src).read()


def block(start):
    d = 0
    for m in re.finditer(r'<(/?)div\b', s[start:]):
        d += -1 if m.group(1) else 1
        if d == 0:
            return s[start:s.find('>', start + m.start()) + 1]


helmet = s[s.find('<helmet>'):s.find('</helmet>')]
PH = block(s.find('<div class="ph" style="">'))
DK = block(s.find('<div class="dk" style="width:1300px;height:980px">'))
MHD = block(PH.find('<div class="mhd">') + s.find('<div class="ph" style="">'))
TBAR = block(PH.find('<div class="tbar">') + s.find('<div class="ph" style="">'))
RAIL = block(DK.find('<div class="rail">') + s.find('<div class="dk" style="width:1300px;height:980px">'))
CART_PH = PH.replace('<div class="ph" style="">', '<div class="ph" style="height:844px">', 1).replace(
    '<div class="pb" style="flex:none">', '<div class="pb" style="flex:1 1 auto;min-height:0">', 1)
CART_DK = DK.replace('height:980px', 'height:900px', 1)

CSS = """<style>
.ab{flex:1 1 auto;min-height:0;overflow:hidden;padding:18px 16px 0;display:flex;flex-direction:column}
.dk .ab{padding:34px 48px 0}
.ab .ak{font:11px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.ab h1{margin:6px 0 0;font:700 24px/1.2 'Cinzel',serif;color:var(--fg)}
.ab .as{margin-top:6px;font-size:13.5px;line-height:1.5;color:var(--fg-muted)}
.ab .tabs{display:flex;gap:18px;margin-top:16px;border-bottom:1px solid var(--border);font-size:13.5px;color:var(--fg-muted);white-space:nowrap;overflow:hidden}
.ab .tabs span{padding:0 0 9px}
.ab .tabs .on{color:var(--fg);border-bottom:2px solid var(--accent)}
.ab .otp{margin-top:14px;font:10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.ab .chs2{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
.ab .chs2 span{height:32px;padding:0 12px;border-radius:16px;border:1px solid var(--border-strong);display:flex;align-items:center;font-size:12.5px;color:var(--fg-body)}
.ab .chs2 .on{border-color:var(--accent);color:var(--fg)}
.ab .skk{margin-top:26px;font:10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.ab h2{margin:6px 0 0;font:700 19px/1.25 'Cinzel',serif;color:var(--fg)}
.ab .ss{margin-top:5px;font-size:13px;line-height:1.5;color:var(--fg-muted);text-wrap:pretty}
.ab .ss b{color:var(--fg-body);font-weight:600}
.ab .sec{display:flex;flex-direction:column;gap:16px;margin-top:14px}
.dk .ab .sec{flex-direction:row;gap:36px;align-items:flex-start}
.shot{position:relative;flex:none;border-radius:12px;overflow:hidden;border:1px solid var(--border-strong);background:var(--bg);align-self:center}
.dk .shot{align-self:flex-start}
.shot img{display:block;width:100%;height:auto}
.shot .sc{transform-origin:0 0;position:absolute;left:0;top:0}
.shot .sc>.ph,.shot .sc>.dk{border-radius:0;border:0}
.pin{position:absolute;z-index:5;width:24px;height:24px;border-radius:50%;background:var(--accent);color:var(--bg);font:700 12px/24px 'IBM Plex Sans';text-align:center;box-shadow:0 2px 8px rgb(0 0 0/.5)}
.lbl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.dk .lbl{flex:1;max-width:360px;padding-top:4px}
.lbl li{display:grid;grid-template-columns:24px 1fr;gap:10px;font-size:13.5px;line-height:1.5;color:var(--fg-body);text-wrap:pretty}
.lbl li i{width:24px;height:24px;border-radius:50%;background:var(--accent);color:var(--bg);font:700 12px/24px 'IBM Plex Sans';text-align:center;font-style:normal}
.lbl li b{color:var(--fg);font-weight:600}
.lbl li small{display:block;margin-top:2px;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.rule{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);padding:20px 24px;max-width:1240px}
.rule h4{margin:0 0 10px;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.rule ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.rule b{color:var(--fg)}
.rule code{font:12px 'IBM Plex Mono';color:var(--fg-muted)}
</style>"""

TABS = '<div class="tabs"><span>Home</span><span>Collection</span><span>Commanders</span><span>Decks</span><span class="on">Shopping</span><span>Friends</span></div>'
HEAD = ('<div class="ak">About The 99</div><h1>Shopping</h1><p class="as">What your decks still need, and the cheaper ways to get them.</p>'
        + TABS + '<div class="otp">On this page</div><div class="chs2"><span>A deck’s Shopping</span><span class="on">Shopping for all decks</span></div>')
SUB = "Every deck’s missing cards in one cart, basic lands aside. A big cart goes to Mana Pool in parts."


def pins(boxes, k):
    return "".join(f'<span class="pin" style="left:{max(6, round(x * k) + 6)}px;top:{max(6, round(y * k) + 6)}px">{n}</span>'
                   for n, (x, y) in enumerate(boxes, 1))


def lbl(items):
    return '<ol class="lbl">' + "".join(f'<li><i>{n}</i><span>{t}</span></li>' for n, t in enumerate(items, 1)) + '</ol>'


def img_shot(src, w, h, regions):
    return (f'<div class="shot" style="width:{w}px;height:{h}px"><img src="{src}" alt="" width="{w}" height="{h}">'
            + pins([(rx * w, ry * h) for rx, ry in regions], 1) + '</div>')


def cart_shot(html, nat_w, nat_h, w, boxes):
    k = w / nat_w
    return (f'<div class="shot" style="width:{w}px;height:{round(nat_h * k)}px"><div class="sc" style="width:{nat_w}px;transform:scale({k:.4f})">{html}</div>'
            + pins(boxes, k) + '</div>')


NOW_L = ["<b>Shop all decks</b> puts every deck’s missing cards in one cart for Mana Pool."]
NEW_L = ["<b>The total</b> is every picked deck’s missing cards at single-copy prices. <b>Buy these at Mana Pool</b> sends them there, in parts when it’s big.",
         "<b>Decks</b> picks which decks the cart shops for. Brews count.",
         "<b>By card, By deck, By friend</b> read the same cart three ways. By friend lists each friend’s spares.",
         "<b>Ask</b> asks that friend for their spare.<small>with friend spares on</small>",
         "<b>buy</b>: press it once you’ve bought the card, and it goes into your Collection.<small>with collection edits on</small>"]
# Measured on the cart frames (left, top of each region): checkout, decks, view switch, the first Ask, the first row's buy.
PH_BOX = [(17, 194), (17, 340), (17, 412), (286, 650), (272, 696)]
DK_BOX = [(85, 420), (85, 125), (389, 125), (1198, 373), (1176, 408)]


def phone_page(section, h):
    return (f'<div class="ph" style="height:{h}px">{MHD}<div class="ab">{HEAD}{section}</div>{TBAR}</div>')


def desk_page(section, h):
    return (f'<div class="dk" style="width:1300px;height:{h}px">{RAIL}<div class="ab" style="flex:1">{HEAD}{section}</div></div>')


def section(shot, items, extra=""):
    return (f'<div class="skk">Shopping · Shopping for all decks</div><h2>Shopping for all decks</h2>'
            f'<p class="ss">{SUB}{extra}</p><div class="sec">{shot}{lbl(items)}</div>')


WAYIN = " Open it from Decks with <b>Shop all decks</b>."
p_now = phone_page(section(img_shot("art/p-decks.webp", 270, 584, [(0.041, 0.2322)]), NOW_L), 1160)
p_new = phone_page(section(cart_shot(CART_PH, 390, 844, 270, PH_BOX), NEW_L, WAYIN), 1420)
d_now = desk_page(section(img_shot("art/d-decks2.webp", 700, 485, [(0.0646, 0.09)]), NOW_L), 900)
d_new = desk_page(section(cart_shot(CART_DK, 1300, 900, 700, DK_BOX), NEW_L, WAYIN), 900)


def fr(lab, cap, inner):
    return f'<div class="fr"><div class="lab">{lab}</div>{inner}<p class="cap">{cap}</p></div>'


frames = (fr('<b>Now</b> · 390', 'The entry’s one shot is /decks, with its one pin on the Shop all decks button. The cart itself is never shown, and a reader on the cart who presses ? has no section to land on.', p_now)
          + fr('<b>Now</b> · 1300', 'The /decks capture at 700, its pin on the Shop all decks box.', d_now)
          + fr('<b>Proposed</b> · 390', 'The shot is the cart (By friend, the fixture account): five pins on the checkout, Decks, the view switch, Ask and buy. Shop all decks moves into the sub line as the way in.', p_new)
          + fr('<b>Proposed</b> · 1300', 'The cart at 700, labels beside it as every desktop section reads.', d_new))

RULE = ('<div class="rule"><h4>The call</h4><ol>'
        '<li><b>The entry captures the cart, not its way in.</b> New captures <code>p-cart</code> and <code>d-cart</code>: <code>/decks/cart</code> in By friend on the G1 fixture account (6 decks picked, the four fixture friends), top of the page. <code>p-decks</code> and <code>d-decks2</code> stay for Decks › Your decks.</li>'
        '<li><b>Five labels, at the ceiling:</b> the checkout (<code>shopping/all-decks/total</code>), Decks (<code>…/decks</code>), the view switch (<code>…/views</code>), Ask (<code>…/ask</code>, behind the friend spares switch) and buy (<code>…/buy</code>, behind the collection edit switch). A label whose switch is off goes and the numbers close up, as States rules.</li>'
        '<li><b>The way in becomes a sentence:</b> the sub line ends “Open it from Decks with <b>Shop all decks</b>.” (draft). The <code>shopping/all-decks/cart</code> region on the Decks shots retires; its label’s legacy link (<code>all-decks-cart</code>) points at this section.</li>'
        '<li><b>? on the cart lands here</b>, with label 1 lit and “‹ Back to Shopping for all decks”. <code>screen-for-path</code> stops treating the cart as a page no entry lives on.</li>'
        '<li>Label copy is draft for /copy-review. No new token or piece: pins, list and frame are About visual’s.</li>'
        '</ol></div>')

board = ('<div class="board" style="width:1880px"><div class="bh"><div class="kick"><span class="tag">R1</span>6 · About · Shopping for all decks</div>'
         '<h2>The entry shows the cart itself</h2>'
         '<p>Today the Shopping for all decks section pictures /decks and pins its Shop all decks button, so the cart never appears in About. Drawn as the shipped About page at 390 and 1300, now and proposed.</p></div>'
         f'<div class="frames" style="gap:44px;flex-wrap:wrap;row-gap:60px;align-items:flex-start">{frames}</div>{RULE}</div>')

html = s[:s.find('<x-dc>')] + '<x-dc>\n' + helmet + CSS + '</helmet>\n' + board + '\n</x-dc>\n' + s[s.find('<script type="text/x-dc"'):]
html = html.replace('<title>All decks cart v2 · By friend</title>', '<title>Small items 7 · About cart entry</title>')
if blobs:
    for k, v in blobs.items():
        html = html.replace(f'art/{k}', v)
open(out, 'w').write(html)
