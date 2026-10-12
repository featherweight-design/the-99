import { describe, expect, it, vi } from "vitest";

// The generation the memo is keyed on, moved by hand.
let generation = "g1";
vi.mock("../cache/catalog-generation", () => ({ catalogGeneration: async () => generation }));
vi.mock("../../db", () => ({ db: {} }));

const { loadPreconCatalog } = await import("./link-read");

describe("loadPreconCatalog", () => {
  it("reads once per catalog generation, and again once the generation moves", async () => {
    const read = vi.fn(async () => []);
    await loadPreconCatalog(1_000, read);
    await loadPreconCatalog(2_000, read);
    expect(read).toHaveBeenCalledTimes(1);
    generation = "g2";
    await loadPreconCatalog(3_000, read);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("does not keep a failed read", async () => {
    generation = "g3";
    const failing = vi.fn(async () => {
      throw new Error("down");
    });
    await expect(loadPreconCatalog(4_000, failing)).rejects.toThrow("down");
    const ok = vi.fn(async () => []);
    await loadPreconCatalog(5_000, ok);
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it("never lets a call that started earlier replace the memo a later call wrote", async () => {
    vi.resetModules();
    const generations: ((g: string) => void)[] = [];
    vi.doMock("../cache/catalog-generation", () => ({
      catalogGeneration: () => new Promise<string>((resolve) => generations.push(resolve)),
    }));
    const { loadPreconCatalog: load } = await import("./link-read");
    const old = [{ fileName: "old" }] as never;
    const fresh = [{ fileName: "new" }] as never;
    let reads = 0;
    const earlier = load(1_000, async () => (reads++, old));
    const later = load(1_000, async () => (reads++, fresh));
    // The later call learns the NEW generation first and writes the memo.
    generations[1]("new");
    await later;
    // The earlier call finishes last, on the old generation.
    generations[0]("old");
    await earlier;
    // A third call on the new generation is served from the later call's memo: no third read.
    const third = load(1_001, async () => (reads++, old));
    generations[2]("new");
    expect(await third).toBe(fresh);
    expect(reads).toBe(2);
    vi.doUnmock("../cache/catalog-generation");
  });

  // Drizzle's builder is a thenable that runs its query on EVERY then/catch. A memo holding one
  // re-ran the query on every await (staging, 2026-10-12: 126 runs at 492ms). Only a real promise
  // settles once.
  it("runs a lazy, re-executing read once, the way Drizzle's builder behaves", async () => {
    generation = "lazy";
    let executions = 0;
    // Like Drizzle's QueryPromise: `then` AND `catch` each run the query.
    const run = () => {
      executions += 1;
      return Promise.resolve([] as never[]);
    };
    const lazy = {
      then: (ok: (v: never[]) => unknown, no?: (e: unknown) => unknown) => run().then(ok, no),
      catch: (no: (e: unknown) => unknown) => run().catch(no),
    };
    await loadPreconCatalog(10_000, () => lazy);
    await loadPreconCatalog(10_001, () => lazy);
    await loadPreconCatalog(10_002, () => lazy);
    expect(executions).toBe(1);
  });
});
