import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
mode = sys.argv[1] if len(sys.argv) > 1 else "local"
if mode == "blob":
    kit.MODE["blob"] = True; kit.BLOB.update(json.load(open("blobs.json")))
import boards as B
out = "out" if mode == "local" else sys.argv[2]
os.makedirs(out, exist_ok=True)
for n, fn, _ in B.BOARDS:
    open(f"{out}/{n}.dc.html", "w").write(fn()); print("wrote", n)
