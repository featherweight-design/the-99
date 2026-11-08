
# ================================================================ R3 (Hugh's R2 notes, 2026-11-08)
# Popular commanders (EDHREC, Nov 2026): Jace, Multiverse Architect leads; Ashling, the Limitless is the demo deck.
kit.CSS += r"""
/* R3 hero, phone: two cards fill the space beside the headline */
.hw3{position:relative}
.p .hw3 .h1{max-width:262px}
.hside{position:absolute;right:-4px;top:30px;width:118px;height:190px;pointer-events:none}
.hside .card{position:absolute;width:80px;border-radius:5px;overflow:hidden;box-shadow:0 10px 24px rgba(0,0,0,.5)}
.hside .card img{width:100%;display:block}
.hside .s1{right:6px;top:0;transform:rotate(9deg);z-index:2}
.hside .s2{right:40px;top:34px;transform:rotate(-7deg);z-index:1}
.p .hshot2 .card{display:none}
.p .hshot2{height:500px}
.p .hshot2 .pc{left:45px;transform:rotate(0)}
/* R3 the loop: one Free line for all four */
.freeline{display:flex;align-items:center;gap:10px;margin-top:12px;font-size:14px;color:var(--fg-body)}
.lc.alt{position:relative}
.lc .tagtr{position:absolute;top:14px;right:14px}
.d .lc .tagtr{top:18px;right:18px}
/* R3 the value block: icons and the three-times picture */
.vic{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex:none;
     border:1px solid color-mix(in oklab,var(--accent) 55%,var(--border-strong));background:color-mix(in oklab,var(--accent) 12%,transparent);color:var(--accent-text)}
.vplus .vic{width:38px;height:38px;border-radius:10px;color:var(--fg);border-color:var(--border-strong);background:var(--surface-inset)}
.vbig,.vplus{align-items:center}
.val3{grid-template-columns:auto auto 1fr}
.d .val.val3{grid-template-columns:auto auto minmax(0,1fr);grid-template-rows:auto auto;row-gap:24px}
.d .val3 .vtxt{grid-column:3}
.d .val3 .x3{grid-column:1/4}
.x3{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;border-top:1px solid var(--border);padding-top:16px}
.x3 .g{display:flex;flex-direction:column;align-items:center;gap:7px;text-align:center}
.x3 .dd{display:flex;gap:4px}
.x3 .dd i{width:8px;height:8px;transform:rotate(45deg);background:var(--accent);display:block}
.x3 .ti{width:34px;height:34px;border-radius:9px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;color:var(--fg-muted);background:var(--surface-inset)}
.x3 span{font:500 10.5px/1.3 'IBM Plex Sans';color:var(--fg-muted)}
.d .x3 span{font-size:12px}
.x3c{font:500 10px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint);text-align:center;margin-bottom:-6px}
.d .x3c{grid-column:1/4}
/* R3 tooltips with a picture of the result */
.tip3{width:330px;padding:0;overflow:hidden}
.tip3 .tt{padding:12px 14px 10px}
.tip3 .pv{border-top:1px solid var(--border);background:var(--surface-inset);padding:10px 12px 12px;display:flex;flex-direction:column;gap:7px;position:relative}
.tip3 .pv .lb{font:500 9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.tip3 .pv .sw2{position:absolute;right:10px;top:9px}
.mini{font-size:11.5px;line-height:1.45;color:var(--fg-body)}
.mini b{color:var(--fg);font-weight:600}
.mini .stg{display:grid;grid-template-columns:44px 1fr;gap:3px 8px}
.mini .stg em{font:500 9px 'IBM Plex Mono';font-style:normal;text-transform:uppercase;letter-spacing:.08em;color:var(--accent-text);padding-top:2px}
.mini .sr{display:grid;grid-template-columns:14px auto 1fr;gap:6px;align-items:baseline;padding:3px 0;border-top:1px solid var(--border)}
.mini .sr:first-child{border-top:0}
.mini .sr .sg{font:600 12px 'IBM Plex Mono'}
.mini .sr .sg.in{color:var(--success)}.mini .sr .sg.out{color:#C46857}
.mini .sr span:last-child{color:var(--fg-muted)}
.mini .hr3{display:grid;grid-template-columns:14px 40px 1fr auto;gap:8px;align-items:center;padding:3px 0}
.mini .hr3 em{font-style:normal;color:var(--accent-text);font-weight:600}
.mini .hr3 img{width:40px;height:28px;object-fit:cover;border-radius:4px}
.mini .hr3 .f{font:600 12px 'IBM Plex Mono';color:var(--fg)}
.mini .wd3{display:grid;grid-template-columns:44px 1fr;gap:10px;align-items:start}
.mini .wd3 img{width:44px;border-radius:4%}
.tipspec{display:flex;flex-direction:column;gap:10px;width:330px}
.tipspec .tip{position:static}
.tipspec .anc{display:flex;align-items:center;gap:6px;font-size:14px;color:var(--fg-body)}
.tipspec .anc .inf{color:var(--accent-text)}
/* R3 motion: subtle, once, and never for reduced-motion readers */
@media (prefers-reduced-motion: no-preference){
  .lp .hside .s1{animation:fl1 6s ease-in-out infinite}
  .lp .hside .s2{animation:fl2 7s ease-in-out infinite}
  .lp .hshot2 .k1{animation:fl1 6.5s ease-in-out infinite}
  .lp .hshot2 .k2{animation:fl2 7.5s ease-in-out infinite}
  .lp .hshot2 .k3{animation:fl1 8s ease-in-out infinite}
  .mo .rise{animation:rise 3.2s ease-out infinite}
  .mo .rise:nth-child(2){animation-delay:.08s}.mo .rise:nth-child(3){animation-delay:.16s}.mo .rise:nth-child(4){animation-delay:.24s}
  .mo .cnt15::after{animation:cnt 3.2s ease-out infinite}
  .mo .lit i{animation:lit 3.2s ease-out infinite}
  .mo .fill i{animation:fill 3.2s ease-out infinite}
  .mo .sun{animation:sun 3.2s ease-out infinite}
}
@keyframes fl1{0%,100%{translate:0 0}50%{translate:0 -5px}}
@keyframes fl2{0%,100%{translate:0 0}50%{translate:0 4px}}
@keyframes rise{0%{opacity:0;translate:0 12px}14%,100%{opacity:1;translate:0 0}}
@property --n{syntax:'<integer>';initial-value:15;inherits:false}
.cnt15{font:600 52px/1 'IBM Plex Mono';color:var(--accent-text)}
.cnt15::after{counter-reset:n var(--n);content:counter(n)}
@keyframes cnt{0%{--n:0}25%,100%{--n:15}}
@keyframes lit{0%{opacity:.15}30%,100%{opacity:1}}
@keyframes fill{0%{width:0}30%,100%{}}
@keyframes sun{0%,100%{box-shadow:0 0 0 0 transparent}30%{box-shadow:0 0 0 8px color-mix(in oklab,var(--accent) 22%,transparent)}60%{box-shadow:0 0 0 0 transparent}}
.mo{display:flex;flex-direction:column;gap:12px;border:1px solid var(--border);border-radius:14px;background:var(--surface-inset);padding:18px;width:330px;color:var(--fg);font-family:'IBM Plex Sans',sans-serif}
.mo h4{margin:0;font:600 14px 'IBM Plex Sans'}
.mo p{margin:0;font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
.mo .stage{height:150px;border-radius:10px;background:var(--bg);border:1px solid var(--border-strong);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:10px}
.mo .spec{font:500 10px 'IBM Plex Mono';color:var(--fg-faint);letter-spacing:.04em}
"""

ICO = {
    "gift": '<path d="M3 9h14v8.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M2 6h16v3H2z"/><path d="M10 6v12.5"/><path d="M10 6C8.6 3 5.4 2.6 5 4.4 4.6 6 7.6 6 10 6zM10 6c1.4-3 4.6-3.4 5-1.6C15.4 6 12.4 6 10 6z"/>',
    "sun": '<circle cx="10" cy="10" r="3.4"/><path d="M10 2.2v2M10 15.8v2M2.2 10h2M15.8 10h2M4.5 4.5l1.4 1.4M14.1 14.1l1.4 1.4M4.5 15.5l1.4-1.4M14.1 5.9l1.4-1.4"/>',
    "overview": '<rect x="4" y="2.5" width="12" height="15" rx="1.5"/><path d="M7 6.5h6M7 9.5h6M7 12.5h4"/>',
    "changes": '<path d="M3 7h12l-3-3M17 13H5l3 3"/>',
    "deeper": '<circle cx="8.5" cy="8.5" r="5"/><path d="m12.3 12.3 4.5 4.5"/>',
    "choose": '<circle cx="10" cy="10" r="7.2"/><path d="m12.8 7.2-1.8 4.6-4.6 1.8 1.8-4.6z"/>',
    "which": '<rect x="2.5" y="4" width="8" height="11.5" rx="1.2"/><path d="M13 6.5h4.5M13 10h4.5M13 13.5h3"/>',
}
TOOLS = [("overview", "Overview", "Overview of a deck"), ("changes", "Changes", "Suggested changes"), ("deeper", "Cuts", "Look deeper in Proposed cuts"),
         ("choose", "Choose", "Help me choose with “Anything else?”"), ("which", "Which deck", "Which deck needs it most?")]


def hero(d, state="entry", open_=False, theme_on=0, theme="amonkhet", value="", head="A"):
    H = HEADLINES[head]
    kick = (f'<div class="hk2">{H["kick"]}</div>' if head != "B" else f'<div class="hk">{H["kick"]}</div>')
    side = ("" if d else f'<div class="hside" aria-hidden="true"><span class="card s2"><img src="{img("c-ashling.jpg")}" alt=""></span>'
            f'<span class="card s1"><img src="{img("c-jace.jpg")}" alt=""></span></div>')
    words = (f'<div class="hw3">{side}{kick}<h1 class="h1 disp">{H["h1"]}</h1><p class="hs">{COPY["sub"]}</p>'
             f'{launch(state, d, open_, value)}'
             + (theme_switch(theme_on, d) if d else "") + '</div>')
    shot = hero_shot2(d, theme) + ("" if d else theme_switch(theme_on, d))
    return f'<section class="hero">{words}{"<div>" + shot + "</div>" if d else shot}</section>'


def hero_shot2(d, theme="amonkhet"):
    return (f'<div class="hshot2"><span class="card k2"><img src="{img("c-ashling.jpg")}" alt=""></span>'
            f'<span class="card k3"><img src="{img("c-giada.jpg")}" alt=""></span>'
            f'<div class="pc">{A.hero_phone()}</div>'
            f'<span class="card k1"><img src="{img("c-jace.jpg")}" alt="Jace, Multiverse Architect"></span></div>')


def loop(d, chips="line"):
    items = ""
    for k, t, p, ul in LOOP2:
        tr = f'<span class="tagtr">{FREE}</span>' if chips == "corner" else ""
        items += (f'<div class="lc{" alt" if chips == "corner" else ""}">{tr}<span class="ic">{ico(ICON[k], 22, 1.5)}</span><div class="hd"><h3>{t}</h3></div><p>{p}</p>'
                  f'<ul>' + "".join(f"<li>{x}</li>" for x in ul) + '</ul></div>')
    line = f'<p class="freeline">{FREE}<span>All four are free, always. No credits, no limits.</span></p>' if chips == "line" else ""
    return (f'<section class="sec"><p class="sk">How it works</p><h2 class="st disp">From your binder to a finished deck</h2>{line}'
            f'<div class="loop2">{items}</div></section>')


def x3():
    g = "".join(f'<div class="g"><span class="dd lit"><i></i><i></i><i></i></span><span class="ti">{ico(ICO[k], 18, 1.5)}</span><span>{n}</span></div>' for k, n, _ in TOOLS)
    return f'<p class="x3c">15 credits = each writing tool, three times</p><div class="x3">{g}</div>'


def value(d):
    return ('<div class="val val3">'
            f'<div class="vbig"><span class="vic">{ico(ICO["gift"], 24, 1.5)}</span><b>15</b><span>welcome credits<small>when you join, for 30 days</small></span></div>'
            f'<div class="vplus"><span class="vic sun">{ico(ICO["sun"], 20, 1.5)}</span><b>+1</b><span>free credit every day<small>for as long as you’re a member</small></span></div>'
            '<p class="vtxt">That’s enough to run <b>every writing tool three times</b> before you spend a thing. Try them on your own decks, '
            'then decide. Keep going with a pack or the monthly plan. <span class="lnk2">What credits cost</span></p>'
            f'{x3()}</div>')


def preview(x):
    if x == "Overview of a deck":
        body = ('<div class="mini"><b>Ashling, the Limitless</b> leads a mono-red elemental deck: evoke, sacrifice, take a hasty copy back.</div>'
                '<div class="mini"><div class="stg"><em>Early</em><span>Rocks set up evoke by turn two.</span><em>Mid</em><span>Each sacrifice is a second cast.</span>'
                '<em>Close</em><span>Jeska’s Will ends it.</span></div></div>')
    elif x == "Suggested changes":
        body = ('<div class="mini" style="color:var(--fg-muted)">“More interaction.”</div><div class="mini">'
                '<div class="sr"><span class="sg in">+</span><b>Chaos Warp</b><span>removes anything</span></div>'
                '<div class="sr"><span class="sg in">+</span><b>Abrade</b><span>an instant answer</span></div>'
                '<div class="sr"><span class="sg out">−</span><b>Smokebraider</b><span>the curve is low without it</span></div></div>')
    elif x == "Look deeper in Proposed cuts":
        body = ('<div class="mini" style="color:var(--fg-muted)">3 over 99</div><div class="mini">'
                '<div class="sr"><span class="sg out">−</span><b>Inferno Titan</b><span>weakest six-drop</span></div>'
                '<div class="sr"><span class="sg out">−</span><b>Mind Stone</b><span>a rock too many</span></div>'
                '<div class="sr"><span class="sg out">−</span><b>Rolling Thunder</b><span>slow removal</span></div></div>')
    elif x.startswith("Help me choose"):
        rs = [("ashling", "Ashling", 92), ("jace", "Jace", 71), ("giada", "Giada", 64)]
        body = ('<div class="mini" style="color:var(--fg-muted)">“Something red and fast.”</div><div class="mini">' + "".join(
            f'<div class="hr3"><em>{i + 1}</em><img src="{img("a-" + k + ".jpg")}" alt=""><b>{n}</b><span class="f">{f}</span></div>' for i, (k, n, f) in enumerate(rs)) + '</div>')
    else:
        body = (f'<div class="mini"><div class="wd3"><img src="{img("c-swords.jpg")}" alt=""><span><b>Swords to Plowshares</b> → <b>Giada</b><br>'
                'White, and the deck has only three answers.</span></div></div>')
    return f'<div class="pv"><span class="lb">What you get</span><span class="sw2">STAND-IN WORDS</span>{body}</div>'


def tip3(x, style=""):
    return f'<span class="tip tip3" style="{style}"><span class="tt"><b>{x}</b>{TIPS[x]}</span>{preview(x)}</span>'


def free_vs(d, tip=None):
    f = "".join(f'<li><span>{x}</span><span class="r ck">{CHECK}</span></li>' for x in FREE_LIST)
    c = ""
    for x, y in CREDIT_LIST:
        on = tip == x
        st = "left:-4px;right:-4px;width:auto;top:calc(100% - 4px)" if not d else "left:-8px;top:calc(100% - 2px)"
        tp = tip3(x, st) if on else ""
        c += (f'<li style="position:relative"><span class="nmx">{x.rsplit(" ", 1)[0]} <span style="white-space:nowrap">{x.rsplit(" ", 1)[1]}<span class="inf{" on" if on else ""}" aria-label="What is {x}?">{INFO}</span></span></span>'
              f'<span class="r">{y}</span>{tp}</li>')
    return (f'<section class="sec"><p class="sk">Free and credits</p><h2 class="st disp">The core is free. Credits are for writing.</h2>'
            f'<p class="sl">Browsing is always free. Anything we write just for you uses a credit.</p>{value(d)}'
            f'<div class="fc"><div class="fcol"><h3>Free, always {FREE}</h3><p class="sub">No credits, no limits.</p><ul>{f}</ul></div>'
            f'<div class="fcol cr" style="overflow:visible"><h3>With credits {credit("1–2 per run")}</h3><p class="sub">Each run of a writing tool on your deck. Press ⓘ for what each one does.</p><ul>{c}</ul></div></div></section>')


def tip_specimens():
    out = ""
    for k, _, x in TOOLS:
        out += (f'<div class="tipspec"><span class="anc">{x}<span class="inf on">{INFO}</span></span>{tip3(x)}</div>')
    return out


def demo_start(d):
    fan = (f'<div class="fanc"><span class="c c1"><img src="{img("c-giada.jpg")}" alt=""></span>'
           f'<span class="c c2"><img src="{img("c-ashling.jpg")}" alt=""></span><span class="c c3"><img src="{img("c-jace.jpg")}" alt=""></span></div>')
    words = ('<div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">'
             '<h3 class="disp">Try it on Sam’s cards</h3>'
             '<p>Sam is a made-up player with a real-looking binder. Press through eight of the tools, the way you would with your own cards. '
             'Nothing you press is saved, and nothing costs a credit.</p>'
             '<div class="row"><span class="btn-l">Start</span></div></div>')
    return f'<div class="demo"><div class="dstart">{fan}{words}</div></div>'


def demo_end(d, skipped_at=None):
    sk = (f'<p style="font-size:13px;color:var(--fg-muted)">You skipped steps {skipped_at + 1} to {N2}. <u>Go back to step {skipped_at + 1}</u></p>' if skipped_at is not None else "")
    fan = (f'<div class="fanc"><span class="c c1"><img src="{img("c-giada.jpg")}" alt=""></span>'
           f'<span class="c c2"><img src="{img("c-jace.jpg")}" alt=""></span><span class="c c3"><img src="{img("c-ashling.jpg")}" alt=""></span></div>')
    words = (f'<div style="display:flex;flex-direction:column;gap:12px;align-items:stretch;flex:1;min-width:0">'
             '<h3 class="disp">That was Sam’s binder. Yours works the same.</h3>'
             '<p>Bring your cards in, and every commander and deck here is built from what you own.</p>'
             f'{sk}{launch("entry", d)}<div class="row"><span class="btn-q">Start over</span></div></div>')
    return f'<div class="demo"><div class="dtop"><span class="sn">The end</span>{bar2(N2 - 1)}</div><div class="dstart">{fan}{words}</div></div>'


STEPS2[0]["b"] = "Sam is made up, and so is the binder: 2,140 cards. Every tool from here reads these cards. Press any card to open it."
STEPS2[2]["b"] = "Sam asked for something red and fast. The 99 ranked the commanders that fit, owned or not."
STEPS2[3]["t"] = "A deck from what Sam owns"
STEPS2[3]["b"] = ("Built from Sam’s cards first. The marks say what to know at a glance: a proxy, a Game Changer, a tutor, "
                  "a card another deck already holds. Press one to see what it means.")


def written(d):
    cards = "".join(
        f'<div class="cmd"><div class="art"><img src="{img("a-" + k + ".jpg")}" alt=""><span class="nm">{A.CMD[k]["name"]}{A.pips(A.CMD[k]["c"])}</span></div>'
        f'<div class="bd"><span class="k">Why this commander</span><p>{A.CMD[k]["prose"]}</p><span class="go">Open its page {CHEV}</span></div></div>'
        for k in ("jace", "ashling"))
    ov = ('<div class="cmd ov"><div class="hd"><b>Mutant Menace</b><span>PRECON · OVERVIEW</span></div>'
          '<div class="bd"><p><span class="cn">The Wise Mothman</span> leads a Sultai counters deck built on radiation. Rad counters mill nonland cards, '
          'which grow creatures, make Zombie Mutant tokens and draw cards. Counter doublers and proliferate effects then inflate evasive attackers '
          'until combat damage finishes the game.</p>'
          f'<span class="go">Open the precon’s list {CHEV}</span></div></div>')
    return (f'<section class="sec"><p class="sk">Written for real</p><h2 class="st disp">A written read for 3,379 commanders</h2>'
            f'<p class="sl">Every commander page opens with why it’s worth building. Every precon has an Overview. Both are free to read.</p>'
            f'<div class="wr">{cards}{ov}</div></section>')


# ---- the motion specimens (board: Motion)
def motion_specimens():
    def spec(title, body, stage, sp):
        return f'<div class="mo"><h4>{title}</h4><div class="stage">{stage}</div><p>{body}</p><span class="spec">{sp}</span></div>'
    cards = (f'<div class="hside" style="position:relative;right:auto;top:auto;width:130px;height:130px"><span class="card s2"><img src="{img("c-ashling.jpg")}" alt=""></span>'
             f'<span class="card s1"><img src="{img("c-jace.jpg")}" alt=""></span></div>')
    rise = ('<div style="display:grid;grid-template-columns:repeat(2,64px);gap:8px">' + "".join(
        f'<span class="rise" style="width:64px;height:44px;border-radius:9px;border:1px solid var(--border-strong);background:var(--surface);display:flex;align-items:center;justify-content:center;color:var(--accent-text)">{ico(ICON[k], 18, 1.5)}</span>'
        for k in ("collection", "commanders", "decks", "cart")) + '</div>')
    count = (f'<span class="vic" style="width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;border:1px solid var(--accent);color:var(--accent-text)">{ico(ICO["gift"], 24, 1.5)}</span>'
             '<span class="cnt15"></span>')
    lit = ('<div class="x3" style="border:0;padding:0;width:280px">' + "".join(
        f'<div class="g"><span class="dd lit"><i style="animation-delay:{i * .12:.2f}s"></i><i style="animation-delay:{i * .12 + .04:.2f}s"></i><i style="animation-delay:{i * .12 + .08:.2f}s"></i></span>'
        f'<span class="ti">{ico(ICO[k], 18, 1.5)}</span></div>' for i, (k, _, _) in enumerate(TOOLS)) + '</div>')
    fill = ('<div style="width:240px;display:flex;flex-direction:column;gap:12px"><span class="fill" style="display:flex;height:6px;border-radius:3px;background:var(--surface);overflow:hidden">'
            '<i style="display:block;width:34%;background:#C05A3E"></i><i style="display:block;width:28%;background:#CF8745"></i><i style="display:block;width:16%;background:#DEAA29"></i></span>'
            '<span class="fill" style="display:flex;gap:3px">' + "".join('<i style="display:block;flex:1;height:4px;border-radius:2px;background:var(--accent)"></i>' for _ in range(3))
            + "".join('<i style="display:block;flex:1;height:4px;border-radius:2px;background:var(--border-strong);animation:none"></i>' for _ in range(5)) + '</span></div>')
    sun = f'<span class="vic sun" style="width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border-strong);color:var(--fg)">{ico(ICO["sun"], 22, 1.5)}</span>'
    return [
        spec("1 · The hero’s cards drift", "The two cards beside the headline (and the three around the phone on desktop) rise and settle a few pixels, out of step with each other. Always on, so slow it reads as breathing.", cards, "translate 0 → −5px · 6–8s ease-in-out · infinite"),
        spec("2 · Sections rise in", "Each section’s cards fade and rise once as they scroll into view, 80ms apart. Never again on scroll back.", rise, "opacity 0 → 1 · 12px → 0 · 450ms ease-out · stagger 80ms · once"),
        spec("3 · The welcome credits count up", "The 15 counts up from 0 the first time the block is on screen. The number is real text throughout, so a screen reader reads 15.", count, "0 → 15 · 800ms ease-out · once"),
        spec("4 · Three each, lit in turn", "The fifteen diamonds light three at a time under their tools, left to right, right after the count.", lit, "opacity .15 → 1 · 120ms per tool · once"),
        spec("5 · The daily credit glows", "The +1 sun gives one soft ring when the block arrives.", sun, "ring 0 → 8px → 0 · 900ms · once"),
        spec("6 · Bars fill", "Fit bars on the hero phone and in the demo, and the demo’s step bar, fill from the left as they arrive or as the step advances.", fill, "width 0 → value · 600ms ease-out · once per step"),
    ]
