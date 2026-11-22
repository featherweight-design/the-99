# States · You have a card a friend wants R3

## Tile press (friend's Wishlist tab)
| State | Draws |
|---|---|
| Reading your copies / read failed | Nothing (shipped tab). |
| No spare of it (none, or every copy in a deck, draft or kept back) | Nothing. |
| You can spare it | Box + spare glyph, `--fact`. |
| Spare, friend asked you (open) | Glyph + accent dot (`asked you`). |
| Spare, you offered (open) | Glyph + accent dot (`offered`). |
| Agreed (their yes to your offer, or your yes to their ask) | Glyph green + tick (`accepted`). |
| Declined / expired / withdrawn | Plain glyph. |
| Sheet open | Box ringed (`--accent` outline 2px, offset 2). |
| Any tile has a press | Every tile's wants line is 26px tall (no overlap with the name; even grid). |

## Call-out, filter and key (under the head)
| State | Draws |
|---|---|
| No spares | None of them. |
| N spares | Call-out row (no press): `You have N to spare`, names. B: `All · 9` / `You can spare · N`, All chosen. Key: only items drawn. |
| Filtered | `You can spare · N` chosen. The grid holds those N; head count unchanged. Not in the URL. |
| A spare leaves while filtered (an offer accepted elsewhere stays: it is still yours) | The tile stays until the next read. |

## Sheet rows
| Row | Right side | Foot |
|---|---|---|
| Spare, nothing open | **Offer** | Offer, and Colin answers yes or no. The trade (or the goat) is between you. |
| Offered | `Offered` + requested glyph; sub `14 days left` | Colin has been told. You’ll hear when they answer. |
| Friend asked you | Yes / No / days left | Colin asked you for it. Yes tells them it’s theirs. |
| Accepted | `Accepted` (success) | Colin said yes. Hand it over when you meet; ... |
| Declined | `Declined` | (Offer foot) |
| Write fails | Shared toast `We couldn’t send that. Try again.`, row unchanged | |
| No longer spare at write | Toast; the press leaves the tile | |

## /friends
- Chip with glyph + count before › when N ≥ 1; its own link to `/friends/{id}/wishlist`. Zero: nothing.
- The friend's Waiting on you: `Spare offer` row with Yes / No / days left, ✕ hides it (an ask's rules).
