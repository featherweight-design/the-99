"""Shared drawing kit for the card search R1 boards. Every board is static HTML in the dc wrapper,
drawn over the shipped shell (Kamigawa tokens, the real 73px phone header, the 62px rail, the 74px tab bar)."""

FONTS = ("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&amp;"
         "family=IBM+Plex+Mono:wght@400;500;600&amp;family=Chakra+Petch:wght@500;600;700&amp;"
         "family=Cinzel:wght@700;800;900&amp;display=swap")

CSS = r"""
:root{--bg:#0E0F14;--surface:#16181F;--surface-raised:#191B22;--surface-rail:#12141B;--surface-sunken:#101219;--surface-inset:#13151C;--elevated:#20222A;--border:#181C26;--border-strong:#262A35;--border-dashed:#343843;--fg:#E6E8F0;--fg-body:#B1B6C7;--fg-muted:#959AAD;--fg-faint:#6F7486;--fg-placeholder:#7D8294;--fg-locked:#606476;--accent:#FF4D9A;--success:#6FA368;--warning:#E0913C;--fact:#8FA6BE;--danger:#C6533F;--w:#F4E9C4;--u:#3A6AA5;--b:#98748F;--r:#C05A3E;--g:#4B7A46}
body{margin:0;background:#0A0B0F}
svg{flex:none}
*{box-sizing:border-box}
a{color:var(--accent)}
.k{font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.cap{font-size:13px;line-height:1.55;color:var(--fg-muted);margin:0;text-wrap:pretty}
.cap b{color:var(--fg);font-weight:600}
.cap code,.note code{font:12px 'IBM Plex Mono',monospace;color:var(--fg-body)}
.new{outline:1.5px dashed rgba(255,77,154,.55);outline-offset:3px;border-radius:6px}
.board{box-sizing:border-box;padding:44px 56px 64px;background:#0A0B0F;font-family:'IBM Plex Sans',sans-serif;color:var(--fg);display:flex;flex-direction:column;gap:30px}
.bh{display:flex;flex-direction:column;gap:8px}
.bh h2{margin:0;font:700 28px 'Chakra Petch',sans-serif}
.sec{display:flex;flex-direction:column;gap:18px}
.sec>h3{margin:0;font:700 19px 'Chakra Petch',sans-serif;color:var(--fg)}
.frames{display:flex;flex-wrap:wrap;gap:44px;align-items:flex-start}
.fr{display:flex;flex-direction:column;gap:12px;flex:none}
.note{border:1px solid var(--border-strong);border-radius:12px;background:#111319;padding:16px 18px;font-size:13px;line-height:1.6;color:var(--fg-body)}
.note b{color:var(--fg)}
.note ul{margin:6px 0 0;padding-left:18px}
.note li{margin:3px 0}
.pin{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:var(--accent);color:#0E0F14;font:700 11px 'IBM Plex Mono',monospace}

/* ---- phone ---- */
.ph{width:390px;height:844px;flex:none;border-radius:34px;border:1px solid var(--border-strong);background:var(--bg);overflow:hidden;position:relative;display:flex;flex-direction:column;font-family:'IBM Plex Sans',sans-serif;color:var(--fg)}
.ph.w360{width:360px}
.mhd{height:73px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:20px 20px 14px;border-bottom:1px solid var(--border);background:var(--bg);position:relative;z-index:6}
.mhd.float{position:absolute;left:0;right:0;top:0;box-shadow:0 10px 28px rgba(0,0,0,.5)}
.wm{display:flex;align-items:flex-end;gap:3px}
.wm .the{font:9px 'IBM Plex Mono',monospace;letter-spacing:.4em;color:var(--accent);padding-bottom:4px}
.wm .mk{display:flex;flex-direction:column;align-items:center;gap:2px}
.wm .nn{font:800 24px/22px 'Cinzel',serif;color:var(--fg);letter-spacing:-.01em}
.clu{display:flex;align-items:center}
.av{width:38px;height:38px;border-radius:12px;border:1px solid var(--accent);color:var(--fg);font:500 13px 'IBM Plex Sans',sans-serif;display:flex;align-items:center;justify-content:center;flex:none}
.sic{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);flex:none;margin-right:2px}
.sic.on{color:var(--fg);background:var(--elevated)}
.offp{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 12px;border-radius:999px;background:rgba(224,145,60,.14);font:600 12px 'IBM Plex Mono',monospace;color:var(--fg);margin-right:8px;white-space:nowrap}
.offp i{width:8px;height:8px;border-radius:50%;background:var(--warning)}
.inst{display:flex;align-items:center}
.inst .b{width:44px;height:44px;border-radius:12px;border:1px solid var(--border);background:var(--surface-raised);display:flex;align-items:center;justify-content:center;color:var(--fg)}
.inst .x{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint)}
.tbar{height:74px;flex:none;display:flex;align-items:center;padding:8px 8px 14px;border-top:1px solid var(--border);background:var(--surface-rail);position:relative;z-index:5}
.tbar span{flex:1;height:52px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:9px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:var(--fg-faint)}
.tbar span.on{background:var(--surface-inset);color:var(--fg)}
.pb{flex:1;min-height:0;overflow:hidden;position:relative}
.kbd{position:absolute;left:0;right:0;bottom:0;height:291px;background:#2A2C33;z-index:8;display:flex;flex-direction:column;gap:9px;padding:10px 4px 0}
.kbd .r{display:flex;gap:6px;justify-content:center}
.kbd .r i{width:33px;height:42px;border-radius:5px;background:#4A4C55;display:block}
.kbd .r i.w{width:180px}
.kbd .r i.m{width:44px;background:#3A3C44}
.scrim{position:absolute;inset:0;background:rgba(14,15,20,.72);z-index:7}

/* collection page (phone) */
.ptabs{display:flex;align-items:center;gap:18px;padding:0 0 0 16px;border-bottom:1px solid var(--border);flex:none;background:var(--bg)}
.ptabs .tab{font-size:14.5px;height:46px;display:flex;align-items:flex-end;padding:0 2px 12px;color:var(--fg-muted);border-bottom:2px solid transparent}
.ptabs .tab.on{color:var(--fg);font-weight:500;border-bottom-color:var(--accent)}
.ptabs .re{margin-left:auto;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg)}
.pfh{padding:12px 14px 10px;background:var(--bg);border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:10px}
.psf{height:44px;border:1px solid var(--border-strong);border-radius:10px;display:flex;align-items:center;gap:10px;padding:0 14px;color:var(--fg-placeholder);font-size:15px;background:var(--bg)}
.pchips{display:flex;gap:8px}
.pchips span{height:34px;padding:0 12px;border-radius:9px;background:var(--elevated);display:flex;align-items:center;font-size:13.5px;color:var(--fg-body);white-space:nowrap}
.pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px 14px 14px}
.tile{border-radius:9px;overflow:hidden;background:var(--surface);border:1px solid var(--border);display:flex;flex-direction:column}
.tile .ar{position:relative;aspect-ratio:63/88;overflow:hidden;border-radius:0 0 9px 9px;background:var(--surface-sunken)}
.tile .ar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.tile .cpt{display:flex;flex-direction:column;gap:3px;padding:6px 7px 8px;min-height:50px}
.tile .cn{font:600 12px/16px 'IBM Plex Sans',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tile .cs{font:9px 'IBM Plex Mono',monospace;color:var(--fg-faint)}

/* deck page (phone) */
.dhero{position:relative;height:250px;overflow:hidden;flex:none}
.dhero img{position:absolute;left:0;top:-70px;width:100%;filter:saturate(1.05)}
.dhero::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,15,20,0) 35%,rgba(14,15,20,.92) 100%)}
.dhero .t{position:absolute;left:18px;right:18px;bottom:14px;z-index:2;display:flex;flex-direction:column;gap:8px}
.dhero h1{margin:0;font:700 22px 'Cinzel',serif;letter-spacing:.01em}
.dhero .m{display:flex;align-items:center;gap:8px;font:11.5px 'IBM Plex Mono',monospace;color:var(--fg-body)}
.chip-ok{font:11px 'IBM Plex Mono',monospace;color:var(--success);border:1px solid rgba(111,163,104,.4);background:rgba(111,163,104,.12);border-radius:5px;padding:3px 7px}
.sw{width:10px;height:10px;border-radius:2px;display:inline-block}
.dprog{display:flex;align-items:center;gap:12px;padding:16px 16px 12px}
.dprog .bar{flex:1;height:5px;border-radius:3px;background:var(--elevated);overflow:hidden}
.dprog .bar i{display:block;height:100%;background:var(--success)}
.dprog b{font:600 14px 'IBM Plex Mono',monospace}
.dtabs{display:flex;gap:20px;padding:0 16px;border-bottom:1px solid var(--border);background:var(--bg);flex:none}
.dtabs span{height:44px;display:flex;align-items:center;font-size:14px;color:var(--fg-muted);border-bottom:2px solid transparent;white-space:nowrap}
.dtabs span.on{color:var(--fg);font-weight:600;border-bottom-color:var(--accent)}
.dtabs small{font:12px 'IBM Plex Mono',monospace;color:var(--fg-faint);margin-left:5px}
.gh{display:flex;align-items:baseline;gap:8px;padding:14px 16px 6px}
.gh b{font:600 15px 'IBM Plex Sans',sans-serif}
.gh span{font:11.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.drow{display:flex;align-items:center;gap:9px;height:34px;margin:0 12px 4px;padding:0 10px 0 12px;border-radius:8px;background:var(--surface-inset)}
.drow .dot{width:8px;height:8px;border-radius:50%;background:var(--success);flex:none}
.drow .dot.d{background:none;border:1.5px dashed var(--fg-faint)}
.drow .n{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
.drow .pips{display:flex;gap:3px;width:72px;justify-content:flex-end}
.pip{width:14px;height:14px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:600 9px 'IBM Plex Mono',monospace;color:#1a1b20;box-shadow:inset 0 0 0 1px rgba(0,0,0,.4)}
.drow .x{color:var(--fg-faint);font-size:12px;width:16px;text-align:center}
.dock{flex:none;padding:10px 16px 12px;border-top:1px solid var(--border);background:var(--bg);position:relative;z-index:4;display:flex;align-items:center;gap:12px}
.dock .f{flex:1;min-width:0;height:44px;border:1px solid var(--border-strong);border-radius:10px;display:flex;align-items:center;gap:10px;padding:0 12px;color:var(--fg-placeholder);font-size:15px;white-space:nowrap;overflow:hidden}
.dock .f.on{border-color:var(--accent);color:var(--fg)}
.tog{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--fg-muted);white-space:nowrap}
.tog i{width:30px;height:17px;border-radius:999px;background:var(--elevated);position:relative;display:block}
.tog i::after{content:'';position:absolute;left:2px;top:2px;width:13px;height:13px;border-radius:50%;background:var(--fg-faint)}
.qres{position:absolute;left:0;right:0;z-index:4;background:var(--bg);border-top:1px solid var(--border);padding:10px 16px 6px;display:flex;flex-direction:column;gap:6px}
.qrow{display:flex;align-items:center;gap:10px;min-height:56px;border-radius:9px;padding:8px 10px;background:var(--surface-inset)}
.qrow .th{width:32px;height:45px;border-radius:5px;overflow:hidden;flex:none}
.qrow .th img{width:100%;height:100%;object-fit:cover;display:block}
.qrow .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.qrow .tx b{font:600 14px 'IBM Plex Sans',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qrow .tx span{font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qrow .ad{width:56px;height:44px;display:flex;align-items:center;justify-content:center;font:600 13px 'IBM Plex Sans',sans-serif;color:var(--accent)}

/* ---- search sheet (phone) ---- */
.ss{position:absolute;inset:0;z-index:9;background:var(--bg);display:flex;flex-direction:column}
.ssh{display:flex;align-items:center;gap:6px;padding:14px 8px 12px 14px;border-bottom:1px solid var(--border);flex:none}
.sfld{flex:1;min-width:0;height:44px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-sunken);display:flex;align-items:center;gap:10px;padding:0 6px 0 13px;font-size:16px;color:var(--fg-placeholder);white-space:nowrap}
.sfld.on{border-color:var(--accent);color:var(--fg)}
.sfld .caret{width:1.5px;height:19px;background:var(--accent);margin-left:-9px;flex:none}
.sfld .clr{margin-left:auto;width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);font-size:13px;flex:none}
.sx{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:16px;flex:none}
.prog{height:2px;background:var(--border);position:relative;overflow:hidden;flex:none}
.prog i{position:absolute;left:0;top:0;bottom:0;width:38%;background:var(--accent)}
.ssb{flex:1;min-height:0;overflow:hidden;position:relative}
.slab{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 6px}
.slab a{font:500 13.5px 'IBM Plex Sans',sans-serif;min-height:36px;display:flex;align-items:center;text-underline-offset:3px}
.smeta{padding:12px 16px 4px;font:11.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.sfoot{padding:14px 16px;font-size:13px;line-height:1.55;color:var(--fg-muted);border-top:1px solid var(--border)}
.sempty{padding:44px 28px 0;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px}
.sempty b{font:700 19px 'Chakra Petch',sans-serif}
.sempty p{margin:0;font-size:14.5px;line-height:1.6;color:var(--fg-muted);max-width:300px;text-wrap:pretty}
.fan{position:relative;width:170px;height:118px;margin-bottom:12px}
.fan span{position:absolute;top:8px;width:72px;height:100px;border-radius:7px;overflow:hidden;box-shadow:0 10px 24px rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.06)}
.fan span img{width:100%;height:100%;object-fit:cover;display:block}
.fan span:nth-child(1){left:8px;transform:rotate(-13deg);top:16px;opacity:.75}
.fan span:nth-child(2){left:49px;z-index:2}
.fan span:nth-child(3){left:90px;transform:rotate(13deg);top:16px;opacity:.75}
.smsg{margin:18px 16px 0;padding:18px 18px 18px;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-sunken);display:flex;flex-direction:column;gap:8px}
.smsg b{font:600 15.5px 'IBM Plex Sans',sans-serif}
.smsg p{margin:0;font-size:14px;line-height:1.6;color:var(--fg-muted)}
.obtn{align-self:flex-start;margin-top:6px;height:44px;padding:0 18px;border-radius:10px;border:1px solid var(--border-strong);display:flex;align-items:center;font:500 14px 'IBM Plex Sans',sans-serif;color:var(--fg)}
.skel{display:flex;align-items:center;gap:12px;height:72px;padding:0 16px;border-top:1px solid var(--border)}
.skel .a{width:40px;height:56px;border-radius:4px;background:var(--surface-raised)}
.skel .l{display:flex;flex-direction:column;gap:9px;flex:1}
.skel .l i{display:block;height:10px;border-radius:5px;background:var(--surface-raised)}

/* the result row (shared) */
.rr{display:flex;align-items:center;gap:12px;min-height:72px;padding:8px 10px 8px 16px;border-top:1px solid var(--border);position:relative}
.rr.first{border-top:0}
.rr.act{background:var(--elevated)}
.rr.foc{box-shadow:inset 0 0 0 2px var(--accent);border-radius:8px}
.rr .art{width:40px;height:56px;border-radius:4px;overflow:hidden;flex:none;background:var(--surface-sunken);box-shadow:0 0 0 1px rgba(0,0,0,.35),0 4px 10px rgba(0,0,0,.35)}
.rr .art img{width:100%;height:100%;object-fit:cover;display:block}
.rr .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.rr .nm{font:600 15px/1.3 'IBM Plex Sans',sans-serif;color:var(--fg);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rr .nm em{font-style:normal;color:var(--accent)}
.rr .fl{font:11.5px 'IBM Plex Mono',monospace;color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rr .fl em{font-style:normal;color:var(--accent)}
.rr .own{display:flex;align-items:center;gap:0;font:11.5px 'IBM Plex Mono',monospace;color:var(--fg-faint);white-space:nowrap;min-width:0}
.rr .own b{font-weight:500;color:var(--fg-body)}
.rr .own .dn{overflow:hidden;text-overflow:ellipsis;min-width:0;color:var(--fg-body)}
.rr .own .j{color:var(--border-dashed);white-space:pre;flex:none}
.rr .own .pl{flex:none;color:var(--fg-body)}
.rr .wl{width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:var(--accent);flex:none}
.rr .wl.sp{visibility:hidden}
/* desktop row */
.dres .rr{min-height:58px;padding:7px 14px 7px 14px;gap:12px}
.dres .rr .art{width:30px;height:42px;border-radius:3px}
.dres .rr .nm{font-size:14px;-webkit-line-clamp:1}
.dres .rr .own,.dres .rr .fl{font-size:11px}

/* ---- desktop ---- */
.dk{width:1300px;height:820px;flex:none;display:flex;background:var(--bg);border:1px solid var(--border-strong);border-radius:12px;overflow:hidden;position:relative;font-family:'IBM Plex Sans',sans-serif;color:var(--fg)}
.rail{width:62px;flex:none;display:flex;flex-direction:column;align-items:center;padding:14px 0;border-right:1px solid var(--border);background:var(--surface-rail);position:relative;z-index:6}
.rail .mk{display:flex;flex-direction:column;align-items:center;gap:3px;margin-bottom:20px}
.rail .mk .nn{font:900 23px/20px 'Cinzel',serif}
.rsl{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);margin-bottom:4px}
.rsl.on{background:var(--elevated);color:var(--fg)}
.rsrch{width:46px;height:48px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface-sunken);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:var(--fg-muted);margin-bottom:14px}
.rsrch small{font:500 9px 'IBM Plex Mono',monospace;letter-spacing:.04em;color:var(--fg-faint)}
.rsrch.on{border-color:var(--accent);color:var(--fg);box-shadow:0 0 0 2px rgba(255,77,154,.25)}
.rsrch.hov{background:var(--elevated)}
.rfoot{margin-top:auto;display:flex;flex-direction:column;align-items:center}
.rav{width:30px;height:30px;border-radius:50%;border:1px solid var(--accent);font:500 11px 'IBM Plex Sans',sans-serif;display:flex;align-items:center;justify-content:center}
.main{flex:1;min-width:0;position:relative;overflow:hidden;display:flex;flex-direction:column}
.fly{position:absolute;left:74px;top:69px;z-index:9;width:540px;display:flex;flex-direction:column;gap:8px}
.fly::before{content:'';position:absolute;left:-6px;top:18px;width:10px;height:10px;transform:rotate(45deg);background:var(--bg);border-left:1px solid var(--accent);border-bottom:1px solid var(--accent)}
.dfld{height:46px;border:1px solid var(--accent);border-radius:10px;background:var(--bg);display:flex;align-items:center;gap:12px;padding:0 10px 0 16px;font-size:15px;color:var(--fg);box-shadow:0 18px 40px rgba(0,0,0,.45)}
.dfld.ph0{color:var(--fg-placeholder)}
.dfld .caret{width:1.5px;height:18px;background:var(--accent);margin-left:-10px}
.dfld .esc{margin-left:auto;font:500 10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint);border:1px solid var(--border-strong);border-radius:5px;padding:2px 6px}
.dfld .clr{margin-left:auto;color:var(--fg-faint);font-size:13px;width:28px;text-align:center}
.dres{background:var(--surface-raised);border:1px solid var(--border-strong);border-radius:12px;box-shadow:0 22px 50px rgba(0,0,0,.6);padding:6px 0;overflow:hidden}
.dres .hd{display:flex;align-items:center;justify-content:space-between;padding:8px 14px 6px;font:10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.dres .hd a{font:500 13px 'IBM Plex Sans',sans-serif;letter-spacing:0;text-transform:none;text-underline-offset:3px}
.dres .ft{padding:9px 14px 5px;border-top:1px solid var(--border);font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint);display:flex;justify-content:space-between}
.dres .msg{padding:14px 16px 12px;display:flex;flex-direction:column;gap:6px}
.dres .msg b{font:600 14.5px 'IBM Plex Sans',sans-serif}
.dres .msg p{margin:0;font-size:13.5px;line-height:1.55;color:var(--fg-muted)}
.dres .msg .obtn{height:34px;padding:0 14px;font-size:13px;border-radius:8px}
.dres .prog{margin:0 0 4px}
.dres .skel .a,.dres .skel .l i{background:var(--elevated)}
/* collection page (desktop) */
.chd{display:flex;align-items:flex-start;justify-content:space-between;padding:28px 34px 0}
.chd h1{margin:0;font:700 30px 'Chakra Petch',sans-serif;line-height:45px}
.stats{font:13px 'IBM Plex Mono',monospace;color:var(--fg-faint);margin-top:4px}
.hbtn{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 18px;border:1px solid var(--border-strong);border-radius:9px;color:var(--fg);font:600 14.5px 'IBM Plex Sans',sans-serif}
.dtb{display:flex;gap:28px;padding:14px 34px 0;border-bottom:1px solid var(--border)}
.dtb .tab{display:flex;align-items:flex-end;gap:7px;height:44px;padding:0 2px 12px;border-bottom:2px solid transparent;font-size:15.5px;color:var(--fg-muted)}
.dtb .tab.on{border-bottom-color:var(--accent);color:var(--fg);font-weight:500}
.tb{display:flex;align-items:center;gap:12px;padding:18px 34px 0}
.sf{height:46px;width:560px;border:1px solid var(--border-strong);border-radius:10px;display:flex;align-items:center;gap:12px;padding:0 16px;color:var(--fg-placeholder);font-size:15px}
.dd{display:inline-flex;align-items:center;gap:10px;height:44px;padding:0 16px;border-radius:9px;background:#191B22;color:var(--fg);font:500 14.5px 'IBM Plex Sans',sans-serif}
.grid{display:grid;grid-template-columns:repeat(6,178px);gap:20px;padding:18px 34px 34px}
.grid .tile{border-radius:10px}
.grid .tile .cpt{padding:7px 10px 9px;min-height:58px}
.grid .tile .cn{font-size:13px;line-height:17px}
.grid .tile .cs{font-size:9.5px}
/* card modal (desktop), as shipped */
.dscrim{position:absolute;inset:0;z-index:7;background:rgba(14,15,20,.78)}
.cmod{position:absolute;z-index:8;left:50%;top:50%;transform:translate(-50%,-50%);width:820px;height:620px;display:flex;border-radius:16px;border:1px solid var(--border-strong);background:#12141B;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.7)}
.cl{width:316px;flex:none;background:var(--surface-sunken);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;position:relative}
.cl .card{width:248px;aspect-ratio:63/88;border-radius:12px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.55);transform:rotate(-1.2deg)}
.cl .card img{width:100%;height:100%;object-fit:cover;display:block}
.cl .ctr{position:absolute;left:16px;top:16px;height:30px;padding:0 11px;border-radius:999px;background:rgba(32,34,42,.85);display:flex;align-items:center;font:11.5px 'IBM Plex Mono',monospace;color:var(--fg-body)}
.cr{flex:1;min-width:0;display:flex;flex-direction:column;position:relative}
.cx{position:absolute;right:22px;top:20px;width:34px;height:34px;border-radius:50%;background:var(--elevated);border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font-size:14px;z-index:2}
.cbody{flex:1;min-height:0;overflow:hidden;padding:24px 30px 0 32px;display:flex;flex-direction:column;gap:16px}
.cbody h3{margin:0;font:700 26px/1.15 'Chakra Petch',sans-serif;padding-right:50px}
.cbody .ty{font-size:15px;color:var(--fg-muted)}
.rules{border:1px solid var(--border);border-radius:12px;background:var(--surface-sunken);padding:2px 18px 14px;font-size:14px;line-height:1.6;color:var(--fg-body)}
.rules p{margin:10px 0 0}
.box{border:1px solid var(--border);border-radius:12px;background:var(--surface-sunken);padding:14px 18px;display:flex;flex-direction:column;gap:8px}
.bl{display:flex;align-items:center;justify-content:space-between;font:10.5px 'IBM Plex Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.bl a{font:14px 'IBM Plex Sans',sans-serif;letter-spacing:0;text-transform:none;text-underline-offset:3px}
.bv{font:14px 'IBM Plex Mono',monospace;color:var(--accent)}
.dkr{display:flex;justify-content:space-between;font-size:14.5px;color:var(--fg-body)}
.dkr u{text-decoration-color:var(--border-dashed);text-underline-offset:4px}
.dkr span{font:13px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.cfoot{flex:none;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:14px 30px 20px 32px;border-top:1px solid var(--border)}
.lk{display:inline-flex;align-items:center;gap:8px;font:500 15px 'IBM Plex Sans',sans-serif;color:var(--accent);text-decoration:underline;text-decoration-color:rgba(255,77,154,.5);text-underline-offset:4px;white-space:nowrap}
.wbtn{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 13px;border-radius:8px;border:1px solid var(--accent);color:var(--accent);font:600 13px 'IBM Plex Sans',sans-serif;white-space:nowrap;align-self:flex-start}
/* phone card sheet, as shipped */
.pwash{position:absolute;inset:0;background-size:cover;background-position:center;filter:blur(26px);opacity:.5}
.pcount{position:absolute;left:24px;top:24px;z-index:2;height:34px;padding:0 13px;border-radius:999px;background:rgba(32,34,42,.85);display:flex;align-items:center;font:12px 'IBM Plex Mono',monospace;color:var(--fg-body)}
.pclose{position:absolute;right:20px;top:22px;z-index:2;width:36px;height:36px;border-radius:50%;background:rgba(32,34,42,.9);display:flex;align-items:center;justify-content:center;font-size:15px}
.pcard{position:absolute;left:35px;top:78px;width:320px;height:447px;border-radius:15px;overflow:hidden;box-shadow:0 22px 50px rgba(0,0,0,.6);z-index:1}
.pcard img{width:100%;height:100%;object-fit:cover;display:block}
.tsr{position:absolute;left:0;right:0;bottom:0;height:280px;z-index:3;background:var(--surface-sunken);border-radius:18px 18px 0 0;border-top:1px solid var(--border-strong);display:flex;flex-direction:column;padding:0 20px 18px}
.grip{width:36px;height:4px;border-radius:2px;background:var(--border-dashed);margin:9px auto 14px;flex:none}
.psheet{position:absolute;left:0;right:0;top:72px;bottom:0;z-index:3;background:var(--surface-sunken);border-radius:18px 18px 0 0;border-top:1px solid var(--border-strong);overflow:hidden;display:flex;flex-direction:column}
.psb{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;gap:14px;padding:6px 20px 26px}
.pfl{display:flex;flex-direction:column;gap:16px;padding-top:14px;border-top:1px solid var(--border)}
.ann{position:absolute;z-index:20;display:flex;align-items:center;gap:6px;font:600 11px 'IBM Plex Mono',monospace;color:var(--accent);white-space:nowrap}
.ann .pin{flex:none}
.meas{position:absolute;z-index:20;border:1px dashed rgba(143,166,190,.7);font:10.5px 'IBM Plex Mono',monospace;color:var(--fact);display:flex;align-items:center;justify-content:center}
table.t{border-collapse:collapse;width:100%;font-size:13px;line-height:1.5}
table.t th{font:10.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);text-align:left;padding:0 14px 8px 0;border-bottom:1px solid var(--border-strong);vertical-align:bottom}
table.t td{padding:10px 14px 10px 0;border-bottom:1px solid var(--border);vertical-align:top;color:var(--fg-body)}
table.t td:first-child{color:var(--fg);font-weight:600;white-space:nowrap}
table.t td b{color:var(--fg)}
"""

# ---------- glyphs ----------
def ico_search(size=20, sw=1.6):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="{sw}" '
            'stroke-linecap="round" aria-hidden="true"><circle cx="8.6" cy="8.6" r="5.6"/><path d="M12.8 12.8 17 17"/></svg>')

def ico_bookmark(size=16, filled=True):
    fill = "currentColor" if filled else "none"
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="{fill}" stroke="currentColor" stroke-width="1.8" '
            'stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/></svg>')

NAV = {
    "Home": '<path d="M3 9.2 10 3.6l7 5.6V16a1 1 0 0 1-1 1h-3.5v-4.2h-5V17H4a1 1 0 0 1-1-1z"/>',
    "Collection": '<rect x="3.2" y="3.2" width="5.8" height="5.8" rx="1.2"/><rect x="11" y="3.2" width="5.8" height="5.8" rx="1.2"/><rect x="3.2" y="11" width="5.8" height="5.8" rx="1.2"/><rect x="11" y="11" width="5.8" height="5.8" rx="1.2"/>',
    "Commanders": '<path d="M3 14.5 4.4 6l3.2 3.6L10 4l2.4 5.6L15.6 6 17 14.5z"/><path d="M3 16.6h14"/>',
    "Discover": '<circle cx="10" cy="10" r="6.8"/><path d="M10 6.4 12.8 10 10 13.6 7.2 10z"/>',
    "Decks": '<rect x="6.6" y="3.2" width="10" height="13" rx="1.6"/><path d="M4.2 5.4A1.6 1.6 0 0 0 3.4 6.8v8.6a1.6 1.6 0 0 0 1.6 1.6h8.2"/>',
}

def nav_icon(name):
    return (f'<svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{NAV[name]}</svg>')

def crown(s=5, l=7, gap=3):
    import math
    ds, dl = s * math.sqrt(2), l * math.sqrt(2)
    w = ds + gap + dl + gap + ds
    h = dl
    def dia(cx, d):
        r = d / 2
        cy = h - r
        return f'<path d="M{cx:.2f} {cy - r:.2f} L{cx + r:.2f} {cy:.2f} L{cx:.2f} {cy + r:.2f} L{cx - r:.2f} {cy:.2f}Z"/>'
    c1 = ds / 2
    c2 = ds + gap + dl / 2
    c3 = ds + gap + dl + gap + ds / 2
    return (f'<svg width="{w:.1f}" height="{h:.1f}" viewBox="0 0 {w:.2f} {h:.2f}" fill="var(--accent)" aria-hidden="true">'
            f'{dia(c1, ds)}{dia(c2, dl)}{dia(c3, ds)}</svg>')

def wordmark():
    return (f'<div class="wm"><span class="the">THE</span><span class="mk">{crown()}<span class="nn">99</span></span></div>')

def header(search="rest", offline=False, install=False, float_=False, extra_cls="", new=True):
    parts = []
    if offline:
        parts.append('<span class="offp"><i></i>Offline</span>')
    if install:
        parts.append('<span class="inst"><span class="b"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">'
                     '<path d="M7 2v7M7 9L4 6M7 9l3-3M2 12h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
                     '<span class="x"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span></span>')
    if search:
        on = " on" if search == "on" else ""
        nw = " new" if new else ""
        parts.append(f'<span class="sic{on}{nw}" aria-label="Search all cards">{ico_search(20)}</span>')
    parts.append('<span class="av">HH</span>')
    cls = "mhd" + (" float" if float_ else "") + (" " + extra_cls if extra_cls else "")
    return f'<div class="{cls}">{wordmark()}<div class="clu">{"".join(parts)}</div></div>'

def tabbar(active="Collection"):
    out = []
    for n in ["Home", "Collection", "Commanders", "Discover", "Decks"]:
        out.append(f'<span class="{"on" if n == active else ""}">{nav_icon(n)}{n}</span>')
    return f'<div class="tbar">{"".join(out)}</div>'

def kbd():
    rows = ['<div class="r">' + '<i></i>' * 10 + '</div>', '<div class="r">' + '<i></i>' * 9 + '</div>',
            '<div class="r"><i class="m"></i>' + '<i></i>' * 7 + '<i class="m"></i></div>',
            '<div class="r"><i class="m"></i><i class="m"></i><i class="w"></i><i class="m" style="width:88px"></i></div>']
    return f'<div class="kbd">{"".join(rows)}</div>'

def phone(inner, cls="", check="phone", style=""):
    return f'<div class="ph {cls}" data-check="{check}" style="{style}">{inner}</div>'

def frame(label, body, cap, width=390):
    return f'<div class="fr" style="width:{width}px"><span class="k">{label}</span>{body}<p class="cap">{cap}</p></div>'

def doc(title, body, width, height=None):
    h = height or 1200
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
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{width},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""

# ---------- fixtures: the reader's own data, never another player's ----------
CARDS = {
    "lathliss": dict(name="Lathliss, Dragon Queen", owned=1, decks=["HD - Dragons"], wish=False, type="Legendary Creature — Dragon"),
    "ghalta": dict(name="Ghalta, Primal Hunger", owned=2, decks=["HD - Stompy", "HD - Dinosaurs"], wish=False, type="Legendary Creature — Elder Dinosaur"),
    "killian": dict(name="Killian, Decisive Mentor", owned=1, decks=[], wish=False, type="Legendary Creature — Human Warlock"),
    "giada": dict(name="Giada, Font of Hope", owned=0, decks=[], wish=True, type="Legendary Creature — Angel"),
    "invisible-woman": dict(name="Invisible Woman", owned=1, decks=["HD - Fantastic Four"], wish=False, type="Legendary Creature — Human Hero"),
    "zimone": dict(name="Zimone, Infinite Analyst", owned=0, decks=[], wish=True, type="Legendary Creature — Human Wizard"),
    "heroes": dict(name="Heroes in a Half Shell", owned=1, decks=["HD - Turtles"], wish=False, type="Legendary Creature — Mutant Ninja Turtle"),
    "ashling": dict(name="Ashling, the Limitless", owned=2, decks=["HD - Elementals", "HD - Flicker"], wish=True, type="Legendary Creature — Elemental Shaman"),
    "dina": dict(name="Dina, Essence Brewer", owned=1, decks=[], wish=False, type="Legendary Creature — Dryad Druid"),
    "doom": dict(name="Doctor Doom, King of Latveria", owned=0, decks=[], wish=False, type="Legendary Creature — Human Noble Villain"),
    "quintorius": dict(name="Quintorius, History Chaser", owned=1, decks=["HD - Boros Spirits"], wish=False, type="Legendary Creature — Elephant Cleric Spirit"),
    "rootha": dict(name="Rootha, Mastering the Moment", owned=1, decks=["HD - Izzet Spells"], wish=False, type="Legendary Creature — Human Wizard"),
    "zada": dict(name="Zada, Hedron Grinder", owned=0, decks=[], wish=False, type="Legendary Creature — Goblin Ally"),
    "captain-america": dict(name="Captain America, Team Leader", owned=1, decks=[], wish=False, type="Legendary Creature — Human Soldier Hero"),
    "gisa": dict(name="Ghoulcaller Gisa", owned=0, decks=[], wish=False, type="Legendary Creature — Human Wizard"),
    "miku": dict(name="Trostani, Selesnya’s Voice", flavor="Miku, Song of the People", owned=1, decks=["HD - Tokens"], wish=False, type="Legendary Creature — Dryad"),
    "sai": dict(name="Sai, Master Thopterist", owned=1, decks=["HD - Artifacts"], wish=False, type="Legendary Creature — Human Artificer"),
}

def hl(text, q):
    if not q:
        return text
    i = text.lower().find(q.lower())
    if i < 0:
        return text
    return f'{text[:i]}<em>{text[i:i + len(q)]}</em>{text[i + len(q):]}'

def own_line(c):
    """The ownership line: `×N owned` (the shipped quick-add words) or `not owned`, then the first deck by name
    and `+N` more. The wishlist is the bookmark marker at the row's end, never a word on this line."""
    bits = []
    if c["owned"]:
        bits.append(f'<span><b>×{c["owned"]}</b> owned</span>')
    else:
        bits.append('<span>not owned</span>')
    if c["decks"]:
        bits.append('<span class="j"> · </span>')
        bits.append(f'<span class="dn">in {c["decks"][0]}</span>')
        if len(c["decks"]) > 1:
            bits.append(f'<span class="pl">&nbsp;+{len(c["decks"]) - 1}</span>')
    return f'<span class="own">{"".join(bits)}</span>'

def row(key, q="", first=False, cls="", c=None, wl_words=False):
    c = c or CARDS[key]
    nm = hl(c["name"], q) if not c.get("flavor") or q.lower() in c["name"].lower() else c["name"]
    flav = ""
    if c.get("flavor") and q and q.lower() not in c["name"].lower():
        flav = f'<span class="fl">printed as {hl(c["flavor"], q)}</span>'
    wl = (f'<span class="wl" aria-label="on your wishlist">{ico_bookmark(16)}</span>' if c["wish"]
          else '<span class="wl sp"></span>')
    words = ""
    if wl_words and c["wish"]:
        wl = ""
        words = f'<span class="own" style="color:var(--accent)">{ico_bookmark(11)}&nbsp;on your wishlist</span>'
    return (f'<div class="rr{" first" if first else ""} {cls}"><span class="art"><img src="art/{key}.jpg" alt=""></span>'
            f'<span class="tx"><span class="nm">{nm}</span>{flav}{own_line(c)}{words}</span>{wl}</div>')
