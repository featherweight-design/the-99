"""R1c · three placements for the row's Hide control on a phone."""
import lib as L

def lst(place, st='rest'):
    return '<div class="list">' + L.crow('ghalta', 1, st, ctrl_new=True, place=place) + L.crow('zimone', 2, 'rest', place=place) + '</div>'

def build():
    body = L.head('Hide a commander · R1c · account 2 · 2026-10-31', 'The row’s Hide control · three placements',
        '<b>R1c (Hugh):</b> at the end of the figures line the glyph floats just above the fit bar and reads as stray on a phone. Three ways to seat it, all at the foot of the row, none on the art. '
        '<b>Recommended: A</b>, the glyph closes the fit bar’s line: the bar gives up 50px, the glyph centres on it, and the row stays the same height. Same states, target and behaviour as R1b in every option.', tag='R1c')
    body += '<div class="frames">'
    body += L.fr('<b>A · beside the fit bar</b> · 390 · recommended', L.phone(lst('bar'), count=2),
                 'The bar ends short and the glyph sits on its line, the last thing in the row. The figures line goes back to exactly as shipped. Row height unchanged.')
    body += L.fr('<b>B · in the figures line, after the count</b> · 390', L.phone(lst('inline'), count=2),
                 'The glyph follows <i>8,902 decks tracked</i> like one more figure, left-aligned, nothing at the right edge. Quietest, but it reads as part of the stat and is the easiest to miss.')
    body += L.fr('<b>C · its own foot line, labelled</b> · 390', L.phone(lst('foot'), count=2),
                 'A small <i>Hide</i> label with the glyph, right-aligned under the bar, the same words as the page’s text line. Clearest, but every row grows about 18px and the list shows less.')
    body += '</div><div class="frames">'
    dv = '<div class="list">' + L.crow('dina', 1, 'rest', lane='disc', ctrl_new=True, place='bar') + L.crow('miku', 2, 'rest', lane='disc', place='bar') + '</div>'
    body += L.fr('<b>A · Discover</b> · 390', L.phone(dv, strip_on='discover', head='discover', count=2),
                 'Discover keeps its price and source line as shipped; the glyph sits at the bar’s end as in For you.')
    fyd = '<div class="list">' + L.crow('ghalta', 1, 'hov', ctrl_new=True, place='bar') + L.crow('zimone', 2, 'rest', place='bar') + '</div>'
    body += L.fr('<b>A · For you</b> · desktop 1300 · hover on row 1', L.desk(fyd, count=2),
                 'Desktop: the bar keeps its shipped 520px and legend; the glyph sits level with the bar at the row’s right edge, under the Fit chip.')
    body += '</div>'
    return L.doc('Hide · Placement', body, 2900)
