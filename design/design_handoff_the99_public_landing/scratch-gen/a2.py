"""Public landing addendum A2 (account 2, 2026-11-11): refinements from Hugh's walk of the preview.

1 See it work becomes a full-screen experience (phone, tablet, desktop) with the step header and Back/Next always on screen.
2 The demo trimmed by about half. 3 Analysis and Overview given room. 4 Marks are hover, coach never covers the key, no
the tab instruction. 5 Card details: Mana Pool link and a disabled Find a deck. 6 Written for real: Mutant Menace with its commander,
opening the full Overview. 7 Feature squares bottom-aligned; Bring your collection at the signed-out width.
The player is the shipped fixture's: Wren (lib/demo/player.ts). Words an AI tool writes are stand-ins.
"""
import functools
import json
import os
import re
import kit
from kit import doc, frame, frames
import lp as L
import app as A
import a1

img = kit.img
board_head = functools.partial(kit.board_head, tag="A2")
T = "Public landing · addendum A2"
P = "Wren"
FREE = L.FREE
credit = L.credit

kit.FONTS = kit.FONTS.replace("&amp;display=swap", "&amp;family=Trirong:wght@600;700&amp;family=Syncopate:wght@700&amp;"
                              "family=Cormorant+Garamond:wght@600;700&amp;family=Metamorphous&amp;display=swap")

# ------------------------------------------------------------------ the six themes, read from globals.css
_TH = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "themes.json")))
TH_NAMES = [("amonkhet", "Low Sun"), ("kamigawa", "Neon Rain"), ("ixalan", "Canopy"), ("phyrexia", "Oil Haze"),
            ("eldraine", "Witching Hour"), ("kaldheim", "First Frost")]
TH_FONT = {"amonkhet": "'Cinzel',serif", "kamigawa": "'Chakra Petch',sans-serif", "ixalan": "'Trirong',serif",
           "phyrexia": "'Syncopate',sans-serif", "eldraine": "'Cormorant Garamond',serif", "kaldheim": "'Metamorphous',serif"}
theme_css = ""
for k, _ in TH_NAMES:
    v = _TH[k]
    decl = ";".join(f"{n}:{v[n]}" for n in v if n != "--font-display-face")
    theme_css += f".th-{k}{{{decl}}}\n.th-{k} .disp,.th-{k} .dhead b,.th-{k} .crow .nm,.th-{k} .hr b{{font-family:{TH_FONT[k]}!important;letter-spacing:0}}\n"

kit.CSS += theme_css + r"""
/* ======== A2: the full-screen demo ======== */
.fs{flex:none;position:relative;display:flex;flex-direction:column;overflow:hidden;background:var(--bg);color:var(--fg);border:1px solid var(--border-strong);font-family:'IBM Plex Sans',sans-serif}
.fs.p{width:390px;height:844px;border-radius:34px}
.fs.t{border-radius:18px}
.fs.d{border-radius:10px}
.fs.tall{height:auto}
.fbar{flex:none;display:flex;align-items:center;gap:12px;padding:8px 6px 8px 16px;min-height:60px;background:var(--surface-raised);border-bottom:1px solid var(--border-strong);position:relative;z-index:3}
.fs.p .fbar{padding-top:44px;min-height:96px}
.fs.d .fbar{padding:10px 14px 10px 28px}
.fbar .sn{font:500 10.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-muted);white-space:nowrap}
.fbar .bar{flex:1;display:flex;gap:4px}
.fbar .skip{font-size:13px;color:var(--fg-muted);white-space:nowrap;text-decoration:underline;text-decoration-color:var(--fg-faint);text-underline-offset:3px;min-height:44px;display:flex;align-items:center}
.fbar .x{width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);font-size:17px}
.fmid{flex:1 1 auto;min-height:0;position:relative;overflow:hidden;display:flex;flex-direction:column}
.fs.tall .fmid{overflow:visible}
.fscroll{display:flex;flex-direction:column}
.fwords{padding:18px 16px 16px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid var(--border)}
.fwords h3{margin:0;font:700 21px/1.25 'Cinzel',serif;color:var(--fg)}
.fwords p{font-size:14px;line-height:1.6;color:var(--fg-body)}
.fwords .tags{display:flex;gap:6px;flex-wrap:wrap}
.fapp{padding:16px;background:var(--bg);position:relative}
.fapp .lab{position:absolute;top:8px;right:12px;font:500 9px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.fnav{flex:none;display:flex;gap:10px;align-items:center;padding:12px 16px 30px;background:var(--surface-raised);border-top:1px solid var(--border-strong);position:relative;z-index:3}
.fnav .btn-l{flex:1}
.fs.t .fnav{padding:12px 24px 18px;justify-content:flex-end}
.fs.t .fnav .btn-l{flex:none;min-width:180px}
.fs.t .fnav .btn-q{min-width:110px}
/* tablet portrait: one column, centred */
.fs.t .fscroll{width:100%;max-width:680px;margin:0 auto}
.fs.t .fwords{padding:24px 0 18px}
.fs.t .fapp{padding:20px 0;background:transparent}
.fs.t .fmid{background:var(--bg)}
/* wide (1024 and up): words column left with Back/Next under it, the app scrolls right */
.fwide{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:320px minmax(0,1fr)}
.fs.d .fwide{grid-template-columns:360px minmax(0,1fr)}
.fcol{border-right:1px solid var(--border);padding:28px 26px 24px;display:flex;flex-direction:column;gap:12px;background:var(--surface-inset)}
.fcol h3{margin:0;font:700 23px/1.25 'Cinzel',serif}
.fcol p{font-size:14.5px;line-height:1.6;color:var(--fg-body)}
.fcol .tags{display:flex;gap:6px;flex-wrap:wrap}
.fcol .nav{display:flex;gap:10px;margin-top:8px}
.fcol .nav .btn-l{min-width:140px}
.fcol .pin{font:10px 'IBM Plex Mono';color:var(--fg-faint);margin-top:auto;border-top:1px solid var(--border);padding-top:10px}
.fpane{position:relative;overflow:hidden;background:var(--bg)}
.fpane .in{padding:26px 32px 32px;max-width:1080px;margin:0 auto;position:relative}
.fade{position:absolute;left:0;right:0;bottom:0;height:56px;background:linear-gradient(180deg,transparent,var(--bg));pointer-events:none;z-index:2}
.scr{position:absolute;right:8px;bottom:10px;z-index:4;font:600 9px 'IBM Plex Mono';letter-spacing:.06em;color:#0D0B09;background:#8FA6BE;border-radius:4px;padding:2px 6px;white-space:nowrap}
/* tool tabs (demo-tabs.tsx) */
.ttabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:2px}
.ttabs span{display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);font:500 13px 'IBM Plex Sans';color:var(--fg-body);white-space:nowrap}
.fs.p .ttabs span{min-height:44px}
.ttabs span.on{background:var(--accent);border-color:var(--accent);color:var(--bg)}
/* coach label beside its target */
.coach{position:absolute;z-index:6;white-space:nowrap;background:var(--accent);color:var(--bg);font:600 10.5px/18px 'IBM Plex Sans';border-radius:5px;padding:0 7px}
.ringx{position:absolute;z-index:5;border:2px solid var(--accent);border-radius:8px;box-shadow:0 0 0 5px color-mix(in oklab,var(--accent) 22%,transparent);pointer-events:none}
/* the shipped mark tooltip (fact-tooltip.tsx) */
.ftip{position:absolute;z-index:7;max-width:220px;border-radius:7px;padding:6px 9px;font-size:11.5px;line-height:1.45;background:var(--elevated);border:1px solid var(--border);color:var(--fg-body);box-shadow:0 4px 14px color-mix(in srgb,var(--bg) 70%,transparent);white-space:normal;width:max-content}
.cursor{position:absolute;z-index:8;width:14px;height:20px}
.r1{position:relative}
.mkw{position:relative;display:inline-flex}
.slice{display:flex;align-items:center;justify-content:space-between;gap:10px;font:11px 'IBM Plex Mono';color:var(--fg-muted);padding:6px 0 2px}
.slice u{font:500 13px 'IBM Plex Sans';color:var(--accent-text);text-underline-offset:3px;text-decoration-color:var(--accent-shadow)}
/* step 5 with room */
.ana{display:flex;flex-direction:column;gap:14px}
.ana .vd{grid-template-columns:repeat(4,minmax(0,1fr))}
.ana .stg3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.ana .stg3>div{border:1px solid var(--border);border-radius:10px;background:var(--surface-inset);padding:12px 14px;font-size:13.5px;line-height:1.6;color:var(--fg-body)}
.ana .stg3 em{display:block;font:500 10px 'IBM Plex Mono';font-style:normal;letter-spacing:.1em;text-transform:uppercase;color:var(--accent-text);margin-bottom:4px}
.ana .lead{font-size:14.5px;line-height:1.65;color:var(--fg-body);max-width:860px}
/* card details: the shipped dialog's halves, read-only */
.cscrim{position:absolute;inset:0;background:rgba(0,0,0,.6);z-index:20}
.cmod{position:absolute;z-index:21;left:50%;top:50%;transform:translate(-50%,-50%);width:900px;display:flex;background:var(--surface-raised);border:1px solid var(--border-strong);border-radius:16px;box-shadow:0 30px 70px rgba(0,0,0,.6);overflow:hidden}
.cmod .art{width:360px;flex:none;padding:30px;background:var(--surface-sunken);display:flex;align-items:center;justify-content:center}
.cmod .art img{width:100%;border-radius:4.75%;display:block;box-shadow:0 14px 30px rgba(0,0,0,.5)}
.cmod .csh{flex:1;min-width:0;display:flex;flex-direction:column}
.cmod .shb{padding:30px 60px 0 32px;display:flex;flex-direction:column}
.cmod .xx{position:absolute;right:10px;top:10px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);font-size:17px}
.cnm{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.cnm b{font:700 26px/1.2 'Cinzel',serif;color:var(--fg)}
.cnm .mc{display:inline-flex;gap:3px;margin-top:6px}
.cnm .mc i{width:17px;height:17px;border-radius:50%;display:block;font:600 10px/17px 'IBM Plex Mono';text-align:center;font-style:normal;color:#14110E}
.ctype{font-size:14px;color:var(--fg-muted);margin-top:6px}
.cprice{display:flex;align-items:center;gap:10px;margin-top:14px;font:12px 'IBM Plex Mono';color:var(--fg-muted)}
.cprice .pt{font:600 14px 'IBM Plex Mono';color:var(--fg);border:1px solid var(--border-strong);border-radius:6px;padding:2px 8px}
.corc{margin-top:18px;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:18px 20px;font-size:15px;line-height:1.65;color:var(--fg-body)}
.corc p+p{margin-top:8px}
.cmeta{display:flex;gap:28px;margin-top:18px}
.cmeta div{display:flex;flex-direction:column;gap:4px}
.cmeta small{font:10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.cmeta span{font-size:13.5px;color:var(--fg)}
.cfoot{display:flex;align-items:center;gap:16px;margin:22px 32px 30px;padding-top:20px;border-top:1px solid var(--border)}
.cfoot .lk{display:flex;flex-direction:column;gap:8px;min-width:0}
.cfoot .cnt2{white-space:nowrap;margin-left:auto;display:flex;align-items:center;gap:14px;font:12px 'IBM Plex Mono';color:var(--fg-muted)}
.cfoot .cnt2 i{font-style:normal;width:36px;height:36px;border:1px solid var(--border-strong);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--fg)}
.mp{font:500 14px 'IBM Plex Sans';color:var(--accent-text);text-decoration:underline;text-underline-offset:3px;text-decoration-color:color-mix(in srgb,var(--accent) 45%,transparent);white-space:nowrap}
.mp .xl{color:var(--fg-muted)}
.fd{display:inline-flex;align-items:center;gap:8px;font:500 13.5px 'IBM Plex Sans';color:var(--accent-text);white-space:nowrap}
.fd .g{display:flex;gap:3px}.fd .g i{width:6px;height:6px;transform:rotate(45deg);border:1.5px solid var(--accent);display:block}
.fd .t{border-bottom:1px solid var(--accent-shadow)}
.fd.off{color:var(--fg-locked);cursor:default}
.fd.off .g i{border-color:var(--fg-locked)}
.fd.off .t{border-bottom:0}
.fd.off svg{color:var(--fg-locked)}
.fdn{font:10.5px/1.45 'IBM Plex Mono';color:var(--fg-muted);white-space:normal}
/* phone card sheet */
.csheet{position:absolute;left:0;right:0;bottom:0;top:318px;z-index:21;background:var(--surface-raised);border-top:1px solid var(--border-strong);border-radius:18px 18px 0 0;display:flex;flex-direction:column;overflow:hidden}
.csheet .grip{width:40px;height:4px;border-radius:2px;background:var(--border-strong);margin:10px auto 6px;flex:none}
.csheet .bd{padding:6px 20px 30px;display:flex;flex-direction:column;overflow:hidden}
.csheet .cnm b{font-size:24px;font-weight:400}
.csheet .ctop{display:flex;gap:14px;align-items:flex-start}
.csheet .ctop img{width:96px;border-radius:4.75%;flex:none}
.csheet .corc{font-size:13.5px;padding:14px 16px;margin-top:14px}
.cmeta2{display:grid;grid-template-columns:1fr 1fr;gap:12px 16px;margin-top:14px}
.cmeta2 div{display:flex;flex-direction:column;gap:3px}
.cmeta2 small{font:10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.cmeta2 span{font-size:13.5px;color:var(--fg)}
.clinks{margin-top:14px;border-top:1px solid var(--border);display:flex;flex-direction:column}
.clinks>div{min-height:44px;display:flex;align-items:center}
.clinks .fdw{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:4px 0 2px}
.sym{display:inline-block;width:15px;height:15px;border-radius:50%;background:var(--elevated);outline:1px solid var(--border-strong);font:600 9px/15px 'IBM Plex Mono';text-align:center;color:var(--fg);font-style:normal;vertical-align:1px}
.sym.w{background:var(--w);color:#14110E;outline:0}
/* written for real: the precon card with its commander, and the full Overview */
.cmd.pc{cursor:pointer}
.cmd.pc .go{gap:4px}
.cmd .tagk{font:11px 'IBM Plex Mono';letter-spacing:.04em;color:var(--fg-faint)}
.ovm{position:absolute;z-index:21;left:50%;top:40px;transform:translateX(-50%);width:760px;background:var(--surface-raised);border:1px solid var(--border-strong);border-radius:16px;box-shadow:0 30px 70px rgba(0,0,0,.6);overflow:hidden}
.ovs{position:absolute;z-index:21;left:0;right:0;bottom:0;top:64px;background:var(--surface-raised);border-top:1px solid var(--border-strong);border-radius:18px 18px 0 0;overflow:hidden}
.ovhead{position:relative;height:190px;overflow:hidden}
.ovs .ovhead{height:150px}
.ovhead img{width:100%;height:100%;object-fit:cover;object-position:50% 30%;display:block}
.ovhead::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 30%,rgba(0,0,0,.78))}
.ovhead .nm{position:absolute;left:24px;bottom:16px;z-index:2;display:flex;flex-direction:column;gap:4px}
.ovs .ovhead .nm{left:18px;bottom:12px}
.ovhead .nm b{font:700 24px 'Cinzel',serif;color:var(--fg);text-shadow:0 1px 2px rgba(0,0,0,.8),0 0 12px rgba(0,0,0,.6)}
.ovhead .nm span{font:11px 'IBM Plex Mono';letter-spacing:.06em;color:var(--fg-body);text-shadow:0 1px 2px rgba(0,0,0,.8)}
.ovhead .x{position:absolute;right:8px;top:8px;z-index:3;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--fg);font-size:16px;background:rgba(0,0,0,.35)}
.ovb{padding:20px 24px 24px;display:flex;flex-direction:column;gap:16px;font-size:14px;line-height:1.65;color:var(--fg-body);position:relative}
.ovs .ovb{padding:16px 18px 30px;gap:14px;font-size:13.5px}
.ovb .k{font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);margin-bottom:6px;display:block}
.ovb .cn{color:var(--fg);font-weight:600;text-decoration:underline;text-decoration-color:var(--border-dashed);text-underline-offset:3px}
.ovb .stg{display:grid;grid-template-columns:56px 1fr;gap:8px 12px}
.ovb .stg em{font:500 10px 'IBM Plex Mono';font-style:normal;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-text);padding-top:4px}
.ovb ul{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px}
.ovb .alt{border:1px solid var(--border);border-radius:10px;padding:12px 14px;background:var(--surface-inset);font-size:13.5px}
.ovb .land{font:12px 'IBM Plex Mono';color:var(--fg-muted)}
.ovfoot{border-top:1px solid var(--border);padding:16px 24px 20px;background:var(--surface-inset);display:flex;flex-direction:column;gap:10px}
.ovs .ovfoot{padding:14px 18px 30px}
.ovfoot p{font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.ovfoot .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
/* loop squares: bullets to the foot */
.loop2.bot .lc{height:100%}
.d .loop2.bot .lc ul{margin-top:auto;padding-top:10px}
.loop2.t2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.loop2.t2 .lc{display:flex;flex-direction:column;gap:10px;padding:20px}
.loop2.t2 .lc ul{margin-top:auto;padding-top:10px}
.guide2{position:absolute;left:0;right:0;height:0;border-top:1.5px dashed rgba(143,166,190,.9);z-index:5}
.guide2 span{position:absolute;right:0;top:-18px;font:600 9px 'IBM Plex Mono';color:#0D0B09;background:#8FA6BE;border-radius:3px;padding:1px 5px}
.bring2{display:grid;grid-template-columns:minmax(0,440px) minmax(0,1fr);gap:28px;align-items:start;margin-top:22px}
.bring2 .ft{margin-top:0}
.cbox{position:absolute;inset:0;border:1.5px dashed rgba(143,166,190,.6);pointer-events:none}
.mx{position:absolute;top:0;bottom:0;border-left:1.5px dashed rgba(143,166,190,.85);z-index:5}
.mx span{position:absolute;top:8px;left:4px;font:600 9px 'IBM Plex Mono';color:#0D0B09;background:#8FA6BE;border-radius:3px;padding:1px 5px;white-space:nowrap}
.sec .ft h3{font-family:'IBM Plex Sans'}
"""


def rm_press(h):
    return re.sub(r'<span class="press"[^>]*><b>[^<]*</b></span>', "", h)


# ------------------------------------------------------------------ the trimmed steps (the app half)
def s_collection(d, n=12):
    cols = 6 if d else 3
    t = "".join(f'<div class="tile"><img src="{img("c-" + k + ".jpg")}" alt="{nm}"><b>{nm}</b><span>×1</span></div>' for k, nm in A.TILES[:n])
    ring = ""
    if True:
        w = f"calc({100 / cols:.3f}% - {10 * (cols - 1) / cols:.1f}px + 8px)"
        ring = (f'<span class="ringx" style="left:-4px;top:-4px;width:{w};height:calc({100 / (n // cols):.2f}% - 2px)"></span>'
                f'<span class="coach" style="left:0;top:calc({100 / (n // cols):.2f}% + 6px)">Press a card</span>')
    grid = f'<div class="grid" style="grid-template-columns:repeat({cols},minmax(0,1fr))">{t}</div>'
    return (f'<div class="ap{" dk2" if d else ""}"><div class="dtabs"><span class="on">Cards</span><span>Sets</span><span>History</span><span>Wishlist</span></div>'
            f'<span class="cnt">12 of {P}’s 2,140 cards</span><div class="rel">{grid}{ring}</div></div>')


def s_commanders(d):
    h = rm_press(A.commanders(d, 3)).replace("58 commanders Sam owns", f"58 commanders {P} owns")
    return h


def s_hmc(d):
    return a1.hmc97(d).replace("Sam’s", f"{P}’s")


def mk_row(name, cs, after, right, ring=None):
    miss = "buy" in right
    pipz = "".join('<i style="background:#C05A3E"></i>' for _ in cs) or '<i style="background:var(--fg-faint)"></i>'
    marks = ""
    for m in after:
        if ring == "hover" and m == "gc":
            marks += ('<span class="mkw">' + A.MK[m] + '<span class="ringx" style="left:1px;top:-5px;width:24px;height:24px;border-radius:7px"></span>'
                      '<span class="coach" style="left:32px;top:-2px">Hover a mark</span>'
                      '<span class="ftip" style="left:-2px;top:26px">This card is on the Game Changer list.</span>'
                      '<svg class="cursor" viewBox="0 0 14 20" style="left:12px;top:8px"><path d="M1 1v15l4-3.6 2.6 6 2.4-1.1-2.6-5.8H13z" fill="#fff" stroke="#000" stroke-width="1"/></svg></span>')
        elif ring == "ring" and m == "gc":
            marks += ('<span class="mkw">' + A.MK[m] + '<span class="ringx" style="left:1px;top:-5px;width:24px;height:24px;border-radius:7px"></span>'
                      '<span class="coach" style="left:32px;top:-2px">Hover a mark</span></span>')
        else:
            marks += A.MK[m]
    rr = ('<span class="ringx" style="left:-6px;right:-6px;top:-3px;bottom:-3px"></span><span class="coach" style="right:0;top:calc(100% + 6px)">Press a card</span>'
          if ring == "row" else "")
    return (f'<div class="r1"><span class="dot{" miss" if miss else ""}"></span><span class="n" style="overflow:visible">{name}{marks}</span>'
            + "".join(A.MK[r] for r in right) + f'<span class="mv">{pipz}</span>{rr}</div>')


def s_deck(d, hover=False):
    """Step 4, trimmed: the key, then only the 7 rows that carry a mark, then Show all 99. Desktop: hover a mark."""
    rows = ""
    for grp, n, rs in A.DECKROWS:
        rows += f'<div class="rows"><span class="h">{grp}<em>{n}</em></span>'
        for r in rs:
            if r[0] == "Smokebraider":
                continue
            ring = ("hover" if hover else "ring") if (d and r[0] == "Jeska’s Will") else ("row" if (not d and r[0] == "Fury") else None)
            rows += mk_row(*r, ring=ring)
        rows += "</div>"
    note = (f'<div class="mnote"><b>Sol Ring</b> is short: {P}’s one copy is in two decks. The first deck to commit keeps it; '
            'the other shows it to buy.</div>')
    return (f'<div class="ap{" dk2" if d else ""}">{A.deck_head()}'
            f'<div class="dtabs"><span class="on">Your deck<sup>99</sup></span><span>Analysis</span><span>Consider</span><span>Games</span></div>'
            f'<div class="seg"><span class="on">All 99</span><span class="acc">Shopping 2</span><span>Stats</span><span>Notes</span></div>'
            f'<div class="rel">{A.markkey(["buy", "proxy", "gc", "tutor", "short", "over"])}'
            f'<div class="slice"><span>7 of 99 · the cards with a mark</span><u>Show all 99</u></div>{rows}</div>{note}</div>')


VC = [("Mana velocity", "Top", 5, "Early ramp 15 · average spell 2.9"), ("Card flow", "Modest", 2, "4 engines, 6 one-time draws"),
      ("Interaction", "Low", 1, "5 answers, 2 at instant speed"), ("Wincons", "Strong", 4, "Hasty copies, Jeska’s Will")]


def cells():
    return "".join(f'<div class="vc"><span class="t">{a}<b>{b}</b></span><span class="bars">' + "".join(
        f'<i class="{"on" if k < n else ""}"></i>' for k in range(5)) + f'</span><span>{c}</span></div>' for a, b, n, c in VC)


STG = [("Early", "Rocks and cheap elementals set up evoke from turn two."),
       ("Mid", 'Every sacrifice is a second cast: <span class="cn">Fury</span>’s copy clears the board and swings.'),
       ("Close", '<span class="cn">Jeska’s Will</span> turns a board of copies into one big turn.')]
LEAD = ('<span class="cn">Ashling, the Limitless</span> leads a mono-red elemental deck: cast elementals for their evoke cost, '
        'sacrifice them, and take a hasty copy back each time.')


def gp_stages(stages):
    """The shipped GamePlan (synopsis-stages.tsx): timeline from md, rail below it."""
    out = "".join(f'<div class="stg2{" cl" if i == 2 else ""}"><i></i><div class="cd"><div class="lbr"><span class="lb">{a}</span>'
                  + ('' if i == 2 else '<span class="ln"></span>') + f'</div><p class="t13">{b}</p></div></div>' for i, (a, b) in enumerate(stages))
    return f'<div class="gp">{out}</div>'


def s_analysis(d):
    if not d:
        ov = (f'<div class="wo ovx shx2" style="position:relative;border-radius:10px;background:var(--surface-raised)">{A.tag()}<span class="k">Overview</span><p>{LEAD}</p>'
              f'<span class="k" style="margin-top:6px">Game plan</span>{gp_stages(STG)}</div>')
        return (f'<div class="ap"><div class="dtabs"><span>Your deck</span><span class="on">Analysis</span><span>Consider</span></div>'
                f'<div class="vd rel" style="margin-bottom:20px">{cells()}<span class="ringx" style="left:-4px;top:-4px;width:calc(50% + 2px);height:calc(50% - 4px + 8px - 8px)"></span>'
                f'<span class="coach" style="left:0;top:calc(100% + 5px)">Press a finding</span></div>{ov}</div>')
    return (f'<div class="ap dk2 ana"><div class="dtabs"><span>Your deck</span><span class="on">Analysis</span><span>Consider</span></div>'
            f'<div class="vd rel">{cells()}<span class="ringx" style="left:-4px;top:-4px;width:calc(25% + 1px);height:calc(100% + 8px)"></span>'
            f'<span class="coach" style="left:0;top:calc(100% + 10px)">Press a finding</span></div>'
            f'<div class="wo" style="margin-top:22px;padding:18px 20px">{A.tag()}<span class="k">Overview</span><p class="lead">{LEAD}</p>'
            f'<span class="k" style="margin-top:6px">Game plan</span><div class="ovx" style="margin-top:12px;--surface-raised:var(--surface)">{gp_stages(STG)}</div></div></div>')


SWAPS = [("Abrade", "Smokebraider", "An instant answer to an artifact or a creature; Smokebraider’s mana only casts elementals."),
         ("Chaos Warp", "Incandescent Soulstoke", "Removes anything at instant speed; the Soulstoke’s haste overlaps Ashling’s copies."),
         ("Blasphemous Act", "Rolling Thunder", "A reset for when the table goes wide; Rolling Thunder is slow for its cost.")]


def s_suggested(d):
    rows = ""
    for i, (a, o, w) in enumerate(SWAPS):
        rows += (f'<div class="sr2"><span class="sg in">+</span><b class="rel">{a}' + (
            '<span class="ringx" style="left:-6px;top:-5px;right:-6px;bottom:-5px"></span><span class="coach" style="left:calc(100% + 12px);top:0">Press a card</span>' if i == 0 else "")
                 + f'</b><span></span><p>{w}</p></div>'
                 f'<div class="sr2" style="border-top:0;padding-top:0"><span class="sg out">−</span><b>{o}</b><span></span></div>')
    return (f'<div class="ap{" dk2" if d else ""}"><div class="ask"><small>What {P} asked <span class="ro2">read-only</span></small>More interaction, and fewer cards that only work with the commander.</div>'
            f'<div class="wo">{A.tag()}<span class="k">3 in · 3 out</span><div class="swp">{rows}</div></div></div>')


CUTS = [("Healer’s Hawk", "Not an Angel, so Giada never grows it, and lifelink is already on six cards."),
        ("Thran Dynamo", "A fourth mana rock the curve doesn’t need.")]


def s_to99(d, tab="cuts"):
    tabs = '<div class="ttabs" role="tablist">' + "".join(
        f'<span class="{"on" if k == tab else ""}">{n}</span>' for k, n in (("cuts", "Look deeper"), ("top", "Top off"), ("mana", "Mana Balance"))) + "</div>"
    if tab == "cuts":
        rows = "".join(f'<div class="sr2"><span class="sg out">−</span><b>{n}</b><span></span><p>{w}</p></div>' for n, w in CUTS)
        body = (f'{a1.dhead("giada").replace("103 / 99", "101 / 99").replace("4 over", "2 over")}'
                f'<span class="cnt">This deck is 2 over · Proposed cuts</span>'
                f'<div class="wo">{A.tag()}<span class="k">Look deeper · the named cuts</span><div class="swp">{rows}</div></div>')
    elif tab == "top":
        keep = a1.TOPOFF
        a1.TOPOFF = [keep[0], keep[1], keep[2], keep[3][:7] + (False,), keep[6]]
        try:
            h = a1.topoff(d)
        finally:
            a1.TOPOFF = keep
        for a, b in (("Choose the last 6", "Choose the last 3"), ("6 of 6 slots selected · 24 candidates, 18 untouched", "3 of 3 slots selected · 12 candidates, 10 untouched"),
                     ("6 of 6 selected", "3 of 3 selected"), ("Select 4 from my collection", "Select 2 from my collection"),
                     ("Select the 6 this deck needs", "Select the 3 this deck needs"), ("Add 6 cards", "Add 3 cards"),
                     ("16 more", "7 more"), ("2 to buy $4.50", "1 to buy $3.40"), ("2 creatures short of recommendations", "1 creature short of recommendations")):
            h = h.replace(a, b)
        body = (f'{a1.dhead("zimone").replace("93 / 99", "96 / 99").replace("6 open", "3 open")}' + rm_press(h))
    else:
        body = a1.dhead("zimone").replace("93 / 99", "96 / 99").replace("6 open", "3 open") + a1.mana(d)
    return f'<div class="ap{" dk2" if d else ""}">{tabs}{body}</div>'


def s_shopping(d):
    h = A.shopping(d).replace("Sam", P)
    h = h[:h.index('<div class="wd">')] + '</div>'
    tabs = '<div class="ttabs"><span class="on">Shopping list</span><span>Which deck needs it most?</span></div>'
    return h.replace('<div class="ap">', f'<div class="ap">{tabs}', 1)


# ------------------------------------------------------------------ step words (DRAFT)
STEPS = [
    dict(t=f"{P}’s collection", tags=[FREE], b=f"{P} is made up, and so is the binder: 2,140 cards. Here are 12 of them. Press any card to open it."),
    dict(t=f"The commanders {P} can build", tags=[FREE], b=f"Every commander in the binder, ranked by how much of its deck {P} already owns. Press the fit to see why."),
    dict(t="Help me choose", tags=[credit("1 credit")], b=f"{P} described the deck in a few words. The 99 ranked the commanders that fit, owned or not."),
    dict(t=f"A deck from what {P} owns", tags=[FREE], b=f"Built from {P}’s cards first. Here are the 7 cards that carry a mark; the key above them says what each mark means."),
    dict(t="Analysis and Overview", tags=[FREE, credit("Overview: 1 credit")], b="The verdict is free. The Overview is a written read of how the deck plays, from the first turns to the win."),
    dict(t="Suggested changes", tags=[credit("1–2 credits")], b=f"{P} asked for more interaction. The 99 picked 3 swaps, a card in and a card out each, and says why."),
    dict(t="Get it to 99", tags=[FREE, credit("Look deeper: 1 credit")], b=f"Three tools, one tab each. Look deeper names the cuts for a deck over 99. Top off fills a deck under 99 from {P}’s cards. Mana Balance checks the lands."),
    dict(t="Buy only what’s missing", tags=[FREE, credit("Which deck: 1 credit")], b=f"Two tabs. The shopping list, cheaper stand-ins first. And Which deck needs it most?, which reads one new card against every deck {P} has."),
]
APP = [s_collection, s_commanders, s_hmc, s_deck, s_analysis, s_suggested, s_to99, s_shopping]


def bar(i, lit=None):
    lit = i + 1 if lit is None else lit
    return '<span class="bar">' + "".join(f'<i class="{"on" if k < lit else ""}"></i>' for k in range(8)) + '</span>'


def fbar(i, end=False):
    lab = "The end" if end else f"Step {i + 1} of 8"
    skip = "" if end else '<span class="skip">Skip to the end</span>'
    return f'<div class="fbar"><span class="sn">{lab}</span>{bar(i, 8 if end else None)}{skip}<span class="x" aria-label="Close">✕</span></div>'


def nav(i):
    return ((f'<span class="btn-q">Back</span>' if i > 0 else "") + f'<span class="btn-l">{"See the end" if i == 7 else "Next"}</span>')


def words(i):
    s = STEPS[i]
    return f'<div class="tags">{"".join(s["tags"])}</div><h3 class="disp">{s["t"]}</h3><p>{s["b"]}</p>'


def modal_p(i, app=None, over="", tall=False, theme="", h=None, scr=True, w=None):
    """Phone or tablet portrait (one column): pinned bar, scrolling words and app, pinned Back/Next."""
    cls = "p" if not w else "t"
    style = (f"width:{w}px;" if w else "") + (f"height:{h}px" if h else "")
    body = app if app is not None else APP[i](False)
    lab = f'<span class="lab">Live demo · {P}’s cards</span>'
    mid = (f'<div class="fmid"><div class="fscroll"><div class="fwords">{words(i)}</div><div class="fapp">{lab}<div style="padding-top:10px">{body}</div></div></div>'
           + ('' if tall else '<div class="fade"></div>' + (f'<span class="scr">scrolls under the bars</span>' if scr else "")) + '</div>')
    return f'<div class="fs {cls}{" tall" if tall else ""} {theme}" style="{style}">{fbar(i)}{mid}<div class="fnav">{nav(i)}</div>{over}</div>'


def modal_w(i, w=1440, h=900, app=None, over="", theme="", scr=True):
    """1024 and up: the words column with Back/Next under it; the app scrolls on the right."""
    cls = "d" if w >= 1200 else "t"
    body = app if app is not None else APP[i](True)
    col = (f'<div class="fcol"><div class="tags">{"".join(STEPS[i]["tags"])}</div><h3 class="disp">{STEPS[i]["t"]}</h3><p>{STEPS[i]["b"]}</p>'
           f'<div class="nav">{nav(i)}</div></div>')
    pane = (f'<div class="fpane"><div class="in"><span class="lab" style="position:absolute;right:32px;top:10px;font:500 9px IBM Plex Mono;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)">Live demo · {P}’s cards</span>'
            f'<div style="padding-top:12px">{body}</div></div>' + ('<div class="fade"></div>' + ('<span class="scr">this side scrolls</span>' if scr else "") if scr else "") + '</div>')
    return f'<div class="fs {cls} {theme}" style="width:{w}px;height:{h}px">{fbar(i)}<div class="fwide">{col}{pane}</div>{over}</div>'


def end_p(w=None, open_=False):
    fan = (f'<div class="fanc"><span class="c c1"><img src="{img("c-polyraptor.jpg")}" alt=""></span>'
           f'<span class="c c2"><img src="{img("c-ashling.jpg")}" alt=""></span><span class="c c3"><img src="{img("c-doctor-doom.jpg")}" alt=""></span></div>')
    words_ = (f'<div style="display:flex;flex-direction:column;gap:12px;align-items:stretch;flex:1;min-width:0">'
              f'<h3 class="disp" style="margin:0;font:700 21px/1.25 Cinzel,serif">That was {P}’s binder. Yours works the same.</h3>'
              '<p style="font-size:14.5px;line-height:1.6;color:var(--fg-body)">Bring your cards in, and every commander and deck here is built from what you own.</p>'
              f'{L.launch("entry", bool(w), open_=open_)}<div class="row" style="display:flex;gap:10px"><span class="btn-q">Start over</span><span class="btn-q">Close</span></div></div>')
    cls = "d" if w else "p"
    style = f"width:{w}px;height:900px" if w else ""
    inner = (f'<div class="dstart" style="{"flex-direction:row;align-items:center;gap:40px;padding:60px 120px" if w else "padding:22px 20px"}">{fan}{words_}</div>')
    tail = "" if w else '<div class="fade"></div><span class="scr">scrolls</span>'
    return f'<div class="fs {cls}" style="{style}">{fbar(7, end=True)}<div class="fmid" style="overflow:hidden;{"justify-content:center" if w else ""}">{inner}{tail}</div></div>'


# ------------------------------------------------------------------ the section on the page (start card), and after a close
def section_card(d, resume=None):
    fan = (f'<div class="fanc"><span class="c c1"><img src="{img("c-tam.jpg")}" alt=""></span>'
           f'<span class="c c2"><img src="{img("c-jace.jpg")}" alt=""></span><span class="c c3"><img src="{img("c-giada.jpg")}" alt=""></span></div>')
    if resume:
        press = f'<div class="row"><span class="btn-l">Carry on from step {resume}</span><span class="btn-q">Start over</span></div>'
    else:
        press = '<div class="row"><span class="btn-l">Start</span></div>'
    w = (f'<div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start"><h3 class="disp">Try it on {P}’s cards</h3>'
         f'<p>{P} is a made-up player with a real-looking binder. Step through eight of the tools, the way you would with your own cards. '
         'It opens full screen. Nothing you press is saved, and nothing costs a credit.</p>' + press + '</div>')
    return L.lp(f'<section class="sec"><p class="sk">Try it</p><h2 class="st disp">See it work before you join</h2>'
                f'<p class="sl">A made-up player’s cards and eight of the tools, working the way they do for members.</p>'
                f'<div class="demo"><div class="dstart">{fan}{w}</div></div></section>', d)


# ------------------------------------------------------------------ card details (item 5)
GIADA = dict(name="Giada, Font of Hope", cost="1W", type="Legendary Creature — Angel", price="$0.38",
             text=["Flying, vigilance", "Each other Angel you control enters with an additional +1/+1 counter on it for each Angel you already control.",
                   '<i class="sym">↷</i>: Add <i class="sym w">W</i>. Spend this mana only to cast an Angel spell.'])


def mcost(c):
    out = ""
    for ch in c:
        out += (f'<i style="background:var(--elevated);color:var(--fg);outline:1px solid var(--border-strong)">{ch}</i>' if ch.isdigit()
                else f'<i style="background:{a1.PIPC[ch]}"></i>')
    return f'<span class="mc">{out}</span>'


LOCKI = ('<svg width="10" height="12" viewBox="0 0 11 14" aria-hidden="true"><path d="M2.5 6V4a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.4"/>'
         '<rect x=".5" y="6" width="10" height="7.5" rx="1.5" fill="currentColor"/></svg>')
MP = '<span class="mp">Buy any printing at Mana Pool ↗</span>'


def fd(off=True):
    if off:
        return (f'<span class="fd off" aria-disabled="true"><span class="g"><i></i><i></i></span><span class="t">Find a deck for it</span>{LOCKI}</span>')
    return '<span class="fd"><span class="g"><i></i><i></i></span><span class="t">Find a deck for it →</span></span>'


FDN = "For members: it reads your own decks for where this card fits."


def card_modal(off=True):
    c = GIADA
    txt = "".join(f"<p>{t}</p>" for t in c["text"])
    return (f'<div class="cscrim"></div><div class="cmod"><span class="xx">✕</span><div class="art"><img src="{img("c-giada.jpg")}" alt="{c["name"]}"></div>'
            f'<div class="csh"><div class="shb"><div class="cnm"><b>{c["name"]}</b>{mcost(c["cost"])}</div><div class="ctype">{c["type"]}</div>'
            f'<div class="cprice"><span class="pt">{c["price"]}</span><span>from the cheapest printing</span></div>'
            f'<div class="corc">{txt}</div>'
            f'<div class="cmeta"><div><small>Set</small><span>FDC</span></div><div><small>Rarity</small><span>Mythic</span></div><div><small>Owned</small><span>×1 · in Giada’s deck</span></div></div></div>'
            f'<div class="cfoot"><span class="lk">{MP}<span style="display:flex;flex-direction:column;gap:3px">{fd(off)}'
            + (f'<span class="fdn">{FDN}</span>' if off else "") + '</span></span>'
            f'<span class="cnt2"><i>‹</i>3 / 12<i>›</i></span></div></div></div>')


def card_sheet(off=True):
    c = GIADA
    txt = "".join(f"<p>{t}</p>" for t in c["text"])
    return (f'<div class="cscrim"></div><img src="{img("c-giada.jpg")}" alt="" style="position:absolute;z-index:21;left:50%;transform:translateX(-50%);top:70px;width:170px;border-radius:4.75%;box-shadow:0 14px 30px rgba(0,0,0,.5)">'
            f'<div class="csheet"><span class="grip"></span><div class="bd">'
            f'<div class="cnm"><b>{c["name"]}</b>{mcost(c["cost"])}</div><div class="ctype">{c["type"]}</div>'
            f'<div class="cprice"><span class="pt">{c["price"]}</span><span>from the cheapest printing</span></div>'
            f'<div class="corc">{txt}</div>'
            f'<div class="cmeta2"><div><small>Set</small><span>FDC · mythic</span></div><div><small>Owned</small><span>×1 · in Giada’s deck</span></div></div>'
            f'<div class="clinks"><div>{MP}</div><div class="fdw">{fd(off)}'
            + (f'<span class="fdn">{FDN}</span>' if off else "") + '</div></div></div></div>')


# ------------------------------------------------------------------ Written for real (item 6)


def written2(d, pressed=False):
    cards = "".join(
        f'<div class="cmd"><div class="art"><img src="{img("a-" + k + ".jpg")}" alt=""><span class="nm">{A.CMD[k]["name"]}{A.pips(A.CMD[k]["c"])}</span></div>'
        f'<div class="bd"><span class="k">Why this commander</span><p>{A.CMD[k]["prose"]}</p><span class="go">Open its page ›</span></div></div>'
        for k in ("yshtola", "tam"))
    ring = ' style="outline:2px solid var(--accent);outline-offset:3px"' if pressed else ""
    ov = (f'<div class="cmd pc"{ring}><div class="art"><img src="{img("a-mothman.jpg")}" alt="" style="object-position:50% 35%">'
          f'<span class="nm">Mutant Menace{A.pips("BGU")}</span></div>'
          f'<div class="bd"><span class="k">Precon Overview · The Wise Mothman</span><p>{OV_LEAD_PLAIN}</p>'
          f'<span class="go">Read the whole Overview ›</span></div></div>')
    return (f'<section class="sec"><p class="sk">Written for real</p><h2 class="st disp">A written read for 3,379 commanders</h2>'
            f'<p class="sl">Most commander pages open with why it’s worth building. Almost every precon has an Overview. Both are free to read.</p>'
            f'<div class="wr">{cards}{ov}</div></section>')


# ---- the full Overview: the SHIPPED PreconSynopsisModal (A2c)
# Drawn from synopsis-body.tsx + synopsis-stages.tsx (overview_stages option B, contract 13): ModalChrome 700 / phone sheet,
# Overview with the tilted commander, Game plan Early/Mid/Close + Alternate commander, Mulligan land figure + Keep/Send back,
# Key tips cards, Key cards grid, Weaknesses with severity chips (sorted). Words: the Mutant Menace sample from the
# overview_stages handoff (ov.MM). Only The Wise Mothman has an image on the canvas; every other card draws the shipped
# no-art form (the line keeps its name, the image column drops), never a broken image.
kit.CSS += r"""
.ovx .cn{font-weight:600;color:var(--fg);border-bottom:1px dotted var(--accent);white-space:normal}
.ovx p{margin:0;text-wrap:pretty;overflow-wrap:anywhere}
.omo2{position:absolute;z-index:21;left:50%;top:48px;transform:translateX(-50%);width:700px;border:1px solid var(--border-strong);border-radius:14px;background:var(--surface-raised);box-shadow:0 24px 60px rgba(0,0,0,.55);overflow:hidden;display:flex;flex-direction:column}
.omo2.unr{position:relative;left:auto;top:auto;transform:none}
.omo2 .mh{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--border);flex:none}
.ovx .mh h2{margin:0;font:700 16px var(--disp,'Cinzel'),serif;color:var(--fg)}
.omo2 .mh .as{font:12px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ovx .mh .x{margin-left:auto;font:14px 'IBM Plex Mono';color:var(--fg-faint);width:44px;height:30px;display:flex;align-items:center;justify-content:flex-end}
.omo2 .mb{display:flex;flex-direction:column;gap:20px;padding:20px 22px 26px;overflow:hidden;position:relative}
.shx2{position:absolute;z-index:21;left:0;right:0;bottom:0;top:56px;border-top:1px solid var(--border-strong);border-radius:14px 14px 0 0;background:var(--surface-raised);display:flex;flex-direction:column;overflow:hidden}
.shx2.unr{position:relative;top:auto;width:390px}
.shx2 .mh{height:43px;display:flex;align-items:center;gap:9px;padding:0 16px;border-bottom:1px solid var(--border);flex:none}
.shx2 .mh h2{font-size:15px}
.shx2 .mh .x{margin-right:-10px;width:44px;height:43px;justify-content:center}
.shx2 .mb{display:flex;flex-direction:column;gap:18px;padding:16px 16px 28px;overflow:hidden;position:relative}
.shx2 .asl{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.osec2{display:flex;flex-direction:column;gap:12px}
.osec2+.osec2{border-top:1px solid var(--border);padding-top:20px}
.shx2 .osec2{gap:11px}.shx2 .osec2+.osec2{padding-top:18px}
.osec2>h3{margin:0;font:400 10px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.osub2{display:flex;flex-direction:column;gap:9px}
.osub2>h4{margin:0;font:600 13.5px 'IBM Plex Sans';color:var(--fg)}
.prm2{display:flex;flex-direction:column;gap:18px}
.ovx .t13{font-size:13px;line-height:1.55;color:var(--fg-body)}
.ovx .cimg{display:block;flex:none;border-radius:4.5%/3.2%;object-fit:cover;box-shadow:0 3px 10px rgba(0,0,0,.5)}
.ovh2{display:grid;grid-template-columns:96px minmax(0,1fr);gap:18px;align-items:start}
.ovh2 .cimg{width:96px;height:134px;transform:rotate(-3deg);margin-top:4px}
.shx2 .ovh2{grid-template-columns:72px minmax(0,1fr);gap:14px}
.shx2 .ovh2 .cimg{width:72px;height:100px}
.ovh2 p{font-size:14.5px;line-height:1.7;color:var(--fg-body)}
.shx2 .ovh2 p{font-size:13.5px;line-height:1.65}
.gp{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.gp .stg2{position:relative;display:flex;flex-direction:column;padding-top:23px}
.gp .stg2>i{position:absolute;left:0;top:1.5px;width:10px;height:10px;transform:rotate(45deg);background:var(--fg-faint);box-shadow:0 0 0 4px var(--surface-raised);display:block}
.gp .stg2.cl>i{background:var(--accent)}
.gp .cd{position:relative;flex:1;border:1px solid var(--border);background:var(--surface-sunken);border-radius:10px;padding:12px;min-width:0}
.gp .lbr{position:absolute;left:18px;right:-14px;top:-24px;display:flex;align-items:center;gap:8px}
.gp .lb{font:500 10px/13px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-body);background:var(--surface-raised);padding-right:8px;position:relative;z-index:1}
.gp .ln{flex:1;height:1px;background:var(--fg-faint);opacity:.55}
.shx2 .gp{display:flex;flex-direction:column;gap:12px}
.shx2 .gp::before{content:"";position:absolute;left:4.5px;top:8px;bottom:8px;width:1px;background:var(--fg-faint);opacity:.55}
.shx2 .gp .stg2{padding-top:0;padding-left:22px}
.shx2 .gp .stg2>i{top:4px}
.shx2 .gp .lbr{position:static;display:block}
.shx2 .gp .lb{display:block;background:none;padding:0;margin-bottom:5px}
.shx2 .gp .ln{display:none}
.shx2 .gp .cd{padding:11px 12px}
.alt3{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center;border:1px dashed var(--border-dashed);border-radius:10px;padding:12px 14px}
.alt3 .cr{width:34px;height:34px;border-radius:50%;border:1px solid var(--border-strong);background:var(--surface-sunken);color:var(--accent-text);display:flex;align-items:center;justify-content:center}
.alt3 .ak{display:block;margin-bottom:5px;font:500 9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-body)}
.lf{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:center;margin-bottom:2px}
.lf .n{display:flex;flex-direction:column;align-items:center;justify-content:center;width:64px;height:64px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface-sunken)}
.lf .n b{font:700 26px/1 var(--disp,'Cinzel'),serif;color:var(--fg)}
.lf .n span{margin-top:4px;font:500 9px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.hd2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.shx2 .hd2{grid-template-columns:1fr;gap:8px}
.hd2 .hand{display:flex;flex-direction:column;gap:8px;min-width:0;border:1px solid var(--border);background:var(--surface-sunken);border-radius:9px;padding:12px 14px}
.hd2 .hk{font:9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-body)}
.hd2 .hl{display:grid;grid-template-columns:14px minmax(0,1fr);align-items:baseline;font-size:13px;line-height:1.55;color:var(--fg-body)}
.hd2 .hl>span:first-child{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.tp3{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.shx2 .tp3{grid-template-columns:1fr}
.tp3 .tc{border:1px solid var(--border);background:var(--surface-sunken);border-radius:10px;padding:12px}
.kg2{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.shx2 .kg2{gap:12px 10px}
.kg2 b{display:block;margin:2px 0 4px;font-size:13px;line-height:1.35;overflow-wrap:anywhere}
.shx2 .kg2 b{margin:0;font-size:12px}
.kg2 .j{font-size:12.5px;line-height:1.45;color:var(--fg-muted)}
.shx2 .kg2 .j{font-size:11.5px}
.wk3{display:flex;flex-direction:column;gap:10px}
.wk3 p{display:grid;grid-template-columns:82px minmax(0,1fr);gap:10px;align-items:baseline;font-size:13px;line-height:1.55;color:var(--fg-body)}
.shx2 .wk3 p{grid-template-columns:1fr;gap:5px}
.sev2{justify-self:start;border-radius:999px;border:1px solid var(--border-strong);padding:2px 8px;font:500 10px/13px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-muted)}
.sev2.mod{color:var(--warning);border-color:color-mix(in oklab,var(--warning) 45%,transparent)}
.tease{display:flex;flex-direction:column;gap:12px;border-top:1px solid var(--border);padding-top:20px}
.tease p{font-size:13.5px;line-height:1.6;color:var(--fg-body)}
.newb{outline:1.5px dashed rgba(207,135,69,.75);outline-offset:6px;border-radius:6px}
.ovx .vf{position:absolute;left:0;right:0;bottom:0;height:90px;background:linear-gradient(180deg,transparent,var(--surface-raised));z-index:3;pointer-events:none}
"""

MM = dict(
    aside="Mutant Menace · written for the precon list",
    overview="[[The Wise Mothman]] leads a Sultai deck that hands every player rad counters, mills cards, and turns each nonland card milled into +1/+1 counters, then wins by attacking with a bigger team.",
    stages=["[[Talisman of Resilience]] and [[Cultivate]] set up [[The Wise Mothman]] around turn 4, which gives each player a rad counter and grows creatures off mills.",
            "[[Branching Evolution]] and [[Winding Constrictor]] multiply every counter that the milled cards put on your creatures.",
            "[[Glowing One]] and [[Nightkin Ambusher]] pile on rad counters, and [[Mutational Advantage]] shields the countered team from removal."],
    alternate="[[The Master, Transcendent]] leads instead: it reanimates milled creatures, so the plan shifts from counters to stealing milled threats.",
    land=(4, "4 lands suit a top-heavy curve with 12 spells costing five or more."),
    keep=["[[Rampant Growth]] gets the commander down on time.", "[[Guardian Project]] with cheap creatures refills the hand."],
    send=["Top-end spells with no [[Strength Bobblehead]] or other ramp stall."],
    tips=["[[Raul, Trouble Shooter]] mills each player when it taps, and [[Tato Farmer]] can put a land milled that turn onto the battlefield.",
          "[[Inexorable Tide]] proliferates on every spell you cast, so [[Agent Frank Horrigan]]’s double proliferate grows counters and rad faster."],
    keys=[("Mirelurk Queen", "Turns each mill into cards and growth."), ("Screeching Scorchbeast", "Attacks to mill, then makes Zombie Mutant tokens."),
          ("Vault 12: The Necropolis", "Turns rad counters into a wide, grown team."), ("Marcus, Mutant Mayor", "Rewards countered attackers with extra cards."),
          ("Vexing Radgull", "Flies in and spreads rad counters."), ("Atomize", "Clears a blocker and adds counters at instant speed.")],
    weak=[("Moderate", "Only 2 of 8 interaction pieces are instants, so a fast [[Thassa's Oracle]] combo usually resolves before the deck can answer."),
          ("Moderate", "Wins mostly through combat, so [[Propaganda]] or a fog slows every attacker the counters have grown."),
          ("Minor", "Repeated [[Swords to Plowshares]] on the commander stops the mill trigger that grows the team, leaving only the other counter pieces.")],
)
OV_LEAD = re.sub(r"\[\[(.+?)\]\]", r'<span class="cn">\1</span>', MM["overview"])
OV_LEAD_PLAIN = re.sub("<[^>]+>", "", OV_LEAD)


def _mk(t):
    return re.sub(r"\[\[(.+?)\]\]", r'<span class="cn">\1</span>', t)


def ov_sections(d, tease=True):
    labs = ["Early", "Mid", "Close"]
    stg = "".join(f'<div class="stg2{" cl" if i == 2 else ""}"><i></i><div class="cd"><div class="lbr"><span class="lb">{labs[i]}</span>'
                  + ('' if i == 2 else '<span class="ln"></span>') + f'</div><p class="t13">{_mk(t)}</p></div></div>'
                  for i, t in enumerate(MM["stages"]))
    alt = (f'<div class="alt3"><span class="cr">{kit.ico(kit.NAV["Commanders"], 17, 1.5)}</span><div><span class="ak">Alternate commander</span>'
           f'<p class="t13">{_mk(MM["alternate"])}</p></div></div>')
    n, why = MM["land"]

    def hand(lab, g, lines):
        return (f'<div class="hand"><span class="hk">{lab}</span>'
                + "".join(f'<div class="hl"><span>{g}</span><span>{_mk(x)}</span></div>' for x in lines) + '</div>')
    tips = "".join(f'<div class="tc"><p class="t13">{_mk(t)}</p></div>' for t in MM["tips"])
    keys = "".join(f'<div><b><span class="cn">{nm}</span></b><span class="j">{j}</span></div>' for nm, j in MM["keys"])
    weak = "".join(f'<p><span class="sev2{" mod" if s == "Moderate" else ""}">{s}</span><span>{_mk(t)}</span></p>' for s, t in MM["weak"])
    foot = ""
    if tease:
        foot = (f'<div class="tease newb"><p><b style="color:var(--fg)">That’s the whole Overview, free to read.</b> Members get one for almost every precon, '
                f'and can have one written for their own decks.</p>{L.launch("entry", d)}</div>')
    return (f'<section class="osec2"><h3>Overview</h3><div class="ovh2"><img class="cimg" src="{img("c-mothman.jpg")}" alt=""><p>{_mk(MM["overview"])}</p></div></section>'
            '<section class="osec2"><h3>Primer</h3><div class="prm2">'
            f'<div class="osub2"><h4>Game plan</h4><div class="gp">{stg}</div>{alt}</div>'
            f'<div class="osub2"><h4>Mulligan</h4><div class="lf"><span class="n"><b>{n}</b><span>lands</span></span><p class="t13">{why}</p></div>'
            f'<div class="hd2">{hand("Keep", "+", MM["keep"])}{hand("Send back", "−", MM["send"])}</div></div>'
            f'<div class="osub2"><h4>Key tips</h4><div class="tp3">{tips}</div></div>'
            '</div></section>'
            f'<section class="osec2"><h3>Key cards</h3><div class="kg2">{keys}</div></section>'
            f'<section class="osec2"><h3>Weaknesses</h3><div class="wk3">{weak}</div></section>{foot}')


def overview_full(d, unrolled=False, h=None):
    """The shipped PreconSynopsisModal. d: ModalChrome 700 over the page; else the phone sheet. unrolled: drawn whole."""
    u = " unr" if unrolled else ""
    vf = "" if unrolled else '<div class="vf"></div><span class="scr">scrolls</span>'
    if d:
        mb_h = "" if unrolled else f' style="height:{h - 48 - 48 - 50}px"'
        return ("" if unrolled else '<div class="cscrim"></div>') + (
            f'<div class="omo2 ovx{u}"><div class="mh"><h2>Overview</h2><span class="as">{MM["aside"]}</span><span class="x">×</span></div>'
            f'<div class="mb"{mb_h}>{ov_sections(True)}{vf}</div></div>')
    return ("" if unrolled else '<div class="cscrim"></div>') + (
        f'<div class="shx2 ovx{u}"><div class="mh"><h2>Overview</h2><span class="x">×</span></div>'
        f'<div class="mb"><span class="asl">{MM["aside"]}</span>{ov_sections(False)}{vf}</div></div>')


# ------------------------------------------------------------------ the loop and Bring your collection (item 7)
LOOP_SHIPPED = [
    ("collection", "Bring your collection", "Upload a CSV from the app you use now, or paste a list.", ["Reads counts, sets and foils", "Sync a newer export any time"]),
    ("commanders", "See what you can build", "Every commander your cards can build, ranked by how much of its deck you already own.", ["Why each one fits, in a sentence", "Discover the ones you don’t own yet"]),
    ("decks", "Build from what you own", "The 99 fills the deck from your cards first and marks what’s missing.", ["Analysis, stats and brackets", "Combos you’re one card from"]),
    ("cart", "Buy only what’s missing", "One shopping list across your decks, with cheaper stand-ins and friends’ spares first.", ["Prices from Mana Pool", "Borrow before you buy"]),
]


def loop3(mode="today", w=None):
    items = "".join(
        f'<div class="lc"><span class="ic">{kit.ico(L.ICON[k], 22, 1.5)}</span><div class="hd"><h3>{t}</h3></div><p>{p}</p>'
        f'<ul>' + "".join(f"<li>{x}</li>" for x in ul) + '</ul></div>' for k, t, p, ul in LOOP_SHIPPED)
    cls = {"today": "", "bot": " bot", "t2": " t2 bot"}[mode]
    pad = ' style="padding:48px 44px"' if mode == "t2" else ""
    return (f'<section class="sec"{pad}><p class="sk">How it works</p><h2 class="st disp">From your cards to a finished deck</h2>'
            f'<p style="margin-top:12px;font:500 14px IBM Plex Sans;color:var(--fg-body)">All four are free.</p>'
            f'<div class="loop2{cls}" style="position:relative">{items}</div></section>')


def ftimer():
    return ('<div class="ft"><h3>New to all this?</h3><p>No collection app, just a box of cards? You don’t need the whole box in to begin.</p>'
            '<ol><li><em>1</em><span><b>Pick the precons you own.</b> Once you’re in, each box goes in whole, commander included.</span></li>'
            '<li><em>2</em><span><b>Add the rest as you go.</b> Scan cards with your phone’s camera, or search for them by name, once you’re in.</span></li></ol></div>')


def apps():
    rows = "".join(L.srow(n, s, None) for n, s, _ in L.SOURCES[:4])
    rows = rows.replace('<div class="srow">', '<div class="srow">', 4)
    rows = re.sub(r'(<div class="srow"><div class="w">.*?</div>)(</div>)', lambda m: m.group(1) + f'<span class="go">{L.CHEVD}</span>' + m.group(2), rows)
    return (f'<p class="sk" style="margin:0">Already use an app?</p><p style="margin-top:6px;font-size:13px;color:var(--fg-muted)">How to export: press yours.</p>'
            f'<div class="src" style="margin-top:12px">{rows}</div>')


def bring3(mode):
    head = ('<p class="sk">Bring your collection</p><h2 class="st disp">Start with the cards you already own</h2>'
            '<p class="sl">Most of The 99 reads your collection, so it comes in first.</p>')
    if mode == "today":
        body = f'<div style="max-width:780px;margin-top:22px">{ftimer()}<div style="margin-top:28px">{apps()}</div></div>'
        mark = '<span class="mx" style="left:calc(90px + 780px)"><span>780px · today</span></span>'
        return f'<section class="sec" style="position:relative">{head}{body}{mark}</section>'
    if mode == "center":
        head_c = head.replace('<p class="sl">', '<p class="sl" style="margin-left:auto;margin-right:auto">')
        body = f'<div style="max-width:780px;margin:22px auto 0">{ftimer()}<div style="margin-top:28px">{apps()}</div></div>'
        return f'<section class="sec" style="text-align:left"><div style="max-width:780px;margin:0 auto">{head}</div>{body.replace("margin:22px auto 0", "margin:22px auto 0")}</section>'
    body = f'<div class="bring2">{ftimer()}<div>{apps()}</div></div>'
    return f'<section class="sec">{head}{body}</section>'


# ------------------------------------------------------------------ boards
def col(*xs, w=440, gap=14):
    return f'<div style="display:flex;flex-direction:column;gap:{gap}px;width:{w}px;flex:none">' + "".join(xs) + "</div>"


def gapv(h=40):
    return f'<div style="height:{h}px"></div>'


n = L.note


def calls():
    tbl = ('<table class="tbl"><tr><th style="width:40px">#</th><th style="width:250px">Ask</th><th>Call</th></tr>'
           '<tr><td>1</td><td><b>See it work, full screen</b></td><td>Start opens the demo as a <b>full-screen dialog</b> at every width. A pinned top bar holds <i>Step N of 8</i>, the bar, <i>Skip to the end</i> and a bare ✕. '
           'Below 1024px the words and the app scroll as one column between that bar and a <b>pinned Back/Next bar</b>; from 1024px the words sit in a column at the left with Back and Next under them, and only the app side scrolls. '
           'Next and Back put the reader at the top of the step and focus its heading. ✕, Escape and the browser’s Back close it and land on the section; the section then offers <i>Carry on from step N</i> and <i>Start over</i>. '
           'The page under it doesn’t scroll and is inert.</td></tr>'
           '<tr><td>1t</td><td><b>Tablet, 768 to 1023</b></td><td>The phone’s one column, centred at 680px, with Back and Next pinned at the foot and right-aligned. The 340px two-column split starts at 1024 (it is unusable below). A 1024 landscape tablet gets the two columns with a 320px words column.</td></tr>'
           f'<tr><td>2</td><td><b>Trim by about half</b></td><td>Every step keeps its tool; each shows less. Step 1: <b>12 cards</b>. Step 2: <b>3 commanders</b>. Step 3: 3 ranked. Step 4: <b>only the 7 marked rows</b>, with <i>Show all 99</i>. Step 5: verdict and the Overview’s lead and game plan. Step 6: <b>3 swaps</b>. Step 7: Giada <b>2 over, 2 named cuts</b>; Zimone <b>3 open, 5 Top off rows</b>. Step 8 as is.</td></tr>'
           '<tr><td>3</td><td><b>Analysis with room</b></td><td>On a desktop the app side is up to 1080px wide: the four verdict cells in one row, the Overview’s lead at reading width, and Early, Mid and Close side by side.</td></tr>'
           '<tr><td>4</td><td><b>Marks are hover</b></td><td>Step 4 never asks the reader to select a mark. On a desktop the coach rings one mark with <i>Hover a mark</i> to its right, and hovering shows the shipped <code>FactTooltip</code>. On a phone, where there is no hover, the key does the job and the coach rings a card (<i>Press a card</i>). '
           '<b>A coach label never sits over the key</b>: it goes beside or below its target. Steps 7 and 8 drop the tab instruction; their lines name the tabs.</td></tr>'
           '<tr><td>5</td><td><b>Card details</b></td><td><b>Mana Pool’s link is live</b>: it opens Mana Pool in a new tab, so the demo stays put, and it is a real thing a visitor can use. <b>Find a deck is drawn disabled</b>: its glyph and words in <code>--fg-locked</code>, no underline, no arrow, a lock, and one line under it: '
           f'<i>{FDN}</i> Not selectable; the line is its description.</td></tr>'
           '<tr><td>6</td><td><b>Written for real</b></td><td>Mutant Menace gets The Wise Mothman’s art in the same band as the commander cards. Selecting anywhere on the card opens it; it ends in <i>Read the whole Overview ›</i>, and opens the <b>full Overview</b> in a modal (desktop) or sheet (phone): game plan, keep in hand, weak spots, lands, the box’s other commander, then a foot with the launch panel. No link to the precon’s list (A1’s call A stands).</td></tr>'
           '<tr><td>7a</td><td><b>Feature squares</b></td><td>The bullet lists sit at the foot of each square on a desktop, so the four line up whatever the paragraph’s length. From 768 to 1023 the squares go two by two instead of four squeezed across.</td></tr>'
           '<tr><td>7b</td><td><b>Bring your collection</b></td><td><b>Fill (recommended)</b>: at the signed-out width (1300), New to all this? on the left and the four apps on the right, across the section’s full 1120px like every section around it. Centring the 780px column is drawn for comparison.</td></tr>'
           '</table>')
    new = n("Strings (all DRAFT, for /copy-review)",
            "<ul>"
            f"<li>Start card adds <i>It opens full screen.</i></li><li><i>Carry on from step {{n}}</i> · <i>Start over</i> (shipped)</li>"
            f"<li>Step 1 <i>Here are 12 of them.</i> · count <i>12 of {P}’s 2,140 cards</i></li>"
            f"<li>Step 4 line <i>Here are the 7 cards that carry a mark; the key above them says what each mark means.</i> · <i>7 of 99 · the cards with a mark</i> · <i>Show all 99</i> · coach <i>Hover a mark</i></li>"
            "<li>Step 5 line ends <i>…from the first turns to the win.</i></li>"
            "<li>Step 6 <i>The 99 picked 3 swaps, a card in and a card out each, and says why.</i> · <i>3 in · 3 out</i></li>"
            f"<li>Step 7 <i>Three tools, one tab each. Look deeper names the cuts for a deck over 99. Top off fills a deck under 99 from {P}’s cards. Mana Balance checks the lands.</i></li>"
            f"<li>Step 8 <i>Two tabs. The shopping list, cheaper stand-ins first. And Which deck needs it most?, which reads one new card against every deck {P} has.</i></li>"
            f"<li>Card details <i>{FDN}</i></li>"
            "<li>Written for real: <i>Precon Overview · The Wise Mothman</i> · <i>Read the whole Overview ›</i> · foot <i>That’s the whole Overview, free to read. Members see one for almost every precon, and can have one written for their own decks.</i></li>"
            "<li>The end gains a quiet <i>Close</i> beside <i>Start over</i>.</li></ul>")
    gone = n("Gone", "<ul><li>The <i>Like it with your own cards? Tell me at launch</i> foot on every step: <i>Skip to the end</i> is pinned now, and the end carries the launch panel.</li>"
             "<li>The mark instruction, the tab instruction (twice), and the old step lines for 1, 4, 6, 7 and 8.</li>"
             "<li>The inline stage at every width (handoff call 4’s frame): the section keeps only the start card.</li></ul>")
    states = n("States", "<ul><li><b>Open:</b> Start loads the data as today (Loading with the sweep), then opens the dialog on step 1. A failed load stays on the start card with the shipped line.</li>"
               "<li><b>Close:</b> ✕, Escape, or the browser’s Back (the dialog pushes one history entry). Focus returns to the section’s main press.</li>"
               "<li><b>Resume:</b> closed mid-way, the section reads <i>Carry on from step N</i> + <i>Start over</i> until the page reloads. Closed from the end: <i>Start</i> again.</li>"
               "<li><b>Card details</b> open over the dialog (sheet on a phone); closing them returns to the step.</li>"
               "<li><b>Reduced motion:</b> the dialog appears without the rise.</li>"
               "<li><b>Themes:</b> the dialog reads only shipped tokens; board A2-Themes draws step 4 in all six.</li></ul>")
    body = (board_head(T, "Landing and See it work: the calls",
                       "Hugh walked the preview. Seven asks, layout and UX only: engineering is fixing the mock deviations, crops, hover, overflow, 404s and copy separately. "
                       f"The demo’s player is the shipped fixture’s, <b>{P}</b>. Words an AI tool writes stay stand-ins.")
            + frames(col(tbl, w=1180), col(new, gone, states, w=640), gap=40))
    return doc("Landing A2 · calls", body, 1980)


def demo_phone():
    tall4 = modal_p(3, tall=True)
    fs = frames(
        frame("<b>The section</b> · start card (390)", section_card(False), cap="Start opens the dialog. The stage is never drawn inline again."),
        frame("<b>Step 1</b> · 12 cards", modal_p(0), cap="Bar and ✕ pinned at the top, Back/Next at the foot. The words and the app scroll between them."),
        frame("<b>Step 4</b> · top of the step", modal_p(3), cap="Next lands here, at the top, with focus on the heading. The coach rings a card, its label below the row: the key stays clear."),
        frame("<b>Step 4</b> · the whole step, unrolled", tall4, cap="What scrolls under the bars: the key, the 7 marked rows, the Sol Ring note."),
        gap=36)
    fs2 = frames(
        frame("<b>Step 5</b> · Analysis and Overview", modal_p(4)),
        frame("<b>Step 6</b> · 3 swaps", modal_p(5)),
        frame("<b>Step 7</b> · Look deeper (Giada, 2 over)", modal_p(6), cap="No coach on the tabs; the line names them."),
        frame("<b>Step 7</b> · Top off tab (Zimone, 3 open)", modal_p(6, app=s_to99(False, "top"))),
        gap=36)
    fs3 = frames(
        frame("<b>Step 8</b>", modal_p(7)),
        frame("<b>Card details</b> over step 1", modal_p(0, over=card_sheet()), cap="Item 5, at 390. Board A2-Card-Details has both widths."),
        frame("<b>The end</b> · invite-only (today)", end_p()),
        frame("<b>The end</b> · after launch, sign-up open", end_p(open_=True), cap="The hero’s open state: <i>Make your free account</i> takes the launch list’s place. Start over and Close stay."),
        frame("<b>Closed at step 4</b> · the section", section_card(False, resume=4), cap="Until the page reloads."),
        gap=36)
    body = (board_head(T, "See it work, full screen · phone",
                       "Items 1, 2 and 4 at 390. The dialog covers the screen: the step header and Back/Next never scroll away.")
            + fs + gapv(30) + fs2 + gapv(30) + fs3)
    return doc("Landing A2 · demo phone", body, 2300)


def demo_tablet():
    a = frame("<b>768 × 1024</b> · step 4, one column", modal_p(3, w=768, h=1024),
              cap="The phone’s column, centred at 680px. Back and Next pinned at the foot, right-aligned.")
    b = frame("<b>768 × 1024</b> · step 7", modal_p(6, w=768, h=1024))
    c = frame("<b>1024 × 768</b> · step 5, two columns", modal_w(4, 1024, 768, app=s_analysis(False)),
              cap="From 1024 the words take a 320px column with Back and Next under them; only the app side scrolls.")
    body = (board_head(T, "See it work, full screen · tablet",
                       "Item 1’s tablet widths. Below 1024 the demo keeps one column; the two-column split starts at 1024.")
            + frames(a, b, gap=40) + gapv(30) + frames(c, gap=40))
    return doc("Landing A2 · demo tablet", body, 1700)


def demo_desktop():
    a = frame("<b>1440 × 900</b> · step 4, hovering a mark", modal_w(3, app=s_deck(True, hover=True)),
              cap="The coach rings Jeska’s Will’s bolt with <i>Hover a mark</i> to its right. Hovering shows the shipped tooltip. The key above stays clear.")
    b = frame("<b>1440 × 900</b> · step 5, with room", modal_w(4),
              cap="Item 3: four cells in a row; the Overview’s lead at reading width; Early, Mid and Close side by side.")
    c = frame("<b>1440 × 900</b> · step 7, Look deeper", modal_w(6))
    d_ = frame("<b>1440 × 900</b> · card details over step 1", modal_w(0, over=card_modal()),
               cap="Item 5: Mana Pool’s link is live (new tab); Find a deck is drawn disabled, with its one line.")
    e = frame("<b>1440 × 900</b> · the end, invite-only (today)", end_p(w=1440))
    e2 = frame("<b>1440 × 900</b> · the end, after launch", end_p(w=1440, open_=True),
               cap="Sign-up open: the hero’s open state replaces the launch list, the same swap the hero makes on launch day.")
    body = (board_head(T, "See it work, full screen · desktop",
                       "Items 1 to 5 at 1440. The words column holds the step and Back/Next; the app side scrolls under the pinned bar.")
            + frames(a, b, gap=50) + gapv(30) + frames(c, d_, gap=50) + gapv(30) + frames(e, gap=50) + gapv(30) + frames(e2, gap=50))
    return doc("Landing A2 · demo desktop", body, 3100)


def card_details():
    ph_on = modal_p(0, over=card_sheet(off=True), scr=False)
    dk = modal_w(0, w=1300, h=820, over=card_modal(), scr=False)
    spec = n("Find a deck, disabled", "<ul>"
             "<li>The shipped door (<code>fits-door.tsx</code>): the two-diamond glyph and <i>Find a deck for it</i>. Disabled, the glyph’s outline and the words take <code>--fg-locked</code>, the underline and the arrow go, and the shipped lock glyph (the tab bar’s, from first run) follows the words.</li>"
             f"<li>One line under it, mono 10.5px <code>--fg-muted</code>: <i>{FDN}</i></li>"
             "<li><code>aria-disabled</code>, described by the line; no hover change, nothing to select. On a phone it keeps its 44px row so the line has room.</li></ul>")
    mp = n("Mana Pool’s link", "<ul><li>The shipped <code>ExternalLink</code>, <i>Buy any printing at Mana Pool</i>, with the box-and-arrow icon. "
           "<b>Live:</b> it opens in a new tab like everywhere in the app, so the demo never leaves the page. Drawing it inert would be a link that lies.</li>"
           "<li>Phone: in flow under the hairline, then Find a deck. Desktop: stacked at the left of the foot, the counter at the right, as shipped.</li></ul>")
    body = (board_head(T, "Card details in the demo", "Item 5. The demo’s read-only card dialog gains its two foot links back: one works, one shows what members get.")
            + frames(frame("<b>Phone</b> · sheet over step 1", ph_on), frame("<b>Desktop</b> · modal over step 1", dk), col(mp, spec, w=420), gap=40))
    return doc("Landing A2 · card details", body, 2340)


def written_layout():
    w390 = frame("<b>390</b> · Written for real", L.lp(written2(False), False))
    w390o = frame("<b>390</b> · selected: the full Overview (sheet)", L.lp(written2(False) + overview_full(False), False, h=844),
                  cap="The shipped Overview sheet, read only: header, ✕, the precon line, then the sections. It scrolls; a swipe down closes it.")
    w390u = frame("<b>390</b> · the sheet, unrolled", overview_full(False, unrolled=True),
                  cap="What scrolls. Only The Wise Mothman has an image on this canvas; the other cards draw the shipped no-art form here. Live, every named card has its image.")
    wd = frame("<b>1300</b> · Written for real", L.lp(written2(True), True))
    wdo = frame("<b>1300</b> · selected: the full Overview (modal)", L.lp(written2(True, pressed=True) + overview_full(True, h=900), True, h=900),
                cap="The shipped Overview modal (ModalChrome, 700 wide) over the page.")
    wdu = frame("<b>700</b> · the modal, unrolled", overview_full(True, unrolled=True),
                cap="Same sections as a member’s precon Overview: Game plan as Early, Mid, Close with the alternate commander, the land figure, Key tips, Key cards, Weaknesses with severity. The dashed block is the landing’s only addition.")
    body = (board_head(T, "Written for real: Mutant Menace, whole",
                       "Item 6. The precon card gets its commander’s art like the other two, and selecting it opens the shipped precon Overview, whole, as a teaser.")
            + frames(w390, w390o, w390u, gap=40) + gapv(30) + frames(wd, gap=40) + gapv(30) + frames(wdo, wdu, gap=40))
    return doc("Landing A2 · written", body, 2400)


def layout():
    t = frame("<b>1300 · today</b> · the bullets follow each paragraph", L.lp(loop3("today"), True))
    a = frame("<b>1300 · A2</b> · the bullets at each square’s foot", L.lp(loop3("bot"), True))
    tb = frame("<b>768 · A2</b> · two by two", L.lp(loop3("t2"), True).replace('class="lp d"', 'class="lp d" style="width:768px"'))
    b0 = frame("<b>1300 · today</b>", L.lp(bring3("today"), True))
    b1 = frame("<b>1300 · fill (recommended)</b> · two columns across 1120px", L.lp(bring3("fill"), True))
    b2 = frame("<b>1300 · centre</b> · for comparison", L.lp(bring3("center"), True))
    body = (board_head(T, "Two layout fixes on the page", "Item 7. (a) the four feature squares; (b) Bring your collection at the signed-out width.")
            + frames(t, gap=40) + gapv(20) + frames(a, tb, gap=40) + gapv(40) + frames(b0, gap=40) + gapv(20) + frames(b1, gap=40) + gapv(20) + frames(b2, gap=40))
    return doc("Landing A2 · layout", body, 2260)


def themes():
    fs = "".join(frame(f"<b>{nm}</b>", f'<div class="{"lpwrap"}">{modal_p(3, theme="th-" + k, scr=False)}</div>') for k, nm in TH_NAMES)
    dk = "".join(frame(f"<b>{nm}</b> · desktop", modal_w(4, 1300, 760, theme="th-" + k, scr=False)) for k, nm in TH_NAMES[1:3])
    body = (board_head(T, "The dialog in all six themes", "Step 4 at 390, and step 5 at desktop in two more, read from each theme’s own tokens and display face. Nothing is new to globals.css.")
            + f'<div class="frames" style="gap:28px;flex-wrap:wrap;max-width:2500px">{fs}</div>' + gapv(30) + frames(dk, gap=40))
    return doc("Landing A2 · themes", body, 2780)


def _sel(t):
    for a, b in (("Pressing", "Selecting"), ("pressing", "selecting"), ("Pressed", "Selected"), ("pressed", "selected"), ("Press", "Select"), ("press", "select")):
        t = t.replace(a, b)
    return t


def selectify(fn):
    def run():
        parts = re.split(r"(<[^>]*>)", fn())
        return "".join(x if x.startswith("<") else _sel(x) for x in parts)
    return run


BOARDS = [
    ("A2-Calls", calls, "A2 · The calls"),
    ("A2-Demo-Phone", demo_phone, "A2 · See it work, full screen · phone"),
    ("A2-Demo-Tablet", demo_tablet, "A2 · See it work · tablet"),
    ("A2-Demo-Desktop", demo_desktop, "A2 · See it work · desktop"),
    ("A2-Card-Details", card_details, "A2 · Card details in the demo"),
    ("A2-Written", written_layout, "A2 · Written for real"),
    ("A2-Layout", layout, "A2 · Feature squares, Bring your collection"),
    ("A2-Themes", themes, "A2 · Six themes"),
]
BOARDS = [(n, selectify(f), t) for n, f, t in BOARDS]
