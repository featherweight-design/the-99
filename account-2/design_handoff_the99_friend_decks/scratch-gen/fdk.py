"""Friend decks and the hide switch R1 (account 2, 2026-10-22): the pieces.

Built on menu-home's kit (shell, five-slot bar, friend page) in Low Sun tokens. New pieces are redrawn from main:
the owner's /decks tile (src/components/decks/deck-card.tsx, ui/art-wash.tsx), the open precon page, which is the
app's one read-only deck list (decks/precons/open-precon-view.tsx, decklist-row.tsx readOnly, decklist-group.tsx),
the deck menu (decks/deck-card-overflow.tsx), the deck page spine (decks/spine-mobile.tsx, spine-desktop.tsx) and
Waiting on you (social/waiting-on-you.tsx). Every string is main's or a placeholder for /copy-review.
"""
import kit, parts as P
from kit import img, ico

kit.CSS += r"""
.new{outline:1.5px dashed rgba(207,135,69,.8);outline-offset:3px;border-radius:8px}
.ps.new{outline:0}
.mk-o{outline:1.5px dashed rgba(207,135,69,.8);outline-offset:3px;border-radius:6px}
.sec2{display:flex;flex-direction:column;gap:18px}
.sec2>h3{margin:0;font:700 21px 'Cinzel',serif}
.sec2>p.sp{font-size:13.5px;line-height:1.6;color:var(--fg-muted);max-width:1240px;text-wrap:pretty}
.sec2>p.sp b{color:var(--fg)}
.tap{position:absolute;width:30px;height:30px;border-radius:50%;background:rgba(240,230,210,.25);border:1.5px solid rgba(240,230,210,.75);z-index:8;pointer-events:none}
.foldx{position:relative;height:0;border-top:1.5px dashed rgba(143,166,190,.85);margin:0}
.foldx span{position:absolute;left:12px;top:-10px;font:600 9.5px/16px 'IBM Plex Mono',monospace;color:#0D0B09;background:#8FA6BE;border-radius:4px;padding:1px 6px;white-space:nowrap}

/* ---------- the deck tile (DeckCard: art band 168 / 248, the label block, the three fixed rows) ---------- */
.dtl{position:relative;display:flex;flex-direction:column;border-radius:14px;border:1px solid var(--border);background:var(--surface-inset);overflow:hidden;container-type:inline-size}
.dtl .band{position:relative;height:248px;overflow:hidden;background:var(--surface-sunken)}
.dtl.n .band{height:168px}
.dtl .band .art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 30%;display:block}
.dtl .band::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,17,14,0) 52%,rgba(20,17,14,.55) 72%,rgba(20,17,14,.92) 92%,#14110E)}
.dtl .lb{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:0 48px 10px 13px}
.dtl .lb h3{margin:0;font:600 15px/1.15 'Cinzel',serif;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 6px rgba(0,0,0,.6)}
.ph .dtl .lb h3{font-size:17px}
.dtl .lb .cml{margin-top:4px;display:flex;gap:4px;font:10.5px/1.25 'IBM Plex Mono';color:var(--fg-body);white-space:nowrap;text-shadow:0 1px 4px rgba(0,0,0,.6)}
.dtl .lb .cml span{overflow:hidden;text-overflow:ellipsis;min-width:0}
.dtl .lb .cml i{font-style:normal;flex:none}
.dtl .dots{position:absolute;top:10px;right:10px;z-index:3;width:26px;height:26px;border-radius:7px;border:1px solid var(--border-strong);background:var(--bg);display:flex;align-items:center;justify-content:center;font:11px 'IBM Plex Mono';color:var(--fg-body);letter-spacing:1px}
.dtl .dots.on{background:var(--elevated);color:var(--fg)}
.dtl .ft{display:flex;flex-direction:column;gap:9px;padding:11px 13px 13px;border-top:1px solid var(--border)}
.dtl .chips{display:flex;align-items:center;gap:8px;height:24px}
.dtl .pill{height:24px;display:inline-flex;align-items:center;padding:0 8px;border-radius:6px;font:10.5px 'IBM Plex Mono';letter-spacing:.06em}
.dtl .bchip{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 8px 0 4px;border-radius:6px;font:10.5px 'IBM Plex Mono';color:var(--bracket-3,#C9AC62);background:color-mix(in srgb,#C9AC62 14%,var(--surface-inset));border:1px solid color-mix(in srgb,#C9AC62 40%,transparent)}
.dtl .bchip i{width:14px;height:14px;transform:rotate(45deg);border:1.5px solid currentColor;border-radius:2px;display:block;margin:0 3px}
.dtl .pr{display:flex;align-items:center;gap:10px;height:14px}
.dtl .pr .tr{flex:1;height:3px;border-radius:999px;background:var(--border);position:relative;overflow:hidden}
.dtl .pr .tr i{position:absolute;left:0;top:0;bottom:0;border-radius:999px}
.dtl .pr b{width:60px;text-align:right;font:500 12px 'IBM Plex Mono';color:var(--fg)}
.dtl .dr{display:flex;align-items:center;gap:10px;height:14px;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.dtl .dr .l{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dtl .dr .l.acc{color:var(--accent-text)}
.hid{display:inline-flex;align-items:center;justify-content:center;color:var(--fg-muted);flex:none}
.dts{display:grid;grid-template-columns:1fr;gap:12px}
.dk .dts{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.dts.four{grid-template-columns:repeat(4,minmax(0,1fr))}
.mkey{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.mkey>span{display:inline-flex;align-items:center;gap:5px}
.mkey .k{letter-spacing:.12em;text-transform:uppercase;font-size:9.5px}

/* the shipped friend tile, for the before frames (friend-decks-tab.tsx) */
.otile{border-radius:12px;border:1px solid var(--border);background:var(--surface-inset);overflow:hidden}
.otile .da{height:120px;position:relative;background:var(--surface-sunken)}
.otile .da .art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.otile .da::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(20,17,14,.9))}
.otile .da b{position:absolute;left:12px;right:12px;bottom:8px;z-index:2;font:700 14px 'Cinzel',serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.otile .dd{padding:10px 12px 12px;display:flex;flex-direction:column;gap:8px}
.otile .dd .c{font:10.5px 'IBM Plex Mono';color:var(--fg-body)}
.otile .dd .l{display:flex;align-items:center;gap:10px}
.otile .dd .l .bar{flex:1;height:3px;border-radius:2px;background:var(--border-strong);overflow:hidden}
.otile .dd .l .bar i{display:block;height:100%}
.otile .dd .l small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.otile .pill{height:19px;display:inline-flex;align-items:center;padding:0 7px;border-radius:5px;font:10px 'IBM Plex Mono';align-self:flex-start}
.bad{position:absolute;z-index:4;font:600 9.5px 'IBM Plex Mono';color:#0D0B09;background:#C6533F;border-radius:4px;padding:2px 6px;white-space:nowrap}

/* ---------- a friend's deck: the read-only page (open-precon-view.tsx's anatomy) ---------- */
.fx{display:flex;flex-direction:column}
.fx .hd{display:flex;flex-direction:column;gap:12px;padding:12px 16px 14px;border-bottom:1px solid var(--border)}
.dk .fx .hd{padding:16px 26px 18px}
.fx .bk{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.fx .top{display:flex;align-items:flex-start;gap:12px}
.fx .th{flex:none;width:46px;height:64px;border-radius:6px;overflow:hidden;border:1px solid var(--border-strong)}
.dk .fx .th{width:56px;height:78px}
.fx .th img{width:100%;height:100%;object-fit:cover;display:block}
.fx .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.fx .ey{display:flex;align-items:center;gap:6px;font:9.5px 'IBM Plex Mono';letter-spacing:.08em;text-transform:uppercase;color:var(--fg-faint)}
.fx .ey .fc{width:16px;height:16px;border-radius:5px;overflow:hidden;border:1px solid var(--border-strong);flex:none}
.fx .ey .fc img{width:100%;height:100%;object-fit:cover;display:block}
.fx h1{margin:0;font:400 22px/1.15 'Cinzel',serif;color:var(--fg)}
.dk .fx h1{font-size:26px}
.fx .cl{font-size:13.5px;color:var(--fg-body)}
.fx .mt{display:flex;align-items:center;gap:8px;font:11px 'IBM Plex Mono';color:var(--fg-faint);flex-wrap:wrap}
.fx .mt .ids{display:flex;gap:3px}.fx .mt .ids i{width:10px;height:10px;border-radius:50%;display:block}
.fx .mt .pl{height:19px;display:inline-flex;align-items:center;padding:0 7px;border-radius:5px;font:10px 'IBM Plex Mono'}
.fx .own{display:flex;flex-direction:column;gap:8px;border-radius:10px;border:1px solid var(--border);background:var(--surface-sunken);padding:11px 13px}
.dk .fx .own{padding:12px 16px}
.fx .own p{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 6px;font-size:14px;color:var(--fg-body)}
.fx .own p b{font:600 15px 'IBM Plex Mono';color:var(--fg)}
.fx .own .bar{height:3px;border-radius:2px;background:var(--border-strong);overflow:hidden}
.fx .own .bar i{display:block;height:100%;background:var(--fg-muted)}
.fx .own .ln{font-size:12.5px;line-height:1.55;color:var(--fg-body)}
.fx .nt{display:flex;align-items:center;justify-content:space-between;gap:12px}
.fx .nt p{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);min-width:0}
.vt{display:flex;border:1px solid var(--border-strong);border-radius:9px;padding:3px;gap:3px;flex:none}
.vt span{height:32px;padding:0 11px;border-radius:6px;display:flex;align-items:center;font-size:12.5px;color:var(--fg-muted)}
.dk .vt span{height:26px}
.vt span.on{background:var(--elevated);color:var(--fg);font-weight:600}
.fx .ky{padding:10px 16px 0}
.dk .fx .ky{padding:10px 26px 0}
.fx .ls{display:flex;flex-direction:column;padding:12px 16px}
.dk .fx .ls{padding:14px 26px}
.gp{margin-bottom:16px;display:flex;flex-direction:column;gap:6px}
.dk .gp{margin-bottom:20px}
.gp .gh{display:flex;align-items:baseline;gap:8px;margin-bottom:2px}
.gp .gh b{font:600 12.5px 'IBM Plex Sans';color:var(--fg)}
.dk .gp .gh b{font:600 15px 'Cinzel',serif}
.gp .gh em{font:normal 11px 'IBM Plex Mono';color:var(--fg-faint)}
.gp .gh small{margin-left:auto;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.rw{position:relative;display:flex;align-items:center;gap:10px;height:44px;padding:0 12px;border-radius:8px;background:var(--surface-rail);font-size:14px}
.dk .rw{height:34px;font-size:13.5px}
.rw .od{width:9px;height:9px;border-radius:50%;flex:none;background:var(--success);border:1px solid var(--success)}
.rw .od.no{background:transparent;border:1px dashed var(--fg-locked)}
.rw .nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--fg)}
.rw .q{font:11px 'IBM Plex Mono';color:var(--fg-muted);flex:none}
.rw .cost{display:inline-flex;gap:3px;flex:none;width:72px;justify-content:flex-end}
.rw .cost i{width:13px;height:13px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:600 8.5px 'IBM Plex Mono';font-style:normal;color:#14110E}
.rw .set{flex:none;width:66px;text-align:right;font:10px 'IBM Plex Mono';color:var(--fg-faint)}
.rw.foc{outline:2px solid var(--accent);outline-offset:-1px}
.bas{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 8px;border-radius:7px;border:1px dashed var(--border-dashed);padding:8px 9px;margin-top:4px}
.bas span{font-size:13px;color:var(--fg-muted)}
.bas small{font:10px 'IBM Plex Mono';color:var(--fg-faint)}
.emp2{display:flex;flex-direction:column;gap:6px;border:1px dashed var(--border-dashed);border-radius:12px;padding:22px 20px}
.dk .emp2{padding:30px 32px}
.emp2 b{font:700 18px 'Cinzel',serif;color:var(--fg)}
.emp2 p{font-size:14px;line-height:1.6;color:var(--fg-muted);max-width:600px}

/* card details: the shipped sheet (390) and modal (1300), with the Wishlist box */
.cdp{position:absolute;inset:0;z-index:40;display:flex;flex-direction:column;background:linear-gradient(#3a3631,#24211d 55%,#1b1814)}
.cdp .ct{display:flex;justify-content:space-between;align-items:center;padding:22px 18px 0}
.cdp .cn{font:13px 'IBM Plex Mono';color:var(--fg-body);background:rgba(20,17,14,.7);border-radius:12px;padding:8px 12px}
.cdp .cx{width:38px;height:38px;border-radius:50%;border:2px solid var(--accent);display:flex;align-items:center;justify-content:center;color:var(--fg);background:rgba(20,17,14,.7)}
.cdp .stg{position:relative;height:400px;margin-top:14px}
.cdp .stg img{position:absolute;top:0;height:400px;width:286px;left:52px;border-radius:12px;box-shadow:0 14px 30px rgba(0,0,0,.55)}
.cdp .stg .sl{left:-214px;opacity:.8;height:320px;width:229px;top:40px}
.cdp .stg .sr{left:376px;opacity:.8;height:320px;width:229px;top:40px}
.cdp .sh2{margin-top:auto;background:var(--bg);border-radius:18px 18px 0 0;border-top:1px solid var(--border);padding:8px 20px 14px;display:flex;flex-direction:column;gap:8px}
.cdp .gr{width:36px;height:4px;border-radius:2px;background:var(--border-strong);align-self:center;margin-bottom:6px}
.cdp h3{margin:0;font:700 23px 'Cinzel',serif;display:flex;justify-content:space-between;align-items:center;gap:8px}
.pipm{display:inline-flex;gap:4px}.pipm i{width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:600 11px 'IBM Plex Sans';font-style:normal;color:#14110E}
.cdp .tl,.cdm .tl{font-size:13px;color:var(--fg-muted)}
.cdp .mm,.cdm .mm{display:flex;align-items:center;gap:12px;font:12px 'IBM Plex Mono';color:var(--fg-muted);margin-top:2px}
.prc{border:1px solid var(--accent-shadow);border-radius:6px;padding:4px 8px;color:var(--accent)}
.wbx{border-radius:10px;border:1px solid var(--border);background:var(--surface-sunken);padding:10px 12px;display:flex;align-items:center;gap:10px}
.wbx .wl{font:500 9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.wbx .hv{font:11px 'IBM Plex Mono';color:var(--fg-muted);margin-left:auto}
.wbx .wb{display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 13px;border-radius:8px;border:1px solid var(--border-strong);font:500 13.5px 'IBM Plex Sans';color:var(--fg)}
.wbx .wb svg{color:var(--accent)}
.cdp .ad{margin:4px -20px 0;border-top:1px solid var(--border);height:46px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;color:var(--fg-body)}
.scrim2{position:absolute;inset:0;background:rgba(10,8,6,.62);z-index:30}
.cdm{position:absolute;z-index:40;left:50%;top:60px;transform:translateX(-50%);width:820px;height:560px;background:var(--surface);border:1px solid var(--border-strong);border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.65);display:flex;overflow:hidden}
.cdm .ac{width:320px;flex:none;border-right:1px solid var(--border);display:flex;flex-direction:column;align-items:center;gap:12px;padding:30px 0;background:var(--surface-sunken)}
.cdm .ac img{width:252px;height:352px;border-radius:12px;display:block;box-shadow:0 12px 28px rgba(0,0,0,.5)}
.cdm .ac small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.cdm .rc{flex:1;padding:28px 70px 28px 30px;display:flex;flex-direction:column;gap:8px;position:relative}
.cdm h3{margin:0;font:700 25px 'Cinzel',serif;display:flex;gap:14px;align-items:center}
.cdm .s2{margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:14px;line-height:1.6;color:var(--fg-body)}
.cdm .s2 b{display:block;font:500 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);margin-bottom:6px}
.cdm .x{position:absolute;top:22px;right:24px;width:34px;height:34px;border-radius:50%;background:var(--elevated);border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;color:var(--fg)}
.cdm .wbx{margin-top:14px}

/* ---------- the owner's deck page spine (spine-mobile / spine-desktop), the ⋯ menu ---------- */
.os{position:relative}
.os .hero{position:relative;height:288px;overflow:hidden;background:var(--surface)}
.os .hero .art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;display:block}
.os .hero::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,17,14,0) 30%,rgba(20,17,14,.55) 55%,rgba(20,17,14,.92) 82%,#14110E)}
.os .hb2{position:absolute;left:18px;right:18px;bottom:0;z-index:2;padding:0 0 12px;display:flex;flex-direction:column;gap:6px}
.os h1{margin:0;font:700 20px/1.25 'Cinzel',serif;color:var(--fg);text-shadow:0 1px 8px rgba(0,0,0,.6)}
.os .meta{display:flex;align-items:center;gap:8px;font:10px 'IBM Plex Mono';color:var(--fg-body)}
.os .meta i{width:10px;height:10px;border-radius:2px;display:block}
.os .chips{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.os .pill{display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:6px;font:11px 'IBM Plex Mono'}
.os .bchip{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 8px 0 6px;border-radius:6px;font:11px 'IBM Plex Mono';color:#C9AC62;border:1px solid rgba(201,172,98,.5)}
.os .bchip i{width:11px;height:11px;transform:rotate(45deg);border:1.5px solid currentColor;border-radius:2px;display:block}
.hmk{display:inline-flex;align-items:center;gap:6px;height:24px;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.os .sub{border-top:1px solid var(--border);padding:14px 16px 12px;display:flex;flex-direction:column;align-items:center;gap:8px}
.os .brw{display:flex;align-items:center;gap:10px;width:100%}
.os .brw .bar{flex:1;height:6px;border-radius:999px;background:var(--elevated);overflow:hidden}
.os .brw .bar i{display:block;height:100%}
.os .brw b{font:600 14px 'IBM Plex Mono'}.os .brw b span{font-weight:400;color:var(--fg-faint)}
.os .acts{display:flex;justify-content:center;gap:8px;padding:4px 16px 14px;position:relative}
.gb2{display:flex;align-items:center;gap:5px;min-height:44px;padding:6px 9px;border-radius:7px;border:1px solid var(--border-strong);font:11px 'IBM Plex Mono';color:var(--fg-body)}
.gb2.sq{width:44px;justify-content:center;padding:0}
.gb2.on{background:var(--elevated);color:var(--fg)}
.dk .os{display:flex;min-height:288px;border-bottom:1px solid var(--border)}
.dk .os .hero{position:absolute;left:0;top:0;width:584px;height:288px}
.dk .os .hero::after{background:linear-gradient(90deg,transparent 0,transparent 325px,rgba(20,17,14,.78) 560px,#14110E 584px)}
.dk .os .in{position:relative;z-index:2;display:flex;align-items:flex-end;min-height:288px;padding:0 24px 18px 600px;gap:18px;width:100%}
.dk .os .col{flex:1 1 280px;min-width:0;display:flex;flex-direction:column;gap:6px}
.dk .os h1{font-size:21px;text-shadow:none}
.dk .os .meta{font-size:11px}
.dk .os .brw{width:auto}.dk .os .brw .bar{flex:none;width:170px}
.dk .os .acol{display:flex;align-items:center;gap:9px;flex:none;position:relative}
.db2{display:flex;align-items:center;height:32px;padding:0 12px;border-radius:8px;border:1px solid var(--border-strong);font:500 12.5px 'IBM Plex Sans';color:var(--fg)}
.db2.sq{width:32px;padding:0;justify-content:center;font:13px 'IBM Plex Mono';letter-spacing:1px;color:var(--fg-body)}
.db2.on{background:var(--elevated);color:var(--fg)}
.otabs{display:flex;align-items:flex-end;gap:22px;padding:0 0 0 16px;border-bottom:1px solid var(--border);height:52px;overflow:hidden;white-space:nowrap}
.otabs span{font-size:14.5px;color:var(--fg-muted);padding-bottom:12px;border-bottom:2px solid transparent;display:flex;gap:6px;align-items:baseline}
.otabs span em{font:normal 11.5px 'IBM Plex Mono';color:var(--fg-faint)}
.otabs span.on{color:var(--fg);font-weight:600;border-bottom-color:var(--accent)}
.otabs span.on em{color:var(--accent)}
.dk .otabs{padding-left:30px;height:48px;gap:24px}
/* the anchored panel: MENU_WIDTH 186, flush 38px rows (44 on a coarse pointer), Delete last in --danger */
.mnu{position:absolute;z-index:30;width:206px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface);box-shadow:0 22px 50px rgba(0,0,0,.6);overflow:hidden}
.dk .mnu{width:186px}
.mnu span{display:flex;align-items:center;gap:10px;min-height:44px;padding:0 13px;font:14px 'IBM Plex Sans';color:var(--fg);border-top:1px solid var(--elevated)}
.dk .mnu span{min-height:38px;font-size:13px}
.mnu span:first-child{border-top:0}
.mnu span.dg{color:var(--danger)}
.mnu span.hv{background:var(--elevated)}
.mnu .bx{margin-left:auto;width:18px;height:18px;border-radius:4px;border:1.5px solid var(--border-dashed);flex:none;display:flex;align-items:center;justify-content:center}
.dk .mnu .bx{width:16px;height:16px}
.mnu .bx.on{background:var(--accent);border-color:var(--accent)}
.mnu .bx.on::after{content:'';width:8px;height:4px;border-left:2px solid #14110E;border-bottom:2px solid #14110E;transform:translateY(-1px) rotate(-45deg)}

/* toast (ToastFrame) */
.tst{position:absolute;left:16px;right:16px;z-index:14;display:flex;min-height:52px;align-items:center;gap:10px;border-radius:10px;border:1px solid var(--border-strong);background:var(--elevated);padding:0 6px 0 14px;box-shadow:0 12px 30px rgba(0,0,0,.45);font-size:13.5px;color:var(--fg)}
.tst .x{margin-left:auto;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint)}

/* not found (NotFoundView) */
.nf{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;padding:90px 24px 120px}
.nf .num{font:700 64px 'Cinzel',serif;color:var(--fg-locked)}
.nf h2{margin:0;font:700 22px 'Cinzel',serif}
.nf p{font-size:14px;color:var(--fg-muted)}
.nf .b{display:flex;gap:10px;margin-top:12px}

/* Waiting on you rows, the fallbacks */
.fi .vis .gcard{width:46px;height:64px;border-radius:3px;display:block;box-shadow:0 2px 6px rgba(0,0,0,.45)}
.fi .vis .fa.ini{display:flex;align-items:center;justify-content:center;background:var(--elevated);font:600 9px 'IBM Plex Mono';color:var(--fg-muted)}
.fi .kr small.ff{color:var(--fg-faint)}
.fi.seen .kd.ff{color:var(--fg-faint)}
.swatch{display:inline-flex;align-items:center;gap:8px;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.swatch i{width:34px;height:20px;border-radius:5px;display:flex;align-items:center;justify-content:center;font:10.5px 'IBM Plex Mono';font-style:normal;background:var(--surface-inset);border:1px solid var(--border)}
"""

# --------------------------------------------------------------------------- glyphs
# Hidden from friends: the Friends bar glyph's near seat, struck through. Same 20-unit box and 1.5 stroke.
HIDE_P = ('<circle cx="8.6" cy="7.4" r="2.7"/><path d="M3.8 16.4c.5-2.9 2.4-4.5 4.8-4.5s4.3 1.6 4.8 4.5"/>'
          '<path d="M13.4 4.9a2.4 2.4 0 1 1 1.3 4.5"/><path d="M15.6 11.6c1.5.5 2.4 1.9 2.7 4"/><path d="M2.6 2.6l14.8 14.8"/>')


def hide_glyph(size=14, sw=1.6):
    return ico(HIDE_P, size, sw)


BOOK = ('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">'
        '<path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/></svg>')
EXPORT = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fg-faint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
          '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>')

ID = {"W": "#F4E9C4", "U": "#3A6AA5", "B": "#98748F", "R": "#C05A3E", "G": "#4B7A46"}
COLOUR = {"U": "Blue", "G": "Green", "W": "White", "R": "Red", "B": "Black", "UR": "Izzet", "WB": "Orzhov", "BG": "Golgari",
          "UG": "Simic", "RW": "Boros", "UB": "Dimir", "GW": "Selesnya", "BR": "Rakdos", "GU": "Simic", "WU": "Azorius"}
STATUS = {"Complete": ("var(--success)", "color-mix(in srgb,var(--success) 18%,var(--bg))"),
          "To buy": ("var(--accent)", "color-mix(in srgb,var(--accent) 18%,var(--bg))"),
          "Building": ("var(--fg-body)", "color-mix(in srgb,var(--fg-body) 18%,var(--bg))"),
          "Draft": ("var(--fg-muted)", "transparent")}


def pill_style(st):
    c, b = STATUS[st]
    edge = ";border:1px dashed var(--border-dashed)" if st == "Draft" else ""
    return f"color:{c};background:{b}{edge}"


def names_match(deck, commander):
    """The deck's name repeats its commander: the whole name, or the part before the comma."""
    f = lambda s: "".join(ch for ch in s.lower() if ch.isalnum())
    return f(deck) in (f(commander), f(commander.split(",")[0]))


# --------------------------------------------------------------------------- fixtures: Colin's decks, newest first
# (name, commander, art, status, built, to buy, identity, partner)
COLIN = [("Thopter Factory", "Sai, Master Thopterist", "crop-sai.jpg", "To buy", 99, 8, "U"),
         ("Ghalta, Primal Hunger", "Ghalta, Primal Hunger", "crop-ghalta.jpg", "Complete", 99, 0, "G"),
         ("Giada", "Giada, Font of Hope", "crop-giada.jpg", "Building", 71, 0, "W"),
         ("Lathliss, Dragon Queen", "Lathliss, Dragon Queen", "crop-lathliss.jpg", "Complete", 99, 0, "R")]
COLIN_MORE = [("Rootha, Mastering the Moment", "Rootha, Mastering the Moment", "crop-rootha.jpg", "Complete", 99, 0, "UR"),
              ("Killian", "Killian, Decisive Mentor", "crop-killian.jpg", "To buy", 99, 3, "WB"),
              ("Ghoulcaller Gisa", "Ghoulcaller Gisa", "crop-gisa.jpg", "Building", 48, 0, "B"),
              ("Dina’s Garden", "Dina, Essence Brewer", "crop-dina.jpg", "Complete", 99, 0, "BG"),
              ("Zimone, Infinite Analyst", "Zimone, Infinite Analyst", "crop-zimone.jpg", "Draft", 0, 0, "UG")]


def deck_tile(d, narrow=False, owner=False, hidden=False, menu_on=False, mark=False, tap=None, last="2d ago"):
    name, cmd, art, st, built, buy, ident = d[:7]
    colour = COLOUR.get(ident, ident)
    cm = (f'<span>{cmd}</span><i>· {colour}</i>' if (owner or not names_match(name, cmd)) else f'<i>{colour}</i>')
    fill = min(100, round(built / 99 * 100))
    bar_c = STATUS[st][0] if st != "Draft" else "var(--fg-muted)"
    bar = f'<i style="width:{fill}%;background:{bar_c}"></i>' if built else ""
    count = f'{built} / 99'
    detail = (f'<span class="l acc">{buy} cards to buy</span>' if buy else f'<span class="l"></span>')
    lastp = f'<span>played {last}</span>' if owner and st != "Draft" else ""
    chips = f'<span class="pill" style="{pill_style(st)}">{st}</span>'
    if owner and st != "Draft":
        chips += '<span class="bchip"><i></i>Upgraded</span>'
    if hidden:
        chips += f'<span class="hid{" mk-o" if mark else ""}" title="Hidden from friends">{hide_glyph(16)}</span>'
    dots = f'<span class="dots{" on" if menu_on else ""}">…</span>' if owner else ""
    tp = f'<span class="tap" style="{tap}"></span>' if tap else ""
    return (f'<div class="dtl{" n" if narrow else ""}">{tp}<div class="band"><img class="art" src="{img(art)}" alt="">'
            f'{dots}<div class="lb"><h3>{name}</h3><div class="cml">{cm}</div></div></div>'
            f'<div class="ft"><div class="chips">{chips}</div><div class="pr"><span class="tr">{bar}</span><b>{count}</b></div>'
            f'<div class="dr">{detail}{lastp}</div></div></div>')


def old_tile(d, src=None, pos="center"):
    """The tile #2193 shipped: a 120px band of the art, centred, the name on it, the commander under it."""
    name, cmd, art, st, built, buy, ident = d[:7]
    c, b = STATUS[st]
    fill = min(100, round(built / 99 * 100))
    fig = f"{built} / 99" + (f" · {buy} cards" if buy else "")
    return (f'<div class="otile"><div class="da"><img class="art" src="{img(src or art)}" alt="" style="object-position:{pos}"><b>{name}</b></div>'
            f'<div class="dd"><span class="c">{cmd}</span><span class="pill" style="color:{c};background:{b}">{st}</span>'
            f'<span class="l"><span class="bar"><i style="width:{fill}%;background:{c}"></i></span><small>{fig}</small></span></div></div>')


def friend_head(tab="decks", desk=False, counts=None):
    counts = counts or {"spares": 6, "wish": 12, "decks": 4}
    return (f'<div class="fpg"><span class="bk">‹ Friends</span><div class="who">{P.face("face-sai.jpg", 64 if desk else 56, 14 if desk else 13)}'
            '<div><h1>Colin</h1><p>Friend since Oct 2</p></div><span class="dots">···</span></div>'
            + P.place_strip(tab, [("spares", "Spares"), ("wish", "Wishlist"), ("decks", "Decks")], counts))


DECKS_LINE = "Colin’s committed decks and drafts, newest first. Open one to see its list."


def decks_tab(decks, desk=False, line=DECKS_LINE, tap=None, counts=None):
    t = "".join(deck_tile(d, tap=(tap if i == 0 else None)) for i, d in enumerate(decks))
    c = counts or {"spares": 6, "wish": 12, "decks": len(decks)}
    return friend_head("decks", desk, c) + f'<p class="gl">{line}</p><div class="dts new" style="margin-top:12px">{t}</div></div>'


def decks_tab_old(desk=False):
    t = "".join(old_tile(d) for d in (COLIN if desk else COLIN[:2]))
    return friend_head("decks", desk) + f'<p class="gl">View only. Colin’s committed decks and drafts, newest first.</p><div class="dtiles">{t}</div></div>'


# --------------------------------------------------------------------------- Thopter Factory: Colin's list
# (name, cost, owned-by-you, qty, set)
def c(*xs):
    return list(xs)


LIST = {
    "Creatures": [("Arcbound Ravager", c("c2"), True), ("Emry, Lurker of the Loch", c("c2", "u"), False), ("Etherium Sculptor", c("c1", "u"), True),
                  ("Faerie Mastermind", c("c1", "u"), False), ("Glint-Nest Crane", c("c1", "u"), True), ("Hangarback Walker", c("x", "x"), True),
                  ("Hope of Ghirapur", c("c1"), False), ("Kappa Cannoneer", c("c5", "u"), False), ("Master of Etherium", c("c2", "u"), False), ("Memnite", c("c0"), True),
                  ("Myr Retriever", c("c2"), True), ("Ornithopter", c("c0"), True), ("Padeem, Consul of Innovation", c("c3", "u"), False),
                  ("Phyrexian Metamorph", c("c3", "u"), False), ("Riddlesmith", c("c1", "u"), True), ("Sage of Lat-Nam", c("c1", "u"), False),
                  ("Sharding Sphinx", c("c4", "u", "u"), False), ("Shimmer Myr", c("c3"), False), ("Signal Pest", c("c1"), True),
                  ("Silver Myr", c("c2"), True), ("Tetsuko Umezawa", c("c1", "u"), False), ("Urza, Lord High Artificer", c("c2", "u", "u"), False),
                  ("Whirler Rogue", c("c2", "u", "u"), True)],
    "Planeswalkers": [("Jace, Multiverse Architect", c("c2", "u", "u"), False), ("Tezzeret the Seeker", c("c3", "u", "u"), False)],
    "Instants": [("Brainstorm", c("u"), True), ("Counterspell", c("u", "u"), True), ("Dig Through Time", c("c6", "u", "u"), False),
                 ("Fabricate", c("c2", "u"), False), ("Fierce Guardianship", c("c2", "u"), False), ("Mystical Dispute", c("c2", "u"), True),
                 ("Swan Song", c("u"), False), ("Thirst for Discovery", c("c2", "u"), True), ("Whir of Invention", c("x", "u", "u", "u"), False)],
    "Sorceries": [("Ponder", c("u"), True), ("Preordain", c("u"), True), ("Reshape", c("x", "u", "u"), False),
                  ("Tezzeret’s Gambit", c("c3", "u"), True), ("Transmute Artifact", c("u", "u"), False), ("Treasure Cruise", c("c7", "u"), True)],
    "Enchantments": [("Efficient Construction", c("c3", "u"), False), ("Mystic Remora", c("u"), False), ("Rhystic Study", c("c2", "u"), False),
                     ("Thopter Spy Network", c("c2", "u", "u"), True)],
    "Artifacts": [("Arcane Signet", c("c2"), True), ("Chief of the Foundry", c("c3"), False), ("Coalition Relic", c("c3"), True),
                  ("Cranial Plating", c("c2"), False), ("Ichor Wellspring", c("c2"), True), ("Lightning Greaves", c("c2"), True),
                  ("Mind Stone", c("c2"), True), ("Mirrorworks", c("c5"), False), ("Mystic Forge", c("c4"), False),
                  ("Paradox Engine", c("c5"), False), ("Retrofitter Foundry", c("c3"), False), ("Sculpting Steel", c("c3"), False),
                  ("Sensei’s Divining Top", c("c1"), False), ("Skullclamp", c("c1"), True), ("Sol Ring", c("c1"), True),
                  ("Swiftfoot Boots", c("c2"), True), ("The One Ring", c("c4"), False), ("Thought Vessel", c("c2"), True),
                  ("Unwinding Clock", c("c4"), False)],
    "Lands": [("Academy Ruins", c(), False), ("Buried Ruin", c(), True), ("Command Tower", c(), True), ("Darksteel Citadel", c(), True),
              ("Field of Ruin", c(), True), ("Inventors’ Fair", c(), False), ("Otawara, Soaring City", c(), False),
              ("Reliquary Tower", c(), True), ("Seat of the Synod", c(), True)],
}
BASICS = [("Island", 27)]
SETS = {"Sol Ring": "C21 263", "Arcane Signet": "M3C 283", "Etherium Sculptor": "ALA 41", "Whirler Rogue": "ORI 81",
        "Counterspell": "CMM 81", "Jace, Multiverse Architect": "FDN 1", "Thopter Spy Network": "ORI 79"}


def body_total():
    return sum(len(v) for v in LIST.values()) + sum(q for _, q in BASICS)


def owned_total():
    cards = [x for v in LIST.values() for x in v]
    return sum(1 for x in cards if x[2]), len(cards)


def pip(p):
    if p == "x":
        return '<i style="background:#C9C1B0">X</i>'
    if p.startswith("c"):
        return f'<i style="background:#C9C1B0">{p[1:]}</i>'
    return f'<i style="background:{ID[p.upper()]}"></i>'


def row(n, cost, own, desk=False, foc=False, tap=False):
    setn = f'<span class="set">{SETS.get(n, "")}</span>' if desk else ""
    tp = '<span class="tap" style="left:34%;top:7px"></span>' if tap else ""
    return (f'<div class="rw{" foc" if foc else ""}">{tp}<span class="od{"" if own else " no"}"></span><span class="nm">{n}</span>'
            f'<span class="cost">{"".join(pip(p) for p in cost)}</span>{setn}</div>')


def group(label, cards, desk=False, foc=None, tap=None, footer="", extra=0):
    own = sum(1 for x in cards if x[2])
    n = len(cards) + extra
    note = (f'<small>you own {own} of {len(cards)}</small>' if desk and len(cards) > 1 else
            (f'<small>{"you own it" if own else "you own 0 of 1"}</small>' if desk else ""))
    rows = "".join(row(nm, cost, o, desk, foc == nm, tap == nm) for nm, cost, o in cards)
    return f'<div class="gp"><div class="gh"><b>{label}</b><em>{n}</em>{note}</div>{rows}{footer}</div>'


def basics_line():
    return '<p class="bas"><span>Island ×27</span><small>basic · not counted</small></p>'


def fdeck_head(desk=False, name="Thopter Factory", cmd="Sai, Master Thopterist", art="crop-sai.jpg", st="To buy", built=99,
               ident="U", own=None, shares=True, view="list", show_own=True):
    o, of = own or owned_total()
    share = round(o / of * 100) if of else 0
    cl = "" if names_match(name, cmd) else f'<span class="cl">{cmd}</span>'
    ids = "".join(f'<i style="background:{ID[k]}"></i>' for k in ident)
    shr = ('<p class="ln">Your deck <b style="color:var(--fg);font-weight:600">Thopter Works</b> has the same commander and 38 of its cards.</p>' if shares else "")
    ownb = (f'<section class="own new"><p>You own <b>{o} of {of}</b> of its cards</p><div class="bar"><i style="width:{share}%"></i></div>{shr}</section>'
            if show_own else "")
    note = ("By type, A–Z within each group · press a card for its details, hover for its art" if desk else "By type · press a card for its details")
    vt = f'<span class="vt"><span class="{"on" if view == "list" else ""}">List</span><span class="{"on" if view == "card" else ""}">Cards</span></span>'
    return (f'<div class="hd"><span class="bk">‹ Colin’s decks</span><div class="top"><span class="th"><img src="{img(art)}" alt=""></span>'
            f'<div class="tx"><span class="ey new"><span class="fc"><img src="{img("face-sai.jpg")}" alt=""></span>Colin’s deck · read-only</span>'
            f'<h1>{name}</h1>{cl}<span class="mt"><span class="pl" style="{pill_style(st)}">{st}</span>{built} / 99<span class="ids">{ids}</span>{COLOUR.get(ident, ident)}</span></div></div>'
            f'{ownb}<div class="nt"><p>{note}</p>{vt}</div></div>')


def mkey():
    return ('<div class="ky"><div class="mkey new"><span class="k">Your collection</span>'
            '<span><i class="od-s" style="width:9px;height:9px;border-radius:50%;background:var(--success);display:inline-block"></i>you own it</span>'
            '<span><i style="width:9px;height:9px;border-radius:50%;border:1px dashed var(--fg-locked);display:inline-block"></i>you don’t</span></div></div>')


def fdeck(desk=False, groups=None, foc=None, tap=None, full=False, start=None):
    """The list. `groups` limits which groups draw (the first screen); `full` draws all 99."""
    order = ["Creatures", "Planeswalkers", "Instants", "Sorceries", "Enchantments", "Artifacts", "Lands"]
    keys = order if (full or groups is None) else groups
    out = [group("Commander", [("Sai, Master Thopterist", c("c2", "u"), True)], desk)] if start is None else []
    for k in keys:
        cards = LIST[k] if (full or start is None or k != keys[0]) else LIST[k][start:]
        foot = basics_line() if k == "Lands" else ""
        out.append(group(k, cards, desk, foc, tap, foot, 27 if k == "Lands" else 0))
    return f'<div class="ls">{"".join(out)}</div>'


def fdeck_page(desk=False, **kw):
    lkw = {k: kw.pop(k) for k in ("groups", "foc", "tap", "full", "start") if k in kw}
    return f'<div class="fx">{fdeck_head(desk, **kw)}{mkey()}{fdeck(desk, **lkw)}</div>'


def detail_phone(card="jace.jpg", name="Jace, Multiverse Architect", tl="Legendary Planeswalker — Jace", cost=("2", "u", "u"),
                 price="$0.85", setn="FDN", n="27 of 73", have=0):
    pips = "".join(f'<i style="background:{"#cfc7b4" if k.isdigit() else ID[k.upper()]}">{k if k.isdigit() else ""}</i>' for k in cost)
    return (f'<div class="cdp"><div class="ct"><span class="cn">{n}</span><span class="cx">✕</span></div>'
            f'<div class="stg"><img class="sl" src="{img("sai.jpg")}" alt=""><img src="{img(card)}" alt="{name}"><img class="sr" src="{img("killian.jpg")}" alt=""></div>'
            f'<div class="sh2"><span class="gr"></span><h3>{name}<span class="pipm">{pips}</span></h3><span class="tl">{tl}</span>'
            f'<span class="mm"><span class="prc">{price}</span>{setn}</span>'
            f'<div class="wbx new"><span class="wl">Wishlist</span><span class="wb">{BOOK}Add to wishlist</span><span class="hv">you have {have}</span></div>'
            '<span class="ad">All details <small>▴</small></span></div></div>')


def detail_desk(card="jace.jpg", name="Jace, Multiverse Architect", tl="Legendary Planeswalker — Jace · 4", cost=("2", "u", "u"),
                price="$0.85", setn="FDN", n="27 of 73",
                rules="At the beginning of combat on each opponent’s turn, they may pay {2}. If they don’t, creatures they control can’t attack Jaces you control this turn."):
    pips = "".join(f'<i style="background:{"#cfc7b4" if k.isdigit() else ID[k.upper()]}">{k if k.isdigit() else ""}</i>' for k in cost)
    return ('<div class="scrim2"></div><div class="cdm">'
            f'<div class="ac"><img src="{img(card)}" alt="{name}"><small>{n} · ‹ ›</small></div>'
            f'<div class="rc"><span class="x">✕</span><h3>{name} <span class="pipm">{pips}</span></h3><span class="tl">{tl}</span>'
            f'<span class="mm"><span class="prc">{price}</span>{setn}</span>'
            f'<div class="s2"><b>Rules text</b>{rules}</div>'
            f'<div class="wbx new"><span class="wl">Wishlist</span><span class="wb">{BOOK}Add to wishlist</span><span class="hv">you have 0</span></div>'
            '</div></div>')


# --------------------------------------------------------------------------- the owner's deck page
OWN = dict(name="Thopter Works", cmd="Sai, Master Thopterist", art="crop-sai.jpg", ident="U", st="To buy")


def menu_rows(where="header", on=False, hv=None):
    rows = [] if where == "header" else ["Update from a list", "Rename", "Export"]
    rows += ["Move to Thursday decks", "HIDE", "Delete"]
    out = []
    for r in rows:
        if r == "HIDE":
            out.append(f'<span class="new{" hv" if hv == "HIDE" else ""}" style="border-radius:0;outline-offset:-2px">Hidden from friends<i class="bx{" on" if on else ""}"></i></span>')
        else:
            out.append(f'<span class="{"dg" if r == "Delete" else ""}">{r}</span>')
    return "".join(out)


def owner_phone(hidden=False, menu=None, mark=True):
    chips = f'<span class="pill" style="{pill_style("To buy")}">To buy</span><span class="bchip"><i></i>Upgraded</span>'
    if hidden:
        chips += f'<span class="hmk{" mk-o" if mark else ""}">{hide_glyph(14)}Hidden from friends</span>'
    mn = (f'<div class="mnu" style="right:16px;top:58px">{menu_rows("header", menu == "on", "HIDE")}</div>' if menu else "")
    return (f'<div class="os"><div class="hero"><img class="art" src="{img(OWN["art"])}" alt="">'
            f'<div class="hb2"><h1>{OWN["name"]} <span style="font:14px IBM Plex Sans;color:var(--fg-muted)">✎</span></h1>'
            f'<span class="meta"><i style="background:{ID["U"]}"></i>{OWN["cmd"]} · Blue</span><div class="chips">{chips}</div></div></div>'
            '<div class="sub"><div class="brw"><span class="bar"><i style="width:100%;background:var(--accent)"></i></span><b>99 <span>/99</span></b></div></div>'
            f'<div class="acts"><span class="gb2">Update from a list</span><span class="gb2 sq">{EXPORT}</span>'
            f'<span class="gb2 sq{" on" if menu else ""}">…</span>{mn}</div></div>'
            '<div class="otabs"><span class="on">Your deck <em>99</em></span><span>Analysis</span><span>Consider <em>88</em></span><span>Games <em>5</em></span></div>')


def owner_desk(hidden=False, menu=None, mark=True):
    chips = f'<span class="pill" style="{pill_style("To buy")}">To buy</span><span class="bchip"><i></i>Upgraded</span>'
    if hidden:
        chips += f'<span class="hmk{" mk-o" if mark else ""}">{hide_glyph(14)}Hidden from friends</span>'
    mn = (f'<div class="mnu" style="right:0;top:40px">{menu_rows("header", menu == "on", "HIDE")}</div>' if menu else "")
    return (f'<div class="os"><div class="hero"><img class="art" src="{img(OWN["art"])}" alt=""></div>'
            f'<div class="in"><div class="col"><h1>{OWN["name"]}</h1><span class="meta"><i style="background:{ID["U"]}"></i>{OWN["cmd"]} · Blue</span>'
            f'<div class="chips">{chips}</div><div class="brw"><span class="bar"><i style="width:100%;background:var(--accent)"></i></span><b>99 <span>/99</span></b></div></div>'
            f'<div class="acol"><span class="db2">Update from a list</span><span class="db2">Export</span><span class="db2 sq{" on" if menu else ""}">…</span>{mn}</div></div></div>'
            '<div class="otabs"><span class="on">Your deck <em>99</em></span><span>Analysis</span><span>Consider <em>88</em></span><span>Games <em>5</em></span><span>Versions <em>3</em></span></div>')


def owner_list(desk=False, n=6):
    rows = [("Arcbound Ravager", c("c2"), True), ("Etherium Sculptor", c("c1", "u"), True), ("Glint-Nest Crane", c("c1", "u"), True),
            ("Hangarback Walker", c("x", "x"), True), ("Master of Etherium", c("c2", "u"), False), ("Memnite", c("c0"), True)][:n]
    r = "".join(f'<div class="rw"><span class="od{"" if o else " no"}"></span><span class="nm">{nm}</span><span class="cost">{"".join(pip(p) for p in cost)}</span>'
                f'<span style="color:var(--fg-locked);font-size:13px;width:20px;text-align:center">✕</span></div>' for nm, cost, o in rows)
    return f'<div class="ls" style="padding:{"14px 30px" if desk else "12px 16px"}"><div class="gp"><div class="gh"><b>Creatures</b><em>24</em></div>{r}</div></div>'


# --------------------------------------------------------------------------- the owner's /decks
MINE = [("Thopter Works", "Sai, Master Thopterist", "crop-sai.jpg", "To buy", 99, 14, "U"),
        ("Dino Stampede", "Ghalta, Primal Hunger", "crop-ghalta.jpg", "Complete", 99, 0, "G"),
        ("Rootha Spells", "Rootha, Mastering the Moment", "crop-rootha.jpg", "Building", 64, 0, "UR")]


def decks_page(desk=False, hidden=(0,), key=True, menu=None):
    tiles = []
    for i, d in enumerate(MINE if desk else MINE[:2]):
        t = deck_tile(d, owner=True, hidden=i in hidden, menu_on=(menu is not None and i == 0), mark=True)
        if menu is not None and i == 0:
            t = t.replace('<div class="ft">', f'<div class="mnu" style="right:10px;top:42px">{menu_rows("tile", menu == "on", "HIDE")}</div><div class="ft">', 1)
        tiles.append(t)
    k = (f'<div class="mkey new" style="grid-column:1/-1"><span class="hid">{hide_glyph(16)}</span>hidden from friends</div>' if key and hidden else "")
    head = ('<div style="padding:14px 16px 0;display:flex;align-items:baseline;justify-content:space-between"><h1 style="margin:0;font:700 22px Cinzel,serif">Decks</h1>'
            '<span style="font:11px IBM Plex Mono;color:var(--fg-faint)">3 decks</span></div>') if not desk else (
            '<div style="padding:22px 22px 0;display:flex;align-items:baseline;gap:14px"><h1 style="margin:0;font:700 28px Cinzel,serif">Decks</h1>'
            '<span style="font:11px IBM Plex Mono;color:var(--fg-faint)">3 decks · newest first</span><span class="bp" style="margin-left:auto;height:32px;font-size:12.5px;border-radius:8px">New deck</span></div>')
    pad = "padding:16px 22px 22px" if desk else "padding:14px 16px 16px"
    return head + f'<div class="dts" style="{pad}">{k}{"".join(tiles)}</div>'
