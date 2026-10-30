"""Render .dc.html boards headless. usage: python3 rh.py OUTDIR file.dc.html ... ; env MEASURE_JS optional."""
import json, os, sys, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright
S = os.path.dirname(os.path.abspath(__file__)); NM = f"{S}/fonts/node_modules"
MAP = {"react.production.min.js": f"{NM}/react/umd/react.production.min.js",
       "react-dom.production.min.js": f"{NM}/react-dom/umd/react-dom.production.min.js",
       "babel.min.js": f"{NM}/@babel/standalone/babel.min.js"}
CHECK = """() => {
  const out = {broken: [], cut: [], size: null};
  const root = document.querySelector('x-dc > div, x-dc > *:not(helmet)') ;
  const b = document.body.firstElementChild;
  const el = document.querySelector('[data-board]') || b;
  const r = el.getBoundingClientRect(); out.size = [Math.round(r.width), Math.round(r.height)];
  out.doc = [document.documentElement.scrollWidth, document.documentElement.scrollHeight];
  for (const im of document.images) if (!im.complete || im.naturalWidth === 0) out.broken.push(im.getAttribute('src'));
  for (const e of document.querySelectorAll('[data-check]')) {
    if (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)
      out.cut.push(e.getAttribute('data-check') + ` ${e.scrollWidth}x${e.scrollHeight} in ${e.clientWidth}x${e.clientHeight}`);
  }
  for (const e of document.querySelectorAll('[data-nocut]')) if (e.scrollWidth > e.clientWidth + 1) out.cut.push('text:' + e.getAttribute('data-nocut'));
  return out;
}"""
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
def serve(root):
    h = functools.partial(Q, directory=root)
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), h); srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start(); return srv.server_address[1]
def main():
    outdir = sys.argv[1]; os.makedirs(outdir, exist_ok=True)
    root = os.environ.get("ROOT") or os.path.dirname(os.path.abspath(sys.argv[2])); port = serve(root)
    with sync_playwright() as p:
        br = p.chromium.launch()
        for f in sys.argv[2:]:
            pg = br.new_page(viewport={"width": int(os.environ.get("VW", 1400)), "height": 900}, device_scale_factor=float(os.environ.get("DPR", 1)))
            fails = []
            def route(r):
                u = r.request.url; name = u.rsplit("/", 1)[-1]
                if name in MAP: r.fulfill(path=MAP[name], content_type="application/javascript")
                elif u.startswith("http://fonts.local/"): r.fulfill(path=f"{NM}/@fontsource/" + u[len("http://fonts.local/"):], content_type="font/woff2")
                elif "fonts.googleapis.com" in u: r.fulfill(path=f"{S}/fonts.css", content_type="text/css")
                elif u.startswith("file://") or u.startswith("data:") or u.startswith("http://127.0.0.1"): r.continue_()
                else: fails.append("blocked " + u); r.abort()
            pg.route("**/*", route)
            pg.on("pageerror", lambda e: fails.append(str(e)))
            pg.on("console", lambda m: fails.append("console " + m.text) if m.type == "error" else None)
            pg.goto(f"http://127.0.0.1:{port}/" + os.path.relpath(os.path.abspath(f), root)); pg.wait_for_timeout(int(os.environ.get("WAIT", 3000)))
            pg.evaluate("document.fonts.ready")
            res = pg.evaluate(CHECK)
            if os.environ.get("MEASURE_JS"): res["measure"] = pg.evaluate(os.environ["MEASURE_JS"])
            base = os.path.basename(f).replace(".dc.html", "")
            if not os.environ.get("NOSHOT"): pg.screenshot(path=f"{outdir}/{base}.png", full_page=True)
            print(json.dumps({"file": base, **res, "errors": fails[:4]}))
            pg.close()
        br.close()
main()
