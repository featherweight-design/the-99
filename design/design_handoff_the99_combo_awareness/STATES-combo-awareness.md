# STATES — combo awareness

Three states, three hosts, drawn at **390px** and at desktop. `—` means the position draws
nothing, which is a state and not an omission.

**The three states**

| # | Name | Sentence | Population |
|---|---|---|---|
| **1** | both halves owned, unassembled | `with {partner} — you own both` | 77 cards in a 2,805-card collection |
| **2** | deck is one away, you own the missing card | `completes with {partner}` | ~4 per deck |
| **3** | deck is one away, you'd buy it | `completes with {partner}` | ~37 per deck |

States 2 and 3 are **the same mark and the same string**. The difference is the row's shipped
ownership dot and its shipped `BuyTag`.

## The clause

| | Value |
|---|---|
| glyph | Round 2's lemniscate — stroked, 16px viewBox, `stroke-width 1.8`, `linecap round` |
| container | **none** |
| ink | `--fact` `#8FA6BE`, theme-independent; text `--fg-body` |
| glow | `filter: drop-shadow(0 0 2px color-mix(in oklab, var(--fact) 45%, transparent))` — outside the box model |
| glyph size | **12px** on every host. 16px in the modal block. |
| text | Plex Mono **10.5px** desktop · **9.5–10px** phone |
| truncation | the clause ellipses; the **partner name is the last thing to go** |
| target | never. Inert, glyph `aria-hidden`, state in the row's accessible name |

**The placement rule:** a mark **with** a sentence leaves the name line and leads that sentence on
the host's secondary line. A mark **without** one stays where Round 1 put it. One glyph is never
drawn twice on one row.

## Matrix 1 — the collection row, `/collection` (rows view)

| State | 390px | desktop |
|---|---|---|
| **unmarked** | — | — |
| **Round 2 fact only** | lemniscate on the **name line**, Round 1 order, type line intact | same |
| **state 1** | clause **replaces the type line**, tail shortened to `both yours` | clause replaces the type line, full tail `— you own both` |
| **state 1 + a Round 1 fact** | bolt stays on the name line; lemniscate downstairs with its sentence | same |
| **state 1 + over-committed** | clause on the type line; `◆◆ short 1` unchanged in its own slot | same |
| **state 2 / 3** | **—** no deck in scope on this host | — |

Row height, grid (`52px 1fr 90px 150px 92px 18px` desktop, `38px 1fr 76px auto` phone) and every
right-hand column are unchanged.

## Matrix 2 — the collection tile, `/collection` (card view)

| State | meta line | name line |
|---|---|---|
| **unmarked** | `SET · rarity` (or chip · `SET · rarity`) | name |
| **Round 2 fact only** | **∞** · `SET · rarity` — Round 1 unchanged | name |
| **state 1** | **∞** `with Demonic Consul…` — **`SET · rarity` yields** | name |
| **state 1 + chip** | `short 1` · **∞** `Demonic…` — chip keeps its slot, set yields | name · `×2` |
| **state 1, no art** | as above; art draws the identity gradient | name |
| **state 2 / 3** | **—** no deck in scope | — |

`CARD_TILE_CAPTION_H` (56/50px) unchanged, no third line, no data-dependent height. **The chip
never yields** — it is about your copies and so is the caption. **The bare fact never yields
anything**; the amendment is scoped to the state.

## Matrix 3 — the Consider tile, the deck Add panel

| State | type line | rest of the tile |
|---|---|---|
| **no combo** | `Instant`, ellipsed | unchanged |
| **state 2** | **∞** `completes with Isochron…` | dot filled `--success`; `Add` full width |
| **state 3** | **∞** `completes with Ghostly…` | dot dashed `--fg-locked`; `Add` + `BuyTag` share the row |
| **state 2/3, already in deck** | **—** the clause is absent | art `grayscale(.6) opacity .5`, `✓ In deck` |
| **state 1** | **—** severable, not drawn | — |

The evidence row (inclusion bar + figure) is untouched in every state.

## Matrix 4 — the quick-add result row

| State | 52px desktop / 56px phone |
|---|---|
| **no combo** | thumb · name · type line · dot · `↵ add` on the active row |
| **state 2** | clause **replaces the meta line**; dot filled; `↵ add` unchanged |
| **state 3** | clause replaces the meta line; dot dashed; `BuyTag` at the row's end |
| **the partner itself** | **—** it is in the deck: type line intact, `✓ In deck`, no mark |

**A mark on both halves would double the ink and halve the meaning.** The partner is the
sentence's object.

## Matrix 5 — the Last-31 candidate row

| State | desktop 34px | 390px 52px |
|---|---|---|
| **no combo** | tick · dot · name · pips · slot · synergy · inclusion | line 1 dot+name+slot, line 2 pips+synergy+inclusion |
| **state 2** | clause in the **name cell's tail**; availability slot **silent** | clause **leads line 2**; **pip track suppressed**; slot silent on line 1 |
| **state 3** | clause in the name cell's tail; `BuyTag` in the 84px slot | clause leads line 2, pips suppressed; `BuyTag` on line 1 |
| **state 2, copies all sleeved** | clause in the tail; `◆ none free` in the slot | clause leads line 2; marker on line 1 |
| **ticked** | fill `--elevated-hover`, border `--accent-shadow` — clause unchanged | same |
| **inert at cap** | row at 0.55 opacity — clause dims with it, says the same thing | same |
| **declined / illegal** | **—** the collapsed line carries no clause | same |

**Desktop:** the name goes `flex:none` and the clause takes `flex:1;min-width:0`, so the clause
ellipses before the name does. The four fixed columns do not move.
**Phone:** the pip track yields **only on rows that carry a clause** — ~4 of 38. The other 34 keep
their pips.

## Matrix 6 — the card modal *(revised by `ADDENDUM-modal-block.md`)*

Placement: **second in the oracle column's stack** — after `In the bracket rules`, before
`In your collection`. Card fact → pair fact → copy facts. Chrome is `AvailabilityDetail`'s
verbatim. Absent entirely when nothing is detected.

### 6a — scope

| Opened from | Heading | Scope line | Sayable states |
|---|---|---|---|
| a deck (decklist, Add panel, top-off list) | `Two-card combos` | `against Kykar, Wind's Fury` — mono 10px `--fg-locked` | `in this deck` · `you own it` · `you don't own it` |
| `/collection`, or anywhere with no deck | `Two-card combos` | **—** | `you own it` · `you don't own it` |

**This is the only block in the modal that varies by route**, which is why it names its scope and
the others do not.

### 6b — the line

| Part | Desktop | 390px |
|---|---|---|
| glyph | lemniscate **16px**, `--fact`, 3px glow | same |
| `with {partner}` | 13px `--fg-body`; name 600 `--fg`, **a link** | same |
| state | mono 10px, right-aligned | **wraps under the name** |
| state ink | `in this deck` `--success` · `you own it` `--fg-muted` · `you don't own it` `--fg-locked` | same |

### 6c — density

| Partners | Desktop | 390px |
|---|---|---|
| 0 | block absent | block absent |
| 1 | one line, no disclosure — **49% of pieces** | same |
| 2–4 | all, no disclosure — **median is 2** | all, no disclosure |
| 5–6 | all, no disclosure | 4 + `Show all N` |
| 7+ | 6 + `+N more` | 4 + `Show all N` |

Disclosure is the shipped atom: desktop dashed `--border-strong` chip, `+N more` mono 11px
`--accent`; phone full-width 44px dashed row, `Show all N` mono 12px `--accent`. **Expanded, the
block grows in place** — no inner scroller, no second surface. **21 of 249 owned pieces exceed
ten**, so this is the 8% case.

**Ordering: `in this deck`, then owned, then unowned; popularity inside each band.** The cap never
hides a partner already on the table in favour of one you would have to buy.

### 6d — targets

| Element | Behaviour |
|---|---|
| partner name | **the only target on a line.** Opens the partner's modal, **replacing** the current one. Brass underline `1px --accent-shadow`, 44px hit area on phone. Never stacks. |
| the heading `*` | the bound. Tooltip at 400ms on pointer-fine, **dismissible / hover-into because it holds a link**; **44px tap-to-disclose in place** on touch. `aria-describedby` on the block. |
| `Commander Spellbook ↗` | **inside the tooltip** — this card on Commander Spellbook, new tab, `rel="noopener"`. Plain text when no URL resolves. |
| the glyph | inert, `aria-hidden`, as everywhere else |
| the state words | inert. Not filters. |
| anything else | there is nothing else — no `add to deck`, no price, no copy count |

### 6e — the bound

`From Commander Spellbook ↗. Combos needing a third piece are not listed.` — **behind the heading's
brass `*`**, never printed under every block, with the source's own name as the link out. Round
1's tooltip chrome verbatim, wrapping to two lines. Still the only place in the feature it is said, and the reason the heading may carry no
count.

**Open with engineering (Hugh's question, see `ADDENDUM-modal-block.md`):** whether
`you don't own it` lines belong in this block at all. If they are cut, 6c and 6d are unchanged and
only the tail of the ordering disappears.

## Matrix 7 — the key (`MarkKey`)

| State | Entry |
|---|---|
| everywhere the key appears | `∞ two-card combo` — the glyph in `--fact`, lit, at 11px |

Round 2 adds this entry; this round does not change it. **The clause needs no key entry** — it is
a sentence in plain words.

## The empty case is the whole design for most cards

No host reserves width, height or a position for a combo state. An unmarked row is the row that
ships today, to the pixel. **Absence is not drawn:** detection is bounded by design (template-gated
variants excluded), so a drawn absence would read as a cleared check.

## Colour is never the only carrier

| Signal | Colour | The other carrier |
|---|---|---|
| a combo is in reach | `--fact` | the **lemniscate** silhouette, and the sentence |
| you own the missing card | dot `--success` | the **absence** of a buy tag, and the row's accessible name |
| you'd buy it | dot dashed, tag `--warning` | the word **`buy`** and the figure inside the tag |

## Accessibility

- **The glyph is `aria-hidden`.** The clause is real text and is read as written.
- **Collection row / tile:** the row's `<button>` gains one clause after the availability clause —
  *"completes a two-card combo with Isochron Scepter"*. On the tile, where the visible text is
  ellipsed, the accessible name carries the **full** partner name.
- **Last-31 row:** the whole row is the label; the clause joins it in reading order, after the
  name and before the money.
- **No `title`, no target, no focus, no tooltip.** The clause is inert like the `$`, the `P` and
  the `//`.
- **Live region unchanged.** A tick announcement does not gain a combo clause — one message per
  settle, as shipped.

## Zero net motion

Nothing transitions or animates: not the clause appearing, not the mark moving between lines on a
re-render, not the modal block mounting. The glow is a static shadow, never a pulse.
