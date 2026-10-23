import { generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ flush: vi.fn() }));
vi.mock("../../../../lib/push/flush", () => ({ flushPush: m.flush }));
vi.mock("../../../../lib/push/send", () => ({ sendWebPush: vi.fn() }));
vi.mock("../../../../lib/switches/snapshot", () => ({ resolveSwitchEnvStrict: vi.fn() }));

import { resolveSwitchEnvStrict } from "../../../../lib/switches/snapshot";
import { GET } from "./route";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const jwk = publicKey.export({ format: "jwk" });
const KEYS = {
  VAPID_PUBLIC_KEY: Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x!, "base64url"), Buffer.from(jwk.y!, "base64url")]).toString("base64url"),
  VAPID_PRIVATE_KEY: privateKey.export({ format: "jwk" }).d!,
  VAPID_SUBJECT: "mailto:hugh@example.com",
};
const call = (auth?: string) => GET(new Request("http://localhost/api/cron/push-flush", { headers: auth ? { authorization: auth } : {} }) as never);
const set = (env: Record<string, string | undefined>) => { for (const [k, v] of Object.entries(env)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } };

beforeEach(() => {
  vi.clearAllMocks();
  set({ CRON_SECRET: "s3cret", ...KEYS });
  m.flush.mockResolvedValue({ rows: 0, readers: 0, sent: 0, held: 0, gone: 0, failed: 0, abandoned: 0, pruned: 0 });
});

describe("GET /api/cron/push-flush", () => {
  it("answers 503 and does nothing while CRON_SECRET is unset", async () => {
    set({ CRON_SECRET: undefined });
    expect((await call("Bearer s3cret")).status).toBe(503);
    expect(m.flush).not.toHaveBeenCalled();
  });

  it("refuses a missing or wrong bearer with 401 before anything runs", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer nope")).status).toBe(401);
    expect(m.flush).not.toHaveBeenCalled();
  });

  it("is DORMANT without the VAPID keys: 200, and nothing is read", async () => {
    for (const name of Object.keys(KEYS)) {
      set({ ...KEYS, [name]: undefined });
      const res = await call("Bearer s3cret");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ dormant: true });
    }
    expect(m.flush).not.toHaveBeenCalled();
  });

  it("flushes with the keys and answers the report", async () => {
    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ rows: 0, sent: 0 });
    expect(m.flush).toHaveBeenCalledOnce();
    expect(m.flush.mock.calls[0]?.[0].config.subject).toBe("mailto:hugh@example.com");
    // The STRICT read: a failed override read throws, so the flush's per-reader catch leaves the rows for the next run
    // instead of settling them under the environment's defaults.
    expect(m.flush.mock.calls[0]?.[0].resolveEnv).toBe(resolveSwitchEnvStrict);
  });

  it("answers 500 without a word of the error when the flush throws", async () => {
    m.flush.mockRejectedValue(new Error("secret detail"));
    const res = await call("Bearer s3cret");
    expect(res.status).toBe(500);
    expect(await res.text()).toBe("Flush failed");
  });
});
