import importlib, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
OUT = "/home/claude/assets/account-1/design_handoff_the99_buying_credits"
BOARDS = {
    "b_main": "The 99 - Buying Credits (R1).dc.html",
    "b_line": "R1 - Credit-Line.dc.html",
    "b_surf": "R1 - Surfaces.dc.html",
    "b_page": "R1 - Billing-Page.dc.html",
    "b_plan": "R1 - Plan-and-Cancel.dc.html",
    "b_ret": "R1 - Checkout-Return.dc.html",
    "b_off": "R1 - Blocked-and-Off.dc.html",
    "b_menu": "R1 - Menu-and-Delete.dc.html",
    "b_theme": "R1b - Themes.dc.html",
}
os.makedirs(OUT, exist_ok=True)
shutil.copy("/home/claude/the-99/design/design_handoff_the99_tuning_hub/support.js", OUT + "/support.js")
only = sys.argv[1:]
for mod, fname in BOARDS.items():
    if only and mod not in only: continue
    if not os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), mod + ".py")): continue
    m = importlib.import_module(mod)
    open(f"{OUT}/{fname}", "w").write(m.board())
    print("wrote", fname)
