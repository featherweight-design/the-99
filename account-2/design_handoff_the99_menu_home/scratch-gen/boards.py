"""The boards. Each returns a whole .dc.html."""
import kit, parts as P
from kit import doc, board_head, frame, frames, phone, desk, tabbar, rail, OLD, NEW, nav_icon, ico

FOLD = '<div class="fold" style="top:770px"></div>'
B_HOME = {"Home": 3}
B_BOTH = {"Home": 3, "Friends": 1}


def ph(inner, active="Home", badges=None, fold=True, **kw):
    return phone(inner, active, badges=badges, over=FOLD if fold else "", **kw)


# ================================================================ Main
CALLS = [
    ("1", "Five slots, Friends last", "Home, Collection, Commanders, Decks, <b>Friends</b>. Discover leaves the bar for Commanders’ strip; Friends takes the fifth slot with a new glyph drawn on the same 20-unit box and 1.5 stroke. Decks keeps its place beside Commanders; Friends sits at the edge as the social door. Switch off (<code>SOCIAL_FRIENDS_ENABLED</code>): four slots."),
    ("2", "Friends never locks", "Friends needs no cards (“Any time, cards or not”), so the first-run lock holds <b>Commanders and Decks</b> only; Collection stays open as today. The phone bracket spans slots 3–4; the rail’s well holds two."),
    ("3", "Settings replaces the Friends row", "The account menu keeps the avatar, the credit chip and the theme picker. <b>Friends</b> leaves it (now in the bar) and <b>Settings</b> takes its place, so the menu has the same number of rows."),
    ("4", "Commanders = one place, three tabs", "The Collection strip, reused: <b>For you · Discover · Help me choose</b>. Routes <code>/commanders</code>, <code>/commanders/discover</code>, <code>/commanders/choose</code>; the old <code>/discover</code> and <code>/decks/new/choose</code> redirect. Each tab keeps its own title and line under the strip, as Sets does. The Discover door “Not sure what you want? Help me choose” and the M12 moment retire: the tab is the door. New deck’s “Not sure what to build?” card stays and lands on the tab."),
    ("5", "Home: a lead story, then the day", "Recommended <b>B</b>: the newest thing that needs you is drawn big at the top (card art, a tilt, the friend’s face), then where you left off, then <b>What’s new</b>, then Friends and Commitments. Ready to build leaves Home (its job is For you’s). A is drawn beside it: no lead, the feed sits under the decks."),
    ("6", "One feed item, six kinds", "Every kind is the same row: card image at card shape (46×64), a mono kicker naming the kind, one title, one line, one press. Combos show the shipped two-card-combo mark (the collection key’s ∞) because no single card is the news. Unseen items carry the accent diamond; a visit to Home marks them seen."),
    ("7", "Opt-in, inline once", "Every kind starts off. Until one is on, What’s new <b>is</b> the opt-in: the six checkboxes inline on Home, one Show these. After that the switches live in Settings only, and the feed head’s “Choose what shows ›” goes there."),
    ("8", "The badge", "In-app only: a count on the <b>Home</b> slot (unseen feed items) and on <b>Friends</b> (things waiting on your answer). The Home count clears when Home is seen; the Friends count clears when you answer. Accent pill, top-right of the glyph, clear of the pending pip at the slot’s foot."),
    ("9", "Friends leads with you", "<b>Waiting on you</b> heads /friends (spare requests, new trade matches) as the same feed rows, then Tonight’s table, Friends and Pods as shipped. A friend’s page takes the Collection strip: <b>Spares · Wishlist · Decks</b>."),
    ("10", "Settings: one page", "<code>/settings</code>, under the account menu: <b>What’s new on Home</b> (six checkboxes) and <b>Spares</b> (the threshold stepper, who sees them, and Kept back: search to keep a card back, shipped collection rows with ✕ to let it go again). Pod sharing stays on each pod; Settings points there and does not copy the switch."),
]
GAPS = [
    ("G1", "Feed store", "A per-account <code>feed_items</code> table (kind, subject ids, created, seen_at) written by the jobs that already know each event: set import, precon import, the price job, the spares read, the collection write (combos). Read on Home per request, never in the cached payload."),
    ("G2", "Price-drop rule", "Placeholder: the cheapest printing falls 20% or $2 below the price when you wishlisted it, at most once a week per card."),
    ("G3", "Spare threshold", "<code>spare_min</code> (default 1 = today’s behaviour) and <code>spare_keep</code> rows filter the spares read in one place (<code>lib/social/spares.ts</code>), so the stand-ins modal, a friend’s page and the feed agree."),
    ("G4", "Friends see decks", "A friend’s Decks tab needs a friends-only read of your deck list (name, commander, status, count; never the list). New privacy line on Friends: placeholder copy."),
    ("G5", "Spare request", "Ask, Yes / No and the 14-day expiry are the next round. Drawn here only where they land (the blue <b>later round</b> outlines)."),
    ("G6", "Arrivals banner", "New precons move into the feed, so the arrivals banner’s precon half retires; About’s line stays on Home as shipped. Announced (not yet out) precons stay on /precons."),
]


def main_board():
    calls = "".join(f'<div class="note"><h4>{n} · {t}</h4>{b}</div>' for n, t, b in CALLS)
    gaps = "".join(f'<tr><td><b>{g}</b></td><td><b>{t}</b></td><td>{b}</td></tr>' for g, t, b in GAPS)
    before = tabbar("Home", OLD)
    after = tabbar("Home", NEW, B_BOTH)
    strip = (f'<div class="frames" style="gap:28px">{frame("<b>Today</b> · tab bar", f"<div style=&quot;width:390px&quot;>{before}</div>")}'
             f'{frame("<b>R1</b> · tab bar", f"<div style=&quot;width:390px&quot; class=&quot;new&quot;>{after}</div>")}</div>').replace("&quot;", '"')
    body = (board_head("Menu and Home · round 1 · 2026-10-22", "One Commanders, Friends in the bar, a new Home",
                       "Three changes drawn together, over the shipped pages in Low Sun. On tall phone frames the dashed blue line is the fold (844 less the tab bar). <b>Orange dashed outlines are new or changed; blue “later round” outlines are where the spare-request flow lands.</b> "
                       "Copy is placeholder for /copy-review. Fixtures: you are Sam; friends Colin, Peter, Max and Chris. Boards: Menu · Commanders · Home directions · Home states · Feed kinds · Friends · Settings.")
            + strip
            + f'<div class="notes">{calls}</div>'
            + f'<div class="note" style="max-width:1500px"><h4>Gaps for engineering</h4><table class="tbl"><tr><th>#</th><th>What</th><th>Note</th></tr>{gaps}</table></div>')
    return doc("Menu and Home · R1", body, 1612)


# ================================================================ Menu
def menu_board():
    def bar(label, html, cap):
        return frame(label, f'<div style="width:390px">{html}</div>', cap)
    bars = frames(
        bar("<b>Bar</b> · new", tabbar("Home", NEW), "Five slots. Discover is gone from the bar; Friends is fifth."),
        bar("<b>Bar</b> · badges", tabbar("Decks", NEW, B_BOTH), "Home: 3 unseen in What’s new. Friends: 1 waiting on your answer. Counts cap at 9+."),
        bar("<b>Bar</b> · first run", tabbar("Home", NEW, locked=["Commanders", "Decks"]), "The lock holds Commanders and Decks. Collection and Friends stay open."),
        bar("<b>Bar</b> · Friends switch off", tabbar("Home", ["Home", "Collection", "Commanders", "Decks"]), "Four slots, each wider. Same as today less Discover."),
        gap=28)
    glyph = ('<div style="display:flex;gap:28px;align-items:center">'
             + "".join(f'<div style="display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--fg)">'
                       f'<span style="width:96px;height:96px;border-radius:14px;border:1px solid var(--border-strong);background:var(--surface-rail);display:flex;align-items:center;justify-content:center">{ico(kit.NAV[n], 72, 1.5)}</span>'
                       f'<span class="m" style="font-size:10px;color:var(--fg-faint)">{n}</span></div>' for n in NEW)
             + '</div>')
    glyphs = frame("<b>Glyphs</b> · at 72px", glyph, "Friends is new: two seats, the near one whole and the far one behind, on the shipped 20-unit viewBox at 1.5 stroke, round caps. The other four are unchanged; Discover’s glyph retires with its slot.")
    home_bg = P.home("normal", False)
    sheet = frame("<b>Account menu</b> · 390", phone(home_bg, "Home", h=844, badges=B_HOME, over=P.account_sheet(show_gone=False), menu=True),
                  "Avatar, credits and theme stay. <b>Settings</b> takes the row Friends held; Friends is in the bar now.")
    sheet0 = frame("<b>Account menu</b> · today vs R1", '<div class="ph" style="height:auto;padding:0 20px 20px;position:relative">'
                   '<div class="thl" style="margin-top:20px">Rows, today</div>' + P.menu_rows(show_gone=True) + '</div>',
                   "Struck: Friends leaves. Orange: Settings arrives in the same place.")
    pop_main = P.home("normal", True)
    pop = frame("<b>Account menu</b> · 1300 · popover", desk(pop_main, "Home", badges=B_BOTH, menu=True, over=P.account_pop(), h=780),
                "The shipped 300px popover over the rail. Same rows as the sheet.")
    rails = frames(
        frame("<b>Rail</b> · pointer · 62", f'<div style="height:560px;width:170px;display:flex;position:relative">{rail("Commanders", NEW, B_BOTH)}'
              '<span class="rtag" style="left:70px;top:292px">Friends</span></div>', "Hover label as shipped (desktop nav labels R2)."),
        frame("<b>Rail</b> · touch · 88", f'<div style="height:560px;width:170px;display:flex">{rail("Commanders", NEW, B_BOTH, touch=True)}</div>', "Labelled slots as shipped."),
        frame("<b>Rail</b> · first run", f'<div style="height:560px;width:170px;display:flex">{rail("Home", NEW, locked=["Commanders", "Decks"])}</div>', "The well holds two. Friends sits above it, live."),
        frame("<b>Rail</b> · first run · touch", f'<div style="height:560px;width:170px;display:flex">{rail("Home", NEW, locked=["Commanders", "Decks"], touch=True)}</div>', ""),
        gap=40)
    body = (board_head("Menu", "Five slots, Friends in the bar, Settings in the account menu",
                       "Drawn from <code>nav.tsx</code>, <code>nav-icons.tsx</code> and <code>account-menu.tsx</code>. Badges: an accent count at the glyph’s top-right; the pending pip keeps the slot’s foot.")
            + bars + frames(glyphs, rails, gap=60) + frames(sheet, sheet0, pop, gap=44))
    return doc("Menu · R1", body, 2380)


# ================================================================ Commanders
def cmd_board():
    def pg(tab):
        return phone(P.place_strip(tab) + P.cmd_page(tab), "Commanders", h=844)
    phones = frames(
        frame("<b>For you</b> · 390", pg("you"), "Today’s ranked page under the strip. Its title says which tab; the line under it is shipped."),
        frame("<b>Discover</b> · 390", pg("disc"), "The shipped Discover lane. Its “Not sure what you want? Help me choose →” door retires: the tab is the door."),
        frame("<b>Help me choose</b> · 390", pg("hmc"), "The shipped intake, unchanged. Its “‹ New deck” back link goes; New deck’s card still lands here."),
    )
    def dpg(tab, h):
        return desk(P.cmd_place_head() + P.place_strip(tab) + P.cmd_page(tab, True), "Commanders", badges=B_HOME, h=h)
    desks = frames(frame("<b>For you</b> · 1300", dpg("you", 820), "Title and count line as Collection’s head; the strip under it; then the shipped rack and list."))
    desks2 = frames(frame("<b>Help me choose</b> · 1300", dpg("hmc", 760), "The intake at its shipped 720 column, under the same head."))
    body = (board_head("Commanders", "For you · Discover · Help me choose",
                       "The Collection place strip (<code>collection-place-head.tsx</code>), reused: links, not ARIA tabs; Back is a route change; the strip lives in a layout so a tab press does not remount it. "
                       "Phone: no page title above the strip (as Collection); desktop: “Commanders” in Cinzel 30 with a mono count line, as Collection.")
            + phones + desks + desks2)
    return doc("Commanders · R1", body, 1430)


# ================================================================ Home: directions
def dir_board():
    a_ph = ph(P.home("normal", False, "A"), badges=B_HOME)
    b_ph = ph(P.home("normal", False, "B"), badges=B_HOME)
    a_dk = desk(P.home("normal", True, "A"), badges=B_HOME)
    b_dk = desk(P.home("normal", True, "B"), badges=B_HOME)
    body = (board_head("Home · two directions", "A normal day: the lead story (B) or the quiet list (A)",
                       "Both keep the shipped header, the welcome strip, Pick up where you left off, Commitments and Friends, and cut Ready to build. "
                       "<b>B (recommended)</b> draws the newest thing that needs you big, with its card at a tilt over its own art: Home gets its picture back without ranking commanders. "
                       "<b>A</b> keeps every item the same size, under your decks. The phone shows two decks and All 23 decks (four on desktop, as shipped).", tag="Pick one")
            + frames(frame("<b>B</b> · 390 · recommended", b_ph, "Lead: Colin’s spare Ghalta, on your wishlist. Under it the decks, then the rest of What’s new."),
                     frame("<b>A</b> · 390", a_ph, "No lead. What’s new sits under the decks with the trade match first."))
            + frames(frame("<b>B</b> · 1300", b_dk, "Lead spans the main column; Commitments and Friends keep the 316 column as shipped."))
            + frames(frame("<b>A</b> · 1300", a_dk, "")))
    return doc("Home directions · R1", body, 1430)


# ================================================================ Home: states
def states_board():
    fr_ph = phone(P.first_run(False), "Home", locked=["Commanders", "Decks"], over=FOLD)
    st = [("<b>First run</b> · 390", fr_ph, "The shipped checklist, plus one row under Add your friends: <b>Choose your news</b>, to Settings. No feed before cards: nothing in it would be about you yet."),
          ("<b>A normal day</b> · 390", ph(P.home("normal", False), badges=B_HOME), "B: lead, decks, What’s new (3 more), Friends, Commitments."),
          ("<b>A busy feed</b> · 390", ph(P.home("busy", False), badges={"Home": 8, "Friends": 2}), "Waiting on you leads (Peter’s request). What’s new shows five, grouped Today / Earlier this week, then <b>Show all 9</b>. The welcome strip is gone (credits used). Tonight’s table heads Friends, as shipped."),
          ("<b>Empty: nothing new</b> · 390", ph(P.home("quiet", False)), "Kinds are on, nothing has happened. One quiet line naming what you hear about. No lead, no badge."),
          ("<b>Empty: nothing chosen</b> · 390", ph(P.home("setup", False)), "Every kind starts off. Until one is on, What’s new is its own opt-in, inline. After Show these, the switches live in Settings.")]
    phones = frames(*[frame(l, b, c) for l, b, c in st], gap=40)
    dfr = desk(P.first_run(True), locked=["Commanders", "Decks"])
    dbusy = desk(P.home("busy", True), badges={"Home": 8, "Friends": 2})
    dsetup = desk(P.home("setup", True))
    body = (board_head("Home · states", "First run, a normal day, a busy feed, an empty feed",
                       "Direction B throughout. The dashed blue line is the phone’s fold (844 less the tab bar).")
            + phones
            + frames(frame("<b>A busy feed</b> · 1300", dbusy, ""), frame("<b>Empty: nothing chosen</b> · 1300", dsetup, "Two columns of checkboxes at this width."), gap=60)
            + frames(frame("<b>First run</b> · 1300", dfr, "The shipped first-run page; the new row sits last.")))
    return doc("Home states · R1", body, 2804)


# ================================================================ Feed kinds
def kinds_board():
    I = P.ITEMS()
    order = ["set", "precon", "price", "match", "ask", "combo"]
    ph_list = '<div class="fd" style="width:358px">' + "".join(P.fitem(I[k]) for k in order) + "</div>"
    dk_list = '<div class="dk" style="padding:20px 26px;display:block;width:900px"><div class="fd">' + "".join(P.fitem_d(I[k]) for k in order) + "</div></div>"
    seen = '<div class="fd" style="width:358px">' + P.fitem(I["match"]) + P.fitem(I["match"], seen=True) + "</div>"
    rows = [("New sets", "A set releases (set import job).", "One card from it at card shape", "See the set ›", "the set page (/collection/sets/[code])"),
            ("New precons", "A precon is imported as released.", "Its commander", "Open in Precons ›", "/precons, that precon open"),
            ("Price drops on your wishlist", "G2’s rule on a wishlisted card.", "The card", "Open the card ›", "the shipped card detail"),
            ("Trade matches", "A friend’s spare appears for a card on your wishlist (spares read).", "The card, the friend’s face on its corner", "See Colin’s spares ›", "the friend’s page, Spares tab"),
            ("Friends asking for your spares", "A friend asks (next round’s flow).", "Your card, the friend’s face", "Yes · No · days left", "answered in place; also under Waiting on you"),
            ("Combos you can make", "A collection write completes a pair (combo tables).", "The shipped two-card-combo mark", "See the combo ›", "the first card’s detail, combo block open")]
    tbl = ('<table class="tbl"><tr><th>Kind</th><th>Written when</th><th>Picture</th><th>Press</th><th>Lands on</th></tr>'
           + "".join(f"<tr><td><b>{a}</b></td><td>{b}</td><td>{c}</td><td>{d}</td><td>{e}</td></tr>" for a, b, c, d, e in rows) + "</table>")
    rules = ('<div class="note" style="max-width:900px"><h4>Rules</h4><ul>'
             '<li><b>One press per item.</b> The whole row opens its target; the link names where. Spare requests are the one item with two buttons (next round).</li>'
             '<li><b>Unseen</b> = the accent diamond before the kicker. Seen on the first Home visit after it arrives (on the Friends page, when it is answered).</li>'
             '<li><b>Order:</b> waiting on you first, then newest. Fourteen days kept; five shown, then Show all N.</li>'
             '<li><b>Lead story</b> (B): the first unseen item by waiting on you › trade match › combo › price drop › precon › set. Once seen it drops into the list.</li>'
             '<li><b>Grouping:</b> “Today” and “Earlier this week” labels only once the list holds both.</li>'
             '<li><b>Kinds off</b> in Settings are not written for you at all (no backfill when turned on).</li></ul></div>')
    body = (board_head("What’s new · the item", "Six kinds, one row",
                       "Each kind is opt-in, one checkbox per kind in Settings. Cards at card shape (46×64, 63:88), never the art crop; a friend’s face sits on the card’s corner when a friend is the news.")
            + frames(frame("<b>All six</b> · 390", ph_list, ""), frame("<b>All six</b> · 1300 main column", dk_list, "The press moves to its own column at the right."), gap=50)
            + frames(frame("<b>Unseen / seen</b>", seen, "Seen: no diamond, the kicker steps down to --fg-locked."), rules, gap=50)
            + f'<div style="max-width:1400px">{tbl}</div>')
    return doc("Feed kinds · R1", body, 1500)


# ================================================================ Friends
def friends_board():
    f_ph = ph(P.friends_page(False), "Friends", badges={"Home": 3, "Friends": 1})
    c_ph = ph(P.friend_page("spares", False), "Friends", badges={"Home": 3, "Friends": 1})
    d_ph = ph(P.friend_page("decks", False), "Friends", badges={"Home": 3, "Friends": 1})
    f_dk = desk(P.friends_page(True), "Friends", badges={"Home": 3, "Friends": 1})
    c_dk = desk(P.friend_page("spares", True), "Friends", badges={"Home": 3, "Friends": 1})
    d_dk = desk(P.friend_page("decks", True), "Friends", badges={"Home": 3, "Friends": 1})
    body = (board_head("Friends", "Waiting on you first, then the table, friends and pods",
                       "The shipped /friends column (720 on desktop) with one new section on top. A friend’s page gains the Collection strip: Spares (first: what you can trade for), Wishlist (shipped), Decks (new, view only).")
            + frames(frame("<b>/friends</b> · 390", f_ph, "Waiting on you: Peter’s request (answered here or on Home), Colin’s trade match. Empty: the section is absent."),
                     frame("<b>Colin</b> · Spares · 390", c_ph, "Full cards with the spare count; cards on your wishlist first and marked with the wishlist bookmark."),
                     frame("<b>Colin</b> · Decks · 390", d_ph, "Deck tiles, view only: art, name, commander, status, count. No list inside (G4)."))
            + frames(frame("<b>/friends</b> · 1300", f_dk, ""))
            + frames(frame("<b>Colin</b> · Spares · 1300", c_dk, ""))
            + frames(frame("<b>Colin</b> · Decks · 1300", d_dk, "")))
    return doc("Friends · R1", body, 1430)


# ================================================================ Settings
def settings_board():
    s_ph = phone(P.settings_page(False), "Home", over=FOLD)
    s_dk = desk(P.settings_page(True), "Home")
    body = (board_head("Settings", "One page, under the account menu",
                       "<code>/settings</code>. Checkboxes save as they change (no Save button), with the shipped toast on a failed write. Theme stays in the account menu. "
                       "Spares: the threshold is a stepper (1 to 9, default 1 = today); Kept back adds by search over your spare cards and lists them as the shipped collection rows, each with a ✕ to let it go again.")
            + frames(frame("<b>Settings</b> · 390", s_ph, "No tab slot is lit: Settings is reached from the avatar."),
                     frame("<b>Settings</b> · 1300", s_dk, "The 720 column, as /friends.")))
    return doc("Settings · R1", body, 1880)


BOARDS = [("Main", main_board, "R1 · the three changes, calls, gaps"),
          ("Menu", menu_board, "Menu · bar, rail, glyph, account menu"),
          ("Commanders", cmd_board, "Commanders · the sub-page strip"),
          ("Home-Directions", dir_board, "Home · direction B (lead story) or A"),
          ("Home-States", states_board, "Home · first run, normal, busy, empty"),
          ("Feed-Kinds", kinds_board, "What’s new · the six kinds"),
          ("Friends", friends_board, "Friends · waiting on you, a friend’s page"),
          ("Settings", settings_board, "Settings · news opt-ins and spares")]
