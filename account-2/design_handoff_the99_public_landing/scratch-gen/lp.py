"""Public landing page R1 (account 2, 2026-11-08): the landing kit.

The signed-out `/` redrawn as a showcase (brief docs/superpowers/design-briefs/2026-11-07-public-landing.md). Low Sun
tokens from the announcements kit (kit.py); the bare signed-out shell (no rail, no tab bar) with the shipped Fan Content
notice; the shipped wordmark; real captures from public/about. Every capture on these boards is TODAY's capture as a
stand-in: the build uses the si10 re-shoot on the fictional fixture. Strings marked DRAFT go to /copy-review.
"""
import kit
from kit import ico, dia, frame, frames, board_head

kit.FONTS = ("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&amp;"
             "family=IBM+Plex+Mono:wght@400;500;600&amp;family=Cinzel:wght@600;700;800&amp;family=Chakra+Petch:wght@500;600;700&amp;display=swap")
img = kit.img

kit.CSS += r"""
/* ============ landing page ============ */
.lp{background:var(--bg);color:var(--fg);font-family:'IBM Plex Sans',sans-serif;position:relative;overflow:hidden;flex:none;border:1px solid var(--border-strong)}
.lp.p{width:390px;border-radius:34px}
.lp.d{width:1300px;border-radius:12px}
.lp *{box-sizing:border-box}
.kami{--bg:#0E0F14;--surface:#16181F;--surface-raised:#191B22;--surface-rail:#12141B;--surface-inset:#13151C;--elevated:#20222A;--border:#181C26;--border-strong:#262A35;--fg:#E6E8F0;--fg-body:#B1B6C7;--fg-muted:#959AAD;--fg-faint:#84899B;--fg-locked:#606476;--accent:#FF4D9A;--accent-text:#FF4D9A;--warning:#E0913C}
.kami .disp{font-family:'Chakra Petch',sans-serif!important;letter-spacing:0!important;text-transform:none}
.disp{font-family:'Cinzel',serif}
/* top bar */
.tb{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border)}
.d .tb{padding:16px 40px}
.tb .si{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:8px;border:1px solid var(--border-strong);background:var(--surface-raised);font:600 14px 'IBM Plex Sans';color:var(--fg)}
.d .tb .si{min-height:36px}
.tb .rt{display:flex;align-items:center;gap:18px}
.tb .rt .lk{font-size:13.5px;color:var(--fg-muted)}
/* sections */
.sec{padding:40px 20px;border-top:1px solid var(--border)}
.d .sec{padding:64px 90px}
.sec.nb{border-top:0}
.sk{font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--accent-text);margin:0 0 10px}
.st{margin:0;font:700 24px/1.2 'Cinzel',serif;color:var(--fg)}
.d .st{font-size:32px}
.sl{margin:10px 0 0;font-size:15px;line-height:1.6;color:var(--fg-body);max-width:620px;text-wrap:pretty}
.d .sl{font-size:16px}
/* hero */
.hero{padding:34px 20px 36px;background:radial-gradient(600px 360px at 50% 22%,color-mix(in oklab,var(--accent) 12%,transparent),transparent 70%)}
.d .hero{padding:64px 90px 56px;display:grid;grid-template-columns:minmax(0,500px) minmax(0,1fr);gap:56px;align-items:center;background:radial-gradient(1000px 520px at 30% 8%,color-mix(in oklab,var(--accent) 10%,transparent),transparent 70%)}
.hk{font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--accent-text)}
.h1{margin:12px 0 0;font:800 31px/1.15 'Cinzel',serif;color:var(--fg);text-wrap:balance}
.d .h1{font-size:46px;line-height:1.1}
.hs{margin:14px 0 0;font-size:15.5px;line-height:1.6;color:var(--fg-body);text-wrap:pretty}
.d .hs{font-size:17px}
.tag-line{margin:12px 0 0;font:italic 14px 'IBM Plex Sans';color:var(--fg-muted)}
.free{margin-top:16px;display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--fg-body)}
.free span{display:flex;gap:8px;align-items:flex-start;line-height:1.5}
.free i{font-style:normal;color:var(--success);flex:none}
/* the call to action: one email field and one button */
.cta{margin-top:22px;display:flex;flex-direction:column;gap:10px}
.d .cta{flex-direction:row;align-items:flex-start;gap:10px}
.cta .fld{display:flex;flex-direction:column;gap:6px;flex:1;min-width:0}
.cta label{font:500 10.5px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint)}
.d .cta label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.inp{height:48px;border-radius:8px;border:1px solid var(--border-strong);background:var(--surface-inset);padding:0 14px;display:flex;align-items:center;font-size:15px;color:var(--fg-faint)}
.inp.v{color:var(--fg)}
.inp.err{border-color:var(--danger)}
.inp.foc{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in oklab,var(--accent) 25%,transparent)}
.btn-a{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:48px;padding:0 22px;border-radius:8px;background:var(--accent);color:var(--bg);font:600 15px 'IBM Plex Sans';white-space:nowrap;border:0}
.btn-a.busy{opacity:.75}
.btn-g{display:inline-flex;align-items:center;justify-content:center;height:44px;padding:0 18px;border-radius:8px;border:1px solid var(--border-strong);background:var(--surface-raised);color:var(--fg);font:600 14px 'IBM Plex Sans';white-space:nowrap}
.btn-l{display:inline-flex;align-items:center;justify-content:center;height:44px;padding:0 18px;border-radius:10px;background:var(--fg);color:var(--bg);font:500 14px 'IBM Plex Sans';white-space:nowrap}
.btn-q{display:inline-flex;align-items:center;justify-content:center;height:44px;padding:0 14px;border-radius:10px;border:1px solid var(--border-strong);color:var(--fg);font:400 14px 'IBM Plex Sans';white-space:nowrap}
.fine{font:11.5px/1.55 'IBM Plex Mono',monospace;color:var(--fg-faint);margin-top:12px}
.fine a,.fine u{color:var(--fg-muted);text-decoration:underline;text-decoration-color:var(--fg-faint);text-underline-offset:2px}
.msg{font-size:13px;line-height:1.5;margin-top:2px}
.msg.e{color:#E07A66}
.sent{margin-top:22px;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-inset);padding:16px 18px;display:flex;gap:12px;align-items:flex-start}
.sent .ck{width:28px;height:28px;border-radius:50%;border:1.5px solid var(--success);color:var(--success);display:flex;align-items:center;justify-content:center;flex:none}
.sent b{display:block;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.sent p{font-size:13.5px;line-height:1.55;color:var(--fg-body);margin-top:3px}
.sent p em{font-style:normal;color:var(--fg);font-weight:500}
/* hero screen: two real captures, framed and fanned */
.hshot{position:relative;margin:30px auto 0;width:330px;height:470px}
.d .hshot{margin:0;width:100%;height:520px}
.shc{position:absolute;border-radius:22px;overflow:hidden;border:1px solid var(--border-strong);box-shadow:0 18px 40px rgba(0,0,0,.5);background:var(--bg)}
.shc img{display:block;width:100%}
.shc.ph1{width:216px;left:104px;top:0;transform:rotate(3deg);z-index:2}
.shc.ph2{width:196px;left:6px;top:46px;transform:rotate(-5deg);opacity:.9}
.d .shc.dk1{width:640px;left:0;top:10px;border-radius:12px}
.d .shc.ph3{width:200px;right:-10px;top:110px;transform:rotate(3deg);z-index:2}
.stamp{position:absolute;z-index:5;font:600 9px 'IBM Plex Mono';letter-spacing:.08em;color:#0D0B09;background:#8FA6BE;border-radius:4px;padding:2px 6px;white-space:nowrap}
/* theme switch */
.ths{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:22px;flex-wrap:wrap}
.d .ths{justify-content:flex-start;margin-top:20px}
.ths .lab{font:500 10.5px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint);width:100%;text-align:center}
.d .ths .lab{width:auto;text-align:left;margin-right:4px}
.sw{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative}
.sw i{width:26px;height:26px;border-radius:50%;border:1px solid rgba(255,255,255,.18);display:block;overflow:hidden;position:relative}
.sw i::after{content:'';position:absolute;right:0;top:0;bottom:0;width:50%}
.sw.on i{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--fg)}
.ths .nm{font-size:13px;color:var(--fg-body)}
/* numbers strip */
.nums{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 14px;padding:26px 20px;border-top:1px solid var(--border);background:var(--surface-sunken)}
.d .nums{grid-template-columns:repeat(5,minmax(0,1fr));padding:30px 90px;gap:20px}
.nums div{display:flex;flex-direction:column;gap:4px}
.nums b{font:600 24px 'IBM Plex Mono',monospace;color:var(--fg);letter-spacing:-.01em}
.d .nums b{font-size:30px}
.nums span{font-size:12.5px;color:var(--fg-muted);line-height:1.4}
.nums .wide{grid-column:1/-1}
.d .nums .wide{grid-column:auto}
/* chips: free and credit */
.chip{align-self:flex-start;display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:6px;font:500 10.5px 'IBM Plex Mono';letter-spacing:.04em;white-space:nowrap}
.chip.f{color:var(--success);border:1px solid color-mix(in oklab,var(--success) 45%,transparent)}
.chip.c{color:var(--accent-text);border:1px solid color-mix(in oklab,var(--accent) 50%,transparent)}
.chip.c::before{content:'';width:6px;height:6px;transform:rotate(45deg);background:var(--accent);display:block}
/* the loop */
.loop{display:flex;flex-direction:column;gap:30px;margin-top:26px}
.d .loop{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px}
.ls{display:flex;flex-direction:column;gap:12px}
.ls .shot{border-radius:16px;overflow:hidden;border:1px solid var(--border-strong);height:400px;position:relative;background:var(--bg)}
.d .ls .shot{height:400px}
.ls .shot img{width:100%;display:block}
.ls .n{display:flex;align-items:center;gap:10px}
.ls .n em{font:600 12px 'IBM Plex Mono';font-style:normal;color:var(--accent-text);width:24px;height:24px;border:1px solid var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none}
.ls h3{margin:0;font:600 17px 'IBM Plex Sans';color:var(--fg)}
.ls p{font-size:14px;line-height:1.55;color:var(--fg-body)}
/* bring your collection */
.src{margin-top:22px;border:1px solid var(--border);border-radius:14px;background:var(--surface-inset);overflow:hidden}
.srow{display:flex;align-items:center;gap:12px;min-height:60px;padding:10px 16px;border-top:1px solid var(--border)}
.srow:first-child{border-top:0}
.srow .w{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.srow b{font:600 14.5px 'IBM Plex Sans';color:var(--fg)}
.srow span{font-size:13px;color:var(--fg-muted);line-height:1.45}
.srow .go{font-size:13px;color:var(--accent-text);white-space:nowrap;display:flex;align-items:center;gap:4px}
.srow .chev{color:var(--fg-faint);font-size:16px;transition:none}
.srow.open{background:var(--surface-raised)}
.guide{padding:4px 16px 18px 16px;background:var(--surface-raised);border-top:0}
.guide ol{margin:0;padding-left:22px;display:flex;flex-direction:column;gap:7px;font-size:13.5px;line-height:1.5;color:var(--fg-body)}
.guide ol b{color:var(--fg);font-weight:600}
.guide .gf{margin-top:12px;font-size:12.5px;color:var(--fg-muted);line-height:1.5}
.grp{font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);padding:14px 16px 4px;border-top:1px solid var(--border)}
.d .colwrap{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:28px;align-items:start}
.ft{margin-top:22px;border:1px solid var(--accent);border-radius:14px;padding:18px;background:var(--surface-inset);display:flex;flex-direction:column;gap:12px}
.ft h3{margin:0;font:600 17px 'IBM Plex Sans';color:var(--fg)}
.ft p{font-size:14px;line-height:1.55;color:var(--fg-body)}
.ft ol{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px}
.ft li{display:flex;gap:10px;font-size:13.5px;line-height:1.5;color:var(--fg-body)}
.ft li em{font:600 11px 'IBM Plex Mono';font-style:normal;color:var(--accent-text);width:22px;height:22px;border:1px solid var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;margin-top:1px}
.ft li b{color:var(--fg)}
.d .ft{margin-top:22px}
/* written for real */
.wr{display:flex;flex-direction:column;gap:16px;margin-top:24px}
.d .wr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}
.cmd{border-radius:14px;border:1px solid var(--border);background:var(--surface-inset);overflow:hidden;display:flex;flex-direction:column}
.cmd .art{height:150px;position:relative;overflow:hidden}
.cmd .art img{width:100%;height:100%;object-fit:cover;display:block}
.cmd .art::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.7))}
.cmd .nm{position:absolute;left:14px;bottom:10px;z-index:2;font:700 15px 'Cinzel',serif;color:#F5EEDF;display:flex;align-items:center;gap:8px}
.pips{display:inline-flex;gap:3px}.pips i{width:7px;height:7px;border-radius:1px;display:block}
.cmd .bd{padding:14px 16px 16px;display:flex;flex-direction:column;gap:10px;flex:1}
.cmd .bd p{font-size:14px;line-height:1.6;color:var(--fg-body)}
.cmd .bd .k{font:500 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.cmd .bd .go{margin-top:auto;font-size:13.5px;color:var(--accent-text);display:flex;align-items:center;min-height:32px}
.ov .hd{padding:16px 16px 0;display:flex;flex-direction:column;gap:4px}
.ov .hd b{font:700 17px 'Cinzel',serif;color:var(--fg)}
.ov .hd span{font:11px 'IBM Plex Mono';color:var(--fg-faint);letter-spacing:.04em}
.ov .cn{color:var(--fg);font-weight:600;text-decoration:underline;text-decoration-color:var(--border-dashed);text-underline-offset:3px}
/* free vs credits */
.fc{margin-top:24px;display:flex;flex-direction:column;gap:14px}
.d .fc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}
.fcol{border-radius:14px;border:1px solid var(--border);background:var(--surface-inset);padding:18px}
.fcol.cr{border-color:color-mix(in oklab,var(--accent) 45%,var(--border))}
.fcol h3{margin:0 0 4px;font:600 17px 'IBM Plex Sans';color:var(--fg);display:flex;align-items:center;gap:10px}
.fcol .sub{font-size:13px;color:var(--fg-muted);line-height:1.5}
.fcol ul{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column}
.fcol li{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid var(--border);font-size:14px;color:var(--fg-body);line-height:1.45}
.fcol li:first-child{border-top:0}
.fcol li .r{font:500 11.5px 'IBM Plex Mono';color:var(--fg-muted);white-space:nowrap;text-align:right}
.fcol.cr li .r{color:var(--accent-text)}
.fcol .ck{color:var(--success)}
.fnote{margin-top:16px;font-size:14px;line-height:1.6;color:var(--fg-body)}
.fnote .lnk2{color:var(--accent-text);text-decoration:underline;text-underline-offset:3px;font-weight:500}
/* close + footer */
.close{text-align:center;padding:52px 20px 48px;background:radial-gradient(600px 300px at 50% 100%,color-mix(in oklab,var(--accent) 10%,transparent),transparent 70%)}
.d .close{padding:80px 90px 72px}
.close .cta{max-width:560px;margin-left:auto;margin-right:auto;text-align:left}
.close .sent{max-width:560px;margin-left:auto;margin-right:auto;text-align:left}
.crd{padding:22px 20px 0;border-top:1px solid var(--border);font-size:11.5px;line-height:1.6;color:var(--fg-muted);text-align:center}
.d .crd{padding:24px 34px 0;font-size:12px}
.crd p{max-width:720px;margin:0 auto}
.fan{padding:14px 16px 28px;text-align:center;font-size:11px;line-height:16px;color:var(--fg-muted)}
.d .fan{padding:12px 34px 30px;font-size:12px;line-height:18px}
.fan p{max-width:720px;margin:0 auto}
.fan p+p{margin-top:6px}
.fan u{text-decoration-color:var(--fg-faint);text-underline-offset:2px}
/* the demo stage */
.demo{margin-top:24px;border-radius:16px;border:1px solid var(--border-strong);background:var(--surface-inset);overflow:hidden}
.dtop{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border)}
.dtop .sn{font:500 10.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-muted);white-space:nowrap}
.bar{flex:1;display:flex;gap:4px}
.bar i{flex:1;height:4px;border-radius:2px;background:var(--border-strong);display:block}
.bar i.on{background:var(--accent)}
.dtop .skip{font-size:13px;color:var(--fg-muted);white-space:nowrap;min-height:32px;display:flex;align-items:center;text-decoration:underline;text-decoration-color:var(--fg-faint);text-underline-offset:3px}
.dbody{display:flex;flex-direction:column}
.d .dbody{flex-direction:row}
.dshot{position:relative;padding:18px 18px 0;display:flex;justify-content:center;background:var(--bg)}
.d .dshot{padding:24px;flex:none;width:740px;border-right:1px solid var(--border);align-items:flex-start}
.dshot .frm{position:relative;border-radius:22px;overflow:hidden;border:1px solid var(--border-strong);width:300px;height:430px;background:var(--bg)}
.dshot .frm.tool{height:auto;border-radius:14px;width:100%}
.d .dshot .frm{border-radius:10px;width:690px;height:478px}
.d .dshot .frm.tool{height:auto}
.dshot .frm img{display:block;width:100%}
.ring{position:absolute;z-index:4;border:2px solid var(--accent);border-radius:12px;box-shadow:0 0 0 5px color-mix(in oklab,var(--accent) 22%,transparent)}
.ring b{position:absolute;top:-11px;left:-11px;width:22px;height:22px;border-radius:50%;background:var(--accent);color:var(--bg);font:600 11px/22px 'IBM Plex Mono';text-align:center}
.dpan{padding:18px 18px 20px;display:flex;flex-direction:column;gap:12px}
.d .dpan{flex:1;padding:30px 30px 26px;min-width:0}
.dpan h3{margin:0;font:700 20px/1.25 'Cinzel',serif;color:var(--fg)}
.d .dpan h3{font-size:24px}
.dpan p{font-size:14.5px;line-height:1.6;color:var(--fg-body)}
.dpan p em{font-style:normal;color:var(--fg);font-weight:500}
.dpan .tags{display:flex;gap:6px;flex-wrap:wrap}
.dnav{display:flex;gap:10px;margin-top:4px}
.dnav .btn-l{flex:1}
.d .dnav .btn-l{flex:none;min-width:140px}
.dfoot{border-top:1px solid var(--border);padding-top:12px;margin-top:auto;font-size:13.5px;color:var(--fg-muted);display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}
.dfoot a,.dfoot .a{color:var(--accent-text);font-weight:600;text-decoration:underline;text-underline-offset:3px;min-height:32px;display:inline-flex;align-items:center}
.ro{border:1px dashed var(--border-dashed);border-radius:10px;padding:10px 12px;font-size:13.5px;color:var(--fg);background:var(--surface)}
.ro small{display:block;font:500 9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);margin-bottom:4px}
.slot{border:1.5px dashed rgba(143,166,190,.7);border-radius:12px;padding:14px;font-size:12.5px;line-height:1.5;color:#B9C7D6;background:rgba(143,166,190,.06)}
.slot b{display:block;font:600 9.5px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:#8FA6BE;margin-bottom:4px}
.dstart{padding:26px 20px;display:flex;flex-direction:column;gap:14px;align-items:flex-start}
.d .dstart{flex-direction:row;align-items:center;gap:34px;padding:30px}
.fanc{position:relative;width:240px;height:290px;flex:none;align-self:center}
.d .fanc{width:330px;height:360px}
.fanc .c{position:absolute;border-radius:14px;overflow:hidden;border:1px solid var(--border-strong);box-shadow:0 10px 24px rgba(0,0,0,.45);width:118px}
.d .fanc .c{width:150px}
.fanc .c img{display:block;width:100%}
.fanc .c1{left:0;top:26px;transform:rotate(-8deg)}
.fanc .c2{left:56px;top:6px;z-index:2;transform:rotate(-1deg)}
.fanc .c3{left:112px;top:28px;transform:rotate(7deg)}
.d .fanc .c2{left:84px}.d .fanc .c3{left:168px}
.dstart h3{margin:0;font:700 21px/1.25 'Cinzel',serif}
.dstart p{font-size:14.5px;line-height:1.6;color:var(--fg-body)}
.dstart .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
/* sheet and modal */
.scrim{position:absolute;inset:0;background:rgba(0,0,0,.55);z-index:20}
.sheet{position:absolute;left:0;right:0;bottom:0;z-index:21;background:var(--surface-raised);border-top:1px solid var(--border-strong);border-radius:18px 18px 0 0;padding:10px 20px 26px}
.sheet .grab{width:40px;height:4px;border-radius:2px;background:var(--border-strong);margin:0 auto 14px}
.mdl{position:absolute;z-index:21;left:50%;top:50%;transform:translate(-50%,-50%);width:520px;background:var(--surface-raised);border:1px solid var(--border-strong);border-radius:14px;padding:22px 24px 24px;box-shadow:0 24px 60px rgba(0,0,0,.55)}
.mh{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.mh h3{margin:0;font:700 19px/1.3 'Cinzel',serif}
.mh .x{width:44px;height:44px;margin:-10px -12px 0 0;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);font-size:16px}
.pr{display:flex;flex-direction:column;gap:10px;margin-top:14px}
.pr>div{border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--surface-inset)}
.pr b{font:600 15px 'IBM Plex Sans';color:var(--fg);display:block}
.pr span{font-size:13px;color:var(--fg-muted)}
.pr .amt{font:600 15px 'IBM Plex Mono';color:var(--fg)}
/* annotation helpers */
.chg{outline:1.5px dashed rgba(207,135,69,.8);outline-offset:3px;border-radius:10px}
.callout{display:flex;flex-direction:column;gap:14px;width:440px;flex:none}
.legend{display:flex;gap:18px;flex-wrap:wrap;font-size:12.5px;color:var(--fg-muted)}
.legend span{display:flex;align-items:center;gap:8px}
.legend i{width:26px;height:14px;border-radius:4px;display:block}
"""

# ---------------------------------------------------------------- copy (DRAFT unless marked shipped)
COPY = dict(
    kicker="Magic: The Gathering · Commander",                      # shipped (flyerCopy.kicker)
    h1="Search your library for a commander.",                      # shipped (flyerCopy.pitch)
    sub="The 99 reads the cards you own and shows you every commander they can build. Then it builds the deck and lists only what’s missing.",
    tagline="99 problems, but your commander ain’t one.",           # shipped
    free=["Free to use: your collection, every commander, deck building and the shopping list.",
          "Credits only for the tools that write something just for you."],
    email="Your email", ph="name@example.com",                      # shipped (joinCopy)
    press="Tell me at launch",                                      # shipped (flyerJoinCopy.listPress)
    press_open="Sign up free",
    fine_inv="The 99 is invite-only until launch. Have an invitation? Open its link.",
    fine_open="Free to join. No card details.",
    listed_t="You’re on the list",                                 # shipped (flyerJoinCopy.listedTitle)
    invalid="Enter an email address, like name@example.com.",      # shipped (joinCopy.notAnEmail)
    throttled="Too many tries. Wait a little, then try again.",     # shipped (credits-page throttled)
)
THEMES = [("Low Sun", "#14110E", "#CF8745"), ("Neon Rain", "#0E0F14", "#FF4D9A"), ("Canopy", "#0E1310", "#A3C445"),
          ("Oil Haze", "#0D0B0E", "#52827A"), ("Witching Hour", "#120E17", "#AE88E6"), ("First Frost", "#121217", "#6C97DB")]
NUMS = [("3,469", "commanders"), ("3,379", "with a written read"), ("206", "precons"), ("114,223", "combos tracked"), ("35,986", "cards", "wide")]
CHECK = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5 6.5 11.5 12.5 4.5"/></svg>'
CHEV = '›'
FREE = '<span class="chip f">Free</span>'


def credit(n="1 credit"):
    return f'<span class="chip c">{n}</span>'


def wordmark():
    return (f'<div class="wm"><span class="the">THE</span><span class="mk">{dia()}<span class="nn">99</span></span></div>')


def topbar(d, signed_in_link=True):
    return f'<div class="tb">{wordmark()}<div class="rt"><span class="si">Sign in</span></div></div>'


def stamp(t="TODAY’S CAPTURE · RE-SHOT ON THE FIXTURE", where="left:10px;top:10px"):
    return f'<span class="stamp" style="{where}">{t}</span>'


def form(state="entry", d=False, open_=False, value=""):
    """The one call to action. Invite-only: an email field and Tell me at launch. Open sign-up: one button."""
    if open_:
        return (f'<div class="cta"><span class="btn-a" style="{"width:100%" if not d else ""}">{COPY["press_open"]}</span></div>'
                f'<p class="fine">{COPY["fine_open"]} Already a member? <u>Sign in</u></p>')
    if state == "sent":
        return (f'<div class="sent" role="status"><span class="ck">{CHECK}</span><div><b>{COPY["listed_t"]}</b>'
                f'<p>We’ll email <em>{value or "sam@example.com"}</em> the day The 99 opens to everyone.</p></div></div>')
    cls = {"entry": "", "typing": " v foc", "invalid": " v err", "throttled": " v", "busy": " v"}[state]
    val = value or ("sam@example" if state == "invalid" else "sam@example.com") if state != "entry" else COPY["ph"]
    btn = "Sending…" if state == "busy" else COPY["press"]
    msg = ""
    if state == "invalid":
        msg = f'<span class="msg e" role="alert">{COPY["invalid"]}</span>'
    if state == "throttled":
        msg = f'<span class="msg e" role="alert">{COPY["throttled"]}</span>'
    bw = "" if d else "width:100%"
    return (f'<div class="cta"><div class="fld"><label>{COPY["email"]}</label><span class="inp{cls}">{val}</span>{msg}</div>'
            f'<span class="btn-a{" busy" if state == "busy" else ""}" style="{bw}">{btn}</span></div>'
            f'<p class="fine">{COPY["fine_inv"]}</p>')


def theme_switch(on=0, d=False):
    sws = "".join(f'<span class="sw{" on" if i == on else ""}" aria-label="{n}"><i style="background:{bg}"><span style="position:absolute;right:0;top:0;bottom:0;width:50%;background:{ac}"></span></i></span>'
                  for i, (n, bg, ac) in enumerate(THEMES))
    return f'<div class="ths"><span class="lab">See it in</span>{sws}<span class="nm">{THEMES[on][0]}</span></div>'


def hero_shot(d, theme="amonkhet"):
    k = theme == "kamigawa"
    if d:
        dk = img("k-d-commanders.jpg" if k else "d-commanders.jpg")
        ph = img("k-commanders.jpg" if k else "p-commanders.jpg")
        return (f'<div class="hshot"><div class="shc dk1"><img src="{dk}" alt="The Commanders page: the commanders a collection can build, ranked by fit"></div>'
                f'<div class="shc ph3"><img src="{ph}" alt=""></div>{stamp(where="left:10px;top:20px")}</div>')
    a = img("k-commanders.jpg" if k else "p-commanders.jpg")
    b = img("k-deck.jpg" if k else "p-deck.jpg")
    return (f'<div class="hshot"><div class="shc ph2"><img src="{b}" alt=""></div>'
            f'<div class="shc ph1"><img src="{a}" alt="The Commanders page: the commanders a collection can build, ranked by fit"></div>'
            f'{stamp(where="left:0;top:-14px")}</div>')


def hero(d, state="entry", open_=False, theme_on=0, theme="amonkhet", value=""):
    words = (f'<div><div class="hk">{COPY["kicker"]}</div><h1 class="h1 disp">{COPY["h1"]}</h1>'
             f'<p class="hs">{COPY["sub"]}</p>'
             f'{form(state, d, open_, value)}'
             f'<div class="free">' + "".join(f'<span><i>{CHECK}</i>{t}</span>' for t in COPY["free"]) + '</div>'
             + (theme_switch(theme_on, d) if d else "") + '</div>')
    shot = hero_shot(d, theme) + ("" if d else theme_switch(theme_on, d))
    return f'<section class="hero">{words}{"<div>" + shot + "</div>" if d else shot}</section>'


def nums():
    return '<div class="nums" aria-label="The catalog today">' + "".join(
        f'<div class="{x[2] if len(x) > 2 else ""}"><b>{x[0]}</b><span>{x[1]}</span></div>' for x in NUMS) + '</div>'


LOOP = [
    ("1", "Upload your collection", "A CSV from the app you use now, a pasted list, or your phone’s camera.", "p-upload.jpg", 0),
    ("2", "See what you can build", "Every commander you own, ranked by how much of its deck is already in your binder.", "p-commanders.jpg", 0),
    ("3", "Build from what you own", "The 99 fills the deck from your cards first, and marks what you’re missing.", "p-deck.jpg", 0),
    ("4", "Buy only what’s missing", "One shopping list across your decks, with cheaper stand-ins and friends’ spares first.", "p-shopping.jpg", 210),
]


def loop(d):
    items = "".join(
        f'<div class="ls"><div class="n"><em>{n}</em><h3>{t}</h3></div><p>{p}</p>'
        f'<div class="shot"><img src="{img(f)}" alt="" style="margin-top:-{off}px">{stamp(where="left:8px;top:8px") if n == "1" else ""}</div>{FREE}</div>'
        for n, t, p, f, off in LOOP)
    return (f'<section class="sec"><p class="sk">How it works</p><h2 class="st disp">From your binder to a finished deck</h2>'
            f'<div class="loop">{items}</div></section>')


# ---------------------------------------------------------------- bring your collection
GUIDES = {
    "ManaBox": ["In ManaBox, open <b>Collection</b> and pick the binder or list you want.",
                "Press <b>⋯</b>, then <b>Export</b>, and choose <b>CSV</b>.",
                "Save the file, or share it to yourself, then upload it here."],
    "Moxfield": ["On moxfield.com, open <b>Collection</b>.",
                 "Press <b>More</b>, then <b>Export CSV</b>.",
                 "Upload the downloaded file here. Or copy the list and paste it."],
    "Archidekt": ["On archidekt.com, open <b>Collection</b>.",
                  "Press <b>Export</b> and choose <b>CSV</b>.",
                  "Upload the downloaded file here."],
    "Deckbox": ["On deckbox.org, open your <b>Inventory</b>.",
                "Press <b>Export</b> and keep the default columns.",
                "Upload the downloaded file here."],
}
SOURCES = [
    ("ManaBox", "Export a CSV, then upload it", "How to export"),
    ("Moxfield", "Export a CSV or paste the list", "How to export"),
    ("Archidekt", "Export a CSV, then upload it", "How to export"),
    ("Deckbox", "Export a CSV, then upload it", "How to export"),
    ("Another app", "TCGplayer, Dragon Shield, Delver and others: any CSV with a Name and a Quantity column", None),
    ("A list", "Paste it as it is, one card a line", None),
]
NOAPP = [
    ("Precons you bought", "Pick them by name: one press adds the whole deck", None),
    ("Cards in a box", "Scan them with your phone’s camera", None),
]


def guide(app, d=False):
    steps = "".join(f"<li>{s}</li>" for s in GUIDES[app])
    return (f'<div class="guide"><ol>{steps}</ol><p class="gf">The file needs a Name and a Quantity column. '
            f'ManaBox’s also carries foils and the exact printing.</p></div>' if app == "ManaBox" else
            f'<div class="guide"><ol>{steps}</ol><p class="gf">The file needs a Name and a Quantity column; '
            f'{app}’s already has both.</p></div>')


def srow(name, sub, how, open_=False):
    right = (f'<span class="go">{how} <span class="chev">{"⌃" if open_ else "⌄"}</span></span>' if how else "")
    return (f'<div class="srow{" open" if open_ else ""}"><div class="w"><b>{name}</b><span>{sub}</span></div>{right}</div>'
            + (guide(name) if open_ else ""))


def first_timer(d):
    return ('<div class="ft"><h3>New to all this?</h3>'
            '<p>You don’t need the whole box in. Two steps light up your first commanders:</p>'
            '<ol><li><em>1</em><span><b>Pick the precons you own.</b> One press adds a whole deck, and its commander.</span></li>'
            '<li><em>2</em><span><b>Scan your legendary creatures next.</b> Each one is a commander you can build, so the list grows with every scan. The rest of the box can wait.</span></li></ol></div>')


def bring(d, open_app=None):
    rows = "".join(srow(n, s, h, open_app == n) for n, s, h in SOURCES)
    rows += '<div class="grp">No app yet</div>' + "".join(srow(n, s, h) for n, s, h in NOAPP)
    left = (f'<p class="sk">Bring your collection</p><h2 class="st disp">Start with the cards you already own</h2>'
            f'<p class="sl">Everything in The 99 reads your collection, so it comes in first. Bring it from the app you use now, '
            f'or start with no app at all.</p><div class="src">{rows}</div>')
    if d:
        return f'<section class="sec"><div class="colwrap"><div>{left}</div><div style="padding-top:98px">{first_timer(d)}</div></div></section>'
    return f'<section class="sec">{left}{first_timer(d)}</section>'


# ---------------------------------------------------------------- the demo
STEPS = [
    dict(t="Here’s Sam’s collection", b="Sam is made up, and so is the binder: a little over two thousand cards, the way most players keep them. Every tool from here reads these cards.",
         tags=[FREE], p="p-collection.jpg", d="d-collection.jpg", ring=(16, 330, 358, 70), dring=(240, 300, 1030, 120), press="Next"),
    dict(t="The commanders Sam can build", b="Every commander in the binder, ranked by how much of its deck Sam already owns. Press one to see why it fits.",
         tags=[FREE], p="p-commanders.jpg", d="d-commanders.jpg", ring=(14, 334, 362, 380), dring=(90, 330, 1180, 330)),
    dict(t="Help me choose", b="Not sure? Say what you want. Sam asked for <em>“Something with dragons that doesn’t need combos to win.”</em> The 99 ranked the commanders that fit, owned or not.",
         tags=[credit("1 credit with “Anything else?”")], p="t-hmc.jpg", d="d-commanders.jpg", tool=True,
         wish="Something with dragons that doesn’t need combos to win.", result="the ranked commanders Sam’s wish got (Help me choose results, “Anything else?” filled in)"),
    dict(t="A deck from what Sam owns", b="The 99 builds the deck from Sam’s cards first. Two cards are missing, and they’re marked.",
         tags=[FREE], p="p-deck.jpg", d="d-deck.jpg", ring=(14, 88, 362, 58), dring=(110, 50, 200, 50)),
    dict(t="Analysis and Overview", b="The verdict and the numbers are free. The Overview is the written read of how this deck plays, its plan and its weak spots.",
         tags=[FREE, credit("Overview: 1 credit")], p="p-analysis.jpg", d="d-analysis.jpg",
         result="the deck’s stored Overview, opened under the verdict"),
    dict(t="Suggested changes", b="Sam asked for more interaction. The 99 offered cards to add and to cut, and says why for each.",
         tags=[credit("1 credit"), '<span class="chip c" style="opacity:.8">2 above 10 swaps</span>'], p="t-sc.jpg", d="d-tuning.jpg", tool=True,
         wish="More interaction, and fewer cards that only work with the commander.", result="the swaps and Why these cards"),
    dict(t="Get it to 99", b="Over 99, Proposed cuts names where the deck runs long, and a deeper look names the cuts. Under 99, Top off fills it from Sam’s cards. Mana Balance checks the lands.",
         tags=[FREE, credit("Look deeper: 1 credit")], p="t-cuts.jpg", p2="t-mana.jpg", d="d-tuning.jpg", tool=True,
         result="the named cuts from Look deeper"),
    dict(t="Buy only what’s missing", b="One list of what to buy, cheaper stand-ins first. Sam found one more card: <em>Which deck needs it most?</em> reads it against every deck Sam has.",
         tags=[FREE, credit("Which deck: 1 credit")], p="p-shopping.jpg", d="d-shopping.jpg", ring=(14, 560, 362, 120),
         result="Which deck needs it most? on one card"),
]
N = len(STEPS)


def bar(i):
    return '<span class="bar">' + "".join(f'<i class="{"on" if k <= i else ""}"></i>' for k in range(N)) + '</span>'


def demo_cta():
    return f'<div class="dfoot"><span>Like it with your own cards?</span><span class="a">{COPY["press"]}</span></div>'


def stage(i, d, skip_from=None):
    s = STEPS[i]
    top = f'<div class="dtop"><span class="sn">Step {i + 1} of {N}</span>{bar(i)}<span class="skip">Skip to the end</span></div>'
    if s.get("tool"):
        pk = ("dt-" + s["p"][2:]) if d else s["p"]
        shots = f'<div class="frm tool"><img src="{img(pk)}" alt=""></div>'
        if s.get("p2"):
            pk2 = ("dt-" + s["p2"][2:]) if d else s["p2"]
            shots += f'<div class="frm tool" style="margin-top:10px"><img src="{img(pk2)}" alt=""></div>'
        wish = (f'<div class="ro" style="margin-top:10px"><small>What Sam asked · read-only</small>{s["wish"]}</div>' if s.get("wish") else "")
        res = f'<div class="slot" style="margin-top:10px"><b>Stored result · capture owed</b>Here the walk shows {s["result"]}, captured on the fixture.</div>'
        w = "100%" if not d else "560px"
        inner = f'<div style="width:{w};display:flex;flex-direction:column">{stamp(where="position:relative;align-self:flex-start;margin-bottom:8px")}{shots}{wish}{res}</div>'
        shot = f'<div class="dshot" style="padding-bottom:18px">{inner}</div>'
    else:
        src = img(s["d"] if d else s["p"])
        r = s.get("dring" if d else "ring")
        ring = ""
        if r:
            sc = 690 / 1300 if d else 300 / 390
            ring = f'<span class="ring" style="left:{r[0]*sc:.0f}px;top:{r[1]*sc:.0f}px;width:{r[2]*sc:.0f}px;height:{r[3]*sc:.0f}px"><b>{i + 1}</b></span>'
        res = (f'<div class="slot" style="margin-top:10px;width:{"690px" if d else "300px"}"><b>Stored result · capture owed</b>Under this screen the walk shows {s["result"]}.</div>'
               if s.get("result") else "")
        shot = (f'<div class="dshot" style="flex-direction:column;align-items:center;padding-bottom:{18 if res else 0}px"><div class="frm"><img src="{src}" alt="">{ring}'
                f'{stamp(where="left:8px;bottom:8px")}</div>{res}</div>')
    nav = (f'<div class="dnav">' + (f'<span class="btn-q">Back</span>' if i > 0 else "") +
           f'<span class="btn-l">{"See the end" if i == N - 1 else "Next"}</span></div>')
    pan = (f'<div class="dpan"><div class="tags">{"".join(s["tags"])}</div><h3 class="disp">{s["t"]}</h3><p>{s["b"]}</p>{nav}{demo_cta()}</div>')
    return f'<div class="demo">{top}<div class="dbody">{shot}{pan}</div></div>'


def demo_start(d):
    fan = (f'<div class="fanc"><span class="c c1"><img src="{img("p-collection.jpg")}" alt=""></span>'
           f'<span class="c c2"><img src="{img("p-commanders.jpg")}" alt=""></span><span class="c c3"><img src="{img("p-deck.jpg")}" alt=""></span></div>')
    words = ('<div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start"><div class="tags" style="display:flex;gap:6px">'
             f'<span class="chip f">8 steps · about a minute</span></div>'
             '<h3 class="disp">Try it on Sam’s cards</h3>'
             '<p>Sam is a made-up player with a real-looking binder. Press through eight of the tools and see what each one gave Sam. '
             'Nothing you press is saved, and nothing costs a credit.</p>'
             '<div class="row"><span class="btn-l">Start</span></div></div>')
    return f'<div class="demo"><div class="dstart">{fan}{words}</div></div>'


def demo_end(d, skipped_at=None):
    sk = (f'<p style="font-size:13px;color:var(--fg-muted)">You skipped steps {skipped_at + 1} to {N}. <u>Go back to step {skipped_at + 1}</u></p>' if skipped_at is not None else "")
    fan = (f'<div class="fanc"><span class="c c1"><img src="{img("p-analysis.jpg")}" alt=""></span>'
           f'<span class="c c2"><img src="{img("p-deck.jpg")}" alt=""></span><span class="c c3"><img src="{img("p-shopping.jpg")}" alt=""></span></div>')
    words = (f'<div style="display:flex;flex-direction:column;gap:12px;align-items:stretch;flex:1;min-width:0">'
             '<h3 class="disp">That was Sam’s binder. Yours works the same.</h3>'
             '<p>Bring your cards in, and every commander and deck here is built from what you own. '
             'The core is free; credits are only for the tools that write for you.</p>'
             f'{sk}{form("entry", d)}<div class="row"><span class="btn-q">Start over</span></div></div>')
    return f'<div class="demo"><div class="dtop"><span class="sn">The end</span>{bar(N - 1)}</div><div class="dstart">{fan}{words}</div></div>'


def try_it(d, inner=None):
    return (f'<section class="sec"><p class="sk">Try it</p><h2 class="st disp">See it work before you join</h2>'
            f'<p class="sl">A made-up player’s cards, eight of the tools, the real results they gave. About a minute.</p>'
            f'{inner or demo_start(d)}</section>')


# ---------------------------------------------------------------- written for real
CMDS = [
    ("Preston Garvey, Minuteman", "art-preston.jpg", ["#F4E9C4", "#C05A3E", "#4B7A46"],
     "Preston Garvey decks buff a single creature, tending to layer auras and equipment onto one powerful attacker for a voltron kill.", "preston-garvey-minuteman"),
    ("Aang and Katara", "art-aang-katara.jpg", ["#F4E9C4", "#3A6AA5", "#4B7A46"],
     "Aang and Katara decks flood the board with tokens, usually layering in allies and +1/+1 counters to reward a wide, synergistic creature base.", "aang-and-katara"),
]


def written(d):
    cards = "".join(
        f'<div class="cmd"><div class="art"><img src="{img(a)}" alt=""><span class="nm">{n}<span class="pips">'
        + "".join(f'<i style="background:{c}"></i>' for c in pips) + '</span></span></div>'
        f'<div class="bd"><span class="k">Why this commander</span><p>{p}</p><span class="go">Open its page {CHEV}</span></div></div>'
        for n, a, pips, p, slug in CMDS)
    ov = ('<div class="cmd ov"><div class="hd"><b>Mutant Menace</b><span>PRECON · OVERVIEW</span></div>'
          '<div class="bd"><p><span class="cn">The Wise Mothman</span> leads a Sultai counters deck built on radiation. Rad counters mill nonland cards, '
          'which grow creatures, make Zombie Mutant tokens and draw cards. Counter doublers and proliferate effects then inflate evasive attackers '
          'until combat damage finishes the game.</p><span class="k" style="letter-spacing:.06em;text-transform:none;font-size:11px">Written once by the Overview, stored, and shown as it is</span>'
          '<span class="go">Open the precon’s list {0}</span></div></div>').format(CHEV)
    return (f'<section class="sec"><p class="sk">Written for real</p><h2 class="st disp">A written read for 3,379 commanders</h2>'
            f'<p class="sl">Every commander page opens with why it’s worth building. Every precon has an Overview. Both are free to read.</p>'
            f'<div class="wr">{cards}{ov}</div></section>')


# ---------------------------------------------------------------- free versus credits
FREE_LIST = ["Your collection", "Commanders, Discover and Help me choose", "Deck building", "Analysis and stats", "The shopping list",
             "Combos, the game log, friends and pods"]
CREDIT_LIST = [("Overview of a deck", "1 credit"), ("Suggested changes", "1 credit, 2 above 10 swaps"), ("Look deeper in Proposed cuts", "1 credit"),
               ("Help me choose with “Anything else?”", "1 credit"), ("Which deck needs it most?", "1 credit")]


def free_vs(d):
    f = "".join(f'<li><span>{x}</span><span class="r ck">{CHECK}</span></li>' for x in FREE_LIST)
    c = "".join(f'<li><span>{x}</span><span class="r">{y}</span></li>' for x, y in CREDIT_LIST)
    return (f'<section class="sec"><p class="sk">Free and credits</p><h2 class="st disp">The core is free. Credits are for writing.</h2>'
            f'<p class="sl">Browsing is always free. Anything we write just for you uses a credit.</p>'
            f'<div class="fc"><div class="fcol"><h3>Free, always {FREE}</h3><p class="sub">No credits, no limits.</p><ul>{f}</ul></div>'
            f'<div class="fcol cr"><h3>With credits {credit("1 per run")}</h3><p class="sub">Each run of a writing tool on your deck.</p><ul>{c}</ul></div></div>'
            f'<p class="fnote">You start with <b>15 welcome credits</b>, and get <b>one free credit a day</b>. '
            f'<span class="lnk2">What credits cost</span></p></section>')


def close(d, state="entry", open_=False, value=""):
    return (f'<section class="close"><h2 class="st disp" style="max-width:560px;margin:0 auto">Your cards already know what to build.</h2>'
            f'<p class="tag-line">{COPY["tagline"]}</p>{form(state, d, open_, value)}</section>')


def footer(d):
    return ('<div class="crd"><p>Commander data from EDHREC. Combos from Commander Spellbook. Card data and images from Scryfall; prices from Mana Pool.</p></div>'
            '<footer class="fan"><p>The 99 is unofficial Fan Content permitted under the <u>Fan Content Policy</u>. Not approved/endorsed by Wizards. '
            'Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.</p>'
            '<p>Card images and mana symbols are copyright Wizards of the Coast, LLC. Card data and images from Scryfall; prices from Mana Pool. '
            'Not affiliated with Wizards of the Coast, Scryfall or Mana Pool.</p></footer>')


def page(d, state="entry", open_=False, numbers=True, demo_inner=None, open_app=None, theme=None, close_state="entry", over="", parts=None):
    sections = {
        "top": topbar(d),
        "hero": hero(d, state, open_),
        "nums": nums() if numbers else "",
        "loop": loop(d),
        "bring": bring(d, open_app),
        "try": try_it(d, demo_inner),
        "written": written(d),
        "free": free_vs(d),
        "close": close(d, close_state, open_),
        "foot": footer(d),
    }
    order = parts or list(sections)
    body = "".join(sections[k] for k in order)
    return f'<div class="lp {"d" if d else "p"}{" kami" if theme == "kamigawa" else ""}">{body}{over}</div>'


def lp(inner, d, theme=None, h=None):
    st = f' style="height:{h}px"' if h else ""
    return f'<div class="lp {"d" if d else "p"}{" kami" if theme == "kamigawa" else ""}"{st}>{inner}</div>'


def note(title, body):
    return f'<div class="note"><h4>{title}</h4>{body}</div>'
