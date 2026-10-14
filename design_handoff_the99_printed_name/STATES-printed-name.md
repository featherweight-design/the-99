# STATES — printed name

Two matrices plus the control state. `—` means the element draws nothing, which is a state and not
an omission. **Every state below is drawn on the canvas at both widths.** In all six themes: the
decklist row, the deck tile caption and the modal header pair. The collection grid tile and the
collection row caption are drawn once, at Low Sun — they introduce no theme-dependent ink beyond
`--fg` and `--fg-faint`, both of which the tile caption beside them already exercises in all six.

## The state definitions

| State | Data | Row / tile shows | Modal shows |
|---|---|---|---|
| **control** | `resolvedPrinting().name === oracle.name` | oracle name (= printed name) | title only; **oracle line absent** |
| **printed** | printing prints a different name, player owns it | **printed name alone** | printed name as title + `oracle` line |
| **printed, long** | as above, name exceeds the block | printed name, **end ellipsis** — row *and* tile | full printed name, no truncation |
| **two-faced** | either face renamed | **front face's printed name alone**; shipped `//` layout mark unchanged | `printed // printed` title + `oracle // oracle` line |
| **unowned** | not in the collection | **oracle name** (locked 2) | oracle name as title; **oracle line absent** |

**Unowned and printed cannot co-occur.** Without a printing in hand there is no printed name to
resolve, so the unowned row is the control row with a dashed dot and a `$`. This is the one place
the four states collapse to three.

## Matrix 1 — the decklist row

**Figures re-derived in R3** — R1's were wrong (fixed spend subtracted twice). Name text = block
minus the count.

| Width | name text | control | printed | printed, long | unowned |
|---|---|---|---|---|---|
| **400 desktop** | **174px, ~27 chars** | `Cultivate` · ×1 · track · ✕ | `Battle of Olympus` **fits, 66px spare** | clips above ~27 chars | `World at War` · `$` |
| **390 phone** | **175px, ~30 chars** | 52px, meta line | fits, 75px spare | clips above ~30 chars | `$` on the primary row |
| **320 phone** | **105px, ~18 chars** | 52px, meta line | fits, 5px spare | clips above ~18 chars | `$` on the primary row |

**No row clips the canonical example. The tight row is 320 with a count, not desktop** — the
ordering is not width-monotonic, because the phone row spends 44px on a touch-target ✕ out of a
smaller budget. **The tightest surface on the feature is the deck tile caption at 93–94px**, matrix
2. See `DENSITY-the-longer-name.md`.

## Matrix 2 — tiles and captions

**Reissued in R2.** R1 rested this matrix on a two-line clamp that does not exist —
`deck-card-tile.tsx:186` and `collection/grid-view.tsx:88` are single-line truncate, and
`suggestion-tile.tsx:296` is a different surface. **The tile is the tightest surface on the
feature, not the roomiest.**

| Surface | caption width | control | printed | printed, long |
|---|---|---|---|---|
| **deck grid tile, 148 desktop** | **132** (✕ moves to the art corner) | name | printed name | **single line, end ellipsis** at ~23 chars |
| **deck grid tile, 159 phone** | **143** (✕ moves to the art corner) | name | printed name | single line, end ellipsis at ~25 chars |
| **collection grid tile, 148** | 132 | name + `M21 · 177` | printed name + `SLD · 2208` | single line, end ellipsis at ~23 chars |
| **collection row, 390** | 202 | name + type · set · number | printed name + `SLD · 2208` | single line, end ellipsis |

**If the ✕ move is not sanctioned**, the deck tile's caption stays at **94 / 93px** (~16–17 chars),
where `Battle of Olympus` itself clips, and every other cell of this matrix is unchanged — the ruling is single-line either way.

**One rule now covers the row and the tile: single line, end ellipsis, full name in `aria-label`,
recovery is the modal.** R1 gave the tile the softer behaviour on the strength of a clamp that was
not there; with the clamp gone, the two surfaces have the same problem and get the same answer.
**No clamp is added** — see README call 3 for why equal-height tiles outrank ~12 characters.

## Matrix 2b — the tile's other controls

| Element | R1 (as shipped) | R2 |
|---|---|---|
| **✕ remove**, deck tile | in the caption line, 32/44px | **art block, top-left corner**, 32/44px, same hover rule |
| `×2` count chip | art block, top-right | unchanged |
| availability chip | art block, top-left | **moves to top-right, under the count** — the ✕ takes the corner |
| **`title` attribute** | `title={card.name}`, line 188 | **removed** |
| `aria-label` | — | **full printed name**, untruncated |

## Matrix 3 — the modal header

| Element | control | printed | unowned |
|---|---|---|---|
| title | oracle name, display face 29/22px | **printed name**, same size | oracle name |
| oracle line | **absent** — no reserved height | `oracle` 10.5px mono `--fg-faint` + name 13.5/13px `--fg-body` | **absent** |
| gap, title → next line | 6px (type line) | **5/6px** (oracle line), then **10px** to the type line | 6px |
| type line | 14/13px `--fg-muted` | unchanged, pushed down 23px | unchanged |
| rules block, identity, printing, you own | unchanged | unchanged | unchanged |
| `aria-labelledby` | the title | **the title** (= printed name) | the title |

## Tap targets

Nothing in this addendum is a target, and nothing existing changes.

| Control | Phone | Desktop |
|---|---|---|
| card name (modal trigger) | rides the row's height | rides the row's height |
| **the oracle-name line** | **never a target** | **never a target** |
| ✕ remove, **deck tile art corner** *(R2)* | 44×44 | 32×32, group-hover |
| ✕ remove, row | 44×44 | inline, group-hover |
| ✕ remove, tile caption | 44×44 | 32×32 |
| tile art (modal trigger) | whole art block | whole art block |

The oracle name is **not a link** — not to the printing picker, not to a search. It is a fact about
which card this is, and the picker is already reachable from the printing field.

## Colour is never the only carrier

| Fact | Colour | The other carrier |
|---|---|---|
| this name is a printing's name | **none** | the modal's `oracle` line, and the `Set` field naming set + number |
| the name is truncated | **none** | the **ellipsis**, plus the full string in the row's *and tile's* `aria-label` |
| the card has a back face | **none** | the shipped `//` **layout mark**; the modal title's full `//` string |
| oracle name vs type line | `--fg-body` vs `--fg-muted` (one step) | the **`oracle` label**, and the 5px/10px gap grouping |

**No new token and no new hex in any theme.** The only per-theme check is the display face against
the body face at 22–29px over 13.5px; Cormorant Garamond and Trirong are the two that could read as
one voice with Plex Sans, and at 600 they do not.

## Accessibility

- **The row's `aria-label` carries the full printed name**, untruncated, always. No `title`.
- **The modal announces the printed name as its label** (`aria-labelledby` on the title,
  unchanged). The oracle line is ordinary text in reading order directly after it, so a screen
  reader gets `Battle of Olympus — oracle, World at War — Sorcery` in one pass.
- **The `oracle` label is real text, not an `aria-label` on the name.** A visually hidden
  explanation and a visible unexplained name is the sighted reader getting less than the
  screen-reader user.
- **The deck tile loses its `title` and gains an `aria-label`** (R2). The tooltip was
  pointer-only; the label is universal and never truncated.
- **A two-faced card announces the front face on the row and both faces in the modal.** The `//`
  layout mark is decorative and `aria-hidden`, as shipped.
- **No live region.** Nothing here changes after render.
- Focus is the global `:focus-visible` — 2px brass at +2px offset, not overridden.

## Zero net motion

No transition, no animation, no reflow on any element in this addendum. The oracle line is present
or absent at render; it never appears, expands or fades. Locked constraint, card-availability design
row 3.7.
