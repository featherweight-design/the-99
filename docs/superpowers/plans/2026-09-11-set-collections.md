# Set Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Answer "which cards from this set do I still need?" with a grid of every card in a set, where cards you own render at full strength and the ones you are missing render dimmed.

**Architecture:** Two child routes under `/collection`, fed by three new catalog columns. Queries fetch rows; all placement, counting and cost arithmetic are pure functions over those rows, so the model is unit-testable without a live Postgres. The set page's population is inverted from `/collection`'s, so it shares components by mounting them, never by branching them.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-10-set-collections-design.md`
**Handoff:** `design/design_handoff_the99_set_collections/` (R3)
**Readiness:** `docs/superpowers/readiness-set-collections.md` — 🟢 Green

## Global Constraints

- **Package manager is pnpm.** Never npm or yarn.
- **Pre-push gate, every push:** `pnpm typecheck && pnpm lint && pnpm test`, plus the stub build `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`, then `git fetch origin && git rebase origin/main`.
- **Stage files by name.** Never `git add -A`.
- **All work in a worktree** under `.worktrees/<branch>`; copy `.env` from the repo root in.
- **No hex literals in any component.** Every colour is `var(--token)`. The feature rests on a dim that must read the same in six themes.
- **Copy lives in `src/lib/copy/`.** Two exported blocks, `setsIndexCopy` and `setPageCopy`, sharing `setFilterCopy`. Strings are transcribed from `design/design_handoff_the99_set_collections/set-collections · copy strings.ts`, never invented at the call site.
- **Target floors:** 44px phone, 32px desktop.
- **No em dashes in user-facing copy.**
- **Mobile and desktop parity ship in the same PR**, and every UI PR passes the design-review skill before `gh pr create`.
- **The dim is on the art, never on the type.** Missing art is `opacity: .28; filter: saturate(.55)`; the name stays `--fg-body`. A missing cell's edge is `1px dashed var(--fg-locked)` — **never `--border-dashed`**, which measures 1.46:1 (Oil Haze) to 1.97:1 (Canopy) against `--surface-sunken` and fails the 3:1 non-text floor in all six themes. `--fg-locked` clears at 3.16 to 3.44:1.
- **Owned and missing cells have identical geometry.** The grid must not reflow when a filter flips.
- **No control inside a cell at any width.** Tapping a cell opens the existing card-detail modal.
- **Every control is a URL parameter:** `c` (comma-joined colours), `r` (rarity), `m=1` (missing only) on the grid; `q` on the index.
- **One count function.** The result line, the `Send N to ManaPool` label and the cost strip's denominator are three readings of one filtered-cell computation.
- **Findings from the readiness audit that change the build:**
  - Scryfall set icons do **not** inherit `currentColor` — they are bare `<path>` with no `fill`. Recolour with `mask-image` plus a token background.
  - The colour filter is **not** a mountable component today; Task 9 extracts it. It must come out parameterised, never taking an `isSetPage` flag.
  - Decision 16's delta strip has no push mechanism; Task 16 fetches a count on window focus.

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/lib/sets/completion.ts` | Pure cell placement and counting. No DB imports. |
| `src/lib/sets/cost.ts` | Pure cost-to-complete arithmetic and price cases. |
| `src/lib/sets/filters.ts` | Pure filter application and URL parameter serialisation. |
| `src/lib/sets/read.ts` | The two queries. Fetches rows; computes nothing. |
| `src/lib/copy/sets.ts` | `setsIndexCopy`, `setPageCopy`, `setFilterCopy`. |
| `src/app/collection/sets/page.tsx` · `loading.tsx` | The index route. |
| `src/app/collection/sets/[code]/page.tsx` · `loading.tsx` | The grid route. |
| `src/app/collection/sets/actions.ts` | The delta count server action. |
| `src/components/sets/set-index-view.tsx` | Index list, search, five states. |
| `src/components/sets/set-grid-view.tsx` | Grid, sticky head, two sections. |
| `src/components/sets/set-cell.tsx` | One cell: art, edge, caption, price tag, marks. |
| `src/components/sets/set-filters.tsx` | The three filters, mounting the extracted colour row. |
| `src/components/sets/cost-strip.tsx` | Cost figure, its stated gap, the cart button. |
| `src/components/sets/set-icon.tsx` | `icon_svg_uri` as a masked, token-coloured disc. |
| `src/components/sets/delta-strip.tsx` | The upload-while-open strip. |
| `src/components/collection/color-filter-row.tsx` | Extracted from `filter-bar.tsx`; mounted by both surfaces. |
| `scripts/probe-sets.mjs` | Browser proof of the visual rulings. |

**Modified**

| File | Change |
|---|---|
| `src/db/schema.ts` | `printings.booster`, `printings.rarity`, `sets.baseSetSize` |
| `src/lib/scryfall/transform-printings.ts` | Populate the two new printing fields |
| `src/lib/scryfall/seed-printings.ts` | Upsert them; add the base-set-size pass |
| `src/app/collection/actions.ts` | Extend `revalidatePath` to the set page |
| `src/components/collection/filter-bar.tsx` | Mount the extracted colour row |
| `src/components/collection/rows-view.tsx` | §1b cost track (severable) |
| `docs/superpowers/design-pipeline-status.md` | Move the ticket to 🔨 then ✅ |

---

## Task 1: The two printing columns

**Files:**
- Modify: `src/db/schema.ts:60-88` (the `printings` table)
- Modify: `src/lib/scryfall/transform-printings.ts:97-112` (`PrintingRow`), `:104-114` (the row literal)
- Modify: `src/lib/scryfall/seed-printings.ts:85-95` (the upsert `set` block)
- Test: `src/lib/scryfall/transform-printings.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `PrintingRow.booster: boolean` and `PrintingRow.rarity: string`; columns `printings.booster` (boolean, nullable) and `printings.rarity` (text, nullable).

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/scryfall/transform-printings.test.ts`. The fixture helper in that file already builds a raw bulk entry; extend the calls with the new keys.

```ts
describe("booster and rarity", () => {
  it("carries booster through from the bulk entry", () => {
    const result = classifyPrinting(raw({ booster: true }));
    expect(result.kind).toBe("printing");
    expect((result as { row: PrintingRow }).row.booster).toBe(true);
  });

  it("reads a base-run full-art basic as in-booster", () => {
    // EOE #262 is a full-art Plains: is_variant true, but inside the base run.
    const result = classifyPrinting(raw({
      collector_number: "262", booster: true, frame_effects: ["inverted"], full_art: true,
    }));
    const row = (result as { row: PrintingRow }).row;
    expect(row.isVariant).toBe(false);   // "inverted" is not a VARIANT_TREATMENT
    expect(row.booster).toBe(true);
  });

  it("reads a showcase extra as out of booster", () => {
    const result = classifyPrinting(raw({
      collector_number: "290", booster: false, frame_effects: ["legendary", "inverted"],
    }));
    expect((result as { row: PrintingRow }).row.booster).toBe(false);
  });

  it("defaults a missing booster key to false rather than throwing", () => {
    const result = classifyPrinting(raw({}));
    expect((result as { row: PrintingRow }).row.booster).toBe(false);
  });

  it("carries the printing's own rarity, not the oracle card's", () => {
    const result = classifyPrinting(raw({ set: "exp", rarity: "mythic" }));
    expect((result as { row: PrintingRow }).row.rarity).toBe("mythic");
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test src/lib/scryfall/transform-printings.test.ts`
Expected: FAIL — `booster` and `rarity` are not properties of `PrintingRow`.

- [ ] **Step 3: Add the fields to the transform**

In `transform-printings.ts`, extend `PrintingRow`:

```ts
  /**
   * Scryfall's own "can be found in a booster" flag, and the only reliable base-run
   * boundary we have. `is_variant` cannot serve: it is an art-treatment allowlist
   * built to choose a default art, and it flags EOE's full-art basics at #262-266,
   * which sit inside the base run. Verified against EOE: 1-276 booster, 277-399 not.
   */
  booster: boolean;
  /**
   * Rarity of THIS printing. `cards.rarity` is oracle-level, taken from one arbitrary
   * printing, and is wrong per set: Sacred Foundry is rare in `eoe` and mythic in `exp`.
   */
  rarity: string;
```

And in the row literal:

```ts
      booster: raw.booster === true,
      rarity: typeof raw.rarity === "string" ? raw.rarity : "",
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test src/lib/scryfall/transform-printings.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the columns to the schema**

In `src/db/schema.ts`, inside the `printings` table definition, after `flavorName`:

```ts
  /**
   * Scryfall's booster flag — the base-run boundary. NULLABLE on purpose: a printing
   * written before the re-seed has no answer, and `false` would be a lie that reads
   * as "this is an extra". A set whose rows are still null is not indexed yet.
   */
  booster: boolean("booster"),
  /** This printing's rarity. Nullable for the same reason as `booster`. */
  rarity: text("rarity"),
```

- [ ] **Step 6: Extend the seed upsert**

In `seed-printings.ts`, add to the `onConflictDoUpdate` `set` block, after `flavorName`:

```ts
        booster: sql`excluded.booster`,
        rarity: sql`excluded.rarity`,
```

- [ ] **Step 7: Generate the migration**

Run: `pnpm db:generate`
Expected: a new file in `drizzle/` adding two nullable columns. Read it and confirm there is no `NOT NULL` and no `DEFAULT`.

- [ ] **Step 8: Run the full gate**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/db/schema.ts src/lib/scryfall/transform-printings.ts \
  src/lib/scryfall/transform-printings.test.ts src/lib/scryfall/seed-printings.ts drizzle/
git commit -m "feat(catalog): record each printing's booster flag and its own rarity"
```

---

## Task 2: `sets.base_set_size`

**Files:**
- Modify: `src/db/schema.ts:15-23` (the `sets` table)
- Modify: `src/lib/scryfall/seed-printings.ts` (new exported pass, called from the seed entry point)
- Modify: `src/lib/scryfall/seed.ts` (call it after `setRepresentativePrintings`)
- Test: `src/lib/sets/completion.test.ts` (the pure reference ordering lives with the SQL's mirror, as `compareForRepresentative` does)

**Interfaces:**
- Consumes: `printings.booster` from Task 1.
- Produces: `sets.baseSetSize: number | null`; `export async function setBaseSetSizes(): Promise<number>` from `seed-printings.ts`.

- [ ] **Step 1: Add the column**

In `src/db/schema.ts`, in the `sets` table after `iconSvgUri`:

```ts
  /**
   * Count of this set's `booster = true` printings — the denominator every completion
   * figure divides by. Written by the post-load pass, never by the sets ingest, because
   * it is a fact about printings. NULL means "not indexed yet", which is a state the
   * index renders as such and never as 0%.
   */
  baseSetSize: integer("base_set_size"),
```

- [ ] **Step 2: Write the failing test for the pass's contract**

Create `src/lib/sets/completion.test.ts` with the arithmetic the SQL must reproduce. This is the same untested-query pattern `compareForRepresentative` uses: the pure function is the tested one, and the SQL mirrors it.

```ts
import { describe, it, expect } from "vitest";
import { baseSetSizeOf } from "./completion";

describe("baseSetSizeOf", () => {
  it("counts only printings in boosters", () => {
    expect(baseSetSizeOf([
      { collectorNumber: "1", booster: true },
      { collectorNumber: "276", booster: true },
      { collectorNumber: "277", booster: false },
    ])).toBe(2);
  });

  it("returns null when no printing has been classified yet", () => {
    expect(baseSetSizeOf([
      { collectorNumber: "1", booster: null },
      { collectorNumber: "2", booster: null },
    ])).toBeNull();
  });

  it("counts a partially classified set from what it knows rather than returning null", () => {
    expect(baseSetSizeOf([
      { collectorNumber: "1", booster: true },
      { collectorNumber: "2", booster: null },
    ])).toBe(1);
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `pnpm test src/lib/sets/completion.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the function**

Create `src/lib/sets/completion.ts`:

```ts
/** The minimum a printing must carry for the base-run count. */
export type BoosterFlagged = { collectorNumber: string; booster: boolean | null };

/**
 * Reference implementation of the base-set-size count. The ingest applies this in SQL
 * (see setBaseSetSizes in seed-printings.ts); the two must stay in step and this is the
 * tested one:
 *
 *   update sets s set base_set_size = c.n
 *     from (select set_code, count(*)::int as n from printings
 *            where booster is true group by set_code) c
 *    where s.code = c.set_code
 *
 * Null in, null out: a set nothing has classified yet has no denominator, and zero would
 * read as "a set with no cards" on a page whose whole job is a ratio.
 */
export function baseSetSizeOf(rows: BoosterFlagged[]): number | null {
  if (rows.every((r) => r.booster === null)) return null;
  return rows.filter((r) => r.booster === true).length;
}
```

- [ ] **Step 5: Run it and confirm it passes**

Run: `pnpm test src/lib/sets/completion.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the SQL pass**

In `seed-printings.ts`, beside `setRepresentativePrintings`:

```ts
/**
 * Fills sets.base_set_size from the booster flag. Reset-then-set like the representative
 * pass, so a set that loses printings does not keep a stale denominator. Mirrors
 * baseSetSizeOf in src/lib/sets/completion.ts, which is where it is unit-tested.
 */
export async function setBaseSetSizes(): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`update sets set base_set_size = null where base_set_size is not null`);
    const updated = await tx.execute(sql`
      update sets s
         set base_set_size = c.n
        from (
          select set_code, count(*)::int as n
            from printings
           where booster is true
           group by set_code
        ) c
       where s.code = c.set_code
      returning s.code
    `);
    return updated.rows.length;
  });
}
```

- [ ] **Step 7: Call it from the seed entry point**

In `src/lib/scryfall/seed.ts`, immediately after the `setRepresentativePrintings()` call, add `await setBaseSetSizes();` and include its count in whatever the script logs.

- [ ] **Step 8: Generate the migration and run the gate**

Run: `pnpm db:generate && pnpm typecheck && pnpm lint && pnpm test`
Expected: a migration adding one nullable integer column; all checks pass.

- [ ] **Step 9: Commit**

```bash
git add src/db/schema.ts src/lib/sets/completion.ts src/lib/sets/completion.test.ts \
  src/lib/scryfall/seed-printings.ts src/lib/scryfall/seed.ts drizzle/
git commit -m "feat(catalog): count each set's base run into base_set_size"
```

---

## Task 3: Cell placement

**Files:**
- Modify: `src/lib/sets/completion.ts`
- Test: `src/lib/sets/completion.test.ts`

**Interfaces:**
- Consumes: `baseSetSizeOf` from Task 2.
- Produces:

```ts
export type SetPrinting = {
  scryfallId: string; oracleId: string; collectorNumber: string;
  name: string; imageUriSmall: string | null;
  rarity: string | null; booster: boolean | null; finishes: string[];
};
export type Holding = {
  oracleId: string; collectorNumber: string; finish: "nonfoil" | "foil" | "etched";
};
export type Cell = SetPrinting & {
  owned: boolean;
  /** True when a holding with no collector number filled this cell by oracle id. */
  byName: boolean;
  /** True when every holding filling this cell is foil. */
  foilOnly: boolean;
};
export function placeCells(printings: SetPrinting[], holdings: Holding[]): Cell[];
```

- [ ] **Step 1: Write the failing tests**

```ts
import { placeCells } from "./completion";

const p = (n: string, over: Partial<SetPrinting> = {}): SetPrinting => ({
  scryfallId: `s-${n}`, oracleId: `o-${n}`, collectorNumber: n, name: `Card ${n}`,
  imageUriSmall: null, rarity: "common", booster: true, finishes: ["nonfoil"], ...over,
});

describe("placeCells", () => {
  it("fills the cell whose collector number matches", () => {
    const cells = placeCells([p("1"), p("2")],
      [{ oracleId: "o-1", collectorNumber: "1", finish: "nonfoil" }]);
    expect(cells.map((c) => c.owned)).toEqual([true, false]);
    expect(cells[0].byName).toBe(false);
  });

  it("fills by oracle id when the holding carries no collector number", () => {
    const cells = placeCells([p("1")],
      [{ oracleId: "o-1", collectorNumber: "", finish: "nonfoil" }]);
    expect(cells[0].owned).toBe(true);
    expect(cells[0].byName).toBe(true);
  });

  it("fills the lowest unfilled cell once when one oracle has two numbers", () => {
    // EOE's Plains at #262 and #268 share an oracle id.
    const printings = [p("262", { oracleId: "o-plains" }), p("268", { oracleId: "o-plains" })];
    const cells = placeCells(printings,
      [{ oracleId: "o-plains", collectorNumber: "", finish: "nonfoil" }]);
    expect(cells.map((c) => c.owned)).toEqual([true, false]);
  });

  it("ignores quantity — two unpinned holdings of one oracle still fill one cell each", () => {
    const printings = [p("262", { oracleId: "o-p" }), p("268", { oracleId: "o-p" })];
    const cells = placeCells(printings, [
      { oracleId: "o-p", collectorNumber: "", finish: "nonfoil" },
      { oracleId: "o-p", collectorNumber: "", finish: "nonfoil" },
    ]);
    expect(cells.map((c) => c.owned)).toEqual([true, true]);
  });

  it("lets a pinned holding win its own cell before an unpinned one takes it", () => {
    const printings = [p("262", { oracleId: "o-p" }), p("268", { oracleId: "o-p" })];
    const cells = placeCells(printings, [
      { oracleId: "o-p", collectorNumber: "268", finish: "nonfoil" },
      { oracleId: "o-p", collectorNumber: "", finish: "nonfoil" },
    ]);
    expect(cells.map((c) => c.owned)).toEqual([true, true]);
    expect(cells[1].byName).toBe(false);   // #268 was pinned
    expect(cells[0].byName).toBe(true);    // #262 took the unpinned one
  });

  it("any finish fills the cell, and foil-only is marked", () => {
    const cells = placeCells([p("1")],
      [{ oracleId: "o-1", collectorNumber: "1", finish: "foil" }]);
    expect(cells[0].owned).toBe(true);
    expect(cells[0].foilOnly).toBe(true);
  });

  it("is not foil-only when both finishes are held", () => {
    const cells = placeCells([p("1")], [
      { oracleId: "o-1", collectorNumber: "1", finish: "foil" },
      { oracleId: "o-1", collectorNumber: "1", finish: "nonfoil" },
    ]);
    expect(cells[0].foilOnly).toBe(false);
  });

  it("orders cells by collector number numerically, not lexically", () => {
    const cells = placeCells([p("10"), p("2"), p("1")], []);
    expect(cells.map((c) => c.collectorNumber)).toEqual(["1", "2", "10"]);
  });

  it("sorts a non-numeric collector number last", () => {
    const cells = placeCells([p("★"), p("2")], []);
    expect(cells.map((c) => c.collectorNumber)).toEqual(["2", "★"]);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm test src/lib/sets/completion.test.ts`
Expected: FAIL — `placeCells` is not exported.

- [ ] **Step 3: Implement**

Two passes, in this order: pinned holdings claim their own cell; unpinned holdings then take the lowest-numbered cell still unfilled for their oracle. Reuse the numeric-part helper's rule from `transform-printings.ts` (digits only, non-numeric last) so ordering matches the catalog's.

```ts
function numericPart(collectorNumber: string): number | null {
  const digits = collectorNumber.replace(/\D/g, "");
  return digits === "" ? null : Number(digits);
}

export function placeCells(printings: SetPrinting[], holdings: Holding[]): Cell[] {
  const ordered = [...printings].sort((a, b) => {
    const na = numericPart(a.collectorNumber), nb = numericPart(b.collectorNumber);
    if (na === null && nb === null) return a.collectorNumber.localeCompare(b.collectorNumber);
    if (na === null) return 1;
    if (nb === null) return -1;
    return na - nb;
  });

  const cells: Cell[] = ordered.map((p) => ({ ...p, owned: false, byName: false, foilOnly: false }));
  const finishes = new Map<string, Set<string>>();   // cell index -> finishes filling it
  const claim = (i: number, finish: string, byName: boolean) => {
    cells[i].owned = true;
    if (byName) cells[i].byName = true;
    const set = finishes.get(String(i)) ?? new Set<string>();
    set.add(finish);
    finishes.set(String(i), set);
  };

  const pinned = holdings.filter((h) => h.collectorNumber !== "");
  const unpinned = holdings.filter((h) => h.collectorNumber === "");

  for (const h of pinned) {
    const i = cells.findIndex(
      (c) => c.collectorNumber === h.collectorNumber && c.oracleId === h.oracleId,
    );
    if (i !== -1) claim(i, h.finish, false);
  }
  for (const h of unpinned) {
    const i = cells.findIndex((c) => c.oracleId === h.oracleId && !c.owned);
    if (i !== -1) claim(i, h.finish, true);
  }

  for (const [key, set] of finishes) {
    const i = Number(key);
    cells[i].foilOnly = !set.has("nonfoil") && !set.has("etched") && set.has("foil");
  }
  return cells;
}
```

- [ ] **Step 4: Run and confirm they pass**

Run: `pnpm test src/lib/sets/completion.test.ts`
Expected: PASS, all eleven.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sets/completion.ts src/lib/sets/completion.test.ts
git commit -m "feat(sets): place a collection's holdings onto a set's cells"
```

---

## Task 4: Counting, and the two sections

**Files:**
- Modify: `src/lib/sets/completion.ts`
- Test: `src/lib/sets/completion.test.ts`

**Interfaces:**
- Consumes: `Cell` and `placeCells` from Task 3.
- Produces:

```ts
export type SetSections = {
  base: Cell[]; extras: Cell[];
  baseOwned: number; baseTotal: number;
  extrasOwned: number; extrasTotal: number;
  /** 0-100, rounded to the nearest integer. Null when the set is not indexed. */
  percent: number | null;
  indexed: boolean;
};
export function sectionsOf(cells: Cell[]): SetSections;
```

- [ ] **Step 1: Write the failing tests**

```ts
describe("sectionsOf", () => {
  it("splits on the booster flag and counts each side apart", () => {
    const s = sectionsOf(placeCells(
      [p("1"), p("2"), p("277", { booster: false })],
      [{ oracleId: "o-1", collectorNumber: "1", finish: "nonfoil" }],
    ));
    expect([s.baseOwned, s.baseTotal]).toEqual([1, 2]);
    expect([s.extrasOwned, s.extrasTotal]).toEqual([0, 1]);
    expect(s.percent).toBe(50);
  });

  it("never folds extras into the headline percent", () => {
    const s = sectionsOf(placeCells(
      [p("1"), p("277", { booster: false })],
      [{ oracleId: "o-277", collectorNumber: "277", finish: "nonfoil" }],
    ));
    expect(s.percent).toBe(0);
    expect(s.extrasOwned).toBe(1);
  });

  it("reads a set whose printings are all unclassified as not indexed", () => {
    const s = sectionsOf(placeCells([p("1", { booster: null })], []));
    expect(s.indexed).toBe(false);
    expect(s.percent).toBeNull();
  });

  it("reports 100 percent when every base cell is filled, extras or not", () => {
    const s = sectionsOf(placeCells(
      [p("1"), p("277", { booster: false })],
      [{ oracleId: "o-1", collectorNumber: "1", finish: "nonfoil" }],
    ));
    expect(s.percent).toBe(100);
  });

  it("rounds rather than truncating", () => {
    const cells = placeCells(
      [p("1"), p("2"), p("3")],
      [{ oracleId: "o-1", collectorNumber: "1", finish: "nonfoil" }],
    );
    expect(sectionsOf(cells).percent).toBe(33);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm test src/lib/sets/completion.test.ts`
Expected: FAIL — `sectionsOf` is not exported.

- [ ] **Step 3: Implement**

```ts
export function sectionsOf(cells: Cell[]): SetSections {
  const indexed = cells.some((c) => c.booster !== null);
  const base = cells.filter((c) => c.booster === true);
  const extras = cells.filter((c) => c.booster === false);
  const baseOwned = base.filter((c) => c.owned).length;
  return {
    base, extras,
    baseOwned, baseTotal: base.length,
    extrasOwned: extras.filter((c) => c.owned).length, extrasTotal: extras.length,
    percent: indexed && base.length > 0 ? Math.round((baseOwned / base.length) * 100) : null,
    indexed,
  };
}
```

- [ ] **Step 4: Run and confirm they pass**

Run: `pnpm test src/lib/sets/completion.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sets/completion.ts src/lib/sets/completion.test.ts
git commit -m "feat(sets): count the base run and the extras apart"
```

---

## Task 5: Filters, and the one count

**Files:**
- Create: `src/lib/sets/filters.ts`, `src/lib/sets/filters.test.ts`

**Interfaces:**
- Consumes: `Cell` from Task 3.
- Produces:

```ts
export type SetGridFilters = { colors: string[]; rarities: string[]; missingOnly: boolean };
export const EMPTY_FILTERS: SetGridFilters;
export function applyFilters(cells: Cell[], f: SetGridFilters): Cell[];
export function parseFilters(params: URLSearchParams): SetGridFilters;
export function serialiseFilters(f: SetGridFilters): URLSearchParams;
```

Cells need `colorIdentity: string[]` for the colour filter — add it to `SetPrinting` in Task 3's type and select it in Task 7's query. It comes from `cards.colorIdentity`.

- [ ] **Step 1: Write the failing tests**

```ts
describe("applyFilters", () => {
  it("keeps only missing cells under missing-only", () => { /* two cells, one owned */ });
  it("matches a colour when the identity contains it", () => { /* R matches ["R","G"] */ });
  it("treats multiple colours as any, never as exactly", () => { /* W or U */ });
  it("keeps a colourless card out of every colour filter", () => { /* identity [] */ });
  it("matches rarity case-insensitively against the printing's own rarity", () => {});
  it("combines missing-only with rarity", () => {});
  it("returns nothing when the combination matches nothing", () => {});
});

describe("filter URL round trip", () => {
  it("serialises defaults as absences", () => {
    expect(serialiseFilters(EMPTY_FILTERS).toString()).toBe("");
  });
  it("joins colours on a comma in WUBRG order", () => {
    expect(serialiseFilters({ colors: ["R", "W"], rarities: [], missingOnly: false })
      .get("c")).toBe("W,R");
  });
  it("writes missing-only as m=1", () => {
    expect(serialiseFilters({ colors: [], rarities: [], missingOnly: true }).get("m")).toBe("1");
  });
  it("round trips", () => {
    const f = { colors: ["U"], rarities: ["rare"], missingOnly: true };
    expect(parseFilters(serialiseFilters(f))).toEqual(f);
  });
  it("ignores an unknown colour or rarity rather than throwing", () => {
    expect(parseFilters(new URLSearchParams("c=Z&r=legendary"))).toEqual(EMPTY_FILTERS);
  });
});
```

Write each `it` body out in full when implementing — the bodies above are elided here only where the assertion is the obvious one-liner the name states.

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm test src/lib/sets/filters.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Per the handoff's engineering notes: **no join-mode modifier on this page.** A card has one colour identity in a set list, so *any / exactly* has nothing to modify. Colours are always "any". Validate against `WUBRG` and the five rarity words; drop anything else.

- [ ] **Step 4: Run and confirm they pass**

Run: `pnpm test src/lib/sets/filters.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/sets/filters.ts src/lib/sets/filters.test.ts
git commit -m "feat(sets): the three filters, and their URL parameters"
```

---

## Task 6: Cost to complete

**Files:**
- Create: `src/lib/sets/cost.ts`, `src/lib/sets/cost.test.ts`

**Interfaces:**
- Consumes: `Cell` from Task 3.
- Produces:

```ts
export type CellPrice = {
  priceCents: number | null; priceCentsFoil: number | null; asOf: string | null;
};
export type PriceCase = "priced" | "foil-only" | "unstocked";
export type CostToComplete = {
  totalCents: number; pricedCount: number; missingCount: number; unstockedCount: number;
  /** True when any contributing row's as_of trails `newestAsOf`. Page fact, not cell fact. */
  stale: boolean; asOf: string | null;
};
export function priceCaseOf(p: CellPrice | undefined): PriceCase;
export function costToComplete(
  missing: Array<{ price?: CellPrice }>, newestAsOf: string | null,
): CostToComplete;
```

- [ ] **Step 1: Write the failing tests**

```ts
describe("priceCaseOf", () => {
  it("reads an absent row as unstocked, never as free", () => {
    expect(priceCaseOf(undefined)).toBe("unstocked");
  });
  it("reads a null nonfoil price with a foil price as foil-only", () => {
    expect(priceCaseOf({ priceCents: null, priceCentsFoil: 420, asOf: "2026-09-08" }))
      .toBe("foil-only");
  });
  it("reads a null on both sides as unstocked", () => {
    expect(priceCaseOf({ priceCents: null, priceCentsFoil: null, asOf: "2026-09-08" }))
      .toBe("unstocked");
  });
  it("reads a set price as priced", () => {
    expect(priceCaseOf({ priceCents: 120, priceCentsFoil: null, asOf: "2026-09-08" }))
      .toBe("priced");
  });
});

describe("costToComplete", () => {
  it("sums only priced cards and states the gap", () => {
    const result = costToComplete([
      { price: { priceCents: 100, priceCentsFoil: null, asOf: "2026-09-08" } },
      { price: { priceCents: 250, priceCentsFoil: null, asOf: "2026-09-08" } },
      {},
    ], "2026-09-08");
    expect(result.totalCents).toBe(350);
    expect(result.pricedCount).toBe(2);
    expect(result.missingCount).toBe(3);
    expect(result.unstockedCount).toBe(1);
  });

  it("counts a foil-only card at its foil price rather than dropping it", () => {
    const result = costToComplete(
      [{ price: { priceCents: null, priceCentsFoil: 500, asOf: "2026-09-08" } }], "2026-09-08");
    expect(result.totalCents).toBe(500);
    expect(result.pricedCount).toBe(1);
    expect(result.unstockedCount).toBe(0);
  });

  it("never treats an unpriced card as zero in the denominator", () => {
    const result = costToComplete([{}, {}], "2026-09-08");
    expect(result.totalCents).toBe(0);
    expect(result.pricedCount).toBe(0);
    expect(result.unstockedCount).toBe(2);
  });

  it("marks the page stale when a contributing row trails the newest as_of", () => {
    const result = costToComplete(
      [{ price: { priceCents: 100, priceCentsFoil: null, asOf: "2026-09-01" } }], "2026-09-08");
    expect(result.stale).toBe(true);
    expect(result.asOf).toBe("2026-09-01");
  });

  it("is not stale when every row is on the newest as_of", () => {
    const result = costToComplete(
      [{ price: { priceCents: 100, priceCentsFoil: null, asOf: "2026-09-08" } }], "2026-09-08");
    expect(result.stale).toBe(false);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm test src/lib/sets/cost.test.ts`

- [ ] **Step 3: Implement**

A foil-only card contributes `priceCentsFoil`. Staleness is the oldest contributing `asOf` compared against `newestAsOf`, reported once for the page.

- [ ] **Step 4: Run and confirm they pass**

- [ ] **Step 5: Commit**

```bash
git add src/lib/sets/cost.ts src/lib/sets/cost.test.ts
git commit -m "feat(sets): cost to complete, and the gap it states about itself"
```

---

## Task 7: The queries

**Files:**
- Create: `src/lib/sets/read.ts`
- Modify: `src/lib/sets/completion.ts` (add `colorIdentity` to `SetPrinting`)

**Interfaces:**
- Consumes: everything from Tasks 3-6.
- Produces:

```ts
export type SetIndexRow = {
  code: string; name: string; releasedAt: string | null; iconSvgUri: string | null;
  owned: number; baseSetSize: number | null; percent: number | null;
};
export function loadOwnedSets(userId: string): Promise<SetIndexRow[]>;
export function searchSets(userId: string, query: string): Promise<SetIndexRow[]>;
export function loadSetGrid(userId: string, code: string): Promise<{
  set: { code: string; name: string; iconSvgUri: string | null; setType: string;
         baseSetSize: number | null };
  printings: SetPrinting[];
  holdings: Holding[];
  prices: Map<string, CellPrice>;
  newestAsOf: string | null;
} | null>;
```

**No unit tests.** These are query builders — the untested-query pattern this codebase already applies to `browse.ts` and `set-filter.ts`. Everything they feed is tested; they themselves fetch rows and compute nothing.

- [ ] **Step 1: Write the queries**

Collectible set types for the search: `expansion`, `core`, `commander`, `draft_innovation`, `masters`. Exclude `digital = true`. `loadOwnedSets` starts from the reader's `collection_items` so a set they hold nothing from never appears.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/lib/sets/read.ts src/lib/sets/completion.ts
git commit -m "feat(sets): the index and grid queries"
```

---

## Task 8: Copy

**Files:**
- Create: `src/lib/copy/sets.ts`
- Test: `src/lib/copy/sets.test.ts`

**Interfaces:**
- Produces: `setsIndexCopy`, `setPageCopy`, `setFilterCopy`.

Transcribe every string from `design/design_handoff_the99_set_collections/set-collections · copy strings.ts`, including singular forms and aria names. Do not paraphrase and do not invent a string the file does not carry.

- [ ] **Step 1: Write the failing tests for the count-dependent strings**

Cover the singular/plural boundary on every template that takes a count, and the cost sentence's shape:

```ts
it("states the priced-of-missing gap in the cost sentence", () => {
  expect(setPageCopy.cost.sentence(193, 214)).toBe("over 193 of the 214 missing");
});
it("uses the singular when one card has never been stocked", () => {
  expect(setPageCopy.cost.unstocked(1)).toBe("1 has never been stocked and is not in this figure");
});
it("uses the plural otherwise", () => {
  expect(setPageCopy.cost.unstocked(21))
    .toBe("21 have never been stocked and are not in this figure");
});
```

- [ ] **Step 2: Run, implement, run again, commit**

```bash
git add src/lib/copy/sets.ts src/lib/copy/sets.test.ts
git commit -m "feat(sets): production copy for both routes"
```

---

## Task 9: Extract the colour filter

**Files:**
- Create: `src/components/collection/color-filter-row.tsx`
- Modify: `src/components/collection/filter-bar.tsx:127-147`
- Test: `src/components/collection/color-filter-row.test.tsx`

**Interfaces:**
- Produces: `<ColorFilterRow selected={string[]} onToggle={(c: string) => void} />`

**This component takes no surface flag.** Decision 15's rule is explicit: if it needs an `isSetPage` prop, that is the bug the rule exists to prevent, and the answer is two components. It renders the `COLOR` label and the five pips, and nothing about who mounted it.

- [ ] **Step 1: Write the failing test**

```tsx
it("renders one pip per WUBRG colour", () => {
  render(<ColorFilterRow selected={[]} onToggle={() => {}} />);
  expect(screen.getAllByRole("button")).toHaveLength(5);
});
it("marks a selected pip as pressed", () => {
  render(<ColorFilterRow selected={["R"]} onToggle={() => {}} />);
  expect(screen.getByRole("button", { name: /red/i })).toHaveAttribute("aria-pressed", "true");
});
it("reports the colour that was toggled", async () => {
  const onToggle = vi.fn();
  render(<ColorFilterRow selected={[]} onToggle={onToggle} />);
  await userEvent.click(screen.getByRole("button", { name: /blue/i }));
  expect(onToggle).toHaveBeenCalledWith("U");
});
```

- [ ] **Step 2: Run and confirm failure**

- [ ] **Step 3: Move the markup**

Cut lines 127-147 of `filter-bar.tsx` into the new component verbatim — same classes, same tokens, same `ColorPip` — and mount it in their place. The desktop `hidden md:flex` wrapper moves with it.

- [ ] **Step 4: Run the full suite**

Run: `pnpm test`
Expected: PASS, including the existing `filter-bar` and collection browser tests. Any change in their output means the extraction was not verbatim.

- [ ] **Step 5: Commit**

```bash
git add src/components/collection/color-filter-row.tsx \
  src/components/collection/color-filter-row.test.tsx src/components/collection/filter-bar.tsx
git commit -m "refactor(collection): lift the colour pip row into its own component"
```

---

## Task 10: The set icon

**Files:**
- Create: `src/components/sets/set-icon.tsx`, `src/components/sets/set-icon.test.tsx`

**Interfaces:**
- Produces: `<SetIcon uri={string | null} size={number} tone="muted" | "success" ringed={boolean} />`

Scryfall's SVGs are a bare `<path>` with no `fill`, so they render black on every theme. Recolour with a mask rather than fetching and rewriting the file:

```tsx
<span
  aria-hidden
  style={{
    width: size, height: size,
    background: tone === "success" ? "var(--success)" : "var(--fg-muted)",
    maskImage: `url(${uri})`, WebkitMaskImage: `url(${uri})`,
    maskRepeat: "no-repeat", maskPosition: "center", maskSize: "contain",
  }}
/>
```

Always `aria-hidden` — the set code beside it is the identifier.

- [ ] **Step 1: Write the failing tests** — renders nothing when `uri` is null; is `aria-hidden`; carries the success background when `tone="success"`.
- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm passing**
- [ ] **Step 5: Commit**

```bash
git add src/components/sets/set-icon.tsx src/components/sets/set-icon.test.tsx
git commit -m "feat(sets): the set symbol, recoloured by mask rather than by fetch"
```

---

## Task 11: The index route

**Files:**
- Create: `src/app/collection/sets/page.tsx`, `src/app/collection/sets/loading.tsx`
- Create: `src/components/sets/set-index-view.tsx`, `src/components/sets/set-index-view.test.tsx`

**Interfaces:**
- Consumes: `loadOwnedSets`, `searchSets` (Task 7), `setsIndexCopy` (Task 8), `SetIcon` (Task 10).

States S1-S5 from `STATES-set-collections.md`: first run, populated, search active, search no match, and `base_set_size` null. A not-indexed row renders its not-indexed line and **never `0%`**.

- [ ] **Step 1: Write the failing tests** — one per state, asserting the copy key rendered and, for S5, that no percentage appears anywhere in the row.
- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Implement the view, then the route** — `loading.tsx` mirrors `src/app/discover/loading.tsx`.
- [ ] **Step 4: Run the suite and the stub build**

Run: `pnpm test && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: PASS, with `/collection/sets` in the route manifest.

- [ ] **Step 5: Commit**

```bash
git add src/app/collection/sets/ src/components/sets/set-index-view.tsx \
  src/components/sets/set-index-view.test.tsx
git commit -m "feat(sets): the index — your sets, and a search that reaches the rest"
```

---

## Task 12: The cell

**Files:**
- Create: `src/components/sets/set-cell.tsx`, `src/components/sets/set-cell.test.tsx`

**Interfaces:**
- Consumes: `Cell` (Task 3), `priceCaseOf` (Task 6).

Per the handoff's component contract: 116×162 art (63/88 at phone), radius 6, on `--surface-sunken`. Owned art `opacity 1` with `1px solid var(--border)`. Missing art `opacity .28; filter: saturate(.55)` with `1px dashed var(--fg-locked)`. **No geometry differs between them.** Caption is `042 · uncommon`, rarity dropped below `md`. `◆ FOIL` on a foil-only owned cell; the outlined diamond plus mono `BY NAME` bottom-left on a by-name fill, never on a missing cell.

- [ ] **Step 1: Write the failing tests**

```tsx
it("dims the art and dashes the edge on a missing cell", () => {});
it("uses --fg-locked for the dashed edge, never --border-dashed", () => {});
it("keeps the name at full strength on a missing cell", () => {});
it("gives owned and missing cells identical geometry", () => {});
it("marks a foil-only holding", () => {});
it("marks a by-name fill", () => {});
it("never marks a missing cell by-name", () => {});
it("drops rarity from the caption below md", () => {});
it("renders `no stock` holding the tag's height when the price row is absent", () => {});
it("prefixes `◆ foil` when only a foil price exists", () => {});
it("renders no control inside the cell", () => {
  render(<SetCell cell={owned} />);
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.queryByRole("checkbox")).toBeNull();
});
```

- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm passing**
- [ ] **Step 5: Commit**

```bash
git add src/components/sets/set-cell.tsx src/components/sets/set-cell.test.tsx
git commit -m "feat(sets): one cell, dimmed when you do not have it"
```

---

## Task 13: The grid, its two sections and its sticky head

**Files:**
- Create: `src/app/collection/sets/[code]/page.tsx`, `.../loading.tsx`
- Create: `src/components/sets/set-grid-view.tsx`, `src/components/sets/set-grid-view.test.tsx`
- Create: `src/components/sets/set-filters.tsx`

**Interfaces:**
- Consumes: everything above.

States S6-S8 and S10-S12, plus S13/S14 (the two failure pages) and the 390px grid. One density: 116×162, no toggle. The head pins at 108px desktop / 96px phone; `extras ↓` in the result line is the page's only in-page nav. **Measure the sticky head on a device** — the handoff's figures are derived from type sizes, not measured, and say so.

- [ ] **Step 1: Write the failing tests** — one per state; the extras heading carries its own ratio and the base ratio excludes it; filters write URL parameters and survive reload; zero-under-missing-only offers the cheapest correction that shows owned cards rather than "clear everything"; an unknown code and a non-collectible code render their two distinct pages, both keeping the breadcrumb and neither offering a search field.
- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Implement**

Windowing is engineering's choice, under two constraints: it must not break the sticky head, and it must not break the `extras ↓` jump. If neither can be held, that goes back to Design.

- [ ] **Step 4: Run the suite and the stub build**
- [ ] **Step 5: Commit**

```bash
git add src/app/collection/sets/\[code\]/ src/components/sets/set-grid-view.tsx \
  src/components/sets/set-grid-view.test.tsx src/components/sets/set-filters.tsx
git commit -m "feat(sets): the grid, its extras section and its sticky head"
```

---

## Task 14: The cost strip and the cart link-out

**Files:**
- Create: `src/components/sets/cost-strip.tsx`, `src/components/sets/cost-strip.test.tsx`
- Modify: `src/components/sets/set-grid-view.tsx`

**Interfaces:**
- Consumes: `costToComplete` (Task 6), the #330 checkout builder.

**The filters are the selector.** There is no per-cell control; `Send N to ManaPool` follows the filters, so filtering to red rares makes it `Send 9` with the total recomputed. The result line, the button label and the strip's denominator are three readings of **one** count.

- [ ] **Step 1: Write the failing tests** — the sentence states priced-of-missing; the unstocked count follows at `--fg-locked`; staleness prints once for the page and never per cell; the button label tracks the filtered count; the strip does not render when nothing is missing.
- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm passing**
- [ ] **Step 5: Commit**

```bash
git add src/components/sets/cost-strip.tsx src/components/sets/cost-strip.test.tsx \
  src/components/sets/set-grid-view.tsx
git commit -m "feat(sets): what finishing this set costs, and what the figure leaves out"
```

---

## Task 15: 100% complete

**Files:**
- Modify: `src/components/sets/set-grid-view.tsx`
- Test: `src/components/sets/set-grid-view.test.tsx`

Three branches, and **none renders `0 / 0`**: extras owned, extras present with none owned (`0 / 96`, which is the clearest next thing the page can say), and no extras at all (the line and button go, and one `--success` mono line closes the block). The head takes a `--success` hairline, the icon is ringed rather than filled, the ratio becomes *Duskmourn, complete*. The grid below is untouched. Missing-only is **removed outright**, not greyed — the one place the grey-in-place rule yields, because there is no state to lose.

- [ ] **Step 1: Write the failing tests** — one per branch, plus one asserting no `0 / 0` string renders in any of them, plus one asserting the Missing-only control is absent rather than disabled.
- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm passing**
- [ ] **Step 5: Commit**

```bash
git add src/components/sets/set-grid-view.tsx src/components/sets/set-grid-view.test.tsx
git commit -m "feat(sets): a complete set reads as sealed, and never as zero of zero"
```

---

## Task 16: The pin swap, and making it visible

**Files:**
- Modify: `src/app/collection/actions.ts:198,210`
- Test: `src/app/collection/actions.test.ts`

Pinning is keyed `(user_id, oracle_id)`, so picking #268 in the modal fills #268 and **empties #262** — two cells from one act, with the ratio unmoved. The set page is the only surface where that is legible, and today neither action revalidates it.

- [ ] **Step 1: Write the failing test**

```ts
it("revalidates the set page when a printing is pinned", async () => {
  await setCardArtPreference(oracleId, "eoe", "268");
  expect(revalidatePath).toHaveBeenCalledWith("/collection/sets/[code]", "page");
});
it("revalidates the set page when a pin is cleared", async () => {
  await clearCardArtPreference(oracleId);
  expect(revalidatePath).toHaveBeenCalledWith("/collection/sets/[code]", "page");
});
```

- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Add the call to both actions**

Use the parameterised form, as `confirmUpload` already does for `/commanders/[slug]`.

- [ ] **Step 4: Run and confirm passing**
- [ ] **Step 5: Commit**

```bash
git add src/app/collection/actions.ts src/app/collection/actions.test.ts
git commit -m "fix(collection): let a pin reach the set page it moves a card on"
```

---

## Task 17: An upload that lands while the page is open

**Files:**
- Create: `src/app/collection/sets/actions.ts`, `src/components/sets/delta-strip.tsx`, `src/components/sets/delta-strip.test.tsx`
- Modify: `src/components/sets/set-grid-view.tsx`

The page **holds every figure it was serving** and offers the update as an act. Not a toast, not dismissible, and absent entirely when the delta is zero.

The handoff names no mechanism and nothing in the app pushes, so: a server action returning the reader's current owned-count for this set, called on `window` focus, compared against the count the page was rendered with. A difference renders the strip with the delta; `Refresh the grid` calls `router.refresh()`.

**Interfaces:**
- Produces: `export async function ownedCountForSet(code: string): Promise<number>`

- [ ] **Step 1: Write the failing tests** — the strip is absent at a zero delta; it names the delta for this set; it is not dismissible; the figures behind it do not move until refresh is pressed.
- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm passing**
- [ ] **Step 5: Commit**

```bash
git add src/app/collection/sets/actions.ts src/components/sets/delta-strip.tsx \
  src/components/sets/delta-strip.test.tsx src/components/sets/set-grid-view.tsx
git commit -m "feat(sets): offer an upload's changes rather than relighting cells mid-read"
```

---

## Task 18: The entry point

**Files:**
- Modify: `src/components/collection/filter-bar.tsx`
- Test: `src/components/collection/filter-bar.test.tsx`

A 46px hairline pill, `--accent` border with a filled 7px diamond, matching its neighbours on the real toolbar. It sits **between `Availability ▾` and the view well** — the last control before the well, never inside it. Phone: a full 44px pill paired with `Filters` in the row above the list. Absent, not disabled, on first run.

**The pill always goes to `/collection/sets`.** It carries no query, no memory of the last set, and — decision 20 — **never** `Set ▾`'s current value. That convenience is exactly the state-sharing behind the Commanders/Discover confusion.

- [ ] **Step 1: Write the failing tests**

```tsx
it("links to the index and carries no query", () => {
  render(<FilterBar {...props} filters={{ ...empty, setCodes: ["eoe"] }} />);
  expect(screen.getByRole("link", { name: /by set/i }))
    .toHaveAttribute("href", "/collection/sets");
});
it("is absent rather than disabled before a collection exists", () => {});
it("sits outside the view well", () => {});
it("carries no count", () => {});
```

- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm passing**
- [ ] **Step 5: Commit**

```bash
git add src/components/collection/filter-bar.tsx src/components/collection/filter-bar.test.tsx
git commit -m "feat(collection): a way through to your sets"
```

---

## Task 19: The probe

**Files:**
- Create: `scripts/probe-sets.mjs`
- Modify: `package.json` (a `probe:sets` script)

A browser probe is the only proof a visual ruling shipped. Anchor every check to structure, never to pixels, and expect the check itself to be wrong first. See `reference_the99_local_clerk_auth` for signing in: localhost runs Clerk's dev instance, so only `window.Clerk` plus a `+clerk_test` code works.

Checks, one per ruling: a missing cell's computed art opacity is `.28` and its border style is `dashed`; that border's colour resolves to the theme's `--fg-locked` and not `--border-dashed`; an owned and a missing cell report identical bounding boxes; the extras heading carries a ratio different from the head's; the 100% head carries no `0 / 0`; no `button` or `checkbox` element exists inside any cell.

- [ ] **Step 1: Write the probe**
- [ ] **Step 2: Run it against `local-dev`**

Run: `pnpm probe:sets`
Expected: every check reports its measured value, not merely a pass. A check that cannot state what it measured is not a check.

- [ ] **Step 3: Commit**

```bash
git add scripts/probe-sets.mjs package.json
git commit -m "test(sets): probe the dim, the geometry and the two ratios"
```

---

## Task 20: §1b — the Collection row cost track (severable)

**Files:**
- Modify: `src/components/collection/rows-view.tsx:81,152-170`
- Test: `src/components/collection/rows-view.test.tsx`

**This task ships or slips on its own.** It changes `/collection` and neither new route, and nothing above depends on it.

Every other card row in the app states mana cost; the Collection row states colour identity alone. The pips move out of the leading slot and become a fixed **90px right-aligned track** — a 20px mono mana-value disc, then 13px pips — which is `deck-versioning`'s un-shingled track at the size it already ships. Phone: 76px on the meta line. **Lands keep an empty disc slot, not a `0`**, so the track never ragged-edges and 37 land rows do not print a figure where there is an absence.

- [ ] **Step 1: Write the failing tests**

```tsx
it("states the mana value in the track", () => {});
it("leaves the disc empty for a land rather than printing 0", () => {});
it("holds the track at a fixed width so rows do not ragged-edge", () => {});
it("gives the name column the width the pips vacated", () => {});
```

- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm passing**
- [ ] **Step 5: Commit**

```bash
git add src/components/collection/rows-view.tsx src/components/collection/rows-view.test.tsx
git commit -m "feat(collection): give the collection row the cost track every other row has"
```

---

## Deploy

Order matters: a half-applied state presents a wrong figure as a right one.

- [ ] Merge, which applies the migrations on the production build.
- [ ] Confirm `GET /api/health` returns 200 on staging and production.
- [ ] Re-seed the catalog against **staging** first: dispatch `.github/workflows/catalog-refresh.yml` manually rather than waiting for 09:00 UTC Monday.
- [ ] Spot check: `select count(*) from sets where base_set_size is not null` is non-zero, and `select base_set_size from sets where code = 'eoe'` returns 276.
- [ ] Re-seed production the same way, and repeat the spot check.
- [ ] Walk `/collection/sets` and one set page on staging at 390 and 1280.

## Self-review notes

- **Spec coverage.** Rulings 1-8 map to Tasks 1/2 and 4 (boundary and counting), 11/13 (routes), 3 (cells and finishes), 3 (by-name fill), 11 (index and search), 12 (dim), 6/14 (money), 5/13 (filters). The addendum is Task 20. The four audit findings are Tasks 10, 9, 17 and 13 respectively.
- **Types.** `Cell`, `SetPrinting` and `Holding` are defined once in Task 3 and referenced by name thereafter; `SetSections` in Task 4; `SetGridFilters` in Task 5; `CellPrice` and `CostToComplete` in Task 6.
- **Not measured, and known so:** the sticky-head heights (108 / 96 / 118px) come from drawn type sizes. Measure them in Task 13 rather than trusting them.
