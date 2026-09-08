# READINESS — Top off the last 31 (R3)

**Self-assessed: 🟢 Green.** One call, taken. R2's two calls stand, #361 is confirmed clean, and
nothing else reopens. **R3 adds no control, no toolbar string, and no schema field beyond R2's
table** — it corrects a rule R2 wrote without looking at the cluster next to it.

---

## The call

R2's ledger arrived on top of a shipped auto-lifecycle cluster it never mentioned.
`clear-auto.tsx` is **three controls** — the kept note, the bulk keep, and the sweep — with a
per-row keep alongside (`keepAutoCard` / `keepAllAutoCards`, `actions.ts:546,569`), and **keeping a
card clears its auto flag** (`schema.ts:195-198`). R2 ruled on the sweep and inherited the rest by
accident.

> **Keeping is not a third reversal. It is a graduation out of provenance — so a kept card leaves
> its pass, exactly as a card removed by hand does.**

**The shipped act already says this in the schema.** Keeping clears the auto flag: the card stops
being the app's suggestion and becomes the player's choice. **A ledger of what the app placed must
not still claim a card the player has adopted.** R2 already has the rule for a card that leaves a
pass, so keeping is a *second way to leave*, not a new kind of event — which is why the whole call
costs one extra clause and no new construct.

**The line names which exit each card took, because they mean opposite things:** `27 cards · 3 now
yours, 2 removed since` / `Undo these 22`. *Removed* is a rejection; *now yours* is an endorsement.
A ledger that blurred them into one "gone" count would be worse than one that only counted.

## The four consequences

| # | Audit's consequence | Call |
|---|---|---|
| 1 | **The seed line's reversal can vanish** | It cannot be orphaned, and now that is *provable*: `sweep absent ⟺ 0 auto rows ⟺ every pass empty ⟺ ledger absent`. Every step is a shipped rule and R2's state (a) already ends there. **`Keep all` empties the ledger and the toolbar in the same act.** Recorded as an **invariant**, and the thing to re-check if a future pass could survive with zero auto rows. |
| 2 | **What does `Undo these 27` do to a kept card?** | **Nothing — it cannot reach it.** A kept card is not in the pass. No contradiction with the keep control's meaning, and no pass un-undoable in part; the recount rules needed no extension, only a second word. **Keeping is now how a player protects a card from an undo** — a use the control did not have before, and a sentence a player can act on. |
| 3 | **Two reports of one fact** | **Two facts, kept apart rather than either being moved.** The toolbar note is about *the deck* (how much has graduated) and stays unmoved and unedited — the **only** deck-wide kept total. A line's `3 now yours` is about *a pass* (how much is still the app's to take back), and **the ledger never sums it.** The header states passes and money only. |
| 4 | **Backfill** | **No backfilled seed line. The ledger begins at migration and says so.** One dashed line, no `Show these`, no undo; pre-existing auto cards stay exactly as sweepable as today; the line goes for good the first time a pass lands. |

**On 4, specifically:** R2's rule inferred the seed from a set **keeping has already eaten**, while
`decks.filled` stays permanently true (`schema.ts:184-188`, never reset by a sweep) — so a filled
deck would render as barely filled, or with no ledger at all. **Design will not print a count it
cannot prove.** One honest line beats a fabricated 41-card seed, and inventing provenance is the one
thing a provenance ledger may never do.

## Rejected, with reasons

- **Keeping as a third reversal-adjacent act the ledger models.** It is the one act in the cluster
  that is *not* a reversal. Modelling it as one makes the ledger a history of everything that ever
  happened to a card — the version-control feature every round of this handoff has refused.
- **Keeping retires a pass from the ledger outright.** Right at the limit (a fully kept pass *does*
  leave), wrong in the ordinary case: keep one card of 27 and 26 are still the app's to take back.
  Retiring the line there would strand them.
- **Absorbing the cluster, leaving the toolbar only the sweep.** Wrong twice: it moves two shipped
  controls no issue complained about, and **the kept note must survive at zero auto, where there is
  no ledger to hold it** — the shipped rule is explicit that at 0 auto the sweep goes absent and
  `keptNote` stays.
- **A legacy seed count synthesised from `filled`.** `filled` records *that* a build happened, not
  what it placed.

## Engineering deltas new at R3

- **Keeping must clear a card's pass membership as well as its auto flag** — one join to maintain in
  `keepAutoCard` / `keepAllAutoCards`. **The only shipped action R3 asks eng to touch.**
- **`Keep all` empties every pass, so it removes the whole ledger**, with the revalidation the sweep
  already does.
- **The invariant to hold in code:** a pass with zero unkept, unremoved rows has no line — so the
  ledger is present exactly when the sweep is.
- **Kept and removed counts are derived, not stored.** The pass knows its original row ids; each row
  is currently auto, kept, or gone.
- **No backfill migration.** Decks with no pass rows render the legacy line (ledger state `l0`); do not synthesise a
  seed from `auto` rows or from `filled`.
- **Untouched, all three:** the kept note, `Keep`, `Keep all` — unmoved, unedited, and no string
  added to that cluster. Also still untouched: `AutoTag`, `Clear all auto`, `addCardToDeck`'s
  validation, `celebration.ts`, `availability.ts`, `RollupBands`, the role counter strip,
  `builder-spine.tsx`, and the whole of `/commanders`.

## R2 and R1, unchanged

The persisted fill-pass table and the ledger with a reversal per line · the seed as a line naming
the sweep · `Show these` as a mark that filters nothing · the commit in the quick-add dock's slot
with the dock collapsing to its notice · one door for two CTAs · one interleaved list with owned
pre-ticked · the tick cap as the trade · the two mid-fill sentences · the parity row with its
availability slot, dashed unowned dot and 40px cost track · no inner scroller · every count with its
denominator · no new token, no new hex.

## Open items

1. **The ledger still grows one line per pass, uncapped** (R2 gap 2) — and R3 slightly *improves*
   it: fully kept and fully removed passes now drop out, so ordinary use prunes the list. Still the
   part that gets worse with heavy use; the collapse-to-header fallback is unchanged and unbuilt.
2. **A pass whose cards were all removed or kept loses its line, so its money is unaccounted for**
   in the ledger. The shopping list is its own surface with its own removals, but nothing joins the
   two.
3. **`filled` is never reset, and R3 does not fix that** — it routes around it. If eng would rather
   reset `filled` on a full sweep, the legacy line could be narrowed further; that is an eng call
   and this design does not need it.
4. **The scratch selection still dies on reload** (31 ticks of work), unchanged from R2.
5. **The four components remain absent** (`last-slots-strip.tsx`, `builder-spine.tsx`, `button.tsx`,
   the shopping row); `clear-auto.tsx` and `builder-shell.tsx` were readable only as the audit
   quoted them. **If the components disagree, they win**, and README's component table is what to
   correct.
6. **Cost pips still stand against parity Q2's refusal**, argued on Q2's own rule — README gap 9,
   and still the cheapest call here to reverse.
