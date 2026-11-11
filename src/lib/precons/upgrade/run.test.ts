import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";

import { assembleDeck, assemblePool, optionFor, withCommanders, type CommanderOption, type DeckLine, type PoolRow } from "./inputs";
import type { UpgradeBase, UpgradeLoad } from "./load";
import type { UpgradeReply } from "./prompt";

vi.mock("../../../db", () => ({ db: {} }));
// The live `bracketOf` is exercised with these stand-ins: what it hands the verdict is what is asserted, the verdict itself is `slotDeck`'s.
vi.mock("../../decks/tuning-read", () => ({
  readOwnedOracleIds: async () => new Set<string>(),
  swapped: (list: { oracleId: string; quantity: number }[], s: { cutOracleId: string | null; addOracleId: string | null }) =>
    [...list.filter((c) => c.oracleId !== s.cutOracleId), ...(s.addOracleId ? [{ oracleId: s.addOracleId, quantity: 1 }] : [])],
}));
vi.mock("../../profile/load", () => ({ loadDeckProfileFromHead: vi.fn(async (head: unknown) => ({ head })) }));
vi.mock("../../bracket/slot", () => ({
  slotDeck: (p: { head: { cards: { oracleId: string }[] } }) => ({ permits: p.head.cards.some((c) => c.oracleId === "p0") ? [3] : [1, 2] }),
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

const fields = { manaCost: null, keywords: [], cmc: 3, commanderLegal: true, quantity: 1, colorIdentity: ["U"] } as const;
const deckLines: DeckLine[] = [
  { ...fields, oracleId: "cmd", name: "Boss", typeLine: "Legendary Creature", oracleText: null, isCommander: true },
  { ...fields, oracleId: "alt", name: "Sidekick", typeLine: "Legendary Creature — Alien", oracleText: null, isCommander: false },
  ...Array.from({ length: 20 }, (_, i): DeckLine => ({ ...fields, oracleId: `n${i}`, name: `Native ${i}`, typeLine: "Creature", oracleText: i >= 10 && i < 16 ? "It deals 3 damage to any target." : null, isCommander: false })),
];
const poolRows: PoolRow[] = Array.from({ length: 20 }, (_, i): PoolRow => ({ oracleId: `p${i}`, name: `Pool ${i}`, manaCost: null, typeLine: "Instant", oracleText: null, keywords: [], inclusion: 50 - i }));
const prices = new Map<string, number | null>(poolRows.map((r) => [r.oracleId, 300]));
const burn = { slug: "burn", label: "Burn", count: 30 };

const base = (opts: { alternate?: boolean } = {}): UpgradeBase => {
  const meta = new Map([["alt", { prose: "Burns everything.", tags: [burn] }]]);
  return {
    fileName: "boss.json", deckName: "Boss Deck", lines: deckLines,
    options: [optionFor(deckLines, ["cmd"], true, new Map()), ...(opts.alternate ? [optionFor(deckLines, ["alt"], false, meta)] : [])],
    overview: [{ label: "The Overview's plan", blurb: "Play the natives.", cardIds: ["n0", "n1", "n2", "n3", "n4", "n5"] }],
  };
};
const loadFor = async (b: UpgradeBase, option: CommanderOption): Promise<UpgradeLoad> => {
  const lines = withCommanders(b.lines, option.commanderIds);
  return {
    fileName: b.fileName, deckName: b.deckName, option, formerCommander: option.isFace ? null : "Boss", commanderIds: option.commanderIds,
    deck: assembleDeck(lines, new Map()), pool: assemblePool(poolRows, prices, new Set(lines.map((l) => l.oracleId))),
  };
};
const load = () => loadFor(base(), base().options[0]);

const swaps = (n: number): UpgradeReply => ({ swaps: Array.from({ length: n }, (_, i) => ({ out: `Native ${i + 6}`, in: `Pool ${i}`, reason: "Fits the plan." })) });

function deps(reply: UpgradeReply | { fail: "upstream_busy" } | "throw", alternate = false) {
  const call = vi.fn(async () => {
    if (reply === "throw") throw new Error("boom");
    if ("fail" in reply) return { ok: false as const, errorClass: reply.fail };
    return { ok: true as const, value: reply, usage: USAGE };
  });
  return { call, d: { base: async () => base({ alternate }), loadFor, call, bracketOf: vi.fn(async (_l: unknown, pairs: readonly unknown[]) => (pairs.length === 0 ? 2 : 3)), bracketsOf: async () => ({ gameChangers: [], massLandDenial: [], twoCardCombos: [], plays: 3 as const }), facts: async () => new Map(), owned: async () => new Set<string>(), now: () => NOW } };
}

beforeEach(() => {
  store.started = { kind: "started", runId: "run-1", callId: "call-1" };
  store.finished.length = 0;
  store.runs = [];
  store.start.mockReset();
  store.start.mockImplementation(async () => store.started);
});

describe("readUpgrade", () => {
  it("names each cut's theme and carries the facts of every card a run names, with ownership", async () => {
    const { d } = deps(swaps(12));
    const first = await readUpgrade("u1", "boss.json", d, ENV_VIEW);
    const backed = first!.commanders[0].strategies[0].backing[0];
    store.runs = [{
      id: "r1", status: "done", strategyKey: "cmd/3/overview:0", strategyLabel: "Plan", refunded: false, createdAt: NOW,
      pairs: [{ cutId: backed.oracleId, cut: backed.name, addId: "new-1", add: "New", addCents: 120, reason: "r", position: 1 }, { cutId: "zzz", cut: "Zzz", addId: "new-2", add: "New 2", addCents: 90, reason: "r", position: 2 }],
      buyTotalCents: 210, bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "x",
    }];
    const facts = async (ids: readonly string[]) => new Map(ids.filter((i) => i === "new-1").map((i) => [i, { cmc: 1, identity: ["U"], art: "u" }]));
    const panel = await readUpgrade("u1", "boss.json", { ...d, facts, owned: async (_u: string, ids: readonly string[]) => new Set(ids.filter((i) => i === "new-2")) }, ENV_VIEW);
    expect(panel!.runs[0].themes).toEqual({ [backed.oracleId]: first!.commanders[0].strategies[0].label });
    expect(panel!.cards["new-1"]).toEqual({ cmc: 1, identity: ["U"], art: "u", owned: false });
    expect(panel!.cards["new-2"]).toMatchObject({ cmc: 0, identity: [], art: null, owned: true });
    expect(panel!.runs[0]).toMatchObject({ toBuy: { cards: 1, cents: 120 }, owned: 1 });
    store.runs = [];
  });

  it("offers the deck's strategies with their backing cards and no call", async () => {
    const { d, call } = deps(swaps(12));
    const panel = await readUpgrade("u1", "boss.json", d, ENV_VIEW);
    expect(panel?.commanders.map((c) => [c.key, c.isFace, c.strategies.map((s) => [s.key, s.backing.length])])).toEqual([["cmd", true, [["overview:0", 6]]]]);
    expect(call).not.toHaveBeenCalled();
  });
});

describe("pressUpgrade", () => {
  it("runs the picked strategy, computes the bracket in code and settles the credits spent", async () => {
    const { d, call } = deps(swaps(12));
    store.runs = [{ id: "run-1", status: "done", pairs: [], strategyKey: "cmd/3/overview:0" }];
    const out = await pressUpgrade("u1", "boss.json", "cmd", 3, "overview:0", d, ENV_VIEW);
    expect(out.ok).toBe(true);
    expect(call).toHaveBeenCalledTimes(1);
    expect(store.start).toHaveBeenCalledWith("u1", "boss.json", { key: "cmd/3/overview:0", label: "The Overview's plan", bracketTarget: 3, listFp: expect.any(String) }, expect.any(String), NOW);
    const { write, billed } = store.finished[0];
    expect(write).toMatchObject({ status: "done", refunded: false, calls: 1, bracketBefore: 2, bracketAfter: 3, buyTotalCents: 3600 });
    expect((write.pairs as unknown[]).length).toBe(12);
    expect(billed).toHaveLength(1);
  });

  it("refuses a strategy the deck did not offer before anything is reserved", async () => {
    const { d, call } = deps(swaps(12));
    expect(await pressUpgrade("u1", "boss.json", "cmd", 3, "tokens", d, ENV_VIEW)).toEqual({ ok: false, reason: "notOffered" });
    expect(store.start).not.toHaveBeenCalled();
    expect(call).not.toHaveBeenCalled();
  });

  it("makes no call when the start is refused", async () => {
    const { d, call } = deps(swaps(12));
    for (const [kind, reason] of [["in_flight", "inFlight"], ["current", "current"], ["allowance", "allowance"]] as const) {
      store.started = { kind };
      expect(await pressUpgrade("u1", "boss.json", "cmd", 3, "overview:0", d, ENV_VIEW)).toEqual({ ok: false, reason });
    }
    expect(call).not.toHaveBeenCalled();
    expect(store.finished).toEqual([]);
  });

  it("refunds a failed first call and reports it failed", async () => {
    const { d } = deps({ fail: "upstream_busy" });
    expect(await pressUpgrade("u1", "boss.json", "cmd", 3, "overview:0", d, ENV_VIEW)).toEqual({ ok: false, reason: "failed" });
    expect(store.finished[0].write).toEqual({ status: "failed", errorClass: "upstream_busy" });
  });

  it("refunds a short answer after its one repair, keeping the pairs it has", async () => {
    const { d, call } = deps(swaps(5));
    expect(await pressUpgrade("u1", "boss.json", "cmd", 3, "overview:0", d, ENV_VIEW)).toEqual({ ok: false, reason: "short" });
    expect(call).toHaveBeenCalledTimes(2);
    expect(store.finished[0].write).toMatchObject({ status: "done", refunded: true, calls: 2 });
  });

  it("fails the run and rethrows when the call throws", async () => {
    const { d } = deps("throw");
    await expect(pressUpgrade("u1", "boss.json", "cmd", 3, "overview:0", d, ENV_VIEW)).rejects.toThrow("boom");
    expect(store.finished[0].write).toEqual({ status: "failed", errorClass: "upstream_busy" });
  });
});

describe("the bracket pick", () => {
  it("is not offered below the bracket the box plays at, and reserves nothing", async () => {
    const { d } = deps(swaps(12));
    const out = await pressUpgrade("u1", "boss.json", "cmd", 2, "overview:0", { ...d, bracketOf: async () => 3 }, ENV_VIEW);
    expect(out).toEqual({ ok: false, reason: "notOffered" });
    expect(store.start).not.toHaveBeenCalled();
  });
});

describe("the live bracketOf", () => {
  it("reads the list as it stands and again with the pairs applied, never the commander as a card, and says the bracket it plays at (the highest permitted, 2 to 4)", async () => {
    const l = await load();
    const list = { commanderIds: l.commanderIds, cards: l.deck.cards };
    expect(await LIVE_DEPS.bracketOf(list, [])).toBe(2);
    const pair = { cutId: "n6", cut: "Native 6", addId: "p0", add: "Pool 0", addCents: 300, reason: "x", position: 0 };
    expect(await LIVE_DEPS.bracketOf(list, [pair])).toBe(3);
    const head = vi.mocked(loadDeckProfileFromHead).mock.calls.at(-1)![0];
    expect(head).toMatchObject({ commanderOracleId: "cmd", partnerOracleId: null, declaredBracket: null });
    expect(head.cards.some((c) => c.oracleId === "cmd")).toBe(false);
    expect(head.cards.some((c) => c.oracleId === "n6")).toBe(false);
  });
});

describe("the input ceiling", () => {
  it("refuses before anything is reserved when the prompt would pass it", async () => {
    const big = await load();
    const huge = "word ".repeat(40_000);
    big.deck = assembleDeck(deckLines.map((l, i) => (i === 1 ? { ...l, oracleText: huge } : l)), new Map());
    const { call } = deps(swaps(12));
    const out = await pressUpgrade("u1", "boss.json", "cmd", 3, "overview:0", { base: async () => base(), loadFor: async () => big, call, bracketOf: async () => 2, bracketsOf: async () => ({ gameChangers: [], massLandDenial: [], twoCardCombos: [], plays: 3 as const }), facts: async () => new Map(), owned: async () => new Set<string>(), now: () => NOW }, ENV_VIEW);
    expect(out).toEqual({ ok: false, reason: "tooBig" });
    expect(store.start).not.toHaveBeenCalled();
  });
});

describe("the alternate commander", () => {
  it("is offered as a first step only when the deck backs a strategy under it, with its own line and no Overview plan", async () => {
    const { d } = deps(swaps(12), true);
    const panel = await readUpgrade("u1", "boss.json", d, ENV_VIEW);
    expect(panel?.commanders.map((c) => [c.key, c.isFace, c.line, c.strategies.map((s) => s.key)])).toEqual([
      ["cmd", true, null, ["overview:0"]],
      ["alt", false, "Burns everything.", ["burn"]],
    ]);
  });

  it("is left out when no strategy is backed under it", async () => {
    const b = base({ alternate: true });
    b.options[1] = { ...b.options[1], tags: [] };
    const panel = await readUpgrade("u1", "boss.json", { ...deps(swaps(12)).d, base: async () => b }, ENV_VIEW);
    expect(panel?.commanders.map((c) => c.key)).toEqual(["cmd"]);
  });

  it("runs with the alternate as commander and the box's commander among the 99, stored under its own key", async () => {
    const { d, call } = deps(swaps(12), true);
    store.runs = [{ id: "run-1", status: "done", pairs: [], strategyKey: "alt/3/burn" }];
    const out = await pressUpgrade("u1", "boss.json", "alt", 3, "burn", d, ENV_VIEW);
    expect(out.ok).toBe(true);
    expect(store.start).toHaveBeenCalledWith("u1", "boss.json", { key: "alt/3/burn", label: "Burn", bracketTarget: 3, listFp: expect.any(String) }, expect.any(String), NOW);
    const user = (call.mock.calls[0] as unknown as [{ user: string }])[0].user;
    expect(user).toContain("Commander: Sidekick");
    expect(user).toContain("leads with Sidekick instead of the box's commander Boss");
    expect(user).toContain("Boss | ");
  });

  it("refuses a commander the deck did not offer, and a strategy offered under another commander", async () => {
    const { d } = deps(swaps(12));
    expect(await pressUpgrade("u1", "boss.json", "alt", 3, "burn", d, ENV_VIEW)).toEqual({ ok: false, reason: "notOffered" });
    const { d: d2 } = deps(swaps(12), true);
    expect(await pressUpgrade("u1", "boss.json", "cmd", 3, "burn", d2, ENV_VIEW)).toEqual({ ok: false, reason: "notOffered" });
    expect(store.start).not.toHaveBeenCalled();
  });

  it("refuses before anything is reserved when the commander's own list gives no pool", async () => {
    const { d } = deps(swaps(12), true);
    const out = await pressUpgrade("u1", "boss.json", "alt", 3, "burn", { ...d, loadFor: async (b, o) => ({ ...(await loadFor(b, o)), pool: { prompt: [], entries: [] } }) }, ENV_VIEW);
    expect(out).toEqual({ ok: false, reason: "noPool" });
    expect(store.start).not.toHaveBeenCalled();
  });

  it("compares a run led by the alternate against the box as shipped", async () => {
    const { d } = deps(swaps(12), true);
    store.runs = [{ id: "run-1", status: "done", pairs: [], strategyKey: "alt/3/burn" }];
    await pressUpgrade("u1", "boss.json", "alt", 3, "burn", d, ENV_VIEW);
    expect(d.bracketOf).toHaveBeenNthCalledWith(1, expect.objectContaining({ commanderIds: ["cmd"] }), []);
    expect(d.bracketOf).toHaveBeenNthCalledWith(2, expect.objectContaining({ commanderIds: ["alt"] }), expect.any(Array));
  });
});

