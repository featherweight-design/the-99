import json
T = json.load(open("themes.json"))
ORDER = ["amonkhet","kamigawa","ixalan","phyrexia","eldraine","kaldheim"]
NAME = {"amonkhet":"Low Sun","kamigawa":"Neon Rain","ixalan":"Canopy","phyrexia":"Oil Haze","eldraine":"Witching Hour","kaldheim":"First Frost"}
def rgb(h): h=h.lstrip('#'); return [int(h[i:i+2],16) for i in (0,2,4)]
def mix(a,b,p):  # p of a over b, srgb
    A,B=rgb(a),rgb(b); return '#'+''.join(f"{round(A[i]*p+B[i]*(1-p)):02X}" for i in range(3))
def lum(h):
    def ch(c):
        c/=255; return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
    r,g,b=[ch(c) for c in rgb(h)]; return 0.2126*r+0.7152*g+0.0722*b
def cr(a,b):
    la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+0.05)/(lb+0.05)
out = {}
for k in ORDER:
    t=T[k]; row={}
    for gname,g in [("sheet","surface"),("popover","surface-raised")]:
        G=t[g]
        held = mix(t["accent"], G, .16); warn = mix(t["warning"], G, .14)
        row[gname] = {
          "fg_on_held": cr(t["fg"], held), "accent_on_held": cr(t["accent"], held),
          "fgbody_on_held": cr(t["fg-body"], held),
          "warning_on_warn": cr(t["warning"], warn), "fg_on_warn": cr(t["fg"], warn),
          "warning_line_on_ground": cr(t["warning"], G),
          "fg_on_out": cr(t["fg"], G), "accent_on_out": cr(t["accent"], G),
        }
        for p in (0.15,0.25,0.35):
            row[gname][f"tint{int(p*100)}_on_held"] = cr(mix(t["accent"], t["fg"], p), held)
    row["warning_vs_accent"] = cr(t["warning"], t["accent"])
    out[k]=row
json.dump(out, open("contrast.json","w"), indent=1)
keys = list(out["amonkhet"]["sheet"].keys())
for key in keys:
    vals = [min(out[k]["sheet"][key], out[k]["popover"][key]) for k in ORDER]
    print(f"{key:24s}", " ".join(f"{v:5.2f}" for v in vals), " min", f"{min(vals):.2f}")
print(f"{'warning_vs_accent':24s}", " ".join(f"{out[k]['warning_vs_accent']:5.2f}" for k in ORDER))
