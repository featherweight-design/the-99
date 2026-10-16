"""Drawing kit for the Rule 0 table check R1 boards.

Static HTML in the dc wrapper, drawn over the shipped shell (Kamigawa tokens, the 73px phone header, the 62px
rail, the 74px tab bar), the shipped pod card (Social R1, B: the pod as a table), the shipped bracket chip and
findings marks (Analysis tab), and the shipped log form (Social R3)."""
import json, os
import basekit as B

HERE = os.path.dirname(os.path.abspath(__file__))
G = json.load(open(os.path.join(HERE, "glyphs.json")))

INK = {1: "#8A857C", 2: "#A89A74", 3: "#C9AC62", 4: "#E6D08A", 5: "#FBEFC6"}
NAMES = {1: "Exhibition", 2: "Core", 3: "Upgraded", 4: "Optimized", 5: "cEDH"}
SLUG = {1: "exhibition", 2: "core", 3: "upgraded", 4: "optimized", 5: "cedh"}

CSS = B.CSS.replace(".wash-heroes{background-image:url(art/heroes.jpg)}", "") + r"""
.hi{--flag:#E0913C}
.lo{--flag:#8FA6BE}
.sp{--flag:#B9A0D6}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 18px;border-radius:10px;font:600 14.5px 'IBM Plex Sans',sans-serif;white-space:nowrap;border:0;cursor:pointer}
.btn.pri{background:var(--accent);color:#0E0F14}
.btn.gho{background:transparent;color:var(--fg);border:1px solid var(--border-strong)}
.btn.sm{min-height:36px;padding:0 13px;font-size:13px;border-radius:8px}
.btn.full{width:100%}
.btn[aria-disabled=true]{opacity:.4}
.lnk{font:500 13.5px 'IBM Plex Sans',sans-serif;color:var(--accent);text-decoration:underline;text-decoration-color:rgba(255,77,154,.5);text-underline-offset:4px;background:none;border:0;padding:0;min-height:44px;display:inline-flex;align-items:center;gap:6px}
.mono{font-family:'IBM Plex Mono',monospace}

/* page chrome, phone */
.back{display:flex;align-items:center;gap:4px;height:44px;padding:0 8px;color:var(--fg-muted);font:14px 'IBM Plex Sans',sans-serif;flex:none}
.back b{font-weight:400;font-size:20px;line-height:1;margin-top:-2px}
.pg{padding:0 16px 22px;display:flex;flex-direction:column;gap:14px}
.pgh h1{margin:0;font:700 24px/1.2 'Chakra Petch',sans-serif}
.pgh .meta{margin-top:6px;font:11.5px/1.55 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.pgh .meta b{color:var(--fg-body);font-weight:500}
.pgh .row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}

/* the bracket chip, as shipped (22px phone / 24px desktop) */
.chip{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px 0 2px;border-radius:6px;border:1px solid;white-space:nowrap;flex:none}
.chip .f{font:10px 'IBM Plex Mono',monospace}
.chip.lg{height:24px}.chip.lg .f{font-size:11px}
.chip svg{display:block}
.stale{display:inline-flex;align-items:center;gap:5px;font:10.5px 'IBM Plex Mono',monospace;color:var(--warning)}
.stale i{width:6px;height:6px;border-radius:50%;background:var(--warning);display:block}

/* fact strip: the five findings, counts not verdicts */
.facts{display:flex;align-items:center;gap:4px;flex-wrap:nowrap}
.fx{display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 7px;border-radius:7px;background:var(--surface-sunken);border:1px solid var(--border);color:var(--fact);font:600 12px 'IBM Plex Mono',monospace}
.fx svg{width:13px;height:13px}
.fx.z{color:var(--fg-locked);font-weight:400;background:transparent}
.fx.drv{border-color:color-mix(in oklab,var(--flag) 60%,transparent);color:var(--fg);background:color-mix(in srgb,var(--flag) 12%,var(--surface-sunken))}
.fx.drv svg{color:var(--flag)}

/* a seat, phone */
.seats{display:flex;flex-direction:column;gap:10px}
.seat{position:relative;border-radius:12px;border:1px solid var(--border-strong);background:var(--surface-rail);overflow:hidden}
.seat.you{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.seat.flag{border-color:color-mix(in oklab,var(--flag) 70%,transparent)}
.seat.you.flag{border-color:var(--accent)}
.seat .wash{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.seat .wash img{position:absolute;inset:-30px;width:calc(100% + 60px);height:calc(100% + 60px);object-fit:cover;filter:blur(30px) saturate(1.2);opacity:.22}
.seat .top{position:relative;display:flex;gap:12px;padding:12px 12px 10px}
.seat .art{width:84px;height:60px;border-radius:9px;overflow:hidden;flex:none;box-shadow:0 8px 18px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.08);background:var(--surface-sunken)}
.seat .art img{width:100%;height:100%;object-fit:cover;display:block}
.seat .art.ini{display:flex;align-items:center;justify-content:center;font:700 22px 'Chakra Petch',sans-serif;color:var(--fg-muted);background:radial-gradient(120px 80px at 50% 40%,#262A35,var(--surface))}
.seat .who{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.seat .nm{display:flex;align-items:baseline;gap:7px;font:600 15px 'IBM Plex Sans',sans-serif;min-width:0}
.seat .nm small{font:10px 'IBM Plex Mono',monospace;font-weight:400;color:var(--fg-muted);white-space:nowrap}
.seat .nm .yt{font:500 9.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;color:var(--accent)}
.seat .dkn{font-size:13.5px;color:var(--fg-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.seat .cm{font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.seat .ln{position:relative;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 12px 12px}
.seat .why{position:relative;margin:0 12px 12px;padding:10px 12px;border-radius:9px;background:color-mix(in srgb,var(--flag) 9%,var(--surface-sunken));border:1px solid color-mix(in oklab,var(--flag) 35%,transparent);font-size:13px;line-height:1.55;color:var(--fg-body)}
.seat .why b{color:var(--fg);font-weight:600}
.flagtag{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:6px;font:600 10.5px 'IBM Plex Mono',monospace;letter-spacing:.04em;color:#0E0F14;background:var(--flag);white-space:nowrap}
.flagtag svg{width:10px;height:10px}
.seat .change{min-height:36px}
.chg{display:inline-flex;align-items:center;gap:6px;font:10.5px 'IBM Plex Mono',monospace;color:var(--accent)}
.chg i{width:7px;height:7px;border-radius:50%;background:var(--accent);display:block}
.wait{position:relative;margin:0 12px 12px;padding:10px 12px;border-radius:9px;border:1.5px dashed var(--border-dashed);font-size:13px;line-height:1.55;color:var(--fg-muted)}
.wait b{color:var(--fg-body);font-weight:600}
.bar{height:4px;border-radius:2px;background:var(--elevated);overflow:hidden;margin-top:8px}
.bar i{display:block;height:100%;background:var(--warning)}
.bar.ok i{background:var(--success)}
.spin{width:14px;height:14px;border-radius:50%;border:2px solid var(--border-strong);border-top-color:var(--accent);display:inline-block;flex:none}

/* the read */
.read{position:relative;border-radius:14px;border:1px solid var(--border-strong);background:var(--surface);padding:14px 14px 12px;display:flex;flex-direction:column;gap:12px;overflow:hidden}
.read .kk{display:flex;align-items:center;justify-content:space-between}
.read h2{margin:0;font:700 19px/1.3 'Chakra Petch',sans-serif;text-wrap:pretty}
.read h2 .hiw{color:#E0913C}.read h2 .low{color:#8FA6BE}.read h2 .spw{color:#B9A0D6}
.read p{margin:0;font-size:13.5px;line-height:1.6;color:var(--fg-body);text-wrap:pretty}
.read p b{color:var(--fg);font-weight:600}
.honest{display:flex;flex-direction:column;gap:2px;padding-top:10px;border-top:1px solid var(--border);font-size:12.5px;line-height:1.55;color:var(--fg-muted)}
.honest .lnk{font-size:12.5px;min-height:36px;align-self:flex-start}
.upd{font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}

/* the rail: five brackets, each seat's face over its reading */
.rail5{position:relative;display:grid;grid-template-columns:repeat(5,1fr);border-radius:10px;background:var(--surface-sunken);border:1px solid var(--border);padding:10px 4px 6px}
.rail5 .col{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;min-height:92px;justify-content:flex-end;z-index:1}
.rail5 .col.mid{background:transparent}
.rail5 .band{position:absolute;top:4px;bottom:4px;border-radius:8px;background:rgba(255,77,154,.07);border:1px dashed rgba(255,77,154,.45);z-index:0}
.rail5 .band span{position:absolute;top:5px;left:0;right:0;text-align:center;font:500 8.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;color:var(--accent)}
.rail5 .fc{display:flex;flex-direction:column-reverse;align-items:center;gap:3px;margin-top:16px}
.rail5 .lab{display:flex;flex-direction:column;align-items:center;gap:1px;font:9px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.face{width:30px;height:30px;border-radius:50%;overflow:hidden;flex:none;border:1.5px solid var(--bg);box-shadow:0 0 0 1px rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font:600 10px 'IBM Plex Mono',monospace;color:var(--fg-muted);background:var(--elevated);position:relative}
.face img{width:100%;height:100%;object-fit:cover;display:block}
.face.you{box-shadow:0 0 0 1.5px var(--accent)}
.face.flag{box-shadow:0 0 0 2px var(--flag)}
.span{position:absolute;bottom:34px;height:30px;border-radius:15px;border:1px dashed var(--fg-faint);z-index:0}
.rkey{display:flex;flex-wrap:wrap;gap:4px 12px;font:10px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.rkey span{display:inline-flex;align-items:center;gap:5px}
.rkey i{width:10px;height:10px;border-radius:50%;display:block}

/* suggestion */
.sug{position:relative;margin:0 12px 12px;padding:12px;border-radius:10px;background:var(--surface-sunken);border:1px solid var(--border-strong);display:flex;flex-direction:column;gap:10px}
.sug .hd{display:flex;flex-direction:column;gap:3px}
.sug .hd b{font:600 14px 'IBM Plex Sans',sans-serif}
.sug .hd span{font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
.sopt{display:flex;align-items:center;gap:10px;min-height:60px;padding:6px 6px 6px 6px;border-radius:9px;background:var(--surface-rail);border:1px solid var(--border)}
.sopt .a{width:64px;height:46px;border-radius:7px;overflow:hidden;flex:none}
.sopt .a img{width:100%;height:100%;object-fit:cover;display:block}
.sopt .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.sopt .t b{font:600 13.5px 'IBM Plex Sans',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sopt .t span{display:flex;align-items:center;gap:6px;font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint);white-space:nowrap}
.sopt .btn{flex:none}

/* sheets and modals */
.sh{position:absolute;left:0;right:0;bottom:0;z-index:9;background:var(--surface-sunken);border-top:1px solid var(--border-strong);border-radius:18px 18px 0 0;display:flex;flex-direction:column;box-shadow:0 -20px 50px rgba(0,0,0,.5)}
.sh .grip{margin:9px auto 4px}
.shh{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:6px 8px 4px 18px}
.shh h3{margin:10px 0 0;font:700 18px 'Chakra Petch',sans-serif}
.shh .x{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:14px;flex:none;background:none;border:0}
.shs{padding:0 18px;font-size:13px;line-height:1.55;color:var(--fg-muted);margin:0}
.shb{padding:12px 18px 18px;display:flex;flex-direction:column;gap:12px}
.mtiles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px 10px}
.mt{position:relative;display:flex;flex-direction:column;gap:6px;background:none;border:0;padding:0;text-align:left;color:var(--fg);min-width:0}
.mt .im{position:relative;height:74px;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.08);box-shadow:0 10px 24px rgba(0,0,0,.45);background:var(--surface)}
.mt .im img{width:100%;height:100%;object-fit:cover;display:block}
.mt .im.ini{display:flex;align-items:center;justify-content:center;font:700 26px 'Chakra Petch',sans-serif;color:var(--fg-muted);background:radial-gradient(120px 80px at 50% 40%,#262A35,var(--surface))}
.mt.on .im{border:1px solid var(--accent);box-shadow:0 0 0 1px var(--accent),0 10px 24px rgba(0,0,0,.45)}
.mt .ck{position:absolute;right:5px;top:5px;width:24px;height:24px;border-radius:7px;border:1.5px solid rgba(230,232,240,.7);background:rgba(14,15,20,.55);display:flex;align-items:center;justify-content:center}
.mt.on .ck{background:var(--accent);border-color:var(--accent);color:#0E0F14}
.mt .n{display:flex;align-items:baseline;gap:5px;font:500 13px 'IBM Plex Sans',sans-serif;min-width:0}
.mt .n span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mt .n small{font:10px 'IBM Plex Mono',monospace;color:var(--fg-muted);white-space:nowrap;flex:none}
.mt .s{font:10px 'IBM Plex Mono',monospace;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mt.off{opacity:.42}
.cnt{font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.inv{display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 12px;border-radius:10px;border:1.5px dashed var(--border-dashed);color:var(--fg-body);font-size:13.5px;line-height:1.45;background:none;text-align:left;width:100%}
.inv b{color:var(--fg);font-weight:600}
.inv .pl{width:30px;height:30px;border-radius:9px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;color:var(--accent);flex:none;font-size:16px}
.srow{display:flex;align-items:center;gap:12px;min-height:64px;padding:8px 6px 8px 8px;border-radius:10px;background:var(--surface-rail);border:1px solid var(--border);width:100%;text-align:left;color:var(--fg)}
.srow .a{width:64px;height:46px;border-radius:7px;overflow:hidden;flex:none}
.srow .a img{width:100%;height:100%;object-fit:cover;display:block}
.srow .a.ini{display:flex;align-items:center;justify-content:center;font:700 18px 'Chakra Petch',sans-serif;color:var(--fg-muted);background:radial-gradient(120px 80px at 50% 40%,#262A35,var(--surface))}
.srow .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.srow .t b{font:600 14px 'IBM Plex Sans',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.srow .t span{font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.srow .t .pick{color:var(--accent);font:500 13px 'IBM Plex Sans',sans-serif}
.srow .go{width:32px;color:var(--fg-faint);text-align:center;flex:none}
.srow.on{border-color:var(--accent)}
.dopt{display:flex;align-items:center;gap:12px;min-height:60px;padding:6px 8px;border-radius:9px;width:100%;background:none;border:0;text-align:left;color:var(--fg)}
.dopt.on{background:var(--elevated)}
.dopt .a{width:58px;height:42px;border-radius:7px;overflow:hidden;flex:none}
.dopt .a img{width:100%;height:100%;object-fit:cover;display:block}
.dopt .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.dopt .t b{font:600 14px 'IBM Plex Sans',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dopt .t span{font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dopt.off{opacity:.45}
.toast{position:absolute;left:12px;right:12px;z-index:12;display:flex;align-items:center;gap:12px;min-height:52px;padding:6px 6px 6px 16px;border-radius:12px;background:#20222A;border:1px solid var(--border-strong);box-shadow:0 16px 40px rgba(0,0,0,.6);font-size:13.5px;color:var(--fg)}
.toast span{flex:1;min-width:0}
.toast .lnk{min-height:40px;padding:0 10px}

/* pod card, as shipped (Social R1 B) */
.podc{position:relative;border-radius:12px;background:var(--surface-rail);border:1px solid var(--border-strong);padding:4px 4px 6px 14px;overflow:hidden}
.podc .pwsh{position:absolute;inset:-40px;display:flex;opacity:.3;filter:blur(34px) saturate(1.25);pointer-events:none}
.podc .pwsh img{flex:1;min-width:0;height:100%;object-fit:cover}
.podc .hd{position:relative;display:flex;align-items:center;gap:10px;min-height:44px}
.podc .hd b{font:600 15px 'IBM Plex Sans',sans-serif}
.podc .hd span{font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.podc .hd .mn{margin-left:auto;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);letter-spacing:2px}
.podc ul{position:relative;list-style:none;margin:8px 10px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:12px 10px}
.podc li{display:flex;flex-direction:column;gap:6px;min-width:0}
.podc .pi{height:74px;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.08);box-shadow:0 10px 24px rgba(0,0,0,.45)}
.podc .pi img{width:100%;height:100%;object-fit:cover;display:block}
.podc .pi.ini{display:flex;align-items:center;justify-content:center;font:700 26px 'Chakra Petch',sans-serif;color:var(--fg-muted);background:radial-gradient(120px 80px at 50% 40%,#262A35,var(--surface))}
.podc li.you .pi{border:1px solid var(--accent);box-shadow:0 0 0 1px var(--accent),0 10px 24px rgba(0,0,0,.45)}
.podc .pn{display:flex;align-items:baseline;gap:6px;font:500 13px 'IBM Plex Sans',sans-serif;min-width:0}
.podc .pn small{font:10px 'IBM Plex Mono',monospace;color:var(--fg-muted);font-weight:400;white-space:nowrap}
.podc .share{position:relative;display:flex;align-items:center;gap:10px;min-height:44px;margin-top:10px;font-size:13px;color:var(--fg-body)}
.podc .share i{width:18px;height:18px;border-radius:5px;border:1.5px solid var(--border-dashed);display:block}
.podc .share i.on{background:var(--accent);border-color:var(--accent)}
.rz{color:var(--fg);text-align:left;font:inherit;text-decoration:none;cursor:pointer;width:calc(100% - 10px);box-sizing:border-box;position:relative;margin:4px 10px 4px 0;display:flex;align-items:center;gap:12px;min-height:52px;padding:6px 6px 6px 12px;border-radius:10px;border:1px solid var(--border-strong);background:color-mix(in srgb,var(--surface-sunken) 80%,transparent)}
.rz .ic{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--accent);background:rgba(255,77,154,.1);flex:none}
.rz .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.rz .tx b{font:600 14px 'IBM Plex Sans',sans-serif}
.rz .tx span{font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rz.open{border-color:var(--accent)}
.rz .faces{display:flex}
.rz .faces .face{width:24px;height:24px;margin-left:-6px}
.fsec{display:flex;align-items:center;justify-content:space-between;font:10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);margin-top:6px}
.fsec a{font:500 13px 'IBM Plex Sans',sans-serif;letter-spacing:0;text-transform:none;color:var(--accent);text-decoration:none}
.frow{display:flex;align-items:center;gap:12px;min-height:56px;border-bottom:1px solid var(--border)}
.frow .a{width:36px;height:36px;border-radius:9px;overflow:hidden;flex:none}
.frow .a img{width:100%;height:100%;object-fit:cover;display:block}
.frow .a.ini{display:flex;align-items:center;justify-content:center;font:500 11px 'IBM Plex Mono',monospace;color:var(--fg-muted);background:var(--elevated)}
.frow .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.frow .t b{font:600 14.5px 'IBM Plex Sans',sans-serif}
.frow .t span{font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.frow .s{font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.frow .m{width:36px;text-align:center;color:var(--fg-muted);letter-spacing:2px}

/* Home table card */
.htab{position:relative;border-radius:14px;border:1px solid var(--accent);background:var(--surface-rail);overflow:hidden;padding:14px;display:flex;flex-direction:column;gap:10px}
.htab .pwsh{position:absolute;inset:-40px;display:flex;opacity:.28;filter:blur(34px) saturate(1.25);pointer-events:none}
.htab .pwsh img{flex:1;min-width:0;height:100%;object-fit:cover}
.htab>*{position:relative}
.htab h3{margin:0;font:700 18px 'Chakra Petch',sans-serif}
.htab p{margin:0;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.htab .fs{display:flex;gap:6px}
.htab .fs .face{width:36px;height:36px;border-radius:10px}

/* log form, as shipped (Social R3) */
.form{border-radius:12px;padding:16px;background:var(--surface);border:1px solid var(--border-strong)}
.fh{display:flex;align-items:baseline;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--border)}
.fh h3{margin:0;font:700 17px 'Chakra Petch',sans-serif}
.fh span{font:10px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.flb{display:block;font:500 9.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);margin-bottom:8px}
.rg{display:flex;gap:7px}
.rb{flex:1;height:44px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--fg-body);font:500 13.5px 'IBM Plex Sans',sans-serif}
.rb.win{background:#6FA368;border-color:#6FA368;color:#0E0F14;font-weight:600}
.pz{flex:1;height:44px;border-radius:8px;border:1px solid var(--border-strong);background:transparent;color:var(--fg-body);font:600 14px 'IBM Plex Mono',monospace;padding:0}
.pz.on{border-color:var(--accent);background:rgba(255,77,154,.12);color:var(--accent)}
.prow{display:flex;align-items:center;gap:4px;min-height:58px;padding:0 0 0 6px;border:1px solid var(--border);border-radius:10px;background:var(--surface-rail)}
.prow .pa{display:flex;align-items:center;gap:11px;flex:1;min-width:0;padding:7px 0}
.pth{width:58px;height:40px;border-radius:7px;overflow:hidden;flex:none;background:var(--elevated);display:flex;align-items:center;justify-content:center;font:500 12px 'IBM Plex Mono',monospace;color:var(--fg-muted)}
.pth img{width:100%;height:100%;object-fit:cover;display:block}
.pt{display:flex;flex-direction:column;min-width:0}
.pt .pn{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pt .ps{font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.px{flex:none;width:44px;height:44px;border:0;background:transparent;color:var(--fg-muted);font-size:13px;padding:0}
.ytag{flex:none;margin-right:12px;font:500 9.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;color:var(--fg-faint)}
.from{display:flex;align-items:center;gap:8px;min-height:40px;padding:0 12px;border-radius:9px;background:rgba(255,77,154,.08);border:1px solid rgba(255,77,154,.35);font-size:13px;color:var(--fg-body)}
.from b{color:var(--fg);font-weight:600}
.ax{display:flex;align-items:center;gap:11px;min-height:48px;border-radius:8px;padding:5px 12px;border:1px solid var(--border);background:var(--surface);margin-top:6px}
.ax .bx{width:20px;height:20px;border-radius:5px;border:1px solid var(--border-strong)}
.ax b{font-size:14px;font-weight:500}
.ax span{font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}

/* desktop page */
.dmain{flex:1;min-width:0;overflow:hidden;position:relative;display:flex;flex-direction:column}
.dph{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding:22px 34px 16px;border-bottom:1px solid var(--border)}
.dph .bk{font:13px 'IBM Plex Sans',sans-serif;color:var(--fg-muted);margin-bottom:6px;display:flex;align-items:center;gap:6px}
.dph h1{margin:0;font:700 30px/1.2 'Chakra Petch',sans-serif}
.dph .meta{margin-top:6px;font:12px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.dph .meta b{color:var(--fg-body);font-weight:500}
.dbody{display:grid;grid-template-columns:minmax(0,1fr) 392px;gap:28px;padding:22px 34px 28px;align-items:start}
.dseats{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start}
.dseats .seat .art{width:96px;height:68px}
.dside{display:flex;flex-direction:column;gap:14px}
.dmod{position:absolute;z-index:9;left:50%;top:50%;transform:translate(-50%,-50%);width:640px;border-radius:16px;border:1px solid var(--border-strong);background:#12141B;box-shadow:0 30px 80px rgba(0,0,0,.7);display:flex;flex-direction:column}
.dmod .shh{padding:14px 12px 4px 24px}
.dmod .shs{padding:0 24px}
.dmod .shb{padding:16px 24px 22px}
.dmod .mtiles{grid-template-columns:repeat(5,1fr)}
.dmod .mt .im{height:84px}
.dfoot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px 18px;border-top:1px solid var(--border)}
.anch{position:absolute;z-index:9;width:420px;border-radius:12px;border:1px solid var(--border-strong);background:#191B22;box-shadow:0 22px 50px rgba(0,0,0,.6);padding:8px}
.anch .hd{display:flex;align-items:center;justify-content:space-between;padding:6px 8px 8px;font:10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.fpage{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:36px;padding:26px 34px}
.closed{margin:auto;max-width:440px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:30px 20px}
.closed h2{margin:0;font:700 22px 'Chakra Petch',sans-serif}
.closed p{margin:0;font-size:14.5px;line-height:1.6;color:var(--fg-muted);text-wrap:pretty}
.ttable{position:relative;width:200px;height:120px;margin-bottom:8px}
.ttable .tb{position:absolute;left:30px;top:30px;width:140px;height:62px;border-radius:31px;border:1.5px dashed var(--border-dashed)}
.ttable .face{position:absolute;width:34px;height:34px;opacity:.55;filter:grayscale(.6)}
"""

# ---------- glyphs ----------
def glyph(key, size=13, color="currentColor", cls=""):
    g = G[key]
    body = g["body"].replace('"#000"', '"currentColor"')
    return (f'<svg class="{cls}" width="{size}" height="{size}" viewBox="{g["vb"]}" style="color:{color}" '
            f'aria-hidden="true">{body}</svg>')

def mark(b, px=22, dim=False, form="chip"):
    key = f"bracket-{b}-{SLUG[b]}" + ("-chip" if form == "chip" else "")
    g = G[key]
    body = g["body"].replace('font-family="Cinzel,serif"', 'font-family="Cinzel,serif"')
    op = ' opacity="0.65"' if dim else ""
    return (f'<svg width="{px}" height="{px}" viewBox="{g["vb"]}" style="color:{INK[b]}"{op} aria-hidden="true">{body}</svg>')

FACT = [("gameChangers", "fact-game-changer", "Game changers"), ("massLandDenial", "fact-mass-land-denial", "Mass land denial"),
        ("extraTurns", "fact-extra-turns", "Extra turns"), ("twoCardCombos", "fact-two-card-infinite", "Two-card infinites"),
        ("tutors", "fact-tutors", "Tutors")]

def chip(permits, answered=None, lg=False):
    """The shipped BracketChip: a range draws both marks, the upper at .65, and both names; an answer draws itself."""
    if answered:
        low, marks, face = answered, [answered], NAMES[answered]
    elif len(permits) == 2:
        low, marks, face = permits[0], permits, f"{NAMES[permits[0]]} or {NAMES[permits[1]]}"
    else:
        low, marks, face = permits[0], permits, NAMES[permits[0]]
    ink = INK[low]
    ms = "".join(mark(b, 22, dim=i > 0) for i, b in enumerate(marks))
    return (f'<span class="chip{" lg" if lg else ""}" style="background:color-mix(in srgb,{ink} 12%,#0E0F14);'
            f'border-color:color-mix(in oklab,{ink} 55%,transparent)">{ms}<span class="f" style="color:{ink}">{face}</span></span>')

def facts(f, drivers=()):
    """The five findings as counts. A zero is a dim count, never a word that could read as clean."""
    out = []
    for key, g, label in FACT:
        n = f.get(key, 0)
        cls = "fx" + (" z" if n == 0 else "") + (" drv" if key in drivers else "")
        out.append(f'<span class="{cls}" title="{label}" aria-label="{label}: {n}">{glyph(g, 13)}{n}</span>')
    return f'<span class="facts">{"".join(out)}</span>'

ARROW = {"hi": '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1.5 9 8.5H1z" fill="currentColor"/></svg>',
         "lo": '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 8.5 1 1.5h8z" fill="currentColor"/></svg>',
         "sp": '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 5l3-3v6zM9 5 6 2v6z" fill="currentColor"/></svg>'}
FLAGWORD = {"hi": "Above the table", "lo": "Below the table", "sp": "Split"}

def flagtag(kind):
    return f'<span class="flagtag">{ARROW[kind]}{FLAGWORD[kind]}</span>'

def face(art, cls="", ini="", alt=""):
    inner = f'<img src="art/{art}.jpg" alt="{alt}">' if art else ini
    return f'<span class="face {cls}">{inner}</span>'

def ico_back():
    return '<b aria-hidden="true">‹</b>'

def ico_table(size=18):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" '
            'stroke-linecap="round" aria-hidden="true"><ellipse cx="10" cy="10.5" rx="5.2" ry="3.4"/><circle cx="10" cy="3.4" r="1.6"/>'
            '<circle cx="10" cy="17.6" r="1.6"/><circle cx="2.6" cy="10.5" r="1.6"/><circle cx="17.4" cy="10.5" r="1.6"/></svg>')

def check_svg():
    return ('<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7.4 5.8 10 11 4"/></svg>')

def chev():
    return ('<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" '
            'stroke-linecap="round" aria-hidden="true"><path d="M5 2.5 9.5 7 5 11.5"/></svg>')

header = B.header
tabbar = B.tabbar
frame = B.frame
wordmark = B.wordmark
nav_icon = B.nav_icon
FONTS = B.FONTS

def tabbar_none():
    out = [f'<span>{nav_icon(n)}{n}</span>' for n in ["Home", "Collection", "Commanders", "Discover", "Decks"]]
    return f'<div class="tbar">{"".join(out)}</div>'

def phone(body, h=844, overlay="", tab="none", hd=None, check="phone", fixed=False, av="HH"):
    t = tabbar(tab) if tab != "none" else tabbar_none()
    hdr = hd if hd is not None else header(search="rest", new=False).replace(">HH<", f">{av}<")
    return (f'<div class="ph" style="height:{h}px">{hdr}<div class="pb" data-check="{check}"{" data-fixed" if fixed else ""}>{body}</div>{t}{overlay}</div>')

def rail(active="Home"):
    items = "".join(f'<span class="rsl{" on" if n == active else ""}">{nav_icon(n)}</span>'
                    for n in ["Home", "Collection", "Commanders", "Discover", "Decks"])
    return (f'<div class="rail"><div class="mk">{B.crown()}<span class="nn">99</span></div>'
            f'<span class="rsrch"><span>{B.ico_search(17)}</span><small>Search</small></span>{items}'
            f'<div class="rfoot"><span class="rav">HH</span></div></div>')

def desk(body, h=820, overlay="", active="", check="desk", fixed=False, av="HH"):
    return (f'<div class="dk" style="height:{h}px">{rail(active).replace(">HH<", f">{av}<")}<div class="dmain" data-check="{check}"{" data-fixed" if fixed else ""}>{body}</div>{overlay}</div>')

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
