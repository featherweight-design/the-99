#!/usr/bin/env python3
"""Builds the About R4 canvas (Hugh's 2026-10-29 feedback) as one HTML page over the real Low Sun captures."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))

# Phone picture: 390 frame minus the page's 16px gutters. Captures are 780x1688.
PW = 358
PH = round(PW * 1688 / 780)
DW, DH = 700, round(700 * 1350 / 1950)

# Label copy, verbatim from src/lib/copy/about-pages.ts (Decks > Your deck).
LABELS = {
    "commit": ("Your changes", " wait here until you commit. “Commit as v2” saves them as the deck’s next version."),
    "mix": ("Recommended mix", " counts ramp, draw, removal, wipes and lands against what decks like yours run. “consider →” shows cards that fill a gap."),
    "lock": ("Lock cards", " protects the cards you pick. No tool will cut a locked card unless you say so."),
    "row": ("A row’s dot", " shows whether you own the card: filled green is in your Collection, hollow and dashed is not, or is a proxy. A bright edge marks a row you changed since your last commit."),
    "bracket": ("The marks after a name", " flag Game Changers (WotC’s list) plus mass land denial, extra turns and tutors, which are read from card text and can miss one."),
}
# Regions from src/lib/about/page-shots.generated.ts (amonkhet, phone), numbered in reading order.
SHOT1 = [("commit", 1, (0.6795, 0.1774, 0.2462, 0.0427)), ("mix", 2, (0, 0.317, 1, 0.1964)), ("lock", 3, (0.041, 0.671, 0.2974, 0.0521))]
SHOT2 = [("row", 4, (0.0641, 0.4256, 0.0205, 0.0095)), ("bracket", 5, (0.3478, 0.7739, 0.041, 0.019))]
D_MIX = (0.0477, 0.5124, 0.9523, 0.2092)


def clamp(v, lo, hi):
    return min(max(v, lo), max(lo, hi))


def pin_now(box, w, h):
    """Shipped rule (pins.ts): centre 14px inside the region's top-left, clamped inside the picture."""
    x, y = box[0] * w, box[1] * h
    return clamp(x + 14, 12, w - 12), clamp(y + 14, 12, h - 12)


def _unused_pin_new(box, w, h):
    """Proposed rule: beside the region, never on it. Left of it when there is room, else right of it, else (a region
    as wide as the picture) on its top edge, where a region's border and padding sit rather than its content."""
    x, y, bw, bh = box[0] * w, box[1] * h, box[2] * w, box[3] * h
    cy = clamp(y + min(bh, 28) / 2, 12, h - 12)
    if x - 16 >= 12:
        return x - 16, cy, "left"
    if x + bw + 16 <= w - 12:
        return x + bw + 16, cy, "right"
    return clamp(x + 28, 12, w - 12), clamp(y, 12, h - 12), "edge"


def halo(box, w, h, inset):
    x, y = box[0] * w, box[1] * h
    r, b = x + box[2] * w, y + box[3] * h
    if inset:
        x, y = clamp(x, 8, w - 8), clamp(y, 8, h - 8)
        r, b = max(min(r, w - 8), x), max(min(b, h - 8), y)
    return f'<span class="halo" style="left:{x:.1f}px;top:{y:.1f}px;width:{r - x:.1f}px;height:{b - y:.1f}px"></span>'


G = 30  # the proposed pin gutter, left of the picture


def picture(src, w, h, regions, mode, lit=None, inset=False, radius=20, extra=""):
    """`w` is the column the picture fills. Proposed mode gives the pins a 30px gutter of their own, so the capture is
    drawn 30px narrower and no pin ever sits on it: each pin rides the gutter at its region's height, with a hairline
    leader to the region's left edge."""
    if mode == "new":
        iw = w - G
        ih = round(iw * h / w)
        inner = picture(src, iw, ih, regions, None, lit=lit, inset=inset, radius=radius, extra=extra)
        ys = []
        for key, n, box in sorted(regions, key=lambda r: r[1]):
            cy = clamp(box[1] * ih + min(box[3] * ih, 28) / 2, 12, ih - 12)
            if ys and cy - ys[-1][1] < 28:
                cy = ys[-1][1] + 28
            ys.append((key, cy, n, box))
        bits = []
        for key, cy, n, box in ys:
            on = " on" if key == lit else ""
            tx = G + box[0] * iw
            ty = clamp(box[1] * ih + min(box[3] * ih, 28) / 2, 0, ih)
            # leader: from the pin's edge to the region's left edge, bent to the region's own height when the pin slid
            bits.append(f'<span class="lead{on}" style="left:{G/2+12:.1f}px;top:{cy:.1f}px;width:{max(tx-G/2-12,0):.1f}px"></span>')
            if abs(ty - cy) > 0.5:
                bits.append(f'<span class="leadv{on}" style="left:{tx:.1f}px;top:{min(ty,cy):.1f}px;height:{abs(ty-cy):.1f}px"></span>')
            bits.append(f'<span class="tick{on}" style="left:{tx:.1f}px;top:{ty:.1f}px"></span>')
            bits.append(f'<span class="pin{on}" style="left:{G/2:.1f}px;top:{cy:.1f}px">{n}</span>')
        return f'<div class="gut" style="width:{w}px;height:{ih}px;padding-left:{G}px">{inner}{"".join(bits)}</div>'
    out = [f'<div class="shot" style="width:{w}px;height:{h}px;border-radius:{radius}px">',
           f'<img src="art/{src}" width="{w}" height="{h}" alt="">']
    for key, n, box in regions:
        if key == lit:
            out.append(halo(box, w, h, inset))
    if mode == "now":
        for key, n, box in regions:
            on = " on" if key == lit else ""
            px, py = pin_now(box, w, h)
            out.append(f'<span class="pin{on}" style="left:{px:.1f}px;top:{py:.1f}px">{n}</span>')
    out.append(extra)
    out.append("</div>")
    return "".join(out)


def label_list(keys, lit=None):
    rows = []
    for key, n in keys:
        lead, rest = LABELS[key]
        on = " on" if key == lit else ""
        rows.append(f'<li class="lab{on}"><span class="num">{n}</span><span><b>{lead}</b>{rest}</span></li>')
    return f'<ol class="labs">{"".join(rows)}</ol>'


def mark_diamond():
    return '<span class="plate"><i class="dia"></i></span>'


def mark_try_new():
    # A plate, the Good to know family, holding a small four-point spark: square, filled, no ring and no arrow, so it
    # cannot read as the cards' round press.
    return '<span class="plate try"><svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M6 0 L7.3 4.7 L12 6 L7.3 7.3 L6 12 L4.7 7.3 L0 6 L4.7 4.7 Z" fill="currentColor"/></svg></span>'


RULES = [
    ("lock", "A locked card is safe from every tool: none will offer to cut it, and updating the deck from a list starts it kept. The lock ends when you commit a version without the card.",
     '<div class="dg"><div class="crow"><i class="dot own"></i><span>Craterhoof Behemoth</span><em class="tag">locked</em></div>'
     '<p class="dcap">Every tool skips it</p><div class="chips"><s>Suggested changes</s><s>Proposed cuts</s><s>Clear all auto</s></div></div>'),
    ("targets", "Targets come from the closest decks EDHREC can measure: decks with your commander first, then decks in its colors. Going over a target never counts against you.",
     '<div class="dg"><p class="dcap">Kinnan · targets from Kinnan decks</p><div class="cells">'
     '<div><b>Ramp</b><span>18 / 16</span><i style="--p:100%"></i></div><div><b>Draw</b><span>9 / 10</span><i style="--p:90%"></i></div>'
     '<div><b>Wipes</b><span>1 / 3</span><i style="--p:33%" class="lo"></i></div></div></div>'),
]


def rule_card(key, text, diagram):
    return f'<article class="rule"><div class="rpic">{diagram}</div><p>{text}</p></article>'


def good_to_know(new):
    cards = "".join(f"<li>{rule_card(*r)}</li>" for r in RULES)
    head = (f'<div class="sh{" stacked" if new else ""}">{mark_diamond()}<h3>Good to know</h3><span>What the screen can’t show</span></div>')
    dots = '<div class="dots"><i class="on"></i><i></i><i></i></div>'
    if new:
        return f'<div class="panel gtk">{head}<ul class="swipe">{cards}</ul>{dots}</div>'
    return f'<div class="blk">{head}<ul class="swipe">{cards}</ul>{dots}</div>'


TOOLS = {
    "lineup": ("Stats for your decks", "Every deck side by side: when each last played, and how it went.", "See your decks on Stats", "tool-lineup.webp", "d-tool-lineup.webp", (0.2211, 0.3938, 0.0861, 0.0693)),
    "precons": ("Precons", "Any Commander precon, with how many of its cards you already own.", "Browse precons", "tool-precons.webp", "d-tool-precons.webp", (0.0569, 0.1871, 0.9092, 0.1397)),
}


def tool_now(key, desktop=False):
    name, line, press, ph, dk, hb = TOOLS[key]
    pic = f'<div class="tpic"><img src="art/{dk if desktop else ph}" alt="">'
    if desktop:
        pic += f'<span class="thalo" style="left:{hb[0]*100}%;top:{hb[1]*100}%;width:{hb[2]*100}%;height:{hb[3]*100}%"></span>'
    pic += "</div>"
    return (f'<article class="tc">{pic}<div class="tbd"><h4>{name}</h4><p>{line}</p>'
            f'<div class="tft"><span class="sm">Show me ›</span><span class="go">{press}</span><span class="ring">→</span></div></div></article>')


def tool_new(key, desktop=False):
    name, line, press, ph, dk, hb = TOOLS[key]
    pic = f'<div class="npic"><img src="art/{dk if desktop else ph}" alt="">'
    if desktop:
        pic += f'<span class="thalo" style="left:{hb[0]*100}%;top:{hb[1]*100}%;width:{hb[2]*100}%;height:{hb[3]*100}%"></span>'
    pic += "</div>"
    return (f'<article class="ntc">{pic}<div class="nbd"><h4>{name}</h4><p>{line}</p>'
            f'<span class="where">Where it is on the screen above ↑</span>'
            f'<span class="btn">{press} <b>→</b></span></div></article>')


def try_it(new, open_more=False):
    if new:
        head = f'<div class="sh stacked">{mark_try_new()}<h3>Try it</h3><span>Each card opens the tool for real</span></div>'
        stack = f'<div class="stack">{tool_new("lineup")}<div class="peek"></div><div class="peek two"></div></div>'
        more = '<span class="morebtn">Show 1 more tool <b>▾</b></span>'
        return f'<div class="panel try">{head}{stack}{more}</div>'
    head = f'<div class="sh"><span class="ringmark">→</span><h3>Try it</h3><span>Each card opens the tool for real</span></div>'
    return f'<div class="blk">{head}{tool_now("lineup")}<span class="more">1 more below ▾</span></div>'


def section_head(name, sub, new, n=None):
    if new:
        return (f'<div class="sech new"><span class="kick">Decks · screen {n} of 4</span><h2>{name}</h2><p>{sub}</p></div>')
    return f'<div class="sech"><span class="kick">Decks · {name}</span><h2>{name}</h2><p>{sub}</p></div>'


def phone_section(new):
    """Decks › Your decks, below its capture: labels, Try it, then the next screen's start (Your deck), whose Good to
    know follows its own capture. Drawn as one tall phone column so the boundaries can be read."""
    crop = f'<div class="cropwrap"><img src="art/p-decks.webp" width="{PW}" height="{PH}" alt="" style="margin-top:-{PH-150}px"></div>'
    decks_labels = '<ol class="labs"><li class="lab"><span class="num">3</span><span><b>Stats</b> puts every deck side by side: when each was last played, and how it went.</span></li><li class="lab"><span class="num">4</span><span><b>A deck’s status</b> says what to do next.</span></li></ol>'
    s1 = f'{crop}{decks_labels}{try_it(new)}'
    crop2 = f'<div class="cropwrap"><img src="art/p-deck-your-deck.webp" width="{PW}" height="{PH}" alt="" style="margin-top:-{PH-150}px"></div>'
    s2 = f'{section_head("Your deck", "The list, and what each row is telling you.", new, 2)}<div class="ellip">⋯ two captures and five labels ⋯</div>{crop2}{label_list([("row", 4), ("bracket", 5)])}{good_to_know(new)}'
    cls = "page new" if new else "page"
    sep = '<div class="screensep"></div>' if new else ""
    return f'<div class="{cls}"><div class="sec">{s1}</div>{sep}<div class="sec{" first-rule" if not new else ""}">{s2}</div></div>'


TABBAR = '<div class="tabbar"><span class="on"><i></i>Home</span><span class="cur"><i></i>Decks</span><span><i></i>Collection</span><span><i></i>Commanders</span><span><i></i>Friends</span></div>'
PHEAD = '<div class="phead"><b>The 99</b><span>?</span></div>'


def viewport(new):
    """A 390x844 phone viewport, scrolled so the first Your deck capture fills it; pin 3 (Lock cards) just tapped."""
    pic = picture("p-deck-top.webp", PW, PH, SHOT1, "new" if new else "now", lit="lock", inset=True)
    body = f'<div class="vpbody" style="top:-140px">{section_head("Your deck", "The list, and what each row is telling you.", False)}<div style="padding:0 16px">{pic}</div><div style="padding:16px 16px 0">{label_list([("commit",1),("mix",2),("lock",3)], lit="lock")}</div></div>'
    dock = ""
    if new:
        lead, rest = LABELS["lock"]
        dock = (f'<div class="dock"><span class="num">3</span><p><b>{lead}</b>{rest}</p><span class="x">✕</span></div>')
    # page offset: section head ~ 92px tall at -140 scroll, picture starts after it
    return f'<div class="vp">{PHEAD}<div class="vpclip">{body}</div>{dock}{TABBAR}</div>'


def board(n, kicker, title, intro, frames, notes=""):
    return (f'<section class="board" id="b{n}"><header class="bh"><span class="kick"><span class="tag">{n}</span>{kicker}</span>'
            f'<h2>{title}</h2><p>{intro}</p></header><div class="frames">{frames}</div>{notes}</section>')


def fr(label, cap, inner, tone=""):
    return f'<figure class="fr {tone}"><figcaption class="lab2">{label}</figcaption>{inner}<p class="cap">{cap}</p></figure>'


def build():
    css = open(os.path.join(HERE, "canvas.css")).read()
    b = []

    # 1 · Pins
    b.append(board(1, "Numbered circles", "The number sits beside what it names, never on it",
        "Today a pin sits 14px inside its region’s top-left corner, so on a small region (the commit button, the lock toggle, a row’s 4px dot) the 24px disc covers the very thing it describes. Placing it beside the region does not hold up either: these screens are dense, and beside one control is on top of the next. Proposed: the pins move <b>off the picture</b> into a 30px gutter on its left, each at its region’s height, with a hairline leader that ends in a small tick at the region’s edge. The capture is drawn 30px narrower to make room. Lit, the leader and tick turn full accent along with the halo. Two pins closer than 28px slide apart down the gutter and the leader bends to follow. Numbers, reading order and five pins a picture are unchanged, and the same rule holds on desktop.",
        fr("Now · Your deck, shot 1", "Pin 1 covers “Commit as v2”, pin 3 covers the lock toggle.", picture("p-deck-top.webp", PW, PH, SHOT1, "now"), "was")
        + fr("Proposed · shot 1", "Nothing on the capture is covered; each leader ends at its control.", picture("p-deck-top.webp", PW, PH, SHOT1, "new"), "is")
        + fr("Now · shot 2", "Pin 4 hides the row’s dot entirely; pin 5 hides the bracket mark.", picture("p-deck-your-deck.webp", PW, PH, SHOT2, "now"), "was")
        + fr("Proposed · shot 2", "The row’s dot and the bracket mark stay visible, each with its leader.", picture("p-deck-your-deck.webp", PW, PH, SHOT2, "new"), "is")))

    # 2 · Highlight cut off
    b.append(board(2, "Highlight boxes", "A lit region keeps its whole ring",
        "A region that touches the picture’s edge drew its ring outside the frame, and the frame’s rounded, clipped edge cut it off. Recommended mix runs to the right edge on desktop and across the full width on a phone. Proposed: the lit box is held 8px inside the frame, which also clears the rounded corners, so the ring always closes.",
        fr("Now · desktop, Recommended mix lit", "The ring is cut off down the right side.", picture("d-deck-top.webp", DW, DH, [("mix", 2, D_MIX)], None, lit="mix", radius=12), "was")
        + fr("Proposed", "The ring closes on all four sides.", picture("d-deck-top.webp", DW, DH, [("mix", 2, D_MIX)], None, lit="mix", inset=True, radius=12), "is")))

    # 3 · Phone tap
    b.append(board(3, "Tapping a number on a phone", "Tapping a number shows its words where you are looking",
        "A phone capture is taller than the screen, so the label list starts below the fold. Tapping pin 3 lit the lock toggle and nothing else visibly changed. Proposed: the tap also docks that label in a small card above the tab bar. It stays while the region is lit; tapping another pin swaps it, and ✕ or tapping the pin again puts it out. The page does not move, so the lit region stays in view. The full list below the capture is unchanged.",
        fr("Now · pin 3 tapped", "The region lights, but the words are about 300px below the fold.", viewport(False), "was")
        + fr("Proposed · pin 3 tapped", "Region and words on one screen; the page has not scrolled.", viewport(True), "is"),
        '<div class="note">An alternative, already built: scroll just far enough to show the label line. It is simpler, but on a tall capture it can push the lit region off the top, which is why the dock is the recommendation.</div>'))

    # 4 · Sections + Try it heading + more below (phone)
    b.append(board(4, "Sections, Try it heading, “more below”", "Each part of a screen reads as its own block",
        "Three of your points meet in one stretch of the phone page. <b>Good to know</b> and <b>Try it</b> shared one heading style and sat straight on the page, so they ran into each other and into the next screen. Proposed: each sits on its own panel, with Good to know on the sunken surface and Try it faintly lit in the accent, and a wide band now separates one screen from the next, with the screen’s place on the page in its kicker. The <b>Try it heading</b> loses the round arrow, which was the same shape as each card’s press. Its mark is now a square plate in Good to know’s family. <b>“1 more below”</b> becomes a full-width button with the count, and the cards behind the first one peek out under it, so it is clear there are more.",
        fr("Now · Decks, end of Your decks into Your deck", "Try it’s round arrow matches the card’s press. “1 more below” is 10px faint mono. Good to know and Try it differ only by their marks.", phone_section(False), "was")
        + fr("Proposed", "Two panels, a band between screens, a square mark, and a real button with a peek of the next card.", phone_section(True), "is")))

    # 5 · Tool card
    b.append(board(5, "Tool cards", "One way in per card",
        "Today the whole card is the press (Try it), “Show me ›” is a second link inside it, and the picture runs edge to edge into the text. Proposed: the card has <b>one</b> press, a solid button that says where it goes. Only the button opens the tool, so the picture is no longer a hidden hit area. The picture sits inset in its own frame, apart from the words. Show me becomes a plain line under the description saying what it does: it points out the tool on the screen above.",
        fr("Now · phone", "Two presses, plus a picture that is also a press.", f'<div style="width:{PW}px">{tool_now("lineup")}</div>', "was")
        + fr("Proposed · phone", "One button. The picture is framed, not clickable.", f'<div style="width:{PW}px">{tool_new("lineup")}</div>', "is")
        + fr("Now · desktop row", "", f'<div class="drow">{tool_now("lineup", True)}{tool_now("precons", True)}</div>', "was")
        + fr("Proposed · desktop row", "Buttons sit on one baseline across the row.", f'<div class="drow">{tool_new("lineup", True)}{tool_new("precons", True)}</div>', "is")))

    intro = """<header class="top"><span class="kick">The 99 · About · R4 for Hugh’s audit · 2026-10-29</span>
<h1>About pages, after the build</h1>
<p>Your seven notes, drawn over the shipped pages and real Low Sun captures (Decks › Your decks and Your deck). Each board shows <span class="pillw">Now</span> beside <span class="pilli">Proposed</span>. New strings are drafts for copy review.</p>
<ol class="map">
<li><b>Circles cover what they describe</b><a href="#b1">Board 1</a></li>
<li><b>Try it header looks like a button</b><a href="#b4">Board 4</a></li>
<li><b>Confusing card CTAs, picture bleeds into text</b><a href="#b5">Board 5</a></li>
<li><b>Highlight boxes cut off</b><a href="#b2">Board 2</a></li>
<li><b>Tapping a number on a phone does nothing visible</b><a href="#b3">Board 3</a></li>
<li><b>Good to know and Try it blend together</b><a href="#b4">Board 4</a></li>
<li><b>“X more below” too subtle on a phone</b><a href="#b4">Board 4</a></li>
</ol></header>"""

    html = f"""<title>About R4 Canvas</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>{css}</style>
<main class="canvas">{intro}{"".join(b)}</main>
"""
    open(os.path.join(HERE, "about-r4.html"), "w").write(html)


build()
