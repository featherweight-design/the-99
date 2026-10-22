"""Friend decks and the hide switch R1: the boards."""
import kit, parts as P, fdk as F
from kit import doc, board_head, frame, frames, phone, desk, img

B = {"Home": 2}


def sec(title, cap, body):
    return f'<div class="sec2"><h3>{title}</h3>' + (f'<p class="sp">{cap}</p>' if cap else "") + body + "</div>"


def notes(*ns, cols=3):
    return f'<div class="notes" style="grid-template-columns:repeat({cols},minmax(0,1fr))">' + "".join(f'<div class="note">{n}</div>' for n in ns) + "</div>"


# ============================================================================ Main
def main():
    calls = [
        ("1 · A friend’s deck opens, read-only",
         "Every tile on a friend’s Decks tab is now a press. It opens the deck at <code>/friends/{publicId}/decks/{deckId}</code>: "
         "under the friend, so the back link is theirs, the Friends slot stays lit, and the friendship is what reads it. Not under "
         "<code>/decks</code>: that route is yours and edits. The page is the <b>open precon page’s anatomy</b>, the app’s one read-only deck list, "
         "with the owner’s grouping (by type, A–Z, commander first)."),
        ("2 · What a viewer may still do",
         "<b>Open card details</b> (a row is the press; Prev and Next page through Colin’s list in order). <b>Wishlist a card</b> from the details’ "
         "shipped Wishlist box. <b>See what they own</b>: the row’s dot, “You own N of M of its cards”, and each group’s “you own N of M”. "
         "Switch <b>List / Cards</b> and get the hover preview, as on a precon. Nothing else: no ✕, stepper, buy tag, auto tag, proxy, lock, "
         "to-do card, tabs, notes, Update, Export or ⋯. <b>R2:</b> card details are the shipped ones, untouched: Add to wishlist stays in the full sheet "
         "(swipe up on a phone) and in the desktop details column, where it already is."),
        ("3 · Design’s calls",
         "<b>R2: no status.</b> A friend’s tile and deck page drop the status pill, the bar and the to-buy figure: “To buy” is Colin’s errand, not yours. "
         "They show the card count alone. <b>Price and buy tags: not shown.</b> They are Colin’s figures, and the read-only row draws none. Card details keep the card’s "
         "catalog price, which is nobody’s. <b>The viewer’s own marks: shown</b>; “do I have this?” is why you open a friend’s deck. "
         "The dot means <i>your</i> collection here, so a one-line key says so. <b>URL</b>: under the friend’s page (call 1)."),
        ("4 · Hidden from friends",
         "A checkbox row in the deck’s <b>⋯ menu</b>, above Delete. It is one menu (<code>DeckCardOverflow</code>), so the deck page header and the "
         "/decks tile both get it. A press ticks it, saves, and closes the menu. No confirm, since it undoes the same way. On: a quiet "
         "<b>Hidden from friends</b> mark in the header’s chips row, and on /decks the glyph in the tile’s chips row, explained in the /decks key. "
         "Off by default; drawn only with <code>SOCIAL_FRIENDS_ENABLED</code>. Hiding changes nothing about spares: the deck’s cards still count as in use."),
        ("4b · R2: defaults and the global switch, in Settings",
         "/settings gains <b>Your decks</b>, after Spares: <b>Friends can see my decks</b> (on) and under it <b>Include drafts and decks I’m building</b> "
         "(<b>off by default</b>). So out of the box friends see Complete, To buy and Over decks, never Draft or Building. The per-deck row still hides any one deck. "
         "A deck Settings already hides shows its ⋯ row ticked and locked, with “Set in Settings ›” under it (the press opens Settings). The /decks glyph marks only a "
         "deck hidden on its own: the Settings rule is stated once, not on every draft."),
        ("5 · The privacy line, and absence",
         "/friends now reads <b>“" + NEW_PRIV + "”</b>, changing with Settings (Privacy board). A hidden deck is simply "
         "absent for friends: no tile, the Decks count drops, nothing says one is hidden. Its link is the app’s 404, the same page a deleted "
         "deck gives, so the two can’t be told apart. <b>Confirmed.</b>"),
        ("6 · The friend’s tile: the /decks tile, read-only",
         "The tile becomes the owner’s /decks tile without the ⋯: the same art band (248 tall in a cell of 330 or wider, 168 under), "
         "1 column on a phone and 3 at 1300 (was a 120px band, 4 across). The band is about the art crop’s own 1.37:1, so the commander "
         "stays in frame. <b>The commander line drops the name when the deck’s name repeats it</b> (whole, or the part before the comma) "
         "and shows the colour alone."),
        ("7 · Carried over from prompt 13",
         "Waiting on you: <code>--fg-faint</code> for the time and a seen row’s kind is <b>ratified</b> (the board’s <code>--fg-locked</code> was a slip). "
         "<b>Under an hour reads “just now”</b>, not “0h ago”. No face: the initials tile, as built. No art: the card’s identity gradient at card "
         "shape, the collection grid’s rule. Home feed: <b>“You added X.” is ratified</b>; the board’s “Your last upload added” was wrong once "
         "hand adds and Mark bought made pairs too."),
    ]
    cells = "".join(f'<div class="note"><h4>{t}</h4>{b}</div>' for t, b in calls)
    gaps = [
        ("G1 · The friend deck read", "<code>loadFriendDeck(viewer, publicId, deckId)</code> behind <code>resolveFriend</code>, the grant read again after the reads (as "
         "<code>loadFriendDecks</code> does). Returns null for a hidden deck, a deck that isn’t theirs, or a lapsed friendship. Cards come with the viewer’s "
         "ownership joined from the viewer’s collection and the owner’s printing for card details. No prices, no notes, no folder."),
        ("G2 · The switches", "<code>decks.hidden_from_friends</code>, boolean, default false, written by one deck action from the menu; and two account prefs, "
         "<code>friends_see_decks</code> (default true) and <code>friends_see_unfinished</code> (default false; unfinished = Draft or Building, from <code>lib/decks/status.ts</code>). Filtered in "
         "<code>loadFriendDecks</code> and G1, so both agree in one place. A failed write is a toast: “We couldn’t change that. Your deck is unchanged.”"),
        ("G3 · The tile needs an id", "<code>FriendDeck</code> gains the deck’s id (the tab’s comment says nothing carries one today), to build the link. "
         "The tile’s art keeps <code>commanderArtCropUri</code>."),
        ("G4 · Other places a deck name reaches a friend", "Tonight’s table and R3’s logged games name the deck a friend played against. <b>Ruled by Hugh (2026-10-22): they keep it</b>, "
         "since the player chose to use that deck. Hiding never rewrites a table or a logged game."),
        ("G5 · The Jaws image", "Engineering checks its source. Whatever it finds, a tile with no art crop draws the commander gradient (as the /decks tile "
         "does), never the full card image, which is what puts “LEGENDARY CREAT…” in the band."),
        ("G6 · Not drawn", "Card view (<code>ReadOnlyCardTile</code>, as the precon). The About entry for this line comes with its own round."),
    ]
    gc = "".join(f'<div class="note"><h4>{t}</h4>{b}</div>' for t, b in gaps)
    legend = ('<div class="note" style="max-width:1500px"><h4>Reading the boards</h4>Drawn over main’s pages in Low Sun. <b>Orange dashed outlines</b> mark what is new '
              'against what shipped. Fixtures: you are Sam; Colin’s decks are Thopter Factory (Sai), Ghalta, Primal Hunger, Giada and Lathliss, Dragon Queen. '
              'Canvases can’t load Scryfall, so the art is cut from the design folder’s card images. Words are placeholders for <code>/copy-review</code>.</div>')
    body = (board_head("Friend decks and the hide switch · R2", "A friend’s deck opens, and a deck can hide",
                       "Builds on <code>design_handoff_the99_menu_home</code> and the friend page that shipped in #2186 and #2193. Hugh’s rulings: friends see every "
                       "deck’s full list, read-only, on by default; a per-deck <b>Hidden from friends</b> switch removes the deck from friends entirely. "
                       "Six boards: the friend’s deck, its states, the tiles, the switch, the privacy line, and the two carried-over calls.")
            + legend + f'<div class="notes">{cells}</div>'
            + '<h3 style="margin:8px 0 0;font:700 20px Cinzel,serif">Gaps for engineering</h3>' + f'<div class="notes">{gc}</div>')
    return doc("Friend decks · main", body, 1610)


# ============================================================================ A friend's deck
def friend_deck():
    tab = phone(F.decks_tab(F.COLIN[:2], tap="left:46%;top:38%", counts={"spares": 6, "wish": 12, "decks": 4}), "Friends", badges=B, h=844)
    top = phone(F.fdeck_page(), "Friends", badges=B, h=844)
    end = phone(F.fdeck_page(groups=["Artifacts", "Lands"], start=11, show_own=False).replace('<div class="hd">', '<div class="hd" style="display:none">', 1)
                .replace('<div class="ky">', '<div class="ky" style="display:none">', 1), "Friends", badges=B, h=844)
    pressed = phone(F.fdeck_page(groups=["Creatures", "Planeswalkers"], start=14, show_own=False, foc="Jace, Multiverse Architect", tap="Jace, Multiverse Architect")
                    .replace('<div class="hd">', '<div class="hd" style="display:none">', 1).replace('<div class="ky">', '<div class="ky" style="display:none">', 1),
                    "Friends", badges=B, h=844)
    det = phone(F.fdeck_page(), "Friends", badges=B, h=844, over=F.detail_phone())
    dk = desk(F.fdeck_page(True), "Friends", badges=B, h=980)
    dkd = desk(F.fdeck_page(True), "Friends", badges=B, h=700, over=F.detail_desk())
    body = (board_head("Deliverable 1 · a friend’s deck, opened from their Decks tab", "Colin’s Thopter Factory, read-only",
                       "The open precon page’s anatomy with the deck page’s grouping. The head names whose deck it is and its card count (R2: no status); "
                       "the band under it is <b>yours</b>: how many of its cards you own, and the deck of yours it overlaps. Rows are <code>DecklistRow</code> in its "
                       "read-only form: your ownership dot, the name, the cost, and on desktop Colin’s printing. A row opens the shipped card details, "
                       "unchanged: Add to wishlist stays where it ships. No prices: they are Colin’s figures.")
            + frames(frame("<b>Decks tab</b> · 390 · the press", tab, "The whole tile is the press (the tiles are redrawn on the Tiles board)."),
                     frame("<b>The deck</b> · 390 · first screen", top, "Back to Colin’s decks. Colin’s face in the eyebrow says whose list this is; the commander line "
                           "shows because the name doesn’t repeat it. The key line is new: on this page the dot is <i>your</i> collection."),
                     frame("<b>The deck</b> · 390 · the end of the list", end, "Every group as the owner’s page draws it, then Lands with the basics on the precon’s "
                           "dashed line (basics are not counted in what you own)."),
                     frame("<b>A row pressed</b> · 390", pressed, "The row is the press, with the shipped focus ring."),
                     frame("<b>Card details</b> · 390", det, "The shipped sheet, unchanged: 27 of 73 pages through Colin’s list. "
                           "R2: nothing is raised into the teaser. Add to wishlist stays in the full sheet, one swipe up, as everywhere else. The price is the catalog’s."), gap=40)
            + frames(frame("<b>The deck</b> · 1300", dk, "The precon head at 1300: the 56×78 thumb, the band, the list note with List / Cards at its right end. "
                           "Each group says what you own of it, right-aligned, as the precon’s groups do. Rows carry Colin’s printing, as a precon’s carry the box’s. "
                           "No ✕ column, no buy column."),
                     frame("<b>Card details</b> · 1300", dkd, "The shipped modal over the page, unchanged: the Wishlist box sits in the details column where it ships.")))
    return doc("Friend deck", body, 2760)


# ============================================================================ States
def states():
    long_ = desk(F.fdeck_page(True, full=True), "Friends", badges=B)
    empty_cards = (F.fdeck_head(False, name="Zimone, Infinite Analyst", cmd="Zimone, Infinite Analyst", art="crop-zimone.jpg", st="Draft", built=0,
                                ident="UG", own=(0, 0), shares=False, show_own=False)
                   .replace('<div class="nt">', '<div class="nt" style="display:none">', 1))
    zl = ('<div class="ls"><div class="gp"><div class="gh"><b>Commander</b><em>1</em></div>'
          '<div class="rw"><span class="od no"></span><span class="nm">Zimone, Infinite Analyst</span><span class="cost">'
          + F.pip("c2") + F.pip("u") + F.pip("g") + '</span></div></div>'
          '<div class="emp2 new"><b>Colin hasn’t added cards yet</b><p>Zimone is the commander so far. The list shows here as Colin builds it.</p></div></div>')
    emp = phone(f'<div class="fx">{empty_cards}{zl}</div>', "Friends", badges=B, h=700)
    empd = desk(f'<div class="fx">{empty_cards.replace("hd", "hd", 1)}{zl}</div>', "Friends", badges=B, h=560)
    many = F.COLIN + F.COLIN_MORE[:4]
    longtab = desk(F.decks_tab(many, True, counts={"spares": 6, "wish": 12, "decks": 8}), "Friends", badges=B)
    none_ = (F.friend_head("decks", False, {"spares": 6, "wish": 12, "decks": 0}) + '<div class="emp2 new" style="margin-top:14px"><b>Colin has no decks yet</b>'
             '<p>A deck Colin shares shows here, with its whole list.</p></div></div>')
    nonep = phone(none_, "Friends", badges=B, h=700)
    nf = phone('<div class="nf"><span class="num">404</span><h2>There’s no page here.</h2><p>I checked. Twice. Probably a typo in the URL.</p>'
               '<div class="b"><span class="bp">Back home</span><span class="bg">View decks</span></div></div>', "Friends", badges=B, h=700)
    body = (board_head("Deliverable 4 · states", "Long lists, an empty deck, a link that no longer opens",
                       "<b>Long:</b> the page lists all 99 with no paging or folding, as a precon does; the Decks tab shows every deck, newest first, in the same grid. "
                       "<b>Empty:</b> a draft with only its commander gets the app’s dashed box under the Commander group; the own band and the list note leave, "
                       "since there is nothing to count. <b>Gone:</b> hidden, deleted, or no longer friends, the link is the app’s 404.")
            + frames(frame("<b>The deck</b> · 1300 · all 99", long_, "Commander, then Creatures 23, Planeswalkers 2, Instants 9, Sorceries 6, Enchantments 4, "
                           "Artifacts 19, Lands 36 (27 basics on the dashed line)."),
                     frame("<b>Decks tab</b> · 1300 · eight decks", longtab, "Three across, newest first, one press each. Name, line, card count."))
            + frames(frame("<b>Empty</b> · 390 · a draft", emp, "Only when Colin includes drafts in Settings (off by default). Zimone is drafted with no cards yet; the count reads 0 cards."),
                     frame("<b>Empty</b> · 1300", empd, "Same box at 1300."),
                     frame("<b>No decks to see</b> · 390", nonep, "The shipped empty state, body reworded (it promised a status). Colin with no decks and Colin with “Friends can see my decks” off look the same."),
                     frame("<b>No longer opens</b> · 390", nf, "The shipped not-found page, unchanged. Nothing tells a hidden deck from a deleted one.")))
    return doc("Friend deck · states", body, 2840)


# ============================================================================ Tiles
def tiles():
    sliver = ("Sliver Overlord", "Sliver Overlord", "crop-giada.jpg", "Complete", 99, 0, "W")
    jaws = ("Jaws, Relentless Predator", "Jaws, Relentless Predator", "ghalta.jpg", "Complete", 99, 0, "G")
    o1 = F.old_tile(("Giada", "Giada, Font of Hope", "crop-giada.jpg", "Building", 71, 0, "W"))
    o2 = F.old_tile(("Ghalta, Primal Hunger", "Ghalta, Primal Hunger", "crop-ghalta.jpg", "Complete", 99, 0, "G"), src="ghalta.jpg")
    before = (F.friend_head("decks") + '<p class="gl">View only. Colin’s committed decks and drafts, newest first.</p>'
              f'<div class="dtiles" style="position:relative"><span class="bad" style="right:8px;top:8px">head cut off</span>{o1}'
              f'<div style="position:relative"><span class="bad" style="right:8px;top:8px">card frame in the band</span>{o2}</div></div></div>')
    bp = phone(before, "Friends", badges=B, h=844)
    after = phone(F.decks_tab([F.COLIN[2], F.COLIN[1]], counts={"spares": 6, "wish": 12, "decks": 4}), "Friends", badges=B, h=844)
    ad = desk(F.decks_tab(F.COLIN[:3], True, counts={"spares": 6, "wish": 12, "decks": 4}), "Friends", badges=B)
    # the commander line rule
    ex = [("Thopter Factory", "Sai, Master Thopterist", "crop-sai.jpg", "To buy", 99, 8, "U"),
          ("Ghalta, Primal Hunger", "Ghalta, Primal Hunger", "crop-ghalta.jpg", "Complete", 99, 0, "G"),
          ("Giada", "Giada, Font of Hope", "crop-giada.jpg", "Building", 71, 0, "W"),
          ("Rootha Spells", "Rootha, Mastering the Moment", "crop-rootha.jpg", "Building", 64, 0, "UR")]
    rule = ('<div class="dts four" style="width:1240px">' + "".join(F.deck_tile(d) for d in ex) + "</div>")
    tbl = ('<table class="tbl" style="max-width:1240px"><tr><th>Deck name</th><th>Commander</th><th>The line under the name</th><th>Why</th></tr>'
           '<tr><td>Thopter Factory</td><td>Sai, Master Thopterist</td><td><b>Sai, Master Thopterist · Blue</b></td><td>The name says nothing about the commander.</td></tr>'
           '<tr><td>Ghalta, Primal Hunger</td><td>Ghalta, Primal Hunger</td><td><b>Green</b></td><td>Whole name repeated.</td></tr>'
           '<tr><td>Giada</td><td>Giada, Font of Hope</td><td><b>White</b></td><td>The part before the comma repeated.</td></tr>'
           '<tr><td>Jaws, Relentless Predator</td><td>Jaws, Relentless Predator</td><td><b>Green</b></td><td>Most of Colin’s decks.</td></tr>'
           '<tr><td>Sliver Overlord</td><td>Sliver Overlord</td><td><b>5-color</b></td><td>No comma: the whole name.</td></tr>'
           '<tr><td>Any pair</td><td>Ishai + Reyhan</td><td><b>Ishai, Ojutai Dragonspeaker + Reyhan, Last of the Abzan · Colour</b></td><td>A pair always names both.</td></tr></table>')
    body = (board_head("Deliverable 5 · the friend’s deck tile", "Keep the commander in frame",
                       "<b>Why it cuts:</b> the shipped tile is a 120px band across a full-width cell, about 3:1 on a phone and 2.3:1 at 1300, laid over an art crop that is "
                       "1.37:1. Centred, it keeps the middle 45% of the picture: Sliver Overlord’s torso. Jaws’ band shows card frame text because the image itself "
                       "carries the frame (G5). <b>The fix:</b> the friend’s tile becomes the owner’s /decks tile, read-only. Its band answers its own cell (248 at 330 "
                       "and wider, 168 under, <code>ArtWash</code> “cover”), which is within a hair of the crop’s own shape, so nothing but the crop’s edges is lost. "
                       "Faces and commanders sit in a crop’s middle two-thirds, which this keeps.")
            + frames(frame("<b>Shipped</b> · 390 · the problem", bp, "Drawn with the design folder’s art: Giada’s head leaves the band as Sliver Overlord’s does, and a band "
                           "fed the full card image shows its type line, as Jaws does."),
                     frame("<b>R2</b> · 390", after, "The /decks tile without its ⋯ and, in R2, without status, bar or to-buy figure: 248 band, the name and the line on the art, then the card count. "
                           "Giada’s whole figure is in frame."),
                     frame("<b>R2</b> · 1300", ad, "Three across, as /decks. The 4-up 120px row retires."), gap=40)
            + sec("Does the tile repeat the commander under the name?", "Only when it adds something. When the deck’s name repeats the commander, whole or up to its comma, the "
                  "line shows the colour alone, so the tile still names the deck’s colours and keeps its height. Compared after folding case and punctuation. The deck page’s "
                  "head follows the same rule.", rule + tbl))
    return doc("Friend deck tiles", body, 2290)


# ============================================================================ Hide switch
def hide():
    p_menu = phone(F.owner_phone(menu="off") + F.owner_list(), "Decks", badges=B, h=844)
    p_on = phone(F.owner_phone(hidden=True) + F.owner_list(), "Decks", badges=B, h=844)
    p_menu_on = phone(F.owner_phone(hidden=True, menu="on", mark=False) + F.owner_list(), "Decks", badges=B, h=844)
    d_menu = desk(F.owner_desk(menu="off") + F.owner_list(True), "Decks", badges=B, h=620)
    d_on = desk(F.owner_desk(hidden=True) + F.owner_list(True), "Decks", badges=B, h=620)
    dp = phone(F.decks_page(), "Decks", badges=B, h=844)
    dpm = phone(F.decks_page(menu="off").replace("Dino Stampede", "Dino Stampede", 1), "Decks", badges=B, h=844)
    dd = desk(F.decks_page(True), "Decks", badges=B)
    sp = phone(F.settings_with_decks(), "Home", badges=B, h=1500)
    spo = phone(F.settings_with_decks(master=False), "Home", badges=B, h=1500)
    sd = desk(F.settings_with_decks(True), "Home", badges=B, h=1420)
    bys = desk(F.decks_page(True, menu="on", menu_i=2, bys="Set in Settings"), "Decks", badges=B)
    body = (board_head("Deliverable 2 · Hidden from friends", "One row in the deck’s ⋯ menu",
                       "The deck menu is one component on two surfaces: the deck page header (Move, Delete) and the /decks tile (Update, Rename, Export, Move, "
                       "Delete). <b>Hidden from friends</b> joins both as a checkbox row above Delete, which stays last in <code>--danger</code>. A press ticks it, saves "
                       "and closes the menu; the header’s mark is the receipt. Off by default. R2: Settings holds the account-wide defaults (drafts and building decks hidden) "
                       "and the global switch; the row is the per-deck exception.")
            + sec("The deck page", "",
                  frames(frame("<b>Menu open</b> · 390", p_menu, "The header’s ⋯: Move, Hidden from friends, Delete. The row is the 44px phone row with the app’s checkbox at "
                               "its right end, like the pod card’s Share my spares."),
                         frame("<b>On</b> · 390", p_on, "The chips row gains <b>Hidden from friends</b> with the glyph, mono 11 <code>--fg-muted</code>. A mark, not a press: "
                               "the menu is the one control."),
                         frame("<b>Menu open, on</b> · 390", p_menu_on, "Ticked. Unticking shows the deck to friends again at once; no confirm either way."), gap=40)
                  + frames(frame("<b>Menu open</b> · 1300", d_menu, "The 186px panel and 38px rows at desktop."),
                           frame("<b>On</b> · 1300", d_on, "The same mark after the bracket chip.")))
            + sec("The owner’s /decks", "The tile’s chips row takes the glyph alone after the bracket chip: the row never wraps from the 330 floor, and it has no room for words. "
                  "The /decks key, which already explains the notice marks, gains <b>hidden from friends</b> and is drawn only while a hidden tile is shown. The glyph is the "
                  "Friends bar glyph struck through, on its 20-unit box.",
                  frames(frame("<b>/decks</b> · 390", dp, "Thopter Works is hidden: the glyph in its chips row, the key line above the tiles."),
                         frame("<b>The tile’s ⋯</b> · 390", dpm, "The tile’s own menu, with the same row."),
                         frame("<b>/decks</b> · 1300", dd, "Three across."), gap=40))
            + sec("R2 · Settings: the defaults and the global switch", "A <b>Your decks</b> section at the end of /settings, after Spares, in the page’s checkbox rows. "
                  "Saved as you change them, like the rest of the page. Drafts and building decks are hidden until you tick the second box.",
                  frames(frame("<b>/settings</b> · 390 · the default", sp, "Friends can see my decks: on. Include drafts and decks I’m building: off."),
                         frame("<b>/settings</b> · 390 · all off", spo, "With the first box off, the second dims and reads as off; friends see no decks."),
                         frame("<b>/settings</b> · 1300", sd, "The same section in the 720 column."), gap=40)
                  + frames(frame("<b>A deck Settings already hides</b> · 1300", bys, "Rootha Spells is Building, so the default hides it. Its ⋯ row is ticked and locked "
                                 "with “Set in Settings ›” under it; the press opens /settings. No glyph on the tile: the glyph marks a deck hidden on its own."))))
    return doc("Hidden from friends", body, 2760)


# ============================================================================ Privacy line, absence
PRIV = {"default": "Friends can open your full decks and see their lists. Change this in Settings.",
        "all": "Friends can open all your decks and see their lists. Change this in Settings.",
        "none": "Friends can’t see your decks. Change this in Settings."}
NEW_PRIV = PRIV["default"]


def friends_head(desk=False, line=None):
    line = (line or NEW_PRIV).replace("Settings.", "<u>Settings</u>.")
    h = P.friends_page(desk, waiting=False)
    return h.replace("<u>Change</u></p>", f'<u>Change</u></p><p class="pv new" style="margin-top:6px;font:11px/1.5 IBM Plex Mono;color:var(--fg-faint)">{line}</p>', 1)


def privacy():
    fp = phone(friends_head(), "Friends", badges=B, h=760)
    fd = desk(friends_head(True), "Friends", badges=B, h=560)
    fpa = phone(friends_head(line=PRIV["all"]), "Friends", badges=B, h=760)
    fpn = phone(friends_head(line=PRIV["none"]), "Friends", badges=B, h=760)
    before = phone(F.decks_tab(F.COLIN, counts={"spares": 6, "wish": 12, "decks": 4}), "Friends", badges=B)
    after = phone(F.decks_tab([F.COLIN[0], F.COLIN[1], F.COLIN[3]], counts={"spares": 6, "wish": 12, "decks": 3}), "Friends", badges=B)
    tbl = ('<table class="tbl" style="max-width:1100px"><tr><th>Where</th><th>Today</th><th>R2</th></tr>'
           '<tr><td>/friends, under the name line · the default</td><td>Friends see your deck names, commanders and statuses, never the lists.</td><td><b>' + PRIV["default"] + '</b></td></tr>'
           '<tr><td>… with drafts and building decks included</td><td>(none)</td><td><b>' + PRIV["all"] + '</b></td></tr>'
           '<tr><td>… with Friends can see my decks off</td><td>(none)</td><td><b>' + PRIV["none"] + '</b></td></tr>'
           '<tr><td>A friend’s Decks tab, empty, the body</td><td>A deck Colin builds shows here, as a name, a commander and a status.</td><td><b>A deck Colin shares shows here, with its whole list.</b></td></tr>'
           '<tr><td>A friend’s Decks tab, the line</td><td>View only. Colin’s committed decks and drafts, newest first.</td><td><b>' + F.DECKS_LINE + '</b></td></tr>'
           '<tr><td>About, the line’s key (#2196)</td><td>Friends see your deck names, commanders and statuses, never the lists.</td><td><b>' + NEW_PRIV + '</b></td></tr></table>')
    body = (board_head("Deliverable 3 · the privacy line, and what a friend sees", "The line tells the truth again",
                       "The /friends line was true while friends saw names only. It now says what they see, follows the two Settings boxes, and points at Settings (the word is the link). The same sentence replaces "
                       "the About key that #2196 carries. A hidden deck is <b>simply absent</b> for friends, confirmed: the tile goes, the Decks count drops, and nothing "
                       "on Colin’s side says a deck is hidden.")
            + frames(frame("<b>/friends</b> · 390", fp, "In the place #2186 built: mono 11 <code>--fg-faint</code> under the name line, leaving while the name is edited."),
                     frame("<b>/friends</b> · 390 · drafts included", fpa, "When the second Settings box is ticked."),
                     frame("<b>/friends</b> · 390 · decks off", fpn, "When Friends can see my decks is off."),
                     frame("<b>/friends</b> · 1300", fd, "Same place at 1300."), gap=40)
            + sec("Strings", "", tbl)
            + sec("When Colin hides a deck", "Seen from your side. Colin hides Giada.",
                  frames(frame("<b>Before</b> · 390", before, "Four decks."),
                         frame("<b>After</b> · 390", after, "Three decks, the count reads 3, and the grid closes up. No gap, no “1 hidden”, no toast."), gap=40)))
    return doc("Privacy line", body, 2700)


# ============================================================================ Carry-overs
def carry():
    I = P.ITEMS()
    ago = dict(I["match"], stamp="just now")
    seen = dict(I["match2"], unseen=False, stamp="3d ago")
    noface = dict(I["match"], title="Peter has a spare Lathliss, Dragon Queen", detail="It’s on your wishlist. Peter shares spares with Thursday pod.",
                  vis=("card", "lathliss.jpg", None), stamp="2h ago", act='<span class="lnk">See Peter’s spares ›</span>')
    noart = dict(I["match"], title="Max has a spare Arcane Signet", detail="It’s on your wishlist. Max shares spares with Cube night.",
                 vis=("card", "sai.jpg", "face-ghalta.jpg"), stamp="5h ago", act='<span class="lnk">See Max’s spares ›</span>')

    def fi(it, desk=False, seen_=False, ini=None, grad=None):
        h = (P.fitem_d if desk else P.fitem)(it, seen=seen_)
        h = h.replace("<small>", '<small class="ff">', 1).replace('class="kd"', 'class="kd ff"', 1)
        if ini:
            h = h.replace('<span class="vis">', '<span class="vis">', 1) + ""
            h = h.replace('</span><div class="bd">', f'<span class="fa ini new">{ini}</span></span><div class="bd">', 1)
        if grad:
            import re
            h = re.sub(r'<img class="cardimg"[^>]*>', f'<span class="gcard new" style="background:{grad}"></span>', h, count=1)
        return h

    grad = "linear-gradient(150deg, #b3a488, #726755 58%, #453e31)"

    def wait(desk=False):
        rows = (fi(ago, desk).replace("just now", '<span class="mk-o" style="border-radius:3px">just now</span>', 1)
                + fi(seen, desk, seen_=True)
                + fi(noface, desk, ini="P")
                + fi(noart, desk, grad=grad))
        return (f'<div class="fp"><section class="sec" style="margin-top:6px"><div class="sech w">Waiting on you · 4</div><div class="fd">{rows}</div></section></div>')

    wp = phone(wait(), "Friends", badges={"Home": 2, "Friends": 2}, h=900)
    wd = desk(wait(True), "Friends", badges={"Home": 2, "Friends": 2}, h=640)
    combo = dict(I["combo"], detail="You added Demonic Consultation. Neither is in a deck yet.")
    feed_row = P.fitem(combo).replace("You added Demonic Consultation.", '<span class="mk-o" style="border-radius:3px">You added Demonic Consultation.</span>', 1)
    fr = phone(f'<div class="hb"><section class="blk"><h2 class="sh">What’s new <em>· 1 new</em><span class="r">Choose what shows <i>›</i></span></h2>'
               f'<div class="fd">{P.fitem(I["price"])}{feed_row}</div></section></div>', "Home", badges={"Home": 1}, h=520)
    sw = ('<div class="note" style="max-width:1100px"><h4>The ink, re-measured on <code>--surface-inset</code> (#1B1712)</h4>'
          '<span class="swatch"><i style="color:#6E6654">5h</i><code>--fg-locked</code> #6E6654 · about 3.1:1, under the 4.5:1 small text needs</span><br><br>'
          '<span class="swatch"><i style="color:#948B78">5h</i><code>--fg-faint</code> #948B78 · about 5.3:1, as built</span><br><br>'
          'The unseen diamond is what marks a new row; the kind and the time no longer change ink between seen and unseen. Same in all six themes, since each '
          'theme’s <code>--fg-faint</code> is set to clear 4.5:1 on its own surfaces.</div>')
    body = (board_head("Calls carried over from prompt 13", "Waiting on you’s small type, and the combo line",
                       "Two calls that #2196 didn’t carry. <b>Waiting on you (#2193):</b> the time and a seen row’s kind in <code>--fg-faint</code> are ratified; "
                       "<b>under an hour reads “just now”</b> (the one change: <code>refreshCopy.home.elapsed.hours(0)</code>, so Home’s resume rows and the feed "
                       "get it too); a friend with no commander keeps the initials tile as built; a card with no art draws its <b>identity gradient</b> at card shape, the "
                       "collection grid’s rule (a flat plate means loading, the gradient means no art). <b>Home feed (#2192):</b> “You added X.” is ratified.")
            + frames(frame("<b>Waiting on you</b> · 390", wp, "Top to bottom: under an hour, a seen row, a friend with no commander (initials), a card with no art (colourless gradient)."),
                     frame("<b>Waiting on you</b> · 1300", wd, "Same four rows at 1300."), gap=40)
            + frames(frame("<b>Home · What’s new</b> · 390", fr, "The combo row as built: source-neutral, since a hand add or Mark bought completes a pair as an upload does."))
            + sw)
    return doc("Carry-overs", body, 1840)


BOARDS = [("Main", main, "Main · the round, calls, gaps"),
          ("Friend-Deck", friend_deck, "1 · A friend’s deck, opened"),
          ("States", states, "4 · Long lists, empty, gone"),
          ("Tiles", tiles, "5 · The friend’s deck tile"),
          ("Hide-Switch", hide, "2 · Hidden from friends"),
          ("Privacy", privacy, "3 · The privacy line and absence"),
          ("Carry-Overs", carry, "Carried over from prompt 13")]
