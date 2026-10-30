from kit import *

def sort_printings(rep, codes):
    rest = [c for c in codes if c != rep]
    rest.sort(key=lambda c: (c.split(" ")[0], c.split(" ")[1]))
    return [rep] + rest

CARDS = {
    "rootha": dict(
        name="Rootha, Mastering the Moment", back=None, cost="{2}{U}{R}",
        type="Legendary Creature — Orc Sorcerer", back_type=None,
        oracle="At the beginning of combat on your turn, if you've cast an instant or sorcery spell this turn, create an X/X blue and red Elemental creature token with flying and haste, where X is the greatest mana value among instant and sorcery spells you've cast this turn.",
        keywords=[], ci=["U", "R"], rarity="Mythic", legal=True, img=BLOB["card-rootha"],
        printings=["SOC 8"], capped=False, commander="Rootha",
    ),
    "valki": dict(
        name="Valki, God of Lies", back="Tibalt, Cosmic Impostor", cost="{1}{B} // {5}{B}{R}",
        type="Legendary Creature — God", back_type="Legendary Planeswalker — Tibalt",
        oracle="When Valki enters, each opponent reveals their hand. For each opponent, exile a creature card they revealed this way until Valki leaves the battlefield.\n{X}: Choose a creature card exiled with Valki with mana value X. Valki becomes a copy of that card.",
        back_oracle="As Tibalt enters, you get an emblem with \"You may play cards exiled with Tibalt, Cosmic Impostor, and you may spend mana as though it were mana of any color to cast those spells.\"\n+2: Exile the top card of each player's library.\n−3: Exile target artifact or creature.\n−8: Exile all graveyards. Add {R}{R}{R}.",
        keywords=[], ci=["B", "R"], rarity="Mythic", legal=True, img=None,
        printings=sort_printings("KHM 114", ["PLST KHM-114", "PRM 88272", "PRM 88270", "PKHM 114s", "KHM 308", "KHM 286", "KHM 114"]),
        capped=False, commander="Valki",
    ),
    "ghalta": dict(
        name="Ghalta, Primal Hunger", back=None, cost="{10}{G}{G}",
        type="Legendary Creature — Elder Dinosaur", back_type=None,
        oracle="This spell costs {X} less to cast, where X is the total power of creatures you control.\nTrample (This creature can deal excess combat damage to the player or planeswalker it's attacking.)",
        keywords=["Trample"], ci=["G"], rarity="Rare", legal=True, img=BLOB["card-ghalta"],
        printings=sort_printings("FDC 8", ["FDC 8", "PFDN 222s", "J25 77", "FDN 397", "FDN 335", "FDN 222", "BLC 220", "SPG 11", "CMM 561", "CMM 292", "PLST RIX-130", "SLD 1124", "JMP 399", "GN2 47", "PANA 7", "GNT 44", "PRM 66896", "PRIX 130s", "PRIX 130p", "PRIX 130", "RIX 130"]),
        capped=False, commander="Ghalta",
    ),
    "solring": dict(
        name="Sol Ring", back=None, cost="{1}", type="Artifact", back_type=None,
        oracle="{T}: Add {C}{C}.", keywords=[], ci=[], rarity="Uncommon", legal=True, img=None,
        printings=sort_printings("FDC 286", "FRC 21, FDC 286, SLD 2132, SLD 2783, SLZ 356, SLZ 235, SLZ 114, SLD 2560, PLST BLC-129, SLD 2807, SLD 2683, MSC 214, MSC 213, MSC 212, MSC 211, SLD 2672, SLD 2417, SLD 2539, SOC 427, SOC 128, SLD IFIYW-10, SLD IFIYW-5, TMC 59, SLD 2467, ECC 58, ECC 57, SLD 913, TLE 316, SLC 46, SLC 19, SLD 912, SLD 2330, SLD 2315, SLD 1993, SLD 1988, EOC 57, SLD 2093, SLD 2063, FIC 359, FIC 358".split(", ")),
        capped=True, commander=None,
    ),
}

def chip(code, rep, phone):
    h = 36 if phone else 32
    if rep:
        return f'<a href="https://scryfall.com" target="_blank" rel="noopener" aria-label="{esc(code)}, the printing shown, on Scryfall" style="display: inline-flex; align-items: center; gap: 6px; height: {h}px; padding: 0 11px; border-radius: 7px; border: 1px solid var(--border-strong); background: var(--surface-raised); font-family: var(--mono); font-size: 12px; color: var(--fg); text-decoration: none"><span aria-hidden="true" style="color: var(--fg-faint)">&#9671;</span>{esc(code)}</a>'
    return f'<a href="https://scryfall.com" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; height: {h}px; padding: 0 11px; border-radius: 7px; border: 1px solid var(--border); background: var(--surface); font-family: var(--mono); font-size: 12px; color: var(--fg-body); text-decoration: none">{esc(code)}</a>'

def more_chip(phone):
    h = 36 if phone else 32
    return f'<a href="https://scryfall.com" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; gap: 5px; height: {h}px; padding: 0 12px; border-radius: 7px; border: 1px dashed var(--border-dashed); font-size: 12.5px; font-weight: 500; color: var(--accent-hover); text-decoration: none">More on Scryfall<span style="font-size: .85em; color: var(--fg-muted)">&#8599;</span></a>'

def printings_block(c, phone):
    codes = c["printings"]
    n = len(codes)
    count = "first 40" if c["capped"] else str(n)
    shown = codes
    disclosure = ""
    if phone and n > 8:
        shown = codes[:8]
        disclosure = f'<button type="button" style="margin-top: 12px; width: 100%; min-height: 44px; border-radius: 8px; border: 1px dashed var(--border-strong); background: transparent; color: var(--accent); font-family: var(--mono); font-size: 12px; cursor: pointer">Show all {"40 here" if c["capped"] else n}</button>'
    chips = "".join(chip(code, i == 0, phone) for i, code in enumerate(shown))
    if c["capped"] and not phone:
        chips += more_chip(phone)
    note = "Each opens that printing on Scryfall. " + ("&#9671; is the one pictured." if c["img"] or c["back"] else "&#9671; is the catalog&rsquo;s main printing.")
    return f"""<section aria-label="Printings" style="margin-top: {28 if phone else 32}px">
<div style="display: flex; align-items: baseline; gap: 10px">{label("Printings")}<span style="font-family: var(--mono); font-size: 11px; color: var(--fg-faint)">{count}</span></div>
<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px">{chips}</div>
{disclosure}
<div style="margin-top: 10px; font-family: var(--mono); font-size: 11px; line-height: 1.5; color: var(--fg-faint)">{note}</div>
</section>"""

def oracle_block(c, phone):
    fs = 14 if phone else 15
    pad = "14px 16px" if phone else "18px 20px"
    body = oracle_html(c["oracle"], c["keywords"], 15 if phone else 16)
    if c.get("back_oracle"):
        body += f'<div style="display: flex; align-items: center; gap: 10px; margin: 14px 0 12px"><span style="flex: 1; height: 1px; background: var(--border)"></span><span style="font-family: var(--mono); font-size: 11px; color: var(--fg-faint)">// {esc(c["back"])}</span><span style="flex: 1; height: 1px; background: var(--border)"></span></div>'
        body += oracle_html(c["back_oracle"], c["keywords"], 15 if phone else 16)
    return f'<div style="margin-top: {18 if phone else 24}px; border-radius: 10px; background: var(--surface-rail); border: 1px solid var(--border); padding: {pad}; font-size: {fs}px; line-height: {1.6 if phone else 1.65}; color: var(--fg-body)">{body}</div>'

def facts(c, phone):
    legal = "Legal" if c["legal"] else "Not legal"
    cells = [
        ("Identity", f'<span style="display: inline-flex; align-items: center; gap: 7px">{dot(c["ci"])}{esc(identity_text(c["ci"]))}</span>', "var(--fg)", "var(--sans)"),
        ("Rarity", esc(c["rarity"]), "var(--accent)", "var(--mono)"),
        ("Commander", legal, "var(--fg)", "var(--sans)"),
    ]
    if phone:
        inner = "".join(
            f'<div style="background: var(--surface); padding: 11px 12px; display: flex; flex-direction: column; gap: 5px">{label(k, 9.5)}<div style="font-size: 13px; color: {col}; font-family: {ff}">{v}</div></div>'
            for k, v, col, ff in cells)
        return f'<div style="margin-top: 18px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: var(--border); border-radius: 10px; overflow: hidden; border: 1px solid var(--border)">{inner}</div>'
    inner = "".join(
        f'<div style="display: flex; flex-direction: column; gap: 6px">{label(k, 10)}<div style="font-size: 14px; color: {col}; font-family: {ff}">{v}</div></div>'
        for k, v, col, ff in cells)
    return f'<div style="margin-top: 24px; display: flex; gap: 44px">{inner}</div>'

def head(c, phone):
    name_fs = 25 if phone else 34
    name = f'<h1 style="margin: 0; font-family: var(--display); font-weight: 700; font-size: {name_fs}px; line-height: 1.12; color: var(--fg); text-wrap: balance">{esc(c["name"])}</h1>'
    back = ""
    if c["back"]:
        back = f'<div style="margin-top: 4px; font-family: var(--display); font-weight: 600; font-size: {17 if phone else 20}px; line-height: 1.2; color: var(--fg-muted)"><span style="font-family: var(--mono); font-size: 13px; color: var(--fg-faint); margin-right: 6px">//</span>{esc(c["back"])}</div>'
    tl = c["type"] + (f" // {c['back_type']}" if c["back_type"] else "")
    tline = f'<div style="margin-top: {8 if phone else 10}px; font-size: {14 if phone else 15}px; line-height: 1.45; color: var(--fg-muted)">{esc(tl)}</div>'
    if phone:
        return f'<div>{name}{back}<div style="margin-top: 10px">{mana_cost(c["cost"], 22)}</div>{tline}</div>'
    return f'<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 24px"><div style="min-width: 0">{name}{back}{tline}</div><div style="padding-top: 6px">{mana_cost(c["cost"], 26)}</div></div>'

def link_rows(c, phone):
    rows = []
    if c["commander"]:
        rows.append(f"""<a href="#commander" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding: 10px 0; border-top: 1px solid var(--border); text-decoration: none">
<span style="display: flex; flex-direction: column; gap: 3px"><span style="font-size: 15px; font-weight: 600; color: var(--accent)">{esc(c["commander"])} as a commander</span><span style="font-size: 12.5px; color: var(--fg-faint)">Rank, themes and the cards its decks run</span></span>
<span aria-hidden="true" style="font-size: 18px; color: var(--accent)">&#8594;</span></a>""")
    rows.append(f'<div style="display: flex; align-items: center; min-height: 52px; border-top: 1px solid var(--border)">{ext("Rulings, prices and every printing on Scryfall", 14)}</div>')
    return f'<div style="margin-top: {28 if phone else 36}px; border-bottom: 1px solid var(--border)">{"".join(rows)}</div>'

def card_visual(c, w):
    if c["img"]:
        return tilt_card(c["img"], w, 14, c["name"])
    if c["back"]:
        return missing_scan(w, c["name"])
    return gradient_card(w, COLORLESS if not c["ci"] else COLORLESS)

def caption(c):
    rep = c["printings"][0]
    return f'<div style="font-family: var(--mono); font-size: 11px; color: var(--fg-muted); text-align: center">{esc(rep.replace(" ", " · ", 1))}</div>'

def card_desktop(key):
    c = CARDS[key]
    under = []
    if c["back"]:
        under.append(f'<div style="display: flex; align-items: center; justify-content: center; gap: 12px">{flip_button(44, "Turn over to " + c["back"])}<span style="font-family: var(--mono); font-size: 11px; color: var(--fg-muted)">Front &middot; {esc(c["printings"][0].replace(" ", " · ", 1))}</span></div>')
    elif c["img"]:
        under.append(caption(c))
    left = f"""<div style="display: flex; flex-direction: column; gap: 18px; align-items: center">
{card_visual(c, 336)}
{"".join(under)}
<div style="align-self: stretch; margin-top: 22px">{signed_out(False)}</div>
</div>"""
    right = f"""<div style="min-width: 0; max-width: 640px; padding-top: 8px">
{head(c, False)}
{oracle_block(c, False)}
{facts(c, False)}
{printings_block(c, False)}
{link_rows(c, False)}
</div>"""
    body = f"""{topbar(False)}
<main style="flex: 1; padding: 52px 40px 80px">
<div style="max-width: 1104px; margin: 0 auto; display: grid; grid-template-columns: 384px minmax(0, 1fr); gap: 64px; align-items: start">
{left}
{right}
</div>
</main>
{footer_stub(False)}"""
    return body

def wash(src):
    if not src:
        return ""
    return f'<img src="{src}" alt="" aria-hidden="true" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(28px); transform: scale(1.25); opacity: .55"><div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(20,17,14,0) 40%, rgba(20,17,14,.92) 100%)"></div>'

def card_phone(key):
    c = CARDS[key]
    w = 272
    vis = card_visual(c, w)
    extra = ""
    if c["back"]:
        extra = f'<div style="margin-top: 14px; display: flex; align-items: center; justify-content: center; gap: 10px">{flip_button(44, "Turn over to " + c["back"])}<span style="font-family: var(--mono); font-size: 11px; color: var(--fg-muted)">Front</span></div>'
    elif c["img"]:
        extra = f'<div style="margin-top: 14px">{caption(c)}</div>'
    ground = wash(c["img"]) if c["img"] else ('<div style="position: absolute; inset: 0; background: ' + COLORLESS + '; opacity: .18"></div>' if not c["back"] else "")
    body = f"""{topbar(True)}
<div style="position: relative; overflow: hidden; padding: 28px 0 22px; display: flex; flex-direction: column; align-items: center; background: var(--surface-sunken)">
{ground}
<div style="position: relative; display: flex; flex-direction: column; align-items: center">{vis}{extra}</div>
</div>
<main style="flex: 1; padding: 22px 16px 36px">
{head(c, True)}
{oracle_block(c, True)}
{facts(c, True)}
{printings_block(c, True)}
{link_rows(c, True)}
<div style="margin-top: 32px">{signed_out(True)}</div>
</main>
{footer_stub(True)}"""
    return body
