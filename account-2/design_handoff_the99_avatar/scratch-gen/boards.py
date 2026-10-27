"""Signature card and spare asks R1: the boards. Each returns a whole .dc.html."""
import kit
import parts as P
import sr as S
import sc as C
from kit import doc, board_head, frame, frames, phone, desk

BADGE = {"Friends": 2}
H = 844


def ph(inner, active="Friends", over="", h=H, badges=BADGE, **kw):
    return phone(inner, active, h=h, badges=badges, over=over, **kw)


def dk(inner, active="Friends", over="", h=900, badges=BADGE, **kw):
    return desk(inner, active, badges=badges, over=over, h=h, **kw)


def note(t, b):
    return f'<div class="note"><h4>{t}</h4>{b}</div>'


def head(k, t, c):
    return board_head(k, t, c, tag="R1")


FP = C.friends_page  # /friends behind the picker


# ================================================================ Main
CALLS = [
    ("1", "The label: “Signature card”",
     "It isn’t “your commander” any more, and “avatar” or “face” is app-speak. A signature card is something a player already has. "
     "The head’s empty press reads <b>Choose your signature card</b>, the picker’s title <b>Your signature card</b>, the face’s name "
     "<i>Your signature card: Polyraptor. Change</i>. The face itself is unchanged: art, no frame, no name."),
    ("2", "The picker: the shipped one, two screens",
     "Same SocialModal (tall sheet on a phone, 520 dialog on desktop), same search field, same From your decks row (which keeps "
     "each deck’s own printing). Search now finds <b>any card</b>. A result with one printing saves on press, as today. A result with "
     "more says <b>N printings ›</b> where the colour pips sat, and opens a second screen (‹ back, as Add a friend’s chooser does): the "
     "printing picker’s tiles and words, with a preview of the face on top. One press saves and closes, as today."),
    ("3", "The crop: the printing’s art crop, for every card",
     "A face is 16 to 64px. A full card at that size is a frame with a smudge in it; the art crop is the picture. So every card, "
     "commander or not, crops to its printing’s art crop, centred, as faces do today. The printing tiles show the <b>whole card</b> "
     "(cards at card shape), and the preview above them shows the crop you’ll get, so nobody is surprised."),
    ("4", "Onboarding: after the upload, never in its way",
     "One unnumbered row in the first-run checklist, under the three steps and before <b>Add your friends</b> (you, then your friends). "
     "It is live from the first visit, so it never waits on the upload, but it sits after it, so the upload stays the one thing step 1 asks. "
     "<b>Skip</b> on the row is the “later”: the row leaves, and /friends keeps its + tile. Picked, the row turns done with the face and stays."),
    ("5", "Players who already have a profile: asked once",
     "Anyone with no face who never pressed Skip gets one Home strip, the welcome strip’s shape: <i>Friends see your initials. "
     "Choose your signature card</i> and a bare ✕. It leaves for good on a pick or the ✕. This also catches a new player who "
     "imported a deck before the checklist asked."),
    ("6", "Edited in one place: /friends",
     "The head of /friends stays the one place, as with the name (Hugh’s one-place rule). Settings doesn’t get a second copy: it holds "
     "no name either. The onboarding row and the Home strip open the same picker in place, without leaving the page."),
    ("7", "A printing that’s gone",
     "Silent everywhere a face is drawn: the card’s usual art, no mark. Only the picker tells, on that card’s printing screen: one "
     "line in the printing picker’s note box, and the usual art tile reads <b>Shown now</b> (the printing picker’s own words for a "
     "fallback nobody chose)."),
    ("8", "A friend’s Spares tab: eng’s proposal, ratified",
     "A tile press opens the shipped <b>Friends with a spare</b> modal for that card, with Ask. Two changes: the friend whose page "
     "you’re on is <b>first</b> (then the rest, most spares first), and the box’s kicker reads <b>on your wishlist</b> (or nothing) "
     "instead of “replacing”, since nothing is being replaced here. Card details are still one press away: the card’s name in the "
     "box. The tile’s caption carries <b>Requested</b> or <b>Accepted</b>, in the modal’s words."),
    ("9", "A notification opens the modal by itself",
     "The trade-match push, its Home item (See Colin’s spares) and its Waiting on you row all land on Colin’s Spares tab "
     "<b>with that card’s modal already open</b>, the tile ringed behind it. You came for that card, so it’s one press to Ask. "
     "✕ leaves you on the tab with focus on the tile. If the spare has gone since, no modal: the tab and the shared toast."),
]

GAPS = [
    ("G1 · setFace", "<code>setCommander</code> becomes <code>setFace(viewer, oracleId, printingId | null)</code>: the commander rule (<code>canBeFace</code>) goes; any game card the catalog lists (<code>isGameCard</code>: no tokens, emblems or art cards). A printing must belong to that oracle id, else <code>notAPrinting</code>. Null printing = the usual art."),
    ("G2 · the printing column", "<code>social_profiles.face_printing_id</code>, nullable. Reads that draw a face left-join the printing’s art crop and fall back to <code>cards.art_crop_uri</code> when the printing is gone (no write needed). <code>commanderColumns</code> → <code>faceColumns</code>."),
    ("G3 · the reads", "<code>searchFaceCards(query)</code> over every game card with a printing count; <code>listFacePrintings(oracleId)</code>: printings with an art crop, usual art first, then newest set first, each with set name, code and the full-card image. Over 12, the shipped set search filters them."),
    ("G4 · the ask once", "One flag per account, <code>face_prompt_done_at</code>, set by Skip, the strip’s ✕ or any pick. The checklist row and the Home strip both read it. Is a profile made on first pick if none exists? Engineering’s call."),
    ("G5 · the deep link", "<code>/friends/{publicId}?spare={oracleId}</code> on the trade-match push url, its feed item and the Waiting row. The page opens SparesSheet on load when that friend still offers the card; it needs every friend’s spare of that card and the reader’s request state for it (the read Shopping’s modal makes)."),
    ("G6 · strings", "Every string is a placeholder for <code>/copy-review</code>. Engineering’s call whether this needs a feature switch (the face write changes; Hugh’s rule: only if a regression is plausible)."),
]


def main_board():
    calls = "".join(note(f"{n} · {t}", b) for n, t, b in CALLS)
    gaps = "".join(f'<tr><td><b>{a}</b></td><td>{b}</td></tr>' for a, b in GAPS)
    body = (head("Signature card and spare asks · the round", "Any card is your face, and a spare is one press away",
                 "Part 1: the face becomes <b>any card, any printing</b>, asked for during onboarding (G11 addendum, Hugh’s rulings of 2026-10-27). "
                 "Part 2: asking for a spare from a friend’s Spares tab and straight from the trade-match notification. Orange dashed outlines mark what is new against the shipped page. "
                 "Art is cut from the design folder (the canvas can’t load Scryfall), so the printing tiles for Mystical Tutor share one picture; in the app each tile is its own printing.")
            + f'<div class="notes">{calls}</div>'
            + '<div class="bh"><h2 style="font-size:22px">Gaps for engineering</h2></div>'
            + f'<div class="note" style="max-width:1500px"><table class="tbl"><tr><th>Gap</th><th>What</th></tr>{gaps}</table></div>')
    return doc("Main · signature card", body, 1610)


# ================================================================ Picker
def picker_board():
    fp = FP(False, face=P.ME, ring=True)
    t, s = C.ptitle()
    f1 = frame("<b>P1 · Empty</b> · 390", ph(fp, over=C.modal(C.picker_empty())),
               "Opens on the search, From your decks under it, as shipped. The current face is outlined.")
    f2 = frame("<b>P2 · Results</b> · 390 · “sw”", ph(fp, over=C.modal(C.picker_results())),
               "Any card. <b>N printings ›</b> takes the pips’ place and says a press opens the printings. The type line names what a non-commander is.")
    f3 = frame("<b>P3 · No match</b> · 390", ph(fp, over=C.modal(C.picker_nomatch())),
               "The shipped line, in the list’s place, with “card” for “commander”.")
    f4 = frame("<b>P4 · One printing</b> · 390 · saving", ph(fp, over=C.modal(C.picker_one())),
               "Polyraptor has one printing: the row press saves, as today. The row holds <b>Saving</b> while the write lands; the rest dims and the sheet stays until it does.")
    f5 = frame("<b>P5 · Its printings</b> · 390", ph(fp, over=C.modal(C.printing_screen(False, "new"), title=t, sub=s, back=True)),
               "Mystical Tutor, pressed in a search. Screen two: ‹ back to the results. The preview shows the crop friends will see; the tiles show the whole card. <b>Usual art</b> first, then newest set first. Over 12, the printing picker’s set search.")
    f6 = frame("<b>P6 · Saving</b> · 390", ph(fp, over=C.modal(C.printing_screen(False, "busy"), title=t, sub=s, back=True)),
               "The pressed tile takes the pick ring and a spinner, the rest dim. Then the sheet closes.")
    sv = FP(False, face="face-polyraptor.jpg")
    f7 = frame("<b>P7 · Saved</b> · 390", ph(sv), "The head shows the new face. No toast: the face is the receipt, as shipped. A failed write keeps the sheet open and toasts “We couldn’t save your signature card. Try again.”")
    f8 = frame("<b>P8 · A printing that’s gone</b> · 390", ph(FP(False, face="crop-tutor.jpg"),
                                                              over=C.modal(C.printing_screen(False, "gone"), title=t, sub=s, back=True)),
               "Sam’s Secret Lair Mystical Tutor left the catalog. Faces fall back to the usual art with no mark; only this screen says so, and the fallback tile reads <b>Shown now</b>.")
    dfp = FP(True, face=P.ME, ring=True)
    d1 = frame("<b>D1 · Results</b> · 1300", dk(dfp, over=C.modal(C.picker_results(True), desk=True, h=560)),
               "The 520 dialog at 10dvh. Same rows at 52px.")
    d2 = frame("<b>D2 · Its printings</b> · 1300 · hover", dk(dfp, over=C.modal(C.printing_screen(True, "hover"), desk=True, title=t, sub=s, back=True, h=700)),
               "Four across. Hover or focus a tile and the preview shows its crop before you press; a press saves and closes.")
    body = (head("Part 1 · the picker", "Search any card, then choose a printing",
                 "Drawn over /friends, where the face is edited. The onboarding row and the Home strip open this same picker.")
            + frames(f1, f2, f3, f4)
            + frames(f5, f6, f7, f8)
            + frames(d1, d2))
    return doc("Picker · signature card", body, 2760)


# ================================================================ Onboarding
def onboarding_board():
    lk = ["Commanders", "Decks"]
    o1 = frame("<b>O1 · First visit</b> · 390", phone(C.first_run(False, "todo"), "Home", locked=lk),
               "Under the three steps, before Add your friends. Live at once; the press opens the picker over Home. <b>Skip</b> takes the row away for good.")
    o2 = frame("<b>O2 · Picked</b> · 390", phone(C.first_run(False, "done").replace("Upload a CSV", "Upload a CSV"), "Home", locked=lk),
               "The row turns done with the face, like Add your friends at one friend, and stays. Its press reopens the picker.")
    o3 = frame("<b>O3 · Skipped</b> · 390", phone(C.first_run(False, "skipped"), "Home", locked=lk),
               "The row is gone. Nothing else asks again; /friends keeps its + tile and Choose your signature card.")
    hs = P.home("normal", False).replace(P.wstrip(), C.home_strip())
    o4 = frame("<b>O4 · Already a player</b> · 390 · Home", phone(hs, "Home", h=H, badges={"Friends": 1}),
               "A profile with no face, never skipped: one strip at the top of Home, the welcome strip’s shape. The press opens the picker; ✕ ends it for good.")
    dfr = desk(C.first_run(True, "todo"), "Home", locked=lk)
    dh = desk(P.home("normal", True).replace(P.wstrip(True), C.home_strip()), "Home", h=1000, badges={"Friends": 1})
    d1 = frame("<b>D1 · First visit</b> · 1300", dfr, "Same row at desktop, in the checklist column.")
    d2 = frame("<b>D2 · Already a player</b> · 1300 · Home", dh, "The strip leads the left column, above the lead story.")
    body = (head("Part 1 · onboarding", "Asked once, after the upload, never in its way",
                 "The checklist’s unnumbered rows (Add your friends, Choose your news) already ask for the things that aren’t steps. The signature card joins them. "
                 "Before or after the upload: after, in order (step 1 stays the one thing the page asks first), but live from the first visit, so it never waits on it.")
            + frames(o1, o2, o3, o4) + frames(d1, d2))
    return doc("Onboarding · signature card", body, 2760)


# ================================================================ Edit + About
ABOUT_BEFORE = ("Pick a commander and its art becomes your face, beside your name everywhere a friend sees you. Then gather the friends you play with "
                "into a pod, and choose, pod by pod, who gets to see your spare cards.")


def edit_board():
    e1 = frame("<b>E1 · No face</b> · 390", ph(FP(False, none=True)),
               "As shipped, with the new words: the dashed + and <b>Choose your signature card</b>.")
    e2 = frame("<b>E2 · A face</b> · 390", ph(FP(False, face="face-polyraptor.jpg")),
               "The face with its ✎ opens the picker. Its name: “Your signature card: Polyraptor. Change”.")
    e3 = frame("<b>E3 · A face</b> · 1300", dk(FP(True, face="face-polyraptor.jpg"), h=800), "The same head at desktop.")
    diff = ('<div class="abd" style="max-width:1500px"><div class="c"><span class="k">About · friends · now</span><p>'
            '<del>Pick a commander</del> and its art becomes your face, beside your name everywhere a friend sees you. Then gather the friends you play with '
            'into a pod, and choose, pod by pod, who gets to see your spare cards.</p></div>'
            '<div class="c"><span class="k">About · friends · edit</span><p>'
            '<ins>Pick a signature card, any card in any printing,</ins> and its art becomes your face, beside your name everywhere a friend sees you. Then gather the friends you play with '
            'into a pod, and choose, pod by pod, who gets to see your spare cards.</p></div></div>')
    an = note("The About edit", "An edit to the <code>friends</code> entry’s second paragraph (<code>about-entries.ts</code>), not a new entry. "
              "Rides the next batched <code>ABOUT_VERSION</code> bump with no halo (the feature isn’t new, only wider). If engineering ships the face "
              "change behind a switch, the sentence is a <code>keySwitches</code> pair on it, as the friends entry already does for the bar.")
    sn = note("Settings: no", "Settings holds no name today, so it holds no face: /friends’ head is the one place for both. "
              "The onboarding row and the Home strip open the picker in place rather than sending anyone to /friends.")
    body = (head("Part 1 · where it’s edited, and About", "One place: the head of /friends",
                 "Nothing moves. The words change from commander to signature card.")
            + frames(e1, e2, e3)
            + diff + f'<div class="notes" style="grid-template-columns:1fr 1fr">{an}{sn}</div>')
    return doc("Edit and About · signature card", body, 2300)


# ================================================================ Spares
def spares_board():
    s1 = frame("<b>S1 · A press on a tile</b> · 390", ph(C.spares_tab(False, tap=0)),
               "Colin’s Spares tab. The caption line says a press asks; each tile is now a press to the modal.")
    s2 = frame("<b>S2 · The modal</b> · 390", ph(C.spares_tab(False, lit=0), over=C.spares_modal(False, "ask", top=300)),
               "The shipped Friends with a spare modal for Ghalta. <b>Colin first</b> because it’s his page, then Max. The box’s kicker: <b>on your wishlist</b>. The name opens card details.")
    s3 = frame("<b>S3 · Asked</b> · 390", ph(C.spares_tab(False, lit=0), over=C.spares_modal(False, "asked", top=300)),
               "The shipped request states: Colin reads Requested, Max’s row Ask instead.")
    s4 = frame("<b>S4 · Back on the tab</b> · 390", ph(C.spares_tab(False, states={0: "asked"}, lit=0)),
               "✕ returns focus to the tile. Its caption says <b>Requested</b> (then Accepted), in the modal’s words.")
    n1 = frame("<b>N1 · The push</b> · 390", ph(C.spares_tab(False, lit=0), over=C.push_banner()),
               "The shipped trade-match push. A tap opens the app on Colin’s Spares tab…")
    n2 = frame("<b>N2 · Landed</b> · 390", ph(C.spares_tab(False, lit=0), over=C.spares_modal(False, "ask", top=300)),
               "…with Ghalta’s modal already open. Home’s See Colin’s spares and the Waiting on you row land the same way.")
    n3 = frame("<b>N3 · The spare has gone</b> · 390", ph(C.spares_tab(False, skip=0), over=S.toast("Colin no longer has a spare Ghalta, Primal Hunger.", 96)),
               "Colin used it since. No modal: the tab as it is now, and the shared toast.")
    d1 = frame("<b>D1 · The modal</b> · 1300", dk(C.spares_tab(True, lit=0), over=C.spares_modal(True, "ask", dtop=120), h=640),
               "The 640 modal over Colin’s page, from a tile or a landing alike.")
    d2 = frame("<b>D2 · Captions</b> · 1300", dk(C.spares_tab(True, states={0: "asked", 1: "yes"}), h=560),
               "Ghalta requested, Jace accepted.")
    body = (head("Part 2 · asking for a spare outside Shopping", "A tile opens the modal; a notification opens it for you",
                 "Engineering’s minimal proposal, ratified: the tile opens the shipped spares-only modal (which has Ask), and a trade-match landing opens it by itself. "
                 "No new surface, no new press on the tile.")
            + frames(s1, s2, s3, s4) + frames(n1, n2, n3) + frames(d1, d2))
    return doc("Spares · spare asks", body, 2760)


BOARDS = [("Main", main_board, "Main · the round: calls and gaps"),
          ("Picker", picker_board, "1 · The picker"),
          ("Onboarding", onboarding_board, "2 · Onboarding"),
          ("Edit-About", edit_board, "3 · Where it’s edited, and About"),
          ("Spares", spares_board, "4 · Spare asks outside Shopping")]
