import { beforeEach, describe, expect, it, vi } from "vitest";

// One Map is one request: `headers()` hands back the same object for the whole request, as Next's does.
const headerMap = vi.hoisted(() => ({ value: new Map<string, string>() as Map<string, string> | null }));
const perRequest = vi.hoisted(() => new WeakMap<Map<string, string>, { get: (name: string) => string | null }>());
vi.mock("next/headers", () => ({
  headers: async () => {
    if (headerMap.value === null) throw new Error("`headers` was called outside a request scope.");
    const h = headerMap.value;
    if (!perRequest.has(h)) perRequest.set(h, { get: (name: string) => h.get(name) ?? null });
    return perRequest.get(h)!;
  },
}));
const later = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("./sync", () => ({ syncWishlistLater: later }));
const capture = vi.hoisted(() => vi.fn());
vi.mock("../sentry/capture", () => ({ captureServerError: capture }));
const { isServerActionRequest, scheduleWishlistSyncAfterAction } = await import("./sync-trigger");

describe("isServerActionRequest", () => {
  it("is a fetch action by its next-action header, or a pre-hydration form post by its body type", () => {
    expect(isServerActionRequest({ action: "7f00ab", contentType: "text/plain;charset=UTF-8" })).toBe(true);
    expect(isServerActionRequest({ action: null, contentType: "multipart/form-data; boundary=x" })).toBe(true);
    expect(isServerActionRequest({ action: null, contentType: "application/x-www-form-urlencoded" })).toBe(true);
  });
  it("is not a page render, a prefetch or a JSON route call", () => {
    expect(isServerActionRequest({ action: null, contentType: null })).toBe(false);
    expect(isServerActionRequest({ action: null, contentType: "application/json" })).toBe(false);
  });
});

describe("scheduleWishlistSyncAfterAction", () => {
  beforeEach(() => { later.mockClear(); capture.mockClear(); });

  it("schedules a pass when the request carries the next-action header", async () => {
    headerMap.value = new Map([["next-action", "7f00ab"]]);
    await scheduleWishlistSyncAfterAction("user_1");
    expect(later).toHaveBeenCalledWith("user_1");
  });

  it("schedules one pass per request, however often the action calls it", async () => {
    headerMap.value = new Map([["next-action", "7f00ab"]]);
    await scheduleWishlistSyncAfterAction("user_1");
    await scheduleWishlistSyncAfterAction("user_1");
    expect(later).toHaveBeenCalledTimes(1);
    headerMap.value = new Map([["next-action", "7f00ab"]]);
    await scheduleWishlistSyncAfterAction("user_1");
    expect(later).toHaveBeenCalledTimes(2);
  });

  it("schedules nothing for a request without it (a page render or prefetch)", async () => {
    headerMap.value = new Map([["rsc", "1"]]);
    await scheduleWishlistSyncAfterAction("user_1");
    expect(later).not.toHaveBeenCalled();
  });

  it("does nothing, and throws nothing, outside a request scope", async () => {
    headerMap.value = null;
    await expect(scheduleWishlistSyncAfterAction("user_1")).resolves.toBeUndefined();
    expect(later).not.toHaveBeenCalled();
  });

  it("reports a pass it could not schedule to Sentry by its tag alone, and throws nothing", async () => {
    headerMap.value = new Map([["next-action", "7f00ab"]]);
    later.mockRejectedValueOnce(new Error("after() unavailable"));
    await expect(scheduleWishlistSyncAfterAction("user_1")).resolves.toBeUndefined();
    expect(capture).toHaveBeenCalledWith("cart-sync-schedule-failed", expect.any(Error));
  });

  it("reports nothing outside a request scope: no request is not a failure", async () => {
    headerMap.value = null;
    await scheduleWishlistSyncAfterAction("user_1");
    expect(capture).not.toHaveBeenCalled();
  });
});
