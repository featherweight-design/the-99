"""Item 3 · the announcements archive. Helmet: announcements/Home-Rows (FeedItemRow as shipped, Home at 390 and 1300)."""
import lib11 as L
from lib10 import block

SRC = "design_handoff_the99_announcements/Home-Rows.dc.html"
S0 = L.src(SRC)
HELM = L.src_helmet(SRC)


def _el(start_marker, after=0, tag="div"):
    i = S0.find(start_marker, after)
    assert i >= 0, start_marker
    return block(S0, i, tag)


MHD = _el('<div class="mhd">')
TBAR = _el('<div class="tbar">').replace('<span class="t on">', '<span class="t on" data-x>', 1)
_dk = S0.find('<div class="dk')
RAIL = _el('<div class="rail">', _dk)
XL = ('<svg class="xl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" '
      'aria-hidden="true"><path d="M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5"/><path d="M15 3h6v6"/><path d="M10.5 13.5 21 3"/></svg>')
GLYPH = ('<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">'
         '<rect x="4" y="2.8" width="12" height="14.4" rx="1.6"/><path d="M7 7h6M7 10h6M7 13h4"/></svg>')

CSS = """<style>
.board .ph{height:auto;min-height:844px}
.a9{flex:1 0 auto;padding:16px 16px 18px;display:flex;flex-direction:column;gap:12px}
.a9 .a9b{font:11.5px 'IBM Plex Mono';color:var(--fg-muted);display:flex;align-items:center;min-height:32px}
.a9 .a9t h1{margin:0;font:700 23px/1.15 'Cinzel',serif;color:var(--fg)}
.a9 .a9t p{margin:6px 0 0;font:10px 'IBM Plex Mono';letter-spacing:.06em;color:var(--fg-faint)}
.a9 .a9c{display:flex;gap:8px;align-items:center;justify-content:flex-start}
.a9k{display:flex;border:1px solid var(--border-strong);border-radius:12px;padding:4px;gap:4px;flex:1;min-width:0}
.a9k span{flex:1 1 auto;height:36px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px;color:var(--fg-muted);white-space:nowrap;padding:0 6px}
.a9k span.on{background:var(--elevated);color:var(--fg);font-weight:600}
.a9j{flex:none;display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 12px;border-radius:10px;border:1px solid var(--border-strong);font:13px 'IBM Plex Sans';color:var(--fg)}
.a9j i{font-style:normal;color:var(--fg-faint);font-size:11px}
.mh{position:relative;display:flex;align-items:baseline;gap:8px;padding:10px 14px 8px;font:500 9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);background:var(--surface-inset);border-bottom:1px solid var(--border)}
.mh em{font-style:normal;color:var(--fg-locked);letter-spacing:.06em;text-transform:none}
.mh.stk{box-shadow:0 6px 12px rgba(0,0,0,.35)}
.fd .mh+.fi{border-top:0}
.fd .fi+.mh{border-top:1px solid var(--border)}
.a9d{font:10.5px 'IBM Plex Mono';color:var(--fg-locked)}
.more9{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 6px 4px 14px;border-top:1px solid var(--border)}
.more9 small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.more9 span{min-height:44px;display:flex;align-items:center;padding:0 10px;font:500 13px 'IBM Plex Sans';color:var(--fg)}
.fail9{display:flex;align-items:center;gap:10px;padding:10px 6px 10px 14px;border-top:1px solid var(--border)}
.fail9 p{flex:1;font-size:12.5px;line-height:1.45;color:var(--fg-body)}
.fail9 b{min-height:44px;display:flex;align-items:center;padding:0 10px;font:600 13px 'IBM Plex Sans';color:var(--accent-text);text-decoration:underline;text-underline-offset:2px}
.skel{display:grid;grid-template-columns:46px 1fr;gap:12px;padding:12px 14px;border-top:1px solid var(--border)}
.skel i{display:block;border-radius:4px;background:color-mix(in srgb,var(--fg) 7%,transparent)}
.empt{padding:18px 14px;display:flex;flex-direction:column;gap:6px;border-bottom:1px solid var(--border)}
.empt b{font:600 13.5px 'IBM Plex Sans';color:var(--fg)}
.empt p{font-size:12.5px;line-height:1.5;color:var(--fg-body)}
.empt span{font:500 13px 'IBM Plex Sans';color:var(--accent-text);min-height:36px;display:flex;align-items:center}
.wn9{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 6px 4px 14px;border-top:1px solid var(--border)}
.wn9 a{min-height:44px;display:flex;align-items:center;padding:0 4px;font:500 13px 'IBM Plex Sans';color:var(--fg-muted)}
.wn9 a i{font-style:normal;margin-left:5px;color:var(--fg-faint)}
.wn9 span{min-height:36px;display:flex;align-items:center;padding:0 10px;font:500 13px 'IBM Plex Sans';color:var(--fg)}
.jsheet{position:absolute;left:0;right:0;bottom:0;z-index:31;background:var(--surface);border-top:1px solid var(--border-strong);border-radius:18px 18px 0 0;box-shadow:0 -14px 40px rgba(0,0,0,.6);padding-bottom:24px}
.jscrim{position:absolute;inset:0;background:rgba(8,6,5,.62);z-index:30}
.jsheet .gr{display:block;width:40px;height:4px;border-radius:9px;background:var(--border-strong);margin:8px auto 2px}
.jsheet .hd{display:flex;align-items:center;padding:8px 8px 10px 18px;border-bottom:1px solid var(--border)}
.jsheet .hd h3{flex:1;margin:0;font:700 17px Cinzel,serif;color:var(--fg)}
.jsheet .hd span{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted)}
.a9y{padding:12px 18px 2px;font:600 13px 'IBM Plex Sans';color:var(--fg);display:flex;align-items:baseline;gap:8px}
.a9y em{font:normal 10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.a9g{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:6px 14px}
.a9g span{height:44px;border-radius:9px;border:1px solid var(--border);display:flex;flex-direction:column;align-items:center;justify-content:center;font:13px 'IBM Plex Sans';color:var(--fg)}
.a9g span small{font:9.5px 'IBM Plex Mono';color:var(--fg-faint)}
.a9g span.off{color:var(--fg-disabled,#4A4033);border-style:dashed}
.a9g span.off small{color:var(--fg-disabled,#4A4033)}
.a9g span.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent)}
.pop{position:absolute;z-index:31;width:340px;background:var(--surface);border:1px solid var(--border-strong);border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.6);padding:6px 0 12px}
.pop .a9y{padding:10px 14px 2px}
.pop .a9g{padding:6px 10px}
.pop .a9g span{height:38px}
.dpage{max-width:860px;padding:26px 34px 40px;display:flex;flex-direction:column;gap:14px}
.dpage .a9t h1{margin:0;font:700 28px/1 'Cinzel',serif}
.dpage .a9t p{margin:8px 0 0;font:10px 'IBM Plex Mono';letter-spacing:.06em;color:var(--fg-faint)}
.dpage .a9c{display:flex;gap:10px;align-items:center}
.dpage .a9k{flex:none}
.dpage .a9k span{padding:0 14px;height:32px}
.dpage .a9j{height:40px;margin-left:auto}
.dk .fi .ac{padding-right:0}
.a9 .fi .bd{padding-right:0}
.ph .kr small::before{content:"·";margin-right:7px}
.ph .fi .ac{grid-column:2;justify-content:flex-start}
.ph .fi.home .bd{padding-right:30px}
</style>"""

POSTS = {  # (kind label, date, title, summary, hero or None, lists line or None, decklists two presses)
    "jaws": ("Secret Lair", "Nov 3", "Secret Lair x JAWS is live", "Five full-art cards: the shark, the boat and the beach. On sale until Nov 5 or while supplies last.", "jaws-rising.jpg", None),
    "fdn": ("Commander decklists", "Nov 3", "Foundations Commander: the decklists", "Every card in three of the five decks: Calling All Angels, Keen Engineering and Reign of Dragons. The last two follow next week.", "art-giada.jpg", "3 of 5 lists so far"),
    "sched": ("Wizards news", "Nov 1", "Magic’s 2027 release schedule", "Every set and Commander product through next year, with dates.", "hero-aang.jpg", None),
    "tmnt": ("Secret Lair", "Oct 28", "Secret Lair: Heroes in a Half Shell", "Four turtles, one pizza, and a commander who brings his brothers.", "heroes.jpg", None),
    "ghalta": ("Commander decklists", "Oct 14", "Lost Caverns of Ixalan Commander: the decklists", "All four decks, every card, from Ahoy Mateys to Veloci-Ramp-Tor.", "art-ghalta.jpg", "4 of 4 lists"),
    "bans": ("Wizards news", "Oct 7", "Commander banned and restricted update", "No changes this time, with the panel’s notes on the cards it watched.", None, None),
    "mar1": ("Secret Lair", "Mar 19", "Secret Lair: Ultimate Edition reveals", "The full list, the prices and the date the drop opens.", None, None),
    "mar2": ("Wizards news", "Mar 4", "MagicCon schedule for spring", "The panels, the dates and the cities.", None, None),
}


def row(key, desk=False):
    kd, dt, tt, sm, hero, lists = POSTS[key]
    pic = f'<span class="hp"><img src="art/{hero}" alt=""></span>' if hero else f'<span class="hp none">{GLYPH}</span>'
    lc = f'<div class="lc">{lists}</div>' if lists else ''
    if lists:
        acts = f'<span class="two"><span class="lnk">See the lists ›</span><span class="lnk out">Read the post{XL}</span></span>'
    else:
        acts = f'<span class="lnk">Read on Wizards{XL}</span>'
    return (f'<div class="fi seen">{pic}<div class="bd"><div class="kr"><span class="kd">{kd}</span><small style="display:inline;margin-left:0">{dt}</small></div>'
            f'<div class="tt">{tt}</div><div class="dt cl2">{sm}</div>{lc}</div><div class="ac">{acts}</div></div>')


def month(label, n, stk=False):
    return f'<div class="mh{" stk" if stk else ""}">{label}<em>· {n}</em></div>'


SEG = lambda on: ''.join(f'<span class="{"on" if k == on else ""}">{k}</span>' for k in ["All", "Secret Lair", "Decklists", "News"])


def phone_page(body, seg="All", jump="Nov 2026", overlay='', sub="608 posts from Wizards since Jan 2023"):
    return (f'<div class="ph">{MHD}<div class="a9"><span class="a9b">‹ Home</span><div class="a9t"><h1>Announcements</h1><p>{sub} {L.DRAFT}</p></div>'
            f'<div class="a9c"><div class="a9k new9">{SEG(seg)}</div></div><div class="a9c"><span class="a9j new9">{jump}<i>▾</i></span>'
            f'<span class="a9d" style="margin-left:4px">newest first</span></div><div class="fd" style="margin-top:0">{body}</div></div>{TBAR}{overlay}</div>')


def desk_page(body, seg="All", overlay=''):
    return (f'<div class="dk d4n" style="width:1300px;height:auto;display:flex">{RAIL}<div class="main"><div class="dpage"><span class="a9d">‹ Home</span>'
            f'<div class="a9t"><h1>Announcements</h1><p>608 posts from Wizards since Jan 2023 {L.DRAFT}</p></div>'
            f'<div class="a9c"><div class="a9k new9">{"".join(f"<span class=\"{chr(111)+chr(110) if k == seg else chr(32)}\">{k}</span>" for k in ["All", "Secret Lair", "Commander decklists", "Wizards news"])}</div>'
            f'<span class="a9j new9">Nov 2026<i>▾</i></span></div><div class="fd" style="margin-top:0">{body}</div></div></div>{overlay}</div>')


def jump_sheet(kind=None):
    def mg(year, months, on=None, off=()):
        names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        cells = ''
        for i, nm in enumerate(names[:months]):
            n = [14, 11, 19, 16, 12, 18, 9, 22, 17, 25, 6, 0][i] if year == 2026 else [21, 17, 15, 18, 20, 14, 16, 19, 13, 22, 18, 24][i]
            cls = 'off' if nm in off else ('on' if nm == on else '')
            cells += f'<span class="{cls}">{nm}<small>{n if nm not in off else 0}</small></span>'
        return cells
    off26 = ("Feb", "Apr", "Jul") if kind else ()
    return (f'<div class="a9y">2026<em>· {"42" if kind else "169"}</em></div><div class="a9g">{mg(2026, 11, "Nov", off26)}</div>'
            f'<div class="a9y">2025<em>· {"58" if kind else "217"}</em></div><div class="a9g">{mg(2025, 12, None, ("Jan", "May") if kind else ())}</div>'
            '<div class="a9y">2024<em>· 156</em></div><div class="a9y" style="padding-bottom:8px">2023<em>· 66</em></div>')


def home_foot():
    """What's new on Home, its foot with the new entry."""
    rows = row("jaws") + row("fdn")
    return (f'<div class="ph">{MHD}<div class="a9" style="gap:11px"><h2 class="sh">What’s new <em>· 2 new</em><span style="margin-left:auto;text-transform:none;letter-spacing:0;font:13px \'IBM Plex Sans\';color:var(--fg-muted)">Choose your notifications ›</span></h2>'
            f'<div class="fd" style="margin-top:0">{rows.replace("fi seen", "fi home").replace(">Nov 3<", ">3h ago<").replace('<span class="kd">', '<span class="un"></span><span class="kd">').replace('</span></div></div>', '</span><span class="x4" style="position:absolute;right:6px;top:6px;margin:0">✕</span></div></div>')}'
            f'<div class="wn9"><a class="new9">Past announcements<i>›</i></a><span>Show all 7</span></div></div></div>{TBAR}</div>')


def build():
    S = [L.head('Small items 11 · R1 · account 2 · 2026-11-08 · item 3 · announcements archive',
                'Every Wizards post, on a page of its own',
                'A route, <code>/announcements</code>, reached from the foot of What’s new on Home. It lists every stored post, baseline ones included, newest first, '
                'in the shipped <code>FeedItemRow</code> under month heads, with a kind switch and a month jump. It rides <code>ANNOUNCEMENTS_ENABLED</code>; '
                'no new switch, no push, no credit. The archive is a library, not a feed: no unseen diamond, no ✕, the kicker carries the date, and every kind is listed '
                'whatever Settings says. Copy is DRAFT for /copy-review.')]

    S.append(L.sec('E · The way in, and the page'))
    feb = month("November 2026", 6, stk=True) + row("jaws") + row("fdn") + row("sched") + month("October 2026", 25) + row("tmnt") + row("ghalta") + row("bans")
    feb += '<div class="more9"><small>30 of 608</small><span>Show older</span></div>'
    S.append(L.frames(
        L.fr('<b>E1</b> · 390 · Home, What’s new', home_foot(),
             'The way in: <b>Past announcements ›</b> takes the left of What’s new’s foot, beside the shipped <i>Show all 7</i>. It is there whenever announcements are on, '
             'with or without rows above it, and in the quiet and every-kind-off boxes too. <b>Settings gets no entry</b>: it chooses what reaches you, and the archive '
             'ignores those choices.', w=390),
        L.fr('<b>E2</b> · 390 · the archive', phone_page(feb),
             'Back to Home, the title, a one-line count, the kind switch (the shipped segment, short names at 390), the month jump. One box of rows in the What’s new skin, '
             'with a mono head per month that sticks while its month scrolls. Rows are <code>FeedItemRow</code> as drawn with the kicker’s age replaced by the date. '
             'A post with no hero takes the shipped post-glyph plate. Thirty rows a page; <b>Show older</b> loads the next thirty in place.', w=390),
        L.fr('<b>E3</b> · 1300', desk_page(feb),
             'The page in the 860 main column, as Settings sits. Long kind names fit; the jump sits right. Each row’s presses take the third column as on Home.', w=1300),
    ))

    S.append(L.sec('F · Kinds, dates and loading'))
    dl = month("November 2026", 1, stk=True) + row("fdn") + month("October 2026", 3) + row("ghalta")
    dl += '<div class="more9"><small>2 of 41</small><span>Show older</span></div>'
    empty = ('<div class="a9m stk">March 2025</div>' + '<div class="empt"><b>No Commander decklists in March 2025.</b>'
             '<p>The nearest are in February 2025.</p><span>Go to February 2025 ›</span></div>')
    js = '<div class="jscrim"></div><div class="jsheet new9" style="outline-offset:-3px"><span class="gr"></span><div class="hd"><h3>Jump to a month</h3><span>✕</span></div>' + jump_sheet() + '</div>'
    js2 = '<div class="jscrim"></div><div class="jsheet new9" style="outline-offset:-3px"><span class="gr"></span><div class="hd"><h3>Jump to a month</h3><span>✕</span></div>' + jump_sheet(kind=True) + '</div>'
    loading = (month("November 2026", 6) + row("jaws") + row("fdn") + row("sched") + month("October 2026", 25) + row("tmnt") + row("ghalta") + row("bans")
               + ''.join('<div class="skel"><i style="height:64px"></i><div style="display:flex;flex-direction:column;gap:7px;padding-top:4px"><i style="height:9px;width:40%"></i><i style="height:12px;width:80%"></i><i style="height:10px;width:95%"></i></div></div>' for _ in range(2)))
    fail = (month("November 2026", 6) + row("jaws") + row("fdn") + row("sched") + month("October 2026", 25) + row("tmnt") + row("ghalta") + row("bans")
            + f'<div class="fail9 new9" style="outline-offset:-3px"><p>We couldn’t load older posts. {L.DRAFT}</p><b>Try again</b></div>')
    S.append(L.frames(
        L.fr('<b>F1</b> · 390 · Commander decklists', phone_page(dl, seg="Decklists"),
             'A kind narrows the list in place; the month heads count that kind. A decklists post keeps its <i>N of M lists</i> line and both presses: <b>See the lists ›</b> '
             'while Precons holds that product’s early lists (otherwise it opens the precon pages), and <b>Read the post</b> out.', w=390),
        L.fr('<b>F2</b> · 390 · Jump to a month', phone_page(feb, overlay=js),
             'The jump opens a sheet (a popover from <code>md</code>): years newest first, a 4-wide grid of months, each with its count. The current month is ringed. '
             'Older years fold to one line until pressed. Picking a month lands the list on its head.', w=390),
        L.fr('<b>F3</b> · 390 · the jump under a kind', phone_page(dl, seg="Decklists", overlay=js2),
             'Under a kind the counts are that kind’s, and a month with none is dashed and inert, so the jump never lands on an empty month.', w=390),
        L.fr('<b>F4</b> · 390 · a kind with none in the month', phone_page(empty, seg="Decklists", jump="Mar 2025"),
             'Switching kind while parked on a month that kind never posted in: one line naming both, and a press to the nearest month that has one. '
             'Nothing else is drawn empty.', w=390),
    ))
    S.append(L.frames(
        L.fr('<b>F5</b> · 390 · loading older', phone_page(loading),
             'Show older turns into two skeleton rows at the foot while the next thirty load; the rows above stay put.', w=390),
        L.fr('<b>F6</b> · 390 · a load that failed', phone_page(fail),
             'The rows already loaded stay. The foot says it failed, with one underlined <b>Try again</b> in the place of Show older. A first load that fails says '
             '<i>We couldn’t load announcements.</i> in the box, with the same press.', w=390),
        L.fr('<b>F7</b> · 390 · Wizards news switched off in Settings', phone_page(feb, sub="608 posts from Wizards since Jan 2023"),
             'Exactly E2: the archive lists every kind whatever Settings chose, and a post dismissed on Home is still here. Settings decides what reaches Home and push; '
             'the archive is where you go to look.', w=390),
    ))
    S.append(L.rule('Rulings for item 3', [
        '<b>A route of its own,</b> <code>/announcements</code>, not a sheet: 608 posts want a page, a back button and a link that can be shared. It has no tab-bar slot; Home’s foot is its door.',
        '<b>Row: <code>FeedItemRow</code> as drawn,</b> seen ink, the date in the age slot, no ✕ and no unseen diamond. A denser row would be a second row design for the same post.',
        '<b>Switched-off kinds show</b>, and so do posts dismissed on Home (the brief’s default; dismiss is about the feed).',
        '<b>Dates:</b> month heads in the list plus a month jump. Page by thirty with <b>Show older</b>; no infinite scroll, so the tab bar and foot stay reachable.',
        '<b>Kinds:</b> All · Secret Lair · Commander decklists · Wizards news; at 390 the segment says Decklists and News (DRAFT).',
    ]))
    return L.doc('Small items 11 · 3 · Announcements archive', HELM + CSS, ''.join(S), 1900)
