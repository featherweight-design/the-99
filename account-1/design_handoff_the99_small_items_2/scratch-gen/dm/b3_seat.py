"""Item 3 · the game log's seat picker: "A deck not listed"."""
import kit
from kit import doc, board_head, frame
import pieces as P
import deck as D

kit.CSS += r"""
/* the Games tab's form behind (game-log-form.tsx, game-seats.tsx), drawn quietly */
.gf{margin:16px 16px 0;border:1px solid var(--border-strong);border-radius:12px;background:var(--surface-rail);padding:14px 14px 16px}
.dkm .gf{margin:20px 30px 0;padding:18px 20px 20px}
.gf h3{margin:0;font:600 17px Cinzel,serif}
.gf .lab2{font:9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.gf .res{display:flex;gap:6px;margin-top:8px}
.gf .res span{height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);display:flex;align-items:center;font-size:13px;color:var(--fg-muted)}
.gf .res span.on{background:var(--fg);color:var(--bg);border-color:var(--fg);font-weight:600}
.gf .seats{border-top:1px solid var(--border);margin-top:16px;padding-top:14px}
.gf .seats .sh2{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
.gf .seats .sh2 span:last-child{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.gf ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.dkm .gf ul{flex-direction:row;flex-wrap:wrap;gap:12px}
.st{display:flex;align-items:center;gap:12px}
.dkm .st{width:124px;flex-direction:column;align-items:stretch;gap:2px}
.st .sa{width:58px;height:58px;border-radius:8px;border:1px solid var(--border);background:var(--elevated);overflow:hidden;flex:none;display:flex;align-items:center;justify-content:center;font:18px 'IBM Plex Mono';color:var(--fg-muted)}
.dkm .st .sa{width:124px;height:86px;border-radius:10px}
.st .sa img{width:100%;height:100%;object-fit:cover;display:block}
.st .sa.on{outline:2px solid var(--accent);outline-offset:2px}
.st .sa.add{border:1px dashed var(--border-dashed);background:transparent;font:22px 'IBM Plex Sans';color:var(--fg-muted)}
.st .sn{display:flex;flex-direction:column;min-width:0}
.dkm .st .sn{margin-top:6px}
.st .sn b{font-size:13px;font-weight:500;color:var(--fg)}
.st .sn b small{font:9px 'IBM Plex Mono';letter-spacing:.1em;color:var(--fg-faint);margin-left:6px}
.st .sn span{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st .sn span.wd{border-bottom:1px dashed var(--border-dashed);align-self:flex-start}
/* the picker (seat-picker.tsx) */
.pk{display:flex;flex-direction:column;background:var(--surface)}
.pk .ph2{display:flex;align-items:center;justify-content:space-between;padding:4px 16px 10px}
.pk .ph2 b{font:600 18px Cinzel,serif}
.pk .ph2 span{width:30px;height:30px;border-radius:50%;border:1px solid var(--border-strong);background:var(--surface-raised);display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--fg-muted)}
.pk .vh{display:flex;align-items:center;gap:10px;padding:12px 12px 0}
.dkm .pk .vh,.pnl .pk .vh{padding-top:10px}
.pk .vh .bk{width:32px;height:32px;border-radius:50%;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--fg-muted);flex:none}
.pk .vh .fc{width:26px;height:26px;border-radius:50%;background:var(--elevated);color:var(--fg-muted);font:9.5px 'IBM Plex Mono';display:flex;align-items:center;justify-content:center;flex:none}
.pk .vh h3{margin:0;font-size:13.5px;font-weight:500;color:var(--fg);flex:1}
.pk ul{list-style:none;margin:4px 0 0;padding:4px 0 6px}
.pk li{display:flex;align-items:center;gap:12px;min-height:52px;padding:6px 14px}
.pk li.hv{background:var(--surface-raised)}
.pk .ar{width:56px;height:40px;border-radius:6px;overflow:hidden;background:var(--elevated);flex:none;position:relative}
.pk .ar img{width:100%;height:100%;object-fit:cover;object-position:50% 20%;display:block}
.pk .ar.q{background:transparent;border:1px dashed var(--border-dashed);display:flex;align-items:center;justify-content:center;font:16px 'IBM Plex Sans';color:var(--fg-muted)}
.pk .ar.q svg{display:block}
.pk .ar.q.in{font:12px 'IBM Plex Mono'}
.pk .tx{flex:1;min-width:0;display:flex;flex-direction:column}
.pk .tx b{font-size:13.5px;font-weight:500;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pk .tx span{font:10.5px 'IBM Plex Mono';color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pk .ft{border-top:1px solid var(--border);padding:9px 14px;font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-faint)}
.sht{position:absolute;left:0;right:0;bottom:0;z-index:16;border-radius:18px 18px 0 0;overflow:hidden;border-top:1px solid var(--border-strong);box-shadow:0 -20px 50px rgba(0,0,0,.55)}
.sht .grip{display:block;width:36px;height:4px;border-radius:2px;background:var(--border-strong);margin:8px auto 6px}
.scrim3{position:absolute;inset:0;z-index:15;background:color-mix(in oklab,var(--bg) 72%,transparent)}
.pnl{position:absolute;z-index:16;width:340px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface);box-shadow:0 22px 50px rgba(0,0,0,.6);overflow:hidden}
.pair{display:flex;gap:28px}
.pair .spc{width:390px}
"""

D_ = dict(P.DECKS["aang"])
D_["status"] = "Complete"
D_["built"] = 99

PETER = [("Giada Angels", "giada", "Giada"), ("Gisa’s Graveyard", "gisa", "Gisa"), ("Dina Drain", "dina", "Dina")]
COLIN = [("Big Stompy", "ghalta", "Ghalta"), ("Dragon Tribal", "lathliss", "Lathliss"), ("Thopter Works", "sai", "Sai")]
MAG = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="8.6" cy="8.6" r="5.8"/><path d="M14 14 18 18"/></svg>'


def drow(name, art, cmd, hv=False):
    return (f'<li class="{"hv" if hv else ""}"><span class="ar"><img alt="" src="{D.img("crop-" + art)}"></span>'
            f'<span class="tx"><b>{name}</b><span>{cmd}</span></span></li>')


def trow(name, sub, slot=None, cls=""):
    s = ""
    if slot == "q":
        s = '<span class="ar q">?</span>'
    elif slot == "mag":
        s = f'<span class="ar q">{MAG}</span>'
    elif slot:
        s = f'<span class="ar q in">{slot}</span>'
    return f'<li class="{cls}">{s}<span class="tx"><b>{name}</b><span>{sub}</span></span></li>'


def picker(who="Peter", decks=PETER, r1=True, sheet=True, mark=True):
    ini = who[:2].upper()
    rows = "".join(drow(*d) for d in decks)
    nl = trow("A deck not listed", "no deck is named", "q" if r1 else None, "mark-new" if (r1 and mark) else "")
    ac = trow("Another commander", f"search the catalog for what {who} played", "mag" if r1 else None)
    ju = trow(f"Just {who}", "no deck or commander", ini if r1 else None)
    head = '<div class="ph2"><b>Seat an opponent</b><span>✕</span></div>' if sheet else ""
    return (f'<div class="pk">{head}<div class="vh"><span class="bk">‹</span><span class="fc">{ini}</span><h3>{who}’s decks</h3></div>'
            f'<ul>{rows}{nl}{ac}{ju}</ul><p class="ft">Name and commander only: nothing else of {who}’s is read.</p></div>')


def form(desk=False, peter="open"):
    you = f'<li class="st"><span class="sa"><img alt="" src="{D.img("aang")}"></span><span class="sn"><b>You<small>YOU</small></b><span>Avatar Aang</span></span></li>'
    if peter == "open":
        pt = '<li class="st"><span class="sa on">PE</span><span class="sn"><b>Peter</b><span class="wd">Which deck?</span></span></li>'
    else:
        pt = '<li class="st"><span class="sa">PE</span><span class="sn"><b>Peter</b><span class="wd">Which deck?</span></span></li>'
    add = '<li class="st"><span class="sa add">+</span><span class="sn"><b style="color:var(--fg-muted)">Add opponent</b></span></li>'
    return ('<div class="gf"><h3>Log a game</h3><div style="margin-top:14px"><span class="lab2">Result</span>'
            '<div class="res"><span class="on">Won</span><span>Lost</span><span>Draw</span></div></div>'
            f'<div class="seats"><div class="sh2"><span class="lab2">Across the table</span><span>2 of 4 seats</span></div><ul>{you}{pt}{add}</ul></div></div>')


def games_tabs(desk=False):
    t = P.dtabs(built=99) if desk else P.tabs(built=99)
    return t.replace('<span class="on">Your deck', '<span class="">Your deck').replace('<span class="">Games', '<span class="on">Games')


def ph(over, peter="open"):
    page = games_tabs() + form(False, peter)
    return D.phone_page(page, over=over)


def dk(over=""):
    page = P.desk_header(D_) + games_tabs(True) + form(True)
    return D.desk_page(page, over=over, h=1100)


def board():
    head = board_head("Item 3 · the game log’s seat picker · “A deck not listed”",
                      "A deck not listed gets the slot every other row has",
                      "Neither the friend decks nor the game log handoff drew this row. Today it is text only between deck rows that carry 56 × 40 commander art, "
                      "so its words start 68px left of every deck name. <b>Call: the row takes Rule 0’s dashed slot</b> (the “Leave it to Peter” row’s dashed <b>?</b>), "
                      "at the picker’s own 56 × 40. The two rows under it, Another commander and Just Peter, take the same dashed slot with their own mark "
                      "(the search glyph; Peter’s initials, which is what his seat then shows), so the text column runs straight down the list. "
                      "Hugh’s words are unchanged: <b>A deck not listed</b> / <b>no deck is named</b>.", tag="R1")
    phones = ('<div class="frames">'
              + frame("Today · 390 · Peter’s decks", ph('<div class="scrim3"></div><div class="sht"><span class="grip"></span>' + picker(r1=False) + '</div>'),
                      "Shipped. The three text-only rows hang left of the deck names.")
              + frame("<b>3a</b> · 390 · Peter’s decks", ph('<div class="scrim3"></div><div class="sht"><span class="grip"></span>' + picker() + '</div>'),
                      "The dashed slot: 1px <code>--border-dashed</code>, 6px radius, the mark in <code>--fg-muted</code> (the ? at 16px, as Rule 0 draws it). "
                      "Same row height (52), same press, no hover change beyond the shipped one. The orange dashes mark the changed row on this board only; the app draws nothing there.")
              + frame("<b>3b</b> · 390 · after A deck not listed", ph("", peter="done"),
                      "Shipped and unchanged: Peter is seated with no deck, his initials in the art slot and <b>Which deck?</b> under his name to come back.")
              + "</div>")
    desk = ('<div class="frames">'
            + frame("<b>3c</b> · 1300 · the anchored panel", dk('<div class="pnl" style="left:180px;top:652px">' + picker(sheet=False) + '</div>'),
                    "The shipped 340px panel anchored under Peter’s seat, no title. Same rows, same slots.")
            + "</div>")
    priv = ('<div class="sec"><h3>What the row must not say</h3>'
            '<p class="sp">It shows for <b>every friend whose friend decks are switched on</b>, whether or not they hid anything, so its presence says nothing. '
            'Peter hides one deck; Colin hides none. Their lists end the same way, and nothing counts, names or hints at a hidden deck.</p>'
            '<div class="pair">'
            + frame("Peter · hides one deck", f'<div class="spc">{picker("Peter", PETER, sheet=False, mark=False)}</div>', "")
            + frame("Colin · hides nothing", f'<div class="spc">{picker("Colin", COLIN, sheet=False, mark=False)}</div>', "")
            + '</div></div>')
    notes = ('<div class="notes" style="grid-template-columns:repeat(3,minmax(0,1fr))">'
             '<div class="note"><h4>When it shows (README note)</h4>In a friend’s deck list in the game log’s seat picker, after their decks and before Another commander, '
             'for <b>every</b> friend whose friend decks switch is on (<code>PickerFriend.withheld</code>), whatever their settings hide or don’t. '
             'It seats the friend with no deck, exactly as Just <i>name</i> does. It never says whether a hidden deck exists, how many, or which: no count, no “hidden”, '
             'and a friend with no decks listed is not told “has no decks”.</div>'
             '<div class="note"><h4>The slot</h4><ul><li>56 × 40, 6px radius, <code>1px dashed var(--border-dashed)</code>, no ground; the mark centred in <code>--fg-muted</code>.</li>'
             '<li>A deck not listed: <b>?</b> (sans 16). Another commander: the search glyph (16). Just <i>name</i>: the initials (mono 12), as the seat shows them.</li>'
             '<li><code>aria-hidden</code>, as the deck rows’ art is.</li></ul></div>'
             '<div class="note"><h4>For engineering</h4><ul><li><code>seat-picker.tsx</code>: the three text-only rows gain the slot; nothing else changes (order, copy, condition, what they seat).</li>'
             '<li>Rule 0 setup’s Leave it to <i>name</i> keeps its own 58 × 42 slot.</li></ul></div></div>')
    return doc("Seat picker", head + '<div class="sec"><h3>Phone</h3>' + phones + '</div><div class="sec"><h3>Desktop</h3>' + desk + '</div>' + priv + notes, 2200)
