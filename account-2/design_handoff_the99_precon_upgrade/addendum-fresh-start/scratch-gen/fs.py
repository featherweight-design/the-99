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
K = "Precon Upgrade · addendum fresh start · R2 · account 2 · 2026-11-18"
def row(*frames): return '<div class="row">' + "".join(frames) + "</div>"
def sub(t): return f'<p class="sub">{t}</p>'
B = {}

CALLS = [
 ("Every return opens on the start screen", "The press opens the intro whatever runs are kept, on the precon page and on the deck page's band. This retires today's rule (the newest result until a deck is started from it) and the after-History <code>fresh</code> flag. A first-time reader sees the intro exactly as shipped."),
 ("The start screen says what happened last", "One block above the intro's lead: the mono kicker <i>Your last upgrade</i> (History's month-heading style) over History's own row for the newest kept run, at its stronger edge. Opening it is free and shows the result with <i>‹ Back</i> to the start screen. Nothing else on the intro moves."),
 ("Past runs stay one press away", "The title row's <b>History</b> link (shipped glyph) stays on the start screen and on a fresh result; it lists every run, as shipped. The start screen shows only the newest run, so there's one way to the list and one way to the last run."),
 ("Each row says where its run went", "On the start screen and in History alike, the row's second line adds <i>in Prismari Artistry</i> (faint) once a deck was started from the run or its swaps were applied, or <i>no deck yet</i> in <code>--accent-text</code> while it's still unused. One row component, so the two lists always agree."),
 ("Applied: open it, start again if you like", "Opened, the result keeps its press live, as History does today (a second deck from the same swaps is allowed), under a dashed note: <i>Already in Prismari Artistry. Opening it again uses no credit.</i> That note replaces History's <i>A past upgrade, read-only</i>, which was wrong because the press under it works. An unused run draws no note."),
 ("Not applied: still yours to apply", "Yes, it stays reachable. The row says <i>no deck yet</i>; opened, <b>Start the deck with these 14 swaps</b> (precon page) or <b>Apply these 14 swaps</b> (deck page) is live, with <b>Try another strategy</b> after the lists. A run over an old list keeps the shipped <code>listChanged</code> line and its press off."),
 ("In progress: it resumes", "Unchanged from A3. The press reads <i>Upgrading toward Tokens · 0:05</i> and opens on the wait. No start screen while a run is in flight, because a second run can't start (<code>inFlight</code>)."),
 ("Landed while away: shown once", "The first open after a run lands shows its result, as A3 drew it (tracker, History link, pulse on the press). From then on it's <i>Your last upgrade</i> on the start screen. Seen means shown in the flow once, including a run that lands while the flow is open (G25)."),
 ("The result is Suggested changes' results, reused (R2)", "Hugh: a run is a list of adds and a list of cuts, not pairs to keep or drop. Under the run's head (title, the four facts as found, the commander pair) the swaps are drawn by the shipped <code>SuggestedChangesRun</code>: <b>Additions</b> and <b>Cuts</b> side by side on desktop and behind the <b>Additions | Cuts</b> switch on a phone, grouped by type or role, each row the shipped pick line (art, name, allocation marker and buy tag, reason, <b>✓ Picked</b> / <b>Pick</b>), with the counts chip <i>13 of 14 chosen</i> on each side. So a player can keep Sai, Master Thopterist and still cut Wizard's Staff for Counterspell."),
 ("Every card starts picked; the counts must match", "A run is the plan the player paid for, so all 14 of each start <b>✓ Picked</b> (the Suggested changes rule otherwise: up to N of each). The pinned bar is Suggested changes' own: <i>+13 in −13 out · stays at 99 · bracket 2 → 3 · Upgraded, as asked</i>. Uneven counts turn the press off with the shipped line <i>14 in, 13 out. Pick 1 more cut to apply, so the deck stays at 99.</i> Dropping the pick that moved the bracket gives the shipped warning, and the press stays on. Picks are free and kept with the run (G28)."),
 ("One press, in the bar", "The bar's Apply place carries the flow's own press: <b>Start the deck with these 13 swaps</b> on the precon page (no confirm, as today) and <b>Apply these 13 swaps</b> on the deck page. The flow's foot is retired on the result; <b>Try another strategy | 2 credits</b> moves to the end of the lists. The <i>You asked</i> box is left out: the facts strip already says what the run was for."),
 ("The deck page gets the same start screen", "Inside the band's flow, with A2c's intro line and Apply. A run already applied to another deck from this precon reads <i>in Muddle Tokens</i> and can still apply here."),
]
GAPS = [
 ("G25", "Seen per run", "Store when a result was first shown (<code>seenAt</code> on the run, server-side so another device agrees). <code>useUpgradeRun</code>'s view becomes: pending → wait; newest done and unseen → its result; else the start screen."),
 ("G26", "Which deck a run went into", "<code>readStartedRuns</code> returns the deck's id and name, not just a yes. Several decks from one run: name the newest. A deck since deleted: the run reads <i>no deck yet</i>."),
 ("G28", "Picked adds and cuts per run (#2985)", "Store the unpicked cards per side on the run, server-side. Map the stored pairs to <code>LineItem</code>s (the pair's reason on the add; a cut reason per cut, which the run must now write) with <code>typeGroup</code>, <code>role</code>, price, availability and <code>bracketAfter</code>. Start (<code>prepareUpgradeIn</code>/<code>applyUpgradeIn</code>) and Apply (<code>applyUpgradeOnDeck</code>) take <code>{adds, cuts}</code>: subsets of the run, equal in count, checked on the server; Undo restores exactly what was applied. The bar's set read (<code>actions.setBracket</code>) reads the picked set's bracket. The short-run line and refund describe the run as found."),
 ("G27", "Retire the old opening rules", "Drop <code>started</code> as the press's opening rule and the <code>fresh</code> flag; History's <i>New upgrade</i> keeps its job. Update the A3/A2c tests that expect the press to reopen the newest result."),
]
MUST = [
 "Never reopen an old result on its own: the only result the press opens by itself is one the reader hasn't seen.",
 "Never hide History on the start screen, and never add a second way to the list.",
 "Never lock a past run: opening one is free, and its Start or Apply stays live while the list still fits.",
 "Never block a new run because an unused one exists.",
 "No status chip or stamp on the row: the words go on its existing mono line.",
 "Never fork Suggested changes' results into an Upgrade copy: one component, one pick line, one bar.",
 "Never start or apply uneven counts: the deck stays at 99.",
]
def cols(items, numbered=True):
    return "".join(f'<div class="sec"><h3>{i+1}. {h}</h3><p class="cap">{t}</p></div>' if numbered else f'<div class="sec"><h3>{h}</h3><p class="cap">{t}</p></div>' for i, (h, t) in enumerate(items))
main = head(K, "Coming back to Upgrade starts fresh, with the last run in reach",
  "Hugh: <i>“When running Precon Upgrade on a deck and coming back, it's still at the end state of the last run. Should we show a new Precon Upgrade screen instead to start the flow over with history accessible?”</i> Yes. R2 (Hugh, 2026-11-18, with #2985): the result reuses Suggested changes' results, so adds and cuts are picked separately. Every frame is the shipped flow rendered with the shipped CSS (Low Sun) with the proposal patched in, over the precon page. Fixture as R2d: Prismari Artistry, Muddle at bracket 3, three kept runs. Copy is DRAFT for /copy-review.")
main += '<div class="rec"><span class="k">The answer in one line</span><p class="cap"><b>The press always opens on the start screen</b>, which leads with <i>Your last upgrade</i> as a History row that says where it went; History stays in the title row; a run in flight still resumes, and a result that landed while you were away shows once.</p></div>'
main += sub("Design's calls") + '<div class="cols">' + cols(CALLS) + "</div>"
main += sub("Gaps for engineering") + '<table><tr><th>Gap</th><th>What</th><th>Detail</th></tr>' + "".join(f"<tr><td><b>{g}</b></td><td><b>{w}</b></td><td>{d}</td></tr>" for g, w, d in GAPS) + "</table>"
main += sub("Must-nots") + '<ul class="li">' + "".join(f"<li>{m}</li>" for m in MUST) + "</ul>"
main += sub("Boards") + '<table><tr><th>Board</th><th>Holds</th></tr>' + "".join(f"<tr><td><b>{b}</b></td><td>{h}</td></tr>" for b, h in [
  ("F1-Applied", "A finished run that went into a deck: start screen and the opened result, 390 and 1300"),
  ("F2-Not-Applied", "A finished run with no deck yet: start screen, opened result as Suggested changes' lists, picking adds and cuts separately; precon page and deck page, 390 and 1300"),
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
        frame("F2·o", "The lists · 390", "open-open-p-900", "Suggested changes' pick lines, every one <b>✓ Picked</b>, grouped by type with the shipped heads (<i>Instants 7 · 9 in the deck · 15 with your picks</i>). Buy tag and allocation marker as Suggested changes draws them."),
        frame("F2", "Start screen · 1300", "open-d", ""),
        frame("F2·o", "Opened · 1300", "open-open-d", "The run's head, then Suggested changes' lead and the pinned bar: <i>+14 in −14 out · bracket 2 → 3 · Upgraded, as asked</i>, with <b>Start the deck with these 14 swaps</b>."))
  + sub("Picking adds and cuts separately (R2, #2985): keep Sai, still cut Wizard's Staff for Counterspell")
  + row(frame("F2·m", "Additions · 390", "mixed-p-900", "Searing Touch unpicked (<b>Pick</b>, empty box), the rest <b>✓ Picked</b>. The tab reads <i>Additions 13 of 14</i>."),
        frame("F2·m", "Cuts · 390", "mixed-p-1700-cut", "Sai, Master Thopterist unpicked, so it stays; Wizard's Staff still goes. The bar: <i>+13 in −13 out</i>, <b>Start the deck with these 13 swaps</b>."),
        frame("F2·u", "Counts don't match · 390", "uneven-p-900", "Only a cut unpicked: <i>14 in, 13 out. Pick 1 more cut to apply, so the deck stays at 99.</i> The press is off until they match."),
        frame("F2·m", "Both lists · 1300", "mixed-d-1500", "Side by side, each <i>13 of 14 chosen</i>. Mystical Tutor carries the shipped bracket line: it's the pick that moves the deck to 3."),
        frame("F2·b", "Bracket not reached · 1300", "missed-d-520", "Mystical Tutor and Mind Stone unpicked: the shipped warning <i>You asked for 3 · Upgraded. None of your picks moves it…</i> The press stays on."))
  + sub("On the deck page (band's flow, A2c)")
  + row(frame("F2d", "Start screen · 390", "deck-open-p", "A2c's last intro line: <i>Nothing changes until you apply the swaps.</i>"),
        frame("F2d·o", "Opened · 390", "deck-open-open-p", "The same result; the bar's press reads <b>Apply these 14 swaps</b>, with A2c's one Undo after."),
        frame("F2d·m", "Mixed picks · 1300", "deck-mixed-d-520", "<b>Apply these 13 swaps</b>: Sai stays in this deck, Searing Touch stays out."),
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
