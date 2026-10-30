"""Spare requests R1: the boards. Each returns a whole .dc.html."""
import kit
import parts as P
import sr as S
from kit import doc, board_head, frame, frames, phone, desk

FOLD = '<div class="fold" style="top:770px"><span>first screen ends</span></div>'
BADGE = {"Home": 2, "Friends": 2}


def ph(inner, active, h=None, over="", fold=False, badges=BADGE):
    return phone(inner, active, h=h, badges=badges, over=(over or "") + (FOLD if fold and not h else ""))


def dk(inner, active, h=None, over="", badges=BADGE):
    return desk(inner, active, badges=badges, over=over, h=h)


def note(t, b):
    return f'<div class="note"><h4>{t}</h4>{b}</div>'


# ================================================================ Main
CALLS = [
    ("1", "Ask lives where the spares already show",
     "No new surface. The shipped row press (⇄ and the spare glyph) opens the shipped modal, <b>Before you buy</b> or <b>Friends with a spare</b>, and each friend row in its <b>Friends with a spare</b> section gains one <b>Ask</b> press where “view only” sat. Same in the all-decks cart. <b>All</b> draws no request marks: its one-line row has no room for them (Hugh, R2), so a request is made and read in Shopping."),
    ("2", "Several friends, one row, one ask",
     "The row keeps <b>one</b> marker however many friends hold the card. The modal lists them most spares first (shipped order), each with its own Ask. <b>One open request per card</b>, so nobody hands over a card you no longer need. Once you ask Colin, Max’s row reads <b>Ask instead</b>: one press withdraws Colin’s request and sends Max one, so nobody waits out 14 days. The withdrawn friend isn’t told; the row leaves their Waiting on you and the badge drops. ✕ in Your requests withdraws without asking anyone else."),
    ("3", "One press, no note (agreed)",
     "Ask is one deliberate press. The request already says the card, how many (what the deck needs, up to their spare count) and which deck it is for, so the friend reads <i>“Peter wants 1 for Dragons of Tarkir.”</i>"),
    ("4", "The row says where the ask is",
     "The spare glyph takes two marks, each in the key only while a row draws it: <b>requested</b> (an accent dot) and <b>accepted</b> (green, with a tick). In the key the three friend marks sit next to each other, in the shipped grid. A decline, an expiry or a withdrawn request puts the plain glyph back. No new press, no chip, no column."),
    ("5", "A yes changes nothing else",
     "Yes tells you; the row keeps its buy tag. The handover happens between you, and the card joins your collection the way it always does: <b>press buy on the row</b> (I got it) or update your collection. When the card stops being one you need, any open ask closes by itself."),
    ("6", "Your requests, on /friends",
     "A <b>Your requests</b> section under Waiting on you, in the same feed rows: requested (days left), accepted, declined, no answer (Ask again), no longer spare. A bare ✕ withdraws an open ask or clears an answered one. Answered rows also leave after 14 days."),
    ("7", "The friend answers where they wait",
     "The request is a <b>Waiting on you</b> row with <b>Yes</b> and <b>No</b> (and days left), on /friends and as Home’s lead story when it is the newest thing waiting. The Friends badge counts unanswered requests. An answer turns the row into a receipt for the visit, then it leaves."),
    ("8", "The notice: on by default",
     "Settings’ <b>Friends asking for your spares</b> is the one kind that starts checked (workshop ruling). Off, a request still lands in Waiting on you (so it can be answered or expire), but it makes no Home item and no badge."),
    ("9", "The asker is told on Home",
     "An answer is a What’s new item for the asker (<b>Your request</b>: “Colin can spare Jace”, “Chris is keeping Dina”), always on because they asked; it is not a Settings checkbox. An expiry is not news: it only shows in Your requests."),
]
GAPS = [
    ("G1", "Ask store", "<code>spare_asks</code>: asker, friend, oracle_id, copies, deck_id (null from the cart), created_at, answered_at, answer (yes | no), withdrawn_at, closed_reason. A unique partial index holds one OPEN ask per (asker, oracle_id), which is call 2."),
    ("G2", "Expiry at read", "Open and created_at older than 14 days reads as <b>no answer</b>; no job. Waiting on you drops it at the same moment, so the two sides never disagree."),
    ("G3", "Closing on its own", "The ask closes as <b>no longer spare</b> when the spares read stops returning that friend for that card (used in a deck, kept back, threshold, share off, unfriended), and closes silently when the card leaves the asker’s buy lists (bought, cut, I got it). Both at read, from the existing spares read (<code>lib/social/spares.ts</code>)."),
    ("G4", "Feed kinds", "<code>spare-request</code> exists; its default flips to ON for every account (write the pref on read when unset). New stored kind <code>spare-answer</code>, written on Yes or No for the asker, outside <code>feed_kinds</code> (no checkbox) and outside <code>WAITING_KINDS</code>."),
    ("G5", "Badge", "The Friends badge counts open requests to the reader newer than <code>friends_seen_at</code>, as shipped; answering removes the row and so the count."),
    ("G6", "Failed writes", "Ask, Yes, No and ✕ use the shared toast on failure (“We couldn’t send that. Try again.”) and leave the row as it was."),
]


def main_board():
    flow = ('<div class="flow">'
            '<div class="st"><em>1 · See</em><b>A friend holds a spare</b><span>The spare glyph on the Shopping row and the cart line. Shown, never notified.</span></div><span class="ar">›</span>'
            '<div class="st"><em>2 · Ask</em><b>Press Ask on their row</b><span>In the modal the row press opens. One open ask per card.</span></div><span class="ar">›</span>'
            '<div class="st"><em>3 · Wait</em><b>Their Waiting on you</b><span>Yes or No, 14 days to answer. Home’s lead story and the Friends badge if their notice is on.</span></div><span class="ar">›</span>'
            '<div class="st"><em>4 · Told</em><b>Yes, No, or no answer</b><span>The row’s mark and Your requests change; a Home item for an answer. Expired: Ask again.</span></div><span class="ar">›</span>'
            '<div class="st"><em>5 · Outside</em><b>The handover</b><span>Between you. The card joins your collection the usual way (press buy on the row).</span></div>'
            '</div>')
    calls = "".join(note(f"{n} · {t}", b) for n, t, b in CALLS)
    gaps = "".join(f'<tr><td><b>{g}</b></td><td><b>{t}</b></td><td>{b}</td></tr>' for g, t, b in GAPS)
    idx = ("<ul><li><b>Shopping</b>: the deck’s Shopping rows with every mark, the modal at Ask and at Asked, 390 and 1300.</li>"
           "<li><b>Cart-By-Friend</b>: Shopping for all decks gains a third view, By friend: every friend’s spares of what you’d buy, with Ask.</li>"
           "<li><b>Asker-States</b>: the friend row’s five states, Your requests on /friends, the answer on Home, the failed-write toast.</li>"
           "<li><b>Friend-Side</b>: the request in Waiting on you with Yes and No, the receipt, Home’s lead story, the badge, Settings’ notice line.</li>"
           "</ul>")
    body = (board_head("Spare requests · R2", "Ask in the modal you already open; answer where you already wait",
                       "Builds on <code>design_handoff_the99_menu_home</code> (friend page and Waiting on you, shipped #2186/#2193), Settings’ spares (#2180) and Social R2’s spare marker and modal. "
                       "Workshop rulings held: shown never notified, Ask is a deliberate press per card, the friend answers Yes or No and the asker is told, a yes changes nothing else in the app, 14-day expiry and ask again, the threshold and Keep decide what is spare. "
                       "Orange dashed outlines mark what is new against the shipped page. Copy is placeholder for /copy-review.")
            + flow
            + f'<div class="notes">{calls}</div>'
            + '<div class="notes" style="grid-template-columns:2fr 1fr">'
            + f'<div class="note"><h4>Gaps for engineering</h4><table class="tbl">{gaps}</table></div>'
            + note("The boards", idx)
            + "</div>")
    return doc("Spare requests · R2", body, 1612)


# ================================================================ Shopping
def shopping_board():
    p1 = ph(S.shopping_page(), "Decks")
    p2 = ph(S.shopping_page(tap="Dina, Essence Brewer"), "Decks", h=844, over=S.modal_html("dina-ask"), fold=False)
    p3 = ph(S.shopping_page(), "Decks", h=844, over=S.modal_html("jace-asked"), fold=False)
    d1 = dk(S.shopping_page(True), "Decks")
    d2 = dk(S.shopping_page(True), "Decks", h=720, over=S.modal_html("jace-asked", True, 60))
    body = (board_head("Shopping · a deck’s Shopping tab", "The row you shop from says who has it; Ask is in the modal it opens",
                       "The shipped one-line Shopping row and its one other-ways press (⇄ and the spare glyph), unchanged in size and place. "
                       "<b>Jace</b>: over the limit and a spare, requested from Colin (accent dot). <b>Gisa</b>: Peter accepted (green tick). <b>Dina</b>: Chris holds a spare, not requested yet. "
                       "The key’s two new items show only while a row draws them.")
            + frames(frame("<b>Shopping</b> · 390", p1, "Every state at once. The press keeps its 26px box in a 44px hit; no column is added."),
                     frame("<b>Dina’s press</b> · 390 · Friends with a spare", p2,
                           "The shipped spares-only sheet (no ⇄ on this row). Chris’s row: the spare count as shipped, then <b>Ask</b> where “view only” sat. The old foot copy now sits behind the ⓘ beside the section head."),
                     frame("<b>Jace’s press</b> · 390 · Before you buy", p3,
                           "Both apply, so the shipped title and order: friends first, then stand-ins. Colin: requested, 12 days left. Max holds one too; his row reads Ask instead (call 2): it moves the request to him."))
            + frames(frame("<b>Shopping</b> · 1300", d1, "The two-up grid of one-line rows, the key on one line."),
                     frame("<b>Jace’s press</b> · 1300 · the 640 modal", d2, "The same section in ModalChrome at 640.")))
    return doc("Shopping · spare requests", body, 2780)


# ================================================================ Deck list
def all_board():
    p1 = ph(S.all_page(), "Decks")
    p2 = ph(S.all_page(lit="Dina, Essence Brewer"), "Decks", h=844, over=S.modal_html("dina-ask"), fold=False)
    d1 = dk(S.all_page(True), "Decks")
    body = (board_head("Deck list · the All view", "The same mark on a card you don’t own",
                       "A card you’d buy shows the bare <b>$</b> in All today. When a friend holds a spare, the spare glyph press sits before it: the same 26px press as Shopping, holding only the glyph "
                       "(All never draws ⇄; L2’s “All carries no other-ways press” gives way for this one mark, as the brief asks). Owned rows are untouched. The key gains the item only while a row draws it.")
            + frames(frame("<b>All</b> · 390", p1, "Dina (spare), Gisa (accepted), Jace (requested). Killian and Quintorius: to buy, no spare, so no press."),
                     frame("<b>Dina’s press</b> · 390", p2, "Opens the same spares-only sheet as Shopping, with Ask. Always “Friends with a spare” here, since All has no stand-ins."),
                     frame("<b>All</b> · 1300", d1, "The two-up grid; the press sits between the 72px pip track and the $, so the columns still line up.")))
    return doc("Deck list · spare requests", body, 2620)


# ================================================================ Cart
def cart_board():
    p1 = ph(S.cart_page(), "Decks")
    d1 = dk(S.cart_page(True), "Decks")
    body = (board_head("Shopping for all decks · By friend", "The view of all of them: a third way to read the cart",
                       "The cart’s view switch (By card · By deck) gains <b>By friend</b>, shown while any line has a friend’s spare. The same lines, grouped under each friend who holds a spare, most spares first; "
                       "a card two friends hold sits under both. In this view the spare glyph would say nothing, so the line’s press is <b>Ask</b> itself. One open ask per card holds here too: Jace under Max reads <b>Ask instead</b>, which moves the request from Colin to Max.")
            + frames(frame("<b>By friend</b> · 390", p1, "Checkout heads the phone page as shipped; the switch and the list head stay pinned while the lines scroll."),
                     frame("<b>By friend</b> · 1300", d1, "Decks and checkout on the left as shipped; the friends list in the scrolling box. The line is the shipped cart line (name opens the card, decks line, buy tag).")))
    return doc("Cart · by friend", body, 1960)


# ================================================================ Asker states
def asker_board():
    st = [("A · Ask", [("Chris", 1, "ask")], "", "The rest state, with the ⓘ pressed: the old foot copy, cut to one tooltip."),
          ("B · Requested", [("Colin", 2, "asked"), ("Max", 1, "held")], "One request at a time. Ask instead moves it from Colin to Max.",
           "In place, no toast. Days left on the sub line, one word on the right. Other friends read <b>Ask instead</b>: one press withdraws Colin’s request and sends Max one. Colin isn’t told; his Waiting on you row and badge simply drop."),
          ("C · Accepted", [("Peter", 2, "yes")], "When it’s yours, press buy on the row.", "Green, as the row’s tick. Nothing else in the app moves."),
          ("D · Declined", [("Chris", 1, "no")], "Nobody else you know has a spare.", "No Ask to Chris for this card for 14 days (the shipped cooldown). If others hold one, their Ask comes back at once."),
          ("E · No answer", [("Max", 1, "expired")], "", "After 14 days. Ask again starts a new 14 days.")]
    strip = "".join(frame(f"<b>{t}</b>", f'<div class="stt" style="min-height:{170 if t.startswith("A") else 0}px">{S.fsection(rows, extra, tip=t.startswith("A"))}</div>', cap) for t, rows, extra, cap in st)
    marks = ('<div class="stt" style="display:flex;flex-direction:column;gap:6px;padding:14px 16px">'
             + S.shop_row(S.SHOP[4]) + S.shop_row(S.SHOP[0]) + S.shop_row(S.SHOP[1]) + "</div>")
    p1 = ph(S.friends_page(waiting_on=False), "Friends")
    d1 = dk(S.friends_page(True, waiting_on=False), "Friends")
    I = S.items()
    home_items = ('<div class="stt" style="padding:14px 14px 16px"><section class="blk"><h2 class="sh">What’s new <em>· 1 new</em><span class="r">Choose what shows <i>›</i></span></h2>'
                  '<div class="fd">' + P.fitem(I["ans-yes"]).replace('class="fi"', 'class="fi new"', 1)
                  + P.fitem(I["ans-no"]).replace('class="fi"', 'class="fi new"', 1) + P.fitem(I["price"], seen=True) + '</div></section></div>')
    t = ph(S.shopping_page(overrides={"Dina, Essence Brewer": "spare"}), "Decks", h=844,
           over=S.modal_html("dina-ask") + S.toast("We couldn’t send that. Try again.", 28), fold=False)
    body = (board_head("The asker’s states", "Requested, accepted, declined, no answer, and where your requests are listed",
                       "The friend row in the modal is where each state is read first; the row’s glyph carries the two that matter while you shop; Your requests on /friends lists them all; an answer is a Home item.")
            + frames(*[strip], gap=28)
            + frames(frame("<b>The row’s marks</b>", marks, "Plain: a friend has a spare. Accent dot: requested. Green with a tick: accepted. Declined and no answer go back to plain."),
                     frame("<b>The answer on Home</b> · What’s new · 390", home_items,
                           "A new kind, <b>Your request</b>, for the asker only and always on (G4). The press goes to Your requests."))
            + frames(frame("<b>/friends · Your requests</b> · 390", p1,
                           "Under Waiting on you (absent here: nothing waits on Sam). Requested, accepted, declined, no answer with Ask again. ✕ withdraws an open ask or clears an answer."),
                     frame("<b>Failed ask</b> · 390", t, "The shared toast; Chris’s row keeps its Ask."),
                     frame("<b>/friends · Your requests</b> · 1300", d1, "The 720 column; the press moves to the row’s third column as the feed rows do.")))
    return doc("Asker states · spare requests", body, 2380)


# ================================================================ Friend side
def friend_board():
    p1 = ph(S.friends_page(asks=False), "Friends", badges={"Home": 3, "Friends": 2})
    p2 = ph(S.friends_page(answered="yes", asks=False), "Friends", badges={"Home": 3, "Friends": 1})
    home_ph = ph(P.home_head() + '<div class="hb">' + S.lead_ask() + P.resume(2) + "</div>", "Home", h=844,
                 badges={"Home": 3, "Friends": 2}, fold=False)
    d1 = dk(S.friends_page(True, asks=False), "Friends", badges={"Home": 3, "Friends": 2})
    sett = ph(S.settings_news(), "Home", fold=False, badges={"Home": 3, "Friends": 2})
    body = (board_head("The friend’s side", "Yes or No where the request waits",
                       "Peter asked Sam for a spare Lathliss. The request is the shipped Waiting on you row with its two answers, the days left beside them (the blue “later round” outlines of #2174, now drawn). "
                       "Yes is the filled press because it is the answer the ask hopes for; neither needs a confirm, since neither moves a card.")
            + frames(frame("<b>/friends</b> · 390 · two requests", p1, "Requests first (waiting kinds), then the trade match. The Friends badge counts the two requests."),
                     frame("<b>After Yes</b> · 390", p2, "The row becomes a receipt for this visit, then leaves. Badge 1. After No: “You’re keeping Lathliss. Peter’s been told.”"),
                     frame("<b>Home</b> · 390 · the lead story", home_ph, "A request is the first lead (LEAD_PRIORITY). Yes and No on the story itself; answered, Home’s next lead takes its place."),
                     frame("<b>Settings</b> · 390 · the notice", sett, "The one kind that starts checked. Off: no Home item, no badge; the request still waits on /friends."))
            + frames(frame("<b>/friends</b> · 1300", d1, "The answers move to the row’s third column with the days left.")))
    return doc("Friend side · spare requests", body, 1950)


# ================================================================ Note
def note_board():
    a = '<div class="stt">' + S.fsection([("Chris", 1, "ask")]) + "</div>"
    b_rows = S.frow("Chris", 1, "ask").replace('<span class="ask new">Ask</span>', '<span class="ask" style="opacity:.45">Ask</span>')
    b = ('<div class="stt"><section class="fsx2"><div class="h">Friends with a spare · 1</div>' + b_rows
         + '<div class="nt new"><div class="ta">Add a note (optional)</div><div class="rw"><small>0 / 140</small><span class="bg">Cancel</span><span class="bp">Send ask</span></div></div>'
         + f'<p class="ft">{S.ASK_FOOT}</p></section></div>')
    I = S.items()
    fa = I["ask"]
    fb = dict(fa, detail='You have 2 spare. Peter wants 1 for Dragons of Tarkir.<br><span style="color:var(--fg)">“Need it before Thursday, happy to swap a Sol Ring.”</span>')
    ra = '<div class="stt" style="padding:0;overflow:hidden"><div class="fd" style="border:0;border-radius:0">' + P.fitem(fa) + "</div></div>"
    rb = '<div class="stt" style="padding:0;overflow:hidden"><div class="fd new" style="border:0;border-radius:0">' + P.fitem(fb) + "</div></div>"
    body = (board_head("Open for Design · a note on the ask", "Recommended A: no note",
                       "<b>A</b> keeps Ask one press and lets the ask speak for itself: card, copies, deck. <b>B</b> opens a note under the friend’s row before sending (free text, so it goes through the player-text boundary, G6). "
                       "B adds a step to every ask for a sentence most asks won’t need, and players already talk off the app; A is drawn everywhere else on the canvas.")
            + frames(frame("<b>A · Ask</b> · asker", a, "One press."),
                     frame("<b>A · the request</b> · friend", ra, "What the friend reads."),
                     frame("<b>B · Ask opens a note</b> · asker", b, "Ask turns into a note field and Send ask; Cancel goes back."),
                     frame("<b>B · the request</b> · friend", rb, "The note under the line, quoted, in the friend’s row only.")))
    return doc("Note · spare requests", body, 1900)


BOARDS = [("Main", main_board, "R2 · the flow, calls, gaps"),
          ("Shopping", shopping_board, "Shopping · the row and the modal’s Ask"),
          ("Cart-By-Friend", cart_board, "Shopping for all decks · By friend"),
          ("Asker-States", asker_board, "The asker · states and Your requests"),
          ("Friend-Side", friend_board, "The friend · Yes or No, badge, Home, Settings")]
