# STATES — card rows, six by two by four

Every cell below is the row **after** the ruling. Desktop is 720px of a wider column; phone is
375px. `—` means the slot draws nothing, which is a state and not an omission.

## The state definitions

| State | Data | Dot | Availability slot | Shell |
|---|---|---|---|---|
| **owned** | in the collection, no finished deck claims a copy | filled `--success` | — (marker returns `null` at `free`) | flat |
| **unowned** | not in the collection | hollow, 1px dashed `--fg-locked` | `BuyTag` | flat |
| **committed** | owned; every copy claimed by a finished deck | filled `--avail-hard-fg` | marker, hard — solid `--avail-hard` diamond, label `--avail-hard-fg` | flat |
| **over-committed** | demand across finished decks exceeds copies owned | filled `--avail-hard-fg` | marker, over — doubled `--danger` diamonds, label `--avail-over-fg` | `inset 0 0 0 1px --avail-over-border` |

The fifth state, **soft** (`N free`), is not drawn per row: it is the same slot occupant one step
quieter — hollow 1.5px `--avail-soft` diamond, label `--fg-body` — and no row treats it specially.

**Labels are count-only** on every row except `card-search-row` desktop, which has room for the
clause and no enclosing control. `none free` / `short 1`, never `short 1 — also in Atraxa`, per
#354.

## The matrix

| Row | owned | unowned | committed | over-committed |
|---|---|---|---|---|
| `collection/rows-view.tsx` | `×1` · pips · name · type · set › | **impossible** — /collection lists what you own | + `none free` inline after the name, 8.5px mono | + `short 1`, inset ring |
| `decks/decklist-row.tsx` | dot · name `×2` · ✕ | dashed dot · `buy` | committed dot · `none free` | committed dot · `short 1` · `2nd copy` · inset ring |
| `decks/card-search-row.tsx` | thumb · name · type · cost · `×1 owned` · + | `not owned` in `--warning` | + `none free — in Atraxa` desktop / `none free` phone | + `short 1` |
| `decks/unresolved-row.tsx` | **exempt — no oracle id.** One drawing per width; the four states do not apply | | | |
| `decks/update-diff-row.tsx` | dot · name · `auto` · type · `Keep` | dashed dot · `BuyTag` | committed dot · `none free` **(new)** | committed dot · `short 1`, inset ring **(new)** |
| `commanders/synergy-row.tsx` | shared dot, filled | **dashed** — was a solid ring | committed dot (ships today) | **slice B** — no data path on this route |

Two cells are impossible by construction. One is deferred. Twenty-one are drawn.

## Per-row geometry, both widths

All six use radius **7px**, `--row-bg` tracking the hover swap, and the inset ring for
over-committed.

| Row | Desktop | Phone |
|---|---|---|
| `rows-view` | grid `52 54 1fr 150 92 18`, 44px, pad `12px 18px`, gap 16 | grid `38 40 1fr auto`, 56px (two lines), pad `10px 12px`, gap 10 |
| `decklist-row` | flex, 34px, pad `9px`, gap 10 | flex, 44px (52px with a meta line), pad `8px / 4px`, gap 9 |
| `card-search-row` | flex, 56px (30×42 thumb), pad `9px`, gap 12 | flex, 62px (32×45 thumb), pad `8px / 4px`, gap 9 |
| `unresolved-row` | flex, 44px, pad `6px 9px`, gap 10 | flex, 44px, pad `6px 8px`, gap 9 |
| `update-diff-row` | flex, 44px, pad `0 6px 0 12px`, gap 10 | flex, 44px, pad `0 6px 0 12px`, gap 9 |
| `synergy-row` | flex, 44px, pad `0 6px 0 12px`, gap 10 | flex, 52px (meta line), pad `0 6px 0 12px`, gap 9 |

The two rows taller than 44px on desktop are the two with a card thumbnail or a two-line cell. That
is the meta-line exception, not a third size.

## Tap targets

| Control | Phone | Desktop |
|---|---|---|
| whole row (browse, unresolved, search) | ≥44px | — |
| card name (modal trigger) | rides the row's height | rides the row's height |
| `✕` remove | 44×44 (glyph stays 13px; the padding is the target) | inline, group-hover |
| `+` add / toggle | 44×44 | 34×34 |
| `Keep` | 64×38 | 64×34 |

**The marker is never a tap target** and has no hover, no focus ring and no `title` — design table
row 3.6, unchanged. A clipped name stays clipped for the eye; the full name reaches the reader
through the row's accessible name.

## Colour is never the only carrier

| Fact | Colour | The other carrier |
|---|---|---|
| unowned | — (hollow) | **dashed** stroke, plus `BuyTag`'s word, plus `not owned` on the search row |
| committed | `--avail-hard-fg` | the label `none free`, and a solid diamond where hollow means soft |
| over-committed | `--avail-over-fg` + ring | the label `short N`, and a **doubled** glyph |
| unmatched line | `--warning` | the `?`, the `unmatched` tag, and an `sr-only` "unmatched line" |

## Accessibility, unchanged by this handoff

- **Rows with a row-level `aria-label` hoist the marker's prose into it** (`rows-view`,
  `synergy-row`). Rows without one let the marker speak for itself with `spoken`
  (`decklist-row`). The two comboboxes leave it off — `role="option"` already replaces everything
  beneath it.
- The dot is `aria-hidden` wherever adjacent text conveys ownership, and labelled where it does
  not. The **committed** state adds one string to that set (see `card-rows · copy strings.ts`).
- Focus is the global `:focus-visible` — 2px brass at +2px offset, not overridden per row.

## Zero net motion

No transition and no animation on any of the six shells, the dot, or the marker. Locked constraint,
card-availability design row 3.7, and this handoff adds nothing that would need one — a hover
background swap is not motion.
