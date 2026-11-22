import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSavedFields, readSavedFields, writeSavedFields } from "./saved-fields";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("saved fields with no usable storage", () => {
  it("answers no copy, and throws nothing, when the browser has no IndexedDB", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(readSavedFields("collection")).resolves.toBeNull();
    await expect(writeSavedFields("collection", { token: "t", fields: {} })).resolves.toBeUndefined();
    await expect(clearSavedFields()).resolves.toBeUndefined();
  });

  it("answers no copy when opening throws (blocked site data, a private window)", async () => {
    vi.stubGlobal("indexedDB", {
      open: () => {
        throw new Error("SecurityError");
      },
      deleteDatabase: () => {
        throw new Error("SecurityError");
      },
    });
    await expect(readSavedFields("collection")).resolves.toBeNull();
    await expect(writeSavedFields("collection", { token: "t", fields: {} })).resolves.toBeUndefined();
    await expect(clearSavedFields()).resolves.toBeUndefined();
  });

  it("answers no copy when the open request fails", async () => {
    vi.stubGlobal("indexedDB", {
      open: () => {
        const req: { onerror?: () => void } = {};
        queueMicrotask(() => req.onerror?.());
        return req;
      },
    });
    await expect(readSavedFields("collection")).resolves.toBeNull();
  });

  it("gives up on an open that never answers, so fetching and sign-out are not held", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("indexedDB", { open: () => ({}), deleteDatabase: () => ({}) });
    const read = readSavedFields("collection");
    const clear = clearSavedFields();
    await vi.advanceTimersByTimeAsync(2_500);
    await expect(read).resolves.toBeNull();
    await expect(clear).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it("does not write after a clear that came while the write was opening", async () => {
    const put = vi.fn();
    const db = { transaction: () => ({ objectStore: () => ({ put }) }), close: vi.fn(), objectStoreNames: { contains: () => true } };
    vi.stubGlobal("indexedDB", {
      open: () => {
        const req: { result?: unknown; onsuccess?: () => void } = { result: db };
        queueMicrotask(() => queueMicrotask(() => req.onsuccess?.()));
        return req;
      },
      deleteDatabase: () => {
        const req: { onsuccess?: () => void } = {};
        queueMicrotask(() => req.onsuccess?.());
        return req;
      },
    });
    const write = writeSavedFields("collection", { token: "t", fields: {} });
    await clearSavedFields();
    await write;
    expect(put).not.toHaveBeenCalled();
    expect(db.close).toHaveBeenCalled();
  });
});
