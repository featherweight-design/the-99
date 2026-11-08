"""The signed-in first run, step 1, with the per-source paths and the first-timer path (public landing R1).
Drawn over the shipped first run (first-run.tsx, first-run-step-one.tsx, ways-group.tsx; copy refreshCopy.firstRun,
importReviewCopy) with the kit's signed-in shell (locked bar). Dashed copper = new or changed.
"""
import kit
from kit import ico, phone, desk
from lp import CHECK, GUIDES

kit.CSS += r"""
.fr1{padding:22px 16px 26px;display:flex;flex-direction:column;gap:12px}
.dk .fr1{padding:34px 48px;max-width:860px}
.fr1 .stp{font:400 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.fr1 h1{margin:2px 0 4px;font:700 25px 'Cinzel',serif}
.dk .fr1 h1{font-size:30px}
.fr1 .pl{font-size:13px;color:var(--fg-muted);margin-top:-4px}
.s1{border:1px solid var(--accent);border-radius:14px;background:var(--surface-inset);padding:18px 16px;display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center}
.dk .s1{flex-direction:row;align-items:flex-start;text-align:left;gap:18px;padding:18px}
.s1 .col{display:flex;flex-direction:column;gap:12px;width:100%;min-width:0}
.dk .s1 .col{gap:9px}
.s1 h2{margin:0;font:600 19px 'Cinzel',serif;color:var(--fg)}
.s1 p.b{font-size:13.5px;line-height:1.6;color:var(--fg-muted)}
.plates{position:relative;width:86px;height:78px;flex:none}
.plates i{position:absolute;top:4px;width:48px;height:66px;border-radius:5px;border:1px solid var(--border-strong);background:var(--surface-raised);display:block;box-shadow:0 2px 6px rgba(0,0,0,.35)}
.plates i:nth-child(1){left:6px;transform:rotate(-10deg)}.plates i:nth-child(2){left:20px;transform:rotate(-2deg)}
.plates i:nth-child(3){left:34px;transform:rotate(7deg);border-color:var(--accent);display:flex;align-items:center;justify-content:center;font:800 15px 'Cinzel';color:var(--accent)}
.bts{display:flex;flex-direction:column;gap:8px;width:100%}
.dk .bts{flex-direction:row}
.bts .bp,.bts .bg{width:100%}
.dk .bts .bp,.dk .bts .bg{width:auto;height:36px}
.hx{font-size:13px;color:var(--fg-muted);line-height:1.5;text-align:left;width:100%}
.hx .a{color:var(--accent-text);font-weight:500;white-space:nowrap}
.ways{width:100%;text-align:left;border-top:1px solid var(--border);padding-top:10px;display:flex;flex-direction:column}
.ways .h{font:400 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);padding:2px 0 6px}
.ways .ld{font-size:13px;line-height:1.5;color:var(--fg-body);padding:0 0 8px}
.ways .ld b{color:var(--fg)}
.wy{display:flex;align-items:center;gap:10px;min-height:44px;border-top:1px solid var(--border);padding:6px 0}
.wy:first-of-type{border-top:0}
.wy .t{flex:1;display:flex;flex-direction:column;gap:1px}
.wy b{font:600 13.5px 'IBM Plex Sans';color:var(--fg)}
.wy span{font-size:12px;color:var(--fg-muted)}
.wy i{font-style:normal;color:var(--fg-faint)}
.lkd{border:1px solid var(--border);border-radius:14px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start;opacity:.85}
.lkd em{font:500 10px 'IBM Plex Mono';font-style:normal;width:22px;height:22px;border:1px solid var(--border-strong);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);flex:none}
.lkd b{display:block;font:600 16px 'Cinzel',serif;color:var(--fg-muted)}
.lkd span{font-size:12px;color:var(--fg-faint)}
.lkd.open{opacity:1;border-color:var(--accent)}
.lkd.open b{color:var(--fg)}
.lkd.done{opacity:1}
.lkd.done em{border-color:var(--success);color:var(--success)}
.err{width:100%;text-align:left;border:1px solid color-mix(in oklab,var(--danger) 60%,transparent);background:color-mix(in oklab,var(--danger) 8%,transparent);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.err b{font:600 14px 'IBM Plex Sans';color:var(--fg)}
.err p{font-size:13px;line-height:1.55;color:var(--fg-body)}
.err .a{color:var(--accent-text);font-weight:500;text-decoration:underline;text-underline-offset:3px}
.errl{font-size:13px;color:#E07A66;text-align:left;width:100%;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.errl .a{color:var(--accent-text);font-weight:600;text-decoration:underline;text-underline-offset:2px}
.rv{width:100%;text-align:left;display:flex;flex-direction:column;gap:10px}
.rv .rl{font:400 10px 'IBM Plex Mono';letter-spacing:.04em;text-transform:uppercase;color:var(--fg-faint)}
.rv .stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.rv .stats div{border:1px solid var(--border);border-radius:10px;padding:10px 12px;background:var(--surface)}
.rv .stats b{display:block;font:600 20px 'IBM Plex Mono';color:var(--fg)}
.rv .stats span{font-size:12px;color:var(--fg-muted)}
.rv .stats .warn b{color:var(--warning)}
.rv h4{margin:4px 0 0;font:600 13px 'IBM Plex Sans';color:var(--fg)}
.rv ul{margin:0;padding:0;list-style:none;font:12.5px 'IBM Plex Mono';color:var(--fg-muted);display:flex;flex-direction:column;gap:5px}
.rv .why{font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
.rv .cb{display:flex;gap:8px;border-top:1px solid var(--border);padding-top:12px}
.rv .cb .bp{flex:1}
.ok{display:flex;gap:10px;align-items:center;font-size:13.5px;color:var(--fg-body)}
.ok .c{width:24px;height:24px;border-radius:50%;border:1.5px solid var(--success);color:var(--success);display:flex;align-items:center;justify-content:center;flex:none}
.big{font:600 34px 'IBM Plex Mono';color:var(--fg);line-height:1}
.sheet2{position:absolute;left:0;right:0;bottom:0;z-index:21;background:var(--surface-raised);border-top:1px solid var(--border-strong);border-radius:18px 18px 0 0;padding:10px 18px 24px;max-height:86%;overflow:hidden}
.sheet2 .grab{width:40px;height:4px;border-radius:2px;background:var(--border-strong);margin:0 auto 12px}
.scr{position:absolute;inset:0;background:rgba(0,0,0,.55);z-index:20}
.gh{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.gh h3{margin:0;font:700 18px/1.3 'Cinzel',serif}
.gh .x{width:44px;height:44px;margin:-10px -10px 0 0;display:flex;align-items:center;justify-content:center;color:var(--fg-faint)}
.gs{font-size:13px;color:var(--fg-muted);line-height:1.5;margin:4px 0 10px}
.ap{border-top:1px solid var(--border)}
.ap .r{display:flex;align-items:center;justify-content:space-between;min-height:48px;font:600 14px 'IBM Plex Sans';color:var(--fg)}
.ap .r i{font-style:normal;color:var(--fg-faint);font-weight:400}
.ap ol{margin:0 0 12px;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:13px;line-height:1.5;color:var(--fg-body)}
.ap ol b{color:var(--fg)}
.frag{border:1px solid var(--border-strong);border-radius:14px;background:var(--surface-raised);padding:16px;width:390px;display:flex;flex-direction:column;gap:12px}
.cnt{display:flex;align-items:center;gap:12px;border:1px solid var(--border);border-radius:12px;background:var(--surface-inset);padding:12px 14px}
.cnt .n{font:600 26px 'IBM Plex Mono';color:var(--fg)}
.cnt span{font-size:13px;color:var(--fg-muted);line-height:1.45}
.lit{display:flex;align-items:center;gap:10px;border-radius:10px;padding:10px 12px;background:color-mix(in oklab,var(--accent) 10%,transparent);border:1px solid color-mix(in oklab,var(--accent) 45%,transparent);font-size:13.5px;color:var(--fg)}
.lit b{font:600 15px 'IBM Plex Mono';color:var(--accent-text)}
.tick{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:var(--fg)}
.tick .bx{width:20px;height:20px;border-radius:5px;background:var(--accent);color:var(--bg);display:flex;align-items:center;justify-content:center;flex:none;margin-top:1px}
.tick span small{display:block;font-size:12px;color:var(--fg-muted);margin-top:2px}
"""

LOCK = ["Commanders", "Decks"]


def plates():
    return '<span class="plates" aria-hidden="true"><i></i><i></i><i>99</i></span>'


def ways(chg=True):
    c = " chg" if chg else ""
    return ('<div class="ways"><span class="h">No file? Start another way</span>'
            f'<p class="ld{c}"><b>No collection app?</b> Pick the precons you own, then scan your legendary creatures. Each legend is a commander you can build.</p>'
            '<div class="wy"><span class="t"><b>Precons I own</b><span>One press adds a whole deck</span></span><i>›</i></div>'
            f'<div class="wy{c}"><span class="t"><b>Scan your cards</b><span>With your phone’s camera</span></span><i>›</i></div>'
            '<div class="wy"><span class="t"><b>Import a deck</b><span>A list from anywhere</span></span><i>›</i></div>'
            '<div class="wy"><span class="t"><b>Add cards by hand</b><span>A few at a time</span></span><i>›</i></div></div>')


def howto(chg=True):
    return (f'<p class="hx{" chg" if chg else ""}">Coming from ManaBox, Moxfield, Archidekt or Deckbox? <span class="a">How to export ›</span></p>')


def step1(d, mid="", body=True, after_buttons=""):
    bodytxt = ("Drop a CSV export from Moxfield, Archidekt, Deckbox or ManaBox. We read owned counts, sets and finishes." if d
               else "Drop a CSV export from Moxfield, Archidekt, Deckbox or ManaBox.")
    col = (f'<div class="col"><h2>Add your collection</h2>' + (f'<p class="b">{bodytxt}</p>' if body else "")
           + f'<div class="bts"><span class="bp">Upload a CSV</span><span class="bg">Paste a list</span></div>{after_buttons}{mid}</div>')
    return f'<div class="s1">{plates()}{col}</div>'


def locked_steps():
    return ('<div class="lkd"><em>2</em><div><b>Pick a commander or import a deck</b><span>Opens once your cards are in</span></div></div>'
            '<div class="lkd"><em>3</em><div><b>Build the 99</b><span>Opens once you pick a commander</span></div></div>')


def page(d, card, steps=True):
    pl = '<p class="pl">Commanders and Decks open once your cards are in.</p>' if d else ""
    return f'<div class="fr1"><span class="stp">Step 1 of 3</span><h1>Welcome to The 99</h1>{pl}{card}{locked_steps() if steps else ""}</div>'


def ph(inner, h=844, over="", locked=True):
    return phone(inner, active="Home", h=h, locked=LOCK if locked else None, over=over)


def dk(inner, h=900, over="", locked=True):
    return desk(inner, active="Home", locked=LOCK if locked else None, h=h, over=over)


# ---- states
def rest(d):
    return page(d, step1(d, ways(), after_buttons=howto()))


def failed(d):
    e = '<p class="errl" role="alert">We couldn’t upload that file. Try again.</p>'
    return page(d, step1(d, ways(chg=False), after_buttons=e + howto(chg=False)))


def no_column(d):
    e = ('<div class="err chg" role="alert"><b>This file has no Quantity column</b>'
         '<p>The 99 needs a <b>Name</b> and a <b>Quantity</b> column in the first row. Most apps’ CSV exports have both. '
         '<span class="a">How to export</span>, or paste the list instead.</p></div>')
    return page(d, step1(d, ways(chg=False), after_buttons=e))


def partial(d):
    rv = ('<div class="rv"><span class="rl">Reviewing · manabox.csv · 2,140 rows</span>'
          '<div class="stats"><div><b>2,086</b><span>cards found</span></div><div class="warn"><b>54</b><span>not in catalog</span></div></div>'
          '<h4>Not in the catalog: 54 skipped</h4><ul><li>Treasure // Treasure (token)</li><li>Art Card: Sheoldred</li><li>Mystery Booster playtest card</li><li style="color:var(--fg-faint)">and 51 more</li></ul>'
          '<p class="why chg">Tokens, art cards and playtest cards aren’t in the catalog, so they stay out. Everything else came in.</p>'
          '<div class="cb"><span class="bg">Cancel</span><span class="bp">Add 2,086 cards</span></div></div>')
    card = (f'<div class="s1" style="text-align:left;align-items:stretch">{"" if not d else plates()}<div class="col"><h2>Add your collection</h2>{rv}</div></div>')
    return page(d, card)


def success(d):
    card = ('<div class="lkd done"><em>' + CHECK + '</em><div><b>Your collection is in</b><span>2,086 cards · from manabox.csv</span></div></div>'
            '<div class="s1 chg" style="text-align:left;align-items:stretch"><div class="col">'
            '<span class="stp" style="font:400 10px IBM Plex Mono;letter-spacing:.14em;color:var(--fg-faint)">STEP 2</span>'
            '<h2>Pick a commander or import a deck</h2>'
            '<div class="lit"><b>227</b> commanders you can build from your cards</div>'
            '<div class="bts"><span class="bp">See your commanders</span><span class="bg">Import a deck</span></div></div></div>'
            '<div class="lkd"><em>3</em><div><b>Build the 99</b><span>Opens once you pick a commander</span></div></div>')
    return f'<div class="fr1"><span class="stp">Step 2 of 3</span><h1>Welcome to The 99</h1>{card}</div>'


def guide_list(open_app="ManaBox"):
    out = ""
    for app, steps in GUIDES.items():
        o = app == open_app
        out += f'<div class="ap"><div class="r">{app}<i>{"⌃" if o else "⌄"}</i></div>'
        if o:
            out += "<ol>" + "".join(f"<li>{s}</li>" for s in steps) + "</ol>"
        out += "</div>"
    out += ('<div class="ap"><div class="r">Another app<i>⌄</i></div></div>'
            '<p class="gs" style="margin-top:10px">Any CSV with a <b>Name</b> and a <b>Quantity</b> column imports. If yours fails, open it in a spreadsheet '
            'and check the first row names both.</p>')
    return out


def guide_sheet(d):
    head = ('<div class="gh"><h3>How to export your collection</h3><span class="x">✕</span></div>'
            '<p class="gs">Pick the app your cards are in now.</p>')
    if d:
        return ('<div class="scr"></div><div class="mdl" style="position:absolute;z-index:21;left:50%;top:50%;transform:translate(-50%,-50%);width:520px;'
                'background:var(--surface-raised);border:1px solid var(--border-strong);border-radius:14px;padding:22px 24px 18px;box-shadow:0 24px 60px rgba(0,0,0,.55)">'
                + head + guide_list() + '</div>')
    return '<div class="scr"></div><div class="sheet2"><div class="grab"></div>' + head + guide_list() + '</div>'


def scan_fragment():
    return ('<div class="frag"><span style="font:500 10px IBM Plex Mono;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)">Scan · the count card, as shipped, with one line added</span>'
            '<div class="cnt"><span class="n">12</span><span>cards scanned<br>Keep going, or review them</span></div>'
            '<div class="lit chg"><b>3</b> of them are commanders you can build</div></div>')


def import_fragment():
    return ('<div class="frag"><span style="font:500 10px IBM Plex Mono;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)">Import a deck · from the first run</span>'
            '<div class="tick chg"><span class="bx">' + CHECK + '</span><span>I own these cards<small>Ticked when you come from the first run: your collection is empty, '
            'so the deck you bring is most likely cards you have. Untick it for a wishlist deck.</small></span></div></div>')
