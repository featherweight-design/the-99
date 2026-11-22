# You have a card a friend wants R1 (account 1, 2026-11-22): writes the boards twice,
# for the canvas (/_blob urls from blobs.json) and for the repo (art/).
import json, sys, os
mode, out = sys.argv[1], sys.argv[2]
BLOB = json.load(open(os.path.join(os.path.dirname(__file__), "blobs.json"))) if mode == "canvas" else {}
def src(k): return BLOB[k] if mode == "canvas" else f"art/yh-{k}.webp"
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
boards["Main.dc.html"] = (1560, 1900, "Main", page("You have it R1: main", 1560, 1900,
 head("You have a card a friend wants · R1",
  "The mirror of #3202. There, your Wishlist tile shows a friend's spare and opens Ask. Here, a friend's Wishlist tab shows which of their wanted cards you have, and the press opens your copies with <b>Offer</b>. Nothing changes on your own collection or wishlist. Drawn over the shipped friend page and /friends, rendered from main f17ab2a; new parts are built from shipped components (the #3202 tile press, the spares modal, Waiting on you's row and Yes/No). Friends are Colin and Max; art is from other handoffs, counts are placeholders.")
 + '<div style="display:flex;gap:40px;align-items:flex-start">'
 + '<div style="display:flex;flex-direction:column;gap:16px;flex:1 1 0;min-width:0">'
 + call("1", "A friend's wishlist marks the cards you have", ul([
   "The #3202 press, on a friend's tile: the outlined 26px box over the caption's lower right, 44px hit on touch, the tile press's <b>sibling</b>. Tiles with nothing of yours draw nothing, no slot.",
   f"<b>You can spare it:</b> the spare glyph in fact ink. A spare by your own rule (Settings › Spares: the threshold and Keep), the same copies a friend's Spares tab would show, whether or not your spares are shared with Colin.",
   f"<b>It's in your decks:</b> the shipped committed ownership dot. Every copy is in a deck or draft (or kept back), so it is yours but not a spare.",
   f"The spare glyph takes the spare request marks: accent dot while an ask or offer between you is open ({m('asked you')}, {m('offered')}), green tick once it's agreed ({m('sparing')}).",
   f"A key line under the head names only what the tiles draw: {m('you can spare')} · {m('in your decks')} · {m('asked you')} · {m('sparing')}.",
   "Loading: the tab draws as shipped; one read of your copies for the list's cards lands after it and the presses fade in (160ms, none under reduced motion). A failed read draws nothing."]))
 + call("2", "The press opens your copies", ul([
   f"The shipped spares modal's shell (640 on desktop, the sheet on the phone), titled {m('You have this')}. The card box's kicker: {m('on Colin’s wishlist · wants 2')}.",
   f"{m('Your copies · N')}: a <b>spare</b> row with one <b>Offer</b>, then a row per deck holding a copy (its commander's art, its name linking to the deck, the committed dot and the count).",
   f"After Offer the row reads {m('Offered')} with the days left; after Colin's yes, {m('Sparing')} in green; after a no, {m('Declined')}.",
   "<b>Colin already asked you:</b> no Offer. The row is their ask, with the same Yes, No and days left as Waiting on you, so you can answer where you noticed it.",
   "<b>Only in decks:</b> no press. The foot says every copy is in a deck, so it isn't a spare."]))
 + call("3", "Offer is Ask in reverse", ul([
   "One press, no note, for the copies Colin still wants (capped at your spares). The same rules as an ask: one open per card between two people, 14 days, then it expires; Your requests' ✕ withdraws it.",
   f"Colin gets a <b>Waiting on you</b> row, {m('Spare offer')}: {m('Max can spare you Lathliss')} / {m('Max has 1 spare. You want 2.')} with Yes and No, and Home's lead story and push as an ask's.",
   "Their Yes is an accepted request on their side (Your requests: Max can spare Lathliss; their own tile's spare press ticks green). The handover stays between you, and nobody's collection changes until they change it.",
   "Offering tells Colin you have it even when your spares aren't shared with their pods: the press is yours, so that's on purpose."]))
 + '</div>'
 + '<div style="display:flex;flex-direction:column;gap:28px;flex:none;width:620px">'
 + '<div style="display:flex;gap:20px">' + fig("p-tiles", 300, 180, "The press on a friend's tile", "Spare · none · spare Colin asked for.", 12) + ph("p-f2", "The sheet", "Lathliss: 1 spare, 1 in Ghalta Stomps.") + '</div>'
 + dk("d-f1", "Desktop", "Colin's wishlist with your marks.", 620)
 + '</div></div>'
 + '<div style="display:flex;flex-direction:column;gap:12px">' + label("For Hugh")
 + q("Q1", "Show copies that are only in your decks?", f"The committed dot tells you that you own it, so you can decide to pull it from a deck. Without it, only spares are marked.", "show the dot, with no Offer (Wishlist board, F1 and F5).")
 + q("Q2", "Offer, or just the marker?", "With Offer, the friend gets a Yes/No in Waiting on you and the deal is tracked like an ask. Without it, the sheet is view only and you reach out yourself.", "Offer (Sheet board, F2 to F4, and Friend side).")
 + q("Q3", "Which extras, if any? (Ideas board)", f"<b>A</b>, a count in the key line ({m('you have 4')}); <b>B</b>, a chip on /friends rows with how many of that friend's wanted cards you can spare; <b>C</b>, a {m('You can help')} row in Waiting on you when a friend adds a card you can spare (the reverse of the trade match).", "A and B. Hold C: a new notice kind is more noise than this needs, and B already leads you to the page.")
 + '</div>'))

boards["Wishlist.dc.html"] = (1700, 1560, "Wishlist", page("You have it R1: a friend's wishlist", 1700, 1560,
 head("A friend's wishlist · the cards you have", "Colin wants nine cards. Lathliss: you have 1 spare (and 1 in a deck). Giada: a spare, and Colin asked you for it. Jace: you offered and Colin said yes. Zimone and Tam: only in your decks. The rest: none.")
 + row("Phone 390", [
   ph("p-f0", "F0 · Loading", "The tab as shipped: no presses, no key."),
   ph("p-f1", "F1 · Loaded", "Five presses; the key line names the four kinds drawn."),
   fig("p-tiles", 300, 180, "F1 · Close up", "Spare · nothing · spare, asked you. The caption's line makes room only on a tile with a press.", 12)])
 + row("Desktop 1300", [
   dk("d-f0", "D0 · Loading", "Shipped."),
   dk("d-f1", "D1 · Loaded", "The same press at md, 8px in from the caption's corner.")])))

boards["Sheet.dc.html"] = (1700, 2860, "Sheet", page("You have it R1: your copies", 1700, 2860,
 head("The press opens your copies", "The spares modal's shell with your copies in place of friends. Offer on a spare; Colin's ask answered in place; deck copies listed, never offered.")
 + row("Phone 390", [
   ph("p-f2", "F2 · Spare: Offer", "Lathliss. 1 spare with Offer; 1 copy in Ghalta Stomps."),
   ph("p-f3", "F3 · Offered", "The row reads Offered, 14 days left. Colin has been told."),
   ph("p-f4", "F4 · Colin asked", "Giada. Their ask's Yes, No and days left, in the row."),
   ph("p-f5", "F5 · Only in decks", "Tam. Two decks, no press; the foot says why.")])
 + row("Phone 390, after a yes", [ph("p-f6", "F6 · Sparing", "Jace. Colin said yes to your offer.")])
 + row("Desktop 1300", [
   dk("d-f2", "D2 · Spare: Offer", "The 640 modal over the tab; Lathliss's press is ringed while open."),
   dk("d-f4", "D4 · Colin asked", "Yes and No sit on the row's line from md.")])
 + row("Desktop states", [
   dk("d-f5", "D5 · Only in decks", "No press."),
   dk("d-f3", "D3 · Offered", "Offered, days left.")])))

boards["Friend-side.dc.html"] = (1700, 1300, "Friend side", page("You have it R1: the friend's side", 1700, 1300,
 head("Colin's side · the offer waits on them", "Max (you, as Colin sees you) offered Lathliss. It's an ask turned around: Waiting on you's own row with Yes, No and the days left; its Home story, push and receipt are the ask's.")
 + row("Phone 390 and desktop 1300", [
   ph("p-c1", "C1 · Waiting on you", "Spare offer: Max can spare you Lathliss."),
   dk("d-c1", "C2 · Desktop", "The same row on /friends.", 1000)])))

boards["Ideas.dc.html"] = (1700, 2580, "Ideas", page("You have it R1: other ideas", 1700, 2580,
 head("Other ideas · Q3", "Three extras around the same fact. Each stands alone; none is needed for the tile and Offer.")
 + row("A · A count in the key line", [
   ph("p-fc", "A · Phone", "you have 4 leads the key line on Colin's wishlist."),
   dk("d-fc", "A · Desktop", "Same line, one row.")])
 + row("B · /friends rows say how many you can spare", [
   ph("p-i1", "B · Phone", "Colin: 2, Peter: 1. The shipped spare chip before ›; the row still opens their page."),
   dk("d-i1", "B · Desktop", "Same chip, before the since date.", 1000)])
 + row("C · You can help (not recommended)", [
   ph("p-i2", "C · Phone", "When a friend adds a card you can spare: a Waiting on you row with Offer."),
   dk("d-i2", "C · Desktop", "A new notice kind, off unless chosen.", 1000)])))

os.makedirs(out, exist_ok=True)
for name, (w, h, title, html) in boards.items():
    open(os.path.join(out, name), "w").write(html)
order = list(boards)
x = 0; B = {}
for n in order:
    w, h, t, _ = boards[n]; B[n] = {"x": x, "y": 0, "w": w, "h": h, "title": t}; x += w + 120
json.dump({"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-22T23:20:00Z"}, "title": "You have it R1", "launch": {"view": "canvas"},
  "pages": [], "boards": B, "order": order, "notes": {}, "designSystems": []}, open(os.path.join(out, "canvas.json"), "w"), indent=1)
print("ok", mode)
