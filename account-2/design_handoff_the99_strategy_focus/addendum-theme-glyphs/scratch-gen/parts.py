"""Strategy focus R1 (account 2, 2026-10-22): shipped pieces, redrawn from src.

Every piece cites the component it is drawn from. Low Sun (amonkhet) tokens via kit.CSS. Card images are cut
from Hugh's own HD - Avatar Aang captures (Consider tab, Collection grid), so every thumb is a real card.
"""
import kit
from kit import img

LOCAL = kit.LOCAL
LOCAL.update({"hero": "art/hero-aang.jpg", "b3": "art/bracket-3-upgraded-ink.svg", "b4": "art/bracket-4-optimized-ink.svg"})


def card(key):
    LOCAL.setdefault("c-" + key, f"art/c-{key}.jpg")
    return img("c-" + key)


CSS = r"""
.mt{font-family:'IBM Plex Mono',monospace}
.lbl{font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.vstrip{padding:10px 16px;border-bottom:1px solid var(--border);font:10.5px 'IBM Plex Mono';color:var(--fg-faint);background:var(--surface-rail)}
.dkm .vstrip{padding:12px 30px}
/* ---- Analysis tab (analysis-panel.tsx, HANDOFF.md §2) ---- */
.at{display:flex;flex-direction:column;gap:22px;padding:18px 16px 32px}
.dkm .at{gap:28px;padding:24px 30px 40px}
.at .grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);grid-template-rows:auto 1fr;gap:26px 30px;align-items:start}
.ovp{font-size:14.5px;line-height:1.75;color:var(--fg-body);margin-top:10px}
.ovp b{color:var(--fg);font-weight:600;border-bottom:1px dotted var(--accent)}
.lk{font:11px 'IBM Plex Mono';color:var(--accent);text-decoration:underline;text-underline-offset:4px;text-decoration-color:var(--accent-shadow)}
.vbx{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-rail);padding:18px 20px;display:flex;flex-direction:column;gap:12px}
.vbx .vh{display:flex;align-items:center;gap:12px}
.vbx .vh img{width:36px;height:36px}
.vbx .vn{font:700 21px 'Cinzel',serif;color:var(--bracket-3);letter-spacing:.02em}
.vbx .va{font:10px 'IBM Plex Mono';color:var(--fg-faint);margin-top:2px}
.vbx p{font-size:13px;line-height:1.6;color:var(--fg-body)}
.vbx .pf{border-top:1px solid var(--border);padding-top:10px}
.vbx .pf .lbl{font-size:9px;color:var(--fg-locked)}
.clb{border:1px solid var(--border);border-radius:12px;background:var(--surface-sunken);padding:14px;display:flex;flex-direction:column;gap:8px}
.rung{display:flex;align-items:center;gap:14px;border:1px solid var(--border);border-radius:9px;padding:12px 14px;background:var(--surface)}
.rung.on{border-color:var(--bracket-3);background:color-mix(in oklab,var(--bracket-3) 10%,var(--surface))}
.rung img{width:26px;height:26px;opacity:.9}
.rung .rn{font-size:13px;font-weight:600;color:var(--fg)}
.rung .rs{font:8.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);margin-top:2px}
.rung .rt{font-size:12.5px;color:var(--fg-body);flex:1;line-height:1.5}
.fdr{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.fdt{border:1px solid var(--border-strong);border-radius:9px;background:var(--surface);padding:12px 14px;min-height:100px;display:flex;flex-direction:column;gap:5px}
.fdt.z{background:transparent;border-color:var(--border)}
.fdt .n{font:600 18px 'IBM Plex Mono';color:var(--fg)}
.fdt.z .n{color:var(--fg-locked)}
.fdt .h{font-size:12.5px;font-weight:600;color:var(--fg)}
.fdt.z .h{color:var(--fg-faint);font-weight:500}
.fdt .s{font-size:11px;color:var(--fg-muted)}
.fdt.z .s{color:var(--fg-locked)}
.hpr{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.hpt{border:1px solid var(--border-strong);border-radius:9px;background:var(--surface);padding:13px 14px;display:flex;flex-direction:column;gap:7px}
.hpt .h{font-size:12.5px;font-weight:600}
.hpt .g{font:700 17px 'Cinzel',serif}
.seg5{display:flex;gap:4px}.seg5 i{flex:1;height:5px;border-radius:2px;background:var(--elevated)}.seg5 i.f{background:var(--fact)}
.hpt .s{font-size:11px;color:var(--fg-muted)}
.dep{border:1px solid var(--border-strong);border-radius:9px;background:var(--surface);padding:14px 16px;display:flex;flex-direction:column;gap:12px}
.dep .r{display:flex;align-items:center;gap:16px;font-size:12.5px;color:var(--fg-body);border-top:1px solid var(--border);padding-top:12px}
.dep .t{font:9px 'IBM Plex Mono';letter-spacing:.14em;border:1px solid var(--border-strong);border-radius:4px;padding:2px 8px;color:var(--fg-faint)}
.phr{border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);overflow:hidden}
.phr>div{padding:11px 14px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;font-size:13px}
.phr>div:first-child{border-top:0}

/* ---- NEW: what it's built around (the strategies list) ---- */
.ba{display:flex;flex-direction:column;gap:10px}
.ba .bah{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
.ba .bas{font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-faint)}
.ba .bahint{margin-left:auto;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.bal{border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);overflow:hidden}
.sx{display:grid;grid-template-columns:150px minmax(0,1fr) 74px 0;align-items:center;gap:14px;min-height:44px;padding:0 14px 0 16px;border-top:1px solid var(--border)}
.sx:first-child{border-top:0}
.sx .sn{font-size:13.5px;font-weight:600;color:var(--fg);white-space:nowrap}
.sx .sb{height:6px;border-radius:999px;background:var(--fg-muted);opacity:.75}
.sx .sc{font:11.5px 'IBM Plex Mono';color:var(--fg-muted);text-align:right;white-space:nowrap}
.sx .sv{font:14px 'IBM Plex Mono';color:var(--fg-faint);text-align:right}
.sx.br .sn{font-weight:500;color:var(--fg-body)}
.sx.br .sb{opacity:.45}
.sx .snote{grid-column:2/4;font:10px 'IBM Plex Mono';color:var(--fg-locked);margin-top:-8px;padding-bottom:8px}
.sx.hot{background:var(--elevated-hover);box-shadow:inset 3px 0 0 var(--accent)}
.sx.hot .sv{color:var(--accent)}
.ph .sx{grid-template-columns:minmax(0,1fr) auto 0;grid-template-rows:auto auto;row-gap:7px;padding:11px 12px 12px 14px;min-height:52px}
.ph .sx .sn{grid-column:1;grid-row:1;font-size:13.5px}
.ph .sx .sc{grid-column:2;grid-row:1}
.ph .sx .sv{grid-column:3;grid-row:1/3}
.ph .sx .sb{grid-column:1/3;grid-row:2}
.ph .sx .snote{grid-column:1/3;grid-row:3;margin:0;padding:0}
.bstate{border:1px dashed var(--border-dashed);border-radius:10px;padding:14px 16px;font-size:13px;line-height:1.6;color:var(--fg-body)}
.bstate b{color:var(--fg);font-weight:600}

/* ---- Tuning hub (tuning-hub.tsx) ---- */
.hub{display:flex;flex-direction:column;gap:12px;padding-top:16px;border-top:1px solid var(--border)}
.dkm .hub{gap:14px}
.hub>h2{margin:0;font:400 17px 'Cinzel',serif;color:var(--fg)}
.dkm .hub>h2{font-size:19px}
.tiles{display:grid;grid-template-columns:1fr;gap:8px}
.dkm .tiles{grid-template-columns:1fr 1fr;gap:10px}
.tile{display:flex;flex-direction:column;gap:6px;border-radius:10px;padding:12px 14px;background:var(--surface);border:1px solid var(--border);min-height:44px}
.dkm .tile{min-height:112px;padding:14px 16px}
.tile.inert{background:transparent;border:1px dashed var(--border-dashed)}
.tile .t1{display:flex;align-items:center;gap:10px}
.tile .tm{color:var(--fg-body);display:flex}
.tile.inert .tm{color:var(--fg-locked)}
.tile .tn{font-size:14px;font-weight:600;color:var(--fg)}
.tile.inert .tn{color:var(--fg-faint)}
.tile .tc{margin-left:auto;font:14px 'IBM Plex Mono';color:var(--fg-faint)}
.tile .tp{font-size:12.5px;line-height:1.5;color:var(--fg-body);text-wrap:pretty}
.tile.inert .tp{color:var(--fg-faint)}
.tile .tf{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font:10.5px 'IBM Plex Mono';margin-top:auto}
.tile .cost{color:var(--fg-faint);border:1px solid var(--border-strong);border-radius:999px;padding:1px 8px}
.tile .st{color:var(--fg-faint)}
.dkm .tile.wide{grid-column:1/-1;min-height:0;flex-direction:row;align-items:center;gap:16px}
.dkm .tile.wide .t1{flex:none;width:200px}
.dkm .tile.wide .tp{flex:1}
.dkm .tile.wide .tf{margin:0}
.utabs{display:flex;gap:22px;border-bottom:1px solid var(--border)}
.utabs span{display:flex;align-items:center;gap:7px;padding:4px 0 10px;font-size:13px;font-weight:500;color:var(--fg-muted);border-bottom:2px solid transparent;margin-bottom:-1px}
.utabs span.on{color:var(--fg);font-weight:600;border-bottom-color:var(--accent)}
.utabs span .tm{color:var(--fg-body);display:flex}
.utabs span.on .tm{color:var(--accent)}
.utabs span.inert{color:var(--fg-locked)}.utabs span.inert .tm{color:var(--fg-locked)}
.pback{display:flex;align-items:center;justify-content:space-between}
.pback .b{height:44px;display:flex;align-items:center;font-size:13px;font-weight:500;color:var(--fg-muted)}
.pback .o{display:flex;align-items:center;gap:7px;font:10px 'IBM Plex Mono';color:var(--fg-faint)}
.pback .o .tm{color:var(--fg-body);display:flex}

/* ---- the new tool's panel ---- */
.ddp{display:flex;flex-direction:column;gap:14px}
.ddp .dh{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.ddp .dh h3{margin:0;font:400 17px 'Cinzel',serif;color:var(--fg)}
.dkm .ddp .dh h3{font-size:19px}
.ddp .dh .ds{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.ddp .lead{font-size:13px;line-height:1.6;color:var(--fg-body);max-width:780px;text-wrap:pretty}
.ddp .lead b{color:var(--fg);font-weight:600}
.pick{border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);display:grid;grid-template-columns:150px minmax(0,1fr) 74px auto;align-items:center;gap:14px;min-height:48px;padding:0 8px 0 16px;box-shadow:inset 3px 0 0 var(--accent)}
.pick .sn{font-size:13.5px;font-weight:600}
.pick .sb{height:6px;border-radius:999px;background:var(--fg-muted);opacity:.75}
.pick .sc{font:11.5px 'IBM Plex Mono';color:var(--fg-muted);text-align:right}
.pick .ch{display:flex;align-items:center;min-height:44px;padding:0 10px;font:11.5px 'IBM Plex Mono';color:var(--accent)}
.ph .pick{grid-template-columns:minmax(0,1fr) auto auto;grid-template-rows:auto auto;row-gap:6px;padding:10px 4px 10px 14px}
.ph .pick .sb{grid-column:1/3;grid-row:2}
.ph .pick .ch{grid-column:3;grid-row:1/3}
.gh{display:flex;align-items:baseline;gap:8px;margin:6px 0 -4px;font-size:14px;font-weight:600}
.gh em{font:normal 11px 'IBM Plex Mono';color:var(--fg-faint)}
.pairs{display:flex;flex-direction:column;gap:8px}
.dfoot{font:10.5px/1.6 'IBM Plex Mono';color:var(--fg-faint);border-top:1px solid var(--border);padding-top:10px}
.note-dash{border:1px dashed var(--border-dashed);border-radius:9px;padding:9px 12px;font-size:12.5px;line-height:1.55;color:var(--fg-muted)}
.restate{display:flex;flex-direction:column;gap:10px;border:1px dashed var(--border-dashed);border-radius:10px;padding:16px 18px}
.restate .rh{font-size:13.5px;font-weight:600;color:var(--fg-body)}
.restate p{font-size:12.5px;line-height:1.6;color:var(--fg-faint);max-width:760px}
.ghost{display:inline-flex;align-items:center;align-self:flex-start;min-height:44px;padding:0 16px;border-radius:8px;border:1px solid var(--border-strong);color:var(--fg-body);font:500 13px 'IBM Plex Sans'}
.dkm .ghost{min-height:34px}
.shortline{font-size:12.5px;line-height:1.55;color:var(--fg-muted);padding:2px 2px 0}

/* ---- suggestion card (suggestion-card.tsx) ---- */
.sg{display:flex;flex-direction:column;gap:11px;border-radius:10px;padding:13px 12px;background:var(--surface);border:1px solid var(--border)}
.dkm .sg{gap:8px;border-radius:9px;padding:10px 12px}
.sg .pr{display:flex;flex-direction:column;gap:7px}
.dkm .sg .pr{flex-direction:row;flex-wrap:wrap;align-items:center;gap:9px}
.sg .sd{display:flex;align-items:center;gap:9px;min-width:0}
.th{width:22px;height:31px;border-radius:3px;flex:none;object-fit:cover;display:block;box-sizing:border-box;border:1px solid var(--border-strong)}
.th.add{border-color:var(--border-dashed)}
.cn{font-size:13px;border-bottom:1px dotted var(--accent);white-space:nowrap}
.cn.cut{color:var(--fg-body);text-decoration:line-through;text-decoration-color:var(--fg-locked)}
.cn.add{font-weight:600;color:var(--fg)}
.arr{font:13px 'IBM Plex Mono';color:var(--accent)}
.ar2{font:12px 'IBM Plex Mono';color:var(--accent)}
.od{width:7px;height:7px;border-radius:50%;flex:none;background:var(--success);border:1px solid var(--success)}
.od.no{background:transparent;border:1px dashed var(--fg-locked)}
.buy{font:9px 'IBM Plex Mono';border-radius:4px;padding:1px 5px;color:var(--warning);background:color-mix(in oklab,var(--warning) 13%,transparent);white-space:nowrap}
.dkm .buy{font-size:9.5px}
.avm{display:inline-flex;align-items:center;gap:5px;font:10.5px 'IBM Plex Mono';color:var(--accent);white-space:nowrap}
.avm i{width:6px;height:6px;background:var(--accent);transform:rotate(45deg);display:block}
.avm.dr{color:var(--fg-faint)}.avm.dr i{background:transparent;border:1px solid var(--fg-faint)}
.marks{display:flex;align-items:center;gap:8px}
.sg .rsn{font-size:12.5px;line-height:1.55;color:var(--fg-body);max-width:980px;margin:0;min-height:0;display:block;text-decoration:none}
.flag{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--fg-body);flex-wrap:wrap}
.bc{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 8px 0 3px;border-radius:6px;font:11px 'IBM Plex Mono'}
.bc img{width:20px;height:20px}
.sg .ft{display:flex;flex-direction:column;gap:11px}
.dkm .sg .ft{flex-direction:row-reverse;flex-wrap:wrap;align-items:center;gap:7px}
.cites{display:flex;flex-wrap:wrap;gap:6px}
.dkm .cites{margin-left:auto;gap:5px}
.cite{display:flex;align-items:baseline;gap:5px;border-radius:5px;padding:3px 7px;font:9.5px 'IBM Plex Mono';background:var(--surface-sunken);border:1px solid var(--border)}
.cite span:first-child{text-transform:uppercase;letter-spacing:.1em;color:var(--fg-locked)}
.cite span+span{color:var(--fg-muted)}
.btns{display:flex;gap:8px}
.dkm .btns{gap:7px;margin-right:auto}
.ap,.rj{height:44px;flex:1;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px}
.ap{color:var(--accent);border:1px solid var(--accent);font-weight:600}
.rj{color:var(--fg-muted);border:1px solid var(--border-strong);font-weight:500}
.dkm .ap,.dkm .rj{height:auto;flex:none;border-radius:7px;padding:7px 13px;font-size:12.5px}
.dkm .rj{padding:7px 12px}
.ans{display:flex;flex-wrap:wrap;align-items:center;gap:9px;border-radius:9px;padding:9px 12px;background:var(--surface-sunken);border:1px solid var(--border)}
.ans.ok{padding:10px 12px;background:var(--surface);border-color:var(--success)}
.ans .al{display:flex;align-items:center;gap:6px;font:9.5px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-locked)}
.ans.ok .al{color:var(--success)}
.ans .ck{width:15px;height:15px;border-radius:4px;border:1px solid var(--success);color:var(--success);font-size:9px;display:flex;align-items:center;justify-content:center}
.ans .ap2{font-size:12.5px;color:var(--fg-faint);min-width:0}
.ans.ok .ap2{font-size:13px;color:var(--fg-body)}
.ans.ok .ap2 b{color:var(--fg);font-weight:600}
.ans .ub{margin-left:auto;min-height:32px;border-radius:7px;padding:6px 11px;font-size:12px;font-weight:500;color:var(--fg-muted);border:1px solid var(--border-strong);display:flex;align-items:center}

/* ---- History (tuning-history.tsx) ---- */
.hist{display:flex;flex-direction:column;gap:14px;border-radius:12px;padding:18px 20px;background:var(--surface-sunken);border:1px solid var(--border)}
.ph .hist{border-radius:11px;padding:16px 14px}
.hist .hh{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.hist .hh h3{margin:0;font:400 19px 'Cinzel',serif}
.hist .hh span{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.hchips{display:flex;gap:6px;flex-wrap:wrap}
.hchips span{font:11px 'IBM Plex Mono';border:1px solid var(--border-strong);border-radius:999px;padding:4px 10px;color:var(--fg-muted);display:flex;align-items:center;gap:6px}
.hchips span.on{background:var(--elevated);color:var(--fg)}
.hmon{font:10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);padding:4px 2px 0}
.hrow{display:grid;grid-template-columns:114px 128px minmax(0,1fr) 92px 76px;align-items:center;gap:10px;min-height:44px;border-radius:9px;border:1px solid var(--border);background:var(--surface);padding:9px 12px}
.ph .hrow{grid-template-columns:auto minmax(0,1fr) auto;grid-template-rows:auto auto auto;row-gap:6px;min-height:60px}
.hrow .hd{font:11px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap}
.hrow .ht{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:500;color:var(--fg-body)}
.hrow .hs{font-size:12.5px;line-height:1.45;color:var(--fg-body)}
.hrow .tier{justify-self:start;font:10px 'IBM Plex Mono';border-radius:999px;padding:1px 8px;color:var(--fg-faint);border:1px solid var(--border-strong);white-space:nowrap;display:inline-flex;align-items:center;gap:5px}
.hrow .tier.cr{color:var(--accent);border-color:var(--accent-shadow)}
.hrow .tier.cr i{width:6px;height:6px;background:currentColor;transform:rotate(45deg)}
.hrow .oc{justify-self:end;font:9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;border-radius:999px;padding:2px 8px;color:var(--success);border:1px solid color-mix(in oklab,var(--success) 45%,transparent)}
.ph .hrow .hd{grid-column:2;grid-row:1}
.ph .hrow .ht{grid-column:1;grid-row:1;width:110px}
.ph .hrow .hs{grid-column:1/-1;grid-row:2}
.ph .hrow .tier{grid-column:1/-1;grid-row:3}
.ph .hrow .oc{grid-column:3;grid-row:1}
.hrow.nw{border-color:var(--accent-shadow);background:var(--elevated-hover)}

/* ---- frame chrome ---- */
.scut{font:9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:#0D0B09;background:#8FA6BE;padding:4px 10px;align-self:flex-start;border-radius:0 0 6px 0}
.dkm .scut{margin:0}
.nav{display:flex;justify-content:space-around;border-top:1px solid var(--border);padding:10px 4px 14px;background:var(--bg);margin-top:auto}
.nav span{display:flex;flex-direction:column;align-items:center;gap:5px;font:9.5px 'IBM Plex Mono';color:var(--fg-faint)}
.nav span.on{color:var(--fg)}
.nav i{width:18px;height:18px;border:1.5px solid currentColor;border-radius:4px;display:block}
.callout{position:absolute;z-index:30;font:600 10px 'IBM Plex Mono';letter-spacing:.06em;color:#0D0B09;background:var(--accent);border-radius:4px;padding:3px 7px;white-space:nowrap}
.tbl{border:1px solid var(--border-strong);border-radius:12px;overflow:hidden;max-width:1500px}
.tbl .tr{display:grid;grid-template-columns:44px 230px minmax(0,1fr);border-top:1px solid var(--border)}
.tbl .tr:first-child{border-top:0}
.tbl .tr>div{padding:12px 16px;font-size:13px;line-height:1.55;color:var(--fg-body)}
.tbl .tr>div:first-child{font:600 12px 'IBM Plex Mono';color:var(--accent)}
.tbl .tr>div:nth-child(2){font-weight:600;color:var(--fg)}
.tbl .tr b{color:var(--fg)}
.xmark{position:relative}
.xmark:after{content:'';position:absolute;inset:-6px;border:1.5px dashed rgba(198,83,63,.8);border-radius:10px}
.mini{transform-origin:top left}
.halo{outline:2px solid var(--accent);outline-offset:5px;border-radius:8px;box-shadow:0 0 0 9px rgba(207,135,69,.14)}
"""
kit.CSS += CSS

# ---------------------------------------------------------------- marks
def tool_mark(tool, size=20):
    u = 24 / size
    sw = (2.5 if size >= 28 else 2 if size >= 18 else 1.5) * u
    thin = (1.5 if size >= 18 else 1) * u
    r = 2 * u
    if tool == "suggested":
        g = (f'<rect x="{0.96+sw/2}" y="{3.36+sw/2}" width="{8.16-sw}" height="{17.28-sw}" rx="{r}" fill="none" stroke="currentColor" stroke-width="{sw}"/>'
             '<rect x="10.56" y="10.44" width="3.12" height="3.12" transform="rotate(45 12.12 12)"/>'
             f'<rect x="14.88" y="3.36" width="8.16" height="17.28" rx="{r}"/>')
    elif tool == "mana":
        g = ('<circle cx="4.8" cy="7.68" r="3.36"/><circle cx="19.2" cy="7.68" r="3.36"/>'
             f'<rect x="0.96" y="12.48" width="22.08" height="{sw}"/>'
             '<rect x="9.36" y="14.64" width="5.28" height="5.28" transform="rotate(45 12 17.28)"/>')
    elif tool == "cuts":
        g = '<g transform="scale(1.5)"><path d="M4 1.5 H12 V5.2 L4 10 Z"/><path d="M12 7.6 V14.5 H4 V12.4 Z"/></g>'
    elif tool in ("double", "read"):
        # NEW (proposed): the geometric family. A card outline, then two filled cards stepping up: more of the same.
        g = (f'<rect x="{0.96+sw/2}" y="{8.16+sw/2}" width="{6.72-sw}" height="{12.48-sw}" rx="{r}" fill="none" stroke="currentColor" stroke-width="{sw}"/>'
             f'<rect x="8.64" y="5.28" width="6.72" height="15.36" rx="{r}"/>'
             f'<rect x="16.32" y="2.4" width="6.72" height="18.24" rx="{r}"/>')
    else:
        g = ('<rect x="1.92" y="3" width="3.6" height="3.6" transform="rotate(45 3.72 4.8)"/>'
             f'<rect x="8.64" y="{4.8-sw/2}" width="14.4" height="{sw}"/>'
             f'<rect x="{1.92+thin/2}" y="{10.2+thin/2}" width="{3.6-thin}" height="{3.6-thin}" transform="rotate(45 3.72 12)" fill="none" stroke="currentColor" stroke-width="{thin}"/>'
             f'<rect x="8.64" y="{12-sw/2}" width="14.4" height="{sw}"/>'
             f'<rect x="{1.92+thin/2}" y="{17.4+thin/2}" width="{3.6-thin}" height="{3.6-thin}" transform="rotate(45 3.72 19.2)" fill="none" stroke="currentColor" stroke-width="{thin}"/>'
             f'<rect x="8.64" y="{19.2-sw/2}" width="9.6" height="{sw}"/>')
    return f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" fill="currentColor" style="display:block;flex:none">{g}</svg>'


PIPS = '<span class="pips"><i style="background:var(--w)"></i><i style="background:var(--u)"></i><i style="background:var(--b)"></i><i style="background:var(--r)"></i><i style="background:var(--g)"></i></span>'


def bchip(b=3, name="Upgraded"):
    ink = "var(--bracket-3)" if b == 3 else "var(--bracket-4)"
    return (f'<span class="bc" style="color:{ink};background:color-mix(in oklab,{ink} 12%,var(--bg));'
            f'box-shadow:inset 0 0 0 1px color-mix(in oklab,{ink} 55%,transparent)"><img src="{img("b%d" % b)}" alt="">{name}</span>')


COMPLETE = '<span class="pill" style="color:var(--success);border:1px solid color-mix(in oklab,var(--success) 50%,transparent)">Complete</span>'

# ---------------------------------------------------------------- page shells
def ph_top():
    return ('<div class="mhd"><div class="wm"><span class="the">THE</span><span class="mk"><span class="dia"><i></i><i></i><i></i></span>'
            '<span class="nn">99</span></span></div><div class="av">HH</div></div>')


def ph_head(tab="Analysis"):
    tabs = "".join(f'<span class="{"on" if t == tab else ""}">{t}{f"<em>{n}</em>" if n else ""}</span>'
                   for t, n in [("Your deck", "99"), ("Analysis", ""), ("Consider", "99"), ("Games", "1"), ("Versions", "2")])
    return (ph_top() +
            f'<div class="hero"><img src="{img("hero")}" alt="" style="object-position:30% 30%"><div class="wash"></div>'
            '<div class="door"><span>⇄</span><span>⛶</span></div>'
            '<div class="blk"><h1>HD - Avatar Aang<span class="pen">✎</span></h1>'
            f'<div class="meta">{PIPS}Avatar Aang // Aang, Master of Elements · 5-color</div>'
            f'<div class="chips">{COMPLETE}{bchip()}</div></div></div>'
            '<div class="sub"><div class="barrow"><div class="bar"><i style="width:100%;background:var(--success)"></i></div>'
            '<span class="cnt">99<span class="den">/ 99</span></span></div></div>'
            '<div class="acts"><span class="gb">Update from a list</span><span class="gb acc">Export</span></div>'
            '<div class="vstrip">v2 · committed 16 Sep 2026</div>'
            f'<div class="tabs">{tabs}</div>')


NAV = ('<div class="nav">' + "".join(f'<span class="{"on" if n == "Decks" else ""}"><i></i>{n}</span>'
                                     for n in ["Home", "Collection", "Commanders", "Decks", "Friends"]) + '</div>')


def phone(body, head=True, cut=None, nav=True, tab="Analysis"):
    top = ph_head(tab) if head else ph_top() + (f'<div class="scut">{cut}</div>' if cut else "")
    return f'<div class="ph">{top}{body}{NAV if nav else ""}</div>'


RAIL = ('<div class="rail"><div class="lg"><span class="dia"><i></i><i></i><i></i></span>99</div>'
        + "".join(f'<span class="sl{" on" if i == 4 else ""}">{g}</span>' for i, g in enumerate(["⌂", "▦", "♛", "◎", "▢", "☺"]))
        + '</div>')


def dk_head(tab="Analysis"):
    tabs = "".join(f'<span class="{"on" if t == tab else ""}">{t}{f"<em>{n}</em>" if n else ""}</span>'
                   for t, n in [("Your deck", "99"), ("Analysis", ""), ("Consider", "99"), ("Games", "1"), ("Versions", "2")])
    return (f'<div class="dhero"><div class="art"><img src="{img("hero")}" alt=""><div class="g"></div></div>'
            '<div class="in"><div class="col"><h1>HD - Avatar Aang <span style="font:14px IBM Plex Sans;color:var(--fg-muted)">✎</span></h1>'
            f'<div class="meta" style="white-space:nowrap">{PIPS}Avatar Aang // Aang, Master of Elements · 5-color</div>'
            f'<div class="chips">{COMPLETE}{bchip()}</div>'
            '<div class="barrow"><div class="bar"><i style="width:100%;background:var(--success)"></i></div><span class="cnt">99<span class="den">/ 99</span></span></div></div>'
            '<div class="acol"><span class="db">Update from a list</span><span class="db p">Export</span></div></div></div>'
            '<div class="vstrip">v2 · committed 16 Sep 2026</div>'
            f'<div class="dtabs">{tabs}</div>')


def desk(body, head=True, cut=None):
    top = dk_head() if head else (f'<div class="scut">{cut}</div>' if cut else "")
    return f'<div class="dk">{RAIL}<div class="main dkm">{top}{body}</div></div>'


# ---------------------------------------------------------------- the analysis reading (shipped, above the new section)
OV = ('A five-color Ally deck that flips <b>Avatar Aang</b> by bending all four elements in one turn. '
      '<b>Appa, Steadfast Guardian</b> and <b>Jasmine Dragon Tea Shop</b> keep Ally tokens coming, cheap instants hold the board, '
      'and the deck closes wide once Aang has transformed.')


def overview():
    return f'<div><div class="lbl">Overview</div><p class="ovp">{OV}</p><div style="margin-top:8px"><span class="lk">View full overview →</span></div></div>'


def vbox():
    return (f'<div class="vbx"><div class="vh"><img src="{img("b3")}" alt=""><div><div class="vn">UPGRADED</div>'
            '<div class="va">analyzed with version 2 · 16 Sep</div></div></div>'
            '<p>Two game changers, and Core allows none. Nothing else in the 99 reaches further.</p>'
            '<div class="pf"><div class="lbl">What other players say</div><p style="margin-top:4px">Of the 1,204 Avatar Aang decks that declared a bracket, 611 said Upgraded.</p></div></div>')


def climb():
    return ('<div><div class="lbl" style="margin-bottom:10px">Where you sit, and what moves you</div><div class="clb">'
            f'<div class="rung"><img src="{img("b3")}" style="opacity:.45" alt=""><div style="width:150px"><div class="rn">Core</div><div class="rs">to downgrade your deck</div></div>'
            '<div class="rt">Cut <b style="color:var(--fg)">two game changers</b>: Core allows none. <span class="lk">what would have to go →</span></div></div>'
            f'<div class="rung on"><img src="{img("b3")}" alt=""><div style="width:150px"><div class="rn" style="color:var(--bracket-3)">Upgraded</div><div class="rs">where your cards are</div></div>'
            '<div class="rt mt" style="font-size:11px;color:var(--bracket-3)">⚡ Game changers 2 <span style="color:var(--fg-faint)">of 3</span></div></div>'
            f'<div class="rung" style="border-style:dashed;background:transparent"><img src="{img("b4")}" style="opacity:.6" alt=""><div style="width:150px"><div class="rn">Optimized</div><div class="rs">to claim this</div></div>'
            '<div class="rt">Nothing to change: it permits more than this deck uses.</div></div></div></div>')


def findings():
    t = [("⚡ 2", "Game changers", "Smothering Tithe · Mystic Remora", False), ("0", "Mass land denial", "nothing in the list", True),
         ("0", "Extra turns", "nothing in the list", True), ("0", "Two-card infinites", "nothing in the list", True),
         ("⤒ 3", "Tutors", "Enlightened Tutor · Worldly Tutor · +1", False)]
    tiles = "".join(f'<div class="fdt{" z" if z else ""}"><div class="n">{n}</div><div class="h">{h}</div><div class="s">{s}</div>'
                    + ("" if z else '<span class="lk" style="font-size:10px">see the cards</span>') + '</div>' for n, h, s, z in t)
    return ('<div><div style="display:flex;justify-content:space-between;margin-bottom:10px"><span class="lbl">What is in this deck</span>'
            f'<span class="lk" style="font-size:10px">How we make these decisions →</span></div><div class="fdr">{tiles}</div></div>')


def howplays():
    t = [("Mana velocity", "Typical", 3, "Early ramp 8.5 · average spell 3.1 mana"), ("Card flow", "High", 4, "6 repeating engines, 9 one-time draws"),
         ("Interaction", "Typical", 3, "16 answers · 9 cheap and instant"), ("Win speed", "Typical", 3, "3 lines · 21% in hand by turn 8")]
    tiles = "".join(f'<div class="hpt"><div class="h">{h}</div><div class="g">{g.upper()}</div><div class="seg5">'
                    + "".join(f'<i class="{"f" if i < n else ""}"></i>' for i in range(5))
                    + f'</div><div class="s">{s}</div><span class="lk" style="font-size:10px">see the cards</span></div>' for h, g, n, s in t)
    return ('<div><div class="lbl" style="margin-bottom:10px">How it plays <span style="letter-spacing:0;text-transform:none;margin-left:8px">Graded on one scale for every Commander deck. Nothing here moves your bracket.</span></div>'
            f'<div class="hpr">{tiles}</div></div>'
            '<div class="dep"><div style="font-size:13px;font-weight:600">Dependencies <span class="disc" style="display:inline-block;margin-left:6px">i</span></div>'
            '<div class="r"><span class="t">LIGHT</span><b style="color:var(--fg);width:110px">Creatures</b><span style="flex:1"><b style="color:var(--fg)">21</b> cards that pay off on creatures</span>'
            '<span class="lbl" style="font-size:9px">broken by</span> Creature board wipes<span class="lk" style="margin-left:auto">see the 21 cards</span></div></div>')


def climb_phone():
    return ('<div><div class="lbl" style="margin-bottom:10px">Where you sit, and what moves you</div><div class="clb" style="padding:10px">'
            f'<div class="rung" style="flex-wrap:wrap;gap:8px"><img src="{img("b3")}" style="opacity:.45;width:22px;height:22px" alt=""><span class="rn">Core</span><span class="rs" style="margin-left:auto">to downgrade your deck</span>'
            '<span class="rt" style="flex-basis:100%">Cut <b style="color:var(--fg)">two game changers</b>: Core allows none.</span><span class="lk" style="margin-left:auto">what would have to go →</span></div>'
            f'<div class="rung on" style="flex-wrap:wrap;gap:8px"><img src="{img("b3")}" style="width:22px;height:22px" alt=""><span class="rn" style="color:var(--bracket-3)">Upgraded</span><span class="rs" style="margin-left:auto">your cards</span>'
            '<span class="rt mt" style="flex-basis:100%;font-size:11px;color:var(--bracket-3)">⚡ Game changers 2 <span style="color:var(--fg-faint)">of 3</span></span></div>'
            f'<div class="rung" style="flex-wrap:wrap;gap:8px;border-style:dashed;background:transparent"><img src="{img("b4")}" style="opacity:.6;width:22px;height:22px" alt=""><span class="rn">Optimized</span><span class="rs" style="margin-left:auto">already allowed</span>'
            '<span class="rt" style="flex-basis:100%">Nothing rules it out. It permits more than this deck uses.</span></div></div></div>')


def findings_phone():
    rows = [("⚡ 2", "Game changers", "Smothering Tithe · Mystic Remora", "see the cards →"), ("0", "Mass land denial", "", ""),
            ("0", "Extra turns", "", ""), ("0", "Two-card infinites", "", ""), ("⤒ 3", "Tutors", "Enlightened Tutor · Worldly Tutor · +1", "see the cards →")]
    out = "".join(f'<div style="flex-direction:column;align-items:stretch;gap:4px"><span style="display:flex;gap:10px;{"color:var(--fg-locked)" if not s else ""}"><b class="mt" style="font-weight:600">{n}</b><b style="font-weight:{600 if s else 400}">{h}</b></span>'
                  + (f'<span style="font-size:12px;color:var(--fg-muted)">{s}</span><span class="lk" style="align-self:flex-end">{l}</span>' if s else "") + '</div>' for n, h, s, l in rows)
    return (f'<div><div class="lbl" style="margin-bottom:10px">What is in this deck</div><div class="phr">{out}</div>'
            '<div style="margin-top:10px"><span class="lk">How we make these decisions →</span></div></div>')


def howplays_phone():
    rows = "".join(f'<div><b style="flex:1;font-weight:600">{h}</b><span style="font:700 14px Cinzel">{g.upper()}</span></div>'
                   for h, g in [("Mana velocity", "Typical"), ("Card flow", "High"), ("Interaction", "Typical"), ("Win speed", "Typical")])
    return (f'<div><div class="lbl" style="margin-bottom:10px">How it plays</div><div class="phr">{rows}</div></div>'
            '<div class="dep"><div style="font-size:13px;font-weight:600">Dependencies</div>'
            '<div style="font-size:12.5px;color:var(--fg-body)"><b style="color:var(--fg)">Creatures</b> · 21 cards that pay off on creatures</div></div>')


# ---------------------------------------------------------------- NEW: the strategies list
AANG = [("Allies", 22, 1.0, True), ("Spells matter", 17, .74, True), ("Tokens", 11, .47, True),
        ("Evasion", 9, .31, False), ("+1/+1 counters", 6, .19, True)]

SEC_SUB = "What this list runs more of than Commander cards at large, by card count. Nothing here moves your bracket."


def srow(name, n, w, offered=True, note=None, hot=False, picker=False):
    cls = "sx" + (" hot" if hot else "")
    chev = ""
    nt = f'<span class="snote">{note}</span>' if note else ""
    return (f'<div class="{cls}"><span class="sn">{name}</span><span class="sb" style="width:{w*100:.0f}%"></span>'
            f'<span class="sc">{n} cards</span><span class="sv">{chev}</span>{nt}</div>')


def strat_list(rows=AANG, hot=None, picker=False):
    out = []
    for name, n, w, off in rows:
        note = "too broad to build on" if (picker and not off) else None
        out.append(srow(name, n, w, off, note, hot == name))
    return f'<div class="bal">{"".join(out)}</div>'


def built_around(rows=AANG, phone_=False, state=None, hot=None):
    hint = ""
    head = (f'<div class="bah"><span class="lbl">What it’s built around</span>{hint}</div>'
            f'<div class="bas">{SEC_SUB}</div>')
    body = state if state else strat_list(rows, hot)
    return f'<div class="ba new">{head}{body}</div>'


# ---------------------------------------------------------------- Tuning hub
TOOLS = [("suggested", "Suggested changes"), ("mana", "Mana Balance"), ("cuts", "Proposed cuts"), ("history", "History")]


def tiles(phone_=False):
    t = []
    t.append(f'<div class="tile"><div class="t1"><span class="tm">{tool_mark("suggested")}</span><span class="tn">Suggested changes</span><span class="tc">›</span></div>'
             '<span class="tp">Up to five swaps, read from your games, your notes and the list.</span>'
             f'<span class="tf"><span class="cost">1 credit per run</span><span class="st">last run Oct 3{"" if phone_ else " · 3 of 5 applied"}</span></span></div>')
    t.append(f'<div class="tile"><div class="t1"><span class="tm">{tool_mark("mana")}</span><span class="tn">Mana Balance</span><span class="tc">›</span></div>'
             '<span class="tp">Counts every source of each color against what your spells ask for.</span>'
             '<span class="tf"><span class="cost">free</span><span class="st">last run Oct 12</span></span></div>')
    t.append(f'<div class="tile inert"><div class="t1"><span class="tm">{tool_mark("cuts")}</span><span class="tn">Proposed cuts</span></div>'
             '<span class="tp">Offered once the deck passes 100 cards. This one is at 100.</span></div>')
    t.append(f'<div class="tile"><div class="t1"><span class="tm">{tool_mark("history")}</span><span class="tn">History</span><span class="tc">›</span></div>'
             '<span class="tp">Every run of every tool on this deck, newest first.</span><span class="tf"><span class="st">7 runs</span></span></div>')
    return f'<div class="tiles">{"".join(t)}</div>'


def hub_landing(phone_=False):
    return f'<section class="hub"><h2>Tuning</h2>{tiles(phone_)}</section>'


def utabs(active="history"):
    out = ['<span>All tools</span>']
    for k, n in TOOLS:
        cls = "on" if k == active else ("inert" if k == "cuts" else "")
        out.append(f'<span class="{cls}"><span class="tm">{tool_mark(k, 14)}</span>{n}</span>')
    return f'<div class="utabs">{"".join(out)}</div>'


def phone_back(tool="history", n=4, back="‹ Tuning"):
    return (f'<div class="pback"><span class="b">{back}</span><span class="o"><span class="tm">{tool_mark(tool, 14)}</span>{n} of 4 tools</span></div>')


def hub_open(panel, phone_=False, active="history"):
    sw = phone_back(active, [k for k, _ in TOOLS].index(active) + 1) if phone_ else utabs(active)
    return f'<section class="hub"><h2>Tuning</h2>{sw}{panel}</section>'


# ---------------------------------------------------------------- suggestion card + answered rows
def thumb(key, side):
    return f'<img class="th {side}" src="{card(key)}" alt="">'


def pair_card(p, phone_=False, permits=None):
    cut_k, cut_n, add_k, add_n, owned, mark, price, why, cites, flag = p
    od = '<span class="od"></span>' if owned else '<span class="od no"></span>'
    marks = []
    if mark == "none":
        marks.append('<span class="avm"><i></i>none free</span>')
    if mark == "draft":
        marks.append('<span class="avm dr"><i></i>1 in a draft</span>')
    if price:
        marks.append(f'<span class="buy">buy {price}</span>')
    mk = f'<span class="marks">{"".join(marks)}</span>' if marks else ""
    cut = f'<span class="sd">{thumb(cut_k, "cut")}<span class="cn cut">{cut_n}</span></span>'
    if phone_:
        add = f'<span class="sd">{thumb(add_k, "add")}<span class="ar2">→</span>{od}<span class="cn add">{add_n}</span></span>'
        pr = f'<div class="pr">{cut}{add}</div>' + (f'<div class="marks">{"".join(marks)}</div>' if marks else "")
    else:
        add = f'<span class="sd"><span class="arr">→</span>{thumb(add_k, "add")}{od}<span class="cn add">{add_n}</span>{mk}</span>'
        pr = f'<div class="pr">{cut}{add}</div>'
    fl = (f'<div class="flag">Applying it raises the deck’s bracket to {bchip(4, "Optimized")}</div>' if flag else "")
    ci = "".join(f'<span class="cite"><span>{a}</span><span>{b}</span></span>' for a, b in cites)
    return (f'<article class="sg">{pr}<p class="rsn">{why}</p>{fl}'
            f'<div class="ft"><div class="cites">{ci}</div><div class="btns"><span class="ap">Apply</span><span class="rj">Reject</span></div></div></article>')


def answered(kind, cut_n, add_n, text=None):
    if kind == "ok":
        return (f'<div class="ans ok"><span class="al"><span class="ck">✓</span>applied</span>'
                f'<span class="ap2">{cut_n} <span style="color:var(--success)" class="mt">→</span> <b>{add_n}</b></span><span class="ub">Undo swap</span></div>')
    if kind == "rej":
        return (f'<div class="ans"><span class="al">rejected</span><span class="ap2">{cut_n} <span class="mt">→</span> {add_n}</span>'
                '<span class="ub">Show it again</span></div>')
    return f'<div class="ans"><span class="al">no longer applies</span><span class="ap2">{text}</span></div>'


def hist_row(date, tool, name, summary, tier, oc="ok", new=False):
    tr = '<span class="tier">free</span>' if tier == "free" else f'<span class="tier cr"><i></i>{tier}</span>'
    return (f'<div class="hrow{" nw" if new else ""}"><span class="hd">{date}</span><span class="ht"><span style="color:var(--fg-body);display:flex">{tool_mark(tool, 14)}</span>{name}</span>'
            f'<span class="hs">{summary}</span>{tr}<span class="oc">{oc}</span></div>')
