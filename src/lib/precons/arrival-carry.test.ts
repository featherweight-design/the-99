// Small items 5, d9's rulings: the ARRIVAL visit copies the precon's stored reading inline and runs nothing
// else; a reading that is not fresh falls back to the computing carry-over after the response; any other
// visit runs nothing at all.
import { describe, expect, it, vi } from "vitest";
import type { StoredCarryResult } from "./stored-carry";

vi.mock("next/server", () => ({ after: vi.fn() }));
const { carryOnArrival } = await import("./arrival-carry");

const env = { ANALYSIS_TAB_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const deps = (result: StoredCarryResult | Error) => {
  const later: (() => Promise<void>)[] = [];
  return {
    later,
    d: {
      copy: vi.fn(async () => { if (result instanceof Error) throw result; return result; }),
      later: vi.fn((fn: () => Promise<void>) => { later.push(fn); }),
      compute: vi.fn(async () => {}),
    },
  };
};

describe("carryOnArrival", () => {
  it("copies the stored reading for the deck and its owner on the arrival visit, and schedules nothing", async () => {
    const { d } = deps({ kind: "copied", overview: true });
    expect(await carryOnArrival(true, "deck-1", "user-1", env, d)).toEqual({ kind: "copied", overview: true });
    expect(d.copy).toHaveBeenCalledExactlyOnceWith("deck-1", "user-1", env);
    expect(d.later).not.toHaveBeenCalled();
    expect(d.compute).not.toHaveBeenCalled();
  });

  it("falls back to the computing carry-over AFTER the response when the stored reading is not fresh", async () => {
    const { d, later } = deps({ kind: "fallback", reason: "not_fresh" });
    await carryOnArrival(true, "deck-1", "user-1", env, d);
    expect(d.compute).not.toHaveBeenCalled();
    expect(later).toHaveLength(1);
    await later[0]();
    expect(d.compute).toHaveBeenCalledExactlyOnceWith("deck-1", "user-1", env);
  });

  it("falls back the same way when the copy throws, and never throws into the render", async () => {
    const { d, later } = deps(new Error("boom"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(carryOnArrival(true, "deck-1", "user-1", env, d)).resolves.toEqual({ kind: "fallback", reason: "no_reading" });
    expect(later).toHaveLength(1);
    warn.mockRestore();
  });

  it("does nothing more for a deck that already has its reading (a repeat), and says nothing", async () => {
    const { d } = deps({ kind: "nothing" });
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await carryOnArrival(true, "deck-1", "user-1", env, d);
    expect(d.later).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it("runs nothing on any other visit", async () => {
    const { d } = deps({ kind: "copied", overview: false });
    expect(await carryOnArrival(false, "deck-1", "user-1", env, d)).toBeNull();
    expect(d.copy).not.toHaveBeenCalled();
  });
});
