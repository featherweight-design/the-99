import html
from PIL import Image
OUT="/home/user/sx/cv/project"; SH="/home/user/sx/out/shots"
HEAD=open("/tmp/claude-0/-home-user/82c281a8-3a8d-57cf-aa73-51c677ec8448/scratchpad/artifact-files/955e1777-0023-4f89-86a9-f21d0deecae2/project/Unowned.dc.html").read().split('<div style="width:1764px')[0]
HEAD=HEAD.replace("<title>2 · A card you don't own</title>","<title>{title}</title>")
TAIL="""</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""
ROOT="box-sizing:border-box;padding:48px 56px 64px;background:#0A0B0F;font-family:'IBM Plex Sans',sans-serif;color:#E6E8F0;display:flex;flex-direction:column;gap:28px"
H2="margin:0;font:700 30px 'Chakra Petch',sans-serif;color:#E6E8F0"
LEDE="margin:0;font-size:15px;line-height:1.6;color:#B1B6C7;max-width:1100px"
CAPH="margin:0;font:600 15px 'IBM Plex Sans',sans-serif;color:#E6E8F0"
CAP="margin:0;font-size:13px;line-height:1.55;color:#959AAD"
TAG="font:500 11px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#FF6FAE"
def frame(fid,label,cap,dw):
    im=Image.open(f"{SH}/{fid}.png"); w,h=im.size; dh=round(dw*h/w)
    im.save(f"{OUT}/art/r2-{fid}.webp",quality=86,method=6)
    r="28px" if "phone" in fid else "12px"
    return dh,f"""<figure style="margin:0;display:flex;flex-direction:column;gap:12px;width:{dw}px;flex:none">
<img src="art/r2-{fid}.webp" alt="{html.escape(label)}" style="width:{dw}px;height:{dh}px;display:block;border-radius:{r};border:1px solid #262A35">
<figcaption style="display:flex;flex-direction:column;gap:6px">
<p style="{CAPH}">{html.escape(label)}</p>
<p style="{CAP}">{html.escape(cap)}</p>
</figcaption>
</figure>
"""
def board(name,title,lede,rows,W):
    parts=[f'<div style="display:flex;flex-direction:column;gap:10px"><h2 style="{H2}">{html.escape(title)}</h2><p style="{LEDE}">{html.escape(lede)}</p></div>']
    H=48+64+40+26*(1+len(lede)//130)+10
    for tag,frames in rows:
        items=[];rh=0
        for fid,label,cap,dw in frames:
            dh,f=frame(fid,label,cap,dw);items.append(f);rh=max(rh,dh+12+24+22*(1+len(cap)*7//dw))
        parts.append(f'<div style="display:flex;flex-direction:column;gap:14px"><span style="{TAG}">{tag}</span><div style="display:flex;gap:40px;align-items:flex-start">{"".join(items)}</div></div>')
        H+=28+14+16+rh
    H+=40
    open(f"{OUT}/{name}.dc.html","w").write(HEAD.replace("{title}",html.escape(title))+f'<div style="width:{W}px;min-height:{H}px;{ROOT}">\n'+"\n".join(parts)+"\n</div>\n"+TAIL.format(w=W,h=H))
    print(name,W,H)
P=292
board("R2-Phone","R2 · Phone: printings under the card",
 "The sheet's teaser gains a strip of every printing at card shape, under the price line. Tap one and the art above, the price and the set line change in place. The sheet doesn't move and nothing needs scrolling. Nothing is stored.",
 [("Teaser",[("A1-phone","P1 · A card you don't own","22 printings. The catalog's main printing is ringed. The strip scrolls sideways; the art above stays put.",P),
   ("A2-phone","P2 · Tapped SLD 2125","The art, price ($24.50) and SLD · 2125 follow. One tap, nothing else moves.",P),
   ("A3-phone","P3 · A card you own","Yours first: ◆ your pick, then the rest you own (×1), a hairline, then every other printing.",P),
   ("A4-phone","P4 · Owned, viewing one you don't have","Viewing never changes your pick. Close or page and the card goes back to your pick.",P)]),
  ("All details",[("A5-phone","P5 · Full sheet, unowned","The strip stays in the teaser, with the art. Here the Set field is plain and names what's showing. Add to collection opens at that printing.",P),
   ("A6-phone","P6 · Full sheet, owned","The Set field goes back to choosing your pick from the printings you own. Browsing other printings happens in the strip only.",P)])],
 4*P+3*40+112)
D=760
board("R2-Desktop","R2 · Desktop: printings under the title",
 "The same strip, at the top of the details column. ▸ scrolls it, because a mouse wheel doesn't scroll sideways. Arrow keys move along it. The art on the left changes in place.",
 [("Card details from search",[("A1-desk","D1 · A card you don't own","22 printings, the main one ringed. The Set field in the meta row stays plain.",D),
   ("A2-desk","D2 · Clicked SLD 2125","The art, price tag and Set field follow.",D)]),
  ("",[("A4-desk","D3 · Owned, viewing one you don't have","◆ STA (your pick) and BLC ×1 first, then a hairline, then the rest. Edit copies stays card-level.",D)])],
 2*D+40+112)
