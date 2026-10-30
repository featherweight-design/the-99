"""The R3 addendum's entry board: every item, its answer, and where it is drawn."""
from common import *

ITEMS = [
    # (n, folder, item, kind, answer, board)
    (1, "Buying credits", "Pack button", "ok", "Redrawn as <code>Buy pack</code>; accessible name <code>Buy pack: 40 credits · $5</code>.", "Credits-Pack · §1"),
    (2, "Buying credits", "Diamond numeral", "ok", "21px, lining, cap-height centred: ink within 0.5px of centre in all six faces (Metamorphous has no lining set; its 3px pad centres it).", "Credits-Pack · §2"),
    (3, "Buying credits", "Packs cell +N", "ok", "<code>+N</code> only while the cell holds more than N; a first purchase leaves it to the band.", "Credits-Balance · §3"),
    (4, "Buying credits", "support@ as a link", "call", "One mailto link in both sentences. <code>--accent</code> is 4.25 in Oil Haze and 4.46 in First Frost on the band: drawn in <code>--fg</code>, underlined in <code>--accent</code>, unless the text inks addendum’s <code>--accent-text</code> lands first.", "Credits-Balance · §4"),
    (5, "Buying credits", "Chip height on the phone", "ok", "The pill itself is 44px in the sheet; 30px in the desktop popover.", "Credits-Chip · §5"),
    (6, "Buying credits", "Undrawn chip cases", "ok", "Limit with free spent: <code>94 credits</code>, filled. Spent, off, once bought: <code>0 credits</code>, hollow. Expiring with payments off: as expiring.", "Credits-Chip · §6"),
    (7, "Buying credits", "P5/P5b clock clause", "ok", "After hydration only, drawn both sides. Noted: the Free cell’s sub wraps at 390 with three cells, so the strip grows 15px on hydration.", "Credits-Balance · §7"),
    (8, "Buying credits", "Chip count ink", "ok", "<code>--fg</code> confirmed: 8.17:1 lowest. A 35% accent tint would clear 6.15:1; not proposed.", "Credits-Chip · §8"),
    (9, "Buying credits", "“114 paid.” no-break space", "ok", "Confirmed (PR #2066): the count and <code>paid.</code> wrap as one.", "Credits-Line · §9"),
    (10, "Buying credits", "390 dock with Get more credits", "call", "<code>Get more credits →</code> moves from the dock to under the <em>Anything else?</em> box; the dock drops from 138px to 92px.", "Credits-Line · §10"),
    (11, "Buying credits", "Warning vs accent", "ok", "Confirmed in every theme, not only Low Sun (1.11 to 1.71:1 apart): the line under the chip carries it, 6.17:1 lowest.", "Credits-Chip · §11"),
    (12, "Discovery onboarding", "Find a deck’s landing at 390", "call", "Yes: the landing opens the next card at the full sheet, door haloed 2.4s, once. Nothing is pressed.", "Discovery-Landing"),
    (13, "Discovery onboarding", "Replay step 1 with data", "ok", "Drawn: the Collection slot lit at 1280 (rail) and 390 (tab bar), the replay’s body.", "Discovery-Replay · §13"),
    (14, "Discovery onboarding", "Replay card over the open bar", "ok", "86px confirmed and drawn: the ring stops 3px above the bar, 9px short of the card.", "Discovery-Replay · §14"),
]

KIND = {"ok": ("ok", "Confirmed"), "call": ("call", "Design’s call"), "hugh": ("hugh", "Hugh’s pick")}


def b_main():
    rows = []
    for n, folder, item, kind, ans, where in ITEMS:
        k = KIND[kind]
        rows.append([(str(n), "n"), folder, f"<b>{item}</b>", f'<span class="ans" style="font-size:13px"><span class="k {k[0]}">{k[1]}</span></span>', ans, (where, "n")])
    calls = [i for i in ITEMS if i[3] == "call"]
    call_list = "".join(f"<li><b>{n} · {item}.</b> {ans} <span style='color:#7D8294'>({where})</span></li>" for n, _, item, _, ans, where in calls)
    body = (head("R3 addendum · buying credits and discovery onboarding · 2026-10-18",
                 "Fourteen small redraws, each answered",
                 "Missing states and small redraws on two shipped handoffs, <code>design_handoff_the99_buying_credits/</code> and "
                 "<code>design_handoff_the99_discovery_onboarding/</code>, as merged. Where engineering departed from a board, the shipped value is Hugh’s ruling: "
                 "these boards redraw to it. No new surface, token, string or motion. Every ink and tint named here is measured against all six themes at 4.5:1 for text.")
            + f'<div class="note"><b>Three of the fourteen are Design’s calls</b> and need Hugh’s word; the other eleven confirm what shipped.<ul style="margin:8px 0 0;padding-left:18px">{call_list}</ul></div>'
            + table(["#", "Handoff", "Item", "", "Answer", "Drawn on"], rows)
            + '<p class="cap">Boards, left to right on the canvas: Credits-Pack (1–2), Credits-Balance (3, 4, 7), Credits-Chip (5, 6, 8, 11), Credits-Line (9–10), '
              'Discovery-Landing (12), Discovery-Replay (13–14). The parts the discovery boards mount (Home at 1280 and 390, the rail, the phone chrome, Friends) '
              'are the Friends on Home handoff’s, unchanged.</p>')
    return doc("R3 addendum · the fourteen items", body, 1700, 1300)


BOARDS = {"Main": b_main}
