# ADDENDUM — the key in card view

**Answers erratum 7 of `docs/superpowers/readiness-card-captions.md`, which withdrew ledger item 9
and carried it back to Design.** Read on `main`. This addendum reinstates it, in a narrower form
than the handoff originally asked for.

**The call in one line:** *card view gets a key — the same component, in the same slot, with the
tile's own word for `$` and the list's word for `P`.*

**Not a new folder and not a new component.** One string, one prop, one branch, and nothing drawn
that this app does not already ship.

## The ruling

| | |
|---|---|
| **Shape** | A second `MarkKey` instance, not a second legend. It already takes its marks as data. |
| **Entries** | `$ not owned` · `P proxy` — **one word differs from the list's, and it is the word the tile already speaks.** |
| **Placement** | Under the group toolbar, above the first tile, in the container `decklist.tsx` already renders on the primary view. **Card view needs no placement; it needs the guard to stop emptying the one it has.** |
| **Absence** | Unchanged: nothing when the view holds neither mark, which on a fully-owned deck with no proxies is most of the time. |
| **Region label** | A sibling string, `regionAriaCards`. `regionAria` is not edited — the list still has rows. |

## Why shared copy is refused, and it is correctness rather than taste

Erratum 7 frames the clash as two vocabularies for one glyph. The sharper version is that **the two
glyphs mark two different sets of cards**:

| Surface | `$` is drawn when | So the true word is |
|---|---|---|
| decklist row | the card is unowned **or** spoken-for (`deckRowTag`, with Shopping's `isSpokenFor`) | `to buy` — the shop |
| card tile | the card is unowned, full stop (`card.owned` is false) | `not owned` — a floor |

A spoken-for card **is owned**, so `not owned` is false of it. An unowned card in a deck nobody is
shopping is not `to buy`. **No single word is true of both sets**, so shared copy is not a
compromise available to be taken — one of the two surfaces would have to start lying. And the row's
word *ships today*, which makes changing it the one move in this whole handoff that can regress a
live surface.

**`P` keeps its word on both**, because `deckRowTag` is the same function on both surfaces and the
set is identical. That is the finding that shrinks this question: **the divergence is one word wide,
not a vocabulary wide.** Two keys that differ by one entry, each true of the rows or cards beneath
it, are not a third vocabulary — they are the system `MarkKey`'s header describes, instantiated
twice.

## Why "no legend" is not available

The guard's own comment says the card view's marks carry their own words, and they do —
`ProxyTag`'s `aria` and the tile's `label={cardTileCopy.slotUnownedAria}`. **Count the carriers for a
sighted reader on a phone and there are none.**

`proxies.ts` sets the standard this is held to: the word lives in **three** places — the key, the
mark's `title`, its accessible name — and *"three carriers, never one: a one-character mark is only
safe for a fact the app must not be vague about if the word is reachable three ways."* Withdraw the
key in card view and a mark has two: `title`, which is a pointer affordance, and the accessible
name, which reaches a screen reader. **A sighted phone reader gets neither, and card view is the
view the phone is most likely to be in.**

`MarkKey`'s header is the other half: *"a glyph identifies and cannot teach, so something on the
surface has to say the word"* — and colour cannot teach it either, since the token contract's four
hue families are all booked. **"No legend" is not a ruling this system can hold.** It is the list
view's own rule suspended on the view where the marks are smallest.

## What the entries decode, and what they do not

**The key decodes glyphs.** That boundary is what keeps it to two entries:

| Drawn on the tile | In the key | Why |
|---|---|---|
| `$` | **yes** — `not owned` | one character, and the tile's only statement of the fact |
| `P` | **yes** — `proxy` | one character; same set as the row, so the same word |
| availability chip | no | it is already words — `none free`, `short 1`. §17 forbids reducing it to a glyph, which is the same rule read forward |
| `×N` | no | a figure that reads as itself |
| `1 → 2` / `+N` | no | figures, and the draft's sighted decoder is the `N changed in this draft` caption, which renders on **both** views since call B |
| ownership dot | no | not in the list's key either; out of scope and deliberately consistent with it |

## Placement, both widths

Nothing new. The container is `px-[16px] pt-[12px] md:px-[26px] md:pt-[14px] empty:hidden`,
immediately under `GroupToggle` and above the grid — the same one the list view's key sits in, on the
same primary-view render path. It **wraps rather than scrolls**, as it already does.

| | Desktop | Phone (390px) |
|---|---|---|
| key type | mono 10.5px `--fg-faint` | mono 10px |
| samples | canonical row variant — mono 9px, `px-[5px] py-[1px]`, radius 4, outline at `-1px` | mono 8.5px |
| two entries measure | ~185px of a 1300px pane | ~150px of 358px of track — **one line** |
| gap to the first tile row | 12px | 12px |

**The samples are unchanged and are not redrawn.** Erratum 3 found the tile's `$` and the band `P`
already byte-identical to the row's box, and the caption normalizes to those same figures — so the
key's existing canonical sample matches what the caption beneath it draws, on both surfaces, with no
new variant.

## Rejected

- **Shared copy, either direction.** `to buy` over tiles tells a player to buy a card they may be
  proxying or already own. `not owned` over Shopping rows is false of every spoken-for row there.
- **A third word both could share** — `no copy`, `money`. This is erratum 7's third vocabulary
  arrived at honestly: two true words replaced by one vaguer one, and the row loses the shop.
- **A card-view-specific component.** The key is "the surface every future mark is added to". A
  second instance is an argument, not a fork.
- **A fourth entry for the draft mark.** The caption above the grid already says it in words.
- **Editing `key.regionAria`.** The list still has rows. A sibling, not a rewrite.

## Ledger item 9, reinstated

| # | Change | Kind |
|---|---|---|
| 9a | **`proxies.ts`** — add `key.regionAriaCards`: `"What the marks on these cards mean"`. **Cards, not tiles**: the reader is looking at cards, and no string in this app names an internal noun. | additive |
| 9b | **`mark-key.tsx`** — take the region label as data like its marks: `regionAria?: string`, defaulting to `proxyCopy.key.regionAria`. No other change. | additive |
| 9c | **`decklist.tsx:198`** — the `if (view === "card") return []` guard becomes a branch. Same two tests; the buy entry's `word` is `cardTileCopy.slotUnownedAria` instead of `proxyCopy.key.buy`. Samples unchanged. The stale comment above it is replaced by this addendum's reasoning in the same PR. | swap |
| 9d | **Container** — none. | — |

**Unblocked today**, and independent of every other ledger item: it reads `deckRowTag` and
`card.owned`, both of which ship. It does not wait on the caption work, and the caption work does not
wait on it.

**When the about page lands**, `key.about` opens its door in both instances at once — which is the
whole reason this is an entry table and not a second legend.
