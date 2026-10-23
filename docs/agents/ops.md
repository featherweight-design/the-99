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
- Key: `anon:` + the first 16 hex of SHA-256(network address, UTC day). The address is `x-real-ip`, else `x-vercel-forwarded-for`, else the first hop of `x-forwarded-for`; an IPv6 address is reduced to its /64; none readable shares `anon:unknown`. **It is pseudonymous, not unlinkable**: the IPv4 space is small enough to enumerate and no secret is used, so the privacy page must not claim anonymity. CLEANUP IS OPPORTUNISTIC AND WINDOW-BASED: a count deletes the same key's rows from earlier windows (a minute-window row can go within seconds) and every row, anyone's, older than the counting window's start minus `RETAIN_MS`, and a row stays if no count follows. There is no minimum or maximum age to promise. Say only that the hash is "held briefly in a request counter and cleared out as later requests are counted"; never "kept for up to an hour" or "deleted after an hour". A time-based sweep (the account-sweep cron could run it) is the change that would make a bound true.
- `purgeAccount` deletes `rate_hits` by an account's id, which an `anon:` key never equals, so a visitor's rows are neither an account's data nor a purge's concern.

## Clerk Backend calls on the server

A Clerk BACKEND call is a network round trip to Clerk's API: `currentUser()` and everything on `clerkClient()`. Measured on deployed staging (2026-10-18) as `/friends`'s `currentUser` span: 124-131 ms of a 180 ms page, before #2049 removed it for a returning reader. `auth()` is NOT one (it verifies the session token locally), nor is the browser's `useUser`. `src/lib/clerk-backend-calls.test.ts` lists every file that imports one, with its frequency and why the data lives only in Clerk, found by import; a new one is a reviewed diff to that table.

| Call | Where | Runs | Verdict |
|---|---|---|---|
| `currentUser()` | `/friends` page | missing or young profile only | fixed (#2049) |
| `currentUser()` | `ensureSenderProfile` (Home's Add a friend, link, QR and email invite actions) | missing or young profile only (this PR); was every press | fixed |
| `currentUser()` | `buyPackAction` | once per Buy press | keep: the VERIFIED primary email lives only in Clerk; Stripe's round trip dwarfs it |
| `clerkClient().users.*` | admin Accounts pages | per admin page | keep: emails and sign-in times live only in Clerk; admin only |
| `clerkClient().invitations.*` and `.users.getUserList` | `src/lib/invites/clerk.ts` | once per email invite | keep: Clerk owns invitations |


## Error monitoring (Sentry)

ERRORS ONLY: no tracing, no replay, no logs. `@sentry/nextjs` is pinned exactly (11.6.0, the newest release two weeks old at the time). One Sentry project, two environments (`staging`, `production`).

- **Dormant by construction.** `sentryOptions` (`src/lib/sentry/options.ts`) enables the SDK only when a DSN is set AND `*_SENTRY_ENVIRONMENT` names something other than `local`; an unset environment reads as `local`. A dev machine and a Preview deployment have neither variable, so they send nothing. No kill switch: unset the DSN and redeploy.
- **Where it runs.** `src/instrumentation.ts` (`register` loads `lib/sentry/init-server.ts` for Node and edge; `onRequestError = Sentry.captureRequestError` covers render, route handlers, Server Actions and the proxy), `src/instrumentation-client.ts` (browser), and `ErrorNotice` (a boundary reports a browser-side throw only; a server error carries a digest and was reported where it happened). Sentry 11 has no `sendDefaultPii`: `dataCollection` is set to all-off.
- **What leaves.** `scrubEvent` (`src/lib/sentry/scrub.ts`, pure, `scrub.test.ts`) removes the user, cookies, headers, request body and query string (a webhook's body and signature included), `extra`, the server name, and every exception MESSAGE (a client error's message can carry a card name, a deck name or a query; the type, stack and digest stay). Breadcrumbs are kept for navigation and clicks only, with query strings cut and a `/friend/<token>` or `/join/<token>` token replaced.
- **Handled errors.** A route that answers 500 itself never reaches `onRequestError`, so the stripe-webhook, clerk-webhook and both cron catch sites call `captureServerError(tag, error)` (`lib/sentry/capture.ts`): a fixed tag and the SQLSTATE, never the error's message. A new such site calls it too.
- **CSP.** The DSN's own ingest host is added to `connect-src` of the report-only policy (`sentryIngestHost`, from `NEXT_PUBLIC_SENTRY_DSN` at build time). No tunnel route.
- **Source maps** upload at build only when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` are all set, are deleted from the output afterwards, and are tagged with `VERCEL_GIT_COMMIT_SHA`.
- **Variables Hugh sets in Vercel, on BOTH projects, Production scope (Preview stays unset):**

| Variable | Value | Sensitive |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | the project DSN | OFF (inlined into the browser bundle; Sensitive breaks that) |
| `SENTRY_DSN` | the same DSN | ON |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `production` on the production project, `staging` on staging | OFF |
| `SENTRY_ENVIRONMENT` | the same | OFF |
| `SENTRY_ORG` | org slug | OFF |
| `SENTRY_PROJECT` | project slug | OFF |
| `SENTRY_AUTH_TOKEN` | org auth token, scopes `project:releases` and `org:read` | ON |

Never put any of them in `.env`.
