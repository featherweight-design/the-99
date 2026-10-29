"""Small items 4, item 3 (Hugh, 2026-10-29): the About phone top dock under the returning quick-return header.

Built on Small items 3's board 6 (build.py viewport, si3.css), with the shipped app header (cropped from Hugh's capture,
79px) in place of the board's simplified bar, because quick return is the subject: the header is away (slid off) or
shown (back over the page, `--header-offset` = 79). The back bar rides `--header-offset` as shipped (back-bar.tsx)."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build as B  # noqa: E402  (its import rebuilds the Small items 3 pages in this copy; harmless)

HDR = 79      # the shipped phone header, measured on the capture
BACK = 40     # the back bar
TAB = 74


def phone(header, dock_top, region_shift=0, ghost=False, dock=True, back=True, note=None):
    """header: 'away' | 'shown' | 'sliding'. dock_top: px from the screen's top, or None for no dock."""
    x, y, bw, bh = B.LOCK
    G = 30
    iw = B.PW - G
    ih = round(iw * 1688 / 780)
    l, t = x * iw, y * ih
    r, b = l + bw * iw, t + bh * ih
    halo = f'<span class="halo" style="left:{max(l, 8):.1f}px;top:{t:.1f}px;width:{min(r, iw - 8) - max(l, 8):.1f}px;height:{b - t:.1f}px"></span>'
    pin_y = t + min(bh * ih, 28) / 2
    pic = (f'<div class="gut" style="width:{B.PW}px;height:{ih}px;padding-left:{G}px"><div class="shot" style="width:{iw}px;height:{ih}px">'
           f'<img src="art/p-deck-top.webp" width="{iw}" height="{ih}" alt="">{halo}</div><span class="pin on" style="left:{G / 2}px;top:{pin_y:.1f}px">3</span></div>')
    head = '<div style="padding:24px 16px 16px">' + B.section_head("Your deck", "The list itself. Each row says whether you own the card and whether you’ve changed it.", n=2, total=7) + "</div>"
    # the lock toggle ~110px above the tab bar at the tap; scrolling up moves the page down by region_shift
    lock_t = t
    off = lock_t + 102 + 24 + 160 - (844 - TAB - 110) - region_shift
    body = f'<div class="vpbody" style="top:{-off}px">{head}<div style="padding:0 16px">{pic}</div></div>'
    hdr_top = 0 if header == "shown" else (-HDR if header == "away" else -HDR // 2)
    hdr = (f'<div class="qhdr{" ghost" if ghost else ""}" style="top:{hdr_top}px"><img src="art/col-header.png" alt=""></div>')
    back_top = max(0, hdr_top + HDR)
    bk = f'<div class="backbar" style="top:{back_top}px">‹ Back to Your deck</div>' if back else ""
    d = ""
    if dock and dock_top is not None:
        d = (f'<div class="dock" style="top:{dock_top}px;bottom:auto"><span class="num">3</span><p><b>Lock cards</b> protects the cards you pick. '
             f'No tool will cut a locked card unless you say so.</p><span class="x">✕</span></div>')
    n = f'<span class="qnote" style="top:{note[0]}px">{note[1]}</span>' if note else ""
    tabs = '<div class="tabbar"><span><i></i>Home</span><span><i></i>Collection</span><span><i></i>Commanders</span><span class="cur"><i></i>Decks</span><span><i></i>Friends</span></div>'
    return f'<div class="vp"><div class="vpclip" style="inset:0 0 {TAB}px">{body}</div>{bk}{hdr}{d}{n}{tabs}</div>'


EXTRA_CSS = """
.qhdr{position:absolute;left:0;right:0;height:79px;z-index:30;overflow:hidden;border-bottom:1px solid var(--border)}
.qhdr img{display:block;width:390px;height:79px}
.dock{z-index:34}
.qnote{position:absolute;right:10px;z-index:40;font:600 9.5px var(--mono);letter-spacing:.06em;color:#0D0B09;background:#8FA6BE;border-radius:4px;padding:2px 6px}
.vp .backbar{transition:none}
"""


def board():
    at_tap = B.BACK if False else BACK
    tap = phone("away", at_tap + 12)
    bug = phone("shown", at_tap + 12, region_shift=12, note=(HDR - 22, "the header’s lower edge, under the label"))
    ride = phone("shown", HDR + BACK + 12, region_shift=12)
    held = phone("away", at_tap + 12, region_shift=12)
    nob_tap = phone("away", 12, back=False)
    nob_ride = phone("shown", HDR + 12, region_shift=12, back=False)
    frames = (B.fr("Now · at the tap", "Pin 3’s region sits low, so its label docks at the top (Small items 3, item 6). The reader had scrolled down, so the header is away and the back bar is at the top.", tap, "was")
              + B.fr("Now · the reader scrolls up 12px", "The header comes back (quick return). The back bar rides down under it, as shipped. The label was placed once and doesn’t move, so it now sits over the header’s lower edge and the back bar.", bug, "was")
              + B.fr("A · the label rides the header (recommended)", "The label keeps its place <b>under the back bar</b>, whatever the header does: 79px down as the header slides in, back up as it leaves, on the header’s own 200 ms / 160 ms slide.", ride)
              + B.fr("B · the header stays away", "While a label is docked at the top, scrolling up doesn’t bring the header back. It returns once the label goes (✕, another pin, or leaving the section).", held))
    frames2 = (B.fr("A · no back bar · at the tap", "Reached from the menu, not a ?: no back bar, so the label sits 12px from the top.", nob_tap)
               + B.fr("A · no back bar · header back", "12px under the returned header.", nob_ride))
    rule = B.rule_box("The call (recommended: A)", [
        "<b>The top dock rides the header, as every sticky page head does.</b> Its top is <code>calc(var(--header-offset, 0px) + var(--about-back-h, 0px) + 12px)</code>: 12px under the back bar, or under the header when no back bar shows. <code>--header-offset</code> is the shipped room a returned header takes (79 while shown, 0 otherwise); <code>--about-back-h</code> is the back bar’s height while it shows (0 without one).",
        "It moves with the header’s own slide: 200 ms in, 160 ms out, the same curve. It never sits over the header or the back bar.",
        "Small items 3’s rule “scrolling afterwards doesn’t move it” still holds for <b>where</b> it docks: the top-or-foot choice is made once, on the tap. Only its offset follows the header, as the back bar’s does.",
        "<b>Why not B:</b> holding the header away takes the menu, search and ? out of reach while the label is up, for a reason the reader can’t see. The shipped hold (a focused field) exists so the header never covers what is being typed; nothing is being typed here.",
        "The foot dock is unchanged: the header never reaches it. Desktop has no dock. No new strings.",
    ])
    return (f'<section class="board" id="b3"><header class="bh"><span class="kick"><span class="tag">3</span>About · phone top dock (addendum)</span>'
            f'<h2>The docked label makes way for the returning header</h2><p>Small items 3, item 6 docks a low region’s label at the top. If the header was away at the tap and the reader then scrolls up, '
            f'quick return brings it back behind the label, which covers its lower edge. Drawn with the shipped header (79px) and the back bar, which already rides <code>--header-offset</code>.</p></header>'
            f'<div class="frames">{frames}</div><div class="frames">{frames2}</div>{rule}</section>')


if __name__ == "__main__":
    css = open(os.path.join(HERE, "si3.css")).read() + EXTRA_CSS
    out = sys.argv[1]
    html = board()
    open(os.path.join(out, "Dock-Header.html"), "w").write(
        '<title>Small items 4 Dock-Header</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
        '<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">\n'
        f'<style>{css}</style>\n<main class="canvas">{html}</main>\n')
    print("wrote Dock-Header.html")
