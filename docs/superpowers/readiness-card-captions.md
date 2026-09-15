# READINESS — Card captions (R1 audit)

**Verdict: 🟢 Green, with seven errata — one of which withdraws a claim this audit made.** All four calls the brief left open are called, every
named state is drawn, and nothing here waits on a design decision. The errata below are
eng-resolvable under the handoff's own tie-break rule and do not return to Design.

Erratum 5 was added after the brief's own review round; the other five came from the audit.

**Audited against `origin/main` at `f5745d11` on 2026-09-15.** Every claim below was read on that
commit. The handoff was drawn against an earlier tree, and three of the five errata are merges
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
| `MarkKey` draws nothing in card view | `decks/decklist.tsx:198` | ✅ drawn nothing — but **not** a one-line fix, see erratum 7 |
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
`9px` desktop / `8.5px` phone, `px-[5px] py-[1px]`, radius 4, **and the chip's border becomes an
outline** so the three boxes are the same height. Normalizing is the entire point of the call.

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
(`deck-card-tile.tsx:88`), and `deck-card-undo-tile.tsx:12-21` borrows `TILE_SHELL` and
`TILE_ART_RATIO` from the live tile *so that a removed card leaves a hole exactly its own size*.

Its caption height is hardcoded: `min-h-[44px] md:min-h-[36px]` (`:53`) — the live tile's current
figure. The handoff takes the caption to a fixed 52/46. The receipt then sits 8px short at the
phone and 10px short on desktop, and the invariant its own comment states quietly stops holding.

**Resolution — eng, not Design.** The receipt's design is unchanged; only its height is wrong.
Export the caption height beside `TILE_SHELL` and have both read it, exactly as they already share
the shell and the ratio. Ledger gains an item.

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
| 5 | Caption height exported beside `TILE_SHELL`; `UndoTile` reads it (erratum 4) | after 4 |
| 6 | `decklist-group.tsx` — same floor as `/collection`; the stale Add-panel comment corrected (erratum 5) | after 4 |
| 7 | `usePendingChange` second consumer; caption edge + `1 → 2` / `+N` (erratum 1 — unblocked) | after 4 |
| 8 | `ProxyTag` moves from the tile's art to the caption slot — already drawn at `deck-card-tile.tsx:121` (erratum 1) | after 4 |
| ~~9~~ | ~~`MarkKey` above the card grid~~ — **withdrawn, erratum 7.** Open with Design | — |
| 10 | `×1` suppressed on `/collection` — severable, recommended | after 3 |

Items 3 and 4 ship in the same release: one caption on two surfaces, and splitting them leaves the
app with two caption shapes for one idea.
