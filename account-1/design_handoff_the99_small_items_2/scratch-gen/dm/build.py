import os, sys, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit, boards as B
mode = sys.argv[1] if len(sys.argv) > 1 else "local"
kit.MODE["blob"] = mode == "blob"
if mode == "blob":
    import json; kit.BLOB.update(json.load(open("blobs.json")))
out = "out" if mode == "local" else "canvas/project"
os.makedirs(out, exist_ok=True)
if mode == "local":
    shutil.copytree("art", f"{out}/art", dirs_exist_ok=True)
for n, fn, _ in B.BOARDS:
    open(f"{out}/{n}.dc.html", "w").write(fn())
    print("wrote", n)
