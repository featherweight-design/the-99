"""Game history R1 (account 2, 2026-10-31): shared kit. The shell (top bar, tab bar, rail) is lifted from Small items 7's
boards on main; the page parts are drawn from the shipped components they name (decks-view.tsx, stats-view-switch.tsx,
game-history-row.tsx, game-vs-line.tsx, identity-mark.tsx, recency-card.tsx) and checked against the About captures."""
import sys, os
sys.path.insert(0, '/home/user/the-99/design/design_handoff_the99_small_items_8/scratch-gen')
import lib8 as L
from shell import MHD, TBAR, RAIL

SRC = L.load('design_handoff_the99_small_items_7/Dates.dc.html')
HELM = L.helmet(SRC)

CSS = r"""<style>
/* ---------- game history (R1) ---------- */
.pg{display:flex;flex-direction:column;padding:20px 16px 0;gap:0}
.dk .pg{padding:16px 22px 0}
.ttl{margin:0;font:700 21px/1.2 'Cinzel',serif;font-variant:small-caps;letter-spacing:.01em;color:var(--fg)}
.dk .ttl{font-size:19px}
.hdr{display:flex;align-items:center;justify-content:space-between}
.hbt{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:22px}
.hbt .bp{background:#EDE6D8;color:#14110E}
.dk .hbt{display:flex;gap:8px;margin:0}
.cds{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}
.dk .cds{margin-top:16px;gap:12px;padding-top:16px;border-top:1px solid var(--border);margin-left:-22px;margin-right:-22px;padding-left:22px;padding-right:22px}
.cdx{border:1px solid var(--border-strong);border-radius:10px;background:var(--surface);padding:10px 30px 10px 12px;position:relative;display:flex;flex-direction:column;gap:3px}
.dk .cdx{padding:11px 34px 11px 14px}
.cdx b{font:500 14px 'IBM Plex Sans';color:var(--fg)}
.cdx small{font:11px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cdx::after{content:'\203A';position:absolute;right:12px;top:50%;transform:translateY(-55%);color:var(--fg-muted);font-size:16px}
/* the view row */
.vrw{display:flex;align-items:center;gap:10px;margin-top:12px}
.dk .vrw{margin-top:22px;gap:12px}
.seg{display:inline-flex;align-items:center;gap:2px;height:46px;padding:4px;border:1px solid var(--border-strong);border-radius:9px;flex:none}
.dk .seg{height:34px;padding:3px}
.seg span{height:100%;display:flex;align-items:center;padding:0 13px;border-radius:7px;font:400 14px 'IBM Plex Sans';color:var(--fg-muted)}
.dk .seg span{font-size:13px;padding:0 11px;border-radius:6px}
.seg span.on{background:var(--elevated);color:var(--fg);font-weight:500}
.seg span.nw{outline:1.5px dashed rgba(207,135,69,.8);outline-offset:-2px}
.vsep{width:1px;height:24px;background:var(--border-strong);flex:none}
.q-shp{margin-left:auto;display:flex;align-items:baseline;gap:7px;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.q-shp small{font:400 11.5px 'IBM Plex Mono';color:var(--fg-faint)}
.q-shp i{font-style:normal;color:var(--fg-muted);font-size:11px}
.q-dd{height:36px;display:inline-flex;align-items:center;gap:9px;padding:0 12px;border-radius:8px;border:1px solid var(--border-strong);background:var(--surface-raised);font:400 13px 'IBM Plex Sans';color:var(--fg);white-space:nowrap}
.q-dd i{font-style:normal;color:var(--fg-muted);font-size:10px}
.q-dd.q-set{border-color:var(--accent);color:var(--fg)}
.q-dd small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.fbt{height:44px;display:inline-flex;align-items:center;justify-content:center;padding:0 16px;border-radius:10px;border:1px solid var(--border-strong);font:400 14px 'IBM Plex Sans';color:var(--fg)}
.fbt b{margin-left:7px;min-width:20px;height:20px;border-radius:10px;background:var(--accent);color:#14110E;font:600 11px/20px 'IBM Plex Mono';text-align:center;padding:0 5px}
.q-frow{display:flex;align-items:center;gap:10px;margin-top:14px}
.chl{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:12px;font:12.5px 'IBM Plex Mono';color:var(--fg-faint)}
.chl .clr{margin-left:auto;text-decoration:underline;text-underline-offset:3px;color:var(--fg-locked)}
.chl .clr.on{color:var(--fg-muted)}
.chp{display:inline-flex;align-items:center;gap:7px;height:28px;padding:0 6px 0 11px;border-radius:14px;background:var(--elevated);font:12.5px 'IBM Plex Sans';color:var(--fg)}
.chp i{font-style:normal;color:var(--fg-muted);width:18px;text-align:center}
.cnt{margin-top:10px;padding-bottom:14px;border-bottom:1px solid var(--border);margin-left:-16px;margin-right:-16px;padding-left:16px;padding-right:16px;font:12.5px 'IBM Plex Mono';color:var(--fg-faint)}
.dk .cnt{margin-left:-22px;margin-right:-22px;padding-left:22px;padding-right:22px}
/* the summary */
.q-sum{display:flex;flex-direction:column;gap:7px;padding:20px 0 6px}
.q-sum h3{margin:0;font:700 17px/1.3 'Cinzel',serif;font-variant:small-caps;color:var(--fg);letter-spacing:.01em}
.dk .q-sum h3{font-size:20px}
.q-sum .q-ln{font:11px/1.6 'IBM Plex Mono';color:var(--fg-faint)}
.q-sum .q-ln b{font-weight:400;color:var(--fg-body)}
.q-sum .q-ln .q-tr{display:inline-flex;vertical-align:-2px;color:var(--fg-muted)}
.q-sum .low{font-size:13px;line-height:1.55;color:var(--fg-muted);max-width:620px}
/* month groups */
.q-mh{display:flex;align-items:baseline;gap:10px;margin:18px 0 10px;font:400 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.q-mh em{font-style:normal;letter-spacing:0;text-transform:none;font-size:11px;color:var(--fg-locked)}
.q-gl{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
/* the row: game-history-row.tsx, read-only, with the deck */
.q-gr{display:flex;flex-direction:column;min-height:64px;border-radius:9px;padding:8px 12px 8px 14px;background:var(--surface);border:1px solid var(--border);position:relative}
.dk .q-gr{min-height:52px}
.q-gr .dl{display:flex;align-items:center;gap:7px;min-width:0;padding:2px 0 6px;margin-bottom:6px;border-bottom:1px solid var(--border)}
.q-gr .dl .q-dn{flex:1;min-width:0;font:500 13px/1.4 'IBM Plex Sans';color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.q-gr .chv{flex:none;width:24px;display:flex;justify-content:flex-end;color:var(--fg-faint)}
.q-gr .r1{display:flex;flex-wrap:wrap;align-items:center;gap:14px}
.dk .q-gr .r1{flex-wrap:nowrap}
.dk .q-gr .dc{flex:none;width:230px;display:flex;align-items:center;gap:7px;min-width:0}
.dk .q-gr .dc .q-dn{min-width:0;font:500 13px/1.4 'IBM Plex Sans';color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rs{flex:none;width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;font:600 12px 'IBM Plex Mono';border:1px solid var(--border-strong);color:var(--fg-body)}
.rs.q-w{border-color:var(--success);color:var(--success)}
.q-mt{flex:none;font:11px 'IBM Plex Mono';color:var(--fg-faint);font-variant-numeric:tabular-nums}
.dk .q-mt{width:156px}
.vn{flex:none;width:44px;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.vn.q-ab{color:var(--fg-locked)}
.mks{order:9;flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px;min-width:0}
.dk .mks{order:0;flex:1 1 auto;flex-basis:auto}
.mks .q-nm{font:10.5px 'IBM Plex Mono';color:var(--fg-locked)}
.mk2{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 11px 4px 8px;font:10.5px 'IBM Plex Mono';background:var(--elevated);color:var(--fg-body)}
.mk2 i{width:6px;height:6px;border-radius:50%;background:var(--success)}
.mk2 i.q-h{background:var(--warning)}
.ph .q-gr .r1 .chv{margin-left:auto}
.vsl{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:6px 0 2px;padding-top:6px;border-top:1px solid var(--border)}
.dk .vsl{margin-left:488px;border-top:0;padding-top:0;gap:6px 16px}
.vsl>em{font:10px 'IBM Plex Mono';font-style:normal;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-locked)}
.q-st{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--fg);min-width:0}
.q-st .q-fc{flex:none;width:20px;height:20px;border-radius:5px;background:var(--elevated) center 20%/cover no-repeat;display:flex;align-items:center;justify-content:center;font:500 8px 'IBM Plex Mono';color:var(--fg-muted)}
.dk .q-st .q-fc{width:22px;height:22px}
.q-st small{font-size:12.5px;color:var(--fg-faint)}
.q-st .q-tr{display:inline-flex;color:var(--fg-muted)}
.q-nt{display:flex;gap:10px;margin-top:8px}
.dk .q-nt{padding-left:284px;margin-top:7px}
.q-nt i{flex:none;width:2px;border-radius:2px;background:var(--border-strong)}
.q-nt span{font-style:italic;font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
/* identity mark (identity-mark.tsx), 26px box, 7px pips */
.idm{position:relative;flex:none;width:26px;height:26px}
.idm b,.idm u{position:absolute;border-radius:50%}
.idm u{background:var(--border-dashed)}
.idm b{width:7px;height:7px}
.p-W{background:var(--w)}.p-U{background:var(--u)}.p-B{background:var(--b)}.p-R{background:var(--r)}.p-G{background:var(--g)}
/* the list's foot */
.q-lft{display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px 0 22px}
.q-lft small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.q-lft .bg{min-width:220px}
.dk .q-lft .bg{height:36px;font-size:13px}
.fade2{position:absolute;left:0;right:0;bottom:74px;height:70px;background:linear-gradient(to bottom,transparent,var(--bg));pointer-events:none;z-index:5}
.dk .fade2{bottom:0}
/* the empty state */
.emp{display:flex;flex-direction:column;gap:14px;padding:26px 0 8px;max-width:560px}
.emp h3{margin:0;font:700 17px/1.3 'Cinzel',serif;font-variant:small-caps;color:var(--fg)}
.dk .emp h3{font-size:20px}
.emp p{font-size:13.5px;line-height:1.6;color:var(--fg-body)}
.emp .pk{display:flex;flex-direction:column;gap:8px}
.emp .pk small{font:10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.emp .q-pr{display:flex;gap:8px}
.dsl{flex:1;min-width:0;height:44px;display:flex;align-items:center;gap:8px;padding:0 12px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface-raised);font:14px 'IBM Plex Sans';color:var(--fg)}
.dsl span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsl i{font-style:normal;color:var(--fg-muted);font-size:10px}
.dk .dsl{height:36px;font-size:13px;flex:0 1 300px}
.dk .emp .bp{height:36px}
.emp .r0{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border:1px solid var(--border);border-radius:10px;background:var(--surface-sunken);font-size:13px;line-height:1.55;color:var(--fg-body)}
.emp .r0 span{flex:1}
.emp .r0 u{color:var(--accent-text);text-decoration:none;white-space:nowrap;font-weight:500}
/* the filter sheet (ui/sheet.tsx box) */
.sht2{position:absolute;z-index:31;left:0;right:0;bottom:0;background:var(--surface-raised);border-top:1px solid var(--border-strong);border-radius:14px 14px 0 0;box-shadow:0 -14px 40px rgba(0,0,0,.6);display:flex;flex-direction:column}
.sht2 .grb{width:40px;height:4px;border-radius:2px;background:var(--border-strong);margin:8px auto 0}
.sht2 .shh{display:flex;align-items:center;justify-content:space-between;padding:10px 12px 10px 18px;border-bottom:1px solid var(--border)}
.sht2 .shh b{font:600 16px 'IBM Plex Sans'}
.sht2 .shh i{font-style:normal;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:16px}
.sht2 .q-sb{padding:14px 18px;display:flex;flex-direction:column;gap:18px}
.sgr{display:flex;flex-direction:column;gap:9px}
.sgr>small{font:10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.tgs{display:flex;flex-wrap:wrap;gap:8px}
.q-tg{height:40px;display:inline-flex;align-items:center;gap:8px;padding:0 14px;border-radius:9px;border:1px solid var(--border-strong);font:14px 'IBM Plex Sans';color:var(--fg-body)}
.q-tg small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.q-tg.on{border-color:var(--accent);color:var(--fg);background:color-mix(in oklab,var(--accent) 12%,transparent)}
.opl{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:10px;overflow:hidden}
.opr{display:flex;align-items:center;gap:10px;min-height:46px;padding:0 12px;border-top:1px solid var(--border);font-size:14px;color:var(--fg)}
.opr:first-child{border-top:0}
.opr .q-fc{width:26px;height:26px;border-radius:6px;background:var(--elevated) center 20%/cover;flex:none;display:flex;align-items:center;justify-content:center;font:500 9px 'IBM Plex Mono';color:var(--fg-muted)}
.opr span{flex:1}
.opr small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.opr .q-bx{width:18px;height:18px;border-radius:5px;border:1px solid var(--border-strong);flex:none}
.opr .q-bx.on{background:var(--accent);border-color:var(--accent);position:relative}
.opr .q-bx.on::after{content:'';position:absolute;left:5px;top:2px;width:5px;height:9px;border:solid #14110E;border-width:0 2px 2px 0;transform:rotate(45deg)}
.opr.q-sub{font-size:11px;font-family:'IBM Plex Mono';color:var(--fg-faint);min-height:30px;background:var(--surface-sunken);letter-spacing:.1em;text-transform:uppercase}
.fld2{height:44px;display:flex;align-items:center;gap:8px;padding:0 12px;border-radius:10px;border:1px solid var(--border-strong);background:var(--bg);color:var(--fg-faint);font-size:14px}
.sht2 .sft{display:flex;gap:10px;padding:12px 18px 18px;border-top:1px solid var(--border)}
.sht2 .sft .bp{flex:1}
.q-scrim{position:absolute;inset:0;background:rgba(8,6,4,.62);z-index:30}
/* anchored panel (desktop) */
.apn{position:absolute;z-index:31;width:300px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface-raised);box-shadow:0 18px 40px rgba(0,0,0,.55);padding:8px;display:flex;flex-direction:column;gap:8px}
.apn .fld2{height:34px;font-size:13px}
.apn .opr{min-height:38px;font-size:13px}
.apn .opr .q-fc{width:22px;height:22px}
/* the arrival ring on a deck's Games tab, over the capture */
.cap2{position:relative;flex:none;overflow:hidden;border:1px solid var(--border-strong)}
.cap2 img{display:block;width:100%}
.cap2 .ring{position:absolute;border:2px solid var(--accent);border-radius:10px;box-shadow:0 0 0 4px rgba(207,135,69,.22)}
.cap2 .q-pin{position:absolute;background:var(--accent);color:#14110E;font:600 10px 'IBM Plex Mono';padding:3px 7px;border-radius:5px;white-space:nowrap}
/* the recency card (recency-card.tsx), shortened */
.rcy{border:1px solid var(--border);border-radius:12px;background:var(--surface-sunken);padding:16px 14px;display:flex;flex-direction:column;gap:12px}
.dk .rcy{padding:18px 20px}
.rcy header{display:flex;align-items:baseline;gap:10px}
.rcy header h4{margin:0;font:400 17px 'Cinzel',serif;color:var(--fg)}
.rcy header small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.rcy header i{margin-left:auto;font-style:normal;color:var(--fg-muted)}
.rcy .wn{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px}
.rcy .wn b{font:600 22px/1 'IBM Plex Mono'}
.rcy .wn small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.rln{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:2px 10px;padding:6px 0;border-bottom:1px solid var(--border)}
.dk .rln{grid-template-columns:230px minmax(0,1fr) 150px;min-height:40px;padding:0;gap:14px}
.rln .q-nm{display:flex;align-items:center;gap:7px;font-size:13px;min-width:0}
.rln .q-nm u{text-decoration:underline dotted var(--accent);text-underline-offset:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rln .ln2{position:relative;height:30px;grid-column:1/-1}
.dk .rln .ln2{grid-column:auto}
.rln .ln2::before{content:'';position:absolute;left:0;right:0;top:14px;height:1px;background:var(--border-strong)}
.rln .ln2 s{position:absolute;top:8px;width:14px;height:14px;border-radius:4px;border:1px solid var(--fg-muted);font:600 9px/12px 'IBM Plex Mono';text-decoration:none;text-align:center;color:var(--fg-body);background:var(--surface-sunken)}
.rln .ln2 s.q-w{background:#C9A54E;border-color:#C9A54E;color:#14110E}
.rln .q-ft{display:flex;flex-direction:column;align-items:flex-end;gap:1px}
.ph .rln .q-ft{grid-row:1;grid-column:2}
.rln .q-ft b{font:400 11.5px 'IBM Plex Mono';color:var(--fg)}
.rln .q-ft small{font:10px 'IBM Plex Mono';color:var(--fg-faint)}
.rcy .cpt{display:flex;align-items:center;gap:10px;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.rcy .cpt .lnk{margin-left:auto;font-size:13px}
.newx{outline:1.5px dashed rgba(207,135,69,.85);outline-offset:3px;border-radius:6px}
.dashx{outline:1.5px dashed rgba(198,83,63,.85);outline-offset:3px;border-radius:6px}
.tst2{position:absolute;z-index:45;left:16px;right:16px;display:flex;align-items:center;gap:10px;padding:10px 6px 10px 14px;border-radius:12px;background:var(--elevated);border:1px solid var(--border-strong);box-shadow:0 14px 30px rgba(0,0,0,.55);font-size:13.5px;color:var(--fg)}
.tst2>i{width:8px;height:8px;border-radius:50%;background:var(--danger);flex:none}
.tst2 span{flex:1}
.tst2 u{text-decoration:none;color:var(--accent-text);font-weight:500;padding:0 8px;white-space:nowrap}
.tst2 b{width:36px;height:36px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-weight:400}
.dk .tst2{left:auto;right:22px;width:380px}
.spin{display:inline-block;width:12px;height:12px;border-radius:50%;border:2px solid var(--border-strong);border-top-color:var(--fg-muted);margin-right:8px}
.q-fc{overflow:hidden}.q-fc img{width:100%;height:100%;object-fit:cover;object-position:50% 20%;display:block}
.capx{overflow:hidden;position:relative}.capx img{position:absolute;display:block}
.q-cf{flex:none;width:26px;height:26px;border-radius:6px;overflow:hidden;background:var(--elevated)}.q-cf img{width:100%;height:100%;object-fit:cover;object-position:50% 25%;display:block}
.legend{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);margin-top:4px}
</style>"""

CHEV = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 5.5 12.5 10 8 14.5"/></svg>'
CARET = '<i>&#9662;</i>'
TROPHY = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 2.5h7v4a3.5 3.5 0 0 1-7 0v-4Z"/><path d="M4.5 4H2.5a1.5 1.5 0 0 0 2 2.3M11.5 4h2a1.5 1.5 0 0 1-2 2.3M8 10v2.5M5.5 13.5h5"/></svg>'
SEARCH = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8.6" cy="8.6" r="5.6"/><path d="M12.8 12.8 17 17"/></svg>'

# --- identity mark (identity-mark.tsx geometry) ---
import math
PC = {1: [(0, 0)], 2: [(-4, 0), (4, 0)], 3: [(0, -4.6), (4, 2.3), (-4, 2.3)], 4: [(0, -5.6), (5.6, 0), (0, 5.6), (-5.6, 0)],
      5: [(6.8 * math.cos(math.radians(-90 + i * 72)), 6.8 * math.sin(math.radians(-90 + i * 72))) for i in range(5)]}


def idm(colors):
    cs = [c for c in 'WUBRG' if c in colors] or ['C']
    cen = PC[len(cs)]; ys = [p[1] for p in cen]; dy = -(min(ys) + max(ys)) / 2
    halos = cen + ([(0, 0)] if len(cs) >= 3 else [])
    at = lambda x, y, r: f'left:{13 + x - r:.1f}px;top:{13 + y + dy - r:.1f}px;width:{2 * r}px;height:{2 * r}px'
    h = ''.join(f'<u style="{at(x, y, 5.5)}"></u>' for x, y in halos)
    h += ''.join(f'<u style="{at(x, y, 4.5)};background:var(--surface)"></u>' for x, y in halos)
    for (x, y), c in zip(cen, cs):
        st = 'background:transparent;border:1.5px solid var(--fg-faint);box-sizing:border-box' if c == 'C' else ''
        h += f'<b class="p-{c}" style="{at(x, y, 3.5)};{st}"></b>'
    return f'<span class="idm">{h}</span>'


# --- fixtures ---
DECKS = {'gishath': ('HD - Sai', 'U', 'sai'), 'goblins': ('HD - Lathliss', 'R', 'lathliss'), 'aang': ('HD - Dina', 'BG', 'dina'),
         'elves': ('HD - Ashling', 'R', 'ashling'), 'scrappy': ('HD Tune - Zada', 'R', 'zada'), 'kratos': ('HD - Killian', 'WB', 'killian')}
AX = {'speed': 'Speed', 'card_flow': 'Cards in hand', 'mana': 'Mana', 'interaction': 'Answers', 'board': 'Board presence',
      'resilience': 'Comebacks', 'engine': 'The deck’s plan', 'closing': 'Closing the game'}
ORDER = list(AX)


def seat(name, sub=None, face=None, won=False, initials=None):
    return dict(name=name, sub=sub, face=face, won=won, ini=initials or name[:2].upper())


def game(deck, res, pod, date, v, worked=(), hurt=(), seats=(), note=None):
    return dict(deck=deck, res=res, pod=pod, date=date, v=v, worked=worked, hurt=hurt, seats=seats, note=note)


def marks(g):
    out = []
    for k in ORDER:
        if k in g['worked']: out.append(f'<span class="mk2"><i></i>{AX[k]}</span>')
        elif k in g['hurt']: out.append(f'<span class="mk2"><i class="q-h"></i>{AX[k]}</span>')
    return ''.join(out) or '<span class="q-nm">—</span>'


def vsline(seats):
    if not seats: return ''
    h = '<em>vs</em>'
    for s in seats:
        tr = f'<span class="q-tr">{TROPHY}</span>' if s['won'] else ''
        fc = f'<span class="q-fc"><img src="art/{s['face']}.jpg" alt=""></span>' if s['face'] else f'<span class="q-fc">{s["ini"]}</span>'
        sub = f'<small>· {s["sub"]}</small>' if s['sub'] else ''
        h += f'<span class="q-st">{tr}{fc}<span>{s["name"]}</span>{sub}</span>'
    return f'<div class="vsl">{h}</div>'


def row(g, desk=False, social=True, cls=''):
    name, col, face = DECKS[g['deck']]
    cf = f'<span class="q-cf"><img src="art/{face}.jpg" alt=""></span>'
    rs = {'win': ('q-w', 'W'), 'loss': ('', 'L'), 'draw': ('', 'D')}[g['res']]
    sq = f'<span class="rs {rs[0]}">{rs[1]}</span>'
    meta = f'<span class="q-mt">{g["pod"]}-player · {g["date"]}</span>'
    vn = f'<span class="vn">v{g["v"]}</span>' if g['v'] else '<span class="vn q-ab">—</span>'
    mk = f'<span class="mks">{marks(g)}</span>'
    chev = f'<span class="chv">{CHEV}</span>'
    vs = vsline(g['seats']) if social else ''
    nt = f'<div class="q-nt"><i></i><span>“{g["note"]}”</span></div>' if g['note'] else ''
    if desk:
        dc = f'<span class="dc">{cf}<span class="q-dn">{name}</span></span>'
        return f'<li class="q-gr {cls}"><div class="r1">{dc}{sq}{meta}{vn}{mk}{chev}</div>{vs}{nt}</li>'
    dl = f'<div class="dl">{cf}<span class="q-dn">{name}</span>{chev}</div>'
    return f'<li class="q-gr {cls}">{dl}<div class="r1">{sq}{meta}{vn}{mk}</div>{vs}{nt}</li>'


def month(label, sub):
    return f'<div class="q-mh">{label}<em>{sub}</em></div>'


def glist(gs, desk=False, social=True, marks_cls=None):
    marks_cls = marks_cls or {}
    return '<ul class="q-gl">' + ''.join(row(g, desk, social, marks_cls.get(i, '')) for i, g in enumerate(gs)) + '</ul>'


# --- page parts ---
def head(desk):
    if desk:
        return ('<div class="hdr"><h1 class="ttl">Decks</h1><div class="hbt"><span class="bg">Import</span><span class="bp">New deck</span></div></div>'
                '<div class="cds"><div class="cdx"><b>Shopping for all decks</b><small>248 to buy · $663.94 · 7 decks</small></div>'
                '<div class="cdx"><b>Commander precons</b><small>181 decklists · newest Oct 2, 2026</small></div></div>')
    return ('<h1 class="ttl">Decks</h1><div class="hbt"><span class="bp">New deck</span><span class="bg">Import a deck</span></div>'
            '<div class="cds"><div class="cdx"><b>Shop all decks</b><small>248 · $663.94</small></div>'
            '<div class="cdx"><b>Precons</b><small>181 decklists</small></div></div>')


def switch(view='games', new=True):
    segs = ''.join(f'<span class="{"on" if k == view else ""}{" nw" if (k != "stats" and new) else ""}">{v}</span>' for k, v in (('tiles', 'Decks'), ('games', 'Games'), ('stats', 'Stats')))
    return f'<span class="seg">{segs}</span>'


def phone(body, h=844, extra='', fade=False):
    f = '<div class="fade2"></div>' if fade else ''
    return f'<div class="ph" style="height:{h}px">{MHD}<div class="pb"><div class="pg">{body}</div></div>{f}{extra}{TBAR}</div>'


def desk(body, h=900, extra='', fade=False):
    f = '<div class="fade2"></div>' if fade else ''
    return f'<div class="dk" style="width:1300px;height:{h}px">{RAIL}<div class="main" style="overflow:hidden"><div class="pg">{body}</div></div>{f}{extra}</div>'


def filt_phone(deck='All decks', n=6, chips=(), cnt='23 games', badge=0, show=True):
    if not show:
        return f'<div class="vrw">{switch()}</div><div class="cnt" style="margin-top:12px">{cnt}</div>'
    dk = f'<span class="q-shp">{deck}<small>{n}</small><i>&#9662;</i></span>'
    b = f'<b>{badge}</b>' if badge else ''
    ch = ''.join(f'<span class="chp">{c}<i>✕</i></span>' for c in chips) if chips else '<span>No filters on</span>'
    clr = '<span class="clr on">Clear all filters</span>' if chips else '<span class="clr">Clear all filters</span>'
    return (f'<div class="vrw">{switch()}{dk}</div><div class="q-frow"><span class="fbt">Filter games{b}</span></div>'
            f'<div class="chl">{ch}{clr}</div><div class="cnt">{cnt}</div>')


def filt_desk(deck=None, result=None, against=None, chips=(), cnt='23 games', show=True, social=True):
    if not show:
        return f'<div class="vrw">{switch()}</div><div class="cnt" style="margin-top:14px">{cnt}</div>'
    def dd(lbl, val):
        return f'<span class="q-dd{" q-set" if val else ""}">{val or lbl}{CARET}</span>'
    ag = dd('Played against', against) if social else ''
    ch = ''.join(f'<span class="chp">{c}<i>✕</i></span>' for c in chips) if chips else '<span>No filters on</span>'
    clr = '<span class="clr on">Clear all filters</span>' if chips else '<span class="clr">Clear all filters</span>'
    return (f'<div class="vrw">{switch()}<span class="vsep"></span>{dd("All decks", deck)}{dd("Any result", result)}{ag}</div>'
            f'<div class="chl">{ch}{clr}</div><div class="cnt">{cnt}</div>')


def summary(h3, lines=(), low=None):
    ls = ''.join(f'<div class="q-ln">{l}</div>' for l in lines)
    lw = f'<p class="low">{low}</p>' if low else ''
    return f'<div class="q-sum"><h3>{h3}</h3>{ls}{lw}</div>'


def toast(text, act='Try again', bottom=90):
    return f'<div class="tst2" style="bottom:{bottom}px"><i></i><span>{text}</span><u>{act}</u><b>✕</b></div>'


DRAFT = '<span class="draft8">DRAFT</span>'


def build_doc(title, body, width=2000, extra_css=''):
    return L.doc(title, HELM + CSS + extra_css, body.replace('<span class="tag">R1</span>', '<span class="tag">R1c</span>'), width)
