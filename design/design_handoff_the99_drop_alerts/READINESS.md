# Readiness · Drop alerts

**Verdict: Green.** R1 approved by Hugh 2026-11-10 ("This LGTM"), every recommended option taken. Nothing below blocks
the build; each open item has a drawn default. Checked against main at `afd8ed3` (#2786).

## For Hugh

1. **Copy** is DRAFT throughout, for `/copy-review`: the group label "Upcoming drops", the sale, pre-queue and store lines,
   the kicker words, both push titles and bodies, the Secret Lair Settings line, the push foot and the About key.
2. **About.** Hugh decides whether the Upcoming drops group owes an About entry; the push key's erratum is listed below.

## For engineering

1. **Upcoming drops group** (Home's What's new, `whats-new.tsx` / `src/lib/feed/home.ts`): Secret Lair posts with
   `on_sale_date` or `on_sale_at` ahead, minus the lead and dismissed ones, soonest sale first, above the rows under the
   shipped `fday` label; the rest always labelled (Today/Earlier) while the group shows; outside the five-row count. A row
   leaves an hour after `on_sale_at`, a day-only drop at the end of its sale day in the store's zone. Rides the
   `secret-lair` In app tick and the post's own seen state, diamond, ✕ and press.
2. **Row** (`feed-item.tsx`): the shipped `FeedItemRow`; the sale lines replace the summary (sale line `--fg`, pre-queue line
   body ink, store clock in the mono `lc` line); kicker age slot per `STATES-drop-alerts.md` (`pre-queue open` in
   `--accent-text`, `on sale now` in `--success`). No countdown.
3. **Archive** (`archive-view.tsx`): the same lines on the post's row in its month while the sale is ahead; no group.
4. **Zones.** Reader's zone from the browser; recommend a zone cookie on first visit so first paint is not the store-zone
   fallback (state 7). Your day differing from the store's puts the store's weekday in the mono line.
5. **Push** (`src/lib/push/sale.ts`, `src/lib/copy/push.ts`): set `SALE_PUSH_LEAD_MS` to 15 minutes (at 0 a drop with no
   pre-queue never sends: its send instant equals `on_sale_at` and `salePushDue` needs now before it). Words per the Push
   board in the device's zone (`push_subscriptions.time_zone`; the default `UTC` counts as unknown → store zone, labelled);
   a time on another day than the send takes its weekday. Then flip `SALE_PUSH_LIVE`.
6. **Settings and About copy:** `feedCopy.news.kinds["secret-lair"].line`, `pushSettingsCopy.foot`, the About push key
   (`about-entries.ts`), per the Settings board. Update the copy tests that pin them.
7. **Mobile and desktop** ship together in each PR.
