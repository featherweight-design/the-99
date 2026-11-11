import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const captureServerError = vi.fn();
vi.mock("../lib/sentry/capture", async () => ({
  captureServerError,
  sqlState: (await vi.importActual<typeof import("../lib/sentry/capture")>("../lib/sentry/capture")).sqlState,
}));

import { attachPoolErrorHandler, POOL_ERROR_TAG } from "./pool-error";

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("attachPoolErrorHandler", () => {
  beforeEach(() => {
    captureServerError.mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("makes an emitted idle-client error survivable and reports it once", async () => {
    const pool = attachPoolErrorHandler(new EventEmitter() as EventEmitter & { on(e: "error", l: (x: Error) => void): EventEmitter });
    const fatal = Object.assign(new Error("terminating connection due to administrator command"), { code: "57P01" });
    expect(() => pool.emit("error", fatal)).not.toThrow();
    await flush();
    expect(captureServerError).toHaveBeenCalledTimes(1);
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
