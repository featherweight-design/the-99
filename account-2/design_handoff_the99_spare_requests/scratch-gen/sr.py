"""Spare requests R1 (account 2, 2026-10-22): the pieces.

Drawn over the shipped pages in Low Sun (amonkhet) tokens. Reuses the menu-and-Home kit (kit.py, parts.py: shell,
feed row, /friends, Home, Settings) and adds the deck page's Shopping and All rows (decklist-row.tsx, one-line form),
the other-ways press and spare glyph (spare-markers.tsx), the spares modal (receipt-modal.tsx ModalChrome +
friend-spares.tsx FriendSpareSection) and the all-decks cart (cart-view.tsx, cart-line.tsx, view-switch.tsx).
Every string is shipped copy or a placeholder for /copy-review.
"""
import kit
import parts as P
from kit import img, ico

kit.CSS += r"""
/* ---------------- deck page (shipped, redrawn) ---------------- */
.dtb{display:flex;gap:22px;padding:0 16px;border-bottom:1px solid var(--border);white-space:nowrap;overflow:hidden;flex:none}
.dtb span{padding:14px 0 12px;font:500 15px 'IBM Plex Sans';color:var(--fg-muted);display:flex;gap:5px;align-items:baseline}
.dtb span em{font:normal 11.5px 'IBM Plex Mono';color:var(--fg-faint);font-style:normal}
.dtb span.on{color:var(--fg);box-shadow:inset 0 -2px 0 var(--accent)}
.dtb span.on em{color:var(--accent)}
.dpb{padding:14px 16px 24px;display:flex;flex-direction:column;gap:12px}
.seg4{display:flex;align-items:center;border:1px solid var(--border-strong);border-radius:12px;padding:4px;gap:2px}
.seg4 span{flex:1;height:38px;display:flex;align-items:center;justify-content:center;gap:5px;border-radius:8px;font:500 14px 'IBM Plex Sans';color:var(--fg-muted);white-space:nowrap}
.seg4 span em{font:normal 11.5px 'IBM Plex Mono';font-style:normal;color:var(--fg-faint)}
.seg4 span.on{background:var(--elevated);color:var(--fg)}
.seg4 span.shp{color:var(--accent)}
.seg4 span.shp em{color:var(--accent)}
.seg4 i{width:1px;height:24px;background:var(--border-strong);flex:none;margin:0 4px}
.tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.sw2{display:flex;border:1px solid var(--border-strong);border-radius:10px;padding:3px;gap:2px}
.sw2 span{height:32px;padding:0 13px;display:flex;align-items:center;border-radius:7px;font:500 13px 'IBM Plex Sans';color:var(--fg-muted);white-space:nowrap}
.sw2 span.on{background:var(--elevated);color:var(--fg)}
.sel{height:38px;padding:0 14px;border-radius:999px;border:1px solid var(--border-strong);background:var(--surface-raised);display:flex;align-items:center;gap:8px;font:500 13px 'IBM Plex Sans';color:var(--fg)}
.sel i{font-style:normal;font-size:10px;color:var(--fg-muted)}
.lock{height:38px;padding:0 12px;border-radius:10px;border:1px solid var(--border-strong);display:flex;align-items:center;gap:8px;font:12px 'IBM Plex Mono';color:var(--fg-body)}
.ckb{border:1px solid var(--border-strong);border-radius:12px;padding:14px 14px 12px;display:flex;flex-direction:column;gap:6px}
.ckb b{font:600 16px 'IBM Plex Mono';color:var(--fg)}
.ckb small{font:10.5px/1.6 'IBM Plex Mono';color:var(--fg-faint)}
.ckb u{font:500 13.5px 'IBM Plex Sans';color:var(--accent-text);text-underline-offset:3px;margin-top:6px}
.lim{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--fg-body)}
.lim b{font:600 13.5px 'IBM Plex Mono';color:var(--fg);border-bottom:1.5px dotted var(--accent)}
.lim .df{font:9.5px 'IBM Plex Mono';letter-spacing:.12em;color:var(--fg-faint);border:1px solid var(--border-strong);border-radius:999px;padding:2px 8px}
.lim small{font:11.5px 'IBM Plex Mono';color:var(--fg-faint)}
.key{display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;padding:2px 0 10px}
.dk .key{display:flex;flex-wrap:wrap;gap:6px 22px;padding:0 4px}
.key>span{display:flex;align-items:center;gap:7px;font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap}
.key .kg{width:18px;display:flex;justify-content:center;flex:none}
.key .new{outline-offset:2px;border-radius:4px}
.key .kf{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px 16px;padding-top:6px;border-top:1px solid var(--border)}
.dk .key .kf{padding:0 0 0 18px;border-top:0;border-left:1px solid var(--border)}
.key .kf>span{display:flex;align-items:center;gap:6px}
.lead{font-size:13.5px;line-height:1.5;color:var(--fg-body);border-top:1px solid var(--border);padding-top:12px}
.dk .lead{border:0;padding:0}
.grp h4{margin:4px 0 8px;font:600 14.5px 'IBM Plex Sans';color:var(--fg);display:flex;gap:7px;align-items:baseline}
.grp h4 em{font:normal 11.5px 'IBM Plex Mono';font-style:normal;color:var(--fg-faint)}
.grp .rows{display:flex;flex-direction:column;gap:4px}
.dk .grp .rows{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px}
.dk .grp h4{border-bottom:1px solid var(--border);padding-bottom:8px}
.tobuy{border-top:1px solid var(--border);padding-top:12px;font:11.5px 'IBM Plex Mono';color:var(--fg-faint)}
/* the one-line card row (decklist-row.tsx) */
.cr{--row-bg:var(--surface-rail);display:flex;align-items:center;gap:8px;height:34px;padding:0 0 0 10px;border-radius:8px;background:var(--row-bg);font-size:14px;position:relative}
.cr .ow{width:8px;height:8px;border-radius:50%;flex:none;background:var(--success)}
.cr .ow.no{background:transparent;border:1.4px dashed var(--fg-faint)}
.cr .nm{flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--fg)}
.cr .pt{flex:none;width:72px;display:flex;justify-content:flex-end}
.cr .x{flex:none;width:30px;align-self:stretch;display:flex;align-items:center;justify-content:center;color:var(--fg-locked);font-size:13px}
.cr.lit{outline:2px solid var(--accent);outline-offset:1px}
.cr .tap{position:absolute;width:22px;height:22px;border-radius:50%;background:rgba(240,230,210,.22);border:1.5px solid rgba(240,230,210,.7);top:6px}
.mpip{width:13px;height:13px;border-radius:50%;display:inline-block}
.mnum{width:13px;height:13px;border-radius:50%;background:#C9C1B0;color:#14110E;font:600 8.5px/13px 'IBM Plex Mono';text-align:center;display:inline-block}
/* buy tag (buy-tag.tsx, row variant) */
.bt2{flex:none;display:inline-flex;align-items:center;gap:8px;height:20px;padding:0 7px;border-radius:4px;font:11px 'IBM Plex Mono';color:var(--warning);background:color-mix(in oklab,var(--warning) 13%,transparent)}
.bt2 .p{color:var(--fg-body);min-width:44px;text-align:right}
.bt2.ov{background:transparent;box-shadow:inset 0 0 0 1.5px var(--warning)}
.bt2.g{padding:0 5px;gap:0}
.slot84{width:96px;display:flex;justify-content:flex-end;flex:none}
/* the other-ways press (spare-markers.tsx OtherWaysPress, one-line form) */
.owp{flex:none;height:26px;display:flex;align-items:center;gap:6px;padding:0 7px;border-radius:6px;border:1px solid var(--border-strong);background:transparent}
.owp .sw{font:14px 'IBM Plex Mono';color:var(--warning);line-height:1}
.sg{position:relative;display:inline-flex;color:var(--fact)}
.sg.asked::after{content:'';position:absolute;right:-3px;top:-2px;width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 1.5px var(--row-bg,var(--bg))}
.sg.yes{color:var(--success)}
.sg.yes::after{content:'';position:absolute;right:-4px;bottom:-1px;width:8px;height:8px;border-radius:50%;background:var(--success);box-shadow:0 0 0 1.5px var(--row-bg,var(--bg))}
.sg.yes::before{content:'';position:absolute;right:-1.5px;bottom:2px;width:3.5px;height:2px;border-left:1.3px solid #14110E;border-bottom:1.3px solid #14110E;transform:rotate(-45deg);z-index:1}
/* ---------------- the spares modal (ModalChrome + FriendSpareSection) ---------------- */
.scrim{position:absolute;inset:0;background:color-mix(in oklab,var(--bg) 72%,transparent);z-index:30}
.mdl{position:absolute;z-index:31;left:50%;transform:translateX(-50%);width:640px;background:var(--surface-raised);border:1px solid var(--border-strong);border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.6);display:flex;flex-direction:column;overflow:hidden}
.sht{position:absolute;z-index:31;left:0;right:0;bottom:0;top:52px;background:var(--surface-raised);border-top:1px solid var(--border-strong);border-radius:14px 14px 0 0;box-shadow:0 -14px 40px rgba(0,0,0,.6);display:flex;flex-direction:column;overflow:hidden}
.mh{display:flex;align-items:center;gap:10px;min-height:43px;padding:0 4px 0 16px;border-bottom:1px solid var(--border)}
.mh b{flex:1;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.mdl .mh b{font-size:16px}
.mh .x{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:15px}
.mb{display:flex;flex-direction:column;gap:12px;padding:14px 16px 24px}
.mdl .mb{gap:14px;padding:16px 18px 18px}
.rep{border:1px solid var(--border);border-radius:10px;background:var(--bg);padding:11px 13px 12px;display:flex;flex-direction:column;gap:6px}
.rep .k{font:9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.rep .ln{display:flex;align-items:center;gap:9px}
.rep .th{width:22px;height:31px;border-radius:2px;overflow:hidden;flex:none}
.rep .th img{width:100%;height:100%;object-fit:cover;display:block}
.rep .r7{width:7px;height:7px;border-radius:50%;border:1px dashed var(--fg-faint);flex:none}
.rep .cn{font:600 14px 'IBM Plex Sans';color:var(--fg);border-bottom:1px dotted var(--accent)}
.rep .ov{font:11px 'IBM Plex Mono';color:var(--warning)}
.rep .jb{font:11px 'IBM Plex Mono';color:var(--fg-body)}
.fsx2{display:flex;flex-direction:column}
.fsx2 .h{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:6px;font:10.5px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.fsx2 .h small{letter-spacing:0;text-transform:none;font-size:11.5px}
.fsr{display:flex;align-items:center;gap:12px;padding:9px 0;min-height:52px}
.fsr .nm{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.fsr .nm b{font:600 15px 'IBM Plex Sans';color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fsr .nm span{font:11.5px/1.45 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fsr .nm span em{font-style:normal;color:var(--fact)}
.ask{flex:none;height:32px;min-width:64px;padding:0 14px;border-radius:8px;border:1px solid var(--accent);color:var(--accent-text);display:flex;align-items:center;justify-content:center;font:600 13px 'IBM Plex Sans';white-space:nowrap}
.ph .ask{height:36px;border-radius:9px}
.ask.alt{border-color:var(--border-strong);color:var(--fg-body);font-weight:500}
.fst{flex:none;display:inline-flex;align-items:center;gap:6px;font:500 13px 'IBM Plex Sans';color:var(--accent-text);white-space:nowrap}
.fst i{width:7px;height:7px;border-radius:50%;background:var(--accent)}
.fst.ok{color:var(--success)} .fst.ok i{width:auto;height:auto;background:none;border-radius:0;font-style:normal;font-size:12px}
.fst.no{color:var(--fg-muted)} .fst.no i{background:var(--fg-faint)}
.fst.wt{font:11.5px 'IBM Plex Mono';color:var(--fg-faint)}
.fsx2 .h .ii{position:relative;width:18px;height:18px;margin-left:6px;border-radius:50%;border:1px solid var(--border-strong);display:inline-flex;align-items:center;justify-content:center;font:italic 600 11px 'IBM Plex Serif',serif;letter-spacing:0;text-transform:none;color:var(--fg-muted)}
.fsx2 .h .ii.on{border-color:var(--accent);color:var(--accent-text)}
.fsx2 .h .lft{display:flex;align-items:center}
.fsx2{position:relative}
.tip{position:absolute;z-index:3;left:0;top:26px;width:min(300px,100%);padding:10px 12px;border-radius:9px;background:var(--elevated);border:1px solid var(--border-strong);box-shadow:0 8px 24px rgba(0,0,0,.35);font:12.5px/1.5 'IBM Plex Sans';color:var(--fg-body);letter-spacing:0;text-transform:none}
.fsx2 .ft{margin-top:4px;font-size:12.5px;line-height:1.5;color:var(--fg-muted);text-wrap:pretty}
.fsx2 .ft b{color:var(--fg-body);font-weight:500}
.sti{margin-top:4px;padding-top:12px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:8px}
.sti p{font-size:13px;line-height:1.55;color:var(--fg-body)}
.sti .h{font:10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);display:flex;justify-content:space-between}
.sti .h small{text-transform:none;letter-spacing:0}
.str{display:flex;align-items:center;gap:9px;font-size:14px}
.str .th{width:22px;height:31px;border-radius:2px;background:var(--surface-sunken);border:1px solid var(--border);flex:none}
.str .cn{flex:1;font-weight:600;border-bottom:1px dotted var(--accent);color:var(--fg)}
.str .tk{height:30px;padding:0 12px;border-radius:7px;border:1px solid var(--accent);color:var(--accent-text);display:flex;align-items:center;font:600 13px 'IBM Plex Sans'}
.fadeb{height:40px;margin-top:-40px;position:relative;background:linear-gradient(to bottom,transparent,var(--surface-raised))}
/* note option */
.nt{border:1px solid var(--border-strong);border-radius:10px;background:var(--bg);padding:10px 12px;display:flex;flex-direction:column;gap:8px;margin:2px 0 6px 42px}
.nt .ta{min-height:58px;border-radius:8px;border:1px solid var(--border-strong);background:var(--surface-sunken);padding:9px 11px;font-size:13.5px;color:var(--fg-faint)}
.nt .rw{display:flex;align-items:center;gap:8px}
.nt .rw small{flex:1;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.nt .bp{height:36px;font-size:13px;border-radius:9px}
.nt .bg{height:36px;font-size:13px;border-radius:9px}
/* toast (ToastFrame) */
.toast{position:absolute;z-index:45;left:16px;right:16px;display:flex;align-items:center;gap:10px;padding:12px 6px 12px 14px;border-radius:12px;background:var(--elevated);border:1px solid var(--border-strong);box-shadow:0 14px 30px rgba(0,0,0,.55);font-size:13.5px;color:var(--fg)}
.toast i{width:8px;height:8px;border-radius:50%;background:var(--danger);flex:none}
.toast span{flex:1}
.toast b{width:36px;height:36px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-weight:400}
/* ---------------- the all-decks cart (cart-view.tsx) ---------------- */
.ch{display:flex;flex-direction:column;gap:4px;padding:16px 16px 12px;border-bottom:1px solid var(--border)}
.dk .ch{padding:18px 22px 14px}
.ch .bk{font:13px 'IBM Plex Sans';color:var(--accent-text)}
.ch h1{margin:4px 0 0;font:700 22px 'Cinzel',serif}
.ch small{font:11.5px 'IBM Plex Mono';color:var(--fg-faint)}
.cg{display:grid;grid-template-columns:1fr;gap:12px;padding:12px 16px}
.dk .cg{grid-template-columns:280px minmax(0,1fr);gap:24px;padding:18px 22px}
.dsel{border:1px solid var(--border);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:4px}
.dsel .h{display:flex;justify-content:space-between;font:10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);padding-bottom:4px}
.dsel .h u{text-transform:none;letter-spacing:0;font:12px 'IBM Plex Sans';color:var(--accent-text);text-decoration:none}
.dsel .d{display:flex;align-items:center;gap:9px;min-height:36px;font-size:13px;color:var(--fg)}
.dsel .d .dn{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsel .d small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.dsel .box{width:18px;height:18px;margin:0}
.ctl{display:flex;flex-direction:column;gap:10px}
.ctl .r{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.ctl .r .key{display:flex;gap:6px 14px;padding:0}
.ctl h2{margin:0;font:10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.vs{display:flex;border:1px solid var(--border-strong);border-radius:9px;padding:3px;gap:2px}
.vs span{height:28px;padding:0 11px;display:flex;align-items:center;border-radius:6px;font:500 12.5px 'IBM Plex Sans';color:var(--fg-muted);white-space:nowrap}
.vs span.on{background:var(--elevated);color:var(--fg)}
.fg{margin-top:14px;border:1px solid var(--border-strong);border-radius:12px;overflow:hidden;background:var(--bg)}
.fg .fh{display:flex;align-items:center;gap:11px;padding:10px 14px;background:var(--elevated);border-bottom:1px solid var(--border-strong)}
.fg .fh .nm{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.fg .fh b{font:600 15px 'IBM Plex Sans';color:var(--fg)}
.fg .fh span{font:11px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fg .fh small{flex:none;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.fg .cl{padding:11px 14px}
.cl{display:flex;align-items:flex-start;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)}
.cl:last-child{border-bottom:0}
.cl .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.cl .t b{font:400 14px/1.4 'IBM Plex Sans';color:var(--fg);border-bottom:1px dotted var(--border-strong);align-self:flex-start}
.cl .t span{font:11px/1.5 'IBM Plex Mono';color:var(--fg-muted)}
.cl .t span.f{color:var(--fg-faint)}
.cl .rt{display:flex;align-items:center;gap:10px;flex:none;margin-top:1px}
.cl{align-items:center}
.cl .ask{height:28px;min-width:56px;border-radius:7px;font-size:12.5px;padding:0 12px}
.ph .cl .ask{height:32px}

/* ---------------- /friends: Your asks ---------------- */
.fi .ac .ask{height:36px}
.fi .xx{position:absolute;right:4px;top:6px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:13px}
.fi .kd.ok{color:var(--success)}
.fi .kd.ac2{color:var(--accent-text)}
.fi.rc{background:color-mix(in oklab,var(--success) 6%,var(--surface-inset))}
.fi.rc .tt{color:var(--fg)}
.ya .fi .kr small{margin-right:30px}
.dk .ya .fi{grid-template-columns:46px minmax(0,1fr) auto}
.dk .ya .fi .ac{margin:0;align-self:center;padding-right:34px}
.dk .fi .ac.yn2{margin:0}
/* labels on the board */
.cbx{display:flex;flex-direction:column;gap:10px}
.stt{width:390px;border:1px solid var(--border-strong);border-radius:14px;background:var(--surface-raised);padding:12px 16px 10px}
.flow{display:flex;gap:14px;align-items:stretch;max-width:1500px}
.flow .st{flex:1;border:1px solid var(--border-strong);border-radius:12px;background:#15120F;padding:14px 16px;display:flex;flex-direction:column;gap:6px}
.flow .st b{font:600 13.5px 'IBM Plex Sans';color:var(--fg)}
.flow .st span{font-size:12.5px;line-height:1.55;color:var(--fg-body)}
.flow .st em{font:normal 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.flow .ar{display:flex;align-items:center;color:var(--fg-faint);font-size:18px}
"""

SPARE_SVG = ('<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
             'stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/>'
             '<circle cx="16.5" cy="9.5" r="2.6"/><path d="M15.5 14.2c2.6-.3 4.6 1.3 5.1 4.3"/></svg>')


def sg(state="spare", size=16):
    cls = {"spare": "", "asked": " asked", "yes": " yes"}[state]
    return f'<span class="sg{cls}">{SPARE_SVG.format(s=size)}</span>'


# ---------------------------------------------------------------- fixtures
ME = "Sam"
DECK = "Thopter Works"
CMD = "Sai, Master Thopterist"
FACE = {"Colin": "face-sai.jpg", "Peter": "face-captain-america.jpg", "Max": "face-ghalta.jpg", "Chris": "face-giada.jpg"}
POD = {"Colin": "Thursday pod", "Peter": "Thursday pod", "Max": "Cube night", "Chris": "Thursday pod, Cube night"}

# Shopping: (name, image, group, price, over, standin, spare-state or None, cost pips)
SHOP = [("Jace, Multiverse Architect", "jace.jpg", "Planeswalkers", "$8.40", True, True, "asked", ["c3", "u"]),
        ("Ghoulcaller Gisa", "gisa.jpg", "Creatures", "$4.75", False, False, "yes", ["c3", "b"]),
        ("Killian, Decisive Mentor", "killian.jpg", "Creatures", "$3.10", False, False, None, ["c1", "w", "b"]),
        ("Quintorius Kand", "quintorius.jpg", "Creatures", "$2.30", False, False, None, ["c3", "r", "w"]),
        ("Dina, Essence Brewer", "dina.jpg", "Creatures", "$1.20", False, False, "spare", ["b", "g"])]


def mana(ps):
    o = []
    for p in ps:
        o.append(f'<span class="mnum">{p[1:]}</span>' if p.startswith("c") else f'<span class="mpip" style="background:var(--{p})"></span>')
    return '<span style="display:inline-flex;gap:3px;align-items:center">' + "".join(o) + "</span>"


def buytag(price, over=False, glyph=False):
    if glyph:
        return '<span class="bt2 g">$</span>'
    return f'<span class="bt2{" ov" if over else ""}">buy<span class="p">{price}</span></span>'


def press(standin=False, spare=None, new=False, lit=False):
    if not standin and not spare:
        return ""
    inner = ('<span class="sw">⇄</span>' if standin else "") + (sg(spare) if spare else "")
    style = ' style="outline:2px solid var(--accent);outline-offset:2px"' if lit else ""
    return f'<span class="owp{" new" if new else ""}"{style}>{inner}</span>'


def shop_row(r, desk=False, new_marks=True, lit=False, tap=False, override=None):
    name, im, grp, price, over, standin, spare, cost = r
    if override is not None:
        spare = override
    nw = new_marks and spare in ("asked", "yes")
    pr = press(standin, spare, nw, lit)
    tp = '<span class="tap" style="right:146px"></span>' if tap else ""
    return (f'<div class="cr"><span class="ow no"></span><span class="nm">{name}</span>{pr}'
            f'{buytag(price, over)}<span class="x">✕</span>{tp}</div>')


def all_row(name, cost, owned, spare=None, new=False, lit=False):
    pr = press(False, spare, new, lit) if (spare and not owned) else ""
    tag = buytag("", glyph=True) if not owned else ""
    return (f'<div class="cr"><span class="ow{"" if owned else " no"}"></span><span class="nm">{name}</span>'
            f'<span class="pt">{mana(cost)}</span>{pr}{tag}<span class="x">✕</span></div>')


KEY_SHOP = [("buy", "press to add", False), ("over", "over $5", False), ("⇄", "cheaper stand-ins", False),
            ("spare", "friend has a spare", False), ("asked", "requested", True), ("yes", "accepted", True)]


def key_item(g, t, new):
    if g == "⇄":
        k = '<span class="kg" style="color:var(--warning);font-size:15px;line-height:1">⇄</span>'
    elif g in ("spare", "asked", "yes"):
        k = f'<span class="kg">{sg(g)}</span>'
    elif g == "buy":
        k = '<span class="bt2" style="padding:0 4px;height:17px">buy</span>'
    elif g == "over":
        k = '<span class="bt2 ov" style="padding:0 4px;height:17px">buy</span>'
    elif g == "$":
        k = '<span class="bt2 g" style="height:17px">$</span>'
    else:
        k = f'<span class="kg" style="color:#E8D9A8">{g}</span>'
    return f'<span class="{"new" if new else ""}">{k}{t}</span>'


FRIEND_MARKS = ("spare", "asked", "yes")


def key(items):
    rest = "".join(key_item(*i) for i in items if i[0] not in FRIEND_MARKS)
    fr = "".join(key_item(*i) for i in items if i[0] in FRIEND_MARKS)
    return f'<div class="key">{rest}<span class="kf">{fr}</span></div>'



def deck_tabs():
    tabs = [("Your deck", "99", True), ("Analysis", "", False), ("Consider", "89", False), ("Games", "5", False), ("Versions", "3", False)]
    return '<div class="dtb">' + "".join(f'<span class="{"on" if o else ""}">{t}{f"<em>{n}</em>" if n else ""}</span>' for t, n, o in tabs) + "</div>"


def seg(on="Shopping", n_shop=5):
    a = "on" if on == "All" else ""
    s = "on shp" if on == "Shopping" else "shp"
    return (f'<div class="seg4"><span class="{a}">All<em>99</em></span><span class="{s}">Shopping<em>{n_shop}</em></span><i></i>'
            '<span>Stats</span><span>Notes<em>2</em></span></div>')


def checkout(total="$19.75"):
    return (f'<div class="ckb"><b>{total}</b><small>single-copy prices on Mana Pool · last checked Thursday · a cart with shipping or fewer packages can cost more</small>'
            '<u>Buy these at Mana Pool ↗</u></div>')


def limit_line():
    return '<div class="lim">Marking cards over <b>$5</b><span class="df">DEFAULT</span><small>· 1 over</small></div>'


def shop_list(desk=False, rows=SHOP, overrides=None, lit=None, tap=None):
    overrides = overrides or {}
    groups = []
    for g in ("Planeswalkers", "Creatures"):
        rs = [r for r in rows if r[2] == g]
        if not rs:
            continue
        body = "".join(shop_row(r, desk, lit=(r[0] == lit), tap=(r[0] == tap), override=overrides.get(r[0])) for r in rs)
        groups.append(f'<div class="grp"><h4>{g}<em>{len(rs)}</em></h4><div class="rows">{body}</div></div>')
    return "".join(groups)


def shopping_page(desk=False, overrides=None, lit=None, tap=None, keyitems=None):
    kk = key(keyitems or KEY_SHOP)
    if not desk:
        return (deck_tabs() + '<div class="dpb">' + seg() +
                '<div class="tools"><span class="sw2"><span class="on">By type</span><span>By role</span></span><span class="sel">Price · Highest <i>▼</i></span></div>'
                + checkout() + limit_line() + kk +
                '<p class="lead">5 cards this deck wants that your collection does not have.</p>'
                + shop_list(False, overrides=overrides, lit=lit, tap=tap) + '<div class="tobuy">5 cards to buy</div></div>')
    head = ('<div style="padding:22px 26px 0"><div style="display:flex;align-items:flex-start;justify-content:space-between">'
            f'<div><h1 style="margin:0;font:700 28px Cinzel,serif">{DECK}</h1><p class="m" style="margin-top:6px;font-size:11.5px;color:var(--fg-faint)">{CMD} · 99 cards · 94 yours</p></div>'
            '<span class="bg">Update from a list</span></div></div>')
    tabs = deck_tabs().replace('class="dtb"', 'class="dtb" style="padding:0 26px;margin-top:10px"')
    tools = ('<div style="display:flex;align-items:center;gap:10px"><div style="width:440px">' + seg() + '</div><span style="flex:1"></span>'
             '<span class="m" style="font-size:11px;color:var(--fg-faint)">94 cards are yours now</span>'
             '<span class="sw2"><span>Cards</span><span class="on">List</span></span><span class="sel">By type <i>▼</i></span></div>')
    return (head + tabs + '<div class="dpb" style="padding:16px 26px 28px;gap:14px">' + tools + checkout().replace("· a cart", "<br>a cart")
            + limit_line() + kk + '<p class="lead">5 cards this deck wants that your collection does not have.</p>'
            + shop_list(True, overrides=overrides, lit=lit, tap=tap) + '<div class="tobuy">5 cards to buy</div></div>')


# ---------------------------------------------------------------- All view
ALL = [("Arcbound Ravager", ["c2"], True, None), ("Dina, Essence Brewer", ["b", "g"], False, "spare"),
       ("Etherium Sculptor", ["c1", "u"], True, None), ("Ghoulcaller Gisa", ["c3", "b"], False, "yes"),
       ("Glint-Nest Crane", ["c1", "u"], True, None), ("Jace, Multiverse Architect", ["c3", "u"], False, "asked"),
       ("Killian, Decisive Mentor", ["c1", "w", "b"], False, None), ("Ornithopter", ["c0"], True, None),
       ("Quintorius Kand", ["c3", "r", "w"], False, None), ("Sai's Thopter Kit", ["c2"], True, None)]
KEY_ALL = [("$", "to buy", False), ("✦", "foil", False), ("spare", "friend has a spare", True),
           ("asked", "requested", True), ("yes", "accepted", True)]


def all_page(desk=False, lit=None):
    rows = "".join(all_row(n, c, o, s, new=bool(s), lit=(n == lit)) for n, c, o, s in ALL)
    kk = key(KEY_ALL)
    if not desk:
        return (deck_tabs() + '<div class="dpb">' + seg("All") +
                '<div class="tools"><span class="lock">' + kit.LOCK + ' Lock cards</span><span style="flex:1"></span>'
                '<span class="sw2"><span class="on">≣</span><span>▦</span></span></div>'
                '<div class="tools"><span class="sw2"><span class="on">By type</span><span>By role</span></span><span class="sel">Name · A–Z <i>▼</i></span></div>'
                + kk + f'<div class="grp"><h4>Artifacts and creatures<em>10</em></h4><div class="rows">{rows}</div></div></div>')
    head = ('<div style="padding:22px 26px 0"><div style="display:flex;align-items:flex-start;justify-content:space-between">'
            f'<div><h1 style="margin:0;font:700 28px Cinzel,serif">{DECK}</h1><p class="m" style="margin-top:6px;font-size:11.5px;color:var(--fg-faint)">{CMD} · 99 cards · 94 yours</p></div>'
            '<span class="bg">Update from a list</span></div></div>')
    tabs = deck_tabs().replace('class="dtb"', 'class="dtb" style="padding:0 26px;margin-top:10px"')
    tools = ('<div style="display:flex;align-items:center;gap:10px"><div style="width:440px">' + seg("All") + '</div><span style="flex:1"></span>'
             '<span class="lock">' + kit.LOCK + ' Lock cards</span><span class="sw2"><span>Cards</span><span class="on">List</span></span><span class="sel">By type <i>▼</i></span></div>')
    return (head + tabs + '<div class="dpb" style="padding:16px 26px 28px;gap:14px">' + tools + kk
            + f'<div class="grp"><h4>Artifacts and creatures<em>10</em></h4><div class="rows">{rows}</div></div></div>')


# ---------------------------------------------------------------- the modal's friend rows
def face(name, size=30, r=8):
    return P.face(FACE[name], size, r)


ASK_FOOT = ("A spare is a copy none of their decks uses, drafts included. <b>Ask, and they answer yes or no.</b> "
            "The rest is between you: offer a trade, or bargain your prized family goat.")


def frow(name, n, state="ask", when="", new=True):
    sp = f'<em>{n} spare{"" if n == 1 else "s"}</em>'
    sub = f"{sp} · {POD[name]}"
    nw = " new" if new else ""
    right = ""
    if state == "ask":
        right = f'<span class="ask{nw}">Ask</span>'
    elif state == "asked":
        right = f'<span class="fst{nw}"><i></i>Requested</span>'
        sub = f"{sp} · 12 days left"
    elif state == "yes":
        right = f'<span class="fst ok{nw}"><i>✓</i>Accepted</span>'
    elif state == "no":
        right = f'<span class="fst no{nw}"><i></i>Declined</span>'
    elif state == "expired":
        right = f'<span class="ask{nw}">Ask again</span>'
        sub = f"{sp} · no answer in 14 days"
    elif state == "held":
        right = f'<span class="ask alt{nw}">Ask instead</span>'
    return f'<div class="fsr">{face(name)}<span class="nm"><b>{name}</b><span>{sub}</span></span>{right}</div>'


SPARE_TIP = "Copies none of their decks use. Ask, and they answer yes or no. The trade (or the goat) is between you."


def fsection(rows, foot_extra="", new=True, tip=False):
    n = len(rows)
    body = "".join(frow(*r) for r in rows)
    ii = f'<span class="ii{" on" if tip else ""}{" new" if new else ""}">i</span>'
    tp = f'<div class="tip">{SPARE_TIP}</div>' if tip else ""
    ft = f'<p class="ft{" new" if new else ""}">{foot_extra}</p>' if foot_extra else ""
    return (f'<section class="fsx2"><div class="h"><span class="lft">Friends with a spare · {n}{ii}</span></div>{tp}{body}{ft}</section>')


def replacing(card, im, price, over=False, deck=None, jobs=None):
    k = f"Replacing, in {deck}" if deck else "Replacing"
    extra = ""
    if over:
        extra += '<span class="ov">over $5</span>'
    if jobs:
        extra += f'<span class="jb">{jobs}</span>'
    return (f'<div class="rep"><span class="k">{k}</span><div class="ln"><span class="th"><img src="{img(im)}" alt=""></span>'
            f'<span class="r7"></span><span class="cn">{card}</span>{buytag(price, over)}</div>{extra}</div>')


def standins_tail():
    return ('<div class="sti"><p>Every card below keeps at least one of Jace’s jobs (draw). Planeswalkers come first, then other types.</p>'
            '<div class="h">Same type · planeswalkers<small>most in common first</small></div></div><div class="fadeb"></div>')


def modal_body(kind, desk=False):
    """kind: dina-ask | jace-asked | gisa-yes | dina-no | dina-expired"""
    if kind.startswith("jace"):
        rep = replacing("Jace, Multiverse Architect", "jace.jpg", "$8.40", True, DECK, "planeswalker · mana value 4 · draw")
        sec = fsection([("Colin", 2, "asked"), ("Max", 1, "held")],
                       "One request at a time. Ask instead moves it from Colin to Max.")
        return "Before you buy", rep + sec + standins_tail()
    if kind.startswith("gisa"):
        rep = replacing("Ghoulcaller Gisa", "gisa.jpg", "$4.75")
        sec = fsection([("Peter", 2, "yes")], "When it’s yours, press buy on the row.")
        return "Friends with a spare", rep + sec
    st = {"dina-ask": "ask", "dina-no": "no", "dina-expired": "expired"}[kind]
    rep = replacing("Dina, Essence Brewer", "dina.jpg", "$1.20")
    rows = [("Chris", 1, st)]
    extra = ""
    if st == "no":
        rows = [("Chris", 1, "no")]
        extra = "Nobody else you know has a spare."
    return "Friends with a spare", rep + fsection(rows, extra)


def modal_html(kind, desk=False, top=70):
    title, body = modal_body(kind, desk)
    if desk:
        return (f'<div class="scrim"></div><div class="mdl" style="top:{top}px"><div class="mh"><b>{title}</b><span class="x">✕</span></div>'
                f'<div class="mb">{body}</div></div>')
    return (f'<div class="scrim"></div><div class="sht"><div class="mh"><b>{title}</b><span class="x">✕</span></div>'
            f'<div class="mb">{body}</div></div>')


# ---------------------------------------------------------------- the all-decks cart, By friend
CART_DECKS = [("Thopter Works", "5 · $19.75"), ("HD - Wizards", "3 · $11.20"), ("Dragons of Tarkir", "2 · $6.15")]
# friend -> lines (card, decks line, price, state)
BYF = [("Colin", "Thursday pod", [("Jace, Multiverse Architect", "1 · Thopter Works", "$8.40", "asked", True),
                                   ("Brainstorm", "2 · HD - Wizards, Dragons of Tarkir", "$1.10", "ask", False)]),
       ("Peter", "Thursday pod", [("Ghoulcaller Gisa", "1 · Thopter Works", "$4.75", "yes", False)]),
       ("Chris", "Thursday pod, Cube night", [("Dina, Essence Brewer", "1 · Thopter Works", "$1.20", "ask", False)]),
       ("Max", "Cube night", [("Jace, Multiverse Architect", "1 · Thopter Works", "$8.40", "held", True)])]


def cline(card, decks, price, state, over):
    if state == "ask":
        r = '<span class="ask new">Ask</span>'
    elif state == "asked":
        r = '<span class="fst new"><i></i>Requested</span>'
    elif state == "yes":
        r = '<span class="fst ok new"><i>✓</i>Accepted</span>'
    else:
        r = '<span class="ask alt new">Ask instead</span>'
    return (f'<div class="cl"><span class="t"><b>{card}</b><span>{decks}</span></span>'
            f'<span class="rt">{r}{buytag(price, False)}</span></div>')


def cart_list():
    out = []
    for name, pod, lines in BYF:
        n = len(lines)
        out.append(f'<div class="fg"><div class="fh">{face(name, 30, 8)}<span class="nm"><b>{name}</b><span>shares with {pod}</span></span>'
                   f'<small>{n} spare{"" if n == 1 else "s"}</small></div>' + "".join(cline(*l) for l in lines) + "</div>")
    return "".join(out)


def cart_page(desk=False):
    head = ('<div class="ch"><span class="bk">‹ Decks</span><h1>Shopping for all decks</h1>'
            '<small>3 of 5 decks are missing cards · brews included</small></div>')
    dsel = ('<div class="dsel"><div class="h">Decks · 3 of 3<u>Unselect all</u></div>'
            + "".join(f'<div class="d"><span class="box on"></span><span class="dn">{d}</span><small>{f}</small></div>' for d, f in CART_DECKS) + "</div>")
    if not desk:
        dsel = '<div class="dsel"><div class="h" style="padding:6px 0">Decks · 3 of 3 selected<u>▾</u></div></div>'
    ck = checkout("$37.10")
    keyrow = f'<span class="key">{key_item("buy", "press to add", False)}</span>'
    vs = '<span class="vs new"><span>By card</span><span>By deck</span><span class="on">By friend</span></span>'
    ctl = (f'<div class="ctl"><div class="r">{vs}{keyrow}</div><h2 class="new">4 friends · 5 spares · most first</h2></div>')
    lst = f'<div class="new" style="outline-offset:6px">{cart_list()}</div>'
    if desk:
        return head + f'<div class="cg"><div style="display:flex;flex-direction:column;gap:14px">{dsel}{ck}</div><section>{ctl}{lst}</section></div>'
    return head + f'<div class="cg">{ck}{dsel}{ctl}{lst}</div>'


# ---------------------------------------------------------------- feed items for this round
def items():
    I = ORIG_ITEMS()
    yn = '<span class="yn y">Yes</span><span class="yn">No</span><span class="ex">13 days left</span>'
    I["ask"].update(act=yn, detail="You have 2 spare. Peter wants 1 for Dragons of Tarkir.")
    I["ask2"] = dict(kind="ask", vis=("card", "giada.jpg", "face-giada.jpg"), kick="Spare request",
                     title="Chris asks for your spare Giada, Font of Hope",
                     detail="You have 1 spare. Chris wants 1 for Angels of Hope.", stamp="1h ago",
                     act='<span class="yn y">Yes</span><span class="yn">No</span><span class="ex">14 days left</span>', unseen=True, w=True)
    I["ans-yes"] = dict(kind="ans", vis=("card", "jace.jpg", "face-sai.jpg"), kick="Your request",
                        title="Colin can spare Jace, Multiverse Architect",
                        detail="The handover is between you. When it’s yours, press buy on the row to add it.",
                        stamp="1h ago", act='<span class="lnk">Your requests ›</span>', unseen=True)
    I["ans-no"] = dict(kind="ans", vis=("card", "dina.jpg", "face-giada.jpg"), kick="Your request",
                       title="Chris is keeping Dina, Essence Brewer",
                       detail="Nobody else you know has a spare of it.", stamp="yesterday",
                       act='<span class="lnk">Your requests ›</span>', unseen=False)
    return I


ORIG_ITEMS = P.ITEMS
P.ITEMS = items


def lead_ask(desk=False):
    """Home B's lead story holding a request, with Yes and No (parts.lead, its `later` outline taken off)."""
    h = P.lead("ask", desk)
    return (h.replace('<span class="later" style="display:flex;gap:8px">', '<span style="display:flex;gap:8px;align-items:center">')
             .replace('<span class="bg" style="height:40px">No</span></span>',
                      '<span class="bg" style="height:40px">No</span><span class="m" style="font-size:10.5px;color:var(--fg-muted)">13 days left</span></span>'))


# ---------------------------------------------------------------- /friends, both sides
def waiting(desk=False, answered=None, n=None):
    I = items()
    f = P.fitem_d if desk else P.fitem
    rows = []
    for k in ("ask", "ask2"):
        if answered and k == "ask":
            rows.append(receipt(answered, desk))
        else:
            rows.append(f(I[k]))
    rows.append(f(I["match"]))
    cnt = n if n is not None else (2 if answered else 3)
    return (f'<section class="sec"><div class="sech w">Waiting on you · {cnt}</div><div class="fd">{"".join(rows)}</div></section>')


def receipt(kind, desk=False):
    who = "Peter"
    t = "You’re sparing Lathliss for Peter" if kind == "yes" else "You’re keeping Lathliss"
    d = ("Peter’s been told. Hand Lathliss over when you meet; your collection stays as it is until you change it."
         if kind == "yes" else "Peter’s been told.")
    kd = '<span class="kd ok">Spare request · accepted</span>' if kind == "yes" else '<span class="kd">Spare request · declined</span>'
    vis = P.vis(("card", "lathliss.jpg", "face-captain-america.jpg"))
    return (f'<div class="fi rc new">{vis}<div class="bd"><div class="kr">{kd}<small>just now</small></div>'
            f'<div class="tt">{t}</div><div class="dt">{d}</div></div></div>')


YA = [("asked", "jace.jpg", "Colin", "Requested", "You asked Colin for Jace, Multiverse Architect", "For Thopter Works · 12 days left", None, "2d ago"),
      ("yes", "gisa.jpg", "Peter", "Accepted", "Peter can spare Ghoulcaller Gisa", "The handover is between you. When it’s yours, press buy on the row to add it.", None, "today"),
      ("no", "dina.jpg", "Chris", "Declined", "Chris is keeping Dina, Essence Brewer", "Nobody else you know has a spare of it.", None, "yesterday"),
      ("expired", "giada.jpg", "Max", "No answer", "Max didn’t answer about Giada, Font of Hope", "Requested 14 days ago, for Angels of Hope.", "Ask again", "today"),
      ("gone", "ghalta.jpg", "Colin", "No longer spare", "Colin’s Ghalta isn’t spare any more", "It went into one of Colin’s decks, so the ask closed.", None, "3d ago")]


def your_asks(desk=False, which=("asked", "yes", "no", "expired")):
    rows = []
    for st, im, who, kick, title, line, btn, when in YA:
        if st not in which:
            continue
        kc = {"asked": "ac2", "yes": "ok"}.get(st, "")
        un = '<span class="un"></span>' if st in ("yes", "no") else ""
        act = f'<div class="ac"><span class="ask">{btn}</span></div>' if btn else ""
        vis = P.vis(("card", im, FACE[who]))
        rows.append(f'<div class="fi">{vis}<div class="bd"><div class="kr">{un}<span class="kd {kc}">{kick}</span><small>{when}</small></div>'
                    f'<div class="tt">{title}</div><div class="dt">{line}</div>{"" if desk else act}</div>{act if desk else ""}'
                    f'<span class="xx">✕</span></div>')
    return (f'<section class="sec ya new"><div class="sech">Your requests · {len(rows)}<span class="r" style="font-size:12.5px;color:var(--fg-faint)">newest first</span></div>'
            f'<div class="fd">{"".join(rows)}</div></section>')


def fhead(desk=False):
    return (f'<div class="fhd"><div class="who">{P.face(P.ME, 64 if desk else 56, 14 if desk else 13)}<div><h1>Friends</h1>'
            '<p class="nl">Friends see you as <b>Sam</b> · <u>Change</u></p></div></div>'
            '<div class="ri"><span class="ba">Add a friend</span><span class="il">3 invites left</span></div></div>')


def friends_rows():
    rows = "".join(f'<div class="frow">{P.face(fc, 36, 10)}<span class="nm"><b>{n}</b><span>{c}</span></span>'
                   f'<span class="sn">{s}</span><span class="ch">›</span><span class="dots">···</span></div>' for n, fc, c, s in P.FRIENDS)
    return f'<section class="sec"><div class="sech">Friends · 4</div>{rows}</section>'


def friends_page(desk=False, answered=None, asks=True, waiting_on=True, ya_which=("asked", "yes", "no", "expired")):
    w = waiting(desk, answered) if waiting_on else ""
    y = your_asks(desk, ya_which) if asks else ""
    tb = f'<section class="sec">{P.table_card()}</section>'
    return f'<div class="fp">{fhead(desk)}{w}{y}{tb}{friends_rows()}</div>'


def settings_news(desk=False):
    ks = []
    for k, l, d in P.KINDS:
        on = k in ("ask",)
        if k == "ask":
            d = "A friend asks for a card you have spare. On until you turn it off."
        cls = ' class="ck new"' if k == "ask" else ' class="ck"'
        ks.append(f'<div{cls}><span class="box{" on" if on else ""}"></span><span class="ct"><b>{l}</b><span>{d}</span></span></div>')
    return (f'<div class="stp"><h1>Settings</h1><p class="sub">Saved as you change them</p><section class="sec"><div class="sech">What’s new on Home</div>'
            f'<div class="cks">{"".join(ks)}</div><p class="foot">In the app only: a count on Home and the list. No email, ever.</p></section></div>')


def toast(text, bottom=96):
    return f'<div class="toast" style="bottom:{bottom}px"><i></i><span>{text}</span><b>✕</b></div>'
