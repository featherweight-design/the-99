"""render.py OUTDIR name... : local render of .dc.html boards with support.js stripped; reports size, broken images, overflow."""
import asyncio, json, sys, os, re
from playwright.async_api import async_playwright
out, names = sys.argv[1], sys.argv[2:]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
        pg = await b.new_page(viewport={"width": 1600, "height": 1000})
        res = {}
        for n in names:
            src = open(f"{out}/{n}.dc.html").read()
            src = src.replace('<script src="./support.js"></script>', '')
            src = re.sub(r'<script type="text/x-dc".*?</script>', '', src, flags=re.S)
            src = src.replace('<x-dc>', '<div>').replace('</x-dc>', '</div>').replace('<helmet>', '').replace('</helmet>', '')
            open(f"{out}/_{n}.html", "w").write(src)
            await pg.goto(f"file://{out}/_{n}.html")
            await pg.wait_for_load_state("networkidle")
            await pg.evaluate("document.fonts.ready")
            r = await pg.evaluate("""() => { const b=document.querySelector('.board'); const r=b.getBoundingClientRect();
              const broken=[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.getAttribute('src'));
              const wide=[...b.querySelectorAll('.frames,.bh,.notes,.note,.fr,.six')].filter(e=>e.getBoundingClientRect().right>r.right+1).map(e=>e.className+':'+Math.round(e.getBoundingClientRect().right-r.right));
              const clip=[...b.querySelectorAll('[data-check]')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.dataset.check);
              return {w:Math.ceil(r.width), h:Math.ceil(b.scrollHeight), broken, wide, clip}; }""")
            res[n] = r
            await pg.set_viewport_size({"width": r["w"], "height": min(max(r["h"],200), 16000)})
            os.makedirs(f"{out}/shots", exist_ok=True)
            await pg.screenshot(path=f"{out}/shots/{n}.png", full_page=True)
            print(n, r)
        json.dump(res, open(f"{out}/shots/sizes.json", "a"))
        await b.close()
asyncio.run(main())
