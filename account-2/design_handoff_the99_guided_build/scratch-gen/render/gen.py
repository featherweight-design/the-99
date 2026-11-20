"""Guided build R1 boards (account 2, 2026-11-20). Every frame is a PNG of the SHIPPED new-deck screen (CreatePreFilled), commander
page (CommanderDetail) and the Upgrade flow's chrome and step markup, rendered with the shipped CSS from a scratch copy of main with the
proposal patched in (proposal/: build-choice.tsx, guided-flow.tsx, guided-build.ts, patch.diff), Amonkhet theme, shell cut from the
shipped About captures. python3 gen.py <outdir> [heights.json]"""
import os, sys, json
OUT = sys.argv[1]
H = json.load(open(sys.argv[2])) if len(sys.argv) > 2 and os.path.exists(sys.argv[2]) else {}
CSS = r"""
body{margin:0;background:#0A0B0F}
*{box-sizing:border-box}
a{color:#E39A4F}a:hover{color:#F0B57A}
.board{padding:44px 56px 64px;background:#0A0B0F;font-family:'IBM Plex Sans',sans-serif;color:#E6E8F0;display:flex;flex-direction:column;gap:30px}
.bh{display:flex;flex-direction:column;gap:8px;max-width:1500px}
.bh h2{margin:0;font:700 28px 'Chakra Petch',sans-serif}
.k{font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:#8A8FA0}
.cap{font-size:13px;line-height:1.55;color:#A3A8B8;margin:0;text-wrap:pretty}
.cap b,.li b{color:#E6E8F0;font-weight:600}
code{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#E6E8F0;background:#171922;border:1px solid #262A35;border-radius:4px;padding:0 4px}
.row{display:flex;gap:40px;align-items:flex-start}
.fr{display:flex;flex-direction:column;gap:12px;flex:none;width:390px}
.fr.wide{width:650px}
.state{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pill{font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;padding:3px 7px;border-radius:4px}
.pill.now{color:#0E0F14;background:#E39A4F}
.pill.was{color:#A3A8B8;border:1px solid #343843}
.pill.err{color:#0E0F14;background:#E06C5A}
.shot{display:block;width:390px;border-radius:28px;border:1px solid #262A35}
.shot.dk{width:650px;border-radius:12px}
.sub{font:600 17px 'Chakra Petch',sans-serif;color:#E6E8F0;margin:0}
.cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px 44px}
.sec{display:flex;flex-direction:column;gap:10px}
.sec h3{margin:0;font:600 17px 'Chakra Petch',sans-serif;color:#E6E8F0}
ol.li,ul.li{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:13px;line-height:1.55;color:#A3A8B8}
table{border-collapse:collapse;font-size:12.5px;color:#A3A8B8;width:100%}
th,td{border-top:1px solid #262A35;padding:7px 10px 7px 0;text-align:left;vertical-align:top}
th{font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#8A8FA0}
td b{color:#E6E8F0}
.rec{border:1px solid rgba(227,154,79,.55);border-radius:12px;padding:16px 18px;background:#13110E;display:flex;flex-direction:column;gap:10px}
.flow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font:500 12px 'IBM Plex Mono',monospace;color:#A3A8B8}
.flow span.n{border:1px solid #343843;border-radius:6px;padding:6px 9px;color:#E6E8F0}
.flow span.n.hot{border-color:#E39A4F;color:#E39A4F}
"""
FONTS = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;family=Chakra+Petch:wght@500;600;700&amp;display=swap" rel="stylesheet">'
K = "Guided build · R1 · account 2 · 2026-11-20"

def doc(title, w, h, body):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONTS}
<style>{CSS}</style>
</helmet>
<div class="board" style="width: {w}px; min-height: {h}px">
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
"""

def head(h, cap): return f'<div class="bh"><span class="k">{K}</span><h2>{h}</h2><p class="cap">{cap}</p></div>'
def frame(id_, label, img, cap, pill="now", wide=False):
    return (f'<div class="fr {"wide" if wide else ""}"><div class="state"><span class="pill {pill}">{id_}</span>'
            f'<span class="k">{label}</span></div><img class="shot {"dk" if wide else ""}" src="art/{img}.webp" alt="{label}"><p class="cap">{cap}</p></div>')
def row(*f): return '<div class="row">' + "".join(f) + "</div>"
def sub(t): return f'<p class="sub">{t}</p>'

B = {}

B["Main"] = ("Guided build · the calls", 1600, head("Guided build: a free or paid choice for every new deck",
 "Round 1. Every frame below is the shipped screen rendered with the shipped CSS, with the proposal patched in (Amonkhet). Fixture: <b>Ghalta, Primal Hunger</b>, rank 3 in For you, deck name <b>Ghalta Stomps</b>, 15 welcome credits. "
 "The paid run is Upgrade’s engine and chrome: same sheet and 720 dialog, same tracker, same wait, same refunds.")
 + '<div class="flow"><span class="n">For you · Discover</span>›<span class="n">Commander page · Start a deck</span>›<span class="n hot">New deck · How we build it</span>›<span class="n">Strategy › Bracket › Cards</span>›<span class="n">Sharpening</span>›<span class="n">Ready · the plan</span>›<span class="n">The deck</span></div>'
 + '<div class="flow"><span class="n">Help me choose · Start a deck with Ghalta</span>›<span class="n hot">New deck · answers carried</span>›<span class="n">Steps pre-picked, “from your answers”</span></div>'
 + '<div class="flow"><span class="n">Decks · New deck · pick a commander</span>›<span class="n hot">the same three rows</span></div>'
 + '<div class="cols">'
 + '<div class="sec"><h3>1 · Where the choice starts: the new-deck screen</h3><ul class="li">'
   '<li>It is the one screen every route already lands on: For you, Discover, the commander page, Help me choose and Decks › New deck. So the choice lives in one place.</li>'
   '<li>It sits inline under the deck name as three radio rows, <b>How we build it</b>: Free build, Guided build and Just the commander. There is no extra screen before it and no banner.</li>'
   '<li><b>Free build is pre-marked</b> because it is today’s behaviour, free, and one tap as now. Guided is never pre-marked, so a credit is never spent by default.</li>'
   '<li>The press names what happens next: <code>Create deck →</code> for free or empty, and <code>Next · Strategy</code> for guided.</li>'
   '<li>Not on the commander page: Help me choose and the picker never pass through it. Not as a step before both: that would be a whole screen for a choice that fits inline.</li></ul></div>'
 + '<div class="sec"><h3>2 · What the guided build asks</h3><ul class="li">'
   '<li><b>Strategy › Bracket › Cards</b>, in Upgrade’s flow chrome (sheet on a phone, 720 dialog on desktop, bounded tracker, bare ✕).</li>'
   '<li><b>Strategy:</b> up to 3 of the commander’s themes that your own cards back, drawn as Upgrade’s strategy cards (glyph, how many of your cards, one sentence, three examples). Nothing is pre-picked.</li>'
   '<li><b>Bracket:</b> the shipped rungs 2, 3 and 4. Nothing is pre-picked. <b>Combos follow the bracket</b> (2 none, 3 late only, 4 allowed), so there is no separate combo question.</li>'
   '<li><b>Cards:</b> Only cards I own, or Buy some cards (each under $12, Upgrade’s cap). Help me choose’s budget shows as Buy within $N.</li>'
   '<li><b>Cards to avoid: not asked.</b> Every card lands in a deck you can edit, and a search-and-pick step costs more than it saves. It is easy to add later.</li>'
   '<li><b>The free build sees none of it.</b> It still takes Help me choose’s answers, as shipped.</li></ul></div>'
 + '<div class="sec"><h3>3 · A true “start empty”: yes</h3><ul class="li">'
   '<li><b>Just the commander</b> is the third row, and it is free: “Ghalta and 99 empty slots. Build it your way.”</li>'
   '<li>Today the only way there is to fill the deck and then sweep it with Clear all auto. That sweep’s own copy (“Back to just the commander”) already names this state.</li></ul></div>'
 + '<div class="sec"><h3>4 · The commander page stops promising a build</h3><ul class="li">'
   '<li><b>Phone:</b> the bar loses <code>READY TO BUILD</code> and “We’ll build the whole 99, as far as your collection reaches”. It keeps the synergy picks line, when there are picks, and one button: <code>Start a deck →</code>.</li>'
   '<li><b>Desktop:</b> the button becomes <code>Start a deck →</code> and the seed note under it goes.</li>'
   '<li>The page now reads as a commander’s page with one way to start a deck, close to the public page. How the deck is built is chosen on the next screen.</li>'
   '<li><b>Role Coverage and EDHREC Synergy stay</b>, with the + picks. The line under the button reads <code>Your 3 go into the new deck.</code></li><li>The picks show on the new-deck screen above the three options, and every option keeps them: Free fills around them, Guided never cuts them, and Just the commander starts with them (board P-Picks).</li></ul></div>'
 + '<div class="sec"><h3>5 · Not enough credits</h3><ul class="li">'
   '<li>The Guided row stays visible but is off. It says why in <code>--warning</code>: “A guided build uses 2 credits, and you have 1.”</li>'
   '<li>With payments on, it shows the shipped <code>Get more credits →</code>. With payments off, it says free credits alone can’t run one, and shows no link.</li>'
   '<li>The other two rows are untouched. This follows Upgrade’s credits path.</li></ul></div>'
 + '<div class="sec"><h3>6 · Help me choose carries in, visibly</h3><ul class="li">'
   '<li>The shipped <b>Built from your answers</b> block stays above the name, and it still drives the free build.</li>'
   '<li>Choosing Guided opens the flow with every answer already picked and marked <code>from your answers</code>: the theme becomes the strategy, the bracket the bracket, owned-only becomes Only cards I own, and the budget becomes Buy within $60.</li>'
   '<li>A build-around card is listed under <b>It keeps</b>, and the run never cuts it. Every pick can still be changed.</li></ul></div>'
 + '<div class="sec"><h3>7 · The paid run</h3><ul class="li">'
   '<li>The confirm is <code>Build toward Big creatures</code>, with <code>uses 2 · 15 welcome credits</code> beside it, as in Upgrade.</li>'
   '<li><b>The deck is created at the confirm</b>, with the free fill, so nothing can be lost. The engine then sharpens 12 to 18 cards and writes the plan.</li>'
   '<li>The wait has three steps: Filled ✓, Sharpening (with v2’s clock) and Writing the plan.</li>'
   '<li>✕ leaves while the run goes on. Until it is done, the deck’s tile and page show Upgrade’s running line, <code>Sharpening toward Big creatures · 0:05</code>.</li></ul></div>'
 + '<div class="sec"><h3>8 · Ready, short, failed</h3><ul class="li">'
   '<li><b>Ready:</b> four facts (Strategy, Bracket, Sharpened, To buy), then <b>The plan</b> in the Overview’s Early, Mid and Close shape, with a lead card for each, then <code>Open Ghalta Stomps</code>. The plan is the deck’s Overview, so there is no separate write.</li>'
   '<li>There is no swap review. You never saw the free fill, so a list of cuts from it means nothing. The sharpened cards are in the deck, and you can clear any of them.</li>'
   '<li><b>Short</b> (fewer than 12): both credits come back, and the cards it found stay in the deck.</li>'
   '<li><b>Failed:</b> both credits come back and the deck keeps the free build. The presses are Try again (2 credits, same picks) and Open the deck.</li></ul></div>'
 + '</div>'
 + '<div class="rec"><span class="k">Gaps for engineering</span><table><tr><th>#</th><th>Gap</th></tr>'
   '<tr><td><b>G1</b></td><td><code>createDeck</code> takes a build kind (free, guided or empty). Empty skips <code>planFill</code>, and the deck starts at the commander alone.</td></tr>'
   '<tr><td><b>G2</b></td><td>The guided run is Upgrade’s engine over the new deck’s free fill (a deck list in place of a precon list). Strategies come from the commander’s themes, backed by owned cards (<code>MIN_BACKING</code>, <code>MAX_STRATEGIES</code>). Runs are keyed per deck.</td></tr>'
   '<tr><td><b>G3</b></td><td>The run writes the plan and stores it as the deck’s Overview in the stages shape. It goes inside the 2 credits, replacing the separate Overview write.</td></tr>'
   '<tr><td><b>G4</b></td><td>The pool input: owned only, the $12 per-card cap, or Help me choose’s total budget. Today the engine has only the per-card cap.</td></tr>'
   '<tr><td><b>G5</b></td><td>Kept cards (the build-around card and the commander page’s synergy picks) go in as locked. The validator refuses a cut of any of them.</td></tr>'
   '<tr><td><b>G6</b></td><td>The run’s state on the deck (running, short or failed), for the tile and the page after the player leaves the flow.</td></tr>'
   '<tr><td><b>G7</b></td><td>Refunds as in Upgrade: a failed run, or fewer than 12 cards sharpened.</td></tr>'
   '<tr><td><b>G8</b></td><td>The commander page’s copy: <code>stickyLabel</code>, <code>stickyPromise</code> and <code>seedNote</code> retire, and the button reads <code>Start a deck →</code>.</td></tr></table></div>'
 + '<div class="rec"><span class="k">For Hugh</span><ul class="li">'
   '<li>Free build pre-marked (drawn), or nothing marked so the player always chooses?</li>'
   '<li>The Ready screen shows the facts and the plan, not the list of sharpened cards (drawn). Should it list the cards?</li>'
   '<li>Cards to avoid is left out of R1. Should it be in?</li></ul></div>'
 + '<p class="cap">Art: Ghalta, Polyraptor, Beorn the Fierce, Cemetery Prowler, Avabruck Caretaker and Avenger of Zendikar are cut from earlier rounds’ card images (Scryfall is blocked). The +1/+1 Counters card shows only the two examples with clean art.</p>')

B["E-Entries"] = ("Entry points and the commander page", 1960, head("Entry points, and the commander page (call 4)",
 "For you and Discover rows open the commander page, as shipped. On the page, the only change is the build promise: the page has one way to start a deck and makes no claim about how it will be built.")
 + sub("For you and Discover, shipped (rows open the commander page)")
 + row(frame("E1", "For you · phone", "e-foryou-p", "Select a row to open its commander page.", "was"),
       frame("E2", "Discover · phone", "e-discover-p", "The same page, from Discover.", "was"),
       frame("E1d", "For you · 1300", "e-foryou-d", "Desktop rows open the same page.", "was", True))
 + sub("The phone bar at the end of the commander page: shipped, then proposed")
 + row(frame("C0", "Shipped · phone, page end", "gb-cp-p", "<code>READY TO BUILD</code> and “We’ll build the whole 99…”, then <code>Build this deck →</code>.", "was"),
       frame("C1", "Proposed · phone, page end", "gb-cp-g-p", "The label and the promise go. One button: <code>Start a deck →</code>. With synergy picks, the shipped picks line sits to its left."),
       frame("C0d", "Shipped · 1300", "gb-cp-d", "<code>Build this deck →</code> with the seed note under it.", "was", True))
 + row(frame("C1d", "Proposed · 1300", "gb-cp-g-d", "<code>Start a deck →</code>, and the seed note goes. The Hide line moves up under the button.", "now", True)))

B["P-Picks"] = ("Picks carry into every build", 2200, head("Synergy picks: kept on the commander page, carried into every build",
 "Role Coverage and EDHREC Synergy stay as shipped, with the + picks. The line under the button now says where the picks go, not how the rest is built. The new-deck screen shows the picks above the three options, and each option keeps them. Fixture: Avenger of Zendikar (not owned), Polyraptor and Beorn the Fierce.")
 + sub("The commander page with 3 picks")
 + row(frame("P1", "Phone · page end", "gb-cpk-p", "The picks are ticked in EDHREC Synergy. The bar reads <code>Your 3 go into the new deck.</code>, the shipped not-owned line and Clear selection, then <code>Start a deck →</code>."),
       frame("P1d", "1300 · whole page", "gb-cpk-d", "The same line under <code>Start a deck →</code>. Role Coverage and EDHREC Synergy are unchanged.", "now", True))
 + sub("The new-deck screen with the picks carried")
 + row(frame("P2", "Free · phone", "gb-nk-free-p", "<b>Your picks · 3</b> shows the cards at card shape, each one opening card details. A card you don't own says so. <code>Change on Ghalta’s page</code> goes back with the picks kept. Free fills the rest of the 99 around them."),
       frame("P3", "Guided · phone", "gb-nk-guided-p", "Guided keeps them too: the Cards step lists them under <b>It keeps</b> (board G4), and the run never cuts them."),
       frame("P4", "Just the commander · phone", "gb-nk-empty-p", "Ghalta, the 3 picks and 96 empty slots."))
 + row(frame("P2d", "Free · 1300", "gb-nk-free-d", "The picks box sits in the form column above How we build it.", "now", True))
 + '<p class="cap">After the deck is made, every option opens the shipped deck page, where cards are added and cleared by hand as today.</p>')

B["N-Choice"] = ("New deck · How we build it", 2200, head("New deck: how we build it (calls 1 and 3)",
 "The choice sits inline under the deck name, in Upgrade’s option-row shape, each row led by a line icon on the intro’s medallion. Free is pre-marked. The press names what comes next.")
 + row(frame("N1", "Free · pre-marked · phone", "gb-n-free-p", "Today’s fill, one tap as now: <code>Create deck →</code>."),
       frame("N2", "Guided · phone", "gb-n-guided-p", "The cost sits in the row in accent mono, with the refund line under it. The press becomes <code>Next · Strategy</code>, which opens the flow."),
       frame("N3", "Just the commander · phone", "gb-n-empty-p", "Ghalta and 99 empty slots, free: <code>Create deck →</code>."))
 + row(frame("N1d", "Free · 1300", "gb-n-free-d", "The same three rows, in the form column under Deck name.", "now", True),
       frame("N2d", "Guided · 1300", "gb-n-guided-d", "Guided picked. <code>Next · Strategy</code> opens the 720 dialog.", "now", True)))

B["N-Credits"] = ("New deck · not enough credits", 1200, head("Not enough credits (call 5)",
 "The Guided row stays in place but is off, with no radio. It says why, and shows Get more credits while payments are on. Free and Just the commander are untouched.")
 + row(frame("N4", "1 credit · payments on · phone", "gb-n-short-p", "<code>--warning</code> line, then the shipped <code>Get more credits →</code>."),
       frame("N5d", "1 credit · payments off · 1300", "gb-n-off-d", "The line says free credits alone can’t run one, and there is no link.", "now", True)))

B["G-Steps"] = ("Guided build · the steps", 2600, head("The guided steps: Strategy › Bracket › Cards (call 2)",
 "Upgrade’s chrome and step markup, with this flow’s words. Nothing is pre-picked, and Next stays off until a pick. The last step’s press is the confirm, and the credit line sits beside it.")
 + row(frame("G0", "Strategy · nothing picked", "gb-g-strategy0-p", "Up to 3 strategies your cards back. <code>Next · Bracket</code> is off."),
       frame("G1", "Strategy · picked", "gb-g-strategy-p", "Big creatures is picked. The tracker cell fills in once you move on."),
       frame("G2", "Bracket", "gb-g-bracket-p", "The shipped rungs 2, 3 and 4. Combos follow the bracket, so this one pick covers them."),
       frame("G3", "Cards · the confirm", "gb-g-cards-p", "<code>Build toward Big creatures</code>, with <code>uses 2 · 15 welcome credits</code>."),
       frame("G4", "Cards · with synergy picks", "gb-g-cards-picks-p", "The commander page’s two picks are listed under <b>It keeps</b>, and the run never cuts them."))
 + row(frame("G1d", "Strategy · 1300", "gb-g-strategy-d", "Two columns, as Upgrade draws them.", "now", True),
       frame("G2d", "Bracket · 1300", "gb-g-bracket-d", "The climb’s 186px label column.", "now", True),
       frame("G3d", "Cards · 1300", "gb-g-cards-d", "The line on the left, Back and the confirm on the right.", "now", True)))

B["R-Run"] = ("Guided build · the run", 2600, head("The paid run: progress, ready, short, failed (calls 7 and 8)",
 "The deck exists from the confirm, filled for free. The run sharpens 12 to 18 cards and writes the plan, and both credits come back on a failed or short run.")
 + row(frame("R1", "Sharpening · 0:04", "gb-g-wait-p", "Filled ✓, then sharpening with v2’s clock and the sweep. ✕ leaves, and the run continues."),
       frame("R2", "Writing the plan · 0:09", "gb-g-wait2-p", "The second step is done, and the plan is being written."),
       frame("R3", "Ready", "gb-g-result-p", "Four facts, then the plan in the Overview’s stages shape, then <code>Open Ghalta Stomps</code>."),
       frame("R4", "Short · 9 sharpened", "gb-g-short-p", "Both credits come back, and the 9 stay in the deck. The plan is still written.", "err"),
       frame("R5", "Failed", "gb-g-failed-p", "Both credits come back, and the deck keeps the free build. Try again (2 credits, same picks) or Open the deck.", "err"))
 + row(frame("R1d", "Sharpening · 1300", "gb-g-wait-d", "The dialog over the new-deck page.", "now", True),
       frame("R3d", "Ready · 1300", "gb-g-result-d", "The stages run across, as the Overview draws them at md.", "now", True),
       frame("R5d", "Failed · 1300", "gb-g-failed-d", "The line on the left, the two presses on the right.", "err", True)))

B["H-HelpMeChoose"] = ("From Help me choose", 2600, head("From Help me choose: the answers carry in, visibly (call 6)",
 "Answers asked: theme Big creatures, built around Avenger of Zendikar, budget $60, bracket 3. The shipped block stays. With Guided chosen, each step opens already picked and says so.")
 + row(frame("H1", "New deck from results · phone", "gb-h-page-p", "The shipped <b>Built from your answers</b> block, then Guided. The way back stays <code>Back to results</code>."),
       frame("H2", "Strategy · from your answers", "gb-h-strategy-p", "The theme is picked and marked. Every cell in the tracker is already done."),
       frame("H3", "Bracket · from your answers", "gb-h-bracket-p", "3 · Upgraded is picked and marked."),
       frame("H4", "Cards · budget and kept card", "gb-h-cards-p", "<code>Buy within $60</code>, and Avenger of Zendikar is listed under <b>It keeps</b>."),
       frame("H5", "Ready · with buys", "gb-h-result-p", "To buy: 5 · $41.80, inside the $60."))
 + row(frame("H1d", "New deck from results · 1300", "gb-h-page-d", "The block sits above the name in the form column, as shipped.", "now", True),
       frame("H4d", "Cards · 1300", "gb-h-cards-d", "The same step at desktop.", "now", True)))

os.makedirs(OUT, exist_ok=True)
layout = {}
y = 0
for name, (title, w, body) in B.items():
    h = H.get(name, 2000)
    open(f"{OUT}/{name}.dc.html", "w").write(doc(title, w, h, body))
    layout[name + ".dc.html"] = {"x": 0, "y": y, "w": w, "h": h, "title": title}
    y += h + 120
json.dump(layout, open(f"{OUT}/_layout.json", "w"))
print(list(B))
