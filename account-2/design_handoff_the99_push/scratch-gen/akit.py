"""Drawing kit for the bracket reach choice R1 boards: static HTML in the dc wrapper, drawn over the shipped
pages in Neon Rain (kamigawa) tokens. Strings marked as placeholders go to /copy-review."""

FONTS = ("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&amp;"
         "family=IBM+Plex+Mono:wght@400;500;600&amp;family=Chakra+Petch:wght@500;600;700&amp;display=swap")

LOCAL = {"sai": "art/sai.jpg", "zimone": "art/zimone.jpg", "rootha": "art/rootha.jpg", "shot": "art/shot-new-deck.webp", "art-sai": "art/art-sai.jpg", "art-zimone": "art/art-zimone.jpg", "art-rootha": "art/art-rootha.jpg", "jace": "art/jace.jpg"}
BLOB = {"sai": "/_blob/5a6762ca29d4d1626107cd34be8df951", "zimone": "/_blob/d55160c67bbcc23b14b0c04bcebcb63e",
        "rootha": "/_blob/1878095234436f70a0f0612b1a4be8fc", "shot": "/_blob/1466a7f2b6a298aac51aba7949e85246", "art-sai": "/_blob/5f1522daf94cb350db55bfb01e24dea8", "art-zimone": "/_blob/fa821d79aec6ecb16414031b9afdd739", "art-rootha": "/_blob/50d8f947a11b3455033162ceaef654ad", "jace": "/_blob/12d7f98f7d4a0bd37a7357ba90ba597b"}
MODE = {"blob": False}


def img(key):
    return (BLOB if MODE["blob"] else LOCAL)[key]


CSS = r"""
body{margin:0;background:#0A0B0F}
*{box-sizing:border-box}
a{color:#FF4D9A;text-decoration:none}a:hover{color:#FF62A9}
.board{--bg:#0E0F14;--surface:#16181F;--surface-raised:#191B22;--surface-rail:#12141B;--surface-sunken:#101219;--surface-inset:#13151C;--elevated:#20222A;--border:#181C26;--border-strong:#262A35;--border-dashed:#343843;--fg:#E6E8F0;--fg-body:#B1B6C7;--fg-muted:#959AAD;--fg-faint:#84899B;--fg-placeholder:#7D8294;--fg-locked:#606476;--fg-disabled:#3D404E;--accent:#FF4D9A;--accent-dim:#843052;--success:#6FA368;--warning:#E0913C;--danger:#C6533F;--avail-hard-fg:#DF8AA7;--u:#3A6AA5;--g:#4B7A46;--r:#C05A3E;--b:#98748F;--w:#F4E9C4;
 box-sizing:border-box;padding:44px 56px 64px;background:#0A0B0F;font-family:'IBM Plex Sans',sans-serif;color:var(--fg);display:flex;flex-direction:column;gap:30px}
.m{font-family:'IBM Plex Mono',monospace}
.dsp{font-family:'Chakra Petch',sans-serif}
.bh{display:flex;flex-direction:column;gap:8px;max-width:1500px}
.kick{display:flex;align-items:center;gap:10px;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.kick .tag{background:var(--accent);color:#0E0F14;border-radius:5px;padding:4px 8px;font-weight:600}
.bh h2{margin:0;font:700 28px 'Chakra Petch',sans-serif}
.bh p{margin:0;font-size:13.5px;line-height:1.6;color:var(--fg-body);text-wrap:pretty}
.bh p b{color:var(--fg)}
code{font:12px 'IBM Plex Mono',monospace;color:var(--fg-body)}
.sec{display:flex;flex-direction:column;gap:18px}
.sec>h3{margin:0;font:700 19px 'Chakra Petch',sans-serif}
.frames{display:flex;flex-wrap:wrap;gap:44px;align-items:flex-start}
.fr{display:flex;flex-direction:column;gap:12px;flex:none}
.fr>.lab{font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.fr>.cap{font-size:13px;line-height:1.55;color:var(--fg-muted);margin:0;text-wrap:pretty}
.fr>.cap b{color:var(--fg);font-weight:600}
.note{border:1px solid var(--border-strong);border-radius:12px;background:#111319;padding:16px 18px;font-size:13px;line-height:1.6;color:var(--fg-body)}
.note b{color:var(--fg)}
.note ul,.note ol{margin:6px 0 0;padding-left:18px}
.note li{margin:3px 0}
.new{outline:1.5px dashed rgba(255,77,154,.6);outline-offset:3px;border-radius:6px}
span.new{outline:0;background:rgba(255,77,154,.13);border-radius:3px;-webkit-box-decoration-break:clone;box-decoration-break:clone;padding:0 2px}
.ph-tag{font:600 9px 'IBM Plex Mono',monospace;letter-spacing:.08em;color:#0E0F14;background:#E0913C;border-radius:4px;padding:2px 5px;vertical-align:2px;margin-left:6px}

/* phone */
.ph{width:390px;flex:none;border-radius:34px;border:1px solid var(--border-strong);background:var(--bg);overflow:hidden;position:relative;display:flex;flex-direction:column;color:var(--fg)}
.ph.vp{height:844px}
.mhd{height:73px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:20px 20px 14px;border-bottom:1px solid var(--border);background:var(--bg)}
.wm{display:flex;align-items:flex-end;gap:5px}
.wm .the{font:9px 'IBM Plex Mono',monospace;letter-spacing:.4em;color:var(--accent);padding-bottom:3px}
.wm .mk{display:flex;flex-direction:column;align-items:center;gap:3px}
.wm .nn{font:700 23px/20px 'Chakra Petch',sans-serif;color:var(--fg)}
.dia{display:flex;gap:4px}.dia i{width:6px;height:6px;background:var(--accent);transform:rotate(45deg);display:block}.dia i:nth-child(2){width:8px;height:8px}
.clu{display:flex;align-items:center;gap:4px}
.ic{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted)}
.av{width:38px;height:38px;border-radius:12px;border:1px solid var(--accent);color:var(--accent);font:500 13px 'IBM Plex Sans',sans-serif;display:flex;align-items:center;justify-content:center}
.tbar{height:74px;flex:none;display:flex;align-items:center;padding:8px 8px 14px;border-top:1px solid var(--border);background:var(--surface-rail)}
.tbar span{flex:1;height:52px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font:9px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:var(--fg-faint)}
.tbar span.on{background:var(--surface-inset);color:var(--fg)}
.pb{flex:1;min-height:0;overflow:hidden;position:relative;display:flex;flex-direction:column}

/* desktop */
.dk{width:1300px;flex:none;display:flex;background:var(--bg);border:1px solid var(--border-strong);border-radius:12px;overflow:hidden}
.rail{width:64px;flex:none;background:var(--surface-rail);border-right:1px solid var(--border);display:flex;flex-direction:column;align-items:center;padding:16px 0 14px;gap:6px}
.rail .lg{display:flex;flex-direction:column;align-items:center;gap:3px;margin-bottom:16px;font:700 19px 'Chakra Petch',sans-serif}
.rail .sl{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint)}
.rail .sl.on{background:var(--surface-inset);color:var(--fg)}
.rail .ra{margin-top:auto;width:30px;height:30px;border-radius:9px;border:1px solid var(--accent);color:var(--accent);font:500 11px 'IBM Plex Sans',sans-serif;display:flex;align-items:center;justify-content:center}
.main{flex:1;min-width:0;display:flex;flex-direction:column}

/* fields (intake form) */
.fld{display:flex;flex-direction:column;gap:9px}
.flab{font:10px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.fcap{margin:0;font-size:12px;line-height:1.5;color:var(--fg-faint);text-wrap:pretty}
.fcap.mut{color:var(--fg-muted)}
.seg{display:flex;gap:6px}
.seg span{flex:1 1 0;display:flex;align-items:center;justify-content:center;height:44px;border-radius:7px;border:1px solid var(--border);background:var(--surface-sunken);color:var(--fg-muted);font-size:13px;white-space:nowrap}
.seg span.wide{flex:1.6 1 0}
.seg span.mono{font-family:'IBM Plex Mono',monospace}
.seg span.on{font-weight:600;color:var(--fg);background:var(--elevated);border-color:var(--accent)}
.dk .seg span{height:34px}
.money{display:flex;align-items:center;gap:6px;min-height:44px;padding:6px 10px;border-radius:9px;border:1px solid var(--border-strong);background:var(--surface-sunken);font:16px 'IBM Plex Mono',monospace}
.money i{font-style:normal;font-size:14px;color:var(--fg-faint)}
.dk .money{min-height:40px;font-size:14px}
.ta{min-height:96px;padding:12px 13px;border-radius:9px;border:1px solid var(--accent);background:var(--surface-sunken);font-size:15px;line-height:1.55;color:var(--fg)}
.dk .ta{min-height:84px;font-size:14px}
.opt-tag{font:9.5px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:var(--fg-locked);text-transform:none;margin-left:8px}
.press{display:inline-flex;align-items:center;justify-content:center;gap:10px;border-radius:10px;background:var(--accent);color:#0E0F14;font:600 15px 'IBM Plex Sans',sans-serif;padding:0 23px 0 7px;white-space:nowrap}
.press .pill{display:inline-flex;align-items:center;height:32px;padding:0 10px;border-radius:7px;font:600 11px 'IBM Plex Mono',monospace;background:rgba(14,15,20,.22)}
.dock{flex:none;padding:10px 16px 12px;border-top:1px solid var(--border);background:var(--bg)}
.dock .press{width:100%;height:48px}
.dock p{margin:6px 0 0;text-align:center;font:10px/1.5 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.dock p a{color:var(--accent)}

/* the hand-off */
.ho{display:flex;flex-direction:column;gap:12px;border-radius:11px;border:1px solid var(--border);background:var(--surface-rail);padding:14px}
.dk .ho{padding:16px 18px}
.ho-h{display:flex;align-items:baseline;gap:10px}
.ho-h h4{margin:0;font:400 10px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.ho-h a{margin-left:auto;font:11px 'IBM Plex Mono',monospace}
.hr{display:flex;flex-direction:column;gap:4px}
.dk .hr{flex-direction:row;gap:12px;align-items:baseline}
.hk{flex:none;font:10px 'IBM Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--fg-locked)}
.dk .hk{width:104px}
.hv{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.hv>b{font-size:13.5px;font-weight:600;color:var(--fg)}
.hv>p{margin:0;font-size:12px;line-height:1.5;color:var(--fg-muted);text-wrap:pretty}
.cn{font-weight:600;color:var(--fg);text-decoration:underline dotted var(--accent);text-underline-offset:3px}
.buy{font:9.5px 'IBM Plex Mono',monospace;border-radius:4px;padding:1px 5px;color:var(--warning);background:rgba(224,145,60,.13);white-space:nowrap}
.free{font:10px 'IBM Plex Mono',monospace;color:var(--fg-body);white-space:nowrap;display:inline-flex;align-items:center;gap:6px}
.dot{width:7px;height:7px;border-radius:50%;background:var(--success);display:inline-block;flex:none}
/* the choice: two radio rows inside the Bracket row */
.ch{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.opt{display:flex;align-items:flex-start;gap:11px;min-height:52px;padding:11px 12px;border-radius:9px;border:1px solid var(--border-strong);background:var(--surface-sunken)}
.opt .rd{width:18px;height:18px;flex:none;margin-top:1px;border-radius:50%;border:1.5px solid var(--fg-faint);position:relative}
.opt.on{border-color:var(--accent);background:var(--elevated)}
.opt.on .rd{border-color:var(--accent)}
.opt.on .rd::after{content:'';position:absolute;inset:3px;border-radius:50%;background:var(--accent)}
.opt .tx{display:flex;flex-direction:column;gap:3px;min-width:0}
.opt .tx b{font-size:13.5px;font-weight:600;color:var(--fg);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.opt .tx span{font-size:12px;line-height:1.5;color:var(--fg-muted);text-wrap:pretty}
.opt .over{font:9.5px 'IBM Plex Mono',monospace;color:var(--warning);border:1px solid rgba(224,145,60,.45);border-radius:4px;padding:0 5px;font-weight:400}
.btns{display:flex;flex-direction:column;gap:12px}
.dk .btns{flex-direction:row;align-items:center}
.cta{display:flex;align-items:center;justify-content:center;border-radius:10px;background:var(--accent);color:#0E0F14;font:600 15px 'IBM Plex Sans',sans-serif;padding:13px 26px}
.cta.off{opacity:.4}
.ghost{display:block;text-align:center;border-radius:10px;border:1px solid var(--border-strong);color:var(--fg-body);font-size:13px;padding:11px 0}
.dk .ghost{font-size:14px;padding:13px 20px}
.inp{border-radius:8px;border:1px solid var(--accent);background:var(--surface-sunken);padding:12px 14px;font-size:16px;color:var(--fg)}
.waitl{margin:-14px 0 16px;font:11px 'IBM Plex Mono',monospace;color:var(--fg-muted)}

/* result rows */
.rr{display:grid;grid-template-columns:40px minmax(0,1fr) 14px;column-gap:11px;row-gap:5px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface-rail);align-items:center}
.dk .rr{grid-template-columns:40px minmax(0,1fr) 340px 14px;column-gap:16px;row-gap:7px;padding:12px 15px;border-radius:11px}
.rr .th{grid-column:1;grid-row:1/span 3;width:40px;height:56px;border-radius:5px;overflow:hidden;align-self:center}
.dk .rr .th{grid-row:1/span 2}
.rr .th img{width:100%;height:100%;object-fit:cover;display:block}
.rr .nm{grid-column:2;grid-row:1;display:flex;align-items:center;gap:8px;min-width:0}
.rr .nm b{font:600 14px 'Chakra Petch',sans-serif;text-decoration:underline dotted var(--accent);text-underline-offset:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dk .rr .nm b{font-size:16px}
.pips{display:inline-flex;gap:4px}.pips i{width:9px;height:9px;border-radius:2px;display:block}.dk .pips i{width:11px;height:11px}
.rr .fg{grid-column:2;grid-row:2;font:10.5px/1.45 'IBM Plex Mono',monospace;color:var(--fg-body);display:flex;gap:8px;align-items:baseline}
.dk .rr .fg{grid-column:3;grid-row:1/span 2;font:12.5px 'IBM Plex Sans',sans-serif}
.rr .fg b{font-weight:600;color:var(--fg)}
.rr .ow{grid-column:2;grid-row:3;min-width:0}
.dk .rr .ow{grid-row:2}
.rr .chev{grid-column:3;grid-row:1/span 3;font-size:18px;color:var(--fg-faint)}
.dk .rr .chev{grid-column:4;grid-row:1/span 2}
.own{overflow:hidden;font:10px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.dk .own{font-size:11px}
.own>div{display:flex;flex-wrap:wrap;align-items:center;row-gap:3px;margin-left:-14px}
.sg{display:inline-flex;align-items:center;white-space:nowrap}
.sg::before{content:'·';width:14px;text-align:center;color:var(--border-strong)}
.lk{margin-right:6px;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--fg-locked)}
.short{color:var(--fg-body)}
.sg.new{outline:0;border-radius:0;background:none;padding:0;text-decoration:underline dashed rgba(255,77,154,.7);text-underline-offset:4px}

/* best fits */
.bf{position:relative;display:flex;flex-direction:row;overflow:hidden;border-radius:12px;border:1px solid #4a2236;background:var(--surface-rail)}
.dk .bf{flex-direction:column}
.bf .art{position:relative;flex:none;width:88px;border-right:1px solid var(--border);background:var(--elevated);overflow:hidden}
.dk .bf .art{width:100%;aspect-ratio:626/457;border-right:0;border-bottom:1px solid var(--border)}
.bf .art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.bf .rk{position:absolute;left:10px;top:10px;width:26px;height:26px;border-radius:50%;display:none;align-items:center;justify-content:center;font:600 12px 'IBM Plex Mono',monospace;color:var(--accent);background:var(--bg);border:1px solid #a03a68}
.dk .bf .rk{display:flex}
.bf .bd{flex:1;min-width:0;display:flex;flex-direction:column;gap:9px;padding:11px 12px}
.dk .bf .bd{padding:14px 15px 15px}
.bf .bn{display:flex;align-items:center;gap:8px;min-width:0}
.bf .bn .no{flex:none;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:600 10.5px 'IBM Plex Mono',monospace;color:var(--accent);border:1px solid #a03a68}
.dk .bf .bn .no{display:none}
.bf .bn b{font:600 14.5px 'Chakra Petch',sans-serif;text-decoration:underline dotted var(--accent);text-underline-offset:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dk .bf .bn b{font-size:17px}
.bf .why{margin:0;font-size:12.5px;line-height:1.5;color:var(--fg-body);text-wrap:pretty}
.dk .bf .why{font-size:13px}
.bf .bfg{display:flex;gap:7px;align-items:baseline;font:12px 'IBM Plex Sans',sans-serif;color:var(--fg-body)}
.bf .bfg b{font-weight:600;color:var(--fg)}
.bf hr{margin:0;border:0;border-top:1px solid var(--border)}
.rr .why{grid-column:2;grid-row:2;margin:0;font-size:12.5px;line-height:1.5;color:var(--fg-body)}
.sech{margin:0;font:10.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase}
/* about */
.ab-head{padding:34px 40px 0}
.ab-head h1{margin:0;font:700 28px 'Chakra Petch',sans-serif}
.ab-head p{margin:6px 0 0;font-size:14px;color:var(--fg-muted)}
.abtabs{display:flex;gap:22px;margin-top:20px;border-bottom:1px solid var(--border)}
.abtabs span{padding:0 2px 10px;font-size:14px;color:var(--fg-muted);border-bottom:2px solid transparent}
.abtabs span.on{color:var(--fg);font-weight:500;border-bottom-color:var(--accent)}
.abtabs small{font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint);margin-left:4px}
.ref{display:flex;gap:48px;padding:28px 40px 40px;align-items:flex-start}
.refl{flex:1;min-width:0;display:flex;flex-direction:column}
.scr{display:flex;align-items:baseline;gap:12px;border-bottom:1px solid var(--border-strong);padding-bottom:8px;margin-top:14px}
.scr h2{margin:0;font:600 19px 'Chakra Petch',sans-serif}
.scr span{font:11.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.er{display:grid;grid-template-columns:300px minmax(0,1fr) 56px 16px;column-gap:16px;align-items:center;min-height:44px;padding:6px 0;border-bottom:1px solid var(--border)}
.er .t{font-size:14.5px;font-weight:500}
.er .f{font-size:13px;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.er .mk{font:10.5px 'IBM Plex Mono',monospace;color:var(--accent)}
.er .cv{font-size:13px;color:var(--fg-faint)}
.eo{border-bottom:1px solid var(--border)}
.eo .er{border-bottom:0}
.eob{display:flex;gap:18px;padding:4px 0 18px}
.frm{position:relative;width:330px;flex:none;aspect-ratio:3/2;overflow:hidden;border-radius:10px;border:1px solid var(--border);background:var(--bg);align-self:flex-start}
.frm img{position:absolute;left:0;width:100%;display:block}
.halo{position:absolute;border-radius:8px;box-shadow:0 0 0 2px rgba(255,77,154,.75),0 0 0 6px rgba(255,77,154,.2),0 0 0 2000px rgba(14,15,20,.28)}
.etx{display:flex;flex-direction:column;gap:10px;min-width:0}
.etx .cp{display:flex;flex-direction:column;gap:10px;font-size:14px;line-height:1.6;color:var(--fg-body)}
.etx .cp p{margin:0;text-wrap:pretty}
.etx .cp ul{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:2px}
.keys{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
.keys li{display:flex;gap:8px;font-size:13.5px;line-height:1.5;color:var(--fg-body)}
.keys li i{font-style:normal;color:var(--accent)}
.idx{width:230px;flex:none;display:flex;flex-direction:column;gap:2px}
.idx .h{padding-bottom:8px;font:11px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.idx a{display:flex;justify-content:space-between;align-items:center;min-height:30px;font-size:13.5px;color:var(--fg-muted);padding:0 8px;border-radius:7px}
.idx a.on{background:var(--surface-inset);color:var(--fg)}
.idx a small{font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.pr{display:flex;align-items:center;justify-content:space-between;min-height:50px;border-bottom:1px solid var(--border)}
.pr b{font:600 16px 'Chakra Petch',sans-serif}
.pr span{font:11.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.pe{border-top:1px solid var(--border);padding:10px 0;display:flex;flex-direction:column;gap:3px}
.pe .t{font-size:14.5px;font-weight:500}
.pe .f{font-size:13px;line-height:1.45;color:var(--fg-faint)}
.mini{position:absolute;left:0;top:0;width:780px;height:520px;transform-origin:0 0;background:var(--bg);padding:40px 44px;display:flex;flex-direction:column;gap:18px}
"""

ICONS = {
    "search": '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    "help": '<span style="font:500 18px IBM Plex Sans,sans-serif">?</span>',
    "home": '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 11 12 4l8 7v9H4z"/></svg>',
    "coll": '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
    "cmd": '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 17 5 7l4 4 3-6 3 6 4-4 1 10z"/><path d="M4 20h16"/></svg>',
    "disc": '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="m12 8 4 4-4 4-4-4z"/></svg>',
    "decks": '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="7" y="4" width="12" height="15" rx="2"/><path d="M5 7v12a2 2 0 0 0 2 2h9"/></svg>',
}
TABS = [("home", "Home"), ("coll", "Collection"), ("cmd", "Commanders"), ("disc", "Discover"), ("decks", "Decks")]


def wordmark(big=True):
    return ('<div class="wm"><span class="the">THE</span><span class="mk"><span class="dia"><i></i><i></i><i></i></span>'
            '<span class="nn">99</span></span></div>')


def header():
    return (f'<div class="mhd">{wordmark()}<div class="clu"><span class="ic">{ICONS["search"]}</span>'
            f'<span class="ic">{ICONS["help"]}</span><span class="av">HH</span></div></div>')


def tabbar(active="Decks"):
    return '<div class="tbar">' + "".join(
        f'<span class="{"on" if l == active else ""}">{ICONS[k]}{l}</span>' for k, l in TABS) + "</div>"


def phone(inner, check, vp=False, active="Decks", foot=""):
    cls = "ph vp" if vp else "ph"
    return (f'<div class="{cls}" data-check="{check}">{header()}<div class="pb">{inner}</div>{foot}{tabbar(active)}</div>')


def rail(active="Decks"):
    slots = "".join(f'<span class="sl {"on" if l == active else ""}">{ICONS[k]}</span>' for k, l in TABS)
    return (f'<div class="rail"><div class="lg"><span class="dia"><i></i><i></i><i></i></span>99</div>{slots}'
            f'<span class="ra">HH</span></div>')


def desk(inner, check, active="Decks", h=None):
    st = f' style="height:{h}px"' if h else ""
    return f'<div class="dk" data-check="{check}"{st}>{rail(active)}<div class="main">{inner}</div></div>'


def frame(label, body, cap=""):
    c = f'<p class="cap">{cap}</p>' if cap else ""
    w = 1300 if 'class="dk"' in body[:40] else 390
    return f'<div class="fr" style="width:{w}px"><div class="lab">{label}</div>{body}{c}</div>'


def board_head(kicker, title, cap, tag="R1"):
    return (f'<div class="bh"><div class="kick"><span class="tag">{tag}</span>{kicker}</div>'
            f'<h2>{title}</h2><p>{cap}</p></div>')


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
