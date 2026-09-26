# Design property table: the stand-ins sheet's staple form (swap tools PR 6, H4)

Source: `design/design_handoff_the99_swap_tools/addendum_staples_door_stacking/` — `ADDENDUM-README.md` §1
(Stand-ins) and the `staple` variant of `Stand-ins Sheet.dc.html`. The variant draws with the sheet's own
group heading and row, so nothing here is a new style: every visual property is the base sheet's, already
in `docs/superpowers/design-tables/swap-tools-sheet.md`.

## Structure

**Superseded in part by v2 D1** (the ranking-rebuild addendum §1b, audited in `READINESS-audit.md`): the
staples group is retired. A staple now sorts LAST in its type group, free or not. Since E2 (stand-in row
addendum 3a) it is marked by the word `staple` in its comparison's type slot rather than a
`staple, any commander` clause. The rows below marked *retired* describe #997's shipped form.

| Element | Design | Copy key |
|---|---|---|
| A paid universal staple's group | *retired (v2 D1)*: last in its type group, never cut by the group cap | — |
| Where the group sits | *retired (v2 D1)* | — |
| A staple's comparison | `{type · }staple` in the type slot (mono 10.5, `--fg-muted`), then `KEEPS … GAINS … LOSES …` as any spell row (E2, addendum 3a); never `in N% of {cmdr} decks` | `sheet.compare.staple` |
| A free staple | last in its type group like any staple, with the same mark | `sheet.compare.staple` |
| The lead, when a staple is listed | its last sentence: `Staples every commander plays come last.` (v2 D1) | `sheet.leadSpellsStaples` |
| Which staples | the one definition, `loadUniversalStaples` (F18); no names hard-coded | — |
| Lands and fetches | `same type · lands`, `best mana first`: on the ladder, then synergy, then price (v2 D1) | `sheet.groupSameType`, `sheet.orderBestMana` |

## State coverage

| State | Trigger | Rendered |
|---|---|---|
| A staple listed (v2 D1) | a universal staple, free or stocked under the original's price | the type groups, the staple last in its own; the lead ends `leadSpellsStaples` |
| Nothing listed (F14) | as above, no card the index lists | `leadSpellsOrderUnlisted(card)`, then `leadSpellsStaples` |
| No staple | no universal stand-in | unchanged |
