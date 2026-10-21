import json, re, os, datetime
SRC="out"; ROOT="/tmp/claude-0/-home-claude/116595b4-4c7b-52e5-b8be-ce496abd5a28/scratchpad/canvas"
os.makedirs(ROOT+"/project", exist_ok=True)
size={json.loads(l)["file"]: json.loads(l)["size"] for f in ("final.jsonl","r2sizes.jsonl") for l in open(f)}
BLOB={"art-zimone":"c586eb32234edab401fbae2fe8d2d275","art-giada":"009a5e3ed5f39cd196d604ae78db0717","face-sai":"13cd30f8dea7468223ab3fd53599cfb9"}
TITLES={"R2-Main":"R2 · What changed","R2-Placement":"R2 · The strip on both Homes","R2-Sheet":"R2 · Where they work (sheet and modal)","R2-States":"R2 · Every state","R2-Themes":"R2 · Low Sun and First Frost","Main":"R1 (superseded) · calls, rulings, gaps","Placement":"R1 (superseded) · Item 1 · Where it goes (Open 1)","Section":"R1 (superseded) · Items 2 and 3 · The section, and Try it",
"Line-and-Chip":"Item 4 · The credit line and the chip","Credits-Page":"Item 5 · The Welcome cell","States-A":"R1 (superseded) · Item 6 · Held, partly spent, used up",
"States-B":"R1 (superseded) · Item 6 · Expiring, expired, no lot","States-C":"R1 (superseded) · Item 6 · Switch off, payments off","States-D":"R1 (superseded) · Item 6 · Paid limit, also bought","Themes":"R1 (superseded) · Low Sun and First Frost"}
rows=[["R2-Main","R2-Placement","R2-Sheet","R2-States"],["R2-Themes","Line-and-Chip","Credits-Page"],["Main","Placement","Section","States-A"],["States-B","States-C","States-D","Themes"]]
pos={}; y=0
for r in rows:
    x=0;hm=0
    for n in r:
        w,h=size[n]; pos[n]=(x,y,w,h); x+=w+80; hm=max(hm,h)
    y+=hm+120
boards={}
for r in rows:
    for n in r:
        p=f"{SRC}/{n}.dc.html"; s=open(p).read(); w,h=size[n]
        s=re.sub(r'"\$preview":\{"width":\d+,"height":\d+\}', f'"$preview":{{"width":{w},"height":{h}}}', s)
        open(p,"w").write(s)
        cs=re.sub(r'art/([a-z-]+)\.jpg', lambda m:"/_blob/"+BLOB[m.group(1)], s)
        assert "art/" not in re.sub(r'design-briefs','',cs) or True
        assert not re.search(r'(src="|url\()art/', cs), n
        open(f"{ROOT}/project/{n}.dc.html","w").write(cs)
        x,yy,w,h=pos[n]; boards[f"{n}.dc.html"]={"x":x,"y":yy,"w":w,"h":h,"title":TITLES[n]}
c={"v":3,"createdOnFiles":{"v":1,"at":datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
   "title":"The 99 · Welcome credits","launch":{"view":"canvas"},"pages":[],"boards":boards,"order":list(boards),"notes":{},"designSystems":[]}
json.dump(c,open(f"{ROOT}/project/canvas.json","w"),ensure_ascii=False,indent=1)
json.dump(c,open(f"{SRC}/canvas.json","w"),ensure_ascii=False,indent=1)
for k,v in boards.items(): print(k,v)
