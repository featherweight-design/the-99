# STATES — the deck list's sort trigger

R1 · one control, one row, two widths. Fixture throughout: **HD Tune at 68 / 99** — 40 untouched
`auto` rows, 28 the player's, 12 unowned, no draft. Drawn in the canvas: D1–D4 at 1300px, P1–P4 at
390px, the trigger at rest / open / chosen, both popovers and the sheet.

The row is `GroupToggle` (`group-toggle.tsx`), one `flex-wrap` row inside a container padded
`16/9` at phone and `26/14/10` on desktop, gap `7px` / `10px`.

---

## The three clusters

The row wraps **between clusters and never inside one**. Each cluster is a `flex-none` child that
is itself a nowrap flex row.

| Cluster | Children | Present when |
|---|---|---|
| **1 · lane** — which cards | `All N`, `Shopping N` | always |
| **2 · auto** — act on the cards | note, `Keep all N`, `Clear all auto · N` | the deck has auto cards, or a note survives |
| **3 · arrangement** — how it reads | `By type`, `By role`, **sort trigger**, list/card well | always; the well `All` only |

Cluster 2 is already one child (`clear-auto.tsx` wraps the pair itself). **Cluster 3 is the one
structural change this round asks for** — three loose children become one wrapper.

The desktop hairline (1px × 22px `--border-strong`) sits **in front of cluster 3**. It is a
separator, not a child: with nothing on its left, and on any wrapped line, it renders nothing.

---

## The eight variants

`—` means the variant is identical to the one above it in that column.

| # | Width | Lane | Auto | Lines | Arrangement line | Well |
|---|---|---|---|---|---|---|
| **D1** | 1300 | All | present | 1 | `By type` `By role` `Name · A–Z ▾` `≣ ▦` | drawn |
| **D2** | 1300 | All | absent | 1 | — | drawn |
| **D3** | 1300 | Shopping | present | 1 + strip | `By type` `By role` `Price · Highest ▾` | **absent** |
| **D4** | 1300 | Shopping | absent | 1 | — | absent |
| **P1** | 390 | All | present | **3** | 345 of 358px | drawn, same line |
| **P2** | 390 | All | absent | **2** | 345 of 358px | drawn, same line |
| **P3** | 390 | Shopping | present | **3** + strip | 255 of 358px | absent |
| **P4** | 390 | Shopping | absent | **2** | 255 of 358px | absent |

Measured at 390 (358px of content, gap 7): lane `64 + 7 + 92 = 163` · auto `76 + 8 + 134 = 218` ·
arrangement `66 + 52 + 110 + 96 + 21 = 345`. Desktop widest state (D1) is **953 of 1008**.

- **Must not** let the arrangement cluster split. The well alone on a fourth line at 390px is the
  defect the wrapper exists to prevent — drawn as a counter-example in P4's frame.
- **Must not** grow to a fourth line in any of the eight. Three is the shipped maximum on a filled
  deck and the trigger joins the third.
- **Must not** move the trigger between lanes. It is positioned against `By role`, never against
  the row's trailing edge, because the well is `All`-only.
- **Must not** put the trigger in the price strip. The strip is absent under `All`.

---

## 1 · Resting

Trigger reads the whole order with no prefix — `Name · A–Z`, `Price · Highest`. `--elevated`
ground, `--border-strong` hairline, `▾`. Desktop `rounded-lg`, 13px, `px-14 py-9`; phone
`rounded-full`, 12.5px, `px-13 py-8`, `min-h-[44px]`.

- **Must not** take an accent border. The shipped `selected.length > 0` branch is unconditional
  under single-select — see finding 1. This bar's own comment: selection is said with the
  bone-on-elevated skin, never with a coloured ground.
- **Must not** carry the `Sort:` prefix. It costs 38px and the view toggle's place on the line.
- **Must not** render `triggerLabel` (`Sort`) alone. One row is always chosen, so that branch is
  unreachable — it stays in the block because `FilterPanelCopy` is a shared shape.

## 2 · Open

The shipped `open` branch, unchanged: `--border-strong` ground, **`--accent` border**, `▴` in the
chevron slot. The one accent this control keeps, because it is transient and it means something.

- Desktop popover: `top: calc(100% + 6px)`, 260px, `--surface-rail` on a `--border-strong`
  hairline, radius 12, shadow `0 24px 60px rgba(0,0,0,.6)`, placed by `popoverShift` with a 16px
  viewport gutter.
- Opening by click does **not** mark a row active; `↓` on the closed trigger opens *and* activates
  the first row. Shipped behaviour, unchanged.
- **Must not** expand in flow. **Must not** trap focus on desktop — `Escape` dismisses and hands
  focus back; `pointerdown` outside dismisses; page scroll dismisses and returns focus without
  scrolling the trigger back into view.
- **Must not** mount both forms. Exactly one of popover / sheet exists at a time.

## 3 · The rows — one per key, never one per direction

`buildSortOptions` maps over keys and hangs the direction on the chosen row as its `hint`. So:
**two rows under `All`** (Name, Mana value), **three under `Shopping`** (Name, Price, Mana value).

Desktop row: `px-14 py-9`, `min-height: 44` (inline, from `desktopRowMinPx`), gap 11, 16px round
marker, label sans 13.5px `--fg` with ellipsis, hint mono 11px `--fg-faint` at `.04em`.
Sheet row: `px-16 py-12`, `min-h-[48px]`, gap 12, 18px marker, label 14.5px, hint mono 11.5px.

- Marker is **round**, filled `--accent` with `●` when chosen — the shipped single-select shape.
  A square tick would promise you can have two.
- **Only the chosen row carries a hint.** An unchosen row has no direction yet; picking it adopts
  that key's default.
- **Must not** show counts. `showCounts={false}` — a sort order narrows nothing.
- **Must not** render a search field or group labels. `searchable={false}` drops both.
- **Must not** render a desktop footer. `renderFooter` returns null for single-select on desktop;
  there is no `Clear`, because a list is always sorted by something.
- **Must not** draw `Price` as a disabled row under `All`. It is not unavailable — it is not a
  question on that lane. §2.4.

## 4 · Chosen, and re-picking

Picking a different key adopts its default direction and dismisses. **Picking the chosen key
reverses it** and dismisses. That reversal is the only direction control.

| Key | asc | desc | default | lanes |
|---|---|---|---|---|
| Name | `A–Z` | `Z–A` | asc | both |
| Price | `Lowest` | `Highest` | **desc** (#629) | **Shopping only** |
| Mana value | `Curve up` | `Curve down` | asc | both |

- Announced `Sorted by Name · Z–A.` through the surface's existing live region.
- The chosen row's accessible name is `{order}, current order, choose again to reverse` — the only
  place the re-pick rule is stated out loud.
- **Must not** add an asc/desc affordance. §2.2.
- **Must not** re-sort the groups. Sorting happens *inside* `By type` / `By role`, which stay.

## 5 · Switching lanes

One sort remembered **per lane** (§2.6).

| From | To | Trigger reads |
|---|---|---|
| `Shopping · Price · Highest` | `All` | `Name · A–Z` — All's own default |
| back to `Shopping` | | `Price · Highest` restored |
| `All · Mana value · Curve down` | `Shopping` | `Mana value · Curve down` — carried, both lanes offer it |

- **Must not** hint at the parked order. No `(Price under Shopping)` tail: it would name an order
  for a list not on screen, and `Price` is not even a row in `All`'s panel, so there is nothing
  for the reader to reconcile.
- **Must not** discard it. That would let the lane pills silently reset a choice the reader made
  about a different list.

## 6 · The auto cluster's own states, unchanged

The trigger is in a different cluster and is **not** touched by any of them. Recorded so the
interaction is explicitly a non-interaction.

- `Keep all` confirming — the question replaces both bulk controls and takes the whole width at
  390px. Cluster 2 grows; cluster 3 wraps below it and the arrangement line is unchanged.
- Either write in flight — both bulk controls disable. **The sort trigger does not.** Reordering a
  list is not a write and cannot conflict with one.
- Zero auto, zero kept — cluster 2's wrapper returns `null` rather than collecting a gap. Variants
  D2 / D4 / P2 / P4.
- A draft note present — it stands the kept note down; cluster 2's width changes, nothing else does.

## 7 · Empty and near-empty lists

- **A deck with nothing in it**: the whole toolbar renders as it does today and the trigger renders
  with it. It is not absent at zero rows, unlike the bulk controls: those act on cards and have
  nothing to act on; an order is a property of the list, and an empty list still has one.
- **`Shopping` with nothing unowned**: the lane is still offered (the pill is always present), the
  strip declines to render at `totalCopies === 0`, and the trigger still reads
  `Price · Highest`. No special case.
- **One card**: unchanged. A one-row list is sorted; saying so costs nothing and suppressing the
  control would make the trigger flicker in and out as a deck is built.

---

## What is not drawn, and why

- **Keyboard-walk frames.** The model is `filter-panel.tsx`'s, unchanged and already tested:
  `↓`/`↑` move `aria-activedescendant` with no wrap, DOM focus stays on the listbox (no search
  field here), `Enter`/`Space` picks, `Escape` dismisses without undoing. No new pattern, so
  nothing a walk would settle.
- **The six themes on every frame.** Every value in every frame is a token; the canvas carries the
  `theme` prop so all six can be checked, and no frame introduces a colour the palette does not
  already place.
- **Pending / in-flight.** Sorting is a client-side reorder of a list already in memory. There is
  no request, so there is no pending state, no `PENDING_OPACITY` and no held announcement.
- **A degraded state.** Price ranking is `price.ts:168-190`, which already ships fail-quiet: rows
  with no live figure sort last and equal to each other, name then id as the tiebreak. An
  unreadable price table produces no strip and no error — it does not produce a broken order.
- **An `All`-lane price order.** §6 of the brief: the `All` row draws no figure first, and that is
  its own brief.
- **A separate Ascending / Descending group in the menu.** The review reference draws one, and it
  is the control §2.2 rules out by name — plus it would collapse §2.3's six per-key labels to two.
  Drawn nowhere; argued in the canvas's §6b so the trade is on the table rather than in a comment.
