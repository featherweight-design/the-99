"""States 1 and 2 · the Hide control on a recommendation row, For you and Discover."""
import lib as L

def spec():
    cells = ''
    for st, lab, note in [('', 'Rest', '--bg plate, --border-strong hairline, glyph --fg-muted'),
                          ('hov', 'Hover (fine pointer)', '--elevated-hover, glyph --fg'),
                          ('prs', 'Pressed', '--elevated, accent edge, glyph --fg'),
                          ('foc', 'Keyboard focus', 'the app’s 2px accent ring')]:
        cells += (f'<div style="display:flex;flex-direction:column;align-items:center;gap:12px;width:200px">'
                  f'<div style="position:relative;width:132px;height:132px;background:linear-gradient(135deg,#5b6b55,#2a2a22);border-radius:10px;display:flex;align-items:center;justify-content:center">'
                  f'<div style="transform:scale(2.4)"><div class="tgt" style="width:44px;height:44px;position:relative">{L.plate(st, style="position:absolute;inset:0")}</div></div></div>'
                  f'<p style="font:600 12px IBM Plex Sans;color:var(--fg)">{lab}</p><p class="m" style="font-size:11px;color:var(--fg-faint);text-align:center;line-height:1.5">{note}</p></div>')
    return (f'<div style="display:flex;gap:24px;padding:26px 28px;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface)">{cells}</div>')

def build():
    body = L.head('Hide a commander · R1 · account 2 · 2026-10-31', 'States 1–2 · The Hide control on a row',
        'The row’s band has one empty corner at both widths: top right, across from the art. Hide takes it, drawn as <b>the plate</b> every control over art already draws '
        '(<code>full-card-trigger.tsx</code>: 26px, opaque <code>--bg</code>, one <code>--border-strong</code> hairline, radius 7, centred in a 44px target). '
        'The glyph is an eye with a slash. The row’s stretched link stays under it; the plate sits above it (<code>z-[2]</code>), so a press on the plate never opens the page. '
        'Same control, same place, in For you and Discover. Dashed outlines mark what is new.')
    fy = '<div class="list">' + L.crow('ghalta', 1, 'rest', ctrl_new=True) + L.crow('zimone', 2, 'rest') + '</div>'
    fy_p = '<div class="list">' + L.crow('ghalta', 1, 'prs', ctrl_new=True) + L.crow('zimone', 2, 'rest') + '</div>'
    dv = '<div class="list">' + L.crow('dina', 1, 'rest', lane='disc', ctrl_new=True) + L.crow('miku', 2, 'rest', lane='disc') + '</div>'
    body += '<div class="frames">'
    body += L.fr('<b>1 · For you</b> · 390 · at rest', L.phone(fy, count=2),
                 'Every row carries the plate, top right of the band. The strip gains a fourth tab, <b>Hidden</b> (state 4), with its count once anything is hidden (two, here, from earlier).')
    body += L.fr('<b>1 · For you</b> · 390 · pressed', L.phone(fy_p, count=2),
                 'Pressed: the plate lifts to <code>--elevated</code> with an accent edge. On release the row is hidden at once: no confirm (state 3).')
    body += L.fr('<b>2 · Discover</b> · 390 · at rest', L.phone(dv, strip_on='discover', head='discover', count=2),
                 'Discover’s rows take the same plate. Nothing else on the row moves: Fit chip, figures, price and source stay as shipped.')
    body += '</div><div class="frames">'
    fyd = '<div class="list">' + L.crow('ghalta', 1, 'hov', ctrl_new=True) + L.crow('zimone', 2, 'rest') + '</div>'
    body += L.fr('<b>1 · For you</b> · desktop 1300 · hover on row 1', L.desk(fyd, count=2),
                 'Desktop: the same plate in the same corner, 20px in, over the empty right of the band. Hover lights it; its <code>title</code> and <code>aria-label</code> say <i>Hide Ghalta, Primal Hunger</i>.')
    dvd = '<div class="list">' + L.crow('dina', 1, 'rest', lane='disc', ctrl_new=True) + L.crow('miku', 2, 'rest', lane='disc') + '</div>'
    body += L.fr('<b>2 · Discover</b> · desktop 1300 · at rest', L.desk(dvd, strip_on='discover', head='discover', count=2),
                 'Discover at 1300. The plate is always drawn, not only on hover, so a touch laptop and a keyboard reach it the same way.')
    body += '</div>'
    body += L.fr('<b>The plate</b> · 2.4× · the 44px target dashed', spec(),
                 'Drawn 26px; the target is 44 at every pointer, inset so no part of it is clipped by the band. One plate, four states, no new token.')
    return L.doc('Hide · Rows', body, 2900)
