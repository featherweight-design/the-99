"""Item 1 · role drill-down. Helmet: deck_messages/Pass Sheet (the shipped deck page, ModalChrome sheet/modal, the
list's own DecklistRow, the stacked card detail)."""
import lib11 as L
from lib11 import crow, pips, WM, rail

HELM = L.src_helmet("design_handoff_the99_deck_messages/Pass Sheet.dc.html")
CSS = """<style>
.board .ph{height:844px}
.board .ck.nw9{outline:1.5px dashed var(--accent);outline-offset:2px;border-radius:3px}
.board .cell.lk{border-color:var(--border-strong)}
.board .undo9{display:flex;align-items:center;gap:8px;min-height:34px;padding:0 4px 0 10px;border-radius:8px;border:1px dashed var(--border-dashed);font-size:13px;color:var(--fg-muted)}
.board .undo9 b{margin-left:auto;font:600 13px 'IBM Plex Sans';color:var(--accent-text);text-decoration:underline;text-underline-offset:2px;padding:0 10px;min-height:34px;display:flex;align-items:center}
/* What we counted (CutsFrame + CountLine, cuts-free-count.tsx) */
.cfr{margin:14px 16px;border-radius:11px;padding:16px 14px;background:var(--surface-sunken);border:1px solid var(--border)}
.cfr h2{margin:0;font:600 17px Cinzel,serif;color:var(--fg)}
.cfr .sub{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);margin-top:3px;display:block;padding:0;border:0;align-items:initial}
.cfr .ld{margin-top:8px;font-size:13px;line-height:1.5;color:var(--fg-body)}
.cfr .ld b{color:var(--fg);font-weight:600}
.cfr .band{margin-top:14px;border-radius:10px;padding:14px;background:var(--surface);border:1px solid var(--border)}
.cfr .band h3{margin:0;font:600 14px 'IBM Plex Sans';color:var(--fg)}
.cfr .band p{margin-top:5px;font-size:12.5px;line-height:1.5;color:var(--fg-body)}
.cfr .cb2{margin-top:12px;display:inline-flex;align-items:center;height:44px;border-radius:9px;background:var(--accent);color:var(--bg);font:600 13.5px 'IBM Plex Sans';overflow:hidden}
.cfr .cb2 span{padding:0 16px}.cfr .cb2 em{font:normal 11px 'IBM Plex Mono';padding:0 12px;height:100%;display:flex;align-items:center;border-left:1px solid rgba(20,17,14,.35)}
.cfr .std{margin-top:10px;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.cfr .wh{margin-top:18px;display:flex;flex-direction:column;gap:3px}
.cfr .wh h3{margin:0;font:600 13.5px 'IBM Plex Sans';color:var(--fg)}
.cfr .wh span{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.cfr ul{list-style:none;margin:8px 0 0;padding:0;border-top:1px solid var(--border)}
.cfr li{display:grid;grid-template-columns:64px 1fr auto 14px;align-items:baseline;column-gap:12px;padding:9px 0;border-bottom:1px solid var(--border)}
.cfr li.pr{min-height:44px;align-items:center;padding-left:6px;padding-right:4px;outline-offset:1px !important}
.cfr li .so{font:9.5px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-locked)}
.cfr li .lb{font-size:13px;color:var(--fg)}
.cfr li .lb small{display:block;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.cfr li .fg{font:600 13px 'IBM Plex Mono';color:var(--fg);text-align:right}
.cfr li .chv{font:13px 'IBM Plex Mono';color:var(--fg-muted);text-align:center}
.cfr .nv{margin-top:10px;font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-faint)}
.dkm .cfr{margin:18px 30px;border-radius:12px;padding:18px 20px}
.dkm .cfr .hrow{display:flex;align-items:baseline;gap:12px}.dkm .cfr h2{font-size:19px}
.dkm .cfr .band{padding:14px 16px;display:flex;gap:20px;align-items:flex-start;justify-content:space-between}
.dkm .cfr .cb2{margin-top:0;height:38px;flex:none}
.dkm .cfr .wh{flex-direction:row;align-items:baseline;gap:10px}
.dkm .cfr li{grid-template-columns:84px 1fr auto minmax(0,220px) 14px;column-gap:16px}
.dkm .cfr li .lb small{display:none}
.cfr li .nt{display:none}.dkm .cfr li .nt{display:block;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.cfr li.hot{background:color-mix(in srgb,var(--accent) 7%,transparent);box-shadow:inset 2px 0 0 var(--accent)}
.atabs .on{}
</style>"""

# ---- fixture: Quandrix Lab (Zimone, Quandrix Prodigy), the deck the pass sheet board drew -------------------------
RAMP = [("Arcane Signet", "2"), ("Birds of Paradise", "G"), ("Cultivate", "2G"), ("Explore", "1G"), ("Farseek", "1G"),
        ("Kodama’s Reach", "2G"), ("Llanowar Elves", "G"), ("Rampant Growth", "1G"), ("Simic Signet", "2"), ("Sol Ring", "1")]
REMOVAL = [("Beast Within", "2G"), ("Cyclonic Rift", "1U"), ("Kenrith’s Transformation", "1G"), ("Pongify", "U"),
           ("Rapid Hybridization", "U"), ("Reality Shift", "1U"), ("Resculpt", "1U"), ("Song of the Dryads", "2G"), ("Tear Asunder", "1G")]
WIPES = [("Aetherize", "3U"), ("All Is Dust", "7"), ("Cyclonic Rift", "1U"), ("Evacuation", "3UU"), ("Whelming Wave", "2UU")]
UNOWNED = {"Tear Asunder", "Resculpt"}
INSTANTS = [("Aetherize", "3U"), ("Beast Within", "2G"), ("Counterspell", "UU"), ("Cyclonic Rift", "1U"), ("Evacuation", "3UU"),
            ("Mystical Tutor", "U"), ("Pongify", "U"), ("Rapid Hybridization", "U"), ("Reality Shift", "1U"), ("Resculpt", "1U"),
            ("Swan Song", "U"), ("Tear Asunder", "1G")]

LEAD = lambda n, role: (f'The {n} cards we count as {role}, A to Z. A card that does two jobs is in both lists.')


def cell(label, have, rec, cap, kind, new=False):
    """A phone RoleCounterCell. kind: met (success) or short (accent)."""
    col = 'var(--success)' if kind == 'met' else 'var(--accent)'
    capc = 'cd' if cap == '—' else 'ck'
    nw = ' nw9' if new else ''
    sh = ' sh' if kind != 'met' or cap != '—' else ''
    return (f'<div class="cell{sh}"><p class="cl">{label}</p><p class="cf" style="color:{col}">{have}</p>'
            f'<p class="cr">rec {rec}</p><p class="{capc}{nw}">{cap}</p></div>')


def dcell(label, have, rec, cap, kind, new=False):
    col = 'var(--success)' if kind == 'met' else 'var(--accent)'
    pct = 100 if have >= rec else round(have / rec * 100)
    capc = 'cd' if cap == '—' else 'ck'
    nw = ' nw9' if new else ''
    sh = ' sh' if cap != '—' else ''
    return (f'<div class="cell{sh}"><p class="cl">{label}</p><p class="cf" style="color:{col}">{have}<span> / {rec}</span></p>'
            f'<div class="cb"><i style="width:{pct}%;background:{"var(--success)" if kind=="met" else "var(--accent)"}"></i></div>'
            f'<div class="cx"><span class="cr">rec {rec}</span><span class="{capc}{nw}">{cap}</span></div></div>')


def strip(cells, src="EDHREC averages", desk=False):
    f = dcell if desk else cell
    return (f'<section class="mix"><div class="mh"><span class="ml">Recommended mix</span><span class="ms">{src}</span></div>'
            f'<div class="cells">{"".join(f(*c) for c in cells)}</div><span class="why">Why these numbers?</span></section>')


STRIP = [("Ramp", 10, 10, "cards →", "met", True), ("Draw", 7, 10, "suggest →", "short"),
         ("Removal", 9, 8, "cards →", "met", True), ("Wipes", 5, 3, "cards →", "met", True), ("Land", 35, 37, "consider →", "short")]


def hero_phone(h=200):
    return (f'<div class="hero" style="height:{h}px"><img alt="" src="art/zimone-crop.jpg" style="object-position:50% 30%"><div class="wash"></div>'
            '<div class="blk"><h1>Quandrix Lab<span class="pen">✎</span></h1><div class="meta"><span class="pips"><i style="background:var(--u)"></i>'
            '<i style="background:var(--g)"></i></span><span>Zimone, Quandrix Prodigy · Simic</span></div></div></div>')


def list_tail(cnt=99):
    rows = ''.join(f'<div class="row"><span class="ow"></span><span class="nm">{n}</span>{pips(c)}<span class="x">✕</span></div>'
                   for n, c in INSTANTS[:4])
    return (f'<div class="tabs"><span class="on">Your deck<em>{cnt}</em></span><span>Analysis</span><span>Consider<em>14</em></span>'
            f'<span>Games<em>5</em></span><span>Versions<em>3</em></span></div><div class="seg"><span class="on">All<em>{cnt}</em></span>'
            f'<span class="sh">Shopping<em>2</em></span><span>Stats</span><span>Notes<em>2</em></span></div>'
            f'<div class="grp"><h4>Instants<em>12</em></h4>{rows}</div>')


def sheet(role, rows, n, rec, hl=(), undo=None, pressed=None):
    body = ''
    for name, cost in rows:
        cls = ('both ' if name in hl else '') + ('press' if name == pressed else '')
        if undo == name:
            body += f'<div class="undo9 new9">{name} removed<b>Undo</b></div>'
        else:
            body += crow(name, cost, owned=name not in UNOWNED, cls=cls,
                         extra=('<span class="tap"></span>' if name == pressed else ''))
    return (f'<div class="scrim"></div><div class="bs new9" style="outline-offset:-3px">'
            f'<span class="gr"></span><div class="hd2"><div class="tt"><div class="ey">{role} · rec {rec}</div><h3>{n} cards</h3>'
            f'<p>{LEAD(n, role.lower())} {L.DRAFT}</p></div><span class="x">✕</span></div><div class="sr">{body}</div>'
            f'<div class="sf"><span class="p">Done</span></div></div>')


def phone(strip_cells, overlay='', cnt=99, hero=True):
    return (f'<div class="ph">{WM}{hero_phone() if hero else ""}{strip(strip_cells)}{list_tail(cnt)}{overlay}</div>')


def card_detail_phone(back, img, name, tline, price, text):
    return (f'<div class="cs"><div class="bk"><span class="ar">←</span>{back}</div><div class="art"><img alt="" src="art/{img}">'
            f'<span class="ptag">{price}</span></div><div class="nmb"><h3>{name}</h3><span class="tl">{tline}</span></div>'
            '</div>')


def desk(strip_cells, overlay='', analysis=False, cuts=''):
    hero = ('<div class="dhero" style="min-height:220px"><div class="art" style="height:220px"><img alt="" src="art/zimone-crop.jpg"><div class="g"></div></div>'
            '<div class="in" style="min-height:220px"><div class="col"><div style="display:flex;align-items:center"><h1>Quandrix Lab</h1>'
            '<span style="margin-left:6px;font-size:14px;color:var(--fg-muted)">✎</span></div><div class="meta"><span class="pips">'
            '<i style="background:var(--u)"></i><i style="background:var(--g)"></i></span><span>Zimone, Quandrix Prodigy · Simic</span></div>'
            f'<div class="barrow"><div class="bar"><i style="width:100%;background:var(--fg)"></i></div><div class="cnt"><span>{102 if analysis else 99}</span>'
            '<span class="den">/99</span></div></div></div><div class="acol"><span class="db">Update from a list</span><span class="db p">Export</span>'
            '<span class="db g">⋯</span></div></div></div>')
    tabs = (f'<div class="dtabs"><span class="{"" if analysis else "on"}">Your deck<em>{102 if analysis else 99}</em></span>'
            f'<span class="{"on" if analysis else ""}">Analysis</span><span>Consider<em>14</em></span><span>Games<em>5</em></span><span>Versions<em>3</em></span></div>')
    if analysis:
        body = cuts
    else:
        rows = ''.join(L.drow(n, c, owned=n not in UNOWNED) for n, c in INSTANTS)
        body = ('<div class="dtool"><span class="sg"><span class="on">All<em>99</em></span><span>Shopping<em>2</em></span><span>Stats</span>'
                '<span>Notes<em>2</em></span></span></div>' f'<div class="dgrp"><h4>Instants<em>12</em></h4>{rows}</div>')
    return (f'<div class="dk" style="height:{900 if analysis else 760}px">{rail()}<div class="main dkm">{hero}'
            f'{strip(strip_cells, desk=True)}{tabs}{body}</div>{overlay}</div>')


def modal(role, rows, n, rec, hl=()):
    body = ''.join(crow(nm, c, owned=nm not in UNOWNED, cls=('both' if nm in hl else '')) for nm, c in rows)
    return (f'<div class="scrim"></div><div class="md new9" style="top:120px;outline-offset:-3px"><div class="hd2"><div class="tt"><div class="ey">{role} · rec {rec}</div>'
            f'<h3>{n} cards</h3><p>{LEAD(n, role.lower())} {L.DRAFT}</p></div><span class="x">✕</span></div><div class="sr">{body}</div>'
            '<div class="sf"><span class="sp"></span><span class="p">Done</span></div></div>')


def cuts_panel(press=None, desk=False):
    rows = [("role", "Removal", "9", "rec 8 · 1 over", True), ("role", "Wipes", "5", "rec 3 · 2 over", True),
            ("curve", "Cost 3", "13", "the fullest slot", False), ("edhrec", "In under 5% of Zimone decks", "6", "your median card 31%", False)]
    lis = ''
    for so, lb, fg, nt, pr in rows:
        cls = ('pr' if pr else '') + (' hot' if lb == press else '')
        lis += (f'<li class="{cls}{" new9" if pr else ""}" ><span class="so">{so}</span><span class="lb">{lb}<small>{nt}</small></span>'
                f'<span class="fg">{fg}</span><span class="nt">{nt}</span><span class="chv">{"›" if pr else ""}</span></li>')
    head = ('<div class="hrow"><h2>Proposed cuts</h2><span class="sub">free count · look deeper 1 credit</span></div>' if desk else
            '<h2>Proposed cuts</h2><span class="sub">free count · look deeper 1 credit</span>')
    band = ('<div class="band"><div><h3>Name the three cuts</h3><p>A deeper look names three cards to cut, each with a reason. It reads the deck’s combos, '
            'your commander’s text, each card’s cost and colors, the count below and your description.</p></div>'
            '<span class="cb2"><span>Look deeper</span><em>◆ 1 credit</em></span></div>')
    return (f'<div class="cfr">{head}<p class="ld"><b>Three over the ninety-nine.</b> Below is what we counted. To have the cards named, look deeper.</p>'
            f'{band}<div class="wh"><h3>What we counted</h3><span>from 102 cards · EDHREC for Zimone, 2,140 decks · free</span></div>'
            f'<ul>{lis}</ul><p class="nv">Never named: Zimone, Quandrix Prodigy, the 4 cards you locked.</p></div>')


def phone_analysis(overlay=''):
    tabs = ('<div class="tabs"><span>Your deck<em>102</em></span><span class="on">Analysis</span><span>Consider<em>14</em></span>'
            '<span>Games<em>5</em></span></div>')
    return (f'<div class="ph">{WM}{tabs}<div style="padding:12px 16px 0;font:9px \'IBM Plex Mono\';letter-spacing:.14em;color:var(--fg-faint)">TUNING · PROPOSED CUTS</div>'
            f'{cuts_panel()}{overlay}</div>')


def build():
    S = []
    S.append(L.head('Small items 11 · R1 · account 2 · 2026-11-08 · item 1 · role drill-down',
                    'Press a count, see the cards it counted',
                    'A met or over tile on the strip, and a role row in <b>What we counted</b>, open one list: that role’s cards as the deck list’s own rows, '
                    'A to Z, in the shipped ModalChrome sheet at 390 and modal at 1300 (the pass sheet’s <code>SheetFrame</code>). The list matches the figure pressed, '
                    'counted by the label tally, so <b>Cyclonic Rift</b> is in both Removal and Wipes (blue ring, an annotation only). Short tiles and the land tile keep their '
                    'shipped press. A row opens the card detail; its ✕ is the list’s own remove. Nothing is ranked or called a cut. '
                    'Fixture: Quandrix Lab (Zimone), the deck the pass sheet board drew. Dashed copper marks what is new. Copy is DRAFT for /copy-review.'))

    S.append(L.sec('A · The strip: what each tile opens'))
    a1 = phone(STRIP)
    a2 = desk([c[:4] + (c[4], c[5] if len(c) > 5 else False) for c in STRIP])
    zero = [("Ramp", 10, 10, "cards →", "met", True), ("Draw", 7, 10, "suggest →", "short"), ("Removal", 0, 4, "consider →", "short"),
            ("Wipes", 0, 0, "—", "met"), ("Land", 35, 37, "consider →", "short")]
    a3 = f'<div class="spc" style="padding-bottom:4px">{strip(zero)}</div>'
    S.append(L.frames(
        L.fr('<b>A1</b> · 390 · at, over and under', a1,
             '<b>At or over target, with cards:</b> the tile becomes a press and its dash becomes <b>cards →</b> (Ramp 10 of 10, Removal 9 of 8, Wipes 5 of 3). '
             '<b>Under target</b> keeps its shipped press: <i>consider →</i> to its shelf, or <i>suggest →</i> with no shelf (Draw). The land tile keeps <i>consider →</i> '
             'or <i>balance mana →</i>. One press per tile, so nothing is split. A short role’s cards are one press further, from its shelf head in Consider (item 2).', w=390),
        L.fr('<b>A2</b> · 1300', a2, 'The same captions in the desktop cells’ caption row, beside <i>rec N</i>. Hover and pressed as the shipped short cell draws them.', w=760),
    ))
    S.append(L.frames(
        L.fr('<b>A3</b> · 390 · a role with no cards', a3,
             '<b>Wipes 0 of 0:</b> nothing to open, so the cell stays the static figure with its dash, as shipped. <b>Removal 0 of 4</b> is short, so it keeps '
             '<i>consider →</i>. A tile opens a list only when the list has a card in it.', w=390),
    ))

    S.append(L.sec('B · The list: one role’s cards'))
    b1 = phone(STRIP, sheet("Wipes", WIPES, 5, 3, hl=("Cyclonic Rift",)))
    b2 = phone(STRIP, sheet("Removal", REMOVAL, 9, 8, hl=("Cyclonic Rift",)))
    b3 = phone(STRIP, sheet("Wipes", WIPES, 5, 3, pressed="All Is Dust"))
    b4 = phone(STRIP, card_detail_phone("Wipes", "c-all-is-dust.jpg", "All Is Dust", "Tribal Sorcery — Eldrazi · 7", "$4.20",
                                           "Each player sacrifices all permanents they control that are one or more colors."))
    st5 = [("Ramp", 10, 10, "cards →", "met", True), ("Draw", 7, 10, "suggest →", "short"), ("Removal", 9, 8, "cards →", "met", True),
           ("Wipes", 4, 3, "cards →", "met", True), ("Land", 35, 37, "consider →", "short")]
    b5 = phone(st5, sheet("Wipes", WIPES, 4, 3, undo="Evacuation"), cnt=98)
    S.append(L.frames(
        L.fr('<b>B1</b> · 390 · Wipes, from the tile', b1,
             '<b>Wipes 5 of 3</b> opens <b>5 cards</b>. Head: the role and its <i>rec</i>, the count, one line. Rows are <code>DecklistRow</code> in the All view, mounted '
             'as the pass sheet mounts it: ownership dot, name, cost, ✕. Always A to Z, whatever the list’s own sort, so the order never reads as a ranking. Foot: Done.', w=390),
        L.fr('<b>B2</b> · 390 · Removal, the same card', b2,
             '<b>Removal 9 of 8</b> opens <b>9 cards</b>. Cyclonic Rift counts as removal and as a wipe, so it is in both lists, and 9 + 5 is more than the 13 '
             'cards involved. The lead says so once; the row carries no extra mark.', w=390),
        L.fr('<b>B3</b> · 390 · a row pressed', b3, 'The shipped card press: the name opens the card.', w=390),
        L.fr('<b>B4</b> · 390 · its card detail', b4, 'The shipped card sheet stacked on the list, as on the pass sheet. Its close reads <b>← Wipes</b> and lands back on the list.', w=390),
    ))
    S.append(L.frames(
        L.fr('<b>B5</b> · 390 · after a row’s ✕', b5,
             '<b>✕ is the list’s own remove</b>, never a new Cut press: Evacuation leaves the deck as it would from the list, and its row becomes the shipped undo row '
             '(<i>Evacuation removed</i> · <b>Undo</b>). The head, the tile behind and the tab count move in the same paint: <b>4 cards</b>, Wipes 4, 98.', w=390),
        L.fr('<b>B6</b> · 1300 · the modal', desk(STRIP, modal("Removal", REMOVAL, 9, 8, hl=("Cyclonic Rift",))),
             'The 600 modal on <code>ModalChrome</code>, with the same head, rows and foot. The card detail stacks as the shipped 820 card modal, its close <b>← Removal</b>.', w=760),
    ))

    S.append(L.sec('C · What we counted: a role row opens the same list'))
    c1 = phone_analysis()
    c2 = phone_analysis(sheet("Wipes", WIPES, 5, 3, hl=("Cyclonic Rift",)))
    c3 = desk(STRIP, analysis=True, cuts=cuts_panel(desk=True, press="Wipes"),
              overlay=modal("Wipes", WIPES, 5, 3, hl=("Cyclonic Rift",)))
    S.append(L.frames(
        L.fr('<b>C1</b> · 390 · Proposed cuts, 102 cards', c1,
             'Only the <b>role</b> rows become presses: a 44px row with a <b>›</b>. Curve, bracket and EDHREC rows stay counted facts with nothing behind them. '
             'The figure is the label tally, the same as the strip’s (the build makes both read one tally), so Wipes reads 5 here and on the tile.', w=390),
        L.fr('<b>C2</b> · 390 · the Wipes row pressed', c2,
             'The same list as B1: one component, the same head and lead. It names the cards in the role and ranks none of them; '
             '<b>Look deeper</b> stays the one place that names cuts.', w=390),
        L.fr('<b>C3</b> · 1300 · the modal over the Analysis tab', c3,
             'From <code>md</code> the row keeps its four columns and adds the › column.', w=760),
    ))

    S.append(L.rule('Rulings for item 1', [
        '<b>Surface: the shipped sheet (390) and modal (1300).</b> Not the Jobs disclosure: 9 or 21 comma-joined names give no card press and no remove. '
        'Not a jump to the deck list’s <i>By role</i>: that view groups by the single <code>card.role</code>, so its group can disagree with the label-tally figure that was pressed.',
        '<b>One list component</b> for the strip and What we counted (the pass sheet’s <code>SheetFrame</code> with <code>DecklistRow</code>). Same head, same lead, same rows.',
        '<b>The tuning hub’s rule, re-ruled:</b> the free pass still <b>ranks and recommends</b> no card. A role row may open that role’s cards behind a press, A to Z, as the deck list shows them. '
        'No cut order, no Cut press, no Suggestion tag, no reason line. Everything else in What we counted stays unpressable.',
        '<b>Cut from the list:</b> the row’s ✕ is the deck list’s own remove, with the shipped undo row. No new control. A row’s name opens the card detail.',
        '<b>Tiles:</b> at or over target with cards → <b>cards →</b>, opening the list. Under target keeps <i>consider →</i> / <i>suggest →</i>; the land tile keeps its press. A role with no cards draws no press.',
        '<b>Alternative not taken:</b> every tile opens the list, with Consider or Suggest inside it. That adds a step to the job a short tile does today.',
    ]))
    return L.doc('Small items 11 · 1 · Role drill-down', HELM + CSS, ''.join(S), 1900)
