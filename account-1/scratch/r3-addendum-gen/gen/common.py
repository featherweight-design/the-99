"""R3 addendum (buying credits + discovery onboarding): shared pieces.

Every app piece here is transcribed from the SHIPPED component on main (c81e35e), not from the R1/R2 boards:
src/components/credits/*, shell/credit-chip.tsx, shell/account-menu.tsx, intake/intake-form.tsx,
discovery/first-run-tour.tsx. Colours are the six themes' own tokens read out of src/app/globals.css.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(f"{HERE}/themes.json"))
NUM = json.load(open(f"{HERE}/numeral.json"))
CON = json.load(open(f"{HERE}/contrast.json"))

ORDER = ["amonkhet", "kamigawa", "ixalan", "phyrexia", "eldraine", "kaldheim"]
NAME = {"amonkhet": "Low Sun", "kamigawa": "Neon Rain", "ixalan": "Canopy", "phyrexia": "Oil Haze",
        "eldraine": "Witching Hour", "kaldheim": "First Frost"}
PLANE = {"amonkhet": "Amonkhet", "kamigawa": "Kamigawa", "ixalan": "Ixalan", "phyrexia": "New Phyrexia",
         "eldraine": "Eldraine", "kaldheim": "Kaldheim"}
FACE = {"amonkhet": "Cinzel", "kamigawa": "Chakra Petch", "ixalan": "Trirong", "phyrexia": "Syncopate",
        "eldraine": "Cormorant Garamond", "kaldheim": "Metamorphous"}

FONTS = ("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&amp;"
         "family=IBM+Plex+Mono:wght@400;500;600;700&amp;family=Cinzel:wght@600;700;800&amp;"
         "family=Chakra+Petch:wght@500;600;700&amp;family=Trirong:wght@500;600;700&amp;"
         "family=Syncopate:wght@400;700&amp;family=Cormorant+Garamond:wght@500;600;700&amp;"
         "family=Metamorphous&amp;display=swap")


def rgb(h):
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def mix(a, b, p):
    A, B = rgb(a), rgb(b)
    return "#" + "".join(f"{round(A[i] * p + B[i] * (1 - p)):02X}" for i in range(3))


def lum(h):
    def ch(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = [ch(c) for c in rgb(h)]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def cr(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


def theme_css():
    out = []
    for k in ORDER:
        v = ";".join(f"--{n}:{c}" for n, c in T[k].items())
        out.append(f".th-{k}{{{v};--disp:'{FACE[k]}',serif;color:var(--fg)}}")
    # First Frost pins its display face to the real 400 (globals.css, `font-synthesis-weight: none`).
    out.append(".th-kaldheim .disp-f,.th-kaldheim .dnum{font-synthesis-weight:none}")
    return "\n".join(out)


# ------------------------------------------------------------------ board chrome (not the app)
CHROME = {
    "credits": dict(bg="#0A0B0F", fg="#E6E8F0", cap="#A3A8BA", lbl="#7D8294", rule="#262A35", id="#FF6FAE", box="#111319"),
    "discovery": dict(bg="#0F0D0B", fg="#EDE6D8", cap="#A59C89", lbl="#8B8270", rule="#3A3229", id="#CF8745", box="#17140F"),
}


def chrome_css(kind):
    c = CHROME[kind]
    return f"""
*{{box-sizing:border-box}}
body{{margin:0;background:{c['bg']}}}
svg{{flex:none}}
.board{{padding:48px 56px 72px;background:{c['bg']};font-family:'IBM Plex Sans',sans-serif;color:{c['fg']};display:flex;flex-direction:column;gap:44px}}
.lbl{{font:500 11px 'IBM Plex Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:{c['lbl']}}}
.bh{{display:flex;flex-direction:column;gap:10px;max-width:1500px}}
.bh h1{{margin:0;font:700 30px 'Chakra Petch',sans-serif;letter-spacing:-.005em}}
.cap{{margin:0;font-size:14px;line-height:1.6;color:{c['cap']};text-wrap:pretty;max-width:1240px}}
.cap b{{color:{c['fg']};font-weight:600}}
.cap code,.note code,td code{{font:12.5px 'IBM Plex Mono',monospace;color:{c['fg']}}}
.sec{{display:flex;flex-direction:column;gap:20px;border-top:1px solid {c['rule']};padding-top:24px}}
.sh{{display:flex;align-items:baseline;gap:14px}}
.sh .id{{font:600 14px 'IBM Plex Mono',monospace;color:{c['id']};flex:none}}
.sh .t{{font:600 21px 'IBM Plex Sans',sans-serif;color:{c['fg']}}}
.ans{{display:flex;align-items:baseline;gap:10px;font-size:15px;line-height:1.55;color:{c['fg']};max-width:1240px}}
.ans .k{{font:600 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;padding:3px 7px;border-radius:5px;flex:none;position:relative;top:-1px}}
.ans .k.ok{{background:rgba(111,163,104,.18);color:#9BCB93}}
.ans .k.call{{background:rgba(255,77,154,.16);color:#FF8DBE}}
.ans .k.hugh{{background:rgba(224,145,60,.18);color:#F0B26E}}
.frames{{display:flex;flex-wrap:wrap;gap:44px;align-items:flex-start}}
.fr{{display:flex;flex-direction:column;gap:10px;flex:none}}
.fr>.w{{font:500 11px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:{c['lbl']}}}
.fr>.fc{{margin:0;font-size:12.5px;line-height:1.55;color:{c['cap']};text-wrap:pretty}}
.fr>.fc b{{color:{c['fg']};font-weight:600}}
.fr>.fc code{{font:11.5px 'IBM Plex Mono',monospace;color:{c['fg']}}}
.note{{border:1px solid {c['rule']};border-radius:12px;background:{c['box']};padding:16px 18px;font-size:13px;line-height:1.6;color:{c['cap']};max-width:1240px}}
.note b{{color:{c['fg']}}}
table.t{{border-collapse:collapse;font-size:13px;color:{c['cap']}}}
table.t th{{font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:{c['lbl']};text-align:left;padding:8px 14px;border-bottom:1px solid {c['rule']}}}
table.t td{{padding:9px 14px;border-bottom:1px solid {c['rule']};vertical-align:top;line-height:1.5}}
table.t td.n{{font:500 12.5px 'IBM Plex Mono',monospace;color:{c['fg']};white-space:nowrap}}
table.t td.bad{{color:#F08A7A}}
table.t td.good{{color:#9BCB93}}
table.t td b{{color:{c['fg']};font-weight:600}}
.new{{outline:1.5px dashed rgba(255,111,174,.75);outline-offset:3px;border-radius:6px}}
.pin{{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:{c['id']};color:#0A0B0F;font:700 11px 'IBM Plex Mono',monospace}}
.dim{{font:500 10.5px 'IBM Plex Mono',monospace;color:{c['id']}}}
"""


# ------------------------------------------------------------------ the app's own pieces (themed by .th-*)
APP_CSS = r"""
.ph{width:390px;flex:none;border-radius:30px;border:1px solid var(--border-strong);background:var(--bg);overflow:hidden;position:relative;display:flex;flex-direction:column;font-family:'IBM Plex Sans',sans-serif;color:var(--fg)}
.dk{flex:none;border-radius:14px;border:1px solid var(--border-strong);background:var(--bg);overflow:hidden;position:relative;display:flex;font-family:'IBM Plex Sans',sans-serif;color:var(--fg)}
.crop{flex:none;overflow:hidden;position:relative;background:var(--bg);border:1px solid var(--border-strong);border-radius:14px;font-family:'IBM Plex Sans',sans-serif;color:var(--fg)}
.mhd{height:73px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:20px 20px 14px;border-bottom:1px solid var(--border);background:var(--bg);position:relative;z-index:6}
.wm{display:flex;align-items:flex-end;gap:3px}
.wm .the{font:9px 'IBM Plex Mono',monospace;letter-spacing:.4em;color:var(--accent);padding-bottom:4px}
.wm .mk{display:flex;flex-direction:column;align-items:center;gap:2px}
.wm .nn{font:800 24px/22px 'Cinzel',serif;color:var(--fg);letter-spacing:-.01em}
.hav{width:38px;height:38px;border-radius:12px;border:1px solid var(--accent);color:var(--fg);font:500 13px 'IBM Plex Sans',sans-serif;display:flex;align-items:center;justify-content:center;flex:none}
.hsr{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);flex:none;margin-right:2px}
.tbar{height:74px;flex:none;display:flex;align-items:center;padding:8px 8px 14px;border-top:1px solid var(--border);background:var(--surface-rail);position:relative;z-index:5}
.tbar span{flex:1;height:52px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:9px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:var(--fg-faint)}
.tbar span.on{background:var(--surface-inset);color:var(--fg)}
.pb{flex:1;min-height:0;overflow:hidden;position:relative}
.rail{width:62px;flex:none;background:var(--surface-rail);border-right:1px solid var(--border);display:flex;flex-direction:column;align-items:center;padding:14px 0 14px;gap:4px}
.rail .mk{display:flex;flex-direction:column;align-items:center;gap:3px;margin-bottom:12px}
.rail .mk .nn{font:800 17px/16px 'Cinzel',serif;color:var(--fg)}
.rail .sl{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint)}
.rail .sl.on{background:var(--surface-inset);color:var(--fg)}
.rail .ft{margin-top:auto;width:36px;height:36px;border-radius:50%;border:1px solid var(--accent);display:flex;align-items:center;justify-content:center;font:500 12px 'IBM Plex Sans',sans-serif;color:var(--fg)}
.main{flex:1;min-width:0;position:relative;overflow:hidden}

/* /credits: PAGE = mx-auto max-w-1040 gap-22 px-16 pb-28 pt-18 (md gap-26 px-48 pb-40 pt-34) */
.pg{display:flex;flex-direction:column;gap:22px;padding:18px 16px 28px}
.pg.d{gap:26px;padding:34px 48px 40px;max-width:1040px;margin:0 auto}
.phead{display:flex;flex-direction:column;gap:6px}
.phead h1{margin:0;font:700 26px var(--disp);color:var(--fg)}
.pg.d .phead h1{font-size:30px}
.phead .sub{font:11px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.lk{color:var(--accent);text-decoration:underline;text-decoration-color:var(--accent-shadow);text-underline-offset:2px}
.mail{color:var(--accent);text-decoration:underline}
.mail.fg{color:var(--fg);text-decoration:underline;text-decoration-color:var(--accent);text-decoration-thickness:1px;text-underline-offset:2px}
.bal{display:flex;flex-direction:column;gap:12px}
.tot{display:flex;align-items:baseline;gap:10px}
.tot b{font:700 44px/44px var(--disp);letter-spacing:-.01em;color:var(--fg)}
.tot span{font:12px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.ord{display:flex;align-items:center;gap:8px;font:500 9.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.cells{display:flex;align-items:stretch;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);list-style:none;margin:0;padding:0}
.cell{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;padding:12px 12px 13px}
.pg.d .cell{padding:16px 18px}
.cell+.cell{border-left:1px solid var(--border)}
.cell+.cell::before{content:'';position:absolute;left:-5px;top:50%;margin-top:-4px;width:8px;height:8px;transform:rotate(45deg);border-top:1px solid var(--border-strong);border-right:1px solid var(--border-strong);background:var(--surface)}
.cell .k{font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.cell .n{display:flex;align-items:baseline;gap:4px;font:600 24px/1.05 'IBM Plex Mono',monospace;color:var(--fg)}
.pg.d .cell .n{font-size:30px}
.cell .n small{font:400 12px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.cell .n .plus{font:600 11px 'IBM Plex Mono',monospace;color:var(--success)}
.cell .su{min-height:14.7px;font:10.5px/14.7px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.today{display:flex;align-items:flex-start;gap:8px;margin:0;font:11px/1.55 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.today .m{margin-top:6px;width:64px;height:5px;flex:none;overflow:hidden;border-radius:3px;background:var(--elevated)}
.today .m i{display:block;height:100%}
.offers h2,.hist h2{margin:0 0 10px;font:600 17px var(--disp);color:var(--fg)}
.pg.d .offers{max-width:463px}
.pg.d .offers h2,.pg.d .hist h2{font-size:19px}
.pack{display:flex;flex-direction:column;gap:12px;border-radius:14px;border:1px solid var(--border-strong);background:var(--surface);padding:16px}
.pg.d .pack{padding:20px 22px}
.pack .top{display:flex;align-items:flex-start;gap:14px}
.pack .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.pack .kk{font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.pack h3{margin:0;font:700 19px var(--disp);color:var(--fg)}
.pack .pr{font:600 13px 'IBM Plex Mono',monospace;color:var(--fg)}
.pack .fine{margin:0;font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
.pack .row{display:flex;flex-direction:column;gap:8px}
.pg.d .pack .row{flex-direction:row;align-items:center;gap:16px}
.pack .buy{height:44px;display:flex;align-items:center;justify-content:center;border:0;border-radius:8px;background:var(--accent);padding:0 20px;font:600 14px 'IBM Plex Sans',sans-serif;color:var(--bg)}
.pg.d .pack .buy{height:40px}
.pack .via{font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.art{width:74px;flex:none;display:flex;flex-direction:column;align-items:center;padding:4px 0 12px}
.dia{width:46px;height:46px;transform:rotate(45deg);display:flex;align-items:center;justify-content:center;border-radius:4px;border:1px solid var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--surface))}
.dnum{transform:rotate(-45deg);font:700 21px/1 var(--disp);color:var(--accent);font-variant-numeric:lining-nums;text-box:trim-both cap alphabetic}
.th-kaldheim .dnum{padding-bottom:3px}
.hl{margin:0;padding:0;list-style:none;overflow:hidden;border-radius:12px;border:1px solid var(--border);background:var(--surface)}
.hl li{display:flex;align-items:center;gap:12px;min-height:56px;padding:9px 14px}
.hl li+li{border-top:1px solid var(--border)}
.hl .dt{width:52px;flex:none;font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.pg.d .hl .dt{width:90px}
.pg.d .hl li{min-height:0;padding:8px 18px}
.hl .lb{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;font-size:13.5px;color:var(--fg)}
.hl .lb small{font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.hl .am{flex:none;font:12px 'IBM Plex Mono',monospace;color:var(--fg-body)}
.hl .rc{width:59px;flex:none;display:flex;justify-content:flex-end;align-items:center;gap:4px;font:600 12.5px 'IBM Plex Sans',sans-serif;color:var(--accent)}
.hempty{margin:0;border-radius:12px;border:1px dashed var(--border-dashed);padding:18px 16px;font-size:13px;color:var(--fg-muted)}
.refund{margin:10px 0 0;font-size:12.5px;line-height:1.55;color:var(--fg-muted)}
.band{position:relative;overflow:hidden;display:flex;align-items:flex-start;gap:12px;border-radius:12px;border:1px solid var(--border-strong);background:var(--surface);padding:14px 16px}
.band.ok{border-color:var(--success)}
.band .bt{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.band b{font:600 14.5px 'IBM Plex Sans',sans-serif;color:var(--fg)}
.band p{margin:0;font-size:12.5px;line-height:1.5;color:var(--fg-body)}
.band .tick{margin-top:1px;width:22px;height:22px;flex:none;border-radius:50%;background:var(--success);color:var(--bg);display:flex;align-items:center;justify-content:center;font:700 12px 'IBM Plex Sans',sans-serif}
.band .dot{margin-top:6px;width:10px;height:10px;flex:none;border-radius:50%;background:var(--fg-muted)}
.band .rcp{display:flex;align-items:center;gap:4px;min-height:32px;font-size:13px;color:var(--fg)}

/* the account menu (sheet at 390, popover at 1280) and the chip */
.sht{position:absolute;left:0;right:0;bottom:0;background:var(--surface);border-top:1px solid var(--border-strong);border-radius:20px 20px 0 0;padding:20px 20px 26px}
.sht .grab{margin:0 auto 20px;width:40px;height:4px;border-radius:2px;background:var(--border-strong)}
.idb{display:flex;align-items:center;gap:14px;padding-bottom:18px;border-bottom:1px solid var(--border)}
.idb .av{width:48px;height:48px;border-radius:14px;flex:none;border:1px solid var(--accent);background:var(--bg);display:flex;align-items:center;justify-content:center;font:15px 'IBM Plex Mono',monospace;color:var(--accent)}
.idb .nm{min-width:0;display:flex;flex-direction:column}
.idb .nm b{font-size:16px;font-weight:600;color:var(--fg)}
.idb .nm .em{font:12px 'IBM Plex Mono',monospace;color:var(--fg-faint);margin-top:2px}
.pop{position:absolute;width:300px;padding:8px;background:var(--surface-raised);border:1px solid var(--border-strong);border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.6)}
.pop .idb{gap:12px;padding:12px 12px 14px}
.pop .idb .av{width:44px;height:44px;border-radius:12px;font-size:14px}
.pop .idb .nm b{font-size:14px}
.pop .idb .nm .em{font-size:11px;color:var(--fg-muted)}
.thp{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:14px 0 0}
.thp span{height:38px;border-radius:9px;border:1px solid var(--border);background:var(--surface-inset)}
.thp span.on{border-color:var(--accent)}
.mis{margin-top:14px;padding-top:10px;border-top:1px solid var(--border);display:flex;flex-direction:column}
.mis span{min-height:44px;display:flex;align-items:center;font-size:15px;color:var(--fg-body)}
.chip{margin-top:8px;display:inline-flex;align-items:center;gap:7px;align-self:flex-start;white-space:nowrap;border-radius:999px;border:1px solid;padding:0 11px 0 10px;font:500 12px 'IBM Plex Sans',sans-serif;color:var(--fg);min-height:30px}
.chip.sheet{min-height:44px}
.chip.held{border-color:color-mix(in srgb,var(--accent) 50%,transparent);background:color-mix(in srgb,var(--accent) 16%,transparent)}
.chip.out{border-color:color-mix(in srgb,var(--accent) 50%,transparent);background:transparent;font-weight:600}
.chip.warn{border-color:color-mix(in srgb,var(--warning) 55%,transparent);background:color-mix(in srgb,var(--warning) 14%,transparent)}
.chip .dm{display:block;width:9px;height:9px;flex:none;transform:rotate(45deg);border-radius:1px;background:var(--accent)}
.chip.warn .dm{background:var(--warning)}
.chip .dm.hol{background:transparent;border:1.5px solid var(--accent)}
.chip .ct{font:600 13px 'IBM Plex Mono',monospace;color:var(--fg)}
.chip.warn .ct{color:var(--warning)}
.chip.tint .ct{color:color-mix(in srgb,var(--accent) 35%,var(--fg))}
.chip.acc .ct{color:var(--accent)}
.chip em{margin-left:1px;font-style:normal;color:var(--accent)}
.chip.warn em{color:var(--warning)}
.chipline{margin-top:5px;font:11px 'IBM Plex Mono',monospace;color:var(--warning)}

/* Help me choose (intake-form.tsx) */
.hmc{display:flex;flex-direction:column;gap:20px;padding:18px}
.hmc .ti{display:flex;flex-direction:column;gap:4px}
.hmc .ti h1{margin:0;font:700 22px var(--disp);color:var(--fg)}
.hmc .ti p{margin:0;font-size:13px;color:var(--fg-muted)}
.fld{display:flex;flex-direction:column;gap:9px}
.fld .fl{font:10px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.fld .fl i{font-style:normal;font-size:9.5px;letter-spacing:.06em;text-transform:none;color:var(--fg-locked);margin-left:8px}
.fld .fcap{margin:0;font-size:12px;line-height:1.5;color:var(--fg-faint)}
.fld .fcap.mu{color:var(--fg-muted)}
.segs{display:flex;gap:6px}
.segs span{flex:1;height:40px;border-radius:9px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font:12.5px 'IBM Plex Sans',sans-serif;color:var(--fg-body)}
.segs span.on{background:var(--elevated);border-color:var(--fg-faint);color:var(--fg)}
.setc{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.setc .sc{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 4px 0 9px;border-radius:6px;background:var(--elevated);font-size:12.5px;color:var(--fg-body)}
.setc .sc b{font:600 11px 'IBM Plex Mono',monospace;color:var(--fg)}
.setc .sc i{width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:11px;color:var(--fg-faint)}
.setc .add{height:26px;display:inline-flex;align-items:center;padding:0 9px;border-radius:6px;border:1px dashed var(--border-dashed);font-size:12.5px;color:var(--fg-muted)}
.inp{height:42px;border-radius:9px;border:1px solid var(--border-strong);background:var(--surface-inset);display:flex;align-items:center;padding:0 12px;font-size:14px;color:var(--fg-placeholder)}
.ta{border-radius:9px;border:1px solid var(--border-strong);background:var(--surface-inset);padding:10px 12px;font-size:14px;line-height:1.5;color:var(--fg);min-height:92px}
.dock{position:absolute;left:0;right:0;bottom:74px;z-index:20;padding:10px 16px 12px;border-top:1px solid var(--border);background:var(--bg)}
.press{width:100%;height:48px;border-radius:10px;border:1px solid transparent;background:var(--fg);color:var(--bg);display:flex;align-items:center;justify-content:center;font:600 15px 'IBM Plex Sans',sans-serif}
.press.d{width:auto;height:44px;padding:0 23px;flex:none}
.dline{margin:6px 0 0;text-align:center;font:10px/1.5 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.gm{margin-top:2px;display:flex;align-items:center;gap:7px;min-height:44px;width:fit-content;font:600 13px 'IBM Plex Sans',sans-serif;color:var(--accent)}
.gm i{font-style:normal;font-size:10px}
.dock .gm{margin-left:auto;margin-right:auto}
.dline2{margin:0;max-width:380px;font:10.5px/1.5 'IBM Plex Mono',monospace;color:var(--fg-faint)}
"""


def nav_icon(name, size=19):
    P = {
        "Home": '<path d="M3 9.2 10 3.6l7 5.6V16a1 1 0 0 1-1 1h-3.5v-4.2h-5V17H4a1 1 0 0 1-1-1z"/>',
        "Collection": '<rect x="3.2" y="3.2" width="5.8" height="5.8" rx="1.2"/><rect x="11" y="3.2" width="5.8" height="5.8" rx="1.2"/><rect x="3.2" y="11" width="5.8" height="5.8" rx="1.2"/><rect x="11" y="11" width="5.8" height="5.8" rx="1.2"/>',
        "Commanders": '<path d="M3 14.5 4.4 6l3.2 3.6L10 4l2.4 5.6L15.6 6 17 14.5z"/><path d="M3 16.6h14"/>',
        "Discover": '<circle cx="10" cy="10" r="6.8"/><path d="M10 6.4 12.8 10 10 13.6 7.2 10z"/>',
        "Decks": '<rect x="6.6" y="3.2" width="10" height="13" rx="1.6"/><path d="M4.2 5.4A1.6 1.6 0 0 0 3.4 6.8v8.6a1.6 1.6 0 0 0 1.6 1.6h8.2"/>',
        "Search": '<circle cx="8.6" cy="8.6" r="5.6"/><path d="M12.8 12.8 17 17"/>',
    }
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{P[name]}</svg>')


def crown(s=5, l=7, gap=3):
    import math
    ds, dl = s * math.sqrt(2), l * math.sqrt(2)
    w = ds + gap + dl + gap + ds
    h = dl

    def dia(cx, d):
        r = d / 2
        cy = h - r
        return f'<path d="M{cx:.2f} {cy - r:.2f} L{cx + r:.2f} {cy:.2f} L{cx:.2f} {cy + r:.2f} L{cx - r:.2f} {cy:.2f}Z"/>'
    return (f'<svg width="{w:.1f}" height="{h:.1f}" viewBox="0 0 {w:.2f} {h:.2f}" fill="var(--accent)" aria-hidden="true">'
            f'{dia(ds / 2, ds)}{dia(ds + gap + dl / 2, dl)}{dia(ds + gap + dl + gap + ds / 2, ds)}</svg>')


def mheader():
    return (f'<div class="mhd"><div class="wm"><span class="the">THE</span><span class="mk">{crown()}<span class="nn">99</span></span></div>'
            f'<div style="display:flex;align-items:center"><span class="hsr">{nav_icon("Search", 20)}</span><span class="hav">CO</span></div></div>')


TABS = ["Home", "Collection", "Commanders", "Discover", "Decks"]


def tabbar(active=None):
    return '<div class="tbar">' + "".join(f'<span class="{"on" if n == active else ""}">{nav_icon(n)}{n}</span>' for n in TABS) + "</div>"


def rail(active=None):
    slots = "".join(f'<span class="sl{" on" if n == active else ""}">{nav_icon(n)}</span>' for n in TABS)
    return (f'<div class="rail"><span class="mk">{crown(4, 6, 2)}<span class="nn">99</span></span>'
            f'<span class="sl" style="color:var(--fg-muted)">{nav_icon("Search")}</span>'
            f'<span style="width:24px;height:1px;background:var(--border-strong);margin:6px 0 8px"></span>{slots}'
            f'<span class="ft">CO</span></div>')


def phone(theme, inner, h=844, active=None, over="", check="phone", top=0, header=True, tabs=True):
    hd = mheader() if header else ""
    tb = tabbar(active) if tabs else ""
    shift = f' style="position:absolute;left:0;right:0;top:{-top}px"' if top else ""
    return (f'<div class="ph th-{theme}" data-check="{check}" style="height:{h}px">{hd}'
            f'<div class="pb"><div{shift}>{inner}</div></div>{tb}{over}</div>')


def desk(theme, inner, w=1300, h=820, active=None, over="", check="desk"):
    return (f'<div class="dk th-{theme}" data-check="{check}" style="width:{w}px;height:{h}px">{rail(active)}'
            f'<div class="main">{inner}</div>{over}</div>')


def crop(theme, inner, w=390, h=None, style=""):
    hh = f"height:{h}px;" if h else ""
    return f'<div class="crop th-{theme}" style="width:{w}px;{hh}{style}">{inner}</div>'


def frame(label, body, cap="", width=390):
    c = f'<p class="fc">{cap}</p>' if cap else ""
    return f'<div class="fr" style="width:{width}px"><span class="w">{label}</span>{body}{c}</div>'


def sec(id_, title, kind, answer, body, cap=""):
    k = {"ok": ("ok", "Confirmed"), "call": ("call", "Design's call"), "hugh": ("hugh", "Hugh's pick")}[kind]
    capp = f'<p class="cap">{cap}</p>' if cap else ""
    return (f'<section class="sec"><div class="sh"><span class="id">{id_}</span><span class="t">{title}</span></div>'
            f'<div class="ans"><span class="k {k[0]}">{k[1]}</span><span>{answer}</span></div>{capp}{body}</section>')


HEIGHTS = json.load(open(f"{HERE}/heights.json")) if os.path.exists(f"{HERE}/heights.json") else {}


def doc(title, body, width, height, kind="credits", extra_css=""):
    height = HEIGHTS.get(title, height)
    mh = height if title in HEIGHTS else 0
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link href="{FONTS}" rel="stylesheet">
<style>{chrome_css(kind)}{APP_CSS}{theme_css()}{extra_css}</style>
</helmet>
<div class="board" data-board="1" style="width:{width}px;min-height:{mh}px">{body}</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{width},"height":{height}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""


def head(kicker, title, cap):
    return f'<div class="bh"><span class="lbl">{kicker}</span><h1>{title}</h1><p class="cap">{cap}</p></div>'


def table(heads, rows, cls=None):
    th = "".join(f"<th>{h}</th>" for h in heads)
    out = []
    for r in rows:
        tds = []
        for i, c in enumerate(r):
            k = (cls[i] if cls else "")
            if isinstance(c, tuple):
                c, k = c
            tds.append(f'<td class="{k}">{c}</td>')
        out.append("<tr>" + "".join(tds) + "</tr>")
    return f'<table class="t"><thead><tr>{th}</tr></thead><tbody>{"".join(out)}</tbody></table>'
