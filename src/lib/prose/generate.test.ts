import { describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown> }));
vi.mock("../../db", () => ({ db: stub.db }));

import { generateCommanderProse, type ProseCandidate } from "./generate";
import { proseInputHash } from "./prompt";

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
  it("writes an accepted string with its input hash", async () => {
    const write = vi.fn(async () => {});
    const r = await generateCommanderProse({
      complete: async () => ACCEPTED,
      loadCandidates: async () => [candidate()],
      write,
    });
    expect(r.written).toBe(1);
    expect(write).toHaveBeenCalledWith("oracle-kess", ACCEPTED, proseInputHash("oracle-kess", TAGS));
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
    expect(write).toHaveBeenCalledWith("oracle-kess", ACCEPTED, proseInputHash("oracle-kess", TAGS));
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
        candidate({ prose: ACCEPTED, proseInputHash: proseInputHash("oracle-kess", TAGS) }),
      ],
      write: async () => {},
    });
    expect(complete).not.toHaveBeenCalled();
    expect(r.fresh).toBe(1);
  });

  it("regenerates a row whose inputs have moved on", async () => {
    const r = await generateCommanderProse({
      complete: async () => ACCEPTED,
      loadCandidates: async () => [candidate({ prose: "old sentence", proseInputHash: "stale" })],
      write: async () => {},
    });
    expect(r).toMatchObject({ written: 1, fresh: 0 });
  });
});
