# Design property table: the stand-ins sheet's staple form (swap tools PR 6, H4)

Source: `design/design_handoff_the99_swap_tools/addendum_staples_door_stacking/` — `ADDENDUM-README.md` §1
(Stand-ins) and the `staple` variant of `Stand-ins Sheet.dc.html`. The variant draws with the sheet's own
group heading and row, so nothing here is a new style: every visual property is the base sheet's, already
in `docs/superpowers/design-tables/swap-tools-sheet.md`.

## Structure

| Element | Design | Copy key |
|---|---|---|
| A paid universal staple's group | its own group, `to buy · staples, cheapest first`, ordered by price | `sheet.groupStaples` |
| Where the group sits | after `yours, free`, before `to buy · by {cmdr} decks` | — |
| A staple's fact line | `{role} · MV {n} · staple, any commander`, never `in N% of {cmdr} decks` | `sheet.stapleFact` |
| A free staple | stays in `yours, free`, with the same clause | `sheet.stapleFact` |
| The lead, when a staples group is drawn | `… Free copies come first, then staples, then the cards {cmdr} decks favor most over other decks of their colors.` (v2 PR B: the order is the commander's synergy) | `sheet.leadSpellsStaples` |
| Which staples | the one definition, `loadUniversalStaples` (F18); no names hard-coded | — |
| Lands and fetches | `to buy · best mana first`, on the ladder (v2 PR B): rung, then synergy, then price | `sheet.groupCheapest` |

## State coverage

| State | Trigger | Rendered |
|---|---|---|
| Staples to buy, and listed spells | a stocked universal staple under the original's price, not free | free / staples / by commander / unlisted; the staples lead |
| Staples to buy, nothing listed (F14) | as above, with `byCommander` empty | free / staples / unlisted; `leadSpellsStaplesUnlisted` |
| Free staple only | the staple has a free copy | free / by commander / unlisted; the plain lead; the row's staple clause |
| No staple | no universal stand-in | unchanged |
