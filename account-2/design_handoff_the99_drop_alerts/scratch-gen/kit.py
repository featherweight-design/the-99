"""Drop alerts (account 2, 2026-11-10): shared pieces. Boards take the helmet of ONE shipped handoff board
(announcements/Home-Rows for the feed, Lead-Story for pushes, R1b-Settings for Settings) plus lib10's board chrome.
New pieces carry the dashed copper outline (.chg on rows, .new9 elsewhere)."""
import re
import lib11 as L
from lib10 import block

ANN = "design_handoff_the99_announcements"
HR = L.src(f"{ANN}/Home-Rows.dc.html")
HR_HELM = L.src_helmet(f"{ANN}/Home-Rows.dc.html")
DRAFT = L.DRAFT

XL = ('<svg class="xl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" '
      'aria-hidden="true"><path d="M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5"/><path d="M15 3h6v6"/><path d="M10.5 13.5 21 3"/></svg>')
GLYPH = ('<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">'
         '<rect x="4" y="2.8" width="12" height="14.4" rx="1.6"/><path d="M7 7h6M7 10h6M7 13h4"/></svg>')

CSS = """<style>
.board .frames9{align-items:flex-start}
.board .fr9>.cap9{max-width:none}
.board .callout{border:1px solid var(--border-strong);border-radius:12px;background:#15120F;padding:16px 20px;font-size:13px;line-height:1.6;color:var(--fg-body);max-width:1240px}
.board .callout b{color:var(--fg)}
.board .callout ul{margin:6px 0 0;padding-left:18px}.board .callout li{margin:3px 0}
.board .ph{height:auto}
.fi .dt.sl{color:var(--fg)}
.fi .dt.sl+.dt{margin-top:-2px}
.fi .kr small .st{color:var(--accent-text)}
.fi .kr small .ok{color:var(--success)}

.wn9{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 6px 4px 14px;border-top:1px solid var(--border)}
.wn9 a{min-height:44px;display:flex;align-items:center;padding:0 4px;font:500 13px 'IBM Plex Sans';color:var(--fg-muted)}
.wn9 a i{font-style:normal;margin-left:5px;color:var(--fg-faint)}
.wn9 span{min-height:44px;display:flex;align-items:center;padding:0 10px;font:500 13px 'IBM Plex Sans';color:var(--fg)}
.wn9 small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);margin-left:auto}
.dk .wn9 span,.dk .wn9 a{min-height:36px}
.boxw{display:flex;flex-direction:column;gap:12px}
.boxw .sh .r{font-size:12.5px}
.bgd{background:var(--bg);border-radius:14px;padding:16px;border:1px solid #2a241e}
.tbl{border-collapse:collapse;font-size:12.5px;color:var(--fg-body);max-width:1500px}
.tbl th{font:500 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);text-align:left;padding:8px 14px;border-bottom:1px solid var(--border-strong)}
.tbl td{padding:9px 14px;border-bottom:1px solid var(--border);vertical-align:top;line-height:1.5}
.tbl td b{color:var(--fg)}
.tbl td code{font-size:11.5px}
.gone{border:1.5px dashed var(--border-strong);border-radius:10px;padding:10px 14px;font:10.5px 'IBM Plex Mono';color:var(--fg-locked)}
</style>"""

# Shipped rows lifted from Home-Rows, phone (ac inside bd) and desktop (ac after bd).
_b = HR[HR.find('</helmet>'):]
_PH_START = _b.find('<div class="ph d4n"')
_DK_START = _b.find('<div class="dk d4n"')
PH = block(_b, _PH_START)
DK = block(_b, _DK_START)


def _fd(frame):
    i = frame.find('<div class="fd">')
    return i, block(frame, i)


def _rows(fd):
    out = []
    for m in re.finditer(r'<div class="fi[ "]', fd):
        out.append(block(fd, m.start()))
    # nested? keep only top-level ones (each starts after the previous ends)
    top, end = [], -1
    for m in re.finditer(r'<div class="fi[ "]', fd):
        if m.start() >= end:
            blk = block(fd, m.start()); top.append(blk); end = m.start() + len(blk)
    return top


PH_ROWS = _rows(_fd(PH)[1])   # jaws, decklists, price drop, wizards news, combo
DK_ROWS = _rows(_fd(DK)[1])


def seen(r):
    """A shipped row, seen: no diamond, the kicker in --fg-locked."""
    r = r.replace('<span class="un"></span>', '')
    return r.replace('<div class="fi chg">', '<div class="fi seen">').replace('<div class="fi">', '<div class="fi seen">', 1)


def unchg(r):
    return r.replace('<div class="fi chg">', '<div class="fi">')


def dl(r):
    return unchg(r)


def with_age(r, age):
    return re.sub(r'(<div class="kr">.*?<small>)[^<]*(</small>)', lambda m: m.group(1) + age + m.group(2), r, count=1)


# ---- the Upcoming drops row -------------------------------------------------------------------------------------
def up_row(d, desk=False, new=True, xclose=True):
    """d: hero, title, when (kicker word html), lines [(cls, html)], mono, unseen, press."""
    pic = f'<span class="hp"><img src="art/{d["hero"]}" alt=""></span>' if d.get("hero") else f'<span class="hp none">{GLYPH}</span>'
    un = '<span class="un"></span>' if d.get("unseen") else ''
    kick = f'<div class="kr">{un}<span class="kd">Secret Lair</span><small>{d["when"]}</small></div>'
    lines = ''.join(f'<div class="dt {c}">{t}</div>' for c, t in d["lines"])
    mono = f'<div class="lc">{d["mono"]}</div>' if d.get("mono") else ''
    press = d.get("press", f'<span class="lnk">Read on Wizards{XL}</span>')
    x = '<span class="x4">✕</span>' if xclose else ''
    cls = 'fi' + ('' if d.get("unseen") else ' seen') + (' chg' if new else '')
    body = f'{kick}<div class="tt">{d["title"]}</div>{lines}{mono}'
    if desk:
        return f'<div class="{cls}">{pic}<div class="bd">{body}</div><div class="ac">{press}{x}</div></div>'
    return f'<div class="{cls}">{pic}<div class="bd">{body}<div class="ac">{press}{x}</div></div></div>'


def day(label, new=False):
    return f'<p class="fday{" chg" if new else ""}" style="{"outline-offset:-2px;border-radius:0;padding-bottom:6px" if new else ""}">{label}</p>'


def foot(more="2 more", total="Show all 7"):
    m = f'<small>{more}</small>' if more else ''
    return f'<div class="wn9"><a>Past announcements<i>›</i></a>{m}<span>{total}</span></div>'


def section(rows_html, count="1 new", desk=False):
    cnt = f' <em>· {count}</em>' if count else ''
    return (f'<h2 class="sh">What’s new{cnt}<span class="r">Choose your notifications <i>›</i></span></h2>'
            f'<div class="fd">{rows_html}</div>')


def fd_swap(frame, rows_html):
    i, f = _fd(frame)
    return frame[:i] + f'<div class="fd">{rows_html}</div>' + frame[i + len(f):]


def head_fix(frame, count):
    frame = frame.replace('Choose what shows', 'Choose your notifications')
    return re.sub(r'(What’s new <em>· )\d+ new(</em>)', lambda m: m.group(1) + count + m.group(2), frame, count=1)


def phone_home(rows_html, count="3 new"):
    return head_fix(fd_swap(PH, rows_html), count)


def desk_home(rows_html, count="3 new"):
    return head_fix(fd_swap(DK, rows_html), count).replace('style="width:1300px;height:1080px"', 'style="width:1300px;height:auto;min-height:1080px"', 1)


def box(rows_html, w, count="1 new", desk=False):
    """What's new alone (its head and box), at a column width: 358 inside a 390 phone, 642 in the 1300 main column."""
    inner = section(rows_html, count, desk)
    cls = 'dk d4n' if desk else 'ph d4n'
    # the frame classes scope the row grid; reset the frame's own chrome
    return (f'<div class="{cls}" style="width:{w + 32}px;height:auto;min-height:0;border-radius:18px;padding:16px;display:block;background:var(--bg)">'
            f'<div class="boxw">{inner}</div></div>')


# ---- fixture: today is Tue Nov 10, 2026; the reader is in New York (ET) unless a frame says otherwise ----------------
AVATAR = "Secret Lair x Avatar: The Last Airbender"
SHARK = "Secret Lair: Shark Week"
HEROES = "Secret Lair: Heroes in a Half Shell"
U = {
    # day and time, with a pre-queue
    "avatar": dict(hero="hero-aang.jpg", title=AVATAR, when="in 6 days", unseen=True,
                   lines=[("sl", "On sale Mon Nov 16, 12 p.m. your time"), ("", "Pre-queue opens at 11 a.m.")], mono="9 a.m. PT on the US store"),
    # day only
    "shark": dict(hero="jaws-rising.jpg", title=SHARK, when="in 13 days",
                  lines=[("sl", "On sale Mon Nov 23, time to be announced")], mono="US store"),
}

U.update({
    # day and time, no pre-queue; no hero (the shipped plate)
    "ue": dict(hero=None, title="Secret Lair: Ultimate Edition", when="in 2 days",
               lines=[("sl", "On sale Thu Nov 12, 12 p.m. your time")], mono="9 a.m. PT on the US store"),
    "tomorrow": dict(hero="hero-aang.jpg", title=AVATAR, when="tomorrow",
                     lines=[("sl", "On sale Mon Nov 16, 12 p.m. your time"), ("", "Pre-queue opens at 11 a.m.")], mono="9 a.m. PT on the US store"),
    "queue": dict(hero="hero-aang.jpg", title=AVATAR, when='<span class="st">pre-queue open</span>',
                  lines=[("sl", "On sale Mon Nov 16, 12 p.m. your time"), ("", "Pre-queue opened at 11 a.m.")], mono="9 a.m. PT on the US store"),
    "live": dict(hero="hero-aang.jpg", title=AVATAR, when='<span class="ok">on sale now</span>',
                 lines=[("sl", "On sale since 12 p.m. your time")], mono="9 a.m. PT on the US store"),
    "moved": dict(hero="hero-aang.jpg", title=AVATAR, when="in 6 days",
                  lines=[("sl", "On sale Mon Nov 16, 2 p.m. your time"), ("", "Pre-queue opens at 1 p.m.")], mono="11 a.m. PT on the US store"),
    "nozone": dict(hero="hero-aang.jpg", title=AVATAR, when="in 6 days",
                   lines=[("sl", "On sale Mon Nov 16, 9 a.m. PT"), ("", "Pre-queue opens at 8 a.m. PT")], mono="US store"),
    "tokyo": dict(hero="hero-aang.jpg", title=AVATAR, when="in 7 days",
                  lines=[("sl", "On sale Tue Nov 17, 2 a.m. your time"), ("", "Pre-queue opens at 1 a.m.")], mono="Mon 9 a.m. PT on the US store"),
    "passed": dict(hero="hero-aang.jpg", title=AVATAR, when="13d ago",
                   lines=[("cl2", "Four elements, four cards, and the Avatar to master them. On sale Mon Nov 16.")], mono=None),
})

THEMES = {
    "amonkhet": dict(bg="#14110E", surface="#1E1A15", inset="#1B1712", raised="#211D18", sunken="#18140F", border="#2B241B", strong="#3A3229", fg="#EDE6D8", body="#C0B8A6", muted="#A59C89", faint="#948B78", locked="#6E6654", accent="#CF8745", accent_text="#CF8745", success="#6FA368"),
    "kamigawa": dict(bg="#0E0F14", surface="#16181F", inset="#13151C", raised="#191B22", sunken="#101219", border="#181C26", strong="#262A35", fg="#E6E8F0", body="#B1B6C7", muted="#959AAD", faint="#84899B", locked="#606476", accent="#FF4D9A", accent_text="#FF4D9A", success="#6FA368"),
    "ixalan": dict(bg="#0E1310", surface="#171E19", inset="#141B16", raised="#1A221C", sunken="#101512", border="#1D2620", strong="#2C3830", fg="#E0E7DE", body="#B6C2B3", muted="#98A695", faint="#879383", locked="#626E5E", accent="#A3C445", accent_text="#A3C445", success="#5EA990"),
    "phyrexia": dict(bg="#0D0B0E", surface="#151317", inset="#131115", raised="#18161A", sunken="#100E12", border="#19161C", strong="#262329", fg="#E4E2E6", body="#B5B2BB", muted="#9A96A0", faint="#87838D", locked="#64616A", accent="#52827A", accent_text="#5D8E85", success="#6FA368"),
    "eldraine": dict(bg="#120E17", surface="#1B1821", inset="#17141D", raised="#1F1C25", sunken="#131018", border="#241D30", strong="#342C41", fg="#E4DEEE", body="#B9B2C5", muted="#9C95A8", faint="#8F899B", locked="#6A6475", accent="#AE88E6", accent_text="#AE88E6", success="#6FA368"),
    "kaldheim": dict(bg="#121217", surface="#1E1F26", inset="#1A1B22", raised="#22232B", sunken="#16171D", border="#1A1F2B", strong="#2E3340", fg="#C6D2D3", body="#B3C0C2", muted="#95A4A6", faint="#8A999B", locked="#5F6D6E", accent="#6C97DB", accent_text="#6C97DB", success="#6FA368"),
}


def theme_vars(t):
    v = THEMES[t]
    return (f"--bg:{v['bg']};--surface:{v['surface']};--surface-inset:{v['inset']};--surface-raised:{v['raised']};--surface-sunken:{v['sunken']};"
            f"--border:{v['border']};--border-strong:{v['strong']};--fg:{v['fg']};--fg-body:{v['body']};--fg-muted:{v['muted']};--fg-faint:{v['faint']};"
            f"--fg-locked:{v['locked']};--accent:{v['accent']};--accent-text:{v['accent_text']};--success:{v['success']}")
