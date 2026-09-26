import { beforeEach, describe, expect, it, vi } from "vitest";

// The data cache, as a Map: a key stores what the function RETURNED, and a throw stores nothing.
const store = vi.hoisted(() => new Map<string, unknown>());
const stamp = vi.hoisted(() => ({ value: 0 as number | null }));
vi.mock("./user-lists", () => ({
  cacheForUser: vi.fn(async (userId: string, key: string[], load: () => Promise<unknown>) => {
    const k = [userId, ...key].join("|");
    if (store.has(k)) return store.get(k);
    const value = await load();
    store.set(k, value);
    return value;
  }),
}));
vi.mock("./user-data-stamp", () => ({ userDataStamp: vi.fn(async () => stamp.value) }));

import { cacheForUser } from "./user-lists";
import { cachePageForUser } from "./page-cache";
import { recordSoftFailure } from "./soft-failure";
import { AsyncLocalStorage } from "node:async_hooks";

// Next puts this on `globalThis` on the server, and soft-failure.ts reads it from there (see
// its header). These tests run outside Next, so they provide it.
(globalThis as { AsyncLocalStorage?: typeof AsyncLocalStorage }).AsyncLocalStorage ??= AsyncLocalStorage;

describe("cachePageForUser", () => {
  beforeEach(() => {
    store.clear();
    stamp.value = 0;
    vi.mocked(cacheForUser).mockClear();
  });

  it("serves a repeat from the cache while the reader's stamp stands", async () => {
    const load = vi.fn(async () => ({ value: { n: 1, at: new Date(0) }, store: true }));
    await cachePageForUser("u1", "decks", [], load);
    const again = await cachePageForUser("u1", "decks", [], load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(again.at).toBeInstanceOf(Date);
  });

  it("loads again once any write has moved the stamp", async () => {
    const load = vi.fn(async () => ({ value: { n: 1 }, store: true }));
    await cachePageForUser("u1", "decks", [], load);
    stamp.value = 1;
    await cachePageForUser("u1", "decks", [], load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps one reader's entry away from another's", async () => {
    const load = vi.fn(async () => ({ value: { n: 1 }, store: true }));
    await cachePageForUser("u1", "decks", [], load);
    await cachePageForUser("u2", "decks", [], load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("serves a result marked not to be stored, and stores nothing", async () => {
    const load = vi.fn(async () => ({ value: { degraded: true }, store: false }));
    expect(await cachePageForUser("u1", "home", [], load)).toEqual({ degraded: true });
    expect(store.size).toBe(0);
    await cachePageForUser("u1", "home", [], load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("serves a load during which a read fell back, and stores nothing", async () => {
    const load = vi.fn(async () => {
      recordSoftFailure();
      return { value: { inUse: [] }, store: true };
    });
    expect(await cachePageForUser("u1", "home", [], load)).toEqual({ inUse: [] });
    expect(store.size).toBe(0);
  });

  it("caches nothing when the stamp cannot be read", async () => {
    stamp.value = null;
    const load = vi.fn(async () => ({ value: { n: 1 }, store: true }));
    await cachePageForUser("u1", "decks", [], load);
    expect(cacheForUser).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("lets a load's own failure through", async () => {
    await expect(cachePageForUser("u1", "decks", [], async () => { throw new Error("db down"); }))
      .rejects.toThrow("db down");
  });
});
