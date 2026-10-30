"""Item 8 · quick-add's failed search (#172)."""
import kit
from kit import doc, board_head, frame
import pieces as P
import deck as D

kit.CSS += r"""
.x-out{position:relative}
.x-out::after{content:'';position:absolute;inset:-6px;border:1.5px dashed rgba(198,83,63,.85);border-radius:12px;pointer-events:none}
.x-tag{position:absolute;z-index:20;right:8px;top:-12px;font:600 9.5px 'IBM Plex Mono';color:#0D0B09;background:#C6533F;border-radius:4px;padding:2px 6px}
"""

D_ = P.DECKS["aang"]
Q = "sw"
TITLE = "Couldn’t search just now."
ACT = "Try again"


def phone_list_page():
    return P.phone_header(D_) + P.tabs(built=94) + P.phone_list(shopping="5", built=94)


def ph(dock, over="", kb=True):
    return D.phone_page(phone_list_page(), over=over, keyboard_up=kb, dock_html=dock)


def rows(desk=False):
    return [D.qrow("swan", Q, active=True, desk=desk), D.qrow("swords", Q, desk=desk), D.qrow("aang", Q, desk=desk)]


def dk(dock, over=""):
    page = P.desk_header(D_) + P.dtabs(built=94) + P.desk_list()
    return D.desk_page(page, over=over, dock_html=dock, h=860)


TST_PH = "left:16px;right:16px;bottom:78px"       # lifted above the dock (dock 66px + 12)
TST_DK = "left:80px;width:440px;bottom:72px"      # rail 64 + 16; above the dock (61px + 11)


def board():
    head = board_head("Item 8 · quick-add’s failed search · #172",
                      "A failed search says so, in the shared toast, with Try again",
                      "Today a rejected search sends the bar back to “nothing searched yet”: the player types, nothing opens, nothing says why. "
                      "The no-results state would be false (it says they don’t own a card they may own). <b>Call: the shared toast</b> "
                      "(<code>ToastFrame</code>, the deck slot), as your rule has transient errors do, worded like the game log picker’s own failed search: "
                      "<b>Couldn’t search just now.</b> with <b>Try again</b>. The bar itself is untouched: the field keeps what was typed and focus, no list opens, "
                      "and the status line stays empty, so nothing on the bar claims a result. The Consider panel’s degraded block was the other precedent, "
                      "but it is sized for a panel; a one-line bar has no room for it, and the toast already is the app’s transient-error voice.", tag="R1")
    phones = ('<div class="frames">'
              + frame("Today · 390 · the search fails", ph(D.dock(Q, focus=True)),
                      "Shipped: nothing. The field reads “sw”, no list, no count, no reason.")
              + frame("<b>8a</b> · 390 · the search fails", ph(D.dock(Q, focus=True), D.toast(TITLE, ACT, style=TST_PH)),
                      "The toast rises above the dock (the keyboard is up, so the tab bar is under it). The field keeps “sw” and keeps focus; typing more just searches again.")
              + frame("<b>8b</b> · 390 · after Try again", ph(D.dock(Q, focus=True, status="3 matches · 5-color only", pop=D.popover(rows()))),
                      "Try again re-runs the same query and the toast goes. The list opens as it always does; focus returns to the field, so ↵ still adds the top match.")
              + frame("Not this · 390 · the empty state", ph(D.dock(Q, focus=True, status="0 matches · 5-color only",
                      pop='<div class="qp x-out"><span class="x-tag">false on a failure</span><div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:26px 30px">'
                          '<p style="font:700 17px Cinzel,serif;color:var(--fg)">Nothing in the pile by that name</p>'
                          '<p style="font-size:13.5px;line-height:1.55;margin-top:8px;color:var(--fg-muted)">No card you own matches “sw” in Avatar Aang’s colors.</p>'
                          '<span style="margin-top:12px;font-size:12.5px;font-weight:600;text-decoration:underline;color:var(--accent-text)">Search all cards instead</span></div></div>')),
                      "Why not reuse quickAddEmpty: it is a claim about the collection that a failed request hasn’t earned.")
              + "</div>")
    desks = ('<div class="frames">'
             + frame("<b>8c</b> · 1300 · the search fails", dk(D.dock(Q, focus=True, desk=True), D.toast(TITLE, ACT, style=TST_DK)),
                     "The deck slot (rail + 16, 440 wide), lifted to sit above the dock rather than on it. Same words, same press.")
             + frame("<b>8d</b> · 1300 · after Try again", dk(D.dock(Q, focus=True, desk=True, status="3 matches · 5-color only", pop=D.popover(rows(True)))),
                     "The shipped popover and count, as if nothing had failed.")
             + "</div>")
    notes = ('<div class="notes" style="grid-template-columns:repeat(3,minmax(0,1fr))">'
             '<div class="note"><h4>When it shows</h4><ul><li>A search for a query the bar would search (2–100 characters) is rejected or times out.</li>'
             '<li>Only for the latest query: a stale request failing after a newer one landed shows nothing.</li>'
             '<li>It goes when a search for the field’s text succeeds (Try again, or typing), when the field is cleared, or on the toast’s own 8s timer (held on hover or focus).</li></ul></div>'
             '<div class="note"><h4>Try again</h4><ul><li>Re-runs the current query once; the toast leaves when the request starts. Fails again: the toast comes back.</li>'
             '<li>Focus returns to the field after the press, so the keyboard stays up on a phone and ↵ adds as usual.</li>'
             '<li><code>role="alert"</code> on the toast, as <code>ToastFrame</code> already does for errors.</li></ul></div>'
             '<div class="note"><h4>For engineering</h4><ul><li><code>use-card-search.ts</code>: keep <code>setRows(null)</code> on a rejection and raise the toast; the bar draws nothing new.</li>'
             '<li>The deck slot needs a lift while the quick-add dock is on screen (phone: above the dock; desktop: bottom = dock height + 10), so the toast never covers the field.</li>'
             '<li>Copy for /copy-review: <i>Couldn’t search just now.</i> / <i>Try again</i> (the seat picker’s strings, split).</li></ul></div></div>')
    return doc("Quick-add failure", head + '<div class="sec"><h3>Phone</h3>' + phones + '</div><div class="sec"><h3>Desktop</h3>' + desks + '</div>' + notes, 2920)
