# Brief: Drop alerts (Upcoming drops row, sale-time push)

**For:** Claude Design. **Prompt:** to be written by the orchestrator from this brief.
**Source:** Hugh's ruling of 2026-11-10 (option B of the drop-alerts research: an Upcoming drops row, then a push at sale time). Findings live in the private boards folder, not the repo.
**Existing handoffs to extend:** `design/design_handoff_the99_announcements/` (Home rows, lead story, Settings kinds, archive), `design/design_handoff_the99_push/` and `design/design_handoff_the99_push_line/` (push copy, Settings push column, the 21:00 to 09:00 hold). Where a shipped component and a handoff disagree, the component wins.

## Why

A Secret Lair drop's date and hour are announced days or weeks ahead in Wizards' own post, and the app already shows that post as an Announcements row. Players still miss the sale: the row says "announced", not "on sale Monday at 9 a.m.". The data is now stored (migration 0230, `wizards_announcements.on_sale_date`, `on_sale_at`, `on_sale_zone`, `pre_queue_at`), read from the post's words with no model call.

## What the data can and cannot say

- Always: the post's title, link and publish date.
- Sometimes: a sale **day** with no hour (Wizards often names the day first). Then the row shows the day and no time, never a guessed one.
- Sometimes: a sale **hour** in a named US zone ("9 a.m. PT"), stored as a UTC instant plus the zone it was written in, and the pre-queue opening an hour earlier.
- Never: regional store times other than the one the post names (the US store). The row says "US store".
- A time can change when Wizards edits the post. The row follows the stored value.

## Surfaces Design is asked to call

1. **The Upcoming drops row.** Where it lives (Home, the Announcements archive, or both), how it differs from the existing Secret Lair row, and the order against other rows. One row per announced drop whose sale has not started; gone an hour after the sale begins.
2. **Date and time wording.** Shown in the player's own zone with the source printed beside it ("Mon Nov 9, 9 a.m. PT, 12 p.m. your time"), and a day-only variant ("Mon Nov 9, time to be announced"). The pre-queue line ("Pre-queue opens an hour earlier") is a second line or a tooltip, Design's call.
3. **The sale-time push.** Words for the two sends: a heads-up an hour before the pre-queue or sale, and (optional) at sale time. What a push says when the hour is not yet known (it does not send; the announcement push already exists).
4. **The overnight hold exception.** Pushes are held 21:00 to 09:00 in the device's zone. A 9 a.m. PT sale is 6 a.m. in Hawaii and 12 p.m. in New York. Design rules: send a drop-time push inside the hold (the engineering default, because the point is the hour), or hold it and show it as missed. Engineering recommends sending.
5. **Settings.** The `secret-lair` kind already has a feed tick and a push tick. Design says whether the sale-time push rides that tick (recommended, no new toggle) or becomes its own line.

## States to cover

Day only, day and time, pre-queue open, sale live now (row ends within the hour), sale passed (row gone), time changed (the row updates, no new push), and the player's zone unknown (falls back to the source zone only). Mobile and desktop, all six themes.

## Closed

No per-drop "remind me" button (Hugh deferred it). No model call anywhere. Wizards' own "Get notified" is not replaced or linked as a competitor.

## Engineering notes

Push sends use the existing outbox and the 15-minute flush cron, so an hour-ahead heads-up is accurate to about 15 minutes and a sharp "at 9:00" push is not promised. Design should not draw a seconds-precise countdown.
