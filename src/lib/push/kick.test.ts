import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ after: vi.fn(), flush: vi.fn<(deps: unknown) => Promise<object>>(async () => ({})), capture: vi.fn() }));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("./flush", () => ({ flushPush: m.flush }));
vi.mock("./send", () => ({ sendWebPush: vi.fn() }));
vi.mock("../switches/snapshot", () => ({ resolveSwitchEnvStrict: vi.fn() }));
vi.mock("../sentry/capture", () => ({ captureServerError: m.capture }));

import { kickPush } from "./kick";

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
    Object.assign(process.env, KEYS);
  });
  afterEach(() => {
    for (const k of Object.keys(KEYS)) delete process.env[k];
    Object.assign(process.env, saved);
  });

  it("is dormant without the VAPID keys: nothing is scheduled", () => {
    delete process.env.VAPID_PRIVATE_KEY;
    kickPush("u1");
    expect(m.after).not.toHaveBeenCalled();
  });

  it("schedules ONE flush of that reader's rows after the response", async () => {
    kickPush("u1");
    expect(m.after).toHaveBeenCalledOnce();
    expect(m.flush).not.toHaveBeenCalled(); // not inside the request
    await (m.after.mock.calls[0]![0] as () => Promise<void>)();
    expect(m.flush).toHaveBeenCalledOnce();
    expect(m.flush.mock.calls[0]![0]).toMatchObject({ onlyUser: "u1" });
  });

  it("outside a request (a job, a script) does nothing and throws nothing: the cron delivers it", () => {
    m.after.mockImplementation(() => { throw new Error("`after` was called outside a request scope"); });
    expect(() => kickPush("u1")).not.toThrow();
  });

  it("reports a failed kick to monitoring and swallows it: the rows wait for the cron", async () => {
    m.flush.mockRejectedValueOnce(new Error("db down"));
    kickPush("u1");
    await expect((m.after.mock.calls[0]![0] as () => Promise<void>)()).resolves.toBeUndefined();
    expect(m.capture).toHaveBeenCalledWith("push-kick", expect.any(Error));
  });
});
