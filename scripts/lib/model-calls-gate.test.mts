// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertModelCallsOn, DEFAULT_HEALTH_URL } from "./model-calls-gate.mjs";

/** A stand-in for `fetch` whose reply's `json()` yields `body`, or throws when `body` is an Error. */
function replying(body: unknown) {
  return vi.fn(async () => ({
    json: async () => {
      if (body instanceof Error) throw body;
      return body;
    },
  })) as unknown as typeof fetch;
}

class Exited extends Error {
  constructor(readonly code: number | undefined) {
    super(`process.exit(${code})`);
  }
}

describe("assertModelCallsOn", () => {
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Thrown, so a skip stops the gate exactly where a real exit would.
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Exited(code);
    }) as never);
    log = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function skipLine(fetchImpl: typeof fetch): Promise<string> {
    const outcome = await assertModelCallsOn({ fetchImpl }).then(() => null, (e: unknown) => e);
    expect(outcome).toBeInstanceOf(Exited);
    expect((outcome as Exited).code).toBe(0);
    expect(log).toHaveBeenCalledTimes(1);
    return String(log.mock.calls[0][0]);
  }

  it("returns and prints nothing when production reports on", async () => {
    const fetchImpl = replying({ status: "ok", modelCalls: "on" });
    await expect(assertModelCallsOn({ fetchImpl })).resolves.toBeUndefined();
    expect(process.exit).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it("asks production's health by default", async () => {
    const fetchImpl = replying({ modelCalls: "on" });
    await assertModelCallsOn({ fetchImpl });
    expect(vi.mocked(fetchImpl).mock.calls[0][0]).toBe(DEFAULT_HEALTH_URL);
  });

  it("still runs when health is 503 for migrations but reports on", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({ status: "behind", modelCalls: "on" }) })) as unknown as typeof fetch;
    await expect(assertModelCallsOn({ fetchImpl })).resolves.toBeUndefined();
  });

  it("skips with exit 0 when production reports off", async () => {
    expect(await skipLine(replying({ status: "ok", modelCalls: "off" }))).toBe(
      "Model calls are paused (MODEL_CALLS_ENABLED off); skipping.",
    );
  });

  it("skips with exit 0 when the fetch throws", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("timed out");
    }) as unknown as typeof fetch;
    expect(await skipLine(fetchImpl)).toMatch(/^Could not confirm model calls are on .*timed out.*; skipping\.$/);
  });

  it("skips with exit 0 when the reply is not JSON", async () => {
    expect(await skipLine(replying(new SyntaxError("Unexpected token <")))).toMatch(/^Could not confirm model calls are on/);
  });

  it("skips with exit 0 when the reply has no modelCalls field", async () => {
    expect(await skipLine(replying({ status: "ok" }))).toMatch(/did not report modelCalls; skipping\.$/);
  });

  it("skips with exit 0 on an unknown value", async () => {
    expect(await skipLine(replying({ modelCalls: "maybe" }))).toMatch(/^Could not confirm model calls are on/);
  });
});
