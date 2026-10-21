import json, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from kit import doc, board_head
import boards as B

S = "/tmp/claude-0/-home-claude/a4226442-348b-5f42-b3c9-f9f97697a704/scratchpad"


def main_board():
    calls = [
        ("1 · The form (A)", "A caption change under the Bracket radios. From 3 up, the caption that restates the pick goes on to say what a collection-only deck lands in and the cheapest buy, in <code>--fg-muted</code> when short. It is above the credit press, so the shortfall is said before a credit is spent. No note beside Find, no new block."),
        ("2 · The choice (C)", "Two radio rows inside the hand-off’s Bracket row, <b>neither selected</b>: <i>From my collection</i> (lands in N) and <i>Hit bracket 3</i> (names the card or cards and the cost). <b>Create deck →</b> stays where it is, disabled until a pick, with one line in the error slot saying why. Not a sheet: the answer is the last answer in the block, so it lives with the others."),
        ("3 · The row (B)", "One more segment on the ownership line, led by a locked <code>BRACKET</code> label: <i>lands 3</i>, <i>lands 1-2 · 3 adds $32</i>, or <i>lands 1-2</i>. Short readings a step brighter. No third figure, no new mark to learn."),
        ("4 · The reached case", "No mark on the deck page. The hand-off’s Bracket line names the owned card that gets there (it opens like any card), and the deck page’s Bracket row reads what was submitted. A mark there would only repeat it."),
        ("5 · Bracket names", "Both where the radios’ caption already shows both: the value <code>3 · Upgraded</code>. Sentences and options say <i>bracket 3</i> (short, and it matches the analysis)."),
    ]
    rulings = [
        "<b>Over budget (state 3):</b> the buy row is pickable, and says that picking it raises the budget to its cost. One press, one explicit decision; no separate raise control. <i>Alternative if you prefer:</i> the row greyed and unpickable, with the block’s <b>Change</b> as the way to raise it (but changing answers re-runs the search, which spends a credit when “Anything else?” is filled).",
        "<b>Only cards I own (state 4):</b> drawn, not ruled out. Hit names the card it buys from outside the collection; picking it is the relaxation.",
        "<b>Nothing reaches (state 5):</b> a statement with the why. Create deck stays live.",
        "<b>Fixed cards above the target (state 6):</b> not drawn. The rank screen already filters these out, so the state has no trigger.",
        "<b>Bracket 1 and 2 at the form:</b> no line. Any collection reaches 1-2, and the app never adds an extra-turn card to make a 2.",
        "The app never adds mass land denial or a turn loop to reach a bracket; no line offers it.",
    ]
    gaps = [
        "G1 · Over budget: how a raised budget treats the rest of the fill (does the fill still buy beyond the hit cards?). Engineering’s answer may change the option’s line.",
        "G2 · Nothing reaches: the server may not say which reason applies (nothing stocked vs the colors can’t). The line names neither cause specifically.",
        "G3 · The form’s heads-up names cards only when the cheapest set is one card; for more, the total. Confirm the result shape carries the count.",
        "G4 · From my collection: the submitted answer becomes the bracket it lands in (brief), so the deck page’s Bracket row reads 1-2 after this pick. Not drawn, as it is the shipped row.",
        "G5 · How credits work moves screens (Analysis → a new Credits screen). Engineering adds the <code>credits</code> screen to <code>ABOUT_SCREENS</code> and captures <code>credits.webp</code> per theme. Its two Overview keys (<code>OVERVIEW_V2_ENABLED</code>) are not drawn here: I suggest they move to the Overview’s own entry. Your call.",
        "G6 · Fixtures: Sai, Master Thopterist stands in for Captain N’ghathrod (no art for him in the design folder). Card prices are placeholders.",
    ]
    li = lambda xs: "<ul>" + "".join(f"<li>{x}</li>" for x in xs) + "</ul>"
    body = (board_head("Help me choose · bracket reach · brief 2026-10-21 (#2117) · account 2",
                       "When the collection can’t reach the bracket asked for",
                       "Hugh’s ruling binds every screen: say it before the build and before a credit is spent; when short, let the player choose between building from the collection (lower bracket) and hitting the target (cards to buy); never pick for them. Boards: <b>C</b> the choice at 390 and desktop, <b>A</b> the form’s heads-up, <b>B</b> the result row, and the two About entries. Every word is a placeholder for <code>/copy-review</code>; outlined pieces are new.")
            + '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px">'
            + '<div class="note"><b>The five calls</b><ul style="list-style:none;padding-left:0">' + "".join(f"<li><b>{t}.</b> {c}</li>" for t, c in calls) + "</ul></div>"
            + '<div style="display:flex;flex-direction:column;gap:20px"><div class="note"><b>Rulings on the states</b>' + li(rulings) + "</div>"
            + '<div class="note"><b>Gaps for engineering and your audit</b>' + li(gaps) + "</div></div></div>")
    return doc("Bracket reach · calls", body, 1600)


BOARDS = [
    ("Main", main_board, "Bracket reach R1 · the calls, rulings, gaps"),
    ("Choice-Phone", lambda: B.choice_board("phone"), "C · the choice in the hand-off’s Bracket row · 390"),
    ("Choice-Desktop", lambda: B.choice_board("desk"), "C · the choice in the hand-off’s Bracket row · desktop"),
    ("Form", B.form_board, "A · the heads-up under the Bracket radios"),
    ("Rows", B.rows_board, "B · the result row’s reach segment"),
    ("About-HMC", B.about_hmc_board, "About · Help me choose’s entry, the edit"),
    ("About-Credits", B.about_credits_board, "About · How credits work, redrawn"),
]

if __name__ == "__main__":
    mode = sys.argv[1]  # local | blob
    kit.MODE["blob"] = mode == "blob"
    out = f"{S}/local" if mode == "local" else f"{S}/canvas/project"
    os.makedirs(out, exist_ok=True)
    if mode == "local":
        shutil.copytree(f"{S}/canvas/art", f"{out}/art", dirs_exist_ok=True)
        shutil.copy(f"{S}/t/support.js", f"{out}/support.js")
    for n, fn, _ in BOARDS:
        open(f"{out}/{n}.dc.html", "w").write(fn())
        print("wrote", n)
