# Gap report — friend decks PR 3 (a friend's tile)

Verified against `docs/superpowers/design-tables/friend-decks-tiles.md` and the contact sheet
(`docs/superpowers/inventories/friend-decks.json`, rows `decks-tab` and `decks-tab-press`, 390 and 1300, all reached).
Every row matches but the four below, all values the board draws inside the band that `DeckTileArt` (extracted from the
owner's `/decks` tile, imported by both tiles) already draws its own way. Call 6 makes the friend's tile "the /decks tile,
read-only", so the shared band wins over the board's pixels: changing it would change the owner's tile too.

| # | Element | Board | Shipped (shared `DeckTileArt`) | Resolution |
|---|---|---|---|---|
| 1 | Crop position | `center 30%` | `ArtWash` cover, `center top` | As shipped (shared). |
| 2 | Wash | fixed 52/72/92% stops | `ArtWash`'s computed bottom scrim | As shipped (shared). |
| 3 | Text shadows | 6px name, 4px line | `INK_SHADOW` | As shipped (shared). |
| 4 | Label right padding | 48 | 56 phone / 48 from `sm` (clears the owner's ⋯) | As shipped (shared). |

G5: with no art crop the band draws the commander gradient (`ArtWash`'s own null branch); the friend tile never draws
the full card image. Jaws (its only printing's crop carries frame text) is Design's prompt 14.
