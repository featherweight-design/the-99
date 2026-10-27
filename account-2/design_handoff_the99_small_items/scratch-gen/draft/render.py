import asyncio, json, sys
from playwright.async_api import async_playwright
import boards as B, alts as A, a2, a3, sh; B.BOARDS = B.BOARDS + A.BOARDS + a2.BOARDS + a3.BOARDS + sh.BOARDS
names = sys.argv[1:] or [n for n, _, _ in B.BOARDS]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1243/chrome-linux64/chrome")
        pg = await b.new_page(viewport={"width": 1600, "height": 1000})
        sizes = {}; metrics = {}
        for n in names:
            await pg.goto(f"file://{__import__('os').getcwd()}/out/{n}.dc.html")
            await pg.wait_for_load_state("networkidle")
            await pg.evaluate("document.fonts.ready")
            r = await pg.evaluate("""() => { const b=document.querySelector('.board'); const r=b.getBoundingClientRect();
              const broken=[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src);
              const over=[...b.querySelectorAll('*')].filter(e=>e.scrollWidth>e.clientWidth+1 && getComputedStyle(e).overflow!=='visible' && !e.classList.contains('tabs')).map(e=>e.className).slice(0,8);
              const wide=[...b.querySelectorAll('.frames,.sec,.bh')].filter(e=>e.scrollWidth>b.clientWidth).map(e=>e.className);
              const tabs=[...b.querySelectorAll('.ph,.dk')].map(f=>{const t=f.querySelector('.tabs,.dtabs'); return t?Math.round(t.getBoundingClientRect().top-f.getBoundingClientRect().top):null;});
              return {tabs, w:Math.ceil(r.width), h:Math.ceil(b.scrollHeight), sw:b.scrollWidth, broken, over, wide}; }""")
            sizes[n] = [r["w"], r["h"]]; metrics[n] = r["tabs"]
            await pg.set_viewport_size({"width": r["w"], "height": min(r["h"], 16000)})
            await pg.screenshot(path=f"shots/{n}.png", full_page=True)
            print(n, r)
        json.dump(sizes, open("sizes.json", "w")); json.dump(metrics, open("metrics.json", "w"))
        await b.close()
asyncio.run(main())
