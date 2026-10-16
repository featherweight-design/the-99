# Brief: The Rule 0 table check

2026-10-16. Scoped by Hugh on 2026-10-16 as his last scoped feature. It does not block the social release. Every item
under "Locked" is his, restated, and is not reopened by Design.

**What this brief asks.** A player picks who is playing tonight from one of their pods, gives each seat one of that
member's decks, and gets a read on whether any deck is over- or under-powered against the table, so the group can talk
before the game and adjust. Everyone seated sees the same check on their own phone and can swap their own deck. When
the game is played, logging it from the table fills in the opponents.

## The problem

Rule 0 is the talk a Commander table has before the first game: what everyone brought, and whether it fits. Today it
happens from memory. A player knows their own deck's bracket (the deck page's header chip) and nothing about anyone
else's, so the talk turns on "mine's about a 3" said across the table, and a deck that is two brackets above the rest
is found out on turn five.

The app already reads every deck's bracket, with its reasons, for free. It reads each deck alone. Nothing puts the
table's decks side by side.

## What exists today, and stays

- **The bracket reading.** Each deck's permitted bracket is computed by `slotDeck` (`src/lib/bracket/slot.ts`), a pure
  function over the deck's profile, against WotC's rules as transcribed in `src/lib/bracket/rules.ts`. No model call.
  Three things about it carry into this feature unchanged:
  - **It is a bracket or a range, never a power number.** `permits` is `[1,2]`, `[2]`, `[3]`, `[4]` or `[4,5]`. The two
    ranges are where WotC's rules hand the question to the player (1 against 2, 4 against 5 are statements of intent).
    A player's own declaration (`declaration.ts`) is reported beside the reading and answers a range; it is never
    corrected or inferred. `verdictHead` (`verdict-head.ts`) already turns this into the chip the header draws.
  - **The facts behind it.** `findings` (`findings.ts`) lists the five things "What is in this deck" counts, in order:
    Game Changers, mass land denial, extra turns, two-card combos and tutors. Tutors are a fact no bracket rule counts.
    Where a combo decides 3 against 4, the verdict's `lean` names the combo and the tutors that reach it.
  - **Its honesty.** The classifiers are partial, and every bracket surface says so. The detection strings live beside
    the classifiers (`MLD_DETECTION`, `EXTRA_TURN_DETECTION`, `TUTOR_DETECTION` in `oracle-rules.ts`;
    `COMBO_DETECTION` in `src/lib/spellbook/combo-features.ts`), are re-exported by `rules.ts`, and are drawn by the
    deck page's provenance panel (`src/components/decks/provenance-panel.tsx`). The table check carries the same
    disclosure, and an absent fact never reads as a clean deck.
- **When a reading exists.** A reading is stored per deck in `deck_profiles` (`src/lib/profile/stored.ts`). Analysis
  runs only on a legal deck (the body at exactly 99 or 98 with a partner). The stored bracket holds over a later edit
  (`readStoredPermits`), so a deck edited since its reading still has a bracket, from its last analysis, even when the edit has made it
  illegal: `readStoredPermits` checks ownership and the saved shape, not current legality. A deck never analyzed has
  none. Whether a deck is legal NOW is a separate check the table must make itself; reusing the loader does not enforce
  it. Today the reading is drawn only with `ANALYSIS_TAB_ENABLED` on.
- **Pods and friends** (Social foundation; `src/lib/social/`). A pod's members are added from its owner's friends; pods
  are drawn on `/friends` in the pods pane (`src/components/social/pods-pane.tsx`). There is no pod page of its own.
  A pod grants no visibility by itself: every cross-user read joins the viewer's friendship in the same statement.
- **A friend's decks.** `listFriendDecks` (`src/lib/social/games.ts`) gives a friend's decks by name, commander and art,
  only while the two are friends.
- **Opponents in the game log** (`SOCIAL_GAMES_ENABLED`, which needs `SOCIAL_FRIENDS_ENABLED`). `deck_game_opponents`
  holds a game's seats: a friend, a friend's deck, or anyone by commander. Seats snapshot the friend's name and deck at
  log time. The game is the logging player's own row, on their own deck. The picker's reads (`listPodSeats`,
  `listFriendDecks`) seat only pod members who are also the logger's friends.
- **Invites** (`design/design_handoff_the99_invites/`, plan PR #1931). The way a friend who is not on the app joins it.

## The feature

1. **Set up a table.** A player picks one of their pods, picks who is playing tonight (for example 3 of its 5 members,
   the player included), and gives each seat a deck. The setter picks a deck for each seat to start the table; each
   seat's player can change their own.
2. **The read.** Each seat shows its deck, its commander, its bracket and the facts that drive it. The table names any
   deck a bracket or more away from the rest, high or low, and what puts it there.
3. **The suggestion.** For a deck that stands out, its own player is shown their other decks that sit closer to the
   table, with one tap to swap. Only their own decks; nobody swaps anyone else's.
4. **Everyone sees it.** Every seated player opens the same table on their own phone and sees the same read. A swap by
   any seat changes the read for all of them.
5. **Into the game log.** Logging a game from the table opens the game log on that player's seated deck with the other
   seats and their decks already filled in.
6. **It lasts the night.** A table expires about 24 hours after it is set up. Games logged from it stay.

## Locked (do not reopen)

1. **The read is the bracket estimate the app already computes**: each seat's bracket (1 to 5) and the facts that drive
   it (Game Changers, two-card combos, tutors, extra turns, mass land denial), from `slotDeck` and `findings`. No model
   call, so it is free to the player.
2. **The table flags any deck a bracket or more away from the rest.**
3. **The same honesty as every bracket surface.** The classifiers are partial; the table carries the detection
   disclosure, and no seat reads as clean because a fact was not found.
4. **Seats are pod members only, with decks in the app. There is no guest seat.** A pod member not yet on the app is a
   reason to invite them; the table can point at the invite flow and does not redesign it.
5. **One player sets up the table. Every seated player sees the same check on their own phone and can swap their own
   deck.** Each seat's deck is that player's to change.
6. **Reads go through `src/lib/social/`**. An ordinary cross-user read joins the viewer's friendship and pod membership.
   The table's seat read is the one exception, and it is narrow: it joins the viewer's seat at the same unexpired table
   (item 11) and returns the chosen deck only (item 12). The existing friend-deck and pod-seat queries
   (`src/lib/social/games.ts`) join the friendship and would omit seated players who are not friends, so the table
   needs a seat-grant read of its own beside them.
7. **A suggestion offers only that player's own decks**, the ones that sit closer to the table, with one tap to swap.
8. **The table feeds the game log**: logging from it pre-fills the opponent seats and decks (`deck_game_opponents`).
9. **The table expires after the night, about 24 hours.**
10. **Behind a new switch that needs `SOCIAL_FRIENDS_ENABLED`.** Off, the feature is absent everywhere.
11. **The table grants sight (Hugh, 2026-10-16).** Seats need not be friends with each other, since a pod's members are
   the owner's friends. For the table's 24 hours, every seated player sees each other's chosen deck (name, commander,
   bracket and its facts), and logging the game from the table lists every seat as an opponent. Being seated at the
   same table is the consent, and it ends when the table expires.
12. **The grant covers only each seat's chosen deck, never the rest of their decks or their collection.** A seated
   player who is not the viewer's friend shows nothing beyond that deck, and nothing the table reads can be used to
   browse further.
13. **No About entry and no `ABOUT_VERSION` bump.** About entries are paused until the About redesign is done.

## Engineering notes for Design

These are facts of the build that shape the drawing. None reopens a locked item.

- **"Away from the rest" against a range.** A seat's bracket can be a range (1 to 2, or 4 to 5). Where its player has
  declared a bracket, the declaration answers it, as the header chip already does. That holds only while the declaration sits inside the analyzed range (`declarationAsk` answers it). After a
  reanalysis the permits can be 4 to 5 while a retained declaration is 1: that declaration is drifted, it resolves
  nothing, and the seat stays a range measured from its nearer end, never compared as a 1. Design draws the drifted
  seat. Otherwise engineering measures the
  distance from the range's nearer end. The table's reference point is the middle of the seated brackets, so a 2, 3, 3,
  4 table flags both ends (two outliers) and a 2, 2, 4 table flags the 4. A two-seat table with different brackets has
  no "rest": both seats are flagged as a split. Design draws a range seat and a split table; the rule is engineering's.
- **A deck with no bracket yet, or not legal now.** Never analyzed, or not legal (not at 100). A deck with a stored
  reading that an edit has since made illegal is left out of the comparison too, and the seat says why (its card
  count), rather than showing the old bracket as if current. Both take a seat but cannot be compared, and the table's
  read says it leaves that seat out. Because the reading is deterministic, engineering may compute it on the
  spot for a legal deck that has none (about 0.6s for a typical deck, up to about 2s for the largest). An illegal deck
  can never be read; its player sees why (how many cards it holds).
- **A reading from before an edit.** A deck edited since its last analysis still has its last bracket. The seat shows it
  as a reading from before the deck's last change, the way the deck page marks a stale reading, not as current.
- **Suggestions are drawn from decks that have a reading.** A deck without one is not suggested.
- **How a change reaches another seat.** The app has no push channel today. A swap reaches the other phones when they
  refresh, or on a short poll while the table is open. Design should draw the table so it reads correctly on refresh,
  with whatever marks a change since the reader last looked; a live update is not promised.
- **Who logs.** A game is one player's row on their own deck. Each seated player logs from the table onto their own
  seated deck; the other seats become that game's opponents, with the pod size as the seated count. Logging from the
  table needs `SOCIAL_GAMES_ENABLED`; with it off, the table still works and offers no log.
- **The switch and the reading.** The bracket chip is drawn today only with `ANALYSIS_TAB_ENABLED` on. Engineering
  decides whether the new switch also requires it; either way, the table draws nothing a reader with the switch off
  could not otherwise see.

## Open for Design to call

1. **The entry point.** The pod in the pods pane on `/friends`, the Friends page itself, the deck page's Games tab, or
   more than one. How a seated player who did not set up the table finds it (a link, a line on Home, the pod).
2. **The seat picker.** Choosing who is playing from the pod, then a deck for each seat: the order, how a member with
   no decks reads, how a member not on the app points at an invite, and the limit (a game seats 2 to 8).
3. **The table read.** How the seats sit, how the outlier is marked (high and low read differently), how its drivers
   are named, how a range seat and a seat with no bracket read, and where the detection disclosure lives.
4. **The suggestion and the swap.** Where the closer decks appear, how much of each is shown, what one tap does, and
   how the read changes after it.
5. **Another seat's view.** What a player who did not set up the table sees, what they can change (their own deck only),
   and how a change since they last looked reads (see the engineering note on refresh).
6. **Logging from the table.** The press, and how the pre-filled game log reads.
7. **Expired and not enough decks.** A table opened after it expired; a table where fewer than two seats can be
   compared.
8. **Phone and desktop.** The table is used at the table, so the phone at 390 is the primary layout.

## Every state to draw

- **Setup:** choosing the pod; choosing who plays; a deck for each seat.
- **A balanced table:** every seat within the rule.
- **One outlier, high.** **One outlier, low.**
- **Two outliers** (a 2, 3, 3, 4 table), and a two-seat split.
- **A seat whose bracket is a range**, declared and undeclared.
- **A member with no decks.** **A member not on the app** (pointing at the invite).
- **A member whose deck has no bracket estimate yet**, and one whose deck is not legal.
- **What another seat sees.**
- **After a swap**, on the swapping player's phone and on another seat's.
- **Logging the game from the table**, and the pre-filled game log.
- **Not enough decks to compare.**
- **Expired.**
- **Switch off:** absent (no entry point anywhere).
- **390 and desktop** for each.

## About entries

None. About entries are paused until the About redesign is done (brief `2026-10-16-discovery-and-onboarding.md`), so
this feature ships with no entry and no `ABOUT_VERSION` bump. Its entry is owed when that redesign lands, and Hugh
decides its shape then.

## Out of scope

- A guest seat, or any seat for a player not in the pod.
- The invite flow itself (`design/design_handoff_the99_invites/`).
- Any change to how a bracket is computed, or a new fact.
- A model call of any kind, including a written summary of the table.
- Suggesting another player's decks, or swapping a deck for someone else.
- A live push channel.
- Keeping a table past the night, or a history of tables.
