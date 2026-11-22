import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSavedFields, readSavedFields, writeSavedFields } from "./saved-fields";

afterEach(() => vi.unstubAllGlobals());

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
});
