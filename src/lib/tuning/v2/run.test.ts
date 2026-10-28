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
  failResolve: false,
  reaped: 0,
  streamed: 0,
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
  s.failResolve = false;
  s.reaped = 0;
  s.streamed = 0;
});

describe("parseV2Wire", () => {
  it("reads a count, a request and a bracket choice off the closed sets, and nothing else", () => {
    expect(parseV2Wire({ requestedCount: 20, request: "ramp", bracket: { choice: "up", target: 4 }, confirmed: true }))
      .toEqual({ requestedCount: 20, request: "ramp", bracket: { choice: "up", target: 4 }, confirmed: true });
    expect(parseV2Wire({ requestedCount: 1, bracket: null })).toEqual({ requestedCount: 1, request: undefined, bracket: null, confirmed: false });
    for (const bad of [
      { requestedCount: 0 }, { requestedCount: 2.5 }, { requestedCount: 5, request: null },
      { requestedCount: 5, bracket: { choice: "keep", target: 0 } }, { requestedCount: 5, bracket: { choice: "Keep", target: 3 } },
      { requestedCount: 5, bracket: "keep" },
    ]) expect(parseV2Wire(bad)).toBeNull();
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
    const adds = STUB_ADDITIONS.slice(0, 3).map((n) => `line add ${n}`);
    const cuts = body.slice(0, 3).map((n) => `line cut ${n}`);
    expect(s.events).toEqual([...adds, "in add true", ...cuts, "in cut true"]);
    const [handle, outcome, report, settleAs] = s.persisted[0] as [unknown, unknown, { keptCount: number; v2: Record<string, unknown> }, string];
    expect(handle).toEqual({ runId: "run_1", callId: "call_1" });
    expect(outcome).toEqual({ status: "ok" });
    expect(settleAs).toBe("spent");
    expect(report.keptCount).toBe(6);
    expect(report.v2).toMatchObject({ in: { add: true, cut: true }, callCount: 2 });
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
