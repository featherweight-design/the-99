#!/usr/bin/env python3
# Add a partner to an existing deck (#491) boards (account 2, 2026-11-21).
import json, os, datetime
from PIL import Image
ROOT = "/home/user/w/canvas/project"

def size(fid):
    return Image.open(f"{ROOT}/art/{fid}.webp").size

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;family=Cinzel:wght@600;700;800&amp;display=swap" rel="stylesheet">
<style>
body{{margin:0;background:#0D0B09}}
p{{margin:0}}
.lab{{font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#948B78}}
.lab b{{color:#CF8745;font-weight:600}}
.cap{{font-size:13px;line-height:1.55;color:#A59C89}}
.cap b{{color:#EDE6D8;font-weight:600}}
.q{{font-family:'IBM Plex Mono',monospace;font-size:12.5px;color:#EDE6D8}}
.it{{display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;font-size:14px;line-height:1.6;color:#C0B8A6}}
.it b{{color:#EDE6D8;font-weight:600}}
.n{{font:600 12px 'IBM Plex Mono',monospace;color:#CF8745;padding-top:2px}}
.box{{border:1px solid #3A3229;border-radius:14px;padding:22px 24px;display:flex;flex-direction:column;gap:12px;background:#15120F}}
.shot{{display:block;width:100%;border-radius:14px;border:1px solid #3A3229}}
table{{border-collapse:collapse;width:100%;font-size:13px;color:#C0B8A6}}
td{{border-top:1px solid #2A241E;padding:7px 10px 7px 0;vertical-align:top;line-height:1.5}}
td:first-child{{color:#EDE6D8;width:22%}}
</style>
</helmet>
<div style="width: {w}px; min-height: {h}px; box-sizing: border-box; padding: 48px 56px 64px; background: #0D0B09; font-family: 'IBM Plex Sans', sans-serif; color: #EDE6D8; display: flex; flex-direction: column; gap: 30px">
"""
TAIL = """</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""

def header(tag, h2, lede):
    return f"""<div style="display: flex; flex-direction: column; gap: 9px; max-width: 1240px">
<p class="lab"><b>{tag}</b></p>
<h2 style="margin: 0; font: 700 30px 'Cinzel', serif">{h2}</h2>
<p style="font-size: 14px; line-height: 1.6; color: #C0B8A6">{lede}</p>
</div>
"""

def col_w(fid):
    return 900 if fid.endswith("desk") else 390

def shots(items):
    out = '<div style="display: flex; gap: 40px; align-items: flex-start">\n'
    for fid, lab, alt, cap in items:
        out += f'<div style="display: flex; flex-direction: column; gap: 10px; width: {col_w(fid)}px; flex: none"><p class="lab"><b>{fid.split("-")[0]}</b> · {lab}</p><img class="shot" src="art/{fid}.webp" alt="{alt}"><p class="cap">{cap}</p></div>\n'
    return out + "</div>\n"

def row_h(items):
    best = 0
    for fid, lab, alt, cap in items:
        w, h = size(fid)
        best = max(best, round(h * col_w(fid) / w) + 30 + 22 * (1 + len(cap) // 52))
    return best

boards = []
def emit(name, title, rows, head):
    w = 112 + max(sum(col_w(f[0]) for f in r) + 40 * (len(r) - 1) for r in rows)
    w = max(w, 1352)
    h = 48 + 170 + sum(row_h(r) + 30 for r in rows) + 64
    body = head + "".join(shots(r) for r in rows)
    with open(f"{ROOT}/{name}", "w") as f:
        f.write(HEAD.format(title=title, w=w, h=h) + body + TAIL.format(w=w, h=h))
    boards.append((name, title, w, h))

emit("PA-Door.dc.html", "Door", [[
    ("D1-phone", "card details, phone", "Ishai's card details with a Second commander box", "The commander’s own card details, opened on its deck page. A box under the oracle text, in the card facts box’s style: <b>Second commander</b>, one line naming the ability, and <b>Add a partner</b>, 44px. It opens Change commander on its Add a partner section."),
    ("D1-desk", "card details, desktop", "Desktop card details with the same box", "Desktop: the button sits beside the line at 36px. Drawn only for a single-commander deck whose commander prints a pair ability, on its own deck page, behind CHANGE_COMMANDER_ENABLED. No ability: no box."),
]], header("Door", "Where adding a partner starts", "Both doors, one sheet. Change commander already lists the pairs a deck’s own 99 can make, so the outside partners join that list. The commander’s card details is where a player reads “Partner” and learns the deck can take one, so it carries the second door."))

emit("PA-List.dc.html", "List", [[
    ("L1-phone", "the list, phone", "Change commander with Add a partner on top", "<b>Add a partner</b> first, then the shipped list under <b>Replace Ishai</b>. Yours, then To buy (first 5, Show all), each by the figure the pair’s decks give. A partner already in the 99 keeps the shipped pairUpKeep and reads <b>in this deck · nothing leaves</b>."),
    ("L2-phone", "a figure open", "A partner row with its figure open", "The shipped figure, for the pair: the deck’s cards Ishai + Bruse Tarl decks run. One row open at a time."),
    ("L1-desk", "the list, desktop", "Desktop list", "Each row: the partner’s art, name and shipped mark (free, held in another deck, or buy with price), its cost, and <b>widens to</b> with the pair’s colors and name when it adds any. The dialog scrolls as shipped."),
]], header("List", "Finding a partner", "Owned first, then to buy, ordered by how many of this deck’s cards the pair’s decks run. The lede says once that a partner from outside takes a slot, and names the ability’s rule. Choose opens the confirm in the same sheet."))

emit("PA-Confirm.dc.html", "Confirm", [[
    ("C1-phone", "confirm, phone", "Confirm with Plains as the suggested cut", "Change commander’s confirm: <b>Leaves the deck</b> Plains → <b>Lead the deck</b> Ishai (stays) + Bruse Tarl (free). Then the widened identity, then <b>The card that leaves</b>: Suggested changes’ cut line, three of them, the first picked. One tap still confirms."),
    ("C2-phone", "another pick, colors open", "Hedron Archive picked, the red cards listed", "Picking another line moves the pick (one card leaves). The plate and the sentence follow it. <b>12 of your red cards are in their decks</b> opens the shipped figure plate with their names."),
    ("C3-phone", "cut another card", "Searching the 99 for Ponder", "<b>Cut another card</b> searches the 99 and shows matches as the same lines, so any card can go. Clearing the field brings the three suggestions back."),
    ("C1-desk", "confirm, desktop", "Desktop confirm", "Desktop: one column, buttons in a row. The CTA is the shipped pair CTA, <b>Make Ishai and Bruse Tarl commanders</b>."),
]], header("Confirm", "Choosing the card that leaves", "A deck at 100 goes to 101 when a partner comes from outside, so the confirm asks which card leaves, with a suggestion picked. Suggestions: a basic land while the deck runs 37 or more (the land count drops to 36 with two commanders), then the two cards the pair’s decks run least. No model call."))

emit("PA-States.dc.html", "States", [[
    ("C4-phone", "a partner to buy", "Thrasios to buy", "Unowned: the shipped buy tag under its card and the shipped buy line. It widens to Bant, so the line counts green cards."),
    ("C5-phone", "the deck has room", "No cut when the deck has room", "A deck under 100 (here 96 in the 99) has room: no cut section, and the sentence says so with the count after."),
    ("C6-phone", "no version yet", "A brew's confirm", "A brew can’t Discard back, and a pair never becomes one commander, so the line says the Undo that follows is the only way back."),
    ("C7-desk", "failed", "The write failed", "Shipped failure: the danger line under the buttons, the primary reads Try again, and the pick is kept."),
]], header("States", "To buy, room, brew, failed", "Each one is the confirm with one thing changed. Loading and a failed list read are the shipped sheet’s, unchanged."))

emit("PA-After.dc.html", "After", [[
    ("A1-phone", "deck page, phone", "The deck under the pair with the Undo toast", "The sheet closes on the deck under the pair (98 in the body). A deck toast says both moves, <b>Bruse Tarl joins Ishai. Plains left the deck.</b>, with <b>Undo</b>, which puts both back."),
    ("A1-desk", "deck page, desktop", "Desktop deck page with the toast", "Desktop: the shipped toast slot. The pending banner shows the shipped commander line, and Plains as a cut."),
    ("A2-phone", "review page", "Review Commander section", "Review: the shipped Commander section reads <b>a partner joins</b>; Plains sits in Going out. History after commit: the shipped version line <b>Ishai → Ishai & Bruse Tarl</b>, with Plains in its diff."),
]], header("After", "Undo, review and history", "Nothing new on the deck page but the toast. Discard undoes a pending change as shipped; the toast’s Undo is for right after, and is the only way back on a brew."))

emit("PA-Rules.dc.html", "Rules", [[
    ("V1-phone", "Choose a Background", "Lae'zel offered Backgrounds", "<b>Add a Background</b>: any Background, which leads beside the commander and isn’t a creature. Needs canPair to learn Backgrounds (G1)."),
    ("V2-phone", "Friends forever", "Hargilde offered Friends forever commanders", "Any other Friends forever commander. Same rows and confirm."),
    ("V3-phone", "Doctor and companion", "The Tenth Doctor offered companions", "<b>Add a companion</b> on a Doctor; <b>Add a Doctor</b> on a companion. A Doctor is a Time Lord Doctor with no other creature types."),
    ("V4-phone", "Partner with", "Pir offered only Toothy", "Partner with names one card: one row, here to buy. Restricted Partner (Character select, Survivors, Father & son) lists only the same label."),
]], header("Rules", "Each pair ability", "The flow is the same for every ability. Only the section title, the rule line and which cards are listed change."))

# Main: the calls
calls = [
    ("Both doors", "Change commander gets an <b>Add a partner</b> section above the shipped list (now headed <b>Replace Ishai</b>). The commander’s card details on its deck page gets a <b>Second commander</b> box whose button opens that section. Neither shows without a pair ability."),
    ("Finding one", "Yours first, then To buy, by the pair’s figure. Rows reuse the candidate row’s art, mark, figure and Choose, plus <b>widens to</b> when the pair adds colors. A partner already in the 99 is the shipped no-cut case."),
    ("The card that leaves", "Suggested changes’ cut line, three suggested, the first picked: a basic land while the deck runs 37+ lands, then the two cards the pair’s decks run least. <b>Cut another card</b> searches the 99. Exactly one pick."),
    ("Wider colors", "Only ever wider, so nothing becomes illegal. The confirm says the new identity and how many owned cards in the new colors the pair’s decks run, and lists them on press."),
    ("Confirm, undo, history", "Shipped pair CTA, lands in pending changes (Discard undoes). A deck toast with <b>Undo</b> follows. Review: shipped <b>a partner joins</b>. History: the shipped <b>Ishai → Ishai & Bruse Tarl</b> line."),
    ("Every ability", "Partner, Partner with, restricted Partner, Friends forever, Choose a Background, Doctor’s companion. Same flow; the title and rule line change."),
]
gaps = [
    ("G1", "canPair has no Background kinds (`partner.ts`). Choose a Background + a Legendary Enchantment — Background, either order; a Background never leads alone."),
    ("G2", "A write for an outside partner with a cut: `changeCommander(deckId, to, {{ cutOracleId }})`. Refused when the cut isn’t in the 99 or is locked, or the deck would end over 100. `offerable()` stops holding the outside case back."),
    ("G3", "Undo from the toast: restores the single commander and the cut card in one write, only while the draft still holds that change unchanged."),
    ("G4", "Suggestions: lands vs 36, then least-run by the pair’s support list (the `growingHits` read). No model spend."),
    ("G5", "The opened-cards count: owned cards in the new colors that the pair’s decks run, from the same support list."),
    ("G6", "A deck already over 100 is not offered the add until it is at 100 or under (not drawn)."),
]
qs = [
    ("Q1", "Both doors (as drawn), or Change commander only?"),
    ("Q2", "Backgrounds drawn as supported, which needs G1. Keep, or leave Backgrounds for later?"),
    ("Q3", "The toast’s Undo is new on this flow. Keep it, or rely on Discard (and no way back on a brew)?"),
]
main = header("#491 · add a partner to an existing deck", "Add a partner from outside the deck", "A player builds a deck, then learns the commander can take a partner that isn’t in the 99. Drawn over the shipped Change commander sheet, its confirm, and Suggested changes’ cut line. Fixture: HD - Ishai (Ishai, Ojutai Dragonspeaker, W/U), 99 cards, 37 lands, v3.")
main += '<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; max-width: 1240px">\n'
main += '<div class="box"><p class="lab"><b>The calls</b></p>' + "".join(f'<div class="it"><span class="n">{i+1}</span><span><b>{t}.</b> {d}</span></div>' for i, (t, d) in enumerate(calls)) + '</div>\n'
main += '<div style="display: flex; flex-direction: column; gap: 24px"><div class="box"><p class="lab"><b>For Hugh</b></p>' + "".join(f'<div class="it"><span class="n">{k}</span><span>{d}</span></div>' for k, d in qs) + '</div>\n'
main += '<div class="box"><p class="lab"><b>Engineering</b></p>' + "".join(f'<div class="it"><span class="n">{k}</span><span>{d}</span></div>' for k, d in gaps) + '</div></div>\n'
main += '</div>\n'
main += '<div class="box" style="max-width: 1240px; box-sizing: border-box"><p class="lab"><b>Boards</b></p><table>' + "".join(
    f'<tr><td>{t}</td><td>{d}</td></tr>' for t, d in [
        ("Door", "D1 card details, phone and desktop."),
        ("List", "L1 list phone and desktop, L2 a figure open."),
        ("Confirm", "C1 suggested cut (phone, desktop), C2 another pick with the colors open, C3 Cut another card."),
        ("States", "C4 to buy, C5 the deck has room, C6 no version yet, C7 failed."),
        ("After", "A1 deck page with the Undo toast (phone, desktop), A2 review."),
        ("Rules", "V1 Background, V2 Friends forever, V3 Doctor and companion, V4 Partner with."),
    ]) + '</table></div>\n'
with open(f"{ROOT}/Main.dc.html", "w") as f:
    f.write(HEAD.format(title="Add a partner", w=1352, h=1180) + main + TAIL.format(w=1352, h=1180))
boards.insert(0, ("Main.dc.html", "Add a partner", 1352, 1180))

# Index: two rows. Main, Door, List / Confirm, States, After, Rules
idx = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "Add a partner to a deck",
       "launch": {"view": "canvas"}, "pages": [], "boards": {}, "order": [], "notes": {}, "designSystems": []}
x = 0; y = 0; rowmax = 0
layout = [["Main.dc.html", "PA-Door.dc.html", "PA-List.dc.html"], ["PA-Confirm.dc.html", "PA-States.dc.html"], ["PA-After.dc.html", "PA-Rules.dc.html"]]
bymap = {b[0]: b for b in boards}
for r in layout:
    x = 0; rowmax = 0
    for name in r:
        _, title, w, h = bymap[name]
        idx["boards"][name] = {"x": x, "y": y, "w": w, "h": h, "title": title}
        idx["order"].append(name)
        x += w + 80; rowmax = max(rowmax, h)
    y += rowmax + 120
json.dump(idx, open(f"{ROOT}/canvas.json", "w"), indent=1)
for b in boards: print(b)
