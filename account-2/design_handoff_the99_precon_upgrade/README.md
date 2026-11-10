# The 99: Upgrade this precon (design handoff, R1)

`design_handoff_the99_precon_upgrade/` · 2026-11-10 · account 2 · mirrors `design_handoff_the99_precons/`

**Status: R1 + addendum A1 (who leads), for Hugh's review.** Source of truth: `docs/superpowers/design-briefs/2026-11-10-upgrade-this-precon.md` (main). Hugh's five rulings of 2026-11-10 are closed and bind every board. Canvas: https://claude.ai/artifact/BGMmU2uhRMixjsKrrSkN4F

**About these files.** The boards are design references built in HTML (open them with `support.js` beside them; `art/` holds the card images). Drawn over the shipped open precon page (`open-precon-view.tsx`: head at 64×89 / 84×117, own box, `PreconOverview`, list-note line, read-only `DecklistGroup` rows), `start-precon.tsx` (S1) and Suggested changes v2's Wait, bar and same-request ask. Glyphs are `strategy-icon.tsx`'s. **No new tokens, no new dependencies, no new motion** (the wait's progress line is v2's).

Fixture: **Prismari Artistry** (Rootha, Mastering the Moment, UR), illustrative as in earlier precon rounds; you own 41 of 85. Card images are real cards from the design folders. Copy marked DRAFT goes through `/copy-review`.

| File | Holds |
|---|---|
| `Main.dc.html` | The calls, the gaps, the section at 1300 |
| `Entry.dc.html` | E1 three strategies (390, 1300), E2 one strategy, E3 none |
| `Picker.dc.html` | P1 selected + the press as the confirm, P2 out of credits, P3 only the free credit, P4 back from sign-in |
| `Wait.dc.html` | W the wait (390, 1300), F failed and refunded |
| `Results.dc.html` | R1 fourteen swaps (1300 whole set, 390), R2 short (9 swaps) |
| `Start.dc.html` | S1 with the swaps (sheet, dialog) and why Start over a read-only list |
| `Another.dc.html` | A1 a second direction, A2 two kept, A3 the same direction again (ask once), A1 at 1300 |
| `Commander.dc.html` | Addendum A1: C1 who leads (390, 1300), C2 chosen and folded (390, 1300), C3 Change, CR results with the commander swap (1300, 390), CS S1 led by the alternate |
| `STATES-precon-upgrade.md` | Every state, with Must-nots |
| `precon-upgrade · copy strings.ts` | Proposed `src/lib/copy/precon-upgrade.ts`. DRAFT strings for /copy-review |
| `READINESS.md` | Self-assessed readiness and the gap report |
| `scratch-gen/` | The generator (`up.py` over the announcements kit) |

## Design's calls (§Design calls to make)

1. **Entry.** A section on the open precon page between the Overview and the list-note line, phone and desktop alike. Label `Upgrade this precon` in the Overview's label style with the aside `pick a direction · 2 credits a run`, one lead sentence, the strategy cards, one press. Nothing in the head moves: Start, Link a deck, the own box and the view switch stay as shipped, and the phone dock stays the box's Start. Not drawn on an early list, with the switch off, or for a reader the page itself refuses.
   - **One strategy:** one card at a third's width (420 max on desktop), still unselected, still a pick.
   - **None:** a dashed line, `No direction to upgrade toward yet` + why, no press and no credit line.
2. **The picker.** The strategy cards are the picker. Each: glyph on a medallion, name, `N of its cards`, one plain sentence of what this deck does with it, three of the deck's own cards as art with names (each opens card details), `and N more · press a card for its details`. Radio ring top right. Press selects (accent edge, filled ring); press again unselects. Three in a row at 1300, stacked at 390. Order: detection order (most-counted first); never "recommended".
   - **The Overview's plan is marked** with a foot line `the Overview's read` (mono, faint), a source note and not a badge: the reader has just read that paragraph. It is never accented, first by rule or pre-selected.
3. **The credit confirm is the press, asked once.** The press names the pick (`Upgrade toward Artifacts`) and its line carries the range and cost (`12 to 18 swaps · uses 2 credits · this run uses 2 of 15 welcome`). No dialog on a first run. v2's same-inputs rule: running a direction already run on this precon asks once inline (A3): `Run it again` / `Keep Nov 10's`.
4. **Results.** In place under the picker, which folds to one row per direction. Head: glyph + `14 swaps toward Artifacts`; one mono line: `bracket 2 → 3 · Upgraded` (v2's wording, accent), `10 to buy · $28.90 · each under $12`, `4 you own`, date. Pairs grouped by the theme the cut came from (`Cuts from Spells 12`, `Cuts from Tokens 2`). Each pair is the page's read-only DecklistRow twice: `−` cut, then `+` add, owned dot and cost on both, the add's price at the right (`you own it` when owned). Side by side with `→` at 1300, stacked at 390. One reason under each pair. Every name opens card details.
   - **No Pick toggle (argued).** A cut's slot is filled by its own add; a part-set leaves the deck off 100 or a cut with nothing in it, and the 12 floor is part of what was paid for. The set or start over.
5. **After results (the open call): Start the deck with the swaps applied.** `Start the deck with these 14 swaps` (primary, the result's foot) opens S1 with one added sentence and updated facts (Cards `all 100 · 14 swapped`, Bracket `2 → 3 · Upgraded`, You own counted as started, Printings `this precon's copies; yours for the 14 added`). Why:
   - The player paid for an upgraded deck; a read-only list hands a new owner 28 changes to make by hand on a deck that doesn't exist yet.
   - Nothing existing is touched: it makes a new draft. The head's Start still makes the box unchanged.
   - The draft links to the precon (R3), so v0 stays the box and v1's diff is exactly the swaps; every swap can be undone on Your deck with shipped tools.
   - The result stays on the precon page, so another deck can start from the same set without another run.
6. **Another strategy.** After a result the cards fold to rows (glyph, name, `14 swaps · Nov 10` or `N of its cards · 2 credits`). A run row opens its stored result free. An unrun row opens its full card (in place on a phone, under the row strip on desktop) and the press, whose line says `Another upgrade · 12 to 18 swaps · uses 2 credits · Artifacts stays here`. Each direction keeps its newest result (`readUpgrades`).
7. **States.** Empty (E3), loading (W: v2's clock, `usually about 6 seconds`, other cards dim, three skeleton rows, no streaming), failed (F: refunded whole, `Try again`), short (R2: counted, credits back, still startable), signed out (P4) and out of credits (P2, P3: shipped lines).

## Addendum A1 · who leads (Hugh, 2026-11-10)

Hugh's ruling: when the box has a Commander-legal alternate the deck's cards can back, the player first picks which commander leads, the box's own or the alternate. Strategies are worked out per commander, so this comes first. Choosing the alternate moves the box's commander into the 99 or out, and the results show it. No extra credit. Fixture: the box's foil Brudiclad, Telchor Engineer.

1. **When.** Only when `preconAlternates` names one and detection backs a direction for it. Otherwise the section is R1's, with no step and no mention of an alternate. The lead becomes `Pick who leads, then where to take the deck…` and the aside `who leads, then a direction · 2 credits a run`.
2. **How each commander is presented.** A card at card shape (64×89 phone, 84×117 desktop, as the page head), name in Cinzel, one plain line of what it pushes, then mono facts: the mana cost pips and `mana value N`, `N of its cards back it`, and `directions: Tokens · Artifacts`. The directions line shows before any press that the choice changes what can be picked. Stacked on a phone; two side by side at 1300, 420 max each.
3. **Is the main one marked as the box's own? Yes, as a source, not a default.** A mono foot line `the box's commander`. The alternate says where it comes from: `a foil in the box · in its 99`. These carry the same weight as R1's `the Overview's read`. Nothing is pre-selected, by ruling 1's logic.
4. **Choosing folds the step to one row** (`Led by Brudiclad · Rootha moves into the 99 · Tokens · Artifacts`, `Change`). That commander's directions open under it (`Where to take it · worked out for Brudiclad`). One press, and no extra confirm or credit line.
5. **Going back.** `Change` on that row reopens both cards, with the current one selected and the directions dimmed. Choosing the same one folds back. Choosing the other replaces the directions and clears the direction pick. Stored results belong to their commander, and changing back shows them again, free.
6. **Results show the commander swap** as the first group, above the cuts. Under `Commander · your pick · not one of the swaps` sits the page's DecklistRow pair: `− Rootha … to the 99` → `+ Brudiclad … leads`, with one line on why. The head's mono line starts `led by Brudiclad`. If the run takes the box's commander out instead, its slot is one of the 12 to 18 and the pair sits under its theme like any cut (G8).
7. **S1** shows Brudiclad on the commander row and adds a Commander fact (`Brudiclad · Rootha moves into the 99`). The head's own Start is unchanged: the box with Rootha.

## Not done this round
- The arrival on Your deck after Start is the shipped strip (S2); drawn in STATES only, with its body owed (DRAFT in the copy file).
- Amonkhet and other themes: not reviewed; frames use the announcements kit’s tokens, as the recent precon boards did.
