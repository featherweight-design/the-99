import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ after: vi.fn(), flush: vi.fn<(deps: unknown) => Promise<object>>(async () => ({})), capture: vi.fn() }));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("./flush", () => ({ flushPush: m.flush }));
vi.mock("./send", () => ({ sendWebPush: vi.fn() }));
vi.mock("../switches/snapshot", () => ({ resolveSwitchEnvStrict: vi.fn() }));
vi.mock("../sentry/capture", () => ({ captureServerError: m.capture }));

import { KICK_DELAY_MS, kickPush } from "./kick";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const jwk = publicKey.export({ format: "jwk" });
const KEYS = {
  VAPID_PUBLIC_KEY: Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x!, "base64url"), Buffer.from(jwk.y!, "base64url")]).toString("base64url"),
  VAPID_PRIVATE_KEY: privateKey.export({ format: "jwk" }).d!,
  VAPID_SUBJECT: "mailto:hugh@example.com",
};
const saved = { ...process.env };

describe("kickPush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    m.after.mockImplementation(() => {});
    Object.assign(process.env, KEYS);
  });
  // Runs a scheduled kick to the end: the delay, then the flush(es).
  const run = async (i = 0) => {
    const done = (m.after.mock.calls[i]![0] as () => Promise<void>)();
    await vi.advanceTimersByTimeAsync(KICK_DELAY_MS);
    await done;
  };
  afterEach(() => {
    vi.useRealTimers();
    for (const k of Object.keys(KEYS)) delete process.env[k];
    Object.assign(process.env, saved);
  });

  it("is dormant without the VAPID keys: nothing is scheduled", () => {
    delete process.env.VAPID_PRIVATE_KEY;
    kickPush("u1");
    expect(m.after).not.toHaveBeenCalled();
  });

  it("schedules ONE flush of that reader's rows after the response and the delay", async () => {
    kickPush("u1");
    expect(m.after).toHaveBeenCalledOnce();
    expect(m.flush).not.toHaveBeenCalled(); // not inside the request
    await run();
    expect(m.flush).toHaveBeenCalledOnce();
    expect(m.flush.mock.calls[0]![0]).toMatchObject({ onlyUser: "u1" });
  });

  it("makes a burst for one reader ONE flush: items recorded while it waits ride along", async () => {
    kickPush("u1"); kickPush("u1"); kickPush("u1"); // three combos noticed by one collection write
    expect(m.after).toHaveBeenCalledOnce();
    kickPush("u2"); // another reader has their own
    expect(m.after).toHaveBeenCalledTimes(2);
    await run(0);
    expect(m.flush).toHaveBeenCalledOnce();
  });

  it("an item recorded while the flush runs gets one more pass, never a second flush at the same time", async () => {
    let release!: () => void;
    m.flush.mockImplementationOnce(() => new Promise((done) => { release = () => done({}); }));
    kickPush("u1");
    const done = (m.after.mock.calls[0]![0] as () => Promise<void>)();
    await vi.advanceTimersByTimeAsync(KICK_DELAY_MS);
    expect(m.flush).toHaveBeenCalledOnce();
    kickPush("u1"); kickPush("u1"); // written mid-flush
    expect(m.after).toHaveBeenCalledOnce();
    release();
    await done;
    expect(m.flush).toHaveBeenCalledTimes(2);
    // Finished: the next item starts a fresh kick.
    kickPush("u1");
    expect(m.after).toHaveBeenCalledTimes(2);
  });

  it("outside a request (a job, a script) does nothing and throws nothing: the cron delivers it", () => {
    m.after.mockImplementation(() => { throw new Error("`after` was called outside a request scope"); });
    expect(() => kickPush("u9")).not.toThrow();
    // Nothing is left pending, so a later request for the same reader still kicks.
    m.after.mockImplementation(() => {});
    kickPush("u9");
    expect(m.after).toHaveBeenCalledTimes(2);
  });

  it("reports a failed kick to monitoring and swallows it: the rows wait for the cron", async () => {
    m.flush.mockRejectedValueOnce(new Error("db down"));
    kickPush("u6"); // a reader no earlier case left waiting (the kick state is per server instance)
    await expect(run()).resolves.toBeUndefined();
    expect(m.capture).toHaveBeenCalledWith("push-kick", expect.any(Error));
  });
});
