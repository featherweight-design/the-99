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
- Tasks 9 onward are UI and are **gated** on a design handoff carrying a READINESS verdict. Do not build them without one.

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

### Tasks 9+: the five surfaces — BLOCKED

**Do not start these without a design handoff carrying a READINESS verdict.**
`AGENTS.md` gates all UI work on `design/design_handoff_the99_*`, and the
behaviour these surfaces must express is fixed in the spec's *Surfaces*
section, not here:

1. Pending state on the deck page — counts, marked rows, draft-driven coverage.
2. Review changes — adds split three ways, the pull offer on the middle group.
3. Commit — the two lists, the optional note.
4. Version history and diff — `+n / −n`, "initial" for v1.
5. The game log's version marker.

Plus Discard, which confirms first on the #476 bar.

When the handoff lands, extend this plan with one task per surface rather than
opening a second plan document. The server actions they call all exist by the
end of Task 8, so those tasks are rendering and copy only.

---

## Self-Review

**Spec coverage.** Data model → Task 1. Migration → Task 2. Claim model,
`mature` retiring, `committed_at` seniority → Task 5. The pull and its guard →
Task 8. Commit's two lists → Task 7. Discard → Task 7. Game stamp → Task 8.
Diff and the three-way split → Task 3. Version read/write/restore → Task 4.
Testing → Tasks 3, 6, 7, 8. The five surfaces → deliberately unbuilt and
blocked, matching the spec's gating note.

**Placeholders.** None. Task 6 previously left the probe's route to the query
open; it now calls `loadAvailability` directly and the alternative is deleted.

**Type consistency.** `CardQty`, `DraftChange`, `DraftDiff`, `AddBucket`,
`BucketedAdd` are defined in Task 3 and used unchanged in Tasks 4, 7 and 8.
`DeckVersion`, `newestVersion`, `versionCards`, `commitVersion`,
`restoreDraftFromVersion` are defined in Task 4 and used unchanged in 7 and 8.
The SQL identifier is `sleeved` throughout Task 5, while the JSON key stays
`mature` for its existing consumers — stated explicitly in Step 3.

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
