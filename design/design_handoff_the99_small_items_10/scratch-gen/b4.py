"""Item 4 · Game history filters: engineering's four defaults, confirmed, with one redraw (the Played against mark).
Frames rebuilt from game_history/Populated (P1 to P6): the shipped Games view, its filter sheet and its anchored panel."""
import lib10 as L, re
S = L.load('design_handoff_the99_game_history/Populated.dc.html')
SC = 'gh10'
P1, P2, P3, P4, P5, P6 = (L.frame_by_label(S, f'<b>P{i}</b>') for i in range(1, 7))
ROWS = {k: [L.block(f, m.start(), 'li') for m in re.finditer(r'<li class="q-gr', f)] for k, f in (('p', P1), ('d', P2))}
# P1/P2 order: 0 Sai Oct 30, 1 Lathliss Oct 30, 2 Dina Oct 24, 3 Dina Oct 17, 4 Ashling Oct 9, 5 Sai Oct 2, 6 Zada Sep 26, 7 Dina Sep 19
SEG = '<span class="seg"><span class="">Decks</span><span class="on">Games</span><span class="">Stats</span></span>'


def scr(f):
    return L.screen(f)


def months(groups, k):
    h = ''
    for name, idx in groups:
        h += f'<div class="q-mh">{name}<em>{len(idx)} {"game" if len(idx) == 1 else "games"}</em></div><ul class="q-gl">' + ''.join(ROWS[k][i] for i in idx) + '</ul>'
    return h


def summary(head, lines, new_note=None):
    h = f'<div class="q-sum"><h3>{head}</h3>' + ''.join(f'<div class="q-ln">{x}</div>' for x in lines)
    if new_note:
        h += new_note
    return h + '</div>'


GONE = lambda t: (f'<div class="new9" style="margin-top:6px;padding:4px 8px;border-radius:6px;font:11.5px \'IBM Plex Mono\',monospace;'
                  f'color:var(--fg-faint);text-decoration:line-through;text-decoration-color:rgba(198,83,63,.8)">{t}</div>')


def phone(base, deck, n, chips, count, summ, body=None, height=None):
    s = scr(base)
    if height:
        s = s.replace('style="height:1700px"', f'style="height:{height}px"', 1)
    a = s.find('<div class="vrw">'); b = s.rfind('</ul>') + 5
    if body is None:
        body = s[s.find('<div class="q-mh">'):b]
    vrw = f'<div class="vrw">{SEG}<span class="q-shp">{deck}<small>{n}</small><i>&#9662;</i></span></div>'
    badge = f'<b>{len(chips)}</b>' if chips else ''
    frow = f'<div class="q-frow"><span class="fbt">Filter games{badge}</span></div>'
    chl = ('<div class="chl">' + (''.join(f'<span class="chp">{c}<i>✕</i></span>' for c in chips) + '<span class="clr on">Clear all filters</span>'
                                  if chips else '<span>No filters on</span><span class="clr">Clear all filters</span>') + '</div>')
    return s[:a] + vrw + frow + chl + f'<div class="cnt">{count}</div>' + summ + body + s[b:]


def desk(base, dd, chips, count, summ, body=None, height=None):
    s = scr(base)
    if height:
        s = s.replace('height:1180px', f'height:{height}px', 1)
    a = s.find('<div class="vrw">'); b = s.rfind('</ul>') + 5
    if body is None:
        body = s[s.find('<div class="q-mh">'):b]
    dds = ''.join(f'<span class="q-dd{" q-set" if on else ""}">{t}<i>&#9662;</i></span>' for t, on in dd)
    chl = ('<div class="chl">' + (''.join(f'<span class="chp">{c}<i>✕</i></span>' for c in chips) + '<span class="clr on">Clear all filters</span>'
                                  if chips else '<span>No filters on</span><span class="clr">Clear all filters</span>') + '</div>')
    return s[:a] + f'<div class="vrw">{SEG}<span class="vsep"></span>{dds}</div>' + chl + f'<div class="cnt">{count}</div>' + summ + body + s[b:]


def one_value(h, pick='Peter'):
    """Played against holds one value: the chosen row keeps the shipped filled tick; the empty boxes go (they read as many)."""
    h = h.replace('<span class="q-bx on"></span>', '<span class="q-bx"></span>')
    h = h.replace('<span class="q-bx"></span>', '')
    i = h.find(f'<span>{pick}</span>'); j = h.find('</div>', i)
    return h[:j] + '<span class="q-bx on new9"></span>' + h[j:]


def sheet(pick=None, show='Show 23 games', clear_on=True):
    s = scr(P5)
    a = s.find('<div class="sht2">'); sh = L.block(s, a)
    new = sh
    if pick:
        new = one_value(new, pick)
    else:
        new = new.replace('<span class="q-bx on"></span>', '').replace('<span class="q-bx"></span>', '')
    new = L.sub1(new, '<span class="bp">Show 9 games</span>', f'<span class="bp">{show}</span>')
    if not clear_on:
        new = L.sub1(new, '<span class="bg">Clear all</span>',
                     '<span class="bg new9" aria-disabled="true" style="color:var(--fg-locked);border-color:var(--border);cursor:default">Clear all</span>')
    s = s[:a] + new + s[a + len(sh):]
    # the page behind the sheet: All decks, nothing on
    s = s.replace('<span class="q-shp">HD - Sai<small>5</small>', '<span class="q-shp">All decks<small>6</small>')
    s = s.replace('<div class="cnt">9 games</div><div class="q-sum"><h3>9 games logged.</h3>',
                  '<div class="cnt">23 games</div><div class="q-sum"><h3>23 games logged. 9–12–2.</h3>')
    if pick:
        s = s.replace('<span class="fbt">Filter games</span>', '<span class="fbt">Filter games<b>1</b></span>')
        s = s.replace('<div class="chl"><span>No filters on</span><span class="clr">Clear all filters</span></div>',
                      f'<div class="chl"><span class="chp">{pick}<i>✕</i></span><span class="clr on">Clear all filters</span></div>')
        s = s.replace('<div class="cnt">23 games</div><div class="q-sum"><h3>23 games logged. 9–12–2.</h3>',
                      '<div class="cnt">15 games</div><div class="q-sum"><h3>15 games logged. 5–9–1.</h3>')
    return s


def panel():
    s = scr(P6)
    a = s.find('<div class="apn"'); ap = L.block(s, a)
    s = s[:a] + one_value(ap, 'Peter') + s[a + len(ap):]
    s = s.replace('<span class="q-dd q-set">Colin<i>', '<span class="q-dd q-set">Peter<i>')
    s = s.replace('<span class="chp">Colin<i>✕</i></span>', '<span class="chp">Peter<i>✕</i></span>')
    s = s.replace('<div class="cnt">5 games</div>', '<div class="cnt">4 games</div>')
    s = s.replace('<h3>5 games logged. 2–3.</h3>', '<h3>4 games logged. 1–3.</h3>')
    s = s.replace('<b>HD - Sai</b> with <b>Colin</b> at the table · pods of 4 · Aug to Oct 2026', '<b>HD - Sai</b> with <b>Peter</b> at the table · pods of 4 · Aug to Oct 2026')
    s = s.replace(' Colin won 2 of the 3 you lost', ' Peter won 1 of the 3 you lost')
    return s


SAI_P = months([('October 2026', [0, 5])], 'p')
SAI_D = months([('October 2026', [0, 5])], 'd')
DINA_P = months([('October 2026', [2]), ('September 2026', [7])], 'p')
DINA_D = months([('October 2026', [2]), ('September 2026', [7])], 'd')


def build():
    b = L.head('Small items 10 · R1 · account 2 · 2026-11-02 · item 4 · game history filters',
               'Four defaults engineering chose: confirmed, one mark redrawn',
               'Drawn over the shipped Games view, its <i>Filter games</i> sheet and its anchored panel (<code>games-view.tsx</code>, <code>games-filter-controls.tsx</code>), '
               'from the game history handoff’s Populated board. Fixtures as there: 23 games, 6 decks; HD - Sai’s five games all had Colin at the table, four of them Peter.')
    b += L.sec('(a) Played against takes one value')
    b += L.frames(
        L.fr('<span class="rec">confirm</span><b>G1</b> · 390 · Peter pressed after Colin', sheet('Peter', 'Show 15 games'),
             'One value, as built (<code>pickAgainst</code>): Peter replaces Colin; pressing Peter again clears it. <b>Redraw:</b> the empty boxes go and only the chosen row keeps the filled tick, '
             'so the list stops promising many. The shipped list draws a box on every row.', SC),
        L.fr('<span class="rec">confirm</span><b>G2</b> · 1300 · the panel, the same', panel(),
             'The anchored panel takes the same mark. One value fits the summary, which answers one table: <i>with Peter at the table</i>, <i>Peter won 1 of the 3 you lost</i>. '
             'A link that names both a friend and a commander keeps the friend, as built.', SC, 1300),
    )
    b += L.sec('(b) Most played is hidden under a deck filter')
    b += L.frames(
        L.fr('<span class="rec">confirm</span><b>G3</b> · 390 · HD - Sai, nothing else', phone(P3, 'HD - Sai', '5', [], '5 games',
             summary('5 games logged. 2–3.', ['<b>HD - Sai</b> · pods of 4 · Aug to Oct 2026'], GONE('most played HD - Sai, 5 of 5'))),
             'Under a deck filter every game is that deck, so most played could only say <i>HD - Sai, 5 of 5</i>. Hidden, as built. The facts line names the deck instead of a count.', SC),
        L.fr('<span class="rec">confirm</span><b>G5</b> · 390 · HD - Dina against Chris: 2 games', phone(P3, 'HD - Dina', '8', ['Chris'], '2 games',
             summary('2 games logged. 1–1.', ['<b>HD - Dina</b> with <b>Chris</b> at the table · pods of 3–4 · Sep to Oct 2026'],
                     GONE('Games from every deck land here, newest first.')), DINA_P, 1180),
             '(c) Two games under a filter: the low-games line stays off, as built. It says where games come from, which is about the whole list; a filter answers a narrower question.', SC),
        L.fr('<span class="rec">confirm</span><b>G7</b> · 390 · Filter games with nothing on', sheet(None, 'Show 23 games', clear_on=False),
             '(d) <b>Clear all</b> stays and goes inert, as built, matching the chassis’s <i>Clear all filters</i> (“present and inert, never absent”). '
             '<b>Redraw:</b> inert reads, in <code>--fg-locked</code> on a <code>--border</code> edge. The shared <code>GhostButton</code> draws disabled exactly as enabled today.', SC),
    )
    b += L.frames(
        L.fr('<span class="rec">confirm</span><b>G4</b> · 1300 · HD - Sai, nothing else', desk(P4, [('HD - Sai', True), ('Any result', False), ('Played against', False)], ['HD - Sai'], '5 games',
             summary('5 games logged. 2–3.', ['<b>HD - Sai</b> · pods of 4 · Aug to Oct 2026'], GONE('most played HD - Sai, 5 of 5'))),
             'The same at 1300.', SC, 1300))
    b += L.frames(
        L.fr('<span class="rec">confirm</span><b>G6</b> · 1300 · HD - Dina against Chris: 2 games', desk(P4, [('HD - Dina', True), ('Any result', False), ('Chris', True)], ['HD - Dina', 'Chris'], '2 games',
             summary('2 games logged. 1–1.', ['<b>HD - Dina</b> with <b>Chris</b> at the table · pods of 3–4 · Sep to Oct 2026'],
                     GONE('Games from every deck land here, newest first.')), DINA_D, 760),
             'The same at 1300. Desktop has no sheet: its <i>Clear all filters</i> is the chassis’s, already inert when nothing is on (P2 as shipped).', SC, 1300))
    b += L.rule('The calls', [
        '<b>(a) Confirm one value.</b> Played against holds one friend or one commander; a friend wins when a link names both. <b>Redraw the mark:</b> only the chosen row carries the filled tick (accent, 18px, radius 5); unchosen rows draw no box. One class in <code>AgainstList</code>.',
        '<b>(b) Confirm:</b> most played hides under a deck filter (it would always name that deck, n of n).',
        '<b>(c) Confirm:</b> the low-games line shows only with no filter on. Struck-through lines on these frames mark what stays off; they are not drawn.',
        '<b>(d) Confirm Clear all inert when nothing is on</b>, never hidden. <b>Redraw:</b> the sheet’s Clear all reads inert: label <code>--fg-locked</code>, edge <code>--border</code>, no hover. A local class on the sheet’s button, not a change to <code>GhostButton</code>.'])
    return L.doc('Small items 10 · Game history filters', L.scope(L.helmet(S), SC), b, 1440)
