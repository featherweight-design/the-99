# Spare requests (G5): implementation plan

Rulings: `boards/me-page-workshop-2026-10-21.md` rounds 4, 5 and 8 (Hugh, 2026-10-21) and Hugh's two calls relayed by
the orchestrator on 2026-10-22. Starting point: `2026-10-22-menu-home.md` (G5 out of scope there) and
`design/design_handoff_the99_menu_home/READINESS.md` ("Later round"). The UI waits on Design prompt 15 (a
`design/design_handoff_the99_spare_requests/` handoff).

## Rulings

- Ask is a deliberate press per card, from Shopping or a deck list, never automatic. A friend's matching spare is SHOWN
  there, never notified.
- The friend answers Yes or No and the asker is told. A Yes changes nothing else in the app.
- An unanswered ask expires after 14 days; the asker may ask again.
- One friend per card: other holders show as "also has one"; after a No or an expiry the next can be asked.
- After a No, that friend is not asked for that card again for 14 days; the next holder may be asked at once (Hugh).
- The answer reaches the asker as the Friends badge and its state in their asks list. No new feed kind (Hugh).
- The friend is told through the `spare-request` feed kind ("Friends asking for your spares", on by default in the
  workshop's list), which governs the feed item and Home's badge only. Waiting on you and the Friends badge show an
  incoming ask regardless of the opt-in: they are the only place to answer it.

## Switch

`SPARE_REQUESTS_ENABLED`, feature, needs `SOCIAL_FRIENDS_ENABLED`. Unset in production until the line closes.

## PRs

1. **Store and rules.** `spare_requests` (migration, with the switch's `flag_overrides` constraint); pure rules
   (`spare-request-rules.ts`: derived expiry, one open ask per card, the No cooldown, what the asker's list shows);
   `askForSpare`, `answerSpareRequest`, `loadIncomingAsks`, `loadMyAsks` in `src/lib/social/spare-requests.ts`; the
   holder's feed item written with the ask; purge of both sides; `check:social-reads`; `probe:spare-requests`.
2. **Feed and badge.** `feedKindAvailable("spare-request")` follows the switch, so Settings offers the kind and Home
   reads it; the stored feed branch keeps a spare-request item only while its ask is open and unexpired; the Friends
   badge is two halves: SEEN (unseen trade matches and answers to the reader's asks newer than `friends_seen_at`,
   cleared by a `/friends` visit, which now also marks answers seen) and WAITING (the reader's incoming open asks,
   cleared only by answering). The ask and answer ACTIONS and the Waiting on you rows move to PR 3: their only callers
   are the Ask press and the Yes / No row, so shipping them first would ship code with no caller.
3. **UI, after the handoff.** The ask and answer server actions (reader from the session, switch per reader,
   `/friends` revalidated, never Home or `/decks`) and Waiting on you's spare-request rows (`loadIncomingAsks`), with: Shopping (the row mark and the all-spares view, with Ask), the deck list (the mark on a
   card not owned, with Ask), the asker's states and open-asks list, the request row in Waiting on you with Yes and No,
   phone and desktop. A note on an ask, if Design draws one, is player-typed text: capped and collapsed through
   `playerText`'s rules, though it reaches no model.
4. **Close-out.** About entry, copy review, contact sheet, `feature-acceptance` walk; the switch stays off in
   production until Hugh turns it on.
