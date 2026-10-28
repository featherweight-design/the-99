// Small items 5, d9's ruling: the carry-over runs inline on the ARRIVAL visit and on no other.
import { describe, expect, it, vi } from "vitest";
import { carryOnArrival } from "./arrival-carry";

const env = { ANALYSIS_TAB_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;

describe("carryOnArrival", () => {
  it("runs the carry-over for the deck and its owner on the arrival visit, and waits for it", async () => {
    let done = false;
    const run = vi.fn(async () => { await Promise.resolve(); done = true; });
    await carryOnArrival(true, "deck-1", "user-1", env, run);
    expect(run).toHaveBeenCalledExactlyOnceWith("deck-1", "user-1", env);
    expect(done).toBe(true);
  });

  it("runs nothing on any other visit", async () => {
    const run = vi.fn(async () => {});
    await carryOnArrival(false, "deck-1", "user-1", env, run);
    expect(run).not.toHaveBeenCalled();
  });
});
