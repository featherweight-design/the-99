"""Wizards announcements R1: the early decklist on Precons (surface 3).

Drawn in the home kit's shell over src/components/decks/precons/: precon-list-view.tsx (head, toolbar), announced-group.tsx
and announced-parts.tsx (the Announced group, the dashed set block, revealed tiles, the none plate, the `new` tag),
precon-tile.tsx (the tile and its caption), announced-row.tsx (rows view), open-precon-view.tsx (the precon page) and
decklist-row.tsx's read-only row (owned dot, name, pips, printed SET number). Fixture: FDC, its five lists as the app
already lists them (Calling All Angels 20 of 68, Keen Engineering 31 of 66, Reign of Dragons 21 of 68), drawn as if
announced, three of five lists out. Card images are the app's own precon-grid art.
"""
import kit
from kit import img, ico

kit.CSS += r"""
/* ---- the precon list page ---- */
.z-plp{display:flex;flex-direction:column}
.z-plp .z-phd{display:flex;flex-direction:column;gap:4px;border-bottom:1px solid var(--border);padding:12px 16px}
.dk .z-plp .z-phd{padding:16px 22px}
.z-bk{font:11px 'IBM Plex Mono';color:var(--fg-faint);min-height:24px;display:flex;align-items:center}
.z-plp h1{margin:0;font:400 24px 'Cinzel',serif;color:var(--fg)}
.z-plp .z-sbl{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.z-tbar{padding:12px 16px 0;display:flex;flex-direction:column;gap:10px}
.dk .z-tbar{padding:12px 22px 0}
.z-tbar .z-r1{display:flex;gap:8px;align-items:center}
.z-srch{flex:1;min-width:0;height:44px;border-radius:9px;border:1px solid var(--border-strong);background:var(--surface-sunken);display:flex;align-items:center;gap:8px;padding:0 12px;font-size:13.5px;color:var(--fg-faint)}
.dk .z-srch{height:38px}
.z-vtg{flex:none;display:flex;border:1px solid var(--border-strong);border-radius:9px;padding:3px;gap:3px}
.z-vtg span{width:34px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:6px;color:var(--fg-muted);font-size:15px}
.dk .z-vtg span{height:30px}
.z-vtg span.on{background:var(--elevated);color:var(--fg)}
.z-pipsr{display:flex;gap:6px}
.z-pipsr i{width:44px;height:44px;border-radius:10px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center}
.dk .z-pipsr i{width:38px;height:38px}
.z-pipsr i b{width:14px;height:14px;border-radius:50%;display:block}
.z-srt{min-height:44px;display:flex;align-items:center;padding:0 12px;border:1px solid var(--border-strong);border-radius:9px;font:500 13px 'IBM Plex Sans';color:var(--fg-body)}
.dk .z-srt{min-height:38px}
.z-rsl{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.z-pgrp{padding:16px 16px 0;display:flex;flex-direction:column;gap:10px}
.dk .z-pgrp{padding:18px 22px 0}
.z-ghd{margin:0;display:flex;align-items:center;gap:8px;min-height:44px;border-bottom:1px solid var(--border);font:400 17px 'Cinzel',serif;color:var(--fg)}
.dk .z-ghd{min-height:34px;padding-bottom:7px}
.z-ghd span{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.z-ghd .z-chev{margin-left:auto;color:var(--fg-muted);font-size:12px}
.z-ntag2{flex:none;border-radius:4px;border:1px solid color-mix(in srgb,var(--accent) 45%,transparent);padding:0 5px;font:10px/16px 'IBM Plex Mono';letter-spacing:.06em;color:var(--accent-text)}
.z-etag{flex:none;border-radius:4px;border:1px solid color-mix(in srgb,var(--fact) 55%,transparent);padding:0 5px;font:10px/16px 'IBM Plex Mono';letter-spacing:.04em;color:var(--fact);white-space:nowrap}
.z-sblk{display:flex;flex-direction:column;gap:10px;border-radius:10px;border:1px dashed var(--border-dashed);padding:11px 12px 12px}
.dk .z-sblk{padding:12px 14px 14px}
.z-sblk .z-sh2{display:flex;align-items:center;gap:8px}
.z-sblk h3{margin:0;font:400 15px 'Cinzel',serif;color:var(--fg)}
.dk .z-sblk h3{font-size:16px}
.z-sblk .z-ml{font:11px/1.5 'IBM Plex Mono';color:var(--fg-faint)}
.z-sblk .z-ml b{font-weight:400;color:var(--fg-body)}
.z-tgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.dk .z-tgrid{grid-template-columns:repeat(auto-fill,minmax(178px,1fr));gap:12px}
.z-tile{display:flex;flex-direction:column;border-radius:9px;overflow:hidden;border:1px solid var(--border);background:var(--surface);min-width:0;position:relative}
.dk .z-tile{border-radius:10px}
.z-tile .z-art{position:relative;aspect-ratio:63/88;overflow:hidden;background:var(--surface-sunken);border-radius:0 0 9px 9px}
.z-tile .z-art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.z-tile .z-art::after{content:'';position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
.z-tile .z-cap{min-height:70px;display:flex;flex-direction:column;justify-content:center;gap:3px;padding:8px 9px}
.dk .z-tile .z-cap{min-height:65px;padding:6px 10px}
.z-tile .z-cap .z-mt{display:flex;align-items:center;gap:6px;font:9px 'IBM Plex Mono';color:var(--fg-faint);min-width:0;white-space:nowrap}
.dk .z-tile .z-cap .z-mt{font-size:9.5px}
.z-tile .z-cap .z-mt b{font-weight:600;color:var(--fg)}
.z-tile .z-cap .z-mt em{font-style:normal;color:var(--accent-text)}
.z-tile .z-cap .z-nm{font:600 12px/16px 'IBM Plex Sans';color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dk .z-tile .z-cap .z-nm{font-size:13px;line-height:17px}
.z-tile .z-cap .z-sb2{display:flex;align-items:center;gap:5px;overflow:hidden;font:9px 'IBM Plex Mono';color:var(--fg-faint);min-width:0;white-space:nowrap}
.dk .z-tile .z-cap .z-sb2{font-size:9.5px}
.z-dts{display:flex;gap:3px;flex:none}
.z-dts i{width:8px;height:8px;border-radius:50%;display:block}
.dk .z-dts i{width:9px;height:9px}
.z-tile .z-cap .z-sb2 .z-etag{font-size:9px;line-height:14px;padding:0 4px}
.z-nplate{width:76px;height:106px;border-radius:4px;border:1px solid var(--border);background:var(--surface-sunken);display:flex;align-items:center;justify-content:center;text-align:center;padding:0 6px;font:9px/1.4 'IBM Plex Mono';color:var(--fg-locked)}
.dk .z-nplate{width:84px;height:117px}
.z-tile.z-rv .z-cap{min-height:52px}
.z-lat{position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(180deg,rgba(20,17,14,0),var(--bg) 85%);pointer-events:none}
/* rows view */
.z-arow{border-radius:10px;border:1px dashed var(--border-dashed);display:flex;flex-direction:column}
.z-arow .z-hd{display:flex;align-items:center;gap:11px;min-height:44px;padding:10px 8px 10px 12px}
.z-arow .z-pl{width:34px;height:48px;border-radius:4px;border:1px solid var(--border);background:var(--surface-sunken);flex:none}
.z-arow .z-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.z-arow .z-t1{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.z-arow .z-t1 .z-n{font:400 14.5px 'Cinzel',serif;color:var(--fg);display:flex;align-items:center;gap:8px}
.z-arow .z-t1 small{font:11px 'IBM Plex Mono';color:var(--fg-body);white-space:nowrap}
.z-arow .z-t2{font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.z-arow .z-t3{display:flex;align-items:center;gap:6px;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.z-arow .z-reg{margin-left:12px;border-top:1px dashed var(--border-strong);padding:12px 12px 12px 0;display:flex;flex-direction:column;gap:8px}
.z-prow{display:flex;align-items:center;gap:11px;min-height:60px;padding:6px 8px 6px 10px;border-radius:10px;border:1px solid var(--border);background:var(--surface)}
.z-prow img{width:34px;height:48px;border-radius:3px;object-fit:cover;flex:none}
.z-prow .z-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.z-prow .z-nm{font:600 13.5px 'IBM Plex Sans';color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.z-prow .z-m2{display:flex;align-items:center;gap:6px;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.z-prow .z-m2 b{color:var(--fg);font-weight:600}
/* ---- the precon page, early ---- */
.z-pp{display:flex;flex-direction:column}
.z-pp .z-phd{display:flex;flex-direction:column;gap:12px;border-bottom:1px solid var(--border);padding:12px 16px 14px}
.dk .z-pp .z-phd{padding:16px 22px 18px}
.z-pp .z-tp{display:flex;align-items:flex-start;gap:12px}
.z-pp .z-th{width:64px;height:89px;border-radius:5px;overflow:hidden;flex:none;box-shadow:0 4px 12px rgba(0,0,0,.5)}
.dk .z-pp .z-th{width:84px;height:117px}
.z-pp .z-th img{width:100%;height:100%;object-fit:cover;display:block}
.z-pp .z-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.z-pp .z-ey{display:flex;align-items:center;gap:8px;font:9.5px 'IBM Plex Mono';letter-spacing:.08em;text-transform:uppercase;color:var(--fg-faint)}
.z-pp h1{margin:0;font:400 22px/1.15 'Cinzel',serif;color:var(--fg)}
.dk .z-pp h1{font-size:26px}
.z-pp .z-cm{font-size:13.5px;color:var(--fg-body)}
.z-pp .z-mt{display:flex;align-items:center;gap:6px;font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.z-pp .z-mt .z-dts i{width:10px;height:10px}
.z-pp .z-st{flex:none;height:40px;display:flex;align-items:center;padding:0 16px;border-radius:8px;background:var(--accent);color:var(--bg);font:600 13.5px 'IBM Plex Sans'}
.z-pp .z-lkd{flex:none;height:40px;display:flex;align-items:center;padding:0 16px;border-radius:8px;border:1px solid var(--border-strong);color:var(--fg);font:500 13px 'IBM Plex Sans'}
.z-eband{display:flex;flex-direction:column;gap:6px;border-radius:10px;border:1px dashed color-mix(in srgb,var(--fact) 60%,transparent);background:color-mix(in srgb,var(--fact) 6%,var(--bg));padding:11px 13px}
.dk .z-eband{flex-direction:row;align-items:center;gap:16px;padding:12px 16px}
.z-eband p{flex:1;font-size:13px;line-height:1.55;color:var(--fg-body)}
.z-eband p b{color:var(--fg);font-weight:600}
.z-eband .z-lk{flex:none;min-height:44px;display:flex;align-items:center;font:500 13px 'IBM Plex Sans';color:var(--accent-text);white-space:nowrap}
.dk .z-eband .z-lk{min-height:32px}
.z-own{display:flex;flex-direction:column;gap:8px;border-radius:10px;border:1px solid var(--border);background:var(--surface-sunken);padding:11px 13px}
.dk .z-own{padding:12px 16px}
.z-own p{font-size:14px;color:var(--fg-body);display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
.z-own p b{font:600 15px 'IBM Plex Mono';color:var(--fg)}
.z-own .z-br{height:3px;border-radius:2px;background:var(--border-strong)}
.z-own .z-br i{display:block;height:100%;border-radius:2px;background:var(--fg-muted)}
.z-own .z-l2{font-size:12.5px;line-height:1.55;color:var(--fg-body)}
.z-ecb{display:flex;flex-direction:column;gap:8px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface);padding:12px 14px}
.z-ecb p{font-size:13px;line-height:1.5;color:var(--fg-body)}
.z-ecb span{font:500 13px 'IBM Plex Sans';color:var(--fg)}
.z-pp .z-ln{display:flex;align-items:center;justify-content:space-between;gap:12px;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.z-pp .z-vt{display:flex;border:1px solid var(--border-strong);border-radius:9px;padding:3px;gap:3px;flex:none}
.z-pp .z-vt span{height:30px;padding:0 11px;display:flex;align-items:center;border-radius:6px;font:500 12.5px 'IBM Plex Sans';color:var(--fg-muted)}
.z-pp .z-vt span.on{background:var(--elevated);color:var(--fg)}
.z-pp .z-lst{padding:12px 16px 16px;display:flex;flex-direction:column;gap:14px}
.dk .z-pp .z-lst{padding:14px 26px 20px}
.z-dgp{display:flex;flex-direction:column;gap:4px}
.z-dgp h4{margin:0 0 4px;display:flex;gap:8px;align-items:baseline;font:600 14.5px 'IBM Plex Sans';color:var(--fg)}
.z-dgp h4 em{font:normal 11px 'IBM Plex Mono';color:var(--fg-muted)}
.z-rr{display:flex;align-items:center;gap:10px;height:36px;padding:0 10px;border-radius:8px;background:var(--surface-rail);font-size:14px;color:var(--fg)}
.z-rr .z-ow{width:8px;height:8px;border-radius:50%;background:var(--success);flex:none}
.z-rr .z-ow.no{background:transparent;border:1.5px dashed var(--fg-faint)}
.z-rr .z-nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.z-rr .z-q{font:11px 'IBM Plex Mono';color:var(--fg-muted);margin-left:-4px}
.z-rr .z-cst{display:flex;gap:2px;flex:none}
.z-rr .z-cst i{width:12px;height:12px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:600 8px 'IBM Plex Mono';font-style:normal;color:#14110E}
.z-rr .z-sn{flex:none;font:10px 'IBM Plex Mono';color:var(--fg-faint)}
.z-rr.z-um{background:transparent;border:1px dashed var(--border-dashed);color:var(--fg-body)}
.z-rr.z-um .z-nm{font-style:normal}
.z-dgp .z-gn{font-size:12.5px;line-height:1.55;color:var(--fg-muted);margin:0 0 4px}
.z-dock{position:absolute;left:0;right:0;bottom:62px;z-index:5;padding:10px 16px;border-top:1px solid var(--border);background:var(--bg);display:flex;flex-direction:column;gap:8px}
.z-dock small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.z-dock .z-row2{display:flex;gap:8px}
.z-dock .z-row2 span{height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;font:600 15px 'IBM Plex Sans'}
.z-dock .z-row2 .z-s{flex:2;background:var(--accent);color:var(--bg)}
.z-dock .z-row2 .z-l{flex:1;border:1px solid var(--border-strong);color:var(--fg);font-weight:500;font-size:13px}
.z-pov{display:flex;flex-direction:column;gap:6px}
.z-pov .z-lh{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.z-pov .z-lbl{font:500 10.5px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.z-pov .z-lh small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.z-pov .z-ovp{font-size:14px;line-height:1.7;color:var(--fg-body)}
.dk .z-pov .z-ovp{max-width:760px}
.z-pov .z-lk{font:500 13px 'IBM Plex Sans';color:var(--accent-text);display:inline-flex;align-items:center;min-height:32px}
/* skeleton */
.z-sk{background:var(--elevated);border-radius:3px;display:block}
.z-skr{height:36px;border-radius:8px;background:var(--surface-rail);display:block}
"""

WUBRG = {"W": "var(--w)", "U": "var(--u)", "B": "var(--b)", "R": "var(--r)", "G": "var(--g)", "C": "var(--fg-faint)"}


def dots(ident):
    return '<span class="z-dts">' + "".join(f'<i style="background:{WUBRG[c]}"></i>' for c in ident) + "</span>"


SEARCH = '<circle cx="9" cy="9" r="5.5"/><path d="m13.2 13.2 3.6 3.6"/>'

# ---------------------------------------------------------------- fixtures
SET = dict(code="FDC", name="Foundations Commander", date="Nov 13, 2026", until="in 15 days", promised=5)
LISTS = [  # name, commander, image, identity, owned, of
    ("Calling All Angels", "Giada, Font of Hope", "giada.jpg", "W", 20, 68),
    ("Keen Engineering", "Sai, Master Thopterist", "sai.jpg", "U", 31, 66),
    ("Reign of Dragons", "Lathliss, Dragon Queen", "lathliss.jpg", "R", 21, 68),
]
REVEALED = [("Ghalta, Primal Hunger", "ghalta.jpg", "G")]
RELEASED = [("Wretched Ranks", "Ghoulcaller Gisa", "gisa.jpg", "B", 18, 67), ("Tramplesaurus Rex", "Ghalta, Primal Hunger", "ghalta.jpg", "G", 21, 68)]
YEAR = [("Lorehold Spirit", "quintorius.jpg", "WR", 30, 83, "SOC · Apr 2026"), ("Prismari Artistry", "rootha.jpg", "UR", 85, 85, "SOC · Apr 2026"),
        ("Quandrix Unlimited", "zimone.jpg", "GU", 26, 87, "SOC · Apr 2026"), ("Silverquill Influence", "killian.jpg", "WB", 24, 84, "SOC · Apr 2026"),
        ("Witherbloom Pestilence", "dina.jpg", "BG", 31, 84, "SOC · Apr 2026"), ("Turtle Power!", "heroes.jpg", "WUBRG", 22, 88, "TMC · Mar 2026")]


# ---------------------------------------------------------------- the list page
def list_head(desk=False, n=412):
    sub = (f"{n} decklists, 2011 to 2026 · the count is the cards you own, basic lands not counted" if desk
           else f"{n} decklists · 2011 to 2026 · basic lands not counted")
    return f'<div class="z-phd"><span class="z-bk">‹ Decks</span><h1>Commander precons</h1><p class="z-sbl">{sub}</p></div>'


def toolbar(desk=False, view="tiles"):
    vt = f'<span class="z-vtg"><span{" class=\"on\"" if view == "rows" else ""}>≣</span><span{" class=\"on\"" if view == "tiles" else ""}>▦</span></span>'
    pips = '<span class="z-pipsr">' + "".join(f'<i><b style="background:{WUBRG[c]}"></b></i>' for c in "WUBRG") + "</span>"
    srch = f'<span class="z-srch">{ico(SEARCH, 16, 1.6)}Search by name, commander or set</span>'
    if desk:
        return (f'<div class="z-tbar"><div class="z-r1">{srch}{pips}<span class="z-srt">Sort · newest</span>{vt}</div>'
                '<p class="z-rsl">412 decklists · newest first</p></div>')
    return (f'<div class="z-tbar"><div class="z-r1">{srch}{vt}</div><div class="z-r1">{pips}<span class="z-srt" style="margin-left:auto">Sort · newest</span></div>'
            '<p class="z-rsl">412 decklists · newest first</p></div>')


def early_tile(l, chg=True):
    name, cmd, im, ident, own, of = l
    return (f'<div class="z-tile{" chg" if chg else ""}"><div class="z-art"><img src="{img(im)}" alt=""></div><div class="z-cap">'
            f'<span class="z-mt">you own <b>{own} of {of}</b></span><span class="z-nm">{name}</span>'
            f'<span class="z-sb2">{dots(ident)}<span class="z-etag">early list</span></span></div></div>')


def precon_tile(name, im, ident, own, of, meta, new=False):
    return (f'<div class="z-tile"><div class="z-art"><img src="{img(im)}" alt=""></div><div class="z-cap">'
            f'<span class="z-mt">{"<em>new · </em>" if new else ""}you own <b>{own} of {of}</b></span><span class="z-nm">{name}</span>'
            f'<span class="z-sb2">{dots(ident)}<span>{meta}</span></span></div></div>')


def revealed_tile(name, im, ident):
    return (f'<div class="z-tile z-rv"><div class="z-art"><img src="{img(im)}" alt=""></div><div class="z-cap">'
            f'<span class="z-sb2" style="gap:6px">{dots(ident)}</span><span class="z-nm">{name}</span></div></div>')


def plate(text, chg=True):
    return f'<div style="display:flex;align-items:flex-start"><span class="z-nplate{" chg" if chg else ""}">{text}</span></div>'


def set_block(desk=False, out=None, lists=LISTS, revealed=REVEALED, more=1, new=True, released=False):
    o = len(lists)
    n = SET["promised"]
    count = f"<b>{o} of {n} lists so far</b>" if o < n else f"<b>all {n} lists</b>"
    when = (f"out {SET['date']} · release lists not in yet" if released else f"{SET['date']} · {SET['until']}")
    if desk:
        ml = f'<span class="z-ml">{SET["code"]} · {when} · {count}</span>'
    else:
        ml = (f'<span class="z-ml">{when[0].upper() + when[1:]}</span><span class="z-ml">{SET["code"]} · {count}</span>')
    tiles = "".join(early_tile(l) for l in lists) + "".join(revealed_tile(*r) for r in revealed)
    pl = plate(f"{more} more list to come" if more == 1 else f"{more} more lists to come") if more else ""
    tag = '<span class="z-ntag2">new</span>' if new else ""
    return (f'<div class="z-sblk"><div style="display:flex;flex-direction:column;gap:3px"><div class="z-sh2"><h3>{SET["name"]}</h3>{tag}</div>{ml}</div>'
            f'<div class="z-tgrid">{tiles}{pl}</div></div>')


def announced(desk=False, inner=None, n_sets=1, new=True):
    tag = '<span class="z-ntag2">new</span>' if new else ""
    return (f'<div class="z-pgrp" style="padding-bottom:6px"><h2 class="z-ghd">Announced<span>{n_sets} set</span>{tag}<span class="z-chev">⌃</span></h2>'
            f'{inner if inner is not None else set_block(desk)}</div>')


def year(desk=False, rows=YEAR, label="2026", n=34, extra=""):
    tiles = extra + "".join(precon_tile(name, im, ident, own, of, meta) for name, im, ident, own, of, meta in rows)
    return f'<div class="z-pgrp"><h2 class="z-ghd">{label}<span>{n} decklists</span></h2><div class="z-tgrid">{tiles}</div></div>'


def list_page(desk=False, ann=None, yr=None, band=False):
    b = ('<div style="padding:12px 16px 0"><div class="z-ecb"><p>Every count reads 0 until your collection is in.</p><span>Upload your collection</span></div></div>' if band else "")
    return (f'<div class="z-plp" style="position:relative">{list_head(desk)}{toolbar(desk)}{b}{ann if ann is not None else announced(desk)}'
            f'{yr if yr is not None else year(desk)}<div style="height:24px"></div></div>')


# rows view
def rows_view_set(desk=False):
    lists = "".join(f'<div class="z-prow chg"><img src="{img(im)}" alt=""><span class="z-tx"><span class="z-nm">{name}</span>'
                    f'<span class="z-m2">{dots(ident)}<span class="z-etag">early list</span>you own <b>{own} of {of}</b></span></span></div>'
                    for name, cmd, im, ident, own, of in LISTS)
    rv = (f'<div class="z-prow" style="border-style:dashed;background:transparent"><img src="{img("ghalta.jpg")}" alt=""><span class="z-tx"><span class="z-nm">Ghalta, Primal Hunger</span>'
          f'<span class="z-m2">{dots("G")}revealed · list to come</span></span></div>')
    more = '<p class="z-rsl chg" style="padding:4px 2px">1 more list to come</p>'
    return (f'<div class="z-arow"><div class="z-hd"><span class="z-pl"></span><span class="z-tx"><span class="z-t1"><span class="z-n">{SET["name"]}<span class="z-ntag2">new</span></span>'
            f'<small>in 15 days ⌃</small></span><span class="z-t2">3 of 5 lists so far · Ghalta and 3 more</span>'
            f'<span class="z-t3">{dots("WURG")}{SET["code"]} · {SET["date"]}</span></span></div><div class="z-reg">{lists}{rv}{more}</div></div>')


# ---------------------------------------------------------------- the early list page
CARDS = {  # group: [(name, owned, cost, qty)]
    "Creatures": [("Angel of Vitality", True, "2W", 1), ("Bishop of Wings", False, "WW", 1), ("Lyra Dawnbringer", False, "3WW", 1),
                  ("Resplendent Angel", True, "1WW", 1), ("Righteous Valkyrie", False, "2W", 1), ("Youthful Valkyrie", True, "1W", 1)],
    "Instants": [("Path to Exile", True, "W", 1), ("Swords to Plowshares", True, "W", 1)],
    "Artifacts": [("Arcane Signet", True, "2", 1), ("Sol Ring", True, "1", 1)],
}
UNMATCHED = ["Seraph of the Dawnfire", "Choir of the First Light"]


def cost(c):
    out = []
    for ch in c:
        if ch.isdigit():
            out.append(f'<i style="background:#C9C1B0">{ch}</i>')
        else:
            out.append(f'<i style="background:{WUBRG[ch]}"></i>')
    return '<span class="z-cst">' + "".join(out) + "</span>"


def rr(name, owned, c, q=1, sn=None):
    qq = f'<span class="z-q">×{q}</span>' if q > 1 else ""
    s = f'<span class="z-sn">{sn}</span>' if sn else ""
    return f'<div class="z-rr"><span class="z-ow{"" if owned else " no"}"></span><span class="z-nm">{name}</span>{qq}{cost(c)}{s}</div>'


def groups(released=False, unmatched=True, n_show=None):
    sn = (lambda i: f"FDC {i + 12}") if released else (lambda i: None)
    out = [f'<div class="z-dgp"><h4>Commander<em>you own it</em></h4>{rr("Giada, Font of Hope", True, "1W", 1, sn(0))}</div>']
    for g, rows in CARDS.items():
        o = sum(1 for r in rows if r[1])
        out.append(f'<div class="z-dgp"><h4>{g}<em>you own {o} of {len(rows)}</em></h4>'
                   + "".join(rr(n, ow, c, q, sn(i + 1)) for i, (n, ow, c, q) in enumerate(rows)) + "</div>")
    if unmatched and not released:
        out.append('<div class="z-dgp chg"><h4>Not in our catalog yet<em>2 cards</em></h4>'
                   '<p class="z-gn">Named in Wizards’ post, not yet a card we can match. They fill in when the card reaches the catalog.</p>'
                   + "".join(f'<div class="z-rr z-um"><span class="z-nm">{n}</span></div>' for n in UNMATCHED) + "</div>")
    return "".join(out)


def early_band(desk=False, released=False, chg=True):
    if released:
        t = ("<b>Out Nov 13. This is still Wizards’ early list:</b> the release list isn’t in yet. "
             "You can start a deck from this precon once it is.")
    else:
        t = ("<b>Early list, from Wizards’ post on Oct 29.</b> The release list replaces it when it arrives; "
             "then you can start a deck from this precon.")
    return f'<div class="z-eband{" chg" if chg else ""}"><p>{t}</p><span class="z-lk">Read the post ↗</span></div>'


def own_band(owned=20, of=68, unmatched=True, zero=False):
    if zero:
        owned = 0
    pct = round(owned / of * 100)
    um = ('<p class="z-l2">2 cards in this precon aren’t in our catalog yet, so 66 are listed.</p>' if unmatched else "")
    return (f'<div class="z-own"><p>You own <b>{owned} of {of}</b> of its cards</p><div class="z-br"><i style="width:{pct}%"></i></div>{um}</div>')


def early_page(desk=False, released=False, unmatched=True, band=False):
    eye = ('<span class="z-ey">Early decklist · view-only<span class="z-etag" style="text-transform:none">early list</span></span>')
    head = (f'<div class="z-phd"><span class="z-bk">‹ Commander precons</span><div class="z-tp"><span class="z-th"><img src="{img("giada.jpg")}" alt=""></span>'
            f'<div class="z-tx">{eye}<h1>Calling All Angels</h1><span class="z-cm">Giada, Font of Hope</span>'
            f'<span class="z-mt">{dots("W")}W · FDC · Foundations Commander · Nov 13, 2026</span></div></div>'
            + early_band(desk, released)
            + ('<div class="z-ecb"><p>Every count reads 0 until your collection is in.</p><span>Upload your collection</span></div>' if band else "")
            + own_band(unmatched=unmatched, zero=band)
            + f'<div class="z-ln"><span>{"By type, A–Z within each group · press a card for its details, hover for its art" if desk else "By type · press a card for its details"}</span>'
              '<span class="z-vt"><span class="on">List</span><span>Cards</span></span></div></div>')
    return f'<div class="z-pp">{head}<div class="z-lst">{groups(False, unmatched)}</div></div>'


OV = ("<b>Giada, Font of Hope</b> leads a white Angel deck that grows each new Angel as it lands. It plays a steady stream of fliers, "
      "protects them with cheap removal, and wins in the air.")


def release_page(desk=False):
    st = '<span class="z-lkd">Link a deck</span><span class="z-st">Start with this precon</span>' if desk else ""
    head = (f'<div class="z-phd"><span class="z-bk">‹ Commander precons</span><div class="z-tp"><span class="z-th"><img src="{img("giada.jpg")}" alt=""></span>'
            f'<div class="z-tx"><span class="z-ey">Precon decklist · read-only</span><h1>Calling All Angels</h1><span class="z-cm">Giada, Font of Hope</span>'
            f'<span class="z-mt">{dots("W")}W · FDC · Foundations Commander · Nov 13, 2026</span></div>{st}</div>'
            + own_band(20, 68, unmatched=False)
            + f'<section class="z-pov"><div class="z-lh"><span class="z-lbl">Overview</span><small>written for this precon’s list</small></div><p class="z-ovp">{OV}</p><span class="z-lk">View full overview →</span></section>'
            + f'<div class="z-ln"><span>{"By type, A–Z within each group · press a card for its details, hover for its art · each row shows the precon’s printing" if desk else "By type · press a card for its details"}</span>'
              '<span class="z-vt"><span class="on">List</span><span>Cards</span></span></div></div>')
    return f'<div class="z-pp">{head}<div class="z-lst">{groups(True, False)}</div></div>'


DOCK = ('<div class="z-dock"><small>Calling All Angels · 68 cards · you own 20 of 68</small>'
        '<div class="z-row2"><span class="z-l">Link a deck</span><span class="z-s">Start with this precon</span></div></div>')


def skeleton(desk=False):
    rows = "".join('<span class="z-skr"></span>' for _ in range(7))
    return ('<div class="z-pp"><div class="z-phd"><span class="z-bk">‹ Commander precons</span><div class="z-tp"><span class="z-th" style="background:var(--elevated);box-shadow:none"></span>'
            '<div class="z-tx" style="gap:8px"><span class="z-sk" style="width:120px;height:10px"></span><span class="z-sk" style="width:60%;height:20px"></span>'
            '<span class="z-sk" style="width:40%;height:12px"></span></div></div><span class="z-sk" style="height:58px;border-radius:10px"></span>'
            '<span class="z-sk" style="height:52px;border-radius:10px"></span></div>'
            f'<div class="z-lst"><span class="z-sk" style="width:90px;height:14px"></span>{rows}</div></div>')
