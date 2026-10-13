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
const enabled = vi.hoisted(() => ({ value: true }));
vi.mock("./list-cache-flag", () => ({ listCacheEnabled: () => enabled.value }));
// The reader's resolved switches, as `requestSwitchEnv` hands them over.
const switchEnv = vi.hoisted(() => ({ value: {} as NodeJS.ProcessEnv }));
// The environment, with any override a test lays over it, as the resolver hands it back.
vi.mock("../switches/request", () => ({ requestSwitchEnv: vi.fn(async () => ({ ...process.env, ...switchEnv.value })) }));

import { cacheForUser } from "./user-lists";
import { requestSwitchEnv } from "../switches/request";
import { switchBits } from "../switches/resolve";
import { analysisTabEnabled } from "../decks/analysis-flag";
import { userDataStamp } from "./user-data-stamp";
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
    enabled.value = true;
    switchEnv.value = {} as unknown as NodeJS.ProcessEnv;
    vi.mocked(cacheForUser).mockClear();
    vi.mocked(userDataStamp).mockClear();
    vi.mocked(requestSwitchEnv).mockClear();
    vi.unstubAllEnvs();
  });

  it("hands the loader the env its key was built from, so the reader's override wins over the environment", async () => {
    vi.stubEnv("ANALYSIS_TAB_ENABLED", "false");
    switchEnv.value = { ANALYSIS_TAB_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    let seen: NodeJS.ProcessEnv | undefined;
    const value = await cachePageForUser("u1", "decks", [], async (env) => {
      seen = env;
      return { value: { bracket: analysisTabEnabled(env) }, store: true };
    });
    expect(value).toEqual({ bracket: true });
    expect(requestSwitchEnv).toHaveBeenCalledWith("u1");
    // The key's switch bits are the loader's env, bit for bit.
    expect(vi.mocked(cacheForUser).mock.calls[0][1][2]).toBe(switchBits(seen!));
  });

  it("uses an env the page already resolved, and resolves nothing of its own", async () => {
    const env = { ...process.env, ANALYSIS_TAB_ENABLED: "true" } as NodeJS.ProcessEnv;
    let seen: NodeJS.ProcessEnv | undefined;
    await cachePageForUser("u1", "decks", [], async (e) => ((seen = e), { value: 1, store: true }), env);
    expect(seen).toBe(env);
    expect(requestSwitchEnv).not.toHaveBeenCalled();
    expect(vi.mocked(cacheForUser).mock.calls[0][1][2]).toBe(switchBits(env));
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

  it("loads again when an override flips one of the reader's switches, with no write and no redeploy", async () => {
    const load = vi.fn(async () => ({ value: { n: 1 }, store: true }));
    await cachePageForUser("u1", "decks", [], load);
    switchEnv.value = { DECK_NOTES_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    await cachePageForUser("u1", "decks", [], load);
    expect(load).toHaveBeenCalledTimes(2);
    // And back again: the first entry is still true for the switches it was drawn under.
    switchEnv.value = {} as unknown as NodeJS.ProcessEnv;
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

  it("loads again once SOCIAL_FRIENDS_ENABLED flips: the switch is in the key", async () => {
    const before = process.env.SOCIAL_FRIENDS_ENABLED;
    try {
      delete process.env.SOCIAL_FRIENDS_ENABLED;
      const load = vi.fn(async () => ({ value: { n: 1 }, store: true }));
      await cachePageForUser("u1", "decks", [], load);
      process.env.SOCIAL_FRIENDS_ENABLED = "true";
      await cachePageForUser("u1", "decks", [], load);
      expect(load).toHaveBeenCalledTimes(2);
    } finally {
      if (before === undefined) delete process.env.SOCIAL_FRIENDS_ENABLED;
      else process.env.SOCIAL_FRIENDS_ENABLED = before;
    }
  });

  it("caches nothing when the stamp cannot be read", async () => {
    stamp.value = null;
    const load = vi.fn(async () => ({ value: { n: 1 }, store: true }));
    await cachePageForUser("u1", "decks", [], load);
    expect(cacheForUser).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("switched off, reads no stamp, stores nothing and runs the load every time", async () => {
    enabled.value = false;
    const load = vi.fn(async () => ({ value: { n: 1 }, store: true }));
    await cachePageForUser("u1", "decks", [], load);
    await cachePageForUser("u1", "decks", [], load);
    expect(load).toHaveBeenCalledTimes(2);
    expect(userDataStamp).not.toHaveBeenCalled();
    expect(cacheForUser).not.toHaveBeenCalled();
  });

  it("lets a load's own failure through", async () => {
    await expect(cachePageForUser("u1", "decks", [], async () => { throw new Error("db down"); }))
      .rejects.toThrow("db down");
  });
});
