import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from kit import page
import cards, commanders, pieces

ROOT = sys.argv[1]
H = json.load(open(os.path.join(os.path.dirname(__file__), "heights.json"))) if os.path.exists(os.path.join(os.path.dirname(__file__), "heights.json")) else {}

BOARDS = []  # (row, file, title, w, default_h, body)
def add(row, f, title, w, h, body):
    BOARDS.append((row, f, title, w, H.get(f, h), body))

add(0, "Main.dc.html", "A1 · Card · single-faced · Rootha · 1300", 1300, 1300, cards.card_desktop("rootha"))
add(0, "card-dfc-1300.dc.html", "A2 · Card · double-faced · Valki // Tibalt · 1300", 1300, 1300, cards.card_desktop("valki"))
add(0, "card-printings-1300.dc.html", "A3 · Card · several printings · Ghalta · 1300", 1300, 1300, cards.card_desktop("ghalta"))
add(0, "card-noimage-1300.dc.html", "A4 · Card · no image, printings at the cap · Sol Ring · 1300", 1300, 1400, cards.card_desktop("solring"))
add(1, "card-single-390.dc.html", "A1 · Card · single-faced · 390", 390, 2000, cards.card_phone("rootha"))
add(1, "card-dfc-390.dc.html", "A2 · Card · double-faced · 390", 390, 2200, cards.card_phone("valki"))
add(1, "card-printings-390.dc.html", "A3 · Card · several printings · 390", 390, 2100, cards.card_phone("ghalta"))
add(1, "card-noimage-390.dc.html", "A4 · Card · no image · 390", 390, 2000, cards.card_phone("solring"))
add(2, "cmd-full-1300.dc.html", "B1 · Commander · support data and prose · Zimone · 1300", 1300, 1900, commanders.cmd_desktop("zimone"))
add(2, "cmd-noprose-1300.dc.html", "B2 · Commander · data, no prose · Sai · 1300", 1300, 1800, commanders.cmd_desktop("sai"))
add(2, "cmd-absent-1300.dc.html", "B3 · Commander · EDHREC does not index it (absent) · Ashling · 1300", 1300, 1250, commanders.cmd_desktop("ashling"))
add(2, "cmd-degraded-1300.dc.html", "B4 · Commander · support read degraded · Dina · 1300", 1300, 1250, commanders.cmd_desktop("dina"))
add(3, "cmd-full-390.dc.html", "B1 · Commander · full · 390", 390, 3300, commanders.cmd_phone("zimone"))
add(3, "cmd-noprose-390.dc.html", "B2 · Commander · no prose · 390", 390, 3100, commanders.cmd_phone("sai"))
add(3, "cmd-absent-390.dc.html", "B3 · Commander · absent · 390", 390, 1500, commanders.cmd_phone("ashling"))
add(3, "cmd-degraded-390.dc.html", "B4 · Commander · degraded · 390", 390, 1500, commanders.cmd_phone("dina"))
add(4, "signed-out-block.dc.html", "C1 · The signed-out block · both widths", 1300, 520, pieces.block_board())
add(4, "link-previews.dc.html", "C2 · Link previews · card and commander", 1380, 900, pieces.previews_board())
add(5, "not-found-1300.dc.html", "C3 · Unknown address · 1300", 1300, 760, pieces.not_found(False))
add(5, "not-found-390.dc.html", "C3 · Unknown address · 390", 390, 844, pieces.not_found(True))
add(5, "fragments.dc.html", "C4 · Fragments · bracket facts, not legal, blank figures", 1300, 820, pieces.fragments_board())

ROW_TITLES = [
    "Card page · 1300", "Card page · 390", "Commander page · 1300", "Commander page · 390",
    "Signed-out block · link previews", "Unknown address · fragments",
]

os.makedirs(os.path.join(ROOT, "project"), exist_ok=True)
boards, order, notes = {}, [], {}
y = 0
for r in range(6):
    row = [b for b in BOARDS if b[0] == r]
    x = 0
    rowh = 0
    for (_, f, title, w, h, body) in row:
        open(os.path.join(ROOT, "project", f), "w").write(page(title, w, h, body))
        boards[f] = {"x": x, "y": y, "w": w, "h": h, "title": title}
        order.append(f)
        x += (1380 if r in (1, 3) else w + 80)
        rowh = max(rowh, h)
    notes[f"row{r}"] = {"x": 0, "y": y - 260, "text": ROW_TITLES[r], "kind": "title1", "maxW": 5440 if r < 4 else max(x - 80, 1300)}
    y += rowh + 120 + 300

canvas = {
    "v": 3,
    "createdOnFiles": {"v": 1, "at": "2026-10-18T04:40:00Z"},
    "title": "The 99 — Public Card & Commander Pages (R1)",
    "launch": {"view": "canvas"},
    "pages": [],
    "boards": boards,
    "order": order,
    "notes": notes,
    "designSystems": [],
}
json.dump(canvas, open(os.path.join(ROOT, "project", "canvas.json"), "w"), indent=1, ensure_ascii=False)
print(len(boards), "boards")
