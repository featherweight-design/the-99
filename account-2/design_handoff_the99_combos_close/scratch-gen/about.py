"""Combos one piece away: its About entry (account 2, 2026-10-22). Drawn with the launch-end batch's Reference kit
(laref.py, lakit.py: copies of addendum-launch-end-batch's la.py and kit.py), retinted to Low Sun. The picture is this
round's own deck page at 390 (cap.py), standing in for the recapture, the segment boxed as the locator would box it."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit, laref as la
from laref import hexa, RATIO

kit.LOCAL["about-deck"] = "art/about-deck-your-deck.png"
BOX = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "about-box.json")))
LOW = ("amonkhet", "Low Sun", "#CF8745", "#14110E")
ID = "combos-one-away"


def window(w, label=None):
    x, y, bw, bh = BOX
    win = 2 / 3
    centre = (y + bh / 2) * RATIO
    off = min(max(centre - win / 2, 0), RATIO - win)
    halo = (f'<span class="halo" style="left:{x*w:.1f}px;top:{(y*RATIO-off)*w:.1f}px;width:{bw*w:.1f}px;height:{bh*RATIO*w:.1f}px;'
            f'box-shadow:0 0 0 2px {hexa(LOW[2],.75)},0 0 0 6px {hexa(LOW[2],.2)},0 0 0 2000px {hexa(LOW[3],.28)}"></span>')
    lab = f'<span class="wlab">{label}</span>' if label else ""
    return (f'<div class="frm" style="width:{w}px;height:{w*win:.1f}px"><img src="{kit.img("about-deck")}" alt="" '
            f'style="top:{-off*w:.1f}px;height:{RATIO*w:.1f}px">{halo}{lab}</div>')


la.window = lambda theme, key, w, **kw: window(w)
la.ADDED["deck-your-deck"] = 1

TITLE = "Combos one card away"
CAPTION = ("Some decks are one card short of a combo. The line under the deck’s header, beside its version, says how many: “5 combos one piece away”.\n\n"
           "Press it for the list. Each combo says where its missing card is:\n\n"
           "- A spare in your collection\n- In another of your decks, with a link to that deck\n- To buy, with its price\n\n"
           "Open one to see how it works, step by step, and the mana it needs. You can add the missing card from there.\n\n"
           "A card’s details list its combos the same way, with the pieces you already hold.")
KEYS = ["Only two-card combos in this deck’s colors are counted.",
        "The turn-again mark is a combo that gives you extra turns.",
        "Combos, their steps and their mana come from Commander Spellbook."]
ROWS = [("Everything about a deck, on one page", "Every deck gets a page of its own: the commander up top, how far along it is, and tabs for everything else.", False),
        ("Reading a decklist row", "Each row tells you, left to right:", False), "OPEN",
        ("Locking your favorite cards", "Lock a card and nothing in the app will offer to cut it.", False)]
E_ = dict(id=ID, title=TITLE, screen="deck-your-deck", caption=CAPTION, keys=KEYS, rows=ROWS)

EDITS = [("<code>combo-awareness</code>", "Key 1 reads <b>“A card’s details list every combo: whole in this deck first, then one piece away, with where that piece is.”</b> "
          "(today: “… every partner: this deck’s first, then ones you own, then ones to buy.”), with <code>COMBOS_CLOSE_ENABLED</code> on. Key 2, “Only two-card combos are flagged.”, stays true."),
         ("<code>deck-page</code>", "No edit. Its caption names the to-do card; the segment is part of the status line, which it doesn’t list.")]


def doc(title, body, width):
    d = la.doc(title, body, width)
    low = re.search(r"\.board\{(--bg:[^}]*)\}", kit.CSS).group(1)
    d = d.replace("Chakra+Petch", "Cinzel").replace("'Chakra Petch'", "'Cinzel'").replace("255,77,154", "207,135,69").replace("#111319", "#1A1611").replace("#FF4D9A", "#CF8745").replace("#ff4d9a", "#CF8745").replace("#a03a68", "#6B482A")
    return d.replace("</style>", f".board{{{low}}}</style>", 1)


def about_board():
    head = la.board_head("About · combos one piece away · one entry · A deck · Your deck", TITLE,
                         "One new entry, <code>combos-one-away</code>, on <b>A deck · Your deck</b>, chapter 03, following <code>COMBOS_CLOSE_ENABLED</code>. "
                         "Opened in the shipped Reference at 1300 and 390, in Low Sun. The halo is the <b>segment</b>: the one new thing on the deck page, and it sits on the first screen at 390. "
                         "The picture is this round’s deck page (board Deck-Page, quiet deck) standing in for the recapture (G8). Every word is a placeholder for <code>/copy-review</code>.")
    fr = [la.frame("Reference, entry open · desktop 1300 · Low Sun", la.ref_desk(E_)), la.frame("Reference, entry open · 390 · Low Sun", la.ref_phone(E_))]
    body = head + f'<div class="frames" style="max-width:{1300+390+44}px">' + "".join(fr) + "</div>"
    edits = "".join(f"<tr><td>{a}</td><td>{b}</td></tr>" for a, b in EDITS)
    body += ('<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:20px">'
             f'<div class="sec"><h3>The picture</h3><div class="call">{window(330)}<div><h4>{TITLE}</h4>'
             f'<span class="id">{ID} · deck · your-deck · chapter 03 · since 18</span>'
             '<p>The halo is the segment, <b>“∞ 5 combos one piece away ›”</b>, on the quiet strip. The capture’s deck has nothing to do, so the strip is the segment’s home and the frame shows it without a to-do card.</p>'
             '<p><b>Not picked:</b> the to-do card’s foot (only decks with something to do have one), and the list sheet (About pictures are screens, not sheets).</p></div></div></div>'
             f'<div class="sec"><h3>Entries the line touches</h3><table class="tbl"><tr><th>Entry</th><th>Edit, no bump</th></tr>{edits}</table>'
             '<h3 style="margin-top:18px">For engineering</h3><table class="tbl"><tr><th>Entry</th><th>Screen</th><th>Locator (suggested)</th><th>Frame needs</th></tr>'
             f'<tr><td><code>{ID}</code></td><td>deck · your-deck</td><td>the segment, e.g. <code>[data-combos-close]</code></td><td>G8: a complete deck with nothing to do and at least two combos one piece away</td></tr></table>'
             '<p class="cap" style="font-size:12.5px;color:var(--fg-muted);margin:12px 0 0">Version: <code>since: 18</code> if the menu and Home line ships 17 first, otherwise 17. One bump either way.</p></div></div>')
    return doc(f"About · {TITLE}", body, 1300 + 390 + 44 + 112)


BOARDS = [("About", about_board, "About · the entry, in the Reference")]
