# A5b boards (R2: the step reuses Upgrade R2's Suggested-changes result).
# A5 boards (landing demo, a Precon Upgrade step). Frames are PNG renders of the SHIPPED demo dialog markup and the SHIPPED
# ResultView on the proposed step (scratch-gen/render.tsx); a local folder argument writes boards with local image paths.
import json, sys, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, "kit_a4.py")).read())
B = {"dk-all":"ad1045436a08a990461cabe3a137c5f9","dk-view":"0a3f79691de61cb629df264dd7d00bb5","ph-all":"aff24eabf01a8fed231ac01dafbe3eae","ph-full":"04f1c53ddd8fa51687be6ff79387d578","ph-view":"3c54b6dae2e19f01c7471282dac8e641","ph320-full":"aca41daefcd040caa35e9d69753f5379","start-1300":"daa6be36ce4896223ae041f8a6ca529d","start-390":"cf1e304b074e0d457059205d33d71a45","tb-view":"4dc4fc8836131e0ae19c080b6805198f","tb1024-view":"b2f1c9d74c725f48c09d1379b441249c","th-amonkhet":"080629e48c655ec3a23135b778967395","th-eldraine":"55ede6bf653285ba262ab31e78802eb9","th-ixalan":"f4ba8fc5e1c02bf0470fb93afbc88f6e","th-kaldheim":"44b069886d6c0f057dba4a9a6d1ac37b","th-kamigawa":"57d1074b35275380e25d2acce423bafd","th-phyrexia":"fc5b4226a53cf2f18ac735e8e9c30bdd"}
B.update({"b-"+k: v for k, v in {"dk-full": "f6f884d37ffd317441be538af48ee4e2", "dk-mixed": "771e726df5eb4f4f06ac18277b0b0f93", "dk-view": "1248586e91a25c14152a6aaa97d32af1", "ph-full": "856b657ea4174edb3e0604bae164c00b", "ph-mixed": "a5ab3ebe41f031e75e258e7c59476418", "ph-uneven": "71cc4d1cbe3c06e48ac5d8858b64dce5", "ph-view": "f6faf8edf951292140925c19c97c6e7c", "ph320-full": "3a3d4ae200949ad5ff2712aefde60ff6", "tb-view": "da7ae2b7754c68c78506c3b4e23b1636", "tb1024-view": "9651688c26cf19c835c585725d1fe430", "th-amonkhet": "cc1c0898780e4cf4cdf533e9c622b8c9", "th-eldraine": "ef5c7e452f74e978b0e295e2d49dc192", "th-ixalan": "325d918a1f5abb0166865410f70ff133", "th-kaldheim": "a37186fe96685fbc55a7b620924c579f", "th-kamigawa": "9b40cd356a46a1fd130095b659cc64a2", "th-phyrexia": "82260f5af03f823fb9bb583094b605df"}.items()})
SZ = json.load(open(os.path.join(HERE, "sizes.json")))
H = {k: v[1] for k, v in SZ.items()}
LOCAL = len(sys.argv) > 1
def src(k): return (f"art/a5b-{k[2:]}.jpg" if k.startswith("b-") else f"art/a5-{k}.jpg") if LOCAL else f"/_blob/{B[k]}"
def head(kick, title, body):
    return f'<div class="bh"><div class="kick"><span class="tag">A5b</span>{kick}</div><h2>{title}</h2><p>{body}</p></div>'
def frame(k, w, lab, cap, rec=False, scale=1):
    dw = int(w*scale); dh = int(H[k]*scale)
    return (f'<div class="fr" style="width: {dw}px"><div class="lab">{lab}</div>'
            f'<img class="shot{" rec" if rec else ""}" src="{src(k)}" alt="{re.sub("<[^>]+>","",lab)}" width="{dw}" height="{dh}" style="width: {dw}px; height: {dh}px">'
            f'<div class="cap">{cap}</div></div>')
G = 44
def row(*fs): return '<div class="frames">' + "".join(fs) + '</div>'
REND = "Every frame is the shipped demo dialog (<code>demo.tsx</code>’s markup and classes) with <code>ResultView</code> as Upgrade R2 draws it inside (its head, then the shipped <code>SuggestedChangesRun</code> lists), rendered with the shipped CSS and fonts in Low Sun. The swaps are the Upgrade handoff’s illustrative run; the build draws the fixture’s own."
out = {}

# ---------- Calls
STEPS = [("1", "Wren’s collection", "Free", ""), ("2", "The commanders Wren can build", "Free", ""), ("3", "Help me choose", "1 credit", ""),
  ("4", "A deck from what Wren owns", "Free", ""), ("5", "Analysis and Overview", "Free · Overview: 1 credit", ""), ("6", "Suggested changes", "1–2 credits", ""),
  ("7", "<b>Upgrade this precon</b>", "<b>2 credits</b>", "<b>New.</b> Prismari Artistry, led by Muddle, bracket 2 → 3, toward Spells: 14 adds and 14 cuts"),
  ("8", "Get it to 99", "Free · Proposed cuts: 1 credit", "was 7"), ("9", "Buy only what’s missing", "Free · Which deck: 1 credit", "was 8")]
tbl = '<table class="tbl"><tr><th>Step</th><th>Tool</th><th>Label</th><th></th></tr>' + "".join(
  f'<tr{" style=\"background:#1E1913\"" if n == "7" else ""}><td><b>{n}</b></td><td>{t}</td><td>{l}</td><td>{x}</td></tr>' for n, t, l, x in STEPS) + '</table>'
inner = head("Landing demo · a Precon Upgrade step · R2", "Step 7 of 9: Upgrade this precon, drawn as the new Suggested-changes result",
  "R1’s calls stand (where it sits, the precon, the label, the ring). What changes: the step now shows Upgrade R2’s result, the run’s head and then the shipped Suggested changes lists, with Additions and Cuts picked on their own. Picks work in the demo and write nothing. No live run. " + REND)
inner += f'<div style="max-width: 1500px">{tbl}</div>'
inner += notes(
  ("1 · Where it sits (as R1)", "<ul><li><b>Step 7</b>, after Suggested changes and before Get it to 99. The bar gets nine segments, and the lead and start card say <b>nine of the tools</b>.</li><li>Sitting right after Suggested changes now pays twice: step 7 reads as the same lists the visitor just saw, started from a box.</li></ul>"),
  ("2 · Which precon (as R1)", "<ul><li><b>Prismari Artistry</b>, the Upgrade handoff’s fixture: led by <b>Muddle</b>, bracket <b>2 → 3</b>, toward <b>Spells</b>, 14 adds and 14 cuts.</li><li>It shows what no other step does: a new commander leads, so the Commander pair sits above the lists.</li></ul>"),
  ("3 · What the visitor sees and presses (new)", "<ul><li>The precon’s name and <code>read-only</code>, then Upgrade R2’s head: title and date, the four facts, the Commander pair (no Pick on it, as R2).</li><li>Then the shipped lists: <b>Additions</b> and <b>Cuts</b> (side by side from 1024, a switch on a phone), <b>By type / By role</b>, every line <b>✓ Picked</b>, and the pinned tally <b>+14 in −14 out · stays at 99 · bracket 2 → 3</b>.</li><li><b>Pick</b> works: a visitor can drop a card and watch the chips and tally move. Nothing is saved, as every demo action.</li><li><b>Select a card</b> stays on the first addition’s name and opens the demo’s card details.</li><li>Left out: <b>You asked</b>, the bar’s <b>Apply</b> and its “Nothing moves until you apply” line, and <b>Try another strategy</b> (all write).</li></ul>"))
inner += row(frame("start-390", 390, "Start card · 390", "<b>Step through nine of the tools</b>, unchanged from R1."),
             frame("start-1300", 1300, "Start card · 1300", "Only the count word changes. Nothing else on the start card moves."))
inner += notes(
  ("Copy (drafts)", "<ul><li>Title: <b>Upgrade this precon</b>. Label chip: <b>2 credits</b>.</li><li>Line: <i>Wren picked who leads a precon, how strong it plays and the strategy. The 99 found {n} swaps toward that plan, every card added under $12, and says why for each.</i></li><li>Ring: <b>Select a card</b>. R1’s <b>Show all {n} swaps</b> is retired: the lists group and scroll as shipped.</li></ul>"),
  ("For engineering", "<ul><li>Fixture: <code>Projected.upgrade = { precon, panel, runId }</code> from one real run on the fixture account (G1, unchanged).</li><li>The step renders Upgrade R2’s <code>ResultView</code> (fresh-start build) with a new <code>demo</code> prop, passed on to <code>SuggestedChangesRun</code>: picks in local state only, no You asked, no Apply place, no apply line (<code>demo-prop.diff</code>). R1’s <code>limit</code> prop is dropped.</li><li>Depends on the Upgrade fresh-start build landing first. Steps after 6 shift by one, as R1.</li></ul>"),
  ("Readiness", "<b>Yellow.</b> G1 (the fixture run) as R1; G2 is now the <code>demo</code> prop; G3 the renumbering; G4 builds after Upgrade R2. See <code>READINESS.md</code>."))
out["A5-Calls.dc.html"] = ("A5b Calls", 56*2 + 1300 + 390 + G, inner)

# ---------- Phone
inner = head("Phone · 390 and 320", "On a phone the step is one column: the words, the run’s head, then the lists",
  "The column scrolls between two pinned bars: the lists’ tally, then Back/Next, as Suggested changes does in step 6. " + REND)
inner += row(frame("b-ph-view", 390, "390 · as it opens", "The label and title, the head and facts, the Commander pair. The tally is already pinned."),
  frame("b-ph-full", 390, "390 · the whole column <b>· recommended</b>", "The Additions / Cuts switch and By type / By role, then every addition picked, grouped by type, with the ring on <b>Archmage Emeritus</b>.", rec=True),
  frame("b-ph-mixed", 390, "390 · after dropping one of each", "Searing Touch and Sai left unpicked: the chips read 13 of 14, the tally <b>+13 in −13 out · stays at 99</b>. The demo can’t re-read the bracket, so the tally drops it once picks change."),
  frame("b-ph-uneven", 390, "390 · uneven picks", "One cut dropped: the shipped warning names the fix, so the visitor learns the 99 rule. Next still works."),
  frame("b-ph320-full", 320, "320", "The narrowest phone: buy tags drop under the name, as shipped."))
inner += notes(("Why every swap shows now", "R1 trimmed to 3 swaps because the run was one long list. The Suggested-changes lists split it in two behind a switch and group it by type, so one side is the length of a deck section and the trim isn’t needed."),
  ("What a press does", "<ul><li>A card name: the demo’s read-only card details.</li><li>Pick / ✓ Picked: flips the line, the chips and the tally, in the demo only.</li><li>The switch and By type / By role: as shipped (the grouping choice is the demo’s own, not saved).</li></ul>"),
  ("Open for Hugh", "The uneven warning says “Pick 1 more cut to apply”, the shipped copy, though the demo has no Apply. Drawn as shipped so step 7 matches the real tool; a demo-only line (“…so the deck stays at 99”) is the alternative."))
out["A5-Phone.dc.html"] = ("A5b Phone", 56*2 + 390*4 + 320 + G*4, inner)

# ---------- Tablet
inner = head("Tablet · 768 and 1024", "On a tablet the lists stay one side at a time until 1024",
  "At 768 the column centres at 680 with the phone switch; from 1024 the dialog is two columns and the lists sit side by side, as Suggested changes. " + REND)
inner += row(frame("b-tb-view", 768, "768 · as it opens", "Head, facts and the Commander pair in the first screen; the tally pinned."),
  frame("b-tb1024-view", 1024, "1024 · two columns", "Words and Back/Next at the left, the app scrolls at the right.", rec=True))
out["A5-Tablet.dc.html"] = ("A5b Tablet", 56*2 + 768 + 1024 + G, inner)

# ---------- Desktop
inner = head("Desktop · 1300", "On desktop Additions and Cuts sit side by side beside the words",
  "The step’s words at the left with Back and Next under them; the app side holds the head and the two lists, with the tally pinned at its foot. " + REND)
inner += row(frame("b-dk-view", 1300, "1300 · as it opens <b>· recommended</b>", "Facts in one row, the Commander pair, then both lists, all 14 of 14 chosen, ring on the first addition.", rec=True),
  frame("b-dk-full", 1300, "1300 · the whole app side", "Every group on both sides; nothing trimmed."),
  frame("b-dk-mixed", 1300, "1300 · after dropping one of each", "Searing Touch unpicked dims its line; both chips read 13 of 14 and the tally follows."))
out["A5-Desktop.dc.html"] = ("A5b Desktop", 56*2 + 1300*3 + G*2, inner)

# ---------- Themes
T = [("amonkhet","Low Sun"),("kamigawa","Neon Rain"),("ixalan","Canopy"),("phyrexia","Oil Haze"),("eldraine","Witching Hour"),("kaldheim","First Frost")]
inner = head("Six themes", "Step 7 in all six themes", "390, as it opens. Only tokens change: the credit chip, the facts’ fill, the bracket accent and the tally’s in/out inks read in every theme.")
inner += row(*[frame(f"b-th-{t}", 390, n, "") for t, n in T])
out["A5-Themes.dc.html"] = ("A5b Themes", 56*2 + 390*6 + G*5, inner)

MH = json.load(open(os.path.join(HERE, "heights.json"))) if os.path.exists(os.path.join(HERE, "heights.json")) else {}
dst = sys.argv[1] if LOCAL else os.path.join(HERE, "project")
os.makedirs(dst, exist_ok=True)
for n, (t, w, inner) in out.items():
    open(f"{dst}/{n}", "w").write(doc(t, w, MH.get(n, 400), inner))
print(json.dumps({n: v[1] for n, v in out.items()}))
