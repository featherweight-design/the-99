"""The deck toolbar's draft note on a phone (account 2, 2026-10-27). Drawn with the deck-messages kit (the shipped
deck page after #2170): group-toggle.tsx's three phone rows, the decklist caption and group notes (decklist.tsx), the
mix strip's draft line (role-counter-strip.tsx) and the to-do card's Review row."""
import kit
from kit import doc, board_head, frame
import pieces as P
from pieces import DECKS
import a2

kit.CSS += r"""
/* group-toggle.tsx at 390 with Stats and Notes on: three explicit rows */
.gt{padding:9px 16px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:7px}
.gt .seg{margin:0}
.gt .r2,.gt .r3{display:flex;align-items:center;gap:7px}
.gt .lockb{height:44px;display:flex;align-items:center;gap:7px;padding:0 13px;border-radius:10px;border:1px solid var(--border-strong);font-size:13px;color:var(--fg-body)}
.gt .vw{margin-left:auto;display:flex;border:1px solid var(--border-strong);border-radius:10px;padding:3px;gap:3px}
.gt .vw span{width:38px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:7px;color:var(--fg-faint)}
.gt .vw span.on{background:var(--elevated);color:var(--fg)}
.gt .gw{display:flex;border:1px solid var(--border-strong);border-radius:10px;padding:3px;gap:3px}
.gt .gw span{height:36px;display:flex;align-items:center;padding:0 12px;border-radius:7px;font-size:13px;color:var(--fg-muted)}
.gt .gw span.on{background:var(--elevated);color:var(--fg);font-weight:600}
.gt .so{height:44px;display:flex;align-items:center;gap:7px;padding:0 13px;border-radius:10px;border:1px solid var(--border-strong);font-size:13px;color:var(--fg-body)}
.cap2{font:10px 'IBM Plex Mono';color:var(--fg-faint);padding:12px 16px 0}
.grp h4 .gn{font:normal 10.5px 'IBM Plex Mono';color:var(--accent)}
/* desktop toolbar, one line */
.dt2{display:flex;align-items:center;gap:10px;padding:14px 30px 10px;white-space:nowrap}
.dt2 .sg{display:flex;border:1px solid var(--border-strong);border-radius:9px;padding:3px;gap:3px}
.dt2 .sg span{padding:6px 12px;border-radius:6px;font-size:13px;color:var(--fg-muted);display:flex;gap:5px;align-items:baseline}
.dt2 .sg span.on{background:var(--elevated);color:var(--fg);font-weight:600}
.dt2 .sg span em{font:normal 10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.dt2 .sg .hl{width:1px;padding:0;margin:4px 3px;background:var(--border-strong)}
.dt2 .sp{flex:1}
.dt2 .nt{font:11.5px 'IBM Plex Mono';color:var(--fg-locked)}
.dt2 .hr{width:1px;height:22px;background:var(--border-strong)}
.dt2 .b{height:32px;display:flex;align-items:center;gap:6px;padding:0 11px;border-radius:8px;border:1px solid var(--border-strong);font-size:12.5px;color:var(--fg-body)}
.dt2 .vw{display:flex;border:1px solid var(--border-strong);border-radius:9px;padding:3px;gap:3px}
.dt2 .vw span{width:30px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:6px;color:var(--fg-faint)}
.dt2 .vw span.on{background:var(--elevated);color:var(--fg)}
.pinx{display:inline-flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px;border-radius:50%;background:#8FA6BE;color:#0D0B09;font:600 10.5px 'IBM Plex Mono';vertical-align:middle;margin:0 4px;box-shadow:0 0 0 3px rgba(13,11,9,.8)}
.pinx.x{background:var(--danger)}
.ghostn{outline:1.5px dashed rgba(198,83,63,.85);outline-offset:3px;border-radius:6px}
.keyl{display:flex;flex-direction:column;gap:10px}
.keyl div{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.55;color:var(--fg-body)}
.keyl div b{color:var(--fg)}
"""

LOCKI = ('<svg width="11" height="14" viewBox="0 0 11 14" aria-hidden="true"><path d="M2.5 6V4a3 3 0 0 1 6 0v2" fill="none" '
         'stroke="currentColor" stroke-width="1.4"/><rect x=".5" y="6" width="10" height="7.5" rx="1.5" fill="currentColor"/></svg>')
LISTI = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12M2 8h12M2 12h12"/></svg>'
GRIDI = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="5" height="7" rx="1"/><rect x="9" y="2" width="5" height="7" rx="1"/></svg>'
SORTI = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M5 3v10M2.5 10.5 5 13l2.5-2.5M11 13V3M8.5 5.5 11 3l2.5 2.5"/></svg>'
PIN = lambda n, x=False: f'<span class="pinx{" x" if x else ""}">{n}</span>'


def toolbar_phone():
    return ('<div class="gt"><div class="seg"><span class="on">All<em>99</em></span><span class="sh">Shopping<em>2</em></span>'
            '<span>Stats</span><span>Notes<em>2</em></span></div>'
            f'<div class="r2"><span class="lockb">{LOCKI}Lock cards</span><span class="vw"><span class="on">{LISTI}</span><span>{GRIDI}</span></span></div>'
            f'<div class="r3"><span class="gw"><span class="on">By type</span><span>By role</span></span><span class="so">{SORTI}Name · A–Z</span></div></div>')


def rows(changed=True):
    return "".join(
        f'<div class="row{" chg" if (changed and ch) else ""}"><span class="ow{"" if own else " no"}"></span><span class="nm">{n}</span>{P.mana(ps)}<span class="x">✕</span></div>'
        for n, ps, own, ch in P.ROWS)


def phone(pins=True):
    d = DECKS["thopter"]
    card = a2.s1()
    if pins:
        card = card.replace('<div class="ne">Next step</div>', f'<div class="ne">Next step {PIN(1)}</div>', 1)
    mix = P.mix(draft=True, phone_parity=True).replace('class="ms new"', 'class="ms"')
    if pins:
        mix = mix.replace('<em>· reading pending changes</em>', f'<em>· reading pending changes</em>{PIN(2)}')
    cap = f'<p class="cap2">the brass rule marks the 6 rows you have changed{PIN(3) if pins else ""}</p>'
    grp = (f'<div class="grp"><h4>Artifacts<em>24</em><span class="gn">2 changed, not yet committed</span>{PIN(4) if pins else ""}</h4>{rows()}</div>')
    return P.phone(P.phone_header(d) + card + mix + P.tabs() + toolbar_phone() + cap + grp, None)


def toolbar_desk(note=True, pin=False):
    nt = f'<span class="nt">6 of these differ from v3</span>{PIN(5) if pin else ""}' if note else ""
    return ('<div class="dt2"><span class="sg"><span class="on">All<em>99</em></span><span style="color:var(--accent)">Shopping<em>2</em></span>'
            '<span class="hl"></span><span>Stats</span><span>Notes<em>2</em></span></span><span class="sp"></span>'
            f'{nt}<span class="b">{LOCKI}Lock cards</span><span class="hr"></span>'
            f'<span class="sg"><span class="on">By type</span><span>By role</span></span><span class="b">{SORTI}Name · A–Z</span>'
            f'<span class="vw"><span class="on">{LISTI}</span><span>{GRIDI}</span></span></div>')


def desk():
    d = DECKS["thopter"]
    card = a2.s1().replace('<div class="ne">Next step</div>', f'<div class="ne">Next step {PIN(1)}</div>', 1)
    mix = P.mix(desk=True, draft=True).replace('· reading pending changes</span>', f'· reading pending changes</span>{PIN(2)}')
    grp = (f'<div class="dgrp"><h4>Artifacts<em>24</em><span class="m" style="font-size:10.5px;color:var(--accent);font-weight:400">2 changed, not yet committed</span>{PIN(4)}</h4>'
           + "".join(f'<div class="row{" chg" if ch else ""}"><span class="ow{"" if own else " no"}"></span><span class="nm">{n}</span>{P.mana(ps)}<span class="x">✕</span></div>'
                     for n, ps, own, ch in P.ROWS + [("Ornithopter", ["c0"], True, False), ("Sai's Thopter Kit", ["c2"], False, False)]) + "</div>")
    cap = f'<p class="cap2" style="padding:6px 30px 0">the brass rule marks the 6 rows you have changed{PIN(3)}</p>'
    return P.desk(P.desk_header(d) + card + mix + P.dtabs() + toolbar_desk(pin=True) + cap + grp, None)


KEY = [("1", "<b>The to-do card’s Review row</b>: <i>6 changes since v3 +4 / −2</i>, with the next version named in its body. Above the tabs, first screen."),
       ("2", "<b>The mix strip</b>: <i>· reading pending changes</i> beside EDHREC averages, and <i>was n</i> in a cell whose figure moved."),
       ("3", "<b>The list’s caption</b>, right under the toolbar: <i>the brass rule marks the 6 rows you have changed</i>. Shipped at both widths."),
       ("4", "<b>Each group’s heading</b> (<i>2 changed, not yet committed</i>) and <b>the brass rule</b> on every changed row."),
       ("5", "<b>Desktop only</b>: the toolbar note <i>6 of these differ from v3</i>, in the slot the kept note uses. The one statement the phone doesn’t draw.")]


def board():
    key = '<div class="keyl">' + "".join(f'<div>{PIN(n)}<span>{t}</span></div>' for n, t in KEY) + "</div>"
    body = (board_head("Deck toolbar · the draft note on a phone · addendum", "The phone doesn’t need the note",
                       "<code>group-toggle.tsx</code> draws <i>6 of these differ from v3</i> from desktop only (<code>hidden md:inline</code>), and no board drew it on a phone. "
                       "<b>Call: leave it off the phone.</b> On a phone the draft is already said four times between the deck’s head and its first row, and the list’s "
                       "caption, which sits directly under the toolbar, is the phone’s version of the same sentence. The toolbar’s three phone rows are full "
                       "(All · Shopping | Stats · Notes; Lock cards and the view; grouping and sort), so a fourth line would push the list down for a fifth "
                       "telling. No change to ship: the board records the call. Thopter Works with a draft of six changes against v3.", tag="R1")
            + '<div class="frames">'
            + frame("<b>390</b> · a draft of six against v3, as shipped", phone(),
                    "Pins mark where the phone already says it. Nothing new is drawn.")
            + frame("<b>1300</b> · the same deck, for comparison", desk(),
                    "The desktop note (5) sits in the toolbar’s one line. The phone carries 3 in its place, a line lower and at full width.")
            + f'<div style="display:flex;flex-direction:column;gap:16px;width:440px;flex:none"><div class="note"><b>Where the draft is said</b>{key}</div>'
              '<div class="note"><b>Why not add it</b><ul>'
              '<li>It would repeat 3 word for word in count, a line above it.</li>'
              '<li>The only fact it adds is the version (v3), and the Review row (1) already names the next one.</li>'
              '<li>Every place to put it costs: inside row 2 it crowds Lock cards and the view well; on a row of its own it is a fourth toolbar line; '
              'folded into the caption it changes a shipped sentence both widths share.</li></ul></div>'
              '<div class="note"><b>For engineering</b><ul><li>Keep <code>hidden md:inline</code> as it is.</li>'
              '<li>A test that pins the phone’s caption and group notes while a draft exists would stop this from being asked again.</li></ul></div></div>'
            + "</div>")
    return doc("Deck toolbar · draft note on a phone", body, 390 + 1300 + 440 + 44 * 2 + 112)


BOARDS = [("Draft-Note-Phone", board, "The deck toolbar’s draft note on a phone")]
