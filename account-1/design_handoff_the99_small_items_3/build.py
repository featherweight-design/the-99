#!/usr/bin/env python3
"""Small items 3 (Hugh, 2026-10-29): seven boards, one per item, drawn over the shipped surfaces on main @0c756cc in
Low Sun (amonkhet). Captures are the shipped ones from public/about/pages/amonkhet. Writes one page per board plus
Main.html holding all seven."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = HERE

# ---------- 1 · Good to know diagrams ----------

def row(name, *, tag=None, tone="muted", dot=None, edge=False, compact=False, dim=False, gone=False, price=None, mode="now"):
    cls = ["drw", mode]
    if compact: cls.append("compact")
    if dim: cls.append("dim")
    if gone: cls.append("gone")
    if edge: cls.append("edge")
    d = f'<i class="odot {dot}"></i>' if dot else ""
    t = f'<span class="tg {tone}">{tag}</span>' if tag else ""
    p = f'<span class="bt">buy <i>${price}</i></span>' if price else ""
    return f'<div class="{" ".join(cls)}">{d}<span class="nm">{name}</span>{t}{p}</div>'


def cap(text, muted=False, mode="now"):
    return f'<span class="cp {"mu" if muted else "up"} {mode}">{text}</span>'


def col(parts, w=None, gap=6, center=False):
    st = f"gap:{gap}px;" + (f"width:{w}px;" if w else "")
    return f'<div class="dcol{" ctr" if center else ""}" style="{st}">{"".join(parts)}</div>'


def between(glyph, label=None, mode="now"):
    lab = f'<span class="cp up {mode}">{label}</span>' if label else ""
    return f'<div class="btw"><span>{glyph}</span>{lab}</div>'


def tile(name, status="Complete"):
    return f'<div class="dtile"><i></i><b>{name}</b><span>{status}</span></div>'


def void(text):
    return f'<div class="dvoid">{text}</div>'


def diagram(cols, gap=10, head="", foot=""):
    return f'<div class="dgm">{head}<div class="dcols" style="gap:{gap}px">{"".join(cols)}</div>{foot}</div>'


# Shipped layouts (main @0c756cc): rows sit in side-by-side columns, so a row gets what the column leaves it.
def d_commit_now(m):
    return diagram([
        col([cap("Ghalta · pending", mode=m), row("Sol Ring", dot="own", edge=True, compact=True, tag="+", tone="accent", mode=m),
             row("Mind Stone", edge=True, compact=True, tag="cut", mode=m)], gap=5),
        between("→", "commit", m),
        col([cap("Sai sees it", mode=m), row("Sol Ring", compact=True, tag="short", tone="short", mode=m), cap("v2 · today", True, m)], gap=5),
    ], gap=6)


def d_onecopy_now(m):
    return diagram([
        col([row("Sol Ring", dot="own", mode=m), cap("you own ×1", True, m)], w=96, center=True),
        between("→", mode=m),
        col([row("Ghalta", tag="held longest ✓", mode=m), row("Sai", tag="short 1", tone="short", mode=m),
             row("Zimone", dim=True, tag="short 1 · draft", tone="short", mode=m)], w=150, gap=5),
    ], gap=12)


def d_replace_now(m):
    def c(title, names, gone_last=False, w=78):
        rows = [row(n, compact=True, gone=(gone_last and i == len(names) - 1), mode=m) for i, n in enumerate(names)]
        return col([cap(title, mode=m)] + rows, w=w, gap=4)
    return diagram([c("Now", ["Sol Ring", "Swords", "Cultivate", "Thrasios"]), c("File", ["Sol Ring", "Swords", "Cultivate"]),
                    c("Replace", ["Sol Ring", "Swords", "Cultivate", "Thrasios"], True, 84)])


def d_ownit_now(m):
    return diagram([col([tile("Ghalta"), cap("has Sol Ring", True, m)], center=True), between("≠", mode=m),
                    col([cap("Sai · Shopping", mode=m), row("Sol Ring", dot="own", compact=True, price="1.49", mode=m),
                         cap("your copy is in Ghalta", True, m)], gap=5)], gap=8)


def d_hidden_now(m):
    return diagram([col([tile("Ghalta")]), col([void("hidden: no tile")]),
                    col([cap("Its cards", mode=m), row("Sol Ring", tag="in use", mode=m), cap("not spares", True, m)], w=104, gap=5)], gap=8)


# Proposed: a row is never in a side-by-side column. Every row sits in one column the plate's width (250px, as credits
# and never already are), so a name and its tag always show whole. Only tiles and the empty slot sit side by side.
W = 250


def d_commit_new(m):
    return diagram([col([cap("Ghalta · pending", mode=m),
                         row("Sol Ring", dot="own", edge=True, compact=True, tag="+", tone="accent", mode=m),
                         row("Mind Stone", edge=True, compact=True, tag="cut", mode=m),
                         between("↓", "commit", m),
                         cap("Sai sees it · v2 · today", mode=m),
                         row("Sol Ring", compact=True, tag="short", tone="short", mode=m)], w=W, gap=5)])


def d_onecopy_new(m):
    return diagram([col([row("Sol Ring", dot="own", tag="you own ×1", mode=m), between("↓", mode=m),
                         row("Ghalta", tag="held longest ✓", mode=m), row("Sai", tag="short 1", tone="short", mode=m),
                         row("Zimone", dim=True, tag="short 1 · draft", tone="short", mode=m)], w=W, gap=5)])


def d_replace_new(m):
    rows = [row(n, compact=True, tag="in the file", mode=m) for n in ("Sol Ring", "Swords", "Cultivate")]
    rows.append(row("Thrasios", compact=True, gone=True, tag="not in the file", mode=m))
    return diagram([col([cap("Your Collection, then Replace", mode=m)] + rows, w=W, gap=5)])


def d_ownit_new(m):
    return diagram([tile("Ghalta"), col([cap("holds your only Sol Ring", True, m)])], gap=12,
                   foot=col([cap("Sai · Shopping", mode=m), row("Sol Ring", dot="own", price="1.49", mode=m),
                             cap("your copy is in Ghalta", True, m)], w=W, gap=5))


def d_hidden_new(m):
    return diagram([tile("Ghalta"), void("hidden: no tile")], gap=12,
                   foot=col([cap("Its cards", mode=m), row("Sol Ring", tag="in use", mode=m), cap("not spares", True, m)], w=W, gap=5))


def d_commit(m): return d_commit_now(m) if m == "now" else d_commit_new(m)
def d_onecopy(m): return d_onecopy_now(m) if m == "now" else d_onecopy_new(m)
def d_replace(m): return d_replace_now(m) if m == "now" else d_replace_new(m)
def d_ownit(m): return d_ownit_now(m) if m == "now" else d_ownit_new(m)
def d_hidden(m): return d_hidden_now(m) if m == "now" else d_hidden_new(m)


def d_credits(m):
    return diagram([col([row("Read the bracket", tag="free", tone="success", mode=m), row("Suggested changes run", tag="1 credit", tone="accent", mode=m),
                         row("Look deeper", tag="1 credit", tone="accent", mode=m), row("Came back empty-handed", dim=True, tag="credit back", tone="success", mode=m)], w=250, gap=7)])


def d_never(m):
    return diagram([col([cap("Collection", mode=m), row("Arcane Signet ×1", gone=True, tag="removed", mode=m), cap("Ghalta’s list", mode=m),
                         row("Arcane Signet", dot="unowned", tag="short", tone="short", price="0.89", mode=m)], w=250, gap=8)])


def gtk_card(diag, text, width):
    return f'<article class="rcard" style="width:{width}px"><div class="dplate">{diag}</div><p>{text}</p></article>'


RULE_TEXT = {
    "commit": "A card you add to a committed deck takes your copy only once you commit, so your other decks still count it free until then. “Put back” on Review changes brings back a cut before you do.",
    "onecopy": "A copy you own can live in only one committed deck at a time. The deck that’s held it longest keeps it, unless you hand it to another, and drafts wait behind committed decks.",
    "credits": "Reading a bracket is free. Anything written just for you uses a credit, and a run that comes back empty-handed gives it back.",
    "never": "Changing your Collection never changes a decklist. A deck that loses its copy keeps the card, shows it short and puts it on its shopping list.",
    "ownit": "A card you own can still be on Shopping. If your Ghalta deck already holds your only Sol Ring, your Sai deck needs another.",
    "hidden": "A deck you hide looks deleted to friends: no tile, and its link stops working. Hiding it never frees its cards as spares.",
    "replace": "An upload replaces your whole Collection with the file. With Replace, any card that isn’t in the file leaves your Collection.",
}


def gtk_panel(cards, cls=""):
    return (f'<div class="gtk {cls}"><div class="gh"><span class="mk"></span><h3>Good to know</h3><span class="sub">What the screen can’t show</span></div>'
            f'<div class="gtkrow">{cards}</div></div>')


# ---------- shared frame helpers ----------

def fr(label, capx, inner, tone="is"):
    return f'<figure class="fr {tone}"><figcaption class="lab2">{label}</figcaption>{inner}' + (f'<p class="cap">{capx}</p>' if capx else "") + "</figure>"


def board(n, kicker, title, intro, frames, rule=""):
    return (f'<section class="board" id="b{n}"><header class="bh"><span class="kick"><span class="tag">{n}</span>{kicker}</span>'
            f'<h2>{title}</h2><p>{intro}</p></header><div class="frames">{frames}</div>{rule}</section>')


def rule_box(title, items):
    return f'<div class="rulebox"><h4>{title}</h4><ol>' + "".join(f"<li>{i}</li>" for i in items) + "</ol></div>"


def board1():
    AFFECTED = (("onecopy", d_onecopy), ("hidden", d_hidden), ("commit", d_commit), ("ownit", d_ownit), ("replace", d_replace))
    def cards(m, w, keys=None):
        return "".join(gtk_card(d(m), RULE_TEXT[k], w) for k, d in AFFECTED if keys is None or k in keys)
    phone_now = f'<div class="pcol">{gtk_panel(cards("now", 292, ("onecopy", "hidden")), "stack")}</div>'
    phone_new = f'<div class="pcol">{gtk_panel(cards("new", 292, ("onecopy", "hidden")), "stack")}</div>'
    phone_new2 = f'<div class="pcol">{gtk_panel(cards("new", 292, ("commit", "ownit", "replace")), "stack")}</div>'
    desk_now = f'<div class="dcolw">{gtk_panel(cards("now", 388, ("onecopy", "hidden")), "grid")}</div>'
    desk_new = f'<div class="dcolw">{gtk_panel(cards("new", 388), "grid")}</div>'
    frames = (fr("Now · 390", "One copy: “Gha…” and “Zi…” (the tags take the 150px column). Hidden deck: “Sol R…” in a 104px column beside two tiles.", phone_now, "was")
              + fr("Proposed · 390", "Each row takes the plate’s full 250px, under what it follows, so the name and its tag both show whole.", phone_new)
              + fr("Proposed · 390, the other three", "Commit, own-it and Replace fit today only by a few pixels, so they move to the same layout and can’t truncate under another theme’s font or a longer name.", phone_new2)
              + fr("Now · 1300", "The 388px desktop card doesn’t help: the columns keep their fixed widths.", desk_now, "was")
              + fr("Proposed · 1300", "All five, two across.", desk_new))
    rule = rule_box("The rule, for every Good to know diagram", [
        "<b>A row never sits in a side-by-side column.</b> A diagram with a row puts every row in one column 250px wide (<code>w: 250</code>, as credits, never and invites already are). The order reads top to bottom, and a step between is a <code>between</code> part in that column: ↓ in place of →.",
        "<b>Only tiles, the empty slot and captions sit side by side</b>, in <code>columns</code>. Rows that follow them go in <code>foot</code>, which takes a full column (<code>{ w, gap, parts }</code>) as well as a parts list. That is the one code change: <code>RuleDiagram</code> renders a column foot through <code>Stack</code>.",
        "<b>Pin it:</b> <code>about-pages.test.ts</code> fails a diagram whose row part sits in a column narrower than 250px, or in one of two or more <code>columns</code>. The row keeps its ellipsis as a last resort, but no shipped diagram reaches it.",
        "<b>The five that change:</b> one-copy, hidden-deck, commit, own-it and Replace. Their parts and words stay; own-it drops its ≠ (the tile now sits above the rows). Three captions merge or gain words, marked for /copy-review below.",
        "<b>Readability, kept from the first draft:</b> no opacity on a part (a dim row draws its edge dashed, a gone row strikes its name in <code>--fg-muted</code>), row edges in <code>--border-dashed</code>, and muted tags in <code>--fg-body</code>, so every word is 4.5:1 or better in all six themes.",
    ])
    return board(1, "About · bug", "No Good to know row is ever cut short",
                 "Five diagrams put rows in side-by-side columns. A column has a fixed width, or only what the plate leaves it, and a row’s tag never shrinks, so the card name gives way: one-copy shows “Gha…” and “Zi…”, and hidden-deck “Sol R…”. The fix is the layout: rows stack in one full-width column.", frames, rule)


# ---------- 2 · Try it halo ----------

TOP_OFF = (0.0373, 0.488, 0.9627, 0.2197)


def tool_pic(w, inset, src="d-tool-top-off.webp"):
    h = round(w * 2 / 3)
    x, y, bw, bh = TOP_OFF
    l, t, r, b = x * w, y * h, (x + bw) * w, (y + bh) * h
    if inset:
        l, t = max(l, 8), max(t, 8)
        r, b = min(r, w - 8), min(b, h - 8)
    return (f'<div class="npic" style="width:{w}px;height:{h}px"><img src="art/{src}" alt="">'
            f'<span class="thalo" style="left:{l:.1f}px;top:{t:.1f}px;width:{r - l:.1f}px;height:{b - t:.1f}px"></span></div>')


def tool_card(w, inset):
    return (f'<article class="ntc" style="width:{w}px">{tool_pic(w - 22, inset)}<div class="nbd"><h4>Top off</h4>'
            '<p>Finishes a deck that’s short: the cards it still needs, ranked by synergy, from what you own first.</p>'
            '<span class="where">Where it is on the screen above ↑</span><span class="btn">Try it on Bumi <b>→</b></span></div></article>')


def board2():
    frames = (fr("Now · 390, Try it, Top off", "The lit box ends at the picture’s right edge, so its ring and glow run past the frame and are cut by its rounded corner.", tool_card(358, False), "was")
              + fr("Proposed · 390", "The box is held 8px inside the frame: the ring closes on all four sides.", tool_card(358, True))
              + fr("Now · 1300 (a third of the row)", "", tool_card(390, False), "was")
              + fr("Proposed · 1300", "", tool_card(390, True)))
    rule = rule_box("The rule", [
        "A tool card’s halo goes through the same clamp as a labelled screen’s (R4 §2, <code>haloAt</code> with <code>HALO_REACH = 8</code>): the lit box is held 8px inside the picture frame on every side before the ring and glow draw.",
        "It is measured against the picture as drawn (its rendered width and height), so the 8px holds at every card width.",
        "Top off is where it showed (its box reaches the crop’s right edge), but the clamp applies to every tool card; a box already inside is unchanged.",
    ])
    return board(2, "About · bug", "The Try it highlight stays inside its frame",
                 "R4 board 2 held a labelled screen’s lit box 8px inside its frame, but the tool cards draw their halo straight from the crop’s percentages. Top off’s box runs to the crop’s right edge, so the ring overruns the capture.", frames, rule)


# ---------- 3 · prices buy chips ----------

BUYS = [("buy <i>$54.16</i>", "today’s price"), ("buy <i>$2.10 foil</i>", "only in foil"), ("buy <i>sold out</i>", "none right now"), ("buy", "no price at all")]


def d_prices(align):
    rows = "".join(f'<div class="bline {align}"><span class="bslot"><span class="bt">{b}</span></span><span class="cp mu new">{n}</span></div>' for b, n in BUYS)
    return f'<div class="dgm"><div class="bcol">{rows}</div></div>'


PRICE_TEXT = "Prices are Mana Pool’s, and they refresh daily. A bare “buy” means Mana Pool has no price for any printing of that card."


def board3():
    frames = (fr("Now · 390", "Each chip is centred in its slot, so the four chips start and end at four different places.", gtk_card(d_prices("ctr"), PRICE_TEXT, 292), "was")
              + fr("Proposed · 390", "The chips share a right edge, as a column of prices does; the notes start on one line beside them.", gtk_card(d_prices("rgt"), PRICE_TEXT, 292))
              + fr("Proposed · 1300", "", gtk_card(d_prices("rgt"), PRICE_TEXT, 388)))
    rule = rule_box("The rule", [
        "The prices diagram’s chip slot keeps its 96px width and right-aligns its chip (<code>justify-end</code>, was centred). The gap to the note stays 10px.",
        "So the chips’ right edges line up, which is how the Shopping rows set their buy tags, and the notes start at one x.",
    ])
    return board(3, "About · improvement", "The prices diagram right-aligns its buy chips",
                 "The four chips are different widths (a price, a foil price, sold out, a bare buy) and each is centred in its slot.", frames, rule)


# ---------- 4 · copy ----------

SUBS = [
    ("Home", "Where every visit starts.", "Where every visit starts: what’s new, two commanders you could build today, and the decks you were working on."),
    ("What’s new", "News for you, newest first, after anything waiting on you.", "Anything waiting on you comes first. Then news for you, newest first: a new set, a combo you can now make, and more."),
    ("Cards", "Everything you own, card by card.", "Everything you own, card by card. Add cards by name or by scanning them, and see which copies your decks are holding."),
    ("Upload a file", "Bring in an export from another app.", "Bring in an export from ManaBox, Moxfield, Archidekt or Deckbox, or paste a list. You see every change before it happens."),
    ("For you", "Commanders you own, ranked by fit.", "Commanders you own, ranked by how well the rest of your cards suit each one, with the play styles EDHREC tracks for them."),
    ("Discover", "Commanders worth buying.", "Commanders worth buying, from every one EDHREC tracks. Sort them by fit, by how different they are from your decks, or by popularity."),
    ("Your decks", "Every deck, with what it needs next.", "Every deck you’re building, with its status and what it needs next. Start a new one from a commander, a list or a precon."),
    ("Your deck", "The list, and what each row is telling you.", "The list itself. Each row says whether you own the card and whether you’ve changed it, and your changes wait here until you commit."),
    ("Analysis", "Where your deck sits, and the tools that tune it.", "Which bracket your deck sits in and why, plus the tools that tune it: Suggested changes, Proposed cuts and Mana Balance."),
    ("Versions", "Every commit, kept.", "Every commit, kept, with its date, card count and average mana value. Open an old one to see what changed."),
    ("Games", "What happened at the table.", "What happened at the table. Log a game in seconds, then see how the deck does against each commander, color and friend."),
    ("Stats", "The deck, drawn.", "The deck in charts: its curve by card type, its mana colors against its sources, the jobs its cards do, its value, and how its games went."),
    ("Notes", "The small stuff, kept with the deck.", "Anything you want to remember about the deck. Notes stay through every commit, and no tool reads them."),
    ("A deck’s Shopping", "What one deck still needs.", "What one deck still needs, priced at Mana Pool, with cheaper stand-ins and the friends who can spare a card."),
    ("Shopping for all decks", "Every deck’s missing cards in one cart.", "Every deck’s missing cards in one cart, so one Mana Pool order covers them all."),
    ("Friends", "Your friends, and your pods.", "The people you play with, and your pods. See their spares and wishlists, and choose who sees yours."),
]


def section_head(name, sub, area="Decks", n=None, total=None):
    k = f"{area} · screen {n} of {total}" if n else f"{area} · {name}"
    return f'<div class="sech"><span class="kick">{k}</span><h2>{name}</h2><p>{sub}</p></div>'


def board4():
    stats_old = f'<div class="pcol pad">{section_head("Stats", "The deck, drawn.", n=6, total=7)}<img class="cropimg" src="art/p-deck-stats.webp" alt=""></div>'
    stats_new = f'<div class="pcol pad">{section_head("Stats", SUBS[11][2], n=6, total=7)}<img class="cropimg" src="art/p-deck-stats.webp" alt=""></div>'
    disc_old = '<div class="pcol pad"><ol class="labs"><li class="lab"><span class="num">1</span><span><b>The order</b> you pick changes what leads. Each order says what it ranks by.</span></li></ol></div>'
    disc_new = ('<div class="pcol pad"><ol class="labs"><li class="lab"><span class="num">1</span><span><b>Order</b> is how the list is sorted, and you choose it. '
                'Best fit puts first the commanders whose popular cards you already own. Something new puts first the ones least like decks you’ve built. '
                'Popularity puts first the ones with the most decks. Name and Recently released sort as they say.</span></li></ol></div>')
    sq_old = gtk_card('<div class="dgm"><div class="dcols" style="gap:30px"><span class="medal">1</span><span class="btw"><span>or</span></span><span class="medal">2</span></div>' + cap("Squirrels · no Game Changers · you pick") + "</div>",
                      "At either end of the scale, brackets come down to intent, so your cards can fit two. A Squirrel deck with no Game Changers, mass land denial, extra turns or two-card infinites passes at both Exhibition and Core.", 292)
    sq_new = gtk_card('<div class="dgm"><div class="dcols" style="gap:30px"><span class="medal">1</span><span class="btw"><span>or</span></span><span class="medal">2</span></div>' + cap("a theme deck · no Game Changers · you pick", mode="new") + "</div>",
                      "At either end of the scale, brackets come down to intent, so your cards can fit two. A Squirrel deck with no Game Changers, mass land denial, extra turns or two-card infinites passes at both Exhibition and Core.", 292)
    desk_heads = "".join(f'<div class="dsech">{section_head(nm, new, n=i + 1, total=7)}</div>' for i, (nm, old, new) in enumerate(SUBS[6:12]))
    frames = (fr("Now · 390, Discover’s label", "“changes what leads” says nothing a player can act on.", disc_old, "was")
              + fr("Draft · 390", "Says you choose the order, then what each one ranks by, in the shipped words of the options and their glosses.", disc_new)
              + fr("Now · 390, Stats", "", stats_old, "was")
              + fr("Draft · 390, Stats", "One or two sentences on what the screen offers.", stats_new)
              + fr("Now · bracket rule", "Squirrels in the prose and again in the picture.", sq_old, "was")
              + fr("Draft · bracket rule", "The picture names no theme; the prose keeps the one example.", sq_new)
              + fr("Draft · 1300, Decks section heads", "The heads at desktop width: the line wraps under the name at 68ch at most.", f'<div class="dheads">{desk_heads}</div>'))
    table = '<table class="ctab"><thead><tr><th>Section</th><th>Shipped</th><th>Draft for /copy-review</th></tr></thead><tbody>' + "".join(
        f"<tr><td>{a}</td><td>{b}</td><td>{c}</td></tr>" for a, b, c in SUBS) + "</tbody></table>"
    rule = rule_box("Copy direction (all drafts; final strings go through /copy-review)", [
        "<b>Discover’s order label</b> says plainly that you choose how the list is ordered and what each order ranks by, reusing the options’ shipped names and glosses (<code>lanes.ts</code> <code>order</code>).",
        "<b>“Squirrels”</b>: it appears three times in shipped copy. The bracket rule’s prose keeps it as the one example. The bracket diagram’s caption drops it (“a theme deck · no Game Changers · you pick”). The legacy entry in <code>about-entries.ts</code> (the old bracket explainer) says “a theme deck” too, so the word shows once, where it explains something.",
        "<b>Every section’s sub-line</b> becomes one or two sentences on what the screen offers, from its own labels, rules and tools, never a new claim. The full table is below.",
    ])
    return board(4, "About · improvement · copy", "Plainer words: the Discover order, fewer Squirrels, and real section descriptions",
                 "Three copy notes. The strings here are drafts that show the direction; final wording goes through copy review.", frames, rule + f'<div class="tabwrap">{table}</div>')


# ---------- 5 · Help me choose locked ----------

def hmc_form(locked, phone):
    L = " lk" if locked else ""
    pips = "".join(f'<span class="pip p{c}{" on" if c in "GR" else ""}">{c}</span>' for c in "WUBRG")
    seg = lambda opts, on: '<div class="seg2">' + "".join(f'<span class="{"on" if o == on else ""}">{o}</span>' for o in opts) + "</div>"
    x = "" if locked else " <b>✕</b>"
    themes = f'<div class="chiprow"><span class="ch">Landfall{x}</span><span class="ch">Tokens{x}</span><span class="addin">{"" if locked else "Add another…"}</span></div>'
    sets = f'<div class="chiprow"><span class="ch">Bloomburrow{x}</span><span class="addin">{"" if locked else "Add a set…"}</span></div>'
    brk = '<div class="brow">' + "".join(f'<span class="{"on" if b == "3" else ""}">{b}</span>' for b in ["Any", "1", "2", "3", "4", "5"]) + "</div>"
    fld = lambda label, body, capx, aside="": f'<div class="fld"><div class="fh"><span class="fl">{label}</span>{aside}</div>{body}<p class="fc">{capx}</p></div>'
    form = (
        fld("Colors", f'<div class="pips">{pips}{seg(["Any", "Exactly"], "Any")}</div>', "Any identity that includes red and green.")
        + fld("Theme", themes, "All of these: a commander has to fit every one.", seg(["All", "Any"], "All"))
        + fld("Sets", sets, "Only commanders printed in one of these. Leave it empty for every set.")
        + fld("Cards for the 99", seg(["Any cards", "Only cards I own"], "Only cards I own"), "The 99 comes from your collection.")
        + fld("Budget", '<div class="inp"><span>$</span>150</div>', "With the 99 from your cards, this caps the commander and any card you ask for that you’d have to buy.")
        + fld("Bracket", brk, "3 · Upgraded")
        + '<hr>'
        + fld("Anything else? <em>optional</em>", '<div class="ta">something scary and a little nasty, with [[Craterhoof Behemoth]]</div>', "Read against every commander your answers allow. It uses a credit when you press Find commanders.")
    )
    press = (f'<span class="press{" busy" if locked else ""}"><span class="cr">1 credit</span>{"Reading…" if locked else "Find commanders"}</span>')
    if phone:
        return (f'<div class="hmc phone{L}"><div class="hh"><h1>Help me choose</h1><p>Every answer is optional.</p></div>'
                f'<div class="hform"{" inert" if locked else ""}>{form}</div><div class="hdock">{press}</div></div>')
    return (f'<div class="hmc desk{L}"><div class="hh"><h1>Help me choose</h1><p>Say as much or as little as you like. Every answer is optional, and the more you give, the closer the fit.</p></div>'
            f'<div class="hpanel"><div class="hform">{form}</div><div class="hfoot">{press}<p>Uses 1 of your 4 credits.</p></div></div></div>')


def board5():
    frames = (fr("Now · 390, after Find commanders", "Only the press greys. Every chip, pip, field and the request box still looks live and still takes input while the read runs.", hmc_form(False, True).replace('class="press"', 'class="press busy"').replace("Find commanders</span></div></div>", "Reading…</span></div></div>"), "was")
              + fr("Proposed · 390, while it reads", "The whole form locks: it reads as set down, not as switched off.", hmc_form(True, True))
              + fr("Proposed · 1300, while it reads", "", hmc_form(True, False)))
    rule = rule_box("The locked state", [
        "<b>When:</b> from the press until the read lands or a refusal returns the form (<code>submitting</code>). The press keeps its shipped busy look (hairline, greyed, its 1 credit pill, “Reading…”).",
        "<b>The form’s fields</b> (Colors, Theme with its All/Any, Sets, Cards for the 99, Budget, Bracket and Anything else?) are <code>inert</code> and drawn locked: values and chips in <code>--fg-muted</code>, the selected pip, segment and bracket keep their shape but drop to the <code>--border-strong</code> ring with no fill; the chips’ ✕, the Add another… and Add a set… inputs and the [[ ]] button are hidden; the request box’s text stays readable on <code>--surface-sunken</code> with a <code>--border</code> edge.",
        "Labels and captions stay as they are, so a reader can still check what they asked for.",
        "No new motion and no overlay. The form’s layout and size don’t change, so nothing jumps when it unlocks.",
        "<b>Unlock:</b> a refusal (out of credits, a failed read) returns the form unlocked with its values, and focus goes back to the press, as shipped.",
        "Accessibility: the <code>form</code> carries <code>aria-busy=\"true\"</code>; <code>inert</code> keeps keyboard and screen readers out of the fields while the press stays focused.",
    ])
    return board(5, "Help me choose", "While it reads, the whole form is locked",
                 "Today only the Find commanders press shows that a read is running. Everything above it still looks and acts editable, so a change made during the read is silently ignored.", frames, rule)


# ---------- 6 · dock for low regions ----------

PW = 358
PH = round(PW * 1688 / 780)
LOCK = (0.041, 0.671, 0.2974, 0.0521)
COMMIT = (0.6795, 0.1774, 0.2462, 0.0427)


def viewport(dock, top_off, region, n, lead, rest, label_bottom=True, note=""):
    x, y, bw, bh = region
    G = 30
    iw = PW - G
    ih = round(iw * 1688 / 780)
    l, t = x * iw, y * ih
    r, b = l + bw * iw, t + bh * ih
    halo = f'<span class="halo" style="left:{max(l, 8):.1f}px;top:{t:.1f}px;width:{min(r, iw - 8) - max(l, 8):.1f}px;height:{b - t:.1f}px"></span>'
    pin_y = t + min(bh * ih, 28) / 2
    pic = (f'<div class="gut" style="width:{PW}px;height:{ih}px;padding-left:{G}px"><div class="shot" style="width:{iw}px;height:{ih}px">'
           f'<img src="art/p-deck-top.webp" width="{iw}" height="{ih}" alt="">{halo}</div><span class="pin on" style="left:{G/2}px;top:{pin_y:.1f}px">{n}</span></div>')
    head = '<div style="padding:24px 16px 16px">' + section_head("Your deck", "The list itself. Each row says whether you own the card and whether you’ve changed it.", n=2, total=7) + "</div>"
    body = f'<div class="vpbody" style="top:{-top_off - 160}px"><div style="height:160px"></div>{head}<div style="padding:0 16px">{pic}</div></div>'
    d = ""
    if dock:
        pos = "bottom:86px" if label_bottom else "top:108px;bottom:auto"
        d = f'<div class="dock" style="{pos}"><span class="num">{n}</span><p><b>{lead}</b>{rest}</p><span class="x">✕</span></div>'
    back = '<div class="backbar">‹ Back to Your deck</div>'
    return f'<div class="vp"><div class="phead"><b>The 99</b><span>?</span></div>{back}<div class="vpclip">{body}</div>{d}<div class="tabbar"><span><i></i>Home</span><span><i></i>Collection</span><span><i></i>Commanders</span><span class="cur"><i></i>Decks</span><span><i></i>Friends</span></div></div>'


def board6():
    lead, rest = "Lock cards", " protects the cards you pick. No tool will cut a locked card unless you say so."
    clead, crest = "Your changes", " wait here until you commit. “Commit as v2” saves them as the deck’s next version."
    # scroll so the lock toggle sits ~110px above the tab bar (inside the bottom ~150px)
    ih = round((PW - 30) * 1688 / 780)
    lock_t = LOCK[1] * ih
    off_low = lock_t + 102 - (844 - 74 - 160)
    commit_t = COMMIT[1] * ih
    off_hi = commit_t + 102 - 260
    frames = (fr("Now · pin 3 tapped, region low", "The region sits in the bottom 150px, and the dock lands on it.", viewport(True, off_low, LOCK, 3, lead, rest), "was")
              + fr("Proposed · the same tap", "The dock would cover the region, so it docks at the top instead, under the back bar.", viewport(True, off_low, LOCK, 3, lead, rest, label_bottom=False))
              + fr("Proposed · a region higher up", "Unchanged: the dock stays at the foot, its shipped place.", viewport(True, off_hi, COMMIT, 1, clead, crest)))
    rule = rule_box("The rule", [
        "The dock’s home stays the foot, above the tab bar (R4 board 3).",
        "<b>When the dock would cover the lit region</b> (the region’s bottom edge falls below the dock’s top edge as placed at the foot), the dock goes to the <b>top</b> of the visible band instead: 12px under the sticky back bar (or under the header when no back bar shows), with the same 12px side gutters, look and ✕.",
        "It is decided once, on the tap, from the region’s on-screen box and the dock’s own height. Scrolling afterwards doesn’t move it; another tap decides again.",
        "A region so tall that the dock covers it in both places (the Recommended mix block on a short phone) keeps the foot: most of the region stays in view either way.",
        "The page still never scrolls, as R4 ruled. The top dock enters and leaves as the foot dock does (no new motion). Desktop has no dock, so no change there.",
    ])
    return board(6, "About · phone dock (R4 board 3)", "A low region gets its label docked at the top",
                 "R4 docks a tapped pin’s label above the tab bar and rules out scrolling. When the region sits in the bottom ~150px of the screen, the dock covers the very thing it describes.", frames, rule)


# ---------- 7 · filter controls ----------

def chassis(field_h, filt, sort, placeholder="Search cards", badge="1", width=390, chips=("Owned: None",)):
    fh, fr_, fw_kind = filt
    sw, sh, sr = sort
    fb = (f'<span class="fbx" style="height:{fh}px;border-radius:{fr_}px">Filters<span class="badge">{badge}</span></span>' if fw_kind == "box"
          else f'<span class="fbp">Filters<span class="badge">{badge}</span></span>')
    ch = "".join(f'<span class="chip">{c} <b>×</b></span>' for c in chips)
    return (f'<div class="chx" style="width:{width}px"><div class="crw"><span class="sfx" style="height:{field_h}px">'
            '<svg viewBox="0 0 16 16" width="15" height="15"><circle cx="7" cy="7" r="4.8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.6 10.6 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
            f'<span>{placeholder}</span></span>{fb}<span class="hairx"></span><span class="sbx" style="width:{sw}px;height:{sh}px;border-radius:{sr}px">⇅</span></div>'
            f'<div class="chips2">{ch}<span class="ca2">Clear all filters</span></div><div class="res2">31 of 48 cards</div></div>')


def board7():
    shipped = lambda w, ph="Search": chassis(44, (44, 10, "box"), (44, 44, 8), placeholder=ph, width=w)
    r3 = lambda w: chassis(40, (36, 999, "pill"), (44, 40, 10), placeholder="Search", width=w)
    frames = (fr("R3 boards · 390 (as drawn)", "40px field, a 36px Filters pill and a 44×40 sort: drawn by hand, not from the shipped parts.", r3(390), "was")
              + fr("Ruling · 390, the shipped controls", "44px field, a 44px Filters box (10px radius), the hairline, a 44×44 sort (8px radius), and R3’s 16px under the row.", shipped(390))
              + fr("Ruling · 360", "", shipped(360))
              + fr("Ruling · 320", "The field keeps well over 100px at 320, so R3’s “Search” still fits.", shipped(320)))
    table = ('<table class="ctab"><thead><tr><th>Control</th><th>Shipped</th><th>R3 boards</th><th>Ruling</th></tr></thead><tbody>'
             '<tr><td>Search field height</td><td>44px</td><td>40px</td><td><b>Shipped, 44px</b></td></tr>'
             '<tr><td>Filters button</td><td>44px box, 10px radius</td><td>36px pill</td><td><b>Shipped, 44px box, 10px radius</b></td></tr>'
             '<tr><td>Sort button</td><td>44×44px, 8px radius</td><td>44×40px, 10px radius</td><td><b>Shipped, 44×44px, 8px radius</b></td></tr></tbody></table>')
    rule = rule_box("The ruling", [
        "<b>The shipped controls are right</b> on every compact page that uses them (Decks, the cart, Collection, Commanders and the precon list). R3’s boards were drawn by hand and got all three wrong; their calls (the “Search” placeholder, the 16px chips gap) stand, on the shipped controls.",
        "Why: the filter chassis handoff sets a real 44px on the phone (its decisions 8 and 11), and cart R2 ruled that the cart uses the shipped chassis parts as they are. 44px is the app’s phone touch target; a 36 or 40px control would shrink the hit area or need a hit area drawn past it.",
        "The radii stay as shipped (Filters 10px, sort 8px). Unifying them is not part of this call.",
        "Errata: R3’s boards (<code>addendum-r3/</code>) draw the phone controls at 40px and a 36px pill; build from the shipped parts. Nothing changes in the code.",
    ])
    return board(7, "Shared phone filter controls", "The shipped controls win, on every compact page",
                 "The shipped phone chassis and the cart R3 boards disagree on three sizes. Only one can be the rule for Decks, the cart and the other compact pages.", frames, rule + f'<div class="tabwrap">{table}</div>')


# ---------- 8 · Deck toasts and the quick-add dock (addendum, Hugh 2026-10-29) ----------

# Measured on the shipped captures (CSS px): phone 390×844, tab bar 74 tall, quick-add dock 67 above it (top at 703);
# desktop 1300×900, rail 64, dock 62 tall (top at 838).
P_TAB, P_DOCK, D_DOCK, D_RAIL = 74, 67, 62, 64


def toast(title, detail="", body="", actions=(), alert=False, note=""):
    d = f'<span class="d">{detail}</span>' if detail else ""
    b = f'<span class="b">{body}</span>' if body else ""
    a = ('<span class="ac">' + "".join(f"<i>{x}</i>" for x in actions) + "</span>") if actions else ""
    n = f'<em class="tnote">{note}</em>' if note else ""
    return f'<div class="tst{" al" if alert else ""}">{n}<span class="tx"><span class="t">{title}</span>{d}{b}</span>{a}</div>'


RECEIPT = lambda: toast("Sol Ring added · ×1", "C21 #263 · Nonfoil", "It goes to this deck.", ("History", "Undo"), note="receipt")
REFUSAL = lambda: toast("We couldn’t remove that. It’s still in the deck.", "Badgermole", alert=True, note="refusal")
SEARCH = lambda: toast("Couldn’t search just now.", actions=("Try again",), alert=True, note="failed search")


def stack(bottom, toasts, left=16, right=16, width=None):
    w = f"width:{width}px;" if width else f"right:{right}px;"
    return f'<div class="tstk" style="bottom:{bottom}px;left:{left}px;{w}">{"".join(toasts)}</div>'


def query(phone=True, text="Cultivat"):
    st = "left:55px;top:725px;width:150px" if phone else "left:108px;top:857px;width:220px"
    return f'<span class="qry" style="{st}">{text}<i></i></span>'


def phone8(layers, shot="p-deck-your-deck.webp", mark=False, typed=False):
    m = f'<span class="fieldmark" style="left:12px;right:12px;bottom:{P_TAB + 6}px;height:{P_DOCK - 12}px"></span>' if mark else ""
    q = query() if typed else ""
    return f'<div class="vp t8"><img src="art/{shot}" width="390" height="844" alt="">{q}{"".join(layers)}{m}</div>'


def desk8(layers, mark=False, typed=False):
    m = f'<span class="fieldmark" style="left:{D_RAIL + 26}px;width:660px;bottom:8px;height:{D_DOCK - 16}px"></span>' if mark else ""
    q = query(False) if typed else ""
    return f'<div class="dz"><div class="dvp t8"><img src="art/d-deck-list.webp" width="1300" height="900" alt="">{q}{"".join(layers)}{m}</div></div>'


def board8():
    pf = P_TAB + P_DOCK + 10          # proposed floor with the dock up
    df = D_DOCK + 10
    ph_slot = P_TAB + 10              # shipped phone slot
    frames = (
        fr("Now · 390 · a receipt from the All list", "The deck slot sits 10px above the tab bar whatever else is there, so the receipt lands on the quick-add field (dashed).",
           phone8([stack(ph_slot, [RECEIPT()])], mark=True), "was")
        + fr("Now · 390 · a refusal while the failed search is up", "Small items 2 lifted only the failed search. The refusal still takes the old slot over the field, and it measures only a receipt, so it can’t see the search toast: with a wrapped title they overlap.",
             phone8([stack(pf, [SEARCH()]), stack(ph_slot + 8, [REFUSAL()])], mark=True, typed=True), "was")
        + fr("Proposed · 390 · one toast", "Every deck toast stands on the same floor: 10px above the dock’s top edge. The field stays clear and usable.",
             phone8([stack(pf, [RECEIPT()])]))
        + fr("Proposed · 390 · two toasts", "A receipt keeps the floor (it holds Undo). The one alert sits 10px above it.",
             phone8([stack(pf, [REFUSAL(), RECEIPT()])]))
        + fr("Proposed · 390 · a refusal arrives over the failed search", "One alert at a time: the newer replaces the older, so the refusal takes the failed search’s place, never a third toast.",
             phone8([stack(pf, [REFUSAL()])], typed=True))
        + fr("Proposed · 390 · no dock (Shopping)", "The dock is hidden on Shopping, Stats and Notes, and while a resolution is open. With no bar at the foot the floor is the shipped slot.",
             phone8([stack(ph_slot, [RECEIPT()])], shot="p-deck-shopping.webp"))
        + fr("Now · 1300", "Bottom left of the pane at 16px, so a receipt covers the start of the field.",
             desk8([stack(16, [RECEIPT()], left=D_RAIL + 16, width=440)], mark=True), "was")
        + fr("Proposed · 1300 · two toasts", "The same floor (dock height + 10), the same left edge and 440px width, the same stack.",
             desk8([stack(df, [SEARCH(), RECEIPT()], left=D_RAIL + 16, width=440)], typed=True))
    )
    rule = rule_box("The rule, for every deck toast", [
        "<b>One floor.</b> Every toast in the deck slot stands on it: the I got it receipt in each of its phases, a refusal (a removal, a token, Suggested changes’ Apply), and the failed search. The floor is 10px above the top of the bar holding the page’s foot when one is on screen: the quick-add dock, or on a phone the top-off commit bar that stands in for it. With no bar, it is the shipped slot (10px above the tab bar on a phone, 16px from the bottom on desktop).",
        "<b>Where:</b> phone, 16px gutters, as shipped. Desktop, the shipped left edge (rail + 16) and 440px width, raised to the floor. No toast ever covers the quick-add field.",
        "<b>At most two, never overlapping.</b> One receipt at a time (the next write replaces it, as shipped) and one alert at a time: a refusal or the failed search, the newer replacing the older whichever kind it is.",
        "<b>Order:</b> the receipt keeps the floor because it holds Undo. An alert sits 10px above it, or on the floor when no receipt is up. When the receipt goes, the alert drops to the floor at once, with no motion.",
        "<b>A receipt arriving</b> dismisses a refusal (that press is older news), as shipped. The failed search stays, because the field still holds its query, and sits above the new receipt.",
        "<b>Timers</b> stay each toast’s own 8s, held by its own hover and focus. Roles are unchanged: receipts <code>status</code>, alerts <code>alert</code>.",
        "<b>Engineering:</b> the quick-add dock and the top-off bar publish their measured height on the root as <code>--deck-foot-h</code> (0 while hidden), as <code>useDockClearance</code> does for <code>--dock-h</code>. <code>DECK_SLOT</code> becomes one fixed stack (flex column, 10px gap) at <code>bottom: calc(var(--tabbar-h) + var(--deck-foot-h) + 10px)</code> on the phone and <code>max(16px, var(--deck-foot-h) + 10px)</code> from md. Toasts render into that stack, so <code>lift</code> and the refusal’s receipt measuring go away. The failed search joins the refusal claim. The cart’s and /credits’ slots are unchanged.",
    ])
    return board(8, "Deck page · addendum", "Deck toasts stand above the quick-add dock",
                 "Small items 2 (item 8) lifts only the failed-search toast above the dock. The I got it receipts and the refusal toasts still use the shipped slot, which ignores the dock, so they cover the quick-add field, and a refusal can land on the failed search. This board puts every deck toast on one floor and says how two stack.", frames, rule)


BOARDS = [("Good-To-Know-Rows", board1), ("Try-It-Halo", board2), ("Prices-Buy-Chips", board3), ("Copy", board4),
          ("Help-Me-Choose-Locked", board5), ("Dock-Low-Region", board6), ("Filter-Controls", board7), ("Deck-Toasts", board8)]


def build():
    os.makedirs(OUT, exist_ok=True)
    css = open(os.path.join(HERE, "si3.css")).read()
    head = lambda t: (f'<title>{t}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
                      '<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">\n'
                      f"<style>{css}</style>\n")
    bodies = []
    for nm, fn in BOARDS:
        b = fn()
        bodies.append(b)
        open(os.path.join(OUT, f"{nm}.html"), "w").write(head(f"Small items 3 {nm}") + f'<main class="canvas">{b}</main>\n')
    items = [("Good to know rows cut short", "Rows stack in one 250px column, never side by side"), ("Try it halo runs outside the frame", "Held 8px inside, like the labelled screen"),
             ("Buy chips in the prices diagram", "Right-aligned"), ("Copy: Discover order, Squirrels, section lines", "Drafts for copy review"),
             ("Help me choose while it reads", "The whole form locks"), ("Dock covers a low region", "It docks at the top instead"),
             ("Phone filter controls disagree", "The shipped 44px controls win"),
             ("Deck toasts cover the quick-add dock", "One floor above the dock, at most two, never overlapping")]
    intro = ('<header class="top"><span class="kick">The 99 · Small items 3 · for Hugh’s audit · 2026-10-29</span><h1>Small items 3</h1>'
             '<p>Eight boards, one per item (8 is an addendum), drawn over the shipped build (main, after About R4 #2367) in Low Sun. Items 1 to 4 are the visual About pages; 5 to 8 are other surfaces. Everything not drawn stays as shipped. New strings are drafts for copy review.</p><ol class="map">'
             + "".join(f'<li><div><b>{a}</b><span>{b}</span></div><a href="#b{i + 1}">Board {i + 1}</a></li>' for i, (a, b) in enumerate(items)) + "</ol></header>")
    open(os.path.join(OUT, "Main.html"), "w").write(head("Small Items 3") + f'<main class="canvas">{intro}{"".join(bodies)}</main>\n')


build()
