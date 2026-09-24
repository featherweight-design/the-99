# States — deck notices

Frame `state` keys in brackets. Every state is drawn at 1300 and 390.

## Deck page

| # | Analysis | Dirty | Entries | Header tag | Tab body | Canvas |
|---|---|---|---|---|---|---|
| 1 | yes | no | none | — | ready | 5a `neither` |
| 2 | yes | yes | none | — | banner + credit note | 5b `dirty` |
| 3 | yes | no | data, unread | `● 3 notices` `--fact` | ready | 1a, 5c `notice` |
| 4 | yes | yes | data, unread | `● 3 notices` | banner + credit note | 5d `both` |
| 5 | yes | any | data, read | `3 notices` quiet | ready | 3a `read` |
| 6 | no | — | legality | `● Not legal`, in the chip's slot | empty state + legality note | 1b, 6a `legalNoChip` |
| 7 | yes | no | legality (+ data) | `● Not legal` | ready | 4b `legalChip` |
| 8 | yes | yes | legality | `● Not legal` | banner + legality note | 6b `checkBanner` |
| 9 | yes | any | legality | `● Not legal` | overview withheld | 6c `withheld` |

## Tile

| Entries | Tile | Canvas |
|---|---|---|
| none / data read | nothing | 1c |
| data unread | `● 3` after the chip | 1c |
| legality | `● Not legal` after the chip, or after the pill with no chip | 1c |

Every tile: the same 92px footer, the bar on its own line (HANDOFF §1a).

## Notices foot

| Deck | Foot |
|---|---|
| analyzed, not dirty | sentence + Re-analyze (no credit note: list unchanged) |
| analyzed, dirty | sentence + *Analysis tab →* (no button) |
| never analyzed | none (legality groups carry their own foot) |

## Transitions

- Open Notices → data entries read (tag quiet on the page, gone from the tile). Legality: dot off only.
- Re-analyze (from the banner or the foot) → data entries cleared; the tag goes, or shows legality alone.
- New entry published → the dot returns.
- A card that is not legal leaves the deck → its entry goes; the overview may be written again.
- The quiet rebuild after a deploy → nothing changes here (the mark does not advance).
