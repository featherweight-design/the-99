import asyncio, json, sys, os
from playwright.async_api import async_playwright
import boards as B
names = sys.argv[1:] or [n for n, _, _ in B.BOARDS]
os.makedirs("shots", exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1243/chrome-linux64/chrome")
        pg = await b.new_page(viewport={"width": 1900, "height": 1000})
        sizes = {}
        for n in names:
            await pg.goto(f"file://{os.getcwd()}/out/{n}.dc.html")
            await pg.wait_for_load_state("networkidle")
            await pg.evaluate("document.fonts.ready")
            r = await pg.evaluate("""() => { const b=document.querySelector('.board'); const r=b.getBoundingClientRect();
              const broken=[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src);
              const bgs=[...b.querySelectorAll('.th')].map(e=>getComputedStyle(e).backgroundImage).filter(s=>!s.includes('url'));
              const wide=[...b.querySelectorAll('.frames,.sec,.bh,.tbl')].filter(e=>e.scrollWidth>b.clientWidth+1).map(e=>e.className);
              const over=[...b.querySelectorAll('.ph,.dk')].filter(e=>e.scrollWidth>e.clientWidth+1).length;
              return {w:Math.ceil(r.width), h:Math.ceil(b.scrollHeight), broken, bgs:bgs.length, wide, over}; }""")
            sizes[n] = [r["w"], r["h"]]
            await pg.set_viewport_size({"width": r["w"], "height": min(r["h"], 16000)})
            await pg.screenshot(path=f"shots/{n}.png", full_page=True)
            print(n, r)
        json.dump(sizes, open("sizes.json", "w"))
        await b.close()
asyncio.run(main())
