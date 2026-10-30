import { describe, expect, it, vi } from "vitest";

import { heldStubOutcome, stagedStubOutcome, TUNING_STUB_MAX_MS, tuningStubDelayMs, v2StubDelayMs } from "./stub";

describe("the tuning stub", () => {
  it("is off unless a delay is set, and never in a production build", () => {
    expect(tuningStubDelayMs({})).toBeNull();
    expect(tuningStubDelayMs({ TUNING_STUB_DELAY_MS: "0" })).toBeNull();
    expect(tuningStubDelayMs({ TUNING_STUB_DELAY_MS: "abc" })).toBeNull();
    expect(tuningStubDelayMs({ TUNING_STUB_DELAY_MS: "5000", NODE_ENV: "production" })).toBeNull();
    expect(tuningStubDelayMs({ TUNING_STUB_DELAY_MS: "5000", NODE_ENV: "development" })).toBe(5000);
  });

  it("caps the hold", () => {
    expect(tuningStubDelayMs({ TUNING_STUB_DELAY_MS: "9999999" })).toBe(TUNING_STUB_MAX_MS);
  });

  it("holds, then fails busy; answers null when off", async () => {
    expect(await heldStubOutcome({})).toBeNull();
    vi.useFakeTimers();
    const held = heldStubOutcome({ TUNING_STUB_DELAY_MS: "3000" });
    await vi.advanceTimersByTimeAsync(3000);
    expect(await held).toEqual({ ok: false, errorClass: "upstream_busy" });
    vi.useRealTimers();
  });
});

describe("the staged v2 stub (plan PR 3)", () => {
  const names = { adds: ["Mind Stone", "Arcane Signet", "Fellwar Stone"], cuts: ["Island", "Forest"] };
  const drain = async (it: AsyncIterable<string>) => { let s = ""; for await (const d of it) s += d; return s; };

  it("is off unless its own delay is set, and never in a production build", () => {
    expect(v2StubDelayMs({})).toBeNull();
    expect(v2StubDelayMs({ TUNING_STUB_DELAY_MS: "5000" })).toBeNull();
    expect(v2StubDelayMs({ TUNING_V2_STUB_DELAY_MS: "5000", NODE_ENV: "production" })).toBeNull();
    expect(stagedStubOutcome({}, names)).toBeNull();
  });

  it("waits, then streams the first `ask` names of its list as whole lines; a refill answers empty at once", async () => {
    const slept: number[] = [];
    const stub = stagedStubOutcome({ TUNING_V2_STUB_DELAY_MS: "1000" }, names, async (ms) => { slept.push(ms); })!;
    const adds = stub({ stage: "additions", ask: 2 });
    expect(JSON.parse(await drain(adds.deltas)).lines.map((l: { card: string }) => l.card)).toEqual(["Mind Stone", "Arcane Signet"]);
    expect(await adds.outcome).toEqual({ ok: true });
    expect(slept).toEqual([1000, 200]);
    expect(JSON.parse(await drain(stub({ stage: "cuts", ask: 5 }).deltas)).lines.map((l: { card: string }) => l.card)).toEqual(["Island", "Forest"]);
    slept.length = 0;
    expect(JSON.parse(await drain(stub({ stage: "additionsRefill", ask: 3 }).deltas))).toEqual({ lines: [] });
    expect(slept).toEqual([]);
  });

  it("answers the why call a delay later with one group per list over every staged card", async () => {
    const slept: number[] = [];
    const stub = stagedStubOutcome({ TUNING_V2_STUB_DELAY_MS: "1000" }, names, async (ms) => { slept.push(ms); })!;
    const why = stub({ stage: "why", ask: 0 });
    const reply = JSON.parse(await drain(why.deltas));
    expect(reply.lead).toBe("A staged stand-in lead for the probe.");
    expect(reply.add).toEqual([{ phrase: "are staged stand-in additions", cards: names.adds, like: names.adds[0] }]);
    expect(reply.cut).toEqual([{ phrase: "are staged stand-in cuts", cards: names.cuts, like: names.cuts[0] }]);
    expect(await why.outcome).toEqual({ ok: true });
    expect(slept).toEqual([1000]);
  });
});
