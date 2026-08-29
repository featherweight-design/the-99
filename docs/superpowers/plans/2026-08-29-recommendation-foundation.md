# Recommendation Engine Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared data layer that #213, #214, #215 and #218 all sit on — a widened EDHREC parser, a precomputed commander support index, a ManaPool price ingest, a commander engine classifier, and a land colour-production check.

**Architecture:** Five components, no UI. Two are pure functions (`engine.ts`, `mana.ts`), one is a parser widening that is retroactive over already-cached payloads, and two are offline ingests driven by GitHub Actions workflows modelled on the existing `catalog-refresh.yml`. Nothing here changes shipped behaviour: every addition is additive, and the existing owned-commander recommendation path must keep working identically.

**Tech Stack:** TypeScript, Next.js 16, Drizzle ORM on Neon Postgres, Vitest, pnpm, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-29-recommendation-foundation-design.md`

## Global Constraints

- **Package manager is `pnpm`.** Never npm or yarn. `pnpm-lock.yaml` is the only lockfile.
- **Work happens in the worktree** `/Users/huey/Projects/the-99/.worktrees/feat-rec-foundation` on branch `feat/rec-foundation`. Never edit the main checkout.
- **Stage files by name.** Never `git add -A` — `.env` and other untracked files must stay untracked.
- **Pre-push gate, every push:** `pnpm typecheck && pnpm lint && pnpm test`, plus the stub-DB build `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`, then `git fetch origin && git rebase origin/main`.
- **Do not open a PR.** This branch is pushed without one; spec + plan + code land in a single implementation PR later.
- **No blended scores.** Every signal this foundation produces is reported separately. Never combine two signals into a weighting.
- **Missing data is omitted, never defaulted to zero.** `parse.ts` states the reasoning: "a 0 draws a real bar for no data." Every numeric read uses `Number.isFinite`, not `typeof` — `NaN` and `Infinity` are both `"number"`.
- **Migrations are generated, never hand-written.** Run `pnpm db:generate` and commit what it emits. Current migrations run 0000–0010.
- **The existing owned-commander path must not change behaviour.** `resolveEdhrecData`, `getEdhrecData`, `scoreCommander` and `recommend.ts` keep their current semantics exactly.

---

## File Structure

**Created:**
- `src/lib/recs/faces.ts` — the front-face helpers, one per separator (Task 1)
- `src/lib/recs/faces.test.ts`
- `src/lib/edhrec/__fixtures__/gisa.json` — trimmed Gisa payload (Task 2)
- `src/lib/recs/engine.ts` + `.test.ts` — commander engine classifier (Task 3)
- `src/lib/recs/mana.ts` + `.test.ts` — land colour production (Task 4)
- `src/lib/edhrec/index-build.ts` + `.test.ts` — name resolution and row derivation (Task 6)
- `src/lib/edhrec/seed-index.ts` + `.test.ts` — the build loop and its DB writes (Task 7)
- `scripts/build-commander-index.ts` — thin wrapper (Task 7)
- `.github/workflows/commander-index.yml` (Task 7)
- `src/lib/manapool/parse.ts` + `.test.ts` — payload → rows, including dedup (Task 8)
- `src/lib/manapool/client.ts` — the fetch (Task 8)
- `src/lib/manapool/__fixtures__/singles.json` — trimmed feed (Task 8)
- `src/lib/manapool/seed-prices.ts` + `.test.ts` — the ingest and its orphan filter (Task 10)
- `scripts/seed-prices.ts` — thin wrapper (Task 10)
- `scripts/check-manapool-contract.ts` — the canary (Task 10)
- `.github/workflows/price-refresh.yml` (Task 10)
- `drizzle/0011_*.sql` — commander support tables, generated (Task 5)
- `drizzle/0012_*.sql` — `printing_prices`, generated (Task 9)

**Modified:**
- `src/lib/edhrec/parse.ts` — widen `EdhrecData` additively (Task 2)
- `src/lib/edhrec/parse.test.ts` (Task 2)
- `src/lib/edhrec/client.ts` — extract the URL/init, add `fetchEdhrecUncached` (Task 6)
- `src/lib/recs/score.ts` — export `fitsIdentity`; delegate `frontFace` to `faces.ts` (Task 1)
- `src/db/schema.ts` — `commanderSupport` + `commanderSupportCards` (Task 5), `printingPrices` (Task 9)
- `package.json` — `db:build:index`, `db:seed:prices`, `check:manapool` scripts
- `.github/workflows/scryfall-contract.yml` — run the ManaPool canary alongside (Task 10)
- `AGENTS.md` — document the commander-index workflow (Task 7) and the price/canary pair (Task 10)

---

## Task 1: Front-face helpers

The spec's §6 prerequisite. `frontFace()` at `score.ts:52` splits on `" // "`, which is the **type line and name** separator. Oracle text is joined by `transform.ts` with `"\n//\n"`. A single helper named `frontFace` is what makes the wrong one easy to reach for, so this task replaces it with two named ones.

**Files:**
- Create: `src/lib/recs/faces.ts`
- Create: `src/lib/recs/faces.test.ts`
- Modify: `src/lib/recs/score.ts:47-63`

**Interfaces:**
- Consumes: nothing.
- Produces: `frontFaceTypeLine(s: string): string`, `frontFaceOracle(s: string | null): string`, `frontFaceName(s: string): string`. Tasks 3, 4 and 6 use these.

- [ ] **Step 1: Write the failing test**

Create `src/lib/recs/faces.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { frontFaceName, frontFaceOracle, frontFaceTypeLine } from "./faces";

describe("frontFaceTypeLine", () => {
  it("splits a joined type line on the ' // ' separator Scryfall uses", () => {
    expect(frontFaceTypeLine("Land // Legendary Creature — Demon")).toBe("Land");
  });
  it("returns a single-faced type line unchanged", () => {
    expect(frontFaceTypeLine("Legendary Creature — Zombie Wizard")).toBe(
      "Legendary Creature — Zombie Wizard",
    );
  });
});

describe("frontFaceName", () => {
  it("splits a joined name on ' // '", () => {
    expect(frontFaceName("Adorned Pouncer // Horse")).toBe("Adorned Pouncer");
  });
});

describe("frontFaceOracle", () => {
  // transform.ts joins oracle text with "\n//\n", NOT " // ". Splitting oracle
  // text on " // " returns the whole joined string, so a back face's abilities
  // read as the front's — the #79 bug class.
  it("splits joined oracle text on the '\\n//\\n' separator", () => {
    expect(frontFaceOracle("Front ability.\n//\n{T}: Back ability.")).toBe("Front ability.");
  });
  it("does not split on the type-line separator", () => {
    expect(frontFaceOracle("Deals 2 damage // not a face break")).toBe(
      "Deals 2 damage // not a face break",
    );
  });
  it("returns an empty string for null oracle text", () => {
    expect(frontFaceOracle(null)).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/recs/faces.test.ts`
Expected: FAIL — `Failed to resolve import "./faces"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/recs/faces.ts`:

```ts
/**
 * Scryfall joins the faces of a double-faced card into single fields, but it does
 * not use one separator for all of them: names and type lines join with " // ",
 * while transform.ts joins oracle text with "\n//\n". Two helpers, not one —
 * a single `frontFace` invites splitting oracle text on the type-line separator,
 * which silently returns the whole joined string and lets a back face's abilities
 * read as the front's. That is the bug class #79 was.
 */
const TYPE_LINE_SEPARATOR = " // ";
const ORACLE_SEPARATOR = "\n//\n";

export const frontFaceTypeLine = (s: string): string => s.split(TYPE_LINE_SEPARATOR)[0];
export const frontFaceName = (s: string): string => s.split(TYPE_LINE_SEPARATOR)[0];
export const frontFaceOracle = (s: string | null): string =>
  (s ?? "").split(ORACLE_SEPARATOR)[0];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/recs/faces.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Point score.ts at the helpers and export `fitsIdentity`**

`fitsIdentity` is needed by #218 later (spec §9) and is currently module-private. Replace `src/lib/recs/score.ts` lines 47-63 with:

```ts
import { frontFaceOracle, frontFaceTypeLine } from "./faces";

export function isCommanderCandidate(card: Pick<PoolCard, "typeLine" | "oracleText">): boolean {
  const typeLine = frontFaceTypeLine(card.typeLine);
  // Only the front face can make a card eligible to be a commander. Testing the
  // joined string lets a back face qualify a card it shouldn't, which is how
  // Westvale Abbey (a Land) ended up in the candidate pool (#79).
  if (/legendary/i.test(typeLine) && /creature/i.test(typeLine)) return true;
  return /can be your commander/i.test(frontFaceOracle(card.oracleText));
}

export function fitsIdentity(card: PoolCard, identity: Set<string>): boolean {
  return card.colorIdentity.every((c) => identity.has(c));
}
```

Add the `import` to the top of the file alongside the existing `import { classifyRoles, ROLE_TARGETS } from "./roles";`, and delete the now-unused `const frontFace` and the comment block above it. Leave line 102's `lower.split(" // ")[0]` alone — Task 6 revisits it.

- [ ] **Step 6: Run the full suite to prove no behaviour changed**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS. `isCommanderCandidate` is behaviourally identical — this step only renames the splitters and exports one function.

- [ ] **Step 7: Commit**

```bash
git add src/lib/recs/faces.ts src/lib/recs/faces.test.ts src/lib/recs/score.ts
git commit -m "refactor(recs): name the two front-face separators apart"
```

---

## Task 2: Component A — widen the EDHREC parser

`edhrecCache.payload` stores the **raw** upstream payload and `parseEdhrecPayload` is applied at read time (`client.ts:45`, `:61`, `:73`, `:77`). Widening the parser therefore retroactively enriches every commander already cached, with zero refetch.

**Files:**
- Modify: `src/lib/edhrec/parse.ts`
- Modify: `src/lib/edhrec/parse.test.ts`
- Create: `src/lib/edhrec/__fixtures__/gisa.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `EdhrecData` gains `tags: EdhrecTag[]`, `bracketCounts: Record<string, number>`, `budgetCounts: Record<string, number>`, `similarNames: string[]`, `deckCount: number | null`, `rank: number | null`, `saltScore: number | null`. `EdhrecTag = { slug: string; label: string; count: number }`. Task 6 persists all seven.

- [ ] **Step 1: Capture and trim the Gisa fixture**

The live payload is 93,969 bytes; the existing `muldrotha.json` is 2,541. Committing the raw payload would be 37× the fixture convention. Run:

```bash
curl -s -H "User-Agent: the-99/1.0" \
  https://json.edhrec.com/pages/commanders/ghoulcaller-gisa.json -o /tmp/gisa-raw.json

node -e '
const fs = require("fs");
const d = JSON.parse(fs.readFileSync("/tmp/gisa-raw.json", "utf8"));
const c = d.container.json_dict.card;
const trimmed = {
  tag_counts: d.tag_counts.slice(0, 5),
  panels: { taglinks: d.panels.taglinks.slice(0, 2) },
  bracket_counts: d.bracket_counts,
  budget_counts: d.budget_counts,
  similar: d.similar,
  container: { json_dict: {
    card: { name: c.name, salt: c.salt, cmc: c.cmc, num_decks: c.num_decks, rank: c.rank },
    // Two lists, three cards each: enough to prove the union across cardlists
    // without carrying all 253 names.
    cardlists: d.container.json_dict.cardlists.slice(0, 2).map((l) => ({
      header: l.header,
      cardviews: l.cardviews.slice(0, 3).map((v) => ({
        name: v.name, inclusion: v.inclusion, synergy: v.synergy,
        num_decks: v.num_decks, potential_decks: v.potential_decks,
      })),
    })),
  } },
};
fs.writeFileSync("src/lib/edhrec/__fixtures__/gisa.json", JSON.stringify(trimmed, null, 1));
console.log("bytes:", fs.statSync("src/lib/edhrec/__fixtures__/gisa.json").size);
'
```

Expected: under ~4 KB. Every field kept is one the parser reads; nothing is invented. (The existing `parse.test.ts` comment is explicit that fabricating a shape we have not observed upstream is not acceptable — trimming an observed payload is fine, inventing fields is not.)

- [ ] **Step 2: Write the failing tests**

Append to `src/lib/edhrec/parse.test.ts`:

```ts
const gisa = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "__fixtures__", "gisa.json"), "utf8"));

describe("parseEdhrecPayload — widened fields", () => {
  it("reads archetype tags from tag_counts, sorted by count descending", () => {
    const { tags } = parseEdhrecPayload(gisa);
    expect(tags[0]).toEqual({ slug: "zombies", label: "Zombies", count: 567 });
    expect(tags.map((t) => t.count)).toEqual([...tags.map((t) => t.count)].sort((a, b) => b - a));
  });

  it("falls back to panels.taglinks when tag_counts is absent — one source, one fallback", () => {
    const { tags } = parseEdhrecPayload({ ...gisa, tag_counts: undefined });
    expect(tags[0]).toEqual({ slug: "zombies", label: "Zombies", count: 567 });
  });

  it("reads bracket_counts and budget_counts from the top level", () => {
    const d = parseEdhrecPayload(gisa);
    expect(d.bracketCounts).toEqual({ "1": 15, "2": 607, "3": 328, "4": 77, "5": 5 });
    expect(d.budgetCounts).toEqual({ budget: 433, middle: 3466, expensive: 433 });
  });

  it("reads similar commander names", () => {
    const { similarNames } = parseEdhrecPayload(gisa);
    expect(similarNames).toContain("Ayara, First of Locthwain");
    expect(similarNames).toContain("Braids, Arisen Nightmare");
  });

  it("reads commander metadata from container.json_dict.card", () => {
    const d = parseEdhrecPayload(gisa);
    expect(d.deckCount).toBe(4332);
    expect(d.rank).toBe(648);
    expect(d.saltScore).toBeCloseTo(0.1913, 4);
  });

  it("returns nulls, not zeros, when metadata is absent", () => {
    // A rank of 0 would read as the most popular commander in the game.
    const d = parseEdhrecPayload({});
    expect(d.deckCount).toBeNull();
    expect(d.rank).toBeNull();
    expect(d.saltScore).toBeNull();
  });

  it("returns the empty-but-present shape for a malformed payload", () => {
    const d = parseEdhrecPayload({});
    expect(d.tags).toEqual([]);
    expect(d.bracketCounts).toEqual({});
    expect(d.budgetCounts).toEqual({});
    expect(d.similarNames).toEqual([]);
  });

  it.each([NaN, Infinity, "648"])("omits a non-finite rank of %p", (rank) => {
    const d = parseEdhrecPayload({ container: { json_dict: { card: { rank } } } });
    expect(d.rank).toBeNull();
  });

  it("drops a tag whose count is non-finite rather than entering 0", () => {
    const { tags } = parseEdhrecPayload({ tag_counts: [{ slug: "x", value: "X", count: NaN }] });
    expect(tags).toEqual([]);
  });

  it("keeps the three pre-existing fields byte-identical for the same input", () => {
    // The widening is additive: every consumer on main must behave the same.
    const d = parseEdhrecPayload(fixture);
    expect(d.topCards).toContain("Sol Ring");
    expect(d.inclusionByName["rhystic study"]).toBe(71);
    expect(d.inclusionByName["bolas's citadel"]).toBe(34.5);
    expect(d.synergyByName).toEqual({});
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/edhrec/parse.test.ts`
Expected: FAIL — `d.tags` is undefined; TypeScript errors on the new property names.

- [ ] **Step 4: Widen the parser**

In `src/lib/edhrec/parse.ts`, extend the type additively — the existing three fields keep their exact shapes and their comments:

```ts
export type EdhrecTag = { slug: string; label: string; count: number };

export type EdhrecData = {
  topCards: string[];
  inclusionByName: Record<string, number>;
  // How much more this commander's decks run a card than decks generally.
  // The map itself is always present; a card whose upstream `synergy` is missing
  // or non-numeric is simply left out of it, rather than entered as 0 — a 0
  // draws a real bar for no data.
  synergyByName: Record<string, number>;
  tags: EdhrecTag[];
  bracketCounts: Record<string, number>;
  budgetCounts: Record<string, number>;
  similarNames: string[];
  // null, never 0: a rank of 0 would read as the most popular commander in the game.
  deckCount: number | null;
  rank: number | null;
  saltScore: number | null;
};
```

Add the readers above `parseEdhrecPayload`:

```ts
const finiteOrNull = (v: unknown): number | null => (Number.isFinite(v) ? (v as number) : null);

/**
 * `tag_counts` and `panels.taglinks` carry the same records (both verified against
 * the live Gisa payload on 2026-08-29). Read one, fall back to the other, never
 * merge — merging would double every count.
 */
function readTags(payload: unknown): EdhrecTag[] {
  const p = payload as { tag_counts?: unknown; panels?: { taglinks?: unknown } } | null;
  const raw = Array.isArray(p?.tag_counts)
    ? p.tag_counts
    : Array.isArray(p?.panels?.taglinks)
      ? p.panels.taglinks
      : [];
  const tags: EdhrecTag[] = [];
  for (const t of raw as { slug?: unknown; value?: unknown; count?: unknown }[]) {
    if (typeof t?.slug !== "string" || !Number.isFinite(t?.count)) continue;
    tags.push({
      slug: t.slug,
      label: typeof t.value === "string" ? t.value : t.slug,
      count: t.count as number,
    });
  }
  return tags.sort((a, b) => b.count - a.count);
}

/** Keeps only finite numeric values — an upstream null must not become a 0 bar. */
function readCounts(v: unknown): Record<string, number> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(v)) if (Number.isFinite(n)) out[k] = n as number;
  return out;
}
```

Change the malformed-input guard at line 15 and the return at line 42 to carry the new fields. Compute the widened fields **before** the `cardlists` guard so a payload with no cardlists still yields its tags and metadata:

```ts
export function parseEdhrecPayload(payload: unknown): EdhrecData {
  const p = payload as {
    container?: { json_dict?: { cardlists?: unknown; card?: Record<string, unknown> } };
    bracket_counts?: unknown; budget_counts?: unknown; similar?: unknown;
  } | null;
  const card = p?.container?.json_dict?.card;
  const wide = {
    tags: readTags(payload),
    bracketCounts: readCounts(p?.bracket_counts),
    budgetCounts: readCounts(p?.budget_counts),
    similarNames: Array.isArray(p?.similar)
      ? p.similar.filter((n): n is string => typeof n === "string")
      : [],
    deckCount: finiteOrNull(card?.num_decks),
    rank: finiteOrNull(card?.rank),
    saltScore: finiteOrNull(card?.salt),
  };

  const cardlists = p?.container?.json_dict?.cardlists;
  if (!Array.isArray(cardlists)) {
    return { topCards: [], inclusionByName: {}, synergyByName: {}, ...wide };
  }
  // … existing loop, unchanged …
  return { topCards: [...seen], inclusionByName, synergyByName, ...wide };
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run src/lib/edhrec/parse.test.ts`
Expected: PASS — the new describe block plus all 20 pre-existing tests.

- [ ] **Step 6: Verify no consumer broke**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS. The widening is additive, so every existing consumer of `EdhrecData` still compiles untouched.

- [ ] **Step 7: Commit**

```bash
git add src/lib/edhrec/parse.ts src/lib/edhrec/parse.test.ts src/lib/edhrec/__fixtures__/gisa.json
git commit -m "feat(edhrec): keep the tags, brackets and metadata the parser was discarding"
```

---

## Task 3: Component D — commander engine classifier

The axis that makes #215 work. From the spec's §6: overlap ranks Ghoulcaller Gisa near the top of her own deck and theme fit ranks her ~perfect — she *is* the zombies-by-sacrifice archetype. Neither signal can see that she costs `{3}{B}{B}`, must survive a full turn cycle before doing anything, and gets recast at 5 → 7 → 9. Without this component the audit fails on the case that motivated it.

**Files:**
- Create: `src/lib/recs/engine.ts`
- Create: `src/lib/recs/engine.test.ts`

**Interfaces:**
- Consumes: `frontFaceOracle` from `src/lib/recs/faces.ts` (Task 1).
- Produces: `type CommanderEngine = "etb" | "triggered" | "activated" | "tap" | "static"` and `classifyEngine(card: { oracleText: string | null }): CommanderEngine | null`. Task 5 constrains `commander_support.engine` to exactly these five strings; Task 6 calls it.

- [ ] **Step 1: Write the failing test**

Create `src/lib/recs/engine.test.ts`. Every oracle text below is the real Scryfall text, fetched 2026-08-29 — the classifier's whole value is that it agrees with reality, so the fixtures must not be paraphrased.

```ts
import { describe, expect, it } from "vitest";
import { classifyEngine, type CommanderEngine } from "./engine";

const GISA =
  "{B}, {T}, Sacrifice another creature: Create X 2/2 black Zombie creature tokens, where X is the sacrificed creature's power.";
const YAWGMOTH =
  "Protection from Humans\nPay 1 life, Sacrifice another creature: Put a -1/-1 counter on up to one target creature and draw a card.\n{B}{B}, Discard a card: Proliferate. (Choose any number of permanents and/or players, then give each another counter of each kind already there.)";
const AYARA =
  "Whenever Ayara or another black creature you control enters, each opponent loses 1 life and you gain 1 life.\n{T}, Sacrifice another black creature: Draw a card.";
const BRAIDS =
  "At the beginning of your end step, you may sacrifice an artifact, creature, enchantment, land, or planeswalker. If you do, each opponent may sacrifice a permanent of their choice that shares a card type with it. For each opponent who doesn't, that player loses 2 life and you draw a card.";

describe("classifyEngine", () => {
  const cases: [string, string, CommanderEngine][] = [
    // Only route to her value is gated behind {T} — she must survive a turn cycle.
    // This is the classification #215 exists to surface.
    ["Ghoulcaller Gisa", GISA, "tap"],
    // Costs, but no {T}: usable the turn he lands and repeatable within a turn.
    ["Yawgmoth, Thran Physician", YAWGMOTH, "activated"],
    // Both a trigger AND a {T} ability. The trigger is free and works on landing,
    // so least-restrictive-wins must pick it. If this case ever returns "tap",
    // the precedence has been inverted back — see the spec's §6 review note.
    ["Ayara, First of Locthwain", AYARA, "triggered"],
    ["Braids, Arisen Nightmare", BRAIDS, "triggered"],
  ];

  it.each(cases)("classifies %s as %s", (_name, oracleText, expected) => {
    expect(classifyEngine({ oracleText })).toBe(expected);
  });

  it("prefers etb over a tap ability on the same card", () => {
    expect(
      classifyEngine({ oracleText: "When this creature enters, draw a card.\n{T}: Add {B}." }),
    ).toBe("etb");
  });

  it("falls back to static for rules text with no gated ability", () => {
    expect(classifyEngine({ oracleText: "Creatures you control get +1/+1." })).toBe("static");
  });

  it("returns null for a vanilla legendary with no rules text", () => {
    // Genuinely unclassifiable on this axis. Guessing would be worse than absence.
    expect(classifyEngine({ oracleText: null })).toBeNull();
    expect(classifyEngine({ oracleText: "   " })).toBeNull();
  });

  it("ignores the back face of a modal double-faced card", () => {
    // transform.ts joins faces with "\n//\n". Splitting on " // " instead would
    // return the whole string and let the back face's {T} classify the front —
    // the #79 bug class. This test is the guard.
    const joined = "When this creature enters, draw a card.\n//\n{T}: Add {B}.";
    expect(classifyEngine({ oracleText: joined })).toBe("etb");
  });

  it("does not read a reminder-text tap symbol as an activated ability", () => {
    // Overgrown Tomb's entire text is parenthetical reminder text.
    expect(
      classifyEngine({ oracleText: "({T}: Add {B} or {G}.)\nAs this land enters, you may pay 2 life." }),
    ).toBe("static");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/recs/engine.test.ts`
Expected: FAIL — `Failed to resolve import "./engine"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/recs/engine.ts`:

```ts
import { frontFaceOracle } from "./faces";

/**
 * How soon a commander delivers its value. #215 needs this because overlap and
 * theme fit both rank Ghoulcaller Gisa perfectly in her own deck while neither
 * can see that she costs {3}{B}{B} and does nothing until she has survived a
 * turn cycle — the complaint that motivated the feature.
 */
export type CommanderEngine =
  | "etb"        // value on entering the battlefield
  | "triggered"  // free trigger; works the turn it lands
  | "activated"  // a cost but no {T} — usable immediately, repeatable
  | "tap"        // every route requires {T} — must survive a turn cycle
  | "static";    // fallback: rules text, but no gated ability detected

const ETB = /\bwhen (this|[^.]{0,40}?) enters\b/;
const TRIGGERED = /\b(whenever|at the beginning of)\b/;
// An activation cost is "<cost>: <effect>" on one line. Requiring a colon keeps
// this from matching the colons in flavour-shaped sentences elsewhere.
const ACTIVATED = /^[^\n:]{1,80}:\s/m;
const TAP_SYMBOL = /\{t\}/;

/**
 * Strips parenthetical reminder text before matching. Overgrown Tomb's entire
 * oracle text is "({T}: Add {B} or {G}.)" — reminder text describes what the
 * card already does, so reading it as a distinct ability double-counts.
 */
const stripReminders = (s: string) => s.replace(/\([^)]*\)/g, "");

/**
 * Precedence is least-restrictive-wins: what a commander actually gives you is
 * the cheapest route it offers, not the dearest. Ayara, First of Locthwain has
 * both a free drain trigger and a {T} ability; most-restrictive would call her
 * "tap" and claim she needs a turn cycle, which is false.
 *
 * `static` is a fallback rather than a matched category on purpose. Yawgmoth,
 * Thran Physician opens with "Protection from Humans" — a static keyword that
 * has nothing to do with why he is played.
 *
 * This is a heuristic and will be imperfect; that was accepted at intake. It is
 * one of three separately-reported axes, never a ranking input.
 */
export function classifyEngine(card: { oracleText: string | null }): CommanderEngine | null {
  const raw = frontFaceOracle(card.oracleText).trim();
  if (raw === "") return null;

  const text = stripReminders(raw).toLowerCase();
  if (ETB.test(text)) return "etb";
  if (TRIGGERED.test(text)) return "triggered";

  const activationLines = text.split("\n").filter((line) => ACTIVATED.test(line));
  if (activationLines.length > 0) {
    // "tap" only when every activation route is gated behind {T}. One untapped
    // route is enough to make the commander usable the turn it lands.
    const untapped = activationLines.filter((line) => !TAP_SYMBOL.test(line.split(":")[0]));
    return untapped.length > 0 ? "activated" : "tap";
  }

  return "static";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/recs/engine.test.ts`
Expected: PASS, 11 assertions.

If the Gisa case fails as `activated`: her cost is `{B}, {T}, Sacrifice another creature`, so the `{T}` sits in the cost half before the colon — confirm `line.split(":")[0]` is being tested, not the whole line.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recs/engine.ts src/lib/recs/engine.test.ts
git commit -m "feat(recs): classify how soon a commander delivers value"
```

---

## Task 4: Component E — land colour-production check

From the spec's §7, using the real motivating deck: the Zombies list runs **34 Swamps** and every nonland card is mono-black or colourless. Identity-safety therefore barely filters — *every* black-inclusive identity is legality-safe, including Dimir. But 34 Swamps cannot cast a blue spell. Legality and playability diverge completely, and an audit that only checks legality would cheerfully recommend a two-colour commander into a deck with zero fixing.

**Files:**
- Create: `src/lib/recs/mana.ts`
- Create: `src/lib/recs/mana.test.ts`

**Interfaces:**
- Consumes: `PoolCard` from `src/lib/recs/score.ts`.
- Produces: `producibleColors(lands: Pick<PoolCard, "typeLine" | "oracleText">[]): Set<string>` — members are `"W" | "U" | "B" | "R" | "G"`, matching `cards.colorIdentity`'s `text[]` representation so the subset check needs no conversion. No `Color` type is introduced; none exists in this codebase.

- [ ] **Step 1: Write the failing test**

Create `src/lib/recs/mana.test.ts`. All oracle text and type lines are real, fetched from Scryfall 2026-08-29.

```ts
import { describe, expect, it } from "vitest";
import { producibleColors } from "./mana";

const land = (typeLine: string, oracleText: string | null) => ({ typeLine, oracleText });

describe("producibleColors", () => {
  it("derives colours from basic land types", () => {
    const lands = [
      land("Basic Land — Swamp", null),
      land("Basic Land — Island", null),
    ];
    expect(producibleColors(lands)).toEqual(new Set(["B", "U"]));
  });

  it("covers typed duals from the type line alone", () => {
    // Overgrown Tomb's mana ability lives only in parenthetical reminder text,
    // so the type line is what makes it work.
    const tomb = land(
      "Land — Swamp Forest",
      "({T}: Add {B} or {G}.)\nAs this land enters, you may pay 2 life. If you don't, it enters tapped.",
    );
    expect(producibleColors([tomb])).toEqual(new Set(["B", "G"]));
  });

  it("reads mana symbols from untyped lands", () => {
    expect(producibleColors([land("Land", "{T}: Add {W} or {U}.")])).toEqual(new Set(["W", "U"]));
  });

  it("treats an any-colour land as producing all five", () => {
    const city = land("Land", "{T}: Add one mana of any color.");
    expect(producibleColors([city])).toEqual(new Set(["W", "U", "B", "R", "G"]));
  });

  it("contributes nothing for a fetchland", () => {
    // Polluted Delta has no basic land type and produces no mana. Its colours come
    // from what it fetches, which is already counted when those lands are present.
    const delta = land(
      "Land",
      "{T}, Pay 1 life, Sacrifice this land: Search your library for an Island or Swamp card, put it onto the battlefield, then shuffle.",
    );
    expect(producibleColors([delta])).toEqual(new Set());
  });

  it("reads the BACK face of a modal double-faced land", () => {
    // The one place in this foundation where front-face-only is wrong: Agadeem's
    // Awakening is a black sorcery whose back face is the land. Front-face-only
    // would report no black source from a card that taps for {B}.
    const agadeem = land(
      "Sorcery // Land",
      "Return from your graveyard to the battlefield any number of target creature cards that each have a different mana value X or less.\n//\nAs this land enters, you may pay 3 life. If you don't, it enters tapped.\n{T}: Add {B}.",
    );
    expect(producibleColors([agadeem])).toEqual(new Set(["B"]));
  });

  it("returns {B} exactly for the real 34-Swamp manabase", () => {
    // The motivating case: legality would clear every black-inclusive identity,
    // including Dimir. This is the check that says the blue half is uncastable.
    const swamps = Array.from({ length: 34 }, () => land("Basic Land — Swamp", null));
    expect(producibleColors(swamps)).toEqual(new Set(["B"]));
  });

  it("ignores colourless mana symbols", () => {
    expect(producibleColors([land("Land", "{T}: Add {C}.")])).toEqual(new Set());
  });

  it("returns an empty set for no lands", () => {
    expect(producibleColors([])).toEqual(new Set());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/recs/mana.test.ts`
Expected: FAIL — `Failed to resolve import "./mana"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/recs/mana.ts`:

```ts
import type { PoolCard } from "./score";

const BASIC_TYPES: Record<string, string> = {
  plains: "W", island: "U", swamp: "B", mountain: "R", forest: "G",
};
const ALL_COLORS = ["W", "U", "B", "R", "G"];
const ANY_COLOR = /add .{0,30}\bany color\b/;

/**
 * Which colours a set of lands can actually produce.
 *
 * #215 needs this because legality and playability diverge completely in the
 * motivating deck: 34 Swamps clear every black-inclusive colour identity on
 * legality, including Dimir, while being unable to cast a single blue spell.
 *
 * Deliberately binary. Counting sources and judging whether a manabase is
 * *adequate* is a real deckbuilding model that would need tuning against decks
 * we do not have — the same confident nonsense the intake declined on
 * redundancy scoring. "Can these lands make this colour at all" is defensible
 * from data; "is this manabase good enough" is not, yet.
 *
 * Members are plain strings, matching cards.color_identity's text[] so the
 * subset check against a candidate's identity needs no conversion.
 */
export function producibleColors(
  lands: Pick<PoolCard, "typeLine" | "oracleText">[],
): Set<string> {
  const colors = new Set<string>();

  for (const land of lands) {
    // BOTH faces, unlike everywhere else in this foundation: Agadeem's Awakening
    // is a black sorcery whose BACK face is the land that taps for {B}. Reading
    // the front face only would report no black source from a black source.
    const typeLine = land.typeLine.toLowerCase();
    const text = (land.oracleText ?? "").toLowerCase();

    for (const [basic, color] of Object.entries(BASIC_TYPES)) {
      if (typeLine.includes(basic)) colors.add(color);
    }

    if (!typeLine.includes("land")) continue;

    if (ANY_COLOR.test(text)) {
      for (const c of ALL_COLORS) colors.add(c);
      continue;
    }

    // Only symbols in an "add …" clause. A fetchland's text names Island and
    // Swamp but produces no mana; a land that costs {B} to activate something
    // is not thereby a black source.
    for (const clause of text.matchAll(/\badd\b([^.\n]*)/g)) {
      for (const symbol of clause[1].matchAll(/\{([wubrg])\}/g)) {
        colors.add(symbol[1].toUpperCase());
      }
    }
  }

  return colors;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/recs/mana.test.ts`
Expected: PASS, 9 tests.

The fetchland case is the one to watch: Polluted Delta's text contains "Island or Swamp" but no `add` clause and no basic land type, so both extraction paths must miss it.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recs/mana.ts src/lib/recs/mana.test.ts
git commit -m "feat(recs): report which colours a manabase can actually produce"
```

- [ ] **Step 6: Run the full pre-push gate and push**

```bash
pnpm typecheck && pnpm lint && pnpm test
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
git fetch origin && git rebase origin/main
git push -u origin feat/rec-foundation
```

Do **not** open a PR. Components A, D and E are complete and independently useful; B and C follow.

---

## Task 5: Component B, part 1 — the commander support schema

Two tables. The header carries one row per commander; the child table carries the resolved support list. Nothing reads them yet — this task is schema plus migration only, so it can be reviewed on its own merits.

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0011_*.sql` (generated, not hand-written)

**Interfaces:**
- Consumes: `CommanderEngine` from `src/lib/recs/engine.ts` (Task 3), `SynergyState` from `src/lib/recs/synergy-state.ts`, `EdhrecTag` from `src/lib/edhrec/parse.ts` (Task 2).
- Produces: `commanderSupport` and `commanderSupportCards` Drizzle tables. Task 6 writes both.

- [ ] **Step 1: Add the tables**

Append to `src/db/schema.ts`, after the `commanderScores` block. Note the imports at the top of the file already include `check`, `index`, `jsonb`, `primaryKey`, `real`, `uuid` and `sql` — nothing new is needed except the two type imports.

```ts
import type { EdhrecTag } from "../lib/edhrec/parse";
import type { CommanderEngine } from "../lib/recs/engine";

/**
 * Precomputed EDHREC support data for every commander-legal legendary, not just
 * the ones a user owns. #213/#214/#215 all need to score against the whole
 * candidate universe, and a per-request fetch across ~3,000 commanders is not
 * something a request can do — hence an offline index.
 */
export const commanderSupport = pgTable("commander_support", {
  commanderOracleId: uuid("commander_oracle_id").primaryKey().references(() => cards.oracleId),
  // Same three-value distinction commander_scores preserves, and for the same
  // reason: "absent" is a settled fact about a commander EDHREC does not index,
  // "degraded" is an outage worth retrying. Collapsing them loses the retry signal.
  synergyState: text("synergy_state", { enum: ["ok", "absent", "degraded"] }).notNull(),
  // Null iff synergyState !== "ok". Size of the support list, before unresolvable
  // names are dropped — so an unresolvable name reduces measured overlap rather
  // than silently shrinking the denominator.
  edhrecTotal: integer("edhrec_total"),
  tags: jsonb("tags").$type<EdhrecTag[]>().notNull(),
  bracketCounts: jsonb("bracket_counts").$type<Record<string, number>>().notNull(),
  budgetCounts: jsonb("budget_counts").$type<Record<string, number>>().notNull(),
  // EDHREC's own commander-adjacency graph, resolved to ids. Unresolvable names dropped.
  similarOracleIds: uuid("similar_oracle_ids").array().notNull(),
  deckCount: integer("deck_count"),
  rank: integer("rank"),
  saltScore: real("salt_score"),
  // Null when the commander has no rules text to classify.
  engine: text("engine", { enum: ["etb", "triggered", "activated", "tap", "static"] })
    .$type<CommanderEngine>(),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
}, (t) => [
  // The enum options above only narrow the TypeScript type; without these the
  // database would accept any text. Same reasoning as commander_scores.
  check("commander_support_synergy_state_check", sql`${t.synergyState} in ('ok', 'absent', 'degraded')`),
  check(
    "commander_support_total_null_check",
    sql`(${t.synergyState} = 'ok') = (${t.edhrecTotal} is not null)`,
  ),
  check(
    "commander_support_engine_check",
    sql`${t.engine} is null or ${t.engine} in ('etb', 'triggered', 'activated', 'tap', 'static')`,
  ),
]);

/**
 * Normalised rather than a uuid[] on the header: every consuming query is
 * "intersect this support list with the oracle ids a user has", which is a join
 * Postgres does well and an array containment check does badly at ~700-900k rows.
 */
export const commanderSupportCards = pgTable("commander_support_cards", {
  commanderOracleId: uuid("commander_oracle_id").notNull()
    .references(() => commanderSupport.commanderOracleId, { onDelete: "cascade" }),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  // Null when upstream carried none. Never 0 — a 0 draws a real bar for no data.
  inclusion: real("inclusion"),
  synergy: real("synergy"),
}, (t) => [
  primaryKey({ columns: [t.commanderOracleId, t.oracleId] }),
  // #218 traverses this relation in the opposite direction: one card, which
  // commanders support it. The PK's leading column cannot serve that query.
  index("commander_support_cards_oracle_idx").on(t.oracleId),
]);
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm db:generate`
Expected: a new `drizzle/0011_<name>.sql` creating both tables, with three `ADD CONSTRAINT … CHECK` statements. Compare its shape against `drizzle/0003_minor_multiple_man.sql`, which is the precedent for Drizzle emitting checks.

- [ ] **Step 3: Verify the generated SQL carries all three checks**

Run: `grep -c "CHECK" drizzle/0011_*.sql`
Expected: `3`. If it prints `0`, the `check()` helper was not imported or the third array element was returned from the wrong callback — do not hand-edit the SQL; fix `schema.ts` and regenerate.

Then read the three expressions, not just their count — a constraint on the wrong
column passes a count check:

```bash
grep -A1 "CONSTRAINT \"commander_support_" drizzle/0011_*.sql
```

Expected, in substance:
- `synergy_state in ('ok', 'absent', 'degraded')`
- `(synergy_state = 'ok') = (edhrec_total is not null)` — the biconditional, not
  a one-way implication. `ok` with a null total and non-`ok` with a set total are
  both rejected.
- `engine is null or engine in ('etb', 'triggered', 'activated', 'tap', 'static')`

Spec §8 asks for a test that the database *rejects* the impossible combinations.
This repo has no integration-test harness — every suite in `src/` is pure and
runs without `DATABASE_URL` — so building one for two constraints is out of
proportion to the task. Reading the emitted expressions is the substitute, and
it is recorded here as a deliberate deviation rather than left unstated. If a
live check is wanted, run these against a scratch Neon branch after
`pnpm db:migrate` and expect both to error:

```sql
insert into commander_support (commander_oracle_id, synergy_state, edhrec_total, tags,
  bracket_counts, budget_counts, similar_oracle_ids)
values (gen_random_uuid(), 'ok', null, '[]', '{}', '{}', '{}');

insert into commander_support (commander_oracle_id, synergy_state, edhrec_total, tags,
  bracket_counts, budget_counts, similar_oracle_ids)
values (gen_random_uuid(), 'absent', 100, '[]', '{}', '{}', '{}');
```

- [ ] **Step 4: Typecheck and build**

Run: `pnpm typecheck && pnpm lint && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: PASS. The build runs no queries, so it proves the schema compiles without needing a live database.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts drizzle/0011_*.sql drizzle/meta
git commit -m "feat(db): add the commander support index tables"
```

---

## Task 6: Component B, part 2 — the index build library

The pure half: name resolution, row construction, and a build loop whose I/O is injected so it is testable without a database or a network.

**Files:**
- Modify: `src/lib/edhrec/client.ts`
- Create: `src/lib/edhrec/index-build.ts`
- Create: `src/lib/edhrec/index-build.test.ts`

**Interfaces:**
- Consumes: `EdhrecFetchResult`, `parseEdhrecPayload`, `EdhrecTag` (Task 2); `synergyStateFrom`; `classifyEngine` (Task 3); `frontFaceName` (Task 1).
- Produces:
  - `fetchEdhrecUncached(commanderName: string): Promise<EdhrecFetchResult>` from `client.ts`
  - `buildNameIndex(cards: { oracleId: string; name: string }[]): Map<string, string>`
  - `toSupportRows(args: { commander: IndexCommander; result: EdhrecFetchResult; nameIndex: Map<string, string> }): { header: SupportHeader; cards: SupportCard[]; unresolved: number }`
  - types `IndexCommander = { oracleId: string; name: string; oracleText: string | null }`, `SupportHeader`, `SupportCard`

Task 7 wires these to the database.

- [ ] **Step 1: Add the uncached fetch to client.ts**

Extract the shared URL and request init, then add the new function. `resolveEdhrecData` keeps its exact current behaviour — this is a pure extraction on its side.

Replace `client.ts` lines 48-54's inline URL and init with module-level constants, and add below `resolveEdhrecData`:

```ts
const edhrecUrl = (commanderName: string) =>
  `https://json.edhrec.com/pages/commanders/${commanderSlug(commanderName)}.json`;

// Timeout so a hung EDHREC request falls through to stale/degraded handling
// instead of stalling the recommendations page.
const edhrecInit = (): RequestInit => ({
  headers: { "User-Agent": "the-99/1.0" },
  signal: AbortSignal.timeout(10_000),
});

/**
 * Fetch + parse with NO cache read and NO cache write. The index job needs both
 * halves skipped, for separate reasons:
 *
 * - Not reading: TTL_MS is 30 days, so a monthly index built through
 *   resolveEdhrecData would re-serve rows fetched 29 days ago and stamp them
 *   computed_at = now, making effective freshness up to 60 days.
 * - Not writing: the index walks ~3,000 commanders at ~94KB of payload each.
 *   Caching those is 300-400MB of jsonb for commanders nobody owns.
 *
 * Returns the same EdhrecFetchResult shape, so synergyStateFrom() applies to it
 * verbatim and the index and live paths cannot disagree about what "absent" means.
 */
export async function fetchEdhrecUncached(commanderName: string): Promise<EdhrecFetchResult> {
  try {
    const res = await fetch(edhrecUrl(commanderName), edhrecInit());
    // 4xx = not indexed on EDHREC. A data-shaped absence, not an outage.
    if (res.status >= 400 && res.status < 500) return { data: null, unreachable: false };
    if (!res.ok) throw new Error(`edhrec ${res.status}`);
    return { data: parseEdhrecPayload(await res.json()), unreachable: false };
  } catch {
    return { data: null, unreachable: true };
  }
}
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/edhrec/index-build.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildNameIndex, toSupportRows } from "./index-build";
import type { EdhrecData } from "./parse";

const EMPTY_WIDE = {
  tags: [], bracketCounts: {}, budgetCounts: {}, similarNames: [],
  deckCount: null, rank: null, saltScore: null,
};
const data = (over: Partial<EdhrecData>): EdhrecData => ({
  topCards: [], inclusionByName: {}, synergyByName: {}, ...EMPTY_WIDE, ...over,
});

const GISA = {
  oracleId: "11111111-1111-1111-1111-111111111111",
  name: "Ghoulcaller Gisa",
  oracleText:
    "{B}, {T}, Sacrifice another creature: Create X 2/2 black Zombie creature tokens, where X is the sacrificed creature's power.",
};

describe("buildNameIndex", () => {
  it("indexes the full lowercased name", () => {
    const idx = buildNameIndex([{ oracleId: "a", name: "Sol Ring" }]);
    expect(idx.get("sol ring")).toBe("a");
  });

  it("also indexes the front face of a double-faced card", () => {
    // EDHREC lists DFCs by front face while Scryfall names them "Front // Back".
    // Without the front-face key, every DFC in a support list is unresolvable.
    const idx = buildNameIndex([{ oracleId: "b", name: "Agadeem's Awakening // Agadeem, the Undercrypt" }]);
    expect(idx.get("agadeem's awakening")).toBe("b");
    expect(idx.get("agadeem's awakening // agadeem, the undercrypt")).toBe("b");
  });

  it("does not let a front-face key overwrite a real single-faced card", () => {
    // A single-faced card owns its own name; a DFC's derived front-face key must not win.
    const idx = buildNameIndex([
      { oracleId: "real", name: "Bala Ged Recovery" },
      { oracleId: "dfc", name: "Bala Ged Recovery // Bala Ged Sanctuary" },
    ]);
    expect(idx.get("bala ged recovery")).toBe("real");
  });
});

describe("toSupportRows", () => {
  const nameIndex = buildNameIndex([
    { oracleId: "sol", name: "Sol Ring" },
    { oracleId: "gray", name: "Gray Merchant of Asphodel" },
    { oracleId: "ayara", name: "Ayara, First of Locthwain" },
  ]);

  it("builds an ok header with the classified engine and resolved similars", () => {
    const { header, cards, unresolved } = toSupportRows({
      commander: GISA,
      result: {
        data: data({
          topCards: ["Sol Ring", "Gray Merchant of Asphodel"],
          inclusionByName: { "sol ring": 71 },
          synergyByName: { "gray merchant of asphodel": 0.23 },
          tags: [{ slug: "zombies", label: "Zombies", count: 567 }],
          bracketCounts: { "2": 607 },
          similarNames: ["Ayara, First of Locthwain", "Never Printed"],
          deckCount: 4332, rank: 648, saltScore: 0.19,
        }),
        unreachable: false,
      },
      nameIndex,
    });

    expect(header.synergyState).toBe("ok");
    expect(header.edhrecTotal).toBe(2);
    expect(header.engine).toBe("tap");
    expect(header.similarOracleIds).toEqual(["ayara"]);
    expect(header.deckCount).toBe(4332);
    expect(cards).toEqual([
      { commanderOracleId: GISA.oracleId, oracleId: "sol", inclusion: 71, synergy: null },
      { commanderOracleId: GISA.oracleId, oracleId: "gray", inclusion: null, synergy: 0.23 },
    ]);
    expect(unresolved).toBe(0);
  });

  it("counts an unresolvable support name without shrinking edhrecTotal", () => {
    // Dropping the name from the child table AND the denominator would inflate
    // measured overlap for every user. The row is dropped; the total is not.
    const { header, cards, unresolved } = toSupportRows({
      commander: GISA,
      result: { data: data({ topCards: ["Sol Ring", "Never Printed"] }), unreachable: false },
      nameIndex,
    });
    expect(header.edhrecTotal).toBe(2);
    expect(cards).toHaveLength(1);
    expect(unresolved).toBe(1);
  });

  it("records absent with a null total when EDHREC does not index the commander", () => {
    const { header, cards } = toSupportRows({
      commander: GISA,
      result: { data: null, unreachable: false },
      nameIndex,
    });
    expect(header.synergyState).toBe("absent");
    expect(header.edhrecTotal).toBeNull();
    expect(cards).toEqual([]);
  });

  it("records degraded when EDHREC was unreachable", () => {
    // Distinct from absent: this one is worth retrying. Persisting them
    // identically is what the check constraints and synergy-state.ts prevent.
    const { header } = toSupportRows({
      commander: GISA,
      result: { data: null, unreachable: true },
      nameIndex,
    });
    expect(header.synergyState).toBe("degraded");
    expect(header.edhrecTotal).toBeNull();
  });

  it("treats an empty topCards list as absent, not ok", () => {
    // Matches synergyStateFrom: a parsed-but-empty payload is not data.
    const { header } = toSupportRows({
      commander: GISA,
      result: { data: data({ topCards: [] }), unreachable: false },
      nameIndex,
    });
    expect(header.synergyState).toBe("absent");
  });

  it("resolves a support name by front face when the catalog holds the joined name", () => {
    const idx = buildNameIndex([{ oracleId: "bala", name: "Bala Ged Recovery // Bala Ged Sanctuary" }]);
    const { cards } = toSupportRows({
      commander: GISA,
      result: { data: data({ topCards: ["Bala Ged Recovery"] }), unreachable: false },
      nameIndex: idx,
    });
    expect(cards[0].oracleId).toBe("bala");
  });

  it("never emits a support row for the commander itself", () => {
    const idx = buildNameIndex([{ oracleId: GISA.oracleId, name: GISA.name }, { oracleId: "sol", name: "Sol Ring" }]);
    const { cards } = toSupportRows({
      commander: GISA,
      result: { data: data({ topCards: ["Ghoulcaller Gisa", "Sol Ring"] }), unreachable: false },
      nameIndex: idx,
    });
    expect(cards.map((c) => c.oracleId)).toEqual(["sol"]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/edhrec/index-build.test.ts`
Expected: FAIL — `Failed to resolve import "./index-build"`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/edhrec/index-build.ts`:

```ts
import { classifyEngine, type CommanderEngine } from "../recs/engine";
import { synergyStateFrom, type SynergyState } from "../recs/synergy-state";
import { frontFaceName } from "../recs/faces";
import type { EdhrecFetchResult } from "./client";
import type { EdhrecTag } from "./parse";

export type IndexCommander = { oracleId: string; name: string; oracleText: string | null };

export type SupportHeader = {
  commanderOracleId: string;
  synergyState: SynergyState;
  edhrecTotal: number | null;
  tags: EdhrecTag[];
  bracketCounts: Record<string, number>;
  budgetCounts: Record<string, number>;
  similarOracleIds: string[];
  deckCount: number | null;
  rank: number | null;
  saltScore: number | null;
  engine: CommanderEngine | null;
};

export type SupportCard = {
  commanderOracleId: string;
  oracleId: string;
  inclusion: number | null;
  synergy: number | null;
};

/**
 * name -> oracle_id, resolved ONCE at index build rather than on every read.
 *
 * Indexes the full lowercased name AND the front face, because EDHREC lists
 * double-faced cards by front face while Scryfall names them "Front // Back".
 * score.ts:96-102 does the same thing for the live path; this is that rule
 * applied to the offline one.
 *
 * The full name always wins over a derived front-face key: "Bala Ged Recovery"
 * is a real single-faced card in some printings and the front face of a DFC in
 * others, and the real card is the right answer.
 */
export function buildNameIndex(cards: { oracleId: string; name: string }[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const c of cards) {
    const front = frontFaceName(c.name).toLowerCase();
    if (!index.has(front)) index.set(front, c.oracleId);
  }
  for (const c of cards) index.set(c.name.toLowerCase(), c.oracleId);
  return index;
}

/**
 * One commander's fetch result -> the rows the index stores.
 *
 * Derives synergyState via synergyStateFrom rather than testing an HTTP status,
 * which is what keeps the index's notion of absent/degraded identical to the
 * live path's.
 */
export function toSupportRows(args: {
  commander: IndexCommander;
  result: EdhrecFetchResult;
  nameIndex: Map<string, string>;
}): { header: SupportHeader; cards: SupportCard[]; unresolved: number } {
  const { commander, result, nameIndex } = args;
  const state = synergyStateFrom(result);
  const d = result.data;

  const header: SupportHeader = {
    commanderOracleId: commander.oracleId,
    synergyState: state,
    // Null unless "ok" — the check constraint enforces this pairing, and a 0
    // here would claim "EDHREC lists nothing for this commander" when the truth
    // is "we did not reach EDHREC".
    edhrecTotal: state === "ok" ? d!.topCards.length : null,
    tags: d?.tags ?? [],
    bracketCounts: d?.bracketCounts ?? {},
    budgetCounts: d?.budgetCounts ?? {},
    similarOracleIds: (d?.similarNames ?? [])
      .map((n) => nameIndex.get(n.toLowerCase()))
      .filter((id): id is string => id !== undefined),
    deckCount: d?.deckCount ?? null,
    rank: d?.rank ?? null,
    saltScore: d?.saltScore ?? null,
    engine: classifyEngine(commander),
  };

  if (state !== "ok") return { header, cards: [], unresolved: 0 };

  const cards: SupportCard[] = [];
  let unresolved = 0;
  for (const name of d!.topCards) {
    const key = name.toLowerCase();
    const oracleId = nameIndex.get(key);
    // Unresolvable names are dropped from the child table but stay counted in
    // edhrecTotal, so a missing name reduces measured overlap rather than
    // silently shrinking the denominator and inflating every user's completeness.
    if (oracleId === undefined) { unresolved++; continue; }
    if (oracleId === commander.oracleId) continue;
    cards.push({
      commanderOracleId: commander.oracleId,
      oracleId,
      inclusion: d!.inclusionByName[key] ?? null,
      synergy: d!.synergyByName[key] ?? null,
    });
  }
  return { header, cards, unresolved };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/edhrec/index-build.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 6: Prove the live path did not change**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS. Step 1 only extracted constants out of `resolveEdhrecData`; if any existing EDHREC test fails, the extraction changed behaviour and must be reverted to the inline form.

- [ ] **Step 7: Commit**

```bash
git add src/lib/edhrec/client.ts src/lib/edhrec/index-build.ts src/lib/edhrec/index-build.test.ts
git commit -m "feat(edhrec): resolve commander support lists to oracle ids offline"
```

---
## Task 7: Component B — the index runner, its script, and its workflow

This is the only task in Component B that touches the database or the network.
Tasks 2 and 6 built pure functions; this one wires them to Postgres, to
`fetchEdhrecUncached`, and to a monthly GitHub Actions run.

**Files:**
- Create: `src/lib/edhrec/seed-index.ts`
- Create: `src/lib/edhrec/seed-index.test.ts`
- Create: `scripts/build-commander-index.ts`
- Create: `.github/workflows/commander-index.yml`
- Modify: `package.json` (add `db:build:index`)
- Modify: `AGENTS.md` (document the new workflow alongside the catalog refresh)

**Interfaces:**
- Consumes: `commanderSupport`, `commanderSupportCards` (Task 5);
  `buildNameIndex`, `toSupportRows`, `IndexCommander` (Task 6);
  `fetchEdhrecUncached` (Task 6); `isCommanderCandidate` (existing, `src/lib/recs/score.ts`).
- Produces: `buildCommanderIndex(opts?: BuildIndexOptions): Promise<BuildIndexResult>`.

**Why a wrapper script and not a route:** identical reasoning to the catalog
refresh — a Vercel function caps at 300s `maxDuration`, and ~3,000 serial
EDHREC fetches at a 250ms delay is at minimum 13 minutes of sleeping before any
parsing. `.github/workflows/catalog-refresh.yml` is the template to copy; do not
invent a different shape.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/edhrec/seed-index.test.ts`. Every test injects fakes, so the
suite touches neither Postgres nor the network.

```ts
import { describe, expect, it, vi } from "vitest";
import { buildCommanderIndex } from "./seed-index";

const commander = (name: string, oracleId: string) => ({
  oracleId, name,
  typeLine: "Legendary Creature — Human Wizard",
  oracleText: "{T}: Draw a card.",
});

const okResult = (topCards: string[]) => ({
  data: {
    topCards,
    inclusionByName: {}, synergyByName: {},
    tags: [], bracketCounts: {}, budgetCounts: {},
    similarNames: [], deckCount: 1000, rank: 5, saltScore: 1.2,
  },
  unreachable: false,
});

it("writes one header per commander and one child row per resolved card", async () => {
  const writes: unknown[] = [];
  const r = await buildCommanderIndex({
    loadCommanders: async () => [commander("Ghoulcaller Gisa", "g")],
    loadNameIndex: async () => [
      { oracleId: "g", name: "Ghoulcaller Gisa" },
      { oracleId: "s", name: "Sol Ring" },
    ],
    fetch: async () => okResult(["Sol Ring", "Ghoulcaller Gisa"]),
    write: async (header, cards) => { writes.push({ header, cards }); },
    delayMs: 0,
  });
  expect(r.commanders).toBe(1);
  expect(r.cardRows).toBe(1);           // Gisa herself is never her own support card
  expect(r.unresolved).toBe(0);
  expect(r.degraded).toBe(0);
});

it("counts an unresolvable name without dropping it from edhrecTotal", async () => {
  let seen: { edhrecTotal: number | null } | undefined;
  const r = await buildCommanderIndex({
    loadCommanders: async () => [commander("Ghoulcaller Gisa", "g")],
    loadNameIndex: async () => [{ oracleId: "s", name: "Sol Ring" }],
    fetch: async () => okResult(["Sol Ring", "A Card We Do Not Have"]),
    write: async (header) => { seen = header; },
    delayMs: 0,
  });
  expect(r.unresolved).toBe(1);
  expect(r.cardRows).toBe(1);
  expect(seen?.edhrecTotal).toBe(2);
});

it("does not write at all when EDHREC is unreachable", async () => {
  // "degraded" means we failed to reach EDHREC, not that EDHREC has nothing.
  // Writing it would replace a good row — and cascade-delete its support cards —
  // on the strength of one transient network failure. Spec §8 requires the
  // existing row survive untouched, so the only correct write is no write.
  const writes: unknown[] = [];
  const r = await buildCommanderIndex({
    loadCommanders: async () => [commander("Ghoulcaller Gisa", "g")],
    loadNameIndex: async () => [],
    fetch: async () => ({ data: null, unreachable: true }),
    write: async (header) => { writes.push(header); },
    delayMs: 0,
  });
  expect(r.degraded).toBe(1);
  expect(r.commanders).toBe(0);
  expect(writes).toEqual([]);
});

it("writes an absent header when EDHREC genuinely has no page", async () => {
  // A 4xx is upstream telling us this commander has no page — real information,
  // and distinct from a failure to ask. It is written.
  let seen: { synergyState: string; edhrecTotal: number | null } | undefined;
  const r = await buildCommanderIndex({
    loadCommanders: async () => [commander("Obscure Legend", "o")],
    loadNameIndex: async () => [],
    fetch: async () => ({ data: null, unreachable: false }),
    write: async (header) => { seen = header; },
    delayMs: 0,
  });
  expect(r.absent).toBe(1);
  expect(r.commanders).toBe(1);
  expect(seen?.synergyState).toBe("absent");
  expect(seen?.edhrecTotal).toBeNull();
});

it("does not abort the run when one commander throws", async () => {
  const r = await buildCommanderIndex({
    loadCommanders: async () => [commander("A", "a"), commander("B", "b")],
    loadNameIndex: async () => [],
    fetch: async (name) => {
      if (name === "A") throw new Error("boom");
      return okResult([]);
    },
    write: async () => {},
    delayMs: 0,
  });
  expect(r.failed).toBe(1);
  expect(r.commanders).toBe(1);
});

it("skips commanders already computed after the run start when resuming", async () => {
  const fetch = vi.fn(async () => okResult([]));
  const r = await buildCommanderIndex({
    loadCommanders: async () => [commander("A", "a"), commander("B", "b")],
    loadNameIndex: async () => [],
    loadAlreadyComputed: async () => new Set(["a"]),
    fetch,
    write: async () => {},
    delayMs: 0,
  });
  expect(r.skipped).toBe(1);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("waits delayMs between fetches so EDHREC is not hammered", async () => {
  const sleeps: number[] = [];
  await buildCommanderIndex({
    loadCommanders: async () => [commander("A", "a"), commander("B", "b")],
    loadNameIndex: async () => [],
    fetch: async () => okResult([]),
    write: async () => {},
    delayMs: 250,
    sleep: async (ms) => { sleeps.push(ms); },
  });
  expect(sleeps).toEqual([250, 250]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/edhrec/seed-index.test.ts`
Expected: FAIL — `Failed to resolve import "./seed-index"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/edhrec/seed-index.ts`:

```ts
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderSupport, commanderSupportCards } from "../../db/schema";
import { isCommanderCandidate } from "../recs/score";
import { fetchEdhrecUncached, type EdhrecFetchResult } from "./client";
import {
  buildNameIndex, toSupportRows,
  type IndexCommander, type SupportCard, type SupportHeader,
} from "./index-build";

// EDHREC serves this JSON for free and asks nothing of us; a quarter-second
// between requests keeps a ~3,000-commander run under an hour while staying
// far below any rate a human browsing the site would produce.
const DEFAULT_DELAY_MS = 250;
const CARD_BATCH_SIZE = 500;

export type BuildIndexOptions = {
  loadCommanders?: () => Promise<IndexCommander[]>;
  loadNameIndex?: () => Promise<{ oracleId: string; name: string }[]>;
  loadAlreadyComputed?: () => Promise<Set<string>>;
  fetch?: (name: string) => Promise<EdhrecFetchResult>;
  write?: (header: SupportHeader, cards: SupportCard[]) => Promise<void>;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

export type BuildIndexResult = {
  /** Headers actually written — `ok` plus `absent`. Degraded ones are not written. */
  commanders: number;
  cardRows: number;
  degraded: number; absent: number; unresolved: number;
  skipped: number; failed: number;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function loadCommandersFromDb(): Promise<IndexCommander[]> {
  const rows = await db
    .select({
      oracleId: cards.oracleId, name: cards.name,
      typeLine: cards.typeLine, oracleText: cards.oracleText,
    })
    .from(cards);
  // Filtered in TypeScript rather than SQL so the definition of "can be a
  // commander" has exactly one home — score.ts, where it is unit-tested and
  // where the front-face rule that kept Westvale Abbey out already lives.
  return rows.filter(isCommanderCandidate);
}

async function writeToDb(header: SupportHeader, cardRows: SupportCard[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(commanderSupport).values({ ...header, computedAt: new Date() })
      .onConflictDoUpdate({
        target: commanderSupport.commanderOracleId,
        set: {
          synergyState: sql`excluded.synergy_state`,
          edhrecTotal: sql`excluded.edhrec_total`,
          tags: sql`excluded.tags`,
          bracketCounts: sql`excluded.bracket_counts`,
          budgetCounts: sql`excluded.budget_counts`,
          similarOracleIds: sql`excluded.similar_oracle_ids`,
          deckCount: sql`excluded.deck_count`,
          rank: sql`excluded.rank`,
          saltScore: sql`excluded.salt_score`,
          engine: sql`excluded.engine`,
          computedAt: sql`excluded.computed_at`,
        },
      });
    // Delete-then-insert, not upsert: a card that left EDHREC's list must leave
    // the table too, and there is no upsert shape that removes rows.
    await tx.delete(commanderSupportCards)
      .where(sql`${commanderSupportCards.commanderOracleId} = ${header.commanderOracleId}`);
    for (let i = 0; i < cardRows.length; i += CARD_BATCH_SIZE) {
      await tx.insert(commanderSupportCards).values(cardRows.slice(i, i + CARD_BATCH_SIZE));
    }
  });
}

/**
 * Rebuilds `commander_support` and `commander_support_cards` for every card that
 * can legally be a commander.
 *
 * Every I/O edge is injectable so the whole build is unit-testable without a
 * database or a network. One commander's failure is recorded and stepped over:
 * a run of ~3,000 serial fetches that aborts on the first transient 5xx would
 * never complete, and each commander's write is independent of the others.
 */
export async function buildCommanderIndex(
  opts: BuildIndexOptions = {},
): Promise<BuildIndexResult> {
  const load = opts.loadCommanders ?? loadCommandersFromDb;
  const loadNames = opts.loadNameIndex ??
    (() => db.select({ oracleId: cards.oracleId, name: cards.name }).from(cards));
  const fetchOne = opts.fetch ?? fetchEdhrecUncached;
  const write = opts.write ?? writeToDb;
  const sleep = opts.sleep ?? defaultSleep;
  const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;

  const [commanders, nameRows] = await Promise.all([load(), loadNames()]);
  const nameIndex = buildNameIndex(nameRows);
  const already = opts.loadAlreadyComputed ? await opts.loadAlreadyComputed() : new Set<string>();

  const r: BuildIndexResult = {
    commanders: 0, cardRows: 0, degraded: 0, absent: 0,
    unresolved: 0, skipped: 0, failed: 0,
  };

  for (const commander of commanders) {
    if (already.has(commander.oracleId)) { r.skipped++; continue; }
    await sleep(delayMs);
    try {
      const result = await fetchOne(commander.name);
      const { header, cards: cardRows, unresolved } =
        toSupportRows({ commander, result, nameIndex });
      // Degraded is "we could not reach EDHREC", which is not a fact about the
      // commander. Writing it would overwrite a good row and cascade-delete its
      // support cards over one transient failure, so leave the previous row —
      // stale but true — in place and let the run summary report the count.
      if (header.synergyState === "degraded") { r.degraded++; continue; }
      await write(header, cardRows);
      r.commanders++;
      r.cardRows += cardRows.length;
      r.unresolved += unresolved;
      if (header.synergyState === "absent") r.absent++;
    } catch (err) {
      r.failed++;
      console.error(`commander-index: ${commander.name} failed`, err);
    }
  }
  return r;
}

/**
 * Oracle ids whose support row was recomputed at or after `since` — the resume
 * set for a re-dispatched run. Keyed on the run's own start time rather than a
 * fixed age so a retry an hour later still skips what the aborted run finished.
 */
export async function alreadyComputedSince(since: Date): Promise<Set<string>> {
  const rows = await db
    .select({ oracleId: commanderSupport.commanderOracleId })
    .from(commanderSupport)
    .where(sql`${commanderSupport.computedAt} >= ${since}`);
  return new Set(rows.map((x) => x.oracleId));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/edhrec/seed-index.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Write the wrapper script**

Create `scripts/build-commander-index.ts`, mirroring `scripts/seed-printings.ts`:

```ts
import "dotenv/config";
import { alreadyComputedSince, buildCommanderIndex } from "../src/lib/edhrec/seed-index";

// RESUME_SINCE is an ISO timestamp set by a re-dispatched workflow run so the
// retry skips commanders the aborted run already wrote. Absent, everything is
// recomputed — which is the correct behaviour for the scheduled monthly run.
const resumeSince = process.env.RESUME_SINCE ? new Date(process.env.RESUME_SINCE) : null;

buildCommanderIndex({
  loadAlreadyComputed: resumeSince ? () => alreadyComputedSince(resumeSince) : undefined,
})
  .then((r) => {
    console.log(
      `Indexed ${r.commanders} commanders (${r.cardRows} support cards); ` +
      `${r.degraded} degraded, ${r.absent} absent, ${r.unresolved} unresolved names, ` +
      `${r.skipped} skipped, ${r.failed} failed.`,
    );
    // A run that wrote nothing while degrading everything is a broken run
    // wearing a green tick — EDHREC was unreachable for the whole window.
    if (r.commanders === 0 && r.degraded > 0) {
      console.error("Every commander came back degraded — EDHREC is unreachable.");
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 6: Add the package script**

In `package.json`, after `"check:scryfall"`:

```json
    "db:build:index": "tsx scripts/build-commander-index.ts"
```

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Write the workflow**

Create `.github/workflows/commander-index.yml`. This copies
`catalog-refresh.yml`'s shape deliberately — same environment naming, same kill
switch, same `shell: bash`, same `tee -a "$GITHUB_STEP_SUMMARY"`:

```yaml
name: Commander index

# ~3,000 serial EDHREC fetches at 250ms apart is a minimum of 13 minutes of
# sleeping before any parsing, which is well past a Vercel function's 300s
# maxDuration. Same reasoning as catalog-refresh.yml, which this mirrors.
on:
  schedule:
    # 09:00 UTC on the 3rd — two days after the catalog refresh, so a commander
    # printed in a set that landed on the 1st already has its cards row and the
    # name index can resolve it.
    - cron: '0 9 3 * *'
  workflow_dispatch:
    inputs:
      target:
        description: Which database to index
        type: choice
        options: [staging, production]
        default: staging
      resume_since:
        description: >-
          ISO timestamp; commanders recomputed at or after it are skipped. Set this
          to the start time of an aborted run to resume it instead of restarting.
        type: string
        default: ''

concurrency:
  group: commander-index-${{ github.event.inputs.target || 'production' }}
  cancel-in-progress: false

permissions:
  contents: read

jobs:
  index:
    # Kill switch for the schedule; a manual dispatch always runs. Set the
    # COMMANDER_INDEX_ENABLED repository variable to 'true' or it never fires.
    if: vars.COMMANDER_INDEX_ENABLED == 'true' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    # Serial-by-design: the wall clock is dominated by the politeness delay, not
    # by compute. Leave headroom rather than trimming to the expected runtime —
    # a timeout mid-run leaves a partially rebuilt index, which the resume input
    # exists to recover.
    timeout-minutes: 180
    environment: commander-index-${{ github.event.inputs.target || 'production' }}
    defaults:
      run:
        shell: bash
    env:
      DATABASE_URL: ${{ secrets.CATALOG_DATABASE_URL }}
      RESUME_SINCE: ${{ github.event.inputs.resume_since || '' }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Build the commander index
        run: |
          {
            echo "## Commander index"
            echo ""
            echo "- Target: \`commander-index-${{ github.event.inputs.target || 'production' }}\`"
            echo ""
          } >> "$GITHUB_STEP_SUMMARY"
          pnpm --silent db:build:index | tee -a "$GITHUB_STEP_SUMMARY"
```

- [ ] **Step 8: Document the workflow**

In `AGENTS.md`, under `## Workflow`, after the `pnpm check:scryfall` bullet:

```markdown
- `pnpm db:build:index` rebuilds `commander_support` / `commander_support_cards` from EDHREC.
  The `Commander index` workflow runs it monthly on the 3rd — two days after the catalog
  refresh, so a commander from a new set already has a `cards` row to resolve against.
  Needs the `COMMANDER_INDEX_ENABLED` repository variable set to `'true'` to fire on schedule.
```

- [ ] **Step 9: Validate the workflow parses**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/commander-index.yml'))" && echo OK`
Expected: `OK`. A malformed workflow is otherwise only discovered on push.

- [ ] **Step 10: Full gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add src/lib/edhrec/seed-index.ts src/lib/edhrec/seed-index.test.ts \
        scripts/build-commander-index.ts .github/workflows/commander-index.yml \
        package.json AGENTS.md
git commit -m "feat(edhrec): build the commander support index on a monthly runner"
```

Do **not** open a PR. Push only, per the Global Constraints:

```bash
pnpm typecheck && pnpm lint && pnpm test
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
git fetch origin && git rebase origin/main
git push
```

---
## Task 8: Component C — ManaPool parser and client

Pure transform first, no database. The dedup rule is the whole reason this task
exists as its own unit: `scryfall_id` is **not** unique in the feed, and an
ingest that assumes it is will fail on a primary-key conflict partway through.

**Files:**
- Create: `src/lib/manapool/parse.ts`
- Create: `src/lib/manapool/parse.test.ts`
- Create: `src/lib/manapool/__fixtures__/singles.json`
- Create: `src/lib/manapool/client.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `parseManapoolPayload(raw: unknown): ManapoolFeed`,
  `type ManapoolFeed = { asOf: Date; rows: PriceRow[]; collapsedDuplicates: number }`,
  `type PriceRow = { scryfallId: string; priceCents: number | null; priceCentsNm: number | null; priceCentsFoil: number | null; priceCentsEtched: number | null; availableQuantity: number; buyUrl: string | null; asOf: Date }`,
  `fetchManapoolSingles(): Promise<unknown>`.

**Feed shape — verified live 2026-08-29T15:32:41.270Z.** Top-level keys are
exactly `meta` and `data`. `meta` is `{ as_of, base_url }`. `data` had 102,587
entries, 99,708 distinct `scryfall_id`s, 1,087 repeated ids, 2,879 surplus rows;
13,738 rows had a null `price_cents`; **zero** rows had a null or zero
`available_quantity`. Re-probe before implementing — these move daily — but the
*shapes* are what the code depends on and those have held.

- [ ] **Step 1: Build the fixture from real observed data**

The fixture must be **trimmed observed payload, never invented shape** —
`src/lib/edhrec/parse.test.ts` carries an explicit comment saying fabricating a
shape not seen upstream is unacceptable, and the same rule applies here. Write
`src/lib/manapool/__fixtures__/singles.json` with exactly these entries, copied
verbatim from the live feed on 2026-08-29:

```json
{
  "meta": {
    "as_of": "2026-08-29T15:32:41.270Z",
    "base_url": "https://manapool.com"
  },
  "data": [
    {
      "name": "\"Ach! Hans, Run!\"",
      "set_code": "UNH",
      "number": "116",
      "multiverse_id": "73935",
      "scryfall_id": "84f2c8f5-8e11-4639-b7de-00e4a2cbabee",
      "available_quantity": 20,
      "price_cents": 218,
      "price_cents_lp_plus": 298,
      "price_cents_nm": 515,
      "price_cents_foil": 1937,
      "price_cents_lp_plus_foil": 3958,
      "price_cents_nm_foil": null,
      "price_cents_etched": null,
      "price_cents_lp_plus_etched": null,
      "price_cents_nm_etched": null,
      "price_market": 333,
      "price_market_foil": 2500,
      "url": "https://manapool.com/card/unh/116/ach-hans-run"
    },
    {
      "name": "Adorned Pouncer",
      "set_code": "THOU",
      "number": "1",
      "multiverse_id": null,
      "scryfall_id": "71dc8556-a658-40e1-8a93-6a62af208a28",
      "available_quantity": 57,
      "price_cents": 34,
      "price_cents_lp_plus": 34,
      "price_cents_nm": 51,
      "price_cents_foil": null,
      "price_cents_lp_plus_foil": null,
      "price_cents_nm_foil": null,
      "price_cents_etched": null,
      "price_cents_lp_plus_etched": null,
      "price_cents_nm_etched": null,
      "price_market": 79,
      "price_market_foil": null,
      "url": "https://manapool.com/card/thou/1/adorned-pouncer"
    },
    {
      "name": "Adorned Pouncer // Horse",
      "set_code": "THOU",
      "number": "1-10",
      "multiverse_id": null,
      "scryfall_id": "71dc8556-a658-40e1-8a93-6a62af208a28",
      "available_quantity": 2,
      "price_cents": 55,
      "price_cents_lp_plus": 55,
      "price_cents_nm": null,
      "price_cents_foil": null,
      "price_cents_lp_plus_foil": null,
      "price_cents_nm_foil": null,
      "price_cents_etched": null,
      "price_cents_lp_plus_etched": null,
      "price_cents_nm_etched": null,
      "price_market": 35,
      "price_market_foil": null,
      "url": "https://manapool.com/card/thou/1-10/adorned-pouncer-horse"
    },
    {
      "name": "\"Brims\" Barone, Midway Mobster",
      "set_code": "UNF",
      "number": "449",
      "multiverse_id": null,
      "scryfall_id": "b24b0f07-999f-437a-af88-5d3f391afe12",
      "available_quantity": 7,
      "price_cents": null,
      "price_cents_lp_plus": null,
      "price_cents_nm": null,
      "price_cents_foil": 52,
      "price_cents_lp_plus_foil": 52,
      "price_cents_nm_foil": 71,
      "price_cents_etched": null,
      "price_cents_lp_plus_etched": null,
      "price_cents_nm_etched": null,
      "price_market": null,
      "price_market_foil": 69,
      "url": "https://manapool.com/card/unf/449/brims-barone-midway-mobster"
    }
  ]
}
```

The Adorned Pouncer pair is the real duplicate: the same `scryfall_id` listed as
the single card (34c, qty 57) and as the card-plus-token bundle (55c, qty 2).
`"Brims" Barone` is the real foil-only case: `price_cents` null while
`price_cents_foil` is 52 and `available_quantity` is 7 — proof that a null price
means "stocked in foil only", not "out of stock".

- [ ] **Step 2: Write the failing tests**

Create `src/lib/manapool/parse.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/singles.json";
import { parseManapoolPayload } from "./parse";

// The fixture is a verbatim trim of the live feed captured 2026-08-29. Trimming
// an observed payload is fine; inventing a field shape we have not seen upstream
// is not — a test that passes against a fabricated shape proves nothing.

describe("parseManapoolPayload", () => {
  it("reads as_of from the payload, not the wall clock", () => {
    const feed = parseManapoolPayload(fixture);
    expect(feed.asOf.toISOString()).toBe("2026-08-29T15:32:41.270Z");
  });

  it("collapses a repeated scryfall_id to a single row", () => {
    const feed = parseManapoolPayload(fixture);
    const ids = feed.rows.map((r) => r.scryfallId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(feed.rows).toHaveLength(3);
    expect(feed.collapsedDuplicates).toBe(1);
  });

  it("keeps the cheaper single over the pricier bundle", () => {
    const row = parseManapoolPayload(fixture).rows
      .find((r) => r.scryfallId === "71dc8556-a658-40e1-8a93-6a62af208a28")!;
    expect(row.priceCents).toBe(34);
    expect(row.availableQuantity).toBe(57);
    expect(row.buyUrl).toBe("https://manapool.com/card/thou/1/adorned-pouncer");
  });

  it("prefers a priced entry over an unpriced one regardless of order", () => {
    const feed = parseManapoolPayload({
      meta: { as_of: "2026-08-29T15:32:41.270Z" },
      data: [
        { scryfall_id: "aaa", price_cents: null, available_quantity: 99, url: "u1" },
        { scryfall_id: "aaa", price_cents: 500, available_quantity: 1, url: "u2" },
      ],
    });
    expect(feed.rows[0].priceCents).toBe(500);
  });

  it("breaks a price tie on the higher available_quantity", () => {
    const feed = parseManapoolPayload({
      meta: { as_of: "2026-08-29T15:32:41.270Z" },
      data: [
        { scryfall_id: "aaa", price_cents: 100, available_quantity: 3, url: "u1" },
        { scryfall_id: "aaa", price_cents: 100, available_quantity: 9, url: "u2" },
      ],
    });
    expect(feed.rows[0].availableQuantity).toBe(9);
    expect(feed.rows[0].buyUrl).toBe("u2");
  });

  it("keeps a foil-only row with a null price rather than dropping it", () => {
    const row = parseManapoolPayload(fixture).rows
      .find((r) => r.scryfallId === "b24b0f07-999f-437a-af88-5d3f391afe12")!;
    // Null price plus a set foil price is "stocked in foil only" — a real,
    // renderable state. Defaulting it to 0 would claim the card is free.
    expect(row.priceCents).toBeNull();
    expect(row.priceCentsFoil).toBe(52);
    expect(row.availableQuantity).toBe(7);
  });

  it("carries the payload as_of onto every row", () => {
    const feed = parseManapoolPayload(fixture);
    for (const row of feed.rows) {
      expect(row.asOf.toISOString()).toBe("2026-08-29T15:32:41.270Z");
    }
  });

  it("returns an empty feed rather than throwing on a shape it does not recognise", () => {
    const feed = parseManapoolPayload({ unexpected: true });
    expect(feed.rows).toEqual([]);
    expect(feed.collapsedDuplicates).toBe(0);
  });

  it("skips an entry missing a scryfall_id", () => {
    const feed = parseManapoolPayload({
      meta: { as_of: "2026-08-29T15:32:41.270Z" },
      data: [{ price_cents: 100, available_quantity: 1 }],
    });
    expect(feed.rows).toEqual([]);
  });

  it("skips an entry with a non-numeric available_quantity", () => {
    // The column is NOT NULL with no DEFAULT, so a row we cannot quantify has
    // no honest value to insert — dropping it is the only correct answer.
    const feed = parseManapoolPayload({
      meta: { as_of: "2026-08-29T15:32:41.270Z" },
      data: [{ scryfall_id: "aaa", price_cents: 100, available_quantity: null }],
    });
    expect(feed.rows).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/manapool/parse.test.ts`
Expected: FAIL — `Failed to resolve import "./parse"`.

- [ ] **Step 4: Write the parser**

Create `src/lib/manapool/parse.ts`:

```ts
export type PriceRow = {
  scryfallId: string;
  priceCents: number | null;
  priceCentsNm: number | null;
  priceCentsFoil: number | null;
  priceCentsEtched: number | null;
  availableQuantity: number;
  buyUrl: string | null;
  asOf: Date;
};

export type ManapoolFeed = {
  asOf: Date;
  rows: PriceRow[];
  collapsedDuplicates: number;
};

const EMPTY: ManapoolFeed = { asOf: new Date(0), rows: [], collapsedDuplicates: 0 };

// Number.isFinite, not typeof: a JSON null is typeof "object" but a JSON NaN
// would pass a typeof check while being unusable as an integer column value.
const intOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;

const strOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

/**
 * Chooses which of several entries sharing one `scryfall_id` survives.
 *
 * The feed lists the same printing under different product forms — the single
 * card and a card-plus-token bundle, for instance — so an ingest that keys on
 * `scryfall_id` must pick one. Prefer a priced entry, then the lowest price,
 * then the deepest stock. On the Adorned Pouncer pair this selects the 34c
 * single over the 55c bundle, which is the answer a "what does this cost to
 * buy" feature wants.
 */
function preferred(a: PriceRow, b: PriceRow): PriceRow {
  if (a.priceCents === null && b.priceCents !== null) return b;
  if (b.priceCents === null && a.priceCents !== null) return a;
  if (a.priceCents !== null && b.priceCents !== null) {
    if (b.priceCents < a.priceCents) return b;
    if (a.priceCents < b.priceCents) return a;
  }
  return b.availableQuantity > a.availableQuantity ? b : a;
}

/**
 * Turns ManaPool's `/api/v1/prices/singles` payload into one row per printing.
 *
 * Returns an empty feed rather than throwing on an unrecognised shape: this is
 * an undocumented public endpoint, and a nightly ingest that crashes on a
 * field rename is harder to diagnose than one that reports zero rows. The
 * contract canary (`pnpm check:manapool`) is what turns that zero into an alarm.
 */
export function parseManapoolPayload(raw: unknown): ManapoolFeed {
  if (typeof raw !== "object" || raw === null) return EMPTY;
  const payload = raw as { meta?: { as_of?: unknown }; data?: unknown };
  if (!Array.isArray(payload.data)) return EMPTY;

  const asOfRaw = payload.meta?.as_of;
  const asOf = typeof asOfRaw === "string" ? new Date(asOfRaw) : new Date(0);

  const byId = new Map<string, PriceRow>();
  let collapsedDuplicates = 0;

  for (const entry of payload.data) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const scryfallId = strOrNull(e.scryfall_id);
    if (scryfallId === null) continue;
    const availableQuantity = intOrNull(e.available_quantity);
    if (availableQuantity === null) continue;

    const row: PriceRow = {
      scryfallId,
      priceCents: intOrNull(e.price_cents),
      priceCentsNm: intOrNull(e.price_cents_nm),
      priceCentsFoil: intOrNull(e.price_cents_foil),
      priceCentsEtched: intOrNull(e.price_cents_etched),
      availableQuantity,
      buyUrl: strOrNull(e.url),
      asOf,
    };

    const existing = byId.get(scryfallId);
    if (existing === undefined) { byId.set(scryfallId, row); continue; }
    collapsedDuplicates++;
    byId.set(scryfallId, preferred(existing, row));
  }

  return { asOf, rows: [...byId.values()], collapsedDuplicates };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/manapool/parse.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 6: Write the client**

Create `src/lib/manapool/client.ts`. No caching layer: unlike EDHREC this is one
request per ingest, not one per commander.

```ts
export const MANAPOOL_SINGLES_URL = "https://manapool.com/api/v1/prices/singles";

// The response was ~50.9MB on 2026-08-29 and is served uncompressed-to-us by
// undici's default. Five minutes is generous for a single large body on a
// runner; the enclosing workflow, not this timeout, is the real backstop.
const TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Downloads ManaPool's full singles price feed.
 *
 * Returns the raw payload; `parseManapoolPayload` owns every shape assumption,
 * so a field rename upstream is one file's problem rather than two.
 */
export async function fetchManapoolSingles(): Promise<unknown> {
  const res = await fetch(MANAPOOL_SINGLES_URL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`ManaPool responded ${res.status} ${res.statusText}`);
  }
  return res.json();
}
```

- [ ] **Step 7: Gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add src/lib/manapool/parse.ts src/lib/manapool/parse.test.ts \
        src/lib/manapool/client.ts src/lib/manapool/__fixtures__/singles.json
git commit -m "feat(manapool): parse the singles feed, collapsing duplicate scryfall ids"
```

---
## Task 9: Component C — the `printing_prices` table

**Files:**
- Modify: `src/db/schema.ts` (append after the `skippedPrintings` block, ~line 72)
- Create: `drizzle/0012_*.sql` (generated — Task 5 produced `0011`)

**Interfaces:**
- Consumes: `printings` (existing table, `src/db/schema.ts:42`).
- Produces: `printingPrices` Drizzle table.

**Why a separate table and not columns on `printings`:** the catalog refresh
upserts `printings` wholesale every month. Putting volatile price data there
invites a catalog run clobbering prices, or forces the two ingests to
lock-step — exactly the coupling the comment at `src/db/schema.ts:44-45` says
the design avoids.

- [ ] **Step 1: Add the table**

Every import this needs (`integer`, `text`, `timestamp`, `uuid`, `pgTable`) is
already on `src/db/schema.ts:3`. Append after the `skippedPrintings` block:

```ts
/**
 * ManaPool's price for each printing. Refreshed weekly by its own workflow —
 * price is the one field that genuinely moves, and tying it to the monthly
 * catalog cadence would make the number wrong more often than right.
 *
 * A printing absent from this table is not currently stocked at ManaPool; the
 * feed omits out-of-stock cards rather than listing them at zero. A row with a
 * null `price_cents` but a set `price_cents_foil` is stocked in foil only.
 * Both are honest states to render — neither is "free" or "unknown".
 */
export const printingPrices = pgTable("printing_prices", {
  scryfallId: uuid("scryfall_id").primaryKey()
    .references(() => printings.scryfallId, { onDelete: "cascade" }),
  // Cheapest non-foil listing. Null means the only stock is foil or etched —
  // 13,738 of 102,587 feed rows on 2026-08-29. Never defaulted to 0: a zero
  // would render a real price of nothing.
  priceCents: integer("price_cents"),
  priceCentsNm: integer("price_cents_nm"),
  priceCentsFoil: integer("price_cents_foil"),
  priceCentsEtched: integer("price_cents_etched"),
  // NOT NULL with no DEFAULT. The feed sets this on every row and never sends
  // null or zero, so a default could only ever fire for a row the feed did not
  // describe — and would be indistinguishable from real out-of-stock data.
  availableQuantity: integer("available_quantity").notNull(),
  buyUrl: text("buy_url"),
  // From the payload's meta.as_of, not ingest wall-clock. Recording when
  // ManaPool computed the price is what makes a staleness claim truthful.
  asOf: timestamp("as_of").notNull(),
});
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm db:generate`
Expected: a new `drizzle/0012_<name>.sql`. Never hand-write it.

- [ ] **Step 3: Verify the generated SQL**

Run: `cat drizzle/0012_*.sql`

Expected — check all four by eye:
- `"available_quantity" integer NOT NULL` with **no** `DEFAULT`
- `"as_of" timestamp NOT NULL`
- an `ON DELETE cascade` foreign key to `printings`
- the four price columns nullable

If `available_quantity` came out with a default, the schema has `.default(...)`
on it — remove that, delete the generated file, and regenerate.

- [ ] **Step 4: Gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add src/db/schema.ts drizzle/
git commit -m "feat(db): add printing_prices for the ManaPool feed"
```

---

## Task 10: Component C — the price ingest, its canary, and its workflow

**Files:**
- Create: `src/lib/manapool/seed-prices.ts`
- Create: `src/lib/manapool/seed-prices.test.ts`
- Create: `scripts/seed-prices.ts`
- Create: `scripts/check-manapool-contract.ts`
- Create: `.github/workflows/price-refresh.yml`
- Modify: `.github/workflows/scryfall-contract.yml` (add a ManaPool step)
- Modify: `package.json` (`db:seed:prices`, `check:manapool`)
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `parseManapoolPayload`, `fetchManapoolSingles` (Task 8);
  `printingPrices` (Task 9); `printings` (existing).
- Produces: `seedPrices(): Promise<SeedPricesResult>`.

- [ ] **Step 1: Write the ingest**

Create `src/lib/manapool/seed-prices.ts`. This follows
`src/lib/scryfall/seed-printings.ts` closely: same `BATCH_SIZE`, same
`onConflictDoUpdate` with `excluded.*` refs, same pre-loaded known-id set for
orphan filtering, same loud counts.

```ts
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { printingPrices, printings } from "../../db/schema";
import { fetchManapoolSingles } from "./client";
import { parseManapoolPayload, type PriceRow } from "./parse";

const BATCH_SIZE = 500;

export type SeedPricesResult = {
  upserted: number;
  skippedOrphan: number;
  collapsedDuplicates: number;
  asOf: Date;
};

/**
 * Splits feed rows into those whose printing we know and those we do not.
 *
 * Exported and pure so the orphan rule spec §8 asks about is unit-testable —
 * `seedPrices` itself needs a database and a network and so is not.
 */
export function filterKnownPrintings(
  rows: PriceRow[],
  known: Set<string>,
): { rows: PriceRow[]; skippedOrphan: number } {
  const kept: PriceRow[] = [];
  let skippedOrphan = 0;
  for (const row of rows) {
    if (!known.has(row.scryfallId)) { skippedOrphan++; continue; }
    kept.push(row);
  }
  return { rows: kept, skippedOrphan };
}

/**
 * Refreshes `printing_prices` from ManaPool's singles feed.
 *
 * Upserts rather than replacing wholesale: a truncate-then-reload leaves the
 * table empty for the length of the load, and rows for printings that vanish
 * from the feed are more useful left in place with a now-stale `as_of` than
 * deleted outright.
 */
export async function seedPrices(): Promise<SeedPricesResult> {
  const feed = parseManapoolPayload(await fetchManapoolSingles());
  if (feed.rows.length === 0) {
    throw new Error("ManaPool returned no usable rows — the feed's shape may have moved");
  }

  // printing_prices.scryfall_id has an FK to printings.scryfall_id and the two
  // ingests are not lock-stepped, so filter orphans in memory rather than
  // failing a batch. Same pattern and same reasoning as seed-printings.ts.
  const known = new Set(
    (await db.select({ scryfallId: printings.scryfallId }).from(printings))
      .map((p) => p.scryfallId),
  );
  if (known.size === 0) {
    throw new Error("printings table is empty — run `pnpm db:seed:printings` first");
  }

  const { rows, skippedOrphan } = filterKnownPrintings(feed.rows, known);

  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await db.insert(printingPrices).values(rows.slice(i, i + BATCH_SIZE))
      .onConflictDoUpdate({
        target: printingPrices.scryfallId,
        set: {
          priceCents: sql`excluded.price_cents`,
          priceCentsNm: sql`excluded.price_cents_nm`,
          priceCentsFoil: sql`excluded.price_cents_foil`,
          priceCentsEtched: sql`excluded.price_cents_etched`,
          availableQuantity: sql`excluded.available_quantity`,
          buyUrl: sql`excluded.buy_url`,
          asOf: sql`excluded.as_of`,
        },
      });
    upserted += Math.min(BATCH_SIZE, rows.length - i);
  }

  return {
    upserted, skippedOrphan,
    collapsedDuplicates: feed.collapsedDuplicates,
    asOf: feed.asOf,
  };
}
```

- [ ] **Step 2: Test the orphan filter**

Create `src/lib/manapool/seed-prices.test.ts`:

```ts
import { expect, it } from "vitest";
import { filterKnownPrintings } from "./seed-prices";

const row = (scryfallId: string) => ({
  scryfallId, priceCents: 100, priceCentsNm: null,
  priceCentsFoil: null, priceCentsEtched: null,
  availableQuantity: 1, buyUrl: null, asOf: new Date(0),
});

it("drops rows whose printing we do not have and counts them", () => {
  // printing_prices.scryfall_id has an FK to printings. The two ingests are not
  // lock-stepped, so ManaPool routinely lists a printing from a set our catalog
  // has not pulled yet. Filtering in memory keeps one unknown id from failing a
  // whole 500-row batch — the same rule seed-printings.ts applies to oracle ids.
  const { rows, skippedOrphan } = filterKnownPrintings(
    [row("a"), row("b"), row("c")],
    new Set(["a", "c"]),
  );
  expect(rows.map((r) => r.scryfallId)).toEqual(["a", "c"]);
  expect(skippedOrphan).toBe(1);
});

it("keeps everything when every id is known", () => {
  const { rows, skippedOrphan } = filterKnownPrintings([row("a")], new Set(["a"]));
  expect(rows).toHaveLength(1);
  expect(skippedOrphan).toBe(0);
});
```

Run: `pnpm vitest run src/lib/manapool/seed-prices.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 3: Write the wrapper script**

Create `scripts/seed-prices.ts`:

```ts
import "dotenv/config";
import { seedPrices } from "../src/lib/manapool/seed-prices";

seedPrices()
  .then((r) => {
    console.log(
      `Priced ${r.upserted} printings as of ${r.asOf.toISOString()}; ` +
      `collapsed ${r.collapsedDuplicates} duplicate ids, skipped ${r.skippedOrphan} orphan.`,
    );
    process.exit(0);
  })
  .catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 4: Write the contract canary**

Create `scripts/check-manapool-contract.ts`, mirroring
`scripts/check-scryfall-contract.ts` — read that file first and match its shape.
This touches no database.

```ts
import { fetchManapoolSingles } from "../src/lib/manapool/client";
import { parseManapoolPayload } from "../src/lib/manapool/parse";

// ManaPool is an undocumented public endpoint and the ingest runs weekly, so a
// silent shape change would sit unnoticed for days. Same reasoning as
// check-scryfall-contract.ts, which this mirrors.
const REQUIRED = ["scryfall_id", "available_quantity", "price_cents", "url"] as const;

async function main() {
  const raw = await fetchManapoolSingles();
  const payload = raw as { meta?: { as_of?: unknown }; data?: unknown[] };

  const problems: string[] = [];
  if (typeof payload?.meta?.as_of !== "string") problems.push("meta.as_of is not a string");
  if (!Array.isArray(payload?.data)) {
    problems.push("data is not an array");
  } else {
    const first = payload.data[0] as Record<string, unknown> | undefined;
    if (first === undefined) {
      problems.push("data is empty");
    } else {
      // `in`, not truthiness: price_cents is legitimately null on 13% of rows,
      // so a truthy check would fire on healthy data.
      for (const key of REQUIRED) {
        if (!(key in first)) problems.push(`first entry is missing ${key}`);
      }
    }
  }

  // The parser is the real contract: a feed we can fetch but not parse is
  // just as broken as one we cannot fetch.
  const feed = parseManapoolPayload(raw);
  if (feed.rows.length === 0) problems.push("parser produced zero rows");

  if (problems.length > 0) {
    console.error("ManaPool contract check FAILED:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(
    `ManaPool contract OK — ${feed.rows.length} rows as of ${feed.asOf.toISOString()} ` +
    `(${feed.collapsedDuplicates} duplicate ids collapsed).`,
  );
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 5: Add the package scripts**

In `package.json`, alongside the existing seed and check scripts:

```json
    "db:seed:prices": "tsx scripts/seed-prices.ts",
    "check:manapool": "tsx scripts/check-manapool-contract.ts"
```

- [ ] **Step 6: Run the canary against the live feed**

Run: `pnpm check:manapool`
Expected: `ManaPool contract OK — ~99,700 rows as of <today> (~1,087 duplicate ids collapsed).`

This is the one live check in the task. If it fails, the feed moved since
2026-08-29 and the parser needs updating before anything else proceeds.

- [ ] **Step 7: Write the refresh workflow**

Create `.github/workflows/price-refresh.yml`:

```yaml
name: Price refresh

# Weekly, not monthly: price is the one catalog field that genuinely moves, and
# a monthly cadence would make the number wrong more often than right. The body
# is ~51MB, which is past a Vercel function's practical reach, so this runs on a
# runner like the other ingests.
on:
  schedule:
    # 09:00 UTC every Monday.
    - cron: '0 9 * * 1'
  workflow_dispatch:
    inputs:
      target:
        description: Which database to price
        type: choice
        options: [staging, production]
        default: staging

concurrency:
  group: price-refresh-${{ github.event.inputs.target || 'production' }}
  cancel-in-progress: false

permissions:
  contents: read

jobs:
  refresh:
    # Set the PRICE_REFRESH_ENABLED repository variable to 'true' or the
    # schedule never fires; a manual dispatch always runs.
    if: vars.PRICE_REFRESH_ENABLED == 'true' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    timeout-minutes: 60
    environment: catalog-${{ github.event.inputs.target || 'production' }}
    defaults:
      run:
        shell: bash
    env:
      DATABASE_URL: ${{ secrets.CATALOG_DATABASE_URL }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Refresh prices
        run: |
          {
            echo "## Price refresh"
            echo ""
            echo "- Target: \`catalog-${{ github.event.inputs.target || 'production' }}\`"
            echo ""
          } >> "$GITHUB_STEP_SUMMARY"
          pnpm --silent db:seed:prices | tee -a "$GITHUB_STEP_SUMMARY"
```

It reuses the `catalog-*` environments rather than adding a `price-*` pair:
it writes to the same database with the same `CATALOG_DATABASE_URL` secret, and
a second environment holding an identical secret is a second thing to keep in
sync for no benefit.

- [ ] **Step 8: Extend the contract-check workflow**

Read `.github/workflows/scryfall-contract.yml` first. Add a step after the
existing Scryfall check, and make it `if: always()` so a Scryfall failure does
not hide a simultaneous ManaPool failure:

```yaml
      - name: Check the ManaPool contract
        if: always()
        run: pnpm check:manapool
```

If the workflow's `name:` or job name says "Scryfall" specifically, widen it to
cover both — e.g. `name: Upstream contract checks` — and update the `AGENTS.md`
reference to match.

- [ ] **Step 9: Document both workflows**

In `AGENTS.md`, under `## Workflow`, extend the `pnpm check:scryfall` bullet
area:

```markdown
- `pnpm check:manapool` validates ManaPool's price-feed contract (payload shape plus a real
  parse) without touching a database, and runs daily alongside the Scryfall check. ManaPool is
  an undocumented public endpoint and the ingest is weekly, so a silent shape change would
  otherwise sit unnoticed for days.
- `pnpm db:seed:prices` refreshes `printing_prices` from ManaPool. The `Price refresh` workflow
  runs it every Monday; it needs the `PRICE_REFRESH_ENABLED` repository variable set to `'true'`.
```

- [ ] **Step 10: Validate the workflows parse**

```bash
python3 - <<'PY'
import yaml
for f in [".github/workflows/price-refresh.yml", ".github/workflows/scryfall-contract.yml"]:
    yaml.safe_load(open(f)); print("OK", f)
PY
```
Expected: `OK` twice.

- [ ] **Step 11: Gate and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add src/lib/manapool/seed-prices.ts src/lib/manapool/seed-prices.test.ts scripts/seed-prices.ts \
        scripts/check-manapool-contract.ts .github/workflows/price-refresh.yml \
        .github/workflows/scryfall-contract.yml package.json AGENTS.md
git commit -m "feat(manapool): ingest prices weekly and guard the feed contract"
```

- [ ] **Step 12: Final push — still no PR**

```bash
pnpm typecheck && pnpm lint && pnpm test
DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build
git fetch origin && git rebase origin/main
git push
```

**Do not run `gh pr create`.** The spec, this plan, and the code ship as one
bundled PR opened deliberately after review — see the Global Constraints.

---

## Blocking item before Component C ships

**Skim ManaPool's terms of use.** The endpoint is public, unauthenticated, and
not documented as restricted, but this was never confirmed. It blocks Tasks 8–10
only; Components A, B, D and E (Tasks 1–7) have no dependency on it. If the
terms forbid bulk automated access, Tasks 8–10 are dropped and the ManaPool
schema and workflows come out with them — nothing in the other components reads
`printing_prices`.

---

## What this foundation deliberately does not build

No UI, no server actions, no route changes. Every one of #213, #214, #215 and
#218 ships a surface, and surfaces are gated on a design handoff that does not
exist yet. What lands here is the layer underneath: a widened EDHREC parser, a
precomputed commander index, a price table, an engine classifier, and a mana
helper — each independently testable, none of them reachable from a page.

The one deliberate change to existing behaviour is `score.ts` gaining exported
helpers (`frontFaceTypeLine`, `frontFaceOracle`, `fitsIdentity`). The
owned-commander recommendation path must produce identical output before and
after; Task 1's final step is the regression check that proves it.
