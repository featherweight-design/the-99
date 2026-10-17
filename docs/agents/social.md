# Social (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **Social foundation** (plan `boards/plan-social-foundation-2026-10-12.md`, Hugh's rulings 2026-10-12), behind
  `SOCIAL_FRIENDS_ENABLED` (`'true'` on staging, unset on production; dark until the first UI PR). Friends are added
  by a single-use invite link or its QR code and never by search; a friendship is two directed `friend_links` rows,
  written in user id order so two readers' stamps lock the same way round; a pod's members are added only from its owner's own friends,
  and a pod passes to the longest-standing member when the owner leaves (so after a hand-on, a member need not be
  the new owner's friend: a pod grants no visibility by itself, and every read that uses one also joins the
  friendship). **Every cross-user read lives in `src/lib/social/`** and joins the
  grant on the session's viewer in the same statement; client payloads carry `social_profiles.public_id`, never a
  Clerk id. `pnpm check:social-reads` fails when a module under `src/` outside that directory touches a social table,
  by schema import, through `db.query`, or by name in raw SQL, and runs against the shipped tree inside `pnpm test`; `pnpm probe:social` proves the
  answers on a scratch branch.

  **Spares are view-only and shared per pod** (Q3, Q12): `loadFriendSpares(viewer, oracleIds)` reads the grants (the
  friendship, the friend's `pod_spare_shares` grant, the friend's membership of that pod and the viewer's, in one
  statement), then runs each granting friend's own claim model, at most four at once, each in a repeatable-read
  snapshot that re-checks that friend's grant first, so a grant revoked mid-read reads nothing. A spare is
  `owned − hard − soft`, so a copy only a draft wants is not spare. Each row's friend carries their face and the names of
  the pods the grant holds through (Social R2 PR 2), and the spares are served by `GET /api/friend-spares?ids=` (signed in,
  `SOCIAL_FRIENDS_ENABLED` re-checked for the reader, at most `MAX_SPARES_BATCH` card ids, `private, no-store`), so no
  cached key carries them. `loadFriend` reads one friend by public id through the viewer's own link row (R2's friend page).
  **A friend's write never moves the viewer's stamp**, so friend data stays out of cached payloads by default; a cached
  page that must draw it puts `await friendGeneration(viewer)` as a bare element of EVERY `cachePageForUser` key on that
  page, for that call's own reader, and `check:list-cache` fails a cached page whose loaders reach `src/lib/social/`
  (the switch module aside) without it. A cached page that draws spares must ALSO carry each friend's resolved
  switches in its key, because `loadFriendSpares` runs each friend's claim model under `resolveSwitchEnv(friend)` and a
  friend's override flip moves no key the viewer's page has; `check:list-cache` refuses `spares.ts`'s import of the
  switch snapshot on a cached page's path until that key exists. `pnpm measure:friend-spares`
  times the per-friend cost (read-only).

- **Opponents in the game log** (scope §4, Feature C; Hugh's ruling Q15), behind `SOCIAL_GAMES_ENABLED`, which requires
  `SOCIAL_FRIENDS_ENABLED` (`'true'` on staging, unset on production; dark until its UI PR). `deck_game_opponents`
  holds the seats of a game, seat 1 upward and fewer than its pod size: a friend, a friend's deck, or anyone by a
  catalog commander and an optional label, plus an optional `won` on a loss (one at most). The rows are the game
  owner's and SNAPSHOT the friend's name and the deck's name and commanders at log time, so every read draws the
  snapshot and none depends on a friend's live rows or cache. `logGame` refuses opponents while the switch is off, and
  resolves a friend seat in the game's own transaction: a friend's deck is offered and seated only through the
  viewer's own friendship (`src/lib/social/games.ts`, held FOR SHARE until the game commits), and a pod only seats its
  members who are also friends. `pnpm probe:game-opponents` proves it. The live friend link is never sent to a client and is
  UNLINKED by the account purge (`SOCIAL_UNLINKED`), keeping the snapshot. The label is player-typed and no prompt
  reads the table (`game-opponents.test.ts` pins who may). `summarizeMatchups` splits a deck's games by commander,
  color identity and friend as `GameSummary` cells: counts with denominators, no rate.
  The picker's reads ship dark behind the same switch (R3 PR 1, plan `2026-10-15-social-r3-opponents-and-matchups.md`):
  `searchOpponentCommandersAction`, `listFriendDecksAction` and `listPodSeatsAction` (`src/app/decks/[id]/opponent-actions.ts`)
  each re-check `socialGamesEnabled` for the signed-in reader and answer an empty list when it is off, and
  `loadDeckOpponents` returns a deck's seats and matchups, or null when the switch is off, there are no games or the read
  failed (logged, never thrown). None has a caller beyond its tests and the probe until the form (PR 2) and the Games tab (PR 4).

- **Invites** (plan `2026-10-16-invites.md`), behind `SOCIAL_INVITES_ENABLED` (needs `SOCIAL_FRIENDS_ENABLED`; dark
  until the UI PR). PR 1 is the data and the pure rules (`src/lib/invites/rules.ts`, `tokens.ts`, `read.ts`). PR 2 is
  the sender's writes: `sendEmailInvite` and `showInviteQr` (`send.ts`) and the admin's `setInvites`,
  `topUpGroupInvites` and `revokeReservation` (`admin.ts`), each under the sender's advisory lock
  (`lockSenderIn`, `invites:<sender>`). Every one but the revoke re-reads what is left through `readCountIn` (a revoke
  only stops a row holding, which cannot break it), so the invariant (`held` ≥ the rows holding) holds. The email path commits its reservation BEFORE Clerk is asked and answers every outcome
  after that as a success, at `SEND_FLOOR_MS` (`floor.ts`, 1500ms: about 2.4 times staging's measured Clerk READ p99, since a create was not measured), so neither the
  words nor the time tell a sender whether an address has an account; a Clerk refusal and an indeterminate send both
  keep holding. `src/lib/invites/clerk.ts` is the one caller of Clerk's invitations API, and `mail.ts` the Resend
  `fetch`, FAIL CLOSED: without `RESEND_API_KEY`, `INVITE_EMAIL_FROM` and `INVITE_CODE_SECRET`, nothing is fetched.
  The actions are `src/app/friends/invite-actions.ts`; the sender's sheet polls `GET /api/invite-qr?t=` (own row
  only). Admin history lines are `admin_events` kinds `invites_set`, `invites_topped_up` and `invite_revoked`; a
  sender's own sends and a newcomer's join are NOT logged there, because `admin_events.actor_id` survives the purge
  and would keep a deleted player's id: PR 6 reads them from the rows. PR 3 is the newcomer's backend: `claimInvite`,
  `confirmCode` and `handOver` (`claim.ts`, each decision a pure function) behind the actions in `src/app/join/actions.ts`
  (the token's SENDER's switch decides, off reads as N12; the claim secret travels only in an httpOnly cookie on the
  token's own path); `spendInviteOnSignUp` (`spend.ts`, from `user.created` in the Clerk webhook and from the
  newcomer's first `/friends`, idempotent in either order, with `takeReceipt` drawing the band once from the edge);
  `sweepInvites` behind the hourly `GET /api/cron/invite-sweep`; and the purge revoking the sender's pending Clerk
  invitations after it commits. Proof: `pnpm probe:invites`.
