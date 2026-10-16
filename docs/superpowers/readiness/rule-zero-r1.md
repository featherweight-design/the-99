# Readiness audit · Rule 0 table check R1

2026-10-16 · PR #1939 · handoff `design/design_handoff_the99_rule_zero/` (`README.md`, `READINESS.md`,
`STATES-rule-zero.md`, `rule-zero · copy strings.ts`, the five `R1 - *-Phone` / `R1 - *-Desktop` boards) · brief
`docs/superpowers/design-briefs/2026-10-16-rule-zero-table-check.md`.

Audited independently of Design's `READINESS.md`, against the tree at `origin/main` 15414ea39. The handoff branch is
behind main; what landed since (invites, `SOCIAL_INVITES_ENABLED`) changes none of the claims below and adds gap 12.

## Verdict: 🟡 Yellow

Every state the brief lists is drawn at 390, and every one with a layout of its own is drawn at 1300. All thirteen
locks hold: the read is `slotDeck` and `findings` with no model call and no credit chip, the detection disclosure and
the shipped provenance opener are on every read, there is no guest seat, the table grants sight of each seat's chosen
deck only, for its 24 hours, and there is no About entry. Fourteen gaps remain. Engineering resolves each one, and none
needs another Design round. The resolutions below bind the plan unless Hugh overrules one. One question is genuinely
Hugh's (one open table per pod, gap 14). It does not block the build.

## Coverage against the brief

| Brief state | Drawn | Note |
|---|---|---|
| Setup: the pod, who plays, a deck for each seat | E1/F1, U1/V1, U3/V2, U4/V3 | The pod is chosen by starting from its card |
| Balanced | T1, D1 | |
| One outlier, high; one outlier, low | T2/D2, T3/D3 | Amber ▲ and steel blue ▼, each with words, never color alone |
| Two outliers (2, 3, 3, 4); a two-seat split | T4/D4, T5/D5 | Split is violet on both seats, no band |
| A range seat, declared and undeclared | T6, D6 | Both ranges: Peter `[1,2]` undeclared, measured from Core; Colin `[4,5]` declared Optimized |
| The declared bracket that settles a range; a drifted declaration | T6/D6, T7/D7 | Drifted keeps the range chip and is never compared as the declared 1 |
| No reading yet (short of 100); not legal (over 100); stale; read on the spot | T8/D8, T9/D9 | Short and over say their card count; the old reading of an over-100 deck is not used |
| A member with no decks; a member not on the app | U1, V1 | Dimmed `no decks yet`; a dashed row into Invite someone new |
| What another seat sees; after a swap on both phones | S4/W4, S2/W2, S5/W5 | Changes arrive on a 20s poll, focus or refresh; nothing is promised live |
| The suggestion, high and low | S1/W1, S6 | S6 is phone only (gap 13) |
| Logging from the table; the pre-filled log | L1/H1, L2/H2 | |
| Not enough decks to compare | T10, D10 | |
| Expired | L4, H3 | |
| Switch off | E4 | Absent everywhere, no space kept |

Not drawn at 1300: U2 (too few seated), S6 (the low suggestion), L3 (games off), E4 (switch off). Each is the phone
frame's rule inside the desktop layout, or an absence (gap 13).

## Code claims I checked

- **The read.** `slotDeck` (`src/lib/bracket/slot.ts`) returns `permits` from `permitsFor`, and `lean` only where a
  combo decided 3 against 4 (`leanFor`), with `decidedBy` and per-piece tutor receipts. `findings`
  (`findings.ts`) lists Game Changers, mass land denial, extra turns, two-card combos and tutors, in that order, as
  counts (`FINDING_ORDER`), so "a zero is a dim number, never a word" is drawable. `verdictSubLine`
  (`verdict-head.ts`) has the `ruledOut` (rule, have, limit at the bracket below) and `assembled` kinds the drivers
  sentence needs.
- **Ranges and declarations.** `declarationAsk` (`declaration-ask.ts`) returns `ask`, `answered`, `none` and `drifted`,
  exactly the three seat lines drawn. `chipAnswer` (`chip-answer.ts`) is the header chip's answer. The declaration is
  `decks.declared_bracket`.
- **Readings.** `readStoredReading` (`src/lib/profile/stored.ts`) returns the stored profile with `fresh`, so a stale
  reading is distinguishable. `deckLegality` gives `built` and `size` of the BODY only, commanders excluded (99 alone, 98 with a partner;
  `stored.test.ts`), so the seat's whole-deck count is `built + (100 - size)` against 100: `87 of 100` and
  `101 cards, over 100`. Using `built` directly undercounts by one card, or two with a partner. `readStoredPermits` holds over an edit and checks no legality, so the table must check
  legality itself, as the brief says. `computeAndStoreProfile` computes a reading with no model call.
- **Bracket surfaces.** `BracketChip`, `FindingsBlock` and `ProvenancePanel` exist in `src/components/decks/`.
  `BRACKET_NAMES` are Exhibition, Core, Upgraded, Optimized and cEDH, and `How we make these decisions` is
  `deckAnalysisCopy.provenance.toggle`. `MLD_DETECTION`, `EXTRA_TURN_DETECTION`, `TUTOR_DETECTION` (`oracle-rules.ts`)
  and `COMBO_DETECTION` (`combo-features.ts`) exist.
- **Social.** `pod-card.tsx` and `pods-pane.tsx` exist; the pod card's last row is `Share my spares with this pod`
  (`socialCopy`). `ADD_MEMBERS_MAX` is 32 (`client-rules.ts`). `listFriendDecks`, `listPodSeats`, `friendDecksIn`
  and `friendDeckCountsQuery` are in `src/lib/social/games.ts`, and every one joins the viewer's friendship, so the
  brief is right that the table needs its own grant.
- **The game log.** `deck_game_opponents` seats a friend, a friend's deck, or anyone (a catalog commander, a partner,
  and an optional `label` of 1 to 30 characters); `deck_name_then` carries no friend constraint; seats run 1 to 7;
  `deck_games.pod_size` is 2 to 8. That fits the 2 to 8 limit and gap 4.
- **G8.** `deck_games.played_at` and `decks.last_edited_at` exist.
- **The shared toast.** `ToastFrame` (`collection/edit-toast.tsx`) and `SocialToast` exist, and `Undo` is shipped copy.
- **Home has no Friends section.** E3 and F3 draw the table card "in Home's Friends section". Nothing under
  `src/components/home/` or `src/app/page.tsx` draws one, and no merged handoff draws one either (gap 1).

## Gaps, and engineering's resolution

1. **Home's table card has no section to sit in.** There is no Friends section on Home today.
   - **Resolution:** the card ships alone, at the slot E3 and F3 draw (after Pick up where you left off on the phone,
     the right column on desktop), with its own `Tonight's table` kicker and no `Friends` heading over it. When a
     Friends section ships, the card moves to its head.
   - Home is cached per reader, and neither a seat written by a setter who is not the reader's friend nor the table's
     expiry moves that reader's stamp or `friendGeneration`. So the card is read outside `cachePageForUser`, as a
     small uncached read beside the cached payload, and `check:list-cache` stays green.
2. **The seat-grant read (G1).** New tables: a table (pod, setter, created, `expires_at` 24 hours on) and its seats
   (user, deck, changed at, the seated user's own last view).
   - It lives in `src/lib/social/` and joins the VIEWER's seat at the same table with `expires_at > now()` in the same
     statement. It returns, per seat, the display name, deck name, commander art, permits, the declaration and its
     `declarationAsk`, the five finding counts, the verdict sub-line and `lean` (with the combo's names and its tutor
     count), the card count and legality, and whether the reading is fresh. Nothing else, and no id that links to a
     deck page or a profile.
   - The readings are read under each seat's owner id after the grant is checked. Writes check that the viewer is the
     seat's player and owns the deck.
   - Both tables join `purge.test.ts`'s coverage: the account's seats are deleted, and a table it set is deleted.
3. **Has-decks per member (G2).** A boolean read through the pod alone would be a cross-user read that joins no
   friendship.
   - **Resolution:** the setter learns it only for their friends, from `friendDeckCountsQuery`, which the picker already
     uses. A member who is not the setter's friend is always seatable and reads `picks their own`. If they hold no
     decks, their seat says so at the table, under the seat grant. The drawn case (Chris, a friend) holds as drawn.
4. **Logging a seat who is not your friend (G4).** It is written as an anyone seat: the commander and partner from the
   table, `label` the player's display name as seated (cut to 30), and `deck_name_then` the deck's name. It is an
   ordinary anyone seat, so the write needs no grant and the matchups split it by commander, not by friend. Friend seats
   go through `resolveFriendSeatsIn` as today.
5. **Change delivery and the changed dot (G5).** `GET` route, signed in, the switch re-checked, `private, no-store`,
   polled every 20 seconds while the page is visible, and on focus and refresh. The dot compares each seat's
   `changed_at` with the viewer's own seat's last view, which the page writes when it draws, so a refresh does not lose
   it.
6. **Suggestions (G6) and starting decks (G8)** as drawn: own decks, legal now, with a reading, strictly nearer the
   middle; nearest first, then most recently played; at most three. Start on the most recently played deck, else the
   most recently edited.
7. **The switch.** `RULE_ZERO_ENABLED`, a `feature` switch, `needs: "SOCIAL_FRIENDS_ENABLED"`. Its flag function also
   requires `ANALYSIS_TAB_ENABLED`, because the bracket chip is drawn nowhere else without it and the brief says the
   table draws nothing a reader could not otherwise see. Logging needs `socialGamesEnabled`. Off, every row, card and
   route is absent, and `/friends/table/<id>` is not found.
8. **A legal deck with no reading, read on the spot.** It is computed with `computeAndStoreProfile` under the deck
   owner's id and the owner's resolved switches (`resolveSwitchEnv(owner)`), and stored as their reading. No model
   call. A seat waits under `Reading this deck` until it lands.
9. **Which state a seat is in.** From one snapshot: not legal (`deckLegality`) is the card count and no bracket, even
   with a stored reading; legal and fresh is the read; legal and stale is the chip with `from before its last change`;
   legal with none is gap 8. The middle is the median of the seats in the read. A range is measured from its nearer
   end, a declaration inside it answers it, and a drifted one does not.
10. **The drivers sentence.** `whyCombo` hard-codes `Upgraded`. It takes the bracket below from `verdictSubLine`:
    `ruledOut` gives `whyLimit` per reason, `assembled` gives `whyCombo` from `lean.decidedBy` and its receipts. A seat
    flagged low uses `whyLow`. A high range (`[4,5]`) gets neither: `verdictSubLine` returns `intent` for any range, even
    when five Game Changers ruled out bracket 3. Its drivers come from `slotDeck`'s bracket-3 violations, so the seat-grant
    payload carries those reason fields (rule, have, limit) for a range seat, and `whyLimit` speaks them.
11. **Facts carry no links.** Lock 12 holds only if nothing on another player's seat opens their deck. The counts open
    no receipts and the names link nowhere on a seat that is not the viewer's.
12. **The invite row follows `SOCIAL_INVITES_ENABLED`**, which landed after this handoff. With it off, the dashed row
    is absent and no space is kept.
13. **Desktop frames not drawn** (U2, S6, L3, E4). Each takes the phone frame's rule inside the desktop layout: the
    held Next and its line in the 640px dialog's footer, the low suggestion as W1's block, and absence for L3 and E4.
14. **Copy.** No string says "tick", and the copy file has no British spelling (the handoff's own prose says "greyed",
    which does not ship). Three things go to /copy-review with the file:
    - `One tap swaps it in for everyone.` names a gesture desktop does not make.
    - `leaveItSub`, `notFriendRow` and `notFriendSub` say "his"; the file already asks for pronoun-free versions.
    - The honesty line's claims are checked against the detection strings (extra turns have no measured misses).

## Decisions

- **G3, decided:** setup never lists a non-friend member's decks, so they always pick their own. Locks 6 and 12
  leave no other option: before the table exists there is no grant.
- **G7, Hugh's:** one open table per pod, and the setter changes who sits with Seats. That fits a pod of five. A pod
  can hold 32, and two tables from one pod on one night would need the pod row to list tables. The plan builds the
  drawn default unless Hugh says otherwise.

## Agreement with the locks

- No model call and no credit chip anywhere; the read is the shipped chip and the five counts (locks 1, 3).
- No guest seat; someone not on the app is the invite row, unchanged (lock 4).
- Each seat's only control is on its own seat; a suggestion shows on its own player's phone only (locks 5, 7).
- The seat grant is the one cross-user read beyond the existing friend reads (lock 6, gap 2).
- About: no entry and no `ABOUT_VERSION` bump (lock 13).
- Assets: nothing from `design/` is copied into `public/`.

## Before build

- /copy-review of `rule-zero · copy strings.ts`, with gap 14.
- Hugh's call: G7. G3 is decided above.
- The plan names the seat-grant read, the two tables, the poll route and the switch as tasks, with the resolutions
  above.
