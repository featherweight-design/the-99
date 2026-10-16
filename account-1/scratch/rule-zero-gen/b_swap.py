"""R1 - Swap-Phone / Swap-Desktop: the suggestion, the swap, changing your own deck, and another seat's view."""
from comps import *

PH, DH = {}, {}

def sug_colin():
    return sugbox(["sai", "jace"])

def own_sheet(desk=False):
    rows = [("sai", "Upgraded · 1 from the table’s middle… 0", True), ("jace", "", False), ("zimone", "", False)]
    def opt(k, cls="", extra=""):
        d = DECKS[k]
        return (f'<button class="dopt {cls}" type="button" role="option"><span class="a"><img src="art/{d["art"]}.jpg" alt=""></span>'
                f'<span class="t"><b>{d["deck"]}</b><span>{d["cmd"]}</span></span>{chip(d["permits"])}{extra}</button>')
    lst = (opt("zimone", "on", '<span class="mono" style="font-size:10px;color:var(--fg-faint);margin-left:6px">seated</span>')
           + opt("sai") + opt("jace")
           + '<button class="dopt off" type="button" role="option" aria-disabled="false"><span class="a ini" style="display:flex;align-items:center;justify-content:center;background:var(--elevated);font:600 12px IBM Plex Mono,monospace;color:var(--fg-muted)">TP</span>'
             '<span class="t"><b>Temur Pile</b><span>94 of 100 · not read yet</span></span></button>')
    hd = ('<div class="shh"><h3>Your deck tonight</h3><button class="x" type="button" aria-label="Close">✕</button></div>'
          '<p class="shs">Nearest the table first. Everyone sees the change on their next look.</p>')
    body = f'<div class="shb" role="listbox" aria-label="Your decks" style="gap:2px">{lst}</div>'
    if desk:
        return (f'<div class="anch" style="left:140px;top:470px"><div class="hd"><span>Your deck tonight</span><span>nearest first</span></div>'
                f'<div role="listbox" aria-label="Your decks">{lst}</div></div>')
    return f'<div class="scrim" style="z-index:8"></div><div class="sh"><span class="grip"></span>{hd}{body}</div>'

def toast(text, bottom=90):
    return (f'<div class="toast" role="status" style="bottom:{bottom}px"><span>{text}</span>'
            f'<button class="lnk" type="button">Undo</button></div>')

def frames():
    F = []
    # S1 Colin's phone: his seat flagged, the suggestion under it
    s = [S("You", "zimone", own=True, flag="hi", why=ZIMONE_WHY, drivers=("twoCardCombos", "tutors"), sug=sug_colin()),
         S("Peter", "ashling"), S("Max", "gisa")]
    F.append(dict(lab="S1 · Colin’s phone · his deck stands out · the suggestion", seats=s, meta="c3you", av="CO",
                  rd=read('Your Zimone Combo reads <span class="hiw">above the table</span>.',
                          "The table sits at <b>Upgraded</b>; Zimone Combo reads <b>Optimized</b>. You have decks that sit closer.", s, (3, 3)),
                  cap="Only the flagged player sees this, on their own seat, under its reason: their own decks that read nearer the table’s middle, nearest first, at most three, read decks only. Each is art, name and chip with one Swap in. Nobody else is offered anything and no one can swap someone else’s deck."))
    # S2 Colin's phone after the tap
    s = [S("You", "sai", own=True, changed="changed just now"), S("Peter", "ashling"), S("Max", "gisa")]
    F.append(dict(lab="S2 · Colin’s phone · one tap later", seats=s, meta="c3you", av="CO",
                  rd=read("Balanced: every deck reads Upgraded.",
                          "You swapped to <b>Sai Thopters</b>. The others see it on their next look.", s, (3, 3)),
                  overlay=toast("Swapped to Sai Thopters."), toast=True,
                  cap="Swap in seats the deck at once; no confirm, because Undo in the shared toast puts Zimone Combo back. The read redraws on this phone first; the seat keeps a changed mark until the others have looked."))
    # S3 change own deck any time
    s = [S("You", "zimone", own=True, flag="hi", why=ZIMONE_WHY, drivers=("twoCardCombos", "tutors"), sug=sug_colin()),
         S("Peter", "ashling"), S("Max", "gisa")]
    F.append(dict(lab="S3 · Change deck · any seat, its own decks", seats=s, meta="c3you", av="CO", fixed=True, h=844,
                  rd=read('Your Zimone Combo reads <span class="hiw">above the table</span>.', "The table sits at <b>Upgraded</b>.", s, (3, 3)),
                  overlay=own_sheet(),
                  cap="Change deck on your own seat opens your decks in the shipped sheet, nearest the table first, each with its chip. A deck short of 100 can still be seated and reads as not ready. This is every seat’s one control, flagged or not."))
    # S4 Peter's phone before the change lands
    s = [S("Colin", "zimone", tag="owner", flag="hi", why=ZIMONE_WHY, drivers=("twoCardCombos", "tutors")),
         S("You", "ashling", own=True), S("Max", "gisa", tag="not a friend")]
    F.append(dict(lab="S4 · Peter’s phone · another seat’s view", seats=s, meta="c3", av="PE",
                  rd=read('Colin’s Zimone Combo reads <span class="hiw">above the table</span>.',
                          "The table sits at <b>Upgraded</b>; Zimone Combo reads <b>Optimized</b>. Worth a word before you shuffle.", s, (3, 3), upd="updated 9:41 pm"),
                  cap="The same table on a seat that didn’t set it: the same read and the same flag, no suggestion (that is Colin’s), and one control, Change deck on Peter’s own seat. Max is Colin’s friend, not Peter’s: Peter sees his chosen deck and nothing else, and his name opens nothing."))
    # S5 Peter's phone after the poll
    s = [S("Colin", "sai", tag="owner", changed="changed 1 min ago"), S("You", "ashling", own=True), S("Max", "gisa", tag="not a friend")]
    F.append(dict(lab="S5 · Peter’s phone · after the swap reaches it", seats=s, meta="c3", av="PE",
                  rd=read("Balanced: every deck reads Upgraded.",
                          '<span class="chg" style="font-size:12px"><i></i>Since you looked</span> Colin swapped to <b>Sai Thopters</b>.', s, (3, 3), upd="updated 9:42 pm"),
                  cap="Not live: the page checks every 20 seconds while it’s open and on refresh, and the read redraws when something changed. The changed seat and the read’s first line carry the accent dot until Peter has seen them; nothing animates or pushes."))
    # S6 low: Peter's own phone, his deck below the table
    s = [S("Colin", "sai", tag="owner"), S("You", "giada", own=True, flag="lo", why=GIADA_WHY, sug=sugbox(["ashling"], sub="Your decks that read nearer Upgraded. One tap swaps it in for everyone.")),
         S("Max", "gisa", tag="not a friend")]
    F.append(dict(lab="S6 · Peter’s phone · a low deck gets the same offer", seats=s, meta="c3", av="PE",
                  rd=read('Your Giada Angels reads <span class="low">below the table</span>.',
                          "The table sits at <b>Upgraded</b>; Giada Angels reads <b>Core</b>. You have a deck that sits closer.", s, (3, 3)),
                  cap="Low reads the same way the other way: one deck of Peter’s reads nearer, so the offer is one row. Miku Tokens (Exhibition or Core) is further away, so it isn’t offered. With no closer deck the block is absent; the flag stays."))
    return F

def board_phone():
    out = []
    for f in frames():
        ph = table_phone(f["seats"], f["rd"], meta=f["meta"], h=f.get("h") or PH.get(f["lab"], 1800),
                         setter=f["meta"].endswith("you"), overlay=f.get("overlay", ""), av=f["av"], fixed=f.get("fixed", False))
        out.append(frame(f["lab"], ph, f["cap"]))
    body = ('<div class="bh"><span class="k">R1 · Rule 0 check · the suggestion and the swap · phone 390 · full page</span>'
            '<h2>The offer sits on the flagged seat, for its own player only; one tap swaps it for everyone</h2>'
            '<p class="cap" style="max-width:2100px">A three-seat table Colin set: Colin, Peter, Max. S1 to S3 are Colin’s phone, S4 to S6 Peter’s. A swap reaches the other phones on their next check (every 20 seconds while the page is open, and on refresh), never live.</p></div>'
            f'<div class="frames">{"".join(out)}</div>')
    return doc("Rule 0 check, swap, phone", body, 2700, 2400)

def board_desk():
    out = []
    for f in frames():
        if f["lab"].startswith("S6"):
            continue
        ov = f.get("overlay", "")
        if f.get("toast"):
            ov = ('<div class="toast" role="status" style="left:auto;right:24px;bottom:24px;width:420px"><span>Swapped to Sai Thopters.</span>'
                  '<button class="lnk" type="button">Undo</button></div>')
        if f["lab"].startswith("S3"):
            ov = own_sheet(desk=True)
        lab = f["lab"].replace("S", "W", 1).replace("phone", "screen")
        d = table_desk(f["seats"], f["rd"], meta=f["meta"], h=DH.get(lab, 1000), setter=f["meta"].endswith("you"),
                       overlay=ov, av=f["av"])
        out.append(frame(lab, d, f["cap"], width=1300))
    body = ('<div class="bh"><span class="k">R1 · Rule 0 check · the suggestion and the swap · desktop 1300</span>'
            '<h2>The same offer on the seat; Change deck opens an anchored panel</h2>'
            '<p class="cap" style="max-width:2700px">Desktop draws the same seat card, so the offer and its Swap in sit exactly where they do on the phone. Change deck opens the app’s anchored panel under the seat instead of a sheet; the toast sits bottom right.</p></div>'
            f'<div class="frames">{"".join(out)}</div>')
    return doc("Rule 0 check, swap, desktop", body, 2780, 3000)
