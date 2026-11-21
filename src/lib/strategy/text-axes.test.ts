import { describe, expect, it } from "vitest";
import { textAxesOf } from "./text-axes";

const axes = (text: string, keywords: string[] = []) => textAxesOf(text, keywords);

describe("textAxesOf", () => {
  it("reads Storm off the keyword or the storm count, not the word in a name or a reminder", () => {
    expect(axes("Storm (When you cast this spell, copy it for each spell cast before it this turn.)\nTarget player loses X life.", ["Storm"])).toContain("storm");
    expect(axes("Add {R} for each spell you have cast this turn. Then, scry for your storm count.")).toContain("storm");
    expect(axes("Whenever a storm rages, draw a card.")).not.toContain("storm");
  });

  it("reads the monarch as taking it or caring that you hold it, not the reminder", () => {
    expect(axes("When this creature enters, you become the monarch. (The monarch draws a card at the beginning of their end step.)")).toContain("monarch");
    expect(axes("At the beginning of your upkeep, if you're the monarch, draw a card.")).toContain("monarch");
    expect(axes("Flying")).not.toContain("monarch");
  });

  it("reads Extra turns for your own, and not for one handed to another player", () => {
    expect(axes("Target player takes an extra turn after this one.")).toContain("extraTurns");
    expect(axes("When this enters, if you cast it, target opponent takes an extra turn after this one.")).not.toContain("extraTurns");
    expect(axes("Until end of turn you skip your next turn.")).not.toContain("extraTurns");
  });

  it("reads Extra combats off the additional combat phase", () => {
    expect(axes("After this phase, there is an additional combat phase.")).toContain("extraCombats");
    expect(axes("Attack each combat if able.")).not.toContain("extraCombats");
  });

  it("reads -1/-1 counters as putting them, not as removing them, and not off persist's reminder", () => {
    expect(axes("Put a -1/-1 counter on target creature.")).toContain("minusCounters");
    expect(axes("This creature enters with three -1/-1 counters on it.")).toContain("minusCounters");
    expect(axes("Remove a -1/-1 counter from target creature.")).not.toContain("minusCounters");
    expect(axes("Persist (When this creature dies, if it had no -1/-1 counters on it, return it with a -1/-1 counter on it.)")).not.toContain("minusCounters");
  });

  it("reads Burn as damage a player can take, not damage to creatures alone", () => {
    expect(axes("This spell deals 3 damage to target opponent.")).toContain("burn");
    expect(axes("This spell deals 3 damage to any target.")).not.toContain("burn");
    expect(axes("At the beginning of your upkeep, this deals X damage to each opponent.")).toContain("burn");
    expect(axes("This deals 3 damage to target creature.")).not.toContain("burn");
    expect(axes("This deals 2 damage to each creature.")).not.toContain("burn");
  });

  it("reads the front face only, and a card with no text joins nothing", () => {
    expect(axes("Flying\n//\nThis deals 3 damage to each opponent.")).toEqual([]);
    expect(textAxesOf(null, [])).toEqual([]);
  });
});
