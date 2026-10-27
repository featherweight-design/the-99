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
- The answer reaches the asker as the Friends badge and its state in their asks list. No new feed kind (Hugh). *Amended 2026-10-27 (d9, approved): an answer also writes the asker a `spare-request` feed item marked with the answer, so it reaches Home and push; still no new kind.*
- The friend is told through the `spare-request` feed kind ("Friends asking for your spares", on by default in the
  workshop's list), which governs the feed item and Home's badge only. Waiting on you and the Friends badge show an
  incoming ask regardless of the opt-in: they are the only place to answer it.

## Switch

`SPARE_REQUESTS_ENABLED`, feature, needs `SOCIAL_FRIENDS_ENABLED`. Unset in production until the line closes. It stays unset on STAGING as well, and
takes no override, until PR 3 ships: after PR 2 the Friends badge counts asks waiting on the reader and a `/friends`
visit marks answers seen, and before PR 3 no surface answers an ask or shows an answer.

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
3. **UI, after the handoff** (`design/design_handoff_the99_spare_requests/`, Green, R2), split in five (below).
   The original scope, kept for the record: The ask and answer server actions (reader from the session, switch per reader,
   `/friends` revalidated, never Home or `/decks`) and Waiting on you's spare-request rows (`loadIncomingAsks`), with: Shopping (the row mark and the all-spares view, with Ask), the deck list (the mark on a
   card not owned, with Ask), the asker's states and open-asks list, the request row in Waiting on you with Yes and No,
   phone and desktop. A note on an ask, if Design draws one, is player-typed text: capped and collapsed through
   `playerText`'s rules, though it reaches no model.
4. **Close-out.** About entry, copy review, contact sheet, `feature-acceptance` walk; the switch stays off in
   production until Hugh turns it on.

## PR 3 rulings (handoff R2; orchestrator, 2026-10-22)

The readiness audit's errata (approved):

- **E1 · Key order.** The shipped key order stays (⇄, spare, buy, over); `requested` and `accepted` are appended after
  spare, each only while a row draws it.
- **E2 · Stale gaps list.** `Main.dc.html`'s gaps list is stale; the README governs.
- **E3 · The badge** counts incoming asks whatever the reader's feed choice.
- **E4 · No asker Home item.** The asker gets no "Your request" Home item (no new feed kind).
- **E5 · R1 labels** on the boards are cosmetic.
- **E6 · Deck-list Ask** is retired; Ask lives in the spares modal and the cart's By friend view.

The gaps:

- **G1 · Withdraw.** A `withdrawn` status: the asker's ✕ on an OPEN ask, or Ask instead. Nobody is told; the holder's
  row, feed item and waiting badge drop; it holds no card and no cooldown and is never shown. ✕ on an ANSWERED or
  EXPIRED ask sets `asker_cleared_at`, never a delete: a cleared No still holds the cooldown. ASK INSTEAD is one
  transaction under the asker-and-card lock: withdraw the asker's open, unexpired ask for the card (else `gone`), then
  the ask body to the new friend; any refusal rolls back and leaves the first ask open.
- **G2 · Copies and deck.** `copies` (1 to 99, capped at the friend's spare count) and a nullable `deck_id` (set null
  on delete), stored only when the deck is the asker's own; both display only, never a refusal.
- **G3 · No longer spare.** Derived at read. Holder side: an open ask for a card the holder no longer offers (their own
  `spare_min`, keeps and claims, `isOffered`) leaves Waiting on you and the waiting badge; the dated feed item may stay.
  Asker side: an open ask reads `unavailable` when the holder no longer offers it to the asker, `unneeded` against an
  optional `stillNeeded` set. No cross-user read of the asker's decks from the holder's side.
- **G4 · Feed default.** `spare-request` is ON for an account with no stored choice (`DEFAULT_ON_KINDS`);
  `user_prefs.feed_kinds_declined` holds a default-on kind turned off. Nothing is written on read; turning it back on
  stamps it now (no backfill). Catalog kinds stay default-off.

The split:

- **3a · Backend for the UI.** The migration, the rules above, the actions (`src/app/friends/spare-actions.ts`), the
  asker's per-card read (`GET /api/spare-requests`), the default-on kind, `probe:spare-requests` extended. No UI.
- **3b · Shopping.** The modal's friend rows (Ask, Ask instead, Ask again, status), the row's requested and accepted
  marks, the key, with the shared toast.
- **3c · The cart.** By friend.
- **3d · /friends, Home and Settings.** Waiting on you's request rows (Yes and No), Your requests (states, ✕), the
  lead story's Yes and No, the Settings caption.
- **4 · Close-out**, as above. `SPARE_REQUESTS_ENABLED` stays in `ALL_FEATURES_EXCLUDED` until it.
