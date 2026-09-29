// The catalog generation belongs to the KEY, which is the whole of #705.
//
// A tag cannot carry it: tags here are per reader, and the weekly refresh has no list of
// readers to drop. What these cases pin is that two catalogs cannot share a cache entry,
// and that a reader's own identity and parameters still separate entries as before.
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ keys: [] as string[][], tags: [] as string[][] }));
const generation = vi.hoisted(() => ({ value: "111" }));

vi.mock("next/cache", () => ({
  unstable_cache: (load: () => unknown, key: string[], opts: { tags?: string[] }) => {
    calls.keys.push(key);
    if (opts?.tags) calls.tags.push(opts.tags);
    return load;
  },
  updateTag: () => {},
}));
vi.mock("./catalog-generation", () => ({
  catalogGeneration: async () => generation.value,
}));
const deployment = vi.hoisted(() => ({ id: "dpl_a" }));
vi.mock("./deployment", () => ({
  get DEPLOYMENT_ID() {
    return deployment.id;
  },
}));

const { cacheForUser } = await import("./user-lists");

beforeEach(() => {
  calls.keys.length = 0;
  calls.tags.length = 0;
  generation.value = "111";
  deployment.id = "dpl_a";
});

const keyFor = async (userId: string, key: string[]) => {
  await cacheForUser(userId, key, async () => "payload");
  return calls.keys[calls.keys.length - 1];
};

describe("cacheForUser", () => {
  it("files an entry under the catalog it was built from", async () => {
    expect(await keyFor("u1", ["sets-index"])).toEqual([
      "user-lists", "u1", "dpl_a", "111", "sets-index",
    ]);
  });

  // The point: after a refresh the old entry is not invalidated, it is never asked for.
  it("asks a different question after the catalog moves", async () => {
    const before = await keyFor("u1", ["sets-index"]);
    generation.value = "222";
    const after = await keyFor("u1", ["sets-index"]);
    expect(after).not.toEqual(before);
  });

  // A deploy retires every entry without any caller bumping a version: a build that changes
  // what a payload says would otherwise serve the previous build's shape until the hour ceiling.
  it("asks a different question after a deploy", async () => {
    const before = await keyFor("u1", ["sets-index"]);
    deployment.id = "dpl_b";
    const after = await keyFor("u1", ["sets-index"]);
    expect(after).not.toEqual(before);
  });

  // The generation is an addition, not a replacement: a reader's own writes still drop
  // their entries through the tag, which is the only thing that can act within the minute
  // the generation is cached for.
  it("keeps the per-reader tag", async () => {
    await cacheForUser("u1", ["sets-index"], async () => "payload");
    expect(calls.tags[0]).toEqual(["user-lists:u1"]);
  });

  it("still separates readers and parameters", async () => {
    const mine = await keyFor("u1", ["sets-index"]);
    const theirs = await keyFor("u2", ["sets-index"]);
    const other = await keyFor("u1", ["browse-2"]);
    expect(mine).not.toEqual(theirs);
    expect(mine).not.toEqual(other);
  });
});
