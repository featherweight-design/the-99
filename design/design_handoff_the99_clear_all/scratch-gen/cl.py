"""Clear all (account 2, 2026-11-21): one press that clears every What's new item on Home.

Drawn over the shipped Home (whats-new.tsx, feed/show-all.tsx `ShowAllFooter`, feed/dismiss.tsx, social-toast.tsx's
centre toast) with the announcements kit and the What's new empty kit (wn.py: the quiet box as approved, B).
New pieces carry the dashed copper outline. Every new string is a DRAFT for /copy-review.
"""
import kit
import ann as A
import w4
import wn
from kit import doc, board_head, frame, frames
from annb import note, col

kit.CSS += r"""
/* the box's foot (ShowAllFooter + the archive entry), with Clear all between them */
.ft{display:flex;align-items:center;gap:2px;padding:4px 6px 4px 14px;border-top:1px solid var(--border)}
.ft a{min-height:44px;display:flex;align-items:center;padding:0 4px;font:500 13px 'IBM Plex Sans';color:var(--fg-muted);margin-right:auto;white-space:nowrap}
.ft a i{font-style:normal;margin-left:5px;color:var(--fg-faint)}
.ft small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);margin-right:auto}
.ft span{min-height:44px;display:flex;align-items:center;padding:0 10px;font:500 13px 'IBM Plex Sans';color:var(--fg);white-space:nowrap}
.ft span.ca{color:var(--fg-muted)}
.ft span.ca.busy{color:var(--fg-faint)}
.ft span.chg{outline-offset:-4px}
.dk .ft a,.dk .ft span{min-height:36px}
/* a day label (whats-new.tsx DAY) */
.dy{margin:0;padding:9px 14px 0;font:500 9px 'IBM Plex Mono';letter-spacing:.14em;color:var(--fg-locked);text-transform:uppercase}
.fd .dy+.fi{border-top:0}
.fd .fi+.dy{border-top:1px solid var(--border)}
/* the shipped centre toast (ToastFrame placement centre): title, then the action */
.tq{position:absolute;z-index:45;left:16px;right:16px;display:flex;align-items:center;gap:14px;padding:4px 6px 4px 16px;border-radius:10px;
  background:var(--elevated);border:1px solid var(--border-strong);box-shadow:0 12px 40px rgba(0,0,0,.5)}
.tq p{flex:1;margin:0;padding:8px 0;font-size:13.5px;color:var(--fg)}
.tq b{min-height:44px;display:flex;align-items:center;padding:0 12px;font:600 13.5px 'IBM Plex Sans';color:var(--accent-text);text-decoration:underline;text-underline-offset:2px}
.dk .tq{left:50%;right:auto;width:420px;transform:translateX(-50%);bottom:24px}
.ring{box-shadow:0 0 0 2px var(--accent);border-radius:8px}
"""

I = w4.items()
TODAY = ["ask2", "ask", "match2"]
EARLIER = ["price", "combo", "precon", "set", "price2"]


def rows(keys, desk=False):
    return "".join(w4.row(I[k], desk, "new") for k in keys)


def day(label):
    return f'<p class="dy">{label}</p>'


def foot(ca=True, archive=True, hidden=0, total=0, busy=False):
    left = '<a>Past announcements<i>›</i></a>' if archive else (f'<small>{hidden} more</small>' if hidden else '<small></small>')
    c = f'<span class="ca chg{" busy" if busy else ""}">Clear all</span>' if ca else ""
    s = f'<span>Show all {total}</span>' if hidden else ""
    return f'<div class="ft">{left}{c}{s}</div>'


def head(n=None):
    return (f'<h2 class="sh">What’s new{f" <em>· {n} new</em>" if n else ""}'
            '<span class="r">Choose your notifications <i>›</i></span></h2>')


def box(inner, n=None):
    return f'<section class="blk">{head(n)}<div class="fd">{inner}</div></section>'


def full(desk=False, expanded=False, ca=True, busy=False):
    """The lead (Colin's match) and eight rows: five shown, three under Show all."""
    t, e = TODAY, (EARLIER if expanded else EARLIER[:2])
    inner = day("Today") + rows(t, desk) + day("Earlier") + rows(e, desk)
    inner += foot(ca, hidden=0 if expanded else 3, total=8, busy=busy)
    return box(inner, 5)


def cleared():
    return box(wn.empty("b", wn.ALL_ON, chg=False) + foot(ca=False))


def toast(text, act=None, bottom=92):
    a = f'<b>{act}</b>' if act else ""
    return f'<div class="tq chg" style="bottom:{bottom}px"><p>{text}</p>{a}</div>'


def ph(inner, badges=None, over="", h=None):
    b = {"Friends": 3}
    b.update(badges or {})
    return kit.phone(inner, "Home", badges=b, over=over, h=h).replace('class="ph"', 'class="ph d4n"', 1)


def dk(inner, badges=None, over="", h=None):
    b = {"Friends": 3}
    b.update(badges or {})
    return kit.desk(inner, "Home", badges=b, over=over, h=h).replace('class="dk"', 'class="dk d4n"', 1)


def home(desk, feed_html, lead=True):
    return A.home(desk, w4.lead("match", desk, "new") if lead else "", feed_html)


TOAST = "Cleared 9 from What’s new."
FAIL = "We couldn’t clear those. Try again."


# ================================================================ 1 · the press, before and after
def board_main():
    body = (board_head("Home · What’s new · clear all · 390 and 1300", "Clear all of What’s new in one press",
                       "Hugh’s ask: a way to clear every notification at once. Today each item has its own ✕, so a reader with nine items presses nine times. "
                       "<b>Clear all</b> joins the box’s own foot, between <i>Past announcements ›</i> and <i>Show all N</i>. One press clears every item What’s new counts: "
                       "the lead story, the rows shown and the rows under Show all. A toast offers <b>Undo</b>. Dashed orange outlines mark what is new.")
            + frames(
                frame("<b>C1</b> · 390 · nine items", ph(home(False, full()), {"Home": 5}),
                      "The lead (Colin’s match) and eight rows, five shown. Five unseen: the head and the Home slot say 5. <b>Clear all</b> sits in the foot, "
                      "in muted ink so <i>Show all 8</i> stays the foot’s main press."),
                frame("<b>C2</b> · 390 · after Clear all", ph(home(False, cleared(), lead=False), over=toast(TOAST, "Undo"), h=844),
                      "Everything leaves at once: the lead slot, the rows, the count, the Home badge. The box shows the approved quiet state, so the page reads as "
                      "caught up, not broken. The foot keeps <i>Past announcements ›</i>. The shipped centre toast says how many and offers <b>Undo</b>. Items leave the moment it is pressed, before the write lands, and focus moves to the box’s head, as after the last ✕."),
                frame("<b>C3</b> · 390 · Show all pressed", ph(home(False, full(expanded=True)), {"Home": 5}),
                      "With the whole list open, <i>Show all</i> leaves the foot and <b>Clear all</b> keeps its place, so it is the last thing under the last row."),
                col(note("Why the foot",
                         "The head already carries the count and <i>Choose your notifications ›</i>; at 390 there is no room for a third thing. The foot is where the "
                         "box’s list actions already live (<i>Show all</i>), and it is right under the rows it clears."),
                    note("No confirm step",
                         "One press clears, and the toast’s <b>Undo</b> puts every item back where it was. A dialog would turn a two-second chore into a decision. "
                         "The toast stays while hovered or focused, as every shipped toast does."),
                    note("What it clears",
                         "Exactly what the ✕s would clear: the lead and every row, Upcoming drops included. It writes the same dismissals as the ✕, so cleared items "
                         "never come back to Home. Posts stay in <i>Past announcements</i>, and a friend’s ask still waits on <b>Friends › Waiting on you</b>; "
                         "clearing never answers it, as the ✕ never does."),
                    w=400),
                gap=36)
            + '<div style="height:40px"></div>'
            + frames(
                frame("<b>C4</b> · 1300 · nine items", dk(home(True, full(True)), {"Home": 5}, h=1180)),
                frame("<b>C5</b> · 1300 · after Clear all", dk(home(True, cleared(), lead=False), over=toast(TOAST, "Undo", bottom=24), h=1180),
                      "Same foot, same toast in the shipped centre slot, 24px off the floor."),
                gap=40))
    return doc("Clear all", body, 2900)


# ================================================================ 2 · when it shows, and the press's states
def board_states():
    two = box(day("Today") + rows(["ask2"]) + day("Earlier") + rows(["price"]) + foot(), 2)
    one = box(rows(["ask2"]) + foot(ca=False), 1)
    noarch = box(rows(["ask2", "match2", "price"]) + foot(archive=False), 3)
    busy = full(busy=True)
    fail = full()
    upcoming = box('<p class="dy" style="padding-bottom:6px">Upcoming drops</p>'
                   + w4.row(dict(I["set"], title="Lorwyn Eclipsed is out Friday", stamp="in 3 days", unseen=True), False, "new")
                   + '<p class="dy" style="border-top:1px solid var(--border)">Today</p>' + rows(["ask2", "match2"]) + foot(), 3)
    body = (board_head("Home · What’s new · clear all · its states · 390", "When Clear all shows, and what the press does",
                       "Clear all shows whenever the box holds <b>two or more</b> items, lead included. With one, that item’s ✕ already clears everything, "
                       "so a second control for the same press would be noise.")
            + frames(
                frame("<b>S1</b> · two items", ph(A.home(False, "", two), {"Home": 2}),
                      "No Show all: the foot is <i>Past announcements ›</i> and <b>Clear all</b>."),
                frame("<b>S2</b> · one item", ph(A.home(False, "", one), {"Home": 1}),
                      "One item: no Clear all. The foot is exactly as shipped."),
                frame("<b>S3</b> · announcements off", ph(A.home(False, "", noarch), {"Home": 3}),
                      "With the announcements switch off there is no archive entry, so the foot draws for <b>Clear all</b> alone, on the right where the foot’s presses sit."),
                frame("<b>S4</b> · with Upcoming drops", ph(A.home(False, "", upcoming), {"Home": 3}),
                      "Upcoming drops are items with a ✕ too, so Clear all takes them with the rest."),
                gap=36)
            + '<div style="height:40px"></div>'
            + frames(
                frame("<b>S5</b> · the write failed", ph(home(False, fail), {"Home": 5}, over=toast(FAIL)),
                      "Every item comes back where it was, the count and badge with them, and the shared toast says so, as a failed ✕ does. No Undo: nothing changed."),
                frame("<b>S6</b> · after Undo", ph(home(False, full()).replace('<span class="ca chg">', '<span class="ca chg ring">'), {"Home": 5}),
                      "Undo puts every item back unread as it was, and the count with it. Focus returns to <b>Clear all</b>."),
                col(note("Copy (DRAFT, /copy-review)",
                         "<b>Clear all</b> (the press; accessible name <i>Clear all of What’s new</i>)<br>"
                         "<b>Cleared {n} from What’s new.</b> with <b>Undo</b> (toast, role status)<br>"
                         "<b>We couldn’t clear those. Try again.</b> (toast, role alert, as the ✕’s)"),
                    note("For the build",
                         "One server action writes every dismissal in a single statement (the keys the ✕s would send, all of them, not only the five shown). "
                         "Undo needs its inverse: delete those reader’s own <code>feed_dismissals</code> rows. Both revalidate Home and /friends as the ✕ does. "
                         "Waiting on you on /friends is out of scope: it keeps its own ✕s."),
                    w=400),
                gap=36))
    return doc("Clear all states", body, 2140)


BOARDS = [("Main", board_main, "1 · Clear all"), ("States", board_states, "2 · Its states")]
