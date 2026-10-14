# READINESS — Card captions (R1)

**Self-assessed: 🟢 Green, with two dependencies, neither of them a design gate.** All four calls
left open by the brief are called. Nothing here waits on a design decision.

The two dependencies are **`feat/proxies`** (call C draws `ProxyTag`, which is in flight and not on
`main`) and **the draft pair's `added` case** (call B needs `usePendingChange` to distinguish a card
the draft added from one it recounted — the list view never had to). Both are stated below with what
happens if either slips.

## Read from source, not inferred

The brief was read in full on `design/card-view-captions`; the seven rulings in §2 are drawn as
written. Six components were read at `main`: `collection/grid-view.tsx`, `decks/deck-card-tile.tsx`,
`ui/availability-marker.tsx`, `decks/buy-tag.tsx`, `ui/ownership-dot.tsx`,
`cards/two-faced-mark.tsx`. Every geometry figure in `README.md` and `STATES-card-captions.md` is
quoted from the component that ships it. **Where a component and this handoff disagree, the
component wins.**

`STATES-proxies.md:27-30` is cited for the one-slot rule and is **not reopened**.

## The four calls, all called

| # | Question | Called |
|---|---|---|
| A | The caption's shape | **Two lines, always. Mono meta line, then the name; the `✕` is a full-height right column.** 46/52px, fixed. |
| B | Draft state | **Edge on the caption, pair on the meta line.** `1 → 2` recounted, `+1` added, both suppressing `×N`. |
| C | The proxy mark | **The row's `P` in the one slot, at the row's own size.** No new form, no growth, no chip, no price, no count. |
| D | What stays on the art | **Nothing, and the bottom scrim deletes with it.** |

## Dependency 1 — `feat/proxies`

Call C is drawn against `ProxyTag` and `deckRowTag`, which live on `feat/proxies` and not on `main`.
**The dependency is one-way and the slip is clean:** if the captions land first, the deck tile's slot
has two occupants instead of three (chip, `$`) and the `P` is a later one-line addition at a call
site that already exists. **Nothing in calls A, B or D touches it.**

**What must not happen is the reverse shortcut** — shipping the captions and drawing the proxy mark
on the *art* because the caption work is not in yet. That would put one slot in two places, which is
call D's first refusal.

**And the key travels with it — see `ADDENDUM-the-key.md`, which supersedes this paragraph.** R1 asked
for `MarkKey` above the card grid *"on the same terms as above the list"*; erratum 7 disproved that
and carried it back to Design, and the addendum calls it: **same component, same slot, one differing
word** (`$ not owned` against the row's `$ to buy`; `P proxy` on both). It is **unblocked
independently of this dependency** — it reads `deckRowTag` and `card.owned`, both shipped. **Card
view must not
end up the one view in the app with marks and no legend.**

## Dependency 2 — the draft pair's `added` case

`usePendingChange` is consumed by `decklist-row.tsx:124` and nothing else (ruling 5). The tile is its
second consumer and needs one distinction the row never made: **a card the draft added has no count
to move**, so it draws `+1` rather than a pair.

**If that distinction is not cheaply available**, the fallback is to draw the caption edge alone on
an added card and the pair on a recounted one. **That is a real loss and not a neutral one** — an
added card is the draft change a reader is most likely to be looking for — so it is worth one query
rather than accepted quietly. It is not a blocker: the edge alone is still strictly more than the
card view says today, which is nothing.

## Called, not asked — flagged for the record

1. **The art is bare, and that is a Design call ruling 1 left open.** If Product wants one corner
   kept, the cost is the scrim, and the scrim is what the brief identified as the thing worth
   recovering. **Ask for the corner back with that trade named**, not as a small addition.
2. **Two lines is a measurement, not a preference.** The arithmetic is in `README.md` § A. If a
   future ruling widens the tile past ~250px, one line becomes possible and this call should be
   revisited rather than inherited.
3. **The caption height is fixed at both widths and must stay fixed.** Every conditional occupant —
   chip, count, pair, set line, `//` — changes what is drawn and never how tall it is. A single
   `min-h` swapped for `h` under pressure is how this design fails.
4. **The `✕` keeps its floor and takes no exception.** 44 phone / 32 desktop. It is still the only
   removal path in this view, which is the same test the sibling handoff's toggle failed.
5. **The draft edge is on the caption, not the shell**, because the shell's border already carries
   over-committed. **Eng should not "unify" it onto the tile edge** — the two facts are orthogonal
   and are simultaneously true often enough to matter.
6. **One prop, two call sites, no new density.** `plate?: boolean` on `AvailabilityMarker` and
   `BuyTag`. A third density on either component would be a second spec for one box.
7. **No cost pips, anywhere, at any size.** Ruling 2 is a deletion. If eng finds the caption has
   room, that is not an invitation.
8. **The two tiles are one chassis, not one component.** §7 left the share open; the caption block is
   worth sharing and the tile is not — see `README.md` § §7.
9. **`×1` on `/collection` is severable and recommended.** The brief names the redundancy; the meta
   line makes it louder by putting the count beside a chip. One condition, one line, shippable alone.

## The engineering list, in dependency order

| # | Change | Blocked |
|---|---|---|
| 1 | `AvailabilityMarker` gains `plate?: boolean` | no |
| 2 | `BuyTag` gains the same prop | no |
| 3 | `collection/grid-view.tsx` — caption chassis, `md:grid-cols-6` | after 1 |
| 4 | `deck-card-tile.tsx` — caption chassis, `✕` column, art bare, scrim + `CostPips` deleted | after 1, 2 |
| 5 | `decklist-group.tsx` — `minmax()` floor tuned to yield 178px with the panel closed | after 4 |
| 6 | `usePendingChange` second consumer; the tile's edge + pair | after 4, **and dependency 2** |
| 7 | `ProxyTag` call site in the tile's slot | **after `feat/proxies`** |
| 8 | `MarkKey` in card view — **see `ADDENDUM-the-key.md` 9a–9d** (supersedes "same terms") | no |
| 9 | `×1` suppressed on `/collection` (severable) | after 3 |

Items 1–5 are unblocked today and are the whole of the brief's core ask. **Items 3 and 4 should land
in the same release** — they are one caption on two surfaces, and splitting them leaves the app with
two caption shapes for one idea, which is the outcome ruling 3 exists to avoid.

## Not blocking

- **Contrast.** No new ink. Slot inks are the shipped `--avail-hard-fg`, `--avail-over-fg`,
  `--warning` and `--fg`; the count is `--fg-body` where the badge was `--bg` on accent, which is a
  quieter pairing on a plate than on art and measures well above 4.5:1. The draft pair is `--accent`
  on `--surface` — the same pairing the list view's own pending figures already use.
- **Legibility floors.** The meta line is mono 9.5 / 9px and the slot label 9 / 8.5px — the chip's
  shipped size, now on a solid plate instead of a scrim over unknown art, so it is **more** legible
  than before at the same size. The name keeps `grid-view`'s shipped 13 / 12px; nothing shrank to
  make room.
- **Tap targets.** 44 phone / 32 desktop on the only control in the caption. Every mark is inert:
  no hover, no focus ring, no `title`.
- **Zero net motion.** Nothing transitions, including the caption edge appearing when a draft opens
  and the slot swapping occupants.
- **Copy.** Two new strings, both the draft pair, both drawn and spoken. Everything else is a reuse
  manifest citing the module that owns it. **No new visible words on either tile.**
- **Six themes.** No colour is introduced and one is **removed**: accent leaves the tile's art
  entirely with the quantity badge, so the only accent on a card tile is now the draft edge — a state
  most tiles are not in. The dashed proxy edge is `--fg-locked`, which is the app's absence
  vocabulary and renders on all six.
- **Density.** The caption grows 10px desktop / 8px phone per tile. At 6-up that is ~2 rows of extra
  scroll on a 99-card deck and nothing at all on the phone's 2-up, where the tile was already 296px.
  The trade is the art: 249px of illustration with nothing on it, against 249px with four marks and
  a wash across the bottom quarter.
