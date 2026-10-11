import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  startRead: vi.fn(),
  setReadPhase: vi.fn(),
  settleTheRead: vi.fn(),
}));
vi.mock("./run-store", () => store);
vi.mock("./search", () => ({ loadIntakeCatalog: vi.fn(), loadSearchFacts: vi.fn() }));
vi.mock("./the-read-load", () => ({ collectionDigest: vi.fn(), loadReadCards: vi.fn(), loadReadDecks: vi.fn() }));
const dbRows = vi.hoisted(() => ({ rows: [] as unknown[] }));
vi.mock("../../db", () => ({ db: { execute: vi.fn(async () => ({ rows: dbRows.rows })) } }));

import type { ModelOutcome } from "../model/client";
import { formatPoolList } from "./pool-list";
import type { JudgeReply, ShortlistReply } from "./the-read";
import { runTheRead, shortlistPrefix, type TheReadDeps, type TheReadInputs } from "./the-read-run";

const usage = { inputTokens: 100, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 };
const commander = (id: string, name: string) => ({ oracleId: id, name, colorIdentity: ["B"], typeLine: "Legendary Creature — Horror", tags: [] });
const list = formatPoolList([commander("a", "Alpha"), commander("b", "Beta"), commander("c", "Gamma")], "g");
const inputs = (over: Partial<TheReadInputs> = {}): TheReadInputs => ({
  list, pool: new Set([1, 2]), narrowed: false, decks: [], cards: [], fingerprint: "fp", ...over,
});
const ok = <T>(value: T): ModelOutcome<T> => ({ ok: true, value, usage });
const deps = (shortlist: ModelOutcome<ShortlistReply>, judge: ModelOutcome<JudgeReply>): TheReadDeps => ({
  modelName: "s+j", shortlistModel: "s", judgeModel: "j",
  shortlist: vi.fn(async () => shortlist),
  judge: vi.fn(async () => judge),
  now: () => 0,
});
const input = { readId: "r", words: "scary horrors", filters: { colors: [], match: "contains" as const, themes: [], budgetDollars: null, bracket: null } };

beforeEach(() => {
  store.startRead.mockReset().mockResolvedValue({ kind: "started", readId: "r", callId: "c" });
  store.setReadPhase.mockReset().mockResolvedValue(true);
  store.settleTheRead.mockReset().mockResolvedValue(true);
  dbRows.rows = [
    { id: "a", name: "Alpha", color_identity: ["B"], type_line: "Creature", oracle_text: "Draw.", tags: [], owned: true, owned_support: 3, support_total: 9 },
    { id: "b", name: "Beta", color_identity: ["B"], type_line: "Creature", oracle_text: "Drain.", tags: [], owned: false, owned_support: 0, support_total: 9 },
    // Gamma is outside the pool. Its row is here so only the pool check can keep it from the judgement.
    { id: "c", name: "Gamma", color_identity: ["B"], type_line: "Creature", oracle_text: "Mill.", tags: [], owned: false, owned_support: 0, support_total: 9 },
  ];
});

describe("runTheRead", () => {
  it("runs the shortlist then the judgement, moving the phase before each, and spends on a pick with both bills", async () => {
    const d = deps(ok({ keys: [2, 1, 3] }), ok({ picks: [{ key: 2, reason: "Its horrors drain each opponent." }] }));
    const out = await runTheRead("u", input, d, inputs());
    expect(out).toEqual({ kind: "read", readId: "r", repeat: false, result: { picks: [{ oracleId: "b", reason: [{ text: "Its horrors drain each opponent." }] }] } });
    expect(store.setReadPhase.mock.calls.map((c) => c[1])).toEqual(["shortlist", "judge"]);
    expect(store.settleTheRead.mock.calls[0][2]).toEqual([{ model: "s", usage }, { model: "j", usage }]);
    // Key 3 is outside the pool, so the judgement is never shown it.
    expect(vi.mocked(d.judge).mock.calls[0][0].user).not.toContain("3|Gamma");
  });

  it("finds nothing, refunded, when the shortlist holds no key in the pool, and never calls the judgement", async () => {
    const d = deps(ok({ keys: [3] }), ok({ picks: [] }));
    expect(await runTheRead("u", input, d, inputs())).toEqual({ kind: "nothing", readId: "r", repeat: false });
    expect(d.judge).not.toHaveBeenCalled();
    expect(store.settleTheRead.mock.calls[0][1]).toEqual({ kind: "read", result: { picks: [] } });
  });

  it("finds nothing when every judged reason is refused", async () => {
    const d = deps(ok({ keys: [1, 2] }), ok({ picks: [{ key: 1, reason: "Makes 3 tokens." }] }));
    expect(await runTheRead("u", input, d, inputs())).toMatchObject({ kind: "nothing" });
  });

  it("settles a failed judgement as failed, still billing the shortlist", async () => {
    const d = deps(ok({ keys: [1] }), { ok: false, errorClass: "timeout" });
    expect(await runTheRead("u", input, d, inputs())).toEqual({ kind: "failed", errorClass: "timeout" });
    expect(store.settleTheRead.mock.calls[0][2]).toEqual([{ model: "s", usage }]);
  });

  it("stops between the calls when a Stop has settled the read, landing only the shortlist's bill", async () => {
    store.setReadPhase.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const d = deps(ok({ keys: [1] }), ok({ picks: [] }));
    expect(await runTheRead("u", input, d, inputs())).toEqual({ kind: "stopped" });
    expect(d.judge).not.toHaveBeenCalled();
    expect(store.settleTheRead.mock.calls[0][2]).toEqual([{ model: "s", usage }]);
  });

  it("answers a repeat from the store and calls nothing", async () => {
    const result = { picks: [{ oracleId: "a", reason: [{ text: "Fits." }] }] };
    store.startRead.mockResolvedValue({ kind: "stored", readId: "old", useful: true, result, read: { chips: [], notUsed: [], notUnderstood: [] } });
    const d = deps(ok({ keys: [] }), ok({ picks: [] }));
    expect(await runTheRead("u", input, d, inputs())).toEqual({ kind: "read", readId: "old", result, repeat: true });
    expect(d.shortlist).not.toHaveBeenCalled();
  });

  it("caches the shortlist's prefix only when it is the whole list every press shares", async () => {
    const whole = deps(ok({ keys: [] }), ok({ picks: [] }));
    await runTheRead("u", input, whole, inputs());
    expect(vi.mocked(whole.shortlist).mock.calls[0][0].cache).toBe(true);
    const filtered = deps(ok({ keys: [] }), ok({ picks: [] }));
    await runTheRead("u", input, filtered, inputs({ narrowed: true }));
    expect(vi.mocked(filtered.shortlist).mock.calls[0][0].cache).toBe(false);
  });

  it("reserves under the fingerprint and the joined model", async () => {
    await runTheRead("u", input, deps(ok({ keys: [] }), ok({ picks: [] })), inputs());
    expect(store.startRead).toHaveBeenCalledWith("u", "fp", "s+j", { readId: "r" });
  });
});

describe("the shortlist's prefix", () => {
  it("is the whole list with no filter set, and only the pool's lines with one (plan (d))", () => {
    expect(shortlistPrefix(inputs())).toContain("3|Gamma");
    const narrowed = shortlistPrefix(inputs({ narrowed: true }));
    expect(narrowed).toContain("1|Alpha");
    expect(narrowed).not.toContain("3|Gamma");
  });
});
