# The state matrix — card detail R2

Every cell below is a state the build must produce. **Both widths for all of it**: desktop is the
820×620 modal, phone is the full-bleed sheet. Nothing here is conditional on route — the modal is
mounted on `/collection`, `/decks/[id]`, `/commanders/[id]` and the set pages, and behaves
identically on each.

## 1 · Price × ownership — the twelve cells

The price tag's state and the card's ownership are **independent**. The trap is assuming a priced
card is an unowned one.

| | owned, 1 printing | owned, 2+ printings | unowned |
|---|---|---|---|
| **priced** | tag under art; no picker | tag under art; **tag re-reads on every pick** | tag under art; no picker, no `You own` figure |
| **foil-only** | `◆ foil $6.10` | same, per printing — a foil-only *printing* is common where the card is not | same |
| **sold out** *or* **never stocked** | `no stock`, dashed, `--fg-locked` | same, per printing — **one printing unstocked does not unstock the card** | same |
| **absent** | **nothing renders** | **nothing renders** — and a pick to a priced printing makes the tag appear, which is the only case where the column's height changes | **nothing renders** |

**The line between rows 3 and 4 is who was silent, not what the answer was.** `no stock` = the store
answered, the answer was no — *stocked-and-zero* and *never-carried* alike. Silence = **nothing
reached us**: no feed, a failed fetch, a card the feed does not carry. A never-stocked card is
**not** the absent state, and this is the cell R1 drew on the wrong side of the line.

**What must not happen in any cell:** an em dash, `$0.00`, a greyed box, a reserved empty slot, a
skeleton that never resolves, or a card-level price standing in for a printing-level one.

**The one height change worth naming:** absent → priced on a pick adds 30px to the art column at
desktop and 29px at phone. The column is `flex-direction: column` with the tag last, so nothing
above it moves and the modal does not resize. Do not animate it.

## 1b · The compact art header — `card-modal.tsx:344`

Reached at **2+ owned printings with the printing region open past the overflow threshold**, phone
only. The 180px card becomes a **72×100 thumb** in a `flex items-end gap-14` row, name beside it.
The shipped flip control is **withheld** here.

| Element | In the compact header |
|---|---|
| **price tag** | **Survives, and moves** — out of the art, into the name block: below the name, beside the mana cost. Still re-reads on every pick, one row up from the tile it belongs to. |
| **`⤢` mark** | **Withheld** — same threshold, same reason as the flip control: at 72px a glyph plate is most of the picture. |
| **zoom gesture** | **Kept.** The whole 72×100 thumb stays the button. |
| **focus ring** | **Required** — the shipped 2px `--accent` ring. With no glyph it is the only standing evidence the thumb is pressable. |
| **the zoom it opens** | **The full one** — 318×444, caption, and the shipped flip plate at a 44px target. Collapsing the header does not collapse the zoom. |
| **all four price states** | Unchanged in kind; the tag renders in the name block or not at all. |

**Never:** zoom disabled while the picker is open; a shrunken zoom; a `⤢` at under 30px; the tag
under a 72px thumb.

## 2 · Zoom — closed, opening, open, closing

| State | Desktop | Phone |
|---|---|---|
| **closed** | Art column as shipped + tag. `⤢` at 30px, bottom-**left** of the art — the right corner is the flip control's. | Art header as shipped + tag. `⤢` at 28px, bottom-left. |
| **opening** | 200ms ease-out, opacity 0→1, scale .94→1, scoped to the dialog rect | identical |
| **open** | Layer over the whole 820×620; card 372×520; caption; ✕ on an `--elevated` plate | Layer over the whole sheet; card 318×444; caption; ✕ plated |
| **closing** | 160ms ease-in, opacity → 0 | identical |
| **open + reduced motion** | Present at full opacity, 0ms, no scale | identical |
| **open, no art** | `identityGradient` at 63/88, same caption, no substitute card frame | identical |
| **open, unowned** | **Identical.** Ownership changes nothing about the zoom. | identical |

**Never:** a second backdrop, a viewport-sized scrim, a title bar, a back control, Prev/Next, the
price, or pinch past 1×.

## 3 · Faces — one-faced and two-faced

| | one-faced | two-faced, front | two-faced, back |
|---|---|---|---|
| **art column / header** | art | front face art; `//` mark beside the name (card surfaces, ratified) | **swap**, not a turn — ratified behaviour, unchanged by this pass |
| **zoom, closed** | `⤢` left, right corner empty | `⤢` left, shipped `↻` right | `⤢` left, shipped `↻` right |
| **zoom, open** | caption; **no flip control** | caption; the shipped `↻` plate at 44px, named *Turn it over* | caption + `· back`; same plate, named *Turn it back* |
| **flip, motion allowed** | — | 320ms `rotateY` 0→180, swap at 160ms | reverse, same curve |
| **flip, reduced motion** | — | 0ms, face replaces face | 0ms |
| **flip, re-press mid-turn** | — | **reverses from where it is**; never queues, never double-turns | same |
| **closing the zoom on the back face** | — | — | **the back face is not remembered.** Re-opening shows the front. A zoom is a look, not a setting. |

**The gate:** the flip control renders from the `layout` column only. A split or adventure card
carries `//` in its name and type line and **has no back** — it gets the mark and no control.

## 4 · The coexistence states

| State | What must be true |
|---|---|
| **priced + claimed** | Tag under the art (column A); availability block under the meta (column B). Both visible, neither styled to reference the other. *none free — in Gonti Theft* and `$2.41` answer different questions and must not be joined by a connective. |
| **priced + printing region open** | The tag is in the art column, which does not scroll; the region scrolls in the content column. **The tag stays put at every scroll offset** — this is the reason it is in the art column and not in the region. |
| **absent + claimed** | Availability block alone. The absent price adds nothing, not even a silence marker. |
| **sold out + claimed** | Both. The link-out in the pinned row still renders — their stock is live, ours is hours old. |
| **zoom open + claimed** | The layer covers the availability block. Nothing is duplicated into the layer to compensate. |

## 5 · Themes

All six (`amonkhet`, `kamigawa`, `phyrexia`, `kaldheim`, `ixalan`, `eldraine`) for: the priced tag,
the `no stock` tag, the scrim, and the flip control. Drawn on the canvas, §6.

**The one measured risk:** `no stock` is `--fg-locked` on `--bg`. Phyrexia is the floor at ~3.2:1.
See the gap report.
