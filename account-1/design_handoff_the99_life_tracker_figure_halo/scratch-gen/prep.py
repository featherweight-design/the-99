# Turns the shots into the boards' webp art (board/art/lf-*.webp) and board/data.json.
import json, glob, os
from PIL import Image
O = "board/art"; data = {}
def save(im, k, q=82): im.save(f"{O}/lf-{k}.webp", "WEBP", quality=q, method=6)
def crops(tree, spec, rows, prefix):
    im = Image.open(f"out/shots/{tree}-{spec}.png")
    for r in rows:
        if r["what"] != "±N": continue
        x = r["rect"]; cx, cy = (x["x"] + x["width"] / 2) * 2, (x["y"] + x["height"] / 2) * 2
        w, h = 260, 180
        box = (int(cx - w / 2), int(cy - h / 2), int(cx + w / 2), int(cy + h / 2))
        save(im.crop(box), f"{prefix}-{spec}-{r['seat']}")
for tree in ("base", "prop"):
    m = json.load(open(f"out/measure-{tree}.json"))
    data[tree] = m
    for spec, rows in m.items():
        save(Image.open(f"out/shots/{tree}-{spec}.png"), f"F-{tree}-{spec}", 78)
        crops(tree, spec, rows, f"Z-{tree}")
v = json.load(open("out/measure-var.json")); data["var"] = v
for spec, rows in v.items(): crops("prop", spec, rows, "V")
for t in ("base", "prop"): data["themes-" + t] = json.load(open(f"out/themes-{t}.json"))
for f in sorted(glob.glob("out/shots/prop-M-*.png")):
    save(Image.open(f), "M-" + os.path.basename(f)[7:-4])
json.dump(data, open("board/data.json", "w"), indent=1)
print(len(os.listdir(O)))
