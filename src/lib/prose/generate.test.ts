import { describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown> }));
vi.mock("../../db", () => ({ db: stub.db }));
vi.mock("../cache/stamp-catalog", () => ({ stampCatalogRefresh: vi.fn(async () => {}) }));

import { generateCommanderProse, restampCommanderProse, type ProseCandidate } from "./generate";
import { legacyProseInputHash, proseInputHash } from "./prompt";

const TAGS = [{ slug: "spellslinger", label: "Spellslinger", count: 900 }];

const ACCEPTED =
  "Kess decks tend to cast the same few spells twice, leaning on cheap draw and graveyard value rather than one combo line.";

function candidate(overrides: Partial<ProseCandidate> = {}): ProseCandidate {
  return {
    oracleId: "oracle-kess",
    name: "Kess, Dissident Mage",
    tags: TAGS,
    prose: null,
    proseInputHash: null,
    ...overrides,
  };
}

describe("generateCommanderProse", () => {
  it("asks no more than maxCommanders, and defers the rest to the next run", async () => {
    const complete = vi.fn(async () => ACCEPTED);
    const write = vi.fn(async () => {});
    const r = await generateCommanderProse({
      complete,
      loadCandidates: async () => [candidate({ oracleId: "a" }), candidate({ oracleId: "b" }), candidate({ oracleId: "c" })],
      write,
      maxCommanders: 2,
    });
    expect(r.written).toBe(2);
    expect(r.deferred).toBe(1);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("counts what a dry run would generate and calls nothing", async () => {
    const complete = vi.fn(async () => ACCEPTED);
    const write = vi.fn(async () => {});
    const fresh = candidate({ oracleId: "oracle-kess", prose: ACCEPTED, proseInputHash: proseInputHash("oracle-kess", "Kess, Dissident Mage", TAGS) });
    const r = await generateCommanderProse({
      complete,
      loadCandidates: async () => [fresh, candidate({ oracleId: "b" })],
      write,
      dryRun: true,
    });
    expect({ written: r.written, fresh: r.fresh, deferred: r.deferred }).toEqual({ written: 0, fresh: 1, deferred: 1 });
    expect(complete).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it("writes an accepted string with its input hash", async () => {
    const write = vi.fn(async () => {});
    const r = await generateCommanderProse({
      complete: async () => ACCEPTED,
      loadCandidates: async () => [candidate()],
      write,
    });
    expect(r.written).toBe(1);
    expect(write).toHaveBeenCalledWith(
      "oracle-kess",
      ACCEPTED,
      proseInputHash("oracle-kess", "Kess, Dissident Mage", TAGS),
    );
  });

  // The whole point of the contract: a string that fails it is not stored, not shortened.
  it("leaves the row null when every attempt fails the contract", async () => {
    const write = vi.fn(async () => {});
    const r = await generateCommanderProse({
      complete: async () => "Kess decks are good.",
      loadCandidates: async () => [candidate()],
      write,
      attempts: 2,
    });
    expect(write).not.toHaveBeenCalled();
    expect(r).toMatchObject({ written: 0, rejected: 1, failed: 0 });
  });

  it("retries a rejection and keeps the first acceptable string", async () => {
    const replies = ["too short", ACCEPTED];
    const r = await generateCommanderProse({
      complete: async () => replies.shift() ?? null,
      loadCandidates: async () => [candidate()],
      write: async () => {},
      attempts: 3,
    });
    expect(r.written).toBe(1);
    expect(replies).toHaveLength(0);
  });

  it("counts an unreachable model separately from a rejected string", async () => {
    const r = await generateCommanderProse({
      complete: async () => null,
      loadCandidates: async () => [candidate()],
      write: async () => {},
      attempts: 2,
    });
    expect(r).toMatchObject({ rejected: 0, failed: 1 });
  });

  // A client that throws is unreachable by another name, and the commanders behind this
  // one in the batch still have to be asked.
  it("carries on past a model client that throws", async () => {
    const write = vi.fn(async () => {});
    let call = 0;
    const r = await generateCommanderProse({
      complete: async () => {
        if (++call === 1) throw new Error("socket hang up");
        return ACCEPTED;
      },
      loadCandidates: async () => [
        candidate({ oracleId: "oracle-thrown", name: "Thrown" }),
        candidate(),
      ],
      write,
      attempts: 1,
    });
    expect(r).toMatchObject({ written: 1, rejected: 0, failed: 1 });
    expect(write).toHaveBeenCalledWith(
      "oracle-kess",
      ACCEPTED,
      proseInputHash("oracle-kess", "Kess, Dissident Mage", TAGS),
    );
  });

  // Before generation, not after — a suppressed commander is never asked for.
  it("never calls the model for a suppressed commander", async () => {
    const complete = vi.fn(async () => ACCEPTED);
    const r = await generateCommanderProse({
      complete,
      loadCandidates: async () => [candidate()],
      write: async () => {},
      suppressed: (id) => id === "oracle-kess",
    });
    expect(complete).not.toHaveBeenCalled();
    expect(r.suppressed).toBe(1);
  });

  it("skips a row whose stored hash still matches its inputs", async () => {
    const complete = vi.fn(async () => ACCEPTED);
    const r = await generateCommanderProse({
      complete,
      loadCandidates: async () => [
        candidate({
          prose: ACCEPTED,
          proseInputHash: proseInputHash("oracle-kess", "Kess, Dissident Mage", TAGS),
        }),
      ],
      write: async () => {},
    });
    expect(complete).not.toHaveBeenCalled();
    expect(r.fresh).toBe(1);
  });

  // The summary a run prints is only actionable if it says which rule did the rejecting,
  // and the four rules are fixed by four different changes to the prompt.
  it("tallies rejected attempts by the rule that rejected them", async () => {
    const r = await generateCommanderProse({
      complete: async () => "Kess decks are good.",
      loadCandidates: async () => [candidate()],
      write: async () => {},
      attempts: 2,
    });
    expect(r.rejectedBy).toEqual({ length: 2, sentences: 0, "front-loading": 0, hedge: 0 });
  });

  it("counts attempts, not commanders, so one commander can fill the tally", async () => {
    const r = await generateCommanderProse({
      complete: async () =>
        "Urabrask the Hidden decks tend to overwhelm opponents early with haste-enabled aggro, usually backed by burn and extra combat steps to close games fast.",
      loadCandidates: async () => [candidate()],
      write: async () => {},
      attempts: 3,
    });
    expect(r).toMatchObject({ rejected: 1 });
    expect(r.rejectedBy["front-loading"]).toBe(3);
  });

  // Three attempts at the identical prompt returned three identical sentences in the run
  // that prompted this, so a retry has to be told what was wrong with the last one.
  it("carries the rejection back into the retry's prompt", async () => {
    const prompts: string[] = [];
    await generateCommanderProse({
      complete: async (p) => {
        prompts.push(p);
        return "Kess decks are good.";
      },
      loadCandidates: async () => [candidate()],
      write: async () => {},
      attempts: 2,
    });
    expect(prompts[0]).not.toContain("A previous attempt was rejected");
    expect(prompts[1]).toContain("A previous attempt was rejected. It was:\nKess decks are good.");
  });

  // Nothing came back, so there is nothing to feed back — a retry after a failed call must
  // not quote a string the model never produced.
  it("asks again with the first prompt when the call itself failed", async () => {
    const prompts: string[] = [];
    let call = 0;
    await generateCommanderProse({
      complete: async (p) => {
        prompts.push(p);
        return ++call === 1 ? null : ACCEPTED;
      },
      loadCandidates: async () => [candidate()],
      write: async () => {},
      attempts: 2,
    });
    expect(prompts[1]).not.toContain("A previous attempt was rejected");
  });

  // A call that returned nothing produces no sentence to feed back, so the rule the attempt
  // before it broke is still the most useful thing the next prompt can say.
  it("keeps carrying the last real rejection past a failed call", async () => {
    const prompts: string[] = [];
    const replies: (string | null)[] = ["Kess decks are good.", null, ACCEPTED];
    await generateCommanderProse({
      complete: async (p) => {
        prompts.push(p);
        return replies.shift() ?? null;
      },
      loadCandidates: async () => [candidate()],
      write: async () => {},
      attempts: 3,
    });
    expect(prompts[2]).toContain("A previous attempt was rejected. It was:\nKess decks are good.");
  });

  it("regenerates a row whose inputs have moved on", async () => {
    const r = await generateCommanderProse({
      complete: async () => ACCEPTED,
      loadCandidates: async () => [candidate({ prose: "old sentence", proseInputHash: "stale" })],
      write: async () => {},
    });
    expect(r).toMatchObject({ written: 1, fresh: 0 });
  });

  // A sentence current under the legacy hash describes the same inputs today, so it takes the
  // new stamp with no model call; one stale under both is regenerated as before.
  it("re-stamps a row current under the legacy hash without calling the model", async () => {
    const complete = vi.fn(async () => ACCEPTED);
    const restamp = vi.fn(async () => {});
    const write = vi.fn(async () => {});
    const r = await generateCommanderProse({
      complete,
      loadCandidates: async () => [
        candidate({ prose: ACCEPTED, proseInputHash: legacyProseInputHash("oracle-kess", "Kess, Dissident Mage", TAGS) }),
      ],
      write,
      restamp,
    });
    expect(complete).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(restamp).toHaveBeenCalledWith("oracle-kess", proseInputHash("oracle-kess", "Kess, Dissident Mage", TAGS));
    expect(r).toMatchObject({ restamped: 1, fresh: 0, written: 0 });
  });

  it("regenerates a row stale under both hashes rather than re-stamping it", async () => {
    const restamp = vi.fn(async () => {});
    const r = await generateCommanderProse({
      complete: async () => ACCEPTED,
      loadCandidates: async () => [candidate({ prose: "old sentence", proseInputHash: "stale" })],
      write: async () => {},
      restamp,
    });
    expect(restamp).not.toHaveBeenCalled();
    expect(r).toMatchObject({ restamped: 0, written: 1 });
  });

  describe("the catalog stamp", () => {
    // `/commanders` caches its rankings, sentences included, on the catalog generation, and this
    // job runs after the index has stamped: its own writes need their own stamp.
    it("stamps once, after the writes, when anything was written", async () => {
      const order: string[] = [];
      const r = await generateCommanderProse({
        complete: async () => ACCEPTED,
        loadCandidates: async () => [candidate(), candidate({ oracleId: "oracle-two" })],
        write: async (id) => { order.push(`write ${id}`); },
        stamp: async () => { order.push("stamp"); },
      });
      expect(r.written).toBe(2);
      expect(order).toEqual(["write oracle-kess", "write oracle-two", "stamp"]);
    });

    it("stamps nothing when nothing was written", async () => {
      const stamp = vi.fn(async () => {});
      await generateCommanderProse({
        complete: async () => ACCEPTED,
        loadCandidates: async () => [candidate({ prose: ACCEPTED, proseInputHash: proseInputHash("oracle-kess", "Kess, Dissident Mage", TAGS) })],
        write: async () => {},
        stamp,
      });
      expect(stamp).not.toHaveBeenCalled();
    });

    it("still stamps what it wrote when the run dies part-way", async () => {
      const stamp = vi.fn(async () => {});
      let writes = 0;
      await expect(generateCommanderProse({
        complete: async () => ACCEPTED,
        loadCandidates: async () => [candidate(), candidate({ oracleId: "oracle-two" })],
        write: async () => { if (++writes === 2) throw new Error("connection lost"); },
        stamp,
      })).rejects.toThrow("connection lost");
      expect(stamp).toHaveBeenCalledTimes(1);
    });
  });
});

describe("restampCommanderProse", () => {
  const NEW = proseInputHash("oracle-kess", "Kess, Dissident Mage", TAGS);
  const LEGACY = legacyProseInputHash("oracle-kess", "Kess, Dissident Mage", TAGS);
  const rows = () => [
    candidate({ oracleId: "legacy", prose: ACCEPTED, proseInputHash: legacyProseInputHash("legacy", "Kess, Dissident Mage", TAGS) }),
    candidate({ prose: ACCEPTED, proseInputHash: NEW }),
    candidate({ oracleId: "stale", prose: ACCEPTED, proseInputHash: LEGACY }),
    candidate({ oracleId: "empty" }),
  ];

  it("re-stamps only the rows current under the legacy hash", async () => {
    const restamp = vi.fn(async () => {});
    const r = await restampCommanderProse({ loadCandidates: async () => rows(), restamp, suppressed: () => false });
    expect(restamp.mock.calls).toEqual([["legacy", proseInputHash("legacy", "Kess, Dissident Mage", TAGS)]]);
    expect(r).toEqual({ restamped: 1, fresh: 1, stale: 1 });
  });

  it("writes nothing on a dry run", async () => {
    const restamp = vi.fn(async () => {});
    const r = await restampCommanderProse({ loadCandidates: async () => rows(), restamp, suppressed: () => false, dryRun: true });
    expect(restamp).not.toHaveBeenCalled();
    expect(r.restamped).toBe(1);
  });
});
