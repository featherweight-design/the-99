"""R1 - Read-Phone / Read-Desktop: the table's read in every shape the brief lists."""
from comps import *
import sys

def frames():
    F = []
    # 1 balanced
    s = [S("You", "ghalta", own=True), S("Colin", "sai"), S("Peter", "ashling"), S("Max", "gisa", tag="not a friend")]
    F.append(("T1 · balanced", s, read("Balanced: every deck reads Upgraded.",
              "No deck sits a bracket or more from the rest. It’s a read of each list, so still say what you brought.", s, (3, 3)),
              "Every seat within the rule. The rail puts each face over its bracket, the dashed band is the table’s middle. Your seat carries the accent and the only control, Change deck."))
    # 2 one high
    s = [S("You", "ghalta", own=True), S("Colin", "zimone", flag="hi", why=ZIMONE_WHY, drivers=("twoCardCombos", "tutors")),
         S("Peter", "ashling"), S("Max", "gisa", tag="not a friend")]
    F.append(("T2 · one outlier, high", s, read('Colin’s Zimone Combo reads <span class="hiw">above the table</span>.',
              "The table sits at <b>Upgraded</b>; Zimone Combo reads <b>Optimized</b>. Worth a word before you shuffle.", s, (3, 3)),
              "High reads in amber with an up arrow and the words Above the table, never color alone. The seat names what puts it there in a sentence, and the counts that drive it are lifted in the strip. Only Colin sees his closer decks (S1)."))
    # 3 one low
    s = [S("You", "ghalta", own=True), S("Colin", "sai"), S("Peter", "giada", flag="lo", why=GIADA_WHY),
         S("Max", "gisa", tag="not a friend")]
    F.append(("T3 · one outlier, low", s, read('Peter’s Giada Angels reads <span class="low">below the table</span>.',
              "The table sits at <b>Upgraded</b>; Giada Angels reads <b>Core</b>. Low is worth the same word as high.", s, (3, 3)),
              "Low reads in steel blue with a down arrow. A low deck is low because nothing counted passes Core, so the sentence says that plainly and says counts can miss cards: an absent fact is not a clean deck."))
    # 4 two outliers
    s = [S("You", "ghalta", own=True), S("Colin", "zimone", flag="hi", why=ZIMONE_WHY, drivers=("twoCardCombos", "tutors")),
         S("Peter", "giada", flag="lo", why=GIADA_WHY), S("Max", "gisa", tag="not a friend")]
    F.append(("T4 · two outliers · 2, 3, 3, 4", s, read("Two decks sit off the table, one each way.",
              "The middle is <b>Upgraded</b>. Colin’s Zimone Combo reads <b>Optimized</b>, Peter’s Giada Angels reads <b>Core</b>.", s, (3, 3)),
              "Both ends flagged, each in its own ink and word. The headline counts them; each seat says its own reason."))
    # 5 split
    s = [S("You", "ghalta", own=True, flag="sp"), S("Colin", "zimone", flag="sp", drivers=("twoCardCombos", "tutors"),
         why='<b>What puts it here:</b> it can find a two-card combo with 5 tutors to reach it.')]
    F.append(("T5 · a two-seat split", s, read('A <span class="spw">split</span>: these two decks are a bracket apart.',
              "With two seats there’s no rest of the table, so both are marked. Your Ghalta Stompy reads <b>Upgraded</b>, Colin’s Zimone Combo reads <b>Optimized</b>.", s, None),
              "No band: two seats have no middle. Both seats carry Split in violet; neither is called the problem. The suggestion shows on both phones, each offering its own decks (S3).", "you2"))
    # 6 ranges
    s = [S("You", "ghalta", own=True), S("Colin", "zimone", permits=[4, 5], ans=4, flag="hi", why=ZIMONE_WHY, drivers=("twoCardCombos", "tutors")),
         S("Peter", "miku", flag="lo", near="high", why='<b>What puts it here:</b> the rules leave Exhibition against Core to the player, and Peter hasn’t said. Even at Core it sits below the table.'),
         S("Max", "gisa", tag="not a friend")]
    F.append(("T6 · range seats · declared and not", s, read("Two decks sit off the table, one each way.",
              "The middle is <b>Upgraded</b>. Colin declared <b>Optimized</b>; Peter’s Miku Tokens reads <b>Exhibition or Core</b>, measured from Core.", s, (3, 3)),
              "Colin’s range is answered by his declaration, so his chip is Optimized alone and the line under it keeps the range. Peter’s is undeclared: both marks, the upper dimmed, and the line says which end the table measured from. On the rail a range is a dashed span with the face at that end."))
    # 7 drifted
    s = [S("You", "ghalta", own=True), S("Colin", "zimone", permits=[4, 5], drift=1, flag="hi", why=ZIMONE_WHY, drivers=("twoCardCombos", "tutors")),
         S("Peter", "ashling"), S("Max", "gisa", tag="not a friend")]
    F.append(("T7 · a drifted declaration", s, read('Colin’s Zimone Combo reads <span class="hiw">above the table</span>.',
              "The table sits at <b>Upgraded</b>; Zimone Combo reads <b>Optimized or cEDH</b>. Colin’s declared Exhibition is from before its last reading, so it settles nothing.", s, (3, 3)),
              "The declaration sits outside the analyzed range: the chip stays a range, the line says so, and the table measures from its nearer end, Optimized. It is never compared as a 1."))
    # 8 not ready
    s = [S("You", "ghalta", own=True), S("Colin", "sai", state="stale"), S("Peter", "giada", state="short", cards=87),
         S("Max", "gisa", tag="not a friend", state="over", cards=101)]
    F.append(("T8 · seats not ready · short, over 100, stale", s, read("Two seats aren’t in the read yet.",
              "Comparing your seat and Colin’s: both read <b>Upgraded</b>. Peter’s deck has 87 of 100 cards; Max’s has 101.", s, (3, 3)),
              "A deck is read only at 100. Peter’s seat shows how far along it is; Max’s says its card count and that its old reading isn’t used. Colin’s deck changed since its reading: the chip stays, marked as from before its last change, as the deck page marks a stale reading."))
    # 9 reading on the spot
    s = [S("You", "ghalta", own=True), S("Colin", "sai"), S("Peter", "ashling", state="reading"), S("Max", "gisa", tag="not a friend")]
    F.append(("T9 · a legal deck read on the spot", s, read("Reading Peter’s deck…",
              "Your seat, Colin’s and Max’s all read <b>Upgraded</b>. Peter’s joins in a second.", s, (3, 3)),
              "A deck at 100 that has never been read is read when the table opens (about a second). Its seat says so; nothing is guessed meanwhile."))
    # 10 not enough
    s = [S("You", "ghalta", own=True), S("Peter", "giada", state="short", cards=87), S("Max", "gisa", tag="not a friend", state="pick")]
    F.append(("T10 · not enough decks to compare", s, read("Nothing to compare yet.",
              "A read needs two seats with read decks. Yours is ready; Peter’s is short of 100 and Max hasn’t picked.", s, None, rail=False),
              "Fewer than two comparable seats: no band, no rail, one sentence on what’s missing. Max is not your friend, so you couldn’t pick his deck when you set the table; his seat waits for him.", "you3"))
    return F

META["you3"] = '<b>Thursday night</b> · set by you · 3 seated<br>open until 9:40 pm tomorrow'

def board_phone():
    out = []
    for lab, s, rd, cap, *m in frames():
        meta = m[0] if m else "colin"
        setter = meta.startswith("you")
        out.append(frame(lab, table_phone(s, rd, meta=meta, h=PH.get(lab, 2000), setter=setter), cap))
    body = ('<div class="bh"><span class="k">R1 · Rule 0 check · the read · phone 390 · full page, Kamigawa theme</span>'
            '<h2>The read sits on top, the seats under it, each saying what drives it</h2>'
            '<p class="cap" style="max-width:1900px">The table page, scrolled whole (the phone shows the top 700px and scrolls). The read is one card: a headline, one sentence, the rail of five brackets with each seat’s face, and the honesty line with How we make these decisions. Then every seat: art, name, deck and commander, the shipped bracket chip, the five counts. A flagged seat gains its tag and a sentence naming what puts it there. Every frame is your phone at Colin’s table unless the meta says you set it.</p></div>'
            f'<div class="frames">{"".join(out)}</div>')
    return doc("Rule 0 check, the read, phone", body, 2280, 4600)

PH = {}

def board_desk():
    out = []
    for lab, s, rd, cap, *m in frames():
        meta = m[0] if m else "colin"
        setter = meta.startswith("you")
        out.append(frame(lab.replace("T", "D", 1), table_desk(s, rd, meta=meta, h=DH.get(lab.replace("T", "D", 1), 1000), setter=setter), cap, width=1300))
    body = ('<div class="bh"><span class="k">R2 · Rule 0 check · the read · desktop 1300 · one seat per row</span>'
            '<h2>One seat per row on the left; the read holds the right column</h2>'
            '<p class="cap" style="max-width:2600px">R2 (Hugh, 2026-10-16): each seat is one full-width row, so no seat sits beside a taller one. Art, name, deck, commander and the chip read together; the flag tag sits over the five counts on the right; a flagged row is tinted in its ink and its reason opens under it. The read and Log this game stay in the 392px column. Same rules as the phone.</p></div>'
            f'<div class="frames">{"".join(out)}</div>')
    return doc("Rule 0 check, the read, desktop", body, 2780, 6000)

DH = {}
