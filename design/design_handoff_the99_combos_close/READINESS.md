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

## Engineering audit against main (2026-10-22)

Audited against `origin/main` at 9817bdc1c and the backend PR in review (#2215, plan
`docs/superpowers/plans/2026-10-22-near-combos-backend.md`). **Verdict stands: Green.** The
drawings need no change; the rows below are errata for the next design round, not a round of
their own.

Verified as written: `ComboBody` (`src/components/decks/receipt-modal.tsx`), `registerSheet`
(`card-detail-provider.tsx`), the `combo-awareness` and `deck-your-deck` About keys
(`scripts/lib/about-locators.mjs`), §4.3b rule 2 (G5: a command-zone-only piece is never offered,
`addableMissingPiece`), G3's spare rule (availability's `free > 0`, spare wins), and G1's premise:
steps and mana ARE stored, for every variant, by #820.

### Errata

| # | Handoff says | Main / the backend says | Effect on the build |
|---|---|---|---|
| E1 | G1: `pairsWithOnePiece` must select steps and mana | The deck's read is `loadNearCombos` (`src/lib/combos/near-combos.ts`, #2215), which already carries `steps`, `manaNeeded`, `manaValueNeeded` and `notablePrerequisites`. `pairsWithOnePiece` is unchanged. | None: the UI reads `loadNearCombos`. |
| E2 | For engineering 6 and G8: a new switch `COMBOS_CLOSE_ENABLED` | The switch is `NEAR_COMBOS_ENABLED` (#2215), unset in production and in `ALL_FEATURES_EXCLUDED` until this line's close-out. | G8's recapture runs with `NEAR_COMBOS_ENABLED` on. |
| E3 | G2: two-card only; the foot reads "Two-card combos legal in this deck's colors" | The backend read covers 2 to 6 pieces (the Overview's definition, approved through d9). | The UI asks for two-piece combos only, so G2 and the foot hold as drawn; widening is a later call. |
| E4 | G4: the row names "the first committed" deck | `elsewhere` names the decks holding a copy (`hardDecks`: committed decks and reserved brews, never a draft that only asks), in the availability query's order. | The UI build adds which of those is committed, so the row can name the first committed one. |
| E5 | About: `ABOUT_VERSION` 18 "if the menu and Home line ships 17 first" | Main is at 16 today. | The close-out bumps to whatever is next at that time. |
