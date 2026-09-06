# Commander Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second scope to `/commanders` that ranks the ~3,300 commanders the player does *not* own a deck for — by how much of their EDHREC support the player already has (#213), and by how far they sit from what the player has already played (#214).

**Architecture:** Discovery never touches the EDHREC network. The owned scope's live fanout (`recommendCommanders`, `CONCURRENCY = 5`) cannot scale from ~242 candidates to ~3,334, so discovery reads the offline index instead: one aggregate over `commander_support_cards` filtered to the player's owned oracle ids, grouped by `commander_oracle_id`, joined to `commander_support` for `edhrec_total`/`tags`. Per-row furniture (pool size, role counts, in-use receipts) that `scoreCommander` computes by walking the whole collection per commander — ~9.4M role classifications at this row count — is replaced by a colour-identity-mask rollup: classify each collection card once, bucket it by its 5-bit WUBRG mask, then sum the ≤32 subset buckets per commander. Novelty is a set difference between each candidate's tag slugs and the union of tag slugs across the commanders of the player's decks. The page renders one list component in two modes: `RecCard` gains a `sort` prop.

**Tech Stack:** Next.js 16 App Router (server components, `searchParams`), React 19, Drizzle ORM on Neon Postgres, Tailwind 4, Vitest.

**Spec:**
- Brief: `docs/superpowers/design-briefs/2026-09-05-commander-discovery.md`
- Handoff: `design/design_handoff_the99_discovery/` — `README.md` (decisions + component notes + Notes for engineering), `CONTROLS-four-above-one-list.md` (§7.2), `STATES-price-and-empties.md` (price matrix + three empties), `commander-discovery · copy strings.ts` (production-final copy)
- Issues: #213 (support-based discovery), #214 (novelty engine), #220 (design ticket, audited 🟢 Green, merged at `ac0d3fd`)

---

## Global Constraints

Every task's requirements implicitly include this section.

**Design system — the handoff's five must-nots.** No new design token. No new hex value. No new motion class. No new empty-state pattern. No new component: discovery reuses `RecCard`, `RevealControl`/`EndOfRanking`/`WindowCount`, `PageHeader`, `FilteredEmpty`, and the existing filter bar.

**Copy.** Every user-visible string in this feature comes from `src/lib/copy/commander-discovery.ts`, lifted **verbatim** from `design/design_handoff_the99_discovery/commander-discovery · copy strings.ts`. Do not paraphrase, re-case, or re-punctuate. Load-bearing vocabulary:
- "lists" — never "the 99" — for EDHREC's support corpus.
- "support" appears only as a column/figure label, never as a verb.
- "built" / "never built" for deck ownership; "in your collection" for card ownership.
- The verb **"buy" is banned**. The price slot states a price; it never invites a purchase.
- Every figure prints its denominator (`{N} of {M}`).
- Every number is locale-formatted: `const n = (v: number) => v.toLocaleString("en-US")`.

**Ruled out, do not implement.** A third scope option. A "relevance" default sort. Sorting, grouping, or boosting owned commanders. Ranking on price. Colouring the price figure by magnitude. A degraded banner for a missing price. A `score /100 FIT` stack under discovery. `ScoreDelta` under discovery (always `null`). A retry control on the untagged note.

**Data semantics.**
- `edhrec_total` is null iff `synergy_state !== "ok"`. Neither the fit figure nor the novelty figure prints without a non-null `edhrec_total`.
- A commander is "untagged" when `tags.length === 0` — never inferred from a zero count.
- Novelty floor: a candidate qualifies when `ownedSupport >= 0.3 * edhrecTotal`.
- Price liveness: a `printing_prices` row is live when its `as_of` equals the newest `as_of` in the table. Absence of a row is not "free" and not "unknown" — see the price matrix.
- Basics have no availability row by design; a card with no row is free.

**URL state.** Two new pieces, both mirrored in the URL: `?scope=play` and `?sort=new`. Absent means owned scope / fit sort. Scope and sort changes are server round-trips (`router.replace(url, { scroll: false })` inside a transition, no pending styling — the handoff forbids animating the list). Colour filters keep today's client-side `history.replaceState`. Any scope or sort change resets `shown` to `REVEAL_STEP`.

**Workflow.** Worktree `.worktrees/discovery` on `feat/commander-discovery`. pnpm only. Pre-push gate every push: `pnpm typecheck && pnpm lint && pnpm test`, plus `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`, then `git fetch origin && git rebase origin/main`. Stage files by name, never `git add -A`. Squash merge.

**Testing.** Vitest. DB-touching modules are tested by extracting the pure shaping function alongside the query and testing that directly, or by `vi.mock`ing the `db` chain — follow `src/app/commanders/[slug]/synergy-read.test.ts`. No test may require a live database.

**Phases map to PRs.** Each phase below is one PR. Every UI phase runs the design-review skill before `gh pr create`, and ships mobile + desktop parity in the same PR.

---

## File Structure

**New — copy**
- `src/lib/copy/commander-discovery.ts` — the handoff's copy module, verbatim. No logic beyond the `n()` formatter.

**New — server logic (`src/lib/discovery/`)**
- `src/lib/recs/pool-rollup.ts` — colour-identity-mask rollup. Turns one pass over the collection into per-commander `colorPoolSize`, `roleCounts`, and `ReceiptCounts`. Lives beside `score.ts` because it is a faster spelling of what `commanderPool` + `classifyRoles` + `receiptCountsByCommander` already compute.
- `src/lib/discovery/candidates.ts` — the fit aggregate: candidate rows with `ownedSupport`, `edhrecTotal`, `tags`, identity, image. No per-row receipts preview string (see Phase 3, gap 8). Parameterised on the owned oracle-id set so `?avail=free` is the same query with a different argument.
- `src/lib/discovery/price.ts` — cheapest live printing per commander; `PriceSlot` discriminated union.
- `src/lib/discovery/novelty.ts` — played-tag set, unplayed-tag count, the 30% floor, `bestPct`, nearest-deck clause.
- `src/lib/discovery/slugs.ts` — deterministic discovery slug index, request-cached, shared by the list and the detail route.
- `src/lib/discovery/list.ts` — the orchestrator. Returns `DiscoveryList` (items + the counts the subtitle, count line, and empty states need).

**Modified — server**
- `src/lib/recs/recommend.ts` — `scoreOneCommander` falls back to `cards` when the commander is not in the collection, so an unowned commander has a working detail page.
- `src/app/commanders/page.tsx` — parse `?scope` / `?sort`; branch to the discovery loader instead of `getRankedList`.
- `src/app/commanders/[slug]/page.tsx` — third slug-resolution step via the discovery slug index.

**Modified — UI**
- `src/components/commanders/page-header.tsx` — scope control beside the title; the two new subtitles.
- `src/components/commanders/rec-card.tsx` — `sort` prop; justification slot (overlap bar vs. tag list); ownership pip; price slot; untagged note.
- `src/components/commanders/filtered-empty.tsx` — the built clause and the scope link.
- The filter bar's `Order:` slot — sort menu replacing the fixed label.
- `src/components/commanders/reveal-control.tsx` — `WindowCount` gains `toLocaleString`; `revealBand` line.

**New — UI**
- `src/components/commanders/scope-control.tsx` — segmented radiogroup.
- `src/components/commanders/sort-menu.tsx` — the sort menu, with the disabled `New to you` option.
- `src/components/commanders/discovery-empty.tsx` — the no-decks and below-floor empties (the filtered empty stays in its own file).

**Tests** — one `*.test.ts` beside each new logic module; component tests only where a branch is not otherwise observable.

---

## Phase 1 — Copy module

One PR. No UI, no queries: a pure module so every later phase imports strings rather than inventing them.

### Task 1: Lift the copy module

**Files:**
- Create: `src/lib/copy/commander-discovery.ts`
- Test: `src/lib/copy/commander-discovery.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export const discoveryCopy` with blocks `scope`, `sort`, `justify`, `ownership`, `price`, `untagged`, `empty`, `window`. Exact member names are fixed by the handoff file — do not rename.

- [ ] **Step 1: Copy the handoff file verbatim**

```bash
cp "design/design_handoff_the99_discovery/commander-discovery · copy strings.ts" \
   src/lib/copy/commander-discovery.ts
```

Change nothing inside it. The first line is already the correct destination path comment.

- [ ] **Step 2: Write the test**

Locale formatting and the denominator rule are the two things a later edit could silently break, so both get a test.

```ts
import { describe, expect, it } from "vitest";
import { discoveryCopy } from "./commander-discovery";

describe("discoveryCopy", () => {
  it("locale-formats four-digit counts", () => {
    expect(discoveryCopy.scope.subtitlePlay(3334, 2805, "fit")).toContain("3,334");
    expect(discoveryCopy.scope.subtitlePlay(3334, 2805, "fit")).toContain("2,805");
  });

  it("names the sort in the play subtitle", () => {
    expect(discoveryCopy.scope.subtitlePlay(10, 10, "new")).toContain("new to you");
    expect(discoveryCopy.scope.subtitlePlay(10, 10, "fit")).toContain("best fit");
  });

  it("prints a denominator with every figure", () => {
    expect(discoveryCopy.justify.overlap(12, 99)).toMatch(/12.*99/);
  });

  it("never says buy", () => {
    const all = JSON.stringify(discoveryCopy, (_k, v) =>
      typeof v === "function" ? v.length === 0 ? v() : String(v) : v,
    );
    expect(all.toLowerCase()).not.toMatch(/\bbuy\b/);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `pnpm vitest run src/lib/copy/commander-discovery.test.ts`
Expected: PASS. If the `buy` assertion fails, the copy file was edited — revert to the handoff version rather than changing the test.

- [ ] **Step 4: Pre-push gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add src/lib/copy/commander-discovery.ts src/lib/copy/commander-discovery.test.ts
git commit -m "feat(discovery): copy module, lifted from the handoff"
```

---

## Phase 2 — Pool rollup

One PR. Pure functions, no database. This is the answer to gap-report item 8: at 3,334 candidates the shipped per-commander walk over a 2,805-card collection is ~9.4M role classifications per request.

### Task 2: Colour-identity mask helpers

**Files:**
- Create: `src/lib/recs/pool-rollup.ts`
- Test: `src/lib/recs/pool-rollup.test.ts`

**Interfaces:**
- Consumes: `PoolCard` and `RoleName` from `src/lib/recs/score.ts`; `classifyRoles` and `ROLE_TARGETS` from `src/lib/recs/roles.ts`; `Availability` and `availabilityState` from `src/lib/decks/availability.ts`; `ReceiptCounts` from `src/lib/commanders/in-use.ts`.
- Produces: `identityMask(colors: string[]): number`, `buildPoolRollup(collection: PoolCard[], availability: Map<string, Availability>): PoolRollup`, `rollupFor(rollup: PoolRollup, commander: { oracleId: string; colorIdentity: string[] }): CommanderRollup`.

Types:

```ts
export type CommanderRollup = {
  colorPoolSize: number;
  roleCounts: Record<RoleName, number>;
  counts: ReceiptCounts;
};
```

- [ ] **Step 1: Write the failing test for `identityMask`**

```ts
import { describe, expect, it } from "vitest";
import { identityMask } from "./pool-rollup";

describe("identityMask", () => {
  it("maps WUBRG to fixed bits", () => {
    expect(identityMask([])).toBe(0);
    expect(identityMask(["W"])).toBe(1);
    expect(identityMask(["U"])).toBe(2);
    expect(identityMask(["B"])).toBe(4);
    expect(identityMask(["R"])).toBe(8);
    expect(identityMask(["G"])).toBe(16);
  });

  it("is order-insensitive", () => {
    expect(identityMask(["G", "W"])).toBe(identityMask(["W", "G"]));
  });

  it("subset test matches fitsIdentity", () => {
    const card = identityMask(["W", "U"]);
    const commander = identityMask(["W", "U", "B"]);
    expect((card & ~commander) === 0).toBe(true);
    expect((commander & ~card) === 0).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/recs/pool-rollup.test.ts`
Expected: FAIL — "Failed to resolve import ./pool-rollup".

- [ ] **Step 3: Implement `identityMask`**

```ts
const BITS: Record<string, number> = { W: 1, U: 2, B: 4, R: 8, G: 16 };

/** 5-bit WUBRG mask. `card & ~commander` is `fitsIdentity` in one instruction. */
export function identityMask(colors: string[]): number {
  let mask = 0;
  for (const c of colors) mask |= BITS[c.toUpperCase()] ?? 0;
  return mask;
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/recs/pool-rollup.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recs/pool-rollup.ts src/lib/recs/pool-rollup.test.ts
git commit -m "feat(discovery): WUBRG identity mask"
```

### Task 3: Bucket the collection and sum subsets

**Files:**
- Modify: `src/lib/recs/pool-rollup.ts`
- Test: `src/lib/recs/pool-rollup.test.ts`

**Interfaces:**
- Produces: `PoolRollup` (opaque to callers — 32 buckets plus a per-oracle-id index for the self-subtraction), `buildPoolRollup`, `rollupFor`.

- [ ] **Step 1: Write the failing equivalence test**

The rollup's only job is to agree with the shipped functions. Test it against them directly, so a future change to `classifyRoles` or `availabilityState` cannot make the two drift apart silently.

```ts
import { describe, expect, it } from "vitest";
import { buildPoolRollup, rollupFor } from "./pool-rollup";
import { commanderPool, type PoolCard } from "./score";
import { classifyRoles, ROLE_TARGETS } from "./roles";
import { receiptCountsByCommander } from "../commanders/in-use";
import type { Availability } from "../decks/availability";

const card = (over: Partial<PoolCard> & { oracleId: string }): PoolCard => ({
  name: over.oracleId, typeLine: "Creature — Human", oracleText: null,
  keywords: [], colorIdentity: [], imageUri: null, manaCost: null, ...over,
});

const collection: PoolCard[] = [
  card({ oracleId: "a", colorIdentity: ["W"], typeLine: "Sorcery",
         oracleText: "Draw two cards." }),
  card({ oracleId: "b", colorIdentity: ["U", "B"], typeLine: "Instant",
         oracleText: "Destroy target creature." }),
  card({ oracleId: "c", colorIdentity: [], typeLine: "Artifact",
         oracleText: "{T}: Add {C}." }),
  card({ oracleId: "d", colorIdentity: ["G"], typeLine: "Land",
         oracleText: "{T}: Add {G}." }),
  card({ oracleId: "e", colorIdentity: ["W", "U"], typeLine: "Sorcery",
         oracleText: "Destroy all creatures." }),
];

const avail = new Map<string, Availability>([
  ["a", { owned: 1, hard: 1, soft: 0, free: 0, hardDecks: [] }],
  ["b", { owned: 2, hard: 0, soft: 1, free: 1, hardDecks: [] }],
]);

const commanders = [
  { oracleId: "z", colorIdentity: ["W", "U", "B"] },
  { oracleId: "a", colorIdentity: ["W"] },      // a commander that is in the collection
  { oracleId: "y", colorIdentity: [] },
  { oracleId: "x", colorIdentity: ["W", "U", "B", "R", "G"] },
];

describe("pool rollup", () => {
  const rollup = buildPoolRollup(collection, avail);
  const shippedCounts = receiptCountsByCommander(commanders, collection, avail);

  for (const commander of commanders) {
    it(`agrees with the shipped walk for ${commander.oracleId}`, () => {
      const got = rollupFor(rollup, commander);
      const pool = commanderPool(commander, collection);

      expect(got.colorPoolSize).toBe(pool.length);

      const expected = { ramp: 0, draw: 0, removal: 0, wipes: 0 };
      for (const c of pool) {
        for (const role of classifyRoles(c)) {
          if (role !== "land") expected[role as keyof typeof ROLE_TARGETS]++;
        }
      }
      expect(got.roleCounts).toEqual(expected);
      expect(got.counts).toEqual(shippedCounts.get(commander.oracleId));
    });
  }
});
```

Confirm the `Availability` literals above match the real type before running; if the shape differs, use the type's own fields rather than editing the assertions.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/recs/pool-rollup.test.ts`
Expected: FAIL — `buildPoolRollup` is not exported.

- [ ] **Step 3: Implement the rollup**

```ts
import { availabilityState, type Availability } from "../decks/availability";
import type { ReceiptCounts } from "../commanders/in-use";
import { classifyRoles, type Role } from "./roles";
import type { PoolCard, RoleName } from "./score";

type Bucket = {
  size: number;
  roleCounts: Record<RoleName, number>;
  counts: ReceiptCounts;
};

export type PoolRollup = {
  buckets: Bucket[];                 // indexed by 5-bit identity mask, length 32
  byOracleId: Map<string, Bucket>;   // one-card bucket, for subtracting the commander itself
};

const emptyBucket = (): Bucket => ({
  size: 0,
  roleCounts: { ramp: 0, draw: 0, removal: 0, wipes: 0 },
  counts: { inUse: 0, wantedByBrew: 0 },
});

function add(into: Bucket, from: Bucket, sign: 1 | -1) {
  into.size += sign * from.size;
  for (const r of Object.keys(into.roleCounts) as RoleName[]) {
    into.roleCounts[r] += sign * from.roleCounts[r];
  }
  into.counts.inUse += sign * from.counts.inUse;
  into.counts.wantedByBrew += sign * from.counts.wantedByBrew;
}

/**
 * Classifies each collection card once and files it under its identity mask.
 * A commander's pool is the union of the buckets whose mask is a subset of its
 * own, so a per-commander answer costs 32 adds instead of a walk over the whole
 * collection — the difference between ~107k operations and ~9.4M at 3,334 rows.
 */
export function buildPoolRollup(
  collection: PoolCard[],
  availability: Map<string, Availability>,
): PoolRollup {
  const buckets = Array.from({ length: 32 }, emptyBucket);
  const byOracleId = new Map<string, Bucket>();

  for (const c of collection) {
    const one = emptyBucket();
    one.size = 1;
    for (const role of classifyRoles(c) as Role[]) {
      if (role !== "land") one.roleCounts[role]++;
    }
    const a = availability.get(c.oracleId);
    if (a) {
      const state = availabilityState(a);
      if (state === "hard" || state === "over") one.counts.inUse++;
      else if (state === "soft") one.counts.wantedByBrew++;
    }
    add(buckets[identityMask(c.colorIdentity)], one, 1);
    byOracleId.set(c.oracleId, one);
  }

  return { buckets, byOracleId };
}

export type CommanderRollup = {
  colorPoolSize: number;
  roleCounts: Record<RoleName, number>;
  counts: ReceiptCounts;
};

export function rollupFor(
  rollup: PoolRollup,
  commander: { oracleId: string; colorIdentity: string[] },
): CommanderRollup {
  const identity = identityMask(commander.colorIdentity);
  const total = emptyBucket();
  for (let mask = 0; mask < 32; mask++) {
    if ((mask & ~identity) === 0) add(total, rollup.buckets[mask], 1);
  }
  // `commanderPool` excludes the commander itself, and a commander the player
  // owns is in the collection — so it is in a bucket and has to come back out.
  // The subtraction is unconditionally safe: the commander's bucket is keyed by
  // the commander's own identity, which is trivially a subset of itself, so that
  // bucket is always one of the ≤32 just summed. No subset guard is needed here
  // and one would be dead code — the invariant is proved by construction, and
  // Phase 2's equivalence test against `commanderPool` is what would catch it
  // breaking.
  const self = rollup.byOracleId.get(commander.oracleId);
  if (self) add(total, self, -1);

  return {
    colorPoolSize: total.size,
    roleCounts: total.roleCounts,
    counts: total.counts,
  };
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/recs/pool-rollup.test.ts`
Expected: PASS, all four commanders.

- [ ] **Step 5: Pre-push gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add src/lib/recs/pool-rollup.ts src/lib/recs/pool-rollup.test.ts
git commit -m "feat(discovery): identity-mask pool rollup"
```

---

## Phase 3 — Candidate query

One PR. The fit half of #213: how much of each commander's EDHREC support the player already owns.

**Resolves gap-report item 8.** The handoff flags 3,334 rows of per-row preformatting as unexamined. Two things make it affordable, and both are decisions this phase locks in:
1. `colorPoolSize`, the role counts and the in-use counts come from Phase 2's rollup, not from a per-commander walk.
2. **Discovery rows carry no receipts *preview* string.** The owned scope's `receipts` names the overlapping cards; the discovery receipt line is the ownership clause plus the shipped availability clauses (README:147, README:307), and neither needs card names. Nothing in the handoff asks discovery to name overlap cards, so no per-row string is built for 3,334 rows.

### Task 4: The support-overlap aggregate

**Files:**
- Create: `src/lib/discovery/candidates.ts`
- Test: `src/lib/discovery/candidates.test.ts`

**Interfaces:**
- Consumes: `db` from `src/db`; `cards`, `decks`, `commanderSupport`, `commanderSupportCards` from `src/db/schema`; `EdhrecTag` from `src/lib/edhrec/parse`.
- Produces:

```ts
export type CandidateRow = {
  oracleId: string;
  name: string;
  // No typeLine: every row in `commander_support` is already a commander, so the
  // type line answers nothing discovery asks and nothing discovery renders.
  colorIdentity: string[];
  imageUri: string | null;
  edhrecTotal: number | null;
  tags: EdhrecTag[];
  ownedSupport: number;
};

export function loadCandidates(
  userId: string,
  ownedOracleIds: string[],
): Promise<CandidateRow[]>;
```

- [ ] **Step 1: Write the failing test**

Follow `src/app/commanders/[slug]/synergy-read.test.ts`: mock the `db` chain, assert on the shaping. The row shaper is extracted so the assertion is about data, not about drizzle.

```ts
import { describe, expect, it } from "vitest";
import { shapeCandidate, type CandidateSqlRow } from "./candidates";

const row = (over: Partial<CandidateSqlRow>): CandidateSqlRow => ({
  oracleId: "a", name: "Atraxa",
  colorIdentity: ["W", "U", "B", "G"], imageUri: null,
  edhrecTotal: 99, tags: [{ slug: "counters", label: "Counters", count: 5 }],
  ownedSupport: 40, ...over,
});

describe("shapeCandidate", () => {
  it("carries the overlap and the denominator through", () => {
    const got = shapeCandidate(row({}));
    expect(got.ownedSupport).toBe(40);
    expect(got.edhrecTotal).toBe(99);
  });

  it("keeps a null edhrecTotal null rather than defaulting it", () => {
    expect(shapeCandidate(row({ edhrecTotal: null })).edhrecTotal).toBeNull();
  });

  it("distinguishes an untagged commander from one with no owned overlap", () => {
    const untagged = shapeCandidate(row({ tags: [] }));
    const noOverlap = shapeCandidate(row({ ownedSupport: 0 }));
    expect(untagged.tags).toEqual([]);
    expect(untagged.ownedSupport).toBe(40);
    expect(noOverlap.ownedSupport).toBe(0);
    expect(noOverlap.tags).toHaveLength(1);
  });
});
```

These assertions are thin by design, and it is worth being honest about why:
`shapeCandidate` is a spread, so what they pin is the **contract**, not an
algorithm. Each one is a regression guard against someone later adding a `?? 0`
or a `?? []` — the defaults that would erase the difference between "EDHREC does
not index this commander" and "the index says zero". If a future edit gives the
shaper real logic, these grow with it. Step 5's `EXPLAIN ANALYZE` and the
by-hand row count are what actually test the query.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/discovery/candidates.test.ts`
Expected: FAIL — "Failed to resolve import ./candidates".

- [ ] **Step 3: Implement the query and the shaper**

```ts
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderSupport, commanderSupportCards, decks } from "../../db/schema";
import type { EdhrecTag } from "../edhrec/parse";

export type CandidateSqlRow = {
  oracleId: string;
  name: string;
  // No typeLine: every row in `commander_support` is already a commander, so the
  // type line answers nothing discovery asks and nothing discovery renders.
  colorIdentity: string[];
  imageUri: string | null;
  edhrecTotal: number | null;
  tags: EdhrecTag[];
  ownedSupport: number;
};

export type CandidateRow = CandidateSqlRow;

/**
 * Pure row shaping, so the assertions live away from the drizzle builder.
 *
 * Nothing is defaulted: `commanderSupport.tags` is `jsonb().notNull()` and
 * `count(...)` cannot be negative, so a `?? []` or a `Math.max(0, ...)` here
 * would be a guard against a state the schema forbids — and would quietly
 * absorb a real regression if the column ever became nullable.
 */
export function shapeCandidate(r: CandidateSqlRow): CandidateRow {
  return { ...r };
}

/**
 * Every indexed commander the player has not built a deck around, with the
 * count of that commander's EDHREC support cards the player owns.
 *
 * `ownedOracleIds` is a parameter rather than a join so that `?avail=free` is
 * this same query with the free pool's ids — the free ranking is the same
 * question asked of a smaller pool, exactly as `rankFree` treats it.
 *
 * The left join is load-bearing: a commander with zero owned support still has
 * to appear, because the floor and the count line are claims about the whole
 * candidate population, not about the rows that happened to overlap.
 */
export async function loadCandidates(
  userId: string,
  ownedOracleIds: string[],
): Promise<CandidateRow[]> {
  const built = db
    .select({ oracleId: decks.commanderOracleId })
    .from(decks)
    .where(eq(decks.userId, userId));

  const owned = sql.param(ownedOracleIds);

  const rows = await db
    .select({
      oracleId: commanderSupport.commanderOracleId,
      name: cards.name,
      colorIdentity: cards.colorIdentity,
      imageUri: cards.imageUri,
      edhrecTotal: commanderSupport.edhrecTotal,
      tags: commanderSupport.tags,
      ownedSupport:
        sql<number>`count(${commanderSupportCards.oracleId})::int`.as("owned_support"),
    })
    .from(commanderSupport)
    .innerJoin(cards, eq(cards.oracleId, commanderSupport.commanderOracleId))
    .leftJoin(
      commanderSupportCards,
      and(
        eq(commanderSupportCards.commanderOracleId, commanderSupport.commanderOracleId),
        sql`${commanderSupportCards.oracleId} = any(${owned}::uuid[])`,
      ),
    )
    .where(
      and(
        eq(cards.commanderLegal, true),
        notInArray(commanderSupport.commanderOracleId, built),
      ),
    )
    .groupBy(
      commanderSupport.commanderOracleId, cards.name,
      cards.colorIdentity, cards.imageUri, commanderSupport.edhrecTotal,
      commanderSupport.tags,
    );

  return rows.map(shapeCandidate);
}
```

`sql.param` is required for the array — a bare template array expands to a parenthesised param list, which is a syntax error, not an array. `availability-query.ts:47-51` documents the same trap. Note the precedent there is a raw `db.execute`, not the query builder, so step 5 checks the generated SQL rather than trusting the analogy.

**Performance:** `oracle_id = any($1::uuid[])` inside a join condition is not
hashable, so Postgres nested-loops it — ~2,805 owned ids scanned per support row,
over a table with a row per (commander, card). If step 5 shows that plan, move the
owned-id match into a derived table that is inner-joined to the unnested array,
and left-join *that*:

```ts
      ownedSupport: sql<number>`count(osc.oracle_id)::int`.as("owned_support"),
```
```ts
    .leftJoin(
      sql`(select csc.commander_oracle_id, csc.oracle_id
             from commander_support_cards csc
             join unnest(${owned}::uuid[]) as owned(oracle_id)
               on owned.oracle_id = csc.oracle_id) as osc`,
      sql`osc.commander_oracle_id = ${commanderSupport.commanderOracleId}`,
    )
```

Do **not** add the `unnest` as a further `.innerJoin` on the outer query. Drizzle
emits joins in call order, so an inner join written after the left join filters
the left join's NULL rows back out — every commander with zero owned support would
vanish, which is precisely the invariant the left join exists to hold. Keeping the
unnest inside the derived table is what makes the outer join stay outer. Whichever
form ships, step 5's row count over an empty owned array is the check: it must
still be ~3,300 with `ownedSupport` `0` everywhere, not ~0 rows.

Measure before changing it: the simpler form is correct, and correctness that is
fast enough wins.

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/discovery/candidates.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the query against the real database once — plan and timing, not just row counts**

`EXPLAIN ANALYZE` it with a real owned-id array. Record the total time in the PR
body. Anything over ~400ms on the local database means take the `unnest` form
above; `/commanders` is a server-rendered page and this query is on its critical
path.

The unit test proves the shaping, not the SQL. Run it once by hand before committing:

```bash
pnpm tsx -e '
import { loadCandidates } from "./src/lib/discovery/candidates";
const rows = await loadCandidates("<a local-dev user id>", []);
console.log(rows.length, rows[0]);
process.exit(0);
'
```

Expected: roughly 3,300 rows; `ownedSupport` is `0` on every row when the owned set is empty; `edhrecTotal` is a number on most and null on some. If the row count is near 242 the built-exclusion or the legality filter is wrong.

- [ ] **Step 6: Pre-push gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add src/lib/discovery/candidates.ts src/lib/discovery/candidates.test.ts
git commit -m "feat(discovery): support-overlap candidate aggregate"
```

---

## Phase 4 — Price slot

One PR. The first app-code reader of `printing_prices`. Pure logic plus one query, no UI.

### Task 5: Cheapest live printing

**Files:**
- Create: `src/lib/discovery/price.ts`
- Test: `src/lib/discovery/price.test.ts`

**Interfaces:**
- Consumes: `db`, `printings`, `printingPrices` from `src/db/schema`.
- Produces:

```ts
export type PriceSlot =
  | { kind: "priced"; cents: number }
  | { kind: "notStocked" }
  | { kind: "absent" };

export function slotFor(row: PriceAggRow | undefined, ownedCommander: boolean): PriceSlot;
export function loadPrices(oracleIds: string[]): Promise<Map<string, PriceAggRow>>;
```

where

```ts
export type PriceAggRow = {
  oracleId: string;
  /** Cheapest non-null `price_cents` among printings priced at the newest `as_of`. */
  liveCents: number | null;
  /** True when some printing has ever carried a non-null `price_cents`. */
  everPriced: boolean;
};
```

- [ ] **Step 1: Write the failing test — the six-row matrix**

`STATES-price-and-empties.md` states six rows; rows 1 and 2 differ only in type colour, which is a render concern, so the logic has three outcomes. Row 6 collapses onto row 4.

```ts
import { describe, expect, it } from "vitest";
import { slotFor } from "./price";

describe("slotFor", () => {
  it("row 1/2 — a live priced printing prints the figure", () => {
    expect(slotFor({ oracleId: "a", liveCents: 349, everPriced: true }, false))
      .toEqual({ kind: "priced", cents: 349 });
    expect(slotFor({ oracleId: "a", liveCents: 12900, everPriced: true }, false))
      .toEqual({ kind: "priced", cents: 12900 });
  });

  it("row 3 — priced before, not at the newest as_of, reads not stocked", () => {
    expect(slotFor({ oracleId: "a", liveCents: null, everPriced: true }, false))
      .toEqual({ kind: "notStocked" });
  });

  it("row 4 — never priced leaves the slot absent", () => {
    expect(slotFor({ oracleId: "a", liveCents: null, everPriced: false }, false))
      .toEqual({ kind: "absent" });
    expect(slotFor(undefined, false)).toEqual({ kind: "absent" });
  });

  it("row 5 — an owned commander has no price slot at all", () => {
    expect(slotFor({ oracleId: "a", liveCents: 349, everPriced: true }, true))
      .toEqual({ kind: "absent" });
  });

  it("row 6 — a live row with a null price is row 4, not zero", () => {
    expect(slotFor({ oracleId: "a", liveCents: null, everPriced: false }, false))
      .toEqual({ kind: "absent" });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/discovery/price.test.ts`
Expected: FAIL — "Failed to resolve import ./price".

- [ ] **Step 3: Implement**

```ts
import { inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { printingPrices, printings } from "../../db/schema";

export type PriceAggRow = { oracleId: string; liveCents: number | null; everPriced: boolean };

export type PriceSlot =
  | { kind: "priced"; cents: number }
  | { kind: "notStocked" }
  | { kind: "absent" };

/**
 * The six-row matrix in `STATES-price-and-empties.md`, as three outcomes.
 *
 * "Absent" means the slot is not rendered — no dot, no dash, no hairline, no
 * reserved height. A never-priced printing is not free and not unknown; the
 * handoff's answer to "we have no figure" is to say nothing, and an owned
 * commander is not something the player is being priced on at all.
 */
export function slotFor(row: PriceAggRow | undefined, ownedCommander: boolean): PriceSlot {
  if (ownedCommander) return { kind: "absent" };
  if (!row) return { kind: "absent" };
  if (row.liveCents != null) return { kind: "priced", cents: row.liveCents };
  return row.everPriced ? { kind: "notStocked" } : { kind: "absent" };
}

/**
 * `as_of` liveness is measured against the newest `as_of` in the WHOLE table,
 * not per printing: the ingest upserts and never deletes, so a sold-out
 * printing keeps its last row with a frozen `as_of`. That is the distinction
 * between "priced" and "not stocked", and it is the reason `everPriced` is a
 * separate column rather than an inference from a missing row.
 */
export async function loadPrices(oracleIds: string[]): Promise<Map<string, PriceAggRow>> {
  if (oracleIds.length === 0) return new Map();
  const newest = sql`(select max(${printingPrices.asOf}) from ${printingPrices})`;

  const rows = await db
    .select({
      oracleId: printings.oracleId,
      liveCents: sql<number | null>`min(${printingPrices.priceCents})
        filter (where ${printingPrices.asOf} = ${newest}
                  and ${printingPrices.priceCents} is not null)`.as("live_cents"),
      everPriced: sql<boolean>`bool_or(${printingPrices.priceCents} is not null)`
        .as("ever_priced"),
    })
    .from(printings)
    .innerJoin(printingPrices, sql`${printingPrices.scryfallId} = ${printings.scryfallId}`)
    .where(inArray(printings.oracleId, oracleIds))
    .groupBy(printings.oracleId);

  return new Map(rows.map((r) => [r.oracleId, { ...r, everPriced: r.everPriced ?? false }]));
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/discovery/price.test.ts`
Expected: PASS, all five cases.

- [ ] **Step 5: Verify the aggregate against the real database once**

```bash
pnpm tsx -e '
import { db } from "./src/db";
import { printings } from "./src/db/schema";
import { loadPrices } from "./src/lib/discovery/price";
const ids = (await db.select({ o: printings.oracleId }).from(printings).limit(50)).map((r) => r.o);
console.log([...(await loadPrices(ids)).values()].slice(0, 5));
process.exit(0);
'
```

Expected: a mix of rows with a `liveCents` number and rows with `liveCents: null, everPriced: true`. If every row comes back `everPriced: false`, the join column is wrong — it is `scryfall_id`, not `oracle_id`.

- [ ] **Step 6: Pre-push gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add src/lib/discovery/price.ts src/lib/discovery/price.test.ts
git commit -m "feat(discovery): cheapest live printing price slot"
```

---

## Phase 5 — Novelty

One PR. #214's half: distance from what the player has already played, with buildability as a floor and never as a term.

### Task 6: Played tags, unplayed count, the floor

**Files:**
- Create: `src/lib/discovery/novelty.ts`
- Test: `src/lib/discovery/novelty.test.ts`

**Interfaces:**
- Consumes: `CandidateRow` from `./candidates`; `EdhrecTag` from `src/lib/edhrec/parse`; `db`, `decks`, `commanderSupport` from the schema.
- Produces:

```ts
export const NOVELTY_FLOOR = 0.3;

/** `colorIdentity` is the deck's commander's identity — `decks` has no such
    column, so it comes from a `cards` join inside `loadPlayedTags`. Task 19's
    `empty.filteredBuiltClause` needs it and must not add a second query. */
export type DeckTagSet = { deckName: string; colorIdentity: string[]; slugs: Set<string> };

export function floorPct(c: Pick<CandidateRow, "ownedSupport" | "edhrecTotal">): number | null;
export function clearsFloor(c: Pick<CandidateRow, "ownedSupport" | "edhrecTotal">): boolean;
export function unplayedTags(tags: EdhrecTag[], played: Set<string>): EdhrecTag[];
// Narrower than DeckTagSet deliberately: distance is a question about tags, and
// widening DeckTagSet must not force every caller and fixture to supply colours.
export function nearestDeck(
  tags: EdhrecTag[],
  decks: readonly { deckName: string; slugs: Set<string> }[],
): { deckName: string; shared: string } | null;
export function loadPlayedTags(userId: string): Promise<DeckTagSet[]>;
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { clearsFloor, floorPct, nearestDeck, unplayedTags } from "./novelty";

const tag = (slug: string, count = 1) => ({ slug, label: slug.toUpperCase(), count });

describe("floorPct", () => {
  it("is the owned share of the support list, rounded", () => {
    expect(floorPct({ ownedSupport: 30, edhrecTotal: 100 })).toBe(30);
    expect(floorPct({ ownedSupport: 1, edhrecTotal: 3 })).toBe(33);
  });

  it("is null without a denominator — never zero", () => {
    expect(floorPct({ ownedSupport: 5, edhrecTotal: null })).toBeNull();
    expect(floorPct({ ownedSupport: 0, edhrecTotal: 0 })).toBeNull();
  });
});

describe("clearsFloor", () => {
  it("passes at exactly 30%", () => {
    expect(clearsFloor({ ownedSupport: 30, edhrecTotal: 100 })).toBe(true);
  });
  it("fails just below", () => {
    expect(clearsFloor({ ownedSupport: 29, edhrecTotal: 100 })).toBe(false);
  });
  it("fails without a denominator rather than passing by default", () => {
    expect(clearsFloor({ ownedSupport: 99, edhrecTotal: null })).toBe(false);
  });
});

describe("unplayedTags", () => {
  it("is a set difference on slugs, ordered by count then slug", () => {
    const got = unplayedTags(
      [tag("blink", 2), tag("counters", 9), tag("sacrifice", 9)],
      new Set(["blink"]),
    );
    expect(got.map((t) => t.slug)).toEqual(["counters", "sacrifice"]);
  });

  it("returns every tag when nothing has been played", () => {
    expect(unplayedTags([tag("blink")], new Set()).length).toBe(1);
  });

  it("returns nothing for an untagged commander", () => {
    expect(unplayedTags([], new Set(["blink"]))).toEqual([]);
  });
});

describe("nearestDeck", () => {
  const decks = [
    { deckName: "Atraxa", slugs: new Set(["counters", "blink"]) },
    { deckName: "Meren", slugs: new Set(["sacrifice"]) },
  ];

  it("picks the deck sharing the most tags", () => {
    expect(nearestDeck([tag("counters"), tag("blink"), tag("sacrifice")], decks))
      .toEqual({ deckName: "Atraxa", shared: "BLINK and COUNTERS" });
  });

  it("names one shared tag without a conjunction", () => {
    expect(nearestDeck([tag("sacrifice")], decks))
      .toEqual({ deckName: "Meren", shared: "SACRIFICE" });
  });

  it("is null when no deck shares anything", () => {
    expect(nearestDeck([tag("landfall")], decks)).toBeNull();
  });

  it("breaks a tie on deck name, so the clause is stable across renders", () => {
    const tied = [
      { deckName: "Zur", slugs: new Set(["blink"]) },
      { deckName: "Brago", slugs: new Set(["blink"]) },
    ];
    expect(nearestDeck([tag("blink")], tied)?.deckName).toBe("Brago");
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm vitest run src/lib/discovery/novelty.test.ts`
Expected: FAIL — "Failed to resolve import ./novelty".

- [ ] **Step 3: Implement**

```ts
import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderSupport, decks } from "../../db/schema";
import type { EdhrecTag } from "../edhrec/parse";
import type { CandidateRow } from "./candidates";

/** Ruling 4: buildability is a floor, never a term in the sort. */
export const NOVELTY_FLOOR = 0.3;

export type DeckTagSet = { deckName: string; colorIdentity: string[]; slugs: Set<string> };

type Overlap = Pick<CandidateRow, "ownedSupport" | "edhrecTotal">;

/** Null, not 0, without a denominator — the locked rule is that missing data is
    omitted rather than zeroed, and 0% is a figure this surface really reports. */
export function floorPct(c: Overlap): number | null {
  if (c.edhrecTotal == null || c.edhrecTotal <= 0) return null;
  return Math.round((100 * c.ownedSupport) / c.edhrecTotal);
}

export function clearsFloor(c: Overlap): boolean {
  if (c.edhrecTotal == null || c.edhrecTotal <= 0) return false;
  return c.ownedSupport >= NOVELTY_FLOOR * c.edhrecTotal;
}

export function unplayedTags(tags: EdhrecTag[], played: Set<string>): EdhrecTag[] {
  return tags
    .filter((t) => !played.has(t.slug))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}

/**
 * The single nearest built deck, by count of shared tags. One deck and never a
 * count of decks — severity, not inventory, the same rule the availability
 * receipt follows. Ties break on deck name so the clause does not move between
 * two renders of the same data.
 */
export function nearestDeck(
  tags: EdhrecTag[],
  deckSets: readonly { deckName: string; slugs: Set<string> }[],
): { deckName: string; shared: string } | null {
  let best: { deckName: string; labels: string[] } | null = null;
  for (const d of [...deckSets].sort((a, b) => a.deckName.localeCompare(b.deckName))) {
    const labels = tags
      .filter((t) => d.slugs.has(t.slug))
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((t) => t.label);
    if (labels.length > 0 && (!best || labels.length > best.labels.length)) {
      best = { deckName: d.deckName, labels };
    }
  }
  if (!best) return null;
  const [a, b, ...rest] = best.labels;
  const shared =
    rest.length > 0 ? `${a}, ${b} and ${rest.length} more`
      : b ? `${a} and ${b}`
      : a;
  return { deckName: best.deckName, shared };
}

/**
 * One tag set per built deck, from its commander's index row.
 *
 * Two decks sharing an archetype count once, which is deliberate (gap 6): you
 * have played it or you have not, so the sort cannot express "a little".
 * A deck whose commander is not indexed contributes an empty set rather than
 * being dropped, so it can still be the nearest deck for nothing.
 */
export async function loadPlayedTags(userId: string): Promise<DeckTagSet[]> {
  // The `cards` join is what carries each deck's colour identity: `decks` stores
  // only the commander's oracle id, and Task 19's built clause needs the colours.
  const built = await db
    .select({
      name: decks.name,
      oracleId: decks.commanderOracleId,
      colorIdentity: cards.colorIdentity,
    })
    .from(decks)
    .innerJoin(cards, eq(cards.oracleId, decks.commanderOracleId))
    .where(eq(decks.userId, userId));
  if (built.length === 0) return [];

  const support = await db
    .select({ oracleId: commanderSupport.commanderOracleId, tags: commanderSupport.tags })
    .from(commanderSupport)
    .where(inArray(commanderSupport.commanderOracleId, built.map((d) => d.oracleId)));

  // `commanderSupport.tags` is `jsonb().notNull()`, so no `?? []` on the value.
  const byOracleId = new Map(support.map((s) => [s.oracleId, s.tags]));
  return built.map((d) => ({
    deckName: d.name,
    colorIdentity: d.colorIdentity,
    slugs: new Set((byOracleId.get(d.oracleId) ?? []).map((t) => t.slug)),
  }));
}
```

- [ ] **Step 4: Run them and watch them pass**

Run: `pnpm vitest run src/lib/discovery/novelty.test.ts`
Expected: PASS. Check the tie-break case specifically — it is the one that fails if the deck sort is dropped.

- [ ] **Step 5: Pre-push gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add src/lib/discovery/novelty.ts src/lib/discovery/novelty.test.ts
git commit -m "feat(discovery): novelty tag distance and buildability floor"
```

### Task 7: The two orderings

**Files:**
- Modify: `src/lib/discovery/novelty.ts`
- Test: `src/lib/discovery/novelty.test.ts`

**Interfaces:**
- Produces: `byFit(a, b): number` and `byNovelty(a, b): number`, both over `{ ownedSupport: number; unplayedCount: number; oracleId: string }`.

- [ ] **Step 1: Write the failing test**

```ts
import { byFit, byNovelty } from "./novelty";

const r = (oracleId: string, ownedSupport: number, unplayedCount: number) =>
  ({ oracleId, ownedSupport, unplayedCount });

describe("orderings", () => {
  it("fit sorts on raw overlap, never on a ratio", () => {
    // Ruling 3: fit sorts on overlap. A 40-card list with 20 owned ranks BELOW
    // a 600-card list with 30 owned, and that is the settled behaviour.
    expect([r("a", 20, 0), r("b", 30, 0)].sort(byFit).map((x) => x.oracleId))
      .toEqual(["b", "a"]);
  });

  it("fit breaks ties on oracle id, so two renders agree", () => {
    expect([r("b", 5, 0), r("a", 5, 0)].sort(byFit).map((x) => x.oracleId))
      .toEqual(["a", "b"]);
  });

  it("novelty sorts on unplayed tags, then overlap, then id", () => {
    const rows = [r("a", 90, 1), r("b", 10, 4), r("c", 50, 4)];
    expect(rows.sort(byNovelty).map((x) => x.oracleId)).toEqual(["c", "b", "a"]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/discovery/novelty.test.ts`
Expected: FAIL — `byFit` is not exported.

- [ ] **Step 3: Implement**

```ts
type Ordered = { ownedSupport: number; unplayedCount: number; oracleId: string };

const byOracleId = (a: Ordered, b: Ordered) =>
  a.oracleId === b.oracleId ? 0 : a.oracleId < b.oracleId ? -1 : 1;

/** Ruling 3: one sort key each, no blend. Overlap, then the id — the same
    canonical-UUID tiebreak `byScoreThenOracleId` uses, for the same reason. */
export function byFit(a: Ordered, b: Ordered): number {
  return b.ownedSupport - a.ownedSupport || byOracleId(a, b);
}

/** Distance first. Overlap is the tiebreak only — it is a floor, not a term,
    so it can separate two commanders that are equally new but never outrank
    newness itself. */
export function byNovelty(a: Ordered, b: Ordered): number {
  return b.unplayedCount - a.unplayedCount
    || b.ownedSupport - a.ownedSupport
    || byOracleId(a, b);
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/discovery/novelty.test.ts`
Expected: PASS.

- [ ] **Step 5: Pre-push gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add src/lib/discovery/novelty.ts src/lib/discovery/novelty.test.ts
git commit -m "feat(discovery): fit and novelty orderings"
```

---

## Phase 6 — Detail pages for unbuilt commanders

One PR. **This closes a live dead link.** Every discovery row is a stretched `<Link href={`/commanders/${slug}`}>` (`rec-card.tsx:136`), and `/commanders/[slug]` resolves a slug only through `findScoredCommander` (owned scope, persisted) then `getRankedList` (owned scope, computed) — so today a commander outside the owned ranking 404s, and `scoreOneCommander` returns `null` for any commander not in the collection anyway. Discovery ships ~3,100 rows whose links land nowhere unless this is fixed.

No design round-trip is needed: the detail page's `rank` for a discovery commander is its position in the discovery fit ranking — the same number its row showed — so `CommanderDetail`'s contract does not change.

### Task 8: A deterministic discovery slug index

**Files:**
- Create: `src/lib/discovery/slugs.ts`
- Test: `src/lib/discovery/slugs.test.ts`

**Interfaces:**
- Consumes: `commanderSlug` from `src/lib/edhrec/slug`.
- Produces: `assignDiscoverySlugs<T extends { oracleId: string; name: string }>(rows: T[]): (T & { slug: string })[]`.

- [ ] **Step 1: Write the failing test**

The suffix rule must not follow rank order. `finalizeRecommendations` numbers duplicates in rank order, which is correct for a single ranking but wrong here: discovery has two sorts over the same population, and a slug that changes when the sort changes breaks every link on the page.

```ts
import { describe, expect, it } from "vitest";
import { assignDiscoverySlugs } from "./slugs";

const rows = [
  { oracleId: "ffff", name: "Kenrith, the Returned King" },
  { oracleId: "0000", name: "Kenrith, the Returned King" },
  { oracleId: "aaaa", name: "Atraxa, Praetors' Voice" },
];

describe("assignDiscoverySlugs", () => {
  it("suffixes duplicates by oracle id, not by position", () => {
    const a = assignDiscoverySlugs(rows).map((r) => `${r.oracleId}:${r.slug}`);
    const b = assignDiscoverySlugs([...rows].reverse()).map((r) => `${r.oracleId}:${r.slug}`);
    expect(new Set(a)).toEqual(new Set(b));
  });

  it("gives the lowest oracle id the unsuffixed slug", () => {
    const got = assignDiscoverySlugs(rows);
    expect(got.find((r) => r.oracleId === "0000")!.slug)
      .toBe("kenrith-the-returned-king");
    expect(got.find((r) => r.oracleId === "ffff")!.slug)
      .toBe("kenrith-the-returned-king-2");
  });

  it("leaves a unique name unsuffixed", () => {
    expect(assignDiscoverySlugs(rows).find((r) => r.oracleId === "aaaa")!.slug)
      .toBe("atraxa-praetors-voice");
  });
});
```

Confirm the exact slug strings `commanderSlug` produces before running — if it strips apostrophes differently, use its real output rather than editing the function.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/discovery/slugs.test.ts`
Expected: FAIL — "Failed to resolve import ./slugs".

- [ ] **Step 3: Implement**

```ts
import { commanderSlug } from "../edhrec/slug";

/**
 * Slugs keyed on oracle id, never on rank.
 *
 * `finalizeRecommendations` numbers duplicate names in rank order, which is
 * fine for one ranking. Discovery has two, over the same population — a slug
 * that moved when the sort flipped would silently re-point every duplicate's
 * link at the other commander. Ordering the shared-base group by oracle id
 * makes the assignment a property of the data instead of the view.
 */
export function assignDiscoverySlugs<T extends { oracleId: string; name: string }>(
  rows: T[],
): (T & { slug: string })[] {
  const byBase = new Map<string, T[]>();
  for (const r of rows) {
    const base = commanderSlug(r.name);
    const group = byBase.get(base);
    if (group) group.push(r);
    else byBase.set(base, [r]);
  }

  const slugByOracleId = new Map<string, string>();
  for (const [base, group] of byBase) {
    group.sort((a, b) => (a.oracleId < b.oracleId ? -1 : a.oracleId > b.oracleId ? 1 : 0));
    group.forEach((r, i) => slugByOracleId.set(r.oracleId, i === 0 ? base : `${base}-${i + 1}`));
  }

  return rows.map((r) => ({ ...r, slug: slugByOracleId.get(r.oracleId)! }));
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/discovery/slugs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/discovery/slugs.ts src/lib/discovery/slugs.test.ts
git commit -m "feat(discovery): oracle-id-keyed slug assignment"
```

### Task 9: Score a commander the player does not own

**Files:**
- Modify: `src/lib/recs/recommend.ts:201-221`
- Create: `src/lib/recs/recommend-detail.test.ts`

**A new test file, not an append.** `recommend.test.ts:4` already does
`vi.mock("../../db", () => ({ db: {} }))` — a bare object with no `select`. This
test needs a chained `select().from()...` for both `loadCollectionPool` and
`loadPoolCard`, and widening the shared mock would put every existing case in
that file at risk for no gain. Vitest module mocks are per-file, so a second file
gets its own `db` without touching the first.

**Interfaces:**
- Consumes: `loadCollectionPool`, `scoreCommander`, `PoolCard`.
- Produces: `scoreOneCommander` returns a `RankedCommander` for a commander that is in `cards` but not in the collection, and still returns `null` for an oracle id that is in neither.

- [ ] **Step 1: Write the failing test**

Mock the db chain per `synergy-read.test.ts`. The behaviour under test is the fallback branch, so the assertion is on the returned commander's identity and on a zeroed pool, not on scoring maths.

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Two queries, two shapes. `loadCollectionPool` ends at `.orderBy`,
// `loadPoolCard` at `.limit` — the mock returns a chain that answers both and
// hands back whichever array the test armed.
const pool = vi.hoisted(() => ({ collection: [] as unknown[], card: [] as unknown[] }));

vi.mock("../../db", () => ({
  db: {
    selectDistinctOn: () => ({
      from: () => ({
        innerJoin: () => ({ where: () => ({ orderBy: () => Promise.resolve(pool.collection) }) }),
      }),
    }),
    select: () => ({
      from: () => ({ where: () => ({ limit: () => Promise.resolve(pool.card) }) }),
    }),
  },
}));

vi.mock("../edhrec/client", () => ({
  readEdhrecCache: vi.fn(async () => new Map()),
  resolveEdhrecData: vi.fn(async () => ({ data: null, unreachable: false })),
}));

import { scoreOneCommander } from "./recommend";

const card = (over: Record<string, unknown>) => ({
  oracleId: "x", name: "X", typeLine: "Legendary Creature — Angel",
  oracleText: null, keywords: [], colorIdentity: ["W"], commanderLegal: true,
  imageUri: null, manaCost: "{3}{W}", ...over,
});

beforeEach(() => {
  pool.collection = [];
  pool.card = [];
});

describe("scoreOneCommander", () => {
  it("scores a commander that is not in the collection", async () => {
    pool.collection = [card({ oracleId: "owned-1", name: "Owned" })];
    pool.card = [card({ oracleId: "unowned", name: "Atraxa, Praetors' Voice" })];

    const got = await scoreOneCommander("user", "unowned", "atraxa");
    expect(got).not.toBeNull();
    expect(got!.name).toBe("Atraxa, Praetors' Voice");
    // The one owned card is colour-legal and is not the commander, so the pool
    // is 1: nothing is subtracted for a commander that was never in it.
    expect(got!.colorPoolSize).toBe(1);
  });

  it("still returns null for an oracle id that is in no table", async () => {
    expect(await scoreOneCommander("user", "nonsense", "nonsense")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/recs/recommend-detail.test.ts`
Expected: FAIL — the first case returns `null`.

- [ ] **Step 3: Implement the fallback**

Replace the early return in `scoreOneCommander`:

```ts
  const { collection } = await loadCollectionPool(userId);
  // A discovery commander is by definition one the player may not own, so a
  // collection miss is an ordinary case here rather than a 404. The pool and the
  // role logic are unaffected: `commanderPool` already excludes the commander
  // itself, and a commander outside the collection was never in the pool.
  const commander =
    collection.find((c) => c.oracleId === oracleId) ?? (await loadPoolCard(oracleId));
  if (!commander) return null;
```

and add, beside it:

```ts
/** One card as a `PoolCard`, for a commander outside the player's collection. */
async function loadPoolCard(oracleId: string): Promise<PoolCard | null> {
  const [row] = await db
    .select({
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      oracleText: cards.oracleText, keywords: cards.keywords,
      colorIdentity: cards.colorIdentity, imageUri: cards.imageUri,
      manaCost: cards.manaCost,
    })
    .from(cards)
    .where(eq(cards.oracleId, oracleId))
    .limit(1);
  return row ?? null;
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/recs/recommend-detail.test.ts`
Expected: PASS, both cases.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recs/recommend.ts src/lib/recs/recommend-detail.test.ts
git commit -m "fix(commanders): score a commander outside the collection"
```

### Task 10: Resolve a discovery slug on the detail route

**Files:**
- Modify: `src/app/commanders/[slug]/page.tsx:22-40`
- Modify: `src/lib/discovery/list.ts` — deferred to Phase 7; until then this task imports `loadCandidates` + `assignDiscoverySlugs` directly.

- [ ] **Step 1: Add the third resolution step**

After the `getRankedList` miss, before `notFound()`:

```ts
    const idx = items.findIndex((i) => i.slug === slug);
    if (idx !== -1) {
      found = { oracleId: items[idx].oracleId, rank: idx + 1, anyDegraded: false };
    } else {
      // Third and last: the discovery ranking. A commander the player has not
      // built has no persisted score and no place in the owned list, but its
      // row on /commanders?scope=play links here — resolving it anywhere else
      // would 404 roughly 3,100 rows.
      const { collection } = await loadCollectionPool(userId);
      const rows = assignDiscoverySlugs(
        await loadCandidates(userId, collection.map((c) => c.oracleId)),
      ).sort((a, b) => byFit(
        { ...a, unplayedCount: 0 }, { ...b, unplayedCount: 0 },
      ));
      const at = rows.findIndex((r) => r.slug === slug);
      if (at === -1) notFound();
      // The rank the row itself showed: position in the fit ranking, which is
      // discovery's default and the only ordering this page can name.
      found = { oracleId: rows[at].oracleId, rank: at + 1, anyDegraded: false };
    }
```

- [ ] **Step 2: Verify by hand**

```bash
pnpm dev
```

Open `/commanders/atraxa-praetors-voice` while signed in as a local-dev fixture account that does **not** own Atraxa.
Expected: the detail page renders, with a rank numeral and the role panels computed against the player's collection. Before this task it was a 404.

- [ ] **Step 3: Pre-push gate, then open the PR**

```bash
pnpm typecheck && pnpm lint && pnpm test
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
git add "src/app/commanders/[slug]/page.tsx"
git commit -m "fix(commanders): resolve discovery slugs on the detail route"
```

---

## Phase 7 — The orchestrator

One PR. Everything the discovery branch of the page needs, in one call. No UI yet.

### Task 11: `loadDiscovery`

**Files:**
- Create: `src/lib/discovery/list.ts`
- Test: `src/lib/discovery/list.test.ts`

**Interfaces:**
- Consumes: `loadCandidates`, `loadPrices`/`slotFor`, `loadPlayedTags`/`unplayedTags`/`clearsFloor`/`floorPct`/`nearestDeck`/`byFit`/`byNovelty`, `assignDiscoverySlugs`, `buildPoolRollup`/`rollupFor`, `loadCollectionPool`, `loadAvailability`, `freePool`.
- Produces:

```ts
export type DiscoveryItem = {
  oracleId: string;
  slug: string;
  name: string;
  colorIdentity: string[];
  imageUri: string | null;
  /** Rank in the active ordering, over the FULL pre-filter set. */
  rank: number;
  owned: boolean;
  ownedSupport: number;
  edhrecTotal: number | null;
  colorPoolSize: number;
  roleCounts: Record<RoleName, number>;
  counts: ReceiptCounts;
  price: PriceSlot;
  tagTotal: number;
  unplayedLabels: string[];
  unplayedCount: number;
  nearestDeck: { deckName: string; shared: string } | null;
  floorPct: number | null;
};

export type DiscoveryList = {
  items: DiscoveryItem[];
  /** Population under this scope, before colour filtering. */
  candidateCount: number;
  /** Collection size the subtitle reads against. */
  cardsRead: number;
  /** Highest floor percentage among candidates the floor excluded — the number
      `empty.floorBody` needs so 30% does not read as arbitrary. Null when the
      floor excluded nothing, or when no candidate had a denominator. */
  bestPct: number | null;
  /** How many tagged candidates the floor removed. An empty `items` under
      `new` means "everything is untagged" when this is 0 and "the floor took
      them all" when it is not — Task 19 renders a different state for each,
      and `bestPct` alone cannot tell them apart. */
  floorExcluded: number;
  hasDecks: boolean;
  /** One entry per built deck, its commander's colour identity. Task 19's
      `empty.filteredBuiltClause` counts against it; nothing else reads it. */
  deckIdentities: string[][];
  sort: "fit" | "new";
};

export function loadDiscovery(
  userId: string,
  opts: { sort: "fit" | "new"; avail: "all" | "free" },
): Promise<DiscoveryList>;
```

`DiscoveryItem` deliberately carries **no** `receipts` string, no `score`, no `fitPool`/`fitRoles`/`fitSynergy` and no `synergyState`: none of them renders under discovery, and at 3,334 rows every unrendered field is payload.

- [ ] **Step 1: Write the failing test for the pure assembly**

Extract the assembly from the reads so it can be tested without a database.

```ts
import { describe, expect, it } from "vitest";
import { buildPoolRollup } from "../recs/pool-rollup";
import { assembleDiscovery } from "./list";

const candidate = (over: Partial<Parameters<typeof assembleDiscovery>[0]["candidates"][0]>) => ({
  oracleId: "a", name: "A",
  colorIdentity: ["G"], imageUri: null, edhrecTotal: 100, tags: [], ownedSupport: 50,
  ...over,
});

describe("assembleDiscovery", () => {
  const base = {
    candidates: [
      candidate({ oracleId: "a", name: "A", ownedSupport: 50,
                  tags: [{ slug: "counters", label: "Counters", count: 3 }] }),
      candidate({ oracleId: "b", name: "B", ownedSupport: 10, tags: [] }),
      candidate({ oracleId: "c", name: "C", ownedSupport: 90,
                  tags: [{ slug: "blink", label: "Blink", count: 2 }] }),
    ],
    ownedOracleIds: new Set(["a"]),
    playedTags: [{ deckName: "Zur", colorIdentity: ["W", "U", "B"], slugs: new Set(["blink"]) }],
    prices: new Map(),
    // A real rollup, empty: this suite is about assembly, and Phase 2's own test
    // is what proves the rollup correct. `undefined` here throws in `rollupFor`.
    rollup: buildPoolRollup([], new Map()),
    cardsRead: 2805,
  };

  it("ranks the full pre-filter set, so rank survives colour filtering", () => {
    const got = assembleDiscovery({ ...base, sort: "fit" });
    expect(got.items.map((i) => i.oracleId)).toEqual(["c", "a", "b"]);
    expect(got.items.map((i) => i.rank)).toEqual([1, 2, 3]);
  });

  it("drops untagged commanders from the novelty sort only", () => {
    expect(assembleDiscovery({ ...base, sort: "fit" }).items.map((i) => i.oracleId))
      .toContain("b");
    expect(assembleDiscovery({ ...base, sort: "new" }).items.map((i) => i.oracleId))
      .not.toContain("b");
  });

  it("excludes a commander below the floor and reports the nearest miss", () => {
    const low = { ...base, candidates: [candidate({ ownedSupport: 20,
      tags: [{ slug: "counters", label: "Counters", count: 1 }] })] };
    const got = assembleDiscovery({ ...low, sort: "new" });
    expect(got.items).toEqual([]);
    expect(got.bestPct).toBe(20);
  });

  it("counts the population before the floor, so the subtitle is not the sort's count", () => {
    expect(assembleDiscovery({ ...base, sort: "new" }).candidateCount).toBe(3);
  });

  it("marks a candidate the player owns", () => {
    const got = assembleDiscovery({ ...base, sort: "fit" });
    expect(got.items.find((i) => i.oracleId === "a")!.owned).toBe(true);
    expect(got.items.find((i) => i.oracleId === "c")!.owned).toBe(false);
  });
});
```

`list.test.ts` imports `buildPoolRollup` rather than mocking it: `pool-rollup.ts` is pure and touches no database, so the real one is both cheaper and truer than a stub.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/discovery/list.test.ts`
Expected: FAIL — "Failed to resolve import ./list".

- [ ] **Step 3: Implement `assembleDiscovery`, then `loadDiscovery` around it**

```ts
export function assembleDiscovery(input: {
  candidates: CandidateRow[];
  ownedOracleIds: Set<string>;
  playedTags: DeckTagSet[];
  prices: Map<string, PriceAggRow>;
  rollup: PoolRollup;
  cardsRead: number;
  sort: "fit" | "new";
}): DiscoveryList {
  const played = new Set(input.playedTags.flatMap((d) => [...d.slugs]));

  const withSlugs = assignDiscoverySlugs(input.candidates);

  const enriched = withSlugs.map((c) => {
    const unplayed = unplayedTags(c.tags, played);
    const owned = input.ownedOracleIds.has(c.oracleId);
    return {
      ...rollupFor(input.rollup, c),
      oracleId: c.oracleId, slug: c.slug, name: c.name,
      colorIdentity: c.colorIdentity, imageUri: c.imageUri,
      owned,
      ownedSupport: c.ownedSupport,
      edhrecTotal: c.edhrecTotal,
      price: slotFor(input.prices.get(c.oracleId), owned),
      tagTotal: c.tags.length,
      unplayedLabels: unplayed.map((t) => t.label),
      unplayedCount: unplayed.length,
      nearestDeck: nearestDeck(c.tags, input.playedTags),
      floorPct: floorPct(c),
      _tags: c.tags,
    };
  });

  // The novelty sort has two exclusions and they are different failures:
  // an untagged commander has no distance to measure (ruling 5), and a
  // commander below the floor has a distance the player could not act on
  // (ruling 4). Both leave the list; only the second feeds `bestPct`.
  const active =
    input.sort === "new"
      ? enriched.filter((c) => c._tags.length > 0 && clearsFloor(c))
      : enriched;

  const excluded =
    input.sort === "new"
      ? enriched.filter((c) => c._tags.length > 0 && !clearsFloor(c))
      : [];
  const bestPct = excluded.reduce<number | null>(
    (best, c) => (c.floorPct == null ? best : best == null ? c.floorPct : Math.max(best, c.floorPct)),
    null,
  );

  const ordered = [...active].sort(input.sort === "new" ? byNovelty : byFit);

  return {
    items: ordered.map(({ _tags, ...item }, i) => ({ ...item, rank: i + 1 })),
    candidateCount: input.candidates.length,
    cardsRead: input.cardsRead,
    bestPct,
    floorExcluded: excluded.length,
    hasDecks: input.playedTags.length > 0,
    deckIdentities: input.playedTags.map((d) => d.colorIdentity),
    sort: input.sort,
  };
}
```

and the reads around it:

```ts
/**
 * `avail: "free"` swaps the owned oracle-id set for the free pool's and changes
 * nothing else — the free ranking is the same question asked of a smaller pool,
 * the way `rankFree` already treats it. It re-ranks and it does not annotate:
 * `ScoreDelta` has no place under discovery, because there is no `score /100`
 * for it to be a delta of.
 *
 * Only the active (sort, avail) pair is computed. The owned scope ships both
 * rankings so its toggle is a client swap; at 3,334 rows two payloads is the
 * wrong trade, and the handoff already permits a sort flip to be a fetch.
 */
export async function loadDiscovery(
  userId: string,
  opts: { sort: "fit" | "new"; avail: "all" | "free" },
): Promise<DiscoveryList> {
  const { collection } = await loadCollectionPool(userId);

  let availability = new Map<string, Availability>();
  try {
    availability = await loadAvailability(userId, {
      oracleIds: collection.map((c) => c.oracleId),
    });
  } catch {
    // Fail soft, exactly as the owned scope does: the clause and `What's free`
    // are lost, the ranking is not. The caller reads `availOk` from its own
    // attempt; discovery just scores against the whole collection.
  }

  const scored = opts.avail === "free" ? freePool(collection, availability) : collection;
  const candidates = await loadCandidates(userId, scored.map((c) => c.oracleId));

  const [prices, playedTags] = await Promise.all([
    loadPrices(candidates.map((c) => c.oracleId)),
    loadPlayedTags(userId),
  ]);

  return assembleDiscovery({
    candidates,
    ownedOracleIds: new Set(collection.map((c) => c.oracleId)),
    playedTags,
    prices,
    rollup: buildPoolRollup(scored, availability),
    cardsRead: collection.length,
    sort: opts.sort,
  });
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/discovery/list.test.ts`
Expected: PASS, all five cases.

- [ ] **Step 5: Time the whole thing against the real database**

```bash
pnpm tsx -e '
import { loadDiscovery } from "./src/lib/discovery/list";
console.time("fit"); const a = await loadDiscovery("<local-dev user id>", { sort: "fit", avail: "free" }); console.timeEnd("fit");
console.time("new"); const b = await loadDiscovery("<local-dev user id>", { sort: "new", avail: "free" }); console.timeEnd("new");
console.log(a.items.length, b.items.length, a.candidateCount, b.bestPct);
console.log(JSON.stringify(a.items[0], null, 2));
process.exit(0);
'
```

Expected: both under a second. `a.items.length === a.candidateCount` (fit excludes nothing); `b.items.length` strictly smaller (the floor and the untagged exclusion both bite). If `fit` takes more than a few seconds, the rollup is not being used — check that nothing calls `commanderPool` per candidate.

- [ ] **Step 6: Pre-push gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add src/lib/discovery/list.ts src/lib/discovery/list.test.ts
git commit -m "feat(discovery): discovery list orchestrator"
```

### Task 12: Point the detail route at the orchestrator

**Files:**
- Modify: `src/app/commanders/[slug]/page.tsx`

- [ ] **Step 1: Replace Task 10's inline resolution**

Task 10 built the discovery ranking by hand because `list.ts` did not exist yet. Swap it for the real thing so one function decides both the row's rank and the detail page's:

```ts
      // The detail page's rank is always the FREE-pool fit rank. The detail
      // route carries no `avail` and no `sort` — it is one URL per commander,
      // and a rank that changed with how the visitor arrived would make the
      // same page say two different things. `free` matches `/commanders`'
      // own default, so the two agree for every visitor who did not opt out.
      const discovery = await loadDiscovery(userId, { sort: "fit", avail: "free" });
      const at = discovery.items.findIndex((i) => i.slug === slug);
      if (at === -1) notFound();
      found = { oracleId: discovery.items[at].oracleId, rank: at + 1, anyDegraded: false };
```

- [ ] **Step 2: Verify the same unowned commander still resolves**

```bash
pnpm dev
```
Open the same `/commanders/<unowned-slug>` URL from Task 10. Expected: renders, and its rank matches the row's on `/commanders?scope=play` (the default, `avail=free`). Under `?avail=all` the row's rank and the detail page's legitimately differ — `ownedSupport` is counted against a different pool — and that is the cost of one URL per commander, not a bug.

- [ ] **Step 3: Pre-push gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add "src/app/commanders/[slug]/page.tsx"
git commit -m "refactor(commanders): resolve discovery slugs through loadDiscovery"
```

---

## Phase 8 — Page wiring

One PR. `?scope` and `?sort` become real; no new pixels yet — the discovery branch renders through the existing view with the existing row, so this phase is provably about data flow.

### Task 13: Parse the two new search params

**Files:**
- Modify: `src/app/commanders/page.tsx:29-36`
- Create: `src/lib/discovery/params.ts`
- Test: `src/lib/discovery/params.test.ts`

**Interfaces:**
- Produces: `parseScope(v: unknown): "owned" | "play"`, `parseSort(v: unknown, hasDecks: boolean): "fit" | "new"`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { parseScope, parseSort } from "./params";

describe("parseScope", () => {
  it("defaults to owned", () => {
    expect(parseScope(undefined)).toBe("owned");
    expect(parseScope("nonsense")).toBe("owned");
    expect(parseScope(["play"])).toBe("owned"); // a repeated param is not a scope
  });
  it("reads play", () => expect(parseScope("play")).toBe("play"));
});

describe("parseSort", () => {
  it("defaults to fit", () => expect(parseSort(undefined, true)).toBe("fit"));
  it("reads new when a deck exists", () => expect(parseSort("new", true)).toBe("new"));
  it("falls back to fit with no deck to compare against", () => {
    // Ruling 8: the option is unavailable with a stated reason, so a URL that
    // names it must land on a real list rather than on an empty one.
    expect(parseSort("new", false)).toBe("fit");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/discovery/params.test.ts`
Expected: FAIL — "Failed to resolve import ./params".

- [ ] **Step 3: Implement**

```ts
export function parseScope(v: unknown): "owned" | "play" {
  return v === "play" ? "play" : "owned";
}

/** `hasDecks` is the gate ruling 8 states: novelty measures distance from what
    you have built, so with nothing built there is no distance and the URL falls
    back rather than rendering an empty list. */
export function parseSort(v: unknown, hasDecks: boolean): "fit" | "new" {
  return v === "new" && hasDecks ? "new" : "fit";
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/discovery/params.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/discovery/params.ts src/lib/discovery/params.test.ts
git commit -m "feat(discovery): scope and sort param parsing"
```

### Task 14: Branch the page on scope

**Files:**
- Create: `src/components/commanders/discovery-view.tsx`
- Modify: `src/app/commanders/page.tsx`

**Interfaces:**
- Consumes: `DiscoveryList` from `src/lib/discovery/list`, `parseScope`/`parseSort` from `./params`.
- Produces: `DiscoveryView({ discovery, avail }: { discovery: DiscoveryList; avail: "all" | "free" })`.

- [ ] **Step 1: Create `DiscoveryView` as a real component, not an adapter**

The discovery list is a **separate client component** from `CommandersView`. It does
not reuse it and does not adapt to it: `CommandersView` takes `CommanderListItem[]`
and holds the owned scope's two client-side rankings and its `ScoreDelta` state,
none of which discovery has. Fabricating a `CommanderListItem` — inventing a
`score`, a `synergyState`, a `receipts` string — would put made-up numbers one
prop away from a surface whose entire premise is that every figure prints its
denominator.

This task builds the skeleton so Phase 8 leaves `main` green; Phases 9–11 fill it in.

```tsx
"use client";

import { useMemo, useState } from "react";
import { filterByColors } from "../../lib/commanders/filter";
// `import type` is required, not stylistic: `src/lib/discovery/list.ts` imports
// `src/db/index.ts`, whose module body throws when DATABASE_URL is unset and
// pulls `ws` and the neon driver in with it. A type-only import is erased at
// compile time, so none of that reaches the client bundle.
import type { DiscoveryList } from "../../lib/discovery/list";
import { RecCard } from "./rec-card";
// Imported, never redeclared: it is 25, and Task 20's `revealBand(1026, 1050, …)`
// only lines up with the shipped control if both windows step by the same number.
import { REVEAL_STEP } from "./reveal-control";

export function DiscoveryView({
  discovery,
  avail,
}: {
  discovery: DiscoveryList;
  avail: "all" | "free";
}) {
  // Setters are deliberately unread until Phases 9 and 11 mount the colour
  // filter and the reveal band. Declaring only the values keeps lint green
  // without a disable comment; those phases widen these two lines.
  const [colors] = useState<string[]>([]);
  const [shown] = useState(REVEAL_STEP);
  const filtered = useMemo(
    () => filterByColors(discovery.items, colors),
    [discovery.items, colors],
  );
  // Ranks come from the server, over the full pre-filter set, so filtering never
  // renumbers — the same invariant CommandersView holds, reached differently.
  return (
    <>
      {/* Phase 9 mounts the scope control and sort menu here. */}
      {/* Phase 11 mounts the empty states and the reveal band here. */}
      <ul>
        {filtered.slice(0, shown).map((item) => (
          <li key={item.oracleId}>
            <RecCard discovery={item} sort={discovery.sort}
                     rank={item.rank} avail={avail} counts={item.counts} />
          </li>
        ))}
      </ul>
      {/* The live region. `CommandersView` has its own at commanders-view.tsx:342,
          but discovery does not render that component, so the scope announce
          (Task 15) and the sort announce (Task 16) would both target a region
          that is not in the tree. This is theirs. */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {/* Phases 9 and 11 set this from their own announce state. */}
      </span>
    </>
  );
}
```

`RecCard` is wrapped in an `<li>` rather than rendering one itself — the same
shape `commanders-view.tsx:706` uses, so the two lists stay structurally alike.

`RecCard`'s discovery props land in Task 17 — until then this file passes
`discovery`/`sort` to a `RecCard` that does not yet accept them, which does not
compile. So **Task 14 also does Task 17 step 0** (the prop union below) and
nothing else of Task 17. The alternative — a placeholder row component deleted in
Phase 10 — is two throwaway commits for one type change.

- [ ] **Step 2: Add the discovery branch to the page**

After the collection-empty guard and before `getRankedList`:

```ts
  const sp = await searchParams;
  const scope = parseScope(sp.scope);

  if (scope === "play") {
    // Discovery does NOT call getRankedList, rankFree or receiptCountsByCommander:
    // all three are shaped for the 242-row owned scope, and two of them walk the
    // collection once per commander. loadDiscovery answers the same questions
    // from the offline index in one pass.
    const decksBuilt = await listRecentDecks(userId, 1);
    const sort = parseSort(sp.sort, decksBuilt.length > 0);
    const discovery = await loadDiscovery(userId, { sort, avail });
    return (
      <section className="flex flex-col min-h-screen">
        <DiscoveryView discovery={discovery} avail={avail} />
      </section>
    );
  }
```

- [ ] **Step 3: Verify both scopes by hand**

```bash
pnpm dev
```
The skeleton renders unstyled rows: `RecCard`'s discovery arm returns null until
Task 17, so what you are checking here is the branch and the row **count**, not
the rendering. Count `<li>` elements in the inspector.

- `/commanders` — unchanged from today. Compare the first five rows against `main`.
- `/commanders?scope=play` — roughly 3,300 `<li>`s minus the built commanders, against ~242 on the owned scope. If the two counts are close, the branch did not take.
- `/commanders?scope=play&sort=new` — strictly fewer `<li>`s than `&sort=fit`, because the floor removes rows the fit list keeps. Equal counts means the floor is not applied.
- `/commanders?scope=play&sort=new` **signed in as a fixture account with no decks** — the same count as `&sort=fit`, i.e. it fell back to the fit list rather than rendering empty.

- [ ] **Step 4: Pre-push gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
git add src/app/commanders/page.tsx src/components/commanders/discovery-view.tsx src/components/commanders/rec-card.tsx
git commit -m "feat(discovery): branch /commanders on scope"
```

---

## Phase 9 — The two controls

One PR. Design-review skill before `gh pr create`; mobile and desktop in the same PR.

Reference: `CONTROLS-four-above-one-list.md` in full, plus the `Scope control`, `Header subtitle`, `Sort trigger`, `Sort menu` and `— disabled option` rows of the README's component-notes table.

**The four rejected shapes are recorded in that document. Do not re-derive them.** Scope is not a tab strip, sort is not two more segments on `Score against`, and there is no second control bar.

### Task 15: Scope control in the page header

**Files:**
- Create: `src/components/commanders/scope-control.tsx`
- Modify: `src/components/commanders/page-header.tsx`

**Interfaces:**
- Consumes: `discoveryCopy.scope`.
- Produces: `ScopeControl({ scope, onChange }: { scope: "owned" | "play"; onChange: (s: "owned" | "play") => void })`.

- [ ] **Step 1: Build the control**

Copy the shipped `ScoreAgainst` segmented geometry from `commanders-view.tsx:65-150` — same radiogroup, same segment shape, 32px desktop and 38px full-width halves at 390px. Label `discoveryCopy.scope.label`. Desktop labels `scope.owned` / `scope.play`; phone labels `scope.ownedShort` / `scope.playShort`. `aria-label` per segment from `scope.ownedAria` / `scope.playAria`.

One element with responsive classes, not two subtrees — a duplicated subtree passes the design-review verify step on both columns while shipping the markup twice.

- [ ] **Step 2: Wire the subtitle**

`PageHeader` today renders `${uniqueCardsRead.toLocaleString("en-US")} cards scanned` plus, when `avail` is set, `availabilityCopy.ranking.subtitleFree` / `subtitleAll` (`page-header.tsx:21-29`). Add props `scope`, `sort`, `candidateCount`, `cardsRead`, and choose:
- `scope === "owned"` → `discoveryCopy.scope.subtitleOwned(candidateCount, cardsRead)`
- `scope === "play"` → `discoveryCopy.scope.subtitlePlay(candidateCount, cardsRead, sort)`

**Keep the availability clause.** The handoff's two subtitle strings do not
include it, but dropping it would silently remove the only place `/commanders`
says whether it ranked against the free pool or everything owned — a regression
on a shipped surface, and one this feature has no reason to cause. Append it as
today, so the line reads `… · read against N cards · <availability clause>`. Note
it in the PR body for Design to ratify; do not open a round-trip over it.

**Keep the no-props branch.** `PageHeader` is also rendered from the
`candidateCount === 0` and collection-empty paths with `uniqueCardsRead` alone.
All four new props stay optional, and with `scope` absent the header renders
exactly today's line.

Mono 12px `--fg-faint`, 10.5px on phone. Do not add a `toLocaleString` call for the copy module's own figures — it already formats them.

- [ ] **Step 3: Navigate on change**

```tsx
const router = useRouter();
const [, startTransition] = useTransition();

function setScope(next: "owned" | "play") {
  const params = new URLSearchParams(window.location.search);
  if (next === "play") params.set("scope", "play"); else params.delete("scope");
  params.delete("sort");   // a scope flip cannot carry a sort the other scope has no control for
  startTransition(() => router.replace(`?${params}`, { scroll: false }));
}
```

No pending styling on the list: the handoff forbids either control animating it. Do not add `opacity`, a skeleton, or a spinner to the rows.

- [ ] **Step 4: Announce the flip**

A scope flip changes the whole population, so it announces like the sort flip
does — `discoveryCopy.scope.announce(scope, count, sort)` on **`DiscoveryView`'s
own live region**, the `sr-only aria-live="polite"` span Task 14 added. Not
`commanders-view.tsx:342`: that region belongs to `CommandersView`, which the
discovery branch does not render, so a message sent there is announced to nobody.
Hold the message in a `useState<string>` in `DiscoveryView` and pass the setter
down. One region carries all three messages (scope, sort, reveal); a second would
make two of them inaudible.

`count` is the post-flip `candidateCount`, so the announcement is written after
the server round-trip resolves, not optimistically at click time.

- [ ] **Step 5: Verify both widths**

```bash
pnpm dev
```
At 1280px and at 390px: the segments render, flipping changes the URL and the subtitle, the list does not animate, and the header does not become sticky.

- [ ] **Step 6: Commit**

```bash
git add src/components/commanders/scope-control.tsx src/components/commanders/page-header.tsx
git commit -m "feat(discovery): scope control and header subtitle"
```

### Task 16: Sort menu in the `Order` slot

**Files:**
- Create: `src/components/commanders/sort-menu.tsx`
- Modify: `src/components/commanders/commanders-view.tsx` (the filter bar's `Order: Fit ↓ · fixed` label)

**Interfaces:**
- Consumes: `discoveryCopy.sort`.
- Produces: `SortMenu({ sort, hasDecks, onChange })`.

- [ ] **Step 1: Replace the label with the trigger, under discovery only**

Under the owned scope the slot reverts to the shipped inert label **verbatim** — same pixels, same text. Under discovery it becomes a trigger: 30px desktop / 38px phone, mono 11.5px, `▾` in `--accent`, `aria-label` from `sort.triggerAria(currentLabel)`.

- [ ] **Step 2: Build the menu**

`--surface-rail` on `1px --border-strong`, radius 10px, 6px pad, width 300px. Each option: 11px/12px pad, radius 7px, 6px diamond (filled `--accent` when selected, `1.5px --border-strong` otherwise), label 13.5px 600 `--fg`, sub-line mono 10.5px `--fg-faint`. Selected row background `--elevated-hover`.

- Option 1: label `sort.fit`, sub-line `sort.fitKey`, `aria-label` `sort.fitAria`.
- Option 2: label `sort.new`, sub-line `sort.newKey`, `aria-label` `sort.newAria`.

- [ ] **Step 3: The disabled option**

When `hasDecks === false`, option 2 gets `aria-disabled` (**not** `disabled`), label in `--fg-locked` with `line-through`, and its sub-line becomes `sort.newDisabled` at full `--fg-faint`. `aria-label` is `sort.newDisabledAria`. Three signals — strikethrough, colour, and the reason in words — matching the shipped disabled `What's free` segment. Clicking it does nothing and does not close the menu.

- [ ] **Step 4: Navigate and announce**

Same `router.replace(..., { scroll: false })` transition as Task 15, setting/deleting `sort`. Announce `discoveryCopy.sort.announce(sort, count)` on **`DiscoveryView`'s own** live region — the span Task 14 added, through the same state Task 15 set up. One region, three messages (scope, sort, reveal). Do not add a second, and do not reach for `commanders-view.tsx:342`, which is not in this tree.

- [ ] **Step 5: Verify**

At 1280px and 390px, signed in as a fixture account **with** decks and one **without**:
- With decks: both options selectable; choosing `Something new` changes the URL, the list and the subtitle.
- Without: option 2 is struck through, states its reason, does not respond to a click, and a screen reader reads `sort.newDisabledAria`.
- Owned scope: the slot is the shipped label again, unchanged.

- [ ] **Step 6: Design-review skill, then commit**

```bash
git add src/components/commanders/sort-menu.tsx src/components/commanders/commanders-view.tsx
git commit -m "feat(discovery): sort menu in the order slot"
```

---

## Phase 10 — The discovery row

One PR. Design-review skill before `gh pr create`.

`RecCard` takes a `sort` prop — **one component, not two.** Reference: the README's `Justification slot`, `Ranking figure`, `Ownership pip`, `Ownership clause`, `Price slot` and `Untagged note` rows, plus `STATES-price-and-empties.md`.

### Task 17: The justification slot and the ranking figure

**Files:**
- Modify: `src/components/commanders/rec-card.tsx`

**Interfaces:**
- Consumes: `DiscoveryItem` (**`import type`** — `src/lib/discovery/list.ts` reaches `src/db/index.ts`, which throws at module scope without `DATABASE_URL`; `rec-card.tsx` carries no `"use client"` of its own but only ever renders inside one), `discoveryCopy.justify`.
- Produces: `RecCardProps` becomes a union — the owned arm keeps `commander: CommanderListItem`, the discovery arm takes `discovery: DiscoveryItem` and `sort`.

- [ ] **Step 0: The prop union and the signature rewrite (done in Task 14, restated here because it is this task's premise)**

Today `RecCardProps` requires `commander: CommanderListItem` and the body calls
`fitSegments(c)` unconditionally at `rec-card.tsx:112`. `DiscoveryItem` has no
`score`, `fitPool`/`fitRoles`/`fitSynergy`, `synergyState`, `edhrecOwnedCount` or
`receipts`, so an optional prop would leave `fitSegments` reading `undefined`.

```ts
type RecCardCommon = {
  rank: number;
  avail: "all" | "free";
  counts: ReceiptCounts;
};

type RecCardProps =
  | (RecCardCommon & { commander: CommanderListItem; delta: ScoreDelta | null;
                       discovery?: undefined; sort?: undefined })
  | (RecCardCommon & { discovery: DiscoveryItem; sort: "fit" | "new";
                       delta?: null; commander?: undefined });
```

This is a **signature rewrite, not just a type change.** `rec-card.tsx:110`
destructures in the parameter list — `export function RecCard({ commander: c, … })`
— which is exactly what a union cannot survive: `c` would be `CommanderListItem |
undefined` for the whole body. Take the props object whole and narrow first:

```ts
export function RecCard(props: RecCardProps) {
  if (!props.commander) return null; // Task 17 step 1 replaces this with the discovery arm.
  const { commander: c, rank, avail, counts, delta } = props;
  const gradient = commanderGradient(c.colorIdentity);
  // … the rest of today's body, unchanged.
}
```

The early return is what makes Task 14 compile: the discovery arm renders nothing
until this task's steps 1–2 fill it in, and Task 14's hand-verification counts
`<li>` wrappers rather than reading rows for exactly that reason. Steps 1 and 2
below replace `return null` with the discovery rendering. The discriminant is the
presence of `commander`, so TypeScript narrows both arms without a runtime flag,
and the owned scope's call sites are unchanged.

- [ ] **Step 1: One slot, contents chosen by the sort key**

Row 3 of the evidence column, replacing the Synergy line.
- `sort === "fit"`: label `justify.overlapLabel` (mono 10px uppercase `--fg-faint`), a 110–120×6px track `--elevated` with an `--accent` fill at `ownedSupport / edhrecTotal`, and the sentence `justify.overlap(ownedSupport, edhrecTotal)` at mono 12px `--fg-body` with N and M in `--fg` 600 (`justify.overlapShort` at 390px). `aria-label` from `justify.overlapAria(ownedSupport, edhrecTotal, name)`.
- `sort === "new"`: label `justify.distanceLabel`, sentence 13.5px `--fg-body`, tag names in `--accent` 600 via `justify.tagList(unplayedLabels.slice(0, 3), Math.max(0, unplayedCount - 3))`, then the deck clause — `justify.distanceNone` when `nearestDeck` is null, else `justify.distanceNear(nearestDeck.deckName, nearestDeck.shared)`. `aria-label` from `justify.distanceAria(unplayedCount, tagTotal)` — the tag names read as a list to a screen reader otherwise, and the count is the claim. **No bar.**

The accent marks the sort key and nothing else: roles, receipts, ownership and price stay neutral in both sorts.

- [ ] **Step 2: The ranking figure**

Fit: mono 600 30–34px `--fg` showing `ownedSupport`, then `justify.figureUnitFit(edhrecTotal)` mono 13px `--fg-faint`; label `justify.figureLabelFit` mono 10px `--accent` uppercase `letter-spacing: .16em`; full-width 6px track beneath.

Novelty: same geometry, `unplayedCount` + `justify.figureUnitNew(tagTotal)`, label `justify.figureLabelNew`, **no track**, then the floor line — mono 11.5px `--fg-faint` with the percentage in `--fg-body`, from `justify.floorNote(floorPct)` (`floorNoteShort` at 390px).

`score /100 FIT` does not render under discovery, and `ScoreDelta` is always null.

- [ ] **Step 3: The `edhrecTotal` guard**

When `edhrecTotal` is null, render **neither** figure and fall back to the receipt line alone. Do not invent 99, do not print a bare N, do not substitute the pool size.

- [ ] **Step 4: Verify at both widths, then commit**

```bash
git add src/components/commanders/rec-card.tsx
git commit -m "feat(discovery): justification slot and ranking figure"
```

### Task 18: Ownership pip, ownership clause, price slot, untagged note

**Files:**
- Modify: `src/components/commanders/rec-card.tsx`

**Interfaces:**
- Consumes: `PriceSlot` from `src/lib/discovery/price` (**`import type`**, for the same reason Task 17 gives), `discoveryCopy.ownership`/`price`/`untagged`, and the shipped `availability.ts` strings.

- [ ] **Step 1: The pip**

Rank column, under the numeral; on phone, between the numeral and the name. 6px, `rotate(45deg)`. Owned: `--accent` fill. Unowned: `1.5px --fg-locked`, transparent. It **replaces** the decorative `--border-strong` diamond rather than sitting beside it. `aria-hidden` — the words carry it.

- [ ] **Step 2: The ownership clause**

First clause of the shipped receipt line, always rendered on both scopes' discovery rows so row height never changes between two rows or two players. `ownership.owned` in `--avail-hard-fg`; `ownership.unowned` in `--fg-faint`; `ownership.ownedShort` / `ownership.unownedShort` at 390px. `ownership.ownedAria` / `ownership.unownedAria` lead the row's accessible name, before any figure. The remaining clauses are the shipped `availability.ts` strings, unchanged.

- [ ] **Step 3: The price slot**

Below a `1px --border` hairline at the column's foot. 6px dot, figure mono 12.5px `--fg-body` (`--fg` at three figures, i.e. `cents >= 10000`), `price.source` mono 10px `--fg-locked`, right.
- `price.kind === "priced"`: filled `--success` dot, figure, `aria-label` `price.aria(formatted)`.
- `price.kind === "notStocked"`: hollow `1.5px --fg-locked` dot, `price.notStocked`, `aria-label` `price.notStockedAria`.
- `price.kind === "absent"`: the slot **unmounts entirely** — no dot, no dash, **no hairline**, no reserved height. The hairline belongs to the slot.

Price never enters an `ORDER BY` and its colour is never keyed to magnitude.

- [ ] **Step 4: The untagged note**

Under `sort === "fit"`, a commander with `tagTotal === 0` renders the shipped **absent** note variant: `--elevated-hover`, `1px --border-strong`, `border-left 2px --fg-faint`, radius 7px, `⚠` 13px `--fg-faint`, body 12.5px `--fg-muted`. Heading `untagged.heading`, body `untagged.body`. **No Retry** — EDHREC not tagging a commander is settled, and a button that cannot change anything is worse than a sentence.

- [ ] **Step 5: Verify every state**

At 1280px and 390px, find one row of each and confirm by eye: owned, unowned, priced under $100, priced over $100, not stocked, no price at all (**check the hairline is gone too**), untagged, and null `edhrecTotal`. If the local database has no row in some state, force it with a temporary filter in the page rather than skipping the check.

- [ ] **Step 6: Design-review skill, then commit**

```bash
git add src/components/commanders/rec-card.tsx
git commit -m "feat(discovery): ownership pip, price slot and untagged note"
```

---

## Phase 11 — Empty states and windowing

One PR. Design-review skill before `gh pr create`. Reference: `STATES-price-and-empties.md` part 2, which draws the three empties side by side.

### Task 19: The three empty states

**Files:**
- Create: `src/components/commanders/discovery-empty.tsx`
- Modify: `src/components/commanders/filtered-empty.tsx`

- [ ] **Step 1: No decks built**

Home: the sort **menu** (the row's reason) plus a banner. The list beneath is **full** — this is a disabled control with a stated reason, not an empty list.

`GuidedBanner` shape: `--surface` on `1px --border`, `border-left 3px --accent`, radius 10px, 16/18px pad. Heading Cinzel 600 16px from `empty.noDecksHeading`; body 13.5px `--fg-body` from `empty.noDecksBody(cardsRead)`.

- [ ] **Step 2: The floor excludes everything**

Home: the list region. The list beneath is **empty**. Heading `empty.floorHeading`; body `empty.floorBody(NOVELTY_FLOOR * 100, candidateCount, cardsRead, bestPct)`. CTA `empty.floorCta` switching to `?sort=` (fit), with `empty.floorCtaNote(candidateCount)` beneath it.

Offer the other sort, **never a looser floor**. There is no "show them anyway" control.

Render this state only when `floorExcluded > 0 && bestPct != null`. An empty `items` under `new` with `floorExcluded === 0` is a different fact — every candidate is untagged — and rendering the floor copy there would name a floor that excluded nobody. Fall back to the shipped no-results state in that case; a player whose entire candidate set is untagged does not exist at 3,334 indexed commanders, so it needs no copy of its own, but it must not crash or print a blank percentage.

- [ ] **Step 3: Filtered to zero inside discovery**

The shipped `FilteredEmpty` plus one clause and one link. Heading `empty.filteredHeading`, body `empty.filteredBody(colors, candidateCount)`, CTA `empty.filteredCta`, and `empty.filteredScopeLink` as a text link back to `?scope=` (owned).

`empty.filteredBuiltClause(matching, total, identity)` renders **only when at least one built deck matches the filtered identity** — it is the one genuinely new reason this state has under discovery, and with no matching deck it is false. Both figures come from `DiscoveryList.deckIdentities`, which `loadPlayedTags` already carries; do not add a query.

```ts
const total = discovery.deckIdentities.length;
// The SAME predicate the list's colour filter uses — `selected ⊆ colorIdentity`,
// not equality (`src/lib/commanders/filter.ts`). The clause claims these decks
// would have been in this filtered list had they been unbuilt, so a hand-written
// equality here would make that claim false for every multicolour deck.
const matching = filterByColors(
  discovery.deckIdentities.map((colorIdentity) => ({ colorIdentity })),
  colors,
).length;
```

`identity` is the filter's own label, built from `colors` by the shipped `COLOR_LABELS` map — not the deck's identity, which may be wider.

**Note for Design to ratify, not a blocker:** because the predicate is superset,
a five-colour deck counts as matching a Golgari filter, so the clause can say
"1 of your 4 decks is Golgari" about a deck the player thinks of as WUBRG. Matching
the list is the right call — the clause explains *this* filtered list — but the
wording may want to soften from "is" to "fits". Raise it in the Phase 11 PR body.

- [ ] **Step 4: Verify all three**

- No decks: sign in as a fixture account with none. The list is full and the banner sits above it.
- Floor: temporarily raise `NOVELTY_FLOOR` to `0.99` in a scratch edit, confirm the state, then revert. **Commit before the scratch edit** — never `git checkout` a dirty file.
- Filtered: pick a colour combination with no unbuilt commander; then one where a built deck matches, and confirm the extra clause appears.

- [ ] **Step 5: Commit**

```bash
git add src/components/commanders/discovery-empty.tsx src/components/commanders/filtered-empty.tsx
git commit -m "feat(discovery): the three discovery empty states"
```

### Task 20: The reveal band and the count line

**Files:**
- Modify: `src/components/commanders/reveal-control.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { discoveryCopy } from "../../lib/copy/commander-discovery";

it("names the rank band with separators", () => {
  expect(discoveryCopy.window.revealBand(1026, 1050, 3334))
    .toBe("ranks 1,026–1,050 of 3,334 · narrowing by colour is faster than scrolling");
});
```

- [ ] **Step 2: Add the second line**

The reveal control's shipped strings are **unchanged**. Add one dimmer second line beneath from `window.revealBand(shown + 1, Math.min(shown + REVEAL_STEP, total), total)`, rendered under discovery only — at 242 rows the rank band was implicit; at 3,334 it is not.

- [ ] **Step 3: Fix the count line**

`WindowCount` renders `Showing {shown} of {filteredTotal}`. Both numbers gain `toLocaleString`. This is the one shipped string this feature changes and it is formatting, not copy.

- [ ] **Step 4: Reset `shown` on a scope or sort flip**

Both flips are server round-trips, so the client `shown` state must reset to `REVEAL_STEP` rather than persisting across a re-rank — a player at rank 800 who flips the sort is looking at a different list.

- [ ] **Step 5: Verify, design-review skill, then commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add src/components/commanders/reveal-control.tsx
git commit -m "feat(discovery): reveal band and locale-formatted count"
```

---

## Deliberately not built

Recorded so a reviewer does not read them as gaps. Each is a handoff gap-report item that this plan leaves standing, with the reason.

- **Gap 5 — colour filtering does not restate the ranking.** Ranks are assigned over the full pre-filter set and survive filtering, which is what `rankMap per (scope, sort)` requires. A filtered list showing ranks 3, 17 and 402 is correct.
- **Gap 6 — two decks sharing an archetype count once.** Intended. You have played it or you have not.
- **Gap 7 — price staleness has no treatment.** The ingest is weekly (`Price refresh`, Mondays 09:00 UTC), so a figure can be six days old with no as-of on the row. The handoff does not draw one and this plan does not invent one. Surface it as a follow-up.
- **Gap 9 — no way back to a commander you scrolled past.** No search, no jump, no persistence: a player who reveals to rank 200 and navigates away lands at 25 again. Deliberate, and the most likely first support ticket.
- **Gap 3 — the floor is invisible on a fit row.** A commander visible under `Best fit` and missing under `Something new` gets no per-row reason. Ruling 5 says the differing counts are not a defect.

---

## Self-review

Run before the first PR opens. All four passed on 2026-09-05; `overlapShort`,
`ownedShort`/`unownedShort` and `distanceAria` were unreferenced and were named
inline in Tasks 17 and 18.

A subagent code review the same day found three blockers, since fixed:
`DiscoveryView` was rendered by Task 14 and created by no task (Task 14 now builds
it, and takes Task 17's prop-union step with it); `RecCard` required a
`CommanderListItem` that a `DiscoveryItem` cannot satisfy (Task 17 step 0 is the
discriminated union); and `empty.filteredBuiltClause` needed deck colour
identities and a deck total nothing loaded (`DeckTagSet` now carries
`colorIdentity`, `DiscoveryList` carries `deckIdentities`). It also took the
`candidates.ts` array join off trust: step 5 now reads the query plan and the
timing, not the row count, and carries an `unnest` form to fall back to.

A second review round, against those fixes, found four more — all verified against
the code before being applied. The `unnest` fallback as first written was wrong:
drizzle emits joins in call order, so an `.innerJoin` after the `.leftJoin` would
have filtered out exactly the zero-support commanders the left join exists to
keep. It is now a derived table that inner-joins the unnest internally, with the
outer join left outer, and step 5 checks the row count over an empty owned array
as the proof. `rec-card.tsx:110` destructures in the parameter list, so the union
is a signature rewrite, not a type swap — Task 17 step 0 now shows the narrow-first
body and the discovery arm's `return null`, which is also what makes Task 14
compile and why Task 14's hand-verification counts `<li>`s rather than reading
rows. The live region at `commanders-view.tsx:342` sits inside a component the
discovery branch does not render, so `DiscoveryView` now has its own and Tasks 15
and 16 target it. And `DiscoveryList` must be a type-only import in a client
component: `src/db/index.ts:9` throws at module scope on a missing `DATABASE_URL`.

- [x] **Spec coverage.** Walk `README.md`'s "Notes for engineering" list line by line and point at the task that implements each: two URL-mirrored state pieces (13, 14), scope changes the candidate set server-side (14), a sort flip is allowed to be a fetch (16), flips reset `shown` (20), `rankMap` over the full pre-filter set (11), floor and tag distance server-side (5, 6, 7, 11), untagged excluded by absence of `tags` (11), the deck tag set aggregated once per request (6), `RecCard` takes a `sort` prop (17), `ScoreDelta` null (17), `edhrec_total` non-null wherever N is printed (17 step 3), price joined on `scryfall_id` and never in an `ORDER BY` (5, 18), `Showing N of M` gains `toLocaleString` (20).
- [x] **Copy coverage.** Every key in `discoveryCopy` is referenced by some task. An unreferenced key means a surface was missed.
- [x] **Type consistency.** `DiscoveryItem` in Task 11 matches what Tasks 17 and 18 read. `PriceSlot`'s three kinds match `slotFor`'s three returns. `DeckTagSet.deckName` is the same name Task 17's `distanceNear` prints.
- [x] **Placeholder scan.** No "TBD", no "add error handling", no "similar to Task N".

---

## Execution handoff

Eleven phases, eleven PRs. Phases 1–8 are server-only and need no design review. Phases 9–11 are UI: each runs the design-review skill (property-table enumerate → verify → confirm) before `gh pr create`, and ships mobile and desktop parity in the same PR. Every PR takes Copilot rounds to the merge bar in `~/.claude/CLAUDE.md`, then squash-merges.
