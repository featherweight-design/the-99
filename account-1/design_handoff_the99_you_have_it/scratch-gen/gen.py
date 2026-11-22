# You have a card a friend wants R1 (account 1, 2026-11-22): writes the boards twice,
# for the canvas (/_blob urls from blobs.json) and for the repo (art/).
import json, sys, os
mode, out = sys.argv[1], sys.argv[2]
BLOB = json.load(open(os.path.join(os.path.dirname(__file__), "blobs.json"))) if mode == "canvas" else {}
def src(k): return BLOB[k] if mode == "canvas" else f"art/yh3-{k}.webp"
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
def head(t, p): return f'<div style="display:flex;flex-direction:column;gap:10px"><h2 style="margin:0;font:700 30px \'Chakra Petch\',sans-serif;color:#E6E8F0">{t}</h2><p style="margin:0;font-size:15px;line-height:1.6;color:#B1B6C7;max-width:1200px">{p}</p></div>'
def label(t): return f'<span style="font:500 11px \'IBM Plex Mono\',monospace;letter-spacing:.12em;text-transform:uppercase;color:#FF6FAE">{t}</span>'
def fig(k, w, h, cap, note, radius=28):
    return f'''<figure style="margin:0;display:flex;flex-direction:column;gap:12px;width:{w}px;flex:none">
<img src="{src(k)}" alt="{cap}" style="width:{w}px;height:{h}px;display:block;border-radius:{radius}px;border:1px solid #262A35;object-fit:cover;object-position:top">
<figcaption style="display:flex;flex-direction:column;gap:6px">
<p style="margin:0;font:600 15px 'IBM Plex Sans',sans-serif;color:#E6E8F0">{cap}</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#959AAD">{note}</p>
</figcaption>
</figure>'''
def row(lbl, figs, gap=40): return f'<div style="display:flex;flex-direction:column;gap:14px">{label(lbl)}<div style="display:flex;gap:{gap}px;align-items:flex-start;flex-wrap:wrap">{"".join(figs)}</div></div>'
def ph(k, cap, note): return fig(k, 292, 632, cap, note)
def ph(k, cap, note): return fig(k, 292, 632, cap, note)
def dk(k, cap, note, w=650): return fig(k, w, round(w * 900 / 1300), cap, note, 12)
def call(n, t, body): return f'<div style="display:flex;flex-direction:column;gap:8px;padding:20px 24px;border:1px solid #262A35;border-radius:14px;background:#11131A"><p style="margin:0;font:600 17px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:#FF6FAE">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{body}</div></div>'
def ul(items): return '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">' + "".join(f"<li>{i}</li>" for i in items) + '</ul>'
def m(t): return f'<span style="font-family:\'IBM Plex Mono\',monospace;color:#E6E8F0">{t}</span>'
def q(n, t, body, rec): return f'<div style="display:flex;flex-direction:column;gap:6px;padding:16px 20px;border:1px solid #FF6FAE;border-radius:12px"><p style="margin:0;font:600 15px \'IBM Plex Sans\',sans-serif;color:#E6E8F0"><span style="font-family:\'IBM Plex Mono\',monospace;color:#FF6FAE">{n}</span> · {t}</p><div style="font-size:14px;line-height:1.6;color:#B1B6C7">{body}</div><p style="margin:0;font-size:13px;color:#959AAD"><b style="color:#E6E8F0">Recommended:</b> {rec}</p></div>'

boards = {}
boards["Main.dc.html"] = (1560, 2000, "Main", page("You have it R3: main", 1560, 2000,
 head("You have a card a friend wants · R3",
  "The mirror of #3202. A friend's Wishlist tab marks the cards you can spare, a call-out at the top says how many, and a tile's press opens your spare with <b>Offer</b>. Your /friends list says how many of each friend's wanted cards you can spare. Nothing changes on your own collection or wishlist. Rendered from main f17ab2a with shipped components (the #3202 tile press, the deck page's to-do card row, the spares modal, Waiting on you). Friends are Colin and Max; art is from other handoffs.")
 + '<div style="display:flex;gap:40px;align-items:flex-start">'
 + '<div style="display:flex;flex-direction:column;gap:16px;flex:1 1 0;min-width:0">'
 + call("1", "A friend's wishlist marks the cards you can spare", ul([
   "The #3202 press on the friend's tile, over the caption's lower right, the tile press's sibling. <b>Spares only</b>: a copy every deck of yours is using draws nothing.",
   f"The spare request marks ride the glyph: accent dot while an ask or offer between you is open ({m('asked you')}, {m('offered')}), green tick once agreed ({m('accepted')}, the shipped word).",
   "<b>No overlap:</b> once any tile draws a press, every tile's wants line takes the press's 26px height, so the press sits beside it and never under the card's name, and the grid stays even.",
   "Loading: the tab draws as shipped; the call-out, filter, key and presses fade in when the read lands. A failed read draws nothing."]))
 + call("2", "A call-out at the top, and a filter under it", ul([
   f"The call-out is a statement: the deck page's to-do card row with no press. Eyebrow {m('Your spares')}, the spare glyph's tile, {m('You have 4 to spare')} / {m('Lathliss, Giada, Jace and Tam. Offer one from its tile.')}",
   f"<b>B (recommended): a filter.</b> The shipped segmented switch (History's compact, neutral one) right under it: {m('All · 9')} / {m('You can spare · 4')}. The list's own control, where a filter belongs, and it sits on the left edge at both widths.",
   f"<b>A: a toggle in the call-out.</b> The shipped checkbox, {m('Only these')}, right after the names: under them on the phone, on the same line from md. Drawn on the Filter board.",
   "No spares: no call-out, no filter (the tab as shipped). The head's count stays the list's."]))
 + call("3", "The press opens your spare, with Offer", ul([
   f"The spares modal's shell, {m('You have this')}: the card box ({m('on Colin’s wishlist · wants 2')}) and {m('Your spares · N')} with one row and one <b>Offer</b>.",
   f"Then {m('Offered')} with days left, {m('Accepted')} in green, or {m('Declined')}. If Colin already asked you, the row is their ask with Yes, No and days left.",
   f"Offer is Ask in reverse: Colin gets Waiting on you's row {m('Spare offer')}: {m('Max is offering you Lathliss')} / {m('Max has 1 spare. You want 2.')} with Yes and No, under the ask's rules (14 days, one open per card, ✕ withdraws)."]))
 + call("4", "/friends rows count what you can spare", ul([
   "The shipped spare chip (glyph and count) on a friend's row, before ›, when you can spare any of their wanted cards. It opens their Wishlist tab.",
   "No count of zero; a friend with an empty wishlist draws nothing."]))
 + '</div>'
 + '<div style="display:flex;flex-direction:column;gap:28px;flex:none;width:620px">'
 + '<div style="display:flex;gap:20px">' + ph("p-b0", "Colin's wishlist", "Call-out, filter, key, presses.") + ph("p-f2", "The sheet", "Lathliss: 1 spare, Offer.") + '</div>'
 + dk("d-b1", "Desktop, filtered", "You can spare · 4 chosen.", 620)
 + '</div></div>'
 + q("Q1", "Toggle in the call-out (A) or a filter under it (B)?", "Both narrow the grid to the cards you can spare; the Filter board draws them side by side, on and off, at both widths.", "B. The call-out stays a plain statement and the control is the list's own, as History's switch is; A puts a control inside a message.")
 + '<div style="display:flex;flex-direction:column;gap:10px;padding:20px 24px;border:1px solid #262A35;border-radius:14px">' + label("R3 · Hugh's note, 2026-11-22")
 + '<div style="font-size:14px;line-height:1.6;color:#B1B6C7">' + ul(["The Show button read wrong and sat far from the text on desktop: replaced by a toggle beside the text (A) or a filter (B)."]) + '</div></div>'
 + '<div style="display:flex;flex-direction:column;gap:10px;padding:20px 24px;border:1px solid #262A35;border-radius:14px">' + label("R2 · Hugh's notes, 2026-11-22")
 + '<div style="font-size:14px;line-height:1.6;color:#B1B6C7">' + ul([
   "The press overlapped a card's name on the phone: the wants line now takes the press's height, so the name runs clear.",
   f"{m('Sparing')} is gone: the agreed state is the shipped {m('accepted')} / {m('Accepted')}.",
   "The in-your-decks dot is gone: only spares are marked, on the tile and in the sheet.",
   f"{m('Max can spare you…')} is now {m('Max is offering you…')}.",
   f"{m('you have N')} left the key for a page call-out, the deck page's to-do card row (call 2).",
   "B (/friends count) joins the design as call 4; C is cut.",
 ]) + '</div></div>'))

boards["Wishlist.dc.html"] = (1700, 2380, "Wishlist", page("You have it R3: a friend's wishlist", 1700, 2380,
 head("A friend's wishlist · the cards you can spare", "Colin wants nine cards. You can spare four: Lathliss; Giada (Colin asked you); Jace (Colin accepted your offer); Tam. Zimone sits in one of your decks, so it draws nothing. Drawn with the filter (B).")
 + row("Phone 390", [
   ph("p-f0", "F0 · Loading", "The tab as shipped."),
   ph("p-b0", "F1 · Loaded", "Call-out, filter, key, presses. The wants line takes the press's height on every tile."),
   ph("p-b1", "F2 · Filtered", "You can spare · 4."),
   fig("p-tiles", 300, 191, "Close up", "The name runs clear of the press.", 12)])
 + row("Desktop 1300", [
   dk("d-f0", "D0 · Loading", "Shipped."),
   dk("d-b0", "D1 · Loaded", "The filter on the left edge, under the call-out.")])
 + row("Desktop, filtered", [dk("d-b1", "D2 · Filtered", "Lathliss, Giada, Jace, Tam.")])))

boards["Filter.dc.html"] = (1700, 2840, "Filter", page("You have it R3: toggle or filter", 1700, 2840,
 head("Q1 · A toggle in the call-out, or a filter under it", "Both do one thing: narrow Colin's wishlist to the four you can spare. A keeps the control beside the text it answers; B makes it the list's own filter and leaves the call-out a plain statement.")
 + row("A · Toggle (shipped checkbox), phone", [ph("p-a0", "A · Off", "Only these, under the names."), ph("p-a1", "A · On", "The grid holds the four.")])
 + row("B · Filter (shipped segmented switch), phone", [ph("p-b0", "B · All", "All · 9 chosen."), ph("p-b1", "B · You can spare", "You can spare · 4 chosen.")])
 + row("Desktop 1300", [dk("d-a0", "A · Off", "The checkbox on the text's line, right after the names."), dk("d-b0", "B · All", "The switch under the call-out, on the left.")])
 + row("Desktop, on", [dk("d-a1", "A · On", ""), dk("d-b1", "B · You can spare", "")])))

boards["Sheet.dc.html"] = (1700, 2280, "Sheet", page("You have it R3: your spare", 1700, 2280,
 head("The press opens your spare", "The spares modal's shell with your spare in place of friends: Offer, or Colin's ask answered in place.")
 + row("Phone 390", [
   ph("p-f2", "F3 · Offer", "Lathliss: 1 spare."),
   ph("p-f3", "F4 · Offered", "14 days left. Colin has been told."),
   ph("p-f4", "F5 · Colin asked", "Giada: their ask's Yes, No and days left."),
   ph("p-f6", "F6 · Accepted", "Jace: Colin said yes to your offer.")])
 + row("Desktop 1300", [
   dk("d-f2", "D3 · Offer", "The 640 modal; the press is ringed while open."),
   dk("d-f4", "D4 · Colin asked", "Yes and No on the row's line.")])
 + row("Desktop states", [
   dk("d-f3", "D5 · Offered", ""),
   dk("d-f6", "D6 · Accepted", "")])))

boards["Friends.dc.html"] = (1700, 1830, "Friends", page("You have it R3: /friends", 1700, 1830,
 head("/friends · the count, and the offer waiting", "Your list counts what you can spare each friend (call 4). On Colin's side, your offer waits in Waiting on you (Max stands in for you).")
 + row("Your /friends", [
   ph("p-i1", "B1 · Phone", "Colin 4, Peter 1: the shipped spare chip before ›."),
   dk("d-i1", "B2 · Desktop", "Before the since date.", 1000)])
 + row("Colin's /friends", [
   ph("p-c1", "C1 · Phone", "Spare offer: Max is offering you Lathliss."),
   dk("d-c1", "C2 · Desktop", "The same row.", 1000)])))

os.makedirs(out, exist_ok=True)
for name, (w, h, title, html) in boards.items():
    open(os.path.join(out, name), "w").write(html)
order = list(boards)
x = 0; B = {}
for n in order:
    w, h, t, _ = boards[n]; B[n] = {"x": x, "y": 0, "w": w, "h": h, "title": t}; x += w + 120
json.dump({"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-22T23:20:00Z"}, "title": "You have it R3", "launch": {"view": "canvas"},
  "pages": [], "boards": B, "order": order, "notes": {}, "designSystems": []}, open(os.path.join(out, "canvas.json"), "w"), indent=1)
print("ok", mode)
