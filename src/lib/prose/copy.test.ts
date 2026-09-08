import { describe, expect, it, vi } from "vitest";
import { copyCommanderProse, type ProseSource, type ProseTarget } from "./copy";
import { proseInputHash, PROSE_PROMPT_VERSION } from "./prompt";

const TAGS = [{ slug: "spellslinger", label: "Spellslinger", count: 900 }];
const NAME = "Kess, Dissident Mage";
const ORACLE = "oracle-kess";
const HASH = proseInputHash(ORACLE, NAME, TAGS);

const SENTENCE =
  "Kess decks tend to cast the same few spells twice, leaning on cheap draw and graveyard value rather than one combo line.";

function sourceRow(overrides: Partial<ProseSource> = {}): ProseSource {
  return {
    oracleId: ORACLE,
    prose: SENTENCE,
    proseInputHash: HASH,
    prosePromptVersion: PROSE_PROMPT_VERSION,
    ...overrides,
  };
}

function targetRow(overrides: Partial<ProseTarget> = {}): ProseTarget {
  return {
    oracleId: ORACLE,
    name: NAME,
    tags: TAGS,
    prose: null,
    proseInputHash: null,
    ...overrides,
  };
}

describe("copyCommanderProse", () => {
  it("installs a sentence whose hash matches the target's own inputs", async () => {
    const write = vi.fn(async () => {});
    const r = await copyCommanderProse({
      loadSource: async () => [sourceRow()],
      loadTarget: async () => [targetRow()],
      write,
    });
    expect(write).toHaveBeenCalledWith(sourceRow());
    expect(r).toEqual({ installed: 1, fresh: 0, missing: 0, drifted: 0 });
  });

  // The guard that makes the copy safe: the source's hash was computed from the source's
  // inputs, and only the target's inputs decide whether the sentence still describes it.
  it("leaves a row alone when the target's tags have moved", async () => {
    const write = vi.fn(async () => {});
    const r = await copyCommanderProse({
      loadSource: async () => [sourceRow()],
      loadTarget: async () => [
        targetRow({ tags: [{ slug: "reanimator", label: "Reanimator", count: 700 }] }),
      ],
      write,
    });
    expect(write).not.toHaveBeenCalled();
    expect(r).toEqual({ installed: 0, fresh: 0, missing: 0, drifted: 1 });
  });

  it("leaves a row alone when the target's name has moved under the same oracle id", async () => {
    const write = vi.fn(async () => {});
    const r = await copyCommanderProse({
      loadSource: async () => [sourceRow()],
      loadTarget: async () => [targetRow({ name: "Kess, Dissident Magus" })],
      write,
    });
    expect(write).not.toHaveBeenCalled();
    expect(r).toEqual({ installed: 0, fresh: 0, missing: 0, drifted: 1 });
  });

  it("counts a commander the source never generated as missing", async () => {
    const r = await copyCommanderProse({
      loadSource: async () => [],
      loadTarget: async () => [targetRow()],
      write: async () => {},
    });
    expect(r).toEqual({ installed: 0, fresh: 0, missing: 1, drifted: 0 });
  });

  // Re-running the copy must not rewrite what it already wrote.
  it("skips a target row that already holds a current sentence", async () => {
    const write = vi.fn(async () => {});
    const r = await copyCommanderProse({
      loadSource: async () => [sourceRow()],
      loadTarget: async () => [targetRow({ prose: SENTENCE, proseInputHash: HASH })],
      write,
    });
    expect(write).not.toHaveBeenCalled();
    expect(r).toEqual({ installed: 0, fresh: 1, missing: 0, drifted: 0 });
  });

  // A sentence the target generated under older inputs is worth replacing with one that is
  // current, which is the same judgement the generator makes when it regenerates a stale row.
  it("replaces a stale sentence on the target with a current one", async () => {
    const write = vi.fn(async () => {});
    const r = await copyCommanderProse({
      loadSource: async () => [sourceRow()],
      loadTarget: async () => [targetRow({ prose: "something older", proseInputHash: "stale" })],
      write,
    });
    expect(write).toHaveBeenCalledWith(sourceRow());
    expect(r).toEqual({ installed: 1, fresh: 0, missing: 0, drifted: 0 });
  });
});
