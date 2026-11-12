"""Upgrade this precon, addendum A3 (account 2, 2026-11-12): close + bracket marks.

Hugh's brief, from testing: (1) once the Upgrade window is open there is no way to leave it but finishing or the browser's Back;
draw a close on every step, phone and desktop, and what closing mid-run means. (2) the swaps don't say which cards are game
changers, combo pieces or mass land destruction; mark them in Results with the app's own card marks and key.

Everything else is R2d (and A2c on the deck page) as approved. Drawn over the shipped flow (upgrade-flow.tsx, result-view.tsx),
the shipped bare close (social-modal.tsx) and the shipped marks (card-fact-mark.tsx, combo-glyph.tsx, mark-key.tsx)."""
import re
import kit
import up as U
import up2 as V
from kit import img, doc, board_head, frame, frames
from up import DRAFT, note, PRE

kit.CSS += r"""
/* ---------- A3: the bare close (SocialModal's: 44px hit, glyph 15px in --fg-muted, no plate) ---------- */
.uft .x.bare{display:flex;width:44px;height:44px;margin:-10px -13px 0 0;border:0;border-radius:0;background:transparent;font-size:15px;color:var(--fg-muted)}
.ph .uft .x.bare{display:flex;margin-top:-12px}
.dk .uft .x.bare{margin:-10px -12px 0 0}
.uft .hl+.x.bare{margin-left:-4px}
.ph .uft .hl{margin-top:-12px}
.uft .x.bare.hit{outline:1px dashed color-mix(in srgb,var(--fact) 80%,transparent);outline-offset:-1px}
/* the foot with one press: full width on a phone, at the right on desktop */
.ph .uff .bts.one span{flex:1}
/* ---------- A3: the card marks on the swap rows ---------- */
.upr .z-rr .z-nm{flex:0 1 auto}
.upr .z-rr .sp4{flex:1;min-width:0}
.fm4{display:inline-flex;gap:4px;flex:none;color:var(--fact)}
.fm4 svg{display:block;width:16px;height:16px;filter:drop-shadow(0 0 3px color-mix(in srgb,var(--fact) 45%,transparent))}
.z-rr .fm4{margin-left:-4px}
/* MarkKey, as shipped: mono 10 / 10.5, --fg-faint, sample then word, 12px between entries */
.mk4{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;font:10px 'IBM Plex Mono';color:var(--fg-faint)}
.dk .mk4{font-size:10.5px}
.mk4 span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.mk4 svg{display:block;width:16px;height:16px;flex:none;color:var(--fact);filter:drop-shadow(0 0 3px color-mix(in srgb,var(--fact) 45%,transparent))}
.ures .hd .mk4{align-self:stretch}
/* the facts strip, then the key */
.ures .hd .mk4{margin-top:2px}
/* anatomy crops */
.zoom2{zoom:2;flex:none}
.zoom15{zoom:1.5;flex:none}
.zoomd{zoom:.48;flex:none}
.zoomr{zoom:1.6;flex:none}
.anat{display:flex;flex-direction:column;gap:10px;background:var(--surface);border:1px solid var(--border-strong);border-radius:12px;padding:12px 14px;width:390px}
.dk2 .anat{width:720px}
.rowcrop{background:var(--surface);border:1px solid var(--border-strong);border-radius:12px;padding:6px 14px;display:flex;flex-direction:column}
.rowcrop.ph{width:390px;border-radius:12px}
.rowcrop.dk{width:720px;display:flex;flex-direction:column;border-radius:12px}
.ftable{border-collapse:collapse;font-size:13px;color:var(--fg-body);width:100%;max-width:1240px}
.ftable th{text-align:left;font:500 10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint);padding:8px 10px;border-bottom:1px solid var(--border-strong)}
.ftable td{padding:10px;border-bottom:1px solid var(--border);vertical-align:middle;line-height:1.5}
.ftable td b{color:var(--fg)}
.ftable td .fm4{vertical-align:middle}
/* the precon page's press while a run is in flight (shipped: Upgrading toward Spells · 0:04) */
.ueb .bt.run{font-family:'IBM Plex Sans'}
.ueb .bt.run em{font:normal 500 13px 'IBM Plex Mono';margin-left:2px}
.arrow4{align-self:center;font:22px 'IBM Plex Mono';color:var(--fg-faint);padding:0 2px}
"""

# ---------------------------------------------------------------- the shipped marks, paths verbatim
GLYPH = {
    "gameChanger": '<path d="M9.4 1.5 L4.1 8.8 H7.3 L6.6 14.5 L11.9 7.0 H8.7 Z" fill="currentColor"/>',
    "massLandDenial": ('<path d="M1.4 13.4 L6.2 5.2 L9.4 10.6 L11.2 7.8 L14.6 13.4 Z" fill="currentColor"/>'
                       '<path d="M4.4 2.6 L5.6 2.6 M8.0 1.6 L8.0 3.0 M11.0 2.8 L12.2 2.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>'),
    "extraTurns": ('<path d="M10.98 3.74 A 5.2 5.2 0 1 1 6.65 2.98" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
                   '<path d="M9.0 2.4 L7.1 4.6 L6.2 1.3 Z" fill="currentColor"/>'),
    "tutor": '<path d="M1.8 12.2 H14.2 V14.4 H1.8 Z" fill="currentColor"/><path d="M8 1.3 L11.7 5.7 H9.2 V10.3 H6.8 V5.7 H4.3 Z" fill="currentColor"/>',
    "combo": ('<path d="M5.2 4.9 A 3.1 3.1 0 1 0 5.2 11.1 C 8.3 11.1 7.7 4.9 10.8 4.9 A 3.1 3.1 0 1 1 10.8 11.1 C 7.7 11.1 8.3 4.9 5.2 4.9 Z" '
              'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
}
WORD = {"gameChanger": "game changer", "massLandDenial": "mass land denial", "extraTurns": "extra turns", "tutor": "tutor", "combo": "Two-card combo"}
ORDER = ["gameChanger", "massLandDenial", "extraTurns", "tutor", "combo"]


def g(k):
    return f'<svg viewBox="0 0 16 16" aria-hidden="true">{GLYPH[k]}</svg>'


def marks(ks):
    return f'<span class="fm4">{"".join(g(k) for k in ks)}</span>' if ks else ""


def key(ks, new=True):
    ks = [k for k in ORDER if k in ks]
    if not ks:
        return ""
    return f'<div class="mk4{" new9" if new else ""}">' + "".join(f'<span>{g(k)}{WORD[k]}</span>' for k in ks) + '</div>'


# ---------------------------------------------------------------- the fixture, R2d's with two adds swapped for real Game Changers
# (cut, cost, owned, add, cost, owned, price, why, from, cut marks, add marks)
P3 = []
for p in V.MPAIRS:
    p = list(p) + [[], []]
    if p[3] == "Fact or Fiction":
        p[3:8] = ["Mystic Remora", "U", False, "$7.80", "Draws a card whenever an opponent casts a noncreature spell, unless they pay 4."]
        p[10] = ["gameChanger"]
    if p[3] == "Mystic Confluence":
        p[3:8] = ["Jeska’s Will", "2R", False, "$4.10", "Up to seven red mana and three cards off the top, in one spell: Muddle’s biggest turn."]
        p[10] = ["gameChanger"]
    P3.append(tuple(p))
# Jeska's Will's swap leads its group, so the phone's scrolled frame reaches it.
_j = next(i for i, p in enumerate(P3) if p[3] == "Jeska’s Will"); _t = next(i for i, p in enumerate(P3) if p[8] == "Tokens")
P3.insert(_t, P3.pop(_j))

# Bracket 4 (Optimized): a two-card combo among the adds, each side of the pair marked with the lemniscate.
P4 = [
    ("Mind Stone", "2", True, "Isochron Scepter", "2", False, "$2.40", "Imprint Dramatic Reversal: with two mana rocks out, every activation untaps them for more.", "Artifacts", [], ["combo"]),
    ("Unwinding Clock", "4", False, "Dramatic Reversal", "1U", False, "$0.70", "Untaps every rock you have, and on Isochron Scepter it never stops.", "Artifacts", [], ["combo"]),
    ("Thopter Engineer", "2R", True, "Jeska’s Will", "2R", False, "$4.10", "Up to seven red mana and three cards off the top, in one spell.", "Artifacts", [], ["gameChanger"]),
    ("Etherium Sculptor", "1U", True, "Underworld Breach", "1R", False, "$9.60", "Every spell in the graveyard can be cast again this turn.", "Artifacts", [], ["gameChanger"]),
    ("Sai, Master Thopterist", "2U", True, "Mystic Remora", "U", False, "$7.80", "Draws a card whenever an opponent casts a noncreature spell, unless they pay 4.", "Artifacts", [], ["gameChanger"]),
]


def rr4(sg, cls, name, cst, owned, mk, price=None):
    import pre as R
    pr = (f'<span class="pr">{price}</span>' if price else ('<span class="pr own">you own it</span>' if cls == "i" else ""))
    return (f'<div class="z-rr {cls}"><span class="sg">{sg}</span><span class="z-ow{"" if owned else " no"}"></span>'
            f'<span class="z-nm">{name}</span>{marks(mk)}<span class="sp4"></span>{R.cost(cst)}{pr}</div>')


def pair4(p, why=True):
    cut, cc, co, add, ac, ao, price, w, _, cm, am = p
    return (f'<div class="upr"><div class="rw">{rr4("−", "o", cut, cc, co, cm)}<span class="ar">→</span>{rr4("+", "i", add, ac, ao, am, price)}</div>'
            + (f'<p class="why">{w}</p>' if why else "") + '</div>')


def res4(pairs=P3, n_show=None, bracket="2 → 3", lead="Muddle", keyed=True, cmd=True, title_n=None):
    n = title_n or len(pairs); nb = sum(1 for p in pairs if p[6]); bt = sum(float(p[6][1:]) for p in pairs if p[6])
    present = {m for p in pairs for m in p[9] + p[10]}
    fx = (f'<div class="ufx"><span><b>Led by</b><i>{lead}</i></span><span><b>Bracket</b><i class="ac">{bracket}</i></span>'
          f'<span><b>To buy</b><i>{nb}<em>${bt:.2f}</em></i></span><span><b>Already yours</b><i>{n - nb}</i></span></div>')
    body = V.cmd_pair_m() if cmd else ""
    froms = {}
    for p in pairs:
        froms.setdefault(p[8], []).append(p)
    shown = 0
    for f, ps in froms.items():
        if n_show is not None and shown >= n_show:
            break
        ps2 = ps if n_show is None else ps[: max(0, n_show - shown)]
        shown += len(ps2)
        body += f'<div class="ugh">Cuts from {f}<em>{len(ps)}</em></div>' + "".join(pair4(p) for p in ps2)
    return (f'<div class="ures fl"><div class="hd"><h3><span class="md">{U.glyph("spells", 16)}</span>{n} swaps toward Spells<span class="dt">Nov 12</span></h3>'
            f'{fx}{key(present) if keyed else ""}</div>{body}</div>')


# ---------------------------------------------------------------- the close, on every step
X_OLD = '<span class="x">✕</span>'


def bare(f, hit=False):
    assert X_OLD in f
    f = f.replace('class="uf new9"', 'class="uf"')
    return f.replace(X_OLD, f'<span class="x bare new9{" hit" if hit else ""}">✕</span>')


def one_press(f, drop):
    """The foot loses its leave button: the ✕ is the one way out (one control per action)."""
    s = f'<span class="bk">{drop}</span>'
    assert s in f, drop
    return f.replace(s, "").replace('<div class="bts">', '<div class="bts one">', 1)


def s_intro():
    return bare(one_press(V.intro(), "Not now"))


def s_who():
    return bare(V.step_who("muddle"))


def s_br():
    return bare(V.step_br(3, steps=V.STEPS))


def s_st():
    return bare(V.step_st("m_spells"))


def s_wait():
    return bare(one_press(V.step_wait(), "Back"))


def s_res(n_show=2):
    f = V.foot("Start the deck with these 14 swaps", back='Try another strategy<em class="cst">2 credits</em>', stk=True)
    return bare(V.flow(res4(n_show=n_show), f, step="Done", fade=n_show is not None, title="Your upgrade", hist=True))


def s_hist():
    return bare(one_press(V.step_hist(), "Close"))


STEPS7 = [("Intro", s_intro, "Not now goes: the ✕ closes."), ("Commander", s_who, "Back stays: it moves between steps."), ("Bracket", s_br, ""),
          ("Strategy", s_st, ""), ("Wait", s_wait, "Back goes: it closed the window, which is the ✕’s job."), ("Results", s_res, "Beside History, at the row’s end."),
          ("History", s_hist, "Close goes; ‹ Back stays: it returns to the flow.")]


# ---------------------------------------------------------------- the page around a run
def entry_run(t="0:04"):
    return f'<div class="ueb new9"><span class="bt run">Upgrading toward Spells · <em>{t}</em></span></div>'


def entry_peak():
    return '<div class="ueb new9"><span class="bt peak">Upgrade this precon</span></div>'


def ph_page(sec_html):
    return kit.phone(U.page(False, sec_html), "Decks", h=844, over=U.DOCK + '<div class="vfx"></div>')


def dk_page(sec_html, h=620):
    return kit.desk(U.page(True, sec_html), "Decks", h=h, over='<div class="vfx"></div>')


# ================================================================ boards
W = 1300 + 112


def b_calls():
    calls = [
        "<b>One bare ✕ on every step, at both widths.</b> It is the shipped bare close from the app’s other sheets (<code>SocialModal</code>): the glyph at 15px in <code>--fg-muted</code>, no plate, in a 44px hit, at the right end of the flow’s title row. "
        "On a phone it is new (the drawer had only the grabber, the scrim and Escape). On desktop it replaces the dialog’s 36px plated ✕, so phone and desktop draw the same control.",
        "<b>Same place on every step:</b> Intro, Commander, Bracket, Strategy, Wait, Results and History, and the failed run. When the History link shows (intro, results), it sits just before the ✕.",
        "<b>One control per action, so three foot buttons go.</b> Intro’s <code>Not now</code>, the Wait’s <code>Back</code> (it already closed the window) and History’s <code>Close</code> all did what the ✕ now does. "
        "Their foot keeps the one press, full width on a phone. <code>Back</code> on Commander, Bracket and Strategy stays, because it moves between steps, and so does History’s <code>‹ Back</code>.",
        "<b>The ✕ never asks.</b> Before the confirm nothing is spent, so closing just drops the picks; the next open starts at the intro. Escape and a press on the scrim still close, as shipped.",
        "<b>Closing during the Wait keeps the run going.</b> The 2 credits stay held and the run finishes on the server. The page’s button shows the shipped <code>Upgrading toward Spells · 0:04</code> with the clock running. "
        "When the run lands, the button goes back to <code>Upgrade this precon</code> and plays the shipped line-pulse twice, and the next open shows the result. It is kept in History either way, so leaving the page is safe too. The deck page’s band button does the same.",
        "<b>A run that fails while the window is closed</b> gives both credits back, as shipped, and the next open starts at the intro. I drew it as shipped; say if you’d rather it open on the failed view.",
        "<b>The swaps carry the app’s card marks</b>, the same ones as on the deck’s rows: game changer (the bolt), mass land denial, extra turns, tutor (<code>CardFactMark</code>) and the two-card combo lemniscate (<code>ComboGlyph</code>). "
        "16px in <code>--fact</code> with its glow, bare, right after the card’s name and before its cost, on either side of a swap. Nothing is invented: a card is marked exactly as it would be in your deck.",
        "<b>The combo mark follows the deck row’s rule:</b> its partner is in the deck as it would stand after the swaps. An add that completes a combo with another add (or with a card that stays) is marked; a cut whose partner is also cut isn’t.",
        "<b>The key is the shipped <code>MarkKey</code></b>, under the four facts and above the first group. A result is a closed set, like a deck, so the key only lists the marks that appear on its swaps, in the shipped order. A run with none (most bracket 2 runs) draws no key and no marks, because absence is the design.",
        "<b>Opening a marked card</b> is as shipped: its name opens card details, whose <code>Bracket facts</code> block spells the mark out, and on desktop the mark has its shipped hover tip.",
    ]
    gaps = [
        "<b>G19 · Facts on the panel’s cards.</b> <code>PanelCard</code> carries no facts today. It needs the four card facts (the catalog’s <code>game_changer</code> and the classifiers behind <code>CardFactMark</code>) for every cut and add.",
        "<b>G20 · Combo partners after the swaps.</b> For each card, whether it has a two-card combo partner in the deck as it stands after the run’s swaps (the deck row’s <code>comboPartner</code>, worked out on the swapped list rather than the box’s).",
        "<b>G21 · The pulse when a run lands.</b> <code>useUpgradeRun</code> already watches a pending run; when it settles to done with the flow closed, the entry and the deck band replay <code>useLinePulse</code> once more (twice, then still).",
    ]
    body = (board_head("Upgrade this precon · A3 · the calls", "A way out of every step, and marks on the swaps",
                       "Two fixes from Hugh’s testing. The window had no close on a phone and no way out of the Wait but Back. And the suggested adds and cuts didn’t say which ones are game changers or combo pieces, which is what decides a bracket. "
                       "Everything else is R2d (and A2c on the deck page) as approved. Same fixture: Prismari Artistry, led by Muddle, toward Spells at bracket 3. Two of its adds are now real Game Changers (Mystic Remora, Jeska’s Will). Dashed outlines mark what’s new.", tag="A3")
            + note("Design calls · A3", calls, True) + note("Gaps for engineering · A3", gaps)
            + frames(frame("<b>X</b> · 390 · the title row, 1.5×", f'<div class="zoom15">{title_crop(False)}</div>',
                           "The dashed box is the 44px hit. The glyph is the shipped bare ✕."),
                     frame("<b>M</b> · 390 · a marked swap, 1.5×", f'<div class="zoom15"><div class="rowcrop ph">{pair4(P3[12], why=False)}</div></div>',
                           "The mark sits after the name and before the cost. A long name ellipsises before the mark does."), gap=44))
    return doc("Upgrade A3 calls", body, W)


def title_crop(desk):
    hl = f'<span class="hl">{V.HGLYPH}History</span>'
    cls = "dk" if desk else "ph"
    w = 720 if desk else 390
    return (f'<div class="{cls}" style="width:{w}px;height:auto;border-radius:12px;background:var(--surface)"><div class="uf" style="position:static;transform:none;width:{w}px;border:0;max-height:none">'
            f'<div class="uft" style="padding-bottom:12px"><h2>Your upgrade</h2>{hl}<span class="x bare hit">✕</span></div></div></div>')


def b_close_phone():
    fr = []
    for n, fn, cap in STEPS7:
        fr.append(frame(f"<b>{n}</b> · 390", V.ph_flow(fn()), cap))
    body = (board_head("A3 · 1 · Close · phone", "The ✕ on every step of the drawer",
                       "The shipped drawer, R2d’s steps unchanged, with the bare ✕ at the end of the title row. The grabber stays; the scrim and Escape still close.", tag="A3")
            + frames(*fr[:4], gap=36) + frames(*fr[4:], gap=36))
    return doc("Close phone", body, 390 * 4 + 36 * 3 + 112)


def b_close_desk():
    fr = []
    for n, fn, cap in STEPS7:
        f = fn().replace('fade="ph"', "")
        fr.append(frame(f"<b>{n}</b> · 1300 · at 48%", f'<div class="zoomd">{V.dk_flow(f, h=880)}</div>', ""))
    body = (board_head("A3 · 2 · Close · desktop", "The same ✕ in the dialog",
                       "The 720 dialog with the bare ✕ in place of the 36px plated one, so phone and desktop draw one control. Shown at 48%; the title row at full size is on the calls board.", tag="A3")
            + frames(*fr[0:2], gap=44) + frames(*fr[2:4], gap=44) + frames(*fr[4:6], gap=44) + frames(fr[6], gap=44)
            + frames(frame("<b>X</b> · 1300 · the title row, full size", title_crop(True), "History link, then the ✕. On steps with no History link the ✕ stands alone at the end.")))
    return doc("Close desktop", body, W)


def b_midrun():
    body = (board_head("A3 · 3 · Closing mid-run", "The run keeps going, and its result is kept",
                       "Closing during the Wait doesn’t stop the run. The 2 credits stay held, the page’s button keeps the clock, and the result waits in the flow and in History.", tag="A3")
            + frames(frame("<b>W</b> · 390 · the Wait", V.ph_flow(s_wait()),
                           "The Wait’s own line already says it: <code>Leave whenever you like: the upgrade keeps going and shows here when it’s done.</code> The ✕ is the way to leave."),
                     frame("<b>P1</b> · 390 · closed, still running", ph_page(entry_run("0:05")),
                           "The shipped running label, clock and all. Pressing it opens the Wait again."),
                     frame("<b>P2</b> · 390 · it landed", ph_page(entry_peak()),
                           "Back to <code>Upgrade this precon</code>, with the line-pulse twice (drawn at its peak). Nothing else on the page changes."),
                     frame("<b>R</b> · 390 · next open", V.ph_flow(s_res(2)),
                           "Opens on the result, as shipped. It’s in History too, so leaving the page mid-run is just as safe."), gap=36)
            + frames(frame("<b>P1</b> · 1300 · closed, still running", dk_page(entry_run("0:05"))),
                     gap=44))
    return doc("Mid-run", body, 390 * 4 + 36 * 3 + 112)


def b_marks():
    v390 = V.ph_flow(V.flow(res4(n_show=None), V.foot("Start the deck with these 14 swaps", back='Try another strategy<em class="cst">2 credits</em>', stk=True),
                            step="Done", title="Your upgrade", hist=True).replace(X_OLD, '<span class="x bare">✕</span>').replace('class="uf new9"', 'class="uf"'), h=844)
    # The phone result, scrolled down to the marked swaps: the rest of Artifacts, then Tokens.
    art = [p for p in P3 if p[8] == "Artifacts"]; tok = [p for p in P3 if p[8] == "Tokens"]
    ph_scr = ('<div class="ures fl">' + "".join(pair4(p) for p in art[5:6])
              + f'<div class="ugh">Cuts from Tokens<em>{len(tok)}</em></div>' + "".join(pair4(p) for p in tok) + '</div>')
    f_scr = V.flow(ph_scr, V.foot("Start the deck with these 14 swaps", back='Try another strategy<em class="cst">2 credits</em>', stk=True),
                   step="Done", title="Your upgrade", hist=True, fade="ph").replace(X_OLD, '<span class="x bare">✕</span>').replace('class="uf new9"', 'class="uf"')
    dk = V.flow(res4(), V.foot("Start the deck with these 14 swaps", back='Try another strategy<em class="cst">2 credits</em>'),
                step="Done", title="Your upgrade", hist=True).replace(X_OLD, '<span class="x bare">✕</span>').replace('class="uf new9"', 'class="uf"')
    b4 = V.flow(res4(P4, bracket="2 → 4", cmd=False, title_n=16),
                V.foot("Start the deck with these 16 swaps", back='Try another strategy<em class="cst">2 credits</em>', stk=True),
                step="Done", title="Your upgrade", hist=True).replace(X_OLD, '<span class="x bare">✕</span>').replace('class="uf new9"', 'class="uf"')
    rows = "".join(
        f'<tr><td>{marks([k])}</td><td><b>{WORD[k]}</b></td><td>{d}</td></tr>' for k, d in [
            ("gameChanger", "On the Game Changer list. Bracket 3 allows up to three; bracket 4 has no limit. The one that most often decides the step."),
            ("massLandDenial", "Mass land denial. Not in brackets 1 to 3."),
            ("extraTurns", "Extra turns. Chained extra turns aren’t in brackets 1 to 3."),
            ("tutor", "A tutor. No bracket counts them any more, but the deck rows mark them, so the swaps do too."),
            ("combo", "One half of a two-card combo whose other half is in the deck after the swaps. Early two-card combos aren’t in brackets 1 to 3."),
        ])
    table = f'<table class="ftable"><tr><th>Mark</th><th>Key word (shipped)</th><th>Why it matters on a swap</th></tr>{rows}</table>'
    body = (board_head("A3 · 4 · Marks on the swaps", "Which adds and cuts move the bracket",
                       "The swaps draw the same marks a deck row draws, so a player sees what pushes the deck from 2 to 3 before starting it. The key under the facts names only the marks on this result.", tag="A3")
            + table
            + frames(frame("<b>R1</b> · 390 · top", V.ph_flow(V.flow(res4(n_show=3), V.foot("Start the deck with these 14 swaps", back='Try another strategy<em class="cst">2 credits</em>', stk=True),
                                                                    step="Done", title="Your upgrade", hist=True, fade="ph").replace(X_OLD, '<span class="x bare">✕</span>').replace('class="uf new9"', 'class="uf"')),
                           "The key sits under the four facts: here one entry, <code>game changer</code>, because that is the only mark among these 14."),
                     frame("<b>R1</b> · 390 · scrolled to the marks", V.ph_flow(f_scr),
                           "Mystic Remora and Jeska’s Will carry the bolt. Two of bracket 3’s three."),
                     frame("<b>R4</b> · 390 · bracket 4, a combo among the adds", V.ph_flow(b4),
                           "Isochron Scepter and Dramatic Reversal each carry the lemniscate, because the other comes in with it. The key grows to two entries."),
                     gap=36)
            + frames(frame("<b>R1</b> · 1300 · dialog", V.dk_flow(dk, h=2050),
                           "Both sides of a swap on one line; the mark stays right after the name. The key is one line. Drawn tall enough to show all 14 swaps.")))
    return doc("Marks", body, W)


BOARDS = [("A3-Calls", b_calls, "A3 · the calls"), ("A3-Close-Phone", b_close_phone, "A3 · 1 · Close · phone"),
          ("A3-Close-Desktop", b_close_desk, "A3 · 2 · Close · desktop"), ("A3-Mid-Run", b_midrun, "A3 · 3 · Closing mid-run"),
          ("A3-Marks", b_marks, "A3 · 4 · Marks on the swaps")]
