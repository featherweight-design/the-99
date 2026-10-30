import os, sys, shutil, importlib, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit, deck
args = sys.argv[1:]
mode = "blob" if args and args[0] == "blob" else "local"
if args and args[0] in ("blob", "local"): args = args[1:]
kit.MODE["blob"] = mode == "blob"
if mode == "blob":
    import json; kit.BLOB.update(json.load(open("blobs.json")))
out = "out" if mode == "local" else args.pop(0)
os.makedirs(out, exist_ok=True)
if mode == "local":
    shutil.copytree("art", f"{out}/art", dirs_exist_ok=True)
BOARDS = {"Main": "b0_main", "Ledger": "b5_ledger", "Quick-Add-Failed": "b8_qa_fail", "Quick-Add-Details": "b6b_qa_detail", "Consider-Tile": "b7_consider", "Seat-Picker": "b3_seat"}
only = args
for name, mod in BOARDS.items():
    if only and name not in only: continue
    m = importlib.import_module(mod)
    s = m.board()
    open(f"{out}/{name}.dc.html", "w").write(s)
    if mode == "local":
        helm = re.search(r"<helmet>(.*?)</helmet>", s, re.S).group(1)
        body = re.search(r"</helmet>(.*?)</x-dc>", s, re.S).group(1)
        open(f"{out}/{name}.flat.html", "w").write(f"<!doctype html><html><head><meta charset=utf-8>{helm}</head><body>{body}</body></html>")
    print("wrote", name)
