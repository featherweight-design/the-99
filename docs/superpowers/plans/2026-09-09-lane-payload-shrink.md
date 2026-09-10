# Lane Payload Shrink Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the `/collection` and `/discover` payloads under the Next data cache's 2 MB per-entry ceiling, so both routes join the per-reader server cache that PR #487 built for `/commanders` — and ship less over the wire on every visit while doing it.

**Architecture:** Two different answers, because the two payloads are heavy for two different reasons. `/collection` ships three fields no list row ever reads — `printings`, `oracleText`, `backImageUri` — which only the card modal needs, one card at a time; those come out of the list and the modal fetches through `getCardDetail`, the action every deck surface already opens through. `/discover` has no such passenger: its heavy fields render in visible rows. It is instead encoded — one shared string dictionary for the EDHREC label vocabulary, a stripped Scryfall URL stem, and positional tuples in place of per-row object keys — and decoded once at the server/client boundary. Both loaders then go through `cacheForUser`.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Clerk auth, Vitest, pnpm.

**Predecessor:** PR #487 (`a7036b3`) built `src/lib/cache/user-lists.ts` and wired `/commanders` through it. That file's doc comment names `/discover` and `/collection` as deliberately uncached and says why; this plan is the work that changes the answer, and those comments must be updated rather than left contradicting the code.

## Measurements

All figures measured against the largest collection in the database (user `user_3Hdjd…`, 2,733 collection rows → 2,472 browse cards, 3,086 discovery items), by direct `JSON.stringify` of the loader's return value.

| | before | after | mechanism |
|---|---|---|---|
| `loadBrowseCards` | 2,156,577 B | 984,563 B | three fields dropped |
| `loadDiscovery` | 2,762,788 B | 1,091,785 B | dictionary + tuple rows |
| `loadCardDetail`, per call | — | 80 ms median (72–122) | already exists |

Intermediate figure worth keeping: dictionary encoding **alone** takes `/discover` to 1,844,502 B. That is under the ceiling, but by 8% — one larger collection puts it back over. The row keys cost 654,232 B across 3,086 rows on their own, which is why tuple rows are in scope rather than deferred.

## Global Constraints

- **Package manager is pnpm.** Never npm or yarn.
- **Pre-push gate, every push:** `pnpm typecheck && pnpm lint && pnpm test`, plus the stub-DB build `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`, then `git fetch origin && git rebase origin/main`.
- **Stage files by name.** Never `git add -A`.
- **All work happens in the worktree** `.worktrees/perf/payload-shrink` on branch `perf/payload-shrink`. The main checkout is never edited.
- **No schema change.** No migration, no new column, no new table.
- **No new caching mechanism.** `cacheForUser` exists and is the only one used. Component-held client caches are governed by the caching section of AGENTS.md and are not touched here.
- **The cache key must name the sort.** `/discover` renders a different list under `fit` than under `new`; a key that omits it files two answers under one entry. This is the failure mode `cacheForUser`'s own doc comment warns about.
- **No visual change on either route.** Every rendered string, order and layout is identical before and after. The one behavioural change is that opening a card on `/collection` now shows the pending state its trigger already implements, for ~200 ms.
- **Out of scope:** encoding the `/collection` payload (0.98 MB needs no help), encoding `/commanders` (cached and fast since #487), virtualised scrolling, server-side pagination, and moving any client filter to the server.

## Task 1 — Fetch the collection modal instead of shipping it

- [ ] Read `src/lib/collection/browse.ts`, `src/lib/collection/card-detail.ts` and `src/components/collection/browser.tsx` in full before editing. `loadCardDetail` already returns a full `BrowseCard`; the question this task answers is what the *list* row needs to stop carrying.
- [ ] Split the row type: `BrowseCard` keeps its current shape (it is what `loadCardDetail` and `CardModal` exchange), and the list gains a narrower type — `BrowseListCard` — that omits `printings`, `oracleText` and `backImageUri`. Derive one from the other with `Omit<...>` rather than restating the fields, so a field added later cannot be added to only one of them.
- [ ] `loadBrowseCards` returns `BrowseListCard[]` — its signature at `browse.ts:503` says `Promise<BrowseCard[]>` today and will not compile once the fields go. `filterCards`, `sortCards` and every other list-side helper widen to the narrower type too. Stop building the `printings` arrays there — the aggregation at `browse.ts:229-299` still needs them transiently to pick `primarySetCode` and `imageUri` via `primaryPrinting`, so build them, use them, and drop them from the returned row rather than skipping the work.
- [ ] **The set filter needs per-printing quantities, and this is the one blocker in the whole plan.** `buildSetOptions` at `src/lib/collection/set-filter.ts:68-72` walks `c.printings` to sum a quantity per set code — that is where the count on each set chip comes from, and what disables a chip at zero. Dropping `printings` breaks it. The fix is to carry the rollup rather than the rows it was summed from: the list row keeps `setCodes` for `filterCards`, and gains `setCounts: [string, number][]` — one entry per owned set code (uppercased) with that set's total quantity. `buildSetOptions` reads `setCounts` instead of `printings`; nothing else in that file changes.
- [ ] `setCounts` is cheap: a handful of `["MH3", 4]` pairs per card, against the 673 KB of `printings` it replaces. Measure it during Task 4 and record the real figure — the payload table in this plan assumes it is noise, and that assumption should be checked rather than trusted.
- [ ] Nothing else on the list side reads the three dropped fields. Verified by grep: `resolvedPrinting`, `printingCaption` and `primaryPrinting` (`browse.ts:336-355`) are all modal-side and operate on the full `BrowseCard` that `getCardDetail` returns, and `card-modal.tsx:278,364,382,549` likewise. Re-run that grep after the type split rather than trusting this line.
- [ ] `browser.tsx` opens the modal through `getCardDetail`. Prefer reusing `CardDetailProvider`/`useCardDetail` over hand-rolling a second fetch — that provider already owns the pending state, the sibling Prev/Next paging, and focus return. If the provider cannot serve this surface, say why in the PR body rather than duplicating its logic quietly.
- [ ] That reuse is a real refactor, not a swap, and the plan should not pretend otherwise. `browser.tsx` today holds `openCardId` state (line ~237), resolves it against the in-memory list (lines ~350-353), and renders `CardModal` itself (lines ~466-478) — the provider instead owns the modal and takes `open(oracleId, siblings)`. Expect to delete all three of those and to pass the *filtered, sorted* oracle-id list as `siblings`, which is what keeps Prev/Next walking the order on screen rather than the unfiltered collection. Do this as its own commit so a bisect can tell a payload bug from a modal-wiring bug.
- [ ] The `?card=` URL parameter must still deep-link, and the timing changes: today the card is in memory at first render, so the modal paints immediately. With a fetch, an on-mount effect has to call `open` for the id in the URL, and the modal renders its loading state until the fetch lands.
- [ ] Preserve today's gating on that deep link: the card opens only when it is present in the current filtered, sorted list, because that list is what Prev/Next pages through. An id that survives in the URL but not in the filter opens nothing now, and should still open nothing.
- [ ] Update `grid-view.test.tsx` and `rows-view.test.tsx` fixtures, which currently set `printings: []` and `oracleText: ""` on rows that no longer have those fields.
- [ ] **Verify:** `pnpm typecheck && pnpm lint && pnpm test`.

## Task 2 — Encode the discovery payload

- [ ] New module `src/lib/discovery/encode.ts`, pure, no database and no React. It exports an `EncodedDiscovery` type, `encodeDiscovery(list: DiscoveryList): EncodedDiscovery`, and `decodeDiscovery(encoded: EncodedDiscovery): DiscoveryList`. Follow `src/lib/recs/free-delta.ts` for house style — it is the existing answer to the same problem on the commanders lane.
- [ ] What the encoding does, and nothing more:
  - One string dictionary shared by `unplayedLabels`, `nearestDeck.deckName` and `nearestDeck.sharedLabels`. Measured at 399 entries / 4,514 B for 3,086 rows, because the EDHREC tag vocabulary is small and every row draws from it.
  - `artCropUri` loses the leading `https://cards.scryfall.io/art_crop/front/`. Strip only that exact stem, and leave any URL that does not start with it untouched — a URL from another host must survive the round trip unchanged, not be silently corrupted.
  - Rows become positional tuples under an explicit key order carried in the payload.
  - `roleCounts` becomes a 4-tuple under an explicit role order carried in the payload.
- [ ] No encoded field may be `undefined`. In an object, JSON drops the key and the decoder can restore it; in a tuple position, it becomes `null` and silently changes type. `DiscoveryItem` uses `null` throughout today — keep it that way, and let the round-trip test be what proves it.
- [ ] Everything outside `items` — `candidateCount`, `bestPct`, `floorExcluded`, `deckIdentities`, `sort` and the rest — is carried through untouched. They are a fixed handful of scalars and encoding them buys nothing.
- [ ] `src/app/discover/page.tsx` encodes — the call goes in at line ~70, where `loadDiscovery`'s result is handed straight to `<DiscoveryView discovery={...} />` today, and `DiscoveryView`'s prop type becomes `EncodedDiscovery`. `discovery-view.tsx` decodes exactly once, at the top, and hands the decoded list to everything below unchanged. No component under it learns that an encoding exists.
- [ ] **Tests are the load-bearing part of this task.** A round-trip test over a hand-built fixture list, asserting `decodeDiscovery(encodeDiscovery(x))` deep-equals `x`, and covering: a null `artCropUri`, a null `nearestDeck`, an empty `unplayedLabels`, a row whose labels are all duplicates of another row's, an `artCropUri` on a foreign host, and a zero in every `roleCounts` slot. A property-style test over generated rows is welcome on top of that, not instead of it.
- [ ] **Verify:** `pnpm typecheck && pnpm lint && pnpm test`.

## Task 3 — Wire both routes through the cache

- [ ] `/collection`: `loadBrowseCards(userId)` becomes `cacheForUser(userId, ["browse"], () => loadBrowseCards(userId))` in `src/app/collection/page.tsx`, replacing the comment that says it is deliberately uncached.
- [ ] `/discover`: `loadDiscovery(userId, { sort })` becomes `cacheForUser(userId, ["discovery", sort], ...)` in `src/app/discover/page.tsx`, again replacing the deliberately-uncached comment. **The sort is in the key.**
- [ ] Confirm — by reading, not by assuming — that the loaders return plain JSON-safe data now that they cross the cache. A `Map` returns from the data cache as `{}` and a `Date` as a string. `loadBrowseCards` returns dates as `YYYY-MM-DD` strings already; verify rather than trust this sentence.
- [ ] Rewrite the header of `src/lib/cache/user-lists.ts`. It currently states that only `/commanders` is wired through it and that the other two payloads are over the ceiling — both sentences become false in this PR, and its stale 3.1 MB / 2.4 MB figures are replaced by what Task 4 actually measures. The 2 MB ceiling paragraph in `cacheForUser`'s doc stays: it is the constraint that shaped this work, and it now reads as the reason both payloads have the shape they do.
- [ ] Invalidation needs no new code — `revalidateUserLists` already fires on collection upload, art-preference writes and every deck write, and both new entries carry the same `user-lists:<userId>` tag. Confirm this by tracing each write path, and note in the PR body if any path revalidates a path without dropping the tag.
- [ ] **Verify:** `pnpm typecheck && pnpm lint && pnpm test`, plus the stub-DB build.

## Task 4 — Measure, and prove it in a browser

- [ ] Build and run production locally. **Kill the old server with `lsof -ti :3000 | xargs -r kill -9`** — `pkill -f "next start"` does not kill it, because pnpm spawns a child; the new build then dies on `EADDRINUSE` while the old one keeps serving and every measurement reads as "no change". This has already cost one debugging cycle on this work.
- [ ] Measure cold load and repeat visit for `/collection` and `/discover` via `PerformanceResourceTiming`, the same method used for #487's figures, and record the before/after table in the PR body.
- [ ] Confirm the server log carries **no** "over 2MB" data-cache warnings. A warning there means the entry was refused and the route is now slower than before this PR, not faster.
- [ ] Walk both routes in a browser signed in as the fixture account: filter, sort, search, open a card on `/collection` (including via a `?card=` deep link), page Prev/Next, and reveal past the first 25 rows on `/discover`. A payload change that renders the same list wrongly is exactly what a unit test cannot catch.

## Risks

- **The encoding is the risky half.** A wrong index into the dictionary does not fail loudly — it renames a label, exactly as `free-delta.ts`'s own header warns about its `order` indices. The round-trip tests exist for this and should be written before the encoder, not after it.
- **`/collection`'s modal is a user-visible change**, approved on the measured ~200 ms figure. If the real click-to-open latency lands materially above that in production, say so rather than absorbing it.
- **1.09 MB and 0.98 MB are today's numbers.** Both are comfortably under 2 MB, but the ceiling is a cliff and not a slope: a payload that crosses it is refused silently and the route gets *slower*. Task 4's warning check is the guard.
