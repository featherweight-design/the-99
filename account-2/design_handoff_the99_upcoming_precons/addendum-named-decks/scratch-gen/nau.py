"""#2981 addendum: Announced lists every named deck, with or without a commander.

Drawn with the announcements kit (pre.py = the shipped Precons list page, Announced group, set block, PreconTile,
revealed strip, rows view, all redrawn from src/components/decks/precons/announced-*.tsx and precon-tile.tsx).
Fixture: Nauctis: The Sunken Realm, its four deck names from Wizards' Collecting post. Code, date and the revealed
commanders' art are STAND-INS (Scryfall is blocked here): Jace, Multiverse Architect / Sai, Master Thopterist /
Zimone / Killian are cards the app already draws elsewhere.
"""
import kit
import pre as R
from kit import doc, board_head, frame, frames, img
from annb import note, col

kit.CSS += r"""
/* ---- NEW: a named deck with no commander yet ---- */
.z-tile.z-nd{border:1px dashed var(--border-dashed);background:transparent}
.z-tile.z-nd .z-art{background:var(--surface-sunken);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}
.z-tile.z-nd .z-art::after{display:none}
.z-nd .z-mk{display:flex;gap:4px;align-items:center;opacity:.9}
.z-nd .z-mk i{width:6px;height:6px;background:var(--fg-locked);transform:rotate(45deg);display:block}
.z-nd .z-mk i:nth-child(2){width:9px;height:9px}
.z-nd .z-art small{font:9.5px/1.45 'IBM Plex Mono';color:var(--fg-faint);text-align:center;padding:0 14px}
.dk .z-nd .z-art small{font-size:10px}
.z-tile.z-nd .z-cap .z-mt{color:var(--fg-faint)}
/* the revealed strip under the decks (shipped RevealedStrip, rows view's small cards) */
.z-rvs{display:flex;flex-direction:column;gap:8px;border-top:1px dashed var(--border-strong);padding-top:10px}
.z-rvs .z-lb{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.z-rvs ul{margin:0 -12px 0 0;padding:0;list-style:none;display:flex;gap:8px;overflow:hidden}
.dk .z-rvs ul{margin:0;flex-wrap:wrap}
.z-rvs li{width:76px;flex:none;display:flex;flex-direction:column;gap:5px}
.dk .z-rvs li{width:84px}
.z-rvs li .z-c{position:relative;width:76px;height:106px;border-radius:4px;overflow:hidden;background:var(--surface-sunken)}
.dk .z-rvs li .z-c{width:84px;height:117px}
.z-rvs li .z-c img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.z-rvs li .z-cn{font-size:10.5px;line-height:1.3;color:var(--fg-body);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:27px}
.dk .z-rvs li .z-cn{font-size:11px}
.z-rvs .z-dts i{width:7px;height:7px}
/* rows view: a named deck row */
.z-prow .z-npl{width:34px;height:48px;border-radius:3px;border:1px solid var(--border);background:var(--surface-sunken);flex:none;display:flex;align-items:center;justify-content:center}
.z-prow .z-npl i{width:6px;height:6px;background:var(--fg-locked);transform:rotate(45deg);display:block}
"""

SET = dict(code="NAU", name="Nauctis: The Sunken Realm Commander", date="Feb 6, 2027", until="in 3 months", month="Feb 2027")
DECKS = ["Merfolk Regiment", "Terrors of the Abyss", "Blood in the Water", "Seal the Deal"]
# Stand-in commanders (name, art, identity). The first two are "revealed" in state 2; lists name all four in state 4.
CMD = {
    "jace": ("Jace, Multiverse Architect", "jace.jpg", "WUBR"),
    "sai": ("Sai, Master Thopterist", "sai.jpg", "U"),
    "zimone": ("Zimone, Infinite Analyst", "zimone.jpg", "GU"),
    "killian": ("Killian, Decisive Mentor", "killian.jpg", "WB"),
}
# A posted list: deck name -> (commander key, owned, of)
LIST = {"Merfolk Regiment": ("sai", 24, 100), "Terrors of the Abyss": ("jace", 17, 100),
        "Blood in the Water": ("killian", 21, 100), "Seal the Deal": ("zimone", 19, 100)}


def named_tile(name, chg=True):
    return (f'<div class="z-tile z-nd{" chg" if chg else ""}"><div class="z-art"><span class="z-mk"><i></i><i></i><i></i></span>'
            f'<small>commander not revealed yet</small></div><div class="z-cap">'
            f'<span class="z-mt">list to come</span><span class="z-nm">{name}</span></div></div>')


def early(name):
    k, own, of = LIST[name]
    cmd, im, ident = CMD[k]
    return R.early_tile((name, cmd, im, ident, own, of), chg=False)


def strip(keys, label="Revealed so far · not matched to a deck yet", chg=True):
    cards = "".join(f'<li><span class="z-c"><img src="{img(CMD[k][1])}" alt=""></span><span class="z-cn">{CMD[k][0]}</span>{R.dots(CMD[k][2])}</li>' for k in keys)
    return f'<div class="z-rvs{" chg" if chg else ""}"><span class="z-lb">{label}</span><ul>{cards}</ul></div>'


def count_half(posted, revealed):
    n = len(DECKS)
    if posted == n:
        return f"<b>All {n} lists</b>"
    if posted:
        return f"<b>{posted} of {n} lists so far</b>"
    return f'<b class="chg-t">{n} decks</b>'


def block(desk, posted=(), revealed=(), new=False, layout="A"):
    """The set block. posted = deck names whose list is out; revealed = commander keys revealed and not in a posted list."""
    tiles = []
    for d in DECKS:  # the post's order; a deck keeps its place when its list lands
        tiles.append(early(d) if d in posted else named_tile(d))
    if layout == "B":
        tiles += [f'<div class="z-tile z-rv chg"><div class="z-art"><img src="{img(CMD[k][1])}" alt=""></div><div class="z-cap">'
                  f'<span class="z-sb2" style="gap:6px">{R.dots(CMD[k][2])}<span>revealed · deck not known</span></span><span class="z-nm">{CMD[k][0]}</span></div></div>'
                  for k in revealed]
    nw = R.ntag("line") if new else ""
    ch = count_half(len(posted), len(revealed))
    if desk:
        ml = f'<span class="z-ml">{nw}{SET["code"]} · {SET["date"]} · {SET["until"]} · {ch}</span>'
    else:
        ml = f'<span class="z-ml">{nw}{SET["date"]} · {SET["until"]}</span><span class="z-ml">{SET["code"]} · {ch}</span>'
    st = strip(revealed) if (revealed and layout == "A") else ""
    return (f'<div class="z-sblk"><div style="display:flex;flex-direction:column;gap:3px"><div class="z-sh2"><h3>{SET["name"]}</h3></div>{ml}</div>'
            f'<div class="z-tgrid">{"".join(tiles)}</div>{st}</div>')


def page(desk, **kw):
    new = kw.get("new", False)
    return R.list_page(desk, ann=R.announced(desk, block(desk, **kw), new=new), yr=R.year(desk))


STATES = [
    ("1", "Names only", dict(new=True),
     "Wizards’ Collecting post names four decks; nothing is revealed. Four dashed deck tiles at the decklists’ size, in the post’s order. Meta: <i>4 decks</i>."),
    ("2", "Names + 2 commanders revealed", dict(revealed=("jace", "sai")),
     "The decks are unchanged. The two revealed commanders sit under them as the shipped small cards, under one line: <i>Revealed so far · not matched to a deck yet</i>. "
     "Each opens its card details."),
    ("3", "First list posted", dict(posted=("Merfolk Regiment",), revealed=("jace",)),
     "Merfolk Regiment’s tile becomes the early list tile <b>in its own place</b>. Its commander (Sai) leaves the strip: the list names it. Meta: <i>1 of 4 lists so far</i>."),
    ("4", "All lists posted", dict(posted=tuple(DECKS)),
     "Four early list tiles, no strip, no note. Meta: <i>All 4 lists</i>. Shipped from here on: the release list replaces them."),
]


def ph(inner, h):
    return kit.phone(inner, "Decks", h=h)


def dk(inner, h):
    return kit.desk(inner, "Decks", h=h)


def phone_board():
    fs = [frame(f"<b>{n} · {t}</b> · 390", ph(page(False, **kw), 1560), cap) for n, t, kw, cap in STATES]
    body = (board_head("#2981 addendum · /decks/precons · Announced · 390",
                       "Every named deck has a tile, commander or not",
                       "The set block now lists <b>every deck Wizards has named</b>. A deck with no list yet is a <b>dashed deck tile</b>: the precon tile’s shell and size, "
                       "dashed because there is nothing to open yet (the group’s rule since R1), with the brand mark and <i>commander not revealed yet</i> where the art goes, "
                       "<i>list to come</i> where <i>you own N of M</i> goes, and the deck’s name. Revealed commanders can’t be matched to a deck, so they never sit on one: "
                       "they wait in the strip under the decks. Orange outlines mark what’s new.", tag="A2")
            + frames(*fs, gap=36))
    return doc("Phone", body, 390 * 4 + 36 * 3 + 112)


def desk_board():
    fs = [frame(f"<b>{n} · {t}</b> · 1300", dk(page(True, **kw), 1000), cap) for n, t, kw, cap in STATES]
    body = (board_head("#2981 addendum · /decks/precons · Announced · 1300",
                       "The same four states on desktop",
                       "The decks take the decklists’ own auto-fill grid inside the block, as revealed and early tiles already do. The strip wraps under them at the "
                       "shipped 84 × 117. The 2026 group below is untouched.", tag="A2")
            + frames(fs[0], fs[1], gap=44) + frames(fs[2], fs[3], gap=44))
    return doc("Desktop", body, 1300 * 2 + 44 + 112)


def options_board():
    a = ph(page(False, revealed=("jace", "sai")), 1560)
    b = ph(R.list_page(False, ann=R.announced(False, block(False, revealed=("jace", "sai"), layout="B"), new=False), yr=R.year(False)), 1560)
    rows_set = (f'<div class="z-arow"><div class="z-hd"><span class="z-pl"></span><span class="z-tx"><span class="z-t1"><span class="z-n">Nauctis: The Sunken Realm…</span>'
                f'<small>{SET["until"]} ⌃</small></span><span class="z-t2 chg">4 decks · Jace and Sai revealed</span>'
                f'<span class="z-t3">{R.dots("WUBR")}{SET["code"]} · {SET["date"]}</span></span></div><div class="z-reg">'
                + "".join(f'<div class="z-prow chg" style="border-style:dashed;background:transparent"><span class="z-npl"><i></i></span><span class="z-tx"><span class="z-nm">{d}</span>'
                          f'<span class="z-m2">list to come</span></span></div>' for d in DECKS)
                + "".join(f'<div class="z-prow" style="border-style:dashed;background:transparent"><img src="{img(CMD[k][1])}" alt=""><span class="z-tx"><span class="z-nm">{CMD[k][0]}</span>'
                          f'<span class="z-m2">{R.dots(CMD[k][2])}<span class="chg">revealed · deck not known yet</span></span></span></div>' for k in ("jace", "sai"))
                + "</div></div>")
    rv = ph(R.list_page(False, ann=R.announced(False, rows_set, new=False), yr="").replace(
        '<span class="z-vtg"><span>≣</span><span class="on">▦</span></span>', '<span class="z-vtg"><span class="on">≣</span><span>▦</span></span>'), 1560)
    body = (board_head("#2981 addendum · question 2 · where revealed commanders sit",
                       "A: under the decks (recommended) · B: in the same grid",
                       "Both drawn at state 2. <b>A</b> keeps the grid one tile per deck, so the block reads as four decks at a glance, and puts the commanders under it "
                       "at card size, a size apart from the decks. <b>B</b> puts them in the grid after the decks: six tiles for a four-deck set, which reads as six decks "
                       "until you read the sub-lines. The rows view follows A either way.", tag="A2")
            + frames(frame("<b>A · strip under the decks</b> · recommended", a,
                           "Decks fold with the shipped Show all rule (more than twice the columns); the strip never folds, it scrolls at 390 and wraps at 1300."),
                     frame("<b>B · one grid</b>", b, "Kept for comparison."),
                     frame("<b>Rows view</b> · state 2, opened", rv,
                           "Line 2 counts decks, then names who is revealed. Opened: each named deck as a dashed row (no art, the brand mark), then each revealed "
                           "commander as the shipped waiting row, its line now <i>revealed · deck not known yet</i>."), gap=36))
    return doc("Options", body, 390 * 3 + 36 * 2 + 112)


def main_board():
    body = (board_head("#2981 addendum · Announced · decks with no commander yet",
                       "Calls for the four open questions",
                       "Source of truth: <code>design_handoff_the99_upcoming_precons</code> (STATES T2, rule 1, addendum A1) and <code>design_handoff_the99_announcements</code> "
                       "(STATES 3.1, 3.2, <code>NonePlate</code>, <code>WaitingRow</code>). Locked by the brief: every deck in the set is listed, even with no commander or art; "
                       "a non-English scan shows as it is until Scryfall replaces it.", tag="A2")
            + '<div class="notes">'
            + note("1 · A named deck with no commander",
                   "<ul><li>The <b>precon tile’s shell and size</b>, so a set of four decks reads as four decks next to the 2026 grid.</li>"
                   "<li><b>Dashed edge, transparent fill</b>: the group’s standing rule that dashed means nothing to open. It has no press, no hover, no card details.</li>"
                   "<li>Art box: sunken, the brand’s three diamonds and <i>commander not revealed yet</i>. Caption: <i>list to come</i>, then the deck’s name. No dots: its colors aren’t known.</li>"
                   "<li>It <b>replaces the none plate</b> whenever the set has deck names. The plate stays only for a set with no names and no reveals (shipped T2).</li>"
                   "<li>When its list is posted it becomes the shipped early list tile <b>in the same place</b>; decks keep the post’s order.</li></ul>")
            + note("2 · Revealed commanders beside named decks",
                   "<ul><li><b>A (recommended)</b>: a strip under the decks, in the same dashed block, under one line <i>Revealed so far · not matched to a deck yet</i>. "
                   "Shipped <code>RevealedStrip</code> cards (76 × 106 / 84 × 117), each opening its card details.</li>"
                   "<li>A commander leaves the strip once a posted list names it (shipped <code>waitingCommanders</code>), and the strip goes when it’s empty.</li>"
                   "<li>We never guess a match, even when one deck and one commander are left.</li>"
                   "<li><b>B</b> (one grid) is drawn on the Options board for comparison.</li></ul>")
            + note("3 · The set’s count",
                   "<ul><li>Names known, no list out: <b><i>4 decks</i></b>. Reveals are counted by the strip itself, so the meta doesn’t repeat them.</li>"
                   "<li>Lists posting: the shipped <i>1 of 4 lists so far</i>, with the promised number now taken from the deck names.</li>"
                   "<li>All out: the shipped <i>All 4 lists</i>.</li>"
                   "<li>No names yet: shipped behaviour (<i>2 commanders revealed</i>, or <i>3 of 5 lists so far</i> from the decklist post).</li>"
                   "<li>Rows line 2: <i>4 decks · Jace and Sai revealed</i>, then the lists count as shipped once lists post.</li></ul>")
            + note("4 · “N more lists to come”",
                   "<ul><li><b>Retired once every deck name is known</b>: each unlisted deck already says <i>list to come</i> on its own tile, so the note would repeat it.</li>"
                   "<li>It survives only for a set whose decklist post promises more lists than names we know (no Collecting post read yet).</li></ul>")
            + note("States and triggers",
                   "<ul><li><b>1</b> names only: Collecting post read, no reveals.</li><li><b>2</b> names + reveals: Scryfall reveals commanders.</li>"
                   "<li><b>3</b> some lists: the decklists post lands.</li><li><b>4</b> all lists: every named deck has a posted list.</li>"
                   "<li>Filter on: named decks match by deck name only and leave under a color filter (no colors yet). A set with nothing left leaves, as shipped.</li>"
                   "<li>Fold (A1) counts deck tiles; the strip doesn’t fold.</li></ul>")
            + note("Gaps",
                   "<ul><li><b>G1</b> Fixture: code <i>NAU</i>, date and the commanders’ art are stand-ins (Scryfall is blocked here); deck names are Wizards’.</li>"
                   "<li><b>G2</b> A deck name in the post that a later decklist post spells differently: match on a normalized name, else it’s a new tile (engineering).</li>"
                   "<li><b>G3</b> Copy is draft for /copy-review: <i>commander not revealed yet</i>, <i>list to come</i>, <i>Revealed so far · not matched to a deck yet</i>, "
                   "<i>N decks</i>, <i>revealed · deck not known yet</i>.</li></ul>")
            + "</div>")
    return doc("Main", body, 1612)


BOARDS = [("Main", main_board, "A2 · calls"), ("Phone", phone_board, "A2 · 390 · four states"),
          ("Desktop", desk_board, "A2 · 1300 · four states"), ("Options", options_board, "A2 · Q2 options and rows view")]
