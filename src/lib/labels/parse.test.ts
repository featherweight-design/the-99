import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { faceResolver, readKeyedReply, readReply, screenJobs, withoutRepeats } from "./parse";

/**
 * Every case here is a shape the sample actually produced, or a shape that would have
 * corrupted a published figure if it had. The two models disagreed about how to name a
 * two-faced card, so neither behaviour can be assumed.
 */
describe("faceResolver", () => {
  const asked = ["Soulcipher Board // Cipherbound Spirit", "Runadi, Behemoth Caller"];

  // The v8 relabel's one held batch: asked with U+A789, answered with an ASCII colon.
  it("matches a name the model retyped with an ASCII colon, and returns the asked name", () => {
    const resolve = faceResolver(["Ratonhnhak\u00e9\ua789ton"]);
    expect(resolve("Ratonhnhak\u00e9:ton")).toBe("Ratonhnhak\u00e9\ua789ton");
    expect(resolve("Ratonhnhak\u00e9\ua789ton")).toBe("Ratonhnhak\u00e9\ua789ton");
    // A decomposed accent is the same name under NFKC.
    expect(resolve("Ratonhnhake\u0301:ton")).toBe("Ratonhnhak\u00e9\ua789ton");
    expect(resolve("Ratonhnhake:ton")).toBeNull();
  });

  // A malformed reply must be recorded as an unexpected name, not throw inside the fold: a throw
  // fails the collect before the batch is recorded, so every retry of it fails the same way.
  it("returns null for a name that is not a string", () => {
    const resolve = faceResolver(["Runadi, Behemoth Caller"]);
    for (const name of [123, null, undefined, {}, ["x"]]) expect(resolve(name)).toBeNull();
    expect(readReply('[{"name":123,"jobs":[]}]', ["Runadi, Behemoth Caller"])?.rejected).toEqual(["unexpected name 123"]);
  });

  it("passes through a name the batch asked for", () => {
    expect(faceResolver(asked)("Runadi, Behemoth Caller")).toBe("Runadi, Behemoth Caller");
  });

  it("keeps a joined name joined, which is how Haiku returned it", () => {
    expect(faceResolver(asked)("Soulcipher Board // Cipherbound Spirit"))
      .toBe("Soulcipher Board // Cipherbound Spirit");
  });

  it("resolves either FACE to the joined name, which is how Sonnet returned it", () => {
    const r = faceResolver(asked);
    expect(r("Soulcipher Board")).toBe("Soulcipher Board // Cipherbound Spirit");
    expect(r("Cipherbound Spirit")).toBe("Soulcipher Board // Cipherbound Spirit");
  });

  // The refusal is the load-bearing half. An invented name accepted here enters the label
  // set, and the agreement pass iterates one model's keys — so a hallucination returned by
  // BOTH models would count as an agreeing card and move the denominator.
  it("refuses a name that is neither asked for nor a face of one", () => {
    expect(faceResolver(asked)("Llanowar Elves")).toBeNull();
  });

  // Never a fuzzy match: a near-miss is a different card, not a typo to be helpful about.
  it("refuses a near-miss rather than guessing", () => {
    expect(faceResolver(asked)("Soulcipher Boards")).toBeNull();
    expect(faceResolver(asked)("Runadi")).toBeNull();
  });

  // An exact asked-for name wins over being some other card's face, or a label would move
  // silently from one card to another. The precedence lives in the LOOKUP — `exact` is
  // checked before `faceOf` — so this pins observable behaviour rather than a guard in the
  // map-building loop, which an earlier version claimed to pin and could not.
  it("prefers an exact name to treating it as another card's face", () => {
    const r = faceResolver(["Fire // Ice", "Fire"]);
    expect(r("Fire")).toBe("Fire");
    expect(r("Ice")).toBe("Fire // Ice");
  });
});

describe("withoutRepeats", () => {
  it("drops an exact repeat, whatever its key order, and keeps jobs that differ in any field", () => {
    const tribal = { space: "theme", kind: "tribal", restrictedTo: "Elf", affects: "self" };
    const again = { affects: "self", restrictedTo: "Elf", kind: "tribal", space: "theme" };
    const other = { ...tribal, trigger: "etb" };
    expect(withoutRepeats([tribal, again, other])).toEqual([tribal, other]);
  });

  it("reads an omitted field and a null one as the same job, keeping the first as written", () => {
    const omitted = { space: "theme", kind: "tribal", restrictedTo: "Elf" };
    const nulled = { ...omitted, rampKind: null };
    expect(withoutRepeats([omitted, nulled])).toEqual([omitted]);
    expect(withoutRepeats([omitted, { ...omitted, restrictedTo: "Goblin" }])).toHaveLength(2);
  });
});

// The build's reading of one reply.
describe("readReply", () => {
  const ramp = {
    space: "role", kind: "ramp", rampKind: "fetchesLand", restrictedTo: null, affects: null,
    to: "battlefield", method: null, trigger: "cast", recurrence: "oneShot", threshold: null, modal: false,
  };

  it("keeps a ramp job carrying a misplaced to, stripped, and merges two faces under one name", () => {
    const text = "```json\n" + JSON.stringify([
      { name: "Rampant Growth", jobs: [ramp] },
      { name: "Soulcipher Board", jobs: [] },
    ]) + "\n```";
    const read = readReply(text, ["Rampant Growth", "Soulcipher Board // Cipherbound Spirit"]);
    expect(read?.rejected).toEqual([]);
    expect(read?.byName.get("Rampant Growth")).toEqual([{ ...ramp, to: null }]);
    expect(read?.byName.get("Soulcipher Board // Cipherbound Spirit")).toEqual([]);
  });

  it("records a missing jobs list and an invented name, and reads nothing from prose", () => {
    const read = readReply(JSON.stringify([{ name: "Rampant Growth" }, { name: "Sparkle", jobs: [] }]), ["Rampant Growth"]);
    expect(read?.byName.size).toBe(0);
    expect(read?.rejected).toEqual(["Rampant Growth: jobs is not an array", "unexpected name Sparkle"]);
    expect(readReply("I cannot help with that.", ["Rampant Growth"])).toBeNull();
  });
});

// The build's reading of one reply since prompt version 9: matched by the key each answer echoes,
// never by name, so two oracle rows sharing a name each get their own answer.
describe("readKeyedReply", () => {
  const ramp = {
    space: "role", kind: "ramp", rampKind: "tapsForMana", restrictedTo: null, affects: null,
    to: null, method: null, trigger: "none", recurrence: "repeatable", threshold: null, modal: false,
  };
  const draw = {
    space: "role", kind: "draw", restrictedTo: null, affects: null,
    to: null, method: null, trigger: "cast", recurrence: "oneShot", threshold: null, modal: false,
  };
  // Two oracle rows with ONE name (the 18 commander-legal duplicates the weekly run could never label).
  const twins = [
    { oracleId: "00000000-0000-4000-8000-00000000000a", name: "Shared Name" },
    { oracleId: "00000000-0000-4000-8000-00000000000b", name: "Shared Name" },
  ];

  it("gives two cards sharing a name their own answers, by key", () => {
    const read = readKeyedReply(JSON.stringify([
      { key: "1", name: "Shared Name", jobs: [ramp] },
      { key: "2", name: "Shared Name", jobs: [draw] },
    ]), twins);
    expect(read?.rejected).toEqual([]);
    expect(read?.byId.get(twins[0].oracleId)).toEqual([ramp]);
    expect(read?.byId.get(twins[1].oracleId)).toEqual([draw]);
  });

  it("reads a key written as a bare number, and merges two faces answered under one key", () => {
    const asked = [{ oracleId: "id-dfc", name: "Soulcipher Board // Cipherbound Spirit" }];
    const read = readKeyedReply(JSON.stringify([
      { key: 1, name: "Soulcipher Board", jobs: [ramp] },
      { key: "1", name: "Cipherbound Spirit", jobs: [draw] },
    ]), asked);
    expect(read?.rejected).toEqual([]);
    expect(read?.byId.get("id-dfc")).toEqual([ramp, draw]);
  });

  // A REAL ERROR, never a guess: the answer is refused and recorded, so its card comes back short
  // and the batch's floor judges it, as it judges any other shortfall.
  it("refuses an answer with a missing key or a key the request never sent", () => {
    const read = readKeyedReply(JSON.stringify([
      { name: "Shared Name", jobs: [ramp] },
      { key: "3", name: "Shared Name", jobs: [ramp] },
      { key: "0", name: "Shared Name", jobs: [ramp] },
      { key: "one", name: "Shared Name", jobs: [ramp] },
    ]), twins);
    expect(read?.byId.size).toBe(0);
    expect(read?.rejected).toEqual([
      "missing key (name Shared Name)",
      "unknown key 3 (name Shared Name)",
      "unknown key 0 (name Shared Name)",
      "unknown key one (name Shared Name)",
    ]);
  });

  it("refuses an answer whose name contradicts its key, rather than filing it under either card", () => {
    const asked = [{ oracleId: "id-bolt", name: "Lightning Bolt" }, { oracleId: "id-growth", name: "Rampant Growth" }];
    const read = readKeyedReply(JSON.stringify([{ key: "1", name: "Rampant Growth", jobs: [ramp] }]), asked);
    expect(read?.byId.size).toBe(0);
    expect(read?.rejected).toEqual(["key 1 is Lightning Bolt, but its answer names Rampant Growth"]);
  });

  it("records a missing jobs list, and reads nothing from prose", () => {
    const read = readKeyedReply(JSON.stringify([{ key: "1", name: "Shared Name" }]), twins);
    expect(read?.byId.size).toBe(0);
    expect(read?.rejected).toEqual(["key 1: jobs is not an array"]);
    expect(readKeyedReply("I cannot help with that.", twins)).toBeNull();
  });
});

// The sample collector screens through the same function the build does, so a sample of v8 replies
// keeps a ramp job carrying a misplaced `to` exactly as the stored labels do.
describe("screenJobs", () => {
  it("keeps a ramp job with to: battlefield as to: null, and drops what still fails with its kind", () => {
    const ramp = { space: "role", kind: "ramp", rampKind: "fetchesLand", affects: "self", to: "battlefield", method: null,
      trigger: "none", recurrence: "oneShot", restrictedTo: "land", threshold: null, modal: false };
    const { kept, rejected } = screenJobs([ramp, { kind: "made-up" }]);
    expect(kept).toEqual([{ ...ramp, to: null }]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].kind).toBe("made-up");
  });

  it("is what the sample collector screens through", () => {
    const collector = readFileSync(join(process.cwd(), "scripts/label-cards-collect.mts"), "utf8");
    expect(collector).toMatch(/const \{ kept, rejected \} = screenJobs\(jobs\);/);
    expect(collector).not.toMatch(/validateJob\(/);
  });
});
