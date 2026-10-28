import os, re, sys, shutil, json
import kit
args = sys.argv[1:]
if args and args[0] == "blob":
    kit.MODE["blob"] = True; kit.BLOB.update(json.load(open("blobs_root.json"))); args = args[1:]
import b6a_empty
out = "out"
os.makedirs(out, exist_ok=True)
for name, mod in [("Filtered-Empty", b6a_empty)]:
    s = mod.board()
    open(f"{out}/{name}.dc.html", "w").write(s)
    helm = re.search(r"<helmet>(.*?)</helmet>", s, re.S).group(1)
    body = re.search(r"</helmet>(.*?)</x-dc>", s, re.S).group(1)
    open(f"{out}/{name}.flat.html", "w").write(f"<!doctype html><html><head><meta charset=utf-8>{helm}</head><body>{body}</body></html>")
    print("wrote", name)
