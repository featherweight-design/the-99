"""Precon Upgrade addendum fresh start, R1 boards (account 2, 2026-11-15). Every frame is a PNG of the SHIPPED UpgradeFlow,
ResultView and HistoryView rendered with the shipped CSS from a scratch copy of main, with the proposal patched in
(proposal/last-run.tsx; fspatch.diff), over the precon page drawn from the up2 kit (Low Sun).
python3 fs.py <outdir>"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fs_base import CSS, head, frame
OUT = sys.argv[1]
FONTS = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;family=Chakra+Petch:wght@500;600;700&amp;display=swap" rel="stylesheet">'
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
K = "Precon Upgrade · addendum fresh start · R1c · account 2 · 2026-11-15"
def row(*frames): return '<div class="row">' + "".join(frames) + "</div>"
def sub(t): return f'<p class="sub">{t}</p>'
B = {}

CALLS = [
 ("Every return opens on the start screen", "The press opens the intro whatever runs are kept, on the precon page and on the deck page's band. This retires today's rule (the newest result until a deck is started from it) and the after-History <code>fresh</code> flag. A first-time reader sees the intro exactly as shipped."),
 ("The start screen says what happened last", "One block above the intro's lead: the mono kicker <i>Your last upgrade</i> (History's month-heading style) over History's own row for the newest kept run, at its stronger edge. Opening it is free and shows the result with <i>‹ Back</i> to the start screen. Nothing else on the intro moves."),
 ("Past runs stay one press away", "The title row's <b>History</b> link (shipped glyph) stays on the start screen and on a fresh result; it lists every run, as shipped. The start screen shows only the newest run, so there's one way to the list and one way to the last run."),
 ("Each row says where its run went", "On the start screen and in History alike, the row's second line adds <i>in Prismari Artistry</i> (faint) once a deck was started from the run or its swaps were applied, or <i>no deck yet</i> in <code>--accent-text</code> while it's still unused. One row component, so the two lists always agree."),
 ("Applied: open it, start again if you like", "Opened, the result keeps its press live, as History does today (a second deck from the same swaps is allowed), under a dashed note: <i>Already in Prismari Artistry. Opening it again uses no credit.</i> That note replaces History's <i>A past upgrade, read-only</i>, which was wrong because the press under it works. An unused run draws no note."),
 ("Not applied: still yours to apply", "Yes, it stays reachable. The row says <i>no deck yet</i>; opened, <b>Start the deck with these 14 swaps</b> (precon page) or <b>Apply these 14 swaps</b> (deck page) is live, with <b>Try another strategy</b> beside it. A run over an old list keeps the shipped <code>listChanged</code> line and its press off."),
 ("In progress: it resumes", "Unchanged from A3. The press reads <i>Upgrading toward Tokens · 0:05</i> and opens on the wait. No start screen while a run is in flight, because a second run can't start (<code>inFlight</code>)."),
 ("Landed while away: shown once", "The first open after a run lands shows its result, as A3 drew it (tracker, History link, pulse on the press). From then on it's <i>Your last upgrade</i> on the start screen. Seen means shown in the flow once, including a run that lands while the flow is open (G25)."),
 ("Swap rows use the allocation chips, where the card row puts them", "R1b (Hugh: the marker sat in the wrong spot). In place of <i>you own it</i>, each side follows the shipped one-line row's All order: name and marks, then the availability marker and the buy tag flowing left of the fixed pip track. An add you own with a copy free draws nothing past the owned dot; a copy held by another deck draws <i>◆ none free</i>; an add to buy draws the All row's bare <code>$</code> (its price in the tooltip, as in All). The run's total stays in the To buy fact."),
 ("Pick which swaps to keep (R1c, #2985)", "Each swap's reason line ends with the shipped Suggested changes Pick toggle (<code>suggested-changes-pick-line.tsx</code>: 44px phone, 32px desktop), every swap starting <b>✓ Picked</b>. Unpicked: the toggle reads <b>Pick</b> with its empty box, both sides dim, and the line says <i>Not picked. Sai, Master Thopterist stays in the deck.</i> The title adds <i>3 not picked</i>; To buy, Already yours, the Bracket fact and the press (<i>Start the deck with these 11 swaps</i>, or Apply) follow the picked pairs. If they no longer reach the bracket chosen, one line says so: <i>Without the swaps you didn't pick, it plays at bracket 2, under the 3 you chose.</i> Pairs stay whole, so the deck stays at 99. Free, no confirm, kept with the run (G28). None picked: the press goes off. The commander pair has no toggle: who leads is a step."),
 ("The deck page gets the same start screen", "Inside the band's flow, with A2c's intro line and Apply. A run already applied to another deck from this precon reads <i>in Muddle Tokens</i> and can still apply here."),
]
GAPS = [
 ("G25", "Seen per run", "Store when a result was first shown (<code>seenAt</code> on the run, server-side so another device agrees). <code>useUpgradeRun</code>'s view becomes: pending → wait; newest done and unseen → its result; else the start screen."),
 ("G26", "Which deck a run went into", "<code>readStartedRuns</code> returns the deck's id and name, not just a yes. Several decks from one run: name the newest. A deck since deleted: the run reads <i>no deck yet</i>."),
 ("G28", "Picked swaps per run (#2985)", "Store the unpicked pairs on the run, server-side. Start (<code>prepareUpgradeIn</code>/<code>applyUpgradeIn</code>) and Apply (<code>applyUpgradeOnDeck</code>) take a subset of the stored pairs, checked on the server; Undo restores exactly what was applied. The bracket fact is re-read for the picked pairs (<code>bracketsOf</code>). The short-run line and refund describe the run as found."),
 ("G27", "Retire the old opening rules", "Drop <code>started</code> as the press's opening rule and the <code>fresh</code> flag; History's <i>New upgrade</i> keeps its job. Update the A3/A2c tests that expect the press to reopen the newest result."),
]
MUST = [
 "Never reopen an old result on its own: the only result the press opens by itself is one the reader hasn't seen.",
 "Never hide History on the start screen, and never add a second way to the list.",
 "Never lock a past run: opening one is free, and its Start or Apply stays live while the list still fits.",
 "Never block a new run because an unused one exists.",
 "No status chip or stamp on the row: the words go on its existing mono line.",
]
def cols(items, numbered=True):
    return "".join(f'<div class="sec"><h3>{i+1}. {h}</h3><p class="cap">{t}</p></div>' if numbered else f'<div class="sec"><h3>{h}</h3><p class="cap">{t}</p></div>' for i, (h, t) in enumerate(items))
main = head(K, "Coming back to Upgrade starts fresh, with the last run in reach",
  "Hugh: <i>“When running Precon Upgrade on a deck and coming back, it's still at the end state of the last run. Should we show a new Precon Upgrade screen instead to start the flow over with history accessible?”</i> Yes. R1b: allocation marker moved to the card row's spot. R1c (#2985): pick which swaps to keep, with Suggested changes' Pick toggle. Every frame is the shipped flow rendered with the shipped CSS (Low Sun) with the proposal patched in, over the precon page. Fixture as R2d: Prismari Artistry, Muddle at bracket 3, three kept runs. Copy is DRAFT for /copy-review.")
main += '<div class="rec"><span class="k">The answer in one line</span><p class="cap"><b>The press always opens on the start screen</b>, which leads with <i>Your last upgrade</i> as a History row that says where it went; History stays in the title row; a run in flight still resumes, and a result that landed while you were away shows once.</p></div>'
main += sub("Design's calls") + '<div class="cols">' + cols(CALLS) + "</div>"
main += sub("Gaps for engineering") + '<table><tr><th>Gap</th><th>What</th><th>Detail</th></tr>' + "".join(f"<tr><td><b>{g}</b></td><td><b>{w}</b></td><td>{d}</td></tr>" for g, w, d in GAPS) + "</table>"
main += sub("Must-nots") + '<ul class="li">' + "".join(f"<li>{m}</li>" for m in MUST) + "</ul>"
main += sub("Boards") + '<table><tr><th>Board</th><th>Holds</th></tr>' + "".join(f"<tr><td><b>{b}</b></td><td>{h}</td></tr>" for b, h in [
  ("F1-Applied", "A finished run that went into a deck: start screen and the opened result, 390 and 1300"),
  ("F2-Not-Applied", "A finished run with no deck yet: start screen, opened result, swap rows with chips, picking which swaps to keep; precon page and deck page, 390 and 1300"),
  ("F3-In-Progress", "A run in flight resumes on the wait; a run that landed while away shows once, 390 and 1300"),
  ("F4-History", "History with where each run went, and the first-time intro unchanged, 390 and 1300")]) + "</table>"
B["Main.dc.html"] = ("Calls", 1600, main)

W2 = 2 * 390 + 2 * 650 + 3 * 40 + 112
B["F1-Applied.dc.html"] = ("F1 applied", W2, head(K, "F1 · A finished run that went into a deck",
  "The last run was used: a deck was started from it on the precon page, or its swaps were applied on a deck. The reader lands on the start screen, where the row says <i>in Prismari Artistry</i>. Pressing <b>Next · Commander</b> starts a new upgrade; pressing the row opens the run for free.")
  + row(frame("F1", "Start screen · 390", "applied-p", "<b>Your last upgrade</b> above the intro, as History's row. The intro below is unchanged, so <b>Next · Commander</b> is still the one press."),
        frame("F1·o", "Opened · 390", "applied-open-p", "<b>‹ Back</b> returns to the start screen. The dashed note says it's already in a deck and costs nothing to open again. Start stays live."),
        frame("F1", "Start screen · 1300", "applied-d", "The same in the 720 dialog. History in the title row, before the bare ✕."),
        frame("F1·o", "Opened · 1300", "applied-open-d", "No tracker and no History link on a run opened from the start screen, as for a run opened from History.")))

W3 = 3 * 390 + 2 * 650 + 4 * 40 + 112
B["F2-Not-Applied.dc.html"] = ("F2 not applied", W3, head(K, "F2 · A finished run with no deck yet: still yours to apply",
  "The reader ran an upgrade and left without starting a deck or applying it. The row says <i>no deck yet</i> in accent ink. Opened, its press is live. On the deck page it's the same screen in the band's flow, with A2c's last intro line and <b>Apply these 14 swaps</b>.")
  + sub("On the precon page")
  + row(frame("F2", "Start screen · 390", "open-p", "<i>no deck yet</i> in <code>--accent-text</code>: the one word on the row that says it can still be used."),
        frame("F2·o", "Opened · 390", "open-open-p", "The result as shipped, with <b>‹ Back</b>. No note: nothing about it is read-only."),
        frame("F2·o", "Swap rows · 390", "open-open-p-scrolled", "<b>Allocation chips</b>: Brainstorm and Preordain to buy (collapsed buy tag and price); Lightning Bolt owned but held by another deck (<i>◆ none free</i>); Ponder owned and free, so nothing past the owned dot."),
        frame("F2", "Start screen · 1300", "open-d", ""),
        frame("F2·o", "Opened · 1300", "open-open-d", "<b>Start the deck with these 14 swaps</b> live, <b>Try another strategy | 2 credits</b> beside it."))
  + sub("Picking which swaps to keep (R1c, #2985)")
  + row(frame("F2·r", "One unpicked · 390", "rejected-p-scrolled", "Brainstorm unpicked: both sides dim and the toggle reads <b>Pick</b>. Every other swap shows <b>✓ Picked</b>. The marker (<i>◆ none free</i>) and the <code>$</code> sit left of the pips, as on the deck row."),
        frame("F2·r", "Facts recount · 1300", "rejected-d", "<i>13 swaps toward Spells · 1 not picked</i>; To buy 10, and the press counts 13."),
        frame("F2·b", "Under the chosen bracket · 1300", "rej-below-d", "Three unpicked, and what's left plays at 2: the Bracket fact reads <i>2 → 2</i> and one line says it's under the 3 chosen. Nothing is blocked."),
        frame("F2d·r", "Deck page · 1300", "deck-rejected-d-scrolled", "<b>Apply these 13 swaps</b>: the unpicked cut stays in the deck."))
  + sub("On the deck page (band's flow, A2c)")
  + row(frame("F2d", "Start screen · 390", "deck-open-p", "A2c's last intro line: <i>Nothing changes until you apply the swaps.</i>"),
        frame("F2d·o", "Opened · 390", "deck-open-open-p", "<b>Apply these 14 swaps</b>, one press and one Undo, as A2c."),
        frame("F2d·o", "Swap rows · 390", "deck-open-open-p-scrolled", "The same chips."),
        frame("F2d", "Start screen · 1300", "deck-open-d", ""),
        frame("F2d·o", "Opened · 1300", "deck-open-open-d", "")))

B["F3-In-Progress.dc.html"] = ("F3 in progress", W2, head(K, "F3 · A run still in progress resumes; one that landed while away shows once",
  "Nothing new to draw for the wait itself: A3's press label (<i>Upgrading toward Tokens · 0:05</i>) and wait view, unchanged. What's new is what follows. When the run lands with the window closed, the press pulses twice (A3, G21), and the next open shows that result once. Every open after that is F2's start screen, with this run as <i>Your last upgrade</i>.")
  + row(frame("F3", "Running · 390", "wait-p", "Opens on the wait, as shipped. Close whenever: the run keeps going, 2 credits held."),
        frame("F3·l", "Landed, first open · 390", "landed-p", "The fresh result with its tracker and History link, as A3. Showing it marks it seen (G25).", pill="was"),
        frame("F3", "Running · 1300", "wait-d", ""),
        frame("F3·l", "Landed, first open · 1300", "landed-d", "Next open: the start screen, this run on top (F2).", pill="was")))

B["F4-History.dc.html"] = ("F4 history", W2, head(K, "F4 · History says where each run went, and a first visit is unchanged",
  "History is the shipped list, reached from the title row on the start screen and on a fresh result. Its rows are the start screen's row, so each one now says where it went. <b>New upgrade</b> at its foot is unchanged. The first-time intro has no runs to show, so it's exactly as shipped.")
  + row(frame("F4", "History · 390", "history-p", "<i>no deck yet</i> on the Spells run and on the short Rootha run (credits back, still startable); <i>in Muddle Tokens</i> on the Tokens run."),
        frame("S0", "First visit · 390", "first-p", "No runs, no block. The intro as shipped.", pill="was"),
        frame("F4", "History · 1300", "history-d", ""),
        frame("S0", "First visit · 1300", "first-d", "", pill="was")))

os.makedirs(OUT, exist_ok=True)
for name, (title, w, body) in B.items():
    open(os.path.join(OUT, name), "w").write(doc(title, w, 1200, body))
print(json.dumps({k: v[1] for k, v in B.items()}))
