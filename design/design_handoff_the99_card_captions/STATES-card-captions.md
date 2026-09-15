# STATES — card captions

Two matrices, **nine states × two widths** on the deck tile and **six on the collection tile**,
drawn at **178px desktop** and **175px phone**. `—` means the position draws nothing, which is a
state and not an omission.

**The caption is one chassis in every cell.** Two lines, fixed height — 46px desktop / 52px phone —
and what changes between states is only *which of the meta line's four positions is occupied*.

## The meta line's four positions

| Position | Occupant | Notes |
|---|---|---|
| 1 | **ownership dot** | `OwnershipDot`, 8px. Deck tile only — `/collection` lists what you own. |
| 2 | **the one slot** | `AvailabilityMarker density="chip"` *or* the collapsed `$` *or* `ProxyTag`'s `P`. Never two. Radius 4, `px 5 / py 1`, mono 9 / 8.5px — one box, three inks. |
| 3 | **the count** | `×N`, mono, absent at one copy. **Vacated by the draft pair.** |
| 4 | **right-aligned** | `SET · rarity` on `/collection` (set code alone at the phone). Empty on the deck tile. |

The name line holds the printed front-face name and, on the deck tile, `TwoFacedMark`. The `✕` is a
full-height right column, outside both lines.

## Matrix 1 — the deck tile, `/decks/[id]`

| State | dot | slot | count | name line | shell / caption |
|---|---|---|---|---|---|
| **owned** | filled `--success` | — (marker returns `null` at `free`) | — | name | flat |
| **unowned** | hollow, 1px dashed `--fg-locked` | **collapsed `$`** | — | name | flat |
| **multi-copy** | filled `--success` | — | `×2` | name | flat |
| **over-committed** | filled `--avail-hard-fg` | chip, over — doubled `--danger` diamonds, `short 1` | `×2` | name | **border tint** `--avail-over-border` |
| **two-faced** | filled `--success` | — | — | name · `//` | flat |
| **proxied** | **hollow, dashed** | **`P`** | **—** | name | flat, **no growth** |
| **draft-added** | filled `--success` | — | **`+1`** (accent, replaces `×N`) | name | **2px accent inset edge on the caption** |
| **draft-recounted** | filled `--success` | — | **`1 → 2`** (accent, replaces `×N`) | name | **2px accent inset edge on the caption** |
| **no-art** | per ownership | per availability | per count | name | art draws `--surface-sunken` + mono `no art`; **caption unchanged** |

**Committed** (owned, every copy claimed) is the same drawing as over-committed with a solid
`--avail-hard` diamond and `none free`, and no border tint. **Soft** (`N free`) is the same slot one
step quieter. Neither is listed separately: they are the chip's own ladder, and the caption does not
treat them specially.

**Three cells cannot occur and are not drawn.** A proxied card on Shopping (card view is All-only,
and `isShoppingCard` tests `proxied` first). The Shopping second-copy pair (it needs the full buy
tag beside a chip). Two slot occupants at once (`deckRowTag` returns one).

**Draft state and every other state are orthogonal.** A proxied card in a dirty draft draws the
caption edge *and* the `P` — one says *the draft touched this*, the other says *this deck's copy is
printed*. An over-committed card in a dirty draft draws the border tint *and* the caption edge,
which is exactly why the edge is not on the shell.

## Matrix 2 — the collection tile, `/collection`

No ownership dot and no `✕`. So **unowned, proxied, draft-added and draft-recounted cannot occur**
on this tile — three of the nine states are impossible by construction, not deferred.

| State | slot | count | right | name line |
|---|---|---|---|---|
| **owned** | — | — | `DSK · rare` | name |
| **multi-copy** | — | `×3` | `DSK · rare` | name |
| **soft** | chip, soft — hollow diamond, `2 free` | `×3` | `DSK · rare` | name |
| **committed** | chip, hard — solid diamond, `none free` | `×2` | `DSK · rare` | name |
| **over-committed** | chip, over — doubled diamonds, `short 1` | `×2` | `DSK · rare` | name · **border tint** |
| **no-art** | per availability | per count | `DSK · rare` | name; art draws the shipped identity gradient |

**The set line drops the rarity at the phone**, which is shipped behaviour
(`grid-view.tsx:110-111`) and is what keeps the meta line inside 175px.

**No `//` on this tile.** Spec errata 3 stands: there the set code is the fact that explains a
renamed front face.

## Geometry, both widths

| | Desktop 178px | Phone 175px |
|---|---|---|
| tile radius | 10px | 9px |
| art | 63/88, **no scrim**, `inset 0 0 0 1px rgba(0,0,0,0.25)` only | same |
| art height | 249px | 244px |
| caption height | **46px** fixed | **52px** fixed |
| meta line | mono 9.5px, 14px box, gap 6 | mono 9px |
| slot box | radius 4, `px 5 / py 1`, mono 9px | mono 8.5px |
| name | 13px / 600, one line, never clamped | 12px / 600 |
| `//` | mono 11px, gap 6 | mono 11px |
| caption pad | left 10px; right 3px with the `✕`, 10px without | left 9px; right 3 / 9px |
| `✕` | 32×32, tile-hover reveal | **44×44**, always drawn |
| tile total | **295px** | **296px** |
| draft edge | `inset 2px 0 0 0 --accent` on the caption | same |

## Tap targets

| Control | Phone | Desktop |
|---|---|---|
| tile art (modal trigger) | the whole art block | the whole art block |
| `✕` remove, deck tile | **44×44** | **32×32**, revealed on tile hover |
| collection tile | the whole tile, as shipped | the whole tile |
| chip / `$` / `P` / dot / `×N` / draft pair | **never a target** | **never a target** |

The `✕` keeps its floor because it is the only removal path in this view
(`deck-card-tile.tsx:215`). Nothing in this handoff takes a sub-floor exception.

## Colour is never the only carrier

| Fact | Colour | The other carrier |
|---|---|---|
| unowned | — (hollow) | **dashed** stroke, plus the `$` in the slot |
| committed | `--avail-hard-fg` | the words `none free`, and a solid diamond where hollow means soft |
| over-committed | `--avail-over-fg` + border tint | the words `short N`, and a **doubled** glyph |
| proxied | — (neutral skin) | the `P` **glyph**, the dashed edge, and the key's `P proxy` gloss (same word on both surfaces — `ADDENDUM-the-key.md`) |
| to buy → **not owned** on the tile | `--warning` | the `$` **glyph**, the tag's accessible name in full, and the card-view key's `$ not owned` — the row's key says `$ to buy`, which is a different set of cards |
| draft touched | `--accent` edge | the **pair** or the **signed figure** on the meta line |
| two-faced | — | the `//` **glyph**, plus `sr-only` "two-faced card" |

## Accessibility

- **The art is a `CardDetailTrigger`** whose `aria-label` replaces everything nested inside it, so
  every meta-line occupant sits **outside** the trigger's subtree — unchanged from the shipped tile,
  and now structurally obvious since nothing is on the art at all.
- **The chip keeps `spoken`.** Nothing wraps it; it carries its own prose.
- **`plate={false}` changes no string.** The collapsed `$`'s accessible name still carries the word
  and the price in full.
- **The draft pair is drawn and spoken.** `1 → 2` and `+1` are figures a reader must not have to
  infer from an edge colour — see the copy file for the two strings.
- **The caption name stays a plain `<span>` with no `title` and no `aria-label`** — an `aria-label`
  on a generic role is exposed to nothing. The full printed name is the trigger's, as shipped.
- Focus is the global `:focus-visible` — 2px brass at +2px offset, not overridden per surface.

## Zero net motion

Nothing in this handoff transitions or animates: not the caption edge when a draft opens, not the
slot when its occupant swaps, not the pair replacing the count. The `✕`'s hover colour change and
the tile's hover border swap are the shipped exceptions and are not motion.
