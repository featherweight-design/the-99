import { describe, expect, it } from "vitest";
import { card, job } from "./fixtures";
import { interaction } from "./interaction";

describe("interaction", () => {
  it("weighs 1, plus instant speed, plus 2 mana or less", () => {
    const i = interaction([
      card("Swords to Plowshares", { typeLine: "Instant", manaValue: 1, jobs: [job({ kind: "removal", affects: "opponents" })] }),
      card("Wrath of God", { manaValue: 4, jobs: [job({ kind: "wipes", affects: "each" })] }),
      card("Brazen Borrower", { typeLine: "Creature", keywords: ["Flash"], manaValue: 3, jobs: [job({ kind: "removal", affects: "opponents" })] }),
    ]);
    expect(i.lines.map((l) => [l.card.name, l.weight])).toEqual([["Swords to Plowshares", 3], ["Brazen Borrower", 2], ["Wrath of God", 1]]);
    expect(i).toMatchObject({ answers: 3, weighted: 6, cheapInstant: 1, wipes: 1, counterspells: 0 });
  });

  it("counts a counterspell as interaction, in its own figure, never as removal", () => {
    const i = interaction([card("Counterspell", { typeLine: "Instant", manaValue: 2, jobs: [job({ kind: "counterspell", affects: "opponents" })] })]);
    expect(i.lines[0]).toMatchObject({ kind: "counterspell", weight: 3 });
    expect(i).toMatchObject({ answers: 1, counterspells: 1, cheapInstant: 1 });
  });
});
