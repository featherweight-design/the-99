# Recommendations You Can Act On — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the commander page's Role Coverage panel explanatory and inspectable (#131), and make "Build this deck" hand back a deck that is already 68 cards deep (#130).

**Architecture:** Two halves that share one data thread. The commander page's role panels already know which owned cards fill each role, but only by name; we widen that payload to `{ oracleId, name, inclusionPct }` so each chip can carry an EDHREC figure and open the card-detail modal. The build button stops creating an empty deck: `createDeck` runs a new pure fill engine inside the same transaction that inserts the deck, writing the role baseline plus lands and marking every auto-added row with a new `deck_cards.auto` flag. The builder then grows an `auto` tag that doubles as a keep control, a `Clear all auto` sweep, a provenance line, and role-grouped Shopping sections.

**Tech Stack:** Next.js 16 App Router with server actions, React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Clerk auth, Vitest + React Testing Library.

**Spec:** `design/design_handoff_the99_recommendations/README.md`, with `ADDENDUM-README.md`, `DENSITY-long-role.md`, `READINESS.md`, and the production-final `recommendations · copy strings.ts` in the same folder. Read the README before Task 1; each task below names the sections that bind it.

## Global Constraints

- **No new design token, no new hex, no new motion class.** Every colour is either an existing CSS variable or a hex already present in `src/app/globals.css`. Where the handoff names a bare hex (`#221D16`, `#211C15`, `#181410`), that hex is already in the stylesheet — reuse the same literal, do not invent a token for it. `#33402F` (the coverage chip's border) is the one hex in this feature that is **not** in `globals.css`; it is already shipped inline in `detail.tsx`'s `OwnedChip`, and the handoff's component table names it explicitly. Carry it forward as the existing literal it is — do not tokenize it, and do not treat it as new.
- **Missing data is omitted, never defaulted to zero.** A `0` draws a real bar for no data. Use `Number.isFinite(x)`, never `typeof x === "number"`, to decide whether a figure exists.
- **Absent and degraded are different states.** Absent = EDHREC has no figure for this card (em dash, `--fg-locked`). Degraded = the EDHREC fetch failed (retry affordance, `--warning` left rule). The commander page already makes this distinction in `FitHero`; the role panels inherit it.
- **Copy is verbatim.** Every user-visible string in this feature comes from `src/lib/copy/recommendations.ts` (Task 1), which is a byte-for-byte copy of the handoff's copy file. Never retype a string inline.
- **Mobile and desktop parity ships in the same task.** No task is complete with only one width implemented.
- **`suggestDeck` is not modified.** The fill engine is new code in its own module; `src/lib/decks/suggest.ts` is read, not edited.
- **`src/lib/decks/grouping.ts` stays free of db/server imports.** It is imported by client components.
- Package manager is **pnpm**. Gate before every push: `pnpm typecheck && pnpm lint && pnpm test`, then `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`.
- Stage files by name. Never `git add -A`.

## Rulings

These resolve conflicts and gaps found in the pre-flight scan of the handoff. Each is binding on the tasks below.

1. **The keep gesture is the tag itself.** The `auto` tag is a `<button>`: `auto` at rest, `keep ✓` on hover/focus, and activating it clears the flag for good. *Why:* the handoff's decision 4 says "the tag IS the keep button", and the copy file already ships `auto.keep` and `auto.keepAria`, which an implicit keep would orphan.
2. **The desktop chip stays 28px as drawn.** Pointer-first; the phone 44px row is the accessible equivalent. *Why:* the chips are real `<button>`s, so the keyboard path works, and WCAG 2.5.8 AA's floor is 24px.
3. **The "was this deck ever filled" bit is a real column** (`decks.filled`), not an inference. *Why:* a migration is already required for the `auto` flag, so the marginal cost is one column, and it makes the swept-empty copy correct instead of approximately correct.
4. **The fill runs inside the create transaction**, so state 14 (the in-flight frame) never renders on this path. *Why:* the handoff's decision 9 states the preference — one write, hold the redirect. The A3 in-flight treatment is still built, because the role-counter cell renders it whenever a count is genuinely unknown.
5. **`inclusionPct` comes from the already-resolved `EdhrecData.inclusionByName`.** No new query, no reader for `commander_support_cards.inclusion`. *Why:* `scoreOneCommander` already awaits `resolveEdhrecData` and discards everything but `topCards`. This closes the handoff's gap #5 at zero cost.

   **This is what unblocks the handoff.** `READINESS.md` is 🟡, gated on brief §0 — where the per-card inclusion figure comes from. Ruling 5 answers it: the figure is already in memory on both code paths, so no new source, no new query, and no new cache is needed. With §0 answered, the remaining readiness items are the addendum's A1–A4 treatments, all of which Tasks 7 and 12 build.
6. **The fill is the role and land baseline — 68 cards (10 ramp + 10 draw + 8 removal + 3 wipes + 37 lands) — not `suggestDeck`'s full 99-card return.** *Why:* the copy states the promise as roles plus the mana base, leaving the other 31 slots deliberately open — `build.seedNote` and `build.stickyPromise` both name a figure the fill has to match, and `suggestDeck`'s 99 would overshoot it. The addendum's related correction is narrower than this ruling: it corrects the *unowned top-up* (that reaching past the collection is not free), which Task 5 honours separately by handing `planFill` the ranked staple list instead of a flat `slice(0, 5)`.
7. **Lands come from owned cards only, never bought.** Basics stack up to the owned quantity (summed across printings in `collection_items`), capped by the shortfall to 37. *Why:* consistent with "basics never enter Shopping". If a collection is land-poor the deck simply lands short, which is exactly the honest shortfall state 13 draws.
8. **The next migration number is `0013`.** The last shipped migration is `0012_ambiguous_hobgoblin.sql`.

## File Structure

**New files**

| Path | Responsibility |
|---|---|
| `src/lib/copy/recommendations.ts` | Every user-visible string for this feature. Verbatim from the handoff. |
| `src/lib/decks/fill.ts` | Pure fill engine: given a scored pool, choose the 68-card role and land baseline. No db imports. |
| `src/lib/decks/fill.test.ts` | Unit tests for the engine. |
| `src/components/commanders/coverage-chip.tsx` | The desktop coverage chip, the phone coverage row, and the disclosure control. Client component. |
| `src/components/commanders/coverage-chip.test.tsx` | RTL tests for the chip, the row, and the disclosure. |
| `src/components/commanders/coverage-section.tsx` | The whole Role Coverage section for one width: heading, sub-caption, panel-level note, retry, four role panels. Owns the density cap. |
| `src/components/commanders/coverage-section.test.tsx` | RTL tests for the note branches, the retry, and every edge count at both widths. |
| `src/app/commanders/[slug]/coverage-action.ts` | The A1 retry — re-resolves EDHREC once for all four panels. |
| `src/components/decks/provenance-line.test.tsx` | RTL tests for the three provenance branches and the failed banner. |
| `src/components/decks/auto-tag.tsx` | The `auto` tag / keep button for a decklist row. |
| `src/components/decks/auto-tag.test.tsx` | RTL tests for the rest / hover / activated path. |
| `src/components/decks/clear-auto.tsx` | The `Clear all auto` toolbar control and the sweep receipt strip. |
| `src/components/decks/clear-auto.test.tsx` | RTL tests for the control, the receipt, and undo. |
| `src/components/decks/provenance-line.tsx` | The arrival provenance line and the fill-failed banner. |
| `drizzle/0013_*.sql` | `deck_cards.auto`, `decks.filled`. Generated by `pnpm db:generate`. |

**Modified files**

| Path | Change |
|---|---|
| `src/lib/recs/score.ts` | `roleCards` becomes `{ oracleId, name, inclusionPct }[]`, ordered inclusion-desc with absent last. |
| `src/lib/recs/recommend.ts` | Threads `inclusionByName` into `scoreCommander` at both call sites. |
| `src/lib/recs/free-ranking.ts` | The third `scoreCommander` call site. Reads `inclusionByName` off the payload it already parses. |
| `src/components/commanders/detail.tsx` | `RolePanel` moves into `coverage-section.tsx`; `CardDetailProvider` mounts; the three `REPLACES` strings move to the copy module. `OwnedChip` stays — it also renders `overlapOwned` in two other places. |
| `src/db/schema.ts` | `deckCards.auto`, `decks.filled`. |
| `src/lib/decks/read.ts` | Threads `auto` onto each card and `filled` onto the deck. |
| `src/lib/decks/grouping.ts` | `DeckDetailCard` gains `auto: boolean`. |
| `src/app/decks/actions.ts` | `createDeck` fills via a new exported `buildFillPlan`; new `keepAutoCard`, `clearAutoCards`, `restoreAutoCards`, and `fillDeck` actions; `getDeckSuggestions`' flat `slice(0, 5)` top-up becomes role-bounded. |
| `src/components/decks/decklist-row.tsx` | One new slot between `BuyTag` and the `✕`. |
| `src/components/decks/decklist.tsx` | Shopping view groups by role with gap headers. |
| `src/components/decks/group-toggle.tsx` | `Clear all auto` right-aligned in the toolbar. |
| `src/components/decks/builder-shell.tsx` | Provenance line, sweep wiring, optimistic list update, live-region message. |
| `src/components/decks/role-counter-cell.tsx` | A3 in-flight rule and A4 `--border-strong` hairline. The strip itself is untouched. |
| `src/components/decks/card-detail-provider.tsx` | `CardDetailTrigger` gains an optional `ariaLabel` override, so a coverage chip can name its figure. Every shipped call site is unchanged. |
| `src/components/decks/decklist-group-header.tsx` | Shopping group headers carry the gap clause. |

---

### Task 1: The copy module

**Files:**
- Create: `src/lib/copy/recommendations.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `recommendationsCopy`, a `const` object with blocks `coverage`, `build`, `auto`, `fill`, `shopping`, `sweptEmpty`. Every later task imports its strings from here.

This task is transcription. The handoff ships a production-final copy file; copy it byte for byte, including its comment blocks, which record decisions later tasks depend on (the status-pill mapping and the three `REPLACES` targets).

- [ ] **Step 1: Copy the file verbatim**

```bash
cp "design/design_handoff_the99_recommendations/recommendations · copy strings.ts" src/lib/copy/recommendations.ts
```

- [ ] **Step 2: Fix the header path comment**

The first line reads `// src/lib/copy/recommendations.ts — #130 · #131.` — it is already correct. Change nothing else. Do not reformat, do not reorder keys, do not "improve" any string. The curly apostrophes (`’`) are intentional and must survive.

- [ ] **Step 3: Verify it compiles and lints**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS. If lint complains about the unused-looking export, it will not — the file exports a const.

- [ ] **Step 4: Commit**

```bash
git add src/lib/copy/recommendations.ts
git commit -m "feat(copy): add the recommendations copy module (#130, #131)"
```

---

### Task 2: Role cards carry an oracle id and an EDHREC figure

**Files:**
- Modify: `src/lib/recs/score.ts`
- Modify: `src/lib/recs/recommend.ts`
- Modify: `src/lib/recs/free-ranking.ts`
- Test: `src/lib/recs/score.test.ts` (exists — add cases AND update existing ones)

**Interfaces:**
- Consumes: `EdhrecData.inclusionByName` (`Record<string, number>`), already resolved by `resolveEdhrecData`. **Its keys are lowercased** — `parse.ts:90` writes `card.name.toLowerCase()`, and `parse.test.ts:49` asserts that `inclusionByName["Sol Ring"]` is `undefined`. Every lookup in this task therefore lowercases before reading, and every test fixture is keyed in lowercase.
- Produces: `RoleCard = { oracleId: string; name: string; inclusionPct: number | null }`, and `CommanderScore.roleCards: Record<"ramp"|"draw"|"removal"|"wipes", RoleCard[]>` ordered by `inclusionPct` descending with absent entries last. `scoreCommander` gains a fourth argument `inclusionByName: Record<string, number> | null`.

Today `roleCards` is a list of bare names, which cannot open a card-detail modal (no oracle id) and cannot print a figure. Ruling 5: the figure map is already awaited inside `scoreOneCommander` and thrown away, so this is a threading change, not a new query.

`toListItem` in `recommend.ts` does not include `roleCards`, so the client list payload is unaffected — do not add it.

**Ordering under A1 (degraded).** The addendum says a panel with no figures at all falls back to pool order, not to an alphabetical list that looks authored. So the sort runs only when `inclusionByName` is non-null. With a map present but a given card missing from it, that card sorts last, which is the absent-last rule and is correct.

**There are three call sites, not two.** `recommend.ts:179`, `recommend.ts:211`, and `free-ranking.ts:183`. The third already calls `parseEdhrecPayload(cached.payload)` and takes `.topCards` off the result, so the map is free there too — bind the parse result to a local and read both fields off it.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/recs/score.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { scoreCommander, type PoolCard } from "./score";

const card = (over: Partial<PoolCard> & { oracleId: string; name: string }): PoolCard => ({
  typeLine: "Creature — Human", oracleText: null, keywords: [],
  colorIdentity: [], imageUri: null, manaCost: null, ...over,
});

const commander = card({
  oracleId: "00000000-0000-0000-0000-0000000000c0",
  name: "Commander", typeLine: "Legendary Creature — Human",
});

describe("roleCards", () => {
  const rampA = card({ oracleId: "a", name: "Sol Ring", typeLine: "Artifact", oracleText: "{T}: Add {C}{C}." });
  const rampB = card({ oracleId: "b", name: "Arcane Signet", typeLine: "Artifact", oracleText: "{T}: Add one mana of any color." });
  const rampC = card({ oracleId: "c", name: "Fellwar Stone", typeLine: "Artifact", oracleText: "{T}: Add one mana of any color." });

  it("carries oracle id, name, and the EDHREC figure", () => {
    const s = scoreCommander({
      commander, collection: [rampA],
      edhrecTopCards: null, inclusionByName: { "sol ring": 82 },
    });
    expect(s.roleCards.ramp).toEqual([{ oracleId: "a", name: "Sol Ring", inclusionPct: 82 }]);
  });

  it("orders by inclusion descending with absent figures last", () => {
    const s = scoreCommander({
      commander, collection: [rampB, rampA, rampC],
      edhrecTopCards: null, inclusionByName: { "sol ring": 82, "arcane signet": 61 },
    });
    expect(s.roleCards.ramp.map((c) => c.name)).toEqual(["Sol Ring", "Arcane Signet", "Fellwar Stone"]);
  });

  it("reads a double-faced card's figure from its front face", () => {
    // Deliberately NOT a land back face: `classifyRoles` pushes `land` for any
    // type line containing "land" and gates `ramp` on the card not being a land,
    // so an "Instant // Land" DFC lands in no non-land role at all and this
    // assertion could never run.
    const dfc = card({
      oracleId: "d", name: "Jace, Vryn's Prodigy // Jace, Telepath Unbound",
      typeLine: "Legendary Creature — Human Wizard // Legendary Planeswalker — Jace",
      oracleText: "Draw a card, then discard a card.",
    });
    const s = scoreCommander({
      commander, collection: [dfc],
      edhrecTopCards: null, inclusionByName: { "jace, vryn's prodigy": 44 },
    });
    expect(s.roleCards.draw[0]?.inclusionPct).toBe(44);
  });

  it("leaves every figure null when there is no inclusion map", () => {
    const s = scoreCommander({
      commander, collection: [rampA], edhrecTopCards: null, inclusionByName: null,
    });
    expect(s.roleCards.ramp[0]?.inclusionPct).toBeNull();
  });

  it("keeps pool order when there is no inclusion map at all", () => {
    const s = scoreCommander({
      commander, collection: [rampC, rampA, rampB], edhrecTopCards: null, inclusionByName: null,
    });
    expect(s.roleCards.ramp.map((c) => c.name))
      .toEqual(["Fellwar Stone", "Sol Ring", "Arcane Signet"]);
  });

  it("breaks an inclusion tie on name so the order is stable", () => {
    const s = scoreCommander({
      commander, collection: [rampC, rampB],
      edhrecTopCards: null, inclusionByName: { "arcane signet": 50, "fellwar stone": 50 },
    });
    expect(s.roleCards.ramp.map((c) => c.name)).toEqual(["Arcane Signet", "Fellwar Stone"]);
  });
});
```

- [ ] **Step 1b: Update the existing tests that this change breaks**

Two groups in `src/lib/recs/score.test.ts` break, and only one of them breaks at typecheck:

1. Lines 72–104 and 143–175 call `scoreCommander` without `inclusionByName`. Add `inclusionByName: null` to every one of those calls. Typecheck catches these.
2. Lines 115–137 assert against bare strings — `expect(s.roleCards.ramp).toContain("Sol Ring")`, `expect(s.roleCards.wipes).toContain("Wrath of God")`, `expect(s.roleCards.removal).not.toContain("Wrath of God")`. These still compile and fail only at runtime. Rewrite each to map first:

```ts
expect(s.roleCards.ramp.map((c) => c.name)).toContain("Sol Ring");
expect(s.roleCards.ramp.map((c) => c.name)).toContain("Cultivate");
expect(s.roleCards.wipes.map((c) => c.name)).toContain("Wrath of God");
expect(s.roleCards.removal.map((c) => c.name)).not.toContain("Wrath of God");
```

Do not rely on `pnpm typecheck` to find group 2 — run `pnpm test src/lib/recs/score.test.ts` and read the failures.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/lib/recs/score.test.ts`
Expected: FAIL — `inclusionByName` is not an accepted argument, and `roleCards.ramp` holds strings.

- [ ] **Step 3: Widen the payload in `score.ts`**

Add the type above `CommanderScore`:

```ts
export type RoleName = "ramp" | "draw" | "removal" | "wipes";

/** One owned card that fills a role, with its EDHREC inclusion figure.
    `inclusionPct` is null when EDHREC has no figure — never 0, which would
    draw a real number for no data. */
export type RoleCard = { oracleId: string; name: string; inclusionPct: number | null };
```

Change the `roleCards` field on `CommanderScore` from `Record<..., string[]>` to `Record<RoleName, RoleCard[]>`, and use `RoleName` for the existing `roleCounts` / `roleGaps` fields too.

Add the argument and the lookup to `scoreCommander`:

```ts
export function scoreCommander(args: {
  commander: PoolCard;
  collection: PoolCard[];
  edhrecTopCards: string[] | null;
  inclusionByName: Record<string, number> | null;
}): CommanderScore {
  const pool = commanderPool(args.commander, args.collection);

  // `inclusionByName` is keyed lowercase by parseEdhrecPayload, so every read
  // lowercases first. And EDHREC names a double-faced card by its front face
  // while Scryfall names it "Front // Back" — the same mismatch the topCards
  // overlap below already handles.
  const inclusionOf = (name: string): number | null => {
    const map = args.inclusionByName;
    if (!map) return null;
    const lower = name.toLowerCase();
    const hit = map[lower] ?? map[lower.split(" // ")[0]];
    return Number.isFinite(hit) ? hit : null;
  };

  const roleCounts = { ramp: 0, draw: 0, removal: 0, wipes: 0 };
  const roleCards: Record<RoleName, RoleCard[]> = { ramp: [], draw: [], removal: [], wipes: [] };
  for (const c of pool) {
    for (const role of classifyRoles(c)) {
      if (role !== "land") {
        roleCounts[role]++;
        roleCards[role].push({ oracleId: c.oracleId, name: c.name, inclusionPct: inclusionOf(c.name) });
      }
    }
  }
  // Only sort when figures exist. With no map at all (EDHREC absent or the
  // fetch degraded), sorting would order the panel alphabetically, which reads
  // as an authored ranking built on nothing. Addendum A1: fall back to pool order.
  if (args.inclusionByName) {
    for (const list of Object.values(roleCards)) list.sort(byInclusionThenName);
  }
```

Add the comparator beside `byScoreThenOracleId`'s sibling in `score.ts`:

```ts
/** Inclusion descending, absent last, then name — so a chip row is ordered the
    same on a re-render and on a second request. */
export function byInclusionThenName(a: RoleCard, b: RoleCard): number {
  if (a.inclusionPct !== b.inclusionPct) {
    if (a.inclusionPct == null) return 1;
    if (b.inclusionPct == null) return -1;
    return b.inclusionPct - a.inclusionPct;
  }
  return a.name.localeCompare(b.name);
}
```

- [ ] **Step 4: Thread the map through all three call sites**

The two in `recommend.ts` already hold the resolved `result`. Pass the map:

```ts
// in recommendCommanders' fanout
...scoreCommander({
  commander, collection,
  edhrecTopCards: result.data?.topCards ?? null,
  inclusionByName: result.data?.inclusionByName ?? null,
}),
```

```ts
// in scoreOneCommander
...scoreCommander({
  commander, collection,
  edhrecTopCards: result.data?.topCards ?? null,
  inclusionByName: result.data?.inclusionByName ?? null,
}),
```

The third is `free-ranking.ts:176-187`, which parses the cached payload for `topCards` and throws the rest away. Bind the parse once and read both fields:

```ts
const cached = cache.get(commander.oracleId);
const parsed = cached ? parseEdhrecPayload(cached.payload) : null;
return {
  ...scoreCommander({
    commander,
    collection: pool,
    edhrecTopCards: parsed?.topCards ?? null,
    inclusionByName: parsed?.inclusionByName ?? null,
  }),
```

Leave the `synergyState: canon.synergyState` line and its comment exactly as they are.

- [ ] **Step 5: Fix every remaining call site and consumer**

Run: `pnpm typecheck`
Fix what it names. `src/components/commanders/detail.tsx`'s `RolePanel` will now fail on `cards: string[]` — for this task only, change its prop type to `RoleCard[]` and render `cards.map((c) => <OwnedChip key={c.oracleId} name={c.name} />)`. Task 7 replaces that rendering properly.

Do **not** delete `OwnedChip`. It has two other call sites — `detail.tsx:406` and `detail.tsx:697`, both rendering `overlapOwned`, which stays `string[]`. Only its use inside `RolePanel` moves.

- [ ] **Step 6: Run the tests**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/recs/score.ts src/lib/recs/score.test.ts src/lib/recs/recommend.ts src/lib/recs/free-ranking.ts src/components/commanders/detail.tsx
git commit -m "feat(recs): role cards carry an oracle id and an EDHREC inclusion figure (#131)"
```

---

### Task 3: Schema — the auto flag and the filled bit

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0013_*.sql` (generated)
- Modify: `src/lib/decks/grouping.ts`
- Modify: `src/lib/decks/read.ts`
- Test: `src/lib/decks/read.test.ts` (exists — add a case)

**Interfaces:**
- Produces: `deckCards.auto` (boolean, not null, default false) and `decks.filled` (boolean, not null, default false). `DeckDetailCard` gains `auto: boolean`; `DeckDetail` gains `filled: boolean`.

Two bits, one migration. `auto` marks a row the fill added and the player has not yet claimed — cleared by the keep control and by nothing else (not the modal, not a re-sort, not a group change). `filled` records that this deck was filled at least once, which is the only way the swept-empty copy can tell "you emptied a filled deck" from "you never built one" (ruling 3).

- [ ] **Step 1: Add the columns to the schema**

In `src/db/schema.ts`, add to `decks`:

```ts
  // True once a fill has written rows into this deck. Never reset by a sweep:
  // the swept-empty copy branches on "was this ever filled", not "is it filled".
  filled: boolean("filled").notNull().default(false),
```

and to `deckCards`:

```ts
  // A row the fill added that the player has not claimed. Cleared by the keep
  // control alone — re-sorting, regrouping, or opening the card detail must
  // leave it set, or the sweep would silently spare cards the player only looked at.
  auto: boolean("auto").notNull().default(false),
```

Add `boolean` to the existing `drizzle-orm/pg-core` import if it is not already there.

- [ ] **Step 2: Generate the migration**

Run: `pnpm db:generate`
Expected: a new `drizzle/0013_*.sql` adding both columns, plus an updated `drizzle/meta/` snapshot. Read the SQL and confirm it is two `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT false` statements and nothing else. If it contains a drop of any kind, stop and report.

- [ ] **Step 3: Write the failing read test**

Add to `src/lib/decks/read.test.ts`, following the file's existing stub pattern, a case asserting that a deck row with `filled: true` and a card row with `auto: true` surface as `detail.filled === true` and `detail.cards[0].auto === true`.

- [ ] **Step 4: Run it to verify it fails**

Run: `pnpm test src/lib/decks/read.test.ts`
Expected: FAIL — the properties do not exist.

- [ ] **Step 5: Thread the columns through**

In `src/lib/decks/grouping.ts`, add to `DeckDetailCard`:

```ts
  auto: boolean;
```

Keep this file free of db and server imports — it is imported by client components.

In `src/lib/decks/read.ts`: select `decks.filled` in the deck query and put it on the returned `DeckDetail`; select `deckCards.auto` in the cards query and map it onto each `DeckDetailCard`.

- [ ] **Step 6: Fix the fallout**

Run: `pnpm typecheck`
Every fixture that builds a `DeckDetailCard` by hand now needs `auto: false`. Add it; do not make the field optional.

- [ ] **Step 7: Run the gate**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/db/schema.ts drizzle/ src/lib/decks/grouping.ts src/lib/decks/read.ts src/lib/decks/read.test.ts
git commit -m "feat(decks): record which rows the fill added and whether a deck was ever filled (#130)"
```

---

### Task 4: The fill engine

**Files:**
- Create: `src/lib/decks/fill.ts`
- Create: `src/lib/decks/fill.test.ts`

**Interfaces:**
- Consumes: `classifyRoles` and `ROLE_TARGETS` from `../recs/roles`, `LAND_TARGET` from `./suggest`, `isBasicLand` from `./grouping`.
- Produces:
  ```ts
  export type FillRole = "ramp" | "draw" | "removal" | "wipes" | "land";
  export type FillCandidate = {
    oracleId: string; name: string; typeLine: string;
    oracleText: string | null; keywords: string[];
    owned: boolean;
    /** Total copies owned, summed across printings. 0 for an unowned card. */
    ownedQuantity: number;
    inclusionPct: number | null;
  };
  export type FillRow = { oracleId: string; quantity: number; role: FillRole };
  export type FillPlan = {
    rows: FillRow[];
    /** Total cards, counting stacked basics. */
    filled: number;
    /** Of `filled`, how many came from outside the collection. Lands never do. */
    bought: number;
    /** Roles that could not reach their target, in role order. */
    shortfalls: FillRole[];
  };
  export function planFill(candidates: FillCandidate[]): FillPlan;
  ```
- Later tasks rely on: `planFill` being pure and db-free, so `fill.test.ts` needs no stub and Task 5 can call it inside a transaction.

Ruling 6 sets the target: 10 ramp + 10 draw + 8 removal + 3 wipes + 37 lands = 68. Ruling 7 sets the land rule: owned only, basics stacking to the owned quantity, capped by the shortfall to 37. A candidate can classify into several roles; it is spent on the first role, in `ramp, draw, removal, wipes` order, that still has a gap.

This is deliberately **not** identical to `suggestDeck`. That engine (`suggest.ts:157-163`) iterates `classifyRoles(c)` directly, whose push order is `land, ramp, draw, wipes, removal` (`roles.ts:28-32`) — so a card that is both a wrath and targeted removal is spent on `wipes` there. `NON_LAND_ROLES` here reads `ramp, draw, removal, wipes`, matching the order the four coverage panels render in and the order the `ROLE_TARGETS` object declares. The divergence only bites a card classifying into both `wipes` and `removal`, and the fill has no obligation to reproduce `suggestDeck`'s ordering — ruling: the panel order wins, because a user reading the filled deck against the coverage panels should see the same sequence in both. Do not claim these two engines agree.

Within a role: owned before unowned, then inclusion descending, then absent, then name. Unowned cards therefore only ever appear where the collection ran out, which is what makes every Shopping row "closing a specific gap".

- [ ] **Step 1: Write the failing tests**

Create `src/lib/decks/fill.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { planFill, type FillCandidate } from "./fill";

const c = (over: Partial<FillCandidate> & { oracleId: string }): FillCandidate => ({
  name: over.oracleId, typeLine: "Artifact", oracleText: "{T}: Add {C}.",
  keywords: [], owned: true, ownedQuantity: 1, inclusionPct: null, ...over,
});

const ramp = (id: string, pct: number | null, owned = true) =>
  c({ oracleId: id, name: id, inclusionPct: pct, owned, ownedQuantity: owned ? 1 : 0 });

const basic = (id: string, qty: number) =>
  c({ oracleId: id, name: id, typeLine: "Basic Land — Forest", oracleText: "{T}: Add {G}.", ownedQuantity: qty });

const nonBasicLand = (id: string) =>
  c({ oracleId: id, name: id, typeLine: "Land", oracleText: "{T}: Add {G}." });

describe("planFill", () => {
  it("stops a role at its target", () => {
    const plan = planFill(Array.from({ length: 14 }, (_, i) => ramp(`r${i}`, 100 - i)));
    expect(plan.rows.filter((r) => r.role === "ramp")).toHaveLength(10);
  });

  it("takes the highest inclusion first and absent figures last", () => {
    const plan = planFill([ramp("low", 10), ramp("none", null), ramp("high", 90)]);
    expect(plan.rows.map((r) => r.oracleId)).toEqual(["high", "low", "none"]);
  });

  it("prefers an owned card to an unowned one whatever the figures say", () => {
    const plan = planFill([ramp("bought", 99, false), ramp("mine", 3)]);
    expect(plan.rows.map((r) => r.oracleId)).toEqual(["mine", "bought"]);
    expect(plan.bought).toBe(1);
  });

  it("reaches past the collection only where the role is short", () => {
    const owned = Array.from({ length: 10 }, (_, i) => ramp(`r${i}`, 50));
    const plan = planFill([...owned, ramp("bought", 99, false)]);
    expect(plan.rows.some((r) => r.oracleId === "bought")).toBe(false);
    expect(plan.bought).toBe(0);
  });

  it("spends a card on the first role it can close", () => {
    const dual = c({
      oracleId: "dual", name: "dual", typeLine: "Instant",
      oracleText: "Draw a card. Destroy target creature.",
    });
    const plan = planFill([dual]);
    expect(plan.rows).toEqual([{ oracleId: "dual", quantity: 1, role: "draw" }]);
  });

  it("stacks basics up to the copies owned", () => {
    const plan = planFill([basic("forest", 12)]);
    expect(plan.rows).toEqual([{ oracleId: "forest", quantity: 12, role: "land" }]);
    expect(plan.filled).toBe(12);
  });

  it("never stacks past the land target", () => {
    const plan = planFill([basic("forest", 60)]);
    expect(plan.rows[0].quantity).toBe(37);
    expect(plan.filled).toBe(37);
  });

  it("gives a non-basic land a single copy however many are owned", () => {
    const plan = planFill([c({ ...nonBasicLand("command-tower"), ownedQuantity: 4 })]);
    expect(plan.rows[0].quantity).toBe(1);
  });

  it("never buys a land", () => {
    const plan = planFill([c({ ...nonBasicLand("horizon"), owned: false, ownedQuantity: 0 })]);
    expect(plan.rows).toHaveLength(0);
    expect(plan.bought).toBe(0);
  });

  it("names every role it came up short on, in role order", () => {
    const plan = planFill([ramp("r0", 5), basic("forest", 37)]);
    expect(plan.shortfalls).toEqual(["ramp", "draw", "removal", "wipes"]);
  });

  it("reports no shortfall and 68 cards on a complete fill", () => {
    const full: FillCandidate[] = [
      ...Array.from({ length: 10 }, (_, i) => ramp(`ramp${i}`, 50)),
      ...Array.from({ length: 10 }, (_, i) =>
        c({ oracleId: `draw${i}`, name: `draw${i}`, typeLine: "Sorcery", oracleText: "Draw a card." })),
      ...Array.from({ length: 8 }, (_, i) =>
        c({ oracleId: `rem${i}`, name: `rem${i}`, typeLine: "Instant", oracleText: "Destroy target creature." })),
      ...Array.from({ length: 3 }, (_, i) =>
        c({ oracleId: `wipe${i}`, name: `wipe${i}`, typeLine: "Sorcery", oracleText: "Destroy all creatures." })),
      basic("forest", 37),
    ];
    const plan = planFill(full);
    expect(plan.filled).toBe(68);
    expect(plan.shortfalls).toEqual([]);
  });

  it("never spends one card twice", () => {
    const plan = planFill([ramp("r", 50), ramp("r", 50)]);
    expect(plan.rows).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/lib/decks/fill.test.ts`
Expected: FAIL — `./fill` does not exist.

- [ ] **Step 3: Write the engine**

Create `src/lib/decks/fill.ts`:

```ts
import { classifyRoles, ROLE_TARGETS } from "../recs/roles";
import { isBasicLand } from "./grouping";
import { LAND_TARGET } from "./suggest";

export type FillRole = "ramp" | "draw" | "removal" | "wipes" | "land";

export type FillCandidate = {
  oracleId: string; name: string; typeLine: string;
  oracleText: string | null; keywords: string[];
  owned: boolean;
  /** Total copies owned, summed across printings. 0 for an unowned card. */
  ownedQuantity: number;
  inclusionPct: number | null;
};

export type FillRow = { oracleId: string; quantity: number; role: FillRole };

export type FillPlan = {
  rows: FillRow[];
  filled: number;
  bought: number;
  shortfalls: FillRole[];
};

const NON_LAND_ROLES = ["ramp", "draw", "removal", "wipes"] as const;

/** Owned first, then inclusion descending, absent last, then name. Owned wins
    outright: a bought card is only ever here because the collection ran out,
    which is the promise Shopping makes about every row it prints. */
function byPreference(a: FillCandidate, b: FillCandidate): number {
  if (a.owned !== b.owned) return a.owned ? -1 : 1;
  if (a.inclusionPct !== b.inclusionPct) {
    if (a.inclusionPct == null) return 1;
    if (b.inclusionPct == null) return -1;
    return b.inclusionPct - a.inclusionPct;
  }
  return a.name.localeCompare(b.name);
}

export function planFill(candidates: FillCandidate[]): FillPlan {
  const ordered = [...candidates].sort(byPreference);
  const spent = new Set<string>();
  const rows: FillRow[] = [];
  const counts: Record<FillRole, number> = { ramp: 0, draw: 0, removal: 0, wipes: 0, land: 0 };

  for (const candidate of ordered) {
    if (spent.has(candidate.oracleId)) continue;
    const roles = classifyRoles(candidate);
    // Spent on the first role it can close, in target order — the same rule
    // suggestDeck uses, so the two engines never disagree about what a card is for.
    const role = NON_LAND_ROLES.find((r) => roles.includes(r) && counts[r] < ROLE_TARGETS[r]);
    if (!role) continue;
    spent.add(candidate.oracleId);
    counts[role]++;
    rows.push({ oracleId: candidate.oracleId, quantity: 1, role });
  }

  // Lands come from the collection alone (never bought), and a basic stacks to
  // the copies actually owned rather than to the shortfall — a deck must not
  // claim eleven Forests off four.
  for (const candidate of ordered) {
    if (counts.land >= LAND_TARGET) break;
    if (spent.has(candidate.oracleId) || !candidate.owned) continue;
    if (!classifyRoles(candidate).includes("land")) continue;
    const room = LAND_TARGET - counts.land;
    const quantity = isBasicLand(candidate.typeLine)
      ? Math.min(Math.max(candidate.ownedQuantity, 1), room)
      : 1;
    spent.add(candidate.oracleId);
    counts.land += quantity;
    rows.push({ oracleId: candidate.oracleId, quantity, role: "land" });
  }

  const boughtIds = new Set(candidates.filter((c) => !c.owned).map((c) => c.oracleId));
  return {
    rows,
    filled: rows.reduce((n, r) => n + r.quantity, 0),
    bought: rows.filter((r) => boughtIds.has(r.oracleId)).reduce((n, r) => n + r.quantity, 0),
    shortfalls: [
      ...NON_LAND_ROLES.filter((r) => counts[r] < ROLE_TARGETS[r]),
      ...(counts.land < LAND_TARGET ? (["land"] as const) : []),
    ],
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm test src/lib/decks/fill.test.ts`
Expected: PASS. If the "spends a card on the first role it can close" case fails, check `classifyRoles` — an instant that draws and destroys returns `["draw", "removal"]`, and `draw` must win.

- [ ] **Step 5: Run the gate and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`

```bash
git add src/lib/decks/fill.ts src/lib/decks/fill.test.ts
git commit -m "feat(decks): add the fill engine for the role and land baseline (#130)"
```

---

### Task 5: Build this deck hands back a filled deck

**Files:**
- Modify: `src/app/decks/actions.ts`
- Test: `src/app/decks/actions.test.ts` (exists — add cases)

**Interfaces:**
- Consumes: `planFill` from Task 4, `deckCards.auto` / `decks.filled` from Task 3.
- Produces:
  ```ts
  /** Everything the fill needs, gathered and planned but not yet written.
      Exported so Task 10's retry can re-run the fill for a deck that already
      exists, without duplicating the gathering. */
  export async function buildFillPlan(
    userId: string,
    commander: { oracleId: string; name: string; colorIdentity: string[] },
  ): Promise<FillPlan>;
  ```
  `createDeck` still returns `void` and still redirects to `/decks/{id}`; the deck it redirects to now holds up to 68 rows, every one with `auto = true`, and `decks.filled = true`.

`createDeck` today writes an empty deck and redirects. It now: loads the owned colour-legal pool with owned quantities, resolves EDHREC once, gathers unowned staple candidates the same way `getDeckSuggestions` already does, runs `planFill`, and writes the deck and its rows in one transaction.

Three things that will bite:

- **The `try` must wrap the whole fill, not only the transaction.** `createDeck` makes no network call today; this task adds one (`getEdhrecData`). An unguarded `getEdhrecData`, `ownedQuantities`, `unownedStaples`, or `planFill` means an EDHREC outage yields **no deck at all** — the exact opposite of the state-15 promise. Everything from `buildFillPlan` through the transaction goes inside one `try`.
- **`redirect()` throws.** It must be called after the transaction and outside any `try`, or the catch will swallow the redirect and the action will look like a fill failure.
- **A failed fill still owes the player a deck.** If anything in the guarded block throws, fall back to inserting the deck alone with `filled = false`. That is state 15 — "The deck is here, the cards aren't" — and it is why the fill-failed banner in Task 10 exists.

**`filled` records that the fill ran, not that it produced rows.** A player with an empty collection gets zero rows from a fill that worked perfectly; writing `filled: false` there would render Task 10's fill-failed banner over a non-failure. Inside the successful path, `filled` is always `true`. Only the catch writes `false`.

- [ ] **Step 1: Write the failing tests**

Add to `src/app/decks/actions.test.ts`, using the file's existing `vi.hoisted()` DB stub pattern:

```ts
it("writes the filled baseline and marks every row auto", async () => {
  // Stub: a commander, a pool of ten ramp artifacts and forty Forests.
  // Assert: insert into deck_cards received rows, every value has auto: true,
  // and the decks insert carried filled: true.
});

it("still creates the deck when the transaction throws", async () => {
  // Stub: make the transaction reject.
  // Assert: a deck row was inserted with filled: false, no deck_cards insert
  // happened, and the redirect to /decks/{id} still ran.
});

it("still creates the deck when EDHREC is unreachable", async () => {
  // Stub: make getEdhrecData reject.
  // Assert: a deck row was inserted with filled: false and the redirect still
  // ran. This is the case an unguarded network call would turn into no deck.
});

it("marks an empty collection filled, not failed", async () => {
  // Stub: an empty owned pool and no EDHREC staples, so planFill returns no rows.
  // Assert: the decks insert carried filled: true — the fill ran and found
  // nothing, which is not the same as the fill failing.
});

it("refuses a card that cannot lead a deck", async () => {
  // The shipped guard — assert the fill work never runs for an illegal commander.
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/app/decks/actions.test.ts`
Expected: FAIL — no `deck_cards` insert happens today.

- [ ] **Step 3: Widen the pool query with owned quantities**

`ownedColorLegalPool` returns one row per oracle id via `DISTINCT ON`, which cannot also sum quantities. Add a sibling that does, rather than changing the shipped function — `getDeckSuggestions` does not need quantities and must not pay for a `GROUP BY`:

```ts
/** Owned copies per oracle id, summed across printings — a basic is owned in
    quantity, and the fill stacks it to what the shelf actually holds. */
async function ownedQuantities(userId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ oracleId: collectionItems.oracleId, quantity: sql<number>`sum(${collectionItems.quantity})::int` })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    .where(ownedCardsWhere(userId, { commanderLegalOnly: true }))
    .groupBy(collectionItems.oracleId);
  return new Map(rows.map((r) => [r.oracleId, r.quantity]));
}
```

- [ ] **Step 4: Extract the unowned-staple lookup**

`getDeckSuggestions` already queries unowned EDHREC staples by name against colour identity. Lift that query — the `or(inArray(lower(name)), inArray(lower(split_part(...))))` block through the `eligible` filter and the `rankOf` sort — into a module-level helper `unownedStaples(commander, topCards, ownedIds, excludeIds)` returning the ranked candidate rows. Call it from both `createDeck` and `getDeckSuggestions`.

While it is being lifted, bound it. The shipped `eligible.slice(0, 5)` is a flat cap taken with no idea which role is short, which is exactly what the handoff's correction calls out: the unowned top-up is not free. Return the ranked list and let each caller bound it — `getDeckSuggestions` keeps its five, and `createDeck` hands the whole ranked list to `planFill`, which reaches past the collection only where a role is genuinely short.

- [ ] **Step 5a: Extract `buildFillPlan`**

The gathering is worth its own exported function: Task 10's retry needs to re-run exactly this work against a deck that already exists, and a second copy of it would drift. Add it at module level:

```ts
/** Gathers the pool, the owned quantities, and the unowned EDHREC staples, then
    plans the fill. Every await inside can throw — the network call especially —
    so callers guard it. */
export async function buildFillPlan(
  userId: string,
  commander: { oracleId: string; name: string; colorIdentity: string[] },
): Promise<FillPlan> {
  const pool = await ownedColorLegalPool(userId, commander);
  const quantities = await ownedQuantities(userId);
  const { data } = await getEdhrecData(commander.oracleId, commander.name);
  const inclusionByName = data?.inclusionByName ?? {};
  const inclusionOf = (name: string): number | null => {
    const lower = name.toLowerCase();
    const raw = inclusionByName[lower] ?? inclusionByName[lower.split(" // ")[0]];
    return Number.isFinite(raw) ? raw : null;
  };

  const ownedIds = new Set(pool.map((c) => c.oracleId));
  const staples = data?.topCards
    ? await unownedStaples(commander, data.topCards, ownedIds, new Set([commander.oracleId]))
    : [];

  return planFill([
    ...pool.map((c) => ({
      oracleId: c.oracleId, name: c.name, typeLine: c.typeLine,
      oracleText: c.oracleText, keywords: c.keywords,
      owned: true, ownedQuantity: quantities.get(c.oracleId) ?? 1,
      inclusionPct: inclusionOf(c.name),
    })),
    ...staples.map((c) => ({
      oracleId: c.oracleId, name: c.name, typeLine: c.typeLine,
      oracleText: c.oracleText, keywords: c.keywords,
      owned: false, ownedQuantity: 0,
      inclusionPct: inclusionOf(c.name),
    })),
  ]);
}
```

- [ ] **Step 5b: Fill inside `createDeck`**

Replace the body after the legality guard. Note where the `try` opens — before `buildFillPlan`, not after it:

```ts
  const deckName = validateDeckName(name);
  let deckId: string;
  try {
    const plan = await buildFillPlan(userId, commander);
    deckId = await db.transaction(async (tx) => {
      const [deck] = await tx.insert(decks)
        .values({ userId, name: deckName, commanderOracleId, filled: true })
        .returning({ id: decks.id });
      if (plan.rows.length > 0) {
        await tx.insert(deckCards).values(
          plan.rows.map((r) => ({ deckId: deck.id, oracleId: r.oracleId, quantity: r.quantity, auto: true })),
        );
      }
      return deck.id;
    });
  } catch {
    // State 15: the deck is here, the cards aren't. The player keeps the deck
    // and the banner offers the fill again — losing the deck too would cost
    // them the one thing they actually asked for.
    const [deck] = await db.insert(decks)
      .values({ userId, name: deckName, commanderOracleId, filled: false })
      .returning({ id: decks.id });
    deckId = deck.id;
  }
  // Outside the try: redirect() signals by throwing, and a catch here would
  // read that throw as a failed fill.
  redirect(`/decks/${deckId}`);
```

Delete the stale comment above the old insert ("Spec: suggestions are display-only — nothing is committed until the user adds it. The deck starts empty") — it now describes the opposite of what happens.

- [ ] **Step 6: Run the tests**

Run: `pnpm test src/app/decks/actions.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the gate and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`

```bash
git add src/app/decks/actions.ts src/app/decks/actions.test.ts
git commit -m "feat(decks): Build this deck commits the role and land baseline (#130)"
```

---

### Task 6: The coverage chip, the phone coverage row, and the disclosure

**Files:**
- Create: `src/components/commanders/coverage-chip.tsx`
- Create: `src/components/commanders/coverage-chip.test.tsx`

**Interfaces:**
- Consumes: `RoleCard` from `../../lib/recs/score`, `CardDetailTrigger` from `../decks/card-detail-provider`, `recommendationsCopy` from `../../lib/copy/recommendations`.
- Produces:
  ```ts
  export const COVERAGE_CAP = { desktop: 12, phone: 6 } as const;
  export const COVERAGE_EXPANDED_CAP = 40;
  export function CoverageChip(props: { card: RoleCard; siblings: string[]; showFigures: boolean }): JSX.Element;
  export function CoverageRow(props: { card: RoleCard; siblings: string[]; showFigures: boolean }): JSX.Element;
  export function CoverageDisclosure(props: {
    width: "desktop" | "phone"; total: number; role: string;
    expanded: boolean; controls: string; onToggle: () => void;
  }): JSX.Element;
  ```
- Later tasks rely on: Task 7 composing these into the four role panels.

The shipped `OwnedChip` is a `<span>` that carries a name. It becomes a `CardDetailTrigger` that carries a name and a figure. The phone gets a different element entirely — a 44px one-column row — because the same chip at 44px would be a button-shaped paragraph.

Bindings from the handoff's component table, all exact:

- **Chip:** `#221D16` background, `1px solid #33402F`, radius 999px, height 28px, padding `0 4px 0 10px`, gap 8px. Dot 6px `--success`. Name mono 11.5px `--fg-body`. Hover: border `--brass`, name `--fg`. **No bar inside a chip.**
- **Figure plate:** background `--elevated`, radius 999px, padding `3px 7px`, mono 10.5px `--fg`, `font-variant-numeric: tabular-nums`.
- **Absent figure:** the plate is removed and the padding returns to `0 10px`; an em dash renders in mono 10.5px `--fg-locked`, `aria-hidden`, with the absence stated in the accessible name instead (`coverage.chipAriaNoFigure`).
- **Phone row:** `--surface`, `1px solid --border`, radius 8px, min-height 44px, padding `0 12px`, gap 9px. Dot 7px. Name 13.5px `--fg`, ellipsed. Figure mono 11.5px `--fg`, right-aligned, tabular.
- **Desktop disclosure:** a dashed `--border-strong` chip, `+N more` in mono 11px `--fg-faint`, turning `--brass` once it is expandable.
- **Phone disclosure:** a full-width 44px dashed row, `Show all N` in mono 12px `--brass`.

`showFigures` is false when EDHREC is absent or degraded for the whole commander; in that case no chip draws a plate and no chip draws an em dash either — the panel-level note (Task 7) says it once, and a column of dashes with no figures beside them means nothing.

- [ ] **Step 1: Write the failing tests**

Create `src/components/commanders/coverage-chip.test.tsx`. Cases, each asserting behaviour rather than markup:

```
- a chip prints its figure and names it in the accessible name
- a chip without a figure prints an aria-hidden em dash and says "No EDHREC figure" in its accessible name
- a chip prints neither plate nor dash when showFigures is false
- clicking a chip opens the card detail for its oracle id, with the role's ids as siblings
- the phone row is at least 44px and ellipses a long name
- the desktop disclosure reads "+N more" and the phone disclosure reads "Show all N"
- an expanded disclosure reads "Show fewer" and carries aria-expanded="true"
- the disclosure carries aria-controls pointing at the container it expands
```

Mock the card-detail context with a stub `CardDetailProvider` the way `card-detail-surfaces.test.tsx` already does.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/components/commanders/coverage-chip.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the components**

Create `src/components/commanders/coverage-chip.tsx` with `"use client"` at the top. Sketch of the chip, which the other two follow:

```tsx
export function CoverageChip({ card, siblings, showFigures }: {
  card: RoleCard; siblings: string[]; showFigures: boolean;
}) {
  const hasFigure = showFigures && Number.isFinite(card.inclusionPct);
  const pct = String(card.inclusionPct);
  return (
    <CardDetailTrigger
      oracleId={card.oracleId}
      name={card.name}
      siblings={siblings}
      // The figure belongs in the accessible name, not on a nested span: a
      // label on a bare span is discarded, which is what BuyTag learned.
      className="inline-flex items-center rounded-full h-[28px] border border-[#33402F] bg-[#221D16] hover:border-brass"
      style={{ gap: 8, padding: showFigures ? "0 4px 0 10px" : "0 10px" }}
    >
      <span aria-hidden className="block shrink-0 rounded-full w-[6px] h-[6px] bg-success" />
      <span className="font-mono text-[11.5px] text-fg-body">{card.name}</span>
      {hasFigure ? (
        <span className="font-mono text-[10.5px] text-fg rounded-full bg-elevated tabular-nums"
              style={{ padding: "3px 7px" }} aria-hidden>
          {recommendationsCopy.coverage.chipFigure(pct)}
        </span>
      ) : showFigures ? (
        <span aria-hidden className="font-mono text-[10.5px] text-fg-locked">
          {recommendationsCopy.coverage.chipNoFigure}
        </span>
      ) : null}
    </CardDetailTrigger>
  );
}
```

`CardDetailTrigger` already applies `aria-label={cardDetailCopy.triggerAria(name)}`. That is the wrong label here — the chip's name must carry the figure. Add an optional `ariaLabel` prop to `CardDetailTrigger` that overrides the default when supplied, leaving every shipped call site unchanged, and pass `coverage.chipAria(name, pct)` / `coverage.chipAriaNoFigure(name)` from the chip and the row.

- [ ] **Step 4: Run the tests**

Run: `pnpm test src/components/commanders/coverage-chip.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the gate and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`

```bash
git add src/components/commanders/coverage-chip.tsx src/components/commanders/coverage-chip.test.tsx src/components/decks/card-detail-provider.tsx
git commit -m "feat(commanders): coverage chips carry an EDHREC figure and open card detail (#131)"
```

---

### Task 7: Role Coverage becomes a section that explains itself

**Files:**
- Create: `src/components/commanders/coverage-section.tsx`
- Create: `src/components/commanders/coverage-section.test.tsx`
- Create: `src/app/commanders/[slug]/coverage-action.ts`
- Modify: `src/components/commanders/detail.tsx`

**Interfaces:**
- Consumes: Task 6's chip, row, and disclosure; `recommendationsCopy`; `RankedCommander.roleCards`, `.roleCounts`, `.synergyState`.
- Produces: `CoverageSection({ width, oracleId, slug, roleCards, roleCounts, synergyState })`, which owns the heading, the sub-caption, the panel-level note, the retry, and all four role panels for one width. `retryCoverageFigures(slug)` server action returning `Record<RoleName, RoleCard[]> | null`.

This is the task that mounts `CardDetailProvider` on `/commanders/[slug]`, replaces the three `REPLACES` strings, and lands the addendum's A1 retry. `RolePanel` moves out of `detail.tsx` into the new client component; the shipped baseline strings at `detail.tsx:312-316` and the empty string at `:330` move with it, unchanged — the copy file explicitly does not own them.

**A1, the retry.** One retry, four panels reading one payload — so the retry lives on the section, never on a panel. Desktop places it inline to the right of the sentence; the phone puts it on its own 44px line. The degraded note takes a `--warning` left rule where the absent note takes `--fg-faint`; the disabled state during the retry is `opacity: 0.55` plus `aria-busy`, matching `CardDetailTrigger`'s pending treatment. The action re-runs `scoreOneCommander` and returns only `roleCards`; on a second failure the note stays and the retry re-enables.

**Density** (from `DENSITY-long-role.md`): one `slice(0, expanded ? 40 : cap)` where cap comes from the `width` prop — the page already renders separate mobile and desktop trees, so the width is known without a media query and without measuring. The expanded container takes `max-height: 320px; overflow-y: auto` at both widths. Plain overflow, no virtualisation. Collapsing discards the scroll position and **must not steal focus**. Past 40, `beyondCap` renders as inert text with no hit box.

Edge counts, all of which the tests must cover: 0 → the shipped `No {role} cards in your pool`, no disclosure. 1–6 → all, no disclosure, both widths. 7–12 → desktop shows all with no disclosure; phone shows 6 plus `Show all N`. 13–40 → capped plus a disclosure at both widths. 41+ → capped; expanded shows 40 and the inert `+N more not shown`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/commanders/coverage-section.test.tsx` covering: the sub-caption branch (`subcaption` with figures, `subcaptionNoFigures` without); the absent note versus the degraded note and their different left rules; the retry calling the action once and re-rendering figures on success; the retry staying available after a failure; and every edge count above at both widths.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/components/commanders/coverage-section.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the server action**

Create `src/app/commanders/[slug]/coverage-action.ts`:

```ts
"use server";

import { requireUserId } from "../../../lib/auth";
import { findScoredCommander } from "...";   // whatever the page already uses to resolve a slug
import type { RoleCard } from "../../../lib/recs/score";

/** A1: one retry for the whole section. Re-resolves EDHREC and hands back only
    the role cards — the four panels read one payload, so there is one action,
    not one per panel. Null means it failed again and the note stays put. */
export async function retryCoverageFigures(
  slug: string,
): Promise<Record<"ramp" | "draw" | "removal" | "wipes", RoleCard[]> | null> {
  const userId = await requireUserId();
  // Resolve the same way the page does, then return scored.roleCards, or null.
}
```

Read `src/app/commanders/[slug]/page.tsx` first and reuse its resolution path exactly; do not add a second way to turn a slug into a commander.

- [ ] **Step 4: Write the section**

Create `src/components/commanders/coverage-section.tsx` with `"use client"`. It holds three pieces of state: the `roleCards` map (seeded from props, replaced by a successful retry), a `retrying` boolean, and an `expanded` set of role names. It renders the heading, the sub-caption, the note when `synergyState !== "ok"`, and the four panels.

- [ ] **Step 5: Rewire `detail.tsx`**

- Delete `RolePanel` and move its body into `coverage-section.tsx`. **Keep `OwnedChip`** — `detail.tsx:406` and `detail.tsx:697` both render `overlapOwned` (still `string[]`) through it, and neither is part of this feature.
- Replace both Role Coverage blocks (the mobile block around `:609` and the desktop block around `:905`) with `<CoverageSection width="phone" … />` and `<CoverageSection width="desktop" … />`. Each block's heading and sub-caption move inside the component, so the `Your owned cards by role` string exists in exactly one place — the copy module.
- Wrap the component's whole returned tree in `<CardDetailProvider>`. It is a client component and `detail.tsx` is a server component, which is fine: only serializable props cross. The modal ships no Add control, so the handoff's "no Add control in the modal on this route" needs no code.
- Replace the desktop seed note at `:866` (`Your owned pool will seed the deck builder`) with `recommendationsCopy.build.seedNote("68")`.
- Replace the mobile sticky sub-line at `:750` (`{c.colorPoolSize} cards in your pool`) with `recommendationsCopy.build.stickyPromise("68")`, and label the bar with `build.stickyLabel`.
- Leave the shipped `FitHero` synergy note at `:234` alone. It is a different note about a different thing, and duplicating it is not the same as reusing it.

- [ ] **Step 6: Run the tests and the design review**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Then run the design-review skill against `design/design_handoff_the99_recommendations/README.md` for the Role Coverage rows of the component table, at both widths.

- [ ] **Step 7: Commit**

```bash
git add src/components/commanders/coverage-section.tsx src/components/commanders/coverage-section.test.tsx src/app/commanders/[slug]/coverage-action.ts src/components/commanders/detail.tsx
git commit -m "feat(commanders): Role Coverage explains its figures and opens each card (#131)"
```

---

### Task 8: The auto tag is the keep button

**Files:**
- Create: `src/components/decks/auto-tag.tsx`
- Create: `src/components/decks/auto-tag.test.tsx`
- Modify: `src/components/decks/decklist-row.tsx`
- Modify: `src/app/decks/actions.ts`
- Test: `src/components/decks/decklist-row.test.tsx` (exists — add cases)

**Interfaces:**
- Consumes: `recommendationsCopy.auto`, `DeckDetailCard.auto` from Task 3.
- Produces: `AutoTag({ deckId, oracleId, name })`, and the server action `keepAutoCard(deckId: string, oracleId: string): Promise<void>`, which sets `deck_cards.auto = false` for that one row and revalidates the deck path.

**The tag calls the action itself.** `decklist-row.tsx` takes no handler props at all — it imports `removeCardFromDeck` directly (`:6`) and runs it through `useDeckMutation` (`:66`). Threading an `onKeep` down would mean touching `decklist.tsx` and `builder-shell.tsx` for a control that has one call site. `AutoTag` follows the row's own pattern instead: import the action, hold its own `useDeckMutation`, own its own pending state.

Ruling 1: the tag is the button. `auto` at rest, `keep ✓` on hover and on focus, and activating it clears the flag for good. Geometry is `BuyTag`'s exactly, hueless: mono 9.5px `--fg-locked` on `--elevated`, radius 4px, padding `1px 5px`. Hover and focus take label `--brass`, border `1px --brass-shadow`, text `keep ✓`. On the phone it needs a 44×44 hit box, which the row already provides in height — pad the tag out to it rather than growing the tag's own box.

`decklist-row.tsx` gains one slot between `BuyTag` and the `✕`, and nothing else moves. A meta row (`+N more`) takes no marker, one `auto` tag per stack.

The flag is cleared by this control and by nothing else — not the modal, not a re-sort, not a group change. That is the whole reason the sweep can be trusted.

- [ ] **Step 1: Write the failing tests**

`auto-tag.test.tsx`:

```
- at rest the tag reads "auto"
- on hover the label becomes "keep ✓"
- on keyboard focus the label becomes "keep ✓" (the same as hover — a keyboard user must be able to read the control before activating it)
- the accessible name is "Keep {name} in this deck" in both states, so it does not change under the user's cursor
- activating it calls keepAutoCard once with the deck id and the oracle id
- while pending it is aria-busy and does not fire the action again
```

`decklist-row.test.tsx`, added cases:

```
- a row with auto=true renders the tag between the buy tag and the remove button
- a row with auto=false renders no tag
- a meta row renders no tag even when auto is true
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/components/decks/auto-tag.test.tsx src/components/decks/decklist-row.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write the component and the action**

`src/components/decks/auto-tag.tsx` is a `"use client"` component holding one `hovered` / `focused` boolean. The label swaps; the `aria-label` does not. It imports `keepAutoCard` from `../../app/decks/actions` and drives it with `useDeckMutation` from `./use-deck-mutation`, exactly as `DecklistRow` drives `removeCardFromDeck` at `decklist-row.tsx:66-93`. `aria-busy` comes from that hook's `isPending`.

In `src/app/decks/actions.ts`:

```ts
/** Clears the fill's marker on one row. The card stays in the deck — the marker
    is a claim about who put it there, and keeping it is the player saying "mine". */
export async function keepAutoCard(deckId: string, oracleId: string): Promise<void> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  await db.update(deckCards).set({ auto: false })
    .where(and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId)));
  revalidatePath(`/decks/${deckId}`);
}
```

- [ ] **Step 4: Wire the slot**

In `decklist-row.tsx`, after the `BuyTag` line:

```tsx
{!isMeta && card.auto && (
  <AutoTag deckId={deckId} oracleId={card.oracleId} name={card.name} />
)}
```

That is the whole wiring. No new props cross `decklist.tsx` or `builder-shell.tsx`, and neither file is touched by this task.

- [ ] **Step 5: Run the tests, the gate, and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`

```bash
git add src/components/decks/auto-tag.tsx src/components/decks/auto-tag.test.tsx src/components/decks/decklist-row.tsx src/components/decks/decklist-row.test.tsx src/app/decks/actions.ts src/components/decks/builder-shell.tsx
git commit -m "feat(decks): the auto marker is the keep control (#130)"
```

---

### Task 9: Clear all auto

**Files:**
- Create: `src/components/decks/clear-auto.tsx`
- Create: `src/components/decks/clear-auto.test.tsx`
- Modify: `src/components/decks/group-toggle.tsx`
- Modify: `src/components/decks/builder-shell.tsx`
- Modify: `src/app/decks/actions.ts`

**Interfaces:**
- Consumes: `recommendationsCopy.auto`, `DeckDetailCard.auto`.
- Produces:
  ```ts
  /** One removed row, carried so Undo can restore a stacked basic at the exact
      quantity it was swept at rather than guessing 1. */
  export type SweptRow = { oracleId: string; quantity: number };

  export async function clearAutoCards(deckId: string): Promise<SweptRow[]>;
  export async function restoreAutoCards(deckId: string, rows: SweptRow[]): Promise<void>;
  ```
  plus `ClearAutoButton({ count, keptCount, onClear, pending })` and `SweepReceipt({ removed, onUndo })`.

One server action, one optimistic list update, one live-region message — never one per row. That is the difference between this and the shipped per-row undo, which stays exactly as it is.

- `Clear all auto` is a `GhostButton` in mono 12px, right-aligned in the group toolbar, with the count on its face (`auto.clearAll` / `auto.clearAllMobile`). **No confirmation dialog.**
- At zero it is **absent entirely** — never rendered disabled.
- Once some cards have been kept, `auto.keptNote` sits beside it.
- The receipt is one strip, not 58 rows: `--surface-sunken`, `1px dashed --border-strong`, radius 8px, mono 12px `--fg-locked`, with a brass `Undo` underlined in `--brass-shadow`. Its lifetime is decklist state, matching PR #204's rule for the per-row receipt.
- The announcement is `auto.sweptAnnounce(removed, total)`, said once into the shipped live region at `builder-shell.tsx:354`.
- A failed sweep says `auto.sweepFailed` and rolls the optimistic list back.

- [ ] **Step 1: Write the failing tests**

`clear-auto.test.tsx`:

```
- the control is absent at a count of 0 (not disabled, not hidden — absent)
- the control prints the count on its face
- the kept note appears only once at least one card has been kept
- clearing calls the action once and removes every auto row from the list optimistically
- a kept row survives the sweep
- the receipt says "{n} auto cards removed" once, not once per row
- Undo restores every removed row
- a failed sweep restores the list and says so
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/components/decks/clear-auto.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write the actions**

```ts
/** The whole sweep in one statement — 58 rows must not be 58 round trips, and a
    partial sweep would leave a receipt that lies about what it removed. Returns
    the rows so Undo can put back exactly what went, and nothing the player kept. */
export async function clearAutoCards(deckId: string): Promise<SweptRow[]> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  const removed = await db.delete(deckCards)
    .where(and(eq(deckCards.deckId, deckId), eq(deckCards.auto, true)))
    .returning({ oracleId: deckCards.oracleId, quantity: deckCards.quantity });
  revalidatePath(`/decks/${deckId}`);
  return removed;
}
```

`restoreAutoCards(deckId, rows)` re-inserts those rows with `auto: true`, using `onConflictDoNothing` so a double-undo is harmless. The quantity comes from the delete's returning clause rather than a fresh read of the collection, so a stacked basic comes back at the count it was swept at even if the shelf changed in between.

- [ ] **Step 4: Write the components and wire the toolbar**

`ClearAutoButton` goes into `group-toggle.tsx` after the existing `<span className="flex-1" aria-hidden />` spacer and before the `Group` label. `SweepReceipt` renders above the first group in `decklist.tsx`, driven by state that lives in `builder-shell.tsx` beside the shipped `spentSlot`.

- [ ] **Step 5: Run the tests, the gate, and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`

```bash
git add src/components/decks/clear-auto.tsx src/components/decks/clear-auto.test.tsx src/components/decks/group-toggle.tsx src/components/decks/decklist.tsx src/components/decks/builder-shell.tsx src/app/decks/actions.ts
git commit -m "feat(decks): sweep the untouched auto cards in one gesture (#130)"
```

---

### Task 10: The arrival and the fill that didn't land

**Files:**
- Create: `src/components/decks/provenance-line.tsx`
- Create: `src/components/decks/provenance-line.test.tsx`
- Modify: `src/components/decks/builder-shell.tsx`
- Modify: `src/lib/decks/read.ts`
- Modify: `src/app/decks/actions.ts` (the `fillDeck` retry)

**Interfaces:**
- Consumes: `recommendationsCopy.fill`, `DeckDetail.filled`, the auto/owned counts already on the cards, and `buildFillPlan` from Task 5.
- Produces: `ProvenanceLine({ filled, bought, open, shortRole, width })`, `FillFailedBanner({ onRetry, pending })`, and the server action `fillDeck(deckId: string): Promise<void>`.

One provenance line, no toast, not dismissible, and it leaves when the last auto card does. It describes the deck's state, so it is derived, never stored: render it when the deck has at least one `auto` row.

- `filled` is the number of cards the fill put in; `bought` is how many of those are unowned; `open` is `99 - filled`. All three are counted from the cards already on the page — no new column, no new query.
- Copy branches three ways: `fill.provenance` when something was bought, `fill.provenanceAllOwned` when nothing was, and `fill.provenanceShort` when a role came up short. The short branch names the role, which comes from comparing the deck's role counts to `ROLE_TARGETS` — the same arithmetic the role strip already does.
- Phone takes `provenanceMobile`.
- Shape: `#181410`, `1px solid --border`, `border-left: 3px solid --brass`, radius 9px, padding `11px 15px`, with a 20px `i` disc and body text 12.5px `--fg-body`.
- **No celebration.** `shouldCelebrate` fires at 99 of 99 and the fill stops at 68, so nothing needs guarding — but do not add a celebration path here, and do not touch the shipped one.
- The fill-failed banner is the same shape with `border-left: 3px solid --warning` and a `⚠` disc, using `fill.failedHeading` / `failedBody` / `failedRetry`. It renders when `deck.filled === false` and the deck has no cards at all. Its retry calls a new `fillDeck(deckId)` action:

```ts
/** The retry behind the fill-failed banner. Re-runs Task 5's gathering against a
    deck that already exists. Refuses a deck that already holds cards — a retry
    must not double a deck the player has since added to by hand. */
export async function fillDeck(deckId: string): Promise<void> {
  const userId = await requireUserId();
  const deck = await requireDeck(deckId, userId);
  const commander = await loadCommander(deck.commanderOracleId);
  if (!commander) return;
  const existing = await db.select({ oracleId: deckCards.oracleId })
    .from(deckCards).where(eq(deckCards.deckId, deckId)).limit(1);
  if (existing.length > 0) return;

  const plan = await buildFillPlan(userId, commander);
  await db.transaction(async (tx) => {
    if (plan.rows.length > 0) {
      await tx.insert(deckCards).values(
        plan.rows.map((r) => ({ deckId, oracleId: r.oracleId, quantity: r.quantity, auto: true })),
      );
    }
    await tx.update(decks).set({ filled: true }).where(eq(decks.id, deckId));
  });
  revalidatePath(`/decks/${deckId}`);
}
```

`buildFillPlan` is Task 5's export — this action adds no second copy of the gathering. Use whatever the shipped `getDeckSuggestions` already uses to load a commander row by oracle id rather than inventing `loadCommander`; if no such helper exists, lift one alongside `unownedStaples` in Task 5 and name it in that task's Produces.

- [ ] **Step 1: Write the failing tests**

```
- the line renders only when the deck holds at least one auto card
- it names the bought count when something was bought
- it takes the all-owned branch when nothing was
- it takes the short branch and names the role when a role missed its target
- the phone renders the mobile branch
- the failed banner renders for an empty unfilled deck and not for an empty swept one
```

That last case is why `decks.filled` exists: an empty deck the player swept is `filled = true` and must not offer to fill again as though the first attempt had crashed.

- [ ] **Step 2: Run to verify they fail, then build it**

Run: `pnpm test src/components/decks/provenance-line.test.tsx`

- [ ] **Step 3: Run the gate and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`

```bash
git add src/components/decks/provenance-line.tsx src/components/decks/provenance-line.test.tsx src/components/decks/builder-shell.tsx src/lib/decks/read.ts src/app/decks/actions.ts
git commit -m "feat(decks): say where the filled cards came from, and when they didn't arrive (#130)"
```

---

### Task 11: Shopping is grouped by the gap each card closes

**Files:**
- Modify: `src/components/decks/decklist.tsx`
- Modify: `src/components/decks/decklist-group-header.tsx`
- Modify: `src/components/decks/decklist-row.tsx`
- Test: `src/components/decks/decklist.test.tsx` (create if absent)

**Interfaces:**
- Consumes: `recommendationsCopy.shopping`, `ROLE_TARGETS`, the deck's role counts.
- Produces: no new exports — the Shopping filter's rendering changes in place.

Today Shopping is a flat `cards.filter((c) => !c.owned)`. It becomes role groups, each headed with the gap it closes, because "nothing here is a wildcard" is only true if the page shows which gap each row is closing.

- Group header: mono 10px `--brass`, letter-spacing `.14em`, uppercase, with the gap clause `shopping.groupGap(n, from, to)` in mono 10px `--fg-faint` beside it.
- Footer above a `1px --border` rule, mono 10.5px: `shopping.footer` when every to-buy card is auto, `shopping.footerMixed` when some are not.
- Intro line `shopping.intro(n)` at the top of the filter.
- **No prices, no vendor links.** There is no price data anywhere in this system and this task does not add any.
- **Basics never enter Shopping** — ruling 7 already guarantees it, since lands are never bought. Assert it in a test anyway; a future change to the fill must fail loudly here.
- Empty state: `shopping.emptyCoveredHeading` and `emptyCoveredBody(open)` when the collection covered every role.

**Addendum A2 — the phone Shopping row grows to 52px.** It is the only row in the builder that does, and only in this view: the All view's row stays 44px and prints no figure. The figure goes on a meta line under the name: `shopping.rowFigure(pct)` or, on absence, the sentence `shopping.rowNoFigure` — not an em dash, because there is no column of figures beside it to give a dash meaning. For the shrink order to be right the meta span needs `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` and the name needs `flex-auto`, not `flex-1`.

- [ ] **Step 1: Write the failing tests**

```
- Shopping groups by role and heads each group with the gap it closes
- the gap clause reads "{n} · closes {from}→{to}" against the deck's real counts
- a basic land never appears in Shopping
- the footer takes the all-auto branch when every to-buy card is auto
- the footer takes the mixed branch otherwise
- the empty-covered state renders when there is nothing to buy
- the phone Shopping row is 52px and prints the EDHREC figure on its meta line
- the phone All row stays 44px and prints no figure
- a row with no figure prints "no EDHREC figure", not an em dash
```

- [ ] **Step 2: Run to verify they fail, then build it**

- [ ] **Step 3: Run the gate, design review, and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`, then the design-review skill against the Shopping rows of the component table and addendum A2, at both widths.

```bash
git add src/components/decks/decklist.tsx src/components/decks/decklist-group-header.tsx src/components/decks/decklist-row.tsx src/components/decks/decklist.test.tsx
git commit -m "feat(decks): Shopping groups every card under the gap it closes (#130)"
```

---

### Task 12: The swept-empty branch and the role-counter cell's two treatments

**Files:**
- Modify: `src/components/decks/builder-shell.tsx`
- Modify: `src/components/decks/role-counter-cell.tsx`
- Test: `src/components/decks/builder-empty-entrance.test.tsx` (exists — add cases)
- Test: `src/components/decks/role-counter-strip.test.tsx` (exists — add cases)

**Interfaces:**
- Consumes: `recommendationsCopy.sweptEmpty`, `DeckDetail.filled`.
- Produces: no new exports.

Two small, unrelated finishes that share a file boundary.

**The swept-empty branch.** The shipped first-run empty state welcomes a player to a deck they have not built. Reached by deletion, it congratulates them on a demolition. So an empty deck with `filled === true` takes `sweptEmpty.heading`, `sweptEmpty.body(commanderName)`, and the `sweptEmpty.cta` link into Consider; an empty deck with `filled === false` keeps the shipped copy, untouched.

**A3, the in-flight cell.** Four parts, all of them required by the addendum:

1. **No track and no fill element** — `height: 0; border-top: 1px dashed var(--border-strong)`, holding the track's 5px as margin so the cell does not change height between frames. A rule is not a container, so there is nothing for a fill to be measured against.
2. **The denominator stays, the numerator is a dash** — `— / 10`. The target is known before the fill starts, and printing it is what makes the dash read as *pending* rather than *broken*.
3. **Every colour in the cell drops a step** — label `--fg-locked`, figure `--border-strong` — so the strip reads as not-yet rather than as five failed roles.
4. **The status pill goes dashed and reads `Draft`.** Not a new string and not a new computation: `Draft` is what the shipped count-driven computation already returns for a deck with no rows, so the only change is the dashed treatment. Do **not** add a copy key for the pill — the copy file deliberately records a mapping instead, because a second live value in a second module is the exact defect the add-panel addendum flagged when `strip.hint` was written from two files.

**No motion.** No shimmer, no pulse, no indeterminate sweep; nothing new joins the reduced-motion block.

Ruling 4 means `createDeck` never renders this frame, but the treatment is still built: any path that hands the cell an unknown count needs it, and drawing a zero there would be a real bar for no data.

**A4, the short cell in a just-filled deck.** It takes `1px solid var(--border-strong)` in place of `--border`. The strip itself is untouched — this is a cell-level treatment only.

- [ ] **Step 1: Write the failing tests**

```
- an empty deck that was filled takes the swept copy
- an empty deck that was never filled keeps the shipped first-run copy
- a cell with an unknown count draws a dashed rule and a dash numerator, and no fill element
- a cell with an unknown count keeps its denominator
- a cell with an unknown count drops its label to --fg-locked and its figure to --border-strong
- the status pill in a deck with no rows still reads "Draft" and is drawn dashed
- a short cell in a just-filled deck takes the border-strong hairline
- a met cell in a just-filled deck does not
```

- [ ] **Step 2: Run to verify they fail, then build it**

- [ ] **Step 3: Run the gate and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`

```bash
git add src/components/decks/builder-shell.tsx src/components/decks/role-counter-cell.tsx src/components/decks/builder-empty-entrance.test.tsx src/components/decks/role-counter-strip.test.tsx
git commit -m "feat(decks): a swept deck says so, and a short cell in a filled deck reads as one (#130)"
```

---

## Final verification

- [ ] `pnpm typecheck && pnpm lint && pnpm test`
- [ ] `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
- [ ] `git fetch origin && git rebase origin/main`
- [ ] Run the design-review skill over the whole branch against `design/design_handoff_the99_recommendations/README.md`, `ADDENDUM-README.md`, and `DENSITY-long-role.md` — property-table enumerate, verify, confirm — at both widths.
- [ ] Confirm no new token, hex, or motion class entered `src/app/globals.css`.
- [ ] Confirm every user-visible string in the diff comes from `src/lib/copy/recommendations.ts`.
- [ ] Open the PR, request Copilot review, and work the rounds to the merge bar in `~/.claude/CLAUDE.md`.
- [ ] After merge: confirm migration `0013` applied by checking `GET /api/health` returns 200.
