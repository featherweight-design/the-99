# Social R3 addendum: a Background as an opponent's second commander (account 1, 2026-11-22)

Status: **Drawn for Hugh's review.** Opened as a PR at his request (the brief's Deliverable line); not yet approved.

When a player logs a game they can name each opponent's commander. Since #3164 the save accepts a Background as an
opponent's second commander (`pairLegal`, the rule a deck's own pair follows since #3154), but the seat picker offers
no way to choose one. This addendum draws that second slot in the picker, then how the opponent with two commanders
reads on the form's seat, the History row and the life tracker seat.

Every frame is the shipped UI (main 4c987a8) bundled and run in a browser at the real viewport, with this addendum's
change patched in: the shipped `GameLogForm` (its `GameSeats` row and `SeatPicker`), `GameHistoryRow` and `PlaySurface`,
inside the shipped shell. The whole change is `scratch-gen/proposal.diff`, so the boards and the diff agree by
construction. Fixtures: you play Sai; Peter is on Lae’zel, Vlaakith’s Champion with Raised by Giants; Colin Ghalta;
Max Bruse Tarl + Ishai (partners), drawn for comparison.

**Art.** Lae’zel's card art could not be fetched from the cloud session (Scryfall is blocked by its network), so a
striped stand-in marked "art not loadable" holds her place in every frame; the app draws her card art there. Raised by
Giants and Noble Heritage are real crops cut from the approved partner add board V1, so they are soft when drawn large.

## Calls

1. **Only a commander that chooses a Background opens the slot** (Decided). In the picker's results its row gets a
   second line, `chooses a Background`, the friend-deck row's two-line shape, so the reader knows why the press opens a
   step instead of seating. Every other row still seats on one press, as shipped.
2. **The Background step: search and a result row.** The head is the friend-decks head: `‹` (Back to commanders), the
   commander's art at 26 px and its name. The empty slot is the picker's own field, `Search Backgrounds`, over the
   deck's rule line (`partnerAddCopy.door.body`): "Lae’zel can choose a Background as a second commander." Typing lists
   Backgrounds as the shipped commander rows (56 × 40 art, name, pips). No hit: "No Background by that name."
3. **The chosen state and the remove action.** A `BACKGROUND` eyebrow (the picker's heading style) over the chosen row:
   art, name, `second commander`, then `Change` · `Remove`, the create picker's second slot (`PartnerSlot`) words and
   text-button styles. Change brings back the search; Remove empties the slot.
4. **One Seat press.** Under the slot, one `PrimaryButton` names what it seats: `Seat Lae’zel` or
   `Seat Lae’zel + Raised by Giants`. The Background is optional, and the foot says so. Back returns to the commander
   search (to a friend's commander search when the step was reached from a friend). A seat holding a commander that
   chooses a Background reopens on this step, which is where a Background is added, changed or removed later (P6).
5. **The seat in the form.** The art splits in halves with a 2 px seam, as the tracker's panel draws a pair (F14). The
   name is the two-name treatment the History row and Matchups already use, `Lae’zel + Raised by Giants`; at 124 px on
   desktop it takes up to two lines rather than cutting the Background off. A labelled seat keeps the label as its name
   with the pair under it; a friend seated with their own commander puts the pair under the friend's name.
6. **The History row: unchanged.** `vsParts` already joins a pair: `Peter · Lae’zel + Raised by Giants`, the face the
   commander's art (H1).
7. **The life tracker seat.** The panel splits its art, as for partners (shipped). **Commander damage: the commander
   alone.** A Background is no creature and deals no commander damage, so its seat's damage card (tablet) and card
   (phone) draw the commander's art with one stepper. **Tax keeps both rows**: a Background is cast from the command zone
   and pays tax (T3).

Phone and desktop share one body, as shipped (sheet at 390, the anchored 340 px panel at 1300). No new control types:
the field, rows, text buttons and primary button are all shipped.

## Boards

| Board | What |
|---|---|
| Main | The calls, and the flow on the phone |
| Picker | P1 to P6 on the phone, D1 to D5 on desktop: search, the empty slot, a result row, chosen, removed |
| Row | The form's seat (phone, desktop) and the History row (phone, desktop) |
| Tracker | Tablet table, your Commander damage, Peter's Tax; phone table and Commander damage |

## Engineering

- **G1** `searchOpponentBackgrounds` (`opponent-commanders.ts`) and `searchOpponentBackgroundsAction`: commander-legal game
  cards typed Legendary Enchantment — Background, by name, same hit shape. Catalog only; no social read.
- **G2** `Seat.partner`, `SeatPick.partner`, `SeatCommander.choosesBackground`; `opponentsFor` sends `partner` beside
  `commander`, the field `parseOpponents` already takes. `seatName` and the seat's sub line use `commandersName`.
  Update the header comments in `opponent-commanders.ts` and `game-opponents.ts` that say the search does not offer one.
- **G3** `SeatPicker` gains a `background` view and `openPair`; `GameSeats` opens the step for a seat whose commander
  chooses a Background.
- **G4** Tracker: `rule-zero-table.ts` reads the second half's type line (`partner.background`); `PlaySeat` gains
  `partnerIsBackground`; `damageCommanders` decides how many damage steppers a seat gets. Damage keys stay
  `${seat}:0`, so a game in progress keeps its counts; Tax still counts `commanders` (2).
- **G5** Not drawn: a friend's deck with a Background seated in the form. `FriendDeck` carries `partnerOracleId` but not
  the partner's name or art, so the seat draws the commander alone today (as it does for a friend's partner deck); the
  save snapshots the pair. Joining the partner's name and art to `listFriendDecks` would give it call 5's treatment.

## Noticed, not changed

Partners have no slot in the typed picker either: a partner pair reaches a seat only through a friend's deck or a Rule 0
table. The brief decided only Choose a Background gets the slot; the same step could take Partner later.

## Files

`*.dc.html` + `canvas.json` (open with `../support.js`), `art/ob-*.webp` (2×), `STATES.md`, `copy strings.ts`,
`READINESS.md`, `scratch-gen/` (reference only, never import: `build.mjs` bundles the shipped components with stubs
for server actions and server-only packages, `css.mjs` compiles `globals.css`, `shot.mjs` + `specs.json` drive the
frames in Playwright, `entry.tsx` the scenes, `gen.py` the boards, `proposal.diff` the change).
