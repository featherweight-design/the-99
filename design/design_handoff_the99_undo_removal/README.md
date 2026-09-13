# The 99 — Undo a removal (design handoff, R3)

**#390.** Source of truth: `design_handoff_the99_deck_versioning/` (§Decisions 3/3b,
`STATES-pending.md` table B, its copy file), `design_handoff_the99_add_panel/ADDENDUM-README.md`
§5 (#185), and **`src/lib/decks/add-validation.ts` + `draft-state.ts`**, which R2 did not read.
Voice: Kitchen Table.

Canvas: `The 99 - Undo Removal (R3).dc.html`. R1 and R2 are kept for the diff.

---

## What changed from R2

**Both refusal states were unreachable.** `Put back` is an add, and in this app adds never refuse
on claims — they price them. `DeckAddRejection` (`add-validation.ts:22`) is three values —
`not-commander-legal`, `off-color-identity`, `is-commander` (meaning *this* deck's own commander) —
and `addCardToDeck` does not read availability at all.

A row under `Going out` was in this deck's committed list, so it **already passed legality and
colour identity**; and a commander is not a `deck_cards` row, so it never appears under `Going out`
to be refused. **Every gate that could refuse is closed by construction, and the claim gates were
never open.**

R2's error was choosing the wrong parent. **It modelled the restore on the pull flow.** A pull is
contended — it mutates another deck. **A restore mutates only your own draft.** If a card is another
deck's commander you can still add it today from the deck page one route away, where it reads as
*unavailable*, not *refused*. Making `Put back` refuse would have made a restore **stricter than an
add of the same card on an adjacent surface**.

### Deleted, and the single reason each existed

| Deleted | Existed only to |
|---|---|
| Both refusal states | draw a contention that cannot occur |
| The `claimed` tag word | name a refusal — **R3 introduces no new vocabulary at all** |
| The commander empty-control variant | handle a row that never appears |
| The 32px shared slot | align two refused rows' prices |
| `Pull it` → `Pull` | fit a refused row on one line at 390px |
| "A refusal is a route into the pull flow" (R2 §7/§9) | frame pull / buy / leave it out |
| `8 to buy · $254.10` → `9 to buy · $263.00` | price a declined pull |
| **The in-flight state** | hold a row for a refusal to land on — see §3 |

Two review rounds of alignment work on the price column goes with them: **there is no second price
to align to.** The right-align rule stays, because it is still what keeps labels on one edge, and it
now costs nothing to hold.

### What is left

**One always-succeeding link, one edited string, and the focus ruling.**

---

## The one change the audit did not ask for

**R3 drops the in-flight state and makes the restore optimistic.** This follows from the finding
rather than going beyond it.

R2 kept the row through the round trip for exactly one reason: **the refusal was drawn on it**. That
was #185's argument and R2 accepted it correctly. With no refusal to draw, **the argument retires
with the states it protected** — and a disabled control held for a round trip on an action that
cannot fail is precisely the ceremony R1 was criticised for.

It is also the only reading consistent with #185, whose undo is *not* optimistic because **its**
receipt is the thing that must survive to state a refusal. Same principle, opposite conclusion,
because the two surfaces draw their outcome in opposite places: **here the row leaving is the
success**, so an optimistic apply destroys nothing.

**Rule 4 is satisfied rather than departed from.** R1 asked to break *nothing unmounts mid-write*
and was refused. R3 does not need the exemption: the write cannot be refused, so there is no branch
in which the row should come back. **R1's requested ruling is withdrawn, not granted.**

A transport failure keeps its shipped treatment — the row returns and `MutationError` says so, the
app's existing behaviour for every optimistic write. **It is not a refusal:** nothing was decided,
and trying again is the whole remedy.

---

## Frames delivered

| # | Frame | Desktop | Phone |
|---|---|---|---|
| 1 | `Going out · 17` with `Put back` on every row, plus a quantity move | ✓ | ✓ (2) |
| 3 | Two states — restorable, taken — and why there is no third | ✓ | — |
| 4 | The edges — money, last remove, last change, over the cap, another deck holds it, discard, after commit, after reload, un-add | ✓ | — |
| 5 | The contract — inventory, eng notes, parity | ✓ | — |

R2's frame 1 (#185 as it ships) is dropped: the boundary was ratified last round and redrawing a
shipped treatment R3 does not touch is not worth the page.

---

## Decisions log

### 1. `Put back` always succeeds

Per the finding. One variant, no guard branch, no tag, no disabled state, no absent-control case.
**Every row carries it and every row's is live.**

The dot still shows availability, and **it never gates**: a card another deck now holds still
restores, because the deck is taking back a copy it already owns.

### 2. No change to any shipped control

`Pull it` keeps its border and its pronoun. `decklist-row.tsx` and `deck-card-undo-tile.tsx` are
untouched. **R3's one new element is a text label.**

### 3. Optimistic — see §The one change above

### 4. Two labels, unchanged

`Undo` (#185's, untouched) and `Put back`. Two features, two surfaces. The two-clocks argument
still holds and is still not load-bearing.

**And the word survives the finding intact.** `Put back` was chosen partly because a restore *can*
be refused, and it cannot — but it is still the pool's own vocabulary on the page that says *back in
the pool on commit*, and still the mirror of `Pull`. A request-word for an action that always
succeeds is honest; it is *asking* that is being described, not *doubt*.

### 5. The restored row leaves the list

Unchanged from R2. The `out` chip goes 17 → 16 and the group heading with it. A pull changes a row's
**availability**; a restore changes its **membership**.

### 6. No money moves, ever

R2's headline money case was **wrong twice over**, and the second reason is the deeper one. The
money block is scoped to `draftDiff.adds` (`draft-state.ts:320`) — but that scoping is not why
nothing happens. **A restored card is in neither list:** putting a cut back returns the draft to *no
change* on that card, so it leaves `Going out` and never enters `Coming in`. **Nothing is bought,
because the deck already holds it.**

This is the same mechanism as the un-add (§8): a restore *produces* the no-change state an un-add
starts in.

### 7. An un-add leaves nothing in `Going out`, and #185 covers the tap

Unchanged from R2.

### 8. The banner, the adds column, discard and history get nothing

Unchanged. Discard is still the confirm, still unrecoverable — **the restore does not make discard
safer and must not be sold as making it so.** History is unchanged: *no restore, no revert, no
rollback*.

---

## Component notes

| Component | Spec |
|---|---|
| **`Put back`** | **The only new thing in R3.** Borderless brass link, 12px 600 `--accent`, 34px tall, 44px square target at 390px, right-aligned in the `Going out` row's reserved action slot. Stops propagation. **One variant.** Calls `addCardToDeck` optimistically. |
| **Everything else** | No new token, no new hex, no new tag word, no new vocabulary, no new motion class, no client state, no new storage, no new mutation, no modal, no toast, no confirm, no tooltip, no spinner, no disabled state, no guard branch — and **no change to any shipped control**. |

## Notes for engineering

- **The restore is `addCardToDeck`, unwrapped** — the same call #185's undo makes. **No new
  mutation.** R2's thin-wrapper escape hatch is withdrawn: there is no holding deck to name.
- **No refusal enum and no refusal handling.** If a `DeckAddRejection` value ever fires for a row
  under `Going out`, it is a bug in the diff, not a state to draw.
- **Optimistic.** The row leaves on tap; a transport failure returns it via shipped `MutationError`.
- **`revalidateClaims` is already what `addCardToDeck` calls** — nothing to add.
- **Seniority is free** — `versions.ts:175` inherits `since` at commit by oracle id.
- **No new storage and no client state.** `Going out` is `draftDiff.removes`.
- **One shipped string is edited: `review.outNote`.** R2's second edit is withdrawn — **`review.pull`**
  (the correct key; R2 twice wrote `pullCta`) keeps `Pull it` unchanged.
- **Flagged, not edited: `review.lede`** — now wrong by one, though **less wrong than in R2**: a
  restore is a decision but never a contended one. A ratification question.
- **One live-region message per settle. No motion anywhere.**
- **Focus after a restore:** the group heading the row left — never the next row's control. **The one
  ruling carried intact through all three rounds, and the only one left.**

## Card-row compatibility

| Floor obligation | How R3 stands |
|---|---|
| Name + **one** availability slot | Held trivially — no tag, no price, no second marker added. |
| Every addition names what it displaced | The action slot was **reserved and empty** since R1.2. Nothing displaced; nothing added to a decklist row. |
| No grid template changes, no row grows, none two-line | **Holds by construction rather than by measurement** — one label, no variant. |
| Words, never colour alone | The only new element is a text label. No hue is load-bearing. |
| Canonical metrics (44/34px, radius 7, gap 9) | Unchanged. |

## Gap report

1. **No bulk restore.** Eleven of seventeen cuts back is eleven taps, or Discard. The right first
   shipment — a bulk restore is a selection model on a list with no selection model — but the obvious
   second want, and `Going out` is where it would go. **Cheaper now than in R2:** with no refusals,
   a bulk restore has no partial-failure story to design.
2. **`Going out` still has no windowing** (versioning's gap 2), and every row now carries an
   interactive control — a 300-row paste goes from slow to slow with 300 handlers.
3. **A restore is not itself undoable** beyond cutting the card again — which #185's receipt covers.
4. **R3 leaves two undo vocabularies live on adjacent surfaces.** `Undo` on the deck page and
   `Put back` one route away are both correct and the seam is defensible, but a player who uses both
   in one session meets two words for one intention.
5. **The optimistic apply is the one place a player could out-run the server** — tap `Put back` and
   commit within the same round trip. The commit path's own draft read settles it; **nothing in this
   feature guards it**, which is correct but worth an engineer's eye.
6. **`review.lede` is left factually wrong pending ratification** (above).

## Files
- `The 99 - Undo Removal (R3).dc.html` — the canvas. **Start here.**
- `The 99 - Undo Removal (R2).dc.html`, `(R1).dc.html` — kept for the diff.
- `INDEX.md` · `README.md` · `STATES-restore.md` · `undo-removal - copy strings.ts` · `READINESS.md`
- `brand/` — the locked brand sheet, copied in for self-containment.
