# Readiness Review — Social R3 addendum: a Background as an opponent's second commander

**Verdict:** 🟢 Green (approved by Hugh 2026-11-22, "This LGTM")
**Audited:** 2026-11-22, against origin/main 4c987a8
**Related:** Social R3 (the seat picker and the Across the table row), partner add #491 (the Background pattern,
#3154), game opponents #3164 (the save accepts the pair), life tracker F14 and the tablet sheet addendum
**Plan PR target:** TBD (one PR: picker step, seat, tracker damage)

## Summary

Small: the server side shipped in #3164, so this is a client change plus one catalog search and one column on the
table read. No schema, no switch (it rides `SOCIAL_FRIENDS_ENABLED` with the row). The change is
`scratch-gen/proposal.diff` (about 290 lines against `src/`), which is what the boards render. Approved as drawn;
R1.1 replaced Lae’zel's stand-in art with the card image Hugh supplied.

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ Seven calls; the picker, the form's seat, the History row (unchanged) and the tracker seat; phone and desktop.
- ✅ Decided: only Choose a Background commanders get the slot. Out of scope: a Partner slot in the typed picker
  (noted in README), a friend's deck pair on the form's seat (G5).

### 🎭 State coverage
- ✅ Search, the empty slot, a result row, chosen, removed, seated, reopened (P1 to P6, D1 to D5); the seat on both
  widths; the History row on both widths; tracker table, damage and tax on tablet and phone.
- 🟡 Rule-only (shipped patterns): one letter typed, searching, no hit, search failed, Change pressed, ‹ pressed, the
  step reached from a friend, a labelled pair, a friend's own pair, won.

### 🔌 Data contract
- ✅ Save: `OpponentInput.partner` already exists and `opponentCommandersValid` runs `pairLegal` (#3164).
- ✅ G1 `searchOpponentBackgrounds`: catalog only, commander-legal, `Legendary Enchantment — Background`.
- ✅ G4 `rule-zero-table.ts` selects the partner's `typeLine`; `PlaySeat.partnerIsBackground`. Damage keys unchanged.
- 🟡 G5: `FriendDeck` lacks the partner's name and art, so a friend's Background deck seats as its commander alone in
  the form (as a friend's partner deck does today). The snapshot is right either way.

### 🧱 Codebase fit
- ✅ The step reuses the picker's `Field`, `CommanderRows` (with a `noMatch` prop and a search function passed to
  `useCommanderSearch`), the Decks head, `HEADING`, `NOTE`, `Foot`, `PrimaryButton`, and `PartnerSlot`'s text-button
  classes and copy. The seat's split art copies the panel's seam.
- 🟡 Tests to extend with the build: `seat-picker-desktop.test.tsx` (a chooseBackground hit opens the step; Seat sends
  the pair), `game-log-form-seats.test.tsx` (`opponentsFor` sends `partner`), `sheet.test.tsx` (a Background seat gets
  one damage stepper, two tax rows), `game-seats` unit tests for `commandersName`.
- 🟡 `scratch-gen/` is reference only (stubs for server actions and server-only packages). Never import it.

### ♿ Cross-cutting
- ✅ Hit targets: rows 52 px; Seat 44 px on the phone; Change and Remove are the shipped 11 px text buttons, as in the
  create picker (flagged: under 44 px, same as shipped).
- ✅ Focus: the step's field takes focus on entry (the picker's existing effect); the head's ‹ has `Back to commanders`.
- ✅ Third-party names: none new; a friend's name keeps `PersonName`/`PersonText`.
- ✅ Art: real card art on every board (R1.1); the build draws `imageUri` as every row does.

## Decisions inherited

- Only commanders with "Choose a Background" get the slot (Hugh, the brief).
- Calls 1 to 7 as drawn (Hugh, 2026-11-22: "This LGTM").

Audited 2026-11-22: concur
