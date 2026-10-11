import { describe, expect, it } from "vitest";

import { cutsCountSummary, toolCountInsert } from "./tool-counts";

describe("cutsCountSummary", () => {
  it("records how far over, and each role over its target by how many", () => {
    expect(cutsCountSummary({
      over: 6,
      roles: [
        { role: "ramp", have: 14, target: 10 },
        { role: "draw", have: 12, target: 10 },
        { role: "removal", have: 8, target: 10 },
        { role: "wipes", have: 3, target: 3 },
      ],
    })).toEqual({ over: 6, roles: [{ role: "ramp", label: "ramp", over: 4 }, { role: "draw", label: "draw", over: 2 }] });
  });

  it("records nothing for a deck that is not over", () => {
    expect(cutsCountSummary({ over: 0, roles: [{ role: "ramp", have: 14, target: 10 }] })).toBeNull();
  });
});

describe("toolCountInsert", () => {
  it("does nothing on a second count of the same list: the conflict target is the deck, tool and fingerprint", () => {
    const q = toolCountInsert({
      deckId: "00000000-0000-4000-8000-000000000001", userId: "u", tool: "proposed_cuts",
      listFingerprint: "fp", readVersion: 3, summary: { over: 1, roles: [] },
    }).toSQL();
    expect(q.sql).toContain('insert into "deck_tool_counts"');
    expect(q.sql).toMatch(/on conflict \("deck_id","tool","list_fingerprint"\) do nothing/);
  });
});
