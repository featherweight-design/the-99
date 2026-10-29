import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildPlayGroup } from "../../profile/play";
import type { EvidencePack } from "../evidence";
import { STUB_ADDITIONS } from "../stub";

// Suggested changes v2's run (plan 2026-10-27, PR 3), from the press to the settle, with the database stood in for and
// the model replaced by the staged stub: the engine, the validator and the stub's own lines are the real ones.
const s = vi.hoisted(() => ({
  inputs: null as unknown,
  last: [] as unknown[],
  start: { kind: "started", runId: "run_1", callId: "call_1" } as Record<string, unknown>,
  started: [] as unknown[][],
  events: [] as string[],
  persisted: [] as unknown[][],
  failed: [] as unknown[][],
  failInsert: false,
  goneRun: false,
  failResolve: false,
  reaped: 0,
  streamed: 0,
  // Each stub call's stage, in order, and a stand-in the test may put in place of the staged stub's answer.
  calls: [] as string[],
  custom: null as null | ((req: { stage: string; ask: number }) => { deltas: AsyncIterable<string>; outcome: Promise<{ ok: true }> }),
  // A catalog read naming `slowName` waits on this gate; `reads` lists every read's names.
  slowName: null as string | null,
  gate: null as Promise<void> | null,
  reads: [] as string[][],
  lines: [] as { addOracleId: string | null; cutOracleId: string | null; evidence: { kind: string; value: string }[] }[],
  runStrategy: null as unknown,
  addCards: new Map<string, unknown>(),
}));

vi.mock("../stub", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../stub")>();
  return {
    ...actual,
    stagedStubOutcome: (env: Record<string, string | undefined>, names: { adds: readonly string[]; cuts: readonly string[] }) => {
      const real = actual.stagedStubOutcome(env, names);
      if (!real) return null;
      return (req: { stage: string; ask: number }) => {
        s.calls.push(req.stage);
        return (s.custom ?? real)(req as never);
      };
    },
  };
});
vi.mock("../../strategy/candidates", () => ({
  loadFocusCandidates: async () => [],
  planFocusCandidates: async () => ({ shortlist: undefined, candidates: [], ownedNone: false }),
}));
vi.mock("../../strategy/run", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../strategy/run")>()),
  loadRunStrategy: async () => s.runStrategy,
  loadAddCards: async (ids: string[]) => new Map(ids.flatMap((id) => (s.addCards.has(id) ? [[id, s.addCards.get(id)]] : []))),
}));

vi.mock("../../../db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => s.last }) }) }) }) },
}));
vi.mock("../../decks/tuning-read", () => ({
  tuningInputs: async () => s.inputs,
  profileOfHead: async () => ({
    cards: pack.cards.map((c) => ({ oracleId: c.oracleId })), skeleton: { staples: [], condition: null, roleBasis: null },
    commanderOracleIds: ["cmd"], colours: { identity: ["G"] },
  }),
  readOwnedOracleIds: async () => new Set<string>(),
  readTuningContext: async () => ({ overview: null, universal: [] }),
  suggestedRunsOfDeck: () => undefined,
  withBracketAfter: async (_h: unknown, _p: unknown, _d: unknown, lines: { addOracleId: string | null }[]) =>
    lines.map((l) => ({ ...l, bracketAfter: l.addOracleId === "gc" ? [3, 4] : null })),
}));
vi.mock("../../intake/fill-facts", () => ({
  loadBracketGateFacts: async (ids: string[]) => ({
    flagsOf: () => ({ gameChanger: ids[0] === STUB_ADDITIONS[1], massLandDenial: false, extraTurn: false }),
    combosOf: () => [], searches: () => false, reaches: () => false,
  }),
}));
vi.mock("../../model/client", () => ({ streamModel: () => { s.streamed += 1; throw new Error("the stub answers here"); } }));
vi.mock("../reap-runs", () => ({ reapReaderRuns: async () => { s.reaped += 1; } }));
vi.mock("../answer", () => ({
  readResolvedRows: async ({ names }: { names: string[] }) => {
    s.reads.push(names);
    if (s.slowName !== null && names.includes(s.slowName)) await s.gate;
    if (s.failResolve) throw new Error("catalog read failed");
    return names.map((name) => ({
      name, oracleId: name, colorIdentity: [], commanderLegal: true, priceCents: null, printedInSelectedSets: true, owned: false,
    }));
  },
}));
vi.mock("../evidence", () => ({ buildEvidencePack: () => structuredClone(pack) }));
vi.mock("../run-store", () => ({
  startRun: async (...args: unknown[]) => { s.started.push(args); return s.start; },
  insertV2Line: async (_run: string, line: { addOracleId: string | null; cutOracleId: string | null }) => {
    if (s.failInsert) throw new Error("the write failed");
    if (s.goneRun) return false;
    s.lines.push(line as never);
    s.events.push(`line ${line.addOracleId ? `add ${line.addOracleId}` : `cut ${line.cutOracleId}`}`);
    return true;
  },
  markV2Progress: async (_run: string, key: string, side: string, value: boolean) => { s.events.push(`${key} ${side} ${value}`); },
  persistV2: async (...args: unknown[]) => { s.persisted.push(args); return true; },
  failV2Run: async (...args: unknown[]) => { s.failed.push(args); return true; },
}));

import { deckTotal, parseV2Wire, startTuningV2, V2_DECK_TOTAL, type V2Wire } from "./run";
import { requestHash } from "./request-hash";

const body = Array.from({ length: 98 }, (_, i) => `Card ${i + 1}`);
const pack: EvidencePack = {
  commanders: [{ oracleId: "cmd", name: "Commander" }],
  colorIdentity: ["G"],
  cards: [
    { oracleId: "cmd", name: "Commander", typeLine: "Legendary Creature", roles: [], quantity: 1, owned: true, commander: true },
    ...body.map((name) => ({ oracleId: name, name, typeLine: "Creature", roles: [], quantity: 1, owned: true, commander: false })),
  ],
  targets: { roles: [], thin: false },
  staples: [],
  play: buildPlayGroup([]),
  intent: null,
  notes: null,
  year: 2026,
  limits: { capCents: null, sets: [], ownedOnly: false },
} as unknown as EvidencePack;

const head = {
  deckId: "deck_1", userId: "user_1", commanderOracleId: "cmd", partnerOracleId: null, declaredBracket: null,
  cards: [...body, "Basic"].map((oracleId) => ({ oracleId, quantity: 1 })),
};
const inputs = (over: Record<string, unknown> = {}) => ({
  head, games: [], intent: null, declared: null, fingerprint: "fp", readVersion: 3, locked: [], allLocked: null,
  limits: { capCents: null, sets: [], ownedOnly: false }, focus: null, ...over,
});
const wire = (over: Partial<V2Wire> = {}): V2Wire => ({ requestedCount: 3, request: undefined, bracket: null, confirmed: false, ...over });
const STUB = { TUNING_V2_STUB_DELAY_MS: "1" } as unknown as NodeJS.ProcessEnv;
const start = (over: Partial<Parameters<typeof startTuningV2>[0]> = {}) =>
  startTuningV2({ deckId: "deck_1", userId: "user_1", env: STUB, wire: wire(), request: "", ...over });

beforeEach(() => {
  s.inputs = inputs();
  s.last = [];
  s.start = { kind: "started", runId: "run_1", callId: "call_1" };
  s.started = [];
  s.events = [];
  s.persisted = [];
  s.failed = [];
  s.failInsert = false;
  s.goneRun = false;
  s.failResolve = false;
  s.reaped = 0;
  s.streamed = 0;
  s.calls = [];
  s.custom = null;
  s.slowName = null;
  s.gate = null;
  s.reads = [];
  s.lines = [];
  s.runStrategy = null;
  s.addCards = new Map();
});

/** One staged call's answer: these lines, each after its own wait, then the close. */
function answer(list: "additions" | "cuts", cards: { card: string; waitMs?: number }[]) {
  let done!: () => void;
  const outcome = new Promise<{ ok: true }>((res) => { done = () => res({ ok: true }); });
  const deltas = (async function* () {
    try {
      yield `{"${list}":[`;
      for (let i = 0; i < cards.length; i++) {
        if (cards[i].waitMs) await new Promise((res) => setTimeout(res, cards[i].waitMs));
        yield `${i > 0 ? "," : ""}${JSON.stringify({
          card: cards[i].card, rationale: `${cards[i].card} is a staged line.`, rationaleShort: "A staged line",
          evidence: [{ kind: "decklist", value: "A staged citation" }],
        })}`;
      }
      yield "]}";
    } finally {
      done();
    }
  })();
  return { deltas, outcome };
}

describe("parseV2Wire", () => {
  it("reads a count, a request and a bracket choice off the closed sets, and nothing else", () => {
    expect(parseV2Wire({ requestedCount: 20, request: "ramp", bracket: { choice: "up", target: 4 }, confirmed: true }))
      .toEqual({ requestedCount: 20, request: "ramp", bracket: { choice: "up", target: 4 }, confirmed: true });
    expect(parseV2Wire({ requestedCount: 1, bracket: null })).toEqual({ requestedCount: 1, request: undefined, bracket: null, confirmed: false });
    for (const bad of [
      { requestedCount: 0 }, { requestedCount: 2.5 }, { requestedCount: 5, request: null },
      { requestedCount: 5, bracket: { choice: "keep", target: 0 } }, { requestedCount: 5, bracket: { choice: "Keep", target: 3 } },
      { requestedCount: 5, bracket: "keep" },
      // A range's bottom rides on Keep only, as an integer no higher than its top.
      { requestedCount: 5, bracket: { choice: "up", target: 5, low: 4 } }, { requestedCount: 5, bracket: { choice: "keep", target: 4, low: 5 } },
      { requestedCount: 5, bracket: { choice: "keep", target: 5, low: 0 } },
    ]) expect(parseV2Wire(bad)).toBeNull();
    expect(parseV2Wire({ requestedCount: 5, bracket: { choice: "keep", target: 5, low: 4 } })?.bracket).toEqual({ choice: "keep", target: 5, low: 4 });
  });
});

describe("deckTotal", () => {
  it("counts every copy and each commander that is not also a row, as the profile does", () => {
    expect(deckTotal({ commanderOracleId: "a", partnerOracleId: null, cards: [{ oracleId: "x", quantity: 98 }, { oracleId: "y", quantity: 1 }] })).toBe(V2_DECK_TOTAL);
    expect(deckTotal({ commanderOracleId: "a", partnerOracleId: "b", cards: [{ oracleId: "x", quantity: 98 }] })).toBe(100);
    expect(deckTotal({ commanderOracleId: "a", partnerOracleId: null, cards: [{ oracleId: "a", quantity: 1 }, { oracleId: "x", quantity: 98 }] })).toBe(99);
  });
});

describe("startTuningV2's refusals, all before a credit is reserved", () => {
  it("refuses a deck that is not at size (spec §3)", async () => {
    s.inputs = inputs({ head: { ...head, cards: head.cards.slice(1) } });
    expect(await start()).toMatchObject({ kind: "refused" });
    expect(s.started).toEqual([]);
  });

  it("refuses a deck whose every card is locked", async () => {
    s.inputs = inputs({ allLocked: "Commander" });
    expect(await start()).toMatchObject({ kind: "refused" });
    expect(s.started).toEqual([]);
  });

  it("asks once when the deck and the request both match the newest ok v2 run (G4), naming that run", async () => {
    const hash = requestHash({ count: 3, text: "more draw", bracketChoice: "none", bracketTarget: 0 });
    s.last = [{ id: "run_old", fingerprint: "fp", at: new Date("2026-10-27T10:00:00Z"), requestHash: hash }];
    expect(await start({ request: "more draw" })).toEqual({ kind: "confirm", runId: "run_old", at: "2026-10-27T10:00:00.000Z" });
    expect(s.started).toEqual([]);
    // A different request, a moved deck, or the player's yes: it runs.
    expect(await start({ request: "more removal" })).toMatchObject({ kind: "started" });
    s.last = [{ id: "run_old", fingerprint: "moved", at: new Date(), requestHash: hash }];
    expect(await start({ request: "more draw" })).toMatchObject({ kind: "started" });
    s.last = [{ id: "run_old", fingerprint: "fp", at: new Date(), requestHash: hash }];
    expect(await start({ request: "more draw", wire: wire({ confirmed: true }) })).toMatchObject({ kind: "started" });
  });

  it("does not call Keep over a range the same request as Keep at its top (review round 1)", async () => {
    const top = requestHash({ count: 3, text: "", bracketChoice: "keep", bracketTarget: 5 });
    s.last = [{ id: "run_old", fingerprint: "fp", at: new Date("2026-10-27T10:00:00Z"), requestHash: top }];
    expect(await start({ wire: wire({ bracket: { choice: "keep", target: 5, low: 4 } }) })).toMatchObject({ kind: "started" });
    expect(await start({ wire: wire({ bracket: { choice: "keep", target: 5 } }) })).toMatchObject({ kind: "confirm" });
  });

  it("reserves v2's feature with the count, the request and the bracket choice, after reaping", async () => {
    await start({ request: "more draw", wire: wire({ bracket: { choice: "down", target: 2 } }), runId: "r" });
    expect(s.reaped).toBe(1);
    const [, , fingerprint, readVersion, opts] = s.started[0] as [string, string, string, number, Record<string, unknown>];
    expect([fingerprint, readVersion]).toEqual(["fp", 3]);
    expect(opts).toMatchObject({
      runId: "r",
      v2: {
        requestedCount: 3, requestText: "more draw", bracket: { choice: "down", target: 2 },
        report: { hadNotes: true, v2: { requestHash: requestHash({ count: 3, text: "more draw", bracketChoice: "down", bracketTarget: 2 }) } },
      },
    });
  });

  it("says the start's own refusals", async () => {
    s.start = { kind: "in_flight" };
    expect(await start()).toMatchObject({ kind: "refused" });
  });
});

describe("the v2 run's work", () => {
  async function run(over: Partial<Parameters<typeof startTuningV2>[0]> = {}) {
    const started = await start(over);
    if (started.kind !== "started") throw new Error(`not started: ${started.kind}`);
    const revalidate = vi.fn();
    await started.work(revalidate);
    return revalidate;
  }

  it("saves each addition the moment it is kept, marks the additions in, then the cuts, and settles spent", async () => {
    const revalidate = await run();
    expect(s.streamed).toBe(0);
    // The stub answers each call's own ask, ceil(1.5 × 3) = 5 (not N, which left every list under-produced).
    const adds = STUB_ADDITIONS.slice(0, 5).map((n) => `line add ${n}`);
    const cuts = body.slice(0, 5).map((n) => `line cut ${n}`);
    expect(s.events).toEqual([...adds, "in add true", ...cuts, "in cut true"]);
    const [handle, outcome, report, settleAs] = s.persisted[0] as [unknown, unknown, { keptCount: number; v2: Record<string, unknown> }, string];
    expect(handle).toEqual({ runId: "run_1", callId: "call_1" });
    expect(outcome).toEqual({ status: "ok" });
    expect(settleAs).toBe("spent");
    expect(report.keptCount).toBe(10);
    expect(report.v2).toMatchObject({ in: { add: true, cut: true }, callCount: 2, underProduced: { add: false, cut: false } });
    expect(revalidate).toHaveBeenCalledTimes(1);
  });

  it("Down drops an addition whose card alone bars the target, a restriction the player chose", async () => {
    await run({ wire: wire({ bracket: { choice: "down", target: 2 } }) });
    expect(s.events).not.toContain(`line add ${STUB_ADDITIONS[1]}`);
    const report = (s.persisted[0] as [unknown, unknown, { drops: { rule: string }[] }])[2];
    expect(report.drops.map((d) => d.rule)).toContain("bracketAim");
  });

  it("a failed catalog read fails the run as the app's error, never as the model's malformed reply (pre-open review)", async () => {
    s.failResolve = true;
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await run();
    log.mockRestore();
    expect(s.persisted).toEqual([]);
    expect(s.failed).toHaveLength(1);
  });

  it("makes no further model call once a catalog read has failed (PR #2316 review)", async () => {
    s.failResolve = true;
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await run();
    log.mockRestore();
    // The first call's read failed: no additions refill (which a list kept empty would otherwise start) and no cut call.
    expect(s.calls).toEqual(["additions"]);
    expect(s.failed).toHaveLength(1);
  });

  it("two streams naming a card at once share ONE catalog read, and neither validates before it lands (PR #2316 review)", async () => {
    // Call 1 keeps one addition, so the additions refill and the cut call stream side by side (H2). The cut call names
    // "Shared" first and its read is held; the refill names it while that read is still out.
    let release!: () => void;
    s.gate = new Promise((res) => { release = res; });
    s.slowName = "Shared";
    s.custom = ({ stage }) => {
      if (stage === "additions") return answer("additions", [{ card: "Fresh" }]);
      if (stage === "cuts") return answer("cuts", [{ card: "Shared" }]);
      if (stage === "additionsRefill") return answer("additions", [{ card: "Shared", waitMs: 5 }]);
      return answer("cuts", []);
    };
    setTimeout(() => release(), 30);
    await run({ wire: wire({ requestedCount: 2 }) });
    expect(s.reads.filter((names) => names.includes("Shared"))).toHaveLength(1);
    // The refill's addition validated against the row the cut call's read brought in: kept and saved, never dropped as a
    // card that does not exist.
    expect(s.events).toContain("line add Shared");
    const report = (s.persisted[0] as [unknown, unknown, { drops: { rule: string }[] }])[2];
    expect(report.drops.map((d) => d.rule)).not.toContain("cardExists");
  });

  it("chips each line on a focus run before it is saved, as v10 does (strategyChips)", async () => {
    const add = STUB_ADDITIONS[0];
    s.inputs = inputs({ focus: "tokens" });
    s.runStrategy = {
      key: "tokens", name: "Tokens", copies: 4, top: ["tokens"],
      cards: body.map((oracleId) => ({ oracleId, typeLine: "Creature", manaValue: 2, keywords: [], quantity: 1, themes: [] })),
      names: new Map(body.map((n) => [n, n])),
    };
    s.addCards = new Map([[add, { oracleId: add, typeLine: "Artifact", manaValue: 2, keywords: [], quantity: 1, themes: ["tokens"] }]]);
    await run();
    const added = s.lines.find((l) => l.addOracleId === add)!;
    expect(added.evidence[0]).toEqual({ kind: "focus", value: "Tokens 4 \u2192 5" });
    // An addition off the focus gets no chip; a cut on none of the top strategies leads with the app's own.
    expect(s.lines.find((l) => l.addOracleId === STUB_ADDITIONS[1])!.evidence.some((c) => c.kind === "focus")).toBe(false);
    expect(s.lines.find((l) => l.cutOracleId === body[0])!.evidence[0]).toEqual({ kind: "decklist", value: "on none of the top 1" });
  });

  it("a run that is no longer pending when a line is saved fails, and makes no further call (round 2)", async () => {
    s.goneRun = true;
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await run();
    log.mockRestore();
    expect(s.persisted).toEqual([]);
    expect(s.failed).toHaveLength(1);
  });

  it("a failed line save fails the run the P4 way, never charging, never throwing", async () => {
    s.failInsert = true;
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const revalidate = await run();
    log.mockRestore();
    expect(s.persisted).toEqual([]);
    expect(s.failed).toEqual([[{ runId: "run_1", callId: "call_1" }, []]]);
    expect(revalidate).toHaveBeenCalledTimes(1);
  });
});
