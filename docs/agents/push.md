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
