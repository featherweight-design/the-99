"""Small items 2 (account 1, 2026-10-28): items 1 and 2, drawn with account 2's About generator (pieces/data/kit),
with the shipped copy (src/lib/copy/about-pages.ts on main, discovery.ts on feat/about-visual-pr5) in place of the boards' drafts."""
import kit
from kit import board_head, frame, frames, phone, desk
import pieces as P
from pieces import tool_card, mark, TRY_H
import data
from data import SECTIONS

# shipped wording (main @4c65806 ABOUT_RULES; PR 5's showcaseCopy.tools)
data.RULES.update({
    "autofill": ("When The 99 fills a deck, it starts with a few format staples, then uses your Collection, buying only where you run short and picking the cards your commander’s decks play most. Tell Help me choose that any cards will do, and it can pick a much-played card to buy over a rarely played one of yours.", None),
    "lock": ("A locked card is safe from every tool: none will offer to cut it, and updating the deck from a list starts it kept. The lock ends when you commit a version without the card.", None),
    "targets": ("Targets come from the closest decks EDHREC can measure: decks with your commander first, then decks in its colors. With nothing to measure, they start from standard figures. So a Kinnan deck asks for more ramp than most. Going over a target never counts against you, and a card’s role is read from its text, so one can be missed.", None),
})
data.TOOLS.update({
    "suggested-changes": ("Suggested changes", "Up to five swaps, read from your games, your notes and the list.", "1 credit per run", "Opens Ghalta"),
    "proposed-cuts": ("Proposed cuts", "Counts where a deck runs long. A deeper look names the cuts.", "free · look deeper 1 credit", "Opens Sai"),
    "mana-balance": ("Mana Balance", "Counts every source of each color against what your spells ask for.", "free", "Opens Ghalta"),
})
P.RULES = data.RULES
P.TOOLS = data.TOOLS

CSS = kit.CSS + P.CSS + r"""
.ph .pb{overflow:hidden}
.dk .main{overflow:hidden}
.notes{display:grid;gap:16px;max-width:2400px}
.note h4{margin:0 0 4px;font:600 13px 'IBM Plex Sans';color:var(--fg)}
.sec2{display:flex;flex-direction:column;gap:16px;padding:26px 16px 30px;border-top:1px solid var(--border)}
.dk .sec2{gap:20px;padding:34px 0 40px}
.sec2 .sh{display:flex;flex-direction:column;gap:3px}
.sec2 .shd .k{font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.sec2 .shd h2{margin:0;font:600 21px Cinzel,serif;color:var(--fg)}
.dk .sec2 .shd h2{font-size:24px}
.sec2 .shd p{font-size:13.5px;color:var(--fg-muted)}
.shotcut{height:60px;border-radius:0 0 12px 12px;border:1px solid var(--border-strong);border-top:0;background:var(--surface-sunken);display:flex;align-items:flex-end;padding:0 0 8px 12px;font:500 10px 'IBM Plex Mono';letter-spacing:.06em;color:var(--fg-locked)}
.blk2{display:flex;flex-direction:column;gap:14px}
.gk-g2{display:grid;gap:16px}
.gk-g2 .gk{width:auto}
.gk-g2 .gk .dg{min-height:150px;height:auto}
.gk.clip .dg{outline:1.5px dashed rgba(198,83,63,.9);outline-offset:-4px}
.tc-l{display:flex;flex-direction:column;gap:16px}
.morep{display:flex;align-items:center;justify-content:center;gap:5px;align-self:center;min-height:44px;min-width:44px;padding:0 6px;font:500 10px 'IBM Plex Mono';letter-spacing:.04em;color:var(--fg-faint);border-radius:6px;position:relative}
.morep i{font-style:normal;font-size:9px}
.morep.pr{color:var(--fg-muted)}
.morep.fv{outline:2px solid var(--accent);outline-offset:0}
.hitbox{outline:1.5px dashed rgba(143,166,190,.9);outline-offset:0}
.tc.fv{outline:2px solid var(--accent);outline-offset:2px}
.tap{position:absolute;z-index:6;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid #fff;background:rgba(255,255,255,.18);box-shadow:0 0 0 6px rgba(255,255,255,.12)}
.newin{outline:1.5px dashed rgba(207,135,69,.8);outline-offset:6px;border-radius:14px}
"""


def D(title, body, width):
    return kit.doc(title, body, width).replace(kit.CSS, CSS)


def sec_head(area, sec):
    return f'<div class="shd"><span class="k">{area} · {sec["name"]}</span><h2>{sec["name"]}</h2><p>{sec["sub"]}</p></div>'


DECK = {s["id"]: s for s in SECTIONS["decks"]}


def gk(rules, cols, clip=False):
    head = f'<div class="gk-h">{mark()}<b>Good to know</b><em>What the screen can’t show</em></div>'
    cards = "".join(f'<div class="gk{" clip" if clip else ""}"><div class="dg">{P.DIAGRAMS[r]()}</div><p>{data.RULES[r][0]}</p></div>' for r in rules)
    return f'<div class="blk2">{head}<div class="gk-g2" style="grid-template-columns:repeat({cols},minmax(0,1fr))">{cards}</div></div>'


def tools_grid(tools, cols):
    cards = "".join(tool_card(t, kind="dk") for t in tools)
    return f'<div class="blk2">{TRY_H}<div class="tc-grid" style="grid-template-columns:repeat({cols},minmax(0,1fr))">{cards}</div></div>'


def gk_page(w, gcols, tcols, clip=False, sec="your-deck"):
    s = DECK[sec]
    inner = (f'<div class="sec2">{sec_head("Decks", s)}<div class="shotcut">the labelled screen, unchanged ↑</div>'
             f'{gk(s["rules"], gcols, clip)}{tools_grid(s["tools"], tcols) if tcols else ""}</div>')
    return desk(f'<div style="padding:0 30px"><div style="max-width:1180px">{inner}</div></div>', active="", w=w)


def board_gk():
    head = board_head("Item 1 · About, Good to know · #2333 · ratification",
                      "Good to know: two across from 768, three from 1280",
                      "The handoff drew Good to know as a row of three on desktop, drawn at 1300 only. At 768 the page’s content column is 646px, so a third is 205px "
                      "and a diagram 250 wide (300 for role cells) clips inside its plate. The build shows <b>two across from md (768) and three from xl (1280)</b>; "
                      "the phone swipe row is as drawn. <b>Call: ratify the build.</b> Redrawing every diagram plate to fit 181px would shrink the app’s own shapes "
                      "(the card row, the role cells) below the size they are recognised at elsewhere, which is the whole point of the diagrams.", tag="R1")
    row1 = ('<div class="frames">'
            + frame("<b>1a</b> · 768 · as built, two across", gk_page(768, 2, 0),
                    "Decks › Your deck’s three rules: two in the first row, the third under the first. Each card is 315px, the plate keeps every diagram whole. "
                    "Cards in a row share a height.")
            + frame("Not this · 768 · three across", gk_page(768, 3, 0, clip=True),
                    "The handoff’s row of three at 768: the role cells and the split bar clip at the plate’s edge (red dashes), and the sentences run to eleven lines.")
            + "</div>")
    row2 = ('<div class="frames">'
            + frame("<b>1b</b> · 1300 · as built, three across", gk_page(1300, 3, 0),
                    "Unchanged from the handoff: three across from 1280.")
            + "</div>")
    notes = ('<div class="notes" style="grid-template-columns:repeat(2,minmax(0,1fr))">'
             '<div class="note"><h4>Ratified</h4><ul><li>Good to know: <code>md:grid-cols-2 xl:grid-cols-3</code>, gap 16, cards stretch to one height per row. The plate is <code>min-height: 150</code> (the boards fixed it at 150), so a tall diagram grows the plate rather than clipping.</li>'
             '<li>Phone: the 292px swipe row with dots, unchanged.</li></ul></div>'
             '<div class="note"><h4>Noted, no change</h4>Try it (PR 5) goes to three at <b>lg</b> (1024), so between 1024 and 1279 a section shows Good to know two across above Try it three across. '
             'That’s fine: the tool cards carry no diagram and read at 290, and each block keeps its own rhythm. No About label is owed for this.</div></div>')
    return D("Good to know", head + row1 + row2 + notes, 2400)


# --------------------------------------------------------------------------------- item 2: Try it on the phone
AN = DECK["analysis"]
T = AN["tools"]  # suggested-changes, proposed-cuts, mana-balance


def gk_tail():
    """The end of Good to know's swipe row (its last card's foot and the dots) so the frame reads in place."""
    return ('<div class="gk-h">' + mark() + '<b>Good to know</b><em>What the screen can’t show</em></div>'
            '<div class="gk-row">' + "".join(f'<div class="gk"><div class="dg">{P.DIAGRAMS[r]()}</div><p>{data.RULES[r][0]}</p></div>' for r in AN["rules"]) + '</div>'
            '<div class="dots"><i class="on"></i><i></i></div>')


def morep(n=None, fewer=False, cls=""):
    t = "Show fewer <i>▴</i>" if fewer else f"{n} more below <i>▾</i>"
    return f'<span class="morep {cls}">{t}</span>'


def try_phone(state):
    cards = [tool_card(T[0])]
    tail = ""
    if state in ("rest", "pressed", "back"):
        cls = {"rest": "", "pressed": "pr hitbox", "back": "fv"}[state]
        tail = morep(2, cls=cls)
        if state == "pressed":
            tail = tail.replace("</span>", '</span><span class="tap" style="left:50%;top:50%"></span>', 0).replace('<i>▾</i></span>', '<i>▾</i><span class="tap" style="left:50%;top:50%"></span></span>')
    elif state == "open":
        cards += [tool_card(T[1]).replace('class="tc"', 'class="tc fv newin"', 1), tool_card(T[2]).replace('class="tc"', 'class="tc newin"', 1)]
        tail = morep(fewer=True)
    body = f'<div class="tc-l">{TRY_H}{"".join(cards)}{tail}</div>'
    return f'<div class="sec2" style="border-top:0;padding-top:16px">{body}</div>'


def board_try():
    head = board_head("Item 2 · About, Try it on the phone · #2340 · Hugh asked for this",
                      "“2 more below” is a press: it opens the rest in place and folds back",
                      "The boards drew <i>N more below</i> as plain text, so a phone reader never reached cards 2 onward. PR 5 made it a button in the same type that opens the rest, "
                      "one way. <b>Drawn:</b> the line keeps its type (mono 10, <code>--fg-faint</code>) and gains a small ▾, so it reads as something that opens; it is a 44 × 44 press. "
                      "Pressed, the rest appear under the first card in place and focus moves to card 2. At the foot of the opened list, <b>Show fewer ▴</b> in the same type folds them "
                      "back and returns focus to the press. Desktop is unchanged (every card shows).", tag="R1")
    ph = '<div class="frames">'
    ph += frame("<b>2a</b> · 390 · at rest", phone(try_phone("rest"), active="", h=844),
                "Decks › Analysis, scrolled to Try it (Good to know sits just above): Suggested changes, then <b>2 more below ▾</b>, centred, 16px under the card.")
    ph += frame("<b>2b</b> · 390 · pressed", phone(try_phone("pressed"), active="", h=844),
                "The press is the whole 44 × 44 box (blue dashes, drawn for this board). Pressed it brightens to <code>--fg-muted</code>, as on hover.")
    ph += frame("<b>2c</b> · 390 · opened (the whole scroll)", phone(try_phone("open"), active=""),
                "Proposed cuts and Mana Balance appear under Suggested changes (orange dashes mark what opened), no animation beyond the shipped list’s. "
                "Focus lands on Proposed cuts, the card’s own Try it press. <b>Show fewer ▴</b> ends the list.")
    ph += frame("<b>2d</b> · 390 · folded back", phone(try_phone("back"), active="", h=844),
                "Show fewer closes the two cards and puts focus on <b>2 more below ▾</b> (focus ring), scrolled so the press is in view. It stays as the reader left it for the visit; "
                "a new visit starts folded.")
    ph += "</div>"
    dk = ('<div class="frames">'
          + frame("1300 · unchanged", desk(f'<div style="padding:0 30px"><div style="max-width:1180px"><div class="sec2" style="border-top:0">{tools_grid(T, 3)}</div></div></div>', active=""),
                  "Desktop shows every card, three across from 1024, so it has no press.")
          + "</div>")
    notes = ('<div class="notes" style="grid-template-columns:repeat(3,minmax(0,1fr))">'
             '<div class="note"><h4>The press</h4><ul><li><i>{n} more below</i> plus <span class="m">▾</span> (<code>aria-hidden</code>); mono 10/500, tracking .04em, <code>--fg-faint</code>, hover and pressed <code>--fg-muted</code>. 44 × 44 at every pointer.</li>'
             '<li><code>aria-expanded="false"</code>, <code>aria-controls</code> the list. Name: its visible text.</li></ul></div>'
             '<div class="note"><h4>Open, and fold back</h4><ul><li>Opening replaces the press with the remaining cards; focus moves to the first of them (its Try it press).</li>'
             '<li><b>Show fewer ▴</b> (same type, 44 × 44, <code>aria-expanded="true"</code>) after the last card. It removes them, puts focus on the restored press and keeps it on screen.</li>'
             '<li>State is per visit; a ? landing or reload starts folded.</li></ul></div>'
             '<div class="note"><h4>For engineering</h4><ul><li><code>try-it.tsx</code>: add the fold, the ▾/▴ glyphs and the focus moves to PR 5’s one-way press.</li>'
             '<li>Copy for /copy-review: <i>Show fewer</i> (the Consider panel’s shipped <code>collapse</code> string).</li>'
             '<li>A landed label’s card (moved under the label) is never in the folded list, as PR 5 already does.</li></ul></div></div>')
    return D("Try it", head + '<div class="sec"><h3>Phone</h3>' + ph + '</div><div class="sec"><h3>Desktop</h3>' + dk + '</div>' + notes, 2160)


BOARDS = [("Good-To-Know", board_gk), ("Try-It", board_try)]
