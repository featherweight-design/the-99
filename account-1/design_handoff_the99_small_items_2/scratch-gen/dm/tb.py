"""The shipped phone tab bar and rail icons (from account 1's cart v2 kit)."""
CSS = r"""
.tbar{height:74px;flex:none;display:flex;align-items:center;padding:8px 8px 14px;background:var(--surface-rail);border-top:1px solid var(--border)}
.tbar .t{flex:1;height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:12px;color:var(--fg-faint);font:9px 'IBM Plex Mono';letter-spacing:.06em;position:relative}
.tbar .t.on{background:var(--surface-inset);color:var(--fg)}
.tbar .t.lk{color:var(--fg-locked)}
.tbar.lock{flex-direction:column;align-items:stretch;padding:7px 8px 14px;height:88px}
.tbar.lock .row{display:flex;align-items:center}
.brk{position:relative;height:14px;flex:none}
.brk i{position:absolute;top:7px;left:8px;right:8px;height:6px;border:1px solid var(--border-strong);border-bottom:0;border-radius:3px 3px 0 0}
.brk em{position:absolute;top:0;left:50%;transform:translateX(-50%);display:inline-flex;align-items:center;gap:5px;white-space:nowrap;background:var(--surface-rail);padding:0 7px;font:normal 9px/14px 'IBM Plex Mono';letter-spacing:.08em;text-transform:uppercase;color:var(--fg-locked)}
.bdg{position:absolute;top:3px;left:calc(50% + 4px);min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:var(--accent);color:#14110E;font:600 9.5px/16px 'IBM Plex Mono';text-align:center;letter-spacing:0;box-shadow:0 0 0 2px var(--surface-rail)}
.bdg.dot{min-width:8px;width:8px;height:8px;padding:0;top:6px;left:calc(50% + 6px)}

"""

def ico(paths, size=19, sw=1.5):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths}</svg>')


NAV = {
    "Home": '<path d="M3 9.2 10 3.6l7 5.6V16a1 1 0 0 1-1 1h-3.5v-4.2h-5V17H4a1 1 0 0 1-1-1z"/>',
    "Collection": '<rect x="3.2" y="3.2" width="5.8" height="5.8" rx="1.2"/><rect x="11" y="3.2" width="5.8" height="5.8" rx="1.2"/><rect x="3.2" y="11" width="5.8" height="5.8" rx="1.2"/><rect x="11" y="11" width="5.8" height="5.8" rx="1.2"/>',
    "Commanders": '<path d="M3 14.5 4.4 6l3.2 3.6L10 4l2.4 5.6L15.6 6 17 14.5z"/><path d="M3 16.6h14"/>',
    "Discover": '<circle cx="10" cy="10" r="6.8"/><path d="M10 6.4 12.8 10 10 13.6 7.2 10z"/>',
    "Decks": '<rect x="6.6" y="3.2" width="10" height="13" rx="1.6"/><path d="M4.2 5.4A1.6 1.6 0 0 0 3.4 6.8v8.6a1.6 1.6 0 0 0 1.6 1.6h8.2"/>',
    # NEW: Friends. Two seats, the near one whole, the far one behind it; same 20-unit box and 1.5 stroke.
    "Friends": '<circle cx="7.6" cy="7.4" r="2.7"/><path d="M2.8 16.4c.5-2.9 2.4-4.5 4.8-4.5s4.3 1.6 4.8 4.5"/><path d="M12.4 4.9a2.4 2.4 0 1 1 1.3 4.5"/><path d="M14.6 11.6c1.5.5 2.4 1.9 2.7 4"/>',
}
SEARCH = '<circle cx="8.6" cy="8.6" r="5.6"/><path d="M12.8 12.8 17 17"/>'
LOCK = ('<svg width="9" height="12" viewBox="0 0 11 14" aria-hidden="true"><path d="M2.5 6V4a3 3 0 0 1 6 0v2" fill="none" '
        'stroke="currentColor" stroke-width="1.4"/><rect x=".5" y="6" width="10" height="7.5" rx="1.5" fill="currentColor"/></svg>')
OLD = ["Home", "Collection", "Commanders", "Discover", "Decks"]
NEW = ["Home", "Collection", "Commanders", "Decks", "Friends"]


def nav_icon(n, size=19):
    return ico(NAV[n], size)


def dia():
    return '<span class="dia"><i></i><i></i><i></i></span>'


def header(menu=False):
    return (f'<div class="mhd"><div class="wm"><span class="the">THE</span><span class="mk">{dia()}<span class="nn">99</span></span></div>'
            f'<div class="clu"><span class="ib">{ico(SEARCH, 20, 1.6)}</span><span class="ib q">?</span>'
            f'<span class="av{" on" if menu else ""}">S</span></div></div>')


def badge(v):
    if v is None:
        return ""
    return '<span class="bdg dot"></span>' if v == "dot" else f'<span class="bdg">{v}</span>'


def tabbar(active="Home", items=NEW, badges=None, locked=None):
    """The phone tab bar. `locked` = the slots the first-run lock holds (they sit under the bracket)."""
    badges = badges or {}
    def slot(n):
        cls = "t on" if n == active else ("t lk" if locked and n in locked else "t")
        return f'<span class="{cls}">{nav_icon(n)}{n}{badge(badges.get(n))}</span>'
    if not locked:
        return '<div class="tbar">' + "".join(slot(n) for n in items) + "</div>"
    i0 = items.index(locked[0]); i1 = items.index(locked[-1])
    left = f"{i0 * 20}%"; right = f"{(len(items) - 1 - i1) * 20}%"
    brk = (f'<div class="brk" style="margin-left:{left};margin-right:{right}"><i></i>'
           f'<em>{LOCK}Open once your cards are in</em></div>')
    return f'<div class="tbar lock">{brk}<div class="row">' + "".join(slot(n) for n in items) + "</div></div>"


