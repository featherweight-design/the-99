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
});
