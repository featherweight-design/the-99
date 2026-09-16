# Navigation caching — implementation plan (PRs 1–6)

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** stop every forward navigation refetching data that has not changed, and prove it with a
committed benchmark that is taken before, during and after.

**Architecture:** adopt Next 16 Cache Components incrementally — enable the flag, opt every route
out of validation with the codemod, then convert routes one at a time. `cacheForUser` stays (it is
the only layer that helps a *first* visit); `'use cache: private'` is added on top of the
**route-specific loaders** for the revisit. Every converted route carries a client invalidation
story, because `<Activity>` keeps hidden routes mounted.

**Tech Stack:** Next 16.3.4 (App Router, Cache Components), React 19, Playwright probes, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-16-navigation-performance-design.md` (merged, PR #687).

## Global Constraints

- **Next 16.3.4.** Every Cache Components API claim is checked against
  `node_modules/next/dist/docs/` at implementation time, never from memory. A past subagent got this
  exact topic wrong in both directions.
- **Production build for every measurement.** `pnpm build && pnpm start --port <free>`, warmed
  twice. A figure from `next dev` or a cold server is not comparable and does not enter the history.
- **Pre-push gate, every push:** `pnpm typecheck && pnpm lint && pnpm test`, plus
  `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`, then
  `git fetch origin && git rebase origin/main`.
- **Probes point at `local-dev`, never production.** Fixture account is `E2E_AUDIT_USER_EMAIL`;
  secrets are read through `scripts/lib/env.mjs` (`requireEnv`), never `process.env` directly.
- **Browser scripts reach page content through `scripts/lib/surface.mjs`** — `onPage`,
  `onPageRole`, `openSheet` — never a bare selector. `scripts/lib/surface.test.mts` enforces this
  by parsing every `probe-*.mjs`.
- **Ports are contended.** Pick a free port and pass `PROBE_BASE`; never `pkill`.
- **No stacked PRs.** Each PR below is cut from fresh `main` after the previous one merges.
- **Performance work owes no About entry** — it adds no surface a reader could discover.

## The seven `cacheForUser` call sites

The complete inventory, by import and call rather than by mention. Six modules, seven call sites.
`src/lib/sets/read.ts` and `src/lib/edhrec/seed-index.ts` name it only in comments and are **not**
in scope.

| # | Call site | Loader | Key |
|---|---|---|---|
| 1 | `src/app/collection/page.tsx:56` | `loadBrowseCards(userId)` | `["browse-2"]` |
| 2 | `src/app/commanders/page.tsx:65` | `loadCommanderRankings(userId)` | `commanderRankingsKey` |
| 3 | `src/app/discover/page.tsx:74` | `encodeDiscovery(await loadDiscovery(userId, { sort }))` | `discoveryKey(sort)` |
| 4 | `src/app/collection/sets/page.tsx:24` | `loadOwnedSets(userId)` | `["sets-index"]` |
| 5 | `src/app/collection/sets/[code]/page.tsx:43` | `loadSetGrid(userId, code)` | `["set-grid-2", code]` |
| 6 | `src/app/decks/[id]/page.tsx:87` | `loadDeckSuggestions(id, userId)` | `["deck-suggestions","1",id]` |
| 7 | `src/app/decks/[id]/page.tsx:99` | synergy loader | `["deck-synergy","1",oracleId,partner]` |

`loadBrowseCards` is `export const loadBrowseCards = cache(async function loadBrowseCards(userId: string): Promise<BrowseListCard[]>)`
in `src/lib/collection/browse.ts:751` — a React `cache()` wrapper, which is per-request memoization
and unrelated to the data cache.

## Measured baseline (2026-09-16, desktop 1300x900)

| Route | RSC fetches on revisit | Payload (decoded) | Response ms |
|---|---|---|---|
| `/collection` | 1 | 1,595.8 KB | ~290 |
| `/discover` | 1 | 951.3 KB | ~80 |
| `/decks/[id]` | 1 | 553.7 KB | 550–790 |
| `/commanders` | 1 | 158.0 KB | ~78 |
| `/` | 1 | 29.5 KB | ~525 |
| `/decks` | 1 | 28.3 KB | 345–512 |
| back()/forward() | 0 | — | — |
| `/collection` filter, sort, view | 0 | — | — |

Phone (390x844) was measured in PR 1 and is in `docs/superpowers/benchmarks/nav-cost-baseline.json`.
Payloads proved identical at both widths — the server renders one tree and the responsive work is
CSS — so the phone downloads the same bytes over a worse connection.

---

## PR 1 — the probe and the baseline

No behavior change. Lands this plan, the permanent probe, and the committed benchmark.

### Task 1.1: the probe script

**Files:**
- Create: `scripts/probe-nav-cost.mjs`
- Modify: `package.json` (add `"probe:nav-cost": "node scripts/probe-nav-cost.mjs"`)
- Modify: `docs/superpowers/plans/2026-09-16-navigation-caching.md` (this file, committed here)

**Interfaces:**
- Consumes: `requireEnv` from `scripts/lib/env.mjs`; `onPage` from `scripts/lib/surface.mjs`;
  `clerkSetup`, `setupClerkTestingToken` from `@clerk/testing/playwright`.
- Produces: a JSON report at the path given by `--out`, shaped
  `{ width: number, base: string, deck: string, steps: Array<{ label, landed, route, revisit, rsc, prefetch, action, document, decodedKB, responseMs }>, summary: Record<string, { rsc, decodedKB, responseMs, document }> }`.
  `deck` is the `/decks/[id]` path the run measured — the condition that makes deck payloads
  comparable between runs. `summary.document` is not optional: `compareToBudget` reads it to reject a navigation that fell
  back to a full page load, and dropping it disables that guard silently.
  Task 1.2 and every later PR read that shape. `responseMs` is wall clock from fetch start to
  response end — it includes scheduling and transfer, so it is not server compute and is noisy
  between runs.

- [ ] **Step 1: copy the walk and the recorder from the scratch probe**

The working script from the spike is the starting point. Four mechanics in it are load-bearing and
must survive:

```js
// 1. Requests are recorded SYNCHRONOUSLY at request time, tagged with the step.
//    An async recorder pushes rows after the settle loop gives up, and every count reads 0.
page.on("request", (r) => {
  const kind = classify(r);            // see 2
  if (!kind) return;
  const rec = { stepId, kind, path, t0: Date.now(), done: false, bytes: 0 };
  r.__rec = rec;
  log.push(rec);
});

// 2. A prefetch is NOT a navigation fetch. Without this split a speculative
//    prefetch makes a 0-fetch budget pass or fail for the wrong reason.
function classify(r) {
  const h = r.headers();
  if (h["next-action"]) return "action";
  if (h["rsc"] === "1" && h["next-router-prefetch"] === "1") return "prefetch";
  if (h["rsc"] === "1") return "rsc";
  if (r.resourceType() === "document") return "document";
  return null;
}

// 3. Bytes come from the browser's own resource timeline. Playwright's sizes(),
//    response.body() and CDP loadingFinished ALL report 0 for these streamed
//    RSC payloads — which reads as a free navigation.
await page.evaluate(() => {
  performance.setResourceTimingBufferSize(3000);   // default 250 overflows and drops rows
  performance.clearResourceTimings();
});
// ...after the step:
const timings = await page.evaluate((paths) =>
  performance.getEntriesByType("resource")
    .filter((e) => paths.includes(new URL(e.name).pathname + new URL(e.name).search))
    .map((e) => ({ decoded: e.decodedBodySize, ms: Math.round(e.duration) })), [...rscPaths]);

// 4. Warm every route twice by document load before recording anything.
```

- [ ] **Step 2: add the liveness clauses**

Every reading needs a clause that fails when the probe has lost its subject. Without these the
script reports a flawless app while measuring nothing — it did exactly that twice during the spike.

```js
// The walk must actually navigate. A step that lands where it started measured nothing.
if (expect && new URL(page.url()).pathname !== expect) {
  throw new Error(`step "${label}" expected ${expect}, landed ${new URL(page.url()).pathname}`);
}
// A run that records no RSC request anywhere is a broken probe — BUT only while
// the baseline still expects fetches. Once PRs 3-6 convert every route, a healthy
// walk legitimately makes none, and an unconditional form of this guard fails the
// exact outcome the work is for.
const expectsFetches = Object.values(budgetsForWidth).some((b) => b.rsc > 0);
if (expectsFetches && rows.every((r) => r.rsc === 0 && r.prefetch === 0)) {
  throw new Error("no RSC or prefetch request recorded while the baseline expects fetches");
}
// Filter controls must move the URL, or the control was never pressed.
if (before.url === after.url) throw new Error(`control "${label}" did not change the URL`);
```

- [ ] **Step 3: sign in and scope every selector**

```js
// `requireEnv` returns only the names it is given, so destructuring the password
// out of a call that does not ask for it yields undefined however `.env` is set.
const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const FIXTURE = EMAIL.includes("+clerk_test");
const { E2E_AUDIT_USER_PASSWORD: PASSWORD } = FIXTURE
  ? { E2E_AUDIT_USER_PASSWORD: null }
  : requireEnv(["E2E_AUDIT_USER_PASSWORD"]);
// A `+clerk_test` account signs in with code 424242 and has no password.
// Nav links are reached through the shell's own nav, scoped by aria-label:
const link = (href) =>
  page.locator(`nav[aria-label="Primary"] a[href="${href}"]`).filter({ visible: true }).first();
```

- [ ] **Step 4: accept `--width` and `--out`, and run both widths**

```bash
# `--baseline=none` because there is no committed baseline yet — the probe reads
# one by default, and this is the run that MAKES it.
node scripts/probe-nav-cost.mjs --width=1300 --baseline=none --out=/tmp/nav-1300.json
node scripts/probe-nav-cost.mjs --width=390  --baseline=none --out=/tmp/nav-390.json
```

At 390 the primary nav is the tab bar, not the rail. Resolve the link through whichever is visible
rather than assuming the rail:

```js
const link = (href) =>
  page.locator(`nav[aria-label="Primary"] a[href="${href}"]`).filter({ visible: true }).first();
```

Both chromes render `nav[aria-label="Primary"]` (`src/components/shell/nav.tsx:167,249`), so the
`visible` filter picks the right one at each width. Assert that exactly one is visible before
clicking, so a future chrome change fails loudly instead of clicking the wrong nav.

- [ ] **Step 5: run it against a production build**

```bash
DATABASE_URL=... pnpm build
pnpm start --port 3007 &
PROBE_BASE=http://localhost:3007 pnpm probe:nav-cost --width=1300 --out=/tmp/nav-1300.json
```
Expected: every route reports `rsc: 1` on revisit, `back()`/`forward()` report `rsc: 0`, and
`/collection` reports ~1,595.8 KB. If the figures differ materially from the table above, stop and
report — the baseline changed, and that is a finding rather than a number to overwrite.

- [ ] **Step 6: prove the probe fails when the app is fine and the probe is broken**

Mutation-check the instrument itself, which is the whole lesson of the spike:

1. Comment out the `performance.clearResourceTimings()` call → payload figures collapse toward 0 for
   later steps. Confirm, restore.
2. Change `classify` so a prefetch is counted as `rsc` → the first navigation to a prefetched route
   reports more than 1. Confirm, restore.
3. Point one step's `expect` at a route the click does not reach → the run throws. Confirm, restore.

Record the three results in the PR body. A probe whose failure path was never run is not evidence.

- [ ] **Step 7: commit**

```bash
git add scripts/probe-nav-cost.mjs package.json docs/superpowers/plans/2026-09-16-navigation-caching.md
git commit -m "Measure what one navigation costs"
```

### Task 1.2: the committed baseline

**Files:**
- Create: `docs/superpowers/benchmarks/nav-cost-baseline.json`
- Create: `docs/superpowers/benchmarks/nav-cost-history.md`

**Interfaces:**
- Consumes: the `--out` JSON from Task 1.1.
- Produces: `nav-cost-baseline.json`, read by the budget assertion in Task 1.3.

- [x] **Step 1: take both widths against a production build** — DONE in PR 1.

Both widths are committed in `docs/superpowers/benchmarks/nav-cost-baseline.json`. Payloads proved
identical at 1300 and 390. Do not re-run this to "fill in" the phone column; it is already there, and
overwriting it silently rebases every later comparison.

- [ ] **Step 2: write the baseline file, conditions included**

A number without its conditions cannot be compared to anything later.

```json
{
  "takenAt": "2026-09-16",
  "conditions": {
    "build": "production (pnpm build && pnpm start)",
    "warmed": "every route loaded twice before recording",
    "account": "E2E_AUDIT_USER_EMAIL fixture, 2733 collection_items rows",
    "note": "the fixture holds fewer rows than Hugh's 3239, so these are NOT an upper bound"
  },
  "widths": {
    "1300": { "/collection": { "rsc": 1, "decodedKB": 1595.8, "responseMs": 309, "document": 0 } }
    // ...and an entry for every other measured route, at BOTH widths. This
    // sketch shows one; the committed file carries all six at 1300 and 390.
  }
}
```

Every route in the measured table gets an entry at both widths: `/collection`, `/discover`,
`/decks/[id]`, `/commanders`, `/`, `/decks`. **A route with no budget is a route whose regression
passes a green gate.**

- [ ] **Step 3: open the history file with its first row**

```markdown
# Navigation cost — history

Conditions are fixed: production build, warmed twice, fixture account, widths 1300x900 and 390x844.
A figure taken against `next dev` or a cold server is not comparable and does not belong here.

| Date | PR | What changed | /collection | /discover | /decks/[id] | /commanders | / | /decks |
|---|---|---|---|---|---|---|---|---|
| 2026-09-16 | #692 | baseline, no behavior change | 1 fetch · 1595.8 KB | 1 · 951.3 KB | 1 · 553.7 KB | 1 · 158.0 KB | 1 · 29.5 KB | 1 · 28.3 KB |
```

- [ ] **Step 4: commit**

```bash
git add docs/superpowers/benchmarks/
git commit -m "Commit the navigation baseline, both widths"
```

### Task 1.3: budget assertions, in baseline mode

**Files:**
- Modify: `scripts/probe-nav-cost.mjs`
- Create: `scripts/probe-nav-cost.test.mts`

**Interfaces:**
- Consumes: `nav-cost-baseline.json`.
- Produces: exit code 1 when a route exceeds its ceiling or its expected fetch count.

- [ ] **Step 1: read the baseline and compare — ON BY DEFAULT**

The comparison must run without a flag. As an opt-in it compared nothing on the documented
`pnpm probe:nav-cost` invocation, so a regression exited 0; `--baseline=none` is the escape, for the
run that makes a new baseline.


**PR 1 must pass on today's build.** A zero-fetch assertion describes the *finished* state; today
every revisit costs exactly 1. Baseline mode asserts the *recorded* count, so each route's
zero-fetch assertion is switched on by the PR that converts that route — and not before.

```js
// expectedFetches comes from the baseline file, not from a constant.
// A route is converted by setting its baseline entry's `rsc` to 0 in the PR that converts it.
const budget = baseline.widths[String(width)][route];
check(`${route} costs ${budget.rsc} RSC fetch(es) on revisit`, row.rsc, budget.rsc);
if (budget.decodedKB !== null) {
  const over = row.decodedKB > budget.decodedKB * 1.02;   // 2% tolerance for payload jitter
  check(`${route} payload within ceiling ${budget.decodedKB}KB`, over, false);
}
```

- [ ] **Step 2: unit-test the comparison, not the browser**

```ts
import { describe, expect, it } from "vitest";
import { compareToBudget } from "./probe-nav-cost.mjs";

describe("compareToBudget", () => {
  it("fails a route that costs more fetches than its budget", () => {
    const r = compareToBudget(
      { route: "/decks", rsc: 1, decodedKB: 28.3, document: 0 },
      { rsc: 0, decodedKB: 28.3 },
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("1");
  });

  it("passes a route still at its recorded baseline in baseline mode", () => {
    const r = compareToBudget(
      { route: "/decks", rsc: 1, decodedKB: 28.3, document: 0 },
      { rsc: 1, decodedKB: 28.3 },
    );
    expect(r.ok).toBe(true);
  });

  it("fails a payload over ceiling by more than the tolerance", () => {
    const r = compareToBudget(
      { route: "/collection", rsc: 1, decodedKB: 1700, document: 0 },
      { rsc: 1, decodedKB: 1595.8 },
    );
    expect(r.ok).toBe(false);
  });

  it("ignores a payload ceiling that was never measured", () => {
    const r = compareToBudget(
      { route: "/collection", rsc: 1, decodedKB: 9999, document: 0 },
      { rsc: 1, decodedKB: null },
    );
    expect(r.ok).toBe(true);
  });

  // `document` is required, and this is the guard it exists for: a hard reload
  // reports rsc 0, which is exactly what a converted route's budget expects.
  it("fails a navigation that fell back to a document load", () => {
    const r = compareToBudget(
      { route: "/collection", rsc: 0, decodedKB: 0, document: 1 },
      { rsc: 0, decodedKB: 1595.8 },
    );
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2b: run it and watch it fail**

Run: `pnpm test scripts/probe-nav-cost.test.mts`
Expected: FAIL — `compareToBudget` is not exported yet.

- [ ] **Step 3: implement `compareToBudget` and export it**

```js
export function compareToBudget(measured, budget) {
  if (measured.rsc !== budget.rsc) {
    return { ok: false, reason: `${measured.route}: ${measured.rsc} RSC fetches, budget ${budget.rsc}` };
  }
  if (budget.decodedKB !== null && measured.decodedKB > budget.decodedKB * 1.02) {
    return { ok: false, reason: `${measured.route}: ${measured.decodedKB}KB over ceiling ${budget.decodedKB}KB` };
  }
  return { ok: true };
}
```

- [ ] **Step 4: run the tests and the probe**

Run: `pnpm test scripts/probe-nav-cost.test.mts` → PASS.
Run the probe against the production build → every route passes in baseline mode.

- [ ] **Step 5: mutation-check**

Edit `nav-cost-baseline.json` to claim `/decks` costs 0 fetches → the probe fails that row. Restore.
This is the proof the assertion is wired to the file rather than to a constant.

- [ ] **Step 6: gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add scripts/probe-nav-cost.mjs scripts/probe-nav-cost.test.mts docs/superpowers/benchmarks/
git commit -m "Assert each route against its committed budget"
```

---

## PR 2 — enable Cache Components, convert nothing

The riskiest PR in the plan: it changes how every route renders. It converts no route, so the
benchmark must come out unchanged apart from the shell.

### Task 2.1: enable the flag and run the codemod

**Files:**
- Modify: `next.config.ts`
- Modify: every `src/app/**/{page,layout}.tsx` (codemod adds `export const instant = false`)
- Modify: `src/app/api/health/route.ts:8` (`export const dynamic = "force-dynamic"` must go)

- [ ] **Step 1: read the migration guide first**

`node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md`, and
`authentication-with-cache-components.md` beside it — Clerk's `auth()` is called by every route in
this app, and that guide is the one that says how it interacts.

- [ ] **Step 2: enable the flag**

```ts
// next.config.ts — replacing the deliberately-empty config
const nextConfig: NextConfig = {
  cacheComponents: true,
};
```

- [ ] **Step 3: run the codemod, and check the file count**

```bash
pnpm dlx @next/codemod@canary cache-components-instant-false ./src/app
```
`pnpm dlx`, not `npx`: this repository is pnpm-only and `pnpm-lock.yaml` is the single lockfile.
A wrong path reports `0 ok` instead of failing. This repo has **16 `loading.tsx`** files and 18
`page.tsx` routes; if the count looks small, the path was wrong.

- [ ] **Step 4: replace the `dynamic` export**

`src/app/api/health/route.ts` sets `export const dynamic = "force-dynamic"`. Under Cache Components
that errors. The guide's `dynamic = "force-dynamic"` section gives the replacement; the health route
must stay uncached, since it reports live migration state.

- [ ] **Step 5: fix synchronous IO, which `instant = false` cannot defer**

`new Date()`, `Date.now()`, `Math.random()` and `crypto.randomUUID()` throw at prerender regardless
of the opt-out. Find them in the prerendered path:

```bash
grep -rn "new Date()\|Date.now()\|Math.random()\|crypto.randomUUID()" src/app src/components | grep -v test
```
Each hit either moves into a `<Suspense>` boundary behind `connection()`, or into a Client
Component. Note `formatLastUpdated(date, now = new Date())` in `src/lib/collection/browse.ts:217` —
its default argument runs at call time and is reached from `/collection`.

- [ ] **Step 6: build, then benchmark**

```bash
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
```
Then a real build and **two explicit runs** — `pnpm probe:nav-cost --width=1300` and
`pnpm probe:nav-cost --width=390`, because the script defaults to 1300 and a bare invocation
measures desktop only. **Expected: unchanged from baseline.**
PPR now streams a shell, so first-paint may improve; the RSC counts must not move, because no route
was converted. A moved count here means the flag changed behavior this plan has not accounted for —
stop and report rather than adjusting the baseline.

- [ ] **Step 7: run the whole browser suite**

```bash
pnpm probe:scroll-lock && pnpm probe:review && pnpm probe:versions && pnpm probe:home && pnpm probe:sets
```
`<Activity>` keeps routes mounted-hidden, and this app has a shared scroll lock and several sheet
surfaces. This step is why it is a step and not an assumption.

- [ ] **Step 8: add the history row and commit**

```bash
git add next.config.ts src/app docs/superpowers/benchmarks/nav-cost-history.md
git commit -m "Enable Cache Components, convert no route"
```

---

## PRs 3–6 — convert the routes

One PR per group, cut from fresh `main` after the previous merges. **Each follows the same five
steps**, which are written out per PR rather than cross-referenced, because the implementer may read
these out of order.

Group order, cheapest risk first:

| PR | Routes | Call sites converted |
|---|---|---|
| 3 | `/collection` | 1 |
| 4 | `/decks`, `/decks/[id]` | 6, 7 — **plus `/decks`' own reads, which are NOT in that inventory** |
| 5 | `/commanders`, `/discover` | 2, 3 |
| 6 | `/`, `/collection/sets`, `/collection/sets/[code]`, remaining routes | 4, 5 |

**`/decks` has no `cacheForUser` call site, and converting it is still in scope.** Call sites 6 and 7
are both on `/decks/[id]`. `/decks` reads `listDecksWithStats`, `loadShoppingRollup` and
`listFolders` directly, none of which appear in the seven-call-site table — so a PR 4 that converted
only the listed call sites would leave the measured `/decks` route unconverted while looking
complete. Its boundaries go on those three loaders. The same question is worth asking of every route
in PRs 5 and 6: the inventory lists where `cacheForUser` is called, not everything a route reads.

### The five steps, for each route in the group

- [ ] **Step 1: delete `export const instant = false` from the route**

Then run `pnpm dev` and read the validation insight it raises. The insight names the component that
blocks instant rendering; it is the instruction for step 2.

- [ ] **Step 2: put `'use cache: private'` on the route-specific loader — never on `cacheForUser`**

`cacheForUser` takes `load: () => Promise<T>`, and a cache boundary requires serializable arguments.
The directive on that wrapper would pass a function through the boundary and fail. It goes on the
loader behind the call site:

```ts
// src/lib/collection/browse.ts — the /collection boundary
export const loadBrowseCards = cache(async function loadBrowseCards(
  userId: string,
): Promise<BrowseListCard[]> {
  "use cache: private";
  cacheLife({ stale: 300 });          // 5 min: ≥30s for per-link prefetch, ≥5min for the App Shell
  cacheTag(`user-lists:${userId}`);   // same tag revalidateUserLists already drops
  return toListCards(aggregateCollection(await selectCollectionRows(userId)));
});
```

`cacheForUser` **stays** wrapped around it. The two layers answer different questions: the server
cache makes a first visit cheap, the private cache makes a revisit free.

- [ ] **Step 3: write the route's client invalidation story**

`<Activity>` keeps a hidden route mounted, so a write on another route can reveal a tree that never
refetched. This repo already hit that edge:
`src/components/sets/set-grid-client.tsx:1-14` documents that `revalidatePath` "does not refresh a
mounted client route and window focus does not fire for an action taken in this tab", and solves it
by bumping a generation the grid rechecks on.

For each converted route, answer in the PR body: **which writes change what this route shows, and
how does a hidden-then-revealed tree learn about them?** Claim and collection writes are the ones to
reason about first — availability markers are read on routes other than the one that writes them.
Where the answer is not "nothing can change it", apply the generation-bump pattern.

- [ ] **Step 4: prove it in a browser**

Add a case to `scripts/probe-nav-cost.mjs`:

```js
// Write on one route, reveal another, assert the revealed tree shows the write.
await step(page, "stage a card into a deck", () => /* the write */);
await step(page, "reveal /collection (hidden, mounted)", () => link("/collection").click());
// The availability marker for that card must reflect the write, not the payload
// captured before it.
const marker = await onPage(page, `[data-oracle-id="${oracleId}"] [data-availability]`).innerText();
check("the revealed route shows the write", marker, expectedAfterWrite);
```

A route whose conversion has no such case is not converted. Set that route's `rsc` budget to `0` in
`nav-cost-baseline.json` in the same PR — that is what switches its zero-fetch assertion on.

- [ ] **Step 5: benchmark, gate, history row, commit**

```bash
DATABASE_URL=... pnpm build && pnpm start --port 3007 &
PROBE_BASE=http://localhost:3007 pnpm probe:nav-cost --width=1300
PROBE_BASE=http://localhost:3007 pnpm probe:nav-cost --width=390
pnpm typecheck && pnpm lint && pnpm test
```
Add the row to `nav-cost-history.md` naming the PR and what changed. **A PR that moves a figure the
wrong way says so in its own body** rather than leaving it to be discovered.

### Per-segment prefetch, in PR 6

Once every route is converted, set the prefetch policy. The export is real in 16.3.4 —
`node_modules/next/dist/build/segment-config/app/app-segment-config.d.ts` declares
`export type Prefetch = 'auto' | 'partial' | 'unstable_eager' | 'force-disabled'` — and requires
`cacheComponents`, which PR 2 enabled.

```ts
// A heavy route nobody navigates to speculatively.
export const prefetch = "force-disabled";
```
Candidates: `/collection/replace`, `/decks/import`, `/decks/[id]/import`, `/decks/new`. Measure
before and after; a prefetch that never gets used is pure server cost, and one that does is the
difference between instant and not.

- [ ] **Step 6 (PR 6 only): delete the last `instant = false`**

```bash
grep -rn "instant = false" src/app
```
Expected: no matches. Any remaining opt-out means a route was never converted, and the plan is not
finished.

---

## Self-review

**Spec coverage.** §1 spine → PRs 2–6. §2 payload → *deferred, see below*. §3 server time →
*deferred*. §4 filter state → *deferred*. §5 proof → PR 1 + step 4 of every conversion. §6 risks →
PR 2 steps 5/7 and conversion step 3. §7 scope → global constraints.

**Deliberately not in this plan.** Spec §2 (payload cuts), §3 (server time) and §4 (filter state)
are PRs 7–9 and get their **own plan**, written after their measurement tasks land. Writing them now
would mean inventing tasks: the spec's §2 begins "the first task is composition, not cuts" and §3
begins "instrument per-query timings first". Neither measurement exists yet, so any task list for
them would be placeholders wearing a task's clothes. §4 is explicitly sequenced after §1 because
`<Activity>` may resolve it.

**Type consistency.** `compareToBudget(measured, budget)` is defined in Task 1.3 and used only
there. The `--out` JSON shape declared in Task 1.1 is what Task 1.2 writes and Task 1.3 reads.
`loadBrowseCards` keeps its exact signature from `src/lib/collection/browse.ts:751`.

**Known gap, stated rather than hidden.** The `cacheLife` value in conversion step 2 is written as
`{ stale: 300 }` for `/collection`. The right number per route is a judgment the first conversion
should settle with evidence — a longer window is a better revisit and a staler read after somebody
else's write. PR 3 picks it, says why in its body, and PRs 4–6 follow or diverge with a reason.
