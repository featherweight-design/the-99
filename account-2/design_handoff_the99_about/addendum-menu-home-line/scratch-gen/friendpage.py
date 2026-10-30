"""Call 2 (menu and Home About addendum, account 2, 2026-10-22): what #2186 built undrawn on the friend's page and
/friends, drawn over the handoff's own Friends board pieces in Low Sun. Strings are main's (src/lib/copy/social.ts)."""
import os, sys, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit, parts as P
from kit import doc, board_head, frame, frames, phone, desk

kit.CSS += r"""
.ps.new,.blk.new,.ld.new,.sec.new{outline:0}
.call-o{outline:1.5px dashed rgba(207,135,69,.8);outline-offset:3px;border-radius:6px}
.fhd .pv{margin-top:4px;font:11px/1.5 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.emp{margin-top:16px;display:flex;flex-direction:column;gap:6px;border:1px dashed var(--border-dashed);border-radius:12px;padding:22px 20px}
.dk .emp{margin-top:18px;padding:30px 32px}
.emp b{font:700 18px 'Cinzel',serif;color:var(--fg)}
.dk .emp b{font-size:19px}
.emp p{font-size:14px;line-height:1.6;color:var(--fg-muted);max-width:600px}
.tap{position:absolute;width:30px;height:30px;border-radius:50%;background:rgba(240,230,210,.25);border:1.5px solid rgba(240,230,210,.75);z-index:5}
.tile{position:relative}
.ti.foc{outline:2px solid var(--accent);outline-offset:2px}
/* the shipped card details on a phone: the card over its dimmed page, the sheet under it */
.cdp{position:absolute;inset:0;z-index:40;display:flex;flex-direction:column;background:linear-gradient(#3a3631,#24211d 55%,#1b1814)}
.cdp .cd-top{display:flex;justify-content:space-between;align-items:center;padding:22px 18px 0}
.cdp .cd-cnt{font:13px 'IBM Plex Mono';color:var(--fg-body);background:rgba(20,17,14,.7);border-radius:12px;padding:8px 12px}
.cdp .cd-x{width:38px;height:38px;border-radius:50%;border:2px solid var(--accent);display:flex;align-items:center;justify-content:center;color:var(--fg);background:rgba(20,17,14,.7)}
.cdp .cd-stage{position:relative;height:420px;margin-top:16px}
.cdp .cd-stage img{position:absolute;top:0;height:420px;width:300px;border-radius:12px;box-shadow:0 14px 30px rgba(0,0,0,.55)}
.cdp .cd-stage .cd-c{left:45px}
.cdp .cd-stage .cd-l{left:-226px;opacity:.85;height:340px;width:243px;top:40px}
.cdp .cd-stage .cd-r{left:373px;opacity:.85;height:340px;width:243px;top:40px}
.cdp .cd-sh{margin-top:auto;background:var(--bg);border-radius:18px 18px 0 0;border-top:1px solid var(--border);padding:8px 20px 0;display:flex;flex-direction:column;gap:8px}
.cdp .cd-gr{width:36px;height:4px;border-radius:2px;background:var(--border-strong);align-self:center;margin-bottom:6px}
.cdp .cd-h{margin:0;font:700 25px 'Cinzel',serif;display:flex;justify-content:space-between;align-items:center}
.pipm{display:inline-flex;gap:4px}.pipm i{width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:600 11px 'IBM Plex Sans';font-style:normal;color:#14110E}
.cdp .cd-tl{font-size:13px;color:var(--fg-muted)}
.cdp .cd-mt{display:flex;align-items:center;gap:12px;font:12px 'IBM Plex Mono';color:var(--fg-muted);margin-top:4px}
.prc{border:1px solid var(--accent-shadow);border-radius:6px;padding:4px 8px;color:var(--accent)}
.cdp .cd-ot{font-size:14px;line-height:1.55;color:var(--fg-body);max-height:44px;overflow:hidden}
.cdp .cd-ad{margin:8px -20px 0;border-top:1px solid var(--border);height:52px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;color:var(--fg-body)}
.scrim2{position:absolute;inset:0;background:rgba(10,8,6,.62);z-index:30}
.cdm{position:absolute;z-index:40;left:50%;top:70px;transform:translateX(-50%);width:820px;height:600px;background:var(--surface);border:1px solid var(--border-strong);border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.65);display:flex;overflow:hidden}
.cdm .ac{width:330px;flex:none;border-right:1px solid var(--border);display:flex;flex-direction:column;align-items:center;gap:12px;padding:34px 0;background:var(--surface-sunken)}
.cdm .ac img{width:262px;height:366px;border-radius:12px;display:block;box-shadow:0 12px 28px rgba(0,0,0,.5)}
.cdm .ac small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.cdm .rc{flex:1;padding:30px 70px 30px 30px;display:flex;flex-direction:column;gap:8px;position:relative}
.cdm h3{margin:0;font:700 26px 'Cinzel',serif;display:flex;gap:14px;align-items:center}
.cdm .tl{font-size:13.5px;color:var(--fg-muted)}
.cdm .mt{display:flex;align-items:center;gap:12px;font:12px 'IBM Plex Mono';color:var(--fg-muted);margin-top:6px}
.cdm .sec2{margin-top:14px;padding-top:14px;border-top:1px solid var(--border);font-size:14px;line-height:1.6;color:var(--fg-body)}
.cdm .sec2 b{display:block;font:500 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);margin-bottom:6px}
.cdm .cx{position:absolute;top:22px;right:24px;width:34px;height:34px;border-radius:50%;background:var(--elevated);border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;color:var(--fg)}
"""

PRIV = '<p class="pv call-o">Friends see your deck names, commanders and statuses, never the lists.</p>'


def friends(desk_=False):
    h = P.friends_page(desk_, waiting=False)
    return h.replace("<u>Change</u></p>", "<u>Change</u></p>" + PRIV, 1)


def empty(title, body):
    return f'<div class="emp call-o"><b>{title}</b><p>{body}</p></div>'


EMPTY = {
    "none": ("Colin isn’t sharing spares with you", "Spares show here when Colin shares them with a pod you’re both in."),
    "spares": ("Colin has no spares to show", "When Colin has a copy no deck of theirs is asking for, it shows here."),
    "wish": ("Colin’s wishlist is empty", "When Colin adds a card, it shows here with how many they want until they have them."),
    "decks": ("Colin has no decks yet", "A deck Colin builds shows here, as a name, a commander and a status."),
}
LINE = {"spares": "Shared with Thursday pod. Cards on your wishlist first.", "wish": "", "decks": "View only. Colin’s committed decks and drafts, newest first."}


def friend_empty(kind, desk_=False):
    tab = {"none": "spares", "spares": "spares", "wish": "wish", "decks": "decks"}[kind]
    counts = {"none": {"wish": 12, "decks": 4}, "spares": {"spares": 0, "wish": 12, "decks": 4},
              "wish": {"spares": 6, "wish": 0, "decks": 4}, "decks": {"spares": 6, "wish": 12, "decks": 0}}[kind]
    head = (f'<div class="fpg"><span class="bk">‹ Friends</span><div class="who">{P.face("face-sai.jpg", 64 if desk_ else 56, 14 if desk_ else 13)}'
            '<div><h1>Colin</h1><p>Friend since Oct 2</p></div><span class="dots">···</span></div>'
            + P.place_strip(tab, [("spares", "Spares"), ("wish", "Wishlist"), ("decks", "Decks")], counts))
    line = f'<p class="gl">{LINE[tab]}</p>' if kind == "decks" else ""
    return head + line + empty(*EMPTY[kind]) + "</div>"


def spares_pressed(desk_=False):
    h = P.friend_page("spares", desk_)
    # the press: Ghalta, the first tile (on your wishlist)
    h = h.replace('<span class="ti"><img src="' + P.img("ghalta.jpg"), '<span class="ti foc"><img src="' + P.img("ghalta.jpg"), 1)
    return h.replace('<div class="tile"><span class="ti foc">', '<div class="tile"><span class="tap" style="left:40%;top:38%"></span><span class="ti foc">', 1)


PIPS = '<span class="pipm"><i style="background:#cfc7b4">10</i><i style="background:var(--g)">G</i><i style="background:var(--g)">G</i></span>'


def detail_phone():
    return ('<div class="cdp"><div class="cd-top"><span class="cd-cnt">1 of 6</span><span class="cd-x">✕</span></div>'
            f'<div class="cd-stage"><img class="cd-l" src="{P.img("jace.jpg")}" alt=""><img class="cd-c" src="{P.img("ghalta.jpg")}" alt="Ghalta, Primal Hunger">'
            f'<img class="cd-r" src="{P.img("jace.jpg")}" alt=""></div>'
            f'<div class="cd-sh"><span class="cd-gr"></span><h3 class="cd-h">Ghalta, Primal Hunger{PIPS}</h3><span class="cd-tl">Legendary Creature — Elder Dinosaur</span>'
            '<span class="cd-mt"><span class="prc">$3.80</span>FDC</span>'
            '<p class="cd-ot"><b>Trample</b><br>This spell costs {X} less to cast, where X is the total power of creatures you control.</p>'
            '<span class="cd-ad">All details <small>▴</small></span></div></div>')


def detail_desk():
    return ('<div class="scrim2"></div><div class="cdm">'
            f'<div class="ac"><img src="{P.img("ghalta.jpg")}" alt="Ghalta, Primal Hunger"><small>1 of 6 · ‹ ›</small></div>'
            f'<div class="rc"><span class="cx">✕</span><h3>Ghalta, Primal Hunger {PIPS}</h3><span class="tl">Legendary Creature — Elder Dinosaur · 12/12</span>'
            '<span class="mt"><span class="prc">$3.80</span>FDC</span>'
            '<div class="sec2"><b>Rules text</b>This spell costs {X} less to cast, where X is the total power of creatures you control.<br>Trample</div>'
            '</div></div>')


def board():
    B = {"Home": 3}
    fp = phone(friends(), "Friends", badges=B)
    fd = desk(friends(True), "Friends", badges=B, h=560)
    e = {k: phone(friend_empty(k), "Friends", badges=B) for k in EMPTY}
    ed = desk(friend_empty("decks", True), "Friends", badges=B, h=430)
    sp = phone(spares_pressed(), "Friends", badges=B)
    dp = phone(spares_pressed() + "", "Friends", badges=B, over=detail_phone())
    dd = desk(spares_pressed(True), "Friends", badges=B, h=760, over=detail_desk())
    body = (board_head("Call 2 · ratified as built in #2186 and #2193", "A friend’s page: the privacy line, the empty states, a spare’s press",
                       "Three things engineering built that the Friends board did not draw. <b>All three are ratified as built</b> and drawn here so the handoff has them; dashed outlines mark them. "
                       "Every word is main’s (<code>social.ts</code>). Fixtures: Colin, sharing with Thursday pod.", tag="Addendum")
            + '<h3 style="margin:0;font:700 20px Cinzel,serif">1 · The privacy line on /friends</h3>'
            + frames(frame("<b>/friends</b> · 390", fp, "Under the name line, in the head’s own mono 11px <code>--fg-faint</code>: it says what the name line’s friends see of your decks. It leaves while the name is being edited, as the name line does."),
                     frame("<b>/friends</b> · 1300", fd, "Same place at 1300: the title column under the name line, Add a friend on the right unchanged."))
            + '<h3 style="margin:0;font:700 20px Cinzel,serif">2 · The empty states</h3>'
            + frames(frame("<b>Spares</b> · not shared with you", e["none"], "Colin shares spares with no pod you’re in."),
                     frame("<b>Spares</b> · none to show", e["spares"], "Shared with you, but nothing spare right now."),
                     frame("<b>Wishlist</b> · empty", e["wish"], "The shipped wishlist’s empty box, under the strip."),
                     frame("<b>Decks</b> · none yet", e["decks"], "The tab’s line stays; the box follows it."), gap=30)
            + frames(frame("<b>Decks</b> · none yet · 1300", ed, "The app’s dashed box: Cinzel 19 title, 14px muted body, 600 wide. One box per tab, never a picture."))
            + '<h3 style="margin:0;font:700 20px Cinzel,serif">3 · A spare opens its card</h3>'
            + frames(frame("<b>Press</b> · 390", sp, "The whole tile is the press, with the shipped focus ring; no hover treatment. Nothing asks for the card here (the request is G5)."),
                     frame("<b>Card details</b> · 390", dp, "The shipped card details, unchanged: the friend’s spares are its siblings (1 of 6, swipe for the next), ✕ goes back to Colin’s page."),
                     gap=44)
            + frames(frame("<b>Card details</b> · 1300", dd, "The shipped card modal over the page. A wishlist write from it refreshes the page, so the mark and the order move (as #2186 builds it).")))
    return doc("Friend page · call 2", body, 1960)


if __name__ == "__main__":
    out = sys.argv[1]
    open(f"{out}/Friend-Page.dc.html", "w").write(board()); print("ok")
