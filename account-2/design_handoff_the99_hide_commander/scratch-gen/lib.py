"""Hide a commander (account 2, 2026-10-31): shared pieces. Every surface is the shipped one, measured from the
shipped About captures (public/about/pages/amonkhet, 390 at 2x and 1300 at 1.5x) and the components named beside
each helper. Chrome that does not change (phone header, page head + rack, tab bar, desktop rail) is the capture
itself; rows, strips and anything the round changes are drawn over it at the shipped values."""

FONTS = ('<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&amp;'
         'family=IBM+Plex+Mono:wght@400;500;600&amp;family=Cinzel:wght@600;700;800&amp;display=swap" rel="stylesheet">')

CSS = """<style>
body{margin:0;background:#0D0B09}
*{box-sizing:border-box}
p{margin:0}
.board{--bg:#14110E;--surface:#1E1A15;--surface-raised:#211D18;--surface-rail:#1A1611;--surface-sunken:#18140F;--elevated:#29241F;--elevated-hover:#201C17;--border:#2B241B;--border-strong:#3A3229;--border-dashed:#494037;--fg:#EDE6D8;--fg-body:#C0B8A6;--fg-muted:#A59C89;--fg-faint:#948B78;--fg-locked:#6E6654;--accent:#CF8745;--accent-text:#CF8745;--accent-hover:#DE9757;--accent-shadow:#6B482A;--accent-dim:#6B482A;--accent-mid:#AB6E37;--success:#6FA368;--warning:#DEAA29;--danger:#C6533F;--w:#F4E9C4;--u:#3A6AA5;--b:#98748F;--r:#C05A3E;--g:#4B7A46;
 padding:48px 56px 64px;background:#0D0B09;font-family:'IBM Plex Sans',sans-serif;color:var(--fg);display:flex;flex-direction:column;gap:40px}
.m{font-family:'IBM Plex Mono',monospace}
.cz{font-family:'Cinzel',serif}
.bh{display:flex;flex-direction:column;gap:9px;max-width:1500px}
.kick{display:flex;align-items:center;gap:10px;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.kick .tag{background:var(--accent);color:#14110E;border-radius:5px;padding:4px 8px;font-weight:600}
.bh h2{margin:0;font:700 30px 'Cinzel',serif}
.bh p{font-size:14px;line-height:1.6;color:var(--fg-body);max-width:1240px;text-wrap:pretty}
.bh p b{color:var(--fg)}
code{font:12px 'IBM Plex Mono',monospace;color:var(--fg-body)}
.frames{display:flex;flex-wrap:nowrap;gap:44px;align-items:flex-start}
.fr{display:flex;flex-direction:column;gap:12px;flex:none}
.fr>.lab{width:0;min-width:100%;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.fr>.lab b{color:var(--accent);font-weight:600}
.fr>.cap{width:0;min-width:100%;font-size:13px;line-height:1.55;color:var(--fg-muted);text-wrap:pretty}
.fr>.cap b{color:var(--fg-body)}
.rule{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);padding:20px 24px;max-width:1240px}
.rule h4{margin:0 0 10px;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.rule ol,.rule ul{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.rule b{color:var(--fg)}
.rule i{color:var(--fg)}
.draft{font:600 9px 'IBM Plex Mono';letter-spacing:.06em;color:#0D0B09;background:#8FA6BE;border-radius:3px;padding:1px 5px;margin-left:6px;vertical-align:2px}
.new{outline:1.5px dashed rgba(207,135,69,.9);outline-offset:3px;border-radius:6px}

/* device frames */
.ph{position:relative;width:390px;height:844px;border-radius:24px;border:1px solid var(--border-strong);background:var(--bg);overflow:hidden;display:flex;flex-direction:column;flex:none}
.ph>.cap-img{display:block;width:390px;flex:none}
.ph .scroll{flex:1;min-height:0;overflow:hidden;position:relative}
.ph .bar{position:absolute;left:0;right:0;bottom:0;width:390px;display:block;z-index:4}
.dk{position:relative;width:1300px;height:900px;border-radius:12px;border:1px solid var(--border-strong);background:var(--bg);overflow:hidden;display:flex;flex:none}
.dk>.rail{display:block;width:62px;height:900px;flex:none}
.dk>.main{flex:1;min-width:0;display:flex;flex-direction:column;border-left:0}
.dk .scroll{flex:1;min-height:0;overflow:hidden;position:relative}
.cap-img{display:block}

/* place head + strip (commanders-place-head.tsx, place-strip.tsx) */
.phd{padding:28px 34px 0}
.phd .t{font:700 30px/45px 'Cinzel',serif;color:var(--fg)}
.phd .c{font:12px/18px 'IBM Plex Mono',monospace;color:var(--fg-faint);margin-top:4px}
.strip{display:flex;align-items:stretch;border-bottom:1px solid var(--border);flex:none}
.strip.p{height:48px;gap:2px;padding:0 8px}
.strip.d{height:40px;gap:4px;padding:0 24px;margin-top:13px}
.strip a{display:flex;align-items:center;justify-content:center;min-width:44px;font-size:14px;font-weight:500;color:var(--fg-muted);text-decoration:none;white-space:nowrap}
.strip.p a{padding:0 11px}
.strip.d a{padding:0 10px}
.strip a.on{font-weight:600;color:var(--fg);box-shadow:inset 0 -2px 0 var(--accent)}
.strip a em{margin-left:6px;font:400 11px 'IBM Plex Mono',monospace;font-style:normal;color:var(--fg-faint)}
.strip a.on em{color:var(--accent-text)}

/* page header (page-header.tsx) */
.pgh{display:flex;flex-direction:column;padding:12px 16px 0}
.pgh .t{font:700 22px 'Cinzel',serif;color:var(--fg)}
.pgh .s{font:10.5px 'IBM Plex Mono',monospace;color:var(--fg-faint);margin-top:4px}
.dk .pgh{flex-direction:row;align-items:center;gap:12px;padding:16px 22px;border-bottom:1px solid var(--border)}
.dk .pgh .t{font-size:20px}
.dk .pgh .s{font-size:11px;margin-top:0}
.cnt{font:12px 'IBM Plex Mono',monospace;color:var(--fg-muted);padding:14px 16px 13px;border-bottom:1px solid var(--border)}
.dk .cnt{padding:14px 34px 13px}

/* the commander row (commander-row.tsx) */
.list{display:flex;flex-direction:column;gap:10px;padding:12px 14px}
.dk .list{gap:12px;padding:14px 34px 34px}
.crow{position:relative;border-bottom:1px solid var(--border)}
.crow .band{position:relative;height:208px;overflow:hidden}
.crow .art{position:absolute;left:0;top:0;width:285px;height:208px;object-fit:cover;opacity:.92;
 -webkit-mask-image:linear-gradient(90deg,#000 62%,transparent 100%);mask-image:linear-gradient(90deg,#000 62%,transparent 100%)}
.crow .scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,17,14,0) 0%,rgba(20,17,14,0) 60%,rgba(20,17,14,.73) 73%,rgba(20,17,14,.73) 100%)}
.crow .lbl{position:relative;display:flex;align-items:flex-end;gap:10px;height:100%;padding:12px 13px}
.dk .crow .lbl{padding:20px 24px}
.crow .rk{font:600 17px/1.2 'IBM Plex Mono',monospace;color:var(--fg-faint);min-width:16px;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,.6)}
.crow .rk.one{color:var(--accent-text)}
.crow .nm{flex:1;min-width:0;display:flex;align-items:center;gap:6px}
.crow .nm span.n{font:600 14.5px/1.2 'Cinzel',serif;color:var(--fg);text-shadow:0 1px 3px rgba(0,0,0,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pips{display:inline-flex;gap:3px;flex:none}
.pips i{display:block;width:8px;height:8px;border-radius:1.5px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.4)}
.fit{display:flex;flex-direction:column;align-items:center;flex:none;background:var(--bg);border:1px solid var(--border-strong);border-radius:9px;padding:6px 9px}
.dk .fit{padding:7px 11px}
.fit b{font:600 22px/1 'IBM Plex Mono',monospace;color:var(--fg)}
.fit span{font:10px 'IBM Plex Mono',monospace;letter-spacing:.1em;color:var(--fg-faint);margin-top:2px}
.crow .body{display:flex;flex-direction:column;gap:8px;padding:13px}
.dk .crow .body{padding:16px 24px 18px}
.crow .pr{font-size:13.5px;line-height:1.5;color:var(--fg-body)}
.crow .gp{font-size:12.5px;line-height:1.45;color:var(--fg-muted)}
.crow .gp b{color:var(--fg);font-weight:600}
.crow .figs{display:flex;align-items:center;gap:10px;margin-top:2px;font:11.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.crow .figs .sep{color:var(--fg-locked);font-size:11px}
.crow .figs .pd{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--success);margin-right:6px;vertical-align:1px}
.crow .figs .pv{font-size:12.5px;color:var(--fg-body)}
.crow .figs .src{margin-left:auto;font-size:10px;color:var(--fg-locked)}
.fb{margin-top:2px;max-width:520px}
.fb .tr{height:6px;border-radius:99px;background:var(--elevated);overflow:hidden;display:flex}
.dk .fb .tr{height:8px}
.fb .fill{display:flex;height:100%}
.fb .lg{display:none;gap:12px;margin-top:6px}
.dk .fb .lg{display:flex}
.fb .lg span{display:flex;align-items:center;gap:5px;font:9.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.fb .lg i{display:block;width:7px;height:7px;border-radius:2px}

.hctl .hit{position:relative}
/* R1b: the Hide glyph at the end of the row's figures line: bare, --fg-faint, 16px, 44px target that adds no height */
.hb{flex:none;position:relative;z-index:2;width:44px;height:44px;margin:-15px -14px -15px 0;display:flex;align-items:center;justify-content:center;background:transparent;border:0;padding:0;color:var(--fg-faint);cursor:pointer}
.hb svg{width:16px;height:16px;padding:0;box-sizing:content-box;border-radius:6px}
.hb.hov{color:var(--fg)}
.hb.prs{color:var(--fg)}
.hb.prs svg{background:var(--elevated);padding:5px;margin:-5px}
.hb.foc svg{outline:2px solid var(--accent);outline-offset:4px}
.hb.new{outline:1.5px dashed rgba(207,135,69,.9);outline-offset:-4px;border-radius:8px}
.crow .figs .src+.hb{margin-left:-4px}
.fbrow{display:flex;align-items:flex-start;gap:6px}.fbrow .fb{flex:1;max-width:none}.dk .fbrow .fb{flex:0 1 520px}
.hb.bb{margin:-19px -14px -19px 0}.dk .hb.bb{margin:-18px -14px -18px auto}
.hfoot{display:flex;justify-content:flex-end;margin-top:-2px}
.hl{position:relative;z-index:2;display:flex;align-items:center;gap:6px;height:44px;margin:-12px -10px -14px 0;padding:0 10px;background:transparent;border:0;color:var(--fg-faint);font:11.5px 'IBM Plex Mono',monospace;cursor:pointer}
.hl svg{width:14px;height:14px}
.hl.new{outline:1.5px dashed rgba(207,135,69,.9);outline-offset:-6px;border-radius:8px}
/* THE PLATE (full-card-trigger.tsx): 26px drawn in a 44px target, opaque --bg, one --border-strong hairline, radius 7 */
.hit{position:absolute;z-index:2;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:transparent;border:0;padding:0;cursor:pointer}
.plate{width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:7px;border:1px solid var(--border-strong);background:var(--bg);color:var(--fg-muted)}
.plate svg{width:15px;height:15px}
.hit.hov .plate{background:var(--elevated-hover);color:var(--fg)}
.hit.prs .plate{background:var(--elevated);color:var(--fg);border-color:color-mix(in srgb,var(--accent) 60%,transparent)}
.hit.foc .plate{outline:2px solid var(--accent);outline-offset:2px}
.tgt{outline:1px dashed rgba(143,166,190,.8);outline-offset:-1px;border-radius:4px}

/* the undo row (decklist-row.tsx UndoRow) */
.urow{display:flex;align-items:center;gap:12px;min-height:48px;padding:0 14px;border-radius:8px;background:var(--surface-sunken);border:1px dashed var(--border-strong)}
.dk .urow{min-height:44px;padding:0 16px}
.urow .t{flex:1;min-width:0;font:12px 'IBM Plex Mono',monospace;color:var(--fg-locked);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tb{flex:none;display:inline-flex;align-items:center;min-height:44px;background:transparent;border:0;padding:0;cursor:pointer;font:600 12.5px/1.4 'IBM Plex Sans',sans-serif;color:var(--accent-text)}
.tb span{border-bottom:1px solid var(--accent-shadow)}
.tb.dis{opacity:.5}
.merr{font-size:12px;line-height:1.5;color:var(--danger);padding:6px 2px 0}

/* the hidden row: Help me choose's result row (choose-row.tsx) with Unhide in place of the figures */
.hlist{display:flex;flex-direction:column;gap:8px;padding:12px 14px}
.dk .hlist{padding:16px 34px 34px;max-width:788px}
.hrow{position:relative;display:grid;grid-template-columns:40px minmax(0,1fr) auto;column-gap:11px;align-items:center;padding:10px 6px 10px 12px;min-height:44px;border-radius:10px;border:1px solid var(--border);background:var(--surface-rail)}
.dk .hrow{column-gap:16px;padding:12px 10px 12px 15px;border-radius:11px}
.thumb{width:40px;height:56px;border-radius:5px;overflow:hidden;background:var(--elevated);box-shadow:inset 0 0 0 1px rgba(0,0,0,.4)}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.hrow .nm{display:flex;align-items:center;gap:8px;min-width:0}
.hrow .nm span.n{font:600 14px 'Cinzel',serif;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.dk .hrow .nm span.n{font-size:16px}
.hrow .mt{font:11px 'IBM Plex Mono',monospace;color:var(--fg-faint);margin-top:5px}
.hrow .tb{padding:0 8px}
.hrow.gone{background:var(--surface-sunken);border:1px dashed var(--border-strong)}

/* zero state (zero-state.tsx) */
.zs{display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px 22px;text-align:center}
.dk .zs{padding:34px 22px 38px}
.zs .dr{display:flex;gap:7px}
.zs .dr i{display:block;width:10px;height:10px;transform:rotate(45deg);border:1px solid var(--border-strong)}
.zs h3{margin:0;font:600 19px 'Cinzel',serif;color:var(--fg)}
.zs p{font-size:13.5px;line-height:1.6;color:var(--fg-muted);max-width:520px}
.zs p b{color:var(--fg);font-weight:600}
.zs .acts{margin-top:6px;display:flex;flex-direction:column;gap:9px;align-self:stretch}
.dk .zs .acts{flex-direction:row;align-self:auto;margin-top:4px}
.btnp{display:inline-flex;align-items:center;justify-content:center;height:48px;border-radius:10px;font:600 14px 'IBM Plex Sans';background:var(--fg);color:var(--bg);border:0;padding:0 16px;text-decoration:none}
.dk .btnp{height:32px;border-radius:8px;font-size:12.5px;padding:0 14px}
.zs .aside{align-self:center;font:11.5px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.inl{display:inline-flex;vertical-align:-3px;margin:0 2px}
.inl .plate{width:20px;height:20px;border-radius:5px}
.inl .plate svg{width:12px;height:12px}

/* the shared toast (edit-toast.tsx ToastFrame, center) */
.toast{position:absolute;left:50%;transform:translateX(-50%);z-index:5;display:flex;align-items:center;gap:14px;width:calc(100% - 32px);max-width:420px;padding:4px 6px 4px 16px;border-radius:10px;border:1px solid var(--border-strong);background:var(--elevated);box-shadow:0 12px 40px rgba(0,0,0,.5)}
.ph .toast{bottom:90px}
.dk .toast{bottom:24px;margin-left:31px}
.toast .tt{flex:1;min-width:0;padding:8px 0;font-size:13.5px;color:var(--fg)}
.toast .ta{flex:none;height:36px;padding:0 12px;border-radius:8px;border:1px solid var(--border-strong);background:transparent;color:var(--fg);font:600 13px 'IBM Plex Sans'}

/* commander page (detail.tsx) */
.cp-band{position:relative;height:288px;overflow:hidden;flex:none}
.cp-band img.a{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cp-band .scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,17,14,0) 0%,rgba(20,17,14,0) 50.7%,rgba(20,17,14,.73) 66.7%,rgba(20,17,14,.73) 100%)}
.cp-band .blk{position:absolute;left:16px;right:16px;bottom:15px;padding-right:40px}
.cp-band .k{font:11px/1.2 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-body);text-shadow:0 1px 3px rgba(0,0,0,.8)}
.cp-band .nl{display:flex;align-items:flex-end;gap:8px;margin-top:4px}
.cp-band h1{margin:0;font:700 19px/1.15 'Cinzel',serif;color:var(--fg);text-shadow:0 1px 4px rgba(0,0,0,.85)}
.cp-band .tl{font-size:12.5px;line-height:1.2;color:var(--fg-body);margin-top:4px;text-shadow:0 1px 4px rgba(0,0,0,.85)}
.cp-body{display:flex;flex-direction:column;gap:16px;padding:16px 14px}
.hero{border-radius:14px;background:var(--surface-rail);border:1px solid var(--border);padding:22px 24px}
.hero .l{font:11px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.hero .sc{display:flex;align-items:baseline;gap:8px;margin-top:8px}
.hero .sc b{font:600 52px/.9 'IBM Plex Mono',monospace;color:var(--fg)}
.hero .sc span{font:16px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.hero .rc{font:13px 'IBM Plex Mono',monospace;color:var(--fg-faint)}
.hero .hbar{height:12px;border-radius:99px;background:var(--elevated);overflow:hidden;display:flex;margin-top:18px}
.hero .lg{display:flex;flex-wrap:wrap;gap:24px;margin-top:12px}
.hero .lg span{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--fg-body)}
.hero .lg i{display:block;width:9px;height:9px;border-radius:2px}
.hero .lg em{font:12px 'IBM Plex Mono',monospace;font-style:normal;color:var(--fg)}
.hero .lg em s{text-decoration:none;color:var(--fg-faint)}
.why h2{margin:0;font:600 20px 'Cinzel',serif;color:var(--fg)}
.why p{font-size:13.5px;line-height:1.6;margin-top:8px;max-width:640px;color:var(--fg-body)}
.cp-d{display:grid;grid-template-columns:344px 1fr;gap:36px;align-items:start;padding:26px 36px 40px;margin-top:20px}
.cp-d .left{display:flex;flex-direction:column;gap:16px}
.cface{position:relative;aspect-ratio:63/88;border-radius:14px;overflow:hidden;background:var(--elevated);box-shadow:inset 0 0 0 1px rgba(0,0,0,.4),0 20px 50px rgba(0,0,0,.5)}
.cface img{width:100%;height:100%;object-fit:cover;display:block}
.cp-d h1{margin:0;font:700 21px/1.15 'Cinzel',serif;color:var(--fg)}
.cp-d .ty{font-size:12.5px;color:var(--fg-body);margin-top:2px}
.idrow{display:flex;align-items:center;gap:5px}
.idrow i{display:block;width:16px;height:16px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.4)}
.idrow span{font:12px 'IBM Plex Mono',monospace;color:var(--fg-faint);margin-left:4px}
.build{display:block;width:100%;text-align:center;padding:14px 0;border-radius:8px;background:var(--fg);color:var(--bg);font:600 15px 'IBM Plex Sans';border:0}
.seed{font:10.5px/1.5 'IBM Plex Mono',monospace;color:var(--fg-locked);text-align:center}
.cp-d .right{display:flex;flex-direction:column;gap:32px}
.hidebtn{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;background:transparent;border:0;font:500 13px 'IBM Plex Sans';color:var(--fg-muted);cursor:pointer;padding:0}
.hidebtn svg{width:15px;height:15px}
/* the hidden note on the page: the shipped hero note's shape (detail.tsx, synergyState note) */
.hnote{display:flex;align-items:flex-start;gap:10px;border-radius:8px;background:var(--elevated-hover);border:1px solid var(--border-strong);border-left:2px solid var(--fg-faint);padding:9px 8px 9px 13px}
.hnote svg{flex:none;width:15px;height:15px;color:var(--fg-faint);margin-top:2px}
.hnote .tx{flex:1;min-width:0;font-size:12.5px;line-height:1.45;color:var(--fg-muted);padding-top:1px}
.hnote .tx strong{color:var(--fg-body);font-weight:600}
.hnote .tb{margin-top:-12px;margin-bottom:-12px;padding:0 6px}
/* the excluded-match aside / held zero state already ship (excluded-match.tsx, zero-state.tsx) */

/* Help me choose result rows (choose-row.tsx) */
.hmc{padding:18px 16px}
.dk .hmc{padding:26px 34px;max-width:1120px}
.hmc h2{margin:0;font:600 20px 'IBM Plex Sans';color:var(--fg)}
.hmc .ld{font-size:13px;line-height:1.5;color:var(--fg-muted);margin-top:6px}
.hmc .sec{font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--accent-text);margin:16px 0 8px}
.bf{display:flex;flex-direction:column;gap:10px}
.dk .bf{flex-direction:row;gap:14px}
.bfc{position:relative;display:flex;flex-direction:row;overflow:hidden;border-radius:12px;border:1px solid color-mix(in srgb,var(--accent) 30%,var(--border));background:var(--surface-rail)}
.dk .bfc{flex-direction:column;flex:1;min-width:0}
.bfc .im{position:relative;flex:none;width:88px;background:var(--elevated);border-right:1px solid var(--border);overflow:hidden}
.dk .bfc .im{width:100%;aspect-ratio:626/457;border-right:0;border-bottom:1px solid var(--border)}
.bfc .im img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.bfc .im .rkb{display:none;position:absolute;left:10px;top:10px;width:26px;height:26px;border-radius:50%;align-items:center;justify-content:center;font:600 12px 'IBM Plex Mono';color:var(--accent-text);background:var(--bg);border:1px solid color-mix(in srgb,var(--accent) 50%,transparent)}
.dk .bfc .im .rkb{display:flex}
.bfc .tx{display:flex;flex-direction:column;gap:9px;min-width:0;flex:1;padding:11px 12px}
.dk .bfc .tx{padding:14px 15px 15px}
.bfc .nl{display:flex;align-items:center;gap:8px;min-width:0}
.bfc .rkp{flex:none;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:600 10.5px 'IBM Plex Mono';color:var(--accent-text);border:1px solid color-mix(in srgb,var(--accent) 50%,transparent)}
.dk .bfc .rkp{display:none}
.bfc .nl span.n{font:600 14.5px 'Cinzel',serif;color:var(--fg);text-decoration:underline dotted var(--accent);text-underline-offset:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.dk .bfc .nl span.n{font-size:17px}
.bfc .rs{font-size:12.5px;line-height:1.5;color:var(--fg-body)}
.bfc .fg{font:12px 'IBM Plex Mono';color:var(--fg-muted)}
.bfc .fg b{color:var(--fg);font-weight:600}
.bfc hr{margin:0;border:0;border-top:1px solid var(--border)}
.bfc .ow{font:11px 'IBM Plex Mono';color:var(--fg-faint);line-height:1.5}
.bfc .ow .d{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--success);margin-right:5px;vertical-align:1px}
</style>"""

EYE_OFF = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
           'stroke-linejoin="round" aria-hidden="true"><path d="M10.7 5.1A10.7 10.7 0 0 1 21.9 11.7a1 1 0 0 1 0 .7 10.7 10.7 0 0 1-1.4 2.5"/>'
           '<path d="M14.1 14.2a3 3 0 0 1-4.2-4.2"/><path d="M17.5 17.5A10.8 10.8 0 0 1 2.1 12.3a1 1 0 0 1 0-.7 10.8 10.8 0 0 1 4.4-5.1"/>'
           '<path d="m2 2 20 20"/></svg>')
EXPAND = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">'
          '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>')

PIP = {'W': 'var(--w)', 'U': 'var(--u)', 'B': 'var(--b)', 'R': 'var(--r)', 'G': 'var(--g)'}
IDNAME = {'G': 'Mono-Green', 'W': 'Mono-White', 'R': 'Mono-Red', 'U': 'Mono-Blue', 'B': 'Mono-Black', 'GU': 'Simic',
          'BG': 'Golbari', 'UR': 'Izzet', 'WB': 'Orzhov', 'RW': 'Boros', 'GW': 'Selesnya'}

C = {
 'zimone': dict(n='Zimone, Infinite Analyst', id='GU', fit=71, seg=(29, 23, 19), decks='1,214',
   pr='Zimone decks cast one cheap spell a turn and pile +1/+1 counters onto a single growing threat.',
   st=('+1/+1 Counters', 'Spellslinger', 'Ramp'), ty='Legendary Creature — Human Wizard'),
 'ghalta': dict(n='Ghalta, Primal Hunger', id='G', fit=74, seg=(31, 24, 19), decks='8,902',
   pr='Ghalta decks ramp into the biggest creatures they can find and win in combat with trample.',
   st=('Big Mana', 'Stompy', 'Ramp'), ty='Legendary Creature — Elder Dinosaur'),
 'lathliss': dict(n='Lathliss, Dragon Queen', id='R', fit=68, seg=(28, 22, 18), decks='2,488',
   pr='Lathliss decks fill the sky with Dragons, and every new one brings a token of its own.',
   st=('Dragons', 'Tokens', 'Ramp'), ty='Legendary Creature — Dragon'),
 'giada': dict(n='Giada, Font of Hope', id='W', fit=66, seg=(27, 21, 18), decks='3,377',
   pr='Giada decks flood the board with Angels that arrive bigger than they should.',
   st=('Angels', '+1/+1 Counters', 'Lifegain'), ty='Legendary Creature — Angel'),
 'rootha': dict(n='Rootha, Mastering the Moment', id='UR', fit=63, seg=(26, 20, 17), decks='1,032',
   pr='Rootha decks copy their instants and sorceries and turn each spell into an Elemental.',
   st=('Spellslinger', 'Tokens', 'Copy'), ty='Legendary Creature — Orc Sorcerer'),
 'killian': dict(n='Killian, Decisive Mentor', id='WB', fit=61, seg=(25, 20, 16), decks='744',
   pr='Killian decks pile Auras onto their creatures and draw a card each time one attacks.',
   st=('Auras', 'Enchantress', 'Voltron'), ty='Legendary Creature — Human Warlock'),
 'dina': dict(n='Dina, Essence Brewer', id='BG', fit=70, seg=(27, 23, 20), decks='1,902', price='$3.10',
   pr='Dina decks sacrifice creatures for value, draining the table and growing with each death.',
   st=('Aristocrats', 'Lifegain', '+1/+1 Counters'), ty='Legendary Creature — Dryad Druid'),
 'miku': dict(n='Miku, Song of the People', id='GW', fit=67, seg=(26, 22, 19), decks='640', price='$14.80',
   pr='Miku decks go wide with creature tokens and then populate the best of them.',
   st=('Tokens', 'Populate', 'Lifegain'), ty='Legendary Creature — Dryad'),
 'quintorius': dict(n='Quintorius, History Chaser', id='RW', fit=64, seg=(25, 21, 18), decks='1,388', price='$0.42',
   pr='Quintorius decks turn every card that leaves the graveyard into a Spirit.',
   st=('Graveyard', 'Tokens', 'Reanimator'), ty='Legendary Planeswalker — Quintorius'),
 'sai': dict(n='Sai, Master Thopterist', id='U', fit=62, seg=(26, 19, 17), decks='5,120', price='$0.35',
   pr='Sai decks cast artifacts to make Thopters, then trade the extras in for cards.',
   st=('Artifacts', 'Tokens', 'Card Draw'), ty='Legendary Creature — Human Artificer'),
 'aang': dict(n='Aang, Swift Savior // Aang and La, Ocean’s Fury', id='WU', fit=73, seg=(29, 25, 19), decks='2,170', pr='', st=(), ty='Legendary Creature — Human Avatar'),
 'ashling': dict(n='Ashling, the Limitless', id='R', fit=60, seg=(24, 20, 16), decks='410',
   pr='', st=(), ty='Legendary Creature — Elemental Sorcerer'),
 'zada': dict(n='Zada, Hedron Grinder', id='R', fit=58, seg=(24, 19, 15), decks='2,050', price='$0.30',
   pr='', st=(), ty='Legendary Creature — Goblin Ally'),
}


def pips(ident, size=8, gap=3, r=1.5):
    return (f'<span class="pips" style="gap:{gap}px">' + ''.join(
        f'<i style="width:{size}px;height:{size}px;border-radius:{r}px;background:{PIP[x]}"></i>' for x in ident) + '</span>')


def plate(state='', svg=EYE_OFF, style='', label='Hide'):
    return (f'<button type="button" class="hit {state}" style="{style}" aria-label="{label}" title="{label}">'
            f'<span class="plate">{svg}</span></button>')


def fitbar(seg, total=100, legend=True):
    p, r, s = seg
    pct = round(100 * (p + r + s) / total)
    fill = (f'<div class="fill" style="width:{pct}%">'
            f'<div style="flex-grow:{p};background:var(--accent-dim)"></div>'
            f'<div style="flex-grow:{r};background:var(--accent-mid)"></div>'
            f'<div style="flex-grow:{s};background:var(--accent)"></div></div>')
    lg = ('<div class="lg"><span><i style="background:var(--accent-dim)"></i>Pool</span>'
          '<span><i style="background:var(--accent-mid)"></i>Roles</span>'
          '<span><i style="background:var(--accent)"></i>Synergy</span></div>') if legend else ''
    return f'<div class="fb" aria-hidden="true"><div class="tr">{fill}</div>{lg}</div>'


def styles_line(st):
    a, b, c = st
    return f'This commander’s top three play styles are <b>{a}</b>, <b>{b}</b> and <b>{c}</b>.'


def crow(key, rank, ctrl='', art=None, lane='own', extra_cls='', ctrl_new=False, place='figs'):
    """One CommanderRow. `ctrl`: '' none (as shipped), or a plate state: 'rest', 'hov', 'prs', 'foc'."""
    c = C[key]
    src = art or f'art/crop-{key}.jpg'
    figs = f'<span>{c["decks"]} decks tracked</span>'
    if lane == 'disc' and c.get('price'):
        figs += (f'<span class="sep">·</span><span class="pv"><i class="pd"></i>{c["price"]}</span>'
                 '<span class="src">manapool</span>')
    plate_html = ''
    if ctrl:
        st = '' if ctrl == 'rest' else ctrl
        cls = ' new' if ctrl_new else ''
        auto = '' if (lane == 'disc' and c.get('price')) else ';margin-left:auto'
        btn = f'<button type="button" class="hb {st}{cls}" style="{auto[1:]}" aria-label="Hide {c["n"]}" title="Hide {c["n"]}">{EYE_OFF}</button>'
        if place == 'figs':
            figs += btn
        elif place == 'inline':
            figs = figs.replace('decks tracked</span>', 'decks tracked</span>' + btn.replace(f'style="{auto[1:]}"', 'style="margin:-15px 0 -15px -10px"'), 1)
    bar = fitbar(c["seg"])
    if ctrl and place == 'bar':
        bar = f'<div class="fbrow">{bar}<button type="button" class="hb bb {st}{cls}" aria-label="Hide {c["n"]}" title="Hide {c["n"]}">{EYE_OFF}</button></div>'
    elif ctrl and place == 'foot':
        bar += f'<div class="hfoot"><button type="button" class="hl {st}{cls}" aria-label="Hide {c["n"]}">{EYE_OFF}<span>Hide</span></button></div>'
    return f'''<div class="crow {extra_cls}">
<div class="band"><img class="art" src="{src}" alt=""><div class="scrim"></div>{plate_html}
<div class="lbl"><span class="rk{' one' if rank == 1 else ''}">{rank}</span>
<div class="nm"><span class="n">{c["n"]}</span>{pips(c["id"])}</div>
<div class="fit"><b>{c["fit"]}</b><span>/100 FIT</span></div></div></div>
<div class="body"><p class="pr">{c["pr"]}</p><p class="gp">{styles_line(c["st"])}</p>
<div class="figs">{figs}</div>{bar}</div></div>'''


def undo_row(name, verb='hidden', err=None, pending=False):
    btn = '' if err else f'<button type="button" class="tb{" dis" if pending else ""}" aria-label="Undo hiding {name}"><span>Undo</span></button>'
    e = f'<p class="merr" role="alert">{err}</p>' if err else ''
    return f'<div><div class="urow"><span class="t">{name} {verb}</span>{btn}</div>{e}</div>'


def hrow(key, meta, state='rest', name=None):
    c = C.get(key, {})
    nm = name or c['n']
    ident = c.get('id', '') if key in C else 'GW'
    img = f'art/c-{key}.jpg'
    if state == 'gone':
        return f'<div class="urow"><span class="t">{nm} {meta}</span><button type="button" class="tb" aria-label="Hide {nm} again"><span>Undo</span></button></div>'
    btn = f'<button type="button" class="tb{" dis" if state == "pending" else ""}" aria-label="Unhide {nm}" style="position:relative;z-index:2"><span>Unhide</span></button>'
    return f'''<div class="hrow"><div class="thumb"><img src="{img}" alt=""></div>
<div style="min-width:0"><div class="nm"><span class="n">{nm}</span>{pips(ident, 9, 4)}</div><p class="mt">{meta}</p></div>{btn}</div>'''


def strip(on, w='p', count=None, show_hidden=True):
    tabs = [('foryou', 'For you'), ('discover', 'Discover'), ('choose', 'Help me choose')]
    if show_hidden:
        tabs.append(('hidden', 'Hidden'))
    out = []
    for k, lab in tabs:
        em = f'<em>{count}</em>' if (k == 'hidden' and count) else ''
        cls = ' class="on"' if k == on else ''
        newc = ' style="outline:1.5px dashed rgba(207,135,69,.9);outline-offset:-4px;border-radius:6px"' if (k == 'hidden' and on != 'hidden') else ''
        out.append(f'<a{cls}{newc} href="#">{lab}{em}</a>')
    return f'<nav class="strip {w}" aria-label="Commanders">{"".join(out)}</nav>'


def phone(content, strip_on='foryou', head='foryou', count=3, toast='', strip_html=None, show_hidden=True):
    s = strip_html if strip_html is not None else (strip(strip_on, 'p', count, show_hidden) if strip_on else '')
    h = {'foryou': '<img class="cap-img" src="art/ph-head-foryou.png" width="390" alt="">',
         'discover': '<img class="cap-img" src="art/ph-head-discover.png" width="390" alt="">'}.get(head, head or '')
    return (f'<div class="ph"><img class="cap-img" src="art/ph-header.png" width="390" alt="">{s}'
            f'<div class="scroll">{h}{content}</div>{toast}'
            f'<img class="bar" src="art/ph-bar.png" width="390" alt=""></div>')


def place_head(on, count=3, show_hidden=True, line='227 yours, not yet built · 3,068 to discover'):
    return (f'<div class="phd"><p class="t">Commanders</p><p class="c">{line}</p></div>'
            f'{strip(on, "d", count, show_hidden)}')


def desk(content, strip_on='foryou', head='foryou', count=3, toast='', place=True, show_hidden=True,
         line='227 yours, not yet built · 3,068 to discover'):
    ph = place_head(strip_on, count, show_hidden, line) if place else ''
    h = {'foryou': '<img class="cap-img" src="art/dk-head-foryou.png" width="1237" alt="">',
         'discover': '<img class="cap-img" src="art/dk-head-discover.png" width="1237" alt="">'}.get(head, head or '')
    return (f'<div class="dk"><img class="rail" src="art/dk-rail.png" alt=""><div class="main">{ph}'
            f'<div class="scroll">{h}{content}</div></div>{toast}</div>')


def toast(text, action='Try again'):
    a = f'<button type="button" class="ta">{action}</button>' if action else ''
    return f'<div class="toast" role="alert"><span class="tt">{text}</span>{a}</div>'


def head(kick, title, lede, tag='R1'):
    return (f'<div class="bh"><div class="kick"><span class="tag">{tag}</span>{kick}</div><h2>{title}</h2>'
            f'<p>{lede}</p></div>')


def fr(lab, inner_html, cap=''):
    c = f'<p class="cap">{cap}</p>' if cap else ''
    return f'<div class="fr"><div class="lab">{lab}</div>{inner_html}{c}</div>'


def rule(h, items, style=''):
    lis = ''.join(f'<li>{x}</li>' for x in items)
    return f'<div class="rule" style="{style}"><h4>{h}</h4><ol>{lis}</ol></div>'


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
