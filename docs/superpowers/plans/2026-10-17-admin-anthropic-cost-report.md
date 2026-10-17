# /admin Costs reads Anthropic's cost report (plan)

Ruled by the orchestrator 2026-10-17; the launch epic carries it as a note (`2026-10-17-launch-epic.md`, "Admin costs").
Admin-only surface. No About entry (admin-only, as every admin round). Two PRs, in order, not stacked.

## Goal

The Costs page's account row stops depending on a figure Hugh types. It reads Anthropic's Usage and Cost Admin API
for the month being viewed. It shows four things:
(a) the total of **The 99** workspace against the workspace cap;
(b) **this environment**, the app's own ledger (player plus system, as `costSummary` already sums it);
(c) **elsewhere**, the workspace total minus this environment's ledger, floored at 0 (the other environment, plus anything
else billed to that workspace). This replaces `elsewhere_usd`.
(d) **other workspaces**, the rest of the org (every other workspace plus the default workspace's `null` id), against the
org cap.

## Facts this plan rests on (checked 2026-10-17)

- `GET https://api.anthropic.com/v1/organizations/cost_report`, headers `x-api-key`, `anthropic-version: 2023-06-01`.
  Query `starting_at` (RFC 3339, required), `ending_at` (exclusive), `bucket_width=1d` (the only width), `group_by[]`
  (`workspace_id`, `description`), `limit` 1..31 (default 7), `page` = the previous `next_page`. Body
  `{ data: [{ starting_at, ending_at, results: [{ amount, currency, workspace_id, ... }] }], has_more, next_page }`.
  `amount` is a decimal string in CENTS. Empty days come back as buckets. Priority Tier is excluded. Data lags about
  5 minutes. The docs say to poll at most once a minute and to cache for dashboards. The default workspace is `workspace_id: null`.
- `GET https://api.anthropic.com/v1/organizations/workspaces` (docs page fetched today): query `after_id`, `before_id`,
  `limit` 1..1000 (default 20), `include_archived` (default false), `include_default` (default false). Body
  `{ data: [{ id, name, archived_at, ... }], has_more, first_id, last_id }`; the next page is `after_id = last_id`.
- `cost_report` is not in `@anthropic-ai/sdk@0.128.0`, and no admin call in the repo uses the SDK. Both reads are
  plain `fetch`, one code path, shaped like `src/lib/admin/github-variables.ts` (an injected `deps`, one fixed log
  line, the token only in a header).
- **Server-only pattern.** The repo does NOT use the `server-only` package (`src/lib/theme/server.ts` says why). The
  guard is `src/lib/client-imports.test.ts`'s `SERVER_ONLY` list, which already names `lib/admin/github-variables.ts`
  for `ADMIN_GITHUB_TOKEN`. The new module joins that list.
- **Cache.** Next is 16.3.8 and `cacheComponents` is NOT enabled (`next.config.ts`). `use cache` needs it, and
  turning it on would affect every route. `unstable_cache` is documented as replaced by `use cache`, but it is still
  shipped, and the repo uses it (`src/lib/cache/user-lists.ts`, with a `NotStored` throw so a value can be served
  without being filed). Read in `next/dist/server/web/spec-extension/unstable-cache.js`:
  - The key is `keyParts` plus the args plus `cb.toString()`.
  - A stale entry is served while a background revalidation runs.
  - A revalidation that throws keeps the stale entry, and `console.error`s the key and the thrown error.
  - A `fetch` inside the scope is treated as `force-no-store` (patch-fetch, `case 'unstable-cache'`).
- Stored settings today. Production: `account_cap_usd` $150, `system_ceiling_usd` $15, and `elsewhere_usd` $124.54
  (Oct, entered today). Staging: `account_cap_usd` $50 (stale), `system_ceiling_usd` $30. So production's "account
  cap" is already the workspace cap.

## Decisions

1. **`account_cap_usd` becomes the workspace cap in its label.** The key is unchanged, so no migration and no data
   moves. The row is relabeled "The 99 workspace cap", and the schema comment says so. Staging's $50 row is stale:
   Hugh re-enters $150 on staging (settings are per database, and the workspace is shared).
2. **A new stored setting `org_cap_usd` ($250)** with its own action, the same shape as `setAccountCap`. It is
   stored, not in code, because both caps are console values. The Spend Limits API is Enterprise-only, so neither cap
   can be read. This needs a migration that widens `admin_settings_key_check`. That is PR 2.
3. **`elsewhere_usd` is retired, and its data is left in place.** Nothing reads it or writes it any more:
   `setElsewhere`, the dialog's `elsewhere` kind, `dayOf`, and the copy keys all go. The rows (production's one Oct
   row) and their `admin_events` audit stay, and the key stays in the check constraint so those rows remain valid.
   No delete migration: dropping history is a separate call that nothing here needs. `settingsForMonth` stops
   returning it, and `SETTING_KEYS` drops it. The loader filters stored rows to known keys instead of casting.
4. **No fallback to a stored figure.** When the API cannot be read, elsewhere and other workspaces say why. They are
   never filled from `elsewhere_usd`.
5. **A failure is never cached.** It is thrown as `NotStored(kind)` and served unfiled, so the next load tries again.
   The page has one reader, so that is at most one call per page load, inside the docs' once-a-minute guidance in
   practice. A failed background revalidation keeps the last good entry. Its age shows in the as-of line, so stale data is never
   presented as fresh. `no_key` is decided BEFORE `unstable_cache` is entered, so local dev and previews never touch the
   cache or the network.
6. **The key never enters the cache.** It is read inside the loader from `process.env`. It is never in `keyParts`, never
   an argument, and never in `NotStored`, whose payload is the closed `kind` alone. That error object is the one
   `unstable_cache` logs.

## Error taxonomy (`CostUnread`)

| kind | when | fetch? | log |
|---|---|---|---|
| `no_key` | `ANTHROPIC_ADMIN_KEY` unset or blank | none | none (the key is optional) |
| `refused` | 401 or 403 from either endpoint | yes | `[admin] anthropic cost unread: refused` |
| `upstream` | 429, 5xx, a network error, a 5s timeout (`AbortSignal.timeout`), any other non-2xx | yes | `... upstream` |
| `shape` | a body off the documented shape, an `amount` that is not a decimal, a currency other than USD, more than `MAX_PAGES` (10) pages | yes | `... shape` |
| `no_workspace` | no unarchived workspace whose trimmed name equals `The 99`, ignoring case | yes | `... no_workspace` |
| `ambiguous_workspace` (`count`) | two or more such workspaces: never guess | yes | `... ambiguous_workspace` |

Each log line is ONE fixed string plus the kind. It carries no URL, header, status text, body or error message.
Nothing throws out of the loader: every path returns.

## Data flow

`page.tsx` (unchanged) calls `loadCosts(month, now)`. `loadCosts` runs, with `Promise.all`, the existing
repeatable-read transaction AND `cachedWorkspaceCost(month, now)`, outside the transaction. `costSummary(rows, ...)`
receives `rows.anthropic: WorkspaceCost` and computes the workspace block from the ledger it already sums.
`CostsView` draws it. Only figures and an ISO `asOf` cross into `CostSummary`: no workspace id, no key, and no upstream
text. `CostsView` is a server component, and the only client child, `SettingAction`, receives a kind and a label.

## Files and signatures

**`src/lib/admin/anthropic-cost-rule.ts`** (new, pure, client-safe; it imports only `costs-rule` types):
- `WORKSPACE_NAME = "The 99"`, `MAX_PAGES = 10`, `COST_REPORT_URL`, `WORKSPACES_URL`.
- `centsToMicro(amount: string): number | null`: exact string arithmetic, so that 1 cent = 10,000 micro-dollars
  (`"123.45"` gives 1,234,500, and `"0.00005"` rounds half up to 1). A leading `-` is allowed (a credit line). Anything
  but `/^-?\d+(\.\d+)?$/` gives null. No `parseFloat`.
- `reportWindow(month: MonthKey, now: Date): { startingAt: string; endingAt: string }`. `starting_at` is the month
  start. `ending_at` is the next month start, or for the current month the start of tomorrow UTC, whichever is earlier.
- `costReportUrl(w, page?: string): string`: `bucket_width=1d&group_by[]=workspace_id&limit=31` (no `description`
  grouping, so one page covers a month).
- `workspacesUrl(afterId?: string): string`: `limit=1000`, so a single page in practice.
- `parseCostPage(body: unknown): { rows: { workspaceId: string | null; micro: number }[]; hasMore: boolean; nextPage: string | null } | null`.
- `parseWorkspacePage(body: unknown): { items: { id: string; name: string; archived: boolean }[]; hasMore: boolean; lastId: string | null } | null`.
- `matchWorkspace(items, name = WORKSPACE_NAME): { ok: true; id: string } | { ok: false; kind: "no_workspace" } | { ok: false; kind: "ambiguous_workspace"; count: number }`. Archived items are skipped.
- `splitOrg(rows, workspaceId): { workspaceMicro: number; otherMicro: number; orgMicro: number }`. `null` ids and every
  other id are counted as other.
- `elsewhere(workspaceMicro: number, ledgerMicro: number): { micro: number; ledgerAhead: boolean }`, floored at 0.
- `type CostUnread = "no_key" | "refused" | "upstream" | "shape" | "no_workspace" | "ambiguous_workspace"`
- `type WorkspaceCost = { ok: true; asOf: string; workspaceMicro: number; otherMicro: number; orgMicro: number } | { ok: false; kind: CostUnread; count?: number }`

**`src/lib/admin/anthropic-cost.ts`** (new, SERVER-ONLY, added to `SERVER_ONLY` in `client-imports.test.ts`):
- `type AnthropicDeps = { key: string | undefined; fetch: typeof fetch; log: (line: string) => void; now: () => Date }`. The default reads `process.env.ANTHROPIC_ADMIN_KEY`.
- `readWorkspaceCost(month: MonthKey, now: Date, deps = defaultDeps()): Promise<WorkspaceCost>`. This read is not
  cached. It fetches both lists in parallel and follows `next_page` and `last_id` up to `MAX_PAGES`. Every request is
  `cache: "no-store"` and carries the header set `{ "x-api-key", "anthropic-version", "user-agent": "the-99-admin" }`.
- `UNREAD_LOG = "[admin] anthropic cost unread"`.

**`src/lib/admin/anthropic-cost-cache.ts`** (new, server-only through its import of the above). It is kept apart so
the probe can import `readWorkspaceCost` without `next/cache`.
- `cachedWorkspaceCost(month: MonthKey, now: Date, key = process.env.ANTHROPIC_ADMIN_KEY): Promise<WorkspaceCost>`.
  A blank key returns `{ ok: false, kind: "no_key" }` before any cache call. Otherwise it calls
  `unstable_cache(run, ["anthropic-cost", DEPLOYMENT_ID, monthParam(month), endingAt], { revalidate })`, where
  `revalidate` is 300 for the current month and 3600 for a past one (a closed month can still settle for a while). `run` throws
  `new NotStored(result)` on `ok: false` and the wrapper catches it and returns the result unstored (the
  `user-lists.ts` pattern; its own `NotStored` class, carrying only `{ ok: false, kind, count }`). `endingAt` is in the
  key so yesterday's current-month window is never served as today's beyond one stale read.

**Modified (PR 1):**
- `costs-rule.ts`:
  - `CostRows.anthropic: WorkspaceCost` is added.
  - `CostSummary.elsewhere` is removed, and `CostSummary.workspace` is added:
    `{ ledgerMicro, read: { ok: true; asOf; totalMicro; elsewhereMicro; ledgerAhead; otherMicro; orgMicro } | { ok: false; kind; count? } }`.
    `ledgerMicro` is `player.micro + systemSplit.total` (today's `accountTotal` without elsewhere; evals are still never in it).
  - `SETTING_KEYS` drops `elsewhere_usd`, and `settingsForMonth` stops reading it.
- `costs.ts`: `loadCosts` runs `cachedWorkspaceCost` beside the transaction, and filters setting rows to `SETTING_KEYS`.
- `costs-view.tsx`: the account row becomes the workspace row.
  - Its figure is the API total against the cap. Its segments are player, labels, rewrites, then elsewhere (hatched,
    `INK.elsewhere`). Its scale is `max(cap, total, ledger, 1)`.
  - Unread, the figure is the ledger alone plus `workspaceUnread`, with the bare track and the reason in the sub.
  - A new "Other workspaces" row (`CapRow` plus `CapBar`) draws the org total. In PR 1 there is no org cap, so the
    figure reads `notSet` over the bare track, the existing no-cap rule.
  - `CapRow` gains `source?: "code" | "here" | "anthropic"`, replacing `here?: boolean`.
  - The elsewhere `SettingAction` is removed.
- `setting-dialog.tsx`: the `elsewhere` kind, the as-of field and the `setElsewhere` import are removed.
- `src/app/admin/actions.ts`: `setElsewhere` and `dayOf` are removed.
- `src/lib/copy/admin.ts`: the strings below; `capSub.elsewhere`, `capSub.you`, `capSub.noElsewhere`, `enterElsewhere`,
  `updateElsewhere`, `setting.asOf` and `setting.badDate` are removed.
- `src/lib/client-imports.test.ts`: `SERVER_ONLY` gains `lib/admin/anthropic-cost.ts`.
- `docs/superpowers/design-tables/admin.md`: the Data sources rows (account cap and elsewhere become the cost report;
  the workspace cap).
- `scripts/probe-anthropic-cost.mts` (new), with `probe:anthropic-cost` in `package.json` and a `docs/probes.md` entry.
- `AGENTS.md`: one line in the ops cluster (`ANTHROPIC_ADMIN_KEY`, Production scope, Sensitive, both projects; the
  page degrades without it). Background goes in `docs/agents/ops.md`.

**PR 2 (org cap):** `src/db/schema.ts` (check constraint plus comment); a migration from `pnpm db:generate` (sql,
snapshot, journal); `costs-rule.ts` (`SETTING_KEYS` plus `org_cap_usd`, held like the account cap); `actions.ts`
(`setOrgCap`); `setting-dialog.tsx` (kind `org`); `costs-view.tsx` (the org row's cap and tick, and its
`SettingAction`); copy; and the tests.

## Proposed copy (`adminCopy.costs`, owed to /copy-review)

- `capSource.anthropic`: `from Anthropic`
- `capRows.workspace`: `The 99 workspace cap` (replaces `capRows.account`); `capRows.org`: `Anthropic org cap`
- `capSub.workspace`: `Mirrors Anthropic’s console. This environment’s ledger, then elsewhere hatched.`
- `capSub.elsewhere(v, other)`: ` Elsewhere ${v}: ${other} and anything else on this workspace.` (`other` is the other
  environment's name, from `adminEnvironment()`)
- `capSub.ledgerAhead`: ` This environment’s ledger reads more than the workspace bill, so elsewhere reads $0.`
- `capSub.org(here, others)`: `The 99 ${here}, other workspaces ${others} hatched, the default workspace included.`
- `asOf(time)`: ` Read from Anthropic at ${time}, about five minutes behind.` (`time` is `14:05 UTC`, or `17 Oct, 14:05 UTC` when not today)
- `workspaceUnread(figure)`: `${figure} here · workspace not read`
- `unread`:
  - `no_key`: `ANTHROPIC_ADMIN_KEY is not set here, so the workspace is not read.`
  - `refused`: `Anthropic refused the admin key.`
  - `upstream`: `Anthropic’s cost report did not answer. The next load tries again.`
  - `shape`: `Anthropic’s cost report came back in a shape this page does not read.`
  - `no_workspace(name)`: `No Anthropic workspace is named ${name}.`
  - `ambiguous(n, name)`: `${n} Anthropic workspaces are named ${name}, so none is read.`
- `capsReference`: `The system ceiling and the Anthropic caps are reference lines. None of them blocks a call.`
- PR 2: `changeOrgCap`: `Change the org cap`

## Design

**No Design round is needed.** Every element is already drawn:
- the workspace and org rows are `CapRow` plus `CapBar`;
- the hatched elsewhere segment and its ink are in the design table;
- the bare track for no cap or an unread figure is the existing rule;
- the source label, the as-of line and the reasons are text in existing slots.

One open question, with the build default stated: the org row's **other workspaces** segment ink. The default is to
reuse `INK.elsewhere` hatched, because both segments are spend this ledger cannot see, and The 99's segments draw as
in the workspace row. If Design wants a distinct ink, that is a token swap. `design-pipeline-status.md` lists the admin handoff Green (R2); nothing there blocks.

## Overlap with lane 9b (PII masking, `2026-10-17-admin-pii-masking.md`)

Both lanes touch `costs.ts` (9b changes `loadCosts` to take the masked universe) and `costs-view.tsx`. 9b's
`costs-view.tsx:315` target is the elsewhere "entered by" text, which PR 1 DELETES along with `capSub.you`. Whichever
lane lands second rebases. If this one lands first, 9b drops that hunk, since no cap row prints "entered by" after it.
`costs-detail.tsx` (9b's per-account table) is untouched here.

## Tests

- `anthropic-cost-rule.test.ts`:
  - `centsToMicro`: exact cases, half-up rounding, a negative amount, and refusals (`"1e3"`, `""`, `"1.2.3"`).
  - Summing: empty-day buckets; three workspaces plus a `null` id; ids split between this workspace and the rest.
  - `matchWorkspace` for 0, 1 and 2 matches, a case-insensitive and trimmed match, and an archived workspace skipped.
  - `elsewhere`: floored at 0, with `ledgerAhead`.
  - `reportWindow`: the current month, a past month, and the last day of a month.
  - The URLs: `group_by[]`, `limit` and `page` encoding.
- `anthropic-cost.test.ts`, with a mocked `fetch`:
  - A missing or blank key returns `no_key`, with `fetch` never called and nothing logged.
  - 401 and 403 give `refused`; 429, 500, a rejected fetch and an abort give `upstream`; a bad body and an 11th page
    give `shape`.
  - Two cost pages are followed with `page = next_page`, and workspaces with `after_id = last_id`.
  - 0 and 2 workspaces match.
  - **The key never escapes.** A sentinel key appears in no URL, in no `JSON.stringify(result)`, in no log line, and
    exactly once per request in the headers.
- `anthropic-cost-cache.test.ts`, with `next/cache` mocked:
  - `no_key` never calls `unstable_cache`.
  - The key parts are month, day and deployment, and never the key.
  - `revalidate` is 300 for the current month and 3600 for a past one.
  - A failure is returned unstored (`NotStored`), and the thrown object carries no key.
- `costs-rule.test.ts`: the workspace block for read and unread; an `elsewhere_usd` row is ignored; the ledger excludes evals.
- `costs-load.test.ts`: `loadCosts` hands the cached result through, and a cache rejection is still unread, not a throw.
- `costs-view.test.tsx`:
  - The workspace row reads `$x of $150` with `from Anthropic` and the as-of line, and has a hatched elsewhere
    segment.
  - Each `kind` renders its reason with the bare track.
  - The org row reads `not set` (PR 1), then with its cap (PR 2).
  - No `Enter elsewhere` control is drawn.
- `actions.test.ts`: the `setElsewhere` cases are removed. PR 2 adds `setOrgCap`, covering an accepted amount, a
  refused one, and the audit row.
- `client-imports.test.ts`: the list entry. **Run the failure path once:** a scratch `"use client"` fixture importing
  `anthropic-cost-cache.ts` must fail the test before the fixture is deleted.

## PR boundaries

- **PR 1, "Costs reads Anthropic's cost report"** (about 20 files): the new rule, loader, cache and their tests;
  `costs-rule`, `costs`, `costs-view`, `setting-dialog`, `actions` and `copy` with their tests; `client-imports.test.ts`;
  the probe, `package.json` and `docs/probes.md`; the design table; `AGENTS.md` and `docs/agents/ops.md`. It is
  complete on its own: the org row draws `not set`.
- Each PR is a UI PR: the design-review property table (Costs rows of `design-tables/admin.md`) before `gh pr create`,
  and `feature-acceptance` at 900 and 390 on `/admin` (current and a past month), with the unread state photographed too.
- **PR 2, "Org cap setting"** (about 10 files): the migration and the action, dialog, view and copy for `org_cap_usd`.
  Opened after PR 1 merges.

## Not in scope

- The usage report (tokens), `group_by[]=description` per-model breakdowns, and reconciling the ledger against the
  bill per model.
- Alerts and thresholds.
- Reading Spend Limits (Enterprise-only).
- Deleting `elsewhere_usd` rows.
- Enabling `cacheComponents` or migrating `unstable_cache` to `use cache` app-wide.
- Masking (lane 9b).
- Priority Tier spend, which the cost endpoint excludes.

## Verification (the key is never printed)

1. **Locally, with no key** (`pnpm dev` on local-dev): `/admin` renders. The workspace row reads `‹ledger› here ·
   workspace not read` with the `no_key` reason, and no request leaves for `api.anthropic.com` (check the server log
   and a fetch spy in the test). This also covers previews, which have no key (Production scope only). The admin
   itself exists on a preview only if `ADMIN_ENV_LABEL` is set there.
2. **The probe**, `pnpm probe:anthropic-cost [YYYY-MM]`. It reads `ANTHROPIC_ADMIN_KEY` through the `scripts/lib/env.mjs`
   convention, calls `readWorkspaceCost`, and prints ONLY the month, `ok`/`kind`, the match count and the three
   figures in dollars. It prints no ids, headers or bodies, and it touches no database. The key is Sensitive in Vercel,
   so `vercel env pull` cannot fetch it. Hugh runs the probe locally with the key typed into his shell for that one
   command (`read -s` then a prefixed run, never a file), or skips the probe in favor of step 3.
3. **Staging, after PR 1 merges** (both projects' top-level deploys run with Production scope, so staging has the key):
   - Re-enter the workspace cap at $150 on staging.
   - Load `staging.the-99.dev/admin`. The workspace total should match the console's Cost page filtered to The 99 for
     the month, to the cent, allowing for the 5-minute lag.
   - Elsewhere should equal the total minus staging's ledger, and Other workspaces should match the rest of the
     console.
   - Reload within 5 minutes: the as-of line does not move (cached).
   - Step to September: the page renders past-month figures, or an honest unread reason if the API refuses that range.
   - `vercel logs -p the-99-staging -q "anthropic cost"` shows no lines on success.
4. **Production** after the deploy, the same read, with the org cap entered after PR 2.

## Open questions

1. The org row's "other workspaces" ink. The default is `INK.elsewhere` hatched (above); this is for Design or Hugh.
2. How far back `cost_report` serves history is not documented. Step 3 confirms it. If an early month is refused, the
   page shows `upstream`, or `shape`. No new state is planned.
3. Whether the stale staging `account_cap_usd` ($50) was meant as a staging-only cap. The plan assumes not, since there
   is one shared workspace, and Hugh re-enters $150.
