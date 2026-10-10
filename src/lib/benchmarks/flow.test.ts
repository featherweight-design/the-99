import { describe, expect, it } from "vitest";
import { card, job } from "./fixtures";
import { flow } from "./flow";

describe("flow", () => {
  it("counts 2 for a repeating draw, 1 for a one-time draw, doubled for a commander", () => {
    const f = flow([
      card("Rhystic Study", { jobs: [job({ kind: "draw", recurrence: "repeatable" })] }),
      card("Divination", { jobs: [job({ kind: "draw" })] }),
      card("Kenrith", { commander: true, jobs: [job({ kind: "draw", recurrence: "repeatable" })] }),
    ]);
    expect(f.points).toBe(7);
    expect(f.engines).toBe(2);
    expect(f.oneShots).toBe(1);
  });

  it("skips an opponent's draw but keeps a target-player draw, as the strip does", () => {
    const f = flow([
      card("Thought-Knot Seer", { oracleText: "its owner draws a card", jobs: [job({ kind: "draw", affects: "opponents" })] }),
      card("Deep Analysis", { oracleText: "Target player draws two cards.", jobs: [job({ kind: "draw", affects: "opponents" })] }),
    ]);
    expect(f.lines.map((l) => l.card.name)).toEqual(["Deep Analysis"]);
  });
});
