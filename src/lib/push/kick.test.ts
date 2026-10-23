import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ after: vi.fn(), flush: vi.fn<(deps: unknown) => Promise<object>>(async () => ({})), capture: vi.fn() }));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("./flush", () => ({ flushPush: m.flush }));
vi.mock("./send", () => ({ sendWebPush: vi.fn() }));
vi.mock("../switches/snapshot", () => ({ resolveSwitchEnvStrict: vi.fn() }));
vi.mock("../sentry/capture", () => ({ captureServerError: m.capture }));

import { KICK_DELAY_MS, KICK_MAX_WAIT_MS, kickPush } from "./kick";

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

  it("makes a burst for one reader ONE flush plus at most one more pass, decided after each request", async () => {
    kickPush("u1"); kickPush("u1"); kickPush("u1"); // three combos noticed by one collection write
    expect(m.after).toHaveBeenCalledTimes(3); // each scheduled after its request, never absorbed at the call
    let release!: () => void;
    m.flush.mockImplementationOnce(() => new Promise((done) => { release = () => done({}); }));
    const calls = m.after.mock.calls.map((c) => (c[0] as () => Promise<void>)());
    await vi.advanceTimersByTimeAsync(KICK_DELAY_MS);
    expect(m.flush).toHaveBeenCalledOnce(); // the other two found it running
    release();
    await Promise.all(calls);
    expect(m.flush).toHaveBeenCalledTimes(2); // one more pass, not two
  });

  it("a request that commits while another's flush runs still gets its row sent in seconds", async () => {
    let release!: () => void;
    m.flush.mockImplementationOnce(() => new Promise((done) => { release = () => done({}); }));
    kickPush("u3"); // request A
    const a = (m.after.mock.calls[0]![0] as () => Promise<void>)();
    await vi.advanceTimersByTimeAsync(KICK_DELAY_MS);
    expect(m.flush).toHaveBeenCalledOnce();
    kickPush("u3"); // request B: its transaction is still open, so nothing is decided now
    expect(m.after).toHaveBeenCalledTimes(2);
    release();
    await a; // A finishes before B's callback runs: A's flush could not have seen B's row
    expect(m.flush).toHaveBeenCalledOnce();
    await run(1); // B's own callback, after B committed: no flush running, so it flushes
    expect(m.flush).toHaveBeenCalledTimes(2);
  });

  it("waits for a producer whose writes span the delay: one flush once the reader's writes go quiet", async () => {
    // A notice's loop inside after(): each write kicks, 1.5s apart, longer in all than the delay.
    kickPush("u7");
    const first = (m.after.mock.calls.at(-1)![0] as () => Promise<void>)();
    await vi.advanceTimersByTimeAsync(1500);
    kickPush("u7");
    const second = (m.after.mock.calls.at(-1)![0] as () => Promise<void>)();
    await vi.advanceTimersByTimeAsync(1500);
    expect(m.flush).not.toHaveBeenCalled(); // 3s since the first write, but only 1.5s since the last
    await vi.advanceTimersByTimeAsync(KICK_DELAY_MS);
    await Promise.all([first, second]);
    // One flush once the writes went quiet, and the second request's callback adds its one more pass: never a flush
    // that read only the first half.
    expect(m.flush).toHaveBeenCalledTimes(2);
  });

  it("never waits past KICK_MAX_WAIT_MS for a producer that keeps writing", async () => {
    kickPush("u8");
    const done = (m.after.mock.calls.at(-1)![0] as () => Promise<void>)();
    for (let t = 0; t < KICK_MAX_WAIT_MS; t += 1000) {
      await vi.advanceTimersByTimeAsync(1000);
      kickPush("u8");
    }
    await vi.advanceTimersByTimeAsync(1);
    expect(m.flush).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(KICK_DELAY_MS * 10);
    await done;
  });

  it("a second reader is never held behind the first", async () => {
    kickPush("u4"); kickPush("u5");
    await Promise.all([run(0), run(1)]);
    expect(m.flush.mock.calls.map((c) => (c[0] as { onlyUser: string }).onlyUser).sort()).toEqual(["u4", "u5"]);
  });

  it("outside a request (a job, a script) does nothing and throws nothing: the cron delivers it", () => {
    m.after.mockImplementation(() => { throw new Error("`after` was called outside a request scope"); });
    expect(() => kickPush("u9")).not.toThrow();
  });

  it("reports a failed kick to monitoring and swallows it: the rows wait for the cron", async () => {
    m.flush.mockRejectedValueOnce(new Error("db down"));
    kickPush("u6"); // a reader no earlier case left waiting (the kick state is per server instance)
    await expect(run()).resolves.toBeUndefined();
    expect(m.capture).toHaveBeenCalledWith("push-kick", expect.any(Error));
  });
});
