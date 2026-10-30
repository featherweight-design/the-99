import json, os, sys, shutil
import kit
if len(sys.argv) > 1 and sys.argv[1] == "blob":
    kit.MODE["blob"] = True
    kit.BLOB.update(json.load(open("blobs.json")))
import boards
os.makedirs("out", exist_ok=True)
shutil.copy("support.js", "out/support.js")
if not kit.MODE["blob"] and not os.path.exists("out/art"):
    os.symlink(os.path.abspath("art"), "out/art")
only = [a for a in sys.argv[1:] if a != "blob"]
for name, fn, _ in boards.BOARDS:
    if only and name not in only: continue
    open(f"out/{name}.dc.html", "w").write(fn())
    print("wrote", name)
