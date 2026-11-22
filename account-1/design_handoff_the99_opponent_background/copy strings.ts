// A Background as an opponent's second commander (Social R3 addendum, 2026-11-22). Proposal for /copy-review.
// New strings join `gameSeatsCopy.picker` (src/lib/copy/game-seats.ts); the rest reuse shipped copy, named below.
export const opponentBackgroundCopy = {
  /** Under a commander hit that chooses a Background: why its press opens a step rather than seating. */
  choosesBackground: "chooses a Background",
  /** The ‹ on the step's head (aria-label). */
  backToCommanders: "Back to commanders",
  /** The chosen slot's eyebrow. */
  background: "Background",
  backgroundPlaceholder: "Search Backgrounds",
  backgroundNoMatch: "No Background by that name.",
  /** The chosen row's caption. */
  backgroundChosen: "second commander",
  /** The one press that seats. Short names, before the comma. */
  seat: (commander: string) => `Seat ${commander}`,
  seatPair: (commander: string, background: string) => `Seat ${commander} + ${background}`,
  footBackground: "A Background is optional: seat the commander alone if none was played.",
};

// Reused, unchanged:
// - The rule line: partnerAddCopy.door.body(short, { kind: "chooseBackground" }) → "Lae’zel can choose a Background as a second commander."
// - Change / Remove: deckImportCopy.commander.change / .remove (the create picker's second slot).
// - The two-name join " + ": the History row's vsParts and Matchups (no string; built in code, as shipped).
// - Searching…, the failed search line, Close, the sheet title "Seat an opponent": gameSeatsCopy.picker.
// - Tracker: no new strings. damageHint ("A partner deck gets one card per commander.") stays true: a Background seat
//   also gets one card.
