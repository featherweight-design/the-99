"""Small items 2 (account 1, 2026-10-28): deck-page pieces on top of account 2's deck-messages kit.

Redrawn from src: quick-add-bar.tsx / card-search-row.tsx (the dock, the popover, the result row), edit-toast.tsx
(ToastFrame, the deck slot), suggestion-tile.tsx + card-tile-caption.tsx (the Consider tile), seat-picker.tsx and
game-seats.tsx (the game log's seats and picker). Low Sun tokens. Every string is shipped copy unless marked new.
"""
import kit
import pieces as P
import tb

for k in ["swan-song", "swords", "aang-swift-savior", "counterspell", "mystical-tutor", "appa-steadfast", "jasmine-tea-shop",
          "sokka", "fire-lord-zuko", "hakoda", "firebending-lesson", "appa-loyal", "gleaming-splendor", "path"]:
    kit.LOCAL["c-" + k] = f"art/c-{k}.jpg"
for k in ["ghalta", "giada", "gisa", "jace", "dina", "sai", "lathliss"]:
    kit.LOCAL["crop-" + k] = f"art/crop-{k}.jpg"
kit.LOCAL["aang"] = "art/hero-aang.jpg"
kit.LOCAL["c-giada"] = "art/giada.jpg"
img = kit.img

P.DECKS["aang"] = dict(name="HD - Avatar Aang", cmd="Avatar Aang // Aang, Master of Elements", color="5-color",
                       pips=["w", "u", "b", "r", "g"], art="aang", status="Building", built=94,
                       bracket=("b3", "Upgraded", "var(--bracket-3)"))

kit.CSS += tb.CSS + r"""
.ph.fix{height:844px}
.ph .pbx{flex:1 1 auto;min-height:0;position:relative;overflow:hidden;display:flex;flex-direction:column}
.ph .pbx>.scr{flex:none}
/* quick-add dock (builder-shell.tsx:2309) */
.qd{position:absolute;left:0;right:0;bottom:0;z-index:8;background:var(--bg);border-top:1px solid var(--border);padding:10px 16px 12px;display:flex;flex-direction:column}
.dkm .qd,.qd.dk2{position:relative;padding:11px 30px}
.qd .br{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.qf{flex:1;min-width:220px;max-width:520px;height:44px;display:flex;align-items:center;gap:10px;padding:0 12px;border-radius:8px;background:var(--surface-sunken);border:1px solid var(--border-strong);color:var(--fg);font-size:16px}
.dkm .qf{height:38px;font-size:14px}
.qf.on{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in oklab,var(--accent) 16%,transparent)}
.qf .ic{color:var(--fg-faint);flex:none;display:flex}
.qf .ph0{color:#7A715F;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qf .tx{flex:1;min-width:0;white-space:nowrap;overflow:hidden}
.qf .tx i{display:inline-block;width:1.5px;height:17px;background:var(--accent);vertical-align:-3px;margin-left:1px}
.qf .cl{width:24px;height:24px;border-radius:50%;background:var(--border);color:var(--fg-faint);font-size:12px;display:flex;align-items:center;justify-content:center;flex:none}
.tog{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--fg-muted);white-space:nowrap}
.tog .tr{width:30px;height:17px;border-radius:999px;background:var(--accent);position:relative;flex:none}
.tog .tr i{position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;background:var(--bg);transform:translateX(13px)}
.qst{font:10.5px 'IBM Plex Mono';color:var(--fg-locked);margin-left:auto;white-space:nowrap}
.qp{order:-1;margin:-10px -16px 10px;padding:12px 16px;background:var(--bg);border-top:1px solid var(--border-strong);box-shadow:0 -16px 40px rgba(0,0,0,.5)}
.dkm .qp{margin:-11px -30px 11px;padding:12px 30px}
.qp ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.qp .hint{font:10px 'IBM Plex Mono';color:var(--fg-locked);margin-top:8px;display:flex;align-items:center;gap:12px}
.qr{display:flex;flex-direction:column;border-radius:9px;min-height:56px;padding:8px 10px;background:var(--surface);border:1px solid var(--border)}
.dkm .qr{min-height:52px;padding:8px 12px}
.qr.act{border-color:var(--accent)}
.qr .ln{display:flex;align-items:center;gap:10px}
.dkm .qr .ln{gap:12px}
.qr .th{flex:none;width:32px;height:45px;border-radius:5px;overflow:hidden;background:var(--surface-raised)}
.dkm .qr .th{width:30px;height:42px}
.qr .th img{width:100%;height:100%;object-fit:cover;display:block}
.qr .nc{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.dkm .qr .nc{flex:none;width:210px}
.qr .nm{font-size:14px;font-weight:600;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qr .nm em{font-style:normal;color:var(--accent-text)}
.qr .mt{font:10px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dkm .qr .mt{display:none}
.qr .ty{display:none}
.dkm .qr .ty{display:block;flex:1;min-width:0;font:11px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qr .pp{display:none}
.dkm .qr .pp{display:flex;flex:none;width:34px;gap:3px}
.qr .ow{display:none}
.dkm .qr .ow{display:flex;flex:none;min-width:80px;justify-content:flex-end;font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.qr .ow.no{color:var(--warning)}
.qr .mt .no{color:var(--warning)}
.qr .ad{flex:none;width:56px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:7px;border:1px solid var(--border-strong);color:var(--accent-text);font:600 13px 'IBM Plex Sans'}
.dkm .qr .ad{height:36px;font-size:12.5px}
.qr .ad.k{border:0;font:400 10px 'IBM Plex Mono';justify-content:flex-end}
.dkm .qr .ad.k{font-size:11px}
.pip{width:14px;height:14px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:600 8.5px 'IBM Plex Mono';color:#14110E;box-shadow:inset 0 0 0 1px rgba(0,0,0,.35)}
/* keyboard (drawn as a quiet plate) */
.kb{flex:none;height:276px;background:#24201B;border-top:1px solid var(--border-strong);padding:10px 4px 30px;display:flex;flex-direction:column;gap:11px}
.kb .kr{display:flex;gap:5px;justify-content:center}
.kb .kr i{width:31px;height:42px;border-radius:6px;background:#3A342D;display:block}
.kb .kr i.w{width:44px;background:#2E2924}
.kb .kr i.sp{width:186px}
/* the shared toast, deck slot (edit-toast.tsx) */
.tst{position:absolute;z-index:14;display:flex;min-height:52px;align-items:flex-start;gap:10px;border-radius:10px;border:1px solid var(--border-strong);background:var(--elevated);padding:0 6px 0 14px;box-shadow:0 12px 30px rgba(0,0,0,.45)}
.tst .tt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;padding:10px 0}
.tst .t1{font-size:13.5px;line-height:1.35;color:var(--fg)}
.tst .t3{font-size:12.5px;line-height:1.45;color:var(--fg-body)}
.tst .ta{flex:none;align-self:center;min-height:44px;display:flex;align-items:center;padding:0 12px;font:600 13.5px 'IBM Plex Sans';color:var(--accent-text);text-decoration:underline;text-underline-offset:2px}
.mark-new{outline:1.5px dashed rgba(207,135,69,.8);outline-offset:-2px;border-radius:8px}
.spec{display:grid;gap:28px;align-items:start}
.spec .k{font-size:13px;line-height:1.55;color:var(--fg-muted)}
.spec .k b{display:block;color:var(--fg);font:700 15px Cinzel,serif;margin-bottom:4px}
.notes{display:grid;gap:16px;max-width:2600px}
.note h4{margin:0 0 4px;font:600 13px 'IBM Plex Sans';color:var(--fg)}
.colh{font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.spc{flex:none;background:var(--bg);border:1px solid var(--border-strong);border-radius:16px;overflow:hidden}
"""

SEARCH = '<svg width="{s}" height="{s}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="8.6" cy="8.6" r="5.8"/><path d="M14 14 18 18"/></svg>'

COL = {"w": "var(--w)", "u": "var(--u)", "b": "var(--b)", "r": "var(--r)", "g": "var(--g)"}


def pips(ps):
    o = []
    for p in ps:
        if p in COL:
            o.append(f'<span class="pip" style="background:{COL[p]}"></span>')
        else:
            o.append(f'<span class="pip" style="background:#C9C1B0">{p}</span>')
    return "".join(o)


# (name, key, typeline, owned qty or 0, pips)
CARDS = {
    "swan": ("Swan Song", "swan-song", "Instant", 1, ["u"]),
    "swords": ("Swords to Plowshares", "swords", "Instant", 2, ["w"]),
    "aang": ("Aang, Swift Savior", "aang-swift-savior", "Legendary Creature — Human Avatar Ally", 0, ["1", "w", "u"]),
    "giada": ("Giada, Font of Hope", "giada", "Legendary Creature — Angel", 1, ["1", "w"]),
    "counter": ("Counterspell", "counterspell", "Instant", 1, ["u", "u"]),
    "tutor": ("Mystical Tutor", "mystical-tutor", "Instant", 1, ["u"]),
}


def hi(name, q):
    i = name.lower().find(q.lower())
    if i < 0 or not q:
        return name
    return f'{name[:i]}<em>{name[i:i+len(q)]}</em>{name[i+len(q):]}'


def qrow(key, q="sw", active=False, trail=None, name_html=None, extra_cls="", desk=False):
    name, art, typ, own, ps = CARDS[key]
    ow = f'×{own} owned' if own else '<span class="no">not owned</span>'
    owd = f'<span class="ow">×{own} owned</span>' if own else '<span class="ow no">not owned</span>'
    if trail is None:
        trail = ('<span class="ad k">' + ("↵ add" if desk else "↵") + '</span>') if active else '<span class="ad">Add</span>'
    nm = name_html or f'<span class="nm">{hi(name, q)}</span>'
    return (f'<li class="qr{" act" if active else ""} {extra_cls}"><div class="ln"><span class="th"><img alt="" src="{img("c-" + art)}"></span>'
            f'<span class="nc">{nm}<span class="mt">{typ} · {ow}</span></span>'
            f'<span class="ty">{typ}</span><span class="pp">{pips(ps)}</span>{owd}{trail}</div></li>')


def field(text=None, placeholder="Add a card by name · 5-color only", focus=False, desk=False):
    s = 16 if desk else 18
    inner = (f'<span class="tx">{text}<i></i></span><span class="cl">✕</span>' if text is not None
             else f'<span class="ph0">{placeholder}</span>')
    return f'<label class="qf{" on" if focus else ""}"><span class="ic">{SEARCH.format(s=s)}</span>{inner}</label>'


def toggle():
    return '<span class="tog"><span class="tr"><i></i></span>Owned only</span>'


def dock(text=None, focus=False, status="", pop="", desk=False, cls=""):
    st = f'<span class="qst">{status}</span>' if status else ""
    return (f'<div class="qd {cls}">{pop}<div class="br">{field(text, focus=focus, desk=desk)}{toggle()}{st}</div></div>')


def popover(rows, hint="↑↓ to move · ↵ to add · Esc to dismiss", extra=""):
    return f'<div class="qp"><ul role="listbox">{"".join(rows)}</ul><p class="hint">{hint}{extra}</p></div>'


def keyboard():
    r1 = "<i></i>" * 10
    r2 = "<i></i>" * 9
    r3 = '<i class="w"></i>' + "<i></i>" * 7 + '<i class="w"></i>'
    r4 = '<i class="w"></i><i class="w"></i><i class="sp"></i><i class="w"></i><i class="w"></i>'
    return f'<div class="kb"><div class="kr">{r1}</div><div class="kr">{r2}</div><div class="kr">{r3}</div><div class="kr">{r4}</div></div>'


def toast(title, action="", body="", style=""):
    a = f'<span class="ta">{action}</span>' if action else ""
    b = f'<span class="t3">{body}</span>' if body else ""
    return f'<div class="tst" role="alert" style="{style}"><span class="tt"><span class="t1">{title}</span>{b}</span>{a}</div>'


def deck_phone_top(d):
    return P.phone_header(d)


def phone_page(page, over="", keyboard_up=False, tabs=True, active="Decks", dock_html=""):
    """A 390x844 phone: app header, a clipped page, the dock pinned above the tab bar (or the keyboard)."""
    bottom = keyboard() if keyboard_up else (tb.tabbar(active) if tabs else "")
    return (f'<div class="ph fix">{P.app_header()}<div class="pbx"><div class="scr">{page}</div>{dock_html}{over}</div>{bottom}</div>')


def desk_page(page, over="", dock_html="", h=900):
    sl = "".join(f'<span class="sl{" on" if i == 4 else ""}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="{p}"/></svg></span>'
                 for i, p in enumerate(P.RAIL_ICONS))
    return (f'<div class="dk" style="height:{h}px"><div class="rail"><div class="lg"><span class="dia"><i></i><i></i><i></i></span>99</div>{sl}</div>'
            f'<div class="main dkm" style="position:relative;overflow:hidden"><div style="flex:1 1 auto;min-height:0;overflow:hidden">{page}</div>{dock_html}</div>{over}</div>')
