import asyncio, json, sys, os
from playwright.async_api import async_playwright
names = sys.argv[1:]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1600, "height": 1000})
        sizes = json.load(open("sizes.json")) if os.path.exists("sizes.json") else {}
        for n in names:
            await pg.goto(f"file://{os.getcwd()}/out_si2/{n}.flat.html")
            await pg.wait_for_timeout(400)
            r = await pg.evaluate("""() => { const b=document.querySelector('.board'); const r=b.getBoundingClientRect();
              const broken=[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.getAttribute('src'));
              const wide=[...b.querySelectorAll('.frames,.bh,.notes,.note,.flow')].filter(e=>e.getBoundingClientRect().right>r.right+1).map(e=>e.className+':'+Math.round(e.getBoundingClientRect().right-r.right));
              const clip=[...b.querySelectorAll('.ph,.dk .main')].filter(e=>e.scrollHeight>e.clientHeight+1).map(e=>e.className+':'+(e.scrollHeight-e.clientHeight));
              const hov=[...b.querySelectorAll('.nrw,.prw,.fh2,.colh,.r1,.vrow')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className+':'+(e.scrollWidth-e.clientWidth)+':'+e.textContent.slice(0,30));
              const trunc=[...b.querySelectorAll('.nms')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent.slice(0,40));
              return {w:Math.ceil(r.width), h:Math.ceil(b.scrollHeight), broken, wide, clip, hov:hov.slice(0,12), trunc:trunc.slice(0,12)}; }""")
            sizes[n] = [r["w"], r["h"]]
            await pg.set_viewport_size({"width": r["w"], "height": min(r["h"], 16000)})
            os.makedirs("shots", exist_ok=True)
            await pg.screenshot(path=f"shots/{n}.png", full_page=True)
            print(n, json.dumps(r))
        json.dump(sizes, open("sizes.json", "w"))
        await b.close()
asyncio.run(main())
