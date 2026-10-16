import importlib, os, shutil, sys
sys.path.insert(0, os.path.dirname(__file__))

OUT = "/home/claude/assets/account-1/design_handoff_the99_card_search"
SRC = "/home/claude/the-99/design/design_handoff_the99_social_r2"
ART = ["lathliss", "ghalta", "killian", "giada", "invisible-woman", "zimone", "heroes", "ashling", "dina", "doom",
       "quintorius", "rootha", "zada", "captain-america", "gisa", "miku", "sai"]

BOARDS = {
    "b_main": "The 99 - Card Search (R1).dc.html",
    "b_header": "R1 - Header-Phone.dc.html",
    "b_sheet": "R1 - Sheet-Phone.dc.html",
    "b_rail": "R1 - Rail-Desktop.dc.html",
    "b_deck": "R1 - Deck-Page.dc.html",
    "b_rows": "R1 - Rows.dc.html",
    "b_about": "The 99 - About · Card Search Entry.dc.html",
    "b_opts": "R2 - Options.dc.html",
}

os.makedirs(OUT + "/art", exist_ok=True)
shutil.copy(SRC + "/support.js", OUT + "/support.js")
if not os.path.exists(OUT + "/brand"):
    shutil.copytree(SRC + "/brand", OUT + "/brand")
for a in ART:
    shutil.copy(f"{SRC}/art/{a}.jpg", f"{OUT}/art/{a}.jpg")

only = sys.argv[1:]
for mod, fname in BOARDS.items():
    if only and mod not in only:
        continue
    if not os.path.exists(os.path.join(os.path.dirname(__file__), mod + ".py")):
        continue
    m = importlib.import_module(mod)
    open(f"{OUT}/{fname}", "w").write(m.board())
    print("wrote", fname)
