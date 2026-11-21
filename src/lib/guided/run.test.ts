import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  deck: null as unknown,
  strategies: [] as unknown[],
  pool: { entries: [{ oracleId: "p1", name: "P1", cents: 100 }], prompt: [] as unknown[] },
  started: { kind: "started", runId: "run-1", callId: "call-1" } as Record<string, unknown>,
  report: null as unknown,
  finish: vi.fn(),
  overview: vi.fn(),
  startArgs: [] as unknown[],
  engineArgs: [] as unknown[],
}));

const reval = vi.hoisted(() => vi.fn());
vi.mock("../decks/revalidate-claims", () => ({ revalidateClaims: reval }));
vi.mock("../model/client", () => ({ callModel: vi.fn() }));
vi.mock("./inputs", () => ({
  loadGuidedDeck: async () => h.deck,
  guidedStrategies: async () => h.strategies,
  loadGuidedPool: async () => ({ deck: { prompt: [], entries: [] }, pool: h.pool }),
}));
vi.mock("./store", () => ({
  reapGuided: async () => 0,
  startGuided: async (...a: unknown[]) => { h.startArgs.push(a); return h.started; },
  finishGuided: (...a: unknown[]) => { h.finish(...a); return Promise.resolve(true); },
}));
vi.mock("./overview", () => ({ overviewAfterGuidedRun: (...a: unknown[]) => h.overview(...a) }));
vi.mock("../precons/upgrade/engine", () => ({ runUpgrade: async (a: unknown) => { h.engineArgs.push(a); if (h.report instanceof Error) throw h.report; return h.report; } }));
vi.mock("../precons/upgrade/prompt", () => ({ buildUpgradePrompt: () => ({ system: "s", user: "u" }), upgradeReplySchema: {} }));
vi.mock("../precons/upgrade/run", () => ({
  bracketOf: async () => 2, bracketsOf: async () => ({}), lineBrackets: async () => new Map(), lineBracketsOrNone: async () => new Map(),
  partnersOrBare: async (_f: unknown, _l: unknown, pairs: unknown[]) => pairs,
}));
vi.mock("../precons/upgrade/swap-partners", () => ({ readSwapPartners: async () => new Map() }));

import { beginGuided, type GuidedPicks } from "./run";

const env = {} as NodeJS.ProcessEnv;
const picks: GuidedPicks = { strategyKey: "s1", bracket: 3, poolMode: "owned", budgetCents: null, kept: ["k1", "nope"] };
const deck = { deckName: "Atraxa", commanderIds: ["c"], lines: [{ oracleId: "c", name: "C", isCommander: true, quantity: 1 }, { oracleId: "k1", name: "K1", isCommander: false, quantity: 1 }] };
const pairs = (n: number) => Array.from({ length: n }, (_, i) => ({ cutId: `c${i}`, cut: "c", addId: `a${i}`, add: "a", addCents: 1, reason: "r", cutReason: null, position: i }));
const report = (over: Record<string, unknown>) => ({ failed: null, pairs: pairs(12), drops: [], buyTotalCents: 12, calls: 1, charge: { outcome: "spent" }, ...over });

describe("beginGuided", () => {
  beforeEach(() => {
    h.deck = deck;
    h.strategies = [{ key: "s1", label: "S1", blurb: "b", backing: [{ oracleId: "x", name: "X" }] }];
    h.started = { kind: "started", runId: "run-1", callId: "call-1" };
    reval.mockReset(); h.finish.mockReset(); h.overview.mockReset(); h.startArgs.length = 0; h.engineArgs.length = 0;
    h.pool = { entries: [{ oracleId: "p1", name: "P1", cents: 100 }], prompt: [] };
  });

  it("refuses a deck that is not the reader's, a strategy not offered, and a bad budget, before any start", async () => {
    h.deck = null;
    expect(await beginGuided("u", "d", picks, env)).toEqual({ ok: false, reason: "notFound" });
    h.deck = deck;
    expect(await beginGuided("u", "d", { ...picks, strategyKey: "zzz" }, env)).toEqual({ ok: false, reason: "notOffered" });
    expect(await beginGuided("u", "d", { ...picks, poolMode: "budget", budgetCents: 5 }, env)).toEqual({ ok: false, reason: "notOffered" });
    expect(await beginGuided("u", "d", { ...picks, poolMode: "nope" }, env)).toEqual({ ok: false, reason: "notOffered" });
    expect(h.startArgs).toHaveLength(0);
  });

  it("refuses an empty pool without reserving credits", async () => {
    h.pool = { entries: [], prompt: [] };
    expect(await beginGuided("u", "d", picks, env)).toEqual({ ok: false, reason: "noPool" });
    expect(h.startArgs).toHaveLength(0);
  });

  it("passes the store's refusals through, mapping in_flight", async () => {
    h.started = { kind: "allowance" };
    expect(await beginGuided("u", "d", picks, env)).toEqual({ ok: false, reason: "allowance" });
    h.started = { kind: "in_flight" };
    expect(await beginGuided("u", "d", picks, env)).toEqual({ ok: false, reason: "inFlight" });
  });

  it("keeps only cards of this deck as kept, and hands them to the engine", async () => {
    h.report = report({});
    const b = await beginGuided("u", "d", picks, env);
    if (!b.ok) throw new Error("not started");
    expect((h.startArgs[0] as unknown[][])[2]).toMatchObject({ kept: ["k1"] });
    await b.run();
    expect([...(h.engineArgs[0] as { kept: Set<string> }).kept]).toEqual(["k1"]);
  });

  it("settles a 12-pair run as spent and writes its Overview", async () => {
    h.report = report({});
    const b = await beginGuided("u", "d", picks, env);
    if (!b.ok) throw new Error("not started");
    await b.run();
    expect(h.finish.mock.calls[0][1]).toMatchObject({ status: "done", refunded: false });
    expect(h.overview).toHaveBeenCalledOnce();
    expect(reval).toHaveBeenCalledWith("d", "u");
  });

  it("refuses a crafted shape instead of throwing", async () => {
    expect(await beginGuided("u", "d", null as never, env)).toEqual({ ok: false, reason: "notOffered" });
    expect(await beginGuided("u", "d", { ...picks, kept: 5 as never }, env)).toEqual({ ok: false, reason: "notOffered" });
    expect(await beginGuided("u", "d", { ...picks, kept: Array(100).fill("x") }, env)).toEqual({ ok: false, reason: "notOffered" });
    expect(h.startArgs).toHaveLength(0);
  });

  it.each(["short", "ungrounded", "bracket"] as const)("refunds a %s run and writes no Overview", async (why) => {
    h.report = report({ pairs: pairs(why === "ungrounded" ? 0 : 5), charge: { outcome: "refunded", why }, failed: why === "ungrounded" ? "ungrounded" : null });
    const b = await beginGuided("u", "d", picks, env);
    if (!b.ok) throw new Error("not started");
    await b.run();
    expect(h.overview).not.toHaveBeenCalled();
    if (why === "ungrounded") expect(h.finish.mock.calls[0][1]).toMatchObject({ status: "failed" });
    else expect(h.finish.mock.calls[0][1]).toMatchObject({ status: "done", refunded: true });
  });

  it("settles a thrown engine as failed, never leaving the row pending", async () => {
    h.report = new Error("boom");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const b = await beginGuided("u", "d", picks, env);
    if (!b.ok) throw new Error("not started");
    await b.run();
    expect(h.finish.mock.calls[0][1]).toMatchObject({ status: "failed" });
    warn.mockRestore();
  });
});
