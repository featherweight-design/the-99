"""Three small items, items 2 and 3 (account 2, 2026-10-30), over the Wizards announcements kit.

Item 2: the precon page head's commander art (open-precon-view.tsx, CommanderThumb `open` 46x64 / `openWide` 56x78) against
the early list's 64x89 / 84x117. Item 3: Home's What's new for a reader who never chose and has nothing in the window
(whats-new.tsx: today the full OptIn).
"""
import kit
import pre as R
import ann as A
from kit import doc, board_head, frame, frames
from annb import note, col

kit.CSS += r"""
.tdy .z-th{width:46px!important;height:64px!important;border-radius:6px}
.dk .tdy .z-th{width:56px!important;height:78px!important}
.z-pp .z-th{border-radius:6px}
.fol .z-th{outline:1.5px dashed var(--accent);outline-offset:3px}
.vfx{position:absolute;left:0;right:0;bottom:62px;height:110px;background:linear-gradient(to bottom,rgba(20,17,14,0),var(--bg) 78%);z-index:4;pointer-events:none}
.dk .vfx{bottom:0}
.vfx::after{content:"scrolls on";position:absolute;left:0;right:0;bottom:14px;text-align:center;font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.oin{padding:14px;display:flex;flex-direction:column;gap:4px}
.oin h3{margin:0;font:700 17px 'Cinzel',serif;color:var(--fg)}
.oin .ln{font-size:13px;line-height:1.55;color:var(--fg-muted);margin-bottom:6px}
.oin .cks{display:flex;flex-direction:column}
.oin .ck{display:flex;gap:12px;align-items:flex-start;padding:8px 0;min-height:44px}
.oin .ck+.ck{border-top:1px solid var(--border)}
.oin .ck .box{width:18px;height:18px;border:1.5px solid var(--border-strong);border-radius:4px;flex:none;margin-top:1px}
.oin .ck b{display:block;font:500 14px 'IBM Plex Sans';color:var(--fg)}
.oin .ck span span{font-size:12.5px;line-height:1.45;color:var(--fg-muted)}
.oin .bp{margin-top:8px;height:44px;border-radius:10px;background:#EDE6D8;color:#14110E;opacity:.5;display:flex;align-items:center;justify-content:center;font:500 14px 'IBM Plex Sans'}
.oin .ft{margin-top:8px;font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-faint)}
.cmpw{display:flex;gap:28px;align-items:flex-end}
.cmp{display:flex;flex-direction:column;gap:8px;align-items:center;font:10px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint)}
.cmp img{display:block;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.5)}
"""


# ================================================================ item 2 · the precon page head
def ph_page(inner, h=860):
    return kit.phone(inner, "Decks", h=h, over=R.DOCK + '<div class="vfx" style="bottom:150px"></div>')


def dk_page(inner, h=560):
    return kit.desk(inner, "Decks", h=h, over='<div class="vfx"></div>')


def wrap(page, cls):
    return page.replace('<div class="z-pp">', f'<div class="z-pp {cls}">', 1)


def board_art():
    rel_p = R.release_page()
    rel_d = R.release_page(True)
    early_p = R.early_page(unmatched=False)
    gi = kit.img("giada.jpg")
    sizes = ('<div class="cmpw">'
             f'<div class="cmp"><img src="{gi}" alt="" style="width:46px;height:64px">46×64</div>'
             f'<div class="cmp"><img src="{gi}" alt="" style="width:64px;height:89px">64×89</div>'
             f'<div class="cmp"><img src="{gi}" alt="" style="width:56px;height:78px">56×78</div>'
             f'<div class="cmp"><img src="{gi}" alt="" style="width:84px;height:117px">84×117</div></div>')
    body = (board_head("item 2 · the precon page head · 390 and 1300",
                       "The precon page follows the early list",
                       "<b>Call: yes.</b> The early list’s page draws the commander at 64×89 (84×117 from <code>md</code>), and the reader reaches the precon page from it: when the release list "
                       "lands, the early address sends them to the precon page. At today’s 46×64 the same card would shrink at the moment the precon becomes startable. "
                       "So both pages use one head: <code>CommanderThumb</code>’s existing <code>summary</code> size (64×89) on a phone and a new <code>openWide</code> of 84×117 from <code>md</code>, "
                       "radius 6, the colour ring as today. Nothing else in the head moves; the title column starts 18px (28px) further right, and the head grows by the art’s extra height only where "
                       "the text was shorter than it. A commander pair keeps its 6px gap at the same size (134px on a phone).", tag="R1")
            + frames(frame("<b>Today</b> · 390 · 46×64", ph_page(wrap(rel_p, "tdy"))),
                     frame("<b>Follows</b> · 390 · 64×89", ph_page(wrap(rel_p, "fol")),
                           "The title keeps its one line; the meta line wraps one word earlier. Nothing else moves."),
                     frame("<b>Early list</b> · 390 · as approved", ph_page(early_p),
                           "For comparison: the page the reader comes from."),
                     col(note("The four sizes", sizes + '<p style="margin-top:12px">63/88 to within a pixel at each: 64/89 is 0.719, 84/117 is 0.718.</p>'), w=400), gap=36)
            + frames(frame("<b>Today</b> · 1300 · 56×78", dk_page(wrap(rel_d, "tdy"))))
            + frames(frame("<b>Follows</b> · 1300 · 84×117", dk_page(wrap(rel_d, "fol")),
                           "Link a deck and Start stay at the head’s right end, as today.")))
    return doc("Header art", body, 390 * 3 + 36 * 3 + 112 + 400)


# ================================================================ item 3 · the first-run offer with nothing new
QUIET = A.quiet("Secret Lair drops, Commander decklists, Wizards news and friends asking for your spares")
OFF = [("New sets", "When a set comes out."), ("New precons", "When a Commander precon comes out."),
       ("Price drops on your wishlist", "A card you want gets cheaper."),
       ("Trade matches", "A friend has a spare of a card on your wishlist."),
       ("Combos you can make", "You now own both halves of a two-card combo.")]


def today_optin():
    cks = "".join(f'<div class="ck"><span class="box"></span><span><b>{n}</b><span>{l}</span></span></div>' for n, l in OFF)
    return ('<div class="oin"><h3>Choose what shows here</h3><p class="ln">Pick what else you want to hear about. You can change it in Settings.</p>'
            f'<div class="cks">{cks}</div><span class="bp">Show these</span><p class="ft">In the app only. No email, ever.</p></div>')


def board_offer():
    tp = A.ph(A.home(False, "", A.feed([], foot=today_optin(), choose=False)))
    cp = A.ph(A.home(False, "", A.feed([], foot=QUIET + A.offer(), choose=False)))
    op = A.ph(A.home(False, "", A.feed([], foot=QUIET + A.offer(True), choose=False)))
    cd = A.dk(A.home(True, "", A.feed([], foot=QUIET + A.offer(), choose=False)), h=560)
    od = A.dk(A.home(True, "", A.feed([], foot=QUIET + A.offer(True), choose=False)), h=720)
    body = (board_head("item 3 · Home › What’s new · never chosen, nothing in the window",
                       "The offer line, under the quiet line",
                       "<b>Call: the same line as under rows, under the shipped quiet line.</b> A reader who has never chosen still has four kinds on from the start (the three announcement kinds and "
                       "spare requests), so <i>Nothing new right now. You hear about …</i> is true and names them. The offer follows it as the box’s last line, exactly as it follows rows: "
                       "<b>Pick ▾</b> opens the shipped boxes in place with <b>Show these</b>, the ✕ saves an empty pick and the line is gone for good. "
                       "The full opt-in panel leaves; there is then one offer for every reader who has not chosen, whatever the window holds. "
                       "Engineering: <code>WhatsNew</code> draws <code>Quiet</code> + the offer line when <code>!chosen</code> and <code>items</code> is empty; <code>OptIn</code> retires.", tag="R1")
            + frames(frame("<b>Today</b> · 390", tp, "The full opt-in fills the box: five boxes and Show these on every Home visit until the reader picks."),
                     frame("<b>Drawn</b> · 390 · closed", cp, "Two lines: what you hear about now, and what else you could."),
                     frame("<b>Drawn</b> · 390 · Pick pressed", op, "The shipped boxes open in place of the line, under the quiet line. The ✕ stays at the top right."), gap=36)
            + frames(frame("<b>Drawn</b> · 1300 · closed", cd, ""))
            + frames(frame("<b>Drawn</b> · 1300 · Pick pressed", od, "Two columns of boxes from <code>md</code>, as the offer board drew them.")))
    return doc("Offer empty", body, 1420)


BOARDS = [("Header-Art", board_art, "2 · Precon page header art"), ("Offer-Empty", board_offer, "3 · The offer when What’s new is empty")]
