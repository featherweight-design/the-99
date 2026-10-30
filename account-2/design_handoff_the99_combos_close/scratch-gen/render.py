import asyncio, json, sys, os
from playwright.async_api import async_playwright
names = sys.argv[1:]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
        pg = await b.new_page(viewport={"width": 1600, "height": 1000})
        os.makedirs("shots", exist_ok=True)
        sizes = {}
        for n in names:
            await pg.goto(f"file://{os.getcwd()}/out/{n}.dc.html")
            await pg.wait_for_load_state("networkidle")
            await pg.evaluate("document.fonts.ready")
            r = await pg.evaluate("""() => { const b=document.querySelector('.board'); const r=b.getBoundingClientRect();
              const broken=[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src);
              const wide=[...b.querySelectorAll('.frames,.sec,.bh,.cmp2')].filter(e=>e.scrollWidth>b.clientWidth-100).map(e=>e.className+':'+e.scrollWidth);
              const clip=[...b.querySelectorAll('.bs,.md,.cdf,.cmx')].filter(e=>{const p=e.closest('.ph,.dk'); if(!p) return false; return e.getBoundingClientRect().bottom>p.getBoundingClientRect().bottom+1 || e.scrollHeight>e.clientHeight+1}).map(e=>e.className+':'+(e.scrollHeight-e.clientHeight));
              return {w:Math.ceil(r.width), h:Math.ceil(b.scrollHeight), broken, wide, clip}; }""")
            sizes[n] = [r["w"], r["h"]]
            await pg.set_viewport_size({"width": r["w"], "height": min(r["h"], 16000)})
            await pg.screenshot(path=f"shots/{n}.png", full_page=True)
            print(n, r)
        json.dump(sizes, open("sizes.json", "w"))
        await b.close()
asyncio.run(main())
