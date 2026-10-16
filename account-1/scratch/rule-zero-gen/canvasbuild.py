import json, os, re
SRC = "/home/claude/assets/account-1/design_handoff_the99_rule_zero"
OUT = "/tmp/claude-0/-home-claude/6f79b1ef-3ed8-5e9e-b89c-ca8ae0e25f1d/scratchpad/canvas/project"
BLOB = {"ashling":"ac8ee666463e6ef6315a3e9b721160bf","dina":"23fe5ec34149a9831f66db0787f65b08","ghalta":"f8f41ee3bbbd61b76fa12945a0fbe88b","giada":"eb8e996d0b575a1b2821299345c57c4e","gisa":"bd44ba6de3db9530802f0c1a2ade3f05","jace":"7aee02742fb88802cf5812ae513400f8","killian":"5d04896a97dbb37a286a1305792a64ff","miku":"07b2b93218cc56e3cb5c2399d9fdae6d","rootha":"249d5b4570049ccac467b38bcc450492","sai":"000f8fb8e8c503dcf26afb7a72a2a7d9","zimone":"59eb7eb4663f619e00a0ba196f1025fa"}
size = json.load(open(os.path.join(os.path.dirname(__file__), "sizes.json")))
ROWS = [
  ("Start here, and the phone (390)", [("The 99 - Rule Zero (R1)","Main","Rule 0 check R1 · calls, locks, gaps"),("R1 - Entry-Phone","Entry-Phone","Entry · phone"),("R1 - Setup-Phone","Setup-Phone","Setup · phone"),("R1 - Log-Phone","Log-Phone","Log and expiry · phone")]),
  ("The read and the swap, phone (390)", [("R1 - Read-Phone","Read-Phone","The read · phone"),("R1 - Swap-Phone","Swap-Phone","Suggestion and swap · phone")]),
  ("Desktop (1300): entry and setup", [("R1 - Entry-Desktop","Entry-Desktop","Entry · desktop"),("R1 - Setup-Desktop","Setup-Desktop","Setup · desktop")]),
  ("Desktop (1300): the read and the swap", [("R1 - Read-Desktop","Read-Desktop","The read · desktop"),("R1 - Swap-Desktop","Swap-Desktop","Suggestion and swap · desktop")]),
  ("Desktop (1300): logging and expiry", [("R1 - Log-Desktop","Log-Desktop","Log and expiry · desktop")]),
  ("R2: desktop seat layout, option A vs option B", [("R2 - Desktop-Options","Desktop-Options","R2 · desktop seat layout · A vs B")]),
]
os.makedirs(OUT, exist_ok=True)
boards, notes, y = {}, {}, 0
for ri, (title, items) in enumerate(ROWS):
    y += 300
    notes[f"row{ri+1}"] = {"x": 0, "y": y - 260, "text": title, "kind": "title1", "maxW": 4000}
    x, rowh = 0, 0
    for src, name, t in items:
        s = open(f"{SRC}/{src}.dc.html").read()
        s = re.sub(r"art/([a-z-]+)\.jpg", lambda m: "/_blob/" + BLOB[m.group(1)], s)
        assert "art/" not in re.sub(r"/_blob/\w+", "", s) or True
        assert not re.search(r'(src="|url\()art/', s), name
        w, h = size[src + ".dc.html"]
        open(f"{OUT}/{name}.dc.html", "w").write(s)
        boards[f"{name}.dc.html"] = {"x": x, "y": y, "w": w, "h": h, "title": t}
        x += w + 80; rowh = max(rowh, h)
    y += rowh + 120
c = {"v":3,"createdOnFiles":{"v":1,"at":"2026-10-16T22:30:00Z"},"title":"The 99 · Rule 0 check R1","launch":{"view":"canvas"},"pages":[],
     "boards":boards,"order":list(boards),"notes":notes,"designSystems":[]}
json.dump(c, open(f"{OUT}/canvas.json","w"), ensure_ascii=False, indent=1)
print(json.dumps({k:(v["x"],v["y"],v["w"],v["h"]) for k,v in boards.items()}))
