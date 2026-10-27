"""An answered spare request, opened over Home (account 2, 2026-10-27). Drawn with the spare-requests kit (Home from
the menu-home kit; the row is your-requests.tsx; the sheet is ModalChrome at 560, `fit` on the phone)."""
import kit
import parts as P
import sr as S
from kit import doc, board_head, frame, frames, phone, desk
from parts import img

kit.CSS += r"""
/* ModalChrome, fit (phone: hugs its rows, 18px top radius) and width 560 (desktop) */
.yr-s{position:absolute;z-index:31;left:0;right:0;bottom:0;background:var(--surface-raised);border-top:1px solid var(--border-strong);border-radius:18px 18px 0 0;box-shadow:0 -14px 40px rgba(0,0,0,.6);display:flex;flex-direction:column;overflow:hidden}
.yr-m{position:absolute;z-index:31;left:50%;transform:translateX(-50%);width:560px;background:var(--surface-raised);border:1px solid var(--border-strong);border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.6);display:flex;flex-direction:column;overflow:hidden}
.yr-h{display:flex;align-items:center;gap:10px;min-height:43px;padding:0 4px 0 16px;border-bottom:1px solid var(--border)}
.yr-h b{flex:1;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.yr-m .yr-h b{font-size:16px}
.yr-h .x{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:15px}
.yr-b{padding:14px 16px 16px}
.yr-m .yr-b{padding:16px 18px 18px}
.yr-row{display:grid;grid-template-columns:46px minmax(0,1fr);gap:0 12px;border-radius:14px;background:var(--surface-inset);border:1px solid var(--border);padding:12px 14px 6px}
.yr-m .yr-row{gap:0 14px;padding:12px 16px 6px}
.yr-row .vis{position:relative;width:46px;height:64px;grid-row:1/3}
.yr-row .vis .cardimg{width:46px;height:64px}
.yr-row .vis .fa{position:absolute;right:-6px;bottom:-5px;width:24px;height:24px;border-radius:7px;overflow:hidden;border:1.5px solid var(--surface-inset)}
.yr-row .vis .fa img{width:100%;height:100%;object-fit:cover;display:block}
.yr-row .bd{min-width:0;display:flex;flex-direction:column;gap:3px}
.yr-row .kr{display:flex;align-items:center;gap:7px}
.yr-row .kd{font:500 9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.yr-row .kd.ok{color:var(--success)}
.yr-row .kr small{margin-left:auto;font:10.5px 'IBM Plex Mono';color:var(--fg-locked)}
.yr-row .tt{font:600 14px/1.35 'IBM Plex Sans';color:var(--fg)}
.yr-row .dt{font-size:12.5px;line-height:1.5;color:var(--fg-body)}
.yr-row .clr{grid-column:2;justify-self:start;display:flex;align-items:center;min-height:44px;margin-left:-2px;padding:0 2px;font:500 13px 'IBM Plex Sans';color:var(--fg-muted)}
.yr-m .yr-row .clr{min-height:32px;margin-top:4px}
.yr-f{border-top:1px solid var(--border);display:flex;align-items:center;min-height:52px;padding:0 16px 8px}
.yr-m .yr-f{min-height:46px;padding:0 18px;justify-content:flex-end}
.yr-f span{display:flex;align-items:center;min-height:44px;font:500 13.5px 'IBM Plex Sans';color:var(--accent-text)}
.pinb{position:absolute;z-index:40;display:flex;align-items:center;gap:6px;font:600 10px 'IBM Plex Mono';letter-spacing:.04em;color:#0D0B09;background:#8FA6BE;border-radius:4px;padding:3px 7px;white-space:nowrap}
.bad{position:relative}
.bad:after{content:'';position:absolute;inset:-5px;border:1.5px dashed var(--danger);border-radius:10px}
.cmp{width:390px;border:1px solid var(--border-strong);border-radius:16px;overflow:hidden;background:var(--bg);position:relative}
.cmp .yr-s{position:relative;border-radius:18px 18px 0 0}
.ph .fi .bd{padding-right:30px}
.dk .fi .kr small{display:none}
.dk .fi .ac{gap:12px;padding-right:34px;align-items:baseline}
.dk .fi .ac small{font:10.5px 'IBM Plex Mono';color:var(--fg-locked)}
.fi.hl{background:color-mix(in oklab,var(--accent) 7%,transparent);box-shadow:inset 3px 0 0 var(--accent)}
"""

FACE = {"Colin": "face-sai.jpg", "Chris": "face-giada.jpg", "Max": "face-ghalta.jpg", "Peter": "face-captain-america.jpg"}
ANS = {
    "yes": dict(card="jace.jpg", who="Colin", kind="Accepted", kc="ok", title="Colin can spare Jace, Multiverse Architect",
                detail="The handover is between you. Once it’s yours, press buy on it in Shopping or add it to your collection.", when="1h ago"),
    "no": dict(card="dina.jpg", who="Chris", kind="Declined", kc="", title="Chris is keeping Dina, Essence Brewer",
               detail="Max has a spare too.", when="yesterday"),
}


def gitem(vis, kick, when, title, detail, press, desk_=False, un=False, hl=False, kc=""):
    """The shipped FeedItemRow: ✕ at the row's top right; from desktop the time moves to the press's column."""
    u = '<span class="un"></span>' if un else ""
    kr = f'<div class="kr">{u}<span class="kd{kc}">{kick}</span><small>{when}</small></div>'
    act = f'<div class="ac">{f"<small>{when}</small>" if desk_ else ""}<span class="lnk">{press}</span></div>'
    body = f'<div class="bd">{kr}<div class="tt">{title}</div><div class="dt">{detail}</div>{"" if desk_ else act}</div>'
    return f'<div class="fi{" hl" if hl else ""}{"" if un else " seen"}">{vis}{body}{act if desk_ else ""}<span class="xx">✕</span></div>'


def feed(keys, desk_=False, hl=None, n=1):
    I = P.ITEMS()
    rows = []
    for k in keys:
        if k in ANS:
            a = ANS[k]
            rows.append(gitem(P.vis(("card", a["card"], FACE[a["who"]])), "Your request", a["when"], a["title"], a["detail"],
                              "Your request ›", desk_, un=(k == "yes"), hl=(hl == k)))
        else:
            it = I[k]
            press = it["act"].split('>', 1)[1].rsplit('<', 1)[0]
            rows.append(gitem(P.vis(it["vis"]), it["kick"], it["stamp"], it["title"], it["detail"], press, desk_))
    head = f'<h2 class="sh">What’s new{f" <em>· {n} new</em>" if n else ""}<span class="r">Choose what shows <i>›</i></span></h2>'
    return f'<section class="blk">{head}<div class="fd">{"".join(rows)}</div></section>'


def home(keys, desk_=False, hl=None, n=1):
    head = P.home_head(desk_)
    fd = feed(keys, desk_, hl, n)
    if desk_:
        return head + f'<div class="hb"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:11px">{fd}{P.resume(2)}</div><div class="cr">{P.commitments()}{P.friends_home()}</div></div>'
    return head + '<div class="hb">' + fd + P.resume(2) + P.friends_home() + "</div>"


def row(k, desk_=False):
    a = ANS[k]
    vis = P.vis(("card", a["card"], FACE[a["who"]]))
    return (f'<div class="yr-row">{vis}<div class="bd"><div class="kr"><span class="kd {a["kc"]}">{a["kind"]}</span><small>{a["when"]}</small></div>'
            f'<div class="tt">{a["title"]}</div><div class="dt">{a["detail"]}</div></div><span class="clr">Clear</span></div>')


def sheet(k, desk_=False, top=150):
    inner = (f'<div class="yr-h"><b>Your request</b><span class="x">✕</span></div><div class="yr-b">{row(k, desk_)}</div>'
             '<div class="yr-f"><span>All your requests ›</span></div>')
    if desk_:
        return f'<div class="scrim"></div><div class="yr-m new" style="top:{top}px">{inner}</div>'
    return f'<div class="scrim"></div><div class="yr-s new">{inner}</div>'


BADGE = {"Friends": 1}


def ph(inner, over="", h=844):
    return phone(inner, "Home", h=h, badges=BADGE, over=over)


def dk(inner, over="", h=620):
    return desk(inner, "Home", badges=BADGE, over=over, h=h)


def risk():
    """Eng's worry, drawn: the shipped row dropped into a sheet as is."""
    a = ANS["yes"]
    vis = P.vis(("card", a["card"], FACE[a["who"]]))
    rw = (f'<div class="fi" style="border-radius:14px;background:var(--surface-inset);border:1px solid var(--border)">{vis}<div class="bd"><div class="kr">'
          f'<span class="kd" style="color:var(--success)">Accepted</span><small style="margin-right:30px">{a["when"]}</small></div>'
          f'<div class="tt">{a["title"]}</div><div class="dt">{a["detail"]}</div></div><span class="xx bad">✕</span></div>')
    return ('<div class="cmp"><div class="yr-s"><div class="yr-h"><b>Your request</b><span class="x bad">✕</span></div>'
            f'<div class="yr-b" style="padding-top:8px">{rw}</div></div></div>')


def board():
    p_home = ph(home(["yes", "price", "combo"], hl="yes"))
    p_yes = ph(home(["yes", "price", "combo"]), sheet("yes"))
    p_no = ph(home(["no", "price", "combo"], n=0), sheet("no"))
    p_after = ph(home(["price", "combo"], n=0))
    d_yes = dk(home(["yes", "price", "combo"], True), sheet("yes", True, 210))
    body = (board_head("Spare requests · the answer, opened over Home · addendum", "Your request, in a sheet over Home",
                       "Home’s <b>Your request</b> item now opens a sheet over Home instead of going to /friends. "
                       "<b>Engineering’s proposal is ratified, with the details drawn:</b> ModalChrome at <b>560</b> (the phone sheet hugs its row, "
                       "<code>fit</code>), titled <b>Your request</b>; the body is the shipped Your requests row for this one request; the row’s ✕ "
                       "becomes a <b>Clear</b> text button at the row’s foot, under the text; the foot holds <b>All your requests ›</b>. "
                       "The sheet’s ✕ is then the only ✕ on screen, and Clear sits far from it, in words. Answered rows have no Ask instead. "
                       "Sam’s fixture from the spare requests round; copy is shipped except the press label and the accepted line’s new ending.", tag="R1b")
            + frames(frame("<b>Home · 390</b> · the item", p_home,
                           "The shipped item with its ✕ (hides the item from Home). Its press now reads <b>Your request ›</b> and opens the sheet."),
                     frame("<b>390</b> · Accepted, sheet open", p_yes,
                           "Sized to the row, from the bottom. Opening it marks the answer seen (the diamond goes). Clear removes the request for good, "
                           "closes the sheet and takes the Home item with it."),
                     frame("<b>390</b> · Declined", p_no,
                           "The same sheet. The line names who else has a spare; asking them happens in Shopping, where the request was made."),
                     frame("<b>390</b> · after Clear", p_after,
                           "The sheet closes and the item has left What’s new. Focus goes to the next item’s ✕, as the shipped dismiss does. "
                           "A failed Clear keeps the sheet open and shows the shared toast."))
            + frames(frame("<b>1300</b> · Accepted, the 560 modal", d_yes,
                           "Centred over Home at 560. The foot link sits right, where ModalChrome’s foot puts its press on desktop."),
                     '<div style="display:flex;flex-direction:column;gap:16px;width:420px;flex:none">'
                     + frame("<b>The risk, as engineering saw it</b>", risk(),
                             "The shipped row as is: its ✕ (clear for good) sits 30px under the sheet’s ✕ (close). Not drawn this way.")
                     + '<div class="note"><b>Ratified, with four details</b><ul>'
                       '<li><b>Clear</b> is plain text in --fg-muted, no border, at the start of the row’s text column: 44px tall on a phone, 32 on desktop. '
                       'Named “Clear your request to Colin for Jace, Multiverse Architect” (the shipped clearAria).</li>'
                       '<li><b>All your requests ›</b> goes to /friends at Your requests. Phone: left in a pinned foot; desktop: right.</li>'
                       '<li><b>Accepted line</b>: <i>…press buy on it in Shopping or add it to your collection.</i> Buying isn’t the only way a received card comes in (your feedback, R1b). Shared with /friends’ Your requests (<code>acceptedDetail</code>). For /copy-review.</li>'
                       '<li><b>Press label</b> on the Home item: <i>Your request ›</i> (was <i>Your requests ›</i>), since it now opens one request. For /copy-review.</li></ul></div>'
                     '<div class="note"><b>Unchanged</b><ul><li>The Home item’s own ✕ still hides the item and leaves the request alone.</li>'
                     '<li>/friends’ Your requests keeps its ✕ rows.</li><li>No Ask instead on an answered row.</li></ul></div></div>'))
    return doc("Spare requests · the answer over Home", body, 1300 + 44 + 420 + 112)


BOARDS = [("Spare-Answer-Sheet", board, "An answered spare request, opened over Home")]
