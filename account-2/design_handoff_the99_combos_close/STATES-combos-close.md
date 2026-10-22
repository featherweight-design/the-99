# Combos one piece away R1 — states

| # | Surface | State | Trigger | What shows |
|---|---|---|---|---|
| S1 | Deck page status line | Many | 2+ two-card combos, one piece missing, legal in the deck's colors | "∞ N combos one piece away ›" after the version (quiet strip) or in the to-do card's foot |
| S2 | Deck page status line | One | exactly 1 | "∞ 1 combo one piece away ›" |
| S3 | Deck page status line | None | 0 | no segment; the strip is the version alone |
| S4 | List sheet / modal | Many | S1 pressed | head "One piece away · N combos"; groups You own it (spare, then in another deck) and To buy (cheapest first); each row: lemniscate (+ turn-again mark for infinite turns), name, "with X", where-line, what it does, › |
| S5 | List row | Spare | a free copy (G3) | green dot "spare in your collection" |
| S6 | List row | In another deck | every copy held by other decks | green dot "in **HD - …**", deck name links to `/decks/{id}` (44px hit area) |
| S7 | List row | To buy | no copy | hollow ring + price tag |
| S8 | List row | Commander piece | the held piece is the commander | "commander" after its name |
| S9 | List sheet | Last one added | the last missing piece added from the combo detail | the sheet closes; the segment goes (no empty sheet) |
| S10 | Combo detail | To buy | a row pressed | ComboBody pushed ("← N combos"): plates with where-lines, chips, Mana needed, Steps, Needs; foot: Commander Spellbook ↗ bottom left, "Add X" bottom right |
| S11 | Combo detail | Owned | missing piece is a spare / in another deck | the same; only the plate's where-line changes |
| S12 | Combo detail | Plate pressed | a plate | shipped card details stacked ("← A + B") |
| S13 | Combo detail | No mana / unknown | `mana_needed` empty / missing | "No mana needed" / "Commander Spellbook doesn't say" (shipped) |
| S14 | Card details block | Closed | default | shipped counts "N in this deck · N you own · N you don't" |
| S15 | Card details block | Open | pressed | "against {deck}", groups Whole in this deck, One piece away · you hold the rest; each line opens the combo (S10) |
| S16 | About | Entry | `COMBOS_CLOSE_ENABLED` | `combos-one-away` on A deck · Your deck; halo on the segment |

Phone 390 uses the sheet; 1300 uses the modal. Depth is two: list or combo, then a card.
