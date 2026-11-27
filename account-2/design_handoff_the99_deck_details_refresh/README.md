# Deck details refresh · R1c (2026-11-26, account 2)

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
- R1-ToolPicker (R1b): phone replaces ‹ Tuning with a tool picker (open tool's mark + name + caret, status at the end); it opens a Tuning sheet: All tools, the five tools with their status lines, Proposed cuts gets the inert tool-tile treatment (dashed border, locked mark, faint text) with "Offered once the deck passes 100 cards." only (R1c). Applies to every phone tool frame. Phone shelves show 2 tiles.
- R1-Mana: Colors / Hardest costs / Lands as boxes; What "Needs" means in the Colors footer; one tool-title weight.
- R2-Tuning: The deck's strategy moves from Analysis to the top of the Tuning landing (shown for every deck); tools under a bare ◆ Tools head.
- R2-Focus: focus picked (ring + radio); Suggested changes intake shows one FOCUS line with Change ›.
- R2-History: month boxes (Games pattern), no 420px inner scroll; foot line + Show 20 more in the last box's footer.
- R3-Mix (R1b): Recommended mix box; colors as shipped (no amber, which means short); a role over target says "N over" in the cell foot, Land keeps "was 39" (R1c).
  Why these numbers? opens inside the box as one tile per role: an icon (R1c: icons replace the R1b pictures), the target, "you have N", and the shipped rationale copy (desktop: R3-MixWhy; phone: R3-Mix).
- R3-YourDeck: All + Shopping group heads ◆ + count, no hairline; keys at the foot; Shopping summary box (Total / Over $10 / Last checked, Buy at Mana Pool).
- R3-Analysis: Overview, Where you sit, What is in this deck, How it plays as boxes; links in footers. R1c: What is in this deck and How it plays keep the shipped tiles exactly (fact icons, dim zero tiles, NO LIMIT pill, dashed Win speed; phone rows); only the ◆ head, box and footer link change. The R1b zeros fold is withdrawn.
- R3-Versions: visible ◆ Versions head with the changes count; Built from a precon? as the box footer. Review stays in the to-do card.

Fixture: Ashen Banner Parade (Ashling, the Limitless), from Hugh's About captures. Card images from small_items_2 art.
Generator: scratch-gen/gen_dd.py OUT_DIR (exec's kit_games.py = Games handoff gen_games.py lines 1-506); render check with shoot.js.

## R4 — heading sweep beyond Deck details (2026-11-26, awaiting review)

Boards `R4-*.dc.html` (shots in `art/r4/`). Unlike R1–R3 these are the SHIPPED components server-rendered with shipped CSS, with the proposal applied in source, so everything not named below is exactly as shipped. `scratch-gen/r4/proposal.diff` is that source change against main (23 files); `r4.tsx` holds the fixtures and frames.

- Precons: Announced and each release year become deck boxes (`DeckBox`/`DeckBoxBand`); pick view the same; open precon's Overview label becomes a band with View full overview at the foot.
- Decks › All cart: the deck-select label becomes a ◆ Decks band with `N of M selected`. Checkout total box unchanged (open question: unify with the R3 Shopping summary box).
- Export: tabs = shipped `SegmentedSwitch`; Shopping rows = shipped `DecklistRow readOnly`; i-callout → one plain line; footer drops the line the subtitle repeats; bare ✕.
- Friends/Pods: section-panel `BAND` moves to the display face; `BandText` splits "Title · N".
- Home at zero decks: No decks yet uses `HomeSectionHead`. Ready to build is not redrawn: it left Home with What's new (Direction B).
- Analysis before a read: Overview becomes a box band.
- Help me choose results: ◆ heads, divider hairline dropped; after a read the rest head replaces More commanders.
- Settings: `SECTION_HEAD` (all sections + Open links on /friends) and Kept back move to the ◆ display head.

R4b (Hugh 2026-11-26): every board shows BEFORE (shipped main, `art/r4/before/`) above AFTER; Home redrawn as the full shipped Dashboard at zero decks with the feed on.

## R5 — large-page keys back at the top (2026-11-27, awaiting review)

Hugh 2026-11-27: "be consistent about key placement" meant small sections in view only. Large pages (Decks, Deck details, Collections) keep their key at the TOP. R1 and R3 moved three large-page keys to the foot; R5 moves them back. Small boxes (a shelf, the To buy box) are unaffected.

- R5-All: Your deck › All keys box moves from the list's foot to the top, above the first group (same box; the Lock cards swap keeps its slot). Card view: same move.
- R5-Shopping: Shopping keys box (ShoppingKey + mark key) moves to the top, under the To buy box; the empty Shopping list's key goes to the top too.
- R5-Consider: the one panel key box (marks + Add / Folded lines) moves from below the last shelf to above the first.

Every board: BEFORE (shipped main 6f2c90e2, `art/r5/before/`) beside AFTER (`art/r5/`), both SSR'd from the shipped components. `scratch-gen/r5/proposal.diff` is the whole source change (decklist.tsx, consider-panel.tsx); recipe in `scratch-gen/r5/README.md`. Decks and Collections were checked: the refresh never moved their keys.
