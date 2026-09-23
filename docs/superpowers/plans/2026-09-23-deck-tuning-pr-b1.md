# Deck tuning — PR B1 — inputs

> Part of the deck tuning plan. **Read the index first:** [`2026-09-07-deck-tuning-suggestions.md`](2026-09-07-deck-tuning-suggestions.md) — the Global Constraints, File Structure, PR boundaries and Cost there apply to every task below. Task numbers are shared across all six files.

> **Amended 2026-09-23, during the build.** Four changes, each to keep a string or a function from
> shipping ahead of the thing that uses it, or to keep the plan honest about the code:
> 1. **Copy keys arrive with their first caller**, which is what `deck-tuning.ts`'s own header
>    already requires. B1 adds `intent` alone (`limits.ts` reads `maxLength`). `panel.generating`,
>    `panel.unchanged`, `allowance` and `suggestionRules` go to B2 with the gate and the prompt;
>    `panel.refused` and the intent refusal go to C with the actions.
> 2. **`intentRefusal` is `intentTooLong`, a boolean.** The plan had it return
>    `gameLogCopy.form.refused`, which reads "We couldn't save that game" — wrong for an intent.
>    The refusal sentence is new copy and ships in C through `/copy-review`.
> 3. **`seededIntent` moves to C** beside `createDeck` and `fillDeck`, its callers. The handoff
>    draws the seeded state but writes no seeded sentence, so that sentence is authorship and goes
>    through `/copy-review` with a picture.
> 4. **`EvidencePack.targets` carries the five mix cells, land included, each with its own
>    `measured` flag**, rather than a separate `lands` field and one flag: `recommendedMix` already
>    puts land in the same shape, and resolves the roles and the land count independently.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

### Task 2: Copy module

> **Partly shipped 2026-09-13.** `src/lib/copy/deck-tuning.ts` exists and holds
> the `note` section only — the rest of the sections below arrive with the
> surfaces that draw them, so a copy pass never reads a string nothing renders.

**Split across PRs by that same rule.** PR B1 adds the keys pure code or a server refusal
returns — `panel.generating`, `panel.unchanged`, `panel.refused`, `allowance`, `failure`,
`suggestionRules`, and **`intent`** (whose `maxLength` `limits.ts` reads and whose `seeded`
string `seededIntent` fills). PR D adds the keys only a component draws. Each batch goes through
`/copy-review` in its own PR.

**Files:**
- Modify: `src/lib/copy/deck-tuning.ts`, `src/lib/copy/deck-tuning.test.ts` (both exist)

**Interfaces:**
- Consumes: `axisCopy` from `src/lib/copy/game-log.ts`. Not `PATTERN_MIN`: nothing in this feature gates on a game count.
- Produces: `deckTuningCopy`, `manifestCopy`, and the re-exported `axisCopy`. Every component and action imports its strings from here and defines none of its own.

- [ ] **Step 1: Write the guard test first**

The value of this test is not that the strings exist — it is that the presentation rules hold across the whole file at once, so a later string added by hand cannot quietly break them.

```typescript
// src/lib/copy/deck-tuning.test.ts
import { describe, expect, it } from "vitest";
import { deckTuningCopy, manifestCopy, axisCopy } from "./deck-tuning";
import { gameLogCopy } from "./game-log";

// Functions are included by their source, not skipped. Most of this file's
// copy is interpolated — `counter(n, max)`, `unchanged(at)` — so a helper that
// walked only the literals would leave the computed strings, the ones most
// likely to reach for a percentage, entirely unguarded.
function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") return [value.toString()];
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}

describe("deck tuning copy", () => {
  it("re-exports the game log's vocabulary rather than redefining it", () => {
    expect(axisCopy.mana).toBeDefined();
  });

  it("carries no below-threshold copy, because nothing gates on a game count", () => {
    expect(Object.keys(deckTuningCopy.panel).filter((k) => k.startsWith("belowThreshold"))).toEqual([]);
  });

  it("never writes a percentage", () => {
    for (const s of allStrings(deckTuningCopy).concat(allStrings(manifestCopy))) {
      expect(s).not.toMatch(/%|percent/i);
    }
  });

  it("amends the game log's optional-note line rather than replacing it", () => {
    expect(gameLogCopy.form.optionalNote).toBe(
      "marks are optional: a result on its own is a game",
    );
    expect(deckTuningCopy.note.optionalNote).not.toBe(gameLogCopy.form.optionalNote);
  });

  // PR B1: the intent keys ship with limits.ts, which reads them.
  it("caps a note at 140 and an intent at 120, and seeds inside the cap", () => {
    expect(deckTuningCopy.note.maxLength).toBe(140);
    expect(deckTuningCopy.note.warnAt).toBe(130);
    expect(deckTuningCopy.intent.maxLength).toBe(120);
    expect(deckTuningCopy.intent.seeded.length).toBeLessThanOrEqual(120);
  });

  // PR B1 from here to the next marker.
  it("has a failure object for all five classes", () => {
    for (const k of ["unavailable", "timedOut", "unusable", "nothingHeldUp", "interrupted"]) {
      expect(deckTuningCopy.failure[k as keyof typeof deckTuningCopy.failure]).toBeDefined();
    }
  });

  // PR D: `panel.results` and `card.*` are keys only a component draws.
  it("carries a denominator on every counted line", () => {
    expect(deckTuningCopy.panel.results(2, 3)).toContain("of 3");
    expect(deckTuningCopy.card.consequenceOwned(99, "Complete")).toContain("of 99");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm test src/lib/copy/deck-tuning.test.ts
```

Expected: FAIL — the module exports only `countCharacters` and the `note` section today.

- [ ] **Step 3: Write the copy module**

Transcribe every key from the **Copy keys** section of `docs/superpowers/design-tables/deck-tuning.md` verbatim — that section is the source of truth for the text, and this task is transcription, not authorship. The module's shape:

```typescript
// src/lib/copy/deck-tuning.ts
// Every string the tuning surfaces render. Transcribed from the design table's
// copy-keys section; the wording there wins over anything drawn on a canvas.
export { axisCopy } from "./game-log";

export const manifestCopy = {
  games: { what: "games logged", count: (n: number) => `${n} games`, countOne: "1 game" },
  // ... notes, decklist, collection, intent, progress, collapsed
} as const;

export const deckTuningCopy = {
  // No belowThreshold* keys: the game gate is gone (2026-09-20 ruling). `ready*` must
  // read truthfully at zero games — the addendum redraws it (Task 14).
  // `refused` is the one refusal no gate names: a deck the reader cannot open.
  panel: { /* heading, ready*, generating*, stop, results*, again*, tally*, unchanged*, refused */ },
  // The shared allowance's exhausted state. Not drawn by the tuning handoff, and
  // visible in normal use, unlike the hourly ceiling it replaces — so eng writes a
  // placeholder in the panel's register for PR B1 and the placement addendum returns
  // the drawn wording, with the synopsis's surface in view, since both show it.
  allowance: { /* spent(reopensAt: Date), remaining(n, of) */ },
  failure: {
    retry: "Try again",
    unavailable: { /* tag, body, kept, note */ },
    timedOut: { /* tag, body, bodyFor, kept, keptNone, note */ },
    unusable: { /* tag, body, kept, note */ },
    nothingHeldUp: { /* tag, body, kept, note */ },
    // The fifth class. The reaper writes it; the run never does. A player who
    // closed the tab mid-run sees this on return, not a failure.
    interrupted: { /* tag, body, kept, note */ },
  },
  card: { /* cut, add, added, owned, notOwned, price, cite*, consequence*, apply*, dismiss*, undo, restore, *Refused */ },
  intent: { /* askLabel, ask, placeholder, save, skip, edit, editAria, seeded, seededAria, maxLength: 120 */ },
  // Shipped. Also carries `hintShort` (the phone's gloss) and the `readBack`
  // pair (the desktop line under the field), neither of which this sketch had.
  note: { /* label, hint, hintShort, counter, maxLength: 140, warnAt: 130, optionalNote, ariaDescription, readBack, readBackEmphasis */ },
  suggestionRules: { /* the nine static rules — see Task 9 */ },
  announce: { /* started, ready, readyOne, unchanged, stopped, failed, applied, undone, dismissed, intentSaved */ },
} as const;
```

`card.price` is a pass-through taking an already-formatted string: `price: (amount: string) => amount`. It must never format cents itself — `formatCents` at `src/lib/decks/price.ts:111-116` is the only formatter in this codebase.

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test src/lib/copy/deck-tuning.test.ts
```

Expected: PASS, the shipped `note` tests plus these.

- [ ] **Step 5: Commit**

```bash
git add src/lib/copy/deck-tuning.ts src/lib/copy/deck-tuning.test.ts
git commit -m "feat(tuning): copy module for the tuning panel, cards, note, and intent"
```

---

### Task 5a: Limits

**PR B1.** Extracted from Task 5 so the pure core has its constants and the intent predicate before the action exists.

**Files:**
- Create: `src/lib/tuning/limits.ts`, `src/lib/tuning/limits.test.ts`

- [ ] **Step 1: Write the failing test** — `intentRefusal` at 120 and 121 code points and at the empty string (Task 5 step 1's cases, in `limits.test.ts`), and `seededIntent` against the catalog's longest commander name, asserting the result fits `deckTuningCopy.intent.maxLength`.

- [ ] **Step 2: Implement**

```typescript
// src/lib/tuning/limits.ts
import { countCharacters, deckTuningCopy } from "../copy/deck-tuning";
import { gameLogCopy } from "../copy/game-log";

export const MAX_SUGGESTIONS = 3;
export const REAPER_CUTOFF_MS = 5 * 60 * 1000;
export const MODEL_TIMEOUT_MS = 90_000;
// The current Sonnet. Recorded per run in deck_suggestion_runs.model; the shared
// client names no model of its own. No hourly ceiling here — the per-player daily
// allowance lives in src/lib/model/allowance.ts and is shared with the synopsis.
export const TUNING_MODEL = "claude-sonnet-5";
export const TUNING_MAX_TOKENS = 2_000;

export function intentRefusal(intent: string): string | null {
  // The shipped form refusal, not a tuning-specific string — this is a form
  // rejecting what was typed, which is the case gameLogCopy.form.refused names.
  // Code points, as the note's check does: the column counts with char_length,
  // and `.length` would refuse 61 emoji as 122 characters.
  return countCharacters(intent) > deckTuningCopy.intent.maxLength ? gameLogCopy.form.refused : null;
}
```

`seededIntent(commanderName)` returns the design table's `intent.seeded` sentence for that commander, trimmed to the cap at a word boundary.

- [ ] **Step 3: Run and commit**

```bash
pnpm test src/lib/tuning/limits.test.ts
git add src/lib/tuning/limits.ts src/lib/tuning/limits.test.ts
git commit -m "feat(tuning): limits, the intent cap, and the seeded intent"
```

---

### Task 6: Fingerprint and the shared inputs

**PR B1.**

**Files:**
- Create: `src/lib/tuning/prompt-version.ts`, `src/lib/tuning/fingerprint.ts`
- Test: `src/lib/tuning/fingerprint.test.ts`

**Interfaces:**
- Consumes: `listFingerprint` (Task 0).
- Produces:
  ```typescript
  export const PROMPT_VERSION = 1;
  export type FingerprintInput = {
    /** `listFingerprint(head)` — the player's list. No version inside. */
    list: string;
    games: { id: string; result: string; podSize: number; worked: string[]; hurt: string[]; note: string | null }[];
    intent: string | null;
    /** The newest confirmed collection upload's `confirmed_at`, ISO, or null. */
    collection: string | null;
  };
  export function tuningFingerprint(input: FingerprintInput): string;
  ```

**Only the player's changes are in the hash** (Hugh, 2026-09-23). The list, the games and their notes, the intent, and the collection — every one something the player did. **No version is in it**: `PROMPT_VERSION` and `PROFILE_VERSION` are stored as their own columns on the run (`deck_suggestion_runs.prompt_version`, `.profile_version`), and a run whose versions differ from the current ones reopens the gate under its own reason (`TuningState.versionMoved`, Task 12) without ever reading as `stale`. So a deploy never tells a player "your deck changed" when they changed nothing.

**The collection is in, as a stamp.** The pack tells the model what the player owns, so a purchase is a material change. `import.ts` is the only writer of `collection_items`, and every replace stamps `csv_uploads.confirmed_at`, so the newest confirmed stamp is a one-row read that moves exactly when ownership can have.

**The catalog generation is out**: a weekly refresh that moves the staples list does not reopen the gate on its own. The gate exists so a press with nothing new to say is not paid for, and the next edit, game or purchase picks the new staples up.

**ONE function builds these inputs, at both call sites.** `tuningInputs(deckId, userId)` in `src/lib/decks/tuning-read.ts` (PR C) reads the profile head, the games, the intent and declared bracket, and the collection stamp, and returns them with the fingerprint. `runTuning` and `readTuningPanel` both call it, so the panel's "nothing changed" and the action's refusal are computed by the same code. It never builds the profile — opening a panel must not start the expensive computation.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/tuning/fingerprint.test.ts
const base: FingerprintInput = {
  list: "l1",
  games: [{ id: "g1", result: "loss", podSize: 4, worked: [], hurt: ["mana"], note: null }],
  intent: null,
  collection: null,
};

it("ignores the order games arrive in, and the order of their marks", () => {
  const two = { ...base, games: [...base.games, { ...base.games[0], id: "g2", hurt: ["tempo", "mana"] }] };
  const shuffled = { ...two, games: [...two.games].reverse().map((g) => ({ ...g, hurt: [...g.hurt].reverse() })) };
  expect(tuningFingerprint(shuffled)).toBe(tuningFingerprint(two));
});

it("changes with the list, a game, a note, the intent, and the collection", () => {
  expect(tuningFingerprint({ ...base, list: "l2" })).not.toBe(tuningFingerprint(base));
  expect(tuningFingerprint({ ...base, games: [...base.games, { ...base.games[0], id: "g2" }] })).not.toBe(tuningFingerprint(base));
  expect(tuningFingerprint({ ...base, games: [{ ...base.games[0], note: "flooded" }] })).not.toBe(tuningFingerprint(base));
  expect(tuningFingerprint({ ...base, intent: "go wide" })).not.toBe(tuningFingerprint(base));
  expect(tuningFingerprint({ ...base, collection: "2026-09-23T10:00:00Z" })).not.toBe(tuningFingerprint(base));
});

it("does not move when PROMPT_VERSION does", async () => {
  // vi.doMock("./prompt-version", () => ({ PROMPT_VERSION: 99 })), re-import, compare.
});

it("fingerprints a deck with no games", () => {
  const none = { ...base, games: [] };
  expect(tuningFingerprint(none)).toBe(tuningFingerprint(none));
  expect(tuningFingerprint(none)).not.toBe(tuningFingerprint(base));
});
```

- [ ] **Step 2: Run it to verify it fails**, then **Step 3: Implement**

```typescript
// src/lib/tuning/prompt-version.ts
// Stored per run in deck_suggestion_runs.prompt_version and compared there — never
// hashed into the fingerprint, so a prompt change reopens the gate as an improvement
// and never reads as "your deck changed".
export const PROMPT_VERSION = 1;
```

```typescript
// src/lib/tuning/fingerprint.ts
// SERVER-ONLY: node:crypto, as src/lib/profile/fingerprint.ts.
import { createHash } from "node:crypto";

export function tuningFingerprint(input: FingerprintInput): string {
  const games = [...input.games]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((g) => [
      g.id, g.result, g.podSize,
      [...g.worked].sort().join(","), [...g.hurt].sort().join(","),
      g.note ?? "",
    ].join("|"));
  return createHash("sha256")
    .update(JSON.stringify({ list: input.list, games, intent: input.intent ?? "", collection: input.collection ?? "" }))
    .digest("hex");
}
```

The comparator is the byte order `listFingerprint` uses rather than `localeCompare`, so the two hashes sort the same way on every runtime.

- [ ] **Step 4: Run the test to verify it passes, then commit**

```bash
pnpm test src/lib/tuning/fingerprint.test.ts
git add src/lib/tuning/prompt-version.ts src/lib/tuning/fingerprint.ts src/lib/tuning/fingerprint.test.ts
git commit -m "feat(tuning): a fingerprint of the player's own changes, versions stored beside it"
```

---

### Task 7: The play group and the evidence pack

**PR B1.**

**Files:**
- Create: `src/lib/profile/play.ts`, `src/lib/tuning/evidence.ts`
- Modify: `src/lib/profile/types.ts` (**shared surface** — one key, ownership sequenced by the orchestrator)
- Test: `src/lib/profile/play.test.ts`, `src/lib/tuning/evidence.test.ts`

**Interfaces:**
- Consumes: `DeckProfile` (`src/lib/profile/types.ts:292`) — `cards`, `commanderOracleIds`, `colours.identity`, `counts`, `roles`, `skeleton` (its `roleTargets`, `composition`, `staples`, `thinCondition`); `recommendedMix(skeleton, hasPartner)` (`src/lib/decks/mix.ts:107`) for the per-role targets and their `advisory` flag; `DeckGame` and `summarizeGames` (`src/lib/decks/games.ts:7`, `:138`).
- Produces:
  ```typescript
  // src/lib/profile/play.ts — pure, client-safe
  export type ProfilePlay = {
    games: { id: string; result: "win" | "loss" | "draw"; podSize: number; playedAt: string; worked: string[]; hurt: string[]; note: string | null }[];
    summary: {
      count: number;
      marked: number;
      record: { wins: number; losses: number; draws: number };
      /** Fix-first. No `net`: it orders, it never travels. */
      axes: { key: string; worked: number; hurt: number }[];
    };
  };
  export function buildPlayGroup(games: DeckGame[]): ProfilePlay;

  // src/lib/tuning/evidence.ts — pure, client-safe
  export type EvidencePack = {
    commanders: { oracleId: string; name: string }[];
    colorIdentity: string[];
    cards: { oracleId: string; name: string; typeLine: string; roles: string[]; quantity: number; owned: boolean; commander: boolean }[];
    targets: {
      roles: { role: string; have: number; target: number; advisory: boolean }[];
      lands: { have: number; target: number } | null;
      /** The skeleton's own honesty flag: targets taken over too few decks. */
      thin: boolean;
    };
    staples: { oracleId: string; name: string; commanders: number; commanderTotal: number; owned: boolean }[];
    play: ProfilePlay;
    intent: string | null;
  };
  export function buildEvidencePack(input: {
    profile: DeckProfile;
    play: ProfilePlay;
    intent: string | null;
    owned: ReadonlySet<string>;
  }): EvidencePack;
  ```

**Why the play group is attached, not cached.** `types.ts:12-14` promises that a later fact group arrives "as sibling keys … and nothing about the loader, the fingerprint or the cache key changes when they do". The profile's fingerprint is over the deck's cards alone, so a play group computed INSIDE `cachedDeckProfile` would be filed under a key a logged game does not move — the cached document would carry last week's games — and moving the key instead would retire the stored analysis (`deck_profiles`) every time a game is logged, for figures no game can change. So `DeckProfile` gains `play?: ProfilePlay | null`, the cached and stored documents never carry it, and a consumer that wants it composes `{ ...profile, play: buildPlayGroup(games) }` at the read. The doc comment on the key says exactly that.

**Ownership is an input, not a group.** The profile has no ownership group yet (`types.ts:12` lists it as a later one). The pack takes the reader's owned oracle ids as a plain set, read once by `runTuning` over the pack's card and staple ids (`collection_items`, scoped by `user_id`). If an ownership group ships first, this input is where it plugs in.

- [ ] **Step 1: Write the failing play-group test**

```typescript
// src/lib/profile/play.test.ts
it("strips net from every axis it carries", () => {
  for (const axis of buildPlayGroup(games).summary.axes) expect(axis).not.toHaveProperty("net");
});

it("orders axes fix-first", () => {
  const { axes } = buildPlayGroup(games);
  const firstHurt = axes.findIndex((a) => a.hurt > a.worked);
  const firstWorked = axes.findIndex((a) => a.worked > a.hurt);
  expect(firstHurt).toBeLessThan(firstWorked);
});

it("is an empty group, not an absent one, at zero games", () => {
  expect(buildPlayGroup([])).toEqual({
    games: [],
    summary: { count: 0, marked: 0, record: { wins: 0, losses: 0, draws: 0 }, axes: [] },
  });
});

it("serializes playedAt as a string, because the profile is JSON-only", () => {
  expect(typeof buildPlayGroup(games).games[0].playedAt).toBe("string");
});
```

- [ ] **Step 2: Write the failing evidence test**

```typescript
// src/lib/tuning/evidence.test.ts
it("excludes staples already in the deck", () => {
  const pack = buildEvidencePack(input);
  const inDeck = new Set(pack.cards.map((c) => c.oracleId));
  for (const s of pack.staples) expect(inDeck.has(s.oracleId)).toBe(false);
});

it("forwards a staple's breadth as a count with its denominator, and no proportion", () => {
  const [staple] = buildEvidencePack(input).staples;
  expect(staple).toHaveProperty("commanders");
  expect(staple).toHaveProperty("commanderTotal");
  expect(staple).not.toHaveProperty("avgInclusion");
  expect(staple).not.toHaveProperty("weightedRank");
});

it("marks the commanders so a cut can never name one", () => {
  const pack = buildEvidencePack(input);
  const commanders = pack.cards.filter((c) => c.commander).map((c) => c.oracleId);
  expect(commanders).toEqual(input.profile.commanderOracleIds);
});

it("measures a measured target against the 99 alone, as fitSkeleton does", () => {
  // A ramp commander + 9 ramp in the 99, measured target 10: a gap of 1, not a surplus.
  const ramp = buildEvidencePack(rampCommanderInput).targets.roles.find((r) => r.role === "ramp");
  expect(ramp?.have).toBe(9);
});

it("takes role targets from recommendedMix, advisory flag included", () => {
  const lands = buildEvidencePack(input).targets.roles.find((r) => r.role === "land");
  expect(lands?.advisory).toBe(true);
});

it("builds a pack with no games", () => {
  const pack = buildEvidencePack({ ...input, play: buildPlayGroup([]) });
  expect(pack.play.summary.count).toBe(0);
});

it("never carries a figure a percentage could be written from", () => {
  expect(JSON.stringify(buildEvidencePack(input))).not.toMatch(/\b0\.\d+\b/);
});
```

Build `input` in the test from plain literals — a hand-written `DeckProfile` fixture. The function takes an already-loaded profile, which is exactly what makes it testable without a database.

- [ ] **Step 3: Run both to verify they fail**

```bash
pnpm test src/lib/profile/play.test.ts src/lib/tuning/evidence.test.ts
```

- [ ] **Step 4: Implement**

`buildPlayGroup` wraps `summarizeGames` and maps `AxisTally` down to `{ key, worked, hurt }` in fix-first order — the model cannot render a figure it was never given. `playedAt` goes out as an ISO date string.

`buildEvidencePack` reads, and never recomputes, what the profile holds:

- **`cards`** is `profile.cards`, each tagged with every role `profile.roles.cards` files it under (a card can hold several) and `commander: true` for `commanderOracleIds`.
- **`targets.roles`** pairs the deck's role counts with `recommendedMix(profile.skeleton, commanderOracleIds.length > 1).cells`, carrying `advisory` through so the prompt can say a gap is a guide and not a gate. **Which counts depends on which target**, exactly as `fitSkeleton` decides it (`src/lib/profile/fit.ts:219-222`): `profile.roles.excludingCommanders` when `skeleton.roleTargets.of !== "flat"` — the measured targets come from EDHREC support lists, which never contain the commander — and `profile.roles.counts` only against the flat fallback. Comparing full counts to a measured target reports a phantom surplus on every deck led by a card that classifies as a role, and sends the model a wrong gap. `targets.lands` is `counts.land` against `skeleton.composition?.targets.land`, null when the skeleton has no composition. `thin` is `skeleton.thinCondition`.
- **`staples`** is `skeleton.staples` minus every deck card, in the skeleton's own rank order, with `commanders` / `commanderTotal` forwarded and the ranking figures dropped.
- **`play`** and **`intent`** pass through.

Nothing in the pack is a bracket figure (see *Global Constraints*).

- [ ] **Step 5: Add the key to `DeckProfile`**

```typescript
  /**
   * The play-data group. NEVER present in the cached or stored document: the fingerprint is
   * over the deck's cards, so a group filed under it would go stale on the next logged game.
   * A consumer composes it at the read — `{ ...profile, play: buildPlayGroup(games) }`.
   */
  play?: ProfilePlay | null;
```

Optional, so `buildDeckProfile`, the stored rows and every existing consumer compile unchanged. Ask the orchestrator for this file before the PR opens.

- [ ] **Step 6: Run the tests and commit**

```bash
pnpm test src/lib/profile/play.test.ts src/lib/tuning/evidence.test.ts
git add src/lib/profile/play.ts src/lib/profile/play.test.ts src/lib/profile/types.ts src/lib/tuning/evidence.ts src/lib/tuning/evidence.test.ts
git commit -m "feat(tuning): the play-data profile group and an evidence pack read from the profile"
```

---
