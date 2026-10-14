# States: Deck Stats card (b), PR 4b (R2)

Canvas ids in brackets. `README.md` carries the calls and the property table.

## Card states

| State | Canvas | Draws |
|---|---|---|
| populated, some color short | m1 (Gishath) | Butterfly; source bars solid then striped; legend `Land 49 · Mana rock, dork or land search 16`. |
| populated, balanced | m2 (Korvold) | As m1. |
| only lands make mana | m3 (Feather) | Every source bar solid, all corners rounded. The lands-only line replaces the legend. |
| tooltip open | m1 1300 | Tooltip under the header, two lines. At 390 it spans the card's width. |
| one color | n/a | As m1 or m3. The tooltip's first line leads `Every pip is {color}.` (R2 1d2's lead, moved). |
| no lands | n/a | Lands segment 0; non-land sources draw striped and fully rounded. With none either, every source is `0`, and the line under the bars reads `No lands yet, so no sources are counted.` (R2 1d3). |
| color unreadable | n/a | Not drawn and not counted. The tooltip's second line covers it. |

## Counting (what feeds the right side)

| Source | Counts toward | Drawn |
|---|---|---|
| land | each color it can add; fetch = basic types it fetches; any-color = each deck color (READINESS Q1) | solid |
| mana rock | each color it can add; any-color = each deck color | striped |
| colorless mana rock | C row | striped |
| mana dork | as a mana rock | striped |
| land search, named type | that type's color | striped |
| land search, "a basic land" | each color among the deck's basics | striped |
| ritual, Treasure | not a source | not drawn |
| ramp, color unreadable | not counted | not drawn |

Pips: plain symbol counts per copy from `manaNeeds()`. Hybrid pips follow `manaNeeds()`. No curve weighting.

## Interaction

| Control | Does | Hit target |
|---|---|---|
| ⓘ | opens the tooltip; tap again, tap outside or Esc closes | 44 at 390, 28 at 1300 |

## Announcements

The card is `role="figure"`, and its `aria-label` states the denominator (`104 pips · 65 sources`). Each row reads `Green, 52 pips, 50 percent; 21 sources, 15 lands and 6 others, 32 percent`. The stripe is never the only carrier of the split. The ⓘ is a `button` with `aria-expanded`. The tooltip is `role="tooltip"` and referenced by `aria-describedby` on the figure.
