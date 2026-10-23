# Gap report — combos one piece away, UI-2

Design review (property table `docs/superpowers/design-tables/combos-close-ui-2.md`, 183 rows) against the
implementation, 2026-10-22. Contact sheet: inventory `docs/superpowers/inventories/combos-close.json`, now with the
pushed detail for a spare and a to-buy combo, 18 of 18 cells at 390, 820 and 1300 on local-dev with
`NEAR_COMBOS_ENABLED` on.

**Verdict: 0 open gaps.** Two found and fixed (mutation-checked): the plates now run held pieces first and the
missing piece last (the read sorts by name, which put a missing "A…" first), and the turn-again mark now sits beside
the lemniscate in the detail's title for a loop of turns, as it does on the row.

## Accepted, with the reason

| # | Element | Design | Shipped | Why accepted |
|---|---|---|---|---|
| 1 | Phone grabber | 40x4 bar | none | The shared chrome has none (accepted in UI-1). |
| 2 | Close glyph | `✕` | `×` | The shared chrome's glyph (UI-1). |
| 3 | Plate gap at md | 5px | 6px | The shipped `ReceiptTile`, shared with the Analysis receipt, which must not move. |
| 4 | Plate name size at md | 11px | 10.5px | Same shared tile. |
| 5 | Steps field gap | 5px | 6px | The shipped `ComboBody` field, shared with the receipt. |
| 6 | Back and Esc | — | close the whole sheet; `←` returns to the list | One history entry per dialog; a second for the combo would have to be unwound by every way out. |
| 7 | Row press | the row | a div row with a chevron `<button>` as its keyboard press | Keeps the deck link a sibling, never a link inside a button. |
| 8 | Art | — | held pieces the deck's own art, the missing one the catalog's | The read carries the missing card's catalog row. |
| 9 | Plate's another-deck line | first deck | every holding deck, plain text | README G4: the detail lists them all; the plate is itself a press. |
| 10 | Title size | 16px at 1300 | the shipped 16/17px | The shipped `ComboBody` title. |
| 11 | Foot | pinned | scrolls with the body, inside `ComboBody` | The shipped body owns its foot. |
| 12 | Commander Spellbook link ink | `--accent` | `--accent-text` | The app's rule for accent TEXT (`accent-text-sites.test.ts`): `--accent` fails contrast as text in some themes. |
