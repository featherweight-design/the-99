# Partner Commanders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a deck carry two commanders — imported from a pasted list or chosen in the create picker — render both at the top of the deck, and drop the deck ceiling to 100 minus the commander count.

**Architecture:** One nullable `decks.partner_oracle_id` column carries the second commander; `commander_oracle_id` stays `notNull` and *is* the primary, so column order is pair order and no position field exists. A new pure module `src/lib/decks/partner.ts` reads partner ability off oracle text and answers whether two commanders may pair. Everywhere the app assumed one commander — identity validation, the import filter, the 99 ceiling, the availability claim, EDHREC advice, and four rendered surfaces — widens to read one or two. The ceiling becomes a derived `deckBodySize` and the `MATURE_DECK_SIZE` constant is retired.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Clerk auth, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-08-partner-commanders-design.md`

**Design handoff:** `design/design_handoff_the99_partners/` (R2) — decisions 17–23 govern every rendered surface.

**Readiness verdict:** `docs/superpowers/readiness-partners.md` — 🟢 Green, with four corrections carried below.

## Global Constraints

- **Package manager is pnpm.** Never npm or yarn.
- **Pre-push gate, every push:** `pnpm typecheck && pnpm lint && pnpm test`, plus the stub-DB build `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`, then `git fetch origin && git rebase origin/main`.
- **Stage files by name.** Never `git add -A`.
- **All work happens in the worktree** `.worktrees/partner-commanders` on branch `design/partner-commanders`. The main checkout is never edited.
- **Migration number is 0022.** `drizzle/0021_yellow_black_tarantula.sql` is the highest on disk. Generate with `pnpm db:generate`; never hand-number.
- **No backfill.** Every existing deck has `partner_oracle_id = NULL` and reads exactly as it does today.
- **Copy strings are fixed.** Every user-visible string comes verbatim from `design/design_handoff_the99_partners/partners · copy strings.ts`. Do not re-word, and do not mint new strings.
- **The pair joiner is ` + `** — a literal space-plus-space. Never `·` (this app's fact separator), never `//` (assigned to two-faced cards by #363), never `&`.
- **Neither commander is ever a `deck_cards` row.** This invariant predates the feature and must survive it: `deckCounts` at `src/lib/decks/grouping.ts:111-123` therefore needs no change.
- **A figure is never partly truncated** (decision 23). `86 / 9…` is a lie in a way `Bruse Ta…` is not.
- **Out of scope:** pair-aware discovery and ranking, synergy scoring over two commanders as a *ranking* input, Backgrounds, Doctor's companion, and any legality rule beyond what the pasted list declares.

### There is no live-database test harness

This constrains every task below and is the single most important thing to know before writing
a test. **No test in this repo touches a database.** Verified across all 36 test files under
`src/lib/decks/` and `src/app/decks/`:

- `read.test.ts` does `vi.mock("../../db", () => ({ db: {} }))` and then imports and tests only
  the file's **pure** exports — `cardTypeGroup`, `primaryRole`, `colorIdentityMask`,
  `poolCountFromMaskTally`. The query functions themselves are not tested.
- `import-actions.test.ts` builds a **hand-written Drizzle fake** in a `vi.hoisted` block that
  identifies tables by `Symbol.for("drizzle:Name")` and answers `select`/`insert`/`delete` from
  arrays of plain objects. It also records every `where` condition, so a test can prove the
  ownership scoping is in the SQL rather than in the fake.
- `import.test.ts` calls the pure `buildDeckImport(input)` against literal catalog cards.

So: **never write `seedDeck`, `seedCollection`, `seedSupport`, `fillDeck`, or a bare
`db.select()` in a test.** Those helpers do not exist and inventing them means standing up a
harness this feature did not ask for. Where a task below needs to prove behaviour that only a
real database can show — the SQL in `availability-query.ts`, the grouped `max` in
`synergy-read.ts` — the proof is a **manual walk against local Postgres**, written into the
task as an explicit verification step, not a unit test that mocks away the thing under test.

## Errata — corrected citations

The spec and handoff were written against a moving tree. Every citation below was re-read at
`4677529`. **Build against the right-hand column.** Where a plan task cites a line, the plan's
citation is already corrected.

| Cited as | Actually | Source of the error |
|---|---|---|
| `commanderShortName` at `builder-shell.tsx:278` | **`shortCommanderName`, exported at `src/lib/copy/decks-builder.ts:17`** | Handoff decision 19 contradicts its own copy strings file |
| `resume-decks.tsx:139-145` | **`:119-124`** | top-off merges landed after R2 was drawn |
| `resume-decks.tsx:84` | **`:82`** | same |
| `deck-rail.tsx:123` | **`:121`** | same |
| `src/lib/decks/synergy-read.ts` | **`src/app/commanders/[slug]/synergy-read.ts`** | spec §5 |
| `src/lib/decks/import-actions.ts` | **`src/app/decks/import-actions.ts`** | spec §2 |
| `builder-spine.tsx:286-364` | **file no longer exists** — split into `spine-desktop.tsx` / `spine-mobile.tsx` | spec §6; the handoff already re-anchored to the two spines |
| `copy/top-off.ts` "of 99" at 167/171/322/324/328 | **`:174, :178, :337, :339, :343`** | spec §7 |
| `top-off-list.tsx:215` | **`:223`** | spec §7 |
| `status.ts:61-62` | **`:68-70`** | spec §4 |
| `overCopy.figure.denominator` described as a function | **a constant `" / 99"` at `decks-builder.ts:363`** | handoff decision 18 |

One further correction from the readiness verdict, which is not a citation but a measurement:
**decision 23's 200px is a best case, not a floor.** It is measured at a 334px row (~1026px of
Home). The resume section renders from `sm`, where the meta line is nearer **70px**. The ruling
still governs — the count is pinned, the names are the only shrinking child — but the *ten
characters* do not survive; at `sm` a pair row may render `Ish…`. **Build the mechanism, not the
character count.**

## File Structure

**New files**

| Path | Responsibility |
|---|---|
| `src/lib/decks/partner.ts` | Pure. Reads a partner ability off oracle text; answers whether two abilities may pair. No I/O, no React. |
| `src/lib/decks/partner.test.ts` | Its tests, including the restricted `Partner—Father & son` form. |
| `src/lib/decks/deck-size.ts` | Pure. `deckBodySize(commanderCount)` and `deckBodySizeFor(deck)`. The single home of the 99/98 ceiling. |
| `src/lib/decks/deck-size.test.ts` | Its tests. |
| `src/components/decks/partner-slot.tsx` | The picker's second slot — states A/B/C from decision 20. |
| `drizzle/0022_*.sql` | Generated. Adds the column and its CHECK. |

**Modified files**

| Path | Change |
|---|---|
| `src/db/schema.ts` | `partnerOracleId` on `decks`, plus the table-level CHECK. |
| `src/lib/decks/status.ts` | Thresholds read the derived body size rather than `MATURE_DECK_SIZE`. |
| `src/lib/decks/suggest.ts` | `MAX` and `LAND_TARGET` become derived from the body size. |
| `src/lib/decks/fill.ts` | `FILL_BASELINE_TOTAL` becomes a function of the land target. |
| `src/lib/decks/read.ts` | `DeckDetail.partner`, `DeckListItem` partner fields, both queries, per-deck `canFlip`. |
| `src/lib/decks/availability-query.ts` | Second union arm in `all_claims`; per-deck maturity. |
| `src/lib/decks/add-validation.ts` | Union colour identity; refuse either commander. |
| `src/lib/decks/import.ts` | Two declared commanders; `extraCommanderDeclared` retired; `commanderSectionLines` exported. |
| `src/lib/decks/export-helpers.ts` | Emits a `Commander` section holding both. |
| `src/app/decks/import-actions.ts` | Filters against both; writes the partner; re-validates the pair. |
| `src/app/decks/actions.ts` | `createDeck` takes a partner; ledger writes and 99 literals derive. |
| `src/app/commanders/[slug]/synergy-read.ts` | `eq` → `inArray`; grouped `max`. |
| `src/app/decks/[id]/page.tsx` | Open slots derive; synergy read takes both ids. |
| `src/lib/copy/deck-import.ts` | Hosts `partnerCopy` under `deckImportCopy.commander`. |
| `src/lib/copy/decks-builder.ts` | `denominator` becomes a function; its comment is rewritten. |
| `src/lib/copy/top-off.ts` | Five "of 99" strings parameterise. |
| `src/components/decks/create-picker.tsx` | Mounts the partner slot; sized thumbs; re-headed list. |
| `src/components/decks/spine-desktop.tsx` | Pair caption, identity label kept, partner card trigger. |
| `src/components/decks/spine-mobile.tsx` | Pair caption, identity label dropped, partner card trigger. |
| `src/components/home/resume-decks.tsx` | Short pair names; inverted shrink order; clause dropped on pairs. |
| `src/components/home/deck-rail.tsx` | Denominator derives. No other pair signal (decision 21). |
| `src/components/decks/top-off-list.tsx` | `total` reconstruction derives. |

---

### Task 1: The partner ability module

The pure heart of the feature. Everything else asks this module two questions: *can this card
have a partner*, and *may these two pair*.

**Files:**
- Create: `src/lib/decks/partner.ts`
- Test: `src/lib/decks/partner.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export type PartnerAbility =
    | { kind: "generic" }
    | { kind: "restricted"; label: string }
    | { kind: "with"; name: string }
    | { kind: "friendsForever" };

  export function partnerAbility(oracleText: string | null): PartnerAbility | null;
  export function canPair(a: PartnerAbility | null, b: PartnerAbility | null): boolean;
  export function partnerAbilityLabel(ability: PartnerAbility): string;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/decks/partner.test.ts
import { describe, expect, it } from "vitest";
import { canPair, partnerAbility, partnerAbilityLabel } from "./partner";

describe("partnerAbility", () => {
  it("reads the generic ability", () => {
    expect(partnerAbility("Flying\nPartner (You can have two commanders if both have partner.)"))
      .toEqual({ kind: "generic" });
  });

  it("reads the restricted form and keeps the printed label", () => {
    expect(
      partnerAbility(
        "Partner—Father & son (You can have two commanders if both have partner with the same label.)",
      ),
    ).toEqual({ kind: "restricted", label: "Partner—Father & son" });
  });

  it("normalises a hyphen-minus in the restricted form to the printed em dash", () => {
    expect(partnerAbility("Partner-Father & son")).toEqual({
      kind: "restricted",
      label: "Partner—Father & son",
    });
  });

  it("reads the named form", () => {
    expect(partnerAbility("Partner with Pir (When this creature enters, target player may...)"))
      .toEqual({ kind: "with", name: "Pir" });
  });

  it("reads friends forever", () => {
    expect(partnerAbility("Friends forever (You can have two commanders if both have friends forever.)"))
      .toEqual({ kind: "friendsForever" });
  });

  it("returns null for a commander with no partner ability", () => {
    expect(partnerAbility("Flying, vigilance")).toBeNull();
    expect(partnerAbility(null)).toBeNull();
  });

  it("does not mistake reminder text mentioning partner for the ability", () => {
    expect(partnerAbility("Whenever a creature you control with partner attacks, draw a card."))
      .toBeNull();
  });
});

describe("canPair", () => {
  it("pairs two generics", () => {
    expect(canPair({ kind: "generic" }, { kind: "generic" })).toBe(true);
  });

  it("pairs two restricted commanders carrying the same label", () => {
    const a = { kind: "restricted", label: "Partner—Father & son" } as const;
    expect(canPair(a, { ...a })).toBe(true);
  });

  it("refuses restricted commanders carrying different labels", () => {
    expect(
      canPair(
        { kind: "restricted", label: "Partner—Father & son" },
        { kind: "restricted", label: "Partner—Survivors" },
      ),
    ).toBe(false);
  });

  it("refuses a generic paired with a restricted", () => {
    expect(canPair({ kind: "generic" }, { kind: "restricted", label: "Partner—Survivors" })).toBe(
      false,
    );
  });

  it("pairs two friends forever", () => {
    expect(canPair({ kind: "friendsForever" }, { kind: "friendsForever" })).toBe(true);
  });

  it("refuses friends forever paired with generic", () => {
    expect(canPair({ kind: "friendsForever" }, { kind: "generic" })).toBe(false);
  });

  it("refuses when either side has no ability", () => {
    expect(canPair(null, { kind: "generic" })).toBe(false);
    expect(canPair({ kind: "generic" }, null)).toBe(false);
  });
});

describe("partnerAbilityLabel", () => {
  it("prints the ability verbatim, as the picker caption does", () => {
    expect(partnerAbilityLabel({ kind: "generic" })).toBe("Partner");
    expect(partnerAbilityLabel({ kind: "restricted", label: "Partner—Father & son" })).toBe(
      "Partner—Father & son",
    );
    expect(partnerAbilityLabel({ kind: "with", name: "Pir" })).toBe("Partner with Pir");
    expect(partnerAbilityLabel({ kind: "friendsForever" })).toBe("Friends forever");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/lib/decks/partner.test.ts`
Expected: FAIL — `Failed to resolve import "./partner"`.

- [ ] **Step 3: Write the module**

```ts
// src/lib/decks/partner.ts
//
// Partner is read off the card's own words. The app never carries a partner
// table: a set that prints a new restricted label works the day the catalog
// refreshes, with no code change.
//
// `canPair` is label equality, not a rules engine. It answers the one question
// the picker and the import re-validation ask, and the spec's out-of-scope line
// covers every legality rule beyond it.

export type PartnerAbility =
  | { kind: "generic" }
  | { kind: "restricted"; label: string }
  | { kind: "with"; name: string }
  | { kind: "friendsForever" };

// The ability is always its own line on a printed card, so anchoring to a line
// start is what keeps "creature you control with partner" from matching.
const RESTRICTED = /^Partner[—-]([^(\n]+)/m;
const WITH = /^Partner with ([^(\n]+)/m;
// No lookahead here: `WITH` and `RESTRICTED` are tested first, so anything
// reaching this test is already known not to be one of them. A lookahead
// excluding a following space would reject the printed form, which is
// `Partner (You can have two commanders...)`.
const GENERIC = /^Partner\b/m;
const FRIENDS_FOREVER = /^Friends forever\b/m;

export function partnerAbility(oracleText: string | null): PartnerAbility | null {
  if (!oracleText) return null;

  const withMatch = WITH.exec(oracleText);
  if (withMatch) return { kind: "with", name: withMatch[1].trim() };

  const restricted = RESTRICTED.exec(oracleText);
  if (restricted) return { kind: "restricted", label: `Partner—${restricted[1].trim()}` };

  if (GENERIC.test(oracleText)) return { kind: "generic" };
  if (FRIENDS_FOREVER.test(oracleText)) return { kind: "friendsForever" };

  return null;
}

export function canPair(a: PartnerAbility | null, b: PartnerAbility | null): boolean {
  if (!a || !b) return false;
  if (a.kind === "generic" && b.kind === "generic") return true;
  if (a.kind === "friendsForever" && b.kind === "friendsForever") return true;
  if (a.kind === "restricted" && b.kind === "restricted") return a.label === b.label;
  if (a.kind === "with" && b.kind === "with") return true;
  return false;
}

export function partnerAbilityLabel(ability: PartnerAbility): string {
  switch (ability.kind) {
    case "generic":
      return "Partner";
    case "restricted":
      return ability.label;
    case "with":
      return `Partner with ${ability.name}`;
    case "friendsForever":
      return "Friends forever";
  }
}
```

**Accepted deviation from spec §3.** The spec says a `with` commander "pairs only with the
named card"; this module returns `true` for any two `with` commanders. The reason is that the
name a card prints is a *card* name while the app pairs by *oracle* id, so enforcing it would
need a name→oracle resolution this module has no I/O to perform. The consequence is bounded:
`Pir` paired with an unrelated `Partner with` commander is an illegal pair, and an illegal pair
declared by a paste is one the spec **already** accepts with a note rather than refuses. The
only thing lost is that the create picker will offer such a pair. Recorded here rather than
silently diverging; revisit if Product objects.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/lib/decks/partner.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/decks/partner.ts src/lib/decks/partner.test.ts
git commit -m "feat(decks): read partner ability off oracle text"
```

---

### Task 2: The column, the constraint, the migration

**Files:**
- Modify: `src/db/schema.ts:181-194` (the `decks` table)
- Create: `drizzle/0022_*.sql` (generated)

**Interfaces:**
- Consumes: nothing.
- Produces: `decks.partnerOracleId: string | null` on the Drizzle table, referencing `cards.oracleId`.

- [ ] **Step 1: Add the column and the CHECK**

**Do not retype the table.** Make two surgical edits to what is on disk, so that no existing
column's options can drift and generate an unwanted `ALTER COLUMN`.

**Edit one** — insert this single property immediately after the `commanderOracleId` property:

```ts
    // The pair's order is the column order: `commander_oracle_id` is always the
    // primary. A position field would be a second source of truth for a fact
    // two columns already carry.
    partnerOracleId: uuid("partner_oracle_id").references(() => cards.oracleId),
```

**Edit two** — the `decks` table is currently `pgTable("decks", { ... })` with two arguments.
Add Drizzle's table-extras callback as a third:

```ts
  (t) => [
    check(
      "decks_partner_distinct",
      sql`${t.partnerOracleId} is null or ${t.partnerOracleId} <> ${t.commanderOracleId}`,
    ),
  ],
```

Add `check` to the existing `drizzle-orm/pg-core` import and `sql` to the `drizzle-orm` import
if either is not already there.

- [ ] **Step 2: Generate the migration**

Run: `pnpm db:generate`
Expected: a new `drizzle/0022_<name>.sql` containing `ALTER TABLE "decks" ADD COLUMN "partner_oracle_id" uuid;`, its foreign key, and the check constraint.

Read the generated file and confirm it contains **no `DROP` and no `ALTER COLUMN`**. Either one means the schema edit disturbed a column it should not have touched — revert and redo the two surgical edits.

- [ ] **Step 3: Verify types still compile**

Run: `pnpm typecheck`
Expected: PASS. (Nothing reads the column yet.)

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat(decks): add the nullable partner commander column"
```

---

### Task 3: The derived ceiling

Today the ceiling is the constant `MATURE_DECK_SIZE` and a scattering of `99` literals. It
becomes a function of the commander count, and `MATURE_DECK_SIZE` is retired at every importer.

**Files:**
- Create: `src/lib/decks/deck-size.ts`
- Test: `src/lib/decks/deck-size.test.ts`
- Modify: `src/lib/decks/availability.ts:11` (delete `MATURE_DECK_SIZE`)
- Modify: `src/lib/decks/status.ts:69-70` (two bare `99` literals)
- Modify: `src/lib/decks/suggest.ts:52-53`
- Modify: `src/lib/decks/fill.ts:38-39`
- Modify: `src/lib/decks/status-style.ts:18,80`
- Modify: `src/components/decks/deck-card.tsx:4,63,127`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export function deckBodySize(hasPartner: boolean): number;   // 99 | 98
  export function landTarget(hasPartner: boolean): number;     // 37 | 36
  export function fillBaselineTotal(hasPartner: boolean): number;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/decks/deck-size.test.ts
import { describe, expect, it } from "vitest";
import { deckBodySize, landTarget } from "./deck-size";

describe("deckBodySize", () => {
  it("is 99 for a single commander", () => {
    expect(deckBodySize(false)).toBe(99);
  });

  it("is 98 for a pair — the deck is still 100 cards", () => {
    expect(deckBodySize(true)).toBe(98);
  });
});

describe("landTarget", () => {
  it("is 37 for a single commander", () => {
    expect(landTarget(false)).toBe(37);
  });

  it("drops to 36 for a pair, so the missing slot comes out of the lands", () => {
    expect(landTarget(true)).toBe(36);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/lib/decks/deck-size.test.ts`
Expected: FAIL — `Failed to resolve import "./deck-size"`.

- [ ] **Step 3: Write the module**

```ts
// src/lib/decks/deck-size.ts
//
// A Commander deck is 100 cards including its commanders, so the body is
// 100 minus however many commanders the deck has. 99 is not a rule of the
// format; 100 is.

const DECK_TOTAL = 100;

export function deckBodySize(hasPartner: boolean): number {
  return DECK_TOTAL - (hasPartner ? 2 : 1);
}

// The pair's missing slot comes out of the elastic lands and never out of a
// role target: a deck does not need less removal because it has two
// commanders, and it does need one fewer land because it draws one fewer.
export function landTarget(hasPartner: boolean): number {
  return hasPartner ? 36 : 37;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/lib/decks/deck-size.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Retire the constants at their definitions**

In `src/lib/decks/suggest.ts`, `const MAX = 99;` and `export const LAND_TARGET = 37;` become
parameters. Change the suggestion entry point's signature to take `hasPartner: boolean` and
compute both from `deck-size.ts`:

```ts
import { deckBodySize, landTarget } from "./deck-size";
```

Delete the two module-level constants. Every read of `MAX` inside the file becomes
`deckBodySize(hasPartner)` and every read of `LAND_TARGET` becomes `landTarget(hasPartner)`,
both computed once at the top of the function that used them. Keep `LAND_TARGET` exported as a
**function** rather than re-exporting a constant, so no caller can read a stale 37.

In `src/lib/decks/fill.ts`, `FILL_BASELINE_TOTAL` at :38-39 currently sums the non-land role
targets and adds `LAND_TARGET`. It becomes:

```ts
export function fillBaselineTotal(hasPartner: boolean): number {
  return NON_LAND_ROLES.reduce((n, r) => n + ROLE_TARGETS[r], 0) + landTarget(hasPartner);
}
```

Leave `NONBASIC_LAND_CAP = 12` at :49 alone — a cap is not a target and does not move.

In `src/lib/decks/status.ts`, `statusPill` compares against **bare `99` literals** at :69-70
(`if (args.built < 99) return "Building"; if (args.built > 99) return "Over";`) — it does *not*
import `MATURE_DECK_SIZE`, so there is no import to delete here. Add `bodySize: number` to the
`statusPill` args object and compare against that. Fix every caller; `statusPill` is called from
`read.ts` and from the status tests.

- [ ] **Step 6: Retire `MATURE_DECK_SIZE` at every consumer, in one pass**

The constant is defined at **`src/lib/decks/availability.ts:11`** and is referenced at eleven
sites. Deleting the definition breaks all of them at once, so **this step converts every one**
— there is no intermediate state where the tree type-checks with the definition gone and some
consumers still reading it. Tasks 4, 5, 14 and 15 then inherit already-converted lines and
change only the surrounding behaviour.

Run: `pnpm exec grep -rn "MATURE_DECK_SIZE" src/` and expect exactly these:

| Site | Conversion |
|---|---|
| `availability.ts:11` | delete the export; rewrite the doc comment at :23 that names it |
| `availability.ts:23` | the comment now points at `deck-size.ts` |
| `read.ts:14` | drop the import |
| `read.ts:411` | Task 4 owns this — it is inside `canFlip` |
| `availability-query.ts:3,76,147` | Task 5 owns these — **note :147, a second maturity test in `skip_deck` that the spec never mentions** |
| `status-style.ts:18,80` | `(built / MATURE_DECK_SIZE) * 100` becomes `(built / bodySize) * 100`; thread `bodySize` in as an argument |
| `deck-rail.tsx:15,54,142` | Task 14 owns :142; :54 is `detailOver(deck.built - MATURE_DECK_SIZE)` and derives the same way |
| `deck-card.tsx:4,63,127` | **the `/decks` tile.** :127 prints `${deck.built} / ${MATURE_DECK_SIZE}` and :63 is the same over-count as the rail. Both derive from `deck.partnerName !== null`. |

**Correction to the spec's §6 reading.** §6 says `/decks` tiles "render no commander", and that
is true of the commander *portrait* — but the tile does render the deck's **count**, so a pair
tile would otherwise read `/ 99` and draw its status bar percentage against 99. `deck-card.tsx`
is therefore a real site, not a no-op. It carries no other pair signal, consistent with decision
21's ruling for the rail.

- [ ] **Step 6b: Verify the tile and the bar**

Run: `pnpm exec grep -rn "MATURE_DECK_SIZE" src/`
Expected: **no output.**

- [ ] **Step 7: Run the full suite**

Run: `pnpm typecheck && pnpm test`
Expected: PASS. Existing tests that asserted 99 still pass, because `deckBodySize(false)` is 99.

- [ ] **Step 8: Commit**

```bash
git add src/lib/decks/deck-size.ts src/lib/decks/deck-size.test.ts src/lib/decks/availability.ts src/lib/decks/status.ts src/lib/decks/status-style.ts src/lib/decks/suggest.ts src/lib/decks/fill.ts src/lib/decks/read.ts src/lib/decks/availability-query.ts src/components/decks/deck-card.tsx src/components/home/deck-rail.tsx src/components/home/resume-decks.tsx
git commit -m "refactor(decks): derive the deck ceiling from the commander count"
```

---

### Task 4: Reading the partner

**Files:**
- Modify: `src/lib/decks/read.ts:85-112` (`DeckDetail`), `:114-142` (`getDeckDetail`), `:230-255` (`DeckListItem`), `:344-371` (`listDecksWithStats`), `:410-412` (`canFlip`)
- Test: `src/lib/decks/read.test.ts` (extend if present; create if not)

**Interfaces:**
- Consumes: `deckBodySize` from Task 3, `decks.partnerOracleId` from Task 2.
- Produces:
  ```ts
  // Exactly the inline shape `DeckDetail.commander` already has at read.ts:90-99,
  // extracted to a name so the partner field can reuse it. Do not drop a key —
  // `manaCost` in particular is read by consumers.
  type DeckCommander = { /* the existing commander shape, verbatim */ };
  type DeckDetail = { /* ...existing... */ commander: DeckCommander; partner: DeckCommander | null };
  type DeckListItem = {
    /* ...existing... */
    partnerName: string | null;
    partnerColorIdentity: string[] | null;
  };
  ```

- [ ] **Step 1: Widen `DeckDetail`**

`getDeckDetail(deckId, userId)` at :114 — **note the argument order; it is not `(userId, deckId)`** —
runs a deck row query at :116-125 and a commander card query at :130-142. Give the commander
query both ids and split the result:

```ts
const commanderIds = [row.commanderOracleId, ...(row.partnerOracleId ? [row.partnerOracleId] : [])];
const commanderRows = await db
  .select({ /* ...the existing projection, unchanged... */ })
  .from(cards)
  .where(inArray(cards.oracleId, commanderIds));

const commander = commanderRows.find((c) => c.oracleId === row.commanderOracleId);
if (!commander) return null;
const partner = row.partnerOracleId
  ? (commanderRows.find((c) => c.oracleId === row.partnerOracleId) ?? null)
  : null;
```

**Keep the projection exactly as it is.** It already selects `oracleText` at :137 and
`manaCost` at :94's consumer — dropping or "adding" either would be a regression. The only
change to the query is `eq` → `inArray`; add `inArray` to the `drizzle-orm` import.

`DeckDetail` gains `partner: DeckCommander | null`. Factor the existing inline commander shape
into the named `DeckCommander` type so both fields share it, key for key.

- [ ] **Step 2: Widen `DeckListItem`**

`listDecksWithStats` at :344-371 does `.innerJoin(cards, eq(decks.commanderOracleId, cards.oracleId))`
at :359 and groups at :362-370. The partner is a *second* join to the same table, so it needs an
alias and it must be a **left** join — most decks have no partner:

```ts
import { alias } from "drizzle-orm/pg-core";

const partnerCards = alias(cards, "partner_cards");
```

Add to the select projection:

```ts
partnerName: partnerCards.name,
partnerColorIdentity: partnerCards.colorIdentity,
```

Add the join after the existing inner join:

```ts
.leftJoin(partnerCards, eq(decks.partnerOracleId, partnerCards.oracleId))
```

and add both new columns to the `groupBy` list at :362-370. A left join over a null column
yields nulls, so single decks read exactly as they do today.

Do **not** add `partnerImageUri` or `partnerArtCropUri`. Decision 21 rules the resume portrait
structural and the rail spine 26px; neither surface draws partner art, so selecting it would be
a column no reader consumes.

- [ ] **Step 3: Make the maturity test inside `canFlip` per-deck**

`canFlip` is **not** a `DeckListItem` field. It is a local aggregate gate at :410-412 deciding
whether a second query runs at all:

```ts
const canFlip = rows.some(
  (r) => r.built === MATURE_DECK_SIZE && r.ownedCount === r.built && r.unresolvedCount === 0,
);
```

Change **only** the first conjunct, keeping the `.some()` and both other conditions:

```ts
const canFlip = rows.some(
  (r) =>
    r.built === deckBodySize(r.partnerName !== null) &&
    r.ownedCount === r.built &&
    r.unresolvedCount === 0,
);
```

- [ ] **Step 4: Extract the maturity predicate so it can be tested**

`read.test.ts` mocks `db` as `{}` and tests only this file's **pure** exports, so
`getDeckDetail` and `listDecksWithStats` cannot be unit-tested here (see "There is no live-database
test harness"). What *can* be tested is the predicate Step 3 changed — so extract it:

```ts
// read.ts — exported so read.test.ts can reach it without a database.
export function deckIsFlippable(r: {
  built: number;
  partnerName: string | null;
  ownedCount: number;
  unresolvedCount: number;
}): boolean {
  return (
    r.built === deckBodySize(r.partnerName !== null) &&
    r.ownedCount === r.built &&
    r.unresolvedCount === 0
  );
}
```

`canFlip` at :410-412 becomes `rows.some(deckIsFlippable)`. Then in `read.test.ts`:

```ts
describe("deckIsFlippable", () => {
  it("flips a single-commander deck at 99", () => {
    expect(
      deckIsFlippable({ built: 99, partnerName: null, ownedCount: 99, unresolvedCount: 0 }),
    ).toBe(true);
  });

  it("flips a pair deck at 98, and not at 99", () => {
    expect(
      deckIsFlippable({ built: 98, partnerName: "Kratos", ownedCount: 98, unresolvedCount: 0 }),
    ).toBe(true);
    expect(
      deckIsFlippable({ built: 99, partnerName: "Kratos", ownedCount: 99, unresolvedCount: 0 }),
    ).toBe(false);
  });

  it("still refuses a mature deck holding an unresolved row", () => {
    expect(
      deckIsFlippable({ built: 98, partnerName: "Kratos", ownedCount: 98, unresolvedCount: 1 }),
    ).toBe(false);
  });

  it("still refuses a mature deck the player does not fully own", () => {
    expect(
      deckIsFlippable({ built: 98, partnerName: "Kratos", ownedCount: 90, unresolvedCount: 0 }),
    ).toBe(false);
  });
});
```

The last two cases are the regression guard for Step 3: they cover the two conjuncts that were
**not** supposed to change.

- [ ] **Step 5: Run, and mind the second argument**

`listDecksWithStats(userId, sort)` takes a **required** `sort` argument at :283. The join and
groupBy edits must leave it and its ordering alone.

Run: `pnpm typecheck && pnpm test src/lib/decks/`
Expected: PASS.

The two queries themselves are proved in Task 16's manual walk, which is the only place a real
database is involved.

- [ ] **Step 6: Commit**

```bash
git add src/lib/decks/read.ts src/lib/decks/read.test.ts
git commit -m "feat(decks): read a deck's partner commander"
```

---

### Task 5: The availability claim

Two commanders claim two cards from the collection, and a pair deck is mature at 98.

**Files:**
- Modify: `src/lib/decks/availability-query.ts:52-61` (`all_claims`), `:76` (maturity in `claim_decks_all`), `:147` (**a second maturity test in `skip_deck` the spec never mentions**)

**Interfaces:**
- Consumes: `decks.partnerOracleId`.
- Produces: no type change. The claim rows and the `mature` boolean change value only.

- [ ] **Step 1: Add the partner arm to `all_claims`**

The CTE at :52-61 has an arm reading commander claims:

```sql
select d.id as deck_id, d.commander_oracle_id as oracle_id, 1 as quantity
from decks d where d.user_id = ${userId}
```

Add a second arm unioned to it:

```sql
union all
select d.id as deck_id, d.partner_oracle_id as oracle_id, 1 as quantity
from decks d where d.user_id = ${userId} and d.partner_oracle_id is not null
```

Use `union all`, matching the CTE's existing arms — a deck cannot claim the same oracle id
twice (the CHECK from Task 2 forbids it), so there is nothing for `union` to dedupe and its
sort would be pure cost.

The header comment at :22-25 says "THE COMMANDER IS NOT A deck_cards ROW". Extend it to say
"NEITHER COMMANDER IS", so the next reader knows the second arm is deliberate.

- [ ] **Step 2: Make maturity per-deck, at both sites**

Line :76, inside the `claim_decks_all` CTE, reads
`coalesce(dt.cards, 0) >= ${MATURE_DECK_SIZE} as mature`. It becomes:

```sql
-- Mirrors deckBodySize() in deck-size.ts. The literal is unavoidable in raw
-- SQL; a change to the format's total must touch both.
coalesce(dt.cards, 0) >= (99 - (case when d.partner_oracle_id is null then 0 else 1 end)) as mature
```

**`d.partner_oracle_id` must also be added to that CTE's `GROUP BY`** (currently
`ac.oracle_id, ac.deck_id, d.name, d.created_at, coalesce(dt.cards,0)` at :65-79). `d.id` is
not in the grouping, so Postgres cannot infer functional dependency and will reject the query
outright. This is a hard error, not a subtlety — the page 500s if it is missed.

Line **:147**, inside `skip_deck`, carries the *same* maturity test and the spec never mentions
it. Apply the identical change there. Left alone, a pair deck is judged against 99 from the
vantage of a deck being viewed, and the claim goes soft when it should be hard.

- [ ] **Step 3: Prove it against a real database**

`availability.test.ts` tests the pure helpers in `availability.ts`; the SQL in
`availability-query.ts` has no test file and no harness could give it one without mocking away
the thing under test. So the proof is a walk, and it is written here as a step rather than left
implicit.

With `pnpm dev` running against local Postgres and signed in as the fixture account:

1. Create a pair deck by importing Task 16's fixture.
2. Open `/collection` and find Atreus. It must show as claimed by that deck. Find Kratos: **it
   must show as claimed too** — before this task it showed as free, because no query knew the
   partner existed.
3. Top the deck off to 98 and confirm the claim reads as a **hard** claim (the mature
   treatment), not a soft one.
4. Open a second, single-commander deck and confirm its claims and maturity are unchanged.

Record the four results in the commit message. If step 2's Kratos row still reads free, the
`union all` arm is not firing; if the page 500s, it is the missing `GROUP BY` column.

- [ ] **Step 4: Run the suite**

Run: `pnpm typecheck && pnpm test src/lib/decks/availability`
Expected: PASS, including every pre-existing single-commander case in `availability.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/decks/availability-query.ts
git commit -m "feat(decks): claim both commanders and mature a pair at 98"
```

---

### Task 6: Union colour identity

The bug that makes the motivating deck unusable: half its cards are unaddable because identity
is measured against the primary alone.

**Files:**
- Modify: `src/lib/decks/add-validation.ts:42-55`
- Test: `src/lib/decks/add-validation.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  ```ts
  type DeckContextForValidation = {
    commanderOracleId: string;
    commanderColorIdentity: string[];
    partnerOracleId: string | null;
    partnerColorIdentity: string[] | null;
  };
  export function validateCardForDeck(card: CardForValidation, deck: DeckContextForValidation): DeckAddRejection | null;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
it("accepts a card inside the union of a pair's identities", () => {
  const deck = {
    commanderOracleId: ATREUS,
    commanderColorIdentity: ["R", "W"],
    partnerOracleId: KRATOS,
    partnerColorIdentity: ["U", "R"],
  };
  const card = { oracleId: OTHER, commanderLegal: true, colorIdentity: ["U", "W"] };
  expect(validateCardForDeck(card, deck)).toBeNull();
});

it("still refuses a card outside the union", () => {
  const deck = {
    commanderOracleId: ATREUS,
    commanderColorIdentity: ["R", "W"],
    partnerOracleId: KRATOS,
    partnerColorIdentity: ["U", "R"],
  };
  const card = { oracleId: OTHER, commanderLegal: true, colorIdentity: ["B"] };
  expect(validateCardForDeck(card, deck)).toBe("off-color-identity");
});

it("refuses the partner as a deck card", () => {
  const deck = {
    commanderOracleId: ATREUS,
    commanderColorIdentity: ["R", "W"],
    partnerOracleId: KRATOS,
    partnerColorIdentity: ["U", "R"],
  };
  const card = { oracleId: KRATOS, commanderLegal: true, colorIdentity: ["U", "R"] };
  expect(validateCardForDeck(card, deck)).toBe("is-commander");
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/lib/decks/add-validation.test.ts`
Expected: FAIL — the union case returns `"off-color-identity"`, the partner case returns `null`.

- [ ] **Step 3: Widen the function**

```ts
export function validateCardForDeck(
  card: CardForValidation,
  deck: DeckContextForValidation,
): DeckAddRejection | null {
  if (!card.commanderLegal) return "not-commander-legal";

  // A pair's identity is the union of both commanders'. Measuring against the
  // primary alone is what made half a Jeskai pair deck unaddable.
  const identitySet = new Set([
    ...deck.commanderColorIdentity,
    ...(deck.partnerColorIdentity ?? []),
  ]);
  if (!card.colorIdentity.every((c) => identitySet.has(c))) return "off-color-identity";

  if (card.oracleId === deck.commanderOracleId || card.oracleId === deck.partnerOracleId) {
    return "is-commander";
  }
  return null;
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm test src/lib/decks/add-validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Fix every caller**

Run: `pnpm exec grep -rn "validateCardForDeck" src/`

Every call site must now pass the two new fields. Callers reading a `DeckDetail` take them from
`detail.partner`; callers reading a raw deck row take them from the joined partner card.

Also widen `ownedColorLegalPool` at `src/app/decks/actions.ts:45-63`, whose identity filter at
:61-62 carries the same single-commander assumption. It is a private helper with one caller
(`getDeckSuggestions`), so change its second parameter from one commander to a list:

```ts
async function ownedColorLegalPool(
  userId: string,
  commanders: Pick<PoolCard, "oracleId" | "colorIdentity">[],
): Promise<SuggestionPoolCard[]> {
  // ...unchanged query...
  const identity = new Set(commanders.flatMap((c) => c.colorIdentity));
  const commanderIds = new Set(commanders.map((c) => c.oracleId));
  return owned.filter(
    (c) => !commanderIds.has(c.oracleId) && c.colorIdentity.every((x) => identity.has(x)),
  );
}
```

Its one caller at :297 becomes `ownedColorLegalPool(userId, [commander])` in this task; Task 10
Step 4 is what puts the partner in that array, once it has read the partner row.

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/decks/add-validation.ts src/lib/decks/add-validation.test.ts src/app/decks/actions.ts
git commit -m "fix(decks): measure colour identity against both commanders"
```

---

### Task 7: The import reads two commanders

**Files:**
- Modify: `src/lib/decks/import.ts:22-32` (`ImportNote`), `:34-68` (`DeckImport`), `:172-250` (the commander loop), `:287-302` (`commanderSectionLines`, currently private and returning `number[]`)
- Test: `src/lib/decks/import.test.ts`

**Interfaces:**
- Consumes: `partnerAbility`, `canPair` from Task 1.
- Produces:
  ```ts
  type DeclaredCommander = { oracleId: string; name: string; sourceLine: number };
  type DeckImport = {
    /* ...existing... */
    declaredCommander: DeclaredCommander | null;
    declaredPartner: DeclaredCommander | null;
  };
  export function commanderSectionLines(text: string): number[];
  ```
  `ImportNote`'s `extraCommanderDeclared` member is **removed**; a new
  `{ kind: "thirdCommanderDeclared"; name: string; sourceLine: number }` replaces it.

- [ ] **Step 1: Write the failing tests**

**Two things about the harness before writing a line.** `buildDeckImport` takes **one object**,
`DeckImportInput` — `{ catalog, text }` or `{ catalog, rows }`, never two positional arguments.
`import.test.ts` already wraps this in a local helper at :47-48, `build(text)`, and these tests
use it. And a commander is only *declared* when a `Commander` header or a `*CMDR*` flag marks
the line (`commanderLines` is populated at :179-190) — a bare first line declares nothing. Every
fixture below therefore carries the header, or it fails for a reason unrelated to partners.

Add `ATREUS`, `KRATOS` and `ISHAI` to the file's existing `card({ ... })` fixtures, giving each
the `oracleText` its partner ability needs.

```ts
it("reads two declared commanders as a pair", () => {
  const result = build("Commander\n1 Atreus, God of War\n1 Kratos, God of War\n\nDeck\n1 Sol Ring");
  expect(result.declaredCommander?.name).toBe("Atreus, God of War");
  expect(result.declaredPartner?.name).toBe("Kratos, God of War");
  expect(result.declaredPartner?.sourceLine).toBe(3);
});

it("keeps neither commander in the card rows", () => {
  const result = build("Commander\n1 Atreus, God of War\n1 Kratos, God of War\n\nDeck\n1 Sol Ring");
  expect(result.cards.map((c) => c.oracleId)).toEqual([SOL_RING.oracleId]);
});

it("takes a third declared commander as a note and drops it", () => {
  const result = build(
    "Commander\n1 Atreus, God of War\n1 Kratos, God of War\n1 Ishai, Ojutai Dragonspeaker\n\nDeck\n1 Sol Ring",
  );
  expect(result.declaredPartner?.name).toBe("Kratos, God of War");
  expect(result.notes).toContainEqual({
    kind: "thirdCommanderDeclared",
    name: "Ishai, Ojutai Dragonspeaker",
    sourceLine: 4,
  });
});

it("leaves a single declared commander alone", () => {
  const result = build("Commander\n1 Atreus, God of War\n\nDeck\n1 Sol Ring");
  expect(result.declaredCommander?.name).toBe("Atreus, God of War");
  expect(result.declaredPartner).toBeNull();
});
```

The note's line field is named **`sourceLine`**, matching every other note kind in the union.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/lib/decks/import.test.ts`
Expected: FAIL — `declaredPartner` is undefined.

- [ ] **Step 3: Widen the parser**

In `ImportNote` at :22-32, delete the `extraCommanderDeclared` member and add:

```ts
| { kind: "thirdCommanderDeclared"; name: string; sourceLine: number }
```

In `DeckImport` at :34-68, add `declaredPartner: DeclaredCommander | null;` beside the existing
`declaredCommander` at :59, and factor the inline shape into the named `DeclaredCommander` type.

At :202-219, the loop assigns the first commander and pushes `extraCommanderDeclared` for every
subsequent one. It becomes: first fills `declaredCommander`, second fills `declaredPartner`,
third and beyond push `thirdCommanderDeclared`. Keep the existing dedupe-silently branch at
:208 exactly as it is — a list naming the same commander twice is a duplicate line, not a pair,
and the CHECK from Task 2 would reject it anyway.

At :246-250, the post-loop delete removes the commander from the card rows. Widen it to remove
the partner too.

Export `commanderSectionLines` at :288 — Task 9's exporter needs the same section shape, and
duplicating it would let the two drift.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm test src/lib/decks/import.test.ts`
Expected: PASS. Any pre-existing test asserting `extraCommanderDeclared` must be updated to the
new note kind in the same commit — that is the point of the rename.

- [ ] **Step 5: Commit**

```bash
git add src/lib/decks/import.ts src/lib/decks/import.test.ts
git commit -m "feat(decks): parse a pasted list declaring two commanders"
```

---

### Task 8: Writing the pair

**Files:**
- Modify: `src/app/decks/import-actions.ts:142-171`, `:249`
- Modify: `src/app/decks/actions.ts:181-193` (`createDeck`)
- Test: `src/app/decks/import-actions.test.ts`

**Interfaces:**
- Consumes: `partnerAbility`, `canPair`, `DeckImport.declaredPartner`.
- Produces:
  ```ts
  export async function createDeck(
    commanderOracleId: string,
    name: string,
    selectedOracleIds?: string[],
    partnerOracleId?: string | null,
  ): Promise<...>;
  ```
  `partnerOracleId` is last and optional, so no existing caller changes.

- [ ] **Step 1: Write the failing test**

These go in `import-actions.test.ts`, which already stands up a hand-written Drizzle fake in a
`vi.hoisted` block — **there is no database.** The fake records every insert in
`state.inserts`, which is how the assertions below see what was written. Read the top 60 lines
of that file and extend its `state.cards` fixtures with Atreus, Kratos and Ishai (each needing
an `oracleText`) rather than inventing a new harness.

```ts
it("writes both commanders and files neither as a deck card", async () => {
  const result = await importDeck({
    userId: USER,
    text: "Commander\n1 Atreus, God of War\n1 Kratos, God of War\n\nDeck\n1 Sol Ring",
    name: "Father and son",
  });

  const deckInsert = stub.state.inserts.find((i) => "commanderOracleId" in i.values);
  expect(deckInsert?.values.commanderOracleId).toBe(ATREUS);
  expect(deckInsert?.values.partnerOracleId).toBe(KRATOS);

  const cardInserts = stub.state.inserts.filter((i) => "quantity" in i.values);
  expect(cardInserts.map((i) => i.values.oracleId)).toEqual([SOL_RING]);
});

it("accepts an illegally paired declaration and notes it", async () => {
  const result = await importDeck({
    userId: USER,
    text: "Commander\n1 Atreus, God of War\n1 Ishai, Ojutai Dragonspeaker\n\nDeck\n1 Sol Ring",
    name: "Nope",
  });

  expect(result.notes).toContainEqual({
    kind: "illegalPairDeclared",
    primary: "Atreus, God of War",
    partner: "Ishai, Ojutai Dragonspeaker",
  });

  const deckInsert = stub.state.inserts.find((i) => "commanderOracleId" in i.values);
  expect(deckInsert?.values.partnerOracleId).toBe(ISHAI);
});
```

Adjust the `stub.state` accessor to whatever the file's hoisted block actually exposes; the
shape above is the file's own pattern, not a new one.

The second case encodes the spec's ruling: an illegal pair the paste declares is **imported**
with a note, not refused. Add `{ kind: "illegalPairDeclared"; primary: string; partner: string }`
to `ImportNote`.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/app/decks/import-actions.test.ts`
Expected: FAIL — `partnerOracleId` is null.

- [ ] **Step 3: Wire the write path**

At :142, `commanderOracleId` resolves from the input or the declaration. Add beside it:

```ts
const partnerOracleId = input.partnerOracleId ?? result.declaredPartner?.oracleId ?? null;
```

At :157-160 the crafted-request re-validation runs. Add the pair re-check there, server-side —
a crafted request must not be able to write a pair the picker would never have offered, and a
*declared* pair must not be silently upgraded to legal:

```ts
if (partnerOracleId) {
  // The re-validation at :157-160 already reads the commander card. Widen that
  // same query to both ids rather than adding a second round trip.
  const commanderCards = await db
    .select({ oracleId: cards.oracleId, name: cards.name, oracleText: cards.oracleText })
    .from(cards)
    .where(inArray(cards.oracleId, [commanderOracleId, partnerOracleId]));

  const primaryCard = commanderCards.find((c) => c.oracleId === commanderOracleId);
  const partnerCard = commanderCards.find((c) => c.oracleId === partnerOracleId);
  if (!primaryCard || !partnerCard) return { ok: false, reason: "commanderNotFound" } as const;

  if (!canPair(partnerAbility(primaryCard.oracleText), partnerAbility(partnerCard.oracleText))) {
    if (input.partnerOracleId) return { ok: false, reason: "invalidPair" } as const;
    notes.push({
      kind: "illegalPairDeclared",
      primary: primaryCard.name,
      partner: partnerCard.name,
    });
  }
}
```

**Match the action's existing failure discriminant.** `importDeck` returns `{ ok: false, reason }`,
not `{ kind }`. Read its declared return type before writing this, reuse whatever `reason`
values it already has for a missing commander, and add only `"invalidPair"` to that union.

The asymmetry is deliberate and is the spec's ruling: a pair the *user* picked in the UI is
refused, because the UI never offered it; a pair the *paste* declared is kept with a note,
because the paste is the record of a deck that exists.

At :163, the deck-card filter becomes:

```ts
const deckCardValues = result.cards.filter(
  (c) => c.oracleId !== commanderOracleId && c.oracleId !== partnerOracleId,
);
```

At :168-171, the insert takes `{ userId, name, commanderOracleId, partnerOracleId }`.

At :249, `resolveUnresolvedRow`'s own guard `oracleId !== deck.commanderOracleId` gains the
partner: an unresolved row that later resolves to the partner must not become a deck card.

In `src/app/decks/actions.ts:181-193`, `createDeck` takes the optional fourth argument, runs the
same `canPair` re-validation (refusing on failure, since this path is always user-picked), and
writes the column.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm test src/app/decks/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/decks/import-actions.ts src/app/decks/actions.ts src/app/decks/import-actions.test.ts src/lib/decks/import.ts
git commit -m "feat(decks): write both commanders on import and create"
```

---

### Task 9: Export round-trips the pair

**Files:**
- Modify: `src/lib/decks/export-helpers.ts:9-17` (`buildDecklistText`)
- Test: `src/lib/decks/export-helpers.test.ts`

**Interfaces:**
- Consumes: `commanderSectionLines` exported in Task 7 (for the round-trip test only).
- Produces:
  ```ts
  export function buildDecklistText(args: {
    commanderName: string;
    partnerName: string | null;
    cards: { quantity: number; name: string }[];
  }): string;
  ```

- [ ] **Step 1: Write the failing test**

```ts
it("emits a Commander section holding both, and round-trips through the parser", () => {
  const text = buildDecklistText({
    commanderName: "Atreus, God of War",
    partnerName: "Kratos, God of War",
    cards: [{ quantity: 1, name: "Lightning Bolt" }],
  });
  expect(text).toBe("Commander\n1 Atreus, God of War\n1 Kratos, God of War\n\nDeck\n1 Lightning Bolt");

  const back = buildDeckImport({ text, catalog });
  expect(back.declaredCommander?.name).toBe("Atreus, God of War");
  expect(back.declaredPartner?.name).toBe("Kratos, God of War");
  expect(back.cards.map((c) => c.name)).toEqual(["Lightning Bolt"]);
});

it("emits the section for a single commander too, so one shape covers both", () => {
  const text = buildDecklistText({
    commanderName: "Atreus, God of War",
    partnerName: null,
    cards: [{ quantity: 1, name: "Lightning Bolt" }],
  });
  expect(text).toBe("Commander\n1 Atreus, God of War\n\nDeck\n1 Lightning Bolt");
});
```

The second case is a deliberate change to single-deck export output. The old bare-first-line
form parses correctly only by the convention that the first line is the commander; the explicit
section says so. One shape for both is worth the changed bytes, and the round-trip test proves
nothing is lost.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/lib/decks/export-helpers.test.ts`
Expected: FAIL — the current output has no section markers.

- [ ] **Step 3: Write it**

```ts
export function buildDecklistText({ commanderName, partnerName, cards }: DeckToTextArgs): string {
  const commanders = [commanderName, ...(partnerName ? [partnerName] : [])];
  return [
    "Commander",
    ...commanders.map((n) => `1 ${n}`),
    "",
    "Deck",
    ...cards.map((c) => `${c.quantity} ${c.name}`),
  ].join("\n");
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm test src/lib/decks/export-helpers.test.ts`
Expected: PASS.

- [ ] **Step 5: Fix the callers**

Run: `pnpm exec grep -rn "export-helpers\|buildDecklistText" src/`
Every caller passes `partnerName` from the `DeckDetail` widened in Task 4.

Run: `pnpm typecheck`

- [ ] **Step 6: Commit**

```bash
git add src/lib/decks/export-helpers.ts src/lib/decks/export-helpers.test.ts
git commit -m "feat(decks): export both commanders in a Commander section"
```

---

### Task 10: Merged advice

Two mechanisms, not one. The spec describes this as a single lookup change; it is not.

**Files:**
- Modify: `src/app/commanders/[slug]/synergy-read.ts:24-28`, `:47`, `:48-55`
- Modify: `src/app/decks/actions.ts:291-308` (`getDeckSuggestions`)
- Modify: `src/app/decks/[id]/page.tsx:36`, `:49`
- Create: `src/lib/edhrec/merge.ts`
- Test: `src/lib/edhrec/merge.test.ts`

The DB half of this task has **no test file.** `readSynergyCards` is one query and nothing else;
mocking `db` would mock away the merge itself, and there is no live-database harness (see Global
Constraints). Its verification is the manual walk in Step 6, written out. The EDHREC half is pure
and gets real unit tests, which is why `mergeEdhrecData` lives in its own module.

**Interfaces:**
- Consumes: `DeckDetail.partner`, `synergyStateFrom` from `src/lib/recs/synergy-state.ts`.
- Produces:
  ```ts
  export async function readSynergyCards(
    userId: string,
    commanderOracleIds: string[],   // was: commanderOracleId: string
    coveredOracleIds: string[],
  ): Promise<SynergyCard[]>;
  ```

- [ ] **Step 1: Write the failing test for the pure half**

Create `src/lib/edhrec/merge.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mergeEdhrecData } from "./merge";
import type { EdhrecData } from "./parse";

// The six commander-level fields are inert here but the type requires them.
const base: EdhrecData = {
  topCards: [], inclusionByName: {}, synergyByName: {},
  tags: [], bracketCounts: {}, budgetCounts: {}, similarNames: [],
  deckCount: null, rank: null, saltScore: null,
};
const A: EdhrecData = { ...base, topCards: ["Bolt", "Sol Ring"], inclusionByName: { Bolt: 0.4 }, synergyByName: { Bolt: 0.1 } };
const B: EdhrecData = { ...base, topCards: ["Bolt", "Path"], inclusionByName: { Bolt: 0.2 }, synergyByName: { Bolt: 0.9 }, rank: 7 };

describe("mergeEdhrecData", () => {
  it("returns null when every input is null", () => {
    expect(mergeEdhrecData([null, null])).toBeNull();
  });

  it("returns the one input unchanged when the other is null", () => {
    expect(mergeEdhrecData([A, null])).toEqual(A);
  });

  it("unions topCards, deduped, primary's order first", () => {
    expect(mergeEdhrecData([A, B])?.topCards).toEqual(["Bolt", "Sol Ring", "Path"]);
  });

  it("takes the better of the two figures per card", () => {
    const merged = mergeEdhrecData([A, B]);
    expect(merged?.inclusionByName.Bolt).toBe(0.4);
    expect(merged?.synergyByName.Bolt).toBe(0.9);
  });

  it("keeps the primary's commander-level facts", () => {
    expect(mergeEdhrecData([A, B])?.rank).toBeNull();
  });
});
```

The dedupe order matters: the primary's list leads, so a single-commander deck's suggestion order
is unchanged by this task. That is the regression guard for the live path.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/lib/edhrec/merge.test.ts`
Expected: FAIL — `./merge` does not exist.

- [ ] **Step 3: Widen the DB read**

At :47, `.where(eq(commanderSupportCards.commanderOracleId, commanderOracleId))` becomes
`.where(inArray(commanderSupportCards.commanderOracleId, commanderOracleIds))`.

At :48-55, the `groupBy` currently lists `inclusion` and `synergy`. **Drop those two from the
groupBy** and wrap them in the projection:

```ts
inclusion: max(commanderSupportCards.inclusion),
synergy: max(commanderSupportCards.synergy),
```

Import `max` from `drizzle-orm`. Everything else in the groupBy — `oracleId`, `name`,
`typeLine`, `manaCost` — is a property of the card and stays.

No pair branch. Over one id the grouped max is the row itself.

**`ownedQuantity` must stop coming from the join, or it silently doubles.** At :37 it is
`coalesce(sum(collectionItems.quantity), 0)::int` over a `leftJoin` (:41-47). With `eq` there is
exactly one `commander_support_cards` row per oracle id, so that sum is right. With `inArray`
over two commanders, a card both commanders support produces **two** support rows, the leftJoin
fans each of them out against the collection, and the sum returns twice the copies owned. The
regression guard in Step 1 cannot see this — over one id the behaviour is unchanged, which is
precisely why the bug would ship.

So delete the `leftJoin` at :41-47 entirely, drop `collectionItems` from the imports if nothing
else in the file uses it, and compute the figure from a correlated subselect that does not
multiply with the outer row count:

```ts
ownedQuantity: sql<number>`coalesce((
  select sum(ci.quantity) from ${collectionItems} ci
  where ci.oracle_id = ${commanderSupportCards.oracleId}
    and ci.user_id = ${userId}
), 0)::int`,
```

The subselect is not an aggregate of the outer query, so it needs no `groupBy` entry. `owned` at
:78 still reads `r.ownedQuantity > 0` and nothing downstream changes.

This is the one behaviour the walk in Step 6 exists to check by hand.

- [ ] **Step 4: Write the pure merge module**

Create `src/lib/edhrec/merge.ts`. `EdhrecData` is already exported from
`src/lib/edhrec/client.ts`; import the type from there rather than restating it.

`EdhrecData` (`src/lib/edhrec/parse.ts:3-19`) has nine fields, not three. Three of them —
`topCards`, `inclusionByName`, `synergyByName` — are statements about *cards*, and those merge.
The other six — `tags`, `bracketCounts`, `budgetCounts`, `similarNames`, `deckCount`, `rank`,
`saltScore` — are statements about *one commander*, and there is no meaningful union of two
commanders' rank or salt score. Keep the primary's, by spreading it.

```ts
import type { EdhrecData } from "./parse";

/** A pair's card advice is the union of both commanders' lists, scored by the
 *  better of the two. Kept out of `client.ts` because it touches no network. */
export function mergeEdhrecData(datas: (EdhrecData | null)[]): EdhrecData | null {
  const present = datas.filter((d): d is EdhrecData => d !== null);
  if (present.length === 0) return null;
  if (present.length === 1) return present[0];

  const best = (pick: (d: EdhrecData) => Record<string, number>) => {
    const out: Record<string, number> = {};
    for (const d of present) {
      for (const [name, value] of Object.entries(pick(d))) {
        const seen = out[name];
        out[name] = seen === undefined ? value : Math.max(seen, value);
      }
    }
    return out;
  };

  // The primary's commander-level facts survive: a pair has no joint rank.
  return {
    ...present[0],
    topCards: [...new Set(present.flatMap((d) => d.topCards))],
    inclusionByName: best((d) => d.inclusionByName),
    synergyByName: best((d) => d.synergyByName),
  };
}
```

`new Set` preserves insertion order, so the primary's list leads and a single-commander deck's
order is untouched. Returning `present[0]` by reference in the one-input case is what makes the
second test's `toEqual(A)` hold exactly.

Run: `pnpm test src/lib/edhrec/merge.test.ts`
Expected: PASS.

- [ ] **Step 5: Merge the live EDHREC path**

`getDeckSuggestions` at :291 has **no `DeckDetail` in scope** — it holds `deck` (the raw row from
`requireDeck`) and `commander` (a `cards` row read at :294). So it reads the partner itself, from
the column Task 2 added. After the `if (!commander)` guard at :295, insert:

```ts
// The partner is a second commander for every purpose below: the pool it
// legalises, the advice it contributes, and the card it must not suggest.
const [partner] = deck.partnerOracleId
  ? await db.select().from(cards).where(eq(cards.oracleId, deck.partnerOracleId))
  : [];
const commanders = partner ? [commander, partner] : [commander];
```

Then `ownedColorLegalPool(userId, commander)` at :297 becomes
`ownedColorLegalPool(userId, commanders)` — the list form Task 6 introduced — and
`suggestDeck({ commander, ... })` at :319 is left alone: it scores against one commander's
profile, and the pair's contribution arrives through the merged EDHREC data below.

Line :307 calls `getEdhrecData(commander.oracleId, commander.name)` and :308 sets
`const degraded = unreachable;`. For a pair, fetch both and merge:

```ts
const results = await Promise.all(commanders.map((c) => getEdhrecData(c.oracleId, c.name)));

// A pair's advice is the union of both lists, scored by the better of the two:
// a card the partner loves is not made worse by the primary not knowing it.
const data = mergeEdhrecData(results.map((r) => r.data));
const degraded = results.some((r) => r.unreachable);
```

Name the merged result `data`, not `merged` — lines :309-312 already read `data?.topCards`,
`data?.inclusionByName` and `data?.synergyByName`, and keeping the name means those three lines
do not change at all.

Import `mergeEdhrecData` from `../../lib/edhrec/merge`, written in Step 4.

The state precedence is `degraded → ok → absent`: if either fetch was unreachable the result is
degraded even when the other returned data, because the list is knowably incomplete.
`synergyStateFrom` already implements exactly this given `{ data, unreachable }`, so pass it the
merged pair and change nothing in `src/lib/recs/synergy-state.ts`.

- [ ] **Step 6: Update the deck page**

`src/app/decks/[id]/page.tsx:36` is `const openSlots = 99 - detail.built;`. It becomes:

```ts
const openSlots = deckBodySize(detail.partner !== null) - detail.built;
```

Line :49 passes one id to `readSynergyCards`; it becomes the array
`[detail.commander.oracleId, ...(detail.partner ? [detail.partner.oracleId] : [])]`.

Line :132 passes `commanderIdentity={detail.commander.colorIdentity}` to `BuilderShell`. It
becomes the union, computed the same way Task 6 computes it. Grep `commanderIdentity` and widen
every consumer that filters a pool by it.

- [ ] **Step 7: Run**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 8: Walk the merged read by hand**

The grouped-max query has no automated test, so verify it against the local database before
committing. `pnpm dev`, then on a pair deck's page:

1. The synergy panel renders rows and does not error — the `groupBy`/`max` rewrite is valid SQL.
2. Pick a card the panel shows as owned and check the collection: **the owned badge must reflect
   the copies you actually hold**, not double. This is the fan-out from Step 3, and it is the
   whole reason this walk exists.
3. Open a single-commander deck. Its panel is byte-for-byte what it was before this task — same
   rows, same order, same figures. Over one id a grouped max is the row itself.
4. `select count(*) from commander_support_cards where commander_oracle_id in (…both ids…)`
   returns more rows than the panel draws, and the panel draws each oracle id exactly once.

- [ ] **Step 9: Commit**

```bash
git add src/app/commanders/ src/app/decks/ src/lib/edhrec/merge.ts src/lib/edhrec/merge.test.ts
git commit -m "feat(decks): merge both commanders' advice by max"
```

Note for the reviewer: Atreus and Kratos may be **absent** from `commander_support` until the
monthly `Commander index` run picks them up. That is designed behaviour, not a bug — the deck
page renders the absent state, which is a state the design already draws.

---

### Task 11: The copy strings

**Files:**
- Modify: `src/lib/copy/deck-import.ts` (add `partnerCopy` under `deckImportCopy.commander`)
- Modify: `src/lib/copy/decks-builder.ts:360-363`

**Interfaces:**
- Consumes: nothing.
- Produces: every string in `design/design_handoff_the99_partners/partners · copy strings.ts`,
  plus `overCopy.figure.denominator` as a **function**:
  ```ts
  denominator: (bodySize: number) => ` / ${bodySize}`,
  ```

- [ ] **Step 1: Copy the strings in verbatim**

Open `design/design_handoff_the99_partners/partners · copy strings.ts` and transcribe the whole
`partnerCopy` object into `src/lib/copy/deck-import.ts` under `deckImportCopy.commander`. Copy
the comments with it — they carry the reasoning for each string and are the record of why the
word is the word.

**One correction while transcribing:** line 57 of the design file says
`commanderShortName(primary.name)`; the helper is `shortCommanderName` at
`src/lib/copy/decks-builder.ts:17`. Line 101 of the same file has it right. Use
`shortCommanderName`.

- [ ] **Step 2: Make the denominator a function**

At `decks-builder.ts:363`, `denominator: " / 99"` becomes:

```ts
denominator: (bodySize: number) => ` / ${bodySize}`,
```

The comment above it at :360-361 currently asserts that "the denominator never becomes the
total: 99 is a rule of the format". **Rewrite it** — for a pair the denominator is 98, and the
sentence as written would be false:

```ts
// The denominator is the deck's body, never its total: a deck is 100 cards
// including its commanders, so a single reads 99 and a pair reads 98. What it
// must never become is the count of cards the deck happens to hold.
```

- [ ] **Step 3: Fix the two readers**

`spine-desktop.tsx:192` and `spine-mobile.tsx:210` read `{overCopy.figure.denominator}`. Both
become `{overCopy.figure.denominator(bodySize)}`, where `bodySize` comes from the spine's props
(Task 13 threads it).

- [ ] **Step 4: Run**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/copy/deck-import.ts src/lib/copy/decks-builder.ts src/components/decks/
git commit -m "feat(copy): the partner strings, and a parameterised denominator"
```

---

### Task 12: The picker's second slot

Decision 20 (the slot's three states) and decision 17 (the only surviving size step).

**Files:**
- Create: `src/components/decks/partner-slot.tsx`
- Modify: `src/components/decks/create-picker.tsx:37-52` (props), `:452-551` (desktop sidebar), `:559-580` (mobile dock), `:156-191` (`handleCreate`)
- Modify: `src/lib/decks/read.ts:461-487` (`OwnedLegalCommander` gains `oracleText` — **already selected at :487**, so this is a type-level change only)
- Modify: `src/lib/decks/import.ts:47-53`, `:234-241` (`legendaryCandidates` gains `oracleText`)

**Interfaces:**
- Consumes: `partnerAbility`, `canPair`, `partnerCopy`.
- Produces:
  ```ts
  type PartnerSlotProps = {
    primary: { oracleId: string; name: string; oracleText: string | null; imageUri: string | null };
    partner: { oracleId: string; name: string; imageUri: string | null } | null;
    proposedFromLine: number | null;
    pairableCount: number;
    onAdd: () => void;
    onChange: () => void;
    onRemove: () => void;
  };
  export function PartnerSlot(props: PartnerSlotProps): React.ReactElement | null;
  ```

- [ ] **Step 1: Write the component**

The three states, straight off decision 20:

- **State A — absent, never disabled.** `PartnerSlot` returns `null` when
  `partnerAbility(primary.oracleText)` is null. A commander that cannot have a partner shows no
  slot, no greyed plate, no explanation. A single-commander sidebar is then **pixel-identical to
  today**, which is the test for this state.
- **State B — the empty plate.** A `38×54` plate at `1px dashed var(--border-dashed)`
  (an existing token, defined per theme at `globals.css:30,95,140`), labelled
  `partnerCopy.addPartner`, with a caption printing the ability verbatim via
  `partnerAbilityLabel` plus the pairable count:
  `partnerCopy.partnerAvailable(ability, n)`, or `partnerCopy.partnerNoneOwned(ability)` at
  `n === 0`. **The plate is still drawn at `n === 0`** — the commander can pair, the player just
  owns nothing to pair it with, and that is a collection fact rather than a disabled control.
  Accessible name is `partnerCopy.addPartnerAria(primary.name)`.
- **State C — the import proposal.** Both slots filled from the paste, caption
  `partnerCopy.proposed(line)`, with `partnerCopy.change` and `partnerCopy.remove` as text
  actions — 11px mono, **not accent** (refresh decision 3 reserves accent for `in use` and
  `to buy`, and a proposal is neither). Accessible name
  `partnerCopy.proposedAria(partner.name)`. **An illegally paired declaration renders
  identically** — the note lives in the import result, not on this surface.

The eyebrows `partnerCopy.primaryLabel` / `partnerCopy.partnerLabel` appear **with the slot and
never before it**: a lone `Commander` label over a single pick is a new word on a shipped
surface for no gain. In import mode the primary's eyebrow is
`partnerCopy.primaryLabelFromSource` instead.

- [ ] **Step 2: Apply the size step in the sidebar**

`create-picker.tsx:472-483` draws a 44×62 thumb. Decision 17 survives **only here**: primary
stays **44×62**, the partner renders **38×54**. Do not apply a size step anywhere else — R2
withdrew decision 16 outright.

- [ ] **Step 3: Re-head the list while picking**

When the partner slot is being filled, the list re-heads with a strip carrying
`partnerCopy.pairingFor(shortCommanderName(primary.name), n)` and
`partnerCopy.pairingCancel`. The list itself filters to commanders where
`canPair(partnerAbility(primary.oracleText), partnerAbility(row.oracleText))`.

`listOwnedLegalCommanders` already selects `oracleText` at `read.ts:487`, so the filter needs no
new query — only `OwnedLegalCommander` at :461-468 widening to carry the field it already
fetches.

- [ ] **Step 4: Give import mode the same field**

The picker has **two** row types, not one. Create mode takes `OwnedLegalCommander[]`; import mode
takes `ImportCommanderCandidate[]` (`create-picker.tsx:46`, defined at
`import-actions.ts:44-51`), and that type carries no `oracleText`. Without it States A and C
cannot call `partnerAbility` at all in import mode — the slot would simply never draw on the one
path the motivating deck actually arrives by.

The catalog row already has the text: `ImportCatalogCard` is `DetailedCatalogCard`, whose
`oracleText: string | null` is at `match.ts:12`. So it is two edits and no new query.

In `src/lib/decks/import.ts`, add `oracleText: string | null;` to the `legendaryCandidates`
element type at :47-53, and `oracleText: card.oracleText,` to the push at :234-241.
`ImportCommanderCandidate` picks it up for free — `withOwnership` at `import-actions.ts:97`
returns `{ ...c, owned }`, so the field flows through without touching that file.

Extend `importRow` at `create-picker.tsx:68-79` with nothing: the row does not draw the text.
Only the slot reads it, from the selected candidate.

- [ ] **Step 5: Thread the partner through submit**

`handleCreate` at :156-191 calls `props.onSubmit(selected.oracleId, trimmed)` at :173 and
`createDeck(selected.oracleId, trimmed)` at :178. Both take the partner id as a further
argument, matching Task 8's signature.

The mobile dock at :559-580 uses `addPanelCopy.createPicker.dockSummary(name, identity)`
**unchanged** — it takes the pair as one string, `Ishai + Bruse Tarl`, through the same argument
it already takes a single name through. The dock is one truncating line and needs no
partner-specific form. **The slot never lives in the dock**; on phone it sits in the scrolling
flow beside the name field.

- [ ] **Step 6: Walk the surface**

Run `pnpm dev`, sign in as the local fixture account, and open the create picker.

Verify: (a) picking a commander with no partner ability shows no slot and the sidebar is
unchanged from `main`; (b) picking Atreus shows the plate, the verbatim ability, and a
truthful count; (c) the pairing list contains only commanders that `canPair`; (d) tab order
reaches the plate; (e) the phone layout puts the slot in the flow, not the dock; (f) **paste a
list declaring only Atreus and confirm the slot draws in import mode too** — that path uses the
other row type and is what Step 4 exists for.

This is a design-gated surface. Run the design-review skill (property table: enumerate →
verify → confirm) against decisions 17 and 20 before the commit.

- [ ] **Step 7: Commit**

```bash
git add src/components/decks/partner-slot.tsx src/components/decks/create-picker.tsx src/lib/decks/read.ts src/lib/decks/import.ts
git commit -m "feat(decks): a partner slot in the create picker"
```

---

### Task 13: The spine caption, both widths

Decisions 18 and 22.

**Files:**
- Modify: `src/components/decks/spine-desktop.tsx:23-37` (props), `:47-48`, `:167-182` (caption), `:192`
- Modify: `src/components/decks/spine-mobile.tsx:26-27`, `:33-54` (`metaRow`), `:210`

**Interfaces:**
- Consumes: `DeckDetail.partner`, `partnerCopy.partnerCardAria`, `overCopy.figure.denominator`.
- Produces: `SpineBandProps` gains `partner: DeckCommander | null`. Both spines consume the same
  props object, so the field is added once at `spine-desktop.tsx:23-37`.

- [ ] **Step 1: The band stays one image**

**Do not touch `ArtWash`.** Decision 22 declines a diptych: the portrait at band 168 is 230px
(`PORTRAIT_RATIO = 1.37`), the mask ends at 58%, and the horizontal scrim stops are keyed in
px at 0/134/230/240 against a type inset of 254. A second portrait would be a third strategy
and would invalidate every one of those figures. The band draws the **primary** and nothing
else. Two treatments were considered and rejected: a partner thumb on flat ground (it
reintroduces the card object #473 deleted), and the partner as the .2 ambient layer (unreadable,
and it changes what that layer means app-wide).

- [ ] **Step 2: The caption states the pair**

Desktop, at :167-182, currently prints `{commander.name} · {colorLabel(commander.colorIdentity)}`
at :173 inside the existing `gap:10` caption row. It becomes `{primary} + {partner}` with a
**literal ` + `** joiner. **No row is added and no badge is drawn.**

**Desktop keeps the identity label.** This is R2's one reversal from R1: the pair plus
` · Jeskai` is ~429px at 11px mono, and with the pips, gaps and pill the row wants ~547 of the
644px the type column has at 1180. The ordered shrink applies from 768 to ~1085px.

**Mobile drops it.** `metaRow` at `spine-mobile.tsx:33-54` prints the same string at :44. For a
pair, print `{primary} + {partner}` and **omit** ` · {colorLabel(...)}`: the caption is centred
on the wash inside `left:18 right:18`, so 354px at 390, and two names are ~336px — they fit
alone, with the pips and pill wrapping below via the row's existing `flex-wrap`. Adding
` · Jeskai` is ~390 > 354. A single-commander deck keeps the label on both widths.

The identity pips are the **union** of both identities (§6, eng-carried), and so is the
`colorLabel` the desktop caption prints.

- [ ] **Step 3: The partner's name is its card trigger**

The header carries no portrait-level pair signal. The partner's printing opens from the word
that names it: wrap the partner's half of the caption in a `FullCardTrigger` for the partner's
oracle id, with accessible name `partnerCopy.partnerCardAria(partner.name)`. The visible
affordance is **an underline on the partner's half of the caption and nothing else**.

The primary needs no equivalent — its trigger is the 230px of art beside the text, and both
spines already run `FullCardTrigger` with `bandTapTarget={false}` (`spine-desktop.tsx:91`,
`spine-mobile.tsx:74`).

**Open item 2, an eng call the handoff leaves here:** the mobile caption is a single 10px `<p>`,
and the trigger needs a 44px hit area. Decision 18 already requires splitting that `<p>` into
two spans, so give the partner span `py-[17px] -my-[17px]` (or the equivalent that reaches 44px
without moving the text) in the same edit.

- [ ] **Step 4: The denominator**

`spine-desktop.tsx:47-48` and `spine-mobile.tsx:26-27` both compute
`const over = built > 99; const toCut = built - 99;`. Both 99s become
`deckBodySize(partner !== null)`. Line :192 and :210 call
`overCopy.figure.denominator(bodySize)` per Task 11.

- [ ] **Step 5: Walk both surfaces**

Run `pnpm dev`, open the motivating deck (create it via Task 16's fixture if it is not seeded),
and check desktop at 1180, at 1085, at 900 and at 768, then mobile at 390.

Verify: the pair reads `Atreus + Kratos`; desktop shows ` · Jeskai` and mobile does not; the
denominator reads `/ 98`; the partner's name is underlined and opens its printing; tab order
reaches both triggers in reading order (**open item 4 — this is the test the handoff asks
for**); the pips are the union.

Run the design-review skill against decisions 18 and 22 before the commit.

- [ ] **Step 6: Commit**

```bash
git add src/components/decks/spine-desktop.tsx src/components/decks/spine-mobile.tsx
git commit -m "feat(decks): state the pair in the deck header caption"
```

---

### Task 14: The resume row and the rail

Decisions 19, 21 and 23.

**Files:**
- Modify: `src/components/home/resume-decks.tsx:17`, `:62-68`, `:115-124`
- Modify: `src/components/home/deck-rail.tsx:141-143`

**Interfaces:**
- Consumes: `DeckListItem.partnerName`, `shortCommanderName`, `deckBodySize`.
- Produces: no exported type change.

- [ ] **Step 1: Short names, pair-only**

The resume row prints **short names** — the substring before the first comma — via
`shortCommanderName` at `src/lib/copy/decks-builder.ts:17`. `Ishai + Bruse Tarl` is 18
characters against 55 for the full pair.

**Shortening is pair-only.** A single-commander deck keeps its full `deck.commanderName`, so no
shipped row changes its words.

- [ ] **Step 2: Invert the shrink order**

Today the count span at :120-124 is `min-w-0 flex-1 truncate` and the name span at :115-117 is
`min-w-0 truncate` with no `flex-1` — so **the count absorbs the whole deficit** before the name
loses a character. The component's own comment states that as intent. Decision 19 overturns
exactly that comment, and the comment must be rewritten in the same edit.

The count becomes `flex-none`. The pair names become the **only** shrinking child, drawn as two
spans with the partner shrinking first and the joiner leading the shrinking span (so the row
reads `Ishai + Br…`, never `Ishai +…`).

- [ ] **Step 3: Drop the to-buy clause on pair rows**

`62 pill + 28 gaps + 113 long-form count = 203 > 200` leaves negative room for any name at all.
So: **a pair row never renders the to-buy clause.** One boolean, deterministic, not a
measurement.

The clause is **not** shortened, abbreviated or ellipsised — a partly truncated figure reads as
a different figure, and `86 / 9…` is a lie in a way `Bruse Ta…` is not.

Single decks keep the clause, and there it becomes **the only shrinking child** — which fixes a
latent bug: today a single deck with a long name renders `86 / 98 · 3 t…`.

The clause survives in the row's `sr-only` text via `partnerCopy.pairRowBuyAria(copies)`,
appended after `partnerCopy.pairAria(primary, partner)`, which names both commanders in full,
primary first.

**Build the mechanism, not the character count.** Decision 23's 200px is measured at a 334px row
(~1026px of Home); the section renders from `sm` (`resume-decks.tsx:142`), where the meta line
inside its `pl-[116px]` inset and 18px right pad is nearer 70px. At `sm` a pair row may render
`Ish…`. That is the ruled mechanism behaving correctly at a width Design did not draw.

- [ ] **Step 4: The rail carries no pair signal**

`deck-rail.tsx:141-143` renders `{deck.built} / {MATURE_DECK_SIZE}`; the denominator becomes
`deckBodySize(deck.partnerName !== null)`, so a pair rail row reads `/ 98`.

**That denominator is the rail's only pair signal, and that is the whole of decision 21.** The
26px art spine at :120-128 is not halved: half of 26 is card frame with no face. The desktop
rail row carries no other pair signal and that is accepted.

The resume portrait at `:82` is likewise untouched: it is structural at 99px against band 72,
and halving it to 49 invalidates every scrim stop and gives a 0.68:1 crop against `art_crop`'s
1.37:1.

- [ ] **Step 5: Walk the surface**

Run `pnpm dev` and open Home at 1026px, at `sm` (640px), and at 390px.

Verify: a pair row reads short names with the count pinned; no to-buy clause on the pair row; a
single row still reads its full name **and** now truncates the clause rather than the name; the
rail reads `/ 98`; the `sr-only` text names both commanders in full.

Run the design-review skill against decisions 19, 21 and 23 before the commit.

- [ ] **Step 6: Commit**

```bash
git add src/components/home/resume-decks.tsx src/components/home/deck-rail.tsx
git commit -m "feat(home): short pair names, a pinned count, and a derived denominator"
```

---

### Task 15: The top-off ceiling

Spec §7. Every site that reconstructs 99 rather than reading it.

**Files:**
- Modify: `src/components/decks/top-off-list.tsx:223`
- Modify: `src/lib/copy/top-off.ts:174, :178, :337, :339, :343`
- Modify: `src/app/decks/actions.ts:262, :549, :782` (ledger writes) and every other 99 literal the grep finds

**Interfaces:**
- Consumes: `deckBodySize`.
- Produces: the five `top-off.ts` strings take a `bodySize: number` argument.

- [ ] **Step 1: Find every site**

Run: `pnpm exec grep -rn "\b99\b" src/ --include=*.ts --include=*.tsx`

Known 99 literals in `src/app/decks/actions.ts` sit at :201, :235, :245, :248, :260, :262, :368,
:369, :459, :546, :549, :637, :656, :753, :782 — but the grep is authoritative and some of those
are unrelated numbers. Read each in context. A literal that is the **deck body ceiling** derives
from `deckBodySize`; a literal that is something else stays.

- [ ] **Step 2: Parameterise the copy**

The five strings reading "of 99" at `top-off.ts:174, 178, 337, 339, 343` take the body size:

```ts
someString: (n: number, bodySize: number) => `... of ${bodySize}`,
```

Their sentence *shape* does not change — §7 calls this mechanical parameterisation, not a copy
review. Do not re-word.

- [ ] **Step 3: Fix the total reconstruction**

`top-off-list.tsx:223` reads `const total = 99 - openSlots + tickedCount;`. The 99 becomes the
body size, threaded in as a prop from the deck page, which already knows the partner.

- [ ] **Step 4: The ledger**

`fill_passes.open_slots` **needs no backfill** — it records what was open at the time of the
pass, and an old pass on a deck that never had a partner recorded the truth. The three ledger
writes at :262, :549 and :782 write the derived figure going forward.

- [ ] **Step 5: Test what is testable, and walk the rest**

`fillDeck` and `listDecksWithStats` are database calls, and there is no harness for them (see
Global Constraints). What *is* pure is the copy and the arithmetic, and that is where the ceiling
actually lives. In `src/lib/copy/top-off.test.ts`:

```ts
it("prints the pair ceiling, not 99", () => {
  expect(topOffCopy.someString(4, deckBodySize(true))).toContain("of 98");
  expect(topOffCopy.someString(4, deckBodySize(false))).toContain("of 99");
});
```

Substitute the real export names the grep in Step 1 turned up — there are five, and each gets a
line. If `src/lib/copy/top-off.test.ts` does not exist, create it; the module is pure.

Then walk the ceiling against the local database, because a wrong `landTarget` is invisible to
the copy test. `pnpm dev`, on a pair deck:

1. The top-off panel's target reads **98**, not 99, everywhere it appears.
2. Run a fill pass. The deck lands on exactly 98 body cards and **36** lands, not 37.
3. `select open_slots from fill_passes order by created_at desc limit 1` records the derived
   figure, not 99 minus built.
4. A single-commander deck still reads 99 and fills to 37. This is the regression that matters —
   every deck in the app today is one of these.

- [ ] **Step 6: Run**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/decks/top-off-list.tsx src/lib/copy/top-off.ts src/lib/copy/top-off.test.ts src/app/decks/actions.ts
git commit -m "feat(decks): derive the top-off ceiling from the commander count"
```

---

### Task 16: The motivating deck, end to end

The feature exists because one real deck could not be represented. The last test is that deck.

**Files:**
- Create: `src/lib/decks/__fixtures__/father-and-son.txt`
- Test: `src/lib/decks/import.test.ts` (extend)

**Interfaces:**
- Consumes: everything above.
- Produces: nothing.

- [ ] **Step 1: Write the fixture**

`src/lib/decks/__fixtures__/father-and-son.txt` holds the real pasted list — 88 lines totalling
exactly 100 cards, with Atreus and Kratos under a `Commander` header. Take it from issue #364. Do
not hand-edit the quantities to make a test pass; if the list does not import cleanly, that is
the bug the test exists to find.

- [ ] **Step 2: Write the failing test**

This goes in `src/lib/decks/import.test.ts`, not the actions test: `buildDeckImport` is pure, so
the whole parse — both declarations, the 98-card body, the union identity — is testable for real
rather than against a fake. The catalog is derived from the fixture's own lines, so an 88-line
list needs no 88-entry hand-written fixture.

```ts
it("parses the motivating deck as a pair with a body of 98", () => {
  const text = readFileSync(new URL("./__fixtures__/father-and-son.txt", import.meta.url), "utf8");

  // Every name the list mentions becomes a catalog row. The two commanders are
  // widened with the oracle text and identity the pair actually turns on.
  const names = [...new Set(
    text.split("\n").map((l) => l.match(/^\d+\s+(.+)$/)?.[1]?.trim()).filter((n): n is string => !!n),
  )];
  const catalog = names.map((name) => {
    if (name.startsWith("Atreus")) {
      return card({ name, oracleText: "Partner—Father & son", colorIdentity: ["R", "W"], typeLine: "Legendary Creature — God" });
    }
    if (name.startsWith("Kratos")) {
      return card({ name, oracleText: "Partner—Father & son", colorIdentity: ["U", "R"], typeLine: "Legendary Creature — God" });
    }
    return card({ name });
  });

  const result = buildDeckImport({ text, catalog });

  expect(result.declaredCommander?.name).toMatch(/^Atreus/);
  expect(result.declaredPartner?.name).toMatch(/^Kratos/);
  expect(result.cards.reduce((n, c) => n + c.quantity, 0)).toBe(98);
  expect(result.unresolved).toEqual([]);

  // The bug this feature exists to fix: identity is the union, so every card in
  // a Jeskai pair deck is addable.
  const identity = new Set([
    ...catalog.find((c) => c.name === result.declaredCommander!.name)!.colorIdentity,
    ...catalog.find((c) => c.name === result.declaredPartner!.name)!.colorIdentity,
  ]);
  expect([...identity].sort()).toEqual(["R", "U", "W"]);

  // And it round-trips through the exporter.
  const back = buildDeckImport({
    text: buildDecklistText({
      commanderName: result.declaredCommander!.name,
      partnerName: result.declaredPartner!.name,
      cards: result.cards.map((c) => ({
        quantity: c.quantity,
        name: catalog.find((k) => k.oracleId === c.oracleId)!.name,
      })),
    }),
    catalog,
  });
  expect(back.declaredPartner?.name).toBe(result.declaredPartner!.name);
  expect(back.cards.reduce((n, c) => n + c.quantity, 0)).toBe(98);
});
```

`card` is the file's own fixture factory at `import.test.ts:16-25`; it defaults `oracleText` to
null and generates an `oracleId`, so only the two commanders need arguments beyond a name.

- [ ] **Step 3: Run**

Run: `pnpm test src/lib/decks/import.test.ts`
Expected: PASS.

Two totals to keep straight: the list holds **100** cards, of which two are the commanders, so
the body is **98** and `unresolved` is empty. A count of 99 means the partner was parsed as a
deck card — the exact failure this whole plan exists to remove.

- [ ] **Step 4: Walk the real deck**

The parse being right is not the feature being right. Import the same list through the running
app, signed in as the local fixture account, and confirm end to end:

1. The import lands on a deck with both commanders, and the picker never asked you to choose.
2. The deck header draws the pair: `Atreus + Kratos` in the caption, union pips, and `/ 98`.
3. The partner's name in the caption opens its printing (decision 22).
4. The resume row on Home shows the shortened pair and the row's accessible name reads both in
   full.
5. `/decks` shows the tile at `98 / 98`.
6. Add a blue card the primary alone would not legalise. It is accepted — the union rule from
   Task 6, on the surface it was reported against.
7. Export the deck and re-import the exported text. You get the same pair back.

- [ ] **Step 5: Full gate**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Then: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/decks/__fixtures__/father-and-son.txt src/lib/decks/import.test.ts
git commit -m "test(decks): import the motivating pair deck end to end"
```

---

## Self-review

**Spec coverage.**

| Spec section | Task |
|---|---|
| §2 data model, CHECK, three enforcement sites, export | 2, 6, 7, 8, 9 |
| §3 `partner.ts` and its contract | 1, and the re-validation in 8 |
| §4 ceiling, `MATURE_DECK_SIZE` retired, `LAND_TARGET` 37→36, per-deck maturity | 3, 5, 15 |
| §5 merged advice, both mechanisms, single-id regression guard | 10 |
| §6 four Design surfaces | 12, 13, 14 |
| §6 four eng-carried items | union pips in 13; `shortCommanderName` staying singular in 14; `/decks` tiles — the tile draws no commander *portrait*, but `deck-card.tsx:127` does draw a count against `MATURE_DECK_SIZE`, so it is **covered by Task 3**, not a no-op; `import-no-commander.tsx` unchanged — genuinely untouched, because a source naming no commander is the state it already draws |
| §7 top-off reconciliation | 15 |
| §8 testing | 1, 4, 5, 6, 7, 8, 9, 10, 15, 16 |
| §9 adjacent gap | filed as #467, out of scope |
| Decisions 17, 20 | 12 |
| Decisions 18, 22 | 13 |
| Decisions 19, 21, 23 | 14 |
| Open item 2 (44px hit area) | 13, step 3 |
| Open item 4 (tab order over two triggers) | 13, step 5 |

Open items 1 and 3 are Product's — the verbatim ability labels, and the to-buy clause dropping.
Neither blocks a start; Task 12 prints the labels verbatim and Task 14 drops the clause, which
are the behaviours Design ruled. If Product overrules item 3, the named trade is that the only
thing left to cut from the pair row is the partner.

**Placeholder scan.** No "TBD", no "handle edge cases", no "similar to Task N". Several tasks
(4, 8, 16) tell the implementer to read the existing test file and match its fixture helpers
rather than inventing one; that is a real instruction with a real fallback, not a placeholder.
Task 16's fixture is sourced from issue #364 rather than transcribed here, because an 88-line
card list in a plan document is a copy that would drift from the issue.

**Where a task has no automated test, it says so and walks the surface instead.** Tasks 5, 10
and 15 each touch raw SQL or a fill pass that no harness in this repo can exercise; each carries
a numbered manual walk with the specific figure to look at, and Task 10's walk names the
`ownedQuantity` fan-out that its unit tests provably cannot see. That is a deliberate choice
over a mocked test that would mock away the thing under test.

**Type consistency.** `deckBodySize(hasPartner: boolean)` takes a boolean in every task that
calls it (3, 4, 5, 10, 13, 14, 15). `readSynergyCards` takes `commanderOracleIds: string[]` in
both Task 10 and the `page.tsx` call site. `partnerAbility` takes `string | null` everywhere,
which matters because `cards.oracleText` is nullable. `createDeck`'s partner argument is fourth
and optional in Task 8 and is passed positionally in Task 12. `shortCommanderName` — not
`commanderShortName` — is the name used in Tasks 11, 12 and 14. `buildDeckImport` takes a single
object (`{ text, catalog }`) at every call site, and `buildDecklistText` — not `deckToText` — is
the exporter's real name. `ownedColorLegalPool` takes a **list** of commanders from Task 6
onward, and Task 10 is the caller that puts two in it. `mergeEdhrecData` returns the full
nine-field `EdhrecData`, spreading the primary, because three of those fields merge and six do
not.
