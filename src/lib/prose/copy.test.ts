import { describe, expect, it, vi } from "vitest";
import { copyCommanderProse, type ProseSource, type ProseTarget } from "./copy";
import { legacyProseInputHash, proseInputHash, PROSE_PROMPT_VERSION } from "./prompt";

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
    expect(r).toEqual({ installed: 1, fresh: 0, suppressed: 0, missing: 0, drifted: 0 });
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
    expect(r).toEqual({ installed: 0, fresh: 0, suppressed: 0, missing: 0, drifted: 1 });
  });

  it("leaves a row alone when the target's name has moved under the same oracle id", async () => {
    const write = vi.fn(async () => {});
    const r = await copyCommanderProse({
      loadSource: async () => [sourceRow()],
      loadTarget: async () => [targetRow({ name: "Kess, Dissident Magus" })],
      write,
    });
    expect(write).not.toHaveBeenCalled();
    expect(r).toEqual({ installed: 0, fresh: 0, suppressed: 0, missing: 0, drifted: 1 });
  });

  it("counts a commander the source never generated as missing", async () => {
    const r = await copyCommanderProse({
      loadSource: async () => [],
      loadTarget: async () => [targetRow()],
      write: async () => {},
    });
    expect(r).toEqual({ installed: 0, fresh: 0, suppressed: 0, missing: 1, drifted: 0 });
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
    expect(r).toEqual({ installed: 0, fresh: 1, suppressed: 0, missing: 0, drifted: 0 });
  });

  // The list is the only recourse for a sentence that reads as confident and is false, and a
  // source generated before an id was added to it still holds that sentence — so this is the
  // one path that could put a pulled sentence back.
  it("never installs a sentence for a suppressed commander", async () => {
    const write = vi.fn(async () => {});
    const r = await copyCommanderProse({
      loadSource: async () => [sourceRow()],
      loadTarget: async () => [targetRow()],
      write,
      suppressed: (oracleId) => oracleId === ORACLE,
    });
    expect(write).not.toHaveBeenCalled();
    expect(r).toEqual({ installed: 0, fresh: 0, suppressed: 1, missing: 0, drifted: 0 });
  });

  // Suppression outranks freshness: a stored sentence for a newly suppressed id must not be
  // refreshed either, so the check has to come before the hash comparison, not after it.
  it("leaves a suppressed commander alone even when the source is current", async () => {
    const write = vi.fn(async () => {});
    const r = await copyCommanderProse({
      loadSource: async () => [sourceRow()],
      loadTarget: async () => [targetRow({ prose: "something older", proseInputHash: "stale" })],
      write,
      suppressed: () => true,
    });
    expect(write).not.toHaveBeenCalled();
    expect(r).toEqual({ installed: 0, fresh: 0, suppressed: 1, missing: 0, drifted: 0 });
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
    expect(r).toEqual({ installed: 1, fresh: 0, suppressed: 0, missing: 0, drifted: 0 });
  });

  // A source stamped before the hash changed still fits a target whose inputs produce that
  // legacy hash, and lands carrying the new stamp so the target reads it as current.
  it("installs a legacy-stamped source under the new hash", async () => {
    const write = vi.fn(async () => {});
    const legacy = sourceRow({ proseInputHash: legacyProseInputHash(ORACLE, NAME, TAGS) });
    const r = await copyCommanderProse({
      loadSource: async () => [legacy],
      loadTarget: async () => [targetRow()],
      write,
    });
    expect(write).toHaveBeenCalledWith({ ...legacy, proseInputHash: HASH });
    expect(r).toEqual({ installed: 1, fresh: 0, suppressed: 0, missing: 0, drifted: 0 });
  });
});
