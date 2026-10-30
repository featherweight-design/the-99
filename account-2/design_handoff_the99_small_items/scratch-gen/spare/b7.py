import os, sys, json, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
mode = sys.argv[1] if len(sys.argv) > 1 else "local"
out = sys.argv[2] if len(sys.argv) > 2 else "../out"
kit.MODE["blob"] = mode == "blob"
if mode == "blob":
    kit.BLOB.update(json.load(open("../blobs.json")))
import f7 as ci
os.makedirs(out, exist_ok=True)
if mode == "local":
    shutil.copytree("art", f"{out}/art", dirs_exist_ok=True)
for n, fn, _ in ci.BOARDS:
    open(f"{out}/{n}.dc.html", "w").write(fn()); print("wrote", n)
