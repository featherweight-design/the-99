import { describe, expect, it } from "vitest";

import { lineStream } from "./stream-lines";

const lines = [
  { card: "Sol Ring", rationale: "Fast mana {1}: a \"must\" [always]", rationaleShort: "Ramp", evidence: [{ kind: "decklist", value: "x" }] },
  { card: "Brainstorm", rationale: "Back\\slash \\\" and } and ] in text", rationaleShort: "Draw", evidence: [{ kind: "mix", value: "draw 4 of 10" }] },
  { card: "Swords to Plowshares", rationale: "Unicode — dash, {nested: [braces]}", rationaleShort: "Removal", evidence: [] },
];
const reply = JSON.stringify({ additions: lines }, null, 1);

/** Feeds `text` cut at the given positions, returning every line in arrival order with the delta index it arrived on. */
function feed(text: string, cuts: number[]) {
  const s = lineStream();
  const got: { at: number; line: unknown }[] = [];
  const points = [0, ...cuts, text.length];
  for (let i = 0; i + 1 < points.length; i++) for (const line of s.push(text.slice(points[i], points[i + 1]))) got.push({ at: i, line });
  return { got, end: s.end() };
}

describe("lineStream", () => {
  it("hands back every line of a whole reply, parsed, and reports the reply complete", () => {
    const { got, end } = feed(reply, []);
    expect(got.map((g) => g.line)).toEqual(lines);
    expect(end).toEqual({ complete: true, malformed: 0 });
  });

  it("gives the same lines whatever the chunk boundaries, including one character at a time and mid-escape", () => {
    for (let cut = 1; cut < reply.length; cut++) {
      expect(feed(reply, [cut]).got.map((g) => g.line)).toEqual(lines);
    }
    const single = feed(reply, Array.from({ length: reply.length - 1 }, (_, i) => i + 1));
    expect(single.got.map((g) => g.line)).toEqual(lines);
    expect(single.end.complete).toBe(true);
  });

  it("hands a line back on the delta its closing brace arrives in, not at the end of the reply", () => {
    const firstClose = reply.indexOf("\n  }") + 4;
    const { got } = feed(reply, [firstClose, firstClose + 5]);
    expect(got[0]).toEqual({ at: 0, line: lines[0] });
    expect(got.slice(1).every((g) => g.at === 2)).toBe(true);
  });

  it("keeps every line completed before a cut-off reply, and reports it incomplete", () => {
    const cut = reply.indexOf("Brainstorm") + 4;
    const s = lineStream();
    expect(s.push(reply.slice(0, cut))).toEqual([lines[0]]);
    expect(s.end().complete).toBe(false);
  });

  it("reports a reply stopped inside a string incomplete", () => {
    const s = lineStream();
    s.push('{"cuts":[]');
    s.push(', "x": "open');
    expect(s.end().complete).toBe(false);
  });

  it("counts a line that does not parse and still hands back the lines around it", () => {
    const bad = `{"cuts":[${JSON.stringify(lines[0])},{"card": tru},${JSON.stringify(lines[2])}]}`;
    const { got, end } = feed(bad, [7, 40]);
    expect(got.map((g) => g.line)).toEqual([lines[0], lines[2]]);
    expect(end).toEqual({ complete: true, malformed: 1 });
  });

  it("trusts nothing after an unbalanced close", () => {
    const s = lineStream();
    expect(s.push(`{"cuts":[}${JSON.stringify(lines[0])}]}`)).toEqual([]);
    expect(s.end().complete).toBe(false);
  });

  it("hands back nothing for an empty list, which is a complete reply", () => {
    expect(feed('{"additions": []}', [3]).got).toEqual([]);
    expect(feed('{"additions": []}', [3]).end).toEqual({ complete: true, malformed: 0 });
  });

  it("does not take an object nested inside a line as a line of its own", () => {
    const { got } = feed(reply, [reply.indexOf("evidence") + 15]);
    expect(got).toHaveLength(3);
  });
});
