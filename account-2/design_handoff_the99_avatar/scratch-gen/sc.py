"""Signature card and spare asks R1 (account 2, 2026-10-27): the pieces.

Drawn over the shipped pages in Low Sun (amonkhet) tokens, on the spare-requests kit (kit.py, parts.py, sr.py).
New pieces: the face picker redrawn from commander-picker.tsx inside SocialModal (social-modal.tsx: sheet at phone,
520 dialog at desktop, a second screen with ‹), its printing screen (the printing picker's tile and its words, from
design/design_handoff_the99_printing_picker/), the /friends head (friends-head.tsx), the first-run checklist row
(first-run.tsx, first-run-friends.tsx) and a friend's Spares tab (friend-spares-tab.tsx) opening the spares-only
modal (spare-markers.tsx SparesSheet). Every string is shipped copy or a placeholder for /copy-review.
"""
import kit
import parts as P
import sr as S
from kit import img, ico

kit.CSS += r"""
/* ---------------- SocialModal (social-modal.tsx), phone sheet + desktop dialog ---------------- */
.smx{position:absolute;inset:0;background:color-mix(in oklab,var(--bg) 72%,transparent);z-index:30}
.smo{position:absolute;z-index:31;display:flex;flex-direction:column;overflow:hidden;background:var(--surface-raised)}
.ph .smo{left:0;right:0;bottom:0;border-radius:20px 20px 0 0;border-top:1px solid var(--border-strong);box-shadow:0 -20px 50px rgba(0,0,0,.5)}
.dk .smo{left:50%;transform:translateX(-50%);width:520px;border-radius:14px;border:1px solid var(--border-strong);box-shadow:0 30px 70px rgba(0,0,0,.6)}
.smo .grb{display:flex;justify-content:center;padding-top:9px}
.smo .grb i{width:40px;height:4px;border-radius:999px;background:var(--border-strong);margin-bottom:4px}
.smo .hd{display:flex;align-items:center;gap:4px;padding:0 18px}
.dk .smo .hd{padding:12px 20px 0}
.smo .hd .bk{width:44px;height:44px;margin-left:-12px;display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--fg);padding-bottom:3px}
.smo .hd h2{flex:1;min-width:0;margin:0;font:700 18px 'Cinzel',serif;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dk .smo .hd h2{font-size:19px}
.smo .hd .x{width:44px;height:44px;margin-right:-10px;display:flex;align-items:center;justify-content:center;font-size:15px;color:var(--fg-muted)}
.smo .sb{margin:0 18px 14px;font-size:13px;line-height:1.5;color:var(--fg-muted)}
.dk .smo .sb{margin:0 20px 14px}
.smo .bd{flex:1;min-height:0;display:flex;flex-direction:column;padding:0 18px 24px;overflow:hidden}
.dk .smo .bd{padding:0 20px 18px}
.sfd{height:46px;flex:none;display:flex;align-items:center;gap:10px;padding:0 6px 0 13px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface-sunken);font-size:16px;color:var(--fg)}
.dk .sfd{height:44px;font-size:14px}
.sfd.on{border-color:var(--accent);box-shadow:0 0 0 3px rgba(207,135,69,.16)}
.sfd .ph2{color:var(--fg-faint)}
.sfd .q{flex:1}
.sfd .q i{display:inline-block;width:1.5px;height:18px;background:var(--accent);vertical-align:-3px;margin-left:1px}
.sfd .cx{width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:13px}
.sfd svg{color:var(--fg-faint);flex:none}
.srl{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column}
.rr2{display:flex;align-items:center;gap:12px;height:56px;padding:0 4px;border-bottom:1px solid var(--elevated);font-size:14.5px;color:var(--fg)}
.dk .rr2{height:52px;font-size:14px}
.rr2.hl{border-radius:8px;background:var(--elevated);border-bottom-color:transparent}
.rr2 .ar{width:56px;height:40px;border-radius:6px;overflow:hidden;flex:none}
.rr2 .ar img{width:100%;height:100%;object-fit:cover;display:block}
.rr2 .nm{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.rr2 .nm b{font:400 14.5px 'IBM Plex Sans';white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rr2 .nm small{font:11px 'IBM Plex Mono';letter-spacing:0;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rr2 .pc{flex:none;display:flex;align-items:center;gap:6px;font:11px 'IBM Plex Mono';color:var(--fg-faint);padding-left:8px}
.rr2 .pc i{font-style:normal;font:15px 'IBM Plex Sans';color:var(--fg-faint)}
.rr2 .spin,.pt2 .spin{width:18px;height:18px;border-radius:50%;border:2px solid var(--border-strong);border-top-color:var(--accent);flex:none}
.rr2.busy{opacity:1}
.srl.dim .rr2:not(.hl){opacity:.45}
.fdh{margin:16px 0 0;font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.fdg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:10px}
.dk .fdg{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.fdg>span{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--fg-body)}
.dk .fdg>span{font-size:12px}
.fdg .fa2{height:95px;border-radius:8px;overflow:hidden;border:1px solid var(--border-strong)}
.dk .fdg .fa2{height:78px}
.fdg .fa2 img{width:100%;height:100%;object-fit:cover;display:block}
.fdg .cur .fa2{outline:2px solid var(--accent);outline-offset:2px}
.fdg .cur{color:var(--fg)}
.smf{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;padding-top:14px;font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.smf u{font:500 13.5px 'IBM Plex Sans';color:var(--accent-text);text-decoration:none;flex:none}
.nom{margin-top:16px;font-size:13.5px;color:var(--fg-muted)}
/* the printing screen */
.pvw{display:flex;align-items:center;gap:14px;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg)}
.pvw .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.pvw .tx b{font:600 14px 'IBM Plex Sans';color:var(--fg)}
.pvw .tx span{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.pvw .tx em{font-style:normal;font-size:12.5px;color:var(--fg-muted);font-family:'IBM Plex Sans'}
.pgr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 10px;margin-top:14px}
.dk .pgr{grid-template-columns:repeat(4,minmax(0,1fr));gap:14px 12px}
.pgr.dim .pt2:not(.pk){opacity:.45}
.pt2{display:flex;flex-direction:column;gap:6px;position:relative}
.pt2 .ci{position:relative;border-radius:9px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
.pt2 .ci img{width:100%;aspect-ratio:63/88;display:block;object-fit:cover}
.pt2.pk .ci{outline:2px solid var(--accent);outline-offset:3px}
.pt2.sn .ci{outline:1px dashed var(--fg-faint);outline-offset:3px}
.pt2.hv .ci{outline:1px dashed var(--border-dashed);outline-offset:3px}
.pt2 .bdg2{position:absolute;top:7px;right:7px;width:22px;height:22px;border-radius:5px;display:flex;align-items:center;justify-content:center;font:600 12px 'IBM Plex Sans';background:rgba(10,8,6,.72);color:var(--fg);border:1px dashed var(--fg-faint)}
.pt2.pk .bdg2{background:var(--accent);color:var(--bg);border:0}
.pt2 .sp2{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(10,8,6,.45)}
.pt2 .sp2 .spin{width:26px;height:26px;border-width:2.5px}
.pt2 .cp{display:flex;flex-direction:column;gap:1px;font-size:12px;line-height:1.3;color:var(--fg-body)}
.pt2 .cp small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.pt2 .cp .w{font:500 10.5px 'IBM Plex Mono';color:var(--accent-text);display:flex;align-items:center;gap:4px}
.pt2 .cp .w.s{color:var(--fg-muted)}
.pfade{height:46px;margin-top:-46px;position:relative;background:linear-gradient(to bottom,transparent,var(--surface-raised))}
.gone{display:flex;gap:10px;align-items:flex-start;padding:11px 13px;border-radius:10px;border:1px solid var(--border);background:var(--surface-sunken);font-size:13px;line-height:1.5;color:var(--fg-body);margin-top:12px}
.gone i{font-style:normal;color:var(--fg-faint);font:600 12px 'IBM Plex Mono';margin-top:1px}
/* /friends head (friends-head.tsx) */
.fhd .fbt{position:relative;flex:none}
.fhd .pen{position:absolute;right:-6px;bottom:-6px;width:24px;height:24px;border-radius:50%;background:var(--elevated);border:1px dashed var(--border-dashed);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--fg)}
.fhd .add{width:56px;height:56px;border-radius:13px;border:1.5px dashed var(--border-dashed);display:flex;align-items:center;justify-content:center;font:300 20px 'IBM Plex Sans';color:var(--fg-muted)}
.dk .fhd .add{width:64px;height:64px;border-radius:14px;font-size:22px}
.fhd .ring{outline:2px solid var(--accent);outline-offset:3px;border-radius:14px}
/* checklist row (first-run-friends.tsx box) */
.frw.dn{border-color:var(--border)}
.frw.dn .tx b{color:var(--fg-body)}
.frw .ok{color:var(--success);font:600 14px 'IBM Plex Sans';width:22px;text-align:center;flex:none}
.frw .skp{flex:none;min-height:44px;display:flex;align-items:center;padding:0 6px;font:500 13px 'IBM Plex Sans';color:var(--fg-muted)}
.frw .slf{width:22px;height:22px;flex:none;border-radius:6px;border:1.5px dashed var(--border-dashed);display:flex;align-items:center;justify-content:center}
.frw .slf i{width:9px;height:12px;border-radius:2px;border:1.4px solid var(--fg-muted)}
.frw .trl{display:flex;align-items:center;gap:10px;flex:none;font-size:12.5px;color:var(--fg-body)}
/* Home strip (the welcome strip's shape) */
.fsw{display:flex;align-items:center;gap:12px;min-height:52px;padding:7px 4px 7px 12px;border-radius:12px;border:1px solid var(--accent-shadow);background:var(--surface);font-size:13.5px;line-height:1.45;color:var(--fg-body)}
.fsw .sl3{flex:none;width:30px;height:30px;border-radius:8px;border:1.5px dashed var(--border-dashed);display:flex;align-items:center;justify-content:center;font:500 10px 'IBM Plex Mono';color:var(--fg-muted)}
.fsw .t{flex:1;min-width:0}
.fsw .t u{color:var(--fg);text-decoration-color:rgba(207,135,69,.55);text-underline-offset:3px;white-space:nowrap;font-weight:600}
.fsw .x{flex:none;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-faint);font-size:13px}
/* friend's Spares tab: tile states */
.tile .tcap2{display:flex;flex-direction:column;gap:3px;font:10.5px 'IBM Plex Mono';color:var(--fg-muted)}
.tile .tcap2 .wl{display:inline-flex;align-items:center;gap:4px;color:var(--accent-text)}
.tile .tcap2 .rq{display:inline-flex;align-items:center;gap:6px;color:var(--accent-text)}
.tile .tcap2 .rq i{width:7px;height:7px;border-radius:50%;background:var(--accent)}
.tile .tcap2 .ac2{color:var(--success)}
.tile .tcap2 .cl1{display:flex;align-items:center;gap:5px;white-space:nowrap}
.tile .ti.lit{outline:2px solid var(--accent);outline-offset:3px}
.tile .tap{position:absolute;width:30px;height:30px;border-radius:50%;background:rgba(240,230,210,.22);border:1.5px solid rgba(240,230,210,.75);left:50%;top:44%;transform:translate(-50%,-50%);z-index:2}
/* push banner */
.pn{position:absolute;z-index:40;left:10px;right:10px;top:12px;border-radius:18px;background:rgba(44,40,36,.94);box-shadow:0 12px 30px rgba(0,0,0,.5);padding:11px 13px;display:flex;gap:10px;align-items:flex-start}
.pn .ic{width:34px;height:34px;border-radius:8px;background:#1A1611;border:1px solid var(--border-strong);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none}
.pn .ic .nn{font:800 12px/11px 'Cinzel',serif;color:var(--fg)}
.pn .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;font-size:13px;color:#EDE6D8}
.pn .tx .r{display:flex;justify-content:space-between;font-size:11.5px;color:#A59C89}
.pn .tx b{font-weight:600}
.pn .tx span{color:#C0B8A6}
/* about diff */
.abd{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.abd .c{border:1px solid var(--border-strong);border-radius:12px;background:#15120F;padding:16px 18px;display:flex;flex-direction:column;gap:10px;font-size:14px;line-height:1.6;color:var(--fg-body)}
.abd .c .k{font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.abd del{color:var(--danger);text-decoration-thickness:1.5px}
.abd ins{color:var(--success);text-decoration:none;border-bottom:1.5px solid color-mix(in srgb,var(--success) 55%,transparent)}
"""

SEARCH_ICO = ico('<circle cx="8.6" cy="8.6" r="5.6"/><path d="M12.8 12.8 17 17"/>', 17, 1.6)

# ---------------------------------------------------------------- copy (placeholders for /copy-review)
TITLE = "Your signature card"
SUB = "Friends see its art beside your name. Any card, any printing, owned or not."
SEARCH = "Search cards"
ANY = "Any card in the catalog, owned or not."
SAVED = "Saved as soon as you pick one."
CLEAR = "Use initials instead"
CHOOSE = "Choose your signature card"


def modal(inner, desk=False, title=TITLE, sub=SUB, back=False, top=118, dtop=86, h=None):
    """SocialModal open. Phone: the tall sheet (86% of 844 = 726, so top 118). Desktop: 520 at 10dvh."""
    bk = '<span class="bk">‹</span>' if back else ""
    sb = f'<p class="sb">{sub}</p>' if sub else ""
    grb = "" if desk else '<div class="grb"><i></i></div>'
    pos = f"top:{dtop}px;height:{h or 640}px" if desk else f"top:{top}px"
    return (f'<div class="smx"></div><div class="smo" style="{pos}">{grb}<div class="hd">{bk}<h2>{title}</h2><span class="x">✕</span></div>'
            f'{sb}<div class="bd">{inner}</div></div>')


def field(q="", on=False, ph=SEARCH):
    if q:
        return f'<div class="sfd{" on" if on else ""}">{SEARCH_ICO}<span class="q">{q}<i></i></span><span class="cx">✕</span></div>'
    return f'<div class="sfd{" on" if on else ""}">{SEARCH_ICO}<span class="q ph2">{ph}</span></div>'


DECK_TILES = [("crop-sai.jpg", "Sai", False), ("crop-rootha.jpg", "Rootha", True), ("crop-ghalta.jpg", "Ghalta", False), ("crop-zimone.jpg", "Zimone", False)]


def deck_row(cur="Rootha"):
    t = "".join(f'<span class="{"cur" if n == cur else ""}"><span class="fa2"><img src="{img(a)}" alt=""></span>{n}</span>' for a, n, _ in DECK_TILES)
    return f'<h3 class="fdh">From your decks</h3><div class="fdg">{t}</div>'


def foot(note=SAVED, clear=True):
    return f'<div class="smf"><span>{note}</span>{"<u>" + CLEAR + "</u>" if clear else ""}</div>'


def rrow(art, name, tl, n=None, hl=False, busy=False):
    if busy:
        right = '<span class="pc">Saving<span class="spin"></span></span>'
    elif n and n > 1:
        right = f'<span class="pc">{n} printings<i>›</i></span>'
    else:
        right = ""
    return (f'<li class="rr2{" hl" if hl else ""}"><span class="ar"><img src="{img(art)}" alt=""></span>'
            f'<span class="nm"><b>{name}</b><small>{tl}</small></span>{right}</li>')


AANG = [("crop-aang-swift.jpg", "Aang, Swift Savior", "Legendary Creature — Human Avatar Ally", 2),
        ("crop-swords.jpg", "Swords to Plowshares", "Instant", 46),
        ("crop-swan-song.jpg", "Swan Song", "Enchantment", 8)]


def picker_empty(desk=False):
    return field("", True) + deck_row() + foot()


def picker_results(desk=False, q="sw", rows=AANG, hl=0):
    lis = "".join(rrow(*r, hl=(i == hl)) for i, r in enumerate(rows))
    return field(q, True) + f'<ul class="srl">{lis}</ul>' + foot(ANY)


def picker_nomatch(desk=False):
    return field("xqzv", True) + '<p class="nom">No card matches “xqzv”.</p>' + foot(ANY)


def picker_one(desk=False):
    lis = rrow("crop-polyraptor.jpg", "Polyraptor", "Creature — Dinosaur", 1, hl=True, busy=True)
    return field("polyr", True) + f'<ul class="srl dim">{lis}</ul>' + foot(ANY, clear=True)


SWORDS = [("Usual art", "STA", "u"), ("Strixhaven Mystical Archive", "STA · etched", ""), ("Eternal Masters", "EMA", ""),
          ("Masters Edition II", "ME2", ""), ("Battle Royale", "BRB", ""), ("Mirage", "MIR", ""), ("Secret Lair Drop", "SLD", ""),
          ("Mystery Booster", "MB1", "")]


def ptile(name, code, kind="", state=""):
    """state: pk (your pick) | sn (shown now) | hv (hover) | busy"""
    cls = "pt2" + ("" if state in ("", "busy") else f" {state}") + (" pk" if state == "busy" else "")
    bdg = ""
    if state in ("pk",):
        bdg = '<span class="bdg2">✓</span>'
    elif state == "sn":
        bdg = '<span class="bdg2">◇</span>'
    spin = '<span class="sp2"><span class="spin"></span></span>' if state == "busy" else ""
    word = ""
    if state == "pk":
        word = '<span class="w">◆ Your pick</span>'
    elif state == "sn":
        word = '<span class="w s">Shown now</span>'
    nm = name if kind != "u" else "Usual art"
    return (f'<div class="{cls}"><span class="ci"><img src="{img("c-mystical-tutor.jpg")}" alt="">{bdg}{spin}</span>'
            f'<span class="cp">{nm}<small>{code}</small>{word}</span></div>')


def printing_screen(desk=False, state="new", n=12):
    """state: new | hover | busy | gone"""
    rows = SWORDS[: (8 if desk else 6)]
    tiles = []
    for i, (nm, code, kind) in enumerate(rows):
        st = ""
        if state == "hover" and i == 2:
            st = "hv"
        if state == "busy" and i == 2:
            st = "busy"
        if state == "gone" and i == 0:
            st = "sn"
        tiles.append(ptile(nm, code, kind, st))
    face_src = "crop-tutor.jpg"
    if state == "hover":
        pv_line = "Eternal Masters · EMA"
        pv_em = "Friends see this, cropped to its art."
    elif state == "busy":
        pv_line = "Eternal Masters · EMA"
        pv_em = "Saving…"
    elif state == "gone":
        pv_line = "Usual art · STA"
        pv_em = "What friends see now."
    else:
        pv_line = "Usual art · STA"
        pv_em = "Friends see this, cropped to its art."
    pv = (f'<div class="pvw">{P.face(face_src, 64, 14)}<span class="tx"><b>Mystical Tutor</b><span>{pv_line}</span><em>{pv_em}</em></span></div>')
    gone = ('<div class="gone"><i>i</i><span>The printing you picked has left the catalog, so friends see the usual art. '
            'Pick another any time.</span></div>') if state == "gone" else ""
    srch = f'<div style="margin-top:12px">{field("", False, "Search sets, codes or numbers")}</div>'
    grid = f'<div class="pgr{" dim" if state == "busy" else ""}">{"".join(tiles)}</div><div class="pfade"></div>'
    return pv + gone + srch + grid


def ptitle(n=12):
    return "Mystical Tutor", f"{n} printings. Press one to make it your face."


# ---------------------------------------------------------------- /friends head
def fhead(desk=False, face=P.ME, ring=False, pen=True, none=False):
    sz, r = (64, 14) if desk else (56, 13)
    if none:
        fc = '<span class="add">+</span>'
        line = f'<p class="nl">Friends see you as <b>Sam</b> · <u>Change</u></p><p class="nl"><u>{CHOOSE}</u></p>'
    else:
        fc = P.face(face, sz, r) + ('<span class="pen">✎</span>' if pen else "")
        line = '<p class="nl">Friends see you as <b>Sam</b> · <u>Change</u></p>'
    rg = ' ring' if ring else ''
    return (f'<div class="fhd"><div class="who"><span class="fbt{rg}">{fc}</span><div><h1>Friends</h1>{line}</div></div>'
            '<div class="ri"><span class="ba">Add a friend</span><span class="il">3 invites left</span></div></div>')


def friends_page(desk=False, **kw):
    return f'<div class="fp">{fhead(desk, **kw)}{S.waiting(desk)}{S.friends_rows()}</div>'


# ---------------------------------------------------------------- first-run checklist row
def face_row(state="todo"):
    if state == "todo":
        return ('<div class="frw new"><span class="slf"><i></i></span><span class="tx"><b>Choose your signature card</b>'
                '<span>Any card, any printing. Friends see its art beside your name.</span></span>'
                '<span class="skp">Skip</span><span class="ch">›</span></div>')
    return (f'<div class="frw dn new"><span class="ok">✓</span><span class="tx"><b>Your signature card</b>'
            f'<span>Polyraptor. Change it any time on Friends.</span></span><span class="trl">{P.face("face-polyraptor.jpg", 30, 8)}<span class="ch">›</span></span></div>')


def first_run(desk=False, state="todo"):
    h = P.first_run(desk, news_row=True)
    fr = '<div class="frw"><span class="sl">+</span>'
    row = face_row(state) if state != "skipped" else ""
    return h.replace(fr, row + fr, 1)


def home_strip():
    return ('<div class="fsw new"><span class="sl3">SA</span><span class="t">Friends see your initials. '
            f'<u>{CHOOSE}</u></span><span class="x">✕</span></div>')


# ---------------------------------------------------------------- a friend's Spares tab
SP_CARDS = [("ghalta.jpg", "Ghalta, Primal Hunger", 1, True), ("jace.jpg", "Jace, Multiverse Architect", 2, True),
            ("dina.jpg", "Dina, Essence Brewer", 1, False), ("giada.jpg", "Giada, Font of Hope", 3, False),
            ("killian.jpg", "Killian, Decisive Mentor", 1, False), ("gisa.jpg", "Ghoulcaller Gisa", 2, False)]


def spares_tab(desk=False, states=None, lit=None, tap=None, n=None, skip=None):
    states = states or {}
    src = [c for i, c in enumerate(SP_CARDS) if i != skip]
    cards = src if desk else src[: (n or 4)]
    t = []
    for i, (k, nm, s, w) in enumerate(cards):
        st = states.get(i)
        line = f'{s} spare{"" if s == 1 else "s"}'
        if st == "asked":
            line += ' · <span class="rq new"><i></i>Requested</span>'
        elif st == "yes":
            line += ' · <span class="ac2 new">✓ Accepted</span>'
        cap = f'<span class="cl1">{line}</span>'
        if w:
            cap += f'<span class="wl">{P.BOOKMARK} on your wishlist</span>'
        tp = '<span class="tap"></span>' if tap == i else ""
        t.append(f'<div class="tile"><span class="ti{" lit" if lit == i else ""}" style="position:relative">{tp}<img src="{img(k)}" alt="{nm}"></span>'
                 f'<span class="tcap2">{cap}</span></div>')
    tabs = [("spares", "Spares"), ("wish", "Wishlist"), ("decks", "Decks")]
    head = (f'<div class="fpg"><span class="bk">‹ Friends</span><div class="who">{P.face("face-sai.jpg", 64 if desk else 56, 14 if desk else 13)}'
            '<div><h1>Colin</h1><p>Friend since Oct 2</p></div><span class="dots">···</span></div>'
            + P.place_strip("spares", tabs, {"spares": 6 if skip is None else 5, "wish": 12, "decks": 4}).replace('class="ps new"', 'class="ps"'))
    body = ('<p class="gl">Shared with Thursday pod. Cards on your wishlist first. Press one to ask for it.</p>'
            f'<div class="tiles">{"".join(t)}</div>')
    return head + body + "</div>"


def card_box(card, im, price, kicker="on your wishlist"):
    k = f'<span class="k">{kicker}</span>' if kicker else ""
    return (f'<div class="rep">{k}<div class="ln"><span class="th"><img src="{img(im)}" alt=""></span>'
            f'<span class="r7"></span><span class="cn">{card}</span>{S.buytag(price)}</div></div>')


def spares_modal(desk=False, state="ask", top=150, dtop=90):
    """The shipped spares-only modal, opened from Colin's page on Ghalta: Colin's row first."""
    rows = {"ask": [("Colin", 1, "ask", "", False), ("Max", 2, "ask", "", False)],
            "asked": [("Colin", 1, "asked", "", False), ("Max", 2, "held", "", False)]}[state]
    extra = "One request at a time. Ask instead moves it from Colin." if state == "asked" else ""
    body = card_box("Ghalta, Primal Hunger", "ghalta.jpg", "$2.10") + S.fsection(rows, extra, new=False)
    body = body.replace('<span class="ask">Ask</span>', '<span class="ask">Ask</span>')
    if desk:
        return (f'<div class="scrim"></div><div class="mdl" style="top:{dtop}px"><div class="mh"><b>Friends with a spare</b><span class="x">✕</span></div>'
                f'<div class="mb">{body}</div></div>')
    return (f'<div class="scrim"></div><div class="sht" style="top:auto;height:{844 - top}px"><div class="mh"><b>Friends with a spare</b><span class="x">✕</span></div>'
            f'<div class="mb">{body}</div></div>')


def push_banner(title="Colin has a spare Ghalta, Primal Hunger", line="It’s on your wishlist."):
    return (f'<div class="pn"><span class="ic"><span class="dia"><i></i><i></i><i></i></span><span class="nn">99</span></span>'
            f'<span class="tx"><span class="r"><span>The 99</span><span>now</span></span><b>{title}</b><span>{line}</span></span></div>')

kit.CSS += ".dk .hb .cl>*{width:100%;align-self:stretch}\n"
