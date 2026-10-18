# /admin Costs reads Anthropic's cost report (plan)

Ruled by the orchestrator 2026-10-17 and approved after an independent review; the launch epic carries it as a note
(`2026-10-17-launch-epic.md`, "Admin costs"). Admin-only surface. No About entry (admin-only, as every admin round).
Two PRs, in order, not stacked.

## Goal

The Costs page's account row stops depending on a figure Hugh types. It reads Anthropic's Usage and Cost Admin API
for the month being viewed. It shows:
(a) the total of **The 99** workspace against the workspace cap;
(b) **this environment**, the app's own ledger (player plus system, as `costSummary` already sums it);
(c) **elsewhere**, the workspace total minus this environment's ledger, floored at 0. That is the other environment
and anything else billed to that workspace (see "What elsewhere contains"). It replaces `elsewhere_usd`.
(d) **other workspaces** (PR 2), the rest of the org (every other workspace plus the default workspace's `null` id),
against the org cap.
(e) **The 99's API keys** (PR 2): name, partial hint and status only, so Hugh can see which keys bill to the workspace.

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

- `GET https://api.anthropic.com/v1/organizations/api_keys` (docs page fetched today, used in PR 2).
  - **Query:** `after_id`, `before_id`, `limit` 1..1000 (default 20), `status`
    (`active` | `archived` | `expired` | `inactive`), `workspace_id`, `created_by_user_id`.
  - **Item:** `id`, `name`, `partial_key_hint` (string or null; "partially redacted"), `status`,
    `scope` (`{type:"workspace", workspace_id}` | `{type:"organization"}`), the deprecated `workspace_id`,
    `created_at`, `created_by`, `expires_at` and `principal`.
  - **Page:** `has_more`, `first_id`, `last_id`; the next page is `after_id = last_id`.
  - **Use:** the plan reads `name`, `partial_key_hint`, `status` and `scope` only.
- The ledger's dollars are priced by the app from `src/lib/model/prices.ts`, not read from Anthropic's bill.
- `ANTHROPIC_API_KEY` is read by four GitHub workflows: `card-labels.yml`, `commander-prose.yml`,
  `commander-index.yml` and `tuning-contract.yml`. Evals run from a laptop key.

## Decisions

1. **`account_cap_usd` becomes the workspace cap in its label.**
   - The key is unchanged, so no migration and no data moves.
   - The row is relabeled "The 99 workspace cap", and `schema.ts`'s settings comment says so (PR 1).
   - Staging's $50 row is stale. Setting $150 there is Hugh's call, made on the page. No database write is planned.
2. **A new stored setting `org_cap_usd` ($250)**, with its own action shaped like `setAccountCap`.
   - It is stored rather than written in code, because both caps are console values. The Spend Limits API is
     Enterprise-only, so neither cap can be read.
   - It needs a migration that widens `admin_settings_key_check`. That is PR 2.
3. **`elsewhere_usd` is retired, and its data is left in place.**
   - PR 1 stops READING it: `settingsForMonth`, the view, and the view's "Enter elsewhere" control.
   - PR 2 removes the WRITER: `setElsewhere`, `dayOf`, the dialog's `elsewhere` kind, `setting.asOf`,
     `setting.badDate`, and the key in `SETTING_KEYS`. These are the same files PR 2 already opens for the org cap.
     Until then the action has no caller on the page, for one PR's life.
   - The rows (production's one Oct row) and their `admin_events` audit stay. The key also stays in the check
     constraint so those rows remain valid.
   - There is no delete migration and no fallback to the stored figure.
4. **A failure is never served as data.**
   - It is thrown as `NotStored(kind)` and returned unfiled.
   - A module-level **negative memo** holds each failure for 60s, keyed by month (M3). A load inside that window gets
     the same unread `kind` back without a fetch, so a broken key or a down API costs at most one call a minute per
     instance. That matches the docs' once-a-minute guidance.
   - The memo stores only `{ kind, count, until }`. It is never consulted for figures, and never for `no_key`.
   - `no_key` is decided BEFORE `unstable_cache` and the memo, so local dev and previews touch neither the cache nor
     the network.
5. **The key never enters the cache.**
   - It is read inside the loader from `process.env`.
   - It is never in `keyParts`, never an argument, and never in `NotStored`. `NotStored`'s payload is the closed
     `kind` alone, and it is the error object `unstable_cache` logs.
6. **The two figures in elsewhere are read close together (H1).**
   - The current month's cache key carries a five-minute bucket, `Math.floor(now / 300_000)`, so a cached total is
     never more than one bucket older than the live ledger it is subtracted from.
   - The remaining gap is the API's own ~5 minute lag and the ledger's pricing (decision 7). `ledgerAhead` is
     therefore raised only when the ledger exceeds the workspace by MORE than a tolerance:
     `max(1% of the workspace total, $0.05)`. It applies in every month, past ones included.
   - Inside the tolerance, elsewhere simply reads $0, with no remark.
7. **What elsewhere contains (H2).** It is the workspace bill minus THIS environment's ledger, so it holds:
   - the other environment's spend;
   - any other key billed to The 99. Candidates are GitHub's `ANTHROPIC_API_KEY`, which drives the four workflows
     above, and the eval laptop key;
   - the difference between the bill and the ledger's own pricing. The ledger is priced from
     `src/lib/model/prices.ts`, so a run recorded with a null cost, or a price that has drifted from Anthropic's,
     lands in elsewhere.

   There is one wrinkle in the workflows. Label batches and prose runs are recorded in STAGING's tables
   (`card_label_batches`, system `model_calls`), so staging's ledger already counts them. If GitHub's key is NOT on
   The 99, staging's ledger overstates what The 99 bills, and staging's elsewhere reads low. Which keys sit on The 99
   is what (e) shows. The orchestrator is confirming it.

   Evals are NOT subtracted from elsewhere. That changes only once their key is shown to be on The 99, which is a
   later decision and is not built here. The copy names elsewhere as "the other environment and anything else on
   this workspace", and never claims more.

## Error taxonomy (`CostUnread`)

| kind | when | fetch? | log |
|---|---|---|---|
| `no_key` | `ANTHROPIC_ADMIN_KEY` unset or blank | none | none (the key is optional) |
| `refused` | 401 or 403 from any endpoint | yes | `[admin] anthropic cost unread: refused` |
| `rejected` | 400, 404 or 422: the request itself was refused (a bad window, a removed endpoint) | yes | `... rejected` |
| `upstream` | 429, 5xx, any other non-2xx, a network error, or the shared 8s timeout | yes | `... upstream` |
| `shape` | a body off the documented shape, an `amount` that is not a decimal, a currency other than USD, more than `MAX_PAGES` (10) pages | yes | `... shape` |
| `no_workspace` | no unarchived workspace whose trimmed name equals `The 99`, ignoring case | yes | `... no_workspace` |
| `ambiguous_workspace` (`count`) | two or more such workspaces: never guess | yes | `... ambiguous_workspace` |

- Each log line is ONE fixed string plus the kind. It carries no URL, header, status text, body or error message.
- Nothing throws out of the loader: every path returns.
- **One timeout per read (M2):** a single `AbortSignal.timeout(8000)` is created per `readWorkspaceCost` call and
  passed to every request in it (both lists, every page, and PR 2's key list).
- **A future `ending_at` (M1):** the current month clamps `ending_at` to `now`, rounded down to the minute, never a
  future instant. If the probe shows the API also refuses a clamped end, the request omits `ending_at` for the current
  month. The probe settles which before merge.

## Data flow

1. `page.tsx` (unchanged) calls `loadCosts(month, now)`.
2. `loadCosts` runs, with `Promise.all`, the existing repeatable-read transaction AND `cachedWorkspaceCost(month, now)`,
   which sits outside the transaction.
3. `costSummary(rows, ...)` receives `rows.anthropic: WorkspaceCost` and computes the workspace block from the ledger
   it already sums.
4. `CostsView` draws it.

Only figures and an ISO `asOf` cross into `CostSummary`, plus PR 2's key rows. No workspace or key id, no key, and no
upstream text cross. `CostsView` is a server component, and its only client child, `SettingAction`, receives a kind
and a label.

## Files and signatures

**`src/lib/admin/anthropic-cost-rule.ts`** (new, pure, client-safe; it imports only `costs-rule` types):
- `WORKSPACE_NAME = "The 99"`, `MAX_PAGES = 10`, `COST_REPORT_URL`, `WORKSPACES_URL`, `LEDGER_AHEAD_FLOOR_MICRO = 50_000`.
- `centsToMicro(amount: string): number | null` (L1).
  - The amount is parsed by string arithmetic into exact hundred-thousandths of a cent. No `parseFloat`.
  - Anything but `/^-?\d+(\.\d+)?$/` gives null. A leading `-` is allowed (a credit line).
  - It is converted to micro-dollars once, with **half away from zero**: `"0.00005"` gives 1 and `"-0.00005"` gives -1.
    1 cent is 10,000 micro.
- `sumCents(rows): ...`: sums the exact cent amounts per workspace FIRST, then rounds once per workspace. A month of
  sub-micro lines is never rounded line by line.
- `reportWindow(month: MonthKey, now: Date): { startingAt: string; endingAt: string | null }`.
  - `starting_at` is the month start.
  - `ending_at` is the next month start for a past month. For the current month it is `now`, floored to the minute,
    or `null` (omitted) if the probe shows that is refused (M1).
- `costReportUrl(w, page?: string): string`: `bucket_width=1d&group_by[]=workspace_id&limit=31`.
- `workspacesUrl(afterId?: string): string`: `limit=1000`. It **never** sends `include_archived=true` (L5).
- `parseCostPage(body: unknown): { rows: { workspaceId: string | null; cents: Exact }[]; hasMore: boolean; nextPage: string | null } | null`.
- `parseWorkspacePage(body: unknown): { items: { id: string; name: string; archived: boolean }[]; hasMore: boolean; lastId: string | null } | null`.
- `matchWorkspace(items, name = WORKSPACE_NAME): { ok: true; id: string } | { ok: false; kind: "no_workspace" } | { ok: false; kind: "ambiguous_workspace"; count: number }`.
  It skips any item with `archived_at` set, even though the API omits archived workspaces by default (L5).
- `workspaceMicro(rows, workspaceId): number` (PR 1). PR 2 widens this to
  `splitOrg(...): { workspaceMicro; otherMicro; orgMicro }`.
- `elsewhere(workspaceMicro: number, ledgerMicro: number): { micro: number; ledgerAhead: boolean }`.
  - It is floored at 0.
  - `ledgerAhead` is set when `ledger − workspace > max(round(workspace / 100), LEDGER_AHEAD_FLOOR_MICRO)` (decision 6).
- `type CostUnread = "no_key" | "refused" | "rejected" | "upstream" | "shape" | "no_workspace" | "ambiguous_workspace"`
- `type WorkspaceCost = { ok: true; asOf: string; workspaceMicro: number } | { ok: false; kind: CostUnread; count?: number }`
  - PR 2 adds `otherMicro`, `orgMicro` and `keys`.

**`src/lib/admin/anthropic-cost.ts`** (new, SERVER-ONLY, added to `SERVER_ONLY` in `client-imports.test.ts`). The
cache wrapper lives here too (M4). The probe imports this module but calls only the uncached read.
- `type AnthropicDeps = { key: string | undefined; fetch: typeof fetch; log: (line: string) => void; now: () => Date }`.
  The default reads `process.env.ANTHROPIC_ADMIN_KEY`.
- `readWorkspaceCost(month: MonthKey, now: Date, deps = defaultDeps()): Promise<WorkspaceCost>`.
  - This read is NOT cached.
  - It fetches the two lists in parallel, under one shared `AbortSignal.timeout(8000)`.
  - It follows `next_page` and `last_id` up to `MAX_PAGES`.
  - Every request is `cache: "no-store"` and carries `{ "x-api-key", "anthropic-version": "2023-06-01", "user-agent": "the-99-admin" }`.
- `cachedWorkspaceCost(month: MonthKey, now: Date, deps?): Promise<WorkspaceCost>`. In order:
  1. A blank key returns `no_key`.
  2. A live negative-memo entry for the month returns its unread `kind`.
  3. Otherwise it calls
     `unstable_cache(run, ["anthropic-cost", DEPLOYMENT_ID, monthParam(month), String(Math.floor(now / (current ? 300_000 : 3_600_000)))], { revalidate })`.
     `revalidate` is 300 for the current month and 3600 for a past one (a closed month can still settle).
  4. `run` throws `new NotStored(result)` on `ok: false`. The wrapper catches it, writes the memo, and returns the
     result unstored. This is the `user-lists.ts` pattern with its own `NotStored`, which carries only
     `{ ok: false, kind, count }`.
- `COST_LOG = "[costs] anthropic cost_report"` (one line per read: `unread kind=<k> [status=<n>]` or `ok days=<n>`); `NEGATIVE_MEMO_MS = 60_000`.

**Modified in PR 1:**
- `costs-rule.ts`:
  - `CostRows.anthropic: WorkspaceCost` is added.
  - `CostSummary.elsewhere` is removed, and
    `CostSummary.workspace: { ledgerMicro, read: { ok: true; asOf; totalMicro; elsewhereMicro; ledgerAhead } | { ok: false; kind; count? } }`
    is added.
  - `ledgerMicro` is `player.micro + systemSplit.total` (evals are never in it; decision 7).
  - `settingsForMonth` stops returning `elsewhere_usd`. `SETTING_KEYS` keeps it until PR 2 removes the writer.
- `costs.ts`: `loadCosts` runs `cachedWorkspaceCost` beside the transaction. A rejection is still mapped to `upstream`
  rather than thrown.
- `costs-view.tsx`: the account row becomes the workspace row.
  - **Figure:** the API total against the cap.
  - **Segments:** player, labels, rewrites, then elsewhere (hatched, `INK.elsewhere`).
  - **Scale:** `max(cap, total, ledger, 1)`.
  - **Unread:** the ledger alone plus `workspaceUnread`, with the bare track and the reason in the sub.
  - `CapRow` gains `source?: "code" | "here" | "anthropic"`, replacing `here?: boolean`.
  - The elsewhere `SettingAction` is removed. No "Other workspaces" row yet (M4).
- `src/lib/copy/admin.ts`: the PR 1 strings below are added. `capSub.elsewhere`, `capSub.you`, `capSub.noElsewhere`,
  `enterElsewhere` and `updateElsewhere` are removed.
- `src/db/schema.ts`: comments only (L4). The `admin_settings` comment is changed so that `account_cap_usd` is the
  The 99 workspace cap, and `elsewhere_usd` is retired with its rows kept. No constraint change in PR 1.
- `src/lib/client-imports.test.ts`: `SERVER_ONLY` gains `lib/admin/anthropic-cost.ts`.
- `docs/superpowers/design-tables/admin.md`: the Data sources rows.
- `scripts/probe-anthropic-cost.mts` (new), `package.json` (`probe:anthropic-cost`) and `docs/probes.md`.

**PR 2 (org cap, keys, and retiring the writer):**
- **Schema:** `src/db/schema.ts` (the check constraint gains `org_cap_usd`, keeping `elsewhere_usd`), and a migration
  from `pnpm db:generate` (sql, snapshot and journal).
- **Settings:** `costs-rule.ts` (`SETTING_KEYS` drops `elsewhere_usd` and adds `org_cap_usd`, held like the account
  cap), `actions.ts` (`setOrgCap`, minus `setElsewhere`/`dayOf`), `setting-dialog.tsx` (kind `org`, minus `elsewhere`).
- **Workspace read:** `anthropic-cost-rule.ts`, with `splitOrg` and a key rule:
  - `parseKeyPage(body)` and `keyRows(items): { name: string; hint: string | null; status: "active" | "other"; statusWord: string }[]`.
  - Only `name`, `partial_key_hint` and `status` survive. The `id`, `created_by`, `principal` and `scope` fields are
    dropped at the parse.
- **Workspace read:** `anthropic-cost.ts` adds a third request, `GET /v1/organizations/api_keys?workspace_id=<id>&limit=1000`.
  - It is paged by `after_id = last_id`, under the same shared timeout and inside the same cached read.
  - Its rows are also checked against `scope.workspace_id`.
  - A failed key read leaves the figures standing: `keys: { ok: false, kind }`.
- **View:** `costs-view.tsx` gains:
  - the "Anthropic org cap" row (`CapRow` plus `CapBar`). Its segments are The 99's own, then other workspaces in
    `INK.elsewhere` hatched (the ruled ink). Its tick is the org cap, plus a `SettingAction`.
  - a "Keys on The 99" list under the caps: each key's name, hint, and `active` or its other status word.
- **Copy, docs and tests:** the copy; `AGENTS.md` (one ops line: `ANTHROPIC_ADMIN_KEY`, Production scope, Sensitive,
  both projects, degrades without it) and `docs/agents/ops.md`; the design table's org and keys rows; and the tests.

## Proposed copy (`adminCopy.costs`, owed to /copy-review)

**PR 1:**
- `capSource.anthropic`: `from Anthropic`
- `capRows.workspace`: `The 99 workspace cap` (replaces `capRows.account`)
- `capSub.workspace`: `Mirrors Anthropic’s console. This environment’s ledger, then elsewhere hatched.`
- `capSub.elsewhere(v)`: ` Elsewhere ${v}: the other environment and anything else on this workspace.`
- `capSub.ledgerAhead`: ` This environment’s ledger reads more than the workspace bill, so elsewhere reads $0.`
- `asOf(time)`: ` Read from Anthropic at ${time}, about five minutes behind.` (`time` is `14:05 UTC`, or `17 Oct, 14:05 UTC` when not today)
- `workspaceUnread(figure)`: `${figure} here · workspace not read`
- `unread`:
  - `no_key`: `ANTHROPIC_ADMIN_KEY is not set here, so the workspace is not read.`
  - `refused`: `Anthropic refused the admin key.`
  - `rejected`: `Anthropic refused the request for this month.`
  - `upstream`: `Anthropic’s cost report did not answer. A load a minute from now tries again.`
  - `shape`: `Anthropic’s cost report came back in a shape this page does not read.`
  - `no_workspace(name)`: `No Anthropic workspace is named ${name}.`
  - `ambiguous(n, name)`: `${n} Anthropic workspaces are named ${name}, so none is read.`
- `capsReference`: `The system ceiling and the Anthropic caps are reference lines. None of them blocks a call.`

**PR 2:**
- `capRows.org`: `Anthropic org cap`
- `capSub.org(here, others)`: `The 99 ${here}, other workspaces ${others} hatched, the default workspace included.`
- `changeOrgCap`: `Change the org cap`
- `keys.title`: `Keys on The 99`
- `keys.meta`: `name and hint only`
- `keys.none`: `No keys on this workspace.`
- `keys.unread`: `The key list was not read.`

## Design

**PR 1 needs no Design round.** Every element is already drawn:
- the workspace row is `CapRow` plus `CapBar`;
- the hatched elsewhere segment and its ink are in the design table;
- the bare track for an unread figure is the existing no-cap rule;
- the source label, the as-of line and the reasons are text in existing slots.

**PR 2's org row** reuses the same row. Its ink is ruled: `INK.elsewhere` hatched.

**PR 2's key list is the one new element.** The build default is the detail tables' existing row-card shape
(`SectionHead` plus rows, as in `costs-detail.tsx`), drawn the same at 900 and 390. It is an open question whether
Design wants to draw it. Admin-only, so it is not blocking.

`design-pipeline-status.md` lists the admin handoff Green (R2).

## Overlap with lane 9b (PII masking, `2026-10-17-admin-pii-masking.md`)

Both lanes touch `costs.ts` (9b changes `loadCosts` to take the masked universe) and `costs-view.tsx`.
- 9b's `costs-view.tsx:315` target is the elsewhere "entered by" text, which PR 1 DELETES along with `capSub.you`.
- Whichever lane lands second rebases. If this one lands first, 9b drops that hunk.
- `costs-detail.tsx` (9b's per-account table) is untouched here.
- The keys list shows key names, not people, so it needs no mask.

## Tests

**PR 1:**
- `anthropic-cost-rule.test.ts`:
  - `centsToMicro`: exact cases; half away from zero (`"0.00005"` gives 1, `"-0.00005"` gives -1); refusals (`"1e3"`,
    `""`, `"1.2.3"`).
  - Sum-then-round: 31 lines of `"0.00004"` give 12, not 0.
  - Empty-day buckets, several workspaces and a `null` id.
  - `matchWorkspace` for 0, 1 and 2 matches, a case-insensitive and trimmed match, and an archived item skipped.
  - `elsewhere`: floored at 0. `ledgerAhead` is false at exactly the tolerance and true one micro past it, at both the
    1% and the $0.05 branch.
  - `reportWindow`: the current month clamps to the floored minute; a past month; the last day of a month.
  - The URLs: `group_by[]`, `limit`, `page`, and no `include_archived`.
- `anthropic-cost.test.ts`, with `fetch` mocked:
  - A missing or blank key returns `no_key`, with `fetch` never called, nothing logged, and `unstable_cache` never
    called.
  - Status codes: 401 and 403 give `refused`; 400, 404 and 422 give `rejected`; 429, 500, a rejected fetch and an
    abort give `upstream`; a bad body and an 11th page give `shape`.
  - Every request in one read receives the SAME signal.
  - Pages are followed: `page = next_page` for the cost report and `after_id = last_id` for workspaces.
  - 0 and 2 workspaces match.
  - **The key never escapes.** A sentinel key appears in no URL, no `JSON.stringify(result)`, no log line and no
    `NotStored`, and exactly once per request in the headers.
  - **The cache:** the key parts are deployment, month and the five-minute bucket (an hourly one for a past month, so an expired figure is a foreground miss), and
    never the key. `revalidate` is 300 or 3600.
  - **The memo:** a failure is returned unstored. A second call inside 60s returns the same kind with no fetch. A call
    at 61s fetches again. A success is never memoized as a failure, and the memo never answers with figures.
  - **No route opt-outs (L3):** read through `node:fs`, no file under `src/app/admin/` exports `dynamic` or
    `fetchCache`, so no route segment overrides the fetch or cache behavior this read assumes.
- `costs-rule.test.ts`: the workspace block, read and unread; an `elsewhere_usd` row is ignored; the ledger excludes evals.
- `costs-load.test.ts`: `loadCosts` hands the cached result through, and a rejection becomes `upstream`, not a throw.
- `costs-view.test.tsx`:
  - The workspace row reads `$x of $150`, with `from Anthropic`, the as-of line and a hatched elsewhere segment.
  - Each `kind` renders its reason with the bare track.
  - There is no `Enter elsewhere` control and no org row.
- `client-imports.test.ts`: the list entry. **Run the failure path once:** a scratch `"use client"` fixture importing
  `anthropic-cost.ts` must fail the test before the fixture is deleted.

**PR 2:**
- `splitOrg`.
- `keyRows`: only `name`, `hint` and `status` survive; an `id` or a `created_by` in the input appears nowhere in the
  output.
- The key list is paged, and a failed key read leaves the figures standing.
- `setOrgCap`: an accepted amount, a refused one, and the audit row.
- `setElsewhere`'s cases are removed.
- The view: the org row with and without a cap, and the key list's three states (rows, none, unread).
- A migration snapshot check.

## PR boundaries

- **PR 1, "Costs reads Anthropic's cost report"**, 17 files:
  1. `anthropic-cost-rule.ts`
  2. its test
  3. `anthropic-cost.ts`
  4. its test
  5. `costs-rule.ts`
  6. its test
  7. `costs.ts`
  8. `costs-load.test.ts`
  9. `costs-view.tsx`
  10. its test
  11. `copy/admin.ts`
  12. `schema.ts` (comments)
  13. `client-imports.test.ts`
  14. `scripts/probe-anthropic-cost.mts`
  15. `package.json`
  16. `docs/probes.md`
  17. `design-tables/admin.md`

  `setting-dialog.tsx`, `actions.ts` and `actions.test.ts` move to PR 2 (decision 3); `AGENTS.md` and `ops.md` move
  to PR 2. **Merge gate: the probe has run against the live API** (M1) and its output, figures only, is in the PR
  body.
- **PR 2, "Org cap, keys on The 99, Elsewhere retired"**, about 19 files: the four `actions`/`dialog`/schema/migration
  groups above, the rule, the loader, the view and copy, the docs, and their tests. Opened after PR 1 merges.
- Each PR is a UI PR:
  - the design-review property table (the Costs rows of `design-tables/admin.md`) before `gh pr create`;
  - `feature-acceptance` at 900 and 390 on `/admin`, current and a past month, with the unread state photographed too.

## Not in scope

- The usage report (tokens), `group_by[]=description` per-model breakdowns, and reconciling ledger against bill per
  model.
- Subtracting evals from elsewhere (a later decision, decision 7).
- Alerts and thresholds.
- Reading Spend Limits (Enterprise-only).
- Deleting `elsewhere_usd` rows.
- Any database write of the staging cap: it is Hugh's to set.
- Enabling `cacheComponents` or `use cache`.
- Masking (lane 9b).
- Priority Tier spend.

## Verification (the key is never printed)

1. **Locally, with no key.** `/admin` renders, and the workspace row reads `‹ledger› here · workspace not read` with
   the `no_key` reason. No request leaves for `api.anthropic.com`. This also covers previews, which have no key
   (Production scope only).
2. **The probe, MANDATORY before PR 1 merges.**
   - **Run:** `pnpm probe:anthropic-cost [YYYY-MM]` calls `readWorkspaceCost` and touches no database.
   - **Output:** only the month, `ok` or the kind, the match count, the window it sent (whether `ending_at` was sent
     or omitted) and the figures in dollars. It prints no ids, headers or bodies.
   - **No key:** it prints `no_key: ANTHROPIC_ADMIN_KEY is not set in this shell` plainly and exits 1 (L2).
   - **Never put `ANTHROPIC_ADMIN_KEY` in `.env`** (L2). `scripts/lib/env.mjs` loads `.env` with `override: true`, so
     a value there would silently win over the shell's, and a file is a place a key can leak from. The probe's header
     and `docs/probes.md` both say so.
   - **Where it runs:** the key is Sensitive in Vercel, so `vercel env pull` cannot fetch it. Hugh runs the probe
     locally with the key typed for that one command (`read -s`, then a prefixed run).
   - **What it settles:** the run also answers the clamped-`ending_at` question (M1) and how far back history goes,
     with one current and one earlier month.
3. **Staging, after PR 1 merges** (staging's top-level deploys run with Production scope, so staging has the key):
   - Load `staging.the-99.dev/admin`. The total should match the console's Cost page for The 99 to the cent, allowing
     for the lag.
   - Elsewhere should equal the total minus staging's ledger.
   - A reload inside the same five-minute bucket keeps the as-of time.
   - Step to September.
   - `vercel logs -p the-99-staging -q "anthropic cost"` is empty on success.
4. **Production** after the deploy. After PR 2: the org row, and the key list read against the console's API keys
   page.

## Open questions

1. Whether Design wants to draw PR 2's key list. The default is the detail tables' row-card shape.
2. Which keys bill to The 99: GitHub's `ANTHROPIC_API_KEY` and the eval laptop key. The orchestrator is confirming,
   and PR 2's key list shows it. It decides whether staging's elsewhere reads low (decision 7) and, later, whether
   evals are subtracted.
3. Whether a clamped current-month `ending_at` is accepted, and how far back `cost_report` serves. The mandatory probe
   settles both before merge.
