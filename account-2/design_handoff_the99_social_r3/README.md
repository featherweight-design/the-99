# The 99 — Social R3 (opponents in the game log, and matchups) · design handoff, R1

Round 3 of 3 of the social line. Behind `SOCIAL_GAMES_ENABLED`, which needs `SOCIAL_FRIENDS_ENABLED`. Phone and desktop.

**Source of truth:** `docs/superpowers/design-briefs/2026-10-15-social-screens.md` (branch `brief/social-screens`),
§Rulings (Q15, the opponent snapshot), §Locked, §Open 9, §Every state to draw › Game log. The data layer it draws is
`src/lib/decks/game-opponents.ts`, `src/lib/decks/matchups.ts` and `src/lib/social/games.ts`, read on main 2026-10-15.

**Structural sibling:** `design/design_handoff_the99_game_log/` (the brief names `design_handoff_the99_deck_game_log/`,
which does not exist; this mirrors `game_log` and the shipped Games tab). Drawn over the shipped surfaces:
`game-log-form.tsx`, `games-panel.tsx`, `game-history-row.tsx`, and the commander search rows of the new-deck picker.
Runs in parallel with Social R1 (`design_handoff_the99_social_r1/`, approved): friends are drawn only as a pickable list
inside the seat picker, with R1's commander faces at pick time, and nothing here decides where friends live.

## Files

| File | What |
|---|---|
| `The 99 - Social R3 (R1).dc.html` | The calls, the locks, the gaps. Start here. |
| `R1 - Form-Desktop.dc.html` | The log form at 1300: nine frames, F1 to F9. |
| `R1 - Form-Phone.dc.html` | The log form at 390: P1 to P8. |
| `R1 - Games-Desktop.dc.html` | The Games tab at 1300: M1 to M5. |
| `R1 - Games-Phone.dc.html` | The Games tab at 390: MP1 to MP4. |
| `STATES-social-r3.md` | Every brief state, where it is drawn, and its rule. |
| `READINESS.md` | Verdict, locks held, engineering needs. |
| `social-r3 · copy strings.ts` | Every new string, placeholders for `/copy-review`. |
| `art/`, `brand/`, `support.js` | Six commander crops (stand-ins: the canvas cannot load Scryfall, and the Colors frames' identities are sample data), the brand sheet, the runtime. |

The same canvas is live as a Design artifact in account 2. Open a `.dc.html` with `support.js` beside it.

## The answer in one line

The log form gains one optional row, **Across the table**, under Result and Pod size, drawn as the table: your seat
first, then each opponent as an art seat, then a dashed seat while the pod has room. One picker fills a seat with a
friend, a friend's deck or anyone by commander. On a loss each seat carries a trophy for who won. The Games tab gains
**Matchups** between the findings and History: one list at a time (Commander, Colors, Friend), a result square per
game and a count, never a rate. History rows gain a `vs` line drawn from the snapshot.

---

## Decisions

### 1. Seats live inside the shipped form, under Result and Pod size (Open 9: how seats are added)

- **Where:** a section of the form, between the Result / Pod size row and the two mark columns, under its own hairline.
  Those two fields bound it: pod size sets the seat count (pod minus you, `parseOpponents`'s `podSize - 1`), and a
  loss is what turns on the trophy. Below the marks it would read as an afterthought to the note; above Result it
  would ask who before what happened.
- **Shape:** the table, as R1 drew pods (Hugh picked the table of art seats). Desktop: 124 × 86 art seats in a row,
  name under each, deck or commander under that. Phone: 58px rows (art, name, sub). **You** is first, from your deck's
  commander, tagged `YOU`, not pressable: it makes the count legible (three seats at a table of four).
- **Adding:** one dashed **Add opponent** seat while seats remain; no row of empty boxes (a pod of 8 would draw seven).
  The heading carries the count, `2 of 3 seats`. Nothing is required; a game with no seats is today's game.
- **Changing:** pressing a seat's art reopens the picker for it; a bare ✕ empties it. No confirm: nothing is saved yet.
- **Order:** seat 1 is the first seat filled, upward, as `opponentRows` stores them.

### 2. One picker for all three kinds (Open 9: friend vs a friend's deck vs anyone)

- **Container:** an anchored panel under the seat on desktop (the app's anchored-panel pattern), a sheet on the phone,
  field focused. Escape or ✕ closes with the seat still empty.
- **One field, no mode switch.** Placeholder `Friend or any commander`. Before typing it lists your friends (R1's face,
  name, deck count). Typing filters friends and adds a **Commanders** list under them, drawn as the shipped commander
  search draws a row: art, name, color pips. With no friends the placeholder is `Any commander` and only commanders
  come back; nothing points at friends elsewhere.
- **A friend:** opens their decks in place (`listFriendDecks`, newest first): name and commander only. Then
  **Another commander** (a friend seat with a catalog commander of its own, `kind: "friend"` with `commander`) and
  **Just Dave** (the friend alone). A friend with no decks: one sentence, then those two rows.
- **Anyone:** picking a commander seats it at once. The seat then offers **Add a name**, which turns into the label
  field in place (30, `OPPONENT_LABEL_MAX`, counter shown, 16px text on phone). A friend seat has no label: the
  friend's name is the name (`parseOpponents` refuses one).
- **Already seated** friends stay in the list, dimmed, `seated`, `aria-disabled` (a friend sits once).
- **Pod quick-seat:** `Seat a pod` chips on the section's own line (desktop) or above the seats (phone), only when you
  have pods. One press seats every member who is your friend (`listPodSeats`), each as the friend alone with **Which
  deck?** under the name, and sets the pod size to the pod's member count. A member who is not your friend leaves a
  dashed seat. Pressing the chip again clears the seats it filled.
- **Faces:** R1's live signature commander is drawn **only in the picker**, at pick time. A saved seat draws its own
  snapshot (see 5).

### 3. Who won is a trophy on each seat, on a loss only (Open 9: the "who won" control)

- Result **Lost** + at least one seat: each opponent seat shows a trophy (desktop: top-right of the art; phone: a
  `Won` pill on the row). One hint line: `Lost. If one of them won, press their trophy. Optional.`
- Press: that seat gets a bone ring and `won this game`. Press another: the mark moves. Press it again: cleared. At
  most one (`won` on one opponent at most). `aria-pressed` on each.
- Result changes to Won or Draw: trophies go and the mark is cleared before the action is called (`parseOpponents`
  refuses `won` on anything but a loss).
- A trophy, not a crown: the rail's Commanders icon is a crown.

### 4. Matchups is a section between the findings and History (Open 9: where matchups show)

- Heading `Matchups` with its denominator on the same line, `recorded in 3 of 6 games` (`Matchups.recorded` of
  `Matchups.games`), and a three-way switch `Commander · Colors · Friend` (radiogroup, roving, as `ScopeControl`), one
  list at a time; Commander by default.
- Games exist, none with opponents: the heading, `recorded in 0 of 6 games`, and one dashed line saying what fills it.
  No switch.
- No games: the shipped empty state; Matchups absent. Switch off: absent always.
- **History** rows gain a `vs` line under the marks (desktop: indented to the mark column; phone: flush under a
  hairline): a 22px face, the name, `· deck` or `· commander` (the short name, before the comma), and a trophy before
  the winner.

### 5. A one-game cell is one square (Open 9: how one-game cells read)

- A row: the opponent (commander art; color pips plus the identity's name, `Izzet`, as `format.ts` names it; or the
  friend), then **one result square per game**, the History row's own W / L / D squares (W in `--success`), wins
  first, then draws, then losses, then a trophy and a count where they won your losses (`beatMe`), then `N games`.
- **Never a ratio.** At one game a row is one square: it cannot be read as 100%. No percentage at any N, no `net`, no
  colour finding, no headline from matchups. Ordered by games, then name (`summarizeMatchups`'s own order), never by
  record.
- Past ten games the squares give way to counts beside the total: `7 W · 5 L` · `12 games`.
- When most rows are one game, one line says so above them: `Most rows are a single game. A row means more each time a
  name comes back.` (`Every row so far is a single game.` when all are.)
- **The snapshot is the only source.** A friend row's face is the art of the commander they played (latest seat), or
  initials; never R1's live face. A removed friend reads exactly as before; a renamed deck keeps the name it had.
  Anyone labels (`Lee`) are not friends and are not rows under Friend.

---

## Gaps

| # | Gap | For |
|---|---|---|
| G1 | Pod quick-seat needs the pod's member count (`listPods`) beside `listPodSeats` (friends only). A non-friend member leaves an empty seat. | Engineering |
| G2 | History and matchups draw a friend seat's face from its snapshot commander, never the live signature commander; a friend seat with neither is initials. A row rule, no new read. | Engineering |
| G3 | Squares need only `summary.record` and `beatMe` (both returned). Order is W, D, L, not by date. | Engineering |
| G4 | An anyone seat always has a commander here. `parseOpponents` also accepts a label alone ("Lee, commander unknown"). Not offered, to keep one way in. | **Hugh** |
| G5 | A friend whose account was deleted keys each seat alone (`assembleOpponents`: `gone:`), so By friend shows one row per game under the same name. Drawn as is; a `gone` flag on the read could fold or caption them. | **Hugh** |
| G6 | Partner commanders: a commander that can pair shows `+ partner` under its seat, which opens the same search for the second (`opponentCommandersValid` checks the pair). Described, not drawn. | Engineering |
| G7 | Fetch `listFriendDecks` when a friend is picked, not when the form opens, so an unopened form reads nothing social. | Engineering |
| G8 | Copy goes to `/copy-review`. About entry 4 (Who you played against) is batched at launch and not drawn here. | Copy |
