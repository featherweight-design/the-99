from kit import *

CMDS = {
    "zimone": dict(
        name="Zimone, Infinite Analyst", short="Zimone", type="Legendary Creature — Human Wizard", ci=["G", "U"], ci_name="Simic",
        img=BLOB["card-zimone"], state="ok",
        prose="Zimone turns each X spell into a cheaper next one, stacking +1/+1 counters until hydras and a Krasis cost almost nothing.",
        rank="203", decks="11,687",
        themes=[("+1/+1 Counters", "1,213"), ("X Spells", "1,039"), ("Spellslinger", "250"), ("Ramp", "110"), ("Big Mana", "104"), ("Hydras", "84"), ("Tokens", "67"), ("Control", "58")],
        brackets={1: 8, 2: 851, 3: 1141, 4: 102, 5: 9},
        signature=[("Unbound Flourishing", 96), ("Hydroid Krasis", 94), ("Goldvein Hydra", 90), ("Owlin Spiralmancer", 89), ("Kinetic Ooze", 84), ("Animist's Awakening", 84)],
        similar=["Zaxara, the Exemplary", "Magus Lucea Kane", "Rosheen Meanderer", "Troyan, Gutsy Explorer", "Kruphix, God of Horizons", "Gargos, Vicious Watcher"],
    ),
    "sai": dict(
        name="Sai, Master Thopterist", short="Sai", type="Legendary Creature — Human Artificer", ci=["U"], ci_name="Blue",
        img=BLOB["card-sai"], state="ok", prose=None, rank="703", decks="4,133",
        themes=[("Artifacts", "633"), ("Tokens", "233"), ("Thopters", "117"), ("Combo", "69"), ("Affinity", "56"), ("Flying", "53")],
        brackets={1: 12, 2: 351, 3: 385, 4: 147, 5: 29},
        signature=[("Etherium Sculptor", 87), ("Foundry Inspector", 83), ("Thopter Spy Network", 73), ("Counterspell", 68), ("Thought Monitor", 66), ("Steel Overseer", 66)],
        similar=["Urza, Lord High Artificer", "Emry, Lurker of the Loch", "Jhoira, Weatherlight Captain", "Alela, Artful Provocateur", "Breya, Etherium Shaper", "Arcum Dagsson"],
    ),
    "ashling": dict(
        name="Ashling, the Limitless", short="Ashling", type="Legendary Creature — Elemental Sorcerer", ci=["R"], ci_name="Red",
        img=BLOB["card-ashling"], state="absent",
    ),
    "dina": dict(
        name="Dina, Essence Brewer", short="Dina", type="Legendary Creature — Dryad Druid", ci=["B", "G"], ci_name="Golgari",
        img=BLOB["card-dina"], state="degraded",
    ),
}

def h2(text, phone):
    return f'<h2 style="margin: 0; font-family: var(--display); font-weight: 600; font-size: {18 if phone else 20}px; line-height: 1.25; color: var(--fg)">{esc(text)}</h2>'

def sub(text):
    return f'<div style="margin-top: 4px; font-family: var(--mono); font-size: 11.5px; line-height: 1.5; color: var(--fg-faint)">{text}</div>'

def prose_section(c, phone):
    if not c.get("prose"):
        return ""
    return f"""<section aria-labelledby="why" style="max-width: 640px">
<h2 id="why" style="margin: 0; font-family: var(--display); font-weight: 600; font-size: {18 if phone else 20}px; color: var(--fg)">Why this commander</h2>
<p style="margin: 10px 0 0; font-size: {16 if phone else 17.5}px; line-height: 1.6; color: var(--fg-body); text-wrap: pretty">{esc(c["prose"])}</p>
</section>"""

def stats(c, phone, rank=True):
    figs = []
    if rank and c.get("rank"):
        figs.append(("Rank", "#" + c["rank"]))
    if c.get("decks"):
        figs.append(("Decks", c["decks"]))
    fs = 34 if phone else 44
    cells = "".join(
        f'<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-family: var(--mono); font-weight: 600; font-size: {fs}px; line-height: .95; color: var(--fg)">{v}</span><span style="font-size: 13px; color: var(--fg-body)">{k}</span></div>'
        for k, v in figs)
    return f"""<section aria-label="On EDHREC" style="border-radius: 14px; background: var(--surface-rail); border: 1px solid var(--border); padding: {"18px 16px" if phone else "22px 24px"}; max-width: 640px; box-sizing: border-box">
<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 12px">{label("On EDHREC", 11)}<span style="font-family: var(--mono); font-size: 11px; color: var(--fg-faint)">figures from EDHREC</span></div>
<div style="display: flex; gap: {36 if phone else 56}px; margin-top: 14px">{cells}</div>
</section>"""

def themes(c, phone):
    chips = "".join(
        f'<span style="display: inline-flex; align-items: baseline; gap: 7px; height: 34px; padding: 0 12px; box-sizing: border-box; align-items: center; border-radius: 8px; border: 1px solid var(--border); background: var(--surface)"><span style="font-size: 13.5px; color: var(--fg-body)">{esc(t)}</span><span style="font-family: var(--mono); font-size: 11px; color: var(--fg-faint)">{n}</span></span>'
        for t, n in c["themes"])
    return f"""<section style="max-width: 680px">{h2("Themes", phone)}{sub("Decks tagged with each theme")}
<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px">{chips}</div></section>"""

def brackets(c, phone):
    b = c["brackets"]
    total = sum(b.values())
    mx = max(b.values())
    rows = []
    for n in range(1, 6):
        pct = b[n] / mx * 100
        rows.append(f"""<div style="display: grid; grid-template-columns: {"26px 92px" if not phone else "26px 82px"} minmax(0, 1fr) 52px; align-items: center; gap: 12px; min-height: 36px">
{bracket_mark(n, 26)}<span style="font-size: 13.5px; color: var(--fg-body)">{BRACKET_NAME[n]}</span>
<span style="height: 8px; border-radius: 99px; background: var(--elevated); overflow: hidden; display: block"><span style="display: block; height: 100%; width: {pct:.1f}%; border-radius: 99px; background: var(--bracket-{n})"></span></span>
<span style="font-family: var(--mono); font-size: 12px; color: var(--fg); text-align: right">{b[n]:,}</span></div>""")
    return f"""<section style="max-width: 640px">{h2("Brackets", phone)}{sub(f"{total:,} of these decks say which bracket they&rsquo;re built for")}
<div style="display: flex; flex-direction: column; gap: 4px; margin-top: 12px">{"".join(rows)}</div></section>"""

def signature(c, phone):
    rows = "".join(
        f'<a href="#card" style="display: grid; grid-template-columns: minmax(0, 1fr) auto 18px; align-items: center; gap: 14px; min-height: 46px; border-top: 1px solid var(--border); text-decoration: none"><span style="font-size: 14.5px; color: var(--fg)">{esc(n)}</span><span style="font-family: var(--mono); font-size: 12px; color: var(--fg-muted)">{p}%</span><span aria-hidden="true" style="color: var(--accent)">&#8594;</span></a>'
        for n, p in c["signature"])
    return f"""<section style="max-width: 640px">{h2("Most played with " + c["short"], phone)}{sub(f"Share of {c['short']} decks running each card")}
<div style="margin-top: 12px; border-bottom: 1px solid var(--border)">{rows}</div></section>"""

def similar(c, phone):
    cols = 1 if phone else 2
    items = "".join(
        f'<a href="#commander" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 46px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); text-decoration: none"><span style="font-size: 14px; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{esc(n)}</span><span aria-hidden="true" style="color: var(--accent)">&#8594;</span></a>'
        for n in c["similar"])
    return f"""<section style="max-width: 680px">{h2("Similar commanders", phone)}{sub("From EDHREC, closest first")}
<div style="display: grid; grid-template-columns: repeat({cols}, minmax(0, 1fr)); gap: 8px; margin-top: 14px">{items}</div></section>"""

def state_note(c, phone):
    if c["state"] == "absent":
        return f"""<div role="note" style="max-width: 640px; border-radius: 8px; background: var(--elevated-hover); border: 1px solid var(--border-strong); border-left: 2px solid var(--fg-faint); padding: 13px 16px; display: flex; gap: 10px">
<span aria-hidden="true" style="font-size: 13px; color: var(--fg-faint); line-height: 1.6">&#9888;</span>
<p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--fg-muted)"><b style="font-weight: 600; color: var(--fg-body)">No deck data for {esc(c["short"])}</b> &mdash; EDHREC doesn&rsquo;t track this commander, so there&rsquo;s no rank, no themes and no cards to list here. The card is still all here.</p></div>"""
    return f"""<div role="note" style="max-width: 640px; border-radius: 9px; background: var(--surface-sunken); border: 1px solid var(--border); border-left: 3px solid var(--warning); padding: 13px 16px">
<p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--fg-muted)"><b style="font-weight: 600; color: var(--fg-body)">Deck figures aren&rsquo;t available right now.</b> They come from EDHREC, which didn&rsquo;t answer the last time this page was built. They return with the next refresh.</p></div>"""

def right_sections(c, phone):
    if c["state"] != "ok":
        return [state_note(c, phone)]
    out = []
    p = prose_section(c, phone)
    if p:
        out.append(p)
    out += [stats(c, phone), themes(c, phone), brackets(c, phone), signature(c, phone), similar(c, phone)]
    return out

def ident(c, size=16):
    pips = "".join(f'<span style="width: {size}px; height: {size}px; border-radius: 50%; background: {PIP_FILL[x]}; box-shadow: inset 0 0 0 1px rgba(0,0,0,.4); display: inline-block"></span>' for x in c["ci"])
    return f'<div style="display: flex; align-items: center; gap: 5px">{pips}<span style="margin-left: 4px; font-family: var(--mono); font-size: 12px; color: var(--fg-faint)">{esc(c["ci_name"])}</span></div>'

def card_link(c):
    return f'<a href="#card" style="display: inline-flex; align-items: center; gap: 8px; min-height: 44px; font-size: 14px; font-weight: 600; color: var(--accent); text-decoration: none">The card, its text and printings<span aria-hidden="true">&#8594;</span></a>'

def cmd_desktop(key):
    c = CMDS[key]
    left = f"""<div style="display: flex; flex-direction: column; gap: 14px">
<div style="align-self: center">{tilt_card(c["img"], 344, 14, c["name"])}</div>
<div style="margin-top: 10px; display: flex; flex-direction: column; gap: 4px">
{label("Commander", 10.5)}
<h1 style="margin: 2px 0 0; font-family: var(--display); font-weight: 700; font-size: 24px; line-height: 1.15; color: var(--fg)">{esc(c["name"])}</h1>
<div style="font-size: 13px; color: var(--fg-body)">{esc(c["type"])}</div>
</div>
{ident(c)}
<div style="border-top: 1px solid var(--border); padding-top: 4px">{card_link(c)}</div>
<div style="margin-top: 12px">{signed_out(False)}</div>
</div>"""
    right = '<div style="min-width: 0; display: flex; flex-direction: column; gap: 40px; padding-top: 6px">' + "".join(right_sections(c, False)) + "</div>"
    return f"""{topbar(False)}
<main style="flex: 1; padding: 44px 40px 80px">
<div style="max-width: 1120px; margin: 0 auto; display: grid; grid-template-columns: 384px minmax(0, 1fr); gap: 64px; align-items: start">
{left}
{right}
</div>
</main>
{footer_stub(False)}"""

def cmd_phone(key):
    c = CMDS[key]
    secs = right_sections(c, True)
    return f"""{topbar(True)}
<div style="position: relative; overflow: hidden; padding: 26px 0 24px; display: flex; justify-content: center; background: var(--surface-sunken)">
{wash_img(c["img"])}
<div style="position: relative">{tilt_card(c["img"], 248, 13, c["name"])}</div>
</div>
<main style="flex: 1; padding: 20px 16px 36px">
{label("Commander", 10.5)}
<h1 style="margin: 6px 0 0; font-family: var(--display); font-weight: 700; font-size: 24px; line-height: 1.15; color: var(--fg)">{esc(c["name"])}</h1>
<div style="margin-top: 6px; font-size: 13px; color: var(--fg-body)">{esc(c["type"])}</div>
<div style="margin-top: 10px">{ident(c, 14)}</div>
<div style="margin-top: 10px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border)">{card_link(c)}</div>
<div style="display: flex; flex-direction: column; gap: 32px; margin-top: 28px">{"".join(secs)}</div>
<div style="margin-top: 36px">{signed_out(True)}</div>
</main>
{footer_stub(True)}"""

def wash_img(src):
    return f'<img src="{src}" alt="" aria-hidden="true" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(28px); transform: scale(1.25); opacity: .55"><div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(20,17,14,0) 40%, rgba(20,17,14,.92) 100%)"></div>'
