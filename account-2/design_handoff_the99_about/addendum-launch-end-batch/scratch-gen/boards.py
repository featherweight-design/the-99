import json, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
import la
from la import board_head, frame, window, six, ref_desk, ref_phone, doc, S

NB = json.load(open(f"{S}/gen/neighbors.json"))


def row(eid, new=False, title=None, first=None):
    t, f = NB.get(eid, (title, first))
    return (title or t, first or f, new)


NEW_FIRST = {
    "getting-help": ("Getting help on any screen", "Every screen has a ? with the About entries for what you’re looking at."),
    "about-rebuilt": ("About, rebuilt", "About used to be one long page."),
    "rule-zero": ("Checking tonight’s table", "The Rule 0 check puts tonight’s decks side by side before anyone shuffles."),
    "invites": ("Inviting someone new", "The 99 is invite-only, so new players arrive through the people already in it."),
    "card-search": ("Looking up any card", "Saw a card across the table, or in a friend’s deck?"),
    "card-scan": ("Scanning your cards", "Have a stack of cards in front of you?"),
}


def nrow(eid):
    t, f = NEW_FIRST[eid]
    return (t, f, True)


COLL = lambda open_id: [row("browse"), row("collection-add"), "OPEN" if open_id == "card-scan" else nrow("card-scan"),
                        row("start-without-a-collection"), row("availability"), row("added-copy"),
                        "OPEN" if open_id == "card-search" else nrow("card-search"), row("remove-card"), row("card-marks"), row("combo-awareness")]

E = {
    "getting-help": dict(
        id="getting-help", title="Getting help on any screen", screen="home",
        caption="Every screen has a ? with the About entries for what you’re looking at. Open one for the short version, or read the whole entry in the Reference.\n\nWhere an entry is about a tool on the page, “Show me” scrolls to it and lights it up. Looking for something that lives on another screen? Search reads all of About from right there.\n\nAnd if you’d like the walk-through again, “Take the tour” in the account menu runs it on your own app. Six stops, about a minute.",
        keys=["The ? sits at the foot of the rail, or in the header on a phone.", "On a deck or in Collection, chips open the other tabs’ entries.",
              "On desktop, the ? works over a card’s details too.", "“Take the tour →” also sits at the top of About."],
        rows=[row("ready-to-build"), row("resume"), row("commitments"), "OPEN"]),
    "about-rebuilt": dict(
        id="about-rebuilt", title="About, rebuilt", screen="account",
        caption="About used to be one long page. Now it starts with what the app can do for you.\n\n- Tools: what each tool is for, pictured on a real screen. “Try it” takes you there and lights it up.\n- Reference: every entry, by the screen it lives on, with search and what’s new since your last visit.\n- A ? on every screen, with that screen’s entries.\n- Help me choose, waiting on Decks, Home and Commanders while you have no decks yet.\n- A one-minute tour the first time you open Home.",
        keys=["A tool that needs a deck opens one that fits.", "“How it works ›” on a tool opens its full entry.", "My note on why The 99 exists now closes the Reference."],
        rows=[row("themes"), "OPEN"]),
    "rule-zero": dict(
        id="rule-zero", title="Checking tonight’s table", screen="friends",
        caption="The Rule 0 check puts tonight’s decks side by side before anyone shuffles. One of you seats the players from a pod and picks a deck for each seat. Everyone seated sees the same table, and it waits for them on Home.\n\nEach complete deck lands on the five brackets, measured from the middle of the table. A deck a bracket or more away is flagged above or below, with what puts it there, like a two-card combo it can tutor for or one Game Changer too many. Better to know now than on turn four.\n\nFlagged? We’ll show you a few of your own decks that sit closer, and a swap shows up for everyone at the table. The bracket is read from each list, so a flag is where the conversation starts.\n\nAfter the game, log it from the table and the seats come filled in. Anyone who isn’t your friend comes in by name and commander, marked “from the table”.",
        keys=["Start one from a pod’s “Rule 0 check”, for 2 to 8 players.", "When you set the table, friends’ decks are listed. Anyone else picks their own.",
              "“Swap in” or “Change deck” changes yours. “Undo” changes it back.", "A table closes 24 hours after it’s set. Its logged games stay."],
        rows=[row("friends"), nrow("invites"), "OPEN"]),
    "invites": dict(
        id="invites", title="Inviting someone new", screen="friends",
        caption="The 99 is invite-only, so new players arrive through the people already in it. On Friends, press “Add a friend”, then “Invite someone new”. At the table, show an invite QR: they scan it, type their own email, and confirm it with a code. Or type their email here, and The 99 sends the invitation.\n\nOnce they make their account, you’re friends. Adding someone who already plays? Pick “They’re on The 99” and send a friend link: it uses no invite.",
        keys=["An invite is used only when someone makes an account. One that isn’t used within 7 days comes back.",
              "An invite QR holds one invite for its 15 minutes, and gives it back if nobody uses it.",
              "Whatever the email, you’re told “Invitation sent”, so nobody can use an invite to find out who’s on The 99.",
              "How many you have left shows under “Add a friend”. Invites are given out by The 99, not bought."],
        rows=[row("friends"), "OPEN", nrow("rule-zero")]),
    "card-search": dict(
        id="card-search", title="Looking up any card", screen="collection",
        caption="Saw a card across the table, or in a friend’s deck? Look it up by name from any page: the search icon at the top of your phone, or the field at the top of the side rail on a computer (⌘K, or Ctrl K).\n\nEach card says how many you own, which of your decks hold it, and whether it’s on your wishlist. Press one for its full details.",
        keys=["Search reads card names only, including the names printed on Secret Lair cards.", "The last 8 cards you opened from search wait in the field before you type.",
              "On a deck’s page, “Add a card” adds to that deck, in its colors. “Search all cards” finds any card.", "On a phone, the top bar comes back as soon as you scroll up a little."],
        rows=COLL("card-search")),
    "card-scan": dict(
        id="card-scan", title="Scanning your cards", screen="collection",
        caption="Have a stack of cards in front of you? Press “Add cards”, then “Scan”, and hold each card up to your camera. We suggest which card it is, and one press puts it on the list.\n\nWhen we’re not sure, you get the three closest to pick from. Then check the list, fix anything we got wrong, and one Save adds the lot.",
        keys=["Fast gives each card its first printing. Normal has you choose each printing on the list.", "The first scan downloads a card index of about 27 MB, once. After that it works offline.",
              "A card that stays in view is never added twice. A second copy takes its own press.", "Press a scanned card’s name on the list to swap it for one of the closest matches."],
        rows=COLL("card-scan")),
}

INFO = {
    "getting-help": ("E1", "Getting help on any screen", "getting-help · screen <b>home</b> (moved from account) · halo: the header <b>?</b>",
                     "The entry is about the ?, so its picture shows the ?. The ? is on every captured frame now (#2083), and on Home it sits clean in the header with nothing over it. On the account frame it is under the menu sheet’s scrim and outside the dialog the locator starts from, so it cannot be haloed there. The tour row was the other candidate: it teaches only the caption’s third paragraph and exists only with <code>FIRST_RUN_TOUR_ENABLED</code>, a switch the entry itself does not follow, so a reader with the ? and no tour would be shown a row they don’t have. Moving the entry to <b>home</b> also means Home’s ? offers it (account is never offered by a ?, only found by search). Its words are unchanged: key 1 already says “in the header on a phone”."),
    "about-rebuilt": ("E2", "About, rebuilt", "about-rebuilt · screen account · halo: the <b>About The 99</b> row, <code>reaches: true</code>",
                      "Picked as the candidate stands. The row is on the shipped frame for every reader (no switch, like the entry), and it is the way into the page the entry describes, so it is a <code>reaches</code> box. <b>Tools is not drawn as context.</b> An opened entry draws one picture, its screen’s frame; a second picture of /about would be a surface the Reference never shows. The entry already sits on the page it describes, one tab over."),
    "rule-zero": ("E3", "Checking tonight’s table", "rule-zero · screen friends · halo: the pod card’s <b>Rule 0 check</b> row",
                  "Picked as the candidate stands, on the frame recaptured with <code>RULE_ZERO_ENABLED</code> on. The row is the entry’s own way in (key 1 names it) and it sits on the fixture’s <i>About pod</i> card. <b>No screen of its own for the table.</b> A table page frame would need a capture fixture with an open table, and <code>screenForPath</code> already maps <code>/friends/table/[id]</code> to <i>friends</i>, so the ? on a table offers this entry with no new screen."),
    "invites": ("E4", "Inviting someone new", "invites · screen friends · halo: the <b>Add a friend</b> press <b>and its count line</b>",
                "The press is on the shipped frame; the count line under it is not, because the capture has invites off. One box over both, so this entry’s halo differs from the <i>friends</i> entry’s (the press alone) and points at what is new (key 4: “How many you have left shows under ‘Add a friend’”). Drawn here on today’s frame, the box covers the press; the recapture with <code>SOCIAL_INVITES_ENABLED</code> on adds the line and the box grows to take it. The entry also edits sentence 2 of the <i>friends</i> caption, gated by the reader’s <code>SOCIAL_INVITES_ENABLED</code>."),
    "card-search": ("E5", "Looking up any card", "card-search · screen <b>collection</b> · halo: the header <b>search icon</b>",
                    "<b>collection</b> carries it. The entry is chapter 01, beside the Collection entries, and in the Reference it lists under Collection · Cards next to <i>Finding a card in your Collection</i>, whose halo is the page’s own “Search your cards” field just below. The two halos side by side say the difference: the header icon searches every card, the field searches yours. The icon is on the current frames (every reader-facing switch was on for #2083’s capture), at rest."),
    "card-scan": ("E6", "Scanning your cards", "card-scan · screen collection · halo: the <b>+</b> (Add cards), <code>reaches: true</code>",
                  "No frame opens Add cards, and the locator rule already answers this case: a control behind a press is reached by the visible control that opens it (<i>Adding cards by hand</i>, <i>Starting without a collection file</i> and <i>Where a new copy goes</i> all use the same +). No new screen, no new capture. The caption’s first lines say where Scan is (“Press ‘Add cards’, then ‘Scan’”). <i>If you want the Scan press itself on the picture</i>, the alternative is a new <b>add-cards</b> screen: /collection with the sheet open at 390, a capture step with <code>CARD_SCAN_ENABLED</code> and <code>COLLECTION_EDIT_ENABLED</code> on, and entries that live in the sheet could move to it."),
}


def entry_board(eid):
    e = E[eid]
    code, title, line, why = INFO[eid]
    head = board_head(f"About launch entries · {code} · {line}", title, why)
    fr = [frame("Reference, entry open · desktop 1300 · Neon Rain", ref_desk(e)), frame("Reference, entry open · 390 · Neon Rain", ref_phone(e))]
    body = head + f'<div class="frames" style="max-width:{1300+390+44}px">' + "".join(fr) + "</div>"
    body += f'<div class="sec"><h3>The picture in all six themes</h3><p class="cap" style="margin:0;font-size:13px;color:var(--fg-muted)">Each is the shipped capture of the <code>{e["screen"]}</code> frame for that theme, windowed and haloed as <code>EntryFrame</code> draws it. The boxes do not move between themes.</p>{six(eid, 250)}</div>'
    body += extra(eid)
    return doc(f"About · {title}", body, 1300 + 390 + 44 + 112)


def extra(eid):
    if eid == "getting-help":
        return ('<div class="sec"><h3>Not picked</h3><div class="cmp">'
                f'<div>{window("kamigawa", "cand-tour", 330, label="CANDIDATE · NOT PICKED")}<p><b>Take the tour row</b> on account (the brief’s first-listed halo, as measured). It teaches the caption’s last paragraph only, and the row is drawn only with <code>FIRST_RUN_TOUR_ENABLED</code>, which the entry does not follow.</p></div>'
                '<div><p style="padding-top:6px"><b>The ? on account.</b> It is in the header behind the menu sheet’s scrim, outside the dialog the account locators start from. A halo there would light a control the reader cannot press with the menu open.</p></div></div></div>')
    if eid == "invites":
        return ('<div class="sec"><h3>The friends caption, sentence 2 (an edit, no bump)</h3><div class="note" style="max-width:1100px">'
                '<b>With <code>SOCIAL_INVITES_ENABLED</code> on for the reader:</b> Open “Friends” from your account menu, press “Add a friend”, <span class="new">pick “They’re on The 99”,</span> and send them the link, or let them scan the QR code off your screen.<br>'
                '<b>Off:</b> the shipped sentence, unchanged (Add a friend skips the chooser, so “They’re on The 99” is never named).</div></div>')
    if eid == "card-scan":
        return ('<div class="sec"><h3>Words</h3><div class="note" style="max-width:1100px">Drawn as the handoff quotes them. The brief’s Draft vs code 13 lists what is stale (the 27 MB index, Fast is now Auto, the printing step, Auto’s one press): that goes to <code>/copy-review</code>, not Design.</div></div>')
    return ""


def main_board():
    calls = ""
    for eid in ["getting-help", "about-rebuilt", "rule-zero", "invites", "card-search", "card-scan"]:
        code, title, line, why = INFO[eid]
        calls += (f'<div class="call">{window("kamigawa", eid, 330)}<div><h4>{code} · {title}</h4><span class="id">{line.replace("<b>", "").replace("</b>", "")}</span>'
                  f'<p>{why}</p></div></div>')
    loc = [
        ("getting-help", "home", "<code>header [data-help-button='header']</code>", "new: header scope (outside <code>main</code>)", "<code>HELP_PANEL_ENABLED</code> (on since #2083)"),
        ("about-rebuilt", "account", "<code>[role='dialog'] a[href='/about'], [role='menu'] a[href='/about']</code>, <code>reaches: true</code>", "dialog (as today)", "none"),
        ("rule-zero", "friends", "<code>[data-testid='pod-rule-zero']</code>", "main", "<code>RULE_ZERO_ENABLED</code> (on since #2083)"),
        ("invites", "friends", "the Add a friend press plus <code>[data-invite-count]</code> under it, one box", "main", "<code>SOCIAL_INVITES_ENABLED</code> (<b>recapture</b>)"),
        ("card-search", "collection", "<code>header button[aria-label='Search all cards']</code>", "new: header scope", "<code>CARD_SEARCH_ENABLED</code> (on in the frames)"),
        ("card-scan", "collection", "<code>[data-testid='collection-add-phone']</code>, <code>reaches: true</code>", "main (as today)", "none beyond today’s"),
    ]
    rows = "".join(f"<tr><td><code>{a}</code></td><td>{b}</td><td>{c}</td><td>{d}</td><td>{e}</td></tr>" for a, b, c, d, e in loc)
    table = ('<table class="tbl"><tr><th>Entry</th><th>Screen</th><th>Locator (suggested)</th><th>Scope</th><th>Frame needs</th></tr>' + rows + "</table>")
    c7 = ("<b>7 · Home’s banner line.</b> Not drawn. The shipped line (<code>arrivals-banner.tsx</code>, <code>ABOUT_SHEET_ENABLED</code>) already names a returning reader’s unseen entries, "
          "four in full or three and “N more”, in About’s order. With every switch on at the bump it would read: "
          "<i>6 new in About: Scanning your cards, Looking up any card, Inviting someone new, and 3 more.</i> Readers whose switches differ see fewer. Nothing new to design, unlike the v10 sheet.")
    c8 = ("<b>8 · The template’s slots.</b> Drop <code>width</code>, specimen, fixture props and phone reduction: nothing reads them, and the 390 Reference draws the same entry at full width. "
          "Replace them with what the reshape does read: <b>screen</b>, <b>locator</b> (with <code>reaches</code> and a note), and <b>capture needs</b> (the switches the frame must be shot with). "
          "Kept: id, title, route, opens, chapter and position, switch, caption with its line switches, up to four keys with their switches, <code>since</code>.")
    order = ("<b>Positions</b> (the Reference lists a screen’s entries in About’s order): <code>card-scan</code> after <code>collection-add</code>; <code>card-search</code> after <code>card-detail</code>; "
             "<code>invites</code> then <code>rule-zero</code> after <code>friends</code> (pods, then the table), before <code>opponents</code>; <code>getting-help</code> after <code>commitments</code>, so it ends Home’s list; "
             "<code>about-rebuilt</code> after <code>themes</code>. Every one <code>since: 16</code>; <code>about-rebuilt</code> is the one the bump announces.")
    gaps = [
        "G1 · The locator rule’s SCOPE gains a third exception: the shell’s phone <code>header</code>, for the ? and the search icon. Today only account and card-details leave <code>main</code>.",
        "G2 · <code>invites</code>: the frame on these boards is today’s, without the count line. The box is drawn over the press; on recapture it grows to take the line.",
        "G3 · <code>getting-help</code> on <code>home</code> changes its Reference group (Home, not Account menu) and makes Home’s ? offer it. Chapter stays 04.",
        "G4 · For the copy lane (not drawn, not rewritten): Home’s first-run line still says About is “on one page” (<code>arrivals.ts</code> <code>aboutFirstRunRest</code>), which <i>About, rebuilt</i> now contradicts.",
        "G5 · Already fixed on main: <code>screenForPath</code> maps <code>/friends/table/[id]</code> to <i>friends</i> (brief’s Draft vs code 9).",
        "G6 · Words on every board are the drafts as quoted, for <code>/copy-review</code>. Dashed outlines mark the new rows.",
    ]
    li = "<ul>" + "".join(f"<li>{g}</li>" for g in gaps) + "</ul>"
    body = (board_head("About launch entries · brief 2026-10-18 (#2072) · account 2 · 2026-10-21",
                       "Six halos, and the two template calls",
                       "Every picture is a real capture from main (<code>public/about/shots/&lt;theme&gt;/</code>, recaptured with the ?, the tour and Rule 0 on in #2083), windowed and haloed exactly as <code>EntryFrame</code> does, at 330 wide. "
                       "Boards E1 to E6 open each entry in the shipped Reference at 1300 and 390, with its picture in all six themes. Words are the drafts as quoted.")
            + '<div class="sec"><h3>The halos</h3><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px">' + calls + "</div></div>"
            + '<div class="sec"><h3>For engineering: locators and frames</h3>' + table + "</div>"
            + f'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px"><div class="note">{c7}<br><br>{c8}<br><br>{order}</div><div class="note"><b>Gaps</b>{li}</div></div>')
    return doc("About launch entries · calls", body, 1810)


BOARDS = [
    ("Main", main_board, "Main · the six halos and calls 7 and 8", 1810),
    ("E1-Getting-help", lambda: entry_board("getting-help"), "E1 · Getting help on any screen", 1846),
    ("E2-About-rebuilt", lambda: entry_board("about-rebuilt"), "E2 · About, rebuilt", 1846),
    ("E3-Rule-zero", lambda: entry_board("rule-zero"), "E3 · Checking tonight’s table", 1846),
    ("E4-Invites", lambda: entry_board("invites"), "E4 · Inviting someone new", 1846),
    ("E5-Card-search", lambda: entry_board("card-search"), "E5 · Looking up any card", 1846),
    ("E6-Card-scan", lambda: entry_board("card-scan"), "E6 · Scanning your cards", 1846),
]

if __name__ == "__main__":
    mode = sys.argv[1]
    la.MODE["blob"] = mode == "blob"
    out = f"{S}/local" if mode == "local" else f"{S}/canvas/project"
    os.makedirs(out, exist_ok=True)
    if mode == "local":
        shutil.copytree(f"{S}/art", f"{out}/art", dirs_exist_ok=True)
        shutil.copy(f"{S}/support.js", f"{out}/support.js")
    for n, fn, _, _ in BOARDS:
        open(f"{out}/{n}.dc.html", "w").write(fn())
    print("ok", mode)
