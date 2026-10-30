"""Tag-a-card control everywhere (account 2, 2026-10-30): item 1 of the "three small items" round.

The control is Suggested changes v2's request box foot (design/design_handoff_the99_suggested_changes_v2/Intake.dc.html,
`.ft2`; shipped as TuningNotesField `framed`): the box is one frame, the text on top and a foot row inside it holding a
bordered `[[ ]]`, the words "tag a card" and the counter at the right. Each surface is redrawn from its shipped source:
deck-description-field.tsx and tuning-panel.tsx DescribingInPlace (a), intake-form.tsx "Anything else?" (b),
notes/note-field.tsx (c), spine-desktop.tsx / spine-mobile.tsx and game-log-form.tsx (d).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
import parts as P
import graph  # noqa: F401
import sc  # noqa: F401  (its CSS: the phone and desk shells as Suggested changes v2 drew them)
from kit import doc, frame, img

TAG = "TC"
P.LOCAL.update({"cap-describe": "art/d-analysis-describe.webp", "hero": "art/hero-aang.jpg"})
for k in ["swords", "path", "sol-ring", "aang", "appa"]:
    pass


def head(kicker, title, cap):
    return kit.board_head(kicker, title, cap, tag=TAG)


def sec(title, sp, body):
    return f'<div class="sec"><h3>{title}</h3><p class="sp">{sp}</p>{body}</div>'


def frames(*fs, gap=44):
    return f'<div class="frames" style="gap:{gap}px">{"".join(fs)}</div>'


def tbl(rows):
    return '<div class="tbl2">' + "".join(f'<div class="tr"><div>{a}</div><div>{b}</div><div>{c}</div></div>' for a, b, c in rows) + '</div>'


def note(t, b, w=400):
    return f'<div class="note" style="width:{w}px"><b>{t}</b><div style="margin-top:6px">{b}</div></div>'


def col(*items, w=400):
    return f'<div style="display:flex;flex-direction:column;gap:16px;width:{w}px">{"".join(items)}</div>'


INFO = '<span class="ii">i</span>'

kit.CSS += r"""
/* ---------- the shared control: the framed box and its foot (TuningNotesField framed) ---------- */
.tb{position:relative;display:flex;flex-direction:column;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface)}
.tb.sk{background:var(--surface-sunken)}
.tb.dash{border-style:dashed}
.tb.foc{border-color:var(--accent)}
.tb.err{border-color:var(--danger)}
.tb .tx{padding:10px 12px 4px;font:13.5px/1.5 'IBM Plex Sans';color:var(--fg);min-height:72px;white-space:pre-wrap;text-wrap:pretty}
.ph .tb .tx{font-size:15px}
.tb.p16 .tx{font-size:16px}
.ph.h1x .door{display:none}
.tb.one .tx{min-height:calc(1.5em + 12px);padding:9px 12px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tb.sm .tx{min-height:50px}
.tb .tx.pl{color:var(--fg-placeholder,#6E6654)}
.tb .tx .cr{display:inline-block;width:1.5px;height:1.15em;background:var(--accent);vertical-align:-.2em;margin-left:1px}
.tb .tx .ot{color:var(--fg);background:color-mix(in oklab,var(--accent) 16%,transparent);border-radius:3px;padding:0 1px}
.tb .ft{display:flex;align-items:center;gap:8px;padding:2px 12px 8px;font:11px 'IBM Plex Mono';color:var(--fg-faint)}
.tb .ft .tg{height:24px;display:inline-flex;align-items:center;border:1px solid var(--border-strong);border-radius:6px;padding:0 8px;font:11px 'IBM Plex Mono';color:var(--fg-muted);flex:none;position:relative}
.tb .ft .tg.lit{background:var(--elevated);color:var(--fg)}
.tb .ft .tg.hit::after{content:"";position:absolute;left:-8px;right:-8px;top:-10px;bottom:-10px;border:1px dashed var(--fact);border-radius:6px}
.tb .ft .c{margin-left:auto;font-variant-numeric:tabular-nums}
.tb .ft .c.w{color:var(--warning)}
.tb .ft .c.o{color:var(--danger)}
.tb .ii2{position:absolute;right:11px;top:9px}
.ii{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;border:1px solid var(--fg-faint);font:600 9.5px 'IBM Plex Mono';color:var(--fg-faint);flex:none}
.chg{outline:1.5px dashed var(--accent);outline-offset:4px;border-radius:10px}
/* ---------- the [[ list (CardTagList) ---------- */
.tl{position:relative;margin-top:4px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-raised);box-shadow:0 16px 40px rgba(0,0,0,.5);overflow:hidden}
.tl .gh{font:9.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);padding:9px 12px 5px}
.tl .r{display:flex;align-items:center;gap:10px;padding:6px 12px;min-height:44px}
.tl .r.on{background:var(--elevated)}
.tl .r img{width:24px;height:34px;border-radius:3px;object-fit:cover;flex:none}
.tl .r .n{font-size:13.5px;color:var(--fg-body)}.tl .r .n b{font-weight:600;color:var(--fg)}
.tl .r .ty{font:10px 'IBM Plex Mono';color:var(--fg-faint);margin-left:auto}
.tl .ks{font:10px 'IBM Plex Mono';color:var(--fg-locked);padding:7px 12px 9px;border-top:1px solid var(--border)}
/* ---------- labels and captions around the boxes ---------- */
.lr{display:flex;align-items:center;gap:8px;min-height:24px}
.lr label,.lr .lb{font:10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.lr .opt{font:9.5px 'IBM Plex Mono';letter-spacing:.06em;color:var(--fg-locked);margin-left:-2px}
.lr .old{margin-left:auto;height:24px;display:inline-flex;align-items:center;border:1px solid var(--border-strong);border-radius:6px;padding:0 8px;font:11px 'IBM Plex Mono';color:var(--fg-muted)}
.hp{display:flex;justify-content:space-between;gap:10px;font-size:12px;line-height:1.5;color:var(--fg-faint);text-wrap:pretty}
.hp .cn{font:12px 'IBM Plex Mono';flex:none;width:9ch;text-align:right}
.fld{display:flex;flex-direction:column;gap:6px}
.gone{text-decoration:line-through;text-decoration-color:var(--danger);opacity:.75}
/* ---------- analysis empty state ---------- */
.ae{display:flex;flex-direction:column;gap:8px}
.ae>h3{margin:0;font:400 10px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--fg-faint)}
.ae .in{display:flex;gap:40px;align-items:flex-start;padding:28px 24px 18px;justify-content:center}
.ph .ae .in{flex-direction:column;align-items:center;text-align:center;gap:0;padding:22px 4px 8px}
.ae .cl{display:flex;flex-direction:column;align-items:flex-start;max-width:640px;flex:1;min-width:0}
.ph .ae .cl{align-items:center;width:100%}
.ae h2{margin:0;font:700 26px/1.25 'Cinzel',serif;color:var(--fg);text-wrap:balance}
.ph .ae h2{font-size:21px;margin-top:22px}
.ae p.b{margin:12px 0 0;max-width:540px;font-size:14.5px;line-height:1.65;color:var(--fg-body);text-wrap:pretty}
.ph .ae p.b{font-size:13.5px;line-height:1.6;margin-top:11px}
.ae p.b+p.b{margin-top:10px}
.ae .fw{width:100%;max-width:540px;margin-top:16px;text-align:left}
.ph .ae .fw{margin-top:14px}
.ae .go{display:flex;align-items:center;gap:20px;margin-top:22px}
.ph .ae .go{flex-direction:column;gap:6px;width:100%;margin-top:20px}
.btnb{height:44px;display:inline-flex;align-items:center;justify-content:center;padding:0 22px;border-radius:8px;background:#EDE6D8;color:#14110E;font:600 14px 'IBM Plex Sans'}
.ph .btnb{width:100%;height:48px}
.ae .go small{font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-faint);max-width:330px}
.ae .lk{margin-top:18px;font:11px 'IBM Plex Mono';color:var(--accent);border-bottom:1px solid var(--accent-shadow)}
.ring{width:150px;height:130px;flex:none}
.ph .ring{width:130px;height:112px}
.btno{height:36px;display:inline-flex;align-items:center;padding:0 14px;border-radius:7px;font:600 12.5px 'IBM Plex Sans';border:1px solid var(--accent);color:var(--accent-text)}
.btng{height:36px;display:inline-flex;align-items:center;padding:0 14px;border-radius:7px;font:500 12.5px 'IBM Plex Sans';border:1px solid var(--border-strong);color:var(--fg-muted)}
/* ---------- tuning panel's description row ---------- */
.tp{display:flex;flex-direction:column;gap:12px}
.tp .mr{display:flex;align-items:baseline;gap:10px;font-size:13px;color:var(--fg-body)}
.tp .mr .k{font:10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);width:150px;flex:none}
.ph .tp .mr .k{width:120px}
/* ---------- Help me choose ---------- */
.hm{display:flex;flex-direction:column;gap:9px}
.hm .ta .tx{min-height:84px;padding:12px 14px 4px;font-size:14px;line-height:1.55}
.ph .hm .ta .tx{min-height:96px;font-size:15px}
.hm .cap{display:flex;justify-content:space-between;gap:12px;font-size:12px;line-height:1.5;color:var(--fg-faint);text-wrap:pretty}
.hm .cap .cn{font:10px 'IBM Plex Mono';flex:none}
.hm hr{border:0;border-top:1px solid var(--border);margin:0 0 12px}
.hm .prs{display:flex;align-items:center;gap:18px;padding-top:20px;margin-top:10px;border-top:1px solid var(--border)}
.hm .prs small{font:10.5px/1.5 'IBM Plex Mono';color:var(--fg-faint);max-width:380px}
.btnp{height:44px;display:inline-flex;align-items:center;padding:0 20px;border-radius:8px;background:#EDE6D8;color:#14110E;font:600 14px 'IBM Plex Sans'}
.ihd{display:flex;flex-direction:column;gap:6px;margin-bottom:6px}
.ihd h2{margin:0;font:700 22px 'Cinzel',serif}
.ihd p{font-size:13.5px;line-height:1.55;color:var(--fg-muted)}
.brk{display:flex;gap:6px;flex-wrap:wrap}
.brk span{height:36px;display:inline-flex;align-items:center;padding:0 12px;border:1px solid var(--border-strong);border-radius:8px;font-size:12.5px;color:var(--fg-muted)}
.brk span.on{border-color:var(--accent);color:var(--fg);background:color-mix(in oklab,var(--accent) 10%,transparent)}
/* ---------- deck notes ---------- */
.seg{display:flex;align-items:center;border:1px solid var(--border-strong);border-radius:12px;padding:4px;gap:2px;align-self:flex-start}
.ph .seg{align-self:stretch}
.seg span{height:36px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;border-radius:8px;font-size:13.5px;color:var(--fg-muted)}
.ph .seg span{flex:1;justify-content:center;padding:0 6px;height:40px}
.seg span em{font-style:normal;font:12px 'IBM Plex Mono';color:var(--fg-faint)}
.seg span.on{background:var(--elevated);color:var(--fg);font-weight:600}
.seg span.sh{color:var(--warning)}
.seg i{width:1px;height:22px;background:var(--border-strong);margin:0 4px}
.nh{display:flex;align-items:baseline;gap:10px}
.nh h3{margin:0;font:700 18px 'Cinzel',serif}
.nh small{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
.na{display:flex;gap:8px;align-items:flex-start}
.ph .na{flex-direction:column;align-items:stretch}
.na .tb{flex:1;min-width:0}
.na .bt{display:flex;gap:8px;justify-content:flex-end;align-items:center}
.btnadd{height:40px;min-width:0;display:inline-flex;align-items:center;justify-content:center;padding:0 16px;border-radius:8px;background:#EDE6D8;color:#14110E;font:600 13px 'IBM Plex Sans'}
.btnadd.dis{opacity:.4}
.ph .btnadd{height:48px;min-width:104px;font-size:14px}
.btncx{height:40px;display:inline-flex;align-items:center;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);font-size:13px;color:var(--fg-muted)}
.ph .btncx{height:48px;font-size:14px}
.oldtg{height:40px;width:44px;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--border-strong);border-radius:8px;font:12px 'IBM Plex Mono';color:var(--fg-muted)}
.ph .oldtg{height:48px;width:56px}
.oldc{font:10px 'IBM Plex Mono';color:var(--fg-locked);width:68px;text-align:right}
.ph .oldc{width:auto;margin-right:auto}
.nl{display:flex;flex-direction:column}
.nl .nr{display:flex;align-items:center;gap:12px;padding:11px 4px;border-top:1px solid var(--border);font-size:13.5px;color:var(--fg-body)}
.nl .nr .bx{width:18px;height:18px;border:1.5px solid var(--border-strong);border-radius:4px;flex:none}
.nl .nr .dt{margin-left:auto;font:10.5px 'IBM Plex Mono';color:var(--fg-faint);flex:none}
.nl .nr .t{border-bottom:1px solid var(--fg-faint);color:var(--fg)}
.nl .nr.ed{display:block;padding:10px 0}
.hint{font:10.5px 'IBM Plex Mono';color:var(--fg-faint)}
/* ---------- deck page header, editing ---------- */
.ehd{display:flex;flex-direction:column;gap:6px;width:100%;max-width:560px;margin:-2px 0 -2px -11px}
.ehd .nm{height:29px;border-radius:8px;background:var(--surface-sunken);border:1px solid var(--accent);padding:1px 10px;font:700 21px/1.2 'Cinzel',serif;color:var(--fg);white-space:nowrap;overflow:hidden}
.ph .ehd{margin:0;max-width:none}
.ph .ehd .nm{height:36px;font-size:20px;padding:4px 12px;line-height:26px}
.ehd .tb .tx{min-height:0;padding:6px 10px 2px;font-size:13.5px;line-height:1.45}
.ph .ehd .tb .tx{font-size:15px;padding:8px 12px 2px}
.ehd .tb .ft{padding:2px 10px 7px}
.eacts{display:flex;gap:8px;align-items:center}
.eacts .sv{height:32px;display:inline-flex;align-items:center;padding:0 14px;border-radius:7px;background:#EDE6D8;color:#14110E;font:600 12.5px 'IBM Plex Sans'}
.eacts .cx{height:32px;display:inline-flex;align-items:center;padding:0 14px;border-radius:7px;border:1px solid var(--border-strong);color:var(--fg-muted);font-size:12.5px}
.ph .eacts .sv,.ph .eacts .cx{height:44px;flex:1;justify-content:center;font-size:14px}
/* ---------- game log ---------- */
.gl{display:flex;flex-direction:column}
.gl .mk{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ph .gl .mk{grid-template-columns:1fr}
.gl .mk .c h4{margin:0 0 8px;font:600 13px 'IBM Plex Sans';color:var(--fg)}
.gl .mk .c span{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--fg-body);padding:6px 0}
.gl .mk .c span i{width:16px;height:16px;border:1.5px solid var(--border-strong);border-radius:4px}
.gl .nf{margin-top:18px;padding-top:16px;border-top:1px solid var(--accent)}
.gl .nf .l{display:flex;align-items:baseline;gap:8px;margin-bottom:9px}
.gl .nf .l label{font:10px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--accent-text)}
.gl .nf .l .h{font:10px 'IBM Plex Mono';color:var(--fg-locked)}
.gl .nf .l .c{margin-left:auto;font:10px 'IBM Plex Mono';color:var(--fg-locked)}
.gl .nf .rb{margin-top:8px;font:10px/1.5 'IBM Plex Mono';color:var(--fg-faint)}
.gl .nf .rb em{font-style:normal;color:var(--fg-body)}
.gl .bts{display:flex;gap:16px;align-items:center;margin-top:20px;padding-top:18px;border-top:1px solid var(--border)}
.ph .gl .bts{flex-direction:column;align-items:stretch;gap:9px}
.gl .bts .s{height:44px;display:inline-flex;align-items:center;justify-content:center;padding:0 20px;border-radius:8px;background:#EDE6D8;color:#14110E;font:600 14px 'IBM Plex Sans'}
.gl .bts .x{height:44px;display:inline-flex;align-items:center;justify-content:center;padding:0 18px;border-radius:8px;border:1px solid var(--border-strong);color:var(--fg-muted);font-size:13.5px}
.gl .old input{display:block}
.oneline{height:46px;display:flex;align-items:center;padding:0 14px;border-radius:8px;background:var(--surface-sunken);border:1px solid var(--border-strong);font-size:13.5px;color:var(--fg)}
.ph .oneline{height:48px;font-size:15px}
.cap2{width:0;min-width:100%}
.shot{border:1px solid var(--border-strong);border-radius:12px;overflow:hidden;display:block}
.shot img{display:block}
.anat{display:flex;flex-direction:column;gap:12px;width:560px}
.anat .ln{display:grid;grid-template-columns:160px 1fr;gap:12px;font-size:12.5px;line-height:1.55;color:var(--fg-body)}
.anat .ln b{font:600 11px 'IBM Plex Mono';color:var(--accent);letter-spacing:.04em}
.st{display:flex;flex-direction:column;gap:8px;width:400px}
.st>span{font:10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint)}
.sec .tbl2 .tr{grid-template-columns:44px 260px minmax(0,1fr)}
"""

RING = ('<svg class="ring" viewBox="0 0 150 130" aria-hidden="true" fill="none" stroke-width="1.4">'
        '<g stroke="#EDE6D8"><rect x="12" y="46" width="36" height="36" transform="rotate(45 30 64)"/><rect x="17" y="51" width="26" height="26" transform="rotate(45 30 64)"/></g>'
        '<text x="30" y="69" fill="#EDE6D8" font-family="Cinzel" font-size="14" text-anchor="middle">5</text>'
        '<g stroke="#A59C89"><rect x="62" y="10" width="26" height="26" transform="rotate(45 75 23)"/></g><text x="75" y="27" fill="#A59C89" font-family="Cinzel" font-size="11" text-anchor="middle">1</text>'
        '<g stroke="#C9AC62"><rect x="110" y="48" width="26" height="26" transform="rotate(45 123 61)"/><rect x="47" y="90" width="26" height="26" transform="rotate(45 60 103)"/><rect x="92" y="90" width="26" height="26" transform="rotate(45 105 103)"/></g>'
        '<g fill="#C9AC62" font-family="Cinzel" font-size="11" text-anchor="middle"><text x="123" y="65">2</text><text x="60" y="107">4</text><text x="105" y="107">3</text></g></svg>')


# ================================================================ the shared box
def box(text="", ph=False, n=0, mx=240, warn=None, over=False, lit=False, focus=False, sunk=False, dashed=False,
        placeholder=None, help_="tag a card", one=False, cls="", caret=False, hit=False, err=False, extra=""):
    if text:
        t = text + ('<span class="cr"></span>' if caret else "")
        tx = f'<div class="tx">{t}</div>'
    else:
        tx = f'<div class="tx pl">{"<span class=cr></span>" if caret else ""}{placeholder or ""}</div>'
    c = "c" + (" o" if over else (" w" if warn and n >= warn else ""))
    k = "tb" + (" sk" if sunk else "") + (" dash" if dashed else "") + (" foc" if focus else "") + (" one" if one else "") + (" err" if err else "") + (" " + cls if cls else "")
    tg = f'<span class="tg{" lit" if lit else ""}{" hit" if hit else ""}">[[ ]]</span>'
    hw = f'<span>{help_}</span>' if help_ else ""
    return f'<div class="{k}">{tx}{extra}<div class="ft">{tg}{hw}<span class="{c}">{n} / {mx}</span></div></div>'


def taglist(rows, any_=None, w=None):
    st = f' style="width:{w}px"' if w else ""
    def r(im, nm, typed, ty, on=False):
        return f'<div class="r{" on" if on else ""}"><img src="{img(im)}" alt=""><span class="n"><b>{nm[:len(typed)]}</b>{nm[len(typed):]}</span><span class="ty">{ty}</span></div>'
    body = '<div class="gh">In this deck</div>' + "".join(r(*x) for x in rows)
    if any_:
        body += '<div class="gh">Any card</div>' + "".join(r(*x) for x in any_)
    return f'<div class="tl"{st}>{body}<div class="ks">↑ ↓ to move · Enter picks · Esc keeps what you typed</div></div>'


def ph_frame(body, cut, nav=False):
    return P.phone(f'<div class="at">{body}</div>', head=False, cut=cut, nav=nav)


def dk_frame(body, cut, w=None):
    f = P.desk(f'<div class="at">{body}</div>', head=False, cut=cut)
    if w:
        f = f.replace('<div class="dk">', f'<div class="dk" style="width:{w}px">', 1)
    return f


for k in ["swords", "path", "aang-swift-savior", "appa-loyal", "avatar-aang"]:
    P.LOCAL[f"c-{k}"] = f"art/c-{k}.jpg"

SW = [("c-swords", "Swords to Plowshares", "Swo", "Instant", True)]
SWANY = [("c-path", "Sword of Feast and Famine", "Swo", "Artifact · not in this deck")]
DESC = "Bend all four elements in one turn and flip Aang. Allies go wide first; no infinite combos."
DESC_TAG = "Bend all four elements in one turn and flip Aang. Protect him with Swords to Plowshares."


# ================================================================ 0 · The calls
def board_main():
    rows = tbl([
        ("1", "One tag-a-card control", "Every box that takes a <code>[[</code> tag draws Suggested changes v2’s request box: <b>one frame, the words on top, a foot row inside it</b> with a bordered "
              "<b>[[ ]]</b>, the words <b>tag a card</b> and the counter at the right. It replaces the label-row button (a), the 28px header button (b), the larger action-row button "
              "(c), and is added where there is none (d). The counter always shows. Each field keeps its own <b>ⓘ</b>, label, help line and buttons. Boards <b>Tag-Control</b> and <b>Tag-Places</b>."),
        ("1c", "Deck notes: which control wins", "<b>The foot row wins, over both.</b> The deck notes handoff (R4) drew <code>[[ ]]</code> as a 40×40 key beside Add (48 on a phone); what shipped put "
               "a counter, a 44×40 key, Cancel and Add in one action row. Both go. The note keeps one line of text with the foot inside its frame; the action row holds only Cancel and Add. "
               "The deck notes handoff gets an erratum pointing here. One thing carries over from R4: the key is <b>lit</b> while a tag is open, now in every box."),
        ("1d", "A correction", "The game-log note already has a counter (in its label row, drawn only once the field is focused). It moves into the foot and always shows. The deck page description has neither today."),
        ("2", "Precon page header art", "<b>Yes, the precon page follows: 64×89 on a phone, 84×117 from md.</b> The early list’s address sends the reader to the precon page when the release list lands, "
              "so the same box would shrink at the moment it becomes startable. One head, one size. Commander pairs sit side by side at the same size. Board <b>Header-Art</b>."),
        ("3", "First-run offer, What’s new empty", "<b>The box draws the shipped quiet line, then the offer line under it, the same line as under rows.</b> The three announcement kinds and spare requests are on from the start, "
              "so “Nothing new right now. You hear about …” is true. Pick ▾ opens the boxes in place; ✕ saves an empty pick. The full opt-in panel goes. Board <b>Offer-Empty</b>."),
    ])
    body = (head("three small items · account 2 · 2026-10-30", "Tag a card, precon art, the empty offer",
                 "Three small items, each drawn over the shipped surface it changes, at 390 and 1300. Dashed orange outlines mark what is new against what shipped; "
                 "frames labelled <i>Today</i> are the shipped page, for comparison. Strings marked as drafts are for /copy-review.")
            + '<div class="sec"><h3>The calls</h3>' + rows + '</div>')
    return doc("Three small items · the calls", body, 1300)


# ================================================================ 1 · the control
def board_control():
    def st(label, b, w=400):
        return f'<div class="st" style="width:{w}px"><span>{label}</span>{b}</div>'
    dk_states = "".join([
        st("1 · rest, empty", box(placeholder="In your own words, or leave it empty.", n=0, mx=500)),
        st("2 · typing", box("More removal, and lean into the counters.", n=41, mx=500, focus=True, caret=True)),
        st("3 · a tag open: the key is lit", box('More removal, like <span class="ot">[[Swo</span>', n=22, mx=500, focus=True, caret=True, lit=True)
           + taglist([("c-swords", "Swords to Plowshares", "Swo", "Instant", True)])),
        st("4 · near the cap (warn from each box’s own mark)", box("Grind a four-player table out and win late with big fliers; keep Swords to Plowshares and Path to Exile for the scary turns. No infinite combos, nothing over $20 a card please.", n=226, mx=240, warn=220, focus=True)),
        st("5 · over the cap (pasted in)", box("Grind a four-player table out and win late with big fliers; keep Swords to Plowshares and Path to Exile for the scary turns. No infinite combos, nothing over $20 a card, and no more than two tutors in the whole list.", n=262, mx=240, over=True, err=True)),
    ])
    ph_states = "".join([
        st("390 · rest", box(cls="p16", ph=True, placeholder="In your own words, or leave it empty.", n=0, mx=500), 358),
        st("390 · coarse pointer: the key’s hit box", box(cls="p16", ph=True, placeholder="In your own words, or leave it empty.", n=0, mx=500, hit=True), 358),
    ])
    anat = ('<div class="anat">'
            '<div class="ln"><b>Frame</b><span>One 1px <code>--border-strong</code> frame, radius 9, the field’s own fill (<code>--surface</code>, or <code>--surface-sunken</code> where the field '
            'is sunken today). <code>--accent</code> on focus-within; <code>--danger</code> where the field already turns red on a refusal. Dashed stays dashed on the deck page header.</span></div>'
            '<div class="ln"><b>Words</b><span>The textarea or input with no border of its own: padding 10 12 4. Grows with its content where it grows today.</span></div>'
            '<div class="ln"><b>Foot</b><span>Inside the frame: padding 2 12 8, gap 8, mono 11 <code>--fg-faint</code>. <b>[[ ]]</b> 24 high, radius 6, 1px <code>--border-strong</code>, '
            'padding 0 8, <code>--fg-muted</code>; then <b>tag a card</b> (aria-hidden: the key’s own label is “Insert a card tag”); then the counter, <code>margin-left:auto</code>, tabular.</span></div>'
            '<div class="ln"><b>The key</b><span>Writes <code>[[]]</code> at the caret, caret between, opens the list; keeps the field’s focus (mousedown prevented), so a phone keyboard stays up. '
            '<b>Lit</b> (<code>--elevated</code>, <code>--fg</code>) while the caret is inside an open tag (from deck notes R4).</span></div>'
            '<div class="ln"><b>Counter</b><span>Always drawn, from <code>0 / N</code>. Each box keeps its own cap and warn mark (description 240, warn 220; notes 140, warn 120; game note 140, warn 130; '
            'Anything else? 800). <code>--warning</code> from the mark; <code>--danger</code> over the cap where a paste can exceed it.</span></div>'
            '<div class="ln"><b>Coarse pointer</b><span>The key stays drawn at 24 high; its hit box grows to 44 high by padding (dashed in frame 390 · coarse). Today’s framed box grows the drawn key to 44, '
            'which makes the foot as tall as the field: that is the one change to the shipped TuningNotesField.</span></div>'
            '<div class="ln"><b>The ⓘ</b><span>Stays where each field has it today, beside the label (or inside a one-line field’s right edge). Its lines differ per box (a tag is a requirement in '
            'Help me choose, a link in notes), so it is not the same thing as the key.</span></div></div>')
    body = (head("item 1 · the control", "One way to tag a card",
                 "Adopted as drawn in Suggested changes v2’s request box (<code>Intake.dc.html</code>, <code>.ft2</code>), shipped as <code>TuningNotesField framed</code>. "
                 "Lift its foot into a shared piece (for example <code>TaggedBox</code> around <code>useTaggedField</code>) and every box below draws it.")
            + sec("States", "Desktop at 13.5px. The list is the shipped <code>CardTagList</code>, unchanged.",
                  frames(f'<div style="display:flex;flex-wrap:wrap;gap:28px 32px;width:1300px">{dk_states}</div>'))
            + sec("Phone, and the anatomy", "At 390 the words are 16px (no iOS zoom), the foot is the same.",
                  frames(f'<div style="display:flex;flex-direction:column;gap:28px">{ph_states}</div>', anat, gap=60)))
    return doc("Tag control", body, 1412)


# ================================================================ 1 · the five places
def a_empty(ph=False, today=False):
    fld = (f'<div class="fld"><div class="lr"><label>Describe your deck</label>{INFO}</div>'
           + f'<div class="chg">{box(ph=ph, placeholder="e.g. Grind a four-player table out and win late with big fliers." if ph else "e.g. Grind a four-player table out and win late with big fliers. No infinite combos.", n=0, mx=240)}</div>'
           + '<p class="hp"><span>One or two sentences that will help us suggest more accurate card swaps.</span></p></div>')
    cl = ('<div class="cl"><h2>Five brackets. Your cards pick which.</h2>'
          '<p class="b">One pass over your list against the Commander Format Panel’s rules, and we’ll tell you which brackets your cards permit, and which cards put it there.</p>'
          '<p class="b">The reading is kept with the deck. Edit the list and it waits for you to ask again.</p>'
          f'<div class="fw">{fld}</div>'
          '<div class="go"><span class="btnb">Analyze</span><small>Also writes the overview, using a credit. 5 of 5 left.</small></div>'
          '<span class="lk">How we make these decisions →</span></div>')
    return f'<section class="ae"><h3>Overview</h3><div class="in">{RING}{cl}</div></section>'


def a_place(ph=False):
    ed = (f'<div class="fld"><div class="lr"><label>Describe your deck</label>{INFO}</div>'
          f'<div class="chg">{box(DESC, ph=ph, n=len(DESC), mx=240, focus=True, caret=True)}</div>'
          '<p class="hp"><span>One or two sentences that will help us suggest more accurate card swaps.</span></p>'
          '<div class="eacts" style="justify-content:flex-start"><span class="btno">Save</span><span class="btng">Cancel</span></div></div>')
    return ('<div class="tp"><div class="mr"><span class="k">Your description</span><span>none yet</span></div>' + ed + '</div>')


def b_hmc(ph=False, text=""):
    n = len(text)
    ta = box(text, ph=ph, n=n, mx=800, sunk=True, cls="ta" + (" foc" if text else ""),
             placeholder="e.g. something scary and a little nasty, or a Landfall deck unlike the ones I’ve built", caret=bool(text))
    cap = ("Read against every commander your answers allow, and your decks’ commanders and themes. It uses a credit when you press Find commanders." if text else
           "Describe the deck in your own words: how it should feel, or how it should differ from decks you’ve built. Leave it empty and the answers above search on their own, for free.")
    return ('<div class="hm"><hr>'
            f'<div class="fld" style="gap:9px"><div class="lr" style="min-height:28px"><label>Anything else?</label><span class="opt">optional</span>{INFO}</div>'
            f'<div class="chg">{ta}</div><p class="hp"><span>{cap}</span></p></div>'
            + ('' if ph else '<div class="prs"><span class="btnp">Find commanders</span><small>Uses a credit. 4 of 5 left · next one at 14:20.</small></div>')
            + '</div>')


NOTES = [("Try <span class=t>Appa, Loyal Sky Bison</span> over the second flier", "Oct 26"),
         ("Is <span class=t>Swords to Plowshares</span> worth it at 2?", "Oct 24")]


def c_notes(ph=False, edit=False, text=""):
    seg = ('<div class="seg"><span>All <em>99</em></span><span class="sh">Shopping <em>2</em></span><i></i><span>Stats</span><span class="on">Notes <em>2</em></span></div>')
    hd = '<div class="nh"><h3>Notes</h3><small>2 open · newest first</small></div>'
    ph_ = "Add a note" if ph else "Add a note"
    field = box(text, ph=ph, n=len(text), mx=140, warn=120, one=True, sunk=True, cls="", placeholder=ph_, caret=bool(text), focus=bool(text),
                extra=f'<span class="ii ii2">i</span>')
    add = ('<div class="na"><div class="chg" style="flex:1;min-width:0">' + field + '</div>'
           f'<div class="bt"><span class="btnadd{"" if text else " dis"}">Add</span></div></div>')
    rows = "".join(f'<div class="nr"><span class="bx"></span><span>{t}</span><span class="dt">{d}</span></div>' for t, d in NOTES)
    if edit:
        et = "Is Swords to Plowshares worth it at 2?"
        ef = box(et + " Or Path", ph=ph, n=len(et) + 8, mx=140, warn=120, one=True, sunk=True, focus=True, caret=True, extra='<span class="ii ii2">i</span>')
        er = (f'<div class="nr ed"><div class="na"><div class="chg" style="flex:1;min-width:0">{ef}</div>'
              '<div class="bt"><span class="btncx">Cancel</span><span class="btnadd">Save</span></div></div>'
              + ('' if ph else '<p class="hint" style="margin-top:8px">Enter saves · Esc cancels · the date stays Oct 24</p>') + '</div>')
        rows = f'<div class="nr"><span class="bx"></span><span>{NOTES[0][0]}</span><span class="dt">{NOTES[0][1]}</span></div>' + er
    hint = '' if ph else '<p class="hint">Enter adds · dated Oct 30</p>'
    return f'<div style="display:flex;flex-direction:column;gap:14px">{seg}{hd}<div style="display:flex;flex-direction:column;gap:8px">{add}{hint}</div><div class="nl">{rows}</div></div>'


def c_notes_today(ph=False):
    inp = ('<div class="tb sk one" style="flex:1;min-width:0"><div class="tx pl" style="padding:9px 12px">Add a note. Type [[ to tag a card.</div><span class="ii ii2" style="top:11px">i</span></div>')
    if ph:
        return ('<div class="na">' + inp + '<div class="bt"><span class="oldc">0 / 140</span><span class="oldtg">[[ ]]</span><span class="btnadd dis">Add</span></div></div>')
    return ('<div class="na">' + inp + '<div class="bt"><span class="oldtg">[[ ]]</span><span class="oldc">0 / 140</span><span class="btnadd dis">Add</span></div></div>')


def d_header(ph=False):
    ed = (f'<div class="ehd"><div class="nm">HD - Avatar Aang</div>'
          f'<div class="chg">{box(DESC_TAG, ph=ph, n=len(DESC_TAG), mx=240, warn=220, sunk=True, dashed=True)}</div></div>')
    return ed


def d_head_phone():
    h = P.ph_head()
    i = h.find("<h1>")
    j = h.find("</h1>", i) + 5
    k = h.find('<div class="meta">')
    h = h[:i] + d_header(True) + h[j:]
    acts = '<div class="eacts" style="padding:12px 16px 0"><span class="sv">Save</span><span class="cx">Cancel</span></div>'
    h = h.replace('<div class="acts">', acts + '<div class="acts" style="display:none">', 1)
    return h


def d_head_desk():
    h = P.dk_head()
    i = h.find("<h1>")
    j = h.find("</h1>", i) + 5
    h = h[:i] + d_header(False) + h[j:]
    h = h.replace('<div class="acol"><span class="db">Update from a list</span><span class="db p">Export</span></div>',
                  '<div class="acol"><span class="db p">Save</span><span class="db">Cancel</span></div>', 1)
    return h


def d_log(ph=False, today=False, text="", lit=False):
    marks = ('<div class="mk"><div class="c"><h4 style="color:var(--success)">What worked</h4><span><i></i>Speed · got going fast</span><span><i></i>Cards in hand · kept drawing</span><span><i></i>Mana · hit every land drop</span></div>'
             '<div class="c"><h4 style="color:var(--warning)">What let me down</h4><span><i></i>Speed · started too slow</span><span><i></i>Cards in hand · ran out of gas</span><span><i></i>Mana · screwed or flooded</span></div></div>')
    hint = "optional" if ph else "one line, in your words"
    if today:
        fld = '<div class="oneline" style="color:var(--fg-placeholder,#6E6654)"></div>'
        lab = f'<div class="l"><label>Note</label><span class="h">{hint}</span></div>'
    else:
        fld = '<div class="chg">' + box(text, ph=ph, n=len(text.replace('<span class="ot">', '').replace('</span>', '')), mx=140, warn=130, one=True, sunk=True, focus=bool(text), caret=bool(text), lit=lit) + '</div>' + (taglist([("c-swords", "Swords to Plowshares", "Swo", "Instant", True)]) if lit else "")
        lab = f'<div class="l"><label>Note</label><span class="h">{hint}</span></div>'
    rb = '' if ph else '<p class="rb">Read back to you in the history, and read by Suggested changes: <em>quoted, never paraphrased</em></p>'
    return (f'<div class="gl">{marks}<div class="nf">{lab}{fld}{rb}</div>'
            '<div class="bts"><span class="s">Save game</span><span class="x">Cancel</span></div></div>')


def e_notes(ph=False, text=""):
    return (f'<div class="fld"><div class="lr"><label>Additional notes</label>{INFO}</div>'
            f'<div class="chg">{box(text, ph=ph, n=len(text), mx=500, focus=bool(text), caret=bool(text), placeholder=("Anything for this run? e.g. more removal" if ph else "Anything for this run? e.g. more removal, swap out Sol Ring, nothing over $5"))}</div></div>')


def board_places():
    shot = f'<div class="shot" style="width:640px;height:270px"><img src="{img("cap-describe")}" alt="" style="width:1300px;margin:-80px 0 0 -420px"></div>'
    a = (sec("a · The deck description fields",
             "Analysis tab, empty state (<code>DeckDescriptionField</code>) and Suggested changes’ <i>Describing in place</i> row (<code>DescribingInPlace</code>). "
             "The <b>[[ ]]</b> leaves the label row; the counter leaves the help line, which keeps its words. Blur still saves the empty state’s field; the in-place editor keeps Save and Cancel.",
             frames(frame("<b>390</b> · Analysis, empty state", ph_frame(a_empty(True), "Analysis tab · Overview, not read yet")),
                    frame("<b>1300</b> · Analysis, empty state", dk_frame(a_empty(), "Analysis tab · Overview, not read yet", w=1020)), gap=36)
             + frames(frame("<b>Today</b> · 1300, Hugh’s capture", shot, "The key in the label row, the counter at the end of the help line."),
                      frame("<b>390</b> · describing in place", ph_frame(a_place(True), "Analysis tab · Tuning · Suggested changes", nav=False)),
                      frame("<b>1300</b> · describing in place", dk_frame(a_place(), "Analysis tab · Tuning · Suggested changes", w=760)), gap=36)))
    e = (sec("a2 · Suggested changes: Additional notes (PR #2414)",
             "<b>The label and its ⓘ stay</b>, in the shipped label row (mono caps <i>Additional notes</i>, then the tip with its three lines), over the framed box. "
             "The Intake board drew no label because step 2’s heading names that box; Additional notes has no heading, and a placeholder is not a name: it leaves as soon as the player types. "
             "The textarea is named by the visible label (<code>htmlFor</code>) and described by the tip, as shipped before the frame. "
             "The row loses only its <b>[[ ]]</b>; the counter under the box goes, now in the foot. Esc still clears the draft (the tip takes it first when open).",
             frames(frame("<b>390</b> · empty", ph_frame(e_notes(True), "Analysis tab · Tuning · Suggested changes")),
                    frame("<b>390</b> · written", ph_frame(e_notes(True, "More removal, and keep Swords to Plowshares"), "Analysis tab · Tuning · Suggested changes")),
                    frame("<b>1300</b> · empty", dk_frame(e_notes(False), "Analysis tab · Tuning · Suggested changes", w=820)), gap=36)))
    b = (sec("b · Help me choose: Anything else?",
             "The 28px <b>[[ ]]</b> leaves the field header (the ⓘ and <i>optional</i> stay). The counter, today drawn under the box only once there are words, moves into the foot and always shows. "
             "The box stays sunken and turns accent while its words will be read, as shipped.",
             frames(frame("<b>390</b> · empty", ph_frame(b_hmc(True), "Help me choose · the answers")),
                    frame("<b>390</b> · written", ph_frame(b_hmc(True, "Something scary and a little nasty that still runs Swords to Plowshares"), "Help me choose · the answers")),
                    frame("<b>1300</b> · written", dk_frame(b_hmc(False, "Something scary and a little nasty that still runs Swords to Plowshares"), "Help me choose · the answers", w=820)), gap=36)))
    c = (sec("c · Deck notes",
             "<b>The foot row wins over both the shipped action row and the deck notes handoff’s key.</b> The note is still one line (Enter adds, whitespace folds); the foot sits under it inside the frame, "
             "the ⓘ stays at the line’s right edge. The action row is only <b>Add</b> (and <b>Cancel</b> in edit). The placeholder drops “Type [[ to tag a card.”: the foot says it.",
             frames(frame("<b>Today</b> · 390", f'<div class="ph d4n" style="display:block;width:390px;height:auto;padding:16px;border-radius:16px">{c_notes_today(True)}</div>',
                          "Counter, a 56×48 key and Add on the line under the field."),
                    frame("<b>Today</b> · 1300", f'<div class="ph d4n" style="display:block;width:820px;height:auto;padding:16px;border-radius:16px">{c_notes_today()}</div>',
                          "One row: field, 44×40 key, the counter, Add. The R4 handoff drew the key beside Add without the counter."), gap=36)
             + frames(frame("<b>390</b> · adding", ph_frame(c_notes(True, text="Try Appa over the second flier"), "Your deck · Notes")),
                      frame("<b>390</b> · editing", ph_frame(c_notes(True, edit=True), "Your deck · Notes")),
                      frame("<b>1300</b> · editing the second note", dk_frame(c_notes(False, edit=True), "Your deck · Notes", w=900)), gap=36)))
    d = (sec("d · The deck page description and the game-log note",
             "Both type <code>[[</code> today with no key. The deck page header’s dashed description box gains the foot (its counter is new: the same 240 as everywhere else the description is written). "
             "The game-log note’s counter moves from its label row into the foot and stops waiting for focus.",
             frames(frame("<b>390</b> · deck page, editing name and description", P.phone(d_head_phone(), head=False, nav=False).replace('<div class="mhd">', '<div class="mhd">', 1).replace('<div class="ph">', '<div class="ph">' + P.ph_top(), 1) if False else
                          f'<div class="ph h1x">{d_head_phone()}</div>'),
                    frame("<b>1300</b> · deck page, editing", P.desk(d_head_desk() + '<div style="height:24px"></div>', head=False).replace('<div class="dk">', '<div class="dk" style="width:1100px">', 1),
                          "Save and Cancel take the header’s action column while editing, as shipped."), gap=36)
             + frames(frame("<b>Today</b> · game-log note, 390", ph_frame(d_log(True, today=True), "Games · Log a game"),
                            "At rest: no counter. It joins the label row once the field is focused."),
                      frame("<b>390</b> · game-log note", ph_frame(d_log(True, text='Gisa ran away with it. Needed <span class="ot">[[Swo</span>', lit=True), "Games · Log a game"),
                            "A tag open: the key is lit and the shipped list floats under the field."),
                      frame("<b>1300</b> · game-log note", dk_frame(d_log(False), "Games · Log a game", w=860)), gap=36)))
    body = (head("item 1 · the five places", "Every box that tags a card, drawn to match",
                 "Fixture: HD - Avatar Aang. Each surface is the shipped page with only the box changed; the dashed orange outline marks the box.")
            + a + e + b + c + d)
    return doc("Tag places", body, 2060)


BOARDS = [
    ("Main", board_main, "The calls"),
    ("Tag-Control", board_control, "1 · Tag a card: the control"),
    ("Tag-Places", board_places, "1 · Tag a card: the five places"),
]

if __name__ == "__main__":
    import json
    import shutil
    mode = sys.argv[1] if len(sys.argv) > 1 else "local"
    kit.MODE["blob"] = mode == "blob"
    if mode == "blob":
        kit.BLOB.update(json.load(open("blobs_tg.json")))
    out = sys.argv[2] if len(sys.argv) > 2 else "out"
    os.makedirs(out, exist_ok=True)
    if mode == "local":
        shutil.copytree("art", f"{out}/art", dirs_exist_ok=True)
        shutil.copy("support.js", f"{out}/support.js")
    for nm, fn, _ in BOARDS:
        open(f"{out}/{nm}.dc.html", "w").write(fn())
        print("wrote", nm)
