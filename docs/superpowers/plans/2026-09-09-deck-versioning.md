# Deck Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a player tinker with a committed deck freely, then commit the result as the next version and get a buy list and a pull list out of it — without any deck's cards being reassigned implicitly.

**Architecture:** `deck_cards` stays the live, editable draft that every existing deck surface reads. A new `deck_versions` / `deck_version_cards` pair stores a full snapshot at each commit, and the claim model in `availability-query.ts` switches to reading those snapshots instead of `deck_cards`. Draft state is not stored anywhere — it is the difference between the two.

**Tech Stack:** Next.js 16 App Router with server actions, React 19, Drizzle ORM on Neon Postgres, Vitest, Playwright for probe scripts.

**Spec:** `docs/superpowers/specs/2026-09-09-deck-versioning-design.md`

## Global Constraints

- Package manager is **pnpm**. Never npm or yarn.
- All work happens in a worktree under `.worktrees/<branch>`. The main checkout stays clean on `main`.
- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test`, plus `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`, then `git fetch origin && git rebase origin/main`.
- Stage files by name. Never `git add -A`.
- Migrations are generated with `pnpm db:generate`, never hand-numbered — every index has a matching `drizzle/meta/NNNN_snapshot.json` and a hand-added file breaks the next generate. The next file is `0024_*`. A data migration is appended to the generated file behind a `--> statement-breakpoint`.
- Deck body size is `deckBodySize(hasPartner)` from `src/lib/decks/deck-size.ts` — 99, or 98 with a partner. Never a bare literal in TypeScript.
- `src/lib/decks/committed.ts` already exists and means "which deck is this card already in". The new vocabulary is **version** / **draft** / **commit a version**. Never "committed cards".
- Basics are excluded from every claim and every shopping figure, matching the existing model (`c.type_line !~ '\mBasic\M'`).
- Tasks 9 onward are UI. The gate is **lifted**: `design/design_handoff_the99_deck_versioning/` reached 🟢 Green at R2 on 2026-09-11 (`docs/superpowers/gap-report-deck-versioning.md`), and spec Addendum R3 records everything the handoff changed. The handoff's `README.md` (the Component notes table especially) is the geometry's source of truth; its `deck-versioning · copy strings.ts` is the copy's; `STATES-pending.md` enumerates the 45 states each surface must draw.
- Every UI task passes the design-review skill (enumerate → verify → confirm) before `gh pr create`, and ships mobile + desktop parity in the same PR.
- Copy for these surfaces lives in **one new module**, `src/lib/copy/deck-versioning.ts`. Exactly two shipped strings are edited, both in `deckImportCopy.update`. No other shipped copy is touched.
- No new token, no new hex, no modal, no toast, no virtualisation. `--danger` appears only on Discard — a removal is not an error. No count of nought is ever drawn.
- `CostPips` is read as shipped and never forked, and it defaults **neither** `track` nor `cap` — both are passed explicitly on every mount. The two figures are `PIP_TRACK = 40` and `PIP_CAP = 5`, today **non-exported locals** in `decklist-row.tsx:50,52`. Task 14 step 1 moves them to `src/components/decks/pip-track.ts` and has `decklist-row.tsx` import them, so the three new row surfaces read one source rather than re-declaring the numbers. The handoff's widened track (110/76px by `COST-TRACK.md`'s own arithmetic) is that document's unshipped proposal to card rows; these surfaces inherit whatever that round lands and versioning is not gated on it.
- The buy tag's shipped density rule holds: `collapsed` on a decklist row, `full` on a purchase-decision surface. The review page and the commit sheet are purchase-decision surfaces.
- `revalidateClaims(deckId, userId)` for commit, discard and pull — never `deckSurfaces()`.
- Focus after each write: the version line after a commit, the deck name after a discard, the row's own control after a pull.

---

### Task 1: Version tables and the game stamp

**Files:**
- Modify: `src/db/schema.ts` (append after `deckCards`, around line 224; and `deckGames` at line 275)
- Create: `drizzle/0024_*.sql` (generated)

**Interfaces:**
- Produces: `deckVersions` and `deckVersionCards` table objects exported from `src/db/schema.ts`; `deckGames.versionId` column.

- [ ] **Step 1: Add the two tables to the schema**

Append to `src/db/schema.ts` after the `deckCards` definition:

```ts
/**
 * One committed state of a deck: what was sleeved, when, and why.
 *
 * A version stores the FULL list rather than a diff from its predecessor.
 * Roughly 99 rows per commit costs nothing, whereas a diff chain would make
 * "what is sleeved right now" a fold over history — and that read runs inside
 * the claim model on every availability query in the application.
 *
 * Both commander columns are snapshotted because changing a commander is a
 * version boundary like any other, and the claim model unions those columns
 * alongside the decklist. Without them the claim query would have to read the
 * live `decks` row for part of its answer, mixing draft truth and committed
 * truth in the one query that must never mix them.
 *
 * There is deliberately NO `is_draft` column anywhere. Draft state is
 * `deck_cards` differing from the newest version, so no flag can go stale
 * against the rows it describes. A deck with no row here is a brew.
 */
export const deckVersions = pgTable("deck_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  committedAt: timestamp("committed_at").notNull().defaultNow(),
  // Why this version exists, in the player's words. Unrecoverable afterwards,
  // which is why it is offered at commit time and never inferred.
  note: text("note"),
  commanderOracleId: uuid("commander_oracle_id").notNull().references(() => cards.oracleId),
  partnerOracleId: uuid("partner_oracle_id").references(() => cards.oracleId),
  // When this deck first sleeved each commander, in an unbroken run up to now.
  // Not the same as committed_at: see deckVersionCards.since below, which these
  // two mirror for the columns that are not deck_cards rows.
  commanderSince: timestamp("commander_since").notNull().defaultNow(),
  partnerSince: timestamp("partner_since"),
}, (t) => [
  unique("deck_versions_deck_number_key").on(t.deckId, t.number),
  index("deck_versions_deck_number_idx").on(t.deckId, t.number),
]);

export const deckVersionCards = pgTable("deck_version_cards", {
  versionId: uuid("version_id").notNull()
    .references(() => deckVersions.id, { onDelete: "cascade" }),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  quantity: integer("quantity").notNull(),
  /**
   * When this deck first sleeved this card, in an unbroken run up to this
   * version. Seniority orders on it, and it is why it is not enough to order on
   * the version's own `committed_at`: a deck that has held a card for a year and
   * then commits an unrelated swap would jump to the back of the queue on every
   * card it holds, and be told to buy copies already in its own box.
   *
   * Inherited from the predecessor version when that version held the same card,
   * and set to the new version's committed_at when it did not — so a card
   * dropped in v2 and re-added in v4 starts a fresh run at v4, and the deck that
   * sleeved it in between keeps it. Continuity is decided once, at the rare
   * write, rather than folded out of history by the hot read.
   */
  since: timestamp("since").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.versionId, t.oracleId] }),
  // The claim model joins version cards by version and orders by since.
  index("deck_version_cards_oracle_idx").on(t.oracleId),
]);
```

Add `unique` to the drizzle-orm/pg-core import list at the top of the file if it is not already there.

- [ ] **Step 2: Add the version stamp to `deck_games`**

In the `deckGames` definition, after `podSize`:

```ts
  // The version live when the game was played. NULLABLE and `set null`, not
  // cascade: games logged before versioning shipped were played by a list
  // nobody recorded, and null is the accurate value — a backfill would be a
  // fabricated claim. Deleting a version must never delete its games.
  versionId: uuid("version_id").references(() => deckVersions.id, { onDelete: "set null" }),
```

`deckVersions` is declared above `deckGames` in the file, so the reference resolves without a forward declaration.

- [ ] **Step 3: Generate the migration**

Run: `pnpm db:generate`
Expected: a new `drizzle/0024_*.sql` creating both tables and adding one nullable column, plus an updated `drizzle/meta/_journal.json`.

- [ ] **Step 4: Read the generated SQL and confirm it is additive only**

Open the generated file. Confirm there is no `DROP`, no `ALTER ... SET NOT NULL` on an existing table, and that `deck_games.version_id` is added nullable with no default. If any of those are wrong, fix the schema and regenerate rather than editing the SQL by hand.

- [ ] **Step 5: Verify the build and types**

Run: `pnpm typecheck && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts drizzle/0024_*.sql drizzle/meta
git commit -m "feat(decks): version tables and the game version stamp"
```

---

### Task 2: Backfill v1 for decks that are already sleeved

**Files:**
- Modify: `drizzle/0024_*.sql` — the file Task 1 generated

**Interfaces:**
- Consumes: `deck_versions`, `deck_version_cards` from Task 1.
- Produces: every full-body deck has exactly one version, numbered 1.

**Append the backfill to the migration Task 1 generated. Do not create a
`0025_*.sql`.** Every migration index from `0000` to `0023` has a matching
`drizzle/meta/NNNN_snapshot.json`, and a hand-numbered file with no snapshot
breaks the next `pnpm db:generate`. This backfill adds no DDL, so appending it
to `0024` leaves that file's snapshot correct as generated and needs no journal
edit at all. Separate the appended statements from the generated ones with the
`--> statement-breakpoint` marker the generator itself uses.

- [ ] **Step 1: Append the backfill to `drizzle/0024_*.sql`**

```sql
--> statement-breakpoint
-- Stamp v1 on every deck that is already sleeved.
--
-- ONLY full-body decks. A brew has no version and keeps claiming softly off
-- deck_cards exactly as it does today; stamping one would make a 40-card
-- list's claims hard overnight, which is a behaviour change nobody asked for.
--
-- The body size mirrors deckBodySize() in src/lib/decks/deck-size.ts: 99, or
-- 98 for a deck with a partner. The literal is unavoidable in raw SQL, and a
-- change to the format's total has to touch both.
--
-- committed_at, and every `since` with it, is the deck's created_at rather than
-- now(). Seniority orders on `since`, so stamping every existing deck with one
-- timestamp would leave the tiebreak to the deck_id alone. Using created_at
-- means that on the day this ships, seniority among already-full decks is
-- EXACTLY what it is today — the buy tags that move are only those between a
-- full-body deck and a brew, which is the whole intended change.
insert into deck_versions (
  deck_id, number, committed_at, commander_oracle_id, partner_oracle_id,
  commander_since, partner_since
)
select
  d.id, 1, d.created_at, d.commander_oracle_id, d.partner_oracle_id,
  d.created_at,
  case when d.partner_oracle_id is null then null else d.created_at end
from decks d
left join (
  select deck_id, sum(quantity)::int as cards from deck_cards group by deck_id
) t on t.deck_id = d.id
where coalesce(t.cards, 0) >= (99 - (case when d.partner_oracle_id is null then 0 else 1 end));
--> statement-breakpoint
-- `not exists` rather than a bare `v.number = 1`: this statement must be safe
-- to re-apply after a partially applied migration, and without the guard a
-- second run collides with the (version_id, oracle_id) primary key.
insert into deck_version_cards (version_id, oracle_id, quantity, since)
select v.id, dc.oracle_id, dc.quantity, v.committed_at
from deck_versions v
join deck_cards dc on dc.deck_id = v.deck_id
where v.number = 1
  and not exists (
    select 1 from deck_version_cards c
    where c.version_id = v.id and c.oracle_id = dc.oracle_id
  );
```

- [ ] **Step 2: Verify against a scratch branch, not staging**

Create a Neon branch off `catalog-staging`, point `DATABASE_URL` at it, run `pnpm db:migrate`, then check:

```sql
select count(*) from deck_versions;                 -- one per full-body deck
select count(*) from deck_versions v
  where not exists (select 1 from deck_version_cards c where c.version_id = v.id);  -- 0
select count(*) from deck_version_cards c
  join deck_versions v on v.id = c.version_id where c.since <> v.committed_at;  -- 0
```

Then run `pnpm db:migrate` a second time against the same branch and confirm it
is a no-op rather than an error. Delete the branch afterwards.

- [ ] **Step 3: Commit**

```bash
git add drizzle/0024_*.sql
git commit -m "feat(decks): backfill v1 for decks already at a full body"
```

---

### Task 3: `draft-diff.ts` — the pure diff

**Files:**
- Create: `src/lib/decks/draft-diff.ts`
- Test: `src/lib/decks/draft-diff.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type CardQty = { oracleId: string; quantity: number };
  export type DraftChange = { oracleId: string; from: number; to: number };
  export type DraftDiff = { adds: DraftChange[]; removes: DraftChange[] };
  export function draftDiff(draft: CardQty[], version: CardQty[]): DraftDiff;
  export type AddBucket = "free" | "claimed" | "unowned";
  export function bucketAdds(
    adds: DraftChange[],
    availability: Map<string, { free: number; claims: { id: string; name: string }[] }>,
  ): { oracleId: string; needed: number; bucket: AddBucket; heldBy: { id: string; name: string }[] }[];
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/decks/draft-diff.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { bucketAdds, draftDiff } from "./draft-diff";

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const C = "00000000-0000-0000-0000-00000000000c";

describe("draftDiff", () => {
  it("reports a card the draft added", () => {
    const d = draftDiff([{ oracleId: A, quantity: 1 }], []);
    expect(d.adds).toEqual([{ oracleId: A, from: 0, to: 1 }]);
    expect(d.removes).toEqual([]);
  });

  it("reports a card the draft dropped", () => {
    const d = draftDiff([], [{ oracleId: A, quantity: 1 }]);
    expect(d.removes).toEqual([{ oracleId: A, from: 1, to: 0 }]);
    expect(d.adds).toEqual([]);
  });

  // A quantity change is one change, not a remove plus an add. Rendering it as
  // both would put the same card on the buy list and the pull list at once.
  it("reports an increased quantity as a single add", () => {
    const d = draftDiff([{ oracleId: A, quantity: 3 }], [{ oracleId: A, quantity: 1 }]);
    expect(d.adds).toEqual([{ oracleId: A, from: 1, to: 3 }]);
    expect(d.removes).toEqual([]);
  });

  it("reports a decreased quantity as a single remove", () => {
    const d = draftDiff([{ oracleId: A, quantity: 1 }], [{ oracleId: A, quantity: 4 }]);
    expect(d.removes).toEqual([{ oracleId: A, from: 4, to: 1 }]);
  });

  it("reports nothing when the lists agree, whatever their order", () => {
    const d = draftDiff(
      [{ oracleId: B, quantity: 1 }, { oracleId: A, quantity: 2 }],
      [{ oracleId: A, quantity: 2 }, { oracleId: B, quantity: 1 }],
    );
    expect(d).toEqual({ adds: [], removes: [] });
  });
});

describe("bucketAdds", () => {
  const avail = new Map([
    [A, { free: 2, claims: [] }],
    [B, { free: 0, claims: [{ id: "d1", name: "Scrim Recovery" }] }],
  ]);

  it("calls a card with enough free copies free", () => {
    const [row] = bucketAdds([{ oracleId: A, from: 0, to: 1 }], avail);
    expect(row.bucket).toBe("free");
    expect(row.needed).toBe(1);
  });

  // The distinction the Deckcheck workaround cannot make: owned but spoken
  // for is not the same as not owned, because only one of them has a deck to
  // name and a pull to offer.
  it("calls a card held by another deck claimed, and names the deck", () => {
    const [row] = bucketAdds([{ oracleId: B, from: 0, to: 1 }], avail);
    expect(row.bucket).toBe("claimed");
    expect(row.heldBy).toEqual([{ id: "d1", name: "Scrim Recovery" }]);
  });

  it("calls a card absent from availability unowned", () => {
    const [row] = bucketAdds([{ oracleId: C, from: 0, to: 1 }], avail);
    expect(row.bucket).toBe("unowned");
    expect(row.heldBy).toEqual([]);
  });

  // needed is the DELTA, not the draft's whole ask: a deck going from one copy
  // to three buys two. Returning the ask would double-charge the price total.
  it("needs only the delta when the quantity rose", () => {
    const [row] = bucketAdds([{ oracleId: A, from: 1, to: 3 }], avail);
    expect(row.needed).toBe(2);
  });

  it("calls a partially covered add claimed rather than free", () => {
    const [row] = bucketAdds([{ oracleId: A, from: 0, to: 5 }], avail);
    expect(row.bucket).toBe("claimed");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/lib/decks/draft-diff.test.ts`
Expected: FAIL — cannot resolve `./draft-diff`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/decks/draft-diff.ts`:

```ts
// What the draft changed, and what each change will cost.
//
// Pure by design: this is the function the whole feature's correctness rests
// on, and the claim model it reasons about is raw SQL that cannot be unit
// tested in this repository. Keeping the arithmetic here, with no database in
// the way, is what makes any of it provable.

export type CardQty = { oracleId: string; quantity: number };

/** One card whose count differs between the draft and the newest version. */
export type DraftChange = { oracleId: string; from: number; to: number };

export type DraftDiff = { adds: DraftChange[]; removes: DraftChange[] };

/**
 * The draft against the version it will replace.
 *
 * A quantity change is ONE change, filed by its direction. A deck going from
 * one copy to three has bought two; reporting that as a remove of one and an
 * add of three would put the card on the pull list and the buy list at once,
 * and the player would pull a card they are about to sleeve again.
 */
export function draftDiff(draft: CardQty[], version: CardQty[]): DraftDiff {
  const before = new Map(version.map((c) => [c.oracleId, c.quantity]));
  const after = new Map(draft.map((c) => [c.oracleId, c.quantity]));
  const adds: DraftChange[] = [];
  const removes: DraftChange[] = [];
  for (const oracleId of new Set([...before.keys(), ...after.keys()])) {
    const from = before.get(oracleId) ?? 0;
    const to = after.get(oracleId) ?? 0;
    if (to > from) adds.push({ oracleId, from, to });
    else if (to < from) removes.push({ oracleId, from, to });
  }
  return { adds, removes };
}

/** Which of the three answers an added card gets. */
export type AddBucket = "free" | "claimed" | "unowned";

export type BucketedAdd = {
  oracleId: string;
  /** The DELTA, never the whole ask — this figure feeds a price total. */
  needed: number;
  bucket: AddBucket;
  /** Decks whose committed version holds a copy. Empty unless `claimed`. */
  heldBy: { id: string; name: string }[];
};

/**
 * Split the adds three ways: have it free, have it but another deck has it
 * sleeved, do not have it at all.
 *
 * The middle bucket is the whole point. A card owned but spoken for is the one
 * case where there is something to offer — a named deck and a pull — and
 * collapsing it into "buy this" is exactly what the manual workaround does.
 *
 * A partially covered add is `claimed`, not `free`: one free copy against an
 * ask of five still sends the player shopping, and calling it free would hide
 * a purchase behind a satisfied-looking row.
 */
export function bucketAdds(
  adds: DraftChange[],
  availability: Map<string, { free: number; claims: { id: string; name: string }[] }>,
): BucketedAdd[] {
  return adds.map((change) => {
    const needed = change.to - change.from;
    const entry = availability.get(change.oracleId);
    if (!entry) return { oracleId: change.oracleId, needed, bucket: "unowned", heldBy: [] };
    if (entry.free >= needed) {
      return { oracleId: change.oracleId, needed, bucket: "free", heldBy: [] };
    }
    return {
      oracleId: change.oracleId,
      needed,
      bucket: entry.claims.length > 0 ? "claimed" : "unowned",
      heldBy: entry.claims,
    };
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/lib/decks/draft-diff.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/decks/draft-diff.ts src/lib/decks/draft-diff.test.ts
git commit -m "feat(decks): the pure draft diff and its three-way split of the adds"
```

---

### Task 4: `versions.ts` — read, write, restore

**Files:**
- Create: `src/lib/decks/versions.ts`

**Interfaces:**
- Consumes: `deckVersions`, `deckVersionCards`, `deckCards` from `src/db/schema.ts`.
- Produces:
  ```ts
  export type DeckVersion = {
    id: string; number: number; committedAt: Date; note: string | null;
    commanderOracleId: string; partnerOracleId: string | null;
    commanderSince: Date; partnerSince: Date | null;
  };
  export async function newestVersion(deckId: string): Promise<DeckVersion | null>;
  export async function versionCards(versionId: string): Promise<CardQty[]>;
  export async function commitVersion(
    deckId: string, note: string | null,
  ): Promise<{ version: DeckVersion }>;
  export async function restoreDraftFromVersion(deckId: string, versionId: string): Promise<void>;
  ```

There are no unit tests in this task. Every function here is a database round
trip with no branching arithmetic, and this repository has no integration
harness for query builders. Task 6's probe is what proves them.

- [ ] **Step 1: Write the module**

Create `src/lib/decks/versions.ts`:

```ts
// Reading and writing a deck's committed versions.
//
// The vocabulary is deliberate: `committed.ts` in this same directory already
// means "which deck is this card already in", so nothing here says "committed
// cards". A VERSION is a snapshot; the DRAFT is `deck_cards`.

import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { deckCards, deckVersionCards, deckVersions, decks } from "../../db/schema";
import type { CardQty } from "./draft-diff";

export type DeckVersion = {
  id: string;
  number: number;
  committedAt: Date;
  note: string | null;
  commanderOracleId: string;
  partnerOracleId: string | null;
  commanderSince: Date;
  partnerSince: Date | null;
};

/**
 * The version a deck is currently sleeved as, or null for a brew.
 *
 * Ordered by `number` rather than `committed_at`. The unique key makes number
 * strictly increasing per deck, whereas two versions committed in the same
 * millisecond — reachable when a pull commits a source deck inside another
 * deck's commit — would tie on the timestamp.
 */
export async function newestVersion(deckId: string): Promise<DeckVersion | null> {
  const [row] = await db.select()
    .from(deckVersions)
    .where(eq(deckVersions.deckId, deckId))
    .orderBy(desc(deckVersions.number))
    .limit(1);
  return row ?? null;
}

export async function versionCards(versionId: string): Promise<CardQty[]> {
  return db.select({
    oracleId: deckVersionCards.oracleId,
    quantity: deckVersionCards.quantity,
  }).from(deckVersionCards).where(eq(deckVersionCards.versionId, versionId));
}

/**
 * Freeze the draft as the next version.
 *
 * One transaction, because a version row without its cards is a deck that
 * claims nothing — every copy it holds would read as free across the whole
 * application until someone noticed.
 *
 * The commander columns are read inside the transaction rather than passed in,
 * so a commander swap committed concurrently cannot be snapshotted stale.
 *
 * The deck row is locked `for update` before the number is computed. `max + 1`
 * is otherwise a read-then-write race, and a pull commits a source deck INSIDE
 * another deck's flow — two commits landing together would collide on
 * `deck_versions_deck_number_key` with a 23505 nobody catches.
 *
 * Every `since` is inherited from the predecessor when it held the same card,
 * and set to this version's committed_at when it did not. This is the one place
 * card-level seniority is decided; see the column comment in schema.ts.
 */
export async function commitVersion(
  deckId: string,
  note: string | null,
): Promise<{ version: DeckVersion }> {
  return db.transaction(async (tx) => {
    const [deck] = await tx.select().from(decks)
      .where(eq(decks.id, deckId))
      .for("update");
    if (!deck) throw new Error("deck not found");

    const [previous] = await tx.select()
      .from(deckVersions)
      .where(eq(deckVersions.deckId, deckId))
      .orderBy(desc(deckVersions.number))
      .limit(1);

    // What the predecessor held, and since when. Empty on a first commit, which
    // is what makes every `since` fall through to the new committed_at.
    const inherited = new Map<string, Date>(
      previous
        ? (await tx.select({
            oracleId: deckVersionCards.oracleId,
            since: deckVersionCards.since,
          }).from(deckVersionCards).where(eq(deckVersionCards.versionId, previous.id)))
            .map((r) => [r.oracleId, r.since])
        : [],
    );

    const [version] = await tx.insert(deckVersions).values({
      deckId,
      number: (previous?.number ?? 0) + 1,
      note,
      commanderOracleId: deck.commanderOracleId,
      partnerOracleId: deck.partnerOracleId,
    }).returning();

    // committed_at is defaulted by the database, so the inheritance below reads
    // it back off the inserted row rather than guessing at a client clock.
    const now = version.committedAt;
    const commanderSince =
      previous && previous.commanderOracleId === deck.commanderOracleId
        ? previous.commanderSince
        : now;
    const partnerSince = deck.partnerOracleId === null
      ? null
      : previous && previous.partnerOracleId === deck.partnerOracleId
        ? previous.partnerSince
        : now;
    await tx.update(deckVersions)
      .set({ commanderSince, partnerSince })
      .where(eq(deckVersions.id, version.id));

    const rows = await tx.select({
      oracleId: deckCards.oracleId,
      quantity: deckCards.quantity,
    }).from(deckCards).where(eq(deckCards.deckId, deckId));

    if (rows.length > 0) {
      await tx.insert(deckVersionCards).values(
        rows.map((r) => ({
          versionId: version.id,
          oracleId: r.oracleId,
          quantity: r.quantity,
          since: inherited.get(r.oracleId) ?? now,
        })),
      );
    }
    return { version: { ...version, commanderSince, partnerSince } };
  });
}

/**
 * Throw the draft away and put the version's list back.
 *
 * Destructive and unrecoverable: the draft is not itself versioned, so what
 * this deletes is gone. The confirmation belongs at the call site, on the same
 * bar the bulk keep took in #476.
 *
 * `auto` is deliberately reset to false on every restored row. A version is a
 * list the player committed to, so nothing in it is an unclaimed suggestion,
 * and leaving the flag set would let a later sweep delete cards out of a
 * committed deck.
 */
export async function restoreDraftFromVersion(deckId: string, versionId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [version] = await tx.select().from(deckVersions)
      .where(and(eq(deckVersions.id, versionId), eq(deckVersions.deckId, deckId)));
    if (!version) throw new Error("version not found");

    const rows = await tx.select({
      oracleId: deckVersionCards.oracleId,
      quantity: deckVersionCards.quantity,
    }).from(deckVersionCards).where(eq(deckVersionCards.versionId, versionId));

    await tx.delete(deckCards).where(eq(deckCards.deckId, deckId));
    if (rows.length > 0) {
      await tx.insert(deckCards).values(
        rows.map((r) => ({
          deckId, oracleId: r.oracleId, quantity: r.quantity, auto: false,
        })),
      );
    }
  });
}
```

- [ ] **Step 2: Verify types and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/decks/versions.ts
git commit -m "feat(decks): read, commit and restore deck versions"
```

---

### Task 5: The claim-model swap

**Files:**
- Modify: `src/lib/decks/availability-query.ts:42-109` (the `claimModel` CTE), `:119-127` and `:157-183` (the seniority comments and CTEs), `:291-345` (`loadDeckBuyRows`)

**Interfaces:**
- Consumes: `deck_versions`, `deck_version_cards`.
- Produces: no signature change. `loadAvailability` and `loadDeckBuyRows` keep their exact shapes; only what they mean by "a claim" moves.

This is the risky task and it ships alone. It changes buy tags across the whole
application with nothing on screen to explain them.

- [ ] **Step 1: Replace the claim model's source**

In `claimModel`, replace `deck_totals` and `all_claims` with a newest-version
lookup. The whole CTE becomes:

```sql
  -- The version each deck is currently sleeved as. `number` orders it, not
  -- `committed_at`: the unique key makes number strictly increasing per deck,
  -- and two versions committed in the same millisecond would tie on time.
  newest_version as (
    select distinct on (v.deck_id)
      v.deck_id, v.id as version_id, v.committed_at,
      v.commander_oracle_id, v.commander_since,
      v.partner_oracle_id, v.partner_since
    from deck_versions v
    join decks d on d.id = v.deck_id
    where d.user_id = ${userId}
    order by v.deck_id, v.number desc
  ),
  -- Every claim on a card, one row per (deck, card).
  --
  -- A deck WITH a version claims off that version's snapshot: what is
  -- physically sleeved, not what the draft is toying with. A deck WITHOUT one
  -- is a brew and claims off its live list, softly, exactly as before.
  --
  -- union all, not union: the arms are disjoint by construction — a deck is in
  -- newest_version or it is not — so the sort would be pure cost.
  -- `since`, not `committed_at`: seniority is per CARD. A deck that has held a
  -- card for a year and then commits an unrelated swap must not jump to the
  -- back of the queue on everything it holds. See Addendum R1 in the spec and
  -- the column comment on deck_version_cards.since.
  --
  -- A brew's rows carry a null `since`, and null is the ordering's way of
  -- saying "junior to everything sleeved" — the predicate below tests for it
  -- explicitly rather than relying on null comparison semantics.
  all_claims as (
    select nv.deck_id, vc.oracle_id, vc.quantity, vc.since
    from newest_version nv
    join deck_version_cards vc on vc.version_id = nv.version_id
    union all
    select nv.deck_id, nv.commander_oracle_id, 1, nv.commander_since
    from newest_version nv
    union all
    select nv.deck_id, nv.partner_oracle_id, 1, nv.partner_since
    from newest_version nv
    where nv.partner_oracle_id is not null
    union all
    -- Brews: no version, so the live list is the only statement of intent
    -- there is. These rows are graded soft below.
    select dc.deck_id, dc.oracle_id, dc.quantity, null::timestamp
    from deck_cards dc
    join decks d on d.id = dc.deck_id
    where d.user_id = ${userId}
      and not exists (select 1 from newest_version nv where nv.deck_id = dc.deck_id)
    union all
    select d.id, d.commander_oracle_id, 1, null::timestamp
    from decks d
    where d.user_id = ${userId}
      and not exists (select 1 from newest_version nv where nv.deck_id = d.id)
    union all
    select d.id, d.partner_oracle_id, 1, null::timestamp
    from decks d
    where d.user_id = ${userId} and d.partner_oracle_id is not null
      and not exists (select 1 from newest_version nv where nv.deck_id = d.id)
  ),
```

The `newest_version` CTE above must also select `v.commander_since` and
`v.partner_since`, which the arms here read.

- [ ] **Step 2: Replace maturity with commitment in `claim_decks_all`**

`mature` becomes `committed_at is not null`, and the body-size test goes. The
CTE becomes:

```sql
  claim_decks_all as (
    select
      ac.oracle_id,
      ac.deck_id,
      d.name,
      -- Seniority is "who sleeved it first", not "who registered the deck
      -- first". Ordering on decks.created_at would hand a contested copy to
      -- the older deck and silently send the deck that physically HAS the card
      -- shopping — the implicit pull this whole feature exists to prevent.
      --
      -- min() over the arms, which matters only for the deck whose commander is
      -- also on its own list: one claimant, and the earlier of the two dates.
      min(ac.since) as since,
      -- Was a 99-card body test. A committed version answers outright what
      -- that threshold was guessing at, which is also what retires the #334
      -- commander carve-out: a committed deck's commander is hard because the
      -- whole version is hard, not because commanders are special.
      (nv.deck_id is not null) as sleeved,
      sum(ac.quantity)::int as quantity
    from all_claims ac
    join decks d on d.id = ac.deck_id
    left join newest_version nv on nv.deck_id = ac.deck_id
    group by ac.oracle_id, ac.deck_id, d.name, (nv.deck_id is not null)
  ),
```

Delete the `deck_totals` CTE entirely — nothing reads it now.

- [ ] **Step 3: Update every reader of `mature`**

There are SIX, and the last two are the ones a careless rename misses. Grep
`mature` in the file afterwards and confirm the only survivor is the JSON key.

- `skip_deck` (`:160-174`) reads its own newest version instead of counting cards:
  ```sql
  skip_deck as (
    select d.id, (nv.deck_id is not null) as sleeved
    from decks d
    left join newest_version nv on nv.deck_id = d.id
    where ${skip}::uuid is not null and d.id = ${skip}::uuid and d.user_id = ${userId}
  ),
  -- What the vantage deck itself holds, and since when. A card ABSENT here is a
  -- card this deck has not sleeved — a draft add, or a brew's whole list — and
  -- the join below reads that absence as junior to every sleeved claimant. That
  -- one fact is what stops a draft add taking a card out of another deck's
  -- committed version; there is no separate rule for it.
  mine as (
    select ca.oracle_id, ca.since
    from claim_decks_all ca, skip_deck s
    where ca.deck_id = s.id and ca.since is not null
  ),
  ```
- `senior_hard` (`:177-183`) orders per card on `since`:
  ```sql
  senior_hard as (
    select ca.oracle_id, sum(ca.quantity)::int as hard_senior
    from claim_decks_all ca
    cross join skip_deck s
    left join mine m on m.oracle_id = ca.oracle_id
    where ca.sleeved
      and ca.deck_id <> s.id
      -- m.since null covers both "the vantage is a brew" and "the vantage has
      -- not sleeved this card". Both mean everyone sleeved is ahead of it.
      and (m.since is null or (ca.since, ca.deck_id) < (m.since, s.id))
    group by ca.oracle_id
  ),
  ```
- `claims` (`:184-206`) uses `cd.sleeved` in both `case` arms and emits
  `'mature', cd.sleeved` in the `jsonb_build_object` — **keep the JSON key
  named `mature`**, because `DeckClaim` in `availability.ts` and every consumer
  of the receipt read that key. Renaming it is a separate change with its own
  blast radius.
- **The `free` expression in the outer select (`:228`).** It reads
  `(select s.mature from skip_deck s)` through a scalar subquery, far from the
  CTEs above, and is the single easiest site to miss — a miss is not a subtle
  wrong answer but `column s.mature does not exist` on every availability read.
  It becomes `(select s.sleeved from skip_deck s)`.
- **`loadDeckBuyRows`'s `supply` CTE (`:317-328`) — the inner join must become a
  left join.** This is not a rename. `list_claims` reads `deck_cards` (the
  draft) while `claim_decks_all` now reads versions, and the two diverging IS
  the feature. An inner join therefore drops every draft-added card from the buy
  list — the one figure the player commits against. The CTE becomes:
  ```sql
  supply as (
    select
      lc.deck_id,
      lc.oracle_id,
      lc.quantity,
      coalesce(o.owned, 0)::int as owned,
      coalesce((
        select sum(senior.quantity)
        from claim_decks_all senior
        where senior.oracle_id = lc.oracle_id
          and senior.sleeved
          and senior.deck_id <> lc.deck_id
          -- Mirrors senior_hard exactly: a deck that does not hold this card in
          -- its own version — `mine` absent — sits behind every sleeved claim.
          and (
            mine.since is null
            or (senior.since, senior.deck_id) < (mine.since, lc.deck_id)
          )
      ), 0)::int as senior
    from list_claims lc
    join cards c on c.oracle_id = lc.oracle_id
    left join owned o on o.oracle_id = lc.oracle_id
    -- LEFT, and this is load-bearing: see above.
    left join claim_decks_all mine
      on mine.deck_id = lc.deck_id and mine.oracle_id = lc.oracle_id
    where c.type_line !~ '\\mBasic\\M'
  )
  ```
  The old `join claim_decks_all ca` and every `ca.` reference go with it.
- `list_claims` (`:301-307`) keeps reading `deck_cards`. A deck is told to buy
  what its DRAFT wants — that is the preview the player acts on — while
  seniority is measured against what is sleeved. The header comment must say so.

One semantic consequence to record in the header rather than treat as a bug:
`own_claims` also reads `all_claims`, so on a committed deck's own page a card
the draft added contributes nothing to `own_claim` and reads as free when a free
copy exists. That is correct — the deck has not sleeved it — and Task 6 asserts
it.

- [ ] **Step 4: Rewrite the module header comment**

The header at `:14-41` documents the maturity rule that no longer exists.
Replace points 1 and 2's framing so it states: claims come from the newest
committed version; a deck with no version claims softly off its live list;
basics are still excluded entirely; the commander columns are snapshotted on
the version and unioned from there.

- [ ] **Step 5: Verify the existing suite still passes**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS. `src/lib/decks/availability.test.ts` tests the pure grading
helpers and does not touch this SQL, so a failure there means a type or an
export moved and should be fixed rather than accommodated.

- [ ] **Step 6: Commit**

```bash
git add src/lib/decks/availability-query.ts
git commit -m "feat(decks): claims come from the newest committed version"
```

---

### Task 6: `probe-claim-model.ts` — the proof

**Files:**
- Create: `scripts/probe-claim-model.ts`
- Modify: `package.json` (one script entry), `AGENTS.md` (one bullet)

**Interfaces:**
- Consumes: `loadAvailability` from Task 5, `DATABASE_URL`.

The claim model is raw SQL and this repository has no integration harness for
query builders. This probe builds a scenario in a real database, calls the real
`loadAvailability`, asserts the five figures by name, and deletes its fixture in
a `finally`.

Three constraints that decide its shape, all verified against the tree:

- **TypeScript, not `.mjs`.** It has to call `loadAvailability` itself. A probe
  that re-declares the SQL proves only that the copy is self-consistent, and the
  copy drifts. `tsx` is already a dev dependency and `scripts/*.ts` already
  import from `../src`.
- **No `begin`/`rollback`.** `loadAvailability` goes through the `src/db`
  singleton, which is a different connection from any the probe opens, so a
  transaction the probe holds is invisible to the function under test. Isolation
  comes from a per-run `user_id` instead, and the fixture is deleted in a
  `finally`. **Run it against a scratch Neon branch or local dev, never
  production.**
- **The contested card must not also be a commander.** Both fixture decks need a
  legendary commander, and if that legend is also the copy being fought over the
  vantage deck claims it twice against one owned copy and every expected figure
  is wrong.

- [ ] **Step 1: Write the probe**

Create `scripts/probe-claim-model.ts`:

```ts
// The claim model's four states, proved against a real Postgres by calling the
// real loadAvailability. A probe that re-declared the SQL would prove only that
// its copy is self-consistent.
//
// It writes a fixture under a per-run user_id and deletes it in a finally. Run
// it against a scratch Neon branch or local dev — NEVER production.
//
// Run: `pnpm probe:claims`
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { loadAvailability } from "../src/lib/decks/availability-query";
import { requireEnv } from "./lib/env.mjs";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const fixture = drizzle(new Pool({ connectionString: DATABASE_URL }));
const USER = `probe-claim-${Date.now()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${actual}, expected ${expected}`);
};

// The card being fought over, and two legends to lead the decks. Read from the
// catalog rather than hard-coded: a fixed uuid rots the first time it moves.
// THREE DISTINCT IDS — a commander that is also the contested card claims twice
// against one owned copy and every figure below is wrong.
const pickCards = async () => {
  const { rows } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line ~ 'Legendary Creature' and type_line !~ '\\mBasic\\M'
    order by oracle_id limit 2
  `);
  const { rows: [subject] } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line !~ '\\mBasic\\M' and type_line !~ 'Legendary'
    order by oracle_id limit 1
  `);
  return { cmdA: rows[0].oracle_id, cmdB: rows[1].oracle_id, card: subject.oracle_id };
};

const { cmdA, cmdB, card } = await pickCards();

// One copy owned, and the vantage-deck free figure for that copy.
const free = async (deckId: string) => {
  const availability = await loadAvailability(USER, {
    oracleIds: [card],
    excludeDeckId: deckId,
  });
  return availability.get(card)?.free ?? null;
};

try {
  await fixture.execute(sql`
    insert into collection_items (user_id, oracle_id, quantity)
    values (${USER}, ${card}, 1)
  `);
  // `older` was REGISTERED first; `newer` actually sleeved the card. Under the
  // old created_at seniority older would win, which is the bug being fixed.
  const { rows: [older] } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, created_at)
    values (${USER}, 'Older deck', ${cmdA}, now() - interval '1 year') returning id
  `);
  const { rows: [newer] } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, created_at)
    values (${USER}, 'Newer deck', ${cmdB}, now()) returning id
  `);

  const commit = async (deckId: string, cmd: string, number: number, holds: boolean) => {
    const { rows: [v] } = await fixture.execute<{ id: string; committed_at: string }>(sql`
      insert into deck_versions
        (deck_id, number, committed_at, commander_oracle_id, commander_since)
      values (${deckId}, ${number}, now(), ${cmd}, now())
      returning id, committed_at
    `);
    if (holds) {
      await fixture.execute(sql`
        insert into deck_version_cards (version_id, oracle_id, quantity, since)
        values (${v.id}, ${card}, 1, ${v.committed_at})
      `);
    }
    return v.id;
  };

  // The newer deck sleeved it a day ago; the older deck only DRAFTS it.
  await commit(newer.id, cmdB, 1, true);
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity)
    values (${older.id}, ${card}, 1)
  `);
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity)
    values (${newer.id}, ${card}, 1)
  `);

  // 1. A draft add cannot take a card out of another deck's committed version.
  check("draft add sees no free copy", await free(older.id), 0);

  // 2. A pending remove still claims: drop it from the newer deck's DRAFT
  //    while its version still lists it, and the copy stays spoken for.
  await fixture.execute(sql`delete from deck_cards where deck_id = ${newer.id}`);
  check("pending remove still claims", await free(older.id), 0);
  // …and it is still the newer deck's own claim, so its own page reads 0 free.
  check("the pending remove is still the holder's own claim", await free(newer.id), 0);

  // 3. Between two sleeved versions, the earlier `since` holds it. The older
  //    deck commits SECOND despite being the older deck.
  await commit(older.id, cmdA, 1, true);
  check("later commit does not take the copy", await free(older.id), 0);

  // 4. An accepted pull frees the copy at once: the source commits a version
  //    without the card, and the asking deck stops being told to buy.
  await commit(newer.id, cmdB, 2, false);
  check("pull frees the copy at once", await free(older.id), 1);
} finally {
  // Ordered by dependency; deck_versions and deck_cards cascade off decks.
  await fixture.execute(sql`delete from decks where user_id = ${USER}`);
  await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
}

console.log(failures === 0 ? "\nAll five figures hold." : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 2: Add the script entry**

In `package.json`, alongside the other `tsx` scripts:

```json
    "probe:claims": "tsx scripts/probe-claim-model.ts"
```

- [ ] **Step 3: Run it**

Run: `pnpm probe:claims`
Expected: six PASS lines and "All six figures hold."

If a check fails, fix the SQL from Task 5 — not the expected figure. The six
are the spec's states restated, and moving one to make the probe green is the
one failure mode this task exists to prevent.

**Correction applied while building.** The figures as first drafted above ignored
`own_claims`: on a deck's own page `free` subtracts the vantage deck's own claim
alongside the senior ones, so it is a SURPLUS and not a count of copies in a box.
Zero means "holds what it needs and no spare"; a negative figure is the shortfall
this deck must buy. That is pre-existing behaviour from the seniority work in
PR #464, not something this task introduced, so the probe's expectations were the
thing that was wrong. Restated: the headline check — the older deck commits
second and is told to buy rather than emptying the newer deck's box — asserts
`free = -1`, and the pull that settles it asserts the figure returns to `0`. A
sixth check was added for the source deck after the pull, which also reads `0`.

- [ ] **Step 4: Document it in AGENTS.md**

Add one bullet under Workflow naming the probe, what it proves, that it needs a
real database, and that it must not be pointed at production.

- [ ] **Step 5: Commit**

```bash
git add scripts/probe-claim-model.ts package.json AGENTS.md
git commit -m "test(decks): probe the claim model's five figures against real Postgres"
```

---

### Task 7: `commitVersion` and `discardDraft` server actions

**Files:**
- Modify: `src/app/decks/actions.ts` (append after the game actions)
- Test: `src/app/decks/actions.test.ts`

**Interfaces:**
- Consumes: `commitVersion`, `restoreDraftFromVersion`, `newestVersion`, `versionCards` from `versions.ts`; `draftDiff`, `bucketAdds` from `draft-diff.ts`; `requireDeck`, `revalidateClaims` already in the module.
- Produces:
  ```ts
  export type CommitResult =
    | { ok: true; number: number; buy: BucketedAdd[]; pull: DraftChange[] }
    | { ok: false; message: string };
  export async function commitDeckVersion(deckId: string, note: string | null): Promise<CommitResult>;
  export async function discardDeckDraft(deckId: string): Promise<DeckMutationResult>;
  ```

- [ ] **Step 1: Write the failing tests**

**Mock `./versions` and `../../lib/decks/availability-query` rather than
extending the db stub to serve them.** The hand-rolled stub in
`actions.test.ts` returns `Object.assign(Promise, { limit })` from `where()`,
which has no `orderBy`, and its transaction object has no `delete` and no
`execute` — so `newestVersion`, `commitVersion` and `loadAvailability` all
throw inside it. Teaching the stub four new shapes to re-test database round
trips that Task 6's probe already proves is the wrong trade. What these tests
own is the action's guards, its arithmetic and its revalidation.

Append to `src/app/decks/actions.test.ts`. Declare the constants — none of
`DECK_ID`, `CARD_A` or `CARD_B` exist at file scope, and `USER_ID` must be
`"user_1"` because that is what `requireUserId` is mocked to return:

```ts
vi.mock("../../lib/decks/versions", () => ({
  newestVersion: vi.fn(),
  versionCards: vi.fn(),
  commitVersion: vi.fn(),
  restoreDraftFromVersion: vi.fn(),
}));
vi.mock("../../lib/decks/availability-query", () => ({
  loadAvailability: vi.fn(async () => new Map()),
  loadDeckBuyRows: vi.fn(async () => []),
}));

describe("commitDeckVersion", () => {
  const DECK_ID = "11111111-1111-4111-8111-111111111111";
  const USER_ID = "user_1";
  const CMD = "22222222-2222-4222-8222-222222222222";
  const CARD_A = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    vi.mocked(newestVersion).mockResolvedValue({
      id: "44444444-4444-4444-8444-444444444444",
      number: 1, committedAt: new Date(), note: null,
      commanderOracleId: CMD, partnerOracleId: null,
      commanderSince: new Date(), partnerSince: null,
    });
    vi.mocked(versionCards).mockResolvedValue([]);
    vi.mocked(commitVersion).mockResolvedValue({
      version: { number: 2 } as Awaited<ReturnType<typeof commitVersion>>["version"],
    });
  });

  it("refuses a deck the user does not own", async () => {
    stub.state.decks = [];
    const result = await commitDeckVersion(DECK_ID, null);
    expect(result).toEqual({ ok: false, message: expect.any(String) });
    expect(commitVersion).not.toHaveBeenCalled();
  });

  it("revalidates claim surfaces, because a commit moves every other deck's figures", async () => {
    stub.state.decks = [{ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD }];
    await commitDeckVersion(DECK_ID, null);
    expect(stub.state.revalidated).toContain(`/decks/${DECK_ID}`);
    expect(stub.state.revalidated).toContain("/collection");
  });

  // The pull list is computed BEFORE the write. Afterwards the draft and the
  // newest version are identical by definition and the diff is empty.
  it("returns the pull list from what the version dropped", async () => {
    stub.state.decks = [{ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD }];
    stub.state.deckRows = [];
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    const result = await commitDeckVersion(DECK_ID, null);
    expect(result.ok && result.pull).toEqual([{ oracleId: CARD_A, from: 1, to: 0 }]);
  });

  // An empty note is not a note. Storing "" would render a blank line in the
  // history where the player wrote nothing.
  it("stores a whitespace-only note as null", async () => {
    stub.state.decks = [{ id: DECK_ID, userId: USER_ID, commanderOracleId: CMD }];
    await commitDeckVersion(DECK_ID, "   ");
    expect(commitVersion).toHaveBeenCalledWith(DECK_ID, null);
  });
});
```

Import `newestVersion`, `versionCards`, `commitVersion` and
`restoreDraftFromVersion` at the top of the test file so `vi.mocked` can reach
them.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/app/decks/actions.test.ts`
Expected: FAIL — `commitDeckVersion` is not exported.

- [ ] **Step 3: Write the actions**

```ts
/**
 * Freeze the draft as the next version and say what it costs.
 *
 * The two lists are computed BEFORE the write, against the version being
 * replaced — afterwards the draft and the newest version are identical by
 * definition and the diff is empty.
 *
 * `revalidateClaims`, not a bare `revalidatePath`: a commit changes what every
 * other deck can claim, so the collection page and every cached list payload
 * are stale the moment it lands.
 */
export async function commitDeckVersion(
  deckId: string,
  note: string | null,
): Promise<CommitResult> {
  const userId = await requireUserId();
  if (!isUuid(deckId)) return { ok: false, message: "We couldn't find that deck." };
  try {
    await requireDeck(deckId, userId);
  } catch {
    return { ok: false, message: "We couldn't find that deck." };
  }

  const previous = await newestVersion(deckId);
  const before = previous ? await versionCards(previous.id) : [];
  const draft = await db.select({
    oracleId: deckCards.oracleId, quantity: deckCards.quantity,
  }).from(deckCards).where(eq(deckCards.deckId, deckId));

  const diff = draftDiff(draft, before);
  const availability = await loadAvailability(userId, {
    oracleIds: diff.adds.map((a) => a.oracleId),
    excludeDeckId: deckId,
  });
  // hardDecks, not the raw claims: a BREW "holding" a card holds nothing, and
  // naming it would offer a pull against a list that was never sleeved.
  const claimants = new Map(
    [...availability].map(([oracleId, a]) => [oracleId, { free: a.free, claims: hardDecks(a) }]),
  );
  const buy = bucketAdds(diff.adds, claimants).filter((a) => a.bucket !== "free");

  const { version } = await commitVersion(deckId, note?.trim() || null);
  revalidateClaims(deckId, userId);
  return { ok: true, number: version.number, buy, pull: diff.removes };
}

/**
 * Throw the draft away and put the newest version's list back.
 *
 * Destructive and unrecoverable — the draft is not versioned — so the caller
 * confirms first. A deck with no version has nothing to restore TO, and
 * silently emptying it would delete a whole brew.
 */
export async function discardDeckDraft(deckId: string): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  if (!isUuid(deckId)) return { ok: false, message: "We couldn't find that deck." };
  await requireDeck(deckId, userId);
  const version = await newestVersion(deckId);
  if (!version) return { ok: false, message: "This deck has no version to go back to." };
  await restoreDraftFromVersion(deckId, version.id);
  revalidateClaims(deckId, userId);
  return { ok: true };
}
```

Add the imports at the top of the module — including `hardDecks` from
`../../lib/decks/availability`.

`actions.ts` carries `"use server"`, so **every type this module re-exports must
use `export type`**. A bare `export { BucketedAdd }` from a server-actions
module is a build error, not a lint nit: Next requires every named export of a
`"use server"` file to be an async function.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm test src/app/decks/actions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/decks/actions.ts src/app/decks/actions.test.ts
git commit -m "feat(decks): commit a version and discard a draft"
```

---

### Task 8: `pullFromDeck` and the game stamp

**Files:**
- Modify: `src/app/decks/actions.ts`
- Test: `src/app/decks/actions.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export async function pullCardFromDeck(
    sourceDeckId: string, oracleId: string, askingDeckId: string,
  ): Promise<DeckMutationResult>;
  ```

`askingDeckId` is not decoration. The player is looking at the *asking* deck's
buy tag when they take the pull, and revalidating only the source would leave
that tag on screen until something else happened to refresh it.

- [ ] **Step 1: Write the failing tests**

Same mocking as Task 7 — `./versions` is mocked, so these assert the guard and
the revalidation, not the round trip.

```ts
describe("pullCardFromDeck", () => {
  const SOURCE_ID = "55555555-5555-4555-8555-555555555555";
  const ASKING_ID = "66666666-6666-4666-8666-666666666666";
  const USER_ID = "user_1";
  const CMD = "22222222-2222-4222-8222-222222222222";
  const CARD_A = "33333333-3333-4333-8333-333333333333";
  const CARD_B = "77777777-7777-4777-8777-777777777777";

  beforeEach(() => {
    stub.state.decks = [{ id: SOURCE_ID, userId: USER_ID, commanderOracleId: CMD }];
    vi.mocked(newestVersion).mockResolvedValue({
      id: "44444444-4444-4444-8444-444444444444",
      number: 1, committedAt: new Date(), note: null,
      commanderOracleId: CMD, partnerOracleId: null,
      commanderSince: new Date(), partnerSince: null,
    });
  });

  // The guard that stops a pull sweeping somebody else's half-finished
  // tinkering into a version they never asked for.
  it("refuses when the source deck already has pending changes", async () => {
    stub.state.deckRows = [{ oracleId: CARD_A, quantity: 1 }, { oracleId: CARD_B, quantity: 1 }];
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result).toEqual({ ok: false, message: expect.stringContaining("pending") });
    expect(commitVersion).not.toHaveBeenCalled();
  });

  it("removes the card and commits a version recording it", async () => {
    stub.state.deckRows = [{ oracleId: CARD_A, quantity: 1 }];
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    const result = await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(result.ok).toBe(true);
    expect(stub.state.deleteCalls).toContainEqual({ table: "deck_cards", id: CARD_A });
    expect(commitVersion).toHaveBeenCalledWith(SOURCE_ID, expect.any(String));
  });

  // The player is looking at the ASKING deck's buy tag when they take the pull.
  it("revalidates both decks", async () => {
    stub.state.deckRows = [{ oracleId: CARD_A, quantity: 1 }];
    vi.mocked(versionCards).mockResolvedValue([{ oracleId: CARD_A, quantity: 1 }]);
    await pullCardFromDeck(SOURCE_ID, CARD_A, ASKING_ID);
    expect(stub.state.revalidated).toContain(`/decks/${SOURCE_ID}`);
    expect(stub.state.revalidated).toContain(`/decks/${ASKING_ID}`);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/app/decks/actions.test.ts`
Expected: FAIL — `pullCardFromDeck` is not exported.

- [ ] **Step 3: Write the action**

```ts
/**
 * Take a card out of the deck that currently holds it, on the player's say-so.
 *
 * Removing it and committing in one move is deliberate. Pulling a card out of
 * a box is a physical change to that deck, so it earns a version; and the
 * commit is what frees the copy on the spot, rather than leaving the asking
 * deck showing a buy tag until someone remembers to go and commit the source.
 *
 * The guard is the whole reason this is not a bare delete: if the source deck
 * already has pending changes, committing would sweep them into a version its
 * owner never asked for. That case links the player to the source deck instead.
 */
export async function pullCardFromDeck(
  sourceDeckId: string,
  oracleId: string,
  askingDeckId: string,
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  if (!isUuid(sourceDeckId) || !isUuid(oracleId) || !isUuid(askingDeckId)) {
    return { ok: false, message: "We couldn't find that card." };
  }
  // Both decks, because both are revalidated and both must be the player's.
  await requireDeck(sourceDeckId, userId);
  await requireDeck(askingDeckId, userId);

  const version = await newestVersion(sourceDeckId);
  if (!version) return { ok: false, message: "That deck isn't sleeved yet." };

  const before = await versionCards(version.id);
  const draft = await db.select({
    oracleId: deckCards.oracleId, quantity: deckCards.quantity,
  }).from(deckCards).where(eq(deckCards.deckId, sourceDeckId));
  const diff = draftDiff(draft, before);
  if (diff.adds.length > 0 || diff.removes.length > 0) {
    return { ok: false, message: "That deck has pending changes. Release the card there." };
  }

  await db.delete(deckCards)
    .where(and(eq(deckCards.deckId, sourceDeckId), eq(deckCards.oracleId, oracleId)));
  await commitVersion(sourceDeckId, "Pulled a card for another deck");
  revalidateClaims(sourceDeckId, userId);
  revalidateClaims(askingDeckId, userId);
  return { ok: true };
}
```

- [ ] **Step 4: Stamp the version on a logged game**

Find the game-logging action in the same module and, before its
`db.insert(deckGames)`, read `const version = await newestVersion(deckId);` and
pass `versionId: version?.id ?? null` in the inserted values. Add the comment:

```ts
    // Null for a brew, and null is accurate: a game played by a list nobody
    // committed has no version to point at, and inventing one would be a
    // claim the history cannot support.
```

- [ ] **Step 5: Run the suite**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/decks/actions.ts src/app/decks/actions.test.ts
git commit -m "feat(decks): pull a card from the deck holding it, and stamp games with their version"
```

---

## Tasks 9 onward: the surfaces, as drawn at R2

The five surfaces, plus Discard. Tasks 9–13 are the prerequisites Addendum R3
names — two of them are defects in shipped code — and every surface task after
them is rendering and copy over readers that already exist.

**Errata against Addendum R3 and the handoff, all verified against this tree.
Read these before starting: three of them delete work the documents ask for.**

1. **Addendum R3 prerequisite 5 is already done.** `DecklistGroup`
   (`src/components/decks/decklist-group.tsx`), `DecklistGroupHeader`
   (`decklist-group-header.tsx`) and `GroupToggle` (`group-toggle.tsx`) are
   already separate shipped modules — `decklist.tsx` imports all three. There
   is **no extraction task**. The new surfaces import `DecklistGroupHeader` and
   `groupByCardType` and bring their own row component.
2. **`groupByCardType` already sorts alphabetically inside each group**, so
   R2's alphabetical-within-type ruling costs nothing and needs no sort call.
3. **The shipped action is `commitDeckVersion`** (`src/app/decks/actions.ts:1286`).
   `commitVersion` is the `src/lib/decks/versions.ts` helper it calls. Addendum
   R3 prerequisites 2 and 3 say "commitVersion" but cite `actions.ts:1320-1342`,
   which is the action. Both fixes land in the action.
4. **`pullCardFromDeck` already refuses a commander pull server-side**
   (`actions.ts:1409`). Prerequisite 4's third guard is a *rendering* gap only.
5. **The game stamp needs no write work.** `deck_games.version_id` exists
   (`src/db/schema.ts:348`) and `logGame` already stamps it through
   `versionLiveAt(deckId, playedAt)` (`actions.ts:1180-1215`). Task 21 is a
   read-side join and nothing else.
6. **The row mark needs no padding absorption.** Addendum R3 has the 2px brass
   rule absorbed by `ROW_PADDING`. `DecklistRow` draws its marks as **inset box
   shadows**, not borders (`decklist-row.tsx`, `rowEdges`), and an inset shadow
   shifts no content — so the mark is one more entry in that array and no
   padding, grid template or row height changes. Width is **2px**, per the
   handoff's Component table; §2's prose says 3px and loses to the table.
7. **Two copy strings in the handoff are dead.** `stamp.columnHeader: 'ver'` has
   nowhere to go — the game log has no mono column-header row — and the five
   `review.bucket*` / `bucket*Note` strings were killed by R2's ruling that
   availability is a per-row treatment, not a grouping. Transcribe neither.
8. **`recounted(name, from: number, to: number)` from the handoff's copy file is
   discarded** in favour of the shipped `recountedItem(name: string, from:
   string, to: string)` (`src/lib/copy/deck-import.ts:506`), per Addendum R3
   prerequisite 1. Callers pass `String(n)`.

---

### Task 9: The commit receipt's two defects

`commitDeckVersion` filters basics out of `adds` and returns `pull: diff.removes`
raw, so cutting 3 of 12 Islands puts a bare `Island` under *back in the pool* —
no count, no movement, and a claim the deck lost its Islands. And the success
line prints the version's card count, which the receipt does not carry.

**Files:**
- Modify: `src/app/decks/actions.ts:1268-1346` (`CommitResult`, `commitDeckVersion`)
- Test: `src/app/decks/actions.test.ts`

**Interfaces:**
- Consumes: `draftDiff`, `bucketAdds`, `commitVersion` (Tasks 3 and 4).
- Produces: `CommitResult` gains `cardCount: number`; `pull` is basics-free.

- [ ] **Step 1: Write the failing tests**

Add to the existing `describe("commitDeckVersion")` block in
`src/app/decks/actions.test.ts`, alongside the tests written in Task 7:

```ts
  it("drops basics from the pull list as well as the buy list", async () => {
    // 12 Islands down to 9, and one Sol Ring out.
    version([{ oracleId: ISLAND, quantity: 12 }, { oracleId: SOL_RING, quantity: 1 }]);
    draft([{ oracleId: ISLAND, quantity: 9 }]);
    typeLines({ [ISLAND]: "Basic Land — Island", [SOL_RING]: "Artifact" });

    const result = await commitDeckVersion(DECK, null);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pull.map((p) => p.oracleId)).toEqual([SOL_RING]);
  });

  it("reports the version's card count", async () => {
    version([{ oracleId: SOL_RING, quantity: 1 }]);
    draft([{ oracleId: SOL_RING, quantity: 1 }, { oracleId: ISLAND, quantity: 9 }]);
    typeLines({ [ISLAND]: "Basic Land — Island", [SOL_RING]: "Artifact" });

    const result = await commitDeckVersion(DECK, null);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Every draft row, basics included: the count is the size of the list that
    // was snapshotted, not the size of the shopping decision.
    expect(result.cardCount).toBe(10);
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/app/decks/actions.test.ts -t "commitDeckVersion"`
Expected: FAIL — the first with `["0000…island", "0000…solring"]` received, the
second with `Property 'cardCount' does not exist on type`.

- [ ] **Step 3: Make the basics lookup cover both lists**

In `src/app/decks/actions.ts`, replace the `basics` / `adds` pair at lines
1319-1326 with a lookup over both sides of the diff:

```ts
    // Both sides, not just adds. A basic dropped from `adds` but kept in
    // `removes` renders as a bare `Island` under "back in the pool" — a claim
    // the deck lost its Islands, on a card the player has thirty of. Basics are
    // out of the availability model entirely (see that query's header), so
    // neither list has a truthful figure to print for one.
    const changed = [...diff.adds, ...diff.removes].map((c) => c.oracleId);
    const basics = new Set(
      changed.length === 0 ? [] : (await tx.select({
        oracleId: cards.oracleId, typeLine: cards.typeLine,
      }).from(cards).where(inArray(cards.oracleId, changed)))
        .filter((c) => isBasicLand(c.typeLine))
        .map((c) => c.oracleId),
    );
    const adds = diff.adds.filter((a) => !basics.has(a.oracleId));
    const removes = diff.removes.filter((r) => !basics.has(r.oracleId));
```

- [ ] **Step 4: Carry the count, and return the filtered removes**

Widen the success arm at line 1269:

```ts
export type CommitResult =
  | {
      ok: true;
      number: number;
      /** Rows in the version just written, basics included — the size of the
       *  list that was snapshotted, not of the shopping decision. */
      cardCount: number;
      buy: BucketedAdd[];
      pull: DraftChange[];
    }
  | { ok: false; message: string };
```

and the return at line 1342:

```ts
    const { version } = await commitVersion(deckId, note?.trim() || null, tx);
    // `draft`, not the diff: this is the whole list, read under the same lock
    // the snapshot was written from, so the figure and the version agree.
    const cardCount = draft.reduce((n, c) => n + c.quantity, 0);
    return { ok: true, number: version.number, cardCount, buy, pull: removes };
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/app/decks/actions.test.ts -t "commitDeckVersion"`
Expected: PASS.

- [ ] **Step 6: Run the suite**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/decks/actions.ts src/app/decks/actions.test.ts
git commit -m "fix(decks): keep basics off the pull list, and report the version's size"
```

---

### Task 10: Pull guards the client can render

Every pull guard today is a refusal string returned from inside the transaction,
which cannot be drawn before the attempt. The review page has to know, at render
time, that a holding deck has pending changes (offer `Open →`, not `Pull it`) or
that the card is that deck's commander (offer nothing at all).

**Files:**
- Modify: `src/lib/decks/availability.ts` (`DeckClaim`)
- Modify: `src/lib/decks/availability-query.ts` (`claimModel`'s `all_claims` and `claim_decks_all`, plus a `pending_decks` CTE and the `claims` aggregate)
- Modify: `scripts/probe-claim-model.ts`
- Test: none — this is raw SQL no unit test in this repository can reach. `pnpm probe:claims` is the proof, exactly as Task 6 established.

**Interfaces:**
- Consumes: `claimModel`, `loadAvailability` (Task 5).
- Produces: `DeckClaim` gains `pending: boolean` and `commander: boolean`.

- [ ] **Step 1: Widen the type**

In `src/lib/decks/availability.ts`, add to `DeckClaim`:

```ts
  /**
   * This deck's draft differs from its newest version. A pull would sweep those
   * pending edits into a version its owner never asked for, so the server
   * refuses one (`pullCardFromDeck`) — and a control that can only fail must not
   * be drawn. Always false for a brew: there is no version to differ from.
   */
  pending: boolean;
  /**
   * The card is this deck's commander or partner. Commander claims are in the
   * model, so a pull would otherwise be offered on a row where no route can
   * release it — there is no "go and fix it there" either, which is why this
   * guard draws no control at all.
   */
  commander: boolean;
```

- [ ] **Step 2: Tag the commander arms of `all_claims`**

In `src/lib/decks/availability-query.ts`, give every arm of `all_claims` a
fourth column. The two `newest_version` commander arms and the two `decks`
commander arms select `true`; the `deck_version_cards` arm and the `deck_cards`
brew arm select `false`. Keep the arms in their current order and add the flag
last, so each arm reads `(deck_id, oracle_id, quantity, since, is_commander)`:

```sql
    select nv.deck_id, vc.oracle_id, vc.quantity, vc.since, false as is_commander
    from newest_version nv
    join deck_version_cards vc on vc.version_id = nv.version_id
    union all
    select nv.deck_id, nv.commander_oracle_id, 1, nv.commander_since, true
    from newest_version nv
```

…and so on for the remaining four arms, `true` on the two commander arms of the
brew half and `false` on its `deck_cards` arm.

- [ ] **Step 3: Add the pending-draft CTE**

Insert between `all_claims` and `claim_decks_all`:

```sql
  -- Which decks have a draft that differs from what they have sleeved. The
  -- symmetric difference, both directions: a draft that only REMOVED a card
  -- is pending too, and one direction would call it clean.
  --
  -- Only a deck with a version can be pending. A brew's whole list is its
  -- draft, so there is nothing for it to differ from, and `false` below is what
  -- makes the pull's guard and this flag agree.
  pending_decks as (
    select nv.deck_id
    from newest_version nv
    where exists (
      select dc.oracle_id, dc.quantity from deck_cards dc where dc.deck_id = nv.deck_id
      except
      select vc.oracle_id, vc.quantity from deck_version_cards vc where vc.version_id = nv.version_id
    ) or exists (
      select vc.oracle_id, vc.quantity from deck_version_cards vc where vc.version_id = nv.version_id
      except
      select dc.oracle_id, dc.quantity from deck_cards dc where dc.deck_id = nv.deck_id
    )
  ),
```

- [ ] **Step 4: Carry both flags through `claim_decks_all`**

Add to its select list, its from-clause and its group-by:

```sql
      (pd.deck_id is not null) as pending,
      bool_or(ac.is_commander) as commander,
```

```sql
    left join pending_decks pd on pd.deck_id = ac.deck_id
```

```sql
    group by ac.oracle_id, ac.deck_id, d.name, (nv.deck_id is not null), (pd.deck_id is not null)
```

`bool_or`, because the deck whose commander is also on its own list folds into
one claim: it is a commander claim, and a pull on it must be refused.

- [ ] **Step 5: Put them in the receipt**

Extend the `jsonb_build_object` in `claims`:

```sql
            'quantity', cd.quantity, 'mature', cd.sleeved,
            -- Both guards, rendered before the attempt rather than discovered
            -- by it. The server still refuses on its own account inside the
            -- transaction — these only decide which control is drawn.
            'pending', cd.pending, 'commander', cd.commander
```

- [ ] **Step 6: Prove it against a real Postgres**

Extend `scripts/probe-claim-model.ts` with two assertions, in the style its existing
checks use: after editing the fixture's senior deck's `deck_cards` away from its
version, `loadAvailability` must report that deck's claim with `pending: true`;
and the claim naming a deck's commander must report `commander: true`.

Run: `DATABASE_URL=<local-dev or a scratch Neon branch> pnpm probe:claims`
Expected: every check passes, including the two new ones. **Never production.**

- [ ] **Step 7: Run the suite**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/decks/availability.ts src/lib/decks/availability-query.ts scripts/probe-claim-model.ts
git commit -m "feat(decks): say in the claim whether a pull can be offered"
```

---

### Task 11: Mana value, on the draft and on the version before it

The what-changed strip's sixth cell is mana value, and `DeckDetailCard` carries
none. The strip also prints `was 7`, which needs the *version's* average — a
figure no reader returns, because `versionCards` selects quantity only.

Mana value appears **only** as a deck-level statistic. No row draws one.

**Files:**
- Modify: `src/lib/decks/grouping.ts` (`DeckDetailCard`)
- Modify: `src/lib/decks/read.ts` (the `cardRows` select and the `detailCards` map)
- Modify: `src/lib/decks/versions.ts` (new `versionManaValue`)
- Create: `src/lib/decks/mana-value.ts`
- Test: `src/lib/decks/mana-value.test.ts`

**Interfaces:**
- Consumes: `deckVersionCards`, `cards` (Task 1).
- Produces: `DeckDetailCard.cmc: number`; `averageManaValue(cards: ManaValueCard[]): number | null` from `src/lib/decks/mana-value.ts`; `versionManaValue(versionId: string): Promise<number | null>`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/decks/mana-value.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { averageManaValue } from "./mana-value";

describe("averageManaValue", () => {
  it("weights by quantity", () => {
    expect(averageManaValue([
      { cmc: 1, quantity: 3, typeLine: "Artifact" },
      { cmc: 5, quantity: 1, typeLine: "Creature — Dragon" },
    ])).toBe(2);
  });

  it("excludes lands, which have no cost to average", () => {
    expect(averageManaValue([
      { cmc: 2, quantity: 1, typeLine: "Artifact" },
      { cmc: 0, quantity: 37, typeLine: "Basic Land — Forest" },
      { cmc: 0, quantity: 1, typeLine: "Land — Gate" },
    ])).toBe(2);
  });

  it("is null when there is nothing to average", () => {
    expect(averageManaValue([{ cmc: 0, quantity: 37, typeLine: "Land" }])).toBeNull();
  });

  it("rounds to one decimal, the only precision the cell draws", () => {
    expect(averageManaValue([
      { cmc: 1, quantity: 1, typeLine: "Artifact" },
      { cmc: 2, quantity: 1, typeLine: "Artifact" },
      { cmc: 2, quantity: 1, typeLine: "Artifact" },
    ])).toBe(1.7);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/lib/decks/mana-value.test.ts`
Expected: FAIL — `Cannot find module './mana-value'`.

- [ ] **Step 3: Write the module**

Create `src/lib/decks/mana-value.ts`:

```ts
// The deck's average mana value, for the what-changed strip's sixth cell.
//
// Pure and separate from `mix.ts` because that module owns the five roles and
// their targets, and this figure has neither: there is no recommended mana
// value, which is why its cell draws a movement and never a bar.

import { isBasicLand } from "./grouping";

export type ManaValueCard = { cmc: number; quantity: number; typeLine: string };

/**
 * Quantity-weighted, lands excluded, rounded to one decimal — null when the
 * list is all land or empty.
 *
 * Lands are out because a land's mana value is 0 by definition, not by choice:
 * averaging 37 zeroes into the figure would report every Commander deck as a
 * cheap one and would move the number when the land count moved, which is the
 * one thing the strip's land cell already says.
 */
export function averageManaValue(cards: ManaValueCard[]): number | null {
  let spells = 0;
  let total = 0;
  for (const card of cards) {
    if (isBasicLand(card.typeLine) || /\bLand\b/.test(card.typeLine)) continue;
    spells += card.quantity;
    total += card.cmc * card.quantity;
  }
  if (spells === 0) return null;
  return Math.round((total / spells) * 10) / 10;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run src/lib/decks/mana-value.test.ts`
Expected: PASS.

- [ ] **Step 5: Carry `cmc` on the detail card**

In `src/lib/decks/grouping.ts`, add to `DeckDetailCard` after `role`:

```ts
  /**
   * Scryfall's converted cost, for the what-changed strip's mana value cell.
   * Required rather than optional, unlike `manaCost`: a literal that omitted it
   * would average as a zero and quietly pull the deck's figure down. `cards.cmc`
   * is `notNull` with a default of 0, so there is no null to model.
   */
  cmc: number;
```

Then in `src/lib/decks/read.ts`, add `cmc: cards.cmc,` to the `cardRows` select
(after `manaCost`) and `cmc: row.cmc,` to the `detailCards` map (after `role`).

- [ ] **Step 6: Read the version's figure**

Append to `src/lib/decks/versions.ts`:

```ts
/**
 * The average mana value of a version's list — the strip's `was 7`.
 *
 * A join rather than a second query over `versionCards`: the snapshot stores
 * quantities only, and the figure needs each card's cost and type line. Null
 * when the version was all land, which `averageManaValue` decides.
 */
export async function versionManaValue(versionId: string): Promise<number | null> {
  const rows = await db.select({
    cmc: cards.cmc,
    quantity: deckVersionCards.quantity,
    typeLine: cards.typeLine,
  })
    .from(deckVersionCards)
    .innerJoin(cards, eq(cards.oracleId, deckVersionCards.oracleId))
    .where(eq(deckVersionCards.versionId, versionId));
  return averageManaValue(rows);
}
```

with `cards` added to the `schema` import and `averageManaValue` imported from
`./mana-value`.

- [ ] **Step 7: Run the suite**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS. `pnpm typecheck` is the gate that finds every literal
`DeckDetailCard` the new required field breaks — fixtures and optimistic
reducers included. Each gets the real figure where it has one and `cmc: 0`
where the fixture's card is a land.

- [ ] **Step 8: Commit**

```bash
git add src/lib/decks/grouping.ts src/lib/decks/read.ts src/lib/decks/versions.ts src/lib/decks/mana-value.ts src/lib/decks/mana-value.test.ts
git commit -m "feat(decks): average mana value, on the draft and on the version before it"
```

---

### Task 12: The copy module

Every string these surfaces say is already written and production-final in
`design/design_handoff_the99_deck_versioning/deck-versioning · copy strings.ts`.
This task transcribes it. **Do not paraphrase, re-word or "improve" a string** —
the copy went through its own review and the handoff file is the source of truth.

**Files:**
- Create: `src/lib/copy/deck-versioning.ts`
- Modify: `src/lib/copy/deck-import.ts` (`deckImportCopy.update`, two additions)
- Modify: `src/app/decks/[id]/import/` — whichever module builds the post-apply redirect — to decline `UPDATED_PARAM` on a deck with a version
- Test: `src/lib/copy/deck-versioning.test.ts`

**Interfaces:**
- Produces: `INLINE_CHANGE_MAX = 6` and `deckVersioningCopy` from `src/lib/copy/deck-versioning.ts`, with blocks `pending`, `review`, `commit`, `discard`, `history`, `changed`, `stamp`; `deckImportCopy.update.draftPasteNotice(version: number)`.

- [ ] **Step 1: Transcribe the handoff's copy file**

Copy `design/design_handoff_the99_deck_versioning/deck-versioning · copy strings.ts`
to `src/lib/copy/deck-versioning.ts` verbatim, with these six deviations and
nothing else:

1. Double quotes and this repo's formatting (the handoff file is single-quoted).
2. `export const INLINE_CHANGE_MAX = 6;` stays an export. It is read **only** by
   the banner.
3. **Drop `review.recounted` entirely.** Callers use the shipped
   `recountedItem(name: string, from: string, to: string)` from
   `deckImportCopy.update.diff` (`src/lib/copy/deck-import.ts:506`) and pass
   `String(n)` — Addendum R3 prerequisite 1. A second phrasing of one fact is
   how the two surfaces come to disagree.
4. **Drop `review.bucketFree`, `review.bucketSleeved`, `review.bucketUnowned`,
   `review.bucketFreeNote` and `review.bucketSleevedNote`.** R2 ruled
   availability a per-row treatment, not a grouping; there are no bucket
   headings to carry them. The buckets survive as *counts*, which `chipBuy`,
   `chipPullable` and `groupInBreakdown` carry.
5. **Drop `stamp.columnHeader`.** The game log has no mono column-header row for
   `ver` to join, and inventing one is a change to a shipped surface this
   feature was not given.
6. Keep every signature otherwise exactly as drawn, numeric parameters
   included. The usual repo convention of passing figures as strings does not
   apply here: `history.heading`, `history.gamesHeld` and `changed.delta`
   compute a plural or a sign from the number itself.

Blocks and key counts to check the transcription against: `pending` (20 keys),
`review` (15 after the six drops), `commit` (17), `discard` (7), `history` (16),
`changed` (11), `stamp` (2), plus the top-level `INLINE_CHANGE_MAX` and
`draftPasteNotice`.

- [ ] **Step 2: Move `draftPasteNotice` to the module it belongs in**

`draftPasteNotice` is said by the **update preview**, not by any versioning
surface, so it lives with the rest of that surface's copy. Add it to
`deckImportCopy.update.diff` in `src/lib/copy/deck-import.ts`, taking its string
verbatim from the handoff file, with this comment:

```ts
      // Said above the preview's groups on a deck that has a version: what this
      // paste changes becomes a DRAFT, and nothing about the deck's claims moves
      // until the player commits. Without it the preview reads like the write is
      // final, which on a versioned deck it is not.
```

Then wire it, in this same task — a copy key nothing renders is a string the next
PR has to rediscover. `DeckUpdatePreview` (`src/app/decks/update-actions.ts`)
gains `version: number | null`, `previewDeckUpdate` fills it from the shipped
`newestVersion(input.deckId)` it already imports, and `update-diff.tsx` renders
the notice under the provenance line and above the note block, guarded on
`preview.version !== null`. `update-entry.tsx` already suppresses `UPDATED_PARAM`
on a versioned deck; the notice is the other half of that contract, which is why
the two ship together.

- [ ] **Step 3: Write the failing test**

Create `src/lib/copy/deck-versioning.test.ts`. The repo's copy tests assert the
rules a string must keep, not the string itself:

```ts
import { describe, expect, it } from "vitest";
import { INLINE_CHANGE_MAX, deckVersioningCopy as copy } from "./deck-versioning";

describe("deckVersioningCopy", () => {
  it("names the version the commit will create, not the one it replaces", () => {
    expect(copy.pending.commitCta(3)).toBe("Commit as v3");
  });

  it("draws a sign on a movement and a bare zero on none", () => {
    expect(copy.changed.delta(2)).toBe("+2");
    expect(copy.changed.delta(-2)).toBe("−2");
    expect(copy.changed.delta(0)).toBe("0");
  });

  it("uses a minus sign, never a hyphen, in a delta", () => {
    // U+2212. A hyphen in a mono figure reads as a word break at 10.5px.
    expect(copy.changed.delta(-2)).toContain("−");
    expect(copy.history.delta(3, 2)).toContain("−");
  });

  it("singularises a count of one", () => {
    expect(copy.history.heading(1)).toBe("1 version");
    expect(copy.history.heading(2)).toBe("2 versions");
    expect(copy.history.gamesHeld(1)).toContain("1 game");
  });

  it("caps the inline density at six", () => {
    // The banner's two densities hinge on this and nothing else reads it.
    expect(INLINE_CHANGE_MAX).toBe(6);
  });

  it("has no bucket headings and no second recount phrasing", () => {
    // R2 made availability a per-row treatment; Addendum R3 kept one phrasing
    // for "{name} {from} → {to}". Both deletions are load-bearing.
    expect("bucketFree" in copy.review).toBe(false);
    expect("recounted" in copy.review).toBe(false);
  });
});
```

- [ ] **Step 4: Run it**

Run: `pnpm vitest run src/lib/copy/deck-versioning.test.ts`
Expected: PASS once Step 1 and Step 2 are done. If the minus-sign test fails,
the transcription introduced a hyphen — fix the module, not the test.

- [ ] **Step 5: Suppress the arrival strip on a committed deck**

Addendum R3: suppression is **the caller declining to set `UPDATED_PARAM`**, not
a new state. Find the redirect the apply step builds (it appends
`?${UPDATED_PARAM}=${in}-${out}-${kept}`), and skip the param when the target
deck has a version:

```ts
  // A committed deck has its own account of what is pending, one scroll below
  // where this strip would sit — and that account survives the next navigation
  // while the strip does not. Two diffs for one deck, one of them transient, is
  // the overlap R2 ruled on: the strip is the one that goes.
  const versioned = (await newestVersion(deckId)) !== null;
```

and build the redirect without the param when `versioned` is true.

- [ ] **Step 6: Run the suite**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/copy/deck-versioning.ts src/lib/copy/deck-versioning.test.ts src/lib/copy/deck-import.ts
git commit -m "feat(decks): the versioning surfaces' copy, and one notice on the update preview"
```

---

### Task 13: One reader for the draft, one for its rows

Three surfaces state the same money: the banner's `8 to buy · $254.10`, the
review page's `to buy` chip, and the commit sheet's buy block. Addendum R3 rules
that **one list, three appearances** — so one reader computes it once and the
three render it. Neither `loadDeckBuyRows` nor `loadAvailability` carries a
price, so this composes them with `loadPrices`.

**Files:**
- Create: `src/lib/decks/draft-state.ts`
- Test: none of its own — it is a composition of readers that each reach the database. `draftDiff`, `bucketAdds`, `averageManaValue` and `summarisePrices` are unit-tested where they live, and `pnpm probe:claims` proves the claim model underneath. A stub of four readers would test the stub.

**Interfaces:**
- Consumes: `newestVersion`, `versionCards`, `versionManaValue` (Tasks 4, 11); `draftDiff`, `bucketAdds`, `hardDecks` (Tasks 3, 5); `loadAvailability`, `loadPrices`, `summarisePrices`, `averageManaValue`, `primaryRole`, `cardTypeGroup`.
- Produces: `DraftState`, `loadDraftState(deckId, userId)`, `DraftRow`, `DraftRows`, `loadDraftRows(deckId, userId)`.

- [ ] **Step 1: Write the module**

Create `src/lib/decks/draft-state.ts`:

```ts
// What the draft has changed, and what it will cost — read once, rendered three
// times.
//
// The banner, the review page's chips and the commit sheet's buy block all state
// the same purchase. Addendum R3 rules that one list with three appearances, so
// the arithmetic lives here and no surface repeats it. `loadDraftState` is the
// cheap read every visit to the deck page pays for; `loadDraftRows` adds the
// per-card facts only the review page draws.

import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, deckCards } from "../../db/schema";
import {
  bucketAdds,
  draftDiff,
  type BucketedAdd,
  type DraftChange,
} from "./draft-diff";
import { hardDecks, type Availability } from "./availability";
import { loadAvailability } from "./availability-query";
import { loadPrices } from "./price-query";
import { formatCents, priceOf, priceState, summarisePrices, type PriceFact } from "./price";
import { averageManaValue } from "./mana-value";
import { newestVersion, versionCards, versionManaValue } from "./versions";
import { cardTypeGroup, isBasicLand, type DeckDetailCard } from "./grouping";
import { primaryRole } from "./read";
import type { DeckVersion } from "./versions";

export type DraftState = {
  /** Null for a brew. Every pending surface is absent on a brew: there is no
   *  version for the draft to be pending against. */
  version: DeckVersion | null;
  /** Cards the draft added, bucketed, basics excluded. */
  adds: BucketedAdd[];
  /** The same adds as raw diff entries, index-aligned with `adds`. `BucketedAdd`
   *  carries `needed` and `shortfall` but not the `from`/`to` pair, and both the
   *  banner and the review row print that pair for a quantity move. */
  addChanges: DraftChange[];
  /** Cards the draft cut, basics excluded, each carrying `from` and `to`. */
  removes: DraftChange[];
  /** True when the draft differs from the version ONLY in basic lands. Basics are
   *  outside the availability model, so they are excluded from every list and
   *  every figure — but a deck whose land count moved has genuinely changed and
   *  must still be committable. Without this flag `changeCount` is 0, the banner
   *  takes its clean branch, and a real edit has no route to a commit. */
  basicsChanged: boolean;
  /** Oracle name per changed card, both lists — what the banner's inline
   *  density says at six changes or fewer. */
  names: Map<string, string>;
  /** Printed mana cost per changed card, both lists, for the cost track the
   *  inline density draws beside each name. Absent for a card the catalog gives
   *  no cost, where the track draws nothing rather than a zero. */
  costs: Map<string, string>;
  /** One copy's price, formatted, for the adds that carry a purchase. Absent for
   *  a free add, for every remove, and for a card the feed could not price — an
   *  absent entry means "no figure to show", never "$0.00". A UNIT price,
   *  matching the shipped buy tag rather than multiplying by the shortfall. */
  prices: Map<string, string>;
  /** Whether the claim model could be read at all. False only when the
   *  availability read failed, and then every money figure below is zero or null
   *  and states nothing — NOT "this commit is free", which is what an empty
   *  claimant map would have made them say. */
  claimsKnown: boolean;
  /** Copies the player must obtain: the shortfall over every unfree add. Not a
   *  row count — one card wanted three times is three copies. */
  buyCount: number;
  /** Rows in `adds` that are not free. The banner's `unfree` figure. */
  unfreeCount: number;
  /** Adds a deliberate pull could satisfy: bucket `claimed`, and at least one
   *  holder that is neither pending nor holding it as a commander. Drawn as a
   *  count only — which row offers which control is `loadDraftRows`' answer. */
  pullableCount: number;
  /** Formatted, because the figure is only ever printed. Null when nothing
   *  priced — never "$0.00", which would claim the purchase is free. */
  total: string | null;
  /** Copies of the purchase that carry a price, against `buyCount` copies asked
   *  for. Kept beside `total` because a figure over partial coverage reads as a
   *  complete one: at 4 of 9 the total is real and the purchase is bigger than
   *  it, and `priceCopy.strip.pricedClause` is how every other surface says so. */
  pricedCopies: number;
  /** The draft's average, and the version's. Both null on an all-land list. */
  manaValue: number | null;
  manaValueBefore: number | null;
};

/** `adds.length + removes.length` — the figure every count chip is built on.
 *  Basics are not in either list, so this is a count of *nameable* changes and
 *  not a test of whether the draft differs. Use `hasChanges` for that. */
export function changeCount(state: DraftState): number {
  return state.adds.length + state.removes.length;
}

/** Whether the draft differs from the version at all. A basics-only edit counts
 *  here and in no figure, which is the only honest split: the app cannot price
 *  an Island, and it must not tell a player who cut three of them that the deck
 *  is unchanged. */
export function hasChanges(state: DraftState): boolean {
  return changeCount(state) > 0 || state.basicsChanged;
}

export async function loadDraftState(deckId: string, userId: string): Promise<DraftState> {
  const version = await newestVersion(deckId);
  const before = version ? await versionCards(version.id) : [];
  const draft = await db.select({
    oracleId: deckCards.oracleId, quantity: deckCards.quantity,
  }).from(deckCards).where(eq(deckCards.deckId, deckId));

  const empty: DraftState = {
    version, adds: [], addChanges: [], removes: [], basicsChanged: false,
    names: new Map(), costs: new Map(), prices: new Map(), claimsKnown: true,
    buyCount: 0, unfreeCount: 0, pullableCount: 0, total: null, pricedCopies: 0,
    manaValue: null, manaValueBefore: null,
  };
  // A brew has no version to differ from, so it has no draft state at all —
  // not an empty one. Returning early also keeps every query below off the
  // page load of a deck that has never been committed.
  if (!version) return empty;

  const diff = draftDiff(draft, before);
  const changed = [...diff.adds, ...diff.removes].map((c) => c.oracleId);
  if (changed.length === 0) return { ...empty, version };

  // Names and type lines in one read. Basics come out of both lists for the
  // reason the commit receipt drops them: they are outside the availability
  // model, so neither list has a figure to print for one.
  const facts = await db.select({
    oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
    cmc: cards.cmc, manaCost: cards.manaCost,
  }).from(cards).where(inArray(cards.oracleId, changed));
  const basics = new Set(facts.filter((f) => isBasicLand(f.typeLine)).map((f) => f.oracleId));
  const adds = diff.adds.filter((a) => !basics.has(a.oracleId));
  const removes = diff.removes.filter((r) => !basics.has(r.oracleId));
  const names = new Map(facts.map((f) => [f.oracleId, f.name]));
  // The cost track the inline density draws beside each changed name. A card the
  // catalog gives no cost stays out of the map rather than entering it as a null,
  // so its track draws nothing.
  const costs = new Map(
    facts.filter((f) => f.manaCost !== null).map((f) => [f.oracleId, f.manaCost as string]),
  );

  // A basics-only edit: real, committable, and priceable by nothing. Every list
  // and every figure stays empty, and `basicsChanged` is the one signal that
  // says the draft differs — see `hasChanges`.
  if (adds.length === 0 && removes.length === 0) {
    return { ...empty, basicsChanged: basics.size > 0 };
  }

  // Scoped to the adds, and excluding this deck: the question is what OTHER
  // decks hold, which is the same question the commit asks.
  const availability = adds.length > 0
    ? await loadAvailability(userId, {
        oracleIds: adds.map((a) => a.oracleId), excludeDeckId: deckId,
      }).catch(() => null)
    : null;
  // A read that failed is not an empty claim model. `claimsKnown` carries the
  // difference, and a failed read leaves every add unbucketed rather than
  // answering "unowned" — which is what an empty claimant map would have said.
  const claimsKnown = availability !== null;
  const bucketed = availability
    ? bucketAdds(adds, new Map(
        [...availability].map(([oracleId, a]) => [
          oracleId,
          // hardDecks, not the raw claims: a brew "holding" a card holds nothing.
          { free: a.free, claims: hardDecks(a) },
        ]),
      ))
    : adds.map((c) => ({
        oracleId: c.oracleId, needed: c.to - c.from, shortfall: 0,
        bucket: null, heldBy: [],
      }));

  const unfree = bucketed.filter((a) => a.bucket !== "free" && a.bucket !== null);
  const priced = unfree.length > 0
    ? await loadPrices(unfree.map((a) => a.oracleId)).catch(() => null)
    : null;
  // `shortfall`, never `needed`: one free copy against an ask of three is a
  // purchase of two, and charging for three quotes a card already on the table.
  const summary = summarisePrices(
    unfree.map((a) => ({
      quantity: a.shortfall,
      price: priced?.prices.get(a.oracleId) ?? null,
    })),
    priced?.newestAsOf ?? null,
  );

  // Unfree adds only: a free add buys nothing and a remove buys nothing, so
  // neither carries a figure. A sold-out or unpriced card stays out of the map
  // rather than entering it as `$0.00`.
  const priceTags = new Map<string, string>();
  for (const add of unfree) {
    const fact = priced?.prices.get(add.oracleId);
    if (!fact) continue;
    const cents = priceOf(fact, priceState(fact, priced?.newestAsOf ?? null));
    if (cents !== null) priceTags.set(add.oracleId, formatCents(cents));
  }

  const cmcByOracle = new Map(facts.map((f) => [f.oracleId, f.cmc]));
  const typeByOracle = new Map(facts.map((f) => [f.oracleId, f.typeLine]));

  return {
    version,
    adds: bucketed,
    // Index-aligned with `bucketed` because `bucketAdds` maps `adds` one to one
    // and preserves its order — this is the list it was given.
    addChanges: adds,
    removes,
    basicsChanged: false,
    names,
    costs,
    prices: priceTags,
    claimsKnown,
    buyCount: unfree.reduce((n, a) => n + a.shortfall, 0),
    unfreeCount: unfree.length,
    pullableCount: bucketed.filter((a) =>
      a.bucket === "claimed" && releasableClaims(availability?.get(a.oracleId)).length > 0,
    ).length,
    // `pricedCopies`, not a positive total: the feed can stock a card at nothing,
    // and a real $0.00 is a price the player should see rather than a purchase
    // the app claims it cannot quote.
    total: summary.pricedCopies > 0 ? formatCents(summary.totalCents) : null,
    pricedCopies: summary.pricedCopies,
    manaValue: averageManaValue(draft.map((c) => ({
      cmc: cmcByOracle.get(c.oracleId) ?? 0,
      quantity: c.quantity,
      typeLine: typeByOracle.get(c.oracleId) ?? "",
    }))),
    manaValueBefore: await versionManaValue(version.id),
  };
}

/**
 * The holders a pull could actually be offered against.
 *
 * Both guards, and both of them the server's own: a deck with pending changes
 * would have them swept into a version nobody asked for, and no route releases a
 * commander. A control that can only fail is worse than no control.
 */
export function releasableClaims(a: Availability | undefined) {
  if (!a) return [];
  return hardDecks(a).filter((d) => !d.pending && !d.commander);
}
```

Note the `manaValue` gap this deliberately accepts: the draft's average is
computed from the changed cards' `cmc` only where the draft row is one of them,
so **the map must cover the whole draft**. Fix it in the same file by widening
the `facts` read to every draft oracle id rather than only the changed ones:
`inArray(cards.oracleId, [...new Set([...changed, ...draft.map((c) => c.oracleId)])])`.

- [ ] **Step 2: Add the review page's rows to the same module**

Append:

```ts
/** One changed card, as the review page draws it. `DeckDetailCard` shaped, so
 *  the row reuses the shipped ownership dot, availability marker, buy tag and
 *  cost pips without a second card type in the codebase. */
export type DraftRow = DeckDetailCard & {
  /** Where the card is going. */
  direction: "in" | "out";
  /** The draft's count before and after, for `recountedItem`. Equal counts are
   *  impossible: `draftDiff` files a change only when they differ. */
  from: number;
  to: number;
  /** Which of the three answers this add got. Null on an `out` row: a card
   *  leaving makes no purchase decision. */
  bucket: BucketedAdd["bucket"] | null;
};

/** Split at the source, not in the component. The review page draws two columns
 *  and every consumer would otherwise filter on `direction` itself — which is
 *  one `in`/`out` split per surface and a chance for two of them to disagree. */
export type DraftRows = {
  state: DraftState;
  rows: { in: DraftRow[]; out: DraftRow[] };
};

/** The `from`/`to` pair behind an add. `BucketedAdd` carries `needed` and
 *  `shortfall` but not the pair, so read it off `addChanges` — the raw diff
 *  `bucketAdds` was given — rather than recomputing the diff. An oracle id that
 *  is not an add has no pair, and `0 → 0` is the honest answer for a caller
 *  that asked the wrong question. */
function findChange(state: DraftState, oracleId: string): { from: number; to: number } {
  const change = state.addChanges.find((c) => c.oracleId === oracleId);
  return { from: change?.from ?? 0, to: change?.to ?? 0 };
}

/**
 * Every changed card with the facts a row draws.
 *
 * Read from `cards` directly rather than through `getDeckDetail`: a removed card
 * is not in `deck_cards` any more, so the deck's own decklist cannot describe
 * it. `quantity` on each row is the DELTA, which is what the row's figure means
 * — `3 → 1` is one row that lost two copies, never a row for two copies.
 */
export async function loadDraftRows(deckId: string, userId: string): Promise<DraftRows> {
  const state = await loadDraftState(deckId, userId);
  const changed = [...state.adds, ...state.removes].map((c) => c.oracleId);
  if (changed.length === 0) return { state, rows: { in: [], out: [] } };

  const facts = await db.select({
    oracleId: cards.oracleId,
    name: cards.name,
    typeLine: cards.typeLine,
    oracleText: cards.oracleText,
    keywords: cards.keywords,
    manaCost: cards.manaCost,
    cmc: cards.cmc,
    imageUri: cards.imageUri,
    layout: cards.layout,
  }).from(cards).where(inArray(cards.oracleId, changed));

  const availability = await loadAvailability(userId, {
    oracleIds: changed, excludeDeckId: deckId,
  }).catch(() => null);
  const priced = await loadPrices(changed).catch(() => null);

  const built: DraftRow[] = [];
  for (const fact of facts) {
    const add = state.adds.find((a) => a.oracleId === fact.oracleId);
    const remove = state.removes.find((r) => r.oracleId === fact.oracleId);
    const change = add
      ? findChange(state, fact.oracleId)
      : { from: remove!.from, to: remove!.to };
    built.push({
      oracleId: fact.oracleId,
      name: fact.name,
      typeLine: fact.typeLine,
      cardTypeGroup: cardTypeGroup(fact.typeLine),
      role: primaryRole(fact),
      cmc: fact.cmc,
      // Whether the player has a copy at all, which is what the dot draws. The
      // availability map is driven by the collection, so absence is the answer.
      owned: availability?.has(fact.oracleId) ?? false,
      quantity: Math.abs(change.to - change.from),
      auto: false,
      availability: availability?.get(fact.oracleId) ?? null,
      price: priced?.prices.get(fact.oracleId) ?? null,
      manaCost: fact.manaCost,
      imageUri: fact.imageUri,
      // Null, both of them, and deliberately: a changed-card row names the card
      // the deck is gaining or losing, and there is no owned printing to resolve
      // for a card being bought. The shipped `printedNameOf` reads null as "use
      // the oracle name", which is the right rendering here.
      printedName: null,
      printedSetCode: null,
      printedCollectorNumber: null,
      layout: fact.layout,
      direction: add ? "in" : "out",
      from: change.from,
      to: change.to,
      bucket: add ? add.bucket : null,
    });
  }
  return {
    state,
    rows: {
      in: built.filter((r) => r.direction === "in"),
      out: built.filter((r) => r.direction === "out"),
    },
  };
}
```

`findChange` is defined above, beside `DraftRows`: it reads the pair off
`state.addChanges`, which `loadDraftState` populates with the same filtered diff
`bucketAdds` consumed. Nothing recomputes the diff, and no surface needs a
`DraftDiff` of its own.

- [ ] **Step 3: Test the two pure functions**

The loaders need a database and are proved by the probe below, but `changeCount`
and `hasChanges` are pure and one of them decides whether a real edit has any
route to a commit at all. Create `src/lib/decks/draft-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { changeCount, hasChanges, type DraftState } from "./draft-state";

const state = (over: Partial<DraftState> = {}): DraftState => ({
  version: null, adds: [], addChanges: [], removes: [], basicsChanged: false,
  names: new Map(), costs: new Map(), prices: new Map(), claimsKnown: true,
  buyCount: 0, unfreeCount: 0, pullableCount: 0, total: null, pricedCopies: 0,
  manaValue: null, manaValueBefore: null, ...over,
});

describe("changeCount / hasChanges", () => {
  it("counts adds and removes together", () => {
    expect(changeCount(state({
      adds: [{ oracleId: "a", needed: 1, shortfall: 1, bucket: "unowned", heldBy: [] }],
      removes: [{ oracleId: "r", quantity: 1, from: 1, to: 0 }],
    }))).toBe(2);
  });

  it("counts a basics-only edit in no figure", () => {
    expect(changeCount(state({ basicsChanged: true }))).toBe(0);
  });

  it("still calls a basics-only edit a change — it has to be committable", () => {
    expect(hasChanges(state({ basicsChanged: true }))).toBe(true);
  });

  it("calls an untouched draft unchanged", () => {
    expect(hasChanges(state())).toBe(false);
  });
});
```

Run: `pnpm vitest run src/lib/decks/draft-state.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 4: Verify against the real database**

The loaders are raw reads over the claim model, which no unit test in this
repository reaches, so their proof is the probe plus a browse of the surfaces in
Tasks 14 onward. Run the claim probe to confirm nothing in it regressed:

Run: `DATABASE_URL=<local-dev> pnpm probe:claims`
Expected: PASS.

- [ ] **Step 5: Run the suite**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/decks/draft-state.ts src/lib/decks/draft-state.test.ts
git commit -m "feat(decks): one reader for what the draft changed and what it costs"
```

---

### Task 14: Surface 1 — the pending state on the deck page

**Files:**
- Create: `src/components/decks/pending-banner.tsx`
- Create: `src/components/decks/pending-banner.test.tsx`
- Create: `src/components/decks/pending-add.tsx`
- Modify: `src/components/decks/decklist-row.tsx:197-199` (the `rowEdges` array)
- Modify: `src/components/decks/decklist.tsx:188` and the All branch's `groups.map`
- Modify: `src/components/decks/builder-shell.tsx` (mount the banner; pass the
  pending set into the decklist's provider)
- Modify: `src/app/decks/[id]/page.tsx` (call `loadDraftState`, pass it down)
- Test: `src/components/decks/pending-banner.test.tsx`

**Interfaces:**
- Consumes: `DraftState`, `changeCount`, `loadDraftState` (Task 13);
  `deckVersioningCopy.pending`, `INLINE_CHANGE_MAX` (Task 12);
  `deckBodySize` (`src/lib/decks/deck-size.ts:7`).
- Produces: `PendingBanner({ state, deckId, total, bodySize, onReview })`;
  `PendingAddProvider({ value, children })` and `usePendingAdd(): PendingAdd | null`
  where `PendingAdd = { oracleIds: Set<string>; label: string }`.

The banner is the whole of surface 1's chrome. It is **not dismissible** — a
draft is a state the deck is in, not news about it — which is the one way it
differs from `UpdateStrip` above it in the stack.

- [ ] **Step 1: Write the failing test**

Create `src/components/decks/pending-banner.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DraftState } from "../../lib/decks/draft-state";
import { PendingBanner } from "./pending-banner";

const empty: DraftState = {
  // Every field of `DeckVersion`, not only the four the banner prints: the
  // fixture is typed, so a partial literal does not compile.
  version: {
    id: "v",
    number: 2,
    committedAt: new Date("2026-09-01T00:00:00Z"),
    note: null,
    commanderOracleId: "cmd",
    partnerOracleId: null,
    commanderSince: new Date("2026-08-01T00:00:00Z"),
    partnerSince: null,
  },
  adds: [], addChanges: [], removes: [], basicsChanged: false, names: new Map(),
  costs: new Map(), prices: new Map(), claimsKnown: true,
  buyCount: 0, unfreeCount: 0, pullableCount: 0, total: null, pricedCopies: 0,
  manaValue: 3.1, manaValueBefore: 3.4,
};

const withChanges = (adds: number, removes: number): DraftState => ({
  ...empty,
  adds: Array.from({ length: adds }, (_, i) => ({
    oracleId: `a${i}`, needed: 1, shortfall: 1, bucket: "unowned" as const, heldBy: [],
  })),
  addChanges: Array.from({ length: adds }, (_, i) => ({
    oracleId: `a${i}`, quantity: 1, from: 0, to: 1,
  })),
  removes: Array.from({ length: removes }, (_, i) => ({
    oracleId: `r${i}`, quantity: 1, from: 1, to: 0,
  })),
  names: new Map(
    [...Array.from({ length: adds }, (_, i) => [`a${i}`, `Add ${i}`] as const),
     ...Array.from({ length: removes }, (_, i) => [`r${i}`, `Cut ${i}`] as const)],
  ),
  buyCount: adds, unfreeCount: adds, pullableCount: 0,
  total: adds > 0 ? "$12.00" : null,
  // Fully covered, so the money line prints the figure alone. A fixture leaving
  // this at 0 beside a real total describes partial coverage and draws the
  // `pricedClause` every assertion below would then have to carry.
  pricedCopies: adds,
});

describe("PendingBanner", () => {
  it("is absent on a clean committed deck — the version line is all that remains", () => {
    render(<PendingBanner state={empty} deckId="d" total={99} bodySize={99} />);
    expect(screen.queryByText(deckVersioningCopy.pending.label)).toBeNull();
    expect(
      screen.getByText(deckVersioningCopy.pending.versionLine(2, "1 Sep 2026")),
    ).toBeTruthy();
  });

  it("names the changes at or below INLINE_CHANGE_MAX and links to the review page", () => {
    render(<PendingBanner state={withChanges(2, 1)} deckId="d" total={99} bodySize={99} />);
    expect(screen.getByText("Add 0")).toBeTruthy();
    expect(screen.getByText("Cut 0")).toBeTruthy();
    // A link, not a button: the sheet is on the review page and the banner
    // navigates to it with `?commit=1`. One commit surface, two entry points.
    expect(
      screen.getByRole("link", { name: deckVersioningCopy.pending.commitCta(3) }),
    ).toHaveProperty("href", expect.stringContaining("/decks/d/changes?commit=1"));
    expect(
      screen.getByRole("link", { name: deckVersioningCopy.pending.reviewLink }),
    ).toBeTruthy();
  });

  it("states counts and one money sentence above INLINE_CHANGE_MAX", () => {
    render(<PendingBanner state={withChanges(19, 17)} deckId="d" total={99} bodySize={99} />);
    expect(screen.queryByText("Add 0")).toBeNull();
    expect(screen.getByText(deckVersioningCopy.pending.counts(19, 17))).toBeTruthy();
    expect(
      screen.getByText(deckVersioningCopy.pending.money(19, 19, "$12.00")),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: deckVersioningCopy.pending.reviewCta(36) }),
    ).toBeTruthy();
  });

  it("offers Commit as v1 on a versionless deck that has reached a full body", () => {
    render(
      <PendingBanner state={{ ...empty, version: null }} deckId="d" total={99} bodySize={99} />,
    );
    expect(
      screen.getByRole("link", { name: deckVersioningCopy.pending.firstCommitCta }),
    ).toBeTruthy();
  });

  it("says nothing at all on a versionless deck that is still short", () => {
    const { container } = render(
      <PendingBanner state={{ ...empty, version: null }} deckId="d" total={41} bodySize={99} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("prints the body count in --warning when the draft is over, and blocks nothing", () => {
    render(<PendingBanner state={withChanges(3, 0)} deckId="d" total={101} bodySize={99} />);
    expect(screen.getByText("101 / 99")).toBeTruthy();
    // Still offered, and still a live link: an over-size draft is something the
    // player is mid-way through fixing, and refusing the commit strands them.
    expect(
      screen.getByRole("link", { name: deckVersioningCopy.pending.commitCta(3) }),
    ).toBeTruthy();
  });

  it("prints the from → to pair on a quantity move, not a bare name", () => {
    const state = withChanges(1, 0);
    state.addChanges[0] = { oracleId: "a0", quantity: 1, from: 1, to: 2 };
    render(<PendingBanner state={state} deckId="d" total={99} bodySize={99} />);
    expect(
      screen.getByText(
        deckImportCopy.update.diff.recountedItem("Add 0", "1", "2"),
      ),
    ).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to watch it fail**

Run: `pnpm vitest run src/components/decks/pending-banner.test.tsx`
Expected: FAIL — `Failed to resolve import "./pending-banner"`.

- [ ] **Step 3: Write the banner**

Create `src/components/decks/pending-banner.tsx`. Four states in one component,
because they are four readings of the same fact and the spine has no other slot
for the first-commit offer:

```tsx
"use client";

// Surface 1 — pending changes on the deck page. Not dismissible: a draft is a
// state the deck is in, which is why this is a sibling of UpdateStrip rather
// than a mode of it.

import Link from "next/link";
import type { ReactNode } from "react";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy, INLINE_CHANGE_MAX } from "../../lib/copy/deck-versioning";
import { priceCopy } from "../../lib/copy/price";
import type { DraftChange } from "../../lib/decks/draft-diff";
import { changeCount, type DraftState } from "../../lib/decks/draft-state";
import { formatDeckDate } from "../../lib/decks/format";

const copy = deckVersioningCopy.pending;

interface PendingBannerProps {
  state: DraftState;
  deckId: string;
  /** The draft's card count — `detail.total`, already on the page. */
  total: number;
  /** `deckBodySize(detail.partner !== null)`, computed by the page. */
  bodySize: number;
  onDiscard?: () => void;
}

// §Surfaces 5: "one commit surface, two entry points" — the sheet lives at the
// foot of the review page and the banner's CTA *navigates* to it with the sheet
// already open. So there is no `onCommit`: a second mount would be a second
// place the buy list is printed, which is the thing that ruling forbids.
const commitHref = (deckId: string) => `/decks/${deckId}/changes?commit=1`;

/**
 * What the inline list calls one change.
 *
 * A card the deck did not hold, or has cut entirely, is its name. A card whose
 * count *moved* is `Name 1 → 2` — the shipped `recountedItem`, because "+ Sol
 * Ring" on a deck that already ran one is a sentence that reads as a duplicate
 * rather than a second copy. Nothing new is authored for a fact the import diff
 * already has a string for.
 */
function changeLabel(state: DraftState, change: DraftChange): string {
  const name = state.names.get(change.oracleId) ?? change.oracleId;
  const moved = change.from > 0 && change.to > 0;
  return moved
    ? deckImportCopy.update.diff.recountedItem(name, String(change.from), String(change.to))
    : name;
}

// The figure is a `<span>` inside the sentence, so the sentence is authored with a
// placeholder and split on it rather than concatenated out of fragments here.
const MONEY_SLOT = "\u0000";
const MONEY_FIGURE = "font-mono text-[12px] md:text-[12.5px] text-[color:var(--warning)]";

/**
 * The money sentence, or null — the three states the comment at the call site
 * describes. `claimsKnown` false and a null total are both reads that did not
 * finish, and neither may be rendered as an answer.
 */
function moneyLine(state: DraftState): ReactNode | null {
  if (!state.claimsKnown) return null;
  if (state.unfreeCount === 0) return copy.moneyNone;
  if (state.total === null) return null;
  const partial = state.pricedCopies < state.buyCount;
  const total = partial
    ? `${state.total} · ${priceCopy.strip.pricedClause(state.pricedCopies, state.buyCount)}`
    : state.total;
  const [head, tail] = copy
    .money(state.unfreeCount, state.addChanges.length, state.buyCount, MONEY_SLOT)
    .split(MONEY_SLOT);
  return (
    <>
      {head}
      <span className={MONEY_FIGURE}>{total}</span>
      {tail}
    </>
  );
}

export function PendingBanner({
  state, deckId, total, bodySize, onDiscard,
}: PendingBannerProps) {
  const n = changeCount(state);
  const next = (state.version?.number ?? 0) + 1;

  // A brew: nothing to say until the list is a deck, and then only the offer.
  if (state.version === null) {
    if (total < bodySize) return null;
    return (
      <div className={STRIP}>
        <p className="flex-1 m-0 text-[13.5px] text-[color:var(--fg-body)]">
          {copy.firstCommitNote}
        </p>
        {/* Outline, not solid: making a deck's claims hard is a real
            consequence and not the app's goal for the player. */}
        <Link href={commitHref(deckId)} className={OUTLINE_CTA}>
          {copy.firstCommitCta}
        </Link>
      </div>
    );
  }

  // Committed and clean: one line, and it is the whole permanent footprint.
  if (n === 0) {
    return (
      <div className={STRIP}>
        <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">
          {copy.versionLine(state.version.number, formatDeckDate(state.version.committedAt))}
        </span>
      </div>
    );
  }

  const inline = n <= INLINE_CHANGE_MAX;

  return (
    <div className={STRIP}>
      <span className="font-mono uppercase text-[9px] md:text-[10px] tracking-[0.12em] text-[color:var(--accent)]">
        {copy.label}
      </span>

      <div className="flex-1 min-w-0">
        {inline ? (
          <ul className="m-0 p-0 list-none flex flex-wrap gap-x-[14px] gap-y-[2px]">
            {state.addChanges.map((c) => (
              <li key={c.oracleId} className="text-[13px] text-[color:var(--fg-body)]">
                + {changeLabel(state, c)}
              </li>
            ))}
            {state.removes.map((c) => (
              <li key={c.oracleId} className="text-[13px] text-[color:var(--fg-faint)]">
                − {changeLabel(state, c)}{" "}
                <span className="font-mono text-[10.5px]">{copy.removeHint}</span>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p className="m-0 font-mono text-[12px] text-[color:var(--fg-body)]">
              {copy.counts(state.addChanges.length, state.removes.length)}
              {" · "}
              {copy.since(n, state.version.number)}
            </p>
            {/* Exactly one money sentence, or none. The pull clause is a second
                line only because it is a different offer, not a second total.

                Three states, and only two of them speak — `moneyLine` returns
                null for the third. `moneyNone` claims every card coming in has a
                free copy, so it takes a claim read that actually happened
                (`claimsKnown`) and a genuine zero; a failed read leaves
                `unfreeCount` at 0 and would otherwise say the commit is free.
                When rows are unfree but nothing could be priced there IS a
                purchase and no figure for it, so the banner states neither and
                the review page one click away names the rows. A total over
                partial coverage carries the shipped `pricedClause`, and `money`
                takes `buyCount` beside the row count. */}
            <p className="m-0 text-[13px] text-[color:var(--fg-faint)]">
              {moneyLine(state)}
              {state.pullableCount > 0 && ` ${copy.moneyPulls(state.pullableCount)}`}
            </p>
          </>
        )}
      </div>

      {/* The body count is stated, never enforced: an over-size draft is a
          thing the player is mid-way through fixing, and refusing the commit
          would strand them in it. --warning, and no disabled control. */}
      <span
        className="font-mono text-[11px] tabular-nums flex-none"
        style={{ color: total > bodySize ? "var(--warning)" : "var(--fg-faint)" }}
      >
        {total} / {bodySize}
      </span>

      {inline ? (
        <Link href={`/decks/${deckId}/changes`} className={REVIEW_LINK}>
          {copy.reviewLink}
        </Link>
      ) : (
        <Link href={`/decks/${deckId}/changes`} className={SOLID_CTA}>
          {copy.reviewCta(n)}
        </Link>
      )}
      {inline && (
        <Link href={commitHref(deckId)} className={SOLID_CTA}>
          {copy.commitCta(next)}
        </Link>
      )}
      <button type="button" onClick={onDiscard} className={GHOST_CTA}>
        {copy.discardCta}
      </button>
    </div>
  );
}

const STRIP =
  "flex flex-wrap md:flex-nowrap items-center gap-[10px] md:gap-[12px] " +
  "px-[16px] py-[10px] md:px-[30px] md:py-[12px] bg-[color:var(--surface-rail)] " +
  "[border-bottom:1px_solid_var(--border)]";
// Brass fill on the act, outline on the first-commit offer: v1 changes nothing
// about the deck, so it does not get the weight of a decision.
const SOLID_CTA =
  "flex-none inline-flex items-center min-h-[44px] md:min-h-[30px] px-[14px] rounded-[7px] " +
  "font-mono text-[12px] text-[color:var(--bg)] bg-[color:var(--accent)] border-0 cursor-pointer no-underline";
const OUTLINE_CTA =
  "flex-none inline-flex items-center min-h-[44px] md:min-h-[30px] px-[14px] rounded-[7px] " +
  "font-mono text-[12px] text-[color:var(--accent)] bg-transparent border border-[color:var(--accent)] cursor-pointer";
const GHOST_CTA =
  "flex-none inline-flex items-center min-h-[44px] md:min-h-[30px] px-[12px] rounded-[7px] " +
  "font-mono text-[12px] text-[color:var(--fg-body)] bg-transparent border border-border-strong cursor-pointer";
const REVIEW_LINK =
  "flex-none font-mono text-[11.5px] text-[color:var(--accent)] underline";
```

Check `formatDeckDate`'s real name in `src/lib/decks/format.ts` before writing
that import; use whichever helper that module already exports for a committed
date, and do not add a second date formatter.

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run src/components/decks/pending-banner.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: The row mark**

Create `src/components/decks/pending-add.tsx`, copying `pass-mark.tsx`'s context
shape verbatim — same reason, five call sites behind three intermediate
components:

```tsx
"use client";

import { createContext, useContext } from "react";

export type PendingAdd = { oracleIds: Set<string>; label: string };

const PendingAddContext = createContext<PendingAdd | null>(null);

export function PendingAddProvider(
  { value, children }: { value: PendingAdd; children: React.ReactNode },
) {
  return <PendingAddContext.Provider value={value}>{children}</PendingAddContext.Provider>;
}

/** Null outside a provider, which is every deck with no draft. */
export function usePendingAdd(): PendingAdd | null {
  return useContext(PendingAddContext);
}
```

In `decklist-row.tsx`, read it beside the pass mark and push a **2px** edge —
the Component notes table's width, which overrides §Surfaces' 3px prose:

```tsx
const pendingAdd = usePendingAdd();
const isPendingAdd = pendingAdd?.oracleIds.has(card.oracleId) ?? false;
// ...
if (isPendingAdd) rowEdges.push("inset 2px 0 0 0 var(--accent)");
```

No padding absorption: `rowEdges` are inset box shadows, so they displace
nothing. Add the word to the row's accessible name rather than a visual chip —
`copy.addMarkA11y` is never rendered:

```tsx
aria-describedby={isPendingAdd ? pendingDescriptionId : undefined}
```

with a `useId`-scoped `<span className="sr-only">` holding `copy.addMarkA11y`,
so two decklists on one page cannot share an id.

- [ ] **Step 6: The three list-side notes**

In `decklist.tsx`, above the All branch's `groups.map`, one caption for the
whole list rather than one note per row:

```tsx
{pendingAdds.size > 0 && (
  <p className="m-0 mb-[8px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">
    {deckVersioningCopy.pending.addListCaption(pendingAdds.size)}
  </p>
)}
```

Pass `note={deckVersioningCopy.pending.groupAddNote(addedInGroup)}` to each
`DecklistGroup` whose cards intersect the pending set — the `note` prop already
exists on both `DecklistGroup` and `DecklistGroupHeader`, so no new prop is
needed — and omit it at zero rather than printing `0 added in this draft`.
Replace the toolbar's right-slot kept note with `copy.toolbarNote(n, version)`
only while a draft exists; the kept note returns when it does not.

- [ ] **Step 7: `was n` in the mix cells**

`RoleCounterCell` gains one optional prop:

```tsx
  /** The figure this role held in the newest committed version, when a draft
   *  has moved it. Replaces the recommendation line in the cell's bottom-left
   *  slot — and only when the figure actually moved, because "was 10" beside a
   *  10 is a sentence that says nothing. */
  was?: number;
```

Rendered as `deckVersioningCopy.pending.mixCellWas(was)` in the slot the
advisory line occupies. `RoleCounterStrip` takes `wasCounts?: Record<MixRole, number>`
and passes `wasCounts?.[role] !== counts[role] ? wasCounts?.[role] : undefined`.
The page derives `wasCounts` by running the shipped `computeRoleCounts` over the
version's cards — the same fold, or the two strips disagree one scroll apart.

- [ ] **Step 8: Wire the page**

In `src/app/decks/[id]/page.tsx`, add `loadDraftState(id, userId)` to the second
`Promise.all` and pass `draft` into `BuilderShell`. In `builder-shell.tsx` mount
`<PendingBanner …>` between `UpdateStrip` and `UnresolvedBanner`, and wrap the
decklist's subtree in `PendingAddProvider` with the add oracle ids.

- [ ] **Step 9: The gate**

Run: `pnpm typecheck && pnpm lint && pnpm vitest run src/components/decks`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/components/decks/pending-banner.tsx src/components/decks/pending-banner.test.tsx \
  src/components/decks/pending-add.tsx src/components/decks/decklist-row.tsx \
  src/components/decks/decklist.tsx src/components/decks/decklist-group.tsx \
  src/components/decks/role-counter-strip.tsx src/components/decks/role-counter-cell.tsx \
  src/components/decks/builder-shell.tsx "src/app/decks/[id]/page.tsx"
git commit -m "feat(decks): the pending-changes banner, and the marks that map it onto the list"
```

---

### Task 15: Surface 2 — the review page

**Files:**
- Create: `src/app/decks/[id]/changes/page.tsx`
- Create: `src/components/decks/review-changes.tsx`
- Create: `src/components/decks/review-changes.test.tsx`
- Modify: `src/components/decks/update-diff-row.tsx` (the shared row gains an
  action slot and loses its per-row type label)
- Modify: `src/components/decks/update-diff.tsx` (groups by card type, which is
  what pays for dropping the label)
- Modify: `src/components/decks/update-diff.test.tsx`
- Test: `src/components/decks/review-changes.test.tsx`

**Interfaces:**
- Consumes: `loadDraftRows`, `DraftRow`, `DraftRows` (Task 13);
  `deckVersioningCopy.review` (Task 12); `DiffRowIn` / `DiffRowOut` /
  `DiffRowCard` (`src/components/decks/update-diff-row.tsx`).
- Produces: `ReviewChanges({ deckId, rows, state, commitOpen })`; `DiffRowOut`'s
  widened signature, `{ card, action }`, which Task 17 fills with `PullControl`.

**There is no new diff row.** `OVERLAPS.md` Call 2's first consequence is
explicit — *"Review changes reuses `update-diff-row`, its group headers and its
count chips verbatim. No new diff row atom exists in this feature"* — and its
mechanical checks 1 and 5 are the test of it: one definition of
`update-diff-row`, both surfaces importing it, and **neither** rendering a
per-row type label. A `review-row.tsx` would fail both.

Two equal columns, `flex: 1` each, gap 22px, `max-width: 1180px`, padding
`24px 26px`. Type-grouped on both sides, alphabetical within a group — which
`groupByCardType` already does, so the grouping is a reuse, not a re-sort.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { ReviewChanges } from "./review-changes";

const row = (over: Partial<Parameters<typeof ReviewChanges>[0]["rows"]["in"][number]> = {}) => ({
  oracleId: "o1", name: "Sol Ring", typeLine: "Artifact", cardTypeGroup: "Artifacts",
  role: "ramp" as const, owned: true, quantity: 1, auto: false,
  printedName: null, printedSetCode: null, printedCollectorNumber: null,
  cmc: 1, direction: "in" as const, from: 0, to: 1, bucket: "free" as const, ...over,
});

describe("ReviewChanges", () => {
  it("groups both columns by card type and heads each with its count", () => {
    render(
      <ReviewChanges
        deckId="d"
        rows={{ in: [row()], out: [row({ oracleId: "o2", name: "Mox", direction: "out", from: 1, to: 0 })] }}
        state={STATE}
      />,
    );
    expect(screen.getByText(deckVersioningCopy.review.groupIn(1))).toBeTruthy();
    expect(screen.getByText(deckVersioningCopy.review.groupOut(1))).toBeTruthy();
  });

  it("files a quantity move as one row carrying from → to, never a bare name", () => {
    render(
      <ReviewChanges deckId="d" rows={{ in: [row({ from: 1, to: 2 })], out: [] }} state={STATE} />,
    );
    expect(screen.getByText(/1 → 2/)).toBeTruthy();
  });

  it("puts the availability word in the accessible name, not only in colour", () => {
    render(
      <ReviewChanges
        deckId="d"
        rows={{ in: [row({ bucket: "unowned" })], out: [] }}
        state={STATE}
      />,
    );
    expect(screen.getByRole("button", { name: /Sol Ring/ }).getAttribute("aria-describedby"))
      .toBeTruthy();
  });

  it("states the out column's rule once, and offers no per-row toggle", () => {
    render(
      <ReviewChanges
        deckId="d"
        rows={{ in: [], out: [row({ direction: "out", from: 1, to: 0 })] }}
        state={STATE}
      />,
    );
    expect(screen.getByText(deckVersioningCopy.review.outNote(1))).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Keep/ })).toBeNull();
  });
});
```

`STATE` is the `DraftState` fixture from Task 14's test, exported from a shared
`__fixtures__/draft-state.ts` so the two suites cannot drift.

- [ ] **Step 2: Run it to watch it fail**

Run: `pnpm vitest run src/components/decks/review-changes.test.tsx`
Expected: FAIL — `Failed to resolve import "./review-changes"`.

- [ ] **Step 3: Write the columns**

`review-changes.tsx`, client component (the rows open the card modal):

```tsx
const copy = deckVersioningCopy.review;

export function ReviewChanges({ deckId, rows, state, commitOpen }: ReviewChangesProps) {
  const inGroups = groupByCardType(rows.in);
  const outGroups = groupByCardType(rows.out);
  const siblings = [...rows.in, ...rows.out].map((r) => r.oracleId);
  // Task 18 mounts `CommitSheet` at the foot and seeds its expanded state from
  // this flag. Empty columns are drawn as nothing at all rather than as an empty
  // state: the only way to arrive with none is `?commit=1`, where the sheet is
  // the page and a "no changes" panel above it would contradict it.
  const hasRows = rows.in.length + rows.out.length > 0;

  return (
    <div className="mx-auto" style={{ maxWidth: 1180, padding: "24px 26px" }}>
      <h1 className="font-display text-[22px] m-0">
        {copy.heading(rows.in.length + rows.out.length, state.version?.number ?? 1)}
      </h1>
      <p className="mt-[6px] mb-[18px] text-[13.5px] text-[color:var(--fg-faint)]">
        {copy.lede((state.version?.number ?? 0) + 1)}
      </p>

      {/* Phone: a segmented pair, because two 190px columns put every card name
          on three lines. Desktop: two equal columns, gap 22px. */}
      {hasRows && (
        <>
          <div className="hidden md:flex gap-[22px]">
            <Column heading={copy.groupIn(rows.in.length)} groups={inGroups} … />
            <Column heading={copy.groupOut(rows.out.length)} groups={outGroups} … />
          </div>
          <Segmented className="md:hidden" … />
        </>
      )}
    </div>
  );
}
```

The in column heads its own breakdown with
`copy.groupInBreakdown(free, sleeved, buy)` counted off `state.adds`' buckets,
and the out column prints `copy.outNote(rows.out.length)` once under its
heading. No `Keep` control on a remove: putting one back is adding it to the
deck, and the deck page already does that.

- [ ] **Step 4: Widen the shared row, and take its type label off both mountings**

Two edits to `update-diff-row.tsx`, and they are the whole of the row work.

**4a — `DiffRowOut` takes an action slot instead of owning the Keep button.**
The update flow keeps that button; the review page puts `PullControl` in the same
place (Task 17). `kept` survives as a plate-and-seam flag because the update
flow's kept row is tinted, and the review page never sets it.

```tsx
export function DiffRowOut({
  card,
  kept = false,
  /** Whatever this mounting's decision is. The update flow passes its `Keep`
   *  toggle; the review page passes `PullControl`; `null` renders no control and
   *  no reserved box, because a row with nothing to decide should not hold a gap
   *  where a button would be. */
  action = null,
}: {
  card: DiffRowCard;
  kept?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className={/* unchanged */}>
      <OwnershipDot owned={card.owned} size={7} />
      <DiffRowName oracleId={card.oracleId} name={card.name} tone="var(--fg)" />
      <Marker auto={card.auto} />
      <AvailabilitySlot card={card} seam={kept ? SEAM_KEPT : SEAM_SURFACE} selfClaimed />
      {action}
    </div>
  );
}
```

`update-diff.tsx`'s existing mount (line 257) moves its `kept` / `onToggle` pair
into the slot, and the button's markup moves with it — unchanged ink, unchanged
`aria-pressed`, unchanged `copy.keepAria`. Nothing about the update flow's
decision changes; only where the element is written down does.

**4b — the per-row `typeLine` span comes out of `DiffRowOut`, `DiffRowIn` and
`DiffRowUnchanged`, and `update-diff.tsx` groups by card type in its place.**
`groupByCardType` is what both mountings call, so the fact the label carried is
now a heading over the rows that share it, said once instead of per row.
`DiffRowCard.typeLine` stays on the type — it is what the grouping reads — and
stops being drawn. `DiffRowUnnamed` is untouched: an unmatched line has no type
to group under.

This is a change to a **shipped** surface, and it is deliberate. Mechanical check
5 — *"Both mountings group by type and neither renders a per-row type label. If
one of them still does, the row has forked"* — cannot be satisfied by touching
only the new page. It is also what funds the cost track: the freed 120px is
`COST-TRACK.md`'s, and that round is not gated on this one.

Add to `update-diff.test.tsx`:

```tsx
it("heads the out group by card type rather than labelling every row", () => {
  render(<UpdateDiff {...props({ out: [artifact("Sol Ring"), artifact("Mox Opal")] })} />);
  expect(screen.getAllByText("Artifact")).toHaveLength(1);
});
```

The review page's own rows then need no new code: `ReviewChanges` maps each
`DraftRow` to a `DiffRowCard` and mounts `DiffRowIn` / `DiffRowOut`. Two things
come with that reuse for free, and both were reasons the fork looked attractive —
`AvailabilitySlot` already renders `BuyTag variant="row"`, whose `density`
defaults to `"full"` (`buy-tag.tsx:168`), which is the purchase-decision surface's
tag; and the row's name is already a `CardDetailTrigger`. What `ReviewChanges`
adds around them: a quantity move's label via
`deckImportCopy.update.diff.recountedItem(name, String(from), String(to))` — the
shipped string, no second phrasing for the same fact — and an `sr-only`
description carrying the bucket's word, wired with `aria-describedby`, so
availability is never colour-only.

- [ ] **Step 5: Write the route**

`src/app/decks/[id]/changes/page.tsx`, a server component:

```tsx
export default async function ChangesPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ commit?: string }>;
}) {
  const { id } = await params;
  const { commit } = await searchParams;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  // The ownership guard every deck route carries. `loadDraftRows` takes a
  // `userId` to scope availability, NOT to prove the deck is this reader's —
  // without this line any signed-in account could read another player's draft
  // by id. Same two lines as `src/app/decks/[id]/page.tsx`.
  const detail = await getDeckDetail(id, userId);
  if (!detail) notFound();

  // One read, not two: `loadDraftRows` calls `loadDraftState` itself and returns
  // it on `state`. Asking for both in a `Promise.all` runs the whole diff,
  // availability and price chain twice for one page.
  const { state, rows } = await loadDraftRows(id, userId);
  // `?commit=1` is the banner's CTA arriving — §Surfaces 5's second entry point
  // into the one commit surface. It is the one case with a reason to be here
  // with nothing in the columns: a brew's first commit changes no card, and a
  // basics-only draft has no nameable row. Both still have a version to cut.
  const wantsCommit = commit === "1";
  // Otherwise a committed or discarded draft leaves this page with nothing to
  // review, and a bare empty state would read as a bug. The deck page is where
  // the version line now is, so that is where the reader goes.
  if (changeCount(state) === 0 && !wantsCommit) redirect(`/decks/${id}`);
  return <ReviewChanges deckId={id} rows={rows} state={state} commitOpen={wantsCommit} />;
}
```

Imports: `auth` from `@clerk/nextjs/server`, `notFound` and `redirect` from
`next/navigation`, `getDeckDetail` from `../../../../lib/decks/read`.

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run src/components/decks/review-changes.test.tsx src/components/decks/update-diff.test.tsx && pnpm typecheck`
Expected: PASS. Both suites, because Step 4 edited the row the shipped flow mounts.

- [ ] **Step 7: Commit**

```bash
git add "src/app/decks/[id]/changes/page.tsx" src/components/decks/review-changes.tsx \
  src/components/decks/review-changes.test.tsx src/components/decks/update-diff-row.tsx \
  src/components/decks/update-diff.tsx src/components/decks/update-diff.test.tsx
git commit -m "feat(decks): the review page — what comes in, what goes out, what it costs"
```

---

### Task 16: The what-changed strip

**Files:**
- Create: `src/components/decks/changed-strip.tsx`
- Create: `src/components/decks/changed-strip.test.tsx`
- Modify: `src/lib/decks/draft-state.ts` (append `loadVersionShape`, `ShapeCard`)
- Modify: `src/components/decks/review-changes.tsx` (mount it under the lede;
  `ReviewChanges` gains `before: ShapeCard[]` and `after: ShapeCard[]` and passes
  them straight through — the strip's two lists are the route's to read)
- Modify: `src/app/decks/[id]/changes/page.tsx` (read the two lists)
- Modify: `src/lib/decks/mix.ts` (lift `ROLE_ORDER` here)
- Modify: `src/components/decks/role-counter-strip.tsx` (import it from there)

**Interfaces:**
- Consumes: `computeRoleCounts`, `RECOMMENDED_MIX`, `MixRole`
  (`src/lib/decks/mix.ts`); `RoleCounterCell`; `averageManaValue` (Task 11);
  `deckVersioningCopy.changed` (Task 12).
- Produces: `ChangedStrip({ before, after, manaValue, manaValueBefore })` where
  `before`/`after` are `ShapeCard[]` — `{ role, quantity, typeLine }`, the
  subset `computeRoleCounts` and `cardTypeGroup` between them need;
  `loadVersionShape(versionId)` appended to `src/lib/decks/draft-state.ts`.

**Where the two lists come from.** The strip reads *whole* lists, not the
changed rows: a delta per role is the difference between two decks, and the
changed rows alone cannot say what a role's count was. `after` is
`detail.cards`, already loaded by the route's ownership guard.
`before` is new — `versionCards` returns `oracleId`/`quantity` only, with no
`role` to tally — so append one read:

```ts
export type ShapeCard = { role: DeckDetailCard["role"]; quantity: number; typeLine: string };

/** The committed list as the mix strip counts it. `role` is derived exactly as
 *  `getDeckDetail` derives it — through `primaryRole` over the real oracle text
 *  — because a role tallied two ways is two different decks on one screen. */
export async function loadVersionShape(versionId: string): Promise<ShapeCard[]> {
  const rows = await db.select({
    quantity: deckVersionCards.quantity,
    typeLine: cards.typeLine,
    oracleText: cards.oracleText,
    keywords: cards.keywords,
  }).from(deckVersionCards)
    .innerJoin(cards, eq(cards.oracleId, deckVersionCards.oracleId))
    .where(eq(deckVersionCards.versionId, versionId));
  return rows.map((r) => ({
    role: primaryRole(r), quantity: r.quantity, typeLine: r.typeLine,
  }));
}
```

The route passes `before={state.version ? await loadVersionShape(state.version.id) : []}`,
and the strip draws no deltas at an empty `before` — a brew has no previous
shape, and `+12 ramp` against nothing is a claim about a comparison that does
not exist.

Six cells: mana value plus the shipped five from `ROLE_ORDER`. `ROLE_ORDER` is
declared locally at `role-counter-strip.tsx:38` and is not exported — declare
the same array here rather than exporting it, or lift it into `mix.ts` beside
`RECOMMENDED_MIX` and have both read it. Lifting is the better answer and is
what this task does; it touches one line in each file.

- [ ] **Step 1: Write the failing test**

```tsx
describe("ChangedStrip", () => {
  it("draws six cells — mana value, then the shipped five roles", () => {
    render(<ChangedStrip before={BEFORE} after={AFTER} manaValue={3.1} manaValueBefore={3.4} />);
    expect(screen.getByText(deckVersioningCopy.changed.manaValue)).toBeTruthy();
    for (const role of ["ramp", "draw", "removal", "wipes", "land"] as const) {
      expect(screen.getByText(RECOMMENDED_MIX[role].label)).toBeTruthy();
    }
  });

  it("reads the curve's direction rather than leaving the reader to subtract", () => {
    render(<ChangedStrip before={BEFORE} after={AFTER} manaValue={3.1} manaValueBefore={3.4} />);
    expect(screen.getByText(deckVersioningCopy.changed.manaValueDown)).toBeTruthy();
  });

  it("prints a signed delta per cell, with a real minus sign", () => {
    render(<ChangedStrip before={BEFORE} after={AFTER} manaValue={3.1} manaValueBefore={3.4} />);
    expect(screen.getByText("−2")).toBeTruthy();
  });

  it("says nothing about mana value when there is nothing to average", () => {
    render(<ChangedStrip before={[]} after={[]} manaValue={null} manaValueBefore={null} />);
    expect(screen.queryByText(deckVersioningCopy.changed.manaValueDown)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to watch it fail**

Run: `pnpm vitest run src/components/decks/changed-strip.test.tsx`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Write the strip**

The five role cells take `RoleCounterCell` unchanged with Task 14's new `was`
prop — the same cell, so the review page and the deck page cannot draw the same
figure two ways. `before` and `after` are card *lists*, not count maps, so run
each through the shipped counter once and index the result:

```tsx
const beforeCounts = computeRoleCounts(before);
const afterCounts = computeRoleCounts(after);
// …
{ROLE_ORDER.map((role) => (
  <RoleCounterCell
    key={role}
    label={RECOMMENDED_MIX[role].label}
    have={afterCounts[role]}
    was={beforeCounts[role]}
    target={RECOMMENDED_MIX[role].target}
    advisory={RECOMMENDED_MIX[role].advisory}
  />
))}
```

The prop names are the shipped ones — `label` / `have` / `target` / `advisory`,
read off `role-counter-strip.tsx:88-93` — plus Task 14's `was`. There is no
`role` or `count` prop on this cell. `onSeeShelf` is deliberately unpassed: the
shelf is the deck page's offer, and this strip is a read of what already moved.

`before[role]` would be indexing an array by a role name and is always
`undefined`; `computeRoleCounts` is the one function that turns a list into the
five figures, and using it is what keeps the strip honest against the deck page. The mana-value cell is a sibling of the
same shape with `copy.manaValueDown` / `manaValueUp` under it and `clears(rec)`
/ `under(rec)` where a recommendation exists. Under the six cells, the
type-distribution block uses `copy.shapeHeading`, `copy.shapeRow(before, after)`
and `copy.delta(n)` over `cardTypeGroup`'s own groups.

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run src/components/decks/changed-strip.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/decks/changed-strip.tsx src/components/decks/changed-strip.test.tsx \
  src/components/decks/review-changes.tsx src/lib/decks/mix.ts \
  src/components/decks/role-counter-strip.tsx
git commit -m "feat(decks): how the deck's shape moves, in the mix strip's own cells"
```

---

### Task 17: `Pull it`, and the two rows where it is not offered

**Files:**
- Create: `src/components/decks/pull-control.tsx`
- Create: `src/components/decks/pull-control.test.tsx`
- Modify: `src/components/decks/review-changes.tsx` (pass it as `DiffRowOut`'s
  `action` on a sleeved row — the slot Task 15 step 4a opened, not a new row)

**Interfaces:**
- Consumes: `pullCardFromDeck` (`src/app/decks/actions.ts:1379`);
  `loadDraftState` (Task 13); `DeckClaim.pending` and `DeckClaim.commander`
  (Task 10); `deckVersioningCopy.review.pull*`, `commanderGuard*`,
  `commit.pullAnnounced`.
- Produces: `PullControl({ deckId, card, claim, onPulled })`; `PullResult` from
  `actions.ts`, widening `pullCardFromDeck`'s return past `DeckMutationResult`.

**Files, additionally:**
- Modify: `src/app/decks/actions.ts` (`pullCardFromDeck` returns `PullResult`)

34px desktop / 44px phone, `1px var(--border)`, `var(--accent)` at 12px/600 —
**never solid**. A pull takes a card out of somebody else's sleeved deck; a
brass fill would make it the recommended act, and it is a deliberate one.

- [ ] **Step 1: Write the failing test**

```tsx
describe("PullControl", () => {
  it("offers the pull, and re-prints the arithmetic on success", async () => {
    pullCardFromDeck.mockResolvedValue({ ok: true, buy: 7, total: "$241.00" });
    render(<PullControl deckId="d" card={CARD} claim={FREE_TO_PULL} onPulled={noop} />);
    await act(async () => {
      screen.getByRole("button", { name: deckVersioningCopy.review.pull }).click();
    });
    expect(pullCardFromDeck).toHaveBeenCalledWith("d2", "o1", "d");
    expect(
      screen.getByText(deckVersioningCopy.commit.pullAnnounced("Sol Ring", "Atraxa", 7, "$241.00")),
    ).toBeTruthy();
  });

  it("replaces the action with a tag and a route when that deck has its own draft", () => {
    render(<PullControl deckId="d" card={CARD} claim={{ ...FREE_TO_PULL, pending: true }} onPulled={noop} />);
    expect(screen.getByText(deckVersioningCopy.review.pullGuardTag)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open it to release Sol Ring/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: deckVersioningCopy.review.pull })).toBeNull();
  });

  it("offers no control at all on a commander claim — no route releases it", () => {
    render(<PullControl deckId="d" card={CARD} claim={{ ...FREE_TO_PULL, commander: true }} onPulled={noop} />);
    expect(screen.getByText(deckVersioningCopy.review.commanderGuardTag)).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("announces once, not once per re-render", async () => { /* … */ });
});
```

- [ ] **Step 2: Run it to watch it fail**

Run: `pnpm vitest run src/components/decks/pull-control.test.tsx`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Write the control**

**The action has to return the two figures first.** `pullCardFromDeck` resolves
to `DeckMutationResult` — `{ ok: true }` and nothing else (`actions.ts:1379-1383`)
— so `copy.pullAnnounced(card, deck, buy, total)` has no `buy` and no `total` to
print. Widen it exactly as Task 9 widens `CommitResult`, and for the same reason:
the figure must be the server's, computed after the write, because a client that
subtracts one from the number it was rendered with is guessing.

Step 0, in `src/app/decks/actions.ts`:

```ts
export type PullResult =
  | { ok: true; buy: number; total: string | null }
  | { ok: false; message: string };
```

The success arm reads the asking deck's position after the pull — the same
`loadDraftState(askingDeckId, userId)` the banner uses — and returns its
`buyCount` and `total`. It runs after the transaction commits and after
`revalidateClaims`, so it sees the world the reader is about to be shown. A
failed read returns `{ ok: true, buy: 0, total: null }` rather than failing the
pull: the card has moved, and losing the sentence about it is not worth undoing
that.

Then the control. Three arms, guard order `commander` → `pending` → offer. The commander arm is
first because it is permanent: a pending deck can be opened and released, a
commander cannot, so an `Open →` there would lead somewhere that cannot help.
`pullCardFromDeck` already refuses a commander pull server-side
(`actions.ts:1409`) — this is the rendering half of that same guard, and the
server check stays.

```tsx
const PULL_BUTTON =
  "inline-flex items-center justify-center min-h-[44px] md:min-h-[34px] px-[12px] " +
  "rounded-[7px] font-mono text-[12px] font-semibold text-[color:var(--accent)] " +
  "bg-transparent border border-border cursor-pointer disabled:opacity-50 disabled:cursor-default";
```

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run src/components/decks/pull-control.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/decks/pull-control.tsx src/components/decks/pull-control.test.tsx \
  src/components/decks/review-changes.tsx src/app/decks/actions.ts
git commit -m "feat(decks): pull a card back, and say plainly where a pull is not on offer"
```

---

### Task 18: Surface 3 — the commit sheet

**Files:**
- Create: `src/components/decks/commit-sheet.tsx`
- Create: `src/components/decks/commit-sheet.test.tsx`
- Modify: `src/components/decks/review-changes.tsx` (mount it at the foot)
- Modify: `src/components/decks/review-changes.tsx` (honour `commitOpen`, the
  banner's `?commit=1` arriving with the sheet already expanded)

Nothing to change in `pending-banner.tsx`: Task 14 already draws both commit
CTAs as links to `?commit=1`, which is this task's only entry point from the
deck page. On a brew or a basics-only draft the columns are empty and the sheet
is the whole page — `state.version === null` is where the sheet prints
`deckVersioningCopy.pending.firstCommitNote`, reusing the banner's line rather
than authoring a second one for the same fact.

**Interfaces:**
- Consumes: `commitDeckVersion` and its widened `CommitResult`
  (`src/app/decks/actions.ts:1268`, Task 9); `DraftState` (Task 13);
  `manapoolAddDeckUrl` (`src/lib/manapool/links.ts`);
  `deckVersioningCopy.commit` (Task 12).
- Produces: `CommitSheet({ deckId, state, rows })`.

Not a modal — the handoff draws it at the foot of the review page, and the
constraint list forbids a new modal. It carries **totals, never lists**: the rows
are directly above it, and a confirmation that re-lists what you just read is a
second copy rather than a confirmation.

- [ ] **Step 1: Write the failing test**

```tsx
describe("CommitSheet", () => {
  it("carries the total and no rows — the review page above it has the rows", () => {
    render(<CommitSheet deckId="d" state={STATE_36} rows={ROWS_36} />);
    expect(screen.getByText(deckVersioningCopy.commit.buyHeading)).toBeTruthy();
    expect(screen.getByText(deckVersioningCopy.commit.buyBackLink(8))).toBeTruthy();
    expect(screen.queryByText("Sol Ring")).toBeNull();
  });

  it("offers the note, and says plainly that it cannot be added later", () => {
    render(<CommitSheet deckId="d" state={STATE_36} rows={ROWS_36} />);
    expect(screen.getByLabelText(deckVersioningCopy.commit.noteLabel)).toBeTruthy();
    expect(screen.getByText(deckVersioningCopy.commit.noteWarning)).toBeTruthy();
  });

  it("links out to Mana Pool with the buy list, and only when there is one", () => {
    render(<CommitSheet deckId="d" state={STATE_36} rows={ROWS_36} />);
    expect(
      screen.getByRole("link", { name: deckVersioningCopy.commit.linkOut })
        .getAttribute("href"),
    ).toContain("manapool.com/add-deck?deck=");

    cleanup();
    render(<CommitSheet deckId="d" state={{ ...STATE_36, buyCount: 0, unfreeCount: 0, total: null }} rows={ROWS_36} />);
    expect(screen.queryByRole("link", { name: deckVersioningCopy.commit.linkOut })).toBeNull();
  });

  it("announces the version's real size, from the server's own count", async () => {
    commitDeckVersion.mockResolvedValue({ ok: true, number: 3, cardCount: 99, buy: [], pull: [] });
    render(<CommitSheet deckId="d" state={STATE_36} rows={ROWS_36} />);
    await act(async () => {
      screen.getByRole("button", { name: deckVersioningCopy.commit.cta(3) }).click();
    });
    expect(screen.getByRole("status").textContent)
      .toBe(deckVersioningCopy.commit.announced(3, 99, 0));
  });

  it("keeps the changes and says so when the write is refused", async () => {
    commitDeckVersion.mockResolvedValue({ ok: false });
    render(<CommitSheet deckId="d" state={STATE_36} rows={ROWS_36} />);
    await act(async () => {
      screen.getByRole("button", { name: deckVersioningCopy.commit.cta(3) }).click();
    });
    expect(screen.getByText(deckVersioningCopy.commit.refused)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to watch it fail**

Run: `pnpm vitest run src/components/decks/commit-sheet.test.tsx`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Write the sheet**

Three blocks and a bar: the money block (`buyHeading`, `buyBreakdown`,
`buyBackLink`, `linkOut`), the released block (`pullHeading`, `pullNote`), the
optional note field, then `cta` / `cancel` and `footer`. The now-or-never note is
rendered only when the field is untouched — its whole point is to be read before
the click, and after one it is a reprimand.

`manapoolAddDeckUrl` takes `{ name, quantity }[]`, so build it from the buy rows'
`shortfall`, never `needed`: the card the player already owns a free copy of is
not on a shopping list. The link is absent, not disabled, at an empty list —
which is what `manapoolAddDeckUrl` returning null already means.

On success, focus moves to the version line on the deck page and the
announcement is `copy.announced(number, cardCount, state.buyCount)` using the
server's `cardCount` from Task 9 — never a client-side recount, which is the
defect Task 9 exists to fix. The third figure is `buyCount`, a sum of
`shortfall`, and never `buy.length`: "3 to buy" is three copies to buy, so two
copies of one card is 2 there and one row on the list.

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run src/components/decks/commit-sheet.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/decks/commit-sheet.tsx src/components/decks/commit-sheet.test.tsx \
  src/components/decks/review-changes.tsx src/components/decks/pending-banner.tsx
git commit -m "feat(decks): the commit sheet — one total, one released block, one link out"
```

---

### Task 19: Discard, on #476's bar

**Files:**
- Create: `src/components/decks/discard-draft.tsx`
- Create: `src/components/decks/discard-draft.test.tsx`
- Modify: `src/components/decks/pending-banner.tsx` (the `Discard` control raises
  it in place)

**Interfaces:**
- Consumes: `discardDeckDraft` (`src/app/decks/actions.ts:1356`);
  `deckVersioningCopy.discard` (Task 12).
- Produces: `DiscardDraft({ deckId, state, onDiscarded })`.

The bar is `clear-auto.tsx`'s inline confirm, taken verbatim — the same two-click
shape for the same reason, an act with no undo. This is the **only** place
`--danger` appears in the whole feature.

- [ ] **Step 1: Write the failing test**

```tsx
describe("DiscardDraft", () => {
  it("asks first, with the count in the question and on the button", async () => {
    render(<DiscardDraft deckId="d" state={STATE_36} onDiscarded={noop} />);
    // The confirm is not up until it is asked for. `queryByRole`, not a thrown
    // `getByRole` swallowed by a `.catch` — a swallowed throw passes whether the
    // control is absent or the query itself was wrong.
    expect(
      screen.queryByRole("button", { name: deckVersioningCopy.discard.cancel }),
    ).toBeNull();
    screen.getByRole("button", { name: deckVersioningCopy.pending.discardCta }).click();
    expect(screen.getByText(deckVersioningCopy.discard.question(36))).toBeTruthy();
    expect(screen.getByRole("button", { name: deckVersioningCopy.discard.confirm(36) })).toBeTruthy();
  });

  it("states what is lost, including that it is stored nowhere", () => { /* consequence(…) */ });

  it("gives the brass fill to Keep editing, not to the destructive answer", () => { /* … */ });

  it("returns focus to the trigger on cancel", () => { /* … */ });

  it("announces the discard and says which version the deck is back on", async () => { /* … */ });

  it("says nothing changed when the write is refused", async () => { /* refused */ });
});
```

- [ ] **Step 2: Run it to watch it fail**

Run: `pnpm vitest run src/components/decks/discard-draft.test.tsx`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Write the confirm**

Copy `ClearAutoButton`'s `confirming` state, its `useId` question id, its
`triggerRef` / `yesRef` / `returningFocus` trio and its render-time reset when
the count reaches zero — all five exist for reasons that hold here identically,
and the comments at `clear-auto.tsx:60-88` document each.

`Keep editing` takes the brass fill and, at 390px where the pair stacks, sits
**top**: the safe answer is the one the thumb lands on. `--danger` on the
confirm's border and ink only; no filled red plate anywhere.

On success, focus moves to the deck name — the draft's controls have all
unmounted, and the name is the one thing certain to still be there.

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run src/components/decks/discard-draft.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/decks/discard-draft.tsx src/components/decks/discard-draft.test.tsx \
  src/components/decks/pending-banner.tsx
git commit -m "feat(decks): discard a draft behind the confirm the bulk keep already uses"
```

---

### Task 20: Surface 4 — version history, and the tab that reaches it

**Files:**
- Create: `src/app/decks/[id]/versions/page.tsx`
- Create: `src/components/decks/version-history.tsx`
- Create: `src/components/decks/version-history.test.tsx`
- Create: `src/components/decks/version-diff.tsx` (one version's detail, expanded
  in place — the half of surface 4 the rail has no slot for)
- Create: `src/components/decks/version-diff.test.tsx`
- Modify: `src/components/decks/builder-tabs.tsx` (a new `links` prop)
- Modify: `src/components/decks/builder-tabs.test.tsx`
- Modify: `src/lib/decks/versions.ts` (append `listVersions`, `loadVersionDiff`)

**Interfaces:**
- Consumes: `DeckVersion`, `versionCards`, `versionManaValue` (Tasks 4, 11);
  `deckVersioningCopy.history` (Task 12).
- Produces:
  ```ts
  export type VersionSummary = DeckVersion & {
    cardCount: number;
    adds: number;
    removes: number;
    manaValue: number | null;
    gamesHeld: number;
  };
  export async function listVersions(deckId: string): Promise<VersionSummary[]>;
  export async function loadVersionDiff(
    versionId: string, previousVersionId: string | null,
  ): Promise<{ in: string[]; out: string[] }>;
  ```
  and `VersionHistory({ deckId, versions })`,
  `VersionDiff({ version, previous })`; `BuilderTabs` gains
  `links?: { href: string; label: string; count?: number }[]`.

**The tab cannot be a `role="tab"`.** `builder-tabs.tsx` is one `role="tablist"`
with roving tabindex over three panels in the same document; `Versions` is a
route. It renders as an ordinary link in a sibling container **outside** the
tablist, or the roving tabindex and `aria-controls` both start lying. Absent
entirely at zero versions — a deck with no version has no history, and a disabled
tab offering nothing is the defect `ClearAutoButton` documents at its own zero.

- [ ] **Step 1: Write the failing test for the tab**

In `builder-tabs.test.tsx`:

```tsx
it("renders a routing link outside the tablist, so the roving tabindex still owns three tabs", () => {
  render(
    <BuilderTabs
      tabs={TABS}
      view="deck"
      onChange={noop}
      links={[{ href: "/decks/d/versions", label: "Versions", count: 3 }]}
    />,
  );
  const link = screen.getByRole("link", { name: "Versions · 3" });
  expect(screen.getByRole("tablist").contains(link)).toBe(false);
  expect(screen.getAllByRole("tab")).toHaveLength(3);
});

it("omits the link entirely when there is nothing to route to", () => {
  render(<BuilderTabs tabs={TABS} view="deck" onChange={noop} links={[]} />);
  expect(screen.queryByRole("link", { name: /Versions/ })).toBeNull();
});
```

- [ ] **Step 2: Run it to watch it fail**

Run: `pnpm vitest run src/components/decks/builder-tabs.test.tsx`
Expected: FAIL — `links` is not a prop of `BuilderTabs`.

- [ ] **Step 3: Add the prop**

Wrap the existing tablist and a new links row in one flex container. The links
row is a sibling of the tablist, never a child — the `children` slot already
inside the tablist is a separate, pre-existing thing and is not touched.

- [ ] **Step 4: Run it**

Run: `pnpm vitest run src/components/decks/builder-tabs.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing test for the rail**

```tsx
describe("VersionHistory", () => {
  it("draws one row per version, newest first, with the newest marked current", () => { /* … */ });

  it("says `initial` on v1 rather than +99 — nobody took ninety-nine decisions that day", () => {
    render(<VersionHistory deckId="d" versions={[V1]} />);
    expect(screen.getByText(deckVersioningCopy.history.initial)).toBeTruthy();
    expect(screen.queryByText("+99 / −0")).toBeNull();
  });

  it("draws `no note` in italic where a version carries none", () => { /* noNote */ });

  it("states how many games each version held, and omits the clause at zero", () => { /* gamesHeld */ });

  it("offers no restore — the draft is the only editable list", () => {
    render(<VersionHistory deckId="d" versions={[V3, V2, V1]} />);
    expect(screen.queryByRole("button", { name: /Restore/ })).toBeNull();
  });

  it("does not put a pending draft in the rail — a draft is not a version", () => { /* … */ });
});
```

- [ ] **Step 6: Run it to watch it fail**

Run: `pnpm vitest run src/components/decks/version-history.test.tsx`
Expected: FAIL — unresolved import.

- [ ] **Step 7: Write `listVersions` and the rail**

`listVersions` reads every version for the deck ordered by `number` descending,
then per row: its card count and adds/removes against its predecessor (the diff
is `draftDiff` over two card sets — the same pure function, so the rail and the
review page cannot disagree), its `versionManaValue`, and its games count from
`deck_games.version_id`. `number: 1` gets `adds: 0, removes: 0` and renders
`initial`, because it has no predecessor to compare against.

**Four queries total, never four per version.** A ten-version deck read one
version at a time is forty round trips to Neon for a page that draws ten rows.
Read the whole history in one pass instead:

```ts
export async function listVersions(deckId: string): Promise<VersionSummary[]> {
  const versions = await db.select().from(deckVersions)
    .where(eq(deckVersions.deckId, deckId)).orderBy(desc(deckVersions.number));
  if (versions.length === 0) return [];
  const ids = versions.map((v) => v.id);

  // Every version's cards, with the `cmc` the mana value needs, in one read.
  const rows = await db.select({
    versionId: deckVersionCards.versionId,
    oracleId: deckVersionCards.oracleId,
    quantity: deckVersionCards.quantity,
    cmc: cards.cmc,
    typeLine: cards.typeLine,
  }).from(deckVersionCards)
    .innerJoin(cards, eq(cards.oracleId, deckVersionCards.oracleId))
    .where(inArray(deckVersionCards.versionId, ids));

  // Games per version, grouped in the database rather than counted per row.
  const games = await db.select({
    versionId: deckGames.versionId, n: count(),
  }).from(deckGames).where(inArray(deckGames.versionId, ids))
    .groupBy(deckGames.versionId);

  const byVersion = new Map(ids.map((id) => [id, rows.filter((r) => r.versionId === id)]));
  const gamesBy = new Map(games.map((g) => [g.versionId!, Number(g.n)]));
  // Ascending, so each version's predecessor is the one before it.
  const ascending = [...versions].reverse();
  return ascending.map((v, i) => {
    const mine = byVersion.get(v.id) ?? [];
    const previous = i === 0 ? null : byVersion.get(ascending[i - 1]!.id) ?? [];
    const diff = previous ? draftDiff(mine, previous) : null;
    return {
      ...v,
      cardCount: mine.reduce((n, r) => n + r.quantity, 0),
      adds: diff?.adds.length ?? 0,
      removes: diff?.removes.length ?? 0,
      manaValue: averageManaValue(mine),
      gamesHeld: gamesBy.get(v.id) ?? 0,
    };
  }).reverse();
}
```

Each rail row: number, date, note (or `noNote` italic), `manaValue(mv)`,
`delta(adds, removes)`, `gamesHeld(n)`. **No restore control** — the design
decided against it and `restoreDraftFromVersion` stays unwired from this surface.

- [ ] **Step 8: Write the route**

`src/app/decks/[id]/versions/page.tsx`, server component:

```tsx
export default async function VersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  // `listVersions` takes no `userId` — it reads by deck id alone, so this guard
  // is the only thing standing between a signed-in account and another
  // player's version history.
  const detail = await getDeckDetail(id, userId);
  if (!detail) notFound();

  const versions = await listVersions(id);
  // A brew has no history, and an empty rail reads as a bug — same reasoning as
  // the review page's redirect.
  if (versions.length === 0) redirect(`/decks/${id}`);
  return <VersionHistory deckId={id} versions={versions} />;
}
```

- [ ] **Step 9: Write the per-version detail**

The rail is half of surface 4. Design's copy file carries six strings the rail
itself has no slot for — `diffIn(n)`, `diffOut(n)`, `diffNote`,
`initialHeading`, `initialBody`, `initialBrowse(cards)`, plus
`commanderChange(from, to)` — which are a **detail view of one version**: what
came in, what went out, and against a v1, why there is nothing to show. Without
it those strings are transcribed in Task 12 and read by nothing.

It expands **in place** inside the rail row, not on a route of its own: it is a
read of two lists with no controls, and a route would put a page in the history
stack for a thing the reader glanced at. `VersionHistory` holds one open row id
in state and the detail is `version-diff.tsx`:

```tsx
/** What one version changed, as a pair of name lists.
 *
 *  `diffNote` is the whole design of this component: no ownership dot, no price,
 *  no pull offer. This is what the deck *was*, and a buy tag against a list from
 *  three months ago would be an offer about a deck that no longer exists. */
export function VersionDiff({ version, previous }: {
  version: VersionSummary;
  previous: VersionSummary | null;
}) { … }
```

The names come from one server read per opened row —
`loadVersionDiff(versionId, previousVersionId)` in `versions.ts`, `draftDiff`
over two `versionCards` reads joined to `cards` for the name, returning
`{ in: string[]; out: string[] }`. Fetched on open, not with the rail: a
ten-version deck would otherwise pay ten diffs to draw ten closed rows.

`previous === null` is the v1 arm: `initialHeading`, `initialBody`, and
`initialBrowse(cardCount)` linking to the deck page. Never a diff, and never
`+99` — the migration stamped a list that was already there.

`commanderChange(from, to)` prints only when the two versions' `commanderOracleId`
or `partnerOracleId` differ, which is why `VersionSummary` extends the whole
`DeckVersion` rather than a subset.

- [ ] **Step 10: Test the detail**

```tsx
it("names what came in and what went out, and says the list carries no offers", () => { /* diffIn/diffOut/diffNote */ });

it("draws the initial arm on a v1 — no diff, and a link to browse the list", () => { /* initialHeading/initialBody/initialBrowse */ });

it("states a commander change only when the commander actually changed", () => { /* commanderChange */ });

it("offers no buy tag, no ownership dot and no pull on any detail row", () => { /* diffNote, enforced */ });
```

- [ ] **Step 11: Run the suites and the gate**

Run: `pnpm vitest run src/components/decks && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add "src/app/decks/[id]/versions/page.tsx" src/components/decks/version-history.tsx \
  src/components/decks/version-history.test.tsx src/components/decks/version-diff.tsx \
  src/components/decks/version-diff.test.tsx src/components/decks/builder-tabs.tsx \
  src/components/decks/builder-tabs.test.tsx src/lib/decks/versions.ts
git commit -m "feat(decks): the version rail, and what each version changed"
```

---

### Task 21: Surface 5 — the game log's version stamp

**Files:**
- Modify: `src/lib/decks/games.ts` (`DeckGame` gains `versionNumber`)
- Modify: `src/lib/decks/games.test.ts`
- Modify: `src/components/decks/game-history-row.tsx` (one slot)
- Modify: `src/components/decks/game-history-row.test.tsx`

**Interfaces:**
- Consumes: `deckVersions.number`, `deckGames.versionId` (`schema.ts:348`);
  `deckVersioningCopy.stamp` (Task 12).
- Produces: `DeckGame` gains `versionNumber: number | null`.

Read-side only. `logGame` already stamps `version_id` via
`versionLiveAt(deckId, playedAt)` at `actions.ts:1180-1215`, so there is no write
work in this task — the errata above records that.

- [ ] **Step 1: Write the failing test**

In `games.test.ts`:

```ts
it("carries the version each game was played under, and null where none was", async () => {
  const games = await listDeckGames(deckId);
  expect(games[0].versionNumber).toBe(2);
  expect(games[1].versionNumber).toBeNull();
});
```

In `game-history-row.test.tsx`:

```tsx
it("prints the version between the meta line and the marks", () => {
  render(<GameHistoryRow deckId="d" game={{ ...GAME, versionNumber: 2 }} />);
  expect(screen.getByText(deckVersioningCopy.stamp.value(2))).toBeTruthy();
});

it("draws an em dash in --fg-locked for a game no version was live for", () => {
  render(<GameHistoryRow deckId="d" game={{ ...GAME, versionNumber: null }} />);
  expect(screen.getByText(deckVersioningCopy.stamp.absent)).toBeTruthy();
});

it("is not a chip and not a link — the stamp is a fact, not a route", () => {
  render(<GameHistoryRow deckId="d" game={{ ...GAME, versionNumber: 2 }} />);
  expect(screen.queryByRole("link", { name: /v2/ })).toBeNull();
});
```

- [ ] **Step 2: Run them to watch them fail**

Run: `pnpm vitest run src/lib/decks/games.test.ts src/components/decks/game-history-row.test.tsx`
Expected: FAIL — `versionNumber` does not exist on `DeckGame`.

- [ ] **Step 3: Add the join and the slot**

`listDeckGames` left joins `deckVersions` on `deckGames.versionId` and selects
`deckVersions.number` — a left join, because a null `version_id` is the accurate
value for a game played before this shipped and an inner join would drop the row
entirely.

The slot goes between the meta span and the `flex-1` marks span, at the row's
existing mono size:

```tsx
<span className="flex-none w-[44px] font-mono text-[11px] tabular-nums"
      style={{ color: game.versionNumber === null ? "var(--fg-locked)" : "var(--fg-faint)" }}>
  {game.versionNumber === null
    ? deckVersioningCopy.stamp.absent
    : deckVersioningCopy.stamp.value(game.versionNumber)}
</span>
```

Bare mono, no plate, no border, no link. The aggregate panel does not read
`versionNumber`: a win rate split by version would be computed over two or three
games per version and would read as signal.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run src/lib/decks/games.test.ts src/components/decks/game-history-row.test.tsx`
Expected: PASS.

- [ ] **Step 5: The full gate, then commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
git add src/lib/decks/games.ts src/lib/decks/games.test.ts \
  src/components/decks/game-history-row.tsx src/components/decks/game-history-row.test.tsx
git commit -m "feat(decks): stamp each logged game with the version that was on the table"
```

---

## Self-Review

**Spec coverage.** Data model → Task 1. Migration → Task 2. Claim model,
`mature` retiring, `committed_at` seniority → Task 5. The pull and its guard →
Task 8. Commit's two lists → Task 7. Discard → Task 7. Game stamp → Task 8.
Diff and the three-way split → Task 3. Version read/write/restore → Task 4.
Testing → Tasks 3, 6, 7, 8.

Addendum R3's prerequisites: 1 (quantity rows via `recountedItem`) → Task 15
step 4; 2 (basics out of `removes`) and 3 (return the card count) → Task 9;
4 (the pull guard's server flag and the commander guard) → Tasks 10 and 17;
5 (extract the grouping UI) → **disproved**, recorded in the errata and
deliberately unbuilt; 6 (the strip's sixth cell, `cards.cmc`, the version join)
→ Tasks 11 and 16.

The five surfaces: 1 pending state → Task 14. 2 review changes → Tasks 15 and
16. 3 commit → Task 18, with Discard at Task 19. 4 versions → Task 20.
5 the game-log stamp → Task 21. The copy module and the shared reader they all
depend on → Tasks 12 and 13.

**Placeholders.** Task 6 previously left the probe's route to the query open; it
now calls `loadAvailability` directly and the alternative is deleted. Tasks 19,
20 and 21 carry `/* … */` bodies for a handful of test cases whose assertion is
named in the `it` string and whose fixture is the same one its sibling cases use
— the copy key and the rule are both stated, so nothing is left to decide. Every
test that establishes a new fixture, a new signature or a disputed rule is
written out in full.

**Type consistency.** `CardQty`, `DraftChange`, `DraftDiff`, `AddBucket`,
`BucketedAdd` are defined in Task 3 and used unchanged in Tasks 4, 7, 8, 13 and
14. `DeckVersion`, `newestVersion`, `versionCards`, `commitVersion`,
`restoreDraftFromVersion` are defined in Task 4 and used unchanged in 7, 8, 13
and 20. `DeckClaim.pending` / `.commander` are added in Task 10 and read in 13
and 17. `DraftState` and `changeCount` are defined in Task 13 and read in 14,
15, 18 and 19; `DraftRow` / `DraftRows` in 13 and read in 15 and 18.
`CommitResult.cardCount` is added in Task 9 and read in 18. `DeckDetailCard.cmc`
is added in Task 11 and read in 13 and 16. `averageManaValue` and
`versionManaValue` are defined in Task 11 and read in 13, 16 and 20.
`DeckGame.versionNumber` is added in Task 21 and read only there. The shipped
`recountedItem(name: string, from: string, to: string)` is used in Task 15, and
the copy module's own `review.recounted` is dropped in Task 12 rather than
shipped with a second signature. The SQL identifier is `sleeved` throughout
Task 5, while the JSON key stays `mature` for its existing consumers — stated
explicitly in Step 3.

## Review round 1 — what changed and why

A code review of the first draft caught seven things worth recording, because
each is a way the plan read correctly and would have produced broken code.

1. **Seniority was per deck, not per card.** Ordering on the newest version's
   `committed_at` demotes a deck on every card it holds the moment it commits an
   unrelated swap. Fixed by carrying `since` on the claim — see spec Addendum R1
   — which also fixes remove-and-re-add, and makes the backfill a strict no-op
   for seniority among existing full-body decks.
2. **A surviving reader of `mature`.** The `free` expression reads
   `skip_deck.mature` through a scalar subquery well away from the renamed CTEs.
   Every availability read would have failed outright.
3. **The buy list would have dropped every draft add.** `loadDeckBuyRows` inner
   joins its decklist to the claim side; once those two diverge that join is a
   filter. Now a left join.
4. **A hand-numbered `0025` with no snapshot** would break the next
   `pnpm db:generate`. The backfill is appended to the generated `0024` instead.
5. **The probe depended on `pg`** (not a dependency), on a transaction the
   function under test cannot see, and on a fixture whose commander *was* the
   contested card. Rewritten in TypeScript against `loadAvailability`.
6. **Tasks 7 and 8's tests could not run.** The hand-rolled stub's `where()` has
   no `orderBy`, its transaction has no `delete` and no `execute`, and the
   constants were undeclared. `./versions` is mocked instead.
7. **Smaller:** an unused `deck` binding that `pnpm lint` fails on; `bucketAdds`
   fed soft brew claims and would offer a pull against a list nobody sleeved;
   the version number needed a `for update`; the pull revalidated only the
   source deck, not the one the player is looking at.
