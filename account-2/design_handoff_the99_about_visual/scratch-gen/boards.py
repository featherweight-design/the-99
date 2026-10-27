"""About as six visual pages R1: the boards."""
import kit
from kit import img, board_head, frame, frames, doc, phone, desk
import pieces as P
from pieces import shot, crop, area_page, section, strip, onpage, area_head, tool_card, mark
from data import AREAS, SECTIONS, RULES, TOOLS

CSS = kit.CSS + P.CSS + r"""
.ph .pb{overflow:hidden}
.dk .main{overflow:hidden}
.sticky{display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid var(--border);background:var(--bg)}
.dk .sticky{padding:10px 30px}
.call{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;max-width:1500px}
.call .note h4{font-size:14px}
.tap{position:absolute;z-index:6;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid #fff;background:rgba(255,255,255,.18);box-shadow:0 0 0 6px rgba(255,255,255,.12)}
"""


def D(title, body, width):
    return kit.doc(title, body, width).replace(kit.CSS, CSS)


DK_W = 1300


def pphone(inner, h=None, active=None):
    return phone(inner, active=active or "", h=h)


def pdesk(inner, h=None, active=None):
    return desk(inner, active=active or "", h=h)


# ---------------------------------------------------------------------------------------------------------------
def main_board():
    calls = [
        ("1 · Labels are numbered pins, words beside the picture",
         "Each label is a number on the screenshot and a full sentence in a list: beside the shot on desktop, under it on a phone. "
         "No words sit on the picture, so a re-taken capture never re-wraps or covers anything. A pin sits on its region’s top-left corner, "
         "and its region is a named element measured at capture (today’s locator boxes), never a pixel position. Pressing a label lights its region "
         "with the halo the tool cards already use. <b>Five pins a picture at most</b>; a screen that needs more becomes two shots."),
        ("2 · Good to know is a card with a small diagram",
         "Each hidden rule is a card: a diagram drawn from the app’s own shapes (a card row, a deck tile, a buy tag, a bracket medal), then one or "
         "two plain sentences. It sits in the section of the screen it belongs to, so the ? lands on a screen’s labels and its rules together. "
         "A phone swipes a row of them; desktop shows a grid of three. <b>15 rules</b> across four pages; Home and Commanders have none."),
        ("3 · Six pages and an index, not one scroll",
         "About opens on an index of six tiles, each a crop of its page’s first screen. Every page has the six in a strip at the top (the shipped tab strip) "
         "and an “On this page” row of the ? panel’s chips, one per screen. The ? and the banner always land on one area, and one long scroll "
         "would load every capture in the app to show one."),
        ("4 · About stays where it is in the menu",
         "“About The 99”, first in the account menu, as shipped. No new row. The ? on every screen is the other way in, and the banner the third."),
        ("5 · The ? opens its page, at its screen",
         "The ? on any screen opens that area’s page scrolled to that screen, with a “‹ Back to …” bar that stays at the top while you read. "
         "The ? panel and its search go: one source, as ruled, and six short pages need no search."),
        ("0 · The picture matches the device",
         "A phone reader sees phone captures and a desktop reader desktop captures, everywhere: the pages, the tool card pictures, the index tiles and the banner crop. "
         "Each screen is captured at both widths, and its labels are anchored on each capture separately."),
        ("6 · Tool cards stay, with Show me on them",
         "The shipped tool card, unchanged but for its left link: “How it works ›” pointed at the Reference, which is gone, so it becomes "
         "<b>Show me ›</b> (the panel’s shipped Show me: opens the screen and lights the control). The card’s press is still Try it. "
         "Each screen is three blocks, in order: the labelled screen, Good to know, then Try it."),
        ("7 · The banner names the launch, with a crop",
         "Home’s shipped banner, its diamond mark swapped for a crop of the new label’s region from its screen’s capture. "
         "“New on Decks: Matchups splits …” and Show me. Two or more launches use the shipped band, one line and crop each. "
         "Show me lands on the page with the label lit, marked New, and its tool card right under it."),
        ("8 · States",
         "A label whose feature is off for the reader is gone, pin and line, and the numbers close up. A capture still loading draws its frame at "
         "the capture’s known size with a quiet skeleton and no pins; the labels read without it. An area with no hidden rules simply has no "
         "Good to know heading: no empty state."),
        ("9 · What the captures need (engineering)",
         "Today’s captures don’t all hold every label’s region, and there are no 1300 captures of most screens. "
         "<span class='gapnote'>not in today’s capture</span> marks each label the capture has to bring into frame; "
         "The canvas uses today’s real captures as they are."),
    ]
    cards = "".join(f'<div class="note"><h4>{t}</h4>{b}</div>' for t, b in calls)
    gaps = [
        ("G1", "Capture inventory: every section’s capture holds every label region, at 390 and 1300. Today the phone deck shots are taken with the tabs at the top (no Recommended mix or commit band), the desktop deck shot predates Lock cards, and the two Analysis shots are of different decks."),
        ("G2", "Desktop captures: <code>capture:about</code> shoots 390x844 only. Each section adds a 1300x900 frame, in all six themes."),
        ("G3", "Anchors: each label names a region (<code>data-about-region=&quot;…&quot;</code>, or today’s locator string), measured per capture into <code>shots.generated.ts</code> as the locator boxes are now. A visible label with no box fails readiness, as today."),
        ("G4", "Seen and launches: the announced unit becomes the label or rule (the audit’s option B), each with its own switch and <code>since</code>. Legacy seen ids need translating so nobody is re-told (README errata 3)."),
        ("G5", "Tool cards: Show me targets a label id, not an entry id; the eleven cut entry ids the showcase hangs on need new targets before they go (audit decision 4)."),
        ("G6", "Pins: two pins closer than 28px — the later one slides right along its region’s top edge. Two regions that overlap entirely are one label."),
    ]
    rows = "".join(f'<tr><td><b>{a}</b></td><td>{b}</td></tr>' for a, b in gaps)
    pages = "".join(f'<tr><td><b>{n}</b></td><td>{len(SECTIONS[a])}</td><td>{sum(len(s["labels"]) for s in SECTIONS[a])}</td>'
                    f'<td>{sum(len(s["rules"]) for s in SECTIONS[a])}</td><td>{sum(len(s["tools"]) for s in SECTIONS[a])}</td><td>{l}</td></tr>' for a, n, l in AREAS)
    body = (board_head("About, the visual redo · round 2 · account 2 · 2026-10-27",
                       "About as six pages of real screenshots",
                       "From 83 text entries to six pages, each a stack of the app’s own screens with numbered labels, the hidden rules drawn as "
                       "<b>Good to know</b> cards, and the shipped tool cards. Source: Hugh’s six workshop rulings, the audit’s keep list and the "
                       "walk’s voice rules (<code>docs/superpowers/about-visual/</code>, PR #2283). Every picture on this canvas is a real capture: "
                       "phone from <code>public/about/shots/amonkhet</code>, desktop from contact sheets. Words are drafts for /copy-review.")
            + f'<div class="call">{cards}</div>'
            + '<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;max-width:1500px">'
            + '<div class="note"><h4>The six pages</h4><table class="tbl"><tr><th>Page</th><th>Screens</th><th>Labels</th><th>Good to know</th><th>Tools</th><th>Its line</th></tr>'
            + pages + '</table></div>'
            + f'<div class="note"><h4>Gaps for engineering</h4><table class="tbl">{rows}</table></div></div>'
            + '<div class="note" style="max-width:1500px"><h4>On this canvas</h4><ol><li><b>Decks, phone</b>: the densest page in full, top to bottom, in three frames.</li>'
              '<li><b>Decks, desktop</b>: the same page at 1300.</li><li><b>Labels</b>: how a pin anchors, and how many a picture holds.</li>'
              '<li><b>The other five</b>: Home, Collection, Commanders, Shopping and Friends at phone width, with their labels and rules placed.</li>'
              '<li><b>Ways in</b>: the index, the banner with a crop, the landing with the new label lit, and the ?.</li>'
              '<li><b>States</b>: a label switched off, a capture loading, a page with no rules.</li><li><b>Copy</b>: every label and rule, with its region and switch.</li></ol></div>')
    return D("About visual · main", body, 1610)


# ---------------------------------------------------------------------------------------------------------------
def deck_phone_board():
    a = pphone(area_page("decks", "ph", upto=2, on="your-decks"), active="Decks")
    b = pphone(area_page("decks", "ph", from_sec=2, upto=4, head=False), active="Decks")
    c = pphone(area_page("decks", "ph", from_sec=4, head=False), active="Decks")
    body = (board_head("1 · the densest page, in full · phone 390",
                       "Decks, top to bottom",
                       "One scroll, cut into three frames to fit the canvas. Seven screens: each is its capture with numbered pins, the labels "
                       "under it, then its Good to know cards (a swipe row) and its tools. A label’s number is its pin. Every capture is today’s "
                       "real one; <span class='gapnote'>not in today’s capture</span> marks a label whose region this capture doesn’t show (G1).")
            + frames(frame("<b>A</b> · head, Your decks, Your deck", a),
                     frame("<b>B</b> · Analysis, Versions", b),
                     frame("<b>C</b> · Games, Stats, Notes", c)))
    return D("About visual · decks phone", body, 3 * 390 + 2 * 44 + 112)


def deck_desk_board():
    a = pdesk(area_page("decks", "dk", upto=2, on="your-decks"), active="Decks")
    b = pdesk(area_page("decks", "dk", from_sec=2, upto=4, head=False), active="Decks")
    c = pdesk(area_page("decks", "dk", from_sec=4, head=False), active="Decks")
    body = (board_head("2 · the densest page, in full · desktop 1300",
                       "Decks at 1300",
                       "Desktop shows desktop captures only. Each screen is three blocks, in order: the labelled screen (capture at 700, its labels beside it), "
                       "then Good to know (a row of three), then Try it (a row of three tool cards, each picture a crop of the desktop screen with its control lit). "
                       "Good to know sits straight under the screen, so the tools never push it below the fold.")
            + frames(frame("<b>A</b> · head, Your decks, Your deck", a),
                     frame("<b>B</b> · Analysis, Versions", b),
                     frame("<b>C</b> · Games, Stats, Notes", c), gap=60))
    return D("About visual · decks desktop", body, 3 * DK_W + 2 * 60 + 112)


# ---------------------------------------------------------------------------------------------------------------
def labels_board():
    sec = SECTIONS["decks"][1]
    base = [(1, (0.041, 0.392, 0.918, 0.04)), (2, (0.041, 0.3198, 0.42, 0.0184)), (3, (0.041, 0.1598, 0.2974, 0.0521))]
    five = base + [(4, (0.1462, 0.8578, 0.3626, 0.0284)), (5, (0.0513, 0.0828, 0.1991, 0.0521))]
    eight = five + [(6, (0.4669, 0.2368, 0.2834, 0.0521)), (7, (0.2528, 0.2368, 0.1859, 0.0521)), (8, (0.8692, 0.3906, 0.0667, 0.024))]
    trio = frames(frame("<b>3 pins</b> · comfortable", shot("p-deck-your-deck", 268, "ph", base)),
                  frame("<b>5 pins</b> · the most a picture holds", shot("p-deck-your-deck", 268, "ph", five)),
                  frame("<b>8 pins</b> · crowded: split into two shots", shot("p-deck-your-deck", 268, "ph", eight),
                        "Pins start covering each other’s regions, and the list runs to twice the picture’s height."), gap=60)
    anchor = shot("p-deck-your-deck", 300, "ph", [(3, (0.041, 0.1598, 0.2974, 0.0521))], hl=3)
    expl = ('<div class="note" style="width:620px"><h4>How a pin anchors</h4><ol>'
            '<li>Each label names a <b>region</b>: an element on the screen (<code>[data-about-region="lock"]</code>, or today’s locator). '
            'The capture run measures its box on every capture, at both widths, in every theme, and writes it beside the image.</li>'
            '<li>The pin’s centre is the region’s <b>top-left corner</b>, nudged inside the picture. Nothing is placed by pixel: move the control and the next capture moves the pin.</li>'
            '<li>Press a label (or a pin) and its region <b>lights</b> with the shipped halo (accent ring, the rest dimmed), as the tool cards do.</li>'
            '<li>Pins never carry words. The list does, in full sentences, so a capture can change without anything re-wrapping.</li>'
            '<li>A region the capture can’t find fails readiness, as a locator does today. A feature that’s off drops its label instead.</li></ol></div>')
    body = (board_head("3 · labels", "How a label points, and how many fit",
                       "Numbered pins over the capture, words in a list beside it. Five is the ceiling for one picture.")
            + frames(frame("<b>A pressed label</b> · Lock cards lit", anchor), expl, gap=60) + trio)
    return D("About visual · labels", body, 1610)


# ---------------------------------------------------------------------------------------------------------------
def sketches_board():
    fs = []
    for area, act in [("home", "Home"), ("collection", "Collection"), ("commanders", "Commanders"), ("shopping", "Decks"), ("friends", "Friends")]:
        name = next(n for a, n, _ in AREAS if a == area)
        nrules = sum(len(s["rules"]) for s in SECTIONS[area])
        cap = {"home": "Two screens, three labels, no rules: everything on Home says itself.",
               "collection": "Cards carries the central rule (one copy, one committed deck) with its Sol Ring diagram; Upload carries Replace.",
               "commanders": "No hidden rules: the audit emptied this chapter, so the page is labels and Help me choose’s card.",
               "shopping": "A deck’s Shopping view is the densest picture here, at the five-pin ceiling.",
               "friends": "What friends can see is the page’s first rule, drawn as two lists."}[area]
        fs.append(frame(f"<b>{name}</b> · {len(SECTIONS[area])} screens · {nrules} rules", pphone(area_page(area, "ph", on=SECTIONS[area][0]["id"]), active=act), cap))
    body = (board_head("4 · the other five pages · phone 390 · layout sketches",
                       "Home, Collection, Commanders, Shopping, Friends",
                       "Each drawn with the same pieces as Decks, so label placement and rule placement are real. Desktop follows Decks’ layout "
                       "(picture left, labels right, rules in a row of three).")
            + frames(*fs))
    return D("About visual · other pages", body, 5 * 390 + 4 * 44 + 112)


def sketches_desk_board():
    fs = []
    for area, act in [("home", "Home"), ("collection", "Collection"), ("commanders", "Commanders"), ("shopping", "Decks"), ("friends", "Friends")]:
        name = next(n for a, n, _ in AREAS if a == area)
        fs.append(frame(f"<b>{name}</b> · desktop", pdesk(area_page(area, "dk", on=SECTIONS[area][0]["id"]), active=act)))
    body = (board_head("4b · the other five pages · desktop 1300 · layout sketches",
                       "Home, Collection, Commanders, Shopping, Friends at 1300",
                       "The same pages a desktop reader sees: desktop captures only, each screen as the labelled screen, Good to know, then Try it.")
            + frames(*fs[:3], gap=60) + frames(*fs[3:], gap=60))
    return D("About visual · other pages desktop", body, 3 * DK_W + 2 * 60 + 112)


# ---------------------------------------------------------------------------------------------------------------
def home_with(kind, band):
    """Home's real capture, opened between its header and Ready to build for the banner, as dashboard.tsx places it."""
    if kind == "ph":
        w, H = 390, 844
        cut = 0.232 * H
        tb = 74
        full = w * P.PH_RATIO
        top = f'<div style="position:relative;height:{cut:.0f}px;overflow:hidden"><img src="{img("p-home.webp")}" alt="" style="position:absolute;top:0;left:0;width:{w}px"></div>'
        mid = f'<div style="padding:12px 16px 0">{band}</div>'
        rest = f'<div style="position:relative;flex:1;min-height:0;overflow:hidden"><img src="{img("p-home.webp")}" alt="" style="position:absolute;top:{-cut:.0f}px;left:0;width:{w}px"></div>'
        bar = f'<div style="position:relative;height:{tb}px;overflow:hidden;flex:none"><img src="{img("p-home.webp")}" alt="" style="position:absolute;bottom:0;left:0;width:{w}px"></div>'
        return f'<div class="ph" style="height:{H}px">{top}{mid}{rest}{bar}</div>'
    w, H = DK_W, 900
    cut = 0.088 * H
    top = f'<div style="position:relative;height:{cut:.0f}px;overflow:hidden"><img src="{img("d-home.webp")}" alt="" style="position:absolute;top:0;left:0;width:{w}px"></div>'
    mid = f'<div style="padding:6px 330px 0 88px;position:relative;background:var(--bg)">{band}</div>'
    rest = f'<div style="position:relative;flex:1;min-height:0;overflow:hidden"><img src="{img("d-home.webp")}" alt="" style="position:absolute;top:{-cut:.0f}px;left:0;width:{w}px"></div>'
    return f'<div class="dk" style="height:{H}px;flex-direction:column">{top}{mid}{rest}</div>'


def banner(kind, key, box, ckind, lead, text):
    cw, ch = (64, 48) if kind == "ph" else (56, 38)
    return (f'<section class="bn"><span class="crop">{crop(key, box, cw, ch, ckind)}</span>'
            f'<div class="tx"><p><b>{lead}</b> {text}</p><a>Show me</a></div><span class="x">✕</span></section>')


def band2():
    lines = [("p-deck-games", (0.041, 0.19, 0.918, 0.23), "New on Decks:", "Matchups splits a deck’s games by who you played against."),
             ("p-deck-shopping", (0.489, 0.661, 0.119, 0.031), "New on Shopping:", "ask a friend for a spare.")]
    lis = "".join(f'<li><span class="crop">{crop(k, b, 44, 32)}</span><span><b>{l}</b> {t} <a>Show me</a></span></li>' for k, b, l, t in lines)
    return (f'<section class="bn2"><div class="hh">{mark()}<h2>New in the app</h2><span class="x" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint)">✕</span></div>'
            f'<ul style="margin-left:32px">{lis}</ul></section>')


def ways_board():
    # index
    def tiles(kind):
        ts = []
        for a, n, l in AREAS:
            s0 = SECTIONS[a][0]
            k = s0["phone"] if kind == "ph" else s0["desk"]
            nr = sum(len(s["rules"]) for s in SECTIONS[a])
            meta = f'{len(SECTIONS[a])} screens' + (f' · {nr} good to know' if nr else "")
            ln = f"<p>{l}</p>" if kind == "dk" else ""
            ts.append(f'<div class="it"><div class="pv"><img src="{img(k + ".webp")}" alt="" style="top:{"-14%" if kind == "ph" else "0"}"></div><div class="tx"><h3>{n}</h3>{ln}<span class="mt">{meta}</span></div></div>')
        return f'<div class="ix">{"".join(ts)}</div>'
    ihead = ('<div class="ap-head"><span class="kk">About The 99</span><h1>About The 99</h1>'
             '<p>One page for each part of the app, drawn from the app itself. The ? on any screen opens its page.</p>'
             '<span class="tour">Take the tour →</span></div>')
    ip = pphone(f'<div class="ap">{ihead}{tiles("ph")}</div>')
    idk = pdesk(f'<div class="ap" style="padding:0 30px"><div style="max-width:1180px">{ihead}{tiles("dk")}</div></div>')
    # banner
    bp = home_with("ph", banner("ph", "p-deck-games", (0.041, 0.19, 0.918, 0.23), "ph", "New on Decks:", "Matchups splits a deck’s games by who you played against."))
    bp2 = home_with("ph", band2())
    bd = home_with("dk", banner("dk", "d-analysis", (0.528, 0.628, 0.449, 0.12), "dk", "New on Decks:", "Proposed cuts counts where a deck over 100 runs long."))
    # landing
    games = SECTIONS["decks"][4]
    lp = pphone('<div class="ap">' + section("decks", games, "ph", hl="matchups", tool_hl="matchups") + section("decks", SECTIONS["decks"][5], "ph") + "</div>", active="Decks")
    an = SECTIONS["decks"][2]
    ld = pdesk('<div class="ap" style="padding:0 30px"><div style="max-width:1180px">' + section("decks", an, "dk", hl="cuts", tool_hl="proposed-cuts") + "</div></div>", active="Decks")
    # the ?
    up = SECTIONS["collection"][1]
    qbox = (0.708, 0.024, 0.113, 0.052)
    qa = (f'<div class="ph" style="height:844px;position:relative">{shot("p-upload", 390, "ph", [], None).replace("border-radius:20px", "")}'
          f'<span class="tap" style="left:{(qbox[0] + qbox[2] / 2) * 390:.0f}px;top:{(qbox[1] + qbox[3] / 2) * 844:.0f}px"></span></div>')
    qb = pphone('<div class="sticky"><span class="back">‹ Back to Upload a file</span></div><div class="ap">'
                + section("collection", up, "ph").replace('class="sec"', 'class="sec" style="margin-top:0;border-top:0"', 1) + "</div>", active="Collection")
    qd = pdesk('<div class="sticky"><span class="back">‹ Back to Sai</span></div><div class="ap" style="padding:0 30px"><div style="max-width:1180px">'
               + section("decks", an, "dk").replace('class="sec"', 'class="sec" style="margin-top:0;border-top:0"', 1) + "</div></div>", active="Decks")
    body = (board_head("5 · ways in", "The index, the banner, the landing and the ?",
                       "About is reached three ways: the account menu’s “About The 99” (unchanged) opens the index; Home’s banner names a launch "
                       "and lands on its label; the ? on any screen lands on its own screen’s section.")
            + frames(frame("<b>Index</b> · phone · six tiles", ip, "Each tile is its page’s first capture. “Take the tour →” stays where the About head has it."),
                     frame("<b>Index</b> · desktop", idk, "Three across, each with its page’s line."), gap=60)
            + frames(frame("<b>Banner</b> · one launch · phone", bp, "The shipped band where Home places it; the diamond mark becomes a 64x48 crop centred on the new label’s region."),
                     frame("<b>Banner</b> · two launches · phone", bp2, "The shipped two-or-more band: one line and a crop each, “and N more” past four as today."),
                     frame("<b>Banner</b> · one launch · desktop", bd, "One line at 1300, the crop 56x38."), gap=60)
            + frames(frame("<b>Landing</b> · phone · Show me on Matchups", lp, "Decks, scrolled to Games. The label is lit and marked New, its region haloed on the capture, its tool card right under it. Opening the page marks it seen."),
                     frame("<b>Landing</b> · desktop · Show me on Proposed cuts", ld, "Analysis, with the label lit and marked New, and Proposed cuts’ card lit in Try it, under Good to know."), gap=60)
            + frames(frame("<b>?</b> · pressed on Upload a file", qa, "The shipped header ?."),
                     frame("<b>?</b> · lands on Collection, at Upload a file", qb, "The back bar stays at the top while you read; ‹ returns to the screen you came from."),
                     frame("<b>?</b> · desktop · pressed on a deck’s Analysis", qd, "The rail’s ? does the same at 1300."), gap=60))
    return D("About visual · ways in", body, 3 * 390 + DK_W + 3 * 60 + 112 - 390)


# ---------------------------------------------------------------------------------------------------------------
def states_board():
    yd = SECTIONS["decks"][1]
    on = pphone('<div class="ap">' + section("decks", yd, "ph", gaps=False) + "</div>", active="Decks")
    off = pphone('<div class="ap">' + section("decks", yd, "ph", hidden=("lock",), gaps=False) + "</div>", active="Decks")
    loading = pphone('<div class="ap">' + section("decks", yd, "ph", loading=True, gaps=False) + "</div>", active="Decks")
    cm = pphone('<div class="ap">' + section("commanders", SECTIONS["commanders"][0], "ph") + "</div>", active="Commanders")
    body = (board_head("6 · states", "Off, loading, and no rules",
                       "Drawn on Your deck (phone). Desktop behaves the same way.")
            + frames(frame("<b>Lock cards on</b> · for comparison", on),
                     frame("<b>Lock cards off for this reader</b>", off, "The label is gone, pin and line, and the numbers close up: Lock cards was 3, so the next label takes 3. Its rule card goes too. Never greyed."),
                     frame("<b>The capture still loading</b>", loading, "The frame holds the capture’s known size (no jump), a quiet skeleton, no pins. The labels and rules read without the picture."),
                     frame("<b>A page with no hidden rules</b> · Commanders", cm, "No Good to know heading and no empty state: the section ends with its labels and tools.")))
    return D("About visual · states", body, 4 * 390 + 3 * 44 + 112)


# ---------------------------------------------------------------------------------------------------------------
def copy_board():
    rows = []
    for a, n, _ in AREAS:
        for s in SECTIONS[a]:
            for i, (lid, lead, rest, pb, db, sw) in enumerate(s["labels"], 1):
                rows.append(f'<tr><td>{n} · {s["name"]}</td><td class="m">{i}</td><td><b>{lead}</b>{rest}</td><td><code>{a}/{s["id"]}/{lid}</code></td><td><code>{sw or "—"}</code></td></tr>')
    rr = []
    for a, n, _ in AREAS:
        for s in SECTIONS[a]:
            for r in s["rules"]:
                t, sw = RULES[r]
                rr.append(f'<tr><td>{n} · {s["name"]}</td><td>{t}</td><td><code>{r}</code></td><td><code>{sw or "—"}</code></td></tr>')
    body = (board_head("7 · copy", "Every label and rule",
                       "Plain full sentences, to the walk’s voice rules. A label is a bold lead (the control’s own name) and the rest of its "
                       "sentence. Region = the anchor engineering adds. Drafts for /copy-review; also in <code>about-visual · copy strings.ts</code>.")
            + '<div class="note" style="max-width:1500px"><h4>Labels</h4><table class="tbl"><tr><th>Where</th><th>#</th><th>Words</th><th>Region</th><th>Switch</th></tr>'
            + "".join(rows) + '</table></div>'
            + '<div class="note" style="max-width:1500px"><h4>Good to know</h4><table class="tbl"><tr><th>Where</th><th>Words</th><th>Diagram</th><th>Switch</th></tr>'
            + "".join(rr) + '</table></div>'
            + '<div class="note" style="max-width:1500px"><h4>Page and banner strings</h4><table class="tbl">'
            + "".join(f'<tr><td><b>{n}</b></td><td>{l}</td></tr>' for a, n, l in AREAS)
            + '<tr><td><b>Index</b></td><td>One page for each part of the app, drawn from the app itself. The ? on any screen opens its page.</td></tr>'
              '<tr><td><b>Section heads</b></td><td>“Good to know” · “Try it” · “On this page”</td></tr>'
              '<tr><td><b>Banner</b></td><td>“New on {page}:” + the label’s sentence, then “Show me”. Two or more: “New in the app”, one line each.</td></tr>'
              '<tr><td><b>Back bar</b></td><td>“‹ Back to {screen}”</td></tr>'
              '<tr><td><b>Tool card</b></td><td>“Show me ›” replaces “How it works ›”.</td></tr></table></div>')
    return D("About visual · copy", body, 1610)


BOARDS = [
    ("Main", main_board, "Main · calls and gaps"),
    ("Decks-Phone", deck_phone_board, "1 · Decks in full · phone"),
    ("Decks-Desktop", deck_desk_board, "2 · Decks in full · desktop"),
    ("Labels", labels_board, "3 · How a label points"),
    ("Other-Pages", sketches_board, "4 · The other five pages · phone"),
    ("Other-Pages-Desktop", sketches_desk_board, "4b · The other five pages · desktop"),
    ("Ways-In", ways_board, "5 · Index, banner, landing, ?"),
    ("States", states_board, "6 · States"),
    ("Copy", copy_board, "7 · Copy"),
]
