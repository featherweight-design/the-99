# Builds the Fan Content notice R1 canvas boards (.dc.html) from the shipped theme tokens.
import json, os, re

S = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(S, "canvas", "project")
os.makedirs(OUT, exist_ok=True)
T = json.load(open(os.path.join(S, "themes.json")))

THEMES = [
    ("amonkhet", "Low Sun", "Amonkhet", "'Cinzel',serif"),
    ("kamigawa", "Neon Rain", "Kamigawa: Neon Dynasty", "'Chakra Petch',sans-serif"),
    ("ixalan", "Canopy", "Ixalan", "'Trirong',serif"),
    ("phyrexia", "Oil Haze", "New Phyrexia", "'Syncopate',sans-serif"),
    ("eldraine", "Witching Hour", "Wilds of Eldraine", "'Cormorant Garamond',serif"),
    ("kaldheim", "First Frost", "Kaldheim", "'Metamorphous',serif"),
]
NAME = {k: n for k, n, _, _ in THEMES}

ART = {
    "ashling": ("63db94d324cba338e63bf81300cf35c3", "Ashling, the Limitless", "ECC"),
    "dina": ("5d77e44e49b4a1daade02ae01e0dc223", "Dina, Essence Brewer", "DSK"),
    "ghalta": ("c05def30761d6f0cfe1585f3bd8c8149", "Ghalta, Primal Hunger", "RIX"),
    "giada": ("6f2295a4e90c1285cb53f5d6bcc361bb", "Giada, Font of Hope", "SNC"),
    "gisa": ("b4ba3153bef427fd28208dcdb6ef423a", "Gisa, the Hellraiser", "MKM"),
    "killian": ("efebd9e5ce717ddbc624fe191bbf227f", "Killian, Decisive Mentor", "DSK"),
    "lathliss": ("3adbd2bc68ec640967896a8165689ca8", "Lathliss, Dragon Queen", "M19"),
    "miku": ("9fe101c1d8b379b5a7d724ddfdb6254b", "Miku, Song of the People", "SLD"),
    "quintorius": ("09ad24a933006502d37c449c66d1d2c3", "Quintorius, History Chaser", "LCC"),
    "rootha": ("fd679929a6a6534e2498515e17a67ea2", "Rootha, Mastering the Moment", "STX"),
    "sai": ("71cf64b59166e0c4e58679194a5b5d53", "Sai, Master Thopterist", "M19"),
    "zada": ("a1bc9a136b95023a2724370e81db4d7f", "Zada, Hedron Grinder", "BFZ"),
    "zimone": ("2d50b5031d528159baa497e8b80b9c5d", "Zimone, Infinite Analyst", "DSC"),
}
GHALTA_ART = "/_blob/d6fed115feb9bb6e78abb610047db1b9"


def lum(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c]
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]


def ratio(a, b):
    a, b = lum(a), lum(b)
    return (max(a, b) + .05) / (min(a, b) + .05)


def theme_css():
    out = []
    for key, _, _, disp in THEMES:
        toks = ";".join(f"--{k}:{v}" for k, v in T[key].items())
        out.append(f'[data-theme="{key}"]{{{toks};--disp:{disp};background:var(--bg);color:var(--fg)}}')
    return "\n".join(out)


FONTS = ("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400"
         "&amp;family=IBM+Plex+Mono:wght@400;500;600;700&amp;family=Chakra+Petch:wght@500;600;700"
         "&amp;family=Cinzel:wght@700;800;900&amp;family=Trirong:wght@600;700&amp;family=Syncopate:wght@700"
         "&amp;family=Cormorant+Garamond:wght@600;700&amp;family=Metamorphous&amp;display=swap")

BASE_CSS = r"""
body{margin:0;background:#0A0B0F}
*{box-sizing:border-box}
svg{flex:none}
a{color:inherit}
.board{box-sizing:border-box;padding:48px 56px 72px;background:#0A0B0F;font-family:'IBM Plex Sans',sans-serif;color:#E6E8F0;display:flex;flex-direction:column;gap:36px}
.bh{display:flex;flex-direction:column;gap:10px;max-width:1180px}
.bh h2{margin:0;font:700 30px 'Chakra Petch',sans-serif;color:#E6E8F0}
.bh p{margin:0;font-size:14.5px;line-height:1.6;color:#B1B6C7}
.bh p b{color:#E6E8F0;font-weight:600}
.k{font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:#959AAD}
.sec{display:flex;flex-direction:column;gap:20px}
.sec>h3{margin:0;font:700 20px 'Chakra Petch',sans-serif;color:#E6E8F0}
.sec>p.lead{margin:-8px 0 0;font-size:14px;line-height:1.6;color:#B1B6C7;max-width:1100px}
.frames{display:flex;flex-wrap:wrap;gap:48px;align-items:flex-start}
.fr{display:flex;flex-direction:column;gap:12px;flex:none}
.cap{font-size:13px;line-height:1.55;color:#959AAD;margin:0;text-wrap:pretty}
.cap b{color:#E6E8F0;font-weight:600}
.cap code,.note code,.bh code,td code{font:12px 'IBM Plex Mono',monospace;color:#B1B6C7}
.note{border:1px solid #262A35;border-radius:12px;background:#111319;padding:18px 20px;font-size:13.5px;line-height:1.62;color:#B1B6C7}
.note b{color:#E6E8F0;font-weight:600}
.note ul,.note ol{margin:6px 0 0;padding-left:18px}
.note li{margin:4px 0}
.pin{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 7px;border-radius:11px;background:#FF4D9A;color:#0E0F14;font:700 11.5px 'IBM Plex Mono',monospace;flex:none}
.rej{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:6px;border:1px solid #3A3D48;color:#959AAD;font:600 11px 'IBM Plex Mono',monospace;letter-spacing:.06em;text-transform:uppercase}
.call{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:6px;background:rgba(255,77,154,.14);color:#FF7AB4;font:600 11px 'IBM Plex Mono',monospace;letter-spacing:.06em;text-transform:uppercase}
table.t{border-collapse:collapse;width:100%;font-size:13px;line-height:1.5;color:#B1B6C7}
table.t th{text-align:left;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#959AAD;padding:10px 12px;border-bottom:1px solid #262A35}
table.t td{padding:11px 12px;border-bottom:1px solid #181C26;vertical-align:top}
table.t td b{color:#E6E8F0;font-weight:600}
.ok{color:#6FA368;font-weight:600}
.no{color:#C6533F;font-weight:600}

/* the notice: the one component */
.fcn{flex:none;border-top:1px solid var(--border);padding:20px 16px 24px;display:flex;flex-direction:column;gap:6px;font:400 11px/16px 'IBM Plex Sans',sans-serif;color:var(--fg-muted);letter-spacing:0;text-align:left}
.fcn p{margin:0;max-width:720px;text-wrap:pretty}
.fcn a{color:var(--fg-muted);text-decoration:underline;text-decoration-color:var(--fg-faint);text-decoration-thickness:1px;text-underline-offset:2px}
.fcn a .ext{font-size:10px;margin-left:2px;text-decoration:none;display:inline-block}
.fcn.c{align-items:center;text-align:center}
.fcn.out{padding-bottom:24px}
.fcn.wide{padding:22px 34px 28px;font-size:12px;line-height:18px}
.fcn.wide.c{padding:22px 48px 28px}
.fcn a.hov{color:var(--fg);text-decoration-color:var(--fg-muted)}
.fcn a.foc{outline:2px solid var(--accent);outline-offset:2px;border-radius:2px}
.new{outline:1.5px dashed rgba(255,77,154,.6);outline-offset:-3px}

/* phone */
.ph{width:390px;height:844px;flex:none;border-radius:34px;border:1px solid #262A35;background:var(--bg);overflow:hidden;position:relative;display:flex;flex-direction:column;font-family:'IBM Plex Sans',sans-serif;color:var(--fg)}
.ph.auto{height:auto}
.mhd{height:79px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:20px 20px 14px;border-bottom:1px solid var(--border);background:var(--bg)}
.wm{display:flex;align-items:flex-end;gap:3px;text-decoration:none}
.wm .the{font:9px 'IBM Plex Mono',monospace;letter-spacing:.4em;color:var(--accent);padding-bottom:4px}
.wm .mk{display:flex;flex-direction:column;align-items:center;gap:2px}
.wm .nn{font:800 24px/22px var(--disp);color:var(--fg);letter-spacing:-.01em}
.clu{display:flex;align-items:center}
.av{width:38px;height:38px;border-radius:12px;border:1px solid var(--accent);color:var(--fg);font:500 13px 'IBM Plex Sans',sans-serif;display:flex;align-items:center;justify-content:center;flex:none}
.sic{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);flex:none;margin-right:2px}
.col{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;position:relative}
.col.end{justify-content:flex-end}
.col>.main{flex:1 0 auto;display:flex;flex-direction:column}
.col.end>.main{flex:0 0 auto}
.tbar{position:absolute;left:0;right:0;bottom:0;height:74px;display:flex;align-items:center;padding:8px 8px 14px;border-top:1px solid var(--border);background:var(--surface-rail);z-index:5}
.tbar .sl{flex:1;height:52px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:9px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:var(--fg-faint)}
.tbar .sl.on{background:var(--surface-inset);color:var(--fg)}
.tbar.lk{height:88px;flex-direction:column;align-items:stretch;padding:7px 8px 14px}
.tbar.lk .row{display:flex;align-items:center}
.tbar.lk .sl.l{color:var(--fg-locked);gap:5px}
.brk{position:relative;height:14px;flex:none;margin-left:20%}
.brk .bx{position:absolute;top:7px;right:8px;left:8px;height:6px;border-radius:3px 3px 0 0;border:1px solid var(--border-strong);border-bottom:0}
.brk .lb{position:absolute;top:0;left:50%;transform:translateX(-50%);display:inline-flex;align-items:center;gap:5px;white-space:nowrap;background:var(--surface-rail);padding:0 7px;font:9px/14px 'IBM Plex Mono',monospace;letter-spacing:.08em;color:var(--fg-locked);text-transform:uppercase}
.res{flex:none;position:relative;background:repeating-linear-gradient(135deg,rgba(255,77,154,.10) 0 6px,transparent 6px 12px);border-top:1px dashed rgba(255,77,154,.45)}
.res span{position:absolute;right:10px;top:6px;font:600 10px 'IBM Plex Mono',monospace;color:#FF7AB4;letter-spacing:.04em}
.gap74{flex:none;height:74px;position:relative;background:repeating-linear-gradient(135deg,rgba(198,83,63,.16) 0 6px,transparent 6px 12px);border-top:1px dashed rgba(198,83,63,.6);border-bottom:1px dashed rgba(198,83,63,.6)}
.gap74 span{position:absolute;left:16px;top:28px;font:600 10.5px 'IBM Plex Mono',monospace;color:#E07A66;letter-spacing:.04em}
.fold{position:absolute;left:0;right:0;height:0;border-top:1.5px dashed #E0913C;z-index:9}
.fold span{position:absolute;right:10px;top:-20px;font:600 10px 'IBM Plex Mono',monospace;color:#E0913C;background:#0A0B0F;padding:1px 6px;border-radius:4px}

/* page bits */
.pt{padding:18px 16px 4px;display:flex;flex-direction:column;gap:4px}
.pt h1{margin:0;font:700 24px/1.2 var(--disp);color:var(--fg)}
.pbtn{display:inline-flex;align-items:center;justify-content:center;height:48px;padding:0 26px;border-radius:8px;border:0;background:var(--accent);color:var(--bg);font:600 15px 'IBM Plex Sans',sans-serif;text-decoration:none}
.sbtn{display:inline-flex;align-items:center;justify-content:center;height:48px;padding:0 20px;border-radius:8px;border:1px solid var(--border-strong);background:transparent;color:var(--fg);font:500 15px 'IBM Plex Sans',sans-serif;text-decoration:none}
.zero{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:56px 28px 24px}
.zero h2{margin:0;font:700 20px var(--disp)}
.zero p{margin:0;font-size:14px;line-height:1.55;color:var(--fg-body);max-width:300px}
.zero .acts{display:flex;flex-direction:column;gap:10px;align-self:stretch;margin-top:12px}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:12px 14px 16px}
.tile{border-radius:9px;overflow:hidden;background:var(--surface);border:1px solid var(--border);display:flex;flex-direction:column}
.tile .ar{position:relative;aspect-ratio:63/88;overflow:hidden;border-radius:0 0 9px 9px;background:var(--surface-sunken)}
.tile .ar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.tile .cpt{display:flex;flex-direction:column;gap:3px;padding:6px 7px 8px}
.tile .cn{font:600 12px/16px 'IBM Plex Sans',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tile .cs{font:9.5px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.fr1{display:flex;flex-direction:column;gap:16px;padding:20px 16px 24px}
.stp{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);padding:16px;display:flex;flex-direction:column;gap:8px}
.stp h3{margin:0;font:600 16px 'IBM Plex Sans',sans-serif}
.stp p{margin:0;font-size:14px;line-height:1.5;color:var(--fg-body)}
.stp .acts{display:flex;gap:10px;margin-top:6px}
.stp .acts .pbtn,.stp .acts .sbtn{height:44px;font-size:14px;padding:0 16px}
.lrow{display:flex;flex-direction:column;gap:3px;padding:12px 16px;border:1px dashed var(--border-strong);border-radius:12px;color:var(--fg-locked)}
.lrow b{font:600 15px 'IBM Plex Sans',sans-serif;color:var(--fg-muted)}
.lrow span{font:11px 'IBM Plex Mono',monospace;color:var(--fg-muted)}

/* desktop */
.dk{width:1300px;height:820px;flex:none;display:flex;background:var(--bg);border:1px solid #262A35;border-radius:12px;overflow:hidden;position:relative;font-family:'IBM Plex Sans',sans-serif;color:var(--fg)}
.dk.auto{height:auto}
.rail{width:62px;flex:none;display:flex;flex-direction:column;align-items:center;padding:14px 0;border-right:1px solid var(--border);background:var(--surface-rail);gap:4px}
.rail .mk{display:flex;flex-direction:column;align-items:center;gap:3px;margin-bottom:16px}
.rail .mk .nn{font:900 23px/20px var(--disp);color:var(--fg)}
.rsl{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint)}
.rsl.on{background:var(--elevated);color:var(--fg)}
.rav{margin-top:auto;width:30px;height:30px;border-radius:50%;border:1px solid var(--accent);display:flex;align-items:center;justify-content:center;font:500 11px 'IBM Plex Sans',sans-serif;color:var(--fg)}
.dcol{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;position:relative}
.dcol.end{justify-content:flex-end}
.dcol>.main{flex:1 0 auto;display:flex;flex-direction:column}
.dcol.end>.main{flex:0 0 auto}
.dk .pt{padding:28px 34px 6px}
.dk .pt h1{font-size:30px}
.dk .grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:14px;padding:14px 34px 24px}
.dk .tile .cn{font-size:13px}
.dk .zero{padding:110px 28px 24px}
.dk .zero p{max-width:420px;font-size:15px}
.dk .zero .acts{flex-direction:row;align-self:center}
.dk .zero .acts .pbtn,.dk .zero .acts .sbtn{height:44px;font-size:14px}

/* signed-out pages */
.so{flex:1;display:flex;flex-direction:column;min-height:0}
.so>.pg{flex:1 0 auto;display:flex;flex-direction:column}
.wash1{background:radial-gradient(600px 360px at 50% 22%,color-mix(in srgb,var(--accent) 12%,transparent),transparent 70%),var(--bg)}
.wash18{background:radial-gradient(600px 360px at 50% 18%,color-mix(in srgb,var(--accent) 12%,transparent),transparent 70%),var(--bg)}
.washd{background:radial-gradient(1000px 520px at 50% 8%,color-mix(in srgb,var(--accent) 10%,transparent),transparent 70%),var(--bg)}
.hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 32px}
.hero .nn{font:900 92px/0.9 var(--disp);color:var(--fg);margin-top:8px}
.hero .ttl{font:11px 'IBM Plex Mono',monospace;letter-spacing:.4em;color:var(--accent);margin-top:14px;text-transform:uppercase}
.hero .tag{font:italic 17px/1.5 'IBM Plex Sans',sans-serif;color:var(--fg-body);max-width:280px;margin-top:22px}
.hero .pbtn{width:100%;max-width:260px;height:auto;padding:14px 0;margin-top:34px}
.hero .fine{font:11px 'IBM Plex Mono',monospace;letter-spacing:.04em;color:var(--fg-faint);margin-top:18px}
.dk .hero .nn{font-size:132px}
.dk .hero .ttl{font-size:13px;letter-spacing:.44em;margin-top:16px}
.dk .hero .tag{font-size:21px;max-width:none;margin-top:26px}
.dk .hero .pbtn{width:auto;max-width:none;padding:14px 40px;margin-top:36px}
.dk .hero .fine{font-size:12px;margin-top:20px}
.nc{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;padding:56px 24px 24px}
.nc.join{padding-top:44px}
.ncc{display:flex;flex-direction:column;max-width:380px;width:100%}
.ncc h1{margin:6px 0 0;font:700 24px/1.2 var(--disp)}
.ncc p{margin:8px 0 0;font-size:14px;line-height:1.6;color:var(--fg-body)}
.ncc p b{color:var(--fg);font-weight:500}
.ncc .pbtn{width:100%;margin-top:22px}
.ncc .fine{margin-top:16px;font:11px/1.6 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.ncc .kick{font:500 11px 'IBM Plex Mono',monospace;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin-bottom:10px}
.dk .nc.su{flex-direction:row;justify-content:center;align-items:center;gap:64px;padding:56px 0 24px}
.dk .nc.su .ncc{text-align:center;max-width:380px}
.dk .nc.su .ncc h1{font-size:30px;margin:0}
.dk .nc.su .ncc p{font-size:15px;margin-top:10px}
.dk .nc.su .ncc .pbtn{width:auto;height:44px;font-size:14px;align-self:flex-start;margin-top:20px}
.fan{position:relative;width:240px;height:240px;flex:none}
.dk .fan{width:360px;height:440px}
.cb{position:absolute;left:50%;top:50%;width:300px;height:419px;margin:-209.5px 0 0 -150px;border-radius:17px;background:var(--surface-inset);box-shadow:inset 0 0 0 1px var(--border-strong);padding:12px}
.cb .in{width:100%;height:100%;border-radius:10px;border:1px dashed var(--border-dashed);background:radial-gradient(160px 160px at 50% 45%,color-mix(in srgb,var(--accent) 18%,transparent),transparent 70%),repeating-linear-gradient(45deg,rgba(255,255,255,.025) 0 2px,transparent 2px 10px),var(--surface-sunken);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
.cb .dd{font:13px 'IBM Plex Mono',monospace;letter-spacing:4px;color:var(--accent)}
.cb .n9{font:900 58px/1 var(--disp);color:var(--fg)}
.cb .kk{font:10px 'IBM Plex Mono',monospace;letter-spacing:.4em;color:var(--accent);text-transform:uppercase;margin-top:6px}
.cardf{position:absolute;left:50%;top:50%;width:300px;height:419px;margin:-209.5px 0 0 -150px;border-radius:18px;padding:8px;background:linear-gradient(160deg,#3b5a3a,#1f2b1c 60%,#2d3b26)}
.cardf .ins{width:100%;height:100%;border-radius:12px;background:var(--surface-inset);display:flex;flex-direction:column;overflow:hidden}
.cardf .nb{height:34px;flex:none;background:var(--elevated);display:flex;align-items:center;padding:0 12px;font:600 18px 'IBM Plex Sans',sans-serif}
.cardf .aw{height:176px;flex:none;position:relative;overflow:hidden}
.cardf .aw img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cardf .tb{height:28px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font:500 13px 'IBM Plex Sans',sans-serif;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.cardf .tb i{color:var(--accent);font-style:normal}
.cardf .rb{flex:1;background:var(--surface-sunken);padding:12px;font-size:14px;line-height:1.45;color:var(--fg-body);text-align:left}
.cardf .cr{padding:6px 12px 8px;font:12px 'IBM Plex Mono',monospace;color:var(--fg-faint);text-transform:uppercase;text-align:left}
.form{display:flex;flex-direction:column;gap:6px;text-align:left;margin-top:22px}
.form label{font:600 13px 'IBM Plex Sans',sans-serif;color:var(--fg)}
.form .in{height:48px;border-radius:8px;border:1px solid var(--border-strong);background:var(--surface-sunken);display:flex;align-items:center;padding:0 14px;font-size:16px;color:var(--fg-placeholder)}
.form .pbtn{margin-top:14px;width:100%}
.fl{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:0 24px}
.lc{display:flex;flex-direction:column;gap:8px;align-items:center;text-align:center;max-width:380px}
.lc h1{margin:0;font:700 21px/1.15 var(--disp)}
.lc p{margin:0;font-size:14px;line-height:1.55;color:var(--fg-body)}
.lc .pbtn{width:100%;margin-top:6px}
.lc .fine{font:11px/1.6 'IBM Plex Mono',monospace;color:var(--fg-muted);margin-top:-4px}
.dk .fl{flex-direction:row;gap:56px;padding:0}
.dk .lc{align-items:flex-start;text-align:left;gap:10px;width:380px}
.dk .lc h1{font-size:28px}
.dk .lc .pbtn{width:auto;height:44px;font-size:14px;margin-top:12px}
.off{flex:1;display:flex;flex-direction:column;justify-content:center;gap:12px;padding:40px 20px;width:100%;max-width:560px;margin:0 auto}
.off .ey{font:700 10px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.off h1{margin:0;font:700 24px var(--disp)}
.off p{margin:0;font-size:14px;color:var(--fg-muted)}
.off .pbtn{height:44px;font-size:14px;padding:0 20px;align-self:flex-start;margin-top:8px}

/* legal pages */
.lh{height:64px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid var(--border)}
.lh .sbtn{height:40px;font-size:14px;padding:0 16px}
.dk .lh{padding:0 34px;height:68px}
.lp{display:flex;flex-direction:column;padding:24px 16px 40px;gap:0}
.lp .ey{font:500 11px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:var(--fg-muted)}
.lp h1{margin:6px 0 0;font:700 28px/1.15 var(--disp)}
.lp .intro{margin:16px 0 0}
.toc{margin-top:24px;border:1px solid var(--border);border-radius:12px;background:var(--surface);display:flex;flex-direction:column;overflow:hidden}
.toc .th{padding:12px 16px 6px}
.toc a{display:flex;align-items:center;gap:10px;min-height:44px;padding:0 16px;border-top:1px solid var(--border);font-size:14.5px;color:var(--fg-body);text-decoration:none}
.toc a:first-of-type{border-top:0}
.toc a i{font-style:normal;font:11px 'IBM Plex Mono',monospace;color:var(--fg-muted);width:18px}
.ls{margin-top:36px;display:flex;flex-direction:column;gap:12px}
.ls h2{margin:0;font:600 18px/1.3 'IBM Plex Sans',sans-serif;color:var(--fg)}
.bars{display:flex;flex-direction:column;gap:0}
.bars i{display:block;height:25px;position:relative}
.bars i::after{content:'';position:absolute;left:0;top:8px;height:9px;border-radius:2px;background:var(--border-strong);width:var(--w)}
.bars+.bars{margin-top:12px}
.dk .lwrap{display:flex;gap:72px;padding:40px 48px 64px;max-width:1040px;width:100%;margin:0 auto;align-items:flex-start}
.dk .lp{padding:0;width:680px;flex:none}
.dk .lp h1{font-size:36px}
.dtoc{width:220px;flex:none;position:sticky;top:40px;display:flex;flex-direction:column;gap:4px;padding-top:6px}
.dtoc .k{margin-bottom:8px}
.dtoc a{display:flex;align-items:center;gap:8px;min-height:32px;font-size:14px;color:var(--fg-muted);text-decoration:none}
.dtoc a.on{color:var(--fg)}
.dtoc a .dm{width:8px;display:inline-flex}
.dtoc a.on .dm svg{fill:var(--accent)}
"""

CROWN = ('<svg width="{w}" height="{h}" viewBox="0 0 34.99 12.02" fill="var(--accent)" aria-hidden="true">'
         '<path d="M4.24 3.54 L8.49 7.78 L4.24 12.02 L0.00 7.78Z"/><path d="M17.50 0.00 L23.51 6.01 L17.50 12.02 L11.49 6.01Z"/>'
         '<path d="M30.75 3.54 L34.99 7.78 L30.75 12.02 L26.51 7.78Z"/></svg>')


def crown(w):
    return CROWN.format(w=f"{w:.1f}", h=f"{w * 12.02 / 34.99:.1f}")


DIAMOND = '<svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 0 10 5 5 10 0 5z"/></svg>'

ICON = {
    "Home": '<path d="M3 9.2 10 3.6l7 5.6V16a1 1 0 0 1-1 1h-3.5v-4.2h-5V17H4a1 1 0 0 1-1-1z"/>',
    "Collection": '<rect x="3.2" y="3.2" width="5.8" height="5.8" rx="1.2"/><rect x="11" y="3.2" width="5.8" height="5.8" rx="1.2"/><rect x="3.2" y="11" width="5.8" height="5.8" rx="1.2"/><rect x="11" y="11" width="5.8" height="5.8" rx="1.2"/>',
    "Commanders": '<path d="M3 14.5 4.4 6l3.2 3.6L10 4l2.4 5.6L15.6 6 17 14.5z"/><path d="M3 16.6h14"/>',
    "Discover": '<circle cx="10" cy="10" r="6.8"/><path d="M10 6.4 12.8 10 10 13.6 7.2 10z"/>',
    "Decks": '<rect x="6.6" y="3.2" width="10" height="13" rx="1.6"/><path d="M4.2 5.4A1.6 1.6 0 0 0 3.4 6.8v8.6a1.6 1.6 0 0 0 1.6 1.6h8.2"/>',
}
SEARCH = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="8.6" cy="8.6" r="5.6"/><path d="M12.8 12.8 17 17"/></svg>'
LOCK = '<svg width="9" height="10" viewBox="0 0 9 10" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><rect x="1" y="4.4" width="7" height="5" rx="1"/><path d="M2.6 4.4V3a1.9 1.9 0 0 1 3.8 0v1.4"/></svg>'


def icon(name, s=19):
    return (f'<svg width="{s}" height="{s}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICON[name]}</svg>')


TABS = ["Home", "Collection", "Commanders", "Discover", "Decks"]


def tabbar(active, locked=False):
    if not locked:
        sl = "".join(f'<span class="sl{" on" if t == active else ""}">{icon(t)}{t}</span>' for t in TABS)
        return f'<nav class="tbar" aria-label="Main">{sl}</nav>'
    sl = f'<span class="sl{" on" if active == "Home" else ""}">{icon("Home")}Home</span>'
    sl += "".join(f'<span class="sl l">{icon(t)}{t}</span>' for t in TABS[1:])
    return (f'<nav class="tbar lk" aria-label="Main"><div class="brk"><span class="bx"></span>'
            f'<span class="lb">{LOCK}Open once your cards are in</span></div><div class="row">{sl}</div></nav>')


def mheader(av="CO"):
    return ('<div class="mhd"><span class="wm"><span class="the">THE</span><span class="mk">' + crown(30) +
            f'<span class="nn">99</span></span></span><span class="clu"><span class="sic">{SEARCH}</span>'
            f'<span class="av">{av}</span></span></div>')


def rail(active, locked=False):
    out = '<div class="rail"><span class="mk">' + crown(35) + '<span class="nn">99</span></span>'
    out += f'<span class="rsl" style="color:var(--fg-muted)">{SEARCH}</span><span style="width:24px;height:1px;background:var(--border-strong);margin:6px 0 8px"></span>'
    for t in TABS:
        cls = " on" if t == active else ""
        st = ' style="color:var(--fg-locked)"' if locked and t != "Home" else ""
        out += f'<span class="rsl{cls}"{st}>{icon(t)}</span>'
    return out + '<span class="rav">CO</span></div>'


P1A = "The 99 is unofficial Fan Content permitted under the "
P1B = ". Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC."
P2 = ("Card images and mana symbols are copyright Wizards of the Coast, LLC. Card data and images from Scryfall; prices "
      "from Mana Pool. Not affiliated with Wizards of the Coast, Scryfall or Mana Pool.")
FCP_URL = "https://company.wizards.com/en/legal/fancontentpolicy"


def notice(cls="", link_cls="", outline=True, extra_style=""):
    new = " new" if outline else ""
    st = f' style="{extra_style}"' if extra_style else ""
    return (f'<footer class="fcn {cls}{new}"{st}><p>{P1A}<a class="{link_cls}" href="{FCP_URL}" target="_blank" '
            f'rel="noopener noreferrer">Fan Content <span style="white-space:nowrap">Policy<span class="ext" aria-hidden="true">↗</span></span></a>{P1B}</p>'
            f'<p>{P2}</p></footer>')


def page(title, body, w, theme="kamigawa", fonts=True):
    helmet = f'<link href="{FONTS}" rel="stylesheet">' if fonts else ""
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
{helmet}
<style>
{theme_css()}
{BASE_CSS}
</style>
</helmet>
<div class="board" data-theme="{theme}" style="width:{w}px;background:#0A0B0F;color:#E6E8F0">
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":2000}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
"""


def fr(label, inner, cap, w):
    return f'<div class="fr" style="width:{w}px"><span class="k">{label}</span>{inner}<p class="cap">{cap}</p></div>'


def tiles(names):
    out = []
    for n in names:
        bid, nm, st = ART[n]
        out.append(f'<div class="tile"><div class="ar"><img src="/_blob/{bid}" alt="{nm}"></div>'
                   f'<div class="cpt"><span class="cn">{nm}</span><span class="cs">{st} · ×1</span></div></div>')
    return '<div class="grid">' + "".join(out) + '</div>'


ALL = list(ART)

# ---------------------------------------------------------------- Signed in
DECKS_ZERO = ('<div class="pt"><h1>Decks</h1></div><div class="zero"><h2>No decks yet</h2>'
              '<p>Pick a commander and we’ll assemble the 99 from cards you already own, then track what’s missing.</p>'
              '<div class="acts"><a class="pbtn" href="#">Browse commanders</a><a class="sbtn" href="#">Import a deck</a></div></div>')

FIRST_RUN = ('<div class="fr1"><div style="display:flex;flex-direction:column;gap:4px"><span class="k" style="color:var(--fg-muted)">Step 1 of 3</span>'
             '<h1 style="margin:0;font:700 24px/1.2 var(--disp)">Welcome to The 99</h1></div>'
             '<div class="stp"><h3>Add your collection</h3><p>Drop a CSV export from Moxfield, Archidekt, Deckbox or ManaBox.</p>'
             '<div class="acts"><a class="pbtn" href="#">Upload a CSV</a><a class="sbtn" href="#">Paste a list</a></div></div>'
             '<div class="lrow"><b>Pick a commander or import a deck</b><span>Opens once your cards are in</span></div>'
             '<div class="lrow"><b>Build the 99</b><span>Opens once you pick a commander</span></div></div>')


def phone_in(content, active, end=False, locked=False, header=True, reserve=True, theme="kamigawa", note_html=None):
    th = 88 if locked else 74
    n = notice() if note_html is None else note_html
    res = (f'<div class="res" style="height:{th}px"><span>pb {th} · --tabbar-h{" (locked)" if locked else ""}</span></div>'
           if reserve else "")
    return (f'<div class="ph" data-theme="{theme}">' + (mheader() if header else "") +
            f'<div class="col{" end" if end else ""}"><div class="main">{content}</div>{n}{res}</div>'
            + tabbar(active, locked) + '</div>')


def desk_in(content, active, end=False, theme="kamigawa", locked=False):
    return (f'<div class="dk" data-theme="{theme}">' + rail(active, locked) +
            f'<div class="dcol{" end" if end else ""}"><div class="main">{content}</div>{notice("wide")}</div></div>')


def signed_in():
    long_tiles = tiles(ALL[:12])
    s1 = fr("S1 · Short page · 390 · Decks, none yet", phone_in(DECKS_ZERO, "Decks"),
            "<b>The notice sits at the foot of the viewport</b>, just above the tab bar, because it is the last thing in the "
            "page column and the page claims the space above it (<code>flex: 1</code>). Nothing scrolls. Under the tab bar is the "
            "column's shipped reserve, <code>--tabbar-h</code>: the bar sits over the reserve, never over the notice.", 390)
    s2 = fr("S2 · Long page · 390 · Collection, scrolled to the end", phone_in(long_tiles, "Collection", end=True, header=False),
            "<b>A long page carries it after its last row</b>, 20px below the hairline. The header has slid away on the way down "
            "(quick return, as shipped). Read at the end of the scroll, 24px clear of the tab bar's top edge.", 390)
    s3 = fr("S3 · Locked collection · 390 · Home, first run, 88px bar", phone_in(FIRST_RUN, "Home", locked=True),
            "<b>The locked bar is 88px and the notice clears it with no extra work</b>: it sits inside the shell's wrapper, "
            "where <code>--tabbar-h</code> already resolves to 88px, so the same reserve grows with the bar.", 390)
    # rejected: root mount
    rej_body = (long_tiles[:-6] if False else long_tiles)
    rj = ('<div class="ph" data-theme="kamigawa"><div class="col end"><div class="main">' + tiles(ALL[6:12]) + '</div>'
          '<div class="gap74"><span>the column’s reserve, 74px, now empty</span></div>'
          + notice(outline=False) + '<div class="res" style="height:74px"><span>pb 74 again, on the notice</span></div></div>'
          + tabbar("Collection") + '</div>')
    rjs = ('<div class="ph" data-theme="kamigawa">' + mheader() + '<div class="col"><div class="main">' + DECKS_ZERO +
           '</div><div class="fold" style="bottom:74px"><span>the notice starts a tab-bar height below this line, under the bar</span></div></div>'
           + tabbar("Decks") + '</div>')
    r1 = fr('<span class="rej">Rejected</span>&nbsp; R1 · The root mount · short page', rjs,
            "With the brief's default (one mount in <code>layout.tsx</code>, after <code>&lt;Shell&gt;</code>), the shell's column "
            "is already a full viewport tall plus its reserve, so every short page in the app gains a scroll whose only reward is "
            "the notice.", 390)
    r2 = fr('<span class="rej">Rejected</span>&nbsp; R2 · The root mount · scrolled to the end', rj,
            "And at the end of that scroll the column's 74px reserve sits empty <b>above</b> the notice, which then needs its own "
            "74px (88 while locked, which a sibling of the wrapper can't read). Two reserves, one of them a dead band.", 390)

    d1 = fr("S4 · Short page · desktop · Decks, none yet", desk_in(DECKS_ZERO, "Decks"),
            "<b>Desktop: in the column beside the rail, not under it.</b> The hairline spans the column; the text starts at the "
            "34px gutter the full-bleed pages use (Collection's head, the friend page) and is held to a 720px measure at 12px, two "
            "lines a passage. At the foot of the window on a short page, as on the phone.", 1300)
    d2 = fr("S5 · Long page · desktop · Collection, scrolled to the end",
            desk_in(tiles(ALL[:12]), "Collection", end=True),
            "After the last row, in the same column. The rail is <code>sticky</code> and stays; it never runs under the notice. "
            "A capped page (Credits, 1040px centered) still gets the column-wide treatment: one place, one alignment.", 1300)

    body = f"""
<div class="bh"><span class="k">Fan Content notice · R1 · board 2 of 5</span><h2>Signed in · where the notice sits</h2>
<p>Drawn in Neon Rain over the shipped shell. The dashed pink outline marks the notice, the one new thing on every frame. Phone frames are 390×844. Under each tab bar is the reserve the shell already keeps for it (<code>ShellMain</code>'s bottom padding today, its column's after G1), so the notice always ends above the bar's top edge.</p></div>
<div class="sec"><h3>Phone · short, long and locked</h3><div class="frames">{s1}{s2}{s3}</div></div>
<div class="sec"><h3>Phone · the root mount, for comparison</h3><p class="lead">Open 1 asked which. These two frames are why the call is the foot of the viewport, from a mount inside the column.</p><div class="frames">{r1}{r2}</div></div>
<div class="sec"><h3>Desktop · short and long</h3><div class="frames" style="flex-direction:column;gap:56px">{d1}{d2}</div></div>
"""
    return page("Fan Content notice · signed in", body, 1500)


# ---------------------------------------------------------------- Signed out (Low Sun: the default a signed-out reader gets)
def phone_out(pg_html, wash="wash1", theme="amonkhet"):
    return (f'<div class="ph {wash}" data-theme="{theme}"><div class="so"><div class="pg">{pg_html}</div>'
            f'{notice("c out")}</div></div>')


def desk_out(pg_html, wash="washd", theme="amonkhet"):
    return (f'<div class="dk {wash}" data-theme="{theme}"><div class="so" style="flex:1"><div class="pg">{pg_html}</div>'
            f'{notice("wide c")}</div></div>')


def hero(dk=False):
    return (f'<section class="hero">{crown(105 if dk else 74)}<span class="nn">99</span><span class="ttl">The Ninety-Nine</span>'
            f'<span class="tag">99 problems, but your commander ain’t one.</span><a class="pbtn" href="#">Sign in</a>'
            f'<span class="fine">Invite-only · access by request{" · a Commander companion" if dk else ""}</span></section>')


def back(kick, scale):
    return (f'<div class="cb" style="transform:scale({scale})"><div class="in"><span class="dd">◆ ◆ ◆</span>'
            f'<span class="n9">99</span><span class="kk">{kick}</span></div></div>')


def fan(dk=False):
    s = 1 if dk else .48
    return (f'<div class="fan" aria-hidden="true"><div style="position:absolute;inset:0;transform:rotate(-9deg);opacity:.55">{back("", s)}</div>'
            f'<div style="position:absolute;inset:0;transform:rotate(8deg);opacity:.75">{back("", s)}</div>'
            f'<div style="position:absolute;inset:0">{back("By invitation", s)}</div></div>')


def signup(dk=False):
    col = ('<div class="ncc">' + ('<span class="kick">The Ninety-Nine</span>' if dk else "") +
           '<h1>The 99 is invite-only</h1><p>You join when someone already playing invites you. Ask a friend who plays: '
           'they’ll find <b>Invite someone new</b> under Add a friend.</p><a class="pbtn" href="#">Sign in</a>'
           '<span class="fine">Have an invitation email? Open its link to make your account.</span></div>')
    return f'<main class="nc su">{fan(dk)}{col}</main>'


def join():
    card = (f'<div style="position:relative;width:150px;height:210px;flex:none;transform:rotate(-3deg)">'
            f'<div class="cardf" style="transform:scale(.5)"><div class="ins"><div class="nb">Colin</div>'
            f'<div class="aw"><img src="{GHALTA_ART}" alt=""></div><div class="tb">Invitation <i>◆</i></div>'
            f'<div class="rb">Join The 99 as Colin’s friend. Your decks and your collection stay yours.</div>'
            f'<div class="cr">Colin · Ghalta</div></div></div></div>')
    col = ('<div class="ncc" style="margin-top:28px"><h1 style="font-size:22px;line-height:1.25;margin:0">Colin invited you to The 99</h1>'
           '<p style="font-size:14px;line-height:1.55">Type your own email. We’ll send it a code to check it’s yours, then you’ll make your account.</p>'
           '<div class="form"><label for="em">Your email</label><span class="in" id="em">name@example.com</span><a class="pbtn" href="#">Send code</a></div>'
           '<span class="fine" style="margin-top:14px">Colin won’t see your email. This invite works once, and only for the next 15 minutes.</span></div>')
    return f'<main class="nc join">{card}{col}</main>'


def friend(dk=False):
    s = 1 if dk else .74
    box = 'width:300px;height:419px' if dk else 'width:222px;height:310px'
    card = f'<div style="position:relative;{box};flex:none">{back("Friend request", s)}</div>'
    col = ('<div class="lc">' + ('<span class="k" style="color:var(--accent)">The Ninety-Nine</span>' if dk else "") +
           '<h1>Someone sent you a friend request</h1><p>Sign in to turn the card over and see who it’s from.</p>'
           '<a class="pbtn" href="#">Sign in</a><span class="fine">No account? The 99 is invite-only. Ask whoever sent this to invite you.</span></div>')
    return f'<main class="fl">{card}{col}</main>'


def offline():
    return ('<main class="off"><span class="ey">No signal</span><h1>Your decks need a connection.</h1>'
            '<p>Nothing’s saved on this device, so it’ll all be here when you’re back.</p><a class="pbtn" href="#">Try again</a></main>')


def signed_out():
    rows = [
        ("O1 · Landing <code>/</code>", phone_out(hero()), desk_out(hero(True)),
         "Centered, as shipped. The hero now centers in the space above the notice instead of the whole screen, so it rises "
         "by half the notice's height (about 80px at 390). The notice is the only thing under it."),
        ("O2 · <code>/sign-up</code>", phone_out(signup(), "wash18"), desk_out(signup(True)),
         "Top-aligned on the phone, as shipped, so the notice simply waits at the foot: about 120px of the page's own "
         "space remains between the fine print and the hairline at 844. Desktop's fan-and-column row centers above it."),
        ("O3 · <code>/join/[token]</code>, valid invite", phone_out(join(), "wash18"), desk_out(join(), "wash18"),
         "The tallest signed-out page. At 390×844 it still fits above the notice with about 30px to spare; on a shorter phone "
         "the page scrolls and the notice follows the fine print, never overlapping the form."),
        ("O4 · <code>/friend/[token]</code>, signed out", phone_out(friend()), desk_out(friend(True)),
         "Centered at every width, as shipped. The card and column center above the notice."),
        ("O5 · <code>/offline</code>", phone_out(offline(), "wash1"), desk_out(offline(), "wash1"),
         "Served by the service worker with no credentials, so it is always the bare branch's render: it carries the notice "
         "with no special case. Its 560px column centers above it."),
    ]
    secs = []
    for lab, ph, dk, cap in rows:
        secs.append(f'<div class="sec"><h3>{lab}</h3><div class="frames">'
                    f'<div class="fr" style="width:390px"><span class="k">390</span>{ph}</div>'
                    f'<div class="fr" style="width:1300px"><span class="k">desktop</span>{dk}<p class="cap">{cap}</p></div></div></div>')
    # signed-out pages have no shell, so the --bg wash is per page; no rail, no tab bar.
    body = f"""
<div class="bh"><span class="k">Fan Content notice · R1 · board 3 of 5</span><h2>Signed out · one treatment, centered on the page's axis</h2>
<p>Drawn in <b>Low Sun</b>, the theme a signed-out reader gets without a cookie. Every signed-out page centers its own text, so the notice does too: same component, same type, centered, the hairline across the window. It is the last thing on the page and sits at the foot of the viewport, because each page takes <code>flex: 1</code> in place of <code>min-h-screen</code> (gap G2). Nothing else on these pages moves except what centering in a shorter box implies. The notice clears the home indicator with <code>24px + env(safe-area-inset-bottom)</code>.</p></div>
{''.join(secs)}
"""
    return page("Fan Content notice · signed out", body, 1860, theme="amonkhet")


# ---------------------------------------------------------------- /privacy, /terms
SECTIONS = {
    "privacy": ("Privacy", ["What we keep", "Receipts and payments", "The AI vendor", "Admin access to personal data",
                            "Deleting your account", "18 or older"]),
    "terms": ("Terms", ["Using The 99", "Credits, receipts and refunds", "18 or older", "Fan Content and Wizards’ property",
                        "Ending your account", "Changes to these terms"]),
}
WID = [100, 96, 98, 92, 99, 64, 0, 97, 100, 94, 88, 71]


def bars(n, seed=0, maxw=None):
    out = []
    for i in range(n):
        w = [100, 97, 99, 94, 98, 91, 100, 96][(i + seed) % 8]
        if i == n - 1:
            w = [58, 72, 41, 66][seed % 4]
        out.append(f'<i style="--w:{w}%"></i>')
    return '<div class="bars" aria-hidden="true">' + "".join(out) + '</div>'


def legal_body(kind, dk):
    title, secs = SECTIONS[kind]
    toc = "".join(f'<a href="#s{i}"><i>{i + 1:02d}</i>[{s}]</a>' for i, s in enumerate(secs))
    head = (f'<span class="ey">Last updated October 17, 2026</span><h1>{title}</h1>'
            f'<div class="intro">{bars(4, 1)}</div>')
    if not dk:
        head += f'<nav class="toc" aria-label="On this page"><span class="th k" style="color:var(--fg-muted)">On this page</span>{toc}</nav>'
    body = ""
    for i, s in enumerate(secs):
        n1 = [5, 7, 4, 6, 5, 3][i]
        extra = bars([3, 0, 4, 0, 2, 0][i], i + 2) if [3, 0, 4, 0, 2, 0][i] else ""
        body += f'<section class="ls" id="s{i}"><h2>[{s}]</h2>{bars(n1, i)}{extra}</section>'
    lp = f'<article class="lp">{head}{body}</article>'
    if dk:
        dtoc = "".join(f'<a href="#s{i}" class="{"on" if i == 0 else ""}"><span class="dm">{DIAMOND}</span>[{s}]</a>'
                       for i, s in enumerate(secs))
        return f'<div class="lwrap">{lp}<nav class="dtoc" aria-label="On this page"><span class="k" style="color:var(--fg-muted)">On this page</span>{dtoc}</nav></div>'
    return lp


def legal_header():
    return ('<header class="lh"><a class="wm" href="#"><span class="the">THE</span><span class="mk">' + crown(30) +
            '<span class="nn">99</span></span></a><a class="sbtn" href="#">Sign in</a></header>')


def legal():
    def ph_in(kind, active=None):
        return ('<div class="ph auto" data-theme="kamigawa">' + mheader() +
                f'<div class="col"><div class="main">{legal_body(kind, False)}</div>{notice()}'
                f'<div class="res" style="height:74px"><span>pb 74 · --tabbar-h</span></div></div>' + tabbar(None) + '</div>')

    def ph_out(kind):
        return (f'<div class="ph auto" data-theme="amonkhet"><div class="so">{legal_header()}<div class="pg">{legal_body(kind, False)}</div>'
                f'{notice("c out")}</div></div>')

    def dk_in(kind):
        return ('<div class="dk auto" data-theme="kamigawa">' + rail(None) +
                f'<div class="dcol"><div class="main">{legal_body(kind, True)}</div>{notice("wide")}</div></div>')

    def dk_out(kind):
        return (f'<div class="dk auto" data-theme="amonkhet"><div class="so" style="flex:1">{legal_header()}'
                f'<div class="pg">{legal_body(kind, True)}</div>{notice("wide c")}</div></div>')

    sec = []
    for kind, title in (("privacy", "Privacy"), ("terms", "Terms")):
        sec.append(f"""<div class="sec"><h3><code style="font:600 18px 'IBM Plex Mono',monospace;color:#E6E8F0">/{kind}</code> · full length</h3><div class="frames">
<div class="fr" style="width:390px"><span class="k">L{1 if kind == 'privacy' else 5} · signed out · 390</span>{ph_out(kind)}</div>
<div class="fr" style="width:390px"><span class="k">L{2 if kind == 'privacy' else 6} · signed in · 390</span>{ph_in(kind)}</div>
</div><div class="frames" style="flex-direction:column;gap:48px">
<div class="fr" style="width:1300px"><span class="k">L{3 if kind == 'privacy' else 7} · signed out · desktop</span>{dk_out(kind)}</div>
<div class="fr" style="width:1300px"><span class="k">L{4 if kind == 'privacy' else 8} · signed in · desktop</span>{dk_in(kind)}</div>
</div></div>""")
    spec = """<div class="note" style="max-width:1300px"><b>The container (one component, <code>LegalPage</code>, for both pages, both states)</b>
<ul>
<li><b>Measure.</b> The article is held to 680px on desktop (about 75 characters at 15px) and runs the 356px phone measure. Body 15px / 1.65, <code>--fg-body</code>; section headings 18px Plex Sans 600, <code>--fg</code>. Prose is <code>/prose-pass</code>'s; the grey bars are line length, not words.</li>
<li><b>Top.</b> <code>Last updated</code> as a mono line in <code>--fg-muted</code> (not <code>--fg-faint</code>, for the same AA reason as the notice), then the title in the theme's display face, 28px phone and 36px desktop, then the opening paragraph.</li>
<li><b>Jumping to a section.</b> Phone: an <code>On this page</code> list under the opening paragraph, one 44px row per section, numbered. Desktop: the same list as a 220px column to the right of the article, <code>position: sticky</code> (never fixed), the section in view marked with the brand diamond in accent. Sections take <code>scroll-margin-top</code> so a jump on the phone clears the header when it returns.</li>
<li><b>Way back.</b> Signed in, the shell is the way back: rail or tab bar, no tab lit, nothing added. Signed out, a 64px header (68 desktop) carries the wordmark, which goes to <code>/</code>, and a quiet <code>Sign in</code> (the shipped secondary button), since a legal page isn't where the primary press belongs.</li>
<li><b>The notice</b> follows the article like every other page. <code>/terms</code> also states the Fan Content passage in its own words in a section (B1's prose); the footer is not repeated inside the article.</li>
</ul></div>"""
    body = f"""
<div class="bh"><span class="k">Fan Content notice · R1 · board 4 of 5</span><h2>/privacy and /terms · one prose page</h2>
<p>Signed in in Neon Rain over the shell; signed out in Low Sun. Section names are B1's list in brackets, placeholders for <code>/prose-pass</code>. The pages carry the notice the same way every page does.</p></div>
{spec}
{''.join(sec)}
"""
    return page("Fan Content notice · privacy and terms", body, 1520)


# ---------------------------------------------------------------- Themes
def themes():
    tiles_ = []
    rows = []
    for key, nm, plane, _ in THEMES:
        t = T[key]
        m = ratio(t["fg-muted"], t["bg"])
        f = ratio(t["fg-faint"], t["bg"])
        fg = ratio(t["fg"], t["bg"])
        fok = f >= 4.5
        tiles_.append(f"""<div class="fr" style="width:390px"><span class="k">{nm} · {plane}</span>
<div data-theme="{key}" style="width:390px;border:1px solid #262A35;border-radius:14px;overflow:hidden;background:var(--bg);padding-top:28px">{notice(outline=False)}</div>
<p class="cap"><code>--fg-muted</code> on <code>--bg</code> <b class="ok">{m:.2f}:1 ✓ AA</b> · hover <code>--fg</code> {fg:.2f}:1 · <code>--fg-faint</code> <span class="{'ok' if fok else 'no'}">{f:.2f}:1{'' if fok else ' ✗'}</span></p></div>""")
        rows.append(f"<tr><td><b>{nm}</b> <span style='color:#959AAD'>({key})</span></td><td><code>{t['bg']}</code></td>"
                    f"<td><code>{t['fg-muted']}</code> <b class='ok'>{m:.2f}:1</b></td>"
                    f"<td><code>{t['fg-faint']}</code> <span class='{'ok' if fok else 'no'}'>{f:.2f}:1</span></td>"
                    f"<td>{fg:.2f}:1</td></tr>")
    desk = "".join(f"""<div class="fr" style="width:1300px"><span class="k">{nm} · desktop, 720px measure</span>
<div data-theme="{key}" style="width:1300px;border:1px solid #262A35;border-radius:12px;overflow:hidden;background:var(--bg);padding-top:24px">{notice('wide', outline=False)}</div></div>"""
                   for key, nm, _, _ in THEMES)
    states = ""
    for key in ("kamigawa", "amonkhet"):
        for lab, lc in (("Rest", ""), ("Hover · active", "hov"), ("Focus-visible", "foc"), ("Visited = rest", "")):
            states += f"""<div class="fr" style="width:390px"><span class="k">{NAME[key]} · {lab}</span>
<div data-theme="{key}" style="width:390px;border:1px solid #262A35;border-radius:14px;overflow:hidden;background:var(--bg);padding-top:20px;zoom:1">{notice(link_cls=lc, outline=False)}</div></div>"""
    zoom = f"""<div class="fr" style="width:780px"><span class="k">Neon Rain · the link at 2× its desktop size · rest, hover, focus</span>
<div data-theme="kamigawa" style="width:780px;border:1px solid #262A35;border-radius:14px;background:var(--bg);padding:24px 28px;display:flex;flex-direction:column;gap:18px">
<div class="fcn" style="border:0;padding:0;font-size:24px;line-height:36px"><p>…under the <a href="{FCP_URL}" style="text-decoration-thickness:2px;text-underline-offset:4px">Fan Content Policy<span class="ext" aria-hidden="true" style="font-size:20px">↗</span></a>. Not approved…</p></div>
<div class="fcn" style="border:0;padding:0;font-size:24px;line-height:36px"><p>…under the <a class="hov" href="{FCP_URL}" style="text-decoration-thickness:2px;text-underline-offset:4px">Fan Content Policy<span class="ext" aria-hidden="true" style="font-size:20px">↗</span></a>. Not approved…</p></div>
<div class="fcn" style="border:0;padding:0;font-size:24px;line-height:36px"><p>…under the <a class="foc" href="{FCP_URL}" style="text-decoration-thickness:2px;text-underline-offset:4px;outline-width:4px;outline-offset:4px">Fan Content Policy<span class="ext" aria-hidden="true" style="font-size:20px">↗</span></a>. Not approved…</p></div>
</div></div>"""
    body = f"""
<div class="bh"><span class="k">Fan Content notice · R1 · board 5 of 5</span><h2>The notice alone · six themes, measured</h2>
<p>Each theme's shipped tokens from <code>globals.css</code>, the notice on <code>--bg</code> at the 356px phone measure. Ratios are WCAG 2 relative luminance, computed from the theme blocks; the unit test in A1 measures the same token the same way (<code>placeholder-contrast.test.ts</code>'s method). <b><code>--fg-muted</code> clears 4.5:1 in all six, lowest 6.61:1 in Witching Hour.</b> <code>--fg-faint</code> fails in Neon Rain and Oil Haze, as the brief said, and is not used.</p></div>
<div class="sec"><h3>390 · the notice in each theme</h3><div class="frames" style="gap:40px">{''.join(tiles_)}</div></div>
<div class="sec"><h3>Measured</h3><div class="note" style="max-width:1100px;padding:6px 8px"><table class="t"><thead><tr><th>Theme</th><th><code>--bg</code></th><th><code>--fg-muted</code> (the notice)</th><th><code>--fg-faint</code> (rejected)</th><th><code>--fg</code> (hover)</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div></div>
<div class="sec"><h3>The link · four states</h3><p class="lead">Quiet by default: the words keep the notice's own ink and size, and an underline (1px, <code>--fg-faint</code> as the line's color, 2px offset) plus a small <code>↗</code> say it's a link that leaves. Hover and active lift it to <code>--fg</code>. Focus is the shipped link-out ring, 2px <code>--accent</code> at 2px offset. Visited looks like rest. The underline's color carries no meaning on its own; the text's contrast is the text's.</p><div class="frames" style="gap:40px">{states}</div><div class="frames">{zoom}</div></div>
<div class="sec"><h3>Desktop · each theme at the 720px measure</h3><div class="frames" style="gap:36px">{desk}</div></div>
"""
    return page("Fan Content notice · themes", body, 2660)


# ---------------------------------------------------------------- Main
def main():
    ex_in = (f'<div data-theme="kamigawa" style="width:390px;border:1px solid #262A35;border-radius:14px;overflow:hidden;background:var(--bg);padding-top:24px">{notice(outline=False)}</div>')
    q1 = (f'<div data-theme="kamigawa" style="width:390px;border:1px solid #262A35;border-radius:14px;overflow:hidden;background:var(--bg);padding-top:24px">'
          f'<footer class="fcn"><p style="display:flex;gap:14px"><a href="#">Privacy</a><a href="#">Terms</a></p><p>{P1A}<a href="{FCP_URL}">Fan Content <span style="white-space:nowrap">Policy<span class="ext" aria-hidden="true">↗</span></span></a>{P1B}</p><p>{P2}</p></footer></div>')
    body = f"""
<div class="bh"><span class="k">Fan Content notice · R1 · 2026-10-17 · board 1 of 5</span><h2>The Fan Content notice, and the /privacy and /terms page</h2>
<p>Source of truth: <code>docs/superpowers/design-briefs/2026-10-17-fan-content-notice.md</code> on main (#2030). Every Locked item is Hugh's (L1, L3, L4) and is honoured as written; the Decided link is drawn. This board makes the five Open calls. The notice's words are set, never reworded: they are the brief's, verbatim, on every frame.</p></div>

<div class="sec"><h3>The five calls</h3>
<div style="display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:40px;align-items:start">
<div style="display:flex;flex-direction:column;gap:16px">
<div class="note"><span class="pin">1</span> <b>Placement: the foot of the viewport on a short page, the end of the page on a long one.</b> Never <code>position: fixed</code>. The notice is the last child of the page column and the page above it takes <code>flex: 1</code>, so a short page pushes it down to the bottom edge and a long one carries it after its content.
<ul><li><b>Not the root mount.</b> The shell's column is already a viewport tall plus the tab-bar reserve, so a footer after <code>&lt;Shell&gt;</code> makes every short page scroll for the notice alone, and at the end of that scroll the column's 74px reserve sits empty above it (Signed in, R1 and R2).</li>
<li><b>Two mounts of one component, both in <code>shell.tsx</code>:</b> after <code>ShellMain</code> inside the signed-in column, and after <code>children</code> in the bare branch. Every signed-out route, <code>/offline</code> included, renders through the bare branch, so there is no per-page mount.</li>
<li><b>It clears the tab bar and sheets with the column's own reserve.</b> Inside the wrapper, <code>--tabbar-h</code> already resolves to 88px while locked, so the locked bar costs nothing extra (S3).</li>
<li><b>Desktop:</b> in the column beside the rail, never under it. The hairline spans the column; the text starts at the 34px gutter and is held to 720px.</li></ul></div>
<div class="note"><span class="pin">2</span> <b>Type: IBM Plex Sans 11px / 16px on the phone, 12px / 18px from <code>md</code>; weight 400, no tracking, in <code>--fg-muted</code>.</b> 6.61:1 at its lowest (Witching Hour), 7.35:1 at its highest (Canopy). The two passages are two paragraphs 6px apart. Measured in Plex Sans at 390 (356px inside the gutters): <b>3 + 3 = 6 lines</b>, 4 + 4 on a 360 phone; desktop 2 + 2 at a 720px measure. 12px on the phone was measured too: 4 + 4 = 8 lines, the wall the brief warned of. Running the passages together saves no line at 390 and blurs two separate statements. <code>--fg-faint</code> is out: 4.12:1 Neon Rain, 4.29:1 Oil Haze. Hairline <code>--border</code>, 20px above the text, 24px below.</div>
<div class="note"><span class="pin">3</span> <b>The link keeps the notice's ink and adds an underline and a small ↗.</b> Underline 1px in <code>--fg-faint</code> at 2px offset; hover and active <code>--fg</code>; focus the shipped link-out ring (2px <code>--accent</code>, 2px offset); visited as rest. <code>--accent</code> as the ink was rejected: louder than a legal line should be, and 4.51:1 in Oil Haze. The ↗ is <code>aria-hidden</code>; the new tab is said in the link's accessible name, the app's existing <code>newTab</code> pattern (a string for <code>/copy-review</code>, G6).</div>
<div class="note"><span class="pin">4</span> <b>Signed out: one treatment for all five, centered on the page's axis.</b> Every signed-out page centers its own text, so the notice does too; same size, same token, same hairline. Each page swaps <code>min-h-screen</code> for <code>flex-1</code> (G2) and keeps its own composition: <code>/</code>, <code>/friend</code> and <code>/offline</code> center in the space above the notice; <code>/sign-up</code> and <code>/join</code> stay top-aligned on the phone. No per-shell margin tuning.</div>
<div class="note"><span class="pin">5</span> <b><code>/privacy</code> and <code>/terms</code>: one prose page, <code>LegalPage</code>.</b> A 680px article (356px phone measure), a mono <code>Last updated</code> line, the title in the theme's display face, an <code>On this page</code> list (rows on the phone, a sticky 220px column on desktop), 18px section headings. Signed in, inside the shell with no tab lit. Signed out, a slim header with the wordmark to <code>/</code> and a quiet <code>Sign in</code>. The notice below, as everywhere (board 4).</div>
</div>
<div style="display:flex;flex-direction:column;gap:12px"><span class="k">The notice as set · Neon Rain · 390</span>{ex_in}
<p class="cap">Words: the brief's §Locked 1, unchanged. One <code>&lt;footer&gt;</code> (a <code>contentinfo</code> landmark, because it sits beside <code>&lt;main&gt;</code> rather than inside it), two <code>&lt;p&gt;</code>, one <code>&lt;a&gt;</code>. No image, no mana or guild symbol, nothing to dismiss.</p></div>
</div></div>

<div class="sec"><h3>Locked and decided, where each is honoured</h3>
<div class="note" style="padding:6px 8px"><table class="t"><thead><tr><th style="width:280px">Item</th><th>On the boards</th></tr></thead><tbody>
<tr><td><b>L1 · The text is fixed</b></td><td>Set verbatim on every frame, broken only at the passage break. Nothing reworded; new strings (the link's accessible name, the legal page's labels) are placeholders in <code>fan-content-notice · copy strings.ts</code> for <code>/copy-review</code>.</td></tr>
<tr><td><b>L2 · Every page, signed in or out</b></td><td>Signed in (board 2), the five signed-out surfaces (board 3), <code>/privacy</code> and <code>/terms</code> (board 4). About is A2's.</td></tr>
<tr><td><b>L3 · Subtle; not a banner, bar, modal or toast; nothing to dismiss</b></td><td>11px (12px from <code>md</code>) muted text under a hairline, in the flow of the page, no ✕, never fixed.</td></tr>
<tr><td><b>L4 · Reads as text, AA</b></td><td>Real <code>&lt;p&gt;</code> text; <code>--fg-muted</code> measured at 6.61 to 7.35:1 (board 5).</td></tr>
<tr><td><b>L5 · No Wizards contact, no per-crop credit</b></td><td>None drawn. The single link is the policy page.</td></tr>
<tr><td><b>L6 · No mana or guild symbols</b></td><td>None in the notice. The wordmark's diamonds on the legal header are the brand's own, not mana symbols.</td></tr>
<tr><td><b>Decided · "Fan Content Policy" links out</b></td><td>The only link in the notice, new tab, <code>rel="noopener noreferrer"</code>, drawn in four states (board 5).</td></tr>
</tbody></table></div></div>

<div class="sec"><h3>Gaps for A1</h3>
<div class="note" style="padding:6px 8px"><table class="t"><thead><tr><th style="width:60px">#</th><th>Gap</th><th style="width:90px">Who</th></tr></thead><tbody>
<tr><td><b>G1</b></td><td><b>Move the tab-bar reserve up one level.</b> <code>ShellMain</code>'s <code>pb-[calc(var(--tabbar-h)+var(--about-sheet-h,0px))] md:pb-0</code> moves to its parent column (<code>flex min-w-0 flex-1 flex-col</code>), and <code>&lt;FanContentNotice /&gt;</code> renders after <code>ShellMain</code> inside that column. <code>ShellMain</code> keeps <code>flex-1</code>, so the notice lands at the foot on a short page. Check nothing reads <code>main</code>'s padding (the pending overlay renders beside the shell).</td><td>Eng</td></tr>
<tr><td><b>G2</b></td><td><b>The bare branch and its pages.</b> <code>Shell</code>'s signed-out return becomes <code>&lt;div className="flex flex-1 flex-col"&gt;{{children}}&lt;FanContentNotice align="center" /&gt;&lt;/div&gt;</code>, and <code>min-h-screen</code> becomes <code>flex-1</code> on the landing's section, <code>NEWCOMER_MAIN</code> / <code>INVITE_MAIN</code>, the friend page's main and <code>/offline</code>'s main. The root layout gets no mount. A1's every-branch test asserts both mounts.</td><td>Eng</td></tr>
<tr><td><b>G3</b></td><td><b>Contrast test:</b> the component reads <code>--fg-muted</code> only; a unit test measures it against <code>--bg</code> in all six theme blocks at ≥ 4.5:1, as <code>placeholder-contrast.test.ts</code> does.</td><td>Eng</td></tr>
<tr><td><b>G4</b></td><td><b>Safe area.</b> The bare branch's notice pads its foot <code>24px + env(safe-area-inset-bottom)</code>; inside the shell the column's reserve already covers it (the tab bar's own 14px is fixed, as shipped).</td><td>Eng</td></tr>
<tr><td><b>G5</b></td><td><b>The legal routes.</b> <code>/privacy</code> and <code>/terms</code> public in <code>src/proxy.ts</code>; rendered in the shell when signed in, bare with the legal header when signed out; one <code>LegalPage</code> with a sections prop for the list and anchors.</td><td>Eng</td></tr>
<tr><td><b>G6</b></td><td><b>Copy.</b> The link's accessible name (<code>Fan Content Policy, opens in a new tab</code>), <code>Last updated</code>, <code>On this page</code>, the page titles: placeholders in the copy strings file. The notice's own words are Hugh's and go nowhere.</td><td>Copy</td></tr>
</tbody></table></div></div>

<div class="sec"><h3>For Hugh</h3>
<div style="display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:40px;align-items:start">
<div class="note"><span class="pin">Q1</span> <b>How does a reader reach <code>/privacy</code> and <code>/terms</code>?</b> The brief makes the policy the notice's only link, so nothing on these boards links to the two pages. If they should be reachable from every page, the quiet place is a <code>Privacy · Terms</code> line at the top of the same footer, drawn here in the notice's ink (right). It would need the brief's "nothing else in the notice is a link" amended, so it's not drawn anywhere else. The other route is a link from the pages that need one (<code>/sign-up</code>, the About page), which A2 and B1 own.<br><br><span class="pin">Q2</span> <b>About entry:</b> none drawn. A legal line isn't a feature; say if you want one.</div>
<div style="display:flex;flex-direction:column;gap:12px"><span class="k">Q1 · if yes · not part of the call</span>{q1}</div>
</div></div>

<div class="sec"><h3>Boards</h3>
<div class="note" style="padding:6px 8px"><table class="t"><tbody>
<tr><td style="width:300px"><b>Signed in</b></td><td>Short, long and locked at 390; the root mount as rejected; short and long on desktop.</td></tr>
<tr><td><b>Signed out</b></td><td><code>/</code>, <code>/sign-up</code>, <code>/join</code>, the signed-out friend card and <code>/offline</code>, each at 390 and desktop.</td></tr>
<tr><td><b>/privacy and /terms</b></td><td>The container spec, then each page full length, signed out and signed in, at 390 and desktop.</td></tr>
<tr><td><b>Themes</b></td><td>The notice alone in all six themes with measured contrast, the link's four states, and desktop at the 720px measure.</td></tr>
</tbody></table></div></div>
"""
    return page("Fan Content notice · calls", body, 1700)


BOARDS = [
    ("Main.dc.html", main, "R1 · the five calls, locked items, gaps"),
    ("Signed-In.dc.html", signed_in, "Signed in · short, long, locked; desktop"),
    ("Signed-Out.dc.html", signed_out, "Signed out · landing, sign-up, join, friend, offline"),
    ("Privacy-and-Terms.dc.html", legal, "/privacy and /terms · one prose page"),
    ("Themes.dc.html", themes, "The notice in six themes, measured"),
]

if __name__ == "__main__":
    for fn, f, _ in BOARDS:
        open(os.path.join(OUT, fn), "w").write(f())
    print("written", [b[0] for b in BOARDS])
