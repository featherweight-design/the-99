import sys, glob, os, json
from playwright.sync_api import sync_playwright
S="/tmp/claude-0/-home-claude/9f5093d7-041d-5ac3-9947-de834d595fe1/scratchpad"
out={}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome") if True else p.chromium.launch()
    pg=b.new_page(viewport={"width":1900,"height":1200})
    V={"react@18.3.1/umd/react.production.min.js":"react.js","react-dom@18.3.1/umd/react-dom.production.min.js":"react-dom.js","babel.min.js":"babel.js"}
    def h(route):
        u=route.request.url
        for k,v in V.items():
            if u.endswith(k): return route.fulfill(path=f"{S}/vendor/{v}", content_type="application/javascript")
        return route.abort()
    pg.route("https://unpkg.com/**", h); pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    for f in sorted(glob.glob(f"{S}/local/*.dc.html")):
        n=os.path.basename(f)
        pg.goto("file://"+f); pg.wait_for_timeout(1800)
        r=pg.evaluate("""()=>{const el=document.querySelector('.board'); if(!el) return null; const r=el.getBoundingClientRect();
          const broken=[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src);
          const over=[...document.querySelectorAll('[data-check]')].map(e=>({c:e.dataset.check,sw:e.scrollWidth,cw:e.clientWidth}));
          return {w:r.width,h:r.height,broken,over:over.filter(o=>o.sw>o.cw+1)}}""")
        out[n]=r; print(n, r)
        pg.screenshot(path=f"{S}/shots/{n}.png", full_page=True)
    b.close()
json.dump(out,open(f"{S}/shots/sizes.json","w"))
