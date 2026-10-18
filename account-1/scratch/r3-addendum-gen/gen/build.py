import os, sys, importlib, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "build", "flat")
os.makedirs(OUT, exist_ok=True)
shutil.copy("/home/claude/the-99/design/design_handoff_the99_buying_credits/support.js", f"{OUT}/support.js")
only = sys.argv[1:]
for modname in ["credits", "discovery", "overview"]:
    if not os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), modname + ".py")): continue
    m = importlib.import_module(modname)
    for name, fn in m.BOARDS.items():
        if only and name not in only: continue
        open(f"{OUT}/{name}.dc.html", "w").write(fn())
        print("wrote", name)

# ---- parts and art the discovery boards mount (copied from the handoffs on main, blob ids turned back into art/ paths)
import re
FH = "/home/claude/the-99/design/design_handoff_the99_social_r3/addendum-friends-home"
OLD = {"4735a23d607a9beeb42fb43e14c55a38": "art-dina", "b95866d36d8ab8acd28209cda96221a8": "art-ghalta",
       "7d3c5a2e7417781f6f5dec087ccf9548": "art-giada", "951030659c8c615252cb86d9157855a6": "art-gisa",
       "5f6f2e1dff39605f82536e71b3f8a3e4": "art-sai", "2d6f874a494e6f1abf5da2904d33be25": "art-zimone",
       "71362eca7e51b59b6b441478d20bf71e": "face-captain-america", "a5f95d25dd1834167945a6ac89a0d05e": "face-jace",
       "b311963bd7a121936fdc47dbb9234cde": "face-sai", "b7aa6d7bdbd685da94ab1f068008f879": "face-zimone"}
PARTS = ["HomeDesk", "HomePhone", "Rail", "PhoneChrome", "Friends"]
os.makedirs(f"{OUT}/art", exist_ok=True)
for p in PARTS:
    src = open(f"{FH}/{p}.dc.html").read()
    src = re.sub(r"/_blob/([0-9a-f]{32})", lambda m: "art/" + OLD[m.group(1)] + ".jpg", src)
    open(f"{OUT}/{p}.dc.html", "w").write(src)
for n in set(OLD.values()):
    shutil.copy(f"{FH}/art/{n}.jpg", f"{OUT}/art/{n}.jpg")
shutil.copy("/home/claude/the-99/design/design_handoff_the99_discovery_onboarding/art/card-dina.jpg", f"{OUT}/art/card-dina.jpg")
shutil.copy("/home/claude/the-99/design/design_handoff_the99_discovery_onboarding/r3/art/screen-commanders.jpg", f"{OUT}/art/screen-commanders.jpg")
print("parts + art copied")
