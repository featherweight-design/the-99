import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

// The actions are public endpoints: what the tests pin is what they do with a wire value that
// is not what the TypeScript type claims.
const calls = vi.hoisted(() => ({ inputs: 0, started: 0, applied: 0, saved: 0, startOpts: undefined as unknown, startKind: "in_flight",
  reachModel: false, finished: [] as unknown[][], modelRequest: undefined as unknown, modelOutcome: undefined as unknown,
  contextRead: 0, packInput: undefined as unknown, allLocked: null as string | null,
  // H35, PR 4a (8-asked/5-kept): a test-supplied pack and catalog, so a full run can reach the
  // real catalog read, price read and `validateSuggestions` rather than throwing on a bare `db`
  // stub. `persisted` captures `persistRun`'s own arguments, the first of which is `withBracketAfter`'s
  // return — mocked here to echo its own `sized` argument back, since the real slicing happens
  // BEFORE that call.
  evidencePack: undefined as unknown, catalogRows: [] as unknown[], persisted: [] as unknown[][],
  // Review round 4: configurable so a test can prove the mocked reads actually flow into the
  // hard filters, not just that the validator's own unit tests apply them in isolation.
  priceRows: new Map<string, number>(), ownedIds: new Set<string>(), freeCopies: new Map<string, number>(),
  // The ONE source of truth for limits: `tuningInputs` hands it to `runTuning`, which passes the
  // SAME value on to `buildEvidencePack` — so the mocked pack mirrors whatever was read in,
  // rather than risking two configs that could silently disagree with production's own flow.
  limits: { capCents: null as number | null, sets: [] as readonly string[], ownedOnly: false },
  // `saveDeckHeader`'s one query shape: `db.update(decks).set(values).where(cond).returning(shape)`.
  // `headerUpdateRows` is the row count the "owned deck" where-clause would have matched —
  // set to `[]` to simulate a deck that is not this user's (or does not exist).
  headerUpdates: [] as { set: unknown }[], headerUpdateRows: [{ id: "deck_1" }] as { id: string }[],
  // The WHERE condition passed to `saveDeckHeader`'s update, one per call — rendered to SQL
  // in the test itself, the same way `combo-map-action.test.ts` proves its own scoping.
  headerWhere: [] as unknown[] }));

vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
// `updateTag` too: `saveDeckHeader`'s name path reaches `revalidateClaims` → `revalidateUserLists`.
vi.mock("next/cache", () => ({ revalidatePath: () => undefined, updateTag: () => undefined }));
vi.mock("../../db", () => ({
  db: {
    update: () => ({
      set: (values: unknown) => ({
        where: (cond: unknown) => {
          calls.headerWhere.push(cond);
          return {
            returning: async () => {
              calls.headerUpdates.push({ set: values });
              return calls.headerUpdateRows;
            },
          };
        },
      }),
    }),
    // The one catalog read `runTuning` makes after a reply: `db.select({...}).from(cards).where(...)`.
    // Canned, never a real query — `calls.catalogRows` is the only thing a test configures.
    select: () => ({ from: () => ({ where: async () => calls.catalogRows }) }),
  },
}));
vi.mock("../../lib/decks/availability-query", () => ({
  // SLEEVEABLE MEANS SLEEVEABLE (review round 6): a row absent here reads as "nothing known",
  // same as `fill.ts`'s own predicate (`a === undefined || a.free > 0`).
  loadAvailability: async () => new Map([...calls.freeCopies].map(([id, free]) => [id, { free }])),
}));
vi.mock("../../lib/decks/price-query", () => ({
  loadPrices: async () => {
    if (calls.priceRows.size === 0) return { prices: new Map(), newestAsOf: null };
    const asOf = new Date(0);
    const prices = new Map([...calls.priceRows].map(([id, cents]) => [id, { cents, foilCents: null, etchedCents: null, asOf }]));
    return { prices, newestAsOf: asOf };
  },
}));
vi.mock("../../lib/decks/tuning-read", () => ({
  tuningInputs: async () => {
    calls.inputs += 1;
    return {
      head: {}, games: [], intent: null, declared: null, fingerprint: "fp", locked: [], allLocked: calls.allLocked,
      limits: calls.limits,
    };
  },
  // A deck whose last run saw exactly this fingerprint: the gate reads `unchanged`.
  readTuningState: async (_d: string, _u: string, _f: string, _n: Date, opts?: { allLocked?: string | null }) => ({
    run: { id: "r", status: "ok" }, items: [], lastOkFingerprint: "fp", lastOkAt: new Date(),
    stale: false, modelVersionMoved: false, retired: null, allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null }, gameCount: 0, newestPriceAsOf: null,
    allLocked: opts?.allLocked ?? null,
  }),
  readOwnedOracleIds: async () => calls.ownedIds,
  readTuningContext: async () => { calls.contextRead += 1; return { overview: { strategy: ["Attack."], keyCards: ["Oxen"] }, universal: [{ oracleId: "ring", name: "Sol Ring" }] }; },
  profileOfHead: async () => {
    if (!calls.reachModel) throw new Error("stop after the gate");
    return { cards: [], skeleton: { staples: [] } };
  },
  // Echoes its own `sized` argument back: the real 8-to-5 slice happens before this call, so
  // this must never reshape what reaches `persistRun`.
  withBracketAfter: async (..._args: unknown[]) => _args[3],
  commanderName: async () => "Kykar, Wind's Fury",
}));
vi.mock("../../lib/tuning/run-store", () => ({
  saveIntent: async () => { calls.saved += 1; return "saved"; },
  startRun: async (...args: unknown[]) => {
    calls.started += 1;
    calls.startOpts = args[4];
    return calls.startKind === "started" ? { kind: "started", runId: "run_1", callId: "call_1" } : { kind: calls.startKind };
  },
  finishRun: async (...args: unknown[]) => { calls.finished.push(args); return true; },
  persistRun: async (...args: unknown[]) => { calls.persisted.push(args); return true; },
  cancelRun: async () => true,
}));
vi.mock("../../lib/profile/play", () => ({ buildPlayGroup: () => ({}) }));
vi.mock("../../lib/tuning/evidence", () => ({
  buildEvidencePack: (input: { limits: unknown }) => {
    calls.packInput = input;
    // Mirrors the real flow: `runTuning` passes the SAME `limits` it read from `tuningInputs` on
    // to `buildEvidencePack`, so the mocked pack never risks disagreeing with it.
    return { notes: null, ...(calls.evidencePack as object ?? { cards: [] }), limits: input.limits };
  },
}));
vi.mock("../../lib/tuning/prompt", () => ({ buildPrompt: () => ({ system: "s", user: "u" }) }));
// A reply that came back, billed, and names cards: the catalog read after it is what throws here,
// since `db` is a stub.
vi.mock("../../lib/model/client", () => ({
  callModel: async (req: unknown) => {
    calls.modelRequest = req;
    return calls.modelOutcome ?? {
      ok: true,
      value: { suggestions: [{ add: "Sol Ring", cut: "Island" }] },
      usage: { inputTokens: 4_000, outputTokens: 900, cacheReadTokens: 0, cacheWriteTokens: 0 },
    };
  },
}));
vi.mock("../../lib/tuning/verdicts", () => ({
  applyItem: async () => { calls.applied += 1; return "deck"; },
  undoItem: async () => "deck",
  setDismissed: async () => "deck",
}));

import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { creditsCopy } from "../../lib/copy/credits";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { applySuggestion, runTuning, saveDeckDescription, saveDeckHeader, saveDeckLimits } from "./tuning-actions";

const DECK = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  calls.inputs = 0;
  calls.started = 0;
  calls.applied = 0;
  calls.saved = 0;
  calls.startKind = "in_flight";
  calls.allLocked = null;
  calls.reachModel = false;
  calls.finished = [];
  calls.modelRequest = undefined;
  calls.modelOutcome = undefined;
  calls.contextRead = 0;
  calls.packInput = undefined;
  calls.headerUpdates = [];
  calls.headerWhere = [];
  calls.headerUpdateRows = [{ id: "deck_1" }];
  calls.evidencePack = undefined;
  calls.catalogRows = [];
  calls.persisted = [];
  calls.priceRows = new Map();
  calls.ownedIds = new Set();
  calls.freeCopies = new Map();
  calls.limits = { capCents: null, sets: [], ownedOnly: false };
});

describe("runTuning after the call returned", () => {
  it("settles a throw past the reply with the usage the reply billed", async () => {
    calls.startKind = "started";
    calls.reachModel = true;
    await expect(runTuning(DECK, { anyway: true })).rejects.toThrow();
    expect(calls.finished).toEqual([[
      { runId: "run_1", callId: "call_1" },
      { status: "failed", errorClass: "upstream_busy", droppedCount: undefined },
      { model: "claude-sonnet-5", usage: { inputTokens: 4_000, outputTokens: 900, cacheReadTokens: 0, cacheWriteTokens: 0 } },
    ]]);
  });
});

describe("runTuning's model call (v2)", () => {
  it("asks for medium effort, with the retry floor inside the one deadline", async () => {
    calls.startKind = "started";
    calls.reachModel = true;
    await runTuning(DECK, { anyway: true }).catch(() => undefined);
    expect(calls.modelRequest).toMatchObject({ model: "claude-sonnet-5", effort: "medium", deadlineMs: 110_000, retryFloorMs: 70_000 });
  });

  it("hands the deck's overview and the universal staples to the pack", async () => {
    calls.startKind = "started";
    calls.reachModel = true;
    await runTuning(DECK, { anyway: true }).catch(() => undefined);
    expect(calls.contextRead).toBe(1);
    expect(calls.packInput).toMatchObject({ overview: { strategy: ["Attack."], keyCards: ["Oxen"] }, universal: [{ oracleId: "ring", name: "Sol Ring" }] });
  });

  // "Additional notes" (H35, PR 4b): never saved, so the request itself carries it — trimmed,
  // and blank after trimming reads the same as none.
  it("hands the request's own notes to the pack, trimmed, and null when blank", async () => {
    calls.startKind = "started";
    calls.reachModel = true;
    await runTuning(DECK, { anyway: true, notes: "  swap out Sol Ring  " }).catch(() => undefined);
    expect(calls.packInput).toMatchObject({ notes: "swap out Sol Ring" });
    await runTuning(DECK, { anyway: true, notes: "   " }).catch(() => undefined);
    expect(calls.packInput).toMatchObject({ notes: null });
  });

  it("refuses a notes string over its own character cap", async () => {
    calls.startKind = "started";
    const over = "a".repeat(501);
    const result = await runTuning(DECK, { anyway: true, notes: over });
    expect(result).toEqual({ ok: false, message: deckTuningCopy.run.refused });
    expect(calls.started).toBe(0);
  });

  // The floor itself is `client.test.ts`'s; what the action owes is that a failed outcome, whatever
  // refused it, settles as failed with its usage, which `finishRun` refunds.
  it("settles a failed call as failed with the usage it burned, never as spent", async () => {
    calls.startKind = "started";
    calls.reachModel = true;
    const usage = { inputTokens: 4_000, outputTokens: 3_600, cacheReadTokens: 0, cacheWriteTokens: 0 };
    calls.modelOutcome = { ok: false, errorClass: "malformed", usage };
    await runTuning(DECK, { anyway: true });
    expect(calls.finished).toEqual([[
      { runId: "run_1", callId: "call_1" },
      { status: "failed", errorClass: "malformed", droppedCount: undefined },
      { model: "claude-sonnet-5", usage },
    ]]);
  });
});

// H35, PR 4a: eight asked, five kept. Review round 2 (Low, previously missed): the production
// slice and its persisted report are otherwise unexercised, since every other test's `db` stub
// throws before reaching the catalog read.
describe("runTuning's 8-asked/5-kept slice", () => {
  const CARD = (n: number) => ({
    add: `Add ${n}`, cut: `Cut ${n}`, rationale: "Good value for this deck.", rationaleShort: "Good value.",
    evidence: [{ kind: "decklist" as const, value: "x" }],
  });
  const EIGHT = Array.from({ length: 8 }, (_, i) => CARD(i));

  beforeEach(() => {
    calls.startKind = "started";
    calls.reachModel = true;
    calls.modelOutcome = {
      ok: true,
      value: { suggestions: EIGHT },
      usage: { inputTokens: 4_000, outputTokens: 900, cacheReadTokens: 0, cacheWriteTokens: 0 },
    };
    calls.evidencePack = {
      commanders: [{ oracleId: "cmd", name: "Commander" }],
      colorIdentity: [],
      cards: Array.from({ length: 8 }, (_, i) => ({ oracleId: `cut${i}`, name: `Cut ${i}`, commander: false })),
      play: { games: [], summary: { count: 0, record: { wins: 0, losses: 0, draws: 0 }, marked: 0, axes: [] } },
      intent: null,
      limits: { capCents: null, sets: [], ownedOnly: false },
    };
    calls.catalogRows = Array.from({ length: 8 }, (_, i) => [
      { oracleId: `add${i}`, name: `Add ${i}`, colorIdentity: [], commanderLegal: true, printedInSelectedSets: true },
      { oracleId: `cut${i}`, name: `Cut ${i}`, colorIdentity: [], commanderLegal: true, printedInSelectedSets: true },
    ]).flat();
  });

  it("keeps only the first five of eight valid survivors", async () => {
    await runTuning(DECK, { anyway: true });
    expect(calls.persisted).toHaveLength(1);
    const [, flagged, droppedCount, , report] = calls.persisted[0] as [unknown, { addOracleId: string }[], number, unknown, { askedCount: number; survivedCount: number; keptCount: number }];
    expect(flagged).toHaveLength(5);
    expect(flagged.map((f) => f.addOracleId)).toEqual(["add0", "add1", "add2", "add3", "add4"]);
    expect(droppedCount).toBe(0);
    expect(report).toEqual({ askedCount: 8, survivedCount: 8, keptCount: 5, hadNotes: false, drops: [] });
  });

  // "Additional notes" (H35, PR 4b): the persisted report says whether THIS run carried any,
  // since the field itself is never saved and `ReadFrom`'s "your notes" line has nothing else
  // to read.
  it("records hadNotes true on a run whose request carried notes", async () => {
    await runTuning(DECK, { anyway: true, notes: "swap out Sol Ring" });
    const [, , , , report] = calls.persisted[0] as [unknown, unknown, unknown, unknown, { hadNotes: boolean }];
    expect(report.hadNotes).toBe(true);
  });

  // Review round 4: proves the mocked `loadPrices`/`readOwnedOracleIds` results actually reach
  // the hard filters through the real wiring, not just that `validateSuggestions` applies them
  // in its own isolated unit tests.
  it("drops a candidate over an active price cap, from the price read's own result", async () => {
    calls.limits = { capCents: 300, sets: [], ownedOnly: false };
    calls.priceRows = new Map([["add0", 1000], ...Array.from({ length: 7 }, (_, i) => [`add${i + 1}`, 100] as const)]);
    await runTuning(DECK, { anyway: true });
    const [, flagged, droppedCount, , report] = calls.persisted[0] as [unknown, { addOracleId: string }[], number, unknown, { askedCount: number; survivedCount: number; keptCount: number }];
    expect(flagged.map((f) => f.addOracleId)).not.toContain("add0");
    expect(flagged).toHaveLength(5);
    expect(droppedCount).toBe(1);
    expect(report).toEqual({
      askedCount: 8, survivedCount: 7, keptCount: 5, hadNotes: false,
      drops: [{ position: 0, rule: "overCap", name: "Add 0" }],
    });
  });

  it("drops an unowned candidate when owned-only is active, from the ownership read's own result", async () => {
    calls.limits = { capCents: null, sets: [], ownedOnly: true };
    calls.ownedIds = new Set(Array.from({ length: 7 }, (_, i) => `add${i + 1}`));
    await runTuning(DECK, { anyway: true });
    const [, flagged, droppedCount, , report] = calls.persisted[0] as [unknown, { addOracleId: string }[], number, unknown, { askedCount: number; survivedCount: number; keptCount: number }];
    expect(flagged.map((f) => f.addOracleId)).not.toContain("add0");
    expect(flagged).toHaveLength(5);
    expect(droppedCount).toBe(1);
    expect(report).toEqual({
      askedCount: 8, survivedCount: 7, keptCount: 5, hadNotes: false,
      drops: [{ position: 0, rule: "notOwned" }],
    });
  });

  // Review round 6: "owned" alone is not "sleeveable" — a collection row with every copy
  // already claimed by another deck must still be dropped, the same rule `fill.ts`'s
  // `pool: "sleeveable"` applies (`a === undefined || a.free > 0`).
  it("drops a candidate the player owns but has no free copy of", async () => {
    calls.limits = { capCents: null, sets: [], ownedOnly: true };
    calls.ownedIds = new Set(Array.from({ length: 8 }, (_, i) => `add${i}`));
    calls.freeCopies = new Map([["add0", 0]]);
    await runTuning(DECK, { anyway: true });
    const [, flagged, droppedCount, , report] = calls.persisted[0] as [unknown, { addOracleId: string }[], number, unknown, { askedCount: number; survivedCount: number; keptCount: number }];
    expect(flagged.map((f) => f.addOracleId)).not.toContain("add0");
    expect(flagged).toHaveLength(5);
    expect(droppedCount).toBe(1);
    expect(report).toEqual({
      askedCount: 8, survivedCount: 7, keptCount: 5, hadNotes: false,
      drops: [{ position: 0, rule: "notOwned" }],
    });
  });

  // Review round 6 (Low): the Set limit's own wiring was untested at the action level — the
  // validator test injects `printedInSelectedSets` directly, and `printed-in.test.ts`
  // reconstructs a separate query, so a regression here (an empty set list reaching the real
  // query, say) would leave both green.
  it("drops a candidate printed outside the deck's selected sets, from the catalog read's own result", async () => {
    calls.limits = { capCents: null, sets: ["lea"], ownedOnly: false };
    calls.catalogRows = (calls.catalogRows as { oracleId: string }[]).map((r) => (r.oracleId === "add0" ? { ...r, printedInSelectedSets: false } : r));
    await runTuning(DECK, { anyway: true });
    const [, flagged, droppedCount, , report] = calls.persisted[0] as [unknown, { addOracleId: string }[], number, unknown, { askedCount: number; survivedCount: number; keptCount: number }];
    expect(flagged.map((f) => f.addOracleId)).not.toContain("add0");
    expect(flagged).toHaveLength(5);
    expect(droppedCount).toBe(1);
    expect(report).toEqual({
      askedCount: 8, survivedCount: 7, keptCount: 5, hadNotes: false,
      drops: [{ position: 0, rule: "offSet" }],
    });
  });

  // An all-dropped run is persisted as "ungrounded" with only a one-line `refusal` the player
  // sees — but the full per-candidate `drops` list is what lets anyone read back WHY every
  // candidate failed without re-running the model (no cost: already computed, pure data).
  it("persists every candidate's own drop reason on an all-dropped (ungrounded) run", async () => {
    calls.limits = { capCents: 300, sets: [], ownedOnly: false };
    calls.priceRows = new Map(Array.from({ length: 8 }, (_, i) => [`add${i}`, 1000] as const));
    await runTuning(DECK, { anyway: true });
    expect(calls.persisted).toHaveLength(0);
    const [, patch] = calls.finished[calls.finished.length - 1] as [
      unknown,
      { status: string; errorClass: string; droppedCount: number; validationReport: { drops: { position: number; rule: string; name?: string }[] } },
    ];
    expect(patch.status).toBe("failed");
    expect(patch.errorClass).toBe("ungrounded");
    expect(patch.droppedCount).toBe(8);
    expect(patch.validationReport.drops).toHaveLength(8);
    expect(patch.validationReport.drops.every((d) => d.rule === "overCap")).toBe(true);
    expect(patch.validationReport.drops.map((d) => d.name)).toEqual(Array.from({ length: 8 }, (_, i) => `Add ${i}`));
  });
});

describe("runTuning's refused reservation", () => {
  it("names the spend cap's pause, the owner's share and the spent allowance apart", async () => {
    const said = async (kind: string) => {
      calls.startKind = kind;
      const result = await runTuning(DECK, { anyway: true });
      return result.ok ? null : result.message;
    };
    expect(await said("paused")).toBe(creditsCopy.pausedServer);
    expect(await said("ownerShare")).toBe(creditsCopy.ownerShare(new Date()));
    expect(await said("allowance")).toBe(deckTuningCopy.allowance.spent);
  });
});

describe("runTuning's `anyway`", () => {
  it("passes the unchanged gate only for the literal true", async () => {
    await runTuning(DECK, { anyway: true });
    expect(calls.started).toBe(1);
  });

  it("treats a truthy non-boolean as absent, so the gate holds", async () => {
    for (const anyway of ["false", "true", 1, {}]) {
      const result = await runTuning(DECK, { anyway } as unknown as { anyway: boolean });
      expect(result.ok).toBe(false);
    }
    expect(calls.started).toBe(0);
  });

  // "Additional notes" (H35, PR 4b, review round 2): the same bypass `anyway` gives — notes are
  // new input the model has never seen, so "unchanged" is not true of this request.
  it("passes the unchanged gate on non-blank notes alone, with no anyway", async () => {
    await runTuning(DECK, { notes: "more removal" });
    expect(calls.started).toBe(1);
  });

  it("does not bypass the unchanged gate on blank or whitespace-only notes", async () => {
    const result = await runTuning(DECK, { notes: "   " });
    expect(result.ok).toBe(false);
    expect(calls.started).toBe(0);
  });
});

describe("ids off the wire", () => {
  it("hands the panel's run id to startRun, and refuses one that is not a uuid", async () => {
    const RUN = "22222222-2222-4222-8222-222222222222";
    await runTuning(DECK, { anyway: true, runId: RUN });
    expect(calls.startOpts).toEqual({ runId: RUN });
    for (const runId of ["not-a-uuid", 7, {}]) {
      const result = await runTuning(DECK, { anyway: true, runId } as unknown as { runId: string });
      expect(result.ok).toBe(false);
    }
    expect(calls.started).toBe(1);
  });

  it("refuses a deck id that is not a uuid before reading anything", async () => {
    expect((await runTuning("not-a-uuid")).ok).toBe(false);
    expect(calls.inputs).toBe(0);
  });

  it("refuses an item id that is not a uuid before writing anything", async () => {
    expect((await applySuggestion("1; drop table")).ok).toBe(false);
    expect(calls.applied).toBe(0);
  });

});

describe("saveDeckDescription's field", () => {
  it("refuses a missing or non-text intent rather than clearing the line", async () => {
    const file = new FormData();
    file.set("intent", new Blob(["x"]), "intent.txt");
    for (const form of [new FormData(), file, null as unknown as FormData]) {
      expect((await saveDeckDescription(DECK, form)).ok).toBe(false);
    }
    expect(calls.saved).toBe(0);
  });

  it("saves a text intent, empty included, since clearing is a real edit", async () => {
    const form = new FormData();
    form.set("intent", "");
    expect((await saveDeckDescription(DECK, form)).ok).toBe(true);
    expect(calls.saved).toBe(1);
  });
});

describe("saveDeckHeader (H35, the pencil's one atomic write)", () => {
  it("writes both fields in one update, scoped to the deck and the reader", async () => {
    const result = await saveDeckHeader(DECK, { name: "New Name", description: "New desc" });
    expect(result.ok).toBe(true);
    expect(calls.headerUpdates).toHaveLength(1);
    expect(calls.headerUpdates[0].set).toMatchObject({ name: "New Name", intent: "New desc", intentSeeded: false });
    // The WHERE must carry BOTH predicates — a deck a reader does not own must never match.
    // Rendered to real SQL rather than inspected as a tree, so dropping either `eq()` call
    // fails this assertion rather than passing against a mock that ignores its argument.
    const where = new PgDialect().sqlToQuery(calls.headerWhere[0] as SQL);
    expect(where.sql).toContain('"decks"."id"');
    expect(where.sql).toContain('"decks"."user_id"');
    expect(where.params).toEqual([DECK, "user_1"]);
  });

  it("sends only the field it was given — the other is left exactly as the row holds it", async () => {
    await saveDeckHeader(DECK, { name: "New Name" });
    expect(calls.headerUpdates[0].set).toMatchObject({ name: "New Name" });
    expect(calls.headerUpdates[0].set).not.toHaveProperty("intent");

    await saveDeckHeader(DECK, { description: "New desc" });
    expect(calls.headerUpdates[1].set).toMatchObject({ intent: "New desc", intentSeeded: false });
    expect(calls.headerUpdates[1].set).not.toHaveProperty("name");
  });

  it("clears an emptied description to null rather than an empty string", async () => {
    await saveDeckHeader(DECK, { description: "   " });
    expect(calls.headerUpdates[0].set).toMatchObject({ intent: null, intentSeeded: false });
  });

  it("refuses when no row matches the deck and the reader together", async () => {
    calls.headerUpdateRows = [];
    const result = await saveDeckHeader(DECK, { name: "New Name" });
    expect(result.ok).toBe(false);
  });

  it("refuses a malformed request rather than throwing", async () => {
    for (const fields of [null, { name: 42 }, { description: 42 }, "not an object"] as const) {
      const result = await saveDeckHeader(DECK, fields as never);
      expect(result.ok).toBe(false);
    }
    expect(calls.headerUpdates).toHaveLength(0);
  });

  it("writes nothing and still answers ok when neither field is given", async () => {
    const result = await saveDeckHeader(DECK, {});
    expect(result.ok).toBe(true);
    expect(calls.headerUpdates).toHaveLength(0);
  });
});

describe("saveDeckLimits (H35 PR 2, \"Kept for this deck\")", () => {
  it("converts whole dollars to cents, scoped to the deck and the reader", async () => {
    const result = await saveDeckLimits(DECK, { capDollars: 25, sets: ["MH3", "lci"], ownedOnly: true });
    expect(result.ok).toBe(true);
    expect(calls.headerUpdates[0].set).toMatchObject({ tuningCapCents: 2500, tuningSets: ["mh3", "lci"], tuningOwnedOnly: true });
    const where = new PgDialect().sqlToQuery(calls.headerWhere[0] as SQL);
    expect(where.sql).toContain('"decks"."id"');
    expect(where.sql).toContain('"decks"."user_id"');
    expect(where.params).toEqual([DECK, "user_1"]);
  });

  it("clears the cap and sets to no limit at all", async () => {
    await saveDeckLimits(DECK, { capDollars: null, sets: [], ownedOnly: false });
    expect(calls.headerUpdates[0].set).toMatchObject({ tuningCapCents: null, tuningSets: [], tuningOwnedOnly: false });
  });

  it("dedupes sets, case-insensitively", async () => {
    await saveDeckLimits(DECK, { capDollars: null, sets: ["mh3", "MH3", "lci"], ownedOnly: false });
    expect(calls.headerUpdates[0].set).toMatchObject({ tuningSets: ["mh3", "lci"] });
  });

  it("refuses a cap out of bounds, zero, or non-integer", async () => {
    for (const capDollars of [0, -5, 1.5, 100_001]) {
      const result = await saveDeckLimits(DECK, { capDollars, sets: [], ownedOnly: false });
      expect(result.ok).toBe(false);
    }
    expect(calls.headerUpdates).toHaveLength(0);
  });

  it("refuses a malformed request rather than throwing", async () => {
    for (const fields of [
      null, "not an object", { capDollars: "25", sets: [], ownedOnly: false },
      { capDollars: null, sets: "mh3", ownedOnly: false }, { capDollars: null, sets: [1], ownedOnly: false },
      { capDollars: null, sets: [], ownedOnly: "yes" },
    ] as const) {
      const result = await saveDeckLimits(DECK, fields as never);
      expect(result.ok).toBe(false);
    }
    expect(calls.headerUpdates).toHaveLength(0);
  });

  it("refuses when no row matches the deck and the reader together", async () => {
    calls.headerUpdateRows = [];
    const result = await saveDeckLimits(DECK, { capDollars: null, sets: [], ownedOnly: false });
    expect(result.ok).toBe(false);
  });

  // Pre-open review round 2: each control autosaves on its own debounce, so sending all three
  // every time let one tab's cap edit carry another tab's stale sets/owned-only back over
  // whatever that tab had since saved. Only the field actually named is ever written.
  it("writes only the field it is given, leaving the others untouched", async () => {
    await saveDeckLimits(DECK, { capDollars: 25 });
    expect(calls.headerUpdates[0].set).toMatchObject({ tuningCapCents: 2500 });
    expect(calls.headerUpdates[0].set).not.toHaveProperty("tuningSets");
    expect(calls.headerUpdates[0].set).not.toHaveProperty("tuningOwnedOnly");
  });

  it("writes only ownedOnly when that is the only field given", async () => {
    await saveDeckLimits(DECK, { ownedOnly: true });
    expect(calls.headerUpdates[0].set).toMatchObject({ tuningOwnedOnly: true });
    expect(calls.headerUpdates[0].set).not.toHaveProperty("tuningCapCents");
    expect(calls.headerUpdates[0].set).not.toHaveProperty("tuningSets");
  });

  it("is a no-op that still answers ok when given no fields at all", async () => {
    const result = await saveDeckLimits(DECK, {});
    expect(result.ok).toBe(true);
    expect(calls.headerUpdates).toHaveLength(0);
  });

  it("still refuses an out-of-bounds cap even when it is the only field given", async () => {
    const result = await saveDeckLimits(DECK, { capDollars: 0 });
    expect(result.ok).toBe(false);
    expect(calls.headerUpdates).toHaveLength(0);
  });

  // Pre-open review round 4 (previously missed): a single letter, a space, or a NUL byte were
  // all accepted — persisted as an unmatchable filter, or made Postgres reject the update
  // outright rather than ever returning this action's own refusal.
  it("refuses a malformed set code rather than persisting it or reaching Postgres", async () => {
    for (const sets of [["x"], ["bad code"], ["mh\u0000"], ["toolongcode9"]]) {
      const result = await saveDeckLimits(DECK, { sets });
      expect(result.ok).toBe(false);
    }
    expect(calls.headerUpdates).toHaveLength(0);
  });

  it("still accepts a well-formed set code at each bound", async () => {
    await saveDeckLimits(DECK, { sets: ["mh", "lcisomhc"] });
    expect(calls.headerUpdates[0].set).toMatchObject({ tuningSets: ["mh", "lcisomhc"] });
  });

  // Review round 6: the shape check bounds each code, not the array — an unbounded Sets answer
  // is serialized twice into a paid model request and once into SQL every run. Bounded the same
  // way the create flow bounds its own Sets answer (MAX_SETS).
  it("refuses more than MAX_SETS codes, though every one is individually well-formed", async () => {
    const result = await saveDeckLimits(DECK, { sets: Array.from({ length: 9 }, (_, i) => `s${i}`) });
    expect(result.ok).toBe(false);
    expect(calls.headerUpdates).toHaveLength(0);
  });

  it("still accepts exactly MAX_SETS codes", async () => {
    await saveDeckLimits(DECK, { sets: Array.from({ length: 8 }, (_, i) => `s${i}`) });
    expect(calls.headerUpdates).toHaveLength(1);
  });
});

// Locked (never cut): every card but the commander locked. Refused by the gate, BEFORE `startRun`
// reserves a credit, and even with "anyway": the panel's "No credit is used." is the server's truth.
describe("runTuning with every card locked", () => {
  it("refuses before any credit is reserved, anyway or not", async () => {
    calls.allLocked = "Kykar, Wind's Fury";
    const expected = { ok: false, message: lockedCardsCopy.tuning.allLocked("Kykar, Wind's Fury") };
    expect(await runTuning(DECK)).toEqual(expected);
    expect(await runTuning(DECK, { anyway: true })).toEqual(expected);
    expect(calls.started).toBe(0);
  });

  // The last card locked AFTER the gate's snapshot: `startRun` re-checks under the deck row lock
  // and refuses inside its transaction, so nothing is reserved; the action says why.
  it("says why when startRun finds every card locked under its lock", async () => {
    calls.startKind = "allLocked";
    expect(await runTuning(DECK, { anyway: true })).toEqual({
      ok: false, message: lockedCardsCopy.tuning.allLocked("Kykar, Wind's Fury"),
    });
    expect(calls.started).toBe(1);
  });
});
