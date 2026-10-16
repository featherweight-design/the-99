# The 99 — Rule 0 table check · design handoff, R2 (approved)

A pod surface: pick who is playing tonight from a pod, give each seat a deck, and read whether the table is balanced.
Behind a new switch that needs `SOCIAL_FRIENDS_ENABLED`. Logging from the table needs `SOCIAL_GAMES_ENABLED`. Phone
first (390) and desktop (1300).

**Source of truth:** `docs/superpowers/design-briefs/2026-10-16-rule-zero-table-check.md` on main, read 2026-10-16.
Everything under its Locked (1 to 13, including 11 and 12: the table grants sight of each seated player's chosen deck to
everyone seated, for its 24 hours, and of nothing else of theirs) is held as drawn. Its "Open for Design to call" is
answered below. Read on main with it: `src/lib/bracket/` (`slot.ts`, `verdict-head.ts`, `findings.ts`, `rules.ts`),
`src/components/decks/bracket-chip.tsx`, `findings-block.tsx`, `provenance-panel.tsx`,
`src/components/social/pod-card.tsx`, `pods-pane.tsx`, `src/lib/copy/deck-analysis.ts`, `src/lib/copy/social.ts`.

**Structural sibling:** `design/design_handoff_the99_social_r3/` (opponents and matchups). Drawn over the shipped
surfaces: the pod card (Social R1, B: the pod as a table), Home's Friends section, the shipped bottom sheet and
add-friends dialog, the bracket chip and the five findings marks (Analysis tab), the provenance opener, the log form
and its Across the table rows (Social R3), the shared toast, and Add a friend › Invite someone new (Invites R1).

## Files

| File | What |
|---|---|
| `The 99 - Rule Zero (R1).dc.html` | The calls, the locks, the gaps. Start here. |
| `R1 - Entry-Phone.dc.html` / `R1 - Entry-Desktop.dc.html` | E1 to E4, F1 to F3: the pod card's row, a table open, Home's table card, switch off. |
| `R1 - Setup-Phone.dc.html` / `R1 - Setup-Desktop.dc.html` | U1 to U4, V1 to V3: who's playing, too few, a deck for each seat, a friend's decks. |
| `R1 - Read-Phone.dc.html` / `R2 - Read-Desktop.dc.html` | T1 to T10, D1 to D10: every shape of the read. |
| `R1 - Swap-Phone.dc.html` / `R2 - Swap-Desktop.dc.html` | S1 to S6, W1 to W5: the suggestion, the swap, Change deck, another seat's view. |
| `R1 - Log-Phone.dc.html` / `R2 - Log-Desktop.dc.html` | L1 to L4, H1 to H3: Log this game, the pre-filled log, games off, expired. |
| `STATES-rule-zero.md` | Every brief state, where it is drawn, and its rule. |
| `READINESS.md` | Verdict, locks held, what engineering needs. |
| `rule-zero · copy strings.ts` | Every new string, for `/copy-review`. |
| `art/`, `brand/`, `support.js` | Eleven commander crops from the design folder (the canvas cannot load Scryfall), the brand sheet, the runtime. |

The same canvas is live as a Design artifact in account 1. Open a `.dc.html` with `support.js` beside it. The boards
are generated (`account-1/scratch/rule-zero-gen/` on `design-assets`), every frame sized to its content.

Fixtures: Colin's pod **Thursday night** with you, Colin, Peter, Max (Colin's friend, not yours) and Chris (no decks
in The 99 yet).

## The answer in one line

The pod card gains one row, **Rule 0 check**, that seats tonight's players and opens a page every seat sees the same:
**the read** on top (a headline, a rail of the five brackets with each seat's face, the honesty line), then each seat
with the shipped chip and its five counts; a deck a bracket or more from the middle is tagged **Above** or **Below the
table** (a two-seat table, **Split**) with a sentence on what puts it there, and only its own player is offered their
closer decks, one tap to swap. **Log this game** opens your seated deck's log with the other seats filled in.

---

## Decisions

### 1. The entry is the pod; Home brings the other seats (Open 1)

- **Start:** one row at the foot of the shipped pod card on `/friends`, under Share my spares: `Rule 0 check`, with
  `Seat tonight's players, compare their decks` under it and a chevron. Any member can start one; the brief's "one of
  their pods" is any pod they are in. A table is a pod's, so it starts on the pod. Nothing joins the nav, the user
  menu or the deck page.
- **While open:** the same row becomes `Tonight's table`, `4 seated · open until 9:40 pm tomorrow`, with the seated
  faces; it opens the table. One open table per pod (G7).
- **The other seats:** Home's Friends section gains a card at its head while you are seated at an open table: kicker
  `Tonight's table`, the pod's name, the faces, `Colin seated you with Ghalta Stompy. 4 seated, open until 9:40 pm
  tomorrow.` and `Open the table`. The setter gets it too. It goes when the table closes. The table is also a link
  (`/friends/table/<id>`) that can be shared in a group chat; it opens only for seated players.
- **Not the Games tab:** a table spans decks; the Games tab is where logging from it lands (decision 6).
- **Switch off:** no row and no space kept, no Home card, the link is not found (E4).

### 2. The seat picker: one sheet, two steps (Open 2)

- **Container:** the shipped bottom sheet over Friends (phone), the add-friends dialog pattern at 640px (desktop).
  Nothing is created until **Set the table**; ✕ keeps nothing.
- **Who's playing?** The pod's members as the pod card's own art seats (74px phone, 84px desktop), You already in. A
  tap seats or unseats (`role=checkbox`, a check in the corner, the accent ring). Footer: `4 seated` and `Next: decks`.
- **The limit:** 2 to 8. Under 2, Next is held and one line says `Seat one more player. A game seats 2 to 8.` At 8
  the unseated tiles are held with `A game seats up to 8.` (a pod can hold 32, `ADD_MEMBERS_MAX`).
- **A member with no decks:** dimmed, `aria-disabled`, `no decks yet`; cannot be seated (Chris).
- **A member not on the app:** a dashed row under the tiles, `Playing with someone not on The 99?` › Add a friend's
  **Invite someone new** path, unchanged. Once they join, the pod's owner adds them like any friend.
- **Tonight's decks:** one row per seat in seating order. Yours and each friend's start on their most recently played
  deck (G8); a row opens that player's decks in the same sheet with a back arrow, by name and commander only, as the
  game log's picker lists a friend's decks: **no bracket before the table exists**. `Leave it to Peter` keeps a seat
  waiting for its player. A member who is **not your friend** has no control: `Max picks his own`, because their decks
  are never listed to you (lock 12, G3).

### 3. The read, the outlier and its drivers (Open 3)

- **Page:** `Rule 0 check`, meta `Thursday night · set by Colin · 4 seated · open until 9:40 pm tomorrow`. Phone: the
  read card, then the seats, then Log this game. Desktop (R2): **one seat per
  row** on the left, the read and Log this game in a 392px column on the right. A row is the art (132 × 92), then name,
  deck, commander and the chip together, then the flag tag over the five counts at the right edge. A flagged row is
  tinted in its flag ink and its reason opens under it across the row; your own flagged row also opens the offer there.
  Nothing ever sits beside a taller seat, so rows never leave a gap (Hugh's note on R1's two-across grid, D7).
- **The read card:** kicker `The read` with `updated just now`; a headline; one sentence; the **rail**; the counts key;
  the honesty line and **How we make these decisions →** (the shipped provenance opener and sheet).
- **The rail:** five columns, Exhibition to cEDH, each with its chip mark and name. Each read seat is a 30px face over
  its bracket (yours ringed in the accent, a flagged one in its flag ink). A dashed band labelled `TABLE` marks the
  middle the table measures from. A range seat is a dashed span across its two columns with the face at the end it is
  measured from. No band on a split or with fewer than two read seats.
- **A seat:** the commander art, name (`not a friend` / `owner` tags as the pod card), deck and commander, the shipped
  `BracketChip` (a range draws both marks and both names; an answered range draws the answer), and the **five counts**
  in `findings` order, each its fact mark and number. A zero is a dim number, never a word.
- **The flag:** high is `--warning` amber, ▲ and `Above the table`; low is `--fact` steel blue, ▼ and `Below the
  table`; a two-seat split is violet with `Split` on both seats. The tag sits right of the chip, the seat's border
  takes the ink, and the words carry it, never color alone. The headline names the seat in the same ink.
- **The drivers:** a flagged seat lifts the counts that drive it (the bordered chips) and says it in a sentence under
  the strip, `What puts it here:`, from the verdict sub-line and `lean`: for an assembled combo, the pair and the tutors
  that reach it; for a passed limit, the count against the limit (`5 Game Changers, where Upgraded allows 3`); for a
  low deck, that nothing counted passes the lower bracket's limits, **and that counts can miss cards** (lock 3).
- **Ranges:** undeclared, the chip is the range and the line under it says `not declared · measured from Core`.
  Declared inside the range, the chip is the answer and the line keeps the range (`declared Optimized · reads Optimized
  or cEDH`). **Drifted** (a retained declaration outside a new reading), the chip stays the range and the line says
  `declared Exhibition, outside this reading · measured from Optimized`; it is never compared as a 1 (T7).
- **Seats not in the read** keep their seat, say why, and the headline says it leaves them out: `87 of 100 cards` with
  a progress bar; `101 cards, over 100` (its stored reading is not used); `Reading this deck` with a spinner for a legal
  deck read on the spot; `picks their own deck` while waiting. A legal deck edited since its reading keeps its chip,
  marked `from before its last change` in warning, as the deck page marks a stale reading.
- **Not enough:** fewer than two read seats: headline `Nothing to compare yet.`, one sentence on what's missing, no
  rail (T10).

### 4. The suggestion and the swap (Open 4)

- **Where:** on the flagged seat, under its reason, on **its own player's phone only**. Nobody else sees it.
- **What:** `Closer to the table`, `Your decks that read nearer Upgraded. One tap swaps it in for everyone.`, then up
  to three rows: art, deck name, the chip, `Swap in`. Only that player's own decks, legal now, with a reading, strictly
  nearer the middle; nearest first (G6). None nearer: the block is absent and the flag stays.
- **One tap:** seats it at once, no confirm. The read redraws on that phone; the shared toast says `Swapped to Sai
  Thopters.` with `Undo`. The seat shows `changed just now`.
- **Change deck:** every seat's one control, on its own seat: the shipped sheet (phone) or the anchored panel (desktop)
  with that player's decks, nearest the table first, the seated one marked. A deck short of 100 can still be seated
  and reads as not ready.

### 5. Another seat's view (Open 5)

- The same page and the same read. The viewer's own seat carries the accent ring, `YOU` and `Change deck`; no other
  seat has a control. A seat that isn't the viewer's friend shows its chosen deck only; its name is plain text.
- **Changes:** the page checks every 20 seconds while visible, and on focus or refresh (G5). When a check finds a
  change the read redraws, the changed seat carries an accent dot and `changed 1 min ago`, and the read's sentence
  starts `Since you looked`. The dots clear once seen. Nothing animates and nothing is promised live.
- **The setter** additionally has `Seats` in the page head, which reopens setup with the seats kept.

### 6. Logging from the table (Open 6)

- `Log this game`: a full-width ghost button under the last seat (phone) or closing the read's column (desktop).
  It opens the Games tab of **your seated deck** with the shipped form open and pre-filled: a line `From Thursday
  night's table. Seats filled; change anything.`, Pod size = seated count, Across the table = every other seat with
  the deck they sat with. A seat who isn't your friend is marked `from the table` (G4). Result is left for you.
- Games switch off: the button is absent, no space kept (L3).

### 7. Expired and not enough decks (Open 7)

- **Expired:** `This table has closed`, `Tables last the night: Thursday night's closed 24 hours after Colin set it.
  Games logged from it stay on each deck's Games tab.`, `Back to Friends`, over the seated faces greyed. The pod row
  and Home's card are gone.
- **Not enough decks:** decision 3, T10.

### 8. Phone and desktop (Open 8)

Every state is drawn at 390 (full pages, so nothing is cut off) and at 1300. Phone seats are cards in one column;
desktop seats are full-width rows (R2). Both carry the same parts in the same order.

---

## R2 (Hugh, 2026-10-16)

- **Desktop seats are one per row** (option A of the two drawn side by side on `design-assets`, `R2 - Desktop-Options`).
  R1 drew them two across, and a seat with a reason or an offer left a gap beside the seat next to it.
- Refinements taken with it: the chip sits with the name and deck rather than in its own column; the art is larger
  (132 × 92) with a stronger commander wash; a flagged row is tinted in its ink and taller, so the outlier stands out.
- The phone is unchanged. Entry, Setup and the phone boards stay R1.
- Home's table card and who sets each deck were confirmed as drawn; Hugh takes both to engineering.

## Gaps

| # | Gap | For |
|---|---|---|
| G1 | The seat-grant read (lock 6) returns per seat: display name, deck name, commander art, permits, the declaration with `declarationAsk`'s verdict, the five finding counts and the verdict sub-line (plus `lean`) for the drivers sentence, legality now (card count), and whether the reading predates the last edit. Nothing else; a non-friend seat's name links nowhere. | Engineering |
| G2 | Setup needs, per pod member, whether they have any deck (to dim a member with none). A boolean from the membership; it browses nothing. | Engineering |
| G3 | Setup lists only your friends' decks, so a member who isn't your friend always picks their own. Showing their deck names to the setter would widen the grant before the table exists. Drawn as the narrow version. | **Hugh** |
| G4 | Logging a seat who isn't your friend: `deck_game_opponents` has friend, friend's deck and anyone. Drawn as a seat marked `from the table`, with their snapshot name and deck; engineering picks the kind (likely anyone: commander plus label). | Engineering |
| G5 | Change delivery: a 20 second poll while visible, plus focus and refresh. The changed dot compares each seat's change time with this viewer's last load of the table. | Engineering |
| G6 | Suggestions: the player's own decks, legal now and with a reading, strictly nearer the middle than the seated deck; nearest first, then most recently played; at most three. Recomputed with the read. | Engineering |
| G7 | One open table per pod; Rule 0 check on a pod with one open opens it. The setter changes who sits with Seats. | **Hugh** |
| G8 | Setup's starting deck per seat: most recently played, else most recently edited. | Engineering |
| G9 | Copy goes to `/copy-review` (`rule-zero · copy strings.ts`). No About entry, no `ABOUT_VERSION` bump (lock 13). | Copy |
| G10 | Home is cached per reader, and being seated by someone else does not move your stamp: the table card needs the table (or seat) state in Home's `cachePageForUser` key, as friend data carries `friendGeneration`. | Engineering |
