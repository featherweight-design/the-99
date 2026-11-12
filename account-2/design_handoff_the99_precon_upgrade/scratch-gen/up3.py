"""Upgrade this precon, addendum A2 (account 2, 2026-11-12): the same flow, opened from the deck page.

Hugh's brief: surface "Upgrade precon" on a deck started from the precon, or linked to it as v0, while it has no v1.
The flow (intro, Commander > Bracket > Strategy, wait, results, History) is R2d's, unchanged; only its last button differs,
because the deck already exists: Apply instead of Start. The deck page is redrawn from the shipped spine
(spine-desktop.tsx, spine-mobile.tsx), the deck messages to-do card and the tab strip, in Low Sun tokens as R2d."""
import kit
import up as U
import up2 as V
from kit import img, doc, board_head, frame, frames
from up import DRAFT, note, PRE, CMD

kit.CSS += r"""
/* ---------- the deck page (spine) ---------- */
.dpg{display:flex;flex-direction:column;background:var(--bg)}
.dhd{position:relative;height:288px;border-bottom:1px solid var(--border);background:var(--surface);flex:none;overflow:hidden}
.dhd .art{position:absolute;left:0;top:0;bottom:0;width:560px}
.dhd .art img{width:100%;height:100%;object-fit:cover;object-position:50% 30%;display:block}
.dhd .art::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,color-mix(in srgb,var(--surface) 0%,transparent) 45%,var(--surface) 99%)}
.door{position:absolute;left:16px;bottom:14px;display:flex;border-radius:7px;background:rgba(14,12,10,.82);border:1px solid rgba(255,255,255,.08);z-index:2}
.door span{display:flex;align-items:center;gap:7px;height:30px;padding:0 11px;font:12px 'IBM Plex Mono';color:var(--fg)}
.door span+span{border-left:1px solid rgba(255,255,255,.12)}
.dhd .col{position:absolute;left:592px;bottom:18px;display:flex;flex-direction:column;gap:9px}
.dhd h1,.phd h1{margin:0;font:700 26px 'Cinzel',serif;color:var(--fg);display:flex;align-items:center;gap:8px}
.dhd h1 .pn,.phd h1 .pn{font:14px 'IBM Plex Sans';color:var(--fg-muted)}
.mta{display:flex;align-items:center;gap:8px;font:13px 'IBM Plex Mono';color:var(--fg-body)}
.mta .pp{display:flex;gap:3px}.mta .pp i{width:10px;height:10px;border-radius:2px;display:block}
.chs{display:flex;gap:8px}
.chs .st{height:24px;display:flex;align-items:center;padding:0 8px;border-radius:6px;font:11px 'IBM Plex Mono';color:var(--accent-text);background:color-mix(in srgb,var(--accent) 16%,transparent)}
.chs .st.df{color:var(--fg-body);background:color-mix(in srgb,var(--fg-body) 10%,transparent);border:1px dashed var(--border-dashed)}
.chs .bc{height:24px;display:flex;align-items:center;gap:6px;padding:0 8px 0 5px;border-radius:6px;border:1px solid color-mix(in srgb,#A89A74 60%,transparent);font:11px 'IBM Plex Mono';color:#C9BC96}
.chs .bc svg{width:17px;height:17px;color:#A89A74}
.brw{display:flex;align-items:center;gap:12px}
.brw .bar{width:220px;height:6px;border-radius:99px;background:var(--elevated);overflow:hidden}
.brw .bar i{display:block;height:100%;width:100%;background:var(--fg)}
.brw .ct{font:600 15px 'IBM Plex Mono';color:var(--fg)}.brw .ct em{font-style:normal;font-weight:400;color:var(--fg-faint);margin-left:5px}
.dact{position:absolute;right:24px;bottom:18px;display:flex;flex-direction:column;align-items:flex-end;gap:7px}
.dact .rw{display:flex;gap:9px;align-items:center}
.dact span{height:32px;display:flex;align-items:center;padding:0 14px;border-radius:8px;font:12.5px 'IBM Plex Sans';color:var(--fg);border:1px solid var(--border-strong);white-space:nowrap}
.dact span.p{background:var(--fg);color:var(--bg);border-color:var(--fg);font-weight:500}
.dact span.g{padding:0 11px;color:var(--fg-muted)}
/* the new press: the precon page's accent outline on a 10% tint, at the row's 32px */
.upb{color:var(--accent-text)!important;border:1.5px solid var(--accent)!important;background:color-mix(in srgb,var(--accent) 10%,transparent);font-weight:600!important}
.upb.pulse{animation:rv-pulse 6s ease-out .8s infinite}
.upb.peak{box-shadow:0 0 0 2px color-mix(in oklab,var(--accent) 55%,transparent)}
@media (prefers-reduced-motion:reduce){.upb.pulse{animation:none}}
/* phone spine */
.phd{flex:none;background:var(--surface)}
.phd .band{position:relative;height:288px;overflow:hidden}
.phd .band img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 25%}
.phd .band::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,color-mix(in srgb,var(--surface) 0%,transparent) 38%,color-mix(in srgb,var(--surface) 82%,transparent) 72%,var(--surface))}
.phd .door{left:auto;right:12px;top:12px;bottom:auto}
.phd .door span{height:34px;padding:0 10px}
.phd .blk{position:absolute;left:16px;right:56px;bottom:12px;z-index:2;display:flex;flex-direction:column;gap:7px}
.phd h1{font-size:23px}
.phd .mta{font-size:12px}
.phd .ub{border-top:1px solid var(--border);padding:14px 16px 4px}
.phd .ub .brw .bar{flex:1;width:auto}
.pact{display:flex;justify-content:center;gap:8px;padding:8px 16px 14px;border-bottom:1px solid var(--border)}
.pact span{min-height:44px;display:flex;align-items:center;gap:5px;padding:0 10px;border-radius:7px;border:1px solid var(--border-strong);font:11px 'IBM Plex Mono';color:var(--fg);white-space:nowrap}
.pact span.ex{color:var(--accent-text)}
.pact span.g{color:var(--fg-muted);padding:0 13px}
/* below the spine */
.dbody{display:flex;flex-direction:column;gap:22px;padding:22px 30px 0}
.ph .dbody{padding:18px 16px 0;gap:18px}
.mix .mh{display:flex;gap:12px;align-items:baseline;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.mix .mh b{font-weight:400;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-body)}
.mix .cs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:12px}
.ph .mix .cs{gap:6px}
.mix .c{border:1px solid var(--border-strong);border-radius:9px;padding:11px 13px;display:flex;flex-direction:column;gap:7px}
.ph .mix .c{padding:8px 4px;align-items:center;gap:4px}
.mix .c b{font:400 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.mix .c i{font:normal 600 18px 'IBM Plex Mono';color:var(--success)}.mix .c i em{font-style:normal;font-weight:400;font-size:13px;color:var(--fg-faint)}
.mix .c i.sh{color:var(--accent-text)}
.mix .c .tr{height:4px;border-radius:9px;background:var(--success)}
.ph .mix .c .tr{display:none}
.ph .mix .c small{font-size:10px;letter-spacing:-.02em}
.mix .c small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);display:flex;justify-content:space-between}
.mix .c small a{color:var(--accent-text)}
.dtb{display:flex;gap:30px;border-bottom:1px solid var(--border);padding:0 30px;flex:none}
.ph .dtb{gap:24px;padding:0 16px;white-space:nowrap;overflow:hidden}
.dtb span{padding:16px 0 15px;font:500 16px 'IBM Plex Sans';color:var(--fg-muted);border-bottom:2px solid transparent;white-space:nowrap}
.dtb span em{font:normal 13px 'IBM Plex Mono';color:var(--fg-faint);margin-left:6px}
.dtb span.on{color:var(--fg);border-color:var(--accent)}
.dls{padding:16px 30px 20px;display:flex;flex-direction:column;gap:6px}
.ph .dls{padding:14px 16px 16px}
.dls h4{margin:6px 0 4px;font:600 15px 'IBM Plex Sans';color:var(--fg)}.dls h4 em{font:normal 12px 'IBM Plex Mono';color:var(--fg-faint);margin-left:8px}
.drw{display:flex;align-items:center;gap:12px;height:44px;padding:0 14px;border-radius:8px;background:var(--surface);font-size:14.5px;color:var(--fg);position:relative}
.drw .ow{width:8px;height:8px;border-radius:50%;background:var(--success);flex:none}
.drw .ow.no{background:transparent;border:1.5px dashed var(--fg-faint)}
.drw .nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.drw .x{color:var(--fg-faint);font-size:14px;margin-left:10px}
.drw.ch::before{content:'';position:absolute;left:0;top:6px;bottom:6px;width:3px;border-radius:2px;background:#B8954A}
.pips{display:flex;gap:2px;align-items:center}
.pips i{width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:normal 600 9.5px 'IBM Plex Mono';color:#14110E}
.pips i.n{background:#9C9384}
/* the to-do card's next step (deck messages A2) */
.tdc{border:1px solid var(--border-strong);border-radius:12px;overflow:hidden;background:var(--surface)}
.tdc .hh{display:flex;justify-content:space-between;padding:12px 18px;font:10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.tdc .hh em{font-style:normal;letter-spacing:0;text-transform:none}
.tdc .ns{display:flex;align-items:center;gap:14px;padding:14px 18px;background:var(--elevated);box-shadow:inset 3px 0 0 var(--accent)}
.tdc .ns .gl{width:34px;height:34px;border-radius:8px;background:var(--surface-sunken);display:flex;align-items:center;justify-content:center;color:var(--accent-text);font:13px 'IBM Plex Mono';flex:none}
.tdc .ns .tx{flex:1;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.ph .tdc .ns .tx{flex-direction:column;gap:3px}
.tdc .ns small{font:10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--accent-text)}
.tdc .ns b{font:600 15px 'IBM Plex Sans';color:var(--fg)}.tdc .ns b .pl{color:var(--success);font-weight:500}.tdc .ns b .mi{color:var(--accent-text);font-weight:500}
.tdc .ns p{font-size:14px;color:var(--fg-body)}
.tdc .ns .rv{height:40px;display:flex;align-items:center;padding:0 22px;border-radius:9px;background:var(--fg);color:var(--bg);font:600 14px 'IBM Plex Sans';flex:none;white-space:nowrap}
.dls .key{font:11px 'IBM Plex Mono';color:var(--fg-faint);margin-bottom:4px}
/* the shared toast (ToastFrame) */
.tst{position:absolute;z-index:25;display:flex;align-items:center;gap:14px;min-height:48px;padding:0 6px 0 16px;border-radius:10px;background:var(--elevated);border:1px solid var(--border-strong);box-shadow:0 10px 28px rgba(0,0,0,.5);font-size:14px;color:var(--fg)}
.tst b{margin-left:auto;font:600 14px 'IBM Plex Sans';color:var(--accent-text);padding:0 12px;min-height:44px;display:flex;align-items:center}
.tst .x{color:var(--fg-faint);padding:0 10px}
.ph .tst{left:12px;right:12px;bottom:86px}
.dk .tst{left:50%;transform:translateX(-50%);bottom:28px;width:520px}
/* crops for the states and themes boards */
.crop{border:1px solid var(--border-strong);border-radius:12px;overflow:hidden;background:var(--bg);position:relative}
.crop .dhd{border-bottom:0}
.thm{display:flex;flex-direction:column;gap:26px}
.thr{display:flex;gap:24px;align-items:flex-end}
.stl{display:flex;gap:24px;align-items:center}
.stl .crop{zoom:.7;flex:none}
.stl .cap2{font-size:13.5px;line-height:1.55;color:var(--fg-muted)}
.stl .cap2 b{color:var(--fg)}
.thm .fr{flex:1}
.ttag{font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.ttag b{color:var(--fg);font-weight:600}
.tv{width:1300px;zoom:.66;flex:none}
.tvp{width:390px}
"""

THEMES = {
    "amonkhet": ("Low Sun", {}),
    "kamigawa": ("Neon Rain", dict(bg="#0E0F14", surface="#16181F", **{"surface-sunken": "#101219", "elevated": "#20222A", "border": "#181C26", "border-strong": "#262A35", "fg": "#E6E8F0", "fg-body": "#B1B6C7", "fg-muted": "#959AAD", "fg-faint": "#84899B", "accent": "#FF4D9A", "accent-text": "#FF4D9A", "success": "#6FA368"})),
    "ixalan": ("Canopy", dict(bg="#0E1310", surface="#171E19", **{"surface-sunken": "#101512", "elevated": "#212A23", "border": "#1D2620", "border-strong": "#2C3830", "fg": "#E0E7DE", "fg-body": "#B6C2B3", "fg-muted": "#98A695", "fg-faint": "#879383", "accent": "#A3C445", "accent-text": "#A3C445", "success": "#5EA990"})),
    "phyrexia": ("Oil Haze", dict(bg="#0D0B0E", surface="#151317", **{"surface-sunken": "#100E12", "elevated": "#1E1C20", "border": "#19161C", "border-strong": "#262329", "fg": "#E4E2E6", "fg-body": "#B5B2BB", "fg-muted": "#9A96A0", "fg-faint": "#87838D", "accent": "#52827A", "accent-text": "#5D8E85", "success": "#6FA368"})),
    "eldraine": ("Witching Hour", dict(bg="#120E17", surface="#1B1821", **{"surface-sunken": "#131018", "elevated": "#26232C", "border": "#241D30", "border-strong": "#342C41", "fg": "#E4DEEE", "fg-body": "#B9B2C5", "fg-muted": "#9C95A8", "fg-faint": "#8F899B", "accent": "#AE88E6", "accent-text": "#AE88E6", "success": "#6FA368"})),
    "kaldheim": ("First Frost", dict(bg="#121217", surface="#1E1F26", **{"surface-sunken": "#16171D", "elevated": "#2D2E35", "border": "#1A1F2B", "border-strong": "#2E3340", "fg": "#C6D2D3", "fg-body": "#B3C0C2", "fg-muted": "#95A4A6", "fg-faint": "#8A999B", "accent": "#6C97DB", "accent-text": "#6C97DB", "success": "#6FA368"})),
}


def tvars(key):
    return ";".join(f"--{k}:{v}" for k, v in THEMES[key][1].items())


DOOR = ('<div class="door"><span>⛶ Card details</span><span>'
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4"/></svg>Change commander</span></div>')
PHDOOR = ('<div class="door"><span>⛶</span><span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4"/></svg></span></div>')
EXPORT_IC = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fg-faint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
             '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>')
BC2 = V.BSVG[2]


def meta():
    return ('<div class="mta"><span class="pp"><i style="background:var(--u)"></i><i style="background:var(--r)"></i></span>'
            f'<span>{CMD} · Izzet</span></div>')


def chips(draft=False):
    st = '<span class="st df">Draft</span>' if draft else '<span class="st">To buy</span>'
    return f'<div class="chs">{st}<span class="bc">{BC2}Core</span></div>'


def bar():
    return '<div class="brw"><div class="bar"><i></i></div><span class="ct">99<em>/ 99</em></span></div>'


def up_btn(state="pulse"):
    return f'<span class="upb {state} new9">Upgrade precon</span>' if state else ""


def dk_spine(btn="pulse", draft=False):
    acts = (up_btn(btn) if btn else "") + '<div class="rw"><span>Update from a list</span><span class="p">Export</span><span class="g">⋯</span></div>'
    return (f'<div class="dhd"><div class="art"><img src="{img("a-rootha.jpg")}" alt=""></div>{DOOR}'
            f'<div class="col"><h1>{PRE}<span class="pn">✎</span></h1>{meta()}{chips(draft)}{bar()}</div>'
            f'<div class="dact">{acts}</div></div>')


def ph_spine(btn="pulse", draft=False):
    acts = (f'<span>Update</span><span class="ex">{EXPORT_IC}</span>{up_btn(btn)}<span class="g">⋯</span>')
    return (f'<div class="phd"><div class="band"><img src="{img("a-rootha.jpg")}" alt="">{PHDOOR}'
            f'<div class="blk"><h1>{PRE}<span class="pn">✎</span></h1>{meta()}{chips(draft)}</div></div>'
            f'<div class="ub">{bar()}</div><div class="pact">{acts}</div></div>')


def pips(cost):
    out = ""
    for ch in cost:
        if ch.isdigit():
            out += f'<i class="n">{ch}</i>'
        else:
            out += f'<i style="background:var(--{ch.lower()})"></i>'
    return f'<span class="pips">{out}</span>'


MIX = [("Ramp", 10, 10, "cards"), ("Draw", 9, 10, "cards"), ("Removal", 7, 8, "cards"), ("Wipes", 2, 2, "cards"), ("Land", 36, 37, "balance")]


def mix(desk):
    cs = ""
    for n, h, r, a in MIX:
        sh = " sh" if h < r else ""
        if desk:
            cs += (f'<div class="c"><b>{n}</b><i class="{sh.strip()}">{h}<em> / {r}</em></i><span class="tr" style="width:{min(100, round(h / r * 100))}%;{"background:var(--accent)" if sh else ""}"></span>'
                   f'<small><span>rec {r}</span><a>{a} →</a></small></div>')
        else:
            cs += f'<div class="c"><b>{n}</b><i class="{sh.strip()}">{h}</i><small>rec {r}</small><small><a>{a} →</a></small></div>'
    return (f'<section class="mix"><div class="mh"><b>Recommended mix</b><span>A common starting point</span></div><div class="cs">{cs}</div></section>')


def tabs(ver="1", deck=99):
    return (f'<div class="dtb"><span class="on">Your deck<em>{deck}</em></span><span>Analysis</span><span>Consider<em>99</em></span>'
            f'<span>Games<em>0</em></span><span>Versions<em>{ver}</em></span></div>')


ROWS = [("Arcane Denial", "1U", True, False), ("Big Score", "3R", True, False), ("Counterspell", "UU", False, False), ("Electrodominance", "XUR", True, False),
        ("Expressive Iteration", "UR", True, False), ("Lightning Bolt", "R", True, False)]
ROWS_AFTER = [("Arcane Denial", "1U", True, False), ("Big Score", "3R", True, False), ("Counterspell", "UU", False, True), ("Electrodominance", "XUR", True, False),
              ("Mizzix’s Mastery", "3R", False, True), ("Swan Song", "U", False, True)]


def rows(rs, key=""):
    out = "".join(f'<div class="drw{" ch" if c else ""}"><span class="ow{"" if o else " no"}"></span><span class="nm">{n}</span>{pips(cost)}<span class="x">✕</span></div>'
                  for n, cost, o, c in rs)
    return f'<div class="dls">{key}<h4>Instants<em>15</em></h4>{out}</div>'


def todo(desk):
    rv = '<span class="rv">Review ›</span>'
    return (f'<div class="tdc new9"><div class="hh"><span>Before {PRE} is ready</span><em>1 to do</em></div>'
            f'<div class="ns"><span class="gl">±</span><div class="tx"><small>Next step</small><b>30 changes since v0 <span class="pl">+15</span> / <span class="mi">−15</span></b>'
            f'<p>Commit them as v1 in Review.</p></div>{rv}</div></div>')


def dk_page(btn="pulse", draft=False):
    return f'<div class="dpg">{dk_spine(btn, draft)}<div class="dbody">{mix(True)}</div><div style="height:18px"></div>{tabs()}{rows(ROWS)}</div>'


def ph_page(btn="pulse"):
    return f'<div class="dpg">{ph_spine(btn)}<div class="dbody">{mix(False)}</div><div style="height:14px"></div>{tabs()}{rows(ROWS[:3])}</div>'


KEY = '<p class="key">the brass rule marks the 30 rows you have changed</p>'
TOAST = '<div class="tst new9">Applied 14 swaps. Muddle leads.<b>Undo</b><span class="x">✕</span></div>'


def ph_after():
    body = f'<div class="dpg"><div class="dbody">{todo(False)}{mix(False)}</div><div style="height:14px"></div>{tabs()}{rows(ROWS_AFTER, KEY)}</div>'
    return kit.phone(body, "Decks", h=844, over=TOAST)


def dk_after():
    body = (f'<div class="dpg"><div class="dbody">{todo(True)}{mix(True)}</div><div style="height:18px"></div>{tabs()}{rows(ROWS_AFTER, KEY)}</div>')
    return kit.desk(body, "Decks", h=760, over=TOAST)


# ---------------------------------------------------------------- the flow, opened from the deck page
INTRO_DECK = V.INTRO.replace(f'<div>{V.IC_VER}', f'<div class="new9" style="outline-offset:2px">{V.IC_VER}').replace(
    '<b>Nothing changes until you start a deck from it.</b> That makes a new draft; the box stays its v0.',
    '<b>Nothing changes until you apply the swaps.</b> They land as changes since v0, and you commit them as v1.')


def intro_deck():
    body = (f'<p class="qs" style="margin-top:0">Turn this precon into a stronger deck in a direction you choose. Here’s what to expect.{DRAFT}</p>'
            + INTRO_DECK)
    return V.flow(body, V.foot("Next · Commander", back="Not now", line="You have 15 welcome credits · this run would use 2"), hist=True)


def res_deck(n_show=None):
    f = V.foot('<span class="new9" style="padding:2px 4px">Apply these 14 swaps</span>', back='Try another strategy<em class="cst">2 credits</em>', stk=True)
    return V.flow(V.res_body(n_show), f, step="Done", fade=n_show is not None, title="Your upgrade", hist=True)


def hist_deck():
    return V.flow(V.res_body(3, past=True), V.foot('<span class="new9" style="padding:2px 4px">Apply these 14 swaps</span>', back='Try another strategy<em class="cst">2 credits</em>', stk=True),
                  fade=True, title="Your upgrade", back="‹ History")


def ph_over(f, h=844):
    return kit.phone(ph_page(None), "Decks", h=h, over=f)


def dk_over(f, h=860):
    return kit.desk(dk_page(None), "Decks", h=h, over=f)


# ================================================================ boards
W = 1300 + 112
WP = 1414


def b_main():
    calls = [
        "<b>Where it sits: with the deck header’s actions,</b> the one place on the deck page that holds actions on the whole deck, above the fold at both widths. On a phone it joins the action row (<code>Update</code>, Export, <code>Upgrade precon</code>, <code>⋯</code>), which still holds one line at 390. On desktop it sits on its own line right above the row, right-aligned, because four buttons beside a title column would wrap the row onto two broken lines. "
        "It is the precon page’s button (R2c) at the row’s size: <code>Upgrade precon</code>, accent outline on a 10% accent tint, 32px on desktop and the row’s 44px on a phone, with no icon and no line beside it. Export keeps the row’s one filled button.",
        "<b>The same eye-catch:</b> the shipped <code>line-pulse</code> plays twice the first time the deck page opens with the button on it, then rests. None under reduced motion.",
        "<b>When it shows.</b> The deck has a precon’s v0 and no v1. That covers a deck started from the precon, whose v0 is its own first version, and a deck linked to the precon whose Versions draw v0 apart. "
        "<b>My addition:</b> it also hides while the deck holds changes since v0. The swaps are worked out from the box’s own list, so a deck that has already moved off it has, in your words, already been changed from the original precon. Discard the changes in Review, or undo an Apply, and it comes back.",
        "<b>The flow is R2d’s, unchanged:</b> what to expect, Commander › Bracket › Strategy, the confirm, the wait, the results and History, in the same sheet and dialog. Runs belong to the precon, so a run made on the precon page is in History here and the other way round.",
        "<b>Two lines change, because the deck already exists.</b> The intro’s last line says the swaps land as changes since v0 to commit as v1, not that Start makes a new draft. The results’ button is <code>Apply these 14 swaps</code> in place of <code>Start the deck with these 14 swaps</code>; the same button shows on a past upgrade opened from History.",
        "<b>Apply is one button with one Undo,</b> as on the result itself: the results are already the review, so there’s no second confirm. The flow closes and the shared toast says <code>Applied 14 swaps. Muddle leads.</code> with Undo. "
        "The swaps land as ordinary changes since v0, marked by the brass rule, and the to-do card’s next step is the shipped <code>30 changes since v0 · Commit them as v1 in Review.</code> The button has gone, because the deck has moved off the box.",
        "<b>The commander comes with it.</b> When the run is led by the alternate, Apply makes Muddle the commander and puts Rootha in the 99, so the 99 moves by 15 in and 15 out: the 14 swaps plus Rootha for Muddle. Undo puts both back.",
    ]
    gaps = [
        "<b>G16 · The gate.</b> The button needs the deck’s precon origin (<code>readDeckOriginAndStart</code>), no committed version after v0, and a list that still matches v0. For a linked deck, “no v1” means no committed version at all.",
        "<b>G17 · Apply.</b> One write that sets the deck’s 99 to the result’s list and, for an alternate, its commander, as one undoable change. A new server action, beside v2’s apply.",
        "<b>G18 · Runs read from the deck page.</b> <code>readUpgrades</code> by the deck’s precon, so History is the same list on both pages.",
        "G1, G9, G10, G12 and G15 stand as written in R2d’s READINESS. G15 (I own this precon) doesn’t apply here: the deck exists and its cards are already counted.",
    ]
    body = (board_head("Upgrade this precon · A2 · the calls", "The same flow, from the deck page",
                       "Hugh’s brief: show <b>Upgrade precon</b> on a deck that started from the precon, or is linked to it as v0, until it has a v1. The flow is R2d’s as approved; only the way in and the last button are new. "
                       "Drawn over the shipped deck header (<code>spine-desktop.tsx</code>, <code>spine-mobile.tsx</code>), with the same fixture, Prismari Artistry led by Rootha. Dashed outlines mark what’s new.", tag="A2")
            + note("Design calls · A2", calls, True) + note("Gaps for engineering · A2", gaps)
            + frames(frame("<b>D1</b> · 1300 · a deck started from the precon, at v0", kit.desk(dk_page("pulse"), "Decks", h=700),
                           "The button sits on its own line over the header’s action row. Everything else on the page is as shipped.")))
    return doc("Upgrade A2 calls", body, W)


def b_page():
    body = (board_head("A2 · 1 · The deck page", "One more button in the header",
                       "Phone and desktop, live (the pulse loops here for review) and at the pulse’s peak.", tag="A2")
            + frames(frame("<b>D1</b> · 390 · live", kit.phone(ph_page("pulse"), "Decks", h=844),
                           "In the action row under the bar: <code>Update</code>, Export’s icon, <code>Upgrade precon</code>, <code>⋯</code>. The row holds one line at 390, as it does for Commit as v1."),
                     frame("<b>D1p</b> · 390 · the pulse at its peak", kit.phone(ph_page("peak"), "Decks", h=844),
                           "A 2px accent ring at 55%, fading out. Twice, then still."),
                     frame("<b>D0</b> · 390 · has a v1", kit.phone(ph_page(None), "Decks", h=844),
                           "No button: the row is as shipped."), gap=36)
            + frames(frame("<b>D1p</b> · 1300 · the pulse at its peak", kit.desk(dk_page("peak"), "Decks", h=560))))
    return doc("Deck page", body, WP)


def crop_dk(btn, draft=False):
    return f'<div class="crop" style="width:1300px">{dk_spine(btn, draft)}</div>'


def b_states():
    rws = [
        ("<b>Started from the precon</b> · v0 is its own first version · no changes", "pulse", False, "Shows."),
        ("<b>Linked to the precon</b> · v0 drawn apart in Versions · nothing committed after it", "pulse", False, "Shows. Linking never changes the cards, so the list is still the box when the deck was the box."),
        ("<b>Changes since v0</b> · not committed yet", None, True, "Hidden: the deck has already moved off the box. Discarding the changes in Review brings it back."),
        ("<b>Has a v1</b>", None, False, "Hidden, as you ruled. It never comes back for this deck."),
        ("<b>Not from a precon</b>", None, False, "Hidden. The Versions tab’s shipped <code>Built from a precon? Link a precon</code> is the way to a v0."),
    ]
    fr = "".join(f'<div class="fr" style="gap:10px"><div class="lab">{lab}</div><div class="stl">{crop_dk(b, d)}<p class="cap2">{cap}</p></div></div>' for lab, b, d, cap in rws)
    body = (board_head("A2 · 2 · When the button shows", "A precon’s v0, and nothing after it",
                       "Each row is the shipped desktop header in one state; the phone row follows the same rule.", tag="A2")
            + f'<div style="display:flex;flex-direction:column;gap:28px">{fr}</div>')
    return doc("When it shows", body, W)


def b_flow():
    body = (board_head("A2 · 3 · The flow from the deck page", "R2d’s flow, over the deck",
                       "The button opens the same sheet and dialog. The steps between these two screens (Commander, Bracket, Strategy, the wait) are R2d’s boards 3 to 6, unchanged.", tag="A2")
            + frames(frame("<b>I1</b> · 390 · what to expect", ph_over(intro_deck()), "The last line now says what Apply does. History is in the title row once a run exists, from either page."),
                     frame("<b>R1</b> · 390 · results", ph_over(res_deck(n_show=4)), "<code>Apply these 14 swaps</code> where Start was. Try another strategy is as approved."),
                     frame("<b>H2</b> · 390 · a past upgrade from History", ph_over(hist_deck()), "A run made on the precon page, opened here. It applies the same way, for no credit."), gap=36)
            + frames(frame("<b>R1</b> · 1300 · results", dk_over(res_deck(n_show=6), h=860), "The dialog, 720 wide. The four facts, the Commander group and the pairs are R2d’s.")))
    return doc("Flow from the deck", body, WP)


def b_after():
    body = (board_head("A2 · 4 · After Apply", "Ordinary changes since v0",
                       "The flow closes. The toast says what happened with one Undo; the swaps are changes since v0 like any others, and the to-do card asks for the commit. Both frames are scrolled to the card, as the shipped captures are.", tag="A2")
            + frames(frame("<b>A1</b> · 390 · scrolled to the card", ph_after(),
                           "The brass rule marks every changed row, as shipped. The button has left the header, so it isn’t in reach to run twice."),
                     frame("<b>A1</b> · 1300", dk_after(), "Undo restores the box’s list and Rootha; Review is the shipped commit as v1."), gap=36))
    return doc("After Apply", body, 390 + 1300 + 36 + 112)


def b_themes():
    cells = ""
    for k, (name, _) in THEMES.items():
        dk = f'<div class="crop tv" style="{tvars(k)}">{dk_spine("peak")}</div>'
        ph = f'<div class="crop tvp" style="{tvars(k)}"><div class="pact" style="border:0;padding:14px 16px">' \
             f'<span>Update</span><span class="ex">{EXPORT_IC}</span>{up_btn("peak")}<span class="g">⋯</span></div></div>'
        cells += f'<div class="fr" style="gap:10px"><div class="ttag"><b>{name}</b> · {k}</div><div class="thr">{dk}{ph}</div></div>'
    body = (board_head("A2 · 5 · All six themes", "The button in every theme",
                       "The desktop header and the phone action row at the pulse’s peak, in each theme’s own tokens (globals.css). The accent ink is each theme’s <code>--accent-text</code>; Oil Haze uses its lighter one.", tag="A2")
            + f'<div class="thm">{cells}</div>')
    return doc("Six themes", body, W)


BOARDS = [("A2-Calls", b_main, "A2 · the calls"), ("A2-Deck-Page", b_page, "A2 · 1 · The deck page"), ("A2-When-It-Shows", b_states, "A2 · 2 · When it shows"),
          ("A2-Flow", b_flow, "A2 · 3 · The flow from the deck"), ("A2-After-Apply", b_after, "A2 · 4 · After Apply"), ("A2-Themes", b_themes, "A2 · 5 · All six themes")]


# ================================================================ A2b: other places (Hugh 2026-11-12: header placement rejected)
kit.CSS += r"""
.pcb{display:flex;align-items:center;gap:14px;padding:12px 30px;background:var(--surface-rail);border-bottom:1px solid var(--border)}
.ph .pcb{flex-direction:column;align-items:stretch;gap:10px;padding:12px 16px 14px}
.pcb .tx{display:flex;align-items:baseline;gap:12px;flex:1;min-width:0;flex-wrap:wrap}
.ph .pcb .tx{flex-direction:column;gap:3px}
.pcb .tx b{font:600 13.5px 'IBM Plex Sans';color:var(--fg)}
.pcb .tx span{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.pcb .upb,.obt .upb,.vrw .upb{height:32px;display:flex;align-items:center;justify-content:center;padding:0 16px;border-radius:8px;font:13px 'IBM Plex Sans';white-space:nowrap}
.ph .pcb .upb,.ph .obt .upb,.ph .vrw .upb{height:44px;border-radius:9px;font-size:14px}
.obt{display:flex}
.dk .obt{align-self:flex-start}
.ph .obt .upb{flex:1}
.vrw{display:flex;align-items:center;gap:16px;border:1px solid var(--border-strong);border-radius:12px;padding:16px 20px;background:var(--surface);box-shadow:inset 3px 0 0 var(--accent)}
.ph .vrw{flex-direction:column;align-items:stretch;gap:12px;padding:14px 16px}
.vrw .v{font:500 15px 'IBM Plex Mono';color:var(--accent-text);width:44px;flex:none}
.vrw .bd{flex:1;display:flex;flex-direction:column;gap:4px;min-width:0}
.vrw .bd b{font:500 16px 'IBM Plex Sans';color:var(--fg)}
.vrw .bd span{font:11.5px 'IBM Plex Mono';color:var(--fg-faint)}
.vrw .cur{font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;color:var(--accent-text);border:1px solid color-mix(in srgb,var(--accent) 55%,transparent);border-radius:5px;padding:3px 7px}
.ph .vrw .hd{display:flex;align-items:center;gap:10px}
.dtb span.vo{color:var(--fg);border-color:var(--accent)}
.optl{font:600 11px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--accent-text)}
"""


def band(desk):
    return (f'<div class="pcb new9" style="outline-offset:-2px;border-radius:0"><div class="tx"><b>Started from the {PRE} precon</b><span>You own 41 of its 85</span></div>'
            f'<span class="upb pulse">Upgrade precon</span></div>')


def v0_row(desk):
    btn = '<span class="upb pulse new9">Upgrade precon</span>'
    if desk:
        return (f'<div class="vrw"><span class="v">v0</span><div class="bd"><b>{PRE}</b><span>the box as it came · 99 cards · mv 3.10</span></div>'
                f'{btn}<span class="cur">CURRENT</span></div>')
    return (f'<div class="vrw"><div class="hd"><span class="v" style="width:auto">v0</span><span class="cur">CURRENT</span></div><div class="bd"><b>{PRE}</b>'
            f'<span>the box as it came · 99 cards</span></div>{btn}</div>')


def vtabs():
    return ('<div class="dtb"><span>Your deck<em>99</em></span><span>Analysis</span><span>Consider<em>99</em></span>'
            '<span>Games<em>0</em></span><span class="vo">Versions<em>1</em></span></div>')


def opt_page(o, desk):
    sp = dk_spine(None) if desk else ph_spine(None)
    gap = '<div style="height:18px"></div>' if desk else '<div style="height:14px"></div>'
    if o == "B":
        return f'<div class="dpg">{sp}{band(desk)}<div class="dbody">{mix(desk)}</div>{gap}{tabs()}{rows(ROWS if desk else ROWS[:3])}</div>'
    if o == "C":
        btn = '<div class="obt new9"><span class="upb pulse">Upgrade precon</span></div>'
        return f'<div class="dpg">{sp}<div class="dbody">{btn}{mix(desk)}</div>{gap}{tabs()}{rows(ROWS if desk else ROWS[:3])}</div>'
    # D: the Versions tab's v0 row
    pad = "16px 30px" if desk else "14px 16px"
    if not desk:
        return f'<div class="dpg"><div class="dbody">{mix(desk)}</div>{gap}{vtabs()}<div style="padding:{pad}">{v0_row(desk)}</div></div>'
    return f'<div class="dpg">{sp}<div class="dbody">{mix(desk)}</div>{gap}{vtabs()}<div style="padding:{pad}">{v0_row(desk)}</div></div>'


OPTS = [("B", "A precon band under the header", "The shipped precon band (deck messages: which precon, what you own) stays while the deck is still the box, with the button at its end. "
         "It’s where the deck already says it came from a precon, so the button reads as part of that. On the first visit it is the arrival band itself, with its ✕; after that it stays without one, until the deck moves off the box."),
        ("C", "First thing under the header", "The bare button above the Recommended mix: full width on a phone, its own width on desktop. "
         "It’s the precon page’s placement (under the Overview), so the two pages match. Loudest of the three."),
        ("D", "On v0 in the Versions tab", "The button on the box’s own row in Versions, where v0 and v1 live. Quietest: it’s exactly in context, but a player has to open Versions to find it, so the pulse does little.")]


def b_opts_phone():
    fr = [frame(f'<b>{o}</b> · 390 · {t}' + (' · scrolled' if o == 'D' else ''), kit.phone(opt_page(o, False), "Decks", h=844), c) for o, t, c in OPTS]
    body = (board_head("A2b · Other places · phone", "Three other spots for the button",
                       "Hugh didn’t like the header. B, C and D, each the only change on the shipped deck page. The flow, Apply and the gate are as drawn in A2; only the way in moves. "
                       "<b>I’d pick B.</b>", tag="A2b")
            + frames(*fr, gap=36))
    return doc("Other places phone", body, WP)


def b_opts_desk():
    fr = "".join(frame(f'<b>{o}</b> · 1300 · {t}', kit.desk(opt_page(o, True), "Decks", h=640)) for o, t, _ in OPTS)
    body = (board_head("A2b · Other places · desktop", "The same three at 1300",
                       "B is one line on desktop: where the deck came from, what you own, and the button at the right.", tag="A2b")
            + f'<div style="display:flex;flex-direction:column;gap:36px">{fr}</div>')
    return doc("Other places desktop", body, W)


BOARDS = [("A2b-Options-Phone", b_opts_phone, "A2b · Other places · phone"), ("A2b-Options-Desktop", b_opts_desk, "A2b · Other places · desktop")]
