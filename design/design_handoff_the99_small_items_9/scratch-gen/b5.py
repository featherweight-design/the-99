"""Item 5 · Rule 0 defaults: the seat notice past its 40-character title, Close the table while closing, Home at 1300
with no table, and first-run Home at 1300. Lifted from Rule 0 revisions' Notice, Table and Home boards, and Menu and
Home's Home-States (first run at 1300)."""
import re
import lib9 as L
n = L.load('rule_zero_revisions_Notice.dc.html')
t = L.load('rule_zero_revisions_Table.dc.html')
h = L.load('rule_zero_revisions_Home.dc.html')
m = L.load('mh_HomeStates.dc.html')
RN, RT, RH, MH = 'rzn9', 'rzt9', 'rzh9', 'mhs9'

HOST, POD = 'Christopher', 'Thursday Night Commander League'
OLD_W = '<b>Colin</b> seated you at <b>Thursday night</b>’s table.'
NEW_W = f'<b>{HOST}</b> seated you at <b>{POD}</b>’s table.'
OLD_P = '<b>Colin seated you at Thursday night’s table</b><br>You’re seated with Ghalta Stompy.'
TITLE = f'{HOST} seated you at {POD}’s table'
NEW_P = f'<b>{HOST} seated you</b><br>At {POD}’s table, with Ghalta Stompy.'
CLIP_P = f'<b>{TITLE[:39].rstrip()}…</b><br>You’re seated with Ghalta Stompy.'


def notice(lab, old, new):
    return L.sub1(L.zscreen(n, lab), old, new)


def closing(lab, phone):
    x = L.zscreen(t, lab)
    i = x.find('class="zca"')
    a, b = x[:i], x[i:]
    if phone:
        b = L.sub1(b, '<button class="btn dan full">Close the table</button><button class="btn gho full">Keep it open</button>',
                   '<button class="btn dan full held9 new9" aria-busy="true">Closing…</button><button class="btn gho full held9">Keep it open</button>')
    else:
        b = L.sub1(b, '<button class="btn gho sm">Keep it open</button><button class="btn dan sm">Close the table</button>',
                   '<button class="btn gho sm held9">Keep it open</button><button class="btn dan sm held9 new9" aria-busy="true">Closing…</button>')
    b = b.replace('<span class="zx">✕</span>', '<span class="zx held9">✕</span>', 1)
    a2 = a.replace('<span class="zx">✕</span>', '<span class="zx held9">✕</span>')
    return a2 + b


H6 = L.zscreen(h, '<b>H6</b> · 1300')
H8 = L.zscreen(h, '<b>H8</b> · 1300')
CARD = L.block(H8, H8.find('<div class="tc ztc zw znew">'))
NOTABLE = L.cut(H6, '<div class="tc ztc zw znew">')
FR = L.screen(L.frame_by_label(m, '<b>First run</b> · 1300'))
hd = FR.find('<div class="frhd">')
hdb = L.block(FR, hd)
FIRST = FR[:hd + len(hdb)] + f'<div class="{RH}" style="display:block;margin:14px 27px"><div class="dk" style="width:auto;display:block;border:0;border-radius:0;background:transparent;overflow:visible">{CARD}</div></div>' + FR[hd + len(hdb):]

CSS = f"""<style>
.{RT} .held9{{opacity:.6;cursor:default}}
.{RT} .zx.held9{{opacity:.6}}
.{RN} .lng9 .znt{{align-items:flex-start}}
.{RN} .lng9 .znt .o,.{RN} .lng9 .znt .x{{margin-top:-4px}}
.{RH} .dk .tc.zw{{margin:0!important;width:auto!important}}\n.{RH} .dk .tc.zw p{{text-wrap:pretty}}
.{RN} .clip9{{outline:1.5px dashed var(--danger);outline-offset:3px;border-radius:14px}}
</style>"""


def build():
    b = L.head('5 · Rule 0 · four defaults nobody drew',
               'Long names, a close in flight, and Home at 1300 without a table and on first run',
               'Drawn over Rule 0 revisions’ Notice, Table and Home boards (Low Sun captures), and Menu and Home’s first run at 1300. '
               f'The long names: <i>{TITLE}</i> is {len(TITLE)} characters, past the push title’s 40.')
    b += L.sec('5a · the seat notice past 40 characters')
    lng = lambda x: f'<div class="lng9" style="display:contents">{x}</div>'
    b += L.frames(
        L.fr('<span class="rec">call</span><b>N1</b> · 390 · in the app', lng(notice('390 · on another screen', OLD_W, NEW_W)),
             '<b>The toast never clips a name.</b> The sentence wraps (three lines at 390); Open and ✕ hold the first line’s top, as the shared toast does with a long line. '
             'The 40-character cap is the push’s only.', RN),
        L.fr('<span class="now">as shipped</span><b>N2</b> · 390 · the push, clipped', f'<div class="clip9">{notice("390 · the push, lock screen", OLD_P, CLIP_P)}</div>',
             'Today <code>payloadFor</code> cuts the title, so the pod’s name loses its end and <i>table</i> never shows.', RN),
        L.fr('<span class="rec">call</span><b>N3</b> · 390 · the push, split', notice('390 · the push, lock screen', OLD_P, NEW_P),
             '<b>Over 40, the title is the host alone</b> (<i>Christopher seated you</i>) and the pod moves to the body’s front: <i>At {pod}’s table, with {deck}.</i> '
             '(or <i>At {pod}’s table. Pick your deck there.</i>). DRAFT. Nothing is cut until the body’s own 120.', RN),
    )
    b += L.frames(
        L.fr('<span class="rec">call</span><b>N4</b> · 1300 · in the app', lng(notice('1300 · on another screen', OLD_W, NEW_W)),
             'Two lines in the 380 slot.', RN, 760),
        L.fr('<span class="rec">call</span><b>N5</b> · 1300 · the push, a computer', notice('1300 · the push, a computer', OLD_P, NEW_P),
             'The same split in a browser banner.', RN),
    )
    b += L.sec('5b · Close the table, while it closes')
    b += L.frames(
        L.fr('<b>C6</b> · 390 · Close the table pressed', closing('<b>C2</b> · 390 · the confirm', True),
             'The shared confirm’s pending shape (<code>DeleteConfirm</code>’s <i>Deleting…</i>): the danger button reads <b>Closing…</b>' + L.DRAFT +
             ', both buttons and the ✕ held at 60% (<code>aria-disabled</code>, focus kept), a scrim press ignored. '
             'Success closes the sheet onto the closed table (C3); a refusal closes it and shows the shipped toast.', RT),
        L.fr('<b>C7</b> · 1300 · the same', closing('<b>C2</b> · 1300 · the confirm', False),
             'The modal holds the same way; Esc is ignored until the answer lands.', RT, 760),
    )
    b += L.sec('5c · Home at 1300 with no table, and on first run')
    b += L.frames(
        L.fr('<b>H12</b> · 1300 · no open table', NOTABLE,
             '<b>No table, no gap.</b> The main column starts at the precon/spare lead as shipped; the right column is unchanged. Same as H4 at 390.', RH, 760),
    )
    b += L.frames(
        L.fr('<b>H13</b> · 1300 · first run, seated', FIRST,
             '<b>Above the checklist.</b> A player with no cards yet can be seated (no deck: <i>Pick your deck at the table.</i>). The card sits under <i>Welcome to The 99</i>, '
             'above the About line, welcome credits and step 1, in the same one-row layout as H8, at the first-run column’s width. With no table, first run is exactly as shipped.', MH, 760),
    )
    b += L.rule('The calls', [
        '<b>Seat notice, in the app:</b> no cap. Names wrap; Open and ✕ top-align. Nothing new beyond the shared toast’s wrap.',
        f'<b>Seat push over 40:</b> title <i>{{host}} seated you</i>; body <i>At {{pod}}’s table, with {{deck}}.</i> / <i>At {{pod}}’s table. Pick your deck there.</i> (DRAFT). '
        'At 40 or under, the copy-reviewed title and body as shipped. A host name alone past 40 is cut with an ellipsis (the only cut).',
        '<b>Closing:</b> <i>Closing…</i> (DRAFT) on the danger button; both buttons and ✕ held at 60%; no spinner, no new toast.',
        '<b>Home 1300, no table:</b> as shipped, no slot. <b>First run 1300:</b> the card above the About line and the checklist, one row.'])
    helm = L.scope(L.helmet(n), RN) + L.scope(L.helmet(t), RT) + L.scope(L.helmet(h), RH) + L.scope(L.helmet(m), MH) + CSS
    return L.doc('Small items 9 · Rule 0 defaults', helm, b, 2000)
