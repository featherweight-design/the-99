# R4 — the second door: the buy action on the Shopping filter

`design/design_handoff_the99_linkout/` · 2026-09-06 · **new files only**

Canvas: `The 99 - Decks · Shopping Strip Link-Out (R4).dc.html`. R1–R3 are untouched as the record;
R3 is still the spec for the primitive, the export footer and the card modal.

**The one-line summary:** *the price strip is already the row R3's rule asks for* — it is the
Shopping filter's bottom element, already bounded, already conditional on there being something to
buy — so the link joins it as one line at its bottom edge, and this addendum adds **one placement
and zero primitives, tokens or strings.**

The three closed decisions are drawn to, not re-opened: the action is on the Shopping filter
surface (item 1), the basket is the rows on screen (item 5), the export link stays and is
retargeted (item 5b).

---

## 0. Relayed, not read

`src/components/decks/price-strip.tsx` and `src/components/ui/external-link.tsx` **are not in this
project** — `src/` holds one file, `components/shell/nav.tsx`. The strip is drawn from the R3 price
addendum canvas and `R3-README.md`, which are the design of record for it; the link from R3's
primitive spec.

**Two things to check against the files once:**

1. The strip's real padding and border radius. The canvas uses the addendum's `11px 15px` / `r9`.
2. Whether `external-link.tsx` ships R3's anatomy — in particular the underline at
   `color-mix(--accent-hover 45%, transparent)`. **If it does, this pass adds no code to the
   component at all**, which is the intent.

## 1. Where the action goes → **inside the strip, on a line of its own, last**

R3's rule, unchanged: *the link-out lives in its container's pinned bottom row, below the hairline
that row already has — and where no pinned row exists, it becomes one.* The strip **is** the bottom
element of the filter container, and it is bounded on all four sides. There is no hairline to add
and no row to invent.

| Placement | Verdict |
|---|---|
| **On the total's line**, trailing edge | **No.** A shared baseline makes them one control — a figure with a verb attached, which is a price button. It also breaks at 390px: the two clusters are ~310px of a 362px inner width with no room for `6 of 8 priced`, so the phone would need a different placement than desktop. **One home, both widths** is the strip's founding constraint. |
| **Beside the strip**, its own row under a new rule | **No.** That is R3's rule read as a recipe instead of a rule. **The convention adds no dividers to this app** — here it would add one inside a container that already has a border and pills above it, three stacked rules inside 90px, and it would ask the reader to bind the link to a box it sits outside of. Same mistake as the rejected *above the row* option in the card modal. |
| **The strip's last line** | **Ruled.** Second line of the strip's left column, under the provenance. The provenance and the total keep the exact positions they ship in — **nothing shipped inside the strip moves a pixel.** |

**Last, not first, because the total is still the subject.** Reading order stays *figure → where it
came from → what you can do about it*. The link is the only underlined mark and the only 14px one
in the container, so it is found; it is last and lightest after the figure, so it does not lead.

**It also reads as the relationship it is.** `prices from ManaPool` with
`Buy these at Mana Pool ↗` nine pixels beneath it: the provenance names the store, the next line
goes there. R3 §1b argued that pairing as the reason to name the destination; here the two
sentences are adjacent.

**Nothing gains a fill, a border, a radius or a hover background. The one new mark on the surface is
an underline.**

**What it costs, measured against the addendum's drawings:**

```
desktop   40px → 69px   (+29 — one 20px line and its 9px gap)
phone     52px → 96px   (+44 — the line in a min-height:44px row)
```

The 44px is the target ruling, not the type. It is still the cheapest form this action has: a
secondary button in the same slot is 42px of box plus margins, and it would be the only filled
control under the pills.

## 2. Link, not button — asked and answered

**It navigates to another company in a new tab.** That is a link's job and a button's lie: a button
promises the app will do something. Everything downstream depends on it being an `<a href>` —
middle-click, copy link, open in background, the `↗`, `rel="noopener"`, and the sr-only new-tab
promise.

**And a button would need a box.** A box here is a filled control under the filter pills inside the
`GroupToggle` container — the exact footprint the brief rules out, and the thing that turns a quiet
aggregate into a CTA bar. The link keeps *no box of its own*, which is why it fits at all.

So: **`external-link.tsx` as shipped** — no variant, no `size` prop, no new token.

## 3. States — R3's table on a darker ground

Rest `--accent-hover` · hover `--fg` (ink, underline and glyph) · active `--fg` with the underline
1px→2px · focus-visible `outline: 2px solid var(--accent); outline-offset: 2px` · `:visited`
identical to rest. Metrics 14px / `1.45` / `letter-spacing: 0` / `display: inline`, no padding.

The strip's ground is `--surface-inset` (`#14110E` on amonkhet), **darker than the `#1E1A15` R3
measured on — so the two themes R3 found at the margin gain room, not lose it.** No re-measure is
required to accept the placement; one is still worth having for the ledger.

**Two things the ring must clear here that it did not in the footer**, and both are why the gap
above the link is 9px rather than 6px:

- **The strip's own 1px border**, 15px from the link's leading edge. A 2px-offset ring sits well
  inside it, so the ring never reads as a second border on the box.
- **The provenance line 9px above.** `outline` takes no layout space, so it overlaps that gap by
  2px rather than pushing the line — visible, and nothing moves on focus.

**Tab order:** the strip holds no other focusable, so there is no order to negotiate and no shipped
keyboard path to break. Coming from the pills, focus reaches the link after the filter it belongs to
and before the first card row. DOM, reading and visual order agree for free — the only place in this
ticket where they do.

## 4. The variants

| Strip state | What renders |
|---|---|
| **Partially priced** | `$84.25 · 6 of 8 priced` / provenance / link. The link buys **all eight**, not the six we could price — the two we couldn't are a reason to go, not a reason to shorten the basket. No count in the label: the pill says `8` and the clause says `6 of 8`. |
| **All priced** | `$129.50` / provenance / link. R3's dropped-clause ruling untouched. The link's presence never depended on the clause, so nothing new branches. |
| **None priced** — *new ruling* | **The strip renders, with no figure.** Provenance line + link. |
| **Nothing to buy** (empty Shopping list, or the `All` filter) | **No strip, so no link.** |

**The none-priced ruling, because it is the one thing here that changes shipped behaviour.** The
addendum ruled *no figure at all* — a total of zero cards is not a total — which left the strip with
nothing to say, so it did not render. It has something to say now: **eight cards you can buy are
still eight cards you can buy, and this is the state that needs the door most — we couldn't price
them, the store can.** No figure, no `0 of 8`, no error tone. One string changes: the provenance
line states the absence instead of a check we cannot evidence (`strip.provenanceUnpriced`).

**The empty case needs no rule of its own.** Two shipped rules meet and agree — the strip suppresses
itself when the filter shows nothing, and the link-out is *absent, not disabled*, when there is no
basket. **The link inherits the strip's condition rather than carrying a second one, so it cannot
render where it would be wrong.**

## 5. The basket is the filter's rows

One sentence, and every case falls out of it: **spoken-for cards in** (they are on screen with a
`buy` tag and a price in the total — excluding them would make the total a figure you cannot pay);
**basics out** (not on the filter, so not in the basket — no clause of their own); **`sold out` and
unpriced rows in** (the absence is ours, not the store's, and the store is allowed to be the one
that says no); **a row the player just `✕`'d, out** — it left the screen, the basket and the total
together. **The `href` is derived at click, never cached.**

**The divergence had a design cause, not just a code one.** The export dialog composed its own list
because it was a different surface with a different noun — a file to take away, not a filter to
read. Once the buy action lives on the filter, the filter's rows are the only defensible definition
of *these*, and both doors take it. **One selector, three consumers:** the rows, the strip's total
and denominator, and both `href`s.

**Export keeps its link, retargeted.** Unchanged in every visual respect — second footer row,
left-aligned, quieter than `Copy shopping list` and `.txt`; R3's drawings are still the spec. Only
the payload moves. Two doors is not redundancy: one is *buy what I am looking at*, the other is
*take this with me* — the same relationship `Copy shopping list` and `.txt` already have.

**One string across both is now correct rather than a bug.** `linkOut.deck` gains a second call
site; *these* resolves the same way on both surfaces because both render the same list.

## 6. What R4 does not reopen

The primitive and its five states · the label grammar and both strings · `:visited` unstyled · the
two URL shapes and `rel="noopener"` · the card modal's pinned row · the export footer's weight
ruling and its two rejects · the buy tag and Decklist tab exclusions · the strip's total derivation,
its `of 8` denominator and the dropped clause · the 92% scrim · `builder-spine.tsx:391`.

## Files

- `The 99 - Decks · Shopping Strip Link-Out (R4).dc.html` — the three placements with two rejected;
  the strip in place at 390px and desktop; the four variants; the four states on the strip's ground;
  the basket ledger.
- `LINKOUT-R4-README.md` / `LINKOUT-R4-READINESS.md` — this file and the verdict.
- `shopping-strip-linkout · copy strings.ts` — the diff: one new provenance string, one new call
  site for `linkOut.deck`, and the `href` contract shared by both doors.
