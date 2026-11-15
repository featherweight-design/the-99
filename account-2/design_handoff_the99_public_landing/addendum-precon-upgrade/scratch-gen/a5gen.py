# A5 boards (landing demo, a Precon Upgrade step). Frames are PNG renders of the SHIPPED demo dialog markup and the SHIPPED
# ResultView on the proposed step (scratch-gen/render.tsx); a local folder argument writes boards with local image paths.
import json, sys, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, "kit_a4.py")).read())
B = {"dk-all":"ad1045436a08a990461cabe3a137c5f9","dk-view":"0a3f79691de61cb629df264dd7d00bb5","ph-all":"aff24eabf01a8fed231ac01dafbe3eae","ph-full":"04f1c53ddd8fa51687be6ff79387d578","ph-view":"3c54b6dae2e19f01c7471282dac8e641","ph320-full":"aca41daefcd040caa35e9d69753f5379","start-1300":"daa6be36ce4896223ae041f8a6ca529d","start-390":"cf1e304b074e0d457059205d33d71a45","tb-view":"4dc4fc8836131e0ae19c080b6805198f","tb1024-view":"b2f1c9d74c725f48c09d1379b441249c","th-amonkhet":"080629e48c655ec3a23135b778967395","th-eldraine":"55ede6bf653285ba262ab31e78802eb9","th-ixalan":"f4ba8fc5e1c02bf0470fb93afbc88f6e","th-kaldheim":"44b069886d6c0f057dba4a9a6d1ac37b","th-kamigawa":"57d1074b35275380e25d2acce423bafd","th-phyrexia":"fc5b4226a53cf2f18ac735e8e9c30bdd"}
SZ = json.load(open(os.path.join(HERE, "sizes.json")))
H = {k: v[1] for k, v in SZ.items()}
LOCAL = len(sys.argv) > 1
def src(k): return f"art/a5-{k}.jpg" if LOCAL else f"/_blob/{B[k]}"
def head(kick, title, body):
    return f'<div class="bh"><div class="kick"><span class="tag">A5</span>{kick}</div><h2>{title}</h2><p>{body}</p></div>'
def frame(k, w, lab, cap, rec=False, scale=1):
    dw = int(w*scale); dh = int(H[k]*scale)
    return (f'<div class="fr" style="width: {dw}px"><div class="lab">{lab}</div>'
            f'<img class="shot{" rec" if rec else ""}" src="{src(k)}" alt="{re.sub("<[^>]+>","",lab)}" width="{dw}" height="{dh}" style="width: {dw}px; height: {dh}px">'
            f'<div class="cap">{cap}</div></div>')
G = 44
def row(*fs): return '<div class="frames">' + "".join(fs) + '</div>'
REND = "Every frame is the shipped demo dialog (<code>demo.tsx</code>’s markup and classes) with the shipped <code>ResultView</code> inside, rendered with the shipped CSS and fonts in Low Sun. The swaps are the Upgrade handoff’s illustrative run; the build draws the fixture’s own."
out = {}

# ---------- Calls
STEPS = [("1", "Wren’s collection", "Free", ""), ("2", "The commanders Wren can build", "Free", ""), ("3", "Help me choose", "1 credit", ""),
  ("4", "A deck from what Wren owns", "Free", ""), ("5", "Analysis and Overview", "Free · Overview: 1 credit", ""), ("6", "Suggested changes", "1–2 credits", ""),
  ("7", "<b>Upgrade this precon</b>", "<b>2 credits</b>", "<b>New.</b> Prismari Artistry, led by Muddle, bracket 2 → 3, toward Spells: 14 swaps"),
  ("8", "Get it to 99", "Free · Proposed cuts: 1 credit", "was 7"), ("9", "Buy only what’s missing", "Free · Which deck: 1 credit", "was 8")]
tbl = '<table class="tbl"><tr><th>Step</th><th>Tool</th><th>Label</th><th></th></tr>' + "".join(
  f'<tr{" style=\"background:#1E1913\"" if n == "7" else ""}><td><b>{n}</b></td><td>{t}</td><td>{l}</td><td>{x}</td></tr>' for n, t, l, x in STEPS) + '</table>'
inner = head("Landing demo · a Precon Upgrade step", "Step 7 of 9: Upgrade this precon, one stored run, read-only",
  "The “Try it” demo gains a ninth step. It sits right after Suggested changes, carries its own <b>2 credits</b> label, and shows one stored upgrade read-only: the shipped result, with every card name opening its details. No live run. " + REND)
inner += f'<div style="max-width: 1500px">{tbl}</div>'
inner += notes(
  ("1 · Where it sits", "<ul><li><b>Step 7</b>, after Suggested changes and before Get it to 99. Both write swaps for a deck: Suggested changes tunes a deck Wren built, Upgrade starts from a box. The last two steps finish decks (the count, then the shopping), so they stay last.</li><li>The bar gets nine segments; <code>Step 7 of 9</code>. The section’s lead and the start card say <b>nine of the tools</b> (frames below).</li></ul>"),
  ("2 · Which precon", "<ul><li><b>Prismari Artistry</b>, the Upgrade handoff’s own fixture: led by <b>Muddle</b> (the box’s alternate), bracket <b>2 → 3</b>, toward <b>Spells</b>, 14 swaps.</li><li>Chosen because it shows the part no other step does: a different commander leads, and the result opens with the Commander row.</li><li>Mutant Menace (the landing’s featured precon) would work the same, with whatever its run picks.</li></ul>"),
  ("3 · What the visitor sees and selects", "<ul><li>The precon’s name and the <code>read-only</code> chip, as Suggested changes heads its run. Then the shipped result: title and date, the four facts, the Commander row, and the <b>first 3 swaps</b>, then <b>Show all 14 swaps</b> (as step 4’s Show all 99).</li><li><b>Select a card</b>: any name opens the demo’s read-only card details. The ring sits on the first added card with its label to the right, so it covers no row.</li><li>No step tracker (the title and facts already say all three picks) and no foot (Start the deck and Try another strategy write).</li></ul>"))
inner += row(frame("start-390", 390, "Start card · 390", "<b>Step through nine of the tools</b>; the lead above says nine too."),
             frame("start-1300", 1300, "Start card · 1300", "Only the count word changes. Nothing else on the start card moves."))
inner += notes(
  ("Copy (drafts)", "<ul><li>Title: <b>Upgrade this precon</b> (the tool’s shipped name). Label chip: <b>2 credits</b>.</li><li>Line: <i>Wren picked who leads a precon, how strong it plays and the strategy. The 99 found {n} swaps toward that plan, every card added under $12, and says why for each.</i></li><li>Ring: <b>Select a card</b>. Control: <b>Show all {n} swaps</b>.</li><li>Lead and start card: <b>nine</b> of the tools.</li></ul>"),
  ("For engineering", "<ul><li>Fixture: <code>Projected.upgrade = { precon, panel, runId }</code>, exported by <code>demo:export</code> from one real run on the fixture account (2 credits, once).</li><li><code>ResultView</code> gains <code>limit</code>: draws the first N swaps; the title, facts and group counts still count the whole run (<code>resultview-limit.diff</code>).</li><li>New <code>demo-step-upgrade.tsx</code>. Steps after 6 shift by one: <code>StepBody</code>, <code>cardStepsOf</code> (Shopping is now index 8), the rings, the tests that count eight.</li></ul>"),
  ("Readiness", "<b>Yellow.</b> One gap: the fixture run (G1) has to be made on staging and exported. The rest is a step, a prop and the renumbering. See <code>READINESS.md</code> in <code>addendum-precon-upgrade/</code>."))
out["A5-Calls.dc.html"] = ("A5 Calls", 56*2 + 1300 + 390 + G, inner)

# ---------- Phone
inner = head("Phone · 390 and 320", "On a phone the step is one column: the words, then the result",
  "The column scrolls between the pinned bar and Back/Next, as every step does below 1024. " + REND)
inner += row(frame("ph-view", 390, "390 · as it opens", "The label and title, then the run’s head and facts. Muddle leading reads in the first screen."),
  frame("ph-full", 390, "390 · the whole column <b>· recommended</b>", "The Commander row, the first 3 swaps with the ring on <b>Brainstorm</b> (label to its right), then <b>Show all 14 swaps</b>.", rec=True),
  frame("ph-all", 390, "390 · after Show all 14 swaps", "Every swap, grouped by the theme each cut came from. The control is gone; nothing collapses it again, as step 4."),
  frame("ph320-full", 320, "320", "The narrowest phone: sides stack, names truncate before the price, as shipped."))
inner += notes(("Why three swaps first", "The run is long (14 pairs, about 1,300px on a phone). Three show what a swap is (a cut, an add, its price or <b>you own it</b>, and why) without burying Next. The same trim as step 4’s marked rows."),
  ("What a press does", "<ul><li>A card name: the demo’s read-only card details (the shipped modal or sheet, Find a deck locked).</li><li>Show all 14 swaps: the rest, in place.</li><li>Nothing else on the step writes or opens anything.</li></ul>"),
  ("Same as shipped", "The rows, marks, pips, owned dots, prices and the four facts are <code>ResultView</code> unchanged. When rows move to the shared allocation chips (in flight), the demo takes them with it."))
out["A5-Phone.dc.html"] = ("A5 Phone", 56*2 + 390*3 + 320 + G*3, inner)

# ---------- Tablet
inner = head("Tablet · 768 and 1024", "On a tablet the column centres at 680, and the sides of a swap sit on one line",
  "From 768 the swap’s two sides go side by side (<code>md:flex-row</code>) with the arrow between; Back and Next sit at the right of the pinned bar. From 1024 the dialog is two columns, as every step. " + REND)
inner += row(frame("tb-view", 768, "768 · as it opens", "The Commander row and the first swaps fit in the first screen."),
  frame("tb1024-view", 1024, "1024 · two columns", "Words and Back/Next at the left (320px), the app scrolls at the right.", rec=True))
out["A5-Tablet.dc.html"] = ("A5 Tablet", 56*2 + 768 + 1024 + G, inner)

# ---------- Desktop
inner = head("Desktop · 1300", "On desktop the words stay put and the result scrolls beside them",
  "The step’s words at the left (360px from 1200) with Back and Next under them; the app side holds the result. " + REND)
inner += row(frame("dk-view", 1300, "1300 · as it opens <b>· recommended</b>", "The four facts in one row, the Commander swap, the first 3 swaps and Show all 14 swaps, all above the fold.", rec=True),
  frame("dk-all", 1300, "1300 · after Show all 14 swaps", "The app side scrolls; the words and Next never move."))
out["A5-Desktop.dc.html"] = ("A5 Desktop", 56*2 + 1300*2 + G, inner)

# ---------- Themes
T = [("amonkhet","Low Sun"),("kamigawa","Neon Rain"),("ixalan","Canopy"),("phyrexia","Oil Haze"),("eldraine","Witching Hour"),("kaldheim","First Frost")]
inner = head("Six themes", "Step 7 in all six themes", "390, as it opens. Only tokens change: the credit chip’s accent, the facts’ sunken fill and the bracket’s accent ink read in every theme.")
inner += row(*[frame(f"th-{t}", 390, n, "") for t, n in T])
out["A5-Themes.dc.html"] = ("A5 Themes", 56*2 + 390*6 + G*5, inner)

MH = json.load(open(os.path.join(HERE, "heights.json"))) if os.path.exists(os.path.join(HERE, "heights.json")) else {}
dst = sys.argv[1] if LOCAL else os.path.join(HERE, "project")
os.makedirs(dst, exist_ok=True)
for n, (t, w, inner) in out.items():
    open(f"{dst}/{n}", "w").write(doc(t, w, MH.get(n, 400), inner))
print(json.dumps({n: v[1] for n, v in out.items()}))
