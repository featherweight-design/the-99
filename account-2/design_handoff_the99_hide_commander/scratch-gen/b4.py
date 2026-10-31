"""States 7–8 · the commander's own page: reached from search while hidden, and Hide on the page when it is not."""
import lib as L
BEST = '<span style="font:600 13px IBM Plex Sans;color:var(--success)">Best in your pool</span>'
MAG = ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A59C89" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">'
       '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>')
X = ('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A59C89" stroke-width="2" stroke-linecap="round" aria-hidden="true">'
     '<path d="M6 6l12 12M18 6 6 18"/></svg>')

def typed(w):
    if w == 'p':
        box = ('position:absolute;left:16px;top:77px;width:224px;height:44px;border-radius:10px;background:#15110C;border:1px solid #4A4237;'
               'display:flex;align-items:center;gap:10px;padding:0 12px 0 14px;font-size:16px;color:var(--fg)')
        src, wd = 'art/ph-head-foryou.png', 390
    else:
        box = ('position:absolute;left:23px;top:77px;width:298px;height:33px;border-radius:6px;background:#15110C;border:1px solid #4A4237;'
               'display:flex;align-items:center;gap:9px;padding:0 10px 0 12px;font-size:13.5px;color:var(--fg)')
        src, wd = 'art/dk-head-foryou.png', 1237
    return (f'<div style="position:relative"><img class="cap-img" src="{src}" width="{wd}" alt="">'
            f'<div style="{box}">{MAG}<span style="flex:1">ghal</span>{X}</div></div>')

def held():
    return ('<div class="zs"><div class="dr"><i></i><i></i><i></i></div>'
            '<h3>Ghalta, Primal Hunger is here. You hid it<span class="draft">DRAFT</span></h3>'
            '<p>It matches, but you hid it, so it stays out of your lists. Its page still opens.<span class="draft">DRAFT</span></p>'
            '<div class="acts"><a class="btnp" href="#">Open its page</a><span class="aside">1 match, 0 shown</span></div></div>')

def note():
    return ('<div class="hnote new">' + L.EYE_OFF +
            '<p class="tx"><strong>Hidden.</strong> It stays out of For you, Discover and Help me choose until you bring it back.<span class="draft">DRAFT</span></p>'
            '<button type="button" class="tb" aria-label="Unhide Ghalta, Primal Hunger"><span>Unhide</span></button></div>')

def hero(key, rank_txt, phone=True, faint=False):
    c = L.C[key]; p, r, s = c['seg']
    pct = c['fit']
    rc = f'<p class="rc" style="margin-top:6px{";color:var(--fg-locked)" if faint else ""}">{rank_txt}</p>' if phone else ''
    rci = '' if phone else f'<span class="rc" style="margin-left:6px{";color:var(--fg-locked)" if faint else ""}">{rank_txt}</span>'
    return (f'<div class="hero"><p class="l">Fit for your collection</p><div class="sc"><b>{c["fit"]}</b><span>/100</span>{rci}</div>{rc}'
            f'<div class="hbar"><div style="display:flex;width:{pct}%"><div style="flex-grow:{p};background:var(--accent-dim)"></div>'
            f'<div style="flex-grow:{r};background:var(--accent-mid)"></div><div style="flex-grow:{s};background:var(--accent)"></div></div></div>'
            f'<div class="lg"><span><i style="background:var(--accent-dim)"></i>Pool <em>{p}<s>/40</s></em></span>'
            f'<span><i style="background:var(--accent-mid)"></i>Roles <em>{r}<s>/30</s></em></span>'
            f'<span><i style="background:var(--accent)"></i>Synergy <em>{s}<s>/30</s></em></span></div></div>')

def why(key):
    c = L.C[key]
    return (f'<div class="why"><h2>Why this commander</h2><p>{c["pr"]} <span style="color:var(--fg-muted)">You own 412 of the 2,140 cards its decks play most.</span></p></div>')

def page_p(key, hidden):
    c = L.C[key]
    kick = 'Hidden' if hidden else 'Rank 1 · your best fit'
    hide = ''
    band = (f'<div class="cp-band"><img class="a" src="art/crop-{key}.jpg" alt=""><div class="scrim"></div>{hide}'
            f'<div style="position:absolute;right:7px;bottom:6px;z-index:2">{L.plate("", L.EXPAND, style="position:relative", label="View card details")}</div>'
            f'<div class="blk"><p class="k">{kick}</p><div class="nl"><h1>{c["n"]}</h1>{L.pips(c["id"], 10, 3)}</div><p class="tl">{c["ty"]}</p></div></div>')
    hb = '' if hidden else f'<button type="button" class="hidebtn new" style="justify-content:flex-start;margin:-8px 0 -8px 2px">{L.EYE_OFF}Hide from my lists<span class="draft">DRAFT</span></button>'
    body = '<div class="cp-body">' + (note() if hidden else '') + hero(key, 'Not ranked while hidden' if hidden else BEST, True, hidden) + hb + why(key) + '</div>'
    return (f'<div class="ph"><img class="cap-img" src="art/ph-header.png" width="390" alt=""><div class="scroll">{band}{body}</div>'
            f'<img class="bar" src="art/ph-bar.png" width="390" alt=""></div>')

def page_d(key, hidden):
    c = L.C[key]
    idn = L.IDNAME[c['id']]
    pip = ''.join(f'<i style="background:{L.PIP[x]}"></i>' for x in c['id'])
    hidebtn = '' if hidden else (f'<button type="button" class="hidebtn new">{L.EYE_OFF}Hide from my lists<span class="draft">DRAFT</span></button>')
    left = (f'<div class="left"><div class="cface"><img src="art/c-{key}.jpg" alt="">'
            f'<div style="position:absolute;left:3px;bottom:3px">{L.plate("", L.EXPAND, style="position:relative", label="View card details")}</div></div>'
            f'<div><h1>{c["n"]}</h1><p class="ty">{c["ty"]}</p></div>'
            f'<div class="idrow">{pip}<span>{idn}</span></div>'
            f'<button type="button" class="build">Build this deck →</button>'
            f'<p class="seed">We’ll build the whole 99, as far as your collection reaches. Anything we add is yours to clear.</p>{hidebtn}</div>')
    right = ('<div class="right">' + (note() if hidden else '') + hero(key, 'Not ranked while hidden' if hidden else BEST, False, hidden)
             + why(key) + '<div class="why"><h2>The Pool</h2><p style="font:12px IBM Plex Mono;color:var(--fg-faint);margin-top:0">1,486 cards fit this identity</p>'
             f'<p>Cards from your collection that fit within {c["n"]}’s color identity and could slot into the 99.</p></div>'
             '<div class="why"><h2>Role Coverage</h2><p style="color:var(--fg-muted)">As shipped, unchanged by this round.</p></div></div>')
    return (f'<div class="dk"><img class="rail" src="art/dk-rail.png" alt=""><div class="main"><div class="scroll">'
            f'<div class="cp-d" style="margin-top:0">{left}{right}</div></div></div></div>')

def build():
    body = L.head('Hide a commander · R1 · account 2 · 2026-10-31', 'States 7–8 · The commander’s own page',
        '<b>How a reader reaches a hidden commander.</b> Card search opens a card’s details, not this page, so “from search” is the lists’ own search. A hidden commander is out of the list, '
        'so typing its name lands on Discover’s shipped <b>held</b> state (<code>excluded-report.ts</code>, the same one that says a filter is holding a match back), '
        'with one new cause: <i>you hid it</i>, and the button opens its page. Above a live list the same cause is one sentence in the shipped aside. '
        '<b>On the page</b>, hidden reads as the hero’s shipped note (the synergy note’s shape) at the top, with <b>Unhide</b>. The page does offer Hide when not hidden: a quiet <i>Hide from my lists</i> line, under the hero on the phone and under the build note on desktop (R1b: nothing over the art).')
    body += '<div class="frames">'
    body += L.fr('<b>7 · For you search</b> · 390 · “ghal”', L.phone(held(), head=typed('p'), count=3),
                 'The only match is hidden: the shared zero state names it, says why, and offers its page. The figures beside the button stay inert, as shipped.')
    body += L.fr('<b>7 · Its page, hidden</b> · 390', page_p('ghalta', True),
                 'The kicker reads <i>Hidden</i> in place of the rank, and the hero says <i>Not ranked while hidden</i>: the lists it ranks in leave it out. Fit is still its fit. Build stays: hiding is about suggestions, not a lock. Unhide is the one control.')
    body += L.fr('<b>8 · A page, not hidden</b> · 390', page_p('zimone', False),
                 'R1b: the band stays as shipped. Hide is a quiet text line under the hero, muted until pressed. Press: the page turns into state 7 at once; Unhide in the note takes it back.')
    body += '</div><div class="frames">'
    body += L.fr('<b>7 · Its page, hidden</b> · desktop 1300', page_d('ghalta', True),
                 'Desktop: the note leads the right column, above the hero. The left column is as shipped.')
    body += L.fr('<b>8 · A page, not hidden</b> · desktop 1300', page_d('zimone', False),
                 'Desktop Hide: a text line under the build note, muted until hovered. Not on the card face, where a plate would cover the mana cost or the stats.')
    body += '</div><div class="frames">'
    body += L.fr('<b>7 · For you search</b> · desktop 1300 · “ghal”', L.desk(held(), head=typed('d'), count=3),
                 'The held state at 1300: buttons side by side, 32px, as shipped.')
    body += '</div>'
    return L.doc('Hide · Commander page', body, 2900)
