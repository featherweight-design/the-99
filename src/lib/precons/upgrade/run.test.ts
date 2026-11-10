import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";

import { assembleDeck, assemblePool, type DeckLine, type PoolRow } from "./inputs";
import type { UpgradeLoad } from "./load";
import type { UpgradeReply } from "./prompt";

vi.mock("../../../db", () => ({ db: {} }));
// The live `bracketOf` is exercised with these stand-ins: what it hands the verdict is what is asserted, the verdict itself is `slotDeck`'s.
vi.mock("../../decks/tuning-read", () => ({
  swapped: (list: { oracleId: string; quantity: number }[], s: { cutOracleId: string | null; addOracleId: string | null }) =>
    [...list.filter((c) => c.oracleId !== s.cutOracleId), ...(s.addOracleId ? [{ oracleId: s.addOracleId, quantity: 1 }] : [])],
}));
vi.mock("../../profile/load", () => ({ loadDeckProfileFromHead: vi.fn(async (head: unknown) => ({ head })) }));
vi.mock("../../bracket/slot", () => ({
  slotDeck: (p: { head: { cards: { oracleId: string }[] } }) => ({ permits: p.head.cards.some((c) => c.oracleId === "p0") ? [3, 4] : [2] }),
}));
const store = vi.hoisted(() => ({
  started: { kind: "started", runId: "run-1", callId: "call-1" } as { kind: string; runId?: string; callId?: string },
  finished: [] as { write: Record<string, unknown>; billed: unknown }[],
  runs: [] as unknown[],
  start: vi.fn(),
}));
vi.mock("./store", () => ({
  reapUpgrades: vi.fn(async () => 0),
  readUpgrades: vi.fn(async () => store.runs),
  startUpgrade: store.start,
  finishUpgrade: vi.fn(async (_h: unknown, write: Record<string, unknown>, billed: unknown) => { store.finished.push({ write, billed }); return true; }),
}));
vi.mock("../../model/allowance", () => ({
  readAllowance: vi.fn(async () => ({ used: 0, limit: 3, reopensAt: null, nextAt: null })),
}));

const { LIVE_DEPS, pressUpgrade, readUpgrade } = await import("./run");
const { loadDeckProfileFromHead } = await import("../../profile/load");

const NOW = new Date(Date.UTC(2026, 10, 10, 7));
const USAGE = { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 };

const deckLines: DeckLine[] = [
  { oracleId: "cmd", name: "Boss", manaCost: null, typeLine: "Legendary Creature", oracleText: null, keywords: [], quantity: 1, isCommander: true },
  ...Array.from({ length: 20 }, (_, i): DeckLine => ({ oracleId: `n${i}`, name: `Native ${i}`, manaCost: null, typeLine: "Creature", oracleText: null, keywords: [], quantity: 1, isCommander: false })),
];
const poolRows: PoolRow[] = Array.from({ length: 20 }, (_, i): PoolRow => ({ oracleId: `p${i}`, name: `Pool ${i}`, manaCost: null, typeLine: "Instant", oracleText: null, keywords: [], inclusion: 50 - i }));
const prices = new Map<string, number | null>(poolRows.map((r) => [r.oracleId, 300]));

const load = (): UpgradeLoad => ({
  fileName: "boss.json", deckName: "Boss Deck", commanderIds: ["cmd"],
  deck: assembleDeck(deckLines, new Map()),
  deckIds: new Set(deckLines.map((l) => l.oracleId)),
  tags: [],
  overview: [{ label: "The Overview's plan", blurb: "Play the natives.", cardIds: ["n0", "n1", "n2", "n3", "n4", "n5"] }],
  pool: assemblePool(poolRows, prices, new Set(deckLines.map((l) => l.oracleId))),
});

const swaps = (n: number): UpgradeReply => ({ swaps: Array.from({ length: n }, (_, i) => ({ out: `Native ${i + 6}`, in: `Pool ${i}`, reason: "Fits the plan." })) });

function deps(reply: UpgradeReply | { fail: "upstream_busy" } | "throw") {
  const call = vi.fn(async () => {
    if (reply === "throw") throw new Error("boom");
    if ("fail" in reply) return { ok: false as const, errorClass: reply.fail };
    return { ok: true as const, value: reply, usage: USAGE };
  });
  return { call, d: { load: async () => load(), call, bracketOf: vi.fn(async (_l: UpgradeLoad, pairs: readonly unknown[]) => (pairs.length === 0 ? 2 : 3)), now: () => NOW } };
}

beforeEach(() => {
  store.started = { kind: "started", runId: "run-1", callId: "call-1" };
  store.finished.length = 0;
  store.runs = [];
  store.start.mockReset();
  store.start.mockImplementation(async () => store.started);
});

describe("readUpgrade", () => {
  it("offers the deck's strategies with their backing cards and no call", async () => {
    const { d, call } = deps(swaps(12));
    const panel = await readUpgrade("u1", "boss.json", d, ENV_VIEW);
    expect(panel?.strategies.map((s) => [s.key, s.backing.length])).toEqual([["overview:0", 6]]);
    expect(call).not.toHaveBeenCalled();
  });
});

describe("pressUpgrade", () => {
  it("runs the picked strategy, computes the bracket in code and settles the credits spent", async () => {
    const { d, call } = deps(swaps(12));
    store.runs = [{ id: "run-1", status: "done", strategyKey: "overview:0" }];
    const out = await pressUpgrade("u1", "boss.json", "overview:0", d, ENV_VIEW);
    expect(out.ok).toBe(true);
    expect(call).toHaveBeenCalledTimes(1);
    expect(store.start).toHaveBeenCalledWith("u1", "boss.json", { key: "overview:0", label: "The Overview's plan" }, expect.any(String), NOW);
    const { write, billed } = store.finished[0];
    expect(write).toMatchObject({ status: "done", refunded: false, calls: 1, bracketBefore: 2, bracketAfter: 3, buyTotalCents: 3600 });
    expect((write.pairs as unknown[]).length).toBe(12);
    expect(billed).toHaveLength(1);
  });

  it("refuses a strategy the deck did not offer before anything is reserved", async () => {
    const { d, call } = deps(swaps(12));
    expect(await pressUpgrade("u1", "boss.json", "tokens", d, ENV_VIEW)).toEqual({ ok: false, reason: "notOffered" });
    expect(store.start).not.toHaveBeenCalled();
    expect(call).not.toHaveBeenCalled();
  });

  it("makes no call when the start is refused", async () => {
    const { d, call } = deps(swaps(12));
    for (const [kind, reason] of [["in_flight", "inFlight"], ["current", "current"], ["allowance", "allowance"]] as const) {
      store.started = { kind };
      expect(await pressUpgrade("u1", "boss.json", "overview:0", d, ENV_VIEW)).toEqual({ ok: false, reason });
    }
    expect(call).not.toHaveBeenCalled();
    expect(store.finished).toEqual([]);
  });

  it("refunds a failed first call and reports it failed", async () => {
    const { d } = deps({ fail: "upstream_busy" });
    expect(await pressUpgrade("u1", "boss.json", "overview:0", d, ENV_VIEW)).toEqual({ ok: false, reason: "failed" });
    expect(store.finished[0].write).toEqual({ status: "failed", errorClass: "upstream_busy" });
  });

  it("refunds a short answer after its one repair, keeping the pairs it has", async () => {
    const { d, call } = deps(swaps(5));
    expect(await pressUpgrade("u1", "boss.json", "overview:0", d, ENV_VIEW)).toEqual({ ok: false, reason: "short" });
    expect(call).toHaveBeenCalledTimes(2);
    expect(store.finished[0].write).toMatchObject({ status: "done", refunded: true, calls: 2 });
  });

  it("fails the run and rethrows when the call throws", async () => {
    const { d } = deps("throw");
    await expect(pressUpgrade("u1", "boss.json", "overview:0", d, ENV_VIEW)).rejects.toThrow("boom");
    expect(store.finished[0].write).toEqual({ status: "failed", errorClass: "upstream_busy" });
  });
});

describe("the live bracketOf", () => {
  it("reads the list as it stands and again with the pairs applied, never the commander as a card, and says the lowest permitted bracket", async () => {
    const l = load();
    expect(await LIVE_DEPS.bracketOf(l, [])).toBe(2);
    const pair = { cutId: "n6", cut: "Native 6", addId: "p0", add: "Pool 0", addCents: 300, reason: "x", position: 0 };
    expect(await LIVE_DEPS.bracketOf(l, [pair])).toBe(3);
    const head = vi.mocked(loadDeckProfileFromHead).mock.calls.at(-1)![0];
    expect(head).toMatchObject({ commanderOracleId: "cmd", partnerOracleId: null, declaredBracket: null });
    expect(head.cards.some((c) => c.oracleId === "cmd")).toBe(false);
    expect(head.cards.some((c) => c.oracleId === "n6")).toBe(false);
  });
});

describe("the input ceiling", () => {
  it("refuses before anything is reserved when the prompt would pass it", async () => {
    const big = load();
    const huge = "word ".repeat(40_000);
    big.deck = assembleDeck(deckLines.map((l, i) => (i === 1 ? { ...l, oracleText: huge } : l)), new Map());
    const { call } = deps(swaps(12));
    const out = await pressUpgrade("u1", "boss.json", "overview:0", { load: async () => big, call, bracketOf: async () => 2, now: () => NOW }, ENV_VIEW);
    expect(out).toEqual({ ok: false, reason: "tooBig" });
    expect(store.start).not.toHaveBeenCalled();
  });
});

