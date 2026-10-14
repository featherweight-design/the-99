# Ordering the deck list — R1

**Deliverable:** `The 99 - Deck List Sort (R1).dc.html` (canvas, six-theme `theme` prop).
**Brief:** `docs/superpowers/design-briefs/2026-09-14-ordering-the-deck-list.md`, read in full at
`main` (the brief verifies itself against `6d5aa90c`).
**Mirrors:** `design_handoff_the99_filter_chassis/` — same shape, same token discipline, a control
in a bar plus its states.

| File | What it is |
|---|---|
| `The 99 - Deck List Sort (R1).dc.html` | The deliverable. The row inventoried and read as three clusters, 4.1 answered, four variants at 1300 and four at 390 with the measurements, the trigger at rest / open / chosen, both popovers and the sheet, §4's five questions answered in order, the copy table, and three defects the mount exposes. |
| `STATES-decklist-sort.md` | Eight variants × seven states, in full, including what each must not do. |
| `decklist-sort · copy strings.ts` | Production strings and the three pure helpers, with the reuse from `collectionFilterCopy.sort` marked rather than duplicated. |
| `READINESS.md` | Self-assessment, the one copy call I want a second opinion on, and what I would cut. |
| `brand/` | The brand sheet, carried so the folder opens standalone. Unmodified. |

Open the `.dc.html` directly in a browser — it needs no server. Every frame is drawn at its true
width, so pan rather than resizing.

---

## Read at `main`, not recalled

The brief, then `decks/group-toggle.tsx`, `decks/clear-auto.tsx`, `decks/price-strip.tsx`,
`ui/filter-panel.tsx`, `ui/view-toggle.tsx`, `lib/collection/sort-options.ts` and
`lib/copy/collection.ts`.

Every pixel in every frame is one of those files' declared value: the lane pills' `px-[11px]
py-[4px]` / `md:px-[14px] md:py-[5px]`, the Shopping pill's `--warning` text on a
`color-mix(--accent 30%, --bg)` ring, the bulk buttons' mono 12px on a `--border-strong` radius-8
box at `min-h-[44px]`, the well's 70×36 and 94×48 content boxes, the panel's 260px and 44px rows
and 16px round marker, the sheet's 36×4 handle. Nothing is drawn from the brief's prose where the
source had a number.

**One correction to the handoff prompt, folded.** The prompt describes the auto cluster as
`Keep all N + Clear all auto · N` and the note as a kept note. At `main` the note in that slot is
the *draft's* (`n of these are not in vN yet`, `:149`, `hidden md:inline`), and while it is set the
kept note stands down — one sentence per slot. Both notes are desktop-only either way, so the
390px measurements are unaffected; the desktop frames draw the kept-note form, since the fixture
has no draft.

---

## Decisions

**1. The row is three clusters, not eight peers, and sort joins the third.** Lane (*which cards*),
auto (*act on the cards*), arrangement (*how the list reads*). The trigger goes after `By role`
and before the well, inside the arrangement cluster. `By type` names the sections,
`Name · A–Z` names what happens inside them, the well names how a row is drawn — brief §2.5's
ruling expressed as adjacency rather than as a sentence in a doc.

**2. The three grouping children become one `flex-none` wrapper.** This is the round's one
structural change and the condition decision 1 depends on. `clear-auto.tsx` already does exactly
this to the bulk pair, and its comment gives the reason: *"the cluster is a single child of the
toolbar's wrap, so without this the answers would be pushed off the edge rather than under the
question."* Three loose children get away with it at seven; at eight they do not, and the failure
mode is the well alone on a fourth line at 390px — which is the outcome brief §4.1 names as the
thing to avoid. Drawn as a counter-example in the canvas rather than described.

**3. Not the trailing edge, because that slot is allowed to vanish.** The well is `All`-only. A
trigger positioned against the row's right edge sits 96px further right under `Shopping` than
under `All` — the same objection the brief raises against the price strip, arriving from the other
direction. Trailing-most stays with the child that disappears.

**4. Not the leading edge**, because the lane pills own it: *which cards* is read before *in what
order*, and a trigger in front of `All 99` separates the pills from the count in the deck's own
heading above them. **Not its own line**, because it costs one and does not need to.

**5. The desktop hairline goes in front of the arrangement cluster, and it is not the chassis'
hairline.** 1px × 22px `--border-strong`, desktop only. On the chassis the rule divides *filters*
from *not a filter*; here it divides *acting on the cards* from *reading them*, and sort is on the
reading side — so it is inside the rule rather than past it. It is a separator, not a child: with
nothing on its left, and on any wrapped line, it renders nothing.

**6. The phone form is the labelled 44px pill, not `iconOnly`.** The row gains 110px and has 123
to give. An icon cannot say which order is on, and on this surface that is the control's entire
output — the list is always sorted, so there is no off state a glyph could stand for. The chassis'
`iconOnly` mounts sit beside a search field that must keep its width; nothing on this row shrinks,
so shortening this control buys nothing. And `FilterPanel`'s compact trigger is already a
`rounded-full` pill at `min-h-[44px]`, so it lands in this row's vocabulary with no prop at all.

**7. The trigger states the order and drops the `Sort:` prefix** — a third answer to 4.3, and the
only departure from `collectionFilterCopy.sort`. **The prefix is 38px, and 38px is the difference
between the view well staying on the arrangement line and landing alone on a fourth:** 345 of 358
without it, 383 of 358 with it. It is also the right word to lose here. `/collection`'s prefix
earns its width because that trigger sits among `Type`, `Set` and `Availability`, where a bare
value would read as a filter value; here the neighbours are `By type` and `By role`, already
arrangement statements, and this row's `Group` caption was retired at the refresh for exactly that
reason. The accessible name keeps the word in full — *"Sort the deck list, Name · A–Z, collapsed"*.

**8. Neither the sort trigger nor the view toggle yields, because neither has to.** Both sit on the
arrangement line at 390px with 13px spare and on one desktop line with **2px** spare in the widest
state that exists. Thin at both widths, and the fallback is named in *Measured* below rather than
left implicit. Recorded in case the row tightens further: **the well is what would yield**, because
it is a persisted preference (`the99:deck-view`, one key for every deck — *"'I read decks as cards'
is a fact about the reader"*) set once and rarely revisited, while an order is a per-visit question.

**9. The same component, this toolbar's vocabulary** — 4.5, and the split it implies is the wrong
axis. What travels between surfaces is the component and its behaviour: one row per key, direction
as re-pick, the round marker, the hint on the chosen row, Escape-dismisses-never-undoes, the pick
committing and closing. What is local is the frame, and the shipped component already gets it right
unasked — `rounded-lg` beside the `rounded-lg` well at desktop, `rounded-full` among pills at
phone. No `hairline + trailing slot` quotation from the chassis: that hairline says *not a filter*,
and nothing on this row is a filter but the two lane pills.

**10. The panel is two rows under `All` and three under `Shopping`** — one row per key, never one
per direction. `buildSortOptions` maps over keys and hangs the direction on the chosen row as its
`hint`. It is the shortest menu in the app, which is most of why it fits: no search, no counts, no
group labels, no desktop footer, no `Clear`.

**11. `Price` is absent under `All`, not disabled.** Brief §2.4 rules it out; a greyed row would
advertise it anyway. And the row is not *unavailable* — it is *not a question on this lane*, which
is a different fact and is said by absence.

**12. Nothing hints at the parked order.** §2.6 leaves Design how the trigger reads under `All`
with a remembered `Price` behind it: it reads `Name · A–Z` and nothing else. A `(Price under
Shopping)` tail would name an order for a list not on screen, and `Price` is not even a row in
`All`'s panel, so there is nothing for the reader to reconcile. The restoration is a pleasant
surprise, not a promise to make.

**13. `Curve up` / `Curve down` for mana value — and the argument changed under it.** R1's first
argument was collision: the shipped `Cheapest to cast` (`consider-panel.tsx:119`) sitting two 44px
rows above a `Price · Cheapest`. **Decision 14 removed the money words from `Price`, so that
argument went with them.** The pair now stands on one thing only: it abbreviates a sentence this
same deck already shows the reader — `deckVersioningCopy.changed` ships *the curve goes up* and
*the curve comes down* on its own diff. The shipped string is available again and is the live
alternative; what it lacks is a US reverse (`Dearest to cast` is the word just retired,
`Priciest to cast` is a coinage). **This is the one call I would like a second opinion on** — see
`READINESS.md`.

**14. `Price` names its extremes as figures: `Lowest` / `Highest`, `desc` default.** The workshop's
straw man was `Cheapest` / `Dearest`; *dearest* is British and this copy layer is US English
throughout (`Color identity`, `en-US` pinned through every formatter in `collection.ts`). It also
keeps `/collection`'s pattern of naming the extreme rather than the direction — `Fewest`/`Most`,
`Common first`/`Mythic first` — and beside a strip reading `$129.50` there is nothing else
`Highest` could mean. `desc` stays the default: #629 shipped highest-first on 2026-09-14 and this
control names that order rather than replacing it (§2.7). Changing it would silently re-sort every
shopping list in the app on deploy.

**16. The review reference's second menu group is not taken, and §6b says why.** A comparable
control shared in review draws three keys, a divider, then Ascending / Descending as its own
checked group. Its trigger shape is the same one R1 arrived at independently (key, separator,
direction, no `Sort:` prefix — decision 7 confirmed from the outside). Its direction group is
exactly the affordance §2.2 rules out by name, and one direction vocabulary for every key is §2.3
reversed — six labels become two, `A–Z` goes, and the mana-value question above disappears. **A
legible trade, two locked decisions, and a component shared with `/collection`: Hugh's call.** R1
draws the ruled shape and states the alternative rather than quietly taking it. Its per-row icons
and accent-ink chosen row are declined on their own merits — `leadingGlyph` exists and exactly one
mount uses it, for rows distinguished by a mark rather than a word.

**15. Persistence, recommended not ruled: `the99:deck-sort`, one key for every deck, holding both
lanes' orders.** §6 says eng follows whatever the placement implies, and the placement implies the
well's precedent — the trigger is now in the well's cluster, and how you read a list is a fact
about the reader. Both lanes, because the state is one sort per filter and a single stored order
could not restore `Price · Highest` on returning to `Shopping`. Not the URL: `/collection` mirrors
sort to the URL because a filtered collection view is a thing people link to, and a shareable deck
URL carrying someone else's row order is noise in a link.

---

## Three defects `selectionMode="single"` already has

All three are live on `/collection` today and are not introduced here. Each is a branch keyed on
`selected.length > 0`, which under single-select is **always true** and therefore carries no
information. This mount is what makes them visible, because this bar has a stated rule about accent.

**Finding 1 — the permanent accent border.** `filter-panel.tsx`'s trigger takes
`border-[color:var(--accent)]` whenever `selected.length > 0`. On the builder's control bar that
collides with the bar's own comment: *"No accent fill anywhere on the builder's control bar:
selection here is said with the bone-on-elevated skin, never with a coloured ground."* Fix:
condition the branch on `selectionMode === "multi"`. It improves `/collection` too — an always-lit
border there distinguishes Sort from nothing, and reads as a filter that is on. **The `open`
branch's accent border stays**: it is transient and it means something.

**Finding 2 — the sheet's badge reading `1`.** The sheet title takes an accent count pill on the
same condition, so *Sort by* wears a permanent `1`. Same one-line fix, same collateral
improvement. A badge counts a selection made *among many*; one-of-many has nothing to count.

**Finding 3 — the trigger is 36px and the well is 38px.** **Accepted, not fixed.** The row already
mixes 27px pills with a 38px well under `items-center`; a third height 2px off the well adds no
inconsistency a reader can see, and forcing agreement means either a magic padding on this mount
or a height prop on a shared component. Recorded so the next person does not read it as a mistake.

---

## Measured

| | Figure | Where |
|---|---|---|
| Desktop widest state (D1 · All · auto) | **1006 of 1008** — 2px spare | 1300px viewport, 240px sidebar; measured in the browser |
| 390px arrangement line, All | **345 of 358** | `By type` 66 + `By role` 52 + trigger 110 + well 96 + gaps 21 |
| 390px arrangement line, Shopping | **255 of 358** | no well |
| Cost of the `Sort:` prefix | **38px** | the line is 345 without it, 383 with |
| Lines at 390px, filled deck | **3** | lane, auto, arrangement — the shipped maximum, unchanged |
| Rendered heights in the cluster | **27 / 36 / 38** | pills / trigger / well |

**The desktop widest state is the tighter of the two margins, not the looser one.** D1 measures
lane 170 + spacer 0 + auto 429 + rule 1 + arrangement 356 + five 10px gaps (six children) =
**1006 of 1008**. R1's first pass printed `953 of 1008 — 55 spare`, computed rather than measured
and budgeted against the frame's border box; it was wrong by 53px and the frame wrapped.

**One constraint falls out of that and belongs in the PR:** the flexible spacer must keep its
shipped form — `<span className="flex-1" aria-hidden />` at `group-toggle.tsx:139`, **`flex-1` and
no minimum.** An 8px floor on it is 6px more than this row has, and the failure is not subtle: the
arrangement cluster goes to a second line and the view well lands under the auto cluster. The
spacer is the one child that must be allowed to reach zero.

Decision 8 ("neither yields, because neither has to") is therefore argued off **2px at desktop and
13px at 390px**. That is true and it is thin, so the fallback is named rather than left implicit:
at 390px, drop `By role`'s idle `px-[6px]` to zero, which the refresh already established it can
afford (it carries no border at that width either) — 12px back. At desktop, the hairline plus its
gap is 11px and the `md:` gap could go 10 → 9 across the row for 5 more. Neither is needed at the
measured figures; both are one token.

The 390px figures are still computed from the shipped type stack rather than read off a render
— the three that matter are `Name · A–Z` 110, `Price · Highest` 120 and `Clear auto · 40` 134 — so
**the 390px arrangement line should be re-measured in the browser once the wrapper lands.**
