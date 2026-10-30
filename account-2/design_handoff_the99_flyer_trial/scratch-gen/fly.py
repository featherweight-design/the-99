"""Flyer trial R1 (account 2, 2026-10-29): the pieces.

Drawn over the shipped pages in Low Sun tokens with the announcements kit (kit, parts, sr, push):
- /join/[token]: src/components/join/join-flow.tsx, newcomer-column.tsx, social/friend-card.tsx (compact card).
- /admin: components/admin/admin-head.tsx (head + tab strip), groups-list.tsx (cards), invite-tree.tsx (rows),
  costs-detail.tsx SectionHead.
- The error screen: shell/error-notice.tsx over ui/empty-state.tsx; About's index: about/pages/about-index.tsx.
- Home under the survey: the shipped About captures (public/about/pages/amonkhet).
- The flyer: design_handoff_the99_brand (crowned 99, THE wordmark, card-fan secondary mark), one ink.
Every new string is a placeholder for /copy-review.
"""
import segno
import kit, parts as P, sr as S, push as PU
from kit import img, ico

kit.CSS += r"""
/* ================= the flyer (letter, one ink) ================= */
.fly{width:816px;height:1056px;flex:none;position:relative;overflow:hidden;--ink:#1B1712;color:var(--ink);background:var(--paper,#E7B54A);box-shadow:0 18px 50px rgba(0,0,0,.55)}
.fly::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.035) 0 2px,transparent 2px 7px);pointer-events:none}
.fly .in{position:absolute;inset:56px 60px;display:flex;flex-direction:column}
.fwm{display:flex;align-items:flex-end;gap:10px}
.fwm .the{font:500 17px 'IBM Plex Mono',monospace;letter-spacing:.42em;padding-bottom:14px}
.fwm .mk{display:flex;flex-direction:column;align-items:center;gap:9px}
.fwm .fcr{display:flex;align-items:center;gap:9px;transform:translateX(-3px)}
.fwm .fcr i{display:block;width:15px;height:15px;background:var(--ink);transform:rotate(45deg)}
.fwm .fcr i:nth-child(2){width:20px;height:20px}
.fwm .nn{font:900 104px/80px 'Cinzel',serif;letter-spacing:0}
.fly .kk{font:500 13px 'IBM Plex Mono',monospace;letter-spacing:.3em;text-transform:uppercase;margin-top:36px}
.fly h1{margin:14px 0 0;font:800 50px/1.08 'Cinzel',serif;letter-spacing:.005em;max-width:660px;text-wrap:balance}
.fly .mid{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;position:relative}
.fan{position:relative;width:520px;height:440px}
.fan .c{position:absolute;left:50%;top:22px;width:262px;height:366px;margin-left:-131px;border:3px solid var(--ink);border-radius:16px;background:var(--paper,#E7B54A)}
.fan .c.l{transform:rotate(-13deg) translate(-96px,26px)}
.fan .c.r{transform:rotate(11deg) translate(94px,22px)}
.fan .c.l::after,.fan .c.r::after{content:'';position:absolute;inset:10px;border:1.5px dashed var(--ink);border-radius:9px;opacity:.55}
.fan .c.f{display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px 18px 16px}
.fan .c.f .ql{font:600 12px 'IBM Plex Mono',monospace;letter-spacing:.32em}
.fan .c.f svg{display:block}
.fan .c.f .dm{display:flex;gap:6px;margin-top:auto}
.fan .c.f .dm i{width:7px;height:7px;background:var(--ink);transform:rotate(45deg)}
.fly .url{display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:6px}
.fly .url small{font:500 12.5px 'IBM Plex Mono',monospace;letter-spacing:.3em;text-transform:uppercase}
.fly .url b{font:600 38px 'IBM Plex Mono',monospace;letter-spacing:.01em}
.fly .url b em{font-style:normal;border-bottom:3px solid var(--ink)}
.fly .sub{margin-top:14px;font:400 20px/1.4 'IBM Plex Sans',sans-serif;max-width:640px}
.fly .fcn{margin-top:12px;font:400 8.5px/1.45 'IBM Plex Sans',sans-serif;opacity:.85}
.fly .ft{display:flex;justify-content:space-between;align-items:flex-end;margin-top:26px;padding-top:14px;border-top:2px solid var(--ink);font:500 12px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase}
.fly .tabs{position:absolute;left:0;right:0;bottom:0;height:200px;display:flex;border-top:2px dashed var(--ink)}
.fly .tabs span{flex:none;width:102px;position:relative;overflow:hidden;border-left:2px dashed var(--ink)}
.fly .tabs span:first-child{border-left:0}
.fly .tabs span b{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-90deg);white-space:nowrap;font:600 14px 'IBM Plex Mono',monospace;display:flex;flex-direction:column;align-items:center;gap:3px}
.fly .tabs span b small{font:500 10px 'IBM Plex Mono';letter-spacing:.2em}
.mini{width:245px;height:317px;overflow:hidden;flex:none;position:relative}
.mini .fly{transform:scale(.3);transform-origin:top left;position:absolute;left:0;top:0;box-shadow:none}
.swl{display:flex;gap:26px;align-items:flex-start}
.swl .fr>.lab{color:var(--fg-muted)}
.pitch{display:flex;flex-direction:column;gap:10px}
.pitch .p{display:flex;gap:12px;align-items:baseline;padding:12px 14px;border:1px solid var(--border-strong);border-radius:10px;background:#15120F}
.pitch .p i{font:600 11px 'IBM Plex Mono';font-style:normal;color:var(--fg-faint);flex:none;width:18px}
.pitch .p b{font:700 19px/1.3 'Cinzel',serif;color:var(--fg)}
.pitch .p.rec{border-color:var(--accent)}
.pitch .p.rec i{color:var(--accent)}
.pitch .p small{display:block;margin-top:5px;font:12.5px/1.5 'IBM Plex Sans';color:var(--fg-muted)}

/* ================= /join ================= */
.jn{flex:1;display:flex;flex-direction:column;align-items:center;padding:44px 24px 24px;text-align:center;
 background:radial-gradient(600px 360px at 50% 18%,color-mix(in oklab,var(--accent) 12%,transparent),transparent 70%),var(--bg)}
.dk .jn{background:radial-gradient(1000px 520px at 50% 8%,color-mix(in oklab,var(--accent) 10%,transparent),transparent 70%),var(--bg);padding-top:72px}
.jcol{width:100%;max-width:380px;display:flex;flex-direction:column;align-items:center}
.jcol h1{margin:28px 0 0;font:700 22px/1.25 'Cinzel',serif;color:var(--fg)}
.jcol .bd{margin-top:8px;font-size:14px;line-height:1.55;color:var(--fg-body)}
.jcol .bd em{font-style:normal;color:var(--fg);font-weight:500}
.jform{margin-top:22px;width:100%;display:flex;flex-direction:column;text-align:left}
.jform label{font:600 13px 'IBM Plex Sans';color:var(--fg);margin-bottom:6px}
.jfld{height:48px;border-radius:8px;background:var(--surface-sunken);border:1px solid var(--border-strong);padding:0 12px;display:flex;align-items:center;font-size:16px;color:var(--fg-locked)}
.jfld.on{border-color:var(--accent);color:var(--fg)}
.jbtn{margin-top:14px;height:48px;border-radius:8px;background:var(--accent);color:var(--bg);font:600 15px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;width:100%}
.jbtn.q{background:transparent;border:1px solid var(--border-strong);color:var(--fg);font-weight:500}
.jfine{margin-top:14px;font:11px/1.55 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.jquiet{margin-top:22px;font:11px/1.55 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.jquiet a{color:var(--accent-text)}
.jcode{display:flex;justify-content:center;gap:8px}
.jcode span{width:44px;height:54px;border-radius:8px;background:var(--surface-sunken);border:1px solid var(--accent);display:flex;align-items:center;justify-content:center;font:600 22px 'IBM Plex Mono';color:var(--fg)}
.jcode span.e{border-color:var(--border-strong);color:var(--fg-locked)}
.jlinks{display:flex;justify-content:center;gap:4px;margin-top:6px}
.jlinks span{min-height:44px;display:flex;align-items:center;padding:0 8px;font:500 13.5px 'IBM Plex Sans';color:var(--accent-text)}
.jlinks span.cool{color:var(--fg-locked)}
/* the compact card (FriendCard compact): 150x210 */
.cc{width:150px;height:210px;flex:none;position:relative}
.cc.tilt{transform:rotate(-3deg)}
.cc .bk{position:absolute;inset:0;border-radius:9px;background:var(--surface-inset);padding:6px;box-shadow:0 20px 44px rgba(0,0,0,.6),inset 0 0 0 1px var(--border-strong)}
.cc .bk.dim{opacity:.42;filter:grayscale(1)}
.cc .bk div{height:100%;border-radius:6px;border:1px solid var(--border-dashed);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
 background:radial-gradient(120px 130px at 50% 46%,color-mix(in oklab,var(--accent) 22%,transparent),transparent 72%),repeating-linear-gradient(45deg,rgba(255,255,255,.018) 0 3px,transparent 3px 6px),var(--surface-sunken)}
.cc .bk .cw{font-size:8px;letter-spacing:3px;color:var(--accent-text)}
.cc .bk b{font:700 34px/1 'Cinzel',serif;color:var(--fg)}
.cc .bk small{font:7.5px 'IBM Plex Mono';letter-spacing:.35em;color:var(--accent-text);text-transform:uppercase}
.cc .fc{position:absolute;inset:0;border-radius:9px;padding:4px;background:var(--border-strong);box-shadow:0 20px 44px rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.6)}
.cc .fc .ii{height:100%;border-radius:7px;background:var(--surface-inset);padding:5px;display:flex;flex-direction:column;gap:3px;text-align:left}
.cc .fc .nb{height:17px;flex:none;border-radius:4px;background:var(--elevated);display:flex;align-items:center;padding:0 6px;font:600 9px 'IBM Plex Sans';color:var(--fg)}
.cc .fc .ar{height:88px;flex:none;border-radius:3px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
 background:radial-gradient(90px 70px at 50% 50%,color-mix(in oklab,var(--accent) 30%,transparent),transparent 75%),var(--surface-sunken);box-shadow:inset 0 0 0 1px rgba(0,0,0,.6)}
.cc .fc .ar .cw{font-size:7px;letter-spacing:2.5px;color:var(--accent-text)}
.cc .fc .ar b{font:800 30px/1 'Cinzel',serif;color:var(--fg)}
.cc .fc .tl{height:14px;flex:none;border-radius:3px;background:var(--elevated);display:flex;align-items:center;justify-content:space-between;padding:0 6px;font:600 7.5px 'Cinzel',serif;color:var(--fg)}
.cc .fc .tl i{font-style:normal;color:var(--accent-text);font-size:6px}
.cc .fc .rx{flex:1;border-radius:3px;background:var(--surface-sunken);padding:5px 6px;font:7px/1.4 'IBM Plex Sans';color:var(--fg-body)}
.cc .fc .ftl{display:flex;justify-content:space-between;padding:0 2px;font:6px 'IBM Plex Mono';letter-spacing:.12em;color:var(--fg-faint);text-transform:uppercase}
.cc .bdg2{position:absolute;right:-8px;bottom:-8px;width:30px;height:30px;border-radius:50%;background:var(--success);color:var(--bg);display:flex;align-items:center;justify-content:center;font:700 15px 'IBM Plex Sans';box-shadow:0 4px 10px rgba(0,0,0,.5)}

/* ================= admin ================= */
.adh{display:flex;flex-direction:column;gap:9px;padding:14px 16px 0;border-bottom:1px solid var(--border);background:var(--bg)}
.dk .adh{padding:26px 28px 0}
.adh .ey{display:flex;align-items:center;gap:10px}
.adh .ey span{font:10.5px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.adh .ey em{height:22px;display:inline-flex;align-items:center;gap:6px;border-radius:999px;border:1px solid var(--border-strong);padding:0 8px;font:normal 10.5px 'IBM Plex Mono';color:var(--fg)}
.adh .ey em i{width:6px;height:6px;border-radius:50%;background:var(--danger)}
.adh .ey a{margin-left:auto;font-size:13px;color:var(--accent-text)}
.adh h1{margin:0;font:400 23px/1.2 'Cinzel',serif;color:var(--fg)}
.dk .adh h1{font-size:28px}
.adh p{max-width:720px;font-size:13px;line-height:1.6;color:var(--fg-body)}
.adh nav{margin-top:4px;display:flex;gap:15px;overflow:hidden}
.dk .adh nav{gap:24px}
.adh nav span{height:42px;flex:none;display:inline-flex;align-items:center;border-bottom:2px solid transparent;margin-bottom:-1px;font-size:13.5px;color:var(--fg-muted)}
.dk .adh nav span{height:40px;font-size:14px}
.adh nav span.on{border-color:var(--fg);color:var(--fg);font-weight:500}
.adb{display:flex;flex-direction:column;gap:12px;padding:16px 16px 28px}
.dk .adb{padding:22px 28px 40px}
.sech2{display:flex;align-items:flex-end;gap:10px;padding-top:10px}
.sech2 .t{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px}
.sech2 h2{margin:0;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.sech2 small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.sech2 a{margin-left:auto;font-size:13px;color:var(--accent-text);min-height:32px;display:inline-flex;align-items:center;white-space:nowrap}
.acard{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);overflow:hidden}
.frow{display:grid;grid-template-columns:minmax(0,1.5fr) 92px minmax(0,1.3fr) minmax(0,1fr) 84px 130px;align-items:center;gap:14px;min-height:56px;padding:0 10px 0 16px;border-top:1px solid var(--border);font-size:13.5px;color:var(--fg-body)}
.frow:first-child{border-top:0}
.frow.hd{min-height:36px;font:10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);background:var(--surface-rail)}
.frow .lb{font:500 15px 'IBM Plex Mono';color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.frow .lb small{display:block;font:10.5px 'IBM Plex Mono';color:var(--fg-faint);margin-top:2px}
.code{display:inline-flex;height:24px;align-items:center;padding:0 8px;border-radius:6px;border:1px solid var(--border-strong);background:var(--surface-sunken);font:500 12px 'IBM Plex Mono';letter-spacing:.06em;color:var(--fg)}
.use{display:flex;flex-direction:column;gap:5px}
.use b{font:500 12.5px 'IBM Plex Mono';color:var(--fg)}
.use b small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.use i{display:block;height:3px;border-radius:2px;background:var(--border-strong);overflow:hidden}
.use i u{display:block;height:100%;background:var(--accent)}
.use.full b{color:var(--warning)} .use.full i u{background:var(--warning)}
.gch{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 9px;border-radius:6px;border:1px solid var(--border);background:var(--surface-rail);font:12px 'IBM Plex Mono';color:var(--fg-body);white-space:nowrap}
.tb{display:inline-flex;align-items:center;min-height:32px;padding:0 6px;font:500 13px 'IBM Plex Sans';color:var(--accent-text);white-space:nowrap}
.tb.dg{color:var(--danger)}
.acts{display:flex;justify-content:flex-end;gap:6px}
.frow.off{color:var(--fg-muted)}
.frow.off .lb,.frow.off .code{color:var(--fg-muted)}
.mt{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.newf{display:flex;flex-direction:column;gap:14px;padding:16px;border:1px solid var(--accent-shadow);border-radius:12px;background:var(--surface)}
.newf .row2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}
.fl{display:flex;flex-direction:column;gap:6px}
.fl label{font:600 13px 'IBM Plex Sans';color:var(--fg)}
.fl .in{height:40px;border-radius:8px;border:1px solid var(--border-strong);background:var(--surface-sunken);display:flex;align-items:center;padding:0 12px;font-size:14px;color:var(--fg)}
.fl .in.on{border-color:var(--accent)}
.fl .in.sel{justify-content:space-between}
.fl .in.sel i{font-style:normal;color:var(--fg-faint)}
.fl small{font-size:12px;line-height:1.5;color:var(--fg-muted)}
.ffacts{display:flex;flex-wrap:wrap;gap:6px}
.ffacts span{height:26px;display:inline-flex;align-items:center;padding:0 9px;border-radius:999px;border:1px solid var(--border-strong);font:11px 'IBM Plex Mono';color:var(--fg-body)}
.newf .bt{display:flex;align-items:center;gap:10px}
.newf .bt small{flex:1;font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.ph .newf .row2{grid-template-columns:minmax(0,1fr)}
.ph .newf .bt{flex-wrap:wrap}
.ph .newf .bt small{flex-basis:100%}
.ph .newf .bt .bp,.ph .newf .bt .bg{flex:1}
.prow{position:relative;display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-top:1px solid var(--border)}
.prow:first-child{border-top:0}
.prow .l1{display:flex;align-items:baseline;gap:8px}
.prow .l1 .lb{font:500 15px 'IBM Plex Mono';color:var(--fg);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.prow .l2{display:flex;align-items:center;gap:10px}
.prow .l2 .use{flex:1}
.prow .l3{display:flex;gap:8px;margin:-4px 0 -8px -6px}
.prow .l3 .tb{min-height:44px}
.prow.off .lb{color:var(--fg-muted)}
/* the tree with a flyer node */
.tree{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);overflow:hidden}
.tr{display:flex;align-items:center;gap:10px;height:46px;padding:0 12px;border-bottom:1px solid var(--border);font-size:13.5px;color:var(--fg-body)}
.tr:last-child{border-bottom:0}
.tr .trl{display:flex;align-self:stretch}
.tr .trl i{width:26px;position:relative}
.tr .trl i.v::before{content:'';position:absolute;left:12px;top:0;bottom:0;border-left:1px solid var(--border-strong)}
.tr .trl i.e::before{content:'';position:absolute;left:12px;top:0;height:50%;border-left:1px solid var(--border-strong)}
.tr .trl i.e::after,.tr .trl i.t::after{content:'';position:absolute;left:12px;top:50%;width:12px;border-top:1px solid var(--border-strong)}
.tr .trl i.t::before{content:'';position:absolute;left:12px;top:0;bottom:0;border-left:1px solid var(--border-strong)}
.tr .tfa{width:28px;height:28px;border-radius:7px;flex:none;display:flex;align-items:center;justify-content:center;border:1px solid var(--border-strong);background:var(--surface-sunken);font:11px 'IBM Plex Mono';color:var(--fg-muted);overflow:hidden}
.tr .tfa img{width:100%;height:100%;object-fit:cover}
.tr .tfa.fl2{border-color:var(--accent-shadow);color:var(--accent-text);background:color-mix(in srgb,var(--accent) 10%,var(--surface-sunken))}
.tr b{font-weight:500;color:var(--fg)}
.tr .tg{height:20px;display:inline-flex;align-items:center;padding:0 7px;border-radius:999px;border:1px solid var(--border-strong);font:10px 'IBM Plex Mono';letter-spacing:.08em;color:var(--fg-muted)}
.tr .tg.ac{border-color:var(--accent-shadow);color:var(--accent-text)}
.tr small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.tr .r{margin-left:auto;display:flex;align-items:center;gap:16px}
/* confirm dialog (ModalChrome) */
.cfm .mb p{font-size:14px;line-height:1.55;color:var(--fg-body)}
.cfm .mb p b{color:var(--fg);font-weight:600}
.cfm .ft2{display:flex;justify-content:flex-end;gap:10px;padding:0 18px 18px}
.sht .cfm2{padding:0}
.bdg2r{background:transparent;border:1px solid #4A2F28;color:var(--danger)}
/* print view */
.pv{display:flex;flex-direction:column;background:#2a2622;width:1300px;border:1px solid var(--border-strong);border-radius:12px;overflow:hidden}
.pvb{display:flex;align-items:center;gap:14px;height:60px;padding:0 20px;background:var(--bg);border-bottom:1px solid var(--border)}
.pvb a{font-size:13px;color:var(--accent-text)}
.pvb b{font:500 15px 'IBM Plex Mono';color:var(--fg)}
.pvb small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.pvb .sp{flex:1}
.pvs{display:flex;justify-content:center;padding:34px 0 40px}
.pvs .wrap{width:612px;height:792px;position:relative}
.pvs .wrap .fly{transform:scale(.75);transform-origin:top left;position:absolute;left:0;top:0}

/* ================= feedback ================= */
.en{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;min-height:400px}
.en h1{margin:0;font:700 21px 'Cinzel',serif;color:var(--fg)}
.dk .en h1{font-size:24px}
.en p{margin-top:10px;max-width:380px;font-size:13.5px;line-height:1.6;color:var(--fg-body)}
.dk .en p{font-size:15px}
.en .bt{display:flex;flex-direction:column;gap:12px;margin-top:24px}
.dk .en .bt{flex-direction:row}
.en .bt span{display:flex;align-items:center;justify-content:center;border-radius:8px;padding:12px 22px;font:600 13px 'IBM Plex Sans'}
.dk .en .bt span{font-size:14px}
.en .bt .p1{background:var(--fg);color:var(--bg)}
.en .bt .g1{border:1px solid var(--border-strong);color:var(--fg)}
.en .tell{margin-top:18px;min-height:44px;display:flex;align-items:center;font:500 13.5px 'IBM Plex Sans';color:var(--accent-text)}
/* About index */
.aix{display:flex;flex-direction:column}
.aix header{display:flex;flex-direction:column;gap:6px;padding:18px 16px 0}
.dk .aix{padding:0 30px}
.dk .aix header{padding:30px 0 0}
.aix header span{font:500 10px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.aix h1{margin:0;font:600 27px 'Cinzel',serif;color:var(--fg)}
.dk .aix h1{font-size:34px}
.aix header p{font-size:14.5px;line-height:1.5;color:var(--fg-body)}
.aix header p a{font-weight:600;color:var(--accent-text);white-space:nowrap}
.aix ul{margin:0;list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px}
.dk .aix ul{grid-template-columns:repeat(3,1fr);gap:18px;padding:22px 0 0}
.aix li{border-radius:14px;border:1px solid var(--border);background:var(--surface);overflow:hidden;display:flex;flex-direction:column}
.aix li .pic{aspect-ratio:4/3;overflow:hidden;position:relative;border-bottom:1px solid var(--border);background:var(--bg)}
.aix li .pic img{position:absolute;left:0;top:-14%;width:100%;display:block}
.dk .aix li .pic img{top:0}
.aix li .tx{display:flex;flex-direction:column;gap:4px;padding:11px 12px 12px}
.aix li .tx b{font:600 15.5px 'IBM Plex Sans';color:var(--fg)}
.aix li .tx span{font-size:13.5px;line-height:1.5;color:var(--fg-body)}
.aix li .tx small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.rpl{display:flex;align-items:center;gap:12px;margin:20px 16px 0;padding:12px 6px 12px 14px;border:1px solid var(--border);border-radius:12px;background:var(--surface)}
.dk .rpl{margin:28px 0 0;max-width:560px}
.rpl .ic{width:30px;height:30px;flex:none;border-radius:8px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;color:var(--fg-muted)}
.rpl .tx{flex:1;font-size:13.5px;line-height:1.45;color:var(--fg-body)}
.rpl .tx b{display:block;color:var(--fg);font-weight:600}
.rpl .go{min-height:44px;display:flex;align-items:center;padding:0 10px;font:600 13.5px 'IBM Plex Sans';color:var(--accent-text);white-space:nowrap}
.legal{display:flex;gap:16px;margin:32px 16px 0;font:11.5px 'IBM Plex Mono';color:var(--fg-muted)}
.dk .legal{margin:32px 0 0}
.legal span{text-decoration:underline;text-decoration-color:var(--fg-faint);text-underline-offset:2px}
/* the report form */
.rf{display:flex;flex-direction:column;gap:14px}
.rf .ln{font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.rta{display:flex;flex-direction:column;gap:6px}
.rta label{font:600 13px 'IBM Plex Sans';color:var(--fg)}
.rta label small{font:400 12px 'IBM Plex Sans';color:var(--fg-faint);margin-left:6px}
.rta .rbx{min-height:92px;border-radius:8px;border:1px solid var(--border-strong);background:var(--surface-sunken);padding:10px 12px;font-size:15px;line-height:1.45;color:var(--fg-locked)}
.rta .rbx.on{border-color:var(--accent);color:var(--fg)}
.rta .rbx.sm{min-height:66px}
.att{display:flex;gap:8px;align-items:flex-start;font:11px/1.55 'IBM Plex Mono';color:var(--fg-faint)}
.att i{font-style:normal;flex:none}
.rft{display:flex;gap:10px;justify-content:flex-end;padding-top:2px}
.rft .bp,.rft .bg{min-width:110px}
.ph .rft .bp{flex:1}
.bp.dis{opacity:.45}
.bp.busy{opacity:.75}
.sent{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:26px 8px 18px}
.sent .ck{width:44px;height:44px;border-radius:50%;border:1.5px solid var(--success);color:var(--success);display:flex;align-items:center;justify-content:center;font:700 19px 'IBM Plex Sans'}
.sent b{font:700 19px 'Cinzel',serif;color:var(--fg)}
.sent p{font-size:13.5px;line-height:1.55;color:var(--fg-body);max-width:320px}
.sent .bg{margin-top:10px;min-width:140px}
.shot{position:absolute;inset:0;overflow:hidden}
.shot img{width:100%;display:block}
/* the survey */
.sv{display:flex;flex-direction:column;gap:18px}
.sv .ln{font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.q{display:flex;flex-direction:column;gap:9px}
.q .qt{font:600 14px 'IBM Plex Sans';color:var(--fg)}
.q .qt small{font:400 12px 'IBM Plex Sans';color:var(--fg-faint);margin-left:6px}
.scale{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.scale span{height:44px;border-radius:8px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font:500 15px 'IBM Plex Mono';color:var(--fg-body)}
.dk .scale span,.mdl .scale span{height:40px}
.scale span.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 16%,var(--surface-raised));color:var(--fg)}
.ends{display:flex;justify-content:space-between;font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.chips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.chips span{height:40px;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 6px;white-space:nowrap;border-radius:999px;border:1px solid var(--border-strong);font-size:13.5px;color:var(--fg-body)}
.mdl .chips span{height:34px}
.chips span.on{border-color:var(--accent);color:var(--fg);background:color-mix(in srgb,var(--accent) 12%,var(--surface-raised))}
.chips span.on::before{content:'✓';font:700 12px 'IBM Plex Sans';color:var(--accent-text)}
.svf{display:flex;gap:10px;align-items:center;padding-top:2px}
.svf .bg,.svf .bp{flex:1}
.mdl .svf{justify-content:flex-end}
.mdl .svf .bg,.mdl .svf .bp{flex:none;min-width:110px}
.svf small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.mdl .svf small{flex:1}
/* admin: feedback */
.fbk{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.fbk .pil{height:32px;display:inline-flex;align-items:center;gap:7px;padding:0 12px;border-radius:999px;border:1px solid var(--border-strong);font-size:13px;color:var(--fg-body)}
.fbk .pil.on{background:var(--elevated);color:var(--fg);border-color:var(--fg-faint)}
.fbk .pil small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.fbk .sum{margin-left:auto;font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.fbr{display:flex;gap:12px;padding:14px 16px;border-top:1px solid var(--border)}
.fbr:first-child{border-top:0}
.fbr .kd{width:30px;height:30px;flex:none;border-radius:8px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;color:var(--fg-muted);position:relative}
.fbr .kd.pb{color:var(--warning);border-color:color-mix(in srgb,var(--warning) 45%,var(--border-strong))}
.fbr .kd.ci{color:var(--fact);border-color:color-mix(in srgb,var(--fact) 45%,var(--border-strong))}
.fbr .kd u{position:absolute;right:-3px;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 2px var(--surface)}
.fbr .bx{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.fbr .h1{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.fbr .h1 b{font:600 14px 'IBM Plex Sans';color:var(--fg)}
.fbr .h1 small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.fbr .h1 .gch{height:22px;font-size:11px}
.fbr .h1 .wh{margin-left:auto}
.fbr .qa{display:grid;grid-template-columns:150px minmax(0,1fr);gap:4px 14px;font-size:13.5px;line-height:1.5}
.fbr .qa dt{font:10.5px/20px 'IBM Plex Mono';letter-spacing:.06em;color:var(--fg-faint);text-transform:uppercase}
.fbr .qa dd{margin:0;color:var(--fg-body)}
.fbr .qa dd b{color:var(--fg);font-weight:500}
.ph .fbr .qa{grid-template-columns:minmax(0,1fr);gap:2px}
.ph .fbr .qa dd{margin-bottom:6px}
.fbr .ctx{display:flex;flex-wrap:wrap;gap:6px}
.fbr .ctx span{height:22px;display:inline-flex;align-items:center;padding:0 7px;border-radius:5px;background:var(--surface-sunken);border:1px solid var(--border);font:10.5px 'IBM Plex Mono';color:var(--fg-muted)}
.cls{display:flex;flex-direction:column;gap:6px;font:12.5px/1.5 'IBM Plex Sans';color:var(--fg-muted)}
.board p,.board li,.board dd,.board td,.board .cap,.board small,.board span,.board b{text-wrap:pretty}
.board h1,.board h2,.board h4{text-wrap:balance}
.slab{position:absolute;z-index:60;font:600 9.5px 'IBM Plex Mono';letter-spacing:.06em;color:#0D0B09;background:#8FA6BE;border-radius:4px;padding:2px 6px}
.pin{position:absolute;z-index:61;width:22px;height:22px;border-radius:50%;background:var(--accent);color:#14110E;font:700 11px/22px 'IBM Plex Mono';text-align:center;box-shadow:0 0 0 3px rgba(13,11,9,.85)}
"""

BRAND = "The 99"
STORE = "Mox Boston"
CODE = "MOX4QK"
URL = f"the-99.dev/join/{CODE}"


def qr(data=f"https://{URL}", px=200, color="var(--ink)", bg=None):
    q = segno.make(data, error="m")
    m = q.matrix
    n = len(m)
    d = []
    for y, row in enumerate(m):
        x = 0
        while x < n:
            if row[x]:
                s = x
                while x < n and row[x]:
                    x += 1
                d.append(f"M{s} {y}h{x - s}v1h-{x - s}z")
            else:
                x += 1
    bgr = f'<rect x="-2" y="-2" width="{n + 4}" height="{n + 4}" fill="{bg}"/>' if bg else ""
    return (f'<svg width="{px}" height="{px}" viewBox="-2 -2 {n + 4} {n + 4}" shape-rendering="crispEdges" role="img" '
            f'aria-label="QR code for {URL}">{bgr}<path fill="{color}" d="{"".join(d)}"/></svg>')


# ---------------------------------------------------------------- the flyer
PITCH = "Build Commander decks from the cards you already own."
SUB = "We’re looking for players to try it before it launches. Scan, sign up, tell us what you think."
FCN = ("The 99 is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. "
       "Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.")
PITCHES = [
    (PITCH, "Says what the app does in the words a player at the counter uses. Recommended."),
    ("Your next Commander deck is already in your binder.", "Warmer, a promise; leans on “binder”, which not every player has."),
    ("Find the Commander decks hiding in your collection.", "Discovery first; closest to Commanders’ For you."),
]


def flyer(paper="#E7B54A", tabs=False, pitch=PITCH):
    crown = '<span class="fcr"><i></i><i></i><i></i></span>'
    head = (f'<div class="fwm"><span class="the">THE</span><span class="mk">{crown}<span class="nn">99</span></span></div>'
            f'<div class="kk">Magic: The Gathering · Commander</div><h1>{pitch}</h1>'
            f'<p class="sub">{SUB}</p>')
    cards = (f'<div class="c l"></div><div class="c r"></div>'
             f'<div class="c f"><span class="ql">SCAN TO JOIN</span>{qr(px=212)}<span class="dm"><i></i><i></i><i></i></span></div>')
    fan = f'<div class="fan" style="zoom:.8">{cards}</div>'
    if tabs:
        head = head.replace("<h1>", '<h1 style="font-size:40px">')
        mid = (f'<div class="mid" style="flex:none;margin-top:10px"><div class="fan" style="zoom:.6">'
               f'{cards}</div></div>')
        url = f'<div class="url" style="margin-top:18px"><small>or type</small><b>{URL.replace(CODE, f"<em>{CODE}</em>")}</b></div>'
        tb = "".join(f'<span><b>{URL}<small>THE 99 · SCAN OR TYPE</small></b></span>' for _ in range(8))
        return (f'<div class="fly" style="--paper:{paper}"><div class="in" style="bottom:216px">{head}{mid}{url}</div>'
                f'<div class="tabs">{tb}</div></div>')
    url = f'<div class="url"><small>or type</small><b>{URL.replace(CODE, f"<em>{CODE}</em>")}</b></div>'
    ft = '<div class="ft"><span>Free to try</span><span>3 invites for your pod</span><span>the-99.dev</span></div>'
    return (f'<div class="fly" style="--paper:{paper}"><div class="in">{head}<div class="mid">{fan}</div>{url}{ft}'
            f'<p class="fcn">{FCN}</p></div></div>')


def mini(paper, label, cap=""):
    return kit.frame(label, f'<div class="mini">{flyer(paper)}</div>', cap)


# ---------------------------------------------------------------- /join
def card_face(rules="Join before launch, with 3 invites of your own for your pod.", badge=False):
    b = '<span class="bdg2">✓</span>' if badge else ""
    return (f'<div class="cc tilt"><div class="fc"><div class="ii"><div class="nb">The 99</div>'
            f'<div class="ar"><span class="cw">◆ ◆ ◆</span><b>99</b></div>'
            f'<div class="tl"><span>Invitation</span><i>◆</i></div><div class="rx">{rules}</div>'
            f'<div class="ftl"><span>From a flyer</span><span>XCIX</span></div></div></div>{b}</div>')


def card_back(word="Invitation", dim=False):
    return (f'<div class="cc"><div class="bk{" dim" if dim else ""}"><div><span class="cw">◆ ◆ ◆</span><b>99</b>'
            f'<small>{word}</small></div></div></div>')


def jcol(title, body="", inner="", fine=""):
    return (f'<div class="jcol"><h1>{title}</h1>' + (f'<p class="bd">{body}</p>' if body else "") + inner
            + (f'<p class="jfine">{fine}</p>' if fine else "") + "</div>")


FL_TITLE = "Try The 99 before it launches"
FL_BODY = "Type your own email. We’ll send it a code to check it’s yours, then you’ll make your account."
FL_FINE = "You start with 15 welcome credits and 3 invites for your friends."


def join_state(state, typed=False):
    """valid | code | proven | full | revoked | ended"""
    if state == "valid":
        fld = '<span class="jfld on">sam@example.com</span>' if typed else '<span class="jfld">name@example.com</span>'
        form = f'<div class="jform"><label>Your email</label>{fld}<span class="jbtn">Send code</span></div>'
        return card_face() + jcol(FL_TITLE, FL_BODY, form, FL_FINE)
    if state == "code":
        form = ('<div class="jform"><div class="jcode">' + "".join(f"<span>{d}</span>" for d in "4802") + '<span class="e">·</span>' * 2 + '</div>'
                '<span class="jbtn" style="opacity:.6">Confirm</span><div class="jlinks"><span class="cool">Send a new code in 0:41</span><span>Use a different email</span></div></div>')
        return card_face() + jcol("Check your email", 'We sent a 6-digit code to <em>sam@example.com</em>. It works for 10 minutes.', form)
    if state == "proven":
        form = '<div class="jform"><span class="jbtn">Continue to sign-up</span></div>'
        return card_face(badge=True) + jcol("That’s your email", "Now make your account. You’ll start with 15 welcome credits and 3 invites.", form)
    signin = '<p class="jquiet">Already on The 99? <a>Sign in</a></p>'
    if state in ("full", "revoked", "full-typed", "listed"):
        title = "This flyer has ended" if state == "revoked" else "This flyer’s spots are all taken"
        if state == "listed":
            return card_back() + jcol("You’re on the list", "We’ll email <em>sam@example.com</em> the day The 99 opens to everyone.", signin)
        on = state == "full-typed"
        fld = '<span class="jfld on">sam@example.com</span>' if on else '<span class="jfld">name@example.com</span>'
        form = f'<div class="jform"><label>Your email</label>{fld}<span class="jbtn">Tell me at launch</span></div>'
        return card_back() + jcol(title, "The 99 opens to everyone soon. Leave your email and we’ll tell you when it does.", form + signin)
    if state == "ended":
        form = '<div class="jform"><span class="jbtn">Make your account</span></div>'
        return card_back(dim=True) + jcol("The 99 is open to everyone now",
                                          "Flyer codes have retired. Make your account the usual way.", form + signin)
    raise ValueError(state)


def join_phone(state, typed=False):
    return kit.phone(f'<div class="jn">{join_state(state, typed)}</div>', h=844, hdr=False, tabs=False)


def join_desk(state, h=760):
    return (f'<div class="dk" style="width:1300px;height:{h}px"><div class="main"><div class="jn">{join_state(state)}</div></div></div>')


# ---------------------------------------------------------------- admin
TABS = ["Costs", "Switches", "Groups", "Accounts", "Models", "Invites", "Payments"]


def admin_head(tab="Invites", sub=None, title=None, back=None, extra_tab=None, skip=0):
    tabs = (TABS + ([extra_tab] if extra_tab else []))[skip:]
    nav = "".join(f'<span class="{"on" if t == tab else ""}">{t}</span>' for t in tabs)
    b = f'<a>{back}</a>' if back else ""
    return (f'<div class="adh"><div class="ey"><span>Admin</span><em><i></i>production</em>{b}</div>'
            f'<h1>{title or tab}</h1>' + (f'<p>{sub}</p>' if sub else "") + f'<nav>{nav}</nav></div>')


INV_SUB = "Who invited whom. Founders are the accounts from before launch; a waiting invite can be revoked here."
# label, code, used, group, made, state
CODES = [("Mox Boston", "MOX4QK", 12, "mox-boston", "Oct 30", "live"),
         ("Pandemonium Books", "PDM7RW", 31, "pandemonium", "Oct 30", "live"),
         ("Knight Moves Cafe", "KNT3HZ", 50, "knight-moves", "Oct 31", "full"),
         ("Pizza Pod test", "PZA9TC", 2, "pizza-pod", "Oct 30", "revoked")]


def use_cell(n, state):
    pct = min(100, n * 2)
    cls = "use full" if state == "full" else "use"
    tail = " · full" if state == "full" else ""
    return f'<span class="{cls}"><b>{n} <small>of 50{tail}</small></b><i><u style="width:{pct}%"></u></i></span>'


def code_row(r, new=False):
    label, code, n, grp, made, st = r
    off = st == "revoked"
    acts = ('<span class="mt">revoked Nov 2</span>' if off else
            '<span class="tb">Print</span><span class="tb dg">Revoke</span>')
    return (f'<div class="frow{" off" if off else ""}{" new" if new else ""}"><span class="lb">{label}</span>'
            f'<span><span class="code">{code}</span></span>{use_cell(n, st)}'
            f'<span><span class="gch">{grp}</span></span><span class="mt">{made}</span><span class="acts">{acts}</span></div>')


def codes_table(rows=CODES, new=None):
    hd = ('<div class="frow hd"><span>Store</span><span>Code</span><span>Sign-ups</span><span>Group</span>'
          '<span>Made</span><span></span></div>')
    return f'<div class="acard">{hd}' + "".join(code_row(r, new=(i == 0 and new)) for i, r in enumerate(rows)) + "</div>"


def codes_phone(rows=CODES):
    out = []
    for label, code, n, grp, made, st in rows:
        off = st == "revoked"
        l3 = ('' if off else '<div class="l3"><span class="tb">Print</span><span class="tb dg">Revoke</span></div>')
        meta = "revoked Nov 2" if off else made
        out.append(f'<div class="prow{" off" if off else ""}"><div class="l1"><span class="lb">{label}</span><span class="code">{code}</span></div>'
                   f'<div class="l2">{use_cell(n, st)}<span class="gch">{grp}</span></div>'
                   f'<div class="mt">{meta}</div>{l3}</div>')
    return '<div class="acard">' + "".join(out) + "</div>"


def codes_head(open_form=False):
    link = "" if open_form else '<a>New flyer code</a>'
    return (f'<div class="sech2"><div class="t"><h2>Flyer codes</h2><small>3 live · from your invites, 37 left · 23 on the launch list</small></div>{link}</div>')


def new_form(phone=False, typed=True, group_new=True):
    lab = f'<span class="in on">{STORE}</span>' if typed else '<span class="in"></span>'
    grp = ('<span class="in sel">New group: mox-boston<i>▾</i></span>' if group_new else
           '<span class="in sel">mox-boston<i>▾</i></span>')
    return (f'<div class="newf"><div class="row2"><div class="fl"><label>Store</label>{lab}<small>Printed on nothing. Only you read it.</small></div>'
            f'<div class="fl"><label>Group</label>{grp}<small>Its sign-ups and the people they invite join it.</small></div></div>'
            '<div class="ffacts"><span>50 sign-ups</span><span>3 free runs a day</span><span>15 welcome credits</span><span>3 invites each</span><span>ends at launch</span></div>'
            f'<div class="bt"><small>Each sign-up spends one of your invites.</small><span class="bg">Cancel</span><span class="bp">Make code</span></div></div>')


def launch_list():
    return ('<div class="acard"><div class="frow" style="grid-template-columns:minmax(0,1fr) auto;min-height:56px">'
            '<span style="display:flex;flex-direction:column;gap:3px"><b style="font:600 14px IBM Plex Sans;color:var(--fg)">Launch list · 23</b>'
            '<span class="mt">emails left on used-up and ended flyers · Knight Moves Cafe 19 · Pizza Pod test 4</span></span>'
            '<span class="acts"><span class="tb">Download CSV</span></span></div></div>')


def tree_rows():
    def rail(*cs):
        return '<span class="trl">' + "".join(f'<i class="{c}"></i>' for c in cs) + "</span>"
    rows = [
        (rail(), '<span class="tfa">H</span><b>Hugh</b><span class="tg">owner</span>', '<small>37 left · invited 6</small><span class="tb">Open</span>'),
        (rail("t"), '<span class="tfa fl2">◆</span><b>Flyer · Mox Boston</b><span class="tg ac">MOX4QK</span><small>12 of 50</small>', '<small>no friend link to Hugh</small><span class="tb">Print</span>'),
        (rail("v", "t"), '<span class="tfa">J</span><b>Jun</b><small>joined Oct 31</small>', '<small>2 left · invited 1</small><span class="tb">Open</span>'),
        (rail("v", "v", "e"), '<span class="tfa">R</span><b>Rosa</b><small>joined Nov 1 · friends with Jun</small>', '<small>3 left · invited 0</small><span class="tb">Open</span>'),
        (rail("v", "e"), '<span class="tfa">D</span><b>Dev</b><small>joined Nov 1</small>', '<small>3 left · invited 0</small><span class="tb">Open</span>'),
        (rail("e"), '<span class="tfa">C</span><b>Colin</b><small>joined Oct 16</small>', '<small>4 left · invited 2</small><span class="tb">Open</span>'),
    ]
    return '<div class="tree">' + "".join(f'<div class="tr">{a}{b}<span class="r">{c}</span></div>' for a, b, c in rows) + "</div>"


def admin_desk(body, tab="Invites", sub=INV_SUB, h=None, over="", extra_tab=None, title=None, back=None):
    inner = admin_head(tab, sub, title, back, extra_tab) + f'<div class="adb">{body}</div>'
    return kit.desk(inner, active=None, h=h, over=over)


def admin_phone(body, tab="Invites", sub=INV_SUB, h=None, over="", extra_tab=None):
    inner = admin_head(tab, sub, None, None, extra_tab, skip=3 if extra_tab else 1) + f'<div class="adb">{body}</div>'
    return kit.phone(inner, active=None, h=h, over=over)


def confirm(desk=True, top=150):
    body = (f'<div class="mb"><p>People can no longer join with <b>{CODE}</b>. The 12 who joined keep their accounts, '
            'their group and their invites. Printed flyers will say it no longer works.</p></div>')
    ft = '<div class="ft2"><span class="bg">Keep it</span><span class="bg bdg2r">Revoke code</span></div>'
    if desk:
        return (f'<div class="scrim"></div><div class="mdl cfm" style="top:{top}px;width:480px"><div class="mh"><b>Revoke {STORE}’s code?</b><span class="x">✕</span></div>'
                f'{body}{ft}</div>')
    return (f'<div class="scrim"></div><div class="sht cfm" style="top:auto"><div class="gr" style="width:40px;height:4px;border-radius:2px;background:var(--border-strong);margin:8px auto 0"></div>'
            f'<div class="mh"><b>Revoke {STORE}’s code?</b><span class="x">✕</span></div>{body}'
            '<div class="ft2" style="padding:0 16px 24px"><span class="bg" style="flex:1">Keep it</span><span class="bg bdg2r" style="flex:1">Revoke code</span></div></div>')


def print_view(paper="#E7B54A"):
    return (f'<div class="pv"><div class="pvb"><a>‹ Invites</a><b>{STORE}</b><span class="code">{CODE}</span>'
            '<small>Letter · black ink on coloured paper · the toolbar doesn’t print</small><span class="sp"></span>'
            f'<span class="bg" style="height:32px;font-size:12.5px">Download QR</span><span class="bp" style="height:32px;font-size:12.5px">Print</span></div>'
            f'<div class="pvs"><div class="wrap">{flyer(paper)}</div></div></div>')


# ---------------------------------------------------------------- feedback
WRENCH = '<path d="M10 2.8 17.4 16H2.6z"/><path d="M10 8v3.6"/><path d="M10 13.6v.2"/>'
CHAT = '<path d="M3.5 4.5h13v9h-7l-3.6 2.8v-2.8H3.5z"/>'


def error_screen(desk=False, tell=True):
    t = '<span class="tell">Tell us what happened</span>' if tell else ""
    return (f'<div class="en"><h1>That didn’t load</h1><p>Something broke on our end. Try again.</p>'
            f'<div class="bt"><span class="p1">Try again</span><span class="g1">Back home</span></div>{t}</div>')


TILES = [("Home", "What’s new, what to build next, and the decks you left off.", "4 screens · 3 good to know", "p-home.webp", "d-home.webp"),
         ("Collection", "Every card you own, and how cards get in.", "3 screens · 4 good to know", "p-collection.webp", "d-collection2.webp"),
         ("Commanders", "Who to build next, from what you own or what’s worth buying.", "3 screens · 2 good to know", "p-commanders.webp", "d-commanders.webp"),
         ("Decks", "Building a deck, reading it, and keeping its versions.", "7 screens · 6 good to know", "p-deck-top.webp", "d-deck-top.webp"),
         ("Shopping", "What your decks still need, and the cheaper ways to get it.", "2 screens · 3 good to know", "p-deck-shopping.webp", "d-shopping.webp"),
         ("Friends", "The people you play with, your pods, and what they can see.", "2 screens · 2 good to know", "p-friends.webp", "d-friends.webp")]


def about_index(desk=False, report=True, n=6):
    lis = "".join(f'<li><span class="pic"><img src="{img(d if desk else p)}" alt=""></span><span class="tx"><b>{nm}</b>'
                  + (f"<span>{ln}</span>" if desk else "") + f'<small>{ct}</small></span></li>'
                  for nm, ln, ct, p, d in TILES[:n])
    rp = (f'<div class="rpl new"><span class="ic">{ico(WRENCH, 17, 1.5)}</span><span class="tx"><b>Something wrong?</b>Tell us what happened and we’ll look.</span>'
          '<span class="go">Report a problem</span></div>') if report else ""
    return (f'<div class="aix"><header><span>About The 99</span><h1>About The 99</h1><p>One page for each part of the app, drawn from the app itself. '
            f'The ? opens help for the screen you’re on. <a>Take the tour →</a></p></header><ul>{lis}</ul>{rp}'
            '<div class="legal"><span>Terms</span><span>Privacy</span></div><div style="height:28px"></div></div>')


def report_form(state="empty", desk=False):
    """empty | typed | sending | sent"""
    if state == "sent":
        return ('<div class="sent"><span class="ck">✓</span><b>Sent. Thank you.</b>'
                '<p>We’ll be in touch if we need any more insight.</p><span class="bg">Close</span></div>')
    t1 = "The deck page went blank when I pressed Apply 4 changes." if state != "empty" else "What went wrong, in a sentence or two"
    t2 = "Trying Suggested changes on Thopter Works." if state != "empty" else "Which deck or page, and what you pressed"
    on = " on" if state != "empty" else ""
    btn = {"empty": '<span class="bp dis">Send</span>', "typed": '<span class="bp">Send</span>',
           "sending": '<span class="bp busy">Sending…</span>'}[state]
    return (f'<div class="rf"><p class="ln">Tell us what you saw. We’ll fix what we can.</p>'
            f'<div class="rta"><label>What happened?</label><span class="rbx{on}">{t1}</span></div>'
            f'<div class="rta"><label>What were you doing?<small>optional</small></label><span class="rbx sm{on}">{t2}</span></div>'
            '<div class="att"><i>+</i><span>We add the page you were on, your device, and the error code if there was one.</span></div>'
            f'<div class="rft">{"" if not desk else "<span class=\"bg\">Cancel</span>"}{btn}</div></div>')


def report_sheet(state="empty", top="auto"):
    return ('<div class="scrim"></div>' + f'<div class="sht" style="top:{top}"><div class="mh"><b>Report a problem</b><span class="x">✕</span></div>'
            f'<div class="mb">{report_form(state)}</div></div>')


def report_modal(state="empty", top=90, w=520):
    return ('<div class="scrim"></div>' + f'<div class="mdl" style="top:{top}px;width:{w}px"><div class="mh"><b>Report a problem</b><span class="x">✕</span></div>'
            f'<div class="mb">{report_form(state, True)}</div></div>')


def survey_form(state="empty", desk=False):
    """empty | answered | sent"""
    if state == "sent":
        return ('<div class="sent"><span class="ck">✓</span><b>Thanks, that helps.</b>'
                '<p>We read every answer. You can always tell us more from About › Report a problem.</p><span class="bg">Close</span></div>')
    a = state == "answered"
    sc = "".join(f'<span class="{"on" if a and i == 4 else ""}">{i}</span>' for i in range(1, 6))
    ch = "".join(f'<span class="{"on" if a and c in ("Decks", "Shopping") else ""}">{c}</span>'
                 for c in ["Collection", "Commanders", "Decks", "Shopping", "Friends", "Precons"])
    tl = "".join(f'<span class="{"on" if a and c == "Already have" else ""}">{c}</span>' for c in ["Yes", "Maybe", "Already have"])
    box = '<span class="rbx sm on">Wish I could see which precon a card came from.</span>' if a else '<span class="rbx sm">Anything you’d change, or love</span>'
    send = '<span class="bp">Send</span>' if a else '<span class="bp dis">Send</span>'
    return ('<div class="sv"><p class="ln">You’ve been using The 99 for a couple of weeks. Three quick questions.</p>'
            f'<div class="q"><span class="qt">How is it working for you?</span><div class="scale">{sc}</div><div class="ends"><span>not well</span><span>really well</span></div></div>'
            f'<div class="q"><span class="qt">What do you use most?<small>pick any</small></span><div class="chips">{ch}</div></div>'
            f'<div class="q"><span class="qt">Would you tell your pod about it?</span><div class="chips">{tl}</div></div>'
            f'<div class="rta"><label>Anything else?<small>optional</small></label>{box}</div>'
            f'<div class="svf">{"<small>Takes a minute</small>" if desk else ""}<span class="bg">Not now</span>{send}</div></div>')


def survey_sheet(state="empty", top="auto"):
    return ('<div class="scrim"></div>' + f'<div class="sht" style="top:{top}"><div class="mh"><b>How’s it going?</b><span class="x">✕</span></div>'
            f'<div class="mb">{survey_form(state)}</div></div>')


def survey_modal(state="empty", top=70, w=560):
    return ('<div class="scrim"></div>' + f'<div class="mdl" style="top:{top}px;width:{w}px"><div class="mh"><b>How’s it going?</b><span class="x">✕</span></div>'
            f'<div class="mb">{survey_form(state, True)}</div></div>')


def shot_phone(key, over, h=844, active="Home", top_px=0):
    """A real capture under an overlay. The capture already holds the header and tab bar."""
    return (f'<div class="ph" style="height:{h}px"><div class="shot"><img src="{img(key)}" alt="" style="margin-top:{top_px}px"></div>{over}</div>')


def shot_desk(key, over, h=900):
    return (f'<div class="dk" style="height:{h}px"><div class="shot"><img src="{img(key)}" alt=""></div>{over}</div>')


FB = [
    ("pb", True, "Problem", "Rosa", "mox-boston", "2h ago",
     [("What happened", "The deck page went blank when I pressed Apply 4 changes."),
      ("What I was doing", "Trying Suggested changes on Thopter Works.")],
     ["/decks/thopter-works", "error a81f3c2e", "iPhone · Safari", "from the error screen"]),
    ("ci", True, "Check-in", "Jun", "mox-boston", "5h ago",
     [("Working for you", "<b>4</b> of 5"), ("Uses most", "Decks, Shopping"), ("Tell the pod", "Already have"),
      ("Anything else", "Wish I could see which precon a card came from.")], []),
    ("pb", False, "Problem", "Colin", None, "yesterday",
     [("What happened", "Collection sync says 0 changes but I added 12 cards."),
      ("What I was doing", "")],
     ["/collection/upload", "desktop · Chrome", "from About"]),
    ("ci", False, "Check-in", "Peter", None, "Oct 30",
     [("Working for you", "<b>5</b> of 5"), ("Uses most", "Commanders"), ("Tell the pod", "Yes"), ("Anything else", "—")], []),
]


def fb_rows(rows=FB, phone=False):
    out = []
    for kind, unread, kname, who, grp, when, qa, ctx in rows:
        icon = ico(WRENCH, 16, 1.5) if kind == "pb" else ico(CHAT, 16, 1.5)
        g = f'<span class="gch">{grp}</span>' if grp else ""
        dl = "".join(f'<dt>{k}</dt><dd>{v or "<span style=\"color:var(--fg-faint)\">not given</span>"}</dd>' for k, v in qa)
        cx = ('<div class="ctx">' + "".join(f"<span>{c}</span>" for c in ctx) + "</div>") if ctx else ""
        out.append(f'<div class="fbr"><span class="kd {kind}">{icon}{"<u></u>" if unread else ""}</span><div class="bx">'
                   f'<div class="h1"><b>{who}</b><small>{kname}</small>{g}<small class="wh">{when}</small></div>'
                   f'<dl class="qa" style="margin:0">{dl}</dl>{cx}</div></div>')
    return '<div class="acard">' + "".join(out) + "</div>"


def fb_bar(on="All"):
    pills = [("All", 14), ("Problems", 6), ("Check-ins", 8)]
    p = "".join(f'<span class="pil{" on" if n == on else ""}">{n}<small>{c}</small></span>' for n, c in pills)
    return f'<div class="fbk">{p}<span class="sum">2 new · check-ins average 4.2 of 5</span></div>'
