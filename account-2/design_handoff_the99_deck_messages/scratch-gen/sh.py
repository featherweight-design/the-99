"""The pass sheet (Hugh 2026-10-22 02:42 + 03:03): the foot's Show these opens a sheet of the shipped card rows;
a row opens the shipped card detail, stacked on the sheet."""
import kit
from kit import doc, board_head, frame
import pieces as P
import alts as A
import a2, a3

kit.LOCAL.update({"zimone": "art/zimone-crop.jpg", "card-sai": "art/card-sai.jpg"})

kit.CSS += r"""
.scr .ph{height:844px}
.scr .ph>*{flex:none}
.scrim{position:absolute;inset:0;background:rgba(8,6,5,.62);z-index:30}
.bs{position:absolute;left:0;right:0;bottom:0;z-index:31;background:var(--surface);border-top:1px solid var(--border-strong);border-radius:18px 18px 0 0;display:flex;flex-direction:column;box-shadow:0 -14px 40px rgba(0,0,0,.6)}
.bs .gr{width:40px;height:4px;border-radius:9px;background:var(--border-strong);margin:8px auto 2px}
.hd2{display:flex;align-items:flex-start;gap:10px;padding:10px 8px 10px 18px;border-bottom:1px solid var(--border)}
.hd2 .tt{flex:1;min-width:0}
.hd2 .ey{font:9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.hd2 h3{margin:4px 0 0;font:700 17px Cinzel,serif;color:var(--fg)}
.hd2 p{margin:4px 0 0;font-size:12.5px;line-height:1.5;color:var(--fg-body)}
.hd2 .x{width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;color:var(--fg-muted);font-size:15px}
.sr{display:flex;flex-direction:column;gap:4px;padding:10px 12px}
.sr h5{margin:8px 0 4px 2px;font:600 13px 'IBM Plex Sans';display:flex;gap:8px;align-items:baseline}
.sr h5:first-child{margin-top:0}
.sr h5 em{font:normal 10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.crow{display:flex;align-items:center;gap:8px;min-height:34px;padding:0 0 0 10px;border-radius:8px;background:var(--surface-rail);font-size:14px;position:relative}
.crow .ow{width:8px;height:8px;border-radius:50%;background:var(--success);flex:none}
.crow .ow.no{background:transparent;border:1.5px solid var(--fg-faint)}
.crow .nb{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:6px}
.crow .nm{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--fg)}
.crow .auto{flex:none;font:9.5px 'IBM Plex Mono';color:var(--fg-locked);background:var(--elevated);border-radius:4px;padding:1px 5px}
.crow .bg{flex:none;font:10px 'IBM Plex Mono';color:var(--warning);border:1px solid var(--accent-shadow);border-radius:4px;padding:0 5px;line-height:15px}
.crow .pt{flex:none;width:72px;display:flex;justify-content:flex-end}
.crow .x{flex:none;width:26px;align-self:stretch;display:flex;align-items:center;justify-content:center;color:var(--border-dashed);font-size:13px}
.crow.press{outline:2px solid var(--accent);outline-offset:1px}
.crow .tap{position:absolute;left:12px;top:22px;width:22px;height:22px;border-radius:50%;background:rgba(240,230,210,.25);border:1.5px solid rgba(240,230,210,.7)}
.sf{display:flex;gap:8px;padding:12px 14px 26px;border-top:1px solid var(--border)}
.sf span{flex:1;display:flex;align-items:center;justify-content:center;height:44px;border-radius:9px;font:600 13.5px 'IBM Plex Sans'}
.sf .o{border:1px solid var(--border-strong);color:var(--fg)}
.sf .p{background:var(--fg);color:var(--bg)}
.md{position:absolute;z-index:31;left:50%;top:70px;transform:translateX(-50%);width:600px;background:var(--surface);border:1px solid var(--border-strong);border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.6);display:flex;flex-direction:column}
.md .sf{padding:12px 16px 14px}
.md .sf span{flex:none;padding:0 18px;height:38px}
.md .sf .sp{flex:1;background:none}
.ln-press{outline:2px solid var(--accent);outline-offset:2px;border-radius:7px}
/* card detail, shipped, stacked on the sheet */
.cs{position:absolute;inset:0;z-index:40;background:var(--surface);display:flex;flex-direction:column}
.cs .bk{display:flex;align-items:center;gap:8px;height:52px;padding:0 16px;border-bottom:1px solid var(--border);font:500 13.5px 'IBM Plex Sans';color:var(--fg)}
.cs .bk .ar{font-size:16px;color:var(--fg-muted)}
.cs .art{display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px 0 14px}
.cs .art img{width:180px;height:251px;border-radius:9px;display:block;box-shadow:0 10px 26px rgba(0,0,0,.5)}
.cs .ptag{font:11px 'IBM Plex Mono';color:var(--warning);border:1px solid var(--accent-shadow);border-radius:5px;padding:2px 7px}
.cs .nmb{padding:0 18px;display:flex;flex-direction:column;gap:4px}
.cs .nmb h3{margin:0;font:700 19px Cinzel,serif}
.cs .nmb .tl{font-size:12.5px;color:var(--fg-muted)}
.cs .sec2{margin:14px 18px 0;padding-top:12px;border-top:1px solid var(--border);font-size:12.5px;line-height:1.55;color:var(--fg-body)}
.cs .sec2 b{display:block;font:9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);margin-bottom:4px}
.cm2{position:absolute;z-index:40;left:50%;top:60px;transform:translateX(-50%);width:820px;height:620px;background:var(--surface);border:1px solid var(--border-strong);border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.65);display:flex;flex-direction:column;overflow:hidden}
.cm2 .bk{display:flex;align-items:center;gap:8px;height:50px;padding:0 18px;border-bottom:1px solid var(--border);font:500 13.5px 'IBM Plex Sans'}
.cm2 .bd2{display:flex;flex:1;min-height:0}
.cm2 .ac2{width:300px;flex:none;border-right:1px solid var(--border);display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 0}
.cm2 .ac2 img{width:240px;height:335px;border-radius:11px;display:block}
.cm2 .rc2{flex:1;padding:22px 24px;display:flex;flex-direction:column;gap:6px}
.cm2 .rc2 h3{margin:0;font:700 22px Cinzel,serif}
.cm2 .rc2 .tl{font-size:13px;color:var(--fg-muted)}
.cm2 .sec2{margin-top:14px;padding-top:12px;border-top:1px solid var(--border);font-size:13px;line-height:1.55;color:var(--fg-body)}
.cm2 .sec2 b{display:block;font:9.5px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);margin-bottom:4px}
.cm2 .ptag{font:11px 'IBM Plex Mono';color:var(--warning);border:1px solid var(--accent-shadow);border-radius:5px;padding:2px 7px}
"""

DECK = dict(name="Quandrix Lab", cmd="Zimone, Quandrix Prodigy", color="Simic", pips=["u", "g"], art="zimone",
            status="Building", built=87, bracket=("b3", "Upgraded", "var(--bracket-3)"))

# (name, cost, owned, auto, buy)  — the 1st top-off's 9 live cards, all still auto
PASS = [("Cultivate", ["c2", "g"], True, True, False), ("Kodama’s Reach", ["c2", "g"], False, True, True),
        ("Sai, Master Thopterist", ["c2", "u"], False, True, True), ("Rampant Growth", ["c1", "g"], True, True, False),
        ("Growth Spiral", ["g", "u"], True, True, False), ("Beast Within", ["c2", "g"], False, True, True),
        ("Harmonize", ["c2", "g"], True, True, False), ("Elvish Mystic", ["g"], False, True, True),
        ("Heroic Intervention", ["c1", "g"], False, True, True)]
SOFT = [("Elf Tribal", [("Cultivate", ["c2", "g"], True, False, False), ("Beast Within", ["c2", "g"], False, False, True),
                        ("Heroic Intervention", ["c1", "g"], False, False, True)]),
        ("Mono-G Stompy", [("Harmonize", ["c2", "g"], True, False, False)])]


def crow(n, cost, own, auto, buy, soft=False, press=False):
    """The shipped All row (DecklistRow): ownership slot · name · marks (auto, $, facts) · 72px pip track · ✕."""
    marks = ('<span class="auto">auto</span>' if auto else "") + ('<span class="bg">$</span>' if buy else "") \
        + ('<span class="sg-soft"></span>' if soft else "")
    return (f'<div class="crow{" press" if press else ""}"><span class="ow{"" if own else " no"}"></span>'
            f'<span class="nb"><span class="nm">{n}</span>{marks}</span><span class="pt">{P.mana(cost)}</span><span class="x">✕</span>'
            + ('<span class="tap"></span>' if press else "") + "</div>")


def pass_rows(press=None):
    return '<div class="sr">' + "".join(crow(*r, press=(r[0] == press)) for r in PASS) + "</div>"


def soft_rows():
    out = []
    for deck, rs in SOFT:
        out.append(f'<h5>{deck}<em>draft · {len(rs)}</em></h5>' + "".join(crow(*r, soft=True) for r in rs))
    return '<div class="sr">' + "".join(out) + "</div>"


HD_PASS = ('<div class="hd2"><div class="tt"><div class="ey">1st top-off</div><h3>9 cards</h3>'
           '<p>9 cards you chose from the last 12, 5 of them to buy.</p></div><span class="x">✕</span></div>')
HD_SOFT = ('<div class="hd2"><div class="tt"><div class="ey">In other drafts too</div><h3>4 cards</h3>'
           '<p>Nothing to sort out yet. None of those is past a draft either. Whichever you sleeve first gets them.</p></div><span class="x">✕</span></div>')


def todo(desk=False):
    c = (f'<div class="t2"><div class="th"><span class="e">Before Quandrix Lab is complete</span><span class="n">3 to do</span></div>'
         f'{a2.R_LAST()}{a2.R_SOL}{a2.R_PEND3()}{a3.foot(a2.F3, "Where these 31 cards came from", desk)}</div>')
    return c.replace("<span>Show these 9</span>", '<span class="ln-press">Show these 9</span>', 1)


def phone_base():
    return P.phone(todo() + P.mix(cells=A.C3, phone_parity=True) + P.tabs(built=87)
                   + P.phone_list(changed=True, shopping="9", built=87), None).replace('<div class="ph">', '<div class="ph" style="height:844px">', 1)


def desk_base():
    return P.desk(P.desk_header(DECK) + todo(True) + P.mix(desk=True, cells=A.C3) + P.dtabs(built=87)
                  + P.desk_list('<span class="nt">9 of these differ from v2</span>', changed=True), None)


def card_phone():
    return ('<div class="cs"><div class="bk"><span class="ar">←</span>1st top-off</div>'
            f'<div class="art"><img alt="Sai, Master Thopterist" src="{kit.img("card-sai")}"><span class="ptag">$1.20</span></div>'
            '<div class="nmb"><h3>Sai, Master Thopterist</h3><span class="tl">Legendary Creature — Human Artificer · 2U</span></div>'
            '</div>')


def card_desk():
    return ('<div class="cm2"><div class="bk"><span style="color:var(--fg-muted)">←</span>1st top-off</div><div class="bd2">'
            f'<div class="ac2"><img alt="Sai, Master Thopterist" src="{kit.img("card-sai")}"><span class="ptag">$1.20</span></div>'
            '<div class="rc2"><h3>Sai, Master Thopterist</h3><span class="tl">Legendary Creature — Human Artificer · 2U</span>'
            '</div></div></div>')


def sheet(kind="pass", press=None, card=False):
    hd, body = (HD_PASS, pass_rows(press) + '<div class="sf"><span class="o">Undo these 9</span><span class="p">Done</span></div>') if kind == "pass" \
        else (HD_SOFT, soft_rows() + '<div class="sf"><span class="p">Done</span></div>')
    ov = f'<div class="scrim"></div><div class="bs"><span class="gr"></span>{hd}{body}</div>' + (card_phone() if card else "")
    base = phone_base()
    return f'<div class="scr">{base[:-6]}{ov}</div></div>'


def modal(press=None, card=False):
    md = (f'<div class="scrim"></div><div class="md">{HD_PASS}{pass_rows(press)}<div class="sf"><span class="o">Undo these 9</span>'
          '<span class="sp"></span><span class="p">Done</span></div></div>' + ('<div class="scrim" style="z-index:39"></div>' + card_desk() if card else ""))
    return desk_base()[:-6] + md + "</div>"


def board():
    body = (board_head("Deck page messages · the pass sheet", "Show these opens a sheet of the deck’s own rows",
                       "Ruled 2026-10-22: <b>the sheet</b>. The foot’s Show these N (and ‘N in other drafts too’) opens the shipped ModalChrome sheet at 390 and modal at 1300. "
                       "<b>Its rows are the deck page’s own card row, <code>DecklistRow</code> in the All view, mounted unchanged</b>: ownership slot, name, the auto tag, the bare $ and the fact marks, "
                       "the 72px pip track, the ✕, the marks folding by the row’s width, the preview on hover. A press opens the shipped card detail, stacked on the sheet, so its close reads "
                       "<b>← 1st top-off</b> and closing it lands back on the sheet (registerSheet’s back label). The accent-edge PassMark retires. Copy is placeholder.", tag="Sheet")
            + '<div class="frames">'
            + frame("<b>Sheet</b> · 390", sheet(), "Which pass, its sentence, its 9 live cards as the All rows they are in the list, Undo these 9 and Done.")
            + frame("<b>Sheet</b> · 390 · a row pressed", sheet(press="Sai, Master Thopterist"), "The row is the shipped card press: the name opens the card.")
            + frame("<b>Card detail</b> · 390 · stacked on the sheet", sheet(card=True),
                    "The shipped card sheet at full height over the pass sheet (kept mounted under it). Its close is ← 1st top-off. Drawn to the type line; everything in it is the shipped card sheet, unchanged.")
            + frame("<b>Sheet</b> · 390 · other drafts", sheet("soft"),
                    "‘4 in other drafts too’ opens the same sheet: the cards grouped under each draft (the list’s own group heading), each row with the hollow other-drafts mark it carries in the list.")
            + "</div><div class=\"frames\">"
            + frame("<b>Modal</b> · 1300", modal(), "The same rows at the modal’s width: the wide tier, so every mark shows.")
            + frame("<b>Card detail</b> · 1300 · stacked on the modal", modal(card=True), "The shipped 820×620 card modal over the pass modal, drawn to the type line; ← 1st top-off returns to it.")
            + "</div>"
            + '<div class="note" style="max-width:1500px"><b>No row drift</b><ul>'
              "<li>The sheet renders <code>DecklistRow</code> itself with the All view’s props, inside the deck page’s providers (optimistic deck, card detail, locks, foil, combo partners), never a copy or a trimmed row. Whatever the list row draws today or later, the sheet draws.</li>"
              "<li>The rows sit at the sheet’s inner width, so <code>FOLD</code>’s container query picks the tier (390: middle; 1300 modal: wide), exactly as a list row of that width would.</li>"
              "<li>The ✕ removes the card from the deck, as in the list; the row leaves the sheet and the count in the head drops. Undo these N stays in the sheet’s foot; the ledger line keeps Show these and Undo these.</li>"
              "<li>Guard: an inventory (<code>docs/superpowers/inventories/pass-sheet.json</code>) whose <code>shares.module</code> names <code>DecklistRow</code> for the deck list and the sheet, so <code>pnpm check:shared</code> fails if the sheet ever imports anything else; the contact sheet photographs both at 390 and 1300.</li>"
              "<li>Fixture: Quandrix Lab (Zimone) so the opened card can be a real card image (Sai). Prices are placeholders.</li></ul></div>")
    return doc("Deck messages · the pass sheet", body, 1300 * 2 + 44 + 112)


BOARDS = [("Show-Cards", board, "The pass sheet · Show these opens the deck’s own rows; a row opens the card")]
