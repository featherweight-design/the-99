"""Item 7 · the Add panel divergences and the consider tile (#182)."""
import kit
from kit import doc, board_head, frame
import pieces as P
import deck as D

for k in ["heartless-act", "searing-touch", "assimilation-aegis"]:
    kit.LOCAL["c-" + k] = f"art/c-{k}.jpg"

kit.CSS += r"""
.ctb{display:flex;align-items:center;gap:12px;padding:14px 16px 4px;flex-wrap:wrap}
.dkm .ctb{padding:16px 30px 4px}
.ctb .pv{font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.ctb .so{margin-left:auto;display:flex;align-items:center;gap:8px;height:36px;padding:0 10px 0 12px;border-radius:8px;border:1px solid var(--border-strong);background:var(--surface-sunken);font-size:13px;color:var(--fg)}
.ctb .so i{font-style:normal;color:var(--fg-faint);font-size:11px}
.shf{border-top:1px solid var(--border-strong);margin:14px 16px 0}
.dkm .shf{margin:16px 30px 0}
.shf .hd{display:flex;align-items:baseline;gap:8px;min-height:52px;padding-top:14px}
.dkm .shf .hd{min-height:44px;gap:10px;padding-top:12px}
.shf .hd .cv{color:var(--fg-muted);font-size:11px}
.shf .hd .lb{display:flex;flex-direction:column;gap:2px}
.dkm .shf .hd .lb{flex-direction:row;align-items:baseline;gap:10px}
.shf .hd .lb b{font:600 16px 'IBM Plex Sans';color:var(--fg)}
.dkm .shf .hd .lb b{font-size:17px}
.shf .hd .lb span{font:10.5px 'IBM Plex Mono';color:var(--fg-muted)}
.tg{list-style:none;margin:0 0 6px;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.dkm .tg{grid-template-columns:repeat(6,minmax(0,1fr));gap:14px}
.tl{display:flex;flex-direction:column;gap:8px;border-radius:10px;padding:9px 9px 10px;background:var(--surface);border:1px solid var(--border)}
.tl.na{opacity:.55}
.tl .ar{position:relative;display:block;aspect-ratio:63/88;border-radius:7px;overflow:hidden;background:var(--surface-sunken)}
.tl .ar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.tl .ar::after{content:'';position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(0,0,0,.3)}
.tl .ar.pl{background:linear-gradient(158deg,var(--border-strong) 0%,var(--surface-raised) 62%,var(--surface-sunken) 100%)}
.tl .ar .nf{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;font:9px/1.4 'IBM Plex Mono';color:var(--fg-locked)}
.tl .cp{min-height:56px;padding:8px 9px;display:flex;flex-direction:column;gap:3px;margin:0 -9px}
.dkm .tl .cp{min-height:50px;padding:6px 10px}
.tl .mtl{display:flex;align-items:center;gap:6px;height:17px;font:9px 'IBM Plex Mono';color:var(--fg-faint)}
.dkm .tl .mtl{height:18px;font-size:9.5px}
.tl .dot{width:8px;height:8px;border-radius:50%;background:var(--success);flex:none}
.tl .nm{height:20px;line-height:16px;font-size:12px;font-weight:600;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dkm .tl .nm{height:17px;line-height:17px;font-size:13px}
.tl .ty{font:10px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dkm .tl .ty{font-size:9.5px}
.tl .ev{display:flex;align-items:center;gap:6px}
.tl .ev em{font:normal 9px 'IBM Plex Mono';color:var(--fg-locked)}
.tl .ev .trk{flex:1;height:4px;border-radius:999px;background:var(--border);overflow:hidden}
.tl .ev .trk i{display:block;height:100%;background:var(--accent)}
.tl .ev b{font:400 10px 'IBM Plex Mono';color:var(--fg-body)}
.tl .lf{font:10px 'IBM Plex Mono';color:var(--fg-muted)}
.tl .add{margin-top:auto;height:44px;border-radius:10px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font:500 14px 'IBM Plex Sans';color:var(--fg)}
.dkm .tl .add{height:32px;border-radius:8px;font-size:12.5px}
.rtab{border-collapse:collapse;width:100%;font-size:13px;color:var(--fg-body)}
.rtab th{text-align:left;font:500 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);padding:10px 12px;border-bottom:1px solid var(--border-strong)}
.rtab td{padding:12px;border-bottom:1px solid var(--border);vertical-align:top;line-height:1.55}
.rtab td b{color:var(--fg)}
.rtab .vd{white-space:nowrap;font:600 12px 'IBM Plex Mono';color:var(--success)}
.rtab .vd.q{color:var(--warning)}
"""

D_ = dict(P.DECKS["aang"])
GRAD = "linear-gradient(130deg, #cbbf9c, #efe9d8 34%, #6a9bcb 55%, #406f3b 82%, #264823)"  # commanderGradient(WUBRG)

TILES = [
    ("Swords to Plowshares", "swords", "Instant", 64, "+12 pts vs. all decks"),
    ("Path to Exile", "path", "Instant", 41, "+6 pts vs. all decks"),
    ("Heartless Act", "heartless-act", "Instant", 38, None),
    ("Chaos Warp", None, "Instant", 29, None),
    ("Searing Touch", "searing-touch", "Instant", 22, None),
    ("Assimilation Aegis", "assimilation-aegis", "Artifact — Equipment", 18, None),
]


def tile(t, mode="plate"):
    name, art, typ, pct, lift = t
    if art:
        ar = f'<span class="ar"><img alt="" src="{D.img("c-" + art)}"></span>'
        cls = "tl"
    elif mode == "plate":
        ar = '<span class="ar pl"><span class="nf">no art on file</span></span>'
        cls = "tl na"
    else:
        ar = f'<span class="ar" style="background:{GRAD}"></span>'
        cls = "tl na mark-new"
    lf = f'<span class="lf">{lift}</span>' if lift else ""
    return (f'<li class="{cls}">{ar}<span class="cp"><span class="mtl"><span class="dot"></span></span><span class="nm">{name}</span></span>'
            f'<span class="ty">{typ}</span><span class="ev"><em>edhrec</em><span class="trk"><i style="width:{pct}%"></i></span><b>{pct}%</b></span>{lf}'
            f'<span class="add">Add</span></li>')


def consider(desk=False, mode="plate", n=6):
    tiles = TILES if desk else [TILES[3], TILES[0], TILES[1], TILES[2]]
    return ('<div class="ctb"><span class="pv">88 cards you already own</span><span class="so">Coverage gaps first <i>▾</i></span></div>'
            '<div class="shf"><div class="hd"><span class="cv">▾</span><span class="lb"><b>Removal</b><span>you have 6 of 8 · 9 to consider</span></span></div>'
            f'<ul class="tg">{"".join(tile(t, mode) for t in tiles)}</ul></div>')


def tabs_consider(desk=False):
    t = P.dtabs(built=94) if desk else P.tabs(built=94)
    t = t.replace('<span class="on">Your deck', '<span class="">Your deck').replace('<span class="">Consider', '<span class="on">Consider')
    return t


def ph(mode="plate"):
    page = tabs_consider() + consider(False, mode)  # scrolled: the header has passed
    return D.phone_page(page)


def dk(mode="plate"):
    page = P.desk_header(D_) + tabs_consider(True) + consider(True, mode)
    return D.desk_page(page, h=900)


ROWS = [
    ("1", "The sort label: desktop <i>Coverage gaps first ▾</i>, phone <i>Gaps first ▾</i>, no short key.",
     "Not a canvas-vs-README divergence on #182 as filed: it was filed as a <b>caret</b> question (add-panel.md §16 q4), and PR #175 answered it by dropping the literal ▾ "
     "because the native select draws its own. Ships <b>Coverage gaps first</b> at every width.",
     "Ratify as shipped. Close.", ""),
    ("2", "The role-counter cell is a button, not a link.",
     "Not open on #182 any more: <code>add-panel-addendum.md</code> E-N4 and S10 settled it (<code>strip.cellLink</code>, <i>consider →</i>), and it ships that way.",
     "Ratify as shipped. Close.", ""),
    ("3", "A tile with no art: README says <code>commanderGradient()</code>, the canvas draws a flat plate with <i>no art on file</i>.",
     "A real visual change. PR #175 shipped the <b>plate</b>; the later Consider tiles handoff (H30, your LGTM 2026-10-03) drew and ratified the plate as shipped (c10: tile at .55, caption unchanged).",
     "Not wanted. Keep the plate. Close.", "q"),
]


def board():
    head = board_head("Item 7 · Add panel divergences and the consider tile · #182",
                      "All three are already settled in the record; the tile keeps its plate",
                      "Design’s 2026-09-07 verdict file (<code>VERDICTS-2026-09-07</code>) isn’t on main or on <code>design-assets</code>, and #182’s original list lives only in its edit history, "
                      "so this reconciles the three items as PR #395 names them against the record that is in the repo (PRs #175, #387, #395; add-panel.md §16; the addendum’s E-N4/S10; "
                      "the Consider tiles handoff). <b>Call: no drawing change.</b> Two were already settled in the record before the verdict (which is why they don’t match it as filed), and the third, the no-art tile, was ratified as the plate "
                      "by a newer handoff than the verdict. If you still have the verdict file, send it and I’ll check this against its wording.", tag="R1")
    tab = ('<div class="note" style="max-width:2400px"><table class="rtab"><tr><th style="width:40px">#</th><th style="width:440px">What the verdict named</th><th>What the record says</th><th style="width:300px">Call</th></tr>'
           + "".join(f'<tr><td class="m">{n}</td><td>{a}</td><td>{b}</td><td><span class="vd {q}">{c}</span></td></tr>' for n, a, b, c, q in ROWS)
           + '</table></div>')
    frames_ = ('<div class="sec"><h3>The no-art tile, as shipped and as the README had it</h3><div class="frames">'
               + frame("<b>7a</b> · 390 · as shipped (keep)", ph("plate"),
                       "Scrolled to the first shelf. Chaos Warp has no art on file: the flat plate in the app’s own inks, tile at .55. It reads as missing, not as a card, which is what it is.")
               + frame("<b>7b</b> · 1300 · as shipped (keep)", dk("plate"),
                       "Six across, the same plate.")
               + "</div><div class=\"frames\">"
               + frame("Not this · 390 · commanderGradient()", ph("gradient"),
                       "The README’s gradient (Aang’s five colors, 130deg) on the same tile. Bright colored plates read as art on a shelf of real cards, against your rule that art is only ever real cards.")
               + frame("Not this · 1300 · commanderGradient()", dk("gradient"), "")
               + "</div></div>")
    notes = ('<div class="notes" style="grid-template-columns:repeat(2,minmax(0,1fr))">'
             '<div class="note"><h4>For engineering</h4><ul><li>Nothing to build. Close #182’s divergence item with this README note as the ruling.</li>'
             '<li>#182’s other open item (“99 means three things”) is not in this brief and stays open.</li></ul></div>'
             '<div class="note"><h4>If the verdict file turns up</h4>Check its wording for items 1 and 2 against PR #175 and the addendum’s E-N4/S10; what ships is their answer, and I’d ratify it unless the verdict gives a reason not to. '
             'Item 3 is settled by the Consider tiles handoff (2026-10-03) either way, since it is newer than the verdict.</div></div>')
    return doc("Consider tile", head + tab + frames_ + notes, 2920)
