import json, os, sys
from playwright.sync_api import sync_playwright
S = os.path.dirname(os.path.abspath(__file__))
F = f"{S}/fonts/node_modules/@fontsource"
T = json.load(open(f"{S}/themes.json"))
FACES = [("amonkhet","Cinzel","cinzel",700),("kamigawa","Chakra Petch","chakra-petch",700),("ixalan","Trirong","trirong",700),
         ("phyrexia","Syncopate","syncopate",700),("eldraine","Cormorant Garamond","cormorant-garamond",700),("kaldheim","Metamorphous","metamorphous",400)]
ff = "".join(f"@font-face{{font-family:'{n}';font-weight:{w};src:url('file://{F}/{d}/files/{d}-latin-{w}-normal.woff2')}}" for _,n,d,w in FACES)
def page(trim, pad_kaldheim):
    cells = ""
    for key,n,d,w in FACES:
        acc = T[key]["accent"]; surf = T[key]["surface"]
        pb = "padding-bottom:3px;" if (key=="kaldheim" and pad_kaldheim) else ""
        tb = "text-box:trim-both cap alphabetic;" if trim else ""
        # the diamond's inner box, upright (the numeral is counter-rotated, so its box is this square)
        cells += (f'<div class="c" id="{key}" style="background:{surf}"><b style="font-family:\'{n}\';font-weight:700;font-synthesis-weight:none;color:#fff;'
                  f'font-size:21px;line-height:1;font-variant-numeric:lining-nums;{tb}{pb}">40</b></div>')
    return f"<style>{ff}body{{margin:0;background:#000}}.c{{width:46px;height:46px;display:flex;align-items:center;justify-content:center;margin:10px;float:left;box-sizing:border-box}}</style>{cells}"
res = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for label, trim, pad in [("shipped", True, True), ("trim-only", True, False), ("no-trim", False, False)]:
        pg = b.new_page(device_scale_factor=4); open(f"{S}/num.html","w").write(page(trim, pad)); pg.goto(f"file://{S}/num.html"); pg.wait_for_timeout(600); print(label, pg.evaluate("[...document.fonts].map(f=>f.family+':'+f.status).join(', ')"))
        for key,*_ in FACES:
            el = pg.locator(f"#{key}"); shot = el.screenshot()
            from PIL import Image; import io
            im = Image.open(io.BytesIO(shot)).convert("RGB"); W,H = im.size; px = im.load()
            ys=[];xs=[]
            for y in range(H):
                for x in range(W):
                    r,g,bb = px[x,y]
                    if r>200 and g>200 and bb>200: ys.append(y); xs.append(x)
            cy = (min(ys)+max(ys))/2/4; cx=(min(xs)+max(xs))/2/4
            res.setdefault(key,{})[label] = dict(ink_top=round(min(ys)/4,2), ink_bottom=round(max(ys)/4,2), dy=round(cy-23,2), dx=round(cx-23,2), h=round((max(ys)-min(ys))/4,2))
        pg.close()
    b.close()
for k,v in res.items(): print(k, v)
json.dump(res, open(f"{S}/numeral.json","w"), indent=1)
