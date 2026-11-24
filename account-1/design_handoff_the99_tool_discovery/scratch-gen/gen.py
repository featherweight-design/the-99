# Finding the tools R1, R2 (account 1, 2026-11-23): writes the boards twice, for the canvas (/_blob urls from blobs.json)
# and for the repo (art/). Usage: python3 gen.py repo|canvas <out>
import json, sys, os
mode, out = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
BLOB = json.load(open(os.path.join(HERE, "blobs.json"))) if mode == "canvas" else {}
DIMS = json.load(open(os.path.join(HERE, "dims.json")))
def src(k): return BLOB[k] if mode == "canvas" else f"art/td-{k}.webp"
FONT = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&amp;family=IBM+Plex+Mono:wght@400;500&amp;family=Chakra+Petch:wght@600;700&amp;display=swap" rel="stylesheet">'
def page(title, w, h, body):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONT}
<style>
body{{margin:0}}
a{{color:#FF6FAE}}a:hover{{color:#FF9AC6}}
</style>
</helmet>
<div style="width:{w}px;min-height:{h}px;box-sizing:border-box;padding:48px 56px 64px;background:#0A0B0F;font-family:'IBM Plex Sans',sans-serif;color:#E6E8F0;display:flex;flex-direction:column;gap:28px">
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''
def head(t, p): return f'<div style="display:flex;flex-direction:column;gap:10px"><h2 style="margin:0;font:700 30px \'Chakra Petch\',sans-serif;color:#E6E8F0">{t}</h2><p style="margin:0;font-size:15px;line-height:1.6;color:#B1B6C7;max-width:1240px">{p}</p></div>'
def label(t): return f'<span style="font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.12em;text-transform:uppercase;color:#FF6FAE">{t}</span>'
def fig(k, w, cap, note):
    cw, ch = DIMS[k]; h = round(w * ch / cw); r = 28 if k.startswith("p-") else 12
    return f'''<figure style="margin:0;display:flex;flex-direction:column;gap:12px;width:{w}px;flex:none">
<img src="{src(k)}" alt="{cap}" style="width:{w}px;height:{h}px;display:block;border-radius:{r}px;border:1px solid #262A35">
<figcaption style="display:flex;flex-direction:column;gap:6px">
<p style="margin:0;font:600 15px 'IBM Plex Sans',sans-serif;color:#E6E8F0">{cap}</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#959AAD">{note}</p>
</figcaption>
</figure>'''
def ph(k, cap, note): return fig(k, 292, cap, note)
def dk(k, cap, note, w=660): return fig(k, w, cap, note)
def row(lbl, figs, gap=40): return f'<div style="display:flex;flex-direction:column;gap:14px">{label(lbl)}<div style="display:flex;gap:{gap}px;align-items:flex-start;flex-wrap:wrap">{"".join(figs)}</div></div>'
def call(n, t, body): return f'<div style="display:flex;flex-direction:column;gap:8px;padding:20px 24px;border:1px solid #262A35;border-radius:14px;background:#11131A"><p style="margin:0;font:600 17px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:#FF6FAE">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{body}</div></div>'
def ul(items): return '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">' + "".join(f"<li>{i}</li>" for i in items) + '</ul>'
def m(t): return f'<span style="font-family:\'IBM Plex Mono\',monospace;color:#E6E8F0">{t}</span>'
def q(n, t, body, rec): return f'<div style="display:flex;flex-direction:column;gap:6px;padding:16px 20px;border:1px solid #FF6FAE;border-radius:12px"><p style="margin:0;font:600 15px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:#FF6FAE">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{body}</div><p style="margin:0;font-size:13px;color:#959AAD"><b style="color:#E6E8F0">Recommended:</b> {rec}</p></div>'
def note(lbl, items): return f'<div style="display:flex;flex-direction:column;gap:10px;padding:20px 24px;border:1px solid #262A35;border-radius:14px">{label(lbl)}<div style="font-size:14px;line-height:1.6;color:#B1B6C7">{ul(items)}</div></div>'

C1 = call("1", "Find a deck lives where your cards are: /collection", ul([
  f"A call-out under the filters, the deck page's to-do card row as a statement (the you-have-it pattern): eyebrow {m('Find a deck')}, the door's two diamonds, {m('212 of your cards are in no deck')} / {m('Narrow to them, then press a card’s two diamonds to see which of your decks it fits.')} A bare ✕ closes it for good.",
  f"Under it the shipped segmented switch: {m('All · 2,926')} / {m('In no deck · 212')}. It IS the Availability filter's Free option, one state: choosing it draws the {m('Free')} chip, clearing the chip goes back to All.",
  "While the list is narrowed to Free alone, every tile draws the Find a deck press (the door's glyph in the #3202 26px box, 44px hit). It opens the card window straight on Find a deck, the shipped view, with the card as its back press.",
  "Not on All: most of a collection is in no deck, and a glyph on every tile would be noise. The door in card details and its moment stay as shipped.",
  f"Every Try it for Find a deck already lands on {m('/collection?avail=free')}: the tour, About's Tools tab and the welcome sheet now arrive on these presses."]))
C2 = call("2", "Tuning gets a tab; Consider moves into it", ul([
  f"Tabs: {m('Your deck · Analysis · Tuning · Games · Versions')}. Still five, so the phone row scrolls as it does today. Tuning is drawn for every deck, as the hub already is.",
  "The Tuning tab is the shipped hub, unchanged in behavior: tiles, a tool opens in place, the desktop underline row, the phone's ‹ Tuning. Its own Tuning heading goes (the tab names it).",
  f"Consider is the first tile, full width from md: {m('free')}, {m('Cards that fill what this deck is short of, the ones you own first.')}, {m('14 you own · 26 to buy')}. It opens the shipped Consider panel in place.",
  "Analysis keeps the reading: verdict, Overview, strategy, bracket, findings. The hub leaves its foot.",
  f"Every shortcut retargets the tab: the to-do card's Cuts, the land cell's {m('balance mana →')}, the role cells' {m('consider →')} (Tuning, Consider open), and Try it for the Tune tools."]))
C3 = call("3", "The welcome sheet points at the new homes", ul([
  "The Home strip is unchanged: one line, Where they work, ✕.",
  f"Every row now has Try it. Overview lands on a deck's Analysis tab; Which deck needs it most? lands on {m('/collection')}, In no deck, presses on.",
  f"Where lines: Suggested changes and Proposed cuts read {m('A deck’s Tuning tab')}; Which deck needs it most? reads {m('A card in no deck')}.",
  f"A free block before the teaser, in the sheet's shipped reason-line form: {m('Free, no credit needed')}, then Consider and Find a deck, each with a {m('free')} pill and Try it. A new player reading where credits go also learns the two free tools that answer \"where do my cards go\"."]))

Q1 = q("Q1", "Does Tuning open straight on Consider while a deck is short?", "On a deck under its size the work is adding cards, and Consider is one press deeper than it is today. Option A: the tab always lands on the tiles (drawn). Option B: under size, it lands on Consider open, the tiles one ‹ Tuning away.", "A. One rule for the tab, and Consider is the first, full-width tile, so the press is a short one.")
Q2 = q("Q2", "Keep the free block in Where credits work?", "The sheet is about credits; the block names two tools that cost none. Option A: keep it (drawn). Option B: the sheet stays spenders only and the Collection call-out carries Find a deck alone.", "A. The sheet is the one place a new player is told what the tools are, and it already says browsing is free.")
Q3 = q("Q3", "One word for the filter: In no deck, or Free?", "The switch says In no deck; the Availability filter's option and chip say Free (the same state). Option A: rename the shipped option and chip to In no deck, everywhere. Option B: the switch says Free too.", "A. \"Free\" reads as a price to a new player; \"In no deck\" says what it filters.")


C1R2 = call("1", "Find a deck, R2: the shipped Free filter is the one control", ul([
  f"No switch. Availability's {m('Free')} option and chip are the filter, as shipped; R1's All / In no deck switch is gone.",
  f"On All, the call-out is the door to it: eyebrow {m('Find a deck')}, {m('212 of your cards are in no deck')} / {m('See which of your decks each one could go in.')}, and {m('Show them')}, which applies Availability: Free. A bare ✕ closes it for good.",
  f"On Free alone, the same call-out without the button: {m('Press Find a deck under a card to see which of your decks it fits.')}",
  f"Each tile gets a labelled button under it, the tile's full width: the door's two diamonds and {m('Find a deck')} (36px on a phone, 34px from md). The name keeps its whole line, and a reader who has never seen the glyph reads what it does. It opens the card window straight on Find a deck, as R1.",
  "Drawn only while the list is narrowed to Free alone: on All most cards are in decks, and a button under every tile would be noise."]))
C4 = call("4", "Home says what you can do, in your words", ul([
  f"A section on Home under the welcome strip, above Pick up where you left off: {m('What you can do')}. Goals, not tool names, each with the player's own numbers, each one press from the tool that answers it.",
  f"{m('Find a home for your spare cards')} {m('free')}: {m('212 of your cards are in no deck. See which of your decks each one fits.')} → /collection?avail=free, the call-out above.",
  f"{m('Make Ashen Banner Parade better')} {m('free to start')}: {m('Cards you own that fill what it’s short of, then swaps and cuts.')} → the deck's Tuning tab (the most recently touched deck).",
  f"{m('Build another deck')} {m('free')}: {m('Commanders your cards can already lead, the closest first.')} → /commanders.",
  "Why it reaches the player who skipped the strip: it is page content, not a promo line, it uses their cards and their deck by name, and it does not mention credits at all. The strip keeps the credits story.",
  f"A row leaves once its tool has been opened from anywhere (the moments' spent store); the section leaves with its last row. A bare ✕ beside the heading closes it for good. Rows only draw when they have something to say: no spares row at 0 cards in no deck, no tune row with no deck. At zero decks Home already draws its ways in, so the section waits for the first deck.",
  "Phone: one column of rows. From 1180: three across, one row."]))
Q4 = q("Q4", "In the Free view, a labelled button under each tile, or no button at all?", "Option A: the Find a deck button under every tile (drawn). Option B: no button; in the Free view a tile's own press opens the card window straight on Find a deck, and the call-out says so. B adds nothing to the tile, but it changes what a tile does in one view only, and nothing on the tile says it.", "A. A new player can see the tool and its name on every card, and a tile always does the same thing.")
Q5 = q("Q5", "Should What you can do retire row by row, or only when hidden?", "Option A: a row leaves once its tool has been opened, and the section leaves with its last row (drawn). Option B: the rows stay until the ✕, as a standing shortcut list.", "A. Home is for what is new to the player; once they have found a tool it lives in its own place.")

C1R3 = call("1", "Find a deck in row view (R3)", ul([
  "The row view is the phone's default, so most phone readers meet Find a deck here. A row is one button, so the Find a deck button is its sibling at the row's right, the row's full height, 6px from it.",
  f"From md: the glyph and {m('Find a deck')}, 136px, as the tile's button reads. Phone: 44px, the glyph alone (the row has no room for the word beside a name), named {m('Find a deck for <card>')}.",
  f"The call-out names it on each: {m('Press Find a deck beside a card…')} from md; on a phone {m('Press')} [the glyph, boxed as the button draws it] {m('beside a card to see which of your decks it fits.')}",
  "Drawn only while the list is narrowed to Free alone, as the tile's button. Grid tiles as R2 (approved)."]))
C5 = call("5", "Ask, in the search you already have", ul([
  f"The card search (the magnifier on every screen, ⌘K on desktop) takes a question as well as a card name. Its placeholder becomes {m('Search cards, or ask a question')}.",
  f"Nothing typed: {m('Not sure where to go? Ask')} and four starter questions above Recent cards. A press types the question in, so a new player learns the field takes questions by watching it answer one.",
  f"A question: {m('Tools for this')} above the cards, up to three tool answers. Each is the search row's frame with the tool's mark, its shipped name and line (About's), its cost pill, the reader's own number when there is one ({m('212 of your cards are in no deck')}), and where it lands. A press lands as Try it does. Card results follow as shipped; a query that is only a question reads {m('No card names match.')}",
  f"Nothing matches: {m('Nothing here answers that yet')}, the starters again, and {m('Every tool, in About ›')}. Never a dead end.",
  "Matching is phrase lists per tool in the registry (`tools.ts`): no model, no credit, instant, and nothing the player types leaves the page. Every tool is reachable, so exploration is open: the starters are a way in, not the menu.",
  f"Home: R2's What you can do is replaced by the same field as a press (it opens the search) under {m('Not sure where to go?')}, with the starters under it. Under the welcome strip, above Pick up where you left off."]))
Q6 = q("Q6", "When no tool matches a question, should a model try?", "Option A: no model (drawn). Phrase lists match; a miss shows the starters and About, and misses are counted (never their text) so the lists grow. Option B: a miss goes to a small model call that picks the closest tool. It reads free text, so it goes through playerText, registers as a prompt path, and costs per call.", "A for launch. It is free, instant and private, and the miss count tells us whether B is worth building.")
Q7 = q("Q7", "Does Home keep the Ask field for good?", "Option A: it shows until the reader has asked or searched from it three times, then leaves; the magnifier and ⌘K stay everywhere (drawn as the first-visit state). Option B: it stays on Home for good.", "A. It is a way in for someone who has not found search yet; once they have, Home goes back to their decks.")

C1R4 = call("1", "Find a deck in row view, over the full row (R4)", ul([
  "Drawn over the row as it ships, sorted by Date added as most collections are: copies, name, bracket marks, combo, foil, the date, the type line, cost pips, the set. In the Free view every row is free, so the shipped row draws no availability marker.",
  f"Phone: a {m('Find a deck')} strip under each row, inside its outline (40px, the glyph and the word, a hairline above). The row keeps every cell and its whole name line, and it reads as the tile's button does. The call-out reads as the tiles': {m('Press Find a deck under a card…')}",
  "Desktop: the R3 button beside the row (136px, glyph and word), the row's height. A desktop row has the room.",
  "R3's phone glyph beside the row is drawn as Q8's option B: it costs the name about ten characters on a full row."]))
C5R4 = call("5", "Ask and card search, one field (R4)", ul([
  f"Home gets the field for good, first under the page head and above the welcome strip: {m('Search cards, or ask a question')}, a press that opens the search, and the four starters under it (one row that scrolls sideways on a phone). The magnifier and ⌘K stay on every screen.",
  "The search itself is as R3: starters when nothing is typed, Tools for this above the cards for a question, never a dead end. No model call (Hugh, R3 Q6).",
  "One field, two jobs, and what keeps them apart:",
  ul([f"<b>Card names that read as questions</b> ({m('Where Ancients Tread')}, {m('Ask Urza')}, {m('Find the Path')}, {m('What Must Be Done')}). A card whose name starts with the query, or equals it, always ranks first; tools follow under it. Tools lead only when no card name starts with the query.",
      "<b>One word.</b> Tools answer one word only when it is a tool's own name (Wishlist, Tuning, Consider); otherwise a question needs two or more words to hit a phrase. Typing a name stays a card lookup.",
      "<b>All cards vs yours.</b> Card results are every card, as shipped; tool answers are about the reader's own cards and decks, and say so with their numbers.",
      "<b>Keys and screen readers.</b> One combobox, one listbox with two labelled groups (Tools for this, the cards); ↑ ↓ move through both, ↵ opens.",
      "<b>Expectation.</b> A question with no match says so plainly and offers the starters and About; it never shows a card no-results box for a question.",
      "<b>Measuring.</b> The search event records which group the press came from (tool or card), never the text, so card lookups and questions read apart."]),
  "Why one field: new players will not know which of two boxes to use, and the app's rule is one control per action."]))
Q8 = q("Q8", "Phone rows: a Find a deck strip under each row, or the glyph beside it?", "Option A: the strip under the row, the glyph and the word (drawn, R5). Option B: R3's 44px glyph button beside the row; rows stay their height, names lose about ten characters on a full row.", "A. The name is what a reader scans by, and the word matches the tile's button, so phone and desktop read the same.")

C6 = call("6", "Home's search, easier to notice (R5)", ul([
  f"Its own panel, first under the page head on a quiet day (under Rule 0 cards on a busy one, Q10): the welcome strip's accent edge, a wash of the accent fading across, a display title {m('Not sure where to go?')} and a line {m('Ask a question, or look up any card.')}",
  "The field at 52px on the page's own --bg, so it reads as the place to type: the glyph in the accent, the placeholder, ⌘K from md.",
  "Personality, not flash: a small fan of three of the reader's own cards (the three most recently added) with the search's lens over them, the card search empty state's graphic in their art. Right of the field from md; beside the title on a phone.",
  "The starters under the field, on the page's --bg so they read as presses. No motion, no badge."]))
C7 = call("7", "What pressing it does (R5)", ul([
  "<b>Desktop:</b> the Home field IS the search field. Typing there opens the results in place, the same dropdown the rail's search draws (same groups, same keys, same foot), anchored under the Home field and its width. The rail's search does not open; the page is not covered. Esc or a press outside closes it and keeps the text.",
  "<b>Phone:</b> a press on the field opens the same full-screen search sheet the header's magnifier opens, focused, with the keyboard up (A0 on this board). A starter opens it with the question typed (A1). The phone never draws a dropdown under a field: the keyboard would cover it.",
  "One search underneath: one query, one result list, one recent-cards memory. Typing on Home and then pressing ⌘K shows the same query."]))
Q9 = q("Q9", "Desktop: results in place under Home's field, or the rail's search?", "Option A: results open in place under the Home field (drawn, H5). Option B: a press moves focus to the rail's search, which opens 12px out from the rail as it does today.", "A. The answer appears where the reader is looking; B makes the eye jump to the left edge and leaves the Home field a fake.")
C8 = call("8", "Home in full, a busy day (R6)", ul([
  "Drawn with everything Home can hold at once: the arrivals banner, tonight's Rule 0 table, a game to log, the search panel, the welcome credits, the lead story, your decks, What's new with two unseen, Commitments and Friends (with an unseen badge on Friends).",
  "Order down the main column: the arrivals banner (spans both columns, as shipped), then Rule 0's cards (they close tonight), then the search panel, then the welcome strip and the lead. The panel is the first thing that is always there, under the things that expire.",
  "On a quiet day (no table, no game to log, no banner) the panel is first under the page head, as H4.",
  "On a phone on a busy day the panel starts at the fold (about 810px of 844); on desktop it sits under the two table cards, level with Commitments.",
  "Pressed on desktop (H6 open), the results drop over the welcome strip and the lead; nothing below moves."]))
Q10 = q("Q10", "On a busy day, does the search panel sit under Rule 0's cards, or above them?", "Option A: under them (drawn): a table closing tonight and a game to log come first, then the panel. Option B: the panel first under the page head always, and Rule 0's cards under it.", "A. The table and the log run out; the panel is always there, and so are the magnifier and ⌘K. On a quiet day A and B draw the same.")
C9 = call("9", "Reordering a busy Home (R7)", ul([
  "<b>What is buried today (H6):</b> What's new sits under the decks, so the unseen rows are the page's last block; the welcome credits are a thin strip between two loud blocks (the panel and the lead), easy to scroll past.",
  "<b>A · One welcome block, news together (recommended):</b> the welcome credits become the search panel's foot (the shipped strip, its edge dropped, its ✕ closes only that line). The credits exist to try the tools and the panel is where the tools are found, so they say one thing. What's new moves up under the lead story, so every notification is in one run; the decks follow. Rule 0's cards still lead.",
  "<b>B · News first:</b> Rule 0's cards, the lead and What's new, then the panel (with the credits), then the decks. Notifications are never buried; the panel drops to about 1,700px on a phone on a busy day.",
  "<b>C · Search in the head:</b> no panel. A 40px field in the page head beside Update collection (desktop) or under the buttons (phone), accent-edged; its starters show when it opens (A0). The credits strip stays, What's new moves under the lead. The shortest page, but it is close to R4's field, which read as easy to miss.",
  "Every option keeps the shipped rules: the arrivals banner spans the page, Rule 0's cards lead the main column, Commitments and Friends keep the right rail."]))
C10 = call("10", "Search on the first-run Home (R7)", ul([
  "<b>A · Wait (recommended):</b> first run as shipped. It has one job, Add your collection, and step 1 already offers Add cards by hand (search by name). Every starter question is about the reader's cards or decks, so none could answer yet. The magnifier and ⌘K are there from the first visit. The panel, with the credits in its foot, arrives on the first Home after the collection is read.",
  "<b>B · A row:</b> an unnumbered Look up any card row among the checklist's own rows (after step 3, before Add your friends), the same shape as Choose your news: any card in the catalog, no starters. A press opens the card search."]))
Q11 = q("Q11", "How should a busy Home be ordered?", "A: the credits fold into the search panel and What's new moves up under the lead (drawn). B: notifications first, then the panel. C: the search as a field in the page head, no panel.", "A. It fixes both buried things with one move each, keeps the panel Hugh asked for, and turns two new-player blocks into one.")
Q12 = q("Q12", "Does the first-run Home get search?", "A: no; it arrives with the first Home after the collection (drawn as shipped). B: a Look up any card row among the checklist's rows.", "A. First run has one job, the questions all need a collection, and step 1 already searches by name.")
C11 = call("11", "A calmer busy Home (R8, on top of R7 A)", ul([
  "<b>The desktop rail fills with the news.</b> What's new moves to the top of the right rail, above Commitments and Friends. Every notification is now in the first screen (the lead in the main column, the rest beside it), the rail's empty space is gone, and the main column ends at the decks, about 330px shorter. In the rail a row draws as on a phone (the action under the text); Choose your notifications moves into the list's foot beside Clear all, so the heading stays one line.",
  "<b>Section headings you can find.</b> Every Home section heading (What's new, Pick up where you left off, Friends, Commitments) moves from 10px faint mono capitals to the page's display face at 17px in --fg, led by the accent diamond the app already uses as its mark. Counts stay mono, in --accent-text. 10px more room above each. The deck list's last touched caption stays from sm and leaves on a phone, where it wrapped the heading.",
  "<b>Phone:</b> the order stays R7 A (table, game to log, panel with credits, lead, What's new, decks, Friends, Commitments). It is still a long page on a busy day; the headings are what make it scannable. Not drawn, possible later: What's new showing two rows on a phone with Show all.",
  "Settled in R7: Q11 A (credits in the panel, What's new under the lead) and Q12 A (no search on first run)."]))
C12 = call("12", "Matching the real Home (R9)", ul([
  "Checked against two screenshots of a live Home. Added what the fixture had dropped: What's new's foot (Past announcements ›, Clear all, Show all 7, seven items with Today and Earlier), the deck rows' status pills (To buy, Draft, Complete), bracket marks and copies-to-buy counts, five friends, the reader's own face in the rail, and the Fan Content notice at the foot.",
  "<b>Tonight's table and Game to log</b> draw each seat's commander art, as the shipped cards do (faces on the table; art tiles, the winner ringed, on the log).",
  "<b>Game to log's ✕</b> leaves the CTA's line: top right of the card at every width (32px from 1180, 44px on a phone), like the welcome strip and the banner. Log this game sits where Open the table does, right of the body, vertically centred.",
  "<b>Choose notifications</b> (was Choose your notifications) now fits beside the What's new heading in the desktop rail, as it sits on a phone. In the rail the list's foot keeps one line."]))
Q13 = q("Q13", "Move What's new into the desktop rail?", "A: yes, top of the rail, rows drawn as on a phone, Choose your notifications in the list's foot (drawn). B: keep it in the main column under the lead (R7 A), the rail as shipped.", "A. It uses the empty rail, puts every notification in the first screen, and shortens the main column.")
Q14 = q("Q14", "Stronger section headings on Home?", "A: display face 17px, --fg, the accent diamond, counts in --accent-text (drawn). B: keep the shipped 10px mono labels.", "A. On a busy Home the labels are what a reader scans by, and today they read as captions.")
C13 = call("13", "What's new, Show all (R10)", ul([
  "Show all N no longer expands the list in place. The rail (desktop) and the column (phone) always show five rows; Show all N opens every item in a sheet.",
  "<b>Desktop:</b> a 460px sheet from the right edge, full height, over a 55% scrim; the page does not move. <b>Phone:</b> the same sheet full screen, like the search sheet.",
  "<b>Head:</b> the diamond, What's new, the count (12 · 3 new), a bare ✕. Under it, filter chips by kind with counts (All, Price drops, Combos, New sets, Trade matches), only the kinds present; one row that scrolls sideways on a phone.",
  "<b>Body:</b> one scrolling list grouped Today, This week, Earlier; the shipped rows (phone layout at every width), each with its ✕.",
  "<b>Foot, fixed:</b> Past announcements ›, Choose notifications ›, Clear all (clears what the chip shows). Esc, the ✕ or the scrim closes it; focus returns to Show all.",
  "Nothing on Home changes size when there are 10, 30 or 100 items: only the number on Show all."]))
Q15 = q("Q15", "Show all: a sheet, or expand in place?", "A: a sheet from the right (full screen on a phone) with kind chips and day groups (drawn). B: expand in place, as shipped, which stretches the rail or the column with every item.", "A. Home keeps its shape however many items there are, and the chips make 10+ items quick to sort.")
boards = {}
boards["ShowAll.dc.html"] = (1700, 1970, "Show all", page("Finding the tools R10: What's new, Show all", 1700, 1970,
 head("What's new, Show all (R10)", "Twelve items. The rail keeps five; Show all 12 opens the sheet. Drawn open on All, and filtered to Price drops.")
 + C13 + Q15
 + row("Desktop · 1300", [dk("d-r10s", "Show all · All", "The sheet over Home; Today, This week, Earlier.", 760), dk("d-r10k", "Show all · Price drops", "A chip filters; the groups keep their order.", 760)])
 + row("Phone · 390", [ph("p-r10s", "Show all · All", "Full screen; the chips scroll sideways."), ph("p-r10k", "Show all · Price drops", "Filtered.")])))
C14 = call("14", "One lead for an ask and an offer (R11)", ul([
  "The shipped lead already draws an offer: kicker Spare offer, <i>Max is offering you Avenger of Zendikar</i>, <i>Max has 1 spare. You want 1.</i>, Yes, No, 14 days left. An ask draws the same story with its own kicker and line. No new component.",
  "<b>Why desktop showed a row:</b> the lead is the highest-ranked unseen item (<code>leadStory</code>), not a width rule. When a trade match outranks the offer, the offer drops into What's new as <i>Answer in Friends.</i> with no presses. That is the desktop frame you saw.",
  "<b>Proposed rank:</b> anything waiting on the reader with a deadline (an offer or an ask, unanswered, open) leads over news, the newest first. So the offer leads at both widths (Q16).",
  "<b>The ✕ moves to the corner</b>, as on Game to log (R9): Yes, No and the days left own the action line, and the text keeps 26px clear of the ✕ (Q17).",
  "<b>A second ask that does not lead</b> answers in its row: the detail line, then the shipped row presses (36px Yes, No, days left), ✕ in the row's corner. <i>Answer in Friends.</i> retires on Home (Q18). Answering lands the shipped receipt in place."]))
C15 = call("15", "Friends badge (R11)", ul([
  "The shipped badge (#3221): one count on Friends for offers and asks waiting on the reader, in the rail (desktop) and the tab bar (phone). Drawn at 1, Max's offer alone; the proposed Home frames read 2, the offer plus Rui's ask.",
  "It falls as each is answered or runs out, and is gone at 0. Its label is the shipped words (<code>badgeWords</code>): <i>Friends, 1 waiting on you</i>."]))
C16 = call("16", "The offerer's answer on Home (R11)", ul([
  "When Max answers the reader's offer, Home's row reads <i>Max said yes to Avenger of Zendikar</i> / <i>The handover is between you.</i> with <b>Your offer ›</b>, the kicker Your offer.",
  "Your offer › opens the shipped answer sheet (#3242): the request history row, accepted or declined, Offered date and copies, and Request history › in its foot. A centred 560px sheet on desktop; a bottom sheet on a phone. It is no longer display only, so nothing new is needed here: drawn to confirm."]))
Q16 = q("Q16", "Does an offer or ask always lead over news?", "A: yes, anything waiting on you with a deadline leads, newest first (drawn). B: keep today's rank, and the offer can sit in What's new.", "A. It is the only item that expires and needs the reader's answer; it should not depend on what else came in that day.")
Q17 = q("Q17", "Where does the lead's ✕ go?", "A: the card's top right corner (drawn), as on Game to log. B: at the end of Yes, No and the days left, as shipped.", "A. Your rule from R9: a press and its ✕ never share a line.")
Q18 = q("Q18", "A non-leading ask or offer in What's new", "A: answer in the row: Yes, No, days left (drawn). B: keep Answer in Friends. with no press.", "A. One place to answer from Home, the same presses as Friends' Waiting on you.")
boards["Offers.dc.html"] = (1700, 5540, "Spare offers", page("Finding the tools R11: spare offers on Home", 1700, 5540,
 head("Spare offers on Home (R11)", "Max offers the reader Avenger of Zendikar. Today against proposed, at 1300 and 390, then the Friends badge and the offerer's side. Rendered from main bb4832f8 with the shipped components; Avenger of Zendikar stands in for Nissa, Worldsoul Speaker, whose art is not in the fixtures.")
 + C14 + Q16 + Q17 + Q18
 + row("The lead · desktop 1300", [dk("d-of-today-c", "Today", "When a trade match outranks the offer, the trade match leads.", 760), dk("d-of-lead-c", "Proposed", "The offer leads; the ✕ in the corner; Yes, No, 14 days left alone on the line.", 760)])
 + row("What's new · desktop rail", [fig("d-of-today-x", 336, "Today", "The offer as a row: Answer in Friends., no presses."), fig("d-of-lead-x", 336, "Proposed", "Rui's ask, not leading, answers in its row; ✕ in the corner."), dk("d-of-lead", "Proposed · Home in full", "The offer leads under the search panel; Rui's ask tops the rail.", 760)])
 + row("Phone · 390", [ph("p-of-today-l", "Today", "The lead as shipped: the ✕ on the Yes and No line."), ph("p-of-lead-l", "Proposed · the lead", "The ✕ in the corner."), ph("p-of-lead-n", "Proposed · What's new", "Rui's ask answers in its row.")])
 + C15
 + row("Friends badge · 1 waiting", [fig("d-of-badge", 180, "Desktop rail", "On the Friends icon."), fig("p-of-badge", 390, "Phone tab bar", "On Friends; Home's own badge clears while on Home.")])
 + C16
 + row("The offerer's side · Max said yes", [fig("d-of-ans-x", 336, "Desktop rail", "Your offer › on the row."), dk("d-of-anss", "Your offer, opened", "The shipped sheet over Home.", 760)])
 + row("Phone · 390", [ph("p-of-ans-n", "The row", "Kicker Your offer; Your offer ›."), ph("p-of-anss", "Your offer, opened", "The bottom sheet.")])))
C17 = call("17", "Bigger tool marks (R12)", ul([
  "Today the wrench is 18px in a 40px tile (phone) and a 30px tile (desktop). Proposed: 28px in a 48px tile on a phone, 24px in a 40px tile in the dropdown. The row heights stay 72px and 58px, so tools and cards still read as one list."]))
C18 = call("18", "A press opens now, or says it is opening (R12)", ul([
  "Today a press closes the search, then waits for the page: Precons can take a second or two with nothing on screen.",
  "Proposed: the search stays up until the new page commits. The pressed row rings in the accent, its tile turns to a spinner, its foot reads <i>Opening Precons…</i>, the other rows dim, and the shipped search progress bar runs across the top. Then the search closes onto the page. A fast page closes it at once, so most presses look immediate.",
  "Esc or ✕ still closes and cancels; a failed load puts the row back and shows the shipped toast."]))
C19 = call("19", "Pick a deck, inside the search (R12)", ul([
  "Today a deck tool that fits several decks opens the most recent one (<i>in Ashen Banner Parade +3</i>), so the reader cannot choose.",
  "Proposed: its foot reads <i>Pick a deck · 4 can use it</i>. A press swaps the answers for a picker in the same box: ‹ Answers, the tool's name and cost, <i>Which deck? 4 of yours can use it.</i>, then the decks that fit, last touched first, each with its commander art, name, commander and when it was edited. A deck opens the tool on that deck, with the same Opening state.",
  "One deck that fits still goes straight there. ↑ ↓ and Enter work through the picker; Backspace or ‹ Answers goes back."]))
C20 = call("20", "A highlight only where there is something to find (R12)", ul([
  "Halo when the tool is one part of a busier screen: Suggested changes, Proposed cuts, Mana Balance and Consider (Tuning tiles), Top off, Cheaper stand-ins and Friends' spares (the deck's Shopping view), Matchups (Games), Find a deck (the Free chip).",
  "No halo when the page is the tool: Help me choose, Precons, Wishlist, Collection Sync, Stats for your decks, Friends. Those land at the top of the page, nothing ringed."]))
Q19 = q("Q19", "Tool mark size", "A: 28px in 48px (phone), 24px in 40px (desktop), drawn. B: a smaller step, 24px in 44px (phone) and 22px in 36px.", "A. It reads as an icon at a glance without making the row taller.")
Q20 = q("Q20", "What a press does while the page loads", "A: the search stays up with the row in its Opening state until the page commits (drawn). B: close at once and lean on each page's own skeleton.", "A. Not every page has a skeleton; the row the reader pressed is where their eyes are.")
Q21 = q("Q21", "A tool that fits several decks", "A: pick the deck inside the search (drawn). B: open the most recent deck as today, with a deck switcher on arrival.", "A. The choice is made before any page loads, and a credit tool never runs on the wrong deck.")
Q22 = q("Q22", "When the landing highlights", "A: only on a busier screen, as listed (drawn). B: always, as shipped.", "A. A ring on a page that is the tool points at nothing in particular, like Help me choose's colors.")
boards["Search.dc.html"] = (1700, 6960, "Search follow-ups", page("Finding the tools R12: Home search follow-ups", 1700, 6960,
 head("Home search follow-ups (R12)", "Four fixes for the shipped Home search. Rendered from main cc89ad77 with the shipped tool rows; the dropdown is drawn over Home as it opens under the panel's field. Deck names and art are illustrative.")
 + C17 + Q19
 + row("Desktop · 1300", [dk("d-s12-mk0", "Today", "18px wrench, 30px tile.", 760), dk("d-s12-mk1", "Proposed", "24px wrench, 40px tile.", 760)])
 + row("Phone · 390", [ph("p-s12-mk0", "Today", "18px in 40px."), ph("p-s12-mk1", "Proposed", "28px in 48px.")])
 + C18 + Q20
 + row("Pressed Precons", [dk("d-s12-go", "Desktop · Opening", "Ring, spinner, Opening Precons…, the bar across the top.", 760), ph("p-s12-go", "Phone · Opening", "The same in the sheet.")])
 + C19 + Q21
 + row("Desktop · 1300", [dk("d-s12-pk0", "Today", "in Ashen Banner Parade +3: a press opens that one.", 500), dk("d-s12-pk1", "Proposed · answers", "Pick a deck · 4 can use it.", 500), dk("d-s12-pk2", "Proposed · the picker", "Last touched first; a deck opens the tool on it.", 500)])
 + row("Phone · 390", [ph("p-s12-pk0", "Today", "The first deck only."), ph("p-s12-pk1", "Proposed · answers", "Pick a deck."), ph("p-s12-pk2", "Proposed · the picker", "In the sheet; ‹ Answers goes back.")])
 + C20 + Q22
 + row("Keeps its halo · Suggested changes on Tuning", [dk("d-s12-tun", "Desktop", "The tile is one of five.", 760), ph("p-s12-tun", "Phone", "Scrolled to the tile.")])
 + row("Loses its halo · Help me choose", [dk("d-s12-hmc0", "Today", "Colors ringed: nothing to find there.", 500), dk("d-s12-hmc1", "Proposed", "The page, top first, nothing ringed.", 500), ph("p-s12-hmc0", "Phone · today", "Ringed."), ph("p-s12-hmc1", "Phone · proposed", "Not ringed.")])))
boards["Calm.dc.html"] = (1700, 4770, "Calmer Home", page("Finding the tools R8: a calmer busy Home", 1700, 4770,
 head("A calmer busy Home (R8, R9)", "R7 A (left) against R9 (right), the same reader. R8 moves What's new into the empty desktop rail and makes Home's section headings easy to find.")
 + C12 + C11 + Q13 + Q14
 + row("Desktop · 1300, busy day", [dk("d-ra", "R7 A", "What's new under the lead; the rail ends at Friends.", 760), dk("d-r9", "R9", "What's new tops the rail with Choose notifications beside it; the real Home's parts; the log card's ✕ top right.", 760)])
 + row("Phone · 390, busy day", [fig("p-ra", 320, "R7 A", "The shipped 10px labels."), fig("p-r9", 320, "R9", "Display headings; seat art on the table and log cards; the full What's new foot.")])))
boards["Order.dc.html"] = (1700, 5770, "Order and first run", page("Finding the tools R7: Home order and first run", 1700, 5770,
 head("Home order, and search on first run (R7)", "The busy Home from H6 three ways, each rendered with the same reader (a table, a game to log, the arrivals banner, the lead, What's new with two unseen, welcome credits), and the first-run Home with and without search.")
 + C9 + Q11
 + row("Desktop · 1300, busy day", [dk("d-ra", "A · One welcome block, news together", "Credits in the panel's foot; What's new under the lead; decks after.", 500), dk("d-rb", "B · News first", "The lead and What's new, then the panel, then decks.", 500), dk("d-rc", "C · Search in the head", "A field beside the page head's buttons; no panel.", 500)])
 + row("Phone · 390, busy day", [fig("p-ra", 300, "A · Phone", "The panel at the fold, its credits foot under it; then the lead, What's new, decks."), fig("p-rb", 300, "B · Phone", "Notifications first; the panel under What's new."), fig("p-rc", 300, "C · Phone", "The field under the buttons; the credits strip as shipped.")])
 + C10 + Q12
 + row("First run · desktop 1300", [dk("d-fa", "A · Wait (as shipped)", "No panel; the magnifier and ⌘K, and step 1's Add cards by hand.", 760), dk("d-fb", "B · A row", "Look up any card, unnumbered, after step 3.", 760)])
 + row("First run · phone 390", [ph("p-fa", "A · Wait", "First run as shipped."), ph("p-fb", "B · A row", "The row before Add your friends.")])))
boards["Home.dc.html"] = (1700, 4480, "Home in full", page("Finding the tools R6: Home in full", 1700, 4480,
 head("Home in full, a busy day (R6)", "Home with everything a reader can have at once, so the panel is judged in its real company: an open table, a game to log, the arrivals banner, the lead story, What's new with unseen rows, Commitments, Friends with a badge. Rendered from main 7563036 with the shipped components; names, figures and art are illustrative.")
 + C8 + Q10
 + row("Desktop · 1300 and phone · 390, at rest", [dk("d-full", "H6 · Desktop, busy day", "Banner, the table and the game to log, then the panel, the welcome strip, the lead, decks, What's new; Commitments and Friends on the right.", 1000), fig("p-full", 340, "H6 · Phone, busy day", "The same order in one column; the panel starts at the fold.")])
 + row("Desktop · 1300, typed on Home", [dk("d-full-open", "H6 · Results in place", "The dropdown drops over the welcome strip and the lead; the page under it does not move (Q9 A).", 1000)])))
boards["Main.dc.html"] = (1600, 2120, "Main", page("Finding the tools R12: main", 1600, 2120,
 head("Finding the tools · R12",
  "One complaint: <i>\"I have a bunch of cards I want to add to my other decks, but I don't know where to go.\"</i> R5 makes Home's search easier to notice and sets down what pressing it does on a phone and a desktop. Everything else is as R4. Rendered from main 7563036 with shipped components. Figures and art are illustrative.")
 + note("Since R4", ["Home's search gets its own panel: accent edge, a title, the field at 52px, a fan of the reader's cards under the search's lens (call 6).", "What pressing it does: in place on desktop, the full-screen sheet on a phone (call 7, Q9).", "Open from R4: Q8 (phone rows, strip or glyph).", "R6: Home in full on a busy day, with a table open, a game to log and notifications (the Home in full board, Q10).", "R7: three orders for a busy Home (Q11) and search on first run (Q12), on the Order and first run board. Settled: Q11 A, Q12 A.", "R8: What’s new in the desktop rail (Q13) and stronger section headings (Q14), on the Calmer Home board.", "R9: the real Home\u2019s missing parts added (What\u2019s new foot with Show all, pills, brackets, footer), seat art on the table and log cards, the log card\u2019s ✕ top right, Choose notifications.", "R10: Show all opens a sheet (Q15), on the Show all board.", "R11: spare offers on Home: one lead for an ask and an offer, the ✕ in its corner, asks answered in their row, the Friends badge, the offerer\u2019s answer (Q16 to Q18), on the Spare offers board."])
 + '<div style="display:flex;gap:40px;align-items:flex-start">'
 + '<div style="display:flex;flex-direction:column;gap:16px;flex:1 1 0;min-width:0">' + C6 + C7 + '</div>'
 + '<div style="display:flex;flex-direction:column;gap:28px;flex:none;width:620px">'
 + '<div style="display:flex;gap:20px">' + fig("p-h4", 300, "Home, phone", "The panel, first under the page head.") + fig("p-a1", 300, "Pressed, phone", "The full-screen sheet; a starter types its question.") + '</div>'
 + '</div></div>'
 + note("Settled", ["Q1 to Q18 all settled as drawn (A); approved 2026-11-23 and handed off in PR #3243.", "R12 (2026-11-24): Home search follow-ups on the Search follow-ups board. Open: Q19 to Q22."]) + Q19 + Q20 + Q21 + Q22
 + note("As R4", ["Ask in the card search: starters, Tools for this, never a dead end; one field, card names first.", "Find a deck: the tile button, the row strip (phone) and button (desktop), the call-out.", "Tuning and Welcome as R1, approved."])))

boards["Find.dc.html"] = (1700, 4560, "Find", page("Finding the tools R4: Find a deck", 1700, 4560,
 head("Q1 · How a player finds the deck a card fits (R4)", "/collection's Cards tab. F0 the call-out on All, its Show them applying the shipped Availability: Free. F1 narrowed to Free, a Find a deck button under each tile (approved R2). R5 and R4 the row view over the full shipped row, phone options A and B. F2 the button opens Find a deck straight (shipped view, Killian, one deck fits).")
 + row("Row view, the full row (R4)", [dk("d-r5", "R5 · Rows, desktop", "Sorted by Date added: marks, combo, pips, dates; the button beside, 136px.", 780), ph("p-r5", "R5 · Rows, phone (Q8 A)", "A strip under each row; every cell and the whole name line stay."), ph("p-r4", "R4 · Rows, phone (Q8 B)", "R3's glyph beside the row: the names lose about ten characters.")])
 + row("Desktop · 1300", [dk("d-f0", "F0 · All", "The call-out with Show them; no buttons on All.", 780), dk("d-f1", "F1 · Free", "The Free chip as shipped; a labelled button under each tile.", 780)])
 + row("Desktop · 1300", [dk("d-f2", "F2 · The button opens Find a deck", "The card window straight on the view; ← the card goes to its details.", 780)])
 + row("Phone · 390", [ph("p-f0", "F0 · All", "Show them under the line, 44px."), ph("p-f1", "F1 · Free", "Names keep their whole line; the button sits under the tile."), ph("p-f2", "F2 · Find a deck", "The phone card window, on the view.")])))

boards["Ask.dc.html"] = (1700, 3710, "Ask", page("Finding the tools R5: Ask", 1700, 3710,
 head("Q4 · Ask: questions that lead to the tools", "The shipped card search, open over Home. A0 nothing typed: the starter questions above Recent cards. A1 a question: the tools that answer it, above the cards. A3 nothing matches: never a dead end. H4 Home's search panel and H5 its results in place on desktop (R5).")
 + row("Desktop · 1300, the search's dropdown", [dk("d-a0", "A0 · Nothing typed", "Starters above Recent cards; the placeholder says it takes questions.", 760), dk("d-a1", "A1 · A question", "Tools for this: name, cost, the shipped line, your number, where it lands.", 760)])
 + row("Desktop · 1300", [dk("d-a3", "A3 · Nothing matches", "The starters again and About’s tool list.", 760), dk("d-h4", "H4 · Home (R5)", "The panel: accent edge, title, the field at 52px, the fan under the lens.", 780)])
 + row("Desktop · 1300, pressed on Home (R5)", [dk("d-h5", "H5 · Results in place", "Typed on Home: the rail's dropdown, anchored under the Home field. Q9 A.", 1000)])
 + row("Phone · 390, the search sheet", [ph("p-a0", "A0 · Nothing typed", "Starters wrap, 44px each."), ph("p-a1", "A1 · A question", "Three tools; no card names match."), ph("p-a3", "A3 · Nothing matches", "Starters, then About.")])
 + row("Phone · 390", [ph("p-h4", "H4 · Home, phone (R5)", "The panel; the fan beside the title; the starters scroll sideways."), ph("p-a1", "Pressed · the sheet", "The same full-screen search as the magnifier.")])))

boards["Tuning.dc.html"] = (1700, 3920, "Tuning", page("Finding the tools: Tuning", 1700, 3920,
 head("Q2 · Tuning gets a tab", "T0 today's tab row (Tuning is the last section of Analysis, under the whole reading). T1 the Tuning tab's landing. T2 Consider opened inside it, the shipped panel.")
 + row("Today", [dk("d-t0", "T0 · Today", "Your deck · Analysis · Consider · Games · Versions.", 780), ph("p-t0", "T0 · Today, phone", "Same row.")])
 + row("Desktop · 1300", [dk("d-t1", "T1 · Tuning", "Consider full width first; Suggested changes, Mana Balance, Proposed cuts, History as shipped.", 780), dk("d-t2", "T2 · Consider open", "The hub's underline row; the shipped panel under it.", 780)])
 + row("Phone · 390", [ph("p-t1", "T1 · Tuning", "Stacked tiles, Consider first."), ph("p-t2", "T2 · Consider open", "‹ Tuning and 1 of 5 tools; Consider's own toolbar.")])))

boards["Welcome.dc.html"] = (1700, 3700, "Welcome", page("Finding the tools: welcome", 1700, 3700,
 head("Q3 · The welcome credits point at the tools", "H0 Home's strip, unchanged. S0 Where credits work today. S1 proposed: every row lands, the Tuning rows name the tab, Which deck needs it most? lands on the cards in no deck, and a free block names Consider and Find a deck.")
 + row("Desktop · 1300", [dk("d-h0", "H0 · Home's strip", "Unchanged.", 780), dk("d-s0", "S0 · Today", "Overview and Which deck needs it most? have no Try it.", 780)])
 + row("Desktop · 1300", [dk("d-s1", "S1 · Proposed", "Try it on every row; the free block before the teaser.", 780)])
 + row("Phone · 390", [ph("p-h0", "H0 · Home, phone", "Unchanged."), ph("p-s0", "S0 · Today", "The sheet as shipped."), ph("p-s1", "S1 · Proposed", "The free block at the foot.")])))

os.makedirs(out, exist_ok=True)
for n, (w, h, t, html) in boards.items(): open(os.path.join(out, n), "w").write(html)
order = ["Main.dc.html", "Search.dc.html", "Offers.dc.html", "ShowAll.dc.html", "Calm.dc.html", "Order.dc.html", "Home.dc.html", "Ask.dc.html", "Find.dc.html", "Tuning.dc.html", "Welcome.dc.html"]
x = 0; B = {}
for n in order:
    w, h, t, _ = boards[n]; B[n] = {"x": x, "y": 0, "w": w, "h": h, "title": t}; x += w + 120
json.dump({"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-23T17:00:00Z"}, "title": "Finding the tools R12", "launch": {"view": "canvas"}, "pages": [],
  "boards": B, "order": order, "notes": {}, "designSystems": []}, open(os.path.join(out, "canvas.json"), "w"), indent=1)
print("wrote", order)
