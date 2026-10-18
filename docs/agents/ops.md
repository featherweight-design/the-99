# Ops (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **Stuck-loader reports** (`NAV_STALL_LOG_ENABLED`, a plumbing switch; `'true'` on staging, off on production
  until Hugh turns it on). A loading screen still up 8 seconds (`STALL_AFTER_MS`) sends ONE report per navigation to
  `POST /api/nav-stall` (signed in, the switch re-checked for the reader, a 2KB cap, always 204), which logs one
  line. `src/lib/nav-stall/report.ts` checks every field: paths arrive as PATTERNS (every segment the app does not
  name is `[x]`, the query is dropped), everything else is a closed enum, a boolean or a bounded integer, and the line
  carries no reader id and no deployment id. Two watchers send it: the navigation provider, for a press still
  pending (`kind=pending`), and `StallWatch` inside every in-page loading screen (`LoadingScreen`, and Help me
  choose's results skeleton, but not while it stands in for a model read), for a page that committed into its
  fallback (`kind=fallback`). A third, `kind=orphan`, is the provider finding its overlay up with no navigation
  running (`useOrphanGuard`): it is sent at once, not after 8s, because nothing is left to wait on, and the same
  check takes the overlay down. An `orphan` line is a defect in the provider, and its `at`/`elapsed` say where and
  how long. A press that hangs pending and then in its own fallback reports once; any other
  loading screen (a route that commits its loading boundary at once, a change of query, a Back) is a navigation of
  its own. Find them with `vercel logs -p the-99-staging -q "nav-stall"` (staging, where the switch is on; `-p the-99` is production, where it is off), and read a line by field:

  - `moved=true` means the address bar already shows the target: the router committed and the PAGE is what never
    arrived. `moved=false`: the press itself never committed.
  - `rsc` is how far the router's OWN request for the target got (a prefetch never counts): `none`, no request
    started (the router never asked); `waiting`, asked and no response yet (network, proxy or a server still
    rendering); `headers`, the response began with `rscStatus` and its body never finished (a stalled stream);
    `done`, the body arrived whole in `rscMs` with `rscBytes`, so the hang is in the browser.
  - `loader` is what was drawn: the pending `overlay`, the page's own `fallback`, `both`, or `none` (a report from a
    screen that left in the same instant).
  - `wasHidden=true` means the tab was backgrounded during the wait, and a frozen tab is not a hang: discount it.
  - `skew=other` means the page was loaded from a different deployment than the one that answered: it outlived a
    deploy. `worker`, `online` and `conn` say whether the service worker controlled the page and what the connection
    was.

- **Security headers and request counting** (payments scope PR S, `boards/scope-payments-2026-10-13.md` §5.8).
  `next.config.ts` sends, on every path, `Strict-Transport-Security` (one year, no `includeSubDomains`, no
  `preload`), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` and a `Permissions-Policy` that leaves the
  camera to this origin and denies microphone, geolocation, payment and USB (any directive not named keeps its default), all built in `src/lib/security/headers.ts`. The **Content-Security-Policy is REPORT-ONLY**
  and production-only: an enforced policy written blind would take the app down, so the reports
  (`POST /api/csp-report`, public in `src/proxy.ts`, logs a directive, an origin and a page path per violation and
  answers 204) are the measurement the enforced policy is written from. It allows what `src/` loads today (Scryfall art
  and symbols, Clerk's host read out of the publishable key, `'unsafe-inline'` until a nonce is wired through the proxy).
  Read the reports in the Vercel logs (`[csp]`) for a week before enforcing, and check Clerk's hosted pages, the
  service worker and the manifest on staging after any change to the policy.
  `rate_hits` counts hits per player, bucket (`card-detail`, `draw-fields`) and fixed window (`src/lib/rate/`), written
  by `observeHit` in `after()` behind `RATE_LIMIT_ENABLED` (a plumbing switch). **Observe-only**: it logs
  `[rate] would refuse ...` and refuses nothing; the limits are provisional until those logs say what a real reader does.
  Enforcing is a separate change. The table is purged with the account.

- **The admin Costs page and Anthropic's Admin API** (the admin cost-report plan,
  `docs/superpowers/plans/2026-10-17-admin-anthropic-cost-report.md`). `ANTHROPIC_ADMIN_KEY` is an Admin API key
  (`sk-ant-admin...`), set in Vercel on BOTH projects (`the-99` and `the-99-staging`), **Production scope** (staging's
  top-level deploys run with it; previews have no key and read `no_key`) and **Sensitive**, as `DATABASE_URL` and
  `CLERK_SECRET_KEY` are. It is read server-side only (`src/lib/admin/anthropic-cost.ts`, on `client-imports.test.ts`'s
  `SERVER_ONLY` list) and is never in a log, an error, a cache key or a payload. It reads three lists: the month's
  `cost_report` grouped by workspace (The 99, other workspaces and the org), the workspace list (to find the one
  unarchived workspace named The 99), and The 99's `api_keys` (name, redacted hint and status only). The figures are
  cached per five minutes (current month) or hour (past month), a failure is never cached and is held 60 seconds, and a
  failed key list leaves the figures standing. **Without the key the page degrades, never fails:** the workspace row
  reads this environment's ledger alone with the `no_key` reason, and the org row reads "not read", pointing at it. The two caps (`account_cap_usd`, The 99
  workspace; `org_cap_usd`, the org) are typed in on the page from Anthropic's console, because Spend Limits are
  Enterprise-only and cannot be read. Never put the key in `.env` (`scripts/lib/env.mjs` loads it with
  `override: true`); `pnpm probe:anthropic-cost` reads it from the shell. Find the reads with
  `vercel logs -p the-99 -q "[costs]"`: one line per read, `ok days=‹n› keys=‹n›` or `unread kind=‹k›`.

## Anonymous reads (launch epic F3 groundwork, PR 2)

`observeAnonymousHit(headers)` (`src/lib/rate/anon.ts`) is the visitor-keyed twin of `observeHit`, for the public card and commander pages. Nothing calls it until those routes exist, and it is called from the route (after the response, through `after()`), never from `proxy.ts`. Observe-only under `RATE_LIMIT_ENABLED`, resolved with `resolveSwitchEnv(null)` (a plumbing switch, so only the app-wide override applies; `requestSwitchEnv` would look up a fake user), every failure swallowed.

- Bucket `public-read`: 120 a minute, provisional. It counts ORIGIN hits, so a page the CDN serves from cache is not counted; limiting cached hits is the platform firewall's job.
- Key: `anon:` + the first 16 hex of SHA-256(network address, UTC day). The address is `x-real-ip`, else `x-vercel-forwarded-for`, else the first hop of `x-forwarded-for`; an IPv6 address is reduced to its /64; none readable shares `anon:unknown`. **It is pseudonymous, not unlinkable**: the IPv4 space is small enough to enumerate and no secret is used, so the privacy page must not claim anonymity. RETENTION is a sweep, not a timer: `recordHit` deletes every row older than `RETAIN_MS` (an hour) whenever it next runs, by anyone, so a row lives at least an hour and indefinitely if no hit ever follows. Say "deleted by the first count more than an hour later", never "kept for up to an hour". A time-based sweep (the account-sweep cron could run it) is the change that would make "up to an hour" true.
- `purgeAccount` deletes `rate_hits` by an account's id, which an `anon:` key never equals, so a visitor's rows are neither an account's data nor a purge's concern.

