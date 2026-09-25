# Gap report: the stand-ins sheet's staple form (swap tools PR 6)

Checked row by row against `docs/superpowers/design-tables/swap-tools-staples-sheet.md`.

| Row | Result | Proof |
|---|---|---|
| Staples group, by price | MATCH | `rankStandIns` puts a buyable universal spell in `staples`, sorted by price; `stand-ins.test.ts` |
| Placement between free and the commander's | MATCH | `sheetModel` pushes it after `groupFree`; `sheet-model.test.ts`, and `probe:swap-sheet` checks the order on every spell sheet it opens |
| Fact line ends `staple, any commander` | MATCH | `sheet-model.test.ts`; `probe:swap-sheet` reads Sol Ring's row on Mana Vault's sheet at 1300 and 390 |
| A free staple stays free, with the clause | MATCH | both tests |
| The staples lead | MATCH | verbatim from the canvas's `staple` variant |
| One definition | MATCH | `isUniversal` comes from `loadUniversalStaples` in `gather.ts` |
| Lands unchanged | MATCH | the land branch is untouched |

One composed string, not drawn on the canvas: `leadSpellsStaplesUnlisted`, for a staples group with nothing
the index lists (F14 and H4 together). It joins the two drawn leads.

On local-dev the fixture accounts own Sol Ring and Arcane Signet free, so the probe's Sol Ring row lands in
`yours, free`; the paid group's order is asserted whenever a sheet draws it and is pinned by the unit tests.

VERDICT: 0 gaps.
