"""Upgrade this precon R2 (account 2, 2026-11-10): an opt-in flow. Hugh's R1 feedback: one press on the page opens a flow
(intro, then Commander > Bracket > Strategy); the commander comes first; the bracket is the player's choice. Alternate
commander for Prismari Artistry: Muddle, the Ever-Changing (from Hugh's screenshot). Reuses up.py's pieces."""
import kit
import pre as R
import up as U
from kit import img, doc, board_head, frame, frames
from up import DRAFT, glyph, note, sec, ST, CMD, PRE, OWN, OF

kit.CSS += r"""
/* entry */
.uen{display:flex;flex-direction:column;gap:8px}
.dk .uen{flex-direction:row;align-items:center;gap:14px}
.uen .ubt{gap:8px}
.ph .uen .ubt{width:100%}
.uen .kp{font:11px/1.55 'IBM Plex Mono';color:var(--fg-muted)}
.uen .kp a{color:var(--accent-text);text-decoration:underline;text-underline-offset:2px}
/* the flow: drawer on a phone, dialog on desktop */
.uf{position:absolute;z-index:21;background:var(--surface);border:1px solid var(--border-strong);display:flex;flex-direction:column;overflow:hidden}
.ph .uf{left:0;right:0;bottom:0;top:52px;border-radius:16px 16px 0 0}
.dk .uf{left:50%;top:56px;max-height:calc(100% - 112px);transform:translateX(-50%);width:720px;border-radius:14px}
.dk .ufb{flex:0 1 auto}
.ph .uft .x{display:none}
.dk .ufade.pho{display:none}
.ph .uff .bts.stk{flex-direction:column}
.ph .uff .bts.stk span.bk{flex:none}
.uf .gr{width:36px;height:4px;border-radius:2px;background:var(--border-strong);margin:10px auto 0;flex:none}
.dk .uf .gr{display:none}
.uft{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:12px 18px 0;flex:none}
.dk .uft{padding:22px 24px 0}
.uft h2{margin:0;font:400 20px 'Cinzel',serif;color:var(--fg);line-height:1.25}
.uft .x{width:36px;height:36px;border-radius:50%;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;color:var(--fg-muted);flex:none}
.ufs{display:flex;gap:6px;padding:14px 18px 0;flex:none}
.dk .ufs{padding:16px 24px 0}
.ufs span{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;border-top:2px solid var(--border-strong);padding-top:7px;min-height:44px}
.dk .ufs span{min-height:36px}
.ufs span b{font:500 9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.ufs span i{font:normal 12px 'IBM Plex Sans';color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ufs span.dn{border-color:color-mix(in srgb,var(--accent) 55%,transparent)}
.ufs span.dn b{color:var(--fg-muted)}
.ufs span.dn i{color:var(--accent-text);text-decoration:underline;text-underline-offset:2px}
.ufs span.cu{border-color:var(--accent)}
.ufs span.cu b{color:var(--fg)}
.ufs span.cu i{color:var(--fg-body)}
.ufb{flex:1;min-height:0;overflow:hidden;padding:14px 18px 16px;display:flex;flex-direction:column;gap:12px;position:relative}
.dk .ufb{padding:16px 24px 18px}
.ufb .q{font:600 16px 'IBM Plex Sans';color:var(--fg)}
.ufb .qs{font-size:13.5px;line-height:1.55;color:var(--fg-body);margin-top:-6px}
.uff{flex:none;display:flex;flex-direction:column;gap:8px;padding:12px 18px 18px;border-top:1px solid var(--border);background:var(--surface)}
.dk .uff{flex-direction:row-reverse;align-items:center;padding:14px 24px 18px;gap:14px}
.uff .bts{display:flex;gap:8px}
.dk .uff .bts{flex-direction:row-reverse}
.uff .bts span{height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:0 18px;font:500 14px 'IBM Plex Sans'}
.dk .uff .bts span{height:40px;border-radius:8px;font-size:13.5px}
.ph .uff .bts span{flex:1}
.ph .uff .bts span.bk{flex:0 0 96px}
.uff .bts .pr{background:var(--accent);color:var(--bg);font-weight:600}
.uff .bts .pr.dis{background:var(--elevated);color:var(--fg-locked)}
.uff .bts .bk{border:1px solid var(--border-strong);color:var(--fg-body)}
.uff .uln{flex:1}
.dk .uff .uln{text-align:left}
.ufade{position:absolute;left:0;right:0;bottom:0;height:70px;background:linear-gradient(to bottom,rgba(28,24,20,0),var(--surface) 80%);pointer-events:none}
.ufade::after{content:"scrolls";position:absolute;left:0;right:0;bottom:8px;text-align:center;font:500 9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
/* intro */
.uin{display:flex;flex-direction:column;gap:0;border-top:1px solid var(--border)}
.uin div{display:flex;gap:12px;align-items:flex-start;padding:11px 0;border-bottom:1px solid var(--border)}
.uin div em{font:600 12px 'IBM Plex Mono';font-style:normal;color:var(--accent-text);width:58px;flex:none;padding-top:1px}
.uin div p{font-size:13.5px;line-height:1.5;color:var(--fg-body)}
.uin div p b{color:var(--fg);font-weight:600}
/* bracket rows */
.ubr{display:flex;flex-direction:column;gap:8px}
.ubr .uc{flex-direction:row;align-items:flex-start;gap:12px;padding:12px 14px}
.ubr .uc .bn{width:36px;height:36px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;border:1px solid var(--border-strong);background:var(--elevated);font:600 15px 'IBM Plex Mono';color:var(--fg)}
.ubr .uc.on .bn{border-color:var(--accent);color:var(--accent-text)}
.ubr .uc .bx{display:flex;flex-direction:column;gap:3px;padding-right:28px;min-width:0}
.ubr .uc .bx b{font:600 15px 'IBM Plex Sans';color:var(--fg)}
.ubr .uc .bx p{font-size:13px;line-height:1.5;color:var(--fg-body)}
.ubr .uc .bx small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
/* kept runs */
.ukr{display:flex;flex-direction:column;gap:8px}
.ukr .ucr{flex:none}
.ukr .ucr .ch{font:500 13px 'IBM Plex Sans';color:var(--accent-text)}
.ures.fl{border:0;background:transparent;padding:0}
"""

ALT = "Muddle, the Ever-Changing"
U.CM["muddle"] = dict(name=ALT, img="c-muddle.jpg", cost="2UR", mv=4,
                      push="Each instant or sorcery you cast turns Muddle into a copy of your best creature, and that copy attacks every opponent at once.",
                      back=26, dirs="Spells · Tokens", src="a foil in the box · in its 99")
U.CM["rootha"]["push"] = "Copies your instants and sorceries, and turns each copy into an Elemental."

ST["m_spells"] = dict(name="Spells", n=28, blurb="Cast cheap instants and sorceries, and each one turns Muddle into a copy of your best creature for the turn.",
                      cards=[("Counterspell", "c-counterspell.jpg"), ("Swan Song", "c-swan-song.jpg"), ("Searing Touch", "c-searing-touch.jpg")], src="edhrec")
ST["m_tokens"] = dict(name="Tokens", n=9, blurb="Muddle’s copies arrive as tokens at every opponent, so creatures that make more tokens get copied the most.",
                      cards=[("Lathliss, Dragon Queen", "c-lathliss.jpg"), ("Ashling, the Limitless", "c-ashling.jpg"), ("Sai, Master Thopterist", "c-sai.jpg")], src="edhrec")
MORDER = ["m_spells", "m_tokens"]

# (cut, cost, owned, add, cost, owned, price, why, from)
MPAIRS = [
    ("Sai, Master Thopterist", "2U", True, "Brainstorm", "U", False, "$1.20", "One mana, at instant speed: Muddle becomes a copy in the middle of combat.", "Artifacts"),
    ("Wizard’s Staff", "2R", False, "Ponder", "U", True, None, "Finds the next spell for a single mana.", "Artifacts"),
    ("Brudiclad, Telchor Engineer", "4UR", False, "Preordain", "U", False, "$0.90", "Another one-mana look ahead, so every turn has a spell to cast.", "Artifacts"),
    ("Thopter Engineer", "2R", True, "Lightning Bolt", "R", True, None, "Three damage for one mana, and Muddle copies something on the way.", "Artifacts"),
    ("Pia and Kiran Nalaar", "2RR", False, "Chaos Warp", "2R", False, "$0.90", "Answers any permanent, which red rarely can.", "Artifacts"),
    ("Mind Stone", "2", True, "Fact or Fiction", "3U", False, "$0.50", "Four cards looked at, and the pile you keep is usually two spells.", "Artifacts"),
    ("Etherium Sculptor", "1U", True, "Archmage Emeritus", "2UU", False, "$0.30", "A card for every instant or sorcery.", "Artifacts"),
    ("Retrofitter Foundry", "3", False, "Baral, Chief of Compliance", "1U", False, "$1.80", "Every spell costs one less, and your counterspells draw.", "Artifacts"),
    ("Foundry Inspector", "3", True, "Storm-Kiln Artist", "3R", False, "$0.60", "Treasure for every spell, and Muddle can copy it for more.", "Artifacts"),
    ("Unwinding Clock", "4", False, "Electrostatic Field", "1R", False, "$0.25", "A wall early, and 1 damage to each opponent with every spell.", "Artifacts"),
    ("Lathliss, Dragon Queen", "4R", True, "Guttersnipe", "2R", True, None, "Two damage to each opponent with every spell.", "Tokens"),
    ("Goblin Instigator", "1R", True, "Veyran, Voice of Duality", "1UR", False, "$3.10", "Your spell triggers happen twice, Muddle’s included.", "Tokens"),
    ("Krenko, Tin Street Kingpin", "2R", False, "Mystic Confluence", "3UUU", False, "$1.60", "A counter, a bounce or three cards, whichever the turn needs.", "Tokens"),
    ("Hellrider", "2RR", False, "Thousand-Year Storm", "4UR", False, "$2.80", "Each spell is copied once for every spell before it that turn.", "Tokens"),
]
NB = sum(1 for p in MPAIRS if p[6])
BT = sum(float(p[6][1:]) for p in MPAIRS if p[6])

BR = {2: ("Core", "Stay where the box plays. The swaps make it smoother and more focused, with no Game Changers and no fast combos.", "where the box plays"),
      3: ("Upgraded", "Stronger cards, and up to three Game Changers. The step most tables mean by an upgraded precon.", ""),
      4: ("Optimized", "The strongest cards that fit under $12, with no Game Changer limit. For tables that play to win fast.", "")}

STEPS = ["Commander", "Bracket", "Strategy"]
PICKS = {"Commander": "Muddle", "Bracket": "3 · Upgraded", "Strategy": "Spells"}


def stepper(cur, steps=STEPS):
    out = ""
    i = steps.index(cur) if cur in steps else len(steps)
    for j, s in enumerate(steps):
        if j < i:
            out += f'<span class="dn"><b>{j + 1} · {s}</b><i>{PICKS[s]}</i></span>'
        elif j == i:
            out += f'<span class="cu"><b>{j + 1} · {s}</b><i>choosing</i></span>'
        else:
            out += f'<span><b>{j + 1} · {s}</b><i>&nbsp;</i></span>'
    return f'<div class="ufs">{out}</div>'


def flow(body, foot, step=None, steps=STEPS, title=f"Upgrade {PRE}", fade=False):
    st = stepper(step, steps) if step else ""
    return (f'<div class="scrim"></div><div class="uf new9"><span class="gr"></span><div class="uft"><h2>{title}</h2><span class="x">✕</span></div>'
            f'{st}<div class="ufb">{body}{("<div class=\"ufade" + (" pho" if fade == "ph" else "") + "\"></div>") if fade else ""}</div><div class="uff">{foot}</div></div>')


def foot(primary, back="Back", line="", dis=False, stk=False):
    bk = f'<span class="bk">{back}</span>' if back else ""
    return f'<div class="bts{" stk" if stk else ""}"><span class="pr{" dis" if dis else ""}">{primary}</span>{bk}</div>' + (f'<p class="uln">{line}</p>' if line else "")


# ---------------------------------------------------------------- the page
def entry(kept=False):
    kp = (f'<p class="kp">Kept: Spells, led by Muddle, bracket 3 · 14 swaps · Nov 10 · <a>Open</a></p>' if kept
          else f'<p class="uln">Swap 12 to 18 cards toward a strategy you choose · 2 credits a run{DRAFT}</p>')
    up = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>'
    return f'<div class="uen new9"><span class="ubt gh">{up}Upgrade this precon</span>{kp}</div>'


def ph_page(sec_html, over="", h=None):
    return kit.phone(U.page(False, sec_html), "Decks", h=h, over=U.DOCK + over + ("" if over else '<div class="vfx"></div>'))


def dk_page(sec_html, over="", h=900):
    return kit.desk(U.page(True, sec_html), "Decks", h=h, over=over + ("" if over else '<div class="vfx"></div>'))


def ph_flow(f, h=844):
    return kit.phone(U.page(False, entry()), "Decks", h=h, over=U.DOCK + f)


def dk_flow(f, h=860):
    return kit.desk(U.page(True, entry()), "Decks", h=h, over=f)


# ---------------------------------------------------------------- steps
INTRO = ('<div class="uin">'
         '<div><em>12–18</em><p><b>We swap 12 to 18 cards.</b> Each card out makes room for one card in, so the deck stays 100.</p></div>'
         '<div><em>$12</em><p><b>No card we add costs over $12.</b> Cuts come from the deck’s other themes, so the plan you pick gets stronger.</p></div>'
         '<div><em>3 picks</em><p><b>You choose who leads, the bracket and the strategy,</b> in that order: each one changes what fits the next.</p></div>'
         '<div><em>2</em><p><b>2 credits a run.</b> If it doesn’t come through, or finds fewer than 12, both come back.</p></div>'
         '<div><em>v0</em><p><b>Nothing changes until you start a deck from it.</b> That makes a new draft; the box stays its v0.</p></div>'
         '</div>')


def intro_body():
    return (f'<p class="qs" style="margin-top:0">Turn this precon into a stronger deck in a direction you choose. Here’s what to expect.{DRAFT}</p>' + INTRO)


def intro(desk=False, alt=True):
    first = "Commander" if alt else "Bracket"
    return flow(intro_body(), foot(f"Next · {first}", back="Not now", line="You have 15 welcome credits · this run would use 2"))


def who_body(sel=None):
    return ('<p class="q">Who leads the deck?</p><p class="qs">Both come in the box. Each one leads toward different strategies, so this comes first.' + DRAFT + '</p>'
            + '<div class="ucm">' + U.cm_card("rootha", sel == "rootha") + U.cm_card("muddle", sel == "muddle") + '</div>')


def step_who(sel=None):
    return flow(who_body(sel), foot("Next · Bracket", dis=sel is None, line="" if sel else "Choose who leads."), step="Commander")


def br_card(n, on=False):
    nm, bl, src = BR[n]
    s = f'<small>{src}</small>' if src else ""
    return (f'<div class="uc{" on" if on else ""}"><span class="rd"></span><span class="bn">{n}</span><div class="bx"><b>{nm}</b><p>{bl}</p>{s}</div></div>')


def br_body(sel=None):
    return ('<p class="q">How strong should it play?</p><p class="qs">The box plays at bracket 2. Stay there and just tighten it, or move up.' + DRAFT + '</p>'
            + '<div class="ubr">' + "".join(br_card(n, n == sel) for n in (2, 3, 4)) + '</div>')


def step_br(sel=None, steps=STEPS):
    return flow(br_body(sel), foot("Next · Strategy", dis=sel is None, line="" if sel else "Choose a bracket."), step="Bracket", steps=steps)


LOT = "this run uses 2 of 15 welcome"


def st_body(sel=None, ask=False):
    a = ""
    if ask:
        a = ('<div class="uask"><p>You ran Spells with Muddle at bracket 3 on Nov 10, on this same list. Another run uses 2 credits and will likely name many of the same swaps.'
             + DRAFT + '</p><div class="bts"><span class="a">Run it again</span><span class="b">Open Nov 10’s</span></div></div>')
    return ('<p class="q">Where should it go?</p><p class="qs">Worked out for Muddle at bracket 3, from the deck’s own cards.' + DRAFT + '</p>'
            + U.cards(MORDER, sel=sel, cls="two") + a)


def step_st(sel=None, state="ready", ask=False):
    if sel is None:
        f = foot("Upgrade", dis=True, line="Choose a strategy.")
    elif state == "spent":
        f = foot("Upgrade toward Spells", dis=True, line="0 of 1 left · reset at 2:01 AM · <a>Get more credits</a>")
    elif state == "one":
        f = foot("Upgrade toward Spells", dis=True, line=f"An upgrade uses 2 credits, and a free credit covers 1.{DRAFT}<br>1 of 1 free · reset at 2:01 AM · <a>Get more credits</a>")
    elif ask:
        f = ('<div class="uask" style="border:0;padding:0;background:transparent"><p>You ran Spells with Muddle at bracket 3 on Nov 10, on this same list. Another run uses 2 credits and will likely name many of the same swaps.'
             + DRAFT + '</p><div class="bts"><span class="a">Run it again</span><span class="b">Open Nov 10’s</span></div></div>')
    else:
        f = foot("Upgrade toward Spells", line=f"12 to 18 swaps · bracket 3 · uses 2 credits · {LOT}{DRAFT}")
    return flow(st_body(sel), f, step="Strategy", fade="ph")


def picks_line():
    return '<p class="uln">Led by <b>Muddle</b> · bracket <b>3 · Upgraded</b> · <b>Spells</b></p>'


def step_wait():
    w = U.wait("m_spells").replace("Finding swaps toward <b>Spells</b>", "Finding swaps toward <b>Spells</b>")
    return flow(picks_line() + w, foot("Upgrade toward Spells", dis=True, line="Running · 2 credits held"), step="Done")


def step_fail():
    return flow(picks_line() + '<p class="uerr">That upgrade didn’t come through. Both credits are back.' + DRAFT + '</p>',
                foot("Try again", line="2 credits · same picks"), step="Done")


def cmd_pair_m():
    out_r = U.rr("−", "o", CMD, "3UR", True)[:-6] + '<span class="pr">to the 99</span></div>'
    in_r = U.rr("+", "i", ALT, "2UR", False).replace('<span class="pr own">you own it</span>', '<span class="pr cz">leads</span>')
    return ('<div class="ugh">Commander<em>your pick · not one of the swaps</em></div><div class="ucmd upr">'
            f'<div class="rw">{out_r}<span class="ar">→</span>{in_r}</div>'
            '<p class="why">Muddle leaves the 99 to lead, and Rootha takes its slot, so the deck stays 100.' + DRAFT + '</p></div>')


def res_body(n_show=None, short=False, bracket=3):
    pairs = MPAIRS[:9] if short else MPAIRS
    n = len(pairs); nb = sum(1 for p in pairs if p[6]); bt = sum(float(p[6][1:]) for p in pairs if p[6])
    br = ('<span class="up2">bracket 2 → 3 · Upgraded, as chosen</span>' if bracket == 3 else '<span class="up2">bracket stays 2 · Core, as chosen</span>')
    tl = f'<span>led by <b>Muddle</b></span>{br}<span><b>{nb} to buy · ${bt:.2f}</b> · each under $12</span><span>{n - nb} you own</span><span>Nov 10</span>'
    sub = (f'<p class="sub">Fewer than 12 fit this deck at bracket 3, so both credits are back. These {n} are still yours to start with.{DRAFT}</p>' if short else "")
    body = cmd_pair_m(); shown = 0; froms = {}
    for p in pairs:
        froms.setdefault(p[8], []).append(p)
    for f, ps in froms.items():
        if n_show is not None and shown >= n_show:
            break
        ps2 = ps if n_show is None else ps[: max(0, n_show - shown)]
        shown += len(ps2)
        body += f'<div class="ugh">Cuts from {f}<em>{len(ps)}</em></div>' + "".join(U.pair(p) for p in ps2)
    return (f'<div class="ures fl"><div class="hd"><h3><span class="md">{glyph("spells", 16)}</span>{n} swaps toward Spells</h3>'
            f'<div class="tl">{tl}</div>{sub}</div>{body}</div>')


def step_res(n_show=None, short=False):
    n = 9 if short else 14
    return flow(res_body(n_show, short), foot(f"Start the deck with these {n} swaps", back="Try another strategy", line="Kept here: closing doesn’t lose it", stk=True),
                step="Done", fade=n_show is not None, title="Your upgrade")


def kept_body():
    rows = [("spells", "Spells · led by Muddle · bracket 3", "14 swaps · Nov 10"), ("artifacts", "Artifacts · led by Rootha · bracket 3", "14 swaps · Nov 9")]
    r = "".join(f'<div class="ucr"><span class="md">{glyph(k, 16)}</span><span class="tx"><b>{t}</b><span class="dn">{d}</span></span><span class="ch">Open</span></div>' for k, t, d in rows)
    return ('<p class="q">Your upgrades of this precon</p><p class="qs">Each opens free. A new one starts from who leads.' + DRAFT + '</p>' + f'<div class="ukr">{r}</div>')


def step_kept():
    return flow(kept_body(), foot("New upgrade", back="Close", line="2 credits a run · 15 welcome left"))


def sdl_m(desk):
    return (U.sdl(desk).replace(f'<img src="{img("c-rootha.jpg")}" alt=""><span><b>{CMD}</b><span>UR · 99 cards beside it</span>',
                                f'<img src="{img("c-muddle.jpg")}" alt=""><span><b>{ALT}</b><span>UR · Rootha in the 99</span>')
            .replace("With the 14 swaps toward Artifacts.", "Led by Muddle, with the 14 swaps toward Spells.")
            .replace('<em>2 → 3 · Upgraded</em>', '<em>2 → 3 · Upgraded, as chosen</em>')
            .replace('<em>39 of 85 · basic lands not counted</em>', '<em>40 of 85 · basic lands not counted</em>')
            .replace('<div class="fc"><span>Cards</span>', '<div class="fc new9"><span>Commander</span><em>Muddle · Rootha moves into the 99</em></div><div class="fc"><span>Cards</span>'))


# ================================================================ boards
W = 1300 + 112


def b_main():
    calls = [
        "<b>An opt-in flow, opened from one press.</b> The page gains a single row under the Overview: a quiet <code>Upgrade this precon</code> press and one mono line (<code>Swap 12 to 18 cards toward a strategy you choose · 2 credits a run</code>). "
        "The precon’s cards stay where they were, right under it. Nothing else on the page moves; the phone dock is still the box’s Start. No row at all when no strategy is backed for any commander.",
        "<b>The flow is the shipped sheet on a phone and a dialog on desktop</b> (S1’s chrome: grabber on a phone, bare ✕ on desktop, Cinzel title). Its foot holds the one primary press, which names the next step (<code>Next · Bracket</code>), with Back beside it.",
        "<b>It opens on what to expect</b>, five lines with a mono figure each: 12 to 18 swaps and the deck stays 100; nothing added over $12 and cuts come from the other themes; you pick who leads, the bracket and the strategy; 2 credits a run, back if it fails or comes up short; nothing changes until you start a deck, which keeps the box as v0. "
        "The foot says the standing (<code>You have 15 welcome credits · this run would use 2</code>), so cost is clear before the first pick.",
        "<b>Then one step at a time: Commander › Bracket › Strategy.</b> A three-part stepper under the title: done steps show their pick in accent and press back to that step; the current one is lit. "
        "Changing an earlier pick clears the later ones that depend on it (a new commander clears the strategy; a new bracket keeps the commander). Without a backed alternate the stepper is two steps, Bracket › Strategy.",
        "<b>Commander:</b> both as card-shape art, one line on what each pushes, cost pips and <code>mana value N</code>, how many of the deck’s cards back it, and the strategies it opens. "
        "The box’s own is marked with a source line, <code>the box’s commander</code>; Muddle reads <code>a foil in the box · in its 99</code>. Neither is pre-selected.",
        "<b>Bracket is the player’s choice:</b> 2 · Core, 3 · Upgraded, 4 · Optimized as radio cards, each with one plain sentence; the box’s own is marked <code>where the box plays</code>, a source line, not a default. "
        "Staying at 2 is a first-class pick (tighter, no Game Changers). 1 is below the box and 5 can’t be reached under $12, so neither is offered.",
        "<b>Strategy is worked out for the chosen commander and bracket</b>, as R1’s cards. Selecting one turns the foot press into the confirm: <code>Upgrade toward Spells</code> with <code>12 to 18 swaps · bracket 3 · uses 2 credits · …</code>. No dialog on a first run; the same picks again ask once (v2).",
        "<b>The wait, results and a failure stay inside the flow.</b> Results show the commander group first (Rootha <code>to the 99</code>, Muddle <code>leads</code>, not one of the swaps), the bracket line says <code>as chosen</code>, then the pairs by the cut’s theme. "
        "The foot: <code>Start the deck with these 14 swaps</code> (S1) and <code>Try another</code> (back to Strategy, commander and bracket kept).",
        "<b>Results are kept.</b> Closing loses nothing: the page row adds <code>Kept: Spells, led by Muddle, bracket 3 · 14 swaps · Nov 10 · Open</code>, and reopening with kept runs lists them first, each free, with <code>New upgrade</code>.",
    ]
    gaps = [
        "<b>G12 · Bracket as an input.</b> The run takes the chosen bracket and keeps the deck there (Game Changer limit, combo checks), and the result says <code>as chosen</code>. Today the bracket is only measured before and after. If the swaps can’t hold the bracket the run is short (R2) and refunded.",
        "<b>G9 · Runs keyed by commander and bracket.</b> <code>readUpgrades</code> keeps one per strategy; R2 keeps one per commander, bracket and strategy, and the same-picks ask compares all three.",
        "<b>G10 · Strategies per commander</b> (and per bracket where detection depends on it). An alternate with no backed strategy drops the Commander step.",
        "<b>G8 · Into the 99 or out</b>, G11 Start with an alternate, and R1’s G1–G7 stand as written in READINESS.",
    ]
    body = (board_head("Upgrade this precon · R2 · the calls", "A flow the player opts into",
                       "Hugh’s R1 feedback: one press opens the flow; it starts with what to expect, then walks through Commander › Bracket › Strategy; the commander comes first because it decides the strategies; the bracket is a choice (stay at 2, or move up). "
                       "Prismari Artistry’s alternate is <b>Muddle, the Ever-Changing</b>. The five closed rulings and A1 hold. Dashed outlines mark what is new on a shipped page.", tag="R2")
            + note("Design calls · R2", calls, True) + note("Gaps for engineering · R2", gaps)
            + frames(frame("<b>The page</b> · 1300 · fresh", dk_page(entry(), h=900),
                           "One row under the Overview; the list starts right below it, as shipped.")))
    return doc("Upgrade R2 calls", body, W)


def b_entry():
    body = (board_head("1 · The page", "One press, and the cards stay up top",
                       "The only change to the page is a row under the Overview. With kept results it says what’s kept and opens them.", tag="R2")
            + frames(frame("<b>E1</b> · 390 · fresh", ph_page(entry()), "A ghost press, full width, and one line. The list starts under it; the dock is unchanged."),
                     frame("<b>E2</b> · 390 · a kept result", ph_page(entry(kept=True)), "The line names what’s kept; <code>Open</code> goes straight to it, free."),
                     frame("<b>E3</b> · 390 · nothing to upgrade toward", ph_page(""), "No row at all: no press that leads to an empty flow."), gap=36)
            + frames(frame("<b>E2</b> · 1300", dk_page(entry(kept=True), h=760))))
    return doc("Entry R2", body, W)


def b_intro():
    body = (board_head("2 · What to expect", "Before the first pick",
                       "The press opens the flow on five plain lines, each led by its figure. The foot shows the credits standing and names the next step.", tag="R2")
            + frames(frame("<b>I1</b> · 390 · drawer", ph_flow(intro()), "The shipped sheet, full height. <code>Not now</code> closes it."),
                     frame("<b>I1</b> · 1300 · dialog", dk_flow(intro(True), h=844), "720 wide, bare ✕. Without an alternate the press reads <code>Next · Bracket</code>."), gap=36))
    return doc("Intro", body, 1300 + 390 + 36 + 112)


def b_who():
    body = (board_head("3 · Step 1 · Commander", "Who leads comes first",
                       "Both commanders as cards, nothing selected. The strategies line on each says what the choice opens. Next stays off until one is picked.", tag="R2")
            + frames(frame("<b>C1</b> · 390 · nothing chosen", ph_flow(step_who())),
                     frame("<b>C2</b> · 390 · Muddle", ph_flow(step_who("muddle")), "Mana value 4 against Rootha’s 5: the facts carry the difference, not a badge."),
                     frame("<b>C3</b> · 390 · back here later", ph_flow(step_who("muddle").replace('<span class="cu"><b>1 · Commander</b><i>choosing</i></span><span><b>2 · Bracket</b><i>&nbsp;</i></span><span><b>3 · Strategy</b><i>&nbsp;</i></span>',
                                                                                            '<span class="cu"><b>1 · Commander</b><i>Muddle</i></span><span class="dn"><b>2 · Bracket</b><i>3 · Upgraded</i></span><span><b>3 · Strategy</b><i>&nbsp;</i></span>')),
                           "Pressed <code>1 · Commander</code> from a later step. Picking Rootha now clears the strategy, since Rootha’s are different; the bracket stays."), gap=36)
            + frames(frame("<b>C2</b> · 1300", dk_flow(step_who("muddle"), h=760), "Side by side, card art at the page head’s size.")))
    return doc("Commander step", body, W)


def b_br():
    steps2 = ["Bracket", "Strategy"]
    body = (board_head("4 · Step 2 · Bracket", "Stay at 2, or move up",
                       "Three choices, each said plainly. The box’s own bracket is marked as where it plays, not picked.", tag="R2")
            + frames(frame("<b>B1</b> · 390 · nothing chosen", ph_flow(step_br())),
                     frame("<b>B2</b> · 390 · 3 chosen", ph_flow(step_br(3))),
                     frame("<b>B3</b> · 390 · no alternate", ph_flow(step_br(2, steps2)), "Two steps when the box has no backed alternate. Staying at 2 is an ordinary pick."), gap=36)
            + frames(frame("<b>B2</b> · 1300", dk_flow(step_br(3), h=760))))
    return doc("Bracket step", body, W)


def b_st():
    body = (board_head("5 · Step 3 · Strategy and the confirm", "Strategies for Muddle at bracket 3",
                       "R1’s cards, worked out for the picks so far. Selecting one makes the foot press the confirm: it names the strategy and carries the bracket and the 2 credits.", tag="R2")
            + frames(frame("<b>S1</b> · 390 · Spells selected", ph_flow(step_st("m_spells")), "One press spends; no dialog for a first run."),
                     frame("<b>S2</b> · 390 · out of credits", ph_flow(step_st("m_spells", "spent")), "The shipped spent line; the picks are kept."),
                     frame("<b>S3</b> · 390 · same picks as a kept run", ph_flow(step_st("m_spells", ask=True)), "v2’s ask once, in the foot where the press was. <code>Open Nov 10’s</code> costs nothing; the body scrolls to Tokens."), gap=36)
            + frames(frame("<b>S1</b> · 1300", dk_flow(step_st("m_spells"), h=860), "Two cards side by side. The free-credit-only state (P3) reads as R1."),))
    return doc("Strategy step", body, W)


def b_wait():
    body = (board_head("6 · The wait and a failed run", "About six seconds, inside the flow",
                       "The picks sit on one line above v2’s clock. A failure gives both credits back and keeps the picks for Try again.", tag="R2")
            + frames(frame("<b>W</b> · 390", ph_flow(step_wait())),
                     frame("<b>F</b> · 390", ph_flow(step_fail()), "Nothing names what failed inside."), gap=36)
            + frames(frame("<b>W</b> · 1300", dk_flow(step_wait(), h=640))))
    return doc("Wait R2", body, W)


def b_res():
    body = (board_head("7 · Results", "Fourteen swaps toward Spells, led by Muddle",
                       "The commander first, apart from the swaps; the bracket line says it was the player’s choice; then the pairs by the theme the cut came from. Start or try another strategy.", tag="R2")
            + frames(frame("<b>R1</b> · 1300 · dialog, scrolled to the top", dk_flow(step_res(n_show=5), h=980),
                           "<code>Try another</code> returns to Strategy with Muddle and bracket 3 kept. Closing keeps the result on the page row."))
            + frames(frame("<b>R1</b> · 390", ph_flow(step_res(n_show=3))),
                     frame("<b>R2</b> · 390 · short, 9 swaps", ph_flow(step_res(n_show=3, short=True)), "Under 12 at the chosen bracket: counted, refunded, still startable."),
                     frame("<b>K</b> · 390 · reopened with kept results", ph_flow(step_kept()), "Opening the page row with kept runs lists them first; each opens free."), gap=36))
    return doc("Results R2", body, W)


def b_start():
    body = (board_head("8 · Start the deck", "S1, led by Muddle, with the swaps",
                       "Start opens the shipped Start dialog over the flow, with the commander and the swaps in its facts. The new draft links to the precon, so v0 stays the box.", tag="R2")
            + frames(frame("<b>S1</b> · 390 · sheet", kit.phone(U.page(False, entry()), "Decks", h=900, over=sdl_m(False)),
                           "The shipped sheet. Commander row is Muddle; a Commander fact says Rootha moves into the 99."),
                     frame("<b>S1</b> · 1300 · dialog", kit.desk(U.page(True, entry()), "Decks", h=780, over=sdl_m(True)),
                           "Bracket reads <code>2 → 3 · Upgraded, as chosen</code>."), gap=36))
    return doc("Start R2", body, 1300 + 390 + 36 + 112)


BOARDS = [("Main", b_main, "R2 · the calls"), ("Entry", b_entry, "1 · The page"), ("Intro", b_intro, "2 · What to expect"),
          ("Commander", b_who, "3 · Step 1 · Commander"), ("Bracket", b_br, "4 · Step 2 · Bracket"), ("Strategy", b_st, "5 · Step 3 · Strategy"),
          ("Wait", b_wait, "6 · Wait and failed"), ("Results", b_res, "7 · Results"), ("Start", b_start, "8 · Start the deck")]
