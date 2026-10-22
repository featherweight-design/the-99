import { describe, expect, it } from "vitest";
import { GROWTH_GAP, JOINT_GAP, arcPath, legendCount, ringArcs } from "./strategy-ring";

describe("ringArcs", () => {
  it("sizes each arc by its share from 12 o'clock, clockwise, with a gap at every joint", () => {
    const arcs = ringArcs([{ key: "a", copies: 3, added: 0 }, { key: "b", copies: 1, added: 0 }], null);
    expect(arcs.map((a) => a.kind)).toEqual(["rank", "rank"]);
    expect(arcs[0].from).toBeCloseTo(JOINT_GAP / 2);
    expect(arcs[0].to).toBeCloseTo(270 - JOINT_GAP / 2);
    expect(arcs[1].from).toBeCloseTo(270 + JOINT_GAP / 2);
    expect(arcs[1].to).toBeCloseTo(360 - JOINT_GAP / 2);
  });

  it("pulls the focus out, and splits off its pending growth", () => {
    const arcs = ringArcs([{ key: "a", copies: 10, added: 2 }, { key: "b", copies: 10, added: 3 }], "a");
    expect(arcs.map((a) => [a.key, a.kind])).toEqual([["a", "focus"], ["a", "growth"], ["b", "rank"]]);
    const [focus, growth] = arcs;
    const span = 180 - JOINT_GAP;
    // The committed 8 of 10, then the 2 pending, a small gap between.
    expect(focus.to - focus.from).toBeCloseTo(span * 0.8 - GROWTH_GAP / 2);
    expect(growth.to - growth.from).toBeCloseTo(span * 0.2 - GROWTH_GAP / 2);
  });

  it("draws nothing for an empty ring", () => {
    expect(ringArcs([], null)).toEqual([]);
    expect(ringArcs([{ key: "a", copies: 0, added: 0 }], null)).toEqual([]);
  });
});

describe("arcPath", () => {
  it("takes the large-arc flag past half a turn", () => {
    expect(arcPath(200, 86, 0, 90)).toMatch(/ 0 0 1 /);
    expect(arcPath(200, 86, 0, 270)).toMatch(/ 0 1 1 /);
  });
});

describe("legendCount", () => {
  it("counts from the committed list, then what moved", () => {
    expect(legendCount(13, { added: 2, removed: 0 })).toEqual({ base: 11, added: 2, removed: 0 });
    expect(legendCount(8, { added: 0, removed: 1 })).toEqual({ base: 9, added: 0, removed: 1 });
    expect(legendCount(11, undefined)).toEqual({ base: 11, added: 0, removed: 0 });
  });
});
