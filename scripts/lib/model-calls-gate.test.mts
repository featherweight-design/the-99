// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertModelCallsOn, DEFAULT_HEALTH_URL, EXIT_UNCONFIRMED, PAUSED_LINE, readModelCalls } from "./model-calls-gate.mjs";

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
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Thrown, so a skip stops the gate exactly where a real exit would.
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Exited(code);
    }) as never);
    log = vi.spyOn(console, "log").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  async function exitOf(fetchImpl: typeof fetch): Promise<number | undefined> {
    const outcome = await assertModelCallsOn({ fetchImpl }).then(() => null, (e: unknown) => e);
    expect(outcome).toBeInstanceOf(Exited);
    return (outcome as Exited).code;
  }

  /** An unconfirmed read: non-zero, one line on stderr, nothing on stdout. */
  async function unconfirmedLine(fetchImpl: typeof fetch): Promise<string> {
    expect(await exitOf(fetchImpl)).toBe(EXIT_UNCONFIRMED);
    expect(EXIT_UNCONFIRMED).not.toBe(0);
    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
    return String(error.mock.calls[0][0]);
  }

  it("returns and prints nothing when production reports on", async () => {
    const fetchImpl = replying({ status: "ok", modelCalls: "on" });
    await expect(assertModelCallsOn({ fetchImpl })).resolves.toBeUndefined();
    expect(process.exit).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("asks production's health by default", async () => {
    const fetchImpl = replying({ modelCalls: "on" });
    await assertModelCallsOn({ fetchImpl });
    expect(vi.mocked(fetchImpl).mock.calls[0][0]).toBe(DEFAULT_HEALTH_URL);
  });

  it("asks MODEL_CALLS_HEALTH_URL when it is set", async () => {
    vi.stubEnv("MODEL_CALLS_HEALTH_URL", "https://staging.example/api/health");
    const fetchImpl = replying({ modelCalls: "on" });
    await assertModelCallsOn({ fetchImpl });
    expect(vi.mocked(fetchImpl).mock.calls[0][0]).toBe("https://staging.example/api/health");
  });

  it("falls back to production when MODEL_CALLS_HEALTH_URL is set but empty", async () => {
    vi.stubEnv("MODEL_CALLS_HEALTH_URL", "");
    const fetchImpl = replying({ modelCalls: "on" });
    await assertModelCallsOn({ fetchImpl });
    expect(vi.mocked(fetchImpl).mock.calls[0][0]).toBe(DEFAULT_HEALTH_URL);
  });

  it("still runs when health is 503 for migrations but reports on", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({ status: "behind", modelCalls: "on" }) })) as unknown as typeof fetch;
    await expect(assertModelCallsOn({ fetchImpl })).resolves.toBeUndefined();
  });

  it("skips with exit 0 and one stdout line when production reports off", async () => {
    expect(await exitOf(replying({ status: "ok", modelCalls: "off" }))).toBe(0);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toBe(PAUSED_LINE);
    expect(error).not.toHaveBeenCalled();
  });

  it("exits non-zero when the fetch throws", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("timed out");
    }) as unknown as typeof fetch;
    expect(await unconfirmedLine(fetchImpl)).toMatch(/^Could not confirm model calls are on \(timed out\)/);
  });

  it("exits non-zero when the reply is not JSON (an HTML challenge page)", async () => {
    expect(await unconfirmedLine(replying(new SyntaxError("Unexpected token <")))).toMatch(/Unexpected token </);
  });

  it("exits non-zero when the reply has no modelCalls field", async () => {
    expect(await unconfirmedLine(replying({ status: "ok" }))).toMatch(/did not report modelCalls/);
  });

  it("exits non-zero on an unknown value", async () => {
    expect(await unconfirmedLine(replying({ modelCalls: "maybe" }))).toMatch(/modelCalls was "maybe"/);
  });
});

describe("readModelCalls", () => {
  it("never throws, and reports each state without exiting", async () => {
    await expect(readModelCalls({ fetchImpl: replying({ modelCalls: "on" }) })).resolves.toEqual({ state: "on" });
    await expect(readModelCalls({ fetchImpl: replying({ modelCalls: "off" }) })).resolves.toEqual({ state: "off", line: PAUSED_LINE });
    await expect(readModelCalls({ fetchImpl: replying(null) })).resolves.toMatchObject({ state: "unconfirmed" });
  });
});
