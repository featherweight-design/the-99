# The 99 — combos one piece away (design handoff · R1)

Account 2, 2026-10-22. Hugh's prompt in the project thread (rulings closed in the 10-21 workshop and on 10-22). Canvas: https://claude.ai/artifact/HTAi9E8E8CUMTPAydCDhx4

**Status: R1, awaiting Hugh's audit.** Drawn over the shipped deck page (deck messages A2, #2170), the shipped card details "Two-card combos" block (`ComboPartnersDetail`) and the shipped combo receipt (`ComboBody` in `receipt-modal.tsx`). Every new string is a placeholder for `/copy-review`.

## Hugh's rulings (closed)

- Deck page: combos this deck is exactly one piece away from, legal in its colors. Each says where the missing piece is: a spare you own, in another of your decks, or to buy with its price.
- Card details: the combos the card is part of, and which pieces you already hold.
- How a combo works: Spellbook's steps and the mana it needs.
- Bracket marks as today. A combo that produces infinite turns keeps its loop mark (the turn-again mark).

## Design's calls

1. **Where it sits: a status-line segment**, "∞ 5 combos one piece away ›". It is the to-do card's foot when the deck has something to do, and the quiet status strip when it doesn't (deck messages: the foot stands alone). Not a to-do row (a combo is optional and would compete with the next step every visit), not the Analysis tab (it waits behind Analyze), not a Combos tab (none exists; a sixth tab overflows at 390). With none, no segment.
2. **The press opens a sheet (390) / modal (1300)**, the pass sheet's chrome, grouped "You own it" (spare, then another deck) and "To buy" (cheapest first). The foot says "From Commander Spellbook. Two-card combos legal in this deck's colors."
3. **"In another deck" links**: the deck's name is a link to `/decks/{id}`, styled as card details' In your decks, with a 44px hit area; the rest of the row opens the combo.
4. **How it works**: the shipped ComboBody pushed inside the sheet ("← 5 combos"), each plate saying where that piece is (in this deck, spare, in HD - …, or its price), Mana needed, Steps, Needs, the Commander Spellbook link, and one Add press in the foot ("Add Searing Touch · to buy" when it must be bought). A plate opens the shipped card details stacked on top. Depth stays two.
5. **Card details**: the shipped block extended. Closed: unchanged counts. Open: "Whole in this deck" then "One piece away · you hold the rest", each line with the same where-line and marks as the deck's list; a line opens the combo. Today a partner's name opens the partner's card; that moves to the plate inside the combo. **Hugh's call.**
6. **A deck-level count.** Combo awareness refused any deck-level count; this segment is one. **Hugh's call.**

## Boards

- `Main.dc.html` — the placement question (picked segment, not-picked to-do row, quiet deck), the calls, the gaps.
- `Deck-Page.dc.html` — many (quiet and with a to-do), one, empty, at 390 and 1300.
- `The-List.dc.html` — the sheet and modal: many, a piece in another deck (link pressed), a piece to buy, one, empty.
- `How-It-Works.dc.html` — the combo detail with steps and mana: to buy, owned as a spare, a plate pressed; the 1300 modal.
- `Card-Details.dc.html` — the block closed, open, a line pressed at 390; open in the 1300 modal.
- `About.dc.html` — the new entry `combos-one-away` opened in the shipped Reference at 1300 and 390, and the edit to `combo-awareness`. Strings in `about · combos one piece away.ts`.

## Gaps for engineering

- G1 · Steps and mana are already stored (`spellbook_variants.steps`, `mana_needed`, `mana_value_needed`, `notable_prerequisites`). The near-miss read (`pairsWithOnePiece`) must select them.
- G2 · Two-card only, as detection is today.
- G3 · "Spare" = a copy no committed deck holds (availability's free ≥ 1). "In another deck" = every copy held elsewhere. Both true: spare wins.
- G4 · A piece in several decks: the row names the first committed; the combo detail lists them all.
- G5 · §4.3b rule 2 holds: a piece that only works from the command zone is never offered as a card to add.
- G6 · Bracket: marks only. Nothing claims adding a piece moves the deck's bracket.
- G7 · The segment is computed on the deck page's read, like the row combo mark; no profile or Analyze.
- G8 · About recapture: `deck-your-deck` in all six themes with `COMBOS_CLOSE_ENABLED` on, a complete deck with nothing to do and two or more combos one piece away; add the segment's locator.

Fixtures are real Spellbook pairs (Avatar Aang + Searing Touch, Heliod + Walking Ballista, Kiki-Jiki + Zealous Conscripts, Exquisite Blood + Sanguine Bond, Time Vault + Voltaic Key; Polyraptor's partners). The steps text is the fixture's own wording, not Spellbook's.

## Files

- the `.dc.html` boards above, `STATES-combos-close.md`, `about · combos one piece away.ts`, `art/`, `support.js`.
- `scratch-gen/` — `cc.py` (boards), `about.py` (+ `laref.py`, `lakit.py`, copies of the launch-end batch's Reference kit), `cap.py` (renders the About picture and measures its box), `build.py local|blob`, `render.py`, `mk.sh`, `blobs.json`.
