# Deck details refresh (Hugh 2026-11-26), from the audit doc FBvcSC119ac2v6jKcyoxr7.
# Writes project/*.dc.html boards for the Design canvas. Kit = the Games tabs handoff's gen_games.py (tokens, CSS, band,
# SectionPanel box, board writer), first 506 lines, exec'd as is. Drawn from the shipped parts: consider-panel.tsx,
# suggestion-tile.tsx, tuning-hub.tsx, mana-balance-view.tsx, mana-sections.tsx, tuning-history.tsx, strategy-block.tsx,
# role-counter-strip.tsx, strip-rationale.tsx, decklist-group-header.tsx, analysis-panel.tsx, version-history.tsx,
# home-section-head.tsx. Fixture: Ashen Banner Parade (Ashling, the Limitless, 5-color), Hugh's About captures.
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
ns = {'__name__': 'kit'}
_argv = sys.argv; sys.argv = ['kit', OUT]
src = open(os.path.join(HERE, 'kit_games.py')).read()
src = src[:src.index('# A\nboard(')] if '# A\nboard(' in src else src
exec(src, ns)
sys.argv = _argv
for k in ['CSS', 'FONTS', 'board', 'band', 'chev', 'caret', 'check', 'srch', 'xic', 'labelled', 'pair']:
    globals()[k] = ns[k]

CSS_DD = '''
.D{grid-template-columns:62px minmax(0,1fr)}
.dtabs span.on i{color:var(--accent)}
.band .end{margin-left:auto;display:flex;align-items:center;gap:14px;font:500 11.5px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.band .end a{color:var(--accent);text-decoration:none}
.band .cv{color:var(--fg-muted);display:inline-flex;transform:rotate(90deg)}
.band.fold .cv{transform:none}
.band.fold{border-bottom:0}
.band .clause{font:500 11.5px "IBM Plex Mono",monospace;color:var(--fg-faint);margin-left:4px}
.hh .cv2{color:var(--fg-muted);display:inline-flex}
.inbox{padding:14px 16px 16px}
.foot{display:flex;align-items:center;gap:12px;min-height:44px;padding:0 16px;border-top:1px solid var(--border);background:var(--surface-rail);font-size:12.5px;color:var(--fg-body)}
.foot a{margin-left:auto;color:var(--accent);text-decoration:none;font-weight:500;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.foot a.l{margin-left:0}
.keyrow{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;padding:11px 16px;border-top:1px solid var(--border);font:500 10.5px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.keyrow span{display:inline-flex;align-items:center;gap:6px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--success);flex:none;display:inline-block}
.dot.buy{background:transparent;border:1.5px dashed var(--fg-faint)}
/* hub tab row */
.hubtabs{display:flex;align-items:flex-end;gap:22px;border-bottom:1px solid var(--border)}
.hubtabs span{display:inline-flex;align-items:center;gap:7px;padding:4px 0 10px;font-size:13px;font-weight:500;color:var(--fg-muted);border-bottom:2px solid transparent;margin-bottom:-1px}
.hubtabs span.on{color:var(--fg);font-weight:600;border-color:var(--accent)}
.hubtabs .tb{margin-left:auto;display:flex;gap:12px;align-items:center;padding-bottom:8px}
.sel{display:inline-flex;align-items:center;gap:8px;min-height:34px;padding:0 12px;border-radius:8px;border:1px solid var(--border-strong);background:var(--elevated);font-size:12.5px;font-weight:500}
.phback{display:flex;align-items:center;justify-content:space-between;min-height:44px}
.phback b{font-size:13px;font-weight:500;color:var(--fg-muted)}
.phback span{font:500 10px "IBM Plex Mono",monospace;color:var(--fg-faint)}
/* suggestion tile */
.tiles{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px;padding:14px 16px 16px}
.P .tiles{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:12px}
.st{display:flex;flex-direction:column;gap:8px;border:1px solid var(--border);border-radius:10px;background:var(--surface);padding:9px 9px 10px}
.st img{display:block;width:100%;aspect-ratio:63/88;border-radius:7px;object-fit:cover}
.st .nm{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden}
.st .nm b{overflow:hidden;text-overflow:ellipsis;font-weight:600}
.st .why{font:500 9.5px "IBM Plex Mono",monospace;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st .add{margin-top:auto;height:32px;border-radius:8px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:500}
.P .st .add{height:44px;font-size:14px}
.st .add.buy{border-style:solid;color:var(--fg-body)}
/* tool title */
.tt{display:flex;flex-direction:column;gap:6px}
.tt h2{font-family:"Cinzel",serif;font-weight:600;font-size:19px}
.tt p{font-size:13px;color:var(--fg-body);line-height:1.55;max-width:760px}
.tt .sub{font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.P .tt h2{font-size:17px}
/* mana table */
.mt{display:grid;grid-template-columns:150px 120px 170px minmax(0,1fr);gap:0 14px;padding:0 16px}
.mt>div{padding:11px 0;border-top:1px solid var(--border);font-size:13px;display:flex;align-items:center;gap:8px}
.mt>div.h{border-top:0;font:500 9.5px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-locked);padding:10px 0 8px}
.mt .m{font:500 12px "IBM Plex Mono",monospace;color:var(--fg-body)}
.pipc{width:16px;height:16px;border-radius:50%;flex:none;display:inline-flex;align-items:center;justify-content:center;font:700 9px "IBM Plex Mono",monospace;color:#14110E}
.ok{color:var(--success)}.short{color:var(--warning)}
.prow{display:grid;grid-template-columns:110px minmax(0,1fr) 190px;gap:14px;align-items:center;padding:10px 16px;border-top:1px solid var(--border);font-size:13px}
.prow .c{font:500 12px "IBM Plex Mono",monospace;color:var(--fg-body)}
.prow .x{color:var(--fg-muted);font-size:12.5px}
.P .prow{grid-template-columns:70px minmax(0,1fr);row-gap:4px}
.P .prow .n3{grid-column:2}
/* tuning tiles */
.tgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.P .tgrid{grid-template-columns:1fr;gap:8px}
.ttile{display:flex;flex-direction:column;gap:8px;border:1px solid var(--border);border-radius:12px;background:var(--surface);padding:16px 18px;min-height:132px}
.ttile .h{display:flex;align-items:center;gap:10px;font-size:15.5px;font-weight:600}
.ttile .h .chev{margin-left:auto}
.ttile p{font-size:13px;color:var(--fg-body);line-height:1.5}
.ttile .pill2{align-self:flex-start;margin-top:auto;font:500 11px "IBM Plex Mono",monospace;color:var(--fg-muted);border:1px solid var(--border-strong);border-radius:999px;padding:3px 10px}
.ttile.dash{border-style:dashed;border-color:var(--border-dashed);background:transparent}
.ttile.dash .h,.ttile.dash p{color:var(--fg-locked)}
/* strategy */
.strat{display:grid;grid-template-columns:300px minmax(0,1fr);gap:36px;align-items:center;padding:20px 24px 18px}
.P .strat{grid-template-columns:1fr;gap:16px;padding:16px 14px}
.legend{display:flex;flex-direction:column}
.lg{display:grid;grid-template-columns:22px minmax(0,1fr) auto 26px;gap:12px;align-items:center;min-height:50px;border-top:1px solid var(--border);font-size:14px}
.lg:first-child{border-top:0}
.lg .n{font:500 12px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.lg .n i{font-style:normal;color:var(--accent)}
.radio{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--border-strong)}
.radio.on{border-color:var(--accent);box-shadow:inset 0 0 0 4px var(--bg),inset 0 0 0 10px var(--accent)}
.lg.on{color:var(--fg)}
/* history */
.hrow{display:grid;grid-template-columns:24px 150px minmax(0,1fr) auto auto 70px;gap:14px;align-items:center;min-height:52px;padding:0 16px;border-top:1px solid var(--border);font-size:13px}
.hrow:first-child{border-top:0}
.hrow .tn{font-weight:600}
.hrow .sm{color:var(--fg-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hrow .d{font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint);text-align:right}
.tag{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:999px;border:1px solid var(--border-strong);font:500 9.5px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-muted);white-space:nowrap}
.tag.ok{border-color:color-mix(in srgb,var(--success) 50%,transparent);color:var(--success)}
.tag.sh{border-color:color-mix(in srgb,var(--warning) 50%,transparent);color:var(--warning)}
.tag.cr{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 45%,transparent)}
.P .hrow{grid-template-columns:22px minmax(0,1fr) auto;grid-template-rows:auto auto;row-gap:4px;padding:10px 14px;min-height:64px}
.P .hrow .sm{grid-column:2/4;grid-row:2;font-size:12.5px}
.P .hrow .tg1,.P .hrow .tg2{display:none}
/* mix */
.mix{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;padding:14px 16px 16px}
.cell{border:1px solid var(--border);border-radius:10px;background:var(--surface);padding:14px 16px;display:flex;flex-direction:column;gap:9px}
.cell .l{font:500 10px "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.cell .v{font:500 19px "IBM Plex Mono",monospace;color:var(--success)}.cell .v span{font-size:13px;color:var(--fg-faint)}
.cell .bar{height:5px;border-radius:3px;background:var(--success)}
.cell .f{display:flex;justify-content:space-between;font:500 10.5px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.cell .f a{color:var(--accent)}
.P .mix{grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;padding:10px}
.P .cell{padding:9px 4px;align-items:center;gap:5px}
.P .cell .l{font-size:8.5px;letter-spacing:.08em}.P .cell .v{font-size:15px}.P .cell .bar{display:none}
.P .cell .f{flex-direction:column;align-items:center;gap:4px;font-size:9.5px}
.why2{display:flex;flex-direction:column;gap:10px;padding:14px 16px 16px;border-top:1px solid var(--border);background:var(--surface-sunken)}
.why2 p{font-size:12.5px;line-height:1.55;color:var(--fg-body)}.why2 b{color:var(--fg)}
/* decklist */
.dtool{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dhead{display:flex;align-items:center;gap:9px;padding:18px 0 10px}
.drows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px}
.P .drows{grid-template-columns:1fr;gap:6px}
.dr{display:flex;align-items:center;gap:12px;min-height:46px;padding:0 14px;border-radius:9px;background:var(--surface-inset);font-size:14px}
.dr .mc{margin-left:auto;display:flex;gap:3px;align-items:center}
.mcd{width:15px;height:15px;border-radius:50%;background:#C6533F}
.mcd.g{background:#8b857a;color:#14110E;font:700 9px "IBM Plex Mono",monospace;display:inline-flex;align-items:center;justify-content:center}
.dr .xx{color:var(--fg-locked);margin-left:12px}
.mk{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;font:600 11px "IBM Plex Mono",monospace}
.mk.buy{background:color-mix(in srgb,var(--warning) 22%,transparent);color:var(--warning)}
.mk.prx{border:1px dashed var(--fg-faint);color:var(--fg-body)}
/* shopping */
.shop{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;border-bottom:1px solid var(--border)}
.shop>div{padding:14px 16px;border-left:1px solid var(--border);display:flex;flex-direction:column;gap:5px}
.shop>div:first-child{border-left:0}
.shop .l{font:500 10px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.shop .v{font-size:17px;font-weight:600}
.shop .s{font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.P .shop{grid-template-columns:1fr 1fr}.P .shop>div:nth-child(3){grid-column:1/3;border-left:0;border-top:1px solid var(--border)}
.thr{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--fg-body)}
.thr u{text-decoration:underline dotted;color:var(--fg);font-weight:600}
.pricebuy{display:inline-flex;align-items:center;gap:10px;height:26px;padding:0 9px;border-radius:6px;border:1px solid color-mix(in srgb,var(--warning) 60%,transparent);font:500 11px "IBM Plex Mono",monospace;color:var(--warning)}
.ibtn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:30px;border-radius:7px;border:1px solid var(--border-strong);color:var(--fg-body)}
/* analysis */
.ov{display:flex;flex-direction:column;gap:12px;padding:16px}
.ov p{font-size:14px;color:var(--fg-body);line-height:1.6}
.brk{display:flex;flex-direction:column;gap:8px;padding:14px 16px 16px}
.bk{display:grid;grid-template-columns:44px 210px minmax(0,1fr);gap:14px;align-items:center;min-height:64px;padding:0 16px;border:1px solid var(--border);border-radius:10px;background:var(--surface)}
.bk.on{border-color:#c9a64a;background:color-mix(in srgb,#c9a64a 8%,var(--surface))}
.bk .t b{font-size:15px;font-weight:600;display:block}.bk .r b{font-weight:600;color:var(--fg)}.bk small{font:500 9.5px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.bk .r{font-size:13.5px;color:var(--fg-body)}
.dia2{width:30px;height:30px;transform:rotate(45deg);border:1.5px solid #c9a64a;display:flex;align-items:center;justify-content:center}
.dia2 span{transform:rotate(-45deg);font:600 12px "IBM Plex Mono",monospace;color:#c9a64a}
.verd{border:1px solid var(--border);border-radius:14px;background:var(--surface-inset);padding:22px 24px;display:flex;flex-direction:column;gap:12px}
.verd h3{font-family:"Cinzel",serif;font-size:24px;font-weight:700;color:#d9b45a}
.wt{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;padding:14px 16px 16px}
.wc{border:1px solid var(--border);border-radius:10px;background:var(--surface);padding:14px 16px;display:flex;flex-direction:column;gap:6px;min-height:128px}
.wc .n{font:500 20px "IBM Plex Mono",monospace}.wc b{font-size:14px;font-weight:600}.wc span{font-size:12px;color:var(--fg-body)}
.wc a{font:500 10.5px "IBM Plex Mono",monospace;color:var(--accent);margin-top:auto}
.wc.z .n,.wc.z b{color:var(--fg-locked)}.wc.z span{color:var(--fg-locked)}
.hp{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:14px 16px 16px}
.hc{border:1px solid var(--border);border-radius:10px;background:var(--surface);padding:14px 16px;display:flex;flex-direction:column;gap:8px}
.hc b{font-size:14px}.hc .g{font-family:"Cinzel",serif;font-weight:700;font-variant:small-caps;font-size:21px}
.segs{display:flex;gap:4px}.segs i{flex:1;height:5px;border-radius:3px;background:var(--border-strong)}.segs i.on{background:#6d8fb5}
.hc span{font-size:12px;color:var(--fg-body)}.hc a{font:500 10.5px "IBM Plex Mono",monospace;color:var(--accent)}
.P .wt,.P .hp{grid-template-columns:1fr 1fr;gap:8px;padding:12px}
.P .bk{grid-template-columns:36px minmax(0,1fr);row-gap:2px;padding:10px 12px}.P .bk .r{grid-column:1/3;font-size:12.5px}
/* versions */
.vr{display:grid;grid-template-columns:56px minmax(0,1fr) auto auto 20px;gap:14px;align-items:center;min-height:68px;padding:0 16px;border-top:1px solid var(--border)}
.vr:first-child{border-top:0}
.vr .vn{font:500 15px "IBM Plex Mono",monospace;color:var(--accent)}
.vr b{font-size:15px;font-weight:500;display:block}.vr small{font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint)}
.vr .dl{font:500 12px "IBM Plex Mono",monospace;color:var(--fg-muted)}
.vr .dl i{font-style:normal;color:var(--success)}.vr .dl u{text-decoration:none;color:var(--danger)}
.cur{font:500 10px "IBM Plex Mono",monospace;letter-spacing:.12em;color:var(--accent);border:1px solid color-mix(in srgb,var(--accent) 55%,transparent);border-radius:4px;padding:3px 7px}
.P .vr{grid-template-columns:38px minmax(0,1fr) auto;padding:10px 14px}.P .vr .dl{grid-column:2;grid-row:2}.P .vr .chev{display:none}
/* main board notes */
.mnote{font-size:15px;line-height:1.6;color:var(--fg-body);max-width:1100px}
.mnote b{color:var(--fg)}
.cmp{display:grid;grid-template-columns:1fr 1fr;gap:32px}
.was{font:500 10.5px "IBM Plex Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.lbl{font:500 11px "IBM Plex Mono",monospace;color:var(--fg-faint);letter-spacing:.06em;text-transform:uppercase;padding-bottom:10px}
'''
ns['CSS'] = ns['CSS'] + CSS_DD

def dia(): return '<span class="dia"></span>'
def hh(t, ct=''): return f'<span class="hh">{dia()}<span>{t}</span>{f"<span class=ct>{ct}</span>" if ct else ""}</span>'
def bnd(t, ct='', end='', fold=None, clause=''):
    cv = f'<span class="cv">{chev(14)}</span>' if fold is not None else ''
    cl = f'<span class="clause">{clause}</span>' if clause else ''
    return f'<div class="band{" fold" if fold else ""}">{hh(t, ct)}{cl}<span class="end">{end}{cv}</span></div>'
def box(inner, extra=''): return f'<section class="box" style="{extra}">{inner}</section>'
def dtabs(on, counts=None):
    c = counts or {'Your deck': 99, 'Games': 5, 'Versions': 3}
    return '<div class="dtabs">' + ''.join(f'<span class="{"on" if t==on else ""}">{t}{f"<i>{c[t]}</i>" if t in c else ""}</span>' for t in ['Your deck', 'Analysis', 'Tuning', 'Games', 'Versions']) + '</div>'
ADDBAR_P = f'<div class="addbar"><span class="f">{srch()} Add a card by name</span><span class="tog"></span><span style="font-size:12.5px;color:var(--fg-body)">Owned only</span></div>'
def desk(inner, head=False):
    top = '<img src="art/d-head.png" alt="" style="display:block;width:1300px;height:290px;grid-column:1/3">' if head else ''
    return f'<div class="D">{top}<div class="rail"><img src="art/rail-decks.png" alt=""></div><div class="main" style="padding-top:0">{inner}</div></div>'
def phone(inner, top='art/p-top.png'):
    return (f'<div class="P"><img class="ptop" src="{top}" alt=""><div class="pm" style="padding-top:0">{inner}</div>'
            f'{ADDBAR_P}<img class="ptab" src="art/p-tabbar-decks.png" alt="" style="margin-top:0"></div>')
def W(name, title, body, w): board(name, title, body, w)

TOOLS = ['Consider', 'Suggested changes', 'Mana Balance', 'Proposed cuts', 'History']
def hubtabs(on, tb=''):
    return '<div class="hubtabs"><span>All tools</span>' + ''.join(f'<span class="{"on" if t==on else ""}">{t}</span>' for t in TOOLS) + (f'<span class="tb">{tb}</span>' if tb else '') + '</div>'
def phback(name, i): return f'<div class="phback"><b>‹ Tuning</b><span>{name} · {i} of 5 tools</span></div>'

# ======================= R1: Consider =======================
TILE = {
 'synergy': [('brudiclad', 'Brudiclad, Telchor Engineer', 'makes tokens · copies them', True), ('cayth', 'Cayth, Famed Mechanist', 'token maker · populate', True),
             ('alibou', 'Alibou, Ancient Witness', 'artifact payoff', False), ('avenger-of-zendikar', 'Avenger of Zendikar', 'token burst · 7 mana', True),
             ('bloodline-keeper', 'Bloodline Keeper', 'token engine', True), ('beorn', 'Beorn, the Fierce', 'top pick for Ashling', False)],
 'removal': [('heartless-act', 'Heartless Act', 'instant · 2 mana', True), ('firebending-lesson', 'Firebending Lesson', 'instant · 1 mana', True),
             ('assimilation-aegis', 'Assimilation Aegis', 'exiles · reusable', False), ('fire-lord-zuko', 'Fire Lord Zuko', 'removal on a body', True),
             ('arlinn', 'Arlinn, the Pack’s Hope', 'flexible threat', False), ('ajani-unrelenting', 'Ajani Unrelenting', 'answers a creature', False)],
}
def stile(c, phone=False):
    art, name, why, owned = c
    add = 'Add' if owned else 'Add · to buy'
    return (f'<div class="st"><img src="art/c-{art}.jpg" alt=""><div style="display:flex;flex-direction:column;gap:3px;min-width:0"><span class="nm"><span class="dot{"" if owned else " buy"}"></span><b>{name}</b></span>'
            f'<span class="why">{why}</span></div><span class="add{"" if owned else " buy"}">{add}</span></div>')
def shelf(t, clause, ct, cards, phone=False, fold=False, yours=''):
    end = (yours + (f'<a>Show all {ct.split()[0]} ›</a>' if not fold else ''))
    if phone and not fold: end = yours
    body = '' if fold else f'<div class="tiles">{"".join(stile(c, phone) for c in (cards[:4] if phone else cards))}</div>'
    pfoot = (f'<div class="foot"><a class="l">Show all {ct.split()[0]} ›</a></div>' if (phone and not fold) else '')
    return box(bnd(t, ct, end, fold=fold, clause=('' if phone else clause)) + (f'<div style="padding:8px 14px 0;font:500 11px IBM Plex Mono,monospace;color:var(--fg-faint)">{clause}</div>' if phone and not fold else '') + body + pfoot)
KEY_C = ('<div class="keyrow box" style="border-top:1px solid var(--border)"><span><span class="dot"></span>you own it</span><span><span class="dot buy"></span>to buy</span>'
         '<span>Add puts the card in the deck · Add · to buy also puts it on Shopping</span><span>folded shelves stay folded on this deck</span></div>')
def consider(phone=False):
    sh = [shelf('Threats & synergy', 'no target · this is the deck’s plan', '18 to consider', TILE['synergy'], phone),
          shelf('Removal', 'you have 9 · 2 over', '14 to consider', TILE['removal'], phone, yours='<a>your 9 →</a>' if not phone else '<a>your 9 →</a>'),
          shelf('Wipes', 'you have 3 · 2 over', '6 to consider', [], phone, fold=True),
          shelf('Draw', 'you have 10 · 4 over', '12 to consider', [], phone, fold=True),
          shelf('Ramp', 'you have 28 · 18 over', '9 to consider', [], phone, fold=True),
          shelf('Cards you don’t own', '', '22 to consider', [], phone, fold=True)]
    tb = '<span class="mono faint" style="font-size:11px">47 you own · 22 to buy</span><span class="sel">Sort · Best fit ' + caret() + '</span>'
    if phone:
        return (dtabs('Tuning') + phback('Consider', 1) + f'<div style="display:flex;justify-content:space-between;align-items:center"><span class="mono faint" style="font-size:11px">47 own · 22 to buy</span><span class="sel" style="min-height:44px">Sort · Best fit {caret()}</span></div>'
                + ''.join(sh) + KEY_C)
    return dtabs('Tuning') + '<div style="height:4px"></div>' + hubtabs('Consider', tb) + ''.join(sh) + KEY_C

# ======================= R1: Mana Balance =======================
COL = [('White', '#E8DFC4', 'W'), ('Blue', '#6d93c7', 'U'), ('Black', '#9a8f9e', 'B'), ('Red', '#C6533F', 'R'), ('Green', '#6FA368', 'G')]
def mana_table(phone=False):
    rows = [('White', 11, 18, 21, 'short', 'for Wedding Ring (WW)'), ('Blue', 9, 17, 19, 'short', 'for Big Score (UU)'), ('Black', 6, 16, 15, 'ok', 'for Bitter Triumph (B)'),
            ('Red', 41, 24, 23, 'ok', 'for Fury (RR) and 3 more'), ('Green', 8, 17, 15, 'ok', 'for Beast Within (G)')]
    if phone:
        out = ''
        for n, p, s, nd, st, f in rows:
            c = dict((a, b) for a, b, _ in COL)[n]
            out += (f'<div class="prow"><span style="display:flex;align-items:center;gap:8px"><span class="pipc" style="background:{c}"></span>{n}</span>'
                    f'<span class="c">{p} pips · {s} sources</span><span class="n3 x">Needs {nd} <span class="{st}">{"✓" if st=="ok" else "· 3 short" if n=="White" else "· 2 short"}</span> {f}</span></div>')
        return out
    out = '<div class="mt"><div class="h">Color</div><div class="h">Pips</div><div class="h">Sources</div><div class="h">Needed</div>'
    for n, p, s, nd, st, f in rows:
        c = dict((a, b) for a, b, _ in COL)[n]
        out += (f'<div><span class="pipc" style="background:{c}"></span>{n}</div><div class="m">{p} · {round(p*100/75)}%</div><div class="m">{s} <span class="faint">· {s-6} lands</span></div>'
                f'<div><span class="m {st}">{nd}{" ✓" if st=="ok" else ""}</span><span class="muted" style="font-size:12.5px">{f}</span></div>')
    return out + '</div>'
HARD = [('{W}{W}', 'Wedding Ring', 'You have 18 · Needs 21'), ('{W}', 'Swords to Plowshares ×1, Path to Exile', 'You have 18 · Needs 15'),
        ('{U}{U}', 'Big Score', 'You have 17 · Needs 19'), ('{R}{R}', 'Fury, Professional Face-Breaker', 'You have 24 · Needs 23')]
def mana(phone=False):
    head = ('<div class="tt"><h2>Mana Balance</h2><span class="sub">75 pips · 82 sources</span>'
            '<p>Pips and sources for each color, counted the way the Mana colors card counts them, beside what each color’s tightest cost needs.</p></div>')
    tbl = box(bnd('Colors', '5', '<span>2 short</span>') + mana_table(phone)
              + '<div class="foot">What “Needs” means<a>Show ›</a></div>')
    hard = box(bnd('Hardest costs', '24', '', fold=False, clause='' if phone else 'six per color · W U B R G')
               + (f'<div style="padding:10px 14px 0;font:500 11px IBM Plex Mono,monospace;color:var(--fg-faint)">six per color · W U B R G</div>' if phone else '')
               + ''.join(f'<div class="prow"><span class="c">{c}</span><span>{n}</span><span class="n3 x">{h}</span></div>' for c, n, h in HARD)
               + '<div class="foot">White’s six hardest costs, most pips first. Another color’s pips count as other mana.<a>+20 more</a></div>')
    lands = box(bnd('Lands', '38', '', fold=True, clause='' if phone else '38 lands · 4 can enter tapped · formula 37'))
    tb = ''
    if phone: return dtabs('Tuning') + phback('Mana Balance', 3) + head + tbl + hard + lands
    return dtabs('Tuning') + '<div style="height:4px"></div>' + hubtabs('Mana Balance') + head + tbl + hard + lands

# ======================= R2: Tuning landing + Strategy =======================
def ring(size=260, on=None):
    import math
    segs = [('Artifacts', 26), ('Tribal', 10), ('Equipment and Auras', 6), ('Treasure', 5), ('Free casts', 5)]
    tot = sum(v for _, v in segs); r = size/2 - 16; cx = cy = size/2; a0 = -math.pi/2; out = ''
    shades = ['#9b927f', '#7c7464', '#655e51', '#544e43', '#47423a']
    for i, (n, v) in enumerate(segs):
        a1 = a0 + 2*math.pi*v/tot - 0.04
        x0, y0, x1, y1 = cx + r*math.cos(a0), cy + r*math.sin(a0), cx + r*math.cos(a1), cy + r*math.sin(a1)
        col = 'var(--accent)' if on == n else shades[i]
        out += f'<path d="M{x0:.1f} {y0:.1f} A{r} {r} 0 {1 if a1-a0>math.pi else 0} 1 {x1:.1f} {y1:.1f}" stroke="{col}" stroke-width="{26 if on==n else 22}" fill="none"/>'
        a0 = a1 + 0.04
    mid = (f'<text x="{cx}" y="{cy-4}" text-anchor="middle" fill="#EDE6D8" font-family="Cinzel" font-weight="700" font-size="20">Artifacts</text><text x="{cx}" y="{cy+18}" text-anchor="middle" fill="#948B78" font-family="IBM Plex Mono" font-size="11">26 +1 cards</text>'
           if on else f'<circle cx="{cx}" cy="{cy}" r="{r*0.36}" fill="none" stroke="#3A3229" stroke-dasharray="3 4"/>')
    return f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" aria-hidden="true">{out}{mid}</svg>'
LEG = [('Artifacts', '26 <i>+1</i>'), ('Tribal', '10'), ('Equipment and Auras', '6 <i>+1</i>'), ('Treasure', '5'), ('Free casts', '5')]
SG = {'Artifacts': '<circle cx="8" cy="8" r="2.2"/><path d="M8 2v2M8 12v2M2 8h2M12 8h2M3.8 3.8l1.4 1.4M10.8 10.8l1.4 1.4M3.8 12.2l1.4-1.4M10.8 5.2l1.4-1.4"/>',
      'Tribal': '<path d="M4 3l-1 10M8 3v10M12 3l1 10"/>', 'Equipment and Auras': '<path d="M3 13l6-6M8 3l5 5-3 1-2-2 1-3zM3 13l1.5-.5L4 11z"/>',
      'Treasure': '<path d="M3 6l2-3h6l2 3-5 7z"/><path d="M3 6h10M6.5 3 8 6l1.5-3"/>', 'Free casts': '<circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2"/>'}
def sgl(n): return f'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{SG[n]}</svg>'
def gly(): return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="M8 4.5v7M4.5 8h7"/></svg>'
def strategy(phone=False, on=None):
    leg = ''.join(f'<div class="lg{" on" if n==on else ""}"><span style="color:var(--fg-muted)">{sgl(n)}</span><span>{n}</span><span class="n">{v} cards</span><span class="radio{" on" if n==on else ""}"></span></div>' for n, v in LEG)
    end = '<span>Focus · Artifacts</span>' if on else '<span>no focus yet</span>'
    foot = ('Suggested changes builds toward Artifacts.<a>Clear focus</a>' if on else 'Pick a focus and Suggested changes builds toward it.<a>Open Suggested changes ›</a>')
    return box(bnd('The deck’s strategy', '5 themes', '' if phone else end)
               + f'<div class="strat"><div style="display:flex;justify-content:center">{ring(220 if phone else 260, on)}</div><div class="legend">{leg}</div></div>'
               + f'<div class="foot">{foot}</div>')
TT = [('Consider', 'Cards that fill what this deck is short of, the ones you own first.', '47 you own · 22 to buy', False),
      ('Suggested changes', 'Say what you want changed. You get more cards to add and to cut than you need, and pick.', '1 credit · 2 above 10', False),
      ('Mana Balance', 'Counts every source of each color against what your spells ask for.', 'free', False),
      ('Proposed cuts', 'Offered once the deck passes 100 cards. This one is at 99.', '', True),
      ('History', 'Every run of every tool on this deck, newest first.', '7 runs', False)]
TMK = {'Consider': 'CO', 'Suggested changes': 'S', 'Mana Balance': 'M', 'Proposed cuts': 'C', 'History': 'H'}
def tuning(phone=False, on=None):
    tiles = ''.join(f'<div class="ttile{" dash" if d else ""}"><span class="h">{tmark(TMK[n])}{n}{"" if d else chev(14)}</span><p>{p}</p>{f"<span class=pill2>{c}</span>" if c else ""}</div>' for n, p, c, d in TT)
    tools = f'<div style="display:flex;flex-direction:column;gap:12px;padding-top:6px">{hh("Tools", "5")}<div class="tgrid">{tiles}</div></div>'
    return dtabs('Tuning') + '<div style="height:6px"></div>' + strategy(phone, on) + tools
def sc_focus(phone=False):
    return box(bnd('Suggested changes', '', '<span>1 credit</span>')
               + '<div class="inbox" style="display:flex;flex-direction:column;gap:12px">'
               + '<div style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--fg-body)"><span class="mono faint" style="font-size:10px;letter-spacing:.14em">FOCUS</span><b style="color:var(--fg)">Artifacts</b><span class="faint mono" style="font-size:11px">26 cards</span><a style="margin-left:auto;color:var(--accent);font-weight:500">Change ›</a></div>'
               + '<div style="border:1px solid var(--border-strong);border-radius:9px;padding:12px;min-height:76px;font-size:13.5px;color:var(--fg-faint)">What do you want changed?</div>'
               + '</div>')

# ======================= R2: History =======================
def tmark(t):
    return {'S': '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="3" width="4" height="10" rx="1"/><rect x="10" y="3" width="4" height="10" rx="1"/></svg>',
            'M': '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="5" cy="5" r="2"/><circle cx="11" cy="5" r="2"/><path d="M2 12h12"/></svg>',
            'C': '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 2h8v12l-4-3-4 3z"/></svg>',
            'CO': '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2.5" y="3" width="6" height="9" rx="1"/><rect x="7.5" y="4" width="6" height="9" rx="1"/></svg>',
            'H': '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M2.5 4h1M2.5 8h1M2.5 12h1M6 4h7.5M6 8h7.5M6 12h7.5"/></svg>'}[t]
HIST = {'November 2026': [('S', 'Suggested changes', '3 in, 3 out · 2 added, 2 cut', ('credit', '1 credit'), ('ok', 'ok'), 'Nov 24'),
                          ('M', 'Mana Balance', '75 pips · 82 sources', (None, 'free'), ('ok', 'ok'), 'Nov 21'),
                          ('S', 'Suggested changes', '5 in, 5 out · 1 rejected', ('credit', '1 credit'), ('sh', 'short'), 'Nov 18'),
                          ('M', 'Mana Balance', 'help for White · 2 trades', ('credit', '1 credit'), ('ok', 'ok'), 'Nov 12')],
        'October 2026': [('C', 'Proposed cuts', '2 over · Ramp 1 over, Draw 1 over', (None, 'free'), ('ok', 'ok'), 'Oct 30'),
                         ('S', 'Suggested changes', 'stopped while reading · credit back', (None, 'refunded'), (None, 'stopped'), 'Oct 27'),
                         ('M', 'Mana Balance', '72 pips · 80 sources', (None, 'free'), ('ok', 'ok'), 'Oct 20')]}
def hrow(r):
    m, n, s, (tc, tt), (oc, ot), d = r
    return (f'<div class="hrow"><span style="color:var(--fg-body)">{tmark(m)}</span><span class="tn">{n}</span><span class="sm">{s}</span>'
            f'<span class="tg1"><span class="tag{" cr" if tc else ""}">{tt}</span></span><span class="tg2"><span class="tag{" "+oc if oc else ""}">{ot}</span></span><span class="d">{d}</span></div>')
def history(phone=False):
    head = ('<div class="tt"><h2>History</h2><span class="sub">every run of every tool · newest first</span></div>'
            '<div style="display:flex;align-items:center;gap:10px"><span class="seg"><span class="on">All<i>7</i></span><span>Suggested<i>3</i></span><span>Mana<i>3</i></span><span>Cuts<i>1</i></span></span></div>')
    months = list(HIST.items())
    out = ''
    for i, (m, rows) in enumerate(months):
        cnt = f'{len(rows)} runs'
        ft = '<div class="foot">Kept for as long as the deck is. A free count is recorded once per version of the list.<a>Show 20 more</a></div>' if i == len(months) - 1 else ''
        out += box(bnd(m, cnt, '<span>' + ('2 credits' if i == 0 else 'free') + '</span>') + ''.join(hrow(r) for r in rows) + ft)
    if phone: return dtabs('Tuning') + phback('History', 5) + head + out
    return dtabs('Tuning') + '<div style="height:4px"></div>' + hubtabs('History') + head + out

# ======================= R3: Recommended mix =======================
MIX = [('Ramp', 28, 10, 'rec 10', 'cards →'), ('Draw', 10, 6, 'rec 6', 'cards →'), ('Removal', 9, 7, 'rec 7', 'cards →'), ('Wipes', 3, 1, 'rec 1', 'cards →'), ('Land', 38, 37, 'was 39', 'balance mana →')]
WHY = [('Ramp 10', '— you want your commander out a turn early, every game.'), ('Draw 6', '— a four-player table runs you out of cards before it runs you out of life.'),
       ('Removal 7, Wipes 1', '— three opponents means three threats you didn’t plan for.'), ('Land 37', '— advisory: a cheap curve wants fewer, a heavy one wants more.')]
def mixbox(phone=False, open_=False):
    cells = ''.join(f'<div class="cell"><span class="l">{l}</span><span class="v">{v}<span> / {t}</span></span><span class="bar"></span><span class="f"><span>{r}</span><a>{a}</a></span></div>' for l, v, t, r, a in MIX)
    if phone: cells = ''.join(f'<div class="cell"><span class="l">{l}</span><span class="v">{v}</span><span class="f"><span>{r}</span><a>{a.split()[0]} →</a></span></div>' for l, v, t, r, a in MIX)
    why = (f'<div class="why2">{"".join(f"<p><b>{h}</b> {b}</p>" for h, b in WHY)}</div>' if open_ else '')
    foot = f'<div class="foot">{"Hide" if open_ else "Why these numbers?"}<a>{"" if open_ else ""}</a></div>'
    foot = f'<div class="foot"><a class="l">{"Hide" if open_ else "Why these numbers?"}</a></div>'
    return box(bnd('Recommended mix', '', '<span>A common starting point · <a>reading pending changes</a></span>' if not phone else '') + (f'<div style="padding:8px 14px 0;font:500 11px IBM Plex Mono,monospace;color:var(--fg-faint)">A common starting point · <span style="color:var(--accent)">reading pending changes</span></div>' if phone else '') + f'<div class="mix">{cells}</div>' + why + foot)
TODO = ('<section class="box"><div class="band" style="min-height:44px"><span class="mono faint" style="font-size:10.5px;letter-spacing:.18em">BEFORE ASHEN BANNER PARADE IS READY</span><span class="end"><span>1 to do</span></span></div>'
        '<div style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-left:3px solid var(--accent);background:color-mix(in srgb,var(--accent) 7%,transparent)"><span class="mono" style="font-size:10.5px;color:var(--accent);letter-spacing:.16em">NEXT STEP</span><b>2 changes since v3</b><span class="mono" style="color:var(--success)">+1</span><span class="mono" style="color:var(--danger)">−1</span><span class="muted">Commit them as v4 in Review.</span><span class="btn cream" style="margin-left:auto">Review ›</span></div></section>')

# ======================= R3: Your deck › All / Shopping =======================
ROWS = {'Creatures': ['Burnished Hart', 'Flamekin Harbinger', 'Foundry Inspector', 'Fury', 'Ornithopter of Paradise', 'Professional Face-Breaker'],
        'Instants': ['Abrade', 'Big Score', 'Bolt Bend', 'Chaos Warp']}
CNT = {'Creatures': 10, 'Instants': 15, 'Sorceries': 9}
def drow(n, buy=False, prx=False):
    lead = '<span class="dot buy"></span>' if (buy or prx) else '<span class="dot"></span>'
    mk = '<span class="mk buy">$</span>' if buy else ('<span class="mk prx">P</span>' if prx else '')
    return f'<div class="dr">{lead}<span>{n}</span><span class="mc">{mk}{cost(n)}</span><span class="xx">{xic(14)}</span></div>'
def group(t, names, phone=False):
    return (f'<div class="dhead">{hh(t, str(CNT.get(t, len(names))))}<span style="margin-left:auto" class="mono faint">{"" if phone else ""}</span></div>'
            f'<div class="drows">{"".join(drow(n, prx=(n=="Fury")) for n in names)}</div>')
KEY_D = ('<div class="keyrow" style="border:1px solid var(--border);border-radius:12px;margin-top:18px"><span><span class="mk buy">$</span>to buy</span><span><span class="mk prx">P</span>proxy</span>'
         '<span>🔒︎ locked</span><span>✦ foil</span><span>ϟ game changer</span><span>⤒ tutor</span><span style="width:100%;color:var(--fg-locked)">the brass rule marks the 2 rows you have changed</span></div>')
def ic(d): return f'<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{d}</svg>'
KEY_D = KEY_D.replace('<span>🔒︎ locked</span><span>✦ foil</span><span>ϟ game changer</span><span>⤒ tutor</span>',
  '<span>' + ic('<rect x="3.5" y="7" width="9" height="6.5" rx="1.2"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>') + 'locked</span><span style="color:#c9b6f0">' + ic('<path d="M8 2l1.3 4.7L14 8l-4.7 1.3L8 14l-1.3-4.7L2 8l4.7-1.3z"/>') + '<span style="color:var(--fg-faint)">foil</span></span>'
  '<span style="color:#8FA6BE">' + ic('<path d="M9 2 4 9h4l-1 5 5-7H8z"/>') + '<span style="color:var(--fg-faint)">game changer</span></span><span style="color:#8FA6BE">' + ic('<path d="M8 13V4M4.5 7.5 8 4l3.5 3.5M4 2h8"/>') + '<span style="color:var(--fg-faint)">tutor</span></span>')
COST = {'Burnished Hart': '3', 'Foundry Inspector': '3', 'Ornithopter of Paradise': '2', 'Flamekin Harbinger': 'R', 'Fury': '3RR', 'Professional Face-Breaker': '2R',
        'Abrade': '1R', 'Big Score': '3R', 'Bolt Bend': '3R', 'Chaos Warp': '2R'}
def cost(n):
    c = COST.get(n, '2R'); out = ''
    for ch in c: out += '<span class="mcd"></span>' if ch == 'R' else f'<span class="mcd g">{ch}</span>'
    return out
def subseg(on):
    c = {'All': 99, 'Shopping': 2, 'Notes': 2}
    return '<span class="seg">' + ''.join(f'<span class="{"on" if t==on else ""}" style="{"color:var(--warning)" if t=="Shopping" and t!=on else ""}">{t}{f"<i>{c[t]}</i>" if t in c else ""}</span>' for t in ['All', 'Shopping', 'Stats', 'Notes']) + '</span>'
def yourdeck(phone=False):
    tools = (f'<div class="dtool" style="padding-top:14px">{subseg("All")}' + ('' if phone else f'<span class="mono faint" style="margin-left:auto;font-size:11px">2 of these differ from v1</span><span class="sel">Lock cards</span><span class="seg"><span class="on">By type</span><span>By role</span></span><span class="sel">Name · A–Z {caret()}</span>') + '</div>')
    if phone: tools += f'<div class="dtool"><span class="sel" style="min-height:44px">Lock cards</span><span class="seg"><span class="on">By type</span><span>By role</span></span></div>'
    g = group('Creatures', ROWS['Creatures'][:(5 if phone else 6)], phone) + group('Instants', ROWS['Instants'], phone)
    return dtabs('Your deck') + tools + g + KEY_D.replace('margin-top:18px', 'margin-top:14px')
def shopping(phone=False):
    sumbox = box(bnd('To buy', '2 cards', '<span>$38.70</span>')
                 + '<div class="shop"><div><span class="l">Total</span><span class="v">$38.70</span><span class="s">single copies · Mana Pool</span></div>'
                 + '<div><span class="l">Over $10</span><span class="v">1 card</span><span class="s">marked over <u style="color:var(--fg-body)">$10</u> · default</span></div>'
                 + '<div><span class="l">Last checked</span><span class="v" style="font-size:15px">September 6</span><span class="s">these are behind · a cart with shipping can cost more</span></div></div>'
                 + f'<div class="foot" style="background:transparent;border-top:0"><span class="btn cream">Buy these at Mana Pool ↗</span><a>Change the $10 mark</a></div>')
    rows = (f'<div class="dhead">{hh("Creatures", "1")}</div><div class="drows"><div class="dr"><span class="dot buy"></span><span>Soulbright Flamekin</span><span class="mc"><span class="ibtn">' + ic('<circle cx="6" cy="6" r="2.3"/><circle cx="11" cy="6.5" r="1.8"/><path d="M2 13c.6-2.2 2.2-3.3 4-3.3s3.4 1.1 4 3.3M10 9.8c1.6 0 2.9.9 3.5 2.7"/>') + f'</span> <span class="pricebuy">buy <b>$0.15</b></span></span><span class="xx">{xic(14)}</span></div></div>'
            f'<div class="dhead">{hh("Sorceries", "1")}</div><div class="drows"><div class="dr"><span class="dot buy"></span><span>Jeska’s Will</span><span class="mc"><span class="ibtn">⇄</span> <span class="pricebuy">buy <b>$38.55</b></span></span><span class="xx">{xic(14)}</span></div></div>')
    if phone: rows = rows.replace('class="drows"', 'class="drows"')
    key = ('<div class="keyrow" style="border:1px solid var(--border);border-radius:12px;margin-top:14px"><span><span class="ibtn" style="width:24px;height:22px">⇄</span>cheaper stand-ins</span>'
           '<span><span class="ibtn" style="width:24px;height:22px">' + ic('<circle cx="6" cy="6" r="2.3"/><circle cx="11" cy="6.5" r="1.8"/><path d="M2 13c.6-2.2 2.2-3.3 4-3.3s3.4 1.1 4 3.3M10 9.8c1.6 0 2.9.9 3.5 2.7"/>') + '</span>friend has a spare</span><span><span class="pricebuy" style="height:20px">buy</span>press to add</span><span><span class="pricebuy" style="height:20px;border-color:var(--warning)">buy</span>over $10</span></div>')
    tools = (f'<div class="dtool" style="padding-top:14px">{subseg("Shopping")}' + ('' if phone else f'<span class="seg" style="margin-left:auto"><span class="on">By type</span><span>By role</span></span><span class="sel">Price · Highest {caret()}</span>') + '</div>')
    return dtabs('Your deck') + tools + sumbox + rows + key

# ======================= R3: Analysis =======================
def analysis(phone=False):
    ov = box(bnd('Overview', '', '<span>Uses a credit · 1 of 1 free</span>' if not phone else '') + '<div class="ov"><p>No overview has been written for this deck yet.</p><div><span class="btn">Write one</span></div></div>')
    bks = [('2', 'Core', 'to downgrade your deck', 'Cut <b>Gamble and Jeska’s Will</b>: Core allows none. <a style="color:var(--accent)">what would have to go →</a>', False),
           ('3', 'Upgraded', 'where your cards are', 'ϟ Game changers <b>2</b> <span class="faint mono" style="font-size:11px">3 allowed</span>', True),
           ('4', 'Optimized', 'already allowed', 'Nothing rules it out. It permits more than this deck uses.', False)]
    where = box(bnd('Where you sit, and what moves you', '', '') + '<div class="brk">' + ''.join(
        f'<div class="bk{" on" if on else ""}"><span class="dia2"><span>{n}</span></span><span class="t"><b>{t}</b><small>{s}</small></span><span class="r">{r}</span></div>' for n, t, s, r, on in bks) + '</div>'
        + '<div class="foot"><a>see all brackets →</a></div>')
    verd = ('<div class="verd"><h3>Upgraded</h3><span class="mono faint" style="font-size:11px">analyzed 5 minutes ago</span><p style="font-size:14px;color:var(--fg-body);line-height:1.6">Two game changers, and Core allows none at all. Nothing else in the 99 reaches further.</p>'
            '<div style="border-top:1px solid var(--border);padding-top:12px;font-size:13px;color:var(--fg-body);line-height:1.6">Of the <b>5,257</b> Ashling decks that declared a bracket, <b>2,775</b> said Upgraded.</div></div>')
    wcs = [('2', 'Game changers', 'Gamble · Jeska’s Will', True), ('0', 'Mass land denial', 'nothing in the list', False), ('0', 'Extra turns', 'nothing in the list', False),
           ('0', 'Two-card infinites', 'nothing in the list', False), ('2', 'Tutors', 'Flamekin Harbinger · Gamble', True)]
    what = box(bnd('What is in this deck', '', '') + '<div class="wt">' + ''.join(f'<div class="wc{"" if a else " z"}"><span class="n">{n}</span><b>{t}</b><span>{s}</span>{"<a>see the cards</a>" if a else ""}</div>' for n, t, s, a in (wcs[:4] if phone else wcs)) + '</div>'
               + '<div class="foot"><a class="l">How we make these decisions →</a></div>')
    hps = [('Mana velocity', 'High', 4, 'Early ramp 9.25 · average spell 3 mana', 'see the 28 cards'), ('Card flow', 'Modest', 2, '3 repeating engines, 7 one-time draws', 'see the 10 cards'),
           ('Interaction', 'High', 4, '13 answers · 7 cheap and instant', 'see the 13 cards'), ('Win speed', 'No combo line', 0, 'Nothing in this list puts a combo together.', '')]
    how = box(bnd('How it plays', '', '<span>one scale for every Commander deck</span>' if not phone else '') + '<div class="hp">' + ''.join(
        f'<div class="hc"><b>{t}</b><span class="g">{g}</span><span class="segs">{"".join("<i class=on></i>" if i < k else "<i></i>" for i in range(5))}</span><span>{s}</span>{f"<a>{a}</a>" if a else ""}</div>' for t, g, k, s, a in hps) + '</div>'
        + '<div class="foot">Nothing here moves your bracket.</div>')
    if phone: return dtabs('Analysis') + '<div style="height:4px"></div>' + verd + ov + where + what + how
    top = f'<div style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:26px 30px;align-items:start"><div style="display:flex;flex-direction:column;gap:16px">{ov}{where}</div>{verd}</div>'
    return dtabs('Analysis') + '<div style="height:6px"></div>' + top + what + how

# ======================= R3: Versions =======================
def versions(phone=False):
    vs = [('v3', 'Pre-game-night tune', 'committed Nov 22, 2026 · 99 cards · mv 3.02', '<i>+3</i> / <u>−3</u>', True),
          ('v2', 'More ramp, fewer wipes', 'committed Nov 2, 2026 · 99 cards · mv 3.00', '<i>+5</i> / <u>−5</u>', False),
          ('v1', 'Sleeved for game night', 'committed Oct 20, 2026 · 99 cards · mv 3.00', 'initial', False)]
    rows = ''.join(f'<div class="vr"><span class="vn">{v}</span><span><b>{t}</b><small>{s}</small></span><span class="dl">{d}</span>{"<span class=cur>CURRENT</span>" if c else "<span></span>"}{chev(14)}</div>' for v, t, s, d, c in vs)
    end = '<span>2 changes since v3 · committed from the to-do above</span>' if not phone else ''
    foot = '<div class="foot" style="background:transparent;align-items:center;padding:12px 16px;min-height:64px"><span style="display:flex;flex-direction:column;gap:3px"><b style="font-size:14px">Built from a precon?</b><span class="muted" style="font-size:12.5px">Link it, and this history starts from the box as v0. Your cards don’t change.</span></span><a class="" style="margin-left:auto"><span class="btn">Link a precon</span></a></div>'
    if phone: foot = foot.replace('display:flex;flex-direction:column', 'display:flex;flex:1;flex-direction:column').replace('<a class="" style="margin-left:auto">', '<a style="margin-left:0">').replace('class="foot" style="', 'class="foot" style="flex-direction:column;align-items:stretch;gap:10px;')
    v = box(bnd('Versions', '3', end) + rows + foot)
    ph = ''
    return dtabs('Versions') + '<div style="height:6px"></div>' + ph + v

# ======================= boards =======================
BW = 1300 + 80 + 390
def dp(lab, d, p): return pair(labelled(lab + ' · DESKTOP', desk(d)), labelled(lab + ' · PHONE', phone(p)))
# Main
was_head = '<div style="display:flex;flex-direction:column;gap:14px"><span class="was">Today</span><span style="font:500 10.5px IBM Plex Mono,monospace;letter-spacing:.16em;color:var(--fg-faint)">WHAT IS IN THIS DECK</span><span style="font:600 17px IBM Plex Sans;display:flex;gap:10px;align-items:center;border-top:1px solid var(--border-strong);padding-top:12px">⌄ Removal <span class="mono faint" style="font-size:11.5px;font-weight:500">you have 9 · 2 over · 14 to consider</span></span><span class="disp" style="font-size:16px;border-bottom:1px solid var(--border);padding-bottom:8px">Creatures <span class="mono faint" style="font-size:12px;font-variant:normal">10</span></span></div>'
now_head = '<div style="display:flex;flex-direction:column;gap:14px"><span class="was">Proposed, everywhere</span>' + box(bnd('Removal', '14 to consider', '<a>your 9 →</a><a>Show all 14 ›</a>', fold=False, clause='you have 9 · 2 over') + '<div style="height:28px"></div><div class="keyrow"><span>key at the bottom of the box</span></div><div class="foot">“why” and cross-links in the footer band<a>Open Tuning ›</a></div>') + '</div>'
idx = [('R1 · Consider', 'Each shelf becomes a box: ◆ role, mono count, coverage clause, Show all at the band’s end. A folded shelf collapses to its band with the chevron at the far end, so it still reads as a closed box. The key moves to the bottom.'),
       ('R1 · Mana Balance', 'Same shelf boxes for Colors, Hardest costs and Lands. “What Needs means” moves into the Colors box footer. One tool-title weight across Tuning.'),
       ('R2 · Tuning landing', 'The deck’s strategy moves here from Analysis, first box above the tools, shown for every deck (its read is free). Suggested changes shows the focus as one line with Change.'),
       ('R2 · History', 'Month boxes from Games replace the faint sticky labels; the 420px inner scroll box goes, Show 20 more sits in the last box’s footer.'),
       ('R3 · Recommended mix', 'One box with band, five cells and Why these numbers? in its footer, opening inside the box.'),
       ('R3 · Your deck', 'All and Shopping group heads take ◆ + count with no hairline (rows are already tiles, so no box). Keys move to the foot. Shopping’s four stacked strips become one summary box.'),
       ('R3 · Analysis', 'Five 10px mono labels become ◆ boxes; links move to footers. Strategy is gone from the bottom.'),
       ('R3 · Versions', 'A visible ◆ Versions head with the changes count at its end (Review stays in the to-do above, one control); Built from a precon? becomes the box’s footer row.')]
main = ('<div style="width:1400px;padding:56px 64px 64px;box-sizing:border-box;background:var(--bg);font-family:IBM Plex Sans,sans-serif;color:var(--fg);display:flex;flex-direction:column;gap:30px;' + ns['TOK'] + '">'
        '<div style="display:flex;flex-direction:column;gap:10px"><span class="was">The 99 · Deck details refresh · R1 · 2026-11-26</span><h1 class="disp" style="font-size:34px">Deck details, on the Home and Games pattern</h1>'
        '<p class="mnote">One pattern does most of the work: <b>Home’s ◆ heading</b> (display 17px, mono count) in the band of a <b>box that holds its list</b>, <b>keys at the bottom</b>, and the <b>why and cross-links in a footer band</b>. Notes, Suggested changes and Proposed cuts keep their layouts. Games is as approved.</p></div>'
        f'<div class="cmp">{was_head}{now_head}</div>'
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 32px">' + ''.join(f'<div style="display:flex;flex-direction:column;gap:4px;border-top:1px solid var(--border);padding-top:12px"><b style="font-size:14.5px">{t}</b><span style="font-size:13px;color:var(--fg-body);line-height:1.55">{d}</span></div>' for t, d in idx) + '</div></div>')
W('Main.dc.html', 'Deck details refresh', f'<div class="D" style="display:block;width:1400px">{main}</div>'.replace('class="D" style="display:block;width:1400px"', 'style="width:1400px"'), 1400)
W('R1-Consider.dc.html', 'R1 Consider', dp('TUNING › CONSIDER', consider(), consider(True)), BW)
W('R1-Mana.dc.html', 'R1 Mana Balance', dp('TUNING › MANA BALANCE', mana(), mana(True)), BW)
W('R2-Tuning.dc.html', 'R2 Tuning landing with Strategy', pair(labelled('TUNING · NO FOCUS · DESKTOP', desk(tuning())), labelled('TUNING · NO FOCUS · PHONE', phone(tuning(True)))), BW)
W('R2-Focus.dc.html', 'R2 Focus picked + Suggested changes line', pair(labelled('THE DECK’S STRATEGY · FOCUS PICKED · DESKTOP', desk(dtabs('Tuning') + '<div style="height:6px"></div>' + strategy(False, 'Artifacts'))),
      labelled('SUGGESTED CHANGES · FOCUS LINE (rest of the intake as shipped) · PHONE', phone(dtabs('Tuning') + phback('Suggested changes', 2) + sc_focus(True)))), BW)
W('R2-History.dc.html', 'R2 History', dp('TUNING › HISTORY', history(), history(True)), BW)
W('R3-Mix.dc.html', 'R3 Recommended mix', pair(labelled('DECK HEADER + RECOMMENDED MIX · DESKTOP', f'<div class="D"><img src="art/d-head.png" alt="" style="display:block;width:1300px;height:290px;grid-column:1/3"><div class="rail"></div><div class="main" style="padding-top:20px">{TODO}{mixbox()}{dtabs("Your deck")}</div></div>'),
      labelled('WHY THESE NUMBERS? OPEN · PHONE', phone(mixbox(True, True) + dtabs('Your deck')))), BW)
W('R3-YourDeck.dc.html', 'R3 Your deck › All and Shopping', '<div style="display:flex;flex-direction:column;gap:60px">' + dp('YOUR DECK › ALL', yourdeck(), yourdeck(True)) + dp('YOUR DECK › SHOPPING', shopping(), shopping(True)) + '</div>', BW)
W('R3-Analysis.dc.html', 'R3 Analysis', dp('ANALYSIS', analysis(), analysis(True)), BW)
W('R3-Versions.dc.html', 'R3 Versions', dp('VERSIONS', versions(), versions(True)), BW)
print('ok')
