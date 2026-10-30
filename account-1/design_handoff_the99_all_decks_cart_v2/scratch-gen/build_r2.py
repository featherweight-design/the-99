import os, sys, json, re, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
mode = sys.argv[1] if len(sys.argv) > 1 else "local"
BLOB = {"face-sai.jpg": "/_blob/1f8c3c706d3147031e8168a5ee67f45d", "face-captain-america.jpg": "/_blob/e5c4584575c56a62a676114c45ddd372",
        "face-ghalta.jpg": "/_blob/eb14f72bee1196029fae2c9682653523", "face-giada.jpg": "/_blob/8103846aa278696c9881ba2294b4176b"}
if mode == "blob":
    kit.MODE["blob"] = True; kit.BLOB.update(BLOB)
import r2 as B
out = "out" if mode == "local" else sys.argv[2]
os.makedirs(out, exist_ok=True)
if mode == "local":
    shutil.copytree("art", f"{out}/art", dirs_exist_ok=True)
for n, fn, _ in B.BOARDS:
    s = fn()
    open(f"{out}/{n}.dc.html", "w").write(s)
    if mode == "local":
        helm = re.search(r"<helmet>(.*?)</helmet>", s, re.S).group(1)
        body = re.search(r"</helmet>(.*?)</x-dc>", s, re.S).group(1)
        open(f"{out}/{n}.flat.html", "w").write(f"<!doctype html><html><head><meta charset=utf-8>{helm}</head><body>{body}</body></html>")
    print("wrote", n)
