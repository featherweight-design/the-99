# The 99 — Card detail: price, zoom, flip (design handoff, R2)

`design/design_handoff_the99_card_detail/` · 2026-09-12 · **new files only**

Canvas: `The 99 - Card Detail (R2).dc.html` (pan/zoom). R1 kept as `(R1 superseded)`. Amends `src/components/cards/card-modal.tsx`
and its printing region. **No new surface, no new token, no new component, no geometry change.**

**The one-line summary:** *the art column is the one region every card has, so the price lives there;
the zoom is a layer inside the dialog rather than a mode of it; and the flip turns only where the
card is big enough to be worth turning.*

---

## R2 — what changed, and nothing else did

Review cleared all three of R1's Amber blocks: **the geometry checks out against `card-modal.tsx`**,
and the errata are carried into the spec rather than back here. Two items came back, and R2 is
exactly those two. **No ruling from R1 is reopened** — the placement, the overlay, the axis and the
320ms all stand.

1. **The compact art header is now drawn** — canvas §1b, the fifth region. `card-modal.tsx:344`:
   2+ owned printings with the region open past the overflow threshold collapses the 180px card to a
   **72px thumb** in a `flex items-end gap-14` row, and **the shipped flip control is withheld
   there** because a 44px target on 72px art is most of the picture. R1 placed both new elements in
   that region and did not draw it. **Ruled: the tag survives and moves, the `⤢` mark is withheld,
   the gesture is kept.** See below.
2. **Never-stocked is ruled, and the canvas and prose now agree.** One line: **`no stock` is what the
   tag says when the store answered and the answer was no; silence is what it says when nothing
   reached us.** R1 drew never-stocked as silence while its prose put it under `no stock` — the prose
   was right. See below.

---

## 0. Provenance — what was read, and what was not

`docs/superpowers/design-briefs/2026-09-12-card-detail.md` **is not in this project's tree** —
`docs/superpowers/` holds only `design-tables/appshell.md`. Neither is
`src/components/cards/card-modal.tsx`, nor `globals.css`; local `src/` still holds only
`components/shell/nav.tsx`.

So, in the shape this project already uses for relayed facts:

- **§2's four locked decisions are taken verbatim from the brief as relayed in review** — the owned
  card shows its selected printing's price, the unowned card shows a price at all, zoom is the whole
  card as if held, the flip animates inside the zoomed view. Nothing below relaxes any of the four.
- **§4's list of four ratified documents was not readable.** The four named in *Amendments* below
  were derived from the artifacts in this project — they are the four whose ratified text this work
  actually touches. **If §4 names a different four, that is the first thing to correct**, and the
  ledger is deliberately written one-per-block so a swap costs one block.
- **R2:** geometry is **confirmed** against `card-modal.tsx` in review, including the compact
  header at :344. The paragraph below is kept as the record of what R1 assumed.
- **Shipped geometry** (820×620 / max-h 85vh, the 320px art column at 28px padding, the 180px phone
  art header at `44px 20px 20px`, the pinned Prev/Next row, the 34/32px ✕) is **relayed**, read out
  of the printing-picker, full-card and link-out handoffs rather than out of the file. Check the
  drawings against `card-modal.tsx` once. **Two known drawing artifacts, corrected in R1 and named
  here because they are exactly where a relayed frame goes wrong:** the desktop title row now
  reserves a 52px gutter so the mana cost clears the ✕ at `top 18 / right 18`, and the phone content
  block now reserves 76px so the meta grid clears the absolutely-positioned footer. Both are
  drawing corrections, not spec changes — but if the shipped file solves either differently, the
  file wins. **And the phone frames are drawn at 812px, not 620:** 620 is the desktop modal's own
  height and a full-bleed sheet has no such number — it is the viewport. 812 is the figure the
  printing-picker handoff measures against.
- **The motion literals at `globals.css:524-536`** were not read. The durations below are quoted
  against the two motion facts this project *does* record — the filter sheet's `0.18s ease-out` and
  the disclosure's `160ms` — and are chosen to sit in that family rather than to extend it. **If the
  literals at :524 disagree, prefer them and tell me; the axis and the swap-point do not move.**

---

## The four calls §3 left open

### 1. Where the price sits → **directly under the sharp art, in the art column**

Four placements were real candidates.

| Placement | Verdict |
|---|---|
| **Beside the selected printing** in the picker region | **No — and this is the trap the brief names.** An unowned card has no printing region, and *unowned* is the state where a price is most load-bearing. A placement that vanishes in its own primary case is not a placement. |
| **A fifth cell in the meta grid** | **No.** The grid is four facts about the card as an object — Set, Rarity, Identity, You own. A price is a fact about a shop on a Tuesday. It would also inherit the grid's reflow: the 2×2 becomes a 2×3 on phone, and the promoted Set row already fights for that space. |
| **In the pinned bottom row**, beside the Mana Pool link | **No.** That row is the link-out's by R3's corrected rule, and a figure beside a store link reads as *the price of pressing this link* — which it is not, because our figure is hours old and the store's basket is live. See Amendment 4. |
| **Under the sharp art** | **Ruled.** The art column exists for every card at both widths, owned or not, one printing or fifty-four. The price is about *this printing* and the art *is* this printing, so the two are adjacent for a reason a player can feel. |

**What the placement buys, beyond having an anchor.** The printing picker's decision 3 established
that a pick moves three things together — the art, the `Set` field, the tile ring. **It now moves
four**, and the fourth is the one a player is choosing *against* when they own a cheap printing and
an expensive one. The tag under the art is the only position where changing a pick and watching the
figure change is a single glance.

**The tag is the deck-side buy tag, verbatim** — mono 10px `--accent` on `1px solid --accent-dim`,
radius 4. Desktop sits on flat `--bg` and needs nothing else; phone sits over the wash and takes
the printing picker's badge plate, `rgba(10,8,6,.72)`. **That plate is the only difference between
the two widths**, and it is a reuse, not a variant.

**Cost, stated:** the phone art header grows ~29px (9px gap + 20px tag). The sheet scrolls, nothing
above the fold is pinned except a footer that is already absolute, and the tag is the last element
in the column — so the **absent** state removes it without moving anything.

### 2. What the zoomed view holds → **the card, one caption line, the close, and the flip**

*As if held* is the whole specification. A card in your hand has a face and a back and nothing else
attached to it, so the zoom carries exactly what tells you **which** card you are holding:

- the whole card at the largest 63/88 the rect allows — **372×520** desktop, **318×444** phone;
- **one mono caption**: `set · code · collector number`, gaining `· back` on the reverse;
- the modal's shipped **✕**, in its shipped slot, gaining an `--elevated` plate so it clears the scrim;
- the **flip control** — the shipped corner plate, unchanged, at a 44px target — only when `layout` says two faces.

**Refused, each for its own reason.** The **price** — a card you are holding has no price printed on
it, and the tag is one dismissal away. **Prev/Next** — paging inside a zoom turns a look into a
browser, and the modal behind it is already the browser. **Oracle text, meta, the picker** — all of
it is either on the card or one dismissal behind it. **Pinch past 1×** — this is not a viewer; art
comparison is the printing picker's job and it already does it better.

### 3. Overlay or replace, on phone → **overlay, and the same at desktop**

Replace is a **mode**, and printing-picker decision 4 forbids modal modes for reasons that all
recur here: it needs a back control, a title that changes, and a second answer to *what does ✕
close*. Overlay needs none of those.

**The layer is scoped to the dialog's own rectangle** — `position:absolute; inset:0` inside the
modal element, `--bg` at 94% with `blur(10px)` — **never the viewport.** Darkening the page would
make the zoom a third dialog stacked on a dialog on a backdrop, and would orphan the backdrop's
click-to-close that the full-card handoff's decision 4 deliberately kept.

**Dismissal is three doors and one stage:** tap the card, tap the layer, or `Esc`. The zoom takes
the first `Esc`, the dialog keeps the second — **the printing region's shipped two-stage shape**, so
the number of stages a player must learn does not grow. Focus returns to the art.

**Desktop gets the identical layer.** The 264px art column copy is smaller than a real card; the
zoomed 520px is the first time the app shows a card at something like hand size. Desktop wanting
that less than phone is an assumption with nothing behind it.

### 3b. The compact art header — `card-modal.tsx:344`

**The tag survives and moves; the `⤢` mark is withheld; the zoom gesture is kept.** Three answers,
because the three things are not the same kind of thing.

- **The tag moves into the name block** — below the name, beside the mana cost, as a sibling of the
  type line rather than a child of the art. A 72×100 thumb has no room beneath it and no centre to
  share, and the tag's argument was never *under the art* for its own sake: it was *in the region
  every card has*. The row **is** that region when the header is compact.
- **The `⤢` is withheld**, at the same threshold and for the same reason the shipped flip control
  is: at 72px a glyph plate is most of the picture.
- **The gesture is kept.** This is the split, and it is not inconsistent. The flip control is *a
  control that must be seen to be pressed* — its plate is the only way in, so withholding the plate
  withholds the feature, and that was the shipped judgement. **Zoom has never needed its glyph:** the
  art is already a silent button on the builder spine and the desktop commander art, and the `⤢` is
  a courtesy at full size, not the affordance. So the courtesy is dropped and the gesture is not —
  and it is precisely at 72px that a player most wants the card big.

**Three consequences to build.** The thumb needs the shipped 2px `--accent` **focus ring** — with no
glyph it is the only standing evidence the thumb is pressable. **The zoom that opens is the full
one** (318×444, caption, the shipped flip plate at a 44px target): *collapsing the header does not
collapse the zoom*, which is the point of keeping it. And the tag **still re-reads on every pick**,
one row up from the tile it belongs to, so both figures are on screen at once.

**Rejected: zoom unavailable while the picker is open.** The tidy answer — symmetric with the
withheld flip control, one state fewer — and wrong. It removes the gesture at the one moment the art
is too small to read, and it would make zoom the only thing in the modal whose availability depends
on another region being closed. **Withholding a mark is a visual decision; withholding a gesture is
a functional one.**

### 4. Flip axis and duration → **`rotateY`, 320ms, `cubic-bezier(.2,.7,.2,1)`, swap at the midpoint**

**Y, because that is how a hand turns a card over.** X tumbles it end over end, which nobody does
with a card, and it is also the axis that reads as *a page turning* — the wrong metaphor on a
surface whose whole premise is an object in your hand. `perspective: 1400px` on the layer: shallow
enough to be a turn rather than a lens.

**320ms.** Above the disclosure's 160 — this is an object moving, not a box opening, and at 160 a
520px card reads as a glitch rather than a turn. Below 500 — at half a second a second press starts
queueing, and this is a control players press repeatedly to compare faces. **A press mid-flip
reverses from wherever it is; it never queues.**

**The control does not change.** It is the `--accent` corner plate that already ships on the card's bottom-right; inside the zoom it only grows to a 44px target. It gains no label — a glyph-only control that sprouts words at one size is two controls. Its *accessible name* carries the two states.

**The face swaps at 160ms, behind the edge**, with `backface-visibility: hidden` on both faces, so
neither face is ever seen mirrored.

**And the flip turns only inside the zoom.** See Amendment 3 — this is the narrowest possible
amendment to *zero net motion*, and it is the only animation this handoff adds to the app.

---

## Amendments

Stated one per block so the readiness audit can check them one at a time.

### Amendment 1 — `design_handoff_the99_printing_picker/` R3, decisions 2 and 3
The art column gains **one element below the art**. A pick now moves **four** things rather than
three — art, `Set` field, tile ring, **price tag**. Decision 3's three-signal table is *not*
amended: the tag is not a selection signal, it is the consequence of one, and it carries no ring,
badge or weight change. The 820×620 geometry, the no-resize rule and the conflict table's reasoning
are unchanged — and are exactly what forced the zoom to overlay rather than push.

### Amendment 2 — `design_handoff_the99_full_card/` R1, gap 4
**Gap 4 is closed, in the form it predicted:** *"the answer is a zoom on the modal's own art, in
`cards/`, for every card — not a second surface for one."* The lightbox's poster feel returns as a
gesture on every card in the app, the commander included. **Nothing else in that handoff is
reopened** — not the deletion, not `Full card` → `Card details`, not decision 3's 262 → 180px trade,
which the zoom now answers rather than argues with.

### Amendment 3 — `design_handoff_the99_card_surfaces/` R2, rulings 6 and 9
**Zero net motion is amended in exactly one place: inside the zoomed view, the flip turns.**
Everywhere else the ratified behaviour stands — the 180px phone art and the 264px desktop art still
*swap*, the hover preview still appears at 240/80 without fading, the row keeps its `//` mark.
**Ruling 9's ordering is unchanged and now gates this too:** the `layout` column, back-face image
storage and the catalog re-seed precede the zoom's flip exactly as they precede the swap, and **the
flip must never be driven by the `//` heuristic** — a promised turn that cannot be delivered is
worse inside a zoom than on a row.

### Amendment 4 — `design_handoff_the99_linkout/` R3, the pinned-row rule
**By exclusion**, written down because the temptation is obvious. The price **does not** join the
pinned bottom row and **does not** become a second door to Mana Pool. R3's corrected rule — *the
link-out lives in its container's pinned bottom row, below the hairline that row already has* —
stands untouched, and that row keeps exactly one item that is not navigation. **The tag is a readout
about a card; the link is an offer about a basket.** Putting a figure beside the link would make our
hours-old number look like the store's live one.

### Not amended
`design_handoff_the99_availability/` R5 and `design_handoff_the99_set_collections/` R3 are **read
and reused, not changed.** The availability block renders exactly as it ships, in the content
column, and never trades places with the tag: **one says what your shelf can spare, the other says
what the store wants.** The buy tag's definition, the pip ring and the vantage-point rule are
borrowed verbatim — this handoff uses the tag, it does not redefine it.

---

## Motion

Full table in `MOTION-no-token-set.md`. In summary: **two animations, two literal durations, two
named static states, no global switch.**

| | motion allowed | `prefers-reduced-motion` |
|---|---|---|
| **Zoom open** | 200ms ease-out, opacity 0→1, scale .94→1 | 0ms, present at full opacity, no scale |
| **Zoom close** | 160ms ease-in, opacity 1→0 | 0ms, gone |
| **Flip** | 320ms `cubic-bezier(.2,.7,.2,1)`, `rotateY` 0→180, swap at 160ms | 0ms, face replaces face — **the swap card surfaces already ratified** |

The flip's reduced-motion state is not a fallback invented here; **it is the shipped behaviour**, so
the animated path is the amendment and the static path is the status quo. Worth a code comment.

---

## Component notes

Hexes live only in `globals.css`; everything drawn is `var(--*)`. **No new token.** Full table on
the canvas, §7. The load-bearing rows:

| Component | Spec |
|---|---|
| **Price tag** | Buy tag verbatim: mono 10px, `--accent` on `1px solid --accent-dim`, radius 4, padding 2×7. Phone adds `rgba(10,8,6,.72)`. Foil prefixes `◆ foil`. Unstocked is the word `no stock` in `--fg-locked` on `1px dashed --fg-locked`. **Not a link, no hover, no target.** |
| **Tag placement** | Last child of the art column, 10px under the art (9px phone), centred. |
| **Zoom trigger** | The sharp art becomes a button — the silent affordance the builder spine and the desktop commander art already use. One visible mark: **`⤢` — U+2922 NORTH EAST AND SOUTH WEST ARROW** (checked as rendering in IBM Plex; U+26F6 SQUARE FOUR CORNERS is tofu and must not be used) — on the printing picker's badge plate, **bottom-left** of the art, 30px desktop / 28px phone. |
| **Corner collision** | The shipped flip control owns the card's bottom-**right** corner, so the zoom mark takes the **left**. `⤢` left, `↻` right, on every card — a one-faced card has an empty right corner rather than a shifted left one. |
| **Zoom layer** | `position:absolute; inset:0` in the dialog. `color-mix(in srgb, var(--bg) 94%, transparent)` + `backdrop-filter: blur(10px)`. |
| **Zoomed card** | 372×520 desktop, 318×444 phone. Radius 14/13, inset hairline + `0 24px 60px rgba(0,0,0,.6)`. |
| **Flip control** | **The shipped control, unchanged** — the `--accent` plate with its `--bg` `↻` glyph, in the card's bottom-right corner, radius 9. Inside the zoom it grows to a **44px target** and gains nothing else: no label, no pill, no move. |
| **No-art card** | Zoom still opens; `identityGradient` at the same 63/88, same caption. **Nothing is drawn to stand in for a card** — the full-card handoff's decision 5, inherited. |

## Notes for engineering

- **`card-modal.tsx`** gains one `zoomed` boolean and one `face` value. The art becomes a button;
  the layer is a sibling inside the dialog element. **No new dialog, no second focus trap, no second
  live region** — the pattern `PrintingRegion` already set.
- **The price is a prop, not a fetch.** Whatever selector feeds the deck-side buy tag feeds this;
  it must resolve **per printing**, so a pick change re-reads it. If the price for a specific
  printing is not available the state is **absent**, not the card-level price — showing another
  printing's figure under this printing's art is the one wrong answer.
- **`no stock` covers two facts** — sold out and never stocked — and ships as one word. See the gap
  report.
- **Reduced motion is two named media blocks**, one per animation. No global `transition: none`.
- **The flip is gated on the `layout` column**, never on `//` in the type line. Card surfaces
  ruling 9, unchanged.
- **Copy:** `card-detail · copy strings.ts` → `src/lib/copy/cards.ts`. **No price string is added** —
  the figure and the three ratified words come from the buy tag's existing block.

## Gap report

1. **`no stock` is one word for two facts — and never-stocked is not silence.** The line is **who
   was silent, not what the answer was**: the tag prints `no stock` when the store answered and the
   answer was no (*stocked-and-zero* and *never-carried* alike), and prints nothing only when
   nothing reached us — no feed, a failed fetch, a card the feed does not carry. **That makes both
   ancestors right rather than picking one:** `set-cell.tsx` always has a store answer for a card in
   a set it is showing, so it always has a word to print; the buy tag's ratified silence is the
   *no-answer* case, which is ours to own and not the store's to be blamed for. The two facts stay
   distinguished **in the accessible name only**, exactly as `set-cell` does. Revisit only if the
   feed ever carries the distinction as a field.
2. **`no stock` in `--fg-locked` on `--bg` measures ~3.2–3.6:1** — **and this bears on the tag path
   only**, never on the silent state, which has nothing to contrast. at 10px uppercase mono — under AA
   for small text. It is the shipped set-collections treatment, so this handoff does not unilaterally
   change it, but **phyrexia is the floor and this is the one row to measure in build.** If it fails,
   the fix is `--fg-faint`, everywhere the tag renders, not here only.
3. **The phone header grows ~29px.** Measured, accepted, stated. If it bites, the tag moves to the
   meta area on phone only — which would break the one-placement rule, so it is a last resort.
4. **Two `Escape` stages become three when the printing region is also open.** Zoom → region →
   dialog. Correct, and consistent, but it is one more than the full-card handoff's gap 6 anticipated.
5. **The zoom's caption duplicates the `Set` field** behind the layer. Accepted: the layer hides the
   field, and *which printing am I holding* is the one question the zoom cannot answer from the art
   alone at 63/88 without a set symbol legible.
6. **`globals.css:524-536` was not read.** The four durations are chosen to sit in the shipped
   family; if the literals disagree, prefer them.

## Files
- `The 99 - Card Detail (R2).dc.html` — the canvas (this handoff's deliverable).
- `The 99 - Card Detail (R1 superseded).dc.html` — R1, kept for the record.
- `README.md` — this file.
- `STATES-card-detail.md` — the state matrix: four price states × zoom open/closed × both faces, both widths.
- `MOTION-no-token-set.md` — the literal durations, and every reduced-motion static state.
- `card-detail · copy strings.ts` — the copy block; **no new price string**.
- `READINESS.md` — the verdict and what blocks a green.
- `brand/` — the locked brand sheet + README, copied in for self-containment. `support.js` — canvas runtime, not production code.
