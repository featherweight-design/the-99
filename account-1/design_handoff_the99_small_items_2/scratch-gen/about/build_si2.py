import json, os, re, sys, shutil
import kit
args = sys.argv[1:]
if args and args[0] == "blob":
    kit.MODE["blob"] = True; kit.BLOB.update(json.load(open("blobs_si2.json"))); args = args[1:]
import b_si2
out = "out_si2"
os.makedirs(out, exist_ok=True)
if not kit.MODE["blob"] and not os.path.exists(f"{out}/art"):
    os.symlink(os.path.abspath("art"), f"{out}/art")
for name, fn in b_si2.BOARDS:
    if args and name not in args: continue
    s = fn()
    open(f"{out}/{name}.dc.html", "w").write(s)
    helm = re.search(r"<helmet>(.*?)</helmet>", s, re.S).group(1)
    body = re.search(r"</helmet>(.*?)</x-dc>", s, re.S).group(1)
    open(f"{out}/{name}.flat.html", "w").write(f"<!doctype html><html><head><meta charset=utf-8>{helm}</head><body>{body}</body></html>")
    print("wrote", name)
