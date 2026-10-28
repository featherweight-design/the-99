"""The pieces: Home (shipped blocks + the new feed), Friends, a friend's page, Settings, Commanders' strip, the menu."""
import kit
from kit import img, ico, nav_icon, LOCK

kit.CSS += r"""
/* ---------------- Home: shipped blocks ---------------- */
.hh{padding:14px 16px 0;display:flex;flex-direction:column}
.hh .kk{margin:0 0 6px;font:400 10px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.hh h1{margin:0;font:700 23px/1.15 'Cinzel',serif;color:var(--fg)}
.hh .bt{display:flex;gap:8px;margin-top:12px}
.hh .bt>*{flex:1}
.dk .hh{padding:22px 26px 0;flex-direction:row;align-items:flex-end;gap:16px}
.dk .hh .tx{flex:1}
.dk .hh .kk{margin-bottom:7px;letter-spacing:.18em}
.dk .hh h1{font-size:28px;line-height:1}
.dk .hh .bt{margin:0;gap:8px}
.dk .hh .bt>*{flex:none}
.hb{display:flex;flex-direction:column;gap:12px;padding:14px 16px 16px}
.dk .hb{flex-direction:row;gap:20px;padding:20px 26px 26px;align-items:flex-start}
.dk .hb .cl{flex:1;min-width:0;display:flex;flex-direction:column;gap:11px}
.dk .hb .cr{width:316px;flex:none;display:flex;flex-direction:column;gap:11px}
.blk{display:flex;flex-direction:column;gap:12px}
.dk .blk{gap:11px}
.ws{display:flex;align-items:center;gap:12px;min-height:52px;padding:7px 4px 7px 12px;border-radius:12px;border:1px solid var(--accent-shadow);background:var(--surface);font-size:13.5px;line-height:1.45;color:var(--fg-body)}
.ws .wsm{flex:none;width:30px;height:30px;display:flex;align-items:center;justify-content:center}
.ws .wsm i{width:22px;height:22px;transform:rotate(45deg);border:1.5px solid var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--surface));border-radius:3px;display:flex;align-items:center;justify-content:center;font-style:normal}
.ws .wsm i b{transform:rotate(-45deg);font:700 11px 'Cinzel',serif;color:var(--accent)}
.ws .wst{flex:1;min-width:0}
.ws .wst b{color:var(--fg);font-weight:600}
.ws .wst u{color:var(--fg);text-decoration-color:rgba(207,135,69,.55);text-underline-offset:3px;white-space:nowrap}
.ws .wsx{flex:none;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);font-size:13px}
.dk .ws .wsx{width:32px;height:32px;margin-right:4px}
.rr{position:relative;display:flex;height:72px;align-items:center;overflow:hidden;border-radius:12px;border:1px solid var(--border);background:var(--surface-inset);padding:4px 10px 4px 0}
.dk .rr{flex:1 1 calc(50% - 6px);padding-right:18px}
.rr .pa{position:absolute;left:0;top:0;bottom:0;width:99px}
.rr .pa img{width:100%;height:100%;object-fit:cover;display:block}
.rr .pa::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 55%,var(--surface-inset))}
.rr .rt{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;padding-left:108px}
.dk .rr .rt{padding-left:116px}
.rr .l1{display:flex;align-items:baseline;gap:8px;min-width:0}
.rr .l1 b{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font:600 14.5px/1.2 'Cinzel',serif;color:var(--fg)}
.rr .l1 small{margin-left:auto;flex:none;font:10.5px 'IBM Plex Mono';color:var(--fg-locked)}
.rr .l2{display:flex;align-items:center;gap:14px;height:22px;min-width:0}
.rr .pill{flex:none;height:19px;display:flex;align-items:center;padding:0 7px;border-radius:5px;font:10px 'IBM Plex Mono'}
.rr .l2 span.c{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font:10.5px 'IBM Plex Mono';color:var(--fg-body)}
.rr .l3{display:flex;align-items:center;gap:10px}
.rr .l3 .bar{flex:1;height:3px;border-radius:2px;background:var(--border-strong);overflow:hidden}
.rr .l3 .bar i{display:block;height:100%;border-radius:2px}
.rr .l3 small{flex:none;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.rrs{display:flex;flex-direction:column;gap:12px}
.dk .rrs{flex-direction:row;flex-wrap:wrap}
.more{display:flex;align-items:center;gap:10px}
.more small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.more .bg{margin-left:auto;height:44px;font-size:13px;padding:0 12px}
.dk .more .bg{margin-left:0;height:32px;font-size:12.5px}
.cm{display:flex;flex-direction:column;gap:11px;border-radius:14px;border:1px solid var(--border);background:var(--surface-inset);padding:14px}
.cm .r{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;color:var(--fg-body)}
.cm .r span:last-child{font:13px 'IBM Plex Mono'}
.cm .bb{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:2px}
.cm .bb span{height:44px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid var(--border-strong);font-size:12.5px;color:var(--fg)}
.dk .cm .bb span{height:32px}
.face{flex:none;display:flex;align-items:center;justify-content:center;overflow:hidden;font:500 12px 'IBM Plex Mono';border:1px solid var(--border-strong);background:var(--surface-raised);color:var(--fg-body)}
.face img{width:100%;height:100%;object-fit:cover;display:block}
.fsx ul{margin:0;padding:0;list-style:none;display:flex;justify-content:space-between}
.fsx li{width:56px;display:flex;flex-direction:column;align-items:center;gap:6px}
.dk .fsx li{width:52px}
.fsx li small{font-size:11.5px;color:var(--fg-body);max-width:50px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fsx li .es{width:40px;height:40px;border-radius:10px;border:1.5px dashed var(--border-dashed)}
.fsx .ad{height:44px;border-radius:10px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--fg)}
.dk .fsx .ad{height:32px;align-self:flex-start;padding:0 14px;font-size:12.5px;border-radius:8px}
.tc{position:relative;overflow:hidden;border-radius:14px;border:1px solid var(--accent);background:var(--surface-rail);padding:14px;display:flex;flex-direction:column;gap:10px}
.blur{position:absolute;inset:-40px;display:flex;opacity:.28;filter:blur(34px) saturate(1.25);pointer-events:none}
.blur img{flex:1;min-width:0;height:100%;object-fit:cover}
.tc>*:not(.blur){position:relative}
.tc .k{font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--accent-text)}
.tc h3{margin:0;font:700 18px 'Cinzel',serif}
.tc .fc{display:flex;gap:6px}
.tc p{font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.tc p b{color:var(--fg)}
.tc .ba{width:100%}

/* ---------------- first run (shipped checklist) ---------------- */
.frhd{padding:16px 16px 0}
.frhd .frk{margin:0 0 6px;font:500 10px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.frhd h1{margin:0;font:700 23px/1.15 'Cinzel',serif}
.frpl{margin:12px 0 0;display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--fg-muted)}
.abl{margin:14px 16px 0;min-height:46px;padding:7px 14px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface-rail);display:flex;align-items:center;gap:12px;font-size:13.5px;line-height:1.45;color:var(--fg-body)}
.abl .bm{flex:none;width:22px;height:22px;border-radius:6px;background:rgba(207,135,69,.16);border:1px solid rgba(207,135,69,.45);display:flex;align-items:center;justify-content:center}
.abl .bm i{width:7px;height:7px;background:var(--accent);transform:rotate(45deg);display:block}
.abl b{color:var(--fg);font-weight:600}
.abl u{color:var(--fg);text-decoration-color:rgba(207,135,69,.55);text-underline-offset:3px;white-space:nowrap}
.frws{margin:8px 16px 0}
.frst{display:flex;flex-direction:column;gap:11px;padding:16px 16px 20px}
.s1{display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px 16px 16px;border:1px solid var(--accent);background:var(--surface-inset);border-radius:14px;text-align:center}
.fan9{position:relative;width:88px;height:92px;flex:none}
.fan9 span{position:absolute;width:50px;height:68px;border-radius:6px;border:1px solid var(--border-strong)}
.fan9 .a{top:14px;left:8px;transform:rotate(-14deg);background:#221E19}
.fan9 .b{top:10px;left:18px;background:var(--elevated)}
.fan9 .c{top:14px;left:30px;transform:rotate(13deg);border-color:var(--accent);background:var(--surface);display:flex;align-items:center;justify-content:center;font:700 17px 'Cinzel',serif;color:var(--accent)}
.s1c{display:flex;flex-direction:column;gap:12px;width:100%}
.s1c .t{font:600 19px 'Cinzel',serif}
.s1c p{font-size:13.5px;line-height:1.6;color:var(--fg-muted)}
.s1b{display:flex;flex-direction:column;gap:8px}
.ways{margin-top:4px;padding-top:12px;border-top:1px solid var(--border-strong);display:flex;flex-direction:column;text-align:left}
.ways .wk{font:500 9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);margin-bottom:2px}
.ways .wr{min-height:44px;display:flex;align-items:center;justify-content:space-between;font:600 14px 'IBM Plex Sans'}
.ways .wr+.wr{border-top:1px solid var(--border)}
.ways .wr i{font-style:normal;font-weight:400;color:var(--fg-faint)}
.lst{display:flex;align-items:center;gap:12px;min-height:56px;padding:14px 15px;border-radius:14px;border:1px solid var(--border);background:var(--surface-rail)}
.lst .n{width:22px;height:22px;flex:none;border-radius:6px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font:11px 'IBM Plex Mono';color:#4A4033}
.lst .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.lst .tx b{font:600 15px 'Cinzel',serif;color:var(--fg-locked)}
.lst .tx span{font-size:12px;color:var(--fg-locked)}
.frw{display:flex;align-items:center;gap:12px;min-height:56px;padding:12px 15px;border-radius:14px;border:1px solid var(--border-strong);background:var(--surface-rail)}
.frw .sl{width:22px;height:22px;flex:none;border-radius:6px;border:1.5px dashed var(--border-dashed);display:flex;align-items:center;justify-content:center;font:300 14px/1 'IBM Plex Sans';color:var(--fg-muted)}
.frw .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.frw .tx b{font:600 15px 'Cinzel',serif}
.frw .tx span{font-size:12px;color:var(--fg-muted)}
.frw .ch{color:var(--fg-faint)}
.dk .frp{max-width:760px}
.dk .frhd{padding:26px 28px 0}
.dk .abl,.dk .frws{margin-left:28px;margin-right:28px}
.dk .frst{padding:16px 28px 28px}

/* ---------------- the feed (NEW) ---------------- */
.fd{border-radius:14px;border:1px solid var(--border);background:var(--surface-inset);display:flex;flex-direction:column;overflow:hidden}
.fi{display:grid;grid-template-columns:46px minmax(0,1fr);gap:12px;padding:12px 14px;position:relative}
.fi+.fi{border-top:1px solid var(--border)}
.fi.seen .kd{color:var(--fg-locked)}
.fi .vis{position:relative;width:46px;height:64px}
.cardimg{display:block;border-radius:3px;object-fit:cover;box-shadow:0 2px 6px rgba(0,0,0,.45)}
.fi .vis .cardimg{width:46px;height:64px}
.fi .vis .fa{position:absolute;right:-6px;bottom:-5px;width:24px;height:24px;border-radius:7px;overflow:hidden;border:1.5px solid var(--surface-inset)}
.fi .vis .fa img{width:100%;height:100%;object-fit:cover;display:block}
.combo{width:46px;height:64px;border-radius:4px;border:1px solid var(--border-strong);background:var(--surface-raised);display:flex;align-items:center;justify-content:center;color:var(--fact)}
.fi .bd{min-width:0;display:flex;flex-direction:column;gap:3px}
.fi .kr{display:flex;align-items:center;gap:7px;min-width:0}
.fi .kr .un{width:6px;height:6px;background:var(--accent);transform:rotate(45deg);flex:none}
.fi .kd{font:500 9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi .kd.w{color:var(--accent-text)}
.fi .kr small{margin-left:auto;flex:none;font:10.5px 'IBM Plex Mono';color:var(--fg-locked)}
.fi .tt{font:600 14px/1.35 'IBM Plex Sans';color:var(--fg)}
.fi .dt{font-size:12.5px;line-height:1.5;color:var(--fg-body)}
.fi .dt .mo{font:12px 'IBM Plex Mono'}
.fi .dt s{color:var(--fg-faint)}
.fi .dt .dn{color:var(--success)}
.fi .ac{display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap}
.fi .ac .lnk{min-height:32px;display:flex;align-items:center;font-size:13px}
.fi .ac .yn{height:36px;padding:0 16px;border-radius:8px;border:1px solid var(--border-strong);display:flex;align-items:center;font:500 13px 'IBM Plex Sans';color:var(--fg)}
.fi .ac .yn.y{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.fi .ac .ex{font:10.5px 'IBM Plex Mono';color:var(--fg-muted)}
.dk .fi{grid-template-columns:46px minmax(0,1fr) auto;align-items:center;gap:14px;padding:12px 16px}
.dk .fi .ac{margin:0;justify-content:flex-end}
.fdf{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 6px 4px 14px;border-top:1px solid var(--border)}
.fdf small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.fdf span{min-height:44px;display:flex;align-items:center;padding:0 10px;font:500 13px 'IBM Plex Sans';color:var(--fg)}
.dk .fdf span{min-height:36px}
.fday{padding:9px 14px 0;font:500 9px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-locked)}
.fday+.fi{border-top:0}
.fi+.fday{border-top:1px solid var(--border);margin-top:0}
.fq{padding:14px;display:flex;flex-direction:column;gap:6px}
.fq p{font-size:13px;line-height:1.55;color:var(--fg-body)}
.fq p b{color:var(--fg)}
/* setup: the opt-ins, inline, once */
.su{padding:14px;display:flex;flex-direction:column;gap:4px}
.su h3{margin:0;font:700 17px 'Cinzel',serif}
.su>p{font-size:13px;line-height:1.55;color:var(--fg-muted);margin-bottom:6px}
.ck{display:flex;align-items:flex-start;gap:12px;min-height:44px;padding:8px 0}
.ck+.ck{border-top:1px solid var(--border)}
.box{flex:none;width:20px;height:20px;border-radius:5px;border:1.5px solid var(--border-dashed);background:var(--surface-sunken);display:flex;align-items:center;justify-content:center;margin-top:1px}
.box.on{background:var(--accent);border-color:var(--accent)}
.box.on::after{content:'';width:9px;height:5px;border-left:2px solid var(--bg);border-bottom:2px solid var(--bg);transform:rotate(-45deg) translate(1px,-1px)}
.ck .ct{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.ck .ct b{font:500 14px 'IBM Plex Sans';color:var(--fg)}
.ck .ct span{font-size:12.5px;line-height:1.45;color:var(--fg-muted)}
.su .sv{display:flex;gap:8px;margin-top:8px}
.su .sv>*{flex:1}
.dk .su .sv>*{flex:none}
.su .foot{font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-faint);margin-top:8px}
.dk .su .cks{display:grid;grid-template-columns:1fr 1fr;column-gap:24px}
.dk .su .cks .ck:nth-child(2){border-top:0}

.later{margin-top:16px}
.dk .fi .later{margin-top:0}
/* lead story (direction B) */
.ld{position:relative;overflow:hidden;border-radius:14px;border:1px solid var(--accent);background:var(--surface-rail);display:flex;gap:16px;padding:16px 16px 16px 14px}
.ld>*:not(.blur){position:relative}
.ld .lc{flex:none;width:96px;height:134px;transform:rotate(-4deg);margin:6px 2px 0 4px;position:relative}
.ld .lc .cardimg{width:96px;height:134px;border-radius:5px;box-shadow:0 10px 24px rgba(0,0,0,.6)}
.ld .lc .fa{position:absolute;right:-10px;bottom:-8px;width:36px;height:36px;border-radius:10px;overflow:hidden;border:2px solid var(--surface-rail);transform:rotate(4deg)}
.ld .lc .fa img{width:100%;height:100%;object-fit:cover;display:block}
.ld .lt{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.ld .lk{display:flex;align-items:center;gap:8px;font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--accent-text)}
.ld .lk small{margin-left:auto;letter-spacing:0;text-transform:none;font-size:10.5px;color:var(--fg-muted)}
.ld h3{margin:0;font:700 18px/1.25 'Cinzel',serif}
.ld p{font-size:13px;line-height:1.5;color:var(--fg-body)}
.ld .la{display:flex;gap:8px;margin-top:6px;flex-wrap:wrap}
.ld .la .ba{height:40px;font-size:13.5px;padding:0 16px}
.dk .ld{padding:20px 24px 20px 26px;gap:28px;align-items:center}
.dk .ld .lc{width:120px;height:168px;margin:0}
.dk .ld .lc .cardimg{width:120px;height:168px;border-radius:6px}
.dk .ld h3{font-size:22px}
.dk .ld p{font-size:13.5px;max-width:640px}
.dk .ld .la .ba{height:36px;font-size:13px}

/* ---------------- place strip (collection-place-head), shared by Commanders and a friend's page ---------------- */
.ps{display:flex;height:48px;align-items:stretch;gap:2px;padding:0 4px 0 8px;border-bottom:1px solid var(--border);flex:none}
.ps span{display:flex;align-items:center;padding:0 11px;font:500 14px 'IBM Plex Sans';color:var(--fg-muted);white-space:nowrap;gap:6px}
.ps span em{font:normal 11px 'IBM Plex Mono';color:var(--fg-faint)}
.ps span.on{font-weight:600;color:var(--fg);box-shadow:inset 0 -2px 0 var(--accent)}
.ps span.on em{color:var(--accent)}
.dk .ps{height:40px;gap:4px;padding:0 24px;margin-top:14px}
.dk .ps span{padding:0 10px}
.pth{padding:28px 34px 0}
.pth h1{margin:0;font:700 30px/45px 'Cinzel',serif}
.pth p{margin-top:4px;font:12px/18px 'IBM Plex Mono';color:var(--fg-faint)}

/* commanders pages (shipped) */
.cph{padding:12px 16px 0}
.cph h1{margin:0;font:700 22px 'Cinzel',serif}
.cph p{margin-top:4px;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.dk .cph{padding:16px 34px 0;display:flex;align-items:baseline;gap:12px}
.dk .cph h1{font-size:20px}
.rk{display:flex;gap:8px;padding:12px 16px 0}
.rk .sr{flex:1;height:44px;border-radius:10px;border:1px solid var(--border-strong);display:flex;align-items:center;gap:10px;padding:0 12px;color:var(--fg-muted);font-size:15px}
.rk .sq{width:44px;height:44px;border-radius:10px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;color:var(--fg-body)}
.rk .fl{height:44px;border-radius:10px;border:1px solid var(--border-strong);display:flex;align-items:center;padding:0 14px;font-size:13.5px;color:var(--fg)}
.dk .rk{padding:14px 34px 0}
.dk .rk .sr{flex:none;width:360px;height:38px}
.dk .rk .sq,.dk .rk .fl{height:38px}
.rl{display:flex;justify-content:space-between;padding:10px 16px 0;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.rl u{text-underline-offset:3px}
.rl2{padding:8px 16px 0;font:10.5px 'IBM Plex Mono';color:var(--fg-body)}
.dk .rl,.dk .rl2{padding-left:34px;padding-right:34px}
.hc{margin:12px 14px 0;border-radius:14px;border:1px solid var(--border);background:var(--surface-inset);overflow:hidden}
.hc .ha{position:relative;height:250px}
.hc .ha img{width:100%;height:100%;object-fit:cover;display:block}
.hc .ha::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(20,17,14,.92))}
.hc .hn{position:absolute;left:14px;right:14px;bottom:12px;z-index:2;display:flex;align-items:flex-end;gap:10px}
.hc .hn b{flex:1;font:700 16px 'Cinzel',serif;display:flex;gap:8px;align-items:center}
.hc .hn b em{font:600 15px 'IBM Plex Mono';font-style:normal;color:var(--accent)}
.hc .sc{flex:none;border:1px solid var(--border-strong);background:rgba(20,17,14,.8);border-radius:8px;padding:5px 9px;text-align:center;font:600 20px/1 'IBM Plex Mono'}
.hc .sc small{display:block;font:400 8.5px 'IBM Plex Mono';color:var(--fg-faint);margin-top:3px}
.hc .hd{padding:12px 14px 14px;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.hc .hd .ft{margin-top:8px;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.hc .hd .bar{margin-top:8px;height:4px;border-radius:9px;background:var(--elevated);overflow:hidden}
.hc .hd .bar i{display:block;height:100%;background:var(--accent)}
.dk .hcs{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:14px 34px 30px}
.dk .hc{margin:0}
.pp{display:inline-flex;gap:3px;margin-left:2px}.pp i{width:9px;height:9px;border-radius:2px;display:block}
/* help me choose (shipped intake, head moved into the strip) */
.hmc{padding:12px 16px 20px;display:flex;flex-direction:column;gap:18px}
.hmc .sub{font-size:13.5px;line-height:1.55;color:var(--fg-muted)}
.hmc .q{display:flex;flex-direction:column;gap:8px}
.hmc .q b{font:600 14px 'IBM Plex Sans'}
.hmc .q small{font-size:12px;color:var(--fg-muted)}
.hmc .pips{display:flex;gap:8px}
.hmc .pips span{width:44px;height:44px;border-radius:10px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center}
.hmc .pips span i{width:16px;height:16px;border-radius:50%;display:block}
.hmc .pips span.on{border-color:var(--accent);background:rgba(207,135,69,.1)}
.hmc .fld{height:44px;border-radius:10px;border:1px solid var(--border-strong);display:flex;align-items:center;padding:0 12px;color:var(--fg-faint);font-size:14px}
.hmc .ta{height:96px;align-items:flex-start;padding-top:12px}
.hmc .sg{display:flex;border:1px solid var(--border-strong);border-radius:12px;padding:4px;gap:4px}
.hmc .sg span{flex:1;height:38px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13.5px;color:var(--fg-muted)}
.hmc .sg span.on{background:var(--elevated);color:var(--fg);font-weight:600}
.dk .hmc{padding:18px 34px 30px;max-width:720px}

/* ---------------- Friends (shipped + NEW waiting section) ---------------- */
.fp{padding:22px 16px 40px;display:flex;flex-direction:column}
.dk .fp{width:720px;margin:0 auto;padding:36px 0 50px}
.fhd{display:flex;flex-direction:column;gap:14px}
.fhd .who{display:flex;gap:14px;align-items:center}
.fhd h1{margin:0;font:700 22px/1.15 'Cinzel',serif}
.fhd .nl{margin-top:2px;font-size:13.5px;color:var(--fg-muted)}
.fhd .nl b{color:var(--fg)}
.fhd .nl a,.fhd .nl u{color:var(--accent-text);text-decoration:none;font-weight:500}
.fhd .ri{display:flex;flex-direction:column;gap:8px}
.fhd .ba{height:48px;font-size:15px}
.fhd .il{font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.dk .fhd{flex-direction:row;justify-content:space-between;align-items:flex-start}
.dk .fhd h1{font-size:28px}
.dk .fhd .ri{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.dk .fhd .ba{height:44px;font-size:14px}
.sec{margin-top:26px}
.dk .sec{margin-top:34px}
.sech{display:flex;align-items:center;justify-content:space-between;min-height:44px;border-bottom:1px solid var(--border);font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.dk .sech{min-height:32px;padding-bottom:8px}
.sech .r{text-transform:none;letter-spacing:0;font:500 13.5px 'IBM Plex Sans';color:var(--accent-text)}
.sech.w{color:var(--accent-text)}
.sec .fd{margin-top:12px}
.sec .tc{margin-top:12px}
.frow{display:flex;align-items:center;gap:12px;height:60px;border-bottom:1px solid var(--border)}
.frow .nm{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.frow .nm b{font:500 15px 'IBM Plex Sans'}
.frow .nm span{font-size:12px;color:var(--fg-muted)}
.frow .sn{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.frow .ch{font-size:18px;color:var(--fg-muted);padding:0 4px}
.frow .dots{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);letter-spacing:1px}
.pod{margin-top:12px;position:relative;overflow:hidden;border-radius:14px;border:1px solid var(--border-strong);background:var(--surface-rail);padding:14px 14px 12px;display:flex;flex-direction:column;gap:12px}
.pod>*:not(.blur){position:relative}
.pod .ph2{display:flex;align-items:baseline;gap:8px}
.pod .ph2 b{font:600 15px 'IBM Plex Sans'}
.pod .ph2 small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.pod .ph2 i{margin-left:auto;font-style:normal;color:var(--fg-muted)}
.pod .seats{display:flex;gap:10px}
.pod .seat{display:flex;flex-direction:column;align-items:center;gap:5px;font-size:12px;color:var(--fg-body)}
.pod .seat img{width:84px;height:62px;border-radius:10px;object-fit:cover;display:block;border:1px solid var(--border-strong)}
.pod .shr{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--fg-body);min-height:32px}
/* a friend's page */
.fpg{padding:18px 14px 30px}
.dk .fpg{padding:28px 34px 34px}
.fpg .bk{font-size:14px;color:var(--fg-muted)}
.fpg .who{margin-top:14px;display:flex;align-items:center;gap:16px}
.fpg .who h1{margin:0;font:700 24px 'Cinzel',serif}
.dk .fpg .who h1{font-size:28px}
.fpg .who p{font-size:13px;color:var(--fg-muted);margin-top:3px}
.fpg .who .dots{margin-left:auto;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted)}
.fpg .ps{margin:18px -14px 0;padding-left:6px}
.dk .fpg .ps{margin:22px 0 0;padding:0}
.fpg .gl{margin-top:12px;font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 8px;margin-top:12px}
.dk .tiles{grid-template-columns:repeat(6,minmax(0,1fr));gap:20px}
.tile{display:flex;flex-direction:column;gap:6px}
.tile .ti{position:relative;border-radius:4.5%/3.2%;overflow:hidden;border:1px solid var(--border)}
.tile .ti img{width:100%;aspect-ratio:63/88;display:block;object-fit:cover}
.tile .tcap{display:flex;align-items:center;gap:6px;font:10.5px 'IBM Plex Mono';color:var(--fg-muted)}
.tile .tcap b{font:600 12.5px 'IBM Plex Sans';color:var(--fg);flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.tile .tcap .wl{color:var(--accent-text);display:flex}
.tile .tcap2{font:10.5px 'IBM Plex Mono';color:var(--fg-muted);display:flex;flex-direction:column;gap:3px}
.tile .tcap2 .wl{color:var(--accent-text);display:inline-flex;align-items:center;gap:4px}
.dtile{border-radius:12px;border:1px solid var(--border);background:var(--surface-inset);overflow:hidden}
.dtile .da{height:120px;position:relative}
.dtile .da img{width:100%;height:100%;object-fit:cover;display:block}
.dtile .da::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(20,17,14,.9))}
.dtile .da b{position:absolute;left:12px;right:12px;bottom:8px;z-index:2;font:700 14px 'Cinzel',serif}
.dtile .dd{padding:10px 12px 12px;display:flex;flex-direction:column;gap:8px}
.dtile .dd .c{font:10.5px 'IBM Plex Mono';color:var(--fg-body)}
.dtile .dd .l{display:flex;align-items:center;gap:10px}
.dtile .dd .l .bar{flex:1;height:3px;border-radius:2px;background:var(--border-strong);overflow:hidden}
.dtile .dd .l .bar i{display:block;height:100%}
.dtile .dd .l small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.dtile .pill{height:19px;display:inline-flex;align-items:center;padding:0 7px;border-radius:5px;font:10px 'IBM Plex Mono';align-self:flex-start}
.dtiles{display:grid;grid-template-columns:1fr;gap:12px;margin-top:12px}
.dk .dtiles{grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}

/* ---------------- Settings (NEW) ---------------- */
.stp{padding:22px 16px 40px;display:flex;flex-direction:column}
.dk .stp{width:720px;margin:0 auto;padding:36px 0 50px}
.stp h1{margin:0;font:700 22px 'Cinzel',serif}
.dk .stp h1{font-size:28px}
.stp .sub{margin-top:4px;font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.stp .sec p.ex{margin-top:10px;font-size:13px;line-height:1.55;color:var(--fg-muted)}
.stp .sec p.ex b{color:var(--fg)}
.stp .cks{margin-top:4px}
.stp .foot{margin-top:10px;font:10.5px/1.6 'IBM Plex Mono';color:var(--fg-faint)}
.thr{margin-top:12px;display:flex;align-items:center;flex-wrap:wrap;gap:10px;font-size:14px;color:var(--fg);line-height:1.5}
.stepper{display:inline-flex;align-items:center;border:1px solid var(--border-strong);border-radius:10px;overflow:hidden;height:44px}
.dk .stepper{height:36px}
.stepper span{width:44px;height:100%;display:flex;align-items:center;justify-content:center;font:400 18px 'IBM Plex Sans';color:var(--fg-body)}
.stepper b{min-width:40px;height:100%;display:flex;align-items:center;justify-content:center;font:600 15px 'IBM Plex Mono';border-left:1px solid var(--border-strong);border-right:1px solid var(--border-strong)}
.who2{margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:44px;padding:0 4px 0 14px;border-radius:10px;border:1px solid var(--border);background:var(--surface-rail);font-size:13px;color:var(--fg-body)}
.who2 b{color:var(--fg);font-weight:600}
.who2 span.lnk{display:flex;align-items:center;min-height:44px;padding:0 10px}
.kpf{margin-top:12px;height:44px;border-radius:10px;border:1px solid var(--border-strong);display:flex;align-items:center;gap:10px;padding:0 12px;color:var(--fg-faint);font-size:14.5px}
.dk .kpf{height:40px}
.crows{margin-top:10px;display:flex;flex-direction:column;gap:6px}
.crow{display:grid;grid-template-columns:38px minmax(0,1fr) 76px auto 26px;align-items:center;gap:10px;padding:10px 0 10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface)}
.dk .crow{grid-template-columns:52px minmax(0,1fr) 90px 150px 92px 26px;gap:16px;padding:12px 0 12px 18px}
.crow .q{font:500 13px 'IBM Plex Mono';color:var(--accent-text)}
.dk .crow .q{font-size:14px}
.crow .nm{min-width:0;display:flex;flex-direction:column;gap:2px}
.crow .nm b{font:600 14px 'IBM Plex Sans';overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.dk .crow .nm b{font-size:15px}
.crow .nm span{font-size:11.5px;color:var(--fg-faint);overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.dk .crow .nm span{display:none}
.crow .cp{display:flex;justify-content:flex-end;gap:3px}
.crow .tl{display:none;font-size:12.5px;color:var(--fg-muted);overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.dk .crow .tl{display:block}
.crow .st{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);display:flex;align-items:center;gap:8px}
.crow .st i{width:7px;height:7px;border-radius:50%;display:none}
.dk .crow .st i{display:block}
.crow .x{display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:13px;height:100%}
.cpip{width:15px;height:15px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:600 9px 'IBM Plex Mono';color:#14110E}

/* ---------------- account menu (shipped, Settings row NEW) ---------------- */
.scrim{position:absolute;inset:0;background:rgba(20,17,14,.72);z-index:30}
.ams{position:absolute;left:0;right:0;bottom:0;z-index:31;background:var(--surface);border-top:1px solid var(--border-strong);border-radius:20px 20px 0 0;padding:20px 20px 26px}
.ams .gr{width:40px;height:4px;border-radius:2px;background:var(--border-strong);margin:0 auto 20px}
.idb{display:flex;align-items:center;gap:14px;padding-bottom:18px;border-bottom:1px solid var(--border)}
.idb .a{width:48px;height:48px;border-radius:14px;border:1px solid var(--accent);color:var(--accent);display:flex;align-items:center;justify-content:center;font:500 15px 'IBM Plex Sans'}
.idb b{display:block;font:600 16px 'IBM Plex Sans'}
.idb small{display:block;font:12px 'IBM Plex Mono';color:var(--fg-faint);margin-top:2px}
.idb .cr{margin-top:8px;display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--accent-shadow);background:rgba(207,135,69,.1);font-size:12.5px;color:var(--fg)}
.idb .cr i{width:7px;height:7px;background:var(--accent);transform:rotate(45deg);display:block}
.thl{margin:16px 0 8px;font:500 11px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.thg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.thg span{display:flex;align-items:center;gap:10px;height:56px;padding:0 10px;border-radius:10px;border:1px solid transparent}
.thg span.on{border-color:var(--accent);background:var(--surface-raised)}
.thg span i{width:34px;height:24px;border-radius:5px;border:1px solid var(--border-strong);background:#0f0d0b;flex:none;position:relative}
.thg span i::after{content:'';position:absolute;left:5px;bottom:4px;width:10px;height:2px;border-radius:2px;background:var(--c)}
.thg span b{display:block;font:500 12.5px 'IBM Plex Sans'}
.thg span small{display:block;font:9px 'IBM Plex Mono';color:var(--fg-muted)}
.mis{margin-top:14px;padding-top:10px;border-top:1px solid var(--border);display:flex;flex-direction:column}
.mis span{display:flex;align-items:center;gap:14px;min-height:48px;font-size:15px;color:var(--fg);border-bottom:1px solid var(--border)}
.mis span:last-child{border-bottom:0}
.mis span i{width:6px;height:6px;background:var(--accent);transform:rotate(45deg);flex:none}
.mis span.dg i{background:var(--danger)}
.mis span.gone{color:var(--fg-locked);text-decoration:line-through;text-decoration-color:var(--danger)}
.amp{position:absolute;left:70px;bottom:14px;z-index:31;width:300px;padding:8px;background:var(--surface-raised);border:1px solid var(--border-strong);border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.6)}
.amp .idb{padding:12px 12px 14px;gap:12px}
.amp .idb .a{width:44px;height:44px;border-radius:12px;font-size:14px}
.amp .idb b{font-size:14px}
.amp .idb small{font-size:11px;color:var(--fg-muted)}
.amp .thl{margin:12px 4px 6px}
.amp .thg{grid-template-columns:1fr 1fr 1fr;gap:6px}
.amp .thg span{flex-direction:column;align-items:flex-start;gap:4px;height:auto;padding:6px}
.amp .thg span b{font-size:10.5px}
.amp .thg span small{font-size:8.5px}
.amp .mis{margin-top:12px}
.amp .mis span{min-height:36px;font-size:13px;padding:0 10px;border-bottom:0;border-radius:8px}
.amp .mis span.hv{background:var(--elevated)}
"""

# ---------------------------------------------------------------- fixtures
FRIENDS = [("Colin", "face-sai.jpg", "Sai, Master Thopterist", "since Oct 2"),
           ("Peter", "face-captain-america.jpg", "Captain America, Team Leader", "since Oct 9"),
           ("Max", "face-ghalta.jpg", "Ghalta, Primal Hunger", "since Oct 14"),
           ("Chris", "face-giada.jpg", "Giada, Font of Hope", "since yesterday")]
ME = "face-rootha.jpg"


def face(key, size=40, radius=10, initials=""):
    inner = f'<img src="{img(key)}" alt="">' if key else initials
    return f'<span class="face" style="width:{size}px;height:{size}px;border-radius:{radius}px">{inner}</span>'


def card(key, w=46, h=64, cls="cardimg", alt=""):
    return f'<img class="{cls}" src="{img(key)}" alt="{alt}" style="width:{w}px;height:{h}px">'


LEMNISCATE = ('<svg width="26" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">'
              '<path d="M13 7c-2.6-3.4-4.6-5-7-5a5 5 0 0 0 0 10c2.4 0 4.4-1.6 7-5Zm0 0c2.6 3.4 4.6 5 7 5a5 5 0 0 0 0-10c-2.4 0-4.4 1.6-7 5Z"/></svg>')
BOOKMARK = ('<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" '
            'stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/></svg>')
REFRESH = ico('<path d="M16.5 10a6.5 6.5 0 1 1-2.1-4.8"/><path d="M16.8 3.4v3.2h-3.2"/>', 14, 1.6)

# The six kinds, in Settings' order. key: (label, Settings line)
KINDS = [("set", "New sets", "When a set comes out, and how many of its cards fit decks you’ve built."),
         ("precon", "New precons", "A new Commander precon, with how many of its cards you own."),
         ("price", "Price drops on your wishlist", "A card you want gets cheaper."),
         ("match", "Trade matches", "A friend has a spare of a card on your wishlist."),
         ("ask", "Friends asking for your spares", "A friend asks for a card you have spare."),
         ("combo", "Combos you can make", "You now own both halves of a two-card combo.")]

# Feed items: kind, visual, kicker, title, detail, stamp, action html, unseen
def ITEMS():
    return {
        "ask": dict(kind="ask", vis=("card", "lathliss.jpg", "face-captain-america.jpg"), kick="Spare request",
                    title="Peter asks for your spare Lathliss, Dragon Queen",
                    detail="You have 2 spare. Peter wants 1 for Dragons of the Tarkir.",
                    stamp="2h ago", act='<span class="later" style="display:flex;gap:8px;align-items:center"><span class="yn y">Yes</span><span class="yn">No</span></span><span class="ex">13 days left</span>', unseen=True, w=True),
        "match": dict(kind="match", vis=("card", "ghalta.jpg", "face-sai.jpg"), kick="Trade match",
                      title="Colin has a spare Ghalta, Primal Hunger",
                      detail="It’s on your wishlist. Colin shares spares with Thursday pod.",
                      stamp="5h ago", act='<span class="lnk">See Colin’s spares ›</span>', unseen=True),
        "price": dict(kind="price", vis=("card", "sai.jpg", None), kick="Price drop",
                      title="Sai, Master Thopterist is cheaper",
                      detail='<span class="mo"><s>$6.40</s> <span class="dn">↓ $3.10</span></span> at the cheapest printing.',
                      stamp="yesterday", act='<span class="lnk">Buy at Mana Pool&nbsp;↗</span>', unseen=True),
        "combo": dict(kind="combo", vis=("combo",), kick="Combo",
                      title="Thassa’s Oracle + Demonic Consultation",
                      detail="Your last upload added Demonic Consultation. Neither is in a deck yet.",
                      stamp="2d ago", act='<span class="lnk">See the combo ›</span>', unseen=False),
        "precon": dict(kind="precon", vis=("card", "ashling.jpg", None), kick="New precon",
                       title="Ashling, the Limitless precon is out",
                       detail="You own 41 of its 100 cards.",
                       stamp="3d ago", act='<span class="lnk">Open in Precons ›</span>', unseen=False),
        "set": dict(kind="set", vis=("card", "quintorius.jpg", None), kick="New set",
                    title="Secrets of Strixhaven is out",
                    detail="288 cards. 17 of them would go into decks you’ve built.",
                    stamp="4d ago", act='<span class="lnk">See the set ›</span>', unseen=False),
        "match2": dict(kind="match", vis=("card", "jace.jpg", "face-ghalta.jpg"), kick="Trade match",
                       title="Max has a spare Jace, Multiverse Architect",
                       detail="It’s on your wishlist. Max shares spares with Cube night.",
                       stamp="6h ago", act='<span class="lnk">See Max’s spares ›</span>', unseen=True),
        "ask2": dict(kind="ask", vis=("card", "miku.jpg", "face-giada.jpg"), kick="Spare request",
                     title="Chris asks for your spare Miku, Song of the People",
                     detail="You have 1 spare. Chris wants 1.",
                     stamp="1h ago", act='<span class="later" style="display:flex;gap:8px;align-items:center"><span class="yn y">Yes</span><span class="yn">No</span></span><span class="ex">14 days left</span>', unseen=True, w=True),
        "price2": dict(kind="price", vis=("card", "zada.jpg", None), kick="Price drop",
                       title="Zada, Hedron Grinder is cheaper",
                       detail='<span class="mo"><s>$2.80</s> <span class="dn">↓ $1.45</span></span> at the cheapest printing.',
                       stamp="2d ago", act='<span class="lnk">Buy at Mana Pool&nbsp;↗</span>', unseen=False),
    }


def vis(v):
    if v[0] == "combo":
        return f'<span class="combo" aria-hidden="true">{LEMNISCATE}</span>'
    fa = f'<span class="fa"><img src="{img(v[2])}" alt=""></span>' if v[2] else ""
    return f'<span class="vis">{card(v[1])}{fa}</span>'


def fitem(it, seen=False):
    un = '<span class="un"></span>' if it.get("unseen") and not seen else ""
    kd = f'<span class="kd{" w" if it.get("w") else ""}">{it["kick"]}</span>'
    return (f'<div class="fi{" seen" if seen else ""}">{vis(it["vis"])}<div class="bd"><div class="kr">{un}{kd}<small>{it["stamp"]}</small></div>'
            f'<div class="tt">{it["title"]}</div><div class="dt">{it["detail"]}</div><div class="ac">{it["act"]}</div></div></div>')


def fitem_d(it, seen=False):
    """Desktop: the action moves to a third column."""
    un = '<span class="un"></span>' if it.get("unseen") and not seen else ""
    kd = f'<span class="kd{" w" if it.get("w") else ""}">{it["kick"]}</span>'
    return (f'<div class="fi{" seen" if seen else ""}">{vis(it["vis"])}<div class="bd"><div class="kr">{un}{kd}<small>{it["stamp"]}</small></div>'
            f'<div class="tt">{it["title"]}</div><div class="dt">{it["detail"]}</div></div><div class="ac">{it["act"]}</div></div>')


def feed(keys, desk=False, more=None, head_n=None, days=None, seen=()):
    I = ITEMS()
    f = fitem_d if desk else fitem
    rows = []
    for k in keys:
        if days and k in days:
            rows.append(f'<div class="fday">{days[k]}</div>')
        rows.append(f(I[k], seen=k in seen))
    foot = f'<div class="fdf"><small>{more[0]}</small><span>{more[1]}</span></div>' if more else ""
    n = head_n if head_n is not None else sum(1 for k in keys if I[k].get("unseen"))
    head = (f'<h2 class="sh">What’s new{f" <em>· {n} new</em>" if n else ""}<span class="r">Choose what shows <i>›</i></span></h2>')
    return f'<section class="blk new">{head}<div class="fd">{"".join(rows)}{foot}</div></section>'


def feed_quiet(desk=False):
    return ('<section class="blk new"><h2 class="sh">What’s new<span class="r">Choose what shows <i>›</i></span></h2>'
            '<div class="fd"><div class="fq"><p><b>Nothing new since Monday.</b> You hear about trade matches, spare requests and price drops on your wishlist.</p></div></div></section>')


def feed_setup(desk=False):
    rows = "".join(f'<div class="ck"><span class="box"></span><span class="ct"><b>{l}</b><span>{d}</span></span></div>' for _, l, d in KINDS)
    return ('<section class="blk new"><h2 class="sh">What’s new</h2><div class="fd"><div class="su">'
            '<h3>Choose what shows here</h3><p>Pick what you want to hear about. Nothing shows until you do, and you can change it in Settings.</p>'
            f'<div class="cks">{rows}</div><div class="sv"><span class="bp">Show these</span></div>'
            '<p class="foot">In the app only. No email, ever.</p></div></div></section>')


def lead(it_key="match", desk=False):
    it = ITEMS()[it_key]
    v = it["vis"]
    fa = f'<span class="fa"><img src="{img(v[2])}" alt=""></span>' if v[2] else ""
    w, h = (120, 168) if desk else (96, 134)
    art = "art-ghalta.jpg" if it_key == "match" else "art-lathliss.jpg"
    act = {"match": '<span class="ba">See Colin’s spares</span>',
           "ask": '<span class="later" style="display:flex;gap:8px"><span class="ba">Yes</span><span class="bg" style="height:40px">No</span></span>'}[it_key]
    return (f'<section class="ld new"><div class="blur"><img src="{img(art)}" alt=""></div>'
            f'<span class="lc">{card(v[1], w, h)}{fa}</span><div class="lt"><span class="lk">{it["kick"]}<small>{it["stamp"]}</small></span>'
            f'<h3>{it["title"]}</h3><p>{it["detail"]}</p><div class="la">{act}</div></div></section>')


# ---------------------------------------------------------------- Home, shipped blocks
def home_head(desk=False, kicker="4,492 cards · read last week"):
    b = f'<div class="bt"><span class="bp">New deck</span><span class="bg">{REFRESH}Update collection</span></div>'
    return f'<header class="hh"><div class="tx"><p class="kk">{kicker}</p><h1>Welcome back</h1></div>{b}</header>'


def wstrip(desk=False):
    return ('<div class="ws"><span class="wsm"><i><b>15</b></i></span><span class="wst"><b>15 welcome credits</b> to try the tools, until Nov 20. '
            '<u>Where credits work</u></span><span class="wsx">✕</span></div>')


DECKS = [("resume-kilo.png", "HD Tune - Counter Intelligence", "committed 2d ago", "To buy", "--accent", "18%", False, "Kilo, Apogee Mind", "99 / 99 · 14 cards", "var(--accent)", 100),
         ("resume-omnath.png", "HD - Omnath", "edited yesterday", "Draft", "--fg-body", "14%", True, "Omnath, Locus of Creation", "99 / 99 · 67 cards", "var(--fg-body)", 100),
         ("resume-wizards.png", "HD - Wizards", "edited 3d ago", "Complete", "--success", "18%", False, "Baral, Chief of Compliance", "99 / 99", "var(--success)", 100),
         ("resume-aang.png", "HD - Avatar Aang", "played 4d ago", "Complete", "--success", "18%", False, "Avatar Aang // Aang, Master of Elements", "99 / 99", "var(--success)", 100)]


def rrow(d):
    art, name, stamp, st, tok, a, dashed, cmd, count, bar, pct = d
    pill = (f'<span class="pill" style="color:var({tok});background:color-mix(in srgb,var({tok}) {a},var(--bg));'
            f'border:1px {"dashed" if dashed else "solid"} color-mix(in srgb,var({tok}) 45%,transparent)">{st}</span>')
    return (f'<div class="rr"><span class="pa"><img src="{img(art)}" alt=""></span><span class="rt">'
            f'<span class="l1"><b>{name}</b><small>{stamp}</small></span><span class="l2">{pill}<span class="c">{cmd}</span></span>'
            f'<span class="l3"><span class="bar"><i style="width:{pct}%;background:{bar}"></i></span><small>{count}</small></span></span></div>')


def resume(n=4, total=23):
    rows = "".join(rrow(d) for d in DECKS[:n])
    return (f'<section class="blk"><h2 class="sh" style="margin-top:6px">Pick up where you left off <em>last touched</em></h2>'
            f'<div class="rrs">{rows}</div><div class="more"><small>{total - n} more decks</small><span class="bg">All {total} decks</span></div></section>')


def commitments():
    return ('<section class="blk"><h2 class="sh" style="margin-top:4px">Commitments</h2><div class="cm">'
            '<div class="r"><span>Cards in use</span><span style="color:var(--accent-text)">1,632 of 4,492</span></div>'
            '<div class="r"><span>Spoken for twice</span><span style="color:var(--danger)">3 cards</span></div>'
            '<div class="r"><span>To buy, all decks</span><span style="color:var(--fg)">285 · $985.14</span></div>'
            '<div class="bb"><span>Review commitments</span><span>Shop all decks</span></div></div></section>')


def friends_home(table=False):
    lis = "".join(f'<li>{face(f, 40, 10)}<small>{n}</small></li>' for n, f, _, _ in FRIENDS)
    lis += '<li><span class="es"></span></li>'
    tc = table_card() if table else ""
    return (f'<section class="blk fsx"><h2 class="sh">Friends <span style="letter-spacing:.08em">· 4</span><span class="r">All friends <i>›</i></span></h2>'
            f'{tc}<ul>{lis}</ul><span class="ad">Add a friend</span></section>')


def table_card():
    seats = "".join(face(f, 30, 8) for _, f, _, _ in FRIENDS[:3]) + face(ME, 30, 8)
    return (f'<div class="tc"><div class="blur"><img src="{img("art-ghalta.jpg")}" alt=""><img src="{img("art-sai.jpg")}" alt=""></div>'
            f'<span class="k">Tonight’s table</span><h3>Thursday pod</h3><div class="fc">{seats}</div>'
            '<p>Colin seated you with <b>HD - Wizards</b>. 4 seated, open until 11 PM.</p><span class="ba">Open the table</span></div>')


# ---------------------------------------------------------------- first run (shipped checklist + one NEW row)
def first_run(desk=False, news_row=True):
    ways = [("Precons I own", ""), ("Import a deck", ""), ("Add cards by hand", "")]
    wr = "".join(f'<span class="wr">{t}<i>›</i></span>' for t, _ in ways)
    s1 = ('<div class="s1"><span class="fan9"><span class="a"></span><span class="b"></span><span class="c">99</span></span>'
          '<div class="s1c"><span class="t">Add your collection</span><p>Drop a CSV export from Moxfield, Archidekt, Deckbox or ManaBox.</p>'
          '<div class="s1b"><span class="bp">Upload a CSV</span><span class="bg">Paste a list</span></div>'
          f'<div class="ways"><span class="wk">No file? Start another way</span>{wr}</div></div></div>')
    def lk(n, t, r):
        return f'<div class="lst"><span class="n">{n}</span><span class="tx"><b>{t}</b><span>{r}</span></span><span style="color:var(--fg-locked)">{LOCK}</span></div>'
    fr = ('<div class="frw"><span class="sl">+</span><span class="tx"><b>Add your friends</b>'
          '<span>Any time, cards or not. A friend joins from a link you send.</span></span><span class="ch">›</span></div>')
    nw = ('<div class="frw new"><span class="sl" style="border-style:solid;border-color:var(--accent-shadow)"><span style="width:6px;height:6px;background:var(--accent);transform:rotate(45deg)"></span></span>'
          '<span class="tx"><b>Choose your news</b><span>New sets, price drops, friends’ spares. Nothing shows until you pick.</span></span><span class="ch">›</span></div>') if news_row else ""
    pl = (f'<p class="frpl"><span style="color:var(--fg-locked)">{LOCK}</span>Commanders and Decks open once your cards are in.</p>' if desk else "")
    return (f'<div class="frp"><div class="frhd"><p class="frk">Step 1 of 3</p><h1>Welcome to The 99</h1>{pl}</div>'
            '<div class="abl"><span class="bm"><i></i></span><span><b>What The 99 does:</b> every mark and figure in the app, and where to find it, on one page. <u>Show me</u></span></div>'
            f'<div class="frws">{wstrip()}</div>'
            f'<div class="frst">{s1}{lk(2, "Pick a commander or import a deck", "Opens once your cards are in")}{lk(3, "Build the 99", "Opens once you pick a commander")}{fr}{nw}</div></div>')


# ---------------------------------------------------------------- Home, assembled
def home(state="normal", desk=False, direction="B"):
    """state: normal | busy | quiet | setup. direction: A (feed under resume) or B (lead story on top)."""
    head = home_head(desk)
    strip = wstrip(desk) if state in ("normal", "setup") else ""
    if state == "normal":
        keys_b, keys_a = ["price", "combo", "precon"], ["match", "price", "combo", "precon"]
        fd = feed(keys_b if direction == "B" else keys_a, desk, head_n=None)
        ld = lead("match", desk) if direction == "B" else ""
    elif state == "busy":
        fd = feed(["match2", "price", "match", "combo", "precon"], desk, more=("4 more this week", "Show all 9"),
                  days={"match2": "Today", "combo": "Earlier this week"}, head_n=8)
        ld = lead("ask", desk)
    elif state == "quiet":
        fd, ld = feed_quiet(desk), ""
    else:
        fd, ld = feed_setup(desk), ""
    rs = resume(4 if desk else 2)
    if desk:
        top = "".join(x for x in (strip, ld) if x)
        left = top + rs + fd if direction == "B" else top + rs + fd
        body = (f'<div class="hb"><div class="cl">{left}</div><div class="cr">{commitments()}{friends_home(table=state == "busy")}</div></div>')
        return head + body
    blocks = [strip, ld, rs, fd, friends_home(table=state == "busy"), commitments()] if direction == "B" else [strip, rs, fd, friends_home(), commitments()]
    return head + '<div class="hb">' + "".join(b for b in blocks if b) + "</div>"


# ---------------------------------------------------------------- Commanders: the strip and its three pages
CTABS = [("you", "For you"), ("disc", "Discover"), ("hmc", "Help me choose")]


def place_strip(on, tabs=CTABS, counts=None):
    counts = counts or {}
    return '<nav class="ps new">' + "".join(
        f'<span class="{"on" if k == on else ""}">{l}{f"<em>{counts[k]}</em>" if k in counts else ""}</span>' for k, l in tabs) + "</nav>"


def cmd_place_head():
    return ('<div class="pth"><h1>Commanders</h1><p>228 yours, not yet built · 3,068 to discover</p></div>')


def rack(desk=False):
    return (f'<div class="rk"><span class="sr">{ico(SEARCH_P, 18)}Search</span><span class="sq">⇅</span><span class="fl">Filters</span></div>'
            '<div class="rl"><span>No filters on</span><u>Clear all filters</u></div>')


SEARCH_P = '<circle cx="8.6" cy="8.6" r="5.6"/><path d="M12.8 12.8 17 17"/>'


def hero(art, rank, name, pips, score, desc, ft):
    pp = "".join(f'<i style="background:var(--{c})"></i>' for c in pips)
    return (f'<div class="hc"><div class="ha"><img src="{img(art)}" alt=""><div class="hn"><b><em>{rank}</em>{name}<span class="pp">{pp}</span></b>'
            f'<span class="sc">{score}<small>/100 FIT</small></span></div></div><div class="hd">{desc}<div class="ft">{ft}</div><div class="bar"><i style="width:64%"></i></div></div></div>')


H1 = ("hero-sokka.png", 1, "Sokka, Tenacious Tactician", "ruw", 69, "Sokka decks go wide with allies and reward attacking with all of them at once.", "1,631 of your cards fit · 653 in use")
H2 = ("hero-master.png", 2, "The Master, Transcendent", "bgu", 70, "The Master decks steal and copy what other players build, then win with their own best threats.", "1,753 of your cards fit · 643 in use")
H3 = ("hero-master.png", 1, "The Master, Transcendent", "bgu", 69, "The Master decks steal and copy what other players build, then win with their own best threats.", "2,170 decks tracked · $5.46")


def cmd_page(tab, desk=False):
    if tab == "you":
        sub = '<div class="cph"><h1>For you</h1><p>yours, not yet built</p></div>' if not desk else ''
        body = rack(desk) + '<div class="rl2">228 commanders you own and haven’t built</div>'
        cards = (f'<div class="hcs">{hero(*H1)}{hero(*H2)}</div>' if desk else hero(*H1))
        return sub + body + cards
    if tab == "disc":
        sub = '<div class="cph"><h1>Discover</h1><p>commanders you don’t own</p></div>' if not desk else ''
        body = rack(desk) + '<div class="rl2">3,068 commanders</div>'
        return sub + body + (f'<div class="hcs">{hero(*H3)}{hero(*H1)}</div>' if desk else hero(*H3))
    pips = "".join(f'<span class="{"on" if c in "ub" else ""}"><i style="background:var(--{c})"></i></span>' for c in "wubrg")
    head = '' if desk else '<div class="cph"><h1>Help me choose</h1></div>'
    return (head + f'<div class="hmc"><p class="sub">Say as much or as little as you like. Every answer is optional, and the more you give, the closer the fit.</p>'
            f'<div class="q"><b>Colors</b><div class="pips">{pips}</div><small>Any identity that includes Blue and Black.</small></div>'
            '<div class="q"><b>Theme</b><small>EDHREC’s themes. Pick more than one if you like.</small><span class="fld">Add a theme…</span></div>'
            '<div class="q"><b>Cards for the 99</b><div class="sg"><span class="on">Any cards</span><span>Only cards I own</span></div></div>'
            '<div class="q"><b>Anything else? <span style="font:400 11px IBM Plex Mono;color:var(--fg-faint)">optional</span></b><span class="fld ta">e.g. something scary and a little nasty</span></div>'
            '<span class="bp">Find commanders</span></div>')


# ---------------------------------------------------------------- Friends
def friends_page(desk=False, waiting=True):
    I = ITEMS()
    f = fitem_d if desk else fitem
    head = (f'<div class="fhd"><div class="who">{face(ME, 64 if desk else 56, 14 if desk else 13)}<div><h1>Friends</h1>'
            '<p class="nl">Friends see you as <b>Sam</b> · <u>Change</u></p></div></div>'
            '<div class="ri"><span class="ba">Add a friend</span><span class="il">3 invites left</span></div></div>')
    wt = (f'<section class="sec new"><div class="sech w">Waiting on you · 2</div><div class="fd">{f(I["ask"])}{f(I["match"])}</div></section>' if waiting else "")
    tb = f'<section class="sec">{table_card()}</section>'
    rows = "".join(f'<div class="frow">{face(fc, 36, 10)}<span class="nm"><b>{n}</b><span>{c}</span></span>'
                   f'<span class="sn">{s}</span><span class="ch">›</span><span class="dots">···</span></div>' for n, fc, c, s in FRIENDS)
    fl = f'<section class="sec"><div class="sech">Friends · 4</div>{rows}</section>'
    seats = "".join(f'<span class="seat"><img src="{img(a)}" alt="">{n}</span>' for n, a in [("You", "zimone.png"), ("Colin", "sai.png"), ("Max", "art-ghalta.jpg")])
    pod = (f'<section class="sec"><div class="sech">Pods · 2<span class="r">New pod</span></div>'
           f'<div class="pod"><div class="blur"><img src="{img("art-ghalta.jpg")}" alt=""><img src="{img("sai.png")}" alt=""></div>'
           f'<div class="ph2"><b>Thursday pod</b><small>3 members · yours</small><i>···</i></div><div class="seats">{seats}</div>'
           '<div class="shr"><span class="box on"></span>Share my spares with this pod</div></div></section>')
    return f'<div class="fp">{head}{wt}{tb}{fl}{pod}</div>'


def friend_page(tab="spares", desk=False):
    tabs = [("spares", "Spares"), ("wish", "Wishlist"), ("decks", "Decks")]
    head = (f'<div class="fpg"><span class="bk">‹ Friends</span><div class="who">{face("face-sai.jpg", 64 if desk else 56, 14 if desk else 13)}'
            '<div><h1>Colin</h1><p>Friend since Oct 2</p></div><span class="dots">···</span></div>'
            + place_strip(tab, tabs, {"spares": 6, "wish": 12, "decks": 4}))
    if tab == "spares":
        cards = [("ghalta.jpg", "Ghalta, Primal Hunger", 1, True), ("jace.jpg", "Jace, Multiverse Architect", 2, True), ("dina.jpg", "Dina, Essence Brewer", 1, False),
                 ("giada.jpg", "Giada, Font of Hope", 3, False), ("killian.jpg", "Killian, Decisive Mentor", 1, False), ("gisa.jpg", "Ghoulcaller Gisa", 2, False)]
        if not desk:
            cards = cards[:4]
        t = "".join(f'<div class="tile"><span class="ti"><img src="{img(k)}" alt="{n}"></span>'
                    f'<span class="tcap2">{s} spare{"" if s == 1 else "s"}{("<span class=wl>" + BOOKMARK + " on your wishlist</span>") if w else ""}</span></div>'
                    for k, n, s, w in cards)
        body = ('<p class="gl">Shared with Thursday pod. Cards on your wishlist first.</p>'
                f'<div class="tiles">{t}</div>')
    else:
        decks = [("hero-sokka.png", "Ally Rush", "Sokka, Tenacious Tactician", "Complete", "--success", "99 / 99", "var(--success)"),
                 ("art-sai.jpg", "Thopter Factory", "Sai, Master Thopterist", "To buy", "--accent", "99 / 99 · 8 cards", "var(--accent)"),
                 ("art-ghalta.jpg", "Big Dinos", "Ghalta, Primal Hunger", "Building", "--fg-body", "71 / 99", "var(--fg-body)"),
                 ("hero-master.png", "The Master Plan", "The Master, Transcendent", "Complete", "--success", "99 / 99", "var(--success)")]
        if not desk:
            decks = decks[:2]
        t = "".join(f'<div class="dtile"><div class="da"><img src="{img(a)}" alt=""><b>{n}</b></div><div class="dd"><span class="c">{c}</span>'
                    f'<span class="pill" style="color:var({tok});background:color-mix(in srgb,var({tok}) 18%,var(--bg))">{st}</span>'
                    f'<span class="l"><span class="bar"><i style="width:{72 if st == "Building" else 100}%;background:{bar}"></i></span><small>{cnt}</small></span></div></div>'
                    for a, n, c, st, tok, cnt, bar in decks)
        body = ('<p class="gl">View only. Colin’s committed decks and drafts, newest first.</p>'
                f'<div class="dtiles">{t}</div>')
    return head + body + "</div>"


# ---------------------------------------------------------------- Settings
SPARE_ROWS = [("×4", "Lathliss, Dragon Queen", "Legendary Creature — Dragon", ["c4", "r", "r"], "FDC", "#C9AC62"),
              ("×3", "Sol Ring", "Artifact", ["c1"], "C21", "#A59C89"),
              ("×3", "Arcane Signet", "Artifact", ["c2"], "M3C", "#A59C89")]


def cpip(c):
    if c.startswith("c"):
        return f'<span class="cpip" style="background:#C9C1B0">{c[1:]}</span>'
    return f'<span class="cpip" style="background:var(--{c})"></span>'


def crow(q, n, t, cost, st, rar):
    return (f'<div class="crow"><span class="q">{q}</span><span class="nm"><b>{n}</b><span>{t}</span></span>'
            f'<span class="cp">{"".join(cpip(c) for c in cost)}</span><span class="tl">{t}</span>'
            f'<span class="st"><i style="background:{rar}"></i>{st}</span><span class="x">✕</span></div>')


def settings_page(desk=False, n=2):
    ks = "".join(f'<div class="ck"><span class="box{" on" if k in ("price", "match", "ask") else ""}"></span><span class="ct"><b>{l}</b><span>{d}</span></span></div>'
                 for k, l, d in KINDS)
    news = (f'<section class="sec"><div class="sech">What’s new on Home</div><div class="cks">{ks}</div>'
            '<p class="foot">In the app only: a count on Home and the list. Phone notifications come later. No email, ever.</p></section>')
    sp = (f'<section class="sec"><div class="sech">Spares</div>'
          '<p class="ex">A spare is a copy no deck of yours is asking for, committed or draft.</p>'
          f'<div class="thr">Offer a card only when I have <span class="stepper"><span>−</span><b>{n}</b><span>+</span></span> or more spare copies.</div>'
          '<div class="who2"><span>Offered to <b>Thursday pod</b> and <b>Cube night</b>. You choose on each pod.</span><span class="lnk">Friends ›</span></div>'
          '<div class="sech" style="margin-top:22px;border-bottom:0;min-height:0;padding:0">Kept back · 3</div>'
          '<p class="ex" style="margin-top:6px">Never offered, however many spares you have.</p>'
          f'<span class="kpf">{ico(SEARCH_P, 18)}Keep a card back…</span>'
          f'<div class="crows">{"".join(crow(*r) for r in SPARE_ROWS)}</div></section>')
    return (f'<div class="stp new"><h1>Settings</h1><p class="sub">Saved as you change them</p>{news}{sp}</div>')


# ---------------------------------------------------------------- account menu
THEMES = [("Low Sun", "Amonkhet", "#CF8745"), ("Neon Rain", "Kamigawa", "#D9467A"), ("Canopy", "Ixalan", "#8DB24C"),
          ("Oil Haze", "New Phyrexia", "#4FA39A"), ("Witching Hour", "Eldraine", "#9A72C8"), ("First Frost", "Kaldheim", "#6C9BD2")]


def menu_rows(hover=None, show_gone=False):
    rows = [("About The 99", ""), ("Take the tour", "")]
    if show_gone:
        rows.append(("Friends", "gone"))
    rows += [("Settings", "new"), ("Manage account", ""), ("Sign out", "dg")]
    return '<div class="mis">' + "".join(
        f'<span class="{c}{" hv" if hover == l else ""}"><i></i>{l}</span>' for l, c in rows) + "</div>"


def theme_grid():
    return '<div class="thg">' + "".join(f'<span class="{"on" if i == 0 else ""}"><i style="--c:{c}"></i><span><b>{n}</b><small>{s}</small></span></span>'
                                         for i, (n, s, c) in enumerate(THEMES)) + "</div>"


def account_sheet(show_gone=False):
    return ('<div class="scrim"></div><div class="ams"><div class="gr"></div><div class="idb"><span class="a">S</span><span><b>Sam</b>'
            '<small>sam@example.com</small><span class="cr"><i></i>5 free credits ›</span></span></div>'
            f'<div class="thl">Theme</div>{theme_grid()}{menu_rows(show_gone=show_gone)}</div>')


def account_pop(hover="Settings"):
    return ('<div class="amp"><div class="idb"><span class="a">S</span><span><b>Sam</b><small>sam@example.com</small>'
            '<span class="cr"><i></i>5 free credits ›</span></span></div>'
            f'<div class="thl">Theme</div>{theme_grid()}{menu_rows(hover)}</div>')
