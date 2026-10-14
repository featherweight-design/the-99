# The floor — what every card row carries

**Q1, in full.** The central question of the brief: is there a core set of elements every card row
must carry, which rows are missing them, and does the floor reach the narrow utility rows or only
the browsing rows?

## The ruling

**A card row carries its name and one availability slot. Both widths. Every row with an oracle id.**

That is the whole floor. It is two elements, and one of them is a slot rather than a component.

## Why these two and nothing else

**The name** is what the row stands for. It is also, after eng's click unification, the row's way
into the card modal on every surface — so it is load-bearing twice.

**Availability** is the one fact that changes what the reader does next, on every surface, in the
same direction. A browse row, a decklist row, a candidate row and a diff row all lead somewhere
different; "can I actually sleeve this" is the question all four readers are holding. It is also
already computed wherever there is an oracle id, so the floor asks for no new read except on one
row (see §The one data change).

**Everything else was considered and refused as floor.** Type line: the search row needs it to
separate two printings, the decklist does not need it at all because you chose the card. Quantity:
meaningless on a candidate row. Set and rarity: a browse-and-collect concern. Price: a shopping
concern, and drawing it on a synergy list would make a recommendation look like an upsell.
Ownership as a dot: two rows already say it better (see §The two rows that get no dot).

## The slot, stated precisely

The availability half of the floor is **one slot holding exactly one of `BuyTag` or
`AvailabilityMarker`**.

This is a better contract than "draw the marker", because the two components are complementary, not
alternative:

- `BuyTag` speaks about a card you have **none** of.
- `AvailabilityMarker` speaks about the **copies you have** — soft, hard, over. It renders `null`
  at `free`, which is the feature: a player whose collection covers their decks sees nothing new
  anywhere.

Between them they cover every card, so **a row that has the slot can never be silent about a card
that needs something said**.

### The one legitimate pair

An **owned** card on the Shopping list whose copies are already sleeved elsewhere draws the over
glyph **and** a `2nd copy` tag. Both facts are true and they are different facts: you own it, and
buying another is still the move. This ships today on `decklist-row` and is ratified, not merely
tolerated.

Outside that case, **two occupants of the slot is a defect**, and so is zero on a row that has an
oracle id.

## How far it reaches — and the one exemption

**It reaches every row that stands for a card, browsing or utility.** The brief offers the
browsing/utility split as a possible boundary. It is the wrong boundary. A player deciding whether
to *keep a removal* in the re-import diff is making a decision about cards leaving their deck, with
real money attached; that they arrived there through a utility flow does not make the question
smaller. Narrowness is a layout problem, and layout problems have a mobile ledger (below), not an
exemption.

**`unresolved-row` is exempt, and the reason is data.** It carries no oracle id.

> Owned, unowned, committed and over-committed are all properties of *your copies of a known card*.
> That row has no card.

A dashed dot there would assert "you do not own this" about something the app cannot identify —
a claim, not a placeholder. The row's three redundant signals already say what it is: the warning
left rule, the `?` in the dot's slot, the `unmatched` tag. The `?` also **keeps the dot's 7/8px
slot**, so the name stays on one vertical line with the card rows above and below it. That is the
right kind of parity for a row with nothing to say: hold the geometry, drop the claim.

`update-diff-row`'s `DiffRowUnnamed` variant is the same case for the same reason, and is exempt
with it.

## The two rows that get no dot

The floor asks for availability, not for a dot. Two rows state ownership **better** than a dot does,
and both stay as they are.

| Row | How it says it | Why it beats a dot |
|---|---|---|
| `collection/rows-view.tsx` | `×1` in `--accent`, 52/38px lead column | Gives the **count**. A dot only gestures at what the number states. |
| `decks/card-search-row.tsx` | `×1 owned` / `not owned`, mono, `--warning` when unowned | **Words, never colour alone.** Already the row's shipped accessibility posture. |

A dot beside a word that says the same thing is a second voice for one fact — and on a 375px search
row it is 8px plus a 9px gap taken from the name.

## The one data change

`update-diff-row.tsx` is the only row where the floor requires something the surface does not
already read. `DiffRowCard` is `{ oracleId, name, typeLine, auto, owned }`; it needs `availability`,
which means the diff query joins the rollup the decklist already reads.

Everything else the floor asks for is a component swap or a deletion.

## The mobile ledger

**Horizontal room is the binding constraint, so every addition names what it displaced.** The
count-only marker is one `flex-none` run of about 50px — that is the entire budget on a 375px row.

| Row | Desktop | Phone |
|---|---|---|
| `update-diff-row` | The marker takes the hand-rolled `buy` pill's slot: ≈50px for ≈38px. The 120px type column is untouched. | The pill and the type line are **already** desktop-only, so nothing is displaced. The name yields ≈50px, leaving ≈200px against a 64px `Keep` at 375px. If the name must not yield, the type line does not return on phone. |
| `synergy-row` (slice B) | The marker sits between the inclusion figure and the toggle; the 150px type column yields 50px under a single facet, where its label is short. | The `synergy · edhrec` meta line **is** the slot — the marker joins it as a third run, the same move `card-search-row` already makes. Nothing new claims the name's line. |
| every other row | no addition | no addition |

## Consequences worth stating

1. **Two of the twenty-four state cells are impossible by construction**, and that is an answer
   rather than a gap. `/collection` lists what you own, so it has no unowned row and never draws
   `BuyTag`. Drawn as such on the canvas.
2. **One cell is deferred, not exempt.** `synergy-row`'s over-committed state has no data path on
   the commander route. The row draws the committed dot, which is true and incomplete. It must
   **not** infer an over state from `committedTo` — that field is a single deck name, and
   over-committed is arithmetic across every finished list.
3. **The floor is the reason the shell can be shared at all.** Once every row has the same two
   obligations in the same two places, the differences that remain — a chevron, a `Keep`, a
   `+`, a `✕` — are genuinely that surface's own, and nobody has to guess which of them was a
   decision.
