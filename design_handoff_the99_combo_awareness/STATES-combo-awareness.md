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

**The placement rule:** *on the decision hosts* — the Add panel and the Last-31 list — a mark with
a sentence leaves the name line and leads that sentence on the host's secondary line. **On the
browse hosts (`/collection` row and tile) there is no sentence:** the marker joins the shipped
marker cluster and the tooltip carries the name. One glyph is never drawn twice on one row.

> **Browse hosts get the marker; decision hosts get the sentence.**

## Matrix 1 — the collection row, `/collection` (rows view) *(revised — canvas `4a`)*

**The shipped row is one line:** `×N` · name · **marker cluster** · availability · pips · type · set ·
`›`. The combo mark joins the cluster that already carries the Game Changer bolt. **No clause on
this host** — the partner name is in the tooltip and the modal.

| State | 390px | desktop |
|---|---|---|
| **unmarked** | — | — |
| **Game Changer only** | bolt in the cluster, tooltip on hover | same |
| **state 1** | **lemniscate in the cluster**, 16×16, `--fact` | same, + tooltip on hover |
| **state 1 + Game Changer** | both markers, Round 1's fixed order, one cluster, **a tooltip each** | same |
| **state 1 + over-committed** | markers in the cluster; `◆ none free` unchanged in its own slot | same |
| **state 2 / 3** | **—** no deck in scope on this host | — |

**Row height, grid and every column unchanged — the row gains one 16px glyph and nothing else
moves.** The "mark moves down to lead a sentence" rule does not apply here: there is no second
line, and with no clause there is nothing to lead.

### The marker, to Game Changer's spec exactly

| | Value |
|---|---|
| size | **16×16**, `--fact`, 3px glow — identical to the bolt |
| position | the marker cluster after the name, Round 1's fixed order |
| target | **none.** `aria-hidden` glyph; the state is in the row's accessible name |
| tooltip | on hover, pointer-fine only — the bolt's chrome and register verbatim |
| touch | **no tooltip.** The row's own tap opens the modal, where every partner and state is listed — same as Game Changer today |

**Tooltip copy:** *"Two-card combo with Demonic Consultation. You own both."* — sentence case, full
stop, not mono, matching *"This card is on the Game Changer list."* Several partners:
*"Two-card combo with Demonic Consultation, and 3 others."* — a count of what the tooltip is not
naming, never a claim about what exists.

**The key needs no change.** The shipped legend already reads `⚡ game changer` … `∞ Two-card
combo`.

## Matrix 2 — the collection tile, `/collection` (card view) *(revised — canvas `4a`)*

The caption's **marker row** already holds an availability chip, fact markers and `SET · rarity`.
The lemniscate is one more 16px glyph in a row built for them.

| State | marker row | name line |
|---|---|---|
| **unmarked** | (chip) · `SET · rarity` | name |
| **Game Changer only** | (chip) · **⚡** · `SET · rarity` | name |
| **state 1** | **∞** · `SET · rarity` — **nothing yields** | name |
| **state 1 + Game Changer** | **⚡ ∞** · `SET · rarity` | name |
| **state 1 + chip** | `short 1` · **⚡ ∞** — `SET · rarity` drops **as it does today** | name · `×2` |
| **state 2 / 3** | **—** no deck in scope | — |

**The `SET · rarity` yield is withdrawn.** It was invented to make room for a ~100px partner name;
a 16px glyph needs no room. **Round 1's rule is restored whole: nothing yields.** Caption height
untouched.

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
`In your collection`, closed or open. Card fact → pair fact → copy facts. Chrome is
`AvailabilityDetail`'s verbatim. Absent entirely when nothing is detected.

### 6a — closed, the default

| | Desktop | 390px |
|---|---|---|
| height | **52px**, one row | **52px**, label and counts stacked |
| target | **the whole row**, one `<button>` | same |
| glyph | lemniscate 16px `--fact` | same |
| label | mono 10px `0.1em` uppercase `--fg-faint` | mono 9.5px |
| counts | mono 10.5px `--fg-muted`, **`N in this deck` in `--success`, always first** | mono 10px |
| chevron | `▾` mono 12px `--fg-faint`, right | same |
| `*` | **not drawn while closed** | same |
| zero count | **not drawn** — never `0 you own` | same |

**Closed at every count, including one.** The open state is **remembered per reader, not per
card**; closing it once turns it back off.

### 6b — scope

| Opened from | Heading | Scope line | Sayable states |
|---|---|---|---|
| a deck (decklist, Add panel, top-off list) | `Two-card combos` | `against Kykar, Wind's Fury` — **on the header row when open**, mono 10px `--fg-locked` | `in this deck` · `you own it` · `you don't own it` |
| `/collection`, or anywhere with no deck | `Two-card combos` | **—** | `you own it` · `you don't own it` |

**This is the only block in the modal that varies by route**, which is why it names its scope and
the others do not. **Closed, the counts occupy that slot; open, the scope line takes it over** —
so the block gains no chrome by opening.

### 6c — the line, open

| Part | Desktop | 390px |
|---|---|---|
| glyph | lemniscate **16px**, `--fact`, 3px glow | same |
| `with {partner}` | 13px `--fg-body`; name 600 `--fg`, **a link** | same |
| state | mono 10px, right-aligned | **wraps under the name** |
| state ink | `in this deck` `--success` · `you own it` `--fg-muted` · `you don't own it` `--fg-locked` | same |

### 6d — density

**All lines, no cap, no inner disclosure.** The 6/4 cap and the `+N more` / `Show all N` atoms are
withdrawn from this block — the closed row does the job they were invented for, and a reader who
asked for the list is not served by a second disclosure inside it.

| Partners | Closed | Open |
|---|---|---|
| 0 | block absent | block absent |
| 1 — **49% of pieces** | 52px row, `1 you own` | one line |
| 2 — **the median** | 52px row | two lines |
| 14 — **21 of 249 owned pieces exceed ten** | 52px row | fourteen lines |

**Ordering: `in this deck`, then owned, then unowned; popularity inside each band.**

### 6e — targets

| Element | Behaviour |
|---|---|
| the closed row | **one `<button>`, the whole row.** `aria-expanded`, `aria-controls`; accessible name is the label plus the counts as words. Focus stays on it. **No motion** on open. |
| partner name | **the only target on a line.** Opens the partner's modal, **replacing** the current one. Brass underline `1px --accent-shadow`, 44px hit area on phone. Never stacks. |
| the heading `*` | the bound, **open only**. Tooltip at 400ms on pointer-fine, **dismissible / hover-into because it holds a link**; **44px tap-to-disclose in place** on touch. A separate target inside the header button, not part of its name. |
| `Commander Spellbook ↗` | **inside the tooltip** — this card on Commander Spellbook, new tab, `rel="noopener"`. Plain text when no URL resolves. |
| the glyph | inert, `aria-hidden`, as everywhere else |
| the state words | inert. Not filters. |
| anything else | there is nothing else — no `add to deck`, no price, no copy count |

### 6f — the bound

`From Commander Spellbook ↗. Combos needing a third piece are not listed.` — **behind the heading's
brass `*`**, never printed under every block, with the source's own name as the link out. Round
1's tooltip chrome verbatim, wrapping to two lines. Still the only place in the feature it is said, and the reason the heading may carry no
count.

**Open with engineering (Hugh's question, see `ADDENDUM-modal-block.md`):** whether
`you don't own it` lines belong in this block at all. The closed row answers the height objection,
so the cut is now cheaper later than now — one filter on the ordering's tail, and the closed row's
counts change by themselves.

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
