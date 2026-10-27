"""Item 5 (account 2, 2026-10-27): a precon's Overview on its page, carried into a deck started from it, and stale on
the first edit. Drawn with the strategy-focus kit (deck page head, Analysis tab, Overview, verdict box) over
open-precon-view.tsx (the precon page) and analysis-banner.tsx (the staleness banner). Fixture: Turtle Power!
(Heroes in a Half Shell), the precon in the TMNT partner fix; its card cut from the app's precon grid."""
import kit
import parts as P
from kit import doc, board_head, frame, img

kit.LOCAL.update({"b2": "art/bracket-2-core-ink.svg", "aheroes": "art/art-heroes.jpg"})

kit.CSS += r"""
/* ---- the precon page (open-precon-view.tsx), redrawn ---- */
.pp{display:flex;flex-direction:column}
.pp .phd{display:flex;flex-direction:column;gap:12px;border-bottom:1px solid var(--border);padding:12px 16px 14px}
.dkm .pp .phd{padding:16px 22px 18px}
.pp .bk{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.pp .tp{display:flex;align-items:flex-start;gap:12px}
.pp .th{width:64px;height:89px;border-radius:5px;overflow:hidden;flex:none;box-shadow:0 4px 12px rgba(0,0,0,.5)}
.dkm .pp .th{width:84px;height:117px}
.pp .th img{width:100%;height:100%;object-fit:cover;display:block}
.pp .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.pp .ey{font:9.5px 'IBM Plex Mono';letter-spacing:.08em;text-transform:uppercase;color:var(--fg-faint)}
.pp h1{margin:0;font:400 22px/1.15 'Cinzel',serif;color:var(--fg)}
.dkm .pp h1{font-size:26px}
.pp .cm{font-size:13.5px;color:var(--fg-body)}
.pp .mt{display:flex;align-items:center;gap:6px;font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.pp .mt .pips i{width:10px;height:10px}
.pp .st{flex:none;height:40px;display:flex;align-items:center;padding:0 16px;border-radius:8px;background:var(--accent);color:var(--bg);font:600 13.5px 'IBM Plex Sans'}
.pp .own{display:flex;flex-direction:column;gap:8px;border-radius:10px;border:1px solid var(--border);background:var(--surface-sunken);padding:11px 13px}
.dkm .pp .own{padding:12px 16px}
.pp .own p{font-size:14px;color:var(--fg-body);display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
.pp .own p b{font:600 15px 'IBM Plex Mono';color:var(--fg)}
.pp .own .br{height:3px;border-radius:2px;background:var(--border-strong)}
.pp .own .br i{display:block;height:100%;width:41%;border-radius:2px;background:var(--fg-muted)}
.pp .ln{display:flex;align-items:center;justify-content:space-between;gap:12px;font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.pp .vt{display:flex;border:1px solid var(--border-strong);border-radius:9px;padding:3px;gap:3px}
.pp .vt span{height:30px;padding:0 11px;display:flex;align-items:center;border-radius:6px;font:500 12.5px 'IBM Plex Sans';color:var(--fg-muted)}
.pp .vt span.on{background:var(--elevated);color:var(--fg)}
.pp .grp{padding:12px 16px 0}
.dkm .pp .grp{padding:14px 26px 0}
.pp .grp h4{margin:0 0 8px;display:flex;gap:8px;align-items:baseline;font:600 14.5px 'IBM Plex Sans';color:var(--fg)}
.pp .grp h4 em{font:normal 11px 'IBM Plex Mono';color:var(--fg-muted)}
.pp .rr{display:flex;align-items:center;gap:8px;height:34px;padding:0 10px;border-radius:8px;background:var(--surface-rail);font-size:14px}
.pp .rr .ow{width:8px;height:8px;border-radius:50%;background:var(--success);flex:none}
.pp .rr .nm{flex:1}
.pp .rr .pips i{width:11px;height:11px}
.dock{position:absolute;left:0;right:0;bottom:62px;z-index:5;padding:10px 16px;border-top:1px solid var(--border);background:var(--bg);display:flex;flex-direction:column;gap:8px}
.dock small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.dock span{height:48px;border-radius:10px;background:var(--accent);color:var(--bg);display:flex;align-items:center;justify-content:center;font:600 15px 'IBM Plex Sans'}
/* ---- NEW: the precon's Overview block ---- */
.pov{display:flex;flex-direction:column;gap:6px}
.pov .lh{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.pov .lh small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.pov .ovp{margin-top:2px;font-size:14px;line-height:1.7}
.dkm .pov .ovp{max-width:760px}
.pov .lk,.ovx .lk{font:500 13px 'IBM Plex Sans';color:var(--accent-text);display:inline-flex;align-items:center;min-height:32px}
.ph .pov .lk{min-height:44px}
/* ---- the deck's Analysis, carried ---- */
.va2{font:10px 'IBM Plex Mono';color:var(--fg-faint);margin-top:2px}
.va2.new{outline-offset:2px}
.vbx .vn.core{color:var(--bracket-2)}
.ovx .lh{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.ovx .lh small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.abn{display:flex;flex-direction:column;gap:12px;border-radius:11px;border:1px solid var(--border-strong);background:var(--surface-rail);padding:14px 15px}
.dkm .abn{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:4px 18px;padding:14px 16px 14px 20px}
.abn p{font-size:13px;line-height:1.5;color:var(--fg-body)}
.abn .rb{min-height:44px;border-radius:8px;padding:0 18px;background:var(--fg);color:var(--bg);font:600 14px 'IBM Plex Sans';display:flex;align-items:center;justify-content:center;white-space:nowrap}
.dkm .abn .rb{min-height:36px;font-size:13.5px}
.abn small{font:9.5px 'IBM Plex Mono';color:var(--fg-faint);text-align:center}
.dkm .abn small{text-align:left;font-size:11px}
.ovw{display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--border);padding-top:10px;margin-top:10px}
.ovw p{font-size:13px;color:var(--fg-muted)}
.ovw span{align-self:flex-start;height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);display:flex;align-items:center;font:500 13px 'IBM Plex Sans';color:var(--fg)}
/* the shipped Overview modal (synopsis-body.tsx in ModalChrome) */
.osh{position:absolute;z-index:31;left:0;right:0;bottom:0;top:120px;background:var(--surface-raised);border-top:1px solid var(--border-strong);border-radius:14px 14px 0 0;box-shadow:0 -14px 40px rgba(0,0,0,.6);display:flex;flex-direction:column;overflow:hidden}
.osh .mh{display:flex;align-items:center;min-height:43px;padding:0 4px 0 16px;border-bottom:1px solid var(--border)}
.osh .mh b{flex:1;font:600 15px 'IBM Plex Sans'}
.osh .mh .x{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--fg-muted)}
.osh .bd{padding:14px 16px;display:flex;flex-direction:column;gap:12px}
.osh .as{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.osh h5{margin:4px 0 0;font:500 10.5px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.osh p{font-size:14px;line-height:1.7;color:var(--fg-body)}
.osh h6{margin:0;font:600 13px 'IBM Plex Sans';color:var(--fg)}
.scrim2{position:absolute;inset:0;background:rgba(20,17,14,.72);z-index:30}
"""

PNAME = "Turtle Power!"
CMDR = "Heroes in a Half Shell"
META = "WUBRG · TMC · Teenage Mutant Ninja Turtles Commander"
OV = (f"<b>{CMDR}</b> leads a five-color team of Turtles from the command zone. The four brothers sit in the 99, and most of the "
      "deck either finds them, keeps them alive or rewards attacking with several creatures at once. It wins by going wide and "
      "swinging together, and it is soft to a board wipe at the wrong moment.")
WHEN = "27 Oct"
FROM = "Analysis from the precon list"


def pov(desk=False):
    """NEW. The precon's Overview: the same paragraph the deck's Analysis shows, and the shipped modal behind it."""
    return (f'<section class="pov new"><div class="lh"><span class="lbl">Overview</span><small>written for this precon’s list</small></div>'
            f'<p class="ovp">{OV}</p><span class="lk">View full overview →</span></section>')


def precon_page(desk=False):
    st = '' if not desk else '<span class="st">Start with this precon</span>'
    head = (f'<div class="phd"><span class="bk">‹ Commander precons</span><div class="tp"><span class="th"><img src="{P.card("heroes")}" alt=""></span>'
            f'<div class="tx"><span class="ey">Precon decklist · read-only</span><h1>{PNAME}</h1><span class="cm">{CMDR}</span>'
            f'<span class="mt">{P.PIPS}{META}</span></div>{st}</div>'
            '<div class="own"><p>You own <b>41 of 100</b> of its cards</p><div class="br"><i></i></div></div>'
            + pov(desk) +
            f'<div class="ln"><span>{"By type, A–Z within each group · press a card for its details, hover for its art · each row shows the precon’s printing" if desk else "By type · press a card for its details"}</span>'
            '<span class="vt"><span class="on">List</span><span>Cards</span></span></div></div>')
    grp = (f'<div class="grp"><h4>Commander<em>you own it</em></h4><div class="rr"><span class="ow"></span><span class="nm">{CMDR}</span>{P.PIPS}</div></div>')
    return f'<div class="pp">{head}{grp}</div>'


def ph_precon(over=""):
    dock = ('<div class="dock"><small>Turtle Power! · 100 cards · you own 41 of 100</small><span>Start with this precon</span></div>')
    return P.phone(f'<div style="flex:1;min-height:0;overflow:hidden">{precon_page()}</div>{dock}{over}', head=False, cut="/decks/precons/turtle-power", tab="")


def dk_precon():
    return P.desk(precon_page(True), head=False, cut="/decks/precons/turtle-power")


def modal():
    return ('<div class="scrim2"></div><div class="osh"><div class="mh"><b>Overview</b><span class="x">✕</span></div><div class="bd">'
            f'<span class="as">{PNAME} · written for the precon list</span><h5>Overview</h5><p>{OV}</p>'
            '<h5>Primer</h5><h6>Core strategy</h6><p>Get two or three Turtles down early, then attack together every turn you can. '
            'Hold protection for the turn the team is out.</p><h6>Mulligan</h6></div></div>')


# ---------------------------------------------------------------- the new deck
def deck_head(desk=False):
    h = P.dk_head() if desk else P.ph_head().replace(P.ph_top(), "", 1)
    h = (h.replace("HD - Avatar Aang", PNAME)
          .replace("Avatar Aang // Aang, Master of Elements · 5-color", f"{CMDR} · 5-color")
          .replace(P.COMPLETE, '<span class="pill" style="color:var(--fg-body);border:1px dashed color-mix(in oklab,var(--fg-body) 45%,transparent)">Draft</span>')
          .replace(P.bchip(), '<span class="bc" style="color:var(--bracket-2);background:color-mix(in oklab,var(--bracket-2) 12%,var(--bg));'
                   f'box-shadow:inset 0 0 0 1px color-mix(in oklab,var(--bracket-2) 55%,transparent)"><img src="{img("b2")}" alt="">Core</span>')
          .replace(img("hero"), img("aheroes"))
          .replace("v2 · committed 16 Sep 2026", "not committed yet")
          .replace("<em>1</em>", "").replace("<em>2</em>", ""))
    return h


def ovx(stale=False, older=False, desk=False):
    aside = "" if older else f'<small>{"from the precon list" if not stale else "from the precon list, before your changes"}</small>'
    w = ('<div class="ovw"><p>This overview was written before your latest changes.</p><span>Write a new overview</span></div>' if older else "")
    return (f'<div class="ovx"><div class="lh"><span class="lbl">Overview</span>{aside}</div><p class="ovp">{OV}</p>'
            f'<div style="margin-top:8px"><span class="lk">View full overview →</span></div>{w}</div>')


def verdict(stale=False, older=False):
    line = (f"analyzed 28 Oct" if older else f"{FROM} · {WHEN}" + (", before your changes" if stale else ""))
    cls = "va2" if older else "va2 new"
    return (f'<div class="vbx"><div class="vh"><img src="{img("b2")}" alt=""><div><div class="vn core">CORE</div>'
            f'<div class="{cls}">{line}</div></div></div>'
            '<p>No game changers, no mass land denial, no extra turns and no two-card infinites. Core fits.</p></div>')


BANNER = ('<div class="abn"><p>Your deck has changes since it was analyzed, so this bracket might not be accurate.</p>'
          '<span class="rb">Re-analyze</span><small>1 credit · 11 left</small></div>')


def tab(desk=False, stale=False, older=False):
    bn = BANNER if stale else ""
    if desk:
        body = (f'<div class="at">{bn}<div class="grid"><div style="grid-column:1;grid-row:1">{ovx(stale, older, True)}</div>'
                f'<div style="grid-column:2;grid-row:1/3">{verdict(stale, older)}</div></div></div>')
        return P.desk(deck_head(True) + body, head=False)
    return P.phone(deck_head() + f'<div class="at">{bn}{ovx(stale, older)}{verdict(stale, older)}</div>', head=False)


def sec(title, sp, body):
    return f'<div class="sec"><h3>{title}</h3><p class="sp">{sp}</p>{body}</div>'


def frames(*fs):
    return '<div class="frames">' + "".join(fs) + "</div>"


def note(t, b, w=None):
    st = f' style="width:{w}px"' if w else ""
    return f'<div class="note"{st}><b>{t}</b>{b}</div>'


def board():
    body = (board_head("Item 5 · a precon’s Overview, carried into the deck", "Read how a precon plays before you start it",
                       "Every precon gets a pre-written Overview: the same read the deck page’s Analysis shows. <b>On the precon page it sits under "
                       "“You own”, above the list</b>, as the Analysis tab draws it: the label, the paragraph and <i>View full overview →</i>, which "
                       "opens the shipped Overview modal (Overview, Primer, Key cards, Weaknesses). <b>Start with this precon</b>, with or without "
                       "<i>I own this precon</i>, carries the Overview and the precon’s bracket reading into the new deck, so its Analysis starts done "
                       "and says where it came from. <b>The first edit makes it stale exactly as today.</b> Fixture: Turtle Power!; the Overview text "
                       "is a stand-in. Copy is placeholder for /copy-review.", tag="R1")
            + sec("1 · On the precon page",
                  "One new block, dashed. No credit, no press to write it, no state but present: a precon without an Overview yet simply has no block "
                  "(no placeholder), as the Analysis tab does with none.",
                  frames(frame("<b>390</b> · /decks/precons/[file]", ph_precon()),
                         frame("<b>390</b> · View full overview", ph_precon(modal())),
                         frame("<b>1300</b>", dk_precon())))
            + sec("2 · Started from the precon: Analysis already done",
                  "The new deck opens with its bracket chip and its Analysis filled. The verdict’s date line reads <b>Analysis from the precon "
                  "list · 27 Oct</b> (the date the precon’s read was written), and the Overview’s label carries <i>from the precon list</i>. "
                  "Nothing to press, nothing spent.",
                  frames(frame("<b>390</b> · Analysis tab", tab()),
                         frame("<b>1300</b> · Analysis tab", tab(True))))
            + sec("3 · First edit: stale, as any deck’s",
                  "Any change to the list moves it off the precon’s list. The shipped staleness banner leads the tab with Re-analyze; the verdict "
                  "and Overview stay whole, their lines gaining <i>before your changes</i>. No overview write is offered until the reading is fresh, "
                  "as today. After Re-analyze the reading is the deck’s own (<i>analyzed 28 Oct</i>, the precon wording gone) and the Overview "
                  "shows the shipped <i>written before your latest changes</i> line with Write a new overview.",
                  frames(frame("<b>390</b> · after the first edit", tab(stale=True)),
                         frame("<b>1300</b> · after the first edit", tab(True, stale=True)),
                         frame("<b>390</b> · after Re-analyze", tab(older=True)),
                         '<div style="display:flex;flex-direction:column;gap:14px;width:420px">'
                         + note("Carried, and when", "<ul><li><b>Start with this precon</b> and <b>I own this precon</b> (add as bought) both carry it: "
                                "the deck’s first reading and Overview are copies of the precon’s, stamped with the precon list they describe.</li>"
                                "<li>The Collector’s Edition is the same list, so it carries the same read.</li>"
                                "<li>Import a deck that matches a precon’s list exactly carries nothing: only a start from the precon does.</li></ul>")
                         + note("For engineering", "<ul><li>One Overview and one reading per precon list, written ahead (a batch job, like the prose), "
                                "re-written when the list or the method changes.</li><li>The deck’s copy is judged fresh by the same list key as any reading, "
                                "so the first edit makes it stale with no new rule.</li><li>Re-analyze costs what it costs today; the copy was free.</li>"
                                "<li>Copy: <i>written for this precon’s list</i>, <i>Analysis from the precon list · date</i>, <i>from the precon list</i>.</li></ul>")
                         + note("Unchanged", "<ul><li>The Overview modal, the banner, Write a new overview.</li><li>Precon tiles and the list page.</li></ul>")
                         + "</div>")))
    return doc("Precon Overview", body, 3000)


BOARDS = [("Precon-Overview", board, "Item 5 · a precon’s Overview, carried into the deck")]
