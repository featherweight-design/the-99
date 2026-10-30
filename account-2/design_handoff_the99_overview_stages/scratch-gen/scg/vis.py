"""Option B for item 1 (Hugh 2026-10-30: 'feels a bit like a wall of text'): the same Overview with card images,
a timeline Game plan, a land figure, paired tip cards, a Key cards grid and severity chips. Fixture HD - Half Shell
(cards we hold real images for); the alternate box is drawn with Counter Intelligence's line, verbatim."""
import re
import kit
import parts as P
from kit import frame
import sys
ov = sys.modules["__main__"]

kit.CSS += r"""
/* ---------- option B: the visual Overview ---------- */
.cimg{display:block;border-radius:4.5%/3.2%;box-shadow:0 3px 10px rgba(0,0,0,.5);flex:none;object-fit:cover}
.vb .ovh{display:grid;grid-template-columns:96px minmax(0,1fr);gap:18px;align-items:start}
.shx .vb .ovh{grid-template-columns:72px minmax(0,1fr);gap:14px}
.vb .ovh .cimg{width:96px;height:134px;transform:rotate(-3deg);margin-top:4px}
.shx .vb .ovh .cimg{width:72px;height:100px}
/* timeline (desktop) */
.tl3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;position:relative}
.tl3::before{content:"";position:absolute;left:4px;right:calc(33.33% - 10px);top:5px;height:1px;background:var(--fg-faint);opacity:.55}
.tl3 .st{display:flex;flex-direction:column;gap:10px;min-width:0}
.tl3 .lb{display:flex;align-items:center;gap:9px;font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-body)}
.tl3 .lb i{width:10px;height:10px;transform:rotate(45deg);background:var(--fg-faint);box-shadow:0 0 0 4px var(--surface-raised);display:block;flex:none}
.tl3 .st.cl .lb i{background:var(--accent)}
.tl3 .cd{border:1px solid var(--border);background:var(--surface-sunken);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:10px;flex:1}
.tl3 .cd .cimg{width:72px;height:100px}
.tl3 .cd p{font-size:13px;line-height:1.55;color:var(--fg-body);text-wrap:pretty}
/* rail with thumbs (phone) */
.rl{position:relative;display:flex;flex-direction:column;gap:12px}
.rl::before{content:"";position:absolute;left:4.5px;top:8px;bottom:8px;width:1px;background:var(--fg-faint);opacity:.55}
.rl .st{display:grid;grid-template-columns:22px minmax(0,1fr);gap:0}
.rl .st>i{width:10px;height:10px;transform:rotate(45deg);background:var(--fg-faint);box-shadow:0 0 0 4px var(--surface-raised);display:block;margin-top:4px}
.rl .st.cl>i{background:var(--accent)}
.rl .cd{border:1px solid var(--border);background:var(--surface-sunken);border-radius:10px;padding:11px 12px;display:grid;grid-template-columns:52px minmax(0,1fr);gap:12px}
.rl .cd .cimg{width:52px;height:72px}
.rl .cd .lb{font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-body);margin-bottom:5px;display:block}
.rl .cd p{font-size:13px;line-height:1.55;color:var(--fg-body);text-wrap:pretty}
/* alternate */
.alt2{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center;border:1px dashed var(--border-dashed);border-radius:10px;padding:12px 14px}
.alt2 .ak{display:flex;align-items:center;gap:7px;font:500 9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-body);margin-bottom:5px}
.alt2 .ak svg{color:var(--accent)}
.alt2 .cr{width:34px;height:34px;border-radius:50%;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;color:var(--accent);background:var(--surface-sunken)}
.alt2 p{font-size:13px;line-height:1.55;color:var(--fg-body);text-wrap:pretty}
/* land figure */
.lfig{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:center;margin-bottom:2px}
.lfig .n{display:flex;flex-direction:column;align-items:center;justify-content:center;width:64px;height:64px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface-sunken)}
.lfig .n b{font:700 26px/1 'Cinzel',serif;color:var(--fg)}
.lfig .n span{font:500 9px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);margin-top:4px}
.lfig p{font-size:13px;line-height:1.55;color:var(--fg-body);text-wrap:pretty}
/* tips with a fanned pair */
.tp2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.shx .tp2{grid-template-columns:1fr}
.tp2 .tc{display:grid;grid-template-columns:78px minmax(0,1fr);gap:12px;align-items:center;border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--surface-sunken)}
.tp2 .fan{position:relative;width:78px;height:86px}
.tp2 .fan .cimg{position:absolute;width:52px;height:72px;top:6px}
.tp2 .fan .cimg:first-child{left:0;transform:rotate(-7deg)}
.tp2 .fan .cimg:last-child{left:24px;transform:rotate(6deg)}
.tp2 p{font-size:13px;line-height:1.55;color:var(--fg-body);text-wrap:pretty}
/* key cards grid */
.kg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.kg .k{display:grid;grid-template-columns:63px minmax(0,1fr);gap:11px;align-items:start;min-width:0}
.kg .k>div{min-width:0}
.kg .k b,.kg .k .cn{white-space:normal;overflow-wrap:anywhere}
.shx .kg .k{min-width:0}
.kg .k .cimg{width:63px;height:88px}
.kg .k b{display:block;font-size:13px;margin:2px 0 4px}
.kg .k span.j{font-size:12.5px;line-height:1.45;color:var(--fg-muted);text-wrap:pretty}
.shx .kg{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 10px}
.shx .kg .k{display:flex;flex-direction:column;gap:6px}
.shx .kg .k .cimg{width:100%;height:auto;aspect-ratio:63/88}
.shx .kg .k b{margin:0;font-size:12px;line-height:1.35}
.shx .kg .k span.j{font-size:11.5px}
/* weaknesses with severity */
.wk2{display:flex;flex-direction:column;gap:10px}
.wk2 p{display:grid;grid-template-columns:82px minmax(0,1fr);gap:10px;align-items:baseline;font-size:13px;line-height:1.55;color:var(--fg-body);text-wrap:pretty}
.shx .wk2 p{grid-template-columns:1fr;gap:5px}
.sev{justify-self:start;font:500 10px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;border-radius:999px;padding:2px 8px;border:1px solid var(--border-strong);color:var(--fg-muted)}
.sev.mod{color:var(--warning);border-color:color-mix(in oklab,var(--warning) 45%,transparent)}
"""

HS = dict(
    aside="HD - Half Shell · written 2 days ago",
    cmdr="heroes",
    overview="[[Heroes in a Half Shell]] leads a Naya counters deck that grows the whole team each combat, then wins by swinging wide with trample.",
    stages=[("avabruck-caretaker", "[[Avabruck Caretaker]] and [[Beorn the Fierce]] start putting counters on the team before the Turtles land around turn 4."),
            ("captain-america", "[[Captain America, Team Leader]] adds a counter to the team each time a creature joins, so every attack grows the board."),
            ("ghalta", "[[Ghalta, Primal Hunger]] comes down cheap off the grown board, and [[All Will Be One]] turns each new counter into damage.")],
    land=(4, "4 lands suit a curve where 9 spells cost five or more."),
    keep=["[[Jasmine Dragon Tea Shop]] with a two-drop fixes every color the team needs."],
    send=["[[Avenger of Zendikar]] and other top end with no ramp to reach it."],
    tips=[(("moonmist", "captain-america"), "Hold [[Moonmist]] for the swing back while [[Captain America, Team Leader]] grows the board."),
          (("ajani-unrelenting", "miku"), "[[Ajani Unrelenting]] adds counters each turn, and [[Miku, Song of the People]] gains life whenever a creature enters.")],
    keys=[("swords", "Swords to Plowshares", "Exiles any creature for one mana."), ("path", "Path to Exile", "The other one-mana answer to anything."),
          ("heartless-act", "Heartless Act", "Kills a blocker with no counters."), ("polyraptor", "Polyraptor", "Copies itself when it’s dealt damage."),
          ("lathliss", "Lathliss, Dragon Queen", "A flier that grows each Dragon after it."), ("zimone", "Zimone, Infinite Analyst", "Draws off the first spell each turn.")],
    weak=[("Moderate", "A wipe like [[All Is Dust]] resets every counter the team has built."),
          ("Minor", "Few ways to draw, so a long game runs the hand dry."),
          ("Minor", "Fliers wall a ground team, and the deck runs few reach creatures.")],
)
CI_ALT = "[[Kilo, Apogee Mind]] leads with haste and proliferates whenever it taps, so counters come from attacking."
mk = ov.mk


def ci(key, w=None):
    return f'<img class="cimg" src="{P.card(key)}" alt="">'


def alt_box():
    return (f'<div class="alt2 new2"><span class="cr">{ov.CROWN.replace("13", "16")}</span>'
            f'<div><span class="ak">Alternate commander · precon only</span><p>{mk(CI_ALT)}</p></div></div>')


def plan(d, phone, alt):
    lab = ["Early", "Mid", "Close"]
    if phone:
        rows = "".join(f'<div class="st{" cl" if i == 2 else ""}"><i></i><div class="cd">{ci(k)}<div><span class="lb">{lab[i]}</span><p>{mk(t)}</p></div></div></div>'
                       for i, (k, t) in enumerate(d["stages"]))
        g = f'<div class="rl new2">{rows}</div>'
    else:
        cols = "".join(f'<div class="st{" cl" if i == 2 else ""}"><span class="lb"><i></i>{lab[i]}</span><div class="cd">{ci(k)}<p>{mk(t)}</p></div></div>'
                       for i, (k, t) in enumerate(d["stages"]))
        g = f'<div class="tl3 new2">{cols}</div>'
    return f'<div class="osub"><h4>Game plan</h4>{g}{alt_box() if alt else ""}</div>'


def sections(d, phone, alt=False):
    n, why = d["land"]
    hands = ov.hands(dict(keep=d["keep"], send=d["send"]))
    tips = "".join(f'<div class="tc"><div class="fan">{ci(a)}{ci(b)}</div><p>{mk(t)}</p></div>' for (a, b), t in d["tips"])
    keys = "".join(f'<div class="k">{ci(k)}<div><b><span class="cn">{nm}</span></b><span class="j">{j}</span></div></div>' for k, nm, j in d["keys"])
    weak = "".join(f'<p><span class="sev{" mod" if s == "Moderate" else ""}">{s}</span><span>{mk(t)}</span></p>' for s, t in d["weak"])
    return (f'<section class="osec"><h3>Overview</h3><div class="ovh new2">{ci(d["cmdr"])}<p class="oov">{mk(d["overview"])}</p></div></section>'
            '<section class="osec"><h3>Primer</h3><div class="prm">'
            + plan(d, phone, alt)
            + f'<div class="osub"><h4>Mulligan</h4><div class="lfig new2"><span class="n"><b>{n}</b><span>lands</span></span><p>{why}</p></div>{hands}</div>'
            + f'<div class="osub"><h4>Key tips</h4><div class="tp2 new2">{tips}</div></div>'
            '</div></section>'
            f'<section class="osec"><h3>Key cards</h3><div class="kg new2">{keys}</div></section>'
            f'<section class="osec"><h3>Weaknesses</h3><div class="wk2 new2">{weak}</div></section>')


def modal(d, alt=False):
    return (f'<div class="omo"><div class="mh"><h2>Overview</h2><span class="as">{d["aside"]}</span><span class="x">×</span></div>'
            f'<div class="mb vb">{sections(d, False, alt)}</div></div>')


def sheet(d, alt=False):
    return (f'<div class="ph shp"><div class="dim">{P.ph_top()}</div>'
            f'<div class="shx"><div class="mh"><h2>Overview</h2><span class="x">×</span></div>'
            f'<div class="mb vb"><span class="asl">{d["aside"]}</span>{sections(d, True, alt)}</div></div></div>')


def board_visual():
    a = ov.frames(frame("<b>1300</b> · option B · a player’s deck · HD - Half Shell", f'<div class="scrimw">{modal(HS)}</div>',
                        "Card images where a line names a card: the commander beside the paragraph, one card per stage, the pair behind each tip, every key card. Each image is the shipped card-open (press opens it, hover previews)."),
                  frame("<b>1300</b> · a precon: the alternate box under the timeline (stages faded)", f'<div class="scrimw">{plan_only(False)}</div>',
                        "Counter Intelligence’s alternate line, verbatim, as a dashed box under the timeline: “another way in”, set apart from the three stages."),
                  gap=40)
    b = ov.frames(frame("<b>390</b> · option B · HD - Half Shell, scrolled whole", sheet(HS)),
                  frame("<b>390</b> · a precon: the alternate under the rail (stages faded)", ph_alt(),
                        "On a phone the timeline turns into the rail, each stage a card with its lead card’s image; the alternate box follows Close."),
                  gap=40)
    calls = ov.tbl([
        ("1", "Card images", "The modal already has every named card’s art (<code>FindingArt</code>), so the lines can show the cards they talk about: the <b>commander</b> beside the paragraph with a slight tilt, the <b>lead card</b> of each stage (the first card the line names), a <b>fanned pair</b> for each tip, and <b>Key cards</b> as a grid of card images. Full cards at card shape, never crops; each one opens the card."),
        ("2", "Game plan as a timeline", "Desktop: Early, Mid, Close as three cards across on one line of diamonds, read left to right. Phone: the rail from A, each stage a card with its image. The precon’s alternate sits under it as a dashed box with the crown: another way in, not a fourth step."),
        ("3", "The land figure", "The land line leads with its number as a figure (<b>4 lands</b> in Cinzel), the reason beside it. The app already computes it (<code>landKeepNumber</code>), so the figure never disagrees with the line."),
        ("4", "Weaknesses", "The Moderate or Minor that leads each line becomes a chip (Moderate in the warning ink), so the line itself starts with the problem."),
        ("5", "What it costs", "No new copy and no new generation. The modal grows taller (about +35% on desktop, +60% on a phone, mostly Key cards); it already scrolls. If that’s too much, Key cards can drop back to A’s rows and keep the rest."),
        ("6", "Fixture", "HD - Half Shell, because the canvas can only show cards we hold real images for. Its text is written for this drawing in iteration 3’s shape; A’s boards keep the samples’ text."),
    ])
    body = (ov.head("item 1 · option B", "Overview, less of a wall of text",
                    "Your note: the Overview reads as a wall of text. Option B keeps every line of A and gives the eye somewhere to land: the cards each line talks about, the plan as a timeline, the land count as a figure, and severity as a chip. Dashed orange outlines mark what B adds over A.")
            + ov.sec("A · Desktop", "The shipped modal, 700 wide.", a)
            + ov.sec("B · Phone", "The shipped sheet.", b)
            + '<div class="sec"><h3>The calls</h3>' + calls + '</div>')
    return kit.doc("Overview option B", body, 700 * 2 + 80 * 2 + 40 + 112)


def plan_only(phone):
    ghost = ('<div class="tl3" style="opacity:.4">' + "".join(f'<div class="st{" cl" if i == 2 else ""}"><span class="lb"><i></i>{l}</span><div class="cd" style="height:54px"></div></div>'
             for i, l in enumerate(["Early", "Mid", "Close"])) + '</div>')
    return (f'<div class="omo"><div class="mh"><h2>Overview</h2><span class="as">Counter Intelligence · written for the precon list</span><span class="x">×</span></div>'
            f'<div class="mb vb"><section class="osec"><h3>Primer</h3><div class="prm"><div class="osub"><h4>Game plan</h4>{ghost}{alt_box()}</div></div></section></div></div>')


def ph_alt():
    ghost = ('<div class="rl" style="opacity:.4">' + "".join(f'<div class="st{" cl" if i == 2 else ""}"><i></i><div class="cd" style="grid-template-columns:1fr;height:60px"><span class="lb">{l}</span></div></div>'
             for i, l in enumerate(["Early", "Mid", "Close"])) + '</div>')
    return (f'<div class="ph shp" style="padding-bottom:16px"><div class="dim">{P.ph_top()}</div><div class="shx"><div class="mh"><h2>Overview</h2><span class="x">×</span></div>'
            f'<div class="mb vb"><span class="asl">Counter Intelligence · written for the precon list</span><section class="osec"><h3>Primer</h3><div class="osub"><h4>Game plan</h4>{ghost}{alt_box()}</div></section></div></div></div>')
