# Gap report — friend decks PR 2 (a friend's deck, read-only)

Design-review verify pass against `docs/superpowers/design-tables/friend-decks-page.md`: every state REACHABLE, five
visual gaps, all resolved as the shared component as shipped. The handoff's call 1 makes this page "the open precon
page's anatomy, the app's one read-only deck list", so where the board's pixels and the shared component differ, the
component the precon page already renders wins: changing it here would make the two read-only lists drift, or move every
other surface that draws it.

| # | Element | Board | Shipped (shared) | Resolution |
|---|---|---|---|---|
| 1 | Head thumb border | 1px `--border-strong` | `CommanderThumb`'s `CARD_ART_RING` inset ring | As shipped: the precon page's thumb, same component and sizes (`open`, `openWide`). |
| 2 | Key line phone size | mono 10.5 | `MarkKey` 10 phone / 10.5 md | As shipped: every key in the app draws through `MarkKey`. |
| 3 | Key line gaps | 6 / 14 | `MarkKey` 5 / 12 | As shipped, as 2. |
| 4 | Group note size | mono 11 | `DecklistGroupHeader` 10.5 | As shipped: the precon page's group note. |
| 5 | Row height and printing column | 44 phone / 34 desktop; 66px desktop-only column | 34 at every width (AGENTS.md one-line card row); read-only `SET NUM` span | As shipped: the one-line card row rule; the precon page's read-only row. |

Copy wording is `/copy-review`'s and is not scored here. Contact sheet: `docs/superpowers/inventories/friend-decks.json`,
four rows at 390 and 1300, all reached.
