# Deck details refresh · R1 (2026-11-26, account 2)

Hugh's ask: bring Deck details in line with Home's section heads and the approved Games tabs redesign. Audit doc:
https://claude.ai/artifact/FBvcSC119ac2v6jKcyoxr7 (approved, then "mock these up").
Canvas: https://claude.ai/artifact/MAVkBSkYzipjRJgLaFsWaz

## The shared pattern
HomeSectionHead type (◆, display 17px, mono count) in the band of a SectionPanel box that holds its list; keys in a row at
the box's foot; "why" and cross-links in a footer band. Where the children are already tiles (decklist rows, Tuning tool
tiles), the ◆ head sits bare with no box and no hairline (open call for Hugh).

## Boards
- R1-Consider: shelf = box; band ◆ role + "N to consider" + coverage clause; your N → and Show all N › at the band's end;
  folded shelf = band only, chevron at the far end. Key row at the panel's foot. Phone: Show all in the box footer.
- R1-Mana: Colors / Hardest costs / Lands as boxes; What "Needs" means in the Colors footer; one tool-title weight.
- R2-Tuning: The deck's strategy moves from Analysis to the top of the Tuning landing (shown for every deck); tools under a bare ◆ Tools head.
- R2-Focus: focus picked (ring + radio); Suggested changes intake shows one FOCUS line with Change ›.
- R2-History: month boxes (Games pattern), no 420px inner scroll; foot line + Show 20 more in the last box's footer.
- R3-Mix: Recommended mix box, Why these numbers? in the footer, opens inside the box (shipped rationale copy).
- R3-YourDeck: All + Shopping group heads ◆ + count, no hairline; keys at the foot; Shopping summary box (Total / Over $10 / Last checked, Buy at Mana Pool).
- R3-Analysis: Overview, Where you sit, What is in this deck, How it plays as boxes; links in footers.
- R3-Versions: visible ◆ Versions head with the changes count; Built from a precon? as the box footer. Review stays in the to-do card.

Fixture: Ashen Banner Parade (Ashling, the Limitless), from Hugh's About captures. Card images from small_items_2 art.
Generator: scratch-gen/gen_dd.py OUT_DIR (exec's kit_games.py = Games handoff gen_games.py lines 1-506); render check with shoot.js.
