# Readiness Review — Collection edit addendum: pick which deck goes short (R1 + R2)

**Verdict:** 🟡 Yellow  **Audited:** 2026-11-20  **Related ticket(s):** #2982, #2983  **Plan PR target:** TBD

## Summary

The earlier Orange (one gap) is closed. Hugh ruled on 2026-11-20 that the chooser shows only when exactly one copy is left after the removal, so one authored reservation (`assignCopyIn` in `src/lib/decks/assign.ts`, "ONE AUTHORED RESERVATION PER CARD") can store the pick. R2 then drew the rest of the matrix (two copies left, Undo receipt, Replace with several cards, desktop for each) so every host and state has a phone and desktop drawing or a stated rule. Undo needs less new work than the README implies: `write.ts` (~L992-1040) already snapshots prior reservations when `opts.assign` and `opts.receipt` are set, and records `placed` (with `displaced`) on the history row, which `restoreToUndo` restores. What remains is Yellow eng work: the removal's short answer must carry every committed claimant with `quantity` and `since`, and the confirm must carry the one keeper deck. Wording (including the footer when a reservation, not seniority, decides the default) goes to /copy-review.

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ Boundary is one rule (call 1 and R1 call 6): Edit copies removal or lowering, 2+ committed decks, exactly one copy left. Everything else is today's warning minus the link, with a reason line where a chooser would otherwise be expected.
- ✅ Seven hosts tabled in Main-R2; Settled A (reason line stays) and the rule are recorded.
- 🟡 `ShortDeckWarning` is mounted in six component files (`edit-copies-sheet`, `revert-confirm`, `confirm-modal`, `sync-review`, `replace-review-detail`, `got-it-receipt`); `confirm-modal` carries several sources. The link is in one place (`short-deck-warning.tsx` ~L149, `target="_blank"`), so the count does not change the work.

### 🎭 State coverage
- ✅ Default (P1/D1), Picked (P2), three decks one copy left with refusal (P3/D3), one deck (P4/D2), two copies left no choice (P5/D4), Undo receipt read-only (P6/D5), Replace with several cards open inline (P7/D6), Changed (shipped `notice` redraw), Incomplete (playable in Warning, rule specified). Phone and desktop exist for each.
- 🟡 Pending, error and `and N more` (over three decks) are not redrawn with the chooser; the shipped component's states apply (`saving`, `role="alert"`, inline reveal, Cancel focus).
- 🟡 Open question A (marked = short vs keeps it) is drawn as "marked = goes short" and the README marks R1 approved; build to the drawn reading and record it in the plan.

### 🔌 Data contract
- ✅ One keeper, one reservation: `assignCopyIn(tx, userId, oracleId, keeperDeckId, "set", report)` is already called in the removal's transaction via `ChangeOptions.assign` (`write.ts` L240, L1022) and refuses by name (`assignRefused`). The pick maps to `assign: { oracleId, deckId: keeper }`; G2's `{ keep: deckId[] }` need only ever hold one id in R2.
- ✅ Undo (G3 / R2 call 6): the prior-reservation snapshot and `placed.displaced` already exist and are restored by `restoreToUndo`. Eng should confirm the removal path (not only Move a copy) passes `receipt` with `assign`; at most a small wiring change, no migration.
- 🟡 The short answer (`wouldShort: ShortDeck[]`, `write.ts` L336) names only decks going short. The chooser's rows need every committed claimant (deck, `quantity`, `since`, default allocation). `since` is on the claim model (`allocate.ts` orders by `(since, deckId)`), so the "committed it <date>" data exists; the field on the answer is new and is read under the write's lock.
- 🟡 Commander-held copies are not reservable, and brews are never named; a deck whose claim is its commander gets a plain row. `confirmShort` / `warningCovers` must carry the pick, and a changed answer resets it (the drawn Changed state).
- 🟡 Multi-copy decks (G1): a deck listing 2+ copies is one row, `short N` capped by what it lists, per R2 call 4.

### 🧱 Codebase fit
- ✅ Handoff colors are theme tokens (`--fg-faint`, `--danger`, `--accent`, `--border-*` all present in `src/app/globals.css`); the component, `collectionEditCopy.shortWarning` and `gotItCopy.shortWarning` exist and are extended.
- 🟡 New strings go to `src/lib/copy/collection-edit.ts` and `i-got-it.ts` via /copy-review: US English, no em dashes, the reason lines, and the default footer (`because {keepers} committed it first`) when a reservation decides the default.
- 🟡 Date uses `formatShortDeckDate` (`src/lib/decks/format`), as `contested-card-row` does.

### ♿ Cross-cutting
- 🟡 The Warning board draws `aria-pressed` buttons; follow the contested chooser. The player marks the decks that go SHORT (the one unmarked deck keeps the copy): with one deck to mark (two decks list it) the rows are a `radiogroup`/`radio` with `aria-checked` (round mark); with two or more to mark (three or more decks) they are `checkbox`es in a labelled group with the tally `{p} of {n} picked` (square marks) and the full-tap refusal as `aria-live="polite"` footer text (corrected 2026-11-20 with Hugh's ruling that the boards stand).
- 🟡 Plain rows have no tap target now; several-card rows are a button with `aria-expanded` over the whole row.
- ✅ No new page-load query; no analytics asked. G4 guard (no internal `href` with `target="_blank"` under `src/components`) must skip external links (Spellbook, ManaPool, Karsten).
- 🟡 #2982: with the link removed, installed-app navigation cannot leave the app from this warning.

### ⏰ Drift from reality
- ✅ `short-deck-warning.tsx`, `contested-card-row.tsx`, `assignCopyFor`/`assignCopyIn`, `revalidateClaims`, `card_assignments`, `ShortDeck`, `got-it-receipt.tsx` (source `"undo"`), `restoreToUndo`/`placed` all exist as named.
- 🟡 README says the chooser P3 is "square marks, `2 of 2 picked`" in R1 text; R2 and Main-R2 supersede this (one copy left only). Plan from R2.

### 📝 Decision log
- ✅ R1 approved 2026-11-17; Gap 1 ruled and R2 approved 2026-11-20; Settled A recorded; Open question B resolved by R2 call 4.
- 🟡 Struck text in the README's R1 sections (G1, open A/B, P3's "two copies") should be read through the R2 section; the plan states the final rules.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

Prior audit gaps:
- Gap 1 (two or more copies left cannot be stored with one reservation): CLOSED. Chooser limited to exactly one copy left (Hugh, 2026-11-20); two or more left is drawn as P5/D4 with a reason line; every drawn chooser board has one keeper.
- Prior Yellows (claimants on the answer, in-transaction write, undo, copy, aria): carried below as eng items.

## Eng-side clarifications (Yellow only)
1. The removal's short answer gains the card's committed claimants (deck, `quantity`, `since`, default allocation) from the write's own availability read, and `ShortDeck` gains `quantity`/`since` for one-card hosts.
2. The chooser is offered only when the server says one copy is left; the client does not re-derive it. Default = server allocation (reservations first, then seniority).
3. Pick is written in-transaction through `opts.assign`, refused by name like `assignRefused`; `revalidateClaims` per affected deck after commit.
4. Verify the removal path records `placed`/`displaced` for undo (the machinery exists); no migration.
5. Commander-claim decks are plain rows; brews never listed.
6. Radio semantics for the chooser, `aria-expanded` rows for several-card hosts.
7. G4 guard checks internal hrefs only.
8. Strings and the reservation-decided footer go to /copy-review.

## Decisions inherited
- Rows are the control, no new button; default pre-marked neutral, a pick is accent plus footer sentence plus `Back to first committed`.
- No deck links in any warning host (#2982); row facts inline.
- Chooser only with exactly one copy left (Hugh, 2026-11-20); reason line otherwise (Settled A).
- A pick writes one reservation in the removal's transaction; no list or version change; Undo restores prior reservations.
- Full + extra tap is an inline refusal, never a disabled row; title and confirm unchanged, Cancel takes focus.
- No migration, no new feature switch, no model call.
