// Hide follow-up D1: a For you or Discover payload built on the OLD hidden set can never be served after a hide or an
// unhide, because the entry is filed under the set it was built from and every later request asks under the new one.
//
// The data cache here is a real lookup by key (a Map), so what is pinned is the serve, not only the key's shape: the
// late build of the race (read set A, finish after the unhide's `updateTag`) is filed, and still never answers B.
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => new Map<string, unknown>());
vi.mock("next/cache", () => ({
  unstable_cache: (load: () => Promise<unknown>, key: string[]) => async () => {
    const at = JSON.stringify(key);
    if (store.has(at)) return store.get(at);
    const value = await load();
    store.set(at, value);
    return value;
  },
  updateTag: () => {},
}));
vi.mock("../cache/catalog-generation", () => ({ catalogGeneration: async () => "111" }));
vi.mock("../cache/deployment", () => ({ DEPLOYMENT_ID: "dpl_a" }));

const { cacheForUser } = await import("../cache/user-lists");
const { hiddenSetKey } = await import("./hidden-key");

const keyOf = (hidden: readonly string[]) => ["commander-rankings", "v12", "basis:labels", hiddenSetKey(hidden)];
/** A build that drops exactly the set it is handed, as the cached loaders do. */
const build = (hidden: readonly string[]) => async () => ({ shown: ["a", "b", "c"].filter((id) => !hidden.includes(id)) });

beforeEach(() => store.clear());

describe("hiddenSetKey", () => {
  it("names the set, not its order, and moves when the set does", () => {
    expect(hiddenSetKey([])).toBe("hidden:none");
    expect(hiddenSetKey(["a", "b"])).toBe(hiddenSetKey(["b", "a"]));
    expect(hiddenSetKey(["b"])).not.toBe(hiddenSetKey([]));
    expect(hiddenSetKey(["a", "b"])).not.toBe(hiddenSetKey(["b"]));
    expect(hiddenSetKey(["a", "b"])).toMatch(/^hidden:[0-9a-f]{12}$/);
  });

  it("never serves a payload built on the old hidden set under the new set's key", async () => {
    const before = ["b"];
    const after: string[] = [];
    // The late build: it read set A (b hidden), and its entry lands after the unhide that made set B.
    expect(await cacheForUser("u1", keyOf(before), build(before))).toEqual({ shown: ["a", "c"] });
    expect(keyOf(after)).not.toEqual(keyOf(before));
    // The reload after the unhide asks under B's key: A's payload is not what comes back.
    expect(await cacheForUser("u1", keyOf(after), build(after))).toEqual({ shown: ["a", "b", "c"] });
    // And A's entry is still filed, under A alone: only a reader whose set is A again is served it.
    expect(await cacheForUser("u1", keyOf(before), build(["never read"]))).toEqual({ shown: ["a", "c"] });
  });
});
