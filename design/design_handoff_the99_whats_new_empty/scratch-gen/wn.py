"""What's new, empty (account 2, 2026-11-03): the quiet state redrawn, and the head's link renamed.

Drawn over the shipped Home (whats-new.tsx `Quiet`, copy feed.ts `home.quietLead`/`quietRest`/`choose`) with the
announcements kit. Every new string is a draft for /copy-review.
"""
import kit
import ann as A
from kit import doc, board_head, frame, frames, ico, NAV
from annb import note, col
import w6

kit.CSS += r"""
.chg{outline:1.5px dashed rgba(207,135,69,.8);outline-offset:-2px;border-radius:8px}
.sh .r.chg{outline-offset:2px;border-radius:6px}
/* the fan: two of the row's 46x64 picture plates, tilted, carrying the two teased kinds' glyphs */
.fan{position:relative;flex:none;width:72px;height:72px}
.fan .pl{position:absolute;top:3px;width:46px;height:64px;border-radius:4px;border:1px solid var(--border-strong);background:var(--surface-raised);
  display:flex;align-items:center;justify-content:center;color:var(--fact);box-shadow:0 2px 6px rgba(0,0,0,.35)}
.fan .pl.b{left:0;transform:rotate(-9deg);color:var(--fg-faint);justify-content:flex-start;padding-left:6px}
.fan .pl.f{left:24px;transform:rotate(6deg)}
.fan .pl.f::before{content:'';position:absolute;top:6px;right:6px;width:6px;height:6px;border-radius:50%;background:var(--accent)}
/* A: centered */
.eq.a{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:22px 20px 20px}
.eq.a p{max-width:300px}
.dk .eq.a{padding:26px 24px 24px}
.dk .eq.a p{max-width:420px}
/* B: the fan in the row's picture slot, words beside it */
.eq.b{display:flex;align-items:center;gap:14px;padding:12px 14px}
.eq.b .fan{width:72px}
/* C: the words alone */
.eq.c{padding:14px}
.eq p{margin:0;font-size:13px;line-height:1.55;color:var(--fg-body);text-wrap:pretty}
.eq p b{display:block;font-weight:600;color:var(--fg);font-size:13.5px;margin-bottom:2px}
.eq.c p b{display:inline;font-size:13px;margin:0}
.old{opacity:.95}
"""

GL = {
    "new-precon": ico(NAV["Decks"], 20),
    "trade-match": ico(NAV["Friends"], 20),
    "spare-request": ico(NAV["Friends"], 20),
    "secret-lair": f'<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{A.POST}</svg>',
    "new-set": ico(NAV["Collection"], 20),
    "price-drop": '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3.5v12M5 11l5 5 5-5"/></svg>',
    "commander-decklists": f'<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{A.POST}</svg>',
}

# The tease: the first two kinds on, in this order (a catalog kind, then a friend kind, alternating).
TEASE_ORDER = ["new-precon", "trade-match", "secret-lair", "spare-request", "price-drop", "new-set", "commander-decklists", "combo", "wizards-news"]
TEASE = {
    "new-precon": "a precon drops",
    "trade-match": "a friend has a spare you want",
    "secret-lair": "a Secret Lair drop is announced",
    "spare-request": "a friend asks for your spare",
    "price-drop": "a wishlist card gets cheaper",
    "new-set": "a new set comes out",
    "commander-decklists": "Commander decklists go up",
    "combo": "you can make a new combo",
    "wizards-news": "Wizards has news",
}
ALL_ON = list(TEASE_ORDER)
DEFAULTS = ["secret-lair", "commander-decklists", "wizards-news", "spare-request"]


def teased(on):
    return [k for k in TEASE_ORDER if k in on][:2]


def line(on):
    t = [TEASE[k] for k in teased(on)]
    return "We’ll tell you here when " + " or ".join(t) + "."


def fan(on):
    k = teased(on)
    post = GL["secret-lair"]
    back = GL.get(k[1], post) if len(k) > 1 else post
    front = GL.get(k[0], post)
    return f'<span class="fan" aria-hidden="true"><span class="pl b">{back}</span><span class="pl f">{front}</span></span>'


def empty(v, on=ALL_ON, chg=True):
    c = " chg" if chg else ""
    words = f'<p><b>Nothing new right now.</b> {line(on)}</p>'
    if v == "a":
        return f'<div class="eq a{c}">{fan(on)}{words}</div>'
    if v == "b":
        return f'<div class="eq b{c}">{fan(on)}{words}</div>'
    return f'<div class="eq c{c}">{words}</div>'


SHIPPED = A.quiet("new sets, new precons, Secret Lair drops, Commander decklists, Wizards news, price drops on your wishlist, trade matches, "
                  "friends asking for your spares and combos you can make")


def head(new=True, n=None, chg=True):
    link = "Choose your notifications" if new else "Choose what shows"
    return (f'<h2 class="sh">What’s new{f" <em>· {n} new</em>" if n else ""}'
            f'<span class="r{" chg" if new and chg else ""}">{link} <i>›</i></span></h2>')


def feed(box, new=True, n=None, chg=True):
    return f'<section class="blk">{head(new, n, chg)}<div class="fd">{box}</div></section>'


def ph(f):
    return A.ph(A.home(False, "", f))


def dk(f, h=600):
    return A.dk(A.home(True, "", f), h=h)


# ================================================================ 1 · the empty state, three ways
def board_dirs():
    body = (board_head("Home · What’s new · nothing new · 390 and 1300", "What’s new, when nothing is new",
                       "Hugh’s ask: redraw the empty box with restraint, and the head’s link reads <b>Choose your notifications</b>. "
                       "Today the box names all nine kinds in one run-on sentence. Each direction keeps the shipped lead, <b>Nothing new right now.</b>, "
                       "and teases <b>two</b> kinds, picked from the kinds this player has on. Dashed orange outlines mark what changes. "
                       "<b>Recommended: B.</b>")
            + frames(
                frame("<b>Today</b> · 390 · shipped", ph(feed(SHIPPED, new=False)), "All nine kinds, every visit."),
                frame("<b>A</b> · 390 · centered", ph(feed(empty("a"))), "A small fan of the row’s picture plates over two short lines."),
                frame("<b>B</b> · 390 · recommended", ph(feed(empty("b"))), "The fan sits where a row’s picture sits, the words beside it. Shortest box with a picture."),
                frame("<b>C</b> · 390 · words only", ph(feed(empty("c"))), "The shipped box with the shorter line. Most restrained, least personality."),
                gap=36)
            + '<div style="height:36px"></div>'
            + frames(
                frame("<b>B</b> · 1300 · recommended", dk(feed(empty("b")))),
                col(note("Why B",
                         "It reads as an empty row: the same 46×64 plates a feed row draws (the post-glyph plate, as shipped), so the box looks like "
                         "the place news lands, not a message about it. Two plates fan with a slight tilt, the front one carries the unseen dot "
                         "in accent, a hint of what a new item looks like. It stays the height of the shipped box on phone."),
                    note("The tease",
                         "Two kinds, never all of them: the first two this player has on, in a fixed order that alternates catalog and friend news "
                         "(new precons, trade matches, Secret Lair, spare asks, price drops, new sets, decklists, combos, Wizards news). "
                         "All on: <i>a precon drops or a friend has a spare you want</i>. The four defaults: <i>a Secret Lair drop is announced or a friend asks "
                         "for your spare</i>. One kind on: that one alone. The plates carry those two kinds’ glyphs."),
                    note("The link",
                         "<b>Choose your notifications ›</b> replaces <b>Choose what shows ›</b> everywhere the head draws it (rows, quiet, every kind off). "
                         "It still opens Settings, landing on the Notifications section."),
                    w=440),
                gap=40)
            + '<div style="height:36px"></div>'
            + frames(frame("<b>A</b> · 1300 · centered", dk(feed(empty("a")), h=640)), frame("<b>C</b> · 1300 · words only", dk(feed(empty("c")))), gap=40))
    return doc("What’s new empty", body, 2700)


# ================================================================ 2 · B in every state it reaches
def board_states():
    off = '<div class="eq c chg"><p><b>Nothing will show here.</b> Every kind of news is off.</p></div>'
    never = empty("b", DEFAULTS) + w6.offer_stk(chg=False)
    one = empty("b", ["spare-request"])
    body = (board_head("Home · What’s new · B in its states · 390", "B wherever the quiet box shows",
                       "The same box in each state that reaches it today. The lines follow the kinds on; nothing else changes. "
                       "The offer line (never chosen) and the off line keep their shipped words and places.")
            + frames(
                frame("<b>Defaults on</b> · never chose", ph(feed(never, chg=False).replace('<span class="r">', '<span class="r" style="display:none">')),
                      "The four default kinds tease Secret Lair and spare asks; the shipped offer line follows, and the head has no link until the player chooses, as shipped."),
                frame("<b>One kind on</b>", ph(feed(one)), "One kind, one tease. A single glyph plate would be drawn twice, so the back plate falls back to the post glyph."),
                frame("<b>Every kind off</b> · chose", ph(feed(off)), "No kind to tease, so no fan: the shipped off line, the renamed link."),
                frame("<b>With rows</b>", ph(A.feed([A.irow("price"), A.irow("combo")], n=1).replace("Choose what shows", '<span class="chg" style="padding:2px 4px">Choose your notifications</span>')),
                      "Rows unchanged; only the link’s words."),
                gap=36))
    return doc("What’s new empty states", body, 1740)


BOARDS = [("Main", board_dirs, "1 · What’s new, nothing new"), ("States", board_states, "2 · B in its states")]
