# Readiness Review — Move a copy to another deck later

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-20 (cold audit, lane a6, rebased on origin/main e47c3e709)
**Related ticket(s):** #2980 (amends `design_handoff_the99_card_assignments`)
**Plan PR target:** TBD

## Summary

Every surface is drawn on the shipped components, phone and desktop, and the shipped pieces it names all exist as named: `AvailabilityDetail`, `CopyChooserDialog`, `ContestedCardRow` (with `AllocationMark`), `assignCopyFor`, `revalidateClaims`, `loadContestedCard`, `SearchField`, History's `RowLine` and its group tabs, `--avail-over-fg`. Of Design's three backend gaps, G1 and G3 are eng clarifications: existing readers cover them, composed. G2 is a true backend contract gap. Nothing in the tree can hold a pick for a deck whose committed version does not list the card. `assignCopyFor` refuses that on purpose, and a `card_assignments` row would count as a live reservation. G2 needs new storage, a migration, and commit and discard hooks. It does not need Design, because the drawn states (O2, O3, M3) settle the behavior and `pull_releases` is a working template for draft-lifetime state. Backend work on G2 can start now. UI follows the plan PR.

## The three backend gaps, checked against the code

| Gap | Ruling | Why |
|---|---|---|
| G1 card details reads | 🟡 Eng clarification | `loadContestedCard(oracleId, userId)` already reads live with no receipt (`src/lib/collection/summary-read.ts:133`; the I got it write reads it back the same way) and has no `isContested` gate. The Change rule reads `a.owned` / `a.free`, which `AvailabilityDetail` already holds (`card-detail-blocks.tsx:384`). The Other decks list composes existing reads: `listDecksWithStats` (`src/lib/decks/read.ts:1109`) carries commander and partner color identity, `built` and last-commit state; `validateCardForDeck` (`add-validation.ts:57`) is the color test; `availability.claims` says which decks already list the card. A new reader, no new data. |
| G2 pending pick for an Other deck | 🔴 True backend contract gap (no Design round) | `reservableAsk` in `src/lib/decks/assign.ts` reads a committed deck's ask from its NEWEST VERSION and returns `claimant-no-longer-asks` for a draft-only add. The code says so: "reserving on a draft add would let a draft-only ask displace a hard claimant". `card_assignments` (`schema.ts:1437`) has no pending state, and any row there counts in the claim model at once. The build needs a new table or column (**migration**), a commit hook that turns it into a reservation through `assignCopyIn`, and discard and remove-from-draft hooks that drop it. `pull_releases` (`schema.ts:1470`) is the lifecycle template: it lives as long as the source draft does, and commit or discard deletes it. "One choice across both groups" fits the shipped single-authored-reservation rule (`assign.ts`, `taken >= 1` branch): a pending pick displaces the existing reservation, and an existing pick clears the pending one. |
| G3 History live read | 🟡 Eng clarification | `wentTo` is frozen by rule (`went-to.ts` header) and stays the record. The live half is a batched `loadAvailability` / `loadChooserCards` over the page's oracle ids, with no schema change. The entry's rows load lazily (`history-actions.ts`, `detail.rows`), so per-row Change and `Now X has it.` ride that load. The collapsed summary's single-card Change (H1) and `Change where N cards go` (L1) need one batched read per History page over the entries' oracle ids. |

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Five calls, each tied to frames. The record is never rewritten. No list or version change from a pick in the top group.
- [🟡] One open question for Hugh (did Mutant Menace already list Fabled Passage) is logged and changes nothing in the build.

### 🎭 State coverage

- [✅] Phone: C1–C3 (card details), M1–M3 (copy counts and cap), O1–O3 and F1–F2 (Other decks, Find), H1–H3 (History), L1–L4 (large entry).
- [🟡] Desktop: History (D1, D2) and the large entry (L5) are drawn. Card details on desktop is described ("opens the same modal over its own dialog") but has no frame. The shipped 520 modal and the shipped `AvailabilityDetail` heading settle it.
- [🟡] Refusals inside the chooser (`no-supply-left`, `claimant-no-longer-asks`, `target-is-commander`) keep the shipped row's sentences. An Other decks pick that fails at commit (the deck's draft dropped the card, or its color identity changed) is not drawn. The pending pick simply lapses, as a `pull_releases` row does.
- [🟡] Undrawn History edge cases: after a move, the current holder may be a deck the record never named, or no deck at all (the collection shrank). `Now X has it.` names the live allocated claimants and is omitted when none hold it.

### 🔌 Data contract

- [🔴→eng] G2, as above: needs storage and a migration. Backend only.
- [🟡] G1 and G3 compose from existing readers (table above).
- [🟡] `CopyChooserDialog` requires `thisDeckId` (`copy-chooser-dialog.tsx:28`), which tags a deck `this deck`. Card details and History have no "this deck", so the prop becomes optional and no row is tagged, matching C2 and H2.
- [🟡] `assignCopy` revalidates through `revalidateClaims(deckId, userId)`. Card details and `/collection/history` must refresh too: add the History route, or redraw from the returned `card` as the receipt does.
- [✅] Change rule `owned > 0 && free <= 0` reads fields `Availability` already carries.

### 🧱 Codebase fit

- [✅] Tokens: accent, `--avail-over-fg` and the shipped surfaces all exist in `src/app/globals.css`. No new color, size or font.
- [✅] Reuses the shipped chooser, row, mark, SearchField and History groups. `Can move · N` is one more segment in the existing History tabs control.
- [🟡] Copy: the chooser sub today is `changeSub(card) → "<card> · added just now"` (`src/lib/copy/i-got-it.ts:76`). These doors need a sibling (`· ×N in your collection`). Every new string is DRAFT for /copy-review (G4), and the 2+ copy plural title is a copy item.

### ♿ Cross-cutting

- [✅] One authored pick stays one checked radio across both groups. This matches the shipped `aria-checked` rule in `assign.ts`.
- [🟡] Stacking: the chooser is `z-[70]` over the card detail sheet. Confirm it sits above the card modal on desktop too, and that focus returns to Change on close.
- [🟡] Performance: G3's summary-line reads must be one batched read per History page, never one per entry.

### ⏰ Drift from reality

- [✅] Every shipped name it cites exists on this tree (list in the summary).
- [🟡] Call 5 cites `design_handoff_the99_collection_edit/addendum-removal-chooser`, which is not in the repo. The shipped `ContestedCardRow` grammar it points to is in the code, so nothing is lost.
- [🟡] `extraGiven` (proposal.diff) lives in design-assets, not in this tree. Treat it as a sketch, not a contract.

### 📝 Decision log

- [✅] R1b (Hugh, 2026-11-17) and R1c rulings recorded. APPROVED by Hugh 2026-11-18.
- [✅] G5 records that this amends the card_assignments handoff's door limit.

## Gaps requiring a Design round-trip (Orange/Red only)

None. G2 is a backend contract gap, settled by the drawn states. It needs no Design answer.

## Eng-side clarifications (Yellow only)

- E1 (G2): pending-pick storage, migration, commit/discard/remove hooks on the `pull_releases` lifecycle. The pick displaces any existing reservation and vice versa (one authored choice). Decide whether a pending pick moves the listing decks' allocation before commit. O2 draws them as `buys it` at once, so the claim model must count it. That is a plan decision, checked against seniority.
- E2 (G1): a new reader for the Other decks list: committed, not listing the card, identity allows it, with `built` counts. Read on chooser open, not with card details.
- E3 (G3): a batched live read per History page and per opened entry. `Now X has it.` appears only when the live holder differs from `wentTo`.
- E4: `thisDeckId` optional on `CopyChooserDialog`, and a new `changeSub` sibling.
- E5: card details desktop follows the shipped 520 modal (no frame).
- E6: revalidate or redraw card details and History after a pick.

## Decisions inherited

- The History record (`wentTo`) is never rewritten (went-to.ts rule, and call 4).
- One authored reservation per card. Seniority allocates the rest (`assign.ts`).
- Decks outside the card's color identity are never offered. Decks at 99+ are, as `makes 100` (B2).
- More than 6 Other decks gets a Find a deck field. The list scrolls inside the chooser, and title and Done stay put.
- Change appears only when `owned > 0 && free <= 0`.
- No `claim` in any string (G4).

## Flags (product calls, not gaps)

- **Migration:** yes, for G2's pending-pick storage.
- **Feature switch:** none exists for the chooser, and the build adds none unless Hugh asks.
- **Model call / spend / real email:** none.

## Design's own read (kept)

# READINESS · Move a copy to another deck later (#2980)

**Verdict: Yellow.** The UI is fully drawn and approved (Hugh, 2026-11-18). Three backend gaps need answers in the build plan before UI work.

| Gap | What the build needs |
|---|---|
| G1 | Card details needs the contested card off a receipt (`loadContestedCard`), plus the player's other committed decks whose color identity allows the card, with card counts. |
| G2 | An Other decks pick adds the card to that deck's draft, and the copy has to follow at commit. Assignments need a committed version, so a pending pick has to be stored and applied at commit. One choice spans both groups and counts toward the row's cap. |
| G3 | History's `wentTo` is frozen at arrival. `Now X has it.`, Change and `Can move · N` need a live read per entry, but only for entries whose card still has a choice. |
| G4 | New strings are DRAFT for /copy-review (README). A plural title is needed for 2+ copies. |
| G5 | Amends `design_handoff_the99_card_assignments`, which limits the chooser to /changes and receipts. |

Ready as is: Change rule (`owned > 0 && free <= 0`), shipped `CopyChooserDialog` / `ContestedCardRow` / `assignCopyFor` reuse, phone and desktop frames.
