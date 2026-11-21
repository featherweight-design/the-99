# Readiness Review — Move a copy, addendum: several picks

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-21 (cold read against origin/main 62e922c86, PR #3084)
**Related ticket(s):** #2980 (amends `design_handoff_the99_card_assignments` decision 3b and `assign.ts`'s one-reservation rule)
**Plan PR target:** TBD

## Summary

Every surface the addendum names is drawn on phone and desktop, the shipped pieces it cites exist as named, and the ruling is buildable. The data model for `card_assignments` already holds several picks: its key is `(user_id, oracle_id, deck_id)`, the claim SQL (`reservations` in `availability-query.ts`) already caps a window of several reservations at the supply, and `allocate` already honors several `granted` rows ahead of the commit-order queue. The one-pick rule lives only in code (`assignCopyIn`'s delete-before-insert, `previewAllocation`'s single `chosenId`, and the radiogroup). **No migration for `card_assignments`.** One migration IS needed elsewhere: `pending_assignments` (Other decks picks) has primary key `(user_id, oracle_id)`, one pending pick per card, and call 7 makes an Other decks pick count toward the cap. The addendum's G1–G6 miss it. No Design round is needed; each gap below is settled by a drawn call.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Ruling, seven calls and the Hugh worked case (5 Fabled Passage, 6 decks) are explicit; one copy is stated unchanged.
- [🟡] Non-goals are implicit (no Clear all, `Back to first committed` stays retired). Fine as drawn.

### 🎭 State coverage

- [✅] Phone P1–P5 (before/after, untick, cap), C1–C3, H1–H2, L2; desktop D1–D6. Cap-reached and untick states drawn.
- [🟡] Not drawn: several picks where one is an Other decks pick (pending until commit), and the all-decks cart's chooser. Settle from P1–P5: a pending pick is a pick row with the shipped pending outcome copy and counts toward the cap.

### 🔌 Data contract

- [✅] `card_assignments` PK is per deck; `copies` defaults 1 and the chooser only writes 1; `card_assignments_copies_positive` check unaffected. Several rows per card already satisfy every constraint. Claim SQL grants in `(created_at, deck_id)` order capped at `owned - committed commanders`, so an over-cap row is harmless (it grants 0), and the cap refusal in `assignCopyIn` (`taken` vs `giveable`) is the only enforcement needed.
- [✅] G2 verified: `allocate` subtracts every `granted` first, then walks the queue; a pick on the oldest deck is not double counted (`unreserved = quantity - granted`).
- [🟡] `assignCopyIn` `set` mode (cart purchase's pick) also hits the delete-oldest branch. The addendum covers only toggle. Decide: `set` adds below the cap and, at the cap, keeps today's move-the-oldest so a purchase never fails.
- [🟡] Pending picks: `pending_assignments` PK `(user_id, oracle_id)` and `assignCopyIn` deletes the card's pending row on every reservation write. Both assume one choice per card across groups. Several picks needs the PK widened to include `deck_id` (**migration**), `assignPendingFor` to add rather than replace, and `assignCopyIn` to delete only that deck's pending row. Cap counts reservations plus pending picks.
- [🟡] G4 (removal leaves picks over copies): the claim SQL already silently grants the oldest picks first, so display is right without a write; the newest-pick-drops rule only needs to prune rows (`prune-assignments.ts`). Follow the addendum's proposal.
- [🟡] G3: `history-live-view.ts` `nowHolderNames` returns every holder today. The commit-order-only allocation is `allocate` with `granted: 0`, computable from the claims the live read already loads; no schema change.

### 🧱 Codebase fit

- [✅] Reuses `ContestedCardRow` / `AllocationMark`, `CopyChooserDialog`, the refusal slot spacing, `--accent-text`, `--fg-muted`, `--fg-body`. Strings are mostly new `card-assignments.ts` / `move-copy.ts` entries (G6 says none beyond the table).
- [🟡] `previewAllocation(claimants, owned, chosenId)` must take a set of picks (G1), still delegating to `allocate`.
- [🟡] The chooser appears on card details, History's `Went to` line, the History entry's Can move tab, and also the arrivals summary rows and the all-decks cart; all go through `contested-card-row.tsx` and `assignment-actions.ts`, so one change covers them. Check by import, not by the drawn list.

### ♿ Cross-cutting

- [🟡] `contested-card-row.tsx` is `role="radiogroup"` / `role="radio"` with `aria-checked`; its comment ties that to one pick. With 2+ copies several are checked, which is wrong for a radiogroup. The addendum gives the option string (`..., your pick, gets it. Select again to untick.`) but not the role. Settle: `role="checkbox"` group for 2+ copies, radio for one copy; arrow-key traversal and focus-to-full-line on a refused select as in call 4.
- [✅] Announcements for pick, untick and full are specified. No new telemetry.

### ⏰ Drift from reality

- [✅] The addendum's own claims check out against main: `nowHolderNames` returns every holder, `assignCopyIn` deletes before insert. `assign.ts`'s header comment (one reservation) and `previewAllocation`'s header must be rewritten with the change.
- [🟡] Cites the card_assignments handoff's decision 3b as amended; that handoff's single-select accessibility rationale (in `assign.ts`) is superseded for 2+ copies.

### 📝 Decision log

- [✅] Approved by Hugh 2026-11-21; calls numbered; G4 flagged as needing Hugh only if he disagrees.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

- Item 1: `pending_assignments` widens to one row per `(user, oracle, deck)`; migration; cap counts reservations plus pending picks; a reservation write deletes only its own deck's pending row.
- Item 2: `set` mode adds below the cap, moves the oldest at the cap.
- Item 3: 2+ copies draws `role="checkbox"` options; one copy stays radio.
- Item 4: Cart and arrivals summary ride the same component; verify by import and run the route×viewport sheet.
- Item 5: `gained` for History = holders now minus `allocate` with `granted: 0`.
- Item 6: G4 prune drops the newest pick by `created_at`; display already correct.
- Item 7: Receipt Undo (G5) deletes the row by its carried exact `createdAt` for that deck.

## Decisions inherited

- Picks up to copies owned; picked decks get a copy, oldest unpicked fill the rest, newest unpicked goes without.
- Untick by selecting again; no Clear all; `Back to first committed` stays retired.
- One copy unchanged (round mark, single select, a select moves the pick).
- History's record is never rewritten; `Now X has it.` names only decks a pick put a copy in.
- Copy table in the addendum is final; run /copy-review on it.
