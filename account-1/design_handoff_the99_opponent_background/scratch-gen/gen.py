# Opponent Background addendum (account 1, 2026-11-22): writes the boards for the repo (art/) or the canvas (/_blob).
import json, sys, os
mode, out = sys.argv[1], sys.argv[2]
BLOB = json.load(open(os.path.join(os.path.dirname(__file__), "blobs.json"))) if mode == "canvas" else {}
def src(k): return f"/_blob/{BLOB[k]}" if mode == "canvas" else f"art/ob-{k}.webp"
FONT = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&amp;family=IBM+Plex+Mono:wght@400;500&amp;family=Chakra+Petch:wght@600;700&amp;display=swap" rel="stylesheet">'
ACC = "#E8A25C"
SUPPORT = "./support.js" if mode == "canvas" else "../support.js"
def page(title, w, h, body):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="{SUPPORT}"></script>
</head>
<body>
<x-dc>
<helmet>
{FONT}
<style>
body{{margin:0}}
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
def label(t): return f'<span style="font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.12em;text-transform:uppercase;color:{ACC}">{t}</span>'
def fig(k, w, h, cap, note, radius=28):
    return f'''<figure style="margin:0;display:flex;flex-direction:column;gap:12px;width:{w}px;flex:none">
<img src="{src(k)}" alt="{cap}" style="width:{w}px;height:{h}px;display:block;border-radius:{radius}px;border:1px solid #262A35">
<figcaption style="display:flex;flex-direction:column;gap:6px">
<p style="margin:0;font:600 15px 'IBM Plex Sans',sans-serif;color:#E6E8F0">{cap}</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#959AAD">{note}</p>
</figcaption>
</figure>'''
def row(lbl, figs, gap=36): return f'<div style="display:flex;flex-direction:column;gap:14px">{label(lbl)}<div style="display:flex;gap:{gap}px;align-items:flex-start;flex-wrap:wrap">{"".join(figs)}</div></div>'
def ph(k, cap, note): return fig(k, 292, 632, cap, note)
def dk(k, cap, note, w=700, ratio=1280/2600): return fig(k, w, round(w*ratio), cap, note, 12)
def call(n, t, body): return f'<div style="display:flex;flex-direction:column;gap:8px;padding:20px 24px;border:1px solid #262A35;border-radius:14px;background:#11131A"><p style="margin:0;font:600 17px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:{ACC}">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{body}</div></div>'
def ul(items): return '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">' + "".join(f"<li>{i}</li>" for i in items) + '</ul>'
def m(t): return f'<span style="font-family:\'IBM Plex Mono\',monospace;color:#E6E8F0">{t}</span>'
NOTE_ART = f'<p style="margin:0;padding:12px 16px;border:1px dashed #4A4F5E;border-radius:10px;font-size:13px;line-height:1.55;color:#959AAD;max-width:1240px"><b style="color:#E6E8F0">Art.</b> Lae’zel’s art is from the card image Hugh supplied (R1.1). Raised by Giants and Noble Heritage are crops from the approved partner add board V1, so they are soft when drawn large.</p>'

boards = {}
boards["Main.dc.html"] = (1600, 1860, "Main · a Background beside an opponent", page("Opponent Background: main", 1600, 1860,
 head("Opponent picker: a Background as the second commander · addendum",
  "When you log a game, an opponent can now be seated with a commander that chooses a Background and that Background. The save already accepts the pair (#3164). This draws the picker's second slot, using the deck's Background pattern (search, a result row, the chosen slot, Remove), then how the pair reads on the form's seat, the History row and the life tracker. Every frame is the shipped UI rendered in a browser with this addendum's change patched in (scratch-gen/proposal.diff). Fixtures: you play Sai; Peter is on Lae’zel with Raised by Giants; Max on Bruse Tarl + Ishai (partners) for comparison.")
 + NOTE_ART
 + '<div style="display:flex;gap:40px;align-items:flex-start">'
 + '<div style="display:flex;flex-direction:column;gap:16px;flex:1 1 0;min-width:0">'
 + call("1", "Only a commander that chooses a Background opens the slot", ul([
   f"In the picker's results, that commander's row gets a second line, {m('chooses a Background')}, so you know why its press doesn't seat at once. Every other row still seats on one press, as shipped.",
   "Partners keep today's paths (a friend's deck or a Rule 0 table). Decided: only Choose a Background gets the slot."]))
 + call("2", "The Background step: search and a result row", ul([
   f"The head is the friend-decks head: {m('‹')} back to commanders, the commander's art and name.",
   f"The slot starts as the picker's own field, {m('Search Backgrounds')}, under the deck's rule line: {m('Lae’zel can choose a Background as a second commander.')}",
   f"Typing lists Backgrounds as the shipped commander rows (art, name, pips). None: {m('No Background by that name.')}"]))
 + call("3", "The chosen state and the remove action", ul([
   f"A {m('BACKGROUND')} eyebrow over the chosen row, captioned {m('second commander')}, with {m('Change')} · {m('Remove')}: the create picker's second slot, its words and text buttons.",
   "Change brings back the search; Remove empties the slot."]))
 + call("4", "One Seat press", ul([
   f"Under the slot, one primary press names what it seats: {m('Seat Lae’zel')} or {m('Seat Lae’zel + Raised by Giants')}. The Background is optional, and the foot says so.",
   "A seat holding a commander that chooses a Background reopens on this step, so a Background can be added, changed or removed later."]))
 + '</div><div style="display:flex;flex-direction:column;gap:16px;flex:1 1 0;min-width:0">'
 + call("5", "The seat in the form", ul([
   "The art splits in halves with a 2px seam, as the tracker's panel draws a partner pair.",
   f"The name is the two-name treatment the History row and Matchups already use: {m('Lae’zel + Raised by Giants')}. At 124px on desktop it takes two lines rather than cutting the Background off. A labelled or friend seat keeps its name and puts the pair under it."]))
 + call("6", "The History row", ul([
   f"No change: the {m('vs')} line already reads {m('Peter · Lae’zel + Raised by Giants')}, its face the commander's art, as it does for partners."]))
 + call("7", "The life tracker seat", ul([
   "The panel splits its art, as it does for partners (shipped F14).",
   "Commander damage: a Background is no creature and deals no commander damage, so its seat's card is the commander alone with one stepper (tablet and phone).",
   "Tax keeps both rows: a Background is cast from the command zone, so it pays tax."]))
 + call("·", "Phone and desktop", ul(["One body for both, as shipped: the sheet at 390, the anchored 340px panel at 1300. No new control types: field, row, text buttons, primary button, all shipped."]))
 + '</div></div>'
 + row("The flow · phone", [ph("P1-phone","1 · Search","Lae’zel's row says it chooses a Background."), ph("P2-phone","2 · Background step","The slot is a search with the deck's rule line."), ph("P4-phone","3 · Chosen","Change · Remove, and the Seat press names the pair."), ph("P5-phone","4 · Seated","Split art, both names.")])
))

boards["Picker.dc.html"] = (1600, 3090, "Picker · phone and desktop", page("Opponent Background: picker", 1600, 3090,
 head("The picker's Background step", "Phone draws the shipped sheet; desktop the shipped panel anchored under Add opponent (or under the seat being changed). Same body at both widths.")
 + row("Phone · 390", [ph("P1-phone","P1 · Search results","Type “la”: Lae’zel carries chooses a Background; Lathliss seats at once."), ph("P2-phone","P2 · The empty slot","‹ back to commanders, the commander, the search, the rule line, Seat Lae’zel."), ph("P3-phone","P3 · A result row","“giants”: Raised by Giants, as a commander row draws it.")])
 + row("Phone · 390", [ph("P4-phone","P4 · Chosen","BACKGROUND, the row captioned second commander, Change · Remove. Seat names the pair."), ph("P6-phone","P6 · Removed","The pair's seat reopened on its step, Remove pressed: the slot is a search again, Seat Lae’zel."), ph("P5-phone","P5 · Seated","Back on the form (see Row).")])
 + row("Desktop · 1300", [dk("P1-desk","D1 · Search results","The anchored panel, 340 wide.", 700), dk("P2-desk","D2 · The empty slot","", 700)])
 + row("Desktop · 1300", [dk("P3-desk","D3 · A result row","", 700), dk("P4-desk","D4 · Chosen","", 700)])
 + row("Desktop · 1300", [dk("P6-desk","D5 · Removed","Reopened from the seat, Remove pressed.", 700)])
))

boards["Row.dc.html"] = (1600, 1720, "Row · the seat and the History row", page("Opponent Background: rows", 1600, 1720,
 head("How the opponent with two commanders reads", "The form's seat (proposal) and the History row (shipped, unchanged). Max's Bruse Tarl + Ishai is a partner pair, drawn for comparison.")
 + row("The form's seat", [ph("P5-phone","Phone · the seat row","Split art, “Lae’zel + Raised by Giants”, Add a name under it."), dk("P5-desk","Desktop · the 124 × 86 seat","Split art; the two names take two lines.", 840, 1400/2600)])
 + row("The History row (shipped)", [ph("H1-phone","Phone","vs Peter · Lae’zel + Raised by Giants (won), Colin · Ghalta, Bruse Tarl + Ishai."), dk("H1-desk","Desktop","The same line in the marks column.", 840, 640/2600)])
))

boards["Tracker.dc.html"] = (1600, 2180, "Tracker · the seat with a Background", page("Opponent Background: tracker", 1600, 2180,
 head("The life tracker seat", "Peter's deck is Lae’zel with Raised by Giants, seated from a Rule 0 table (a deck's Background already flows there since #3154). Four seats; Peter cast each commander once; you took 4 from Lae’zel, 6 from Ghalta, 3 from Ishai.")
 + row("Tablet · 1180 × 820", [dk("T1-tablet","T1 · The table","Peter's panel splits its art, as Max's partners do.", 720, 1640/2360), dk("T2-tablet-damage","T2 · Your Commander damage","Peter's card is Lae’zel alone with one stepper; Max's partner card keeps two.", 720, 1640/2360)])
 + row("Tablet · 1180 × 820", [dk("T3-tablet-tax","T3 · Peter's Tax (turned for reading)","Two rows: Lae’zel and Raised by Giants each pay tax.", 720, 1640/2360)])
 + row("Phone · 390", [ph("T4-phone","T4 · The table","Peter's panel, split art."), fig("T5-phone-damage", 632, 292, "T5 · Your Commander damage (turned for reading)", "Peter: Lae’zel, one stepper.", 28)])
))
os.makedirs(out, exist_ok=True)
for name, (w, h, title, html) in boards.items():
    open(os.path.join(out, name), "w").write(html)
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-22T21:00:00Z"}, "title": "Opponent picker · a Background as second commander", "launch": {"view": "canvas"}, "pages": [], "boards": {}, "order": list(boards), "notes": {}, "designSystems": []}
x = 0
for name, (w, h, title, _) in boards.items():
    canvas["boards"][name] = {"x": x, "y": 0, "w": w, "h": h, "title": title}; x += w + 120
json.dump(canvas, open(os.path.join(out, "canvas.json"), "w"), indent=1)
print("ok", list(boards))
