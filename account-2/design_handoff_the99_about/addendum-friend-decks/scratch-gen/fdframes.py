"""The entry's picture, ahead of a recapture: main's own /friends capture (public/about/shots/<theme>/friends.webp, 390x844
at 2x) with its privacy line set as FRIEND_DECKS_ENABLED draws it for a reader on the default rules
(socialCopy.page.decksSeenBy.finished + "Change this in Settings."). The line grows from two lines to three, so everything
under it moves down one line (17px); the bar stays put. Writes art/friends-fd-<theme>.png and frames/boxes.json (the line's
box as fractions of the frame, as the locator script measures [data-decks-seen]).
Usage: python3 fdframes.py /path/to/main/checkout"""
import re, sys, os, json, asyncio, base64
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = sys.argv[1]
css = open(f"{MAIN}/src/app/globals.css").read()
TOK = {}
for m in re.finditer(r'\[data-theme="(\w+)"\]\s*\{(.*?)\n\}', css, re.S):
    TOK.setdefault(m.group(1), {}).update(dict(re.findall(r'--([\w-]+):\s*(#[0-9A-Fa-f]{3,8})\b', m.group(2))))
LINE = "Friends can see your decks and their lists, except drafts and decks you’re building. Change this in <u>Settings</u>."
# Measured on every theme's capture (text rows 359-381 and 393-413 of 1688): the line box is 352-420 at 2x, x 172-740. The face's pencil badge, left of the line, is kept.
TOP, OLD_H, LH, BAR = 176, 34, 17, 74


def page(theme):
    src = base64.b64encode(open(f"{HERE}/frames/_{theme}.png", "rb").read()).decode()
    img = f"data:image/png;base64,{src}"
    t = TOK[theme]
    cut = TOP + OLD_H  # where the old line ends, in 1x px
    return (f'<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet">'
            f'<style>body{{margin:0;background:{t["bg"]}}}.f{{position:relative;width:390px;height:844px;overflow:hidden;background:{t["bg"]}}}'
            f'.s{{position:absolute;left:0;width:390px;overflow:hidden}}.s img{{position:absolute;left:0;width:390px;height:844px}}'
            f'.pv{{position:absolute;left:86px;top:{TOP}px;width:285px;margin:0;font:400 11px/1.5 "IBM Plex Mono",monospace;color:{t["fg-faint"]};text-wrap:wrap}}'
            f'.pv u{{text-decoration:underline}}</style></head><body><div class="f">'
            f'<div class="s" style="top:0;height:{TOP}px"><img src="{img}" style="top:0"></div>'
            f'<div class="s" style="top:{TOP}px;height:{OLD_H}px;width:80px"><img src="{img}" style="top:{-TOP}px"></div>'
            f'<p class="pv" data-decks-seen>{LINE}</p>'
            f'<div class="s" style="top:{cut+LH}px;height:{844-BAR-cut-LH}px"><img src="{img}" style="top:{-cut}px"></div>'
            f'<div class="s" style="top:{844-BAR}px;height:{BAR}px"><img src="{img}" style="top:{-(844-BAR)}px"></div>'
            f'</div></body></html>')


async def main():
    from PIL import Image
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
        pg = await b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        boxes = {}
        for t in ["amonkhet", "kamigawa", "ixalan", "phyrexia", "eldraine", "kaldheim"]:
            Image.open(f"{MAIN}/public/about/shots/{t}/friends.webp").convert("RGB").save(f"{HERE}/frames/_{t}.png")
            fn = f"{HERE}/frames/_{t}.html"
            open(fn, "w").write(page(t))
            await pg.goto("file://" + fn)
            await pg.wait_for_load_state("networkidle")
            await pg.evaluate("document.fonts.ready")
            boxes[t] = await pg.evaluate("""() => { const r=document.querySelector('[data-decks-seen]').getBoundingClientRect();
              return [r.left/390,r.top/844,r.width/390,r.height/844].map(v=>+v.toFixed(4)); }""")
            await pg.locator(".f").screenshot(path=f"{HERE}/art/friends-fd-{t}.png")
            print(t, boxes[t])
        json.dump(boxes, open(f"{HERE}/frames/boxes.json", "w"))
        await b.close()
asyncio.run(main())
