"""Suggested changes v2: the About change, in About's visual system (prompt 21). Drawn with the about_visual generator."""
import kit
import pieces as P
import data as Dt
from boards import D, pphone, pdesk
from kit import board_head, frame, frames

OLD = {
    "label": "offers up to five cards to add and five to cut, each with its reason. Each run uses a credit.",
    "tool": "Up to five swaps, read from your games, your notes and the list.",
    "credits": Dt.RULES["credits"][0],
    "tile": "Up to five swaps, read from your games, your notes and the list.",
}
NEW = {
    "label": " asks how many cards to change and what you’re after, then offers more of each than you asked for. You pick, and apply them as one change. Each run uses a credit.",
    "tool": "Say what to change. Pick from more cards to add and to cut than you need.",
    "credits": ("Reading a bracket is free. Anything written just for you uses a credit: an Overview, a Suggested changes run, a Look deeper. "
                "A run that comes back short gives the credit back, unless your own limits, like a price cap, are what held it short."),
    "pick": ("Suggested changes keeps the deck at 99. Ask for three and you get about five to add and five to cut; pick three of each. "
             "The counts have to match before Apply, and one Undo takes the whole set back."),
    "tile": "Say what you want changed. You get more cards to add and to cut than you need, and pick.",
}

# apply the new copy to the About data
for s in Dt.SECTIONS["decks"]:
    if s["id"] == "analysis":
        s["labels"] = [(l[0], l[1], NEW["label"], *l[3:]) if l[0] == "suggested" else l for l in s["labels"]]
        s["rules"] = ["pick", "intent", "credits"]
Dt.RULES["credits"] = (NEW["credits"], None)
Dt.RULES["pick"] = (NEW["pick"], "TUNING_ENABLED")
t = Dt.TOOLS["suggested-changes"]
Dt.TOOLS["suggested-changes"] = (t[0], NEW["tool"], t[2], t[3])
P.RULES.update(Dt.RULES)
P.TOOLS.update(Dt.TOOLS)


def d_pick():
    def col(sign, word, n, picked):
        rows = "".join(
            f'<div class="cr" style="height:20px;padding:0 8px;font-size:10.5px;{"box-shadow:inset 2px 0 0 #CF8745;" if i < picked else ""}">'
            f'<span style="color:{"#CF8745" if sign == "+" else "#948B78"};font-family:IBM Plex Mono;margin-right:6px">{sign}</span>card'
            f'<span class="tg {"ac" if i < picked else ""}" style="font-size:9px">{"✓" if i < picked else "pick"}</span></div>' for i in range(n))
        return (f'<div style="display:flex;flex-direction:column;gap:4px;width:118px"><span class="mono" style="font-size:9px">{word} · 3 OF 3</span>{rows}</div>')
    return ('<div style="display:flex;flex-direction:column;gap:9px;align-items:center">'
            f'<div style="display:flex;gap:12px">{col("+", "ADD", 5, 3)}{col("−", "CUT", 5, 3)}</div>'
            '<span class="mono" style="color:#CF8745">APPLY 3 + 3 · STAYS AT 99</span></div>')


def d_credits():
    return ('<div style="display:flex;flex-direction:column;gap:7px;width:262px">'
            '<div class="cr">Read the bracket<span class="tg" style="color:#8EC487">free</span></div>'
            '<div class="cr">Suggested changes run<span class="tg ac">1 credit</span></div>'
            '<div class="cr">Short: your $2 cap held it<span class="tg ac">1 credit</span></div>'
            '<div class="cr" style="opacity:.8">Short for no reason of yours<span class="tg" style="color:#8EC487">credit back</span></div></div>')


P.DIAGRAMS["pick"] = d_pick
P.DIAGRAMS["credits"] = d_credits

ANALYSIS = next(s for s in Dt.SECTIONS["decks"] if s["id"] == "analysis")

CSS = r"""
.ctab{border:1px solid var(--border-strong);border-radius:12px;overflow:hidden;max-width:1500px}
.ctab .r{display:grid;grid-template-columns:200px minmax(0,1fr) minmax(0,1fr);gap:18px;padding:12px 16px;border-top:1px solid var(--border);font-size:13px;line-height:1.55;color:var(--fg-body)}
.ctab .r:first-child{border-top:0;font:500 10.5px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint)}
.ctab .r>div:first-child{color:var(--fg);font-weight:600}
.ctab .r .old{color:var(--fg-faint);text-decoration:line-through;text-decoration-color:var(--fg-locked)}
"""


def about_board():
    ph = pphone(f'<div class="ap">{P.section("decks", ANALYSIS, "ph", hl="suggested", quiet=True, rule_hl="pick")}</div>', active="Decks")
    dk = pdesk(f'<div class="ap" style="padding:0 30px"><div style="max-width:1180px;width:100%">'
               f'{P.section("decks", ANALYSIS, "dk", hl="suggested", quiet=True, rule_hl="pick")}</div></div>', active="Decks")
    rows = [("Where", "Today", "v2 (draft for /copy-review)"),
            ("Analysis · label 3, Suggested changes", OLD["label"], NEW["label"].strip()),
            ("Analysis · Good to know (new, first)", "—", NEW["pick"]),
            ("Analysis · Good to know, credits", OLD["credits"], NEW["credits"]),
            ("Try it · Suggested changes card", OLD["tool"], NEW["tool"]),
            ("Tuning tile purpose (tuningHubCopy)", OLD["tile"], NEW["tile"])]
    tbl = '<div class="ctab">' + "".join(
        f'<div class="r"><div>{a}</div><div class="{"old" if i else ""}">{b}</div><div>{c}</div></div>' for i, (a, b, c) in enumerate(rows)) + '</div>'
    body = (board_head("9 · About · Decks › Analysis, in the visual system (prompt 21)", "What changes on About",
                       "One section moves: Decks › Analysis. Its Suggested changes label is rewritten (lit here), a new Good to know card says the one rule a player "
                       "can’t see on screen (the counts must match, one Undo), and the credits card says when a short run keeps its credit. The Try it card’s line "
                       "follows. Nothing else in About names the old five-and-five. The pictures are today’s captures; the capture job re-shoots Tuning once v2 ships, "
                       "and the label’s region (the Suggested changes tile) is unchanged. Release gating: the label and cards ride v2’s switch.", tag="R1")
            + f'<style>{CSS}</style>'
            + frames(frame("<b>390</b> · the section, Good to know arriving at the new card", ph),
                     frame("<b>1300</b>", dk), gap=60)
            + '<div class="sec"><h3 style="margin:0;font:700 20px Cinzel,serif">The copy</h3>' + tbl + '</div>')
    return D("Suggested changes v2 · About", body, 390 + 1300 + 60 + 112)
