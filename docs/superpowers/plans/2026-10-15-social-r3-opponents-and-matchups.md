# Social R3: opponents in the game log and matchups (build plan)

Handoff: `design/design_handoff_the99_social_r3/` (PR #1798). Brief: `docs/superpowers/design-briefs/2026-10-15-social-screens.md`
(branch `brief/social-screens`), §Rulings Q15, §Open 9. Behind `SOCIAL_GAMES_ENABLED`, which needs `SOCIAL_FRIENDS_ENABLED`.
The data layer is built and has no caller today: `deck_game_opponents`, `parseOpponents`, `opponentRows`,
`listGameOpponents`, `summarizeMatchups`, `src/lib/social/games.ts` (AGENTS.md, "Opponents in the game log"). Nothing is built
from this plan until the orchestrator schedules the social builds together.

## Readiness audit: GREEN, with four engineering notes

Audited against main on 2026-10-15, after a rebase.

**Locks, checked in code and in the handoff**

| Lock | Code | Handoff |
|---|---|---|
| Seats from 1 upward, fewer than the pod | `parseOpponents` refuses `raw.length > podSize - 1`; `logGame` refuses `podSize` outside 2 to 8 | Seats are pod minus one; **You** is drawn but not a seat; a smaller pod is held while seats are full |
| A friend, a friend's deck, or anyone by commander plus a label | three `ParsedOpponent` kinds; a friend sits once; a friend's deck carries no commander or label (snapshot); `other` needs a commander or a label | one picker, three outcomes; the label only on an anyone seat, 30 (`OPPONENT_LABEL_MAX`) |
| At most one `won`, and only on a loss | `parseOpponents` refuses both | trophy per seat on Lost only, a press moves it, leaving Lost clears it before the action |
| Snapshot at log time | `opponentRows` stores the friend's name, the deck's name and the commanders; `assembleOpponents` reads only those | History and matchups draw the snapshot; a removed friend and a renamed deck read as logged; a picker's live face never persists |
| A friend's deck only through your own friendship | `resolveFriendSeatsIn`, `friendDecksIn` join the viewer's friendship in the game's own transaction, FOR SHARE | the picker lists your friends' decks and nothing else |
| Matchups as counts with totals, never a rate | `summarizeMatchups` returns `GameSummary` cells and `beatMe`; `net` orders and is never drawn | squares or `W · L` counts beside `N games`, `recorded in X of N games`, no percentage |
| No model calls | the label is typed and drawn; no prompt reads the table | none |

**Open calls**: all five answered (README Decisions 1 to 5, READINESS "Open questions, called"). G4 (no label-only seat) and G5 (a
deleted account's friend rows) are Hugh's and ship as drawn. **Components and tokens exist**: `game-log-form.tsx`,
`games-panel.tsx`, `game-history-row.tsx`, `game-axis-cell.tsx`, `ui/anchored-panel.ts`, the roving radiogroup pattern
(`game-log-form.tsx`, `ScopeControl` is a comment reference to it), the new-deck picker's search rows, `format.ts` identity names
(`Izzet`), and `--success` (the only custom property the handoff names). Every phone and desktop state is drawn except two
that carry a stated rule instead (friend with no decks, F4; By colors, M3).

**Engineering notes (none sends the handoff back to Design)**
1. **The friend list needs more than `listFriends` returns.** The picker draws each friend's face and deck count; `listFriends`
   returns `publicId`, `displayName` and `since` only. PR 1 adds one read for the picker: friends with a deck count (from
   `friendDecksQuery`, one grouped statement over the viewer's friends) and the face source Social R1 defines. It is read when
   the picker OPENS, not when the form does (G7), so an unopened form reads nothing social.
2. **A pod can be any size.** `rules.ts` has no member cap, so "Seat a pod sets the pod size to the pod's member count" can name
   1 or 9 and more, where `logGame` takes 2 to 8 and seats are at most 7. Rule: clamp pod size to 2 to 8, seat the friends in join
   order up to the seats the size allows, and say in one line who did not fit. A logic rule with one status line; no Design round.
3. **A gone friend keys one row per game** (G5, `gone:`): nothing to build; the By friend list draws it as shipped.
4. **Commander image focus (G9) is its own line**, not part of this build: a focus point per deck applied as `object-position`
   across seat tiles, picker rows, matchup thumbs, History faces and R1's friend faces is a schema change and a setting
   control that Design has not drawn. R3 ships with the centered crop every commander picture uses today; G9 is scheduled with
   Social R1, which it also covers.

**About entry 4 (Who you played against)** is not drawn in this handoff (README G8: batched at launch). The brief says R3 is where
the line's batched About work closes and that every entry is drawn on the per-entry artboard, so it is a named task below, owed
before the line's close-out and not a defect in this round. The same is true of entries 1 to 3 from Rounds 1 and 2.

## Rulings that override or add to the handoff

- Pod quick-seat clamps as in note 2.
- A seat whose friend no longer resolves at save (`SeatRefused`) is the form's ordinary refusal (`gameLogCopy.form.refused`), with
  the form's state kept; nothing is cleared.
- The picker's catalog search is the new-deck picker's, minus its owned-only filter, scoped to commander-legal cards and
  partner pairs (`opponentCommandersValid` is the server's check; the client offers only pairs `canPair` allows).
- Copy goes through `/copy-review` once, from `social-r3 · copy strings.ts`, before PR 2 opens; the em-dash rule applies.

## PRs

Each stays under about 20 files and 800 lines. No stacking: each opens after the previous merges.

1. **Reads (no UI, ships dark).** `listFriendsForPicker` (friends with deck count and the face source), `listPods` member
   count already present, a catalog commander search read without the owned filter, `loadDeckGamesWithOpponents` (the deck
   page's games with `listGameOpponents` and `summarizeMatchups`, behind `socialGamesEnabled(env)`, never throwing: a failed
   read degrades to no opponents and no Matchups, never an error on the deck page). Server actions the picker calls
   (`listFriendDecks`, `listPodSeats` and the picker list, each re-checking the switch for the signed-in reader). Probe
   `probe:game-opponents` extended with the picker reads and the deck-page read on a scratch branch; `check:social-reads` and
   `check:list-cache` hold.
2. **The log form: Across the table, seats 1 (anyone and who won).** The form's new section under Result and Pod size, the table of
   art seats, **You**, the dashed Add opponent seat, the commander search picker (anchored panel at 1300, sheet at 390), the label
   field, the trophy and its rules (one at most, cleared when the result leaves Lost), pod sizes held while seats are full, and
   `opponents` sent to `logGame`. Games off or friends off: the row is absent with no space kept. Contact sheet at both widths,
   `check:shared` on a new inventory.
3. **The log form, friends.** The friend list and a friend's decks (opened on pick, G7), `Another commander`, `Just <name>`, the
   no-decks sentence, the already-seated state, and `Seat a pod` with its clamp and `Which deck?` per seat.
4. **The Games tab: Matchups and the History `vs` line.** The section between the findings and History (heading with
   `recorded in X of N games`, the Commander, Colors and Friend switch, squares and past-ten counts, the single-game caption),
   the `vs` line in `game-history-row.tsx` from the snapshot (a friend seat's face is the commander they played, or initials),
   the empty and zero-opponent states. `probe:payload` is not affected (the deck page, not a list route); a measure of the deck
   page's payload delta is in the PR body.
5. **About entry 4 and the close-out.** Design draws entry 4 (and the line's entries 1 to 3 if they are still open) on the per-entry
   artboard; this PR adds it behind `SOCIAL_GAMES_ENABLED` (`AboutSwitch`), re-pins the content hash, and bumps nothing (a switched
   entry is announced by its switch). `feature-acceptance`: the route by viewport walk of the log form, the Games tab and
   History at both widths with opponents of every kind, against `staging`'s data shape.

## Not in this build

Q6 (full lists), Q16 (offering the same game to the friend), deck swaps, G4's label-only seat, G9 (see note 4), an unlink or edit of a
saved seat (opponents are written once, with the game).
