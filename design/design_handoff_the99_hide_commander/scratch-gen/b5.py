"""States 9–11 · Help me choose leaves hidden commanders out silently; a pair; a list hiding leaves short or empty."""
import lib as L
from b3 import hidden_page

def bf(key, rank, fig, own, desk):
    c = L.C[key]
    return (f'<div class="bfc"><div class="im"><img src="art/crop-{key}.jpg" alt=""><span class="rkb">{rank}</span></div>'
            f'<div class="tx"><div class="nl"><span class="rkp">{rank}</span><span class="n">{c["n"]}</span>{L.pips(c["id"], 11 if desk else 9, 4)}</div>'
            f'<p class="fg"><b>{fig}</b> of its decks are Ramp</p><hr><p class="ow"><i class="d"></i>owned · free &nbsp; you own {own} of its 99</p></div></div>')

def more(key, fig, own):
    c = L.C[key]
    return (f'<div class="hrow" style="grid-template-columns:40px minmax(0,1fr) 14px;padding-right:12px"><div class="thumb"><img src="art/c-{key}.jpg" alt=""></div>'
            f'<div style="min-width:0"><div class="nm"><span class="n">{c["n"]}</span>{L.pips(c["id"], 9, 4)}</div>'
            f'<p class="mt" style="color:var(--fg-muted)"><b style="color:var(--fg)">{fig}</b> of its decks are Ramp</p>'
            f'<p class="mt"><i style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--success);margin-right:5px"></i>you own {own} of its 99</p></div>'
            f'<span style="color:var(--fg-faint);font-size:16px">›</span></div>')

def hmc(desk):
    sub = 'Suggested from what you asked, best fit first.' if desk else 'From your answers.'
    return (f'<div class="hmc"><p style="font-size:13px;color:var(--accent-text)">‹ Your answers</p>'
            f'<h2 style="margin-top:10px">Commanders for you</h2><p class="ld">{sub} Ordered by fit to everything you asked.</p>'
            f'<p class="sec">Best fits</p><div class="bf">{bf("zimone", 1, "52%", 61, desk)}{bf("lathliss", 2, "49%", 44, desk)}{bf("giada", 3, "44%", 58, desk)}</div>'
            f'<p class="sec" style="color:var(--fg-faint)">More commanders</p><div class="hlist" style="padding:0">{more("rootha", "38%", 40)}{more("killian", "31%", 37)}</div></div>')

def cnt_patch(text, w):
    if w == 'p':
        return (f'<div style="position:relative"><img class="cap-img" src="art/ph-head-foryou.png" width="390" alt="">'
                f'<p style="position:absolute;left:0;top:158px;width:390px;height:30px;background:#18140F;padding:6px 16px;font:12px IBM Plex Mono;color:var(--fg-muted)">{text}</p></div>')
    return (f'<div style="position:relative"><img class="cap-img" src="art/dk-head-foryou.png" width="1237" alt="">'
            f'<p style="position:absolute;left:0;top:146px;width:700px;height:30px;background:#18140F;padding:8px 22px;font:12px IBM Plex Mono;color:var(--fg-muted)">{text}</p></div>')

def all_hidden():
    return ('<div class="zs"><div class="dr"><i></i><i></i><i></i></div><h3>Everything here is hidden<span class="draft">DRAFT</span></h3>'
            '<p>You hid all 3 commanders you own and haven’t built. Bring one back from Hidden, or find one to build in Discover.<span class="draft">DRAFT</span></p>'
            '<div class="acts"><a class="btnp" href="#">See hidden</a></div></div>')

def cap_phone(src):
    return f'<div class="ph"><img src="{src}" width="390" height="844" style="display:block" alt=""></div>'

def cap_desk(src):
    return f'<div class="dk"><img src="{src}" width="1300" height="900" style="display:block" alt=""></div>'

def build():
    body = L.head('Hide a commander · R1 · account 2 · 2026-10-31', 'States 9–11 · Help me choose, pairs, short lists',
        '<b>9 · Help me choose</b> reads the same hidden list in the same statement as its candidates, before the read picks and before the rest are ordered, so a hidden commander is never a best fit, '
        'never in More commanders, and never named. Nothing is drawn for it: no line, no count. <b>10 · Pairs</b>: Hide acts on the card the row draws. '
        '<b>11</b>: a list hiding leaves short just has fewer rows; one it leaves empty says so and points at Hidden.')
    body += '<div class="frames">'
    body += L.fr('<b>9 · Help me choose</b> · 390 · results, unchanged', L.phone(hmc(False), strip_on='choose', head=None, count=3),
                 'Ghalta would have been the first best fit for “Ramp”. It is hidden, so Zimone leads and the list reads exactly as shipped. The read’s picks come from the same filtered candidates.')
    pair = hidden_page(L.hrow('aang', 'Hidden Oct 31') + L.hrow('zada', 'Hidden Oct 29'), n=2)
    body += L.fr('<b>10 · A pair</b> · 390 · Hidden', L.phone(pair, strip_on='hidden', head=None, count=2),
                 'A two-faced commander is one card: the row names both faces, as the list row does, and truncates. Partners are separate cards with separate rows: hiding one leaves the other in the lists, and a deck either already leads is untouched.')
    body += L.fr('<b>10 · Discover</b> · 390 · as shipped', cap_phone('art/p-discover.webp'),
                 'The shipped capture, unchanged: <i>Aang and Katara</i> is a different card from the Aang the reader hid, so it still comes first in Discover. Hiding one Aang never hides another. (The capture predates the Hidden tab.)')
    short = '<div class="list">' + L.crow('lathliss', 1, 'rest') + '</div>'
    body += L.fr('<b>11 · For you</b> · 390 · one left', L.phone(short, head=cnt_patch('1 commander you own and haven’t built', 'p'), count=2),
                 'Two of three hidden: one row, the count line counts it, and the list ends on its plain spacer. No “2 hidden” line here: the tab already says it.')
    body += L.fr('<b>11 · For you</b> · 390 · all hidden', L.phone(all_hidden(), head=cnt_patch('0 commanders you own and haven’t built', 'p'), count=3),
                 'Every one hidden: the shared zero state with one button to Hidden. Discover is the other way out, named in the sentence, a tab away.')
    body += '</div><div class="frames">'
    body += L.fr('<b>9 · Help me choose</b> · desktop 1300 · results, unchanged', L.desk(hmc(True), strip_on='choose', head=None, count=3),
                 'Desktop: the three best fits side by side, Ghalta nowhere.')
    pair_d = hidden_page(L.hrow('aang', 'Hidden Oct 31') + L.hrow('zada', 'Hidden Oct 29'), 'd', n=2)
    body += L.fr('<b>10 · A pair</b> · desktop 1300 · Hidden', L.desk(pair_d, strip_on='hidden', head=None, count=2),
                 'At 1300 both faces fit on the line.')
    body += '</div><div class="frames">'
    body += L.fr('<b>10 · Discover</b> · desktop 1300 · as shipped', cap_desk('art/d-discover.webp'), 'The shipped capture, unchanged.')
    body += L.fr('<b>11 · For you</b> · desktop 1300 · all hidden',
                 L.desk(all_hidden(), head=cnt_patch('0 commanders you own and haven’t built', 'd'), count=3, line='3,068 to discover'),
                 'The title line drops its own count at 0, as shipped (<code>loadCommanderCounts</code>, which leaves hidden commanders out).')
    body += '</div>'
    return L.doc('Hide · Edges', body, 2900)
