import { describe, expect, it } from "vitest";
import { card, job } from "./fixtures";
import { flow } from "./flow";
import { benchCardJobs } from "./load";

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

  it("lists an opponent's draw under Read, not counted, and moves no figure", () => {
    const weighed = [
      card("Rhystic Study", { jobs: [job({ kind: "draw", recurrence: "repeatable" })] }),
      card("Divination", { jobs: [job({ kind: "draw" })] }),
    ];
    const tks = card("Thought-Knot Seer", { manaValue: 4, typeLine: "Creature", oracleText: "When Thought-Knot Seer leaves the battlefield, target opponent draws a card.", jobs: [job({ kind: "draw", affects: "opponents" })] });
    const before = flow(weighed);
    const after = flow([...weighed, tks]);
    expect(after.notCounted.map((l) => [l.card.name, l.points, l.why])).toEqual([["Thought-Knot Seer", 0, "otherPlayerDraws"]]);
    expect(after.lines).toEqual(before.lines);
    expect([after.points, after.engines, after.oneShots]).toEqual([3, 1, 1]);
    expect([after.points, after.engines, after.oneShots]).toEqual([before.points, before.engines, before.oneShots]);
  });

  it("lists a card with no fresh label the strip counts as draw when its text reading keeps no draw, by the reading's reason", () => {
    const text = "When this creature enters, target opponent may draw a card.";
    const gift = card("Gifted Stranger", {
      manaValue: 3, typeLine: "Creature", oracleText: text,
      ...benchCardJobs({ oracleId: "id-Gifted Stranger", typeLine: "Creature", oracleText: text, keywords: [] }, new Map()),
    });
    expect(gift.stripRows).toEqual(["draw"]);
    expect(gift.jobs).toEqual([]);
    const f = flow([gift]);
    expect(f.lines).toEqual([]);
    expect(f.points).toBe(0);
    expect(f.notCounted.map((l) => [l.card.name, l.why])).toEqual([["Gifted Stranger", "otherPlayerDraws"]]);
  });

  it("lists no commander whose draw is refused, as the strip counts no commander", () => {
    const f = flow([card("Opponent Gifter", { commander: true, jobs: [job({ kind: "draw", affects: "opponents" })] })]);
    expect(f.lines).toEqual([]);
    expect(f.notCounted).toEqual([]);
  });

  it("still counts a card the strip and the ledger both read as draw, and lists nothing as not counted", () => {
    const f = flow([card("Divination", { jobs: [job({ kind: "draw" })] }), card("Sol Ring", { jobs: [job({ kind: "ramp" })] })]);
    expect(f.lines.map((l) => [l.card.name, l.points, l.repeatable])).toEqual([["Divination", 1, false]]);
    expect(f.points).toBe(1);
    expect(f.notCounted).toEqual([]);
  });
});
