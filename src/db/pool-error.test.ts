import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const captureServerError = vi.fn();
vi.mock("../lib/sentry/capture", () => ({ captureServerError }));

import { ADMIN_SHUTDOWN, attachPoolErrorHandler, lostConnection, POOL_ERROR_TAG, POOL_RETRY_TAG, readOnlyStatement, retryLostConnectionReads } from "./pool-error";

describe("attachPoolErrorHandler", () => {
  beforeEach(() => {
    captureServerError.mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("makes an emitted idle-client error survivable and reports it once", async () => {
    const pool = attachPoolErrorHandler(new EventEmitter() as EventEmitter & Parameters<typeof attachPoolErrorHandler>[0]);
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
    const pool = new EventEmitter() as EventEmitter & Parameters<typeof attachPoolErrorHandler>[0];
    expect(attachPoolErrorHandler(pool)).toBe(pool);
  });

  it("gives every client the pool makes its own listener, so a checked-out client's FATAL does not throw", () => {
    const pool = attachPoolErrorHandler(new EventEmitter() as EventEmitter & Parameters<typeof attachPoolErrorHandler>[0]);
    const client = new EventEmitter();
    pool.emit("connect", client);
    expect(() => client.emit("error", Object.assign(new Error("terminating"), { code: ADMIN_SHUTDOWN }))).not.toThrow();
    // Silent: the holder's next statement fails and reports, and an idle client's error reaches the pool's handler.
    expect(captureServerError).not.toHaveBeenCalled();
  });
});

describe("retryLostConnectionReads", () => {
  const shutdown = () => Object.assign(new Error("terminating connection due to administrator command"), { code: ADMIN_SHUTDOWN });

  beforeEach(() => {
    captureServerError.mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("runs a read that met a 57P01 once more, with the same arguments, returns its result and reports the retry", async () => {
    const query = vi.fn().mockRejectedValueOnce(shutdown()).mockResolvedValueOnce({ rows: [1] });
    const pool = retryLostConnectionReads({ query });
    await expect(pool.query({ text: "select 1" }, [2])).resolves.toEqual({ rows: [1] });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenNthCalledWith(2, { text: "select 1" }, [2]);
    await vi.waitFor(() => expect(captureServerError).toHaveBeenCalledWith(POOL_RETRY_TAG, expect.anything()));
  });

  it("retries a read that met the driver's codeless lost-connection error, read through Drizzle's wrapper", async () => {
    const wrapped = Object.assign(new Error("Failed query"), { cause: new Error("Connection terminated unexpectedly") });
    const query = vi.fn().mockRejectedValueOnce(wrapped).mockResolvedValueOnce("ok");
    await expect(retryLostConnectionReads({ query }).query("select 1")).resolves.toBe("ok");
  });

  it("never retries a write: it may have committed before the FATAL", async () => {
    for (const text of ["insert into t values (1)", "update t set a = 1", "with x as (delete from t returning *) select * from x"]) {
      const err = shutdown();
      const query = vi.fn().mockRejectedValueOnce(err);
      await expect(retryLostConnectionReads({ query }).query({ text })).rejects.toBe(err);
      expect(query).toHaveBeenCalledTimes(1);
    }
  });

  it("retries only once: a second lost connection is the caller's", async () => {
    const second = shutdown();
    const query = vi.fn().mockRejectedValueOnce(shutdown()).mockRejectedValueOnce(second);
    await expect(retryLostConnectionReads({ query }).query("select 1")).rejects.toBe(second);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("never retries any other error", async () => {
    const other = Object.assign(new Error("duplicate key"), { code: "23505" });
    const query = vi.fn().mockRejectedValueOnce(other);
    await expect(retryLostConnectionReads({ query }).query("select 1")).rejects.toBe(other);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("leaves the callback form alone: a lost connection handed to the callback is not retried", () => {
    const query = vi.fn((_text: string, cb: (e: Error) => void) => { cb(shutdown()); return undefined; });
    const cb = vi.fn();
    expect(retryLostConnectionReads({ query }).query("select 1", cb)).toBeUndefined();
    expect(query).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe("readOnlyStatement and lostConnection", () => {
  it("reads a SELECT and a WITH that writes nothing as reads, and nothing else", () => {
    expect(readOnlyStatement("  SELECT 1")).toBe(true);
    expect(readOnlyStatement({ text: "with a as (select 1) select * from a" })).toBe(true);
    expect(readOnlyStatement({ text: "with a as (update t set x = 1 returning *) select * from a" })).toBe(false);
    expect(readOnlyStatement("insert into t select 1")).toBe(false);
    expect(readOnlyStatement(undefined)).toBe(false);
  });

  it("knows a lost connection by its SQLSTATE or the driver's words, and nothing else", () => {
    expect(lostConnection(Object.assign(new Error("x"), { code: ADMIN_SHUTDOWN }))).toBe(true);
    expect(lostConnection(new Error("Client has encountered a connection error and is not queryable"))).toBe(true);
    expect(lostConnection(Object.assign(new Error("x"), { code: "57014" }))).toBe(false);
    expect(lostConnection(new Error("relation does not exist"))).toBe(false);
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
