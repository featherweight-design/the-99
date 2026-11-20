import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";

import { assembleDeck, assemblePool, boxFingerprint, optionFor, withCommanders, type CommanderOption, type DeckLine, type PoolRow } from "./inputs";
import type { UpgradeBase, UpgradeLoad } from "./load";
import type { UpgradeReply } from "./prompt";
import type { LineBrackets, StoredPair, UpgradePair } from "./validate";

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

vi.mock("../../cache/soft-failure", () => ({ recordSoftFailure: vi.fn() }));

const { LIVE_DEPS, LINE_BRACKETS_TIMEOUT_MS, PARTNERS_TIMEOUT_MS, lineBracketsOrNone, partnersOrBare, pressUpgrade, readSetBracket, readUpgrade, setPermits } = await import("./run");
const { recordSoftFailure } = await import("../../cache/soft-failure");
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
  return { call, d: { base: async () => base({ alternate }), loadFor, call, bracketOf: vi.fn(async (_l: unknown, pairs: readonly unknown[]) => (pairs.length === 0 ? 2 : 3)), bracketsOf: async () => ({ gameChangers: [], massLandDenial: [], twoCardCombos: [], plays: 3 as const }), facts: async () => new Map(), decks: async () => new Map(), owned: async () => new Set<string>(), availability: async () => new Map(), partners: vi.fn(async (_l: unknown, pairs: readonly UpgradePair[]): Promise<StoredPair[]> => pairs.map((p) => ({ ...p, cutCombo: null, addCombo: null }))), lineBrackets: vi.fn(async (_l: unknown, pairs: readonly UpgradePair[]): Promise<LineBrackets[] | null> => pairs.map(() => ({ addBracketAfter: null, cutBracketAfter: null }))), now: () => NOW } };
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
      pairs: [{ cutId: backed.oracleId, cut: backed.name, addId: "new-1", add: "New", addCents: 120, reason: "r", cutReason: null, position: 1 }, { cutId: "zzz", cut: "Zzz", addId: "new-2", add: "New 2", addCents: 90, reason: "r", cutReason: null, position: 2 }],
      buyTotalCents: 210, bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "x",
    }];
    const facts = async (ids: readonly string[]) => new Map(ids.filter((i) => i === "new-1").map((i) => [i, { cmc: 1, identity: ["U"] }]));
    const panel = await readUpgrade("u1", "boss.json", { ...d, facts, decks: async () => new Map([["r1", { id: "d1", name: "Rootha Upgraded" }]]), owned: async (_u: string, ids: readonly string[]) => new Set(ids.filter((i) => i === "new-2")) }, ENV_VIEW);
    expect(panel!.runs[0].themes).toEqual({ [backed.oracleId]: first!.commanders[0].strategies[0].label });
    expect(panel!.cards["new-1"]).toEqual({ cmc: 1, identity: ["U"], owned: false });
    expect(panel!.cards["new-2"]).toEqual({ owned: true });
    expect(panel!.runs[0]).toMatchObject({ toBuy: { cards: 1, cents: 120 }, owned: 1, started: true, deck: { id: "d1", name: "Rootha Upgraded" } });
    store.runs = [];
  });

  it("reads an old run's pairs, stored before the partner keys, unchanged, and a new run's partners through", async () => {
    const { d } = deps(swaps(12));
    const old = { cutId: "n6", cut: "Native 6", addId: "p0", add: "Pool 0", addCents: 300, reason: "r", cutReason: null, position: 1 };
    const fresh = { ...old, cutId: "n7", addId: "p1", position: 2, cutCombo: null, addCombo: { oracleId: "n1", name: "Native 1", otherPartners: 2 } };
    store.runs = [{ id: "r1", status: "done", strategyKey: "cmd/3/overview:0", strategyLabel: "Plan", refunded: false, createdAt: NOW, pairs: [old, fresh], buyTotalCents: 600, bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "x" }];
    const panel = await readUpgrade("u1", "boss.json", d, ENV_VIEW);
    expect(panel!.runs[0].pairs).toEqual([old, fresh]);
    expect(panel!.runs[0]).toMatchObject({ toBuy: { cards: 2, cents: 600 }, owned: 0 });
    store.runs = [];
  });

  it("carries a card's bracket facts onto the panel card, and none when it has none", async () => {
    const { d } = deps(swaps(12));
    const facts = async (ids: readonly string[]) => new Map(ids.map((i) => [i, i === "cmd" ? { cmc: 3, identity: ["U"], facts: ["gameChanger" as const, "tutor" as const] } : { cmc: 3, identity: ["U"] }]));
    const panel = await readUpgrade("u1", "boss.json", { ...d, facts }, ENV_VIEW);
    expect(panel!.cards.cmd).toEqual({ cmc: 3, identity: ["U"], facts: ["gameChanger", "tutor"], owned: false });
    expect(Object.values(panel!.cards).filter((c) => c.facts).length).toBe(1);
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

  it("stores each swap's combo partners on the done write, read over the list with the pairs applied", async () => {
    const { d } = deps(swaps(12));
    d.partners.mockImplementation(async (_l, pairs) => pairs.map((p, i) => ({ ...p, cutCombo: null, addCombo: i === 0 ? { oracleId: "n1", name: "Native 1" } : null })));
    store.runs = [{ id: "run-1", status: "done", pairs: [], strategyKey: "cmd/3/overview:0" }];
    expect((await pressUpgrade("u1", "boss.json", "cmd", 3, "overview:0", d, ENV_VIEW)).ok).toBe(true);
    const [list, pairs] = d.partners.mock.calls[0];
    expect(list).toMatchObject({ commanderIds: ["cmd"] });
    expect(pairs).toHaveLength(12);
    const written = store.finished[0].write.pairs as StoredPair[];
    expect(written[0]).toMatchObject({ cutId: pairs[0].cutId, addId: pairs[0].addId, cutCombo: null, addCombo: { oracleId: "n1", name: "Native 1" } });
    expect(written[1]).toMatchObject({ cutCombo: null, addCombo: null });
  });

  it("a partner read that fails, async or sync, stores the pairs with no partner keys and never fails or refunds the run", async () => {
    for (const fail of [async () => { throw new Error("spellbook down"); }, () => { throw new Error("sync"); }] as const) {
      store.finished.length = 0;
      const { d } = deps(swaps(12));
      d.partners.mockImplementation(fail as never);
      store.runs = [{ id: "run-1", status: "done", pairs: [], strategyKey: "cmd/3/overview:0" }];
      const out = await pressUpgrade("u1", "boss.json", "cmd", 3, "overview:0", d, ENV_VIEW);
      expect(out.ok).toBe(true);
      expect(store.finished).toHaveLength(1);
      const { write } = store.finished[0];
      expect(write).toMatchObject({ status: "done", refunded: false });
      const pairs = write.pairs as StoredPair[];
      expect(pairs).toHaveLength(12);
      expect(pairs.every((p) => !("cutCombo" in p) && !("addCombo" in p))).toBe(true);
    }
  });

  it("a partner read that hangs past the timeout finishes the run with bare pairs, never pending, never refunded", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      vi.mocked(recordSoftFailure).mockClear();
      const { d } = deps(swaps(12));
      d.partners.mockImplementation(() => new Promise<StoredPair[]>(() => {}));
      store.runs = [{ id: "run-1", status: "done", pairs: [], strategyKey: "cmd/3/overview:0" }];
      const pending = pressUpgrade("u1", "boss.json", "cmd", 3, "overview:0", d, ENV_VIEW);
      await vi.advanceTimersByTimeAsync(PARTNERS_TIMEOUT_MS);
      const out = await pending;
      expect(out.ok).toBe(true);
      const { write } = store.finished[0];
      expect(write).toMatchObject({ status: "done", refunded: false });
      expect((write.pairs as StoredPair[]).every((p) => !("cutCombo" in p) && !("addCombo" in p))).toBe(true);
      expect(recordSoftFailure).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
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
    const pair = { cutId: "n6", cut: "Native 6", addId: "p0", add: "Pool 0", addCents: 300, reason: "x", cutReason: null, position: 0 };
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
    const out = await pressUpgrade("u1", "boss.json", "cmd", 3, "overview:0", { base: async () => base(), loadFor: async () => big, call, bracketOf: async () => 2, bracketsOf: async () => ({ gameChangers: [], massLandDenial: [], twoCardCombos: [], plays: 3 as const }), facts: async () => new Map(), decks: async () => new Map(), owned: async () => new Set<string>(), availability: async () => new Map(), partners: async () => [], lineBrackets: async () => [], now: () => NOW }, ENV_VIEW);
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


describe("partnersOrBare", () => {
  const list = { commanderIds: ["cmd"], cards: [] };
  const pairs = [{ cutId: "n6", cut: "Native 6", addId: "p0", add: "Pool 0", addCents: 300, reason: "x", cutReason: null, position: 0 }];

  beforeEach(() => { vi.mocked(recordSoftFailure).mockClear(); });

  it("returns the read's pairs when it answers in time, recording nothing", async () => {
    const got = [{ ...pairs[0], cutCombo: null, addCombo: null }];
    expect(await partnersOrBare(async () => got, list, pairs, 50)).toBe(got);
    expect(recordSoftFailure).not.toHaveBeenCalled();
  });

  it("returns the bare pairs and records the fallback on a rejection, a sync throw or a timeout", async () => {
    const reads = [
      async () => { throw new Error("down"); },
      () => { throw new Error("sync"); },
      () => new Promise<StoredPair[]>(() => {}),
    ] as const;
    for (const read of reads) expect(await partnersOrBare(read as never, list, pairs, 10)).toBe(pairs);
    expect(recordSoftFailure).toHaveBeenCalledTimes(3);
  });
});

describe("per-card bracket lines (fresh start R2)", () => {
  const pair = (cutId: string, addId: string, position = 0): UpgradePair => ({ cutId, cut: cutId, addId, add: addId, addCents: 300, reason: "x", cutReason: null, position });

  it("the live read flags each side alone against the list as it stands, as a Suggested changes line: null when it moves nothing", async () => {
    const l = await load();
    const list = { commanderIds: l.commanderIds, cards: l.deck.cards };
    // The stand-in verdict permits [3] only with p0 in the list, else [1, 2].
    expect(await LIVE_DEPS.lineBrackets(list, [pair("n6", "p0"), pair("n7", "p1", 1)])).toEqual([
      { addBracketAfter: [3], cutBracketAfter: null },
      { addBracketAfter: null, cutBracketAfter: null },
    ]);
    // Bounded: the list once, then each add and each cut alone (2N + 1).
    vi.mocked(loadDeckProfileFromHead).mockClear();
    await LIVE_DEPS.lineBrackets(list, [pair("n6", "p0"), pair("n7", "p1", 1)]);
    expect(vi.mocked(loadDeckProfileFromHead).mock.calls).toHaveLength(5);
    // Each read changes exactly one card: the add's list holds the cut too.
    const heads = vi.mocked(loadDeckProfileFromHead).mock.calls.map((c) => c[0].cards.map((x) => x.oracleId));
    expect(heads.some((ids) => ids.includes("p0") && ids.includes("n6"))).toBe(true);
    expect(heads.some((ids) => !ids.includes("n6") && !ids.includes("p0"))).toBe(true);
  });

  it("the live read is null when any profile read fails, never a line that reads as moving nothing", async () => {
    const l = await load();
    const list = { commanderIds: l.commanderIds, cards: l.deck.cards };
    vi.mocked(loadDeckProfileFromHead).mockRejectedValueOnce(new Error("db down"));
    expect(await LIVE_DEPS.lineBrackets(list, [pair("n6", "p0")])).toBeNull();
  });

  it("are stored on the done write, keyed to each pair's add", async () => {
    const { d } = deps(swaps(12));
    d.lineBrackets.mockImplementation(async (_l, pairs) => pairs.map((p) => ({ addBracketAfter: p.addId === "p0" ? [3] : null, cutBracketAfter: null })));
    store.runs = [{ id: "run-1", status: "done", pairs: [], strategyKey: "cmd/3/overview:0" }];
    store.finished.length = 0;
    expect((await pressUpgrade("u1", "boss.json", "cmd", 3, "overview:0", d, ENV_VIEW)).ok).toBe(true);
    const written = store.finished[0].write.pairs as StoredPair[];
    expect(written.find((p) => p.addId === "p0")).toMatchObject({ addBracketAfter: [3], cutBracketAfter: null, cutCombo: null });
    expect(written.find((p) => p.addId === "p1")).toMatchObject({ addBracketAfter: null, cutBracketAfter: null });
  });

  it("a read that fails, throws or miscounts stores the pairs without them and never fails the run", async () => {
    for (const fail of [async () => null, async () => { throw new Error("down"); }, () => { throw new Error("sync"); }, async () => []] as const) {
      store.finished.length = 0;
      const { d } = deps(swaps(12));
      d.lineBrackets.mockImplementation(fail as never);
      store.runs = [{ id: "run-1", status: "done", pairs: [], strategyKey: "cmd/3/overview:0" }];
      expect((await pressUpgrade("u1", "boss.json", "cmd", 3, "overview:0", d, ENV_VIEW)).ok).toBe(true);
      const write = store.finished[0].write;
      expect(write.status).toBe("done");
      expect((write.pairs as StoredPair[]).every((p) => !("addBracketAfter" in p) && !("cutBracketAfter" in p))).toBe(true);
    }
  });

  it("lineBracketsOrNone keys the lines by add and records a fallback", async () => {
    vi.mocked(recordSoftFailure).mockClear();
    const l = await load();
    const list = { commanderIds: l.commanderIds, cards: l.deck.cards };
    const got = await lineBracketsOrNone(async () => [{ addBracketAfter: [3], cutBracketAfter: null }], list, [pair("n6", "p0")]);
    expect(got.get("p0")).toEqual({ addBracketAfter: [3], cutBracketAfter: null });
    expect(recordSoftFailure).not.toHaveBeenCalled();
    expect((await lineBracketsOrNone(async () => null, list, [pair("n6", "p0")])).size).toBe(0);
    expect(recordSoftFailure).toHaveBeenCalledTimes(1);
  });

  it("lineBracketsOrNone leaves the values off when the read outlasts its timeout, and the paid run still finishes", async () => {
    vi.mocked(recordSoftFailure).mockClear();
    const l = await load();
    const list = { commanderIds: l.commanderIds, cards: l.deck.cards };
    const hung = () => new Promise<LineBrackets[] | null>(() => {});
    expect((await lineBracketsOrNone(hung, list, [pair("n6", "p0")], 10)).size).toBe(0);
    expect(recordSoftFailure).toHaveBeenCalledTimes(1);
    // Through the press, at the default bound: the run is written done, its pairs with no lines.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      store.finished.length = 0;
      const { d } = deps(swaps(12));
      d.lineBrackets.mockImplementation(hung);
      store.runs = [{ id: "run-1", status: "done", pairs: [], strategyKey: "cmd/3/overview:0" }];
      const pressed = pressUpgrade("u1", "boss.json", "cmd", 3, "overview:0", d, ENV_VIEW);
      await vi.advanceTimersByTimeAsync(LINE_BRACKETS_TIMEOUT_MS + 1);
      expect((await pressed).ok).toBe(true);
      const write = store.finished[0].write;
      expect(write.status).toBe("done");
      expect((write.pairs as StoredPair[]).every((p) => !("addBracketAfter" in p))).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("the set's bracket (fresh start R2)", () => {
  const run = { strategyKey: "cmd/3/overview:0", pairs: [{ cutId: "n6", addId: "p0" }, { cutId: "n7", addId: "p1" }] as StoredPair[] };

  it("reads the list under the run's commander with exactly the picked adds and cuts", async () => {
    expect(await setPermits(base(), run, ["p0"], ["n6"])).toEqual([3]);
    expect(await setPermits(base(), run, ["p1"], ["n6"])).toEqual([1, 2]);
    // Uneven still reads: the bar shows the bracket while the counts differ.
    expect(await setPermits(base(), run, ["p0", "p1"], ["n6"])).toEqual([3]);
    const head = vi.mocked(loadDeckProfileFromHead).mock.calls.at(-1)![0];
    expect(head.cards.map((c) => c.oracleId)).toEqual(expect.arrayContaining(["p0", "p1", "n7"]));
    expect(head.cards.some((c) => c.oracleId === "n6" || c.oracleId === "cmd")).toBe(false);
  });

  it("refuses ids outside the run, on the wrong side, or repeated, and a commander the box no longer offers", async () => {
    expect(await setPermits(base(), run, ["p9"], [])).toBeNull();
    expect(await setPermits(base(), run, ["n6"], [])).toBeNull();
    expect(await setPermits(base(), run, ["p0", "p0"], [])).toBeNull();
    expect(await setPermits(base(), { ...run, strategyKey: "stranger/3/x" }, ["p0"], [])).toBeNull();
  });

  it("readSetBracket answers only for the reader's own done run, with the bracket the set plays at", async () => {
    const listFp = boxFingerprint(base().lines);
    store.runs = [{ id: "run-1", status: "done", listFp, ...run }, { id: "run-2", status: "pending", listFp, ...run }];
    const d = { base: async () => base() };
    expect(await readSetBracket("u1", "boss.json", "run-1", ["p0"], ["n6"], d)).toEqual({ permits: [3], bracket: 3 });
    expect(await readSetBracket("u1", "boss.json", "run-1", [], ["n6"], d)).toEqual({ permits: [1, 2], bracket: 2 });
    expect(await readSetBracket("u1", "boss.json", "run-2", ["p0"], ["n6"], d)).toBeNull();
    expect(await readSetBracket("u1", "boss.json", "nope", ["p0"], ["n6"], d)).toBeNull();
    expect(await readSetBracket("u1", "boss.json", "run-1", ["p0"], ["n6"], { base: async () => null })).toBeNull();
  });

  it("readSetBracket answers null for a run made over another list than the box's now, as a Start answers listChanged", async () => {
    const d = { base: async () => base() };
    store.runs = [{ id: "run-1", status: "done", listFp: "another-list", ...run }];
    expect(await readSetBracket("u1", "boss.json", "run-1", ["p0"], ["n6"], d)).toBeNull();
    store.runs = [{ id: "run-1", status: "done", listFp: null, ...run }];
    expect(await readSetBracket("u1", "boss.json", "run-1", ["p0"], ["n6"], d)).toBeNull();
  });
});
