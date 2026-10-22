"""Renders the About picture's stand-in: the deck page at 390 with the segment, flat (no device frame), 390x844, and
measures the segment's box as a fraction of the frame, as scripts/lib/about-locators.mjs would."""
import asyncio, json, os, shutil
import kit, cc
from playwright.async_api import async_playwright
kit.MODE["blob"] = False if "MODE" in dir(kit) and isinstance(kit.MODE, dict) else kit.MODE
os.makedirs("out", exist_ok=True)
shutil.copytree("art", "out/art", dirs_exist_ok=True)
html = kit.doc("cap", cc.page_phone(cc.quiet(5)), 390).replace("</style>", ".board{padding:0!important;margin:0!important}.ph{border-radius:0!important;border:0!important}</style>", 1)
html = html.replace('<script src="./support.js"></script>', "")
open("out/_cap.html", "w").write(html)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
        pg = await b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        await pg.goto(f"file://{os.getcwd()}/out/_cap.html"); await pg.wait_for_load_state("networkidle"); await pg.evaluate("document.fonts.ready")
        r = await pg.evaluate("""()=>{const ph=document.querySelector('.ph').getBoundingClientRect();const s=document.querySelector('.cbs').getBoundingClientRect();
          return {ph:[ph.x,ph.y,ph.width,ph.height], seg:[(s.x-ph.x-6)/390,(s.y-ph.y-2)/844,(s.width+12)/390,(s.height+6)/844]}}""")
        x, y = r["ph"][0], r["ph"][1]
        await pg.screenshot(path="art/about-deck-your-deck.png", clip={"x": x, "y": y, "width": 390, "height": 844})
        print(r); json.dump(r["seg"], open("about-box.json", "w"))
        await b.close()
asyncio.run(main())
