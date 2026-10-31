"""States 1 and 2 · the Hide control on a recommendation row, For you and Discover."""
import lib as L

def spec():
    cells = ''
    for st, lab, note in [('', 'Rest', 'bare glyph, --fg-faint, no plate'),
                          ('hov', 'Hover (fine pointer)', 'glyph --fg'),
                          ('prs', 'Pressed', '--elevated behind the glyph, glyph --fg'),
                          ('foc', 'Keyboard focus', 'the app’s 2px accent ring')]:
        cells += (f'<div style="display:flex;flex-direction:column;align-items:center;gap:12px;width:200px">'
                  f'<div style="width:132px;height:132px;background:var(--bg);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center">'
                  f'<div style="transform:scale(2.4)"><div class="tgt" style="width:44px;height:44px;display:flex"><button type="button" class="hb {st}" style="margin:0" aria-label="Hide">{L.EYE_OFF}</button></div></div></div>'
                  f'<p style="font:600 12px IBM Plex Sans;color:var(--fg)">{lab}</p><p class="m" style="font-size:11px;color:var(--fg-faint);text-align:center;line-height:1.5">{note}</p></div>')
    return (f'<div style="display:flex;gap:24px;padding:26px 28px;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface)">{cells}</div>')

def build():
    body = L.head('Hide a commander · R1 · account 2 · 2026-10-31', 'States 1–2 · The Hide control on a row (R1c, A)',
        '<b>R1c, option A (Hugh, 2026-10-31):</b> Hide sits at the <b>foot of the row, beside the fit bar</b>: a bare eye-slash glyph, <code>--fg-faint</code>, 16px, no plate, level with the bar. '
        'On the phone the bar gives up 50px to it; on desktop the bar keeps its 520px and the glyph sits at the row’s right edge, under the Fit chip. Its 44px target overlaps the row’s padding, so the row is no taller. The figures line stays as shipped. '
        'It sits above the row’s stretched link (<code>z-[2]</code>), so pressing it never opens the page. Same control, same place, in For you and Discover. Dashed outlines mark what is new.')
    fy = '<div class="list">' + L.crow('ghalta', 1, 'rest', ctrl_new=True) + L.crow('zimone', 2, 'rest') + '</div>'
    fy_p = '<div class="list">' + L.crow('ghalta', 1, 'prs', ctrl_new=True) + L.crow('zimone', 2, 'rest') + '</div>'
    dv = '<div class="list">' + L.crow('dina', 1, 'rest', lane='disc', ctrl_new=True) + L.crow('miku', 2, 'rest', lane='disc') + '</div>'
    body += '<div class="frames">'
    body += L.fr('<b>1 · For you</b> · 390 · at rest', L.phone(fy, count=2),
                 'Every row carries the glyph at the end of its fit bar, the last thing in the row. The strip gains a fourth tab, <b>Hidden</b> (state 4), with its count once anything is hidden (two, here, from earlier).')
    body += L.fr('<b>1 · For you</b> · 390 · pressed', L.phone(fy_p, count=2),
                 'Pressed: an <code>--elevated</code> square behind the glyph. On release the row is hidden at once: no confirm (state 3).')
    body += L.fr('<b>2 · Discover</b> · 390 · at rest', L.phone(dv, strip_on='discover', head='discover', count=2),
                 'Discover’s rows take the same glyph at the bar’s end; price and source stay as shipped.')
    body += '</div><div class="frames">'
    fyd = '<div class="list">' + L.crow('ghalta', 1, 'hov', ctrl_new=True) + L.crow('zimone', 2, 'rest') + '</div>'
    body += L.fr('<b>1 · For you</b> · desktop 1300 · hover on row 1', L.desk(fyd, count=2),
                 'Desktop: the bar keeps its 520px and legend; the glyph sits level with the bar at the row’s right edge, under the Fit chip. Hover lights it; its <code>title</code> and <code>aria-label</code> say <i>Hide Ghalta, Primal Hunger</i>.')
    dvd = '<div class="list">' + L.crow('dina', 1, 'rest', lane='disc', ctrl_new=True) + L.crow('miku', 2, 'rest', lane='disc') + '</div>'
    body += L.fr('<b>2 · Discover</b> · desktop 1300 · at rest', L.desk(dvd, strip_on='discover', head='discover', count=2),
                 'Discover at 1300. The glyph is always drawn, not only on hover, so a touch laptop and a keyboard reach it the same way.')
    body += '</div>'
    body += L.fr('<b>The glyph</b> · 2.4× · the 44px target dashed', spec(),
                 'Drawn 16px; the target is 44 at every pointer. Four states, no new token.')
    return L.doc('Hide · Rows', body, 2900)
