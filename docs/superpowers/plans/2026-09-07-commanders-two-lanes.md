# Commanders / Discover Two-Lane Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `/commanders` into two destinations — an owned-and-unbuilt lane at `/commanders` and an unowned lane at `/discover` — behind one shared filter rack, deleting the three confirmed defects that the scope toggle caused.

**Architecture:** The `scope` URL parameter dies and becomes a route. Each lane keeps its own server pipeline (`getRankedList` for owned, `loadDiscovery` for discover) but both render the same rack: search, colour pips with a colour-match modifier, order, plus one lane-exclusive control (availability on owned, scope on discover). One pure module owns URL parameter parse/serialise and the active-control count that the badge, the chip row and `Clear` all read. On phone the rack collapses into a persistent search + order row plus a `Filters` sheet; on desktop it stays inline. The novelty floor stops reading a pool that availability can change, which deletes defect 1 at its root rather than patching the symptom.

**Tech Stack:** Next.js 16 (App Router, server components), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Clerk auth, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-07-commanders-two-lanes-design.md`

**Handoff:** `design/design_handoff_the99_commanders_discover/` — `README.md` (component notes and the four calls), `STATES-filter-rack.md` (six states × two lanes), `commanders-discover · copy strings.ts` (production-final copy).

**Readiness verdict:** `docs/superpowers/readiness-commanders-discover.md` — 🟢 Green, sequenced behind the UI refresh.

---

## Global Constraints

These apply to every task. A task's requirements implicitly include this whole section.

**Sequencing**

- **Task 14 (nav) is blocked on `design/design_handoff_the99_refresh` merging to `main`.** That package rewrites `src/components/shell/nav.tsx` whole-file with a four-item icon rail and retires adjudication #1. Task 14 adds a fifth entry to the already-refreshed `ITEMS` array. Every other task in this plan depends on nothing the refresh owns and may proceed immediately. Do not draw a fifth-diamond frame or pre-empt the refresh's rail.

**Repo rules**

- Package manager is **pnpm**. Never npm or yarn.
- All work happens in the worktree `.worktrees/commanders-plane-readiness` on branch `design/commanders-two-lanes`.
- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test`, then the stub-DB build `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`, then `git fetch origin && git rebase origin/main`.
- Stage files by name. Never `git add -A`.
- This repo ships **no prettier config**. Match surrounding style by hand.

**Design invariants — true in all twelve rack cells (`STATES-filter-rack.md`)**

- The rack is present, in place, in one order. It never collapses, never reorders, never becomes sticky, and it does not change height when results change.
- **Every control on the lane renders in every state. Greying is the only degradation** — never absence, never a conditional mount. This reverses the previous plane's absent-modifier behaviour deliberately.
- The chip line **reserves its height** — 22px desktop, 30px phone — even with no chips, so the first chip never pushes the list.
- **One result line**, at the bottom of the rack, and it is the lane's only `aria-live` region.
- The only commitment control anywhere is `Clear`. **Neither lane has a header CTA** — the row is the action.
- **No row shows a printing thumbnail at rest**, on either lane, at either breakpoint.
- The row's figure set does not change with state. Filtering never trims a row to fit.
- At rest a lane prints a statement, not a ratio. **Never print `3,301 of 3,301`.**

**The four calls (handoff README)**

1. **Greying remembers.** A greyed colour-match control keeps its value and its selected segment's `#3A3229` hairline outline. Un-lighting the last pip greys the control and does not reset the mode.
2. **Chip overflow is one line.** Past the width, chips collapse to a dashed `+N`. The chip row never wraps to two lines.
3. **The sheet wins to 1024px.** One `matchMedia` query at `(min-width: 1024px)`; below it the phone treatment renders, including on tablets.
4. **The badge counts controls off their default**, excluding search and order. Ceiling 4 on the owned lane, 3 on discover.

**URL parameters — every control is one parameter**

| Key | Values | Lanes | Default (serialised as absence) |
|---|---|---|---|
| `q` | free text | both | `""` |
| `c` | comma-joined subset of `w,u,b,r,g` | both | `[]` |
| `m` | `any` \| `exact` | both | `any` |
| `a` | `all` \| `free` | **owned only** | `all` |
| `o` | see per-lane order tables | both | `fit` (owned) / `popularity` (discover) |
| `s` | `bestfit` \| `new` | **discover only** | `bestfit` |

Defaults serialise as absences. Writes go through `window.history.replaceState`, never `router.push`. Read every parameter you do not own back off the live URL rather than rebuilding it.

**Copy**

- Copy is production-final in `design/design_handoff_the99_commanders_discover/commanders-discover · copy strings.ts` and lands verbatim in `src/lib/copy/`, with **one amendment**: per readiness decision 3 the `discoverCopy.order.colour` key is **deleted** and replaced with `recent: "Recently released"`, backed by `released_at` (`src/db/schema.ts:18`).
- No new copy is invented in this plan. A wording question goes to `/copy-review`, never into a task.

**Readiness corrections — these override the handoff's prose**

1. The engineering note names the wrong files. The row redraw edits **`src/components/commanders/rec-card.tsx` and `src/components/commanders/discovery-row.tsx`**. `facet-strip.tsx` is the only genuinely read-only file.
2. The `Row — phone` component note is stale on two points (a `32×45 thumb`, and a `fit / FIT / delta` right column for discover). **Build the phone row from frame `E6` and decision 5b**, not from that table row.
3. `discovery-row.tsx:357`'s comment stays — it now agrees with the design.

**Recorded decision — discover excludes owned commanders outright**

The spec (§ the design) gives `/discover` a *"hide ones I can already build"* checkbox. The handoff removes it and resolves the question harder: `discoverCopy.subtitle` is `"commanders you don't own"`, the row's content column ends on `not in your collection`, and `discoverCopy.empty.body` reads *"This lane lists the N commanders you don't own — if you already own it, it's on your commanders instead."* **The handoff wins.** Discover excludes owned commanders at the query, so the facet has nothing left to hide, and the two lanes partition cleanly: owned-and-unbuilt on `/commanders`, unowned on `/discover`. This is Task 3b. It is an engineering resolution, not a Design round-trip.

---

## File Structure

**New**

| File | Responsibility |
|---|---|
| `src/lib/commanders/lane-params.ts` | Parse and serialise `q` / `c` / `m` / `a` / `o` / `s`; `activeControlCount`. Pure, no React, no DOM. |
| `src/lib/commanders/lane-params.test.ts` | Unit tests for the above. |
| `src/lib/copy/lanes.ts` | `filterCopy`, `commandersCopy`, `discoverCopy` — the handoff copy file, verbatim, with the order amendment. |
| `src/components/ui/use-is-wide.ts` | `useIsWide()` — `matchMedia("(min-width: 1024px)")`, the call-3 breakpoint. |
| `src/components/commanders/rack/search-control.tsx` | The rack's search field, both breakpoints. |
| `src/components/commanders/rack/colour-control.tsx` | Pip wrapper: five pips, divider, colour-match modifier, including the greyed state. |
| `src/components/commanders/rack/order-control.tsx` | Order trigger + options, lane-parameterised. |
| `src/components/commanders/rack/availability-control.tsx` | `Score against` — owned lane only. |
| `src/components/commanders/rack/scope-control.tsx` | `Best fit` / `Something new` — discover lane only. |
| `src/components/commanders/rack/chip-line.tsx` | Chips in control order, one-line overflow to `+N`, `Clear`. |
| `src/components/commanders/rack/result-line.tsx` | The single live region, plus the `Exactly excludes` aside. |
| `src/components/commanders/rack/filter-sheet.tsx` | The phone/tablet sheet. |
| `src/components/commanders/rack/filter-rack.tsx` | Composition: which controls, which order, which breakpoint treatment. |
| `src/app/discover/page.tsx` | The discover route. |
| `src/lib/commanders/lanes.test.ts` | The three pinned regression properties. |

**Modified**

| File | Change |
|---|---|
| `src/lib/recs/ranked-list.ts` | Exclude commanders already helming a deck, on both the cached and the recomputed path. |
| `src/lib/discovery/novelty.ts` | `clearsFloor` takes the whole-collection support figure, never the availability-selected pool. |
| `src/lib/discovery/list.ts` | `loadDiscovery` loses `avail`; `DiscoveryItem` gains `collectionSupport`. |
| `src/lib/discovery/candidates.ts` | Exclude owned commanders from the discover pool. |
| `src/lib/discovery/params.ts` | `parseScope` deleted; `parseSort` gains `recent`. |
| `src/app/commanders/page.tsx` | Owned lane only; `?scope=play` 308s to `/discover`. |
| `src/components/commanders/commanders-view.tsx` | Renders `FilterRack`; adopts `lane-params`. |
| `src/components/commanders/discovery-view.tsx` | Same, plus defect 2 dies with `FilterBar`. |
| `src/components/commanders/rec-card.tsx` | Row redraw — art bleed, no thumbnail. |
| `src/components/commanders/discovery-row.tsx` | Discover counts column, phone from `E6`. |
| `src/components/commanders/filtered-empty.tsx` | Owned zero state. |
| `src/components/commanders/discovery-empty.tsx` | Discover zero state. |
| `src/components/shell/nav.tsx` | Fifth item — **Task 14, blocked on the refresh**. |

**Deleted**

| File | Reason |
|---|---|
| `src/components/commanders/filter-bar.tsx` | Replaced by `rack/`. Its two parallel subtrees are the source of defect 2. |
| `src/components/commanders/scope-control.tsx` | The toggle becomes two routes. |
| `src/components/commanders/facet-strip.tsx` | Superseded by the rack — **read for anatomy first, then delete**. |

---

### Task 1: Lane parameters and the one active-control count

The badge, the chip row and `Clear`'s enabled state must all read one function, or they drift. This task builds that function and the parse/serialise pair around it, with no React in sight.

**Files:**
- Create: `src/lib/commanders/lane-params.ts`
- Test: `src/lib/commanders/lane-params.test.ts`

**Interfaces:**
- Consumes: `JoinMode` from `src/lib/commanders/filter.ts` (`"contains" | "exactly"`).
- Produces:
  ```typescript
  export type Lane = "owned" | "discover";
  export type OwnedOrder = "fit" | "name" | "added";
  export type DiscoverOrder = "popularity" | "name" | "recent";
  export type LaneOrder = OwnedOrder | DiscoverOrder;
  export type Avail = "all" | "free";
  export type Scope = "bestfit" | "new";
  export type LaneParams = {
    q: string;
    colors: string[];
    match: JoinMode;
    avail: Avail;
    order: LaneOrder;
    scope: Scope;
  };
  export function defaultParams(lane: Lane): LaneParams;
  export function parseLaneParams(sp: URLSearchParams, lane: Lane): LaneParams;
  export function serializeLaneParams(p: LaneParams, lane: Lane): string;
  export function activeControlCount(p: LaneParams, lane: Lane): number;
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/commanders/lane-params.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  activeControlCount,
  defaultParams,
  parseLaneParams,
  serializeLaneParams,
} from "./lane-params";

const sp = (s: string) => new URLSearchParams(s);

describe("parseLaneParams", () => {
  it("returns the lane's defaults for an empty query string", () => {
    expect(parseLaneParams(sp(""), "owned")).toEqual({
      q: "",
      colors: [],
      match: "contains",
      avail: "all",
      order: "fit",
      scope: "bestfit",
    });
    expect(parseLaneParams(sp(""), "discover").order).toBe("popularity");
  });

  it("reads colours in WUBRG order regardless of how they were written", () => {
    expect(parseLaneParams(sp("c=g,b"), "owned").colors).toEqual(["b", "g"]);
  });

  it("drops unknown colour letters", () => {
    expect(parseLaneParams(sp("c=b,x,g"), "owned").colors).toEqual(["b", "g"]);
  });

  it("maps the exact URL value onto the exactly mode", () => {
    expect(parseLaneParams(sp("m=exact"), "owned").match).toBe("exactly");
    expect(parseLaneParams(sp("m=any"), "owned").match).toBe("contains");
    expect(parseLaneParams(sp("m=nonsense"), "owned").match).toBe("contains");
  });

  it("ignores availability on the discover lane", () => {
    expect(parseLaneParams(sp("a=free"), "discover").avail).toBe("all");
    expect(parseLaneParams(sp("a=free"), "owned").avail).toBe("free");
  });

  it("ignores scope on the owned lane", () => {
    expect(parseLaneParams(sp("s=new"), "owned").scope).toBe("bestfit");
    expect(parseLaneParams(sp("s=new"), "discover").scope).toBe("new");
  });

  it("rejects an order that does not belong to the lane", () => {
    expect(parseLaneParams(sp("o=popularity"), "owned").order).toBe("fit");
    expect(parseLaneParams(sp("o=added"), "discover").order).toBe("popularity");
    expect(parseLaneParams(sp("o=recent"), "discover").order).toBe("recent");
  });
});

describe("serializeLaneParams", () => {
  it("serialises every default as an absence", () => {
    expect(serializeLaneParams(defaultParams("owned"), "owned")).toBe("");
    expect(serializeLaneParams(defaultParams("discover"), "discover")).toBe("");
  });

  it("writes only the non-default keys, in a stable order", () => {
    expect(
      serializeLaneParams(
        { q: "druid", colors: ["b", "g"], match: "exactly", avail: "free", order: "name", scope: "bestfit" },
        "owned",
      ),
    ).toBe("?q=druid&c=b%2Cg&m=exact&a=free&o=name");
  });

  it("never writes availability on discover, nor scope on owned", () => {
    expect(
      serializeLaneParams({ ...defaultParams("discover"), avail: "free" }, "discover"),
    ).toBe("");
    expect(
      serializeLaneParams({ ...defaultParams("owned"), scope: "new" }, "owned"),
    ).toBe("");
  });

  it("round-trips through parse", () => {
    const p = { q: "a b", colors: ["u"], match: "exactly", avail: "all", order: "recent", scope: "new" } as const;
    const qs = serializeLaneParams(p, "discover");
    expect(parseLaneParams(new URLSearchParams(qs), "discover")).toEqual(p);
  });
});

describe("activeControlCount", () => {
  it("is zero at rest", () => {
    expect(activeControlCount(defaultParams("owned"), "owned")).toBe(0);
    expect(activeControlCount(defaultParams("discover"), "discover")).toBe(0);
  });

  it("never counts search", () => {
    expect(activeControlCount({ ...defaultParams("owned"), q: "druid" }, "owned")).toBe(0);
  });

  it("never counts order", () => {
    expect(activeControlCount({ ...defaultParams("owned"), order: "name" }, "owned")).toBe(0);
  });

  it("counts the colour set as one control however many pips are lit", () => {
    expect(activeControlCount({ ...defaultParams("owned"), colors: ["b", "g", "r"] }, "owned")).toBe(1);
  });

  it("counts colour match only once a pip is lit", () => {
    expect(activeControlCount({ ...defaultParams("owned"), match: "exactly" }, "owned")).toBe(0);
    expect(
      activeControlCount({ ...defaultParams("owned"), colors: ["b"], match: "exactly" }, "owned"),
    ).toBe(2);
  });

  it("ceilings at 4 on owned and 3 on discover", () => {
    expect(
      activeControlCount(
        { q: "x", colors: ["b"], match: "exactly", avail: "free", order: "name", scope: "bestfit" },
        "owned",
      ),
    ).toBe(3);
    expect(
      activeControlCount(
        { q: "x", colors: ["b"], match: "exactly", avail: "all", order: "recent", scope: "new" },
        "discover",
      ),
    ).toBe(3);
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `pnpm vitest run src/lib/commanders/lane-params.test.ts`
Expected: FAIL — `Failed to resolve import "./lane-params"`.

- [ ] **Step 3: Write the module**

Create `src/lib/commanders/lane-params.ts`:

```typescript
import type { JoinMode } from "./filter";

export type Lane = "owned" | "discover";
export type OwnedOrder = "fit" | "name" | "added";
export type DiscoverOrder = "popularity" | "name" | "recent";
export type LaneOrder = OwnedOrder | DiscoverOrder;
export type Avail = "all" | "free";
export type Scope = "bestfit" | "new";

export type LaneParams = {
  q: string;
  colors: string[];
  match: JoinMode;
  avail: Avail;
  order: LaneOrder;
  scope: Scope;
};

const WUBRG = ["w", "u", "b", "r", "g"] as const;

const ORDERS: Record<Lane, readonly LaneOrder[]> = {
  owned: ["fit", "name", "added"],
  discover: ["popularity", "name", "recent"],
};

export function defaultParams(lane: Lane): LaneParams {
  return {
    q: "",
    colors: [],
    match: "contains",
    avail: "all",
    order: ORDERS[lane][0],
    scope: "bestfit",
  };
}

export function parseLaneParams(sp: URLSearchParams, lane: Lane): LaneParams {
  const base = defaultParams(lane);
  const raw = (sp.get("c") ?? "").toLowerCase().split(",");
  const colors = WUBRG.filter((c) => raw.includes(c));
  const order = ORDERS[lane].find((o) => o === sp.get("o")) ?? base.order;
  return {
    q: sp.get("q") ?? "",
    colors,
    match: sp.get("m") === "exact" ? "exactly" : "contains",
    avail: lane === "owned" && sp.get("a") === "free" ? "free" : "all",
    order,
    scope: lane === "discover" && sp.get("s") === "new" ? "new" : "bestfit",
  };
}

export function serializeLaneParams(p: LaneParams, lane: Lane): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.colors.length > 0) sp.set("c", p.colors.join(","));
  if (p.match === "exactly") sp.set("m", "exact");
  if (lane === "owned" && p.avail === "free") sp.set("a", "free");
  if (p.order !== ORDERS[lane][0]) sp.set("o", p.order);
  if (lane === "discover" && p.scope === "new") sp.set("s", "new");
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

// The badge, the chip row and Clear's enabled state all read this. Search and
// order are excluded by call 4: search sits outside the sheet, and order always
// has a value.
export function activeControlCount(p: LaneParams, lane: Lane): number {
  let n = 0;
  if (p.colors.length > 0) n += 1;
  if (p.colors.length > 0 && p.match === "exactly") n += 1;
  if (lane === "owned" && p.avail === "free") n += 1;
  if (lane === "discover" && p.scope === "new") n += 1;
  return n;
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run src/lib/commanders/lane-params.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/commanders/lane-params.ts src/lib/commanders/lane-params.test.ts
git commit -m "feat(commanders): one module for lane parameters and the active-control count"
```

---

### Task 2: The owned lane excludes commanders already helming a deck

Defect 3. `getRankedList` has no deck predicate, so a commander you have already built keeps appearing in the list you are meant to pick your *next* deck from. Discover already excludes them (`candidates.ts:297-311`); owned does not.

The trap: `getRankedList` serves from `commander_scores` on a hit and returns `stored.items` without touching the database again. The predicate must apply on **both** paths, or a warm cache reintroduces the defect.

**Files:**
- Modify: `src/lib/recs/ranked-list.ts`
- Test: `src/lib/recs/ranked-list.test.ts`

**Interfaces:**
- Consumes: `loadBuiltCommanderIds(userId): Promise<string[]>` from `src/lib/discovery/candidates.ts`.
- Produces: `getRankedList(userId)` — unchanged signature, filtered `items`.

- [ ] **Step 1: Read the current implementation**

Read `src/lib/recs/ranked-list.ts` in full (64 lines) and `loadBuiltCommanderIds` in `src/lib/discovery/candidates.ts`. Note where `loadScores` returns early and where `recommendCommanders` → `persistScores` runs.

- [ ] **Step 2: Write the failing test**

Add to `src/lib/recs/ranked-list.test.ts` (create the file if it does not exist, mocking the data loaders the way the neighbouring `src/lib/discovery/list-wiring.test.ts` does):

```typescript
it("drops commanders that already helm a deck, on the cached path", async () => {
  scores.mockResolvedValue({
    items: [
      { oracleId: "kept", score: 90 },
      { oracleId: "built", score: 95 },
    ],
    degraded: false,
    uniqueCardsRead: 10,
    candidateCount: 2,
  });
  built.mockResolvedValue(["built"]);

  const list = await getRankedList("user_1");

  expect(list.items.map((i) => i.oracleId)).toEqual(["kept"]);
});

it("drops them on the recompute path too", async () => {
  scores.mockResolvedValue(null);
  recommend.mockResolvedValue({
    items: [
      { oracleId: "kept", score: 90 },
      { oracleId: "built", score: 95 },
    ],
    degraded: false,
    uniqueCardsRead: 10,
    candidateCount: 2,
  });
  built.mockResolvedValue(["built"]);

  const list = await getRankedList("user_1");

  expect(list.items.map((i) => i.oracleId)).toEqual(["kept"]);
});

it("reports the candidate count after exclusion, so the result line adds up", async () => {
  scores.mockResolvedValue({
    items: [
      { oracleId: "kept", score: 90 },
      { oracleId: "built", score: 95 },
    ],
    degraded: false,
    uniqueCardsRead: 10,
    candidateCount: 2,
  });
  built.mockResolvedValue(["built"]);

  const list = await getRankedList("user_1");

  expect(list.candidateCount).toBe(1);
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `pnpm vitest run src/lib/recs/ranked-list.test.ts`
Expected: FAIL — `expected [ 'kept', 'built' ] to equal [ 'kept' ]`.

- [ ] **Step 4: Apply the predicate on both paths**

In `src/lib/recs/ranked-list.ts`, load the built set once and filter the assembled list immediately before returning, so the cached and recomputed paths share one exclusion:

```typescript
import { loadBuiltCommanderIds } from "@/lib/discovery/candidates";

// ... inside getRankedList, after `list` is assembled by either path:
const built = new Set(await loadBuiltCommanderIds(userId));
const items = list.items.filter((i) => !built.has(i.oracleId));
return { ...list, items, candidateCount: items.length };
```

Do not filter inside `persistScores`' input — the persisted scores stay whole, so building a deck does not invalidate the cache; only the read is filtered.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `pnpm vitest run src/lib/recs/ranked-list.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/recs/ranked-list.ts src/lib/recs/ranked-list.test.ts
git commit -m "fix(commanders): drop already-helmed commanders from the owned lane (defect 3)"
```

---

### Task 3: The novelty floor stops reading a pool availability can change

Defect 1. `freePool` feeds the `osc` LEFT JOIN at `candidates.ts:246-257` and never a `WHERE`, so availability is documented as scoring-only. But `clearsFloor` (`novelty.ts:20-23`) tests `ownedSupport >= NOVELTY_FLOOR * edhrecTotal` against whichever pool `avail` selected, and `list.ts:145-153` then drops the rows that fail. Selecting `Free cards only` therefore raises the bar and silently removes rows.

After this plan, availability does not exist on the discover lane at all — but the floor must still read a fixed pool, or the same class of bug returns the next time a pool becomes selectable.

**Files:**
- Modify: `src/lib/discovery/novelty.ts`, `src/lib/discovery/list.ts`, `src/lib/discovery/candidates.ts`
- Test: `src/lib/discovery/novelty.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  // novelty.ts — the argument is now explicitly the whole-collection figure.
  export type FloorInput = { collectionSupport: number; edhrecTotal: number | null };
  export function clearsFloor(c: FloorInput): boolean;
  ```
  `DiscoveryItem` (`src/lib/discovery/list.ts`) gains `collectionSupport: number` alongside the existing `ownedSupport`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/discovery/novelty.test.ts`:

```typescript
it("clears the floor on the whole collection, never on a narrowed pool", () => {
  // 40 of 100 owned in the collection; only 5 of those are free.
  const c = { collectionSupport: 40, edhrecTotal: 100 };
  expect(clearsFloor(c)).toBe(true);
});

it("fails a commander with no EDHREC total", () => {
  expect(clearsFloor({ collectionSupport: 40, edhrecTotal: null })).toBe(false);
  expect(clearsFloor({ collectionSupport: 40, edhrecTotal: 0 })).toBe(false);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/discovery/novelty.test.ts`
Expected: FAIL — the object has no `ownedSupport`, so the type errors and the first assertion returns `false`.

- [ ] **Step 3: Rename the input the floor reads**

In `src/lib/discovery/novelty.ts`:

```typescript
export type FloorInput = { collectionSupport: number; edhrecTotal: number | null };

// The floor reads the whole collection, never a pool a control can narrow.
// Reading `ownedSupport` here is what let the availability toggle remove rows.
export function clearsFloor(c: FloorInput): boolean {
  if (c.edhrecTotal == null || c.edhrecTotal <= 0) return false;
  return c.collectionSupport >= NOVELTY_FLOOR * c.edhrecTotal;
}
```

In `src/lib/discovery/candidates.ts`, carry the `csa` (collection) count through onto every candidate as `collectionSupport`, next to the existing `osc`-derived `ownedSupport`. Both derived tables already exist; this exposes the second one on the row rather than adding a join.

In `src/lib/discovery/list.ts`, add `collectionSupport: number` to `DiscoveryItem` and pass it into the `clearsFloor` call at 145-153.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run src/lib/discovery/`
Expected: PASS. Fix any call site the type error surfaces — that is the point of the rename.

- [ ] **Step 5: Commit**

```bash
git add src/lib/discovery/novelty.ts src/lib/discovery/list.ts src/lib/discovery/candidates.ts src/lib/discovery/novelty.test.ts
git commit -m "fix(discovery): read the novelty floor off the whole collection (defect 1)"
```

---

### Task 3b: Discover excludes commanders the player owns

Per the recorded decision in Global Constraints. `loadCandidates` currently returns owned commanders — `DiscoveryItem.owned` exists precisely because they appear today. The handoff's copy asserts the opposite, so the query changes and `owned` becomes dead.

**Files:**
- Modify: `src/lib/discovery/candidates.ts`, `src/lib/discovery/list.ts`
- Test: `src/lib/discovery/candidates.test.ts`

**Interfaces:**
- Produces: `loadCandidates(userId, ownedOracleIds, collectionOracleIds?)` returns no candidate whose `commanderOracleId` is in `ownedOracleIds`. `DiscoveryItem.owned` is **removed**.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/discovery/candidates.test.ts`:

```typescript
it("returns no commander the player already owns", async () => {
  const rows = await loadCandidates("user_1", ["owned_a"], ["owned_a", "other"]);
  expect(rows.map((r) => r.commanderOracleId)).not.toContain("owned_a");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/discovery/candidates.test.ts`
Expected: FAIL — `owned_a` is present.

- [ ] **Step 3: Add the predicate**

In `loadCandidates`, extend the existing `unbuiltCommanders(userId)` predicate composition with an ownership exclusion, using the same `notInArray` shape and honouring the same documented NULL hazard — an empty `ownedOracleIds` must not produce a `NOT IN ()`:

```typescript
const excludeOwned =
  ownedOracleIds.length > 0
    ? notInArray(commanderSupport.commanderOracleId, ownedOracleIds)
    : undefined;
```

and `and(...)` it into the WHERE alongside the unbuilt predicate, dropping `undefined`.

Then delete `owned` from `DiscoveryItem` in `src/lib/discovery/list.ts` and from every render site the typecheck flags.

- [ ] **Step 4: Run the tests and typecheck**

Run: `pnpm vitest run src/lib/discovery/ && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/discovery/candidates.ts src/lib/discovery/list.ts src/lib/discovery/candidates.test.ts
git commit -m "feat(discovery): the discover lane lists only commanders you do not own"
```

---

### Task 4: The `/discover` route and the `?scope=play` redirect

The `scope` parameter becomes a destination. An existing bookmark must keep working, carrying what still means something and dropping what does not.

**Files:**
- Create: `src/app/discover/page.tsx`
- Modify: `src/app/commanders/page.tsx`, `src/lib/discovery/params.ts`
- Test: `src/app/commanders/scope-redirect.test.ts`

**Interfaces:**
- Consumes: `parseLaneParams` / `serializeLaneParams` (Task 1); `loadDiscovery(userId, { sort })` (Task 3, no `avail`).
- Produces: `/discover` renders `DiscoveryView`. `/commanders` renders `CommandersView` only. `parseScope` is deleted.

- [ ] **Step 1: Write the failing test**

Create `src/app/commanders/scope-redirect.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { scopeRedirectTarget } from "./scope-redirect";

describe("scopeRedirectTarget", () => {
  it("is null without the legacy parameter", () => {
    expect(scopeRedirectTarget(new URLSearchParams("c=b"))).toBeNull();
  });

  it("sends scope=play to discover", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=play"))).toBe("/discover");
  });

  it("carries the colours and the order across", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=play&c=b,g&sort=new"))).toBe(
      "/discover?c=b%2Cg&s=new",
    );
  });

  it("drops availability, which the discover lane does not have", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=play&a=free"))).toBe("/discover");
  });

  it("leaves scope=own on the owned lane", () => {
    expect(scopeRedirectTarget(new URLSearchParams("scope=own&c=b"))).toBe("/commanders?c=b");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/app/commanders/scope-redirect.test.ts`
Expected: FAIL — `Failed to resolve import "./scope-redirect"`.

- [ ] **Step 3: Write the target function**

Create `src/app/commanders/scope-redirect.ts`:

```typescript
import { parseLaneParams, serializeLaneParams } from "@/lib/commanders/lane-params";

// The legacy `scope` toggle became two routes. A bookmark keeps its colours,
// its search and its ranking; availability is dropped silently because the
// discover lane no longer has that control.
export function scopeRedirectTarget(sp: URLSearchParams): string | null {
  const scope = sp.get("scope");
  if (scope !== "play" && scope !== "own") return null;
  const lane = scope === "play" ? "discover" : "owned";
  const carried = new URLSearchParams(sp);
  carried.delete("scope");
  if (scope === "play" && carried.get("sort") === "new") {
    carried.set("s", "new");
  }
  carried.delete("sort");
  const params = parseLaneParams(carried, lane);
  return `${scope === "play" ? "/discover" : "/commanders"}${serializeLaneParams(params, lane)}`;
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run src/app/commanders/scope-redirect.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Wire the redirect and split the route**

In `src/app/commanders/page.tsx`, at the top of the server component, before any data load:

```typescript
const target = scopeRedirectTarget(new URLSearchParams(sp as Record<string, string>));
if (target && target !== "/commanders") permanentRedirect(target);
```

`permanentRedirect` from `next/navigation` issues a 308. Then delete the `parseScope(sp.scope) === "play"` branch and the `loadDiscovery` call, leaving `/commanders` as the owned lane only.

Create `src/app/discover/page.tsx` holding what that branch used to do: `parseLaneParams(..., "discover")`, `await loadDiscovery(userId, { sort })`, `<DiscoveryView …/>`. Carry across the no-collection empty state from `page.tsx` unchanged, including its 96px mobile / 110px desktop XCIX seal badges.

Delete `parseScope` from `src/lib/discovery/params.ts` and add `recent` to `parseSort`.

- [ ] **Step 6: Typecheck and build**

Run: `pnpm typecheck && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: both pass; `/discover` appears in the route manifest.

- [ ] **Step 7: Commit**

```bash
git add src/app/discover/page.tsx src/app/commanders/page.tsx src/app/commanders/scope-redirect.ts src/app/commanders/scope-redirect.test.ts src/lib/discovery/params.ts
git commit -m "feat(commanders): make the scope toggle two routes, redirecting the old parameter"
```

---

### Task 5: The copy module

The handoff's copy file is production-final. It lands verbatim, with the one amendment readiness decision 3 requires.

**Files:**
- Create: `src/lib/copy/lanes.ts`
- Test: `src/lib/copy/lanes.test.ts`

**Interfaces:**
- Produces: `filterCopy`, `commandersCopy`, `discoverCopy`, all `as const`.

- [ ] **Step 1: Copy the file across**

Copy `design/design_handoff_the99_commanders_discover/commanders-discover · copy strings.ts` to `src/lib/copy/lanes.ts` unchanged, then make the single amendment:

```typescript
  order: {
    popularity: "Popularity",
    name: "Name",
    recent: "Recently released",
  },
```

The `colour` key is deleted, not shipped dark. `released_at` (`src/db/schema.ts:18`) backs the replacement.

- [ ] **Step 2: Write the tests**

Create `src/lib/copy/lanes.test.ts`, following the shape of `src/lib/copy/commanders-plane.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { commandersCopy, discoverCopy, filterCopy } from "./lanes";

describe("filterCopy", () => {
  it("pluralises the sheet's dismiss label and groups the thousands", () => {
    expect(filterCopy.sheet.dismiss(1)).toBe("Show 1 commander");
    expect(filterCopy.sheet.dismiss(3301)).toBe("Show 3,301 commanders");
  });

  it("collapses colours past one pip rather than naming each hue", () => {
    expect(filterCopy.colour.collapsed(2)).toBe("2 colours");
  });

  it("states what Exactly costs, in rows", () => {
    expect(filterCopy.match.excludedAside(6)).toBe("Exactly excludes 6 that Any would show");
  });
});

describe("commandersCopy", () => {
  it("states the owned lane at rest rather than printing a ratio", () => {
    expect(commandersCopy.result.rest(148)).toBe(
      "148 commanders you own and haven't built",
    );
    expect(commandersCopy.result.rest(1)).toBe("1 commander you own and haven't built");
  });

  it("prints a ratio only once something is filtered", () => {
    expect(commandersCopy.result.filtered(4, 148)).toBe("4 of 148 commanders match");
  });
});

describe("discoverCopy", () => {
  it("offers Recently released as its third order, and no colour order", () => {
    expect(discoverCopy.order.recent).toBe("Recently released");
    expect("colour" in discoverCopy.order).toBe(false);
  });

  it("splits the support figure from its label so the row can size them apart", () => {
    expect(discoverCopy.row.supportOwned(84, 236)).toEqual(["84", "OF TOP 236 OWNED"]);
  });

  it("names the lane boundary in the zero state", () => {
    expect(discoverCopy.empty.body("jodah", 3301)).toContain(
      "it's on your commanders instead",
    );
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `pnpm vitest run src/lib/copy/lanes.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/copy/lanes.ts src/lib/copy/lanes.test.ts
git commit -m "feat(copy): land the two-lane filter, commanders and discover strings"
```

---

### Task 6: `useIsWide` — the 1024px breakpoint

Call 3: the sheet wins to 1024px, so a tablet gets the phone treatment. `useIsDesktop` is 768px and stays as it is for its existing callers.

**Files:**
- Create: `src/components/ui/use-is-wide.ts`
- Test: `src/components/ui/use-is-wide.test.tsx`

**Interfaces:**
- Produces: `export function useIsWide(): boolean` — `true` at ≥1024px, SSR snapshot `false`.

- [ ] **Step 1: Write the module**

Create `src/components/ui/use-is-wide.ts`, mirroring `use-is-desktop.ts` exactly and changing only the query:

```typescript
"use client";

import { useCallback, useSyncExternalStore } from "react";

// Call 3: the filter sheet wins all the way to 1024px, so a tablet gets the
// phone rack rather than a cramped inline one. One matchMedia, one subscriber.
const QUERY = "(min-width: 1024px)";

export function useIsWide(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mql = window.matchMedia(QUERY);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
```

- [ ] **Step 2: Write the test**

Create `src/components/ui/use-is-wide.test.tsx`, copying the structure of the existing `use-is-desktop` test if one exists, otherwise:

```typescript
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsWide } from "./use-is-wide";

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("useIsWide", () => {
  it("is true at or above 1024px", () => {
    stubMatchMedia(true);
    expect(renderHook(() => useIsWide()).result.current).toBe(true);
  });

  it("is false below it, which is where the sheet renders", () => {
    stubMatchMedia(false);
    expect(renderHook(() => useIsWide()).result.current).toBe(false);
  });
});
```

- [ ] **Step 3: Run it**

Run: `pnpm vitest run src/components/ui/use-is-wide.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/use-is-wide.ts src/components/ui/use-is-wide.test.tsx
git commit -m "feat(ui): add the 1024px breakpoint the filter sheet needs"
```

---

### Task 7: The rack's controls

Five small components, one file each. Every one renders in every state; greying is the only degradation. Each takes its value and a change handler and holds no URL knowledge.

**Files:**
- Create: `src/components/commanders/rack/search-control.tsx`, `colour-control.tsx`, `order-control.tsx`, `availability-control.tsx`, `scope-control.tsx`
- Test: `src/components/commanders/rack/colour-control.test.tsx`

**Interfaces:**
- Consumes: `filterCopy`, `commandersCopy`, `discoverCopy` (Task 5); `JoinMode`, `Avail`, `LaneOrder`, `Scope` (Task 1).
- Produces:
  ```typescript
  export function SearchControl(p: { value: string; onChange: (v: string) => void; wide: boolean }): JSX.Element;
  export function ColourControl(p: {
    colors: string[]; match: JoinMode;
    onColorsChange: (c: string[]) => void; onMatchChange: (m: JoinMode) => void;
    wide: boolean; showHint: boolean;
  }): JSX.Element;
  export function OrderControl(p: { value: LaneOrder; options: readonly { key: LaneOrder; label: string }[]; onChange: (o: LaneOrder) => void; wide: boolean }): JSX.Element;
  export function AvailabilityControl(p: { value: Avail; onChange: (a: Avail) => void; wide: boolean }): JSX.Element;
  export function ScopeControl(p: { value: Scope; onChange: (s: Scope) => void; wide: boolean; showGlosses: boolean }): JSX.Element;
  ```
  `wide` is `useIsWide()`, threaded from the rack so exactly one treatment mounts. `showHint` and `showGlosses` are `true` in the sheet only.

- [ ] **Step 1: Read the anatomy being replaced**

Read `src/components/commanders/facet-strip.tsx` and `src/components/commanders/filter-bar.tsx` lines 34-330 for the existing `ScoreAgainst` and `JoinModeControl` — their roving-tabindex radiogroup behaviour is correct and is being carried, not redesigned. Also read `src/components/commanders/search-field.tsx`.

- [ ] **Step 2: Write the failing test for the greyed state**

Create `src/components/commanders/rack/colour-control.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ColourControl } from "./colour-control";

const noop = () => {};

describe("ColourControl", () => {
  it("renders the colour-match control with no pip lit, greyed rather than absent", () => {
    render(
      <ColourControl
        colors={[]}
        match="contains"
        onColorsChange={noop}
        onMatchChange={noop}
        wide
        showHint={false}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Colour match" });
    expect(group).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps the greyed control focusable", () => {
    render(
      <ColourControl colors={[]} match="exactly" onColorsChange={noop} onMatchChange={noop} wide showHint={false} />,
    );
    expect(screen.getByRole("radio", { name: "Exactly these" })).not.toHaveAttribute("disabled");
  });

  it("remembers the mode while greyed, so re-lighting a pip restores it", () => {
    render(
      <ColourControl colors={[]} match="exactly" onColorsChange={noop} onMatchChange={noop} wide showHint={false} />,
    );
    expect(screen.getByRole("radio", { name: "Exactly these" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("goes live once a pip is lit", () => {
    render(
      <ColourControl colors={["b"]} match="contains" onColorsChange={noop} onMatchChange={noop} wide showHint={false} />,
    );
    expect(screen.getByRole("radiogroup", { name: "Colour match" })).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  it("carries the explainer in the sheet only", () => {
    const { rerender } = render(
      <ColourControl colors={[]} match="contains" onColorsChange={noop} onMatchChange={noop} wide={false} showHint />,
    );
    expect(
      screen.getByText("Pick a colour and this decides how the pips combine."),
    ).toBeInTheDocument();
    rerender(
      <ColourControl colors={[]} match="contains" onColorsChange={noop} onMatchChange={noop} wide showHint={false} />,
    );
    expect(
      screen.queryByText("Pick a colour and this decides how the pips combine."),
    ).not.toBeInTheDocument();
  });

  it("does not mount two subtrees at one breakpoint", () => {
    render(
      <ColourControl colors={["b"]} match="contains" onColorsChange={noop} onMatchChange={noop} wide showHint={false} />,
    );
    expect(screen.getAllByRole("radiogroup", { name: "Colour match" })).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `pnpm vitest run src/components/commanders/rack/colour-control.test.tsx`
Expected: FAIL — `Failed to resolve import "./colour-control"`.

- [ ] **Step 4: Build the controls to the handoff's geometry**

`search-control.tsx` — desktop 300×34px, phone full-width × 44px. Field `#100D0A` on `1px #3A3229`, radius 8px desktop / 10px phone. The border becomes `#C9A24B` with a query. **The phone field is 16px text**, for the iOS zoom floor. Placeholder is `filterCopy.search.placeholder` narrow, `placeholderWide` wide. The clear ✕ is `filterCopy.search.clear` and appears only with a query.

`colour-control.tsx` — the wrapper is `1px #2A241D` on `#14110E`, radius 9px, height 34px; its border becomes `#C9A24B` when any pip is lit. Inside: five 22px pips (radius 6px), a `1px #2A241D` divider, then the match modifier. A lit pip is a `1.5px #EDE6D8` border with a full-opacity fill; unlit is `1px #3A3229` with the fill at `opacity .34`. Phone pips are 44px, radius 11px, with a `2px` bone border when lit.

The greyed state (call 1): the wrapper flattens to `--surface-sunken`, labels go to `--fg-locked` (`#6E6654`), the hover fill is removed, `aria-disabled="true"` is set, the control **stays focusable**, and **the selected segment keeps its `#3A3229` hairline outline**. Only the sheet adds the mono 10.5px `filterCopy.match.disabledHint` line; the desktop rack says it with geometry.

`order-control.tsx` — trigger label is `filterCopy.order.trigger(label)`; hairline at the default, brass off it. Options come from the lane, not from the component.

`availability-control.tsx` — `commandersCopy.availability`, a two-segment radiogroup carrying the existing roving-tabindex behaviour from `filter-bar.tsx:34`. Sheet segments are 44px; the hint line renders in the sheet only.

`scope-control.tsx` — `discoverCopy.scope`. **Never greyed and never empty**: it always has a value and opens on `Best fit`. Moving it to `Something new` turns the trigger brass and adds one chip. The glosses render in the sheet only (`showGlosses`).

Sub-renders inside a control are plain inline functions, never nested components — a nested component is a new type each render and remounts its input.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `pnpm vitest run src/components/commanders/rack/`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/commanders/rack/
git commit -m "feat(commanders): build the shared rack controls, greyed never absent"
```

---

### Task 8: The chip line and the result line

Two rows of the rack, both driven by the one `activeControlCount`. The chip line reserves its height empty; the result line is the lane's only live region.

**Files:**
- Create: `src/components/commanders/rack/chip-line.tsx`, `src/components/commanders/rack/result-line.tsx`
- Test: `src/components/commanders/rack/chip-line.test.tsx`, `src/components/commanders/rack/result-line.test.tsx`

**Interfaces:**
- Consumes: `LaneParams`, `Lane`, `activeControlCount` (Task 1); `filterCopy` (Task 5).
- Produces:
  ```typescript
  export function ChipLine(p: {
    params: LaneParams; lane: Lane;
    onChange: (next: LaneParams) => void; wide: boolean;
  }): JSX.Element;
  export function ResultLine(p: {
    shown: number; total: number; lane: Lane;
    excludedByExactly: number | null;
  }): JSX.Element;
  ```
  `excludedByExactly` is `null` unless `Exactly` is active **and** the count differs from what `Any` would return.

- [ ] **Step 1: Read the shipped chip pattern**

Read `src/components/collection/chip-row.tsx` (207 lines). Its `Chip` grows the ✕ hit area to 44px with an `after:` pseudo-element rather than padding, because the chip's size is drawn. Carry that.

- [ ] **Step 2: Write the failing tests**

`src/components/commanders/rack/chip-line.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultParams } from "@/lib/commanders/lane-params";
import { ChipLine } from "./chip-line";

const noop = () => {};

describe("ChipLine", () => {
  it("holds its height with nothing active, and says so", () => {
    render(<ChipLine params={defaultParams("owned")} lane="owned" onChange={noop} wide />);
    expect(screen.getByText("no filters — nothing to clear")).toBeInTheDocument();
  });

  it("keeps Clear present and inert rather than removing it", () => {
    render(<ChipLine params={defaultParams("owned")} lane="owned" onChange={noop} wide />);
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
  });

  it("orders chips by control, search first", () => {
    render(
      <ChipLine
        params={{ ...defaultParams("owned"), q: "druid", colors: ["b", "g"] }}
        lane="owned"
        onChange={noop}
        wide
      />,
    );
    const chips = screen.getAllByTestId("filter-chip").map((c) => c.textContent);
    expect(chips[0]).toContain('"druid"');
  });

  it("collapses past one line to a dashed +N rather than wrapping", () => {
    render(
      <ChipLine
        params={{ q: "druid", colors: ["b", "g"], match: "exactly", avail: "free", order: "name", scope: "bestfit" }}
        lane="owned"
        onChange={noop}
        wide={false}
      />,
    );
    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("clears every control at once, back to the lane's defaults", async () => {
    const onChange = vi.fn();
    render(
      <ChipLine
        params={{ ...defaultParams("owned"), colors: ["b"] }}
        lane="owned"
        onChange={onChange}
        wide
      />,
    );
    screen.getByRole("button", { name: "Clear" }).click();
    expect(onChange).toHaveBeenCalledWith(defaultParams("owned"));
  });
});
```

`src/components/commanders/rack/result-line.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultLine } from "./result-line";

describe("ResultLine", () => {
  it("states the lane at rest rather than printing a ratio", () => {
    render(<ResultLine shown={148} total={148} lane="owned" excludedByExactly={null} />);
    expect(screen.getByText("148 commanders you own and haven't built")).toBeInTheDocument();
  });

  it("never prints a denominator equal to its numerator", () => {
    render(<ResultLine shown={3301} total={3301} lane="discover" excludedByExactly={null} />);
    expect(screen.queryByText(/3,301 of 3,301/)).not.toBeInTheDocument();
  });

  it("prints the ratio once something is filtered", () => {
    render(<ResultLine shown={4} total={148} lane="owned" excludedByExactly={null} />);
    expect(screen.getByText("4 of 148 commanders match")).toBeInTheDocument();
  });

  it("appends the Exactly aside to the same line, not a second one", () => {
    render(<ResultLine shown={2} total={148} lane="owned" excludedByExactly={6} />);
    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent ===
          "2 of 148 commanders match — Exactly excludes 6 that Any would show",
      ),
    ).toBeInTheDocument();
  });

  it("is the only live region on the lane", () => {
    const { container } = render(
      <ResultLine shown={4} total={148} lane="owned" excludedByExactly={null} />,
    );
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `pnpm vitest run src/components/commanders/rack/chip-line.test.tsx src/components/commanders/rack/result-line.test.tsx`
Expected: FAIL — both imports unresolved.

- [ ] **Step 4: Build both lines**

`chip-line.tsx` — the row reserves 22px desktop / 30px phone. With nothing active it renders `filterCopy.chips.none` in `#6E6654` and a disabled `Clear`. Chips render in control order — search, colours, match, availability or scope — never one chip per hue: past one pip the label is `filterCopy.colour.collapsed(n)`. Overflow measures against the available width and collapses the tail into a dashed `+N` (`filterCopy.chips.overflow`); the row never wraps. `Clear` resets to `defaultParams(lane)` and is enabled exactly when `activeControlCount(params, lane) > 0 || params.q !== ""`.

`result-line.tsx` — one `aria-live="polite"` element. At rest it renders the lane's `result.rest(total)`; filtered, `result.filtered(shown, total)`. "At rest" is `shown === total`, which is what stops `3,301 of 3,301`. The aside is appended into the same text node, not a sibling line.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `pnpm vitest run src/components/commanders/rack/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/commanders/rack/chip-line.tsx src/components/commanders/rack/result-line.tsx src/components/commanders/rack/chip-line.test.tsx src/components/commanders/rack/result-line.test.tsx
git commit -m "feat(commanders): add the rack's chip line and its single result line"
```

---

### Task 9: The filter sheet

Below 1024px every control except search moves into a sheet. `src/components/ui/filter-panel.tsx` is the reference implementation and its three rules are carried whole.

**Files:**
- Create: `src/components/commanders/rack/filter-sheet.tsx`
- Test: `src/components/commanders/rack/filter-sheet.test.tsx`

**Interfaces:**
- Consumes: every control from Task 7; `activeControlCount` (Task 1); `filterCopy` (Task 5).
- Produces:
  ```typescript
  export function FilterSheet(p: {
    open: boolean; onOpenChange: (open: boolean) => void;
    params: LaneParams; lane: Lane;
    onChange: (next: LaneParams) => void;
    shown: number;
  }): JSX.Element | null;
  ```

- [ ] **Step 1: Read the reference**

Read `src/components/ui/filter-panel.tsx` (955 lines), in particular its sheet markup, `trapTab`, the `DRAG_DISMISS_PX = 80` drag-to-dismiss, and the 300ms debounced announce.

- [ ] **Step 2: Write the failing tests**

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { defaultParams } from "@/lib/commanders/lane-params";
import { FilterSheet } from "./filter-sheet";

describe("FilterSheet", () => {
  it("puts scope first on the discover lane", () => {
    render(
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("discover")} lane="discover" onChange={() => {}} shown={3301} />,
    );
    const legends = screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"));
    expect(legends[0]).toBe("Scope");
  });

  it("keeps search out of the sheet, which is why the badge does not count it", () => {
    render(
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={() => {}} shown={148} />,
    );
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("labels the footer with the live count", () => {
    render(
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={() => {}} shown={4} />,
    );
    expect(screen.getByRole("button", { name: "Show 4 commanders" })).toBeInTheDocument();
  });

  it("applies a tap immediately rather than staging it behind an Apply", async () => {
    const onChange = vi.fn();
    render(
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={onChange} shown={148} />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "Free cards only" }));
    expect(onChange).toHaveBeenCalled();
  });

  it("dismisses on Esc without reverting", async () => {
    const onOpenChange = vi.fn();
    const onChange = vi.fn();
    render(
      <FilterSheet open onOpenChange={onOpenChange} params={{ ...defaultParams("owned"), avail: "free" }} lane="owned" onChange={onChange} shown={4} />,
    );
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders nothing when closed, leaving no duplicate controls in the a11y tree", () => {
    const { container } = render(
      <FilterSheet open={false} onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={() => {}} shown={148} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `pnpm vitest run src/components/commanders/rack/filter-sheet.test.tsx`
Expected: FAIL — import unresolved.

- [ ] **Step 4: Build the sheet**

Markup follows `filter-panel.tsx`: `fixed inset-x-0 bottom-0 z-50 flex max-h-[78vh] flex-col rounded-t-[16px] bg-[color:var(--surface-rail)] border-t anim-sheet-in shadow-[0_-20px_50px_rgba(0,0,0,0.5)]`, a scrim at `fixed inset-0 z-40 bg-[color-mix(in_oklab,var(--bg)_72%,transparent)]`, a 4×36px handle. `role="dialog" aria-modal="true"`, title `filterCopy.sheet.title`.

Sections in rack order. Owned: Colour identity (44px pips) · Colour match (two 44px pills) · Score against (two 44px pills + one mono explainer) · Order (three 44px pills). Discover: **Scope first**, carrying both glosses, then Colour identity · Colour match · Order. Search is not in the sheet — it stays on the persistent row behind the backdrop.

Footer: a filled `filterCopy.sheet.dismiss(shown)` plus `Clear`, inert at `#6E6654` with nothing active.

Behaviour: taps apply immediately, the footer label updates live, and the primary only dismisses. Esc, handle-drag, backdrop tap and the primary are the same action. **Esc never reverts.** Never stage behind an Apply and never become a centred dialog at any width.

Return `null` when closed. Exactly one of the sheet and the inline rack is mounted at a time.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `pnpm vitest run src/components/commanders/rack/filter-sheet.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/commanders/rack/filter-sheet.tsx src/components/commanders/rack/filter-sheet.test.tsx
git commit -m "feat(commanders): add the filter sheet, winning to 1024px"
```

---

### Task 10: The rack composition

One component that decides which controls a lane has, in which order, at which breakpoint.

**Files:**
- Create: `src/components/commanders/rack/filter-rack.tsx`
- Test: `src/components/commanders/rack/filter-rack.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 7–9; `useIsWide` (Task 6).
- Produces:
  ```typescript
  export function FilterRack(p: {
    params: LaneParams; lane: Lane;
    onChange: (next: LaneParams) => void;
    shown: number; total: number;
    excludedByExactly: number | null;
  }): JSX.Element;
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/components/commanders/rack/filter-rack.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultParams, type Lane, type LaneParams } from "@/lib/commanders/lane-params";
import { FilterRack } from "./filter-rack";

function stubWidth(wide: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: wide,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

function renderRack(lane: Lane, params: LaneParams = defaultParams(lane), shown = 148) {
  return render(
    <FilterRack
      params={params}
      lane={lane}
      onChange={() => {}}
      shown={shown}
      total={148}
      excludedByExactly={null}
    />,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("FilterRack", () => {
  it("leads the discover rack with scope, and gives the owned rack none", () => {
    stubWidth(true);
    renderRack("discover", defaultParams("discover"), 3301);
    expect(screen.getByRole("group", { name: "Scope" })).toBeInTheDocument();
  });

  it("gives the owned rack no scope control", () => {
    stubWidth(true);
    renderRack("owned");
    expect(screen.queryByRole("group", { name: "Scope" })).not.toBeInTheDocument();
  });

  it("gives the owned rack availability, and the discover rack none", () => {
    stubWidth(true);
    const { unmount } = renderRack("owned");
    expect(screen.getByRole("radiogroup", { name: "Score against" })).toBeInTheDocument();
    unmount();
    renderRack("discover", defaultParams("discover"), 3301);
    expect(screen.queryByRole("radiogroup", { name: "Score against" })).not.toBeInTheDocument();
  });

  it("reads the order options off the lane", () => {
    stubWidth(true);
    renderRack("owned");
    expect(screen.getByRole("button", { name: "Order · Fit" })).toBeInTheDocument();
  });

  it("badges the Filters trigger with the active control count, below 1024px", () => {
    stubWidth(false);
    renderRack("owned", { ...defaultParams("owned"), colors: ["b"], match: "exactly" }, 31);
    expect(screen.getByRole("button", { name: "Filters" })).toHaveTextContent("2");
  });

  it("shows no badge with nothing off default", () => {
    stubWidth(false);
    renderRack("owned");
    expect(screen.getByRole("button", { name: "Filters" })).not.toHaveTextContent(/\d/);
  });

  it("keeps search on the persistent row, outside the sheet", () => {
    stubWidth(false);
    renderRack("owned");
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mounts one treatment at a time, never both", () => {
    stubWidth(true);
    renderRack("owned");
    expect(screen.getAllByRole("searchbox")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Filters" })).not.toBeInTheDocument();
  });

  it("does not restate the reveal control's own count", () => {
    stubWidth(true);
    renderRack("owned");
    expect(screen.queryByText(/more below/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm vitest run src/components/commanders/rack/filter-rack.test.tsx`
Expected: FAIL — import unresolved.

- [ ] **Step 3: Build the rack**

Container: `--surface-sunken` (`#171310`) with a `1px --border` bottom, padding `14px 22px 12px`, three rows — controls, chips, result line — at `gap: 11px`.

Wide (`useIsWide()` true): controls inline, in **leading-edge reading order** per readiness decision 2 — search, then colours with the match modifier, then the lane control (`Score against` on owned, nothing extra on discover since scope leads), then order. On discover, scope leads the rack. Frame `I1`'s trailing arrangement is **not built**.

Narrow: a persistent row of search · order icon · `Filters`, all 44px, with the badge; everything else in the sheet.

The badge is `activeControlCount(params, lane)` and nothing else. `RevealControl`'s "25 shown · N more below" is untouched and **the rack must not restate it**.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run src/components/commanders/rack/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/commanders/rack/filter-rack.tsx src/components/commanders/rack/filter-rack.test.tsx
git commit -m "feat(commanders): compose the two-lane filter rack"
```

---

### Task 11: Wire the owned lane

`CommandersView` swaps `FilterBar` for `FilterRack` and adopts `lane-params` for its URL writes.

**Files:**
- Modify: `src/components/commanders/commanders-view.tsx`
- Test: `src/components/commanders/commanders-view.test.tsx`

**Interfaces:**
- Consumes: `FilterRack` (Task 10); `parseLaneParams` / `serializeLaneParams` (Task 1).

- [ ] **Step 1: Read the current wiring**

Read `src/components/commanders/commanders-view.tsx` (370 lines) — `serializeParams(colors, avail)` at 39-49, the URL write effect at 107-112, the `FilterBar` call at 284-313, the `RecCard` call at 328-353.

- [ ] **Step 2: Write the failing tests**

Add to `src/components/commanders/commanders-view.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandersView } from "./commanders-view";

const replaceState = vi.fn();

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
    matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
  window.history.replaceState = replaceState;
});
afterEach(() => {
  replaceState.mockClear();
  vi.unstubAllGlobals();
});

describe("CommandersView URL writes", () => {
  it("writes only the parameters that are off their default", async () => {
    render(<CommandersView {...props()} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Black" }));
    expect(replaceState).toHaveBeenLastCalledWith(null, "", "?c=b");
  });

  it("writes nothing back once every control returns to its default", async () => {
    render(<CommandersView {...props()} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Black" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Black" }));
    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/commanders");
  });

  it("writes with replaceState rather than navigating", async () => {
    const push = vi.fn();
    render(<CommandersView {...props({ push })} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Black" }));
    expect(push).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalled();
  });

  it("preserves parameters it does not own, read off the live URL", async () => {
    window.history.replaceState(null, "", "/commanders?ref=email");
    render(<CommandersView {...props()} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Black" }));
    expect(replaceState.mock.lastCall?.[2]).toContain("ref=email");
  });

  it("renders the colour-match control with no pip lit", () => {
    render(<CommandersView {...props()} />);
    expect(screen.getByRole("radiogroup", { name: "Colour match" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
```

`props()` is a local helper returning a minimal valid `CommandersViewProps`, following the `item()` / `card()` helper style already used across `src/components/commanders/*.test.tsx`.

- [ ] **Step 3: Run them and watch them fail**

Run: `pnpm vitest run src/components/commanders/commanders-view.test.tsx`

- [ ] **Step 4: Swap the rack in**

Replace the `FilterBar` element with `FilterRack`, holding one `LaneParams` in state rather than the current separate `colors` / `avail` / `query` pieces. Replace `serializeParams` with `serializeLaneParams(params, "owned")`. Keep the existing `window.history.replaceState` write, keep the precomputed-ranking payload approach (`rankFree` / `toFreeDelta`), and keep reading unowned parameters back off the live URL.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `pnpm vitest run src/components/commanders/`

- [ ] **Step 6: Commit**

```bash
git add src/components/commanders/commanders-view.tsx src/components/commanders/commanders-view.test.tsx
git commit -m "feat(commanders): render the owned lane on the shared rack"
```

---

### Task 12: Wire the discover lane, and defect 2 dies with `FilterBar`

Defect 2: the exact-identity note prints a figure with the name search folded into it — `filtered` is composed at `discovery-view.tsx:96-101` and printed at `filter-bar.tsx:513` and `:601`. The predicate itself (`src/lib/commanders/filter.ts:25-37`) is correct. Per readiness decision 4, the rebuild takes it: a standalone patch would edit a file this plan deletes.

**Files:**
- Modify: `src/components/commanders/discovery-view.tsx`
- Delete: `src/components/commanders/filter-bar.tsx`, `src/components/commanders/scope-control.tsx`, `src/components/commanders/facet-strip.tsx`
- Test: `src/components/commanders/discovery-view.test.tsx`

- [ ] **Step 1: Write the failing test — the pinned property**

```typescript
it("counts only its own control in the Exactly aside", () => {
  // 40 commanders. "druid" alone matches 9. Of those 9, Any-of-BG matches 6
  // and Exactly-BG matches 2. The aside must say 4, never a figure that has
  // the name search folded into it.
  renderDiscovery({ items: fixture, q: "druid", colors: ["b", "g"], match: "exactly" });
  expect(
    screen.getByText((_, el) =>
      el?.textContent?.includes("Exactly excludes 4 that Any would show") ?? false,
    ),
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/components/commanders/discovery-view.test.tsx`
Expected: FAIL — the shipped composition prints the combined figure.

- [ ] **Step 3: Compute the aside from one control**

Compute `excludedByExactly` as `filterByColors(searched, colors, "contains").length - filterByColors(searched, colors, "exactly").length`, where `searched` is the list after **every other** control has been applied. Pass `null` when the difference is zero or `Exactly` is not active. Both arms narrow the same base, so the figure is about the match control alone.

Then swap `FilterBar` for `FilterRack`, adopt `lane-params`, and keep the 350ms search debounce into `settledQuery`.

`useDiscoveryCache` stays, but its key narrows. `cacheKey(sort, avail)` was `` `${sort}:${avail}` ``; availability no longer exists on this lane, so the key becomes the sort alone and `serve` writes only `o` and `s`, deleting defaults exactly as `serializeLaneParams` does. Every cache rule in `AGENTS.md` still holds: a fresh server payload wins over a cached entry for the same key and is filed on its way past, adjusted during render rather than in an effect; a cache hit still writes the URL via `history.replaceState`; and parameters the view does not own are read back off the live URL.

`DiscoveryRow`'s props lose `avail` for the same reason — its signature becomes `{ item, rank, sort, counts }`.

- [ ] **Step 4: Delete the replaced files**

```bash
git rm src/components/commanders/filter-bar.tsx src/components/commanders/scope-control.tsx src/components/commanders/facet-strip.tsx
```

`filter-bar.tsx` re-exports `useIsDesktop` for existing callers — move that import to `src/components/ui/use-is-desktop.ts` at each call site the typecheck flags.

- [ ] **Step 5: Run the tests and typecheck**

Run: `pnpm vitest run && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -u src/components/commanders/
git commit -m "fix(discovery): make each note count only its own control (defect 2)"
```

---

### Task 13: The row redraw, both lanes, both breakpoints

Per readiness correction 1 this edits **`rec-card.tsx` and `discovery-row.tsx`**. Per correction 2 the phone row is built from frame `E6` and decision 5b, **not** from the stale `Row — phone` component note.

**Files:**
- Modify: `src/components/commanders/rec-card.tsx`, `src/components/commanders/discovery-row.tsx`
- Test: `src/components/commanders/discovery-row.test.tsx`, `src/components/commanders/rec-card.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/components/commanders/discovery-row.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiscoveryRow } from "./discovery-row";
import { item } from "./test-fixtures";

const row = (over = {}) =>
  render(
    <DiscoveryRow
      item={item({ ownedSupport: 84, edhrecTotal: 236, unplayedCount: 172, deckCount: 1209, ...over })}
      rank={1}
      sort="fit"
      counts={null}
    />,
  );

describe("DiscoveryRow", () => {
  it("shows no printing thumbnail at rest", () => {
    const { container } = row();
    expect(container.querySelector("img[alt*='printing']")).toBeNull();
  });

  it("prints the support count over the EDHREC total", () => {
    row();
    expect(screen.getByText("84")).toBeInTheDocument();
    expect(screen.getByText("OF TOP 236 OWNED")).toBeInTheDocument();
  });

  it("prints no score out of 100, because discovery does not blend", () => {
    row();
    expect(screen.queryByText(/\/100/)).not.toBeInTheDocument();
    expect(screen.queryByText(/FIT/)).not.toBeInTheDocument();
  });

  it("prints no delta", () => {
    row();
    expect(screen.queryByText(/[↑↓]\d+ from/)).not.toBeInTheDocument();
  });

  it("prints the deck count and the novelty count", () => {
    row();
    expect(
      screen.getByText((_, el) => el?.textContent === "1,209 decks tracked"),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => el?.textContent === "172 of its top cards new to you"),
    ).toBeInTheDocument();
  });

  it("ends the content column on 'not in your collection'", () => {
    row();
    expect(screen.getByText("not in your collection")).toBeInTheDocument();
  });

  it("offers See the pool as its only action", () => {
    row();
    expect(screen.getByRole("link", { name: "See the pool" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Start this deck" })).not.toBeInTheDocument();
  });
});
```

Add to `src/components/commanders/rec-card.test.tsx`:

```typescript
it("shows no printing thumbnail at rest on the owned lane", () => {
  const { container } = renderOwnedCard();
  expect(container.querySelector("img[alt*='printing']")).toBeNull();
});

it("keeps every shipped figure on the owned lane", () => {
  renderOwnedCard({ score: 72, ownOfTop: [18, 30], freeCards: 214, inUse: 6 });
  expect(screen.getByText("72 /100 fit")).toBeInTheDocument();
  expect(screen.getByText("own 18 of top 30")).toBeInTheDocument();
  expect(screen.getByText("214 of your cards are free")).toBeInTheDocument();
  expect(screen.getByText("6 already in use")).toBeInTheDocument();
});

it("carries no header CTA — the row is the action", () => {
  renderOwnedCard();
  expect(screen.getAllByRole("link", { name: "Start this deck" })).toHaveLength(1);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm vitest run src/components/commanders/discovery-row.test.tsx src/components/commanders/rec-card.test.tsx`

- [ ] **Step 3: Redraw the owned row**

Art bleeds from the leading edge over a 470px band:

```
mask-image: linear-gradient(90deg,#000 0,#000 42%,rgba(0,0,0,.5) 72%,transparent);
```

darkened by `linear-gradient(90deg, rgba(20,17,14,.28) 0px, .42 108px, .78 220px, .94 336px, 1 452px)`.

Columns: 24px rank · content · 206px fit block · 32px `Start this deck` pill. Every shipped figure is retained — role counters, `own N of top M`, the availability line, receipts, fit and the split bar. The synergy and fit graphs take the theme accent ramp. **No header CTA.** No thumbnail at rest; `I3` (34×48 desktop, 28×40 phone) is the contingency frame only if a printing is ever named on the row.

- [ ] **Step 4: Redraw the discover row**

No fit block, no delta, no split bar. A 246px stack: a mono 27px/600 support count over a mono 11px `OF TOP 236 OWNED` (from `discoverCopy.row.supportOwned`), then a single-fill `--accent` ratio bar, then `discoverCopy.row.popularity(n)` and `discoverCopy.row.novelty(n)` at mono 10.5px. The content column ends on `discoverCopy.row.notOwned`. Trailing action is `See the pool`. `Best fit` ranks on the support ratio as a sort key; it is not a displayed score.

Keep the comment at `discovery-row.tsx:357` — *"No `/100`, no FIT stack: discovery does not blend"* — which now agrees with the design.

Phone: two bands, from frame `E6` and decision 5b, not a transcription of the desktop column.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `pnpm vitest run src/components/commanders/`

- [ ] **Step 6: Commit**

```bash
git add src/components/commanders/rec-card.tsx src/components/commanders/discovery-row.tsx src/components/commanders/discovery-row.test.tsx src/components/commanders/rec-card.test.tsx
git commit -m "feat(commanders): redraw both lanes' rows, art bleed and counts-only discover"
```

---

### Task 14: The fifth nav item — BLOCKED on the refresh merging

**Do not start this task until `design/design_handoff_the99_refresh` is merged to `main` and this branch is rebased onto it.** That package rewrites `src/components/shell/nav.tsx` whole-file, ships the four-item icon rail and retires adjudication #1. This task adds one entry to the already-refreshed `ITEMS` array and one member to the `NavItem['href']` union. Nothing else in this plan depends on it.

**Files:**
- Modify: `src/components/shell/nav.tsx`
- Test: `src/components/shell/nav.test.tsx`

- [ ] **Step 1: Rebase onto the merged refresh**

```bash
git fetch origin && git rebase origin/main
```

Confirm `nav.tsx` is the refreshed version before editing.

- [ ] **Step 2: Write the failing test**

```typescript
it("lists five destinations, with Discover after Commanders", () => {
  render(<NavRail />);
  const labels = screen.getAllByRole("link").map((l) => l.textContent);
  expect(labels).toEqual(["Home", "Collection", "Commanders", "Discover", "Decks"]);
});

it("marks Discover current on the discover route", () => {
  render(<NavRail pathname="/discover" />);
  expect(screen.getByRole("link", { name: "Discover" })).toHaveAttribute("aria-current", "page");
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `pnpm vitest run src/components/shell/nav.test.tsx`

- [ ] **Step 4: Add the entry**

Add `"/discover"` to the `NavItem['href']` union and one entry to `ITEMS`, between Commanders and Decks:

```typescript
{ href: "/discover", label: "Discover", lockable: true },
```

Nav measurements at 390 / 375 / 360 / 320 are in `CHROME-five-item-nav.md`. Do not draw a fifth diamond frame — the refresh's rail already carries the treatment.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `pnpm vitest run src/components/shell/nav.test.tsx`

- [ ] **Step 6: Commit**

```bash
git add src/components/shell/nav.tsx src/components/shell/nav.test.tsx
git commit -m "feat(shell): add Discover to the nav"
```

---

### Task 15: The zero states

**Files:**
- Create: `src/lib/commanders/nearest-fix.ts`
- Modify: `src/components/commanders/filtered-empty.tsx`, `src/components/commanders/discovery-empty.tsx`
- Test: `src/lib/commanders/nearest-fix.test.ts`, `src/components/commanders/filtered-empty.test.tsx`, `src/components/commanders/discovery-empty.test.tsx`

**Interfaces:**
- Produces:
  ```typescript
  // nearest-fix.ts — the choice is arithmetic, so it lives outside the component.
  export type FixCandidate = { control: string; rows: number; changedAt: number };
  export function nearestFix(candidates: FixCandidate[]): FixCandidate | null;

  // filtered-empty.tsx
  export function FilteredEmpty(p: {
    nearest: { name: string; control: string; rows: number } | null;
    onDrop: () => void;
    onClearAll: () => void;
  }): JSX.Element;

  // discovery-empty.tsx
  export function DiscoveryEmpty(p: {
    query: string; total: number; onClearSearch: () => void;
  }): JSX.Element;
  ```
  `nearestFix` returns the candidate returning the most rows; ties break toward the highest `changedAt`. It returns `null` when every candidate returns zero rows.

- [ ] **Step 1: Write the failing tests**

`src/components/commanders/filtered-empty.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FilteredEmpty } from "./filtered-empty";

describe("FilteredEmpty", () => {
  it("names the single control whose removal returns the most rows", () => {
    render(
      <FilteredEmpty
        nearest={{ name: "Yeva, Nature's Herald", control: "Red", rows: 3 }}
        onDrop={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent ===
          "Yeva, Nature's Herald is in your commanders, but Red excludes it. Drop the colour and you get 3 rows back.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drop Red" })).toBeInTheDocument();
  });

  it("says one row rather than 1 rows", () => {
    render(
      <FilteredEmpty
        nearest={{ name: "Yeva, Nature's Herald", control: "Red", rows: 1 }}
        onDrop={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(screen.getByText(/you get one row back/)).toBeInTheDocument();
  });

  it("drops the promise when no single control fixes it", () => {
    render(<FilteredEmpty nearest={null} onDrop={() => {}} onClearAll={() => {}} />);
    expect(
      screen.getByText("No single filter is doing this — several are overlapping."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Drop / })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear all filters" })).toBeInTheDocument();
  });

  it("always offers Clear all filters", () => {
    render(
      <FilteredEmpty
        nearest={{ name: "Yeva, Nature's Herald", control: "Red", rows: 3 }}
        onDrop={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Clear all filters" })).toBeInTheDocument();
  });

  it("heads the state without a CTA of its own", () => {
    render(<FilteredEmpty nearest={null} onDrop={() => {}} onClearAll={() => {}} />);
    expect(screen.getByText("Nothing in the pile matches")).toBeInTheDocument();
  });
});
```

The tie-break — most rows returned, ties toward the most recently changed control — is computed outside the component, so it is unit-tested next to `activeControlCount`:

```typescript
it("breaks a tie toward the most recently changed control", () => {
  expect(
    nearestFix([
      { control: "Red", rows: 3, changedAt: 1 },
      { control: "Free cards only", rows: 3, changedAt: 2 },
    ])?.control,
  ).toBe("Free cards only");
});
```

`src/components/commanders/discovery-empty.test.tsx`:

```typescript
it("keeps the rack visible at zero — a zero result is a fact about the list", () => {
  render(<DiscoveryView {...props({ items: [], q: "zzz" })} />);
  expect(screen.getByRole("searchbox")).toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Colour identity" })).toBeInTheDocument();
});

it("names the lane boundary rather than a spelling hint alone", () => {
  render(<DiscoveryEmpty query="jodah" total={3301} onClearSearch={() => {}} />);
  expect(screen.getByText("No commander by that name")).toBeInTheDocument();
  expect(screen.getByText(/it's on your commanders instead/)).toBeInTheDocument();
});

it("offers the other lane, carrying the same query", () => {
  render(<DiscoveryEmpty query="jodah" total={3301} onClearSearch={() => {}} />);
  expect(screen.getByRole("link", { name: "Search your commanders" })).toHaveAttribute(
    "href",
    "/commanders?q=jodah",
  );
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm vitest run src/components/commanders/filtered-empty.test.tsx src/components/commanders/discovery-empty.test.tsx`

- [ ] **Step 3: Build both**

Owned (`D4`): the rack is unchanged, the result line reads `0 of 148 commanders match`, and below it three diamonds, `commandersCopy.empty.heading`, one sentence that names the control and what dropping it returns (`bodyOneFix`), then a filled specific correction (`fixDrop`) and a hairline `Clear all filters`. The correction is the single control whose removal yields the most rows; ties break toward the most recently changed control. Where no single control fixes it, use `bodyNoSingleFix` and render only `Clear all filters`.

Discover (`D5`): `0 of 3,301 commanders match`, `discoverCopy.empty.heading`, and a body carrying the lane boundary. The second button is `Search your commanders` — the same query, the other lane.

Phone (`E5`): buttons stack full-width at 48px.

**Never hide, disable or collapse the rack at zero.** The controls are how you leave it.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run src/components/commanders/`

- [ ] **Step 5: Commit**

```bash
git add src/components/commanders/filtered-empty.tsx src/components/commanders/discovery-empty.tsx src/components/commanders/filtered-empty.test.tsx src/components/commanders/discovery-empty.test.tsx
git commit -m "feat(commanders): draw both lanes' zero states"
```

---

### Task 16: The three pinned regression properties

The spec pins three properties. Each one is a defect that came back once already, so each gets a test that fails if it returns.

**Files:**
- Create: `src/lib/commanders/lanes.test.ts`

- [ ] **Step 1: Write the three tests**

Create `src/lib/commanders/lanes.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { filterByColors } from "./filter";
import { clearsFloor } from "@/lib/discovery/novelty";

type Row = { oracleId: string; name: string; colorIdentity: string[] };

const POOL: Row[] = [
  { oracleId: "1", name: "Druid of the Cowl", colorIdentity: ["g"] },
  { oracleId: "2", name: "Druid Class", colorIdentity: ["g"] },
  { oracleId: "3", name: "Grim Druid", colorIdentity: ["b", "g"] },
  { oracleId: "4", name: "Golgari Druid", colorIdentity: ["b", "g"] },
  { oracleId: "5", name: "Sultai Druid", colorIdentity: ["b", "g", "u"] },
  { oracleId: "6", name: "Elvish Mystic", colorIdentity: ["g"] },
  { oracleId: "7", name: "Sol Ring Bearer", colorIdentity: [] },
];

const search = (rows: Row[], q: string) =>
  q === "" ? rows : rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));

describe("arithmetic identity", () => {
  it("printed total minus exclusions equals the rows on screen", () => {
    const total = POOL.length;
    const searched = search(POOL, "druid");
    const shown = filterByColors(searched, ["b", "g"], "exactly");

    const excludedBySearch = total - searched.length;
    const excludedByColour =
      searched.length - filterByColors(searched, ["b", "g"], "contains").length;
    const excludedByMatch =
      filterByColors(searched, ["b", "g"], "contains").length - shown.length;

    expect(total - excludedBySearch - excludedByColour - excludedByMatch).toBe(shown.length);
  });

  it("prints no exclusions at rest, so the lane states rather than divides", () => {
    expect(filterByColors(search(POOL, ""), [], "contains")).toHaveLength(POOL.length);
  });
});

describe("a note counts only its own control", () => {
  it("measures Exactly against Any on the same already-narrowed base", () => {
    const searched = search(POOL, "druid"); // 5 rows
    const any = filterByColors(searched, ["b", "g"], "contains"); // 3: ids 3, 4, 5
    const exactly = filterByColors(searched, ["b", "g"], "exactly"); // 2: ids 3, 4

    // The aside is about the match control alone. The name search narrowed both
    // arms equally, so it cancels — this is the figure defect 2 got wrong.
    expect(any.length - exactly.length).toBe(1);
  });

  it("reports nothing when Exactly costs no rows", () => {
    const searched = search(POOL, "golgari");
    const any = filterByColors(searched, ["b", "g"], "contains");
    const exactly = filterByColors(searched, ["b", "g"], "exactly");
    expect(any.length - exactly.length).toBe(0);
  });
});

describe("membership under a scoring control", () => {
  // Availability is a scoring control. It may reorder the lane and it may
  // change every printed figure. It may not add or remove one row.
  const owned = [
    { oracleId: "a", collectionSupport: 40, freeSupport: 5, edhrecTotal: 100 },
    { oracleId: "b", collectionSupport: 12, freeSupport: 1, edhrecTotal: 100 },
    { oracleId: "c", collectionSupport: 2, freeSupport: 0, edhrecTotal: 100 },
  ];

  const membership = (avail: "all" | "free") =>
    owned
      .filter((c) => clearsFloor({ collectionSupport: c.collectionSupport, edhrecTotal: c.edhrecTotal }))
      .map((c) => ({
        oracleId: c.oracleId,
        // Only the printed figure moves with the mode.
        support: avail === "free" ? c.freeSupport : c.collectionSupport,
      }));

  it("returns the same commanders under either availability mode", () => {
    expect(membership("free").map((c) => c.oracleId)).toEqual(
      membership("all").map((c) => c.oracleId),
    );
  });

  it("still lets the mode change the printed figure", () => {
    expect(membership("free")[0].support).not.toBe(membership("all")[0].support);
  });

  it("keeps a commander below the floor out under either mode", () => {
    expect(membership("all").map((c) => c.oracleId)).not.toContain("c");
    expect(membership("free").map((c) => c.oracleId)).not.toContain("c");
  });
});
```

- [ ] **Step 2: Run them**

Run: `pnpm vitest run src/lib/commanders/lanes.test.ts`
Expected: PASS — the defects are already fixed by Tasks 2, 3 and 12. These tests exist to keep them fixed.

- [ ] **Step 3: Run the whole gate**

```bash
pnpm typecheck && pnpm lint && pnpm test
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/commanders/lanes.test.ts
git commit -m "test(commanders): pin the three properties the two-lane split restores"
```

---

## Verification before the PR

- [ ] Run the design-review skill: enumerate a property table from `design/design_handoff_the99_commanders_discover/`, verify the implementation against it, confirm the gaps are closed. Commit the table to `docs/superpowers/design-tables/commanders-discover.md` and the gap report to `docs/superpowers/gap-report-commanders-discover.md`.
- [ ] Walk all twelve cells of `STATES-filter-rack.md` in a browser at 390px, 768px, 1023px and 1280px. The 1023px check is call 3: the sheet must still win.
- [ ] Confirm the rack does not change height between a full list and a zero result, on either lane.
- [ ] Confirm `/commanders?scope=play&c=b,g&sort=new` 308s to `/discover?c=b%2Cg&s=new`.
- [ ] Send the two labels the spec routed there — `Score against` and `Contains / Exactly` — to `/copy-review`. They are copy content and do not belong to this plan or to a Design round.
