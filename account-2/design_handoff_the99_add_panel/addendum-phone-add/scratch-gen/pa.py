"""Add panel addendum: phone Add (account 2, 2026-11-14). Boards over the SHIPPED quick-add rows, rendered with the
shipped CSS from a scratch copy of main + pa.diff (the proposal as code). python3 pa.py <out> [blob]"""
import json, os, sys
OUT = sys.argv[1]; BLOB = "blob" in sys.argv
B = {"p390-pa-shipped-s.png": "53548dd6af93b1a9db8f94bee9dbc05c", "p390-pa-p1-s.png": "12c25c032b612a6318124afc7fbf2267",
     "p390-pa-p1-s-press0.png": "51838a0080dfb9b357e39b80038cb658", "p390-pa-p1-s-press1.png": "0ccc213c76fbcd82aa049e4e242584be",
     "p390-pa-p1-s-added0.png": "7a602c593e124c378ea158f1407dc393", "p375-pa-shipped-av.png": "c186b1abc52cb9269f2c496a0b448619",
     "p375-pa-p1-av.png": "8e4ef6e3d1ed29d2bbc59ff750393103", "d1300-pa-p1-s.png": "89bcbc72de9afbc79dca1a064c5c8ece"}
def src(n): return f"/_blob/{B[n]}" if BLOB else f"art/{n}"
CSS = """body{margin:0}
.b{box-sizing:border-box;background:#17130F;color:#EDE6D8;font-family:'IBM Plex Sans',sans-serif;padding:56px 64px;display:flex;flex-direction:column;gap:36px}
.tag{font:500 11px 'IBM Plex Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:#CF8745}
.h1{font-size:34px;font-weight:600;margin:6px 0 10px}
.lede{font-size:15px;line-height:1.6;color:#C9BEA8;max-width:1100px;margin:0}
.notes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.note{background:#1E1A15;border:1px solid #2A241D;border-radius:10px;padding:14px 16px;font-size:13.5px;line-height:1.55;color:#C9BEA8}
.note b{color:#EDE6D8}
.note code,.cap code{font:12px 'IBM Plex Mono',monospace;color:#E3A56A}
.nh{font:500 11px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#A89B84;margin:0 0 10px}
.frames{display:flex;gap:40px;align-items:flex-start;flex-wrap:wrap}
.f{display:flex;flex-direction:column;gap:10px}
.fl{font:500 11.5px 'IBM Plex Mono',monospace;color:#A89B84}
.fl b{color:#EDE6D8;font-weight:600}
.shot{display:block;border-radius:14px;border:1px solid #3A3229}
.cap{font-size:13px;line-height:1.5;color:#C9BEA8;margin:0}
"""
def doc(title, body, w, h):
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&amp;family=IBM+Plex+Sans:wght@400;600&amp;display=swap">
<style>
{CSS}</style>
</helmet>
<div class="b" style="width: {w}px; min-height: {h}px">
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
"""
def head(tag, title, lede): return f'<div><div class="tag">{tag}</div><div class="h1">{title}</div><p class="lede">{lede}</p></div>'
def notes(h, items): return f'<div><p class="nh">{h}</p><div class="notes">' + "".join(f'<div class="note">{i}</div>' for i in items) + "</div></div>"
def frame(label, name, w, h, cap): return f'<div class="f" style="width: {w}px"><div class="fl">{label}</div><img class="shot" src="{src(name)}" alt="" style="width: {w}px; height: {h}px"><p class="cap">{cap}</p></div>'
def frames(*fs): return '<div class="frames">' + "".join(fs) + "</div>"

CALLS = [
 "<b>Every phone row draws the ghost Add, the first one included.</b> The same 56 × 44 box, the same word, the same ghost as the other rows: transparent, <code>1px --border-strong</code>, radius 7, <code>--accent-text</code> 13/600. The bare <code>↵</code> is gone.",
 "<b>The active row is marked by its own edge, as shipped.</b> The row keeps its <code>--accent</code> border; the Add inside it stays the same as every other row's, so the most likely card looks exactly as addable as the rest.",
 "<b>Two targets, as 6b shipped them.</b> The name cell (thumbnail and name, full row height) opens card details. The Add cell adds. A tap anywhere else on the row still adds. Nothing about the row's own tap changes.",
 "<b>Pressed.</b> Under the finger the Add takes the <code>--elevated</code> fill (the segmented switch's <code>pressFill</code>) and the <code>--accent</code> border (the ghost's hover border). Only on <code>:active</code>; no new token.",
 "<b>Pending is the optimistic In deck.</b> Selecting Add turns the cell to <code>✓ In deck</code> at once (<code>useDeckMutation</code>'s <code>applied</code>) and it holds while the add saves. A refusal puts Add back with the shipped error line. The shipped 0.5 dim on <code>isPending</code> never shows, since <code>applied</code> wins, so no separate pending look is drawn.",
 "<b>In deck is unchanged.</b> <code>✓ In deck</code> in <code>--success</code>, <code>aria-disabled</code>, the name still opens the card.",
 "<b>Desktop is unchanged.</b> The active row's <code>↵ add</code> caption stays where a keyboard is likely: md and up with a fine pointer. A touch tablet at md gets the Add button too. The desktop render with this change is pixel-identical to main.",
 "<b>Row height, meta line and widths are unchanged.</b> The active row's trailing cell was already 56 wide, so the button fits where the glyph sat. At 375 the long name and meta truncate exactly as they do today.",
]
ENTER = [
 "<b>Does ↵ still appear on phones? No.</b> Two places drew it. The active row's bare <code>↵</code> becomes Add. The keyboard hint under the results (<code>↑↓ to move · ↵ to add · Esc to dismiss</code>) shows on phones today whenever the list is short enough to reach it; it hides on a coarse pointer.",
 "<b>The phone keyboard's return key still adds the top match</b>, as shipped. It is just no longer advertised, because the Add on that row now says it.",
 "<b>Seen while drawing, not drawn:</b> the deck import's unresolved-card list (<code>resolution-expander.tsx</code>) draws the same bare <code>↵</code> on a phone's active option. Same problem, its own round if wanted. And on desktop the shipped <code>✓ In deck</code> wraps to two lines in its 56 column; left as shipped.",
 "<b>Copy: no new strings.</b> <code>rowAdd</code> “Add”, <code>rowInDeck</code> “✓ In deck”, <code>rowAddActive</code> “↵ add” (desktop only now). Spoken labels unchanged: the cell is still “Add” with the row's card as its description.",
]

def main():
    body = (head("Add panel · addendum · phone Add · R1", "A visible Add on every phone result",
                 "Hugh tested on a phone: tapping the first result opened its card details, and it added only with a tap right on the ↵. "
                 "On a touchscreen the ↵ doesn't read as a button, so the most likely card was the hardest to add. Every frame here is the shipped quick-add bar rendered with the shipped CSS (Amonkhet theme) over the shipped deck page capture; the right-hand frames have this addendum's change applied.")
            + notes("Design calls", CALLS)
            + frames(frame("<b>Shipped</b> · 390 · typing “s”", "p390-pa-shipped-s.png", 390, 464, "The first row, the one the keyboard's return adds, shows only a bare ↵."),
                     frame("<b>P1</b> · 390 · typing “s”", "p390-pa-p1-s.png", 390, 464, "Every row has the same Add. The brass edge still says which row is first."))
            + notes("↵ on phones", ENTER))
    return doc("Phone Add calls", body, 1240, 1660)

def states():
    body = (head("Add panel · addendum · phone Add · R1", "States of the action cell",
                 "All at 390, the same search. The deck already holds Firebending Lesson.")
            + frames(frame("<b>S1</b> · default and active", "p390-pa-p1-s.png", 390, 464, "Row 1 is active (accent edge), rows 2 and 4 are default. Same Add on all three."),
                     frame("<b>S2</b> · pressed, active row", "p390-pa-p1-s-press0.png", 390, 464, "Under the finger: <code>--elevated</code> fill, <code>--accent</code> border."),
                     frame("<b>S3</b> · pressed, another row", "p390-pa-p1-s-press1.png", 390, 464, "The same press look on any row."),
                     frame("<b>S4</b> · pending, then in deck", "p390-pa-p1-s-added0.png", 390, 464, "After selecting Add: <code>✓ In deck</code> at once while it saves, the art greys. Row 3 shows an in-deck card from before.")))
    return doc("Phone Add states", body, 1838, 820)

def longname():
    body = (head("Add panel · addendum · phone Add · R1", "A long name with its meta line, at 375",
                 "Avabruck Caretaker // Hollowhenge Huntmaster as the active row. The name and the meta line truncate the same way before and after; the row stays 56 tall.")
            + frames(frame("<b>Shipped</b> · 375 · typing “av”", "p375-pa-shipped-av.png", 375, 394, "The bare ↵, and the keyboard hint below a short list."),
                     frame("<b>P1</b> · 375 · typing “av”", "p375-pa-p1-av.png", 375, 394, "Add on the active row; the hint line is gone on a touchscreen.")))
    return doc("Phone Add long name", body, 1040, 760)

def desktop():
    body = (head("Add panel · addendum · phone Add · R1", "Desktop, unchanged",
                 "1300, fine pointer, with the change applied. The active row keeps its ↵ add caption and the hint line stays; this render is pixel-identical to main's.")
            + frames(frame("<b>P1</b> · 1300 · typing “s”", "d1300-pa-p1-s.png", 1300, 280, "")))
    return doc("Phone Add desktop", body, 1430, 620)

os.makedirs(OUT, exist_ok=True)
for n, f in [("Main", main), ("States", states), ("Long-Name", longname), ("Desktop", desktop)]:
    open(os.path.join(OUT, n + ".dc.html"), "w").write(f())
