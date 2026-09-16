# READINESS — Card captions (R1 audit)

**Verdict: 🟢 Green, with twelve errata.** All four calls the brief left open are called and every
named state is drawn.

**Errata 1–9 are eng-resolvable** under the handoff's own tie-break rule and did not return to
Design — one withdraws a claim this audit made, and one records that Design then overturned the
withdrawal with a better argument.

**Errata 10–12 are a different kind.** They are Hugh's own rulings, taken after the feature shipped
and after seeing it on real decks, and each overturns something the handoff called. They are
shipped and awaiting Design's **ratification** rather than Design's decision; the tracker row is ⚖️
rather than 🟢.

Errata 1–4 and 6 came from the audit itself; erratum 5 was added after the brief's own review
round, 7 and 9 from reviews of the work, 8 is a note on where the handoff lived, and 10–12 are
Hugh's post-ship rulings.

**Audited against `origin/main` at `f5745d11` on 2026-09-15.** Every claim below was read on that
commit. The handoff was drawn against an earlier tree, and three of those errata are merges
that landed after it was drawn.

**Handoff:** `design/design_handoff_the99_card_captions/`.
**Brief:** `docs/superpowers/design-briefs/2026-09-14-modifiers-below-the-card.md` (PR #635).

---

## What was verified

| Handoff claim | Source | Result |
|---|---|---|
| Marker returns `null` at `free` | `ui/availability-marker.tsx:280` | ✅ |
| Chip is `density="chip"`, absolute, own scrim | `:298-301` | ✅ |
| `OwnershipDot` filled `--success` / `--avail-hard-fg` / dashed `--fg-locked` | `ui/ownership-dot.tsx:20-23` | ✅ |
| Tile dot is 8px | `decks/deck-card-tile.tsx:198` | ✅ |
| `✕` floor 44 phone / 32 desktop, desktop hover-revealed | `:260` | ✅ |
| Card view is `All`-only | `decks/group-toggle.tsx:304` | ✅ |
| `isShoppingCard` tests `proxied` before ownership | `lib/decks/shopping.ts:33-38` | ✅ |
| `MarkKey` drew nothing in card view | `decks/decklist.tsx:198`, as audited | ✅ at audit time. **Superseded**: erratum 7 said this was not a one-line fix, and Design's `ADDENDUM-the-key.md` then overturned the withdrawal — the guard is now a branch and card view has its key. See erratum 7's overturn and erratum 9 |
| Buy tag and proxy mark share one slot | `STATES-proxies.md:27-30`, `deckRowTag` | ✅ |
| Phone set line drops the rarity | `collection/grid-view.tsx:110-111` | ✅ |
| Art arithmetic — 178→249px, 175→244px at 63/88 | computed | ✅ |

---

## Erratum 1 — both dependencies are discharged

`READINESS.md` names two dependencies. Neither still exists.

**`feat/proxies` has shipped.** `ProxyTag`, `deckRowTag` and `MarkKey` are on `main` as of PR #647
and #649. Ledger items 7 and 8 are unblocked today, and the "if the captions land first" fallback
is moot. The handoff's warning against drawing the proxy mark on the art still stands as a rule;
it no longer describes a sequencing risk.

**The draft pair's `added` case needs no query.** `PendingChangeMove` already carries `from`, and
its shipped comment states that `from` is 0 for a plain add
(`decks/pending-change.tsx:8-12`). `+N` is a read of data the provider already ships. The
"worth one query rather than accepted quietly" fallback never has to be considered, and ledger
item 6's second blocker drops.

The whole ledger is therefore unblocked at once.

**And call C is a relocation, not a gap.** The handoff says `STATES-proxies.md` has no card-view
state, which was true when it was drawn. `deck-card-tile.tsx:121` now draws
`<ProxyTag variant="band" />` in the tile's top-left slot, and `deckRowTag` already enforces the
one-slot rule there — the tile's three occupants are already exclusive. Call C's drawing is
correct; what it describes as filling a gap is moving an existing mark off the art and into the
caption, at the normalized size erratum 3 settles.

## Erratum 2 — ruling 2 has already shipped, with two refinements the handoff forbids

This is the one that would cause a regression if the ledger were implemented as written.

`deck-card-tile.tsx` on `main` has already taken the cost pips off the art. It did so with two
refinements the handoff was drawn too early to see, and both are now load-bearing:

1. **A tile WITH art draws an `sr-only` spoken cost in the pips' place** (`:223`). The component's
   own comment gives the reason: *"the card is visible" is an argument about a reader who can see
   the art; it reaches nobody using a screen reader, for whom the pips were the only cost this
   tile carried.*
2. **A tile with NO art keeps the drawn pips** (`:225`), because the `--surface-sunken` plate it
   draws instead prints no cost of its own.

The handoff forbids both. `README.md`'s Refused list says cost pips are *"not here at any size"*;
`READINESS.md` point 7 says *"No cost pips, anywhere, at any size"*; ledger item 3 says
*"`CostPips` and its import delete"*. Implemented literally, that deletes an accessibility
affordance and blanks the cost on every artless tile.

**Resolution — eng, not Design.** The handoff's own rule applies: *"Where a component and this
handoff disagree, the component wins."* Ruling 2 stands as *no pips over art*, which is what it was
always for. The `sr-only` cost and the no-art pips survive untouched, and `CostPips` keeps its
import. `STATES-card-captions.md`'s `no-art` row gains a line saying the pips stay.

## Erratum 3 — "one box, three inks" is three boxes today

Call D's payoff is that the slot's three occupants become the same box once their scrims go. They
are not the same box now, and no two of them agree:

| Occupant | Size | Vertical padding | Edge | Source |
|---|---|---|---|---|
| availability chip | `8.5px`, flat | `py-[2px]` | **`border`** — 2px of layout | `availability-marker.tsx:338`, `:301` |
| collapsed `$` (tile) | `9px`, flat | `py-[1px]` | inset `boxShadow` — no layout | `buy-tag.tsx:42`, `:213`, `:34` |
| `P` (band) | `9px`, flat | `py-[1px]` | `outline` at `-1px` — no layout | `proxy-tag.tsx:46`, `:87`, `:41` |

> These are the three boxes AS AUDITED, which is what the erratum is about. The unified caption box
> they became is `py-[3px]` since erratum 12 — and the `P` above is the tile's own
> `variant="band" plate={false}` call, so that reading moved with it. What is untouched is each
> variant's PLATED form: the row's, and the band's on the commander spine.

**Two corrections to an earlier draft of this erratum, both found by a cold review of the plan.**
It cited `proxy-tag.tsx:44`, the **row** variant, and concluded `P` steps to 9.5px at `md:`. The
in-scope call site is `deck-card-tile.tsx:121`, `variant="band"`, which is flat 9px. So the `$` and
the `P` are **already byte-identical boxes**, and the normalization is two-way rather than
three-way: only the chip differs.

**And the difference is the chip's `border`, not its padding.** A 9px span's line box is ~13.5px and
the diamond glyph is 6px, so the glyph never sets the height — the border does, adding 2px the other
two do not pay. Normalizing font size and padding alone leaves the chip 2px taller and "one box" a
claim the eye refutes. `proxy-tag.tsx:29-36` already ruled this for itself and took an outline
precisely so the box would not grow.

The handoff specifies `mono 9px desktop / 8.5px phone, px 5 / py 1` for all three, which matches
none of them as shipped.

**Resolution — eng, not Design.** The handoff's component tie-break cannot settle a three-way
disagreement *between* components, so the handoff's own figure is the ruling: the unified box is
`9px` desktop / `8.5px` phone, `px-[5px] py-[3px]` (`py-[1px]` as first ruled — **erratum 12 grew
it**), radius 4, **and the chip's border becomes an outline** so the three boxes are the same
height. Normalizing is the entire point of the call.

**The containment boundary is a variant, not a call site.** None of the three variants involved is
exclusive to these two routes:

| Primitive | Variant | In scope | Out of scope |
|---|---|---|---|
| `AvailabilityMarker` | `density="chip"` | `grid-view.tsx:81`, `deck-card-tile.tsx:128` | `suggestion-tile.tsx:214` |
| `BuyTag` | `variant="tile"` | `deck-card-tile.tsx:137` | `suggestion-tile.tsx:229` |
| `ProxyTag` | `variant="band"` | `deck-card-tile.tsx:121` | `spine-desktop.tsx:391,417`, `spine-mobile.tsx:137,168,178` |

Editing the shipped variants in place changes the Consider tile, the top-off list and the commander
spine at both widths — four surfaces this handoff never drew. The caption's box must therefore be
its own variant, or the size must ride the `plate={false}` prop the ledger already asks for.
Contained that way, nothing outside `/collection` and `/decks/[id]` moves.

**The magnitude, contained.** Desktop: chip 8.5 → 9px, `$` unchanged, `P` 9.5 → 9px. Phone: chip
unchanged, `$` and `P` 9 → 8.5px. Half a pixel of type either way; the visible change is the three
losing their scrims and becoming one box on a solid plate.

**The measurement that settles it** is the box height of the three side by side, not their font
sizes — see the edge column above. A probe that asserts equal heights is the only check that can
see the border, since a class-list assertion reads `border` and `outline` as equally present.

## Erratum 4 — the spent tile is a tenth state and is not drawn

`DeckCardTile` renders `UndoTile` when the decklist marks its slot spent
(`deck-card-tile.tsx:94`), and `deck-card-undo-tile.tsx:12-21` borrows `TILE_SHELL` and
`TILE_ART_RATIO` from the live tile *so that a removed card leaves a hole exactly its own size*.

Its caption height is hardcoded: `min-h-[44px] md:min-h-[36px]` (`:53`) — the live tile's current
figure. The handoff took the caption to a fixed 52/46, which left the receipt 8px short at the phone and
10px short on desktop — the invariant its own comment states, quietly stopping.

**Resolution — eng, not Design.** The receipt's design is unchanged; only its height is wrong.
Export the caption height beside `TILE_SHELL` and have both read it, exactly as they already share
the shell and the ratio. Ledger gains an item.

**Fixed, and it stayed fixed through erratum 12.** `deck-card-undo-tile.tsx` reads
`CARD_TILE_CAPTION_H` rather than restating a figure, so when the chip's padding took the caption to
56/50 the receipt moved with it. That is the whole reason the constant exists, and this branch is
where it first paid.

## Erratum 5 — the grid is a tile floor, not a column count

Found in review of the brief (#635), and it changes ledger items 3 and 6.

**`md:grid-cols-6` breaks the tile it exists to protect.** `md:` begins at 768px, where
`/collection` has 638px of track and six columns is a **90px** tile — half the 175px phone tile
whose parity is the entire argument for ruling 3. A fixed count holds the count and lets the tile
vary, which inverts the design: the tile is what was ruled on.

**And the deck grid's stated reason for `auto-fill` is stale.** `decklist-group.tsx:69-74` says a
340–346px Add panel opens over the pane. It does not: `BuilderShell` renders `QuickAddBar` as a
full-width sticky bottom dock (`builder-shell.tsx:1224` —
`sticky bottom-[var(--tabbar-h)] md:bottom-0 … px-[16px] md:px-[30px]`). Nothing overlays the grid.

**Resolution — eng, not Design.** Both grids take one declaration,
`repeat(auto-fill, minmax(178px, 1fr))`. This is the faithful reading of ruling 3 rather than a
departure from it: the ruling names a 178px tile and gives six columns as its consequence at the
1300px reference width, which is exactly what the floor produces — 178.3px on `/collection`, 181px
on the deck pane, whose ancestor pays `md:px-[26px]` (`decklist.tsx:717`). The stale comment is
corrected in the same PR that changes the declaration.

## Erratum 7 — the legend is not a one-line fix, and this audit was wrong to say so

**A correction to erratum-free ledger item 9, which this document asserted and a cold review of the
plan disproved.**

The audit found `decklist.tsx:198` returning `[]` for card view and read it as an oversight: the one
view in the app with marks and no legend, closed by dropping a guard. The twelve lines directly
above it say otherwise, and neither this document nor the handoff quoted them:

> **LIST VIEW ONLY, and that is a scope decision rather than a limitation.** Five consecutive review
> rounds landed on this one line, each correct and each about the card view: the tile draws a
> different plate, does not draw a buy tag for an owned spoken-for card, and labels its `$`
> *not owned* — a FLOOR — where the row's identical glyph means *to buy*, the shop. A single legend
> cannot decode two vocabularies without becoming a third one.

The clash is checkable rather than theoretical. `proxies.ts` gives the key's entry as `to buy`;
the tile passes `cardTileCopy.slotUnownedAria`, which is `not owned`. Dropping the guard puts a
legend reading **`$ to buy`** above tiles whose identical glyph is announced **`not owned`**. The
key's own region label says *"What the marks on these **rows** mean."*

**PR 1 closes one of the three reasons and not the other two.** The tile's separate plate goes away
— that was the first. The buy-tag-for-a-spoken-for-card difference and the vocabulary clash both
survive it untouched.

**This is the one thing in the handoff that does go back to Design**, and it is a copy question
before it is a layout one: either the two surfaces say the same word, or the card view gets a
decoder in its own vocabulary. The handoff's call C asks for the key "on the same terms" as the
list, and the code's answer is that the terms are not the same. **Ledger item 9 comes out of the
implementation and is carried as an open question.**

Nothing else in the handoff depends on it. Card view's marks are not left undecoded meanwhile: the
tile's `$` speaks `not owned` and `ProxyTag` speaks its own name, which is what the guard's own
comment says.

## Erratum 7 is OVERTURNED by `ADDENDUM-the-key.md`, and Design's reading is better

Recorded 2026-09-15, after the addendum landed.

Erratum 7 withdrew ledger item 9 and framed the legend as *two vocabularies for one glyph*, which
implied a choice between them. The real constraint is narrower and firmer, and the addendum found
it: **the two glyphs mark two different SETS of cards.** `row-tag.ts` returns `buy` for
`!owned || spokenFor`, and only the row passes `spokenFor`. A spoken-for card **is owned**, so
`not owned` is false of it; an unowned card outside Shopping is not `to buy`. No single word is true
of both sets, so shared copy was never a compromise available to be taken.

And `P` is `card.proxied` on both, identically — so **the divergence is one word wide, not a
vocabulary wide**. Two keys differing by one entry, each true of what sits beneath it, are this
component's own system instantiated twice rather than a third vocabulary. That is what makes
reinstatement correct, and this audit missed it.

The addendum also disposes of "no legend" on grounds this audit did not weigh: `proxies.ts` holds a
one-character mark to **three** carriers, and with no key a sighted reader on a phone — the reader
most likely to be in card view — has none.

**Ledger item 9 is reinstated as 9a–9d and shipped.**

## Erratum 9 — the addendum's sample figures are the caption's, not the key's

The one thing in the addendum that does not hold, and it resolves toward less work rather than more.

Its placement table gives the key's samples as mono **9px** desktop / **8.5px** phone and calls them
*"canonical row variant — unchanged and not redrawn."* Both halves cannot be true. `MarkKey` renders
`BuyTag variant="row"` and `ProxyTag variant="row"`, and that variant is
`text-[9px] md:text-[9.5px]` — 9 at the phone, **9.5** on desktop. The quoted figures are the
**caption slot box's**, which erratum 3 settled and PR #654 shipped. `BuyTag variant="row"` also
carries a `--warning` 13% plate that the caption's plate-less box does not.

It also reads erratum 3 slightly wrong: the tile's `$` and the band `P` are byte-identical **to each
other**, not to the row's box.

**Resolution — eng, and it is a deletion.** The ledger's own line is right: *samples unchanged*. The
key keeps rendering the row variant exactly as it does today, on both instances, and nothing here
redraws a box. The figures in that table are struck rather than implemented.

## Errata 10–12 — three rulings from Hugh, 2026-09-15, after seeing it on real decks

All three overturn something the handoff called. Recorded here for Design to ratify; the tracker
row moves to ⚖️.

**10 · The draft edge runs the whole left edge of the tile, not the caption.** It is a DRAWN 2px
strip, not an inset shadow on the shell: an inset shadow paints above the element's background and
below its descendants, and the tile's first child is the full-bleed opaque art — so a shadow was
covered for the whole height of the picture and showed only across the caption, which is the reach
the move was made to escape. The row gets away with a shadow because a row has no opaque full-width
child.
 Call B put it on the
caption because the shell's border already carries over-committed and "the two facts are
orthogonal". `decklist-row.tsx:268-269` had already settled that the other way and shipped it — the
row stacks `inset 2px 0 0 0 --accent` and `inset 0 0 0 1px --avail-over-border` on ONE element, and
a row that is both reads fine because the chip carries the shortfall while the edge carries the
draft. Hugh's evidence was a tile that is both: the red `short 1` chip stays obvious under the
accent edge. Over 46px of caption the edge was easy to miss; over a whole tile it is not, and the
two views now say it the same way.

**11 · A single-copy add prints no figure.** Call B specified `+N` for an add. It restated the count
beside it, and in a singleton format nearly every add is `+1`. Dropped — an add now falls through
to the ordinary count, which is what the list already does (`decklist-row.tsx` prints its glyph on
`quantity > 1 && !recounted`, so an added singleton is a bare name there too). **Recount pairs are
unchanged**: `6 → 8` is a move and says something a count cannot.

**12 · The slot box gains vertical padding, and the caption grows with it.** `py-[1px]` around 9px
of text read as pinched on every chip — most visibly the proxy `P` and `1 in a brew`. Now
`py-[3px]`, which takes the box from 10.5px to 14.5px. The meta line grows 13/14 → 17/18 or the box
clips, and the caption 52/46 → **56/50** or the height stops being fixed, which erratum 3's whole
argument depends on. The figures in `design-tables/collection.md` move with it.

## Erratum 8 — the handoff is not on `main`

It was delivered as an untracked drop inside `.worktrees/about-r3-audit/`, on branch
`design/about-r3-audit`, committed to nothing. This PR is its first tracked home. The drop must be
deleted from that worktree once this merges, or it blocks `git pull` there.

---

## Called, not asked — carried forward from the handoff

The handoff's nine flagged items all stand. Three are worth repeating because an implementer under
pressure will reach for exactly them:

- **The caption height is fixed and must stay fixed.** A single `min-h` swapped for `h` under
  pressure is how this design fails — and erratum 4 means two components now have to agree on that
  figure, not one.
- **The draft edge is on the caption, not the shell.** The shell's border already carries
  over-committed, and both are true at once often enough to matter. Do not unify them.
- **The art keeps nothing.** Ruling 1 permitted one corner; Design declined it and named the price
  — keeping any corner re-imports the bottom scrim. If Product wants the corner back, that trade is
  the conversation, not a small addition.

## The engineering list, as audited

| # | Change | Blocked |
|---|---|---|
| 1 | `AvailabilityMarker` gains `plate?: boolean` | no |
| 2 | `BuyTag` gains the same prop | no |
| 3 | `collection/grid-view.tsx` — caption chassis, `repeat(auto-fill, minmax(178px, 1fr))` (erratum 5) | after 1 |
| 4 | `deck-card-tile.tsx` — caption chassis, `✕` column, art bare, scrim deleted. **`CostPips`, `spokenManaCost` and the no-art branch all stay** (erratum 2) | after 1, 2 |
| 5 | Caption height exported beside `TILE_SHELL`; `UndoTile` reads it (erratum 4). The figure is **56/50** since erratum 12 | after 4 |
| 6 | `decklist-group.tsx` — same floor as `/collection`; the stale Add-panel comment corrected (erratum 5) | after 4 |
| 7 | `usePendingChange` second consumer; the accent rule + `1 → 2` (erratum 1 — unblocked). **Errata 10–11 moved the rule to a drawn strip down the whole tile and dropped `+N` entirely** | after 4 |
| 8 | `ProxyTag` moves from the tile's art to the caption slot — already drawn at `deck-card-tile.tsx:121` (erratum 1) | after 4 |
| 9 | `MarkKey` in card view — **reinstated by `ADDENDUM-the-key.md`** as 9a–9d: one new string, one optional prop, one guard becomes a branch. Samples unchanged (erratum 9) | no |
| 10 | `×1` suppressed on `/collection` — severable, recommended | after 3 |

Items 3 and 4 ship in the same release: one caption on two surfaces, and splitting them leaves the
app with two caption shapes for one idea.
