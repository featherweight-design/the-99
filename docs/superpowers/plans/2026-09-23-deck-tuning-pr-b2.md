# Deck tuning — PR B2 — the decision core

> Part of the deck tuning plan. **Read the index first:** [`2026-09-07-deck-tuning-suggestions.md`](2026-09-07-deck-tuning-suggestions.md) — the Global Constraints, File Structure, PR boundaries and Cost there apply to every task below. Task numbers are shared across all six files.

> **Amended 2026-09-23, during the build**, each to follow a rule the handoff already states:
> 1. **`cut` is required.** `suggestionRules.onePair`: every suggestion is exactly one cut and one
>    add, and the deck count never changes. The schema, `ValidatedSuggestion` and `TuningItem` all
>    carry a non-null cut; the column stays nullable, since nothing is lost by it.
> 2. **The prompt never renders ownership.** `suggestionRules.ownershipNotRanking`: ownership and
>    price may not affect which cards are suggested or their order, and a model cannot be swayed
>    by a fact it was never shown. The pack still carries `owned`, for the card.
> 3. **The gate's messages are static, from strings the handoff already writes**:
>    `announce.started` while a run is in flight, `announce.unchanged` on unchanged inputs. A time
>    belongs to the panel, in the reader's own clock, so `gateReason` takes no `now`.
>    `allowance.spent` is an eng-written placeholder until the placement addendum draws the state.
> 4. **`Drop` names its rule.** Each drop carries the `suggestionRules` key it broke, or one of
>    three structural checks no instruction covers (`cardExists`, `addNotLegal`, `duplicate`), so
>    a run's `dropped_count` can be explained rather than only counted.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

### Task 8: Prompt and response schema

**Files:**
- Create: `src/lib/tuning/prompt.ts`, `src/lib/tuning/response-schema.ts`
- Test: `src/lib/tuning/prompt.test.ts`, `src/lib/tuning/response-schema.test.ts`

**Interfaces:**
- Consumes: `EvidencePack` from Task 7; `MAX_SUGGESTIONS` from `limits.ts` (Task 5a, shipped in PR B1).

**PR B2.**
- Produces:
  ```typescript
  export function buildPrompt(pack: EvidencePack): { system: string; user: string };
  export const tuningResponseSchema: z.ZodType<TuningResponse>;
  export type TuningResponse = {
    suggestions: {
      add: string;              // card name, resolved to an oracle id in Task 9
      cut: string | null;
      rationale: string;
      rationaleShort: string;
      evidence: { kind: "games" | "note" | "decklist" | "intent"; value: string }[];
    }[];
  };
  ```

- [ ] **Step 1: Write the failing schema test**

```typescript
// src/lib/tuning/response-schema.test.ts
import { describe, expect, it } from "vitest";
import { tuningResponseSchema } from "./response-schema";

const ok = {
  suggestions: [{
    add: "Cultivate", cut: "Wastes",
    rationale: "Mana was marked as hurting in 3 of 5 games.",
    rationaleShort: "Mana hurt in 3 of 5",
    evidence: [{ kind: "games", value: "Mana — 3 of 5 games" }],
  }],
};

describe("tuningResponseSchema", () => {
  it("accepts a well-formed reply", () => {
    expect(tuningResponseSchema.safeParse(ok).success).toBe(true);
  });

  it("accepts an empty suggestion list", () => {
    expect(tuningResponseSchema.safeParse({ suggestions: [] }).success).toBe(true);
  });

  it("rejects more than three suggestions", () => {
    const four = { suggestions: Array(4).fill(ok.suggestions[0]) };
    expect(tuningResponseSchema.safeParse(four).success).toBe(false);
  });

  it("rejects a suggestion with no evidence", () => {
    const bare = { suggestions: [{ ...ok.suggestions[0], evidence: [] }] };
    expect(tuningResponseSchema.safeParse(bare).success).toBe(false);
  });

  it("requires the short rationale and caps it", () => {
    const long = { suggestions: [{ ...ok.suggestions[0], rationaleShort: "x".repeat(200) }] };
    expect(tuningResponseSchema.safeParse(long).success).toBe(false);
  });
});
```

The empty list passing is deliberate: zero suggestions is a legitimate answer that becomes the `ungrounded` outcome downstream, not a schema failure.

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm test src/lib/tuning/response-schema.test.ts
```

Expected: FAIL — cannot resolve `./response-schema`.

- [ ] **Step 3: Write the schema**

```typescript
// src/lib/tuning/response-schema.ts
import { z } from "zod";
import { MAX_SUGGESTIONS } from "./limits";

const citation = z.object({
  kind: z.enum(["games", "note", "decklist", "intent"]),
  value: z.string().min(1).max(120),
});

export const tuningResponseSchema = z.object({
  suggestions: z.array(z.object({
    add: z.string().min(1).max(200),
    cut: z.string().min(1).max(200).nullable(),
    rationale: z.string().min(1).max(400),
    rationaleShort: z.string().min(1).max(80),
    evidence: z.array(citation).min(1).max(4),
  })).max(MAX_SUGGESTIONS),
});
```

- [ ] **Step 4: Write the failing prompt test**

```typescript
// src/lib/tuning/prompt.test.ts
it("hands the model the rules it must obey", () => {
  const { system } = buildPrompt(pack);
  for (const rule of Object.values(deckTuningCopy.suggestionRules)) {
    expect(system).toContain(rule);
  }
});

it("never puts a percentage or a net figure in the evidence it sends", () => {
  const { user } = buildPrompt(pack);
  expect(user).not.toMatch(/%/);
  expect(user).not.toMatch(/\bnet\b/i);
});

it("names the deck intent when there is one and says so when there is not", () => {
  expect(buildPrompt({ ...pack, intent: "go wide" }).user).toContain("go wide");
  expect(buildPrompt({ ...pack, intent: null }).user).toContain("no stated intent");
});

it("says there is no play evidence when there are no games, rather than rendering an empty summary", () => {
  const { user } = buildPrompt({ ...pack, play: buildPlayGroup([]) });
  expect(user).toContain("no games logged");
  expect(user).not.toMatch(/0 of 0/);
});
```

- [ ] **Step 5: Write the prompt**

The system message carries the nine `suggestionRules` verbatim from the copy module — they are the model's instructions and the validator's checklist, and they must be one text so the two cannot drift. The user message renders the pack: the commanders and colour identity, the decklist grouped by role with the commanders marked as uncuttable, the role and land targets with their advisory flags (and the skeleton's thin-sample caveat when `targets.thin`), the game summary with denominators intact and each game's note quoted — or, at zero games, one sentence saying none are logged and that suggestions must rest on the list alone — the intent, and the staples not in the deck with their `commanders of commanderTotal` breadth. Ask for at most `MAX_SUGGESTIONS`, and say plainly that fewer is better than padding.

- [ ] **Step 6: Run both tests and commit**

```bash
pnpm test src/lib/tuning/prompt.test.ts src/lib/tuning/response-schema.test.ts
git add src/lib/tuning/prompt.ts src/lib/tuning/prompt.test.ts src/lib/tuning/response-schema.ts src/lib/tuning/response-schema.test.ts
git commit -m "feat(tuning): schema-constrained prompt and response contract"
```

---

### Task 9: The six validation rules

**PR B2.**

**Files:**
- Create: `src/lib/tuning/presentation.ts`, `src/lib/tuning/validate.ts`
- Test: `src/lib/tuning/presentation.test.ts`, `src/lib/tuning/validate.test.ts`

**Interfaces:**
- Consumes: `EvidencePack` (Task 7), `TuningResponse` (Task 8).
- Produces:
  ```typescript
  /** `notes` are the pack's game notes: the verbatim-quote check needs something to compare against. */
  export function presentationFailures(text: string, notes: readonly string[]): string[];
  export type ValidatedSuggestion = {
    addOracleId: string; cutOracleId: string | null;
    rationale: string; rationaleShort: string;
    evidence: TuningCitation[]; position: number;
    /** Set by Task 9b after validation; null when the swap moves no bracket. */
    bracketAfter: Bracket[] | null;
  };
  export function validateSuggestions(args: {
    response: TuningResponse;
    pack: EvidencePack;
    // The shape validateCardForDeck takes (CardForValidation, add-validation.ts), so
    // "the add is legal" is that one rule: commander-legal first, then identity.
    resolveName: (name: string) => { oracleId: string; colorIdentity: string[]; commanderLegal: boolean } | null;
  }): { kept: ValidatedSuggestion[]; droppedCount: number };
  ```

`resolveName` is injected rather than queried, which is what keeps this module pure and client-safe. Task 11 passes it a closure over a real `cards.name` lookup.

- [ ] **Step 1: Write the failing presentation test**

```typescript
// src/lib/tuning/presentation.test.ts
import { describe, expect, it } from "vitest";
import { presentationFailures } from "./presentation";

const notes = ["flooded out on turn six"];

describe("presentationFailures", () => {
  it("passes a line that carries its denominator", () => {
    expect(presentationFailures("Mana hurt in 3 of 5 games.", notes)).toEqual([]);
  });

  it("catches a percentage", () => {
    expect(presentationFailures("Mana hurt in 60% of games.", notes)).not.toEqual([]);
  });

  it("catches a bare count with no denominator", () => {
    expect(presentationFailures("Mana hurt in 3 games.", notes)).not.toEqual([]);
  });

  it("catches a net figure", () => {
    expect(presentationFailures("Mana is net -2 across the log.", notes)).not.toEqual([]);
  });

  it("catches a win rate", () => {
    expect(presentationFailures("Your win rate is low.", notes)).not.toEqual([]);
  });

  it("passes a note quoted verbatim and catches one that is not", () => {
    expect(presentationFailures('You wrote "flooded out on turn six".', notes)).toEqual([]);
    expect(presentationFailures('You wrote "flooded on turn six".', notes)).not.toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm test src/lib/tuning/presentation.test.ts
```

Expected: FAIL — cannot resolve `./presentation`.

- [ ] **Step 3: Implement the nine checks**

One function returning the names of the rules a string breaks. The nine, matching `deckTuningCopy.suggestionRules` one-to-one: no percentage; no net figure; every count carries a denominator; every claim cites; a quoted note is quoted verbatim; the add is inside the colour identity; the cut is in the deck; one cut per add; ownership is a fact about the collection and never a ranking. The first five are text checks and live here — the verbatim one against the `notes` passed in, so a quotation matching no logged note is a failure; the last four are structural and live in `validate.ts`, but all nine are named by the same copy keys so the model's instructions and the validator agree.

The denominator check is the subtle one: a numeral followed by a countable noun (`games`, `cards`) with no ` of ` between it and a second numeral is a failure. `3 of 5 games` passes; `3 games` does not; `4 lands` in a decklist claim does not need a denominator and is exempted by requiring the noun to be one of the counted nouns.

- [ ] **Step 4: Write the failing validate test**

```typescript
// src/lib/tuning/validate.test.ts
it("drops a card that is not in the catalog and counts the drop", () => {
  const out = validateSuggestions({ response: withAdd("Nonesuch"), pack, resolveName: () => null });
  expect(out.kept).toHaveLength(0);
  expect(out.droppedCount).toBe(1);
});

it("drops a cut that is not in the deck", () => {
  const out = validateSuggestions({ response: withCut("Not In Deck"), pack, resolveName: resolve });
  expect(out.kept).toHaveLength(0);
  expect(out.droppedCount).toBe(1);
});

it("drops a cut that names a commander", () => {
  // The profile's commanders-are-cards converse: they are in the list and can never leave it.
  const out = validateSuggestions({ response: withCut(commanderName), pack, resolveName: resolve });
  expect(out.kept).toHaveLength(0);
  expect(out.droppedCount).toBe(1);
});

it("drops a citation of games when the pack has none", () => {
  const out = validateSuggestions({
    response: withCitation("Mana — 2 of 3 games"), pack: { ...pack, play: buildPlayGroup([]) }, resolveName: resolve,
  });
  expect(out.kept).toHaveLength(0);
});

it("drops an add outside the commander's colour identity", () => {
  const out = validateSuggestions({
    response: withAdd("Lightning Bolt"), pack: { ...pack, colorIdentity: ["G"] },
    resolveName: () => ({ oracleId: "bolt", colorIdentity: ["R"], commanderLegal: true }),
  });
  expect(out.kept).toHaveLength(0);
  expect(out.droppedCount).toBe(1);
});

it("drops a suggestion whose cited game does not exist in the pack", () => {
  const out = validateSuggestions({ response: withCitation("Mana — 9 of 5 games"), pack, resolveName: resolve });
  expect(out.kept).toHaveLength(0);
});

it("drops a suggestion that breaks a presentation rule", () => {
  const out = validateSuggestions({ response: withRationale("Mana hurt in 60% of games."), pack, resolveName: resolve });
  expect(out.kept).toHaveLength(0);
  expect(out.droppedCount).toBe(1);
});

it("renumbers position over the survivors so the card list has no holes", () => {
  const out = validateSuggestions({ response: threeWhereTheMiddleIsBad, pack, resolveName: resolve });
  expect(out.kept.map((s) => s.position)).toEqual([0, 1]);
  expect(out.droppedCount).toBe(1);
});
```

- [ ] **Step 5: Implement**

Run each suggestion through the six rules in order and keep only those that survive all of them. `droppedCount` is the number that did not. Renumber `position` across the survivors — a hole in the sequence would be a rendering bug waiting to happen.

Colour identity uses the same rule the add path already enforces (`validateCardForDeck` at `src/lib/decks/add-validation.ts:46`); do not write a second, subtly different subset test — extract or reuse.

- [ ] **Step 6: Run both suites and commit**

```bash
pnpm test src/lib/tuning
git add src/lib/tuning/presentation.ts src/lib/tuning/presentation.test.ts src/lib/tuning/validate.ts src/lib/tuning/validate.test.ts
git commit -m "feat(tuning): six validation rules, every drop counted"
```

---

### Task 9b: The bracket flag

**PR B2** (the pure function) **and PR C** (its reads, inside `runTuning`).

**Ruling (Hugh, 2026-09-23):** a suggestion that would move the deck's bracket is **shown, flagged** — not dropped, not silent. The model is not asked and not trusted: the app computes the flag with the same `slotDeck` (`src/lib/bracket/slot.ts:30`) the Analysis tab's verdict uses, so the flag and the verdict can never disagree about what a deck is.

**Files:**
- Create: `src/lib/tuning/bracket-shift.ts`
- Test: `src/lib/tuning/bracket-shift.test.ts`

**Interfaces:**
- Consumes: `DeckProfile`, `slotDeck(profile, declared)` and its `permits`.
- Produces:
  ```typescript
  /** Flags the ADD brings, read the way the profile loader reads them. */
  export type AddFacts = { oracleId: string; name: string; gameChanger: boolean; massLandDenial: boolean; extraTurn: boolean };
  /**
   * The deck's permits with the swap applied, or null when they equal the permits without it.
   * `combosAfter` is the assembled two-card combos for the post-swap card set, read by the
   * caller through `loadAssembledCombos` — a combo completed by the add, or broken by the cut,
   * is the case a per-card flag cannot see.
   */
  export function bracketAfter(args: {
    profile: DeckProfile;
    declared: Bracket | null;
    add: AddFacts;
    cutOracleId: string | null;
    combosAfter: ComboRef[];
  }): Bracket[] | null;
  ```

**How it computes.** It builds the post-swap `brackets` group — the add joins `gameChangers` / `massLandDenial` / `extraTurns` per its facts, the cut leaves every list it is on, `twoCardCombos` is `combosAfter` — and calls `slotDeck` on a profile carrying that group, then compares `permits` with `slotDeck(profile, declared).permits`. It never uses `bracketDelta`, whose `[3] → [4]` transition is unreachable; a direct comparison of two verdicts has no such gap. Everything else on the profile is left as it is: the flag is about the bracket rules, and those read only this group.

- [ ] **Step 1: Write the failing test**

```typescript
it("flags an add that is a Game Changer", () => {
  const out = bracketAfter({ profile: cleanB2, declared: 2, add: { ...plain, gameChanger: true }, cutOracleId: null, combosAfter: [] });
  expect(out).not.toBeNull();
  expect(out).not.toEqual(slotDeck(cleanB2, 2).permits);
});

it("flags a swap that completes a two-card combo, through combosAfter", () => {
  expect(bracketAfter({ profile: cleanB2, declared: 2, add: plain, cutOracleId: null, combosAfter: [aCombo] })).not.toBeNull();
});

it("is null for a swap that moves nothing", () => {
  expect(bracketAfter({ profile: cleanB2, declared: 2, add: plain, cutOracleId: someCard, combosAfter: [] })).toBeNull();
});

it("clears a flag the cut takes away", () => {
  // Cutting the deck's only Game Changer for a plain card LOWERS the permits: still a move, still flagged.
  expect(bracketAfter({ profile: oneGcB3, declared: 3, add: plain, cutOracleId: theGc, combosAfter: [] })).not.toBeNull();
});
```

- [ ] **Step 2: Run it, implement, run it again, commit**

```bash
pnpm test src/lib/tuning/bracket-shift.test.ts
git add src/lib/tuning/bracket-shift.ts src/lib/tuning/bracket-shift.test.ts
git commit -m "feat(tuning): flag a suggestion that moves the deck's bracket, through slotDeck"
```

---

### Task 11: The durability contract

**Split.** Steps 1–2 (`reaper.ts`, pure) ship in **PR B2**. Steps 3–6 ship in **PR C**.

**Files:**
- Modify: `src/app/decks/tuning-actions.ts` (adds `runTuning` and `cancelTuningRun`)
- Create: `src/lib/tuning/reaper.ts`, `src/lib/tuning/run-store.ts`, `scripts/probe-tuning-run.mts` (+ `probe:tuning-run` in `package.json`)
- Test: `src/lib/tuning/reaper.test.ts` (PR B2); `pnpm probe:tuning-run` (PR C)

**Interfaces:**
- Consumes: everything from Tasks 6–10.
- Produces:
  ```typescript
  export function runTuning(deckId: string): Promise<DeckMutationResult>;
  export function cancelTuningRun(deckId: string, runId: string): Promise<DeckMutationResult>;
  export function reapCutoff(now: Date): Date;
  ```

This is the task the spec's §6 exists for. Read §6 before starting it.

- [ ] **Step 1: Write the failing reaper test**

```typescript
// src/lib/tuning/reaper.test.ts
import { describe, expect, it } from "vitest";
import { reapCutoff } from "./reaper";
import { REAPER_CUTOFF_MS } from "./limits";

it("cuts off exactly one window back", () => {
  const now = new Date("2026-09-07T12:00:00Z");
  expect(reapCutoff(now).getTime()).toBe(now.getTime() - REAPER_CUTOFF_MS);
});
```

- [ ] **Step 2: Run it, implement `reapCutoff`, run it again**

```typescript
// src/lib/tuning/reaper.ts
import { REAPER_CUTOFF_MS } from "./limits";

/**
 * A pending run older than this was abandoned — the process that owned it is
 * gone. The reaper fails it as 'interrupted' so the deck can run again; the
 * abandoned process, if it somehow returns, finds zero rows under its own
 * `where status = 'pending'` guard and discards its result.
 */
export function reapCutoff(now: Date): Date {
  return new Date(now.getTime() - REAPER_CUTOFF_MS);
}
```

- [ ] **Commit the reaper** (PR B2)

```bash
pnpm test src/lib/tuning/reaper.test.ts
git add src/lib/tuning/reaper.ts src/lib/tuning/reaper.test.ts
git commit -m "feat(tuning): the reaper's cutoff"
```

---

### Task 12: The read, the gate, and the allowance

**Split.** Steps 1–2 (`state.ts` and `gate.ts`, pure) ship in **PR B2**; steps 3–5 (`tuning-read.ts`, `readTuningPanel`) in **PR C**. The page wiring is PR D's.

**Files:**
- Create: `src/lib/tuning/state.ts`, `src/lib/tuning/gate.ts`, `src/lib/decks/tuning-read.ts`
- Modify: `src/app/decks/tuning-actions.ts` (adds `readTuningPanel`)
- Test: `src/lib/tuning/gate.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 6, 7, 10, 11.
- Produces:
  ```typescript
  // src/lib/tuning/gate.ts — pure, client-safe
  export type GateReason = {
    kind: "in_flight" | "allowance" | "unchanged";
    /** Rendered beside the disabled button, and returned by runTuning's refusal. */
    message: string;
  };
  export function gateReason(state: TuningState): GateReason | null;

  // src/lib/tuning/state.ts — pure types, PR B2, so gate.ts compiles without PR C.
  // tuning-read.ts (PR C) imports them and fills them.
  export type TuningItem = {
    id: string;
    addOracleId: string; addName: string; addTypeLine: string;
    cutOracleId: string | null; cutName: string | null;
    rationale: string; rationaleShort: string;
    evidence: TuningCitation[];
    position: number;
    verdict: "pending" | "accepted" | "dismissed";
    /** Facts about the collection, never a ranking. */
    owned: boolean; ownedQuantity: number;
    /** Cents, formatted by the card through formatCents. Null when unpriced. */
    priceCents: number | null;
    /** The bracket flag (Task 9b): the deck's permits with this swap, or null. */
    bracketAfter: Bracket[] | null;
  };
  export type TuningState = {
    run: { id: string; status: string; errorClass: string | null; createdAt: Date; droppedCount: number } | null;
    items: TuningItem[];
    /** The newest ok run's fingerprint, or null if there has never been one. */
    lastOkFingerprint: string | null;
    /** That same row's `createdAt`. Null exactly when lastOkFingerprint is. */
    lastOkAt: Date | null;
    /** lastOkFingerprint !== the fingerprint passed in — the PLAYER changed something. */
    stale: boolean;
    /** The newest ok run's prompt_version or profile_version differs from the current one.
     *  Reopens the gate as its own reason; never folded into `stale`. */
    versionMoved: boolean;
    /** The reader's shared model allowance — tuning and the synopsis together. */
    allowance: Allowance;
    /** What the evidence will hold, so the panel can say "no games yet" without a gate. */
    gameCount: number;
  };

  // src/lib/decks/tuning-read.ts — server-only, PR C
  export function readTuningState(deckId: string, userId: string, fingerprint: string): Promise<TuningState>;

  // src/app/decks/tuning-actions.ts
  export function readTuningPanel(deckId: string): Promise<TuningState | null>;
  ```

`gameCount` rides on the state for the panel's copy — a deck with no games is told its suggestions come from the list alone — and gates nothing. `TuningItem` is the only shape the card renders; the card does no lookups of its own, which is why the name, type line, ownership, and price are joined here.

- [ ] **Step 1: Write the failing gate test**

`gateReason` is pure and is the single answer to "why is the button disabled", so the disabled button and the reason shown beside it can never disagree.

```typescript
// src/lib/tuning/gate.test.ts
const at = new Date("2026-09-07T10:00:00Z");
const run = (status: string, errorClass: string | null = null) => ({
  id: "run_1", status, errorClass, createdAt: at, droppedCount: 0,
});
const open: Allowance = { used: 0, limit: MODEL_DAILY_ALLOWANCE, reopensAt: null };
// `fresh` is a deck that has never generated — and has no games, which is not a gate.
const fresh: TuningState = {
  run: null, items: [], lastOkFingerprint: null, lastOkAt: null,
  stale: true, versionMoved: false, allowance: open, gameCount: 0,
};
const settled: TuningState = {
  ...fresh, run: run("ok"), lastOkFingerprint: "fp", lastOkAt: at, stale: false,
};

it("opens a deck with no games and no runs", () => {
  expect(gateReason(fresh)).toBeNull();
});

it("gates while a run is in flight", () => {
  expect(gateReason({ ...fresh, run: run("pending") })?.kind).toBe("in_flight");
});

it("reports unchanged when nothing has changed since the last successful run", () => {
  // Not a refusal of the drawn `Suggest again anyway` (S4 state 5): runTuning passes
  // `unchanged` when the press says `anyway`, and only then. The panel's plain primary
  // is the one that stays unavailable.
  expect(gateReason(settled)?.kind).toBe("unchanged");
});

it("reopens after a prompt or profile version bump, without calling the deck changed", () => {
  const bumped = { ...settled, versionMoved: true };
  expect(gateReason(bumped)).toBeNull();
  expect(bumped.stale).toBe(false);
});

it("does not gate when the last run failed or was cancelled", () => {
  expect(gateReason({ ...fresh, run: run("failed", "upstream_busy") })).toBeNull();
  expect(gateReason({ ...fresh, run: run("cancelled") })).toBeNull();
});

it("gates when the shared allowance is spent, and names when it reopens", () => {
  const reopensAt = new Date("2026-09-08T09:00:00Z");
  const g = gateReason({ ...fresh, allowance: { used: MODEL_DAILY_ALLOWANCE, limit: MODEL_DAILY_ALLOWANCE, reopensAt } });
  expect(g?.kind).toBe("allowance");
  expect(g?.message).toBe(deckTuningCopy.allowance.spent(reopensAt));
});

it("reports unchanged before allowance, so a spent allowance never hides that a press would be wasted anyway", () => {
  expect(gateReason({ ...settled, allowance: { used: 5, limit: 5, reopensAt: at } })?.kind).toBe("unchanged");
});
```

A failed or cancelled run not consuming the gate is the spec's rule and the reason those cases are tested separately.

- [ ] **Step 2: Run it to verify it fails, then implement `gateReason`**

Three kinds, in this order — the first that applies wins:

```typescript
export function gateReason(state: TuningState): GateReason | null {
  if (state.run?.status === "pending") {
    return { kind: "in_flight", message: deckTuningCopy.panel.generating };
  }
  if (!state.stale && !state.versionMoved && state.lastOkFingerprint !== null) {
    return { kind: "unchanged", message: deckTuningCopy.panel.unchanged(state.lastOkAt!) };
  }
  if (state.allowance.used >= state.allowance.limit) {
    return { kind: "allowance", message: deckTuningCopy.allowance.spent(state.allowance.reopensAt!) };
  }
  return null;
}
```

`unchanged` precedes `allowance` because it is the more useful truth: a player told their allowance is spent will wait for it to reopen and then be told nothing changed. `panel.unchangedCta` is the **button label** on the unchanged state and must not be reused as a message. `allowance.spent(at)` is the stated exhausted state; its wording is not drawn yet and is listed in Task 2 as a key the placement addendum returns, with the synopsis's surface in mind, because both features show it.

**`unchanged` is not a dead end.** The design table draws S4 state 5 (*Nothing has changed*) with an ENABLED primary, `Suggest again anyway` (`design-tables/deck-tuning.md:737`, `:1207`), and the build follows the drawing: that press calls `runTuning(deckId, { anyway: true })`, which lets `unchanged` through and nothing else — it still spends a unit on success, like any run. **`versionMoved` is its own reason**: the fingerprint says the player changed nothing, the versions say the app did, and the gate opens. What the panel says about that is a copy key for PR D (`panel.improved`), written in the panel's register and routed through `/copy-review`, since the handoff predates the idea.

`panel.unchanged(...)` takes the time the standing suggestions were generated, which is the newest **ok** run's timestamp — not `state.run.createdAt`, which may belong to a failure that happened afterwards.

An `ungrounded` failure leaves the gate open on unchanged inputs, so `Try again` can re-spend on a call that will very likely fail the same way. That is the spec's rule, and the allowance is now what bounds it.

- [ ] **Commit the state and the gate** (PR B2)

```bash
pnpm test src/lib/tuning/gate.test.ts
git add src/lib/tuning/state.ts src/lib/tuning/gate.ts src/lib/tuning/gate.test.ts
git commit -m "feat(tuning): the tuning state and the one gate"
```

---
