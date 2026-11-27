import { beforeEach, describe, expect, it, vi } from "vitest";

const headerMap = vi.hoisted(() => ({ value: new Map<string, string>() as Map<string, string> | null }));
vi.mock("next/headers", () => ({
  headers: async () => {
    if (headerMap.value === null) throw new Error("`headers` was called outside a request scope.");
    const h = headerMap.value;
    return { get: (name: string) => h.get(name) ?? null };
  },
}));
const later = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("./sync", () => ({ syncWishlistLater: later }));
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
  beforeEach(() => later.mockClear());

  it("schedules a pass when the request carries the next-action header", async () => {
    headerMap.value = new Map([["next-action", "7f00ab"]]);
    await scheduleWishlistSyncAfterAction("user_1");
    expect(later).toHaveBeenCalledWith("user_1");
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
});
