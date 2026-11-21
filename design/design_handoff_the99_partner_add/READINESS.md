# Readiness Review — Add a partner to an existing deck

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-21 (read against origin/main 37bc087)
**Related ticket(s):** #491 (removing a partner is #492, out of scope)
**Plan PR target:** TBD

## Summary

Every surface the round names is drawn on phone and desktop over shipped components: the Change commander sheet, its confirm Plate, Suggested changes' Pick line, the deck toast, the review Commander section and the shipped CardModal. Review and history need nothing new: `notePartnerAdded` and the `commanderPair` version line exist on main. The build needs new server work (G1–G6), all settled by drawn calls, so no Design round is needed.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Doors, list, cut, wider colors, confirm, undo and history are each drawn with final copy (`copy/partner-add.ts`).
- [✅] Hugh's decisions recorded: both doors, Backgrounds supported, toast Undo kept.
- [🟡] Not drawn: a deck already over 100 (G6: don't offer the add). A deck with a commander that prints a pair ability while already paired gets no door and no section.

### 🎭 State coverage

- [✅] Phone and desktop for the door, list and confirm. Phone for to buy, room, brew, Undo toast and review. Desktop for failed. One board per ability (Background, Friends forever, Doctor/companion, Partner with).
- [✅] Loading and a failed candidate read are the shipped sheet's, unchanged.

### 🔌 Data contract

- [🟡] **G2, the write.** `offerable()` (`commander-change/pending.ts`) returns false for a single → pair whose partner isn't in the 99: `tradeShape` gives null for `fromBody === 0`. The candidates loader and `writeCommanderChange` share that rule, so outside partners are both hidden and refused today. Add a shape for it (e.g. `pairUpCut`), and have `changeCommander(deckId, to, stays, { cutOracleId })` take the cut. The server re-checks that the cut is in the 99 and not locked, and that the deck ends at 100 or under. With room, no cut.
- [🟡] **G1, Background.** `canPair` (`src/lib/decks/partner.ts`) has no Background kinds; only `announcements/pairing.ts` knows them. Add Choose a Background + Legendary Enchantment — Background, either order. A Background never leads alone, so a Background is never a single-commander candidate.
- [🟡] **G3, Undo.** One write that restores the single commander and the cut card, refused unless the draft still holds that exact change. On a brew it is the only way back.
- [🟡] **G4/G5, suggestions and the opened count.** Both come from the pair's support list, the read `growingHits` already makes in `candidates.ts`. Lands while the deck runs 37+, then the two least-run cards. No model spend.

### 🧱 Codebase fit

- [✅] Rows reuse `Thumb`, `Mark`, `CostPips`, the figure button and Choose from `change-commander-sheet.tsx`. The cut reuses `SuggestedChangesPickLine`. The toast is `ToastFrame` inline.
- [🟡] `scratch-gen/proposal.diff` exports `Mark`/`Thumb`/`Plate`, drops the figure plate's `ml-[68px]` (Hugh: fill the full width, in the shipped list too), and threads `commanderDoor` through `CardModal` → `CardModalSheet`, drawn after `BracketFactsDetail`. The provider decides the door: the deck page's own commander, a single commander, a pair ability, and the switch on.
- [🟡] The in-deck partner row (shipped pairUpKeep) moves from the shipped groups into Add a partner.

### ♿ Cross-cutting

- [✅] Hit boxes are the shipped 44px on phone. The cut's Pick toggle keeps its `aria-pressed`, and the opened-cards button has `opensAria`.
- [🟡] Announce the toast as the shipped edit toast does, and move focus back to the deck page's commander after Undo.

### ⏰ Drift from reality

- [✅] Cited names exist on main: `offerable`, `growingHits`, `notePartnerAdded`, `commanderPair`, `pairUpKeep`, `expandCaption`, `changeCommander`.
- [✅] Behind the Change commander switch, as shipped.

### 📝 Decision log

- [✅] Approved by Hugh 2026-11-21 after the R1b fixes (the door redrawn on the shipped CardModal, the full-width figure box).

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

- Item 1: a new trade shape for an outside partner, with a cut re-validated on the server (G2).
- Item 2: Background kinds in `canPair` (G1).
- Item 3: the Undo write (G3), and the suggestion source and opened count from the support list (G4/G5).
- Item 4: don't offer the add to a deck over 100 (G6).
