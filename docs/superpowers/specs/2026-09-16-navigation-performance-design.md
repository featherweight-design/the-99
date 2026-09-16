# Navigation performance — design

**Date:** 2026-09-16
**Status:** design approved, implementation plan to follow
**Branch:** `perf/navigation-caching`

## The report

> "There are moments when it feels like we re-load data and shouldn't have to. Nothing has
> materially changed with the data, so it should be instantaneous."

That is a testable claim, so it was measured before anything was designed.

## What was measured

A throwaway Playwright probe drove a signed-in browser through a fixed navigation walk against a
**production build** (`next build && next start`) on `local-dev`. Production, not `next dev`:
dev disables `<Link>` prefetch and compiles routes on demand, which fabricates the exact slowness
under investigation.

Every route was visited twice before any figure was recorded, so nothing below pays for a cold
server cache or a first chunk download. Desktop 1300x900. The fixture account holds 2,733
`collection_items` rows; Hugh's own account holds 3,239, so these numbers are if anything
conservative.

**Speculative prefetches are counted separately and excluded from the RSC column.** A request
carrying `Next-Router-Prefetch: 1` is classified as a prefetch, never as a navigation fetch; the
walk ran with `<Link>` prefetch enabled, so without that split a prefetch could make a 0-fetch
budget pass or fail for the wrong reason. The permanent probe keeps the two columns.

Payload sizes are `decodedBodySize` read from the browser's own resource timeline. Three earlier
attempts at this figure — Playwright's `sizes()`, `response.body()`, and CDP `loadingFinished` —
all reported **0 KB** for these streamed RSC responses, which reads as a free navigation. That is
worth recording: the instrument agreed with the build being perfect, and it was wrong.

### Cost of one navigation, on a revisit where nothing changed

| Navigation | RSC fetches | Payload (decoded) | Server ms |
| --- | --- | --- | --- |
| `/collection` (2nd and 3rd visit) | 1 | **1,595.8 KB** | ~290 |
| `/discover` | 1 | **951.3 KB** | ~80 |
| `/decks/[id]` (2nd and 3rd visit) | 1 | **553.7 KB** | **550–790** |
| `/commanders` (2nd visit) | 1 | 174.7 KB | ~78 |
| `/decks` (2nd and 3rd visit) | 1 | 28.3 KB | 345–512 |
| `/` | 1 | 29.5 KB | ~525 |
| browser back() / forward() | **0** | — | — |
| any `/collection` filter, sort or view toggle | **0** | — | — |

### The four findings

1. **Every forward navigation refetches, including a third visit to an unchanged route.** The deck
   page returned a byte-identical payload — same `_rsc` token, same 553.7 KB — on all three
   visits. Next holds dynamic segments in the client cache for 0s, and every route in this app is
   dynamic. Browser back/forward costs nothing, because that is a separate history cache. That
   split is why the app feels *inconsistently* slow rather than uniformly slow.

2. **Payload size is the multiplier.** 1.6 MB per `/collection` visit is roughly 600 bytes per owned
   card. On a desk that is 290ms. On a phone away from wifi it is not.

3. **Three routes are slow for a different reason — server time, not bytes.** `/decks/[id]` spends
   **550–790ms**, `/decks` **345–512ms**, and `/` **~525ms**, behind payloads of 553.7 KB, 28.3 KB
   and 29.5 KB respectively. `/decks` and `/` are the clearest cases: tens of kilobytes costing
   half a second says the time is database work, not transport. No client cache reaches a first
   visit, so this is the one finding that client-side work cannot fix.

4. **Filter state does not survive a round trip.** Leaving `/collection?c=W` and returning lands on
   bare `/collection`.

### What is already fast, and must not regress

Every `/collection` control — colour pips, sort, view toggle — costs **zero** network requests,
with the URL moving each time to prove the control fired. That surface is already optimal, and it
is optimal *because* the page ships the whole list up front. Finding 2 and that fact are the same
trade seen from two sides; cutting the payload must not silently buy bytes back with round trips.

## Auditing the rules we inherited

`AGENTS.md` carries a caching section that would forbid parts of this work. It was audited against
its own commit history rather than taken as given.

**"Never Next's `staleTimes` … this codebase has already shipped a bug that way."** Overstated.
`staleTimes.dynamic = 30` was added in **#264** to fix this exact symptom, and it worked. What went
wrong was not the setting: the window *exposed* write paths that had never called
`revalidatePath` — `createDeck` revalidated nothing at all. Those were fixed, and the fix is still
here, in `src/lib/decks/revalidate.ts` (`deckSurfaces` / `claimSurfaces`). On why it was retired in **#460**, the repository says two things and both belong here. The commit
message says `/collection` was the last surface leaning on the window and had moved its URL sync to
`replaceState`. The comment left behind in `next.config.ts` states the *reason* differently and more
strongly: the setting "is a router-wide setting, so it bought that one fix by holding a stale copy of
every dynamic page in the app." An earlier draft of this document called the removal incidental
cleanup. That was too dismissive of the second source, and it is corrected here.

**The blast-radius objection is legitimate, and this design does not ask to reopen it.** That is the
concrete reason the design reaches for Cache Components rather than for `staleTimes`: `staleTimes`
has exactly one knob for every dynamic route in the app, while `'use cache: private'` sets a lifetime
**per cached function** and the `prefetch` segment export sets a policy **per route**. A stale window
on `/collection` no longer implies one on a deck page. What survives the correction is the narrower
claim: the #264 window was never shown to be harmful in itself, and the missing `revalidatePath`
calls it exposed were real bugs that are now fixed.

**"A cache lives for one visit. Leaving the route unmounts it."** Obsolete. That describes a
limitation of the hand-rolled pattern, written as a law of the framework. Under Cache Components,
Next uses React `<Activity>` to keep recently visited routes mounted but hidden; state survives
navigation and returns intact.

**Still sound, and kept:** a fresh server payload wins over a cached entry; a cache hit writes the
URL with `replaceState` rather than routing; and the 2 MB per-entry ceiling on the data cache
documented in `cacheForUser` — that one is measured, specific, and the reason the three big
payloads were cut to their present sizes.

`AGENTS.md` is rewritten at the end of this work with reasoning attached rather than prohibitions.

## The design

### §1 Spine — Cache Components, adopted incrementally

Enable `cacheComponents: true`, run the `cache-components-instant-false` codemod across `src/app`
so the app keeps building, then convert routes one at a time, deleting each opt-out as it lands.
Synchronous IO (`new Date()`, `Math.random()`, `crypto.randomUUID()`) cannot be deferred by
`instant = false` and is fixed in the same pass.

Per-reader data gets a **two-layer** model, not a replacement:

- **`cacheForUser`** (server, `unstable_cache`, 2 MB ceiling) **stays**. It is the only layer that
  helps a *first* visit, and its measured wins are real: `/discover` spent 1.1–1.6s assembling its
  payload before it was cached.
- **`'use cache: private'`** is added on top, for the revisit — **not on `cacheForUser` itself.**
  That wrapper takes a `load: () => Promise<T>` callback, and a cache boundary requires serializable
  arguments, so putting the directive on the generic wrapper would pass a function through the
  boundary and fail. The directive goes on the **route-specific loader** behind each call site
  (`loadBrowseCards`, the commander rankings loader, the deck detail loaders), each of which takes
  plain serializable inputs. The implementation plan names one boundary per call site rather than
  one shared boundary. It caches a function that reads
  `cookies()` / `headers()` / `searchParams`, and its results are held **only in browser memory,
  never stored on the server** — the right shape for an app where every payload is one player's
  collection. Mechanically: the function runs during a server render, its output rides along in the
  RSC payload sent for that navigation or prefetch, and the browser then keeps it for its `stale`
  window. That is what turns a revisit inside the window into no round trip at all. `cacheLife({ stale })` is set at 30s minimum to keep per-link prefetch working, and
  5 minutes where the content should reach the route's App Shell.

**`<Activity>` changes the invalidation contract, and that is a gap this design has to close rather
than inherit.** Preserving a hidden route's state means a write on another route can reveal a mounted
tree that never took a fresh server payload — and this repository has already met that edge and
documented it: `src/components/sets/set-grid-client.tsx` explains that `revalidatePath` "does not
refresh a mounted client route and window focus does not fire for an action taken in this tab", and
solves it by bumping a generation the grid rechecks on. Under Cache Components that stops being one
grid's problem and becomes the general case, with a 30s–5min private cache behind it.

So every route converted in PRs 3–6 carries a **client invalidation story** alongside its cache
lifetime: which writes can change what it shows, and how a hidden-then-revealed tree learns about
them. The generation-bump pattern already in `set-grid-client.tsx` is the reference. Claim and
collection writes are the cases to reason about first, because availability markers are read on
routes other than the one that writes them. **This is proved in a browser, not asserted**: a probe
case writes on one route, reveals another, and asserts the revealed tree shows the write. No route's
conversion is complete without it.

Per-segment `prefetch` config replaces the global knob the old rule objected to: `'force-disabled'`
on heavy, rarely-visited routes, `'partial'` where prefetching pays.

`unstable_cache` is called in exactly one place — `src/lib/cache/user-lists.ts`, inside
`cacheForUser`. (`src/lib/decks/suggestions-read.ts` names it only in a comment; its payload is
cached by its caller.) **Six modules import and call `cacheForUser`, across seven call sites** — `src/app/collection/page.tsx`,
`collection/sets/page.tsx`, `collection/sets/[code]/page.tsx`, `commanders/page.tsx`,
`discover/page.tsx`, and `decks/[id]/page.tsx`, which calls it **twice**. Every one is a page
component. `src/lib/sets/read.ts` and `src/lib/edhrec/seed-index.ts` name it only in comments and are
**not** in scope — in particular the EDHREC index job is not pulled into this plan. Only one route
sets `dynamic` (`src/app/api/health/route.ts`).

That is a narrow data layer with a wide readership: a change in `cacheForUser`'s semantics has to be
checked against all seven call sites.

This inventory was wrong twice before it was right, in the same way both times — `grep -l` matches a
mention in a comment as readily as a call. It is stated here as imports and call sites because that
is what a migration actually has to touch.

### §2 Payload size

The first task is **composition, not cuts**. The server-cached browse list is already trimmed to
~1.0 MB, so roughly 600 KB of the 1.6 MB arrives from elsewhere — availability flattened onto every
card, owned-set metadata, stats. Measure which fields carry the weight, then cut.

PPR streams the list behind a shell and improves *perceived* speed. It moves **no bytes**. Those two
claims stay separate; streaming is not permitted to stand in for a reduction.

### §3 Server time — `/decks/[id]`, `/decks`, `/`

`/decks/[id]` runs `getDeckDetail`, then `loadVersionShape`, then prices and availability, and some
of that sequencing is deliberate and commented as such. Order of work: instrument per-query timings
first, then choose between query and index changes, parallelising only where the existing comments
do not forbid it, and streaming non-critical panels behind Suspense.

`/decks` (345–512ms) and `/` (~525ms) get the same treatment and are named here rather than left
implicit: both ship under 30 KB, so neither has a payload problem to hide behind, and `/` is the
route every session starts on. They are cheaper to instrument than the deck page and may well share
a cause with it.

### §4 Filter state

Sequenced **after** §1 and re-measured, not fixed speculatively: a hidden route under `<Activity>`
returns with its state intact, so this may resolve itself. If it does not, the parameters are
persisted explicitly.

### §5 Proof

The throwaway probe is promoted to `scripts/probe-nav-cost.mjs` with asserted budgets — a warm
revisit inside the configured `stale` window costs 0 RSC fetches, and each route's payload stays
under a recorded ceiling. It lands **first**, before any behavior change, and it commits a ceiling for **every route in the measured
table, not only the big three**: `/collection` 1,595.8 KB, `/discover` 951.3 KB, `/decks/[id]`
553.7 KB, `/commanders` 174.7 KB, `/` 29.5 KB, `/decks` 28.3 KB. A route with no budget is a route
whose regression passes a green gate. Later PRs lower these deliberately rather than negotiating
them.

**PR 1 runs in baseline mode, and its probe must pass on today's build.** The zero-fetch assertion
describes the *finished* state — today every revisit costs exactly 1 fetch, so a probe asserting 0 on
an unchanged app would fail the one PR that is defined as changing no behavior. Baseline mode records
the current fetch count per route as the expected value. Each route's zero-fetch assertion is enabled
by the PR that converts that route, and not before.
A browser probe is this repository's standard of proof for a change of this kind, and it doubles as
the regression gate.

### Benchmark protocol — before, during, after

Load times are recorded at three points, and the numbers live in the repository rather than in a
session transcript.

**Before.** PR 1 commits `docs/superpowers/benchmarks/nav-cost-baseline.json` with the conditions
recorded beside every figure: production build, warmed twice, fixture account row counts, viewport.
A number without its conditions cannot be compared against anything later.

**The figures quoted in this document are desktop (1300x900) only** — that is all that was measured
on 2026-09-16. PR 1 therefore takes the 390x844 run before committing the baseline, and the phone
column starts empty rather than being back-filled by assumption. The desktop ceilings are today's
measured values; the phone ceilings are whatever that run returns.

**During.** Every PR that changes rendering or payload re-runs the probe and commits its own row to
`docs/superpowers/benchmarks/nav-cost-history.md`: date, PR number, what changed, and the per-route
figures against the previous row. A PR that moves a figure the wrong way says so in its own body
rather than leaving it to be discovered. This is what makes a regression attributable to one change
instead of to the batch.

**After.** The final PR re-runs the whole table and records the before/after delta per route. A
route that did not improve is reported as such, with the reason, rather than omitted.

Both widths thereafter, because the phone is where these payloads actually hurt and the desktop
figure would hide it: 1300x900 and 390x844.

The same conditions every time — production build, warm, same fixture account. A benchmark taken
against `next dev` or a cold server is not comparable to these numbers and must not be entered in
the history.

The probe must assert its own liveness. Its first drafts reported a flawless app twice: once when
byte capture silently returned 0, and once when an async recorder pushed rows after the settle loop
had given up, so every count read zero. Each reading needs a clause that fails when the probe has
lost its subject.

### §6 Risks

- **`<Activity>` keeps routes mounted-hidden.** This app has a shared scroll lock and several sheet
  and modal surfaces. `probe:scroll-lock` is re-run as an explicit task, not assumed.
- **Clerk and Cache Components** have a dedicated guide
  (`02-guides/authentication-with-cache-components.md`). It is read at implementation time rather
  than paraphrased now.
- **16 `loading.tsx` boundaries** interact with PPR's static shell. Expect churn there.
- **Every Next 16 claim in this document came from the vendored docs** at
  `node_modules/next/dist/docs`, not from memory. A subagent previously got this exact topic wrong
  from memory, in the opposite direction. Re-check at implementation time.
- **`use cache: private` does not persist across a page reload.** That is acceptable — the finding
  is about in-session navigation — but it means a hard refresh still pays full cost, and no budget
  may be written assuming otherwise.

### §7 Scope

No new UI surfaces, so **no design handoff and no About entry**: this is performance, and the About
rule exempts work that teaches the reader nothing they need. The PWA — install affordance, manifest,
offline app shell, modeled on `concert-crawl` — is deliberately **out of scope** and becomes its own
spec once this lands.

## PR boundaries

At most ~20 files or ~800 lines each, no stacked PRs.

1. Probe promoted; the 390x844 run taken; baseline benchmark and budgets committed for both
   widths. No behavior change.
2. `cacheComponents` enabled, `instant = false` codemod, synchronous-IO fixes. App builds; no route
   converted.
3. `/collection` converted, with its two-layer cache split. Measured against the baseline.
4. `/decks` and `/decks/[id]` converted.
5. `/commanders` and `/discover` converted.
6. Remaining routes converted; every `instant = false` deleted.
7. Payload composition measured, then cut.
8. Deck query time.
9. Filter state, the `AGENTS.md` caching rewrite, and the final before/after benchmark table.

## Success criteria

- A warm revisit to any converted route, **within the `stale` window configured for it**, costs
  **0 RSC fetches**, asserted by the probe. Outside that window a refetch is correct behavior, not
  a regression, and the probe's case names the window it is testing.
- `/collection`'s payload is measurably smaller than the 1,595.8 KB baseline, with the new figure
  committed as the probe's ceiling.
- `/decks/[id]` server time is reduced against its measured 550–790ms, or the doc records why it
  could not be.
- No `instant = false` remains in `src/app`.
- `probe:scroll-lock`, `probe:review`, `probe:versions` and the rest of the browser suite pass
  unchanged.
- The benchmark history holds a row for every PR that changed rendering or payload, and the final
  row states the before/after delta for every route at both widths.
