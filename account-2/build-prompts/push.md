# Build prompt · Push notifications (R1)

Paste into Claude Code on your machine once PR #2217 is merged.

---

Build push notifications from `design/design_handoff_the99_push/`. No plan exists yet, so write one first, in `docs/superpowers/plans/` as the other lines do, and split it into PRs. A suggested split: store and sending, then Settings and the ask, then iPhone and the About entry.

Before you start:
- Read the handoff's `README.md`, then `READINESS.md` (Green) and `STATES-push.md`. Open each `.dc.html` with `support.js` beside it.
- Work in a worktree under `.worktrees/`, as AGENTS.md says.
- Every string is a placeholder for /copy-review.
- Everything sits behind a new `PUSH_ENABLED` switch in the registry. The switch is decided per reader from `requestSwitchEnv`.

Rulings (closed):
- **What push carries.** The feed's six kinds. Each kind has its own push box, separate from its Home box. Every push box is off by default except `spare-request`.
- **Web push only.** On iPhone it works only once The 99 is on the Home Screen (iOS 16.4+).
- **Delivery A.** A push goes as its event happens. Several of one kind from one job go as one push. Nothing is sent from 21:00 to 09:00 in the device's time zone; what waited goes at 09:00, one push per kind. There is no quiet-hours setting.

Order of work:

1. **Store (README G1, G2, G7).**
   - Add `push_subscriptions`: one row per device, with endpoint, keys, a user_agent label, the IANA `time_zone`, `created_at` and `last_ok_at`.
   - Add `user_prefs.push_kinds` beside `feed_kinds`. Unset reads as `["spare-request"]`.
   - Signing out deletes this device's row.
   - Add every new per-user table to the purge (its test fails until you do).
2. **Sending (G3, G4, G6).**
   - VAPID keys go in env.
   - The writers that record feed items enqueue a push for each subscribed device when the kind is in `push_kinds`. Catalog kinds fan out at the end of the ingest job, never under the `catalog-ingest` lock.
   - Send one push per (user, kind, job run), with `tag` = kind, and apply the overnight hold.
   - A 404 or 410 from the push service deletes the row.
   - In `public/sw.js`, add `push` and `notificationclick` handlers. Keep the worker's caching rules exactly as they are, and update `sw.test.ts`.
   - Show no notification while a focused client exists.
   - Installed apps call `setAppBadge(unseen)`.
3. **Landing (G5).**
   - The payload carries the route and the feed item key, per the README's table.
   - A click focuses an open window or opens one at that route, and that item is marked seen.
   - Opening Home closes the delivered notifications for the items it marks seen.
4. **Settings (Settings and Device-States boards).** `news-section.tsx` gains the Push column:
   - The head's right slot reads **Push**.
   - Each row keeps its label as the Home box's press, plus its own 44px cell holding the shared `Checkbox` with an `ariaLabel`.
   - The first row is the device row: a bell glyph, a title naming *this phone*, *this browser* or *this iPhone*, one line, and the device box. It has six states.
   - The foot line gains the push clause only where push is possible.
   - Mobile and desktop ship in the same PR.
5. **The ask (The-Ask board).**
   - Only a push tick asks: the device box or any kind's push box, while permission is `default`. Call `requestPermission` and then `subscribe` inside that press.
   - Never ask on load, on Home, or from the inline opt-in. There is no pre-prompt.
   - Block keeps the ticks and shows the blocked line. Dismissing leaves the row at Not on yet.
6. **iPhone (iPhone board).**
   - On iOS 16.4+ when not standalone, How ›, the device box and any push tick open the guidance sheet (the shared sheet box with a ✕).
   - The tick is saved first.
7. **About (`about · push.ts`, About board).**
   - Add the `push` entry on a new `settings` About screen: `screenForPath('/settings')`, a `SCREEN_WHERE` line, and a capture.
   - It is a switched entry: `since` is the version current when it ships, and nothing bumps.
   - Edit `whats-new` key 1 as the file says.
