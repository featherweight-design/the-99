# STATES — commander availability

**Five readings × three geometries**, with the synergy row drawn at both widths. `—` means the
position draws nothing, which is a reading and not an omission.

**The dot is two states in every cell.** Filled `--success` when owned, hollow 1px dashed
`--fg-locked` when not. It never changes with severity again — that is what the marker is for.

## The marks

| Mark | Component | Drawn where |
|---|---|---|
| **dot** | `OwnershipDot owned` | leading position, all three geometries. 6px chip / 7px both rows |
| **marker** | `AvailabilityMarker density="row" nameless spoken={false}` | after the name on the chip and the coverage row; in the 88px slot on the desktop synergy row; on the meta line at phone |
| **priced tag** | `BuyTag variant="row" reserveSlot` | the synergy slot only — Role Coverage has no unowned row (ruling 6) |
| **container tint** | `#6B3226` border | the `over` reading only, all three geometries |

## Matrix — the five readings

| Reading | Role Coverage chip (desktop) | Role Coverage row (phone) | Synergy row (desktop) | Synergy row (phone) |
|---|---|---|---|---|
| **unowned** | **cannot occur** — `RoleCard` has no `owned` field | **cannot occur** | hollow dot · `buy · $4.50` in the slot | hollow dot · tag on the meta line after the figures |
| **free** | filled dot, nothing else | filled dot, nothing else | filled dot, **slot present and empty** | filled dot, meta line unchanged |
| **soft** | `◇ 1 in a brew`, mono 10.5 `--fg-body` | `◇ 1 in a brew`, mono 11.5 | marker in the slot, mono 11 | marker on the meta line, mono 10 |
| **hard** | `◆ none free`, `--avail-hard-fg` | `◆ none free` | marker in the slot | marker on the meta line |
| **over** | `◆◆ short 2`, `--avail-over-fg`, **border `#6B3226`** | same, **border `#6B3226`** | same, **border `#6B3226`** | same, **border `#6B3226`** |

**Two cells cannot occur and are not drawn.** Role Coverage is built from the owned pool at both
widths, so it has no unowned row to tag — ruling 6, not a deferral.

**No cell changes a height or a grid.** The chip stays 28px, the coverage row 44px, the synergy row
44px desktop / 52px phone. The chip's padding, radius and figure plate are untouched; the synergy
row's five shipped columns keep their widths and gain one 88px sibling before the toggle.

## The free reading, in full

| # | Position | Draws |
|---|---|---|
| F.1 | dot | filled `--success` — **exactly as it ships** |
| F.2 | marker | nothing. No glyph, no word, no empty span, no reserved width on the chip or the coverage row |
| F.3 | chip border | `color-mix(--success 40%, --bg)` — **exactly as it ships** |
| F.4 | coverage row border | `--border` — **exactly as it ships** |
| F.5 | synergy slot | 88px of nothing. The one reserved width in the design, and it is reserved on *every* row |
| F.6 | Role Coverage key | `● Owned and available.` — **today's string, byte-identical** |
| F.7 | sort menu | the `Availability` option is drawn and selectable; the sub-line stays true |
| F.8 | accessible names | `markerAria` returns `null`, so `chipAria` and `rowAria` produce the shipped strings byte for byte |

**A player whose collection covers their decks sees nothing new and nothing changed.** One pixel of
difference in the table above is a bug, not a variation.

## The key

| # | State | Key | Condition |
|---|---|---|---|
| K.1 | Role Coverage, no marker anywhere | `● Owned and available.` | `!anyMarker` |
| K.2 | Role Coverage, any marker on screen | `● Owned.` | `anyMarker` |
| K.3 | Role Coverage, no cards at all | nothing | shipped behaviour, unchanged |
| K.4 | Synergy panel | `● Owned.` · `○ Not owned.` | always |
| K.5 | — | ~~`Owned, already in a deck.`~~ | **deleted** |

`anyMarker` reads every card in all four role panels, not the chips a cap is showing — expanding a
panel must not change the key.

## Seam colours — the over glyph's 1px join

| Host | Seam |
|---|---|
| Role Coverage chip | `#221D16` (`--surface-raised`) |
| Role Coverage row (phone) | `#1E1A15` (`--surface`) |
| Synergy row, unselected | `#1E1A15` (`--surface`) |
| Synergy row, **selected** | `#211C15` (`--elevated-hover`) |

Built as a prop, never a constant. A seam in the wrong colour reads as a hairline crack rather than
as the join it is.

## Readings the design does not specify

| # | Gap | Note |
|---|---|---|
| G.1 | **Degraded availability read on this page** | Not drawn. Builder surfaces fail quiet (`card-availability.md` 10.5); Role Coverage already owns a note and the page's only Retry, for EDHREC. Whether an availability failure joins that note is open — see README gap 6 |
| G.2 | **`buy · sold out`** in the synergy slot | Falls out of `BuyTag`, but the 88px slot was measured against a four-figure price, not against the word |
| G.3 | **Loading** | Nothing renders until the value resolves. No skeleton, no placeholder — free is silent and there is no motion to reduce |
| G.4 | **Type column floor on the desktop synergy row** | Fixed columns now total ~382px; which column gives way first at the narrowest desktop panel is unruled |
| G.5 | **A commander whose own card is contended** | The hero, the receipt and "Why this commander" are out of scope (brief §6); `committedSupport` answers a different question and stays |
