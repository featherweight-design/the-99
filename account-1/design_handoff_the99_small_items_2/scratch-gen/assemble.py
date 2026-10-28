"""Rebuild every board, swap art/ for the canvas /_blob urls, size each $preview, write canvas/project/ and canvas.json."""
import json, os, re, subprocess, datetime
B = json.load(open("blobs.json"))
SRC = {"Main": "dm/out", "Good-To-Know": "about/out_si2", "Try-It": "about/out_si2", "Seat-Picker": "dm/out", "Ledger": "dm/out",
       "Filtered-Empty": "out", "Quick-Add-Details": "dm/out", "Consider-Tile": "dm/out", "Quick-Add-Failed": "dm/out"}
SIZES = {}
for d in ["dm", "about", "."]:
    p = os.path.join(d, "sizes.json")
    if os.path.exists(p): SIZES.update(json.load(open(p)))
TITLES = {"Main": "R1 · the eight calls, your decisions, the gaps", "Good-To-Know": "1 · About, Good to know (ratify)",
          "Try-It": "2 · About, Try it: N more below", "Seat-Picker": "3 · Seat picker: A deck not listed",
          "Ledger": "5 · The ledger’s numbers (#477)", "Filtered-Empty": "6a · Filtered-empty states (#412)",
          "Quick-Add-Details": "6b · Card details from quick-add (#412)", "Consider-Tile": "7 · Divergences and the consider tile (#182)",
          "Quick-Add-Failed": "8 · Quick-add’s failed search (#172)"}
ROWS = [["Main", "Good-To-Know", "Try-It"], ["Seat-Picker", "Ledger", "Filtered-Empty"], ["Quick-Add-Details", "Consider-Tile", "Quick-Add-Failed"]]
os.makedirs("canvas/project", exist_ok=True)
boards, order, y = {}, [], 0
for row in ROWS:
    x, hmax = 0, 0
    for n in row:
        w, h = SIZES[n]
        s = open(f"{SRC[n]}/{n}.dc.html").read()
        s = re.sub(r'art/([A-Za-z0-9._-]+)', lambda m: B[m.group(1)], s)
        assert "art/" not in s, n
        s = re.sub(r'"\$preview":\{"width":\d+,"height":\d+\}', f'"$preview":{{"width":{w},"height":{h}}}', s)
        fn = f"{n}.dc.html"
        open(f"canvas/project/{fn}", "w").write(s)
        boards[fn] = {"x": x, "y": y, "w": w, "h": h, "title": TITLES[n]}
        order.append(fn)
        x += w + 80; hmax = max(hmax, h)
    y += hmax + 120
idx = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
       "title": "The 99 · Small items 2 · R1", "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order,
       "notes": {}, "designSystems": []}
json.dump(idx, open("canvas/project/canvas.json", "w"), indent=1, ensure_ascii=False)
print(json.dumps({k: (v["w"], v["h"]) for k, v in boards.items()}))
