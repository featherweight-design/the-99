# Readiness — combos one piece away

**Verdict: Green.** Approved by Hugh 2026-10-22 (R1b). Nothing below blocks the build.

## Ruled

1. One-away is a status-line segment, "∞ N combos one piece away ›": the to-do card's foot, or the quiet strip. No segment at zero.
2. The press opens a sheet (390) / modal (1300) in the pass sheet's chrome, grouped You own it (spare, then another deck) and To buy (cheapest first). Adding the last one closes the sheet; there is no empty sheet (R1b).
3. "In HD - X": the deck name links to `/decks/{id}` with a 44px hit area; the rest of the row opens the combo.
4. The combo detail is the shipped `ComboBody`, pushed inside the sheet ("← N combos"), each plate saying where that piece is. Foot (R1b): Commander Spellbook ↗ bottom left, a compact "Add {card}" bottom right; no "missing piece" line and no "· to buy".
5. Card details: the shipped block's lines gain the where-line and open the combo; the partner's card opens from its plate (accepted).
6. A deck-level count on the deck page (accepted).

## For engineering

1. G1: steps and mana are stored (`spellbook_variants`); `pairsWithOnePiece` must select them. Confirm no new storage.
2. G3/G4: spare vs another deck follows availability (spare wins); several decks: the row names the first committed, the detail lists all.
3. G5: §4.3b rule 2 holds. G6: bracket marks only. G7: computed on the deck page's read.
4. The list's rows and the card details lines open the combo; a plate opens the shipped card details stacked via `registerSheet`. Depth stays two.
5. About: `combos-one-away` (`about · combos one piece away.ts`), one `ABOUT_VERSION` bump (18 if the menu and Home line ships 17 first), the `combo-awareness` key 1 edit, and the G8 recapture of `deck-your-deck` in all six themes with a `[data-combos-close]` locator.
6. A new switch, `COMBOS_CLOSE_ENABLED`, in `src/lib/switches/registry.ts`.

Every new string is a placeholder for `/copy-review`.
