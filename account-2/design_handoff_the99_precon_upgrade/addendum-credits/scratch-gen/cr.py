"""Upgrade this precon, addendum: the credits path (account 2, 2026-11-12).

Every frame is a PNG of the SHIPPED components rendered with the shipped CSS (the A3 recipe in
design_handoff_the99_public_landing/scratch-gen/a3): UpgradeFlow and the landing's Credits section, from a scratch copy of
main with crpatch.diff applied (the proposal itself, as code). The precon page behind the flow is R2d's page from up2.py.
python3 cr.py out          -> boards with art/ paths (the handoff folder)
python3 cr.py out blob     -> boards with /_blob urls (the canvas)
"""
import json, os, sys
import kit
import up as U
from kit import doc, board_head, frame, frames
from up import note

OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
BLOB = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "crblobs.json"))) if "blob" in sys.argv else None

kit.CSS += r"""
.shot{display:block;border-radius:14px;border:1px solid var(--border-strong);background:var(--bg)}
.shot.ph{width:390px}
.shot.dk{width:780px}
.shot.lp{width:390px;border-radius:8px}
.shot.lpd{width:1300px;border-radius:8px}
.legend{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;max-width:1500px}
.legend div{border:1px solid var(--border);border-radius:10px;padding:12px 14px;background:var(--surface);font-size:13px;line-height:1.5;color:var(--fg-body)}
.legend b{display:block;color:var(--fg);font-size:13.5px;margin-bottom:3px}
.legend code{font:11.5px 'IBM Plex Mono';color:var(--accent-text)}
"""


def src(name):
    return BLOB[name] if BLOB else f"art/{name}"


def shot(name, cls):
    return f'<img class="shot {cls}" src="{src(name)}" alt="">'


STATES = [("one_on", "1 credit · payments on"), ("one_off", "1 credit · payments off"), ("zero_on", "0 credits · payments on"), ("zero_off", "0 credits · payments off")]

LEGEND = ('<div class="legend">'
          '<div><b>1 credit, payments on</b>The free credit is there, nothing bought. Line in warning ink, then <code>Get more credits →</code>.</div>'
          '<div><b>1 credit, payments off</b>Nothing to buy, so no link. The line says it can’t run on free credits alone.</div>'
          '<div><b>0 credits, payments on</b>The same words as at 1: waiting for the free credit won’t make it runnable, so no reset time.</div>'
          '<div><b>0 credits, payments off</b>The same as 1 credit, payments off.</div></div>')

W = 4 * 390 + 3 * 36 + 112


def b_main():
    calls = [
        "<b>Say the shortfall before the first pick.</b> On the intro, the <code>2 credits a run.</code> line gets one more sentence, in the credit line’s warning ink (the ink expiring credits already use). "
        "It replaces the intro’s mono standing line (<code>1 of 1 left · this run uses 2</code>), so the intro says it once. At the press it’s said again in the shipped words: <code>An upgrade uses 2 credits, and a free credit covers 1.</code>",
        "<b>The same words at 1 credit and at 0.</b> A free credit covers 1, so waiting for it never makes the run possible. At 0, the press line drops the shipped spent form (<code>0 of 1 left · reset at 2:01 AM</code>), since the reset time suggests waiting would help. "
        "The paid daily limit, the owner’s testing share and the pause keep their shipped lines.",
        "<b>The path to Credits is the shipped <code>Get more credits →</code> link</b> (<code>GetMoreLink</code>, L4’s own line, to <code>/credits</code>). It sits under the intro’s sentence and under the press’s line, and only while payments are on. With payments off there’s no link, and the intro’s sentence reads <code>…so an upgrade can’t run on free credits alone.</code>",
        "<b>Nothing is locked.</b> <code>Next · Commander</code> stays on. Looking through who leads, the brackets and the strategies is free, and a player can buy part-way through. Only <code>Upgrade toward …</code> is off, as shipped.",
        "<b>Coming back from Credits keeps the picks.</b> After a purchase, going back to the precon reopens the flow at Strategy with the same picks, and the press is on (C3). Without it the link loses three picks, which is the dead end again in a new place.",
        "<b>The landing lists Upgrade this precon</b> as the last row of <code>With credits</code>, priced <code>2 credits</code>, with an ⓘ tip and an example like the other rows. While it’s listed, the chip reads <code>1–2 per run</code>. "
        "<b>R1b (Hugh: the three-times picture is no longer accurate):</b> it was already off, since Changes can take 2, and six tools don’t fit three times in 15. The picture becomes a cost strip, <code>What one run costs</code>: one tile per paid tool with a diamond per credit (Changes ◆◇, the hollow one for runs above 10; Upgrade ◆◆). The sentence becomes <code>That covers every tool at least twice…</code> (14 of 15 at the low costs). The row shows only while <code>PRECON_UPGRADE_ENABLED</code> is on app-wide, like every promise on the page.",
    ]
    gaps = [
        "<b>G19 · Back from Credits.</b> Keep the flow’s picks per precon (session storage) when <code>Get more credits</code> leaves, and reopen at Strategy on return. <code>/credits</code> has no return link today, so this rides browser Back or the next visit.",
        "<b>G20 · When the shortfall shows.</b> <code>runFunding(…, 2)</code> is <code>short</code>, or <code>spent</code> with <code>creditLineKind</code> = <code>spent</code>. Mixed lots (1 free and 1 welcome, or 1 welcome alone) are also <code>short</code>, since one source funds a run; the same sentence holds there.",
        "<b>G21 · Landing claims.</b> <code>LandingClaims.upgrade</code> from the app-wide <code>PRECON_UPGRADE_ENABLED</code>. While it’s on, the cost strip replaces <code>ThreeTimes</code>, and the twice sentence shows only when the grant covers every tool twice at its low cost (a check beside <code>coversEveryToolThreeTimes</code>).",
        "<b>Shipped divergences found while drawing:</b> R2d’s S-board drew <code>Get more credits</code> at 1 credit, but the build dropped it (<code>upgrade-flow.tsx:143</code> uses <code>freeOnly</code> without <code>withMore</code>). And on desktop, a foot with no line slides its presses to the left; <code>md:ml-auto</code> on the press group holds them right (in the diff).",
        "Locked and unchanged: 2 credits a run, a free credit covers 1, welcome credits stay at 15. The other two addenda (closing the window, phone tips) are their own rounds. The last row’s tip hanging past the card on a phone is the phone-tips round.",
    ]
    body = (board_head("Upgrade this precon · addendum · the credits path", "Say it early, and give a way through",
                       "Hugh’s brief: at 1 free credit a player walks Commander, Bracket and Strategy, then finds the press off, with no warning on the intro and no way to Credits even with payments on. "
                       "Every frame here is the shipped flow and landing rendered with the shipped CSS (Low Sun), with this addendum’s change applied. The fixture is R2d’s: Prismari Artistry, Muddle at bracket 3, Spells.", tag="C R1")
            + note("Design calls", calls, True) + note("Gaps for engineering", gaps)
            + frames(frame("<b>C1a</b> · 390 · the intro at 1 credit, payments on", shot("cr-ph-one_on-intro.png", "ph"), "Said before any pick, with the way to Credits under it."),
                     frame("<b>C2a</b> · 390 · the press at 1 credit, payments on", shot("cr-ph-one_on-strategy.png", "ph"), "The shipped line at the press, now with the shipped link."),
                     frame("<b>C4</b> · 390 · the landing row", shot("lp-upgrade-390-b.png", "lp"), "Upgrade this precon, last in With credits, at 2 credits."), gap=36))
    return doc("Credits path calls", body, W)


def b_intro():
    body = (board_head("C1 · The intro", "The shortfall in the 2-credits line",
                       "The intro at 1 and at 0 credits, with payments on and off. The warning sentence joins the line that already says what a run costs; the mono standing line under the presses goes, so it’s said once.", tag="C R1")
            + LEGEND
            + frames(*[frame(f"<b>C1{'abcd'[i]}</b> · 390 · {t}", shot(f"cr-ph-{k}-intro.png", "ph")) for i, (k, t) in enumerate(STATES)], gap=36)
            + frames(*[frame(f"<b>C1{'abcd'[i]}</b> · 1300 · {t} <i>(drawn at half size)</i>", shot(f"cr-dk-{k}-intro.png", "dk")) for i, (k, t) in enumerate(STATES[:2])], gap=36)
            + frames(*[frame(f"<b>C1{'abcd'[i + 2]}</b> · 1300 · {t} <i>(drawn at half size)</i>", shot(f"cr-dk-{k}-intro.png", "dk")) for i, (k, t) in enumerate(STATES[2:])], gap=36))
    return doc("Credits path intro", body, W)


def b_final():
    body = (board_head("C2 · The last step", "The press stays off, and the line gives a way through",
                       "Strategy at 1 and at 0 credits, with payments on and off. <code>Upgrade toward Spells</code> is off as shipped. The line is the shipped <code>An upgrade uses 2 credits, and a free credit covers 1.</code>, with <code>Get more credits →</code> under it while payments are on.", tag="C R1")
            + LEGEND
            + frames(*[frame(f"<b>C2{'abcd'[i]}</b> · 390 · {t}", shot(f"cr-ph-{k}-strategy.png", "ph")) for i, (k, t) in enumerate(STATES)], gap=36)
            + frames(*[frame(f"<b>C2{'abcd'[i]}</b> · 1300 · {t} <i>(drawn at half size)</i>", shot(f"cr-dk-{k}-strategy.png", "dk")) for i, (k, t) in enumerate(STATES[:2])], gap=36)
            + frames(*[frame(f"<b>C2{'abcd'[i + 2]}</b> · 1300 · {t} <i>(drawn at half size)</i>", shot(f"cr-dk-{k}-strategy.png", "dk")) for i, (k, t) in enumerate(STATES[2:])], gap=36))
    return doc("Credits path last step", body, W)


def b_back():
    body = (board_head("C3 · Back from Credits", "The picks are where the player left them",
                       "After buying a pack, going back to the precon reopens the flow at Strategy with Muddle, bracket 3 and Spells still picked. The press is on and its line is the shipped count (G19).", tag="C R1")
            + frames(frame("<b>C3</b> · 390 · 40 paid, picks kept", shot("cr-ph-back.png", "ph"), "<code>uses 2 · 1 of 1 free · 40 paid</code>: a pack funds the whole run."),
                     frame("<b>C3</b> · 1300 · 40 paid <i>(drawn at half size)</i>", shot("cr-dk-back.png", "dk")), gap=36))
    return doc("Credits path back", body, 390 + 780 + 36 + 112)


def b_landing():
    body = (board_head("C4 · The landing’s With credits", "Upgrade this precon joins the paid tools",
                       "The shipped section beside the addendum. Upgrade this precon is the last row, at <code>2 credits</code>, with the same ⓘ tip as its neighbours. The chip reads <code>1–2 per run</code>. R1b: the three-times picture becomes a cost strip (a diamond per credit a run takes, hollow for only some runs), and the sentence says every tool at least twice.", tag="C R1b")
            + frames(frame("<b>L0</b> · 390 · shipped, for reference", shot("lp-shipped-390.png", "lp")),
                     frame("<b>L1</b> · 390 · with Upgrade", shot("lp-upgrade-390-b.png", "lp"), "The row, the cost strip and the sentence change; nothing else does."),
                     frame("<b>L2</b> · 390 · its tip open", shot("lp-upgrade-tip-390-b.png", "lp"), "The tip and example as the other rows draw them. That it hangs past the card is the phone-tips round."),
                     frame("<b>L3</b> · 390 · welcome credits and payments off", shot("lp-upgrade-off-390.png", "lp"), "No value block, as shipped. The row and its cost still show."), gap=36)
            + frames(frame("<b>L1</b> · 1300 · with Upgrade", shot("lp-upgrade-1300-b.png", "lpd")))
            + frames(frame("<b>L2</b> · 1300 · its tip open", shot("lp-upgrade-tip-1300-b.png", "lpd")))
            + frames(frame("<b>L0</b> · 1300 · shipped, for reference", shot("lp-shipped-1300.png", "lpd"))))
    return doc("Credits path landing", body, W)


BOARDS = [("Main", b_main, "C · the credits path · calls"), ("C1-Intro", b_intro, "C1 · The intro"), ("C2-Last-Step", b_final, "C2 · The last step"),
          ("C3-Back", b_back, "C3 · Back from Credits"), ("C4-Landing", b_landing, "C4 · The landing’s With credits")]

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for n, fn, _ in BOARDS:
        open(f"{OUT}/{n}.dc.html", "w").write(fn())
        print("wrote", n)
