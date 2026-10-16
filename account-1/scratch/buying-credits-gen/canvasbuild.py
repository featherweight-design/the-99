import json, re, sys, datetime
SRC, ROOT = sys.argv[1], sys.argv[2]
size = {json.loads(l)["file"]: json.loads(l)["size"] for l in open("final.jsonl")}
MAP = [("The 99 - Buying Credits (R1)","Main","Buying credits R1 · calls, rulings, gaps"),
       ("R1 - Credit-Line","Credit-Line","§1 · The credit line, L1–L8"),
       ("R1 - Surfaces","Surfaces","§1 · The line in place, and the inventory"),
       ("R1 - Billing-Page","Billing-Page","§2 · The Credits page, P1–P8"),
       ("R1 - Plan-and-Cancel","Plan-and-Cancel","§3 · The plan and cancelling it (pick A or B)"),
       ("R1 - Checkout-Return","Checkout-Return","§4 · Back from Checkout, R1–R6"),
       ("R1 - Blocked-and-Off","Blocked-and-Off","§5 and §6 · Blocked, and payments off"),
       ("R1 - Menu-and-Delete","Menu-and-Delete","Menu entry and §7 · the deletion warning")]
rows = [["Main","Credit-Line","Surfaces"],["Plan-and-Cancel","Menu-and-Delete"],["Billing-Page","Checkout-Return","Blocked-and-Off"]]
src_of = {n: s for s, n, _ in MAP}
pos = {}; y = 0
for r in rows:
    x = 0; hmax = 0
    for n in r:
        w, h = size[src_of[n]]; pos[n] = (x, y, w, h); x += w + 80; hmax = max(hmax, h)
    y += hmax + 120
boards = {}
for src, n, title in MAP:
    p = f"{SRC}/{src}.dc.html"
    s = open(p).read()
    w, h = size[src]
    s = re.sub(r'"\$preview":\{"width":\d+,"height":\d+\}', f'"$preview":{{"width":{w},"height":{h}}}', s)
    assert not re.search(r'(src="|url\()art/', s), n
    open(p, "w").write(s)                       # the repo export carries the true size too
    open(f"{ROOT}/project/{n}.dc.html", "w").write(s)
    x, yy, w, h = pos[n]
    boards[f"{n}.dc.html"] = {"x": x, "y": yy, "w": w, "h": h, "title": title}
c = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
     "title": "The 99 · Buying credits R1", "launch": {"view": "canvas"}, "pages": [], "boards": boards,
     "order": list(boards), "notes": {}, "designSystems": []}
json.dump(c, open(f"{ROOT}/project/canvas.json", "w"), ensure_ascii=False, indent=1)
json.dump(c, open(f"{SRC}/canvas.json", "w"), ensure_ascii=False, indent=1)
for k, v in boards.items(): print(k, v["x"], v["y"], v["w"], v["h"])
