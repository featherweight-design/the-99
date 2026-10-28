# Build prompt · Spare requests (R2)

Paste into Claude Code on your machine. PR #2205 is merged.

---

Build the spare requests UI. This is PR 3 of `docs/superpowers/plans/2026-10-22-spare-requests.md`; the store, rules and badge from PRs 1 and 2 are already on main.

Before you start:
- Read `design/design_handoff_the99_spare_requests/README.md`, then `READINESS.md` and `STATES-spare-requests.md`. Open each `.dc.html` with `support.js` beside it.
- Work in a worktree under `.worktrees/`, as AGENTS.md says.
- Every string is a placeholder for /copy-review.
- Every cross-user read and write goes through `src/lib/social/spare-requests.ts` (`check:social-reads`).
- Everything sits behind `SPARE_REQUESTS_ENABLED`.

Three decisions already made (READINESS, For Hugh):
- **No Home item for the asker.** Keep the plan's ruling of no new feed kind. The asker learns an answer from the Friends badge and Your requests. The `Your request` Home item on `Asker-States` is not built.
- **No deck-list mark.** The All view gets no request marks. Ask lives only in Shopping and in the cart's By friend view.
- **Ask instead.** While one request is open, other friends' rows offer **Ask instead**, replacing the plan's "also has one".

Order of work:

1. **Store additions (README G1 to G5).**
   - **Withdraw.** Add a withdrawn state (a `withdrawn` status plus a migration to its check, or a delete). Withdrawing tells nobody: the request leaves the friend's Waiting on you and their badge drops.
   - **Ask instead.** One transaction: withdraw the open request, then ask the new friend. A refusal leaves the first request open.
   - **Copies and deck (G2).** Add `copies` (what the deck needs, capped at the friend's spare count) and a nullable `deck_id`. It is null from the cart. The friend's line reads "Peter wants 1 for Dragons of Tarkir".
   - **No longer spare (G3).** Derive it at read time from `loadFriendSpares`. A card that leaves the asker's buy lists closes silently.
   - **Feed default (G4).** `spare-request` is on by default for an account that never chose.
   - **Failed writes (G5).** Every action uses the shared toast on failure: "We couldn't send that. Try again."
   - Run the purge and `probe:spare-requests` for anything new.
2. **Actions.** Add ask, ask-instead, withdraw/clear, and answer yes/no.
   - The reader comes from the session; decide the switch per reader.
   - Revalidate `/friends` and the deck's Shopping page, never Home or `/decks`.
3. **The modal (Shopping and Asker-States boards).** In the shipped spares sheet and stand-ins modal (`friend-spares.tsx`, `spare-markers.tsx`), keep the titles and order.
   - **Each friend row:** face, name, and ONE sub line ("2 spares · Thursday pod", or "12 days left" while requested).
   - **The right side holds ONE element:** Ask, Ask instead, Ask again (after an expiry), or one word. The words are Requested (accent dot), Accepted (✓, success colour) and Declined (muted).
   - **After a No:** the row reads Declined, with no Ask for `DECLINE_COOLDOWN_DAYS`.
   - **Section head:** add an ⓘ (the shipped tooltip) that holds the old foot copy. Only a one-sentence state line stays under the rows.
4. **The Shopping row and key.**
   - **Row:** the spare glyph press shows an accent dot while requested and a green tick once accepted. There is no new press or column on the one-line row.
   - **Key:** `shopping-key.tsx` keeps its grid. `requested` and `accepted` join right after `friend has a spare`, only while a row draws them.
   - **All** is untouched.
5. **The cart's By friend view (Cart-By-Friend board).**
   - `view-switch.tsx` gains By friend.
   - **Panels:** one per friend, most spares first. The header band shows the face, name, pods and spare count.
   - **Lines:** the shipped cart line, with Ask or a one-word status before the buy tag.
6. **/friends and Home (Asker-States and Friend-Side boards).**
   - **Your requests** sits under Waiting on you, in the shipped feed rows (`loadMyAsks`). The states are Requested (days left), Accepted, Declined, No answer (Ask again) and No longer spare. ✕ withdraws an open request or clears an answered one.
   - **The friend's request:** a Waiting on you row with Yes, No and the days left (`loadIncomingAsks`). The same row is Home's lead story when it's the newest thing waiting.
   - **After an answer:** the row becomes a receipt for the visit, "You're sparing Lathliss for Peter" or "You're keeping Lathliss".
   - **Settings:** the "Friends asking for your spares" line starts checked.

Phone (390) and desktop (1300) ship together in each PR. The About entry belongs to plan PR 4 (close-out).
