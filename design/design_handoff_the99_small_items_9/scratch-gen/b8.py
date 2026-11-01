"""Item 7 · Admin, delete a group: the Delete control at the foot of the group page, its confirm, the refused state for a
group with members or a flyer code, and the Groups list after a delete. Shell, list and confirm as Item 4 (b4.py), the
group page drawn from the shipped group-page.tsx, group-editor.tsx and groups-list.tsx."""
import lib9 as L
import b4
from b4 import adh, desk, phone, sh, dot, c, SC

TABS_D = b4.TABS_D
TABS_P = b4.TABS_P
GSUB = 'Named sets of accounts to switch together. One group per account.'
ACCTS = [('Colin R.', 'c•••@gmail.com', 'in friends'), ('Peter S.', 'p•••@hey.com', 'in friends'), ('Max T.', 'm•••@icloud.com', 'no group'),
         ('Chris L.', 'c•••@proton.me', 'in mox-boston'), ('Hugh H.', 'h•••@gmail.com', 'in testers')]


def ghead(name, desc):
    return f'<div class="adh"><span class="bk9">‹ Groups</span><h1 class="gn9">{name}</h1><p>{desc}</p></div>'


def fields(name, desc, credits=''):
    f = [('Name', name, 'lowercase, no spaces', True), ('Description', desc, 'only you read this', False),
         ('Daily credits', credits, 'Members get this many credits in a rolling 24 hours. Empty means the default.', True),
         ('Daily paid runs', '', 'How many runs a member’s paid and welcome credits can fund in a rolling 24 hours. Empty means 10.', True)]
    return '<div class="gf9">' + ''.join(
        f'<label><span class="fl">{l}</span><span class="fi{" mono" if m else ""}">{v}</span><span class="fh">{h}</span></label>' for l, v, h, m in f) + '</div>'


def members(sel, n=None, query=''):
    rows = ACCTS[:n] if n else ACCTS
    h = ''
    for i, (nm, em, sub) in enumerate(rows):
        s = nm in sel
        h += (f'<div class="mb9{" s" if s else ""}"><i class="cb9">{"<em></em>" if s else ""}</i><div><span><b>{nm}</b><small>{em}</small></span>'
              f'<span class="ms">{("in this group" if s else sub)}</span></div><span class="st">{"selected" if s else "unselected"}</span></div>')
    return (sh('Members', f'{len(sel)} selected') + '<span class="sf9">⌕ <i>Find an account by name</i></span>' + f'<div class="mbx9">{h}</div>')


def carries(items):
    if not items:
        return sh('Overrides this group carries', 'none') + '<p class="mu9">This group carries no overrides.</p>'
    h = ''.join(f'<li><span class="l">{l}</span><span class="v">{dot("on" if v == "On" else "off")}{v}</span><span class="o">Open the switch ›</span></li>' for l, v in items)
    return sh('Overrides this group carries', str(len(items))) + f'<ul class="gov9">{h}</ul>'


def history(lines):
    h = ''.join(f'<li><span>{t}</span><small>{w}</small></li>' for t, w in lines)
    return sh('History', f'{len(lines)} changes') + f'<ul class="ghi9">{h}</ul><p class="fn9">Times are UTC.</p>'


def topup():
    return (sh('Invites for every member') + '<div class="tu9"><label><span class="fl">Invites each</span><span class="fi mono"></span>'
            '<span class="fh">Tops every member up to this many invites.</span></label></div>')


def delete(state):
    return '<div class="dlr9"></div>' + _delete(state)


def _delete(state):
    """state: 'ok' (empty group), 'members', 'code', 'both'."""
    if state == 'ok':
        return ('<div class="del9 new9"><span class="dl">Delete this group</span>'
                '<span class="dh">Only an empty group can go: no members, no flyer codes.</span></div>')
    why = {'members': 'It still has 2 members. Unselect them above and save, then delete it.',
           'code': 'It has the flyer code MOXB7K. A flyer code keeps its group, even revoked, so this one stays.',
           'both': 'It still has 2 members and the flyer code MOXB7K. Only an empty group can go: no members, no flyer codes.'}[state]
    link = '<span class="lk">Flyer codes ›</span>' if state in ('code', 'both') else ''
    return (f'<div class="del9 new9 no"><span class="dl">Delete this group</span>'
            f'<span class="dw">{why}</span>{link}</div>')


EMPTY = ('1337-testers', 'early testers, before the flyer')
CARRY = [('Overview v2', 'On'), ('Suggested changes v2', 'On')]
HIST = [('You removed Max T.', 'Nov 1, 16:12'), ('You removed Chris L.', 'Nov 1, 16:12'), ('You set Overview v2 on', 'Oct 24, 09:30'),
        ('You created 1337-testers', 'Oct 20, 18:02')]
MOX = ('mox-boston', 'flyer sign-ups from Mox Boston')
MHIST = [('Flyer code MOXB7K made', 'Oct 29, 15:40'), ('You created mox-boston', 'Oct 29, 15:40')]


def gpage(name, desc, sel, carry, hist, state, credits=''):
    return (fields(name, desc, credits) + members(sel) + topup() + carries(carry) + history(hist) + delete(state))


def gphone_tail(sel, carry, hist, state, extra='', h=844):
    # scrolled to the page's foot: the members' last rows, overrides, history and Delete
    body = members(sel) + carries(carry) + history(hist) + delete(state)
    return phone('', body, h, extra).replace('class="scr9"', 'class="scr9 end9"')


def confirm(phone=False):
    facts = [('Members', 'None.'), ('Flyer codes', 'None.'),
             ('Overrides', 'Overview v2 on and Suggested changes v2 on go with it. They reach nobody now.'),
             ('History', 'Kept in the admin log, under the group’s name.')]
    dl = ''.join(f'<div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in facts)
    return (f'<div class="scrim9{" p" if phone else ""}"><div class="mc9{" p" if phone else ""}">{"<span class=grip9></span>" if phone else ""}'
            f'<h2>Delete 1337-testers?</h2>'
            f'<p>It’s empty, so deleting it changes nothing for any account. Its two feature-flag settings are removed with it, and the name is free to use again.</p>'
            f'<dl>{dl}</dl><div class="bt9"><span class="cn">Keep it</span><span class="kl">Delete the group</span></div></div></div>')


CARDS = [('friends', 5, 'friends and family', 'Colin R., Peter S., Odile M., Jun K., Priya N.', [('Swap tools', 'on')]),
         ('testers', 2, 'Hugh and Mara', 'Hugh H., Mara P.', [('Overview v2', 'on'), ('Proposed cuts', 'on')]),
         ('mox-boston', 2, 'flyer sign-ups from Mox Boston', 'Chris L., Sam W.', [])]


def glist(cards, phone=False, toast=False):
    h = ''
    for nm, n, d, m, ov in cards:
        chips = ''.join(f'<span class="chip9">{dot(v)}{l}: {v}</span>' for l, v in ov)
        h += (f'<li class="gc9"><div class="gt"><b>{nm}</b><small>{n}</small><span class="lk">Edit</span></div><span class="gd">{d}</span>'
              f'<span class="gm">{m}</span>{f"<div class=chips>{chips}</div>" if chips else ""}</li>')
    return (f'<div class="glh9"><div class="sh9"><h2>{len(cards)} groups</h2><small>212 accounts · 203 in no group</small></div><span class="lk">New group</span></div>'
            f'<ul class="gl9">{h}</ul>')


def toast(phone=False):
    return (f'<div class="tst9 new9{" p" if phone else ""}"><span>Deleted 1337-testers.</span><b>✕</b></div>')


CSS = """<style>
.cv9 .gn9{font-family:'IBM Plex Mono'!important;font-weight:500!important}
.cv9 .gf9{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:14px}
.cv9 .ph .gf9{grid-template-columns:minmax(0,1fr)}
.cv9 .gf9 label,.cv9 .tu9 label{display:flex;flex-direction:column;gap:6px;min-width:0}
.cv9 .fl{font-size:12.5px;color:var(--fg-muted)}
.cv9 .fi{height:38px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-sunken);display:flex;align-items:center;padding:0 12px;font-size:13.5px;color:var(--fg)}
.cv9 .fi.mono{font-family:'IBM Plex Mono'}
.cv9 .ph .fi{height:44px;font-size:16px}
.cv9 .fh{font-size:12px;line-height:1.5;color:var(--fg-faint)}
.cv9 .tu9{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);padding:14px 16px;max-width:520px}
.cv9 .mbx9{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);overflow:hidden}
.cv9 .mb9{display:flex;align-items:center;gap:12px;min-height:52px;padding:8px 16px;border-top:1px solid var(--border)}
.cv9 .ph .mb9{min-height:60px;padding:8px 14px}
.cv9 .mb9:first-child{border-top:0}
.cv9 .mb9.s{background:var(--surface-raised)}
.cv9 .cb9{width:22px;height:22px;flex:none;border:2px solid var(--border-dashed,#494037);border-radius:6px;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.cv9 .mb9.s .cb9{border-color:var(--accent);background:var(--accent)}
.cv9 .cb9 em{width:7px;height:7px;transform:rotate(45deg);background:var(--bg)}
.cv9 .mb9>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.cv9 .mb9>div>span:first-child{display:flex;gap:8px;align-items:baseline}
.cv9 .mb9 b{font:500 14px 'IBM Plex Sans';color:var(--fg)}
.cv9 .mb9 small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.cv9 .mb9 .ms{font-size:12px;color:var(--fg-muted)}
.cv9 .mb9 .st{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.cv9 .ph .mb9 .st{display:none}
.cv9 .gov9,.cv9 .ghi9{margin:0;padding:0;list-style:none;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);overflow:hidden}
.cv9 .gov9 li{display:grid;grid-template-columns:minmax(0,1fr) 70px minmax(0,1.5fr);gap:14px;padding:11px 16px;border-top:1px solid var(--border);align-items:baseline}
.cv9 .ph .gov9 li{grid-template-columns:minmax(0,1fr) auto;gap:3px 10px;padding:11px 14px}
.cv9 .ph .gov9 .o{grid-column:1/-1}
.cv9 .gov9 li:first-child,.cv9 .ghi9 li:first-child{border-top:0}
.cv9 .gov9 .l{font-size:14px;color:var(--fg)}
.cv9 .gov9 .v{display:inline-flex;align-items:center;gap:7px;font:500 13px 'IBM Plex Sans';color:var(--fg)}
.cv9 .gov9 .o,.cv9 .lk{font-size:13px;color:var(--accent-text)}
.cv9 .ghi9 li{display:flex;justify-content:space-between;gap:12px;padding:10px 16px;border-top:1px solid var(--border);font-size:13px;color:var(--fg-body)}
.cv9 .ph .ghi9 li{padding:10px 14px}
.cv9 .ghi9 small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap}
.cv9 .mu9{margin:0;font-size:13px;line-height:1.6;color:var(--fg-muted)}
.cv9 .del9{margin-top:14px;padding:12px 14px;border-radius:10px;display:flex;flex-direction:column;align-items:flex-start;gap:6px}
.cv9 .del9 .dl{min-height:44px;display:inline-flex;align-items:center;font:500 14px 'IBM Plex Sans';color:var(--danger)}
.cv9 .dk .del9 .dl{min-height:32px}
.cv9 .del9.no .dl{opacity:.45}
.cv9 .del9 .dh{font-size:12.5px;line-height:1.5;color:var(--fg-faint)}
.cv9 .del9 .dw{font-size:13px;line-height:1.55;color:var(--fg-body);max-width:560px;text-wrap:pretty}
.cv9 .del9 .lk{min-height:32px;display:inline-flex;align-items:center}
.cv9 .dlr9{height:1px;background:var(--border);margin-top:14px}
.cv9 .scr9.end9{justify-content:flex-end}
.cv9 .scr9.end9>.adb{padding-bottom:28px}
.cv9 .glh9{display:flex;align-items:flex-end;gap:10px}.cv9 .glh9 .lk{margin-left:auto;min-height:32px;display:inline-flex;align-items:center}
.cv9 .glh9 .sh9{padding-top:0}
.cv9 .gl9{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
.cv9 .ph .gl9{grid-template-columns:minmax(0,1fr)}
.cv9 .gc9{display:flex;flex-direction:column;gap:6px;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);padding:14px 16px}
.cv9 .ph .gc9{padding:13px 14px}
.cv9 .gt{display:flex;align-items:baseline;gap:10px}
.cv9 .gt b{font:500 15px 'IBM Plex Mono';color:var(--fg)}
.cv9 .gt small{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.cv9 .gt .lk{margin-left:auto}
.cv9 .gd{font-size:13px;color:var(--fg-body)}
.cv9 .gm{font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
.cv9 .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}
.cv9 .chip9{height:26px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface-rail);padding:0 9px;font-size:12px;color:var(--fg-body)}
.cv9 .tst9{position:absolute;z-index:40;bottom:24px;left:calc(50% + 31px);transform:translateX(-50%);width:358px;min-height:54px;box-sizing:border-box;display:flex;align-items:center;gap:10px;border-radius:12px;border:1px solid var(--border-strong);background:var(--elevated);padding:0 6px 0 16px;box-shadow:0 14px 30px rgba(0,0,0,.5);font-size:13.5px;color:var(--fg)}
.cv9 .tst9.p{left:16px;right:16px;width:auto;transform:none;bottom:96px}
.cv9 .tst9 span{flex:1}
.cv9 .tst9 b{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);font-weight:400}
</style>"""


def build():
    e_name, e_desc = EMPTY
    m_name, m_desc = MOX
    b = L.head('7 · Admin · Groups · delete a group',
               'Delete sits at the foot of an empty group’s page',
               'Drawn over the shipped group page (<code>group-page.tsx</code>, <code>group-editor.tsx</code>) in Item 4’s admin shell. The rule is locked: only a group with '
               'no members and no flyer codes can go, and its feature-flag settings go with it. New pieces carry a dashed outline; strings are DRAFT.')
    b += L.sec('(a) The Delete control')
    b += L.frames(
        L.fr('<b>D1</b> · 390 · 1337-testers, emptied, at the foot', gphone_tail(set(), CARRY, HIST, 'ok'),
             'Scrolled to the page’s foot. After History, across a hairline: <b>Delete this group</b>, a 44px text press in <code>--danger</code>, the hint under it. '
             'The same shape as Rule 0’s <i>Close the table</i>: rare, final, out of the way of the editor.', SC),
        L.fr('<b>D3</b> · 390 · Delete pressed', gphone_tail(set(), CARRY, HIST, 'ok', confirm(True)),
             'The shared confirm sheet, as Item 4’s kill confirm.', SC),
        L.fr('<b>D5</b> · 390 · refused: members and a flyer code', gphone_tail({'Chris L.', 'Max T.'}, [], MHIST, 'both'),
             'Delete stays, dimmed, and the line under it says why in place. <i>Flyer codes ›</i> opens the Flyer codes section on Invites.', SC),
    )
    b += L.frames(
        L.fr('<b>D2</b> · 1300 · 1337-testers, emptied', desk(ghead(e_name, e_desc), gpage(e_name, e_desc, set(), CARRY, HIST, 'ok')),
             'Members <i>0 selected</i>; every account still listed, as the editor ships. Delete at the foot, under History.', SC, 900),
    )
    b += L.sec('(b) The confirm')
    b += L.frames(
        L.fr('<b>D4</b> · 1300 · Delete pressed', desk(ghead(e_name, e_desc), gpage(e_name, e_desc, set(), CARRY, HIST, 'ok') + confirm(), 900),
             '<code>ModelConfirm</code>’s modal shape (540 wide, title, lead, facts, buttons), with no note field, as a group save has none. The action in <code>--danger</code>, Keep it first. '
             'A failure stays in the dialog as the confirm’s shipped line, with <i>Nothing was deleted.</i>', SC, 900),
    )
    b += L.sec('(c) Refused: members or a flyer code')
    b += L.frames(
        L.fr('<b>D6</b> · 1300 · mox-boston: 2 members and code MOXB7K', desk(ghead(m_name, m_desc), gpage(m_name, m_desc, {'Chris L.', 'Max T.'}, [], MHIST, 'both', '3')),
             'Delete dimmed, never hidden, so the reader learns the rule where they looked for the press. The line names what is in the way, with counts and the code.', SC, 900),
    )
    b += L.frames(
        L.fr('<b>D6b</b> · 390 · members only', gphone_tail({'Max T.'}, CARRY, HIST[2:], 'members', h=700),
             'Members only: <i>Unselect them above and save, then delete it.</i> (with 1: <i>It still has 1 member.</i>)', SC),
        L.fr('<b>D6c</b> · 390 · flyer code only', gphone_tail(set(), [], MHIST, 'code', h=700),
             'A code only: it never leaves its group (a revoked code too), so the group stays. See the open question.', SC),
    )
    b += L.sec('(d) After a delete')
    b += L.frames(
        L.fr('<b>D7</b> · 390 · the Groups list', phone(adh('Groups', GSUB, TABS_P, on='Groups'), glist(CARDS, True), 844, toast(True)),
             'The confirm lands on Groups. 1337-testers is gone, the count reads <i>3 groups</i>, and the shared toast says <i>Deleted 1337-testers.</i> with a bare ✕. No Undo: '
             'the settings went with it.', SC),
    )
    b += L.frames(
        L.fr('<b>D8</b> · 1300 · the Groups list', desk(adh('Groups', GSUB, TABS_D, on='Groups'), glist(CARDS) + toast(), 640),
             'Two columns as shipped; the toast centred over the main column, 358 wide.', SC, 900),
    )
    b += L.rule('The calls', [
        '<b>Where:</b> the group page’s foot, under History, across a hairline: <b>Delete this group</b>, a text press in <code>--danger</code> (44px phone, 32px desktop). Not on the list card, not in the head. Not on New group.',
        '<b>Empty:</b> the hint under it reads <i>Only an empty group can go: no members, no flyer codes.</i> (DRAFT).',
        '<b>Refused:</b> the press stays, dimmed and inert, and the hint becomes the reason: <i>It still has {n} members.</i> + <i>Unselect them above and save, then delete it.</i>; '
        '<i>It has the flyer code {CODE}. A flyer code keeps its group, even revoked, so this one stays.</i> with <i>Flyer codes ›</i>; both together as D5 (DRAFT). Counts are the saved state: unselecting without saving keeps it refused.',
        '<b>Confirm:</b> <i>Delete {group}?</i> · <i>It’s empty, so deleting it changes nothing for any account. Its {n} feature-flag settings are removed with it, and the name is free to use again.</i> · '
        'facts Members, Flyer codes, Overrides (named, or <i>None.</i>), History · <i>Keep it</i> / <b>Delete the group</b> (DRAFT). No note.',
        '<b>After:</b> lands on Groups with the shared toast <i>Deleted {group}.</i> (DRAFT), no Undo. The server re-checks emptiness in the delete’s own statement: '
        'if someone joined since, the dialog says <i>{group} isn’t empty now. Nothing was deleted.</i> (DRAFT) and the page refreshes into D5.',
        '<b>History:</b> a <code>group_deleted</code> admin event (the kind check gains it: a migration). The group’s past events stay, under its id, as <code>admin_events.group_id</code> already allows.'])
    return L.doc('Small items 9 · Delete a group', L.scope(L.helmet(c), SC) + b4.CSS + CSS, b, 1440)
