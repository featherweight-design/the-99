"""Add a card from anywhere, R1 (account 2, 2026-10-31): shared helpers.
Every frame is drawn over the shipped app's own captures (about_visual art, copper theme), with the shell's header,
tab bar, rail, search rows and sheets redrawn from src (nav.tsx, search-row.tsx, add-cards-sheet.tsx, card-modal.tsx)."""

FONTS = ('<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&amp;family=IBM+Plex+Mono:wght@400;500;600'
         '&amp;family=Cinzel:wght@600;700;800&amp;display=swap" rel="stylesheet">')

CSS = r"""<style>
body{margin:0;background:#0D0B09}
*{box-sizing:border-box}
p{margin:0}
.board{--bg:#14110E;--surface:#1E1A15;--surface-raised:#211D18;--surface-rail:#1A1611;--surface-sunken:#18140F;--surface-inset:#1B1712;--elevated:#29241F;--border:#2B241B;--border-strong:#3A3229;--border-dashed:#494037;--fg:#EDE6D8;--fg-body:#C0B8A6;--fg-muted:#A59C89;--fg-faint:#948B78;--fg-placeholder:#8A8170;--fg-locked:#6E6654;--accent:#CF8745;--success:#6FA368;--warning:#DEAA29;--danger:#C6533F;
 padding:48px 56px 64px;background:#0D0B09;font-family:'IBM Plex Sans',sans-serif;color:var(--fg);display:flex;flex-direction:column;gap:40px}
.bh{display:flex;flex-direction:column;gap:9px;max-width:1500px}
.kick{display:flex;align-items:center;gap:10px;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.kick .tag{background:var(--accent);color:#14110E;border-radius:5px;padding:4px 8px;font-weight:600}
.bh h2{margin:0;font:700 30px 'Cinzel',serif}
.bh p{font-size:14px;line-height:1.6;color:var(--fg-body);max-width:1300px;text-wrap:pretty}
.bh p b{color:var(--fg)}
code{font:12px 'IBM Plex Mono',monospace;color:var(--fg-body)}
h3.sec{margin:0;font:600 13px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);border-top:1px solid var(--border-strong);padding-top:18px}
.frames{display:flex;flex-wrap:wrap;gap:44px;row-gap:56px;align-items:flex-start}
.fr{display:flex;flex-direction:column;gap:12px;flex:none}
.fr>.lab{width:0;min-width:100%;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.fr>.lab b{color:var(--accent);font-weight:600}
.fr>.cap{width:0;min-width:100%;font-size:13px;line-height:1.55;color:var(--fg-muted);text-wrap:pretty}
.fr>.cap b{color:var(--fg);font-weight:600}
.new{outline:1.5px dashed rgba(207,135,69,.9);outline-offset:2px;border-radius:8px}
.gone{outline:1.5px dashed rgba(198,83,63,.85);outline-offset:2px;border-radius:8px}
.rule8{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);padding:20px 24px;max-width:1500px}
.rule8 h4{margin:0 0 10px;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.rule8 ol,.rule8 ul{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.rule8 b{color:var(--fg)}
.side{width:640px;display:flex;flex-direction:column;gap:18px}
.side .note{border:1px solid var(--border-strong);border-radius:12px;background:#15120F;padding:16px 18px;font-size:13px;line-height:1.6;color:var(--fg-body)}
.side .note b{color:var(--fg)}
.side .note h4{margin:0 0 6px;font:600 13px 'IBM Plex Sans';color:var(--fg)}
.strips{display:flex;gap:28px;align-items:flex-start}
.strip{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.strip .lab{font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);width:120px}
.strip .lab b{color:var(--accent)}
.draft{font:600 9px 'IBM Plex Mono';letter-spacing:.06em;color:#0D0B09;background:#8FA6BE;border-radius:3px;padding:1px 5px;margin-left:6px;vertical-align:2px}

/* ---- device frames ---- */
.ph{width:390px;height:844px;flex:none;border-radius:34px;border:1px solid var(--border-strong);background:var(--bg);overflow:hidden;position:relative;font-family:'IBM Plex Sans',sans-serif;color:var(--fg)}
.ph.w360{width:360px}
.dk{width:1300px;height:900px;flex:none;border-radius:12px;border:1px solid var(--border-strong);background:var(--bg);overflow:hidden;position:relative;font-family:'IBM Plex Sans',sans-serif;color:var(--fg)}
.cut{position:absolute;overflow:hidden}
.cut img{position:absolute;display:block;max-width:none}
.scrim{position:absolute;inset:0;background:rgba(20,17,14,.72)}
.lay{position:absolute}

/* ---- phone header (MobileHeader) ---- */
.mhd{position:absolute;left:0;right:0;top:0;height:79px;display:flex;align-items:center;justify-content:space-between;padding:20px 20px 14px;background:var(--bg);border-bottom:1px solid var(--border);z-index:6}
.mhd.shown{box-shadow:0 10px 28px rgba(0,0,0,.5)}
.mhd .wm{width:64px;height:44px;position:relative;overflow:hidden;flex:none}
.mhd .wm img{position:absolute;left:-20px;top:-20px;width:390px}
.clu{display:flex;align-items:center}
.ib{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);flex:none}
.ib.on{background:var(--elevated);color:var(--fg)}
.hq{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font:400 18px 'IBM Plex Sans';flex:none}
.av{width:38px;height:38px;border-radius:12px;border:1px solid var(--accent);color:var(--accent);font:500 14px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;flex:none;margin:0 3px}
.offp{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 12px;border-radius:999px;background:rgba(222,170,41,.14);font:600 12px 'IBM Plex Mono',monospace;color:var(--fg);margin-right:8px;white-space:nowrap}
.offp i{width:8px;height:8px;border-radius:50%;background:var(--warning)}
.inst{display:flex;align-items:center}
.inst .b{width:44px;height:44px;border-radius:12px;border:1px solid var(--border);background:var(--surface-raised);display:flex;align-items:center;justify-content:center;color:var(--fg)}
.inst .x{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint)}
.air{position:absolute;top:30px;height:24px;border-left:1px solid #DE6A8A;border-right:1px solid #DE6A8A;display:flex;align-items:center;justify-content:center;font:600 9px 'IBM Plex Mono';color:#F4A3BA;z-index:8}
.air::before{content:'';position:absolute;left:0;right:0;top:50%;border-top:1px dashed #DE6A8A}
.air span{position:relative;background:var(--bg);padding:0 2px;top:-10px}

/* ---- tab bar ---- */
.tbar{position:absolute;left:0;right:0;bottom:0;height:74px;display:flex;align-items:center;padding:8px 8px 14px;border-top:1px solid var(--border);background:var(--surface-rail);z-index:5}
.tbar a{flex:1;height:52px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:9px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:var(--fg-faint);text-decoration:none;min-width:0}
.tbar a.on{background:var(--surface-inset);color:var(--fg)}
.tbar a.pr{background:var(--elevated);color:var(--fg)}
.w360 .tbar a{font-size:8.5px;letter-spacing:0}

/* ---- deck rows ---- */
.drow{position:absolute;left:16px;right:16px;height:37px;border-radius:8px;background:var(--surface-inset);display:flex;align-items:center;padding:0 12px 0 13px;gap:9px}
.drow .dot{width:8px;height:8px;border-radius:50%;background:var(--success);flex:none}
.drow .dot.d{background:none;border:1.5px dashed var(--fg-faint)}
.drow .n{font-size:14.5px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pips{display:flex;gap:3px;align-items:center}
.pip{width:12px;height:12px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:600 8px 'IBM Plex Mono';color:#1a1612}
.pip.c{background:#9C9384}.pip.g{background:#4B7A46}
.buy{font:600 10px 'IBM Plex Mono';color:var(--warning);background:rgba(222,170,41,.14);border:1px solid rgba(222,170,41,.35);border-radius:4px;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center}
.drow .x{color:var(--fg-faint);font-size:13px;width:22px;text-align:center}
.drow.lit{box-shadow:inset 0 0 0 1.5px var(--success)}

/* ---- sheets ---- */
.sheet{position:absolute;z-index:20;background:var(--surface);display:flex;flex-direction:column}
.sheet.full{inset:0}
.sheet.side480{top:0;bottom:0;right:0;width:480px;border-left:1px solid var(--border-strong);box-shadow:-24px 0 60px rgba(0,0,0,.45)}
.sh-h{display:flex;align-items:center;gap:12px;padding:16px 18px 12px}
.side480 .sh-h{padding:20px 22px 14px}
.sh-h h2{margin:0;flex:1;font:700 19px 'Cinzel',serif}
.side480 .sh-h h2{font-size:21px}
.sh-h .sub{display:block;font:12px 'IBM Plex Mono';color:var(--fg-faint);margin-top:4px;font-weight:400}
.sh-x{width:44px;height:44px;border-radius:10px;background:var(--elevated);color:var(--fg-muted);display:flex;align-items:center;justify-content:center;font-size:14px;flex:none}
.side480 .sh-x{width:34px;height:34px;border-radius:8px}
.sh-s{display:flex;gap:8px;padding:0 18px}
.side480 .sh-s{padding:0 22px}
.fld{flex:1;min-width:0;height:48px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-sunken);display:flex;align-items:center;gap:10px;padding:0 12px;color:var(--fg-placeholder);font-size:16px;white-space:nowrap;overflow:hidden}
.side480 .fld{height:46px;font-size:14px}
.fld.on{border-color:var(--accent);color:var(--fg)}
.fld .caret{width:1.5px;height:19px;background:var(--accent);margin-left:-9px;flex:none}
.scanb{height:48px;flex:none;display:inline-flex;align-items:center;gap:8px;border-radius:8px;border:1px solid var(--border);background:var(--surface-sunken);padding:0 14px;font:500 15px 'IBM Plex Sans';color:var(--fg)}
.side480 .scanb{height:46px;font-size:14px}
.sh-b{flex:1;min-height:0;overflow:hidden;padding:12px 18px;display:flex;flex-direction:column;gap:10px}
.side480 .sh-b{padding:12px 22px}
.sh-b .lede{font-size:14px;line-height:1.6;color:var(--fg-body)}
.sh-b .wayrow{min-height:52px;display:flex;align-items:center;gap:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg);padding:0 14px;font-size:14px}
.sh-b .wayrow .a{color:var(--accent)}
.sh-b .wayrow .chev{margin-left:auto;color:var(--fg-faint)}
.lh{display:flex;align-items:baseline;padding:6px 0 0}
.lh span{font:10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.lh i{margin-left:auto;font:normal 10px 'IBM Plex Sans';color:var(--fg-locked)}
.sh-f{display:flex;align-items:center;gap:12px;border-top:1px solid var(--border-strong);background:var(--surface-rail);padding:12px 18px 16px}
.side480 .sh-f{padding:14px 22px 18px}
.sh-f .sum{flex:1;font-size:12px;color:var(--fg-muted)}
.prim{height:46px;border-radius:10px;padding:0 22px;background:var(--fg);color:var(--bg);font:600 15px 'IBM Plex Sans';display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}
.side480 .prim{height:40px;border-radius:8px;font-size:14px}
.prim.off{opacity:.4}
.ghost{min-height:44px;border-radius:8px;border:1px solid var(--border-strong);padding:0 16px;font-size:14px;display:inline-flex;align-items:center;justify-content:center;color:var(--fg)}
.notice{border:1px solid var(--border);border-radius:8px;background:var(--surface-rail);padding:10px 12px;font-size:13px;color:var(--fg-body);display:flex;gap:10px}

/* add line */
.al{border:1px solid var(--border);border-radius:9px;background:var(--surface-inset);padding:10px 12px;display:flex;flex-direction:column;gap:10px}
.al.need{border-color:var(--accent)}
.al .r1{display:flex;align-items:center;gap:12px}
.al .th{width:32px;height:45px;border-radius:4px;overflow:hidden;flex:none;position:relative}
.al .th img{width:100%;height:100%;object-fit:cover;display:block}
.al .nm{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.al .nm b{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chip{align-self:flex-start;display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 8px;border-radius:6px;border:1px solid var(--border-strong);font:11px 'IBM Plex Mono';color:var(--fg-body);white-space:nowrap}
.chip.need{border-color:var(--accent);color:var(--accent)}
.al .rx{width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);font-size:13px;flex:none}
.al .r2{display:flex;align-items:center;gap:8px}
.fin{height:34px;padding:0 11px;border-radius:8px;border:1px solid var(--border-strong);font-size:13px;display:inline-flex;align-items:center;gap:6px;color:var(--fg-body)}
.fin.on{background:rgba(207,135,69,.16);border-color:var(--accent);color:var(--fg)}
.step{display:inline-flex;align-items:center;height:34px;border:1px solid var(--border-strong);border-radius:8px;overflow:hidden}
.step span{width:34px;height:34px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:15px}
.step b{min-width:26px;text-align:center;font:600 13px 'IBM Plex Mono'}
.al .own{margin-left:auto;font:10.5px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap}
.al .own.n{color:var(--success)}
.pick{display:flex;flex-direction:column;gap:9px;border-top:1px solid var(--border);padding-top:10px}
.pick .q{font-size:13px;color:var(--fg-body)}
.pick .pf{height:40px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-sunken);display:flex;align-items:center;gap:8px;padding:0 10px;font-size:14px;color:var(--fg-placeholder)}
.tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.tile{display:flex;flex-direction:column;gap:4px}
.tile .ar{aspect-ratio:63/88;border-radius:6px;overflow:hidden;border:1px solid var(--border)}
.tile .ar img{width:100%;height:100%;object-fit:cover;display:block}
.tile span{font:10px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap}
.dim{opacity:.4}

/* search sheet / rows */
.ssh{display:flex;align-items:center;gap:6px;padding:14px 8px 12px 14px;border-bottom:1px solid var(--border)}
.ssh .fld{height:44px;border-radius:10px;font-size:16px}
.sx{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:15px;flex:none}
.slab{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 6px}
.slab h3{margin:0;font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.slab a{font:500 13.5px 'IBM Plex Sans';color:var(--accent);text-decoration:underline;text-underline-offset:3px}
.smeta{padding:12px 16px 4px;font:11.5px 'IBM Plex Mono';color:var(--fg-faint)}
.srow{display:flex;align-items:center;gap:12px;min-height:72px;padding:8px 10px 8px 16px;border-top:1px solid var(--border)}
.srow.first{border-top:0}
.srow .th{width:40px;height:56px;border-radius:4px;overflow:hidden;flex:none;box-shadow:0 0 0 1px rgba(0,0,0,.35),0 4px 10px rgba(0,0,0,.35)}
.srow .th img{width:100%;height:100%;object-fit:cover;display:block}
.srow .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.srow .tx b{font-size:15px;font-weight:600;line-height:1.3}
.srow .tx b em{font-style:normal;color:var(--accent)}
.srow .tx span{font:11.5px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.srow .tx span i{font-style:normal;color:var(--border-dashed)}
.srow .tx span u{text-decoration:none;color:var(--fg-body)}
.srow .tx span strong{font-weight:500;color:var(--fg-body)}
.srow .tx span.up strong{color:var(--success)}
.srow .bm{width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:var(--accent);flex:none}
.srow .bm.inv{visibility:hidden}
.addp{width:44px;height:44px;border-radius:10px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;color:var(--fg);flex:none}
.srow.lit{box-shadow:inset 0 0 0 2px var(--accent);border-radius:8px}
.dd .srow{min-height:58px;padding:7px 14px}
.dd .srow .th{width:30px;height:42px;border-radius:3px}
.dd .srow .tx b{font-size:14px}
.dd .srow .tx span{font-size:11px}
.dd .addp{width:34px;height:34px;border-radius:8px}
.sbox{margin:18px 16px 0;padding:18px;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-sunken);display:flex;flex-direction:column;gap:8px}
.sbox b{font-size:15.5px}
.sbox p{font-size:14px;line-height:1.6;color:var(--fg-muted)}
.kbd{position:absolute;left:0;right:0;bottom:0;height:291px;background:#2A2723;display:flex;flex-direction:column;gap:9px;padding:10px 4px 0;z-index:30}
.kbd .r{display:flex;gap:6px;justify-content:center}
.kbd .r i{width:33px;height:42px;border-radius:5px;background:#4A4640;display:block}
.kbd .r i.w{width:180px}.kbd .r i.m{width:44px;background:#3A3732}
.kbd .t{font:10px 'IBM Plex Mono';color:#8f877a;text-align:center;margin-top:6px}

/* card details */
.cd-sheet{position:absolute;left:0;right:0;bottom:0;top:118px;z-index:20;background:var(--surface);border-radius:16px 16px 0 0;border-top:1px solid var(--border-strong);padding:10px 18px 0;display:flex;flex-direction:column;gap:12px;overflow:hidden}
.grab{width:40px;height:4px;border-radius:2px;background:var(--border-dashed);align-self:center}
.cd-n{font:700 22px 'Cinzel',serif;line-height:1.2}
.cd-t{font:12px 'IBM Plex Mono';color:var(--fg-muted)}
.cd-o{font-size:14px;line-height:1.55;color:var(--fg-body)}
.cd-o i{color:var(--fg-muted)}
.rcpt{border:1px solid var(--border);border-radius:10px;background:var(--bg);padding:14px 16px;display:flex;flex-direction:column;gap:8px}
.rcpt .hd{display:flex;align-items:center;justify-content:space-between;gap:12px}
.rcpt .hd span{font:10px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint)}
.rcpt .hd a{font:500 13px 'IBM Plex Sans';color:var(--accent);text-decoration:underline;text-underline-offset:3px;min-height:32px;display:inline-flex;align-items:center}
.rcpt .v{font:13px 'IBM Plex Mono';color:var(--fg-faint)}
.rcpt .v.o{color:var(--accent)}
.rcpt .dk2{display:flex;justify-content:space-between;font-size:13px;color:var(--fg-body)}
.rcpt .dk2 span{font:12px 'IBM Plex Mono';color:var(--fg-faint)}
.wbtn{align-self:flex-start;height:36px;border:1px solid var(--accent);border-radius:8px;padding:0 12px;display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--accent)}
.lnk{font-size:14px;color:var(--accent)}
.cdm{position:absolute;left:250px;top:90px;width:800px;height:720px;z-index:20;background:var(--surface);border:1px solid var(--border-strong);border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.6);display:flex;gap:28px;padding:32px}
.cdm .art{width:340px;flex:none;display:flex;flex-direction:column;gap:12px;align-items:center}
.cdm .art img{width:340px;border-radius:16px;display:block}
.cdm .col{flex:1;min-width:0;display:flex;flex-direction:column;gap:14px}
.cdm .cx{position:absolute;right:16px;top:16px;width:34px;height:34px;border-radius:8px;background:var(--elevated);display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:13px}

/* toast */
.toast{position:absolute;z-index:40;display:flex;align-items:center;gap:12px;background:var(--surface-raised);border:1px solid var(--border-strong);border-radius:10px;padding:0 6px 0 14px;min-height:48px;box-shadow:0 14px 34px rgba(0,0,0,.55);font-size:13.5px;color:var(--fg)}
.toast .ok{color:var(--success)}
.toast a{margin-left:auto;font:600 13.5px 'IBM Plex Sans';color:var(--accent);padding:0 10px;min-height:44px;display:flex;align-items:center}

/* receipt (AddedReceipt) */
.rc{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:26px 6px 0}
.rc .ok{width:44px;height:44px;border-radius:50%;border:1.5px solid var(--success);color:var(--success);display:flex;align-items:center;justify-content:center;font-size:18px}
.rc b{font:700 19px 'Cinzel',serif}
.rc p{font-size:14px;color:var(--fg-body);line-height:1.55}
.rc .cnt{font:12px 'IBM Plex Mono';color:var(--fg-faint)}
.rc .went{width:100%;display:flex;flex-direction:column;gap:6px;text-align:left;margin-top:6px}
.rc .went div{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--fg-body);padding:6px 10px;background:var(--surface-inset);border-radius:8px}
.rc .went img{width:22px;height:31px;border-radius:3px;object-fit:cover}
.rc .went span{margin-left:auto;font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.rc a.h{font-size:13.5px;color:var(--accent);text-decoration:underline;text-underline-offset:3px}
.rc .btns{display:flex;flex-direction:column;gap:8px;width:100%;margin-top:6px}
.side480 .rc .btns{flex-direction:row;justify-content:center}

/* desktop search dropdown */
.dd{position:absolute;left:74px;top:73px;width:540px;z-index:25;display:flex;flex-direction:column;gap:8px}
.dd .df{height:48px;border:1px solid var(--accent);border-radius:10px;background:var(--bg);display:flex;align-items:center;gap:10px;padding:0 14px;font-size:15px;color:var(--fg);box-shadow:0 18px 40px rgba(0,0,0,.45)}
.dd .df .k{margin-left:auto;font:500 10.5px 'IBM Plex Mono';color:var(--fg-faint);border:1px solid var(--border-strong);border-radius:5px;padding:2px 6px}
.dd .dp{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-raised);padding:6px 0;box-shadow:0 22px 50px rgba(0,0,0,.6);display:flex;flex-direction:column}
.dd .slab{padding:8px 14px 6px}
.dd .slab a{font-size:13px}
.dd .foot{display:flex;justify-content:space-between;border-top:1px solid var(--border);padding:9px 14px 5px;font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.dd .wayrow{margin:6px 14px 4px;min-height:44px;display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:9px;background:var(--bg);padding:0 12px;font-size:13.5px}
.dd .wayrow .a{color:var(--accent)}
.dd .wayrow .chev{margin-left:auto;color:var(--fg-faint)}
.dd .meta{padding:8px 14px 2px;font:11px 'IBM Plex Mono';color:var(--fg-faint)}

/* rail overlays */
.rslot{position:absolute;left:12px;width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);z-index:4}
.rslot.mut{color:var(--fg-muted)}
.rslot.on{background:var(--elevated);color:var(--fg)}
.rrule{position:absolute;left:19px;width:24px;height:1px;background:var(--border-strong);z-index:4}
.rcover{position:absolute;left:0;width:61px;background:var(--surface-rail);z-index:3}
.rtag{position:absolute;left:58px;z-index:6;display:flex;align-items:center;gap:8px;height:30px;padding:0 10px;border-radius:8px;background:var(--surface-raised);border:1px solid var(--border-strong);font:12.5px 'IBM Plex Sans';color:var(--fg);white-space:nowrap;box-shadow:0 10px 24px rgba(0,0,0,.45)}
.rtag span{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.roff{position:absolute;left:8px;width:46px;z-index:4;display:flex;flex-direction:column;align-items:center;gap:4px;border-radius:8px;padding:6px;background:rgba(222,170,41,.14);font:600 9px 'IBM Plex Mono';color:var(--fg)}
.roff i{width:8px;height:8px;border-radius:50%;background:var(--warning)}
</style>"""

# ---------------------------------------------------------------- glyphs
def svg(paths, size=19, sw=1.5, vb=20):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 {vb} {vb}" fill="none" stroke="currentColor" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths}</svg>')

NAV = {
 'home': '<path d="M3 9.2 10 3.6l7 5.6V16a1 1 0 0 1-1 1h-3.5v-4.2h-5V17H4a1 1 0 0 1-1-1z"/>',
 'collection': '<rect x="3.2" y="3.2" width="5.8" height="5.8" rx="1.2"/><rect x="11" y="3.2" width="5.8" height="5.8" rx="1.2"/><rect x="3.2" y="11" width="5.8" height="5.8" rx="1.2"/><rect x="11" y="11" width="5.8" height="5.8" rx="1.2"/>',
 'commanders': '<path d="M3 14.5 4.4 6l3.2 3.6L10 4l2.4 5.6L15.6 6 17 14.5z"/><path d="M3 16.6h14"/>',
 'decks': '<rect x="6.6" y="3.2" width="10" height="13" rx="1.6"/><path d="M4.2 5.4A1.6 1.6 0 0 0 3.4 6.8v8.6a1.6 1.6 0 0 0 1.6 1.6h8.2"/>',
 'friends': '<circle cx="7.6" cy="7.4" r="2.7"/><path d="M2.8 16.4c.5-2.9 2.4-4.5 4.8-4.5s4.3 1.6 4.8 4.5"/><path d="M12.4 4.9a2.4 2.4 0 1 1 1.3 4.5"/><path d="M14.6 11.6c1.5.5 2.4 1.9 2.7 4"/>',
 'add': '<path d="M10 3.6v12.8M3.6 10h12.8"/>',
 'search': '<circle cx="8.8" cy="8.8" r="5.6"/><path d="m13 13 4 4"/>',
}
def nav(k, size=19):
    return svg(NAV[k], size)
PLUS = svg(NAV['add'], 18, 1.6)
SEARCH = svg(NAV['search'], 20, 1.5)
CAM = ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">'
       '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>')
BOOK = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" '
        'stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/></svg>')
DL = ('<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 2v7M7 9L4 6M7 9l3-3M2 12h10" '
      'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>')
XS = ('<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" '
      'stroke-width="1.5" stroke-linecap="round"/></svg>')

# ---------------------------------------------------------------- captures
def cut(src, sx, sy, w, h, dx, dy, scale=0.5, full=780, z=0):
    """A crop of a capture: the region (sx,sy,w,h) in frame px, placed at (dx,dy). Phone captures are 780 wide (scale .5)."""
    iw = full * scale
    zs = f';z-index:{z}' if z else ''
    return (f'<div class="cut" style="left:{dx}px;top:{dy}px;width:{w}px;height:{h}px{zs}">'
            f'<img src="art/{src}" alt="" style="left:{-sx}px;top:{-sy}px;width:{iw}px"></div>')

def dcut(src, sx, sy, w, h, dx, dy, z=0):
    return cut(src, sx, sy, w, h, dx, dy, 1, 1300, z)

# ---------------------------------------------------------------- phone shell
def header(items=('search', 'help', 'av'), shown=False, cls='', air=None):
    out = []
    for it in items:
        if it == 'search': out.append(f'<span class="ib" style="margin-right:2px">{SEARCH}</span>')
        elif it == 'search-on': out.append(f'<span class="ib on" style="margin-right:2px">{SEARCH}</span>')
        elif it == 'add': out.append(f'<span class="ib new" style="margin-right:2px">{PLUS}</span>')
        elif it == 'add-on': out.append(f'<span class="ib on new" style="margin-right:2px">{PLUS}</span>')
        elif it == 'help': out.append('<span class="hq" style="margin-right:6px">?</span>')
        elif it == 'av': out.append('<span class="av">S</span>')
        elif it == 'off': out.append('<span class="offp"><i></i>Offline</span>')
        elif it == 'inst': out.append(f'<span class="inst"><span class="b">{DL}</span><span class="x">{XS}</span></span>')
    a = ''
    if air:
        x, w, t = air
        a = f'<div class="air" style="left:{x}px;width:{w}px"><span>{t}</span></div>'
    return (f'<header class="mhd{" shown" if shown else ""} {cls}"><span class="wm"><img src="art/p-collection.webp" alt=""></span>'
            f'<div class="clu">{"".join(out)}</div>{a}</header>')

TABS = [('home', 'Home'), ('collection', 'Collection'), ('commanders', 'Commanders'), ('decks', 'Decks'), ('friends', 'Friends')]

def tabbar(active='decks', extra=None, pressed=None):
    """extra: (index, key, label, cls) to insert a slot."""
    items = list(TABS)
    if extra:
        i, k, l = extra
        items.insert(i, (k, l))
    s = ''
    for k, l in items:
        c = 'on' if k == active else ('pr' if k == pressed else '')
        nw = ' new' if extra and k == extra[1] else ''
        s += f'<a class="{c}{nw}">{nav(k)}<span>{l}</span></a>'
    return f'<nav class="tbar" aria-label="Primary">{s}</nav>'

def ph(inner, cls=''):
    return f'<div class="ph {cls}">{inner}</div>'

def dk(inner):
    return f'<div class="dk">{inner}</div>'

# The deck page (p-deck-your-deck): the tab strip, Shopping, Lock, sort, the list, the dock, at 390.
def deck_page(header_html=None, rows_over='', w=390):
    """With a header: the header has returned (quick return), so the page shows under it."""
    if header_html:
        body = cut('p-deck-your-deck.webp', 0, 0, w, 625, 0, 79) + cut('p-deck-your-deck.webp', 0, 704, w, 66, 0, 704)
        return body + rows_over.replace('{Y}', '79') + header_html
    return cut('p-deck-your-deck.webp', 0, 0, w, 770, 0, 0) + rows_over.replace('{Y}', '0')

def ghalta_row(owned=False, y=582, lit=False):
    """Ghalta, Primal Hunger in the list in place of the capture's Gigantic Big Bear (alphabetical: after Elvish Visionary)."""
    dot = '<span class="dot"></span>' if owned else '<span class="dot d"></span>'
    buy = '' if owned else '<span class="buy">$</span>'
    return (f'<div class="drow{" lit" if lit else ""}" style="top:calc({y}px + {{Y}}px)">{dot}<span class="n">Ghalta, Primal Hunger</span>{buy}'
            f'<span class="pips"><span class="pip c">10</span><span class="pip g"></span><span class="pip g"></span></span><span class="x">✕</span></div>')

# ---------------------------------------------------------------- desktop rail overlays (d-deck-list: search 73, rule 117, home 132, pitch 42)
def rail_slot(y, glyph, cls='', new=True):
    return f'<span class="rslot {cls}{" new" if new else ""}" style="top:{y}px">{glyph}</span>'

# ---------------------------------------------------------------- sheets
def add_sheet(body, foot_sum='Nothing on the list yet', save='Save 0 copies', save_off=True, side=False, search_on=False, query='',
              scan=True, title='Add cards', sub='', search=True):
    cls = 'sheet side480' if side else 'sheet full'
    fld = (f'<span class="fld on">{SEARCH}<span>{query}</span><span class="caret"></span></span>' if search_on else
           f'<span class="fld">{SEARCH}<span>Search any card</span></span>')
    sc = f'<span class="scanb">{CAM}Scan</span>' if scan else ''
    srow = f'<div class="sh-s">{fld}{sc}</div>' if search else ''
    sb = f'<span class="sub">{sub}</span>' if sub else ''
    foot = (f'<div class="sh-f"><span class="sum">{foot_sum}</span><span class="prim{" off" if save_off else ""}">{save}</span></div>'
            if save else '')
    return (f'<div class="{cls}"><div class="sh-h"><h2>{title}{sb}</h2><span class="sh-x">✕</span></div>{srow}'
            f'<div class="sh-b">{body}</div>{foot}</div>')

EMPTY_BODY_PHONE = ('<p class="lede">Search every card, not just ones you own. Pick one and it goes on the list. Nothing is saved until you press Save.</p>'
                    '<div class="wayrow"><span class="a">↻</span><span>Have a file? <span class="a">Upload it instead</span></span><span class="chev">›</span></div>')
EMPTY_BODY_DESK = ('<p class="lede">Search every card, not just ones you own. Pick one and it goes on the list below. Set its printing, foil and how many, then keep going.</p>'
                   '<p class="lede" style="font-size:13px;color:var(--fg-muted)">Nothing is saved until you press Save.</p>')

def line(img, name, chip=None, need=False, qty=1, foil=False, own='new to you', picker=None, collapsed=False):
    chip_html = (f'<span class="chip need">Choose a printing ▴</span>' if need else f'<span class="chip">{chip} ▾</span>')
    own_cls = ' n' if own == 'new to you' else ''
    r2 = '' if need or collapsed else (f'<div class="r2"><span class="fin{" on" if foil else ""}">◆ Foil</span>'
                                       f'<span class="step"><span>−</span><b>{qty}</b><span>+</span></span><span class="own{own_cls}">{own}</span></div>')
    pk = picker or ''
    return (f'<div class="al{" need" if need else ""}"><div class="r1"><span class="th"><img src="art/{img}" alt=""></span>'
            f'<span class="nm"><b>{name}</b>{chip_html}</span><span class="rx">✕</span></div>{r2}{pk}</div>')

def picker(n, tiles, phone=True):
    q = f'Which printing? {n} printings.' if phone else f'Which printing are you adding? {n} printings.'
    t = ''.join(f'<div class="tile"><div class="ar"><img src="art/{i}" alt=""></div><span>{c}</span></div>' for i, c in tiles)
    return (f'<div class="pick"><p class="q">{q}</p><div class="pf">{SEARCH}<span>Set, code or number</span></div>'
            f'<div class="tiles">{t}</div></div>')

GHALTA_TILES = [('c-ghalta.jpg', 'FDC · #6'), ('c-ghalta.jpg', 'RIX · #130'), ('c-ghalta.jpg', 'CMM · #289')]

def list_head(k, desk=False):
    return f'<div class="lh"><span>On the list · {k}</span>{"<i>newest first</i>" if desk else ""}</div>'

def toast(text, left, bottom, width, undo=True):
    u = '<a>Undo</a>' if undo else ''
    return f'<div class="toast" style="left:{left}px;bottom:{bottom}px;width:{width}px"><span class="ok">✓</span><span>{text}</span>{u}</div>'

def kbd():
    rows = ''.join('<div class="r">' + '<i></i>' * n + '</div>' for n in (10, 9))
    return (f'<div class="kbd">{rows}<div class="r"><i class="m"></i>' + '<i></i>' * 7 + '<i class="m"></i></div>'
            '<div class="r"><i class="m"></i><i class="m"></i><i class="w"></i><i class="m"></i></div></div>')

def srow(img, name_html, meta_html, wish=False, add=True, first=False, lit=False, desk=False, new=True):
    bm = f'<span class="bm{"" if wish else " inv"}">{BOOK}</span>'
    ad = f'<span class="addp{" new" if new else ""}" aria-label="Add to collection">{svg(NAV["add"], 16 if desk else 18, 1.6)}</span>' if add else ''
    return (f'<div class="srow{" first" if first else ""}{" lit" if lit else ""}"><span class="th"><img src="art/{img}" alt=""></span>'
            f'<span class="tx"><b>{name_html}</b><span>{meta_html}</span></span>{bm}{ad}</div>')

def owned(n, deck=None, up=False):
    o = f'<strong>×{n}</strong> owned' if n else 'not owned'
    d = f'<i> · </i><u>in {deck}</u>' if deck else ''
    return (f'<span class="up">' if up else '') + o + d + ('</span>' if up else '')

# ---------------------------------------------------------------- board scaffolding
def head(kick, title, lede, tag='R1'):
    return (f'<div class="bh"><div class="kick"><span class="tag">{tag}</span>{kick}</div><h2>{title}</h2>'
            f'<p>{lede}</p></div>')

def fr(lab, inner, cap=''):
    c = f'<p class="cap">{cap}</p>' if cap else ''
    return f'<div class="fr"><div class="lab">{lab}</div>{inner}{c}</div>'

def frames(*xs):
    return '<div class="frames">' + ''.join(xs) + '</div>'

def rule(h, items, ordered=True):
    t = 'ol' if ordered else 'ul'
    return f'<div class="rule8"><h4>{h}</h4><{t}>' + ''.join(f'<li>{x}</li>' for x in items) + f'</{t}></div>'

def side(*notes):
    return '<div class="side">' + ''.join(f'<div class="note">{n}</div>' for n in notes) + '</div>'

def doc(title, body, width, height=1000):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>{FONTS}{CSS}</helmet>
<div class="board" style="width:{width}px">{body}</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{width},"height":{height}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""

def bar_strip(w, inner, lab):
    cls = ' w360' if w < 390 else ''
    return (f'<div class="strip"><div class="lab" style="width:{w}px">{lab}</div><div class="{cls.strip()}" style="position:relative;width:{w}px;height:74px;'
            f'border:1px solid var(--border-strong);border-radius:8px;overflow:hidden">{inner}</div></div>')

def hdr_strip(w, inner, lab):
    return (f'<div class="strip"><div class="lab" style="width:{w}px">{lab}</div><div style="position:relative;width:{w}px;height:79px;'
            f'border:1px solid var(--border-strong);border-radius:8px;overflow:hidden">{inner}</div></div>')

def col(*xs, gap=22):
    return f'<div style="display:flex;flex-direction:column;gap:{gap}px">' + ''.join(xs) + '</div>'
