from kit import *
from cards import CARDS, facts as card_facts
from commanders import CMDS, stats

def cap(text):
    return f'<div style="font-family: var(--mono); font-size: 11px; letter-spacing: .08em; color: var(--fg-faint); margin-bottom: 12px">{text}</div>'

def block_board():
    return f"""<div style="padding: 48px 56px; display: flex; gap: 72px; align-items: flex-start">
<div style="width: 384px">{cap("DESKTOP &middot; 384 column, under the card")}{signed_out(False)}</div>
<div style="width: 358px">{cap("390 &middot; last thing before the footer")}{signed_out(True)}</div>
<div style="width: 340px">{cap("THE SAME BLOCK, BOTH PAGES")}
<ul style="margin: 0; padding: 0 0 0 18px; font-size: 13.5px; line-height: 1.7; color: var(--fg-body)">
<li>One link: <b style="color: var(--fg); font-weight: 600">Sign in</b>. No field, no email, no form.</li>
<li>&ldquo;Ask a friend&rdquo; is the only route in that exists today; there is no request flow to link to.</li>
<li>Never &ldquo;Sign up&rdquo;. Never a banner, modal or sticky bar.</li>
<li>Identical for every visitor, so it caches with the page.</li>
</ul></div>
</div>"""

def og_card():
    c = CARDS["rootha"]
    return f"""<div style="width: 600px; height: 315px; position: relative; overflow: hidden; border-radius: 0; background: var(--bg)">
<img src="{BLOB['art-rootha']}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(18px); transform: scale(1.2); opacity: .5">
<div style="position: absolute; inset: 0; background: linear-gradient(90deg, rgba(20,17,14,.35) 0%, rgba(20,17,14,.88) 48%, rgba(20,17,14,.96) 100%)"></div>
<div style="position: absolute; left: 40px; top: 30px">{tilt_card(c["img"], 182, 9, c["name"], tilt=False)}</div>
<div style="position: absolute; left: 262px; right: 36px; top: 46px; display: flex; flex-direction: column; gap: 10px">
<div style="font-family: var(--mono); font-size: 10px; letter-spacing: .3em; text-transform: uppercase; color: var(--accent)">Card</div>
<div style="font-family: var(--display); font-weight: 700; font-size: 27px; line-height: 1.1; color: var(--fg)">{esc(c["name"])}</div>
<div style="display: flex; align-items: center; gap: 10px">{mana_cost(c["cost"], 18)}<span style="font-size: 13px; color: var(--fg-muted)">{esc(c["type"])}</span></div>
</div>
<div style="position: absolute; right: 30px; bottom: 24px; display: flex; align-items: center; gap: 9px">{crowned(26)}<span style="font-family: var(--mono); font-size: 9.5px; letter-spacing: .36em; text-transform: uppercase; color: var(--accent)">The Ninety-Nine</span></div>
</div>"""

def og_cmd():
    c = CMDS["zimone"]
    return f"""<div style="width: 600px; height: 315px; position: relative; overflow: hidden; background: var(--bg)">
<img src="{BLOB['art-zimone']}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover">
<div style="position: absolute; inset: 0; background: linear-gradient(90deg, rgba(20,17,14,.92) 0%, rgba(20,17,14,.8) 48%, rgba(20,17,14,.15) 100%)"></div>
<div style="position: absolute; left: 36px; top: 34px; width: 330px; display: flex; flex-direction: column; gap: 10px">
<div style="font-family: var(--mono); font-size: 10px; letter-spacing: .3em; text-transform: uppercase; color: var(--accent)">Commander</div>
<div style="font-family: var(--display); font-weight: 700; font-size: 27px; line-height: 1.1; color: var(--fg)">{esc(c["name"])}</div>
<div style="font-size: 13.5px; line-height: 1.5; color: var(--fg-body)">{esc(c["prose"])}</div>
<div style="font-family: var(--mono); font-size: 11.5px; color: var(--fg-muted)">#203 on EDHREC &middot; 11,687 decks</div>
</div>
<div style="position: absolute; left: 36px; bottom: 22px; display: flex; align-items: center; gap: 9px">{crowned(26)}<span style="font-family: var(--mono); font-size: 9.5px; letter-spacing: .36em; text-transform: uppercase; color: var(--accent)">The Ninety-Nine</span></div>
</div>"""

def unfurl(og, title, desc, path):
    # A neutral chat unfurl: no messaging product's own chrome is imitated.
    return f"""<div style="width: 600px; display: flex; flex-direction: column; gap: 10px">
<div style="align-self: flex-start; max-width: 600px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); padding: 10px 14px; font-size: 14px; color: var(--accent-hover)">https://the-99.dev/{esc(path)}</div>
<div style="border-radius: 12px; overflow: hidden; border: 1px solid var(--border-strong); background: var(--surface-rail)">
{og}
<div style="padding: 12px 16px 14px; display: flex; flex-direction: column; gap: 4px">
<span style="font-family: var(--mono); font-size: 11px; color: var(--fg-faint)">the-99.dev</span>
<span style="font-size: 15px; font-weight: 600; color: var(--fg)">{esc(title)}</span>
<span style="font-size: 13px; line-height: 1.5; color: var(--fg-muted)">{esc(desc)}</span>
</div></div></div>"""

def previews_board():
    rootha = CARDS["rootha"]["oracle"]
    d1 = "Legendary Creature — Orc Sorcerer. " + rootha[:118].rsplit(" ", 1)[0] + "…"
    left = unfurl(og_card(), "Rootha, Mastering the Moment · The 99", d1, "[card address]")
    right = unfurl(og_cmd(), "Zimone, Infinite Analyst · Commander · The 99", CMDS["zimone"]["prose"], "[commander address]")
    rows = [
        ("og:title", "{Name} · The 99", "{Name} · Commander · The 99"),
        ("og:description", "Type line, then the rules text cut at a word near 155 characters", "The prose sentence. No prose: &ldquo;#{rank} on EDHREC across {decks} decks. {top three themes}.&rdquo; Absent or degraded: the type line"),
        ("og:image", "1200&times;630: the card over its own blurred art, name, cost, type, lockup. No image: the identity gradient, name and type", "1200&times;630: the art crop, name, the sentence and the two figures, lockup. No art: the identity gradient"),
        ("twitter:card", "summary_large_image", "summary_large_image"),
    ]
    trs = "".join(f'<tr><td style="padding: 9px 14px 9px 0; font-family: var(--mono); font-size: 12px; color: var(--fg); vertical-align: top; white-space: nowrap">{k}</td><td style="padding: 9px 14px; font-size: 13px; line-height: 1.5; color: var(--fg-body); vertical-align: top">{a}</td><td style="padding: 9px 0 9px 14px; font-size: 13px; line-height: 1.5; color: var(--fg-body); vertical-align: top">{b}</td></tr>' for k, a, b in rows)
    table = f"""<table style="width: 100%; border-collapse: collapse; margin-top: 8px"><thead><tr><th style="text-align: left; padding: 0 14px 8px 0; font-family: var(--mono); font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--fg-faint); font-weight: 400">tag</th><th style="text-align: left; padding: 0 14px 8px; font-family: var(--mono); font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--fg-faint); font-weight: 400">card page</th><th style="text-align: left; padding: 0 0 8px 14px; font-family: var(--mono); font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--fg-faint); font-weight: 400">commander page</th></tr></thead><tbody>{trs}</tbody></table>"""
    return f"""<div style="padding: 48px 56px; display: flex; flex-direction: column; gap: 40px">
<div style="display: flex; gap: 64px; align-items: flex-start">{left}{right}</div>
<div style="max-width: 1264px; border-top: 1px solid var(--border); padding-top: 16px">{table}</div>
</div>"""

def not_found(phone):
    pad = "56px 20px 64px" if phone else "96px 40px 120px"
    return f"""{topbar(phone)}
<main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: {pad}; background: radial-gradient(520px 300px at 50% 70%, rgba(207,135,69,.07), transparent 70%)">
<div aria-hidden="true" style="font-family: var(--display); font-weight: 900; font-size: {48 if phone else 64}px; letter-spacing: .04em; color: var(--elevated); margin-bottom: 2px">404</div>
<h1 style="margin: 0; font-family: var(--display); font-weight: 700; font-size: {21 if phone else 24}px; color: var(--fg)">There&rsquo;s no page here.</h1>
<p style="margin: 10px 0 0; max-width: 380px; font-size: {13.5 if phone else 15}px; line-height: 1.6; color: var(--fg-body)">I checked. Twice. Probably a typo in the URL.</p>
<div style="margin-top: 24px"><a href="/" style="display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 22px; border-radius: 8px; background: var(--accent); color: var(--bg); font-size: {13 if phone else 14}px; font-weight: 600; text-decoration: none">Back home</a></div>
</main>
{footer_stub(phone)}"""

def fragments_board():
    rhystic = """<div style="border-radius: 10px; background: var(--surface-rail); border: 1px solid var(--border); padding: 18px 20px">
<div style="font-size: 15px; line-height: 1.65; color: var(--fg-body)">Whenever an opponent casts a spell, you may draw a card unless that player pays """ + pip("1", 16) + """.</div></div>
<div style="margin-top: 16px; border-radius: 10px; background: var(--surface-rail); border: 1px solid var(--border); padding: 16px 20px">
<h3 style="margin: 0 0 10px; font-family: var(--mono); font-weight: 400; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--fg-faint)">Bracket facts</h3>
<div style="display: flex; align-items: center; gap: 10px; font-size: 15px; color: var(--fg-body)">""" + gc_glyph() + """game changer</div></div>"""
    crypt = dict(ci=[], rarity="Mythic", legal=False)
    zim_blank = dict(CMDS["zimone"])
    return f"""<div style="padding: 48px 56px; display: grid; grid-template-columns: 560px 560px; gap: 56px 72px">
<div>{cap("CARD &middot; BRACKET FACTS, BETWEEN RULES TEXT AND THE FACTS ROW &middot; RHYSTIC STUDY")}{rhystic}{card_facts(dict(ci=["U"], rarity="Rare", legal=True), False)}</div>
<div>{cap("CARD &middot; NOT COMMANDER-LEGAL: A NO, NEVER A REASON &middot; MANA CRYPT")}<div style="border-radius: 10px; background: var(--surface-rail); border: 1px solid var(--border); padding: 18px 20px; font-size: 15px; line-height: 1.65; color: var(--fg-body)"><p style="margin: 0">At the beginning of your upkeep, flip a coin. If you lose the flip, this artifact deals 3 damage to you.</p><p style="margin: .5em 0 0">{pip("T", 16)}: Add {pip("C", 16)}{pip("C", 16)}.</p></div>{card_facts(crypt, False)}
<div style="margin-top: 22px">{cap("390")}{card_facts(crypt, True)}</div></div>
<div>{cap("COMMANDER &middot; RANK BLANK: THE FIGURE DROPS, DECKS STANDS ALONE")}{stats(zim_blank, False, rank=False)}</div>
<div>{cap("COMMANDER &middot; BOTH BLANK: THE STATS CARD UNMOUNTS, THEMES MOVE UP")}<div style="height: 132px; border-radius: 14px; border: 1px dashed var(--border-dashed); display: flex; align-items: center; justify-content: center; font-family: var(--mono); font-size: 11px; color: var(--fg-locked)">nothing drawn</div></div>
</div>"""
