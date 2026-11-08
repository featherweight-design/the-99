
# ================================================================ R2 (Hugh's feedback, 2026-11-08)
# No capture of a real account anywhere: every product screen is the dummy app (app.py) on the fixture.
import app as A

kit.CSS += r"""
/* R2: the launch panel, set apart from the page */
.launch{margin-top:24px;border:1px solid color-mix(in oklab,var(--accent) 55%,var(--border-strong));border-radius:16px;background:var(--surface-raised);padding:18px;box-shadow:0 14px 36px rgba(0,0,0,.35)}
.d .launch{padding:22px 24px}
.launch .lh{display:flex;align-items:center;gap:10px;font:600 16px 'IBM Plex Sans';color:var(--fg)}
.launch .lh i{width:8px;height:8px;transform:rotate(45deg);background:var(--accent);display:block;flex:none}
.launch .ll{margin-top:6px;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.launch .cta{margin-top:14px}
.launch .fine{margin-top:10px}
.launch .sent{margin-top:14px;background:var(--surface-inset)}
.closeband{background:var(--surface-sunken);border-top:1px solid var(--border-strong);border-bottom:1px solid var(--border-strong);padding:44px 20px 40px;text-align:center}
.d .closeband{padding:70px 90px 64px}
.closeband .launch{max-width:560px;margin-left:auto;margin-right:auto;text-align:left}
.hk2{font:italic 15px 'IBM Plex Sans';color:var(--accent-text)}
.d .hk2{font-size:17px}
/* R2 hero screen: drawn phone + fanned cards */
.hshot2{position:relative;margin:28px auto 0;width:340px;height:500px}
.d .hshot2{margin:0 0 0 auto;width:560px;height:560px}
.hshot2 .pc{position:absolute;width:236px;border-radius:26px;border:1px solid var(--border-strong);background:var(--bg);overflow:hidden;box-shadow:0 18px 44px rgba(0,0,0,.55);z-index:3;left:52px;top:0;height:490px;transform:rotate(-2deg)}
.d .hshot2 .pc{width:290px;height:560px;left:150px}
.hshot2 .pc .ap{zoom:.84}
.d .hshot2 .pc .ap{zoom:.92}
.hshot2 .card{position:absolute;width:118px;border-radius:6px;overflow:hidden;box-shadow:0 12px 28px rgba(0,0,0,.5)}
.hshot2 .card img{width:100%;display:block}
.d .hshot2 .card{width:160px}
.hshot2 .k1{right:0;top:70px;transform:rotate(9deg);z-index:4}
.hshot2 .k2{left:0;top:200px;transform:rotate(-11deg);z-index:2}
.hshot2 .k3{right:8px;top:300px;transform:rotate(4deg);z-index:2}
.d .hshot2 .k1{right:10px;top:60px}.d .hshot2 .k2{left:20px;top:200px}.d .hshot2 .k3{right:30px;top:330px}
/* R2 loop: icons and words */
.loop2{display:flex;flex-direction:column;gap:14px;margin-top:24px}
.d .loop2{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
.lc{border:1px solid var(--border);border-radius:14px;background:var(--surface-inset);padding:16px;display:grid;grid-template-columns:44px 1fr;gap:4px 14px;align-items:start}
.d .lc{display:flex;flex-direction:column;gap:10px;padding:20px}
.lc .ic{width:44px;height:44px;border-radius:12px;border:1px solid color-mix(in oklab,var(--accent) 50%,var(--border-strong));color:var(--accent-text);display:flex;align-items:center;justify-content:center;grid-row:1/4;background:color-mix(in oklab,var(--accent) 8%,transparent)}
.lc .hd{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.lc h3{margin:0;font:600 16px 'IBM Plex Sans';color:var(--fg)}
.lc p{font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.lc ul{margin:4px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px}
.lc li{font-size:12.5px;color:var(--fg-muted);display:flex;gap:7px;line-height:1.45}
.lc li::before{content:'';width:5px;height:5px;transform:rotate(45deg);background:var(--fg-faint);margin-top:6px;flex:none}
.lc .num{font:500 10px 'IBM Plex Mono';letter-spacing:.12em;color:var(--fg-faint)}
/* R2 export rows: a real chevron, centered */
.srow .go{display:flex;align-items:center;gap:6px;min-height:44px}
.srow .go svg{display:block;flex:none;color:var(--fg-muted)}
.srow.open .go svg{transform:rotate(180deg)}
.mox{margin-top:12px;border:1px solid var(--border-strong);border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.5;color:var(--fg-body);background:var(--surface-inset);display:flex;gap:9px}
.mox svg{flex:none;margin-top:2px;color:var(--fact)}
/* R2 the value block: welcome credits up front */
.val{margin-top:22px;border-radius:16px;border:1px solid color-mix(in oklab,var(--accent) 55%,var(--border-strong));background:radial-gradient(500px 220px at 0% 0%,color-mix(in oklab,var(--accent) 12%,transparent),transparent 70%),var(--surface-raised);padding:20px;display:flex;flex-direction:column;gap:16px}
.d .val{display:grid;grid-template-columns:auto auto 1fr;gap:34px;align-items:center;padding:26px 30px}
.vbig{display:flex;align-items:baseline;gap:10px}
.vbig b{font:600 52px/1 'IBM Plex Mono';color:var(--accent-text);letter-spacing:-.02em}
.vbig span{font:600 16px/1.3 'IBM Plex Sans';color:var(--fg)}
.vbig small{display:block;font:400 12.5px 'IBM Plex Sans';color:var(--fg-muted);margin-top:2px}
.vplus{display:flex;align-items:baseline;gap:10px;border-top:1px solid var(--border);padding-top:14px}
.d .vplus{border-top:0;padding-top:0;border-left:1px solid var(--border);padding-left:34px}
.vplus b{font:600 30px/1 'IBM Plex Mono';color:var(--fg)}
.vplus span{font:600 15px/1.3 'IBM Plex Sans';color:var(--fg)}
.vplus small{display:block;font:400 12.5px 'IBM Plex Sans';color:var(--fg-muted);margin-top:2px}
.vtxt{font-size:14.5px;line-height:1.6;color:var(--fg-body)}
.vtxt b{color:var(--fg)}
.vtxt .lnk2{color:var(--accent-text);text-decoration:underline;text-underline-offset:3px;font-weight:500;white-space:nowrap}
.inf{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;margin:-6px 0 -6px 2px;color:var(--fg-faint);vertical-align:middle;position:relative}
.inf svg{display:block}
.inf.on{color:var(--accent-text)}
.tip{position:absolute;z-index:30;width:280px;background:var(--elevated);border:1px solid var(--border-strong);border-radius:10px;padding:12px 14px;font:400 13px/1.55 'IBM Plex Sans';color:var(--fg-body);box-shadow:0 14px 34px rgba(0,0,0,.5);text-align:left;white-space:normal;letter-spacing:0;text-transform:none}
.tip b{display:block;font:600 13.5px 'IBM Plex Sans';color:var(--fg);margin-bottom:3px}
.fcol li .nmx{display:flex;align-items:center;flex-wrap:wrap}
/* R2 the prices sheet: one line per row */
.pr2{display:flex;flex-direction:column;gap:10px;margin-top:14px}
.pr2 .row{border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:grid;grid-template-columns:1fr auto;gap:2px 16px;align-items:center;background:var(--surface-inset)}
.pr2 b{font:600 15px 'IBM Plex Sans';color:var(--fg);white-space:nowrap}
.pr2 .amt{font:600 15px 'IBM Plex Mono';color:var(--fg);white-space:nowrap;text-align:right;grid-row:1/3;grid-column:2}
.pr2 span{font-size:13px;color:var(--fg-muted)}
/* R2 demo: the dummy app, live, at native size */
.demo2{margin-top:24px;border-radius:16px;border:1px solid var(--border-strong);background:var(--surface-inset);overflow:hidden}
.d .dbody2{display:grid;grid-template-columns:340px 1fr}
.cap2{padding:16px 16px 14px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid var(--border)}
.d .cap2{padding:28px 28px 24px;border-bottom:0;border-right:1px solid var(--border)}
.cap2 h3{margin:0;font:700 19px/1.25 'Cinzel',serif}
.d .cap2 h3{font-size:23px}
.cap2 p{font-size:14px;line-height:1.6;color:var(--fg-body)}
.cap2 p em{font-style:normal;color:var(--fg);font-weight:500}
.cap2 .tags{display:flex;gap:6px;flex-wrap:wrap}
.live{padding:16px;background:var(--bg);position:relative}
.d .live{padding:24px 28px}
.live .lab{position:absolute;top:8px;right:12px;font:500 9px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.dnav2{display:flex;gap:10px;padding:12px 16px;border-top:1px solid var(--border);align-items:center}
.d .dnav2{padding:0;border:0;margin-top:6px}
.dnav2 .btn-l{flex:1}
.d .dnav2 .btn-l{flex:none;min-width:130px}
.dfoot2{font-size:13.5px;color:var(--fg-muted);padding:0 16px 14px;display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}
.d .dfoot2{padding:12px 0 0;margin-top:auto;border-top:1px solid var(--border)}
.dfoot2 .a{color:var(--accent-text);font-weight:600;text-decoration:underline;text-underline-offset:3px;min-height:32px;display:inline-flex;align-items:center}
/* headline workshop */
.hw{display:flex;flex-direction:column;gap:8px}
.hw .why{font-size:13px;line-height:1.55;color:var(--fg-muted);max-width:390px}
"""

ICON = {
    "collection": kit.NAV["Collection"],
    "commanders": kit.NAV["Commanders"],
    "decks": kit.NAV["Decks"],
    "cart": '<path d="M2.8 3.6h2.1l1.7 9.2a1.4 1.4 0 0 0 1.4 1.1h6.6a1.4 1.4 0 0 0 1.4-1.1l1.1-5.8H5.6"/><circle cx="8.4" cy="16.6" r="1"/><circle cx="14.4" cy="16.6" r="1"/>',
}
CHEVD = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>'
INFO = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="8" cy="8" r="6.3"/><path d="M8 7.2v4" stroke-linecap="round"/><circle cx="8" cy="4.9" r=".55" fill="currentColor" stroke="none"/></svg>'

HEADLINES = {
    "A": dict(kick="99 problems, but your commander ain’t one.", h1="Your next commander is already in your binder."),
    "B": dict(kick="Magic: The Gathering · Commander", h1="99 problems, but your commander ain’t one."),
    "C": dict(kick="99 problems, but your commander ain’t one.", h1="Build the deck your binder is hiding."),
    "D": dict(kick="99 problems, but your commander ain’t one.", h1="Every commander you can build, from cards you already own."),
}
COPY["sub"] = "The 99 reads the cards you own, shows you every commander they can build, and builds the deck from them. You buy only what’s missing."
COPY["launch_h"] = "Get in when it opens"
COPY["launch_l"] = "The 99 is invite-only until launch. Leave your email and we’ll tell you the day it opens to everyone."
COPY["launch_h_open"] = "Make your free account"
COPY["launch_l_open"] = "Bring your collection and start building. 15 welcome credits are waiting."
COPY["fine_inv"] = "Have an invitation? Open its link."


def launch(state="entry", d=False, open_=False, value=""):
    h = COPY["launch_h_open" if open_ else "launch_h"]
    l = COPY["launch_l_open" if open_ else "launch_l"]
    if state == "sent":
        return f'<div class="launch" aria-label="Launch list">{form("sent", d, value=value)}</div>'
    return (f'<div class="launch" aria-label="Launch list"><div class="lh"><i></i>{h}</div><p class="ll">{l}</p>'
            f'{form(state, d, open_, value)}</div>')


def hero_shot2(d, theme="amonkhet"):
    return (f'<div class="hshot2"><span class="card k2"><img src="{img("c-ghalta.jpg")}" alt=""></span>'
            f'<span class="card k3"><img src="{img("c-giada.jpg")}" alt=""></span>'
            f'<div class="pc">{A.hero_phone()}</div>'
            f'<span class="card k1"><img src="{img("c-lathliss.jpg")}" alt="Lathliss, Dragon Queen"></span></div>')


def hero(d, state="entry", open_=False, theme_on=0, theme="amonkhet", value="", head="A"):
    H = HEADLINES[head]
    kick = (f'<div class="hk2">{H["kick"]}</div>' if head != "B" else f'<div class="hk">{H["kick"]}</div>')
    words = (f'<div>{kick}<h1 class="h1 disp">{H["h1"]}</h1><p class="hs">{COPY["sub"]}</p>'
             f'{launch(state, d, open_, value)}'
             + (theme_switch(theme_on, d) if d else "") + '</div>')
    shot = hero_shot2(d, theme) + ("" if d else theme_switch(theme_on, d))
    return f'<section class="hero">{words}{"<div>" + shot + "</div>" if d else shot}</section>'


LOOP2 = [
    ("collection", "Bring your collection", "Upload a CSV from the app you use now, paste a list, or scan cards with your phone’s camera.",
     ["Reads counts, sets and foils", "Sync a newer export any time"]),
    ("commanders", "See what you can build", "Every commander you own, ranked by how much of its deck is already in your binder.",
     ["Why each one fits, in a sentence", "Discover the ones you don’t own yet"]),
    ("decks", "Build from what you own", "The 99 fills the deck from your cards first and marks what’s missing.",
     ["Analysis, stats and brackets", "Combos you’re one card from"]),
    ("cart", "Buy only what’s missing", "One shopping list across your decks, with cheaper stand-ins and friends’ spares first.",
     ["Prices from Mana Pool", "Borrow before you buy"]),
]


def loop(d):
    items = "".join(
        f'<div class="lc"><span class="ic">{ico(ICON[k], 22, 1.5)}</span><div class="hd"><h3>{t}</h3>{FREE}</div><p>{p}</p>'
        f'<ul>' + "".join(f"<li>{x}</li>" for x in ul) + '</ul></div>'
        for k, t, p, ul in LOOP2)
    return (f'<section class="sec"><p class="sk">How it works</p><h2 class="st disp">From your binder to a finished deck</h2>'
            f'<div class="loop2">{items}</div></section>')


MOX = ('<div class="mox"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">'
       '<circle cx="8" cy="8" r="6.3"/><path d="M8 7.2v4" stroke-linecap="round"/><circle cx="8" cy="4.9" r=".55" fill="currentColor" stroke="none"/></svg>'
       '<span><b style="color:var(--fg)">Moxfield deck links don’t import yet.</b> Moxfield doesn’t let deck-building apps read them today. '
       'They’re working on a way, and The 99 will connect as soon as it’s ready. Until then, export or paste the list.</span></div>')


def guide(app, d=False):
    steps = "".join(f"<li>{s}</li>" for s in GUIDES[app])
    extra = MOX if app == "Moxfield" else ""
    tail = ("ManaBox’s file also carries foils and the exact printing." if app == "ManaBox" else f"{app}’s export has both columns.")
    return f'<div class="guide"><ol>{steps}</ol><p class="gf">The file needs a Name and a Quantity column. {tail}</p>{extra}</div>'


def srow(name, sub, how, open_=False):
    right = f'<span class="go">{how}{CHEVD}</span>' if how else ""
    return (f'<div class="srow{" open" if open_ else ""}"><div class="w"><b>{name}</b><span>{sub}</span></div>{right}</div>'
            + (guide(name) if open_ else ""))


def first_timer(d):
    return ('<div class="ft"><h3>New to all this?</h3>'
            '<p>No collection app, just a box of cards? Start here. You don’t need the whole box in to begin.</p>'
            '<ol><li><em>1</em><span><b>Pick the precons you own.</b> One press adds the whole deck, commander included.</span></li>'
            '<li><em>2</em><span><b>Add the rest as you go.</b> Scan cards with your phone’s camera, or search for them by name.</span></li></ol></div>')


def bring(d, open_app=None):
    rows = "".join(srow(n, s, h, open_app == n) for n, s, h in SOURCES)
    head = (f'<p class="sk">Bring your collection</p><h2 class="st disp">Start with the cards you already own</h2>'
            f'<p class="sl">Everything in The 99 reads your collection, so it comes in first.</p>')
    body = f'{first_timer(d)}<p class="sk" style="margin:28px 0 0">Already use an app?</p><div class="src" style="margin-top:12px">{rows}</div>'
    if d:
        return f'<section class="sec">{head}<div style="max-width:780px">{body}</div></section>'
    return f'<section class="sec">{head}{body}</section>'


# ---- the demo, as a live dummy app (call 3, option B)
STEPS2 = [
    dict(t="Sam’s collection", b="Sam is made up, and so is the binder: 2,140 cards. Every tool from here reads these cards. Press any card to open it.", tags=[FREE]),
    dict(t="The commanders Sam can build", b="Every commander in the binder, ranked by how much of its deck Sam already owns. Press the fit to see why.", tags=[FREE]),
    dict(t="Help me choose", b="Sam described a deck in plain words. The 99 ranked the commanders that fit, owned or not.", tags=[credit("1 credit")]),
    dict(t="A deck from what Sam owns", b="Built from Sam’s cards first. Two are missing, and Shopping lists them.", tags=[FREE]),
    dict(t="Analysis and Overview", b="The verdict is free. The Overview is a written read of how the deck plays.", tags=[FREE, credit("Overview: 1 credit")]),
    dict(t="Suggested changes", b="Sam asked for more interaction. The 99 picked cards to add and to cut, and says why.", tags=[credit("1–2 credits")]),
    dict(t="Get it to 99", b="Over 99, a deeper look names the cuts. Under 99, Top off fills it from Sam’s cards. Mana Balance checks the lands.", tags=[FREE, credit("Look deeper: 1 credit")]),
    dict(t="Buy only what’s missing", b="One list of what to buy, cheaper stand-ins first. And a new card read against every deck Sam has.", tags=[FREE, credit("Which deck: 1 credit")]),
]
N2 = len(STEPS2)


def stage2(i, d):
    s = STEPS2[i]
    top = f'<div class="dtop"><span class="sn">Step {i + 1} of {N2}</span>{bar2(i)}<span class="skip">Skip to the end</span></div>'
    nav = (f'<div class="dnav2">' + ('<span class="btn-q">Back</span>' if i > 0 else "") +
           f'<span class="btn-l">{"See the end" if i == N2 - 1 else "Next"}</span></div>')
    foot = f'<div class="dfoot2"><span>Like it with your own cards?</span><span class="a">{COPY["press"]}</span></div>'
    cap = f'<div class="cap2"><div class="tags">{"".join(s["tags"])}</div><h3 class="disp">{s["t"]}</h3><p>{s["b"]}</p>'
    live = f'<div class="live"><span class="lab">Live demo · Sam’s cards</span><div style="padding-top:10px">{A.SCREENS[i](d)}</div></div>'
    if d:
        return f'<div class="demo2">{top}<div class="dbody2">{cap}{nav}{foot}</div>{live}</div></div>'
    return f'<div class="demo2">{top}{cap}</div>{live}{nav}{foot}</div>'


def bar2(i):
    return '<span class="bar">' + "".join(f'<i class="{"on" if k <= i else ""}"></i>' for k in range(N2)) + '</span>'


def demo_start(d):
    fan = (f'<div class="fanc"><span class="c c1"><img src="{img("c-ghalta.jpg")}" alt=""></span>'
           f'<span class="c c2"><img src="{img("c-lathliss.jpg")}" alt=""></span><span class="c c3"><img src="{img("c-giada.jpg")}" alt=""></span></div>')
    words = ('<div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">'
             '<h3 class="disp">Try it on Sam’s cards</h3>'
             '<p>Sam is a made-up player with a real-looking binder. Press through eight of the tools, the way you would with your own cards. '
             'Nothing you press is saved, and nothing costs a credit.</p>'
             '<div class="row"><span class="btn-l">Start</span></div></div>')
    return f'<div class="demo"><div class="dstart">{fan}{words}</div></div>'


def demo_end(d, skipped_at=None):
    sk = (f'<p style="font-size:13px;color:var(--fg-muted)">You skipped steps {skipped_at + 1} to {N2}. <u>Go back to step {skipped_at + 1}</u></p>' if skipped_at is not None else "")
    fan = (f'<div class="fanc"><span class="c c1"><img src="{img("c-polyraptor.jpg")}" alt=""></span>'
           f'<span class="c c2"><img src="{img("c-lathliss.jpg")}" alt=""></span><span class="c c3"><img src="{img("c-doctor-doom.jpg")}" alt=""></span></div>')
    words = (f'<div style="display:flex;flex-direction:column;gap:12px;align-items:stretch;flex:1;min-width:0">'
             '<h3 class="disp">That was Sam’s binder. Yours works the same.</h3>'
             '<p>Bring your cards in, and every commander and deck here is built from what you own.</p>'
             f'{sk}{launch("entry", d)}<div class="row"><span class="btn-q">Start over</span></div></div>')
    return f'<div class="demo"><div class="dtop"><span class="sn">The end</span>{bar2(N2 - 1)}</div><div class="dstart">{fan}{words}</div></div>'


def try_it(d, inner=None):
    return (f'<section class="sec"><p class="sk">Try it</p><h2 class="st disp">See it work before you join</h2>'
            f'<p class="sl">A made-up player’s cards and eight of the tools, working the way they do for members.</p>'
            f'{inner or demo_start(d)}</section>')


# ---- written for real: the fixture's commanders' reads (stand-in words for the stored prose)
def written(d):
    cards = "".join(
        f'<div class="cmd"><div class="art"><img src="{img("a-" + k + ".jpg")}" alt=""><span class="nm">{A.CMD[k]["name"]}{A.pips(A.CMD[k]["c"])}</span></div>'
        f'<div class="bd"><span class="k">Why this commander</span><p>{A.CMD[k]["prose"]}</p><span class="go">Open its page {CHEV}</span></div></div>'
        for k in ("lathliss", "ghalta"))
    ov = ('<div class="cmd ov"><div class="hd"><b>Mutant Menace</b><span>PRECON · OVERVIEW</span></div>'
          '<div class="bd"><p><span class="cn">The Wise Mothman</span> leads a Sultai counters deck built on radiation. Rad counters mill nonland cards, '
          'which grow creatures, make Zombie Mutant tokens and draw cards. Counter doublers and proliferate effects then inflate evasive attackers '
          'until combat damage finishes the game.</p>'
          f'<span class="go">Open the precon’s list {CHEV}</span></div></div>')
    return (f'<section class="sec"><p class="sk">Written for real</p><h2 class="st disp">A written read for 3,379 commanders</h2>'
            f'<p class="sl">Every commander page opens with why it’s worth building. Every precon has an Overview. Both are free to read.</p>'
            f'<div class="wr">{cards}{ov}</div></section>')


# ---- free versus credits, with the welcome credits as the offer
TIPS = {
    "Overview of a deck": "A written read of your deck: its game plan from the first turns to the win, what to keep in an opening hand, and where it’s weak.",
    "Suggested changes": "Say what you want from the deck in your own words. It picks cards to add and cut, from your collection first, and says why for each.",
    "Look deeper in Proposed cuts": "When a deck runs over 99, it names the exact cards to cut and why each one goes.",
    "Help me choose with “Anything else?”": "Describe the deck you’re after in your own words, and it ranks the commanders that fit, owned or not.",
    "Which deck needs it most?": "Got a new card? It reads it against every deck you have and tells you where it does the most.",
}
CREDIT_LIST = [("Overview of a deck", "1 credit"), ("Suggested changes", "1–2 credits"), ("Look deeper in Proposed cuts", "1 credit"),
               ("Help me choose with “Anything else?”", "1 credit"), ("Which deck needs it most?", "1 credit")]


def value(d):
    return ('<div class="val"><div class="vbig"><b>15</b><span>welcome credits<small>when you join, for 30 days</small></span></div>'
            '<div class="vplus"><b>+1</b><span>free credit every day<small>for as long as you’re a member</small></span></div>'
            '<p class="vtxt">That’s enough to run <b>every writing tool three times</b> before you spend a thing. Try them on your own decks, '
            'then decide. Keep going with a pack or the monthly plan. <span class="lnk2">What credits cost</span></p></div>')


def free_vs(d, tip=None):
    f = "".join(f'<li><span>{x}</span><span class="r ck">{CHECK}</span></li>' for x in FREE_LIST)
    c = ""
    for x, y in CREDIT_LIST:
        on = tip == x
        tp = (f'<span class="tip" style="{"left:-120px;top:34px" if not d else "left:34px;top:-12px"}"><b>{x}</b>{TIPS[x]}</span>' if on else "")
        c += (f'<li><span class="nmx">{x}<span class="inf{" on" if on else ""}" aria-label="What is {x}?">{INFO}{tp}</span></span>'
              f'<span class="r">{y}</span></li>')
    return (f'<section class="sec"><p class="sk">Free and credits</p><h2 class="st disp">The core is free. Credits are for writing.</h2>'
            f'<p class="sl">Browsing is always free. Anything we write just for you uses a credit.</p>{value(d)}'
            f'<div class="fc"><div class="fcol"><h3>Free, always {FREE}</h3><p class="sub">No credits, no limits.</p><ul>{f}</ul></div>'
            f'<div class="fcol cr" style="overflow:visible"><h3>With credits {credit("1–2 per run")}</h3><p class="sub">Each run of a writing tool on your deck. Press ⓘ for what each one does.</p><ul>{c}</ul></div></div></section>')


def close(d, state="entry", open_=False, value=""):
    return (f'<section class="closeband"><h2 class="st disp" style="max-width:560px;margin:0 auto">Your cards already know what to build.</h2>'
            f'{launch(state, d, open_, value)}</section>')


def page(d, state="entry", open_=False, numbers=True, demo_inner=None, open_app=None, theme=None, close_state="entry", over="", parts=None, head="A"):
    sections = {
        "top": topbar(d),
        "hero": hero(d, state, open_, head=head),
        "nums": nums() if numbers else "",
        "loop": loop(d),
        "bring": bring(d, open_app),
        "try": try_it(d, demo_inner),
        "written": written(d),
        "free": free_vs(d),
        "close": close(d, close_state, open_),
        "foot": footer(d),
    }
    order = parts or list(sections)
    body = "".join(sections[k] for k in order)
    return f'<div class="lp {"d" if d else "p"}{" kami" if theme == "kamigawa" else ""}">{body}{over}</div>'
