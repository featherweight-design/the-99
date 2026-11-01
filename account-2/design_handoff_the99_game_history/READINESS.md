# Game history · readiness (R1c, 2026-11-01)

**Verdict: GREEN. Approved by Hugh 2026-11-01 at R1c** (R1b commander art on rows; R1c switch Decks · Games · Stats). Ready to build once the cross-deck read lands.

| Brief state | Where |
|---|---|
| 1 · Populated, several decks | Populated P1–P2 |
| 2 · A few games (1, 2, 3+) | Few F1–F6 |
| 3 · No games yet | Edges E1–E2 |
| 4 · With opponents, none, deleted version, deleted friend deck | Rows R1–R2 (A–F) |
| 5 · Long history | Edges L1–L3 |
| 6 · Failure to load | Edges X1–X2, L3 |
| 7 · Social games off | Rows R3–R4 |
| 8 · Deleted deck | Edges D1–D2 |
| Situation 2 · a deck against a friend | Populated P3–P6 |
| Placement and the landing | Place W1–W4 |

Engineering needs (from the brief and the calls): the cross-deck read (owner-only; deck name, identity, opponents; windowed 50 by `played_at` desc; filters on the server: deck, result, opponent friend or commander; month counts and summary over the filter), `DecksView` gains `games`, the deck tab's `game=<id>` landing with a 2s ring.

No About entry (Hugh decides at launch). No new logged fields. Read-only: no edit or delete here.
