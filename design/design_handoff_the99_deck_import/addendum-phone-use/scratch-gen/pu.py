"""Deck import addendum: phone Use (account 2, 2026-11-14). Boards over the SHIPPED resolution expander, rendered with the
shipped CSS from a scratch copy of main + pu.diff (the proposal as code). python3 pu.py <out> [blob]"""
import json, os, sys
OUT = sys.argv[1]; BLOB = "blob" in sys.argv
B = {"p390-ri-shipped.png": "d169f96cdd3a7dff13613a964a0ad912", "p390-ri-p1.png": "17eb3892a2fe6c0e65f31cd59c2b3456",
     "p390-ri-p1-press0.png": "0cfd8883068de2520bcf1061f3bcb0fc", "p390-ri-p1-press2.png": "8b8b425c7afe5a67151ed35270bdfde9",
     "p390-ri-p1-after.png": "77448e5e71a3e3a1e75f6af1138bb112", "p390-ri-p1-none.png": "4a58d67f82097705ee76794a9974ed71",
     "p375-ri-shipped-av.png": "7864403506d82348c60efe5cbd8ce7e1", "p375-ri-p1-av.png": "49183401a0a347d03c045cb3a172f9a4",
     "d1100-ri-shipped.png": "320e98dfa4a8a80d187cf1202e18e23f", "d1100-ri-p1.png": "c564fd2ba252e2f28a3b1541052a58d5",
     "t1024-ri-shipped.png": "b19352b692c22a554d65979391179c48", "t1024-ri-p1.png": "212272c67ade5a0f001bc8d54514c358"}
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


T = "Deck import · addendum · phone Use · R1"
CALLS = [
 "<b>Every phone result draws the ghost Use, the first one included.</b> The shipped ghost the other rows already have: 96 × 40, transparent, <code>1px --border-strong</code>, radius 7, <code>--accent-text</code> 13/600, “Use this”. The bare <code>↵</code> is gone.",
 "<b>The ghost is a picture of the option's press, not its own target.</b> Unlike the Add panel's row, this whole row is one listbox option, and it already acts when selected: a tap anywhere on it uses that card (the shipped <code>onClick</code> on the <code>li</code>). The row is 63 tall at 390, so the tap target is the full row, well over 44. Nothing inside the row opens card details, so there is no second target to keep apart.",
 "<b>No button inside the option.</b> A real button in a <code>role=\"option\"</code> is a nested interactive control, which a listbox doesn't allow, and a screen reader would stop on it as a second item. The ghost stays <code>aria-hidden</code>, as the shipped ghost on the other rows already is. What a screen reader hears doesn't change.",
 "<b>The active row is marked by its own edge, as shipped.</b> Row 1 keeps its <code>--accent</code> border; its Use looks like every other row's, so the most likely card is as plainly usable as the rest.",
 "<b>Pressed.</b> A finger down anywhere on the row (<code>:active</code> on the option, <code>group-active</code> on the ghost) gives the ghost the <code>--elevated</code> fill and the <code>--accent</code> border, the same press look as the Add panel's ghost. No new token.",
 "<b>Pending has no look of its own.</b> Selecting Use drops the line from the list in the same step (the shipped optimistic resolve), so the expander closes at once, the card joins the deck and the group's note says <code>That’s Aang, Swift Savior. 97 built now.</code> The shipped 0.5 dim on pending never paints. Drawn in States, S4.",
 "<b>Desktop is unchanged.</b> The active row keeps <code>↵ use this</code> where a keyboard is likely: md and up with a fine pointer. The desktop render is byte-identical to main (Desktop board).",
 "<b>A touch tablet gets Use too.</b> At md with a coarse pointer the active row draws the ghost “Use this card” like the other rows, and the visible keyboard hint goes back to screen-reader only. The ghost keeps its shipped md size; the target is the 60-tall row, over the tablet's 36.",
]
SR = [
 "<b>Screen readers: unchanged.</b> The field stays the combobox, <code>aria-activedescendant</code> points at the active option, each option keeps its <code>aria-label</code> (name, type, colors, owned) and <code>aria-selected</code>. Selecting an option (VoiceOver double-tap) fires the same <code>onClick</code> and uses that card.",
 "<b>The keyboard hint is still the field's description.</b> It was already screen-reader only on phones. On a touch tablet it now stays screen-reader only instead of showing; it still describes the field there.",
 "<b>Does ↵ still appear on phones? No.</b> The active row's bare <code>↵</code> was the only one this list drew on a phone. The phone keyboard's return still uses the top match, as shipped; the Use on that row now says it.",
 "<b>Copy: no new strings.</b> <code>useShort</code> “Use this” on every phone row, <code>use</code> “Use this card” at md, <code>activeRowHint</code> “↵ use this” on desktop's active row only. All in <code>deckImportCopy.resolve</code>.",
]

def main():
    body = (head(T, "A visible Use on every phone result",
                 "When an import line can't be matched, its row opens a search (state 16). On a phone the first result, the one most likely to be right, showed only a bare ↵, which doesn't read as a button. Same flaw as the Add panel's quick-add rows, same fix. Every frame is the shipped expander rendered with the shipped CSS (Amonkhet theme) under the shipped deck page capture; the right-hand frame has this addendum's change applied.")
            + notes("Design calls", CALLS)
            + frames(frame("<b>Shipped</b> · 390 · line “Aang, Swift Saviour”, typed “aang”", "p390-ri-shipped.png", 390, 890, "The first result shows only a small ↵ at the right edge."),
                     frame("<b>P1</b> · 390 · the same search", "p390-ri-p1.png", 390, 890, "Every result has the same Use. The brass edge still says which row is first."))
            + notes("Screen readers, ↵ and copy", SR))
    return doc("Phone Use calls", body, 1240, 2200)

def states():
    body = (head(T, "States of the action cell",
                 "All at 390, phone, touch. The import line is “Aang, Swift Saviour” (line 34); the player typed “aang”.")
            + frames(frame("<b>S1</b> · default and active", "p390-ri-p1.png", 390, 890, "Row 1 is active (accent edge); rows 2 and 3 are default. The same Use on all three."),
                     frame("<b>S2</b> · pressed, active row", "p390-ri-p1-press0.png", 390, 890, "Finger down anywhere on row 1: the ghost takes <code>--elevated</code> and <code>--accent</code>."),
                     frame("<b>S3</b> · pressed, another row", "p390-ri-p1-press2.png", 390, 890, "The same press look on any row. Lifting the finger uses that card."),
                     frame("<b>S4</b> · pending", "p390-ri-p1-after.png", 390, 844, "Straight after Use: the line is gone, the card is in the deck and the note says so while it saves. Shipped, unchanged."),
                     frame("<b>17</b> · nothing found", "p390-ri-p1-none.png", 390, 844, "No results, so no action cell. Shipped, unchanged.")))
    return doc("Phone Use states", body, 2278, 1260)

def longname():
    body = (head(T, "A long name at 375",
                 "Line “Avabruck Caretaker / Hollowhenge Huntmaster” (one slash, so it didn't match), typed “av”. The active row is the long double-faced name.")
            + frames(frame("<b>Shipped</b> · 375", "p375-ri-shipped-av.png", 375, 965, "The ↵ takes almost no room, so the active row shows more of its name and its ×1 owned."),
                     frame("<b>P1</b> · 375", "p375-ri-p1-av.png", 375, 965, "The active row gives its name the same room rows 2 to 4 already have: name and meta truncate with an ellipsis, as they do. Row height (63) is unchanged.")))
    return doc("Phone Use long name", body, 1040, 1400)

def desktop():
    body = (head(T, "Desktop and touch tablet",
                 "Desktop (1100, fine pointer) is unchanged: both frames are the same image. A touch tablet (1024, coarse pointer) is the one place above md that changes.")
            + frames(frame("<b>Desktop · main</b> · 1100", "d1100-ri-shipped.png", 940, 545, "<code>↵ use this</code> on the active row, the keyboard hint under the field."),
                     frame("<b>Desktop · P1</b> · 1100", "d1100-ri-p1.png", 940, 545, "Identical."))
            + frames(frame("<b>Touch tablet · main</b> · 1024, coarse", "t1024-ri-shipped.png", 940, 545, "A keyboard caption and hint on a device that may have no keyboard."),
                     frame("<b>Touch tablet · P1</b> · 1024, coarse", "t1024-ri-p1.png", 940, 545, "“Use this card” on the active row; the hint is screen-reader only.")))
    return doc("Phone Use desktop", body, 2128, 1540)

os.makedirs(OUT, exist_ok=True)
for n, f in [("Main", main), ("States", states), ("Long-Name", longname), ("Desktop", desktop)]:
    open(os.path.join(OUT, n + ".dc.html"), "w").write(f())
