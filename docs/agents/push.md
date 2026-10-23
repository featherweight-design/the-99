# Push notifications (background)

Plan: `docs/superpowers/plans/2026-10-22-push.md`. Handoff: `design/design_handoff_the99_push/` (README, STATES-push.md).
This file holds what a reader of the code needs and the plan's decisions in one place; `AGENTS.md` keeps the rules.

## What exists after PR 1 (foundation, no UI, no sender)

- **Switch** `PUSH_ENABLED` (feature, needs `HOME_FEED_ENABLED`), unset in production and held in `ALL_FEATURES_EXCLUDED`
  until close-out. Off, push has no column, no device row, no send and the foot line is as shipped.
- **Keys.** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (Sensitive), `VAPID_SUBJECT`, set by Hugh in Vercel, Production scope,
  on BOTH projects with a keypair each. `pnpm push:keys` prints a pair and touches nothing. `pushConfig(env)`
  (`src/lib/push/config.ts`) is `null` unless all three are present and well formed: the code is dormant, never throws,
  and never logs a key. The switch alone does not turn push on and neither do the keys. Rotating a pair invalidates every
  subscription made under the old one; nothing rebuilds them.
- **Tables** (migration `0171`): `push_subscriptions` (one row per device; `endpoint` unique; the browser's `time_zone`),
  `push_outbox` (one row per event per reader, written in the SAME transaction as the feed item it announces, from PR 3),
  and `user_prefs.push_kinds` / `push_kinds_declined`, which have `feed_kinds`' exact shape and rule (`isKindOn`,
  `nextFeedPrefs` are reused; `spare-request` is the one default-on kind). All three are purged with the account.
- **Rules** (`src/lib/push/`, pure): `hold.ts` (21:00 to 09:00 in the DEVICE's zone; an unknown zone is judged as UTC),
  `message.ts` (an item becomes a message; `collapse` is one per (kind, batch) live and one per kind on release; a spare
  request is never collapsed), words in `src/lib/copy/push.ts` over `feedCopy.home`.

## Added by PR 2 (subscribe, prefs, sign-out)

- `src/lib/push/endpoint.ts` (pure): a stored endpoint must be https on a push service's own host (`fcm.googleapis.com`,
  `*.push.services.mozilla.com`, `*.push.apple.com`, `*.notify.windows.com`, no port, no credentials) because the SERVER
  later POSTs to it; the keys must be a 65-byte point and a 16-byte secret. `parseDevice` cleans the label and falls back to UTC.
- `subscriptions.ts`: `saveDevice` upserts by endpoint (a browser signing in as another account takes the row over) and trims
  the reader to 10; `removeDevice` deletes only the reader's own row. `prefs.ts`: `setPushKinds` is `setFeedKinds` over the push
  columns (`nextFeedPrefs` decides).
- Actions in `src/app/settings/push-actions.ts`: `savePushKinds`, `subscribeDevice` (both refused unless `pushAvailable`) and
  `unsubscribeDevice` (never refused by a switch). Sign-out (`forget-device.ts`, called by the account menu) deletes this
  browser's subscription BEFORE the session ends, bounded at 3 seconds, never throwing. The actions have no UI caller until
  the Settings PR; `probe:push-subscriptions` proves them against a real database in the meantime.

## Added by PR 3a (the outbox, no sender yet)

- **`recordFeedItem` is the one trigger** (`src/lib/social/feed-write.ts`). A NEW item (it returned true) queues a push in the SAME
  executor: `enqueuePush` (`src/lib/push/enqueue.ts`), one statement, a `push_outbox` row only while the reader has a device,
  the kind's PUSH is on and the item is newer than the kind's push stamp (`pushKindEnabledAt`, `feed_kinds`' rule over the push
  columns); the unique index (user, kind, item key) makes a repeat free. It checks no switch: a device exists only if the reader
  subscribed while push was available, and the flush judges the switch and the keys again before sending.
- **Push is its own choice**, so the feed insert also writes when the reader has a device and the item is newer than the PUSH stamp,
  with the feed kind off. Such a row is never drawn: every feed read filters by the feed kind's own stamp.
- **The row holds no words** (`payload` is reserved, always `{}`). The flush resolves (kind, item key) through the feed's own read:
  `storedItemsByKeyQuery` (`src/lib/social/feed-items.ts`, the same `standing` rules as the feed: a withdrawn trade match, an
  answered or expired ask or an unfriended friend is not pushed), `toViews` and `lookups` (`feed/home.ts`), then `toPushItem`
  (`src/lib/push/to-push-item.ts`); `resolvePushItems` returns the items and the DROPPED refs the flush abandons. A push says what
  Home says; the spare request's body is Home's line, with no copy count (Home has none).
- **Batch key.** No job-run id exists at the writers, so `FeedItemInput.batchKey` is optional and defaults to the kind's 15-minute
  window (`defaultBatchKey`): one run writes within seconds, and a night's held rows collapse by kind anyway.
- Proof: `probe:push-subscriptions` (queue, resolve and drop, against a real database).

## Added by PR 3b (the server sender)

- **`/api/cron/push-flush`** (`vercel.json`, every 15 minutes, the cost ruling of 2026-10-22: a 5-minute cron keeps both Neon databases awake;
  `CRON_SECRET` bearer like `account-sweep`): `flushPush`
  (`src/lib/push/flush.ts`). Without the three VAPID variables it answers 200 `dormant` and reads nothing; the code is live on
  every deployment and sends only where Hugh set the keys. It takes no lock: an overlapping run can send a push twice (a
  notification's `tag` is its kind, so the second replaces the first on the device), but never loses another run's progress:
  `payload.done` is merged in the database and a row is settled only when the merged set covers every device. Each device
  takes its oldest `PER_DEVICE` (50) rows still waiting for it, so a held or failing device never starves an awake one. Switches
  are read STRICTLY (`resolveSwitchEnvStrict`): a failed override read leaves the reader's rows for the next run.
- **Per reader**: the switch again (off abandons the row); a row over 24 hours old is stale and abandoned; the words come from
  `resolvePushItems`, and a row that no longer stands is abandoned. **Per device** (`planDevice`, pure, `plan.ts`): nothing inside
  its held hours (21:00 to 09:00 in ITS zone); a LIVE push (one per kind and batch) for what arrived while it was not held; the
  morning RELEASE (one per kind) for what arrived while it was; a spare request never merged; a device that subscribed after an
  event never hears of it. A row is SENT once every device the reader still has is done with it (`payload.done` lists them); a
  send that succeeded is recorded at once, so a later failure never repeats it.
- **Send** (`send.ts`, the only caller of `web-push`, exact pin 3.6.7): VAPID-signed, TTL one day, NO `topic` (the push service keeps
  one undelivered message per topic and would drop the rest of a burst the flush already recorded as sent). The device's own `tag`
  does the replacing: the kind, except a spare request, which is tagged by its own key so two asks never replace each other. A 404 or 410 deletes the device; any other failure, a send that waits
  over 10 seconds included (`SEND_TIMEOUT_MS`), is transient and leaves the rows for the next run. Counts only are logged: never an endpoint, a key or a word.
- Rows a week old are pruned. Proof: `probe:push-flush` (a fake sender against a real database).
- Not yet: the service worker's `push` and `notificationclick` handlers (PR 3d), so nothing a device receives is shown yet; and the
  catalog kinds (PR 3c).

## Decisions the plan fixed (D1 to D5)

1. Outbox, not a direct send: `recordFeedItem` runs inside transactions, so a send from it could announce a rolled-back event.
2. New-set and new-precon have no per-user row (`catalog_first_seen`): the catalog refresh's end enqueues per subscribed reader.
3. `push_kinds` is `{kind: enabledAt}` plus a declined list: ticking a kind never pushes what already happened.
4. Seen is a cursor (`feed_seen_at`, `friends_seen_at`), so a push cannot mark one key seen. Home and `/friends` landings
   already move their cursor; set, precon and friend-page landings do not. Opening Home closes every delivered notification.
   (A departure from the handoff's G5, recorded for Design.)
5. An installed iPhone must show every push (WebKit revokes a silent subscription), so the "no push with a focused client"
   rule skips only off iOS.

## Landing contract (consumed by the landing PR)

A message carries `route`, `tag` (the kind), the item `keys`, and for a price drop or combo `openCard` (an oracle id) and
`openCombo`: Home opens that card's details on landing, for its combo when `openCombo`.
