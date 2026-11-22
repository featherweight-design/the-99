import html
from PIL import Image
OUT="/home/user/sx/cv3/project"; SH="/home/user/sx/out/shots"
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
    im.save(f"{OUT}/art/r3-{fid}.webp",quality=86,method=6)
    r="28px" if "phone" in fid else "12px"
    return dh,f"""<figure style="margin:0;display:flex;flex-direction:column;gap:12px;width:{dw}px;flex:none">
<img src="art/r3-{fid}.webp" alt="{html.escape(label)}" style="width:{dw}px;height:{dh}px;display:block;border-radius:{r};border:1px solid #262A35">
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
board("R3-PhoneA","R3 · Phone A: printings button, panel on demand (recommended)",
 "No strip in the teaser, so the shelf is 280 on every card and swiping never jumps. On a card with 2+ printings the set line becomes a button: the set and number, then N printings ▾. It opens the printings panel over the shelf. Search by set name, code or number. Tapping one shows it in the card above, and the panel stays open.",
 [("Teaser, swiping",[("A1-phone","A1 · 22 printings","The set line is the button, drawn as a plate like the price.",P),
   ("A2-phone","A2 · One printing","A plain set line, the same shelf height. Nothing moves between A1 and A2.",P)]),
  ("Panel",[("A3-phone","A3 · Open","The shelf grows to 400 only while it's open. Yours come first (◆ pick, ×N), then the rest. Bare ✕ closes it.",P),
   ("A4-phone","A4 · Searching secret","Matches group by set (Secret Lair Drop, Secret Lair Promo), with 8 of 22 above.",P),
   ("A5-phone","A5 · Tapped SLD 2125","The card above changes and the panel stays for more browsing. ✕ returns to the teaser, showing SLD 2125.",P)])],
 5*P+4*40+112)
board("R3-PhoneB","R3 · Phone B: keep the strip, hold its room",
 "The strip stays, and every card from search keeps its row, so the shelf never changes size. A one-printing card shows its one thumb and The only printing. A search tile at the start opens the same panel as A3 to A5.",
 [("Teaser",[("B1-phone","B1 · 22 printings","Search tile first, then the strip as shipped.",P),
   ("B2-phone","B2 · One printing","The row is held: one thumb and The only printing. Costs about 98px of card on every card.",P)])],
 2*P+40+112+300)
D=760
board("R3-Desktop","R3 · Desktop: search tile on the strip",
 "No shelf on desktop, so the strip stays. A search tile at its start opens the same panel as a popover over the details. The art on the left changes as you click.",
 [("",[("D1-desk","D1 · Strip with search tile","Search sits before the ◆ pick.",D),
   ("D2-desk","D2 · Searching secret, clicked SLD 2125","Six across. ✕ or Escape closes it.",D)])],
 2*D+40+112)
