# Game history · readiness (R1c, 2026-11-01)

**Verdict: ORANGE (engineering audit, lane c4, 2026-11-01). Design's call: GREEN, approved by Hugh 2026-11-01 at R1c** (R1b commander art on rows; R1c switch Decks · Games · Stats). Ready to build once the cross-deck read lands.

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

## Engineering audit (lane c4, 2026-11-01, rebased on current main)

Every brief state is drawn at 390 and 1300 except one. ORANGE on that frame; the backend PRs can start before it is drawn.

**Orange (send back to Design):**
1. **Games filtered to zero matches** (deck, Played against and Result combine; for example Sai, Colin, Won), 390 and 1300: a one-line empty message, the chips and Clear all, with the headline and "most played" gone.
2. Optional, same round: the Games segment's pending state while the first read runs, and the "next fifty failed" frame at 1300.

**Engineering needs READINESS omits:**
- The read needs a `(user_id, played_at)` index on `deck_games` (the only one is `(deck_id, played_at)`), so a migration.
- A friend filter and chips need a stable key. `friend_user_id` is a Clerk id and never reaches the client, so the read maps to `public_id` in `src/lib/social/`; a friend whose account is gone cannot be filtered.
- Every friend name (list, chips, "with Colin at the table", "Colin won 2 of the 3 you lost") is drawn through `PersonName`/`PersonText`, minted by `named()` (`docs/agents/social.md`).
- R1b's commander art on rows needs the owned-copy art in the read (`includeCommanderArt`).
- The `?tab=games&game=<id>` landing and its 2s ring have no code today (the deck page reads no `game` param, rows have no id or anchor).

**Stale names:** `SOCIAL_GAMES_ENABLED` is retired; opponents follow `SOCIAL_FRIENDS_ENABLED`, so state 7 is "friends off". `LINEUP_ENABLED` is retired; read "when the page passes `lineup`".

**Copy:** F1's "1 game logged." conflicts with the shipped "One game logged." (`game-log.ts` `oneGame`): reuse it or mark it deliberate. Three DRAFT lines still go through /copy-review (the empty body, the 1 to 2 game line, the Rule 0 line).

**Build split, in order:** (1) cross-deck read plus index migration, backend, risky (migration and cross-user join), 6 to 8 files; (2) load-more action, `?view=games` wiring, `game=` landing with ring, normal, about 8 files; (3) Games view UI, normal, 12 to 15 files; (4) filters UI with `mirrorUrl`, normal, about 8 files, needs the zero-result frame. PRs 1 and 2 can start now.
