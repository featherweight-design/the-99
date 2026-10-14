# READINESS — Card surfaces (R2)

**Self-assessed: 🟢 Green, with one dependency.** All nine R1 questions are called, both R2 calls are
called, and the refresh R2 reconciliation is closed. **R1's Product blocker is resolved** — the buy
tag collapses to a bare `$` on the All tab rather than losing its price, which returns ~44px where
the ask was chasing ~40px, so the 40px pip track ships and the 34px fallback is withdrawn. Nothing
is waiting on a design decision.

The remaining dependency is **#363's data work** (`layout` column, back-face image storage, catalog
re-seed), which the brief already names and which needs no design gate. **#349, #350 and #351 are
unblocked end to end.**

## Read from source, not inferred

Both briefs and fourteen components were read at `main`, in the order the covering note gives them,
with the card-view brief's **Corrections** section governing. Local `src/` in this project holds
only `components/shell/nav.tsx`, so nothing here is traced from a project file. **Where a component
and this handoff disagree, the component wins** and `README.md`'s tables are what to correct.

Two things were found that neither brief carries, and both reduced the work rather than adding to it:
**`/collection` already ships the card tile and the view toggle**, and **`imageUri` is a full card
image**, which settles #351's content question arithmetically. See `README.md` § *Two findings*.

## The nine calls, all called

| # | Question | Called |
|---|---|---|
| 1 | The card view tile | **`grid-view.tsx`'s tile, three deltas.** Auto-fill grid, not 5-up. Floor reaches it. |
| 2 | The third control axis | **The shipped `/collection` well at the bar's right end; `Group` retires.** No new line at 390px. |
| 3 | Pip metrics | **12px, gap 3, fixed 40px track, shingle from three, cap at five with `+N`.** Phone 13px, plain, uncapped. |
| 4 | The phone meta line | **Pips, plus whatever that view already owns. Nothing else.** Type line refused; marker stays up. |
| 5 | The hover preview | **252×352, card image only. Left, flipping right. 240/80ms, 0ms row-to-row. No fade.** |
| 6 | The two-faced mark | **A mono `//` after the name, not a corner glyph. Flip on the modal's art. `layout` column only.** |
| p1 | The floor | **Stands; the tile inherits it, chip as slot.** |
| p2 | Do pips generalise further | **No.** Choosing or paying, never auditing — two rows of six. |
| p3 / p4 | The dot; the metrics | **p3 unchanged. p4 amended:** 52px becomes one of two phone heights, not an exception. |

## Resolved · the Product re-open (R2 call 1)

**Answered: no, and the refusal was right.** The price stays on the All tab — seeing which cards
still need buying while browsing the whole deck is the point of the tag.

**R1's argument had a flaw worth recording**, because it is the kind that recurs: it read the tag as
a shopping *affordance* on the strength of ruling 1 calling it one **on the tile**, then applied that
reading to the row. A tile is a picture of a card; a row is a line in a list you are working through.
On the row the tag is a shopping **fact** — and this handoff's own test says facts stay.

**Adopted:** on the All tab the tag collapses to a bare `$` in the same chip skin; Shopping keeps the
full `buy $12.40`. **~62px → ~18px, so ~44px comes back** — more than the ask would have returned.

**Consequences, all closed:** the 40px track ships; **the 34px / 11px / cap-four fallback is
withdrawn** and recorded as rejected rather than kept warm, because a fallback nobody will take is a
second spec to keep in sync; the desktop worst case goes from 42–59px of card name to **~86–103px**;
and the worst case is no longer a $1,000 card, since a four-digit price cannot appear on that tab.

**Scope:** the collapse belongs to `decklist-row.tsx` under `filter === "all"` only.
`update-diff-row.tsx` keeps its full `BuyTag`.

**Sold-out is accepted as an edge case** on Product's call — rare, and a sold-out card is still a
card the player has to buy eventually. One constraint: **the chip must not restyle itself for it.**

## The one dependency — #363's data work, and one constraint on it

Ruling 8 already establishes that a `layout` column, back-face image storage and a full catalog
re-seed precede any flip control, and that the work needs no design gate. This handoff adds one
constraint and one consequence:

- **The mark must be driven by the `layout` column, never by the `//` heuristic.** Split and
  adventure cards carry the same separator in `toCardRow`'s joined oracle text and in Scryfall's
  `type_line`, and they have no back. A heuristic-driven mark promises a flip on *Fire // Ice* that
  the modal cannot deliver.
- **So #363 has no partial ship.** The `//` mark and the modal flip control land together, after the
  data. There is no design-only slice to ship ahead of it, and **the `//` mark must not be added to
  the row as a "harmless" first step** — that is precisely the heuristic ship.

Everything in #349, #350 and #351 is independent of this and can ship first.

## Called, not asked — flagged for the record

1. **#349 is an adoption, and the deltas are the deliverable.** Three on the tile (dot + pips
   bottom-left, set/rarity caption dropped, `✕` in the caption) and three refusals on the toggle
   (not the URL, not the auto default, not 5-up). If eng finds a fourth delta it wants, that is a
   question back to Design, because the whole value of the call is that the tile is not a new object.
2. **The toggle's target divergence is closed: no exception, 44×44 phone / 32×32 desktop, both
   surfaces, one PR.** R1 flagged it rather than adopting it silently; refresh R2's own exception
   test decides it, because that test is *shortcut or only route* and the toggle is the only route to
   card view. R1's adoption argument was about sameness, not size, so the adoption survives intact —
   the change is simply bilateral. Measured: no wrapped line at 390px. See `README.md`
   § *Reconciled with refresh R2*.
2b. **Accent does not appear on the builder's control bar.** Refresh R2's reservation of `--accent`
   for *in use / to buy* reaches the bar — the bar is **not** exempt, so eng should not "fix" it back.
   Selected state, pill and segment alike: `--fg` on `--elevated` with a 1px `--border-strong` ring,
   which is verbatim what the active `By type` / `By role` pill already draws six pixels away. The
   bar is internally inconsistent today and this removes that.
3. **The tile keeps the border tint where the row swapped to an inset ring.** Radius 7 and the ring
   are *row* rulings with row reasons (a border shunts a list). A tile carries a border in every
   state. **Do not unify.** Tile radius stays 9/10.
4. **Card view drops shopping affordances, not shopping facts.** The chip and the dot stay. A player
   cannot use the toggle to stop seeing that a card is unowned or spoken for.
4b. **The unowned tile's availability slot is filled, and R1 had it wrong.** R1 said the floor reaches
   the tile and the chip is its slot, but `AvailabilityMarker` only speaks about copies you *own* and
   ruling 1 dropped `BuyTag` — so the slot had no possible occupant in the state where the floor
   matters most, and unowned was carried by an 8px dashed stroke alone. Card-rows' FLOOR doc rejects
   that twice: zero occupants is a defect, and the dot is not the floor. **The collapsed `$` chip
   from call 1 fills it**, which is why the two R2 calls are one drawing. **Owned stays empty and
   that is not the same defect** — the marker returns `null` at `free` on every surface; nothing to
   say is not nothing to show.
5. **Two net-new drawings in the handoff, both one glyph:** the `+N` overflow pip, and the collapsed
   `$` chip. Everything else is a shipped atom moved, resized, recoloured or deleted. The `$` chip is
   `BuyTag` with its word and figure removed — same box, same ink, same hairline, glyph at 10.5px
   against the marker's 8.5px labels, because one glyph can afford the size and needs it.
6. **The spoken cost is never capped.** The pips truncate at five slots; `manaCopy.costAria` speaks
   every symbol. A reader who cannot see the pips is the one reader for whom truncation is not a
   trade.
7. **The phone meta line takes nothing further, on any row.** Two runs on the decklist (pips, and the
   view's own figure), three on `synergy-row` when slice B lands. A fourth run is refused everywhere.
8. **The hover preview has no copy and no accessible name.** `aria-hidden` entirely; the modal is
   the keyboard and screen-reader path, and the name is already its trigger.
9. **The heights on phone change at group boundaries only.** Lands have no cost, so no meta line, so
   they stay 44px — and lands are their own group under both groupings. If a future grouping mixed
   costed and costless cards inside one group, this ruling would need revisiting; none of the two
   shipped groupings does.
10. **The view toggle is absent under Shopping, not disabled.**
11. **No new token, no new hex, no new motion.** One new component behaviour (`CostPips`' track and
    cap), one new drawn glyph (`+N`), one deleted label (`Group`).

## The engineering list, in dependency order

| # | Change | Kind | Blocked |
|---|---|---|---|
| 1 | `CostPips` promotes out of `suggestion-tile.tsx`; gains `sr-only` alternative + `size`/`track`/`cap` | move + additive | no |
| 2 | `card-search-row.tsx` repoints its import; behaviour byte-identical | swap | after 1 |
| 3 | `decklist-row.tsx` — desktop 40px track between name and slot; phone meta line carries the pips (`hasShoppingMeta` widened to *Shopping or has a cost*) | additive | after 1, **and the Product ask** |
| 4 | `group-toggle.tsx` — `Group` label deletes; view-toggle well arrives, `filter === "all"` only; two new props; All/Shopping active fill `--accent` → bone on `--elevated` | swap + additive | no |
| 4b | `collection/filter-bar.tsx` — segments to 44×44 / 32×32, active fill `--accent` → bone on `--elevated` | swap | **ships with 4, not after it** |
| 5 | `decklist.tsx` — `view` component state defaulting to `"list"`; renders the tile grid under `"card"`, grouping unchanged | additive | after 4 |
| 6 | Deck card tile component, from `grid-view.tsx`'s tile + three deltas | new | after 1, 5 |
| 7 | Hover preview, desktop-only, one instance per decklist | new | no |
| 8 | `layout` column + back-face image storage + catalog re-seed | **data** | no — can start now, in parallel |
| 9 | `//` mark on row and tile; modal flip control | additive | **after 8, and only after 8** |

**Items 4 and 4b must land in the same release.** They are the same control on two surfaces, and
splitting them is the one outcome both handoffs were trying to avoid. Inside that PR, the one thing
to check is whether `/collection`'s phone filter bar absorbs +32px of width and +24px of height on
that control; if it does not, **bring it back as a finding rather than diverging** — a divergence
returns us to two controls.

Items 1, 2, 4, 4b, 5, 7 are unblocked today. Item 3 is unblocked as soon as Product answers **either
way**. Item 8 has no design gate. **The whole of #349 and #351 can ship without a single answer from
Design or Product.**

Everything in `design_handoff_the99_card_rows/READINESS.md`'s nine-item list still applies and is
not restated here. Its one dependency — `synergy-row`'s slice B, blocked on the commander-route
aggregate — is untouched by this handoff.

## Not blocking

- **Contrast.** No new ink colours. Pip fills are the shipped `WUBRG_COLOR` values with the shipped
  `inset 0 0 0 1px rgba(0,0,0,.45)` rim and `--bg` numerals; the `+N` pip reuses `--fg-faint`, which
  is the generic pip's existing skin. Chip and marker foregrounds are the ratified lifted values.
- **Legibility floors.** 8px numerals inside 12px pips are at the floor and are decorative by
  contract — the cost is spoken in full. Row name ink stays 12.5/13.5px; the tile name is 12/13px,
  `grid-view`'s shipped figures. Nothing shrank to make room for the track; the name yields width.
- **Tap targets.** 44px phone and 32px desktop on every control, refresh R2's floors, with no
  exceptions taken — the toggle's segments and the tile's desktop `✕` both moved up rather than
  claiming one. The marker, the pips and the hover preview are never targets.
- **Zero net motion.** Three places this handoff could have animated and does not: the preview
  appears rather than fades, the flip swaps rather than turns, the view change re-renders in place.
- **Copy.** Three new blocks, all in `card-surfaces · copy strings.ts`: two toggle names, the mana
  cost's spoken form and its mapper, and the two-faced mark's three strings — plus R2's collapsed
  `BuyTag`, whose visible text shrinks to `$` while **its accessible name keeps the word and the
  price in full**. **No new visible text on any row** — the cost is drawn. Everything else is a reuse manifest citing the module that owns it.
- **Six themes.** No colour is introduced, and one is now *removed*: accent leaves the builder's
  control bar entirely, which also retires the R2 gap about accent loudness varying across themes for
  this surface — a bone-on-elevated selected state reads the same on Neon Rain and Oil Haze. The pip
  palette is `WUBRG_COLOR`, the game's colour code rather than a theme token, and it already renders
  on all six.
- **Density on phone is measured and accepted, at the figure corrected for R2's chrome:** ~488px of
  extra scroll on a 99-card deck — about **1.5** scrolls of the list region once the 52px tab bar and
  14px home indicator are counted, not the 1.3 R1 quoted against the full viewport. It does not flip
  the trade: the cost is per-row and constant, and rows-per-screen goes 15 → 13, which is not a
  scanning failure. `DENSITY-four-hundred-pixels.md` carries the correction.
