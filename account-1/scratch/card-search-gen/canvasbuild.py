import json, os, re
SRC = "/home/claude/assets/account-1/design_handoff_the99_card_search"
OUT = os.path.join(os.path.dirname(__file__), "..", "canvas", "project")
BLOB = {"lathliss":"3056f91a9c7828e55327024270c8b9ff","ghalta":"f62379d873c9be628919997684c38676","killian":"acb6bd10779d8421303f44510add89a5","giada":"b8cdd42ee17e8fd087de47e53c17c2b5","invisible-woman":"4e8d07061c79d31375bac3aa91e0596a","zimone":"229273ab0fc98f12b78e887216d8e2f2","heroes":"67106d2f8a9f91d574acdba992519c16","ashling":"f614bff6c964e1ae5ccc60c71d3f68fc","dina":"355a13c28cad4fa2919f436f524dd8d1","doom":"21898b9cb41b11614b49e8144d068e3a","quintorius":"c943552057939c101c0fb79a3b4736a2","rootha":"c355fbe569e87884fb9e82defdeb5d9f","zada":"2dfe5315e95c741779208fd79fa13724","captain-america":"20bf15130d8441996526f7c6cfb188b2","gisa":"73811488b2b5e563f435bdf2f9bd3bc4","miku":"c83e17fc3fcf44af2d4014ddb4eb653e","sai":"7ef5827b89666f77ca220602d0e5d238"}
MAP = [("The 99 - Card Search (R1)","Main","Card search R1 · calls, locks, gaps"),
       ("R1 - Sheet-Phone","Sheet-Phone","The search sheet · phone"),
       ("R1 - Header-Phone","Header-Phone","Header icon and quick return · phone"),
       ("R1 - Rows","Rows","The result row"),
       ("R1 - Rail-Desktop","Rail-Desktop","The rail field and ⌘K · desktop"),
       ("R1 - Deck-Page","Deck-Page","Two searches on the deck page"),
       ("The 99 - About · Card Search Entry","About-Entry","About entry · Looking up any card")]
size = {json.loads(l)["file"]: json.loads(l)["size"] for l in open(os.path.join(os.path.dirname(__file__), "..", "final2.jsonl"))}
os.makedirs(OUT, exist_ok=True)
pos = {"Main":(0,0),"Sheet-Phone":(1780,0),"Header-Phone":(3710,0),"Rows":(0,3353),"Rail-Desktop":(1930,3353),"Deck-Page":(4780,3353),"About-Entry":(0,4967)}
boards = {}
for src, name, title in MAP:
    s = open(f"{SRC}/{src}.dc.html").read()
    s = re.sub(r"art/([a-z-]+)\.jpg", lambda m: "/_blob/" + BLOB[m.group(1)], s)
    w, h = size[src]
    s = re.sub(r'"\$preview":\{"width":\d+,"height":\d+\}', f'"$preview":{{"width":{w},"height":{h}}}', s)
    assert not re.search(r"(src=\"|url\()art/", s), name
    open(f"{OUT}/{name}.dc.html", "w").write(s)
    x, y = pos[name]
    boards[f"{name}.dc.html"] = {"x": x, "y": y, "w": w, "h": h, "title": title}
c = {"v":3,"createdOnFiles":{"v":1,"at":"2026-10-16T16:55:00Z"},"title":"The 99 · Card search R1","launch":{"view":"canvas"},"pages":[],
     "boards":boards,"order":list(boards),"notes":{},"designSystems":[]}
json.dump(c, open(f"{OUT}/canvas.json","w"), ensure_ascii=False, indent=1)
print(json.dumps({k:(v["x"],v["y"],v["w"],v["h"]) for k,v in boards.items()}))
