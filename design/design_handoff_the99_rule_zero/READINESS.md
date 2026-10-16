# READINESS — Rule 0 table check

**🟢 Approved.** Hugh approved on 2026-10-16 with one change, taken as R2: desktop seats are one full-width row each
(the chip with the name, larger art, a tinted and taller flagged row), so no seat sits beside a taller one. Home's table
card and who sets each deck were confirmed as drawn and go to engineering with G3 and G7. The remaining gaps are
engineering's to confirm in the plan (G10 added: Home's cache key). Copy is owed to `/copy-review`.

## Locks held

| Lock | How R2 holds it |
|---|---|
| 1. The read is `slotDeck` + `findings`, free | The shipped chip and the five counts; no model call anywhere; no credit chip. |
| 2. A bracket or more from the rest is flagged | Measured from the table's middle (the band on the rail); a range from its nearer end; a two-seat difference is a split on both. |
| 3. The same honesty | The read carries the detection line and the shipped `How we make these decisions`; zeros are dim counts; a low deck's sentence says counts can miss cards. |
| 4. Pod members only, no guest | Seats come from the pod; someone not on the app is the invite row into Add a friend. |
| 5. One sets, each swaps their own | Set the table by one player; each seat's only control is Change deck / Swap in on its own seat. |
| 6. Reads through `src/lib/social/` | The seat grant is the only cross-user read the page needs (G1). Setup uses the existing friend-deck read and a has-decks boolean (G2). |
| 7. Only the player's own decks are suggested | The suggestion shows on the flagged player's phone, from their own read decks. |
| 8. Feeds the game log | Log this game pre-fills Across the table and pod size on your seated deck. |
| 9. Expires after the night | Closing time in the meta and on the cards; the expired page; logged games stay. |
| 10. Behind a new switch | Absent everywhere when off (E4). |
| 11. Seated is the consent | Every seated player sees each chosen deck and logs every seat; Home's card and the link open only for seats. |
| 12. Only the chosen deck | A non-friend seat's name is plain text; setup never lists a non-friend's decks; no brackets before the table exists. |
| 13. No About entry | None drawn; no `ABOUT_VERSION` bump. |

## Engineering needs

G1 (the seat-grant read's shape), G2 (has-decks per member), G4 (logging a non-friend seat), G5 (poll and the
changed dot), G6 (suggestion order), G8 (starting decks). See README §Gaps.

## Hugh's calls

- **G3:** setup never lists a non-friend member's decks; they always pick their own.
- **G7:** one open table per pod; the setter reseats with Seats.
