"""Item 2 · Consider with a role over target. Helmet: deck_messages/Pass Sheet (deck page), plus the shipped Consider
shelf (consider-panel.tsx ShelfSection) and SuggestionTile drawn from their classes."""
import lib11 as L
from lib11 import WM, rail
import b1

CSS = """<style>
.cpane{padding:12px 16px 20px}
.ctool{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.ctool .so{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 12px;border:1px solid var(--border-strong);border-radius:8px;font:12px 'IBM Plex Sans';color:var(--fg-body)}
.shf{border-top:1px solid var(--border-strong);margin-top:16px}
.shf:first-of-type{margin-top:0}
.shh{display:flex;align-items:baseline;gap:8px;margin-bottom:9px;min-height:52px;padding-top:10px}
.shh .cv{font:11px 'IBM Plex Mono';color:var(--fg-muted);width:12px;flex:none}
.shh .lbw{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.shh .lb{font:600 16px/1.2 'IBM Plex Sans';color:var(--fg)}
.shh .cl{font:10.5px 'IBM Plex Mono';color:var(--fg-muted)}
.shh .sa{flex:none;font:11.5px 'IBM Plex Mono';color:var(--fg-body);min-height:44px;display:inline-flex;align-items:center}
.shh .yr{flex:none;font:11.5px 'IBM Plex Mono';color:var(--accent-text);min-height:44px;display:inline-flex;align-items:center;padding:0 2px}
.shf.fd .shh{margin-bottom:0}
.tgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding-bottom:6px}
.tile{display:flex;flex-direction:column;gap:8px;border-radius:10px;padding:9px 9px 10px;background:var(--surface);border:1px solid var(--border)}
.tile .im{position:relative;aspect-ratio:63/88;border-radius:7px;overflow:hidden;background:var(--surface-sunken)}
.tile .im img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.tile .mt{display:flex;align-items:center;gap:6px}
.tile .mt i{width:8px;height:8px;border-radius:50%;background:var(--success);flex:none}
.tile .nm{font:600 12px 'IBM Plex Sans';color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tile .ty{font:10px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tile .ev{display:flex;align-items:center;gap:6px}
.tile .ev small{font:9px 'IBM Plex Mono';color:var(--fg-locked)}
.tile .ev span{flex:1;height:4px;border-radius:9px;background:var(--border);overflow:hidden}.tile .ev span b{display:block;height:100%;background:var(--accent)}
.tile .ev em{font:normal 10px 'IBM Plex Mono';color:var(--fg-body)}
.tile .lf{font:10px 'IBM Plex Mono';color:var(--fg-muted)}
.tile .ad{margin-top:auto;display:flex;align-items:center;justify-content:center;height:44px;border-radius:10px;border:1px solid var(--border-strong);font:500 14px 'IBM Plex Sans';color:var(--fg)}
.dkm .cpane{padding:16px 30px 24px}
.dkm .shh{min-height:44px}
.dkm .shh .lbw{flex-direction:row;align-items:baseline;gap:10px}
.dkm .shh .lb{font-size:17px}
.dkm .shh .cl{font-size:11px}
.dkm .tgrid{grid-template-columns:repeat(6,minmax(0,1fr));gap:14px}
.dkm .tile .ad{height:32px;border-radius:8px;font-size:12.5px}
.dkm .shf{margin-top:0;margin-bottom:20px}
.ctop{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
</style>"""

TILES = {
    "land": [("c-jasmine-tea-shop.jpg", "Jasmine Dragon Tea Shop", "Land", 18, None)],
    "syn": [("c-avenger-of-zendikar.jpg", "Avenger of Zendikar", "Creature — Elemental", 44, 21),
            ("c-polyraptor.jpg", "Polyraptor", "Creature — Dinosaur", 12, 9),
            ("c-avabruck-caretaker.jpg", "Avabruck Caretaker", "Creature — Human Werewolf", 31, 18),
            ("c-cemetery-prowler.jpg", "Cemetery Prowler", "Creature — Wolf", 27, 6)],
}


def tile(img, name, ty, pct, lift):
    lf = f'<p class="lf">+{lift} pts vs. all decks</p>' if lift else ''
    return (f'<div class="tile"><div class="im"><img alt="" src="art/{img}"></div><div class="mt"><i></i><span class="nm">{name}</span></div>'
            f'<p class="ty">{ty}</p><div class="ev"><small>edhrec</small><span><b style="width:{pct}%"></b></span><em>{pct}%</em></div>{lf}'
            '<span class="ad">Add</span></div>')


def shelf(label, clause, tiles=None, folded=False, yours=None, new=False, show_all=None):
    cv = '▸' if folded else '▾'
    right = ''
    if yours:
        right += f'<span class="yr new9">{yours}</span>'
    if show_all and not folded:
        right += f'<span class="sa">{show_all}</span>'
    body = '' if folded else f'<div class="tgrid">{"".join(tile(*t) for t in tiles)}</div>'
    cl = f'<span class="cl{" new9" if new else ""}">{clause}</span>'
    return (f'<section class="shf{" fd" if folded else ""}"><div class="shh"><span class="cv">{cv}</span><span class="lbw"><span class="lb">{label}</span>{cl}</span>'
            f'{right}</div>{body}</section>')


def shelves(all_met=False):
    s = ''
    if not all_met:
        s += shelf("Land", "you have 35 of 37 · 1 to consider", TILES["land"])
    s += shelf("Synergy · Zimone", "ranked by synergy · 4 to consider", TILES["syn"])
    if all_met:
        s += shelf("Land", "you have 37 of 37 · 1 to consider", folded=True, yours="your 37 →", new=True)
    s += shelf("Ramp", "you have 10 of 10 · 2 to consider", folded=True, yours="your 10 →", new=True)
    if all_met:
        s += shelf("Draw", "you have 10 of 10 · 3 to consider", folded=True, yours="your 10 →", new=True)
    s += shelf("Removal", "you have 9 · 1 over · 3 to consider", folded=True, yours="your 9 →", new=True)
    s += shelf("Wipes", "you have 5 · 2 over · 1 to consider", folded=True, yours="your 5 →", new=True)
    return s


def phone(all_met=False, overlay='', h=1180):
    tabs = ('<div class="tabs"><span>Your deck<em>99</em></span><span>Analysis</span><span class="on">Consider<em>14</em></span>'
            '<span>Games<em>5</em></span><span>Versions<em>3</em></span></div>')
    tool = '<div class="ctool"><span>14 cards you already own</span><span class="so">Coverage gaps first ▾</span></div>'
    cells = ALLMET if all_met else b1.STRIP
    return (f'<div class="ph" style="height:auto;min-height:844px">{WM}{b1.strip(cells)}{tabs}<div class="cpane">{tool}{shelves(all_met)}</div>{overlay}</div>')


ALLMET = [("Ramp", 10, 10, "cards →", "met", True), ("Draw", 10, 10, "cards →", "met", True), ("Removal", 9, 8, "cards →", "met", True),
          ("Wipes", 5, 3, "cards →", "met", True), ("Land", 37, 37, "balance →", "met")]


def desk():
    tabs = ('<div class="dtabs"><span>Your deck<em>99</em></span><span>Analysis</span><span class="on">Consider<em>14</em></span>'
            '<span>Games<em>5</em></span><span>Versions<em>3</em></span><span style="margin-left:auto;border:0" class="ctop">14 cards you already own · Sort: Coverage gaps first ▾</span></div>')
    return (f'<div class="dk" style="height:auto">{rail()}<div class="main dkm">{b1.strip([c for c in b1.STRIP], desk=True)}{tabs}'
            f'<div class="cpane">{shelves()}</div></div></div>')


def build():
    S = [L.head('Small items 11 · R1 · account 2 · 2026-11-08 · item 2 · Consider, a role over target',
                'A role you have enough of folds below the plan',
                'Consider sorts shelves by how short the deck is, so a met or over shelf already sorts late, but it still draws open and its head prints '
                '<i>you have 5 of 3</i>. <b>Ruled:</b> short shelves lead, open, as shipped; <b>Threats &amp; synergy</b> follows; every shelf at or over its target '
                'sorts after it, <b>folded</b> (the shipped fold, one press opens it). Its head says how far over in plain figures, and <b>your N →</b> opens the role’s '
                'cards (item 1’s list), where the ✕ cuts. One list for one job; no second cut control. Same fixture as item 1.')]
    S.append(L.sec('D · The shelves'))
    S.append(L.frames(
        L.fr('<b>D1</b> · 390 · short, then the plan, then met and over', phone(),
             '<b>Land</b> (35 of 37) leads open with its one tile. <b>Synergy · Zimone</b> next. Then the folded met and over shelves, in the order '
             'nearest the target first: <b>Ramp</b> at target keeps the shipped clause <i>you have 10 of 10</i>; <b>Removal</b> and <b>Wipes</b> read '
             '<i>you have 9 · 1 over</i>, <i>you have 5 · 2 over</i>, in <code>--fg-muted</code> like every clause (never <code>--warning</code>: the over tally is neutral). '
             'The suggestion count stays, so a folded shelf still says what it holds. The mark key above the shelves is as shipped and not redrawn.', w=390),
        L.fr('<b>D2</b> · 390 · your 5 → pressed', phone(overlay=b1.sheet("Wipes", b1.WIPES, 5, 3), h=1180),
             'The same sheet as item 1: <b>5 cards</b>, A to Z, each row’s ✕ the list’s own remove. Done lands back on the shelf; '
             'cutting Evacuation makes the head <i>you have 4 · 1 over</i>.', w=390),
        L.fr('<b>D3</b> · 390 · every role at or over', phone(all_met=True, h=1040),
             'Nothing is short, so <b>Synergy</b> leads and every role shelf is folded under it, each with its <b>your N →</b>. The strip above says the same in green. '
             'No new banner: the strip and the folded heads already say it.', w=390),
    ))
    S.append(L.frames(
        L.fr('<b>D4</b> · 1300', desk(),
             'At 1300 the clause sits beside the label and <b>your N →</b> takes the slot <i>Show all N →</i> uses on an open shelf (a folded shelf never shows Show all). '
             'The press is 44px tall at both widths.', w=1300),
    ))
    S.append(L.rule('Rulings for item 2', [
        '<b>Keep the suggestions, folded.</b> Hiding them would drop real swap candidates; collapsing keeps them one press away. Folded is the shipped per-shelf fold, so a player who opens one keeps it open, as today.',
        '<b>Order:</b> short shelves by gap (shipped) → Threats &amp; synergy → at-target shelves → over shelves, least over first → the unowned append. Only the targetless shelf’s place changes, from last to before the met shelves.',
        '<b>Wording</b> (DRAFT for /copy-review): over reads <code>you have {have} · {have − target} over</code>; at target keeps <code>you have {have} of {target}</code>; the press reads <code>your {have} →</code>, aria <i>See your {have} {role} cards</i>.',
        '<b>The cut entry is item 1’s list</b> (recommended in the brief): <i>your N →</i> on every met or over shelf head, open or folded. A short shelf gets no <i>your N →</i>: its job is to add, and the role’s cards are on the Stats tab’s Jobs.',
        '<b>At target exactly:</b> folded with the met shelves; its clause is the shipped one.',
    ]))
    return L.doc('Small items 11 · 2 · Consider over target', b1.HELM + b1.CSS + CSS, ''.join(S), 1900)
