# Readiness Review — Collection edit addendum: pick which deck goes short (R1)

**Verdict:** 🟠 Orange
**Audited:** 2026-11-20 (cold audit, lane a6, rebased on origin/main e47c3e709)
**Related ticket(s):** #2983 (choose which deck goes short on removal), #2982 (warning deck links leave the installed app)
**Plan PR target:** TBD
**Handoff:** `design/design_handoff_the99_collection_edit/addendum-removal-chooser/` (README, Main, P1–P4, D1, Warning)

## Summary

The visual layer is buildable as drawn: every color is a theme token, the component it extends
(`src/components/collection/short-deck-warning.tsx`) exists and is the shared warning for every host,
the row facts (`lists N`, `committed it <date>`) exist on the claim model (`quantity`, `since`), and
the #2982 half (deck names stop being `target="_blank"` links) is a self-contained change. One
contract does not hold: call 4 says a pick writes "reservations for the keeping decks
(`assignCopyFor`)", but `assignCopyFor` / `assignCopyIn` (`src/lib/decks/assign.ts`) enforce ONE
authored reservation per card (a pick moves, never adds) and the contested chooser's radiogroup
(`contested-card-row.tsx`, `aria-checked` = "you chose this") is built on that rule. Every drawn
board has exactly one copy left (one keeper), which one reservation can express. The rule the
handoff states for the general case ("pick exactly as many decks as copies leave", shown whenever
2+ committed decks list the card) cannot be stored once two or more copies are left: with one
reservation plus seniority, the most senior deck can never be made to go short. That needs a
product call (below) before the plan. The #2982 link removal (P4, every host) is not affected and
may be planned on its own. Open questions A and B also still need Hugh's ruling recorded.

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ Boundary stated: chooser only on Edit copies removal and lowering with 2+ committed decks; every other host gets today's warning minus the link (call 6).
- ✅ Gaps G1–G4 and open questions A, B logged in the README and on Main.
- 🟡 "All seven hosts": `<ShortDeckWarning>` is mounted in six files on this tree (`edit-copies-sheet`, `revert-confirm`, `confirm-modal`, `sync-review`, `replace-review-detail`, `got-it-receipt`; `confirm-modal` carries several sources). The link lives once, in the shared component, so the count does not change the work.

### 🎭 State coverage

- ✅ Default (P1), Picked (P2), two copies three decks with refusal (P3), no choice (P4), Changed (shipped `notice`), Incomplete (playable in Warning, not on a board; its footer and disabled confirm are specified).
- ✅ Phone drawn for every state; desktop D1 draws the 400px dialog at Default, and the Warning board's `desktop` toggle plays the others. Desktop is the shipped dialog shell with the same body, so this is enough.
- 🟡 Pending, error and `and N more` (more than three decks) are not redrawn with the chooser; the shipped component's states apply (Cancel focus, `saving`, `role="alert"` error, inline reveal).
- 🟠 Two or more copies left (two or more keepers) is not drawn and cannot be stored as the README describes it (see Gaps).

### 🔌 Data contract

- 🟠 Keeper reservations: `assignCopyIn` deletes the oldest existing reservation before every insert ("ONE AUTHORED RESERVATION PER CARD, WHATEVER THE SUPPLY", `assign.ts` ~L177). Allocation is reservations first, then seniority (`allocateClaims`, `src/lib/cards/allocate.ts`). With one reservation, keepers = the reserved deck + the L-1 most senior others, so an arbitrary keep set of size ≥2 is unreachable. The schema (`card_assignments`, `src/db/schema.ts` ~L1437) would hold several rows per card; the one-per-card rule is code, tied to the card-assignments handoff's radio model.
- 🟡 The removal answer names only decks going short (`wouldShort: ShortDeck[]`, `ShortDeck` = deckId, deckName, oracleId, cardName, short; `src/lib/collection/write.ts` L279). The chooser needs every committed claimant on the card with `quantity`, `since`, and the default allocation. That is a new field on the edit action's answer, read from the same `loadAvailability`/`allocateClaims` under the write's lock. No migration.
- 🟡 Writing the pick inside the removal's transaction has a precedent: `ChangeOptions.assign` already calls `assignCopyIn(..., "set")` in-transaction and refuses with `assignRefused`. G2's `{ keep: deckId[] }` extends that.
- 🟡 Undo (G3): `HistoryRow.placed` / `undoPlacement` / `restoreToUndo` already record and restore ONE displaced reservation by exact `created_at`. History `rows` is jsonb, so recording the removal's pick needs no migration.
- 🟡 `confirmShort` / `warningCovers` re-check must also carry the picks; a changed answer redraws with picks reset (drawn as `Changed`).

### 🧱 Codebase fit

- ✅ Every hex maps to a theme token in `src/app/globals.css`: `--bg` #14110E, `--surface-rail` #1A1611, `--surface-raised` #211D18, `--elevated` #29241F, `--border` #2B241B, `--border-strong` #3A3229, `--border-dashed` #494037, `--fg` #EDE6D8, `--fg-body` #C0B8A6, `--fg-muted` #A59C89, `--fg-faint` #948B78, `--accent` #CF8745, `--accent-dim`/`--accent-shadow` #6B482A, `--danger` #C6533F.
- ✅ Extends the shipped component and copy module (`collectionEditCopy.shortWarning`); date via `formatShortDeckDate` as `contested-card-row` stamps it.
- 🟡 New strings go to `src/lib/copy/collection-edit.ts` through /copy-review. The default footer (`… because {keepers} committed it first`) is false when an existing reservation, not seniority, decides the default; copy-review words that case.

### ♿ Cross-cutting

- 🟡 Warning board draws `aria-pressed` buttons. Follow the contested chooser's pattern: one copy = `radiogroup`/`radio` with `aria-checked`; several = checkbox semantics. Refusal is `role="status"`, footer `aria-live="polite"` (drawn).
- 🟡 Commander-held copies are never reservable (`assignCopyIn` subtracts them from the supply); a deck whose claim is its commander gets a plain row, not a pickable one. Brews are never named (`committedShortfalls`).
- ✅ No new query on page load: the claimant list comes back with the removal's own check. No analytics asked.
- 🟡 G4 guard: other `target="_blank"` links under `src/components` are external (Spellbook, ManaPool, Karsten, Fan Content); the guard must check internal hrefs only, as G4 says.

### ⏰ Drift from reality

- ✅ `short-deck-warning.tsx`, `contested-card-row.tsx`, `assignCopyFor`, `revalidateClaims`, `card_assignments`, `ShortDeck`, `warningCovers` all exist as named on e47c3e709.
- ✅ Backdrops are the shipped Collection page (Low Sun); the README notes the real stacking (warning over Edit copies over card details).

### 📝 Decision log

- ✅ Six calls recorded; R1 marked approved by Hugh 2026-11-17.
- 🟡 Open for Hugh: A (marked = goes short, drawn, vs keeps it like the contested chooser) and B (multi-copy decks, G1) are still open on the boards. Build to the drawn reading of A unless Hugh rules otherwise; record both rulings in the plan.

## Gaps requiring a Design round-trip (Orange/Red only)

- Gap 1: **Two or more copies left.** The README rule ("pick as many decks as copies leave"; shows whenever 2+ committed decks list the card) assumes reservations for every keeping deck, but a card holds one authored reservation, which the contested chooser's single-checked radio depends on. With 2+ copies left, some short-sets cannot be stored (the most senior deck can never go short). Question for Design/Hugh: (a) show the chooser only when one copy is left (every drawn board), and today's warning otherwise; or (b) allow one reservation per keeping deck, and say what the contested chooser draws when a card carries several authored picks. Option (a) needs no new drawing; (b) touches the card-assignments handoff.

## Eng-side clarifications (Yellow only)

- Item 1: The edit action's short answer gains the card's committed claimants (deck, `quantity`, `since`, default allocation), read with the write's own availability read. Follows `ChangeResult` `wouldShort`/`preview`.
- Item 2: Default = the server's allocation (reservations first, then seniority), not a client re-derivation. Footer wording for a reservation-decided default goes to /copy-review.
- Item 3: The pick is written in-transaction like `ChangeOptions.assign`, refused by name like `assignRefused`; `revalidateClaims` per affected deck after commit.
- Item 4: Undo records the moved reservation on the entry's `HistoryRow.placed` and restores it via the existing `restoreToUndo` path.
- Item 5: Commander-claim decks are plain rows; brews never listed.
- Item 6: Radio semantics for one copy, checkbox for several, matching `contested-card-row.tsx`.
- Item 7: Multi-card rows (Sync, Replace, Revert) keep `N cards short` and their expansion, with no `lists · committed` sub line (no single date applies); the deck name becomes plain text.
- Item 8: P4's single-deck sub line needs `quantity`/`since` on `ShortDeck` for the one-card hosts (`newlyShort` extension).

## Decisions inherited

- Rows are the control; no new button. Default pre-marked and neutral; a pick is accent plus footer sentence plus `Back to first committed` (card-assignments grammar).
- No deck links in any warning host (#2982).
- A pick changes no list or version; it writes reservations only, inside the removal's transaction.
- Full + extra tap = inline refusal, never a disabled row.
- Title and confirm unchanged (`Removing {card} leaves {k} deck(s) short`, `Remove anyway`); confirm stays the elevated secondary, Cancel takes focus.

**Flags (product calls, not gaps):** no migration; no new feature switch named (the handoff names none, so it rides the collection edit line's switch or none); no model call, spend or email.
