"""Item 6 (account 2, 2026-10-28): /friends on desktop in two columns. Drawn with the spare-requests kit over the
shipped page (friends-view.tsx: FriendsHead, WaitingOnYou, YourRequests, FriendsList, PodsPane, OpenLinks), with the
item-4 ✕ placement. Fixture: Hugh's capture of 2026-10-27 (Chris, Colin, Max, Peter; one pod)."""
import kit
import parts as P
import sr as S
import w4
from kit import doc, board_head, frame, frames, desk
from parts import img

kit.CSS += r"""
/* ---- shipped: one 720px column ---- */
.dk .fp.f6one{width:720px}
/* ---- redrawn: the head across, then two columns ---- */
.dk .fp.f6two{width:1160px;padding:36px 0 50px}
.f6cols{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:0 44px;align-items:start}
.f6cols>div{display:flex;flex-direction:column;min-width:0}
.f6pv{margin-top:8px;font:11px/1.6 'IBM Plex Mono';color:var(--fg-muted);max-width:460px}
.f6pv u{color:var(--fg-body)}
/* the pod card as shipped (pod-card.tsx): art seats with ✕, Add friends, share, Rule 0 check */
.f6pod{margin-top:12px;position:relative;overflow:hidden;border-radius:14px;border:1px solid var(--border-strong);background:var(--surface-rail);padding:16px 18px 14px;display:flex;flex-direction:column;gap:14px}
.f6pod .f6bl{position:absolute;inset:-40px;opacity:.22;filter:blur(36px) saturate(1.2);display:flex}
.f6pod .f6bl img{flex:1;object-fit:cover;min-width:0}
.f6pod>*:not(.f6bl){position:relative}
.f6pod .f6hd{display:flex;align-items:baseline;gap:8px}
.f6pod .f6hd b{font:600 15px 'IBM Plex Sans'}
.f6pod .f6hd small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.f6pod .f6hd i{margin-left:auto;font-style:normal;color:var(--fg-muted)}
.f6pod .f6st{display:grid;grid-template-columns:repeat(var(--n,5),116px);gap:12px 12px}
.f6pod .f6se{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--fg-body);position:relative}
.f6pod .f6se img{width:116px;height:82px;border-radius:9px;object-fit:cover;display:block;border:1px solid var(--border-strong)}
.f6pod .f6se.me img{border:2px solid var(--accent)}
.f6pod .f6se .f6x{position:absolute;right:5px;top:5px;width:26px;height:26px;border-radius:50%;background:rgba(20,17,14,.8);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--fg)}
.f6pod .f6ad{width:116px;height:82px;border-radius:9px;border:1px dashed var(--border-dashed);display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--fg-body)}
.f6pod .f6sh{font:13px 'IBM Plex Sans';letter-spacing:0;text-transform:none;display:flex;align-items:center;gap:10px;font-size:13px;color:var(--fg-body);min-height:32px}
.f6pod .f6r0{display:flex;align-items:center;gap:12px;border-radius:10px;border:1px solid var(--border);background:var(--surface-sunken);padding:10px 12px}
.f6pod .f6r0 .ic{width:32px;height:32px;border-radius:8px;background:color-mix(in oklab,var(--accent) 16%,transparent);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:14px}
.f6pod .f6r0 b{display:block;font:600 14px 'IBM Plex Sans'}
.f6pod .f6r0 small{font:10.5px 'IBM Plex Mono';color:var(--fg-muted)}
.f6pod .f6r0 .f6c{margin-left:auto;color:var(--fg-muted)}
.f6ql{margin-top:12px;font-size:13px;color:var(--fg-muted)}
"""

FRIENDS = [("Chris", "face-giada.jpg", "Giada, Font of Hope", "since Oct 16"), ("Colin", "face-sai.jpg", "Sai, Master Thopterist", "since Oct 17"),
           ("Max", "face-ghalta.jpg", "Ghalta, Primal Hunger", "since yesterday"), ("Peter", "face-captain-america.jpg", "Captain America", "since Oct 23")]
SEATS = [("You", "face-rootha.jpg", True), ("Chris", "face-giada.jpg", False), ("Colin", "face-sai.jpg", False),
         ("Max", "face-ghalta.jpg", False), ("Peter", "face-captain-america.jpg", False)]
PV = "Friends can see your decks and their lists, except drafts and decks you’re building. Change this in <u>Settings</u>."


def head():
    return (f'<div class="fhd"><div class="who" style="align-items:flex-start">{P.face("face-rootha.jpg", 64, 14)}<div><h1>Friends</h1>'
            f'<p class="nl">Friends see you as <b>Sam</b> · <u>Change</u></p><p class="f6pv">{PV}</p></div></div>'
            '<div class="ri"><span class="ba">Add a friend</span><span class="il">25 invites left</span></div></div>')


def waiting(mode="new"):
    return w4.waiting(True, mode)


def requests():
    return S.your_asks(True, ("asked", "yes")).replace("sec ya new", "sec ya").replace(w4.ACC_OLD, w4.ACC_NEW)


def friends():
    rows = "".join(f'<div class="frow">{P.face(fc, 36, 10)}<span class="nm"><b>{n}</b><span>{c}</span></span>'
                   f'<span class="sn">{s}</span><span class="ch">›</span><span class="dots">···</span></div>' for n, fc, c, s in FRIENDS)
    return f'<section class="sec"><div class="sech">Friends · 4</div>{rows}</section>'


def pods(cols=5):
    seats = "".join(f'<span class="f6se{" me" if me else ""}"><img src="{img(a)}" alt="">{"" if me else "<span class=f6x>✕</span>"}{n}</span>' for n, a, me in SEATS)
    return (f'<section class="sec"><div class="sech">Pods · 1<span class="r">New pod</span></div>'
            f'<div class="f6pod"><div class="f6bl"><img src="{img("art-ghalta.jpg")}" alt=""><img src="{img("art-heroes.jpg")}" alt=""></div>'
            f'<div class="f6hd"><b>The Bros</b><small>5 members · yours</small><i>···</i></div><div class="f6st" style="--n:{cols}">{seats}<span class="f6ad">+ Add friends</span></div>'
            '<div class="f6sh"><span class="box on"></span>Share my spares with this pod</div>'
            '<div class="f6r0"><span class="ic">◇</span><span><b>Rule 0 check</b><small>Seat tonight’s players, compare their decks</small></span><span class="f6c">›</span></div></div></section>')


def fold(top):
    return f'<div class="fold" style="top:{top}px"><span>first screen ends · 900px window</span></div>'


def shipped():
    body = f'<div class="fp f6one">{head()}{waiting("shipped")}{requests()}{friends()}{pods()}</div>'
    return w4.dk(body, "Friends", "shipped", over=fold(900))


def two(inbox=True):
    left = (waiting() + requests() if inbox else "") + friends()
    body = (f'<div class="fp f6two">{head()}<div class="f6cols"><div>{left}</div><div>{pods(3)}</div></div></div>')
    return w4.dk(body, "Friends", "new", over=fold(900) if inbox else "")


def board():
    body = (board_head("Item 6 · /friends on desktop", "Use the width: two columns from desktop",
                       "Your capture: a 720px column in a 1570px window, so Pods starts below the fold while two thirds of the screen is empty. "
                       "<b>Redrawn: the head runs across, then two columns.</b> Left, everything that is rows: Waiting on you, Your requests, then "
                       "Friends. Right, 420px: Pods, its card drawn three seats to a row as the phone already draws it. Nothing new is added and "
                       "nothing is hidden; the order a phone reads is unchanged. The ✕ is item 4’s.", tag="R1")
            + frames(frame("<b>As shipped</b> · 1300 · for reference", shipped(),
                           "One column. Pods (and the Rule 0 check) start under the fold."),
                     frame("<b>Redrawn</b> · 1300", two(),
                           "The inbox and Friends in the left column at the row width they were drawn for (#2284’s one-line right edge "
                           "still fits). Pods on the right, whole above the fold."))
            + frames(frame("<b>Redrawn</b> · 1300 · nothing waiting", two(False),
                           "The inbox sections stay absent when empty, as shipped, so Friends moves up and the columns still balance. "
                           "No empty left column, no layout jump between states."),
                     '<div style="display:flex;flex-direction:column;gap:14px;width:440px;flex:none">'
                     '<div class="note"><b>Why Friends goes left, not right</b><ul>'
                     '<li>The left column holds rows: the inbox and the friend list share the row width they were drawn for.</li>'
                     '<li>When the inbox is empty (the usual case), Friends fills the left column, so neither column is ever empty.</li>'
                     '<li>Pods is one card; at 420px it takes the phone’s three-to-a-row seats, already shipped.</li></ul></div>'
                     '<div class="note"><b>For engineering</b><ul>'
                     '<li>From <code>min-[1180px]</code> (Home’s two-column breakpoint), <code>friends-view.tsx</code>’s container goes from '
                     '<code>max-w-[720px]</code> to 1160px; <code>FriendsHead</code> spans; below it a grid <code>minmax(0,1fr) 420px</code>, gap 44.</li>'
                     '<li>Left: <code>waiting</code> (Waiting on you, Your requests), <code>FriendsList</code>. Right: <code>pods</code>, then <code>OpenLinks</code>.</li>'
                     '<li>Pod seats wrap at three in the right column (the phone’s rule). Under 1180 the page is the shipped single column.</li>'
                     '<li>DOM order stays phone order (head, inbox, friends, pods, links) so keyboard and screen-reader order are unchanged.</li></ul></div>'
                     '<div class="note"><b>Not now</b><ul><li>Tabs: revisit when someone has several pods or a dozen or more friends; then Friends | Pods '
                     'tabs under the inbox, never around it.</li><li>Phone: unchanged in this item.</li></ul></div></div>'))
    return doc("Friends desktop", body, 1300 + 44 + 1300 + 112)


BOARDS = [("Friends-Desktop", board, "Item 6 · /friends in two columns on desktop")]
