# READINESS: Deck notes R4 (approved)

Approved by Hugh on 2026-10-11, apart from the ruling 5 confirmation below. Build from R4.

## Against the rulings
| Ruling | Where |
|---|---|
| 1 per deck, one line, auto-dated | W1. There's no date field; the date is `created_at` |
| 2 done → `Done (N)` | MD, W2, M2; closed by default |
| 3 edit and delete | ED, DL |
| 4 `[[`: deck cards first, then any; a tag opens details | K1, K2, E3; STATES R2–R5 |
| 5 in Your deck, under the description | **Read as "in Your deck"**: a Notes panel beside Stats (N0). Hugh to confirm |
| 6 no reminders, due dates or sharing | Must-nots |
| 7 simple | one table, four actions, a third `DeckPanel` value, no new tokens |

## Gaps for engineering
- **G2 · Left vs never held.** Both draw dashed. Nothing records history per tag.
- **G4 · Measuring the cap.** 140 is counted on the rendered text. The DB check needs a rendered length, or the DB caps the raw body more loosely (e.g. 1,000) while the action enforces 140.
- **G5 · Picker mode.** `searchCards` needs a mode without the legality filter (Q8).
- **G6 · Today.** "Today" is the player's local day, as in the game log.
- **G7 · About.** `since` is the PR's `ABOUT_VERSION` bump. `DECK_NOTES_ENABLED` is a new `AboutSwitch` member.
- **G9 · `the99:deck-panel`.** The stored value gains `"notes"`. A stored `"notes"` read with the switch off falls back to `"list"`, as `"stats"` does with its switch off.
- **G10 · Insert.** `[[ ]]` uses `setRangeText` at the selection and restores focus to the field, so a phone keyboard stays up.
