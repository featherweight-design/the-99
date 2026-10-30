"""Small items 6 (account 2, 2026-10-30): six undrawn states and errata on shipped surfaces.

1 Overview Game plan Backup line (over the overview_stages option B kit, vis.py; shipped synopsis-stages.tsx #2432).
2 Tuning panel Additional notes (confirm: #2423 shipped a2's label row; tg.py e_notes).
3 Suggested changes v2 About errata (rule-card.tsx / rule-diagrams.tsx / try-it.tsx, About rules: rows in one 250+ column).
4 Overview weaknesses Critical chip.
5 Tag-a-card box undrawn states (tagged-box.tsx #2423).
Item 6 (What's new, every kind off) is built over the announcements kit: w6.py.
"""
import os
import re
import sys
import json
import shutil

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
import parts as P
import ov
_main = sys.modules["__main__"]
sys.modules["__main__"] = ov
import vis  # noqa: E402
sys.modules["__main__"] = _main
from kit import doc, frame  # noqa: E402

CSS_OV = kit.CSS
import tg  # noqa: E402
CSS_TG = kit.CSS

TAG = "S6"
mk = ov.mk


def head(kicker, title, cap):
    return kit.board_head(kicker, title, cap, tag=TAG)


sec, frames, tbl = ov.sec, ov.frames, ov.tbl


def note(t, b, w=400):
    return f'<div class="note" style="width:{w}px"><b>{t}</b><div style="margin-top:6px">{b}</div></div>'


def col(*items, w=400):
    return f'<div style="display:flex;flex-direction:column;gap:16px;width:{w}px">{"".join(items)}</div>'


OV_EXTRA = r"""
/* ---------- item 1: the Backup line under the stages ---------- */
.bk{display:grid;grid-template-columns:52px minmax(0,1fr);gap:12px;align-items:start;border:1px solid var(--border);background:var(--surface-sunken);border-radius:10px;padding:11px 12px}
.bk .cimg{width:52px;height:72px}
.bk .lb{display:flex;align-items:center;gap:9px;font:500 10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-body);margin-bottom:5px}
.bk .lb i{width:10px;height:10px;transform:rotate(45deg);border:1.5px solid var(--fg-faint);display:block;flex:none;box-sizing:border-box}
.bk p{font-size:13px;line-height:1.55;color:var(--fg-body);text-wrap:pretty}
.shx .bk{margin-left:22px}
.gpw{display:flex;flex-direction:column;gap:12px}
.ghost{opacity:.4}
/* ---------- item 4: the Critical chip ---------- */
.sev.crit{color:#E07A65;border-color:color-mix(in oklab,#C6533F 60%,transparent)}
.wk2 p.plain{grid-template-columns:1fr}
.chipcmp{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
"""
kit.CSS = CSS_OV + OV_EXTRA
CSS_OV = kit.CSS

HS = vis.HS
BACKUP = ("lathliss", "When fliers wall the ground team, [[Lathliss, Dragon Queen]] and her Dragons win in the air instead.")
CI_ALT_ROW = vis.CI_ALT


def ci(k):
    return vis.ci(k)


def backup_box(d=BACKUP):
    k, t = d
    return f'<div class="bk new2 new">{ci(k)}<div><span class="lb"><i></i>Backup</span><p>{mk(t)}</p></div></div>'


def gplan(phone, backup=True, alt=False, ghost_stages=False):
    g = vis.plan(HS, phone, False)
    # vis.plan returns '<div class="osub"><h4>Game plan</h4>{g}</div>'
    inner = g[len('<div class="osub"><h4>Game plan</h4>'):-len('</div>')]
    if ghost_stages:
        inner = inner.replace('class="tl3 new2"', 'class="tl3 ghost"', 1).replace('class="rl new2"', 'class="rl ghost"', 1)
    else:
        inner = inner.replace(' new2"', '"', 1)
    extra = (backup_box() if backup else "") + (vis.alt_box().replace("alt2 new2", "alt2") if alt else "")
    return f'<div class="osub"><h4>Game plan</h4><div class="gpw">{inner}{extra}</div></div>'


def modal_plan(phone=False, backup=True, alt=False, aside="HD - Half Shell · written 2 days ago", ghost=False):
    body = f'<section class="osec"><h3>Primer</h3><div class="prm">{gplan(phone, backup, alt, ghost)}</div></section>'
    if phone:
        return (f'<div class="ph shp" style="padding-bottom:16px"><div class="dim">{P.ph_top()}</div><div class="shx"><div class="mh"><h2>Overview</h2><span class="x">×</span></div>'
                f'<div class="mb vb"><span class="asl">{aside}</span>{body}</div></div></div>')
    return (f'<div class="omo"><div class="mh"><h2>Overview</h2><span class="as">{aside}</span><span class="x">×</span></div>'
            f'<div class="mb vb">{body}</div></div>')


# ================================================================ 1 · Backup
def board_backup():
    a = frames(frame("<b>1300</b> · a player’s deck with a backup · HD - Half Shell", f'<div class="scrimw">{modal_plan()}</div>',
                     "The three stages read left to right as shipped. <b>Backup</b> sits under them, full width: its own card with its lead card’s image and a hollow diamond, so it reads as another way to win, not a fourth turn."),
               frame("<b>1300</b> · a precon with a backup and an alternate (stages faded)", f'<div class="scrimw">{modal_plan(backup=True, alt=True, aside="Counter Intelligence · written for the precon list", ghost=True)}</div>',
                     "Order: Early, Mid, Close, then Backup, then Alternate commander. Both are set apart from the timeline; the alternate keeps its dashed box and crown."),
               gap=40)
    b = frames(frame("<b>390</b> · a player’s deck with a backup", modal_plan(True)),
               frame("<b>390</b> · a precon with both (stages faded)", modal_plan(True, True, True, "Counter Intelligence · written for the precon list", True),
                     "On a phone the Backup card sits under the rail, aligned with the stage cards; the rail ends at Close."),
               col(note("Why not a fourth stage",
                        "Early, Mid and Close are time: the rail and the timeline say “then”. A backup isn’t later, it’s instead: what wins when Close is answered. "
                        "A fourth diamond would read as a fourth turn of the game. A hollow diamond, off the rail, says “not on this line”."),
                   note("When it shows",
                        "Only when the reply carries a backup (<code>plans.backups[0]</code>), one line, the first. No backup, no box: the deck ends at Close, as today. "
                        "Today’s old shape ended Core strategy on “Backup: …”; this keeps that line and gives it a place."),
                   note("Engineering",
                        "<code>plans.backups</code> is already written on every reply and never shown. Draw <code>backups[0]</code> as the Backup line: the label comes from the slot "
                        "(never from the text, so “Backup:” at its start is dropped), card image = the first card it names via <code>FindingArt</code>, as a stage. "
                        "The stages prompt needs the backup’s length (a stage’s 144) and marking rules, and its one-place rule for a backup combo’s cards moves from Close to Backup. "
                        "Contract bump; rows without it draw no box."),
                   w=420), gap=40)
    calls = tbl([
        ("1", "Where", "Under Close, before Alternate commander. Desktop: one full-width card under the three-card timeline. Phone: one card under the rail, indented to the stage cards."),
        ("2", "How it reads", "Label <b>Backup</b> in the stage label style with a <b>hollow</b> diamond (Close keeps the accent one); card image 52×72 at both widths; 13px body. Solid edge, sunken fill, as a stage card; the alternate stays dashed."),
        ("3", "Fixture", "HD - Half Shell (cards we hold images for). The line is written for this drawing: “When fliers wall the ground team, Lathliss, Dragon Queen and her Dragons win in the air instead.”"),
    ])
    body = (head("item 1 · Overview › Game plan · the Backup line", "Backup goes under Close",
                 "The old Core strategy ended on a backup win. The stages shape (<code>design_handoff_the99_overview_stages/</code>, option B, shipped #2432) has nowhere for it. "
                 "<b>Call: one Backup card under the three stages</b>, above the precon’s Alternate commander, shown only when the reading has a backup. Dashed orange outlines mark what is new.")
            + sec("A · Desktop", "The shipped modal, 700 wide; Primer’s Game plan only.", a)
            + sec("B · Phone", "The shipped sheet.", b)
            + '<div class="sec"><h3>The calls</h3>' + calls + '</div>')
    return doc("Backup line", body, 700 * 2 + 80 * 2 + 40 + 112)


# ================================================================ 4 · Critical
WEAK = [("Critical", "One wipe undoes the plan: [[All Is Dust]] resets every counter, and the deck holds nothing to protect the team."),
        ("Moderate", "Few ways to draw, so a long game runs the hand dry."),
        ("Minor", "Fliers wall a ground team, and the deck runs few reach creatures.")]


def weak_html(rows, today=False):
    out = ""
    for s, t in rows:
        if today and s == "Critical":
            out += f'<p class="plain"><span>Critical: {mk(t)}</span></p>'
        else:
            c = {"Critical": " crit", "Moderate": " mod"}.get(s, "")
            out += f'<p><span class="sev{c}{" new" if s == "Critical" and not today else ""}">{s}</span><span>{mk(t)}</span></p>'
    return f'<div class="wk2">{out}</div>'


def wmodal(phone, today):
    body = f'<section class="osec"><h3>Weaknesses</h3>{weak_html(WEAK, today)}</section>'
    if phone:
        return (f'<div class="ph shp" style="padding-bottom:16px"><div class="dim">{P.ph_top()}</div><div class="shx"><div class="mh"><h2>Overview</h2><span class="x">×</span></div>'
                f'<div class="mb vb"><span class="asl">HD - Half Shell · written 2 days ago</span>{body}</div></div></div>')
    return (f'<div class="omo"><div class="mh"><h2>Overview</h2><span class="as">HD - Half Shell · written 2 days ago</span><span class="x">×</span></div>'
            f'<div class="mb vb">{body}</div></div>')


def board_critical():
    chips = ('<div class="chipcmp"><span class="sev crit">Critical</span><span class="sev mod">Moderate</span><span class="sev">Minor</span></div>')
    a = frames(frame("<b>Today</b> · 1300 · shipped", f'<div class="scrimw">{wmodal(False, True)}</div>', "A Critical line draws plain, its tier left in the words, out of line with the chips under it."),
               frame("<b>Drawn</b> · 1300", f'<div class="scrimw">{wmodal(False, False)}</div>', "The Critical chip, first."), gap=40)
    b = frames(frame("<b>Today</b> · 390", wmodal(True, True)),
               frame("<b>Drawn</b> · 390", wmodal(True, False), "On a phone the chip sits over its line, as the others do."),
               col(note("The three chips", chips + '<p style="margin-top:10px">Same pill: mono 10, 2 8 padding, full radius. Critical: ink <code>#E07A65</code> (the availability marker’s <code>--avail-hard-fg</code>, 5.5:1 on the modal), edge <code>--danger</code> at 60%. '
                                            '<code>--danger</code> itself is 3.2:1 as text at 10px, so it draws only the edge. Moderate stays warning, Minor muted.</p>'),
                   note("Order and engineering", "Critical lines lead, then Moderate, then Minor (sort in the view, keeping the model’s order within a tier). "
                        "<code>splitSeverity</code> takes <code>Critical</code> too; the chip class gains its tier. No new copy: the word is the model’s."), w=420), gap=40)
    body = (head("item 4 · Overview › Weaknesses · Critical", "A Critical chip",
                 "The model can write a Critical weakness (a mandatory loop always is one); the handoff drew chips for Moderate and Minor only, so it ships plain. "
                 "<b>Call: draw a Critical chip</b>, in the short-availability red, first in the list. Plain reads as a line that lost its chip.")
            + sec("A · Desktop", "The shipped modal’s Weaknesses.", a)
            + sec("B · Phone", "The shipped sheet.", b))
    return doc("Critical chip", body, 700 * 2 + 80 * 2 + 40 + 112)


# ================================================================ 2 · Additional notes (confirm)
def board_notes():
    e = frames(frame("<b>Shipped</b> · 390 · empty", tg.ph_frame(tg.e_notes(True).replace('class="chg"', 'class=""'), "Analysis tab · Tuning · Suggested changes")),
               frame("<b>Shipped</b> · 390 · written", tg.ph_frame(tg.e_notes(True, "More removal, and keep Swords to Plowshares").replace('class="chg"', 'class=""'), "Analysis tab · Tuning · Suggested changes")),
               frame("<b>Shipped</b> · 1300", tg.dk_frame(tg.e_notes(False).replace('class="chg"', 'class=""'), "Analysis tab · Tuning · Suggested changes", w=820)),
               gap=36)
    notes = frames(note("Nothing to draw: it shipped",
                        "Section <b>a2</b> of <code>design_handoff_the99_small_items_5/</code> (Tag-Places, PR #2415) kept the label row: mono caps <i>Additional notes</i> and its ⓘ over the framed box. "
                        "PR #2414’s first commit framed the box without the row (its description still says so, which is where this item came from); <b>the row was put back before #2414 merged</b> (<code>labelRow</code>), and #2423 kept it. On main, <code>tuning-panel.tsx</code> draws "
                        "<code>&lt;TuningNotesField … labelRow /&gt;</code>, and the textarea is named by the visible label (<code>htmlFor</code>) and described by the tip. Drawn above from that code.", w=520),
                   note("The box with no label is the request box",
                        "With Suggested changes v2 on, the panel draws v2’s three steps in place of Additional notes; its request box has no label row by design (step 2’s heading names it, "
                        "<code>label</code> is its accessible name). If that is the box you saw, it is as drawn in <code>design_handoff_the99_suggested_changes_v2/</code> Intake. Nothing changes.", w=520), gap=36)
    body = (head("item 2 · Tuning › Additional notes", "Confirmed: the label and ⓘ stay, and they shipped",
                 "<b>Call: confirm.</b> The label row and its tip stay with the frame (a placeholder is not a name). That was drawn as a2 in small items 5 and #2414 merged with it, so no redraw.")
            + sec("Shipped", "Today’s Additional notes on main, with v2 off.", e) + notes)
    return doc("Additional notes", body, 390 * 2 + 820 + 36 * 2 + 112 + 24)


# ================================================================ 5 · tag box states
T5 = r"""
.tb.s6ring{outline:2px solid var(--accent);outline-offset:2px}
.tb.err.f2{box-shadow:0 0 0 1px var(--danger)}
.tb.dash.solid{border-style:solid}
.tb .ft .tg.fv{outline:2px solid var(--accent);outline-offset:2px}
.tb .ft .tg.dis{border-color:var(--border);color:var(--fg-locked)}
.tb.s6lk{border-color:var(--border)}
.tb.s6lk .tx{color:var(--fg-muted)}
.tb .ft .tg.hid{visibility:hidden}
.s6p{display:flex;gap:28px;align-items:flex-start}
.s6c{display:flex;flex-direction:column;gap:8px;width:400px}
.s6c>span{font:10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.s6c>span b{color:var(--accent);font-weight:600}
.s6c>p{font-size:12.5px;line-height:1.55;color:var(--fg-muted);text-wrap:pretty}
.meas{position:relative}
.meas .mlab{position:absolute;right:-74px;font:600 10px 'IBM Plex Mono';color:var(--fact)}
.meas .mgap{position:absolute;left:-14px;width:8px;border:1px solid var(--fact);border-right:0}
.s6k{display:flex;gap:22px;align-items:center;padding:14px 16px;border:1px solid var(--border);border-radius:10px;background:var(--surface)}
.s6k .tb{border:0;background:transparent}
.s6k .s6kk{display:flex;flex-direction:column;gap:8px;align-items:flex-start;font:10px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint)}
.s6k .s6kk .ft{padding:0}
"""

DESC = "Bend all four elements in one turn and flip Aang. Allies go wide first; no infinite combos."
OVER = ("Grind a four-player table out and win late with big fliers; keep Swords to Plowshares and Path to Exile for the scary turns. "
        "No infinite combos, nothing over $20 a card, and no more than two tutors in the whole list.")
HMC = "Something scary and a little nasty that still runs Swords to Plowshares"
LBL = '<div class="lr"><label>Describe your deck</label>' + tg.INFO + '</div>'
HELP = '<p class="hp"><span>One or two sentences that will help us suggest more accurate card swaps.</span></p>'


def cell(label, body, cap="", w=400):
    return f'<div class="s6c" style="width:{w}px"><span>{label}</span>{body}{f"<p>{cap}</p>" if cap else ""}</div>'


def fld(boxhtml):
    return f'<div class="fld">{LBL}{boxhtml}{HELP}</div>'


def b5(ph, **kw):
    h = tg.box(ph=ph, cls=("p16 " if ph else "") + kw.pop("cls", ""), **kw)
    return h


def board_tag():
    W = 400
    a = ('<div class="s6p">'
         + cell("<b>Today</b> · over the cap, focused", fld(b5(False, text=OVER, n=262, mx=240, over=True, err=True, cls="s6ring", caret=True)),
                "The standard ring sits 2px outside a red edge: two outlines, two colours.")
         + cell("<b>Drawn</b> · over the cap, focused", '<div class="new">' + fld(b5(False, text=OVER, n=262, mx=240, over=True, err=True, cls="f2", caret=True)) + '</div>',
                "Focus thickens the red edge to 2px (a 1px inset ring of the same red). One edge, one colour: the box is focused and still over.")
         + cell("<b>Drawn</b> · over the cap, at rest", fld(b5(False, text=OVER, n=262, mx=240, over=True, err=True)), "1px red at rest, as shipped.")
         + '</div>')
    bb = ('<div class="s6p">'
          + cell("<b>Today</b> · header description, focused", f'<div class="ehd" style="margin:0">{b5(False, text=DESC, n=len(DESC), mx=240, warn=220, sunk=True, dashed=True, focus=True, caret=True)}</div>',
                 "The dashed edge turns accent and stays dashed.")
          + cell("<b>Drawn</b> · focused", f'<div class="ehd new" style="margin:0">{b5(False, text=DESC, n=len(DESC), mx=240, warn=220, sunk=True, dashed=True, focus=True, caret=True, cls="solid")}</div>',
                 "Focused, it goes solid accent, like the name field above it and every other box. Dashed says “you can write here” at rest; once you are in, it is a box.")
          + cell("<b>Drawn</b> · at rest (unchanged)", f'<div class="ehd" style="margin:0">{b5(False, text=DESC, n=len(DESC), mx=240, warn=220, sunk=True, dashed=True)}</div>', "Dashed <code>--border-strong</code>.")
          + '</div>')
    c = ('<div class="s6p">'
         + cell("<b>Today</b> · describing in place, at rest", fld(b5(False, text=DESC, n=len(DESC), mx=240, focus=True)) + '<div class="eacts"><span class="btno">Save</span><span class="btng">Cancel</span></div>',
                "Accent always, focused or not, so focus has no look of its own (hence today’s ring).")
         + cell("<b>Drawn</b> · at rest", '<div class="new">' + fld(b5(False, text=DESC, n=len(DESC), mx=240)) + '</div><div class="eacts"><span class="btno">Save</span><span class="btng">Cancel</span></div>',
                "<b>Focus only.</b> It opens focused, so it opens accent; press away and it rests like every other box.")
         + cell("<b>Drawn</b> · focused", fld(b5(False, text=DESC, n=len(DESC), mx=240, focus=True, caret=True)) + '<div class="eacts"><span class="btno">Save</span><span class="btng">Cancel</span></div>', "Accent edge, as everywhere.")
         + '</div>')
    meas = ('<div class="meas" style="width:400px">'
            '<div class="fld" style="gap:6px">' + LBL + b5(False, placeholder="e.g. Grind a four-player table out and win late with big fliers. No infinite combos.", n=0, mx=240) + HELP + '</div>'
            '</div>')
    d = ('<div class="s6p">'
         + cell("<b>Drawn</b> · 1300 · the ⓘ and the gaps", meas,
                "The ⓘ follows the label, 8px after it, centred on the label row (24 high). Label row to frame 6px; frame to help line 6px. The same in both description fields and in Additional notes.")
         + cell("<b>Drawn</b> · 390", '<div class="meas" style="width:358px"><div class="fld" style="gap:6px">' + LBL + b5(True, placeholder="e.g. Grind a four-player table out and win late with big fliers.", n=0, mx=240) + HELP + '</div></div>',
                "Same at 390; the ⓘ’s hit box is 44 by padding, the drawn mark stays 15.", w=358)
         + '</div>')
    hm_lab = '<div class="lr" style="min-height:28px"><label>Anything else?</label><span class="opt">optional</span>' + tg.INFO + '</div>'
    hcap = '<p class="hp"><span>Read against every commander your answers allow, and your decks’ commanders and themes. It uses a credit when you press Find commanders.</span></p>'
    lk_today = tg.box(HMC, n=len(HMC), mx=800, sunk=True, cls="s6lk").replace('class="tg"', 'class="tg hid"', 1)
    lk_drawn = tg.box(HMC, n=len(HMC), mx=800, sunk=True, cls="s6lk").replace('class="tg"', 'class="tg dis"', 1)
    e = ('<div class="s6p">'
         + cell("<b>Today</b> · intake locked (reading)", f'<div class="fld" style="gap:9px">{hm_lab}{lk_today}{hcap}</div>',
                "On main the key hides (<code>visibility:hidden</code>) and <i>tag a card</i> is left after a blank 24px. (The brief says the whole foot hides; the code hides the key.)")
         + cell("<b>Drawn</b> · intake locked", f'<div class="fld new" style="gap:9px">{hm_lab}{lk_drawn}{hcap}</div>',
                "<b>The foot stays whole.</b> The key draws disabled (below), the words and the counter stay, the edge mutes with the rest of the form. Nothing moves when the read lands.")
         + '</div>')
    keys = ('<div class="s6k">'
            '<div class="s6kk">rest<div class="tb"><div class="ft"><span class="tg">[[ ]]</span></div></div></div>'
            '<div class="s6kk">lit (a tag open)<div class="tb"><div class="ft"><span class="tg lit">[[ ]]</span></div></div></div>'
            '<div class="s6kk new" style="padding:4px">focus-visible<div class="tb"><div class="ft"><span class="tg fv">[[ ]]</span></div></div></div>'
            '<div class="s6kk new" style="padding:4px">disabled<div class="tb"><div class="ft"><span class="tg dis">[[ ]]</span></div></div></div></div>')
    f = ('<div class="s6p">'
         + cell("<b>Drawn</b> · the key’s four looks", keys,
                "<b>Focus-visible:</b> the app’s ring, 2px <code>--accent</code> 2px out, following the key’s radius. "
                "<b>Disabled</b> (a save in flight, a locked intake): edge <code>--border</code>, ink <code>--fg-locked</code>, no hover, <code>cursor:not-allowed</code>. "
                "The ring and the lit fill can show together (Tab onto it while a tag is open).", w=520)
         + '</div>')
    body = (head("item 5 · Tag a card · the states the board left out", "Six undrawn states of the tag box",
                 "Over the shipped <code>TaggedBox</code> (#2423). Desktop at 13.5px unless marked; the phone differs only in the 16px words. Dashed orange outlines mark a change against what shipped.")
            + sec("a · Focus when the frame is already red", "With (c) the accent-at-rest frame goes, so only the over-the-cap frame needs this.", a)
            + sec("b · Focus on the deck header’s dashed description", "Spine desktop and mobile, editing.", bb)
            + sec("c · Describing in place: accent always, or on focus", "<b>Call: on focus only.</b> This also retires today’s ring on it.", c)
            + sec("d · Where the ⓘ sits, and the gap to the frame", "Description fields (Analysis empty state, describing in place).", d)
            + sec("e · Help me choose, while the intake is locked", "Locked from the press until the read lands.", e)
            + sec("f · The [[ ]] key: focus-visible and disabled", "", f))
    return doc("Tag box states", body, 400 * 3 + 28 * 2 + 112 + 80)


# ================================================================ 3 · About errata
A3 = r"""
.a3 .q-gtk{display:flex;flex-direction:column;gap:14px;border:1px solid var(--border-strong);border-radius:16px;background:var(--surface-sunken);padding:14px 14px 16px}
.a3 .q-gh{display:grid;grid-template-columns:22px 1fr;column-gap:10px;row-gap:2px;align-items:center}
.a3 .q-mk2{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--accent) 16%,transparent);border:1px solid color-mix(in srgb,var(--accent) 45%,transparent)}
.a3 .q-mk2 i{width:7px;height:7px;background:var(--accent);transform:rotate(45deg);display:block}
.a3 .q-gh h3{margin:0;font:600 18px 'Cinzel',serif;color:var(--fg);letter-spacing:.01em}
.a3 .q-gh>span:last-child{grid-column:2;font-size:13px;color:var(--fg-muted)}
.a3 .q-row3{display:flex;gap:12px;overflow:hidden;margin-right:-14px}
.a3 .q-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:stretch}
.a3 .q-rc{flex:none;width:292px;display:flex;flex-direction:column;border:1px solid var(--border);border-radius:14px;background:var(--surface);overflow:hidden}
.a3 .q-grid3 .q-rc{width:auto}
.a3 .q-rc.q-on{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in oklab,var(--accent) 45%,transparent)}
.a3 .q-pl{min-height:150px;display:flex;align-items:center;justify-content:center;padding:12px;background:var(--bg);border-bottom:1px solid var(--border)}
.a3 .q-rc>p{padding:13px 14px 15px;font-size:13.5px;line-height:1.55;color:var(--fg-body);text-wrap:pretty}
.a3 .q-stk{display:flex;flex-direction:column}
.a3 .q-stk.q-c{align-items:center}
.a3 .q-dr{display:flex;align-items:center;gap:9px;border-radius:7px;border:1px solid var(--border-dashed);background:var(--surface-raised);color:var(--fg);white-space:nowrap;height:30px;padding:0 10px;font-size:12.5px;min-width:0}
.a3 .q-dr.q-cp{height:22px;padding:0 8px;font-size:11.5px}
.a3 .q-dr.q-ed{box-shadow:inset 2px 0 0 0 var(--accent)}
.a3 .q-dr.q-dm{border-style:dashed}
.a3 .q-dr .q-nm{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
.a3 .q-dr .q-od{width:8px;height:8px;border-radius:50%;background:var(--success);flex:none}
.a3 .q-dr .q-t{flex:none;font:500 10px 'IBM Plex Mono'}
.a3 .q-t.q-mu{color:var(--fg-body)}.a3 .q-t.q-ac{color:var(--accent-text)}.a3 .q-t.q-su{color:var(--success)}
.a3 .q-cap{font:500 10px 'IBM Plex Mono';letter-spacing:.04em;text-transform:uppercase;color:var(--fg-faint)}
.a3 .q-btw{display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--fg-faint)}
.a3 .q-btw b{font-weight:400;font-size:16px}
.a3 .q-btw span{font:500 10px 'IBM Plex Mono';letter-spacing:.04em}
.a3 .q-medal{width:44px;height:44px;display:block}
.a3 .q-md{display:flex;flex-direction:column;align-items:center;gap:12px}
.a3 .q-tryp{display:flex;flex-direction:column;gap:14px;border:1px solid color-mix(in oklab,var(--accent) 30%,var(--border));border-radius:16px;background:color-mix(in oklab,var(--accent) 5%,var(--surface-sunken));padding:14px 14px 16px}
.a3 .q-sp{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;border:1px solid color-mix(in srgb,var(--accent) 45%,transparent);color:var(--accent-text);font-size:12px}
.a3 .q-tc{display:flex;flex-direction:column;gap:12px;border:1px solid var(--border);border-radius:14px;background:var(--surface);padding:10px 10px 12px}
.a3 .q-tc .q-pic{position:relative;aspect-ratio:3/2;overflow:hidden;border-radius:9px;border:1px solid var(--border-strong);background:var(--bg)}
.a3 .q-tc .q-pic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.a3 .q-tc .q-bd{display:flex;flex-direction:column;gap:8px;padding:0 4px}
.a3 .q-tc .q-hd{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.a3 .q-tc h3{margin:0;font:600 16px/1.3 'IBM Plex Sans';color:var(--fg)}
.a3 .q-tc .q-cp2{flex:none;white-space:nowrap;border-radius:999px;border:1px solid var(--border-strong);padding:2px 9px;font:400 11px 'IBM Plex Mono';color:var(--fg-muted)}
.a3 .q-tc .q-ln{font-size:14px;line-height:1.5;color:var(--fg-body)}
.a3 .q-tc .q-ln.q-old{text-decoration:line-through;text-decoration-color:var(--danger);color:var(--fg-muted)}
.a3 .q-tc .q-ft{display:flex;align-items:center;gap:10px;border-top:1px solid var(--border);padding-top:8px}
.a3 .q-tc .q-ft .q-sm{font:12px 'IBM Plex Mono';color:var(--fg-muted);padding:10px 0}
.a3 .q-tc .q-ft .q-go{margin-left:auto;height:36px;display:inline-flex;align-items:center;padding:0 14px;border-radius:8px;border:1px solid var(--accent);color:var(--accent-text);font:600 13px 'IBM Plex Sans'}
.a3 .q-dots{display:flex;gap:6px;justify-content:center}
.a3 .q-dots i{width:6px;height:6px;border-radius:50%;background:var(--border-strong)}
.a3 .q-dots i.q-on{background:var(--fg-muted)}
.a3 .q-sech{display:flex;flex-direction:column;gap:4px}
.a3 .q-sech .q-k{font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.a3 .q-sech h2{margin:0;font:600 21px 'Cinzel',serif;color:var(--fg)}
.a3 .q-sech p{font-size:13.5px;color:var(--fg-muted)}
.a3.q-pg{display:flex;flex-direction:column;gap:18px;padding:18px 16px 28px}
.a3.q-dpg{display:flex;flex-direction:column;gap:22px;padding:28px 34px 36px}
.a3 .q-bb{display:flex;align-items:center;gap:10px;height:44px;font:12px 'IBM Plex Mono';color:var(--fg-muted);border-bottom:1px solid var(--border);margin:-18px -16px 0;padding:0 16px}
.a3 .q-narrow .q-dr{width:118px}
"""


def dr(name, tag=None, tone="mu", edge=False, dim=False, compact=True, dot=False):
    t = f'<span class="q-t q-{tone}">{tag}</span>' if tag else ""
    return (f'<div class="q-dr{" q-cp" if compact else ""}{" q-ed" if edge else ""}{" q-dm" if dim else ""}">'
            + ('<span class="q-od"></span>' if dot else "") + f'<span class="q-nm">{name}</span>{t}</div>')


def cap(t):
    return f'<span class="q-cap">{t}</span>'


def btw(g, label=None):
    return f'<div class="q-btw"><b>{g}</b>{f"<span>{label}</span>" if label else ""}</div>'


PICK_TEXT = ("Suggested changes keeps the deck at 99. Ask for two and you get three to add and three to cut; pick two of each. "
             "The counts have to match before Apply, and one Undo takes the whole set back.")
CREDITS_TEXT = ("Reading a bracket is free. Anything written just for you uses a credit, and a run that comes back empty-handed gives it back. An Overview uses one. "
                "So does each Suggested changes run. So does each Look deeper. A Suggested changes run that comes back short gives its credit back too, unless your limits, like a price cap, held it short.")
INTENT_TEXT = ("At either end of the scale, brackets come down to intent, so your cards can fit two. A theme deck with no Game Changers, mass land denial, extra turns or two-card infinites "
               "passes at both Exhibition and Core. Only you know which, so you pick. Game Changers are Wizards’ own list.")


def pick_diagram():
    parts = (cap("Ghalta · add 2 of 3")
             + dr("Beast Within", "picked", "ac", edge=True)
             + dr("Heroic Intervention", "picked", "ac", edge=True)
             + dr("Return of the Wildspeaker", "pick", "mu", dim=True)
             + cap("cut 2 of 3")
             + dr("Rampant Growth", "picked", "ac", edge=True)
             + dr("Kodama’s Reach", "picked", "ac", edge=True)
             + dr("Elvish Mystic", "pick", "mu", dim=True)
             + btw("↓", "apply 4 changes · stays at 99"))
    return f'<div class="q-stk" style="width:250px;gap:5px">{parts}</div>'


def credits_diagram(v2=True):
    rows = (dr("Read the bracket", "free", "su", compact=False)
            + dr("Suggested changes run", "1 credit", "ac", compact=False)
            + dr("Look deeper", "1 credit", "ac", compact=False))
    if v2:
        rows += dr("Came back short or empty", "credit back", "su", dim=True, compact=False) + dr("Short by your price cap", "1 credit", "ac", dim=True, compact=False)
    else:
        rows += dr("Came back empty-handed", "credit back", "su", dim=True, compact=False)
    return f'<div class="q-stk" style="width:250px;gap:7px">{rows}</div>'


def intent_diagram():
    return ('<div class="q-stk q-c" style="gap:12px"><div style="display:flex;gap:30px;align-items:center">'
            f'<div class="q-md">{bm(1)}<span class="q-cap">Exhibition</span></div>{btw("or")}<div class="q-md">{bm(2)}<span class="q-cap">Core</span></div></div>'
            + cap("a theme deck · no Game Changers · you pick") + '</div>')


def bm(n):
    return (f'<svg class="q-medal" viewBox="0 0 44 44" aria-hidden="true"><rect x="9" y="9" width="26" height="26" rx="4" transform="rotate(45 22 22)" fill="none" stroke="#C9AC62" stroke-width="1.5"/>'
            f'<text x="22" y="27" text-anchor="middle" font-family="Cinzel" font-size="14" font-weight="700" fill="#C9AC62">{n}</text></svg>')


def rc(diagram, text, on=False, new=False):
    return f'<article class="q-rc{" q-on" if on else ""}{" new" if new else ""}"><div class="q-pl">{diagram}</div><p>{text}</p></article>'


def gtk(cards, grid=False, dots=None):
    d = ""
    if dots:
        d = '<div class="q-dots">' + "".join(f'<i class="{"q-on" if i == dots[0] else ""}"></i>' for i in range(dots[1])) + '</div>'
    return (f'<div class="q-gtk"><div class="q-gh"><span class="q-mk2"><i></i></span><h3>Good to know</h3><span>What the screen can’t show</span></div>'
            f'<div class="{"q-grid3" if grid else "q-row3"}">{cards}</div>{d}</div>')


def toolcard(pic, line, deck="Ghalta", old=None):
    o = f'<p class="q-ln q-old">{old}</p>' if old else ""
    return (f'<article class="q-tc"><div class="q-pic"><img src="{kit.img(pic)}" alt=""></div><div class="q-bd"><div class="q-hd"><h3>Suggested changes</h3><span class="q-cp2">1 credit</span></div>'
            f'{o}<p class="q-ln{" new" if not old and line.startswith("Say") else ""}">{line}</p></div><div class="q-ft"><span class="q-sm">Show me ›</span><span class="q-go">Try it on {deck}</span></div></article>')


V2_LINE = "Say what to change. Pick from more cards to add and to cut than you need."
V1_LINE = "Up to five swaps, read from your games, your notes and the list."


def tryp(cards, grid=False):
    inner = f'<div class="q-grid3">{cards}</div>' if grid else cards
    return (f'<div class="q-tryp"><div class="q-gh"><span class="q-sp">→</span><h3>Try it</h3><span>Each card opens the tool for real</span></div>{inner}</div>')


def board_about():
    kit.LOCAL.update({"p-tool": "art/p-tool-suggested-changes.webp", "d-an": "art/d-analysis.webp"})
    cards_ph = (rc(pick_diagram(), PICK_TEXT, on=False, new=True) + rc(intent_diagram(), INTENT_TEXT))
    sech = ('<div class="q-sech"><span class="q-k">Decks · Analysis</span><h2>Analysis</h2><p>Where your deck sits, and the tools that tune it.</p></div>')
    phone_gtk = (f'<div class="ph"><div class="a3 q-pg"><div class="q-bb">‹ About · Decks</div>{sech}'
                 f'{gtk(cards_ph, dots=(0, 3))}{tryp(toolcard("p-tool", V2_LINE))}</div></div>')
    phone_credits = (f'<div class="ph"><div class="a3 q-pg"><div class="q-bb">‹ About · Decks</div>{sech}'
                     f'{gtk(rc(credits_diagram(), CREDITS_TEXT, new=True) + "", dots=(2, 3))}</div></div>')
    desk_gtk = (f'<div class="dk" style="width:1300px">{P.RAIL}<div class="main dkm"><div class="a3 q-dpg">{sech}'
                f'{gtk(rc(pick_diagram(), PICK_TEXT, new=True) + rc(intent_diagram(), INTENT_TEXT) + rc(credits_diagram(), CREDITS_TEXT, new=True), grid=True)}'
                f'{tryp(toolcard("d-an", V2_LINE) + toolcard("d-an", "Counts where a deck runs long. A deeper look names the cuts.", "Sai").replace("Suggested changes</h3><span class=\"q-cp2\">1 credit", "Proposed cuts</h3><span class=\"q-cp2\">free · look deeper 1 credit") + toolcard("d-an", "Counts every source of each color against what your spells ask for.").replace("Suggested changes</h3><span class=\"q-cp2\">1 credit", "Mana Balance</h3><span class=\"q-cp2\">free"), grid=True)}'
                f'</div></div></div>')
    # what shipped / what the handoff drew
    narrow = ('<div class="q-stk q-narrow" style="flex-direction:row;gap:12px">'
              '<div class="q-stk" style="gap:4px">' + cap("Add · 3 of 3") + dr("card", "✓", "ac", edge=True) + dr("card", "✓", "ac", edge=True) + dr("card", "pick") + '</div>'
              '<div class="q-stk" style="gap:4px">' + cap("Cut · 3 of 3") + dr("card", "✓", "ac", edge=True) + dr("card", "✓", "ac", edge=True) + dr("card", "pick") + '</div></div>')
    then = ('<div class="a3" style="display:flex;gap:28px;align-items:flex-start">'
            + frame("<b>Handoff drew</b> · the pick card’s diagram (cut short)", rc(narrow, "Two 118px columns of rows side by side, named “card”.").replace('class="q-rc"', 'class="q-rc" style="width:292px"'),
                    "Rows in side-by-side columns are what the About rules forbid (Small items 3 item 1: a row’s name gives way to its tag). The names were placeholders.")
            + frame("<b>Shipped</b> · the credits card", rc(credits_diagram(False), CREDITS_TEXT).replace('class="q-rc"', 'class="q-rc" style="width:292px"'),
                    "The sentence shipped; the two drawn rows didn’t (one was drawn at 80% opacity, also against the rules).")
            + '</div>')
    calls = tbl([
        ("a", "The pick card", "<b>One column, 250 wide, real cards</b>, built only from the shipped diagram parts (caption, compact row with edge or dashed edge, between). Ghalta asks for two: three offered a side, two picked (accent edge, <i>picked</i>), one left (dashed edge, <i>pick</i>), then ↓ <i>apply 4 changes · stays at 99</i>. "
                "The text follows the diagram: <i>Ask for two and you get three to add and three to cut; pick two of each.</i> (was three and about five; draft for copy review). First in the section’s Good to know, rule id <code>pick</code>, switch <code>SUGGESTED_CHANGES_V2_ENABLED</code>."),
        ("b", "The credits card", "Same 250 column. With v2 on, <i>Came back empty-handed</i> becomes <b>Came back short or empty</b> · credit back (dashed edge) and one row joins: <b>Short by your price cap</b> · 1 credit (dashed edge). Nothing translucent. "
                "Engineering: the old row carries <code>!SUGGESTED_CHANGES_V2_ENABLED</code>, the two new ones <code>SUGGESTED_CHANGES_V2_ENABLED</code>. The words shipped in #2438 stay."),
        ("c", "The Try it line", "With v2 on the Suggested changes card reads <b>Say what to change. Pick from more cards to add and to cut than you need.</b> (the handoff’s line, unchanged). "
                "Engineering: a tool card line gains a per-switch form (e.g. <code>lineWhen: {SUGGESTED_CHANGES_V2_ENABLED: …}</code> in <code>discovery.ts</code>), resolved like a label’s sentences. The Tuning tile’s purpose follows the same switch."),
    ])
    body = (head("item 3 · About › Decks › Analysis · Suggested changes v2 errata", "Good to know and Try it, within the About rules",
                 "Shipped #2438 built the label and the credits sentence, and left three things: the new Good to know card (its diagram broke the rules), the credits card’s two rows and the Try it line. "
                 "<b>All three redrawn here</b> with the shipped parts only. Dashed orange outlines mark what is new.")
            + sec("What went wrong", "For reference.", then)
            + sec("A · Phone", "The section’s Good to know (the new card first, the swipe row as shipped) and Try it; then the row swiped to the credits card.",
                  frames(frame("<b>390</b> · Good to know and Try it", phone_gtk), frame("<b>390</b> · swiped to the credits card", phone_credits), gap=36))
            + sec("B · Desktop", "Good to know as a grid of three from <code>xl</code>, then Try it’s row.", frames(frame("<b>1300</b> · Decks › Analysis", desk_gtk)))
            + '<div class="sec"><h3>The calls</h3>' + calls + '</div>')
    return doc("About errata", body, 1300 + 112)


# ================================================================ Main
def board_main():
    rows = tbl([
        ("1", "Overview: the Backup line", "<b>A Backup card under Close</b>, above the precon’s Alternate commander, only when the reading has a backup. Hollow diamond, its lead card’s image; not a fourth stage. Board <b>Backup</b>."),
        ("2", "Additional notes label and ⓘ", "<b>Confirm, and it already shipped.</b> a2 of small items 5 kept the label row; #2414’s description predates the fix, but it merged with the row (<code>labelRow</code>), and it is on main. The label-less box is v2’s request box, as designed. Board <b>Notes-Confirm</b>."),
        ("3", "Suggested changes v2 About errata", "<b>Redrawn within the rules:</b> the pick card as one 250 column with real cards (Ghalta, ask for two), the credits card’s rows as <i>Came back short or empty</i> and <i>Short by your price cap</i>, and the v2 Try it line behind the switch. Board <b>About-Errata</b>."),
        ("4", "Weaknesses: Critical", "<b>Draw a Critical chip</b>, red ink (5.5:1), red edge, Critical lines first. Board <b>Critical</b>."),
        ("5", "Tag box states", "(a) over the cap, focus = the red edge at 2px, not a second ring; (b) the header’s dashed frame goes solid accent on focus; (c) describing in place is accent <b>on focus only</b>; "
              "(d) ⓘ 8px after the label, 6px label row to frame; (e) locked intake keeps the whole foot, the key disabled; (f) key focus = the app ring, disabled = <code>--border</code> edge and <code>--fg-locked</code>. Board <b>Tag-States</b>."),
        ("6", "What’s new, every kind off", "<b>The ✕ sticks.</b> After it (and for a reader who turned everything off in Settings) the head gets <i>Choose what shows ›</i> and the box says <i>Nothing will show here. Every kind of news is off.</i> (draft). The offer stands only while the reader never chose. Board <b>Every-Kind-Off</b>."),
    ])
    body = (head("small items 6 · account 2 · 2026-10-30", "Six small states and errata",
                 "Each item over the shipped surface it touches, at 390 and 1300, with what shipped beside it. Dashed orange outlines mark what changes. New strings are drafts for copy review.")
            + '<div class="sec"><h3>The calls</h3>' + rows + '</div>')
    return doc("Small items 6 · the calls", body, 1300)


def with_css(css, fn):
    def run():
        old = kit.CSS
        kit.CSS = css
        try:
            return fn()
        finally:
            kit.CSS = old
    return run


BOARDS = [
    ("Main", with_css(CSS_TG, board_main), "The calls"),
    ("Backup", with_css(CSS_OV, board_backup), "1 · Overview: the Backup line"),
    ("Notes-Confirm", with_css(CSS_TG, board_notes), "2 · Additional notes: confirmed"),
    ("About-Errata", with_css(CSS_TG + A3, board_about), "3 · About: Suggested changes v2 errata"),
    ("Critical", with_css(CSS_OV, board_critical), "4 · Weaknesses: the Critical chip"),
    ("Tag-States", with_css(CSS_TG + T5, board_tag), "5 · Tag box: the undrawn states"),
]

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "local"
    kit.MODE["blob"] = mode == "blob"
    if mode == "blob":
        kit.BLOB.update(json.load(open("blobs_si6.json")))
    out = sys.argv[2] if len(sys.argv) > 2 else "out"
    os.makedirs(out, exist_ok=True)
    if mode == "local":
        shutil.copytree("art", f"{out}/art", dirs_exist_ok=True)
        shutil.copy("support.js", f"{out}/support.js")
    for nm, fn, _ in BOARDS:
        open(f"{out}/{nm}.dc.html", "w").write(fn())
        print("wrote", nm)
