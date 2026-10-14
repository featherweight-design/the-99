# Amendment 6 — Keep all auto

`design/design_handoff_the99_amendments/` · 2026-09-06 · **R1.**

One control in the decklist group toolbar (`group-toggle.tsx`), both widths. A light amendment:
five copy keys, one server action, one optimistic edit, two props, one `flex-wrap`.

Canvas: `The 99 - Keep All Auto (R1).dc.html` · states: `STATES-keep-all-auto.md` · copy:
`keep-all-auto · copy strings.ts`.

**Verdict: 🟢 Green on all three open calls.** One deletion applied in another amendment's copy
file, at the brief's instruction (§5 below).

---

## The defect, in one line

`auto` is provenance, and provenance expires — but nothing lets the player retire it. `keep ✓`
clears one row (`recommendations.ts:88`, `auto-tag.tsx`), and the only bulk control is
`Clear all auto`, which **deletes the cards** (`clear-auto.tsx:43`). A player who agrees with all
forty fill picks is offered one button to throw them all away and none to accept them all. So
nobody clears, and the tags stay lit forever.

That is different from `short 1` / `buy` / `2nd copy`, which describe the collection against the
deck — a fact that keeps changing. Those never expire. `auto` reports history the player already
knows.

**Called: `Keep all {n}`, a second ghost button beside `Clear all auto · {n}`.** Nothing else.

> **Locked, and not reopened.** `schema.ts:183-185`: `auto` is *"cleared by the keep control
> alone — re-sorting, regrouping, or opening the card detail must leave it set"*, so that looking
> at a card cannot silently accept it. This amendment adds a **second keep control**, not a
> second way for the flag to clear on its own. No automatic expiry.

---

## The three calls

### 1 · Placement and weight → **Same ghost. Keep leads. Neither is primary.**

`ClearAutoButton`'s treatment exactly — mono 12px `--fg-body`, transparent ground, 1px
`--border-strong`, radius 8px, padding `6px 12px` — because these are two bulk actions on the same
forty cards and **the toolbar has no view on which answer is right.** A filled or accent plate on
either would make the app recommend an answer it cannot know, and the row already has exactly one
accent plate: the active filter pill.

**Order carries the whole distinction, and it is enough.** Keep sits left of Clear, so the cluster
reads from the safe answer to the destructive one and the sweep stops being the first bulk control
the eye lands on. Position within the toolbar is unchanged: right of the spacer, left of the
`Group` label. The new button goes **inside the existing wrapper `<span>`** that already holds the
`keptNote` and the sweep, so one flex child owns the whole auto-lifecycle cluster and the
toolbar's gaps do not move.

**The zero-state rule is reused whole:** absent at `count === 0`, never rendered disabled, disabled
only while its own write is in flight. Both controls read the same count, and a toolbar where one
is present and the other is not would say that count means two things. The `keptNote` keeps living
outside both guards — design-table state 7, and the reason the wrapper span exists at all.

**At 390px the pair takes its own line.** The shipped row already carries two filter pills, the
sweep and two grouping pills; a second control in it either truncates a label or pushes `By role`
off the edge. So the container gains `flex-wrap` and the auto cluster drops to a full-width second
row with two 44px targets. Mobile label is `Keep {n}`; `Clear auto · {n}` is **not** reworded to
match — a shipped string is not collateral of a new one.

**Rejected: a two-part split control.** One segmented pill reading `Keep all` / `Clear all` puts
an accept and a delete in one box, 8px apart, on a phone. The mis-tap there is forty cards gone.

### 2 · Does Keep all get a receipt? → **No strip. One announcement.**

`SweepReceipt` exists because its rows are gone and the strip is the only route back. A keep takes
nothing: every card is still in the deck, at the same quantity, in the same group. There is nothing
for a receipt to hold open.

And **an Undo would have to write `auto = true`** across forty rows — the app re-marking as its own
the cards the player has just declared theirs. That is the write `schema.ts`'s comment stands in
front of. A reversal that re-claims is worse than no reversal, so the cost is stated in the gaps
rather than drawn.

Three receipts already exist, and two of them are free:

1. **Forty tags leave at once.** One optimistic pass; group clauses drop their `· N auto` tails;
   the fill's provenance paragraph — gated on `autoCount > 0` — unmounts with them.
2. **The control is no longer there.** Both buttons go absent at `count === 0`. A bulk action whose
   own control vanishes on completion has confirmed itself where the player was looking.
3. **One spoken line**, into the live region already carrying `sweptAnnounce`:
   *"40 cards kept. 68 cards are yours now."* One message per settle, never one per row. Its second
   clause is `keptNote`'s sentence, so the spoken and written receipts agree word for word.

**No confirm dialog** (the label carries the count, as the sweep's does for a heavier act), **no
celebration** (not one card moved), and **no new refusal shape** — a rejected write reuses the
sweep's inline treatment with its own words: *"We couldn't keep those. They are still marked
auto."*

### 3 · The `keptNote` after a Keep all → **It stays, unedited, and it is the last thing standing.**

The note counts non-auto cards, so after a bulk keep it reads `68 cards are yours now` — a claim
about the whole deck, which is exactly what just became true. It is not arithmetic the player has
to check against anything; it is the sentence the action earned.

Everything else in the cluster leaves in the same pass: both buttons go absent, the fill's
provenance paragraph unmounts, every group clause drops its auto tail. **That is the toolbar going
quiet** — down to one mono 11px `--fg-locked` line, desktop only, exactly as it ships. The note has
always been the last survivor of the auto lifecycle; this amendment only stops that state from
requiring forty clicks to reach.

- **Rejected: a different note after a bulk keep.** "All 68 cards are yours now" is a second string
  for a state that is not special — forty individual keeps land in the identical place.
- **Rejected: retiring the note at `n === built`.** It would disappear at the moment the flow
  completed, which reads as a failure rather than a finish, and would take the keep's only
  persistent receipt with it.

---

## Engineering

- `recommendations.ts` — the five keys in `keep-all-auto · copy strings.ts`, into the existing
  `auto` block. **Nothing deleted, nothing re-worded.**
- `actions.ts` — `keepAllAutoCards(deckId)`: one `update deck_cards set auto = false where
  deck_id = ? and auto`, returning the row count for the announcement, under the same `for update`
  lock and `claimSurfaces(deckId)` revalidation the sweep uses. **The identical write already
  ships** at `update-actions.ts:307`, where applying a re-import clears `auto` on every card the
  list names — this is the deck-wide case of a statement the codebase has already made.
- `optimistic-deck.tsx` — a `keepAll` edit: `map(c => c.auto ? { ...c, auto: false } : c)`. Its own
  edit rather than a loop of `keep`, for the reason the sweep's own comment gives.
- `clear-auto.tsx` — the button inside the existing wrapper span, above the sweep. The file already
  owns this cluster and its zero-state rule.
- `group-toggle.tsx` — two props (`onKeepAllAuto`, `keepAllPending`) threaded exactly like
  `onClearAuto`/`sweepPending`, plus `flex-wrap` on the container for 390px.
- `builder-shell.tsx` — the handler beside the sweep's; `autoCount`/`keptCount` are already
  computed off the optimistic list and need no change.
- **Tests worth naming:** the write clears only `auto` rows and touches no `quantity`; absence at
  `autoCount === 0`; **both** controls disabled during either flight (which is also the shipped
  `sweepPending` gap in `gap-report-synergy-discovery.md`, now with a second control depending on
  it); the announcement fires once per settle.

---

## Gap report

1. **A mis-tapped Keep all cannot be undone.** It costs no cards — it costs the sweep, and the
   player is back to removing rows one `✕` at a time. Accepted in preference to an Undo that
   re-claims.
2. **`Keep all {n}` now lives in two copy modules** — here, and in amendment 2's removal diff.
   Deliberate (the subjects differ), and a future reader will read it as a duplicate once.
3. **The `keptNote` is desktop-only** (`hidden md:inline`), so a phone player's only receipt is
   spoken. Shipped behaviour, not widened here.
4. **Nothing distinguishes "kept deliberately" from "kept in bulk"** afterwards. By design: no
   column records it, and adding one would re-create the provenance this amendment retires.
5. **A fill that runs after a Keep all re-populates the tag**, and the player meets the pair again.
   Correct, and unannounced.

---

## §5 · Also settled — the hand-added marker is deleted

At the brief's instruction, `handAdded`, `ariaHandAdded`, `outBodyHandAdded` and
`outBodyMobileHandAdded` are **dropped from `deck-reimport · copy strings.ts`** in this R1.
`auto = false` is equally true of a previous import's rows, and no column records who placed a
card, so the marker claimed a fact the data cannot support — on the one screen where a wrong claim
costs the player a card.

Nothing replaces it. `outBody` states the removal in one sentence at both widths; `rowAria` keeps
its optional marker argument for `auto`, now the only marker; the group is still first on the
screen because it is still the only group with a decision in it. **§2's gap 3, which existed to
excuse the proxy, is closed by deletion rather than by wording** — the combined `README.md` is
corrected accordingly.

## Files

- `The 99 - Keep All Auto (R1).dc.html` — the canvas: the toolbar before and after at both widths,
  the receipt argument, the note's aftermath, the seven-state ledger, engineering and gaps.
- `STATES-keep-all-auto.md` — the seven states, both widths, plus what is not a state.
- `keep-all-auto · copy strings.ts` — the five additions, each naming what it must not touch.
- `AMENDMENT-6-READINESS.md` — verdict, what carries forward, what an audit should check first.

**Otherwise new files only.** The one edit outside them is the deletion above.
