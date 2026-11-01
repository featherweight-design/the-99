"""Item 1 · Game history, filters that match nothing: Z1-Z3 drawn in game history addendum A1 (design-assets c7abb39),
carried here as this round's frame."""
import lib9 as L
s = L.load('gh_A1.dc.html')
SC = 'gh9'


def z(n):
    return L.screen(L.frame_by_label(s, f'<b>{n}</b>'))


def build():
    b = L.head('1 · Decks · Games · filters that match nothing',
               'No games match, and one way out',
               'Deck, Played against and Result combine, so together they can match nothing (Sai, Colin, Won). '
               'Drawn over the shipped Games view and its shipped filter sheet, as first drawn in game history addendum A1 '
               '(design-assets <code>c7abb39</code>, sent to Hugh with the audit answers and not yet merged). The copy follows the shipped Decks '
               'filter empty (<code>refresh.ts</code> <i>No decks match</i> / <i>Clear filters</i>).')
    b += L.frames(
        L.fr('<b>Z1</b> · 390 · Sai, Colin, Won: no games', z('Z1'),
             'The chips and <b>Clear all filters</b> stay; the count reads <i>0 games</i>. The headline, its lines, most played and the month heads go. '
             'One line, <b>No games match</b>, and one way out, <b>Clear filters</b>, as the shipped Decks grid does.', SC),
        L.fr('<b>Z3</b> · 390 · the sheet before it closes', z('Z3'),
             'Counts in the sheet are within the other filters, so Won reads 2 and Drawn 0. A zero option stays pressable (no disabled state); '
             'the button reads <i>Show 0 games</i>, and closing on it lands on Z1.', SC),
    )
    b += L.frames(
        L.fr('<b>Z2</b> · 1300 · the same', z('Z2'),
             'Each chip’s ✕ takes off one filter; Clear filters takes off all three. The dropdowns keep their values until then.', SC, 760),
    )
    b += L.rule('The call', [
        '<b>No games match</b> (new <code>games.noMatch</code>) and <b>Clear filters</b> (<code>games.clearFilters</code>), the shipped Decks empty’s words, in the list’s place.',
        'Kept: the view row, the deck select, the chips, <i>Clear all filters</i> and the count <i>0 games</i>. Gone: headline, span, most played, month heads, the window foot.',
        'The sheet never disables an option that would match nothing; its button counts what it would show, <i>Show 0 games</i> included.',
        'Same frames as addendum A1’s Z1–Z3. If A1 merges first, this board points to it; nothing differs.'])
    return L.doc('Small items 9 · Games, no match', L.scope(L.helmet(s), SC), b, 2000)
