"""Write the Rule 0 boards, sizing every phone and desktop frame to its content (no frame is cut off).

usage: python3 build.py [module ...]"""
import importlib, json, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.sync_api import sync_playwright

OUT = "/home/claude/assets/account-1/design_handoff_the99_rule_zero"
SRC = "/home/claude/the-99/design/design_handoff_the99_social_r3"
CDN = "/tmp/claude-0/-home-claude/6f79b1ef-3ed8-5e9e-b89c-ca8ae0e25f1d/scratchpad/cdn"

BOARDS = {  # module: [(fn, filename)]
    "b_main": [("board", "The 99 - Rule Zero (R1).dc.html")],
    "b_entry": [("board_phone", "R1 - Entry-Phone.dc.html"), ("board_desk", "R1 - Entry-Desktop.dc.html")],
    "b_setup": [("board_phone", "R1 - Setup-Phone.dc.html"), ("board_desk", "R1 - Setup-Desktop.dc.html")],
    "b_read": [("board_phone", "R1 - Read-Phone.dc.html"), ("board_desk", "R1 - Read-Desktop.dc.html")],
    "b_swap": [("board_phone", "R1 - Swap-Phone.dc.html"), ("board_desk", "R1 - Swap-Desktop.dc.html")],
    "b_log": [("board_phone", "R1 - Log-Phone.dc.html"), ("board_desk", "R1 - Log-Desktop.dc.html")],
    "b_opts": [("board_desk", "R2 - Desktop-Options.dc.html")],
}

MEASURE = """() => {
  const need = (el) => {
    let m = 0;
    for (const c of el.children) {
      if (getComputedStyle(c).position === 'absolute') continue;
      m = Math.max(m, c.offsetTop + c.offsetHeight);
    }
    return Math.ceil(m);
  };
  const out = {};
  for (const fr of document.querySelectorAll('.fr')) {
    const lab = fr.querySelector('.k')?.textContent || '';
    const pb = fr.querySelector('.ph > .pb');
    const dm = fr.querySelector('.dk > .dmain');
    const el = pb || dm;
    if (!el || el.hasAttribute('data-fixed')) continue;
    const n = Math.max(need(el), el.scrollHeight > el.clientHeight + 1 ? el.scrollHeight : 0);
    const min = pb ? 844 - 73 - 74 - 2 : 818;
    out[lab] = {kind: pb ? 'ph' : 'dk', need: Math.max(n, min), have: el.clientHeight};
  }
  const b = document.querySelector('.board');
  out.__board = b ? [Math.ceil(b.getBoundingClientRect().width), Math.ceil(b.scrollHeight)] : null;
  return out;
}"""

def route(r):
    name = r.request.url.rsplit("/", 1)[-1]
    m = {"react.production.min.js": f"{CDN}/x_react-18.3.1.tgz/package/umd/react.production.min.js",
         "react-dom.production.min.js": f"{CDN}/x_react-dom-18.3.1.tgz/package/umd/react-dom.production.min.js",
         "babel.min.js": f"{CDN}/x_babel-standalone-7.29.0.tgz/package/babel.min.js"}
    if name in m:
        r.fulfill(path=m[name], content_type="application/javascript")
    elif "fonts.googleapis.com" in r.request.url:
        r.fulfill(path=f"{CDN}/fonts.css", content_type="text/css")
    elif r.request.url.startswith("file://"):
        r.continue_()
    else:
        r.abort()

def measure(br, path):
    pg = br.new_page(viewport={"width": 1400, "height": 900})
    pg.route("**/*", route)
    pg.goto("file://" + path)
    pg.wait_for_timeout(1800)
    pg.evaluate("document.fonts.ready")
    pg.wait_for_timeout(300)
    res = pg.evaluate(MEASURE)
    pg.close()
    return res

def main():
    os.makedirs(OUT + "/art", exist_ok=True)
    shutil.copy(SRC + "/support.js", OUT + "/support.js")
    if not os.path.exists(OUT + "/brand"):
        shutil.copytree(SRC + "/brand", OUT + "/brand")
    only = sys.argv[1:]
    sizes = {}
    with sync_playwright() as p:
        br = p.chromium.launch()
        for mod, fns in BOARDS.items():
            if only and mod not in only:
                continue
            if not os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), mod + ".py")):
                continue
            m = importlib.import_module(mod)
            for fn, fname in fns:
                path = f"{OUT}/{fname}"
                for it in range(3):
                    html = getattr(m, fn)()
                    open(path, "w").write(html)
                    res = measure(br, path)
                    board = res.pop("__board")
                    changed = False
                    for lab, r in res.items():
                        key = lab
                        tgt = getattr(m, "PH" if r["kind"] == "ph" else "DH", None)
                        if tgt is None:
                            continue
                        if abs(r["need"] - r["have"]) > 1:
                            base = 73 + 74 + 2 if r["kind"] == "ph" else 2
                            tgt[key + ("" if fn == "board_phone" or r["kind"] == "ph" else "")] = r["need"] + base
                            changed = True
                    if not changed:
                        break
                # size the board itself: rewrite $preview to the real height
                html = open(path).read()
                import re
                html = re.sub(r'"\$preview":\{"width":(\d+),"height":\d+\}', lambda mm: f'"$preview":{{"width":{mm.group(1)},"height":{board[1]}}}', html)
                open(path, "w").write(html)
                sizes[fname] = board
                print("wrote", fname, board)
        br.close()
    sp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sizes.json")
    old = json.load(open(sp)) if os.path.exists(sp) else {}
    old.update(sizes)
    json.dump(old, open(sp, "w"), indent=1)

main()
