import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const captureServerError = vi.fn();
vi.mock("../lib/sentry/capture", async () => ({
  captureServerError,
  sqlState: (await vi.importActual<typeof import("../lib/sentry/capture")>("../lib/sentry/capture")).sqlState,
}));

import { ADMIN_SHUTDOWN, attachPoolErrorHandler, POOL_ERROR_TAG, retryAdminShutdown } from "./pool-error";

describe("attachPoolErrorHandler", () => {
  beforeEach(() => {
    captureServerError.mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("makes an emitted idle-client error survivable and reports it once", async () => {
    const pool = attachPoolErrorHandler(new EventEmitter() as EventEmitter & { on(e: "error", l: (x: Error) => void): EventEmitter });
    const fatal = Object.assign(new Error("terminating connection due to administrator command"), { code: "57P01" });
    expect(() => pool.emit("error", fatal)).not.toThrow();
    await vi.waitFor(() => expect(captureServerError).toHaveBeenCalledTimes(1));
    expect(captureServerError).toHaveBeenCalledWith(POOL_ERROR_TAG, fatal);
  });

  it("without the handler the same emit throws (the crash it prevents)", () => {
    const bare = new EventEmitter();
    expect(() => bare.emit("error", new Error("x"))).toThrow();
  });

  it("returns the pool it was given", () => {
    const pool = new EventEmitter() as EventEmitter & { on(e: "error", l: (x: Error) => void): EventEmitter };
    expect(attachPoolErrorHandler(pool)).toBe(pool);
  });
});

describe("retryAdminShutdown", () => {
  const shutdown = () => Object.assign(new Error("terminating connection due to administrator command"), { code: ADMIN_SHUTDOWN });

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("runs a query that met a 57P01 once more, with the same arguments, and returns its result", async () => {
    const query = vi.fn().mockRejectedValueOnce(shutdown()).mockResolvedValueOnce({ rows: [1] });
    const pool = retryAdminShutdown({ query });
    await expect(pool.query("select 1", [2])).resolves.toEqual({ rows: [1] });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenNthCalledWith(2, "select 1", [2]);
  });

  it("reads the code through Drizzle's wrapper (on the cause)", async () => {
    const wrapped = Object.assign(new Error("Failed query"), { cause: shutdown() });
    const query = vi.fn().mockRejectedValueOnce(wrapped).mockResolvedValueOnce("ok");
    await expect(retryAdminShutdown({ query }).query()).resolves.toBe("ok");
  });

  it("retries only once: a second 57P01 is the caller's", async () => {
    const second = shutdown();
    const query = vi.fn().mockRejectedValueOnce(shutdown()).mockRejectedValueOnce(second);
    await expect(retryAdminShutdown({ query }).query()).rejects.toBe(second);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("never retries any other error", async () => {
    const other = Object.assign(new Error("duplicate key"), { code: "23505" });
    const query = vi.fn().mockRejectedValueOnce(other);
    await expect(retryAdminShutdown({ query }).query()).rejects.toBe(other);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("passes the callback form through untouched", () => {
    const query = vi.fn().mockReturnValue(undefined);
    const cb = () => {};
    expect(retryAdminShutdown({ query }).query("select 1", cb)).toBeUndefined();
    expect(query).toHaveBeenCalledWith("select 1", cb);
  });
});

describe("the shared pool in src/db/index.ts", () => {
  it("has the handler attached exactly once, across module reloads", async () => {
    vi.resetModules();
    vi.doMock("@neondatabase/serverless", () => ({ Pool: class extends EventEmitter { query() { return Promise.resolve(); } }, neonConfig: {} }));
    vi.doMock("drizzle-orm/neon-serverless", () => ({ drizzle: () => ({}) }));
    vi.doMock("ws", () => ({ default: class {} }));
    vi.doMock("./schema", () => ({}));
    vi.stubEnv("DATABASE_URL", "postgres://stub:stub@localhost/stub");
    const shared = globalThis as typeof globalThis & { __the99Pool?: EventEmitter };
    const listeners = () => (shared.__the99Pool as EventEmitter | undefined)?.listenerCount("error");
    delete shared.__the99Pool;
    await import("./index");
    expect(listeners()).toBe(1);
    vi.resetModules();
    await import("./index");
    expect(listeners()).toBe(1);
    delete shared.__the99Pool;
    vi.unstubAllEnvs();
    vi.doUnmock("@neondatabase/serverless");
  });
});
