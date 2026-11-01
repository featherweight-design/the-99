"""Item 4 · Admin, kill a feature flag: the list renamed Feature flags, the App-wide control's Killed, its confirm, and a
killed flag in the list and on its page. The admin shell is Small items 7's CSV board (C3, C4); the list, ladder,
segment, banner and confirm are drawn from the shipped components (switches-list.tsx, switch-page.tsx,
override-controls.tsx, model-confirm.tsx) with the env column gone, as the flags plan's PR 2 leaves it."""
import re
import lib9 as L
c = L.load('small_items_7_CSV.dc.html')
SC = 'cv9'
C3 = L.screen(L.frame_by_label(c, '<b>C3</b>'))
C4 = L.screen(L.frame_by_label(c, '<b>C4</b>'))
RAIL = L.block(C3, C3.find('<div class="rail">'))
MHD = L.block(C4, C4.find('<div class="mhd">'))
TBAR = L.block(C4, C4.find('<div class="tbar">'))
EY = '<div class="ey"><span>Admin</span><em><i></i>production</em></div>'
TABS_D = ['Costs', 'Feature flags', 'Groups', 'Accounts', 'Models', 'Invites', 'Payments']
TABS_P = ['Feature flags', 'Groups', 'Accounts', 'Models', 'Invites', 'Payments']


def adh(title, sub, tabs, on='Feature flags', back=None):
    nav = ''.join(f'<span class="{"on" if t == on else ""}">{t}</span>' for t in tabs)
    if back:
        return f'<div class="adh"><span class="bk9">{back}</span><h1>{title}</h1><p class="mono9">{sub}</p></div>'
    return f'<div class="adh">{EY}<h1>{title}</h1><p>{sub}</p><nav>{nav}</nav></div>'


def desk(head_html, body, h=None):
    st = f'height:{h}px' if h else ''
    return f'<div class="dk" style="width:1300px;{st}">{RAIL}<div class="main">{head_html}<div class="adb ff9">{body}</div></div></div>'


def phone(head_html, body, h=844, extra=''):
    return f'<div class="ph" style="height:{h}px">{MHD}<div class="pb"><div class="scr9">{head_html}<div class="adb ff9">{body}</div></div></div>{TBAR}{extra}</div>'


SUB = 'The app-wide value is each flag’s default. Account beats group beats app-wide; Killed beats them all. Changes land within 30 seconds.'

# rows: label, var, tags, app, overrides, state, sub, killed
ROWS = [
    ('Push notifications', 'PUSH_ENABLED', [], 'Killed', '1 group, 2 accounts, refused', 'off', 'killed', True),
    ('Suggested changes v2', 'SUGGESTED_CHANGES_V2_ENABLED', ['model'], 'On', None, 'on', '212 of 212 on', False),
    ('Buying credits', 'PAYMENTS_ENABLED', [], 'Off', '1 group', 'mixed', '14 of 212 on', False),
    ('Welcome credits', 'WELCOME_CREDITS_ENABLED', [], 'Off', '1 group', 'mixed', '14 of 212 on', False),
    ('Announcements', 'ANNOUNCEMENTS_ENABLED', [], 'On', None, 'on', '212 of 212 on', False),
    ('Feedback', 'FEEDBACK_ENABLED', [], 'On', None, 'on', '212 of 212 on', False),
    ('Flyer trial', 'FLYER_TRIAL_ENABLED', [], 'On', None, 'on', '212 of 212 on', False),
    ('Overview v2', 'OVERVIEW_V2_ENABLED', ['model'], 'Off', '1 account', 'mixed', '1 of 212 on', False),
]
PLUMB = [('Request counting', 'RATE_LIMIT_ENABLED', [], 'On', None, 'on', '212 of 212 on', False),
         ('List cache', 'LIST_CACHE_ENABLED', [], 'On', None, 'on', '212 of 212 on', False)]
DESC = {'PUSH_ENABLED': 'Phone and browser push for the news kinds, on top of Home. Sends nothing until the push keys are set.',
        'SUGGESTED_CHANGES_V2_ENABLED': 'Pick how many changes, ask for something, and see each one as it arrives. Needs Suggested changes.',
        'PAYMENTS_ENABLED': 'Buy credit packs. Off stops new purchases; payments already made still settle.',
        'WELCOME_CREDITS_ENABLED': 'Gives a new sign-up 15 credits that expire after 30 days. Off stops new grants; a lot already given is still spent.',
        'ANNOUNCEMENTS_ENABLED': 'Wizards announcements on Home, in Settings and as pushes.',
        'FEEDBACK_ENABLED': 'Report a problem, the check-in on Home and the Feedback tab here.',
        'FLYER_TRIAL_ENABLED': 'Gates the /join/&lt;CODE&gt; flyer sign-ups and the Flyer codes section on /admin/invites. Off retires every code.',
        'OVERVIEW_V2_ENABLED': 'The Overview on contract 8, Sonnet 5.5.',
        'RATE_LIMIT_ENABLED': 'Counts each player’s requests and logs what a limit would refuse. Refuses nothing.',
        'LIST_CACHE_ENABLED': 'Home and /decks cached per reader.'}


def dot(st):
    return f'<i class="dot9 {st}"></i>'


def pill(st, killed=False):
    t = {'on': 'On', 'off': 'Off', 'mixed': 'Mixed'}[st]
    return f'<span class="pill9 {st}">{dot(st)}{t}</span>'


def tags(tg, killed):
    s = ''.join(f'<span class="tag9 m">{t}</span>' for t in tg)
    if killed:
        s = '<span class="tag9 k new9">killed</span>' + s
    return s


def row(r, phone=False):
    lab, var, tg, app, ov, st, sub, k = r
    meta = ' · '.join([f'app-wide {app.lower()}', ov or 'no overrides']) + f' · <span class="nw">{sub}</span>'
    appc = 'k' if k else ''
    return (f'<li class="row9{" kr" if k else ""}"><div class="nm9"><div class="t9"><span class="tt9"><b>{lab}</b>{tags(tg, k)}</span>'
            f'<span class="pp9">{pill(st)}</span></div><span class="var9">{var}</span><span class="ds9">{DESC[var]}</span>'
            f'<span class="meta9">{meta}</span></div>'
            f'<span class="app9 {appc}">{app}</span><span class="ov9 {"" if ov else "none"}">{ov or "None"}</span>'
            f'<div class="rs9">{pill(st)}<span>{sub}</span></div></li>')


def listing(phone=False, n=None):
    rows = ROWS[:n] if n else ROWS
    chips = [('All', 10), ('Overridden', 5), ('Off for anyone', 5), ('Model features', 2)]
    ch = ''.join(f'<span class="{"on" if i == 0 else ""}">{t}<em>{k}</em></span>' for i, (t, k) in enumerate(chips))
    out = (f'<div class="pin9"><span class="sf9">⌕ <i>Search by name or variable</i></span><div class="chips9">{ch}</div></div>'
           f'<div class="box9"><div class="ch9"><span>Flag</span><span>App-wide</span><span>Overrides</span><span>Resolved</span></div>'
           f'<h3 class="gh9">Features <em>{len(ROWS)}</em></h3><ul>{"".join(row(r) for r in rows)}</ul>')
    if not n:
        out += f'<h3 class="gh9">Plumbing <em>app-wide only, not features a friend tries</em></h3><ul>{"".join(row(r) for r in PLUMB)}</ul>'
    out += '</div><p class="fn9">Resolved counts the 212 accounts on production. Signed out gets the app-wide result.</p>'
    return out


def seg(sel, ring=None, killed_sel=False, phone=False):
    o = []
    for k in ['Not set', 'On', 'Off', 'Killed']:
        cls = 'on' if k == sel else ('ring' if k == ring else '')
        if k == 'Killed':
            cls += ' kl' + (' new9' if not (k == sel or k == ring) else '')
        o.append(f'<span class="{cls}">{k}</span>')
    return f'<div class="seg9{" fill" if phone else ""}">{"".join(o)}</div>'


def sh(t, m=''):
    return f'<div class="sh9"><h2>{t}</h2>{f"<small>{m}</small>" if m else ""}</div>'


def ladder(killed):
    rungs = [('Killed', 'the app-wide row', 'decides for all 212', True, 'k')] if killed else []
    rungs += [('Account', '2 accounts: On', 'refused' if killed else 'decides for 2', not killed and False, ''),
              ('All features', '6 accounts', 'refused' if killed else 'decides for 6', False, ''),
              ('Group', 'Founders: On', 'refused' if killed else 'decides for 11', False, ''),
              ('App-wide', 'Killed' if killed else 'On', 'decides for all 212' if killed else 'decides for 193', not killed, 'k' if killed else ''),
              ('Fallback', 'off', 'only with no row', False, '')]
    if killed:
        rungs = [rungs[0]] + rungs[1:4] + [rungs[5]]
    h = ''
    for i, (k, v, d, dec, tone) in enumerate(rungs):
        dec = dec or (killed and i == 0)
        h += f'<div class="rg9{" dec" if dec else ""}"><span class="rk">{k}</span><span class="rv {tone}">{v}</span><span class="rd">{d}</span></div>'
    res = 'Off for all 212 accounts' if killed else 'On for all 212 accounts'
    h += f'<div class="res9">{dot("off" if killed else "on")}<span>{res}</span></div>'
    return f'<div class="lad9">{h}</div>'


BANNER = ('<div class="ban9 new9"><i></i><div><b>Killed: off for everyone.</b><span>Killed beats every account and group override and All features. '
          'Pick On, Off or Not set to lift it; the overrides below come back as they were.</span></div></div>')


def ovs(killed, which='g'):
    items = [('Founders', 'group · 11 members', 'On', 'Note: “early access”')] if which == 'g' else [('Colin', 'account · c•••@gmail.com', 'On', 'No note'),
             ('Peter', 'account · p•••@hey.com', 'On', 'No note')]
    h = ''
    for t, s, v, n in items:
        meta = 'refused, killed' if killed else 'set by You, Oct 28'
        segs = ''.join(f'<span class="{"on" if x == v else ""}{" dis" if killed and x != "Clear" else ""}">{x}</span>' for x in ['On', 'Off'])
        h += (f'<li class="ovr9"><div><b>{t}</b><small>{s}</small></div><div class="oc9"><div class="seg9 sm">{segs}</div><span class="clr9">Clear</span></div>'
              f'<div class="on9"><span class="{"k" if killed else ""}">{n}</span><small>{meta}</small></div></li>')
    return f'<ul class="ovl9">{h}</ul>'


def page(killed=False, ring=False, phone=False):
    sel = 'Killed' if killed else 'On'
    b = sh('Who gets it', 'most specific wins')
    if killed:
        b += BANNER
    b += ladder(killed)
    meta = 'set by You, 9:41 pm' if killed else 'set by You, Oct 26'
    b += sh('App-wide', meta)
    b += seg(sel, ring='Killed' if ring else None, phone=phone)
    note = ('Killed is the kill switch: off for everyone, overrides refused.' if killed else
            'Not set falls back to the flag’s compiled default (off). Killed turns it off for everyone.')
    b += f'<span class="an9{" new9" if not killed else ""}">{note}</span>'
    b += sh('Groups', '1') + ovs(killed, 'g')
    b += sh('Accounts', '2') + ovs(killed, 'a')
    return b


def flag_head(phone=False):
    return adh('Push notifications', 'PUSH_ENABLED', [], back='‹ Feature flags')


def confirm(phone=False):
    facts = [('Who', 'All 212 accounts, the 13 held on by Founders, two account overrides and All features too.'),
             ('Overrides', 'Kept, and refused while killed. Lifting the kill brings them back.'),
             ('When', 'Within 30 seconds, on every server.')]
    dl = ''.join(f'<div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in facts)
    return (f'<div class="scrim9{" p" if phone else ""}"><div class="mc9{" p" if phone else ""}">{"<span class=grip9></span>" if phone else ""}'
            f'<h2>Kill Push notifications for everyone?</h2>'
            f'<p>Killed turns Push notifications off for every account, and beats every override and All features. Nothing is deleted.</p>'
            f'<dl>{dl}</dl><label>Note (optional)<span class="in9"></span></label>'
            f'<div class="bt9"><span class="cn">Cancel</span><span class="kl">Kill for everyone</span></div></div></div>')


CSS = """<style>
.cv9 .dk .main{overflow:hidden}
.cv9 .scr9{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column}
.cv9 .bk9{font:500 13px 'IBM Plex Sans';color:var(--accent-text)}
.cv9 .adh .mono9{font:12px 'IBM Plex Mono';color:var(--fg-faint)}
.cv9 .ff9{display:flex;flex-direction:column;gap:12px}
.cv9 .pin9{display:flex;flex-direction:column;gap:10px}
.cv9 .sf9{height:38px;max-width:420px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface-sunken);display:flex;align-items:center;gap:8px;padding:0 12px;font-size:14px;color:var(--fg-faint)}
.cv9 .ph .sf9{height:44px;max-width:none;font-size:16px}
.cv9 .sf9 i{font-style:normal}
.cv9 .chips9{display:inline-flex;align-self:flex-start;gap:3px;padding:2px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface-sunken);white-space:nowrap;max-width:100%;overflow:hidden}
.cv9 .chips9 span{height:30px;display:inline-flex;align-items:center;padding:0 13px;border-radius:7px;font-size:13px;color:var(--fg-muted)}
.cv9 .ph .chips9 span{height:40px}
.cv9 .chips9 span.on{background:var(--elevated);color:var(--fg)}
.cv9 .chips9 em{font:11px 'IBM Plex Mono';font-style:normal;color:var(--fg-faint);margin-left:7px}
.cv9 .box9{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);overflow:hidden}
.cv9 .box9 ul{margin:0;padding:0;list-style:none}
.cv9 .ch9,.cv9 .row9{display:grid;grid-template-columns:minmax(0,1fr) 92px 112px 116px;gap:14px}
.cv9 .ch9{background:var(--surface-rail);padding:9px 14px;font:9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.cv9 .gh9{margin:0;border-top:1px solid var(--border);background:var(--surface-sunken);padding:8px 14px;font:400 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-muted)}
.cv9 .gh9 em{font-style:normal;text-transform:none;letter-spacing:0;color:var(--fg-faint);margin-left:10px}
.cv9 .row9{border-top:1px solid var(--border);padding:12px 14px;align-items:start}
.cv9 .nm9{display:flex;flex-direction:column;gap:3px;min-width:0}
.cv9 .t9{display:flex;gap:10px;align-items:flex-start}
.cv9 .tt9{flex:1;display:flex;flex-wrap:wrap;align-items:center;gap:7px}
.cv9 .tt9 b{font:500 14px 'IBM Plex Sans';color:var(--fg)}
.cv9 .pp9{display:none}
.cv9 .tag9{border:1px solid var(--border-strong);border-radius:4px;padding:2px 6px;font:9.5px 'IBM Plex Mono';letter-spacing:.08em;text-transform:uppercase;color:var(--fg-muted);white-space:nowrap}
.cv9 .tag9.m{border-color:var(--accent);color:var(--accent-text)}
.cv9 .tag9.k{border-color:var(--danger);color:var(--danger)}
.cv9 .var9{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.cv9 .ds9{font-size:12.5px;line-height:1.45;color:var(--fg-muted)}
.cv9 .meta9{display:none;margin-top:2px;font:10.5px 'IBM Plex Mono';color:var(--fg-body)}
.cv9 .meta9 .nw{white-space:nowrap}
.cv9 .app9{font-size:13px;color:var(--fg)}
.cv9 .app9.k{font:600 12.5px 'IBM Plex Mono';color:var(--danger)}
.cv9 .ov9{font-size:12.5px;color:var(--fg-body)}.cv9 .ov9.none{color:var(--fg-faint)}
.cv9 .rs9{display:flex;flex-direction:column;gap:3px}
.cv9 .rs9>span{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap}
.cv9 .kr .rs9>span{color:var(--danger)}
.cv9 .pill9{display:inline-flex;align-items:center;gap:7px;font:500 13px 'IBM Plex Sans';color:var(--fg);white-space:nowrap}
.cv9 .pill9.off{color:var(--fg-muted)}
.cv9 .dot9{width:8px;height:8px;border-radius:50%;border:1.5px solid var(--fg-faint);flex:none;display:inline-block}
.cv9 .dot9.on{background:var(--success);border-color:var(--success)}
.cv9 .dot9.mixed{background:linear-gradient(90deg,var(--success) 50%,transparent 50%);border-color:var(--success)}
.cv9 .fn9{margin:0;font-size:13px;line-height:1.6;color:var(--fg-faint)}
.cv9 .ph .ch9{display:none}
.cv9 .ph .row9{display:flex;flex-direction:column}
.cv9 .ph .app9,.cv9 .ph .ov9,.cv9 .ph .rs9{display:none}
.cv9 .ph .pp9{display:block;padding-top:1px}
.cv9 .ph .meta9{display:block}
.cv9 .ph .ff9{padding:14px 16px}
.cv9 .sh9{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;padding-top:10px}
.cv9 .sh9 h2{margin:0;font:600 15px 'IBM Plex Sans';color:var(--fg)}
.cv9 .sh9 small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.cv9 .lad9{border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);overflow:hidden}
.cv9 .rg9{display:grid;grid-template-columns:120px minmax(0,1fr) 150px;gap:14px;padding:12px 16px;border-top:1px solid var(--border);align-items:baseline}
.cv9 .rg9:first-child{border-top:0}
.cv9 .rg9.dec{background:var(--surface-raised)}
.cv9 .rk{font:10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.cv9 .rg9.dec .rk{color:var(--accent-text)}
.cv9 .rv{font-size:13.5px;color:var(--fg)}.cv9 .rv.k{font:600 13px 'IBM Plex Mono';color:var(--danger)}
.cv9 .rd{font:11px 'IBM Plex Mono';color:var(--fg-faint);text-align:right}
.cv9 .rg9.dec .rd{color:var(--fg-body)}
.cv9 .ph .rg9{grid-template-columns:84px minmax(0,1fr);gap:4px 10px;padding:11px 14px}
.cv9 .ph .rd{grid-column:2;text-align:left}
.cv9 .res9{display:flex;align-items:center;gap:9px;padding:12px 16px;border-top:1px solid var(--border-strong);background:var(--surface-rail);font:500 14px 'IBM Plex Sans';color:var(--fg)}
.cv9 .seg9{display:inline-flex;align-self:flex-start;gap:3px;padding:3px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface-sunken)}
.cv9 .seg9 span{height:32px;display:inline-flex;align-items:center;justify-content:center;padding:0 14px;border-radius:6px;border:1px solid transparent;font-size:13px;color:var(--fg-muted)}
.cv9 .seg9.fill{display:flex;align-self:stretch}.cv9 .seg9.fill span{flex:1;height:40px}
.cv9 .seg9 span.on{border-color:var(--border-dashed,#494037);background:var(--elevated);color:var(--fg);font-weight:500}
.cv9 .seg9 span.ring{border:1px dashed var(--accent);color:var(--fg)}
.cv9 .seg9 span.kl{color:var(--danger)}
.cv9 .seg9 span.kl.on{background:var(--danger);border-color:var(--danger);color:#fff;font-weight:600}
.cv9 .seg9 span.kl.ring{border-color:var(--danger)}
.cv9 .seg9.sm span{height:28px;padding:0 12px}
.cv9 .seg9 span.dis{color:#5e5648}
.cv9 .an9{font-size:12.5px;line-height:1.5;color:var(--fg-muted)}
.cv9 .ban9{display:flex;gap:12px;align-items:flex-start;border:1px solid var(--danger);border-radius:12px;background:var(--surface-rail);padding:14px 16px}
.cv9 .ban9>i{width:8px;height:8px;margin-top:6px;flex:none;transform:rotate(45deg);background:var(--danger)}
.cv9 .ban9 div{display:flex;flex-direction:column;gap:4px}
.cv9 .ban9 b{font:600 14px/1.4 'IBM Plex Sans';color:var(--fg)}
.cv9 .ban9 span{font-size:13px;line-height:1.55;color:var(--fg-body)}
.cv9 .ovl9{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.cv9 .ovr9{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 14px;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface);padding:12px 16px}
.cv9 .ovr9>div:first-child{display:flex;flex-direction:column;gap:2px}
.cv9 .ovr9 b{font:500 14px 'IBM Plex Sans';color:var(--fg)}
.cv9 .ovr9 small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.cv9 .oc9{display:flex;align-items:center;gap:10px}
.cv9 .clr9{font-size:13px;color:var(--accent-text)}
.cv9 .on9{grid-column:1/-1;display:flex;flex-direction:column;gap:2px}
.cv9 .on9 span{font-size:12.5px;color:var(--fg-muted)}.cv9 .on9 span.k{color:var(--danger)}
.cv9 .ph .ovr9{grid-template-columns:1fr}
.cv9 .scrim9{position:absolute;inset:0;z-index:50;background:color-mix(in oklab,#14110E 72%,transparent);display:flex;justify-content:center;align-items:flex-start;padding-top:110px}
.cv9 .scrim9.p{align-items:flex-end;padding:0}
.cv9 .mc9{width:540px;border:1px solid var(--border-strong);border-radius:14px;background:var(--surface);padding:24px 24px 20px;display:flex;flex-direction:column;gap:14px;box-shadow:0 24px 60px rgba(0,0,0,.55)}
.cv9 .mc9.p{width:100%;border-radius:20px 20px 0 0;border-width:1px 0 0;padding:12px 18px 22px}
.cv9 .grip9{width:40px;height:4px;border-radius:9px;background:var(--border-strong);margin:0 auto}
.cv9 .mc9 h2{margin:0;font:400 20px/1.3 'Cinzel',serif;color:var(--fg)}
.cv9 .mc9 p{margin:0;font-size:13.5px;line-height:1.55;color:var(--fg-body)}
.cv9 .mc9 dl{margin:0;border:1px solid var(--border);border-radius:10px;overflow:hidden}
.cv9 .mc9 dl div{display:grid;grid-template-columns:92px minmax(0,1fr);gap:10px;padding:10px 12px;border-top:1px solid var(--border)}
.cv9 .mc9.p dl div{grid-template-columns:74px minmax(0,1fr)}
.cv9 .mc9 dl div:first-child{border-top:0}
.cv9 .mc9 dt{padding-top:2px;font:10px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint)}
.cv9 .mc9 dd{margin:0;font-size:13px;line-height:1.5;color:var(--fg-body)}
.cv9 .mc9 label{display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:var(--fg-muted)}
.cv9 .in9{height:38px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-sunken)}
.cv9 .mc9.p .in9{height:44px}
.cv9 .bt9{display:flex;gap:10px;justify-content:flex-end}
.cv9 .bt9 span{height:40px;display:inline-flex;align-items:center;justify-content:center;padding:0 18px;border-radius:8px;font-size:14px}
.cv9 .mc9.p .bt9 span{flex:1;height:46px}
.cv9 .bt9 .cn{border:1px solid var(--border-strong);color:var(--fg)}
.cv9 .bt9 .kl{background:var(--danger);color:#fff;font-weight:600;border-radius:10px;padding:0 20px}
</style>"""


def build():
    b = L.head('4 · Admin · Feature flags · kill a flag',
               'Killed is the fourth App-wide value, behind a confirm',
               'Drawn over the shipped admin (Small items 7’s shell) with the page renamed <b>Feature flags</b> and the env column gone, as the flags plan’s PR 2 '
               'leaves it. A killed app row beats every account, group and All features row. New pieces carry a dashed outline; strings are DRAFT unless shipped.')
    b += L.sec('The list')
    b += L.frames(
        L.fr('<b>K1</b> · 1300 · Feature flags, Push killed', desk(adh('Feature flags', SUB, TABS_D), listing()),
             'A killed flag reads <b>Killed</b> in the App-wide column (mono, <code>--danger</code>, the shipped kill ink), Resolved <i>Off</i> with <i>killed</i> under it in red, '
             'and its overrides as <i>refused</i>. The name takes a <b>KILLED</b> tag beside it, in the tag slot <i>model</i> uses: the one marker that reads at both widths. '
             'Killed flags stay in their place in the list; <i>Off for anyone</i> counts them.', 'cv9', 900),
    )
    b += L.frames(
        L.fr('<b>K2</b> · 390 · the same', phone(adh('Feature flags', SUB, TABS_P), listing(n=4), 1200),
             'The phone has no columns: the tag, the pill (Off) and the meta line (<i>app-wide killed · … · killed</i>) carry it.', SC),
        L.fr('<b>K3</b> · 390 · the flag page, killed', phone(flag_head(True), page(killed=True, phone=True), 1500),
             'The kill banner on top (the shipped env-kill banner, its words changed), the ladder’s first rung <b>Killed</b> deciding for all, '
             'each override <i>refused, killed</i> in red with its On and Off held. Clear still works, as it does under the env kill today.', SC),
        L.fr('<b>K4</b> · 390 · Killed pressed: the confirm', phone(flag_head(True), page(ring=True, phone=True), 1100, confirm(True)),
             'The shipped confirm sheet (model confirm, F3), the option it asks about ringed in the segment behind it.', SC),
    )
    b += L.sec('The flag page')
    b += L.frames(
        L.fr('<b>K5</b> · 1300 · App-wide gains Killed', desk(flag_head(), page()),
             'The App-wide segment reads <i>Not set · On · Off · Killed</i>, Killed in <code>--danger</code> text until chosen. One control, one decision: '
             'the plan’s third value, no separate kill button. The help line under it names what Killed does.', SC, 900),
    )
    b += L.frames(
        L.fr('<b>K6</b> · 1300 · Killed pressed: the confirm', desk(flag_head(), page(ring=True) + confirm(), 900),
             'Every kill asks once, model flag or not: it reaches everyone and refuses every override. <code>ModelConfirm</code>’s modal (540, title, lead, facts, note, Cancel and the action), '
             'the action in <code>--danger</code>. A failure stays in the dialog as the confirm’s shipped line.', SC, 900),
    )
    b += L.frames(
        L.fr('<b>K7</b> · 1300 · killed', desk(flag_head(), page(killed=True)),
             'Killed fills in <code>--danger</code>. To lift it, press On, Off or Not set: that saves at once, no confirm, since it only gives back what the rows below say '
             '(a model flag rising still opens the shipped model confirm). History logs <i>You set app-wide: on → killed</i>.', SC, 900),
    )
    b += L.rule('The calls', [
        '<b>Rename:</b> the tab, title and back link read <b>Feature flags</b>; the column head reads <b>Flag</b>. Routes move with the plan’s PR 7.',
        '<b>The control:</b> <code>APP_OPTIONS</code> gains <code>killed</code>, drawn last, in <code>--danger</code> text; chosen, it fills <code>--danger</code> with white text. App-wide only: account and group rows keep On / Off.',
        '<b>Confirm, always:</b> <i>Kill {flag} for everyone?</i> · lead <i>Killed turns {flag} off for every account, and beats every override and All features. Nothing is deleted.</i> · '
        'facts Who (everyone, naming who is held on), Overrides (<i>Kept, and refused while killed. Lifting the kill brings them back.</i>), When (shipped) · note · Cancel / <b>Kill for everyone</b>. All DRAFT.',
        '<b>Killed in the list:</b> App-wide <i>Killed</i> in the shipped kill ink; a <b>KILLED</b> tag by the name; Resolved <i>Off</i> + <i>killed</i> (<code>switches.killed</code> becomes “killed”); overrides <i>refused</i>.',
        '<b>On the page:</b> the shipped kill banner, re-worded (<i>Killed: off for everyone.</i> + body, DRAFT); a first <b>Killed</b> rung deciding for all; overrides <i>refused, killed</i>, their On/Off held, Clear live.',
        '<b>Lifting:</b> pressing On, Off or Not set saves at once, as today. The sub line under the title is rewritten for the new order (DRAFT).'])
    return L.doc('Small items 9 · Feature flags, killed', L.scope(L.helmet(c), SC) + CSS, b, 1440)
