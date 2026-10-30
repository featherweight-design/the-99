"""Two divergent alternatives (Hugh, 2026-10-22): A = one to-do card, B = every message where it belongs."""
import kit
from kit import doc, board_head, frame
import pieces as P
from pieces import DECKS

kit.CSS += r"""
.td{margin:14px 14px 14px;border-radius:12px;background:var(--surface-rail);border:1px solid var(--border-strong);overflow:hidden}
.td .th{display:flex;align-items:center;gap:10px;padding:12px 14px 10px}
.td .th .e{font:9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.td .th .n{margin-left:auto;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.td .it{display:flex;align-items:flex-start;gap:11px;padding:11px 14px;border-top:1px solid var(--border)}
.td .it .mk{flex:none;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font:600 12px 'IBM Plex Mono';margin-top:1px}
.td .it .mk.w{background:color-mix(in srgb,var(--danger) 16%,var(--bg));color:var(--danger)}
.td .it .mk.a{background:color-mix(in srgb,var(--accent) 14%,var(--bg));color:var(--accent)}
.td .it .tx{flex:1;min-width:0}
.td .it .h{font-size:13.5px;font-weight:600;line-height:1.4}
.td .it.wn .h{color:var(--avail-over-fg)}
.td .it .b{font-size:12px;line-height:1.5;color:var(--fg-muted);margin-top:2px}
.td .it .ln{display:flex;gap:14px;flex-wrap:wrap;margin-top:3px}
.td .it .ln a{display:inline-flex;align-items:center;min-height:32px;font:11.5px 'IBM Plex Mono';color:var(--accent)}
.td .it .go{flex:none;align-self:center;display:inline-flex;align-items:center;height:36px;padding:0 13px;border-radius:8px;font:600 13px 'IBM Plex Sans';white-space:nowrap}
.td .it .go.p{background:var(--fg);color:var(--bg)}
.td .it .go.g{border:1px solid var(--border-strong);color:var(--fg)}
.td .ft{border-top:1px solid var(--border);padding:9px 14px;font:11px/1.7 'IBM Plex Mono';color:var(--fg-faint);background:color-mix(in srgb,var(--bg) 40%,var(--surface-rail))}
.td .ft .sep{color:var(--fg-locked);margin:0 5px}
.td .ft .ds{color:var(--fg-body);border-bottom:1px dotted var(--fg-faint)}
.dkm .td{margin:18px 26px 18px}
.dkm .td .it{align-items:center;padding:10px 16px}
.dkm .td .it .tx{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.dkm .td .it .b{margin:0;font-size:12.5px}
.dkm .td .it .ln{margin:0 0 0 auto}
.dkm .td .ft{padding:9px 16px}
.rct{position:absolute;left:12px;right:12px;z-index:14;display:flex;align-items:flex-start;gap:10px;border-radius:10px;border:1px solid var(--border-strong);background:var(--elevated);padding:10px 4px 10px 13px;box-shadow:0 12px 30px rgba(0,0,0,.5)}
.rct .ok{color:var(--success);font-size:14px;line-height:20px;flex:none}
.rct .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.rct .hd{font-size:13px;font-weight:600;line-height:1.4}
.rct .bd{font:10.5px 'IBM Plex Mono';color:var(--fg-muted)}
.rct .bd a{color:var(--accent)}
.rct .x{width:36px;height:32px;flex:none;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:14px}
/* B */
.dl2{width:100%;display:flex;align-items:center;gap:10px;min-height:36px}
.dl2 .t{flex:1;min-width:0;font-size:12.5px;line-height:1.4;color:var(--fg-body)}
.dl2 .t b{font:600 13px 'IBM Plex Mono'}
.dl2 .g{flex:none;display:inline-flex;align-items:center;height:36px;padding:0 12px;border-radius:8px;border:1px solid var(--accent);color:var(--accent);font:600 12.5px 'IBM Plex Sans';white-space:nowrap}
.dl2 .g.r{border-color:var(--danger);color:var(--avail-over-fg)}
.wchip{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px 0 8px;border-radius:6px;font:11px 'IBM Plex Mono';color:var(--avail-over-fg);background:color-mix(in srgb,var(--danger) 16%,var(--bg));border:1px solid color-mix(in srgb,var(--danger) 60%,transparent);white-space:nowrap}
.row .rm{flex:none;display:flex;align-items:center;gap:5px}
.row .px{font:600 9px 'IBM Plex Mono';color:var(--fg-muted);border:1px solid var(--border-strong);border-radius:3px;padding:0 3px;line-height:13px}
.row.sp{background:color-mix(in srgb,var(--danger) 9%,var(--surface-rail))}
.unr{display:flex;align-items:center;gap:10px;height:40px;padding:0 10px;border-radius:8px;border:1px dashed var(--border-dashed);font-size:13px;color:var(--fg-body)}
.unr a{margin-left:auto;font:11.5px 'IBM Plex Mono';color:var(--accent)}
.dock{position:absolute;left:10px;right:10px;z-index:15;border-radius:14px;border:1px solid var(--border-strong);background:var(--elevated);box-shadow:0 -6px 26px rgba(0,0,0,.55);padding:10px 12px 12px;display:flex;flex-direction:column;gap:9px}
.dock .r1{display:flex;align-items:baseline;gap:9px;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.dock .r1 .e{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.dock .r1 .ct{font-size:13px}
.dock .r1 .dsc2{margin-left:auto;color:var(--fg-muted)}
.dock .r2{display:flex;gap:8px}
.dock .r2 span{flex:1;display:flex;align-items:center;justify-content:center;height:42px;border-radius:9px;font:600 13.5px 'IBM Plex Sans'}
.dock .r2 .rv{border:1px solid var(--border-strong);color:var(--fg)}
.dock .r2 .cm{background:var(--fg);color:var(--bg)}
.dk .dock{left:96px;right:32px;flex-direction:row;align-items:center;padding:10px 12px 10px 18px}
.dk .dock .r1{flex:1}
.dk .dock .r2 span{flex:none;padding:0 18px;height:38px}
.tabs .vtag,.dtabs .vtag{font:normal 10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.fill{margin:16px;border-radius:10px;border:1px dashed var(--border-dashed);padding:16px;text-align:center;display:flex;flex-direction:column;gap:6px;align-items:center}
"""

# ---------------------------------------------------------------- A · one to-do card

def it(kind, mark, h, b="", go="", links=()):
    ln = ('<div class="ln">' + "".join(f"<a{s}>{t}</a>" for t, s in links) + "</div>") if links else ""
    return (f'<div class="it{" wn" if kind == "w" else ""}"><span class="mk {kind}">{mark}</span><div class="tx">'
            f'<div class="h">{h}</div>' + (f'<p class="b">{b}</p>' if b else "") + f'{ln}</div>{go}</div>')


def todo(eyebrow, count, items, foot):
    sep = '<span class="sep">·</span>'
    ft = sep.join(f'<span class="ds">{t} ▾</span>' if ds else f"<span>{t}</span>" for t, ds in foot)
    return (f'<div class="td"><div class="th"><span class="e">{eyebrow}</span><span class="n">{count}</span></div>'
            f'{"".join(items)}<div class="ft">{ft}</div></div>')


OG = '<span class="og"><i></i><i></i></span>'
DIM = ' style="color:var(--fg-muted)"'


def a_stack3(desk=False):
    items = [
        it("w", OG, "Sol Ring is spoken for twice", "It’s on 3 committed decks and you own 2.", links=[("See it in Shopping", "")]),
        it("a", "12", "The last 12", "151 candidates ranked by synergy. 6 you can sleeve.", '<span class="go p">Choose ↓</span>'),
        it("a", "±", '9 changes since v2 <span class="m" style="font-weight:400;font-size:12px"><span style="color:var(--success)">+5</span> / <span style="color:var(--warning)">−4</span></span>',
           links=[("Review", ""), ("Commit as v3", ""), ("Discard", DIM)]),
    ]
    card = todo("Before Big Stompy is complete", "3 to do", items,
                [("v2", False), ("Where these 31 cards came from", True), ("4 in other drafts too", True)])
    return card


def a_stack1():
    items = [
        it("w", OG, "2 cards here are spoken for twice", "Both are on more committed decks than you have copies.", links=[("See them in Shopping", "")]),
        it("a", "±", '6 changes since v3 <span class="m" style="font-weight:400;font-size:12px"><span style="color:var(--success)">+4</span> / <span style="color:var(--warning)">−2</span></span>',
           "Thopter Spy Network, Whirler Rogue and 4 more.", '<span class="go p">Commit v4</span>', links=[("Review", ""), ("Discard", DIM)]),
    ]
    return todo("Before Thopter Works is ready", "2 to do", items,
                [("1 of these is a proxy", False), ("Where these 31 cards came from", True)])


def a_stack2():
    items = [
        it("w", "+1", "One over the ninety-nine", "Cut one and it is legal.", links=[("Proposed cuts →", "")]),
        it("a", "±", '9 changes since v2 <span class="m" style="font-weight:400;font-size:12px"><span style="color:var(--success)">+5</span> / <span style="color:var(--warning)">−4</span></span>',
           "3 to buy on commit · $11.40", '<span class="go g">Review</span>', links=[("Commit as v3", ""), ("Discard", DIM)]),
    ]
    return todo("Before Big Stompy is legal", "2 to do", items, [("v2", False)])


def rtoast(top):
    return (f'<div class="rct" style="top:{top}px"><span class="ok">✓</span><div class="tx"><span class="hd">Started from the Veloci-Ramp-Tor precon</span>'
            '<span class="bd">You own 71 of its 99 · the 28 you don’t are in Shopping · <a>History</a></span></div><span class="x">✕</span></div>')


C3 = [("Ramp", 12, 10, None), ("Draw", 7, 10, "consider →"), ("Removal", 6, 8, "consider →"), ("Wipes", 1, 2, "consider →"), ("Land", 35, 37, "balance →")]
C2 = [("Ramp", 14, 10, None), ("Draw", 8, 10, "consider →"), ("Removal", 9, 8, None), ("Wipes", 2, 2, None), ("Land", 35, 37, "balance →")]


def alt_a(view):
    if view == "s3":
        d = DECKS["stompy-short"]
        return P.phone(P.phone_header(d) + a_stack3() + P.mix(cells=C3, phone_parity=True) + P.tabs(built=87)
                       + P.phone_list(changed=True, shopping="9", built=87), 704, rtoast(612))
    if view == "s1":
        return P.phone(P.phone_header(DECKS["thopter"]) + a_stack1() + P.mix(phone_parity=True) + P.tabs() + P.phone_list(changed=True), 704)
    if view == "s2":
        return P.phone(P.phone_header(DECKS["stompy"]) + a_stack2() + P.mix(cells=C2, phone_parity=True) + P.tabs(built=100)
                       + P.phone_list(changed=True, shopping="3", built=100), 704)
    d = DECKS["stompy-short"]
    t = rtoast(0).replace("top:0px", "bottom:22px;left:auto;right:30px;width:440px")
    return P.desk(P.desk_header(d) + a_stack3(True) + P.mix(desk=True, cells=C3) + P.dtabs(built=87)
                  + P.desk_list('<span class="nt">9 of these differ from v2</span>', changed=True), 820, t)


# ---------------------------------------------------------------- B · where it belongs

def b_phone_header(d, line, chip=""):
    h = P.phone_header(d)
    h = h.replace('<div class="barrow">', '<div class="barrow">', 1)
    h = h.replace("</div></div><div class=\"acts\">", f"</div>{line}</div><div class=\"acts\">", 1) if line else h
    if chip:
        h = h.replace("</div></div></div><div class=\"sub\">", f"{chip}</div></div></div><div class=\"sub\">", 1)
    return h


def deck_line(kind, n):
    if kind == "short":
        return (f'<div class="dl2"><span class="t"><b style="color:var(--accent)">{n} to go.</b> 151 candidates ranked for this commander.</span>'
                f'<span class="g">Choose the last {n} ↓</span></div>')
    return ('<div class="dl2"><span class="t"><b style="color:var(--danger)">+1</b> <span style="color:var(--avail-over-fg);font-weight:600">One over the ninety-nine.</span> Cut one and it is legal.</span>'
            '<span class="g r">Proposed cuts →</span></div>')


def wchip(n):
    return f'<span class="wchip">{OG}{n} spoken for twice</span>'


def b_list(built=87, shopping="9", spoken=("Sol Ring",), proxy=None, soft=(), unresolved=False, desk=False):
    rows = [("Sol Ring", ["c1"], True), ("Arcbound Ravager", ["c3"], True), ("Etherium Sculptor", ["c1", "u"], True),
            ("Faerie Mastermind", ["c1", "u"], False), ("Glint-Nest Crane", ["c1", "u"], True)]
    if desk:
        rows += [("Ornithopter", ["c0"], True), ("Sai's Thopter Kit", ["c2"], False)]
    out = []
    for n, ps, own in rows:
        marks = ""
        if n in spoken:
            marks += OG
        if n == proxy:
            marks += '<span class="px">P</span>'
        if n in soft:
            marks += '<span class="sg-soft"></span>'
        out.append(f'<div class="row{" sp" if n in spoken else ""}"><span class="ow{"" if own else " no"}"></span><span class="nm">{n}</span>'
                   f'<span class="rm">{marks}</span>{P.mana(ps)}<span class="x">✕</span></div>')
    unr = ('<div class="unr">2 lines unresolved<a>Take a look →</a></div>' if unresolved else "")
    if desk:
        return (f'<div class="dtool"><span class="sg"><span class="on">All<em>{built}</em></span><span style="color:var(--accent)">Shopping<em>{shopping}</em></span>'
                f'<span>Stats</span><span>Notes<em>2</em></span></span></div><div class="dgrp"><h4>Artifacts<em>24</em></h4>{"".join(out)}{unr}</div>')
    return (f'<div class="seg"><span class="on">All<em>{built}</em></span><span class="sh">Shopping<em>{shopping}</em></span><span>Stats</span><span>Notes<em>2</em></span></div>'
            f'<div class="grp"><h4>Artifacts<em>24</em></h4>{"".join(out)}{unr}</div>')


def vtabs(fn, built, v="v2", kind="std"):
    return fn(kind, built).replace("Versions<em>3</em>", f'Versions<em>3</em><span class="vtag">· {v} + draft</span>')


def dock(top=None, bottom=None, n=9, plus=5, minus=4, v=2):
    pos = f"top:{top}px" if top is not None else f"bottom:{bottom}px"
    return (f'<div class="dock" style="{pos}"><div class="r1"><span class="e">Not yet a version</span>'
            f'<span class="ct"><span style="color:var(--success)">+{plus}</span> / <span style="color:var(--warning)">−{minus}</span></span>'
            f'<span>{n} since v{v}</span><span class="dsc2">Discard</span></div>'
            f'<div class="r2"><span class="rv">Review</span><span class="cm">Commit as v{v + 1}</span></div></div>')


def alt_b(view):
    if view == "s3":
        d = DECKS["stompy-short"]
        head = b_phone_header(d, deck_line("short", 12), wchip(1))
        return P.phone(head + P.mix(cells=C3, draft=True, phone_parity=True) + vtabs(P.tabs, 87)
                       + b_list(soft=("Etherium Sculptor", "Glint-Nest Crane")), 704,
                       rtoast(548).replace("top:548px", "top:532px") + dock(top=604))
    if view == "s1":
        d = DECKS["thopter"]
        head = b_phone_header(d, "", wchip(2))
        return P.phone(head + P.mix(draft=True, phone_parity=True) + vtabs(P.tabs, None, "v3")
                       + b_list(99, "2", spoken=("Sol Ring", "Arcbound Ravager"), proxy="Etherium Sculptor"), 704,
                       dock(top=604, n=6, plus=4, minus=2, v=3))
    if view == "s2":
        d = DECKS["stompy"]
        head = b_phone_header(d, deck_line("over", 1))
        return P.phone(head + P.mix(cells=C2, draft=True, phone_parity=True) + vtabs(P.tabs, 100)
                       + b_list(100, "3", spoken=()), 704, dock(top=604))
    d = DECKS["stompy-short"]
    h = P.desk_header(d).replace('</div><div class="acol">', f'<div style="margin-top:8px;max-width:520px">{deck_line("short", 12)}</div></div><div class="acol">', 1)
    h = h.replace('</div><div class="barrow">', f'{wchip(1)}</div><div class="barrow">', 1)
    t = rtoast(0).replace("top:0px", "top:auto;bottom:84px;left:auto;right:32px;width:440px")
    return P.desk(h + P.mix(desk=True, cells=C3, draft=True) + vtabs(P.dtabs, 87)
                  + b_list(soft=("Etherium Sculptor", "Glint-Nest Crane"), desk=True), 820, t + dock(bottom=14))


# ---------------------------------------------------------------- boards

W = 390 * 3 + 1300 + 44 * 3 + 112


def board_alt_a():
    body = (board_head("Deck page messages · alternative A", "One to-do card",
                       "The deck says, in one card under the header, what stands between it and done. Each thing is one row: a mark, a line, its press. "
                       "Warnings are rows too, in red, at the top and never folded. The card’s foot is the status line. Anything that just happened leaves the page for a toast. "
                       "When nothing is left to do, the card shrinks to its foot (the quiet deck is today’s version strip). Copy is placeholder.", tag="Alt A")
            + '<div class="frames">'
            + frame("<b>A</b> · Stack 3 · 390", alt_a("s3"),
                    "Seven blocks become one card of three rows. The precon arrival is a toast (shown over the page), with its History link. The tabs arrive well inside the first screen.")
            + frame("<b>A</b> · Stack 1 · 390", alt_a("s1"),
                    "Your screenshot’s stack. Commit is the one filled press; the pending names fold into a sentence and Review shows them.")
            + frame("<b>A</b> · Stack 2 · 390", alt_a("s2"),
                    "Over the 99 is the first row, led by its +1. Proposed cuts keeps its press, and M3 anchors to it.")
            + frame("<b>A</b> · Stack 3 · 1300", alt_a("desk"), "Rows run on one line at desktop; the toast sits bottom right.")
            + "</div>"
            + '<div class="note" style="max-width:1500px"><b>What moves</b><ul>'
              "<li><b>New:</b> the card’s head says what the deck is short of (“Before Big Stompy is complete · 3 to do”). That is a new sentence and needs /copy-review.</li>"
              "<li><b>Gone from the page:</b> the arrival bands (A10, A12, A13) become toasts with ✕; the precon suggestion (A11) is a toast once per visit, ✕ on the account.</li>"
              "<li><b>Rows:</b> spoken for twice, over the 99, unresolved, fill failed, the last N, pending changes. One filled press per card: the row nearest done gets it.</li>"
              "<li><b>Foot:</b> version, proxies, provenance ▾, other drafts ▾, as R1’s status line.</li>"
              "<li><b>Cost:</b> the pending card’s names list and the last N’s door note shorten to a line; everything they say is one press away in Review and the door.</li></ul></div>")
    return doc("Deck messages · alternative A", body, W)


def board_alt_b():
    body = (board_head("Deck page messages · alternative B", "Every message where it belongs",
                       "No message stack at all. Each thing is said by the part of the page it is about. "
                       "How far the deck is from 99 lives under the count; a card that is spoken for twice is a red chip in the header and a red row in the list; "
                       "pending changes ride a save dock pinned at the foot of the screen, like an unsaved document; versions and where the cards came from live in the Versions tab; "
                       "proxies and other drafts are marks on their rows. Anything that just happened is a toast. Copy is placeholder.", tag="Alt B")
            + '<div class="frames">'
            + frame("<b>B</b> · Stack 3 · 390", alt_b("s3"),
                    "Between the header and the tabs there is only the mix. The count line says 12 to go and opens the door. The dock holds Review, Commit and Discard wherever you scroll.")
            + frame("<b>B</b> · Stack 1 · 390", alt_b("s1"),
                    "The two cards spoken for twice are a chip up top and red rows below. The proxy is a P on its row (the key explains it).")
            + frame("<b>B</b> · Stack 2 · 390", alt_b("s2"),
                    "+1 and Proposed cuts sit under the count, where the 100 already is. M3 anchors to that press.")
            + frame("<b>B</b> · Stack 3 · 1300", alt_b("desk"), "The count line joins the header column; the dock spans the main column’s foot.")
            + "</div>"
            + '<div class="note" style="max-width:1500px"><b>What moves</b><ul>'
              "<li><b>Under the count:</b> the last N (A8, A17 first run), over the 99 (A4), fill failed and ran out (A9, the plate). One line, one press.</li>"
              "<li><b>Header chip + list rows:</b> spoken for twice (A6). The chip presses to Shopping filtered to those cards. Unresolved (A15) is a dashed row at the foot of the list, where the lines already sit.</li>"
              "<li><b>Save dock:</b> pending changes (A14), always on screen while a draft is open; it lifts above the phone tab bar. The quiet version strip moves to the Versions tab label (“v2 + draft”).</li>"
              "<li><b>Versions tab:</b> provenance (A7) becomes that tab’s first section. <b>Row marks:</b> proxies (A3, a P), other drafts (A6 soft, the hollow glyph), each in the list key.</li>"
              "<li><b>Toasts:</b> arrivals, update, remove failure, the precon suggestion.</li>"
              "<li><b>Cost:</b> it is the biggest change: a new dock, a new chip, new row marks and a header line, and the brief’s ‘one place to look’ becomes ‘look where it applies’. The dock covers the last list rows until you scroll.</li></ul></div>")
    return doc("Deck messages · alternative B", body, W)


BOARDS = [
    ("Alt-A", board_alt_a, "Alternative A · one to-do card"),
    ("Alt-B", board_alt_b, "Alternative B · every message where it belongs"),
]
