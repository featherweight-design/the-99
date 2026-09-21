# Informed Building Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive the fill, the top-off list and the Add panel from the measured skeleton instead of asserted constants, so a built deck is shaped like a real deck for that commander.

**Architecture:** Sub-project 1 computes the skeleton and reads it nowhere. This adds four measured role columns beside the ten type columns, lowers the composition sample bar so every commander has a target, then rewires `planFill` to build against those targets and carries the same numbers to the surfaces that quote flat constants.

**Tech Stack:** Next.js 16 App Router, React 19, Drizzle ORM on Neon Postgres, Vitest, Playwright, `tsx` for scripts.

**Spec:** `docs/superpowers/specs/2026-09-20-informed-building-design.md`

> **This plan is revision 2.** Revision 1 was reviewed before implementation and found **not
> executable**: 34 findings, of which PR 5 did not compile at the point it was inserted, PR 3's
> migration failed on a populated table, two PRs rested on false claims about where code lives,
> and two tasks specified contradictory selection rules. Every correction is marked **[R2]** at
> the point it applies, because a plan that silently absorbs a review teaches the next reader
> nothing.

## Global Constraints

- **Package manager is `pnpm`.** Never npm or yarn.
- **All work in a worktree** under `.worktrees/<branch>`; copy `.env` from the repo root first.
- **Pre-push gate, every push:** `pnpm typecheck && pnpm lint && pnpm test`, plus `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`, then `git fetch origin && git rebase origin/main`.
- **Stage files by name.** Never `git add -A`.
- **No em-dashes in customer-facing copy** — except `decks-builder.ts`'s `rationaleBodies`, whose own comment says they are quoted from the design canvas and "must not be fixed". **[R2]**
- **US English** in all copy.
- **Probes point at `local-dev`**, never staging or production. Staging is read-only for measurement.
- **Every probe assertion gets a mutation run**, recorded in the PR body.
- **A new catalog column needs a catalog refresh dispatched alongside the PR that adds it.**
- **PR review follows the `pr-review` skill.** This repo merges via **squash**.
- **The pre-open cold-eyes subagent runs immediately before every `gh pr create`.**

## Facts revision 1 got wrong. Read these before any task. **[R2]**

| claim in R1 | actual |
|---|---|
| `readSynergyCards` is in `src/lib/commanders/synergy-cards.ts` | it is in `src/app/commanders/[slug]/synergy-read.ts:28`; the `lib` module is pure and has nothing to change |
| `RECOMMENDED_MIX` has 8 consumers | **six** value-importers, plus three unlisted prop-passers: `decklist.tsx:834`, `review-changes.tsx:890`, `about/ch01-figures.tsx:696` |
| `FillRow.role` is persisted | it is **memory-only**. `deck_cards` and `fill_pass_cards` have no role column |
| `build-commander-index.ts` writes `commander_support` | it is an 86-line wrapper; the writes are in `src/lib/edhrec/seed-index.ts` |
| the basis chain resolves in `load.ts` | `load.ts:309-312` passes all four candidates through; `build.ts`'s `skeleton()` picks the first hit |
| `landTarget` has 2 call sites | **four**: `suggest.ts:119`, `suggest.ts:154`, `fill.ts:39`, `fill.ts:137` |
| `cards.layout` is nullable | `text("layout").notNull().default("normal")` |
| `oracle_text` is the front face | it holds **both faces**, joined `"front\n//\nback"` (`transform.ts:19`) |

---

## PR boundaries

| PR | Tasks | Delivers | Design? |
|---|---|---|---|
| **1** | 1–3 | Modal lands, keyed on `layout`, reaching the fill's pool | no |
| **2** | 4 | `readSynergyCards` reads the stored pair row | no |
| **3** | 5–7 | Four measured role columns, derivation, floors | no |
| **4** | 8–9 | The three thin buckets; every commander gets a target | no |
| **5** | 10–11 | Profile carries `roleTargets`; `fitSkeleton` reads them | no |
| **6** | 12–15 | `landTarget` **and** the fill, together | no |
| **7** | 16–19 | `recommendedMix` per deck, the route read, copy, About | no |
| **8** | 20 | Add panel orders within a shelf by type gap | no |
| **9a** | 21 | The existing bulk control runs the real fill | no |
| **9b** | 22 | A second bulk control, and the concession labels | **yes** |

**[R2] `landTarget` and `planFill` are now ONE PR.** R1 changed `landTarget`'s signature in PR 5 and left `fill.ts`'s two call sites to PR 6, so PR 5 did not compile.

**[R3] PR 10 is GONE, and its absence is the point.** It proposed a layered clear; the app already separates the fill by PASS and already draws a per-pass undo (`provenance-line.tsx`, `pass-mark.tsx`, `Undo these {n}`). Filling to 99 in one pass would have collapsed that, so the fix is Task 14 recording the residual as its own pass — no control, no migration, no backfill, no Design round. See spec §2.2.

Only 9b is blocked on Design now. Emit the brief when PR 6 merges.

---

### Task 1: `playableAsLand`, and the front-face text — PR 1

**Files:** Modify `src/lib/cards/facet.ts` · Test `src/lib/cards/facet.test.ts`

**Interfaces — Produces:**
- `playableAsLand(typeLine: string, layout: string): boolean` — **[R2]** `layout` is non-null.
- `castFaceText(oracleText: string | null, layout: string): string | null` — the text of the
  spell you actually cast.

**[R2] Why `castFaceText` is here and not left implicit.** `cards.oracle_text` holds both faces
joined `"front\n//\nback"`. `isLandFace` reads the front face, so for a land-backed MDFC it
returns false and `classifyRoles` then reads the land back's `{T}: Add {R}` and calls the card
**ramp**. That inflates every derived ramp target and lets one card take a ramp slot and a land
slot. This is local to the derivation and the fill; `classifyRoles` itself is unchanged, because
moving it would move figures on surfaces this sub-project does not touch.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { castFaceText, isLandFace, playableAsLand } from "./facet";

describe("playableAsLand", () => {
  it("accepts a modal_dfc with a land back", () => {
    expect(playableAsLand("Sorcery // Land", "modal_dfc")).toBe(true);
    expect(playableAsLand("Creature — Shapeshifter Rogue // Land", "modal_dfc")).toBe(true);
  });

  it("refuses a transform card with a land back", () => {
    expect(playableAsLand("Legendary Creature — God // Land", "transform")).toBe(false);
    expect(playableAsLand("Artifact // Land", "transform")).toBe(false);
  });

  // [R2] THE PATHWAY CASE. R1's three "refuses" tests all returned false at the layout check,
  // so deleting the isLandFace guard broke nothing. A Pathway is `modal_dfc` with `Land // Land`
  // — the only shape that reaches the guard, and it must be false because isLandFace already
  // counts it.
  it("refuses a modal_dfc whose FRONT is already a land", () => {
    expect(isLandFace("Land // Land")).toBe(true);
    expect(playableAsLand("Land // Land", "modal_dfc")).toBe(false);
  });

  it("refuses a modal_dfc whose back is not a land", () => {
    expect(playableAsLand("Creature — Human // Creature — Werewolf", "modal_dfc")).toBe(false);
  });

  it("refuses a single-faced card", () => {
    expect(playableAsLand("Instant", "normal")).toBe(false);
  });
});

describe("castFaceText", () => {
  // The real shape: transform.ts joins faces with "\n//\n".
  it("takes the front half for a modal_dfc", () => {
    expect(castFaceText("Kicker {1}{R}\n//\nEnters tapped.", "modal_dfc")).toBe("Kicker {1}{R}");
  });

  // A transform card is CAST as its front face too, and its back text is equally not castable.
  it("takes the front half for a transform card", () => {
    expect(castFaceText("Deals 2 damage.\n//\n{T}: Add {R}.", "transform")).toBe("Deals 2 damage.");
  });

  // A split card's halves are BOTH castable, so neither may be dropped.
  it("keeps both halves of a split card", () => {
    expect(castFaceText("Deal 2 damage.\n//\nCounter it.", "split"))
      .toBe("Deal 2 damage.\n//\nCounter it.");
  });

  it("passes a single-faced card and a null through unchanged", () => {
    expect(castFaceText("Draw a card.", "normal")).toBe("Draw a card.");
    expect(castFaceText(null, "modal_dfc")).toBe(null);
  });
});
```

- [ ] **Step 2: Run it and watch it fail.** `pnpm vitest run src/lib/cards/facet.test.ts`

- [ ] **Step 3: Implement.** `playableAsLand` returns false unless `layout === "modal_dfc"`, the
front face is not a land, and the second face is. `castFaceText` splits on `"\n//\n"` and returns
the first half **only** for `modal_dfc` and `transform`; every other layout is returned whole.
Document why `split`, `adventure` and `prepare` are excluded: both halves are castable.

- [ ] **Step 4: Run and pass.** `pnpm vitest run src/lib/cards/facet.test.ts`

- [ ] **Step 5: Commit.**

```bash
git add src/lib/cards/facet.ts src/lib/cards/facet.test.ts
git commit -m "A third land answer, and the text of the spell you actually cast"
```

---

### Task 2: The profile carries land-capable cards

**Files:** Modify `src/lib/profile/types.ts`, `src/lib/profile/build.ts`, `src/lib/profile/load.ts` · Test `src/lib/profile/build.test.ts`

**Interfaces:**
- Consumes: `playableAsLand` (Task 1).
- Produces: `ProfileCard.layout: string`; `ProfileCounts.landCapable: number`;
  `DeckProfile.landCapableCards: CardRef[]`.

**Counts stay exclusive.** `counts.land` keeps its meaning so the ten type axes still sum to the
deck. `landCapable` is a second figure beside it.

- [ ] **Step 1: Write the failing test**

```ts
it("counts a modal land as land-capable without moving counts.land", () => {
  const profile = buildDeckProfile(inputWith([
    { oracleId: "a", name: "Forest", typeLine: "Basic Land — Forest", layout: "normal", cmc: 0, quantity: 10 },
    { oracleId: "b", name: "Shatterskull Smashing // Shatterskull, the Hammer Pass",
      typeLine: "Sorcery // Land", layout: "modal_dfc", cmc: 6, quantity: 1 },
    { oracleId: "c", name: "Ojer Axonil, Deepest Might // Temple of Power",
      typeLine: "Legendary Creature — God // Land", layout: "transform", cmc: 4, quantity: 1 },
  ]));
  expect(profile.counts.land).toBe(10);
  expect(profile.counts.landCapable).toBe(11);
  expect(profile.landCapableCards.map((c) => c.oracleId)).toEqual(["b"]);
});
```

- [ ] **Step 2: Run and fail.** `pnpm vitest run src/lib/profile/build.test.ts -t "land-capable"`

- [ ] **Step 3: Implement.** Add `layout` to `ProfileCard`, `landCapable` to `ProfileCounts` and
`landCapableCards` to `DeckProfile`, with the comment explaining why the counts stay exclusive.
Add `layout: cards.layout` to `load.ts`'s `cardRows` projection.

- [ ] **Step 4: Run.** `pnpm vitest run src/lib/profile/ && pnpm typecheck && pnpm probe:bracket`

- [ ] **Step 5: Commit.**

```bash
git add src/lib/profile/types.ts src/lib/profile/build.ts src/lib/profile/load.ts src/lib/profile/build.test.ts
git commit -m "The profile counts land-capable cards beside its exclusive land count"
```

---

### Task 3: `layout` reaches the fill's pool — **[R2] new task**

**Files:** Modify `src/lib/decks/suggestions-read.ts` (`ownedColorLegalPool` ~:36, `unownedStaples` ~:77), `src/app/decks/actions.ts` (`buildFillPlan` :63), `src/lib/decks/fill.ts` (`FillCandidate`) · Test `src/lib/decks/suggestions-read.test.ts`

**Why this task exists.** R1 added `layout` to `FillCandidate` and stopped. Neither pool query
selects `cards.layout` and `buildFillPlan` does not map it, so every unit test would pass while
the shipped fill counted **zero** modal lands. A column that never reaches the consumer is the
same defect class as a prop threaded to a component that never reads it.

- [ ] **Step 1: Write the failing test**

```ts
// The emitted SQL, because the mapping is the thing that breaks and a fixture cannot see it.
it("selects layout in both fill pools", () => {
  expect(ownedColorLegalPoolQuery(["W"]).toSQL().sql).toContain('"layout"');
  expect(unownedStaplesQuery(["id"]).toSQL().sql).toContain('"layout"');
});
```

- [ ] **Step 2: Run and fail.**

- [ ] **Step 3: Implement.** Add `layout: cards.layout` to both projections, carry it onto
`PoolCard`, and map it in `buildFillPlan`'s two `.map()` calls into `FillCandidate`.

- [ ] **Step 4: Run.** `pnpm typecheck && pnpm vitest run src/lib/decks/`

- [ ] **Step 5: Commit and open PR 1.**

```bash
git add src/lib/decks/suggestions-read.ts src/app/decks/actions.ts src/lib/decks/fill.ts src/lib/decks/suggestions-read.test.ts
git commit -m "layout reaches the fill's pool, or the modal-land rule never fires"
```

**PR 1 body records:** the corrected figures (7 `modal_dfc` across 5 decks, not 11 across 8;
Gishath has 2), that four of the originally counted cards are `transform`, and that
`oracle_text` holds both faces.

---

### Task 4: `readSynergyCards` reads the stored pair row — PR 2

**Files:** Modify `src/app/commanders/[slug]/synergy-read.ts:28` **[R2]** · Test `src/app/commanders/[slug]/synergy-read.test.ts`

**[R2] R1 named `src/lib/commanders/synergy-cards.ts`, which is pure and has nothing to change,
and its tests called a `readSynergyCardsQuery` export that does not exist.** The reader is
`async` and returns rows. Extract the two query builders so the SQL is assertable without a
database, exactly as `src/lib/decks/built.test.ts` does for `notBuiltBy`.

- [ ] **Step 1: Extract, with no behaviour change.** Pull the single-commander select and the new
pair select into exported `singleSupportQuery(ids)` and `pairSupportQuery(a, b)`. Run
`pnpm vitest run src/app/commanders/` and confirm green before writing a line of the new branch.

- [ ] **Step 2: Commit the extraction alone**, so a ranking regression bisects cleanly.

- [ ] **Step 3: Write the failing test**

```ts
it("reads the pair table when two commanders are given", () => {
  const sql = pairSupportQuery("a", "b").toSQL().sql;
  expect(sql).toContain("commander_pair_support_cards");
});

// AGENTS.md: Drizzle omits table qualification in the PROJECTION of a single-table select,
// so a correlated column compares a foreign key to its own primary key and counts 0 forever.
it("qualifies both sides of every correlated column", () => {
  const sql = pairSupportQuery("a", "b").toSQL().sql;
  expect(sql).not.toMatch(/where "commander_oracle_id" = "oracle_id"/);
});

it("falls back to the single list when no pair row exists", async () => {
  expect(singleSupportQuery(["a"]).toSQL().sql).toContain("commander_support_cards");
});
```

- [ ] **Step 4: Implement**, branching on `commanderIds.length === 2` and falling back to the
union when the pair row is absent.

- [ ] **Step 5: Walk it.** `pnpm dev`, then `/decks/<pair deck>` and `/commanders/<pair slug>` at
**1300x900 and 390x844**. The synergy panel, Role Coverage and the top-off list must agree with
the deck suggestions panel about the same card's rank. Run `pnpm probe:commander-availability`
and `pnpm probe:last-slots`.

- [ ] **Step 6: Commit and open PR 2.**

**PR 2 body records** the widths walked, and that staging holds one pair deck and one
`commander_pair_support` row.

---

### Task 5: Four role columns, with defaults — PR 3

**Files:** Modify `src/db/schema.ts` · Create `drizzle/00XX_*.sql` (generated)

**Interfaces — Produces:** `commanderSupport.avgRamp | avgDraw | avgRemoval | avgWipes`
(`real`, nullable) and the same four on `identityComposition` (`real`, **not null, default 0**).

**[R2] The default is required, not cosmetic.** `ADD COLUMN ... real NOT NULL` with no `DEFAULT`
**fails on a populated table**, and `identity_composition` is populated by the time this runs.
R1's justification ("written whole by one statement or not at all") is about the build, not the
ALTER. `0` is safe because the very next `db:build:staples` overwrites every row.

- [ ] **Step 1: Add the columns**, with the comment recording that the figures are UNSCALED and
why (the 0.711 coverage ratio is not an earned correction: unscaled wins for ramp, scaled for
removal, inside the noise).

- [ ] **Step 2: Generate.** `pnpm db:generate`, then **read the emitted SQL** and confirm each
`identity_composition` column carries `DEFAULT 0`.

- [ ] **Step 3: Apply.** `pnpm db:migrate`, then `psql "$DATABASE_URL" -c "\d identity_composition"`.

- [ ] **Step 4: Commit.**

---

### Task 6: Derive the per-commander role targets

**Files:** Create `scripts/lib/role-targets.mts` **[R2]** · Modify `src/lib/edhrec/seed-index.ts` **[R2]** · Test `scripts/lib/role-targets.test.mts`

**[R2] Two corrections.** The module is `.mts`, not `.ts`: every file in `scripts/lib/` is
`.mjs`/`.mts` and `vitest.config.ts` includes only `scripts/**/*.test.mts`, so R1's `.ts` module
would not have resolved from its own test. And the writes live in `seed-index.ts`, not in
`build-commander-index.ts`, which is an 86-line wrapper that prints counters.

**Interfaces — Produces:**
`deriveRoleTargets(rows: RoleDerivationRow[]): Map<string, RoleTargetRow>` where
`RoleDerivationRow = { commanderOracleId, oracleId, inclusion, typeLine, oracleText, keywords, layout }`.

- [ ] **Step 1: Write the failing test**

```ts
const ramp = { typeLine: "Artifact", oracleText: "{T}: Add {C}.", keywords: [], layout: "normal" };
const draw = { typeLine: "Sorcery", oracleText: "Draw three cards.", keywords: [], layout: "normal" };
const land = { typeLine: "Land", oracleText: "{T}: Add {G}.", keywords: [], layout: "normal" };

it("sums inclusion as a probability, not a count", () => {
  const out = deriveRoleTargets([
    { commanderOracleId: "c", oracleId: "a", inclusion: 50, ...ramp },
    { commanderOracleId: "c", oracleId: "b", inclusion: 25, ...ramp },
  ]);
  expect(out.get("c")!.ramp).toBeCloseTo(0.75);
});

// [R2] THE HEADLINE CASE. oracle_text holds both faces, so without castFaceText this card
// classifies as ramp off its LAND BACK and inflates every ramp target.
it("does not read a modal land's back face as ramp", () => {
  const out = deriveRoleTargets([{
    commanderOracleId: "c", oracleId: "a", inclusion: 100,
    typeLine: "Sorcery // Land", layout: "modal_dfc",
    oracleText: "Deal 3 damage to any target.\n//\nEnters tapped. {T}: Add {R}.", keywords: [],
  }]);
  expect(out.get("c")!.ramp).toBe(0);
});

it("still reads a SPLIT card's second half, which is castable", () => {
  const out = deriveRoleTargets([{
    commanderOracleId: "c", oracleId: "a", inclusion: 100,
    typeLine: "Instant // Instant", layout: "split",
    oracleText: "Deal 2 damage.\n//\nDraw a card.", keywords: [],
  }]);
  expect(out.get("c")!.draw).toBeCloseTo(1);
});

// [R2] R1's memoization test asserted two per-commander sums, which a version with no cache
// returns identically. Count the classifier calls instead.
it("classifies a card once however many commanders list it", () => {
  let calls = 0;
  const out = deriveRoleTargets([
    { commanderOracleId: "c1", oracleId: "a", inclusion: 100, ...draw },
    { commanderOracleId: "c2", oracleId: "a", inclusion: 50, ...draw },
  ], { onClassify: () => { calls += 1; } });
  expect(calls).toBe(1);
  expect(out.get("c1")!.draw).toBeCloseTo(1);
  expect(out.get("c2")!.draw).toBeCloseTo(0.5);
});

it("never counts a land as ramp", () => {
  const out = deriveRoleTargets([{ commanderOracleId: "c", oracleId: "a", inclusion: 100, ...land }]);
  expect(out.get("c")!.ramp).toBe(0);
});

// A card counts toward EVERY role it satisfies. The fill spends it once but COUNTS it the
// same way (Task 13), so the two conventions agree. See spec §2.5a.
it("counts a card toward every role it satisfies", () => {
  const out = deriveRoleTargets([{
    commanderOracleId: "c", oracleId: "a", inclusion: 100, layout: "normal",
    typeLine: "Instant", oracleText: "Destroy target creature. Draw a card.", keywords: [],
  }]);
  expect(out.get("c")!.removal).toBeCloseTo(1);
  expect(out.get("c")!.draw).toBeCloseTo(1);
});

it("returns zero rather than absent for a role no listed card fills", () => {
  const out = deriveRoleTargets([{ commanderOracleId: "c", oracleId: "a", inclusion: 100, ...ramp }]);
  expect(out.get("c")!.wipes).toBe(0);
});
```

- [ ] **Step 2: Run and fail.** `pnpm vitest run scripts/lib/role-targets.test.mts`

- [ ] **Step 3: Implement**, calling `castFaceText` before `classifyRoles`, memoizing per
`oracleId`, and taking an optional `onClassify` hook so the memoization is assertable.

- [ ] **Step 4: Wire into `seed-index.ts`** as a final pass after `commander_support_cards` is
published, updating in chunks of 500. Print the distribution (mean/min/max/sd per role, the flat
target beside it, and the count of zero-wipes commanders). **Refuse and exit non-zero** if fewer
than 90% of `synergy_state = 'ok'` commanders got a figure, leaving previous values standing.

- [ ] **Step 5: Run and READ the output.** `pnpm db:build:index`. The derivation is the review.

- [ ] **Step 6: Cross-check against the measurement script.** `pnpm measure:roles` section 1 must
report the same means. Two derivations of one figure that disagree mean one of them is wrong.

- [ ] **Step 7: Commit.**

---

### Task 7: Condition-level role targets

**Files:** Modify `scripts/build-staples.ts`

- [ ] **Step 1: Extend `compositionQuery`'s `avg` list** with the four. Keep
`filter (where cs.avg_land is not null)` on each — a `WHERE` would narrow the `commanders`
denominator with it, the null-policy mistake this script's header records making once already.

- [ ] **Step 2: Carry them into the `identityComposition` insert.**

- [ ] **Step 3: Print them** beside the type targets per condition.

- [ ] **Step 4: Run and read.** `pnpm db:build:staples`. Sanity-check one condition by hand
against `commander_support` for a commander in that bucket.

- [ ] **Step 5: Commit and open PR 3.** **Dispatch the staging Commander index first**
(`gh workflow run "Commander index" -f environment=catalog-staging`, ~50 min) or a reviewer
loading staging sees a feature that does nothing.

**PR 3 body records** the validation table, both caveats (n=19 human-built decks, one
collection; the ratio is not an earned correction), the nonbasic-land coverage figure that
defeats the "56.9 of 99" objection, and the two defects pre-open review found in the first
measurement: a table that mixed scaled and unscaled figures under one heading, and a deck
population that included the app's own unedited fill output.

---

### Task 8: The thin buckets — exactly three — PR 4

**Files:** Modify `src/db/schema.ts`, `scripts/build-staples.ts` · Create `drizzle/00XX_*.sql` · Test `src/lib/staples/condition.test.ts`

**[R2] THE SCOPE IS THREE BUCKETS AND NO MORE.** R1 said "parameterise the `having` clause and
call it again for the refused buckets", which emits **every** bucket under 100 commanders — all
ten three-colour identities, five four-colour, one five-colour, and `count:0`. Because the
identity rung is read before the count rung (`load.ts:269-273`), publishing thin exact-identity
rows would **shadow the ratified `count:3` row for every three-colour commander**: a silent basis
change for the largest orphan group, from a ratified bucket to a below-bar one.

The three buckets, and the rule that selects them: **a commander whose exact identity does not
clear the bar AND whose colour-count key does not either.** That is colourless (`C` / `count:0`),
four-colour and five-colour. A three-colour commander is excluded because `count:3` already
serves it.

- [ ] **Step 1: Pin the existing behaviour first.**

```ts
it("keys colourless as C and never as an empty string", () => {
  expect(identityCondition([])).toBe("C");
});
it("keys four- and five-colour by count", () => {
  expect(countCondition(4)).toBe("count:4");
  expect(countCondition(5)).toBe("count:5");
});
it("pins the bar the thin branch is measured against", () => {
  expect(MIN_COMMANDERS_PER_CONDITION).toBe(100);
});
```

Run it and confirm green **before** touching the build.

- [ ] **Step 2: Add `thin boolean not null default false`** to `identityComposition`, with the
comment recording the three buckets, their sizes (58 / 16 / 60), and that a single global row was
rejected on measurement.

- [ ] **Step 3: Generate, read, apply.**

- [ ] **Step 4: Emit exactly the three.** A third branch whose `having` is
`count(*) < MIN_COMMANDERS_PER_CONDITION`, restricted to commanders whose colour count is 0, 4 or
5, keyed by `countCondition` for 4 and 5 and by `identityCondition` for colourless, written with
`thin = true`.

- [ ] **Step 5: Print them separately**, so a thin row is never read as a ratified floor.

- [ ] **Step 6: Verify the gap closed AND that nothing was shadowed.** **[R2]** R1's SQL only
asked whether *some* row existed under either key, which reads 0 on the broken build. Assert the
row the reader would actually take:

```sql
-- No commander left with nothing.
select count(*) from cards c
join commander_support cs on cs.commander_oracle_id = c.oracle_id
left join identity_composition ic on ic.condition = case
  when cardinality(c.color_identity) = 0 then 'C'
  else array_to_string(array(select unnest(c.color_identity) order by 1), '') end
left join identity_composition cc on cc.condition = 'count:' || cardinality(c.color_identity)
where ic.condition is null and cc.condition is null;   -- expect 0

-- AND no three-colour commander now resolves to a thin row.
select count(*) from cards c
join identity_composition ic on ic.condition =
  array_to_string(array(select unnest(c.color_identity) order by 1), '')
where cardinality(c.color_identity) = 3 and ic.thin;   -- expect 0
```

- [ ] **Step 7: Commit.**

---

### Task 9: The chain resolves role targets — in `build.ts`

**Files:** Modify `src/lib/profile/build.ts` (`skeleton()` ~:236) **[R2]**, `src/lib/profile/load.ts`, `src/lib/profile/types.ts` · Test `src/lib/profile/build.test.ts`

**[R2] R1 named `load.ts` alone.** `load.ts:309-312` passes all four candidates through; the
first-hit selection is `build.ts`'s `skeleton()`. The `of: "flat"` fallback belongs there too.

**Interfaces — Produces:**

```ts
export type ProfileRoleTargets = {
  of: "commander" | "pair" | "identity" | "count" | "flat";
  targets: { ramp: number; draw: number; removal: number; wipes: number };
};
```

plus `ProfileSkeleton.roleTargets` and `ProfileSkeleton.thinCondition: boolean`.

**[R2] `thinCondition`, not `thin`.** `SkeletonFit.coverage.thin` already exists and means "this
commander's deck count is below `THIN_DECK_COUNT`". Two differently-sourced `thin`s on one object
is a trap; the names must differ.

- [ ] **Step 1: Write the failing tests** — commander basis preferred; flat fallback with
`ROLE_TARGETS`; **roles resolve independently of the type composition** (a commander indexed
before Task 6 carries a composition and no role figures, and must not drag the whole skeleton to
flat); and `thinCondition` surfaced without inventing a basis value.

- [ ] **Step 2: Run and fail.**

- [ ] **Step 3: Implement** `roleTargetsFrom(row)` returning null when any of the four is null,
resolved down the same chain, falling to `{ of: "flat", targets: ROLE_TARGETS }`.

- [ ] **Step 4: Run.** `pnpm vitest run src/lib/profile/ && pnpm probe:bracket`

- [ ] **Step 5: Commit and open PR 4.**

**PR 4 body records** both 0-row results from Task 8 Step 6, and the three states still reaching
`of: "flat"`.

---

### Task 10: `fitSkeleton` carries role fits — PR 5

**Files:** Modify `src/lib/profile/fit.ts` · Test `src/lib/profile/fit.test.ts`

**Interfaces — Produces:** `SkeletonFit.roles: RoleFit[]`
(`{ role; have; target; delta; measured }`) and `SkeletonFit.coverage.thinCondition: boolean`.

**The module header must be rewritten, not deleted.** `fit.ts` opens with "NO FUNCTIONAL ROLES
APPEAR HERE, and that is structural", and a test asserts it. That rule existed because the four
were asserted, and its reason ends when they are measured. Replace it with the narrower rule that
survives: a fit may carry a role target only with `measured` beside it.

- [ ] **Step 1: Rewrite the header** to say what is now true and why the old rule ended.

- [ ] **Step 2: Replace the guard test** with the rule that replaced it — every `RoleFit` carries
`measured`; a commander basis marks them measured; **and a surplus is reported against a measured
zero** (390 commanders measure 0 wipes on front-face text, so a deck holding one is OVER, and calling that a
shortfall would be the flat target's error wearing a measured number's authority).

- [ ] **Step 3: Implement**, reading `profile.roles.counts` against
`profile.skeleton.roleTargets.targets` in `ramp → draw → removal → wipes` order.

- [ ] **Step 4: Run.** `pnpm vitest run src/lib/profile/ && pnpm probe:bracket`

- [ ] **Step 5: Commit and open PR 5.**

---

### Task 11: The type tie-break and the type tally — PR 6

**Files:** Create `src/lib/decks/fill-shape.ts` · Modify `src/lib/profile/fit.ts` (export `countByType`) **[R2]** · Test `src/lib/decks/fill-shape.test.ts`

**Interfaces — Produces:**
- `tallyTypes(rows: { typeLine: string; quantity: number }[]): CompositionTargets` — **[R2]**
  `countByType` is exported from `fit.ts` and generalised to this row shape rather than copied.
  R1 gave `typeDeficits` a `placed: CompositionTargets` argument with **no producer**; the fill
  tracks `Record<FillRole, number>` and has no per-type tally. A second copy of the front-face
  and `isLandFace` rules is exactly the drift `facet.ts`'s header warns about.
- `typeDeficits(targets, placed): Map<keyof CompositionTargets, number>`
- `preferByTypeGap(a, b, deficits): number`

- [ ] **Step 1: Write the failing test**

```ts
describe("typeDeficits", () => {
  it("is positive below target and negative over it", () => {
    const d = typeDeficits(targets({ creature: 26, artifact: 11 }), placed({ creature: 4, artifact: 14 }));
    expect(d.get("creature")).toBe(22);
    expect(d.get("artifact")).toBe(-3);
  });
  // basic and nonbasic sit WITHIN land, so they are not independent axes.
  it("ignores the three land axes", () => {
    const d = typeDeficits(targets({ land: 35, basic: 24, nonbasic: 11 }), placed({ land: 0 }));
    expect(d.has("land")).toBe(false);
    expect(d.has("basic")).toBe(false);
    expect(d.has("nonbasic")).toBe(false);
  });
  it("is empty with no targets, so the comparator is a no-op", () => {
    expect(typeDeficits(null, placed({}))).toEqual(new Map());
  });
});

describe("preferByTypeGap", () => {
  const d = typeDeficits(targets({ creature: 26, artifact: 11 }), placed({ creature: 4, artifact: 14 }));

  it("prefers the card closing the larger gap", () => {
    expect(preferByTypeGap({ typeLine: "Creature — Bird" }, { typeLine: "Artifact" }, d)).toBeLessThan(0);
  });
  it("scores a multi-type card on its best axis", () => {
    expect(preferByTypeGap({ typeLine: "Artifact Creature — Golem" }, { typeLine: "Artifact" }, d)).toBeLessThan(0);
  });
  it("is a no-op on empty deficits", () => {
    expect(preferByTypeGap({ typeLine: "Creature" }, { typeLine: "Artifact" }, new Map())).toBe(0);
  });

  // [R2] R1's front-face test discriminated NOTHING: it used `Instant // Land` against a
  // deficit map where land is excluded by design, so a whole-line implementation scored the
  // same. This one puts a REAL type on the back that the front does not carry.
  it("reads the front face only", () => {
    const back = typeDeficits(targets({ instant: 2, creature: 26 }), placed({ instant: 0, creature: 0 }));
    // Front is an Instant (deficit 2); the back is a Creature (deficit 26). A whole-line
    // implementation would score this 26 and win.
    expect(preferByTypeGap(
      { typeLine: "Instant // Creature — Horror" }, { typeLine: "Creature — Bird" }, back,
    )).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run and fail.**

- [ ] **Step 3: Implement.** Seven axes: `creature`, `instant`, `sorcery`, `artifact`,
`enchantment`, `planeswalker`, `battle`.

- [ ] **Step 4: Run.** `pnpm vitest run src/lib/decks/fill-shape.test.ts src/lib/profile/`

- [ ] **Step 5: Commit.**

---

### Task 12: `landTarget` takes a skeleton, and rounds

**Files:** Modify `src/lib/decks/deck-size.ts`, `src/lib/decks/suggest.ts` (`:119`, `:154`, and the re-export at `:56`) **[R2]** · Test `src/lib/decks/deck-size.test.ts`

**[R2] `fill.ts`'s two call sites are in Task 13, in THIS PR.** R1 split them across PRs and
broke the build at PR 5.

**[R2] The result is ROUNDED.** `identity_composition.avg_land` is `real` while
`commander_support.avg_land` is `integer`, so an identity or count basis would otherwise hand
`planFill` a fractional ceiling, and `splitByWeight` would allocate fractional basic-land slots.

- [ ] **Step 1: Write the failing tests** — the measured count; the pair's slot out of the
elastic lands; the flat fallback (37 / 36); a cap so the target cannot exceed what the body can
hold beside the role floors (measured max is 83); **and a fractional input rounding to a whole
number**.

- [ ] **Step 2: Run and fail.**

- [ ] **Step 3: Implement**, keeping the existing comment about the pair's slot.

- [ ] **Step 4: Run.** `pnpm typecheck` — `fill.ts` will not compile yet; that is expected and is
fixed in Task 13 **in this same PR**.

- [ ] **Step 5: Do not commit alone.** Commit with Task 13.

---

### Task 13: `planFill` builds against the skeleton

**Files:** Modify `src/lib/decks/fill.ts` · Test `src/lib/decks/fill.test.ts`

**Interfaces — Produces:**
```ts
export type FillRole = "ramp" | "draw" | "removal" | "wipes" | "land" | "other";  // [R2] "other" declared
export type FillShortfall = { kind: "role"; role: FillRole } | { kind: "type"; type: keyof CompositionTargets };
planFill(candidates, args: {
  hasPartner: boolean;
  skeleton: ProfileSkeleton | null;
  synergyRank?: Map<string, number>;
  slots?: number;
  pool?: "all" | "sleeveable";       // [R2] for Task 21
}): FillPlan
```
`FillPlan` gains `landCapable: number` and `shortfalls: FillShortfall[]`.

**[R2] Three declarations R1 used and never made:** `role: "other"` for the residual,
`shortfalls` widened to carry types, and the `slots` / `pool` arguments Task 21 depends on.

**Five behaviour changes:**

1. Role floors come from `skeleton.roleTargets`, **rounded**.
2. **A placed card counts toward every role it satisfies, while spending its slot once.**
   **[R2]** Spec §2.5a: the targets describe decks with a card counted under each role it fills,
   so a single-spend count would make the fill place two cards where the description counted one.
3. The role pick breaks ties on type deficit (Task 11).
4. **The land ceiling counts `modal_dfc` land-capable cards** — but a card whose front-face text
   was spent on a non-land role does **not** also take land credit. **[R2]**
5. The fill continues to the body size; the residual is ranked on `synergyRank`, role `"other"`.

**[R2] Residual rows are appended AFTER the land sweeps.** `createDeck` truncates the tail, so a
residual placed with the non-land roles would see the **mana base** cut on any build with a
`?select=` picks list.

- [ ] **Step 1: Write the failing tests.** Including, explicitly:

```ts
// [R2] R1's transform test passed for three wrong reasons — the card never placed, the pool
// already supplied 36 lands, or classifyRoles called it a land and fill.ts:170 skipped it.
// This asserts the row IS placed, on a NON-land role, and that only the modal one credits.
it("credits a placed modal land and not a placed transform card", () => {
  const skeleton = skeletonWithLand(36);
  const mdfc = candidate({ oracleId: "mdfc", typeLine: "Sorcery // Land", layout: "modal_dfc",
    oracleText: "Draw three cards.\n//\nEnters tapped. {T}: Add {R}." });
  const xform = candidate({ oracleId: "xf", typeLine: "Creature — God // Land", layout: "transform",
    oracleText: "Draw three cards.\n//\n{T}: Add {R}." });

  const a = planFill([mdfc, ...poolOf(200)], { hasPartner: false, skeleton });
  expect(a.rows.find((r) => r.oracleId === "mdfc")?.role).toBe("draw");
  expect(countRole(a, "land")).toBe(35);
  expect(a.landCapable).toBe(36);

  const b = planFill([xform, ...poolOf(200)], { hasPartner: false, skeleton });
  expect(b.rows.find((r) => r.oracleId === "xf")?.role).toBe("draw");
  expect(countRole(b, "land")).toBe(36);
});

// [R2] The double-credit case §2.5a names. Without castFaceText this card reads as ramp off
// its land back, is spent on the ramp floor, AND takes a land slot.
it("never lets one card take a role slot and a land slot", () => {
  const plan = planFill([
    candidate({ oracleId: "ss", typeLine: "Sorcery // Land", layout: "modal_dfc",
      oracleText: "Deal 3 damage.\n//\nEnters tapped. {T}: Add {R}." }),
    ...poolOf(200),
  ], { hasPartner: false, skeleton: skeletonWithLand(36) });
  const row = plan.rows.find((r) => r.oracleId === "ss");
  // Not ramp: the land back is not the spell you cast.
  expect(row?.role).not.toBe("ramp");
});

it("meets the role floor even when every candidate deepens a type surplus", () => {
  const plan = planFill(onlyArtifactRamp(20), {
    hasPartner: false, skeleton: skeletonWith({ land: 35, artifact: 0, creature: 26, ramp: 10 }),
  });
  expect(plan.rows.filter((r) => r.role === "ramp")).toHaveLength(10);
});

it("counts a dual-role card toward both floors while spending one slot", () => {
  const plan = planFill([
    candidate({ oracleId: "x", typeLine: "Instant", oracleText: "Destroy target creature. Draw a card." }),
    ...poolOf(200),
  ], { hasPartner: false, skeleton: skeletonWith({ ramp: 0, draw: 1, removal: 1, wipes: 0, land: 35 }) });
  expect(plan.rows.filter((r) => r.oracleId === "x")).toHaveLength(1);
  expect(plan.shortfalls).toEqual([]);
});

it("appends the residual after the land sweeps", () => {
  const plan = planFill(poolOf(400), { hasPartner: false, skeleton: skeletonWithLand(35) });
  const lastLand = plan.rows.map((r) => r.role).lastIndexOf("land");
  const firstOther = plan.rows.map((r) => r.role).indexOf("other");
  expect(firstOther).toBeGreaterThan(lastLand);
});
```

plus: builds to the measured land count; fills to the body size with the residual on synergy;
stops where the collection stops and reports shortfalls; honours an explicit `slots` budget.

- [ ] **Step 2: Run and watch every one fail.**

- [ ] **Step 3: Implement.** Keep every existing invariant: lands never bought, the
`NONBASIC_LAND_CAP` sweep, the pip-weighted basic split, the largest-remainder allocation.
Re-derive the nonbasic cap from `skeleton.composition.targets.nonbasic` where one resolved
(measured ~7 mono to ~24 five-colour against a hard-coded 12), keeping 12 as the flat fallback.

- [ ] **Step 4: Run.** `pnpm vitest run src/lib/decks/ && pnpm typecheck`

- [ ] **Step 5: Commit Tasks 12 and 13 together.**

---

### Task 14: The create action resolves a skeleton

**Files:** Modify `src/lib/profile/load.ts`, `src/app/decks/actions.ts` (`buildFillPlan` **:63**, `createDeck` **:133**, `fillDeck` **:522**) **[R2 line numbers corrected]**

- [ ] **Step 1: Extract `loadSkeletonForCommanders(ids: string[])`** from
`loadDeckProfileFromHead`, and have the profile loader call it. **No behaviour change** —
`pnpm vitest run src/lib/profile/` and `pnpm probe:bracket` must pass untouched.

- [ ] **Step 2: Commit the extraction alone.**

- [ ] **Step 3: Wire it into `buildFillPlan`**, with a synergy ranking from `readSynergyCards`
so the fill's residual and the top-off list cannot disagree.

- [ ] **Step 4: Record TWO passes, not one. [R3]** This replaces the whole of the deleted PR 10.

`createDeck` records a single `seed` pass today. With the body filled in one go that becomes one
99-row pass with nothing to undo but all of it — collapsing a separation the app already ships
and already draws. Record instead:

| pass | holds |
|---|---|
| `seed` | the role floors and the mana base |
| `top_off` ordinal 1 | the synergy residual |

`FillRow.role === "other"` marks the residual, so the split needs no new persistence: the pass
ledger already carries it. `Undo these 31` then means "clear the suggestions, keep the
foundation", through `provenance-line.tsx` and `topOffCopy.ledger.undo(n)` exactly as they stand.

Write the test against the ledger, not the rows:

```ts
it("records the foundation and the residual as separate passes", async () => {
  await createDeck({ commanderOracleId: "c", deckName: "d" });
  const passes = await readFillPasses(deckId);
  expect(passes.map((p) => p.kind)).toEqual(["seed", "top_off"]);
  // The seed holds the floors and the lands; the residual is its own undo unit.
  expect(passes[0].live).toBeGreaterThan(0);
  expect(passes[1].live).toBeGreaterThan(0);
  expect(passes[0].live + passes[1].live).toBe(99);
});
```

**Mutation:** record one pass as today and confirm this test fails. A build that emits a single
pass is the regression, and nothing else in the suite can see it.

- [ ] **Step 5: Check the truncation.** `createDeck` truncates to `bodySize`; confirm it still
holds at 99 rows across two passes.

- [ ] **Step 6: Run.** `pnpm vitest run src/app/decks/ && pnpm test && pnpm typecheck`

- [ ] **Step 7: Commit.**

---

### Task 15: `probe:fill`

**Files:** Create `scripts/probe-fill.ts` · Modify `package.json`

Seven checks: the measured land count; the ramp tie-break taking a named creature; a `modal_dfc`
crediting the land target **and** a `transform` card not; **a land-backed MDFC never spent on
ramp** (the §2.5a case, which no unit fixture can prove against the real catalog); the residual
ordered by synergy from the same `readSynergyCards` the deck page calls; a `flat` basis still
filling; and `counts.landCapable` against `counts.land` on the built deck.

**[R2] Seven mutations for seven checks** — R1 listed five for six, and its sixth
(`landCapable >= land`) was unfalsifiable by construction:

| revert | must fail |
|---|---|
| `landTarget` to the flat 37 | 1 |
| the type tie-break | 2 |
| `playableAsLand` to a `type_line` test | 3 (the transform half) |
| `castFaceText` out of the derivation | 4 |
| the residual to `inclusionPct` | 5 |
| the flat fallback in `roleTargetsFrom` | 6 |
| `layout` out of `suggestions-read.ts` | 3 and 7 together |

Fixture discipline: per-run `user_id`, deleted in a `finally`, pointed at `local-dev`.

- [ ] **Steps: write · run · mutate all seven · commit and open PR 6.**

**On PR 6 merging, emit the Design brief** for PRs 9b and 10.

---

### Task 16: `recommendedMix` per deck — PR 7

**Files:** Modify `src/lib/decks/mix.ts` · Test `src/lib/decks/mix.test.ts`

**Produces:** `recommendedMix(skeleton, hasPartner)` and `mixSourceLine(skeleton)`.
`RECOMMENDED_MIX` and `RECOMMENDED_MIX_SOURCE_LINE` are **deleted**, so the typechecker
enumerates every consumer.

- [ ] **Step 1: Write the failing tests** — measured targets rounded to whole cards; a measured
**zero stays zero**; the flat fallback marked `measured: false`; `mixSourceLine` saying
`"EDHREC averages"` only when the numbers came from EDHREC.

- [ ] **Step 2: Run and fail.** **Step 3: Implement**, round half-up, floor at 0.

- [ ] **Step 4: Run `pnpm check:copy-drift`.** Any design table quoting the old source line is
stale and swept in this commit.

- [ ] **Step 5: Commit.**

---

### Task 17: Thread it, and load it on the route

**Files:** Modify the **six** importers — `role-counter-strip.tsx`, `consider-panel.tsx`, `unresolved-group.tsx`, `changed-strip.tsx`, `strip-rationale.tsx`, `builder-shell.tsx` — the **three prop-passers** `decklist.tsx:834`, `review-changes.tsx:890`, `about/ch01-figures.tsx:696`, the test `about/about-page.test.tsx:24-25`, and the **two routes** `src/app/decks/[id]/page.tsx` and `src/app/decks/[id]/changes/page.tsx`. **[R2]**

**[R2] Three things R1 missed.** The prop-passers (including an About specimen, an unplanned
casualty of deleting the constant); `about-page.test.tsx` imports **both** deleted constants; and
**no route loaded a skeleton at all**, so the components had nothing to take the prop from.

**[R2] The route read is a new per-request query on two hot routes.** Use `cachedDeckProfile`,
which `/decks/[id]` may already warm, rather than a second uncached read. Measure the added time
and record it in the PR body; `loadDeckSuggestions` on the largest deck is 543ms, so this is not
free.

- [ ] **Step 1: Thread the prop** from each route through its passers. The typechecker is the
inventory: every consumer is a compile error until it takes the prop.

- [ ] **Step 2: Fix the About specimen and its test**, which needs a fixture mix rather than the
deleted constant.

- [ ] **Step 3: Run.** `pnpm typecheck && pnpm test`

- [ ] **Step 4: Commit.**

---

### Task 18: `suggest.ts` quotes the same target — **[R2] new task**

**Files:** Modify `src/lib/decks/suggest.ts:120` · Test `src/lib/decks/suggest.test.ts`

**Why.** `suggest.ts:120` composes the Add-panel tile label from `ROLE_TARGETS[s.reason] ?? lands`
→ `"Fills Ramp · rec 10"`. Spec §2.5 lists `suggest.ts` as taking per-commander targets and R1
had no task doing it, so the panel would show a shelf header of `have / 12` beside tiles reading
`rec 10`.

- [ ] **Steps: failing test asserting the tile label quotes the resolved target · implement ·
run · commit.**

---

### Task 19: The build promise and the About entries

**Files:** Modify `src/lib/copy/recommendations.ts`, `src/components/commanders/detail.tsx` (`:542`, `:657`), `src/components/commanders/synergy-selection.tsx` (`:109`, `:228`), `src/lib/decks/fill.ts`

**[R4] NO ABOUT WORK IN THIS SUB-PROJECT — THIS IS THE BATCHED TASK.** Hugh deferred every entry
on 2026-09-20, and `AGENTS.md` has since generalised it: a multi-round feature line batches its
About entries at the end of the launch. Nothing in PRs 1 through 9 touches
`src/lib/copy/about.ts`, and no `ABOUT_VERSION` bump lands here.

The entries are still OWED, and naming them here is what keeps the requirement from quietly
evaporating — `AGENTS.md` says a readiness audit on a round of such a line should confirm the
plan names the batched task rather than report a missing entry. It does: two edits, the build
entry and the top-off entry, written once when the line closes. R2 had this task editing the
build entry and R3 had it bumping the version; both are removed.

- [ ] **Step 1: Replace the copy.** Both lose their `(n: string)` parameter:

```ts
    stickyPromise: "We’ll build the whole 99, as far as your collection reaches",
    seedNote: "We’ll build the whole 99, as far as your collection reaches. Anything we add is yours to clear.",
```

- [ ] **Step 2: Update the four call sites.** In `synergy-selection.tsx`, `filled` collapses to
`bodySize − picked` and `total` to `bodySize`.

- [ ] **Step 3: Delete `fillBaselineTotal`** and its test — it now equals `deckBodySize`.

- [ ] **Step 4: Run.** `pnpm check:copy-drift && pnpm test && pnpm typecheck`

- [ ] **Step 5: Commit and open PR 7.**

---

### Task 20: The Add panel orders within a shelf — PR 8

**Files:** Modify `src/components/decks/consider-panel.tsx`, `src/components/decks/suggestion-tile.tsx` **[R2]** · Test `src/components/decks/consider-panel.test.tsx`

**[R2] Two corrections.** Neither component carries a single `data-testid`, so R1's tests queried
attributes that do not exist, and its second test block had no `render()` of its own. And
`sortWithin(suggestions, sort)` (`consider-panel.tsx:116`) already lets the player order a shelf
by `cheapest` or synergy — **the type-gap ordering belongs in the `gaps` branch only**, which is
the pass-through today. The other branches keep their meaning.

- [ ] **Step 1: Add the two `data-testid` attributes** the tests need, and commit that alone.

- [ ] **Step 2: Write the failing tests**, each with its own `render()`: the `gaps` branch offers
the larger type gap first; the `cheapest` branch is **unchanged**; shelf order still sorts on the
role gap.

- [ ] **Step 3: Implement** using `preferByTypeGap` imported from Task 11, never reimplemented.

- [ ] **Step 4: Run. Step 5: Commit and open PR 8.**

---

### Task 21: The bulk control runs the real fill — PR 9a

**Files:** Create a server action in `src/app/decks/actions.ts` **[R2]** · Modify `src/lib/decks/last-slots.ts`, `src/components/decks/top-off-list.tsx` (**`:538`**, the `slice`) **[R2]**

**[R2] This cannot be a client-side selection, and R1's design was impossible.** Its
`bulkFillSelection` took the list's `SynergyCard` pool, which carries no `oracleText`,
`keywords`, `manaCost` or `ownedQuantity` — all four of which `planFill` needs. `mix.ts:23-27`
states the rule outright: "Do NOT re-run classifyRoles here — card.role is derived from real
oracleText on the server; re-classifying with null oracleText under-counts text-based roles."

So the control calls a **server action** that runs `planFill` with `pool: "sleeveable"` and
`slots: openSlots`, and returns the chosen oracle ids for the client to tick.

**[R2] R1's own test contradicted Task 13.** Its two candidates had no oracle text, so neither
classified, both fell to the residual, and the residual ranks on synergy — which picks the rock
it expected the bird to beat. The fixture must give the candidates real text.

**The failure being fixed:** short on creatures, the control ticked non-creatures and left the
deck worse with no slots to fix it. The cause is a category error — `canSeed` narrows to what can
be sleeved, then the control takes the top N by **synergy** within that, optimising *what can I
sleeve* rather than *what does this deck need*.

- [ ] **Step 1: Write the failing tests** against the action, with real oracle text on every
candidate: it picks what the deck needs over a higher-synergy card it is already over on; it
takes fewer than the open slots rather than spending them badly; and `canSeed` still bounds the
pool, so a card with every copy sleeved elsewhere is offered but never chosen for the player.

- [ ] **Step 2: Run and fail. Step 3: Implement.** Keep `canSeed` exactly as it is — it is the
right filter, it was only the wrong objective.

- [ ] **Step 4: Run** `pnpm vitest run src/components/decks/ && pnpm probe:last-slots`.

- [ ] **Step 5: Mutate.** Revert to `seedableIds.slice(0, tickable)` and confirm the first test
fails. Record it.

- [ ] **Step 6: Commit and open PR 9a.**

---

### Task 22: The second bulk control — PR 9b · BLOCKED ON DESIGN

Do not start until a handoff with a READINESS verdict exists. Adds a second control whose pool is
the whole candidate list, labelled with its cost, beside the first labelled with what it
compromised. 
Already built and not to be rebuilt: the list has no facet filter; it draws `BuyTag` and prices
on unowned rows; it computes `buyCount` and `buyMoney`; and `planFill` already buys.

---

## Design brief · emit when PR 6 merges

ONE surface, owned by this sub-project and not on the analysis tab.

**The top-off list's bulk controls** (Task 22): one control becomes two, each carrying a
concession figure computed before the press. Needs the two labels, their treatment when a figure
is zero or unavailable, and the phone layout where two controls share a row the quick-add dock
already occupies.

**[R3] The deck page's clear control is NOT in this brief.** An earlier revision asked Design to
draw a three-way layered clear; spec §2.2 removed it, because the app already separates the fill
by pass and already draws a per-pass undo. Task 14 records the residual as its own pass and the
shipped control does the rest.

**No About entry is owed in this round** — see the batching rule above and spec §3A. The
top-off entry is edited once, with the rest, when the line closes.

---

## Self-review

**Spec coverage.** §2.1 → Tasks 13–14. §2.2 → Task 14 (step 4). §2.3 → Tasks 11, 13. §2.4 → Tasks 8–9.
§2.5 → Tasks 5–7, 9–10, 16. §2.5a → Tasks 1, 6, 13. §2.6 → Tasks 21–22. §2.7 → Task 20.
§2.8 → Tasks 1–3. §2.9 → Task 19. §3A → Tasks 19, 22. §6 → Tasks 1–4. §7 → Task 15.

**What revision 1 got wrong, and where it is fixed.** All 34 findings are addressed; the
load-bearing ones are §2.5a's both-faces correction (Tasks 1, 6, 13), the PR 5/6 compile break
(Tasks 12–13 merged), the migration default (Task 5), `layout` never reaching the pool (Task 3),
the thin branch shadowing `count:3` (Task 8), the missing route read (Task 17), and the About rule
(Tasks 19, 22). The layered clear's absent persistence stopped mattering when [R3] deleted the
control: the app already persists the boundary as a fill pass.

**Type consistency.** `ProfileSkeleton.roleTargets` is read by `fitSkeleton` (10), `landTarget`
(12), `planFill` (13), `recommendedMix` (16) and the bulk action (21) under one name.
`preferByTypeGap` (11) is imported by `planFill` (13) and `consider-panel.tsx` (20).
`castFaceText` (1) is used by `deriveRoleTargets` (6) and `planFill` (13). `tallyTypes` (11)
generalises `countByType` rather than copying it. `FillRole` gains `"other"` in Task 13 before
Task 21 or 23 reads it.

**Known risk, stated rather than designed around.** The role derivation rests on 19 human-built
decks and one collection. It ships as a **target** and never as a score: nothing ranks on it, and a wrong
figure costs a suggestion rather than a verdict.
