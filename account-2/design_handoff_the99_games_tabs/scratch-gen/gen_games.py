# Games tabs redesign R1 (Hugh 2026-11-25). Writes project/*.dc.html boards for the Design canvas.
# Three concepts for the history rows (A Seats, B Ledger, C Headline + game sheet), one shared filter set (custom
# components replacing the native selects) and one shared section pattern (Home's heading type inside the box's band).
# Drawn from the shipped parts: game-history-row.tsx, game-vs-line.tsx, game-row-parts.tsx, games-filter-controls.tsx,
# home-section-head.tsx, social/section-panel.tsx (PANEL/BAND), anchored-panel.ts, segmented-switch.tsx. Tokens: Low Sun.
import os, sys
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

FONTS = '''@font-face{font-family:"Cinzel";src:url(art/cinzel-variable.woff2) format("woff2");font-weight:400 900}
@font-face{font-family:"IBM Plex Sans";src:url(art/ibm-plex-sans-variable.woff2) format("woff2");font-weight:100 700}
@font-face{font-family:"IBM Plex Mono";src:url(art/ibm-plex-mono-500.woff2) format("woff2");font-weight:500}
body{margin:0;background:#0f0d0a}'''
TOK = ('--bg:#14110E;--surface:#1E1A15;--surface-raised:#211D18;--surface-rail:#1A1611;--surface-inset:#1B1712;--surface-sunken:#18140F;'
       '--elevated:#29241F;--border:#2B241B;--border-strong:#3A3229;--border-dashed:#494037;--fg:#EDE6D8;--fg-body:#C0B8A6;'
       '--fg-muted:#A59C89;--fg-faint:#948B78;--fg-locked:#6E6654;--accent:#CF8745;--success:#6FA368;--warning:#DEAA29;--fact:#8FA6BE;--danger:#C6533F;')

CSS = '''
:root{%s}
.wrap{display:flex;gap:80px;align-items:flex-start;padding:0}
.P,.D{%s box-sizing:border-box;background:var(--bg);font-family:"IBM Plex Sans",system-ui,sans-serif;color:var(--fg);position:relative;font-size:14px}
.P *,.D *{box-sizing:border-box}
.P{width:390px;display:flex;flex-direction:column;flex:none}
.D{width:1300px;display:grid;grid-template-columns:62px minmax(0,1fr);flex:none}
.rail{background:var(--surface-rail);border-right:1px solid var(--border)}
.rail img{display:block;width:62px;height:900px;position:sticky;top:0}
.ptop{display:block;width:390px;height:78px}
.ptab{display:block;width:390px;height:74px;margin-top:auto}
.main{min-width:0;padding:24px 32px 40px;display:flex;flex-direction:column;gap:16px}
.pm{padding:4px 16px 20px;display:flex;flex-direction:column;gap:12px}
.mono{font-family:"IBM Plex Mono",monospace}
.faint{color:var(--fg-faint)}.muted{color:var(--fg-muted)}.locked{color:var(--fg-locked)}
h1,h2,h3,p{margin:0}
.disp{font-family:"Cinzel",serif;font-weight:700;font-variant:small-caps;letter-spacing:.02em}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:38px;padding:0 14px;border-radius:9px;border:1px solid var(--border-strong);background:transparent;color:var(--fg);font:500 13px "IBM Plex Sans",sans-serif;white-space:nowrap}
.btn.cream{background:#EDE6D8;color:#14110E;border-color:#EDE6D8;font-weight:600}
.P .btn{min-height:44px;font-size:14px}
.tile{flex:1;min-width:0;display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:10px;background:var(--surface);padding:12px 14px}
.tile b{font-weight:500;font-size:13.5px;display:block}.tile>span>span{display:block;font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--fg-faint)}
.chev{color:var(--fg-faint);flex:none}
/* SegmentedSwitch */
.seg{display:inline-flex;gap:2px;padding:3px;border:1px solid var(--border-strong);border-radius:9px;flex:none}
.seg span{display:inline-flex;align-items:center;gap:6px;padding:0 12px;min-height:32px;border-radius:7px;font-size:13px;color:var(--fg-muted);font-weight:500}
.seg span.on{background:var(--elevated);color:var(--fg);font-weight:600}
.seg span i{font-style:normal;font-family:"IBM Plex Mono",monospace;font-size:10.5px;color:var(--fg-faint)}
.P .seg span{min-height:38px;padding:0 13px}
/* filter trigger (games-filter-controls TRIGGER) */
.trg{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;border-radius:8px;border:1px solid var(--border-strong);background:var(--elevated);padding:0 12px 0 10px;min-height:38px;font-size:13px;font-weight:500;color:var(--fg)}
.trg.on{border-color:var(--accent)}
.trg .lab{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.trg .x{color:var(--fg-muted);margin-left:2px}
.P .trg{min-height:44px}
.stk{display:inline-flex}.stk img{width:20px;height:20px;border-radius:5px;object-fit:cover;border:1.5px solid var(--elevated);margin-left:-7px}.stk img:first-child{margin-left:0}
.vrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.fstat{display:flex;justify-content:space-between;font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--fg-faint)}
.fstat u{color:var(--fg-locked)}
.hl{display:flex;flex-direction:column;gap:6px;padding-top:6px}
.hl h2{font-size:21px}
.P .hl h2{font-size:19px}
.facts{font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--fg-faint);line-height:1.8}
.facts b{color:var(--fg-body);font-weight:500}
/* the section pattern: SectionPanel box + band, Home's heading type in the band */
.box{border:1px solid var(--border);border-radius:14px;background:var(--surface-inset);overflow:hidden}
.band{display:flex;align-items:center;gap:12px;min-height:50px;padding:0 10px 0 16px;background:var(--surface-rail);border-bottom:1px solid var(--border)}
.hh{display:flex;align-items:center;gap:9px;font-family:"Cinzel",serif;font-weight:600;font-size:17px;line-height:1.2;color:var(--fg)}
.hh .dia{width:7px;height:7px;transform:rotate(45deg);background:var(--accent);flex:none}
.hh .ct{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:500;letter-spacing:.08em;color:var(--accent)}
.band .rec{margin-left:auto;display:flex;gap:6px;align-items:center;font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--fg-faint)}
.band .rec b{font-weight:500;color:var(--fg-body)}
.P .band{min-height:52px;padding-left:14px}
.P .hh{font-size:16px}
/* shared row bits */
.rs{flex:none;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:7px;font:600 12px "IBM Plex Mono",monospace;border:1px solid var(--border-strong);color:var(--fg-body)}
.rs.w{border-color:var(--success);color:var(--success)}
.pill{flex:none;display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:7px;font:600 12px "IBM Plex Sans",sans-serif;border:1px solid var(--border-strong);color:var(--fg-body)}
.pill.w{border-color:var(--success);color:var(--success);background:color-mix(in srgb,var(--success) 10%%,transparent)}
.chip{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 11px 4px 8px;font:500 10.5px "IBM Plex Mono",monospace;background:var(--elevated);color:var(--fg-body);white-space:nowrap}
.chip i{width:6px;height:6px;border-radius:50%%;flex:none}
.chip i.g{background:var(--success)}.chip i.y{background:var(--warning)}
.chips{display:flex;flex-wrap:wrap;gap:6px;min-width:0}
.mg{display:flex;align-items:flex-start;gap:10px;min-width:0}
.mg .ml{flex:none;width:52px;padding-top:5px;font:500 10px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.mgs{display:flex;flex-wrap:wrap;gap:8px 28px}
.note{display:flex;gap:10px;min-width:0}
.note:before{content:"";flex:none;width:2px;border-radius:2px;background:var(--border-strong)}
.note span{font-style:italic;font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
.stamp{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:5px;border:1px solid var(--border-strong);font:500 10px "IBM Plex Mono",monospace;color:var(--fg-muted);flex:none;letter-spacing:.02em}
.face{position:relative;flex:none;width:22px;height:22px;border-radius:5px;overflow:hidden;background:var(--elevated);display:flex;align-items:center;justify-content:center;font:500 8.5px "IBM Plex Mono",monospace;color:var(--fg-muted)}
.face img{position:absolute;inset:0;width:100%%;height:100%%;object-fit:cover;object-position:50%% 20%%}
.tro{color:var(--accent);display:inline-flex;flex:none}
.xbtn{flex:none;display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:7px;border:1px solid var(--border);color:var(--fg-locked);font:13px "IBM Plex Mono",monospace}
.P .xbtn{width:44px;height:44px}
.row{border-top:1px solid var(--border)}
.row:first-of-type{border-top:0}
/* ---------- A: seats ---------- */
.a-row{padding:14px 16px 16px;display:flex;flex-direction:column;gap:12px}
.a-top{display:flex;align-items:center;gap:10px}
.a-top .meta{font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.a-top .end{margin-left:auto;display:flex;align-items:center;gap:8px}
.seats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
.seat{position:relative;height:58px;border-radius:9px;overflow:hidden;background:var(--surface-sunken);border:1px solid var(--border)}
.seat img{position:absolute;inset:0;width:100%%;height:100%%;object-fit:cover;object-position:50%% 25%%;opacity:.5}
.seat:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(20,17,14,.92) 0%%,rgba(20,17,14,.55) 70%%,rgba(20,17,14,.2) 100%%)}
.seat .t{position:absolute;left:10px;right:30px;bottom:8px;z-index:1;display:flex;flex-direction:column;gap:1px}
.seat .t b{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px}
.seat .t span{font-size:11.5px;color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.seat .who{position:absolute;left:10px;top:7px;z-index:1;font:500 9.5px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.seat.me{border-color:var(--border-strong)}
.seat.me img{opacity:.75}
.seat.win{border:1.5px solid var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 16%%,transparent)}
.seat.win img{opacity:.8}
.seat .badge{position:absolute;right:7px;top:7px;z-index:1;width:22px;height:22px;border-radius:50%%;background:var(--accent);color:#14110E;display:flex;align-items:center;justify-content:center}
.seat.ini{display:flex}
.seat.ini .big{position:absolute;right:12px;top:50%%;transform:translateY(-50%%);font:500 18px "IBM Plex Mono",monospace;color:var(--fg-locked);z-index:1}
.seat.ini.win .big{right:36px}
.P .seats{grid-template-columns:repeat(2,minmax(0,1fr))}
.P .seat{height:54px}
.P .a-row{padding:14px 14px 16px}
.P .mgs{flex-direction:column;gap:8px}
/* ---------- B: ledger ---------- */
.b-cols{display:grid;grid-template-columns:44px 230px minmax(0,1fr) 150px 280px 74px 30px;column-gap:16px;align-items:start}
.b-cols.bd{grid-template-columns:44px 64px minmax(0,1fr) 150px 360px 74px 30px}
.b-hd{padding:9px 16px 8px;border-bottom:1px solid var(--border);font:500 9.5px "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-locked)}
.b-row{padding:13px 16px 14px;display:flex;flex-direction:column;gap:10px}
.b-row .cell{min-height:26px;display:flex;flex-direction:column;justify-content:center;gap:5px;min-width:0}
.b-dk{display:flex;align-items:center;gap:10px;min-width:0}
.b-dk img{width:36px;height:36px;border-radius:7px;object-fit:cover;flex:none}
.b-dk b{font-family:"IBM Plex Sans",sans-serif;font-size:13.5px;font-weight:600;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.b-dk>span>span{font:500 10.5px "IBM Plex Mono",monospace;color:var(--fg-faint);display:flex;gap:6px;align-items:center;margin-top:3px}
.opp{display:flex;align-items:center;gap:7px;font-size:12.5px;min-width:0;white-space:nowrap}
.opp .s{color:var(--fg-faint);overflow:hidden;text-overflow:ellipsis}
.b-win{display:flex;align-items:center;gap:7px;font-size:12.5px;min-height:26px}
.b-win.me{color:var(--success);font-weight:600}
.b-date{font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint);line-height:26px;text-align:right}
.b-note{padding-left:290px}
.b-note.bd{padding-left:120px}
.b-row .chips .chip{padding:3px 9px 3px 7px;font-size:10px}
.P .b-row{padding:14px}
.pb-top{display:flex;align-items:center;gap:10px}
.pb-grid{display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:6px 12px;padding:10px 0 0;border-top:1px solid var(--border)}
.pb-lab{font:500 9.5px "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-locked)}
/* ---------- C: headline rows + game sheet ---------- */
.c-row{display:flex;align-items:center;gap:14px;min-height:72px;padding:12px 12px 12px 16px}
.c-art{position:relative;width:44px;height:44px;border-radius:9px;overflow:hidden;flex:none;background:var(--elevated)}
.c-art img{width:100%%;height:100%%;object-fit:cover}
.c-art .rs{position:absolute;right:-1px;bottom:-1px;width:20px;height:20px;font-size:10px;border-radius:6px;background:var(--bg)}
.c-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.c-t h3{font-family:"Cinzel",serif;font-weight:700;font-size:15.5px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c-t h3 em{font-style:normal;color:var(--success)}
.c-t .sub{display:flex;align-items:center;gap:7px;font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint);white-space:nowrap;overflow:hidden}
.c-t .sub .n{font:400 12.5px "IBM Plex Sans",sans-serif;color:var(--fg-body)}
.c-fs{display:flex;align-items:center;flex:none}
.c-fs .fc{position:relative;width:30px;height:30px;border-radius:8px;overflow:visible;margin-left:-8px;flex:none}
.c-fs .fc:first-child{margin-left:0}
.c-fs .fc .in{position:absolute;inset:0;border-radius:8px;overflow:hidden;border:2px solid var(--surface-inset);background:var(--elevated);display:flex;align-items:center;justify-content:center;font:500 9px "IBM Plex Mono",monospace;color:var(--fg-muted)}
.c-fs .fc img{width:100%%;height:100%%;object-fit:cover}
.c-fs .fc.win .in{border-color:var(--accent)}
.c-fs .fc .tb{position:absolute;right:-5px;top:-6px;width:16px;height:16px;border-radius:50%%;background:var(--accent);color:#14110E;display:flex;align-items:center;justify-content:center;z-index:2}
.c-date{flex:none;width:52px;text-align:right;font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.c-row.sel{background:color-mix(in srgb,var(--accent) 7%%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 45%%,transparent)}
.P .c-row{gap:12px;padding:12px 10px 12px 14px;min-height:76px}
.P .c-t h3{font-size:15px}.P .c-fs .fc{width:28px;height:28px;margin-left:-11px}
/* game sheet / drawer */
.gs{display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border-strong);box-shadow:0 22px 50px rgba(0,0,0,.6)}
.gs-h{display:flex;align-items:flex-start;gap:12px;padding:16px 10px 14px 18px;border-bottom:1px solid var(--border)}
.gs-h h3{font-family:"Cinzel",serif;font-weight:700;font-size:20px;line-height:1.25}
.gs-h .m{font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint);margin-top:6px}
.gs-x{margin-left:auto;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);flex:none}
.gs-s{padding:14px 18px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid var(--border)}
.gs-s:last-child{border-bottom:0}
.gs-l{font:500 10px "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.sr{display:flex;align-items:center;gap:12px;min-height:52px;padding:6px 10px;border-radius:10px;background:var(--surface-inset);border:1px solid var(--border)}
.sr img{width:40px;height:40px;border-radius:8px;object-fit:cover;flex:none}
.sr .ini2{width:40px;height:40px;border-radius:8px;background:var(--elevated);display:flex;align-items:center;justify-content:center;font:500 12px "IBM Plex Mono",monospace;color:var(--fg-muted);flex:none}
.sr .tt{flex:1;min-width:0}.sr .tt b{display:flex;align-items:center;gap:7px;font-size:13.5px;font-weight:600}.sr .tt span{font-size:12px;color:var(--fg-muted)}
.sr .won{display:flex;align-items:center;gap:6px;font:600 12px "IBM Plex Sans",sans-serif;color:var(--accent);flex:none}
.sr.win{border-color:var(--accent)}
.gs-foot{display:flex;gap:10px;padding:14px 18px 18px}
.grab{width:36px;height:4px;border-radius:2px;background:var(--border-strong);margin:8px auto 0}
.scrim{position:absolute;inset:0;background:rgba(8,6,4,.62);z-index:20}
/* deck page bits */
.dtabs{display:flex;gap:26px;padding:0 32px;border-bottom:1px solid var(--border);margin:0 -32px}
.dtabs span{padding:18px 0 14px;font-size:14.5px;font-weight:500;color:var(--fg-muted);border-bottom:2px solid transparent;white-space:nowrap}
.dtabs span i{font-style:normal;font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--fg-faint);margin-left:5px}
.dtabs span.on{color:var(--fg);font-weight:600;border-color:var(--accent)}
.P .dtabs{gap:20px;padding:0 16px;margin:0 -16px;overflow:hidden}
.P .dtabs span{padding:13px 0 11px;font-size:14px}
.keep{padding:14px 16px 16px;display:flex;flex-direction:column;gap:12px}
.kts{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.kt{border:1px solid var(--border);border-radius:10px;background:var(--surface);padding:10px 12px;display:flex;flex-direction:column;gap:7px}
.kt .k1{display:flex;justify-content:space-between;align-items:baseline;font:500 10px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.kt .k1 b{white-space:nowrap;font-size:14px;letter-spacing:0;text-transform:none;color:var(--success)}
.kt .bar{height:4px;border-radius:2px;background:var(--success)}
.kt .bar.mx{background:linear-gradient(90deg,var(--success) 0 33%%,var(--warning) 33%%)}
.kt .k2{font:500 10px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.P .kts{grid-template-columns:repeat(2,minmax(0,1fr))}.P .kt .k1{font-size:9px;letter-spacing:.08em;flex-direction:column;align-items:flex-start;gap:4px}.P .mu .n{font-size:13px}
.mu{display:flex;align-items:center;gap:14px;padding:10px 16px;border-top:1px solid var(--border)}
.mu:first-of-type{border-top:0}
.mu img{width:52px;height:38px;border-radius:6px;object-fit:cover;flex:none}
.mu .n{flex:1;font-size:14px}
.mu .sq{display:flex;gap:4px}
.mu .tr{width:52px;display:flex;align-items:center;gap:5px;font:500 11px "IBM Plex Mono",monospace;color:var(--fg-body)}
.mu .g{width:60px;text-align:right;font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.key{padding:10px 16px 12px;border-top:1px solid var(--border);font:500 10.5px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.addbar{display:flex;align-items:center;gap:14px;padding:12px 16px;border-top:1px solid var(--border);background:var(--bg)}
.addbar .f{flex:1;height:44px;border:1px solid var(--border-strong);border-radius:9px;display:flex;align-items:center;gap:10px;padding:0 12px;color:var(--fg-faint);font-size:14px}
.tog{width:34px;height:20px;border-radius:10px;background:var(--accent);position:relative;flex:none}.tog:after{content:"";position:absolute;right:3px;top:3px;width:14px;height:14px;border-radius:50%%;background:#14110E}
/* filter panels */
.apanel{position:absolute;z-index:30;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface);box-shadow:0 22px 50px rgba(0,0,0,.6);overflow:hidden;display:flex;flex-direction:column}
.sf{display:flex;align-items:center;gap:9px;height:40px;margin:10px;border:1px solid var(--border-strong);border-radius:8px;padding:0 11px;color:var(--fg-faint);font-size:13.5px;background:var(--surface-inset)}
.og{padding:8px 14px 4px;font:500 9.5px "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-locked)}
.opt{display:flex;align-items:center;gap:11px;min-height:44px;padding:0 12px 0 14px;font-size:13.5px}
.opt img{width:28px;height:28px;border-radius:6px;object-fit:cover;flex:none}
.opt .ic{width:28px;height:28px;border-radius:6px;flex:none;display:flex;align-items:center;justify-content:center;background:var(--elevated);color:var(--fg-muted)}
.opt .nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.opt .ct{font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint);min-width:22px;text-align:right}
.opt .ck{width:16px;color:var(--accent);flex:none;display:flex}
.opt.on{background:var(--elevated)}
.opt.on .nm{font-weight:600}
.pfoot{padding:10px 14px 12px;border-top:1px solid var(--border);font:500 10.5px "IBM Plex Mono",monospace;color:var(--fg-faint);line-height:1.6}
.sheet{position:absolute;left:0;right:0;bottom:0;z-index:30;background:var(--surface);border-radius:16px 16px 0 0;border-top:1px solid var(--border-strong);display:flex;flex-direction:column}
.sh-h{display:flex;align-items:center;padding:6px 4px 6px 18px}
.sh-h h3{flex:1;font-family:"Cinzel",serif;font-weight:700;font-size:18px}
.P .opt{min-height:56px;padding:0 16px}
.P .opt img,.P .opt .ic{width:36px;height:36px;border-radius:8px}
.cap{font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint);padding:0 0 10px;letter-spacing:.04em}
.callout{position:absolute;z-index:40;background:#2b2116;border:1px solid var(--accent);border-radius:8px;padding:8px 10px;font:500 11px/1.45 "IBM Plex Mono",monospace;color:var(--fg);max-width:260px}
''' % (TOK, TOK)

# ---------- icons ----------
def chev(s=14): return f'<svg class="chev" width="{s}" height="{s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>'
def caret(s=12): return f'<svg width="{s}" height="{s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>'
def check(s=16): return f'<svg width="{s}" height="{s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>'
def srch(s=16): return f'<svg width="{s}" height="{s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/></svg>'
def xic(s=16): return f'<svg width="{s}" height="{s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>'
def trophy(s=13): return f'<svg width="{s}" height="{s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 2.5h7v4a3.5 3.5 0 0 1-7 0v-4Z"/><path d="M4.5 4H2.5a1.5 1.5 0 0 0 2 2.3M11.5 4h2a1.5 1.5 0 0 1-2 2.3M8 10v2.5M5.5 13.5h5"/></svg>'
def decksic(s=16): return f'<svg width="{s}" height="{s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="4.5" y="2.5" width="9" height="11" rx="1.5"/><path d="M2.5 5v8.5a1 1 0 0 0 1 1h7"/></svg>'

# ---------- fixtures ----------
DECKS = {'gisa': 'HD - Gisa', 'omnath': 'HD - Omnath', 'sai': 'HD - Sai', 'sokka': 'HD Tune - Sokka', 'aang': 'HD - Avatar Aang', 'wizards': 'HD Tune - Wizards'}
def S(name, cmd=None, art=None, won=False): return dict(name=name, cmd=cmd, art=art, won=won)
GAMES = [
 dict(id=1, m='nov', deck='gisa', v='v2', r='L', pod=3, date='Nov 19', seats=[S('Colin','Ghalta','ghalta'), S('Max','Ishai','ishai',True)],
      up=[], down=['Mana','Answers','Board presence'], note='Got stomped.'),
 dict(id=2, m='nov', deck='omnath', v='v2', r='L', pod=4, date='Nov 19', seats=[S('Colin','Bruse','bruse'), S('Peter','Giada','giada',True), S('Max','Kilo','kilo')],
      up=['Comebacks','The deck’s plan'], down=['Cards in hand','Answers','Board presence'], note='Lost to menace and unblockable creatures. Would have won with more aggression or a larger board presence.'),
 dict(id=3, m='nov', deck='sai', v='v4', r='L', pod=3, date='Nov 1', seats=[S('Colin','Ishai','ishai',True), S('Peter','Giada','giada')],
      up=['Cards in hand','Comebacks'], down=['Mana','Board presence'], note='Missed several land drops. Was able to play some cards and stay relevant, but was never threatening enough due to lack of mana.'),
 dict(id=4, m='nov', deck='sokka', v='v0', r='L', pod=3, date='Nov 1', seats=[S('Colin','Kilo','kilo'), S('Chris',None,None,True)],
      up=['Speed','Mana','Answers','Board presence'], down=[], note='Would have closed the game, but lost to an infinite combo.'),
 dict(id=5, m='oct', deck='sai', v='v4', r='W', pod=2, date='Oct 30', seats=[S('Colin','Bruse','bruse')],
      up=['Speed','Mana','Answers','Board presence','Closing the game'], down=[], note='Sai was able to press and immediately be a problem. Protection with Lightning Greaves was crucial.'),
 dict(id=6, m='oct', deck='sai', v='v4', r='L', pod=2, date='Oct 30', seats=[S('Colin','Ghalta','ghalta',True)],
      up=['The deck’s plan'], down=['Mana'], note='Ghalta on turn four was too much.'),
 dict(id=7, m='oct', deck='sokka', v='v1', r='W', pod=5, date='Oct 4', seats=[],
      up=['Comebacks','The deck’s plan','Closing the game'], down=[], note='Slow ramp, but the cards came together towards the end for a win.'),
]
V2 = False
MONTHS = [('nov', 'November 2026'), ('oct', 'October 2026')]
ORDER = ['Speed','Cards in hand','Mana','Answers','Board presence','Comebacks','The deck’s plan','Closing the game']

def ini(n): return n[:2].upper()
def face(seat, size=22):
    inner = f'<img src="art/{seat["art"]}.webp" alt="">' if seat['art'] else ini(seat['name'])
    return f'<span class="face" style="width:{size}px;height:{size}px">{inner}</span>'
def chips_all(g):
    out = []
    for k in ORDER:
        if k in g['up']: out.append(f'<span class="chip"><i class="g"></i>{k}</span>')
        elif k in g['down']: out.append(f'<span class="chip"><i class="y"></i>{k}</span>')
    return '<span class="chips">' + (''.join(out) or '<span class="mono locked" style="font-size:10.5px">—</span>') + '</span>'
def markgroups(g):
    def grp(lab, keys, cls):
        if not keys: return ''
        cs = ''.join(f'<span class="chip"><i class="{cls}"></i>{k}</span>' for k in keys)
        return f'<div class="mg"><span class="ml">{lab}</span><span class="chips">{cs}</span></div>'
    return '<div class="mgs">' + grp('Helped', g['up'], 'g') + grp('Hurt', g['down'], 'y') + '</div>'
def note(g, extra=''): return f'<div class="note" style="{extra}"><span>“{g["note"]}”</span></div>' if g.get('note') else ''
def rec(gs):
    w = sum(1 for g in gs if g['r'] == 'W'); l = sum(1 for g in gs if g['r'] == 'L')
    return f'{w}–{l}'
def pods(n): return f'{n} players'
def winner(g):
    if g['r'] == 'W': return 'me'
    for s in g['seats']:
        if s['won']: return s
    return None

# ---------- section box ----------
def band(title, count, aside=''):
    return f'<div class="band"><h2 class="hh"><span class="dia"></span><span>{title}</span><span class="ct">· {count}</span></h2>{aside}</div>'
def month_box(gs, title, rowfn, head='', extra_cls=''):
    n = len(gs)
    aside = rec2(gs) if V2 else f'<span class="rec">record <b>{rec(gs)}</b></span>'
    return f'<section class="box {extra_cls}">{band(title, f"{n} game" + ("" if n == 1 else "s"), aside)}{head}' + ''.join(rowfn(g) for g in gs) + '</section>'

# ---------- concept A: seats ----------
def a_seat_me(g, phone=False):
    return (f'<div class="seat me{" win" if g["r"]=="W" else ""}"><img src="art/{g["deck"]}.webp" alt=""><span class="who">Your deck</span>'
            f'<span class="t"><b>{DECKS[g["deck"]]}<span class="stamp">{g["v"]}</span></b></span>'
            + (f'<span class="badge">{trophy(12)}</span>' if g['r'] == 'W' else '') + '</div>')
def a_seat(s):
    w = ' win' if s['won'] else ''
    if not s['art']:
        return (f'<div class="seat ini{w}"><span class="big">{ini(s["name"])}</span><span class="t"><b>{s["name"]}</b><span>No commander logged</span></span>'
                + (f'<span class="badge">{trophy(12)}</span>' if s['won'] else '') + '</div>')
    return (f'<div class="seat{w}"><img src="art/{s["art"]}.webp" alt=""><span class="t"><b>{s["name"]}</b><span>{s["cmd"]}</span></span>'
            + (f'<span class="badge">{trophy(12)}</span>' if s['won'] else '') + '</div>')
def a_row(g, deck_tab=False, phone=False):
    pill = f'<span class="pill w">Won</span>' if g['r'] == 'W' else '<span class="pill">Lost</span>'
    end = (f'<span class="xbtn">×</span>' if deck_tab else chev(16))
    seats = ''.join([a_seat_me(g)] + [a_seat(s) for s in g['seats']])
    if not g['seats']:
        seats += '<div class="seat" style="border-style:dashed;background:transparent"><span class="t"><span>Nobody logged across the table</span></span></div>'
    return (f'<article class="row a-row"><div class="a-top">{pill}<span class="meta">{pods(g["pod"])} · {g["date"]}</span><span class="end">{end}</span></div>'
            f'<div class="seats">{seats}</div>{markgroups(g)}{note(g)}</article>')

# ---------- concept B: ledger ----------
B_HEAD = '<div class="b-hd b-cols"><span>Result</span><span>Deck</span><span>At the table</span><span>Won by</span><span>Marks</span><span style="text-align:right">Played</span><span></span></div>'
B_HEAD_DECK = '<div class="b-hd b-cols bd"><span>Result</span><span>Version</span><span>At the table</span><span>Won by</span><span>Marks</span><span style="text-align:right">Played</span><span></span></div>'
def opp_line(s):
    sub = f'<span class="s">· {s["cmd"]}</span>' if s['cmd'] else ''
    return f'<span class="opp">{face(s)}<span>{s["name"]}</span>{sub}</span>'
def won_cell(g):
    w = winner(g)
    if w == 'me': return f'<span class="b-win me"><span class="tro" style="color:var(--success)">{trophy(14)}</span>You</span>'
    if w is None: return '<span class="b-win locked mono" style="font-size:11px">Not logged</span>'
    return f'<span class="b-win"><span class="tro">{trophy(14)}</span>{face(w)}<span>{w["name"]}</span></span>'
def b_row(g, deck_tab=False):
    rs = f'<span class="rs{" w" if g["r"]=="W" else ""}">{g["r"]}</span>'
    if deck_tab:
        dk = f'<span class="stamp" style="height:24px;font-size:11px;padding:0 8px;align-self:flex-start">{g["v"]}</span>'
    else:
        dk = (f'<span class="b-dk"><img src="art/{g["deck"]}.webp" alt=""><span style="min-width:0"><b>{DECKS[g["deck"]]}</b>'
              f'<span><span class="stamp">{g["v"]}</span>{pods(g["pod"])}</span></span></span>')
    table = ''.join(opp_line(s) for s in g['seats']) or '<span class="mono locked" style="font-size:11px;line-height:26px">Nobody logged</span>'
    if deck_tab: table = f'<span class="mono faint" style="font-size:10.5px">{pods(g["pod"])}</span>' + table
    end = '<span class="xbtn">×</span>' if deck_tab else f'<span style="line-height:26px;display:flex;align-items:center;height:26px">{chev(16)}</span>'
    return (f'<article class="row b-row"><div class="b-cols{" bd" if deck_tab else ""}"><span class="cell">{rs}</span><span class="cell">{dk}</span>'
            f'<span class="cell">{table}</span><span class="cell">{won_cell(g)}</span><span class="cell">{chips_all(g)}</span>'
            f'<span class="b-date">{g["date"]}</span><span class="cell">{end}</span></div>'
            f'<div class="b-note{" bd" if deck_tab else ""}">{note(g)}</div></article>')
def b_row_phone(g, deck_tab=False):
    rs = f'<span class="rs{" w" if g["r"]=="W" else ""}">{g["r"]}</span>'
    if deck_tab:
        mid = f'<span style="flex:1;display:flex;align-items:center;gap:8px"><span class="stamp" style="height:22px">{g["v"]}</span><span class="mono faint" style="font-size:11px">{pods(g["pod"])}</span></span>'
    else:
        mid = (f'<span class="b-dk" style="flex:1"><img src="art/{g["deck"]}.webp" alt="" style="width:32px;height:32px"><span style="min-width:0"><b>{DECKS[g["deck"]]}</b>'
               f'<span><span class="stamp">{g["v"]}</span>{pods(g["pod"])}</span></span></span>')
    end = '<span class="xbtn">×</span>' if deck_tab else chev(16)
    table = ''.join(opp_line(s) for s in g['seats']) or '<span class="mono locked" style="font-size:11px">Nobody logged</span>'
    return (f'<article class="row b-row"><div class="pb-top">{rs}{mid}<span class="mono faint" style="font-size:11px">{g["date"]}</span>{end}</div>'
            f'<div class="pb-grid"><span class="pb-lab">At the table</span><span class="pb-lab">Won by</span>'
            f'<span style="display:flex;flex-direction:column;gap:6px;min-width:0">{table}</span><span>{won_cell(g)}</span></div>'
            f'<div style="display:flex;flex-direction:column;gap:6px"><span class="pb-lab">Marks</span>{chips_all(g)}</div>{note(g)}</article>')

# ---------- concept C: headline rows ----------
def c_title(g):
    w = winner(g)
    if w == 'me': return '<em>Won</em>' + (f' against {", ".join(s["name"] for s in g["seats"])}' if g['seats'] else '')
    if w is None: return 'Lost'
    return f'Lost to {w["name"]}'
def c_faces(g):
    out = []
    for s in g['seats']:
        inner = f'<img src="art/{s["art"]}.webp" alt="">' if s['art'] else ini(s['name'])
        out.append(f'<span class="fc{" win" if s["won"] else ""}"><span class="in">{inner}</span>' + (f'<span class="tb">{trophy(10)}</span>' if s['won'] else '') + '</span>')
    return '<span class="c-fs">' + ''.join(out) + '</span>'
def c_row(g, deck_tab=False, sel=False, phone=False):
    art = f'<span class="c-art"><img src="art/{g["deck"]}.webp" alt=""><span class="rs{" w" if g["r"]=="W" else ""}">{g["r"]}</span></span>'
    if deck_tab:
        sub = f'<span class="stamp">{g["v"]}</span><span>{pods(g["pod"])}</span>' + ('' if not phone else f'<span>· {g["date"]}</span>')
    else:
        sub = f'<span class="n">{DECKS[g["deck"]]}</span><span class="stamp">{g["v"]}</span>' + (f'<span>{pods(g["pod"])}</span>' if not phone else f'<span>{g["date"]}</span>')
    marks = '' if phone else f'<span class="mono faint" style="font-size:10.5px;flex:none;width:118px;display:flex;gap:10px"><span><i style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--success);margin-right:5px"></i>{len(g["up"])} helped</span><span><i style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--warning);margin-right:5px"></i>{len(g["down"])}</span></span>'
    date = '' if phone else f'<span class="c-date">{g["date"]}</span>'
    return (f'<article class="row c-row{" sel" if sel else ""}">{art}<span class="c-t"><h3>{c_title(g)}</h3><span class="sub">{sub}</span></span>'
            f'{c_faces(g)}{marks}{date}{chev(16)}</article>')
def c_sheet_body(g, deck_tab=False, phone=False):
    w = winner(g)
    head_t = 'Won' if w == 'me' else ('Lost' if w is None else f'Lost to {w["name"]}')
    me = (f'<div class="sr{" win" if w=="me" else ""}"><img src="art/{g["deck"]}.webp" alt=""><span class="tt"><b>{DECKS[g["deck"]]}<span class="stamp">{g["v"]}</span></b><span>You</span></span>'
          + (f'<span class="won">{trophy(14)}Won</span>' if w == 'me' else '') + '</div>')
    seats = ''
    for s in g['seats']:
        pic = f'<img src="art/{s["art"]}.webp" alt="">' if s['art'] else f'<span class="ini2">{ini(s["name"])}</span>'
        seats += (f'<div class="sr{" win" if s["won"] else ""}">{pic}<span class="tt"><b>{s["name"]}</b><span>{s["cmd"] or "No commander logged"}</span></span>'
                  + (f'<span class="won">{trophy(14)}Won</span>' if s['won'] else '') + '</div>')
    foot = ('<span class="btn" style="flex:1;color:var(--danger);border-color:var(--border-strong)">Delete game</span>' if deck_tab else
            f'<span class="btn" style="flex:1">Open on {DECKS[g["deck"]]} ›</span>')
    return (f'<div class="gs-h"><div><h3>{head_t}</h3><div class="m">{pods(g["pod"])} · {g["date"]}, 2026</div></div><span class="gs-x">{xic(18)}</span></div>'
            f'<div class="gs-s"><span class="gs-l">The table</span>{me}{seats}</div>'
            f'<div class="gs-s"><span class="gs-l">Marks</span>{markgroups(g)}</div>'
            f'<div class="gs-s"><span class="gs-l">Note</span>{note(g)}</div>'
            f'<div class="gs-foot">{foot}</div>')

# ---------- page chrome ----------
def deck_filters_desktop(active=None):
    d_on = active == 'deck'
    return (f'<div class="vrow"><span class="seg"><span>Decks</span><span class="on">Games</span><span>Stats</span></span>'
            f'<span class="trg{" on" if d_on else ""}"><span class="stk"><img src="art/sai.webp" alt=""><img src="art/gisa.webp" alt=""><img src="art/omnath.webp" alt=""></span>All decks <span class="ct mono faint" style="font-size:11px">7</span>{caret()}</span>'
            f'<span class="seg"><span class="on">Any result</span><span>Won</span><span>Lost</span><span>Drawn</span></span>'
            f'<span class="trg{" on" if active=="against" else ""}">Played against{caret()}</span></div>')
def decks_head_desktop():
    return ('<div style="display:flex;align-items:center;justify-content:space-between"><h1 class="disp" style="font-size:22px">Decks</h1>'
            '<span style="display:flex;gap:10px"><span class="btn">Import</span><span class="btn cream">New deck</span></span></div>'
            f'<div style="display:flex;gap:12px"><div class="tile"><span style="flex:1"><b>Shopping for all decks</b><span>199 to buy · $434.58 · 8 decks</span></span>{chev()}</div>'
            f'<div class="tile"><span style="flex:1"><b>Commander precons</b><span>186 decklists · newest Nov 13, 2026</span></span>{chev()}</div></div>')
def games_headline(phone=False):
    return ('<div class="hl"><h2 class="disp">7 games logged. 2–5.</h2>'
            '<div class="facts">4 decks · pods of 2–5 · Oct to Nov 2026<br>most played <b>HD - Sai</b>, 3 of 7</div></div>')
def decks_desktop(rows, head='', extra='', note_html=''):
    body = ''
    for key, title in MONTHS:
        gs = [g for g in GAMES if g['m'] == key]
        body += month_box(gs, title, rows, head)
    return (f'<div class="D"><div class="rail"><img src="art/rail-decks.png" alt=""></div><div class="main">{decks_head_desktop()}'
            f'{deck_filters_desktop()}<div class="fstat"><span>No filters on</span><u>Clear all filters</u></div>{games_headline()}{body}</div>{extra}</div>')

SAI = [g for g in GAMES if g['deck'] == 'sai']
def deck_top(phone=False):
    tabs = '<div class="dtabs"><span>Your deck<i>99</i></span><span>Analysis</span><span>Tuning</span><span class="on">Games<i>3</i></span><span>Versions<i>4</i></span></div>'
    hl = ('<div class="hl" style="padding-top:10px"><h2 class="disp">Mana is holding this deck back.</h2>'
          '<p style="font-size:13.5px;color:var(--fg-body);line-height:1.55">Marked against you in <b style="color:var(--fg)">2 of 3</b> games. Record <span style="color:var(--accent)">1–2</span> across 3 games.</p></div>')
    log = '<div><span class="btn" style="' + ('width:100%' if phone else '') + '">Log a game</span></div>'
    def kt(name, v, up, down, mx=False):
        return f'<div class="kt"><span class="k1">{name}<b style="{"color:var(--warning)" if mx else ""}">{v}</b></span><span class="bar{" mx" if mx else ""}"></span><span class="k2">{up} up · {down} down</span></div>'
    keep = (f'<section class="box">{band("Keep", "more for you than against" if phone else "marked for you more often than against")}<div class="keep"><div class="kts">'
            + kt('Speed', '1 of 3', 1, 0) + kt('Answers', '1 of 3', 1, 0) + kt('Cards in hand', '1 of 3', 1, 0) + kt('Comebacks', '1 of 3', 1, 0) + kt('Closing the game', '1 of 3', 1, 0)
            + '</div><div class="mono faint" style="font-size:11px;border-top:1px solid var(--border);padding-top:10px">WATCH <span style="color:var(--fg-body)">Mana: 1 up, 2 down.</span> MIXED <span style="color:var(--fg-body)">Board presence: 1 up, 1 down.</span></div></div></section>')
    sug = '<p style="font-size:13.5px;color:var(--fg-body)">Suggested changes reads these games. <b style="color:var(--accent)">It is on the Tuning tab →</b></p>'
    def mu(art, name, r, tr=''):
        sq = ''.join(f'<span class="rs{" w" if x=="W" else ""}" style="width:22px;height:22px;font-size:10.5px">{x}</span>' for x in r)
        return f'<div class="mu"><img src="art/{art}.webp" alt=""><span class="n">{name}</span><span class="sq">{sq}</span><span class="tr">{(trophy(13) + " " + tr) if tr else ""}</span><span class="g">{len(r)} game{"s" if len(r)>1 else ""}</span></div>'
    seg = '<span class="seg" style="margin-left:auto"><span class="on">Commander</span><span>Colors</span><span>Friend</span></span>'
    mus = (f'<section class="box">{band("Matchups", "recorded in 3 of 3 games", seg if not phone else "")}'
           + ('<div style="padding:10px 12px 0"><span class="seg" style="display:flex"><span class="on" style="flex:1;justify-content:center">Commander</span><span style="flex:1;justify-content:center">Colors</span><span style="flex:1;justify-content:center">Friend</span></span></div>' if phone else '')
           + mu('ishai', 'Ishai, Ojutai Dragonspeaker', 'L', '1') + mu('giada', 'Giada, Font of Hope', 'L') + mu('bruse', 'Bruse Tarl, Boorish Herder', 'W') + mu('ghalta', 'Ghalta, Primal Hunger', 'L', '1')
           + '<div class="key">Squares are games: W won, L lost, D drawn. ' + trophy(11) + ' how many of your losses they won.</div></section>')
    if V2: mus = matchups2(phone)
    return tabs + hl + log + keep + sug + mus
def deck_desktop(rows, head='', extra=''):
    body = ''
    for key, title in MONTHS:
        gs = [g for g in SAI if g['m'] == key]
        body += month_box(gs, title, rows, head)
    return (f'<div class="D"><div class="rail"><img src="art/rail-decks.png" alt=""></div><div class="main" style="padding-top:0">{deck_top()}{body}</div>'
            f'{extra}</div>')

def phone_decks(rows, head='', sel=None, overlay=''):
    body = ''
    for key, title in MONTHS:
        gs = [g for g in GAMES if g['m'] == key]
        body += month_box(gs, title, rows, head)
    top = ('<h1 class="disp" style="font-size:22px;padding-top:6px">Decks</h1><div style="display:flex;gap:10px"><span class="btn cream" style="flex:1">New deck</span><span class="btn" style="flex:1">Import a deck</span></div>'
           f'<div style="display:flex;gap:8px"><div class="tile" style="padding:10px 12px"><span style="flex:1;min-width:0"><b>Shop all decks</b><span>199 · $434.58</span></span>{chev()}</div>'
           f'<div class="tile" style="padding:10px 12px"><span style="flex:1;min-width:0"><b>Precons</b><span>186 decklists</span></span>{chev()}</div></div>'
           f'<div style="display:flex;align-items:center;gap:8px"><span class="seg"><span>Decks</span><span class="on">Games</span><span>Stats</span></span>'
           f'<span class="trg" style="margin-left:auto;padding:0 10px"><span class="stk"><img src="art/sai.webp" alt=""><img src="art/gisa.webp" alt=""></span>All decks{caret()}</span></div>'
           '<div style="display:flex;gap:8px"><span class="btn" style="flex:1">Filter games</span></div>'
           '<div class="fstat"><span>No filters on</span><u>Clear all filters</u></div>')
    return (f'<div class="P"><img class="ptop" src="art/p-top.png" alt=""><div class="pm">{top}{games_headline(True)}{body}</div>'
            f'<img class="ptab" src="art/p-tabbar-decks.png" alt="">{overlay}</div>')
def phone_deck(rows, head='', overlay=''):
    body = ''
    for key, title in MONTHS:
        gs = [g for g in SAI if g['m'] == key]
        body += month_box(gs, title, rows, head)
    return (f'<div class="P"><img class="ptop" src="art/p-top.png" alt=""><div class="pm" style="padding-top:0">{deck_top(True)}{body}</div>'
            f'<div class="addbar"><span class="f">{srch()} Add a card by name · Bant</span><span class="tog"></span><span style="font-size:12.5px;color:var(--fg-body)">Owned only</span></div>'
            f'<img class="ptab" src="art/p-tabbar-decks.png" alt="" style="margin-top:0">{overlay}</div>')

# ---------- board writer ----------
def board(name, title, inner, w, h=1000):
    html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
{FONTS}
{CSS}
</style>
</helmet>
{inner}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''
    open(os.path.join(OUT, name), 'w').write(html)

def cap(t, w): return f'<div style="width:{w}px"><div class="cap">{t}</div>'
def pair(*frames):
    return '<div class="wrap" style="padding:0">' + ''.join(f'<div>{c}</div>' for c in frames) + '</div>'
def labelled(t, frame): return f'<div style="display:flex;flex-direction:column"><div class="cap" style="font:500 13px IBM Plex Mono,monospace;color:#A59C89;padding-bottom:12px">{t}</div>{frame}</div>'

# A
board('A-Desktop.dc.html', 'A Seats, desktop', pair(labelled('DECKS › GAMES', decks_desktop(lambda g: a_row(g))), labelled('DECK DETAILS › GAMES · HD - Sai', deck_desktop(lambda g: a_row(g, True)))), 2680)
board('A-Phone.dc.html', 'A Seats, phone', pair(labelled('DECKS › GAMES', phone_decks(lambda g: a_row(g, phone=True))), labelled('DECK DETAILS › GAMES', phone_deck(lambda g: a_row(g, True, True)))), 860)
# B
board('B-Desktop.dc.html', 'B Ledger, desktop', pair(labelled('DECKS › GAMES', decks_desktop(lambda g: b_row(g), B_HEAD)), labelled('DECK DETAILS › GAMES · HD - Sai', deck_desktop(lambda g: b_row(g, True), B_HEAD_DECK))), 2680)
board('B-Phone.dc.html', 'B Ledger, phone', pair(labelled('DECKS › GAMES', phone_decks(lambda g: b_row_phone(g))), labelled('DECK DETAILS › GAMES', phone_deck(lambda g: b_row_phone(g, True)))), 860)
# C
g2 = GAMES[1]; g3 = GAMES[2]
drawer = f'<div class="gs" style="position:absolute;right:0;top:0;bottom:0;width:440px;z-index:30;border-radius:0;border-width:0 0 0 1px">{c_sheet_body(g2)}</div><div class="scrim" style="right:440px"></div>'
board('C-Desktop.dc.html', 'C Headline rows, desktop', pair(
    labelled('DECKS › GAMES', decks_desktop(lambda g: c_row(g))),
    labelled('DECKS › GAMES · a game selected (drawer)', decks_desktop(lambda g: c_row(g, sel=(g['id'] == 2)), extra=drawer)),
    labelled('DECK DETAILS › GAMES · HD - Sai', deck_desktop(lambda g: c_row(g, True)))), 4060)
sheet = f'<div class="scrim"></div><div class="sheet gs P" style="border-radius:16px 16px 0 0;max-height:780px"><div class="grab"></div>{c_sheet_body(g3, deck_tab=True, phone=True)}</div>'
board('C-Phone.dc.html', 'C Headline rows, phone', pair(
    labelled('DECKS › GAMES', phone_decks(lambda g: c_row(g, phone=True))),
    labelled('DECK DETAILS › GAMES', phone_deck(lambda g: c_row(g, True, phone=True))),
    labelled('A GAME SELECTED (sheet)', '<div style="position:relative;width:390px;height:844px;overflow:hidden">' + phone_deck(lambda g: c_row(g, True, phone=True)) + sheet + '</div>')), 1330)

# ---------- filters ----------
DOPTS = [('all', 'All decks', 7), ('sai', 'HD - Sai', 3), ('sokka', 'HD Tune - Sokka', 2), ('gisa', 'HD - Gisa', 1), ('omnath', 'HD - Omnath', 1)]
def deck_opts(phone=False, on='all'):
    out = ''
    for k, n, c in DOPTS:
        pic = f'<span class="ic">{decksic(18 if phone else 15)}</span>' if k == 'all' else f'<img src="art/{k}.webp" alt="">'
        out += f'<div class="opt{" on" if k==on else ""}">{pic}<span class="nm">{n}</span><span class="ct">{c}</span><span class="ck">{check() if k==on else ""}</span></div>'
    return out
deck_panel = (f'<div class="apanel" style="left:{32+62+0}px;top:0;width:320px"><div class="sf">{srch(15)} Find a deck</div><div class="og">With games logged</div>{deck_opts()}'
              '<div class="pfoot">17 decks have no games yet, so they would show nothing. Log a game from a deck to add it here.</div></div>')
ag_opts = ('<div class="og">Friends</div>'
           '<div class="opt"><img src="art/ghalta.webp" alt=""><span class="nm">Colin</span><span class="ct">6</span><span class="ck"></span></div>'
           '<div class="opt on"><img src="art/giada.webp" alt=""><span class="nm">Peter</span><span class="ct">2</span><span class="ck">' + check() + '</span></div>'
           '<div class="opt"><img src="art/ishai.webp" alt=""><span class="nm">Max</span><span class="ct">2</span><span class="ck"></span></div>'
           '<div class="opt"><span class="ic mono" style="font-size:11px">CH</span><span class="nm">Chris</span><span class="ct">1</span><span class="ck"></span></div>'
           '<div class="og">Commanders</div>'
           '<div class="opt"><img src="art/ghalta.webp" alt=""><span class="nm">Ghalta, Primal Hunger</span><span class="ct">2</span><span class="ck"></span></div>'
           '<div class="opt"><img src="art/ishai.webp" alt=""><span class="nm">Ishai, Ojutai Dragonspeaker</span><span class="ct">2</span><span class="ck"></span></div>'
           '<div class="opt"><img src="art/bruse.webp" alt=""><span class="nm">Bruse Tarl, Boorish Herder</span><span class="ct">2</span><span class="ck"></span></div>')
def fdesk(panel_html, active, row_override=None):
    vrow = row_override or deck_filters_desktop(active)
    return (f'<div class="D" style="height:640px;overflow:hidden"><div class="rail"><img src="art/rail-decks.png" alt=""></div><div class="main">{decks_head_desktop()}'
            f'<div style="position:relative">{vrow}<div style="position:absolute;left:0;right:0;top:46px">{panel_html}</div></div>'
            f'<div class="fstat"><span>No filters on</span><u>Clear all filters</u></div>{games_headline()}</div></div>')
deck_panel2 = deck_panel.replace(f'left:{32+62+0}px', 'left:224px')
ag_row = ('<div class="vrow"><span class="seg"><span>Decks</span><span class="on">Games</span><span>Stats</span></span>'
          f'<span class="trg"><span class="stk"><img src="art/sai.webp" alt=""><img src="art/gisa.webp" alt=""><img src="art/omnath.webp" alt=""></span>All decks <span class="mono faint" style="font-size:11px">7</span>{caret()}</span>'
          '<span class="seg"><span class="on">Any result</span><span>Won</span><span>Lost</span><span>Drawn</span></span>'
          f'<span class="trg on"><img src="art/giada.webp" alt="" style="width:20px;height:20px;border-radius:5px;object-fit:cover">Peter<span class="x">{xic(13)}</span></span></div>')
ag_panel = f'<div class="apanel" style="left:574px;top:0;width:300px"><div class="sf">{srch(15)} Friend or commander</div>{ag_opts}</div>'
on_row = ('<div class="vrow"><span class="seg"><span>Decks</span><span class="on">Games</span><span>Stats</span></span>'
          f'<span class="trg on"><img src="art/sai.webp" alt="" style="width:20px;height:20px;border-radius:5px;object-fit:cover">HD - Sai<span class="x">{xic(13)}</span></span>'
          '<span class="seg"><span>Any result</span><span>Won</span><span class="on">Lost</span><span>Drawn</span></span>'
          f'<span class="trg on"><img src="art/ghalta.webp" alt="" style="width:20px;height:20px;border-radius:5px;object-fit:cover">Colin<span class="x">{xic(13)}</span></span></div>')
on_desk = (f'<div class="D" style="height:460px;overflow:hidden"><div class="rail"><img src="art/rail-decks.png" alt=""></div><div class="main">{decks_head_desktop()}{on_row}'
           '<div class="fstat"><span>3 filters on</span><u style="color:var(--fg-muted)">Clear all filters</u></div>'
           '<div class="hl"><h2 class="disp">HD - Sai lost 2 of 3 with Colin at the table.</h2><div class="facts">Colin won 2 of the 2 you lost</div></div></div></div>')
# phone sheets
def phone_with(sheet_inner, h=844):
    return ('<div style="position:relative;width:390px;height:844px;overflow:hidden">' + phone_decks(lambda g: a_row(g, phone=True))
            + f'<div class="scrim"></div><div class="sheet P">{sheet_inner}</div></div>')
ps_deck = f'<div class="grab"></div><div class="sh-h"><h3>Deck</h3><span class="gs-x">{xic(18)}</span></div>{deck_opts(True)}<div class="pfoot" style="padding-bottom:28px">17 decks have no games yet, so they would show nothing. Log a game from a deck to add it here.</div>'
ps_filter = (f'<div class="grab"></div><div class="sh-h"><h3>Filter games</h3><span class="gs-x">{xic(18)}</span></div>'
             '<div style="padding:4px 16px 12px;display:flex;flex-direction:column;gap:8px"><span class="gs-l">Result</span>'
             '<span class="seg" style="display:flex"><span class="on" style="flex:1;justify-content:center">Any</span><span style="flex:1;justify-content:center">Won</span><span style="flex:1;justify-content:center">Lost</span><span style="flex:1;justify-content:center">Drawn</span></span></div>'
             f'<div style="padding:4px 16px 0"><span class="gs-l">Played against</span></div><div class="sf" style="margin:8px 16px;height:44px">{srch(15)} Friend or commander</div>'
             + ag_opts.replace('class="og"', 'class="og" style="padding-left:16px"') +
             '<div style="display:flex;gap:10px;padding:12px 16px 24px;border-top:1px solid var(--border)"><span class="btn" style="flex:1">Clear</span><span class="btn cream" style="flex:1">Show 2 games</span></div>')
board('Filters.dc.html', 'Filters, custom components',
      '<div style="display:flex;flex-direction:column;gap:60px">' +
      pair(labelled('F1 · DESKTOP · DECK PICKER OPEN', fdesk(deck_panel2, 'deck')), labelled('F2 · DESKTOP · PLAYED AGAINST OPEN (Peter picked)', fdesk(ag_panel, 'against', ag_row))) +
      pair(labelled('F3 · DESKTOP · FILTERS ON', on_desk), labelled('F4 · PHONE · DECK SHEET', phone_with(ps_deck)), labelled('F5 · PHONE · FILTER GAMES SHEET', phone_with(ps_filter))) +
      '</div>', 2680)
print('ok')

# ---------- Main ----------
def li(items): return '<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">' + ''.join(f'<li>{i}</li>' for i in items) + '</ul>'
FB = [
 ('Trophy awkwardly placed', 'Pinned to the winner’s seat tile, top-right corner, every time. Your own tile gets it when you win.', 'Its own “Won by” column: always the same spot, face + name.', 'The winner is the row’s headline (“Lost to Peter”) and their face carries the badge.'),
 ('“vs” offset', 'No vs line: the whole table is one grid of seats, you first.', 'No vs line: “At the table” column, one seat per line.', 'No vs line: faces stacked at the row’s end; full table in the game sheet.'),
 ('Version floating', 'Stamped on your deck’s seat tile, beside the deck name.', 'Stamped under the deck name, with the pod size.', 'Stamped beside the deck name in the subline and on your seat in the sheet.'),
 ('No consistent grouping', 'Three bands per game: result + pod/date, the table, marks split into Helped / Hurt, then the note.', 'Strict columns with a header row in every month box.', 'One-line rows; details grouped in the sheet: The table, Marks, Note.'),
 ('Month headings lost', 'All three: each month is a box with Home’s heading type in its band (◆, display face, count) and the month’s record at the end.', '', ''),
]
rows = ''.join(f'<tr><td style="color:var(--fg);font-weight:600">{a}</td>' + (f'<td colspan="3">{b}</td>' if not c else f'<td>{b}</td><td>{c}</td><td>{d}</td>') + '</tr>' for a, b, c, d in FB)
main = f'''<div class="P" style="width:1400px;padding:48px 56px 56px;gap:28px;display:flex;flex-direction:column">
<div style="display:flex;flex-direction:column;gap:10px"><span class="mono" style="font-size:11px;letter-spacing:.14em;color:var(--accent)">GAMES TABS · R1 · NOV 25, 2026</span>
<h1 class="disp" style="font-size:40px">Three ways to read a game</h1>
<p style="font-size:15px;line-height:1.6;color:var(--fg-body);max-width:900px">Decks › Games and Deck details › Games, phone and desktop, drawn three ways: <b style="color:var(--fg)">A Seats</b>, <b style="color:var(--fg)">B Ledger</b> and <b style="color:var(--fg)">C Headline rows</b>. Pick one and the next round fleshes it out. The month boxes and the filters are the same in all three.</p></div>
<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px">
<section class="box">{band('A · Seats', 'recommended')}<div style="padding:14px 16px;font-size:13.5px;line-height:1.55;color:var(--fg-body)">Each game is the table you sat at: your deck first, then each opponent, as art tiles. The winner’s tile is ringed with the trophy in its corner. Most personality, tallest rows.</div></section>
<section class="box">{band('B · Ledger', 'dense')}<div style="padding:14px 16px;font-size:13.5px;line-height:1.55;color:var(--fg-body)">A table: Result, Deck, At the table, Won by, Marks, Played. Everything lines up down the month. Best for scanning many games; least art.</div></section>
<section class="box">{band('C · Headline rows', 'calm')}<div style="padding:14px 16px;font-size:13.5px;line-height:1.55;color:var(--fg-body)">One line per game that says what happened (“Lost to Peter”). Selecting a row opens the game: a drawer on desktop, a sheet on phone. Marks and notes move into it.</div></section>
</div>
<section class="box">{band('Your feedback', 'how each concept answers it')}
<table style="width:100%;border-collapse:collapse;font-size:13px;line-height:1.5;color:var(--fg-body)">
<thead><tr class="mono" style="font-size:10px;letter-spacing:.14em;color:var(--fg-locked);text-align:left"><th style="padding:10px 16px;width:190px">POINT</th><th style="padding:10px 16px">A · SEATS</th><th style="padding:10px 16px">B · LEDGER</th><th style="padding:10px 16px">C · HEADLINE</th></tr></thead>
<tbody>{rows}</tbody></table></section>
<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">
<section class="box">{band('Section heads, app-wide', 'proposal')}<div style="padding:14px 16px;font-size:13.5px;line-height:1.6;color:var(--fg-body)">The month heading moves inside its box, as Request history’s months did, and takes Home’s heading type (the ◆, the display face at 17px, the count in mono). The same band carries Keep and Matchups here. The rest of the app can follow in a sweep later: Request history months, the Friends sections, the Stats cards.</div></section>
<section class="box">{band('Filters', 'Filters board')}<div style="padding:14px 16px;font-size:13.5px;line-height:1.6;color:var(--fg-body)">No native selects. Deck: the anchored panel on desktop, a sheet on phone, with deck art and game counts, only decks with games (the foot says why the rest are missing). Result: four options, so it is inline as a switch, no dropdown. Played against: the shipped panel, its trigger now showing who you picked with a ✕ to clear.</div></section>
</div>
<p class="mono" style="font-size:11px;color:var(--fg-faint)">Fixtures: Colin, Peter, Max, Chris. Deck pages are drawn from the tabs down, as in your capture.</p>
</div>'''
board('Main.dc.html', 'Games tabs R1', main, 1400)
td_css = '\ntd{padding:12px 16px;border-top:1px solid var(--border);vertical-align:top}'
p = os.path.join(OUT, 'Main.dc.html'); s = open(p).read().replace('</style>', td_css + '\n</style>', 1); open(p, 'w').write(s)
print('main ok')

# =====================  R2 (Hugh 2026-11-25): Headline rows + seats in the details  =====================
V2 = True
CSS2 = '''
/* record in the month band: the result squares themselves, counted */
.rec2{margin-left:auto;display:flex;align-items:center;gap:10px}
.rec2 .rq{display:flex;align-items:center;gap:6px;font:500 12px "IBM Plex Mono",monospace;color:var(--fg-body)}
.rec2 .rq .rs{width:22px;height:22px;font-size:10.5px;border-radius:6px}
.rec2 .rq.z{color:var(--fg-locked)}.rec2 .rq.z .rs{border-color:var(--border);color:var(--fg-locked)}
.rec2 .rbar{display:flex;width:64px;height:6px;border-radius:3px;overflow:hidden;background:var(--border-strong)}
.rec2 .rbar i{display:block;height:100%%;background:var(--success)}
.P .rec2 .rbar{display:none}
/* the row: headline left, the winner's commander art washing in on the right */
.d-row{position:relative;overflow:hidden;display:flex;align-items:center;gap:14px;min-height:76px;padding:12px 12px 12px 16px}
.d-wash{position:absolute;right:0;top:0;bottom:0;width:380px;pointer-events:none;-webkit-mask-image:linear-gradient(90deg,transparent 0%%,rgba(0,0,0,.55) 45%%,#000 100%%);mask-image:linear-gradient(90deg,transparent 0%%,rgba(0,0,0,.55) 45%%,#000 100%%)}
.d-wash img{width:100%%;height:100%%;object-fit:cover;object-position:50%% 25%%;opacity:.62}
.d-wash:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 40%%,rgba(20,17,14,.35))}
.d-row>*:not(.d-wash){position:relative;z-index:1}
.d-row .c-t h3 .wf{display:inline-block;vertical-align:-5px;width:22px;height:22px;border-radius:5px;overflow:hidden;margin:0 7px 0 8px;box-shadow:0 0 0 1.5px var(--accent)}
.d-row .c-t h3 .wf img{width:100%%;height:100%%;object-fit:cover}
.d-row .c-t h3 .wf.ini{background:var(--elevated);font:500 9px "IBM Plex Mono",monospace;color:var(--fg-muted);text-align:center;line-height:22px}
.d-end{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:none}
.d-end .d{font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.d-end .w{font:500 10.5px "IBM Plex Mono",monospace;color:var(--fg-locked)}
.d-row.sel{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 55%%,transparent);background:color-mix(in srgb,var(--accent) 6%%,transparent)}
.P .d-row{gap:12px;padding:12px 8px 12px 14px;min-height:78px}
.P .d-wash{width:210px}
/* the details: seats, less faded than R1 */
.st2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.st2 .seat{height:84px}
.st2 .seat img{opacity:.85}
.st2 .seat:after{background:linear-gradient(180deg,rgba(20,17,14,0) 30%%,rgba(20,17,14,.85) 100%%)}
.st2 .seat.me img,.st2 .seat.win img{opacity:.95}
.st2 .seat .t{right:10px;bottom:9px}
.st2 .seat .t b{font-size:13.5px;text-shadow:0 1px 4px rgba(0,0,0,.8)}
.st2 .seat .t span{color:var(--fg-body);text-shadow:0 1px 4px rgba(0,0,0,.8)}
.st2 .seat .who{color:var(--fg-body);text-shadow:0 1px 4px rgba(0,0,0,.9)}
.st2 .seat .won{position:absolute;right:8px;top:8px;z-index:1;display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px 0 6px;border-radius:11px;background:var(--accent);color:#14110E;font:600 11px "IBM Plex Sans",sans-serif}
.st2 .seat.ini .big{top:38%%}
/* Matchups v2: squares in a fixed column, a neutral square for a game somebody else won */
.mu2{display:grid;grid-template-columns:52px minmax(0,1fr) 172px 60px;align-items:center;column-gap:14px;padding:10px 16px;border-top:1px solid var(--border)}
.mu2:first-of-type{border-top:0}
.mu2 img{width:52px;height:38px;border-radius:6px;object-fit:cover}
.mu2 .n{font-size:14px;min-width:0}
.mu2 .sq{display:flex;gap:4px}
.mu2 .g{text-align:right;font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.rs.o{border-style:dashed;border-color:var(--border-dashed);color:var(--fg-locked)}
.P .mu2{grid-template-columns:52px minmax(0,1fr) 50px;row-gap:6px;padding:10px 14px;align-items:start}
.P .mu2 img{grid-row:span 2}
.P .mu2 .n{font-size:13.5px;line-height:1.3}
.P .mu2 .sq{grid-column:2;grid-row:2}
.P .mu2 .g{grid-column:3;grid-row:1 / span 2;align-self:center}
.key2{display:flex;flex-wrap:wrap;gap:8px 18px;padding:10px 16px 12px;border-top:1px solid var(--border);font:500 10.5px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.key2 span{display:inline-flex;align-items:center;gap:7px}
.key2 .rs{width:18px;height:18px;font-size:9.5px;border-radius:5px}
'''
CSS = CSS + (CSS2.replace('%%', '%'))

def rec2(gs):
    w = sum(1 for g in gs if g['r'] == 'W'); l = sum(1 for g in gs if g['r'] == 'L')
    pct = round(100 * w / max(1, w + l))
    return (f'<span class="rec2"><span class="rbar"><i style="width:{pct}%"></i></span>'
            f'<span class="rq{" z" if not w else ""}"><span class="rs w">W</span>{w}</span><span class="rq{" z" if not l else ""}"><span class="rs">L</span>{l}</span></span>')

def d_title(g):
    w = winner(g)
    if w == 'me': return '<em>Won</em>' + (f' against {", ".join(s["name"] for s in g["seats"])}' if g['seats'] else '')
    if w is None: return 'Lost'
    wf = f'<span class="wf"><img src="art/{w["art"]}.webp" alt=""></span>' if w['art'] else f'<span class="wf ini">{ini(w["name"])}</span>'
    return f'Lost to{wf}{w["name"]}'
def d_row(g, deck_tab=False, sel=False, phone=False):
    w = winner(g)
    wash_art = g['deck'] if w == 'me' else (w['art'] if w else None)
    wash = ''  # R2b (Hugh 2026-11-25): no art wash on the row
    art = f'<span class="c-art"><img src="art/{g["deck"]}.webp" alt=""><span class="rs{" w" if g["r"]=="W" else ""}">{g["r"]}</span></span>'
    if deck_tab:
        sub = f'<span class="stamp">{g["v"]}</span><span>{pods(g["pod"])}</span>'
    else:
        sub = f'<span class="n">{DECKS[g["deck"]]}</span><span class="stamp">{g["v"]}</span>' + ('' if phone else f'<span>{pods(g["pod"])}</span>')
    end = f'<span class="d-end"><span class="d">{g["date"]}</span>' + (f'<span class="w">{pods(g["pod"])}</span>' if phone and not deck_tab else '') + '</span>'
    return (f'<article class="row d-row{" sel" if sel else ""}">{wash}{art}<span class="c-t"><h3>{d_title(g)}</h3><span class="sub">{sub}</span></span>'
            f'{end}{chev(16)}</article>')

def d_seat(s=None, g=None):
    if g is not None:
        w = g['r'] == 'W'
        return (f'<div class="seat me{" win" if w else ""}"><img src="art/{g["deck"]}.webp" alt=""><span class="who">You</span>'
                f'<span class="t"><b>{DECKS[g["deck"]]}<span class="stamp" style="background:rgba(20,17,14,.6)">{g["v"]}</span></b></span>'
                + (f'<span class="won">{trophy(12)}Won</span>' if w else '') + '</div>')
    wn = ' win' if s['won'] else ''
    badge = f'<span class="won">{trophy(12)}Won</span>' if s['won'] else ''
    if not s['art']:
        return f'<div class="seat ini{wn}"><span class="big">{ini(s["name"])}</span><span class="t"><b>{s["name"]}</b><span>No commander logged</span></span>{badge}</div>'
    return f'<div class="seat{wn}"><img src="art/{s["art"]}.webp" alt=""><span class="t"><b>{s["name"]}</b><span>{s["cmd"]}</span></span>{badge}</div>'
def d_sheet_body(g, deck_tab=False):
    w = winner(g)
    head_t = 'Won' if w == 'me' else ('Lost' if w is None else f'Lost to {w["name"]}')
    seats = d_seat(g=g) + ''.join(d_seat(s) for s in g['seats'])
    foot = ('<span class="btn" style="flex:1;color:var(--danger)">Delete game</span>' if deck_tab else
            f'<span class="btn" style="flex:1">Open on {DECKS[g["deck"]]} ›</span>')
    return (f'<div class="gs-h"><div><h3>{head_t}</h3><div class="m">{pods(g["pod"])} · {g["date"]}, 2026</div></div><span class="gs-x">{xic(18)}</span></div>'
            f'<div class="gs-s"><div class="st2">{seats}</div></div>'
            f'<div class="gs-s">{markgroups(g)}{note(g)}</div>'
            f'<div class="gs-foot">{foot}</div>')

def matchups2(phone=False):
    def mu(art, name, r):
        sq = ''.join(f'<span class="rs{" w" if x=="W" else (" o" if x=="–" else "")}" style="width:24px;height:24px;font-size:11px">{x}</span>' for x in r)
        return f'<div class="mu2"><img src="art/{art}.webp" alt=""><span class="n">{name}</span><span class="sq">{sq}</span><span class="g">{len(r)} game{"s" if len(r)>1 else ""}</span></div>'
    seg = '<span class="seg" style="margin-left:auto"><span class="on">Commander</span><span>Colors</span><span>Friend</span></span>'
    key = ('<div class="key2"><span><span class="rs w">W</span>you won</span><span><span class="rs">L</span>they won</span>'
           '<span><span class="rs o">–</span>someone else won</span></div>')
    return (f'<section class="box">{band("Matchups", "recorded in 3 of 3 games", seg if not phone else "")}'
            + ('<div style="padding:10px 12px 0"><span class="seg" style="display:flex"><span class="on" style="flex:1;justify-content:center">Commander</span><span style="flex:1;justify-content:center">Colors</span><span style="flex:1;justify-content:center">Friend</span></span></div>' if phone else '')
            + mu('ishai', 'Ishai, Ojutai Dragonspeaker', 'L') + mu('giada', 'Giada, Font of Hope', '–') + mu('bruse', 'Bruse Tarl, Boorish Herder', 'W') + mu('ghalta', 'Ghalta, Primal Hunger', 'L')
            + key + '</section>')

g2 = GAMES[1]; g3 = GAMES[2]
drawer2 = f'<div class="gs" style="position:absolute;right:0;top:0;bottom:0;width:460px;z-index:30;border-radius:0;border-width:0 0 0 1px">{d_sheet_body(g2)}</div><div class="scrim" style="right:460px"></div>'
board('D-Desktop.dc.html', 'R2 Headline rows + seats, desktop', pair(
    labelled('DECKS › GAMES', decks_desktop(lambda g: d_row(g))),
    labelled('DECKS › GAMES · a game selected (drawer)', decks_desktop(lambda g: d_row(g, sel=(g['id'] == 2)), extra=drawer2)),
    labelled('DECK DETAILS › GAMES · HD - Sai', deck_desktop(lambda g: d_row(g, True)))), 4060)
sheet2 = f'<div class="scrim"></div><div class="sheet gs P" style="border-radius:16px 16px 0 0;max-height:790px"><div class="grab"></div>{d_sheet_body(g3, deck_tab=True)}</div>'
board('D-Phone.dc.html', 'R2 Headline rows + seats, phone', pair(
    labelled('DECKS › GAMES', phone_decks(lambda g: d_row(g, phone=True))),
    labelled('DECK DETAILS › GAMES', phone_deck(lambda g: d_row(g, True, phone=True))),
    labelled('A GAME SELECTED (sheet)', '<div style="position:relative;width:390px;height:844px;overflow:hidden">' + phone_deck(lambda g: d_row(g, True, phone=True)) + sheet2 + '</div>')), 1330)
print('r2 ok')

# =====================  R3 (Hugh 2026-11-25): back to A's rows, R1/R2 fixes folded in  =====================
CSS3 = '''
.st3{grid-template-columns:repeat(5,minmax(0,1fr))}
.st3 .seat{height:74px}
.st3 .seat.none{border-style:dashed;background:transparent}
.st3 .seat.none:after{display:none}
.st3 .seat.none .t span{color:var(--fg-faint);text-shadow:none}
.st3 .seat.ini .big{top:8px;left:10px;right:auto;bottom:auto;transform:none;font-size:14px}
.P .st3{grid-template-columns:repeat(2,minmax(0,1fr))}
.P .st3 .seat{height:70px}
'''
CSS = CSS + CSS3
def e_row(g, deck_tab=False):
    pill = '<span class="pill w">Won</span>' if g['r'] == 'W' else '<span class="pill">Lost</span>'
    end = '<span class="xbtn">×</span>' if deck_tab else chev(16)
    seats = d_seat(g=g) + ''.join(d_seat(s) for s in g['seats'])
    if not g['seats']:
        seats += '<div class="seat none"><span class="t"><span>Nobody logged across the table</span></span></div>'
    return (f'<article class="row a-row"><div class="a-top">{pill}<span class="meta">{pods(g["pod"])} · {g["date"]}</span><span class="end">{end}</span></div>'
            f'<div class="st2 st3">{seats}</div>{markgroups(g)}{note(g)}</article>')
board('E-Desktop.dc.html', 'R3 Seats, desktop', pair(
    labelled('DECKS › GAMES', decks_desktop(lambda g: e_row(g))),
    labelled('DECK DETAILS › GAMES · HD - Sai', deck_desktop(lambda g: e_row(g, True)))), 2680)
board('E-Phone.dc.html', 'R3 Seats, phone', pair(
    labelled('DECKS › GAMES', phone_decks(lambda g: e_row(g))),
    labelled('DECK DETAILS › GAMES', phone_deck(lambda g: e_row(g, True)))), 860)
print('r3 ok')

# =====================  R4 (Hugh 2026-11-25): building on Seats  =====================
CSS4 = '''
:root{--w:#F4E9C4;--u:#3A6AA5;--b:#98748F;--r:#C05A3E;--g:#4B7A46}
.st3 .seat.empty{border:1px dashed var(--border-dashed);background:transparent}
.st3 .seat.empty:after{display:none}
.st3 .seat.empty .t span{color:var(--fg-locked);font:500 10.5px "IBM Plex Mono",monospace;letter-spacing:.06em;text-shadow:none}
.seat a.open{position:absolute;inset:0;z-index:2;display:block}
.seat .go{position:absolute;right:8px;bottom:9px;z-index:1;display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px 0 9px;border-radius:12px;background:rgba(20,17,14,.72);border:1px solid rgba(237,230,216,.18);font:500 11.5px "IBM Plex Sans",sans-serif;color:var(--fg)}
.seat .go svg{color:var(--fg)}
.opendk{display:inline-flex;align-items:center;gap:4px;min-height:36px;padding:0 6px 0 10px;border-radius:8px;font-size:13px;font-weight:500;color:var(--fg-muted);text-decoration:none}
.opendk svg{color:var(--fg-muted)}
.opendk .sm{display:none}.P .opendk .lg{display:none}.P .opendk .sm{display:inline}.P .opendk{min-height:44px}.P .hp-r{grid-template-columns:minmax(0,1fr) auto 100px}
/* page head: headline + primary Log a game on one line */
.ph{display:flex;align-items:flex-end;gap:20px;padding-top:12px}
.ph .hl{flex:1;padding-top:0}
.P .ph{flex-direction:column;align-items:stretch;gap:14px}
/* How it's playing */
.hp-lead{padding:16px 16px 4px;display:flex;flex-direction:column;gap:6px}
.hp-lead h3{font-family:"Cinzel",serif;font-weight:700;font-size:19px;line-height:1.25}
.hp-lead p{font-size:13.5px;color:var(--fg-body);line-height:1.5}
.hp-cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:min-content;gap:12px;padding:12px 16px 16px}
.hp-cols .hp-col.tall{grid-row:span 2}
.hp-col{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:10px;background:var(--surface);overflow:hidden}
.hp-col h4{margin:0;display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border);font:500 10px "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.hp-col h4 i{width:8px;height:8px;border-radius:50%%;flex:none}
.hp-r{display:grid;grid-template-columns:minmax(0,1fr) auto 112px;align-items:center;gap:10px;min-height:38px;padding:4px 12px;border-top:1px solid var(--border)}
.hp-r:first-of-type{border-top:0}
.hp-r .n{font-size:13.5px;color:var(--fg)}
.hp-r .c{white-space:nowrap;font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint);text-align:right}
.pips{display:flex;gap:4px}
.pip{width:10px;height:10px;border-radius:50%%;border:1.5px solid var(--border-strong);box-sizing:border-box}
.pip.u{background:var(--success);border-color:var(--success)}
.pip.d{background:var(--warning);border-color:var(--warning)}
.hp-key{display:flex;align-items:center;gap:14px;margin-left:auto;font:500 10.5px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.hp-key span{display:inline-flex;align-items:center;gap:6px}
.foot{display:flex;align-items:center;gap:12px;min-height:48px;padding:4px 8px 4px 16px;border-top:1px solid var(--border);background:var(--surface-rail)}
.foot p{flex:1;font-size:13px;color:var(--fg-body)}
.foot a{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 10px;font-size:13px;font-weight:600;color:var(--accent);text-decoration:none;white-space:nowrap}
.P .hp-cols{grid-template-columns:minmax(0,1fr);padding:12px 14px 14px}
.P .hp-key{display:none}
.P .foot{flex-direction:column;align-items:flex-start;gap:0;padding:10px 8px 6px 14px}
.P .foot a{padding:0}
/* Matchups v3: squares follow the name; counts past ten */
.mu3{display:grid;grid-template-columns:56px 300px minmax(0,1fr);align-items:center;column-gap:16px;min-height:56px;padding:8px 16px;border-top:1px solid var(--border)}
.mu3:first-of-type{border-top:0}
.mu3 .th{width:56px;height:38px;border-radius:7px;overflow:hidden;background:var(--elevated);display:flex;align-items:center;justify-content:center;gap:2px;font:500 11px "IBM Plex Mono",monospace;color:var(--fg-muted)}
.mu3 .th.pp{background:transparent}
.mu3 .th img{width:100%%;height:100%%;object-fit:cover}
.mu3 .th b{width:8px;height:8px;border-radius:2px;display:block}
.mu3 .nm{min-width:0;display:flex;flex-direction:column;gap:2px}
.mu3 .nm b{font-weight:400;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mu3 .nm span{font:500 10.5px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.mu3 .rr{display:flex;align-items:center;gap:14px;min-width:0}
.mu3 .sq{display:flex;gap:4px;flex-wrap:wrap}
.mu3 .sq .rs{width:22px;height:22px;font-size:10.5px;border-radius:5px}
.mu3 .ct{display:flex;align-items:center;gap:10px}
.mu3 .ct .rq{display:flex;align-items:center;gap:6px;font:500 12px "IBM Plex Mono",monospace;color:var(--fg-body)}
.mu3 .ct .rs{width:22px;height:22px;font-size:10.5px;border-radius:5px}
.mu3 .g{font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint);white-space:nowrap}
.P .mu3{grid-template-columns:48px minmax(0,1fr);row-gap:7px;padding:10px 14px;align-items:start}
.P .mu3 .th{width:48px;height:34px;grid-row:span 2}
.P .mu3 .nm b{white-space:normal;font-size:13.5px;line-height:1.3}
.P .mu3 .rr{grid-column:2;justify-content:space-between}
'''.replace('%%', '%')
CSS = CSS + CSS4

def e4_seat_me(g, link):
    w = g['r'] == 'W'
    go = f'<span class="go">Open deck{chev(12)}</span><a class="open" href="#" aria-label="Open {DECKS[g["deck"]]}"></a>' if link else ''
    return (f'<div class="seat me{" win" if w else ""}"><img src="art/{g["deck"]}.webp" alt=""><span class="who">You</span>'
            f'<span class="t" style="right:{"112px" if link else "10px"}"><b>{DECKS[g["deck"]]}<span class="stamp" style="background:rgba(20,17,14,.6)">{g["v"]}</span></b></span>'
            + (f'<span class="won">{trophy(12)}Won</span>' if w else '') + go + '</div>')
def e4_row(g, deck_tab=False):
    pill = '<span class="pill w">Won</span>' if g['r'] == 'W' else '<span class="pill">Lost</span>'
    end = '<span class="end"><span class="xbtn">×</span></span>' if deck_tab else f'<a class="end opendk" href="#"><span class="lg">Open {DECKS[g["deck"]]}</span><span class="sm">Open deck</span>{chev(13)}</a>'
    seats = e4_seat_me(g, False) + ''.join(d_seat(s) for s in g['seats'])
    seats += '<div class="seat empty"><span class="t"><span>Seat not logged</span></span></div>' * max(0, g['pod'] - 1 - len(g['seats']))
    return (f'<article class="row a-row"><div class="a-top">{pill}<span class="meta">{pods(g["pod"])} · {g["date"]}</span>{end}</div>'
            f'<div class="st2 st3">{seats}</div>{markgroups(g)}{note(g)}</article>')

# How it's playing (replaces Keep); pips are Sai's three games oldest first: Oct 30 W, Oct 30 L, Nov 1 L
AX = {'Speed': 'u--', 'Answers': 'u--', 'Closing the game': 'u--', 'The deck’s plan': '-u-', 'Cards in hand': '--u', 'Comebacks': '--u',
      'Mana': 'udd', 'Board presence': 'u-d'}
def pips(p): return '<span class="pips">' + ''.join(f'<span class="pip{" u" if c=="u" else (" d" if c=="d" else "")}"></span>' for c in p) + '</span>'
def hp_count(n, kind):
    u = AX[n].count('u'); d = AX[n].count('d')
    if kind == 'u': return f'up in {u} of 3'
    if kind == 'd': return f'down in {d} of 3'
    return f'{u} up · {d} down'
def hp_col(title, dot, names, kind='u', tall=False):
    rows = ''.join(f'<div class="hp-r"><span class="n">{n}</span>{pips(AX[n])}<span class="c">{hp_count(n, kind)}</span></div>' for n in names)
    return f'<div class="hp-col{" tall" if tall else ""}"><h4><i style="background:{dot}"></i>{title}</h4>{rows}</div>'
def how_playing(phone=False):
    key = ('<span class="hp-key"><span><span class="pip u"></span>helped</span><span><span class="pip d"></span>hurt</span>'
           '<span><span class="pip"></span>not marked</span></span>')
    return (f'<section class="box">{band("How it’s playing", "from your marks", key)}'
            '<div class="hp-lead"><h3>Mana is holding it back.</h3><p>Marked against you in 2 of 3 games. Everything else is helping, or cutting both ways.</p></div>'
            '<div class="hp-cols">'
            + hp_col('Helping', 'var(--success)', ['Speed', 'Answers', 'Closing the game', 'The deck’s plan', 'Cards in hand', 'Comebacks'], 'u', True)
            + hp_col('Hurting', 'var(--warning)', ['Mana'], 'd')
            + hp_col('Both ways', 'linear-gradient(90deg,var(--success) 50%,var(--warning) 50%)', ['Board presence'], 'b')
            + '</div>'
            f'<div class="foot"><p>Suggested changes uses these games to pick what to cut and add.</p><a href="#">Open Tuning{chev(13)}</a></div></section>')

def th_art(a): return f'<span class="th"><img src="art/{a}.webp" alt=""></span>'
def th_pips(cs): return '<span class="th pp">' + ''.join(f'<b style="background:var(--{c.lower()})"></b>' for c in cs) + '</span>'
def sqs(r): return '<span class="sq">' + ''.join(f'<span class="rs{" w" if x=="W" else (" o" if x=="–" else "")}">{x}</span>' for x in r) + '</span>'
def cts(w, l, o): return (f'<span class="ct"><span class="rq"><span class="rs w">W</span>{w}</span><span class="rq"><span class="rs">L</span>{l}</span>'
                          f'<span class="rq"><span class="rs o">–</span>{o}</span></span>')
def mu3(th, name, sub, r=None, counts=None):
    n = len(r) if r else sum(counts)
    body = sqs(r) if r else cts(*counts)
    s = f'<span>{sub}</span>' if sub else ''
    return f'<div class="mu3">{th}<span class="nm"><b>{name}</b>{s}</span><span class="rr">{body}<span class="g">{n} game{"" if n == 1 else "s"}</span></span></div>'
MU_ROWS = {
 'Commander': [mu3(th_art('ishai'), 'Ishai, Ojutai Dragonspeaker', None, counts=(4, 5, 2)),
               mu3(th_art('giada'), 'Giada, Font of Hope', None, list('W–LWL–')),
               mu3(th_art('ghalta'), 'Ghalta, Primal Hunger', None, list('LLW')),
               mu3(th_art('bruse'), 'Bruse Tarl, Boorish Herder', None, list('W–')),
               mu3(th_art('kilo'), 'Kilo, Apogee Mind', None, list('L'))],
 'Colors': [mu3(th_pips('WUG'), 'Bant', 'W U G', counts=(5, 4, 2)),
            mu3(th_pips('WUBR'.replace('B', 'B')), 'Four colors', 'no G', list('–WLW')),
            mu3(th_pips('G'), 'Mono-green', 'G', list('LLW')),
            mu3(th_pips('UR'), 'Izzet', 'U R', list('W–')),
            mu3(th_pips('WUB'), 'Esper', 'W U B', list('L'))],
 'Friend': [mu3(th_art('ghalta'), 'Colin', None, counts=(4, 5, 2)),
            mu3(th_art('giada'), 'Peter', None, list('W–L–WL')),
            mu3(th_art('ishai'), 'Max', None, list('–LWL–')),
            mu3('<span class="th">CH</span>', 'Chris', None, list('LW'))],
}
def matchups3(tab='Commander', phone=False):
    segs = ''.join(f'<span class="{"on" if t==tab else ""}" style="{"flex:1;justify-content:center" if phone else ""}">{t}</span>' for t in ['Commander', 'Colors', 'Friend'])
    seg = f'<span class="seg" style="margin-left:auto">{segs}</span>'
    key = ('<div class="key2"><span><span class="rs w">W</span>you won</span><span><span class="rs">L</span>they won</span>'
           '<span><span class="rs o">–</span>someone else won</span></div>')
    return (f'<section class="box">{band("Matchups", "14 of 20 games", "" if phone else seg)}'
            + (f'<div style="padding:10px 12px 0"><span class="seg" style="display:flex">{segs}</span></div>' if phone else '')
            + ''.join(MU_ROWS[tab]) + key + '</section>')

SMALL_MU = [mu3(th_art('ishai'), 'Ishai, Ojutai Dragonspeaker', None, list('L')), mu3(th_art('giada'), 'Giada, Font of Hope', None, list('–')),
            mu3(th_art('bruse'), 'Bruse Tarl, Boorish Herder', None, list('W')), mu3(th_art('ghalta'), 'Ghalta, Primal Hunger', None, list('L'))]
def matchups_small(phone=False):
    segs = ''.join(f'<span class="{"on" if t=="Commander" else ""}" style="{"flex:1;justify-content:center" if phone else ""}">{t}</span>' for t in ['Commander', 'Colors', 'Friend'])
    key = ('<div class="key2"><span><span class="rs w">W</span>you won</span><span><span class="rs">L</span>they won</span>'
           '<span><span class="rs o">–</span>someone else won</span></div>')
    return (f'<section class="box">{band("Matchups", "3 of 3 games", "" if phone else f"<span class=\"seg\" style=\"margin-left:auto\">{segs}</span>")}'
            + (f'<div style="padding:10px 12px 0"><span class="seg" style="display:flex">{segs}</span></div>' if phone else '')
            + ''.join(SMALL_MU) + key + '</section>')

def deck_top4(phone=False):
    tabs = '<div class="dtabs"><span>Your deck<i>99</i></span><span>Analysis</span><span>Tuning</span><span class="on">Games<i>3</i></span><span>Versions<i>4</i></span></div>'
    head = ('<div class="ph"><div class="hl"><h2 class="disp">3 games logged. 1–2.</h2><div class="facts">pods of 2–3 · Oct to Nov 2026 · last played Nov 1</div></div>'
            f'<span class="btn cream" style="min-height:44px;padding:0 20px;font-size:14px">Log a game</span></div>')
    return tabs + head + how_playing(phone) + matchups_small(phone)
def deck_desktop4():
    body = ''.join(month_box([g for g in SAI if g['m'] == k], t, lambda g: e4_row(g, True)) for k, t in MONTHS)
    return f'<div class="D"><div class="rail"><img src="art/rail-decks.png" alt=""></div><div class="main" style="padding-top:0">{deck_top4()}{body}</div></div>'
def phone_deck4():
    body = ''.join(month_box([g for g in SAI if g['m'] == k], t, lambda g: e4_row(g, True)) for k, t in MONTHS)
    return (f'<div class="P"><img class="ptop" src="art/p-top.png" alt=""><div class="pm" style="padding-top:0">{deck_top4(True)}{body}</div>'
            f'<div class="addbar"><span class="f">{srch()} Add a card by name · Bant</span><span class="tog"></span><span style="font-size:12.5px;color:var(--fg-body)">Owned only</span></div>'
            f'<img class="ptab" src="art/p-tabbar-decks.png" alt="" style="margin-top:0"></div>')

board('G-Desktop.dc.html', 'R4 Seats, desktop', pair(
    labelled('DECKS › GAMES', decks_desktop(lambda g: e4_row(g))),
    labelled('DECK DETAILS › GAMES · HD - Sai', deck_desktop4())), 2680)
board('G-Phone.dc.html', 'R4 Seats, phone', pair(
    labelled('DECKS › GAMES', phone_decks(lambda g: e4_row(g))),
    labelled('DECK DETAILS › GAMES', phone_deck4())), 860)
def mu_desk(tab): return f'<div class="D" style="grid-template-columns:minmax(0,1fr);width:1236px;background:transparent"><div>{matchups3(tab)}</div></div>'
def mu_phone(tab): return f'<div class="P" style="padding:0 16px;background:transparent">{matchups3(tab, True)}</div>'
board('G-Matchups.dc.html', 'R4 Matchups, fuller', '<div style="display:flex;flex-direction:column;gap:60px">'
      + pair(*[labelled(f'DESKTOP · {t.upper()}', mu_desk(t)) for t in ['Commander', 'Colors']]) + pair(labelled('DESKTOP · FRIEND', mu_desk('Friend')))
      + pair(*[labelled(f'PHONE · {t.upper()}', mu_phone(t)) for t in ['Commander', 'Colors', 'Friend']]) + '</div>', 2552)
print('r4 ok')
