import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  reads: 0,
  /** The resolved switch env, or an Error the strict read throws. */
  switches: {} as Record<string, string | undefined> | Error,
}));
vi.mock("../switches/snapshot", () => ({
  resolveSwitchEnvStrict: async (userId: string | null) => {
    stub.reads += 1;
    // App-wide only: health never resolves for an account.
    if (userId !== null) throw new Error(`resolved for ${userId}`);
    if (stub.switches instanceof Error) throw stub.switches;
    return stub.switches;
  },
}));

import { clearHealthModelCalls, healthModelCalls, MODEL_CALLS_MEMO_MS } from "./model-calls";

describe("healthModelCalls", () => {
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearHealthModelCalls();
    stub.reads = 0;
    stub.switches = {};
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is on while the switch is unset, the default", async () => {
    expect(await healthModelCalls(0)).toBe("on");
  });

  it.each(["off", "false"])("is off when the switch resolves to %s", async (value) => {
    stub.switches = { MODEL_CALLS_ENABLED: value };
    expect(await healthModelCalls(0)).toBe("off");
  });

  it("holds a confirmed answer for 30 seconds, then reads again", async () => {
    expect(await healthModelCalls(1_000)).toBe("on");
    stub.switches = { MODEL_CALLS_ENABLED: "off" };
    expect(await healthModelCalls(1_000 + MODEL_CALLS_MEMO_MS - 1)).toBe("on");
    expect(stub.reads).toBe(1);
    expect(await healthModelCalls(1_000 + MODEL_CALLS_MEMO_MS)).toBe("off");
    expect(stub.reads).toBe(2);
  });

  it("reports off on a failed read, logs a health line, and does not hold it", async () => {
    stub.switches = new Error("switch overrides could not be read");
    expect(await healthModelCalls(0)).toBe("off");
    expect(error).toHaveBeenCalledWith("health: model-calls read failed; reporting off", expect.any(Error));
    stub.switches = {};
    expect(await healthModelCalls(1)).toBe("on");
    expect(stub.reads).toBe(2);
  });

  it("asks again on every request while the read keeps failing", async () => {
    stub.switches = new Error("down");
    expect(await healthModelCalls(0)).toBe("off");
    expect(await healthModelCalls(0)).toBe("off");
    expect(stub.reads).toBe(2);
  });
});
