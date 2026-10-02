import { describe, expect, it } from "vitest";

import type { Job } from "../../src/lib/labels/types.js";
import { emptyRate, flagAgreement, removalLeaks, tutorsInDraw, type Flags } from "./card-labels-gates.mjs";

const job = (space: "role" | "theme", kind: string) => ({ space, kind }) as Job;
const flags = (o: Partial<Flags> = {}): Flags => ({ tutor: false, massLandDenial: false, extraTurn: false, ...o });

describe("agreement with card_bracket_flags", () => {
  it("sorts each card into both, flag only or label only, per concept", () => {
    const labels = {
      "Demonic Tutor": [job("role", "tutor")],
      "Vampiric Tutor": [],
      "Expedite": [job("role", "tutor")],
      "Armageddon": [job("theme", "stax")],
      "Time Warp": [],
    };
    const r = flagAgreement(labels, {
      "Demonic Tutor": flags({ tutor: true }), "Vampiric Tutor": flags({ tutor: true }),
      "Armageddon": flags({ massLandDenial: true }), "Time Warp": flags({ extraTurn: true }),
    });
    expect(r.tutor).toEqual({ both: 1, flagOnly: ["Vampiric Tutor"], labelOnly: ["Expedite"] });
    expect(r["massLandDenial~stax"]).toEqual({ both: 1, flagOnly: [], labelOnly: [] });
    expect(r["extraTurn~finisher"]).toEqual({ both: 0, flagOnly: ["Time Warp"], labelOnly: [] });
  });
});

describe("removal leaks", () => {
  it("lists removal beside a counterspell or discard job, and a tapper labelled removal", () => {
    const labels = {
      "Counterspell": [job("role", "removal"), job("role", "counterspell")],
      "Thoughtseize": [job("role", "removal"), job("theme", "discard")],
      "Frost Breath": [job("role", "removal")],
      "Murder": [job("role", "removal")],
      "Icy Manipulator": [job("theme", "stax")],
    };
    const text = {
      "Frost Breath": "Tap up to two target creatures. Those creatures don't untap during their controller's next untap step.",
      "Murder": "Destroy target creature.",
      "Icy Manipulator": "{1}, {T}: Tap target artifact, creature, or land.",
    };
    expect(removalLeaks(labels, text)).toEqual({ counterspell: ["Counterspell"], discard: ["Thoughtseize"], tapper: ["Frost Breath"] });
  });

  it("reads a tap with a number before its target, with no untap clause to lean on", () => {
    for (const t of ["Tap two target creatures.", "Tap up to two target creatures. Draw a card."]) {
      expect(removalLeaks({ x: [job("role", "removal")] }, { x: t }).tapper).toEqual(["x"]);
    }
  });

  it("does not call a card a tapper when it also removes", () => {
    const labels = { "Pulse of the Grid": [job("role", "removal")] };
    expect(removalLeaks(labels, { "Pulse of the Grid": "Tap target creature. It deals 2 damage to itself." }).tapper).toEqual([]);
    for (const t of [
      "Tap target creature. At the beginning of the end step, exiles it.",
      "Tap target creature, then return it to its owner's hand.",
    ]) expect(removalLeaks({ x: [job("role", "removal")] }, { x: t }).tapper).toEqual([]);
  });
});

describe("tutors and draw", () => {
  it("lists a card labelled both", () => {
    expect(tutorsInDraw({ "Diabolic Tutor": [job("role", "tutor")], "Gamble": [job("role", "tutor"), job("role", "draw")] }))
      .toEqual(["Gamble"]);
  });
});

describe("an unanswered card (null) is no evidence", () => {
  it("is skipped by every gate rather than aborting the run", () => {
    const labels = { ok: [job("role", "removal"), job("role", "counterspell")], lost: null };
    expect(removalLeaks(labels, { lost: "Tap target creature." }).counterspell).toEqual(["ok"]);
    expect(flagAgreement(labels, { lost: flags({ tutor: true }) }).tutor.flagOnly).toEqual([]);
    expect(tutorsInDraw(labels)).toEqual([]);
    expect(emptyRate({ a: [], lost: null }, ["a", "lost"])).toMatchObject({ returned: 1, empty: 1 });
  });
});

describe("the empty rate", () => {
  it("reads the random set alone, over the cards the model returned, against 464 of 3,792", () => {
    const labels = { a: [], b: [job("role", "draw")], c: [job("role", "ramp")], d: [job("theme", "tokens")], gold: [] };
    const r = emptyRate(labels, ["a", "b", "c", "d", "missing"]);
    expect(r).toMatchObject({ random: 5, returned: 4, empty: 1, rate: 0.25 });
    expect(r.deltaPoints).toBe(12.8);
  });
});
