"""Render .dc.html boards headlessly: screenshot each, report board size, broken images and overflow.

usage: python3 render.py OUTDIR file1.dc.html [file2 ...]
"""
import json, os, sys
from playwright.sync_api import sync_playwright

CDN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cdn")
MAP = {
    "react.production.min.js": f"{CDN}/x_react-18.3.1.tgz/package/umd/react.production.min.js",
    "react-dom.production.min.js": f"{CDN}/x_react-dom-18.3.1.tgz/package/umd/react-dom.production.min.js",
    "babel.min.js": f"{CDN}/x_babel-standalone-7.29.0.tgz/package/babel.min.js",
}

CHECK = """() => {
  const out = {broken: [], cut: [], size: null};
  const b = document.querySelector('.board');
  if (b) { const r = b.getBoundingClientRect(); out.size = [Math.round(r.width), Math.round(r.height)]; }
  for (const im of document.images) if (!im.complete || im.naturalWidth === 0) out.broken.push(im.getAttribute('src'));
  // a frame whose content overflows its clipped box (phone .ph / desktop .dk) is cut off
  for (const el of document.querySelectorAll('[data-check]')) {
    if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
      out.cut.push(el.getAttribute('data-check') + ` ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight}`);
  }
  // any text that ellipsizes where it must not
  for (const el of document.querySelectorAll('[data-nocut]')) {
    if (el.scrollWidth > el.clientWidth + 1) out.cut.push('text:' + el.getAttribute('data-nocut'));
  }
  return out;
}"""


def main():
    outdir = sys.argv[1]
    os.makedirs(outdir, exist_ok=True)
    with sync_playwright() as p:
        br = p.chromium.launch()
        for f in sys.argv[2:]:
            pg = br.new_page(viewport={"width": 1400, "height": 900}, device_scale_factor=1)
            fails = []
            def route(r):
                name = r.request.url.rsplit("/", 1)[-1]
                if name in MAP:
                    r.fulfill(path=MAP[name], content_type="application/javascript")
                elif "fonts.googleapis.com" in r.request.url:
                    r.fulfill(path=f"{CDN}/fonts.css", content_type="text/css")
                elif r.request.url.startswith("file://"):
                    r.continue_()
                else:
                    r.abort()  # fonts etc: no network here
            pg.route("**/*", route)
            pg.on("pageerror", lambda e: fails.append(str(e)))
            pg.goto("file://" + os.path.abspath(f))
            pg.wait_for_timeout(2500)
            pg.evaluate('document.fonts.ready')
            res = pg.evaluate(CHECK)
            if os.environ.get("MEASURE_JS"):
                res["measure"] = pg.evaluate(os.environ["MEASURE_JS"])
            base = os.path.basename(f).replace(".dc.html", "")
            pg.screenshot(path=f"{outdir}/{base}.png", full_page=True)
            print(json.dumps({"file": base, **res, "errors": fails[:3]}))
            pg.close()
        br.close()


main()
