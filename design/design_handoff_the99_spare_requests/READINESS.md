# Readiness — spare requests

**Verdict: Green.** R2 approved by Hugh 2026-10-22 ("This LGTM, let's open a PR"). Nothing below blocks the build;
each open item has a drawn default. Builds plan `docs/superpowers/plans/2026-10-22-spare-requests.md` PR 3.

## For Hugh

1. **Home item for an answer.** The plan records your ruling "No new feed kind": the asker learns an answer from the
   Friends badge and Your requests. This handoff also draws a Home What's new item, **Your request** ("Colin can
   spare Jace"), on `Asker-States`. **Default: the plan's ruling stands** and the item is not built; say the word and
   it becomes a stored kind outside `feed_kinds` (no Settings checkbox) and outside `WAITING_KINDS`.
2. **The deck list.** The plan's PR 3 lists "the deck list (the mark on a card not owned, with Ask)". Your R2 call
   removes it: All draws no request marks, so Ask lives in Shopping and the cart's By friend view only.
3. **"Ask instead"** is new against the plan's "other holders show as 'also has one'": while one request is open, the
   other friends' rows offer Ask instead, which withdraws the open request and asks them in one press (G1).
4. **About entry.** Spare requests is a feature; it owes an entry at the line's close-out (plan PR 4).
5. **Copy** is placeholder throughout, for `/copy-review`: the tooltip, Requested / Accepted / Declined, "can spare",
   "is keeping", the receipts and the state lines.

## For engineering

1. **The modal.** The shipped stand-ins modal and spares sheet (`spare-markers.tsx`, `friend-spares.tsx`) keep their
   titles and order. Each friend row: face, name, one sub line, ONE right element (Ask, Ask instead, Ask again, or a
   one-word status). The section head gains an ⓘ (the shipped tooltip) carrying the old foot copy; only a one-line
   state sentence stays under the rows.
2. **The Shopping row.** The spare glyph press takes the requested dot and the accepted tick; no new press or column
   (the one-line row, `decklist-row.tsx`). The key (`shopping-key.tsx`) stays its grid; `requested` and `accepted`
   join after `friend has a spare` only while a row draws them. All is untouched.
3. **The cart.** `view-switch.tsx` gains **By friend**: one panel per friend (header band: face, name, pods, spare
   count), lines are the shipped cart line with Ask or a one-word status before the buy tag.
4. **/friends.** Your requests sits under Waiting on you in the shipped feed rows (`loadMyAsks`); the friend's request
   row in Waiting on you takes Yes and No with the days left (`loadIncomingAsks`), and the same row is Home's lead
   story when it is the newest thing waiting (`LEAD_PRIORITY` already puts `spare-request` first).
5. **Gaps** G1 to G5 in `README.md`: withdraw (and Ask instead as one transaction), copies and deck on the request,
   "no longer spare" at read, the feed kind's default on, the shared toast for failed writes.
6. **After a No** the friend's row reads Declined and offers no Ask for 14 days (`DECLINE_COOLDOWN_DAYS`); other
   holders can be asked at once.
