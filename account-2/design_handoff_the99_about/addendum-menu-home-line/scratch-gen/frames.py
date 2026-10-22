"""The About entry's picture, ahead of the recapture: Home B (normal day, no welcome strip) as a 390x844 frame,
rendered in each of the six themes from src/app/globals.css, at 2x like public/about/shots. Prints the lead story's
and What's new's boxes as fractions of the frame."""
import re, sys, os, json, asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit, parts as P
from playwright.async_api import async_playwright

CSSF = "/home/claude/the-99/src/app/globals.css"
FONT = {"amonkhet": "Cinzel", "kamigawa": "Chakra Petch", "ixalan": "Trirong", "phyrexia": "Syncopate",
        "eldraine": "Cormorant Garamond", "kaldheim": "Metamorphous"}
css = open(CSSF).read()
THEMES = {}
for m in re.finditer(r'\[data-theme="(\w+)"\]\s*\{(.*?)\n\}', css, re.S):
    THEMES.setdefault(m.group(1), {}).update(dict(re.findall(r'--([\w-]+):\s*(#[0-9A-Fa-f]{3,8})\b', m.group(2))))

P.wstrip = lambda desk=False: ""          # first 30 days only; the capture account is past it
body = kit.phone(P.home("normal", False, "B"), "Home", h=844, badges={"Home": 2})
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frames")
os.makedirs(OUT, exist_ok=True)


def page(theme):
    toks = ";".join(f"--{k}:{v}" for k, v in THEMES[theme].items())
    f = FONT[theme]
    c = kit.CSS.replace("'Cinzel',serif", f"'{f}',serif").replace("Cinzel,serif", f"'{f}',serif").replace("'Cinzel'", f"'{f}'")
    fam = f.replace(" ", "+")
    return (f'<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family={fam}:wght@400;500;600;700'
            f'&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">'
            f'<style>{c}{P.CSS if hasattr(P, "CSS") else ""}.board{{{toks};padding:0;background:var(--bg)}} .new{{outline:0!important}} .later::after{{display:none}}'
            f' .ph{{border:0;border-radius:0}}</style></head><body style="margin:0;background:{THEMES[theme]["bg"]}">'
            f'<div class="board" style="width:390px">{body}</div></body></html>')


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
        pg = await b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        boxes = {}
        for t in FONT:
            fn = f"{OUT}/_{t}.html"
            open(fn, "w").write(page(t).replace('src="art/', f'src="file://{os.path.dirname(os.path.abspath(__file__))}/art/'))
            await pg.goto("file://" + fn)
            await pg.wait_for_load_state("networkidle")
            await pg.evaluate("document.fonts.ready")
            boxes[t] = await pg.evaluate("""() => { const ph=document.querySelector('.ph').getBoundingClientRect();
              const f=s=>{const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect();
                return [(r.left-ph.left)/390,(r.top-ph.top)/844,r.width/390,r.height/844].map(v=>+v.toFixed(4));};
              return {lead:f('.ld'), tbar:f('.tbar'), feed:(()=>{const e=[...document.querySelectorAll('section.blk')].find(x=>x.textContent.startsWith('What')); const r=e.getBoundingClientRect(); const tb=document.querySelector('.tbar').getBoundingClientRect(); return [(r.left-ph.left)/390,(r.top-ph.top)/844,r.width/390,(Math.min(r.bottom,tb.top)-r.top)/844].map(v=>+v.toFixed(4));})()}; }""")
            await pg.locator(".ph").screenshot(path=f"{OUT}/home-{t}.png")
            print(t, boxes[t])
        json.dump(boxes, open(f"{OUT}/boxes.json", "w"))
        await b.close()
asyncio.run(main())
