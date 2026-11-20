"""Deck page messages R1 (account 2, 2026-10-22): drawing kit.

Static HTML in the .dc.html wrapper, drawn over the shipped deck page in Low Sun (amonkhet) tokens, the theme of
Hugh's phone captures. Shipped pieces are redrawn from src/components/decks/* (classes cited in the README);
every string is the shipped copy or a placeholder for /copy-review.
"""

FONTS = ("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&amp;"
         "family=IBM+Plex+Mono:wght@400;500;600&amp;family=Cinzel:wght@600;700;800&amp;display=swap")

LOCAL = {"ghalta": "art/ghalta-crop.jpg", "sai": "art/sai-crop.jpg",
         "b3": "art/bracket-3-upgraded-ink.svg", "b4": "art/bracket-4-optimized-ink.svg"}
BLOB = {}
MODE = {"blob": False}


def img(key):
    return BLOB[key] if MODE["blob"] else LOCAL[key]


CSS = r"""
body{margin:0;background:#0D0B09}
*{box-sizing:border-box}
a{color:#CF8745;text-decoration:none}a:hover{color:#DE9757}
p{margin:0}
.board{--bg:#14110E;--surface:#1E1A15;--surface-raised:#211D18;--surface-rail:#1A1611;--surface-sunken:#18140F;--surface-inset:#1B1712;--elevated:#29241F;--elevated-hover:#201C17;--border:#2B241B;--border-strong:#3A3229;--border-dashed:#494037;--fg:#EDE6D8;--fg-body:#C0B8A6;--fg-muted:#A59C89;--fg-faint:#948B78;--fg-locked:#6E6654;--fg-disabled:#4A4033;--accent:#CF8745;--accent-hover:#DE9757;--accent-text:#CF8745;--accent-shadow:#6B482A;--success:#6FA368;--warning:#DEAA29;--fact:#8FA6BE;--danger:#C6533F;--avail-over-fg:#C46857;--bracket-3:#C9AC62;--bracket-4:#E6D08A;--w:#F4E9C4;--u:#3A6AA5;--b:#98748F;--r:#C05A3E;--g:#4B7A46;
 box-sizing:border-box;padding:48px 56px 64px;background:#0D0B09;font-family:'IBM Plex Sans',sans-serif;color:var(--fg);display:flex;flex-direction:column;gap:34px}
.m{font-family:'IBM Plex Mono',monospace}
.d{font-family:'Cinzel',serif}
.bh{display:flex;flex-direction:column;gap:9px;max-width:1500px}
.kick{display:flex;align-items:center;gap:10px;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.kick .tag{background:var(--accent);color:#14110E;border-radius:5px;padding:4px 8px;font-weight:600}
.bh h2{margin:0;font:700 30px 'Cinzel',serif;letter-spacing:.01em}
.bh p{font-size:14px;line-height:1.6;color:var(--fg-body);text-wrap:pretty;max-width:1180px}
.bh p b{color:var(--fg)}
code{font:12px 'IBM Plex Mono',monospace;color:var(--fg-body)}
.sec{display:flex;flex-direction:column;gap:18px}
.sec>h3{margin:0;font:700 20px 'Cinzel',serif}
.sec>p.sp{font-size:13.5px;line-height:1.6;color:var(--fg-muted);max-width:1100px;text-wrap:pretty}
.sec>p.sp b{color:var(--fg)}
.frames{display:flex;flex-wrap:nowrap;gap:44px;align-items:flex-start}
.fr{display:flex;flex-direction:column;gap:12px;flex:none}
.fr>.lab{width:0;min-width:100%;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.fr>.lab b{color:var(--accent);font-weight:600}
.fr>.cap{width:0;min-width:100%;font-size:13px;line-height:1.55;color:var(--fg-muted);text-wrap:pretty}
.fr>.cap b{color:var(--fg);font-weight:600}
.note{border:1px solid var(--border-strong);border-radius:12px;background:#15120F;padding:16px 18px;font-size:13px;line-height:1.6;color:var(--fg-body)}
.note b{color:var(--fg)}
.note ul,.note ol{margin:6px 0 0;padding-left:18px}
.note li{margin:4px 0}
.new{outline:1.5px dashed rgba(207,135,69,.75);outline-offset:3px;border-radius:6px}
.moved{outline:1.5px dashed rgba(143,166,190,.8);outline-offset:3px;border-radius:6px}

/* phone page */
.ph{width:390px;flex:none;border-radius:34px;border:1px solid var(--border-strong);background:var(--bg);overflow:hidden;position:relative;display:flex;flex-direction:column;color:var(--fg)}
.mhd{height:73px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:20px 20px 14px;border-bottom:1px solid var(--border);background:var(--bg)}
.wm{display:flex;align-items:flex-end;gap:5px}
.wm .the{font:9px 'IBM Plex Mono',monospace;letter-spacing:.4em;color:var(--accent);padding-bottom:3px}
.wm .mk{display:flex;flex-direction:column;align-items:center;gap:2px}
.wm .nn{font:800 24px/22px 'Cinzel',serif;color:var(--fg)}
.dia{display:flex;gap:3px;align-items:center}.dia i{width:5px;height:5px;background:var(--accent);transform:rotate(45deg);display:block}.dia i:nth-child(2){width:7px;height:7px}
.av{width:38px;height:38px;border-radius:12px;border:1px solid var(--accent);color:var(--accent);font:500 13px 'IBM Plex Sans',sans-serif;display:flex;align-items:center;justify-content:center}
.fold{position:absolute;left:0;right:0;height:0;border-top:1.5px dashed rgba(143,166,190,.85);z-index:20}
.fold span{position:absolute;right:10px;top:-19px;font:600 9.5px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:#0D0B09;background:#8FA6BE;border-radius:4px;padding:2px 6px}

/* hero (SpineMobile band, 288) */
.hero{position:relative;height:288px;overflow:hidden;background:var(--surface)}
.hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.hero .wash{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,17,14,0) 30%,rgba(20,17,14,.55) 55%,rgba(20,17,14,.92) 82%,#14110E)}
.hero .door{position:absolute;right:16px;bottom:44px;display:flex;flex-direction:column;border:1px solid var(--border-strong);border-radius:10px;background:rgba(20,17,14,.82);overflow:hidden}
.hero .door span{width:40px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg)}
.hero .door span+span{border-top:1px solid var(--border-strong)}
.hero .blk{position:absolute;left:18px;right:18px;bottom:0;padding:0 40px 12px 0;display:flex;flex-direction:column;gap:6px}
.hero h1{margin:0;font:700 20px/1.25 'Cinzel',serif;color:var(--fg);text-shadow:0 1px 8px rgba(0,0,0,.6)}
.hero h1 .pen{font:14px 'IBM Plex Sans';color:var(--fg-muted);margin-left:6px}
.meta{display:flex;align-items:center;gap:8px;font:10px 'IBM Plex Mono',monospace;color:var(--fg-body)}
.pips{display:inline-flex;gap:3px}.pips i{width:10px;height:10px;border-radius:2px;display:block}
.chips{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pill{display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:6px;font:11px 'IBM Plex Mono',monospace;white-space:nowrap}
.bchip{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 8px 0 2px;border-radius:6px;font:11px 'IBM Plex Mono',monospace;white-space:nowrap}
.bchip img{width:20px;height:20px;display:block}
.ntag{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px 0 8px;border-radius:6px;font:11px 'IBM Plex Mono',monospace;color:var(--fact);border:1px solid rgba(143,166,190,.55)}
.ntag i{width:6px;height:6px;border-radius:50%;background:var(--fact)}
.sub{position:relative;border-top:1px solid var(--border);padding:14px 16px 12px;display:flex;flex-direction:column;align-items:center;gap:8px}
.barrow{display:flex;align-items:center;gap:10px;width:100%}
.bar{flex:1;height:6px;border-radius:999px;background:var(--elevated);overflow:hidden}
.bar i{display:block;height:100%}
.cnt{font:600 14px 'IBM Plex Mono',monospace;display:flex;align-items:baseline;gap:4px}
.cnt .den{font-weight:400;color:var(--fg-faint)}
.cnt .dl{font-size:12px;margin-left:4px}
.hline{font:11.5px/1.5 'IBM Plex Mono',monospace;color:var(--fg-muted);text-align:center}
.oline{font-size:12px;line-height:1.5;color:var(--fg-body);text-align:center}
.oline b{font-weight:600}
.cuts{height:44px;display:flex;align-items:center;font:11.5px 'IBM Plex Mono',monospace;color:var(--accent)}
.acts{display:flex;justify-content:center;gap:8px;padding:4px 16px 14px}
.gb{display:flex;align-items:center;gap:5px;min-height:44px;padding:6px 9px;border-radius:7px;border:1px solid var(--border-strong);font:11px 'IBM Plex Mono',monospace;color:var(--fg-body)}
.gb.acc{color:var(--accent)}
.pb{display:flex;align-items:center;min-height:44px;padding:6px 12px;border-radius:7px;background:var(--fg);color:var(--bg);font:600 12px 'IBM Plex Sans',sans-serif}

/* tabs + list */
.tabs{display:flex;align-items:flex-end;gap:22px;padding:0 0 0 16px;border-bottom:1px solid var(--border);height:56px;overflow:hidden;white-space:nowrap}
.tabs span{font-size:14.5px;color:var(--fg-muted);padding-bottom:13px;border-bottom:2px solid transparent;display:flex;gap:6px;align-items:baseline}
.tabs span em{font:normal 11.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.tabs span.on{color:var(--fg);font-weight:600;border-bottom-color:var(--accent)}
.tabs span.on em{color:var(--accent)}
.seg{margin:14px 16px 0;display:flex;align-items:center;border:1px solid var(--border-strong);border-radius:12px;padding:4px;gap:4px}
.seg span{flex:1;height:40px;display:flex;align-items:center;justify-content:center;gap:5px;border-radius:8px;font-size:13.5px;color:var(--fg-muted)}
.seg span em{font:normal 11px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.seg span.on{background:var(--elevated);color:var(--fg);font-weight:600}
.seg span.sh{color:var(--accent);font-weight:500}
.seg span.sh em{color:var(--accent)}
.grp{padding:16px 16px 8px;display:flex;flex-direction:column;gap:6px}
.grp h4{margin:0 0 4px;font:600 14px 'IBM Plex Sans';display:flex;gap:8px;align-items:baseline}
.grp h4 em{font:normal 11px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.row{display:flex;align-items:center;gap:10px;height:36px;padding:0 10px;border-radius:8px;background:var(--surface-rail);font-size:14px}
.row .ow{width:8px;height:8px;border-radius:50%;background:var(--success);flex:none}
.row .ow.no{background:transparent;border:1.5px solid var(--fg-faint)}
.row .nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row .x{color:var(--fg-locked);font-size:13px;width:20px;text-align:center}
.row.chg{box-shadow:inset 2px 0 0 var(--accent)}
.mpip{width:11px;height:11px;border-radius:50%;display:inline-block}
.mnum{width:12px;height:12px;border-radius:50%;background:#C9C1B0;color:#14110E;font:600 8px 'IBM Plex Mono';display:inline-flex;align-items:center;justify-content:center}

/* desktop page */
.dk{width:1300px;flex:none;display:flex;background:var(--bg);border:1px solid var(--border-strong);border-radius:12px;overflow:hidden;position:relative}
.rail{width:64px;flex:none;background:var(--surface-rail);border-right:1px solid var(--border);display:flex;flex-direction:column;align-items:center;padding:16px 0 14px;gap:6px}
.rail .lg{display:flex;flex-direction:column;align-items:center;gap:3px;margin-bottom:16px;font:800 19px 'Cinzel',serif}
.rail .sl{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint)}
.rail .sl.on{background:var(--surface-inset);color:var(--fg)}
.main{flex:1;min-width:0;display:flex;flex-direction:column}
.dhero{position:relative;min-height:288px;border-bottom:1px solid var(--border)}
.dhero .art{position:absolute;left:0;top:0;width:584px;height:288px;overflow:hidden}
.dhero .art img{width:100%;height:100%;object-fit:cover;display:block}
.dhero .art .g{position:absolute;inset:0;background:linear-gradient(90deg,transparent 0,transparent 325px,rgba(20,17,14,.78) 560px,#14110E 584px)}
.dhero .in{position:relative;display:flex;align-items:flex-end;min-height:288px;padding:0 24px 18px 600px;gap:18px}
.dhero .col{flex:1 1 280px;min-width:0;display:flex;flex-direction:column}
.dhero h1{margin:0;font:700 21px/1.2 'Cinzel',serif}
.dhero .meta{font-size:11px;margin-top:4px}
.dhero .chips{margin-top:8px}
.dhero .barrow{margin-top:10px;width:auto}
.dhero .bar{flex:none;width:170px}
.dhero .hline,.dhero .oline{text-align:left;margin-top:6px}
.dhero .oline{font-size:11.5px}
.dhero .acol{display:flex;align-items:center;gap:9px;flex:none}
.db{display:flex;align-items:center;height:32px;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);font-weight:600;font-size:12.5px;color:var(--fg)}
.db.p{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.db.g{color:var(--fg-muted);font-weight:500}
.dtabs{display:flex;align-items:baseline;gap:24px;padding:14px 30px 0;border-bottom:1px solid var(--border);white-space:nowrap}
.dtabs span{font-size:14px;font-weight:500;color:var(--fg-faint);padding-bottom:11px;display:flex;gap:6px;align-items:baseline;border-bottom:2px solid transparent}
.dtabs span em{font:normal 11px 'IBM Plex Mono';color:var(--fg-faint)}
.dtabs span.on{color:var(--fg);font-weight:600;border-bottom-color:var(--accent)}
.dtabs span.on em{color:var(--accent)}
.dtool{display:flex;align-items:center;gap:10px;padding:14px 30px 4px}
.dtool .sg{display:flex;border:1px solid var(--border-strong);border-radius:9px;padding:3px;gap:3px}
.dtool .sg span{padding:6px 12px;border-radius:6px;font-size:13px;color:var(--fg-muted);display:flex;gap:5px;align-items:baseline}
.dtool .sg span.on{background:var(--elevated);color:var(--fg);font-weight:600}
.dtool .sg span em{font:normal 10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.dtool .nt{font:11.5px 'IBM Plex Mono';color:var(--fg-locked)}
.dgrp{padding:12px 30px 18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 14px}
.dgrp h4{grid-column:1/-1;margin:6px 0 2px;font:600 14px 'IBM Plex Sans';display:flex;gap:8px;align-items:baseline}
.dgrp h4 em{font:normal 11px 'IBM Plex Mono';color:var(--fg-faint)}

/* ===== the message system ===== */
/* receipt: the arrival band (ArrivalBandShell) */
.rc{display:flex;align-items:flex-start;gap:10px;padding:10px 6px 10px 16px;background:var(--surface-rail);border-bottom:1px solid var(--border)}
.rc .ok{color:var(--success);font-size:14px;line-height:20px;flex:none;width:14px}
.rc .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;padding-top:1px}
.rc .hd{font-size:13px;font-weight:600;color:var(--fg);line-height:1.4}
.rc .bd{font-size:12.5px;line-height:1.5;color:var(--fg-body)}
.rc .mt{font:10px 'IBM Plex Mono';color:var(--fg-faint);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.rc .mt a{font-size:11px}
.rc .x{width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:14px;margin-top:-10px}
.rc .lk{flex:none;align-self:center;display:inline-flex;align-items:center;height:32px;padding:0 12px;border-radius:7px;border:1px solid var(--accent);color:var(--accent);font:600 12px 'IBM Plex Sans'}
.dkm .rc{padding:11px 18px 11px 30px;align-items:center;gap:12px}
.dkm .rc .tx{flex-direction:row;align-items:baseline;gap:12px;flex-wrap:wrap;padding:0}
.dkm .rc .hd{font-size:13.5px}
.dkm .rc .bd{font-size:13px}
.dkm .rc .x{margin:0;width:36px;height:36px}

/* warning: one block, the commitment band's skin */
.wb{background:var(--elevated-hover);border-left:3px solid var(--danger);border-bottom:1px solid var(--border)}
.wr{display:flex;align-items:flex-start;gap:9px;padding:10px 16px}
.wr+.wr{border-top:1px solid var(--border)}
.wr .mk{flex:none;margin-top:4px;min-width:11px;display:flex;justify-content:center}
.wr .mk.fig{margin-top:0;font:600 12.5px/20px 'IBM Plex Mono';color:var(--danger);min-width:22px}
.wr .tx{flex:1;min-width:0}
.wr .hd{font-size:12.5px;font-weight:600;color:var(--avail-over-fg);line-height:1.45}
.wr .bd{font-size:12px;line-height:1.55;color:var(--fg-muted);margin-top:3px}
.wr .lk{margin-top:4px;display:inline-flex;align-items:center;min-height:28px;font:11.5px 'IBM Plex Mono';color:var(--accent)}
.og{position:relative;width:11px;height:6px;display:block}
.og i{position:absolute;top:0;width:6px;height:6px;background:var(--danger);transform:rotate(45deg)}
.og i:nth-child(2){left:5px;border-left:1px solid var(--elevated-hover)}
.og i:nth-child(1){left:0}
.sg-soft{width:6px;height:6px;border:1.5px solid var(--fg-muted);transform:rotate(45deg);display:block}
.dkm .wbw{padding:14px 30px 14px;border-bottom:1px solid var(--border)}
.dkm .wb{border:1px solid var(--border-strong);border-left:3px solid var(--danger);border-radius:10px;overflow:hidden}
.dkm .wr{align-items:center;gap:11px;padding:11px 16px}
.dkm .wr .mk{margin-top:0}
.dkm .wr .tx{display:flex;align-items:baseline;gap:11px;flex-wrap:wrap}
.dkm .wr .hd{font-size:13px;flex:none}
.dkm .wr .bd{font-size:13px;margin:0}
.dkm .wr .lk{margin:0 0 0 auto;min-height:0}

/* action: one card, the pending card's skin */
.aw{padding:14px 14px 0}
.ac{border-radius:10px;background:var(--surface-rail);border:1px solid var(--border-strong);border-left:3px solid var(--accent);padding:13px 14px;margin-bottom:14px}
.ac .ey{font:9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--accent);display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ac .ey .ct{font:15px 'IBM Plex Mono';letter-spacing:0;text-transform:none;display:inline-flex;gap:9px}
.ac .ey .sn{font:10.5px 'IBM Plex Mono';letter-spacing:0;text-transform:none;color:var(--fg-locked)}
.ac .hd{font-size:14px;font-weight:600;color:var(--fg);margin-top:2px}
.ac .bd{font-size:12.5px;line-height:1.5;color:var(--fg-body);margin-top:8px;text-wrap:pretty}
.ac .bd b{color:var(--fg);font-weight:600}
.ac .nl{list-style:none;margin:9px 0 0;padding:0;display:flex;flex-direction:column;gap:5px}
.ac .nl li{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--fg-body)}
.ac .nl li .sg{font:13px 'IBM Plex Mono';width:10px}
.ac .nl li .ht{font:10.5px 'IBM Plex Mono';color:var(--fg-locked);margin-left:auto}
.ac .pt{font:10px 'IBM Plex Mono';color:var(--warning);border:1px solid var(--accent-shadow);border-radius:4px;padding:1px 5px}
.ac .ctl{display:flex;flex-direction:column;gap:8px;margin-top:13px}
.ac .ctl .r2{display:flex;align-items:center;gap:8px}
.cta{display:flex;align-items:center;justify-content:center;min-height:44px;padding:10px 18px;border-radius:8px;background:var(--fg);color:var(--bg);font:600 14px 'IBM Plex Sans'}
.cta2{flex:1;display:flex;align-items:center;justify-content:center;min-height:44px;padding:10px 18px;border-radius:8px;border:1px solid var(--border-strong);color:var(--fg);font:500 13.5px 'IBM Plex Sans'}
.dsc{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);color:var(--fg-muted);font:500 13px 'IBM Plex Sans'}
.rvl{display:inline-flex;align-items:center;min-height:44px;font:11px 'IBM Plex Mono';color:var(--accent)}
.note2{font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-locked);margin-top:8px}
.also{border-top:1px solid var(--border);margin-top:13px;padding-top:10px;display:flex;flex-direction:column;gap:2px}
.also+.also{margin-top:10px}
.also .al{font:9px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.also .as{font-size:12.5px;line-height:1.5;color:var(--fg-body)}
.also .as .ct{font:12px 'IBM Plex Mono';margin-right:6px}
.also .ln{display:flex;gap:16px;flex-wrap:wrap}
.also .ln a{display:inline-flex;align-items:center;min-height:36px;font:11px 'IBM Plex Mono'}
.crumb{display:inline-flex;gap:5px;align-items:center;margin-left:2px}
.crumb i{width:6px;height:6px;background:var(--success);transform:rotate(45deg);display:block}
.crumb i.a{width:8px;height:8px;background:var(--accent)}
.dkm .aw{padding:18px 26px 0}
.dkm .ac{padding:15px 17px;margin:0 0 4px}
.dkm .ac .ey{font-size:10px;letter-spacing:.16em}
.dkm .ac .ey .ct{font-size:13px}
.dkm .ac .bd{font-size:13px;max-width:760px}
.dkm .ac .ctl{flex-direction:row;align-items:center;gap:10px;flex-wrap:wrap}
.dkm .ac .ctl .r2{display:contents}
.dkm .cta{min-height:0;font-size:13.5px}
.dkm .cta2{flex:none;min-height:0}
.dkm .dsc,.dkm .rvl{min-height:38px}
.dkm .also{flex-direction:row;align-items:baseline;gap:12px;flex-wrap:wrap}
.dkm .also .ln{margin-left:auto}
.dkm .also .ln a{min-height:0}
.dkm .aw+.sl,.dkm .aw+.mix{margin-top:18px}

/* status: one line, the version strip's skin */
.sl{background:var(--surface-rail);border-bottom:1px solid var(--border);padding:10px 16px;font:11px/1.7 'IBM Plex Mono';color:var(--fg-faint)}
.sl .sep{color:var(--fg-locked);margin:0 5px}
.sl .ds{color:var(--fg-body);border-bottom:1px dotted var(--fg-faint);white-space:nowrap}
.sl .ds .car{font-size:9px;margin-left:4px;color:var(--fg-faint)}
.sl .tap{display:inline-block;padding:12px 0;margin:-12px 0}
.dkm .sl{padding:12px 30px;font-size:11px}
.sld{margin-top:10px;display:flex;flex-direction:column;gap:6px}
.sld .lh{display:flex;align-items:center;gap:9px;font:12px 'IBM Plex Sans';color:var(--fg-body)}
.sld .lh .mm{margin-left:auto;font:10.5px 'IBM Plex Mono';color:var(--fg-locked)}
.disc{width:16px;height:16px;border-radius:50%;border:1.2px solid var(--accent);color:var(--accent);font:600 10px/14px 'IBM Plex Serif',serif;text-align:center;flex:none;font-style:italic}
.ll{border-radius:7px;padding:9px 10px;background:var(--surface);border:1px solid var(--border);font-family:'IBM Plex Sans'}
.ll.nw{background:var(--elevated-hover);border-color:var(--accent-shadow)}
.ll .lt{display:flex;align-items:baseline;gap:8px}
.ll .lb{font:9.5px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint)}
.ll.nw .lb{color:var(--accent)}
.ll .rv{margin-left:auto;font:10px 'IBM Plex Mono';color:var(--fg-locked)}
.ll .se{margin-top:5px;font-size:12px;line-height:1.5;color:var(--fg-body)}
.ll .bt{display:flex;gap:10px;margin-top:8px}
.ll .bt span{display:inline-flex;align-items:center;height:36px;padding:0 12px;border-radius:7px;border:1px solid var(--border-strong);font:11px 'IBM Plex Mono';color:var(--fg-body)}
.dkm .ll{display:flex;align-items:center;gap:11px;min-height:34px;padding:0 11px}
.dkm .ll .lt{display:contents}
.dkm .ll .lb{width:66px;flex:none}
.dkm .ll .se{margin:0;flex:1;font-size:12.5px}
.dkm .ll .bt{margin:0}
.dkm .ll .bt span{height:26px}
.dkm .ll .rv{margin:0;order:9}
.sldp{font:12.5px/1.55 'IBM Plex Sans';color:var(--fg-body);margin-top:8px;display:flex;gap:9px;align-items:flex-start}
.sldp .sg-soft{margin-top:6px;flex:none}

/* mix (RoleCounterStrip) */
.mix{padding:10px 16px;border-bottom:1px solid var(--border)}
.mix .mh{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:8px}
.mix .ml{font:9px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint)}
.mix .ms{font:9.5px 'IBM Plex Mono';color:var(--fg-faint);text-align:right}
.mix .ms em{font-style:normal;color:var(--accent)}
.cells{display:flex;gap:4px}
.cell{flex:1;min-width:0;min-height:62px;border-radius:7px;padding:7px 2px 6px;text-align:center;background:var(--surface-sunken);border:1px solid var(--border)}
.cell.sh{border-color:var(--border-strong)}
.cell .cl{font:8.5px 'IBM Plex Mono';letter-spacing:.06em;text-transform:uppercase;color:var(--fg-faint)}
.cell .cf{font:600 13px 'IBM Plex Mono';margin-top:2px}
.cell .cr{font:8px 'IBM Plex Mono';color:var(--fg-faint);margin-top:2px}
.cell .ck{font:9px 'IBM Plex Mono';color:var(--accent);margin-top:3px}
.cell .cd{font:9px 'IBM Plex Mono';color:var(--border-strong);margin-top:3px}
.cell .cw{font:8px 'IBM Plex Mono';color:var(--accent);margin-top:1px}
.why{display:inline-flex;align-items:center;min-height:36px;margin-top:4px;font:11px 'IBM Plex Mono';color:var(--accent);text-decoration:underline;text-underline-offset:4px;text-decoration-color:var(--accent-shadow)}
.dkm .mix{padding:14px 30px}
.dkm .mix .mh{justify-content:flex-start;margin-bottom:12px}
.dkm .mix .ml{font-size:11px;letter-spacing:.12em;color:var(--fg-body)}
.dkm .mix .ms{font-size:10.5px}
.dkm .cells{gap:8px}
.dkm .cell{min-height:72px;border-radius:9px;padding:11px 14px;text-align:left}
.dkm .cell .cl{font-size:10px;letter-spacing:.1em}
.dkm .cell .cf{font-size:16px;margin-top:3px}
.dkm .cell .cf span{font:400 11px 'IBM Plex Mono';color:var(--fg-faint)}
.dkm .cell .cb{height:5px;border-radius:9px;background:var(--elevated);margin-top:8px;overflow:hidden}
.dkm .cell .cb i{display:block;height:100%}
.dkm .cell .cx{display:flex;justify-content:space-between;align-items:baseline;margin-top:6px}
.dkm .cell .cr,.dkm .cell .ck,.dkm .cell .cd{margin:0;font-size:9px}
.dkm .cell .ck,.dkm .cell .cd{font-size:10px}
.dkm .cell .cd{color:var(--border-dashed)}

/* moment bubble */
.mo{position:absolute;z-index:12;display:flex;align-items:flex-start;gap:10px;border-radius:10px;border:1px solid var(--border-strong);background:var(--elevated);padding:10px 0 10px 12px;box-shadow:0 12px 30px rgba(0,0,0,.45)}
.mo .nib{position:absolute;width:10px;height:10px;background:var(--elevated);border-left:1px solid var(--border-strong);border-top:1px solid var(--border-strong);transform:rotate(45deg);top:-6px}
.mo .dm{margin-top:7px;width:6px;height:6px;background:var(--accent);transform:rotate(45deg);flex:none}
.mo p{flex:1;min-width:0;font-size:13.5px;line-height:1.45;color:var(--fg-body)}
.mo p b{color:var(--fg);font-weight:600}
.mo .mx{width:44px;height:28px;flex:none;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);font-size:14px;margin-top:-4px}

/* toast (ToastFrame, deck slot) */
.toast{position:absolute;left:16px;right:16px;z-index:14;display:flex;min-height:52px;align-items:flex-start;gap:10px;border-radius:10px;border:1px solid var(--border-strong);background:var(--elevated);padding:0 6px 0 14px;box-shadow:0 12px 30px rgba(0,0,0,.45)}
.toast .tt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;padding:10px 0}
.toast .t1{font-size:13.5px;line-height:1.35;color:var(--fg)}
.toast .t2{font:11px 'IBM Plex Mono';color:var(--fg-muted)}

/* today-only treatments (shipped, for the before frames) */
.t-over-band{display:flex;align-items:flex-start;gap:9px;padding:10px 16px;background:var(--elevated-hover);border-left:3px solid var(--danger)}
.t-soft-band{display:flex;align-items:flex-start;gap:9px;padding:10px 16px;background:var(--surface);border-left:3px solid var(--border-dashed);border-top:1px solid var(--border)}
.t-ledger{margin:10px 16px 12px;border-radius:9px;padding:10px 12px;background:var(--surface-sunken);border:1px solid var(--border);border-left:3px solid var(--accent)}
.t-last{margin:0 16px 12px;border-radius:10px;padding:13px 14px;background:var(--surface-rail);border:1px solid var(--border-strong)}
.t-last .e{font:9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.t-last .c{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);margin-top:4px}
.t-last .b{margin-top:10px;display:flex;align-items:center;justify-content:center;min-height:44px;border-radius:8px;border:1px solid var(--accent);color:var(--accent);font:600 13.5px 'IBM Plex Sans'}
.t-last .n{font:10.5px 'IBM Plex Mono';color:var(--fg-locked);margin-top:8px}
.t-guided{margin:20px 16px 0;border-radius:10px;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--accent)}
.t-unres{margin:0 14px 14px;border-radius:8px;padding:10px 12px;background:var(--elevated-hover);border:1px solid var(--border-strong);border-left:3px solid var(--warning);display:flex;gap:9px;font-size:12.5px;line-height:1.5;color:var(--fg-body)}
.t-fail{margin:10px 16px;border-radius:8px;padding:10px 12px;background:var(--surface-sunken);border:1px solid var(--border);border-left:3px solid var(--warning);display:flex;gap:9px;font-size:12.5px;line-height:1.5;color:var(--fg-body)}
.t-err{padding:6px 16px 0;font-size:11px;color:var(--warning)}
"""


def doc(title, body, width):
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
<style>{CSS}</style>
</helmet>
<div class="board" style="width:{width}px">{body}</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{width},"height":1200}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""


def board_head(kicker, title, cap, tag="R2"):
    return (f'<div class="bh"><div class="kick"><span class="tag">{tag}</span>{kicker}</div>'
            f'<h2>{title}</h2><p>{cap}</p></div>')


def frame(label, body, cap=""):
    return (f'<div class="fr"><div class="lab">{label}</div>{body}'
            + (f'<p class="cap">{cap}</p>' if cap else "") + "</div>")
