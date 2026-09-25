import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  startRead: vi.fn(),
  settleRead: vi.fn(),
  wordsHash: () => "hash",
}));
vi.mock("./run-store", () => store);
vi.mock("./search", () => ({ loadIntakeCatalog: vi.fn() }));

import type { ModelOutcome } from "../model/client";
import { runDeeperRead, type DeeperReadDeps } from "./deeper-read";
import { buildPhraseIndex } from "./match";
import type { ReadResponse } from "./read";

const index = buildPhraseIndex([{ slug: "dinosaurs", label: "Dinosaurs" }], []);
const usage = { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 };
const reply = (over: Partial<ReadResponse>): ModelOutcome<ReadResponse> => ({
  ok: true, usage,
  value: { themes: [], cards: [], budgetDollars: null, bracket: null, notUnderstood: [], ...over },
});
const deps = (outcome: ModelOutcome<ReadResponse>): DeeperReadDeps => ({
  modelName: "m",
  model: vi.fn(async () => outcome),
  loadIndex: async () => ({ labels: ["Dinosaurs"], index }),
  now: () => new Date(0),
});
const input = { readId: "r", words: "big lizards", controls: { budgetDollars: null, bracket: null } };
const handle = { kind: "started", readId: "r", callId: "c" };

beforeEach(() => {
  store.startRead.mockReset().mockResolvedValue(handle);
  store.settleRead.mockReset().mockResolvedValue(true);
});

describe("runDeeperRead", () => {
  it("settles a read with a valid chip as the chips, with its bill", async () => {
    const out = await runDeeperRead("u", input, deps(reply({ themes: ["Dinosaurs"] })));
    expect(out).toEqual({ kind: "read", readId: "r", chips: [{ kind: "theme", slug: "dinosaurs", label: "Dinosaurs" }], notUsed: [], notUnderstood: [] });
    expect(store.settleRead.mock.calls[0][1]).toMatchObject({ kind: "read", result: { useful: true } });
    expect(store.settleRead.mock.calls[0][2]).toEqual({ model: "m", usage });
  });

  it("validates BEFORE it settles, so a reply with nothing valid settles as not useful (F4)", async () => {
    const out = await runDeeperRead("u", input, deps(reply({ themes: ["Pirates"], notUnderstood: ["lizards"] })));
    expect(out).toEqual({ kind: "nothing", notUsed: [], notUnderstood: ["lizards"] });
    expect(store.settleRead.mock.calls[0][1]).toMatchObject({ kind: "read", result: { useful: false } });
  });

  it("keeps a figure the controls overrode on a read with nothing else in it", async () => {
    const out = await runDeeperRead("u", { ...input, controls: { budgetDollars: 100, bracket: null } }, deps(reply({ budgetDollars: 300 })));
    expect(out).toEqual({ kind: "nothing", notUsed: ["$300"], notUnderstood: [] });
  });

  it("settles a failed call as failed", async () => {
    const out = await runDeeperRead("u", input, deps({ ok: false, errorClass: "timeout" }));
    expect(out).toEqual({ kind: "failed", errorClass: "timeout" });
    expect(store.settleRead.mock.calls[0][1]).toEqual({ kind: "failed", errorClass: "timeout" });
  });

  it("reports a late answer as stopped", async () => {
    store.settleRead.mockResolvedValue(false);
    expect(await runDeeperRead("u", input, deps(reply({ themes: ["Dinosaurs"] })))).toEqual({ kind: "stopped" });
  });

  it("offers an ask once: a repeat gets the stored read back and reserves nothing", async () => {
    const chips = [{ kind: "theme", slug: "dinosaurs", label: "Dinosaurs" }];
    store.startRead.mockResolvedValue({ kind: "stored", read: { chips, notUsed: [], notUnderstood: [] }, readId: "first" });
    const d = deps(reply({}));
    // The stored read's own id, never the repeat press's: the results page verifies the read by it.
    expect(await runDeeperRead("u", input, d)).toEqual({ kind: "read", readId: "first", chips, notUsed: [], notUnderstood: [] });
    expect(d.model).not.toHaveBeenCalled();
    expect(store.settleRead).not.toHaveBeenCalled();
  });

  it("calls no model when the start was refused", async () => {
    store.startRead.mockResolvedValue({ kind: "allowance" });
    const d = deps(reply({}));
    expect(await runDeeperRead("u", input, d)).toEqual({ kind: "allowance" });
    expect(d.model).not.toHaveBeenCalled();
    expect(store.settleRead).not.toHaveBeenCalled();
  });
});

describe("wordsHash", () => {
  it("tells apart asks in any script, and folds spacing and case", async () => {
    const { wordsHash } = await vi.importActual<typeof import("./run-store")>("./run-store");
    const none = { budgetDollars: null, bracket: null };
    expect(wordsHash("龙", none)).not.toBe(wordsHash("火", none));
    expect(wordsHash("🐉", none)).not.toBe(wordsHash("🔥", none));
    expect(wordsHash("Big  Lizards", none)).toBe(wordsHash("big lizards", none));
    expect(wordsHash("big lizards", none)).not.toBe(wordsHash("big lizards", { budgetDollars: 100, bracket: null }));
  });
});
