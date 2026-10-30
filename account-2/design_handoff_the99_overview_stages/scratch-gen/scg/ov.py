"""Overview stages + Suggested changes "why these cards" (account 2, 2026-10-30).

Item 1 redraws the shipped Overview modal (synopsis-body.tsx: SynopsisModal / PreconSynopsisModal in ModalChrome, 700
wide; the phone sheet 52px down, 43px header) with iteration 3's Primer: Game plan (Early, Mid, Close), the precon-only
alternate commander line, the deck-specific land line, exactly 2 tips. Text is the eval samples' iteration-3 side
(docs/superpowers/design-briefs/overview-i3-samples/), verbatim.
Item 2 extends the Suggested changes v2 kit (sc.py / si4.py) over the shipped results (suggested-changes-run.tsx).
"""
import os
import re
import sys
import json
import shutil

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
import parts as P
import graph  # noqa: F401
import sc as S
import si4
from kit import doc, frame

TAG = "OV"


def head(kicker, title, cap):
    return kit.board_head(kicker, title, cap, tag=TAG)


def sec(title, sp, body):
    return f'<div class="sec"><h3>{title}</h3><p class="sp">{sp}</p>{body}</div>'


def frames(*fs, gap=44):
    return f'<div class="frames" style="gap:{gap}px">{"".join(fs)}</div>'


def tbl(rows):
    return '<div class="tbl2">' + "".join(f'<div class="tr"><div>{a}</div><div>{b}</div><div>{c}</div></div>' for a, b, c in rows) + '</div>'


def mk(t):
    """[[Name]] marks as the shipped CardName (semibold, dotted accent underline)."""
    return re.sub(r"\[\[(.+?)\]\]", r'<span class="cn">\1</span>', t)


CROWN = ('<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M2.5 12.5h11M3 11 2 5l3.4 2.6L8 3.5l2.6 4.1L14 5l-1 6z" '
         'fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>')

kit.CSS += r"""
/* ---------- item 1: the Overview modal (ModalChrome 700 / phone sheet) ---------- */
.omo p,.omo span.body,.shx p,.shx span.body,.hand .hl>span,.owhy p,.sline>span{text-wrap:pretty}
.cn{font-weight:600;color:var(--fg);border-bottom:1px dotted var(--accent)}
.omo{width:700px;flex:none;border:1px solid var(--border-strong);border-radius:14px;background:var(--surface-raised);box-shadow:0 24px 60px rgba(0,0,0,.55);overflow:hidden;display:flex;flex-direction:column}
.omo .mh{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--border)}
.omo .mh h2,.shx .mh h2{margin:0;font:700 16px 'Cinzel',serif;color:var(--fg)}
.omo .mh .as{font:12px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.omo .mh .x,.shx .mh .x{margin-left:auto;font:14px 'IBM Plex Mono';color:var(--fg-faint);width:44px;height:30px;display:flex;align-items:center;justify-content:flex-end}
.omo .mb{display:flex;flex-direction:column;gap:20px;padding:20px 22px 26px}
.scrimw{background:color-mix(in oklab,#14110E 72%,#3a3229);border-radius:12px;border:1px solid var(--border-strong);padding:40px;display:flex;justify-content:center}
.ph.shp{background:#0F0D0A}
.shp .dim{opacity:.28}
.shx{margin-top:-21px;border-top:1px solid var(--border-strong);border-radius:14px 14px 0 0;background:var(--surface-raised);position:relative;z-index:2;display:flex;flex-direction:column}
.shx .mh{height:43px;display:flex;align-items:center;gap:9px;padding:0 16px;border-bottom:1px solid var(--border)}
.shx .mh h2{font-size:15px}
.shx .x{margin-right:-10px;width:44px!important;height:43px!important;justify-content:center!important}
.shx .mb{display:flex;flex-direction:column;gap:18px;padding:16px 16px 28px}
.shx .asl{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.osec{display:flex;flex-direction:column;gap:12px}
.osec+.osec{border-top:1px solid var(--border);padding-top:20px}
.shx .osec{gap:11px}.shx .osec+.osec{padding-top:18px}
.osec>h3{margin:0;font:400 10px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.oov{font-size:14.5px;line-height:1.7;color:var(--fg-body);text-wrap:pretty}
.shx .oov{font-size:13.5px;line-height:1.65}
.osub{display:flex;flex-direction:column;gap:9px}
.osub>h4{margin:0;font:600 13.5px 'IBM Plex Sans';color:var(--fg)}
.prm{display:flex;flex-direction:column;gap:18px}
.body{font-size:13.5px;line-height:1.6;color:var(--fg-body)}
.shx .body{font-size:13px}
/* the stages: a rail of three, labeled by position */
.stg{position:relative;display:flex;flex-direction:column;gap:12px}
.stg::before{content:"";position:absolute;left:3.5px;top:9px;bottom:9px;width:1px;background:var(--fg-faint);opacity:.55}
.stg .sr{display:grid;grid-template-columns:72px minmax(0,1fr);align-items:baseline}
.shx .stg .sr{grid-template-columns:66px minmax(0,1fr)}
.stg .ssl{display:flex;align-items:center;gap:10px;font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-body);position:relative;top:-1px}
.stg .ssl i{width:8px;height:8px;flex:none;transform:rotate(45deg);background:var(--fg-faint);box-shadow:0 0 0 3px var(--surface-raised);display:block}
.stg .sr.cl .sl i{background:var(--accent)}
.alt{display:flex;flex-direction:column;gap:7px;border:1px solid var(--border);background:var(--surface-sunken);border-radius:9px;padding:12px 14px;margin-top:4px}
.alt .ak{display:flex;align-items:center;gap:7px;font:500 9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-body)}
.alt .ak svg{color:var(--accent)}
.alt p{font-size:13px;line-height:1.55;color:var(--fg-body)}
.lnd{font-size:13px;line-height:1.55;color:var(--fg-body)}
.hands{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.shx .hands{grid-template-columns:1fr;gap:8px}
.hand{display:flex;flex-direction:column;gap:8px;border:1px solid var(--border);background:var(--surface-sunken);border-radius:9px;padding:12px 14px;min-width:0}
.hand .hk{font:500 9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-body)}
.hand .hl{display:grid;grid-template-columns:14px minmax(0,1fr);align-items:baseline;font-size:13px;line-height:1.55;color:var(--fg-body)}
.hand .hl>span:first-child{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.tips{display:flex;flex-direction:column;gap:10px}
.tips>p{border-left:1px solid var(--border-strong);padding-left:12px}
.kcs{border:1px solid var(--border);border-radius:10px;overflow:hidden}
.kc{display:grid;grid-template-columns:210px 1fr;gap:16px;align-items:baseline;padding:10px 14px;border-bottom:1px solid var(--border)}
.kc:last-child{border-bottom:0}
.shx .kc{display:flex;flex-direction:column;gap:3px;padding:10px 13px}
.kc .kn{font-size:13px}
.kc .kj{font-size:13px;line-height:1.5;color:var(--fg-muted)}
.wk{display:flex;flex-direction:column;gap:10px}
.wk p{display:grid;grid-template-columns:14px minmax(0,1fr);align-items:baseline}
.wk p i{width:5px;height:5px;transform:rotate(45deg);background:var(--fg-faint);display:block;margin-top:2px}
.was{font:10.5px/1.6 'IBM Plex Mono';color:var(--fg-faint)}
.was s{color:var(--fg-muted)}
.new2{outline:1.5px dashed rgba(207,135,69,.75);outline-offset:5px;border-radius:6px}
/* ---------- item 2: why these cards ---------- */
.vf2{position:absolute;left:0;right:0;bottom:0;height:110px;background:linear-gradient(to bottom,rgba(20,17,14,0),var(--bg) 78%);z-index:6;pointer-events:none}
.vf2::after{content:"scrolls on";position:absolute;left:0;right:0;bottom:14px;text-align:center;font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.owhy{display:flex;flex-direction:column;gap:8px;border-radius:10px;border:1px solid var(--border);background:var(--surface-rail);padding:12px 14px}
.owhy .k{font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.owhy p{font-size:13.5px;line-height:1.55;color:var(--fg);text-wrap:pretty}
.owhy.wait p{color:var(--fg-faint);font-size:12.5px;font-style:italic}
.sline{display:grid;grid-template-columns:14px minmax(0,1fr);align-items:baseline;font-size:12.5px;line-height:1.55;color:var(--fg-body);padding:0 2px 4px;text-wrap:pretty}
.sline>span:first-child{font:600 12px 'IBM Plex Mono'}
.sline.add>span:first-child{color:var(--accent)}
.sline.cut>span:first-child{color:var(--fg-faint)}
.sline.wait{color:var(--fg-faint);font-style:italic}
.sline .cn,.owhy .cn{font-weight:600}
"""

# ============================================================ item 1 data (iteration 3, from the samples)
CI = dict(
    deck="Counter Intelligence", aside="Counter Intelligence · written for the precon list",
    overview="[[Inspirit, Flagship Vessel]] leads a Jeskai artifact deck that stacks charge and +1/+1 counters on its artifacts, multiplies them by proliferating, and wins by growing huge artifact creatures or a counter-based finisher.",
    stages=["[[Etherium Sculptor]] cheapens artifacts, then [[Inspirit, Flagship Vessel]] adds counters to another artifact each combat around turn 3.",
            "[[Surge Conductor]] proliferates for each artifact entering, and [[Tekuthal, Inquiry Dominus]] makes every proliferate happen twice.",
            "[[Darksteel Reactor]] wins at twenty charge counters, and [[Lux Artillery]] deals 10 damage once thirty counters are out."],
    alternate="[[Kilo, Apogee Mind]] leads with haste and proliferates whenever it taps, so counters come from attacking.",
    land="4 lands fits a 40-land deck with 11 spells costing five or more.",
    keep=["[[Thought Monitor]] with a few artifacts makes a cheap start."],
    send=["[[Coretapper]] with no other artifact leaves counters nowhere to go."],
    tips=["[[Deepglow Skate]] doubles counters on your artifacts, and [[Resourceful Defense]] moves them onward when a counter-holder leaves.",
          "[[Cyberdrive Awakener]] turns noncreature artifacts into attackers, and [[Alibou, Ancient Witness]] hits for each tapped artifact."],
    keys=[("Steel Overseer", "Adds +1/+1 counters to every artifact creature."), ("Insight Engine", "Draws more each activation as counters grow."),
          ("Kappa Cannoneer", "Grows and evades with each artifact entering."), ("Threefold Thunderhulk", "Makes Gnome tokens that carry counters."),
          ("Empowered Autogenerator", "Adds more mana as charge counters grow."), ("Thrummingbird", "Proliferates when it connects in the air."),
          ("Karn's Bastion", "Land that proliferates late.")],
    weak=["Moderate: An artifact-heavy deck loses its engine to [[Vandalblast]] or [[Collector Ouphe]] before Inspirit reaches hexproof.",
          "Minor: Only 4 of 10 interaction pieces are instant speed, so a fast combo can resolve before sorcery-speed [[Fumigate]] acts.",
          "Minor: Several lands enter tapped, such as [[Mystic Monastery]], which slows curving artifacts into the commander."],
)
BR = dict(
    deck="HD - Brago", aside="HD - Brago · written 2 days ago",
    overview="[[Brago, King Eternal]] leads an Azorius blink deck that reuses enter-the-battlefield creatures for cards and tempo, then wins with flying attacks or by looping its blink pieces.",
    stages=["[[Azorius Signet]] and [[Mind Stone]] ramp toward [[Brago, King Eternal]] around turn 4, which blinks your permanents on combat damage.",
            "[[Mulldrifter]], [[Cloudblazer]] and [[Ephemerate]] reuse enter-the-battlefield draws to build a hand full of options.",
            "[[Deadeye Navigator]] with [[Peregrine Drake]] makes infinite blinking and mana for 2 mana; keep both safe."],
    alternate=None,
    land="4 lands suit a top-heavy curve where 20 nonland cards cost five or more.",
    keep=["[[Wall of Omens]] smooths an early hand and sets up blinks.", "[[Solemn Simulacrum]] fixes land and ramps toward the commander."],
    send=["[[Cloudshift]] with no creature to flicker does nothing."],
    tips=["[[Panharmonicon]] doubles the enter trigger of [[Whirler Rogue]], making four Thopters for one cast.",
          "[[Conjurer's Closet]] blinks [[Inspiring Overseer]] each end step, drawing another card and gaining life every turn."],
    keys=[("Soulherder", "Blinks a creature each end step."), ("Yorion, Sky Nomad", "Blinks many permanents for value on entry."),
          ("Teleportation Circle", "Blinks a creature each end step."), ("Skyclave Apparition", "Exiles a cheap opposing permanent on entry."),
          ("Reflector Mage", "Bounces an opposing creature on entry."), ("Lithoform Engine", "Copies triggered abilities for extra value.")],
    weak=["Moderate: Only 4 of its 17 interaction pieces are instant speed, so a fast combo can resolve before [[Swan Song]] or [[Silence]] is ready.",
          "Minor: Wins lean on flying combat or a few loop pieces, so [[Ghostly Prison]] or a wipe that clears fliers slows it.",
          "Minor: The backup loop hinges on [[Peregrine Drake]], so removal or a counterspell in response breaks it."],
)
LABELS = ["Early", "Mid", "Close"]


def stages(d, new=True):
    rows = "".join(f'<div class="sr{" cl" if i == 2 else ""}"><span class="ssl"><i></i>{LABELS[i]}</span><span class="body">{mk(t)}</span></div>'
                   for i, t in enumerate(d["stages"]))
    return f'<div class="stg{" new2" if new else ""}">{rows}</div>'


def alt(d):
    if not d["alternate"]:
        return ""
    return (f'<div class="alt new2"><span class="ak">{CROWN}Alternate commander</span><p>{mk(d["alternate"])}</p></div>')


def hands(d):
    def h(lab, g, lines):
        return (f'<div class="hand"><span class="hk">{lab}</span>'
                + "".join(f'<div class="hl"><span>{g}</span><span>{mk(x)}</span></div>' for x in lines) + '</div>')
    return f'<div class="hands">{h("Keep", "+", d["keep"])}{h("Send back", "−", d["send"])}</div>'


def sections(d):
    keys = "".join(f'<div class="kc"><span class="kn"><span class="cn">{n}</span></span><span class="kj">{j}</span></div>' for n, j in d["keys"])
    weak = "".join(f'<p class="body"><i></i><span>{mk(w)}</span></p>' for w in d["weak"])
    tips = "".join(f'<p class="body">{mk(t)}</p>' for t in d["tips"])
    return (f'<section class="osec"><h3>Overview</h3><p class="oov">{mk(d["overview"])}</p></section>'
            '<section class="osec"><h3>Primer</h3><div class="prm">'
            f'<div class="osub"><h4 class="new2" style="align-self:flex-start;outline-offset:3px">Game plan</h4>{stages(d)}{alt(d)}</div>'
            f'<div class="osub"><h4>Mulligan</h4><p class="lnd new2">{d["land"]}</p>{hands(d)}</div>'
            f'<div class="osub"><h4>Key tips</h4><div class="tips">{tips}</div></div>'
            '</div></section>'
            f'<section class="osec"><h3>Key cards</h3><div class="kcs">{keys}</div></section>'
            f'<section class="osec"><h3>Weaknesses</h3><div class="wk">{weak}</div></section>')


def modal(d):
    return (f'<div class="omo"><div class="mh"><h2>Overview</h2><span class="as">{d["aside"]}</span><span class="x">×</span></div>'
            f'<div class="mb">{sections(d)}</div></div>')


def sheet(d):
    return (f'<div class="ph shp"><div class="dim">{P.ph_top()}</div>'
            f'<div class="shx"><div class="mh"><h2>Overview</h2><span class="x">×</span></div>'
            f'<div class="mb"><span class="asl">{d["aside"]}</span>{sections(d)}</div></div></div>')


def board_overview():
    a = frames(frame("<b>1300</b> · a precon with an alternate commander · Counter Intelligence", f'<div class="scrimw">{modal(CI)}</div>',
                     "Opened from the precon page’s <b>View full overview →</b> (the shipped <code>PreconSynopsisModal</code>). The body is drawn whole; the modal scrolls it at 85dvh as shipped."),
               frame("<b>1300</b> · a player’s own deck · HD - Brago", f'<div class="scrimw">{modal(BR)}</div>',
                     "Opened from the Analysis tab. No alternate line: Game plan ends at Close and Mulligan follows. Nothing is left empty and nothing says it’s missing."),
               gap=40)
    b = frames(frame("<b>390</b> · Counter Intelligence, scrolled whole", sheet(CI),
                     "The phone sheet from 52px down, the 43px header, the aside opening the body, as shipped."),
               frame("<b>390</b> · HD - Brago, scrolled whole", sheet(BR),
                     "The same sections without the alternate box."),
               gap=40)
    calls = tbl([
        ("1", "Game plan", "Replaces Core strategy’s numbered list. Three rows labeled by position: <b>Early</b>, <b>Mid</b>, <b>Close</b> in the mono label the modal already uses, "
              "on a rail of three diamonds (the Weaknesses diamond, 8px), Close’s in accent as the end of the plan. Label column 72px on desktop, 66px on a phone; the line beside it, 13.5/13px body as today. "
              "The label comes from the row’s position (<code>STAGE_LABELS</code>), never from the model."),
        ("2", "Alternate commander (precon only)", "Directly under Close, inside Game plan: a sunken box like the Keep and Send back boxes, the Commanders crown and <b>Alternate commander</b> as its label, then the line. "
              "It answers “what if I lead with the other one”, so it sits with the plan, not in Mulligan or Key cards. Absent for a player’s deck and for a precon whose box has none: the section just ends at Close."),
        ("3", "The land line", "One line under the Mulligan heading, above the two boxes, in plain body text. It replaces the fixed range the app drew as the first row of each box "
              "(<i>2 to 4 lands</i> / <i>0 to 1, or 5 or more</i>), so the boxes now hold only their own 1 to 2 lines."),
        ("4", "Key tips and Key cards", "Where they are today. Key tips stays after Mulligan with its left rule, now exactly 2. Key cards keeps its section and rows (5 to 8, name over job on a phone, 210px name column from md); "
              "none repeats a stage card, so the list reads shorter but looks the same."),
        ("5", "Unchanged", "Overview paragraph, the Analysis tab and precon page entry (<code>View full overview →</code>), Weaknesses, Based on lines, the refused slot (a refused Primer keeps its label and draws the slot, as today), the stale banner and the version modal."),
        ("6", "Copy (drafts)", "<i>Game plan</i> · <i>Early</i> · <i>Mid</i> · <i>Close</i> · <i>Alternate commander</i>. For /copy-review."),
    ])
    body = (head("overview iteration 3 · item 1", "Overview: the stages and the alternate commander",
                 "The shipped Overview modal (<code>SynopsisSections</code>, 700 wide; the phone sheet) with iteration 3’s Primer. The text is the eval samples’ new side, verbatim: "
                 "Counter Intelligence (a precon whose box carries Kilo, Apogee Mind) and HD - Brago (a player’s own deck). Dashed orange outlines mark what is new; everything else is shipped.")
            + sec("A · Desktop", "One modal for both. The precon’s carries one more box under Close; the player’s deck reads complete without it.", a)
            + sec("B · Phone", "The same sections in the shipped sheet. The rail and labels hold at 390; the Keep and Send back boxes stack, as shipped.", b)
            + '<div class="sec"><h3>The calls</h3>' + calls + '</div>')
    return doc("Overview stages", body, 700 * 2 + 80 * 2 + 40 + 112)


# ============================================================ item 2
ADDS = [tuple(a) for a in S.ADDS[:15]]
CUTS = [tuple(c) for c in S.CUTS[:15]]
K = lambda xs: [x[0] for x in xs]  # noqa: E731
WHY = {
    "lead": "Most of these trade legends that never attack for cheap removal and more ways to grow the team, as you asked.",
    "add": "Five are answers at one or two mana, like [[Swords to Plowshares]]; five put counters on the team, like [[Avabruck Caretaker]]; three keep cards coming.",
    "cut": "Six are the legends you asked about, like [[Ghoulcaller Gisa]]; most of the rest pay off on a creature type the deck barely runs, like [[Bloodline Keeper]].",
}
STATE = {"why": None, "wait": False}

_side_head = S.side_head


def side_head(side, total, n, picked, ph=False, capn=None):
    h = _side_head(side, total, n, picked, ph, capn)
    if not STATE["why"]:
        return h
    g = "+" if side == "add" else "−"
    if STATE["wait"]:
        return h + f'<div class="sline {side} wait new2"><span>{g}</span><span>Said once both lists are in.</span></div>'
    return h + f'<div class="sline {side} new2"><span>{g}</span><span>{mk(WHY[side])}</span></div>'


S.side_head = side_head


def why_block(wait=False):
    if wait:
        return ('<div class="owhy wait new2"><span class="k">Why these cards</span><p>Written once both lists are in. Pick while you wait.</p></div>')
    return f'<div class="owhy new2"><span class="k">Why these cards</span><p>{mk(WHY["lead"])}</p></div>'


def with_why(panel, wait=False):
    anchor = next(a for a in ('<div class="gsw">', '<div class="seg2">', '<div class="cols">') if a in panel)
    i = panel.find(anchor)
    return panel[:i] + why_block(wait) + panel[i:]


def board_why():
    n = 10
    STATE.update(why=True, wait=False)
    pa, pc = K(ADDS[:4]), K(CUTS[:3])
    rd = S.results(False, n, ADDS, CUTS, pa=pa, pc=pc, grouped="type")
    rp = S.results(True, n, ADDS, CUTS, pa=pa, pc=pc, grouped="type", tab="add")
    rpc = S.results(True, n, ADDS, CUTS, pa=pa, pc=pc, grouped="type", tab="cut")
    a = frames(frame("<b>1300</b> · results, N = 10: 15 to add, 15 to cut", dk_vp(with_why(rd), 1240),
                     "The lead goes in one box above the lists, after the read line. Each side’s line opens its own list, under its count."))
    b = frames(frame("<b>390</b> · Additions", ph_scrolled(with_why(rp), 300),
                     "Scrolled to the results. The box stays above the switch; the list’s own line follows the tab. On a phone the box costs about 110px over the shipped results."),
               frame("<b>390</b> · Cuts", ph_scrolled(with_why(rpc), 300),
                     "Switching tabs changes only the side line; the box above doesn’t move."),
               gap=40)
    # the stream: slots held while rows arrive
    STATE.update(wait=True)
    adds_in = ADDS[:9]
    cuts_in = CUTS[:4]
    sd = S.stream(False, "0:38", n, adds_in, cuts_in, pa=K(ADDS[:2]), pc=(), adds_done=True, cuts_done=False,
                  new_cuts=K(CUTS[3:4]))
    sd = sd.replace('<div class="lch">', '<div class="lch">', 2)
    sd = _stream_lines(sd)
    sp = _stream_lines(S.stream(True, "0:38", n, adds_in, cuts_in, pa=K(ADDS[:2]), pc=(), adds_done=True, cuts_done=False, new_cuts=K(CUTS[3:4])))
    c = (frames(frame("<b>1300</b> · while the run streams in: additions done, cuts arriving", dk_vp(with_why(sd, wait=True), 1000),
                      "The box and both side lines hold their place from the first row, so nothing lands above a list the player is already picking from. They fill when the cuts finish."))
         + frames(frame("<b>390</b> · while it streams", ph_scrolled(with_why(sp, wait=True), 300),
                        "The same held slots at 390.")))
    STATE.update(why=None, wait=False)
    small = S.results(True, 3, [tuple(x) for x in S.ADDS[:5]], [tuple(x) for x in S.CUTS[:5]], pa=K(S.ADDS[:1]), pc=(), req=S.REQ3)
    d = frames(frame("<b>390</b> · N = 3: no box, as shipped", si4.vp_ph(small, 844),
                     "Five a side, and every card’s own line is in view. Under 6 the results are exactly as shipped."))
    calls = tbl([
        ("1", "When it shows", "<b>From N = 6</b> (12 or more changes; about 9 a side to read). Under that the per-card lines are short enough to read whole. One constant, so engineering can move it; "
              "your 20-change example is N = 10."),
        ("2", "Where", "One box, <b>Why these cards</b>, after the You asked box, the lead and the read line, above the lists (desktop) or above the Additions and Cuts switch (phone): the shipped You asked box’s look "
              "(<code>--surface-rail</code>, 10px radius, mono label). Then one line at the top of each list, under its count, saying what that side’s cards have in common."),
        ("3", "What it says", "Three lines, each naming at most two cards as card links (the shipped <code>CardName</code>): <b>the lead</b> (≤ 120 characters): what the set does for the request as a whole; "
              "<b>the additions line</b> and <b>the cuts line</b> (≤ 160 each): the groups inside that side, with a count each. No per-card reasons: the rows keep those."),
        ("4", "While it streams", "The box and both side lines hold their place from the first row, with a faint line saying when they fill (<i>Written once both lists are in.</i>), so the lists never move under a pick. "
              "They fill together when the cuts finish, with the run’s other end-of-run changes."),
        ("5", "History", "Stored with the run and shown the same way when a past run opens from History. A run written before this has none and draws no box."),
        ("6", "Engineering", "Written in the cuts call (it already sees the additions), as <code>why: { lead, add, cut }</code> on the stored report; each line runs the run’s own checks "
              "(names in the list or the offer, counts that match the rows). A line that fails is left out, not retried; if the lead fails, the box isn’t drawn."),
        ("7", "Copy (drafts)", "<i>Why these cards</i> · <i>Written once both lists are in. Pick while you wait.</i> · <i>Said once both lists are in.</i> For /copy-review."),
    ])
    body = (head("suggested changes v2 · item 2", "Suggested changes: why these cards",
                 "On a larger run, a short read of the whole set above the results, so the reasoning isn’t lost across 20 or more per-card lines. "
                 "Drawn over the shipped results (<code>suggested-changes-run.tsx</code>). Fixture: HD - Half Shell at 99, N = 10, the v2 request "
                 "<i>More removal, and lean into the counters. Cut the legends that never attack.</i> Dashed orange outlines mark what is new.")
            + sec("A · Desktop", "The box above both lists; each list opens with its own line.", a)
            + sec("B · Phone", "The box above the switch, and the side line at the top of the list you’re on.", b)
            + sec("C · While the run streams", "Held slots, so nothing arrives above a list the player is picking from.", c)
            + sec("D · Small runs", "Below N = 6, unchanged.", d)
            + '<div class="sec"><h3>The calls</h3>' + calls + '</div>')
    return doc("Why these cards", body, 1300 + 112)


def ph_scrolled(panel, up, h=844):
    f = si4.vp_ph(panel, h)
    return f.replace('<div class="at">', f'<div class="at" style="margin-top:-{up}px">', 1).replace('<div class="mhd">', '<div class="mhd" style="position:relative;z-index:4">', 1).replace('<div class="scut">', '<div class="scut" style="display:none">', 1)


def dk_vp(panel, h):
    f = si4.tool_dk(panel, h)
    return f[:-6] + '<div class="vf2"></div></div>'


def _stream_lines(html):
    """stream() draws its own side heads; give each its held line."""
    out, start = [], 0
    for side in ("add", "cut"):
        i = html.find('<div class="lch">', start)
        if i < 0:
            break
        j = html.find("</span></div>", i) + len("</span></div>")
        g = "+" if side == "add" else "−"
        out.append(html[start:j] + f'<div class="sline {side} wait new2"><span>{g}</span><span>Said once both lists are in.</span></div>')
        start = j
    out.append(html[start:])
    return "".join(out)


# ============================================================ main
def board_main():
    rows = tbl([
        ("1", "Overview: stages and the alternate commander", "<b>Game plan</b> replaces Core strategy: three rows labeled <b>Early</b>, <b>Mid</b>, <b>Close</b> on a rail of three diamonds. "
              "A precon whose box carries another commander gets one <b>Alternate commander</b> box under Close; a player’s deck (and a precon without one) simply ends at Close. "
              "The <b>land line</b> sits under Mulligan above the Keep and Send back boxes, replacing the fixed range. Key tips (now 2) and Key cards stay where they are. Board <b>Overview-Stages</b>."),
        ("2", "Suggested changes: why these cards", "From <b>N = 6</b> (12+ changes): a <b>Why these cards</b> box above the lists with one lead sentence, and one line at the top of each list saying what that side’s cards share. "
              "The slots are held while the run streams so nothing moves under a pick; they fill when the cuts finish. Stored with the run for History. Board <b>Why-These</b>."),
    ])
    body = (head("overview i3 + suggested changes · account 2 · 2026-10-30", "Overview stages and why these cards",
                 "Two small items, each drawn over the shipped surface it changes, at 390 and 1300. Item 1 is the display for the approved iteration-3 Overview text (brief: "
                 "<code>docs/superpowers/design-briefs/2026-10-29-overview-iteration-3-renderer.md</code>, PR #2397). Item 2 adds a short overview to Suggested changes v2’s results. "
                 "Dashed orange outlines mark what is new. Strings marked as drafts are for /copy-review.")
            + '<div class="sec"><h3>The calls</h3>' + rows + '</div>')
    return doc("Overview stages and why these cards · main", body, 1300)


BOARDS = [
    ("Main", board_main, "Overview stages and why these cards · the calls"),
    ("Overview-Stages", board_overview, "1 · Overview: stages and the alternate commander"),
    ("Why-These", board_why, "2 · Suggested changes: why these cards"),
]

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "local"
    kit.MODE["blob"] = mode == "blob"
    if mode == "blob":
        kit.BLOB.update(json.load(open("blobs_ov.json")))
    out = "out4" if mode == "local" else "canvas"
    os.makedirs(out, exist_ok=True)
    if mode == "local":
        shutil.copytree("art", f"{out}/art", dirs_exist_ok=True)
        shutil.copy("support.js", f"{out}/support.js")
    for nm, fn, _ in BOARDS:
        open(f"{out}/{nm}.dc.html", "w").write(fn())
        print("wrote", nm)
