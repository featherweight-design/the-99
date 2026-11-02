"""Item 3 · Hide a commander: (a) Not ranked while hidden at 4.5:1, (b) Discover's search for a commander hidden from For you,
(c) For you's aside when a search matches a visible commander and a hidden one. Frames lifted from hide_commander/{Page,Undo}."""
import lib10 as L, re
P = L.load('design_handoff_the99_hide_commander/Page.dc.html')
U = L.load('design_handoff_the99_hide_commander/Undo.dc.html')
SC = 'hc10'
CSS_SRC = '/home/user/the-99/src/app/globals.css'


def scr(src, lab):
    return L.unmark(L.screen(L.frame_by_label(src, lab)))


# ---- (a) ---------------------------------------------------------------------------------------------------------
def page(lab):
    s = scr(P, lab)
    s2 = re.sub(r'class="rc" style="([^"]*)color:var\(--fg-locked\)">Not ranked', r'class="rc new9" style="\1color:var(--fg-faint)">Not ranked', s)
    assert s2 != s
    return s2


def _lum(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def _cr(a, b):
    a, b = _lum(a), _lum(b); return (max(a, b) + .05) / (min(a, b) + .05)


NAMES = {'amonkhet': 'Low Sun', 'kamigawa': 'Neon Rain', 'ixalan': 'Ixalan', 'phyrexia': 'Phyrexia', 'eldraine': 'Witching Hour', 'kaldheim': 'First Frost'}


def contrast():
    css = open(CSS_SRC).read()
    rows = ''
    for t, body in re.findall(r'\[data-theme="(\w+)"\]\s*\{(.*?)\n\}', css, re.S):
        v = dict(re.findall(r'(--[\w-]+):\s*(#[0-9A-Fa-f]{6})', body))
        if '--fg-locked' not in v:
            continue
        g = v['--surface-rail']
        lo, fa = _cr(v['--fg-locked'], g), _cr(v['--fg-faint'], g)
        cell = lambda col, r, ok: (f'<td style="padding:10px 14px;background:{g}"><span style="font:13px \'IBM Plex Mono\',monospace;color:{col}">Not ranked while hidden</span></td>'
                                   f'<td style="padding:10px 14px;font:600 12px \'IBM Plex Mono\',monospace;color:{"var(--success)" if ok else "var(--danger)"}">{r:.2f}:1</td>')
        rows += (f'<tr><td style="padding:10px 14px;font:12px \'IBM Plex Mono\',monospace;color:var(--fg-muted)">{NAMES.get(t, t)}</td>'
                 + cell(v['--fg-locked'], lo, lo >= 4.5) + cell(v['--fg-faint'], fa, fa >= 4.5) + '</tr>')
    th = "padding:8px 14px;text-align:left;font:500 10.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)"
    return (f'<table style="border-collapse:collapse;border:1px solid var(--border-strong);border-radius:12px;overflow:hidden;background:var(--surface)">'
            f'<tr><th style="{th}">Theme</th><th style="{th}">Shipped · --fg-locked</th><th style="{th}"></th><th style="{th}">Drawn · --fg-faint</th><th style="{th}"></th></tr>'
            f'{rows}</table>')


# ---- (b) ---------------------------------------------------------------------------------------------------------
GHOST = ("display:inline-flex;align-items:center;justify-content:center;border-radius:10px;font:600 14px 'IBM Plex Sans';"
         "background:transparent;color:var(--fg);border:1px solid var(--border-strong);padding:0 16px;text-decoration:none")


def discover(phone, query='ghalta', recommended=True):
    s = scr(P, '<b>7 · For you search</b> · ' + ('390' if phone else 'desktop'))
    s = L.sub1(s, '<a class="on" href="#">For you</a><a href="#">Discover</a>', '<a href="#">For you</a><a class="on" href="#">Discover</a>')
    s = L.sub1(s, 'head-foryou.png', 'head-discover.png')
    s = L.sub1(s, '<span style="flex:1">ghal</span>', f'<span style="flex:1">{query}</span>')
    i = s.find('<div class="zs">'); old = L.block(s, i)
    if recommended:
        h = 'height:48px' if phone else 'height:32px;border-radius:8px;font-size:12.5px;padding:0 14px'
        new = ('<div class="zs new9" style="outline-offset:-10px;border-radius:12px"><div class="dr"><i></i><i></i><i></i></div><h3>No commander by that name</h3>'
               f'<p>Nothing here matches “{query}”. This lane lists the 3,068 commanders you don’t own. If you already own it, it’s on your commanders instead.</p>'
               f'<div class="acts"><a class="btnp" href="#">Clear search</a><a href="#" style="{GHOST};{h}">Search your commanders</a></div></div>')
    else:
        new = old.replace('<span class="draft">DRAFT</span>', '').replace('Its page still opens.', '')
    return s.replace(old, new)


def foryou_held(phone):
    s = scr(P, '<b>7 · For you search</b> · ' + ('390' if phone else 'desktop'))
    s = L.sub1(s, '<span style="flex:1">ghal</span>', '<span style="flex:1">ghalta</span>')
    return s.replace('<span class="draft">DRAFT</span>', '').replace(' Its page still opens.', '')


# ---- (c) ---------------------------------------------------------------------------------------------------------
ASIDE = ('<div role="status" class="new9" style="border-radius:8px;padding:12px 14px;background:var(--surface);border:1px solid var(--border-strong);border-left:2px solid var(--accent)">'
         "<p style=\"margin:0;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px;font-size:12.5px;line-height:1.6;color:var(--fg-muted)\">"
         '<span><span style="color:var(--fg)">Aang, Swift Savior</span> also matches, but you hid it, so it stays out of your lists.</span>'
         "<a href=\"#\" style=\"font:11.5px 'IBM Plex Mono',monospace;color:var(--accent-text);text-decoration:none\">Open its page</a></p></div>")


def foryou_aang(phone):
    s = scr(U, '<b>12 · Hide failed</b> · ' + ('390' if phone else 'desktop'))
    i = s.find('<div class="t10'); 
    i = s.find('<div class="toast"'); s = s.replace(L.block(s, i), '')
    # search field over the head capture, as the Page board draws it
    p = scr(P, '<b>7 · For you search</b> · ' + ('390' if phone else 'desktop'))
    i = p.find('<div style="position:relative">'); field = L.block(p, i).replace('<span style="flex:1">ghal</span>', '<span style="flex:1">aang</span>')
    cap = 'art/ph-head-foryou.png' if phone else 'art/dk-head-foryou.png'
    j = s.find(f'<img class="cap-img" src="{cap}"'); k = s.find('>', j) + 1
    s = s[:j] + field + s[k:]
    # the list: the aside, then the one visible match
    i = s.find('<div class="list">'); lst = L.block(s, i)
    rows = re.findall(r'<div class="crow ">', lst)
    first = L.block(lst, lst.find('<div class="crow '))
    aang = (first.replace('crop-ghalta.jpg', 'crop-aang.jpg').replace('Ghalta, Primal Hunger', 'Aang and Katara')
            .replace('<i style="width:8px;height:8px;border-radius:1.5px;background:var(--g)"></i>',
                     '<i style="width:8px;height:8px;border-radius:1.5px;background:var(--g)"></i><i style="width:8px;height:8px;border-radius:1.5px;background:var(--u)"></i><i style="width:8px;height:8px;border-radius:1.5px;background:var(--w)"></i>')
            .replace('<b>74</b>', '<b>69</b>').replace('width:74%', 'width:69%')
            .replace('Ghalta decks ramp into the biggest creatures they can find and win in combat with trample.',
                     'Aang and Katara decks flood the board with tokens, usually layering in allies and +1/+1 counters to reward a wide, synergistic creature base.')
            .replace('<b>Big Mana</b>, <b>Stompy</b> and <b>Ramp</b>', '<b>Tokens</b>, <b>Blink</b> and <b>+1/+1 Counters</b>')
            .replace('8,902 decks tracked', '1,486 decks tracked'))
    gap = 'margin-bottom:2px' 
    newlist = '<div class="list"><div style="' + gap + '">' + ASIDE + '</div>' + aang + '</div>'
    return s.replace(lst, newlist)


def build():
    b = L.head('Small items 10 · R1 · account 2 · 2026-11-02 · item 3 · hide a commander', 'Hide: one color and two searches',
               'Three follow-ups on the shipped Hide (<code>hide-commander.tsx</code>, <code>excluded-report.ts</code>, <code>discovery-view.tsx</code>), drawn over the shipped boards of '
               '<code>design_handoff_the99_hide_commander</code>. Dashed outlines mark what changes.')
    b += L.sec('(a) Not ranked while hidden: 4.5:1')
    b += L.frames(
        L.fr('<b>A1</b> · 390 · its page, hidden', page('<b>7 · Its page, hidden</b> · 390'),
             'The clause takes the look of the rank it replaces (<i>Rank #4</i>): mono 13 in <code>--fg-faint</code>. Shipped is <code>--fg-locked</code>, which is kept under 4.5:1 on purpose for locked controls; this is a sentence, not a lock.', SC),
        L.fr('<b>A3</b> · the clause on the hero’s ground (<code>--surface-rail</code>), every theme', contrast(),
             'Measured from <code>globals.css</code>. <code>--fg-faint</code> clears 4.5:1 in all six themes (5.1 to 5.9); <code>--fg-locked</code> sits at 3.1 to 3.4. No new token, no size change.', None, 640),
    )
    b += L.frames(L.fr('<b>A2</b> · 1300 · the same', page('<b>7 · Its page, hidden</b> · desktop'),
                       'Desktop puts the clause after the score, as shipped; only its color moves.', SC, 1300))
    b += L.sec('(b) Discover, searching a commander you own and hid from For you')
    b += L.frames(
        L.fr('<span class="now">now</span><b>B1</b> · 390 · shipped', discover(True, recommended=False),
             'Discover says Ghalta is here and you hid it. But Discover lists commanders you don’t own: Unhide puts Ghalta back in For you, never here, so “here” is wrong.', SC),
        L.fr('<span class="rec">rec</span><b>B2</b> · 390 · Discover’s normal no-match', discover(True),
             'Recommended: Discover answers as it would if Ghalta weren’t hidden, with the shipped <code>DiscoveryEmpty</code>. Its own second press, <b>Search your commanders</b>, carries the query to For you.', SC),
        L.fr('<b>B3</b> · 390 · where that press lands', foryou_held(True),
             'For you’s held state, as shipped: <i>Ghalta, Primal Hunger is here. You hid it</i>, and <b>Open its page</b>. Each list reports only the hides that unhiding would put back in it, as For you’s own search already does (<code>findOwnedExcludedMatches</code>).', SC),
    )
    b += L.frames(L.fr('<span class="rec">rec</span><b>B4</b> · 1300 · Discover’s normal no-match', discover(False),
                       'The same at 1300: the shipped empty’s two presses side by side, 32px.', SC, 1300))
    b += L.sec('(c) For you, a search that matches a visible commander and a hidden one')
    b += L.frames(
        L.fr('<span class="rec">rec</span><b>C1</b> · 390 · “aang”: one shown, one hidden', foryou_aang(True),
             'Yes, the one-line aside, as Discover already draws it above a live list: the shipped <code>ExcludedMatchAside</code> with <code>hiddenAlso</code> and <b>Open its page</b>. '
             'Fixture: Aang and Katara is owned here; Aang, Swift Savior is hidden.', SC),
    )
    b += L.frames(L.fr('<span class="rec">rec</span><b>C2</b> · 1300 · the same', foryou_aang(False),
                       'Above the rows, at the list’s width. No new copy: <code>hiddenAlso</code>, <code>hiddenMore</code> (two or more), <code>hiddenCta</code> ship.', SC, 1300))
    b += L.rule('The calls', [
        '<b>(a)</b> <i>Not ranked while hidden</i> in <code>--fg-faint</code>, mono 13, as <i>Rank #N</i>. 5.1:1 or better in every theme on the hero. One color in <code>HeroRankClause</code>.',
        '<b>(b) Recommended: Discover’s normal no-match.</b> Discover reports a hidden match only when it is one of its own (not owned). An owned commander hidden from For you is For you’s to report; Discover’s <i>Search your commanders</i> takes the reader there. '
        'Build: <code>findExcludedMatches</code> drops owned matches from its <code>hidden</code> cause. If you’d rather keep Discover’s line, it needs a different body (unhiding puts it in For you), which is new copy for review.',
        '<b>(c) Recommended: yes.</b> For you asks the server on every settled query, not only when nothing matched, and draws the aside above its rows. One request a settled query, as Discover already does.'])
    return L.doc('Small items 10 · Hide', L.scope(L.helmet(P), SC) + L.scope(L.helmet(U), SC), b, 1440)
